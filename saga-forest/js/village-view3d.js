/**
 * 마을 화면 — 3D (PLAN 40절 PHASE 2, Player 3D + Tree/Rock/Vegetation)
 * ---------------------------------------------------------------
 * `village-view.js`(2D 구면 투영)는 이 파일이 있는지도 모른다 — **한 줄도
 * 안 건드렸다.** 대신 `#map3d` 캔버스에 별개의 WebGL 화면을 올리고, 켜져
 * 있을 때만 `#map`(2D)을 숨기고 이쪽을 보여 준다. 꺼지면(기본값) 예전 그대로다.
 *
 * **인물은 늘 원점(0,0,0)에 서 있고, 세상이 그 둘레를 돈다.** village.js 의
 * 마을 좌표(x,y)를 3D 세계로 그대로 옮기지 않는다 — `player.x/y` 를 뺀
 * **상대 좌표**로 나무·바위를 세운다. 걸으면 그것들이 인물 쪽으로 다가오고
 * 지나간다 — 2D 쪽 `project()`(구면 투영)가 늘 인물을 화면 한가운데 두는
 * 것과 같은 요령이다. 카메라는 그 위에서 **걷는 방향**만 따로 돈다(3인칭
 * 어깨너머 시점) — 이동(사물이 흐르는 것)과 시선(카메라가 도는 것)은 다른 일이다.
 *
 * **건물(전방·집·게시판…)도 2026-09-09부터 GLB 로 선다**(PLAN 6절 "작은
 * 마을"). 나무·바위와 똑같이 `SCATTER_KIND`에 한 줄 보태는 것으로 끝났다 —
 * village.js 의 props 는 처음부터 shop·home·board 같은 kind 를 갖고 있었고,
 * 이 화면이 그동안 그 kind 들을 표에서 빼 놓고만 있었을 뿐이다.
 *
 * **사물은 새로 흩뿌리지 않는다.** village.js 의 `V.raw().props`(이미 좌표
 * 해시로 정해진, 날마다 같은 자리)를 그대로 읽어 그중 나무·소나무·바위·꽃·
 * 잡초만 GLB 로 세운다(`SCATTER_KIND`). PLAN 10절 "중요한 장소는 랜덤
 * 배치하지 않는다"를 지키는 가장 쉬운 길은 **새 무작위를 아예 안 만드는 것**이다.
 *
 * **거리로 켜고 끈다** — 인물에서 `RENDER_R()` 안의 것만 세우고, 벗어나면
 * 치운다(PLAN 9절 "모바일 성능을 고려해 렌더링 수를 자동 조절"의 가장 단순한
 * 형태). `MAX_SCATTER()` 로 한 프레임에 새로 세우는 개수도 눌러 둔다 — 마을
 * 전체를 한 프레임에 다 지으면 순간 버벅인다.
 *
 * **땅바닥도 하나의 초록색이 아니다(PLAN 7절 지형 다양화).** `V.tileAt(tx,ty)`
 * 를 그대로 읽어 풀·흙길·모래·물·돌길을 색으로 가른다(색은 `villageData.TILES`
 * 에서 그대로 가져온다 — 2D 화면과 같은 색이다). 물은 살짝 낮춰 웅덩이처럼
 * 보이게 한다. 타일마다 메시를 만들지 않고 **종류별 `InstancedMesh` 하나**에
 * 자리만 채운다 — 인물 둘레 몇백 칸이라도 그리기 호출은 다섯 번뿐이다.
 *
 * **한 줄도 판정에 닿지 않는다.** village.js 의 걷기·채집·시간 계산은 이 파일이
 * 없어도 완전히 돈다 — 여기서는 `V.raw()`·`V.tileAt()`를 읽기만 한다.
 */
(function (global) {
  'use strict';

  var core = null;
  function C() { if (!core) { core = global.DG.core; } return core; }
  var A3 = null;
  function asset3d() { if (!A3) { A3 = global.DG.asset3d; } return A3; }
  var T = null;
  function three() { if (!T) { T = global.THREE || null; } return T; }

  /** 손잡이 — 2026-09-09부터 기본이 켜져 있다(3D로 시작). 사가블로(`dg3d.on`
   *  기본 1)와 시점을 맞췄다 — 그 전엔 "2D 가 그대로 간다"가 기본이었다.
   *  🧊 버튼이 이걸 뒤집는다(끄고 싶으면 여전히 끌 수 있다) */
  function ON() { return C().tuned('village3d.on', 1) ? true : false; }
  function CAM_DIST() { return C().tuned('village3d.camDist', 7.5); }
  function CAM_HIGH() { return C().tuned('village3d.camHeight', 4); }
  /** 3/4 부감(쿼터뷰) 쪽 끝값 — 거리·기울기. tilt 가 클수록 카메라가 더 눕는다(수평 반지름이
   *  커지고 높이가 낮아진다), 작을수록 더 위에서 내리찍는 부감이 된다.
   *  **2026-09-02, 11 → 24 → 46 으로 올렸다가 도로 11 로.** 그때는 "버튼으로 클릭해서
   *  바꿨던 그 쿼터뷰"(첫 커밋 db12fe6, 실기기로 확인됨)를 원했던 것뿐이었다 — 세로
   *  드래그가 t=1 까지 실제로 안 닿아서(TILT_SENS 낮음) "덜 부감으로" 보인 걸 잘못
   *  짚고 화면 자체를 바꾼 착오였다. 그 사정과는 다르게, **2026-09-09 — camTiltMix
   *  기본을 1(부감 시작)로 바꾼(§8ec88ab) 당일 바로 "NPC가 3D에서 안 보이고 화면이
   *  너무 가깝다"는 새 신고가 왔다.** 계산해 보면 t=1 기본값에서도 카메라~플레이어
   *  거리가 겨우 9.95(월드단위, 캐릭터 키 1.7의 6배가 채 안 된다) — 숲 NPC 다섯은
   *  전부 호수·동굴·마을 같은 지형지물 자리에 고정이라 스폰에서 20~33타일 떨어져
   *  있는데(헤드리스 진단으로 실측), 이 거리에서는 방향을 알아도 화면에 걸리지 않는다.
   *  11 이 "틀렸다"는 뜻이 아니라 그때 확인된 그림은 지금과 다르다(그땐 버튼으로
   *  수동 전환, 지금은 시작부터 이 값) — 11→16 으로 45% 물렸다. 또 짚기 전에
   *  실기기로 먼저 확인할 것 */
  function ISO_DIST() { return C().tuned('village3d.isoDist', 16); }
  function ISO_TILT() { return C().tuned('village3d.isoTilt', 0.62); }
  function PLAYER_H() { return C().tuned('village3d.playerH', 1.7); }
  function GROUND_SIZE() { return C().tuned('village3d.groundSize', 400); }
  function FOV() { return C().tuned('village3d.fov', 55); }
  /** 쿼터뷰 쪽 화각 — 기본은 FOV() 와 같다(안 좁힌다). 정사영 흉내를 원하면 손잡이로 */
  function ISO_FOV() { return C().tuned('village3d.isoFov', FOV()); }
  /** 걸음이라고 볼 최소 속도(마을 좌표/초) — 이보다 느리면 멈춘 것으로 본다 */
  function MOVE_EPS() { return C().tuned('village3d.moveEps', 4); }

  /** 마을 좌표 한 단위 = 몇 미터 — TILE(40단위)이 3.2m 쯤 되게 잡았다 */
  function WORLD_SCALE() { return C().tuned('village3d.worldScale', 0.08); }
  /** 인물에서 이 안(미터)에 있는 것만 3D 로 세운다 — 기본값은 품질 등급표(QUALITY_PRESET)를 탄다 */
  function RENDER_R() { return C().tuned('village3d.renderR', QUALITY_PRESET[tier()].renderR); }
  /** 벗어나면 치우는 거리 — RENDER_R 보다 살짝 넉넉해야 경계에서 깜빡이지 않는다 */
  function CULL_R() { return RENDER_R() + C().tuned('village3d.cullMargin', 6); }
  /** 한 프레임에 새로 세우는 최대 개수 — 마을을 한꺼번에 안 짓는다 */
  function MAX_BUILD_PER_STEP() { return C().tuned('village3d.maxBuildPerStep', 4); }
  /** 인물 둘레 몇 칸까지 색칠할까 (타일 수, 반지름) — 기본값도 품질 등급표를 탄다 */
  function GROUND_TILE_R() { return C().tuned('village3d.groundTileR', QUALITY_PRESET[tier()].groundTileR); }
  /** 물은 이만큼 낮춘다(미터) — 웅덩이처럼 보이게 */
  function WATER_DEPTH() { return C().tuned('village3d.waterDepth', 0.12); }
  /** 물 표현(PLAN 12절, 2026-09-09) — 파동 진폭(미터)·빈도·속도. 재질 컴파일 때
   *  한 번만 읽는다(카메라 손잡이처럼 매 프레임 바뀌지 않는다 — 3D 를 껐다 켜야
   *  반영된다, GROUND_SIZE()와 같은 성격) */
  function WATER_WAVE_AMP() { return C().tuned('village3d.waterWaveAmp', 0.045); }
  function WATER_WAVE_FREQ() { return C().tuned('village3d.waterWaveFreq', 1.4); }
  function WATER_WAVE_SPEED() { return C().tuned('village3d.waterWaveSpeed', 1.8); }
  /** 물결 반짝임(ripple) 점 — 물 칸 하나에 하나씩, 상한을 넘으면 먼저 찾은 것만 */
  function WATER_RIPPLE_CAP() { return C().tuned('village3d.waterRippleCap', 24); }

  /**
   * 그래픽 품질(PLAN 38절 "모바일 품질 프리셋" · PLAN 30절 "거리 기반 활성화") —
   * **프레임을 실측해 오가는 자동 조정까지는 안 만든다**(PLAN 38절은 "기기 성능을
   * 감지해서 기본값을 자동 설정한다"까지만 요구한다 — 이 판은 아직 그런 성능
   * 제보가 없어 과한 장치다). `village3d.quality`를 low/medium/high 로 고정하거나
   * 기본값 `'auto'`면 **켤 때 한 번** 기기를 보고 등급을 고른다.
   * (사가블로 `dungeon3d.js`의 `deviceScore`/`probeDevice`와 같은 요령이되, 그
   * 판의 프레임 실측 왕복 장치는 옮기지 않는다 — 다섯 판 공용 파일이 아니라서
   * 복붙이 아니라 **필요한 만큼만** 옮긴 것이다.)
   */
  var QUALITY_PRESET = {
    low:    { renderR: 26, groundTileR: 9,  dpr: 1,   shadow: false },
    medium: { renderR: 34, groundTileR: 12, dpr: 1.5, shadow: false },
    high:   { renderR: 40, groundTileR: 14, dpr: 2,   shadow: true }
  };
  function QUALITY() { return C().tuned('village3d.quality', 'auto'); }
  /** 순수 함수 — probe 값만으로 점수를 매긴다(scene·navigator 없이도 진단됨) */
  function deviceScore(o) {
    var s = 0;
    var cores = o.cores || 0, mem = o.mem || 0;
    var px = (o.w || 0) * (o.h || 0) * (o.dpr || 1) * (o.dpr || 1);
    s += cores >= 8 ? 2 : (cores >= 4 ? 1 : (cores > 0 ? 0 : 1));
    s += mem >= 8 ? 2 : (mem >= 4 ? 1 : (mem > 0 ? 0 : 1));
    s += px > 4000000 ? -1 : (px > 1600000 ? 0 : 1);
    if (o.touch) { s -= 1; }
    return s;
  }
  function tierFor(score) { return score >= 3 ? 'high' : (score >= 1 ? 'medium' : 'low'); }
  function probeDevice() {
    var n = global.navigator || {}, sc = global.screen || {};
    return {
      cores: n.hardwareConcurrency || 0, mem: n.deviceMemory || 0,
      w: sc.width || 0, h: sc.height || 0, dpr: global.devicePixelRatio || 1,
      touch: !!(('ontouchstart' in global) || (n.maxTouchPoints > 0))
    };
  }
  var autoTierCache = null;
  function autoTier() {
    if (!autoTierCache) { autoTierCache = tierFor(deviceScore(probeDevice())); }
    return autoTierCache;
  }
  /** 고정 값(low/medium/high)이면 그걸, 'auto'면 켤 때 한 번 잰 등급을 쓴다 */
  function tier() {
    var q = QUALITY();
    return (q === 'low' || q === 'medium' || q === 'high') ? q : autoTier();
  }

  var canvas = null, renderer = null, scene = null, camera = null;
  var ready = false, failed = false;

  /** 사람이 핀치·휠로 직접 조절하는 확대 — CAM_DIST()/CAM_HIGH() 손잡이와는 다른 값이다.
   *  1 이 기본(손잡이 값 그대로), 커지면 당겨서(확대) 가까이, 작아지면 물러나 멀리 본다 */
  var userZoom = 1;
  var USERZOOM_MIN = 0.5, USERZOOM_MAX = 2.2;
  var zoomPointers = {}, pinchDist0 = 0;

  /** 사람이 드래그로 돌리는 시점 — 걷는 방향(facingYaw)에 얹는 **덧각**이다.
   *  걸어도 안 지워진다(사가국지 국토지도의 자유회전과 같은 결). #map3d 는 3D 켜져
   *  있을 때 걷기가 키보드 몫이라 손가락 한 개 드래그를 그냥 시점 회전에 써도 된다 */
  var mouseYaw = 0;
  var YAW_SENS = 0.012;
  /** 세로 드래그로 잇는 시점 높이 — 0(어깨너머 3인칭)~1(3/4 부감/쿼터뷰) 연속값이다.
   *  세로 드래그로도, 🎥 버튼(2026-09-02 이후 추가, `game.js`)으로도 바뀐다.
   *  위로 끌면 부감(1)쪽으로, 아래로 끌면 어깨너머(0)쪽으로 자연스럽게 넘어간다.
   *  **2026-09-09 — 기본을 1(쿼터뷰)로 바꿨다.** 사가블로(`dg3d.tilt` 기본
   *  0.62, 이미 부감 쪽)와 시작 시점을 맞췄다 — 세이브에 안 묻는 세션 값이라
   *  매번 게임을 켤 때 이 값에서 시작한다(껐다 켜면 도로 1로 돌아온다) */
  var camTiltMix = 1;
  /** 2026-09-02 — 처음 값(0.0028, 끝까지 357px)은 실기기에서 짧게 몇 번 쓸어 올려서는
   *  1까지 안 닿았다("각도가 다르게 보인다"던 게 실은 t 가 중간에서 멎은 것이었다).
   *  손가락으로 한 번 쭉 그으면 끝까지 닿게 8 배 가까이 올렸다(125px 로 끝까지) */
  var TILT_SENS = 0.008;
  var dragId = null, dragLastX = 0, dragLastY = 0;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function setCamTiltMix(v) { camTiltMix = clamp(v, 0, 1); }
  function zoomPointerCount() {
    var n = 0, k;
    for (k in zoomPointers) { if (Object.prototype.hasOwnProperty.call(zoomPointers, k)) { n++; } }
    return n;
  }
  function twoZoomPointerDist() {
    var ks = Object.keys(zoomPointers);
    if (ks.length < 2) { return 0; }
    var a = zoomPointers[ks[0]], b = zoomPointers[ks[1]];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function setUserZoom(z) { userZoom = clamp(z, USERZOOM_MIN, USERZOOM_MAX); }

  /** 확대·시점회전은 걷기 입력(#map3d 는 3D 켜져 있을 때 키보드로만 걷는다)과 안
   *  겹친다 — 휠(데스크톱)·두 손가락 핀치(폰)로 확대, 오른쪽 버튼 드래그(마우스)나
   *  한 손가락 드래그(폰)로 시점을 돌린다 */
  function bindCamControl(cv) {
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    cv.addEventListener('wheel', function (e) {
      setUserZoom(userZoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
      e.preventDefault();
    }, { passive: false });
    cv.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') {
        if (e.button !== 2) { return; }         // 왼쪽은 그대로 비워 둔다(다른 조작과 안 겹치게)
        dragId = e.pointerId; dragLastX = e.clientX; dragLastY = e.clientY;
        return;
      }
      if (zoomPointerCount() === 0) { dragId = e.pointerId; dragLastX = e.clientX; dragLastY = e.clientY; }
      zoomPointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (zoomPointerCount() === 2) { pinchDist0 = twoZoomPointerDist(); dragId = null; }
    });
    cv.addEventListener('pointermove', function (e) {
      if (e.pointerId === dragId) {
        mouseYaw -= (e.clientX - dragLastX) * YAW_SENS;
        /* 위로 끌면(clientY 가 줄어듦) 부감(1)쪽으로 — 그래서 부호를 뒤집는다 */
        setCamTiltMix(camTiltMix - (e.clientY - dragLastY) * TILT_SENS);
        dragLastX = e.clientX; dragLastY = e.clientY;
      }
      if (!zoomPointers[e.pointerId]) { return; }
      zoomPointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (zoomPointerCount() === 2) {
        var nd = twoZoomPointerDist();
        if (pinchDist0 > 0 && nd > 0) { setUserZoom(userZoom * (nd / pinchDist0)); }
        pinchDist0 = nd;
      }
    });
    function endPointer(e) {
      if (e.pointerId === dragId) { dragId = null; }
      delete zoomPointers[e.pointerId];
      if (zoomPointerCount() < 2) { pinchDist0 = 0; }
    }
    cv.addEventListener('pointerup', endPointer);
    cv.addEventListener('pointercancel', endPointer);
  }

  var player = { group: null, mixer: null, actions: null, clipMap: null, action: null };
  var lastPX = 0, lastPY = 0, haveLast = false, facingYaw = 0;

  /** village.js 사물 kind → asset3d 표의 kind. 여기 없는 kind는 3D 로 안 선다.
   *  deadTree·mossyRock·mushroom·bush·stump·log 는 PLAN 11절 Biome — 숲 고리에만
   *  나오고(village.js 의 BIOME_SCATTER), asset3d.js 에 이미 등록돼 있던 표라
   *  여기 줄만 보태면 그대로 선다 */
  var SCATTER_KIND = {
    tree: 'tree:common', pine: 'tree:pine', rock: 'rock', flower: 'flower', weed: 'grass',
    deadTree: 'tree:dead', mossyRock: 'rock:moss', mushroom: 'mushroom', herb: 'mushroom',
    bush: 'bush', stump: 'stump', log: 'log', plant: 'plant',
    tent: 'tent', campfire: 'campfire', bench: 'bench', well: 'well', lantern: 'lantern',
    mountain: 'mountain',
    /* 다리(2026-09-09) — asset3d.js 에 진작 등록만 되어 있던 'bridge' 를
       처음 쓴다(village.js 의 새 BRIDGE_TY 크로싱) */
    bridge: 'bridge',
    /* 짐승(PLAN 40절 PHASE 4 첫 칸) — village.js 의 raw().animals 도 이 표를
       그대로 타고 선다(아래 syncScatter() 가 props 배열에 이어 붙인다).
       토끼·다람쥐·오리·새(2026-09-09, PLAN 16절)는 data-village.js 의
       ANIMALS 에 새로 보탠 kind 라 이 한 줄씩만 이으면 그대로 선다 */
    deer: 'animal:an_deer', fox: 'animal:an_fox', wolf: 'animal:an_wolf',
    rabbit: 'animal:an_rabbit', squirrel: 'animal:an_squirrel',
    duck: 'animal:an_duck', bird: 'animal:an_bird',
    /* 마을 3D 건물(PLAN 6절, 2026-09-09) — village.js `buildProps()`의 shop·
       board·home·mail·tailor·pole·museum kind 를 그대로 타고 선다. 마을당
       하나뿐인 고정 건물이라 나무처럼 변종을 섞지 않는다 */
    shop: 'building:shop', board: 'building:board', home: 'building:home',
    mail: 'building:mail', tailor: 'building:tailor', pole: 'building:pole',
    museum: 'building:museum',
    /* 캠프 오두막(2026-09-09) — village.js buildProps() 의 hamletHouse kind 를
       그대로 타고 선다. 마을 건물과 같은 결(변종 없음, 자리 하나뿐).
       hamletHut(House_1)·hamletShed(House_3)는 같은 날 이어 얹은 두 번째·세
       번째 채 — kind 가 다르므로 역시 자리 하나뿐 규칙을 그대로 지킨다 */
    hamletHouse: 'building:hamletHouse', hamletHut: 'building:hamletHut',
    hamletShed: 'building:hamletShed',
    /* 두 번째 캠프(2026-09-09) — village.js buildProps() 의 hamlet2House kind.
       House_4, 첫 캠프의 세 채와 같은 결 */
    hamlet2House: 'building:hamlet2House'
  };
  /** 종류별로 실제 몇 미터로 세울까 — asset3d.build() 는 늘 키 1 로 눕혀 준다 */
  var SCATTER_H = {
    tree: 3.4, pine: 3.0, rock: 0.9, flower: 0.35, weed: 0.4,
    deadTree: 3.0, mossyRock: 0.9, mushroom: 0.5, herb: 0.5, bush: 0.8, stump: 0.6, log: 0.5, plant: 0.6,
    tent: 1.8, campfire: 0.5, bench: 0.5, well: 1.0, lantern: 1.6, mountain: 8.0,
    /* 다리(2026-09-09) — 정규화라 원본 비례는 모른다. 난간 높이쯤(well·lantern
       사이) 눈대중으로 잡았다 */
    bridge: 1.4,
    deer: 1.1, fox: 0.55, wolf: 0.95,
    rabbit: 0.3, squirrel: 0.25, duck: 0.35, bird: 0.2,
    /* 건물 — house_wooden·house_cottage·house_stone(PolyScan 실사)은 셋 다
       비슷한 단층 초가 비례라 키를 맞춰 나란히 서도 안 어색하다. signpost·
       banner_thin_red·box_small(KayKit)은 훨씬 작은 소품이라 낮게 잡는다 */
    shop: 3.0, home: 3.2, tailor: 2.8, museum: 3.4, board: 1.3, mail: 0.9, pole: 2.4,
    /* House_2·House_1·House_3(Quaternius) — 마을 건물(house_wooden 등,
       3.0~3.4m)보다 한 단 작게 잡아 "캠프의 소박한 오두막" 느낌을 준다.
       셋 다 정규화로 키 1 에서 시작하므로(build() 가 늘 그렇게 눕힌다) 실제
       원본 비례는 모른다 — 나란히 서도 다 같은 키로 안 보이게 일부러 조금씩
       다르게 잡았을 뿐이다 */
    hamletHouse: 2.4, hamletHut: 2.1, hamletShed: 2.3,
    /* House_4(Quaternius) — 두 번째 캠프의 유일한 채. 첫 캠프 셋과 같은
       눈대중 범위(2.1~2.4m) 안에서 살짝 다르게 잡았다 */
    hamlet2House: 2.2
  };

  /**
   * 2026-09-09 — PLAN 40절 PHASE 7 "Scatter를 InstancedMesh로"를 좁혀서
   * 되살렸다(README "남은 일 표"에서 위험하다고 미뤄 뒀던 항목). 애니메이션·
   * 스켈레톤이 없는 이 여덟 종류만 대상이다 — 나무·바위·건물·짐승은 그림자
   * 개별 LOD(`applyShadowLOD`)·변종 다양성이 더 중요해 기존 Object Pool
   * 경로(아래 `scatter`/`scatterPool`)에 그대로 남긴다. 이 kind들은 `syncScatter()`
   * 루프에서 걸러지고(`if (INST_KIND[p.kind])` 체크), `syncInstScatter()`가 따로
   * 세운다 — `asset3d.partsFor()`가 프리미티브(재질 단위)를 주면 재질마다
   * InstancedMesh 하나를 만들어 같은 자리 행렬을 쓴다.
   */
  var INST_KIND = { weed: 1, flower: 1, mushroom: 1, herb: 1, plant: 1, stump: 1, log: 1, bush: 1 };

  /**
   * 2026-09-09 — 원작(동물의숲)처럼 계절이 나무 겉모습을 바꾼다("남은 일 표"의
   * 가을·눈·자작나무 항목). `tree:common`(2D 'tree' kind)·`tree:pine`(2D 'pine'
   * kind) 둘만 대상이다 — 봄·여름은 기존 실사 나무 그대로(회귀 없음), 가을·겨울만
   * `asset3d.js`에 준비된 저다각형 표(`:autumn`/`:snow`, 자작나무는 tree:common
   * 쪽에 섞임)로 갈아 낀다. 고목 등은 계절 표가 따로 없어 그대로 둔다.
   */
  var SEASONAL_TREE_BASE = { 'tree:common': 1, 'tree:pine': 1 };
  function seasonalTreeKey(baseKey) {
    if (!SEASONAL_TREE_BASE[baseKey]) { return baseKey; }
    var VD = global.DG.villageData;
    if (!VD) { return baseKey; }
    var sk = VD.season().key;
    if (sk === 'autumn') { return baseKey + ':autumn'; }
    if (sk === 'winter') { return baseKey + ':snow'; }
    return baseKey;
  }
  var lastTreeSeason = null;
  /** 계절이 바뀌면 이미 지어 둔 'tree'·'pine' 인스턴스를 지운다 — 그대로 두면
   *  겨울에도 여름 나무가 계속 서 있는다(짓는 건 매번, 지우는 건 그룹이 실제로
   *  멀어질 때뿐이라). Object Pool 도 같이 비운다 — 지난 계절 모습을 다시 꺼내
   *  쓰면 안 된다 */
  function syncTreeSeason() {
    var VD = global.DG.villageData;
    var sk = VD ? VD.season().key : null;
    if (sk === lastTreeSeason) { return; }
    lastTreeSeason = sk;
    var id;
    for (id in scatter) {
      if (!Object.prototype.hasOwnProperty.call(scatter, id)) { continue; }
      if (scatter[id].kind !== 'tree' && scatter[id].kind !== 'pine') { continue; }
      if (scatter[id].group && scene) { scene.remove(scatter[id].group); }
      delete scatter[id];
    }
    scatterPool.tree = [];
    scatterPool.pine = [];
  }

  var scatter = {};   // propId → { group, kind, building, meshes, shadowOn }
  var npc3d = {};      // npc.id → { group, mixer, actions, clipMap, action, building }

  /**
   * 사물 재사용 창고(PLAN 40절 PHASE 7 Object Pool) — 걸어서 벗어난 나무·바위를
   * 그냥 버리지 않고 **같은 kind끼리** 쌓아 둔다. 인물이 온 길을 되짚어 걷는(왔다
   * 갔다 하는) 흔한 경우, 다시 지을 때 `asset3d.build()`(캐시 히트라 GLB 는
   * 새로 안 받지만 `cloneScene`·`normalize`(Box3 계산·traverse) 는 매번 다시
   * 돈다)를 또 부르지 않고 쌓아 둔 그룹을 그대로 꺼내 쓴다. GLB 표가 kind마다
   * 여러 변종(`oneOf`)을 섞어 골라도, 장식용 사물이라 변종이 살짝 바뀌어 보이는
   * 건 눈에 안 띈다 — 그 대신 재구성 비용을 통째로 아낀다.
   * 캡을 두는 건 무한정 쌓아 메모리를 먹지 않기 위해서다 — 캡을 넘으면
   * 그냥 버린다(진짜로 scene 에서 뺀다).
   */
  var scatterPool = {};        // kind → group[]
  var SCATTER_POOL_CAP = 24;
  function poolSize(kind) { return (scatterPool[kind] || []).length; }
  /** 순수(scene 없이도 동작) — group 은 `{visible}` 만 있으면 충분해 테스트가 mock 으로 확인한다 */
  function poolTake(kind) {
    var arr = scatterPool[kind];
    if (!arr || !arr.length) { return null; }
    var g = arr.pop();
    g.visible = true;
    return g;
  }
  function poolGive(kind, group) {
    var arr = scatterPool[kind] || (scatterPool[kind] = []);
    group.visible = false;
    if (arr.length >= SCATTER_POOL_CAP) {
      if (scene) { scene.remove(group); }   // 캡을 넘었다 — 안 쌓고 진짜로 치운다
      return;
    }
    arr.push(group);
  }

  /**
   * 거리 기반 그림자 LOD(PLAN 30절 "거리 기반 오브젝트 활성화" · PLAN 29절
   * "그림자 거리 제한") — 그림자는 렌더러에서 가장 비싼 항목 중 하나인데,
   * 화면 구석의 먼 나무 그림자는 눈에 잘 안 띈다. `SHADOW_R()` 안쪽만 그림자를
   * 드리우고 그 밖은 끈다(메시 지오메트리는 그대로라 "사라지는" 게 아니라
   * 그림자만 없어진다 — 이 판엔 저다각형 대타 메시가 없어 진짜 LOD 교체는
   * 못 한다는 PLAN 31절의 트레이드오프 그대로다).
   */
  function SHADOW_R() { return C().tuned('village3d.shadowR', 18); }
  /** 순수 함수 — 거리 d 가 반경 r 안이면 그림자를 켠다 */
  function wantShadowAt(d, r) { return d <= r; }
  function collectMeshes(g) {
    var list = [];
    g.traverse(function (o) { if (o.isMesh) { list.push(o); } });
    return list;
  }
  function applyShadowLOD(ent, d) {
    var want = wantShadowAt(d, SHADOW_R());
    if (ent.shadowOn === want) { return; }
    ent.shadowOn = want;
    var meshes = ent.meshes, i;
    if (!meshes) { return; }
    for (i = 0; i < meshes.length; i++) { meshes[i].castShadow = want; }
  }

  /** 타일 색 — villageData.TILES 에서 그대로 가져온다(2D 와 같은 색). floor(방 안)는
   *  마을 바닥에 안 나오니 뺀다. 색을 못 구하면(villageData 가 아직 안 실렸으면)
   *  이 표는 비고, 땅은 예전처럼 균일한 초록 한 장으로 남는다 */
  var TERRAIN_COLOR = null;
  function terrainColors() {
    if (TERRAIN_COLOR) { return TERRAIN_COLOR; }
    var VD = global.DG.villageData;
    if (!VD || !VD.TILES) { return {}; }
    TERRAIN_COLOR = {};
    var k;
    for (k in VD.TILES) {
      if (k === 'floor' || !Object.prototype.hasOwnProperty.call(VD.TILES, k)) { continue; }
      TERRAIN_COLOR[k] = VD.TILES[k].color;
    }
    return TERRAIN_COLOR;
  }
  var terrainMesh = {};     // kind → InstancedMesh
  var terrainCap = 0;       // 인스턴스 하나가 담을 수 있는 최대 칸 수
  var waterShader = null;   // onBeforeCompile 로 받아 둔 물결 셰이더(uTime 매 프레임 갱신용)
  var waterTime = 0;
  var waterRipple = null;           // 물결 반짝임 Points
  var waterRipplePos = null;        // Float32Array(cap*2) — 물 칸 중심의 (상대x,상대z)
  var waterRippleCount = 0;         // 이번에 실제로 채운 칸 수

  /** 타일 그림 — 2D 화면(village-view.js)과 **같은 파일**을 쓴다(Kenney
   *  Roguelike/RPG Pack, CC0). "3D 타일이 디테일하지 않다"(사용자, 2026-09-02)
   *  는 지적에 색 한 장이던 것을 그림으로 바꾼다. 숲 고리 네 변종은 2D 와
   *  같이 같은 잔디 그림을 재질 색(`color`)으로 물들여 쓴다 */
  var TILE_TEX_SRC = {
    grass: 'assets/sprites2d/tile_grass.png',
    grass_meadow: 'assets/sprites2d/tile_grass.png',
    grass_dark: 'assets/sprites2d/tile_grass.png',
    grass_mush: 'assets/sprites2d/tile_grass.png',
    grass_rocky: 'assets/sprites2d/tile_grass.png',
    path: 'assets/sprites2d/tile_dirt.png',
    sand: 'assets/sprites2d/tile_sand.png',
    water: 'assets/sprites2d/tile_water.png',
    stone: 'assets/sprites2d/tile_stone.png'
  };
  var tileTexCache = {};
  function tileTexture(kind) {
    var t = three();
    var src = TILE_TEX_SRC[kind];
    if (!src || !t) { return null; }
    if (tileTexCache[src]) { return tileTexCache[src]; }
    var tex = new t.TextureLoader().load(src);
    /* 도트그림이라 흐려지면 안 된다 — 가까이서 봐도 또렷한 픽셀아트 그대로 */
    tex.magFilter = t.NearestFilter;
    tex.minFilter = t.NearestFilter;
    if (t.SRGBColorSpace) { tex.colorSpace = t.SRGBColorSpace; }
    tileTexCache[src] = tex;
    return tex;
  }

  /** 바이옴별 하늘·안개 색(PLAN 11절 "색감"). green 은 예전부터 쓰던 하늘색 그대로 */
  var FOG_COLOR = { green: 0x8fc7e8, meadow: 0xbfe0a8, dark: 0x445a48, mushroom: 0x5f7a68, rocky: 0x9a988a };
  var curBiome = null, curPhase = null;
  var hemiLight = null, sunLight = null;

  /**
   * 시간대별 조명(PLAN 40절 PHASE 5 Day/Night — "처음에는 실제 시간 시스템까지
   * 만들 필요 없다. 간단한 day/night preset만 만든다" 그대로). `villageData.PHASES`
   * (2D 가 쓰는 그 표)의 key 를 그대로 받아 쓴다 — 새 시간 계산을 만들지 않는다.
   * dark 는 바이옴 하늘색에 곱하는 밝기(1 이 낮). sun/hemi 는 방향광/반구광 값이다.
   */
  var PHASE_DARK = { dawn: 0.55, day: 1.0, even: 0.7, night: 0.28 };
  var PHASE_SUN = {
    dawn:  { color: 0xffd9a0, intensity: 0.55 },
    day:   { color: 0xfff4e0, intensity: 1.0 },
    even:  { color: 0xff8a4a, intensity: 0.6 },
    night: { color: 0x8fa8ff, intensity: 0.12 }
  };
  var PHASE_HEMI = { dawn: 0.55, day: 0.9, even: 0.6, night: 0.3 };
  /** 날씨(PLAN 21절)도 하늘을 더 어둡히고 안개를 짙힌다(fog near/far 를 좁힌다) —
   *  clear 는 기준값(1) 그대로, cloud/rain/snow 순으로 점점 짙어진다 */
  var WEATHER_DARK = { clear: 1, cloud: 0.85, rain: 0.6, snow: 0.82 };
  var WEATHER_FOG = { clear: 1, cloud: 0.85, rain: 0.5, snow: 0.68 };
  var FOG_NEAR = 30, FOG_FAR = 160;
  var curWeatherSky = null;

  /** hex 색을 f(0~1)배 어둡게 — 순수 함수(진단에서 scene 없이도 확인 가능) */
  function darken(hex, f) {
    var r = Math.round(((hex >> 16) & 255) * f);
    var g = Math.round(((hex >> 8) & 255) * f);
    var b = Math.round((hex & 255) * f);
    return (r << 16) | (g << 8) | b;
  }

  /** 시간대·날씨 밝기를 곱한 값 — 순수 함수 */
  function skyDark(ph, wk) {
    return (PHASE_DARK[ph] != null ? PHASE_DARK[ph] : 1) * (WEATHER_DARK[wk] != null ? WEATHER_DARK[wk] : 1);
  }

  /** 인물이 선 칸의 바이옴·시간대·날씨 중 하나라도 바뀔 때만 하늘·안개·조명을 새로 칠한다 */
  function syncSky() {
    var V = global.DG.village, VD = global.DG.villageData;
    if (!V || !V.biomeAt || !scene) { return; }
    var raw = V.raw(), TILE = V.TILE;
    var b = V.biomeAt(Math.floor(raw.player.x / TILE), Math.floor(raw.player.y / TILE));
    var ph = (VD && VD.phaseOf) ? VD.phaseOf(new Date().getHours()).key : 'day';
    var wk = (VD && VD.weather) ? VD.weather().key : 'clear';
    if (b === curBiome && ph === curPhase && wk === curWeatherSky) { return; }
    curBiome = b; curPhase = ph; curWeatherSky = wk;
    var c = darken(FOG_COLOR[b] || FOG_COLOR.green, skyDark(ph, wk));
    scene.background.setHex(c);
    scene.fog.color.setHex(c);
    var fogMul = WEATHER_FOG[wk] != null ? WEATHER_FOG[wk] : 1;
    scene.fog.near = FOG_NEAR * fogMul;
    scene.fog.far = FOG_FAR * fogMul;
    var sunCfg = PHASE_SUN[ph] || PHASE_SUN.day;
    if (sunLight) { sunLight.color.setHex(sunCfg.color); sunLight.intensity = sunCfg.intensity * (WEATHER_DARK[wk] != null ? WEATHER_DARK[wk] : 1); }
    if (hemiLight) { hemiLight.intensity = (PHASE_HEMI[ph] != null ? PHASE_HEMI[ph] : 0.9) * (WEATHER_DARK[wk] != null ? WEATHER_DARK[wk] : 1); }
  }

  /** 비/눈은 날씨 키가 그대로, 반딧불이(PLAN 22절)는 맑은 밤에만 — 순수 함수라 scene 없이도 확인된다 */
  function weatherShows(wk) { return { rain: wk === 'rain', snow: wk === 'snow' }; }
  function fireflyVisible(ph, wk) { return ph === 'night' && wk !== 'rain' && wk !== 'snow'; }

  /** 물결(PLAN 12절) — 칸의 세계 좌표(wx,wz)와 시각(time)만으로 그 칸이 지금
   *  얼마나 솟았는지 준다. **물 셰이더(GLSL, `waterMaterial()`)와 같은 식**을
   *  써서 반짝임 점(`syncWaterRipple`)이 실제 파동과 같은 위상으로 움직인다 —
   *  둘이 따로 놀면 반짝임이 물결과 어긋나 보인다. 순수 함수 */
  function waterWaveY(wx, wz, time) {
    return Math.sin((wx + wz) * WATER_WAVE_FREQ() + time * WATER_WAVE_SPEED()) * WATER_WAVE_AMP();
  }

  /** base(시작값) 에서 elapsed*speed 만큼 떨어뜨리고 height 로 감는다(modulo) —
   *  매 프레임 새 난수를 안 뽑고도 자연스럽게 반복 낙하한다. 순수 함수 */
  function wrapY(base, elapsed, speed, height) {
    var y = base - elapsed * speed;
    return ((y % height) + height) % height;
  }

  var WEATHER_FX = { rain: null, snow: null, firefly: null };
  var weatherClock = 0;
  var RAIN_N = 140, RAIN_H = 14, RAIN_SPEED = 9;
  var SNOW_N = 90, SNOW_H = 12, SNOW_SPEED = 1.6;
  var FIREFLY_N = 40, FIREFLY_R = 18, FIREFLY_H = 3.2;

  /**
   * 비·눈·반딧불이 파티클(PLAN 21·22절)을 미리 지어 둔다. **인물은 늘
   * 원점(0,0,0)** 이므로 이 파티클도 원점 중심으로 흩뿌리면 따로 위치를
   * 옮기지 않아도 늘 인물 둘레에 보인다 — 실제로 바뀌는 건 낙하(y)뿐이다.
   */
  function buildWeatherFX(t) {
    var area = RENDER_R() * 1.3;

    function makePoints(n, spreadXZ, spreadY, size, color, opacity) {
      var geo = new t.BufferGeometry();
      var pos = new Float32Array(n * 3);
      var base = new Float32Array(n);
      for (var i = 0; i < n; i++) {
        pos[i * 3] = (Math.random() * 2 - 1) * spreadXZ;
        pos[i * 3 + 2] = (Math.random() * 2 - 1) * spreadXZ;
        base[i] = Math.random() * spreadY;
        pos[i * 3 + 1] = base[i];
      }
      geo.setAttribute('position', new t.BufferAttribute(pos, 3));
      var mat = new t.PointsMaterial({ color: color, size: size, transparent: true, opacity: opacity, depthWrite: false });
      var pts = new t.Points(geo, mat);
      pts.visible = false;
      pts.userData.base = base;
      pts.userData.spreadY = spreadY;
      scene.add(pts);
      return pts;
    }

    WEATHER_FX.rain = makePoints(RAIN_N, area, RAIN_H, 0.06, 0x9fc3e8, 0.55);
    WEATHER_FX.snow = makePoints(SNOW_N, area, SNOW_H, 0.14, 0xffffff, 0.9);
    WEATHER_FX.firefly = makePoints(FIREFLY_N, FIREFLY_R, FIREFLY_H, 0.22, 0xf6ef8a, 0.85);
  }

  function fallStep(pts, speed) {
    var pos = pts.geometry.attributes.position, base = pts.userData.base, h = pts.userData.spreadY;
    for (var i = 0; i < base.length; i++) { pos.array[i * 3 + 1] = wrapY(base[i], weatherClock, speed, h); }
    pos.needsUpdate = true;
  }

  function floatStep(pts) {
    var pos = pts.geometry.attributes.position, base = pts.userData.base;
    for (var i = 0; i < base.length; i++) {
      pos.array[i * 3 + 1] = base[i] + Math.sin(weatherClock * 0.8 + i) * 0.4 + 0.6;
    }
    pos.needsUpdate = true;
  }

  /** 물결 반짝임 점(PLAN 12절) 창고 — 자리는 `syncTerrain()`이 물 칸을 세우는
   *  김에 채워 준다(`waterRipplePos`). 칸 수 상한은 `terrainCap`처럼 초기화
   *  때 한 번만 정한다 */
  function buildWaterRipple(t) {
    var cap = WATER_RIPPLE_CAP();
    var geo = new t.BufferGeometry();
    geo.setAttribute('position', new t.BufferAttribute(new Float32Array(cap * 3), 3));
    var mat = new t.PointsMaterial({ color: 0xeaf7ff, size: 0.16, transparent: true, opacity: 0.8, depthWrite: false });
    waterRipple = new t.Points(geo, mat);
    waterRipple.visible = false;
    waterRipplePos = new Float32Array(cap * 2);   // (상대x,상대z) 쌍 — syncTerrain() 이 채운다
    waterRippleCount = 0;
    scene.add(waterRipple);
  }

  /** 물결(PLAN 12절) — 매 프레임(움직임 여부와 무관하게) 물 재질의 파동
   *  유니폼과 반짝임 점 높이를 시각(waterTime)으로 갱신한다. **자리 자체는
   *  안 다시 계산한다** — `syncTerrain()`이 채워 둔 `waterRipplePos`(물 칸이
   *  움직일 때만 갱신)를 그대로 읽고 y 하나만 `waterWaveY()`로 다시 잰다,
   *  그래서 서 있을 때도 물결은 돌지만 자리 재계산(비싼 쪽)은 안 한다 */
  function syncWaterRipple(dt) {
    waterTime += dt;
    if (waterShader) { waterShader.uniforms.uTime.value = waterTime; }
    if (!waterRipple) { return; }
    if (!waterRippleCount) { waterRipple.visible = false; return; }
    waterRipple.visible = true;
    var pos = waterRipple.geometry.attributes.position, rx, rz, i;
    for (i = 0; i < waterRippleCount; i++) {
      rx = waterRipplePos[i * 2]; rz = waterRipplePos[i * 2 + 1];
      pos.array[i * 3] = rx;
      pos.array[i * 3 + 1] = waterWaveY(rx, rz, waterTime) - WATER_DEPTH() + 0.05;
      pos.array[i * 3 + 2] = rz;
    }
    waterRipple.geometry.setDrawRange(0, waterRippleCount);
    pos.needsUpdate = true;
  }

  /** 날씨(town.js 의 그것)·시간대에 맞춰 파티클을 켜고 끈다 */
  function syncWeatherFX(dt) {
    if (!scene) { return; }
    var VD = global.DG.villageData;
    var wk = (VD && VD.weather) ? VD.weather().key : 'clear';
    weatherClock += dt;
    var shows = weatherShows(wk);
    var fly = fireflyVisible(curPhase, wk);

    if (WEATHER_FX.rain) {
      WEATHER_FX.rain.visible = shows.rain;
      if (shows.rain) { fallStep(WEATHER_FX.rain, RAIN_SPEED); }
    }
    if (WEATHER_FX.snow) {
      WEATHER_FX.snow.visible = shows.snow;
      if (shows.snow) { fallStep(WEATHER_FX.snow, SNOW_SPEED); }
    }
    if (WEATHER_FX.firefly) {
      WEATHER_FX.firefly.visible = fly;
      if (fly) { floatStep(WEATHER_FX.firefly); }
    }
  }

  /** three 자체가 없거나(파일 못 받음) WebGL 컨텍스트를 못 만들면 false */
  function available() { return !!three() && !failed; }
  /** 지금 화면에 이게 그려지고 있나 — 손잡이 + 초기화 성공 둘 다 참이어야 한다 */
  function active() { return ON() && ready; }

  /** HDRI 환경광(IBL) — Poly Haven CC0 "Alps Field"(사철 무료, 로그인 없이 받음).
   *  2026-09-02 사용자가 "사실처럼" 을 요청해 얹었다. **하늘 색은 안 바꾼다** —
   *  `scene.background` 는 그대로 바이옴별 단색(`syncFog`)에 맡기고, `scene.environment`
   *  에만 물려 반사·PBR 조명만 사실적으로 만든다. 실패해도(HDR 못 받음 등) 그냥
   *  옛 HemisphereLight+DirectionalLight 만으로 돈다 — 여기서도 "안 되면 조용히
   *  넘어간다" 원칙을 지킨다 */
  var HDRI_SRC = 'assets/hdri/alps_field_1k.hdr';
  function loadEnvironment(t) {
    if (!t.RGBELoader || !renderer) { return; }
    var pmrem = new t.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    new t.RGBELoader().load(HDRI_SRC, function (hdr) {
      var envMap = pmrem.fromEquirectangular(hdr).texture;
      if (scene) { scene.environment = envMap; }
      hdr.dispose();
      pmrem.dispose();
    }, undefined, function () {
      pmrem.dispose();   // 못 받아도 조용히 — 옛 조명만으로 그대로 돈다
    });
  }

  function init(cv) {
    var t = three();
    canvas = cv;
    if (!t || !canvas) { failed = true; return; }
    try {
      renderer = new t.WebGLRenderer({ canvas: canvas, antialias: true });
    } catch (e) { failed = true; return; }
    /* PLAN 38절 "모바일 품질 프리셋" — 켤 때 한 번 기기를 보고 고른 등급(low/medium/high)이
       픽셀비·그림자를 함께 정한다(등급이 세 갈래인데 손잡이를 따로 두면 조합이 어긋난다,
       사가블로 dungeon3d.js 의 QUALITY_PRESET과 같은 이유) */
    var q = QUALITY_PRESET[tier()];
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, q.dpr));
    /* 실사 텍스처(사람 Mixamo·나무껍질 등)가 톤매핑 없이 밋밋하게 뜨는 것을 막는다.
       색공간도 sRGB 로 맞춘다 — 안 맞으면 텍스처가 흐리게(감마 안 먹은 채로) 뜬다 */
    if (t.ACESFilmicToneMapping) { renderer.toneMapping = t.ACESFilmicToneMapping; }
    renderer.toneMappingExposure = 1.0;
    if (t.SRGBColorSpace) { renderer.outputColorSpace = t.SRGBColorSpace; }
    renderer.shadowMap.enabled = q.shadow;
    if (t.PCFSoftShadowMap) { renderer.shadowMap.type = t.PCFSoftShadowMap; }

    scene = new t.Scene();
    scene.background = new t.Color(0x8fc7e8);
    scene.fog = new t.Fog(0x8fc7e8, 30, 160);

    camera = new t.PerspectiveCamera(FOV(), 1, 0.1, 400);

    hemiLight = new t.HemisphereLight(0xffffff, 0x4a5a3a, 0.9);
    scene.add(hemiLight);
    sunLight = new t.DirectionalLight(0xfff4e0, 1.0);
    sunLight.position.set(-30, 40, 20);
    sunLight.castShadow = q.shadow;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -40; sunLight.shadow.camera.right = 40;
    sunLight.shadow.camera.top = 40; sunLight.shadow.camera.bottom = -40;
    sunLight.shadow.bias = -0.0015;
    scene.add(sunLight);
    scene.add(sunLight.target);   // 인물은 늘 원점 — 해가 늘 원점을 비추게 고정

    var ground = new t.Mesh(
      new t.PlaneGeometry(GROUND_SIZE(), GROUND_SIZE()),
      new t.MeshLambertMaterial({ color: 0x63b04a })
    );
    ground.rotation.x = -Math.PI / 2;
    /* 색칠한 타일(y=0)보다 살짝 아래 — 이음매가 안 보인다. **물 칸(y=-WATER_DEPTH())
       보다는 반드시 더 깊어야 한다** — 안 그러면 이 배경판이 물 칸을 그대로
       덮어 가려 버린다(2026-09-09, CDP 스크린샷으로 처음 잡아낸 버그 — 물이
       파동·반사까지 다 얹었는데 화면엔 늘 초록만 보였다. 옛 값 -0.02는 기본
       WATER_DEPTH 0.12보다 얕아 물 칸이 통째로 이 판 밑에 깔려 있었다) */
    ground.position.y = -(WATER_DEPTH() + 0.02);
    ground.receiveShadow = true;
    scene.add(ground);

    loadEnvironment(t);
    initTerrain();
    buildWeatherFX(t);
    resize();
    global.addEventListener('resize', resize);
    /* PLAN 40절 PHASE 6 · PLAN 25절 "orientationchange / resize 둘 다 처리한다" —
       구형 iOS Safari는 방향이 바뀌어도 resize 가 늦거나 안 올 때가 있다.
       resize()는 그냥 다시 불러도 결과가 같은 순수 계산(camera.aspect 등)이라
       두 번 걸려도 해가 없다 */
    global.addEventListener('orientationchange', resize);
    bindCamControl(canvas);
    ready = true;
    syncVisibility();
    buildPlayer();
  }

  /** 물 재질(PLAN 12절 "파동·반사") — 나머지 여덟 칸(MeshLambertMaterial)과
   *  달리 `MeshStandardMaterial`을 쓴다. **반사**는 새 렌더패스 없이 공짜로
   *  얻는다 — `scene.environment`(위 HDRI, `loadEnvironment()`)를 three.js가
   *  PBR 재질에 자동으로 물려 준다, 따로 envMap 을 지정할 필요가 없다.
   *  **파동**은 `onBeforeCompile`로 정점 셰이더에 한 줄 얹는다 — `waterWaveY()`와
   *  **같은 식**(주파수·속도·진폭 상수까지)을 GLSL로 그대로 옮겨, 반짝임 점
   *  (`syncWaterRipple`)과 실제 파도가 어긋나지 않게 한다. `instanceMatrix[3].xz`
   *  는 three.js 가 InstancedMesh 용으로 셰이더에 자동으로 얹어 주는 그 칸의
   *  월드 좌표라 새 유니폼 없이 칸마다 다른 위상을 낼 수 있다.
   *  **일부러 안 고친 것** — 칸마다 위상이 달라 이웃 물 칸과 맞닿는 가장자리가
   *  완전히 안 맞물린다(진폭이 4.5cm 뿐이라 눈에 크게 띄진 않는다). 물 전체를
   *  하나의 큰 평면으로 잇는 편이 이음매는 없겠지만 지금의 칸별 InstancedMesh
   *  구조를 갈아엎어야 해서 이번엔 안 건드렸다 */
  function waterMaterial(t, color, map) {
    var mat = new t.MeshStandardMaterial({ color: color, map: map, roughness: 0.18, metalness: 0.25 });
    var amp = WATER_WAVE_AMP(), freq = WATER_WAVE_FREQ(), speed = WATER_WAVE_SPEED();
    mat.onBeforeCompile = function (shader) {
      shader.uniforms.uTime = { value: 0 };
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n' +
        '  transformed.y += sin((instanceMatrix[3].x + instanceMatrix[3].z) * ' + freq.toFixed(4) +
        ' + uTime * ' + speed.toFixed(4) + ') * ' + amp.toFixed(4) + ';'
      );
      waterShader = shader;
    };
    return mat;
  }

  /** 종류별 InstancedMesh 를 미리 만들어 둔다 — 칸 수는 매 프레임 늘렸다 줄였다 한다 */
  function initTerrain() {
    var t = three();
    var colors = terrainColors(), k, tileM = tileMeters();
    var geo = new t.PlaneGeometry(tileM, tileM);
    geo.rotateX(-Math.PI / 2);
    /* 물만 잘게 나눈다(4×4) — 파동이 칸 하나를 통째로 기울이지 않고
       칸 안에서도 부드럽게 굽이치게. 나머지 여덟 칸은 안 바뀐 것과 같은 4각형 */
    var waterGeo = new t.PlaneGeometry(tileM, tileM, 4, 4);
    waterGeo.rotateX(-Math.PI / 2);
    var r = GROUND_TILE_R();
    terrainCap = (2 * r + 1) * (2 * r + 1);
    for (k in colors) {
      if (!Object.prototype.hasOwnProperty.call(colors, k)) { continue; }
      var mat = k === 'water' ?
        waterMaterial(t, new t.Color(colors[k]), tileTexture(k)) :
        new t.MeshLambertMaterial({ color: new t.Color(colors[k]), map: tileTexture(k) });
      var im = new t.InstancedMesh(k === 'water' ? waterGeo : geo, mat, terrainCap);
      im.count = 0;
      scene.add(im);
      terrainMesh[k] = im;
    }
    buildWaterRipple(t);
  }

  /** 마을 좌표 한 타일(`V.TILE`)이 3D 로 몇 미터인지 — village.js 가 없으면(진단 등) 3.2m 기본값 */
  function tileMeters() {
    var V = global.DG.village;
    return (V ? V.TILE : 40) * WORLD_SCALE();
  }

  function resize() {
    if (!renderer || !camera) { return; }
    var w = global.innerWidth, h = global.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / (h || 1);
    camera.updateProjectionMatrix();
  }

  /** 2D 캔버스와 3D 캔버스는 **하나만 보인다** — 다른 화면의 두 배 켠 자리와 같은 원칙 */
  function syncVisibility() {
    var map2d = document.getElementById('map');
    if (!canvas) { return; }
    var on = active();
    canvas.style.display = on ? 'block' : 'none';
    if (map2d) { map2d.style.display = on ? 'none' : 'block'; }
  }

  function toggle() {
    if (!available()) { return false; }
    C().setTune('village3d.on', ON() ? 0 : 1);
    syncVisibility();
    return ON();
  }

  function buildPlayer() {
    var save = C().save;
    var heroId = (save.party && save.party[0]) || null;
    asset3d().build('hero', { id: heroId }, function (g) {
      if (!g || !scene) { return; }
      player.group = g;
      player.mixer = g.userData.mixer || null;
      player.actions = g.userData.actions || null;
      player.clipMap = g.userData.clipMap || null;
      g.scale.setScalar(PLAYER_H());
      scene.add(g);
      playAction(player, 'idle');
    });
  }

  /** entity(player 또는 npc3d 한 칸)의 몸짓을 slot(idle/walk 등)으로 바꾼다 */
  function playAction(entity, slot) {
    if (!entity.actions || !entity.clipMap) { return; }
    var name = entity.clipMap[slot];
    if (!name || !entity.actions[name]) { return; }
    var act = entity.actions[name];
    if (entity.action === act) { return; }
    if (entity.action) { entity.action.fadeOut(0.15); }
    act.reset().fadeIn(0.15).play();
    entity.action = act;
  }

  /**
   * 카메라 자리 — **순수 함수다**(사가블로 dungeon3d.js 의 camAim/camAim3rd 와 같은 결이되,
   * 여기는 둘을 딱 자르지 않고 `t`(camTiltMix, 0~1)로 이어 붙인다 — **따로 켜는 버튼이
   * 없다**(2026-09-02 사용자 요청). t=0(어깨너머 3인칭)은 걷는 방향(facingYaw) 뒤를
   * 그대로 따라 돈다. t=1(3/4 부감/쿼터뷰)은 facingYaw 기여가 0 이 되어 걸어도 화면이
   * 안 돌아가는 원작 쿼터뷰가 된다 — 그 사이는 반지름·높이·방위 모두 선형으로 섞는다.
   * 인물은 늘 원점(0,0,0)이라 lookAt 은 호출부에서 고정값 하나로 처리한다.
   */
  function camPose(t, facingYaw, mouseYaw, radius0, height0, radius1, height1) {
    var radius = radius0 + (radius1 - radius0) * t;
    var height = height0 + (height1 - height0) * t;
    var az = mouseYaw + (1 - t) * (facingYaw + Math.PI);
    return { x: Math.sin(az) * radius, y: height, z: Math.cos(az) * radius };
  }

  /** 화각도 t 로 섞는다 — 순수 함수. 좁아질수록(정사영에 가까워질수록) 원근 왜곡이 준다 */
  function camFov(t, fov0, fov1) { return fov0 + (fov1 - fov0) * t; }

  /** 걸음 방향 → 카메라가 뒤에서 도는 각. 마을 좌표(x,y) → 3D(x,-z 앞) */
  function syncCamera() {
    var V = global.DG.village;
    if (!V) { return; }
    var raw = V.raw();
    var px = raw.player.x, py = raw.player.y;
    if (!haveLast) { lastPX = px; lastPY = py; haveLast = true; }
    var dx = px - lastPX, dy = py - lastPY;
    var moved = Math.hypot(dx, dy);
    if (moved > MOVE_EPS() * (1 / 60)) {
      facingYaw = Math.atan2(dx, dy);
      playAction(player, 'walk');
    } else {
      playAction(player, 'idle');
    }
    lastPX = px; lastPY = py;

    if (player.group) { player.group.rotation.y = facingYaw; }

    /* userZoom 이 커질수록(확대) 거리를 좁힌다 — 그래서 여기선 나눈다.
       iso 쪽 끝값은 ISO_DIST()·ISO_TILT() 를 camPose 가 쓰던 (수평 반지름, 높이) 짝으로
       미리 풀어 둔다 — camPose 자체는 그 둘의 뜻(거리·기울기)을 몰라도 된다 */
    var radius0 = CAM_DIST() / userZoom, height0 = CAM_HIGH() / userZoom;
    var isoDist = ISO_DIST(), isoTilt = ISO_TILT();
    var radius1 = (isoDist * isoTilt) / userZoom, height1 = (isoDist * (1 - isoTilt * 0.55)) / userZoom;
    var pos = camPose(camTiltMix, facingYaw, mouseYaw, radius0, height0, radius1, height1);
    camera.position.set(pos.x, pos.y, pos.z);
    camera.lookAt(0, PLAYER_H() * 0.75, 0);

    /* 화각도 거리·높이와 함께 섞는다 — 좁아질수록(정사영에 가까워질수록) 디아블로류
       특유의 평평한 쿼터뷰가 된다. fov 가 안 바뀐 프레임엔 updateProjectionMatrix
       를 또 부르지 않는다(third 에 머물 때 매 프레임 헛일하지 않게) */
    var fov = camFov(camTiltMix, FOV(), ISO_FOV());
    if (Math.abs(camera.fov - fov) > 1e-6) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }

  /**
   * 나무·바위·꽃·잡초를 인물 둘레에 세운다 (PLAN 9절 ForestDecorator).
   * **새로 흩뿌리지 않는다** — `V.raw().props` 를 그대로 읽으므로 2D 에서
   * 보던 그 나무가 3D 에서도 같은 자리에 선다. 가깝지만 아직 없으면 짓고
   * (한 프레임에 `MAX_BUILD_PER_STEP()` 개까지만), 멀어지면 치운다.
   */
  function syncScatter() {
    var V = global.DG.village;
    if (!V || !scene) { return; }
    syncTreeSeason();
    var raw = V.raw(), props = raw.props.concat(raw.animals || []), px = raw.player.x, py = raw.player.y;
    var scale = WORLD_SCALE(), renderU = RENDER_R() / scale, cullU = CULL_R() / scale;
    var within = {}, budget = MAX_BUILD_PER_STEP();
    var i, p, key, ent, d;

    for (i = 0; i < props.length; i++) {
      p = props[i];
      if (INST_KIND[p.kind]) { continue; }             // InstancedMesh 경로(syncInstScatter)가 대신 세운다
      key = seasonalTreeKey(SCATTER_KIND[p.kind]);
      if (!key) { continue; }
      d = Math.hypot(p.x - px, p.y - py);
      if (d > cullU) { continue; }                    // 완전히 멀다 — 후보에서도 뺀다
      within[p.id] = true;
      ent = scatter[p.id];
      if (ent && ent.group) {
        ent.group.position.set((p.x - px) * scale, 0, (p.y - py) * scale);
        applyShadowLOD(ent, d);
        continue;
      }
      if (d > renderU) { continue; }                  // cull 과 render 사이 — 있으면 두고, 새로 안 짓는다
      if (ent && ent.building) { continue; }           // 이미 요청해 둔 것 — 또 부르지 않는다

      /* Object Pool(PLAN 40절 PHASE 7) — 같은 kind 를 쌓아 둔 게 있으면 새로
         짓지 않고 그대로 꺼내 쓴다. 예산(budget)을 안 쓴다 — 비동기 build() 가
         아니라 이미 다 만들어진 그룹을 자리만 옮기는 것이라 공짜에 가깝다 */
      var pooled = poolTake(p.kind);
      if (pooled) {
        pooled.scale.setScalar(SCATTER_H[p.kind] || 1);
        pooled.position.set((p.x - px) * scale, 0, (p.y - py) * scale);
        ent = scatter[p.id] = { group: pooled, kind: p.kind, building: false, meshes: pooled.userData.lodMeshes, shadowOn: null };
        if (scene && pooled.parent !== scene) { scene.add(pooled); }
        applyShadowLOD(ent, d);
        continue;
      }

      if (budget <= 0) { continue; }                   // 이번 프레임 몫을 다 썼다
      budget--;
      ent = scatter[p.id] = { group: null, kind: p.kind, building: true, meshes: null, shadowOn: null };
      (function (id, kind, wx, wy, dist) {
        asset3d().build(key, { id: id }, function (g) {
          var cur = scatter[id];
          if (!cur) { return; }                        // 그새 멀어져 치워졌다
          cur.building = false;
          if (!g || !scene) { return; }
          g.scale.setScalar(SCATTER_H[kind] || 1);
          g.position.set((wx - px) * scale, 0, (wy - py) * scale);
          g.userData.lodMeshes = collectMeshes(g);
          cur.group = g;
          cur.meshes = g.userData.lodMeshes;
          applyShadowLOD(cur, dist);
          scene.add(g);
        });
      })(p.id, p.kind, p.x, p.y, d);
    }

    /* cullU 밖으로 나간 것만 치운다 — renderU~cullU 사이는 그대로 둔다(경계 깜빡임 방지) */
    for (key in scatter) {
      if (!Object.prototype.hasOwnProperty.call(scatter, key) || within[key]) { continue; }
      ent = scatter[key];
      if (ent.group) { poolGive(ent.kind, ent.group); }
      delete scatter[key];
    }
  }

  var instMesh = {};       // "url|primIdx" → InstancedMesh(재질 하나 몫)
  var instDummy = null;    // 행렬 조립용 임시 Object3D — terrainMesh 의 dummy 와 같은 결
  function instKey(url, i) { return url + '|' + i; }

  /** InstancedMesh 하나를 확보한다 — 자리가 모자라면(need > 지금 칸 수) 두 배로 새로 짓는다.
   *  순수하지 않다(scene·three 를 쓴다) — 자가진단은 instKey 처럼 순수한 조각만 검사한다. */
  function ensureInstMesh(key, geo, mat, need) {
    var im = instMesh[key];
    if (im && im.instanceMatrix.count >= need) { return im; }
    var t = three();
    var cap = Math.max(need, 8, im ? im.instanceMatrix.count * 2 : 0);
    var next = new t.InstancedMesh(geo, mat, cap);
    next.count = 0;
    /* 작은 장식물(잔디·꽃·버섯 등, 0.2~0.8m)이라 스스로 그림자를 드리우진
       않는다(InstancedMesh는 개별 인스턴스 그림자 on/off를 못 준다 — 켜면
       전부, 끄면 전부다. `applyShadowLOD`가 하던 거리별 개별 조절을 대신 못 하니
       아예 끈다. CLAUDE.md 최적화 순서 7번째 "shadow 조절"에 해당하는 선택이다).
       다른 사물의 그림자는 그대로 받는다(receiveShadow=true) — 바닥처럼 어색하지 않다 */
    next.castShadow = false;
    next.receiveShadow = true;
    if (im) { scene.remove(im); im.dispose(); }
    scene.add(next);
    instMesh[key] = next;
    return next;
  }

  /**
   * 잔디·꽃·버섯 등 여덟 종(PLAN 40절 PHASE 7, 위 INST_KIND)을 InstancedMesh로
   * 세운다. `syncScatter()`와 달리 Object Pool도, 예산(budget)도 없다 — 이미
   * 다 구운 지오메트리 자리만 갱신하는 것이라 비동기 build() 비용 자체가 없다.
   * `asset3d.partsFor()`가 아직 못 준 변종(로딩 중)은 이번 프레임엔 그냥
   * 건너뛴다 — 다음 프레임에 다시 물어보면 실린 뒤엔 나온다.
   */
  function syncInstScatter() {
    var V = global.DG.village, t = three();
    if (!V || !scene || !t) { return; }
    if (!instDummy) { instDummy = new t.Object3D(); }
    var raw = V.raw(), px = raw.player.x, py = raw.player.y;
    var scale = WORLD_SCALE(), renderU = RENDER_R() / scale;
    var props = raw.props, i, p, key3d, d, rec;
    var byUrl = {};   // url → { parts, items:[{x,z,h}] }

    for (i = 0; i < props.length; i++) {
      p = props[i];
      if (!INST_KIND[p.kind]) { continue; }
      key3d = SCATTER_KIND[p.kind];
      if (!key3d) { continue; }
      d = Math.hypot(p.x - px, p.y - py);
      if (d > renderU) { continue; }
      rec = asset3d().partsFor(key3d, { id: p.id });
      if (!rec) { continue; }        // 아직 안 실렸다
      var g = byUrl[rec.url] || (byUrl[rec.url] = { parts: rec.parts, items: [] });
      g.items.push({ x: (p.x - px) * scale, z: (p.y - py) * scale, h: SCATTER_H[p.kind] || 1 });
    }

    var url, grp, parts, j, part, im, idx, item, key;
    for (url in byUrl) {
      if (!Object.prototype.hasOwnProperty.call(byUrl, url)) { continue; }
      grp = byUrl[url];
      parts = grp.parts;
      for (j = 0; j < parts.length; j++) {
        part = parts[j];
        key = instKey(url, j);
        im = ensureInstMesh(key, part.geometry, part.material, grp.items.length);
        for (idx = 0; idx < grp.items.length; idx++) {
          item = grp.items[idx];
          instDummy.position.set(item.x, 0, item.z);
          instDummy.scale.setScalar(item.h);
          instDummy.rotation.set(0, 0, 0);
          instDummy.updateMatrix();
          im.setMatrixAt(idx, instDummy.matrix);
        }
        im.count = grp.items.length;
        im.instanceMatrix.needsUpdate = true;
      }
    }
    /* 이번 프레임에 하나도 안 쓰인 변종(플레이어가 아예 멀어진 경우)은
       count 를 0 으로 낮춰야 유령처럼 남지 않는다 */
    for (key in instMesh) {
      if (!Object.prototype.hasOwnProperty.call(instMesh, key)) { continue; }
      if (usedInstKey(key, byUrl)) { continue; }
      instMesh[key].count = 0;
    }
  }
  /** 순수 함수 — key("url|idx")의 url이 이번 프레임 byUrl에 있었는지 */
  function usedInstKey(key, byUrl) {
    var url = key.slice(0, key.lastIndexOf('|'));
    return Object.prototype.hasOwnProperty.call(byUrl, url);
  }

  /**
   * 숲 NPC 다섯(PLAN 40절 PHASE 4)을 플레이어와 같은 GLB(`asset3d` 의 'hero'
   * 표, Quaternius RPG Character Pack)로 세운다. 자리가 고정이고 수가 다섯뿐이라
   * 스캐터처럼 컬링·예산을 두지 않는다 — 없으면 한 번만 짓고, 있으면 자리만 갱신.
   */
  function syncNpcs(dt) {
    var V = global.DG.village;
    if (!V || !scene) { return; }
    var raw = V.raw(), px = raw.player.x, py = raw.player.y, scale = WORLD_SCALE();
    var npcs = raw.npcs || [], i, npc, slot;
    for (i = 0; i < npcs.length; i++) {
      npc = npcs[i];
      slot = npc3d[npc.id];
      if (!slot) {
        slot = npc3d[npc.id] = { group: null, mixer: null, actions: null, clipMap: null, action: null, building: true };
        (function (id) {
          asset3d().build('hero', { id: id }, function (g) {
            var cur = npc3d[id];
            if (!cur) { return; }
            cur.building = false;
            if (!g || !scene) { return; }
            cur.group = g;
            cur.mixer = g.userData.mixer || null;
            cur.actions = g.userData.actions || null;
            cur.clipMap = g.userData.clipMap || null;
            g.scale.setScalar(PLAYER_H());
            scene.add(g);
            playAction(cur, 'idle');
          });
        })(npc.id);
        continue;
      }
      if (!slot.group) { continue; }   // 아직 짓는 중
      slot.group.position.set((npc.x - px) * scale, 0, (npc.y - py) * scale);
      if (slot.mixer) { slot.mixer.update(dt); }
    }
  }

  var dummy = null;
  var lastTermPx = null, lastTermPy = null, lastTermR = null, lastTermScale = null;

  /**
   * 인물 둘레 타일에 색을 입힌다 (PLAN 7절 지형 다양화 · PLAN 40절 Terrain).
   * `V.tileAt()` 을 그대로 읽으므로 2D 에서 보던 흙길·모래·물이 3D 에서도
   * 같은 자리에 있다 — 여기서도 새 지형을 만들지 않는다.
   */
  function syncTerrain() {
    var V = global.DG.village, t = three();
    if (!V || !scene || !t) { return; }
    var colors = terrainColors(), k;
    if (!Object.keys(colors).length) { return; }     // villageData 가 아직이면 예전 초록 한 장 그대로
    if (!dummy) { dummy = new t.Object3D(); }

    var raw = V.raw(), px = raw.player.x, py = raw.player.y, TILE = V.TILE;
    var scale = WORLD_SCALE();
    var r = GROUND_TILE_R();
    /* 인물이 조금도 안 움직였으면(제자리 idle) 841칸(반경14 기준)을 다시
       돌며 InstancedMesh 버퍼 9개를 통째로 GPU 로 재전송할 필요가 없다 —
       타일 색은 인물 위치만으로 정해지므로 자리가 그대로면 결과도 그대로다
       (감사로 찾은 최우선 낭비, 2026-09-08) */
    if (px === lastTermPx && py === lastTermPy && r === lastTermR && scale === lastTermScale) { return; }
    lastTermPx = px; lastTermPy = py; lastTermR = r; lastTermScale = scale;
    var ptx = Math.floor(px / TILE), pty = Math.floor(py / TILE);

    var idx = {}, kind, tx, ty, wx, wy, im, y;
    for (k in colors) { idx[k] = 0; }
    var rippleCap = WATER_RIPPLE_CAP(), rippleN = 0;

    for (ty = pty - r; ty <= pty + r; ty++) {
      for (tx = ptx - r; tx <= ptx + r; tx++) {
        kind = V.tileAt(tx, ty);
        im = terrainMesh[kind];
        if (!im || idx[kind] >= terrainCap) { continue; }   // 방 안 타일(floor)이나 자리가 다 찬 종류
        wx = tx * TILE + TILE * 0.5;
        wy = ty * TILE + TILE * 0.5;
        y = kind === 'water' ? -WATER_DEPTH() : 0;
        dummy.position.set((wx - px) * scale, y, (wy - py) * scale);
        dummy.updateMatrix();
        im.setMatrixAt(idx[kind]++, dummy.matrix);
        /* 물결 반짝임(PLAN 12절) — 물 칸을 세우는 김에 그 자리를 최대
           rippleCap 개까지만 같이 받아 둔다(새 순회를 더 만들지 않는다) */
        if (kind === 'water' && waterRipplePos && rippleN < rippleCap) {
          waterRipplePos[rippleN * 2] = (wx - px) * scale;
          waterRipplePos[rippleN * 2 + 1] = (wy - py) * scale;
          rippleN++;
        }
      }
    }
    for (k in terrainMesh) {
      if (!Object.prototype.hasOwnProperty.call(terrainMesh, k)) { continue; }
      terrainMesh[k].count = idx[k] || 0;
      terrainMesh[k].instanceMatrix.needsUpdate = true;
    }
    waterRippleCount = rippleN;
  }

  function step(dt) {
    if (!active() || !renderer || !scene || !camera) { return; }
    if (player.mixer) { player.mixer.update(dt); }
    syncCamera();
    syncTerrain();
    syncWaterRipple(dt);
    syncScatter();
    syncInstScatter();
    syncNpcs(dt);
    syncSky();
    syncWeatherFX(dt);
    renderer.render(scene, camera);
  }

  global.DG = global.DG || {};
  global.DG.villageView3d = {
    init: init, resize: resize, step: step, toggle: toggle,
    active: active, available: available, on: ON,
    /** 진단·QA 전용 — 세로 드래그로 잇는 시점 높이(0 어깨너머~1 부감), 진단용 순수 함수 */
    camTiltMix: function () { return camTiltMix; },
    setCamTiltMix: setCamTiltMix,
    camPose: camPose, camFov: camFov,
    /** 진단 전용 — 표(순수 함수)와 지금 세운 개수 */
    scatterKind: function () { return SCATTER_KIND; },
    scatterCount: function () { return Object.keys(scatter).length; },
    /** 진단 전용 — 계절이 'tree' 겉모습을 바꾸는 표(가을·눈·자작나무) */
    seasonalTreeKey: seasonalTreeKey,
    /** 진단 전용 — PLAN 40절 PHASE 7: InstancedMesh 로 옮긴 장식물 표·개수 */
    instKind: function () { return INST_KIND; },
    instKey: instKey,
    usedInstKey: usedInstKey,
    instMeshCount: function () { return Object.keys(instMesh).length; },
    terrainColors: terrainColors,
    terrainCount: function (kind) {
      var im = terrainMesh[kind];
      return im ? im.count : 0;
    },
    /** 진단 전용 — 지금 하늘·안개에 먹인 바이옴 색 표 */
    fogColors: function () { return FOG_COLOR; },
    /** 진단 전용 — PLAN 40절 PHASE 5 Day/Night: 시간대별 밝기·조명 표, hex 어둡히기 순수 함수 */
    phaseLight: function () { return { dark: PHASE_DARK, sun: PHASE_SUN, hemi: PHASE_HEMI }; },
    darken: darken,
    /** 진단 전용 — PLAN 40절 PHASE 5 Weather/Ambient: 날씨→파티클, 밤 반딧불이, 낙하 감기(모두 순수 함수) */
    weatherShows: weatherShows,
    fireflyVisible: fireflyVisible,
    wrapY: wrapY,
    skyDark: skyDark,
    weatherFog: function (wk) { return WEATHER_FOG[wk] != null ? WEATHER_FOG[wk] : 1; },
    /** 진단 전용 — PLAN 40절 PHASE 6 Mobile 품질: 등급표(순수)와 기기 점수→등급 순수 함수 */
    qualityPreset: function () { return QUALITY_PRESET; },
    deviceScore: deviceScore,
    tierFor: tierFor,
    /** 진단 전용 — PLAN 40절 PHASE 7 Object Pool: kind별 재사용 창고(순수 함수, mock group 으로도 확인됨) */
    poolTake: poolTake,
    poolGive: poolGive,
    poolSize: poolSize,
    scatterPoolCap: function () { return SCATTER_POOL_CAP; },
    /** 진단 전용 — PLAN 40절 PHASE 7 LOD: 거리 기반 그림자 켜고 끄기 순수 함수 */
    wantShadowAt: wantShadowAt,
    /** 진단·QA 전용 — 사람이 핀치·휠로 조절한 확대 배율 */
    userZoom: function () { return userZoom; },
    setUserZoom: setUserZoom,
    /** 진단·QA 전용 — 사람이 드래그로 돌린 시점 덧각(라디안) */
    mouseYaw: function () { return mouseYaw; },
    setMouseYaw: function (y) { mouseYaw = y; },
    /** 진단 전용 — PLAN 12절 물 표현: 파동 순수 함수와 반짝임 점 상태 */
    waterWaveY: waterWaveY,
    waterWaveAmp: WATER_WAVE_AMP, waterWaveSpeed: WATER_WAVE_SPEED,
    waterRippleCount: function () { return waterRippleCount; },
    /** 진단 전용 — 숲 NPC 3D 인물이 지금 몇 명 세워졌나(scene 에 실제로 올라간 group 수) */
    npcMeshCount: function () {
      var k, n = 0;
      for (k in npc3d) { if (Object.prototype.hasOwnProperty.call(npc3d, k) && npc3d[k].group) { n++; } }
      return n;
    },
    /** 진단 전용 — camera 가 지금 원점(플레이어)에서 얼마나 떨어져 있나(world 단위) */
    camDistNow: function () { return camera ? camera.position.length() : null; }
  };
})(typeof window !== 'undefined' ? window : this);
