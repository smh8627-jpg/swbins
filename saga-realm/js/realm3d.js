/**
 * 국토 지도 — 3D (PLAN 40절 PHASE 1~3: 엔진 연결 · 카메라 · 월드)
 * ---------------------------------------------------------------
 * `ui-rtk.js` 의 `renderMap()`(svg 평면 지도)는 이 파일이 있는지도 모른다 —
 * **한 줄도 안 건드렸다.** 대신 `#realm3d` 캔버스에 별개의 WebGL 화면을 올리고,
 * 손잡이(`realm3d.on`)가 켜져 있을 때만 `#realm`(svg)을 숨기고 이쪽을 보여 준다.
 * 꺼지면(기본값) 예전 그대로다 — saga-forest 의 `village-view3d.js` 와 같은 요령.
 *
 * 이 판은 **턴제 지도 화면**이다(인물이 걸어 다니지 않는다) — 그래서 카메라는
 * 플레이어를 따라가는 대신, 성 서른 곳이 놓인 국토 전체를 내려다보는
 * **궤도 카메라**(드래그로 돌리고 · 휠/핀치로 당긴다)로 잡는다.
 *
 * **판정은 한 줄도 여기 없다.** 성의 주인·병력·포위 여부는 전부
 * `rtk.state()` · `war.besieged()` 를 그대로 읽기만 한다. 성을 탭하면
 * `ui.openCity()` — 2D 지도가 부르는 그 함수를 그대로 부른다. 그래서 시트가
 * 열고 닫는 방식, 명령을 고르는 방식은 2D 와 완전히 같다.
 *
 * 좌표는 `data-city.js` 의 x·y(0~100, 지도 비율)를 그대로 쓴다 — 새 좌표계를
 * 만들지 않는다. `WORLD_SCALE()` 배만큼 늘려 3D 세계 단위(대략 미터)로 삼는다.
 */
(function (global) {
  'use strict';

  var core = null;
  function C() { if (!core) { core = global.DG.core; } return core; }
  var A3 = null;
  function asset3d() { if (!A3) { A3 = global.DG.asset3d; } return A3; }
  var CD = null;
  function cityData() { if (!CD) { CD = global.DG.cityData; } return CD; }
  var FD = null;
  function forceData() { if (!FD) { FD = global.DG.forceData; } return FD; }
  var T = null;
  function three() { if (!T) { T = global.THREE || null; } return T; }
  function R() { return global.DG.rtk; }
  function W() { return global.DG.war; }

  /** 손잡이 — 기본은 꺼져 있다(svg 지도가 그대로 간다). 🧊 버튼이 이걸 뒤집는다 */
  function ON() { return C().tuned('realm3d.on', 0) ? true : false; }
  function WORLD_SCALE() { return C().tuned('realm3d.worldScale', 4.5); }
  function FOV() { return C().tuned('realm3d.fov', 50); }
  function PITCH_MIN() { return C().tuned('realm3d.pitchMin', 0.35); }
  function PITCH_MAX() { return C().tuned('realm3d.pitchMax', 1.3); }
  function DIST_MIN() { return C().tuned('realm3d.distMin', 90); }
  function DIST_MAX() { return C().tuned('realm3d.distMax', 900); }

  function forceColor(id) {
    var f = forceData().force(id);
    return f ? f.color : '#5b6572';
  }

  function hashOf(s) {
    s = String(s || '');
    var h = 0, i;
    for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return h;
  }

  /** 바닥 — 단색 한 장이 밋밋해서(퀄리티 피드백) 옅은 얼룩 무늬를 타일로 깐다.
   *  실제 사진이 아니라 해시로 찍은 점묘라 매번 같다(진단 결정성과 같은 이유) */
  function groundTexture() {
    var t = three();
    var size = 128;
    var cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    var c = cv.getContext('2d');
    c.fillStyle = '#cfe0a0';
    c.fillRect(0, 0, size, size);
    var i, n = 260;
    for (i = 0; i < n; i++) {
      var hh = hashOf('gtex:' + i);
      var x = hh % size, y = (hh >> 8) % size, r = 2 + (hh % 4);
      var tone = (hh >> 16) % 3;
      c.fillStyle = tone === 0 ? 'rgba(120,150,70,0.14)' : (tone === 1 ? 'rgba(235,228,175,0.10)' : 'rgba(90,128,58,0.16)');
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    var tex = new t.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = t.RepeatWrapping;
    tex.repeat.set(48, 48);
    if (t.SRGBColorSpace) { tex.colorSpace = t.SRGBColorSpace; }
    return tex;
  }

  /* ── 등급 · 배치 ──────────────────────────────────────── */

  /** 성벽(maxWall) 값으로 탑 등급을 가른다 — 30 성의 실제 분포(3400~6800) 기준 */
  function cityTier(city) {
    var w = city.maxWall || city.wall || 0;
    if (w >= 5600) { return 't3'; }
    if (w >= 4600) { return 't2'; }
    return 't1';
  }
  var TIER_H = { t1: 7, t2: 10, t3: 14 };

  function worldX(x) { return (x - 50) * WORLD_SCALE(); }
  function worldZ(y) { return (y - 50) * WORLD_SCALE(); }

  /* ── 장면 ─────────────────────────────────────────────── */

  var canvas = null, renderer = null, scene = null, camera = null;
  var ready = false, failed = false, loopRunning = false;
  var dyn = null;              // 매달(성이 바뀔 때) 다시 짓는 그룹 — 성·길·지형
  var hitMeshes = [];          // 탭 판정용 투명 원기둥들
  var pulseRings = [];         // 포위 표시 — 숨쉬듯 커졌다 작아진다
  var rebuildSeq = 0;          // 늦게 도착한 옛 build() 콜백을 거른다

  var yaw = 0, pitch = 0.85, dist = 260;
  var targetYaw = 0, targetPitch = 0.85, targetDist = 260;

  function available() { return !!three() && !failed; }
  function active() { return ON() && ready; }

  function init(cv) {
    var t = three();
    canvas = cv;
    if (!t || !canvas) { failed = true; return; }
    try {
      renderer = new t.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    } catch (e) { failed = true; return; }
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));

    scene = new t.Scene();
    scene.background = new t.Color(0x9fd0e8);
    scene.fog = new t.Fog(0x9fd0e8, 260, 900);

    camera = new t.PerspectiveCamera(FOV(), 1, 0.5, 2400);

    scene.add(new t.HemisphereLight(0xffffff, 0x4a5a3a, 0.95));
    var sun = new t.DirectionalLight(0xfff4e0, 1.0);
    sun.position.set(-120, 200, 90);
    scene.add(sun);

    var ground = new t.Mesh(
      new t.PlaneGeometry(2200, 2200),
      new t.MeshLambertMaterial({ color: 0xffffff, map: groundTexture() })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    scene.add(ground);

    dyn = new t.Group();
    scene.add(dyn);

    fitCameraToMap();
    yaw = targetYaw; pitch = targetPitch; dist = targetDist;

    bindPointer();
    resize();
    global.addEventListener('resize', resize);
    ready = true;
    syncVisibility();
    rebuild();
  }

  /** 30 성 전체가 화면에 들어오도록 초기 거리를 잡는다 */
  function fitCameraToMap() {
    var cities = cityData().CITIES, i, r, maxR = 60;
    for (i = 0; i < cities.length; i++) {
      r = Math.hypot(worldX(cities[i].x), worldZ(cities[i].y));
      if (r > maxR) { maxR = r; }
    }
    targetDist = Math.max(DIST_MIN(), Math.min(DIST_MAX(), maxR * 1.7));
  }

  function resize() {
    if (!renderer || !camera) { return; }
    var w = canvas.clientWidth || global.innerWidth;
    var h = canvas.clientHeight || global.innerHeight;
    if (!w || !h) { return; }
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function syncVisibility() {
    var map2d = document.getElementById('realm');
    if (!canvas) { return; }
    var on = active();
    canvas.style.display = on ? 'block' : 'none';
    if (map2d) { map2d.style.display = on ? 'none' : ''; }
    if (on) { resize(); startLoop(); rebuild(); }
  }

  function toggle() {
    if (!available()) { return false; }
    C().setTune('realm3d.on', ON() ? 0 : 1);
    syncVisibility();
    return ON();
  }

  /* ── 성·길·지형 세우기 ────────────────────────────────── */

  function clearDyn() {
    var t = three();
    dyn.clear();
    hitMeshes = [];
    pulseRings = [];
  }

  /** 발밑 그림자 — 실제 shadow map 대신 값싼 원 데칼을 깐다. 궤도 카메라로
   *  국토 전체를 내려다보는 화면이라(멀리서도 항상 선명해야 한다) 진짜
   *  그림자맵보다 이 편이 싸고 확실하다(saga-go 배우 그림자와 같은 요령) */
  var blobGeo = null, blobMat = null;
  function addShadow(x, z, r) {
    var t = three();
    if (!t || !dyn) { return; }
    if (!blobGeo) {
      blobGeo = new t.CircleGeometry(1, 16);
      blobMat = new t.MeshBasicMaterial({ color: 0x14140c, transparent: true, opacity: 0.3, depthWrite: false });
    }
    var m = new t.Mesh(blobGeo, blobMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.015, z);
    m.scale.setScalar(Math.max(0.4, r));
    dyn.add(m);
  }

  /** GLB 소품 하나를 세운다(비동기) — cityDressing·scatterSmall·riverPond 가 같이 쓴다.
   *  `seq` 가 다시 지어진 뒤(늦게 온 콜백)면 조용히 버린다 */
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

  /** 성 둘레 잔장식 — 우물 · 횃불 두 개. 3등급 대성은 성벽 · 시장 · 사찰까지
   *  더해 "이 나라의 큰 성" 임이 한눈에 보이도록 한다 */
  function cityDressing(city, tier, h, footprint, seq) {
    var cx = worldX(city.x), cz = worldZ(city.y);
    addProp('well', city.id + ':well', cx - footprint * 1.3, cz + footprint * 0.4, h * 0.5, 0, seq);
    addProp('torch', city.id + ':torchL', cx + footprint * 1.1, cz + footprint * 0.55, h * 0.45, 0, seq);
    addProp('torch', city.id + ':torchR', cx + footprint * 1.1, cz - footprint * 0.55, h * 0.45, 0, seq);
    if (tier === 't3') {
      addProp('wall', city.id + ':wallA', cx, cz + footprint * 1.5, h * 0.6, 0, seq);
      addProp('wall', city.id + ':wallB', cx, cz - footprint * 1.5, h * 0.6, Math.PI, seq);
      addProp('market', city.id + ':market', cx + footprint * 1.8, cz + footprint * 0.9, h * 0.55, 0, seq);
      addProp('temple', city.id + ':temple', cx + footprint * 1.8, cz - footprint * 0.9, h * 0.6, 0, seq);
    }
  }

  /** 강가 성 — 물웅덩이 하나 + 갈대 삼아 풀 두 포기. `land: 'river'` 뿐 */
  function riverPond(city, seq) {
    if (city.land !== 'river') { return; }
    var t = three();
    var cx = worldX(city.x), cz = worldZ(city.y);
    var hh = hashOf(city.id + ':pond');
    var ang = ((hh % 360) / 360) * Math.PI * 2;
    var r = 5 + (hh % 3);
    var px = cx + Math.cos(ang) * 9, pz = cz + Math.sin(ang) * 9;
    var pond = new t.Mesh(
      new t.CircleGeometry(r, 20),
      new t.MeshBasicMaterial({ color: 0x5aa9d8, transparent: true, opacity: 0.75 })
    );
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(px, 0.04, pz);
    dyn.add(pond);
    addProp('grass', city.id + ':reed1', px + r * 0.6, pz, 0.7, 0, seq);
    addProp('grass', city.id + ':reed2', px - r * 0.5, pz + r * 0.3, 0.6, 0.8, seq);
  }

  /** 작은 덤불 · 풀 · 꽃 — 나무/바위 큰 레이어 위에 얹는 잔풀 레이어(PLAN 33절
   *  "큰→중간→작은"). 산지는 암석 지대라 뺀다 */
  function scatterSmall(city, seq) {
    if (city.land === 'mount') { return; }
    var cx = worldX(city.x), cz = worldZ(city.y);
    var n = 4, i;
    for (i = 0; i < n; i++) {
      var hh = hashOf(city.id + ':sm:' + i);
      var ang = ((hh % 360) / 360) * Math.PI * 2;
      var r = 3 + (hh % 4);
      var px = cx + Math.cos(ang) * r, pz = cz + Math.sin(ang) * r;
      var pick = hh % 3;
      var kind = pick === 0 ? 'bush' : (pick === 1 ? 'grass' : 'flower');
      var scaleH = kind === 'bush' ? (0.8 + (hh % 6) / 10) : (0.5 + (hh % 5) / 10);
      addProp(kind, city.id + ':' + kind + ':' + hh, px, pz, scaleH, (hh % 628) / 100, seq);
    }
  }

  /** 병력 한 무리를 어림잡아 세우는 깃발 — `battle3d.js`와 같은 요령(막대+천을
   *  직접 짓는다, GLB 가 아니다). 진(陣)의 크기를 숫자 그대로가 아니라 다발로 본다 */
  function banner(color) {
    var t = three();
    var g = new t.Group();
    var pole = new t.Mesh(
      new t.CylinderGeometry(0.07, 0.07, 2.3, 5),
      new t.MeshLambertMaterial({ color: 0x6b5533 })
    );
    pole.position.y = 1.15;
    g.add(pole);
    var cloth = new t.Mesh(
      new t.BoxGeometry(0.85, 1.1, 0.05),
      new t.MeshLambertMaterial({ color: new t.Color(color) })
    );
    cloth.position.set(0.48, 2.0, 0);
    g.add(cloth);
    return g;
  }

  function bannerCluster(n, cx, cz, color) {
    var i, cols = Math.min(4, Math.max(1, n));
    for (i = 0; i < n; i++) {
      var row = Math.floor(i / cols), col = i % cols;
      var x = cx + (col - (cols - 1) / 2) * 1.4;
      var z = cz - row * 1.4;
      var b = banner(color);
      b.position.set(x, 0, z);
      dyn.add(b);
      addShadow(x, z, 0.4);
    }
  }

  /** 진(陣) — 성 밖에 진 친 부대. 성문 쪽(from→to 사이, to 에 가깝게)에 천막과
   *  세력 색 깃발 다발을 세운다. 내 진영이면 탭해서 진영 탭을 연다 */
  function buildCamp(cp, seq) {
    var t = three();
    var from = cityData().find(cp.from), to = cityData().find(cp.to);
    if (!from || !to) { return; }
    var fx = worldX(from.x), fz = worldZ(from.y);
    var tx = worldX(to.x), tz = worldZ(to.y);
    var frac = 0.82;
    var px = fx + (tx - fx) * frac, pz = fz + (tz - fz) * frac;
    var dx = tx - fx, dz = tz - fz, len = Math.hypot(dx, dz) || 1;
    var side = 5;
    px += (-dz / len) * side; pz += (dx / len) * side;
    var col = forceColor(cp.force);

    addProp('tent', cp.id + ':tent', px, pz, 5, Math.atan2(dx, dz) + Math.PI, seq);
    var n = clamp(Math.round((cp.troops || 0) / 1200), 2, 10);
    bannerCluster(n, px + 4, pz, col);

    if (cp.force === R().me()) {
      var hit = new t.Mesh(
        new t.CylinderGeometry(4.5, 4.5, 5, 10),
        new t.MeshBasicMaterial({ visible: false })
      );
      hit.position.set(px, 2.5, pz);
      hit.userData.campId = cp.id;
      dyn.add(hit);
      hitMeshes.push(hit);
    }
  }

  function addRoad(a, b, opt) {
    var t = three();
    var ax = worldX(a.x), az = worldZ(a.y), bx = worldX(b.x), bz = worldZ(b.y);
    var dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz) || 1;
    var mat = new t.MeshBasicMaterial({
      color: new t.Color(opt.color), transparent: true, opacity: opt.opacity
    });
    var mesh = new t.Mesh(new t.BoxGeometry(opt.width, 0.06, len), mat);
    mesh.position.set((ax + bx) / 2, opt.y, (az + bz) / 2);
    mesh.rotation.y = Math.atan2(dx, dz);
    dyn.add(mesh);
  }

  /** 지형지물 — 산은 봉우리, 구릉은 낮은 둔덕, 나머지는 나무·바위를 몇 개 흩는다.
   *  같은 성은 늘 같은 자리에 같은 것이 선다(해시 기반 — 매번 안 흔들린다) */
  function scatterAround(city, seq) {
    var cx = worldX(city.x), cz = worldZ(city.y);
    var n = city.land === 'mount' ? 2 : (city.land === 'hill' ? 2 : 3);
    var i;
    for (i = 0; i < n; i++) {
      var hh = hashOf(city.id + ':' + i);
      var ang = ((hh % 360) / 360) * Math.PI * 2;
      var r = 6 + (hh % 5);
      var px = cx + Math.cos(ang) * r, pz = cz + Math.sin(ang) * r;
      var kind = city.land === 'mount' ? 'mount' : (((hh >> 4) % 3) === 0 ? 'rock' : 'tree');
      var scaleH = kind === 'mount' ? (7 + (hh % 5)) : (kind === 'rock' ? 0.9 : (2.2 + (hh % 12) / 10));
      addProp(kind, city.id + ':' + kind + ':' + i, px, pz, scaleH, (hh % 628) / 100, seq);
    }
  }

  function buildCity(city, cst, me) {
    var t = three();
    var mine = cst.force === me;
    var tier = cityTier(city);
    var h = TIER_H[tier];
    var col = forceColor(cst.force);
    var seq = rebuildSeq;
    asset3d().build('city:' + tier, { id: city.id, tint: col, flag: col }, function (g) {
      if (seq !== rebuildSeq || !g || !dyn) { return; }
      g.position.set(worldX(city.x), 0, worldZ(city.y));
      g.scale.setScalar(h);
      dyn.add(g);

      var footprint = Math.max(3.2, h * 0.5);
      addShadow(worldX(city.x), worldZ(city.y), footprint * 0.9);
      cityDressing(city, tier, h, footprint, seq);
      var hitGeo = new t.CylinderGeometry(footprint, footprint, h, 10);
      var hit = new t.Mesh(hitGeo, new t.MeshBasicMaterial({ visible: false }));
      hit.position.set(worldX(city.x), h / 2, worldZ(city.y));
      hit.userData.cityId = city.id;
      dyn.add(hit);
      hitMeshes.push(hit);

      /* 내 성은 밑동에 밝은 고리를 둘러 눈에 띄게 한다 */
      if (mine) {
        var ring = new t.Mesh(
          new t.RingGeometry(footprint * 1.05, footprint * 1.35, 24),
          new t.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: t.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(worldX(city.x), 0.08, worldZ(city.y));
        dyn.add(ring);
      }

      /* 포위 — 숨쉬는 다홍 고리 */
      if (W() && W().besieged(city.id)) {
        var pr = new t.Mesh(
          new t.RingGeometry(footprint * 1.5, footprint * 1.75, 24),
          new t.MeshBasicMaterial({ color: 0xe0663f, transparent: true, opacity: 0.7, side: t.DoubleSide })
        );
        pr.rotation.x = -Math.PI / 2;
        pr.position.set(worldX(city.x), 0.09, worldZ(city.y));
        dyn.add(pr);
        pulseRings.push({ mesh: pr, base: footprint * 1.6 });
      }
    });
  }

  /** 성·길·지형을 통째로 다시 짓는다 — 세력이 바뀌거나(정벌) 달이 넘어갈 때 */
  function rebuild() {
    if (!ready) { return; }
    rebuildSeq++;
    clearDyn();
    var st = R().state();
    if (!st || !st.started) { return; }
    var cities = cityData().CITIES, i, j, drawn = {};

    for (i = 0; i < cities.length; i++) {
      var a = cities[i];
      for (j = 0; j < a.adj.length; j++) {
        var b = cityData().find(a.adj[j]);
        if (!b) { continue; }
        var key = a.id < b.id ? a.id + b.id : b.id + a.id;
        if (drawn[key]) { continue; }
        drawn[key] = true;
        var fa = st.cities[a.id].force, fb = st.cities[b.id].force;
        var same = fa && fa === fb;
        var water = cityData().isWater(a.id, b.id);
        if (water) {
          addRoad(a, b, { color: '#5aa9d8', opacity: 0.75, width: 3.2, y: 0.03 });
        } else if (same) {
          addRoad(a, b, { color: forceColor(fa), opacity: 0.6, width: 1.6, y: 0.05 });
        } else {
          addRoad(a, b, { color: '#9aa3ad', opacity: 0.22, width: 1.2, y: 0.05 });
        }
      }
    }

    var seq = rebuildSeq;
    for (i = 0; i < cities.length; i++) {
      buildCity(cities[i], st.cities[cities[i].id], st.me);
      scatterAround(cities[i], seq);
      scatterSmall(cities[i], seq);
      riverPond(cities[i], seq);
    }

    /* 진(陣) — 물러나지 않고 성 밖에 진 친 부대. 내 것·남의 것 다 세운다
       (이 판은 애초에 안 가린 정보라 — enemyCity() 도 적 성 살림을 그대로 보여준다) */
    var camps = W() ? W().camps() : [];
    for (i = 0; i < camps.length; i++) { buildCamp(camps[i], seq); }
  }

  /* ── 카메라 조작 (드래그 회전 · 휠/핀치 확대) ─────────── */

  var pointers = {};
  var dragMoved = false, pinchDist = 0;
  var ROT_SPEED = 0.006, ZOOM_SPEED = 0.6, WHEEL_SPEED = 0.15;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function pointerCount() {
    var n = 0, k;
    for (k in pointers) { if (pointers.hasOwnProperty(k)) { n++; } }
    return n;
  }

  /** 탄 것의 표(userData) 그대로 넘긴다 — `.cityId` 아니면 `.campId` */
  function pickHit(clientX, clientY) {
    var t = three();
    if (!t || !camera || !hitMeshes.length) { return null; }
    var rect = canvas.getBoundingClientRect();
    var ndc = new t.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    var ray = new t.Raycaster();
    ray.setFromCamera(ndc, camera);
    var hits = ray.intersectObjects(hitMeshes);
    return hits.length ? hits[0].object.userData : null;
  }

  function bindPointer() {
    canvas.addEventListener('pointerdown', function (e) {
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      try { canvas.setPointerCapture(e.pointerId); } catch (ex) { /* noop */ }
      if (pointerCount() === 1) { dragMoved = false; }
      if (pointerCount() === 2) { pinchDist = twoPointerDist(); }
    });
    canvas.addEventListener('pointermove', function (e) {
      var p = pointers[e.pointerId];
      if (!p) { return; }
      var dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (pointerCount() === 1) {
        targetYaw -= dx * ROT_SPEED;
        targetPitch = clamp(targetPitch + dy * ROT_SPEED, PITCH_MIN(), PITCH_MAX());
        if (Math.abs(dx) + Math.abs(dy) > 2) { dragMoved = true; }
      } else if (pointerCount() === 2) {
        var nd = twoPointerDist();
        targetDist = clamp(targetDist - (nd - pinchDist) * ZOOM_SPEED, DIST_MIN(), DIST_MAX());
        pinchDist = nd;
        dragMoved = true;
      }
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    });
    function endPointer(e) {
      var p = pointers[e.pointerId];
      delete pointers[e.pointerId];
      if (p && !dragMoved && pointerCount() === 0) {
        var hit = pickHit(e.clientX, e.clientY);
        if (hit && hit.campId && global.DG.ui) { global.DG.ui.openSheet('camp'); }
        else if (hit && hit.cityId && global.DG.ui) { global.DG.ui.openCity(hit.cityId); }
      }
    }
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('wheel', function (e) {
      targetDist = clamp(targetDist + e.deltaY * WHEEL_SPEED, DIST_MIN(), DIST_MAX());
      e.preventDefault();
    }, { passive: false });
  }

  function twoPointerDist() {
    var ks = Object.keys(pointers);
    if (ks.length < 2) { return 0; }
    var a = pointers[ks[0]], b = pointers[ks[1]];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /* ── 루프 ─────────────────────────────────────────────── */

  function startLoop() {
    if (loopRunning) { return; }
    loopRunning = true;
    requestAnimationFrame(tick);
  }

  function tick(now) {
    if (!active()) { loopRunning = false; return; }
    yaw += (targetYaw - yaw) * 0.15;
    pitch += (targetPitch - pitch) * 0.15;
    dist += (targetDist - dist) * 0.15;

    camera.position.set(
      Math.cos(pitch) * Math.sin(yaw) * dist,
      Math.sin(pitch) * dist + 6,
      Math.cos(pitch) * Math.cos(yaw) * dist
    );
    camera.lookAt(0, 6, 0);

    var t = now || 0;
    for (var i = 0; i < pulseRings.length; i++) {
      var s = 1 + Math.sin(t / 400 + i) * 0.08;
      pulseRings[i].mesh.scale.setScalar(s);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  global.DG = global.DG || {};
  global.DG.realm3d = {
    available: available,
    active: active,
    init: init,
    toggle: toggle,
    rebuild: rebuild
  };

  /* 세력이 바뀌거나(정벌·외교) 달이 넘어가면 다시 짓는다 — 켜져 있을 때만.
   * core.js 는 이 스크립트보다 앞서 실려 있다(index.html 순서) */
  global.DG.core.on('changed', function () { if (active()) { rebuild(); } });
})(window);
