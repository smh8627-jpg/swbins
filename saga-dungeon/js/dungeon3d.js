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

  function d() { return global.DG.dungeon; }

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

  function available() { return ready && !failed; }
  function active() { return available() && wanted(); }

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
   * 이 층·이 방의 조명 — **순수 함수다.** 층이 깊어질수록 어둡고,
   * 보스 방은 붉게 깔린다(37절 "강한 명암 · 선명한 실루엣").
   */
  function lightPlan(floor, roomKind, dark) {
    var dk = dark === undefined ? 0.82 : dark;
    var deep = Math.min(1, Math.max(0, (floor - 1) / 40));   // 40층에서 가장 깊다
    var boss = roomKind === 'boss';
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
    if (!T || !el) { failed = true; return false; }
    canvas = el;
    try {
      renderer = new T.WebGLRenderer({
        canvas: el, antialias: true, alpha: false,
        preserveDrawingBuffer: !!global.DG_3D_PRESERVE
      });
    } catch (e) { failed = true; return false; }
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

  /** 들판 조각 하나를 도형으로 세운다 */
  function piece(p, seed, W, H, stone) {
    var F = global.DG.field3d;
    var g = fieldGroup;
    var y = F.heightAt(p.x, p.z, seed, W, H);
    var s = p.s || 1;
    if (p.t === 'tree') {
      box(g, p.x, y + p.h * 0.22, p.z, 9 * s, p.h * 0.44, 9 * s, 0x3a2c1e, 'flat', true);
      box(g, p.x, y + p.h * 0.68, p.z, p.h * 0.62 * s, p.h * 0.7, p.h * 0.62 * s,
        0x24361f, 'flat', true);
    } else if (p.t === 'rock') {
      box(g, p.x, y + p.h * 0.4, p.z, p.h * 1.3 * s, p.h * 0.9, p.h * 1.1 * s,
        mix(stone, 0x000000, 0.35), 'flat', true).rotation.y = p.rot;
    } else if (p.t === 'pillar') {
      box(g, p.x, y + p.h / 2, p.z, 16, p.h, 16, mix(stone, 0xffffff, 0.12), 'flat', true);
    } else if (p.t === 'wall') {
      box(g, p.x, y + p.h / 2, p.z, 90, p.h, 14, mix(stone, 0x000000, 0.2), 'flat', true)
        .rotation.y = p.rot;
    } else if (p.t === 'cliff') {
      /* 절벽 — 큰 덩이를 비스듬히 세운다. 4절의 "높낮이" 를 눈에 보이게 하는 것 */
      var cl = box(g, p.x, y + p.h * 0.4, p.z, 120 * s, p.h, 90 * s,
        mix(stone, 0x000000, 0.45), 'flat', true);
      cl.rotation.set(0.08, p.rot, 0.06);
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
      box(g, p.x, y + p.h * 0.45, p.z, p.h * 1.5, p.h, p.h * 1.2,
        mix(stone, 0x000000, 0.5), 'flat', true).rotation.y = p.rot;
      /* 입구는 **새까맣다** — 빛이 안 닿는 자리가 있어야 굴로 보인다 */
      box(g, p.x, y + p.h * 0.3, p.z + p.h * 0.6, p.h * 0.5, p.h * 0.55, 6,
        0x000000, '', false).rotation.y = p.rot;
    } else if (p.t === 'altar') {
      box(g, p.x, y + 6, p.z, 60, 12, 60, mix(stone, 0xffffff, 0.2), 'flat', true);
      box(g, p.x, y + p.h * 0.6, p.z, 20, p.h * 0.8, 20, 0x4a3f6b, 'flat', true);
      box(g, p.x, y + p.h + 6, p.z, 14, 14, 14, 0xc9a3ff, 'glow', false);
    } else if (p.t === 'tent') {
      box(g, p.x, y + p.h / 2, p.z, 44, p.h, 40, 0x5a4a3a, 'flat', true).rotation.y = p.rot;
    } else if (p.t === 'fire') {
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

  /* ── 배우 ───────────────────────────────────────────
   * 사람과 적을 도형으로 조립한다. 원작 에셋은 안 쓴다 —
   * 크기·색만 판정에서 읽어 온다(체력·등급이 그림에 드러나야 한다).
   */
  function buildActor(kind, ref) {
    var g = new T.Group();
    if (kind === 'me') {
      box(g, 0, 16, 0, 14, 22, 10, 0xd9c9a8, 'flat', true);       // 몸
      box(g, 0, 32, 0, 11, 11, 11, 0xe8c9a4, 'flat', true);       // 머리
      box(g, 0, 40, 0, 15, 4, 15, 0x3a3f4a, 'flat', false);       // 갓
      box(g, 9, 18, 0, 3, 26, 3, 0xb9c2cf, 'flat', true);         // 칼
      g.userData.head = g.children[1];
      return g;
    }
    var r = (ref && ref.r) || 12;
    var col = ref && ref.boss ? 0x9a3a3a : (ref && ref.elite ? 0x8a5cc0 : 0x6a6a75);
    var hh = r * (ref && ref.boss ? 2.6 : 1.9);
    box(g, 0, hh / 2, 0, r * 1.5, hh, r * 1.2, col, 'flat', true);
    box(g, 0, hh + r * 0.5, 0, r * 0.9, r * 0.9, r * 0.9, mix(col, 0xffffff, 0.2), 'flat', true);
    /* 엘리트·보스는 눈이 빛난다 — 실루엣만으로 위험을 읽게 한다 */
    if (ref && (ref.boss || ref.elite)) {
      box(g, 0, hh + r * 0.6, r * 0.5, r * 0.7, r * 0.2, r * 0.2, 0xff5a3a, 'glow', false);
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
    var rk = run.floor + ':' + run.roomIdx + ':' + (run.room && run.room.cleared ? 'c' : 'o');
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
    if (!scene.fog) { scene.fog = new T.Fog(L.bgHex, L.fog.near, L.fog.far); }
    scene.fog.color.setHex(L.bgHex);
    scene.fog.near = L.fog.near; scene.fog.far = L.fog.far;
    scene.background = new T.Color(L.bgHex);

    var p = run.player;
    torch.intensity = L.torchIntensity;
    torch.color.setHex(L.torchHex);
    torch.distance = L.torchRange;
    torch.position.set(p.x, 46, p.y);

    /* 나 */
    var me = actorOf('me', 'me', null);
    me.node.position.set(p.x, 0, p.y);
    if (p.walking) { me.ang = Math.atan2(p.facing || 1, 0.001); }
    me.node.rotation.y = me.ang;
    /* 걸으면 위아래로 튄다 — 굳어 있으면 인형으로 보인다 */
    me.node.position.y = p.walking ? Math.abs(Math.sin(p.phase || 0)) * 2.2 : 0;

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
        box(sa.node, 0, 0, 0, 10, 10, 10, 0x9fe8ff, 'glow', false);
        sa.node.userData.built = true;
      }
      sa.node.position.set(sh.x, 22, sh.y);
    }

    sweep();

    /* 카메라 — 회전은 막는다(8절). 부드럽게 따라온다 */
    var aim = camAim(p.x, p.y, W, H, ZOOM(), TILT());
    var want = new T.Vector3(aim.pos.x, aim.pos.y, aim.pos.z);
    var look = new T.Vector3(aim.look.x, aim.look.y, aim.look.z);
    if (!camPos) { camPos = want.clone(); camLook = look.clone(); }
    camPos.lerp(want, 0.14);
    camLook.lerp(look, 0.14);
    camera.position.copy(camPos);
    camera.lookAt(camLook);

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
      ready: ready, failed: failed, wanted: wanted(),
      drawn: drawn, actors: Object.keys(actors).length,
      room: roomKey, floor: run ? run.floor : 0,
      cam: camPos ? [Math.round(camPos.x), Math.round(camPos.y), Math.round(camPos.z)].join(',') : '-'
    };
  }

  global.DG = global.DG || {};
  global.DG.dungeon3d = {
    init: init, resize: resize, render: render,
    available: available, active: active, wanted: wanted,
    /* 값을 내는 함수 — three 없이도 돈다(자가진단이 이것만 따로 본다) */
    camAim: camAim, lightPlan: lightPlan,
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
