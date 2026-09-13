/**
 * 절차적 인물·펫 생성기 — 중국 권역 전용, saga-go에만 있다.
 * ---------------------------------------------------------------
 * `js/genchar.js`(한국)·`js/genchar-jp.js`(일본)의 셋째 확장이다 — 구조·id
 * 체계·등급·경영 로직은 그대로 베끼고, 이름 재료·문구만 중국 권역
 * (`js/region-cn.js`, 우공구주)에 맞게 새로 짰다. 파일을 안 합친 이유는
 * 두 나라 때와 같다 — 이름 재료가 나라마다 전혀 달라, 나눠 두면 넷째
 * 나라를 늘릴 때도 이 파일이 아니라 "짝"을 하나 더 얹으면 된다.
 *
 * **가명 정책과 무관하다** — 여기서 나오는 사람은 "역사 인물의 가명"이
 * 아니라 애초에 실존 인물이 아닌 절차적 범인(凡人)이다. `genchar-jp.js`가
 * 일본식 발음을 한글로 옮겨 "사토 켄이치"를 짓듯, 이쪽도 **현대 중국어
 * 발음을 한글로 옮긴 성**(왕·리·장·류 등, 신문·방송이 중국 인명을 적는
 * 방식과 같다)에 한자 뜻으로 고른 이름자를 붙인다 — `js/data.js`의 `sg_*`
 * HEROES(삼국지 실제 인물의 가명, 예: `sg_guanyu`→"명운")와는 성격이
 * 다르다(그쪽은 "역사 인물처럼 안 보여야" 하고, 이쪽은 오히려 "평범한
 * 동네 사람처럼 보여야" 한다). 다만 지역 아홉 곳 자체는 삼국지 지리
 * (`region-cn.js` 머리말 참고)를 빌렸으므로 `era`는 `'삼국지'`로 둔다 —
 * `sg_*` 22명과 같은 시대색 안에 있다는 뜻일 뿐, 실제 역사 인물과는
 * 여전히 무관하다.
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
   * 성씨는 현대 중국어에서 실제로 흔한(백가성 상위권) 성 30개를 발음 그대로
   * 한글로 옮겼다 — [한글 표기, 한자]. 이름자는 한 글자씩 [한글 표기, 한자,
   * 성향표]로 두고 둘을 이어 붙인다(genchar-jp.js의 SYLLABLES와 같은 결 —
   * 완성된 유명인의 이름 하나를 통째로 쓰지 않고 흔한 한자 둘을 조합해서
   * 특정 인물과 우연히도 잘 안 겹치게 한다). */
  var SURNAMES = [
    ['왕', '王'], ['리', '李'], ['장', '張'], ['류', '劉'], ['천', '陳'],
    ['양', '楊'], ['자오', '趙'], ['황', '黃'], ['저우', '周'], ['우', '吳'],
    ['쉬', '徐'], ['쑨', '孫'], ['마', '馬'], ['주', '朱'], ['후', '胡'],
    ['궈', '郭'], ['허', '何'], ['린', '林'], ['가오', '高'], ['정', '鄭'],
    ['셰', '謝'], ['한', '韓'], ['탕', '唐'], ['펑', '馮'], ['위', '于'],
    ['둥', '董'], ['샤오', '蕭'], ['청', '程'], ['차오', '曹'], ['덩', '鄧']
  ];

  var SYLLABLES = [
    ['우', '武', ['martial']], ['강', '剛', ['martial']], ['융', '勇', ['martial']],
    ['창', '強', ['martial']], ['후', '虎', ['martial', 'frontier']], ['잔', '戰', ['martial']],
    ['롄', '練', ['martial']],
    ['볜', '邊', ['frontier']], ['황', '荒', ['frontier']], ['관', '關', ['frontier', 'martial']],
    ['숴', '朔', ['frontier']], ['싸이', '塞', ['frontier']], ['펑', '烽', ['frontier', 'martial']],
    ['산', '山', ['nature']], ['허', '河', ['nature']], ['쑹', '松', ['nature']],
    ['윈', '雲', ['nature', 'scholar']], ['취안', '泉', ['nature']], ['린', '林', ['nature']],
    ['펑', '峰', ['nature', 'frontier']],
    ['원', '文', ['scholar']], ['쉐', '學', ['scholar']], ['루', '儒', ['scholar']],
    ['수', '書', ['scholar']], ['즈', '智', ['scholar', 'court']], ['런', '仁', ['scholar', 'court']],
    ['징', '京', ['court']], ['두', '都', ['court']], ['궁', '宮', ['court']],
    ['정', '政', ['court']], ['더', '德', ['court', 'scholar']], ['안', '安', ['court']],
    ['스', '詩', ['art']], ['화', '畵', ['art']], ['러', '樂', ['art']],
    ['이', '藝', ['art']], ['야', '雅', ['art']], ['샹', '香', ['art']],
    ['하이', '海', ['coast', 'sea']], ['양', '洋', ['sea']], ['타오', '濤', ['coast', 'sea']],
    ['완', '灣', ['coast']], ['차오', '潮', ['coast', 'sea']], ['장', '江', ['coast', 'nature']]
  ];

  var FACTION_SUFFIX = ['상단', '표국', '무관', '서원', '수비대', '어선단', '산채', '나루터 조합', '차마고도 대상', '둔전대'];

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

  /** genchar.js·genchar-jp.js와 같은 등급별 능력치 기준 — 등급 체감이 세
   *  나라에서 달라 보이면 안 되므로 값을 그대로 맞췄다 */
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
   *  id 접두사 `cn_`(genchar.js의 `kr_`·genchar-jp.js의 `jp_`와 안 겹치게) */
  function hero(regionCode, rarity, index) {
    var RC = global.DG.regionCn;
    var region = RC ? RC.byCode(regionCode) : null;
    if (!region) { return null; }
    rarity = clamp(rarity | 0, 1, 5);
    index = index >>> 0;
    var id = 'cn_' + regionCode + '_' + rarity + '_' + index;
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
      era: '삼국지',
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

  var PET_NAME_A = ['들', '산길', '강가', '숲', '벼랑', '안개', '섬', '물', '바람', '눈'];
  var PET_NAME_B = ['짐승', '것', '녀석', '떠돌이', '무리', '벗', '길손'];
  var PET_DESC_TPL = [
    '{region} 어름에서 흔히 보이는 짐승. 사람을 크게 경계하지 않는다.',
    '{region} 사람들이 오래전부터 곁에 두고 길렀다는 짐승.',
    '{region} 산길·물가를 오가며 산다는 이야기가 전해진다.'
  ];
  var PET_BONUS_STAT = ['might', 'wisdom', 'command'];

  /** id 접두사 `ptgencn_`(genchar.js의 `ptgen_`·genchar-jp.js의 `ptgenjp_`와 안 겹치게) */
  function pet(regionCode, rarity, index) {
    var RC = global.DG.regionCn;
    var region = RC ? RC.byCode(regionCode) : null;
    if (!region) { return null; }
    rarity = clamp(rarity | 0, 1, 5);
    index = index >>> 0;
    var id = 'ptgencn_' + regionCode + '_' + rarity + '_' + index;
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
    var m = /^cn_([a-z]+)_(\d)_(\d+)$/.exec(id);
    if (m) { return hero(m[1], +m[2], +m[3]); }
    m = /^ptgencn_([a-z]+)_(\d)_(\d+)$/.exec(id);
    if (m) { return pet(m[1], +m[2], +m[3]); }
    return null;
  }

  function bio(id) {
    var h = find(id);
    return (h && h._bio) || '';
  }

  global.DG = global.DG || {};
  global.DG.gencharCn = { hero: hero, pet: pet, find: find, bio: bio };
})(window);
