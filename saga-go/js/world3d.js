/**
 * 3D 렌더러 — 원작(포켓몬GO)의 화면을 WebGL 로 옮긴다
 * ---------------------------------------------------------------
 * 여태 화면은 캔버스 2D 였다. 2.5D·3D 모드도 스프라이트를 원근으로 **세워 그린**
 * 가짜였다(`world.js` 의 `project()`). 원작은 지도 위에 진짜 3D 가 서 있고,
 * 그림자가 지면에 지고, 카메라가 낮게 깔려 따라다닌다. 그 층을 여기 만든다.
 *
 *   지면    실제 지도 타일을 **평면에 텍스처로** 깐다 (타일을 못 받으면 절차적 지형)
 *   사물    지도에 높이 정보가 없으니 `terrainAt` 격자로 **절차적으로 세운다**(`propPlan`)
 *   인물·짐승  `actor3d.js` 가 **도형으로 조립한 입체**를 세운다 (빌보드는 되돌림용)
 *   조명    시각과 천후를 보고 해가 뜨고 진다 (`lightingAt`)
 *   카메라  플레이어를 뒤에서 낮게 본다. 조우가 열리면 그쪽으로 다가간다
 *
 * **판정에는 한 줄도 닿지 않는다.** 좌표·스폰·거리는 전부 `world.js` 의 것을 읽기만
 * 하고, 여기서 만든 값은 화면에만 쓴다. 그래서 자가진단(`DG_NO_DRAW`)은 이 파일을
 * 켜지도 않고, 켜지지 않아도 게임은 그대로 돈다 — 대신 **값을 내는 함수**
 * (`lightingAt`·`propPlan`·`camAim`)는 three 없이도 돌아 진단이 그것만 따로 본다.
 *
 * WebGL 이 없거나 켜다 실패하면 **조용히 2D 로 돌아간다**(`available()` 이 false).
 * three.js 는 `js/vendor/three.iife.js` 한 덩이로 들어 있다 — PC 단독판이 `file://`
 * 로 열리는데 거기서는 `<script type="module">` 이 막히기 때문이다(그래서 IIFE 다).
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  var T = null;                 // THREE (없으면 이 모듈은 통째로 잠든다)
  var renderer = null, scene = null, camera = null;
  var sun = null, sky = null, lantern = null;
  var groundGroup = null, propGroup = null, actorGroup = null, fxGroup = null;
  var tileMeshes = {};          // 지면 타일 { key: Mesh }
  var propMeshes = {};          // 건물·나무 { key: Object3D }
  var actors = {};              // 배우 { key: {node, shadow, seen, …} }
  var texCache = {};            // 캔버스/이미지 텍스처
  var ready = false, failed = false;
  var canvas = null;
  var frame = 0;
  var lightNow = null;          // 이번 프레임의 조명 (probe 가 들여다본다)

  /* ── 규칙 값 (화면에만 쓰는 값이라 손잡이로 열어 둔다) ── */

  function TILE_SPAN() { return core.tuned('world3d.tileSpan', 3); }      // 타일 반경(장)
  function PROP_R() { return core.tuned('world3d.propRadius', 260); }     // 사물 반경(m)
  function CAM_DIST() { return core.tuned('world3d.camDist', 40); }       // 카메라 거리(m)
  function CAM_HIGH() { return core.tuned('world3d.camHeight', 15); }     // 카메라 높이(m)
  /** 사람 키(m) — 원작처럼 지도 위에서는 실제보다 크게 세운다(1.8m 면 안 보인다) */
  function ACTOR_H() { return core.tuned('world3d.actorH', 3.4); }
  /** 지도 스타일 — 1 은 밝은 지도(voyager). 원작의 파스텔 지도에 가깝다 */
  function MAP_STYLE() { return core.tuned('world3d.mapStyle', 1); }
  /** 배우를 도형으로 세울까 — 0 이면 1단계의 빌보드로 돌아간다 */
  function MESH_ON() { return core.tuned('world3d.mesh', 1) ? true : false; }
  /** 건물 밀도 배수 — 기기가 버거우면 여기를 내린다 */
  function DENSITY() { return core.tuned('world3d.density', 1); }
  /** 시각을 따라 해가 뜨고 질까 — 0 이면 늘 한낮 */
  function DAYNIGHT() { return core.tuned('world3d.dayNight', 1) ? true : false; }
  /** 세로 화면에서 카메라를 물릴까 — 0 이면 옛 그림(폰에서 지형지물이 화면을 덮는다) */
  function PORTRAIT_FIT() { return core.tuned('world3d.portraitFit', 1) ? true : false; }
  /** 물리는 정도의 상한(배) — 1 이면 안 물린다 */
  function PORTRAIT_MAX() { return core.tuned('world3d.portraitMax', 1.8); }

  /** 기본 시야각(도) — 가로 화면에서 쓰던 값 */
  function FOV() { return core.tuned('world3d.fov', 52); }
  /** 세로 화면에서 벌릴 수 있는 시야각의 상한(도) */
  function FOV_MAX() { return core.tuned('world3d.fovMax', 80); }

  /* 이 판의 거리·높이 값은 **PC 가로 화면**에서 잡혔다. three 의 fov 는 세로
     기준이라, 세로로 긴 폰(가로세로비 0.53)에서는 가로 시야가 PC 의 절반 밑으로
     좁아진다 — 같은 자리인데 건물과 나무가 화면을 덮는다.
     **카메라를 물리지는 않는다.** 물려 봤더니 안개(lightingAt 의 fog)가 가로
     화면 거리에 맞춰져 있어 화면이 통째로 하얘졌다 — 실제로 찍어 보고 접은 길이다.
     대신 **시야각만 벌린다**: 카메라는 제자리라 안개도 그림자 상자도 그대로다.
     REF 는 그 거리 값들이 잡힌 화면의 가로세로비다. */
  var REF_ASPECT = 1.5;
  var DEG = 180 / Math.PI;
  /** 이 화면에서 쓸 시야각(도). 가로 화면이면 기본값 그대로 */
  function fovFor(w, h) {
    var base = FOV();
    if (!PORTRAIT_FIT() || !w || !h) { return base; }
    var a = w / h;
    if (a >= REF_ASPECT) { return base; }
    /* 제곱근을 쓴다 — 가로 시야를 그대로 되찾으려면 폰에서 112도가 되어 휜다 */
    var mul = Math.min(PORTRAIT_MAX(), Math.sqrt(REF_ASPECT / a));
    var t = Math.tan(base / 2 / DEG) * mul;
    return Math.min(FOV_MAX(), 2 * Math.atan(t) * DEG);
  }

  /** 3D 로 그릴까 — 손잡이로 끌 수 있다(0 이면 예전 2D 화면) */
  function wanted() { return core.tuned('world.render3d', 1) ? true : false; }

  function available() { return ready && !failed; }
  function active() { return available() && wanted(); }

  /* ── 시간대 조명 ──────────────────────────────────────────
   * 원작에서 저녁에 나가면 화면이 저녁이다. 그 하나가 "지금 밖에 있다" 를 만든다.
   * 여기서는 **시각과 천후만 보고** 값을 낸다 — three 도 세이브도 안 본다.
   * 그래서 자가진단이 이 함수만 따로 굴려 볼 수 있다.
   */
  function mixHex(a, b, k) {
    k = k < 0 ? 0 : (k > 1 ? 1 : k);
    var ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    var br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    return (Math.round(ar + (br - ar) * k) << 16) |
           (Math.round(ag + (bg - ag) * k) << 8) |
           Math.round(ab + (bb - ab) * k);
  }
  /** 색의 밝기 (0~1) — 진단이 "밤이 더 어둡다" 를 값으로 본다 */
  function lum(hex) {
    return (((hex >> 16) & 255) * 0.299 + ((hex >> 8) & 255) * 0.587 + (hex & 255) * 0.114) / 255;
  }

  var C_NIGHT = { sun: 0x9fb6e0, sky: 0x1a2440, hemiSky: 0x35507f, hemiGnd: 0x1c2230, tint: 0x5a6684 };
  var C_GOLD = { sun: 0xffab63, sky: 0xe8946a, hemiSky: 0xf0b48a, hemiGnd: 0x4a4038, tint: 0xffd2b0 };
  var C_DAY = { sun: 0xfff0d0, sky: 0x8fb6d8, hemiSky: 0xdce9ff, hemiGnd: 0x53604a, tint: 0xffffff };

  /**
   * @param ms    시각(생략하면 지금)
   * @param wkey  천후 키(clear·cloud·rain·wind·fog·snow). 생략하면 맑음
   */
  function lightingAt(ms, wkey) {
    var d = new Date(ms === undefined ? Date.now() : ms);
    var hour = d.getHours() + d.getMinutes() / 60;
    /* 해 고도 — 6시에 뜨고 18시에 진다. 실제 천문을 흉내 내지 않는다:
       위도·계절까지 넣으면 값은 정확해지지만 화면은 달라지지 않는다 */
    var alt = Math.sin((hour - 6) / 12 * Math.PI);
    if (!DAYNIGHT()) { alt = 0.9; hour = 12; }

    var phase = alt > 0.30 ? 'day'
      : (alt > 0.04 ? (hour < 12 ? 'dawn' : 'dusk')
        : (alt > -0.14 ? 'twilight' : 'night'));

    /* 낮섞임(k)과 노을섞임(gold) 둘로 색을 만든다.
       노을은 해가 지평선 가까이 있을 때만 세다 — 한낮에도 섞으면 늘 누렇다 */
    var k = Math.max(0, Math.min(1, (alt + 0.14) / 0.62));
    var gold = Math.max(0, 1 - Math.abs(alt - 0.10) / 0.36);

    function pick(field) {
      var base = mixHex(C_NIGHT[field], C_DAY[field], k);
      return mixHex(base, C_GOLD[field], gold * 0.75);
    }

    var out = {
      hour: hour, alt: alt, phase: phase, night: phase === 'night',
      sun: {
        hex: pick('sun'),
        intensity: 0.28 + Math.max(0, alt) * 1.35,
        /* 해는 동(-x)에서 떠 서(+x)로 진다. 밤에는 달이 반대쪽에 뜬 셈 친다 */
        x: -Math.cos((hour - 6) / 12 * Math.PI) * 120,
        y: 40 + Math.abs(alt) * 110,
        z: -70 - Math.max(0, alt) * 40
      },
      hemi: { sky: pick('hemiSky'), ground: pick('hemiGnd'), intensity: 0.52 + k * 0.95 },
      bg: pick('sky'),
      tint: pick('tint'),
      fog: { near: 90 + k * 170, far: 320 + k * 440 },
      /* 밤에는 배우 발밑에 등불이 켜진다 (원작의 밤 화면에서 아바타가 안 묻히게) */
      lamp: alt < 0.06 ? Math.min(1, (0.06 - alt) * 4) : 0
    };

    var w = wkey || 'clear';
    if (w === 'rain') {
      out.sun.intensity *= 0.48; out.hemi.intensity *= 0.80;
      out.bg = mixHex(out.bg, 0x55606e, 0.55); out.tint = mixHex(out.tint, 0x8f99a8, 0.45);
      out.fog.far *= 0.46; out.fog.near *= 0.7;
    } else if (w === 'snow') {
      out.sun.intensity *= 0.66; out.hemi.intensity *= 1.05;
      out.bg = mixHex(out.bg, 0xc8d2de, 0.55); out.tint = mixHex(out.tint, 0xe0e8f0, 0.45);
      out.fog.far *= 0.52;
    } else if (w === 'fog') {
      out.sun.intensity *= 0.55; out.hemi.intensity *= 0.92;
      out.bg = mixHex(out.bg, 0xb8bcc0, 0.6); out.tint = mixHex(out.tint, 0xc2c6ca, 0.35);
      out.fog.far *= 0.26; out.fog.near *= 0.35;
    } else if (w === 'cloud') {
      out.sun.intensity *= 0.70; out.hemi.intensity *= 0.94;
      out.bg = mixHex(out.bg, 0x8a929c, 0.42); out.tint = mixHex(out.tint, 0xb8bec6, 0.28);
      out.fog.far *= 0.78;
    } else if (w === 'wind') {
      out.fog.far *= 1.15;
    }
    out.weather = w;
    return out;
  }

  /* 데모가 밤·노을을 눈으로 확인할 때 쓰는 문 — 게임에서는 늘 null 이라 진짜 시계를 본다
     (`weather.force` 와 같은 방식이다: 밖에서 함수를 갈아 끼우면 안쪽 호출이 안 바뀐다) */
  var forcedMs = null;
  function forceTime(ms) {
    forcedMs = (ms === null || ms === undefined) ? null : ms;
    return forcedMs;
  }

  function weatherKey() {
    var W = global.DG.weather;
    return W ? W.current().key : 'clear';
  }

  /* ── 켜기 ─────────────────────────────────────────────── */

  function init(cv) {
    if (ready || failed) { return available(); }
    T = global.THREE || null;
    canvas = cv || document.getElementById('map3d');
    if (!T || !canvas) { failed = true; return false; }
    try {
      /* `preserveDrawingBuffer` — 평소에는 끈다(빠르다). 헤드리스 스크린샷에서는
         **켜야 한다**: WebGL 은 그린 직후 버퍼를 비우므로, rAF 가 거의 돌지 않는
         그 환경에서는 캡처 시점에 빈 캔버스가 찍힌다(밟아 본 함정이다).
         데모 페이지가 `DG_3D_PRESERVE` 로 켠다. */
      renderer = new T.WebGLRenderer({
        canvas: canvas, antialias: true, alpha: false,
        preserveDrawingBuffer: !!global.DG_3D_PRESERVE
      });
      renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = T.SRGBColorSpace;
      /* 디버그: 그림자·안개를 끊어 원인을 좁힐 수 있게 (DG_3D_DEBUG) */
      if (!(global.DG_3D_DEBUG || {}).noShadow) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = T.PCFSoftShadowMap;
      }
    } catch (e) {
      failed = true;
      return false;
    }

    scene = new T.Scene();
    /* 카메라가 낮으면 지평선 위가 보인다 — 검정이 아니라 하늘이 있어야 한다.
       안개는 그 하늘색으로 멀리서 스며들게 해 경계가 드러나지 않게 한다. */
    var L0 = lightingAt(undefined, weatherKey());
    var skyCol = new T.Color(L0.bg);
    scene.background = skyCol;
    renderer.setClearColor(skyCol, 1);       // background 와 별개로 못박아 둔다
    if (!(global.DG_3D_DEBUG || {}).noFog) {
      scene.fog = new T.Fog(L0.bg, L0.fog.near, L0.fog.far);
    }

    camera = new T.PerspectiveCamera(
      fovFor(canvas.clientWidth || global.innerWidth, canvas.clientHeight || global.innerHeight),
      1, 0.5, 1400);

    /* 빛은 둘뿐이다 — 하늘/땅에서 오는 반사광과, 그림자를 만드는 해 하나 */
    sky = new T.HemisphereLight(L0.hemi.sky, L0.hemi.ground, L0.hemi.intensity);
    scene.add(sky);
    sun = new T.DirectionalLight(L0.sun.hex, L0.sun.intensity);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 400;
    sun.shadow.camera.left = -140;
    sun.shadow.camera.right = 140;
    sun.shadow.camera.top = 140;
    sun.shadow.camera.bottom = -140;
    sun.shadow.bias = -0.0012;
    scene.add(sun);
    scene.add(sun.target);
    /* 등롱 — 밤에만 켜지는 작은 불 하나가 플레이어를 따라다닌다.
       해가 지면 배우가 실루엣으로만 남아 누군지 안 보인다(원작의 밤 화면도
       아바타 둘레만 환하다). 그림자는 안 만든다 — 빛 하나에 그림자 맵이 하나 더 붙는다 */
    lantern = new T.PointLight(0xffd9a0, 0, 34, 1.6);
    scene.add(lantern);

    groundGroup = new T.Group(); scene.add(groundGroup);
    propGroup = new T.Group(); scene.add(propGroup);
    actorGroup = new T.Group(); scene.add(actorGroup);
    fxGroup = new T.Group(); scene.add(fxGroup);

    bindEvents();
    ready = true;
    resize();
    return true;
  }

  function resize() {
    if (!available() || !canvas) { return; }
    var w = canvas.clientWidth || global.innerWidth;
    var h = canvas.clientHeight || global.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.fov = fovFor(w, h);
    camera.updateProjectionMatrix();
  }

  /* 좌표 — world.js 는 미터 평면(x 동쪽, y 남쪽)이고 3D 는 y 가 높이다.
     **(x, y) → (x, 0, y)** 로 그대로 눕힌다. 축을 다시 정의하지 않는다. */

  /* ── 지면 ─────────────────────────────────────────────── */

  function tileTexture(img) {
    if (!img || !img.ready) { return null; }
    var key = img.src;
    if (texCache[key]) { return texCache[key]; }
    var tex = new T.Texture(img);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    texCache[key] = tex;
    return tex;
  }

  /** 지도 타일을 카메라 둘레에만 깐다 (멀어진 것은 지운다) */
  function syncGround(W) {
    var mpp = W.metersPerPixel();
    var span = W.TILE_PX * mpp;                     // 타일 한 장이 덮는 미터
    var pos = core.save.player.pos;
    var ll = W.worldToLatLng(pos.x, pos.y);
    var px = W.latLngToPixel(ll.lat, ll.lng);
    var cx = Math.floor(px.x / W.TILE_PX), cy = Math.floor(px.y / W.TILE_PX);
    var R = TILE_SPAN(), live = {};
    /* 밤에는 지도 자체가 어두워야 한다 — 타일 색에 조명의 물감을 곱한다.
       (지도 이미지는 늘 한낮 그림이라, 안 곱하면 밤에 땅만 대낮이다) */
    var tint = lightNow ? lightNow.tint : 0xffffff;

    for (var dy = -R; dy <= R; dy++) {
      for (var dx = -R; dx <= R; dx++) {
        var tx = cx + dx, ty = cy + dy;
        var key = tx + '/' + ty;
        live[key] = 1;
        var mesh = tileMeshes[key];
        if (!mesh) {
          var geo = new T.PlaneGeometry(span, span);
          var mat = new T.MeshLambertMaterial({ color: 0x1a1f28 });
          mesh = new T.Mesh(geo, mat);
          mesh.rotation.x = -Math.PI / 2;           // 눕힌다
          mesh.receiveShadow = true;
          groundGroup.add(mesh);
          tileMeshes[key] = mesh;
        }
        /* 타일의 왼쪽 위 모서리를 월드 미터로 환산해 한가운데에 놓는다 */
        var corner = worldOfLatLng(tile2lat(ty, W), tile2lng(tx, W));
        mesh.position.set(corner.x + span / 2, -0.02, corner.y + span / 2);

        var img = W.getTile(tx, ty, W.ZOOM, MAP_STYLE());
        var tex = tileTexture(img);
        if (tex) {
          if (mesh.material.map !== tex) {
            mesh.material.map = tex;
            mesh.material.needsUpdate = true;
          }
          mesh.material.color.setHex(tint);
        } else {
          /* 아직 지도가 안 온 자리. 지형색으로 칠하면 **242m 짜리 색 덩어리**가 생겨
             지도가 그렇게 생긴 줄 알게 된다 — 옅은 종이색으로 비워 둔다.
             타일이 오면 위에서 곧바로 갈아 끼운다. */
          mesh.material.color.setHex(mixHex(0xd7dbe0, tint, 0.85));
        }
      }
    }
    for (var k in tileMeshes) {
      if (!Object.prototype.hasOwnProperty.call(tileMeshes, k) || live[k]) { continue; }
      var m = tileMeshes[k];
      groundGroup.remove(m);
      m.geometry.dispose();
      delete tileMeshes[k];
    }
  }

  function tile2lng(x, W) { return x / Math.pow(2, W.ZOOM) * 360 - 180; }
  function tile2lat(y, W) {
    var n = Math.PI - 2 * Math.PI * y / Math.pow(2, W.ZOOM);
    return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  }
  function worldOfLatLng(lat, lng) {
    var o = global.DG.world.origin;
    var mPerLat = 111320;
    var mPerLng = 111320 * Math.cos(o.lat * Math.PI / 180);
    return { x: (lng - o.lng) * mPerLng, y: -(lat - o.lat) * mPerLat };
  }

  /* ── 건물 · 나무 — 무엇이 몇 개 서는가 ───────────────────
   * 지도 타일에는 **높이가 없다.** 원작의 도시 감각은 건물이 서 있는 데서 오므로,
   * 지형 격자(`terrainAt`, 48m)를 보고 절차적으로 세운다.
   *
   * 1단계는 격자마다 상자 두셋을 세우는 게 전부였다 — 어느 동네나 똑같이 성겼다.
   * 이제 **격자마다 도심도(都心度)를 뽑아** 밀도를 가른다: 번화한 칸은 높은 집이
   * 여덟 채까지 들어차고, 변두리는 낮은 집 두엇에 나무가 섞인다. 길가에는 등롱을
   * 세우고 빈 들에도 풀·바위를 둔다 — 아무것도 없는 칸이 있으면 그 자리가 구멍처럼 보인다.
   *
   * **자리는 좌표 해시라 같은 땅이면 늘 같다.** 스폰·역참이 그런 것과 같은 규칙이다.
   * 이 함수는 three 를 안 쓴다 — 자가진단이 계획만 따로 굴려 본다.
   */
  var GRID = 48;
  /* 이 거리부터 배우를 키운다 (m) — 그 안쪽은 눈에 보이는 그대로 */
  var FAR_NEAR = 45, FAR_MAX = 4;

  /* 이 판의 core.hash2 는 0~0.5 만 돌려준다(world.js 주석 참고) — 두 배로 편다 */
  function h1(a, b) { return Math.min(0.999999, core.hash2(a, b) * 2); }

  /** 이 격자가 얼마나 번화한가 (0 변두리 ~ 1 도심) */
  function urbanity(gx, gy) {
    /* 넓은 무늬 하나와 잔무늬 하나를 겹친다 — 하나만 쓰면 시가지가 바둑판이 된다 */
    var broad = h1(Math.floor(gx / 5) * 131 + 7, Math.floor(gy / 5) * 197 + 11);
    var fine = h1(gx * 31 + 3, gy * 57 + 5);
    return Math.min(1, broad * 0.72 + fine * 0.42);
  }

  /**
   * 격자 하나에 무엇을 세울지. 좌표만 보고 정하는 **순수 함수**다.
   * 돌려주는 것은 부품 목록 — x·z 는 격자 한가운데 기준(±GRID/2).
   *   house  기와집 (w·d·h, roof 있음)   tower 높은 집
   *   tree   나무    rock 바위   grass 풀덤불   lamp 등롱   water 수면   reed 갈대
   */
  function propPlan(kind, gx, gy, mapped) {
    var out = [], i, n;
    var u = urbanity(gx, gy);
    var dens = DENSITY();
    var half = GRID * 0.42;
    /* 이 격자를 손으로 그린 땅이 맡고 있나 (`land.js`) — 맡은 자리는
       지도에 없는 땅이라 지도가 깔려 있어도 제 지형을 세워야 한다 */
    var RG = global.DG.land;
    var authored = !!(RG && RG.owns(gx, gy));
    /* 손으로 그린 땅이 번화도를 못박아 두었으면 그것을 쓴다 — 작은 마을에
       탑이 솟지 않게 하는 것이 여기다 */
    if (authored) {
      var lu = RG.urbanity(gx, gy);
      if (lu !== null) { u = lu; }
    }
    function spot(seed) {
      return {
        x: (h1(gx * 3 + seed * 13, gy * 7 + seed * 5) * 2 - 1) * half,
        z: (h1(gx * 11 + seed * 3, gy * 17 + seed * 29) * 2 - 1) * half
      };
    }

    if (kind === 'town') {
      n = Math.round((1 + u * 7) * dens);
      for (i = 0; i < n; i++) {
        var s = spot(i);
        var hh = h1(gx * 13 + i, gy * 19 + i * 3);
        var tall = u > 0.62 && hh > 0.55;
        var w = 5 + hh * (tall ? 5 : 7);
        out.push({
          t: tall ? 'tower' : 'house',
          x: s.x, z: s.z,
          w: w, d: w * (0.8 + hh * 0.5),
          h: tall ? (12 + hh * 22) * (0.6 + u * 0.8) : 4 + hh * 4,
          rot: h1(gx + i * 7, gy - i * 5) * Math.PI,
          shade: 0.30 + hh * 0.46,
          roof: !tall
        });
      }
      /* 번화할수록 길가에 등롱이 늘어선다 — 밤 화면이 여기서 살아난다 */
      n = u > 0.45 ? 2 : 1;
      for (i = 0; i < n; i++) {
        var ls = spot(30 + i);
        out.push({ t: 'lamp', x: ls.x, z: ls.z, h: 3.2 + h1(gx + i, gy + i) * 1.2 });
      }
    } else if (kind === 'forest') {
      n = Math.round((3 + h1(gx * 7 + 5, gy * 11 + 3) * 5) * dens);
      for (i = 0; i < n; i++) {
        var fs = spot(i + 40);
        out.push({ t: 'tree', x: fs.x, z: fs.z, h: 5 + h1(gx + i * 5, gy + i * 7) * 7 });
      }
      if (h1(gx * 5, gy * 3) > 0.6) {
        var frs = spot(70);
        out.push({ t: 'rock', x: frs.x, z: frs.z, h: 1.4 + h1(gx, gy) * 1.6 });
      }
    } else if (kind === 'mount') {
      out.push({ t: 'peak', x: 0, z: 0, h: 14 + h1(gx * 3 + 1, gy * 5 + 2) * 22 });
      n = Math.round(2 * dens);
      for (i = 0; i < n; i++) {
        var ms = spot(i + 80);
        out.push({ t: 'rock', x: ms.x, z: ms.z, h: 1.8 + h1(gx + i, gy + i * 3) * 2.6 });
      }
    } else if (kind === 'water') {
      /* **지도가 깔렸으면 물은 이미 지도에 칠해져 있다.** 그 위에 원반을 또 깔면
         지도에 없는 자리에 호수가 떠서 그림이 어긋난다 — 절차적 사물이 맡을 것은
         지도에 없는 **높이**뿐이다. 갈대는 높이라서 남긴다 */
      /* 다만 **손으로 그린 땅**(`land.js`)의 강은 지도에 없는 물이다 —
         지도가 깔려 있어도 여기서 수면을 깔지 않으면 강이 아예 안 보인다 */
      if (!mapped || authored) { out.push({ t: 'water', x: 0, z: 0, h: 0, sq: authored }); }
      n = h1(gx * 9, gy * 13) > 0.5 ? 3 : 1;
      for (i = 0; i < n; i++) {
        var ws = spot(i + 90);
        out.push({ t: 'reed', x: ws.x, z: ws.z, h: 1.2 + h1(gx + i, gy) * 1.0 });
      }
    } else if (kind === 'road') {
      /* 길 — 여태 아무것도 없었다. 길가에 등롱과 나무가 서야 길로 보인다 */
      out.push({ t: 'lamp', x: -half * 0.8, z: (h1(gx, gy) * 2 - 1) * half, h: 3.4 });
      if (h1(gx * 3 + 2, gy * 5 + 1) > 0.45) {
        out.push({ t: 'lamp', x: half * 0.8, z: (h1(gy, gx) * 2 - 1) * half, h: 3.4 });
      }
      if (h1(gx * 21, gy * 11) > 0.62) {
        var rs = spot(60);
        out.push({ t: 'tree', x: rs.x, z: rs.z, h: 4 + h1(gx, gy) * 3 });
      }
    } else if (kind === 'farm') {
      /* 논밭 — 손으로 그린 땅이 들고 온 것이다. 물 댄 뙈기를 낮게 깔고 두렁으로 나눈다.
         뙈기는 **네모라서** 사람이 갈아 놓은 티가 난다 — 들의 둥근 풀덤불과 갈린다 */
      n = Math.round((2 + h1(gx * 3 + 7, gy * 5 + 11) * 2) * dens);
      for (i = 0; i < n; i++) {
        var ds = spot(i + 130);
        out.push({
          t: 'field', x: ds.x, z: ds.z,
          w: 11 + h1(gx + i, gy + i * 3) * 9,
          d: 9 + h1(gy + i, gx + i * 5) * 8,
          rot: h1(gx * 5 + i, gy * 7 + i) * 0.5 - 0.25
        });
      }
      if (h1(gx * 17 + 3, gy * 13 + 5) > 0.5) {
        var cs = spot(150);
        out.push({ t: 'scare', x: cs.x, z: cs.z, h: 2.2 });
      }
    } else {                                   // grass — 빈 들
      n = Math.round((h1(gx * 41, gy * 23) * 3) * dens);
      for (i = 0; i < n; i++) {
        var gs = spot(i + 100);
        out.push({ t: 'grass', x: gs.x, z: gs.z, h: 0.7 + h1(gx + i, gy - i) * 0.6 });
      }
      if (h1(gx * 7 + 9, gy * 3 + 4) > 0.86) {
        var grs = spot(120);
        out.push({ t: 'rock', x: grs.x, z: grs.z, h: 1.2 + h1(gx, gy) * 1.4 });
      }
    }

    /* 손으로 못박아 둔 것 — 다리·굴 입구·무너진 기둥·옛 사당. 해시가 만든 것 **위에**
       얹는다. 자리가 정해져 있으니 격자 한가운데다(찾아가는 표적이라 흔들리면 안 된다) */
    var mk = RG ? RG.markAt(gx, gy) : null;
    if (mk === 'bridge') { out.push({ t: 'bridge', x: 0, z: 0, h: 1.7 }); }
    else if (mk === 'cave') { out.push({ t: 'cave', x: 0, z: 0, h: 7 }); }
    else if (mk === 'ruin') { out.push({ t: 'ruin', x: 0, z: 0, h: 4.5 }); }
    else if (mk === 'shrine') { out.push({ t: 'shrine', x: 0, z: 0, h: 5 }); }

    return out;
  }

  /* 사물의 도형은 **단위 하나씩만** 만들어 배율로 늘린다.
     크기마다 새 도형을 만들면 격자를 지날 때마다 GPU 메모리가 늘어난다. */
  var unit = {};
  function unitGeo(name) {
    if (unit[name]) { return unit[name]; }
    var g;
    if (name === 'box') { g = new T.BoxGeometry(1, 1, 1); }
    else if (name === 'cyl') { g = new T.CylinderGeometry(0.5, 0.5, 1, 8); }
    else if (name === 'cone4') { g = new T.ConeGeometry(0.72, 1, 4); }
    else if (name === 'cone') { g = new T.ConeGeometry(0.5, 1, 7); }
    else if (name === 'sph') { g = new T.SphereGeometry(0.5, 8, 6); }
    else if (name === 'plane') { g = new T.PlaneGeometry(1, 1); }
    else if (name === 'disc') { g = new T.CircleGeometry(1, 20); }
    unit[name] = g;
    return g;
  }
  var propMat = {};
  function pmat(hex, opt) {
    var key = hex + '|' + (opt || '');
    if (propMat[key]) { return propMat[key]; }
    var m = new T.MeshLambertMaterial({ color: new T.Color(hex), flatShading: opt === 'flat' });
    if (opt === 'water') { m.transparent = true; m.opacity = 0.72; }
    if (opt === 'glow') { m.emissive = new T.Color(hex); m.emissiveIntensity = 0.9; }
    propMat[key] = m;
    return m;
  }
  function box(g, geoName, mtl, x, y, z, sx, sy, sz, cast) {
    var m = new T.Mesh(unitGeo(geoName), mtl);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    if (cast) { m.castShadow = true; }
    g.add(m);
    return m;
  }

  function buildProp(kind, gx, gy, mapped) {
    var g = new T.Group();
    var plan = propPlan(kind, gx, gy, mapped);
    var i;
    for (i = 0; i < plan.length; i++) {
      var p = plan[i];
      if (p.t === 'house' || p.t === 'tower') {
        /* 벽은 밝고 지붕은 짙다 — 한옥이 그렇고, 그래야 지붕선이 보인다.
           둘 다 어두우면 멀리서 회색 덩어리 하나로 뭉친다 */
        var sh = 0.55 + p.shade * 0.42;
        var wall = pmat(((Math.round(sh * 250) << 16) |
                         (Math.round(sh * 244) << 8) |
                          Math.round(sh * 232)));
        var body = box(g, 'box', wall, p.x, p.h / 2, p.z, p.w, p.h, p.d, true);
        body.rotation.y = p.rot;
        body.receiveShadow = true;
        if (p.roof) {
          /* 기와지붕 — 이 판의 건물을 한옥으로 보이게 하는 것은 이 사각뿔 하나다 */
          var roof = box(g, 'cone4', pmat(0x4a5360, 'flat'),
            p.x, p.h + p.w * 0.22, p.z, p.w * 1.28, p.w * 0.55, p.d * 1.28, true);
          roof.rotation.y = p.rot + Math.PI / 4;
        } else {
          box(g, 'box', pmat(0x39404c), p.x, p.h + 0.3, p.z, p.w * 0.9, 0.6, p.d * 0.9, false)
            .rotation.y = p.rot;
        }
      } else if (p.t === 'tree') {
        box(g, 'cyl', pmat(0x4a3a2a), p.x, p.h * 0.21, p.z, 1.2, p.h * 0.42, 1.2, true);
        box(g, 'cone', pmat(0x2f5a34), p.x, p.h * 0.58, p.z, p.h * 0.68, p.h * 0.72, p.h * 0.68, true);
      } else if (p.t === 'rock') {
        var rk = box(g, 'sph', pmat(0x6b6a72, 'flat'), p.x, p.h * 0.32, p.z, p.h * 1.5, p.h * 0.9, p.h * 1.3, true);
        rk.rotation.set(0.3, p.x, 0.2);
      } else if (p.t === 'grass') {
        box(g, 'cone', pmat(0x5d7a44), p.x, p.h * 0.5, p.z, p.h * 1.5, p.h, p.h * 1.5, false);
      } else if (p.t === 'peak') {
        box(g, 'cone', pmat(0x4a4752, 'flat'), p.x, p.h / 2, p.z, GRID * 0.84, p.h, GRID * 0.84, true)
          .receiveShadow = true;
      } else if (p.t === 'water') {
        /* 네모난 수면은 **격자를 그대로 드러낸다** — 한 칸만 물인 자리에 파란 사각형이
           덩그러니 놓인다. 원반으로 깔면 홀로 있으면 못이 되고 이어지면 강이 된다.
           다만 **손으로 그린 강**(p.sq)은 이야기가 다르다 — 이어지라고 그은 물이라
           원반으로 깔면 가장자리가 부채꼴로 패어 강이 아니라 물웅덩이 줄로 보인다.
           그 자리는 격자를 꽉 채우는 네모로 깐다(눈으로 보고 알았다) */
        var w = p.sq
          ? box(g, 'plane', pmat(0x2f6f9e, 'water'), 0, 0.12, 0, GRID + 0.5, GRID + 0.5, 1, false)
          : box(g, 'disc', pmat(0x2f6f9e, 'water'), 0, 0.12, 0, GRID * 0.62, GRID * 0.62, 1, false);
        w.rotation.x = -Math.PI / 2;
      } else if (p.t === 'field') {
        /* 논 한 뙈기 — 물 댄 낯을 얇게 깔고 두렁을 두른다. 지면보다 조금만 띄운다
           (많이 띄우면 논이 공중에 뜨고, 안 띄우면 지면과 다퉈 얼룩진다) */
        var fld = box(g, 'box', pmat(0x3f6b52), p.x, 0.09, p.z, p.w, 0.18, p.d, false);
        fld.rotation.y = p.rot;
        fld.receiveShadow = true;
        /* 두렁은 **테두리**다. 한 덩이로 덮으면 논이 그 밑에 깔려 흙판만 보인다
           (눈으로 보고 알았다) — 네 변만 두른다 */
        var lw = 1.1, li;
        for (li = 0; li < 4; li++) {
          var ax = li < 2 ? p.w + lw : lw, az = li < 2 ? lw : p.d + lw;
          var ox = li === 0 ? 0 : (li === 1 ? 0 : (li === 2 ? -(p.w + lw) / 2 : (p.w + lw) / 2));
          var oz = li === 0 ? -(p.d + lw) / 2 : (li === 1 ? (p.d + lw) / 2 : 0);
          var lv = box(g, 'box', pmat(0x7a6f57), 0, 0.20, 0, ax, 0.22, az, false);
          lv.position.set(p.x + Math.cos(p.rot) * ox - Math.sin(p.rot) * oz, 0.20,
                          p.z + Math.sin(p.rot) * ox + Math.cos(p.rot) * oz);
          lv.rotation.y = p.rot;
        }
      } else if (p.t === 'scare') {
        /* 허수아비 — 장대 하나에 가로대와 삿갓. 논에 사람이 산다는 표다 */
        box(g, 'cyl', pmat(0x6b5a3f), p.x, p.h * 0.5, p.z, 0.16, p.h, 0.16, true);
        box(g, 'box', pmat(0x6b5a3f), p.x, p.h * 0.78, p.z, 1.6, 0.13, 0.13, false);
        box(g, 'cone', pmat(0xa8925f, 'flat'), p.x, p.h + 0.16, p.z, 1.1, 0.5, 1.1, false);
      } else if (p.t === 'bridge') {
        /* 다리 — 강을 **가로질러** 놓는다. 길이 남북이라 상판도 남북으로 길다.
           난간이 없으면 멀리서 물 위의 널빤지로만 보인다 */
        box(g, 'box', pmat(0x7a6a52), 0, p.h, 0, 7, 0.5, GRID * 1.02, true).receiveShadow = true;
        var bi;
        for (bi = -1; bi <= 1; bi += 2) {
          box(g, 'box', pmat(0x8a7a60), bi * 3.3, p.h + 0.75, 0, 0.35, 1.0, GRID * 1.02, false);
        }
        for (bi = -1; bi <= 1; bi += 2) {          // 물속 교각
          box(g, 'cyl', pmat(0x5d5347), 0, p.h * 0.5, bi * GRID * 0.28, 1.5, p.h * 2, 1.5, false);
        }
      } else if (p.t === 'cave') {
        /* 굴 입구 — 바위 더미에 **검은 반원**을 박는다. 산 사면에 뚫린 구멍으로 보인다 */
        box(g, 'sph', pmat(0x5a5560, 'flat'), 0, p.h * 0.34, 0, p.h * 2.4, p.h * 1.5, p.h * 2.0, true);
        var mouth = box(g, 'disc', pmat(0x0d1014), 0, p.h * 0.34, p.h * 0.98, 2.6, 3.4, 1, false);
        mouth.rotation.set(0, 0, 0);
        box(g, 'box', pmat(0x6b6a72, 'flat'), -3.1, p.h * 0.25, p.h * 0.9, 0.9, p.h * 0.5, 0.9, false);
        box(g, 'box', pmat(0x6b6a72, 'flat'), 3.1, p.h * 0.25, p.h * 0.9, 0.9, p.h * 0.5, 0.9, false);
      } else if (p.t === 'ruin') {
        /* 폐허 — 주춧돌 위에 **부러진 기둥 넷**. 높이를 서로 다르게 해야 폐허로 보인다
           (같으면 짓다 만 집이다) */
        box(g, 'box', pmat(0x5f5a52, 'flat'), 0, 0.2, 0, 13, 0.4, 13, false).receiveShadow = true;
        var rp = [[-4.4, -4.4, 1.0], [4.4, -4.4, 0.55], [-4.4, 4.4, 0.75], [4.4, 4.4, 0.3]], ri;
        for (ri = 0; ri < rp.length; ri++) {
          box(g, 'cyl', pmat(0x8a8378, 'flat'),
            rp[ri][0], 0.4 + p.h * rp[ri][2] * 0.5, rp[ri][1], 1.1, p.h * rp[ri][2], 1.1, true);
        }
        box(g, 'box', pmat(0x7c766c, 'flat'), 1.2, 0.7, 0, 6, 0.7, 1.2, false).rotation.y = 0.4;
      } else if (p.t === 'shrine') {
        /* 옛 사당 — 작은 기와집 하나에 돌계단과 등롱 둘. 숲 속에서 이것만 사람 손이다 */
        box(g, 'box', pmat(0x6a6258, 'flat'), 0, 0.3, 0, 9, 0.6, 9, false).receiveShadow = true;
        box(g, 'box', pmat(0xb9a88c), 0, p.h * 0.42, 0, 5.4, p.h * 0.66, 5.0, true);
        box(g, 'cone4', pmat(0x4a5360, 'flat'), 0, p.h * 0.86, 0, 8.2, p.h * 0.42, 8.2, true)
          .rotation.y = Math.PI / 4;
        var si;
        for (si = -1; si <= 1; si += 2) {
          box(g, 'cyl', pmat(0x3f3a34), si * 3.4, 1.3, 4.6, 0.2, 2.6, 0.2, false);
          var sb = box(g, 'sph', pmat(0xffd489, 'glow'), si * 3.4, 2.8, 4.6, 0.7, 0.9, 0.7, false);
          sb.userData.lamp = true;
          sb.visible = !!(lightNow && lightNow.lamp > 0.2);
        }
      } else if (p.t === 'reed') {
        box(g, 'cone', pmat(0x6d7f4a), p.x, p.h * 0.5, p.z, 0.5, p.h, 0.5, false);
      } else if (p.t === 'lamp') {
        box(g, 'cyl', pmat(0x3f3a34), p.x, p.h * 0.5, p.z, 0.24, p.h, 0.24, false);
        /* 등롱의 불은 **밤에만** 켠다 — 낮에 켜 두면 흰 점으로만 보인다 */
        var bulb = box(g, 'sph', pmat(0xffd489, 'glow'), p.x, p.h + 0.25, p.z, 0.8, 1.0, 0.8, false);
        bulb.userData.lamp = true;
        /* 지금이 밤인지 여기서 곧바로 정한다 — 나중에 걸어 들어온 격자는
           `syncLamps` 가 이미 훑고 지나간 뒤라 낮에도 켜진 채 남는다 */
        bulb.visible = !!(lightNow && lightNow.lamp > 0.2);
      }
    }
    return g;
  }

  function syncProps(W) {
    var pos = core.save.player.pos;
    var R = PROP_R();
    var g0x = Math.floor((pos.x - R) / GRID), g1x = Math.floor((pos.x + R) / GRID);
    var g0y = Math.floor((pos.y - R) / GRID), g1y = Math.floor((pos.y + R) / GRID);
    var live = {};
    /* 지도가 깔렸는지 — 깔린 자리와 안 깔린 자리(오프라인·타일 실패)에서
       세우는 것이 다르다. 캐시 키에도 넣어야 상태가 바뀔 때 다시 세운다 */
    var mapped = !!(W.tilesUsable && W.tilesUsable());
    var RG3 = global.DG.land;
    for (var gy = g0y; gy <= g1y; gy++) {
      for (var gx = g0x; gx <= g1x; gx++) {
        var kind = W.terrainAt(gx, gy);
        /* 손으로 그린 땅이 못박아 둔 것은 **찾아가는 표적**이다 — 멀다고 빼면
           폐허가 코앞에서야 솟는다. 표식이 있는 격자는 잔 사물 규칙에서 뺀다 */
        var mk = RG3 ? RG3.markAt(gx, gy) : null;
        /* 풀·길의 잔 사물은 가까울 때만 세운다 — 반경 전체에 깔면 격자 백 개가
           한꺼번에 늘어나고, 멀리서는 어차피 한 픽셀이다 */
        var far = Math.hypot((gx + 0.5) * GRID - pos.x, (gy + 0.5) * GRID - pos.y) > R * 0.5;
        if (far && !mk && (kind === 'grass' || kind === 'road')) { continue; }
        /* 이 땅을 켜고 끄면 같은 격자가 다른 땅이 된다 — 캐시 키에 넣어야 다시 세운다 */
        var key = kind + ':' + gx + ':' + gy + ':' + (mapped ? 'm' : 'n') + (mk ? ':' + mk : '');
        live[key] = 1;
        if (propMeshes[key]) { continue; }
        var node = buildProp(kind, gx, gy, mapped);
        node.position.set(gx * GRID + GRID / 2, 0, gy * GRID + GRID / 2);
        propGroup.add(node);
        propMeshes[key] = node;
      }
    }
    for (var k in propMeshes) {
      if (!Object.prototype.hasOwnProperty.call(propMeshes, k) || live[k]) { continue; }
      /* 도형·재질은 **모두가 나눠 쓰는 것**이라 여기서 dispose 하지 않는다.
         하나를 버리면 남아 있는 다른 건물의 도형까지 같이 사라진다 */
      propGroup.remove(propMeshes[k]);
      delete propMeshes[k];
    }
  }

  /** 등롱은 밤에만 켠다 (낮에는 재질을 갈지 않고 눈에 안 띄게 꺼 둔다) */
  function syncLamps() {
    var on = lightNow ? lightNow.lamp > 0.2 : false;
    if (syncLamps.was === on) { return; }
    syncLamps.was = on;
    propGroup.traverse(function (o) {
      if (o.userData && o.userData.lamp) { o.visible = on; }
    });
  }

  /* ── 배우 (사람 · 짐승 · 건물) ───────────────────────────
   * `actor3d.js` 가 도형으로 조립한 입체를 세운다. 조립이 안 되면(three 가 없거나
   * 손잡이를 껐으면) 1단계의 빌보드로 돌아간다 — 그림은 `sprite.js` 것을 그대로 쓴다.
   */
  function spriteTexture(kind, ref, px) {
    var key = kind + '/' + (ref.id || ref.key || ref.name) + '/' + px + '/' +
      global.DG.sprite.style() + '/' + global.DG.sprite.prop() + '/flat';
    if (texCache[key]) { return texCache[key]; }
    /* 네 번째 인자가 **종이 바탕 없이** 굽게 한다 — 3D 에서는 배경이 사각형으로 남는다 */
    var url = global.DG.sprite.portrait(kind, ref, px, true);
    var img = new Image();
    var tex = new T.Texture(img);
    tex.colorSpace = T.SRGBColorSpace;
    img.onload = function () { tex.needsUpdate = true; };
    img.src = url;
    texCache[key] = tex;
    return tex;
  }

  var shadowGeo = null, shadowMat = null;
  function groundShadow() {
    if (!shadowGeo) {
      shadowGeo = new T.CircleGeometry(1, 18);
      shadowMat = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false });
    }
    var m = new T.Mesh(shadowGeo, shadowMat);
    m.rotation.x = -Math.PI / 2;
    return m;
  }

  /** 배우 하나 — 있으면 쓰고 없으면 만든다 */
  function actorOf(key, kind, ref, px) {
    var a = actors[key];
    if (a) { a.seen = frame; return a; }
    var A = global.DG.actor3d;
    var node = null, mesh = false;
    if (MESH_ON() && A && A.ready()) {
      node = A.build(kind === 'building' ? (ref.key === 'wall' ? 'fort' : 'station') : kind, ref);
      mesh = !!node;
    }
    if (!node) {
      var mat = new T.SpriteMaterial({ map: spriteTexture(kind, ref, px), transparent: true });
      node = new T.Sprite(mat);
    }
    var sh = groundShadow();
    actorGroup.add(node); actorGroup.add(sh);
    a = actors[key] = {
      node: node, shadow: sh, seen: frame, mesh: mesh, kind: kind,
      /* 처음에는 카메라를 등지고 선다(북쪽). 마주 보고 서 있으면 지도 위의 내가
         나를 쳐다보는 꼴이 된다 — 원작은 늘 아바타의 뒤통수를 본다 */
      ang: Math.PI, lx: null, ly: null, vanish: 0
    };
    return a;
  }

  /**
   * 배우를 자리에 놓는다.
   *   h     키(m)
   *   bob   위아래 흔들림(빌보드용 — 메시는 자기 다리로 걷는다)
   *   walk  걷는 중인가
   */
  /**
   * 멀리 있는 배우는 **원근 그대로 두면 점**이다. 이 판의 야생 대상은 70~320m 밖에
   * 서므로(원작은 코앞에 나온다) 줌을 빼도 안 보인다. 거리에 따라 조금씩 키워
   * 지도 위의 표식처럼 남게 한다 — 크기는 화면 값이라 판정에 안 닿는다.
   */
  function farBoost(x, y) {
    if (!camPos) { return 1; }
    var d = Math.hypot(x - camPos.x, y - camPos.z);
    if (d < FAR_NEAR) { return 1; }
    /* 지수가 1 이면 **화면에서 같은 크기**로 유지된다(원근을 완전히 무른다).
       0.85 는 거의 유지하되 멀수록 아주 조금 작아 보이게 남긴 값이다 —
       완전히 무르면 3D 공간의 깊이가 사라진다 */
    return Math.min(FAR_MAX, Math.pow(d / FAR_NEAR, 0.85));
  }

  function placeActor(a, x, y, h, bob, walk, phase, now) {
    if (a.mesh) {
      a.node.scale.set(h, h, h);
      a.node.position.set(x, 0, y);
      /* 방향 — 지난 프레임과의 차이로 정한다. 판정에는 방향이 없으니
         (world.js 는 좌표만 준다) 화면 층에서 만들어 쓴다 */
      if (a.lx !== null) {
        var dx = x - a.lx, dz = y - a.ly;
        if (dx * dx + dz * dz > 0.0004) {
          var want = Math.atan2(dx, dz);
          var diff = want - a.ang;
          while (diff > Math.PI) { diff -= Math.PI * 2; }
          while (diff < -Math.PI) { diff += Math.PI * 2; }
          a.ang += diff * 0.22;                 // 홱 돌지 않고 미끄러지듯 돈다
        }
      }
      a.lx = x; a.ly = y;
      a.node.rotation.y = a.ang;
      global.DG.actor3d.step(a.node, { t: now / 1000, walking: walk, phase: phase });
    } else {
      a.node.scale.set(h, h, 1);
      a.node.position.set(x, h / 2 + (bob || 0), y);
    }
    a.shadow.position.set(x, 0.06, y);
    a.shadow.scale.setScalar(h * 0.30);
  }

  /** 사라지는 배우 — 잡혔거나 달아났다. 빛으로 흩어지며 지워진다 */
  function sweepActors(dt) {
    for (var k in actors) {
      if (!Object.prototype.hasOwnProperty.call(actors, k)) { continue; }
      var a = actors[k];
      if (a.seen === frame) { continue; }
      /* 무대에 선 상대는 판정에서 이미 사라졌더라도(잡혔다·달아났다) 무대가 닫힐
         때까지 그 자리에 세워 둔다 — 던진 것이 날아가는 중에 상대가 먼저 없어지면
         허공에 사료를 던지는 그림이 된다 */
      if (stageAt && k === 'sp' + stageAt.uid) { a.seen = frame; continue; }
      /* 곧바로 지우면 잡은 순간 상대가 **점멸하듯** 없어진다. 원작은 잡히는 순간을
         보여 준다 — 여기서는 떠오르며 작아지는 0.7초를 둔다 */
      a.vanish += dt;
      var t = Math.min(1, a.vanish / 0.7);
      a.node.position.y += dt * 2.4;
      a.node.scale.multiplyScalar(1 - dt * 1.1);
      a.shadow.scale.multiplyScalar(1 - dt * 2.2);
      if (t >= 1) {
        actorGroup.remove(a.node);
        actorGroup.remove(a.shadow);
        delete actors[k];
      }
    }
  }

  function syncActors(W, now) {
    var pos = core.save.player.pos;

    /* 나 — 동행 선두가 지도 위 내 모습이다(2D 화면과 같은 규칙) */
    var lead = core.save.party && core.save.party[0];
    var me = lead ? global.DG.data.find(lead) : null;
    var meRef = me || { id: '_me', name: '나', faction: '조선', rarity: 3, trait: 'virtue' };
    var meA = actorOf('me', 'hero', meRef, 96);
    var mot = W.motion;
    var h = ACTOR_H();
    var walking = mot.speed > 1.5;
    var walkBob = walking
      ? Math.abs(Math.sin(mot.phase)) * h * 0.045
      : Math.sin(now / 700) * h * 0.016;
    /* 나에게도 같은 보정을 준다 — 안 그러면 크게 당겼을 때 **나만 점**이 되고
       야생 대상이 나보다 크게 보인다 */
    placeActor(meA, pos.x, pos.y, h * farBoost(pos.x, pos.y), walkBob, walking, mot.phase, now);

    /* 야생 대상 */
    var sp = W.spawns, i;
    for (i = 0; i < sp.length; i++) {
      var s = sp[i];
      var kind = s.kind === 'hero' ? 'hero' : 'pet';
      var a = actorOf('sp' + s.uid, kind, s.ref, 96);
      var bob = s.moving
        ? Math.abs(Math.sin(s.phase)) * h * 0.04
        : Math.sin(now / 620 + s.uid) * h * 0.02;
      var onStage = stageAt && stageAt.uid === s.uid;
      var boost = onStage ? 1 : farBoost(s.x, s.y);
      placeActor(a, s.x, s.y, h * (kind === 'hero' ? 1 : 0.86) * boost,
        onStage ? 0 : bob, onStage ? false : !!s.moving, s.phase || 0, now);
      if (onStage) {
        /* 무대 소품(조준 고리)이 상대의 크기에 맞게 서도록 키를 적어 둔다 —
           물뿜이와 여포에 같은 크기의 고리를 씌우면 하나는 묻히고 하나는 넘친다 */
        stageAt.h = h * (kind === 'hero' ? 1 : 0.86);
        /* **자리도 따라간다.** 조우 중에도 판정 층의 배회는 그대로 돌아서(world.js),
           열 때의 좌표에 카메라를 붙박아 두면 상대가 걸어 나가고 빈 땅만 남는다 */
        stageAt.x = s.x;
        stageAt.y = s.y;
      }
      if (onStage && a.mesh) {
        /* 무대에 선 상대는 **나를 본다.** 등을 돌린 채 설득당하거나 잡히면
           누구를 만나는지가 화면에서 사라진다 */
        var ax = camera.position.x - s.x, az = camera.position.z - s.y;
        a.node.rotation.y = Math.atan2(ax, az);
        a.ang = a.node.rotation.y;
        a.node.position.y = stageAt.lift || 0;
        /* 무대 위의 물러섬·다가섬은 **뒤로 가는 것**이지 뜨는 것이 아니다.
           위로만 띄웠더니 놓친 상대가 공중에 뜬 것처럼 보였다.
           그림자도 같이 옮긴다 — 안 옮기면 발과 그림자가 따로 논다 */
        if (stageAt.back) {
          var bl = Math.max(0.5, Math.hypot(ax, az));
          var ox = -ax / bl * stageAt.back, oz = -az / bl * stageAt.back;
          a.node.position.x = s.x + ox;
          a.node.position.z = s.y + oz;
          a.shadow.position.x = s.x + ox;
          a.shadow.position.z = s.y + oz;
        }
      }
    }

    /* 역참 · 성채 */
    var sts = W.stationsNear ? W.stationsNear() : [];
    for (i = 0; i < sts.length; i++) {
      var st = sts[i];
      /* sprite.building 의 form 이름을 그대로 쓴다 — 빌보드로 돌아갔을 때
         2D 화면과 같은 그림이어야 한다 */
      var sa = actorOf('st' + st.key, 'building',
        { key: 'stable', id: 'st_' + st.key, color: '#e8c15a' }, 128);
      placeActor(sa, st.x, st.y, h * 1.7 * farBoost(st.x, st.y), 0, false, 0, now);
    }
    var fts = W.fortsNear ? W.fortsNear() : [];
    for (i = 0; i < fts.length; i++) {
      var ft = fts[i];
      var fa = actorOf('ft' + ft.key, 'building',
        { key: 'wall', id: 'ft_' + ft.key, color: (ft.color || '#8a5cc0') }, 128);
      placeActor(fa, ft.x, ft.y, h * 2.4 * farBoost(ft.x, ft.y), 0, false, 0, now);
    }
  }

  /* ── 조우 연출 ────────────────────────────────────────────
   * 원작에서 대상을 누르면 화면이 그쪽으로 넘어간다. 여기서는 조우 창이 HTML 이라
   * 3D 는 **뒤에서 카메라를 돌려** 그 순간을 만든다. 잡히면 빛기둥이 선다.
   * 창이 열렸는지는 DOM 을 보고 안다 — `encounter.js` 를 고치지 않으려는 것이다.
   */
  var focusAt = null;      // {x, y} 조우 중인 대상
  var stageAt = null;      // {x, y, uid} 조우 무대 — 대상 앞에 카메라를 세운다
  var beams = [];          // 빛기둥

  function bindEvents() {
    core.on('encounter:request', function (spawn) {
      if (spawn) { focusAt = { x: spawn.x, y: spawn.y }; }
    });
    core.on('station:request', function (st) {
      if (st) { focusAt = { x: st.x, y: st.y }; }
    });
    core.on('fort:request', function (ft) {
      if (ft) { focusAt = { x: ft.x, y: ft.y }; }
    });
    /* 도감에 새 줄이 생겼다 = 잡았다. 마지막으로 보던 자리에 빛기둥을 세운다 */
    core.on('dex:new', function () {
      /* 승화(growth.js)도 같은 이벤트를 낸다 — 조우 창이 열려 있을 때만 세운다.
         안 그러면 도감 화면에서 승화시켰는데 지도 한복판에 빛기둥이 선다 */
      var f = focusLive();
      if (f) { beam(f.x, f.y); }
    });
  }

  /** 조우 창이 아직 열려 있는가 — 닫혔으면 카메라를 놓아 준다.
      역참·성채·교전도 **같은 `#encounter` 한 칸**을 쓴다(station.js·fort.js·duel.js). */
  function focusLive() {
    if (!focusAt) { return null; }
    var el = document.getElementById('encounter');
    if (el && el.classList.contains('show')) { return focusAt; }
    focusAt = null;
    return null;
  }

  function beam(x, y) {
    if (!available()) { return; }
    var geo = unitGeo('cyl');
    var m = new T.Mesh(geo, new T.MeshBasicMaterial({
      color: 0xffe6a8, transparent: true, opacity: 0.85, depthWrite: false
    }));
    m.position.set(x, 6, y);
    m.scale.set(2.6, 12, 2.6);
    fxGroup.add(m);
    beams.push({ mesh: m, t: 0 });
  }

  function syncBeams(dt) {
    var i;
    for (i = beams.length - 1; i >= 0; i--) {
      var b = beams[i];
      b.t += dt;
      var k = b.t / 0.9;
      b.mesh.scale.x = b.mesh.scale.z = 2.6 + k * 5;
      b.mesh.material.opacity = Math.max(0, 0.85 * (1 - k));
      if (k >= 1) {
        fxGroup.remove(b.mesh);
        b.mesh.material.dispose();      // 이 재질은 이 기둥만 쓴다
        beams.splice(i, 1);
      }
    }
  }

  /* ── 카메라 · 빛 ──────────────────────────────────────────
   * 시점 버튼(2D → 2.5D → 3D)이 **각도**를 정한다. 원작의 3D 는 카메라가 낮게
   * 깔려 건물 옆면이 보이는 각이라, 3D 모드에서 가장 눕는다.
   */
  var camPos = null, camLook = null;

  /**
   * 카메라가 어디서 무엇을 볼지 — 순수 계산이라 진단이 따로 굴려 본다.
   *
   * 거리는 **사람이 화면에서 차지하는 몫**으로 정했다. 원작에서 아바타는 화면 높이의
   * 1/8쯤이다 — 그보다 크면 인형놀이가 되고 작으면 누군지 안 보인다. 키 3.4m 를
   * 화각 52°로 담으려면 27m 쯤 물러나야 한다(처음엔 16m 라 얼굴이 화면을 채웠다).
   *   2D    거의 머리 위에서 (예전 탑다운과 같은 그림)
   *   2.5D  비스듬히 내려다본다
   *   3D    낮게 깔려 건물 옆면이 보인다 — 원작의 그 각
   */
  var CAM_HIGH_MUL = [2.27, 1.33, 0.80];    // 카메라 높이 배수
  var CAM_BACK_MUL = [0.05, 0.40, 0.60];    // 뒤로 물러나는 거리 배수
  var CAM_AHEAD = [0, 3, 5];                // 시선을 앞으로 던지는 거리(m)

  /** 조우 무대 — 대상 앞 몇 미터에 서서 눈높이로 본다 (원작의 포획 화면).
      거리는 **상대 키에 비례**한다: 사람과 물뿜이를 같은 자리에서 보면
      하나는 얼굴이 화면을 채우고 하나는 발치에 놓인다 */
  function STAGE_DIST() { return core.tuned('world3d.stageDist', 10.5); }

  function camAim(pos, mode, focus, stage, zoom) {
    var z = (zoom === undefined || !isFinite(zoom) || zoom <= 0) ? 1 : zoom;
    if (stage) {
      /* 나와 대상을 잇는 선 위에서, **대상 쪽에서 나를 향해** 물러선 자리다.
         무대에서는 시점 모드를 안 본다 — 조우는 어느 시점에서 열었든 같은 그림이어야 한다 */
      var sx = pos.x - stage.x, sy = pos.y - stage.y;
      var slen = Math.max(0.5, Math.hypot(sx, sy));
      var sh = stage.h || 3.2;
      var D = STAGE_DIST() * (sh / 3.2);
      return {
        pos: { x: stage.x + sx / slen * D, y: sh * 0.95, z: stage.y + sy / slen * D },
        /* 무릎께를 본다 — 상대가 화면 위쪽에 서고 아래는 조우 카드 자리가 된다 */
        look: { x: stage.x, y: sh * 0.45, z: stage.y }
      };
    }
    /* 멀리 물러날수록 **더 내려다본다** — 거리와 높이를 같은 비율로 늘리면
       지평선만 잔뜩 보이고 발밑이 안 보인다 */
    var back = CAM_DIST() * CAM_BACK_MUL[mode] * z;
    var high = CAM_HIGH() * CAM_HIGH_MUL[mode] * Math.pow(z, 1.12);
    if (focus) {
      /* 나와 대상 사이를 본다. 카메라는 **내 뒤 옆쪽**에 서서 둘을 한 화면에 담는다 */
      var dx = focus.x - pos.x, dy = focus.y - pos.y;
      var len = Math.max(1, Math.hypot(dx, dy));
      var ux = dx / len, uy = dy / len;
      /* 멀리 있는 대상이면 더 물러나되 **상한을 둔다** — 조우는 코앞에서만 열리지만
         (ENCOUNTER_RANGE) 데모처럼 먼 대상을 걸면 카메라가 200m 밖으로 날아간다 */
      var span = Math.min(back * 2.2, Math.max(back, len * 0.9));
      return {
        pos: { x: pos.x - ux * span * 0.7 - uy * span * 0.45,
               y: high * 0.72,
               z: pos.y - uy * span * 0.7 + ux * span * 0.45 },
        look: { x: (pos.x + focus.x) / 2, y: 2.0, z: (pos.y + focus.y) / 2 }
      };
    }
    return {
      pos: { x: pos.x, y: high, z: pos.y + back },
      look: { x: pos.x, y: mode === 0 ? 0.5 : 2.4, z: pos.y - CAM_AHEAD[mode] }
    };
  }

  function syncCamera(W, dt) {
    var pos = core.save.player.pos;
    /* 조우 무대에서는 줌을 무시한다 — 무대는 늘 같은 그림이어야 한다 */
    var aim = camAim(pos, W.tiltMode, focusLive(), stageAt, stageAt ? 1 : W.zoom3d);
    var want = new T.Vector3(aim.pos.x, aim.pos.y, aim.pos.z);
    var look = new T.Vector3(aim.look.x, aim.look.y, aim.look.z);
    if (!camPos) { camPos = want.clone(); camLook = look.clone(); }
    /* 카메라는 곧바로 붙지 않고 따라온다 — 원작의 그 미끄러지는 느낌이다 */
    var k = Math.min(1, dt * 6.5);
    camPos.lerp(want, k);
    camLook.lerp(look, k);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }

  /* 크게 당기면 절두체에 사물이 다 들어와 그림자 맵이 감당하지 못한다.
     그 높이에서는 그림자가 몇 픽셀도 안 되니 **끄는 편이 낫다.**
     경계에서 한 번만 갈아 끼운다 — 프레임마다 바꾸면 셰이더를 다시 컴파일한다 */
  var shadowOn = true;
  function syncShadow(zoom) {
    var want = zoom < 4 && !(global.DG_3D_DEBUG || {}).noShadow;
    if (want === shadowOn) { return; }
    shadowOn = want;
    renderer.shadowMap.enabled = want;
    scene.traverse(function (o) {
      if (o.isMesh && o.material) { o.material.needsUpdate = true; }
    });
  }

  function syncLight(dt) {
    var L = lightingAt(forcedMs === null ? undefined : forcedMs, weatherKey());
    lightNow = L;
    var pos = core.save.player.pos;
    /* 해는 늘 플레이어 곁을 따라다닌다 — 그림자 상자를 좁게 유지하려고.
       높이·방위만 시각이 정한다 */
    sun.position.set(pos.x + L.sun.x, L.sun.y, pos.y + L.sun.z);
    sun.target.position.set(pos.x, 0, pos.y);
    sun.target.updateMatrixWorld();
    sun.color.setHex(L.sun.hex);
    sun.intensity = L.sun.intensity;
    sky.color.setHex(L.hemi.sky);
    sky.groundColor.setHex(L.hemi.ground);
    sky.intensity = L.hemi.intensity;
    lantern.position.set(pos.x, 4.2, pos.y);
    lantern.intensity = L.lamp * 2.6;
    if (scene.background && scene.background.setHex) { scene.background.setHex(L.bg); }
    renderer.setClearColor(L.bg, 1);
    if (scene.fog) {
      scene.fog.color.setHex(L.bg);
      scene.fog.near = L.fog.near;
      scene.fog.far = L.fog.far;
    }
  }

  /* ── 그린다 ───────────────────────────────────────────── */

  var last = 0;

  function render() {
    if (!active()) { return false; }
    var W = global.DG.world;
    var now = performance.now();
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
    last = now;
    frame++;

    syncLight(dt);
    syncShadow(W.zoom3d || 1);
    syncGround(W);
    syncProps(W);
    syncLamps();
    syncActors(W, now);
    sweepActors(dt);
    if (global.DG.encounter3d) { global.DG.encounter3d.tick(dt); }
    syncBeams(dt);
    syncCamera(W, dt);

    renderer.render(scene, camera);
    return true;
  }

  global.DG = global.DG || {};
  global.DG.world3d = {
    init: init, resize: resize, render: render,
    available: available, active: active, wanted: wanted,
    /* 값을 내는 함수 — three 없이도 돈다(자가진단이 이것만 따로 본다) */
    lightingAt: lightingAt, propPlan: propPlan, urbanity: urbanity, camAim: camAim,
    /** 지금 쓰는 시야각(도) — 진단·데모가 세로 화면 보정을 값으로 본다 */
    fov: function () { return camera ? camera.fov : FOV(); },
    forceTime: forceTime,
    /* 조우 무대 — `encounter3d.js` 가 켜고 끈다. 여기 있는 것은 **카메라와 자리**뿐이고
       링·사료·빛 같은 소품은 그쪽이 만들어 `addFx` 로 얹는다 */
    stage: function (o) {
      stageAt = o ? { x: o.x, y: o.y, uid: o.uid, lift: 0, back: 0 } : null;
      return stageAt;
    },
    stageAt: function () { return stageAt; },
    three: function () { return T; },
    addFx: function (n) { if (fxGroup && n) { fxGroup.add(n); } return n; },
    removeFx: function (n) { if (fxGroup && n) { fxGroup.remove(n); } },
    camNode: function () { return camera; },
    lum: lum, GRID: GRID,
    /** 지금 조명 (데모·어드민이 들여다본다) */
    light: function () { return lightNow || lightingAt(undefined, weatherKey()); },
    /** 조우 연출을 밖에서 걸어 볼 때 (데모가 쓴다) */
    focus: function (o) { focusAt = o ? { x: o.x, y: o.y } : null; return focusAt; },
    beam: beam,
    /* 눈으로 확인할 때 쓰는 값 */
    /** 지면 타일이 어떤 상태인지 — 색·텍스처·위치를 그대로 뽑는다 */
    tileProbe: function () {
      var ks = Object.keys(tileMeshes);
      if (!ks.length) { return 'none'; }
      var out = [], i;
      for (i = 0; i < Math.min(3, ks.length); i++) {
        var m = tileMeshes[ks[i]];
        out.push(ks[i] + ':col=' + m.material.color.getHexString() +
          ' map=' + (m.material.map ? (m.material.map.image && m.material.map.image.width ? 'img' + m.material.map.image.width : 'empty') : 'no') +
          ' at=' + Math.round(m.position.x) + ',' + Math.round(m.position.z));
      }
      var lights = [];
      scene.traverse(function (o) { if (o.isLight) { lights.push(o.type + ':' + o.intensity.toFixed(2)); } });
      out.push('lights=' + lights.join('/'));
      return out.join(' | ');
    },
    /** 화면 몇 군데의 색을 직접 읽는다 — "검게 나온다" 를 눈이 아니라 값으로 본다 */
    probe: function () {
      if (!available()) { return 'n/a'; }
      var gl = renderer.getContext();
      var w = canvas.width, h = canvas.height;
      function at(px, py) {
        var b = new Uint8Array(4);
        gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, b);
        return b[0] + ',' + b[1] + ',' + b[2];
      }
      /* WebGL 은 왼쪽 **아래**가 원점이다 */
      var read = 'top=' + at(w >> 1, h - 8) + ' mid=' + at(w >> 1, h >> 1) +
        ' bot=' + at(w >> 1, 8) + ' size=' + w + 'x' + h;
      /* 버퍼 읽기 경로가 멀쩡한지 — 마젠타로 지우고 곧바로 읽어 본다 */
      gl.clearColor(1, 0, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      read += ' clearTest=' + at(w >> 1, h >> 1);
      /* 카메라가 무엇을 보고 있는지 */
      read += ' near/far=' + camera.near + '/' + camera.far +
        ' look=' + (camLook ? [camLook.x, camLook.y, camLook.z].map(Math.round).join(',') : '-') +
        ' children=' + scene.children.length;
      return read;
    },
    stats: function () {
      var meshes = 0, a;
      for (a in actors) {
        if (Object.prototype.hasOwnProperty.call(actors, a) && actors[a].mesh) { meshes++; }
      }
      var drawn = 0;
      if (scene) { scene.traverse(function (o) { if (o.isMesh || o.isSprite) { drawn++; } }); }
      var L = lightNow;
      return {
        tiles: Object.keys(tileMeshes).length,
        props: Object.keys(propMeshes).length,
        actors: Object.keys(actors).length,
        meshActors: meshes,
        drawn: drawn,
        frames: frame,
        light: L ? (L.phase + ' ' + L.weather + ' 해' + L.sun.intensity.toFixed(2)) : '-',
        zoom: '×' + (global.DG.world.zoom3d || 1).toFixed(1),
        focus: focusAt ? (Math.round(focusAt.x) + ',' + Math.round(focusAt.y)) : '-',
        stage: stageAt ? (Math.round(stageAt.x) + ',' + Math.round(stageAt.y) +
          ' h' + (stageAt.h || 0).toFixed(1)) : '-',
        enc: (function () {
          var e = global.DG.encounter3d, st = e && e.state();
          return st ? (st.kind + '/' + st.phase + '/t' + st.t + '/사료' + st.pellet) : '-';
        })(),
        size: canvas ? (canvas.width + 'x' + canvas.height) : '-',
        cam: camera ? ([camera.position.x, camera.position.y, camera.position.z]
          .map(function (v) { return Math.round(v); }).join(',')) : '-',
        failed: failed, ready: ready, wanted: wanted()
      };
    }
  };
})(window);
