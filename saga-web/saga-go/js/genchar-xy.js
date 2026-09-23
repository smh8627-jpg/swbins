/**
 * 절차적 인물·펫 생성기 — 서역 권역 전용, saga-go에만 있다.
 * ---------------------------------------------------------------
 * `js/genchar.js`(한국)·`js/genchar-jp.js`(일본)·`js/genchar-cn.js`(중국)의
 * 넷째 확장이다(2026-09-23) — 구조·id 체계·등급·능력치 기준은 그대로 베끼고,
 * 이름 재료·문구만 서역 권역(`js/region-xy.js`, 한대 서역 아홉 나라)에 맞게
 * 새로 짰다. 네 파일을 안 합친 이유는 앞 셋과 같다(이름 재료가 나라마다 전혀 다르다).
 *
 * **가명 정책과 무관하다** — 여기서 나오는 사람은 실존 인물이 아닌 절차적
 * 범인(凡人)이다. 이름 짓는 법은 한문 기록이 서역 사람을 적던 방식을 따랐다:
 * 성은 나라 이름에서 딴 한 글자 성(소무구성의 안·강·석·사·미·하·조 같은 결,
 * 구자 왕가의 백, 우전 왕가의 위지 등)이고, 이름은 서역 말을 소리로 옮길 때
 * 흔히 쓰던 한자 둘(아·반·타·나·달·마·라…)을 이어 붙인다 — 완성된 실존 인물
 * 이름을 통째로 쓰지 않고 음절 둘을 섞어 특정 인물과 우연히도 잘 안 겹치게
 * 한다(genchar-cn.js 의 이름자 조합과 같은 결). 특정 인물을 떠올리게 하는
 * 음절(록·륵·승 등)은 일부러 뺐다.
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
   * 성씨 [한글, 한자]. 이름자 [한글, 한자, 성향표] — 성향표는 region-xy.js 의
   * tags(desert·trade·nomad·oasis·art·martial·frontier)와 맞물린다 */
  var SURNAMES = [
    ['안', '安'], ['강', '康'], ['석', '石'], ['사', '史'], ['미', '米'],
    ['하', '何'], ['조', '曹'], ['목', '穆'], ['필', '畢'], ['백', '白'],
    ['위지', '尉遲'], ['배', '裴'], ['차', '車'], ['누', '樓'], ['지', '支']
  ];

  var SYLLABLES = [
    ['아', '阿', ['trade', 'oasis']], ['반', '槃', ['art']], ['타', '陀', ['desert', 'art']],
    ['나', '那', ['oasis']], ['연', '延', ['frontier']], ['달', '達', ['trade']],
    ['마', '摩', ['art']], ['라', '羅', ['trade', 'nomad']], ['가', '伽', ['art', 'oasis']],
    ['제', '提', ['oasis']], ['바', '婆', ['desert']], ['사', '沙', ['desert']],
    ['소', '蘇', ['trade']], ['살', '薩', ['trade', 'art']], ['비', '毗', ['art']],
    ['야', '耶', ['nomad']], ['노', '奴', ['nomad', 'martial']], ['다', '多', ['oasis', 'trade']],
    ['발', '拔', ['martial']], ['굴', '屈', ['martial', 'frontier']], ['밀', '密', ['oasis']],
    ['수', '須', ['desert', 'frontier']], ['파', '波', ['nomad']], ['차', '遮', ['frontier']],
    ['돌', '咄', ['nomad', 'martial']], ['궐', '闕', ['martial', 'frontier']], ['옥', '玉', ['oasis', 'art']],
    ['천', '泉', ['oasis', 'desert']], ['마', '馬', ['nomad', 'martial']], ['낙', '駱', ['desert', 'trade']]
  ];

  /* 두 음절이 이어져 실존 인물·신격을 떠올리게 하거나(달마·라마·마라·마야·제바·비마·바수 —
     승려·신화·쿠샨 왕 이름) 겨레 이름(돌궐)이 되거나, 우스운 한국어 낱말이 되는 짝(수달·제비·
     비밀·바다…)은 둘째 음절을 다음 것으로 민다(2026-09-23, 전수 634 짝을 훑어 골랐다) */
  var BLOCK = ['달마', '라마', '마라', '마야', '제바', '비마', '바수', '돌궐',
    '수달', '제비', '비밀', '바다', '반달', '천사', '소굴', '아가', '나라', '가나', '달라'];

  var FACTION_SUFFIX =['대상(隊商)', '낙타몰이꾼 조합', '오아시스 수비대', '유목 천막', '사원 악사단',
    '옥 캐는 무리', '역참', '마시장(馬市)', '봉수대', '우물지기'];

  var TRAITS = ['might', 'wisdom', 'virtue'];

  var QUOTE_TPL = {
    might: ['{f}의 이름을 걸고 모래바람에도 물러서지 않겠소.', '{region} 길목은 이 한 몸으로 지켜내겠소.', '말 위에서라면 {f}에서 뒤진 적이 없소.'],
    wisdom: ['{region}을 지나는 짐의 셈은 제게 맡기시지요.', '{f}에서 익힌 말 다섯 가지로 길을 열어 보이겠습니다.', '별을 읽으면 사막에서도 길은 보입니다.'],
    virtue: ['{region} 우물가 사람들과 함께라면 무엇이든 하겠습니다.', '{f}의 신의만은 저버리지 않습니다.', '먼 길 오신 손님께 물 한 잔부터 드리지요.']
  };
  var BIO_TPL = {
    might: ['{f} 출신. 도적 떼를 여러 번 쫓아냈다는 소문이 대상들 사이에 돈다.',
      '{f}에서 이름을 얻은 기수. 말과 활만 있으면 어디든 간다고들 한다.'],
    wisdom: ['{f}에서 여러 나라 말과 셈을 익혔다. 흥정이 막히면 다들 이 사람을 부른다.',
      '{f} 출신의 길잡이. 모래 언덕이 옮겨 가도 우물 자리는 틀리지 않았다는 이야기가 전해진다.'],
    virtue: ['{f}에서 나고 자랐다. 지친 길손을 먼저 챙기는 성정으로 오아시스에서 신망이 두텁다.',
      '{f}의 궂은일을 도맡아 왔다는 사람. 크게 나서지 않아도 대상들은 다 그 이름을 안다.']
  };
  var EMOJI = { might: ['🏹', '🐎', '⚔️', '🛡️'], wisdom: ['📜', '🧮', '🗺️', '⭐'], virtue: ['🐫', '💧', '🤝', '🌿'] };

  /** genchar.js·genchar-jp.js·genchar-cn.js와 같은 등급별 능력치 기준 — 나라마다 등급 체감이 같아야 한다 */
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
   *  id 접두사 `xy_`(한국 `kr_`·일본 `jp_`·중국 `cn_`과 안 겹치게) */
  function hero(regionCode, rarity, index) {
    var RX = global.DG.regionXy;
    var region = RX ? RX.byCode(regionCode) : null;
    if (!region) { return null; }
    rarity = clamp(rarity | 0, 1, 5);
    index = index >>> 0;
    var id = 'xy_' + regionCode + '_' + rarity + '_' + index;
    var seed = idSeed(id);

    var sur = pick(seed, 1, SURNAMES);
    var a = weightedSyllable(seed, 5, region.tags);
    var b = weightedSyllable(seed, 11, region.tags);
    var guard = 0;
    while ((b[0] === a[0] || BLOCK.indexOf(a[0] + b[0]) >= 0) && guard++ < SYLLABLES.length) {
      b = SYLLABLES[(SYLLABLES.indexOf(b) + 1) % SYLLABLES.length];
    }
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
      era: '서역',
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

  var PET_NAME_A = ['모래', '오아시스', '초원', '소금밭', '고개', '신기루', '천산', '우물가', '바람', '별밤'];
  var PET_NAME_B = ['짐승', '것', '녀석', '떠돌이', '무리', '벗', '길손'];
  var PET_DESC_TPL = [
    '{region} 어름의 모래땅에서 흔히 보이는 짐승. 대상 행렬을 곧잘 따라다닌다.',
    '{region} 사람들이 오래전부터 곁에 두고 길렀다는 짐승.',
    '{region} 오아시스와 초원을 오가며 산다는 이야기가 전해진다.'
  ];
  var PET_BONUS_STAT = ['might', 'wisdom', 'command'];

  /** id 접두사 `ptgenxy_`(`ptgen_`·`ptgenjp_`·`ptgencn_`과 안 겹치게) */
  function pet(regionCode, rarity, index) {
    var RX = global.DG.regionXy;
    var region = RX ? RX.byCode(regionCode) : null;
    if (!region) { return null; }
    rarity = clamp(rarity | 0, 1, 5);
    index = index >>> 0;
    var id = 'ptgenxy_' + regionCode + '_' + rarity + '_' + index;
    var seed = idSeed(id);

    var name = pick(seed, 1, PET_NAME_A) + pick(seed, 6, PET_NAME_B);
    var desc = pick(seed, 10, PET_DESC_TPL).replace(/\{region\}/g, region.name);
    var statKey = PET_BONUS_STAT[(seed >>> 13) % PET_BONUS_STAT.length];
    var base = STAT_BASE[rarity];
    var value = clamp(Math.round(2 + (base.lo + (seed >>> 4) % (base.hi - base.lo)) / 12), 2, 15);
    var catchBase = clamp(0.72 - rarity * 0.09, 0.16, 0.72);

    return {
      id: id, name: name, kind: 'beast', rarity: rarity,
      emoji: pick(seed, 18, ['🐾', '🐫', '🦅', '🐎', '🦎']),
      catchBase: catchBase,
      bonus: { stat: statKey, value: value },
      desc: desc,
      _generated: true,
      _region: region.code
    };
  }

  function find(id) {
    if (typeof id !== 'string') { return null; }
    var m = /^xy_([a-z]+)_(\d)_(\d+)$/.exec(id);
    if (m) { return hero(m[1], +m[2], +m[3]); }
    m = /^ptgenxy_([a-z]+)_(\d)_(\d+)$/.exec(id);
    if (m) { return pet(m[1], +m[2], +m[3]); }
    return null;
  }

  function bio(id) {
    var h = find(id);
    return (h && h._bio) || '';
  }

  global.DG = global.DG || {};
  global.DG.gencharXy = { hero: hero, pet: pet, find: find, bio: bio, BLOCK: BLOCK };
})(window);
