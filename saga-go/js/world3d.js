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
  var sun = null, sky = null;
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
  /** 버거우면 스스로 깎는 배수 (`perf.js`) — 없으면 1 이라 예전과 같다 */
  function PF(key) { var P = global.DG.perf; return P ? P.mul(key) : 1; }
  function PROP_R() { return core.tuned('world3d.propRadius', 260) * PF('radius'); }
  function CAM_DIST() { return core.tuned('world3d.camDist', 40); }       // 카메라 거리(m)
  function CAM_HIGH() { return core.tuned('world3d.camHeight', 15); }     // 카메라 높이(m)
  /** 사람 키(m) — 원작처럼 지도 위에서는 실제보다 크게 세운다(1.8m 면 안 보인다) */
  function ACTOR_H() { return core.tuned('world3d.actorH', 3.4); }
  /** 지도 스타일 — 1 은 밝은 지도(voyager). 원작의 파스텔 지도에 가깝다 */
  function MAP_STYLE() { return core.tuned('world3d.mapStyle', 1); }
  /** 배우를 도형으로 세울까 — 0 이면 1단계의 빌보드로 돌아간다 */
  function MESH_ON() {
    var P = global.DG.perf;
    if (P && !P.meshOk()) { return false; }      // 가장 버거울 때는 빌보드로 돌아간다
    return core.tuned('world3d.mesh', 1) ? true : false;
  }
  /** 건물 밀도 배수 — 기기가 버거우면 여기를 내린다 */
  function DENSITY() { return core.tuned('world3d.density', 1) * PF('prop'); }
  /** 시각을 따라 해가 뜨고 질까 — 0 이면 늘 한낮.
   * 기본을 끄기로 했다(2026-08-30) — 밤을 다섯 번 밝혀도(색·세기·깊은밤 감쇠
   * 다 낮 수준까지 밀었다) 사용자가 실기기에서 계속 어둡다고 했고, 결국
   * "밤을 낮으로 바꿔 달라"고 했다. 그래서 아예 밤 자체를 없앤다 — 손잡이는
   * 그대로 있으니 `world3d.dayNight` 를 1 로 올리면 밤낮이 다시 돈다 */
  function DAYNIGHT() { return core.tuned('world3d.dayNight', 0) ? true : false; }
  /** 비·눈에 강물이 불까 — 0 이면 늘 마른 날의 그림이다 */
  function WET() { return core.tuned('world3d.wetRiver', 1) ? true : false; }
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

  /* 다섯 번째 손질(2026-08-30) — 네 번째 손질(세기 대신 색을 밝힘)도 실기기에서
     "아직 어둡다"였다. 사용자가 "요즘 시대엔 조명이 밝다"고 확인 — 밤을
     어둡게 연출하는 무드 자체를 포기하고, **낮에 최대한 가깝게** 밝힌다.
     이 색표만으론 부족해 `lightingAt` 의 세기 최저치(1.4→1.7·1.2→1.4)와
     깊은 밤 추가 감쇠(0.82/0.85/0.42/0.30→0.90/0.90/0.36/0.18)도 같이 올렸다.
     `_test.html` 대비 문턱(한낮/깊은밤 하늘 2배, 밤 지도물감 0.7배)은 여전히
     넉넉히 통과한다(2.36배 · 0.61배) — 남은 차이는 색조(푸른 달빛 톤)뿐이다 */
  var C_NIGHT = { sun: 0xd0dcf5, sky: 0x5a719f, hemiSky: 0x6e8ab5, hemiGnd: 0x565f70, tint: 0x939cb6 };
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
        : (alt > -0.14 ? 'twilight'
          /* **깊은 밤** — `PLAN.md` 20절이 콕 집은 02:00 Deep Night 이다.
             자정부터 네 시까지, 밤 중에서도 가장 어두운 때. 23시는 그대로 `night`
             이라 이 갈래를 더해도 여태 값이 안 흔들린다 */
          : ((hour < 4) ? 'deepnight' : 'night')));

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
        /* 밤 최저치 — 0.28→0.65→1.0→1.4 를 거쳐 1.7 까지 올렸다(2026-08-30,
           다섯 번째 손질). 세기·색 다 올려도 실기기에서 "아직 어둡다"는 게
           계속 나와, 사용자가 "요즘 시대엔 조명이 밝다" — 즉 무드보다 **밝게
           보이는 것 자체**를 원한다고 확인했다. 낮과의 차이는 이제 색조(푸른
           달빛 톤)만 남기고 세기 차이는 최소로 줄였다 */
        intensity: 1.7 + Math.max(0, alt) * 0.23,
        /* 해는 동(-x)에서 떠 서(+x)로 진다. 밤에는 달이 반대쪽에 뜬 셈 친다 */
        x: -Math.cos((hour - 6) / 12 * Math.PI) * 120,
        y: 40 + Math.abs(alt) * 110,
        z: -70 - Math.max(0, alt) * 40
      },
      /* 밤 최저치 — 위 sun 과 같은 이유·같은 다섯 번의 손질(0.52→0.85→1.2→1.4) */
      hemi: { sky: pick('hemiSky'), ground: pick('hemiGnd'), intensity: 1.4 + k * 0.27 },
      bg: pick('sky'),
      tint: pick('tint'),
      fog: { near: 90 + k * 170, far: 320 + k * 440 },
      /* 밤에는 배우 발밑에 등불이 켜진다 (원작의 밤 화면에서 아바타가 안 묻히게) */
      lamp: alt < 0.06 ? Math.min(1, (0.06 - alt) * 4) : 0
    };

    /* 깊은 밤은 한 겹 더 어둡다. 대신 **등롱은 더 밝다** — 다 같이 어두워지면
       그냥 안 보이는 화면이 되고, 밤이 깊었다는 것이 안 읽힌다.
       (2026-08-30, 다섯 번째 손질로 이 겹도 옅게 줄였다 — 0.82/0.85/0.42/0.30
       → 0.90/0.90/0.36/0.18. `_test.html` 의 "한낮이 한밤(자정=깊은 밤)보다
       밝다" 문턱(하늘 밝기 비 2배)은 여전히 넉넉히 넘는다) */
    if (phase === 'deepnight') {
      out.sun.intensity *= 0.90;
      out.hemi.intensity *= 0.90;
      out.bg = mixHex(out.bg, 0x05070c, 0.36);
      out.tint = mixHex(out.tint, 0x2a3040, 0.18);
      out.lamp = 1;
    }

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
    /* 배우를 따라다니며 머리 위에 뜨던 등롱 불빛은 뺐다(2026-08-29) — 사용자가
       실기기에서 허공에 뜬 빛 덩이로 보인다고 지적했다. 밤 자체가 이제
       충분히 밝아(위 lightingAt 의 최저치) 따로 안 켜도 배우가 묻히지 않는다 */

    /* 후처리 — 톤매핑·블룸·색보정 (`post3d.js`, 그래픽 보강 16~18절).
       **렌더러를 만든 직후 켜야 한다** — 여기서 `toneMapping` 을 한 번 켜 두면
       뒤에 만드는 재질이 모두 그 상태로 컴파일된다. 늦게 켜면 씬 전체가
       한 번 다시 컴파일되며 화면이 멎는다 */
    if (global.DG.post3d) { global.DG.post3d.init(T, renderer); }

    groundGroup = new T.Group(); scene.add(groundGroup);
    propGroup = new T.Group(); scene.add(propGroup);
    actorGroup = new T.Group(); scene.add(actorGroup);
    fxGroup = new T.Group(); scene.add(fxGroup);

    bindEvents();
    /* 소품 모델(나무·바위·풀)을 미리 받아 둔다 — 안 받아 두면 처음 몇 초 동안
       원뿔 나무가 서 있다가 툭 바뀐다 (`prop3d.js`) */
    if (global.DG.prop3d) { global.DG.prop3d.preload(); }
    preloadLandTex();
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
    if (global.DG.post3d) { global.DG.post3d.resize(); }
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

  /* ── 손으로 그린 땅을 지면에 칠한다 ─────────────────
   * 여태 이 땅(`land.js`)은 **사물로만** 드러났다 — 판교 지도 위에 하북 마을의
   * 기와집이 서 있는 꼴이었다. 지면 그림 자체를 맞춘다.
   *
   * 지도 타일을 캔버스에 그대로 굽고, 그 위에 **48m 격자마다 제 색을 덧칠**한다.
   * 지도가 안 왔으면 색만 칠한다 — 오프라인에서도 이 땅은 이 땅으로 보인다.
   *
   * **가장자리는 흐린다.** 딱 잘리면 종이를 오려 붙인 것으로 보인다 —
   * 이웃 넷 중 몇이 이 땅인지 세어 그만큼만 진하게 칠한다.
   */
  var LAND_COLOR = {
    grass: '#8fae6a', forest: '#5c7f4e', mount: '#9a9188',
    water: '#4a7fa6', road: '#c9bfa8', town: '#c2b49a', farm: '#7f9c5e'
  };
  /** 덧칠을 할까 — 0 이면 예전처럼 실제 지도만 깔린다 */
  function LAND_PAINT() { return core.tuned('world3d.landPaint', 1) ? true : false; }
  /** 얼마나 진하게 — 1 이면 지도가 아예 안 비친다 */
  function PAINT_A() { return core.tuned('world3d.landPaintAlpha', 0.88); }

  /* ── 땅의 소재 텍스처 (2026-08-30, PLAN 부록 "코드로 그리지 말고 에셋으로") ──
   * 여태 `LAND_COLOR` 로 **색만** 칠했다. ambientCG(CC0) 1K BaseColor 를 종류마다
   * 하나씩 받아 캔버스 패턴으로 반복해 깐다 — `water` 는 뺐다(실제 물결은
   * `water3d.js` 가 따로 그리므로 이 칠은 거의 안 보인다).
   * 아직 못 받았으면(로딩 중·파일 없음) 늘 하던 `shadeHex` 채색으로 물러난다 —
   * 화면이 한 번도 안 빈다(이 저장소의 다른 에셋들과 같은 원칙). */
  var LAND_TEX_URL = {
    grass: 'assets/textures/land/grass.jpg',
    forest: 'assets/textures/land/forest.jpg',
    mount: 'assets/textures/land/mount.jpg',
    road: 'assets/textures/land/road.jpg',
    town: 'assets/textures/land/town.jpg',
    farm: 'assets/textures/land/farm.jpg'
  };
  var LAND_TEX_IMG = {};
  function landTexImg(kind) {
    if (LAND_TEX_IMG[kind]) { return LAND_TEX_IMG[kind]; }
    var img = new Image();
    var url = LAND_TEX_URL[kind];
    if (url) { img.onload = function () { img.ready = true; }; img.src = url; }
    LAND_TEX_IMG[kind] = img;
    return img;
  }
  /** 텍스처 한 변이 세계에서 몇 m 를 덮나 — 작을수록 촘촘히(확대돼) 반복된다 */
  var LAND_TEX_METERS = 12;
  /**
   * 이 소재의 반복 무늬 — 세계 좌표(`x0·y0`, m)에 맞춰 위상을 맞춘다.
   * **타일마다 캔버스가 새로 생기므로**, 반복 시작점을 캔버스 원점이 아니라
   * 세계 좌표의 나머지로 잡아야 옆 타일과 이어 붙었을 때 이음매가 안 보인다.
   */
  function landPattern(c, kind, x0, y0, k) {
    var img = landTexImg(kind);
    if (!img.ready || !img.naturalWidth || !c.createPattern) { return null; }
    var pat = c.createPattern(img, 'repeat');
    if (!pat || !pat.setTransform || typeof DOMMatrix === 'undefined') { return pat; }
    var side = LAND_TEX_METERS * k;
    var tx = -(((x0 % LAND_TEX_METERS) + LAND_TEX_METERS) % LAND_TEX_METERS) * k;
    var ty = -(((y0 % LAND_TEX_METERS) + LAND_TEX_METERS) % LAND_TEX_METERS) * k;
    pat.setTransform(new DOMMatrix([side / img.naturalWidth, 0, 0, side / img.naturalHeight, tx, ty]));
    return pat;
  }

  /** 어느 소재가 왔는지 — 지형 텍스처 캐시 키에 넣어, 늦게 온 것도 다음에 반영되게 한다 */
  function landTexReadyKey() {
    var s = '', k;
    for (k in LAND_TEX_URL) {
      if (LAND_TEX_URL.hasOwnProperty(k)) { s += (LAND_TEX_IMG[k] && LAND_TEX_IMG[k].ready) ? '1' : '0'; }
    }
    return s;
  }
  /** 받아 두기만 한다 — 처음 걸을 때 한 박자씩 바뀌지 않게(`prop3d.preload` 와 같은 자리) */
  function preloadLandTex() {
    var k;
    for (k in LAND_TEX_URL) { if (LAND_TEX_URL.hasOwnProperty(k)) { landTexImg(k); } }
  }

  var landTex = {};

  /** '#rrggbb' 를 조금 밝게·어둡게 (k 는 -1~1) */
  function shadeHex(hex, k) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, bb = n & 255;
    function f(v) { return Math.max(0, Math.min(255, Math.round(v * (1 + k)))); }
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(bb) + ')';
  }

  /**
   * 이 타일이 이 땅과 겹치나 — 겹치면 덧칠한 텍스처를, 아니면 null.
   * `x0·y0` 는 타일 왼쪽 위 모서리의 월드 좌표(m), `span` 은 한 변(m).
   */
  function landTexture(key, x0, y0, span, img) {
    var L = global.DG.land;
    if (!LAND_PAINT() || !L || !L.on()) { return null; }
    var g0x = Math.floor(x0 / GRID), g1x = Math.floor((x0 + span) / GRID);
    var g0y = Math.floor(y0 / GRID), g1y = Math.floor((y0 + span) / GRID);
    var gx, gy, any = false;
    for (gy = g0y; gy <= g1y && !any; gy++) {
      for (gx = g0x; gx <= g1x && !any; gx++) { if (L.owns(gx, gy)) { any = true; } }
    }
    if (!any) { return null; }

    /* 계절도 키에 넣는다 — 안 넣으면 계절이 바뀌어도 지난 계절 색이 남는다.
       텍스처가 늦게 도착할 수도 있으니 **어느 것이 왔는지도 키에 넣는다** —
       안 넣으면 도착 후에도 옛(색만 칠한) 캔버스가 캐시에 계속 나온다 */
    var SSk = global.DG.season;
    var ck = key + '|' + (img && img.ready ? 'i' : 'n') + '|' + landTexReadyKey() +
      '|' + Math.round(PAINT_A() * 100) + '|' + (SSk ? SSk.now().key : '-');
    if (landTex[ck]) { return landTex[ck]; }

    var S = 256;
    var cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    var c = cv.getContext('2d');
    if (img && img.ready) { c.drawImage(img, 0, 0, S, S); }
    else { c.fillStyle = '#d7dbe0'; c.fillRect(0, 0, S, S); }

    var k = S / span;                    // 미터 → 캔버스 픽셀
    var a0 = PAINT_A();
    for (gy = g0y; gy <= g1y; gy++) {
      for (gx = g0x; gx <= g1x; gx++) {
        var at = L.at(gx, gy);
        if (!at) { continue; }
        /* 가장자리 흐리기 — 이웃 넷 중 이 땅인 것의 몫만큼만 진하게.
           **차이를 크게 두면 안 된다**: 칸마다 알파가 다르면 그 경계가 실선으로
           드러난다(눈으로 보고 알았다). 안쪽은 거의 같은 진하기로 두고
           바깥 한 줄만 살짝 옅게 한다 */
        var near = 0;
        if (L.owns(gx + 1, gy)) { near++; }
        if (L.owns(gx - 1, gy)) { near++; }
        if (L.owns(gx, gy + 1)) { near++; }
        if (L.owns(gx, gy - 1)) { near++; }
        c.globalAlpha = a0 * (near === 4 ? 1 : (0.62 + 0.09 * near));
        var SSc = global.DG.season;
        var baseCol = LAND_COLOR[at.kind] || LAND_COLOR.grass;
        if (SSc) { baseCol = SSc.landColor(at.kind, baseCol); }
        var rx = Math.round((gx * GRID - x0) * k);
        var ry = Math.round((gy * GRID - y0) * k);
        var rw = Math.round((gx * GRID + GRID - x0) * k) - rx;
        var rh = Math.round((gy * GRID + GRID - y0) * k) - ry;
        var pat = landPattern(c, at.kind, gx * GRID, gy * GRID, k);
        if (pat) {
          /* 실제 텍스처가 왔다 — 무늬를 깐다. 칸마다 밝기를 흔들던 옛 방식은
             안 쓴다(사진이 이미 자연스러운 결을 갖고 있다 — 흔들면 오히려
             사진 위에 격자가 도드라진다) */
          c.fillStyle = pat;
          c.fillRect(rx, ry, rw, rh);
          /* 계절 빛깔은 그 위에 **옅게 곱하기**로 얹는다 — 사진을 지우지 않고
             물들이기만 한다(겨울 들판이 누렇게 뜨는 정도) */
          var seasonAlpha = c.globalAlpha;
          c.globalAlpha = seasonAlpha * 0.30;
          c.globalCompositeOperation = 'multiply';
          c.fillStyle = baseCol;
          c.fillRect(rx, ry, rw, rh);
          c.globalCompositeOperation = 'source-over';
          c.globalAlpha = seasonAlpha;
        } else {
          /* 아직 못 받았다 — 옛 방식(색만 칠하기)으로 물러난다. 칸마다 밝기를
             아주 조금 흔든다 — 안 흔들면 마을이 흙빛 한 판이 된다. 폭을
             **아주 좁게** 둔다 — 0.16 으로 흔들었더니 들판이 바둑판이 됐다
             (눈으로 보고 알았다). 있는 줄 모를 만큼만 흔드는 것이 맞다 */
          c.fillStyle = shadeHex(baseCol, (h1(gx * 17 + 5, gy * 23 + 9) - 0.5) * 0.06);
          /* **겹쳐 칠하지 않는다** — 알파가 있는 색을 두 번 얹으면 그 줄만 짙어진다.
             칸 경계는 픽셀로 딱 맞춰 자른다 */
          c.fillRect(rx, ry, rw, rh);
        }
      }
    }
    c.globalAlpha = 1;

    var tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    landTex[ck] = tex;
    return tex;
  }

  /* ── 땅의 높낮이 (PLAN 14절) ─────────────────────────
   * 값은 `relief3d.js` 가 낸다(순수 함수). 여기 있는 것은 **그 값을 화면에
   * 바르는 일**뿐이다 — 지면 정점을 밀고, 배우를 앉히고, 카메라를 띄운다.
   * `world.js` 의 좌표·거리·스폰은 여전히 평면 2D 라 **균형이 안 움직인다.**
   */
  function RELIEF() { return global.DG.relief3d || null; }
  function RELIEF_ON() { var R = RELIEF(); return !!(R && R.on()); }
  /** 타일 한 장을 몇 칸으로 나누나 — 클수록 곱지만 정점이 제곱으로 는다 */
  function RELIEF_SEG() { return Math.max(1, Math.round(core.tuned('relief3d.seg', 8))); }

  /** 그 자리의 땅 높이(m). 높낮이가 꺼져 있으면 0 — 부르는 쪽은 몰라도 된다 */
  function groundY(x, z) {
    var R = RELIEF();
    return R ? R.heightAt(x, z) : 0;
  }

  /**
   * 타일 한 장의 정점을 실제 높이로 민다.
   *
   * **눕히기 전 좌표계라 y 가 아니라 z 를 민다.** 이 메시는 `rotation.x = -90°`
   * 로 눕혀 놓았으므로, 로컬의 +z 가 월드의 +y 다. 여기서 y 를 밀면 땅이
   * 옆으로 밀린다(한 번 밟았다).
   *
   * 같은 자리에 다시 깔릴 때는 **건너뛴다** — 타일은 격자를 넘을 때마다 재활용되는데
   * 매번 정점 수백 개를 다시 재면 걸을 때마다 화면이 걸린다.
   */
  function liftTile(mesh, x0, z0, span) {
    if (!RELIEF_ON()) { return false; }
    var mark = Math.round(x0) + '/' + Math.round(z0) + '/' + Math.round(span);
    if (mesh.userData.lifted === mark) { return false; }
    var pos = mesh.geometry.getAttribute('position');
    if (!pos) { return false; }
    var i;
    for (i = 0; i < pos.count; i++) {
      /* 로컬 x·y → 월드 x·z (눕히기 전이므로 로컬 y 가 월드 z 의 **반대**다) */
      var lx = pos.getX(i), ly = pos.getY(i);
      var wx = x0 + span / 2 + lx;
      var wz = z0 + span / 2 - ly;
      pos.setZ(i, groundY(wx, wz));
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.userData.lifted = mark;
    return true;
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
        var corner = worldOfLatLng(tile2lat(ty, W), tile2lng(tx, W));
        if (!mesh) {
          /* **한 장을 잘게 나눈다.** 여태 네 꼭짓점뿐이라 아무리 높이를 줘도
             땅이 기울 뿐 굽지 않았다. 241m 타일을 `RELIEF_SEG` 칸으로 나누면
             한 칸이 30m 남짓 — 지형 격자(48m)보다 촘촘해 경사가 살아난다 */
          var seg = RELIEF_ON() ? RELIEF_SEG() : 1;
          var geo = new T.PlaneGeometry(span, span, seg, seg);
          var mat = new T.MeshLambertMaterial({ color: 0x1a1f28 });
          mesh = new T.Mesh(geo, mat);
          mesh.rotation.x = -Math.PI / 2;           // 눕힌다
          mesh.receiveShadow = true;
          groundGroup.add(mesh);
          tileMeshes[key] = mesh;
          mesh.userData.lifted = '';
        }
        /* 타일의 왼쪽 위 모서리를 월드 미터로 환산해 한가운데에 놓는다 */
        mesh.position.set(corner.x + span / 2, -0.02, corner.y + span / 2);
        liftTile(mesh, corner.x, corner.y, span);

        var img = W.getTile(tx, ty, W.ZOOM, MAP_STYLE());
        /* 이 땅과 겹치는 타일은 **제 색으로 덧칠한 것**을 쓴다 */
        var tex = landTexture(key, corner.x, corner.y, span, img) || tileTexture(img);
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
    /* 젖은 날인가 — 비·눈이면 물이 분다. 화면에만 쓰는 값이다 */
    var wk0 = weatherKey();
    var wet = WET() && (wk0 === 'rain' || wk0 === 'snow');
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
      /* 우물·장터 — 마을에 하나씩만 서야 랜드마크로 보인다(집처럼 흔하면
         눈에 안 띈다). 번화한 칸일수록 드물게 세운다 */
      if (u > 0.35 && h1(gx * 23 + 5, gy * 29 + 7) > 0.86) {
        var wsp = spot(200);
        out.push({ t: 'well', x: wsp.x, z: wsp.z, h: 1.25 });
      }
      if (u > 0.5 && h1(gx * 31 + 9, gy * 37 + 3) > 0.90) {
        var msp = spot(210);
        out.push({ t: 'market', x: msp.x, z: msp.z, h: 1.3,
                   rot: h1(gx * 3 + 1, gy * 5 + 2) * Math.PI * 2 });
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
      /* **비가 오면 강물이 분다**(PLAN 21절 "강물 수위 변화") — 수면이 올라오고
         조금 넓어진다. 화면에만 쓰는 값이라 건너는 판정은 한 줄도 안 바뀐다 */
      if (!mapped || authored) {
        out.push({ t: 'water', x: 0, z: 0, h: 0, sq: authored, rise: wet ? 1 : 0 });
      }
      /* 물이 불면 갈대가 잠긴다 — 물만 올리고 갈대를 그대로 두면 물 위에 떠 있다 */
      n = h1(gx * 9, gy * 13) > 0.5 ? 3 : 1;
      if (wet) { n = Math.max(0, n - 2); }
      for (i = 0; i < n; i++) {
        var ws = spot(i + 90);
        out.push({ t: 'reed', x: ws.x, z: ws.z,
                   h: (1.2 + h1(gx + i, gy) * 1.0) * (wet ? 0.7 : 1) });
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
        var fw = 11 + h1(gx + i, gy + i * 3) * 9;
        var fd = 9 + h1(gy + i, gx + i * 5) * 8;
        out.push({ t: 'field', x: ds.x, z: ds.z, w: fw, d: fd,
                   rot: h1(gx * 5 + i, gy * 7 + i) * 0.5 - 0.25 });
        /* **벼를 심는다.** 뙈기 안에 골고루 — 가운데로 몰면 논이 빈 채로 보인다.
           못 받으면 벼만 안 서고 논은 그대로다(되돌림이 저절로 된다) */
        var rn = Math.round(5 * dens), rj;
        for (rj = 0; rj < rn; rj++) {
          var ra = h1(gx * 7 + rj * 5 + i, gy * 11 + rj * 3 + i * 2);
          var rb = h1(gx * 13 + rj * 3 + i * 7, gy * 5 + rj * 11 + i);
          out.push({ t: 'rice',
                     x: ds.x + (ra * 2 - 1) * fw * 0.36,
                     z: ds.z + (rb * 2 - 1) * fd * 0.36,
                     h: 1.4 + ra * 0.7 });
        }
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
    if (mk === 'bridge') {
      /* 다리 — 받아 온 모델은 **한 칸짜리**라 강(격자 48m)을 못 건넌다.
         남북으로 이어 놓는다(길이 남북이므로 상판도 남북이다).
         **첫 칸만 `seg` 가 없다** — 모델을 못 받았을 때 도형 다리가 일곱 겹
         겹쳐 서지 않도록, 도형은 그 한 칸만 옛 모습(48m 상판)으로 그린다 */
      /* **키가 곧 이음매다.** 이 모델은 키 1 로 눕히면 깊이가 0.76 이라,
         칸 간격(`GRID/bn`)과 같아지려면 키를 그만큼 잡아야 한다 —
         짧게 잡았더니 아치 사이가 벌어져 사다리처럼 보였다(눈으로 보고 고쳤다) */
      var bn = 7, bj, bh = (GRID / bn) / 0.76;
      for (bj = 0; bj < bn; bj++) {
        out.push({ t: 'bridge', x: 0, z: (bj - (bn - 1) / 2) * (GRID / bn),
                   h: bh, seg: bj });
      }
    }
    else if (mk === 'cave') { out.push({ t: 'cave', x: 0, z: 0, h: 7 }); }
    else if (mk === 'ruin') { out.push({ t: 'ruin', x: 0, z: 0, h: 4.5 }); }
    else if (mk === 'shrine') { out.push({ t: 'shrine', x: 0, z: 0, h: 5 }); }

    return out;
  }

  /**
   * 이 칸에 선 집·높은 집의 충돌 사각형 — `world.js` 의 벽 충돌이 쓴다(PLAN 27절).
   *
   * **판정에 화면 값을 들이는 유일한 자리다.** 이 저장소는 여태 "화면은 판정에
   * 안 닿는다"를 지켜 왔지만(땅의 높낮이·손으로 그린 강 등), 벽 충돌만은 **눈에
   * 보이는 그 집과 어긋나면 의미가 없다** — 사용자가 직접 고른 값이다(2026-08-29).
   * `propPlan` 은 순수 함수이므로 여기서도 **같은 좌표·같은 크기**가 나온다.
   */
  function houseRects(gx, gy) {
    var plan = propPlan('town', gx, gy, false);
    var ox = gx * GRID + GRID / 2, oz = gy * GRID + GRID / 2;
    var out = [], i;
    for (i = 0; i < plan.length; i++) {
      var p = plan[i];
      if (p.t === 'house' || p.t === 'tower') {
        out.push({ x: ox + p.x, z: oz + p.z, w: p.w, d: p.d, rot: p.rot });
      }
    }
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
    /* 수면은 **깊이를 안 적는다** — 적으면 물속에 있는 것(잉어)을 통째로 가린다.
       반투명이라 비쳐 보여야 맞는데, 깊이 버퍼가 먼저 잘라내 아무것도 안 남았다 */
    if (opt === 'water') {
      /* 물결치는 수면이 있으면 그것을 쓴다(`water3d.js`). 없거나 등급이 LOW 면
         null 이 와서 **여태 쓰던 판 한 장**으로 간다 — 그림만 어제로 돌아간다 */
      var wm = global.DG.water3d ? global.DG.water3d.material(T, hex) : null;
      if (wm) { propMat[key] = wm; return wm; }
      m.transparent = true; m.opacity = 0.72; m.depthWrite = false;
    }
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

  /* ── 인스턴싱 (PLAN 16절) ───────────────────────────────
   * 잔 사물은 **같은 도형에 같은 색**이다 — 나무 백 그루가 저마다 자기 Mesh 를
   * 들고 있을 까닭이 없다. 종류마다 `InstancedMesh` 한 덩이를 두고 **자리(slot)만
   * 빌려 준다.** 격자가 사라지면 자리를 돌려받는다.
   *
   * **집·탑·다리는 안 묶는다.** 크기와 색이 제각각이라 한 덩이로 못 모으고,
   * 수도 적어 이득이 없다. 16절이 지목한 것도 "나무·돌·풀·꽃" 이다.
   *
   * 잎 색은 계절이 바꾸므로 **색이 이름의 일부**다 — 가을이 되면 새 덩이가 하나
   * 생기고 옛 덩이는 빈 채로 남는다(넷뿐이라 그냥 둔다).
   */
  function INST_ON() { return core.tuned('world3d.instanced', 1) ? true : false; }
  function INST_CAP() { return core.tuned('world3d.instCap', 1600); }
  /* GLB 조각은 도형이 무거워 창고를 작게 잡는다 — 모양이 여럿이라 나눠 쓴다 */
  function GLB_CAP() { return core.tuned('world3d.glbCap', 260); }

  var instKinds = {};      // 이름 → {mesh, free:[], n}
  var instOf = {};         // 격자 키 → [{name, slot}]
  var ZERO = null;         // 안 쓰는 자리를 숨기는 행렬 (크기 0)

  function instBox(name, geoName, hex, opt, cast) {
    return instMake(name, unitGeo(geoName), pmat(hex, opt), cast);
  }

  /** 도형과 재질을 받아 덩이 하나를 만든다 (도형은 `unitGeo` 든 GLB 조각이든 같다) */
  function instMake(name, geo, mtl, cast, cap) {
    if (instKinds[name]) { return instKinds[name]; }
    cap = cap || INST_CAP();
    var m = new T.InstancedMesh(geo, mtl, cap);
    m.instanceMatrix.setUsage(T.DynamicDrawUsage);
    m.castShadow = !!cast;
    m.receiveShadow = false;
    m.frustumCulled = false;          // 자리가 온 세상에 흩어져 있어 상자로 못 자른다
    if (!ZERO) { ZERO = new T.Matrix4().makeScale(0, 0, 0); }
    var free = [], i;
    for (i = cap - 1; i >= 0; i--) { m.setMatrixAt(i, ZERO); free.push(i); }
    m.instanceMatrix.needsUpdate = true;
    /* **쓴 만큼만 그린다.** 안 그러면 빈 자리 1600 개까지 매 프레임 그린다 —
       도형이 원뿔·공이던 때는 그래도 견뎠는데, 진짜 나무(삼각형 2900)를 넣자
       한 덩이가 460만 삼각형이 되어 화면이 통째로 멎었다. 실제로 밟았다.
       자리는 0 부터 차례로 나가므로 **가장 높이 쓴 자리 + 1** 이면 충분하다 */
    m.count = 0;
    propGroup.add(m);
    instKinds[name] = { mesh: m, free: free, n: 0, hi: 0 };
    return instKinds[name];
  }

  var _p = null, _q = null, _s = null, _m4 = null;
  /** 자리 하나를 빌린다 — 창고가 다 차면 false 를 주고, 부르는 쪽이 옛 길로 간다 */
  function instPut(key, name, geoName, hex, opt, cast, x, y, z, sx, sy, sz, rx, ry, rz) {
    return instAt(instBox(name, geoName, hex, opt, cast), key, name,
                  x, y, z, sx, sy, sz, rx, ry, rz);
  }

  /** 덩이 하나에 자리를 하나 적는다 */
  function instAt(K, key, name, x, y, z, sx, sy, sz, rx, ry, rz) {
    if (!K.free.length) { return false; }
    var slot = K.free.pop();
    if (!_p) { _p = new T.Vector3(); _q = new T.Quaternion(); _s = new T.Vector3(); _m4 = new T.Matrix4(); }
    _p.set(x, y, z);
    _q.setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0));
    _s.set(sx, sy, sz);
    _m4.compose(_p, _q, _s);
    K.mesh.setMatrixAt(slot, _m4);
    K.mesh.instanceMatrix.needsUpdate = true;
    if (slot + 1 > K.hi) { K.hi = slot + 1; K.mesh.count = K.hi; }
    K.n++;
    if (!instOf[key]) { instOf[key] = []; }
    instOf[key].push({ name: name, slot: slot });
    return true;
  }

  /** 이 격자가 빌린 자리를 다 돌려받는다 */
  function instDrop(key) {
    var list = instOf[key];
    if (!list) { return 0; }
    for (var i = 0; i < list.length; i++) {
      var K = instKinds[list[i].name];
      if (!K) { continue; }
      K.mesh.setMatrixAt(list[i].slot, ZERO);
      K.mesh.instanceMatrix.needsUpdate = true;
      K.free.push(list[i].slot);
      K.n--;
    }
    delete instOf[key];
    return list.length;
  }

  /** 지금 몇 덩이에 몇 자리가 차 있나 — 진단·데모가 값으로 본다 */
  function instStats() {
    var out = { on: INST_ON(), cap: INST_CAP(), kinds: 0, used: 0, by: {} };
    for (var k in instKinds) {
      if (!Object.prototype.hasOwnProperty.call(instKinds, k)) { continue; }
      out.kinds++; out.used += instKinds[k].n; out.by[k] = instKinds[k].n;
    }
    return out;
  }

  /**
   * 잔 사물을 인스턴스로 세운다 — 세웠으면 true.
   * 좌표는 **월드 미터**다(격자 Group 안이 아니라 세상에 바로 놓기 때문).
   */
  /**
   * **GLB 소품** 하나를 세운다 (`prop3d.js`).
   * 나무 한 그루는 줄기와 잎이 다른 재질이라 조각이 둘이다 — 조각마다 덩이를
   * 하나씩 두고 **같은 행렬을 다 적는다.** 화면에서는 한 그루로 보인다.
   *
   * 아직 안 왔으면 false 를 주고, 부르는 쪽이 여태 쓰던 도형으로 간다.
   */
  function instGlb(key, want, x, z, h, gx, gy, rot) {
    var P3 = global.DG.prop3d;
    if (!P3) { return false; }
    var got = P3.parts(want, gx, gy);
    if (!got || !got.parts.length) { return false; }
    /* 자리마다 조금씩 돌려 세운다 — 안 돌리면 나무 백 그루가 같은 쪽을 본다.
       집은 제 회전을 이미 갖고 있으므로(길을 보고 선다) 그것을 그대로 쓴다 */
    var ry = typeof rot === 'number' ? rot : h1(gx * 41 + 7, gy * 83 + 13) * Math.PI * 2;
    var hh = h * P3.heightMul(want);
    var i, ok = true;
    for (i = 0; i < got.parts.length; i++) {
      var K = instMake(got.url + '#' + i, got.parts[i].geometry,
                        got.parts[i].material, P3.casts(want), GLB_CAP());
      ok = instAt(K, key, got.url + '#' + i, x, groundY(x, z), z, hh, hh, hh, 0, ry, 0) && ok;
    }
    return ok;
  }

  function instProp(key, p, ox, oz) {
    if (!INST_ON()) { return false; }
    var x = ox + p.x, z = oz + p.z;
    /* **진짜 모델이 와 있으면 그것으로 세운다** (새 PLAN STEP 4).
       격자 좌표를 같이 넘겨 같은 자리에는 늘 같은 모양이 서게 한다 */
    var gx = Math.round((ox - GRID / 2) / GRID), gy = Math.round((oz - GRID / 2) / GRID);
    /* 왼쪽이 이 판의 소품 이름, 오른쪽이 `prop3d` 표의 이름이다.
       손으로 그린 땅의 일곱(산·등롱·사당·굴·폐허·다리·벼)도 여기서 갈린다 */
    var GLB = { tree: 'tree', rock: 'rock', grass: 'grass', reed: 'grass',
                house: 'house', tower: 'tower',
                peak: 'peak', lamp: 'lamp', shrine: 'shrine', cave: 'cave',
                ruin: 'ruin', bridge: 'bridge', rice: 'rice',
                well: 'well', market: 'market' };
    if (GLB[p.t] && instGlb(key, GLB[p.t], x, z, p.h, gx + Math.round(p.x),
                            gy + Math.round(p.z), p.rot)) {
      return true;
    }
    if (p.t === 'tree') {
      var SS = global.DG.season;
      var leafHex = SS ? SS.leaf(0x2f5a34) : 0x2f5a34;
      var a = instPut(key, 'trunk', 'cyl', 0x4a3a2a, '', true,
        x, p.h * 0.21, z, 1.2, p.h * 0.42, 1.2);
      var bb = instPut(key, 'leaf:' + leafHex, 'cone', leafHex, '', true,
        x, p.h * 0.58, z, p.h * 0.68, p.h * 0.72, p.h * 0.68);
      return a && bb;
    }
    if (p.t === 'rock') {
      return instPut(key, 'rock', 'sph', 0x6b6a72, 'flat', true,
        x, p.h * 0.32, z, p.h * 1.5, p.h * 0.9, p.h * 1.3, 0.3, p.x, 0.2);
    }
    if (p.t === 'grass') {
      return instPut(key, 'grass', 'cone', 0x5d7a44, '', false,
        x, p.h * 0.5, z, p.h * 1.5, p.h, p.h * 1.5);
    }
    if (p.t === 'reed') {
      return instPut(key, 'reed', 'cone', 0x6d7f4a, '', false,
        x, p.h * 0.5, z, 0.5, p.h, 0.5);
    }
    return false;
  }

  /**
   * 등불 한 알. **밤에만 보인다** — 낮에 켜 두면 흰 점으로만 남는다.
   * 지금이 밤인지 여기서 곧바로 정한다: 나중에 걸어 들어온 격자는
   * `syncLamps` 가 이미 훑고 지나간 뒤라 낮에도 켜진 채 남는다.
   */
  function addLampBulb(g, x, y, z, r) {
    var b = box(g, 'sph', pmat(0xffd489, 'glow'), x, y, z, r, r * 1.25, r, false);
    b.userData.lamp = true;
    b.visible = !!(lightNow && lightNow.lamp > 0.2);
    return b;
  }

  function buildProp(kind, gx, gy, mapped, key) {
    var g = new T.Group();
    var plan = propPlan(kind, gx, gy, mapped);
    var ox = gx * GRID + GRID / 2, oz = gy * GRID + GRID / 2;
    var i;
    for (i = 0; i < plan.length; i++) {
      var p = plan[i];
      /* 잔 사물은 인스턴스 덩이가 받는다. 창고가 다 차면 false 가 와서
         아래의 옛 길(제 Mesh 를 만드는 길)로 그대로 흘러간다 */
      var inst = key && instProp(key, p, ox, oz);
      if (inst) {
        /* **불만은 인스턴스가 못 맡는다.** 등롱과 사당의 등은 밤에만 켜지는데
           (`syncLamps` 가 `userData.lamp` 를 훑는다) 인스턴스 덩이는 낱개를
           켜고 끌 수가 없다. 몸은 모델이 세웠으니 **불만 여기서 얹는다** */
        if (p.t === 'lamp') { addLampBulb(g, p.x, p.h + 0.25, p.z, 0.8); }
        else if (p.t === 'shrine') {
          addLampBulb(g, -3.4, 2.8, 4.6, 0.7);
          addLampBulb(g, 3.4, 2.8, 4.6, 0.7);
        }
        continue;
      }
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
        /* 잎 색은 **계절이 정한다**(`season.js`) — 계절이 꺼져 있으면 예전 초록 */
        var SS = global.DG.season;
        var leafHex = SS ? SS.leaf(0x2f5a34) : 0x2f5a34;
        box(g, 'cyl', pmat(0x4a3a2a), p.x, p.h * 0.21, p.z, 1.2, p.h * 0.42, 1.2, true);
        box(g, 'cone', pmat(leafHex), p.x, p.h * 0.58, p.z, p.h * 0.68, p.h * 0.72, p.h * 0.68, true);
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
        var wy = 0.12 + (p.rise ? 0.55 : 0);          // 불면 수면이 올라온다
        var wg = p.rise ? 1.06 : 1;
        var whex = p.rise ? 0x2a5f88 : 0x2f6f9e;       // 흙탕물은 더 어둡다
        var w = p.sq
          ? box(g, 'plane', pmat(whex, 'water'), 0, wy, 0, (GRID + 0.5) * wg, (GRID + 0.5) * wg, 1, false)
          : box(g, 'disc', pmat(whex, 'water'), 0, wy, 0, GRID * 0.62 * wg, GRID * 0.62 * wg, 1, false);
        w.rotation.x = -Math.PI / 2;
      } else if (p.t === 'field') {
        /* 논 한 뙈기 — 물 댄 낯을 얇게 깔고 두렁을 두른다. 지면보다 조금만 띄운다
           (많이 띄우면 논이 공중에 뜨고, 안 띄우면 지면과 다퉈 얼룩진다) */
        var fld = box(g, 'box', pmat(0x3f6b52), p.x, 0.09, p.z, p.w, 0.18, p.d, false);
        fld.rotation.y = p.rot;
        fld.receiveShadow = true;
        /* 두렁은 **테두리**다. 한 덩이로 덮으면 논이 그 밑에 깔려 흙판만 보인다
           (눈으로 보고 알았다) — 네 변만 두른다 */
        /* **이름을 `lox`·`loz` 로 둔 까닭** — 여기서 `ox`·`oz` 를 쓰면 `var` 가
           함수 범위라 이 함수 맨 위의 **격자 원점**(`ox`·`oz`)을 통째로 덮어쓴다.
           그러면 이 논 뒤에 오는 소품이 전부 원점 근처(9, 0)로 끌려가 사라진다 —
           벼가 안 서던 것이 이것이었다(2026-08-29에 잡았다) */
        var lw = 1.1, li;
        for (li = 0; li < 4; li++) {
          var ax = li < 2 ? p.w + lw : lw, az = li < 2 ? lw : p.d + lw;
          var lox = li === 0 ? 0 : (li === 1 ? 0 : (li === 2 ? -(p.w + lw) / 2 : (p.w + lw) / 2));
          var loz = li === 0 ? -(p.d + lw) / 2 : (li === 1 ? (p.d + lw) / 2 : 0);
          var lv = box(g, 'box', pmat(0x7a6f57), 0, 0.20, 0, ax, 0.22, az, false);
          lv.position.set(p.x + Math.cos(p.rot) * lox - Math.sin(p.rot) * loz, 0.20,
                          p.z + Math.sin(p.rot) * lox + Math.cos(p.rot) * loz);
          lv.rotation.y = p.rot;
        }
      } else if (p.t === 'scare') {
        /* 허수아비 — 장대 하나에 가로대와 삿갓. 논에 사람이 산다는 표다 */
        box(g, 'cyl', pmat(0x6b5a3f), p.x, p.h * 0.5, p.z, 0.16, p.h, 0.16, true);
        box(g, 'box', pmat(0x6b5a3f), p.x, p.h * 0.78, p.z, 1.6, 0.13, 0.13, false);
        box(g, 'cone', pmat(0xa8925f, 'flat'), p.x, p.h + 0.16, p.z, 1.1, 0.5, 1.1, false);
      } else if (p.t === 'bridge') {
        /* 다리 — 강을 **가로질러** 놓는다. 길이 남북이라 상판도 남북으로 길다.
           난간이 없으면 멀리서 물 위의 널빤지로만 보인다.
           **모델을 못 받았을 때만 여기 온다.** 계획은 일곱 칸으로 나뉘어 있으므로
           첫 칸(`seg` 0)에서만 옛 모습대로 48m 상판 하나를 세운다 */
        if (p.seg) { continue; }
        box(g, 'box', pmat(0x7a6a52), 0, 1.7, 0, 7, 0.5, GRID * 1.02, true).receiveShadow = true;
        var bi;
        for (bi = -1; bi <= 1; bi += 2) {
          box(g, 'box', pmat(0x8a7a60), bi * 3.3, 1.7 + 0.75, 0, 0.35, 1.0, GRID * 1.02, false);
        }
        for (bi = -1; bi <= 1; bi += 2) {          // 물속 교각
          box(g, 'cyl', pmat(0x5d5347), 0, 1.7 * 0.5, bi * GRID * 0.28, 1.5, 1.7 * 2, 1.5, false);
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

  /* 사물 격자를 마지막으로 훑은 자리 — **격자를 넘어설 때만** 다시 훑는다.
     여태 매 프레임 11×11 칸을 다 재고 있었다. 한 걸음(8m/s)에 격자(48m)를 넘는 데
     6초가 걸리니, 그 사이 360번쯤은 같은 답을 다시 낸 셈이다 */
  var propScan = null;

  function syncProps(W) {
    var pos = core.save.player.pos;
    var R = PROP_R();
    /* 지도가 깔렸는지 — 깔린 자리와 안 깔린 자리(오프라인·타일 실패)에서
       세우는 것이 다르다. 캐시 키에도 넣어야 상태가 바뀔 때 다시 세운다 */
    var mapped = !!(W.tilesUsable && W.tilesUsable());
    var RG3 = global.DG.land;
    var wkNow = weatherKey();
    var wetNow = WET() && (wkNow === 'rain' || wkNow === 'snow');
    var seasonKey = global.DG.season ? global.DG.season.now().key : '-';
    /* **훑을 까닭이 있을 때만 훑는다.** 격자를 넘었거나 · 지도가 붙거나 떨어졌거나 ·
       비가 오거나 그쳤거나 · 품질이 바뀌었을 때. 그 밖에는 답이 지난 프레임과 같다 */
    var cell = Math.floor(pos.x / GRID) + ':' + Math.floor(pos.y / GRID) +
      ':' + Math.round(R) + ':' + (MESH_ON() ? 1 : 0) + ':' + Math.round(DENSITY() * 100) +
      ':' + (mapped ? 'm' : 'n') + ':' + (wetNow ? 'w' : 'd') +
      ':' + (RG3 && RG3.on() ? 'L' : '-') +
      ':' + seasonKey;
    if (propScan === cell) { return; }
    propScan = cell;
    var g0x = Math.floor((pos.x - R) / GRID), g1x = Math.floor((pos.x + R) / GRID);
    var g0y = Math.floor((pos.y - R) / GRID), g1y = Math.floor((pos.y + R) / GRID);
    var live = {};
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
        /* 젖음도 키에 넣는다 — 안 넣으면 비가 그쳐도 강이 분 채로 남는다.
           **계절도 마찬가지다** — 안 넣으면 가을이 됐는데 나무 몇 그루가 초록으로
           남는다(눈으로 보고 알았다). 훑는 조건에만 넣으면 다시 훑기는 하는데
           이미 세워 둔 격자를 그대로 되쓴다 */
        var key = kind + ':' + gx + ':' + gy + ':' + (mapped ? 'm' : 'n') +
          (mk ? ':' + mk : '') + (wetNow ? ':w' : '') + ':' + seasonKey;
        live[key] = 1;
        if (propMeshes[key]) { continue; }
        var node = buildProp(kind, gx, gy, mapped, key);
        /* 격자 한가운데의 땅 높이에 앉힌다. 이 노드 안의 조각들은 제 자리
           (`p.x`·`p.z`)만큼 옆으로 벌어져 있어 그만큼은 어긋나지만, 격자가
           48m 라 한 칸 안에서는 땅이 거의 평평하다 — 눈에 안 띈다 */
        var pcx = gx * GRID + GRID / 2, pcz = gy * GRID + GRID / 2;
        node.position.set(pcx, groundY(pcx, pcz), pcz);
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
      instDrop(k);                    // 빌려 준 인스턴스 자리도 돌려받는다
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
    /* **땅에 앉힌다.** 땅이 굽었으므로 y=0 에 세우면 산에서는 발이 묻히고
       골짜기에서는 허공에 뜬다(PLAN 14절) */
    var gy0 = groundY(x, y);
    if (a.mesh) {
      a.node.scale.set(h, h, h);
      a.node.position.set(x, gy0, y);
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
      /* 교전 몸짓(`playAnim`) 이 걸려 있으면 그 자리 이름을 준다 — 끝나면
         (`animUntil` 지나면) 도로 걷기/서기로 돌아간다. 클립이 없으면
         `asset3d.play` 가 조용히 실패하니 여기서 따로 안 가른다 */
      var animNow = (a.animUntil && now < a.animUntil) ? a.animName : undefined;
      global.DG.actor3d.step(a.node, { t: now / 1000, walking: walk, phase: phase, anim: animNow });
    } else {
      a.node.scale.set(h, h, 1);
      a.node.position.set(x, gy0 + h / 2 + (bob || 0), y);
    }
    a.shadow.position.set(x, gy0 + 0.06, y);
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

    /* 교전 상대(`duelStage()` 로 세운 임시 배우) — `spawns` 에 없으니 여기서
       직접 먹인다. 코앞이라 `farBoost` 는 안 준다(늘 가까이서 마주 선다) */
    if (duelFoe) {
      var dfa = actorOf('duelfoe', duelFoe.kind, duelFoe.ref, 96);
      placeActor(dfa, duelFoe.x, duelFoe.y, h * (duelFoe.kind === 'pet' ? 0.86 : 1), 0, false, 0, now);
      /* 상대는 **나를 마주 본다.** 걷지 않으니 `placeActor` 의 진행-방향 회전으로는
         절대 안 돌아간다 — 새로 세운 순간의 기본값(뒤짐, PLAN 49절)이 그대로
         남아 계속 등을 보이게 된다. 야생 대상의 무대 회전(위 `onStage`)과 같은 계산 */
      if (dfa.mesh) {
        var fax = pos.x - duelFoe.x, faz = pos.y - duelFoe.y;
        dfa.node.rotation.y = Math.atan2(fax, faz);
        dfa.ang = dfa.node.rotation.y;
      }
    }

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

    /* 주민 — 이 땅에 사는 열 사람(`npc.js`). 스폰과 달리 **잡히지 않는 사람들**이라
       발밑 등급 고리를 안 두르고, 조우 무대에도 오르지 않는다 */
    var NP = global.DG.npc;
    var people = NP ? NP.live(pos, now) : [];
    for (i = 0; i < people.length; i++) {
      var n = people[i];
      var na = actorOf('np' + n.p.id, 'hero', n.p, 96);
      var nbob = n.walking
        ? Math.abs(Math.sin(n.phase)) * h * 0.04
        : Math.sin(now / 700 + i) * h * 0.014;
      placeActor(na, n.x, n.y, h * 0.94 * farBoost(n.x, n.y), nbob, n.walking, n.phase, now);
    }

    /* 짐승 — 들·강의 다섯 종(`animal.js`). 잡는 대상이 아니라 **거기 사는 것**이라
       등급 고리도 이름표도 없다. 새는 뜨고 물고기는 잠기므로 세운 뒤 높이를 준다 */
    var AN = global.DG.animal;
    var beasts = AN ? AN.live(pos, now) : [];
    for (i = 0; i < beasts.length; i++) {
      var bt = beasts[i];
      var ba = actorOf('an' + bt.m.id, 'pet', AN.refOf(bt.kind), 96);
      var bh = h * bt.kind.h * farBoost(bt.x, bt.y);
      placeActor(ba, bt.x, bt.y, bh, 0, bt.moving, bt.phase, now);
      if (bt.lift) {
        /* 날아오른 새는 **그림자가 작아지고 흐려진다** — 높이만 주면 지면에 붙어
           보인다(발밑 그림자가 그대로면 눈이 높이를 못 읽는다) */
        ba.node.position.y = bt.lift;
        ba.shadow.scale.setScalar(bh * 0.30 * Math.max(0.25, 1 - bt.lift / 12));
      }
      if (bt.kind.act !== null && bt.alarm > 0.05) {
        /* 놀랐거나 쫓는 짐승은 그쪽을 본다 — 옆을 보고 도망치면 도망으로 안 보인다 */
        ba.node.rotation.y = bt.ang;
        ba.ang = bt.ang;
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
      var fs = fortStyle(ft);
      var fa = actorOf('ft' + ft.key, 'building',
        { key: 'wall', id: 'ft_' + ft.key, color: ft.color || fs.color, tier: fs.tier }, 128);
      placeActor(fa, ft.x, ft.y, h * 2.4 * farBoost(ft.x, ft.y), 0, false, 0, now);
    }
  }

  /**
   * 성채의 **겉모습** — 등급과 지키는 세력의 빛깔.
   *
   * 여태 성채는 화면에서 다 같았다(늘 보라색 배너에 같은 크기). 등급 셋(보·진·웅진)도
   * 세력도 판정 층은 알고 있는데 화면이 안 물어봤을 뿐이다. 물어보고 나면
   * **걸어가기 전에 멀리서 세기와 임자를 가늠**할 수 있다.
   *
   * **키로 캐시한다.** `factionNameOf` 는 도감 일흔을 훑으므로 프레임마다 부르면
   * 안 된다. 같은 성채의 등급·세력은 늘 같으니(해시로 정해진다) 캐시가 맞다 —
   * 점령 여부만 바뀌는데 그것은 여기서 안 쓴다.
   */
  var fortStyleCache = {};
  function fortStyle(ft) {
    if (fortStyleCache[ft.key]) { return fortStyleCache[ft.key]; }
    var F = global.DG.fort, D = global.DG.data;
    var o = { tier: 2, color: '#8a5cc0' };
    try {
      if (F && F.tierOf) {
        o.tier = F.tierOf(ft).tier;
        var fc = D && D.faction ? D.faction(F.factionNameOf(ft)) : null;
        if (fc && fc.color) { o.color = fc.color; }
      }
    } catch (e) { /* 판정 층이 아직 없으면 옛 빛깔 그대로 — 화면은 안 빈다 */ }
    fortStyleCache[ft.key] = o;
    return o;
  }

  /* ── 조우 연출 ────────────────────────────────────────────
   * 원작에서 대상을 누르면 화면이 그쪽으로 넘어간다. 여기서는 조우 창이 HTML 이라
   * 3D 는 **뒤에서 카메라를 돌려** 그 순간을 만든다. 잡히면 빛기둥이 선다.
   * 창이 열렸는지는 DOM 을 보고 안다 — `encounter.js` 를 고치지 않으려는 것이다.
   */
  /* ── 전투 연출 (PLAN 23절) ────────────────────────────
   * 소품은 `battle3d.js` 가 만든다. 여기 있는 것은 **카메라가 하는 일**뿐이다 —
   * 줌인 · 흔들림 · 잠깐 멎기(hit-stop). 셋 다 화면에만 쓴다.
   */
  var yaw = 0;             // 돌려 본 각(라디안) — 드래그로 바꾼다
  var battleOn = false;    // 교전 중인가
  var shakeAmp = 0;        // 남은 흔들림 세기(m)
  var holdUntil = 0;       // 이때까지 화면이 멎는다 (performance.now 기준)

  var focusAt = null;      // {x, y} 조우 중인 대상
  var stageAt = null;      // {x, y, uid} 조우 무대 — 대상 앞에 카메라를 세운다
  var beams = [];          // 빛기둥

  /* ── 교전 상대를 실제로 세운다 (PLAN 23절 다음, 2026-08-30) ──────────
   * `duel.js` 는 여태 카드 안의 이모지로만 싸웠다 — 3D 지도에는 아무도 안 섰다.
   * `battle3d.js` 가 `duel:open` 때 `duelStage()` 를 불러 상대를 실제로 세우면,
   * 배우는 늘 있던 `actors['me']`(동행 선두) 옆에서 진짜로 마주 선다.
   * 상대는 `spawns` 목록에 없는 임시 배우라 `syncActors()` 가 따로 먹여야 한다. */
  var duelFoe = null;      // {kind, ref, x, y} — 없으면 교전 중이 아니거나 3D 상대가 없다

  /** 이 자리가 집 몸통 안인가 — `world.js` 의 `hitsHouse` 와 같은 계산이지만
      독립된 사본이다(world3d 가 world.js 를 되받아 부르지 않게 한다).
      `margin` 은 여유(m) — 상대가 설 자리는 발이 벽에 안 묻힐 만큼(기본 1),
      카메라가 설 자리는 그보다 훨씬 넉넉해야 한다(벽에 바짝 붙으면 근접
      절단면이 벽 텍스처로 화면을 채운다) */
  function duelSpotBlocked(x, y, margin) {
    var m = margin === undefined ? 1 : margin;
    var gx0 = Math.floor(x / GRID), gy0 = Math.floor(y / GRID), gx, gy, rs, i, r;
    for (gy = gy0 - 1; gy <= gy0 + 1; gy++) {
      for (gx = gx0 - 1; gx <= gx0 + 1; gx++) {
        rs = houseRects(gx, gy);
        for (i = 0; i < rs.length; i++) {
          r = rs[i];
          var dx = x - r.x, dz = y - r.z;
          var c = Math.cos(r.rot), s = Math.sin(r.rot);
          var lx = dx * c + dz * s, lz = -dx * s + dz * c;
          if (Math.abs(lx) < r.w / 2 + m && Math.abs(lz) < r.d / 2 + m) { return true; }
        }
      }
    }
    return false;
  }

  /** 상대를 세운다 — `x, y` 는 나에게서 6m 남쪽(`battle3d.spot()` 과 같은 자리)이
      먼저다. 그 자리가 집 안이면(마을 한복판에서 걸린 사건) 부채꼴로 돌며
      가장 가까운 트인 자리를 대신 쓴다 — 안 그러면 상대가 벽 뒤에 완전히
      가려진다(2026-08-30, 실기기 확인 중 발견) */
  function duelStage(kind, ref) {
    if (!kind || !ref) { return false; }
    var pos = core.save.player.pos;
    var OFF = [[0, -6], [-6, -6], [6, -6], [-6, 0], [6, 0], [0, 6], [-6, 6], [6, 6]];
    var fx = pos.x + OFF[0][0], fy = pos.y + OFF[0][1], i;
    for (i = 0; i < OFF.length; i++) {
      var tx = pos.x + OFF[i][0], ty = pos.y + OFF[i][1];
      if (!duelSpotBlocked(tx, ty)) { fx = tx; fy = ty; break; }
    }
    duelFoe = { kind: kind, ref: ref, x: fx, y: fy };
    focusAt = { x: duelFoe.x, y: duelFoe.y };
    return true;
  }

  /** 상대를 내린다 — `sweepActors()` 가 알아서 사라지게 두지 않고 바로 지운다
   *  (교전 결과 카드가 곧바로 그 자리를 쓰므로 사라지는 연출은 필요 없다) */
  function duelUnstage() {
    var a = actors.duelfoe;
    if (a) {
      actorGroup.remove(a.node);
      actorGroup.remove(a.shadow);
      delete actors.duelfoe;
    }
    duelFoe = null;
  }

  /** 나 또는 상대에게 몸짓을 하나 재생한다(공격·피격·회피) — `who` 는 'me'·'foe'.
   *  클립이 없는 몸(도형 배우, 아직 안 받은 GLB)이면 조용히 아무 일도 안 한다. */
  function playAnim(who, name, ms) {
    var key = who === 'foe' ? 'duelfoe' : 'me';
    var a = actors[key];
    if (!a) { return false; }
    a.animName = name;
    a.animUntil = (global.performance ? performance.now() : Date.now()) + (ms || 300);
    return true;
  }

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
  /** 교전 상대가 실제로 서 있을 때(`duelFoe`) 카메라가 다가서는 거리 —
      `stage` 보다 낮고 옆에서 본다(둘 다 한 화면에 담아야 한다) */
  function DUEL_DIST() { return core.tuned('world3d.duelDist', 9); }

  function camAim(pos, mode, focus, stage, zoom, battle, yaw, duel) {
    var z = (zoom === undefined || !isFinite(zoom) || zoom <= 0) ? 1 : zoom;
    var yw = yaw || 0;
    /* 교전이 열리면 **약간 줌인**한다(PLAN 23절). 무대(stage)처럼 자리를 통째로
       옮기지는 않는다 — 싸움은 내가 선 자리에서 벌어지고, 카메라만 다가선다 */
    if (battle) { z = z * 0.62; }
    if (!stage && duel) {
      /* 실제 상대가 3D 로 서 있으면(`world3d.duelStage()`) **둘을 옆에서 가까이**
         담는다 — 위에서 내려다보는 기본 구도로는 화면 한복판의 카드에 다 가려진다.
         무대(`stage`)의 "무릎께" 구도와 달리 상대가 아니라 **둘 사이**를 축으로 삼는다 */
      var mx = (pos.x + duel.x) / 2, my = (pos.y + duel.y) / 2;
      var ddx = duel.x - pos.x, ddy = duel.y - pos.y;
      var dlen = Math.max(0.5, Math.hypot(ddx, ddy));
      var px = -ddy / dlen, pz = ddx / dlen;   // 둘을 잇는 선에 수직 — 옆에서 본다
      var DD = DUEL_DIST();
      /* 마을 한복판에서 걸리면 이 낮고 가까운 자리가 **집 안**일 수 있다
         (2026-08-30, 실기기 대신 스크린샷으로 확인하다 발견 — 벽 속에서
         찍은 듯한 그림이 떴다). 반대편을 대신 써 보고, 그마저 막히면 낮게
         깔지 않고 기본 카메라처럼 높이 물러난다(막힌 벽보다 먼 그림이 낫다) */
      var CAM_MARGIN = 3.5;    // 카메라는 벽에서 이만큼은 떨어져야 근접 절단면이 안 보인다
      var side1 = { x: mx + px * DD, z: my + pz * DD };
      var side2 = { x: mx - px * DD, z: my - pz * DD };
      var pick = !duelSpotBlocked(side1.x, side1.z, CAM_MARGIN) ? side1 :
        (!duelSpotBlocked(side2.x, side2.z, CAM_MARGIN) ? side2 : null);
      if (pick) {
        return { pos: { x: pick.x, y: DD * 0.55, z: pick.z }, look: { x: mx, y: 2.2, z: my } };
      }
      return {
        pos: { x: mx + px * DD * 1.8, y: DD * 1.8, z: my + pz * DD * 1.8 },
        look: { x: mx, y: 2.0, z: my }
      };
    }
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
    /* **돌려 보기**(PLAN 7·26절 "마우스/터치 회전") — 카메라를 나를 축으로 돌린다.
       보는 곳은 그대로 내 앞이라, 돌려도 **내가 화면 한가운데** 남는다 */
    var cs = Math.cos(yw), sn = Math.sin(yw);
    var ax = 0, az = back;                       // 안 돌렸을 때 카메라가 서는 자리
    var ahead = CAM_AHEAD[mode];
    return {
      pos: { x: pos.x + ax * cs - az * sn, y: high, z: pos.y + ax * sn + az * cs },
      look: { x: pos.x + ahead * sn, y: mode === 0 ? 0.5 : 2.4, z: pos.y - ahead * cs }
    };
  }

  function syncCamera(W, dt) {
    var pos = core.save.player.pos;
    /* 조우 무대에서는 줌을 무시한다 — 무대는 늘 같은 그림이어야 한다 */
    var aim = camAim(pos, W.tiltMode, focusLive(), stageAt,
      stageAt ? 1 : W.zoom3d, battleOn, stageAt ? 0 : yaw, duelFoe);
    /* **카메라와 시선도 땅을 따라 오른다.** 안 그러면 산에 오를 때 카메라가
       제자리에 남아 땅이 화면을 덮고, 골짜기에서는 하늘만 보인다.
       `camAim` 은 평면 기준으로 값을 내므로 여기서 땅 높이만 얹는다 —
       그쪽은 순수 함수로 남겨 둔다(자가진단이 값으로 붙들고 있다) */
    var camLift = groundY(aim.pos.x, aim.pos.z);
    var lookLift = groundY(aim.look.x, aim.look.z);
    var want = new T.Vector3(aim.pos.x, aim.pos.y + camLift, aim.pos.z);
    var look = new T.Vector3(aim.look.x, aim.look.y + lookLift, aim.look.z);
    if (!camPos) { camPos = want.clone(); camLook = look.clone(); }
    /* 카메라는 곧바로 붙지 않고 따라온다 — 원작의 그 미끄러지는 느낌이다.
       교전 중에는 조금 더 빨리 붙는다(줌인이 굼뜨면 때리는 맛이 죽는다) */
    var k = Math.min(1, dt * (battleOn ? 9 : 6.5));
    camPos.lerp(want, k);
    camLook.lerp(look, k);
    camera.position.copy(camPos);
    /* 흔들림 — **따라온 자리에 얹기만** 한다. camPos 자체를 흔들면 흔들림이
       다음 프레임의 출발점이 되어 카메라가 조금씩 밀려난다 */
    if (shakeAmp > 0.001) {
      var ph = frame * 1.9;
      camera.position.x += Math.sin(ph) * shakeAmp;
      camera.position.y += Math.sin(ph * 1.7 + 1.1) * shakeAmp * 0.6;
      camera.position.z += Math.cos(ph * 1.3) * shakeAmp;
      shakeAmp *= Math.pow(0.02, dt);            // 초당 50분의 1로 잦아든다
    } else { shakeAmp = 0; }
    camera.lookAt(camLook);
  }

  /* 크게 당기면 절두체에 사물이 다 들어와 그림자 맵이 감당하지 못한다.
     그 높이에서는 그림자가 몇 픽셀도 안 되니 **끄는 편이 낫다.**
     경계에서 한 번만 갈아 끼운다 — 프레임마다 바꾸면 셰이더를 다시 컴파일한다 */
  var shadowOn = true;
  function syncShadow(zoom) {
    var P = global.DG.perf;
    var want = zoom < 4 && !(global.DG_3D_DEBUG || {}).noShadow && (!P || P.shadowOk());
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
    if (scene.background && scene.background.setHex) { scene.background.setHex(L.bg); }
    renderer.setClearColor(L.bg, 1);
    if (scene.fog) {
      scene.fog.color.setHex(L.bg);
      scene.fog.near = L.fog.near;
      scene.fog.far = L.fog.far;
    }
  }

  /* ── 그린다 ───────────────────────────────────────────── */

  /**
   * 화면에 낸다 — 후처리를 거치거나(있고 켜져 있을 때) 곧바로 그린다.
   * **두 길 다 톤매핑은 한 번 걸린다**(`post3d.js` 머리 참고).
   * 그리는 자리가 두 군데(여기와 hit-stop)라 함수로 묶었다 — 한쪽만 고치면
   * 멎는 동안 후처리가 벗겨져 화면이 껌뻑인다.
   */
  function present() {
    var P3 = global.DG.post3d;
    if (P3) {
      if (P3.draw(renderer, scene, camera, lightNow)) { return; }
      /* 후처리가 켜졌다 꺼졌을 수 있다(등급이 LOW 로 내려간 순간).
         마지막으로 쓰던 렌더 타깃이 물려 있으면 캔버스가 검게 남는다 */
      renderer.setRenderTarget(null);
    }
    renderer.render(scene, camera);
  }

  var last = 0;

  function render() {
    if (!active()) { return false; }
    var W = global.DG.world;
    var now = performance.now();
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
    last = now;
    frame++;

    /* hit-stop — 큰 것이 꽂힌 순간 화면이 아주 잠깐 멎는다(PLAN 23절).
       **그린 것을 그대로 한 번 더 낸다** — 아무것도 안 그리면 검게 깜빡인다 */
    if (now < holdUntil) { present(); return true; }

    syncLight(dt);
    syncShadow(W.zoom3d || 1);
    syncGround(W);
    syncProps(W);
    syncLamps();
    syncActors(W, now);
    sweepActors(dt);
    if (global.DG.encounter3d) { global.DG.encounter3d.tick(dt); }
    if (global.DG.battle3d) { global.DG.battle3d.tick(dt); }
    if (global.DG.sky3d) { global.DG.sky3d.tick(dt, lightNow); }
    if (global.DG.water3d) { global.DG.water3d.tick(dt, lightNow); }
    syncBeams(dt);
    syncCamera(W, dt);

    present();
    return true;
  }

  /**
   * 세워 둔 소품을 통째로 지운다 — 다음 프레임에 다시 선다.
   * `prop3d` 가 GLB 를 다 받은 뒤 한 번 부른다: 그 한 번에 원뿔 나무가
   * 진짜 나무로 바뀐다. 인스턴스 덩이도 같이 비운다(빈 자리를 돌려받아야
   * 새 덩이가 창고를 나눠 쓴다).
   */
  function refreshProps() {
    if (!propGroup) { return 0; }
    var n = 0, k;
    for (k in propMeshes) {
      if (!Object.prototype.hasOwnProperty.call(propMeshes, k)) { continue; }
      instDrop(k);
      propGroup.remove(propMeshes[k]);
      n++;
    }
    propMeshes = {};
    propScan = null;          // 다음 프레임에 다시 훑는다
    return n;
  }

  global.DG = global.DG || {};
  /**
   * 인스턴스 창고 속 — **어느 덩이에 몇이 서 있나.**
   * "계획은 나오는데 화면에 없다" 를 가를 때 이것 하나면 끝난다(벼에서 밟았다).
   */
  function instReport(filter) {
    var out = [], k;
    for (k in instKinds) {
      if (!Object.prototype.hasOwnProperty.call(instKinds, k)) { continue; }
      if (filter && k.indexOf(filter) < 0) { continue; }
      var K = instKinds[k], m = K.mesh;
      var det = '';
      if (filter) {
        /* 걸러 볼 때는 **속까지** 본다 — 창고에는 있는데 화면에 없을 때
           보이지 않는 이유는 결국 이 넷 중 하나다 */
        var g = m.geometry, pa = g && g.getAttribute('position');
        m.updateMatrixWorld(true);
        var e = m.matrixWorld.elements;
        var m0 = new T.Matrix4();
        if (m.count > 0) { m.getMatrixAt(0, m0); }
        var p0 = new T.Vector3(), q0 = new T.Quaternion(), s0 = new T.Vector3();
        m0.decompose(p0, q0, s0);
        det = ' [보임' + (m.visible ? 1 : 0) +
          ' 재질' + (m.material && m.material.visible ? 1 : 0) +
          ' 투명' + (m.material && m.material.opacity !== undefined ? m.material.opacity : '?') +
          ' 정점' + (pa ? pa.count : '?') +
          ' 부모' + (m.parent ? m.parent.name || 'group' : 'none') +
          ' 월드' + e[12].toFixed(0) + ',' + e[13].toFixed(0) + ',' + e[14].toFixed(0) +
          ' 첫자리' + p0.x.toFixed(0) + ',' + p0.y.toFixed(1) + ',' + p0.z.toFixed(0) +
          ' 배율' + s0.x.toFixed(2) + ']';
      }
      out.push(k.split('/').pop() + '=' + K.n + '/' + m.count + det);
    }
    return out;
  }

  global.DG.world3d = {
    init: init, resize: resize, render: render, refreshProps: refreshProps,
    /** 인스턴스 창고 속을 들여다본다(진단·데모용). 이름 조각으로 걸러 볼 수 있다 */
    instReport: instReport,
    available: available, active: active, wanted: wanted,
    /* 값을 내는 함수 — three 없이도 돈다(자가진단이 이것만 따로 본다) */
    lightingAt: lightingAt, propPlan: propPlan, urbanity: urbanity, camAim: camAim,
    houseRects: houseRects,
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
    /** 돌려 보기 — 드래그가 두드린다(`world.js`). 라디안을 더한다 */
    turn: function (d) {
      yaw += d || 0;
      while (yaw > Math.PI) { yaw -= Math.PI * 2; }
      while (yaw < -Math.PI) { yaw += Math.PI * 2; }
      return yaw;
    },
    yaw: function (v) { if (v !== undefined) { yaw = v; } return yaw; },
    /* 전투 연출 손잡이 — `battle3d.js` 가 두드린다 (PLAN 23절) */
    battle: function (on) { battleOn = !!on; if (!on) { shakeAmp = 0; } return battleOn; },
    inBattle: function () { return battleOn; },
    /* 교전 상대를 실제로 세운다 — `battle3d.js` 가 duel:open/close 때 두드린다 */
    duelStage: duelStage, duelUnstage: duelUnstage, playAnim: playAnim,
    duelFoe: function () { return duelFoe; },
    /** 카메라를 흔든다. 세기는 m — 여러 번 부르면 센 쪽이 남는다 */
    shake: function (amp) { shakeAmp = Math.max(shakeAmp, amp || 0); return shakeAmp; },
    shakeAmp: function () { return shakeAmp; },
    /** 잠깐 멎는다(ms). 너무 길면 끊긴 것으로 보이므로 상한을 둔다 */
    hold: function (ms) {
      var v = Math.min(180, Math.max(0, ms || 0));
      holdUntil = Math.max(holdUntil, (global.performance ? performance.now() : 0) + v);
      return v;
    },
    lum: lum, GRID: GRID,
    /** 인스턴스 덩이 현황 (PLAN 16절) — 진단·데모가 값으로 본다 */
    instStats: instStats,
    /** 지면에 칠하는 땅 색 — 진단이 빠진 갈래가 없는지 본다 */
    LAND_COLOR: LAND_COLOR,
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
