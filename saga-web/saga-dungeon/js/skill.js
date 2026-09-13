/**
 * 무예(武藝) — 직업과 스킬 트리의 규칙
 * ===============================================================
 * 표는 `data-skill.js` 가 들고 있다. 여기는 **누가 무엇을 배웠나**를 다룬다.
 *
 *   save.skills[인물id] = { 무예키: 단수 }      배운 것
 *   save.slots[인물id]  = [키, 키, 키, 키]      Z X C V 에 걸어 둔 것
 *
 * 원작에서 그대로 지킨 것 넷
 *   · **점수는 인물마다 따로.** 인물 레벨만큼 생긴다(레벨 1 = 1점)
 *   · **앞 단계에 1점이 있어야** 다음 단계가 열린다
 *   · 한 무예는 **다섯 단**까지
 *   · **네 칸에 걸어 둔 것만** 쓴다 — 원작에서도 배운 걸 다 손에 들진 못한다
 *
 * 이 판에서 정한 것
 *   · 던전에서 몸으로 뛰는 것은 **선두(부대 첫 인물)** 다. 그 인물의 무예를 쓴다
 *   · 직업은 **장착한 무기**가 정한다(data-skill.js). 무기를 바꾸면 손이 통째로
 *     바뀐다 — 그게 원작에서 직업을 고르는 자리다. 점수는 **직업마다 따로** 세므로
 *     무기를 도로 쥐면 예전 나무가 그대로 살아난다
 *   · **상시 무예(passive)는 boonVal 한 곳으로 흘려보낸다.** dungeon.js 의 수치가
 *     전부 boonVal 을 거치므로, 거기만 얹으면 공격력·체력·사거리가 저절로 따라온다
 *   · 되돌리기(환원)는 **행상에서 금을 내고** 한다 — 원작의 그 토큰 자리다
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  function SD() { return global.DG.skillData; }
  function data() { return global.DG.data; }

  /* ── 세이브 칸 ────────────────────────────────────────── */

  function st() {
    var s = core.save;
    if (!s.skills) { s.skills = {}; }
    if (!s.slots) { s.slots = {}; }
    return s;
  }

  /**
   * 이 인물의 직업 — **장착한 무기**가 정한다. 맨몸이면 기질을 본다.
   * 무기를 바꾸면 손이 통째로 바뀐다 — 그게 원작에서 직업을 고르는 자리다.
   */
  function classOf(heroId) {
    var h = data().find(heroId);
    var it = global.DG.item;
    var look = null;
    if (it && heroId) {
      var w = it.equipped(heroId).weapon;
      if (w && !it.isBroken(w)) {
        var b = it.baseOf(w);
        if (b) { look = b.look; }
      }
    }
    return SD().classOf(h, look);
  }

  function treeOf(heroId) { return SD().skillsOf(classOf(heroId).key); }

  /* ── 점수 ─────────────────────────────────────────────── */

  function learned(heroId) {
    st();
    if (!core.save.skills[heroId]) { core.save.skills[heroId] = {}; }
    return core.save.skills[heroId];
  }

  function rankOf(heroId, key) { return learned(heroId)[key] || 0; }

  /** 인물 레벨만큼 생긴다 */
  function pointsTotal(heroId) {
    var info = global.DG.hero.info(heroId);
    return Math.max(0, (info && info.lv) || 1);
  }

  /**
   * **직업마다 따로 센다.** 무기를 바꿔 직업이 바뀌면 그 나무는 새 예산으로
   * 시작하고, 예전 나무의 점수는 그대로 남아 있다가 무기를 도로 쥐면 살아난다.
   * (한 예산을 나눠 쓰게 하면 무기를 바꾼 순간 손이 비어 버린다)
   */
  function pointsSpent(heroId, clsKey) {
    var cls = clsKey || classOf(heroId).key;
    var m = learned(heroId), n = 0, k;
    for (k in m) {
      if (!Object.prototype.hasOwnProperty.call(m, k)) { continue; }
      var sk = SD().skillByKey(k);
      if (sk && sk.cls === cls) { n += m[k]; }
    }
    return n;
  }

  function pointsLeft(heroId) { return pointsTotal(heroId) - pointsSpent(heroId); }

  /**
   * 올릴 수 있나.
   * @return {ok, reason} 'point' 점수 없음 · 'max' 끝단 · 'prereq' 앞 단계 · 'class' 딴 직업
   */
  function canLearn(heroId, key) {
    var sk = SD().skillByKey(key);
    if (!sk) { return { ok: false, reason: 'gone' }; }
    if (sk.cls !== classOf(heroId).key) { return { ok: false, reason: 'class' }; }
    if (rankOf(heroId, key) >= SD().MAX_RANK) { return { ok: false, reason: 'max' }; }
    if (pointsLeft(heroId) < 1) { return { ok: false, reason: 'point' }; }
    var pre = SD().prereqOf(sk);
    if (pre && rankOf(heroId, pre.key) < 1) { return { ok: false, reason: 'prereq', need: pre }; }
    return { ok: true };
  }

  function learn(heroId, key) {
    var c = canLearn(heroId, key);
    if (!c.ok) { return c; }
    var m = learned(heroId);
    m[key] = (m[key] || 0) + 1;
    /* 처음 배운 것은 **빈 칸이 있으면 바로 걸어 준다** — 배우고도 못 쓰는 일이 없게 */
    if (m[key] === 1) { autoSlot(heroId, key); }
    core.emit('changed');
    return { ok: true, rank: m[key] };
  }

  /** 되돌리기 — **지금 직업의 나무만** 비운다 (딴 무기의 것은 건드리지 않는다) */
  function respec(heroId) {
    var cls = classOf(heroId).key;
    var spent = pointsSpent(heroId, cls);
    var m = learned(heroId), k;
    for (k in m) {
      if (!Object.prototype.hasOwnProperty.call(m, k)) { continue; }
      var sk = SD().skillByKey(k);
      if (sk && sk.cls === cls) { delete m[k]; }
    }
    var s = slots(heroId, cls), i;
    for (i = 0; i < s.length; i++) { s[i] = null; }
    core.emit('changed');
    return spent;
  }

  /* ── 네 칸 ────────────────────────────────────────────── */

  var SLOTS = 4;

  /**
   * 네 칸은 **직업마다 따로** 둔다.
   *   save.slots[인물id] = { 직업키: [키,키,키,키] }
   * 한 벌만 두면 무기를 바꾼 순간 손이 어긋난다 — 옛 나무의 무예가 칸을 잡고
   * 있는데 그건 이제 못 쓰는 것이고, 새 무예는 남는 칸으로 밀린다.
   * 직업마다 갈라 두면 **무기를 도로 쥐는 순간 손이 그대로 살아난다.**
   */
  function slots(heroId, clsKey) {
    st();
    var cls = clsKey || classOf(heroId).key;
    var all = core.save.slots[heroId];
    /* 옛 모양(배열 하나)이면 지금 직업의 것으로 옮겨 준다 */
    if (Array.isArray(all)) {
      var moved = {};
      moved[cls] = all.slice(0, SLOTS);
      core.save.slots[heroId] = moved;
      all = moved;
    }
    if (!all) { all = core.save.slots[heroId] = {}; }
    if (!all[cls] || all[cls].length !== SLOTS) {
      var old = all[cls] || [];
      all[cls] = [];
      for (var i = 0; i < SLOTS; i++) { all[cls].push(old[i] || null); }
    }
    return all[cls];
  }

  /** 걸 수 있는 것 — 배운 것 중 **상시가 아닌** 것 */
  function actives(heroId) {
    var m = learned(heroId), out = [], k;
    for (k in m) {
      if (!Object.prototype.hasOwnProperty.call(m, k) || !m[k]) { continue; }
      var sk = SD().skillByKey(k);
      if (sk && sk.shape !== 'passive') { out.push(sk); }
    }
    return out;
  }

  function autoSlot(heroId, key) {
    var sk = SD().skillByKey(key);
    if (!sk || sk.shape === 'passive') { return false; }
    var s = slots(heroId), i;
    for (i = 0; i < s.length; i++) { if (s[i] === key) { return false; } }
    for (i = 0; i < s.length; i++) {
      if (!s[i]) { s[i] = key; return true; }
    }
    return false;
  }

  /** 한 칸에 건다. 이미 딴 칸에 걸린 것이면 **자리를 맞바꾼다** */
  function setSlot(heroId, idx, key) {
    var s = slots(heroId);
    idx = core.clamp(idx, 0, SLOTS - 1);
    if (key && rankOf(heroId, key) < 1) { return { ok: false, reason: 'unlearned' }; }
    var sk = key ? SD().skillByKey(key) : null;
    if (sk && sk.shape === 'passive') { return { ok: false, reason: 'passive' }; }
    var was = s.indexOf(key);
    if (key && was >= 0 && was !== idx) { s[was] = s[idx]; }
    s[idx] = key || null;
    core.emit('changed');
    return { ok: true };
  }

  /** 던전이 읽는다 — 네 칸에 걸린 무예 (빈 칸은 null) */
  function equipped(heroId) {
    var cls = classOf(heroId).key;
    var s = slots(heroId), out = [], i;
    for (i = 0; i < s.length; i++) {
      var sk = s[i] ? SD().skillByKey(s[i]) : null;
      /* **지금 직업의 것만** 손에 잡힌다 — 무기를 바꾸면 손이 통째로 바뀐다 */
      if (sk && sk.cls === cls && rankOf(heroId, sk.key) > 0) {
        out.push({ sk: sk, rank: rankOf(heroId, sk.key) });
      } else { out.push(null); }
    }
    return out;
  }

  /* ── 상시 무예 ────────────────────────────────────────── */

  /**
   * 상시 무예가 주는 값의 합. dungeon.js 의 boonVal 이 이걸 더한다 —
   * 그 한 곳만 거치면 공격력·체력·사거리·저항이 전부 따라온다.
   */
  function passive(heroId, eff) {
    if (!heroId) { return 0; }
    var cls = classOf(heroId).key;
    var m = learned(heroId), n = 0, k;
    for (k in m) {
      if (!Object.prototype.hasOwnProperty.call(m, k) || !m[k]) { continue; }
      var sk = SD().skillByKey(k);
      if (!sk || sk.shape !== 'passive' || sk.eff !== eff) { continue; }
      if (sk.cls !== cls) { continue; }        // 딴 무기의 나무는 안 붙는다
      n += SD().valueAt(sk, m[k]);
    }
    return n;
  }

  /** 아직 아무것도 안 배웠으면 첫 단 하나를 얹어 준다 (손이 비지 않게) */
  function ensureStarter(heroId) {
    if (!heroId) { return false; }
    if (pointsSpent(heroId) > 0) { return false; }
    var tree = treeOf(heroId), i;
    for (i = 0; i < tree.length; i++) {
      if (tree[i].row === 0 && tree[i].shape !== 'passive') {
        return learn(heroId, tree[i].key).ok;
      }
    }
    return false;
  }

  global.DG = global.DG || {};
  global.DG.skill = {
    SLOTS: SLOTS,
    st: st, classOf: classOf, treeOf: treeOf,
    learned: learned, rankOf: rankOf,
    pointsTotal: pointsTotal, pointsSpent: pointsSpent, pointsLeft: pointsLeft,
    canLearn: canLearn, learn: learn, respec: respec,
    slots: slots, actives: actives, setSlot: setSlot, equipped: equipped,
    passive: passive, ensureStarter: ensureStarter
  };
})(window);
