#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
사운드젠 — SAGA-DESIGN.md §7.2 6번(sfxgen.py). "타격·획득·UI 음 3종씩
라운드로빈"을 `saga-web/saga-realm/js/sfx.js`(WebAudio 절차 사운드, 그
파일 머리말이 밝히듯 `saga-dungeon/js/sfx.js`가 원본)의 합성 방식 그대로
파이썬으로 옮긴다 — tone(오실레이터+주파수 스윕)·noise(화이트노이즈+로우패스
스윕)·chime(tone을 정해진 음정으로 연달아) 세 겹, 같은 지수 엔벨로프.

`saga_core/combat_feel.gd`의 `SOUND_CUE_COUNT = 3`과 맞춰 hit/pick/ui
각 3종(라운드로빈용)을 찍는다.

**ogg 아니라 wav**: SAGA-DESIGN 원안은 `.ogg`이지만 이 PC엔 vorbis
인코더(ffmpeg 등)가 없다(오프라인 환경, 103-1 확인). 표준 라이브러리
`wave`(16bit PCM)로 대신하고, Godot는 wav를 그대로 임포트해 압축을
선택할 수 있어 기능상 손실은 없다 — 파일명만 `.wav`로 다르다.

무엇을 안 하나: 실제 씬/스크립트에 `AudioStreamPlayer3D`로 연결하는 것
(`combat_feel.gd`의 `sound_triggered` 신호는 지금 리스너가 없다 — 배선은
실기 확인 전 새 콘텐츠 보류 원칙(§8-1)에 따라 다음 단계로 남긴다).
"""

import argparse
import os
import wave

import numpy as np

FORGE_DIR = os.path.dirname(os.path.abspath(__file__))
SR = 44100


def _rng(seed):
    return np.random.default_rng(seed)


def _envelope(n, sr, peak, attack=0.008):
    """sfx.js envelope() 그대로 — 8ms 지수 상승 뒤 전체 길이에 걸쳐 지수 하강."""
    t = np.arange(n) / sr
    dur = n / sr
    a = min(attack, dur * 0.5)
    env = np.empty(n)
    rise_n = max(1, int(a * sr))
    env[:rise_n] = np.geomspace(1e-4, max(2e-4, peak), rise_n)
    fall_n = n - rise_n
    if fall_n > 0:
        env[rise_n:] = np.geomspace(max(2e-4, peak), 1e-4, fall_n)
    return env


def _wave_osc(kind, phase):
    if kind == "sine":
        return np.sin(phase)
    if kind == "square":
        return np.sign(np.sin(phase))
    if kind == "sawtooth":
        return 2.0 * (phase / (2 * np.pi) % 1.0) - 1.0
    if kind == "triangle":
        saw = 2.0 * (phase / (2 * np.pi) % 1.0) - 1.0
        return 2.0 * np.abs(saw) - 1.0
    raise ValueError(kind)


def synth_tone(freq, freq2, dur, wave_kind, gain, sr=SR):
    n = max(1, int(dur * sr))
    t = np.arange(n) / sr
    if freq2 and freq2 != freq:
        # sfx.js exponentialRampToValueAtTime 과 같은 지수 스윕.
        k = np.log(freq2 / freq) / dur
        freq_t = freq * np.exp(k * t)
        phase = 2 * np.pi * np.cumsum(freq_t) / sr
    else:
        phase = 2 * np.pi * freq * t
    sig = _wave_osc(wave_kind, phase)
    return sig * _envelope(n, sr, gain)


def synth_noise(dur, lp, lp2, gain, seed, sr=SR):
    n = max(1, int(dur * sr))
    rng = _rng(seed)
    white = rng.uniform(-1.0, 1.0, n)
    if lp2 and lp2 != lp:
        k = np.log(lp2 / lp) / max(1, n)
        cutoff = lp * np.exp(k * np.arange(n))
    else:
        cutoff = np.full(n, lp)
    # 시간 따라 컷오프가 바뀌는 1차 로우패스(원-폴 IIR)를 그대로 스캔.
    out = np.empty(n)
    prev = 0.0
    for i in range(n):
        alpha = 1.0 - np.exp(-2.0 * np.pi * cutoff[i] / sr)
        prev += alpha * (white[i] - prev)
        out[i] = prev
    peak = np.max(np.abs(out)) or 1.0
    return (out / peak) * _envelope(n, sr, gain)


def synth_chime(notes, step, dur, wave_kind, gain, sr=SR):
    each = dur / max(1, len(notes))
    total_n = max(1, int(dur * sr)) + int(step * sr) * len(notes)
    out = np.zeros(total_n)
    for i, note in enumerate(notes):
        seg = synth_tone(note, note, max(each, dur - i * step), wave_kind, gain, sr)
        start = int(i * step * sr)
        end = start + len(seg)
        if end > len(out):
            out = np.pad(out, (0, end - len(out)))
        out[start:end] += seg
    return out


def _mix(*layers):
    n = max(len(l) for l in layers)
    out = np.zeros(n)
    for l in layers:
        out[:len(l)] += l
    peak = np.max(np.abs(out))
    if peak > 0.98:
        out = out / peak * 0.98
    return out


def _write_wav(sig, out_path):
    pcm = np.clip(sig, -1.0, 1.0)
    pcm16 = (pcm * 32767.0).astype("<i2")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with wave.open(out_path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm16.tobytes())
    print("사운드 %.0fms -> %s" % (len(sig) / SR * 1000.0, out_path))


# 라운드로빈 3종씩. 겹(tone/noise/chime) 조합·수치는 saga-realm js/sfx.js CUES
# 관용구를 옮긴 것(위 108줄 CUES 표 참고) — 타격은 noise+tone(둔탁), 획득은
# chime 상행(밝음), UI는 짧은 tone 블립.
def make_hit(variant):
    base_f = [150.0, 185.0, 130.0][variant % 3]
    noise = synth_noise(0.09, 900, 220, 0.5, seed=100 + variant)
    tone = synth_tone(base_f, base_f * 0.5, 0.12, "sawtooth", 0.35)
    return _mix(noise, tone)


def make_pick(variant):
    note_sets = [[784, 988, 1319], [659, 880, 1109], [880, 1109, 1568]]
    return _mix(synth_chime(note_sets[variant % 3], 0.05, 0.28, "sine", 0.4))


def make_ui(variant):
    f = [660, 720, 600][variant % 3]
    return _mix(synth_tone(f, f * 0.94, 0.055, "sine", 0.22))


KINDS = {"hit": make_hit, "pick": make_pick, "ui": make_ui}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p_one = sub.add_parser("one", help="kind 하나의 variant 번째(0-based) 사운드 1개 생성")
    p_one.add_argument("kind", choices=sorted(KINDS.keys()))
    p_one.add_argument("--variant", type=int, default=0)
    p_one.add_argument("--out", required=True)

    p_all = sub.add_parser("batch-all", help="hit/pick/ui 각 3종(01~03) 전부 생성")
    p_all.add_argument("--out-dir", required=True)

    args = ap.parse_args()
    if args.cmd == "one":
        sig = KINDS[args.kind](args.variant)
        _write_wav(sig, args.out)
    elif args.cmd == "batch-all":
        for kind, fn in KINDS.items():
            for i in range(3):
                sig = fn(i)
                out_path = os.path.join(args.out_dir, "%s_%02d.wav" % (kind, i + 1))
                _write_wav(sig, out_path)


if __name__ == "__main__":
    main()
