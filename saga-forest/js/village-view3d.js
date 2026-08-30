/**
 * 마을 화면 — 3D (PLAN 40절 PHASE 2, Player 3D)
 * ---------------------------------------------------------------
 * `village-view.js`(2D 구면 투영)는 이 파일이 있는지도 모른다 — **한 줄도
 * 안 건드렸다.** 대신 `#map3d` 캔버스에 별개의 WebGL 화면을 올리고, 켜져
 * 있을 때만 `#map`(2D)을 숨기고 이쪽을 보여 준다. 꺼지면(기본값) 예전 그대로다.
 *
 * 이번 단계에서 하는 것은 **셋뿐이다** — 땅바닥 하나, 3인칭 카메라, 그리고
 * `asset3d.build('hero', …)` 로 세운 인물이 걷는 방향을 보고 idle/walk 를
 * 갈아 신는 것. 나무·바위·마을 사물은 아직 하나도 없다 — 그건 다음 단계
 * (PLAN 9절 ForestDecorator, Tree/Rock/Vegetation)의 몫이다. 그래서 지금 3D
 * 를 켜면 **초록 들판에 사람 하나만** 서 있는다 — 빈 것이 아니라 아직 거기까지
 * 안 왔을 뿐이다.
 *
 * 인물의 실제 세계 좌표(x, y)는 화면에 안 옮긴다 — 사람은 늘 원점(0,0,0)에
 * 서 있고 **카메라가 도는 방향만** 걸음 방향을 따라간다. 마을 좌표를 3D 세계에
 * 흩뿌리는 일(나무·집을 실제로 세우는 일)이 아직 없으니, 지금은 "그 자리에서
 * 방향만 도는 인물" 로 충분하다 — 사물이 생기면 그때 카메라·땅을 인물 기준
 * 상대 좌표로 흘려보내는 진짜 이동으로 바뀐다.
 *
 * **한 줄도 판정에 닿지 않는다.** village.js 의 걷기·채집·시간 계산은 이 파일이
 * 없어도 완전히 돈다 — 여기서는 `V.raw().player`를 읽기만 한다.
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
  function PLAYER_H() { return C().tuned('village3d.playerH', 1.7); }
  function GROUND_SIZE() { return C().tuned('village3d.groundSize', 400); }
  function FOV() { return C().tuned('village3d.fov', 55); }
  /** 걸음이라고 볼 최소 속도(마을 좌표/초) — 이보다 느리면 멈춘 것으로 본다 */
  function MOVE_EPS() { return C().tuned('village3d.moveEps', 4); }

  var canvas = null, renderer = null, scene = null, camera = null;
  var ready = false, failed = false;

  var player = { group: null, mixer: null, actions: null, clipMap: null, action: null };
  var lastPX = 0, lastPY = 0, haveLast = false, facingYaw = 0;

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
      new t.MeshLambertMaterial({ color: 0x5a8a4a })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    resize();
    global.addEventListener('resize', resize);
    ready = true;
    syncVisibility();
    buildPlayer();
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

    var behind = facingYaw + Math.PI;
    camera.position.set(Math.sin(behind) * CAM_DIST(), CAM_HIGH(), Math.cos(behind) * CAM_DIST());
    camera.lookAt(0, PLAYER_H() * 0.75, 0);
  }

  function step(dt) {
    if (!active() || !renderer || !scene || !camera) { return; }
    if (player.mixer) { player.mixer.update(dt); }
    syncCamera();
    renderer.render(scene, camera);
  }

  global.DG = global.DG || {};
  global.DG.villageView3d = {
    init: init, resize: resize, step: step, toggle: toggle,
    active: active, available: available, on: ON
  };
})(typeof window !== 'undefined' ? window : this);
