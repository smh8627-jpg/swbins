/**
 * 방치형 — 자동화 · 방치 수익 업그레이드
 * ---------------------------------------------------------------
 * 두 가지를 담당한다.
 *
 *   1) 업그레이드 트리  금으로 사는 영구(단, **재봉하면 초기화**) 강화.
 *                      수치가 지수적으로 부푸는 걸 보는 재미가 이쪽 몫이다.
 *   2) 자동화          보고 있지 않아도 등용·포획·승급·장비를 알아서 처리한다.
 *                      해금은 환생 도장(prestige.js)으로 산다.
 *
 * 자동 등용·포획은 규칙을 새로 만들지 않고 encounter.autoResolve() 를 부른다 —
 * 손으로 할 때와 기대값이 어긋나지 않게 하려면 규칙이 한 곳에만 있어야 한다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  /**
   * 방치 업그레이드.
   *   cost(lv) 다음 단계 금
   *   eff(lv)  core.effect() 에 합산될 효과
   */
  var UPS = [
    {
      key: 'market', name: '시장망', emoji: '🏪', max: 50,
      desc: '금 생산이 늘어난다',
      cost: function (lv) { return Math.round(120 * Math.pow(1.34, lv)); },
      eff: function (lv) { return { 'gold/min': lv * 4 }; }
    },
    {
      key: 'grain', name: '군량', emoji: '🌾', max: 50,
      desc: '전리품이 늘어난다',
      cost: function (lv) { return Math.round(160 * Math.pow(1.36, lv)); },
      eff: function (lv) { return { lootPct: lv * 3 }; }
    },
    {
      key: 'drill', name: '훈련장', emoji: '⚔️', max: 50,
      desc: '부대 공격력이 오른다',
      cost: function (lv) { return Math.round(200 * Math.pow(1.38, lv)); },
      eff: function (lv) { return { atkPct: lv * 2 }; }
    },
    {
      key: 'supply', name: '병참', emoji: '🛡️', max: 50,
      desc: '부대 체력이 오른다',
      cost: function (lv) { return Math.round(200 * Math.pow(1.38, lv)); },
      eff: function (lv) { return { hpPct: lv * 2.5 }; }
    },
    {
      key: 'school', name: '서당', emoji: '📖', max: 30,
      desc: '경험치 획득이 늘어난다',
      cost: function (lv) { return Math.round(260 * Math.pow(1.40, lv)); },
      eff: function (lv) { return { expPct: lv * 3 }; }
    },
    {
      key: 'kennel', name: '마방', emoji: '🐎', max: 30,
      desc: '포획률과 사료 생산이 오른다',
      cost: function (lv) { return Math.round(180 * Math.pow(1.36, lv)); },
      eff: function (lv) { return { catchPct: lv * 1.5, feedMin: lv * 0.06 }; }
    },
    {
      key: 'vault', name: '곳간', emoji: '📦', max: 20,
      desc: '가방 칸이 늘어난다 (단계당 4칸)',
      cost: function (lv) { return Math.round(400 * Math.pow(1.42, lv)); },
      eff: function (lv) { return { bagSlots: lv * 4 }; }
    },
    {
      key: 'scout', name: '척후병', emoji: '🔎', max: 30,
      desc: '좋은 장비가 나올 확률이 오른다',
      cost: function (lv) { return Math.round(300 * Math.pow(1.40, lv)); },
      eff: function (lv) { return { findPct: lv * 3 }; }
    }
  ];

  function byKey(k) {
    for (var i = 0; i < UPS.length; i++) { if (UPS[i].key === k) { return UPS[i]; } }
    return null;
  }

  function st() {
    var s = core.save;
    if (!s.idle) { s.idle = { up: {}, auto: {} }; }
    if (!s.idle.up) { s.idle.up = {}; }
    if (!s.idle.auto) { s.idle.auto = {}; }
    return s.idle;
  }

  function level(key) { return st().up[key] || 0; }

  function upInfo(key) {
    var def = byKey(key);
    if (!def) { return null; }
    var lv = level(key);
    var max = lv >= def.max;
    var cost = max ? null : def.cost(lv);
    return {
      def: def, lv: lv, max: max, cost: cost,
      afford: !max && core.save.player.gold >= cost,
      cur: def.eff(lv), next: max ? null : def.eff(lv + 1)
    };
  }

  function buy(key) {
    var info = upInfo(key);
    if (!info || info.max || !info.afford) { return false; }
    core.save.player.gold -= info.cost;
    st().up[key] = info.lv + 1;
    core.emit('changed');
    return true;
  }

  /** 살 수 있는 만큼 계속 산다 (방치형의 '한 번에' 버튼) */
  function buyMax(key) {
    var n = 0;
    while (buy(key) && n < 200) { n++; }
    if (n) {
      var def = byKey(key);
      core.log('⬆️ ' + def.name + ' ' + level(key) + '단계 (' + n + '회 구매)', 'info');
      core.persist();
    }
    return n;
  }

  /** core.effect() 훅 */
  function bonus() {
    var out = {}, i;
    for (i = 0; i < UPS.length; i++) {
      var lv = level(UPS[i].key);
      if (!lv) { continue; }
      var eff = UPS[i].eff(lv), k;
      for (k in eff) {
        if (Object.prototype.hasOwnProperty.call(eff, k)) {
          out[k] = (out[k] || 0) + eff[k];
        }
      }
    }
    return out;
  }

  /* ── 자동화 ───────────────────────────────────────────── */

  var FLAGS = ['recruit', 'catch', 'rankup', 'gear'];

  /** 해금됐는지 (도장으로 산다) */
  function unlocked(flag) {
    return global.DG.prestige ? global.DG.prestige.unlocked(flag) : false;
  }

  /** 켜져 있는지 (해금 + 사용자가 켰는지) */
  function on(flag) {
    return unlocked(flag) && !!st().auto[flag];
  }

  function toggle(flag) {
    if (!unlocked(flag)) { return false; }
    st().auto[flag] = !st().auto[flag];
    core.emit('changed');
    core.persist();
    return !!st().auto[flag];
  }

  var acc = { meet: 0, rank: 0, gear: 0 };

  /**
   * 주기적으로 자동 처리.
   * 던전에 들어가 있는 동안에는 지도 쪽 자동 조우를 멈춘다(두 곳에서 동시에 놀지 않게).
   */
  function update(dt) {
    var s = st();
    acc.meet += dt; acc.rank += dt; acc.gear += dt;

    // 자동 등용 · 포획 — 2.5초마다 근처 대상 하나
    if (acc.meet >= 2.5) {
      acc.meet = 0;
      if (!(global.DG.dungeon && global.DG.dungeon.active()) &&
          (on('recruit') || on('catch')) && !global.DG.encounter.active) {
        var n = global.DG.world.nearest();
        if (n && n.inRange) {
          var kind = n.spawn.kind;
          if ((kind === 'hero' && on('recruit')) || (kind !== 'hero' && on('catch'))) {
            global.DG.encounter.autoResolve(n.spawn);
          }
        }
      }
    }

    // 자동 승급 — 6초마다 한 명
    if (acc.rank >= 6) {
      acc.rank = 0;
      if (on('rankup')) { autoRankUp(); }
    }

    // 자동 장비 — 8초마다 정리 + 장착
    if (acc.gear >= 8) {
      acc.gear = 0;
      if (on('gear')) {
        global.DG.item.autoEquip();
        global.DG.item.autoClean();
      }
    }
  }

  /** 승급 가능한 인물 중 등급이 높은 쪽부터 한 명 */
  function autoRankUp() {
    var ids = Object.keys(core.save.dex.heroes), best = null, bestR = -1, i;
    for (i = 0; i < ids.length; i++) {
      var chk = global.DG.hero.rankUpCheck(ids[i]);
      if (!chk.ok) { continue; }
      var h = global.DG.data.find(ids[i]);
      var score = h ? h.rarity : 0;
      if (score > bestR) { bestR = score; best = ids[i]; }
    }
    if (best) { global.DG.hero.rankUp(best); return true; }
    return false;
  }

  /** 오프라인 동안의 자동화 — 정산 화면에 한 줄로 요약된다 */
  function settleOffline(sec) {
    var out = { rankups: 0, sold: 0, gold: 0 };
    if (on('rankup')) {
      var tries = Math.min(20, Math.floor(sec / 60));
      while (tries-- > 0 && autoRankUp()) { out.rankups++; }
    }
    if (on('gear')) {
      global.DG.item.autoEquip();
      var r = global.DG.item.autoClean();
      out.sold = r.sold; out.gold = r.gold;
    }
    return (out.rankups || out.sold) ? out : null;
  }

  global.DG = global.DG || {};
  global.DG.idle = {
    UPS: UPS, FLAGS: FLAGS, byKey: byKey, state: st, level: level,
    upInfo: upInfo, buy: buy, buyMax: buyMax, bonus: bonus,
    unlocked: unlocked, on: on, toggle: toggle,
    update: update, settleOffline: settleOffline, autoRankUp: autoRankUp
  };
})(window);
