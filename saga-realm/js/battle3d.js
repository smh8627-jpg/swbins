/**
 * 전황 — 3D 전장 (README "Phase 7 전투")
 * ---------------------------------------------------------------
 * `war.js`의 `fight()`는 이미 다 계산해 둔다(병력 손실·성벽 파손·일기토 승패).
 * 이 파일은 그 결과를 한 장의 작은 전장 디오라마로 다시 그릴 뿐이다 —
 * **판정은 한 줄도 없다.** `war.js`에 더한 것도 `atkStart`·`defStart`·`defForce`
 * 세 값을 리포트에 얹어 내보낸 것뿐, 싸움 자체는 그대로다.
 *
 * `ui-rtk.js`의 `showBattle()`이 매번 `#encounter`의 innerHTML을 통째로 갈아
 * 끼우므로(도움말·시나리오 선택 등 다른 화면도 같은 자리를 쓴다) `#battle3d`
 * 캔버스도 그때마다 새로 태어난다. 그래서 `city3d.js`처럼 캔버스를 붙들고
 * 있지 않고, **부를 때마다 렌더러를 다시 묻는다** — 옛 렌더러는 컨텍스트를
 * 명시적으로 버린다(`dispose`+`forceContextLoss`). 안 그러면 싸움을 수십 번
 * 겪는 사이 브라우저의 WebGL 컨텍스트 한도를 넘어 화면이 조용히 멎는다.
 *
 * 병력은 숫자를 그대로 세우지 않는다(장수는 30명 안팎 세우면 도리어 어수선하다) —
 * **깃발 다발**로 무리 크기만 어림잡아 세운다. 일기토는 이긴 쪽 금빛 깃발과
 * 진 쪽이 쓰러진 회색 깃발로만 표시한다(누구 편인지는 안 가린다 — 굳이
 * 편 색을 다시 가르는 것보다 승패 그 자체가 더 눈에 든다).
 */
(function (global) {
  'use strict';

  var A3 = null;
  function asset3d() { if (!A3) { A3 = global.DG.asset3d; } return A3; }
  var FD = null;
  function forceData() { if (!FD) { FD = global.DG.forceData; } return FD; }
  var T = null;
  function three() { if (!T) { T = global.THREE || null; } return T; }
  function R() { return global.DG.rtk; }

  var TIER_H = { t1: 6, t2: 8, t3: 11 };
  function tierOf(maxWall) {
    var w = maxWall || 0;
    if (w >= 5600) { return 't3'; }
    if (w >= 4600) { return 't2'; }
    return 't1';
  }

  function forceColor(id) {
    var f = forceData().force(id);
    return f ? f.color : '#5b6572';
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ring(n, r, startAng) {
    var pts = [], i;
    for (i = 0; i < n; i++) {
      var a = startAng + (i / n) * Math.PI * 2;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  }

  var canvas = null, renderer = null, scene = null, camera = null, dyn = null;
  var ready = false, failed = false, loopRunning = false;
  var rebuildSeq = 0, spin = 0;

  function available() { return !!three() && !failed; }

  function active() {
    return !!(ready && document.getElementById('battle3d') === canvas &&
      canvas && canvas.isConnected);
  }

  /** 캔버스가 매번 새로 태어나므로(innerHTML 교체) 옛 렌더러를 명시적으로 버리고 다시 묻는다 */
  function ensureInit() {
    var t = three();
    var el = document.getElementById('battle3d');
    if (!t || !el) { failed = true; return false; }
    if (el === canvas && ready) { return true; }
    if (renderer) {
      try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) { /* noop */ }
    }
    canvas = el; renderer = null; ready = false;
    try {
      renderer = new t.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    } catch (e) { failed = true; return false; }
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));

    scene = new t.Scene();
    camera = new t.PerspectiveCamera(44, 1, 0.5, 300);
    scene.add(new t.HemisphereLight(0xffffff, 0x4a5a3a, 1.0));
    var sun = new t.DirectionalLight(0xfff4e0, 1.05);
    sun.position.set(-12, 20, 9);
    scene.add(sun);
    dyn = new t.Group();
    scene.add(dyn);

    ready = true;
    resize();
    return true;
  }

  function resize() {
    if (!renderer || !camera || !canvas) { return; }
    var w = canvas.clientWidth || 320, h = canvas.clientHeight || 190;
    if (!w || !h) { return; }
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  var blobGeo = null, blobMat = null;
  function addShadow(x, z, r) {
    var t = three();
    if (!t || !dyn) { return; }
    if (!blobGeo) {
      blobGeo = new t.CircleGeometry(1, 16);
      blobMat = new t.MeshBasicMaterial({ color: 0x14140c, transparent: true, opacity: 0.28, depthWrite: false });
    }
    var m = new t.Mesh(blobGeo, blobMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.015, z);
    m.scale.setScalar(Math.max(0.35, r));
    dyn.add(m);
  }

  function addProp(kind, id, x, z, scaleH, rotY, seq) {
    asset3d().build(kind, { id: id }, function (g) {
      if (seq !== rebuildSeq || !g || !dyn) { return; }
      g.position.set(x, 0, z);
      g.rotation.y = rotY || 0;
      g.scale.setScalar(scaleH);
      dyn.add(g);
      addShadow(x, z, scaleH * 0.4);
    });
  }

  /** 병력 한 무리를 어림잡아 세우는 깃발 — 실제 소품 GLB 대신 막대+천으로 직접 짓는다
   *  (이 무리는 "성 안"의 살림살이가 아니라 숫자를 어림잡는 표식일 뿐이다) */
  function banner(color, tipped) {
    var t = three();
    var g = new t.Group();
    var pole = new t.Mesh(
      new t.CylinderGeometry(0.035, 0.035, 1.5, 5),
      new t.MeshLambertMaterial({ color: 0x6b5533 })
    );
    pole.position.y = 0.75;
    g.add(pole);
    var cloth = new t.Mesh(
      new t.BoxGeometry(0.46, 0.62, 0.03),
      new t.MeshLambertMaterial({ color: new t.Color(color) })
    );
    cloth.position.set(0.26, 1.16, 0);
    g.add(cloth);
    if (tipped) { g.rotation.z = 1.15; g.position.y = 0.05; }
    return g;
  }

  function cluster(n, cx, cz, color) {
    var i, cols = Math.min(5, Math.max(1, n));
    for (i = 0; i < n; i++) {
      var row = Math.floor(i / cols), col = i % cols;
      var x = cx + (col - (cols - 1) / 2) * 0.55 + (Math.random() - 0.5) * 0.12;
      var z = cz - row * 0.55 + (Math.random() - 0.5) * 0.12;
      var b = banner(color, false);
      b.position.set(x, 0, z);
      dyn.add(b);
      addShadow(x, z, 0.22);
    }
  }

  function build(rep) {
    var t = three();
    dyn.clear();
    rebuildSeq++;
    var seq = rebuildSeq;
    var c = R().city(rep.to);
    if (!c) { return; }
    var tier = tierOf(c.maxWall);
    var h = TIER_H[tier];
    var ownerCol = forceColor(c.force);

    scene.background = new t.Color(rep.water ? 0x8fc4e6 : 0xb9dcef);
    scene.fog = new t.Fog(rep.water ? 0x8fc4e6 : 0xb9dcef, 20, 70);

    var ground = new t.Mesh(
      new t.CircleGeometry(11, 28),
      new t.MeshLambertMaterial({ color: rep.water ? 0x5aa9d8 : 0xcfe0a0 })
    );
    ground.rotation.x = -Math.PI / 2;
    dyn.add(ground);

    asset3d().build('city:' + tier, { id: rep.to + ':battle', tint: ownerCol, flag: ownerCol }, function (g) {
      if (seq !== rebuildSeq || !g || !dyn) { return; }
      g.position.set(0, 0, -6.5);
      g.scale.setScalar(h);
      dyn.add(g);
      addShadow(0, -6.5, h * 0.45);
    });

    /* 성벽 — 지금 파손 비율(wall/maxWall)만큼만 둘러선다. 수전이면 성벽이 안 선다 */
    if (!rep.water) {
      var wallRatio = clamp((c.wall || 0) / (c.maxWall || 1), 0, 1);
      var wallN = Math.round(wallRatio * 6);
      ring(6, h * 0.7, 0).slice(0, wallN).forEach(function (p, i) {
        addProp('wall', rep.to + ':bwall:' + i, p[0], p[1] - 6.5, h * 0.5, Math.atan2(p[0], p[1]) + Math.PI / 2, seq);
      });
    }

    var atkStart = rep.atkStart || 6000, defStart = rep.defStart || 6000;
    var atkSurvive = clamp(1 - (rep.lossA || 0) / Math.max(1, atkStart), 0, 1);
    var defSurvive = clamp(1 - (rep.lossD || 0) / Math.max(1, defStart), 0, 1);
    var atkN = clamp(Math.round((atkStart / 1200) * atkSurvive), 1, 14);
    var defN = clamp(Math.round((defStart / 1200) * defSurvive), 1, 14);

    cluster(atkN, 0, 4.2, forceColor(rep.force));
    cluster(defN, 0, -3.0, forceColor(rep.defForce));

    /* 일기토 — 이긴 쪽 금빛, 진 쪽 쓰러진 회색. 편 색은 굳이 안 가른다 */
    if (rep.duel) {
      var wb = banner(0xd8b660, false);
      wb.position.set(-0.5, 0, 0.6);
      dyn.add(wb);
      addShadow(-0.5, 0.6, 0.22);
      var lb = banner(0x4a4a4a, !!rep.duel.hurt);
      lb.position.set(0.5, 0, 0.3);
      dyn.add(lb);
      addShadow(0.5, 0.3, 0.22);
    }
  }

  /** 밖에서 부르는 단 하나의 입구 — `rtk:battle` 리포트 하나를 그대로 세운다 */
  function render(rep) {
    if (!rep || !ensureInit()) { return; }
    build(rep);
    resize();
    startLoop();
  }

  function startLoop() {
    if (loopRunning) { return; }
    loopRunning = true;
    requestAnimationFrame(tick);
  }

  /** 카메라 손잡이를 새로 두지 않는다 — 천천히 저절로 돈다 */
  function tick() {
    if (!active()) { loopRunning = false; return; }
    spin += 0.004;
    var dist = 13;
    camera.position.set(Math.sin(spin) * dist, 8.5, Math.cos(spin) * dist - 1);
    camera.lookAt(0, 3, -2);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  global.DG = global.DG || {};
  global.DG.battle3d = { available: available, render: render };
})(window);
