/**
 * 배경음악(BGM) — 2026-09-10, 다른 게임 참조("사가스토리에 CC0 BGM이 있다").
 * ---------------------------------------------------------------
 * `sfx.js`(절차적 효과음, 짧은 블립)와는 다른 결이다 — 몇 분짜리 루프 음악은
 * 절차로 못 낸다. 사가스토리 `js/bgm.js`를 본으로 삼되, 이 판은 마을 하나뿐이고
 * 전투가 없어 town/forest/battle 셋을 가릴 필요가 없다 — **늘 같은 트랙 하나**를
 * 돌린다(단순하게 시작, PLAN 35절 "과도하게 사용하지 않는다"와 같은 결).
 * 트랙 자체도 새로 안 받았다 — 사가스토리의 `forest.mp3`(CC0, 출처는
 * `assets/ASSET_LICENSES.md`)를 그대로 옮겼다, 마침 이름부터 이 판과 맞는다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  var TRACK = 'assets/audio/bgm/forest.mp3';
  var el = null;
  var unlocked = false;

  function settings() {
    var s = core.save.settings || (core.save.settings = {});
    if (typeof s.music !== 'boolean') { s.music = true; }
    if (typeof s.musicVol !== 'number') { s.musicVol = 0.35; }
    return s;
  }

  function enabled() { return settings().music !== false; }
  function volume() { return settings().musicVol; }

  /** 처음 부를 때만 <audio> 를 만든다 — `_test.html`(document 는 있지만 재생은
   *  안 시키는 환경) 배려로 재생 전엔 굳이 안 만든다 */
  function ensureEl() {
    if (!global.document || el) { return; }
    el = document.createElement('audio');
    el.src = TRACK;
    el.loop = true;
    el.preload = 'none';   // 느린 회선 배려 — 실제로 켜기 전엔 안 받는다
    el.volume = volume();
  }

  function setEnabled(v) {
    settings().music = !!v;
    core.persist();
    if (!v) { stop(); } else if (unlocked) { play(); }
    return settings().music;
  }

  function setVolume(v) {
    var vol = Math.max(0, Math.min(1, v));
    settings().musicVol = vol;
    if (el) { el.volume = vol; }
    core.persist();
    return vol;
  }

  function stop() {
    if (el) { try { el.pause(); } catch (e) { /* 무시 */ } }
  }

  function play() {
    if (!enabled() || !unlocked) { return; }
    ensureEl();
    if (!el || !el.paused) { return; }
    try {
      var p = el.play();
      if (p && p.catch) { p.catch(function () { /* 자동재생 막힘 — 다음 unlock에 재시도 */ }); }
    } catch (e) { /* 무시 */ }
  }

  function unlock() {
    if (unlocked) { return; }
    unlocked = true;
    ensureEl();
    play();
  }

  /** 브라우저는 사람이 한 번 누르기 전엔 소리를 못 낸다 — `sfx.js` 와 같은 요령이되
   *  이 파일이 스스로 건다(다른 파일은 몰라도 된다) */
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

  bindUnlock();

  global.DG = global.DG || {};
  global.DG.bgm = {
    enabled: enabled, setEnabled: setEnabled,
    volume: volume, setVolume: setVolume,
    unlocked: function () { return unlocked; },
    /** 진단 전용 — 실제로 재생 중인지(document 가 있는 헤드리스에서도 <audio> 는 만들어지지만
     *  자동재생 정책 때문에 paused 로 남을 수 있다, 그래도 있는지 없는지는 순수하게 본다) */
    hasEl: function () { return !!el; }
  };
})(typeof window !== 'undefined' ? window : this);
