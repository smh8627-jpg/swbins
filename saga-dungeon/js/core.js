/**
 * 코어 — 상태 / 저장 / 이벤트 버스 / 공용 계산
 * ---------------------------------------------------------------
 * 여기서 중요한 건 "공적(feat) 이벤트 버스"다.
 * 게임 행동이든 업무 이벤트든 전부 DG.core.gainFeat() 한 곳으로 들어온다.
 * 나중에 업무 연동을 붙일 때는 어댑터가 이 함수만 호출하면 되고,
 * 다른 코드는 손대지 않는다.
 */
(function (global) {
  'use strict';

  /* 세이브가 사는 곳. 뒤에 **프로필 id** 가 붙는다 — account.js 가 정해 준다.
   가입 개념이 없던 시절의 세이브는 '<base>/v1' 이고, 첫 가입 때 이어받는다. */
  var SAVE_BASE = 'yeoksa-dungeon/save';
  var SAVE_KEY = SAVE_BASE + '/v1';

  /** 프로필이 정해지면 그 키로 갈아탄다 (반드시 load() 전에) */
  function setSaveKey(k) {
    if (k) { SAVE_KEY = k; }
    return SAVE_KEY;
  }

  /** 기본 세이브 */
  function freshSave() {
    return {
      v: 1,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      player: {
        title: '무명(無名)',
        level: 1,
        exp: 0,
        gold: 120,
        fame: 30,
        feat: 0,            // 공적 — 칭호의 연료
        featTotal: 0,       // 누적 공적 (칭호 계산용)
        pos: { x: 0, y: 0 },
        distance: 0,        // 누적 이동 거리 (m 환산)
        supplyMark: 0,      // 걷기 보급을 마지막으로 받은 거리
        supplyCount: 0      // 보급 횟수 (짝수 번째마다 등용서)
      },
      items: { scroll: 3, feed: 5 },
      dex: { heroes: {}, pets: {} },     // { id: {count, firstAt} }
      heroes: {},                         // { heroId: {lv, exp, rank} } 인물 개별 성장
      party: [],                          // 동행 heroId 최대 5 — 선두가 지도 위 아바타
      petEquip: {},                       // { heroId: petId }
      /* 확장(js/_expansion) 필드는 각 모듈이 스스로 만들고,
         옛 세이브의 값(gear·battle·dungeon 등)은 mergeDeep 이 보존한다.
         경영(territory·build)은 게임에서 뺐다 — 옛 세이브에 남아 있어도 아무도 읽지 않는다. */
      auto: {                             // 자동 순회 (auto.js) — 켠 상태도 기억한다
        on: false, grow: true, review: true, retry: true
      },
      ai: {                               // 사관(AI) 사용 기록 · 길조 (ai.js)
        spent: 0, calls: 0, log: [], buff: null
      },
      settings: {
        mapStyle: 0, tilt: 1,
        prop: 'normal',                   // 등신 비례 'normal'(4등신) | 'chibi'(2) | 'tall'(8)
        style: 'story',                   // 그림 양식 'classic'(전통 삽화) | 'story'(그림책) | 'anime'(일본 만화)
        mode: 'offline',                  // 'offline' | 'online' (net.js)
        aiBase: '',                       // 온라인 서버 주소 (빈 값 = 같은 출처)
        sound: true,                      // 소리 (sfx.js) — 첫 눌림에서 깨어난다
        soundVol: 0.5,
        camZoom: 1                         // 3D 카메라 확대(핀치·휠) — dungeon3d.js 의 dg3d.zoom 값
      },
      log: []
    };
  }

  var save = freshSave();

  /* ── 저장 / 불러오기 ──────────────────────────────────── */

  function load() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) { return false; }
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== 1) { return false; }
      // 누락 필드 보정 (버전 올릴 때 여기서 마이그레이션)
      var base = freshSave();
      save = mergeDeep(base, parsed);
      return true;
    } catch (e) {
      console.warn('세이브 불러오기 실패, 새로 시작합니다.', e);
      return false;
    }
  }

  function persist() {
    try {
      save.lastSeen = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (e) {
      console.warn('저장 실패', e);
    }
  }

  function reset() {
    save = freshSave();
    persist();
  }

  function mergeDeep(base, over) {
    var out = {}, k;
    for (k in base) {
      if (!Object.prototype.hasOwnProperty.call(base, k)) { continue; }
      if (isPlain(base[k]) && isPlain(over && over[k])) {
        out[k] = mergeDeep(base[k], over[k]);
      } else if (over && Object.prototype.hasOwnProperty.call(over, k) && over[k] !== undefined) {
        out[k] = over[k];
      } else {
        out[k] = base[k];
      }
    }
    // base 에 없고 over 에만 있는 키(도감 항목 등)도 살린다
    for (k in over) {
      if (Object.prototype.hasOwnProperty.call(over, k) && !(k in out)) { out[k] = over[k]; }
    }
    return out;
  }

  function isPlain(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  /* ── 이벤트 버스 ──────────────────────────────────────── */

  var listeners = {};

  function on(evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn);
  }

  function emit(evt, payload) {
    var fns = listeners[evt];
    if (!fns) { return; }
    for (var i = 0; i < fns.length; i++) {
      try { fns[i](payload); } catch (e) { console.error('[' + evt + ']', e); }
    }
  }

  /* ── 공적(功績) ───────────────────────────────────────── */

  /**
   * 공적 획득 — 모든 성취가 이 한 곳으로 모인다.
   * @param {number} amount 공적량
   * @param {string} source 출처 라벨 ('등용', '포획', '답파', 나중엔 'Jira 종결' 등)
   */
  function gainFeat(amount, source) {
    amount = Math.max(0, Math.round(amount));
    if (!amount) { return; }
    save.player.feat += amount;
    save.player.featTotal += amount;
    emit('feat', { amount: amount, source: source });
    pushLog('공적 +' + amount + ' (' + source + ')', 'feat');
  }

  function gainExp(amount) {
    var mul = 1 + effect('expPct') / 100;
    amount = Math.round(amount * mul);
    save.player.exp += amount;
    var need = expNeed(save.player.level);
    while (save.player.exp >= need) {
      save.player.exp -= need;
      save.player.level += 1;
      pushLog('레벨 업! Lv.' + save.player.level, 'level');
      emit('levelup', save.player.level);
      need = expNeed(save.player.level);
    }
    return amount;
  }

  function expNeed(level) {
    return Math.round(50 * Math.pow(1.28, level - 1));
  }

  /* ── 효과 합산 ────────────────────────────────────────── */

  /**
   * 보정 효과를 합산한다. 지금 본편에서 값을 내는 것은 사관 길조(ai.bonus)뿐이고,
   * 나머지는 확장 모듈(js/_expansion)이 붙을 때를 위한 자리다 — 없으면 건너뛴다.
   * @param {string} key 없으면 전체 객체 반환
   */
  function effect(key) {
    var total = {};
    var srcs = [
      global.DG.item && global.DG.item.partyEffect,
      global.DG.dungeon && global.DG.dungeon.boonEffect,
      global.DG.prestige && global.DG.prestige.bonus,
      global.DG.idle && global.DG.idle.bonus,
      global.DG.ai && global.DG.ai.bonus
    ];
    for (var si = 0; si < srcs.length; si++) {
      if (!srcs[si]) { continue; }
      var add = srcs[si](), ak;
      for (ak in add) {
        if (Object.prototype.hasOwnProperty.call(add, ak)) {
          total[ak] = (total[ak] || 0) + add[ak];
        }
      }
    }
    if (key === undefined) { return total; }
    return total[key] || 0;
  }

  /* ── 로그 ─────────────────────────────────────────────── */

  function pushLog(text, kind) {
    save.log.unshift({ t: Date.now(), text: text, kind: kind || 'info' });
    if (save.log.length > 120) { save.log.length = 120; }
    emit('log', save.log[0]);
  }

  /* ── 유틸 ─────────────────────────────────────────────── */

  /** 좌표 기반 결정적 난수 (같은 좌표는 항상 같은 값 → 지형이 흔들리지 않는다)
   *
   * 마지막 xor 는 반드시 **부호 없는** 시프트(>>>)로 해야 한다. 부호 있는 >> 를 쓰면
   * 최상위 비트가 자기 자신과 xor 되어 늘 0 이 되고, 그래서 이 함수가 **0~0.5 만**
   * 돌려준다(0.9 같은 값이 절대 나오지 않는다). 지형 문턱값을 0.9 로 잡았더니 사물이
   * 하나도 안 생겨서 찾아낸 결함이다.
   *
   * 참고: 지도를 걷는 게임(deungyong-go)의 core.js 에는 아직 옛 식이 남아 있다.
   * 그쪽 지형 문턱값이 0~0.5 범위에 맞춰 손으로 맞춰져 있어서, 고치려면 지형을
   * 다시 눈으로 보며 조율해야 한다 — 네 프로젝트는 별개이므로 여기만 고쳐 둔다.
   */
  function hash2(x, y) {
    var h = x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967295;
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function fmt(n) {
    n = Math.floor(n);
    if (n >= 1e8) { return (n / 1e8).toFixed(2) + '억'; }
    if (n >= 1e4) { return (n / 1e4).toFixed(1) + '만'; }
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.ceil(sec));
    if (sec < 60) { return sec + '초'; }
    var m = Math.floor(sec / 60), s = sec % 60;
    if (m < 60) { return m + '분 ' + s + '초'; }
    var h = Math.floor(m / 60);
    return h + '시간 ' + (m % 60) + '분';
  }

  global.DG = global.DG || {};
  global.DG.core = {
    SAVE_BASE: SAVE_BASE,
    get SAVE_KEY() { return SAVE_KEY; },
    setSaveKey: setSaveKey,
    get save() { return save; },
    load: load, persist: persist, reset: reset,
    on: on, emit: emit,
    gainFeat: gainFeat, gainExp: gainExp, expNeed: expNeed,
    effect: effect,
    log: pushLog,
    hash2: hash2, pick: pick, clamp: clamp, fmt: fmt, fmtTime: fmtTime
  };
})(window);
