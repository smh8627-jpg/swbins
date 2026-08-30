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
 * **한 줄도 판정에 닿지 않는다.** village.js 의 걷기·채집·시간 계산은 이 파일이
 * 없어도 완전히 돈다 — 여기서는 `V.raw()`를 읽기만 한다.
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

  /** 마을 좌표 한 단위 = 몇 미터 — TILE(40단위)이 3.2m 쯤 되게 잡았다 */
  function WORLD_SCALE() { return C().tuned('village3d.worldScale', 0.08); }
  /** 인물에서 이 안(미터)에 있는 것만 3D 로 세운다 */
  function RENDER_R() { return C().tuned('village3d.renderR', 40); }
  /** 벗어나면 치우는 거리 — RENDER_R 보다 살짝 넉넉해야 경계에서 깜빡이지 않는다 */
  function CULL_R() { return RENDER_R() + C().tuned('village3d.cullMargin', 6); }
  /** 한 프레임에 새로 세우는 최대 개수 — 마을을 한꺼번에 안 짓는다 */
  function MAX_BUILD_PER_STEP() { return C().tuned('village3d.maxBuildPerStep', 4); }

  var canvas = null, renderer = null, scene = null, camera = null;
  var ready = false, failed = false;

  var player = { group: null, mixer: null, actions: null, clipMap: null, action: null };
  var lastPX = 0, lastPY = 0, haveLast = false, facingYaw = 0;

  /** village.js 사물 kind → asset3d 표의 kind. 여기 없는 kind(전방·집·게시판…)는
   *  3D 로 안 선다 — 마을 3D 는 다음 몫이다 */
  var SCATTER_KIND = { tree: 'tree:common', pine: 'tree:pine', rock: 'rock', flower: 'flower', weed: 'grass' };
  /** 종류별로 실제 몇 미터로 세울까 — asset3d.build() 는 늘 키 1 로 눕혀 준다 */
  var SCATTER_H = { tree: 3.4, pine: 3.0, rock: 0.9, flower: 0.35, weed: 0.4 };

  var scatter = {};   // propId → { group, kind, building }

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

  /**
   * 나무·바위·꽃·잡초를 인물 둘레에 세운다 (PLAN 9절 ForestDecorator).
   * **새로 흩뿌리지 않는다** — `V.raw().props` 를 그대로 읽으므로 2D 에서
   * 보던 그 나무가 3D 에서도 같은 자리에 선다. 가깝지만 아직 없으면 짓고
   * (한 프레임에 `MAX_BUILD_PER_STEP()` 개까지만), 멀어지면 치운다.
   */
  function syncScatter() {
    var V = global.DG.village;
    if (!V || !scene) { return; }
    var raw = V.raw(), props = raw.props, px = raw.player.x, py = raw.player.y;
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

  function step(dt) {
    if (!active() || !renderer || !scene || !camera) { return; }
    if (player.mixer) { player.mixer.update(dt); }
    syncCamera();
    syncScatter();
    renderer.render(scene, camera);
  }

  global.DG = global.DG || {};
  global.DG.villageView3d = {
    init: init, resize: resize, step: step, toggle: toggle,
    active: active, available: available, on: ON,
    /** 진단 전용 — 표(순수 함수)와 지금 세운 개수 */
    scatterKind: function () { return SCATTER_KIND; },
    scatterCount: function () { return Object.keys(scatter).length; }
  };
})(typeof window !== 'undefined' ? window : this);
