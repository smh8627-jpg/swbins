/**
 * 반려(伴侶) — 원작(포켓몬GO)의 버디
 * ---------------------------------------------------------------
 * 원작에서 걷는 이유는 둘이다. 하나는 알(=천거장)이고, 다른 하나가 **버디**다.
 * 짐승 하나를 곁에 세우고 함께 걸으면 그 종의 사탕이 나오고, 오래 함께할수록
 * 사이가 깊어져 전투에서 힘을 보탠다.
 *
 *   버디 지정      → 반려(伴侶) 🐾   포획한 종 중 **하나만** 곁에 세운다
 *   사탕(종별)     → 영초(靈草) 🌿   등급마다 정해진 거리를 걸을 때마다 나온다
 *   하트 · 우애    → 면식→친교→지기→막역   함께 걸은 거리 + 먹인 사료
 *   베스트 버디 CP → 장착 보정 배율   **반려로 세워 둔 동안에만** 붙는다
 *
 * 이 판에는 걷기 보급(`player.supplyMark`)과 장착(`petEquip`)이 따로 있었고
 * 둘이 이어져 있지 않았다. 여기가 그 이음매다 — 걸으면 영초가 쌓이고(연성·승화의
 * 연료다), 오래 걸은 짐승은 장착했을 때 더 세다.
 *
 * **인물의 동행(party)과는 다른 말이다.** 동행은 함께 싸우는 사람 다섯,
 * 반려는 곁을 걷는 짐승 하나다. 이름을 섞지 말 것.
 *
 * 영초·단사를 직접 만지지 않는다 — 수급은 `growth.js` 한 곳으로만 들어간다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var data = global.DG.data;

  /* 아래 넷은 어드민이 잡을 수 있는 손잡이다(`core.tuned`) — 켤 때 한 번 읽는다 */

  /** 영초 한 몫에 드는 거리 — 등급이 높을수록 멀다 (원작의 1·3·5·20km 자리) */
  var LEG = core.tuned('buddy.leg', [1000, 1500, 2000, 3000, 5000]);

  /** 사료 한 줌은 우애로 치면 이만큼 걸은 값 (원작에서 먹이는 하트만 올린다) */
  var FEED_M = core.tuned('buddy.feedM', 300);

  var HERB_BASE = core.tuned('buddy.herbBase', 1);   // 한 몫에 나오는 영초 (+ 우애 단계)
  var BOND_DUST = core.tuned('buddy.bondDust', 250); // 우애 한 단 = 단계 × 이 값의 단사

  /**
   * 우애 — 함께 걸은 거리(+ 먹인 사료)로 깊어진다.
   * `mul` 은 **반려로 세워 둔 동안에만** 장착 보정에 곱해진다(원작 베스트 버디).
   */
  var BOND_AT = core.tuned('buddy.bondAt', [0, 2000, 10000, 30000]);
  var BOND = [
    { at: BOND_AT[0], name: '면식(面識)', mark: '🤍', mul: 0 },
    { at: BOND_AT[1], name: '친교(親交)', mark: '💛', mul: 0.02 },
    { at: BOND_AT[2], name: '지기(知己)', mark: '🧡', mul: 0.05 },
    { at: BOND_AT[3], name: '막역(莫逆)', mark: '❤️', mul: 0.10 }
  ];

  /* ── 세이브 칸 ────────────────────────────────────────── */

  /** 지금 세운 반려 { id, mark } — mark 는 누적 거리 위의 기준점이다 */
  function slot() {
    var b = core.save.buddy;
    if (!b || typeof b !== 'object') { b = core.save.buddy = { id: null, mark: 0 }; }
    if (typeof b.id === 'undefined') { b.id = null; }
    if (typeof b.mark !== 'number') { b.mark = core.save.player.distance || 0; }
    return b;
  }

  /**
   * 종별 기록 — **반려를 갈아도 남는다.** 이 판의 펫은 개체가 아니라 종이라
   * "그 종과 얼마나 걸었는가" 가 곧 우애다. 원작에서도 버디를 바꾼다고
   * 지금까지 쌓은 하트가 사라지지는 않는다.
   */
  function logOf(id) {
    if (!core.save.buddyLog) { core.save.buddyLog = {}; }
    var lg = core.save.buddyLog[id];
    if (!lg) { lg = core.save.buddyLog[id] = { walked: 0, fed: 0, gained: 0, since: 0 }; }
    if (typeof lg.walked !== 'number') { lg.walked = 0; }
    if (typeof lg.fed !== 'number') { lg.fed = 0; }
    if (typeof lg.gained !== 'number') { lg.gained = 0; }
    return lg;
  }

  /** 저장 칸을 만들지 않는 읽기 (도감처럼 아직 만난 적 없는 종에도 물어본다) */
  function info(id) {
    var lg = core.save.buddyLog && core.save.buddyLog[id];
    return {
      walked: (lg && lg.walked) || 0,
      fed: (lg && lg.fed) || 0,
      gained: (lg && lg.gained) || 0,
      since: (lg && lg.since) || 0
    };
  }

  /* ── 거리 · 우애 ──────────────────────────────────────── */

  function legOf(pet) {
    var r = core.clamp((pet && pet.rarity) || 1, 1, LEG.length);
    return LEG[r - 1];
  }

  /** 우애 점수 = 함께 걸은 거리 + 먹인 사료 */
  function careOf(id) {
    var g = info(id);
    return g.walked + g.fed * FEED_M;
  }

  function bondLv(id) {
    var c = careOf(id), lv = 0;
    for (var i = 0; i < BOND.length; i++) { if (c >= BOND[i].at) { lv = i; } }
    return lv;
  }

  function bondOf(id) {
    var lv = bondLv(id), c = careOf(id);
    var next = BOND[lv + 1] || null;
    return {
      lv: lv, def: BOND[lv], care: c, next: next,
      left: next ? Math.max(0, next.at - c) : 0,
      pct: next ? core.clamp((c - BOND[lv].at) / (next.at - BOND[lv].at), 0, 1) : 1
    };
  }

  /** 한 몫에 나오는 영초 — 사이가 깊을수록 더 물어 온다 */
  function herbPerLeg(id) { return HERB_BASE + bondLv(id); }

  /**
   * 장착 보정 배율 — `growth.bonusOf()` 가 곱한다.
   * **지금 반려인 종에만** 붙는다(원작의 베스트 버디도 세워 둔 동안만 값이 있다).
   */
  function bonusMul(id) {
    var b = core.save.buddy;
    if (!b || b.id !== id) { return 1; }
    return 1 + BOND[bondLv(id)].mul;
  }

  /* ── 세우기 · 물리기 ──────────────────────────────────── */

  function set(id) {
    var pet = data.find(id);
    if (!pet || !core.save.dex.pets[id]) { return false; }
    var b = slot();
    if (b.id === id) { return true; }
    b.id = id;
    b.mark = core.save.player.distance;          // 갈아탄 시점부터 센다
    var lg = logOf(id);
    if (!lg.since) { lg.since = Date.now(); }
    core.log('🐾 ' + pet.name + ' 이(가) 곁을 걷는다 — ' + core.fmt(legOf(pet)) + 'm 마다 영초', 'good');
    core.emit('toast', '🐾 반려 · ' + pet.name);
    core.emit('changed');
    core.persist();
    return true;
  }

  function clear() {
    var b = slot();
    if (!b.id) { return false; }
    var pet = data.find(b.id);
    b.id = null;
    b.mark = core.save.player.distance;
    core.log('🐾 ' + (pet ? pet.name : '반려') + ' 을(를) 놓아 주었다 (우애는 그대로 남는다)', 'info');
    core.emit('changed');
    core.persist();
    return true;
  }

  function current() {
    var b = slot();
    if (!b.id) { return null; }
    var pet = data.find(b.id);
    if (!pet) { return null; }
    var leg = legOf(pet);
    var into = Math.max(0, core.save.player.distance - b.mark);
    return {
      pet: pet, leg: leg,
      into: Math.min(into, leg), left: Math.max(0, leg - into),
      pct: core.clamp(into / leg, 0, 1),
      herbNext: herbPerLeg(b.id),
      bond: bondOf(b.id), log: info(b.id)
    };
  }

  /* ── 걷는다 ───────────────────────────────────────────── */

  /** 우애가 깊어졌다 — 단사가 들어오고 기록에 남는다 */
  function bondUp(pet, from, to) {
    var dust = 0;
    for (var i = from + 1; i <= to; i++) { dust += i * BOND_DUST; }
    if (dust && global.DG.growth) { global.DG.growth.addDust(dust); }
    var d = BOND[to];
    core.log(d.mark + ' ' + pet.name + ' 과(와) ' + d.name + ' — ✨ +' + core.fmt(dust) +
      (d.mul ? ' · 장착 보정 +' + Math.round(d.mul * 100) + '%' : ''), 'good');
    core.emit('toast', d.mark + ' ' + pet.name + ' · ' + d.name);
    return dust;
  }

  /**
   * 걸은 만큼 영초를 받는다 — `game.js` 의 루프가 매 프레임 부른다.
   * 걷기 보급(`tickSupply`)과 같은 자리에 있지만 **기준점이 따로**다.
   * 반려를 갈아타면 그 시점부터 다시 세야 하기 때문이다.
   *
   * @returns {null|{pet,legs,herb,bondUp}} 이번에 받은 것 (없으면 null)
   */
  function tick() {
    var b = slot();
    var p = core.save.player;
    if (!b.id) { b.mark = p.distance; return null; }
    var pet = data.find(b.id);
    if (!pet) { b.id = null; b.mark = p.distance; return null; }
    /* 세이브를 되돌렸거나 거리가 줄었을 때 — 걷기 보급과 같은 함정이다 */
    if (b.mark > p.distance) { b.mark = p.distance; }

    var leg = legOf(pet);
    var lv0 = bondLv(b.id);
    var herb = 0, legs = 0;
    while (p.distance - b.mark >= leg) {
      b.mark += leg;
      var lg = logOf(b.id);
      lg.walked += leg;
      var n = herbPerLeg(b.id);                  // 이번 몫을 걸은 **뒤**의 우애로 센다
      if (global.DG.growth) { global.DG.growth.addHerb(b.id, n); }
      lg.gained += n;
      herb += n; legs += 1;
    }
    if (!legs) { return null; }

    core.log('🐾 ' + pet.name + ' 이(가) 영초를 물어 왔다 — 🌿 +' + herb +
      ' (함께 ' + core.fmt(info(b.id).walked) + 'm)', 'good');
    core.emit('toast', '🐾 ' + pet.name + ' · 🌿 +' + herb);
    var lv1 = bondLv(b.id);
    if (lv1 > lv0) { bondUp(pet, lv0, lv1); }
    core.emit('changed');
    return { pet: pet, legs: legs, herb: herb, bondUp: lv1 > lv0 };
  }

  /**
   * 사료를 먹인다 — **우애만 오르고 영초는 나오지 않는다**(원작도 그렇다).
   * 사료는 포획에도 드는 물건이라 여기 쓰는 만큼 저기서 모자라진다.
   */
  function feed() {
    var b = slot();
    if (!b.id) { return { ok: false, why: '반려 없음' }; }
    if (global.DG.bag.count('feed') < 1) { return { ok: false, why: '사료 없음' }; }
    var pet = data.find(b.id);
    global.DG.bag.take('feed', 1);
    var lv0 = bondLv(b.id);
    logOf(b.id).fed += 1;
    var lv1 = bondLv(b.id);
    core.log('🍖 ' + (pet ? pet.name : '반려') + ' 에게 사료를 주었다 (우애 ' +
      core.fmt(careOf(b.id)) + ')', 'info');
    if (lv1 > lv0) { bondUp(pet, lv0, lv1); }
    else { core.emit('toast', '🍖 ' + (pet ? pet.name : '반려') + ' 이(가) 잘 먹는다'); }
    core.emit('changed');
    core.persist();
    return { ok: true, care: careOf(b.id), bondUp: lv1 > lv0 };
  }

  global.DG = global.DG || {};
  global.DG.buddy = {
    LEG: LEG, FEED_M: FEED_M, BOND: BOND, HERB_BASE: HERB_BASE, BOND_DUST: BOND_DUST,
    slot: slot, info: info, current: current,
    legOf: legOf, careOf: careOf, bondLv: bondLv, bondOf: bondOf,
    herbPerLeg: herbPerLeg, bonusMul: bonusMul,
    set: set, clear: clear, tick: tick, feed: feed
  };
})(window);
