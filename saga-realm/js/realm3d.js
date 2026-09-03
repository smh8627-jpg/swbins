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

  var GROUND_SPAN = 2200;         // buildGround() 의 PlaneGeometry 한 변과 같아야 한다
  var BIOME_COLOR = { plain: '#cfe0a0', hill: '#d3c88f', river: '#a9d6bd', mount: '#b3aca3' };

  /* ── 높낮이 지형 (heightmap) ──────────────────────────────
   * 평면 좌표계(worldX/worldZ)는 그대로 두고, **y 값만** 여기서 얹는다 —
   * 새 좌표계를 만들지 않는다는 원래 원칙과 같은 결이다. 두 층을 더한다:
   *  1) 결이 낮은 값잡음(baseNoise) — 격자 모서리를 해시로 찍고 bilinear로
   *     매끄럽게 잇는다. 지도 전역에 은은한 굴곡을 준다(평야도 완전히 평평하진 않다)
   *  2) 성마다의 land 로 정한 봉우리(cityBump) — 산은 높게, 구릉은 낮게,
   *     강은 살짝 파이게, 평야는 얹지 않는다. 성 반경 안에서만 값하고
   *     smoothstep 으로 부드럽게 꺼진다
   * 둘 다 해시 기반이라 항상 같은 그림이 선다(진단 결정성과 같은 이유).
   * 이 값은 성 좌표(x·y·land)에만 물려 있어 달이 넘어가도(rebuild) 안 변한다
   * — 그래서 바닥 지오메트리는 init() 때 딱 한 번만 굳힌다. */
  var NOISE_GRID = 44, NOISE_AMP = 4;
  var LAND_PEAK = { mount: 34, hill: 13, river: -3, plain: 0 };
  var BUMP_RADIUS = 42;

  function noiseCorner(gx, gz) {
    var hh = hashOf('terr:' + gx + ':' + gz);
    return ((hh % 1000) / 1000) * 2 - 1;
  }
  function smoothstep(x) { return x * x * (3 - 2 * x); }
  function baseNoise(wx, wz) {
    var gx = Math.floor(wx / NOISE_GRID), gz = Math.floor(wz / NOISE_GRID);
    var fx = smoothstep(wx / NOISE_GRID - gx), fz = smoothstep(wz / NOISE_GRID - gz);
    var v00 = noiseCorner(gx, gz), v10 = noiseCorner(gx + 1, gz);
    var v01 = noiseCorner(gx, gz + 1), v11 = noiseCorner(gx + 1, gz + 1);
    var a = v00 + (v10 - v00) * fx, b = v01 + (v11 - v01) * fx;
    return a + (b - a) * fz;
  }
  function cityBump(wx, wz) {
    var cities = cityData().CITIES, i, sum = 0;
    for (i = 0; i < cities.length; i++) {
      var c = cities[i], peak = LAND_PEAK[c.land] || 0;
      if (!peak) { continue; }
      var d = Math.hypot(wx - worldX(c.x), wz - worldZ(c.y));
      if (d > BUMP_RADIUS) { continue; }
      sum += peak * smoothstep(1 - d / BUMP_RADIUS);
    }
    return sum;
  }
  /** 지형 높이 — 이 함수 하나가 바닥 · 성 · 소품 · 길 · 카메라가 다 같이 읽는
   *  단일 진실 값이다(따로 잰 높이를 쓰면 소품이 바닥에 파묻히거나 뜬다) */
  function elevAt(wx, wz) { return baseNoise(wx, wz) * NOISE_AMP + cityBump(wx, wz); }

  /** 바닥 — 단색 한 장이 밋밋해서(퀄리티 피드백) **성 지형(land)마다 다른 색을
   *  그 둘레로 은은하게 물들이고**(들판=풀빛·구릉=흙빛·강가=옅은 청록·산=잿빛),
   *  그 위에 옅은 얼룩 점묘를 얹는다. 실제 사진이 아니라 해시로 찍은 점묘·원이라
   *  매번 같다(진단 결정성과 같은 이유) — `cityData()` 가 성마다의 x·y·land 를
   *  훑을 뿐 새 데이터를 만들지 않는다("코드가 아니라 값을 재사용" 원칙). */
  function groundTexture() {
    var t = three();
    var size = 512;
    var cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    var c = cv.getContext('2d');
    c.fillStyle = BIOME_COLOR.plain;
    c.fillRect(0, 0, size, size);

    function toPx(wx, wz) {
      return { x: (wx + GROUND_SPAN / 2) / GROUND_SPAN * size, y: (wz + GROUND_SPAN / 2) / GROUND_SPAN * size };
    }

    var cities = cityData().CITIES, i;
    for (i = 0; i < cities.length; i++) {
      var city = cities[i];
      var land = city.land || 'plain';
      if (land === 'plain') { continue; }        // 바탕색과 같아 그릴 것이 없다
      var col = BIOME_COLOR[land] || BIOME_COLOR.plain;
      var p = toPx(worldX(city.x), worldZ(city.y));
      var rad = size * 0.085;
      var g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
      g.addColorStop(0, col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(p.x, p.y, rad, 0, Math.PI * 2); c.fill();
    }

    var n = 3200;
    for (i = 0; i < n; i++) {
      var hh = hashOf('gtex:' + i);
      var x = hh % size, y = (hh >> 9) % size, r = 1.4 + (hh % 3);
      var tone = (hh >> 18) % 3;
      c.fillStyle = tone === 0 ? 'rgba(120,150,70,0.10)' : (tone === 1 ? 'rgba(235,228,175,0.08)' : 'rgba(90,128,58,0.12)');
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }

    var tex = new t.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = t.ClampToEdgeWrapping;
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
  var floaters = [];           // 재해 그림문자 — 천천히 위아래로 떠다닌다
  var rebuildSeq = 0;          // 늦게 도착한 옛 build() 콜백을 거른다

  var yaw = 0, pitch = 0.85, dist = 260;
  var targetYaw = 0, targetPitch = 0.85, targetDist = 260;
  var pivotY = 0;                 // 카메라가 도는 중심의 지형 높이(elevAt(0,0)) — init()에서 한 번 잰다

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

    /* PlaneGeometry는 XY 평면에 눕고, rotation.x=-90°로 눕히면 로컬 (x,y,z)가
     * 세계 (x, z, -y)로 간다 — 로컬 y ↔ 세계 z 가 **부호가 뒤집힌다.** elevAt()은
     * 세계 좌표(worldX/worldZ)로 부르는 함수라 그대로 넣으면 산이 지도의 반대쪽에
     * 선다(성은 안 움직이고 땅만 어긋난다) — 그래서 -gp.getY(gi)로 뒤집어 넣는다 */
    var groundGeo = new t.PlaneGeometry(GROUND_SPAN, GROUND_SPAN, 128, 128);
    var gp = groundGeo.attributes.position, gi;
    for (gi = 0; gi < gp.count; gi++) {
      gp.setZ(gi, elevAt(gp.getX(gi), -gp.getY(gi)));
    }
    groundGeo.computeVertexNormals();
    var ground = new t.Mesh(
      groundGeo,
      new t.MeshLambertMaterial({ color: 0xffffff, map: groundTexture() })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    pivotY = elevAt(0, 0);

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
    floaters = [];
  }

  /** 재해 그림문자 — 캔버스에 이모지를 한 번 찍어 텍스처로 굳힌다(문자마다 캐시) */
  var emojiTexCache = {};
  function emojiSprite(emoji, size) {
    var t = three();
    if (!emojiTexCache[emoji]) {
      var cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      var c = cv.getContext('2d');
      c.font = '46px sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(emoji, 32, 36);
      emojiTexCache[emoji] = new t.CanvasTexture(cv);
    }
    var spr = new t.Sprite(new t.SpriteMaterial({ map: emojiTexCache[emoji], transparent: true, depthTest: false }));
    spr.scale.setScalar(size || 4);
    return spr;
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
    m.position.set(x, elevAt(x, z) + 0.015, z);
    m.scale.setScalar(Math.max(0.4, r));
    dyn.add(m);
  }

  /** GLB 소품 하나를 세운다(비동기) — cityDressing·scatterSmall·riverPond 가 같이 쓴다.
   *  `seq` 가 다시 지어진 뒤(늦게 온 콜백)면 조용히 버린다 */
  function addProp(kind, id, x, z, scaleH, rotY, seq) {
    asset3d().build(kind, { id: id }, function (g) {
      if (seq !== rebuildSeq || !g || !dyn) { return; }
      g.position.set(x, elevAt(x, z), z);
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
    pond.position.set(px, elevAt(px, pz) + 0.04, pz);
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
      b.position.set(x, elevAt(x, z), z);
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
      hit.position.set(px, elevAt(px, pz) + 2.5, pz);
      hit.userData.campId = cp.id;
      dyn.add(hit);
      hitMeshes.push(hit);
    }
  }

  /** 원정 하나가 경로 위 지금 어디쯤 있는가(화면 x·y) — `ui-rtk.js` 의
   *  `journeyPos()` 와 같은 구간별 실거리 보간이다(두 파일이 같은 값을
   *  따로 계산한다 — 2D·3D 가 별 모듈이라 공유할 자리가 마땅치 않다) */
  function journeyPos(j) {
    var CDx = cityData();
    var path = j.path, i;
    if (!path || path.length < 2) {
      var only = path && CDx.find(path[0]);
      return only ? { x: only.x, y: only.y } : null;
    }
    var frac = clamp((j.monthsElapsed || 0) / (j.monthsTotal || 1), 0, 0.999);
    var segs = [], total = 0;
    for (i = 0; i < path.length - 1; i++) {
      var a = CDx.find(path[i]), b = CDx.find(path[i + 1]);
      if (!a || !b) { continue; }
      var len = Math.hypot(a.x - b.x, a.y - b.y);
      segs.push({ a: a, b: b, len: len });
      total += len;
    }
    if (!segs.length) { return null; }
    if (!total) { return { x: segs[0].a.x, y: segs[0].a.y }; }
    var target = frac * total, acc = 0;
    for (i = 0; i < segs.length; i++) {
      if (acc + segs[i].len >= target || i === segs.length - 1) {
        var sf = segs[i].len > 0 ? clamp((target - acc) / segs[i].len, 0, 1) : 0;
        return { x: segs[i].a.x + (segs[i].b.x - segs[i].a.x) * sf,
                 y: segs[i].a.y + (segs[i].b.y - segs[i].a.y) * sf };
      }
      acc += segs[i].len;
    }
    return { x: segs[segs.length - 1].b.x, y: segs[segs.length - 1].b.y };
  }

  /** 가고 있는 원정 — 경로 위 지금 자리에 깃발 하나(2D 지도의 🚩 마커와 같은
   *  자리, 2026-09-04). GLB 소품 없이 이모지 스프라이트로 충분하다(재해
   *  그림문자와 같은 요령) */
  function buildJourney(j, seq) {
    var pos = journeyPos(j);
    if (!pos || seq !== rebuildSeq) { return; }
    var wx = worldX(pos.x), wz = worldZ(pos.y);
    var flag = emojiSprite('🚩', 9);
    flag.position.set(wx, elevAt(wx, wz) + 9, wz);
    dyn.add(flag);
  }

  /** 성과 성 사이 길 — 평지 구간은 예전처럼 한 토막, 언덕·산을 지나는 긴
   *  구간은 몇 토막으로 나눠 지형을 따라 오르내리게 한다(2026-09-04, 높낮이
   *  지형을 얹으며 — 안 나누면 길이 산허리를 그대로 뚫고 지나간다). 토막마다
   *  3D 로 기울여야 해서 Y 축(방향) 뿐 아니라 X 축(오르내림 경사)도 돌린다 */
  function addRoadSegment(p1, p2, opt) {
    var t = three();
    var dx = p2.x - p1.x, dy = p2.y - p1.y, dz = p2.z - p1.z;
    var flat = Math.hypot(dx, dz), len = Math.hypot(flat, dy) || 0.001;
    var mat = new t.MeshBasicMaterial({
      color: new t.Color(opt.color), transparent: true, opacity: opt.opacity
    });
    var mesh = new t.Mesh(new t.BoxGeometry(opt.width, 0.06, len), mat);
    mesh.position.set((p1.x + p2.x) / 2, (p1.y + p2.y) / 2 + opt.y, (p1.z + p2.z) / 2);
    mesh.rotation.order = 'YXZ';
    mesh.rotation.y = Math.atan2(dx, dz);
    mesh.rotation.x = -Math.atan2(dy, flat || 0.001);
    dyn.add(mesh);
  }

  function addRoad(a, b, opt) {
    var ax = worldX(a.x), az = worldZ(a.y), bx = worldX(b.x), bz = worldZ(b.y);
    var flatLen = Math.hypot(bx - ax, bz - az);
    var n = clamp(Math.round(flatLen / 40), 2, 8), i;
    var prev = { x: ax, y: elevAt(ax, az), z: az };
    for (i = 1; i <= n; i++) {
      var f = i / n;
      var px = ax + (bx - ax) * f, pz = az + (bz - az) * f;
      var cur = { x: px, y: elevAt(px, pz), z: pz };
      addRoadSegment(prev, cur, opt);
      prev = cur;
    }
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

  /** 성 사이 빈 들 — 성마다 두르는 `scatterAround`/`scatterSmall` 는 성 둘레
   *  6~13 유닛에만 꽂혀서, 그 사이 넓은 빈칸은 늘 판판했다(퀄리티 피드백,
   *  2026-09-04). 성 좌표를 담는 사각형을 격자로 훑으며 **가장 가까운 성의
   *  land** 를 물려받아 그 결에 맞는 소품을 성기게(칸마다 18% 확률) 흩는다.
   *  성 발밑(반경 16유닛)은 건너뛴다 — `cityDressing`이 이미 그 자리를 쓴다.
   *  칸 좌표 하나로 심을지·무엇을·어디에를 다 정해 늘 같은 그림이 선다. */
  function scatterField(seq) {
    var cities = cityData().CITIES, i, k;
    var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (i = 0; i < cities.length; i++) {
      var wx = worldX(cities[i].x), wz = worldZ(cities[i].y);
      if (wx < minX) { minX = wx; } if (wx > maxX) { maxX = wx; }
      if (wz < minZ) { minZ = wz; } if (wz > maxZ) { maxZ = wz; }
    }
    var pad = 30, cell = 18;
    minX -= pad; maxX += pad; minZ -= pad; maxZ += pad;

    for (var gx = minX; gx < maxX; gx += cell) {
      for (var gz = minZ; gz < maxZ; gz += cell) {
        var hh = hashOf('field:' + Math.round(gx) + ':' + Math.round(gz));
        if (hh % 100 >= 18) { continue; }
        var jx = gx + ((hh >> 6) % cell) - cell / 2;
        var jz = gz + ((hh >> 12) % cell) - cell / 2;

        var near = null, nd = Infinity;
        for (k = 0; k < cities.length; k++) {
          var d = Math.hypot(jx - worldX(cities[k].x), jz - worldZ(cities[k].y));
          if (d < nd) { nd = d; near = cities[k]; }
        }
        if (!near || nd < 16) { continue; }

        var land = near.land || 'plain';
        var pick = (hh >> 18) % 10;
        var kind, scaleH;
        if (land === 'mount') {
          kind = pick < 6 ? 'rock' : 'mount';
          scaleH = kind === 'mount' ? (5 + (hh % 4)) : 0.8;
        } else if (land === 'hill') {
          kind = pick < 5 ? 'rock' : (pick < 8 ? 'bush' : 'tree');
          scaleH = kind === 'tree' ? (1.8 + (hh % 8) / 10) : 0.8;
        } else if (land === 'river') {
          kind = pick < 6 ? 'grass' : (pick < 9 ? 'bush' : 'tree');
          scaleH = kind === 'tree' ? (2 + (hh % 8) / 10) : 0.7;
        } else {
          kind = pick < 7 ? 'tree' : (pick < 9 ? 'bush' : 'flower');
          scaleH = kind === 'tree' ? (2 + (hh % 14) / 10) : 0.7;
        }
        addProp(kind, 'field:' + Math.round(jx) + ':' + Math.round(jz), jx, jz, scaleH, (hh % 628) / 100, seq);
      }
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
      var cx = worldX(city.x), cz = worldZ(city.y), gy = elevAt(cx, cz);
      g.position.set(cx, gy, cz);
      g.scale.setScalar(h);
      dyn.add(g);

      var footprint = Math.max(3.2, h * 0.5);
      addShadow(cx, cz, footprint * 0.9);
      cityDressing(city, tier, h, footprint, seq);
      var hitGeo = new t.CylinderGeometry(footprint, footprint, h, 10);
      var hit = new t.Mesh(hitGeo, new t.MeshBasicMaterial({ visible: false }));
      hit.position.set(cx, gy + h / 2, cz);
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
        ring.position.set(cx, gy + 0.08, cz);
        dyn.add(ring);
      }

      /* 포위 — 숨쉬는 다홍 고리 */
      if (W() && W().besieged(city.id)) {
        var pr = new t.Mesh(
          new t.RingGeometry(footprint * 1.5, footprint * 1.75, 24),
          new t.MeshBasicMaterial({ color: 0xe0663f, transparent: true, opacity: 0.7, side: t.DoubleSide })
        );
        pr.rotation.x = -Math.PI / 2;
        pr.position.set(cx, gy + 0.09, cz);
        dyn.add(pr);
        pulseRings.push({ mesh: pr, base: footprint * 1.6 });
      }

      /* 재해·풍년 — 고리(포위보다 바깥) + 떠다니는 그림문자. rtk.js 가 이미
         `cst.disaster` 로 매기고 있는 것을 그대로 읽을 뿐이다 */
      if (cst.disaster) {
        var dInfo = R().disasterByKey(cst.disaster);
        if (dInfo) {
          var dr = new t.Mesh(
            new t.RingGeometry(footprint * 1.9, footprint * 2.15, 24),
            new t.MeshBasicMaterial({
              color: dInfo.good ? 0xf3d24a : 0x8a5a2a, transparent: true, opacity: 0.55, side: t.DoubleSide
            })
          );
          dr.rotation.x = -Math.PI / 2;
          dr.position.set(cx, gy + 0.1, cz);
          dyn.add(dr);

          var spr = emojiSprite(dInfo.emoji, h * 0.9);
          var baseY = gy + h * 1.25;
          spr.position.set(cx, baseY, cz);
          dyn.add(spr);
          floaters.push({ mesh: spr, baseY: baseY, amp: h * 0.12, seed: hashOf(city.id) % 100 });
        }
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
    scatterField(seq);

    /* 진(陣) — 물러나지 않고 성 밖에 진 친 부대. 내 것·남의 것 다 세운다
       (이 판은 애초에 안 가린 정보라 — enemyCity() 도 적 성 살림을 그대로 보여준다) */
    var camps = W() ? W().camps() : [];
    for (i = 0; i < camps.length; i++) { buildCamp(camps[i], seq); }

    /* 원정 — 가고 있는 중인 부대(2026-09-04). camp 와 달리 아직 어느 성도
       에워싸지 않은, 오가는 중인 상태다 */
    var journeys = W() ? W().journeys() : [];
    for (i = 0; i < journeys.length; i++) { buildJourney(journeys[i], seq); }
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
      Math.sin(pitch) * dist + pivotY + 6,
      Math.cos(pitch) * Math.cos(yaw) * dist
    );
    camera.lookAt(0, pivotY + 6, 0);

    var t = now || 0;
    for (var i = 0; i < pulseRings.length; i++) {
      var s = 1 + Math.sin(t / 400 + i) * 0.08;
      pulseRings[i].mesh.scale.setScalar(s);
    }
    for (var j = 0; j < floaters.length; j++) {
      var fl = floaters[j];
      fl.mesh.position.y = fl.baseY + Math.sin(t / 450 + fl.seed) * fl.amp;
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
