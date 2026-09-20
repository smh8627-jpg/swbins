/**
 * 승급 3택 — 특성 갈래 (PLAN §5 ⑦)
 * ---------------------------------------------------------------
 * 승급(`hero.js` rankUp)은 이 판에서 유일한 성장 선택 지점인데 버튼 한 번에 숫자가
 * 오를 뿐이었다. 승급할 때마다 **카드 셋**이 뜬다 — 攻·守·補 세 갈래에서 하나씩.
 * 하나를 고르면 그 인물의 특성이 되고, 거절하면 丹 10 을 받는다.
 *
 *   攻(공)  무력·지력 배율   ─┐ `hero.stats()` 의 성장 배율 층에서 곱한다
 *   守(수)  통솔·지력 배율   ─┘ (기본치는 절대 안 변한다 — hero.js 머리 규칙)
 *   補(보)  경험치·설득·희귀·신령 % — **동행 중일 때만** `core.effect()` 에 잡힌다
 *
 * 인물당 특성은 최대 셋(같은 특성 중복 불가). 세 장은 늘 서로 다른 갈래다.
 * 카드는 (인물 id, 승급 단계)의 해시로 정해진다 — 새로고침·다시 열기로 다시 굴릴 수 없다.
 * 고르기 전에는 `save.heroes[id].offer` 에 남아 있어(승급 잠김) 앱을 닫아도 이어진다.
 * 자동 승급(auto.js)은 첫 카드를 고른다. 새 능력치 칸을 만들지 않는다 — 표는 이 파일 안에만 있다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  var MAX_PERKS = 3;
  var DECLINE_DAN = 10;

  var AXES = [
    { key: 'atk', mark: '攻', name: '공격' },
    { key: 'def', mark: '守', name: '수비' },
    { key: 'sup', mark: '補', name: '보조' }
  ];

  /* mul: 성장 배율에 더해 곱하는 몫(0.08 = +8%) · eff: 동행 중 core.effect() 에 더하는 키(% 단위) */
  var PERKS = [
    { id: 'atk1', axis: 'atk', emoji: '🐯', name: '맹호의 기세', desc: '무력 +8%', mul: { might: 0.08 } },
    { id: 'atk2', axis: 'atk', emoji: '🗡️', name: '한 칼의 결기', desc: '무력 +6%', mul: { might: 0.06 } },
    { id: 'atk3', axis: 'atk', emoji: '📜', name: '병략', desc: '지력 +8%', mul: { wisdom: 0.08 } },
    { id: 'atk4', axis: 'atk', emoji: '💡', name: '기지', desc: '지력 +6%', mul: { wisdom: 0.06 } },
    { id: 'def1', axis: 'def', emoji: '🛡️', name: '철벽', desc: '통솔 +8%', mul: { command: 0.08 } },
    { id: 'def2', axis: 'def', emoji: '🧱', name: '방진', desc: '통솔 +6%', mul: { command: 0.06 } },
    { id: 'def3', axis: 'def', emoji: '🧘', name: '침착', desc: '지력 +7%', mul: { wisdom: 0.07 } },
    { id: 'def4', axis: 'def', emoji: '🪨', name: '뚝심', desc: '통솔 +5%', mul: { command: 0.05 } },
    { id: 'sup1', axis: 'sup', emoji: '🎓', name: '가르침', desc: '동행 시 경험치 +6%', eff: { expPct: 6 } },
    { id: 'sup2', axis: 'sup', emoji: '🗣️', name: '말재주', desc: '동행 시 설득·포획 +5%', eff: { catchPct: 5 } },
    { id: 'sup3', axis: 'sup', emoji: '👁️', name: '천리안', desc: '동행 시 귀한 만남 +6%', eff: { spawnRarePct: 6 } },
    { id: 'sup4', axis: 'sup', emoji: '✨', name: '영험', desc: '동행 시 신령 만남 +8%', eff: { divinePct: 8 } }
  ];

  function def(pid) {
    for (var i = 0; i < PERKS.length; i++) { if (PERKS[i].id === pid) { return PERKS[i]; } }
    return null;
  }

  function strHash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) | 0; }
    return h;
  }
  /* core.hash2 는 0~0.5 만 돌려준다 — world.js·beacon.js 와 같은 보정 */
  function h01(a, b) { return Math.min(0.999999, core.hash2(a, b) * 2); }

  /** 저장된 성장 기록 그대로(없으면 빈 값) — 세이브를 만들지 않는 읽기 */
  function rec(id) { return core.save.heroes[id] || null; }
  function perksOf(id) { var g = rec(id); return g && Array.isArray(g.perks) ? g.perks : []; }
  function pending(id) { var g = rec(id); return g && Array.isArray(g.offer) && g.offer.length ? g.offer : null; }

  /**
   * 카드 셋 — 순수. 갈래마다 아직 안 가진 특성 중 하나를 (id, 승급 단계) 해시로 고른다.
   * 이미 셋을 가졌으면 빈 배열(더 안 뜬다).
   */
  function roll(id, rank, owned) {
    owned = owned || [];
    if (owned.length >= MAX_PERKS) { return []; }
    var seed = strHash(String(id)), out = [];
    for (var a = 0; a < AXES.length; a++) {
      var pool = PERKS.filter(function (p) { return p.axis === AXES[a].key && owned.indexOf(p.id) < 0; });
      if (!pool.length) { continue; }
      out.push(pool[Math.floor(h01(seed + rank * 97 + a * 13, rank * 31 + a + 7) * pool.length)].id);
    }
    return out;
  }

  /** 성장 배율에 곱할 특성 몫 — hero.stats() 가 능력치마다 부른다. 특성이 없으면 1 */
  function mulOf(id, statKey) {
    var own = perksOf(id), m = 1;
    for (var i = 0; i < own.length; i++) {
      var d = def(own[i]);
      if (d && d.mul && d.mul[statKey]) { m += d.mul[statKey]; }
    }
    return m;
  }

  /** core.effect() 훅 — 동행 중인 인물의 補 특성만 더해진다 */
  function bonus() {
    var out = {}, party = core.save.party || [];
    for (var i = 0; i < party.length; i++) {
      var own = perksOf(party[i]);
      for (var j = 0; j < own.length; j++) {
        var d = def(own[j]);
        if (!d || !d.eff) { continue; }
        for (var k in d.eff) {
          if (Object.prototype.hasOwnProperty.call(d.eff, k)) { out[k] = (out[k] || 0) + d.eff[k]; }
        }
      }
    }
    return out;
  }

  /** 승급 직후 hero.rankUp 이 부른다 — 카드를 세이브에 걸어 둔다(고를 때까지 승급 잠김) */
  function offer(id) {
    var g = core.save.heroes[id];
    if (!g) { return null; }
    var cards = roll(id, g.rank, g.perks || []);
    if (!cards.length) { return null; }
    g.offer = cards;
    var h = global.DG.data.find(id);
    core.log('🎴 ' + (h ? h.name : id) + ' 특성 셋 — 하나를 고른다', 'good');
    core.emit('perk:offer', { id: id, cards: cards });
    return cards;
  }

  function settle(id, msg) {
    var g = core.save.heroes[id];
    delete g.offer;
    core.log(msg, 'good');
    core.emit('toast', msg);
    core.emit('changed');
    core.persist();
  }

  /** 카드 하나를 고른다 */
  function choose(id, pid) {
    var g = core.save.heroes[id], d = def(pid);
    if (!g || !d || !Array.isArray(g.offer) || g.offer.indexOf(pid) < 0) { return false; }
    if (!Array.isArray(g.perks)) { g.perks = []; }
    if (g.perks.length >= MAX_PERKS || g.perks.indexOf(pid) >= 0) { return false; }
    g.perks.push(pid);
    var h = global.DG.data.find(id);
    settle(id, d.emoji + ' ' + (h ? h.name : id) + ' — ' + d.name + ' (' + d.desc + ')');
    return true;
  }

  /** 거절 — 丹 10 */
  function decline(id) {
    var g = core.save.heroes[id];
    if (!g || !Array.isArray(g.offer) || !g.offer.length) { return false; }
    var GR = global.DG.growth;
    if (GR) { GR.addDust(DECLINE_DAN); }
    settle(id, '🎴 카드를 물렸다 — 丹 +' + DECLINE_DAN);
    return true;
  }

  /** 자동 승급이 부른다 — 첫 카드 */
  function autoPick(id) {
    var p = pending(id);
    return p ? choose(id, p[0]) : false;
  }

  global.DG = global.DG || {};
  global.DG.perk = {
    MAX_PERKS: MAX_PERKS, DECLINE_DAN: DECLINE_DAN, AXES: AXES, PERKS: PERKS,
    /* 값을 내는 함수 — 순수하다. 세이브를 읽기만 한다 */
    def: def, perksOf: perksOf, pending: pending, roll: roll, mulOf: mulOf, bonus: bonus,
    /* 세이브가 바뀌는 곳은 여기 넷 */
    offer: offer, choose: choose, decline: decline, autoPick: autoPick
  };
})(window);
