/**
 * 보석 · 부문(符文) · 부문어(符文語) — 원작(디아블로)의 젬 · 룬 · 룬워드
 * ---------------------------------------------------------------
 * 디아블로에서 장비의 두 번째 층은 **소켓**이다. 같은 칼이라도 무엇을 박았느냐로
 * 갈리고, 룬을 **정해진 순서로** 박으면 이름이 바뀌며 딴 물건이 된다.
 *
 *   젬(7종 5등급) → 보석(5종 5등급)   소켓 → 세공 구멍
 *   룬(엘·엘드…)  → 부문(符文) — 한 글자짜리 전서(篆書)
 *   룬워드        → 부문어(符文語) — 글자가 모여 말이 된다
 *
 * 디아블로와 같은 규칙 둘을 지킨다:
 *   1) **한 번 박은 것은 빼지 못한다.** 그래서 어디에 박을지가 선택이 된다
 *   2) **부문어는 순서가 맞아야 한다.** 같은 글자라도 순서가 틀리면 말이 되지 않는다
 *
 * 효과는 새 통로를 만들지 않는다 — 장비 접사와 같은 모양(flat·pct·world)으로 낸다.
 */
(function (global) {
  'use strict';

  /** 보석 등급 — 거칠수록 값이 작다 */
  var GRADES = [
    { g: 0, name: '조(粗)', mul: 1.0,  color: '#9aa3b2' },
    { g: 1, name: '양(良)', mul: 1.8,  color: '#5ec26a' },
    { g: 2, name: '정(精)', mul: 3.0,  color: '#4aa3f0' },
    { g: 3, name: '보(寶)', mul: 4.6,  color: '#b06bf0' },
    { g: 4, name: '완(完)', mul: 7.0,  color: '#f0a53a' }
  ];

  /**
   * 보석 — **박는 자리에 따라 다른 것을 준다.** 원작의 젬이 그대로 그렇다.
   *
   *   무기  그 보석의 **원소 피해**   (원작: 루비=화, 사파이어=냉, 토파즈=전기…)
   *   갑주  그 원소의 **저항**        (원작도 갑옷에 박으면 저항이다)
   *   부적  **능력치**                (원작의 방패 자리 자리를 이 판은 부적이 맡는다)
   *
   * 2026-08-26 에 이 표를 **원작 방식으로 다시 짰다.** 그전에는 셋 다 능력치였다 —
   * 그러면 "어디에 박을까" 가 그냥 수치 비교였고, 원작에서 그 선택을 만드는
   * **원소와 저항**이 통째로 없었다.
   *
   *   kind 'eldmg' 원소 피해 (무기) · 'elres' 원소 저항 (갑주)
   *        'flat'·'pct'·'world' 는 예전 그대로 (부적)
   *   el   원소 키 (data-elem.js)
   */
  var GEMS = [
    { key: 'agate', name: '마노(瑪瑙)', emoji: '🔴', el: 'fire',
      weapon: { kind: 'eldmg', el: 'fire', v: 6 },
      armor:  { kind: 'elres', el: 'fire', v: 8 },
      charm:  { kind: 'pct',  stat: 'might', v: 3 },
      desc: '붉은 마노. 박으면 불이 붙는다.' },
    { key: 'pearl', name: '진주(眞珠)', emoji: '⚪', el: 'cold',
      weapon: { kind: 'eldmg', el: 'cold', v: 5 },
      armor:  { kind: 'elres', el: 'cold', v: 8 },
      charm:  { kind: 'pct',  stat: 'command', v: 3 },
      desc: '바다에서 온 구슬. 맞은 것이 굼떠진다.' },
    { key: 'amber', name: '호박(琥珀)', emoji: '🟠', el: 'lit',
      weapon: { kind: 'eldmg', el: 'lit', v: 7 },
      armor:  { kind: 'elres', el: 'lit', v: 8 },
      charm:  { kind: 'world', eff: 'lootPct', v: 4 },
      desc: '송진이 굳은 돌. 번개를 머금는다.' },
    { key: 'jade', name: '옥(玉)', emoji: '🟢', el: 'pois',
      weapon: { kind: 'eldmg', el: 'pois', v: 8 },
      armor:  { kind: 'elres', el: 'pois', v: 8 },
      charm:  { kind: 'pct',  stat: 'wisdom', v: 3 },
      desc: '맑은 옥. 스미면 오래 간다.' },
    { key: 'onyx', name: '흑요(黑曜)', emoji: '⚫', el: 'chi',
      weapon: { kind: 'eldmg', el: 'chi', v: 6 },
      armor:  { kind: 'elres', el: 'chi', v: 8 },
      charm:  { kind: 'flat', stat: 'all', v: 2 },
      desc: '검게 빛나는 돌. 기(氣)가 곧게 뻗는다.' }
  ];

  /**
   * 부문(符文) — 한 글자. 단독으로도 효과가 있고, 모이면 말이 된다.
   * tier 는 나오는 깊이(층)를 정한다. 높을수록 깊은 층에서만 나온다.
   */
  var RUNES = [
    { key: 'cheon', glyph: '天', name: '천', tier: 1,
      eff: { kind: 'flat', stat: 'wisdom', v: 6 }, desc: '하늘 천.' },
    { key: 'ji', glyph: '地', name: '지', tier: 1,
      eff: { kind: 'flat', stat: 'command', v: 6 }, desc: '땅 지.' },
    { key: 'in', glyph: '人', name: '인', tier: 1,
      eff: { kind: 'flat', stat: 'might', v: 6 }, desc: '사람 인.' },
    { key: 'mu', glyph: '武', name: '무', tier: 2,
      eff: { kind: 'pct', stat: 'might', v: 5 }, desc: '굳셀 무.' },
    { key: 'mun', glyph: '文', name: '문', tier: 2,
      eff: { kind: 'pct', stat: 'wisdom', v: 5 }, desc: '글월 문.' },
    { key: 'chung', glyph: '忠', name: '충', tier: 2,
      eff: { kind: 'pct', stat: 'command', v: 5 }, desc: '충성 충.' },
    { key: 'ui', glyph: '義', name: '의', tier: 3,
      eff: { kind: 'world', eff: 'lootPct', v: 10 }, desc: '옳을 의.' },
    { key: 'yong', glyph: '勇', name: '용', tier: 3,
      eff: { kind: 'world', eff: 'atkPct', v: 7 }, desc: '날랠 용.' },
    { key: 'ji2', glyph: '智', name: '지(智)', tier: 3,
      eff: { kind: 'world', eff: 'expPct', v: 9 }, desc: '슬기 지.' },
    { key: 'sin', glyph: '信', name: '신', tier: 4,
      eff: { kind: 'world', eff: 'hpPct', v: 9 }, desc: '믿을 신.' },
    { key: 'ryong', glyph: '龍', name: '용(龍)', tier: 4,
      eff: { kind: 'pct', stat: 'all', v: 4 }, desc: '용 룡. 드물다.' },
    { key: 'wang', glyph: '王', name: '왕', tier: 5,
      eff: { kind: 'flat', stat: 'all', v: 8 }, desc: '임금 왕. 아주 드물다.' }
  ];

  /**
   * 부문어(符文語) — **순서까지 맞아야** 이루어진다.
   * 이루어지면 이름이 바뀌고, 박힌 글자의 효과 대신 **이 표의 효과**가 붙는다.
   *   slot 을 지정하면 그 부위에서만 이루어진다
   */
  var WORDS = [
    { key: 'cheonjiin', name: '천지인(天地人)', runes: ['cheon', 'ji', 'in'],
      slot: null,
      eff: [{ kind: 'flat', stat: 'all', v: 14 }, { kind: 'pct', stat: 'all', v: 6 }],
      desc: '하늘과 땅과 사람이 한자리에 선다.' },
    { key: 'chungui', name: '충의(忠義)', runes: ['chung', 'ui'],
      slot: null,
      eff: [{ kind: 'pct', stat: 'command', v: 12 }, { kind: 'world', eff: 'lootPct', v: 18 }],
      desc: '섬김이 곧 이로움이 된다.' },
    { key: 'munmu', name: '문무(文武)', runes: ['mun', 'mu'],
      slot: null,
      eff: [{ kind: 'pct', stat: 'might', v: 10 }, { kind: 'pct', stat: 'wisdom', v: 10 }],
      desc: '붓과 칼을 함께 쥔다.' },
    { key: 'yongho', name: '용호(勇龍)', runes: ['yong', 'ryong'],
      slot: 'weapon',
      eff: [{ kind: 'pct', stat: 'might', v: 16 }, { kind: 'world', eff: 'atkPct', v: 14 }],
      desc: '무기에만 든다. 날래고 사납다.' },
    { key: 'wangdo', name: '왕도(王道)', runes: ['wang', 'ji', 'sin'],
      slot: null,
      eff: [{ kind: 'flat', stat: 'all', v: 20 }, { kind: 'pct', stat: 'all', v: 10 },
            { kind: 'world', eff: 'goldPct', v: 25 }],
      desc: '임금의 길. 좀처럼 이루어지지 않는다.' }
  ];

  /**
   * 주옥(珠玉) — 원작(디아블로2)의 주얼
   * ---------------------------------------------------------------
   * 보석은 종류마다 주는 것이 **표에 적혀 있다**. 주옥은 다르다 —
   * **접사가 굴러 나오는, 박을 것**이다. 그래서 같은 주옥이 둘 없고,
   * 박기 전에 "이걸 여기 넣어도 되나" 를 한 번 더 재게 된다.
   * 원작에서 주얼이 하는 일이 그것뿐이고, 그거면 충분하다.
   *
   * 원작에서 옮긴 규칙 셋
   *   · **부위를 안 가린다.** 무기든 갑주든 부적이든 같은 것을 준다.
   *     보석은 부위마다 다른 것을 준다 — 그 대비가 주옥의 정체다
   *   · **접사가 굴러 나온다.** 하나거나 둘이고, 둘은 드물다
   *   · **부문어에는 못 낀다.** 부문어는 글자만으로 이루어진다(wordOf 가 이미 막는다)
   *
   * **%는 수준을 안 탄다** — 고유(data-unique.js)에서와 같은 이유다.
   * 타면 깊은 층에서 저항과 전역 효과가 걷잡을 수 없이 커진다.
   * 수준을 타는 것은 flat 능력치와 원소 피해뿐이다.
   */
  var JEWEL_TWO = 0.34;                 // 접사가 둘일 확률
  var JEWEL_MAX = 40;                   // 가질 수 있는 수 (요대처럼 차면 바닥에 남는다)

  var JEWEL_AFFIXES = [
    /* 원소 피해 — 무기가 아니어도 붙는다. 이게 주옥의 첫째 쓸모다 */
    { key: 'j_fire', kind: 'eldmg', el: 'fire', lo: 3, hi: 8,  pre: '타는' },
    { key: 'j_cold', kind: 'eldmg', el: 'cold', lo: 3, hi: 7,  pre: '시린' },
    { key: 'j_lit',  kind: 'eldmg', el: 'lit',  lo: 4, hi: 10, pre: '벼락 든' },
    { key: 'j_pois', kind: 'eldmg', el: 'pois', lo: 4, hi: 9,  pre: '검푸른' },
    { key: 'j_chi',  kind: 'eldmg', el: 'chi',  lo: 3, hi: 7,  pre: '고요한' },
    /* 원소 저항 — 갑주가 아니어도 붙는다 */
    { key: 'j_rfire', kind: 'elres', el: 'fire', lo: 4, hi: 9, post: '방화(防火)' },
    { key: 'j_rcold', kind: 'elres', el: 'cold', lo: 4, hi: 9, post: '방한(防寒)' },
    { key: 'j_rlit',  kind: 'elres', el: 'lit',  lo: 4, hi: 9, post: '피뢰(避雷)' },
    { key: 'j_rpois', kind: 'elres', el: 'pois', lo: 4, hi: 9, post: '해독(解毒)' },
    { key: 'j_rchi',  kind: 'elres', el: 'chi',  lo: 4, hi: 9, post: '진기(鎭氣)' },
    /* 능력치 */
    { key: 'j_might',   kind: 'flat', stat: 'might',   lo: 3, hi: 7, pre: '억센' },
    { key: 'j_wisdom',  kind: 'flat', stat: 'wisdom',  lo: 3, hi: 7, pre: '밝은' },
    { key: 'j_command', kind: 'flat', stat: 'command', lo: 3, hi: 7, pre: '무거운' },
    { key: 'j_all',     kind: 'flat', stat: 'all',     lo: 1, hi: 3, pre: '온전한' },
    /* 전역 — 장착한 것만 센다(item.js). 그래서 값이 얌전하다 */
    { key: 'j_atk',  kind: 'world', eff: 'atkPct',  lo: 2, hi: 5,  post: '전열' },
    { key: 'j_crit', kind: 'world', eff: 'critPct', lo: 2, hi: 5,  post: '일격' },
    { key: 'j_find', kind: 'world', eff: 'findPct', lo: 4, hi: 10, post: '탐색' },
    { key: 'j_loot', kind: 'world', eff: 'lootPct', lo: 3, hi: 8,  post: '약탈' }
  ];

  function jewelAffixByKey(k) {
    for (var i = 0; i < JEWEL_AFFIXES.length; i++) {
      if (JEWEL_AFFIXES[i].key === k) { return JEWEL_AFFIXES[i]; }
    }
    return null;
  }

  /**
   * 주옥 하나를 굴린다. **id 는 여기서 안 붙인다** — 세이브에 넣는 item.js 가 붙인다
   * (물건의 일련번호는 한 곳에서만 나와야 한다).
   * @param ilvl 나온 층 (깊을수록 flat·원소 피해가 크다)
   * @returns {{aff:[{k,v}]}}
   */
  function rollJewel(ilvl) {
    ilvl = Math.max(1, Math.round(ilvl || 1));
    var n = Math.random() < JEWEL_TWO ? 2 : 1;
    var aff = [], used = {}, guard = 0;
    while (aff.length < n && guard < 30) {
      guard++;
      var a = JEWEL_AFFIXES[Math.floor(Math.random() * JEWEL_AFFIXES.length)];
      if (used[a.key]) { continue; }
      used[a.key] = true;
      var grow = (a.kind === 'flat' || a.kind === 'eldmg') ? (1 + ilvl * 0.05) : 1;
      var v = (a.lo + Math.random() * (a.hi - a.lo)) * grow;
      aff.push({ k: a.key, v: Math.max(1, Math.round(v)) });
    }
    return { aff: aff };
  }

  /** 주옥이 내는 것 — 보석·고유·투장과 **같은 모양**이라 item.js 가 그대로 더한다 */
  function jewelEff(j) {
    var out = [], i;
    if (!j || !j.aff) { return out; }
    for (i = 0; i < j.aff.length; i++) {
      var a = jewelAffixByKey(j.aff[i].k);
      if (!a) { continue; }
      out.push({ kind: a.kind, stat: a.stat, eff: a.eff, el: a.el, v: j.aff[i].v });
    }
    return out;
  }

  /** '타는 주옥 · 일격' — 접사가 이름이 된다(장비 이름 짓는 법과 같다) */
  function jewelName(j) {
    var pre = '', post = '', i;
    if (!j || !j.aff) { return '주옥(珠玉)'; }
    for (i = 0; i < j.aff.length; i++) {
      var a = jewelAffixByKey(j.aff[i].k);
      if (!a) { continue; }
      if (a.pre && !pre) { pre = a.pre + ' '; }
      else if (a.post && !post) { post = ' · ' + a.post; }
    }
    return pre + '주옥' + post;
  }

  function gemByKey(k) {
    for (var i = 0; i < GEMS.length; i++) { if (GEMS[i].key === k) { return GEMS[i]; } }
    return null;
  }
  function runeByKey(k) {
    for (var i = 0; i < RUNES.length; i++) { if (RUNES[i].key === k) { return RUNES[i]; } }
    return null;
  }
  function grade(g) { return GRADES[Math.max(0, Math.min(GRADES.length - 1, g || 0))]; }

  /**
   * 박힌 것들이 부문어를 이루는가 — **순서가 맞아야 한다**.
   * @param {Array} sock [{t:'rune', key}|{t:'gem',...}|null, …]
   * @param {string} slot 이 장비의 부위
   */
  function wordOf(sock, slot) {
    if (!sock || !sock.length) { return null; }
    var keys = [];
    for (var i = 0; i < sock.length; i++) {
      if (!sock[i]) { return null; }              // 빈 구멍이 있으면 말이 안 된다
      if (sock[i].t !== 'rune') { return null; }  // 보석이 섞여도 안 된다
      keys.push(sock[i].key);
    }
    for (var w = 0; w < WORDS.length; w++) {
      var def = WORDS[w];
      if (def.runes.length !== keys.length) { continue; }
      if (def.slot && def.slot !== slot) { continue; }
      var same = true;
      for (var k = 0; k < keys.length; k++) {
        if (keys[k] !== def.runes[k]) { same = false; break; }
      }
      if (same) { return def; }
    }
    return null;
  }

  global.DG = global.DG || {};
  global.DG.gemData = {
    GRADES: GRADES, GEMS: GEMS, RUNES: RUNES, WORDS: WORDS,
    gemByKey: gemByKey, runeByKey: runeByKey, grade: grade, wordOf: wordOf,
    /* 주옥 */
    JEWEL_AFFIXES: JEWEL_AFFIXES, JEWEL_MAX: JEWEL_MAX, JEWEL_TWO: JEWEL_TWO,
    jewelAffixByKey: jewelAffixByKey, rollJewel: rollJewel,
    jewelEff: jewelEff, jewelName: jewelName
  };
})(window);
