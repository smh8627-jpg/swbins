#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
타일젠 — SAGA-DESIGN.md §7.2 3번(tilegen.py). PLAN.md 102-5 트라이플레이너
지형 셰이더가 쓸 512x512 지형 타일(베이스컬러+노멀+러프니스)을 씨앗으로
찍어낸다. 대상 6종: grass·dirt·stone·sand·snow·lava.

**완전히 시임리스**하다 — 저해상도 난수 격자를 감싸기(wrap)로 한 칸 더
패딩한 뒤 수동 이중선형 보간으로 512까지 올리므로(모듈러 좌표라 오른쪽
끝과 왼쪽 끝이 항상 이어진다), 타일을 이어 붙여도 경계가 안 보인다.
노멀맵도 `np.roll`(감싸기 인덱싱)로 미분해 같은 이유로 시임리스다.

베이스컬러는 `--palette`/`--role`로 palette.py JSON의 역할색을 가져오거나
(예: go_village.json 의 grass), 안 주면 이 스크립트 내장 기본색을 쓴다.

무엇을 안 하나: 어떤 지형에 어떤 kind 를 칠할지 고르는 것(terrain_builder.gd
쪽 판단), 실제 트라이플레이너 셰이더 배선(102-5, 사람 실기 확인 전 보류).
"""

import argparse
import os
import sys

import numpy as np
from PIL import Image

FORGE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, FORGE_DIR)
from palette import load_role_rgb01  # noqa: E402

SIZE = 512

# kind -> (기본 RGB01(팔레트 없을 때), 러프니스 기본값, 높이 강도(노멀맵 굴곡))
KINDS = {
    "grass": ((0.38, 0.55, 0.24), 0.85, 1.0),
    "dirt": ((0.45, 0.33, 0.20), 0.90, 1.2),
    "stone": ((0.55, 0.53, 0.50), 0.55, 1.6),
    "sand": ((0.76, 0.68, 0.50), 0.75, 0.7),
    "snow": ((0.92, 0.93, 0.95), 0.35, 0.5),
    "lava": ((0.35, 0.08, 0.04), 0.40, 1.4),
}


def _rng(seed):
    return np.random.default_rng(seed)


def _upsample_periodic(grid, out_size):
    """저해상도 난수 격자를 감싸기 패딩 + 수동 이중선형 보간으로
    out_size 까지 올린다. 결과는 (0,0)~(out_size,0) 경계가 완전히
    이어진다(모듈러 좌표라서)."""
    n = grid.shape[0]
    padded = np.pad(grid, ((0, 1), (0, 1)), mode="wrap")
    coords = np.linspace(0, n, out_size, endpoint=False)
    x0 = np.floor(coords).astype(int)
    y0 = x0
    fx = coords - x0
    fy = fx
    x1 = x0 + 1
    y1 = y0 + 1
    top = padded[np.ix_(y0, x0)] * (1 - fx)[None, :] + padded[np.ix_(y0, x1)] * fx[None, :]
    bot = padded[np.ix_(y1, x0)] * (1 - fx)[None, :] + padded[np.ix_(y1, x1)] * fx[None, :]
    return top * (1 - fy)[:, None] + bot * fy[:, None]


def _fbm(seed, out_size, freqs=(4, 8, 16, 32)):
    """옥타브 여러 개를 합친 시임리스 값 노이즈, 0..1로 정규화."""
    rng = _rng(seed)
    total = np.zeros((out_size, out_size))
    amp_sum = 0.0
    amp = 1.0
    for f in freqs:
        grid = rng.random((f, f))
        total += _upsample_periodic(grid, out_size) * amp
        amp_sum += amp
        amp *= 0.55
    total /= amp_sum
    lo, hi = total.min(), total.max()
    return (total - lo) / max(1e-6, hi - lo)


def _base_color_map(kind, seed, base_rgb01):
    noise = _fbm(seed, SIZE)
    variation = 0.82 + 0.36 * noise  # 픽셀마다 명도 ±18% 얼룩
    rgb = np.array(base_rgb01)[None, None, :] * variation[:, :, None]
    if kind == "lava":
        # 용암은 밝은 균열 줄기를 얹는다(높은 노이즈 값 = 갈라진 틈의 붉은빛).
        crack = np.clip((noise - 0.72) / 0.28, 0.0, 1.0)
        hot = np.array([1.0, 0.55, 0.12])
        rgb = rgb * (1 - crack[:, :, None]) + hot[None, None, :] * crack[:, :, None]
    arr = np.clip(rgb, 0.0, 1.0)
    return (arr * 255).astype(np.uint8), noise


def _normal_map(height, strength):
    dx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * strength
    dy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * strength
    nz = np.ones_like(height)
    length = np.sqrt(dx * dx + dy * dy + nz * nz)
    nx, ny, nzz = -dx / length, -dy / length, nz / length
    rgb = np.stack([nx, ny, nzz], axis=-1)
    return ((rgb * 0.5 + 0.5) * 255).astype(np.uint8)


def _roughness_map(noise, base_roughness):
    r = np.clip(base_roughness + (noise - 0.5) * 0.12, 0.0, 1.0)
    gray = (r * 255).astype(np.uint8)
    return np.stack([gray, gray, gray], axis=-1)


def make_tile(kind, seed, out_dir, palette_path=None, role=None):
    if kind not in KINDS:
        sys.exit("모르는 kind '%s' — %s 중 하나" % (kind, sorted(KINDS.keys())))
    base_rgb01, roughness_base, height_strength = KINDS[kind]
    if palette_path:
        base_rgb01 = load_role_rgb01(palette_path, role or kind)
    base_u8, noise = _base_color_map(kind, seed, base_rgb01)
    normal_u8 = _normal_map(noise, height_strength)
    rough_u8 = _roughness_map(noise, roughness_base)

    os.makedirs(out_dir, exist_ok=True)
    paths = {
        "base": os.path.join(out_dir, "%s_512.png" % kind),
        "normal": os.path.join(out_dir, "%s_512_n.png" % kind),
        "rough": os.path.join(out_dir, "%s_512_r.png" % kind),
    }
    Image.fromarray(base_u8, "RGB").save(paths["base"])
    Image.fromarray(normal_u8, "RGB").save(paths["normal"])
    Image.fromarray(rough_u8, "RGB").save(paths["rough"])
    print("타일 %s(seed=%d) -> %s / %s / %s" % (kind, seed, paths["base"], paths["normal"], paths["rough"]))
    return paths


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p_tile = sub.add_parser("tile", help="kind 하나의 베이스/노멀/러프니스 3장 생성")
    p_tile.add_argument("kind", choices=sorted(KINDS.keys()))
    p_tile.add_argument("--seed", type=int, required=True)
    p_tile.add_argument("--out-dir", required=True)
    p_tile.add_argument("--palette", default=None, help="palette.py build 로 만든 <name>.json 경로")
    p_tile.add_argument("--role", default=None, help="팔레트 역할 이름(생략하면 kind 이름과 같다고 본다)")

    p_all = sub.add_parser("batch-all", help="KINDS 6종 전부 생성(같은 seed, kind별로 다르게 섞인다)")
    p_all.add_argument("--seed", type=int, required=True)
    p_all.add_argument("--out-dir", required=True)
    p_all.add_argument("--palette", default=None)

    args = ap.parse_args()
    if args.cmd == "tile":
        make_tile(args.kind, args.seed, args.out_dir, args.palette, args.role)
    elif args.cmd == "batch-all":
        for i, kind in enumerate(sorted(KINDS.keys())):
            make_tile(kind, args.seed + i, args.out_dir, args.palette)


if __name__ == "__main__":
    main()
