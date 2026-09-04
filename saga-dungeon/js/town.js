/**
 * 마을(村) — 판이 시작하고, 돌아오는 자리
 * ---------------------------------------------------------------
 * 예전 첫 화면은 카드 한 장이었다. 층을 버튼으로 고르고 난도를 버튼으로 골랐다.
 * 그런데 원작(디아블로)에서 바깥은 **메뉴가 아니라 장소**다 — 야영지를 걸어
 * 다니며 대장장이에게 가고, 역참 돌을 밟고, 굴혈로 걸어 들어간다.
 * 고르는 것이 아니라 **가는 것**이다. 그 차이가 이 게임의 결을 정한다.
 *
 * 그래서 마을을 던전과 **같은 공간**으로 만들었다. 그림·조작·조명·조작판은
 * 전부 dungeon-view.js 것을 그대로 쓴다 — 이 파일이 하는 일은 dungeon.js 와
 * **같은 모양의 상태**를 내놓는 것뿐이다(raw · status · fx · setInput ·
 * moveTo · update). 화면은 자기가 마을을 그리는지 던전을 그리는지 몰라도 된다.
 *
 * 여기에 판정은 없다. 적도 피해도 없다 — 마을에서 하는 일은 걷는 것과 닿는 것뿐이다.
 *
 * ── 오버월드(PLAN 28-1절, 2026-09-02 구현) ──────────────────────────
 * 마을은 이제 **넷**이다 — 모루골(중심) · 갈대나루(동, 나루터) · 자작재(북, 산길) ·
 * 소금벌(남, 염전). 던전 굴혈은 모루골에만 있다(원작에서도 야영지가 하나다).
 * 마을 사이는 "들길" 표식(들판 출구, `exit_<대상마을id>`)으로 잇는다 — 이미
 * 검증된 마을 필드전투 확장(`dungeon.js`의 fieldBoundPlayer 등)을 그대로 써서
 * 방 밖 들판을 충분히 걸어야 닿는 자리에 둔다. 별(★)형 연결이다 — 위성 마을
 * 셋은 서로 안 이어지고 모루골로만 통한다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  /* 던전 방과 **같은 크기**였다(560×380). 처음에는 720×460 으로 넓게 잡았는데,
     폰에서 그만큼 작게 그려졌다 — 아이소메트릭 마름모의 가로세로 비는 1.83:1 로
     고정이라(IX/IY), 폰 세로 화면에서는 늘 **가로가 병목**이다. 방이 넓어지면
     그 병목에 맞춰 축소되어 사람이 개미만 해진다. 그래서 던전과 같은 스케일로
     줄이고, 대신 사람을 3×3 으로 촘촘히 앉혔었다.
     (390px 실측: 이 크기에서 마름모 가로가 화면의 1.2배 — 거의 한눈에 들어온다)

     **2026-08-30 — 데스크톱에서만 다시 키운다.** 폰의 그 병목은 화면이 좁아서
     생기는 문제지 방 크기 자체의 문제가 아니다 — `dungeon-view.js`(2D)의
     `fit`도 `dungeon3d.js`(3D)의 `camAim` 거리도 **화면·방 크기에 맞춰 저절로
     다시 잡힌다**(둘 다 순수하게 W·H·화면 크기의 함수다). 그래서 화면이 넉넉히
     넓은(가로가 세로보다 크고 900px 이상인) 곳에서만 기준 크기의 1.4배로 켠다 —
     폰 세로 화면은 `BASE_W`·`BASE_H` 그대로다. NPC·표식·장식은 전부 `BASE_W`·
     `BASE_H` 기준 좌표로 적어 두고 `scalePt` 로 실제 방 크기에 맞춰 늘린다 —
     그래야 두 크기에서 배치 비율이 그대로 유지된다. */
  var BASE_W = 560, BASE_H = 380, WALL = 30, P_R = 13;
  function wideDesktop() {
    try { return global.innerWidth >= 900 && global.innerWidth > global.innerHeight; }
    catch (e) { return false; }
  }
  var DESK_SCALE = 1.4;
  var wide = wideDesktop();
  var ROOM_W = wide ? Math.round(BASE_W * DESK_SCALE) : BASE_W;
  var ROOM_H = wide ? Math.round(BASE_H * DESK_SCALE) : BASE_H;
  var SX = ROOM_W / BASE_W, SY = ROOM_H / BASE_H;
  function scalePt(x, y) { return { x: x * SX, y: y * SY }; }
  var SPD = 158;                        // 마을 걸음 (던전보다 조금 빠르다 — 볼일만 보는 곳이라)
  var RSCALE = (SX + SY) / 2;           // 닿는 판정 반경도 방 크기를 따라간다
  var TALK_R = 40 * RSCALE;             // 이만큼 다가서면 말이 걸린다
  var LEAVE_R = 58 * RSCALE;            // 이만큼 떨어져야 다시 걸린다 (문턱 — 아래 armed 설명)

  /**
   * 마을 사람 정의 — 이름·그림·닿았을 때 여는 시트는 **직군 하나마다 하나뿐**이다
   * (여러 마을이 같은 직군을 나눠 들 수 있게). 어느 마을에 서 있는지는 아래
   * TOWNS[id].npcs 가 좌표로 정한다.
   *   sheet   닿으면 열리는 시트 (ui.js 의 그것과 같은 이름)
   *   trait   생김새를 정한다 (sprite.js 의 ruleLook 이 읽는다)
   *   color   옷 빛깔 — 진영색을 쓰지 않는다. 마을 사람은 어느 진영도 아니다
   */
  var NPC_DEFS = {
    captain: { name: '군교(軍校)', emoji: '⚔️', sheet: 'party',
      color: '#8a6f4e', trait: 'might',  rarity: 3,
      line: '부대를 세우십시오. 앞에 설 자를 고르는 일이 먼저입니다.' },
    quarter: { name: '치중(輜重)', emoji: '🎒', sheet: 'gear',
      color: '#6b7383', trait: 'virtue', rarity: 2,
      line: '주워 오신 것을 봐 드리지요. 걸치실 것과 파실 것을 가릅니다.' },
    master:  { name: '교두(敎頭)', emoji: '📜', sheet: 'skill',
      color: '#5c6b8a', trait: 'wisdom', rarity: 4,
      line: '손에 든 것이 무예를 정합니다. 각궁을 들면 궁장의 길입니다.' },
    smith:   { name: '야장(冶匠)', emoji: '🔨', sheet: 'craft',
      color: '#7a4a32', trait: 'might',  rarity: 3,
      line: '구멍 뚫린 물건을 가져오시오. 박아 드리리다.' },
    pedlar:  { name: '행상(行商)', emoji: '🧺', sheet: 'vendor',
      color: '#6f5a8a', trait: 'virtue', rarity: 2,
      line: '한 회차마다 물건이 바뀝니다. 오늘 것을 보시겠소?' },
    scribe:  { name: '사관(史官)', emoji: '📖', sheet: 'dex',
      color: '#4e6b5a', trait: 'wisdom', rarity: 3,
      line: '이 판에서 만난 인물을 적어 두었습니다.' }
  };

  /**
   * 표식 셋 — 사람이 아니라 **밟는 것**이다. 모루골에만 있다(원작에도 야영지가
   * 하나뿐이라 굴혈·역참·결사비도 하나씩이다).
   *   gate      굴혈 입구. 밟으면 제1층부터 (원작의 던전 입구 — 고르는 창이 없다)
   *   waypoint  역참 돌. 밟으면 밟아 둔 층 목록이 뜬다 (원작의 웨이포인트가 정확히 이것)
   *   vow       결사비. 되돌릴 수 없는 것이라 확인을 한 번 받는다
   */
  var MARKS = [
    /* 굴혈은 **가운데 아래**다 — 화면 앞쪽이라 손이 가장 먼저 닿는 자리고,
       원작에서도 야영지의 출구가 그쯤이다 */
    { key: 'gate',     name: '굴혈(窟穴)', emoji: '🕳️', x: 280, y: 300 },
    /* 소용돌이다. 예전에 돌(🪨)을 썼다가 **흰 사각형**으로 떴다 —
       U+1FAA8 은 글꼴에 없는 기기가 아직 흔하다. 원작의 웨이포인트가
       파란 소용돌이 포탈이므로 이쪽이 그림으로도 맞다. */
    { key: 'waypoint', name: '역참(驛站)', emoji: '🌀', x: 280, y: 180 },
    { key: 'vow',      name: '결사비(決死碑)', emoji: '☠️', x: 110, y: 310 }
  ];

  /* 모루골 장식 — 매번 같아야 한다. 집이 매번 옮겨 다니면 그건 마을이 아니다.
     그래서 던전처럼 굴리지 않고 **박아 둔다**. */
  var DECOR_MORU = [
    { t: 'torch',  x: 120, y: WALL - 4, seed: 0.4 },
    { t: 'torch',  x: 290, y: WALL - 4, seed: 2.1 },
    { t: 'torch',  x: 460, y: WALL - 4, seed: 4.3 },
    { t: 'torch',  x: WALL - 4, y: 130, seed: 1.2 },
    { t: 'torch',  x: WALL - 4, y: 280, seed: 5.0 },
    /* 모닥불 하나 — 벽 횃불과 같은 그림(drawTorch)이지만 **바닥 한복판**에 둔다.
       불이 없으면 사람만 아홉 서 있는 빈 마당으로 보인다. 원작 야영지의 그 불이다.
       사람이 앉은 3×3 격자의 **빈 칸**에만 놓을 수 있다 — 아홉 자리가 다 찼으니
       빈 칸은 넷뿐이고, 그중 하나는 **서는 자리**(195,240)라 비워 둔다.
       둘을 놓았다가 불이 내 머리 위에서 타올랐다. */
    { t: 'torch',  x: 370, y: 145, seed: 3.1 },
    { t: 'pillar', x: 370, y: 255 },
    { t: 'pillar', x: 190, y: 130 },
    { t: 'crack',  x: 330, y: 210, a: 0.6, len: 36 },
    { t: 'crack',  x: 230, y: 150, a: 2.2, len: 26 },
    /* 집 셋 · 우물 · 대장간 — 3D로 세울 때(`dungeon3d.js` `TOWN3D`) 빈 돌방이
       아니라 진짜 마을로 보이게 한다. */
    { t: 'house', x: 60, y: 60, h: 130, seed: 11 },
    { t: 'house', x: 500, y: 60, h: 130, seed: 23 },
    { t: 'house', x: 55, y: 235, h: 120, seed: 37 },
    { t: 'well', x: 280, y: 250, h: 34 },
    { t: 'blacksmith', x: 520, y: 235, h: 140 },
    /* 2026-09-04 — SAGA WEB.md "E. 건물"의 "탑". 모루골(중심 마을)에만
       하나 세운다 — 위성 마을은 각자 여관·마방·방앗간으로 이미 갈렸다.
       **밟은 함정**: 처음엔 (190,300)에 뒀는데, 스폰 자리(195,240, 위
       player 정의부 주석 참고)에서 겨우 60 떨어져 있었다 — 탑 높이(209)에
       비해 너무 가까워, 시작하자마자 카메라가 탑 벽에 거의 박혀 화면
       전체가 돌벽으로 뒤덮이는 것으로 보였다(스크린샷으로 재현·확인함).
       스폰에서 258 떨어지고 다른 장식과도 87 이상 떨어진 자리로 옮겼다. */
    { t: 'belltower', x: 373, y: 53, h: 110 }
  ];

  /**
   * 마을 넷 — id·이름·색감(테마)·거기 사는 직군·장식·들길(exits) 을 정의한다.
   * 좌표는 전부 BASE_W·BASE_H 기준(scalePt 로 실제 방 크기에 맞춘다).
   *   exits[].dir   그 마을 안에서 이 들길이 나가는 방향(N/E/S/W) — exitPoint 가 읽는다
   *   exits[].to    들길 끝에 닿는 마을 id
   * 위성 마을(갈대나루·자작재·소금벌)은 모루골로만 통한다(별형 연결) —
   * 서로 안 잇는다. 상점 배치는 모루골의 여섯 직군 중 셋만 간추렸다.
   */
  var TOWNS = {
    moru: {
      id: 'moru', name: '모루골', dirFromHub: null,
      theme: { name: '모루골', floor: '#3b322a', wall: '#5c4e3d',
        tint: 'rgba(210,170,100,0.10)', town: true },
      hasGate: true,
      npcs: [
        { key: 'captain', x: 110, y: 90 },  { key: 'quarter', x: 280, y: 70 },
        { key: 'master',  x: 450, y: 95 },  { key: 'smith',   x: 450, y: 200 },
        { key: 'pedlar',  x: 450, y: 305 }, { key: 'scribe',  x: 110, y: 200 }
      ],
      decor: DECOR_MORU,
      exits: [ { dir: 'N', to: 'jajak' }, { dir: 'E', to: 'galdae' }, { dir: 'S', to: 'sogeum' } ]
    },
    galdae: {
      id: 'galdae', name: '갈대나루', dirFromHub: 'E',
      theme: { name: '갈대나루', floor: '#28383c', wall: '#3d5458',
        tint: 'rgba(120,190,205,0.12)', town: true },
      hasGate: false,
      npcs: [ { key: 'quarter', x: 170, y: 150 }, { key: 'pedlar', x: 390, y: 150 },
              { key: 'scribe',  x: 280, y: 280 } ],
      decor: [
        { t: 'torch', x: 120, y: WALL - 4, seed: 0.7 }, { t: 'torch', x: 440, y: WALL - 4, seed: 3.2 },
        { t: 'pillar', x: 280, y: 90 }, { t: 'crack', x: 200, y: 230, a: 1.1, len: 30 },
        /* 2026-09-04 — SAGA WEB.md 감사(PLAN 11절 "맵의 밀도"). NPC 셋만 서 있는
           빈 돌방이던 위성 마을 셋에 집·우물을 더한다(모루골과 같은 GLB, 씨앗은
           자리 좌표로 저절로 갈린다 — `dungeon3d.js` house/well 렌더 참고) */
        { t: 'house', x: 60, y: 60, h: 130 },
        /* 이어서(2026-09-04) — 셋 다 집+우물뿐이라 테마가 안 살아서, 나루터답게
           나그네 쉼터(여관)를 하나씩 다르게 얹었다(자작재=마방, 소금벌=방앗간) */
        { t: 'inn', x: 500, y: 60, h: 130 },
        { t: 'well', x: 280, y: 330, h: 34 }
      ],
      exits: [ { dir: 'W', to: 'moru' } ]
    },
    jajak: {
      id: 'jajak', name: '자작재', dirFromHub: 'N',
      theme: { name: '자작재', floor: '#333c2c', wall: '#4a5940',
        tint: 'rgba(150,185,110,0.10)', town: true },
      hasGate: false,
      npcs: [ { key: 'captain', x: 170, y: 150 }, { key: 'smith', x: 390, y: 150 },
              { key: 'master',  x: 280, y: 280 } ],
      decor: [
        { t: 'torch', x: 120, y: WALL - 4, seed: 1.4 }, { t: 'torch', x: 440, y: WALL - 4, seed: 4.6 },
        { t: 'pillar', x: 200, y: 210 }, { t: 'pillar', x: 360, y: 210 },
        { t: 'house', x: 60, y: 60, h: 130 }, { t: 'stable', x: 500, y: 60, h: 130 },
        { t: 'well', x: 280, y: 330, h: 34 }
      ],
      exits: [ { dir: 'S', to: 'moru' } ]
    },
    sogeum: {
      id: 'sogeum', name: '소금벌', dirFromHub: 'S',
      theme: { name: '소금벌', floor: '#4a4636', wall: '#6b6550',
        tint: 'rgba(230,220,180,0.12)', town: true },
      hasGate: false,
      npcs: [ { key: 'pedlar', x: 170, y: 150 }, { key: 'quarter', x: 390, y: 150 },
              { key: 'captain', x: 280, y: 280 } ],
      decor: [
        { t: 'torch', x: 120, y: WALL - 4, seed: 2.3 }, { t: 'torch', x: 440, y: WALL - 4, seed: 5.8 },
        { t: 'crack', x: 220, y: 120, a: 0.4, len: 40 }, { t: 'pillar', x: 340, y: 230 },
        { t: 'house', x: 60, y: 60, h: 130 }, { t: 'mill', x: 500, y: 60, h: 130 },
        { t: 'well', x: 280, y: 330, h: 34 }
      ],
      exits: [ { dir: 'N', to: 'moru' } ]
    }
  };
  var TOWN_ORDER = ['moru', 'galdae', 'jajak', 'sogeum'];

  function dirEmoji(dir) {
    return dir === 'N' ? '⬆️' : dir === 'S' ? '⬇️' : dir === 'E' ? '➡️' : '⬅️';
  }

  /* DECOR 는 그대로 두고(BASE_W·BASE_H 기준 좌표), 실제 방 크기에 맞춘 사본을
     마을마다 한 번씩만 만들어 캔다 — 순수 배경이라 정확히 맞을 필요는 없지만,
     방마다 다시 계산할 것도 아니다. h·seed·a·len 은 좌표가 아니라 그대로 둔다. */
  var _decorCache = {};
  function scaledDecorFor(cfg) {
    if (_decorCache[cfg.id]) { return _decorCache[cfg.id]; }
    var arr = cfg.decor.map(function (d) {
      var p = scalePt(d.x, d.y), o = {};
      for (var k in d) { if (Object.prototype.hasOwnProperty.call(d, k)) { o[k] = d[k]; } }
      o.x = p.x; o.y = p.y;
      return o;
    });
    _decorCache[cfg.id] = arr;
    return arr;
  }

  var CURRENT_TOWN = null;              // 첫 enter() 에서 세이브(core.save.town.current)로 정한다
  var room = null;                      // 마을 방 (마을을 옮길 때마다 다시 짓는다)
  var player = null;
  var on = false;
  var input = { dx: 0, dy: 0 };
  var target = null;                    // 걸어가는 목표 {x, y}
  var fx = [];
  var armed = {};                       // 닿아서 이미 발동한 것 — 벗어나야 풀린다

  /* 마을 둘레 필드 전투 — 던전이 이미 검증해 둔 메커니즘(dungeon.js 의
     fieldBoundPlayer·spawnFieldRoamers·stepFieldCombat)을 그대로 빌려 쓴다.
     체력·투사체는 마을 자신의 것이라 여기 module 레벨에 붙들고 있는다 —
     raw() 는 매 틱 새 객체를 만들지만 이 배열·수는 그 안에서 참조만 한다. */
  var fhp = 1, fhpMax = 1, fmp = 100, fmpMax = 100;
  var fshots = [], ffoeShots = [];
  var fieldSpawnCd = 4;                 // 던전과 같은 4초 주기(dungeon.js FIELD 보충과 동일)

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function D() { return global.DG.dungeon; }
  function cfgOf(id) { return TOWNS[id] || TOWNS.moru; }
  function currentCfg() { return cfgOf(CURRENT_TOWN); }
  function currentTheme() { return currentCfg().theme; }

  /**
   * 들길이 나가는 자리 — 방 밖 들판, 필드 반경(D().fieldRadiusUnits())의
   * 70% 지점. 정확히 그 반경 끝에 두면 걸어서 닿기도 전에 값이 흔들릴 수
   * 있어(창 크기·손잡이에 따라 반경 자체가 바뀐다) 안쪽으로 여유를 둔다.
   */
  var FIELD_EXIT_FRAC = 0.7;
  function exitPointRaw(dir) {
    var R = D().fieldRadiusUnits();
    var lo = WALL + P_R, hiX = ROOM_W - WALL - P_R, hiY = ROOM_H - WALL - P_R;
    var cx = ROOM_W / 2, cy = ROOM_H / 2, off = R * FIELD_EXIT_FRAC;
    if (dir === 'N') { return { x: cx, y: lo - off }; }
    if (dir === 'S') { return { x: cx, y: hiY + off }; }
    if (dir === 'E') { return { x: hiX + off, y: cy }; }
    return { x: lo - off, y: cy };                      // 'W'
  }
  /**
   * 들판 소품(나무·바위 따위)이 하필 그 자리에 있으면 옆으로 밀어 비켜 준다 —
   * 절차 생성 씨앗이 마을 이름마다 다르므로 우연히 막힌 자리가 나올 수 있다.
   */
  function safePoint(x, y, theme) {
    if (!D().fieldBlockedAt) { return { x: x, y: y }; }
    var ctx = { roomW: ROOM_W, roomH: ROOM_H, pr: P_R, floor: 0, roomIdx: undefined, theme: theme };
    if (!D().fieldBlockedAt(x, y, ctx)) { return { x: x, y: y }; }
    var tries = 10, i;
    for (i = 1; i <= tries; i++) {
      var step = i * 26, sign = (i % 2 === 0) ? 1 : -1;
      var tx = x + sign * step, ty = y + sign * step * 0.4;
      if (!D().fieldBlockedAt(tx, ty, ctx)) { return { x: tx, y: ty }; }
    }
    return { x: x, y: y };                              // 못 찾으면 원래 자리(드묾)
  }
  function exitPoint(dir, theme) {
    var p = exitPointRaw(dir);
    return safePoint(p.x, p.y, theme);
  }
  /** 건너온 마을에서 들어서는 자리 — 들길 표식보다 살짝 안쪽(곧바로 다시 안 나가게) */
  function entryPoint(dir, theme) {
    var e = exitPoint(dir, theme);
    var cx = ROOM_W / 2, cy = ROOM_H / 2;
    var vx = cx - e.x, vy = cy - e.y, d = Math.hypot(vx, vy) || 1;
    return safePoint(e.x + vx / d * 60, e.y + vy / d * 60, theme);
  }

  function build() {
    var cfg = currentCfg();
    var i, n, p;
    armed = {};
    room = {
      kind: 'town', index: 0, cleared: true, last: true,
      enemies: [], drops: [], doors: [], chest: null, well: null, shrine: null,
      decor: scaledDecorFor(cfg), npcs: [], marks: []
    };
    /* 원본(NPC_DEFS·MARKS·TOWNS)은 건드리지 않는다 — 진단이 마을을 여러 번
       세우고 오갈 수 있다. 좌표는 BASE_W·BASE_H 기준으로 적혀 있어 실제
       방 크기에 맞춰 늘린다. */
    for (i = 0; i < cfg.npcs.length; i++) {
      var spot = cfg.npcs[i], def = NPC_DEFS[spot.key];
      p = scalePt(spot.x, spot.y);
      room.npcs.push({
        key: spot.key, name: def.name, emoji: def.emoji, sheet: def.sheet, line: def.line,
        x: p.x, y: p.y, color: def.color,
        ref: { id: 'town_' + spot.key, name: def.name, trait: def.trait, rarity: def.rarity },
        phase: core.hash2(i + 1, 7) * 6.28, facing: spot.x > 380 ? -1 : 1
      });
    }
    if (cfg.hasGate) {
      for (i = 0; i < MARKS.length; i++) {
        n = MARKS[i]; p = scalePt(n.x, n.y);
        room.marks.push({ key: n.key, name: n.name, emoji: n.emoji, x: p.x, y: p.y });
      }
    }
    /* 들길 — 마을에서 마을로 걸어 나가는 자리. 방 판정 안이 아니라 방 밖
       들판 쪽에 놓인다(exitPoint 가 fieldRadiusUnits 기준으로 계산한다). */
    for (i = 0; i < cfg.exits.length; i++) {
      var ex = cfg.exits[i], to = cfgOf(ex.to);
      var ep = exitPoint(ex.dir, cfg.theme);
      room.marks.push({
        key: 'exit_' + ex.to, name: '들길 — ' + to.name + ' 방면',
        emoji: dirEmoji(ex.dir), x: ep.x, y: ep.y
      });
    }
    p = scalePt(195, 240);
    player = {
      /* 역참과 굴혈 사이, 어느 쪽에도 닿지 않는 자리(둘 다 100 남짓 떨어진다).
         입구 코앞에 세우면 둘러보기 전에 아래로 한 번 끌자마자 내려가 버린다.
         위성 마을은 굴혈이 없어 이 자리에 특별한 뜻은 없지만, 사람 셋과도
         충분히 떨어져 있어 그대로 써도 된다. */
      x: p.x, y: p.y, phase: 0, walking: false, facing: 1, hurt: 0,
      cds: [0, 0, 0, 0], dash: null, invuln: 0, rallyUntil: 0,
      dirX: 0, dirY: -1,
      atkCd: 0, atkAnim: 0            // 필드 로머 자동공격용 — dungeon.js stepFieldCombat 이 쓴다
    };
    /* 체력도 던전과 같은 산식으로 — 부대 방어력이 오르면 마을 필드에서도 더 버틴다 */
    fhpMax = fhp = global.DG.hero ? Math.max(1, Math.round(global.DG.hero.partyPower().def * 3 + 60)) : 100;
    fshots.length = 0; ffoeShots.length = 0;
    fieldSpawnCd = 4;
  }

  /** 세이브에 지금 마을을 적어 둔다 — 불러오면 그 마을로 돌아온다 */
  function saveTownId() {
    if (!core.save.town) { core.save.town = { current: CURRENT_TOWN }; }
    else { core.save.town.current = CURRENT_TOWN; }
  }

  /* ── 드나들기 ─────────────────────────────────────────── */

  function enter(opts) {
    opts = opts || {};
    if (!CURRENT_TOWN) {
      /* 첫 진입 — 세이브에 적힌 마을로 돌아온다. 던전에서 막 나온 참이면
         (굴혈은 모루골에만 있으므로) 반드시 모루골이다. */
      CURRENT_TOWN = opts.fromDungeon ? 'moru' : ((core.save.town && core.save.town.current) || 'moru');
    }
    if (!room) { build(); }
    /* 던전에서 막 나온 참이면 굴혈 앞에 세운다 — 나온 자리에 서 있어야
       "다시 들어간다" 가 한 걸음이다. 다만 입구에 **닿은 채로** 세우면
       그 자리에서 곧바로 다시 빨려 들어간다. 그래서 한 발 물려 세우고
       그 표식은 발동을 잠가 둔다(armed). */
    if (opts.fromDungeon) {
      var gp = scalePt(200, 300);
      player.x = gp.x; player.y = gp.y;
      armed.gate = true;
    }
    on = true;
    input.dx = 0; input.dy = 0;
    target = null;
    fx.length = 0;
    saveTownId();
    core.emit('town:enter', null);
    core.emit('changed');
    return true;
  }

  function leave() {
    on = false;
    input.dx = 0; input.dy = 0;
    target = null;
    return true;
  }

  function active() { return on; }

  /**
   * 들길을 밟아 다른 마을로 건너간다 — ui.js 의 town:mark 처리가
   * `exit_<대상마을id>` 키를 그대로 넘긴다.
   */
  function travel(markKey) {
    if (!markKey || markKey.indexOf('exit_') !== 0) { return false; }
    var toId = markKey.slice(5);
    var toCfg = TOWNS[toId];
    if (!toCfg || toId === CURRENT_TOWN) { return false; }
    var fromId = CURRENT_TOWN;
    CURRENT_TOWN = toId;
    build();
    /* 건너온 쪽(fromId)으로 돌아가는 들길 바로 앞에 세운다 — 위성 마을은
       늘 모루골로만 통하므로 그 들길이 정확히 하나 있다. */
    var i, backDir = null;
    for (i = 0; i < toCfg.exits.length; i++) {
      if (toCfg.exits[i].to === fromId) { backDir = toCfg.exits[i].dir; break; }
    }
    if (backDir) {
      var ep = entryPoint(backDir, toCfg.theme);
      player.x = ep.x; player.y = ep.y;
      armed['exit_' + fromId] = true;
    }
    saveTownId();
    core.persist();
    core.emit('town:enter', null);
    core.emit('changed');
    core.emit('toast', '🚶 ' + toCfg.name + '에 닿았습니다');
    return true;
  }

  /** 오버월드 지도(ui.js 의 M키 전체지도)가 읽는 자리 — 고정 배치 + 지금 위치 */
  var overworld = {
    current: function () { return CURRENT_TOWN; },
    list: function () {
      return TOWN_ORDER.map(function (id) {
        var c = TOWNS[id];
        return { id: c.id, name: c.name, dirFromHub: c.dirFromHub };
      });
    }
  };

  /* ── 조작 ─────────────────────────────────────────────── */

  function setInput(dx, dy) { input.dx = dx; input.dy = dy; if (dx || dy) { target = null; } }
  function moveTo(x, y) { target = { x: x, y: y }; }

  /** 마을에서는 무예가 나가지 않는다 — 벨 것이 없다 */
  function castSkill() { return false; }

  /** 단약도 마실 일이 없다(늘 가득) — potion.js 가 이 값을 보고 알을 아낀다 */
  function refill() { return false; }

  /* ── 닿음 ─────────────────────────────────────────────── */

  /**
   * 닿으면 발동한다 — 폰에서 "지목해서 말 걸기" 는 손이 갑절로 든다.
   * 대신 **벗어나기 전까지 다시 발동하지 않는다**(armed). 이 문턱이 없으면
   * 대장장이 옆에 서 있는 동안 창이 끝없이 다시 열린다.
   */
  function touchCheck() {
    var i, o, d;
    for (i = 0; i < room.npcs.length; i++) {
      o = room.npcs[i];
      d = dist(player, o);
      if (d <= TALK_R && !armed[o.key]) {
        armed[o.key] = true;
        o.facing = player.x > o.x ? 1 : -1;
        core.emit('town:npc', o);
      } else if (d > LEAVE_R && armed[o.key]) {
        armed[o.key] = false;
      }
    }
    for (i = 0; i < room.marks.length; i++) {
      o = room.marks[i];
      d = dist(player, o);
      if (d <= TALK_R && !armed[o.key]) {
        armed[o.key] = true;
        core.emit('town:mark', o);
      } else if (d > LEAVE_R && armed[o.key]) {
        armed[o.key] = false;
      }
    }
  }

  /** 지금 닿아 있는 것 (화면이 이름표를 띄울 때 쓴다) */
  function nearest() {
    var best = null, bd = TALK_R + 22, i, d;
    for (i = 0; i < room.npcs.length; i++) {
      d = dist(player, room.npcs[i]);
      if (d < bd) { bd = d; best = room.npcs[i]; }
    }
    for (i = 0; i < room.marks.length; i++) {
      d = dist(player, room.marks[i]);
      if (d < bd) { bd = d; best = room.marks[i]; }
    }
    return best;
  }

  /* ── 한 틱 ────────────────────────────────────────────── */

  function update(dt) {
    if (!on || !player) { return; }
    dt = Math.min(dt, 0.05);
    var px0 = player.x, py0 = player.y;

    var dx = input.dx, dy = input.dy;
    if (!dx && !dy && target) {
      var tdx = target.x - player.x, tdy = target.y - player.y;
      var td = Math.hypot(tdx, tdy);
      if (td < 6) { target = null; }
      else { dx = tdx / td; dy = tdy / td; }
    }
    var len = Math.hypot(dx, dy);
    if (len > 0) {
      dx /= len; dy /= len;
      player.x += dx * SPD * dt;
      player.y += dy * SPD * dt;
      player.walking = true;
      player.phase += dt * 9;
      if (dx) { player.facing = dx > 0 ? 1 : -1; }
      player.dirX = dx; player.dirY = dy;
    } else {
      player.walking = false;
    }
    /* 던전이 이미 검증해 둔 필드 확장(방 밖 들판까지 넓히고, 눈에 보이는
       소품과는 부딪힌다)을 마을도 그대로 쓴다 — 방 치수가 다르므로 ctx 로
       넘긴다(위 raw() 참고). */
    var ctx = raw();
    D().fieldBoundPlayer(player, px0, py0, ctx);

    /* 들판 로머 — 던전과 같은 주기·상한(PLAN 10절 "필드 사냥"과 동일 규칙) */
    fieldSpawnCd -= dt;
    if (fieldSpawnCd <= 0) {
      fieldSpawnCd = 4;
      if (D().fieldRoamerCount(ctx) < D().FIELD_ENEMY_CAP) { D().spawnFieldRoamers(1, ctx); }
    }
    D().stepFieldCombat(dt, ctx, fx);
    D().pickupField(ctx, fx);
    /* 체력이 0까지 떨어지면 던전과 완전히 같게 처리한다(hurtPlayer→die() 그대로) —
       dungeon:end 가 곧바로 town.enter({fromDungeon:true})를 다시 불러 굴혈 앞으로
       돌려보낸다. 마을은 안전지대 예외를 안 둔다(사용자 확정) — 대신 돌아온
       자리에서는 다시 온전하다. */
    fhp = ctx.hp <= 0 ? fhpMax : ctx.hp;

    /* 마을 사람은 제자리에서 숨만 쉰다 — 돌아다니게 하면 볼일 보러 쫓아다녀야 한다 */
    for (var i = 0; i < room.npcs.length; i++) { room.npcs[i].phase += dt * 1.2; }

    for (i = fx.length - 1; i >= 0; i--) {
      fx[i].life -= dt;
      if (fx[i].life <= 0) { fx.splice(i, 1); }
    }

    touchCheck();
  }

  /** 표식 위에 글자 하나 띄운다 (역참을 밟았다 같은 것) */
  function note(text, color) {
    fx.push({ t: 'get', x: player.x, y: player.y, text: text,
              color: color || '#f0c45a', life: 1.1 });
  }

  /* ── 화면이 읽어 가는 것 — dungeon.js 와 같은 모양 ────── */

  /**
   * dungeon.js 의 run 과 같은 모양이다 — 이 객체를 그대로 dungeon.js 의
   * fieldBoundPlayer·spawnFieldRoamers·stepFieldCombat 에 ctx 로 넘긴다.
   * roomW·roomH·wall·pr 은 이 방 치수가 던전과 달라서(마을은 데스크톱에서
   * 1.4배로 커진다) 그 함수들이 씨앗·경계를 마을 크기에 맞게 계산하게 한다.
   * theme 는 지금 서 있는 마을의 것 — 마을마다 달라 필드 씨앗(field3d.seedOf)도
   * 마을마다 다른 들판을 그린다.
   */
  function raw() {
    if (!on) { return null; }
    return {
      town: true, theme: currentTheme(),
      floor: 0, startFloor: 0, roomIdx: undefined,
      roomW: ROOM_W, roomH: ROOM_H, wall: WALL, pr: P_R,
      room: room, player: player, shots: fshots, foeShots: ffoeShots,
      boons: {}, choice: null,
      loot: { gold: 0, items: [] },
      hp: fhp, hpMax: fhpMax, mp: fmp, mpMax: fmpMax,
      kills: 0, dead: false
    };
  }

  /**
   * 조작판(구슬·무예·요대)이 이 값을 읽는다. 마을에서도 판은 그대로 있다 —
   * 원작에서 야영지에 들어섰다고 조작판이 사라지지 않는다.
   * 구슬은 가득 찬다. 마을은 쉬는 자리다.
   */
  function status() {
    var st = D().status();               // 던전이 쉬는 중일 때의 통계(최고 층 따위)
    var skills = [], got = D().slotSkills ? D().slotSkills() : [];
    for (var i = 0; i < 4; i++) {
      if (!got[i]) {
        skills.push({ key: null, name: '비었다', emoji: '·', desc: '무예를 걸어 두세요',
                      cost: 0, cd: 0, cdMax: 1, ready: false, empty: true });
        continue;
      }
      var sk = got[i].sk;
      skills.push({
        key: sk.key, name: sk.name, emoji: sk.emoji,
        desc: '마을에서는 쓰지 않습니다 — ' + sk.desc,
        rank: got[i].rank, cost: sk.cost, cd: 0, cdMax: sk.cd, ready: false
      });
    }
    return {
      active: true, town: true, floor: 0, theme: currentTheme(),
      hp: Math.max(0, Math.round(fhp)), hpMax: fhpMax, mp: Math.round(fmp), mpMax: fmpMax,
      skills: skills, rally: false,
      room: 1, roomTotal: 1, cleared: true, kind: 'town',
      loot: { gold: 0, items: 0 },
      boons: {}, choice: null,
      kills: 0, best: st.best || 0,
      atk: 0, reach: 0
    };
  }

  global.DG = global.DG || {};
  global.DG.town = {
    ROOM_W: ROOM_W, ROOM_H: ROOM_H, WALL: WALL, P_R: P_R,
    TALK_R: TALK_R, MARKS: MARKS,
    active: active, enter: enter, leave: leave, update: update,
    setInput: setInput, moveTo: moveTo, castSkill: castSkill, refill: refill,
    nearest: nearest, note: note,
    travel: travel, overworld: overworld,
    status: status,
    /** 화면 전용 — 상태를 직접 읽는다 (쓰지는 말 것) */
    raw: raw,
    fx: function () { return fx; },
    /** 자가진단용 — 마을을 처음 상태로 되돌린다. townId 를 주면 그 마을로(기본 모루골) */
    _reset: function (townId) {
      CURRENT_TOWN = townId && TOWNS[townId] ? townId : 'moru';
      room = null; armed = {};
      build();
    },
    /** 자가진단용 — 그 자리로 순간 옮긴다 (걸어가지 않고) */
    _put: function (x, y) { if (player) { player.x = x; player.y = y; } }
  };
})(window);
