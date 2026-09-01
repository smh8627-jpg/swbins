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
  var stageGen = 0;   // 사냥터가 바뀔 때마다 올린다 — 늦게 도착한 GLB 응답을 걸러낸다
  var lastDrawT = 0, frameDt = 0;   // 사람 GLB 의 몸짓(뼈대 애니메이션)을 굴리는 델타타임

  function hexOf(css) {
    if (!css) { return 0; }
    var n = parseInt(String(css).replace('#', ''), 16);
    return isNaN(n) ? 0 : n;
  }

  /** 도형(원뿔·구)을 먼저 세워 두고, GLB 가 도착하면(같은 세대일 때만) 갈아 끼운다.
   *  `holder` 는 이미 화면에 있는 자리(위치)이고, 안에 든 도형만 바뀐다 */
  function swapIn(holder, kind, seed, heightPx, gen) {
    var A = global.DG.asset3d;
    if (!A) { return; }
    A.build(kind, seed, heightPx, function (model) {
      if (!model || gen !== stageGen) { return; }   // 실패했거나, 그새 사냥터가 또 바뀌었다
      while (holder.children.length) { holder.remove(holder.children[0]); }
      holder.add(model);
    });
  }

  function ON() {
    if (!global.DG || !global.DG.core) { return true; }
    return !!global.DG.core.tuned('sideView3d.on', 1);
  }

  /** three 자체가 없거나 WebGL 컨텍스트를 못 만들면 false — 손잡이(ON)와는 별개다 */
  function available() { return ready; }
  /** 지금 화면에 이게 그려지고 있나 — 손잡이 + 초기화 성공 둘 다 참이어야 한다 */
  function active() { return ready && ON(); }

  /** 상단 🧊 단추 — 손잡이만 뒤집는다. WebGL 자체가 안 되면(available() false) 못 켠다 */
  function toggle() {
    if (!available() || !global.DG.core) { return ON(); }
    global.DG.core.setTune('sideView3d.on', ON() ? 0 : 1);
    return ON();
  }

  function init(canvas) {
    var Tc = three();
    if (!Tc || !canvas) { ready = false; return false; }
    try {
      renderer = new Tc.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 1.75));
      renderer.outputColorSpace = Tc.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = Tc.PCFSoftShadowMap;
    } catch (err) {
      ready = false; return false;               // 오래된 기기·file:// — 조용히 2D 로
    }
    /* 컨텍스트가 끊기면(메모리 부족 등, 실기기에서 흔하다) JS 에러 없이 캔버스만
       불투명 검정으로 굳는다 — alpha:false 라 지워진 드로잉 버퍼가 그렇게 합성된다.
       듣지 않으면 화면이 새까만 채로 영영 안 돌아온다. ready 를 내려 2D 로 떨어뜨리고
       캔버스도 바로 숨긴다(다음 draw() 를 기다리면 그 프레임 동안 검게 보인다) */
    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      ready = false;
      canvas.style.display = 'none';
      if (global.DG_DIAG) { global.DG_DIAG('webgl context lost — 2D로 대체'); }
    });
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

  /** side-view.js 가 묻는 것은 "지금 3D 로 그려지고 있나" — 손잡이를 끄면 여기서도 꺼진다 */
  function ready_() { return active(); }

  function resize() {
    if (!ready) { return; }
    W = global.innerWidth; H = global.innerHeight;
    /* updateStyle 을 true 로 둔다(3번째 인자 기본값) — false 로 두면 캔버스에
       CSS 폭/높이가 안 실려서, 렌더 해상도(W*pixelRatio)가 그대로 캔버스의
       "고유 크기"가 된다. #stage3d 는 position:fixed 인 교체 요소(canvas)라
       고유 크기가 있으면 inset:0 을 무시하고 그 크기로 뜬다 — 화면보다 커진
       캔버스의 왼쪽 위 한 귀퉁이만 보이고 나머지는 새까맣게 보이던 원인이 이거였다 */
    renderer.setSize(W, H, true);
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

    var gen = stageGen;
    /* 나무(GLB 로 갈리면 tree:near/tree:far, 다는 자리는 지금 세운 원뿔 높이와 맞춘다) */
    function trunk(x, z, h, mat, far) {
      var holder = new Tc.Group();
      holder.position.set(x, 0, z);
      var trunkMat = new Tc.MeshLambertMaterial({ color: 0x4a3524 });
      var tG = new Tc.Mesh(new Tc.CylinderGeometry(3, 4, h * 0.32, 6), trunkMat);
      tG.position.set(0, h * 0.16, 0);
      holder.add(tG);
      var leaf = new Tc.Mesh(new Tc.ConeGeometry(h * 0.34, h * 0.8, 7), mat);
      leaf.position.set(0, h * 0.32 + h * 0.4, 0);
      leaf.castShadow = true;
      holder.add(leaf);
      worldGroup.add(holder);
      swapIn(holder, far ? 'tree:far' : 'tree:near', x + ':' + z, h * 1.1, gen);
    }
    /* 종유석 — 바닥에 선 것만 GLB 바위로 갈린다(천장에 매달린 것은 뒤집힌 바위로는
       안 보이니 도형 그대로 둔다) */
    function stalactite(x, z, h, up) {
      var mat = new Tc.MeshLambertMaterial({ color: 0x453a52 });
      var holder = new Tc.Group();
      holder.position.set(x, 0, z);
      var c = new Tc.Mesh(new Tc.ConeGeometry(h * 0.22, h, 6), mat);
      c.position.set(0, up ? 560 - h / 2 : h / 2, 0);
      if (up) { c.rotation.x = Math.PI; }
      holder.add(c);
      worldGroup.add(holder);
      if (!up) { swapIn(holder, 'rock', x + ':' + z, h * 0.9, gen); }
    }
    function hill(x, z, r, mat) {
      var holder = new Tc.Group();
      holder.position.set(x, 0, z);
      var g = new Tc.Mesh(new Tc.SphereGeometry(r, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat);
      g.position.set(0, -r * 0.35, 0);
      holder.add(g);
      worldGroup.add(holder);
      swapIn(holder, 'hill', x + ':' + z, r * 0.7, gen);
    }
    function flame(x, z, h) {
      var mat = new Tc.MeshBasicMaterial({ color: 0xff8a3c, transparent: true, opacity: 0.55 });
      var c = new Tc.Mesh(new Tc.ConeGeometry(h * 0.22, h, 6), mat);
      c.position.set(x, h / 2, z);
      worldGroup.add(c);
    }

    var span = stg.width + 800;
    if (mood === 'forest') {
      for (i = 0, m = -200; m < span; i++, m += 260) { trunk(m, -260, 170 + (i % 3) * 40, farMat, true); }
      for (i = 0, m = -140; m < span; i++, m += 190) { trunk(m, -90, 120 + (i % 3) * 26, nearMat, false); }
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
    stageGen++;   // 늦게 도착한 GLB 응답이 지난 세대의 지형에 잘못 꽂히지 않게 한다
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

  /** 도형(원뿔·구가 아니라 캡슐+구) 사람 — GLB 가 오기 전까지, 혹은 GLB 가 실패하면
   *  끝까지 이 모습이다 */
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

  /**
   * 배우 하나 — 도형(캡슐)을 먼저 세워 두고, GLB 가 도착하면 갈아 끼운다
   * (지형지물의 `swapIn` 과 같은 요령). `kind` 가 'beast' 면 홑 GLB(늑대·소)로,
   * 아니면 사람 조합(`asset3d.buildHero`)으로 간다.
   *
   * @param color  이 배우의 원래 빛깔 — 도형 표면·사람 GLB 옷의 물들임에 쓴다.
   *               짐승은 제 털빛이 맞으므로 안 물들인다
   */
  function actorShell(Tc, kind, color, boss, seed, big) {
    var shell = new Tc.Group();
    var prim = humanoid(Tc, color, boss);
    shell.add(prim);
    shell.userData.body = prim.userData.body;
    shell.userData.head = prim.userData.head;
    shell.userData.baseColor = prim.userData.baseColor;

    var heightPx = (boss ? 1.9 : 1) * 58;   // 도형 사람의 정수리 높이(50*scale)와 얼추 맞춘다
    function swapActorIn(model) {
      if (!model) { return; }   // GLB 를 못 받았다 — 도형 그대로 남는다
      while (shell.children.length) { shell.remove(shell.children[0]); }
      shell.add(model);
      shell.userData.body = null; shell.userData.head = null;   // 이제 도형 물들임은 안 쓴다
      shell.userData.mixer = model.userData.mixer || null;
      shell.userData.actions = model.userData.actions || null;
      shell.userData.clipMap = model.userData.clipMap || null;
      shell.userData.anim = null;
      var A = global.DG.asset3d;
      shell.userData.flashMats = A && A.ownAllMat ? A.ownAllMat(model) : null;
    }
    var A = global.DG.asset3d;
    if (A) {
      if (kind === 'beast') { A.build(big ? 'beast_big' : 'beast', seed, heightPx, swapActorIn); }
      else { A.buildHero(seed, heightPx, hexOf(color), swapActorIn); }
    }
    return shell;
  }

  function place(mesh, x, yFloorOffset, facing) {
    mesh.position.x = x;
    mesh.position.y = yFloorOffset;
    mesh.rotation.y = facing >= 0 ? Math.PI / 2 : -Math.PI / 2;
  }

  /** 몸짓 하나 고르기 — GLB 사람이면 뼈대 애니메이션을 굴리고(걷기/맞음/가만있기),
   *  아직 도형이면 흰빛으로 번쩍이는 예전 방식 그대로다 */
  function stepActor(shell, animName) {
    if (shell.userData.flashMats) {
      var k = (shell.userData.hurtNow || 0) > 0 ? Math.min(1, shell.userData.hurtNow * 3) : 0;
      var fm = shell.userData.flashMats, j;
      for (j = 0; j < fm.length; j++) { fm[j].emissive.setRGB(k * 0.9, k * 0.15, k * 0.1); }
    }
    var u = shell.userData;
    if (!u.mixer) { return; }
    if (u.anim !== animName) {
      var clipName = u.clipMap && u.clipMap[animName];
      var next = clipName && u.actions[clipName];
      if (next) {
        var prevClip = u.anim && u.clipMap[u.anim];
        var prev = prevClip && u.actions[prevClip];
        next.reset().play();
        if (prev && prev !== next) { prev.crossFadeTo(next, 0.2, false); }
        u.anim = animName;
      }
    }
    u.mixer.update(frameDt);
  }

  function tintHurt(g, hurt) {
    g.userData.hurtNow = hurt;
    if (!g.userData.body) { return; }   // GLB 로 갈렸으면 stepActor 의 flashMats 몫이다
    var k = hurt > 0 ? Math.min(1, hurt * 3) : 0;
    g.userData.body.material.color.copy(g.userData.baseColor).lerp(new (three()).Color(0xffffff), k);
    g.userData.head.material.color.copy(g.userData.baseColor).lerp(new (three()).Color(0xffffff), k);
  }

  function draw() {
    if (!active()) { return; }
    var now = Date.now() / 1000;
    frameDt = lastDrawT ? Math.max(0, Math.min(0.25, now - lastDrawT)) : 0;
    lastDrawT = now;
    var S = global.DG.side, SV = global.DG.sideView;
    var run = S.raw();
    if (!run) {
      /* 사냥터 밖(쉬는 중)에는 그릴 세계가 없다. WebGL 은 alpha:false 라 한 번도
         못 그린(혹은 마지막으로 그린) 캔버스가 **불투명한 검정**으로 남는다 —
         뒤에 깔린 #camp-bg 를 완전히 가려 "쉬는 중" 화면이 새까맣게 보이던
         원인이 이거였다. 캔버스 자체를 숨겨 뒤(#camp-bg)가 비치게 한다 */
      renderer.domElement.style.display = 'none';
      return;
    }
    if (renderer.domElement.style.display === 'none') { renderer.domElement.style.display = ''; }
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
      var meRef = S.meRef();
      playerMesh = actorShell(Tc, 'human',
        (global.DG.data.faction(meRef.faction) || {}).color, false, meRef.id, false);
      actorGroup.add(playerMesh);
    }
    place(playerMesh, p.x + S.P_W / 2, stg.floor - (p.y + S.P_H), p.facing);
    tintHurt(playerMesh, p.hurt || 0);
    var walking = !!p.vx && p.onGround;
    stepActor(playerMesh, (p.hurt || 0) > 0 ? 'hit' : (walking ? 'walk' : 'idle'));
    var bob = (!playerMesh.userData.mixer && walking) ? Math.abs(Math.sin(Date.now() / 90)) * 3 : 0;
    playerMesh.position.y += bob;

    var i;
    for (i = 0; i < run.enemies.length; i++) {
      var e = run.enemies[i];
      var em = enemyPool[i];
      var big = /코끼리/.test((e.ref && e.ref.name) || '');
      if (!em) {
        em = actorShell(Tc, e.ref.kind, e.ref.color, e.boss, e.ref.name, big);
        em.userData.boss = !!e.boss;
        actorGroup.add(em); enemyPool[i] = em;
      }
      if (em.userData.boss !== !!e.boss) {
        actorGroup.remove(em);
        em = actorShell(Tc, e.ref.kind, e.ref.color, e.boss, e.ref.name, big);
        em.userData.boss = !!e.boss;
        actorGroup.add(em); enemyPool[i] = em;
      }
      em.visible = true;
      place(em, e.x + e.w / 2, stg.floor - (e.y + e.h), e.dir);
      tintHurt(em, e.hurt || 0);
      stepActor(em, (e.hurt || 0) > 0 ? 'hit' : 'walk');
      if (!em.userData.mixer) {
        var eb = Math.abs(Math.sin((Date.now() + i * 130) / 110)) * 2.4;
        em.position.y += eb;
      }
    }
    for (i = run.enemies.length; i < enemyPool.length; i++) {
      if (enemyPool[i]) { enemyPool[i].visible = false; }
    }

    renderer.render(scene, camera);
  }

  global.DG = global.DG || {};
  global.DG.sideView3d = {
    init: init, draw: draw, resize: resize, ready: ready_,
    available: available, active: active, toggle: toggle
  };
})(window);
