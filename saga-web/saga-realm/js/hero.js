/**
 * 인물 성장 — 레벨 / 승급 / 최종 능력치
 * ---------------------------------------------------------------
 * 인물의 능력치는 아래 순서로 쌓인다. 이 순서를 바꾸지 않는다.
 *
 *   1) 기본치      data.js 의 stats (인물마다 고정, 절대 변하지 않는다)
 *   2) 성장 배율    레벨(경험) × 승급(중복 인물 소모)
 *   3) 장비 %       장착 장비의 pct 접사 (배율과 같은 층에서 곱한다)
 *   4) 펫 · 장비 flat  마지막에 더한다 (배율을 타지 않는다)
 *
 *   기본치 × 성장배율 × (1 + 장비pct) + 펫 + 장비flat
 *
 * 전투력·설득 보정은 전부 stats(id) 하나만 읽는다. 계산이 두 곳으로 갈라지면
 * 화면에 보이는 수치와 실제 전투력이 어긋나므로, 능력치를 직접 읽지 말 것.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var data = global.DG.data;

  var MAX_LV = 30;
  var MAX_RANK = 5;

  var LV_STEP = 0.022;      // 레벨 1당 능력치 +2.2%
  var RANK_STEP = 0.06;     // 승급 1단당 능력치 +6%

  /** 인물 성장 기록을 꺼낸다 (없으면 만든다) */
  function ensure(id) {
    var h = core.save.heroes;
    if (!h[id]) { h[id] = { lv: 1, exp: 0, rank: 0 }; }
    return h[id];
  }

  /** 저장된 성장 기록 (없으면 기본값 — 세이브를 건드리지 않는 읽기 전용) */
  function info(id) {
    return core.save.heroes[id] || { lv: 1, exp: 0, rank: 0 };
  }

  function expNeed(lv) {
    return Math.round(28 * Math.pow(1.22, lv - 1));
  }

  /** 성장 배율 (레벨 + 승급) */
  function growMul(id) {
    var g = info(id);
    return (1 + (g.lv - 1) * LV_STEP) * (1 + g.rank * RANK_STEP);
  }

  /** 장착 펫 */
  function petOf(id) {
    return data.find(core.save.petEquip[id]);
  }

  /** 장착 장비 보정 (장비 모듈이 없으면 0) */
  function gearOf(id) {
    if (!global.DG.item) {
      return { flat: { might: 0, wisdom: 0, command: 0 }, pct: { might: 0, wisdom: 0, command: 0 } };
    }
    return global.DG.item.statBonus(id);
  }

  /**
   * 최종 능력치 — 이 게임에서 "인물의 힘"은 오직 이 함수다.
   * @returns {{might:number, wisdom:number, command:number}}
   */
  function stats(id) {
    var h = data.find(id);
    if (!h || !h.stats) { return { might: 0, wisdom: 0, command: 0 }; }
    var mul = growMul(id);
    var g = gearOf(id);
    var out = {
      might: Math.round(h.stats.might * mul * (1 + g.pct.might / 100)) + g.flat.might,
      wisdom: Math.round(h.stats.wisdom * mul * (1 + g.pct.wisdom / 100)) + g.flat.wisdom,
      command: Math.round(h.stats.command * mul * (1 + g.pct.command / 100)) + g.flat.command
    };
    var pet = petOf(id);
    if (pet && pet.bonus) {
      // 펫의 '덕망' 보정은 통솔로 환산한다 (전투에 통솔로 들어가므로)
      var k = pet.bonus.stat === 'might' ? 'might'
            : (pet.bonus.stat === 'wisdom' ? 'wisdom' : 'command');
      out[k] += pet.bonus.value;
    }
    return out;
  }

  /** 화면에 "기본 → 최종" 을 보여줄 때 쓰는 분해값 */
  function breakdown(id) {
    var h = data.find(id);
    if (!h || !h.stats) { return null; }
    var mul = growMul(id);
    var pet = petOf(id);
    var g = gearOf(id);
    var grown = {
      might: Math.round(h.stats.might * mul),
      wisdom: Math.round(h.stats.wisdom * mul),
      command: Math.round(h.stats.command * mul)
    };
    return {
      base: h.stats, grown: grown, final: stats(id),
      mul: mul, pet: pet, gear: g, growth: info(id)
    };
  }

  /** 인물 개인 전투력 (부대 전투력과 같은 식으로 1명분만 계산) */
  function power(id) {
    var s = stats(id);
    var atk = s.might * 0.7 + s.wisdom * 0.3;
    var def = s.command * 0.6 + s.wisdom * 0.2;
    return Math.round(atk + def);
  }

  /**
   * 부대 전투력 — 동행 전원을 합한 공격력·방어력.
   * 던전(dungeon.js)의 체력·공격력이 이 값에서 나온다.
   * 원래 방치 전투(js/_expansion/battle.js)에 있던 계산인데, 던전을 본편으로
   * 되살리면서 **인물의 힘을 다루는 유일한 곳**인 여기로 옮겼다 — 던전이
   * 방치 전투 모듈에 매달려 있을 이유가 없다.
   */
  function partyPower() {
    var p = core.save.party, atk = 0, def = 0, i, h, s;
    for (i = 0; i < p.length; i++) {
      h = data.find(p[i]);
      if (!h || !h.stats) { continue; }
      s = stats(p[i]);
      atk += s.might * 0.7 + s.wisdom * 0.3;
      def += s.command * 0.6 + s.wisdom * 0.2;
    }
    var e = core.effect();
    atk *= 1 + (e.atkPct || 0) / 100;
    def *= 1 + (e.hpPct || 0) / 100;
    return { atk: Math.round(atk), def: Math.round(def), total: Math.round(atk + def) };
  }

  /* ── 경험치 ───────────────────────────────────────────── */

  /**
   * 인물에게 경험치를 준다.
   * @returns {{gained:number, levels:number}}
   */
  function gainExp(id, amount) {
    if (!core.save.dex.heroes[id]) { return { gained: 0, levels: 0 }; }
    var g = ensure(id);
    amount = Math.max(0, Math.round(amount));
    if (!amount || g.lv >= MAX_LV) { return { gained: 0, levels: 0 }; }
    g.exp += amount;
    var levels = 0, need = expNeed(g.lv);
    while (g.exp >= need && g.lv < MAX_LV) {
      g.exp -= need;
      g.lv += 1;
      levels++;
      need = expNeed(g.lv);
    }
    if (g.lv >= MAX_LV) { g.exp = 0; }
    if (levels) {
      var h = data.find(id);
      core.log('📈 ' + (h ? h.name : id) + ' Lv.' + g.lv + ' 로 성장', 'level');
      core.emit('hero:levelup', { id: id, lv: g.lv });
    }
    return { gained: amount, levels: levels };
  }

  /** 부대 전원에게 경험치 (관문 격파 보상) */
  function awardParty(amount) {
    var p = core.save.party, i, any = 0;
    for (i = 0; i < p.length; i++) {
      any += gainExp(p[i], amount).levels;
    }
    return any;
  }

  /* ── 승급 ─────────────────────────────────────────────── */

  /** 보유 중복 수 — 같은 인물을 다시 등용하면 늘어난다 */
  /** 태수로 앉은 인물들에게 경험치를 준다 (territory.js 가 30초마다 부른다) */
  function awardGovernors(amount) {
    var g = (core.save.territory && core.save.territory.governors) || {}, k, n = 0;
    for (k in g) {
      if (Object.prototype.hasOwnProperty.call(g, k) && g[k]) {
        n += gainExp(g[k], amount).levels;
      }
    }
    return n;
  }

  function dupOf(id) {
    var d = core.save.dex.heroes[id];
    return d ? Math.max(0, d.count - 1) : 0;
  }

  function rankUpCost(rank) {
    return { dup: rank + 1, gold: Math.round(220 * Math.pow(1.7, rank)) };
  }

  /** 승급 가능 여부와 이유 */
  function rankUpCheck(id) {
    var g = info(id);
    if (!core.save.dex.heroes[id]) { return { ok: false, why: '미획득' }; }
    if (g.rank >= MAX_RANK) { return { ok: false, why: '최대 승급' }; }
    var c = rankUpCost(g.rank);
    if (dupOf(id) < c.dup) { return { ok: false, why: '중복 인물 부족', cost: c }; }
    if (core.save.player.gold < c.gold) { return { ok: false, why: '금 부족', cost: c }; }
    return { ok: true, cost: c };
  }

  /**
   * 승급 — 같은 인물의 중복분과 금을 소모해 능력치 배율을 올린다.
   * 중복은 dex 의 count 에서 빠진다 (도감엔 '중복 n' 으로 표시된다).
   */
  function rankUp(id) {
    var chk = rankUpCheck(id);
    if (!chk.ok) { return false; }
    var g = ensure(id);
    core.save.dex.heroes[id].count -= chk.cost.dup;
    core.save.player.gold -= chk.cost.gold;
    g.rank += 1;
    var h = data.find(id);
    core.gainFeat(g.rank * 6, '인물 승급');
    core.log('✨ ' + (h ? h.name : id) + ' 승급 ★' + g.rank, 'good');
    core.emit('toast', '✨ ' + (h ? h.name : id) + ' 승급 ★' + g.rank);
    core.emit('changed');
    core.persist();
    return true;
  }

  global.DG = global.DG || {};
  global.DG.hero = {
    MAX_LV: MAX_LV, MAX_RANK: MAX_RANK,
    ensure: ensure, info: info, expNeed: expNeed,
    growMul: growMul, stats: stats, breakdown: breakdown, power: power,
    partyPower: partyPower,
    gainExp: gainExp, awardParty: awardParty, awardGovernors: awardGovernors,
    dupOf: dupOf, rankUpCost: rankUpCost, rankUpCheck: rankUpCheck, rankUp: rankUp
  };
})(window);
