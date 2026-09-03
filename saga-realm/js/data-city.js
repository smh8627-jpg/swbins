/**
 * 삼국지 — 도시(城) 서른 곳 + 한국 지역 일곱 (2026-09-03 확장, 주인 없음)
 * ---------------------------------------------------------------
 * 코에이 삼국지의 골격은 "도시가 점이고, 인접한 점끼리만 군대가 오간다" 이다.
 * 그래서 이 파일이 정하는 것은 딱 둘이다 — **어디에 그릴지(x·y)** 와 **누구와 붙어 있는지(adj)**.
 *
 *   x·y      화면 비율(0~100). 실제 중국 지리를 대충 따른다(서→동 x, 북→남 y).
 *            지도는 svg 로 그린다 — 이 판에는 원래 지도가 없었다(강역은 목록이었다).
 *   adj      인접 도시. **한쪽만 적으면 된다** — link() 가 양쪽으로 이어 준다.
 *   agri/comm  논밭·저잣거리의 초기값(내정으로 올린다)
 *   wall     성벽 초기값. 공성전이 이 값을 깎는다
 *   land     지형. 'plain'(평야) | 'hill'(구릉) | 'river'(강) | 'mount'(산)
 *            공성·야전 보정과 내정 상한이 여기서 갈린다
 *            **양쪽이 다 river 인 길은 물길(水路)** 이다 — 배가 있어야 건넌다.
 *            물길 목록을 따로 두지 않은 것은, 지형 한 글자만 고치면 물길이
 *            따라 움직이게 두려는 것이다(장강·회수 줄기가 저절로 잡힌다)
 *
 * 도시를 늘릴 때는 이 파일만 고친다. 세력 배치는 data-force.js 다.
 */
(function (global) {
  'use strict';

  /* 州 — 도시를 묶어 보여줄 때만 쓴다 */
  var PROVINCES = {
    you: '유주', ji: '기주', bing: '병주', qing: '청주', yan: '연주',
    xu: '서주', yu: '예주', si: '사예', yong: '옹주', liang: '양주(涼)',
    jing: '형주', yi: '익주', yang: '양주(揚)',
    /* 2026-09-03 확장 — 한국 지역. 성 이름은 실제 역사 지명(저작권 대상이
       아니다), 그 성을 지키는 사람은 data-force.js KOREA_OFFICERS 에서
       가명으로 짓는다(루트 CLAUDE.md 이름 정책 — place명이 아니라 인물명만
       가린다) */
    kr: '한국'
  };

  var CITIES = [
    /* ── 북방 ─────────────────────────────────────────── */
    { id: 'beiping',  name: '북평', hanja: '北平', prov: 'you',  x: 84, y: 7,  land: 'hill',
      agri: 200, comm: 160, wall: 4200, pop: 130000, desc: '유주 동북의 관문. 오환과 맞닿아 기병이 억세다.' },
    { id: 'jixian',   name: '계',   hanja: '薊',   prov: 'you',  x: 73, y: 13, land: 'plain',
      agri: 260, comm: 220, wall: 4800, pop: 180000, desc: '유주의 치소. 북방 상인과 말이 모인다.' },
    { id: 'nanpi',    name: '남피', hanja: '南皮', prov: 'ji',   x: 70, y: 23, land: 'plain',
      agri: 320, comm: 260, wall: 5000, pop: 220000, desc: '기주 북쪽의 곡창. 원씨의 뒷마당.' },
    { id: 'ye',       name: '업',   hanja: '鄴',   prov: 'ji',   x: 61, y: 28, land: 'plain',
      agri: 420, comm: 380, wall: 6500, pop: 320000, desc: '하북 제일의 큰 성. 여기를 쥔 자가 북방을 쥔다.' },
    { id: 'jinyang',  name: '진양', hanja: '晉陽', prov: 'bing', x: 48, y: 20, land: 'mount',
      agri: 210, comm: 200, wall: 5200, pop: 150000, desc: '병주 산지의 요새. 흉노와 접한다.' },
    { id: 'beihai',   name: '북해', hanja: '北海', prov: 'qing', x: 83, y: 30, land: 'plain',
      agri: 300, comm: 240, wall: 4400, pop: 200000, desc: '청주의 학문 고을. 황건의 여파가 남았다.' },
    { id: 'puyang',   name: '복양', hanja: '濮陽', prov: 'yan',  x: 68, y: 33, land: 'river',
      agri: 300, comm: 280, wall: 4600, pop: 210000, desc: '황하를 낀 연주의 목. 물길이 곧 길이다.' },
    { id: 'chenliu',  name: '진류', hanja: '陳留', prov: 'yan',  x: 63, y: 39, land: 'plain',
      agri: 340, comm: 320, wall: 4800, pop: 240000, desc: '연주의 중심. 의병을 일으키기 좋은 자리.' },

    /* ── 중원 ─────────────────────────────────────────── */
    { id: 'luoyang',  name: '낙양', hanja: '洛陽', prov: 'si',   x: 47, y: 41, land: 'plain',
      agri: 380, comm: 420, wall: 6800, pop: 300000, desc: '한(漢)의 옛 서울. 불타고도 이름값이 남았다.' },
    { id: 'changan',  name: '장안', hanja: '長安', prov: 'si',   x: 35, y: 37, land: 'plain',
      agri: 360, comm: 400, wall: 6600, pop: 280000, desc: '관중의 서울. 사방이 관(關)으로 막혀 있다.' },
    { id: 'xuchang',  name: '허창', hanja: '許昌', prov: 'yu',   x: 58, y: 47, land: 'plain',
      agri: 400, comm: 360, wall: 5400, pop: 260000, desc: '중원 한복판. 둔전(屯田)을 벌이기에 이만한 땅이 없다.' },
    { id: 'runan',    name: '여남', hanja: '汝南', prov: 'yu',   x: 66, y: 54, land: 'plain',
      agri: 340, comm: 260, wall: 4200, pop: 230000, desc: '원씨 사대의 고향. 인재가 흔하다.' },
    { id: 'xiaopei',  name: '소패', hanja: '小沛', prov: 'xu',   x: 70, y: 43, land: 'plain',
      agri: 220, comm: 200, wall: 3600, pop: 120000, desc: '서주의 작은 성. 얹혀 사는 자의 자리다.' },
    { id: 'xiapi',    name: '하비', hanja: '下邳', prov: 'xu',   x: 79, y: 40, land: 'river',
      agri: 320, comm: 300, wall: 5200, pop: 220000, desc: '서주의 치소. 사수(泗水)가 성을 두른다.' },
    { id: 'shouchun', name: '수춘', hanja: '壽春', prov: 'yang', x: 74, y: 51, land: 'river',
      agri: 330, comm: 340, wall: 5000, pop: 230000, desc: '회남의 큰 성. 옥새를 품기 좋아하는 자리.' },

    /* ── 서방 ─────────────────────────────────────────── */
    { id: 'wuwei',    name: '무위', hanja: '武威', prov: 'liang', x: 15, y: 24, land: 'plain',
      agri: 180, comm: 220, wall: 3800, pop: 110000, desc: '하서의 길목. 서역 말이 들어온다.' },
    { id: 'tianshui', name: '천수', hanja: '天水', prov: 'yong',  x: 22, y: 36, land: 'hill',
      agri: 220, comm: 180, wall: 4400, pop: 140000, desc: '농서의 요충. 강족 기병을 부린다.' },
    { id: 'hanzhong', name: '한중', hanja: '漢中', prov: 'yi',    x: 29, y: 48, land: 'mount',
      agri: 280, comm: 220, wall: 5600, pop: 170000, desc: '촉으로 드는 문. 잔도(棧道) 하나가 나라를 가른다.' },
    { id: 'chengdu',  name: '성도', hanja: '成都', prov: 'yi',    x: 14, y: 62, land: 'plain',
      agri: 460, comm: 380, wall: 6000, pop: 340000, desc: '천부지국(天府之國). 굶는 해가 없다.' },
    { id: 'jiangzhou',name: '강주', hanja: '江州', prov: 'yi',    x: 25, y: 69, land: 'river',
      agri: 280, comm: 260, wall: 4600, pop: 180000, desc: '파(巴)의 물목. 촉의 동쪽 자물쇠.' },
    { id: 'yongan',   name: '영안', hanja: '永安', prov: 'yi',    x: 35, y: 63, land: 'mount',
      agri: 200, comm: 180, wall: 5000, pop: 120000, desc: '삼협의 입구. 물살이 성벽 노릇을 한다.' },

    /* ── 형주 ─────────────────────────────────────────── */
    { id: 'wan',      name: '완',   hanja: '宛',   prov: 'jing', x: 52, y: 52, land: 'plain',
      agri: 300, comm: 320, wall: 4800, pop: 220000, desc: '남양의 큰 저자. 중원과 형주 사이의 문.' },
    { id: 'xinye',    name: '신야', hanja: '新野', prov: 'jing', x: 56, y: 57, land: 'plain',
      agri: 200, comm: 160, wall: 3400, pop: 100000, desc: '작은 고을. 큰 뜻을 품기엔 좁다.' },
    { id: 'xiangyang',name: '양양', hanja: '襄陽', prov: 'jing', x: 50, y: 62, land: 'river',
      agri: 360, comm: 340, wall: 6200, pop: 260000, desc: '한수를 낀 형주의 머리. 물과 성벽이 겹친다.' },
    { id: 'jiangling',name: '강릉', hanja: '江陵', prov: 'jing', x: 44, y: 68, land: 'river',
      agri: 340, comm: 320, wall: 5400, pop: 240000, desc: '형주의 곳간. 배와 군량이 여기서 난다.' },
    { id: 'jiangxia', name: '강하', hanja: '江夏', prov: 'jing', x: 60, y: 65, land: 'river',
      agri: 280, comm: 300, wall: 4800, pop: 190000, desc: '장강과 한수가 만난다. 수군의 자리.' },
    { id: 'changsha', name: '장사', hanja: '長沙', prov: 'jing', x: 53, y: 77, land: 'hill',
      agri: 300, comm: 240, wall: 4400, pop: 200000, desc: '강남 사군(四郡)의 맏이. 활을 잘 쏜다.' },

    /* ── 강동 ─────────────────────────────────────────── */
    { id: 'chaisang', name: '시상', hanja: '柴桑', prov: 'yang', x: 66, y: 69, land: 'river',
      agri: 260, comm: 280, wall: 4600, pop: 180000, desc: '강동의 서쪽 문. 여기서 배를 내면 형주다.' },
    { id: 'jianye',   name: '건업', hanja: '建業', prov: 'yang', x: 77, y: 62, land: 'river',
      agri: 320, comm: 380, wall: 5200, pop: 250000, desc: '종산이 웅크린 자리. 왕기(王氣)가 있다 한다.' },
    { id: 'kuaiji',   name: '회계', hanja: '會稽', prov: 'yang', x: 84, y: 76, land: 'plain',
      agri: 300, comm: 340, wall: 4400, pop: 210000, desc: '강동의 끝. 소금과 배로 먹고산다.' },

    /* ── 한국 (2026-09-03 확장, 주인 없음 — force:null 로 시작해 정복 대상이다) ──
       x·y 는 기존 30성보다 동쪽(x:97~118)에 둔다 — 2D SVG viewBox 를
       0 0 100 100 → 0 0 125 100 로 넓혀야 잘린 채 안 뜬다(ui-rtk.js 한 곳).
       `garrison` 은 이 판에만 있는 새 필드 — rtk.js setup() 의 seedNeutral() 이
       이 값으로 troops/food 를 채운다(기존 30성에는 이 필드가 없다). */
    { id: 'yangping',  name: '양평',   hanja: '襄平',   prov: 'kr', x: 97,  y: 6,  land: 'plain',
      agri: 220, comm: 180, wall: 3800, pop: 90000, garrison: 12000,
      desc: '요동의 관문. 중원과 반도 사이, 누구의 땅도 아니다.' },
    { id: 'guknae',    name: '국내성', hanja: '國內城', prov: 'kr', x: 104, y: 14, land: 'mount',
      agri: 200, comm: 160, wall: 4600, pop: 100000, garrison: 15000,
      desc: '산이 성벽을 대신하는 곳. 오르는 자가 지친다.' },
    { id: 'nakrang',   name: '낙랑',   hanja: '樂浪',   prov: 'kr', x: 103, y: 24, land: 'plain',
      agri: 260, comm: 220, wall: 4200, pop: 130000, garrison: 16000,
      desc: '옛 군현의 저자. 배와 수레가 다 모인다.' },
    { id: 'daebang',   name: '대방',   hanja: '帶方',   prov: 'kr', x: 100, y: 33, land: 'plain',
      agri: 240, comm: 200, wall: 4000, pop: 110000, garrison: 14000,
      desc: '낙랑과 반도 남쪽을 잇는 목.' },
    { id: 'wirye',     name: '위례성', hanja: '慰禮城', prov: 'kr', x: 104, y: 42, land: 'river',
      agri: 300, comm: 260, wall: 4600, pop: 150000, garrison: 18000,
      desc: '큰 강을 낀 터. 다스리는 자마다 도읍으로 삼고 싶어한다.' },
    { id: 'geumseong', name: '금성',   hanja: '金城',   prov: 'kr', x: 118, y: 52, land: 'hill',
      agri: 280, comm: 240, wall: 5000, pop: 160000, garrison: 20000,
      desc: '반도 동남단의 큰 성. 산으로 둘러싸여 지키기 좋다.' },
    { id: 'gimhae',    name: '김해',   hanja: '金海',   prov: 'kr', x: 112, y: 58, land: 'river',
      agri: 260, comm: 300, wall: 3800, pop: 100000, garrison: 13000,
      desc: '남쪽 바닷가 나루. 배가 성벽만큼 값지다.' }
  ];

  /* 인접 — 한쪽만 적는다. link() 가 양쪽에 넣는다.
     이 목록이 곧 이 게임의 "지도" 다: 여기 없는 두 성은 서로 출진할 수 없다. */
  var LINKS = [
    ['beiping', 'jixian'],
    ['jixian', 'nanpi'],
    ['nanpi', 'ye'], ['nanpi', 'beihai'],
    ['ye', 'jinyang'], ['ye', 'puyang'],
    ['jinyang', 'luoyang'], ['jinyang', 'changan'],
    ['beihai', 'puyang'], ['beihai', 'xiapi'],
    ['puyang', 'chenliu'], ['puyang', 'xiapi'],
    ['chenliu', 'xuchang'], ['chenliu', 'luoyang'],
    ['luoyang', 'xuchang'], ['luoyang', 'changan'], ['luoyang', 'wan'],
    ['changan', 'tianshui'], ['changan', 'hanzhong'],
    ['tianshui', 'wuwei'], ['tianshui', 'hanzhong'],
    ['hanzhong', 'chengdu'], ['hanzhong', 'jiangzhou'],
    ['chengdu', 'jiangzhou'],
    ['jiangzhou', 'yongan'],
    ['yongan', 'jiangling'],
    ['xuchang', 'runan'], ['xuchang', 'xiaopei'], ['xuchang', 'wan'],
    ['runan', 'shouchun'], ['runan', 'wan'], ['runan', 'jiangxia'],
    ['xiaopei', 'xiapi'], ['xiaopei', 'shouchun'],
    ['xiapi', 'shouchun'],
    ['shouchun', 'jianye'], ['shouchun', 'chaisang'],
    ['wan', 'xinye'],
    ['xinye', 'xiangyang'],
    ['xiangyang', 'jiangling'], ['xiangyang', 'jiangxia'],
    ['jiangling', 'jiangxia'], ['jiangling', 'changsha'],
    ['jiangxia', 'chaisang'],
    ['changsha', 'chaisang'], ['changsha', 'kuaiji'],
    ['chaisang', 'jianye'],
    ['jianye', 'kuaiji'],

    /* ── 한국 ─────────────────────────────────────────── */
    ['beiping', 'yangping'],
    ['yangping', 'guknae'],
    ['guknae', 'nakrang'],
    ['nakrang', 'daebang'],
    ['daebang', 'wirye'],
    ['wirye', 'geumseong'], ['wirye', 'gimhae'],
    ['geumseong', 'gimhae']
  ];

  var byId = {};
  var i, c;
  for (i = 0; i < CITIES.length; i++) {
    c = CITIES[i];
    c.adj = [];
    byId[c.id] = c;
  }

  /* 없는 도시를 가리키는 줄은 조용히 버린다 — 도시를 줄일 때 링크를 지우다 빠뜨려도
     지도가 통째로 안 그려지는 사고를 막는다(실제로 '평원' 을 빼면서 겪었다). */
  var dropped = [];
  for (i = 0; i < LINKS.length; i++) {
    var a = byId[LINKS[i][0]], b = byId[LINKS[i][1]];
    if (!a || !b) { dropped.push(LINKS[i].join('-')); continue; }
    if (a.adj.indexOf(b.id) < 0) { a.adj.push(b.id); }
    if (b.adj.indexOf(a.id) < 0) { b.adj.push(a.id); }
  }

  /** 지형 — 이름과 전투 보정 */
  var LANDS = {
    plain: { name: '평야', def: 1.0,  siege: 1.0,  agriCap: 1.0,  commCap: 1.0 },
    hill:  { name: '구릉', def: 1.15, siege: 0.9,  agriCap: 0.85, commCap: 0.9 },
    river: { name: '강',   def: 1.1,  siege: 0.95, agriCap: 1.0,  commCap: 1.15 },
    mount: { name: '산',   def: 1.3,  siege: 0.75, agriCap: 0.7,  commCap: 0.8 }
  };

  function find(id) { return byId[id] || null; }

  function landOf(id) {
    var city = find(id);
    return LANDS[(city && city.land) || 'plain'] || LANDS.plain;
  }

  function provName(key) { return PROVINCES[key] || key; }

  /**
   * 두 성 사이가 **물길**인가 — 맞닿아 있고 양쪽이 다 강(river)이면 그렇다.
   * 물길로는 **배로만** 군대가 건넌다. 그래서 강동은 배가 있어야 나가고,
   * 강하와 시상 사이(적벽)는 언제나 수전이 된다.
   */
  function isWater(a, b) {
    var ca = byId[a], cb = byId[b];
    return !!ca && !!cb && ca.land === 'river' && cb.land === 'river' &&
      ca.adj.indexOf(b) >= 0;
  }

  /** 물길로 이어진 이웃 */
  function waterAdj(id) {
    var c = byId[id], out = [], j;
    if (!c) { return out; }
    for (j = 0; j < c.adj.length; j++) {
      if (isWater(id, c.adj[j])) { out.push(c.adj[j]); }
    }
    return out;
  }

  /** 물길 전부 (자가진단이 센다) */
  var WATERWAYS = [];
  for (i = 0; i < CITIES.length; i++) {
    for (var wj = 0; wj < CITIES[i].adj.length; wj++) {
      var wb = CITIES[i].adj[wj];
      if (CITIES[i].id < wb && isWater(CITIES[i].id, wb)) {
        WATERWAYS.push([CITIES[i].id, wb]);
      }
    }
  }

  /** a 에서 b 까지 몇 성을 거치는가 (인접 그래프 너비 우선). 못 가면 -1 */
  function hops(a, b) {
    if (a === b) { return 0; }
    var seen = {}, q = [a], d = { }, cur, j;
    seen[a] = true; d[a] = 0;
    while (q.length) {
      cur = q.shift();
      var adj = find(cur) ? find(cur).adj : [];
      for (j = 0; j < adj.length; j++) {
        if (seen[adj[j]]) { continue; }
        seen[adj[j]] = true;
        d[adj[j]] = d[cur] + 1;
        if (adj[j] === b) { return d[adj[j]]; }
        q.push(adj[j]);
      }
    }
    return -1;
  }

  /**
   * a 에서 b 까지 **실제로 지나는 성 목록**(원정 전용, 2026-09-04) — 부모
   * 포인터로 경로를 되짚는 너비 우선. 중간 성(a·b 제외)은 `passableFn(cityId)`
   * 를 통과해야 지나갈 수 있다 — **b 자신은 이 검사를 안 받는다**(적의 성이라도
   * "도착지"는 될 수 있다, 거기서 싸우는 게 원정의 목적이다). **물길 간선은
   * 건너뛴다**(원정은 육로만 — 배 로지스틱스는 범위 밖). 못 가면 `null`,
   * 가면 `[a, ..., b]`(a===b 면 `[a]`).
   */
  function path(a, b, passableFn) {
    if (a === b) { return [a]; }
    var seen = {}, q = [a], parent = {}, cur, j;
    seen[a] = true;
    while (q.length) {
      cur = q.shift();
      var adj = find(cur) ? find(cur).adj : [];
      for (j = 0; j < adj.length; j++) {
        var nx = adj[j];
        if (seen[nx]) { continue; }
        if (isWater(cur, nx)) { continue; }
        if (nx !== b && !passableFn(nx)) { continue; }
        seen[nx] = true;
        parent[nx] = cur;
        if (nx === b) {
          var out = [b], p = cur;
          while (p !== undefined) { out.unshift(p); p = parent[p]; }
          return out;
        }
        q.push(nx);
      }
    }
    return null;
  }

  /**
   * `path()`가 준 경로를 실제로 도는 데 걸리는 개월 수(원정 전용).
   * 구간마다 화면 좌표(x·y, 0~100대) 거리를 더하되, 그 구간의 두 성 중
   * 하나라도 산(mount)이면 그 구간 길이에 ×1.5 — 험한 길은 더 걸린다.
   * 12로 나눠 올림, 최소 1달.
   */
  function pathMonths(p) {
    if (!p || p.length < 2) { return 1; }
    var total = 0, i;
    for (i = 0; i < p.length - 1; i++) {
      var ca = find(p[i]), cb = find(p[i + 1]);
      if (!ca || !cb) { continue; }
      var d = Math.hypot(ca.x - cb.x, ca.y - cb.y);
      if (ca.land === 'mount' || cb.land === 'mount') { d *= 1.5; }
      total += d;
    }
    return Math.max(1, Math.ceil(total / 12));
  }

  global.DG = global.DG || {};
  global.DG.cityData = {
    CITIES: CITIES, LINKS: LINKS, LANDS: LANDS, PROVINCES: PROVINCES,
    WATERWAYS: WATERWAYS,
    find: find, landOf: landOf, provName: provName, hops: hops,
    isWater: isWater, waterAdj: waterAdj, path: path, pathMonths: pathMonths,
    /** 자가진단용 — 없는 도시를 가리켜 버려진 링크 */
    _dropped: dropped
  };
})(window);
