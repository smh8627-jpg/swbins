/**
 * 절차적 인물·펫 생성기 — 한국 권역 전용, saga-go에만 있다.
 * ---------------------------------------------------------------
 * `HEROES`/`PETS`(105+105, `js/data.js`, 다섯 판 공유)는 손으로 공들인
 * "이름 있는" 앵커다. 사용자가 원하는 "만 명" 규모는 이 105명을 늘리는
 * 게 아니라 — 그건 한 명씩 다시 손으로 쓸 수 없다 — **권역별로 끝없이
 * 뽑아낼 수 있는 흔한 인물·펫 풀**을 절차적으로 여는 쪽으로 푼다.
 *
 * 결정론: (regionCode, rarity, index) 세 값이 같으면 항상 같은 사람이
 * 나온다(`idSeed` — sprite.js의 같은 이름 함수와 같은 계산이다, 하지만
 * 그림 쪽 코드와 얽히지 않게 여기 따로 둔다). id 자체에 그 세 값이 그대로
 * 들어 있어(`kr_<region>_<rarity>_<index>`) 세이브에는 id 문자열만 있으면
 * 되고, 나중에 `find(id)`로 언제든 같은 인물을 되살릴 수 있다 — 정적
 * 배열에 저장해 두지 않아도 된다(만 단위로 늘어도 메모리에 안 쌓인다).
 *
 * 실명 걱정이 구조적으로 없다: 성씨·이름자 풀에서 조합해 만드므로 애초에
 * 실존 인물과 겹칠 수가 없다(가명 정책, 루트 CLAUDE.md). BIOS 성격의
 * 소개 문구도 특정 실제 사건명 없이 권역·직역 낱말만 꽂는 템플릿이다.
 *
 * 이 풀은 **도감(dex)에 넣지 않는다** — `js/data.js`의 정적 `HEROES`/`PETS`
 * 배열에 추가하지 않으므로 `ui.js`의 도감 그리드(dexGrid)에는 기존 105+105
 * 만 그대로 뜬다. 절차적 인물은 "만나서 함께 걷는" 동행 풀일 뿐, 수집
 * 목표가 아니다 — 도감을 만 칸으로 불리면 오히려 못 쓰게 된다.
 */
(function (global) {
  'use strict';

  /** sprite.js의 idSeed와 같은 계산(문자열 → 고정 정수). 그림 코드와 안
   *  얽히게 여기 따로 둔다 — 서로 다른 목적의 시드가 우연히 같은 값을
   *  내도 상관없다(용도가 다르면 같은 시드라도 다른 필드를 뽑는다). */
  function idSeed(s) {
    var h = 0; s = s || 'x';
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff; }
    return h;
  }
  function pick(seed, shift, arr) { return arr[(seed >>> shift) % arr.length]; }

  /* ── 이름 재료 ────────────────────────────────────────────
   * 성씨는 흔한 한국 성씨(특정 개인이 아니라 수백만이 함께 쓰는 그냥
   * 성씨라 가명 정책과 무관) + 이름자 두 글자를 권역 성향(tags)에 맞춰
   * 고른다. 조합 수만으로도(성씨 30 × 앞자 18 × 뒷자 18 ≈ 9,700, 권역
   * 9곳 × 등급별 변주까지 합치면 "만 단위"를 조합만으로 실질적으로 채운다.
   */
  var SURNAMES = [
    ['김', '金'], ['이', '李'], ['박', '朴'], ['최', '崔'], ['정', '鄭'], ['강', '姜'],
    ['조', '趙'], ['윤', '尹'], ['장', '張'], ['임', '林'], ['한', '韓'], ['오', '吳'],
    ['서', '徐'], ['신', '申'], ['권', '權'], ['황', '黃'], ['안', '安'], ['송', '宋'],
    ['전', '全'], ['홍', '洪'], ['유', '柳'], ['고', '高'], ['문', '文'], ['양', '梁'],
    ['손', '孫'], ['배', '裵'], ['백', '白'], ['허', '許'], ['남', '南'], ['심', '沈']
  ];

  /** [글자, 한자, 성향표] — 성향표는 REGIONS의 tags와 겹치는 게 있으면
   *  그 권역에서 뽑힐 확률이 올라간다(가중, 배제는 아니다 — 완전히 다른
   *  권역 성향의 글자도 드물게는 섞여야 사람 이름 같다). */
  var SYLLABLES = [
    ['철', '鐵', ['martial']], ['궁', '弓', ['martial']], ['검', '劍', ['martial']],
    ['진', '陣', ['martial', 'frontier']], ['호', '虎', ['martial', 'frontier']],
    ['웅', '雄', ['martial']], ['무', '武', ['martial']], ['벽', '壁', ['martial']],
    ['북', '北', ['frontier']], ['새', '塞', ['frontier']], ['관', '關', ['frontier']],
    ['성', '城', ['frontier', 'court']], ['랑', '狼', ['frontier']], ['삭', '朔', ['frontier']],
    ['한', '寒', ['frontier']], ['산', '山', ['nature']], ['계', '溪', ['nature']],
    ['운', '雲', ['nature', 'scholar']], ['학', '鶴', ['nature', 'scholar']],
    ['송', '松', ['nature']], ['연', '淵', ['nature', 'scholar']], ['월', '月', ['nature', 'art']],
    ['청', '靑', ['nature', 'coast']], ['백', '白', ['nature']], ['현', '玄', ['scholar']],
    ['문', '文', ['scholar']], ['경', '敬', ['scholar', 'court']], ['서', '書', ['scholar']],
    ['도', '道', ['scholar']], ['헌', '軒', ['scholar', 'court']], ['은', '隱', ['scholar']],
    ['담', '淡', ['scholar']], ['명', '明', ['scholar', 'court']], ['화', '花', ['art']],
    ['채', '彩', ['art']], ['율', '律', ['art']], ['향', '香', ['art']], ['란', '蘭', ['art']],
    ['영', '影', ['art']], ['몽', '夢', ['art']], ['아', '雅', ['art']], ['홍', '紅', ['art']],
    ['경', '京', ['court']], ['궁', '宮', ['court']], ['인', '仁', ['court']],
    ['형', '衡', ['court']], ['준', '俊', ['court', 'martial']], ['강', '綱', ['court']],
    ['균', '均', ['court']], ['정', '正', ['court']], ['해', '海', ['coast', 'sea']],
    ['파', '波', ['coast', 'sea']], ['진', '津', ['coast']], ['포', '浦', ['coast']],
    ['조', '潮', ['coast', 'sea']], ['만', '灣', ['coast']], ['담', '潭', ['coast', 'nature']],
    ['탐', '耽', ['sea']], ['라', '羅', ['sea']], ['도', '島', ['sea']], ['록', '綠', ['sea', 'nature']]
  ];

  var FACTION_SUFFIX = ['의병대', '상단', '서원', '향군', '표국', '수비대', '관아', '향약계', '어촌계', '산성'];

  var TRAITS = ['might', 'wisdom', 'virtue'];

  var QUOTE_TPL = {
    might: ['{f}의 이름을 걸고, 뒤로 물러서진 않겠소.', '이 팔 하나로 {region} 땅은 지켜내겠소.', '싸움이라면 {f}에서 뒤진 적이 없소.'],
    wisdom: ['{region}의 셈은 제게 맡기시지요.', '{f}에서 익힌 글로 길을 열어 보이겠습니다.', '서두르지 않아도 답은 나옵니다.'],
    virtue: ['{region} 사람들과 함께라면 무엇이든 하겠습니다.', '{f}의 신의만은 저버리지 않습니다.', '작은 힘이나마 보태겠습니다.']
  };
  var BIO_TPL = {
    might: ['{f} 출신. 궂은 싸움터를 여럿 넘겼다는 소문이 도는 사람이다.',
      '{f}에서 이름을 얻은 무인. 힘보다 뚝심으로 버틴다고들 한다.'],
    wisdom: ['{f}에서 글과 셈을 익혔다. 마을의 크고 작은 다툼을 말로 풀어낸다.',
      '{f} 출신의 셈에 밝은 이. 흉년에도 곳간을 축내지 않았다는 이야기가 전해진다.'],
    virtue: ['{f}에서 나고 자랐다. 이웃을 먼저 챙기는 성정으로 마을에서 신망이 두텁다.',
      '{f}의 궂은일을 도맡아 왔다는 사람. 크게 나서지 않아도 다들 그 이름을 안다.']
  };
  var EMOJI = { might: ['⚔️', '🛡️', '🏹', '🪓'], wisdom: ['📜', '🖋️', '🧮', '📖'], virtue: ['🌾', '🕊️', '🤝', '🌿'] };

  /** 등급별 능력치 기준(대략 — HEROES는 3~5만 쓰므로 1~2는 이 풀 전용이다) */
  var STAT_BASE = {
    1: { lo: 15, hi: 45 },
    2: { lo: 30, hi: 60 },
    3: { lo: 45, hi: 75 },
    4: { lo: 60, hi: 88 },
    5: { lo: 75, hi: 98 }
  };

  function weightedSyllable(seed, shift, tags) {
    /* 성향이 맞는 글자를 우선 후보로 삼되(가중), 후보가 모자라면 전체에서 고른다 */
    var favored = SYLLABLES.filter(function (s) {
      return s[2].some(function (t) { return tags.indexOf(t) >= 0; });
    });
    var pool = favored.length >= 6 ? favored : SYLLABLES;
    return pick(seed, shift, pool);
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /** regionCode + rarity(1~5) + index(임의의 정수) → HEROES와 같은 스키마 */
  function hero(regionCode, rarity, index) {
    var RK = global.DG.regionKr;
    var region = RK ? RK.byCode(regionCode) : null;
    if (!region) { return null; }
    rarity = clamp(rarity | 0, 1, 5);
    index = index >>> 0;
    var id = 'kr_' + regionCode + '_' + rarity + '_' + index;
    var seed = idSeed(id);

    var sur = pick(seed, 1, SURNAMES);
    var a = weightedSyllable(seed, 5, region.tags);
    var b = weightedSyllable(seed, 11, region.tags);
    if (b[0] === a[0]) { b = SYLLABLES[(SYLLABLES.indexOf(b) + 1) % SYLLABLES.length]; }
    var trait = TRAITS[(seed >>> 17) % TRAITS.length];
    var base = STAT_BASE[rarity];
    var span = base.hi - base.lo;
    function stat(shift, biasKey) {
      var v = base.lo + ((seed >>> shift) % (span + 1)) + (region.statBias[biasKey] || 0);
      return clamp(Math.round(v), 5, 100);
    }
    var stats = { might: stat(2, 'might'), wisdom: stat(9, 'wisdom'), command: stat(15, 'command') };
    /* 기질에 맞는 능력치를 조금 더 세워 등용 시 어필이 겉돈다는 인상을 줄인다 */
    if (trait === 'might') { stats.might = clamp(stats.might + 10, 5, 100); }
    if (trait === 'wisdom') { stats.wisdom = clamp(stats.wisdom + 10, 5, 100); }
    if (trait === 'virtue') { stats.command = clamp(stats.command + 6, 5, 100); }

    var faction = region.name + ' ' + pick(seed, 20, FACTION_SUFFIX);
    var quote = pick(seed, 23, QUOTE_TPL[trait]).replace(/\{region\}/g, region.name).replace(/\{f\}/g, faction);
    var bio = pick(seed, 26, BIO_TPL[trait]).replace(/\{region\}/g, region.name).replace(/\{f\}/g, faction);

    return {
      id: id,
      name: sur[0] + a[0] + b[0],
      hanja: sur[1] + a[1] + b[1],
      era: '한국사',
      faction: faction,
      rarity: rarity,
      trait: trait,
      stats: stats,
      emoji: pick(seed, 29, EMOJI[trait]),
      quote: quote,
      _bio: bio,           // BIOS 물처럼 상세 화면에 쓸 한 줄(가명 정책상 실제 사건 없음)
      _generated: true,
      _region: region.code
    };
  }

  var PET_NAME_A = ['들', '산', '강', '갯', '숲', '별', '바람', '안개', '이끼', '자갈'];
  var PET_NAME_B = ['짐승', '길이', '눈이', '발이', '꼬리', '무리', '벗'];
  var PET_DESC_TPL = [
    '{region} 어름에서 흔히 보이는 짐승. 사람을 크게 경계하지 않는다.',
    '{region} 사람들이 오래전부터 곁에 두고 길렀다는 짐승.',
    '{region} 산길·물가를 오가며 산다는 이야기가 전해진다.'
  ];
  var PET_BONUS_STAT = ['might', 'wisdom', 'command'];

  /** regionCode + rarity(1~5) + index → PETS와 같은 스키마(kind는 항상 beast —
   *  신수(divine)는 이 풀 밖, 손으로 고른 11종 그대로 둔다) */
  function pet(regionCode, rarity, index) {
    var RK = global.DG.regionKr;
    var region = RK ? RK.byCode(regionCode) : null;
    if (!region) { return null; }
    rarity = clamp(rarity | 0, 1, 5);
    index = index >>> 0;
    var id = 'ptgen_' + regionCode + '_' + rarity + '_' + index;
    var seed = idSeed(id);

    var name = pick(seed, 1, PET_NAME_A) + pick(seed, 6, PET_NAME_B);
    var desc = pick(seed, 10, PET_DESC_TPL).replace(/\{region\}/g, region.name);
    var statKey = PET_BONUS_STAT[(seed >>> 13) % PET_BONUS_STAT.length];
    var base = STAT_BASE[rarity];
    var value = clamp(Math.round(2 + (base.lo + (seed >>> 4) % (base.hi - base.lo)) / 12), 2, 15);
    var catchBase = clamp(0.72 - rarity * 0.09, 0.16, 0.72);

    return {
      id: id, name: name, kind: 'beast', rarity: rarity,
      emoji: pick(seed, 18, ['🐾', '🦊', '🐦', '🐟', '🐐']),
      catchBase: catchBase,
      bonus: { stat: statKey, value: value },
      desc: desc,
      _generated: true,
      _region: region.code
    };
  }

  /** id 문자열만으로 되살린다(세이브에는 id만 있으면 된다) */
  function find(id) {
    if (typeof id !== 'string') { return null; }
    var m = /^kr_([a-z]+)_(\d)_(\d+)$/.exec(id);
    if (m) { return hero(m[1], +m[2], +m[3]); }
    m = /^ptgen_([a-z]+)_(\d)_(\d+)$/.exec(id);
    if (m) { return pet(m[1], +m[2], +m[3]); }
    return null;
  }

  /** BIOS와 같은 자리에서 쓸 한 줄 — 정적 BIOS[id]에는 없으므로 이걸로 갈음한다 */
  function bio(id) {
    var h = find(id);
    return (h && h._bio) || '';
  }

  global.DG = global.DG || {};
  global.DG.genchar = { hero: hero, pet: pet, find: find, bio: bio };
})(window);
