/**
 * 마을 데이터 — 타일 · 사물 · 채집물 · 부탁
 * ---------------------------------------------------------------
 * 동물의숲식 게임의 뼈대 데이터. 여기 한 줄을 늘리면 마을에 그것이 생긴다.
 * 규칙(무엇이 나오고 무엇을 주는지)은 village.js 가 읽기만 한다.
 */
(function (global) {
  'use strict';

  /** 땅 — 걸을 수 있는지(walk)와 색 */
  var TILES = {
    grass: { name: '풀', walk: true, color: '#63b04a', color2: '#6fbb52' },
    path:  { name: '흙길', walk: true, color: '#cbab74', color2: '#d5b681' },
    sand:  { name: '모래', walk: true, color: '#ecdfb0', color2: '#f2e7bd' },
    water: { name: '물', walk: false, color: '#4fbcda', color2: '#5cc7e2' },
    floor: { name: '마루', walk: true, color: '#c2925c', color2: '#cc9d67' }
  };

  /**
   * 사물 — 마을에 놓이는 것.
   *   gather 채집물 키 (없으면 그냥 장식)
   *   reset  다시 여물기까지 (일 단위)
   */
  var PROPS = {
    tree:   { name: '나무',   emoji: '🌳', gather: 'fruit',  reset: 1, hint: '흔든다' },
    pine:   { name: '소나무', emoji: '🌲', gather: 'nut',    reset: 1, hint: '흔든다' },
    rock:   { name: '바위',   emoji: '🪨', gather: 'ore',    reset: 1, hint: '캔다' },
    flower: { name: '꽃',     emoji: '🌸', gather: 'flower', reset: 1, hint: '꺾는다' },
    spot:   { name: '낚시터', emoji: '🎣', gather: 'fish',   reset: 0, hint: '낚는다' },
    sapling:{ name: '묘목',   emoji: '🌱', gather: null,     reset: 0, hint: '자라는 중' },
    board:  { name: '게시판', emoji: '📋', gather: null,     reset: 0, hint: '읽는다' },
    shop:   { name: '전방',   emoji: '🏪', gather: null,     reset: 0, hint: '판다' },
    home:   { name: '내 집',  emoji: '🏠', gather: null,     reset: 0, hint: '들어간다' },
    mail:   { name: '우편함', emoji: '📮', gather: null,     reset: 0, hint: '열어 본다' },
    dig:    { name: '갈라진 자리', emoji: '🕳️', gather: 'fossil', reset: 1,
              hint: '판다', tool: 'spade' },
    shell:  { name: '조개',   emoji: '🐚', gather: 'shell',  reset: 1, hint: '줍는다' },
    museum: { name: '사고(史庫)', emoji: '🏛️', gather: null, reset: 0, hint: '들어간다' },
    pole:   { name: '깃대',   emoji: '🚩', gather: null,     reset: 0, hint: '올려다본다' },
    weed:   { name: '잡초',   emoji: '🌿', gather: null,     reset: 0, hint: '뽑는다' },
    tailor: { name: '침선방(針線房)', emoji: '🧵', gather: null, reset: 0, hint: '옷을 고른다' }
  };

  /* ── 옷 ──────────────────────────────────────────────────
   * 원작의 재봉실 자리다. 궁중에서 바느질을 맡던 **침선방**의 이름을 빌렸다.
   *
   * 가구·벽지와 달리 **날마다 바뀌는 진열을 두지 않았다.** 옷은 취향이라
   * "오늘 것" 으로 막으면 답답하다 — 값이 문턱이면 충분하다.
   *
   * 고르는 것은 넷: 겉옷 · 머리 · 옷 빛 · 덧옷.
   * 이 값들은 sprite.js 의 `look`(armor · helm · cape)과 `color` 로 그대로 들어간다 —
   * 그림 코드는 한 줄도 고치지 않는다.
   */
  var WEAR_COATS = [
    { key: 'leather', name: '평상복',   price: 0 },
    { key: 'robe',    name: '도포',     price: 2400 },
    { key: 'coat',    name: '두루마기', price: 3600 },
    { key: 'plate',   name: '갑옷',     price: 6800 }
  ];

  var WEAR_HEADS = [
    { key: 'none',    name: '맨머리', price: 0 },
    { key: 'topknot', name: '상투',   price: 0 },
    { key: 'braid',   name: '댕기',   price: 900 },
    { key: 'scholar', name: '유건',   price: 1500 },
    { key: 'gat',     name: '갓',     price: 1800 },
    { key: 'hairpin', name: '족두리', price: 2600 },
    { key: 'helmet',  name: '전립',   price: 3200 }
  ];

  var WEAR_DYES = [
    { key: 'none',    name: '그대로', c: null,      price: 0 },
    { key: 'white',   name: '소색',   c: '#e4ddcc', price: 1200 },
    { key: 'ink',     name: '먹빛',   c: '#3a3f48', price: 1400 },
    { key: 'forest',  name: '풀빛',   c: '#3f7f4a', price: 1600 },
    { key: 'indigo',  name: '쪽빛',   c: '#3a6a9a', price: 1600 },
    { key: 'crimson', name: '다홍',   c: '#c0453a', price: 1800 },
    { key: 'gold',    name: '치자빛', c: '#d8a63c', price: 2200 },
    { key: 'plum',    name: '자주',   c: '#7a4a8a', price: 2400 }
  ];

  var WEAR_CAPES = [
    { key: 'off', name: '없음', price: 0 },
    { key: 'on',  name: '덧옷', price: 2000 }
  ];

  var WEAR_PARTS = [
    { key: 'coat', name: '겉옷', list: WEAR_COATS },
    { key: 'head', name: '머리', list: WEAR_HEADS },
    { key: 'dye',  name: '옷 빛', list: WEAR_DYES },
    { key: 'cape', name: '덧옷', list: WEAR_CAPES }
  ];

  function wearPart(key) {
    var p = WEAR_PARTS.filter(function (x) { return x.key === key; });
    return p[0] || null;
  }

  function wearItem(part, key) {
    var p = wearPart(part);
    if (!p) { return null; }
    var f = p.list.filter(function (x) { return x.key === key; });
    return f[0] || p.list[0];
  }

  /**
   * 주민의 성격 — 원작의 그 여덟 유형 자리다.
   * 인물 id 로 정해지니 늘 같다(세이브에 남기지 않는다).
   *
   *   ask/done/idle  말을 걸었을 때의 문구
   *   letter         편지 문구
   *   like           선물로 반기는 갈래
   *   req            주로 청하는 갈래
   *
   * 문구의 `{it}` 은 물건, `{n}` 은 개수, `{have}` 는 지금 가진 수로 바뀐다.
   */
  var FOLK_TYPES = [
    { key: 'hohyeop', name: '호협', icon: '🍶', desc: '활달하고 거침없다',
      like: 'fish', req: ['fish', 'ore', 'fruit'],
      ask: '{it} {n}개만 구해 주시오! 사내끼리 긴말이 필요하겠소? ({have}/{n})',
      done: '과연! 시원시원하구려. 잘 받았소.',
      idle: '오늘은 자네 덕에 배가 부르오. 한잔 하려나?',
      letter: '어제 일은 참으로 시원했소. 사양 말고 받으시오!' },
    { key: 'geuneom', name: '근엄', icon: '📜', desc: '말이 짧고 무겁다',
      like: 'ore', req: ['ore', 'nut', 'fossil'],
      ask: '{it}. {n}개. 부탁하네. ({have}/{n})',
      done: '수고했네.',
      idle: '되었네. 오늘은 그만하게.',
      letter: '받았네. 빈손으로 보내는 법이 아니라 하여 보내네.' },
    { key: 'dajeong', name: '다정', icon: '🌸', desc: '살갑고 말이 곱다',
      like: 'flower', req: ['flower', 'fruit', 'shell'],
      ask: '{it} {n}개만 부탁드려도 될까요? 무리하진 마세요. ({have}/{n})',
      done: '어머, 정말 고마워요. 덕분에 오늘이 환하네요.',
      idle: '오늘은 정말 고마웠어요. 차 한잔 들고 가세요.',
      letter: '어제 일이 자꾸 생각나 붓을 들었어요. 작은 마음이에요.' },
    { key: 'hakgu', name: '학구', icon: '📖', desc: '아는 것을 꼭 말한다',
      like: 'fossil', req: ['nut', 'ore', 'fossil'],
      ask: '{it}은(는) 예로부터 귀히 여겼소. {n}개면 족하오. ({have}/{n})',
      done: '옳지. 이만한 물건은 흔치 않소. 기록해 두겠소.',
      idle: '오늘 얻은 것은 사고에 들일 만하오. 생각해 보시오.',
      letter: '어제 것을 살펴보니 과연 물건이었소. 답례를 보내오.' },
    { key: 'iksal', name: '익살', icon: '🎭', desc: '한마디에 농이 섞인다',
      like: 'bug', req: ['fruit', 'fish', 'bug'],
      ask: '{it} {n}개! 없으면 말고… 아니 있어야 하오. ({have}/{n})',
      done: '어이쿠, 진짜 가져왔네? 농이었는데!',
      idle: '오늘은 자네가 이겼소. 내일 두고 보세.',
      letter: '어제 것 잘 먹었소. 아니 잘 썼소. 아무튼 고맙소.' },
    { key: 'ujik', name: '우직', icon: '🌾', desc: '순박하고 곧다',
      like: 'fruit', req: ['fruit', 'nut', 'shell'],
      ask: '{it} {n}개… 그거면 됩니다. ({have}/{n})',
      done: '고맙습니다. 잊지 않겠습니다.',
      idle: '오늘은 됐습니다. 정말 고맙습니다.',
      letter: '어제 일 잊지 않았습니다. 변변찮지만 보냅니다.' }
  ];

  /* ── 마을 ────────────────────────────────────────────────
   * 원작은 처음에 마을 이름을 묻고, 마을 기를 손수 그리게 한다.
   * 이름은 여기서 뽑고(바꿀 수 있다), 기는 바탕·무늬·무늬색 셋을 고르는 것으로 옮겼다.
   * 손으로 점을 찍는 도트 편집기는 이 판에 맞지 않는다 — 고르는 것으로 충분하다.
   */
  var TOWN_NAMES = [
    '솔뫼', '달내', '한터', '너울', '아사', '벌뫼', '새터', '도담',
    '미르내', '가온', '누리뫼', '하람', '별하', '윤슬', '아라', '단미'
  ];

  var FLAG_BGS = [
    { key: 'white', name: '흰빛', c: '#f2ece0' },
    { key: 'blue',  name: '쪽빛', c: '#2f6f9a' },
    { key: 'red',   name: '다홍', c: '#c04a3a' },
    { key: 'green', name: '풀빛', c: '#3f7f4a' },
    { key: 'black', name: '먹빛', c: '#33383f' },
    { key: 'gold',  name: '누른빛', c: '#d8a63c' }
  ];

  var FLAG_FGS = [
    { key: 'white', name: '흰빛', c: '#f6f2e8' },
    { key: 'black', name: '먹빛', c: '#2a2e34' },
    { key: 'red',   name: '다홍', c: '#d4503c' },
    { key: 'blue',  name: '쪽빛', c: '#3a7fb0' },
    { key: 'gold',  name: '누른빛', c: '#e8b93c' }
  ];

  /** 무늬 — 그리는 것은 village-view.js 의 drawFlagSym 이다 */
  var FLAG_SYMS = [
    { key: 'circle', name: '둥근 해' },
    { key: 'taegeuk', name: '태극' },
    { key: 'pine',   name: '솔' },
    { key: 'crane',  name: '학' },
    { key: 'mount',  name: '산' },
    { key: 'wave',   name: '물결' },
    { key: 'star',   name: '별' },
    { key: 'tiger',  name: '범 발자국' }
  ];

  /* ── 계절 행사 ────────────────────────────────────────────
   * 원작이 철마다 마을에 하루짜리 잔치를 두던 그 자리다.
   * 날짜는 **양력으로 고정**했다 — 음력을 계산하려면 표가 하나 더 필요하고,
   * 이 판에서 얻는 것보다 드는 것이 크다.
   *
   *   up   그날 그 갈래가 비싸게 팔린다
   *   tag  화면이 무엇을 더 그릴지 (moon · star · blossom · fire · 없으면 그대로)
   */
  var EVENTS = [
    { key: 'seollal', name: '설날', m: 1, d: 1, tag: 'newyear',
      hello: '새해 첫날입니다',
      desc: '주민에게 말을 걸면 세뱃돈을 줍니다 (사람마다 한 번).' },
    { key: 'daeborum', name: '대보름', m: 2, d: 15, tag: 'moon', sky: 'clear',
      up: { cat: 'nut', mul: 2 },
      hello: '보름달이 큽니다',
      desc: '부럼(밤·잣·두릅) 값이 갑절입니다. 밤하늘의 달이 큽니다.' },
    { key: 'samjin', name: '삼짇날', m: 4, d: 3, tag: 'blossom', sky: 'clear',
      up: { cat: 'flower', mul: 2 },
      hello: '꽃놀이 가는 날입니다',
      desc: '꽃 값이 갑절입니다. 나무마다 벚빛이 돌고 꽃잎이 흩날립니다.' },
    { key: 'dano', name: '단오', m: 6, d: 5,
      up: { cat: 'flower', mul: 1.8 },
      hello: '창포에 머리 감는 날입니다',
      desc: '꽃 값이 오릅니다.' },
    { key: 'chilseok', name: '칠석', m: 7, d: 7, tag: 'star', sky: 'clear',
      up: { cat: 'bug', mul: 1.6 },
      hello: '견우와 직녀가 만나는 밤입니다',
      desc: '밤하늘의 별이 갑절입니다. 곤충 값이 오릅니다.' },
    { key: 'baekjung', name: '백중', m: 8, d: 15, tag: 'fire', sky: 'clear',
      up: { cat: 'fish', mul: 1.6 },
      hello: '호미를 씻고 노는 날입니다',
      desc: '밤에 불꽃이 오릅니다. 물고기 값이 오릅니다.' },
    { key: 'chuseok', name: '한가위', m: 9, d: 17, tag: 'moon', sky: 'clear',
      up: { cat: 'fruit', mul: 2 },
      hello: '더도 말고 덜도 말고 오늘만 같아라',
      desc: '과일 값이 갑절입니다. 밤하늘의 달이 큽니다.' },
    { key: 'dongji', name: '동지', m: 12, d: 22, sky: 'snow',
      up: { cat: 'fruit', mul: 1.5 },
      hello: '밤이 가장 긴 날입니다',
      desc: '팥죽을 쑤는 날. 열매 값이 오르고 눈이 잦습니다.' }
  ];

  /* ── 날씨 ────────────────────────────────────────────────
   * **날짜로 정해진다.** 세이브에 남길 것이 없다 — 같은 날이면 같은 하늘이다.
   * 계절이 확률을 정한다(겨울엔 비 대신 눈).
   *
   * 달·별·불꽃을 보는 행사날은 **맑다**(`sky: 'clear'`). 한가위에 비가 오면
   * 큰 달을 볼 수 없으니, 그 하루만은 하늘을 고정한다. 동지는 반대로 눈이다.
   *
   * 이 파일은 core 를 모른다(불러오는 차례가 앞이다). 그래서 해시를 여기 따로 둔다.
   */
  var WEATHERS = {
    clear: { key: 'clear', name: '맑음', icon: '☀️' },
    cloud: { key: 'cloud', name: '흐림', icon: '☁️' },
    rain:  { key: 'rain',  name: '비',   icon: '🌧️' },
    snow:  { key: 'snow',  name: '눈',   icon: '🌨️' }
  };

  var WEATHER_ODDS = {
    spring: [['clear', 0.50], ['cloud', 0.30], ['rain', 0.20]],
    summer: [['clear', 0.45], ['cloud', 0.20], ['rain', 0.35]],
    autumn: [['clear', 0.55], ['cloud', 0.28], ['rain', 0.17]],
    winter: [['clear', 0.45], ['cloud', 0.25], ['snow', 0.30]]
  };

  function dayHash(n) {
    var t = (n * 2654435761) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** 그날의 날씨 */
  function weatherOf(date, seasonKey) {
    var k = knob('time.weather');
    if (k && WEATHERS[k]) { return WEATHERS[k]; }
    var dt = date || new Date();
    var ev = eventOf(dt);
    if (ev && ev.sky) { return WEATHERS[ev.sky]; }
    var se = seasonKey || seasonOf(dt.getMonth() + 1).key;
    var n = dt.getFullYear() * 372 + dt.getMonth() * 31 + dt.getDate();
    var h = dayHash(n * 13 + 7);
    var odds = WEATHER_ODDS[se] || WEATHER_ODDS.spring;
    for (var i = 0; i < odds.length; i++) {
      h -= odds[i][1];
      if (h <= 0) { return WEATHERS[odds[i][0]]; }
    }
    return WEATHERS.clear;
  }

  function weather() { return weatherOf(); }

  /** 지금 하늘에서 나오는 것인가 (rain 칸이 없으면 하늘을 안 탄다) */
  function inWeather(it, key) {
    if (!it.rain) { return true; }
    var rainy = (key || weather().key) === 'rain';
    if (it.rain === 'only') { return rainy; }
    if (it.rain === 'no') { return !rainy; }
    return true;
  }

  /** 그날의 행사 (없으면 null) */
  function eventOf(date) {
    var k = knob('time.event');
    if (k) {
      if (k === 'none') { return null; }
      var f = EVENTS.filter(function (x) { return x.key === k; });
      if (f[0]) { return f[0]; }
    }
    var dt = date || new Date();
    var m = dt.getMonth() + 1, d = dt.getDate();
    for (var i = 0; i < EVENTS.length; i++) {
      if (EVENTS[i].m === m && EVENTS[i].d === d) { return EVENTS[i]; }
    }
    return null;
  }

  /** 오늘 다음에 오는 행사와 며칠 남았는지 */
  function nextEventOf(date) {
    var dt = date || new Date();
    var y = dt.getFullYear();
    var today = new Date(y, dt.getMonth(), dt.getDate()).getTime();
    var best = null, bd = 1e9, i;
    for (i = 0; i < EVENTS.length; i++) {
      var e = EVENTS[i];
      var t = new Date(y, e.m - 1, e.d).getTime();
      if (t <= today) { t = new Date(y + 1, e.m - 1, e.d).getTime(); }
      var left = Math.round((t - today) / 86400000);
      if (left < bd) { bd = left; best = e; }
    }
    return best ? { event: best, left: bd } : null;
  }

  /**
   * 도구 — 전방에서 한 번 사면 계속 쓴다.
   * 원작이 잠자리채 없이는 벌레를 못 잡게 해 둔 그 자리다.
   */
  var TOOLS = {
    net:   { key: 'net', name: '잠자리채', emoji: '🥅', price: 800,
             desc: '곤충을 잡을 수 있게 됩니다' },
    spade: { key: 'spade', name: '삽', emoji: '🪏', price: 700,
             desc: '갈라진 자리를 파낼 수 있게 됩니다' }
  };

  /**
   * 가구 — 집 안에 놓는 것. 채집물과 **다른 칸(homeStock)** 에 쌓인다.
   *   set  계열. 같은 계열을 셋 이상 놓으면 집 평가에 보탬이 된다
   *   form 화면이 무엇으로 그릴지 (village-view.js 의 drawFurn)
   */
  var FURN_SETS = {
    anbang: { name: '안방', color: '#c98a4a' },
    sarang: { name: '사랑방', color: '#7a6a9a' },
    buok:   { name: '부엌', color: '#a85a3c' },
    ddeul:  { name: '뜰',   color: '#5a9a5a' }
  };

  var FURNITURE = [
    { key: 'bangseok',  name: '방석',     price: 400,  set: 'anbang', form: 'cushion' },
    { key: 'hwabun',    name: '화분',     price: 700,  set: 'ddeul',  form: 'plant' },
    { key: 'deungjan',  name: '등잔',     price: 800,  set: 'anbang', form: 'lamp' },
    { key: 'soban',     name: '소반',     price: 900,  set: 'anbang', form: 'table' },
    { key: 'mulhang',   name: '물항아리', price: 1100, set: 'buok',   form: 'vase' },
    { key: 'jokja',     name: '족자',     price: 1200, set: 'sarang', form: 'scroll' },
    { key: 'seoan',     name: '서안',     price: 1400, set: 'sarang', form: 'table' },
    { key: 'hwaro',     name: '화로',     price: 1500, set: 'buok',   form: 'brazier' },
    { key: 'mungab',    name: '문갑',     price: 1800, set: 'sarang', form: 'chest' },
    { key: 'bandaji',   name: '반닫이',   price: 2200, set: 'anbang', form: 'chest' },
    { key: 'dokja',     name: '도자기',   price: 2600, set: 'anbang', form: 'vase' },
    { key: 'badukpan',  name: '바둑판',   price: 3000, set: 'sarang', form: 'table' },
    { key: 'byeongpung', name: '병풍',    price: 3600, set: 'sarang', form: 'screen' },
    { key: 'geomungo',  name: '거문고',   price: 5200, set: 'sarang', form: 'gayageum' }
  ];

  var FURN = {};
  (function () {
    for (var i = 0; i < FURNITURE.length; i++) { FURN[FURNITURE[i].key] = FURNITURE[i]; }
  })();

  function furn(key) { return FURN[key] || null; }

  /**
   * 집의 단계 — 원작의 융자(대출)로 넓히는 그 자리.
   * 신청하면 그 자리에서 넓어지고 **빚이 생긴다**. 빚을 다 갚아야 다음을 신청할 수 있다.
   */
  var HOME_TIERS = [
    { name: '단칸방',       w: 7,  h: 5, cost: 0 },
    { name: '툇마루 딸린 방', w: 9,  h: 6, cost: 12000 },
    { name: '사랑채',       w: 11, h: 7, cost: 40000 },
    { name: '기와집',       w: 13, h: 8, cost: 120000 }
  ];

  /**
   * 벽지와 장판 — 방의 바탕을 갈아입힌다.
   * 원작에서 가구보다 먼저 방의 인상을 바꾸는 것이 이 둘이다.
   * 기본 한 벌은 값이 0 이고 처음부터 가지고 있다.
   */
  var WALLS = [
    { key: 'earth', name: '흙벽',   price: 0,    c: '#e6d8bd', trim: '#8a6440' },
    { key: 'hanji', name: '한지벽', price: 2000, c: '#f4ecda', trim: '#a08050' },
    { key: 'sol',   name: '솔빛벽', price: 3800, c: '#5f7f5a', trim: '#3f5f3a' },
    { key: 'muk',   name: '먹빛벽', price: 3200, c: '#5a5f6a', trim: '#383d46' },
    { key: 'dan',   name: '단청벽', price: 5200, c: '#c05a44', trim: '#2f5f7a' }
  ];

  var FLOORS = [
    { key: 'wood',   name: '마루',   price: 0,    a: '#c2925c', b: '#cc9d67' },
    { key: 'mat',    name: '돗자리', price: 1800, a: '#c8b98a', b: '#d2c495' },
    { key: 'jangpan', name: '장판',  price: 2200, a: '#d8b26a', b: '#e0bd77' },
    { key: 'stone',  name: '박석',   price: 3400, a: '#9aa0a6', b: '#a7adb3' },
    { key: 'ondol',  name: '구들장', price: 4200, a: '#b0a08a', b: '#bcac96' }
  ];

  var WALL = {}, FLOOR = {};
  (function () {
    var i;
    for (i = 0; i < WALLS.length; i++) { WALL[WALLS[i].key] = WALLS[i]; }
    for (i = 0; i < FLOORS.length; i++) { FLOOR[FLOORS[i].key] = FLOORS[i]; }
  })();

  function wall(key) { return WALL[key] || WALLS[0]; }
  function floor(key) { return FLOOR[key] || FLOORS[0]; }

  /**
   * 사고(史庫) 등급 — 기증한 **종 수**로 매긴다.
   * 원작의 박물관이 하던 일이다. 실록을 보관하던 그 이름을 빌렸다.
   */
  var MUSEUM_GRADES = [
    { at: 0,  name: '빈 사고' },
    { at: 5,  name: '문을 연 사고' },
    { at: 12, name: '갖춰지는 사고' },
    { at: 22, name: '이름난 사고' },
    { at: 32, name: '온전한 사고' }
  ];

  /** 사고에 들이는 갈래 — 원작의 네 전시실이다 */
  var MUSEUM_CATS = [
    { key: 'bug',    name: '곤충',   icon: '🦋' },
    { key: 'fish',   name: '물고기', icon: '🐟' },
    { key: 'fossil', name: '화석',   icon: '🦴' },
    { key: 'shell',  name: '조개',   icon: '🐚' }
  ];

  /** 집 평가 등급 — 점수가 오르면 이름이 바뀐다 (원작의 그 평가서) */
  var HOME_GRADES = [
    { at: 0,    name: '휑한 방' },
    { at: 30,   name: '살림이 든 방' },
    { at: 80,   name: '정갈한 집' },
    { at: 160,  name: '아취 있는 집' },
    { at: 280,  name: '이름난 집' },
    { at: 450,  name: '명가(名家)' }
  ];

  /**
   * 채집물 — 이름·값·희귀도.
   *   pick() 이 무게(w)로 하나를 고른다.
   */
  var ITEMS = {
    fruit: [
      { key: 'apple',  name: '능금',   emoji: '🍎', price: 40,  w: 50 },
      { key: 'peach',  name: '복숭아', emoji: '🍑', price: 70,  w: 30, season: ['summer'] },
      { key: 'persim', name: '홍시',   emoji: '🍊', price: 110, w: 20, season: ['autumn'] },
      { key: 'plum',   name: '매실',   emoji: '🟢', price: 90,  w: 22, season: ['spring'] },
      { key: 'citron', name: '유자',   emoji: '🍋', price: 160, w: 14, season: ['winter'] }
    ],
    nut: [
      { key: 'chest',  name: '밤',     emoji: '🌰', price: 35,  w: 60, season: ['autumn', 'winter'] },
      { key: 'pine',   name: '잣',     emoji: '🥜', price: 90,  w: 40 },
      { key: 'sprout', name: '두릅',   emoji: '🌱', price: 120, w: 26, season: ['spring'] }
    ],
    ore: [
      { key: 'iron',   name: '철석',   emoji: '⛏️', price: 80,  w: 55 },
      { key: 'copper', name: '구리',   emoji: '🟤', price: 130, w: 30 },
      { key: 'silver', name: '은괴',   emoji: '⚪', price: 260, w: 15 },
      /* 별조각 — 바위에서는 안 나온다(w: 0). 별똥별에 빈 소원의 답례로만 온다 */
      { key: 'stardust', name: '별조각', emoji: '✨', price: 700, w: 0 }
    ],
    flower: [
      { key: 'azalea', name: '진달래', emoji: '🌸', price: 30,  w: 55, season: ['spring'] },
      { key: 'mugung', name: '무궁화', emoji: '🌺', price: 60,  w: 30, season: ['summer'] },
      { key: 'orchid', name: '난초',   emoji: '🪻', price: 150, w: 15 },
      { key: 'maple',  name: '단풍',   emoji: '🍁', price: 70,  w: 40, season: ['autumn'] },
      { key: 'sulwha', name: '설중매', emoji: '🤍', price: 210, w: 12, season: ['winter'] },
      /* 교배로만 나는 꽃 — 저절로는 피지 않는다(w: 0). 심은 꽃 곁에 다른 꽃이 있어야 한다 */
      { key: 'geumnang', name: '금낭화', emoji: '💗', price: 320, w: 0, hybrid: true },
      { key: 'jaran',    name: '자란',   emoji: '💜', price: 380, w: 0, hybrid: true },
      { key: 'hongmae',  name: '홍매',   emoji: '❤️', price: 460, w: 0, hybrid: true }
    ],
    /**
     * 곤충 — 원작의 큰 축. 채집물과 달리 **시간대(phase)** 도 탄다.
     * 반딧불이는 여름 밤에만 날고, 겨울엔 거의 아무것도 없다(원작 그대로).
     * form 은 화면이 무엇으로 그릴지 정한다 (village-view.js 의 drawBug).
     */
    bug: [
      { key: 'cabbage', name: '배추흰나비', emoji: '🦋', price: 40,  w: 50,
        form: 'butterfly', wing: '#f4f2ea', body: '#6b6b60', rain: 'no',
        season: ['spring', 'summer'], phase: ['dawn', 'day'] },
      { key: 'ladybug', name: '무당벌레',   emoji: '🐞', price: 60,  w: 42,
        form: 'ladybug', wing: '#d8452f', body: '#2b2b2b',
        season: ['spring', 'summer'], phase: ['day'] },
      { key: 'swallow', name: '호랑나비',   emoji: '🦋', price: 180, w: 26,
        form: 'butterfly', wing: '#f2d24a', body: '#3a3a30', rain: 'no',
        season: ['spring', 'summer'], phase: ['day'] },
      { key: 'hopper',  name: '방아깨비',   emoji: '🦗', price: 110, w: 34,
        form: 'hopper', wing: '#6fae4a', body: '#4f8a34',
        season: ['summer', 'autumn'], phase: ['dawn', 'day', 'even'] },
      { key: 'dragon',  name: '잠자리',     emoji: '🪰', price: 90,  w: 36,
        form: 'dragonfly', wing: '#cfe6f2', body: '#c0533a', rain: 'no',
        season: ['summer', 'autumn'], phase: ['day', 'even'] },
      { key: 'cicada',  name: '참매미',     emoji: '🦗', price: 120, w: 30,
        form: 'cicada', wing: '#d8e4ea', body: '#4a4a3c', perch: 'tree', rain: 'no',
        season: ['summer'], phase: ['day'] },
      { key: 'longhorn', name: '하늘소',    emoji: '🪲', price: 260, w: 18,
        form: 'beetle', wing: '#4a4f5a', body: '#2e323a', perch: 'tree',
        season: ['summer'], phase: ['day', 'even'] },
      { key: 'mantis',  name: '사마귀',     emoji: '🦗', price: 200, w: 20,
        form: 'hopper', wing: '#8ab84a', body: '#5f8a2f',
        season: ['autumn'], phase: ['day', 'even'] },
      { key: 'cricket', name: '귀뚜라미',   emoji: '🦗', price: 150, w: 26,
        form: 'hopper', wing: '#6a5a3a', body: '#3f3524',
        season: ['autumn'], phase: ['even', 'night'] },
      { key: 'firefly', name: '반딧불이',   emoji: '✨', price: 380, w: 14,
        form: 'firefly', wing: '#f6f0b4', body: '#4a4a2e', glow: true,
        season: ['summer'], phase: ['even', 'night', 'dawn'] },
      { key: 'rhino',   name: '장수풍뎅이', emoji: '🪲', price: 420, w: 10,
        form: 'beetle', wing: '#5a3a24', body: '#3a2416', horn: true, perch: 'tree',
        season: ['summer'], phase: ['night', 'dawn'] },
      { key: 'stag',    name: '사슴벌레',   emoji: '🪲', price: 460, w: 9,
        form: 'beetle', wing: '#2e2620', body: '#1a1512', jaw: true, perch: 'tree',
        season: ['summer'], phase: ['night', 'dawn'] },
      /* 달팽이 — **비 오는 날에만** 기어 나온다. 원작도 비에는 나는 벌레가 줄고
         땅을 기는 것이 는다 */
      { key: 'snail',   name: '달팽이',     emoji: '🐌', price: 90,  w: 34,
        form: 'snail', wing: '#c8b48a', body: '#7a6a52', rain: 'only',
        phase: ['dawn', 'day', 'even'] },
      { key: 'spider',  name: '거미',       emoji: '🕷️', price: 200, w: 16,
        form: 'spider', wing: '#3a3a44', body: '#22222a',
        phase: ['even', 'night'] },
      /* 말벌 — **저절로 나오지 않는다**(swarm). 나무를 흔들다 벌집을 건드려야 만난다.
         쫓아오는 놈을 채로 받아치면 잡힌다 — 원작의 그 자리다 */
      { key: 'wasp',    name: '말벌',       emoji: '🐝', price: 480, w: 0,
        form: 'wasp', wing: '#f0c23a', body: '#2a2118', swarm: true }
    ],
    /**
     * 화석 — **갈라진 자리(dig)를 삽으로 판다**. 계절도 시간대도 타지 않는다.
     * 원작에서 하루 몇 자리가 마을 여기저기에 생기던 그 자리다.
     * 흙만 나오지는 않는다 — 값이 낮은 것이 자주 나올 뿐이다.
     */
    fossil: [
      { key: 'shard',  name: '토기 조각',   emoji: '🏺', price: 60,  w: 40 },
      { key: 'oldcoin', name: '옛 동전',    emoji: '🪙', price: 120, w: 30 },
      { key: 'fern',   name: '고사리 화석', emoji: '🌿', price: 180, w: 26 },
      { key: 'fishf',  name: '물고기 화석', emoji: '🐟', price: 220, w: 22 },
      { key: 'trilo',  name: '삼엽충 화석', emoji: '🪲', price: 260, w: 18 },
      { key: 'ammon',  name: '암모나이트',  emoji: '🐚', price: 300, w: 16 },
      { key: 'track',  name: '새 발자국',   emoji: '🐾', price: 340, w: 13 },
      { key: 'tooth',  name: '공룡 이빨',   emoji: '🦷', price: 480, w: 9 },
      { key: 'bone',   name: '공룡 뼈',     emoji: '🦴', price: 620, w: 6 },
      { key: 'tusk',   name: '매머드 엄니', emoji: '🦣', price: 900, w: 3 }
    ],
    /** 조개 — **모래밭에 떨어져 있다.** 도구가 없어도 줍는다 */
    shell: [
      { key: 'godung', name: '고둥',       emoji: '🐌', price: 50,  w: 42 },
      { key: 'sora',   name: '소라',       emoji: '🐚', price: 70,  w: 34 },
      { key: 'daehap', name: '대합',       emoji: '🦪', price: 90,  w: 28 },
      { key: 'urchin', name: '성게 껍질',  emoji: '🦔', price: 140, w: 18 },
      { key: 'abalone', name: '전복 껍데기', emoji: '🪞', price: 260, w: 10 },
      { key: 'pearl',  name: '진주',       emoji: '🤍', price: 900, w: 3 }
    ],
    fish: [
      { key: 'crucian', name: '붕어',  emoji: '🐟', price: 50,  w: 45 },
      { key: 'carp',    name: '잉어',  emoji: '🐠', price: 100, w: 30 },
      { key: 'catfish', name: '메기',  emoji: '🐡', price: 170, w: 18, season: ['summer'] },
      { key: 'sturgeon', name: '철갑상어', emoji: '🦈', price: 420, w: 7 },
      { key: 'trout',   name: '송어',  emoji: '🐟', price: 190, w: 16, season: ['spring', 'autumn'] },
      { key: 'smelt',   name: '빙어',  emoji: '🎐', price: 240, w: 14, season: ['winter'] },
      { key: 'loach',   name: '미꾸라지', emoji: '🪱', price: 130, w: 30, rain: 'only' }
    ]
  };

  var ALL = {};
  (function () {
    for (var k in ITEMS) {
      if (!Object.prototype.hasOwnProperty.call(ITEMS, k)) { continue; }
      for (var i = 0; i < ITEMS[k].length; i++) {
        ITEMS[k][i].cat = k;
        ALL[ITEMS[k][i].key] = ITEMS[k][i];
      }
    }
  })();

  /**
   * 계절 — 실제 달을 본다. 나는 것과 땅빛이 바뀐다.
   * 원작(동물의숲)에서 계절마다 잡히는 것이 달라지는 그 자리다.
   */
  var SEASONS = [
    { key: 'spring', name: '봄', months: [3, 4, 5],    grass: '#7cc356', grass2: '#88cd60',
      tint: 'rgba(255,205,225,0.05)', hello: '꽃이 한창입니다' },
    { key: 'summer', name: '여름', months: [6, 7, 8],  grass: '#5aa93f', grass2: '#66b449',
      tint: 'rgba(255,240,150,0.04)', hello: '볕이 뜨겁습니다' },
    { key: 'autumn', name: '가을', months: [9, 10, 11], grass: '#a8a247', grass2: '#b3ad51',
      tint: 'rgba(255,175,95,0.06)', hello: '단풍이 곱습니다' },
    { key: 'winter', name: '겨울', months: [12, 1, 2], grass: '#e2ecf1', grass2: '#eaf2f6',
      tint: 'rgba(205,230,255,0.07)', hello: '눈이 내립니다' }
  ];

  /** @param {number} month 1~12 */
  function seasonOf(month) {
    for (var i = 0; i < SEASONS.length; i++) {
      if (SEASONS[i].months.indexOf(month) >= 0) { return SEASONS[i]; }
    }
    return SEASONS[0];
  }

  /** 어드민 손잡이 — 잡혀 있으면 그것으로 본다 (자가진단·데모는 안 읽는다) */
  function knob(key) {
    var c = global.DG && global.DG.core;
    return c ? c.tuned(key, '') : '';
  }

  function season() {
    var k = knob('time.season');
    if (k) {
      var f = SEASONS.filter(function (x) { return x.key === k; });
      if (f[0]) { return f[0]; }
    }
    return seasonOf(new Date().getMonth() + 1);
  }

  /** 지금 계절에 나는 것인가 (season 칸이 없으면 사철 난다) */
  function inSeason(it, key) {
    if (!it.season) { return true; }
    return it.season.indexOf(key || season().key) >= 0;
  }

  /** 지금 시간대에 나오는 것인가 (phase 칸이 없으면 온종일 나온다) */
  function inPhase(it, key) {
    if (!it.phase) { return true; }
    return it.phase.indexOf(key || phaseOf(new Date().getHours()).key) >= 0;
  }

  /** 무게로 하나 고르기 — **지금 계절과 지금 하늘**에 나는 것만 고른다 */
  function pick(cat, seasonKey, weatherKey) {
    var all = ITEMS[cat];
    if (!all) { return null; }
    var key = seasonKey || season().key;
    var wk = weatherKey || weather().key;
    var list = all.filter(function (it) {
      return inSeason(it, key) && inWeather(it, wk);
    });
    if (!list.length) { list = all; }
    var total = 0, i;
    for (i = 0; i < list.length; i++) { total += list[i].w; }
    var r = Math.random() * total;
    for (i = 0; i < list.length; i++) {
      r -= list[i].w;
      if (r <= 0) { return list[i]; }
    }
    return list[0];
  }

  /** 교배로만 나는 꽃 하나 — 값이 낮은 쪽이 자주 나온다 */
  function pickHybrid() {
    var list = ITEMS.flower.filter(function (it) { return it.hybrid; });
    if (!list.length) { return null; }
    var w = [50, 30, 20], total = 0, i;
    for (i = 0; i < list.length; i++) { total += (w[i] || 10); }
    var r = Math.random() * total;
    for (i = 0; i < list.length; i++) {
      r -= (w[i] || 10);
      if (r <= 0) { return list[i]; }
    }
    return list[0];
  }

  /** 마을 평가 등급 — 잡초를 뽑고 꽃을 심어야 오른다 */
  var BEAUTY_GRADES = [
    { at: 0,   name: '거친 마을' },
    { at: 60,  name: '손이 간 마을' },
    { at: 100, name: '정갈한 마을' },
    { at: 150, name: '아름다운 마을' },
    { at: 200, name: '이름난 마을' }
  ];

  function item(key) { return ALL[key] || null; }

  /** 시간대 — 실제 시계를 본다. 하늘색과 인사말이 바뀐다 */
  var PHASES = [
    { key: 'dawn',  from: 5,  name: '새벽', sky: '#5c7ea8', light: 'rgba(130,150,205,0.18)', hello: '이른 아침입니다' },
    { key: 'day',   from: 8,  name: '낮',   sky: '#7ec8e8', light: 'rgba(0,0,0,0)',          hello: '해가 높습니다' },
    { key: 'even',  from: 17, name: '저녁', sky: '#e88a5a', light: 'rgba(215,120,65,0.16)',  hello: '노을이 붉습니다' },
    { key: 'night', from: 20, name: '밤',   sky: '#20305a', light: 'rgba(14,22,52,0.44)',    hello: '밤이 깊습니다' }
  ];

  function phaseOf(hour) {
    var k = knob('time.phase');
    if (k) {
      var f = PHASES.filter(function (x) { return x.key === k; });
      if (f[0]) { return f[0]; }
    }
    var p = PHASES[PHASES.length - 1];
    for (var i = 0; i < PHASES.length; i++) { if (hour >= PHASES[i].from) { p = PHASES[i]; } }
    return hour < PHASES[0].from ? PHASES[PHASES.length - 1] : p;
  }

  /** 주민 부탁 — 채집물을 몇 개 가져다 주면 금과 친밀도를 준다 */
  var REQUEST_N = [2, 3, 4];

  global.DG = global.DG || {};
  global.DG.villageData = {
    TILES: TILES, PROPS: PROPS, ITEMS: ITEMS, PHASES: PHASES, REQUEST_N: REQUEST_N,
    SEASONS: SEASONS, TOOLS: TOOLS,
    FURNITURE: FURNITURE, FURN_SETS: FURN_SETS, furn: furn,
    WALLS: WALLS, FLOORS: FLOORS, wall: wall, floor: floor,
    MUSEUM_GRADES: MUSEUM_GRADES, MUSEUM_CATS: MUSEUM_CATS,
    FOLK_TYPES: FOLK_TYPES,
    WEAR_PARTS: WEAR_PARTS, WEAR_COATS: WEAR_COATS, WEAR_HEADS: WEAR_HEADS,
    WEAR_DYES: WEAR_DYES, WEAR_CAPES: WEAR_CAPES,
    wearPart: wearPart, wearItem: wearItem,
    TOWN_NAMES: TOWN_NAMES, FLAG_BGS: FLAG_BGS, FLAG_FGS: FLAG_FGS, FLAG_SYMS: FLAG_SYMS,
    EVENTS: EVENTS, eventOf: eventOf, nextEventOf: nextEventOf,
    WEATHERS: WEATHERS, weather: weather, weatherOf: weatherOf, inWeather: inWeather,
    HOME_TIERS: HOME_TIERS, HOME_GRADES: HOME_GRADES,
    pick: pick, pickHybrid: pickHybrid, item: item, phaseOf: phaseOf,
    BEAUTY_GRADES: BEAUTY_GRADES,
    season: season, seasonOf: seasonOf, inSeason: inSeason, inPhase: inPhase,
    all: function () { return ALL; }
  };
})(window);
