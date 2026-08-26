/**
 * 토벌(討伐) — 원작(포켓몬GO)의 레이드
 * ---------------------------------------------------------------
 * 원작에서 레이드는 "지금 저기 가야 하는 이유"다. 체육관에 보스가 잠시 머물고,
 * 패스를 써서 도전하고, 이기면 그 자리에서 잡을 기회를 받는다.
 *
 *   체육관에 뜬다   → 성채에 적장(賊將)이 든다
 *   45분 머문다     → 그대로 45분
 *   레이드 패스     → 격문(檄文) · 하루 한 장은 그냥 받는다
 *   이기면 포획 기회 → 이기면 **등용 기회** (확률은 등급을 탄다)
 *
 * 어느 성채에 언제 드는지는 **시각과 성채 키의 해시**로 정한다 — 서버가 없어도
 * 어느 기기에서나 같고, "다음 시간엔 저기"를 미리 알 수 있다.
 *
 * 싸움의 계산은 성채와 같은 자리에서 나온다(`hero.partyPower`). 규칙을 새로 만들지 않는다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var data = global.DG.data;

  /** 한 판이 머무는 시간 — 원작 레이드와 같은 45분 */
  var STAY_MS = 45 * 60 * 1000;
  /** 뜨고 지는 주기 (한 시간마다 새로 정해진다) */
  var SLOT_MS = 60 * 60 * 1000;
  /** 하루에 그냥 받는 격문 */
  var FREE_PASS = 1;

  /** 등급 — 원작의 별 다섯 */
  var TIERS = [
    { tier: 1, name: '★1 적장', hpMul: 6,  catch: 0.55, feat: 40,  gold: 120 },
    { tier: 3, name: '★3 적장', hpMul: 14, catch: 0.34, feat: 90,  gold: 320 },
    { tier: 5, name: '★5 적장', hpMul: 26, catch: 0.18, feat: 180, gold: 700 }
  ];

  /* 이 판의 core.hash2 는 0~0.5 만 돌려준다 — 두 배로 편다(world.js 주석) */
  function h01(a, b) { return Math.min(0.999999, core.hash2(a, b) * 2); }

  function st() {
    var s = core.save;
    if (!s.raid) { s.raid = { pass: FREE_PASS, day: '', won: 0, tried: {} }; }
    var d = dayKey();
    if (s.raid.day !== d) {                    // 날이 바뀌면 격문 한 장을 그냥 받는다
      s.raid.day = d;
      s.raid.pass = (s.raid.pass || 0) + FREE_PASS;
      s.raid.tried = {};
    }
    return s.raid;
  }

  function dayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  /** 지금 시간 칸 */
  function slotOf(ms) { return Math.floor((ms === undefined ? Date.now() : ms) / SLOT_MS); }

  /**
   * 이 성채에 지금 적장이 들어 있나.
   * 한 시간 칸마다 성채의 약 1/6 에 든다 — 드물어야 찾아갈 이유가 된다.
   */
  function at(fort, ms) {
    if (!fort) { return null; }
    var slot = slotOf(ms);
    var h = h01(fort.rx * 977 + slot * 31 + 7, fort.ry * 613 + slot * 17 + 3);
    if (h > 0.17) { return null; }
    var start = slot * SLOT_MS;
    var now = ms === undefined ? Date.now() : ms;
    if (now - start >= STAY_MS) { return null; }      // 45분이 지나면 물러간다

    var th = h01(fort.rx * 131 + slot * 71 + 11, fort.ry * 197 + slot * 43 + 5);
    var tier = TIERS[th < 0.55 ? 0 : (th < 0.88 ? 1 : 2)];
    var want = tier.tier >= 5 ? 5 : (tier.tier >= 3 ? 4 : 3);
    var pool = data.heroes.filter(function (x) { return x.rarity === want; });
    if (!pool.length) { pool = data.heroes.filter(function (x) { return x.rarity >= 3; }); }
    if (!pool.length) { pool = data.heroes.slice(); }
    var hi = Math.floor(h01(fort.rx * 53 + slot * 29 + 1, fort.ry * 89 + slot * 61 + 2) * pool.length);
    var hero = pool[Math.min(pool.length - 1, hi)];

    return {
      fort: fort, key: fort.key + '@' + slot, slot: slot,
      tier: tier, hero: hero,
      leftMs: start + STAY_MS - now,
      hp: Math.round(hero.stats.might * tier.hpMul + 200 * tier.hpMul / 6)
    };
  }

  function current(fort) { return at(fort); }

  /** 이 판에 이미 도전했나 (한 판에 한 번) */
  function triedOf(raid) { return !!st().tried[raid.key]; }

  function passCount() { return st().pass || 0; }

  /* ── 싸움 ─────────────────────────────────────────────── */

  /**
   * 도전한다. 격문 한 장을 쓰고, 부대가 적장을 꺾어야 한다.
   *
   * `opts` 를 **주지 않으면 예전과 한 글자도 다르지 않게** 돈다 — 제한 합(10합)을
   * 즉시 계산해 승패를 낸다. 자동 순행과 자가진단이 그 길을 쓴다.
   *
   * 손으로 교전(`js/duel.js`)을 치르고 온 경우에만 `opts` 가 온다. 그때는 합을
   * 다시 굴리지 않는다 — **화면에서 실제로 낸 피해가 곧 판정이다**. 원작에서 탭
   * 전투의 결과가 그대로 레이드의 성패인 것과 같다.
   *
   * @param {{live:boolean, dealt:number, folded?:Array}} [opts] 교전 성과
   * @returns {{ok:boolean, reason?:string, win?:boolean, rounds?:Array, ...}}
   */
  function fight(raid, opts) {
    if (!raid) { return { ok: false, reason: 'none' }; }
    var s = st();
    if (s.tried[raid.key]) { return { ok: false, reason: 'tried' }; }
    if ((s.pass || 0) < 1) { return { ok: false, reason: 'nopass' }; }
    if (!core.save.party.length) { return { ok: false, reason: 'noparty' }; }

    s.pass -= 1;
    s.tried[raid.key] = true;

    var pw = global.DG.hero.partyPower();
    var hp = raid.hp, rounds = [], i;
    if (opts && opts.live) {
      hp = Math.max(0, raid.hp - Math.max(0, opts.dealt || 0));
      rounds = opts.folded || [];
    } else {
      for (i = 1; i <= 10 && hp > 0; i++) {
        var swing = Math.round(pw.atk * (0.75 + Math.random() * 0.5));
        hp -= swing;
        rounds.push({ n: i, dmg: swing, left: Math.max(0, hp) });
      }
    }
    var win = hp <= 0;

    if (!win) {
      core.log('⚔️ ' + raid.hero.name + ' 을(를) 꺾지 못했다 (남은 기세 ' + Math.max(0, hp) + ')', 'bad');
      core.emit('changed');
      core.persist();
      return { ok: true, win: false, rounds: rounds, left: Math.max(0, hp), raid: raid };
    }

    /* 이겼다 — 원작처럼 **잡을 기회**가 주어진다 (등급이 높을수록 어렵다) */
    var chance = raid.tier.catch + core.effect('catchPct') / 100;
    chance = core.clamp(chance, 0.05, 0.95);
    var caught = Math.random() < chance;
    var feat = raid.tier.feat, gold = raid.tier.gold;
    core.gainFeat(feat, '토벌');
    var exp = core.gainExp(feat * 3);
    core.save.player.gold += gold;
    s.won = (s.won || 0) + 1;

    var joined = null;
    if (caught) { joined = global.DG.encounter.gainHero(raid.hero); }
    core.log('⚔️ ' + raid.tier.name + ' ' + raid.hero.name + ' 격파! · 🪙 +' + gold +
      (caught ? ' · 등용 성공' : ' · 등용은 놓쳤다'), 'good');
    core.emit('changed');
    core.persist();
    return {
      ok: true, win: true, rounds: rounds, raid: raid,
      caught: caught, chance: chance,
      reward: { feat: feat, gold: gold, exp: exp, joined: joined }
    };
  }

  /** 격문을 얻는다 (역참이 드물게 준다) */
  function givePass(n) {
    var s = st();
    s.pass = (s.pass || 0) + (n || 1);
    return s.pass;
  }

  /**
   * 자동 순행이 부르는 문 — 이길 만할 때만 붙는다.
   * (열 합 안에 꺾어야 하므로 부대 공격력이 적장 기세의 1/7 은 되어야 한다)
   */
  function autoFight(raid) {
    if (!raid || triedOf(raid) || passCount() < 1) { return null; }
    var pw = global.DG.hero.partyPower();
    if (pw.atk * 7 < raid.hp) { return null; }
    var r = fight(raid);
    return r.ok ? r : null;
  }

  function leftLabel(ms) {
    var m = Math.ceil(ms / 60000);
    return m + '분';
  }

  global.DG = global.DG || {};
  global.DG.raid = {
    STAY_MS: STAY_MS, SLOT_MS: SLOT_MS, TIERS: TIERS,
    state: st, at: at, current: current, triedOf: triedOf, passCount: passCount,
    fight: fight, autoFight: autoFight, givePass: givePass, leftLabel: leftLabel
  };
})(window);
