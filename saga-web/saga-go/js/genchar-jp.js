/**
 * 절차적 인물·펫 생성기 — 일본 권역 전용, saga-go에만 있다.
 * ---------------------------------------------------------------
 * `js/genchar.js`(한국 팔도)의 둘째 확장이다 — 구조·id 체계·등급·경영
 * 로직은 그대로 베끼고, 이름 재료·문구만 일본 권역(`js/region-jp.js`)에
 * 맞게 새로 짰다. 왜 파일을 합치지 않았는지: 두 나라의 이름 재료·문구가
 * 전혀 다르고, 이렇게 나눠 두면 나중에 셋째 나라를 또 늘릴 때도 이
 * 파일이 아니라 이 파일의 "짝"을 하나 더 얹으면 된다(다섯 판 공용
 * 파일과는 성격이 다르다 — 이건 saga-go 혼자 쓰는 지역 확장이다).
 *
 * **가명 정책과 무관하다** — 여기서 나오는 사람은 "역사 인물의 가명"이
 * 아니라 애초에 실존 인물이 아닌 절차적 범인(凡人)이다. 다만 표시 이름은
 * 실제 일본 인명을 흉내 낸 한글 표기(성+이름, 예: "사토 켄이치")로
 * 짓는다 — `js/data.js`의 `jp_*` HEROES(실제 역사 인물의 가명)와는 달리
 * 이쪽은 "역사 인물처럼 보이면 안 되는" 자리가 아니라 오히려 평범한
 * 동네 사람으로 보여야 하는 자리라서, 성씨(수백만이 함께 쓰는 흔한 성)로
 * 조합한 사실적인 이름이 목적에 맞는다(한국 쪽 `genchar.js`가 흔한
 * 한국 성씨로 사실적인 한글 이름을 짓는 것과 같은 결).
 *
 * 이 풀도 도감(dex)에 넣지 않는다 — genchar.js와 같은 이유.
 */
(function (global) {
  'use strict';

  function idSeed(s) {
    var h = 0; s = s || 'x';
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff; }
    return h;
  }
  function pick(seed, shift, arr) { return arr[(seed >>> shift) % arr.length]; }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* ── 이름 재료 ────────────────────────────────────────────
   * 성씨는 일본에서 실제로 흔한(수백만이 함께 쓰는) 성 30개 — [한글 표기, 한자].
   * 이름자는 한 글자씩 [한글 표기, 한자, 성향표]로 두고 둘을 이어 붙인다
   * (genchar.js의 SYLLABLES와 같은 결 — 완성된 유명인의 이름 하나를
   * 통째로 쓰지 않고 흔한 글자 둘을 조합해서 특정 인물과 우연히도 잘
   * 안 겹치게 한다). */
  var SURNAMES = [
    ['사토', '佐藤'], ['스즈키', '鈴木'], ['다카하시', '高橋'], ['다나카', '田中'], ['와타나베', '渡邊'],
    ['이토', '伊藤'], ['야마모토', '山本'], ['나카무라', '中村'], ['고바야시', '小林'], ['가토', '加藤'],
    ['요시다', '吉田'], ['야마다', '山田'], ['사사키', '佐佐木'], ['야마구치', '山口'], ['마쓰모토', '松本'],
    ['이노우에', '井上'], ['기무라', '木村'], ['하야시', '林'], ['사이토', '齋藤'], ['시미즈', '淸水'],
    ['야마자키', '山崎'], ['모리', '森'], ['이케다', '池田'], ['하시모토', '橋本'], ['아베', '阿部'],
    ['이시카와', '石川'], ['나카지마', '中島'], ['마에다', '前田'], ['후지타', '藤田'], ['고토', '後藤']
  ];

  var SYLLABLES = [
    ['다케', '武', ['martial']], ['켄', '劍', ['martial']], ['유미', '弓', ['martial']],
    ['도라', '虎', ['martial', 'frontier']], ['유', '雄', ['martial']], ['고', '豪', ['martial']],
    ['소', '壯', ['martial']], ['시', '士', ['martial']],
    ['기타', '北', ['frontier']], ['아라', '荒', ['frontier']], ['세키', '關', ['frontier']],
    ['시로', '城', ['frontier', 'court']], ['진', '陣', ['frontier', 'martial']], ['로', '狼', ['frontier']],
    ['사쿠', '朔', ['frontier']],
    ['야마', '山', ['nature']], ['가와', '川', ['nature']], ['모리', '森', ['nature']],
    ['구모', '雲', ['nature', 'scholar']], ['쓰루', '鶴', ['nature', 'scholar']], ['마쓰', '松', ['nature']],
    ['후치', '淵', ['nature', 'scholar']], ['다케', '岳', ['nature']],
    ['가쿠', '學', ['scholar']], ['후미', '文', ['scholar']], ['미치', '道', ['scholar']],
    ['겐', '憲', ['scholar', 'court']], ['쇼', '書', ['scholar']], ['사토루', '悟', ['scholar']],
    ['게이', '敬', ['scholar', 'court']], ['온', '溫', ['scholar']],
    ['교', '京', ['court']], ['미야코', '都', ['court']], ['미야', '宮', ['court']],
    ['진', '仁', ['court']], ['세이', '正', ['court']], ['하루', '治', ['court']], ['도', '統', ['court']],
    ['하나', '花', ['art']], ['아야', '彩', ['art']], ['리쓰', '律', ['art']], ['가오리', '香', ['art']],
    ['란', '蘭', ['art']], ['시', '詩', ['art']], ['마이', '舞', ['art']], ['미야비', '雅', ['art']],
    ['하마', '濱', ['coast']], ['나미', '波', ['coast', 'sea']], ['우시오', '潮', ['coast', 'sea']],
    ['미나토', '港', ['coast']], ['시마', '島', ['sea']], ['요', '洋', ['sea']],
    ['우미', '海', ['sea', 'coast']], ['나다', '灘', ['sea', 'coast']]
  ];

  var FACTION_SUFFIX = ['번병대', '상회', '검술도장', '수비대', '조닌회', '어부조합', '무사단', '항구조합', '산자락 사찰', '광산조합'];

  var TRAITS = ['might', 'wisdom', 'virtue'];

  var QUOTE_TPL = {
    might: ['{f}의 이름을 걸고 물러서지 않겠소.', '이 한 몸으로 {region} 땅은 지켜내겠소.', '싸움이라면 {f}에서 뒤진 적이 없소.'],
    wisdom: ['{region}의 셈은 제게 맡기시지요.', '{f}에서 익힌 것으로 길을 열어 보이겠습니다.', '서두르지 않아도 답은 나옵니다.'],
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

  /** genchar.js와 같은 등급별 능력치 기준 — 등급 체감이 두 나라에서 달라 보이면
   *  안 되므로 값을 그대로 맞췄다 */
  var STAT_BASE = {
    1: { lo: 15, hi: 45 },
    2: { lo: 30, hi: 60 },
    3: { lo: 45, hi: 75 },
    4: { lo: 60, hi: 88 },
    5: { lo: 75, hi: 98 }
  };

  function weightedSyllable(seed, shift, tags) {
    var favored = SYLLABLES.filter(function (s) {
      return s[2].some(function (t) { return tags.indexOf(t) >= 0; });
    });
    var pool = favored.length >= 6 ? favored : SYLLABLES;
    return pick(seed, shift, pool);
  }

  /** regionCode + rarity(1~5) + index(임의의 정수) → HEROES와 같은 스키마.
   *  id 접두사 `jp_`(genchar.js의 `kr_`과 안 겹치게) */
  function hero(regionCode, rarity, index) {
    var RJ = global.DG.regionJp;
    var region = RJ ? RJ.byCode(regionCode) : null;
    if (!region) { return null; }
    rarity = clamp(rarity | 0, 1, 5);
    index = index >>> 0;
    var id = 'jp_' + regionCode + '_' + rarity + '_' + index;
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
    if (trait === 'might') { stats.might = clamp(stats.might + 10, 5, 100); }
    if (trait === 'wisdom') { stats.wisdom = clamp(stats.wisdom + 10, 5, 100); }
    if (trait === 'virtue') { stats.command = clamp(stats.command + 6, 5, 100); }

    var faction = region.name + ' ' + pick(seed, 20, FACTION_SUFFIX);
    var quote = pick(seed, 23, QUOTE_TPL[trait]).replace(/\{region\}/g, region.name).replace(/\{f\}/g, faction);
    var bio = pick(seed, 26, BIO_TPL[trait]).replace(/\{region\}/g, region.name).replace(/\{f\}/g, faction);

    return {
      id: id,
      name: sur[0] + ' ' + a[0] + b[0],
      hanja: sur[1] + a[1] + b[1],
      era: '일본사',
      faction: faction,
      rarity: rarity,
      trait: trait,
      stats: stats,
      emoji: pick(seed, 29, EMOJI[trait]),
      quote: quote,
      _bio: bio,
      _generated: true,
      _region: region.code
    };
  }

  var PET_NAME_A = ['들', '산길', '갯', '숲', '벼랑', '안개', '섬', '물', '바람', '눈'];
  var PET_NAME_B = ['짐승', '것', '녀석', '떠돌이', '무리', '벗', '길손'];
  var PET_DESC_TPL = [
    '{region} 어름에서 흔히 보이는 짐승. 사람을 크게 경계하지 않는다.',
    '{region} 사람들이 오래전부터 곁에 두고 길렀다는 짐승.',
    '{region} 산길·물가를 오가며 산다는 이야기가 전해진다.'
  ];
  var PET_BONUS_STAT = ['might', 'wisdom', 'command'];

  /** id 접두사 `ptgenjp_`(genchar.js의 `ptgen_`과 안 겹치게) */
  function pet(regionCode, rarity, index) {
    var RJ = global.DG.regionJp;
    var region = RJ ? RJ.byCode(regionCode) : null;
    if (!region) { return null; }
    rarity = clamp(rarity | 0, 1, 5);
    index = index >>> 0;
    var id = 'ptgenjp_' + regionCode + '_' + rarity + '_' + index;
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

  function find(id) {
    if (typeof id !== 'string') { return null; }
    var m = /^jp_([a-z]+)_(\d)_(\d+)$/.exec(id);
    if (m) { return hero(m[1], +m[2], +m[3]); }
    m = /^ptgenjp_([a-z]+)_(\d)_(\d+)$/.exec(id);
    if (m) { return pet(m[1], +m[2], +m[3]); }
    return null;
  }

  function bio(id) {
    var h = find(id);
    return (h && h._bio) || '';
  }

  global.DG = global.DG || {};
  global.DG.gencharJp = { hero: hero, pet: pet, find: find, bio: bio };
})(window);
