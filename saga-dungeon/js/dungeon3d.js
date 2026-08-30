/**
 * 3D 던전 — 방을 진짜 입체로 세운다 (3D 전환 1단계)
 * ---------------------------------------------------------------
 * 여태 던전 화면은 캔버스 2D 였다. 아이소메트릭이라 입체로 보이지만 **그리는 것은
 * 납작한 마름모**다(`dungeon-view.js` 의 `proj()`). 그 층 옆에 three.js 로 진짜
 * 3D 를 세운다.
 *
 * `PLAN.md` 가 못박아 둔 구조를 그대로 지킨다 — **게임 로직과 렌더링을 분리**
 * (3절). 다행히 이 판은 처음부터 그렇게 지어져 있다:
 *
 *   `dungeon.js`       판정. 좌표·체력·쿨다운·전리품. **여기는 한 줄도 안 건드린다**
 *   `dungeon-view.js`  캔버스 2D 화면 + 조작판(HUD)·입력
 *   `dungeon3d.js`     ← 여기. 같은 상태를 읽어 **입체로** 세운다
 *
 * 조작판·입력·시트는 그대로 DOM 이다. 3D 가 켜지면 **캔버스 그리기만** 건너뛴다.
 *
 * 카메라는 8절대로 **3/4 top-down** 이고 회전은 막았다(원작이 그렇다).
 * 그림은 37절의 *Stylized Dark Fantasy* — 어둡게 깔고 횃불로 도려낸다.
 *
 * **WebGL 이 없거나 켜다 실패하면 조용히 2D 로 돌아간다.** 자가진단(`DG_NO_DRAW`)은
 * 이 파일을 켜지도 않고, 켜지지 않아도 게임은 그대로 돈다 — 대신 **값을 내는 함수**
 * (`camAim`·`lightPlan`)는 three 없이도 돌아 진단이 그것만 따로 본다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  var T = null;
  var renderer = null, scene = null, camera = null;
  var floorMesh = null, wallGroup = null, actorGroup = null, fxGroup = null;
  var fieldGroup = null;           // 방 밖 들판 (2단계)
  var fieldKey = null;             // 지금 세워 둔 들판의 씨앗+반경
  var amb = null, key = null, torch = null;
  var canvas = null;
  var ready = false, failed = false;
  var actors = {};                 // 배우 { key: {node, seen} }
  var frame = 0;
  var camPos = null, camLook = null;
  var roomKey = null;              // 지금 세워 둔 방 (바뀌면 벽을 다시 세운다)

  /**
   * 지금 그리는 장면 — 마을이거나 던전이다.
   *
   * `dungeon-view.js` 의 같은 이름 함수와 **한 글자도 다르지 않아야 한다.**
   * 그쪽은 마을이면 `DG.town` 을 그리라고 넘기는데 이쪽이 던전만 보고 있으면,
   * 마을에서 `DG.dungeon.raw()` 가 `null` 이라 render() 가 첫 줄에서 나가 버린다.
   * 그러면 2D 는 "3D 가 그렸다" 고 믿어 캔버스를 지우고, 3D 는 아무것도 안 그려
   * **마을이 통째로 검은 화면**이 된다(실제로 그랬다).
   */
  function d() {
    var T2 = global.DG.town;
    return (T2 && T2.active()) ? T2 : global.DG.dungeon;
  }
  function isTown() { var T2 = global.DG.town; return !!(T2 && T2.active()); }

  /* ── 손잡이 ───────────────────────────────────────────
   * **이 판의 `core.js` 에는 손잡이(`tuned`)가 없다** — 사가고에만 있는 기능이다.
   * 그래서 있으면 쓰고 없으면 기본값으로 간다. 값을 바꿔 보려면 콘솔에서
   * `DG.dungeon3d.set('dg3d.dark', 0.5)` 를 두드리면 된다.
   */
  var knobs = {};
  function tuned(k, def) {
    if (knobs[k] !== undefined) { return knobs[k]; }
    if (core.tuned) { return core.tuned(k, def); }
    return def;
  }
  function set(k, v) {
    if (v === null || v === undefined) { delete knobs[k]; } else { knobs[k] = v; }
    roomKey = null;                       // 방을 다시 세워 값이 곧바로 듣게 한다
    return knobs;
  }

  /** 3D 로 그릴까 — 0 이면 예전 캔버스 화면이다 */
  function wanted() { return tuned('dg3d.on', 1) ? true : false; }
  /** 카메라가 방을 얼마나 담을까 (작을수록 당겨 본다) */
  function ZOOM() { return tuned('dg3d.zoom', 1); }
  /**
   * 사람이 핀치·휠로 직접 조절하는 확대 — **`dg3d.zoom` 손잡이와는 다른 값이다.**
   * 저건 콘솔로 튜닝하는 개발용 상수고, 이건 `core.save.settings.camZoom` 에
   * 저장돼 프로필마다 남는 사용자 값이다. 손가락으로 벌리면(=확대) 커지도록
   * (2D `dungeon-view.js` 의 `ZOOM` 과 같은 결) 잡았는데, `ZOOM()`(거리 배수,
   * 작을수록 가깝다)에는 **나눠서** 먹인다 — 그래야 두 화면(2D·3D)에서 손가락을
   * 벌리는 동작이 똑같이 "가까워진다" 로 느껴진다. 값 자체는 `dungeon-view.js`
   * 가 핀치·휠로 적어 두고, 여기서는 읽기만 한다.
   */
  function USERZOOM() {
    try {
      var v = core.save && core.save.settings ? core.save.settings.camZoom : 1;
      v = (v === undefined || v === null) ? 1 : v;
      return v < 0.4 ? 0.4 : (v > 2.5 ? 2.5 : v);
    } catch (e) { return 1; }
  }
  /** 카메라 기울기 — 0 은 완전 위, 1 은 낮게. 원작은 3/4 쯤이다 */
  function TILT() { return tuned('dg3d.tilt', 0.62); }
  /** 어둠의 깊이 — 1 이면 횃불 밖이 새까맣다 */
  function DARK() { return tuned('dg3d.dark', 0.45); }
  /** 방 밖 들판을 세울까 (2단계) — 0 이면 1단계의 허공에 뜬 상자로 돌아간다 */
  function FIELD() { return tuned('dg3d.field', 1) ? true : false; }
  /** 들판을 몇 조각까지 세울까 (PLAN 6절 — 멀면 안 세운다) */
  function FIELD_R() { return tuned('dg3d.fieldR', 3); }
  /** 들판 밀도 배수 — 버거우면 여기를 내린다 */
  function FIELD_D() { return tuned('dg3d.fieldDens', 1); }
  /**
   * 카메라 구도 — 'iso'(3/4 top-down, 기본) 또는 'third'(어깨너머 3인칭).
   * **2026-08-30, 사용자 요청.** 회전 조작까지 새로 놓는 큰 개편은 아니다 —
   * WASD 는 그대로 **화면(월드) 기준 절대 방향**이다(dungeon-view.js 를 안 건드렸다).
   * 3인칭은 인물의 **마지막 이동 방향**(`p.dirX`·`p.dirY` — 무예 방향에도 쓰는 값,
   * 정지해도 그대로 남는다)을 등 뒤로 잡아 따라가는 구도만 새로 얹었다. 원작의
   * 고정 카메라(17행)는 `camAim`(iso)에 그대로 남아 있다 — 기본값은 안 바꿨다.
   */
  function CAMMODE() { return tuned('dg3d.camMode', 'iso') === 'third' ? 'third' : 'iso'; }

  /**
   * 마을(모루골)도 3D 로 그릴까 — **기본이 1로 켜졌다** (사용자 요청, 2026-08-30).
   *
   * 처음엔 마을에 집·우물·대장간 같은 건물 자리가 아예 없어서(NPC 여섯 명과
   * 횃불·기둥뿐) 켜면 빈 돌방에 사람만 서 있는 꼴이라 꺼 두었다. 그래서 던전과
   * 같은 순서로 — `town.js` 의 `DECOR` 에 집 셋·우물·대장간을 얹고
   * (`js/asset3d.js` 의 `house`·`well`·`blacksmith`, `saga-go` 의 건물 창고를
   * 그대로 옮겼다) 이 방의 `buildRoom()` 이 그 자리를 GLB 로 세우게 고친 뒤에
   * 켰다. 도로 끄려면 콘솔에서 `DG.dungeon3d.set('dg3d.town', 0)`.
   */
  function TOWN3D() { return tuned('dg3d.town', 1) ? true : false; }

  function available() { return ready && !failed; }
  function active() {
    if (!available() || !wanted()) { return false; }
    return isTown() ? TOWN3D() : true;
  }

  /* ── 값을 내는 함수 (three 없이도 돈다) ────────────────
   * 자가진단이 이것만 따로 굴린다 — 화면이 없어도 카메라와 조명은 값이다.
   */

  /**
   * 카메라가 어디에 서서 어디를 보나 — **순수 함수다.**
   * 방 가운데를 기준으로 플레이어 쪽으로 조금 끌린다(8절 "플레이어를 정확히
   * 따라가되 너무 흔들리지 않게"). 방을 벗어나 흐르지 않게 **가둔다**.
   */
  function camAim(px, py, W, H, zoom, tilt) {
    var z = (zoom === undefined || zoom <= 0) ? 1 : zoom;
    var tl = tilt === undefined ? 0.62 : tilt;
    /* 방 대각선을 화면에 담을 거리 — 방이 커지면 저절로 물러난다.
       **계수를 눈으로 맞췄다**: 화면에 담기는 세로는 대략 2·dist·tan(fov/2) 인데
       fov 46° 면 0.85·dist 다. 방 대각선(666)을 담으려면 dist 는 그만큼 커야 한다 —
       0.62 로 두었더니 방이 화면 밖으로 나가 어둠만 찍혔다 */
    var span = Math.sqrt(W * W + H * H);
    var dist = span * 1.05 * z;
    /* 플레이어를 따라가되 방 가운데로 **절반만** 당긴다. 온전히 따라가면
       벽에 붙었을 때 방 밖 검은 여백이 화면 절반을 차지한다 */
    var cx = W / 2 + (px - W / 2) * 0.55;
    var cy = H / 2 + (py - H / 2) * 0.55;
    var high = dist * (1 - tl * 0.55);
    var back = dist * tl;
    return {
      pos: { x: cx, y: high, z: cy + back },
      look: { x: cx, y: 0, z: cy },
      dist: dist
    };
  }

  /**
   * 어깨너머 3인칭 — **역시 순수 함수다.** `camAim` 과 달리 방 크기(W·H)를 안
   * 본다 — 방을 담는 구도가 아니라 **인물을 쫓는** 구도라서 방이 커져도 거리가
   * 안 늘어난다(넓은 마을에서 카메라만 저 멀리 물러나면 3인칭의 뜻이 없어진다).
   * `dir`가 0벡터(막 서 있는 참)면 "위" 를 본다 — 세워 두자마자 방향 없이
   * 회전하면 어지럽다.
   */
  function camAim3rd(px, py, dirX, dirY, zoom, tilt) {
    var z = (zoom === undefined || zoom <= 0) ? 1 : zoom;
    var tl = tilt === undefined ? 0.62 : tilt;
    var dx = dirX || 0, dy = dirY || 0;
    var dlen = Math.hypot(dx, dy);
    if (dlen < 0.01) { dx = 0; dy = -1; dlen = 1; }
    dx /= dlen; dy /= dlen;
    /* 2026-08-30 — 실기기(아이폰 사파리)로 보니 처음 값(100/50/65)이 너무
       바짝 붙어 답답했다. 값을 키워 인물이 몸통이 아니라 발밑까지 보이게
       물렀다 — 그래도 iso(방 대각선 기준 700 안팎)보단 훨씬 가깝다, 그게
       "어깨너머" 의 뜻이다. 이제 사람이 핀치·휠로도 더 물릴 수 있다(userZoom). */
    var back = 150 * z;                             // 등 뒤 거리
    var high = 78 * z * (0.5 + tl * 0.8);            // 어깨 위 높이
    var ahead = 75;                                  // 앞을 내다보는 만큼
    return {
      pos: { x: px - dx * back, y: high, z: py - dy * back },
      look: { x: px + dx * ahead, y: 20, z: py + dy * ahead },
      dist: back
    };
  }

  /**
   * 이 층·이 방의 조명 — **순수 함수다.** 층이 깊어질수록 어둡고,
   * 보스 방은 붉게 깔린다(37절 "강한 명암 · 선명한 실루엣").
   */
  function lightPlan(floor, roomKind, dark) {
    var dk = dark === undefined ? 0.82 : dark;
    var deep = Math.min(1, Math.max(0, (floor - 1) / 40));   // 40층에서 가장 깊다
    var boss = roomKind === 'boss';
    /* 마을은 **불을 피워 둔 자리**다 — 던전의 어둠 손잡이를 그대로 물리면
       사람 여섯이 어둠에 잠겨 누가 누구인지 안 보인다. 2D 마을이 어둠을
       0.74 → 0.30 으로 옅게 깔던 그 뜻을 3D 에서도 지킨다. */
    if (roomKind === 'town') {
      return {
        ambient: 0.86, ambientHex: 0x4a4038,
        keyIntensity: 1.15, keyHex: 0xffd9a8,
        torchIntensity: 2600, torchHex: 0xffc070, torchRange: 420,
        fog: { near: 620, far: 2100 },
        bgHex: 0x14100c, boss: false, deep: 0, town: true
      };
    }
    return {
      /* 바탕 밝기 — 어둠 손잡이와 깊이가 함께 깎는다 */
      ambient: (0.62 - deep * 0.20) * (1 - dk * 0.45),
      ambientHex: boss ? 0x3a1c1c : 0x2a2f3c,
      /* 위에서 내리는 빛 하나 — 실루엣을 만든다 */
      keyIntensity: (1.35 - deep * 0.30) * (1 - dk * 0.30),
      keyHex: boss ? 0xff9a7a : 0xbfd0e8,
      /* 플레이어를 따라다니는 횃불 — 원작에서 방을 도려내는 그 빛.
         **세기가 천 단위인 것은 오타가 아니다.** three 는 r155 부터 점광이 물리
         단위(칸델라)라, 예전 감각으로 2 를 주면 **아무것도 안 밝아진다**.
         이 방의 단위는 미터가 아니라 논리 좌표(방이 560×360)라 더 그렇다 */
      torchIntensity: 2200 + dk * 2600,
      torchHex: 0xffb45a,
      torchRange: 300 - deep * 70,
      /* 안개는 **방을 삼키지 않을 만큼만**. 카메라가 700쯤 밖에 서므로
         far 를 600 으로 두면 방 전체가 안개에 잠긴다(밟아 본 함정) */
      fog: { near: 320, far: 1500 - deep * 300 },
      bgHex: boss ? 0x120708 : 0x070809,
      boss: boss, deep: deep
    };
  }

  /* ── 켜기 ───────────────────────────────────────────── */

  function init(el) {
    if (ready || failed) { return available(); }
    if (global.DG_NO_DRAW) { failed = true; return false; }
    T = global.THREE || null;
    if (!T || !el) {
      failed = true;
      /* 조용히 2D 로 떨어지면 "왜 안 보이는지" 를 아무도 못 찾는다(실제로 놓친 적이
         있다) — THREE 가 없다는 건 vendor/three.iife.js 가 안 실렸다는 뜻이라
         꼭 콘솔에 남긴다. */
      if (!T) { console.warn('[던전 3D] THREE 가 없다 — js/vendor/three.iife.js 로드를 확인할 것. 2D 로 돌아간다.'); }
      return false;
    }
    canvas = el;
    try {
      renderer = new T.WebGLRenderer({
        canvas: el, antialias: true, alpha: false,
        preserveDrawingBuffer: !!global.DG_3D_PRESERVE
      });
    } catch (e) {
      failed = true;
      console.warn('[던전 3D] WebGL 렌더러를 못 세웠다 — 이 브라우저/기기가 WebGL 을 못 쓰는 것으로 보인다. 2D 로 돌아간다.', e);
      return false;
    }
    renderer.setPixelRatio(Math.min(2, global.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;

    scene = new T.Scene();
    camera = new T.PerspectiveCamera(46, 1, 1, 3000);

    amb = new T.HemisphereLight(0x2a2f3c, 0x0a0a0c, 0.4);
    scene.add(amb);
    key = new T.DirectionalLight(0xbfd0e8, 0.8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    scene.add(key.target);
    /* 횃불 — 플레이어를 따라다닌다. 원작의 그 도려낸 빛이다 */
    torch = new T.PointLight(0xffb45a, 2200, 300, 1.4);
    scene.add(torch);

    wallGroup = new T.Group(); scene.add(wallGroup);
    actorGroup = new T.Group(); scene.add(actorGroup);
    fxGroup = new T.Group(); scene.add(fxGroup);
    fieldGroup = new T.Group(); scene.add(fieldGroup);

    /* 전투 연출 (3단계) — 글리프판과 풀을 세운다 */
    if (global.DG.fx3d) { global.DG.fx3d.init(T, fxGroup); }

    ready = true;
    resize();
    return true;
  }

  function resize() {
    if (!available() || !canvas) { return; }
    var w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ── 방 ─────────────────────────────────────────────
   * 바닥 하나와 벽 넷. 방이 바뀌면 다시 세운다 — 방마다 크기가 같으므로
   * 색과 소품만 갈린다(층 테마).
   */
  var geoCache = {}, matCache = {};
  function geo(name, make) { if (!geoCache[name]) { geoCache[name] = make(); } return geoCache[name]; }
  function mat(hex, opt) {
    var k = hex + '|' + (opt || '');
    if (matCache[k]) { return matCache[k]; }
    var m = new T.MeshLambertMaterial({ color: new T.Color(hex) });
    if (opt === 'flat') { m.flatShading = true; }
    if (opt === 'glow') { m.emissive = new T.Color(hex); m.emissiveIntensity = 0.7; }
    if (opt === 'water') { m.transparent = true; m.opacity = 0.78; m.depthWrite = false; }
    matCache[k] = m;
    return m;
  }

  function box(g, x, y, z, sx, sy, sz, hex, opt, cast) {
    var m = new T.Mesh(geo('box', function () { return new T.BoxGeometry(1, 1, 1); }), mat(hex, opt));
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    if (cast) { m.castShadow = true; }
    g.add(m);
    return m;
  }

  /** 층 테마 색 — `data-dungeon.js` 의 테마를 읽어 돌 색을 정한다 */
  function themeHex(run) {
    var DD = global.DG.dataDungeon;
    var t = run.theme || (DD ? DD.themeOf(run.floor) : null);
    var c = t && t.wall ? t.wall : '#3a3f4a';
    return parseInt(String(c).replace('#', ''), 16);
  }

  function buildRoom(run) {
    var W = d().ROOM_W, H = d().ROOM_H, WALL = d().WALL;
    while (wallGroup.children.length) { wallGroup.remove(wallGroup.children[0]); }
    var stone = themeHex(run);

    /* 바닥 — 한 판으로 깐다. 격자 무늬는 텍스처 대신 **얇은 홈**으로 낸다
       (37절 "과도한 텍스처 사용 금지") */
    if (!floorMesh) {
      floorMesh = new T.Mesh(geo('floor', function () { return new T.PlaneGeometry(1, 1); }),
        mat(0x2a2a30, 'flat'));
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.receiveShadow = true;
      scene.add(floorMesh);
    }
    floorMesh.position.set(W / 2, 0, H / 2);
    floorMesh.scale.set(W, H, 1);
    floorMesh.material = mat(mix(stone, 0x1a1a20, 0.25), 'flat');

    /* 벽 넷 — 뒤쪽 둘은 높고 앞쪽 둘은 낮다. 안 낮추면 방 안이 안 보인다 */
    var hi = 70, lo = 16;
    box(wallGroup, W / 2, hi / 2, -WALL / 2, W + WALL * 2, hi, WALL, stone, 'flat', true);
    box(wallGroup, -WALL / 2, hi / 2, H / 2, WALL, hi, H, stone, 'flat', true);
    box(wallGroup, W / 2, lo / 2, H + WALL / 2, W + WALL * 2, lo, WALL, mix(stone, 0x000000, 0.3), 'flat', false);
    box(wallGroup, W + WALL / 2, lo / 2, H / 2, WALL, lo, H, mix(stone, 0x000000, 0.3), 'flat', false);

    /* 방마다 다른 소품 — 상자·우물·사당은 판정이 자리를 정해 준다 */
    var r = run.room;
    if (r && r.chest && !r.chest.taken) {
      box(wallGroup, r.chest.x, 9, r.chest.y, 26, 18, 20, 0x8a6a34, 'flat', true);
      box(wallGroup, r.chest.x, 19, r.chest.y, 28, 4, 22, 0xd9b45a, 'glow', false);
    }
    if (r && r.well && !r.well.used) {
      box(wallGroup, r.well.x, 11, r.well.y, 30, 22, 30, 0x555b66, 'flat', true);
      box(wallGroup, r.well.x, 22, r.well.y, 22, 2, 22, 0x3aa9c9, 'glow', false);
    }
    if (r && r.shrine && !r.shrine.used) {
      box(wallGroup, r.shrine.x, 16, r.shrine.y, 18, 32, 18, 0x6a5c8c, 'flat', true);
      box(wallGroup, r.shrine.x, 34, r.shrine.y, 10, 10, 10, 0xc9a3ff, 'glow', false);
    }
    if (r && r.vein && !r.vein.used) {
      /* 채광방(POI: Cave) — 돌무더기에 박힌 광맥. 상자·우물·사당과 같은
         "바닥에 박힌 소품" 요령이다 */
      box(wallGroup, r.vein.x, 8, r.vein.y, 34, 16, 30, mix(stone, 0x000000, 0.3), 'flat', true);
      box(wallGroup, r.vein.x - 6, 13, r.vein.y + 4, 8, 8, 8, 0x7ee091, 'glow', false);
      box(wallGroup, r.vein.x + 7, 12, r.vein.y - 3, 7, 7, 7, 0xe8c15a, 'glow', false);
    }
    if (r && r.merchant && !r.merchant.used) {
      /* 행상(POI: Merchant) — 마을 장터의 그 좌판(`tent`/MarketStand GLB)을
         똑같이 세운다. 다 팔았으면(=used) 좌판을 걷은 것으로 보고 안 세운다 */
      var AS3m = AS();
      var standShape = function () {
        var sg = new T.Group();
        box(sg, 0, 34, 0, 46, 68, 40, 0x5a4a3a, 'flat', true);
        return sg;
      };
      var stnode = AS3m ? AS3m.build('tent', 'poi:' + r.merchant.x + ':' + r.merchant.y,
        68, null, standShape) : standShape();
      stnode.position.set(r.merchant.x, 0, r.merchant.y);
      wallGroup.add(stnode);
    }
    if (r && r.puzzle) {
      /* 퍼즐방(POI: Puzzle) — 제단 셋. 맞게 밟은 자리는 금빛으로 켜진다 —
         2D 의 🔆/🗿 아이콘과 같은 신호를 3D 에서도 준다 */
      var pods3 = r.puzzle.pods;
      for (var pzk = 0; pzk < pods3.length; pzk++) {
        var pod3 = pods3[pzk];
        box(wallGroup, pod3.x, 5, pod3.y, 22, 10, 22, mix(stone, 0xffffff, 0.1), 'flat', true);
        box(wallGroup, pod3.x, 12, pod3.y, 9, 9, 9,
          pod3.lit ? 0xe8c15a : 0x555b66, pod3.lit ? 'glow' : 'flat', false);
      }
    }
    if (r && r.captive) {
      /* 이벤트방(POI: Event) — 갇힌 우리. 풀려나면(freed) 창살을 걷고
         금빛 표식만 남긴다(2D 의 🙏/⛓️ 와 같은 신호) */
      var cp = r.captive;
      if (!cp.freed) {
        box(wallGroup, cp.x, 20, cp.y, 34, 40, 34, 0x2a2a30, 'flat', true);
        box(wallGroup, cp.x, 20, cp.y - 15, 30, 36, 3, 0x8a8a92, 'flat', false);
        box(wallGroup, cp.x, 20, cp.y + 15, 30, 36, 3, 0x8a8a92, 'flat', false);
      } else {
        box(wallGroup, cp.x, 6, cp.y, 26, 3, 26, 0xffd489, 'glow', false);
      }
    }
    /* 장식 — 기둥·횃불·바닥 균열. 판정이 자리를 정해 두고(`decor`) 2D 가 오래 그려
       온 것들이다. 이것이 없으면 방이 **빈 상자**로 보인다 — 마을은 특히 그렇다
       (모루골의 집과 불이 전부 여기 들어 있다).
       항아리(`jar`)는 부수면 사라지므로 여기 세우지 않는다 — 방이 바뀔 때만 도는
       자리라 부순 뒤에도 남는다. 그것은 배우로 다룰 몫이다. */
    var dec = (r && r.decor) || [], dj, o;
    for (dj = 0; dj < dec.length; dj++) {
      o = dec[dj];
      if (o.t === 'pillar') {
        box(wallGroup, o.x, 34, o.y, 22, 68, 22, mix(stone, 0xffffff, 0.08), 'flat', true);
        box(wallGroup, o.x, 70, o.y, 28, 6, 28, mix(stone, 0x000000, 0.2), 'flat', true);
      } else if (o.t === 'torch') {
        box(wallGroup, o.x, 20, o.y, 6, 40, 6, 0x4a3a2a, 'flat', false);
        box(wallGroup, o.x, 44, o.y, 11, 11, 11, 0xffb45a, 'glow', false);
      } else if (o.t === 'crack') {
        var cl = o.len || 30;
        var cm = box(wallGroup, o.x, 0.6, o.y, cl, 1.2, 4, mix(stone, 0x000000, 0.7), 'flat', false);
        cm.rotation.y = -(o.a || 0);
        /* 비밀(POI: Secret) — 찾기 전엔 여느 균열과 똑같다. 찾은 뒤에만
           금빛 반짝임을 얹는다(2D 의 ✨ 와 같은 신호) */
        if (o.secret && o.found) {
          box(wallGroup, o.x, 4, o.y, 6, 6, 6, 0xffd489, 'glow', false);
        }
      } else if (o.t === 'house') {
        /* 마을(모루골) 집 — `town.js`의 `DECOR`에만 나온다(던전 방엔 없다).
           넷을 자리 씨앗으로 섞어 세운다 — 나무·바위와 같은 요령(`piece()` 참고) */
        var AS3h = AS();
        var houseShape = function () {
          var sg = new T.Group();
          box(sg, 0, o.h / 2, 0, 90, o.h, 80, mix(stone, 0xffffff, 0.1), 'flat', true);
          box(sg, 0, o.h + 14, 0, 100, 28, 92, mix(stone, 0x000000, 0.32), 'flat', true);
          return sg;
        };
        var hnode = AS3h ? AS3h.build('house', 'town:' + o.x + ':' + o.y,
          o.h * 1.3, null, houseShape) : houseShape();
        hnode.position.set(o.x, 0, o.y);
        wallGroup.add(hnode);
      } else if (o.t === 'well') {
        var AS3w = AS();
        var wellShape = function () {
          var sg = new T.Group();
          box(sg, 0, o.h * 0.4, 0, 30, o.h * 0.8, 30, mix(stone, 0x000000, 0.2), 'flat', true);
          return sg;
        };
        var wenode = AS3w ? AS3w.build('well', 'town:' + o.x + ':' + o.y,
          o.h, null, wellShape) : wellShape();
        wenode.position.set(o.x, 0, o.y);
        wallGroup.add(wenode);
      } else if (o.t === 'blacksmith') {
        var AS3b = AS();
        var smithShape = function () {
          var sg = new T.Group();
          box(sg, 0, o.h / 2, 0, 100, o.h, 90, mix(stone, 0x000000, 0.25), 'flat', true);
          return sg;
        };
        var smnode = AS3b ? AS3b.build('blacksmith', 'town:' + o.x + ':' + o.y,
          o.h * 1.2, null, smithShape) : smithShape();
        smnode.position.set(o.x, 0, o.y);
        wallGroup.add(smnode);
      }
    }

    /* 문 — 다음 방으로 가는 자리. 원작처럼 벽에 난 밝은 틈이다 */
    if (r && r.doors) {
      for (var i = 0; i < r.doors.length; i++) {
        var dr = r.doors[i];
        if (dr.x === undefined) { continue; }
        box(wallGroup, dr.x, 14, dr.y, 24, 28, 8,
          r.cleared ? 0xffd489 : 0x4a4f5a, r.cleared ? 'glow' : 'flat', false);
      }
    }
  }

  /* ── 들판 (2단계) ────────────────────────────────────
   * `field3d.js` 가 **무엇이 어디 서는지**를 값으로 낸다. 여기서는 그 목록을 받아
   * 도형으로 세우기만 한다 — 판단과 그림을 갈라 둔 것이다(진단이 값만 본다).
   */
  function buildField(run) {
    var F = global.DG.field3d;
    if (!fieldGroup) { return; }
    while (fieldGroup.children.length) { fieldGroup.remove(fieldGroup.children[0]); }
    if (!F || !FIELD()) { fieldKey = null; return; }

    var W = d().ROOM_W, H = d().ROOM_H;
    var DD = global.DG.dataDungeon;
    var th = run.theme || (DD ? DD.themeOf(run.floor) : null);
    var seed = F.seedOf(run.floor, run.roomIdx, th && th.name);
    var R = FIELD_R(), dens = FIELD_D();
    var stone = themeHex(run);
    var cx, cz, i;

    /* 바깥 땅 — 조각마다 한 판씩 깔고 **네 귀퉁이의 높이**로 기울인다.
       한 판을 크게 깔면 높낮이가 안 나온다(4절이 바라는 것이 그 높낮이다) */
    for (cz = -R; cz <= R; cz++) {
      for (cx = -R; cx <= R; cx++) {
        var ring = F.ringOf(cx, cz, W, H);
        if (ring === 0) { continue; }             // 방이 걸친 조각은 방 바닥이 맡는다
        var gx = cx * F.CHUNK, gz = cz * F.CHUNK;
        var hh = F.heightAt(gx + F.CHUNK / 2, gz + F.CHUNK / 2, seed, W, H);
        var tile = box(fieldGroup, gx + F.CHUNK / 2, hh - 6, gz + F.CHUNK / 2,
          F.CHUNK + 2, 12, F.CHUNK + 2, mix(stone, 0x141018, 0.62), 'flat', false);
        tile.receiveShadow = true;

        var list = F.chunkAt(cx, cz, seed, ring, dens);
        for (i = 0; i < list.length; i++) { piece(list[i], seed, W, H, stone); }
      }
    }
    fieldKey = seed + ':' + R + ':' + Math.round(dens * 100);
  }

  /** 들판 조각 하나를 도형으로 세운다 — 나무·바위는 사가고와 같은 GLB, 나머지는
   *  여전히 도형이다(PLAN 4절의 우선순위 ⑤나무 ⑥바위까지만 이번에 옮겼다) */
  function piece(p, seed, W, H, stone) {
    var F = global.DG.field3d;
    var g = fieldGroup;
    var y = F.heightAt(p.x, p.z, seed, W, H);
    var s = p.s || 1;
    var AS3 = AS();
    if (p.t === 'tree') {
      var treeShape = function () {
        var sg = new T.Group();
        box(sg, 0, p.h * 0.22, 0, 9 * s, p.h * 0.44, 9 * s, 0x3a2c1e, 'flat', true);
        box(sg, 0, p.h * 0.68, 0, p.h * 0.62 * s, p.h * 0.7, p.h * 0.62 * s, 0x24361f, 'flat', true);
        return sg;
      };
      var tnode = AS3 ? AS3.build('tree', seed + ':' + Math.round(p.x) + ':' + Math.round(p.z),
        p.h * 1.35 * s, null, treeShape) : treeShape();
      tnode.position.set(p.x, y, p.z);
      tnode.rotation.y = p.rot || 0;
      g.add(tnode);
    } else if (p.t === 'rock') {
      var rockShape = function () {
        var sg = new T.Group();
        box(sg, 0, p.h * 0.4, 0, p.h * 1.3 * s, p.h * 0.9, p.h * 1.1 * s, mix(stone, 0x000000, 0.35), 'flat', true);
        return sg;
      };
      var rnode = AS3 ? AS3.build('rock', seed + ':' + Math.round(p.x) + ':' + Math.round(p.z),
        p.h * 0.9 * s, null, rockShape) : rockShape();
      rnode.position.set(p.x, y, p.z);
      rnode.rotation.y = p.rot || 0;
      g.add(rnode);
    } else if (p.t === 'pillar') {
      /* 폐허의 부러진 기둥 — 꼭 맞는 낱개 기둥 에셋이 없어 무너진 아치(Arch)로
         대신한다(사가고가 이미 "사당·폐허의 다른 후보"로 적어 둔 것) */
      var pillarShape = function () {
        var sg = new T.Group();
        box(sg, 0, p.h / 2, 0, 16, p.h, 16, mix(stone, 0xffffff, 0.12), 'flat', true);
        return sg;
      };
      var pnode = AS3 ? AS3.build('pillar', seed + ':' + Math.round(p.x) + ':' + Math.round(p.z),
        p.h, null, pillarShape) : pillarShape();
      pnode.position.set(p.x, y, p.z);
      g.add(pnode);
    } else if (p.t === 'wall') {
      var wallShape = function () {
        var sg = new T.Group();
        box(sg, 0, p.h / 2, 0, 90, p.h, 14, mix(stone, 0x000000, 0.2), 'flat', true);
        return sg;
      };
      var wnode = AS3 ? AS3.build('wall', seed + ':' + Math.round(p.x) + ':' + Math.round(p.z),
        p.h, null, wallShape) : wallShape();
      wnode.position.set(p.x, y, p.z);
      wnode.rotation.y = p.rot || 0;
      g.add(wnode);
    } else if (p.t === 'cliff') {
      /* 절벽 — 산 덩이(Mountain) 에셋을 세운다. 4절의 "높낮이" 를 눈에 보이게 하는 것 */
      var cliffShape = function () {
        var sg = new T.Group();
        var cl = box(sg, 0, p.h * 0.4, 0, 120 * s, p.h, 90 * s, mix(stone, 0x000000, 0.45), 'flat', true);
        cl.rotation.set(0.08, 0, 0.06);
        return sg;
      };
      var clnode = AS3 ? AS3.build('cliff', seed + ':' + Math.round(p.x) + ':' + Math.round(p.z),
        p.h * 1.8 * s, null, cliffShape) : cliffShape();
      clnode.position.set(p.x, y, p.z);
      clnode.rotation.y = p.rot || 0;
      g.add(clnode);
    } else if (p.t === 'path') {
      var pt = box(g, p.x, y + 1, p.z, F.CHUNK + 2, 3, 46, 0x4a3f30, 'flat', false);
      pt.rotation.y = p.rot;
      pt.receiveShadow = true;
    } else if (p.t === 'post') {
      box(g, p.x, y + p.h / 2, p.z, 6, p.h, 6, 0x5a4a34, 'flat', true);
      box(g, p.x, y + p.h, p.z, 30, 8, 4, 0x6b5a3f, 'flat', false);
    } else if (p.t === 'pond') {
      var pd = box(g, p.x, y + 2, p.z, F.CHUNK * 0.8 * s, 3, F.CHUNK * 0.7 * s,
        0x1f4a63, 'flat', false);
      pd.material = mat(0x1f4a63, 'water');
    } else if (p.t === 'reed') {
      box(g, p.x, y + p.h / 2, p.z, 3, p.h, 3, 0x3f5a34, 'flat', false);
    } else if (p.t === 'cavemouth') {
      /* 동굴 입구 — 사가고가 이미 "광산 어귀"로 적어 둔 그 Mine 을 세운다 */
      var caveShape = function () {
        var sg = new T.Group();
        box(sg, 0, p.h * 0.45, 0, p.h * 1.5, p.h, p.h * 1.2, mix(stone, 0x000000, 0.5), 'flat', true);
        return sg;
      };
      var cvnode = AS3 ? AS3.build('cavemouth', seed + ':' + Math.round(p.x) + ':' + Math.round(p.z),
        p.h * 1.3, null, caveShape) : caveShape();
      cvnode.position.set(p.x, y, p.z);
      cvnode.rotation.y = p.rot || 0;
      g.add(cvnode);
      /* 입구는 **새까맣다** — 빛이 안 닿는 자리가 있어야 굴로 보인다(GLB 위에도 그대로 얹는다) */
      box(g, p.x, y + p.h * 0.3, p.z + p.h * 0.6, p.h * 0.5, p.h * 0.55, 6,
        0x000000, '', false).rotation.y = p.rot;
    } else if (p.t === 'altar') {
      /* 제단 — 사가고가 "사당" 후보로 적어 둔 Temple 을 세운다. 도형이 얹던
         떠 있는 보랏빛 구슬은 **표식이라 그대로 남긴다**(멀리서도 제단인 줄 안다) */
      var altarShape = function () {
        var sg = new T.Group();
        box(sg, 0, 6, 0, 60, 12, 60, mix(stone, 0xffffff, 0.2), 'flat', true);
        box(sg, 0, p.h * 0.6, 0, 20, p.h * 0.8, 20, 0x4a3f6b, 'flat', true);
        return sg;
      };
      var alnode = AS3 ? AS3.build('altar', seed + ':' + Math.round(p.x) + ':' + Math.round(p.z),
        p.h * 1.1, null, altarShape) : altarShape();
      alnode.position.set(p.x, y, p.z);
      g.add(alnode);
      box(g, p.x, y + p.h + 6, p.z, 14, 14, 14, 0xc9a3ff, 'glow', false);
    } else if (p.t === 'tent') {
      /* 천막 — 꼭 맞는 텐트 에셋은 못 구했다. 기둥+지붕 얼개가 비슷한
         장터 좌판(MarketStand)을 대신 세운다(`asset3d.js` 주석 참고) */
      var tentShape = function () {
        var sg = new T.Group();
        box(sg, 0, p.h / 2, 0, 44, p.h, 40, 0x5a4a3a, 'flat', true);
        return sg;
      };
      var tenode = AS3 ? AS3.build('tent', seed + ':' + Math.round(p.x) + ':' + Math.round(p.z),
        p.h, null, tentShape) : tentShape();
      tenode.position.set(p.x, y, p.z);
      tenode.rotation.y = p.rot || 0;
      g.add(tenode);
    } else if (p.t === 'fire') {
      /* 모닥불 — CC0 로 딱 맞는 캠프파이어를 못 구했다(saga-go 창고에도 없다).
         억지로 안 어울리는 것을 끼우느니 **도형 그대로** 둔다 — 잿더미(어두운
         상자)+타오르는 불씨(빛나는 상자)는 그 자체로 충분히 읽힌다. */
      box(g, p.x, y + 4, p.z, 26, 8, 26, 0x2f2a24, 'flat', false);
      box(g, p.x, y + p.h, p.z, 14, 16, 14, 0xff7a2a, 'glow', false);
    }
  }

  function mix(a, b, k) {
    var ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    var br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    return (Math.round(ar + (br - ar) * k) << 16) |
           (Math.round(ag + (bg - ag) * k) << 8) |
            Math.round(ab + (bb - ab) * k);
  }

  /* ── 맞은 순간 번쩍인다 (3단계 · PLAN 51절 Hit Flash) ──────
   * 재질은 `mat()` 이 색마다 하나씩 만들어 모든 배우가 나눠 쓴다.
   * 그대로 만지면 적 하나가 맞을 때 방 전체가 번쩍인다 —
   * 그래서 **몸통만** 사본을 들려 준다.
   */
  function ownMat(m) { m.material = m.material.clone(); return m.material; }

  /* ── 배우 ───────────────────────────────────────────
   * 사람과 적을 도형으로 조립한다. 원작 에셋은 안 쓴다 —
   * 크기·색만 판정에서 읽어 온다(체력·등급이 그림에 드러나야 한다).
   */
  /* ── 이름표 ─────────────────────────────────────────
   * 마을에서는 **누구인지가 곧 기능**이다 — 야장에게 가야 물건을 박고, 행상에게
   * 가야 산다. 2D 는 머리 위에 글자를 얹어 그것을 알렸다. 3D 에서 그 글자가
   * 사라지면 마당에 사람 여섯이 말없이 서 있는 그림이 된다.
   * 글자판은 이름마다 하나만 만들어 두고 돌려 쓴다(아홉 장이면 끝이다).
   */
  var labelTexCache = {};
  function labelTex(text) {
    if (labelTexCache[text]) { return labelTexCache[text]; }
    var cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    var c = cv.getContext('2d');
    c.font = '600 27px "Malgun Gothic", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    var w = Math.min(248, c.measureText(text).width + 22);
    c.fillStyle = 'rgba(6,7,10,0.62)';
    c.fillRect((256 - w) / 2, 13, w, 38);
    c.fillStyle = '#f2e4c2';
    c.fillText(text, 128, 33);
    var t = new T.CanvasTexture(cv);
    t.needsUpdate = true;
    labelTexCache[text] = t;
    return t;
  }

  /** 이름표 한 장 — 카메라를 늘 마주 본다. `depthTest` 를 끈 것은 기둥 뒤에
      선 사람도 누구인지 읽히게 하려는 것이다(마을이라 그래도 된다) */
  function labelNode(text, y, w) {
    var m = new T.SpriteMaterial({ map: labelTex(text), transparent: true, depthTest: false });
    var s = new T.Sprite(m);
    s.position.set(0, y, 0);
    s.scale.set(w, w / 4, 1);
    return s;
  }

  /**
   * 마을의 사람·표식 하나에 "말이 걸리나" 를 입힌다.
   * 이름표 아홉 장이 늘 같은 진하기로 떠 있으면 마당이 글자로 덮인다 —
   * **멀리 있는 것은 흐리게**, 말이 걸리는 거리에 들면 진하게 하고 발밑 고리를 켠다.
   */
  function townMark(node, dist, talkR) {
    var near = dist < talkR;
    if (node.userData.ring) { node.userData.ring.visible = near; }
    var lb = node.userData.label;
    if (lb && lb.material) {
      lb.material.opacity = near ? 1 : core.clamp(1 - (dist - talkR) / 260, 0.34, 0.9);
    }
  }

  function hexOf(css, def) {
    if (!css) { return def; }
    var n = parseInt(String(css).replace('#', ''), 16);
    return isNaN(n) ? def : n;
  }

  /** asset3d — 사가고와 같은 것을 쓴다(사가블로 4단계, `assets/ASSET_LICENSES.md`) */
  function AS() { return global.DG.asset3d; }

  function meShape() {
    var sg = new T.Group();
    box(sg, 0, 16, 0, 14, 22, 10, 0xd9c9a8, 'flat', true);       // 몸
    box(sg, 0, 32, 0, 11, 11, 11, 0xe8c9a4, 'flat', true);       // 머리
    box(sg, 0, 40, 0, 15, 4, 15, 0x3a3f4a, 'flat', false);       // 갓
    box(sg, 9, 18, 0, 3, 26, 3, 0xb9c2cf, 'flat', true);         // 칼
    return sg;
  }
  function npcShape(nc) {
    var sg = new T.Group();
    box(sg, 0, 15, 0, 13, 20, 10, nc, 'flat', true);
    box(sg, 0, 30, 0, 11, 11, 11, 0xe8c9a4, 'flat', true);
    box(sg, 0, 38, 0, 14, 4, 14, 0x2f333c, 'flat', false);
    return sg;
  }
  function foeShape(r, hh, col) {
    var sg = new T.Group();
    box(sg, 0, hh / 2, 0, r * 1.5, hh, r * 1.2, col, 'flat', true);
    box(sg, 0, hh + r * 0.5, 0, r * 0.9, r * 0.9, r * 0.9, mix(col, 0xffffff, 0.2), 'flat', true);
    return sg;
  }

  /**
   * 몬스터 다양화(PLAN 14절) — 사람 형 적의 무기·투구·망토·수염을 `data-enemy.js`
   * 의 `look` 그대로 걸친다. 옛 도형 시절부터 있던 정보였는데(황건적은 몽둥이,
   * 왜장은 투구+망토…) 3D 화면엔 여태 하나도 안 실렸다 — 다들 같은 사람 모델에
   * 색만 다른 채로 섰다. GLB 갈아 끼우기와 별개로 **`g`(바깥 껍데기)에 얹는다** —
   * `foeBody` 안쪽은 GLB 가 늦게 와서 통째로 갈릴 수 있지만 이 장식은 그대로다.
   */
  function foeGear(g, look, hh, r, tint) {
    var handX = r * 1.05, handZ = r * 0.25, shoulderY = hh * 0.68;
    var wcol = 0xb9c2cf, woodcol = 0x5a4a34;
    if (look.weapon === 'club') {
      box(g, handX, shoulderY, handZ, r * 0.5, r * 1.1, r * 0.5, woodcol, 'flat', true);
    } else if (look.weapon === 'axe') {
      box(g, handX, shoulderY, handZ, r * 0.2, r * 1.6, r * 0.2, woodcol, 'flat', true);
      box(g, handX, shoulderY + r * 0.7, handZ, r * 0.85, r * 0.5, r * 0.14, wcol, 'flat', true);
    } else if (look.weapon === 'sword') {
      box(g, handX, shoulderY, handZ, r * 0.15, r * 1.7, r * 0.15, wcol, 'flat', true);
    } else if (look.weapon === 'spear') {
      box(g, handX, shoulderY, handZ, r * 0.12, r * 2.6, r * 0.12, woodcol, 'flat', true);
      box(g, handX, shoulderY + r * 1.2, handZ, r * 0.13, r * 0.5, r * 0.13, wcol, 'flat', true);
    } else if (look.weapon === 'halberd') {
      box(g, handX, shoulderY, handZ, r * 0.13, r * 2.8, r * 0.13, woodcol, 'flat', true);
      box(g, handX, shoulderY + r * 1.3, handZ, r * 0.85, r * 0.6, r * 0.15, wcol, 'flat', true);
    } else if (look.weapon === 'staff') {
      box(g, handX, shoulderY, handZ, r * 0.12, r * 2.2, r * 0.12, woodcol, 'flat', true);
      box(g, handX, shoulderY + r * 1.1, handZ, r * 0.4, r * 0.4, r * 0.4, 0x9fe8ff, 'glow', false);
    } else if (look.weapon === 'bow') {
      var bow = new T.Mesh(geo('bowArc', function () { return new T.TorusGeometry(1, 0.09, 5, 10, Math.PI * 1.4); }),
        mat(woodcol, 'flat'));
      bow.scale.setScalar(r * 0.85);
      bow.position.set(handX, shoulderY, handZ);
      bow.rotation.z = Math.PI / 2;
      bow.castShadow = true;
      g.add(bow);
    }
    if (look.cape) {
      var cape = box(g, 0, hh * 0.42, -r * 0.85, r * 1.25, hh * 0.7, r * 0.13,
        mix(tint, 0x000000, 0.25), 'flat', true);
      cape.rotation.x = -0.1;
    }
    var headY = hh + r * 0.5;
    if (look.helm === 'helmet') {
      box(g, 0, headY + r * 0.35, 0, r * 1.0, r * 0.55, r * 1.0, 0x5a5a62, 'flat', true);
    } else if (look.helm === 'gapju') {
      var cone = new T.Mesh(geo('helmCone', function () { return new T.ConeGeometry(1, 1.3, 8); }),
        mat(woodcol, 'flat'));
      cone.scale.setScalar(r * 0.65);
      cone.position.set(0, headY + r * 0.55, 0);
      cone.castShadow = true;
      g.add(cone);
    } else if (look.helm === 'crown') {
      var ring = new T.Mesh(geo('crownRing', function () { return new T.TorusGeometry(1, 0.18, 6, 12); }),
        mat(0xe8c15a, 'glow'));
      ring.scale.setScalar(r * 0.55);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, headY + r * 0.5, 0);
      g.add(ring);
    } else if (look.helm === 'plume') {
      box(g, 0, headY + r * 0.35, 0, r * 1.0, r * 0.55, r * 1.0, 0x5a5a62, 'flat', true);
      box(g, 0, headY + r * 0.85, 0, r * 0.2, r * 0.85, r * 0.2, mix(tint, 0xff5a3a, 0.5), 'glow', false);
    }
    if (look.beard) {
      box(g, 0, headY - r * 0.35, r * 0.45, r * 0.4, r * 0.35, r * 0.22, 0x3a3226, 'flat', false);
    }
  }

  /** 지금 보이는 것(도형이든 GLB 든) 위 모든 메시의 재질 사본 — 맞으면 이걸 번쩍인다.
   *  GLB 가 도형에서 갈아 끼워지는 순간 사본이 낡으므로, 그 전환(assetState)이
   *  바뀔 때만 다시 뜬다(매 프레임 새로 뜨면 낭비다). */
  function ensureFlash(node) {
    var AS3 = AS();
    var st = node.userData.assetState;
    if (node.userData.flash && node.userData.flashState === st) { return node.userData.flash; }
    var mats = AS3 ? AS3.ownAllMat(node.children[0]) : [];
    node.userData.flash = mats;
    node.userData.flashState = st;
    return mats;
  }

  /** 그림자(shade) 정예의 분신 — 판정엔 있어도 3D 는 여태 본체와 똑같이 서
   *  있었다(몬스터 다양화가 남긴 숙제). 지금 보이는 메시를 사본 떠서 반투명
   *  보랏빛으로 물들인다. `ensureFlash` 와 달리 **`mixerNode`(진짜 shell) 의
   *  `assetState`** 를 직접 본다 — 분신은 수명이 짧아 상자에서 GLB 로 갈아
   *  끼워지는 순간을 놓치면 그냥 평범한 적으로 보인다. */
  function ensureShade(node) {
    var body = node.userData.mixerNode;
    if (!body) { return; }
    var st = body.userData.assetState;
    if (node.userData.shadeState === st) { return; }
    var purple = new T.Color(0x9a7ad9);
    body.traverse(function (o) {
      if (!o.isMesh || !o.material) { return; }
      var m = Array.isArray(o.material) ? o.material[0].clone() : o.material.clone();
      m.transparent = true;
      m.opacity = 0.5;
      m.depthWrite = false;
      if (m.emissive) { m.emissive.copy(purple); m.emissiveIntensity = Math.max(m.emissiveIntensity || 0, 0.5); }
      else if (m.color) { m.color.lerp(purple, 0.4); }
      o.material = Array.isArray(o.material) ? [m] : m;
    });
    node.userData.shadeState = st;
  }

  function buildActor(kind, ref) {
    var g = new T.Group();
    var AS3 = AS();
    if (kind === 'npc') {
      /* 마을 사람 — 사가고와 같은 GLB(사람 창고)를 쓴다. 진영색 대신
         **이 사람 고유의 옷 빛깔**로 물들인다(town.js 의 뜻 그대로) */
      var nc = hexOf(ref && ref.color, 0x8a6f4e);
      var body = AS3 ? AS3.buildHero('npc:' + ((ref && ref.key) || ''), 40, ref && ref.color,
        function () { return npcShape(nc); }) : npcShape(nc);
      g.add(body);
      g.userData.mixerNode = body;
      /* 발밑 고리 — 말이 걸리는 거리에 들어서면 켜진다 */
      var nr = box(g, 0, 0.8, 0, 44, 1.6, 44, 0xffd489, 'glow', false);
      nr.visible = false;
      g.userData.ring = nr;
      g.userData.label = labelNode(((ref && ref.emoji) || '') + ' ' + ((ref && ref.name) || ''), 54, 72);
      g.add(g.userData.label);
      return g;
    }
    if (kind === 'mark') {
      /* 표식 — 사람이 아니라 **밟는 것**이다. 셋의 성격이 달라 빛깔로 가른다 */
      var mkey = (ref && ref.key) || '';
      var glow = mkey === 'waypoint' ? 0x3aa9c9 : (mkey === 'vow' ? 0xe06565 : 0xffb45a);
      var base = mkey === 'gate' ? 0x14161c : 0x4a4f5a;
      box(g, 0, 2.5, 0, 46, 5, 46, base, 'flat', false);         // 밟는 자리
      if (mkey === 'gate') {
        /* 굴혈 — 내려가는 구멍이다. 기둥을 세우지 않고 **바닥을 뚫어** 보이게 한다 */
        box(g, 0, 4, 0, 30, 3, 30, 0x000000, 'flat', false);
        box(g, 0, 6, 0, 22, 1.5, 22, glow, 'glow', false);
      } else if (mkey === 'waypoint') {
        box(g, 0, 12, 0, 20, 20, 20, 0x2a3a4a, 'flat', true);
        box(g, 0, 25, 0, 26, 4, 26, glow, 'glow', false);
      } else {
        box(g, 0, 17, 0, 16, 34, 8, 0x6a6a75, 'flat', true);     // 비석
        box(g, 0, 36, 0, 12, 4, 10, glow, 'glow', false);
      }
      var mr = box(g, 0, 0.8, 0, 56, 1.6, 56, glow, 'glow', false);
      mr.visible = false;
      g.userData.ring = mr;
      g.userData.label = labelNode(((ref && ref.emoji) || '') + ' ' + ((ref && ref.name) || ''), 50, 82);
      g.add(g.userData.label);
      return g;
    }
    if (kind === 'me') {
      var meBody = AS3 ? AS3.buildHero('me', 42, null, meShape) : meShape();
      g.add(meBody);
      g.userData.mixerNode = meBody;
      return g;
    }
    var r = (ref && ref.r) || 12;
    var enemyDef = ref && ref.ref;                    // data-enemy.js 의 그 줄(kind·color·look)
    /* 정예는 여덟 갈래(날쌘·완강한·사나운·되살아나는·가시 돋친·그림자·철갑·호신)
       마다 제 빛깔이 `ELITES` 표에 이미 있는데(`js/dungeon.js`), 3D 는 여태
       전부 같은 보랏빛으로 뭉뚱그렸다 — 그 표의 색을 그대로 쓴다 */
    var DGd = global.DG.dungeon;
    var eliteDef = ref && ref.elite && DGd ? DGd.eliteOf(ref.elite) : null;
    var col = ref && ref.boss ? 0x9a3a3a : (eliteDef ? hexOf(eliteDef.color, 0x8a5cc0) :
      hexOf(enemyDef && enemyDef.color, 0x6a6a75));
    var hh = r * (ref && ref.boss ? 2.6 : 1.9);
    var isBeast = !!(enemyDef && enemyDef.kind === 'beast');
    var foeBody;
    if (AS3 && isBeast) {
      /* 짐승 형 적(들개·코끼리병…) — 큰 놈은 소, 작은 놈은 늑대 GLB 로 선다
         (몬스터 다양화 — 딱 맞는 코끼리는 없어 몸집 큰 네발짐승으로 대신한다).
         세력색은 안 물들인다(짐승 제 털빛이 맞다) */
      var bigBeast = !!(enemyDef && /코끼리/.test(enemyDef.name || ''));
      foeBody = AS3.build(bigBeast ? 'beast_big' : 'beast',
        (ref && ref.ref && ref.ref.name) || 'beast',
        hh + r * 0.95, null, function () { return foeShape(r, hh, col); });
    } else if (AS3) {
      /* 사람 형 적(황건적·왜구…) — 사람 창고 GLB. 보스·정예가 아니면
         **이 적의 원래 빛깔**(data-enemy.js 의 color)로 물들인다 */
      var tint = ref && (ref.boss || ref.elite) ? col : (enemyDef && enemyDef.color) || null;
      foeBody = AS3.buildHero((enemyDef && enemyDef.name) || 'foe', hh + r * 0.95, tint,
        function () { return foeShape(r, hh, col); });
    } else {
      foeBody = foeShape(r, hh, col);
    }
    g.add(foeBody);
    g.userData.mixerNode = foeBody;
    /* 엘리트·보스는 눈이 빛난다 — 실루엣만으로 위험을 읽게 한다(GLB 위에도 그대로 얹는다) */
    if (ref && (ref.boss || ref.elite)) {
      box(g, 0, hh + r * 0.6, r * 0.5, r * 0.7, r * 0.2, r * 0.2, 0xff5a3a, 'glow', false);
    }
    /* 정예는 발밑에 제 빛깔 고리를 켠다 — 위 눈빛은 "정예다" 만 알리고,
       이 고리 색이 "무슨 정예인지" 를 멀리서도 가른다 */
    if (eliteDef) {
      box(g, 0, 1.2, 0, r * 2.3, 2, r * 2.3, hexOf(eliteDef.color, 0x8a5cc0), 'glow', false);
    }
    /* 몬스터 다양화 — 사람 형 적은 무기·투구·망토·수염을 `look` 데이터 그대로
       걸친다. 옛 도형 시절부터 있던 정보인데 여태 3D 화면엔 하나도 안 실렸다 */
    if (!isBeast && enemyDef && enemyDef.look) {
      foeGear(g, enemyDef.look, hh, r, col);
    }
    return g;
  }

  function actorOf(k, kind, ref) {
    var a = actors[k];
    if (a) { a.seen = frame; return a; }
    var node = buildActor(kind, ref);
    actorGroup.add(node);
    actors[k] = { node: node, seen: frame, ang: 0 };
    return actors[k];
  }

  function sweep() {
    for (var k in actors) {
      if (!Object.prototype.hasOwnProperty.call(actors, k)) { continue; }
      if (actors[k].seen === frame) { continue; }
      actorGroup.remove(actors[k].node);
      delete actors[k];
    }
  }

  /* ── 한 프레임 ───────────────────────────────────────── */

  function render() {
    if (!active()) { return false; }
    var run = d().raw();
    if (!run) { return false; }
    frame++;

    var W = d().ROOM_W, H = d().ROOM_H;
    /* 퍼즐방은 제단이 켜질 때마다(맞게 밟을 때마다) 그림도 다시 세워야 한다 —
       `rk` 에 진행도를 안 넣으면 데이터는 바뀌어도 화면은 그대로 남는다 */
    var pzProg = (run.room && run.room.puzzle) ? ':pz' + run.room.puzzle.progress : '';
    /* 이벤트방(구출)도 같은 사정이다 — 풀려난 순간 갇힌 우리 그림을 갈아 끼운다 */
    var capProg = (run.room && run.room.captive) ? (':cap' + (run.room.captive.freed ? 1 : 0)) : '';
    /* 비밀(POI: Secret)도 마찬가지 — 찾은 순간 반짝임을 얹어야 한다 */
    var secFound = 0;
    if (run.room && run.room.decor) {
      for (var sdi = 0; sdi < run.room.decor.length; sdi++) {
        if (run.room.decor[sdi].secret && run.room.decor[sdi].found) { secFound = 1; break; }
      }
    }
    var rk = (run.town ? 'town' : run.floor) + ':' + run.roomIdx + ':' +
             (run.room && run.room.cleared ? 'c' : 'o') + pzProg + capProg + ':sec' + secFound;
    if (rk !== roomKey) { roomKey = rk; buildRoom(run); buildField(run); }

    /* 조명 */
    var L = lightPlan(run.floor, run.room && run.room.kind, DARK());
    amb.intensity = L.ambient;
    amb.color.setHex(L.ambientHex);
    key.intensity = L.keyIntensity;
    key.color.setHex(L.keyHex);
    key.position.set(W * 0.3, 260, H * 0.1);
    key.target.position.set(W / 2, 0, H / 2);
    key.target.updateMatrixWorld();
    /* 맞으면 · 위태로우면 바탕과 안개가 붉어진다 (3단계) */
    var FX = global.DG.fx3d;
    var p0 = run.player;
    var lowHp = run.hpMax ? core.clamp((0.34 - run.hp / run.hpMax) / 0.34, 0, 1) : 0;
    var bgHex = FX ? FX.hurtTint(L.bgHex, p0.hurt, lowHp) : L.bgHex;
    if (FX) { amb.color.setHex(FX.hurtTint(L.ambientHex, p0.hurt, lowHp * 0.6)); }

    if (!scene.fog) { scene.fog = new T.Fog(bgHex, L.fog.near, L.fog.far); }
    scene.fog.color.setHex(bgHex);
    scene.fog.near = L.fog.near; scene.fog.far = L.fog.far;
    scene.background = new T.Color(bgHex);

    var p = run.player;
    torch.intensity = L.torchIntensity;
    torch.color.setHex(L.torchHex);
    torch.distance = L.torchRange;
    torch.position.set(p.x, 46, p.y);

    var AS3 = AS();
    var nowT = Date.now() / 1000;

    /* 나 */
    var me = actorOf('me', 'me', null);
    me.node.position.set(p.x, 0, p.y);
    if (p.walking) { me.ang = Math.atan2(p.facing || 1, 0.001); }
    me.node.rotation.y = me.ang;
    /* 걸으면 위아래로 튄다 — 도형으로 남아 있을 때만 도드라진다(GLB 는 제 다리로 걷는다) */
    me.node.position.y = p.walking ? Math.abs(Math.sin(p.phase || 0)) * 2.2 : 0;
    if (AS3) {
      AS3.step(me.node.userData.mixerNode, { t: nowT, walking: !!p.walking, anim: p.walking ? 'walk' : 'idle' });
      AS3.flashAllMat(ensureFlash(me.node), p.hurt, 0.28);
    }

    /* 적 */
    var es = (run.room && run.room.enemies) || [], i;
    for (i = 0; i < es.length; i++) {
      var e = es[i];
      if (e.hp <= 0) { continue; }
      var a = actorOf('e' + i + ':' + (e.ref && e.ref.id), 'foe', e);
      a.node.position.set(e.x, 0, e.y);
      a.node.rotation.y = Math.atan2(p.x - e.x, p.y - e.y);
      /* 맞은 직후에는 흔들린다 */
      if (e.hurt > 0) { a.node.position.x += (Math.random() - 0.5) * 3; }
      if (AS3) {
        var eWalking = Math.hypot(p.x - e.x, p.y - e.y) > (e.r || 12) + (d().P_R || 13) + 8;
        AS3.step(a.node.userData.mixerNode, { t: nowT, walking: eWalking, anim: e.hurt > 0 ? 'hit' : (eWalking ? 'walk' : 'attack') });
        AS3.flashAllMat(ensureFlash(a.node), e.hurt, 0.2);
        if (e.shade) { ensureShade(a.node); }
      }
    }

    /* 마을 사람과 표식 — 던전 방에는 없는 것들이다(`room.npcs` · `room.marks`).
       판정은 이미 이 둘을 방 안에 놓아 두었다 — 여기서는 세우기만 한다. */
    var TW = global.DG.town;
    var talkR = (TW && TW.TALK_R) || 40;
    var ns = (run.room && run.room.npcs) || [];
    for (i = 0; i < ns.length; i++) {
      var np = ns[i];
      var na = actorOf('n' + np.key, 'npc', np);
      na.node.position.set(np.x, 0, np.y);
      na.node.rotation.y = Math.atan2(p.x - np.x, p.y - np.y);   // 다가서면 나를 본다
      townMark(na.node, Math.hypot(np.x - p.x, np.y - p.y), talkR);
      if (AS3) { AS3.step(na.node.userData.mixerNode, { t: nowT, walking: false, anim: 'idle' }); }
    }
    var mks = (run.room && run.room.marks) || [];
    for (i = 0; i < mks.length; i++) {
      var mo = mks[i];
      var ma = actorOf('m' + mo.key, 'mark', mo);
      ma.node.position.set(mo.x, 0, mo.y);
      townMark(ma.node, Math.hypot(mo.x - p.x, mo.y - p.y), talkR);
    }

    /* 바닥의 전리품 — 등급색으로 빛나는 낮은 조각 */
    var ds = (run.room && run.room.drops) || [];
    for (i = 0; i < ds.length; i++) {
      var dp = ds[i];
      var da = actorOf('d' + i, 'drop', null);
      if (!da.node.userData.built) {
        while (da.node.children.length) { da.node.remove(da.node.children[0]); }
        box(da.node, 0, 3, 0, 12, 6, 12, dropHex(dp), 'glow', false);
        da.node.userData.built = true;
      }
      da.node.position.set(dp.x, 0, dp.y);
      da.node.rotation.y = frame * 0.02;
    }

    /* 기공파 — 판정이 굴리는 투사체를 그대로 세운다 */
    var ss = run.shots || [];
    for (i = 0; i < ss.length; i++) {
      var sh = ss[i];
      var sa = actorOf('s' + i, 'shot', null);
      if (!sa.node.userData.built) {
        while (sa.node.children.length) { sa.node.remove(sa.node.children[0]); }
        /* 알과 꼬리. 재질은 사본이다 — 원소마다 색이 다르다 */
        var sc0 = box(sa.node, 0, 0, 0, 10, 10, 10, 0x9fe8ff, 'glow', false);
        var st0 = box(sa.node, 0, 0, -9, 6, 6, 22, 0x9fe8ff, 'glow', false);
        sa.node.userData.shotMat = [ownMat(sc0), ownMat(st0)];
        sa.node.userData.shotMat[1].transparent = true;
        sa.node.userData.shotMat[1].opacity = 0.45;
        sa.node.userData.built = true;
      }
      /* 원소 색은 판정이 이미 들고 있다 (shots[].color) */
      var shex = FX ? FX.shotHex(sh) : 0x9fe8ff;
      var sm = sa.node.userData.shotMat, sj;
      for (sj = 0; sm && sj < sm.length; sj++) {
        sm[sj].color.setHex(shex);
        if (sm[sj].emissive) { sm[sj].emissive.setHex(shex); }
      }
      sa.node.position.set(sh.x, 22, sh.y);
      sa.node.rotation.y = Math.atan2(sh.dx || 0, sh.dy || 0);
    }

    /* 궁수·조총병이 쏜 것 — 판정이 굴리는 그대로, 색만 기본을 다르게 둔다
       (몬스터 다양화 — 나에게 오는 화살이라는 걸 한눈에 가른다) */
    var fss = run.foeShots || [];
    for (i = 0; i < fss.length; i++) {
      var fsh = fss[i];
      var fa = actorOf('f' + i, 'shot', null);
      if (!fa.node.userData.built) {
        while (fa.node.children.length) { fa.node.remove(fa.node.children[0]); }
        var fc0 = box(fa.node, 0, 0, 0, 8, 8, 8, 0xe08a5a, 'glow', false);
        var ft0 = box(fa.node, 0, 0, -8, 4, 4, 18, 0xe08a5a, 'glow', false);
        fa.node.userData.shotMat = [ownMat(fc0), ownMat(ft0)];
        fa.node.userData.shotMat[1].transparent = true;
        fa.node.userData.shotMat[1].opacity = 0.45;
        fa.node.userData.built = true;
      }
      var fhex = FX ? FX.shotHex({ color: fsh.color || '#e08a5a' }) : 0xe08a5a;
      var fm = fa.node.userData.shotMat, fj;
      for (fj = 0; fm && fj < fm.length; fj++) {
        fm[fj].color.setHex(fhex);
        if (fm[fj].emissive) { fm[fj].emissive.setHex(fhex); }
      }
      fa.node.position.set(fsh.x, 20, fsh.y);
      fa.node.rotation.y = Math.atan2(fsh.dx || 0, fsh.dy || 0);
    }

    sweep();

    /* 카메라 — 회전은 막는다(8절). 부드럽게 따라온다 */
    /* 마을에서는 조금 더 물러난다. 마당(560×380)에 사람이 3×3 으로 앉아 있어
       **한눈에 들어와야** 누구에게 갈지 정할 수 있다(town.js 가 크기를 그렇게 잡았다).
       세로로 긴 화면에서는 가로가 먼저 잘리므로 화면비까지 셈에 넣는다 —
       던전 쪽 거리는 건드리지 않는다(연출·조작 감각이 거기 맞춰져 있다). */
    var zNow = ZOOM() / USERZOOM();
    if (run.town) {
      var asp = camera.aspect || 1;
      zNow *= 1.15 * (asp < 1 ? Math.min(1.5, 1 / Math.max(0.5, asp)) : 1);
    }
    var aim = CAMMODE() === 'third'
      ? camAim3rd(p.x, p.y, p.dirX, p.dirY, zNow, TILT())
      : camAim(p.x, p.y, W, H, zNow, TILT());
    var want = new T.Vector3(aim.pos.x, aim.pos.y, aim.pos.z);
    var look = new T.Vector3(aim.look.x, aim.look.y, aim.look.z);
    if (!camPos) { camPos = want.clone(); camLook = look.clone(); }
    camPos.lerp(want, 0.14);
    camLook.lerp(look, 0.14);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    if (FX) {
      /* 화면 흔들림 — 상한은 fx3d 가 진다 (51절) */
      var sk = FX.shakeAmt();
      if (sk > 0) {
        camera.position.x += (Math.random() - 0.5) * sk * 0.9;
        camera.position.y += (Math.random() - 0.5) * sk * 0.6;
        camera.updateMatrixWorld();
      }
      /* 연출은 카메라가 정해진 뒤에 앉힌다 */
      FX.step(run, d().fx(), camera);
    }

    renderer.render(scene, camera);
    return true;
  }

  function dropHex(dp) {
    var it = dp && (dp.item || dp);
    var g = it && it.grade;
    var D = global.DG.data;
    if (g && D && D.rarity && D.rarity[g]) {
      return parseInt(String(D.rarity[g].color).replace('#', ''), 16);
    }
    return 0xd9d9e0;
  }

  /** 눈으로 확인할 때 */
  function stats() {
    if (!available()) { return { none: true, failed: failed }; }
    var drawn = 0;
    scene.traverse(function (o) { if (o.isMesh) { drawn++; } });
    var run = d().raw();
    return {
      ready: ready, failed: failed, wanted: wanted(), town: isTown(),
      drawn: drawn, actors: Object.keys(actors).length,
      room: roomKey, floor: run ? run.floor : 0,
      cam: camPos ? [Math.round(camPos.x), Math.round(camPos.y), Math.round(camPos.z)].join(',') : '-',
      fx: global.DG.fx3d ? global.DG.fx3d.stats() : null
    };
  }

  global.DG = global.DG || {};
  global.DG.dungeon3d = {
    init: init, resize: resize, render: render,
    available: available, active: active, wanted: wanted,
    /* 값을 내는 함수 — three 없이도 돈다(자가진단이 이것만 따로 본다) */
    camAim: camAim, camAim3rd: camAim3rd, camMode: CAMMODE, userZoom: USERZOOM, lightPlan: lightPlan,
    /** 들판이 몇 조각인지 (2단계) */
    fieldKey: function () { return fieldKey; },
    three: function () { return T; },
    addFx: function (n) { if (fxGroup && n) { fxGroup.add(n); } return n; },
    camNode: function () { return camera; },
    /** 손잡이 — 이 판에는 어드민이 없어 콘솔·데모가 두드린다 */
    set: set, tuned: tuned,
    stats: stats
  };
})(window);
