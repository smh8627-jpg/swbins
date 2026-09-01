/**
 * 사냥터 화면 — 3D 바탕 (PLAN.md Phase 1: 3D/2.5D 기반)
 * ---------------------------------------------------------------
 * side-view.js 가 하던 것 중 **세계**(하늘·뒷배경·바닥·발판·사람·몹)만 3D 로 세운다.
 * 조작 판정 · 미니맵 · 보스체력 · 데미지숫자 · 밧줄/문 표시는 그대로 side-view.js
 * (2D, #stage) 에 남는다 — 화면 위에 겹쳐 그린다.
 *
 * **좌표를 그대로 쓴다.** side.js 의 x·y 는 이미 픽셀이다. 새 단위를 만들지 않고
 * 카메라를 "그 픽셀이 그 자리에 뜨도록" 맞춘다 — 원근 카메라를 쓰지만 Z=0 평면에서는
 * 화면 픽셀과 1:1 이 되도록 거리(D)를 역산한다. 그래서 2D 오버레이(미니맵·문 이름표)가
 * 쓰는 camX 를 3D 도 그대로 받아 쓸 수 있다 — 좌표계를 두 벌 관리하지 않는다.
 *
 * 못 켜지면(WebGL 없음 · file:// 단독판) **조용히 2D 로 남는다** — 다른 판과 같은 규칙.
 */
(function (global) {
  'use strict';

  var T = null;
  function three() { if (!T) { T = global.THREE || null; } return T; }

  var renderer = null, scene = null, camera = null, ready = false;
  var W = 0, H = 0;
  var lastMood = null, worldGroup = null, actorGroup = null, dirLight = null, ambLight = null;
  var playerMesh = null, enemyPool = [];

  function ON() {
    if (!global.DG || !global.DG.core) { return true; }
    return !!global.DG.core.tuned('sideView3d.on', 1);
  }

  function init(canvas) {
    var Tc = three();
    if (!Tc || !canvas || !ON()) { ready = false; return false; }
    try {
      renderer = new Tc.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 1.75));
      renderer.outputColorSpace = Tc.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = Tc.PCFSoftShadowMap;
    } catch (err) {
      ready = false; return false;               // 오래된 기기·file:// — 조용히 2D 로
    }
    scene = new Tc.Scene();
    camera = new Tc.PerspectiveCamera(35, 1, 1, 6000);

    ambLight = new Tc.AmbientLight(0xffffff, 0.7);
    scene.add(ambLight);
    dirLight = new Tc.DirectionalLight(0xffffff, 1.0);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    /* 사냥터가 2200~3400 폭이라 원점에 못박아 두면 플레이어가 조금만 걸어도
       그림자 카메라 범위(±700) 밖으로 나가 그림자가 사라진다 — 매 프레임
       플레이어를 따라간다(그림자 카메라만, 조명 각도는 그대로) */
    dirLight.shadow.camera.left = -700; dirLight.shadow.camera.right = 700;
    dirLight.shadow.camera.top = 700; dirLight.shadow.camera.bottom = -700;
    dirLight.shadow.camera.near = 10; dirLight.shadow.camera.far = 1400;
    scene.add(dirLight);
    scene.add(dirLight.target);

    worldGroup = new Tc.Group();          // 지형(사냥터 바뀌면 통째로 다시 세운다)
    scene.add(worldGroup);
    actorGroup = new Tc.Group();          // 사람·몹(사냥터가 바뀌어도 그대로 둔다)
    scene.add(actorGroup);

    ready = true;
    resize();
    return true;
  }

  function ready_() { return ready; }

  function resize() {
    if (!ready) { return; }
    W = global.innerWidth; H = global.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }

  /** Z=0 평면에서 화면 세로 H(px) 이 정확히 보이도록 거리(D)를 역산한다 */
  function camDist() {
    var vfov = camera.fov * Math.PI / 180;
    return (H / 2) / Math.tan(vfov / 2);
  }

  function moodLight(mood) {
    if (mood === 'cave') { return { sky: 0x2b2436, amb: 0.5, dir: 0.55, dirCol: 0x8fa2ff, fog: 900 }; }
    if (mood === 'fire') { return { sky: 0x3a1410, amb: 0.55, dir: 0.9, dirCol: 0xff8a4a, fog: 1400 }; }
    if (mood === 'forest') { return { sky: 0x5fa06a, amb: 0.75, dir: 0.95, dirCol: 0xfff6d8, fog: 1800 }; }
    return { sky: 0x79c3e8, amb: 0.85, dir: 1.05, dirCol: 0xfff6d8, fog: 2400 };            // field
  }

  /** 지형지물 — 아직 GLB 를 못 받는 자리라 도형으로 세운다(다른 판이 GLB 로 가기 전에
   *  거치던 자리와 같다). 나중에 CC0 모델을 구하면 이 함수만 바꾸면 된다 */
  function buildScenery(Tc, stg) {
    var mood = stg.mood, i, m;
    var farMat = new Tc.MeshLambertMaterial({ color: mood === 'forest' ? 0x2c5230
      : mood === 'cave' ? 0x1c1622 : mood === 'fire' ? 0x241010 : 0x8fc48f });
    var nearMat = new Tc.MeshLambertMaterial({ color: mood === 'forest' ? 0x3a6b3a
      : mood === 'cave' ? 0x352a3f : mood === 'fire' ? 0x3a1c14 : 0x6fae6f });

    function trunk(x, z, h, mat) {
      var trunkMat = new Tc.MeshLambertMaterial({ color: 0x4a3524 });
      var tG = new Tc.Mesh(new Tc.CylinderGeometry(3, 4, h * 0.32, 6), trunkMat);
      tG.position.set(x, h * 0.16, z);
      worldGroup.add(tG);
      var leaf = new Tc.Mesh(new Tc.ConeGeometry(h * 0.34, h * 0.8, 7), mat);
      leaf.position.set(x, h * 0.32 + h * 0.4, z);
      leaf.castShadow = true;
      worldGroup.add(leaf);
    }
    function stalactite(x, z, h, up) {
      var mat = new Tc.MeshLambertMaterial({ color: 0x453a52 });
      var c = new Tc.Mesh(new Tc.ConeGeometry(h * 0.22, h, 6), mat);
      c.position.set(x, up ? 560 - h / 2 : h / 2, z);
      if (up) { c.rotation.x = Math.PI; }
      worldGroup.add(c);
    }
    function hill(x, z, r, mat) {
      var g = new Tc.Mesh(new Tc.SphereGeometry(r, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat);
      g.position.set(x, -r * 0.35, z);
      worldGroup.add(g);
    }
    function flame(x, z, h) {
      var mat = new Tc.MeshBasicMaterial({ color: 0xff8a3c, transparent: true, opacity: 0.55 });
      var c = new Tc.Mesh(new Tc.ConeGeometry(h * 0.22, h, 6), mat);
      c.position.set(x, h / 2, z);
      worldGroup.add(c);
    }

    var span = stg.width + 800;
    if (mood === 'forest') {
      for (i = 0, m = -200; m < span; i++, m += 260) { trunk(m, -260, 170 + (i % 3) * 40, farMat); }
      for (i = 0, m = -140; m < span; i++, m += 190) { trunk(m, -90, 120 + (i % 3) * 26, nearMat); }
    } else if (mood === 'cave') {
      for (i = 0, m = -100; m < span; i++, m += 220) {
        stalactite(m, -140 - (i % 2) * 60, 90 + (i % 4) * 40, true);
        stalactite(m + 90, -160, 70 + (i % 3) * 30, false);
      }
    } else if (mood === 'fire') {
      for (i = 0, m = -260; m < span; i++, m += 340) { hill(m, -420, 220 + (i % 3) * 40, farMat); }
      for (i = 0, m = -160; m < span; i++, m += 210) { flame(m, -80, 90 + (i % 3) * 30); }
    } else {
      for (i = 0, m = -300; m < span; i++, m += 420) { hill(m, -520, 260 + (i % 3) * 50, farMat); }
      for (i = 0, m = -180; m < span; i++, m += 280) { hill(m, -220, 150 + (i % 3) * 30, nearMat); }
      for (i = 0, m = -220; m < span; i++, m += 300) { trunk(m, -60, 90 + (i % 3) * 20, nearMat); }
    }
  }

  function rebuildStage(stg) {
    var Tc = three();
    while (worldGroup.children.length) { worldGroup.remove(worldGroup.children[0]); }

    var L = moodLight(stg.mood);
    scene.background = new Tc.Color(L.sky);
    scene.fog = new Tc.Fog(L.sky, L.fog * 0.35, L.fog);
    ambLight.intensity = L.amb;
    dirLight.intensity = L.dir;
    dirLight.color.setHex(L.dirCol);

    var groundMat = new Tc.MeshLambertMaterial({ color: stg.ground });
    var ground = new Tc.Mesh(new Tc.PlaneGeometry(stg.width + 1600, 900), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(stg.width / 2, 0, -80);
    ground.receiveShadow = true;
    worldGroup.add(ground);

    var platMat = new Tc.MeshLambertMaterial({ color: stg.ground });
    var i, pl;
    for (i = 0; i < stg.plats.length; i++) {
      pl = stg.plats[i];
      var pw = pl[2], py = stg.floor - pl[1];
      var box = new Tc.Mesh(new Tc.BoxGeometry(pw, 16, 46), platMat);
      box.position.set(pl[0] + pw / 2, py - 8, 0);
      box.receiveShadow = true; box.castShadow = false;
      worldGroup.add(box);
    }

    buildScenery(Tc, stg);
    lastMood = stg.mood + '|' + stg.width;
  }

  function humanoid(Tc, color, boss) {
    var g = new Tc.Group();
    var scale = boss ? 1.9 : 1;
    var bodyMat = new Tc.MeshLambertMaterial({ color: color || '#c8b090' });
    var body = new Tc.Mesh(new Tc.CapsuleGeometry(11 * scale, 30 * scale, 4, 8), bodyMat);
    body.position.y = 26 * scale;
    body.castShadow = true;
    g.add(body);
    var head = new Tc.Mesh(new Tc.SphereGeometry(8.5 * scale, 10, 8), bodyMat);
    head.position.y = 50 * scale;
    head.castShadow = true;
    g.add(head);
    g.userData.body = body; g.userData.head = head; g.userData.baseColor = new Tc.Color(color || '#c8b090');
    return g;
  }

  function place(mesh, x, yFloorOffset, facing) {
    mesh.position.x = x;
    mesh.position.y = yFloorOffset;
    mesh.rotation.y = facing >= 0 ? Math.PI / 2 : -Math.PI / 2;
  }

  function tintHurt(g, hurt) {
    if (!g.userData.body) { return; }
    var k = hurt > 0 ? Math.min(1, hurt * 3) : 0;
    g.userData.body.material.color.copy(g.userData.baseColor).lerp(new (three()).Color(0xffffff), k);
    g.userData.head.material.color.copy(g.userData.baseColor).lerp(new (three()).Color(0xffffff), k);
  }

  function draw() {
    if (!ready) { return; }
    var S = global.DG.side, SV = global.DG.sideView;
    var run = S.raw();
    if (!run) { return; }
    var Tc = three();
    var stg = run.stage, p = run.player;

    var key = stg.mood + '|' + stg.width;
    if (key !== lastMood) { rebuildStage(stg); }

    var camX = SV._cam();
    var D = camDist();
    var lookY = stg.floor - H / 2;
    camera.position.set(camX + W / 2, lookY, D);
    camera.lookAt(camX + W / 2, lookY, 0);

    var focusX = p.x + S.P_W / 2;
    dirLight.position.set(focusX + 260, 460, 360);
    dirLight.target.position.set(focusX, 0, 0);

    if (!playerMesh) {
      playerMesh = humanoid(Tc, (global.DG.data.faction(S.meRef().faction) || {}).color, false);
      actorGroup.add(playerMesh);
    }
    place(playerMesh, p.x + S.P_W / 2, stg.floor - (p.y + S.P_H), p.facing);
    tintHurt(playerMesh, p.hurt || 0);
    var bob = (p.vx && p.onGround) ? Math.abs(Math.sin(Date.now() / 90)) * 3 : 0;
    playerMesh.position.y += bob;

    var i;
    for (i = 0; i < run.enemies.length; i++) {
      var e = run.enemies[i];
      var em = enemyPool[i];
      if (!em) {
        em = humanoid(Tc, e.ref.color, e.boss);
        em.userData.boss = !!e.boss;
        actorGroup.add(em); enemyPool[i] = em;
      }
      if (em.userData.boss !== !!e.boss) {
        actorGroup.remove(em);
        em = humanoid(Tc, e.ref.color, e.boss);
        em.userData.boss = !!e.boss;
        actorGroup.add(em); enemyPool[i] = em;
      }
      em.visible = true;
      place(em, e.x + e.w / 2, stg.floor - (e.y + e.h), e.dir);
      tintHurt(em, e.hurt || 0);
    }
    for (i = run.enemies.length; i < enemyPool.length; i++) {
      if (enemyPool[i]) { enemyPool[i].visible = false; }
    }

    renderer.render(scene, camera);
  }

  global.DG = global.DG || {};
  global.DG.sideView3d = { init: init, draw: draw, resize: resize, ready: ready_ };
})(window);
