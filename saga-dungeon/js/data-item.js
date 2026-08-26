/**
 * 장비 데이터 — 등급 · 기본 종류 · 접사(옵션)
 * ---------------------------------------------------------------
 * 디아블로식으로 "같은 칼인데 옵션이 다르다" 를 만들기 위한 표.
 * 아이템 하나는 [기본 종류] + [등급] + [접사 0~4개] 로 조립된다.
 *
 *   슬롯   weapon(무기) · armor(갑주) · charm(부적)
 *   등급   0 상품 → 4 전설. 높을수록 접사가 많고 수치가 크다
 *   접사   flat  : 능력치를 그만큼 더한다 (무력 +12)
 *          pct   : 장착한 인물의 능력치를 % 올린다 (능력치 +6%)
 *          world : 부대에 장착돼 있으면 전역 효과가 된다 (전리품 +8%)
 *
 * 종류를 늘릴 때는 BASES / AFFIXES 에 한 줄만 넣는다. 생성기(item.js)는 안 고친다.
 */
(function (global) {
  'use strict';

  /**
   * 등급 — label 은 화면 표기, mul 은 수치 배율, affix 는 접사 개수.
   *
   * **색은 원작(디아블로2)의 등급색 그대로다.**
   *   흰 → 파랑 → 노랑 → 초록 → 금갈색
   *   (일반 · 마법 · 희귀 · 세트 · 유니크)
   * 원작을 해 본 사람은 바닥에 떨어진 이름의 **색만 보고** 주울지 말지를 정한다.
   * 그 반사신경을 그대로 옮기려고 색을 맞췄다 — 수치·이름은 이 판의 것이다.
   * 색을 여기서 고치면 화면 전체(바닥 이름표·가방 격자·상세)가 같이 따라온다.
   */
  var TIERS = [
    { key: 0, name: '상품', hanja: '常品', color: '#d0c8b8', mul: 1.00, affix: 0, weight: 100 },
    { key: 1, name: '양품', hanja: '良品', color: '#6f6fff', mul: 1.18, affix: 1, weight: 52 },
    { key: 2, name: '명품', hanja: '名品', color: '#ffff64', mul: 1.40, affix: 2, weight: 22 },
    { key: 3, name: '보물', hanja: '寶物', color: '#00c000', mul: 1.70, affix: 3, weight: 7 },
    { key: 4, name: '전설', hanja: '傳說', color: '#c7a76c', mul: 2.15, affix: 4, weight: 1.6 }
  ];

  /**
   * 기본 종류. main 은 주 능력치, base 는 아이템 등급 1 기준 수치.
   * era 는 표기용(고증보다 분위기).
   */
  var BASES = [
    // ── 무기 ──────────────────────────────────────────────
    { key: 'w_hwando',   slot: 'weapon', name: '환도',       main: 'might',   base: 9,  look: 'sword' },
    { key: 'w_pyeongon', slot: 'weapon', name: '편곤',       main: 'might',   base: 10, look: 'club' },
    { key: 'w_changj',   slot: 'weapon', name: '장창',       main: 'might',   base: 11, look: 'spear' },
    { key: 'w_wolto',    slot: 'weapon', name: '월도',       main: 'might',   base: 12, look: 'guandao' },
    { key: 'w_gakgung',  slot: 'weapon', name: '각궁',       main: 'might',   base: 8,  look: 'bow' },
    { key: 'w_bugae',    slot: 'weapon', name: '부월',       main: 'might',   base: 11, look: 'axe' },
    { key: 'w_seonchae', slot: 'weapon', name: '선채',       main: 'wisdom',  base: 9,  look: 'fan' },
    { key: 'w_jukjang',  slot: 'weapon', name: '죽장',       main: 'wisdom',  base: 8,  look: 'staff' },
    { key: 'w_bilbut',   slot: 'weapon', name: '필묵',       main: 'wisdom',  base: 7,  look: 'brush' },
    { key: 'w_byeongseo',slot: 'weapon', name: '병서',       main: 'command', base: 8,  look: 'scroll' },

    // ── 갑주 ──────────────────────────────────────────────
    { key: 'a_jichap',   slot: 'armor',  name: '지갑',       main: 'command', base: 8 },
    { key: 'a_pigap',    slot: 'armor',  name: '피갑',       main: 'command', base: 9 },
    { key: 'a_chalgap',  slot: 'armor',  name: '찰갑',       main: 'command', base: 11 },
    { key: 'a_dujeong',  slot: 'armor',  name: '두정갑',     main: 'command', base: 12 },
    { key: 'a_myeongap', slot: 'armor',  name: '면갑',       main: 'wisdom',  base: 8 },
    { key: 'a_dopo',     slot: 'armor',  name: '도포',       main: 'wisdom',  base: 9 },
    { key: 'a_cheollip', slot: 'armor',  name: '철립',       main: 'might',   base: 7 },

    // ── 부적 ──────────────────────────────────────────────
    { key: 'c_hopae',    slot: 'charm',  name: '호패',       main: 'command', base: 5 },
    { key: 'c_yeombul',  slot: 'charm',  name: '염주',       main: 'wisdom',  base: 6 },
    { key: 'c_okgae',    slot: 'charm',  name: '옥가락지',   main: 'wisdom',  base: 7 },
    { key: 'c_hobu',     slot: 'charm',  name: '호부',       main: 'might',   base: 6 },
    { key: 'c_dokkaebi', slot: 'charm',  name: '도깨비방울', main: 'might',   base: 7 },
    { key: 'c_gyeong',   slot: 'charm',  name: '청동경',     main: 'command', base: 7 }
  ];

  /**
   * 접사 — 아이템 이름 앞뒤에 붙고 수치를 준다.
   *   kind  'flat' | 'pct' | 'world'
   *   stat  flat/pct 가 건드리는 능력치 ('all' 이면 셋 다)
   *   eff   world 접사가 주는 효과 키 (core.effect 와 같은 키)
   *   lo~hi 아이템 등급 1 기준 수치 범위 (ilvl 로 자란다)
   *   pre   이름 앞에 붙는 말 (없으면 뒤에 붙는 post 를 쓴다)
   */
  var AFFIXES = [
    { key: 'might',    kind: 'flat',  stat: 'might',   lo: 4, hi: 9,  pre: '용맹한',   label: '무력' },
    { key: 'wisdom',   kind: 'flat',  stat: 'wisdom',  lo: 4, hi: 9,  pre: '지혜로운', label: '지력' },
    { key: 'command',  kind: 'flat',  stat: 'command', lo: 4, hi: 9,  pre: '위엄있는', label: '통솔' },
    { key: 'allstat',  kind: 'flat',  stat: 'all',     lo: 2, hi: 5,  pre: '완전한',   label: '전 능력치' },
    { key: 'mightPct', kind: 'pct',   stat: 'might',   lo: 3, hi: 8,  pre: '패도의',   label: '무력' },
    { key: 'wisdomPct',kind: 'pct',   stat: 'wisdom',  lo: 3, hi: 8,  pre: '현묘한',   label: '지력' },
    { key: 'allPct',   kind: 'pct',   stat: 'all',     lo: 2, hi: 6,  pre: '천명의',   label: '전 능력치' },
    { key: 'loot',     kind: 'world', eff: 'lootPct',  lo: 4, hi: 11, post: '약탈',    label: '전리품' },
    { key: 'gold',     kind: 'world', eff: 'goldPct',  lo: 4, hi: 12, post: '치부',    label: '금 획득' },
    { key: 'exp',      kind: 'world', eff: 'expPct',   lo: 3, hi: 9,  post: '수학',    label: '경험치' },
    { key: 'atk',      kind: 'world', eff: 'atkPct',   lo: 2, hi: 6,  post: '전열',    label: '부대 공격력' },
    { key: 'hp',       kind: 'world', eff: 'hpPct',    lo: 2, hi: 7,  post: '수성',    label: '부대 체력' },
    { key: 'find',     kind: 'world', eff: 'findPct',  lo: 5, hi: 14, post: '탐색',    label: '좋은 물건 찾기' },
    { key: 'crit',     kind: 'world', eff: 'critPct',  lo: 3, hi: 8,  post: '일격',    label: '치명타' }
  ];

  function tier(k) { return TIERS[global.DG.core.clamp(k, 0, TIERS.length - 1)]; }

  function baseByKey(k) {
    for (var i = 0; i < BASES.length; i++) { if (BASES[i].key === k) { return BASES[i]; } }
    return null;
  }

  function affixByKey(k) {
    for (var i = 0; i < AFFIXES.length; i++) { if (AFFIXES[i].key === k) { return AFFIXES[i]; } }
    return null;
  }

  var SLOT_KOR = { weapon: '무기', armor: '갑주', charm: '부적' };

  global.DG = global.DG || {};
  global.DG.itemData = {
    TIERS: TIERS, BASES: BASES, AFFIXES: AFFIXES, SLOTS: ['weapon', 'armor', 'charm'],
    slotKor: function (s) { return SLOT_KOR[s] || s; },
    tier: tier, baseByKey: baseByKey, affixByKey: affixByKey
  };
})(window);
