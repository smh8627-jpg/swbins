/**
 * 무예 단계 · 깨달음 — 오픈월드 RPG의 기술 레벨·돌파 단계 문법 (PLAN §5 ⑲-4, 이름·수치는 §5 ⑳)
 * ---------------------------------------------------------------
 * 인물의 힘은 레벨·승급 배율(`hero.js`) 하나뿐이었다. 들판 전투(⑨)에서
 * "기본 공격·원소 스킬·원소 해방 중 무엇을 키우나" 를 고르는 축이 없었다.
 *
 *   기술 레벨     → 무예 단계 셋(기본·스킬·해방 1~10)  — "특성"은 ⑦ 승급 특성(perk.js)과 겹쳐 이름을 바꿨다
 *   단계 상한     → 승급 ★0~5 가 3·4·5·7·9·10 을 연다  — 승급은 그대로(중복+금 · 3택)
 *   깨달음        → 인연 매듭 하나로 한 단(0~5)        — 중복 등용은 승급 몫이라 겹치지 않는다
 *
 * 수치의 원본은 saga-godot `data/growth.gd`(TALENT_*·CONSTELLATION_*). 코드는 공유하지 않는다.
 * 단계는 **들판 전투 피해에만** 탄다 — 사건 결투·부대 전투력(`hero.stats`)은 안 건드린다.
 * 세이브는 `save.heroes[id]` 에 tn·ts·tb·con 칸을 더하고(없으면 1·1·1·0),
 * 재료는 `save.talentMat` — 가방(bag.js) 상한 밖이다. SAVE_VERSION 은 그대로.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  var KINDS = [
    { key: 'n', field: 'tn', icon: '🗡️', name: '기본 공격' },
    { key: 's', field: 'ts', icon: '🌀', name: '원소 스킬' },
    { key: 'b', field: 'tb', icon: '💥', name: '원소 해방' }
  ];
  var MAX = 10;
  var BONUS = 2;                                         // 깨달음 3 이 스킬·해방에 더하는 단계
  var CAP_BY_RANK = [3, 4, 5, 7, 9, 10];                 // 승급 ★0~5
  var MUL = [1.0, 1.08, 1.16, 1.24, 1.32, 1.4, 1.48, 1.58, 1.68, 1.78, 1.88, 1.98, 2.1];   // §5 ⑳ — 8단부터 +0.1

  var MATS = {
    note:   { icon: '📃', name: '무예 쪽지' },
    guide:  { icon: '📘', name: '무예 교본' },
    secret: { icon: '📕', name: '무예 비전' },
    knot:   { icon: '🪢', name: '인연 매듭' },
    scale:  { icon: '🐉', name: '뇌룡 비늘' }             // ⑲-9 주간 보스(domain.js 먹구름 제단)
  };
  /* 단계 n → n+1 (index n-1) — §5 ⑳ 이 판 비용 */
  var COST = [
    { gold: 100,  book: 'note',   books: 2,  dust: 30 },
    { gold: 160,  book: 'guide',  books: 2,  dust: 40 },
    { gold: 220,  book: 'guide',  books: 3,  dust: 60 },
    { gold: 300,  book: 'guide',  books: 5,  dust: 80 },
    { gold: 400,  book: 'guide',  books: 8,  dust: 100 },
    { gold: 1000, book: 'secret', books: 3,  dust: 120 },
    { gold: 2200, book: 'secret', books: 5,  dust: 150, scale: 1 },    // ⑲-9 7→10 은 주간 보스 비늘
    { gold: 4000, book: 'secret', books: 10, dust: 180, scale: 2 },
    { gold: 6500, book: 'secret', books: 14, dust: 220, scale: 2 }
  ];

  /* 깨달음 다섯 — ③ 이 스킬·해방 둘 다 +2. 칸 이름(C1_CD…C6_ATK)은 옛 자리 번호 그대로 두고 단만 옮겼다 */
  var CON_MAX = 5;
  var C1_CD = 0.85, C2_REACT = 1.2, C4_HP = 1.15, C6_SEC = 8, C6_ATK = 1.2;
  var CON_TEXT = [
    '원소 스킬 재사용 대기 -15%',
    '원소 반응 피해 +20%',
    '원소 스킬·해방 무예 +2',
    '최대 체력 +15%',
    '원소 해방 뒤 8초 공격 +20%'
  ];

  /* 얻는 곳 */
  var CHEST_MATS = {
    common:    { note: 1 },
    exquisite: { note: 2 },
    precious:  { guide: 2, knot: 1 },
    luxurious: { guide: 3, secret: 1, knot: 2 }
  };
  var ELITE_MATS = { note: 1 };                           // 방패 두른 원소 괴물 하나
  var SHRINE_MATS = { knot: 1 };                          // 탑 등급 하나마다

  /* ── 세이브 칸 ────────────────────────────────────────── */

  function mats() {
    var s = core.save;
    if (!s.talentMat || typeof s.talentMat !== 'object') { s.talentMat = {}; }
    for (var k in MATS) {
      if (Object.prototype.hasOwnProperty.call(MATS, k) && typeof s.talentMat[k] !== 'number') { s.talentMat[k] = 0; }
    }
    return s.talentMat;
  }
  function count(k) { var m = core.save.talentMat; return (m && m[k]) || 0; }

  /** 재료를 더한다 — { note: 1, knot: 2 } 꼴. 더한 것을 "📃 무예 쪽지 +1" 식 글로 돌려준다 */
  function addMats(bag) {
    if (!bag) { return ''; }
    var m = mats(), out = [], k;
    for (k in bag) {
      if (!Object.prototype.hasOwnProperty.call(bag, k) || !MATS[k] || !(bag[k] > 0)) { continue; }
      m[k] += bag[k];
      out.push(MATS[k].icon + ' ' + MATS[k].name + ' +' + bag[k]);
    }
    return out.join(' · ');
  }

  function rec(id) { return (core.save.heroes && core.save.heroes[id]) || null; }
  function rankOf(id) { var g = rec(id); return (g && g.rank) || 0; }

  /** 올려 둔 단계(자리 보너스 빼고) */
  function baseLevel(id, key) {
    var g = rec(id), f = fieldOf(key);
    var v = g && f ? g[f] : 0;
    return typeof v === 'number' && v >= 1 ? Math.min(MAX, Math.floor(v)) : 1;
  }
  function fieldOf(key) {
    for (var i = 0; i < KINDS.length; i++) { if (KINDS[i].key === key) { return KINDS[i].field; } }
    return null;
  }
  function con(id) {
    var g = rec(id), v = g ? g.con : 0;
    return typeof v === 'number' && v > 0 ? Math.min(CON_MAX, Math.floor(v)) : 0;
  }
  /** 싸움에 쓰는 단계 — 깨달음 3 이 스킬·해방에 +2 */
  function level(id, key) {
    var c = con(id), lv = baseLevel(id, key);
    if ((key === 's' || key === 'b') && c >= 3) { lv += BONUS; }
    return lv;
  }
  function cap(rank) { return CAP_BY_RANK[Math.max(0, Math.min(CAP_BY_RANK.length - 1, rank || 0))]; }
  function mulAt(lv) { return MUL[Math.max(1, Math.min(MUL.length, lv)) - 1]; }
  function mulOf(id, key) { return mulAt(level(id, key)); }
  function cost(lv) { return lv >= 1 && lv < MAX ? COST[lv - 1] : null; }

  /* ── 올리기 ───────────────────────────────────────────── */

  function upCheck(id, key) {
    if (!core.save.dex.heroes[id]) { return { ok: false, why: '미획득' }; }
    var f = fieldOf(key);
    if (!f) { return { ok: false, why: '없는 무예' }; }
    var lv = baseLevel(id, key);
    if (lv >= MAX) { return { ok: false, why: '최대 단계' }; }
    if (lv >= cap(rankOf(id))) { return { ok: false, why: '승급 ★' + nextRankFor(lv + 1) + ' 에 열림', cap: true }; }
    var c = cost(lv);
    if ((core.save.player.gold || 0) < c.gold) { return { ok: false, why: '금 부족', cost: c }; }
    if (count(c.book) < c.books) { return { ok: false, why: MATS[c.book].name + ' 부족', cost: c }; }
    if ((core.save.dust || 0) < c.dust) { return { ok: false, why: '단사 부족', cost: c }; }
    if (c.scale && count('scale') < c.scale) { return { ok: false, why: MATS.scale.name + ' 부족', cost: c }; }
    return { ok: true, cost: c };
  }
  /** 그 단계를 여는 가장 낮은 승급 */
  function nextRankFor(lv) {
    for (var r = 0; r < CAP_BY_RANK.length; r++) { if (CAP_BY_RANK[r] >= lv) { return r; } }
    return CAP_BY_RANK.length - 1;
  }

  function up(id, key) {
    var chk = upCheck(id, key);
    if (!chk.ok) { return false; }
    var c = chk.cost, g = global.DG.hero.ensure(id), f = fieldOf(key);
    core.save.player.gold -= c.gold;
    mats()[c.book] -= c.books;
    if (c.scale) { mats().scale -= c.scale; }
    core.save.dust -= c.dust;
    g[f] = baseLevel(id, key) + 1;
    var h = global.DG.data.find(id), k = kindOf(key);
    core.log('⚔️ ' + (h ? h.name : id) + ' ' + k.name + ' 무예 ' + g[f] + '단', 'good');
    core.emit('toast', k.icon + ' ' + (h ? h.name : id) + ' ' + k.name + ' ' + g[f] + '단 — 피해 ×' + mulOf(id, key).toFixed(3).replace(/0+$/, '').replace(/\.$/, ''));
    core.emit('talent:up', { id: id, key: key, lv: g[f] });
    core.emit('changed');
    core.persist();
    return true;
  }
  function kindOf(key) {
    for (var i = 0; i < KINDS.length; i++) { if (KINDS[i].key === key) { return KINDS[i]; } }
    return null;
  }

  /* ── 깨달음 ──────────────────────────────────────────── */

  function conCheck(id) {
    if (!core.save.dex.heroes[id]) { return { ok: false, why: '미획득' }; }
    if (con(id) >= CON_MAX) { return { ok: false, why: '모두 열림' }; }
    if (count('knot') < 1) { return { ok: false, why: '인연 매듭 부족' }; }
    return { ok: true };
  }
  function unlockCon(id) {
    if (!conCheck(id).ok) { return false; }
    var g = global.DG.hero.ensure(id);
    mats().knot -= 1;
    g.con = con(id) + 1;
    var h = global.DG.data.find(id);
    core.log('🌟 ' + (h ? h.name : id) + ' 깨달음 ' + g.con + ' — ' + CON_TEXT[g.con - 1], 'good');
    core.emit('toast', '🌟 ' + (h ? h.name : id) + ' 깨달음 ' + g.con + ' — ' + CON_TEXT[g.con - 1]);
    core.emit('talent:con', { id: id, con: g.con });
    core.emit('changed');
    core.persist();
    return true;
  }

  /**
   * 들판 전투가 한 사람을 세울 때 읽는 묶음(field-combat.js memberOf).
   * '_me'·도감 밖 id 는 기본값(단계 1·깨달음 0)이라 배율이 모두 1 이다.
   */
  function combatMods(id) {
    var c = con(id);
    return {
      tm: { n: mulOf(id, 'n'), s: mulOf(id, 's'), b: mulOf(id, 'b') },
      con: c,
      cdMul: c >= 1 ? C1_CD : 1,
      reactMul: c >= 2 ? C2_REACT : 1,
      hpMul: c >= 4 ? C4_HP : 1,
      c6: c >= 5
    };
  }
  /** 피해 출처 → 무예 갈래 (반응 조각·시험용 'test' 는 안 탄다) */
  function keyOfSrc(src) {
    if (src === 'basic' || src === 'heavy') { return 'n'; }
    if (src === 'skill' || src === 'zone') { return 's'; }
    if (src === 'burst') { return 'b'; }
    return null;
  }

  /* ── 얻는 곳 ──────────────────────────────────────────── */

  function onChest(grade) { return addMats(CHEST_MATS[grade]); }
  function onElite() { return addMats(ELITE_MATS); }
  function onShrine(up_) {
    if (!(up_ > 0)) { return ''; }
    return addMats({ knot: SHRINE_MATS.knot * up_ });
  }

  global.DG = global.DG || {};
  global.DG.talent = {
    KINDS: KINDS, MAX: MAX, BONUS: BONUS, CAP_BY_RANK: CAP_BY_RANK, MUL: MUL, MATS: MATS, COST: COST,
    CON_MAX: CON_MAX, CON_TEXT: CON_TEXT, C1_CD: C1_CD, C2_REACT: C2_REACT, C4_HP: C4_HP, C6_SEC: C6_SEC, C6_ATK: C6_ATK,
    CHEST_MATS: CHEST_MATS, ELITE_MATS: ELITE_MATS,
    mats: mats, count: count, addMats: addMats,
    baseLevel: baseLevel, level: level, con: con, cap: cap, mulAt: mulAt, mulOf: mulOf, cost: cost, nextRankFor: nextRankFor,
    upCheck: upCheck, up: up, conCheck: conCheck, unlockCon: unlockCon,
    combatMods: combatMods, keyOfSrc: keyOfSrc,
    onChest: onChest, onElite: onElite, onShrine: onShrine
  };
})(window);
