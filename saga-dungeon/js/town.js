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
  /* 2026-09-06 — 사용자가 "마을이 너무 작다"고 지적. `BASE_W`/`BASE_H` 자체를
     키우면 바로 위 주석의 폰 병목(아이소 마름모 1.83:1, 세로 화면에서 가로가
     늘 병목)이 그대로 재현돼 사람이 개미만 해진다 — 그건 안 건드린다. 대신
     이 상수(데스크톱 전용 배율)만 1.4→1.7로 올려 데스크톱에서만 더 넓게
     쓴다. 폰은 예전과 완전히 같다(회귀 없음). 건물 밀도는 DECOR_MORU와
     위성 마을 decor에 집을 하나씩 더 얹는 쪽으로 늘렸다(아래) — 좌표
     자체는 그대로 두고 배율만 커지므로 밀도 문제와는 서로 안 얽힌다. */
  var DESK_SCALE = 1.7;
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
      line: '이 판에서 만난 인물을 적어 두었습니다.' },
    /* 2026-09-06 — 사용자 요청("콘텐츠가 많아야 함")으로 일곱째 직군을 얹었다.
       현상판(퀘스트 시트)을 맡아 볼 자리가 마을에 없었다 — 여태 독(dock)
       단추로만 열렸다. 새 시트·새 대사 체계 없이 기존 'quest' 시트만
       연결한다(sheet 값이 곧 openSheet() 인자라 이 한 줄로 끝난다). */
    herald:  { name: '포교(捕校)', emoji: '🪧', sheet: 'quest',
      color: '#8a4a3a', trait: 'might', rarity: 2,
      line: '오늘 새로 붙은 방문(榜文)이 있소이다. 살펴보시겠소?' }
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
    /* 2026-09-06 — "마을이 너무 작다"(사용자) 콘텐츠 밀도 보강. 기존 소품·
       NPC·스폰(195,240)에서 전부 100 이상 떨어진 자리를 좌표로 확인하고
       얹었다(벨타워가 스폰에 너무 가까웠던 함정, 위 주석 참고 — 같은
       실수를 안 반복하려 거리부터 쟀다). */
    { t: 'house', x: 430, y: 150, h: 130, seed: 41 },
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

  /** 세계 앵커(PLAN §28-8, 2026-09-06 — 오픈월드 A안) — 마을 4개가 이제
   *  "위장 전환"(§28-2~§28-4의 corridor 시스템, 은퇴)이 아니라 **하나의
   *  연속된 좌표계**에 실제로 앉는다. 각 마을의 로컬 원점(0,0)이 서 있는
   *  세계 좌표가 여기 값이다 — field3d.CHUNK(200) 배수로 잡아 칸 경계와
   *  안 어긋나게 한다. 간격(4800=24칸)은 어느 마을의 발판+필드 반경을
   *  다 합쳐도(넉넉잡아 3400 안팎, ROOM_W/H 최대치 + R*2) 겹치지 않을
   *  만큼 넉넉하다 — 겹치면 두 마을이 동시에 "활성"으로 판정될 수 있다.
   *  moru 를 원점으로 두고 나머지는 exits 의 방향 그대로 배치한다. */
  var ANCHOR_DIST = 4800;
  var WORLD_ANCHOR = {
    moru: { x: 0, y: 0 },
    jajak: { x: 0, y: -ANCHOR_DIST },
    galdae: { x: ANCHOR_DIST, y: 0 },
    sogeum: { x: 0, y: ANCHOR_DIST }
  };
  function anchorOf(id) { return WORLD_ANCHOR[id] || WORLD_ANCHOR.moru; }

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
        { key: 'pedlar',  x: 450, y: 305 }, { key: 'scribe',  x: 110, y: 200 },
        /* 2026-09-06 — 좌표는 손으로 계산해 골랐다(가장 가까운 기존 자리에서도
           88 이상 — 이 방은 이미 아홉 자리가 찬 3×3 이라 100을 다 채우진
           못했지만, NPC는 벨타워 같은 큰 3D 구조물이 아니라 사람 하나라
           §28-4 이전의 "화면이 온통 돌벽" 함정과는 성격이 다르다). */
        { key: 'herald', x: 200, y: 300 }
      ],
      decor: DECOR_MORU,
      /* 'W' 방면 — PLAN §28-4 Phase 1(던전도 "걸어서 이어지게"). 굴혈(gate)
         입구를 마을방 안 고정 표식에서 이 들길로 옮긴다. to:'dungeon'은
         다른 마을 id가 아니라 던전 입구라는 신호 — build()의 exits 루프와
         ui.js의 town:mark 라우팅이 이 값을 특별히 다룬다. */
      exits: [ { dir: 'N', to: 'jajak' }, { dir: 'E', to: 'galdae' },
               { dir: 'S', to: 'sogeum' }, { dir: 'W', to: 'dungeon' } ]
    },
    galdae: {
      id: 'galdae', name: '갈대나루', dirFromHub: 'E',
      theme: { name: '갈대나루', floor: '#28383c', wall: '#3d5458',
        tint: 'rgba(120,190,205,0.12)', town: true },
      hasGate: false,
      npcs: [ { key: 'quarter', x: 170, y: 150 }, { key: 'pedlar', x: 390, y: 150 },
              { key: 'scribe',  x: 280, y: 280 },
              /* 2026-09-06 — 위성 마을 셋에도 현상판 직군을 더했다(가장 가까운
                 기존 자리에서도 100 이상 떨어진 좌표를 계산해 골랐다). */
              { key: 'herald',  x: 100, y: 225 } ],
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
        { t: 'well', x: 280, y: 330, h: 34 },
        /* 2026-09-06 — "마을이 너무 작다"(사용자). 위성 마을도 집 하나씩
           더 — NPC·기존 소품과 100 이상 떨어진 자리로 골랐다. */
        { t: 'house', x: 420, y: 250, h: 120, seed: 51 }
      ],
      /* 2026-09-06 — PLAN §28-3 Phase 1(갈대나루↔자작재) + 후속(갈대나루↔소금벌).
         위성↔위성 지름길(모루골을 안 거치고 옆 사분면으로 바로 감), 대칭 왕복.
         자작재-소금벌(N-S)은 설계안이 "모루골을 그대로 관통해 새 통로 의미가
         없다"고 뺀 조합이라 여전히 안 잇는다. */
      exits: [ { dir: 'W', to: 'moru' },
               { dir: 'N', to: 'jajak' },
               { dir: 'S', to: 'sogeum' } ]
    },
    jajak: {
      id: 'jajak', name: '자작재', dirFromHub: 'N',
      theme: { name: '자작재', floor: '#333c2c', wall: '#4a5940',
        tint: 'rgba(150,185,110,0.10)', town: true },
      hasGate: false,
      npcs: [ { key: 'captain', x: 170, y: 150 }, { key: 'smith', x: 390, y: 150 },
              { key: 'master',  x: 280, y: 280 },
              { key: 'herald',  x: 280, y: 140 } ],
      decor: [
        { t: 'torch', x: 120, y: WALL - 4, seed: 1.4 }, { t: 'torch', x: 440, y: WALL - 4, seed: 4.6 },
        { t: 'pillar', x: 200, y: 210 }, { t: 'pillar', x: 360, y: 210 },
        { t: 'house', x: 60, y: 60, h: 130 }, { t: 'stable', x: 500, y: 60, h: 130 },
        { t: 'well', x: 280, y: 330, h: 34 },
        { t: 'house', x: 450, y: 300, h: 120, seed: 52 }
      ],
      exits: [ { dir: 'S', to: 'moru' },
               { dir: 'E', to: 'galdae' } ]
    },
    sogeum: {
      id: 'sogeum', name: '소금벌', dirFromHub: 'S',
      theme: { name: '소금벌', floor: '#4a4636', wall: '#6b6550',
        tint: 'rgba(230,220,180,0.12)', town: true },
      hasGate: false,
      npcs: [ { key: 'pedlar', x: 170, y: 150 }, { key: 'quarter', x: 390, y: 150 },
              { key: 'captain', x: 280, y: 280 },
              { key: 'herald',  x: 180, y: 255 } ],
      decor: [
        { t: 'torch', x: 120, y: WALL - 4, seed: 2.3 }, { t: 'torch', x: 440, y: WALL - 4, seed: 5.8 },
        { t: 'crack', x: 220, y: 120, a: 0.4, len: 40 }, { t: 'pillar', x: 340, y: 230 },
        { t: 'house', x: 60, y: 60, h: 130 }, { t: 'mill', x: 500, y: 60, h: 130 },
        { t: 'well', x: 280, y: 330, h: 34 },
        { t: 'house', x: 420, y: 300, h: 120, seed: 53 }
      ],
      /* 2026-09-06 — PLAN §28-3 후속(갈대나루↔소금벌, galdae 쪽과 대칭 왕복). */
      exits: [ { dir: 'N', to: 'moru' },
               { dir: 'E', to: 'galdae' } ]
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
  /** 활성 마을이 있으면 그 테마, 들판(활성 마을 없음)이면 가장 가까운
   *  마을의 테마로 지형·색감을 잇는다(PLAN §28-8) — 마을에 다가설수록
   *  자연스럽게 그 마을 결로 이어지는 효과도 겸한다. */
  function currentTheme() {
    if (CURRENT_TOWN) { return currentCfg().theme; }
    if (!player) { return TOWNS.moru.theme; }
    return cfgOf(nearestTownId(player.x, player.y)).theme;
  }

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

  /**
   * 이 세계 좌표(x,y)가 어느 마을의 "활성 구역"(발판 + 필드 반경 R) 안인가 —
   * PLAN §28-8. 앵커 간격(4800)이 발판+R 최대치보다 넉넉히 커서 둘 이상이
   * 동시에 걸리는 일은 설계상 없다(각주마다 첫 매치를 그냥 돌려준다).
   * 아무 데도 안 걸리면 null(들판 — 어느 마을 발판도 아니다).
   */
  function footprintDist(id, x, y) {
    var a = anchorOf(id);
    var lo = WALL + P_R;
    var x0 = a.x + lo, x1 = a.x + ROOM_W - lo, y0 = a.y + lo, y1 = a.y + ROOM_H - lo;
    var dx = x < x0 ? x0 - x : (x > x1 ? x - x1 : 0);
    var dy = y < y0 ? y0 - y : (y > y1 ? y - y1 : 0);
    return Math.hypot(dx, dy);
  }
  function pickActiveTown(x, y) {
    var R = D().fieldRadiusUnits(), i, id;
    for (i = 0; i < TOWN_ORDER.length; i++) {
      id = TOWN_ORDER[i];
      if (footprintDist(id, x, y) <= R) { return id; }
    }
    return null;
  }
  /** 들판(활성 마을이 없을 때)에서 지형·테마를 고를 기준 — 가장 가까운 마을 */
  function nearestTownId(x, y) {
    var best = TOWN_ORDER[0], bd = Infinity, i, d;
    for (i = 0; i < TOWN_ORDER.length; i++) {
      d = footprintDist(TOWN_ORDER[i], x, y);
      if (d < bd) { bd = d; best = TOWN_ORDER[i]; }
    }
    return best;
  }

  /**
   * 마을 하나를 세계 좌표에 짓는다(PLAN §28-8) — CURRENT_TOWN 이 가리키는
   * 마을을 anchorOf(CURRENT_TOWN) 자리에 앉힌다. **플레이어 위치는 안
   * 건드린다** — 이제 위치는 이 마을에 매인 것이 아니라 세계 전체에 걸친
   * 하나의 연속값이라, 마을이 바뀌어도(활성 마을이 갈릴 때마다 다시 불림)
   * 그대로 이어진다.
   */
  function build() {
    armed = {};
    if (!CURRENT_TOWN) {
      /* 들판 한복판(PLAN §28-8) — 활성 마을이 없다. 장식·NPC·표식 없는 빈
         방을 두고, 지형은 noRoom 모드(raw() 참고)의 chunkAt/fieldBlockedAt
         이 세계 좌표 그대로 그린다 — 어느 마을 발판도 아니다. */
      room = {
        kind: 'town', index: 0, cleared: true, last: true,
        enemies: [], drops: [], doors: [], chest: null, well: null, shrine: null,
        decor: [], npcs: [], marks: []
      };
      fhpMax = fhp = global.DG.hero ? Math.max(1, Math.round(global.DG.hero.partyPower().def * 3 + 60)) : 100;
      fshots.length = 0; ffoeShots.length = 0;
      fieldSpawnCd = 4;
      return;
    }
    var cfg = currentCfg();
    var anchor = anchorOf(CURRENT_TOWN);
    var i, n, p;
    room = {
      kind: 'town', index: 0, cleared: true, last: true,
      enemies: [], drops: [], doors: [], chest: null, well: null, shrine: null,
      decor: scaledDecorFor(cfg).map(function (d) {
        var o = {}, k;
        for (k in d) { if (Object.prototype.hasOwnProperty.call(d, k)) { o[k] = d[k]; } }
        o.x = d.x + anchor.x; o.y = d.y + anchor.y;
        return o;
      }),
      npcs: [], marks: []
    };
    /* 원본(NPC_DEFS·MARKS·TOWNS)은 건드리지 않는다 — 진단이 마을을 여러 번
       세우고 오갈 수 있다. 좌표는 BASE_W·BASE_H 기준으로 적혀 있어 실제
       방 크기에 맞춘 뒤 세계 앵커를 더한다. */
    for (i = 0; i < cfg.npcs.length; i++) {
      var spot = cfg.npcs[i], def = NPC_DEFS[spot.key];
      p = scalePt(spot.x, spot.y);
      room.npcs.push({
        key: spot.key, name: def.name, emoji: def.emoji, sheet: def.sheet, line: def.line,
        x: anchor.x + p.x, y: anchor.y + p.y, color: def.color,
        ref: { id: 'town_' + spot.key, name: def.name, trait: def.trait, rarity: def.rarity },
        phase: core.hash2(i + 1, 7) * 6.28, facing: spot.x > 380 ? -1 : 1
      });
    }
    if (cfg.hasGate) {
      for (i = 0; i < MARKS.length; i++) {
        n = MARKS[i];
        /* 굴혈(gate)은 더 안 세운다 — 아래 exits 루프가 'W' 들길(exit_dungeon)
           로 옮겨 세운다. 하나만 남아야 한다(입구가 둘이면 혼란). MARKS 표
           자체는 손 안 댐(역참·결사비가 그대로 읽는다). */
        if (n.key === 'gate') { continue; }
        p = scalePt(n.x, n.y);
        room.marks.push({ key: n.key, name: n.name, emoji: n.emoji, x: anchor.x + p.x, y: anchor.y + p.y });
      }
    }
    /* 굴혈(던전 입구) — cfg.exits 중 목적지가 'dungeon'인 것만 실제 발동
       표식으로 세운다. **다른 마을로의 exits는 더는 표식을 안 세운다** —
       §28-8부터 마을 사이는 걸어서 자연히 건너간다(활성 마을이 세계
       좌표로 저절로 갈린다, pickActiveTown 참고) — 옛 "들길을 밟으면
       travel()" 트리거는 필요가 없어져 은퇴했다(Phase 2 자동지도가 이웃
       마을 방향을 대신 그릴 것이다). */
    for (i = 0; i < cfg.exits.length; i++) {
      var ex = cfg.exits[i];
      if (ex.to !== 'dungeon') { continue; }
      var ep = exitPoint(ex.dir, cfg.theme);
      room.marks.push({
        key: 'exit_dungeon', name: '굴혈(窟穴)', emoji: '🕳️',
        x: anchor.x + ep.x, y: anchor.y + ep.y
      });
    }
    /* 체력도 던전과 같은 산식으로 — 부대 방어력이 오르면 마을 필드에서도 더 버틴다.
       마을에 들어설 때마다(활성 마을이 갈릴 때) 채운다 — "마을은 안전지대"라는
       옛 취지 그대로다. */
    fhpMax = fhp = global.DG.hero ? Math.max(1, Math.round(global.DG.hero.partyPower().def * 3 + 60)) : 100;
    fshots.length = 0; ffoeShots.length = 0;
    fieldSpawnCd = 4;
  }

  /** 처음 세계에 놓일 때 쓰는 자리 — moru의 로컬 (195,240)과 같은 뜻(역참·
   *  굴혈 어느 쪽에도 안 닿는 자리)을 그 마을의 세계 좌표로 낸다. */
  function defaultSpawn(townId) {
    var a = anchorOf(townId), p = scalePt(195, 240);
    return { x: a.x + p.x, y: a.y + p.y };
  }

  /** 세이브에 세계 좌표를 적어 둔다 — 불러오면 그 자리로 돌아온다(PLAN §28-8) */
  function saveWorldPos() {
    if (!player) { return; }
    if (!core.save.town) { core.save.town = { pos: { x: player.x, y: player.y } }; }
    else { core.save.town.pos = { x: player.x, y: player.y }; }
  }

  /* ── 드나들기 ─────────────────────────────────────────── */

  function enter(opts) {
    opts = opts || {};
    if (!player) {
      /* 첫 진입 — 세이브에 세계 좌표(pos)가 있으면 그 자리, 없으면(옛
         세이브 — §28-1~§28-7 시절, 마을 id 하나만 있었다) 그 마을의 앵커
         스폰으로 한 번 마이그레이션, 그것도 없으면 모루골 스폰. */
      var saved = core.save.town, sp;
      if (saved && saved.pos) { sp = { x: saved.pos.x, y: saved.pos.y }; }
      else { sp = defaultSpawn((saved && saved.current) || 'moru'); }
      player = {
        x: sp.x, y: sp.y, phase: 0, walking: false, facing: 1, hurt: 0,
        cds: [0, 0, 0, 0], dash: null, invuln: 0, rallyUntil: 0,
        dirX: 0, dirY: -1,
        atkCd: 0, atkAnim: 0          // 필드 로머 자동공격용 — dungeon.js stepFieldCombat 이 쓴다
      };
    }
    /* 던전에서 막 나온 참이면 반드시 모루골(굴혈은 거기에만 있다) —
       그 밖엔 지금 세계 좌표가 어느 마을 발판 안인지로 갈린다(§28-8,
       마을 사이는 걸어서 자연히 건너가므로 "지금 있던 마을"이라는 개념이
       CURRENT_TOWN 에 저장돼 있지 않고 매번 좌표로 다시 구해진다). */
    CURRENT_TOWN = opts.fromDungeon ? 'moru' : pickActiveTown(player.x, player.y);
    build();
    /* 던전에서 막 나온 참이면 굴혈 앞에 세운다 — 나온 자리에 서 있어야
       "다시 들어간다" 가 한 걸음이다. 다만 입구에 **닿은 채로** 세우면
       그 자리에서 곧바로 다시 빨려 들어간다. 그래서 한 발 물려 세우고
       그 표식은 발동을 잠가 둔다(armed). */
    if (opts.fromDungeon) {
      var anchor = anchorOf('moru');
      var gp = entryPoint('W', currentCfg().theme);
      player.x = anchor.x + gp.x; player.y = anchor.y + gp.y;
      armed.exit_dungeon = true;
    }
    on = true;
    input.dx = 0; input.dy = 0;
    target = null;
    fx.length = 0;
    saveWorldPos();
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

  /** 오버월드 지도(ui.js 의 M키 전체지도)가 읽는 자리 — 고정 배치 + 지금 위치.
   *  §28-8부터 마을 사이는 걸어서 자연히 건너간다(travel() 은퇴) — current()
   *  는 활성 마을이 없으면(들판 한복판) null 일 수 있다, Phase 2가 이 경우를
   *  마저 다룬다. anchor 는 Phase 2 자동지도가 실제 지형을 그리는 데 쓴다. */
  var overworld = {
    current: function () { return CURRENT_TOWN; },
    list: function () {
      return TOWN_ORDER.map(function (id) {
        var c = TOWNS[id];
        return { id: c.id, name: c.name, dirFromHub: c.dirFromHub, anchor: anchorOf(id) };
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
    /* 활성 마을이 걸으면서 갈릴 수 있다(PLAN §28-8) — 마을 발판을 벗어나
       거나 다른 마을 발판에 들어서면 그 자리에서 장식·NPC·표식을 다시
       짓는다. 안 바뀌었으면(같은 마을, 또는 들판→들판) 아무 것도 안
       한다 — 매 틱 다시 짓지 않는다. **반드시 raw()/ctx 를 만들기 전에**
       해야 한다 — 그래야 이 틱의 클램프(boundPlayer)가 이미 갈린 마을
       기준으로 걸린다(안 그러면 경계에서 한 틱 늦게 반응해 순간적으로
       옛 방 사각형에 도로 갇힐 수 있다). */
    var nextTown = pickActiveTown(player.x, player.y);
    if (nextTown !== CURRENT_TOWN) {
      CURRENT_TOWN = nextTown; build();
      /* 세이브 갈무리 — 옛 travel()이 마을을 건널 때마다 세이브했던 것과
         같은 자리(활성 마을이 갈리는 순간)에 건다. 매 틱 저장하면 너무
         잦다 — 이 정도 빈도면 충분하고, 앱이 죽어도 최근 지난 마을/들판
         전환 지점까지는 복구된다. */
      saveWorldPos();
      core.persist();
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
    /* PLAN §28-8 — 활성 마을이 있으면 그 앵커에 방 사각형(발판)을 두고,
       없으면(들판 한복판) noRoom 모드다: 방 사각형 없이 세계 경계만 두고
       소품 충돌만 축분리로 본다(dungeon.js boundPlayer 참고). anchor 는
       들판에서도 필요하다 — 가장 가까운 마을 기준으로 ring(멀고 가까움)
       을 재야 지형이 마을에 다가설수록 자연스럽게 옅어진다. */
    var wild = !CURRENT_TOWN;
    var anchor = anchorOf(wild ? nearestTownId(player.x, player.y) : CURRENT_TOWN);
    return {
      town: true, wild: wild, theme: currentTheme(),
      floor: 0, startFloor: 0, roomIdx: undefined,
      roomW: ROOM_W, roomH: ROOM_H, wall: WALL, pr: P_R,
      anchor: anchor, noRoom: wild,
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
    overworld: overworld,
    status: status,
    exitPointRaw: exitPointRaw,
    /** PLAN §28-8(2026-09-06, 오픈월드 A안) — 세계 앵커·활성 마을 판정.
     *  자가진단·Phase 2(자동지도) 가 읽는다. anchorOf 는 참조 그대로 주지
     *  않는다(호출자가 실수로 고치면 앵커가 전부 흔들린다) — 얕은 복사. */
    anchorOf: function (id) { var a = anchorOf(id); return { x: a.x, y: a.y }; },
    worldAnchors: function () {
      var out = {}, i, id;
      for (i = 0; i < TOWN_ORDER.length; i++) { id = TOWN_ORDER[i]; out[id] = { x: WORLD_ANCHOR[id].x, y: WORLD_ANCHOR[id].y }; }
      return out;
    },
    pickActiveTown: pickActiveTown, nearestTownId: nearestTownId, footprintDist: footprintDist,
    /** 지역 진입 전 미리 로드(PLAN 39절, `dungeon3d.js`의 `prefetchTownDest()`가
     *  읽는다) — 그 마을 decor 에 쓰이는 건물 종류(house·well·inn 등)를
     *  중복 없이 돌려준다. 순수 함수, three 필요 없다. */
    decorTypesOf: function (id) {
      var cfg = cfgOf(id), seen = {}, out = [], i, t;
      for (i = 0; i < cfg.decor.length; i++) {
        t = cfg.decor[i].t;
        if (seen[t]) { continue; }
        seen[t] = true;
        out.push(t);
      }
      return out;
    },
    /** 자가진단용 — 그 마을의 exits 원본(dir·to·len)을 그대로 돌려준다(읽기 전용). */
    exitsOf: function (id) { return cfgOf(id).exits.slice(); },
    /** 화면 전용 — 상태를 직접 읽는다 (쓰지는 말 것) */
    raw: raw,
    fx: function () { return fx; },
    /** 자가진단용 — 마을을 처음 상태로 되돌린다. townId 를 주면 그 마을로
     *  (기본 모루골) — 그 마을의 기본 스폰 세계 좌표에 플레이어도 같이
     *  둔다(§28-8부터 위치가 CURRENT_TOWN 을 결정하므로, 옮겨만 놓고
     *  좌표를 안 맞추면 다음 update()에서 도로 튕겨 나간다). */
    _reset: function (townId) {
      var id = townId && TOWNS[townId] ? townId : 'moru';
      var sp = defaultSpawn(id);
      if (!player) {
        player = { x: sp.x, y: sp.y, phase: 0, walking: false, facing: 1, hurt: 0,
          cds: [0, 0, 0, 0], dash: null, invuln: 0, rallyUntil: 0, dirX: 0, dirY: -1,
          atkCd: 0, atkAnim: 0 };
      } else { player.x = sp.x; player.y = sp.y; }
      CURRENT_TOWN = id;
      room = null; armed = {};
      on = true;
      build();
    },
    /** 자가진단용 — 그 자리로 순간 옮긴다 (걸어가지 않고) */
    _put: function (x, y) { if (player) { player.x = x; player.y = y; } },
    /** 자가진단용(PLAN §28-8) — 앱을 처음부터 다시 켠 것처럼 player 를
     *  잊는다. 다음 enter() 가 세이브(pos, 없으면 옛 current 마이그레이션)
     *  로 다시 서는 실제 첫 진입 경로를 타는지 확인할 때 쓴다. */
    _forgetPlayer: function () { player = null; on = false; }
  };
})(window);
