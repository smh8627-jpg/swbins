/**
 * 비결(秘訣) — 무예 하나의 쓰임을 바꾼다 (PLAN §5.9, 2026-09-24 사용자 선택 "빌드 룬")
 * ---------------------------------------------------------------
 * 원작(3편)의 스킬 룬 자리다. 이 판에는 이미 소켓에 끼우는 '룬'(원작 2편 쪽,
 * data-gem.js)이 있어 이름이 겹치지 않게 **비결**이라 부른다.
 *
 * 무예 120 은 모양(shape) 열 가지에 값을 끼운 것이라 "다 같은 축"이었다(PLAN §4 D).
 * 비결은 모양을 가리지 않는 **맞바꿈** 다섯이다 — 하나를 고르면 다른 것을 잃는다.
 *
 *   🔥 분노(憤怒)  1단  위력 ×1.45 · 기력 ×1.4             크게 한 방
 *   ❄️ 한기(寒氣)  2단  결이 빙(冰)으로(느려진다) · 위력 ×0.9 · 지속형은 지속 ×1.4
 *   🌀 확산(擴散)  3단  범위 ×1.35 · 발수 +2 · 연환 +2 · 분신 +1 · 위력 ×0.8
 *   ⚡ 신속(迅速)  4단  재냉각 ×0.5 · 위력 ×0.7              자주 쓴다
 *   🩸 흡혈(吸血)  5단  쓰면 3초 동안 준 피해의 12% 흡수 · 위력 ×0.9
 *
 * 무예 단수가 오를 때마다 비결이 하나씩 열린다(원작의 레벨 해금 자리) — 점수를 몰아
 * 줄 이유가 하나 더 생긴다. 한 무예에 하나만 건다. 세이브 `save.secrets[인물][무예] = 비결`.
 *
 * `modify(sk, key)` 는 순수 함수 — 무예를 **복사해** 바꾼 것과 배수를 돌려준다.
 */
(function (global) {
  'use strict';

  function core() { return global.DG.core; }

  var SECRETS = [
    { key: 'fury',   name: '분노', hanja: '憤怒', emoji: '🔥', rank: 1, dmg: 1.45, cost: 1.4,
      desc: '위력 ×1.45 · 기력 ×1.4' },
    { key: 'frost',  name: '한기', hanja: '寒氣', emoji: '❄️', rank: 2, dmg: 0.9, el: 'cold', sec: 1.4,
      desc: '결이 빙(冰)으로 — 맞은 적이 느려진다 · 위력 ×0.9 · 지속형은 지속 ×1.4' },
    { key: 'spread', name: '확산', hanja: '擴散', emoji: '🌀', rank: 3, dmg: 0.8, r: 1.35, extra: 2,
      desc: '범위 ×1.35 · 발수 +2 · 연환 +2 · 분신 +1 · 위력 ×0.8' },
    { key: 'haste',  name: '신속', hanja: '迅速', emoji: '⚡', rank: 4, dmg: 0.7, cd: 0.5,
      desc: '재냉각 ×0.5 · 위력 ×0.7' },
    { key: 'leech',  name: '흡혈', hanja: '吸血', emoji: '🩸', rank: 5, dmg: 0.9, drain: 12, drainSec: 3,
      desc: '쓰면 3초 동안 준 피해의 12% 를 흡수 · 위력 ×0.9' }
  ];
  var BY = {};
  SECRETS.forEach(function (s) { BY[s.key] = s; });

  /** 이 단수에서 열린 비결 */
  function unlocked(rank) { return SECRETS.filter(function (s) { return rank >= s.rank; }); }

  /** 결(원소)을 받는 모양인가 — curse·heal·buff·summon 은 el 을 안 읽는다 */
  var DMG_SHAPES = { swing: 1, nova: 1, bolt: 1, dash: 1, chain: 1 };
  var SEC_SHAPES = { buff: 1, curse: 1, summon: 1 };

  /**
   * 비결을 건 무예 — 원본은 안 건드린다.
   * @returns {{sk:object, dmg:number, cost:number, cd:number, drain:number, drainSec:number, key:string|null}}
   */
  function modify(sk, key) {
    var S = key && BY[key];
    var out = { sk: sk, dmg: 1, cost: 1, cd: 1, drain: 0, drainSec: 0, key: null };
    if (!S || !sk || sk.shape === 'passive') { return out; }
    var c = {}, k;
    for (k in sk) { if (Object.prototype.hasOwnProperty.call(sk, k)) { c[k] = sk[k]; } }
    out.key = S.key;
    out.dmg = S.dmg || 1;
    out.cost = S.cost || 1;
    out.cd = S.cd || 1;
    if (S.el && DMG_SHAPES[sk.shape]) { c.el = S.el; }
    if (S.sec && SEC_SHAPES[sk.shape]) { c.sec = (sk.sec || (sk.shape === 'summon' ? 12 : (sk.shape === 'curse' ? 5 : 6))) * S.sec; }
    if (S.r) {
      if (sk.shape === 'swing') { c.r = (sk.r || 2.0) * S.r; }
      else if (sk.shape === 'nova' || sk.shape === 'curse') { c.r = (sk.r || 130) * S.r; }
      else if (sk.shape === 'chain') { c.r = (sk.r || 260) * S.r; c.hops = (sk.hops || 3) + S.extra; }
      else if (sk.shape === 'bolt') { c.shots = (sk.shots || 1) + S.extra; c.spread = sk.spread || 0.28; }
      else if (sk.shape === 'dash') { c.far = (sk.far || 1) * S.r; }
      else if (sk.shape === 'summon') { out.summonAdd = 1; }
    }
    if (S.drain) { out.drain = S.drain; out.drainSec = S.drainSec; }
    out.sk = c;
    return out;
  }

  /* ── 세이브 ───────────────────────────────────────────── */
  function st() {
    var s = core().save;
    if (!s.secrets || typeof s.secrets !== 'object') { s.secrets = {}; }
    return s.secrets;
  }
  /** 걸어 둔 비결 — 단수가 모자라 잠긴 것이면(환원 뒤) 없는 것으로 본다 */
  function of(heroId, skKey) {
    var m = st()[heroId], key = m && m[skKey];
    if (!key || !BY[key]) { return null; }
    var SK = global.DG.skill, rank = SK ? SK.rankOf(heroId, skKey) : 5;
    return rank >= BY[key].rank ? key : null;
  }
  /** 건다(같은 것을 다시 누르면 푼다) */
  function set(heroId, skKey, key) {
    if (!heroId || !skKey) { return { ok: false, reason: 'arg' }; }
    var SK = global.DG.skill, rank = SK ? SK.rankOf(heroId, skKey) : 0;
    var all = st();
    if (!all[heroId]) { all[heroId] = {}; }
    if (!key || all[heroId][skKey] === key) { delete all[heroId][skKey]; core().emit('changed'); return { ok: true, key: null }; }
    if (!BY[key]) { return { ok: false, reason: 'key' }; }
    if (rank < BY[key].rank) { return { ok: false, reason: 'rank', need: BY[key].rank }; }
    all[heroId][skKey] = key;
    core().emit('changed');
    return { ok: true, key: key };
  }

  /* ── 비전(秘傳) — 비결을 키우는 전설 장비 (PLAN §5.10) ─────────────
   * 원작 3편의 전설 능력·세트 자리다. **전설(4) 등급 물건 하나에 비전 하나**가
   * 붙는다 — 다섯 비결 가운데 하나. 선두가 그 물건을 입고 있으면 **그 비결을 건
   * 무예**의 위력이 ×1.6(부르기 모양은 수 +1). 같은 비전 두 점은 겹치지 않는다
   * (원작 전설 능력도 안 겹친다) — 다른 비전 둘을 입어 빌드를 두 갈래로 키운다.
   *
   * 무엇이 붙는지는 굴리지 않고 **물건에서 읽는다**(RNG 순번 함정, PLAN §2.3):
   * 고유는 고유 이름(정해진 물건이라 늘 같은 비전), 나머지는 uid 의 해시.
   * `it.lore` 가 적혀 있으면 그것을 쓴다(어드민·진단이 직접 지정). 세이브 스키마는 그대로.
   * 부서진 것·미확인은 안 센다. */
  var LORE_TIER = 4, LORE_MUL = 1.6;
  var LORE_NAME = { fury: '노화(怒火)', frost: '빙혼(氷魂)', spread: '만상(萬象)', haste: '섬광(閃光)', leech: '혈해(血海)' };

  function strHash(s) {
    var h = 0, i;
    s = String(s || '');
    for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) % 65521; }
    return h;
  }

  /** 이 물건의 비전 — 없으면 null */
  function loreOf(it) {
    if (!it || it.unid || it.tier !== LORE_TIER) { return null; }
    if (it.lore && BY[it.lore]) { return it.lore; }
    var i = Math.floor(core().hash2(strHash(it.uniq || it.uid), 5510) * SECRETS.length);
    return SECRETS[Math.min(SECRETS.length - 1, i)].key;
  }

  /** 인물이 입은 것 가운데 이 비결을 키우는 비전이 있으면 ×1.6, 없으면 1 */
  function boostOf(heroId, key) {
    var s = core().save, eq = s.gear && s.gear.equip && s.gear.equip[heroId], IT = global.DG.item, k;
    if (!key || !eq) { return 1; }
    for (k in eq) {
      if (!Object.prototype.hasOwnProperty.call(eq, k) || !eq[k]) { continue; }
      if (IT && IT.isBroken && IT.isBroken(eq[k])) { continue; }
      if (loreOf(eq[k]) === key) { return LORE_MUL; }
    }
    return 1;
  }

  /** 인물이 입어서 켜진 비전들 { 비결: true } */
  function activeLores(heroId) {
    var out = {};
    SECRETS.forEach(function (S) { if (boostOf(heroId, S.key) > 1) { out[S.key] = true; } });
    return out;
  }

  /** 설명 한 줄 — 비전이 없으면 '' */
  function loreLine(it) {
    var k = loreOf(it);
    if (!k) { return ''; }
    return '📜 비전 「' + LORE_NAME[k] + '」 — ' + BY[k].emoji + BY[k].name + ' 비결을 건 무예 위력 ×' + LORE_MUL;
  }

  global.DG = global.DG || {};
  global.DG.secret = {
    SECRETS: SECRETS, byKey: function (k) { return BY[k] || null; },
    unlocked: unlocked, modify: modify, of: of, set: set,
    LORE_MUL: LORE_MUL, LORE_NAME: LORE_NAME,
    loreOf: loreOf, boostOf: boostOf, activeLores: activeLores, loreLine: loreLine
  };
})(window);
