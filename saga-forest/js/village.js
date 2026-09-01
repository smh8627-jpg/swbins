/**
 * 마을 — 동물의숲식 놀이의 규칙
 * ---------------------------------------------------------------
 * 순환은 셋이다:
 *   걷는다   마을을 돌아다닌다 (지도가 아니라 손으로 만든 한 마을)
 *   모은다   나무를 흔들고 바위를 캐고 물가에서 낚는다 — 사물마다 하루 한 번
 *   나눈다   주민의 부탁을 들어주고, 남은 것은 전방에 판다
 *
 * 화면은 village-view.js 가, 규칙은 여기가 맡는다. 이 파일은 캔버스를 모른다.
 *
 * 마을 생김새는 **좌표 해시로 정해진다**(core.hash2). 그래서 같은 마을이 늘 같은
 * 모습이고, 세이브에 타일을 다 적어 둘 필요가 없다 — 바뀐 것(캔 자리·심은 것)만
 * 세이브에 남긴다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var VD = global.DG.villageData;

  var W = 30, H = 20;            // 마을 크기 (타일)
  var TILE = 40;                 // 한 타일 = 몇 단위 (그림 크기와 무관한 논리값)
  var SPEED = 118;               // 걸음 (단위/초)
  var REACH = 46;                // 사물에 손이 닿는 거리

  /* 걸음 배속만 **매번 읽는다** — 어드민에서 돌리면 곧바로 듣는다.
     나머지 손잡이는 모듈이 켜질 때 한 번 읽으므로 새로고침이 필요하다 */
  function speedMul() { return core.tuned('walk.speedMul', 1); }

  var player = { x: W * TILE * 0.5, y: H * TILE * 0.55, vx: 0, vy: 0,
                 facing: 1, phase: 0, walking: false };
  var target = null;             // 탭한 지점
  var keys = {};
  var props = [];                // 마을에 놓인 사물 (마을 생성 때 정해진다)
  var residents = [];            // 주민 (세이브에 id 만 남고 자리는 여기서)

  /* ── 세이브 자리 ──────────────────────────────────────── */

  function st() {
    var s = core.save;
    if (!s.village) {
      s.village = {
        seed: Math.floor(Math.random() * 1e9),
        bag: {},                 // { itemKey: n }
        used: {},                // { propId: 마지막으로 딴 날짜(일 단위) }
        friend: {},              // { heroId: 친밀도 }
        planted: [],             // 심어 둔 것 { x, y, kind, day, from }
        residents: [],           // 이 마을에 사는 인물 id
        requests: {},            // { heroId: {want, n, done} }
        tools: {},               // { net: true, spade: true } — 전방에서 산 도구
        donated: {},             // { itemKey: true } — 사고에 들인 것 (museum.js)
        gifted: {},              // { heroId: 마지막으로 선물한 날 }
        wrote: {},               // { heroId: 마지막으로 편지를 부친 날 }
        weeds: [],               // 잡초 { x, y } — 안 뽑으면 쌓인다
        terrain: {},             // { "tx,ty": 타일 } — 사람이 고친 칸만 (terrain.js)
        soldGold: 0,             // 전방에 판 금 누계 (전방이 자라는 기준)
        wish: null,              // 별똥별에 빈 소원 { day, n, last }
        wear: null,              // 차림 { on, owned } (wear.js)
        turnip: null,            // 순무 { n, buy, week } (turnip.js)
        caught: {},              // { itemKey: n } — 처음 잡은 것까지 다 센다 (도감)
        mail: [], moveIn: {}, leaving: {}, replied: {},   // 편지·이사 (mail.js)
        home: null,              // 집 (home.js 가 채운다)
        day: today(),
        sold: 0, gathered: 0, helped: 0
      };
    }
    if (!s.village.tools) { s.village.tools = {}; }
    if (!s.village.caught) { s.village.caught = {}; }
    if (!s.village.donated) { s.village.donated = {}; }
    if (!s.village.gifted) { s.village.gifted = {}; }
    if (!s.village.weeds) { s.village.weeds = []; }
    if (!s.village.terrain) { s.village.terrain = {}; }
    if (s.village.soldGold === undefined) { s.village.soldGold = 0; }
    return s.village;
  }

  /**
   * 오늘 (그 고장 자정 기준 일 단위) — 하루가 지나면 채집물이 다시 여문다.
   *
   * 부호가 뒤집혀 있었다. `getTimezoneOffset()` 은 KST 에서 **-540** 이므로
   * 그 고장 시각은 `getTime() - offset*60000`(= UTC+9h)이다. 옛 식은 9시간을
   * **빼서** 날이 자정이 아니라 저녁 여섯 시에 바뀌었다.
   * 순무 장(일요일 아침)을 넣으며 요일이 어긋나 드러났다.
   */
  function today() {
    var d = new Date();
    var n = Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
    /* 어드민의 '날짜 밀기' — 하루를 넘겨 보거나 일요일로 가 볼 때 쓴다.
       요일·하루 몫·잡초·편지가 한꺼번에 그날 것이 된다 */
    return n + core.tuned('time.dayShift', 0);
  }

  /* ── 마을 만들기 ──────────────────────────────────────── */

  /** 마을 밖 "숲 고리" 폭(타일) — PLAN 40절 PHASE 3 "넓은 Forest Map". 이 너머는
   *  여전히 물(세상 끝)이라 걸어서 무한히 못 나간다. 실기기 성능 보면 admin 에서
   *  줄일 수 있게 손잡이로 뒀다 */
  function forestMargin() { return core.tuned('forest.margin', 20); }

  /* ── 숲 고리 바이옴(PLAN 11절) ────────────────────────────
   * 마을 밖을 한 가지 잔디로 두지 않고 큼직한 구역(BIOME_CELL 타일 정사각형)으로
   * 갈라 다섯 가지 분위기를 준다. 칸 좌표를 seed 와 함께 해시하므로 같은 세이브는
   * 늘 같은 바이옴 지도를 갖는다 — tileAt() 처럼 저장할 필요가 없다.
   *
   * 색감·사물 종류만 다룬다. ambient sound·몬스터·아이템(PLAN 11절이 함께 적은
   * 항목)은 이 게임에 아직 그런 체계 자체가 없어 이번 단계에는 안 넣는다.
   */
  var BIOMES = ['green', 'meadow', 'dark', 'mushroom', 'rocky'];
  var BIOME_CELL = 22;
  /** 바이옴별 땅 색 — data-village.js 의 TILES 키. green 은 기존 그대로 'grass' */
  var BIOME_TILE = {
    green: 'grass', meadow: 'grass_meadow', dark: 'grass_dark',
    mushroom: 'grass_mush', rocky: 'grass_rocky'
  };
  /** 숲 고리 자연 바닥인지 — 공사(terrain.js)로 딴 걸 깐 자리는 걸러야 하므로
   *  buildProps() 가 tileAt() 결과를 이 표로 되짚어 본다 */
  var GRASS_FAMILY = { grass: 1, grass_meadow: 1, grass_dark: 1, grass_mush: 1, grass_rocky: 1 };

  function biomeAt(tx, ty) {
    var s = st();
    var cx = Math.floor(tx / BIOME_CELL), cy = Math.floor(ty / BIOME_CELL);
    var h = core.hash2(cx * 733 + s.seed % 991, cy * 617 + (s.seed >> 3) % 857);
    return BIOMES[Math.floor(h * BIOMES.length) % BIOMES.length];
  }

  /** 바이옴별 사물 문턱표 — 원래(기존 green) 문턱과 밀도를 그대로 두고, 나머지
   *  넷은 같은 방식(fh 하나로 내림차순 문턱을 훑는다)으로 그 바이옴다운 사물만 낸다 */
  var BIOME_SCATTER = {
    green:    [[0.80, 'tree'], [0.68, 'pine'], [0.60, 'rock'], [0.50, 'flower']],
    meadow:   [[0.78, 'flower'], [0.55, 'flower'], [0.45, 'bush'], [0.38, 'tree']],
    dark:     [[0.78, 'deadTree'], [0.62, 'deadTree'], [0.50, 'mossyRock'], [0.42, 'pine']],
    mushroom: [[0.80, 'mushroom'], [0.64, 'mushroom'], [0.52, 'stump'], [0.44, 'log']],
    rocky:    [[0.78, 'rock'], [0.62, 'mossyRock'], [0.50, 'rock'], [0.40, 'pine']]
  };

  /* ── 호수(PLAN 40절 PHASE 3 세 번째 칸) ──────────────────────
   * PLAN 10절 "중요한 장소는 랜덤 배치하지 않는다"에 호수가 들어 있다 — 그래서
   * 좌표 해시가 아니라 **margin(forestMargin) 에 비례한 고정 자리**에 판다.
   * 마을 서쪽, 세로 가운데. margin 을 admin 에서 낮춰도 고리 밖으로 안 튀어
   * 나가게 반지름을 그 안에서만 잡고, 고리가 아예 좁으면(< LAKE_MIN_MARGIN)
   * 호수 자체를 포기한다(작은 웅덩이보다 없는 편이 낫다고 봤다).
   */
  var LAKE_MIN_MARGIN = 10;
  function lakeCenter() {
    var m = forestMargin();
    if (m < LAKE_MIN_MARGIN) { return null; }
    var tx = -Math.round(m * 0.5);
    var r = Math.min(5, Math.max(2, Math.floor((m - Math.abs(tx) - 1) / 1.6)));
    return { tx: tx, ty: Math.floor(H * 0.5), r: r };
  }
  /** 타원(가로로 1.6배 길다)로 판다 — 실제 호수처럼 둥글기만 하면 심심하다 */
  function inLake(tx, ty) {
    var c = lakeCenter();
    if (!c) { return false; }
    var dx = (tx - c.tx) / 1.6, dy = ty - c.ty;
    return dx * dx + dy * dy <= c.r * c.r;
  }
  /** 호수 테두리 바로 바깥 한 겹 — 여기에만 물가 식생(plant)을 흘려 넣는다 */
  function nearLakeShore(tx, ty) {
    var c = lakeCenter();
    if (!c) { return false; }
    var dx = (tx - c.tx) / 1.6, dy = ty - c.ty;
    var d2 = dx * dx + dy * dy;
    var rr = c.r + 1.6;
    return d2 > c.r * c.r && d2 <= rr * rr;
  }

  function tileAt(tx, ty) {
    var s = st();
    /* 사람이 고친 칸이 먼저다 (`terrain.js` 의 공사). 안 고친 마을은 이 표가 비어 있어
       예전 그대로 해시로 풀린다 — 세이브가 늘지 않는 까닭이 이것이다 */
    if (s.terrain) {
      var ov = s.terrain[tx + ',' + ty];
      if (ov) { return ov; }
    }
    if (tx >= 0 && ty >= 0 && tx < W && ty < H) {
      var h = core.hash2(tx + s.seed % 977, ty + (s.seed >> 7) % 883);
      /* 가운데 가로로 흙길, 아래쪽에 못(물) */
      if (ty === Math.floor(H * 0.5)) { return 'path'; }
      if (tx === Math.floor(W * 0.5)) { return 'path'; }
      if (ty >= H - 4 && tx > 3 && tx < 11) { return h > 0.22 ? 'water' : 'sand'; }
      if (ty >= H - 5 && tx > 2 && tx < 13) { return 'sand'; }
      return 'grass';
    }
    /* 마을 밖 — 숲 고리(PLAN 11절 Biome 로 갈린 잔디, PLAN 12절 고정 호수) 아니면
       세상 끝(물) */
    var m = forestMargin();
    if (tx < -m || ty < -m || tx >= W + m || ty >= H + m) { return 'water'; }
    if (inLake(tx, ty)) { return 'water'; }
    return BIOME_TILE[biomeAt(tx, ty)];
  }

  /* ── 집 안 / 살금살금 ─────────────────────────────────────
   * 집에 들어가면 **같은 player 객체가 방 좌표를 쓴다**. 걷기·바라보는 쪽·걸음 위상을
   * 그대로 물려받으려면 이 편이 낫다 — 밖의 자리는 outPos 에 넣어 두었다가 되돌린다.
   */
  var indoors = false;
  var outPos = null;
  var sneakOn = false;         // 🐾 단추. Shift 를 누르고 있어도 같다
  var autoSneak = false;       // 자동이 벌레에 다가갈 때만 켠다 (사용자 설정을 건드리지 않는다)

  function inside() { return indoors; }

  function sneaking() { return !!(sneakOn || keys.shift || autoSneak); }

  /** 자동 전용 — 사용자가 누른 🐾 와 섞이지 않게 칸을 따로 둔다 */
  function setAutoSneak(v) { autoSneak = !!v; }

  function toggleSneak() {
    sneakOn = !sneakOn;
    core.emit('changed');
    return sneakOn;
  }

  function enterHome() {
    if (indoors) { return null; }
    var d = global.DG.home.door();
    outPos = { x: player.x, y: player.y };
    indoors = true;
    target = null;
    player.x = d.x; player.y = d.y - TILE * 0.6;
    core.emit('village:home', { inside: true });
    core.emit('changed');
    return { kind: 'home', text: '🏠 집에 들어왔다 — 문 앞에서 손을 쓰면 나갑니다' };
  }

  function leaveHome() {
    if (!indoors) { return null; }
    indoors = false;
    target = null;
    if (outPos) { player.x = outPos.x; player.y = outPos.y; }
    outPos = null;
    core.emit('village:home', { inside: false });
    core.emit('changed');
    core.persist();
    return { kind: 'home', text: '🏠 밖으로 나왔다' };
  }

  function walkable(x, y) {
    if (indoors) {
      /* 방 안 — 벽에 붙지 않게 안쪽으로 조금 물린다. 위쪽은 뒷벽이 서 있다 */
      var r = global.DG.home.room();
      return x > 8 && y > 30 && x < r.w - 8 && y < r.h - 6;
    }
    var t = tileAt(Math.floor(x / TILE), Math.floor(y / TILE));
    return VD.TILES[t] && VD.TILES[t].walk;
  }

  /**
   * 사물 배치 — 해시로 정하므로 늘 같은 마을이다.
   *
   * id 는 **자리**로 짓는다(`p<tx>_<ty>`). 순번으로 지으면 공사(`terrain.js`)로
   * 사물이 하나 생기거나 사라질 때 뒤 번호가 전부 밀려, 오늘 이미 딴 표시(`used`)가
   * 엉뚱한 나무에 붙는다.
   */
  function buildProps() {
    var s = st();
    props = [];
    var tx, ty;
    for (ty = 0; ty < H; ty++) {
      for (tx = 0; tx < W; tx++) {
        var t = tileAt(tx, ty);
        var h = core.hash2(tx * 31 + s.seed % 613, ty * 17 + s.seed % 419);
        /* 갈라진 자리와 조개는 **날짜를 섞은 해시**로 정한다 — 원작처럼 아침마다
           자리가 바뀐다. 그래서 마을을 한 바퀴 도는 일이 날마다 새로 생긴다 */
        var hd = core.hash2(tx * 53 + s.day % 991, ty * 29 + (s.day * 7) % 877);
        var x = tx * TILE + TILE * 0.5, y = ty * TILE + TILE * 0.5;
        var pid = 'p' + tx + '_' + ty;
        if (t === 'grass') {
          if (h > 0.93) { props.push({ id: pid, kind: 'tree', x: x, y: y }); }
          else if (h > 0.90) { props.push({ id: pid, kind: 'pine', x: x, y: y }); }
          else if (h > 0.875) { props.push({ id: pid, kind: 'rock', x: x, y: y }); }
          else if (h > 0.845) { props.push({ id: pid, kind: 'flower', x: x, y: y }); }
          else if (hd > 0.974) { props.push({ id: pid, kind: 'dig', x: x, y: y }); }
        } else if (t === 'sand') {
          if (h > 0.80) { props.push({ id: pid, kind: 'spot', x: x, y: y }); }
          else if (hd > 0.86) { props.push({ id: pid, kind: 'shell', x: x, y: y }); }
        }
      }
    }
    /* 마을 건물 — 가운데 길가에 고정으로 둔다 (찾기 쉬워야 한다) */
    var cx = Math.floor(W * 0.5), cy = Math.floor(H * 0.5);
    props.push({ id: 'shop', kind: 'shop', x: (cx - 3) * TILE + 20, y: (cy - 1) * TILE + 20 });
    props.push({ id: 'board', kind: 'board', x: cx * TILE + 20, y: (cy + 1) * TILE + 20 });
    /* 내 집과 우편함은 나란히 둔다 — 원작에서도 우편함은 집 앞에 있다 */
    props.push({ id: 'home', kind: 'home', x: (cx + 3) * TILE + 20, y: (cy - 1) * TILE + 20 });
    props.push({ id: 'mail', kind: 'mail', x: (cx + 3) * TILE + 20, y: (cy + 1) * TILE + 6 });
    props.push({ id: 'tailor', kind: 'tailor',
                 x: (cx - 3) * TILE + 20, y: (cy + 2) * TILE + 20 });
    props.push({ id: 'pole', kind: 'pole', x: (cx + 1) * TILE + 20, y: (cy + 1) * TILE + 14 });
    /* 잡초 — 세이브에 자리가 남는다. 안 뽑으면 날마다 는다 */
    var wd = s.weeds || [];
    for (var wi = 0; wi < wd.length; wi++) {
      props.push({ id: 'wd' + wi, kind: 'weed', x: wd[wi].x, y: wd[wi].y });
    }
    /* 사고(史庫) — 전방 건너편. 기증은 이 앞에서만 받는다 */
    props.push({ id: 'museum', kind: 'museum', x: (cx - 6) * TILE + 20, y: (cy + 1) * TILE + 20 });

    /* 숲 고리(PLAN 40절 PHASE 3 "넓은 Forest Map" + PLAN 11절 Biome) — 마을 밖에
       바이옴을 따라 사물을 흩뿌린다. id 접두 'f' 로 마을 것('p'..)과 겹치지 않게
       가른다.
       **`deco:true`로 채집 대상에서는 뺀다** — 이번 단계는 "걸어 나갈 공간"만
       여는 것이지 자원을 늘리는 게 아니다(PLAN 40절 PHASE 4 "Gathering" 몫).
       실제로 뺀 것을 안 하면 `focus()`·`auto.js`가 새로 생긴 수천 그루를 진짜
       채집 대상으로 삼아 하루 벌이가 몇 배로 뛴다 — 자가진단으로 잡았다 */
    var m = forestMargin();
    for (ty = -m; ty < H + m; ty++) {
      for (tx = -m; tx < W + m; tx++) {
        if (tx >= 0 && ty >= 0 && tx < W && ty < H) { continue; }   // 마을 안은 위에서 이미 채웠다
        if (!GRASS_FAMILY[tileAt(tx, ty)]) { continue; }            // 공사로 딴 걸 깔았으면 스킵
        var fh = core.hash2(tx * 31 + s.seed % 613 + 2000, ty * 17 + s.seed % 419 + 2000);
        var fx = tx * TILE + TILE * 0.5, fy = ty * TILE + TILE * 0.5;
        var fid = 'f' + tx + '_' + ty;
        if (nearLakeShore(tx, ty) && fh > 0.55) {
          props.push({ id: fid, kind: 'plant', x: fx, y: fy, deco: true });
          continue;
        }
        var table = BIOME_SCATTER[biomeAt(tx, ty)] || BIOME_SCATTER.green;
        for (var bi = 0; bi < table.length; bi++) {
          if (fh > table[bi][0]) { props.push({ id: fid, kind: table[bi][1], x: fx, y: fy, deco: true }); break; }
        }
      }
    }
  }

  /* ── 심기 ─────────────────────────────────────────────────
   * 원작(동물의숲)에서 과일을 묻으면 나무가 되는 그 자리다.
   * 심은 것은 세이브에 남고, 사흘이 지나면 묘목이 자란다.
   *   열매 → 나무 · 밤/잣 → 소나무 · 꽃 → 꽃
   * 캐거나 낚은 것은 심을 수 없다(광물·물고기).
   */

  var PLANT_DAYS = core.tuned('plant.days', 3);
  var PLANT_KIND = { fruit: 'tree', nut: 'pine', flower: 'flower' };

  /** 심은 것을 사물 목록에 반영한다 — 다 자랐으면 나무로, 아직이면 묘목으로 */
  function syncPlanted() {
    var s = st();
    if (!s.planted) { s.planted = []; }
    /* 심어 둔 것만 걷어내고 다시 넣는다 (원래 있던 사물은 건드리지 않는다) */
    props = props.filter(function (pr) { return pr.id.indexOf('pl') !== 0; });
    for (var i = 0; i < s.planted.length; i++) {
      var rec = s.planted[i];
      var grown = (s.day - rec.day) >= PLANT_DAYS;
      props.push({
        id: 'pl' + i, kind: grown ? rec.kind : 'sapling',
        x: rec.x, y: rec.y, planted: true,
        leftDays: Math.max(0, PLANT_DAYS - (s.day - rec.day))
      });
    }
    markHybrids();
  }

  /**
   * 꽃 교배 — **심은 꽃 곁에 다른 꽃이 있으면** 드문 색이 핀다.
   * 원작에서 꽃을 나란히 심어 두던 그 자리다.
   *
   * 판정은 **자리 해시**로 한다(무작위가 아니다). 그래야 심어 놓고 사흘 뒤에 와도
   * 같은 결과가 나오고, 어디에 심을지가 놀이가 된다.
   */
  var HYBRID_NEAR = TILE * 1.6;

  function markHybrids() {
    for (var i = 0; i < props.length; i++) {
      var p = props[i];
      if (!p.planted || p.kind !== 'flower') { continue; }
      var near = 0;
      for (var j = 0; j < props.length; j++) {
        if (j === i || props[j].kind !== 'flower') { continue; }
        if (Math.hypot(props[j].x - p.x, props[j].y - p.y) <= HYBRID_NEAR) { near++; }
      }
      p.hybrid = near > 0 && core.hash2(Math.round(p.x), Math.round(p.y)) > 0.45;
    }
  }

  /** 지금 자리에 심을 수 있나 (풀밭이어야 하고, 곁에 다른 사물이 없어야 한다) */
  function canPlantHere() {
    var t = tileAt(Math.floor(player.x / TILE), Math.floor(player.y / TILE));
    if (t !== 'grass') { return { ok: false, why: '풀밭에만 심을 수 있습니다' }; }
    for (var i = 0; i < props.length; i++) {
      if (Math.hypot(props[i].x - player.x, props[i].y - player.y) < TILE * 0.9) {
        return { ok: false, why: '너무 붙어 있습니다' };
      }
    }
    return { ok: true };
  }

  /** 가방의 것 하나를 심는다 */
  function plant(key) {
    var s = st(), it = VD.item(key);
    if (!it) { return null; }
    if (bagCount(key) < 1) { return { kind: 'no', text: '가진 것이 없습니다' }; }
    var kind = PLANT_KIND[it.cat];
    if (!kind) {
      return { kind: 'no', text: it.name + '은(는) 심을 수 없습니다 (열매·씨앗·꽃만)' };
    }
    var spot = canPlantHere();
    if (!spot.ok) { return { kind: 'no', text: spot.why }; }

    s.bag[key] -= 1;
    if (!s.planted) { s.planted = []; }
    s.planted.push({ x: player.x, y: player.y, kind: kind, day: s.day, from: key });
    syncPlanted();
    core.gainFeat(2, '심기');
    core.log('🌱 ' + it.name + ' 을 심었다 — ' + PLANT_DAYS + '일 뒤에 자랍니다', 'good');
    core.emit('changed');
    core.persist();
    return { kind: 'plant', text: '🌱 ' + it.name + ' 을 심었다 (' + PLANT_DAYS + '일)' };
  }

  /** 심을 수 있는 가방 항목만 */
  function plantable() {
    return bagList().filter(function (e) { return !!PLANT_KIND[e.item.cat]; });
  }

  /** 주민 — 처음 들어올 때 다섯 명이 이사 와 있다 */
  function buildResidents() {
    var s = st();
    if (!s.residents.length) {
      var pool = global.DG.data.heroes.slice();
      for (var i = 0; i < 5 && pool.length; i++) {
        var idx = Math.floor(Math.random() * pool.length);
        s.residents.push(pool[idx].id);
        pool.splice(idx, 1);
      }
    }
    residents = [];
    for (var j = 0; j < s.residents.length; j++) {
      var h = global.DG.data.find(s.residents[j]);
      if (!h) { continue; }
      /* 자리는 마을 안 고정 좌표 — 주민마다 다른 곳에 선다 */
      var a = core.hash2(j * 131 + 7, s.seed % 331) * Math.PI * 2;
      var r = (0.18 + core.hash2(j * 57, 11) * 0.26) * W * TILE;
      var x = core.clamp(W * TILE * 0.5 + Math.cos(a) * r, TILE, (W - 1) * TILE);
      var y = core.clamp(H * TILE * 0.5 + Math.sin(a) * r * 0.6, TILE, (H - 1) * TILE);
      residents.push({ id: h.id, ref: h, x: x, y: y, facing: 1, phase: j,
                       home: { x: x, y: y }, aim: null });
    }
  }

  function init() {
    st();
    buildProps();
    buildResidents();
    if (global.DG.mail) { global.DG.mail.ensureMoveIn(); }
    rollDay();
    syncPlanted();
  }

  /**
   * 날이 바뀌었으면 채집물을 되살리고 부탁을 새로 받는다.
   * **이사와 편지도 여기서만 굴린다** — 프레임마다 굴리면 하루가 몇 번씩 지나간다.
   * 부탁을 지우기 **전에** 어제 누구를 도왔는지 먼저 챙긴다(감사장이 거기서 나온다).
   */
  function rollDay() {
    var s = st(), d = today();
    if (s.day === d) { return false; }

    var helped = [], gifted = [], written = [], id;
    for (id in s.requests) {
      if (!Object.prototype.hasOwnProperty.call(s.requests, id)) { continue; }
      if (s.requests[id].done) { helped.push(id); }
    }
    for (id in s.gifted) {         // 어제 선물을 받은 사람 — 답례가 거기서 나온다
      if (!Object.prototype.hasOwnProperty.call(s.gifted, id)) { continue; }
      if (s.gifted[id] === s.day) { gifted.push(id); }
    }
    for (id in (s.wrote || {})) {   // 어제 내가 편지를 부친 사람 — 답장이 거기서 나온다
      if (!Object.prototype.hasOwnProperty.call(s.wrote, id)) { continue; }
      if (s.wrote[id] === s.day) { written.push(id); }
    }

    /* 어젯밤에 빈 소원 — **날짜를 갈기 전에** 세어 둔다 */
    var wishes = global.DG.town ? global.DG.town.wishesOn(s.day) : 0;

    s.day = d;
    s.used = {};
    s.requests = {};
    growWeeds();                   // 안 뽑으면 날마다 는다
    buildProps();                  // 갈라진 자리와 조개는 아침마다 자리가 바뀐다
    syncPlanted();                 // 하루가 지났으니 묘목이 자랐을 수 있다

    if (global.DG.mail) {
      var r = global.DG.mail.onNewDay(helped, gifted, written, wishes);
      if (r && r.moved) { buildResidents(); }    // 오가는 사람이 있었으면 자리를 다시 잡는다
    }
    if (global.DG.bug) { global.DG.bug.reset(); }   // 계절·시간대가 바뀌었을 수 있다
    if (global.DG.folk) { global.DG.folk._reset(); }  // 날이 바뀌면 이야기도 새로 뽑는다

    core.log('🌅 날이 밝았습니다 — 마을이 다시 여물었습니다', 'good');
    return true;
  }

  /* ── 걷기 ─────────────────────────────────────────────── */

  function bindKeys() {
    global.addEventListener('keydown', function (e) {
      keys[e.key.toLowerCase()] = true;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) >= 0) {
        if (e.target === document.body) { e.preventDefault(); }
      }
      if (e.key === ' ') { interact(); }
    });
    global.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
    global.addEventListener('blur', function () { keys = {}; });
  }

  function walkTo(x, y) { target = { x: x, y: y }; }

  function update(dt) {
    var dx = 0, dy = 0;
    if (keys.w || keys.arrowup) { dy -= 1; }
    if (keys.s || keys.arrowdown) { dy += 1; }
    if (keys.a || keys.arrowleft) { dx -= 1; }
    if (keys.d || keys.arrowright) { dx += 1; }
    if (dx || dy) { target = null; }
    else if (target) {
      var tx = target.x - player.x, ty = target.y - player.y;
      var td = Math.sqrt(tx * tx + ty * ty);
      if (td < 4) { target = null; }
      else { dx = tx / td; dy = ty / td; }
    }

    player.walking = !!(dx || dy);
    if (player.walking) {
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      /* 살금살금이면 느리다. 그 대신 벌레가 달아나지 않는다 (bug.js).
         벌에 쏘인 날은 하루 종일 걸음이 무겁다 */
      var sp = SPEED * (sneaking() ? 0.42 : 1) *
               (global.DG.bug && global.DG.bug.stung() ? 0.8 : 1) * speedMul();
      var nx = player.x + (dx / len) * sp * dt;
      var ny = player.y + (dy / len) * sp * dt;
      /* 축마다 따로 막는다 — 벽을 스치며 걸을 수 있게 */
      if (walkable(nx, player.y)) { player.x = nx; }
      if (walkable(player.x, ny)) { player.y = ny; }
      if (dx) { player.facing = dx > 0 ? 1 : -1; }
      player.phase += dt * 7;
    }
    /* 집 안에서는 마을이 돌지 않는다 — 주민도 벌레도 낚시도 밖의 일이다 */
    if (indoors) { return; }

    if (global.DG.bug) { global.DG.bug.update(dt); }
    /* 주민의 거동과 잡담은 folk.js 가 맡는다.
       **멀리 걷지는 않는다** — 제 자리 둘레만 돈다. 멀리 가면 부탁을 들어주려고
       사람을 찾아 헤매게 된다 */
    if (global.DG.folk) { global.DG.folk.update(dt); }

    /* 낚시터에서 멀어지면 줄이 끊긴다 (걷는 중인지와 무관하게 거리로만 본다) */
    if (fishing) {
      var pr = null, i;
      for (i = 0; i < props.length; i++) { if (props[i].id === fishing.propId) { pr = props[i]; } }
      if (pr && Math.hypot(pr.x - player.x, pr.y - player.y) > REACH * 1.4) {
        fishing = null;
        core.emit('village:fish', { state: 'miss' });
      }
    }
    tickFish();
  }

  /* ── 손이 닿는 것 ─────────────────────────────────────── */

  /**
   * 지금 상호작용할 수 있는 것 하나.
   * 밖에서는 **벌레가 가장 앞선다** — 달아나기 전에 손이 가야 하기 때문이다.
   * 그 다음이 사물, 그 다음이 주민.
   * 집 안에서는 가구와 문만 본다.
   */
  function focus() {
    var i, d;

    if (indoors) {
      var H = global.DG.home;
      var dr = H.door();
      var best2 = null, bd2 = REACH;
      var items = H.state().items;
      for (i = 0; i < items.length; i++) {
        d = Math.hypot(items[i].x - player.x, items[i].y - player.y);
        if (d < bd2) { bd2 = d; best2 = { type: 'furn', obj: items[i], dist: d }; }
      }
      d = Math.hypot(dr.x - player.x, dr.y - player.y);
      if (d < bd2) { best2 = { type: 'door', obj: dr, dist: d }; }
      return best2;
    }

    if (global.DG.bug) {
      var b = global.DG.bug.nearest(player.x, player.y);
      if (b) {
        return { type: 'bug', obj: b,
                 dist: Math.hypot(b.x - player.x, b.y - player.y) };
      }
    }

    var best = null, bd = REACH;
    for (i = 0; i < props.length; i++) {
      if (props[i].deco) { continue; }    // 숲 고리 장식(PLAN 40절 PHASE 3) — 손이 안 닿는다
      d = Math.hypot(props[i].x - player.x, props[i].y - player.y);
      if (d < bd) { bd = d; best = { type: 'prop', obj: props[i], dist: d }; }
    }
    for (i = 0; i < residents.length; i++) {
      d = Math.hypot(residents[i].x - player.x, residents[i].y - player.y);
      if (d < bd) { bd = d; best = { type: 'resident', obj: residents[i], dist: d }; }
    }
    return best;
  }

  /** 그 사물을 오늘 이미 썼나 */
  function spent(prop) {
    var def = VD.PROPS[prop.kind];
    if (!def || !def.gather) { return false; }
    if (!def.reset) { return false; }          // 낚시터는 몇 번이든
    return st().used[prop.id] === st().day;
  }

  function bagAdd(item, n) {
    var s = st();
    s.bag[item.key] = (s.bag[item.key] || 0) + (n || 1);
    s.gathered += (n || 1);
    /* 도감 — 한 번이라도 손에 넣은 것은 여기 남는다 (팔아도 지워지지 않는다) */
    if (!s.caught) { s.caught = {}; }
    s.caught[item.key] = (s.caught[item.key] || 0) + (n || 1);
  }

  /** 이 종류를 잡아 본 적이 있나 (도감) */
  function caughtCount(key) { return (st().caught || {})[key] || 0; }

  function bagCount(key) { return st().bag[key] || 0; }

  function bagList() {
    var s = st(), out = [], k;
    for (k in s.bag) {
      if (!Object.prototype.hasOwnProperty.call(s.bag, k) || !s.bag[k]) { continue; }
      var it = VD.item(k);
      if (it) { out.push({ item: it, n: s.bag[k] }); }
    }
    out.sort(function (a, b) { return b.item.price - a.item.price; });
    return out;
  }

  /* ── 낚시 ─────────────────────────────────────────────────
   * 낚시터만은 하루 몫이 없다(`reset: 0`). 그래서 즉시 획득으로 두면
   * **자동이 낚시터 하나를 무한히 반복한다** — 실제로 그랬다.
   * 원작(동물의숲)처럼 찌를 던지고 **입질을 기다렸다 당기는** 것으로 바꿨다.
   * 시간이 드니 수확이 정상 범위로 내려오고, 손으로 할 때도 할 일이 된다.
   *
   *   던진다 → 1.2~3.5초 뒤 입질 → 0.7초 안에 당기면 잡는다
   *   성급하면 놓치고, 늦어도 놓친다
   */

  var CAST_MIN = core.tuned('fish.castMin', 1200);
  var CAST_VAR = core.tuned('fish.castVar', 2300);
  var BITE_WINDOW = core.tuned('fish.biteWindow', 700);

  var fishing = null;      // { propId, biteAt, ends }

  function fishState() {
    if (!fishing) { return null; }
    var now = Date.now();
    return {
      propId: fishing.propId,
      state: now < fishing.biteAt ? 'wait' : (now <= fishing.ends ? 'bite' : 'late'),
      leftMs: Math.max(0, fishing.ends - now)
    };
  }

  function castLine(prop) {
    fishing = { propId: prop.id, biteAt: Date.now() + CAST_MIN + Math.random() * CAST_VAR, ends: 0 };
    fishing.ends = fishing.biteAt + BITE_WINDOW;
    core.emit('village:fish', { state: 'cast' });
    return { kind: 'cast', text: '🎣 찌를 던졌다 — 입질을 기다린다' };
  }

  /** 당긴다. 입질 창 안이면 잡는다 */
  function hookLine() {
    if (!fishing) { return null; }
    var now = Date.now();
    var early = now < fishing.biteAt;
    var late = now > fishing.ends;
    fishing = null;
    if (early) {
      core.emit('village:fish', { state: 'miss' });
      return { kind: 'miss', text: '성급했다 — 물고기가 달아났다' };
    }
    if (late) {
      core.emit('village:fish', { state: 'miss' });
      return { kind: 'miss', text: '늦었다 — 놓쳤다' };
    }
    var got = VD.pick('fish');
    if (!got) { return null; }
    bagAdd(got, 1);
    core.gainFeat(1, '낚시');
    core.gainExp(8);
    core.log(got.emoji + ' ' + got.name + ' 을 낚았다', 'good');
    core.emit('village:fish', { state: 'catch', item: got });
    core.emit('changed');
    core.persist();
    return { kind: 'gather', text: got.emoji + ' ' + got.name + ' ×1', item: got };
  }

  /** 시간이 지나 입질을 놓쳤으면 줄을 거둔다 (update 가 부른다) */
  function tickFish() {
    if (!fishing) { return; }
    if (Date.now() > fishing.ends + 400) {
      fishing = null;
      core.emit('village:fish', { state: 'miss' });
      core.emit('toast', '🎣 입질을 놓쳤다');
    }
  }

  /**
   * 손을 쓴다 — 사물이면 채집, 주민이면 말을 건다.
   * @returns {{kind, text}} 화면에 띄울 한 줄 (없으면 null)
   */
  function interact() {
    var f = focus();
    /* 손에 닿는 것이 없으면 하늘을 본다 — 별똥별이 흐르면 소원을 빈다 */
    if (!f) {
      if (!indoors && global.DG.town && global.DG.town.starNow()) {
        return global.DG.town.wish();
      }
      return null;
    }

    /* 집 안 — 문이면 나가고, 가구면 거둔다 */
    if (f.type === 'door') { return leaveHome(); }
    if (f.type === 'furn') { return global.DG.home.pickUp(f.obj); }

    if (f.type === 'bug') { return global.DG.bug.swing(f.obj); }
    if (f.type === 'resident') { return talk(f.obj); }

    var prop = f.obj, def = VD.PROPS[prop.kind];
    if (!def) { return null; }
    if (def.gather === 'fish') {
      /* 던져 놓은 줄이 있으면 당기고, 없으면 던진다 */
      if (fishing && fishing.propId === prop.id) { return hookLine(); }
      if (fishing) { fishing = null; }          // 다른 낚시터로 옮기면 줄을 거둔다
      return castLine(prop);
    }
    if (prop.kind === 'sapling') {
      return { kind: 'empty', text: '아직 묘목입니다 — ' + (prop.leftDays || 1) + '일 더' };
    }
    if (prop.kind === 'weed') { return pullWeed(prop); }
    if (prop.kind === 'home') { return enterHome(); }
    if (!def.gather) {
      if (prop.kind === 'museum') {
        core.emit('village:open', 'museum');
        return { kind: 'open', text: def.name, place: 'museum' };
      }
      if (prop.kind === 'tailor') {
        core.emit('village:open', 'wear');
        return { kind: 'open', text: def.name, place: 'wear' };
      }
      if (prop.kind === 'board' || prop.kind === 'pole') {
        core.emit('village:open', 'town');
        return { kind: 'open', text: def.name, place: 'town' };
      }
      core.emit('village:open', prop.kind);         // 전방·게시판·우편함은 화면이 받는다
      return { kind: 'open', text: def.name, place: prop.kind };
    }
    if (spent(prop)) {
      return { kind: 'empty', text: def.name + '은(는) 오늘 몫을 다 냈습니다' };
    }
    /* 나무는 열매만 내주지 않는다 — 원작처럼 가구·돈주머니·벌집이 섞인다 */
    if (prop.kind === 'tree' || prop.kind === 'pine') {
      var sh = shake(prop, def);
      if (sh) { return sh; }
    }
    /* 도구가 있어야 손이 가는 것 — 갈라진 자리엔 삽이 든다 */
    if (def.tool && !hasTool(def.tool)) {
      var td = VD.TOOLS[def.tool];
      return { kind: 'no', text: td.emoji + ' ' + td.name + ' 이(가) 없습니다 — 전방에서 살 수 있습니다' };
    }
    /* 교배로 핀 꽃은 드문 것을 낸다 */
    var got = (prop.hybrid && def.gather === 'flower') ? VD.pickHybrid() : VD.pick(def.gather);
    if (!got) { return null; }
    var n = 1 + (Math.random() < 0.25 ? 1 : 0);
    bagAdd(got, n);
    if (def.reset) { st().used[prop.id] = st().day; }
    core.gainFeat(1, '채집');
    core.gainExp(6);
    core.log(got.emoji + ' ' + got.name + ' ×' + n + ' 을 얻었다 (' + def.name + ')', 'good');
    core.emit('changed');
    core.persist();
    return { kind: 'gather', text: got.emoji + ' ' + got.name + ' ×' + n, item: got };
  }

  /* ── 잡초 ─────────────────────────────────────────────────
   * 원작에서 며칠 안 들르면 마을이 잡초로 뒤덮이던 그 자리다.
   * **날마다 는다.** 자리는 세이브에 남으니 뽑기 전에는 사라지지 않는다 —
   * 그래야 "며칠 안 왔구나" 가 눈에 보인다.
   */
  var WEED_MAX = core.tuned('weed.max', 40);
  var WEED_PER_DAY = core.tuned('weed.perDay', 3);   // 하루에 이 수 안에서 난다

  function growWeeds() {
    var s = st();
    if (!s.weeds) { s.weeds = []; }
    var n = 1 + Math.floor(core.hash2(s.day * 13 + 7, s.day % 521) * WEED_PER_DAY);
    for (var k = 0; k < n && s.weeds.length < WEED_MAX; k++) {
      for (var tries = 0; tries < 20; tries++) {
        var h1 = core.hash2(s.day * 31 + k * 97 + tries, s.day % 733 + k);
        var h2 = core.hash2(s.day % 617 + k * 53, s.day * 7 + tries * 11);
        var tx = Math.floor(h1 * W), ty = Math.floor(h2 * H);
        if (tileAt(tx, ty) !== 'grass') { continue; }
        s.weeds.push({ x: tx * TILE + TILE * 0.5, y: ty * TILE + TILE * 0.5 });
        break;
      }
    }
  }

  function pullWeed(prop) {
    var s = st();
    var i = parseInt(prop.id.slice(2), 10);
    if (isNaN(i) || !s.weeds[i]) { return null; }
    s.weeds.splice(i, 1);
    buildProps();
    syncPlanted();
    core.gainFeat(1, '잡초');
    core.emit('changed');
    core.persist();
    return { kind: 'weed', text: '🌿 잡초를 뽑았다 (남은 것 ' + s.weeds.length + ')' };
  }

  function weedCount() { return (st().weeds || []).length; }

  /* ── 전방이 자란다 ────────────────────────────────────────
   * 원작의 상점이 커지던 그 자리다. **판 금 누계**로 오른다 —
   * 마을을 부지런히 돌수록 전방이 커지고, 커진 전방은 물건이 늘고 값을 더 쳐준다.
   */
  var SHOP_TIERS = [
    { at: 0,      name: '전방',        add: 0, bonus: 1.00 },
    { at: 30000,  name: '저잣거리 전방', add: 1, bonus: 1.04 },
    { at: 120000, name: '상단(商團)',   add: 2, bonus: 1.08 },
    { at: 400000, name: '도가(都家)',   add: 3, bonus: 1.12 }
  ];

  function shopLevel() {
    var g = st().soldGold || 0, t = SHOP_TIERS[0], i;
    for (i = 0; i < SHOP_TIERS.length; i++) { if (g >= SHOP_TIERS[i].at) { t = SHOP_TIERS[i]; } }
    var idx = SHOP_TIERS.indexOf(t);
    return { n: idx, name: t.name, add: t.add, bonus: t.bonus,
             sold: g, next: SHOP_TIERS[idx + 1] || null };
  }

  /* ── 나무 흔들기 ──────────────────────────────────────────
   * 원작에서 나무를 흔들면 열매만 떨어지지 않는다. 가구가 걸리고, 돈주머니가 떨어지고,
   * 재수 없으면 **벌집**이 떨어진다. 그 셋이 있어야 나무 앞에서 손이 망설여진다.
   *
   * 가구와 돈은 **하루 몫이 있다**(가구 둘·돈 하나). 없으면 나무를 도는 것이
   * 곧 돈을 찍는 일이 된다 — 그건 원작도 막아 두었다.
   *
   * 여기는 사람이 누를 때만 도는 자리라 공용 난수를 써도 된다
   * (프레임마다 도는 bug.js·folk.js 와 다르다).
   */
  var SHAKE_BEE = core.tuned('shake.bee', 0.08);
  var SHAKE_FURN = core.tuned('shake.furn', 0.06);
  var SHAKE_GOLD = core.tuned('shake.gold', 0.05);
  var SHAKE_FURN_MAX = core.tuned('shake.furnMax', 2);

  function shake(prop, def) {
    var s = st();
    if (s.shakeDay !== s.day) { s.shakeDay = s.day; s.shakeFurn = 0; s.shakeGold = 0; }
    var r = Math.random();

    if (r < SHAKE_BEE && global.DG.bug) {
      s.used[prop.id] = s.day;                       // 벌집을 건드렸으니 오늘은 끝이다
      global.DG.bug.swarm(prop.x, prop.y);
      core.log('🐝 ' + def.name + ' 에서 벌집이 떨어졌다 — 벌떼가 쫓아온다!', 'warn');
      core.emit('changed');
      return { kind: 'bees', text: '🐝 벌집이다! 달아나거나 채로 받아친다' };
    }

    if (r < SHAKE_BEE + SHAKE_FURN) {
      /* 이 칸에 걸렸는데 하루 몫이 끝났으면 **열매로 떨어진다**.
         다음 칸(돈주머니)으로 흘려보내면 몫이 뒤섞인다 */
      if (s.shakeFurn >= SHAKE_FURN_MAX || !global.DG.home) { return null; }
      s.shakeFurn += 1;
      s.used[prop.id] = s.day;
      var all = VD.FURNITURE;
      var f = all[Math.floor(Math.random() * all.length)];
      global.DG.home.stockAdd(f.key, 1);
      core.gainFeat(2, '채집');
      core.log('🪑 ' + def.name + ' 에 걸려 있던 ' + f.name + ' 이(가) 떨어졌다', 'good');
      core.emit('changed');
      core.persist();
      return { kind: 'furn', text: '🪑 ' + f.name + ' 이(가) 떨어졌다 — 창고로' };
    }

    if (r < SHAKE_BEE + SHAKE_FURN + SHAKE_GOLD) {
      if (s.shakeGold) { return null; }
      s.shakeGold = 1;
      s.used[prop.id] = s.day;
      var gold = 300 + Math.floor(Math.random() * 600);
      core.save.player.gold += gold;
      core.gainFeat(2, '채집');
      core.log('🪙 ' + def.name + ' 에서 돈주머니가 떨어졌다 (+' + core.fmt(gold) + ')', 'good');
      core.emit('changed');
      core.persist();
      return { kind: 'gold', text: '🪙 돈주머니! +' + core.fmt(gold) };
    }
    return null;                                     // 여느 때처럼 열매가 떨어진다
  }

  /* ── 주민 ─────────────────────────────────────────────── */

  function friendOf(id) { return st().friend[id] || 0; }

  /** 부탁 하나를 만든다 — 오늘 안에 가져오면 금과 친밀도 */
  /**
   * 부탁 하나를 만든다.
   * **지금 나는 것 중에서만** 청한다(`VD.pick`) — 표에서 그냥 뽑으면 한겨울에 매실을,
   * 맑은 날에 미꾸라지를 가져오라고 한다. 오늘 안에 채울 수 없는 부탁은 부탁이 아니다.
   */
  function makeRequest(id) {
    /* 청하는 갈래는 **성격이 정한다** — 학구는 광물과 화석을, 다정은 꽃을 청한다.
       사람마다 청하는 것이 늘 비슷해야 그 사람으로 기억된다 */
    var t = global.DG.folk ? global.DG.folk.typeOf(id) : null;
    var cats = t ? t.req : ['fruit', 'nut', 'ore', 'flower', 'fish'];
    var cat = core.pick(cats);
    var want = VD.pick(cat);
    if (!want) { want = VD.pick('fruit') || VD.ITEMS.fruit[0]; }
    var n = core.pick(VD.REQUEST_N);
    return { want: want.key, n: n, done: false };
  }

  function requestOf(id) {
    var s = st();
    if (!s.requests[id]) { s.requests[id] = makeRequest(id); }
    return s.requests[id];
  }

  /** 말을 건다 — 부탁을 받거나, 채웠으면 건네고 보상을 받는다 */
  function talk(res) {
    var s = st();
    var req = requestOf(res.id);
    var it = VD.item(req.want);

    /* 설날 — 첫 인사는 세배다. 사람마다 한 번, 정이 깊을수록 두둑하다 */
    if (global.DG.town && global.DG.town.isNewYear()) {
      if (!s.bow) { s.bow = {}; }
      if (s.bow[res.id] !== s.day) {
        s.bow[res.id] = s.day;
        var money = 500 + friendOf(res.id) * 150;
        core.save.player.gold += money;
        core.gainFeat(2, '세배');
        core.log('🧧 ' + res.ref.name + ' 에게 세배했다 — 세뱃돈 🪙 +' + core.fmt(money), 'good');
        core.emit('changed');
        core.persist();
        return { kind: 'bow', name: res.ref.name,
                 text: '새해 복 많이 받으시오. 🧧 🪙 +' + core.fmt(money) };
      }
    }

    /* 떠날 뜻을 비친 사람 — 붙잡는 것이 다른 무엇보다 먼저다.
       부탁을 들어준 뒤라야 붙잡힌다(mail.keep 이 그 판정을 갖는다) */
    var lv = global.DG.mail ? global.DG.mail.leavingOf(res.id) : null;
    if (lv) {
      var kept = global.DG.mail.keep(res.id);
      if (kept && kept.kind === 'keep') {
        return { kind: 'keep', name: res.ref.name, text: kept.text };
      }
      return { kind: 'leaving', name: res.ref.name, req: req, item: it,
               text: '떠날 뜻을 굳혔소 (' + lv.left + '일 남음). ' +
                     (kept ? kept.text : '') };
    }

    var F = global.DG.folk;
    var ty = F ? F.typeOf(res.id) : null;

    if (req.done) {
      return { kind: 'talk', name: res.ref.name,
               text: ty ? ty.idle
                        : '오늘은 고마웠소. ' + VD.phaseOf(new Date().getHours()).hello + '.' };
    }
    if (bagCount(req.want) >= req.n) {
      s.bag[req.want] -= req.n;
      req.done = true;
      var gold = it.price * req.n * 2;
      var fame = 8 + req.n * 3;
      core.save.player.gold += gold;
      core.save.player.fame += fame;
      s.friend[res.id] = friendOf(res.id) + 1;
      s.helped += 1;
      core.gainFeat(4, '심부름');
      core.gainExp(18);
      core.log('🤝 ' + res.ref.name + ' 의 부탁을 들어주었다 — 🪙 +' + core.fmt(gold) +
        ' · 🎖️ +' + fame + ' · 친밀도 ' + s.friend[res.id], 'good');
      core.emit('changed');
      core.persist();
      return { kind: 'reward', name: res.ref.name,
               text: (ty ? ty.done + ' ' : '') +
                     it.emoji + ' ' + it.name + ' ×' + req.n + ' — 🪙 +' + core.fmt(gold) };
    }
    return { kind: 'request', name: res.ref.name, req: req, item: it,
             text: ty ? F.say(ty.ask, it, req.n, bagCount(req.want))
                      : it.emoji + ' ' + it.name + ' ' + req.n + '개를 구해 줄 수 있겠소? (' +
                        bagCount(req.want) + '/' + req.n + ')' };
  }

  /* ── 선물 ─────────────────────────────────────────────────
   * 원작에서 정을 쌓는 두 번째 길이다. 부탁은 그 사람이 청한 것을 가져다 주는 것이고,
   * 선물은 **내가 골라서** 주는 것이다.
   *
   * 사람마다 좋아하는 갈래가 있다(인물 id 로 정해지니 늘 같다).
   * 좋아하는 것을 주면 정이 훨씬 는다 — 아무거나 안겨서는 안 된다.
   * 사람마다 **하루 한 번**이다.
   */
  var GIFT_CATS = ['fruit', 'nut', 'ore', 'flower', 'fish', 'bug', 'shell', 'fossil'];

  function idNum(id) {
    var n = 0;
    for (var i = 0; i < id.length; i++) { n = (n * 31 + id.charCodeAt(i)) % 100000; }
    return n;
  }

  /** 이 사람이 좋아하는 갈래 — **성격이 정한다** */
  function giftLike(id) {
    var t = global.DG.folk ? global.DG.folk.typeOf(id) : null;
    if (t && t.like) { return t.like; }
    var n = idNum(id);
    return GIFT_CATS[Math.floor(core.hash2(n, n % 977 + 13) * GIFT_CATS.length) % GIFT_CATS.length];
  }

  function giftedToday(id) { return st().gifted[id] === st().day; }

  /** 곁에 있는 주민에게 가방의 것 하나를 준다 */
  function giveGift(heroId, key) {
    var s = st(), it = VD.item(key), i, res = null;
    for (i = 0; i < residents.length; i++) { if (residents[i].id === heroId) { res = residents[i]; } }
    if (!res) { return { kind: 'no', text: '그 사람은 이 마을에 없습니다' }; }
    if (Math.hypot(res.x - player.x, res.y - player.y) > REACH) {
      return { kind: 'no', text: res.ref.name + ' 곁으로 가야 건넬 수 있습니다' };
    }
    if (!it) { return { kind: 'no', text: '없는 물건입니다' }; }
    if (bagCount(key) < 1) { return { kind: 'no', text: '가진 것이 없습니다' }; }
    if (giftedToday(heroId)) {
      return { kind: 'no', text: '오늘은 이미 ' + res.ref.name + ' 에게 건넸습니다' };
    }

    var like = giftLike(heroId);
    var loved = it.cat === like;
    var up = (loved ? 3 : 1) + (it.price >= 200 ? 1 : 0);

    s.bag[key] -= 1;
    s.gifted[heroId] = s.day;
    s.friend[heroId] = friendOf(heroId) + up;
    core.save.player.fame += up * 5;
    core.gainFeat(3, '선물');
    core.gainExp(10);
    core.log('🎁 ' + res.ref.name + ' 에게 ' + it.emoji + ' ' + it.name + ' 을(를) 건넸다 — ' +
      (loved ? '아주 반긴다! ' : '') + '친밀도 +' + up + ' (' + s.friend[heroId] + ')', 'good');
    core.emit('changed');
    core.persist();
    return { kind: 'gift', name: res.ref.name, loved: loved,
             text: (loved ? '아주 반긴다! ' : '고맙게 받는다. ') + '친밀도 +' + up };
  }

  /* ── 전방 ─────────────────────────────────────────────── */

  function hasTool(key) { return !!(st().tools && st().tools[key]); }

  /**
   * 도구를 산다 — 한 번 사면 계속 쓴다.
   * 원작이 잠자리채 없이는 벌레를 못 잡게 해 둔 그 자리다.
   */
  function buyTool(key) {
    var t = VD.TOOLS[key];
    if (!t) { return { kind: 'no', text: '없는 물건입니다' }; }
    if (hasTool(key)) { return { kind: 'no', text: '이미 가지고 있습니다' }; }
    if (core.save.player.gold < t.price) {
      return { kind: 'no', text: '금이 모자랍니다 (🪙 ' + core.fmt(t.price) + ')' };
    }
    core.save.player.gold -= t.price;
    st().tools[key] = true;
    core.log(t.emoji + ' ' + t.name + ' 을(를) 샀다 — ' + t.desc, 'good');
    core.emit('changed');
    core.persist();
    return { kind: 'buy', text: t.emoji + ' ' + t.name + ' 을(를) 샀다' };
  }

  /** 하나 판다 — **행사날에는 그 갈래가 비싸게 팔린다** */
  function sell(key, n) {
    var s = st(), it = VD.item(key);
    if (!it) { return 0; }
    n = Math.min(n || 1, bagCount(key));
    if (!n) { return 0; }
    s.bag[key] -= n;
    var mul = global.DG.town ? global.DG.town.priceMul(it.cat) : 1;
    var lv = shopLevel();
    var gold = Math.round(it.price * n * mul * lv.bonus);
    core.save.player.gold += gold;
    s.sold += n;
    s.soldGold = (s.soldGold || 0) + gold;         // 전방이 자라는 기준
    core.log('🪙 ' + it.name + ' ×' + n + ' 을 팔았다 (+' + core.fmt(gold) + ')' +
      (mul > 1 ? ' — 오늘은 값이 좋다' : ''), 'info');
    core.emit('changed');
    core.persist();
    return gold;
  }

  /** 부탁에 필요한 것만 남기고 전부 판다 */
  function sellAll() {
    var s = st(), keep = {}, k, id, total = 0;
    for (id in s.requests) {
      if (!Object.prototype.hasOwnProperty.call(s.requests, id)) { continue; }
      var r = s.requests[id];
      if (!r.done) { keep[r.want] = (keep[r.want] || 0) + r.n; }
    }
    var list = bagList();
    for (var i = 0; i < list.length; i++) {
      k = list[i].item.key;
      var n = list[i].n - (keep[k] || 0);
      if (n > 0) { total += sell(k, n); }
    }
    return total;
  }

  function status() {
    var s = st();
    var ph = VD.phaseOf(new Date().getHours());
    return {
      phase: ph, day: s.day,
      bag: bagList(), gathered: s.gathered, sold: s.sold, helped: s.helped,
      residents: residents.length, focus: focus(),
      fishing: fishState(),
      season: VD.season(),
      weather: VD.weather(),
      planted: (s.planted || []).length,
      plantable: plantable(),
      canPlant: canPlantHere(),
      indoors: indoors,
      sneak: sneaking(),
      net: !!(s.tools && s.tools.net),
      spade: !!(s.tools && s.tools.spade),
      stung: global.DG.bug ? global.DG.bug.stung() : false,
      bugs: global.DG.bug ? global.DG.bug.list().length : 0,
      bugNow: global.DG.bug ? global.DG.bug.nowNames() : [],
      mail: global.DG.mail ? global.DG.mail.status() : null,
      town: global.DG.town ? global.DG.town.status() : null,
      turnip: global.DG.turnip ? global.DG.turnip.status() : null,
      weeds: weedCount(), shop: shopLevel(),
      wear: global.DG.wear ? global.DG.wear.status() : null,
      chat: global.DG.folk ? global.DG.folk.status() : null
    };
  }

  global.DG = global.DG || {};
  global.DG.village = {
    W: W, H: H, TILE: TILE, REACH: REACH,
    init: init, update: update, bindKeys: bindKeys, walkTo: walkTo,
    tileAt: tileAt, walkable: walkable,
    focus: focus, interact: interact, spent: spent,
    talk: talk, requestOf: requestOf, friendOf: friendOf,
    bagList: bagList, bagCount: bagCount, bagAdd: bagAdd, sell: sell, sellAll: sellAll,
    caughtCount: caughtCount, shake: shake, speedMul: speedMul,
    weedCount: weedCount, pullWeed: pullWeed, growWeeds: growWeeds, WEED_MAX: WEED_MAX,
    shopLevel: shopLevel, SHOP_TIERS: SHOP_TIERS,
    giveGift: giveGift, giftLike: giftLike, giftedToday: giftedToday,
    buildProps: buildProps, forestMargin: forestMargin, biomeAt: biomeAt, BIOMES: BIOMES,
    lakeCenter: lakeCenter, inLake: inLake,
    indoors: inside, enterHome: enterHome, leaveHome: leaveHome,
    sneaking: sneaking, toggleSneak: toggleSneak, setAutoSneak: setAutoSneak,
    buyTool: buyTool, hasTool: hasTool,
    rollDay: rollDay, today: today, status: status, state: st,
    castLine: castLine, hookLine: hookLine, fishState: fishState,
    BITE_WINDOW: BITE_WINDOW,
    plant: plant, plantable: plantable, canPlantHere: canPlantHere,
    syncPlanted: syncPlanted, PLANT_DAYS: PLANT_DAYS, HYBRID_NEAR: HYBRID_NEAR,
    /** 화면 전용 — 상태를 직접 읽는다 (쓰지는 말 것) */
    raw: function () {
      return { player: player, props: props, residents: residents,
               fishing: fishing };
    }
  };
})(window);
