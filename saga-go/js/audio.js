/**
 * 오디오 — 짧은 효과음으로 발견·등용·타격·화면 전환에 소리를 얹는다
 * ------------------------------------------------------------
 * 이 판은 여태 소리가 하나도 없었다(`SAGA WEB.md` 15절 감사에서 드러난 격차 —
 * `assets/audio/`도 오디오 시스템도 전무했다). OpenGameArt "RPG Sound Pack"
 * (artisticdude, **CC0**)에서 짧은 조각 다섯을 골라 mp3(모노 96kbps)로
 * 옮겼다 — 출처는 `assets/ASSET_LICENSES.md`.
 *
 * **새 판정을 만들지 않는다.** 이미 도는 이벤트버스(`core.on`/`emit`)를
 * 엿듣기만 한다 — 어느 게임 로직 파일도 고치지 않았다:
 *
 *   codex          새 지역·사람·짐승·사건·역사를 처음 봤다  → discover
 *   dex:new        등용·포획 성공(도감에 오름)              → catch
 *   duel:fx        교전 중 타격(내 것·상대 것 가리지 않는다) → hit
 *   feat           공적 획득(사냥·답파·완수 전부 이 한 곳)   → reward
 *   duel:open      교전 무대가 열린다                        → open
 *   station:request / encounter:request / fort:request
 *                  역참·조우·성채 카드가 열린다               → open
 *
 * **손잡이** `audio.on`(0이면 전부 무음, 기본 1) · `audio.vol`(0~1, 기본 0.6).
 * **자동재생 정책** — 모바일은 첫 사용자 제스처 전엔 재생을 막는다.
 * 실패는 조용히 삼킨다(게임 진행에 안 걸린다) — 첫 탭 이후로는 정상 재생된다.
 * **로딩** — `preload="none"`, 처음 그 소리를 낼 때 받는다(SAGA WEB.md 7절,
 * 부팅 때 한꺼번에 안 받는다). 한 번 받은 클립은 풀(pool)로 돌려 쓴다 —
 * 같은 타격이 짧게 겹쳐도(연속 필살 등) 서로 안 끊는다.
 */
(function (global) {
  'use strict';

  function core() { return global.DG.core; }

  /** 소리를 낼까 — 0 이면 전부 무음 (되돌림용 손잡이) */
  function ON() { return core().tuned('audio.on', 1) ? true : false; }

  /** 마스터 볼륨 0~1 */
  function VOL() {
    var v = core().tuned('audio.vol', 0.6);
    return Math.max(0, Math.min(1, Number(v)));
  }

  var BASE = 'assets/audio/sfx/';
  var CLIPS = {
    discover: 'discover.mp3',
    catch: 'encounter_win.mp3',
    hit: 'hit.mp3',
    reward: 'reward.mp3',
    open: 'panel_open.mp3'
  };
  var POOL_N = 3;   // 동시에 겹쳐도 서로 안 끊기게

  var pool = {};    // name -> HTMLAudioElement[POOL_N]
  var rr = {};       // name -> 다음에 쓸 자리(순번)

  function bank(name) {
    if (pool[name]) { return pool[name]; }
    if (!global.Audio || !CLIPS[name]) { return null; }
    var arr = [];
    for (var i = 0; i < POOL_N; i++) {
      var a = new Audio(BASE + CLIPS[name]);
      a.preload = 'none';
      arr.push(a);
    }
    pool[name] = arr;
    return arr;
  }

  /** 이름난 효과음 하나를 낸다. 모르는 이름·오디오 미지원 기기는 조용히 넘어간다 */
  function play(name) {
    if (!ON()) { return; }
    var arr = bank(name);
    if (!arr) { return; }
    var i = (rr[name] = ((rr[name] || 0) + 1) % arr.length);
    var a = arr[i];
    try {
      a.pause();
      a.currentTime = 0;
      a.volume = VOL();
      var p = a.play();
      if (p && p.catch) { p.catch(function () { /* 자동재생 정책 — 다음 탭부터 들린다 */ }); }
    } catch (e) { /* 무음 기기 등 */ }
  }

  function wire() {
    var c = core();
    c.on('codex', function () { play('discover'); });
    c.on('dex:new', function () { play('catch'); });
    c.on('duel:fx', function () { play('hit'); });
    c.on('feat', function () { play('reward'); });
    c.on('duel:open', function () { play('open'); });
    c.on('station:request', function () { play('open'); });
    c.on('encounter:request', function () { play('open'); });
    c.on('fort:request', function () { play('open'); });
  }

  function stats() { return { on: ON(), vol: VOL(), clips: Object.keys(CLIPS).length }; }

  global.DG = global.DG || {};
  global.DG.audio = { play: play, stats: stats, CLIPS: CLIPS };

  if (global.DG.core) { wire(); }
})(window);
