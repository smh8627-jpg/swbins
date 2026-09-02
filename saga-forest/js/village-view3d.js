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
 * **사물은 새로 흩뿌리지 않는다.** village.js 의 `V.raw().props`(이미 좌표
 * 해시로 정해진, 날마다 같은 자리)를 그대로 읽어 그중 나무·소나무·바위·꽃·
 * 잡초만 GLB 로 세운다(`SCATTER_KIND`). PLAN 10절 "중요한 장소는 랜덤
 * 배치하지 않는다"를 지키는 가장 쉬운 길은 **새 무작위를 아예 안 만드는 것**이다.
 * 건물(전방·집·게시판…)은 아직 3D 사물이 없어 3D 화면에는 안 보인다 —
 * 마을 3D(PLAN 6절 "작은 마을")는 다음 몫.
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

  /** 손잡이 — 기본은 꺼져 있다(2D 가 그대로 간다). 🧊 버튼이 이걸 뒤집는다 */
  function ON() { return C().tuned('village3d.on', 0) ? true : false; }
  function CAM_DIST() { return C().tuned('village3d.camDist', 6); }
  function CAM_HIGH() { return C().tuned('village3d.camHeight', 3.2); }
  /** 3/4 부감(쿼터뷰) 쪽 끝값 — 거리·기울기. tilt 가 클수록 카메라가 더 눕는다(수평 반지름이
   *  커지고 높이가 낮아진다), 작을수록 더 위에서 내리찍는 부감이 된다.
   *  **2026-09-02, 실기기 확인 후 사용자 요청으로 11 → 24 → 46.** "디아블로 같은 쿼터뷰가
   *  아니다"는 피드백 — 거리만 물려서는 안 됐다. 원작(디아블로류)이 이 각도에서도 평평해
   *  보이는 건 좁은 화각(거의 정사영에 가깝게) 덕이다. FOV 도 `ISO_FOV()`로 좁혀 원근
   *  왜곡(가까운 게 훨씬 크게 보이는 것)을 죽이고, 화각이 좁아진 만큼 같은 폭을 담으려면
   *  더 멀어져야 해서 거리도 다시 두 배 가까이 물렸다(camPose 는 이 둘의 조합은 몰라도
   *  된다 — syncCamera 가 fov 도 함께 섞는다) */
  function ISO_DIST() { return C().tuned('village3d.isoDist', 46); }
  function ISO_TILT() { return C().tuned('village3d.isoTilt', 0.62); }
  function PLAYER_H() { return C().tuned('village3d.playerH', 1.7); }
  function GROUND_SIZE() { return C().tuned('village3d.groundSize', 400); }
  function FOV() { return C().tuned('village3d.fov', 55); }
  /** 쿼터뷰 쪽 좁은 화각 — 정사영(orthographic)에 가깝게 눌러 평평해 보이게 한다.
   *  디아블로류가 흔히 쓰는 값(20~30도) 대에서 골랐다 */
  function ISO_FOV() { return C().tuned('village3d.isoFov', 28); }
  /** 걸음이라고 볼 최소 속도(마을 좌표/초) — 이보다 느리면 멈춘 것으로 본다 */
  function MOVE_EPS() { return C().tuned('village3d.moveEps', 4); }

  /** 마을 좌표 한 단위 = 몇 미터 — TILE(40단위)이 3.2m 쯤 되게 잡았다 */
  function WORLD_SCALE() { return C().tuned('village3d.worldScale', 0.08); }
  /** 인물에서 이 안(미터)에 있는 것만 3D 로 세운다 */
  function RENDER_R() { return C().tuned('village3d.renderR', 40); }
  /** 벗어나면 치우는 거리 — RENDER_R 보다 살짝 넉넉해야 경계에서 깜빡이지 않는다 */
  function CULL_R() { return RENDER_R() + C().tuned('village3d.cullMargin', 6); }
  /** 한 프레임에 새로 세우는 최대 개수 — 마을을 한꺼번에 안 짓는다 */
  function MAX_BUILD_PER_STEP() { return C().tuned('village3d.maxBuildPerStep', 4); }
  /** 인물 둘레 몇 칸까지 색칠할까 (타일 수, 반지름) */
  function GROUND_TILE_R() { return C().tuned('village3d.groundTileR', 14); }
  /** 물은 이만큼 낮춘다(미터) — 웅덩이처럼 보이게 */
  function WATER_DEPTH() { return C().tuned('village3d.waterDepth', 0.12); }

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
   *  **따로 켜는 버튼이 없다** — 2026-09-02 사용자 요청. 위로 끌면 부감(1)쪽으로,
   *  아래로 끌면 어깨너머(0)쪽으로 자연스럽게 넘어간다 */
  var camTiltMix = 0;
  var TILT_SENS = 0.0028;
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

  /** village.js 사물 kind → asset3d 표의 kind. 여기 없는 kind(전방·집·게시판…)는
   *  3D 로 안 선다 — 마을 3D 는 다음 몫이다.
   *  deadTree·mossyRock·mushroom·bush·stump·log 는 PLAN 11절 Biome — 숲 고리에만
   *  나오고(village.js 의 BIOME_SCATTER), asset3d.js 에 이미 등록돼 있던 표라
   *  여기 줄만 보태면 그대로 선다 */
  var SCATTER_KIND = {
    tree: 'tree:common', pine: 'tree:pine', rock: 'rock', flower: 'flower', weed: 'grass',
    deadTree: 'tree:dead', mossyRock: 'rock:moss', mushroom: 'mushroom',
    bush: 'bush', stump: 'stump', log: 'log', plant: 'plant',
    tent: 'tent', campfire: 'campfire', bench: 'bench', well: 'well', lantern: 'lantern',
    mountain: 'mountain',
    /* 짐승(PLAN 40절 PHASE 4 첫 칸) — village.js 의 raw().animals 도 이 표를
       그대로 타고 선다(아래 syncScatter() 가 props 배열에 이어 붙인다) */
    deer: 'animal:an_deer', fox: 'animal:an_fox', wolf: 'animal:an_wolf'
  };
  /** 종류별로 실제 몇 미터로 세울까 — asset3d.build() 는 늘 키 1 로 눕혀 준다 */
  var SCATTER_H = {
    tree: 3.4, pine: 3.0, rock: 0.9, flower: 0.35, weed: 0.4,
    deadTree: 3.0, mossyRock: 0.9, mushroom: 0.5, bush: 0.8, stump: 0.6, log: 0.5, plant: 0.6,
    tent: 1.8, campfire: 0.5, bench: 0.5, well: 1.0, lantern: 1.6, mountain: 8.0,
    deer: 1.1, fox: 0.55, wolf: 0.95
  };

  var scatter = {};   // propId → { group, kind, building }

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

  /** 바이옴별 하늘·안개 색(PLAN 11절 "색감"). green 은 예전부터 쓰던 하늘색 그대로 */
  var FOG_COLOR = { green: 0x8fc7e8, meadow: 0xbfe0a8, dark: 0x445a48, mushroom: 0x5f7a68, rocky: 0x9a988a };
  var curBiome = null;
  /** 인물이 선 칸의 바이옴이 바뀔 때만 하늘·안개 색을 새로 칠한다 */
  function syncFog() {
    var V = global.DG.village;
    if (!V || !V.biomeAt || !scene) { return; }
    var raw = V.raw(), TILE = V.TILE;
    var b = V.biomeAt(Math.floor(raw.player.x / TILE), Math.floor(raw.player.y / TILE));
    if (b === curBiome) { return; }
    curBiome = b;
    var c = FOG_COLOR[b] || FOG_COLOR.green;
    scene.background.setHex(c);
    scene.fog.color.setHex(c);
  }

  /** three 자체가 없거나(파일 못 받음) WebGL 컨텍스트를 못 만들면 false */
  function available() { return !!three() && !failed; }
  /** 지금 화면에 이게 그려지고 있나 — 손잡이 + 초기화 성공 둘 다 참이어야 한다 */
  function active() { return ON() && ready; }

  function init(cv) {
    var t = three();
    canvas = cv;
    if (!t || !canvas) { failed = true; return; }
    try {
      renderer = new t.WebGLRenderer({ canvas: canvas, antialias: true });
    } catch (e) { failed = true; return; }
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));

    scene = new t.Scene();
    scene.background = new t.Color(0x8fc7e8);
    scene.fog = new t.Fog(0x8fc7e8, 30, 160);

    camera = new t.PerspectiveCamera(FOV(), 1, 0.1, 400);

    scene.add(new t.HemisphereLight(0xffffff, 0x4a5a3a, 0.9));
    var sun = new t.DirectionalLight(0xfff4e0, 1.0);
    sun.position.set(-30, 40, 20);
    scene.add(sun);

    var ground = new t.Mesh(
      new t.PlaneGeometry(GROUND_SIZE(), GROUND_SIZE()),
      new t.MeshLambertMaterial({ color: 0x63b04a })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;     // 색칠한 타일(y=0)보다 살짝 아래 — 이음매가 안 보인다
    scene.add(ground);

    initTerrain();
    resize();
    global.addEventListener('resize', resize);
    bindCamControl(canvas);
    ready = true;
    syncVisibility();
    buildPlayer();
  }

  /** 종류별 InstancedMesh 를 미리 만들어 둔다 — 칸 수는 매 프레임 늘렸다 줄였다 한다 */
  function initTerrain() {
    var t = three();
    var colors = terrainColors(), k, tileM = tileMeters();
    var geo = new t.PlaneGeometry(tileM, tileM);
    geo.rotateX(-Math.PI / 2);
    var r = GROUND_TILE_R();
    terrainCap = (2 * r + 1) * (2 * r + 1);
    for (k in colors) {
      if (!Object.prototype.hasOwnProperty.call(colors, k)) { continue; }
      var mat = new t.MeshLambertMaterial({ color: new t.Color(colors[k]) });
      var im = new t.InstancedMesh(geo, mat, terrainCap);
      im.count = 0;
      scene.add(im);
      terrainMesh[k] = im;
    }
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
      playAction('idle');
    });
  }

  function playAction(slot) {
    if (!player.actions || !player.clipMap) { return; }
    var name = player.clipMap[slot];
    if (!name || !player.actions[name]) { return; }
    var act = player.actions[name];
    if (player.action === act) { return; }
    if (player.action) { player.action.fadeOut(0.15); }
    act.reset().fadeIn(0.15).play();
    player.action = act;
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
      playAction('walk');
    } else {
      playAction('idle');
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
    var raw = V.raw(), props = raw.props.concat(raw.animals || []), px = raw.player.x, py = raw.player.y;
    var scale = WORLD_SCALE(), renderU = RENDER_R() / scale, cullU = CULL_R() / scale;
    var within = {}, budget = MAX_BUILD_PER_STEP();
    var i, p, key, ent, d;

    for (i = 0; i < props.length; i++) {
      p = props[i];
      key = SCATTER_KIND[p.kind];
      if (!key) { continue; }
      d = Math.hypot(p.x - px, p.y - py);
      if (d > cullU) { continue; }                    // 완전히 멀다 — 후보에서도 뺀다
      within[p.id] = true;
      ent = scatter[p.id];
      if (ent && ent.group) {
        ent.group.position.set((p.x - px) * scale, 0, (p.y - py) * scale);
        continue;
      }
      if (d > renderU) { continue; }                  // cull 과 render 사이 — 있으면 두고, 새로 안 짓는다
      if (ent && ent.building) { continue; }           // 이미 요청해 둔 것 — 또 부르지 않는다
      if (budget <= 0) { continue; }                   // 이번 프레임 몫을 다 썼다
      budget--;
      ent = scatter[p.id] = { group: null, kind: p.kind, building: true };
      (function (id, kind, wx, wy) {
        asset3d().build(key, { id: id }, function (g) {
          var cur = scatter[id];
          if (!cur) { return; }                        // 그새 멀어져 치워졌다
          cur.building = false;
          if (!g || !scene) { return; }
          g.scale.setScalar(SCATTER_H[kind] || 1);
          g.position.set((wx - px) * scale, 0, (wy - py) * scale);
          cur.group = g;
          scene.add(g);
        });
      })(p.id, p.kind, p.x, p.y);
    }

    /* cullU 밖으로 나간 것만 치운다 — renderU~cullU 사이는 그대로 둔다(경계 깜빡임 방지) */
    for (key in scatter) {
      if (!Object.prototype.hasOwnProperty.call(scatter, key) || within[key]) { continue; }
      ent = scatter[key];
      if (ent.group && scene) { scene.remove(ent.group); }
      delete scatter[key];
    }
  }

  var dummy = null;

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
    var ptx = Math.floor(px / TILE), pty = Math.floor(py / TILE);

    var idx = {}, kind, tx, ty, wx, wy, im, y;
    for (k in colors) { idx[k] = 0; }

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
      }
    }
    for (k in terrainMesh) {
      if (!Object.prototype.hasOwnProperty.call(terrainMesh, k)) { continue; }
      terrainMesh[k].count = idx[k] || 0;
      terrainMesh[k].instanceMatrix.needsUpdate = true;
    }
  }

  function step(dt) {
    if (!active() || !renderer || !scene || !camera) { return; }
    if (player.mixer) { player.mixer.update(dt); }
    syncCamera();
    syncTerrain();
    syncScatter();
    syncFog();
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
    terrainColors: terrainColors,
    terrainCount: function (kind) {
      var im = terrainMesh[kind];
      return im ? im.count : 0;
    },
    /** 진단 전용 — 지금 하늘·안개에 먹인 바이옴 색 표 */
    fogColors: function () { return FOG_COLOR; },
    /** 진단·QA 전용 — 사람이 핀치·휠로 조절한 확대 배율 */
    userZoom: function () { return userZoom; },
    setUserZoom: setUserZoom,
    /** 진단·QA 전용 — 사람이 드래그로 돌린 시점 덧각(라디안) */
    mouseYaw: function () { return mouseYaw; },
    setMouseYaw: function (y) { mouseYaw = y; }
  };
})(typeof window !== 'undefined' ? window : this);
