/**
 * 소리(音) — WebAudio 로 그 자리에서 만든다
 * ===============================================================
 * 원작(디아블로)에서 감각의 절반은 소리다. 바닥에 뭐가 떨어졌는지 **보기 전에**
 * 소리로 안다 — 특히 유니크가 떨어질 때 나는 그 **종소리**. 화면을 안 봐도
 * 손이 먼저 멈춘다. 이 판에는 여태 소리가 하나도 없었다.
 *
 * 왜 파일(mp3·wav)을 안 쓰나
 *   · 이 저장소는 남의 에셋을 안 들인다(그림도 코드가 그린다 — sprite.js 와 같은 규칙)
 *   · 단독 실행판(build-single.mjs)은 **파일 하나**다. 소리를 data URI 로 우겨넣으면
 *     그 한 파일이 몇 배로 부푼다
 *   그래서 **절차적으로** 낸다. 톤·노이즈·아르페지오 셋이면 스무 가지가 나온다.
 *
 * 지킨 선 넷
 *   · **첫 입력 전에는 소리를 못 낸다**(브라우저 규칙). 그래서 첫 눌림에서 깨운다 —
 *     `unlock()` 은 이 파일이 스스로 문서에 걸어 둔다. 다른 파일은 몰라도 된다
 *   · **요청은 다 적고, 실제로 낼지는 그 다음이 정한다.** play() 는 꺼져 있어도
 *     `_tail()` 에 남긴다 — 판정 층과 소리 층을 가른 것이다(dungeon.js 의 fx 와 같다).
 *     그래야 헤드리스 자가진단이 "이때 이 소리를 냈어야 한다" 를 검사할 수 있다
 *   · **같은 소리가 겹쳐 뭉개지지 않게** 최소 간격을 둔다. 방에 적이 여덟이면
 *     타격음이 여덟 번 겹쳐 소음이 된다
 *   · **AudioContext 는 한 번만** 만든다. 프레임마다 만들면 몇 초 만에 죽는다
 *
 * 소리를 늘릴 때는 CUES 에 한 줄. 부르는 쪽은 `DG.sfx.play('<키>')` 뿐이다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  /* ── 소리표 ───────────────────────────────────────────────
   * 한 소리는 겹(layer) 여럿이다. 겹은 셋 중 하나다:
   *   tone   f 에서 f2 로 미끄러지는 한 음     { v:'tone', f, f2, dur, wave, gain, at }
   *   noise  걸러 낸 잡음 (타격·삐걱·깨짐)     { v:'noise', dur, lp, lp2, gain, at }
   *   chime  음을 차례로 놓는다 (알림·종)      { v:'chime', notes, step, dur, wave, gain, at }
   * at 은 시작을 늦추는 초. gap 은 이 소리의 최소 간격(초).
   */
  var CUES = {
    /* 전투 */
    hit:   { gap: 0.05, l: [{ v: 'noise', dur: 0.07, lp: 900, lp2: 300, gain: 0.16 }] },
    crit:  { gap: 0.06, l: [{ v: 'noise', dur: 0.11, lp: 2400, lp2: 500, gain: 0.24 },
                            { v: 'tone', f: 880, f2: 190, dur: 0.12, wave: 'square', gain: 0.12 }] },
    kill:  { gap: 0.06, l: [{ v: 'noise', dur: 0.22, lp: 520, lp2: 140, gain: 0.20 },
                            { v: 'tone', f: 190, f2: 62, dur: 0.20, wave: 'triangle', gain: 0.13 }] },
    boss:  { gap: 0.4,  l: [{ v: 'noise', dur: 0.5, lp: 400, lp2: 90, gain: 0.26 },
                            { v: 'tone', f: 110, f2: 41, dur: 0.6, wave: 'sawtooth', gain: 0.16 }] },
    skill: { gap: 0.05, l: [{ v: 'tone', f: 300, f2: 1180, dur: 0.17, wave: 'sine', gain: 0.15 }] },
    hurt:  { gap: 0.15, l: [{ v: 'tone', f: 180, f2: 72, dur: 0.18, wave: 'sawtooth', gain: 0.17 }] },
    /* 죽음 — 내려가던 것이 멎는 소리. 결사(하드코어)면 이게 마지막이다 */
    die:   { gap: 1.0,  l: [{ v: 'chime', notes: [330, 247, 165, 110], step: 0.13,
                              dur: 0.9, wave: 'triangle', gain: 0.20 }] },

    /* 줍기 — **등급마다 다르게 들려야** 보기 전에 안다 (원작의 그 반사신경) */
    gold:  { gap: 0.09, l: [{ v: 'chime', notes: [1568, 2093], step: 0.035,
                              dur: 0.13, wave: 'triangle', gain: 0.10 }] },
    drop0: { gap: 0.07, l: [{ v: 'tone', f: 520, f2: 420, dur: 0.07, wave: 'triangle', gain: 0.10 }] },
    drop1: { gap: 0.07, l: [{ v: 'chime', notes: [523, 784], step: 0.05,
                              dur: 0.22, wave: 'triangle', gain: 0.13 }] },
    drop2: { gap: 0.07, l: [{ v: 'chime', notes: [659, 988, 1319], step: 0.05,
                              dur: 0.30, wave: 'triangle', gain: 0.14 }] },
    drop3: { gap: 0.07, l: [{ v: 'chime', notes: [784, 1047, 1319, 1568], step: 0.055,
                              dur: 0.40, wave: 'sine', gain: 0.15 }] },
    drop4: { gap: 0.07, l: [{ v: 'chime', notes: [1047, 1319, 1568, 2093], step: 0.06,
                              dur: 0.55, wave: 'sine', gain: 0.16 }] },
    /* 고유(固有) — **원작의 그 종소리**. 이 파일이 있는 까닭의 절반이다.
       길게 남는 사인 음 셋을 겹쳐 종처럼 울린다 */
    uniq:  { gap: 0.5,  l: [{ v: 'tone', f: 1318, f2: 1318, dur: 1.6, wave: 'sine', gain: 0.17 },
                            { v: 'tone', f: 1976, f2: 1976, dur: 1.2, wave: 'sine', gain: 0.09, at: 0.02 },
                            { v: 'tone', f: 2637, f2: 2630, dur: 0.9, wave: 'sine', gain: 0.06, at: 0.04 },
                            { v: 'tone', f: 659, f2: 659, dur: 1.8, wave: 'sine', gain: 0.08 }] },
    mat:   { gap: 0.07, l: [{ v: 'chime', notes: [880, 1320], step: 0.04,
                              dur: 0.18, wave: 'sine', gain: 0.11 }] },
    rune:  { gap: 0.10, l: [{ v: 'chime', notes: [523, 784, 1046], step: 0.07,
                              dur: 0.5, wave: 'sine', gain: 0.13 }] },
    jewel: { gap: 0.10, l: [{ v: 'chime', notes: [1046, 1318, 1568, 1318], step: 0.05,
                              dur: 0.45, wave: 'sine', gain: 0.13 }] },
    potion:{ gap: 0.10, l: [{ v: 'tone', f: 260, f2: 700, dur: 0.24, wave: 'sine', gain: 0.13 }] },
    scroll:{ gap: 0.10, l: [{ v: 'noise', dur: 0.16, lp: 3600, lp2: 1400, gain: 0.09 }] },

    /* 자리 */
    door:  { gap: 0.25, l: [{ v: 'noise', dur: 0.34, lp: 340, lp2: 140, gain: 0.15 },
                            { v: 'tone', f: 96, f2: 78, dur: 0.3, wave: 'sawtooth', gain: 0.07 }] },
    floor: { gap: 0.3,  l: [{ v: 'tone', f: 220, f2: 96, dur: 0.45, wave: 'triangle', gain: 0.14 },
                            { v: 'noise', dur: 0.4, lp: 500, lp2: 120, gain: 0.10 }] },
    enter: { gap: 0.5,  l: [{ v: 'tone', f: 130, f2: 98, dur: 0.9, wave: 'sawtooth', gain: 0.12 }] },
    jar:   { gap: 0.05, l: [{ v: 'noise', dur: 0.12, lp: 5200, lp2: 900, gain: 0.14 }] },
    chest: { gap: 0.2,  l: [{ v: 'noise', dur: 0.2, lp: 1200, lp2: 300, gain: 0.10 },
                            { v: 'chime', notes: [659, 880, 1175], step: 0.06,
                              dur: 0.4, wave: 'triangle', gain: 0.13, at: 0.08 }] },
    well:  { gap: 0.2,  l: [{ v: 'tone', f: 620, f2: 260, dur: 0.35, wave: 'sine', gain: 0.11 }] },
    shrine:{ gap: 0.3,  l: [{ v: 'chime', notes: [440, 659, 880, 1319], step: 0.09,
                              dur: 0.8, wave: 'sine', gain: 0.14 }] },
    waypoint: { gap: 0.3, l: [{ v: 'chime', notes: [392, 587, 784], step: 0.08,
                               dur: 0.7, wave: 'sine', gain: 0.13 }] },

    /* 자람 · 세공 */
    levelup: { gap: 0.4, l: [{ v: 'chime', notes: [523, 659, 784, 1047], step: 0.08,
                               dur: 0.8, wave: 'triangle', gain: 0.16 }] },
    socket:{ gap: 0.1,  l: [{ v: 'noise', dur: 0.08, lp: 1600, lp2: 400, gain: 0.16 },
                            { v: 'tone', f: 700, f2: 260, dur: 0.12, wave: 'square', gain: 0.10 }] },
    /* 부문어가 이루어질 때 — 화음 하나를 통째로 울린다 */
    word:  { gap: 0.4,  l: [{ v: 'tone', f: 392, f2: 392, dur: 1.1, wave: 'sine', gain: 0.12 },
                            { v: 'tone', f: 523, f2: 523, dur: 1.0, wave: 'sine', gain: 0.10, at: 0.05 },
                            { v: 'tone', f: 659, f2: 659, dur: 0.9, wave: 'sine', gain: 0.09, at: 0.10 },
                            { v: 'tone', f: 784, f2: 784, dur: 0.8, wave: 'sine', gain: 0.08, at: 0.15 }] },
    forge: { gap: 0.2,  l: [{ v: 'noise', dur: 0.26, lp: 2000, lp2: 300, gain: 0.13 },
                            { v: 'chime', notes: [587, 880], step: 0.07,
                              dur: 0.3, wave: 'triangle', gain: 0.11, at: 0.1 }] },
    coin:  { gap: 0.1,  l: [{ v: 'chime', notes: [1175, 1568], step: 0.04,
                              dur: 0.16, wave: 'triangle', gain: 0.10 }] },
    ui:    { gap: 0.04, l: [{ v: 'tone', f: 660, f2: 620, dur: 0.05, wave: 'sine', gain: 0.07 }] }
  };

  /* ── 상태 ─────────────────────────────────────────────── */

  var ctx = null;                 // AudioContext — **한 번만** 만든다
  var master = null;
  var unlocked = false;
  var lastAt = {};                // 소리마다 마지막으로 낸 시각(초)
  var recent = [];                // 최근 요청 (진단이 읽는다)
  var RECENT_MAX = 40;
  var VOICE_MAX = 8;              // 동시에 우는 겹의 상한 (넘으면 새 것을 버린다)
  var voices = 0;

  function settings() {
    var s = core.save.settings || (core.save.settings = {});
    if (typeof s.sound !== 'boolean') { s.sound = true; }
    if (typeof s.soundVol !== 'number') { s.soundVol = 0.5; }
    return s;
  }

  function enabled() { return settings().sound !== false; }

  function setEnabled(v) {
    settings().sound = !!v;
    core.persist();
    if (v) { unlock(); play('ui'); }
    return settings().sound;
  }

  function volume() { return settings().soundVol; }

  function setVolume(v) {
    settings().soundVol = Math.max(0, Math.min(1, v));
    if (master) { master.gain.value = settings().soundVol; }
    core.persist();
    return settings().soundVol;
  }

  /* ── 깨우기 ───────────────────────────────────────────────
   * 브라우저는 **사람이 한 번 누르기 전에는** 소리를 못 내게 한다.
   * 그래서 첫 눌림·첫 키에서 만든다. 여기서 한 번만 걸어 두면
   * 게임 쪽 코드는 이 규칙을 아예 몰라도 된다.
   */
  function unlock() {
    if (unlocked) { return true; }
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) { return false; }
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = settings().soundVol;
      master.connect(ctx.destination);
      if (ctx.state === 'suspended' && ctx.resume) { ctx.resume(); }
      unlocked = true;
      return true;
    } catch (e) {
      ctx = null; master = null;
      return false;
    }
  }

  function bindUnlock() {
    if (!global.document || !document.addEventListener) { return; }
    var once = function () {
      unlock();
      document.removeEventListener('pointerdown', once, true);
      document.removeEventListener('keydown', once, true);
      document.removeEventListener('touchstart', once, true);
    };
    document.addEventListener('pointerdown', once, true);
    document.addEventListener('keydown', once, true);
    document.addEventListener('touchstart', once, true);
  }

  /* ── 겹 하나씩 ────────────────────────────────────────── */

  function envelope(g, t0, dur, peak) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  function playTone(L, t0, mul) {
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = L.wave || 'sine';
    osc.frequency.setValueAtTime(L.f, t0);
    if (L.f2 && L.f2 !== L.f) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, L.f2), t0 + L.dur);
    }
    envelope(g, t0, L.dur, (L.gain || 0.1) * mul);
    osc.connect(g); g.connect(master);
    osc.start(t0);
    osc.stop(t0 + L.dur + 0.02);
    return osc;
  }

  /** 잡음 한 줌 — 짧은 버퍼를 만들어 저역 통과로 깎는다 */
  function playNoise(L, t0, mul) {
    var n = Math.max(1, Math.floor(ctx.sampleRate * L.dur));
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0), i;
    for (i = 0; i < n; i++) { d[i] = Math.random() * 2 - 1; }
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(L.lp || 1000, t0);
    if (L.lp2) { f.frequency.exponentialRampToValueAtTime(Math.max(40, L.lp2), t0 + L.dur); }
    var g = ctx.createGain();
    envelope(g, t0, L.dur, (L.gain || 0.1) * mul);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
    src.stop(t0 + L.dur + 0.02);
    return src;
  }

  function playChime(L, t0, mul) {
    var notes = L.notes || [], each = L.dur / Math.max(1, notes.length), i;
    for (i = 0; i < notes.length; i++) {
      playTone({ f: notes[i], f2: notes[i], dur: Math.max(each, L.dur - i * (L.step || 0.05)),
                 wave: L.wave || 'sine', gain: L.gain },
               t0 + i * (L.step || 0.05), mul);
    }
  }

  /* ── 낸다 ─────────────────────────────────────────────── */

  /**
   * @param key  CUES 의 키. 없는 키는 조용히 흘린다(부르는 쪽이 안 죽는다)
   * @param opts {vol} 이번 한 번만 크기를 곱한다
   * @returns {boolean} 실제로 소리가 났는가 (꺼져 있거나 안 깨웠으면 false)
   */
  function play(key, opts) {
    /* **요청은 무조건 적는다** — 소리가 안 나도 남는다. 진단이 이걸 읽는다 */
    recent.push(key);
    if (recent.length > RECENT_MAX) { recent.shift(); }

    var cue = CUES[key];
    if (!cue) { return false; }
    if (!enabled() || !unlocked || !ctx || !master) { return false; }

    var now = ctx.currentTime;
    if (lastAt[key] !== undefined && now - lastAt[key] < (cue.gap || 0.05)) { return false; }
    lastAt[key] = now;
    if (voices >= VOICE_MAX) { return false; }

    var mul = (opts && typeof opts.vol === 'number') ? opts.vol : 1;
    var i, L;
    try {
      voices++;
      for (i = 0; i < cue.l.length; i++) {
        L = cue.l[i];
        var at = now + (L.at || 0);
        if (L.v === 'noise') { playNoise(L, at, mul); }
        else if (L.v === 'chime') { playChime(L, at, mul); }
        else { playTone(L, at, mul); }
      }
    } catch (e) {
      voices = Math.max(0, voices - 1);
      return false;
    }
    /* 겹이 다 울고 나면 자리를 돌려준다 — setTimeout 하나면 충분하다 */
    global.setTimeout(function () { voices = Math.max(0, voices - 1); }, 700);
    return true;
  }

  /** 등급을 소리로 — 바닥에 뭐가 떨어졌는지 **보기 전에** 알게 하는 자리 */
  function dropCue(tier, uniq) {
    if (uniq) { return 'uniq'; }
    return 'drop' + Math.max(0, Math.min(4, tier || 0));
  }

  /* ── 이벤트에 물린다 ──────────────────────────────────────
   * 이미 있는 이벤트로 되는 것은 여기서 받는다 — 그 파일들을 안 건드린다.
   * 프레임마다 나는 소리(타격·줍기·문)는 dungeon.js 가 직접 부른다.
   */
  core.on('levelup', function () { play('levelup'); });
  core.on('dungeon:enter', function () { play('enter'); });
  core.on('dungeon:floor', function () { play('floor'); });
  core.on('dungeon:skill', function () { play('skill'); });
  core.on('dungeon:end', function (e) {
    if (e && e.reason === 'dead') { play('die'); }
  });

  bindUnlock();

  global.DG = global.DG || {};
  global.DG.sfx = {
    CUES: CUES,
    play: play, dropCue: dropCue,
    unlock: unlock, ready: function () { return unlocked; },
    enabled: enabled, setEnabled: setEnabled,
    volume: volume, setVolume: setVolume,
    /** 최근 요청 n 개 (진단용 — 소리가 꺼져 있어도 남는다) */
    _tail: function (n) { return recent.slice(-(n || 8)); },
    _clear: function () { recent.length = 0; lastAt = {}; }
  };
})(window);
