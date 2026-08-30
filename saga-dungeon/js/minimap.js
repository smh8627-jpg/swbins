/**
 * 미니맵 — 지금 있는 방을 위에서 본 그림 (PLAN 27절)
 * ---------------------------------------------------------------
 * 이 판(사가블로)은 사가고처럼 넓은 지도를 걷는 게임이 아니다 — 방 하나(560×360
 * 논리 좌표, `dungeon.js` `ROOM_W`·`ROOM_H`)를 아이소메트릭으로 비스듬히 보여 준다.
 * 그래서 "어디로 가야 하나" 가 화면 각도 때문에 헷갈릴 수 있다 — 미니맵은 그 방을
 * **똑바로 위에서** 본 작은 판이다. 방이 바뀌면(`goRoom`) 다음 그리기에서 저절로
 * 새 방 내용으로 갈린다 — 따로 비울 것이 없다.
 *
 *   오른쪽 위 네모 판   방 하나 전체가 늘 다 들어간다(사가고 미니맵과 달리
 *                       반경·테두리 clamp 가 없다 — 방이 화면보다 안 크다)
 *   점                  적(빨강) · 정예(보라) · 보스(굵은 빨강) · NPC(하늘)
 *                       · 상자·우물·사당·광맥·퍼즐·채집(금) · 문(회색, 오른쪽 벽)
 *   나                  가운데가 아니라 **방 안 실제 자리**에 금빛 점으로 선다
 *   탭                  접는다 (다시 탭하면 펴진다)
 *
 * **판정에는 한 줄도 닿지 않는다** — `dungeon.raw()` 를 읽기만 한다(사가고
 * 미니맵과 같은 원칙). 값을 내는 함수(`blips`)는 캔버스 없이도 돈다.
 *
 * 마을(town.js)은 방 개념이 없는 자유 보행 공간이라 이 미니맵을 켜지 않는다
 * (`dungeon.active()` 일 때만) — 마을 지도는 이 판의 몫이 아니다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  var STYLE = {
    enemy: { c: '#e2564a', r: 2.4 },
    elite: { c: '#c98cff', r: 3.0 },
    boss:  { c: '#ff2d2d', r: 4.0 },
    npc:   { c: '#7fd0ff', r: 2.6 },
    poi:   { c: '#f5c451', r: 2.8 },
    door:  { c: '#9a8f78', r: 2.2 }
  };

  var node = null, canvas = null, ctx = null;
  var folded = false, lastTap = 0;
  var acc = 0;
  var drawn = 0;                 // 지난번에 찍은 점 수 (진단이 들여다본다)

  function everySec() { return 0.16; }
  function sizePx() {
    var narrow = global.innerWidth && global.innerWidth <= 600;
    return narrow ? 96 : 128;
  }

  /* ── 값을 내는 함수 — 캔버스 없이도 돈다 ─────────────────
   * 방 안 실제 좌표(WALL~ROOM_W-WALL, WALL~ROOM_H-WALL)를 0~1 로 편다.
   * 방은 늘 화면 안에 다 들어가므로(사가고 세상과 달리 반경이 없다)
   * clamp·edge 처리가 필요 없다 — 그래서 사가고보다 훨씬 짧다.
   */
  function norm(x, y) {
    var D = global.DG.dungeon;
    var W = D.ROOM_W, H = D.ROOM_H, WALL = D.WALL;
    var iw = Math.max(1, W - WALL * 2), ih = Math.max(1, H - WALL * 2);
    return {
      nx: core.clamp((x - WALL) / iw, -0.06, 1.06),
      ny: core.clamp((y - WALL) / ih, -0.06, 1.06)
    };
  }

  /**
   * 지금 방에 찍을 것들. `dungeon.raw()` 의 방 모양(POI 마다 다른 필드)을
   * 그대로 훑는다 — 없는 POI 는 그 필드가 `null` 이라 자연히 건너뛴다.
   */
  function blips(run) {
    var out = [];
    if (!run || !run.room) { return out; }
    var room = run.room, i;

    function put(kind, x, y) {
      var n = norm(x, y);
      out.push({ t: kind, nx: n.nx, ny: n.ny });
    }

    for (i = 0; i < room.enemies.length; i++) {
      var e = room.enemies[i];
      if (e.hp <= 0) { continue; }
      put(e.boss ? 'boss' : (e.elite ? 'elite' : 'enemy'), e.x, e.y);
    }
    if (room.chest && !room.chest.taken) { put('poi', room.chest.x, room.chest.y); }
    if (room.well && !room.well.used) { put('poi', room.well.x, room.well.y); }
    if (room.shrine && !room.shrine.used) { put('poi', room.shrine.x, room.shrine.y); }
    if (room.vein && !room.vein.used) { put('poi', room.vein.x, room.vein.y); }
    if (room.merchant) { put('npc', room.merchant.x, room.merchant.y); }
    if (room.captive && !room.captive.freed) { put('npc', room.captive.x, room.captive.y); }
    if (room.puzzle) {
      for (i = 0; i < room.puzzle.pods.length; i++) {
        var pod = room.puzzle.pods[i];
        if (!pod.lit) { put('poi', pod.x, pod.y); }
      }
    }
    if (room.forage) {
      for (i = 0; i < room.forage.herbs.length; i++) {
        var herb = room.forage.herbs[i];
        if (!herb.picked) { put('poi', herb.x, herb.y); }
      }
      if (room.forage.pond && !room.forage.pond.used) { put('poi', room.forage.pond.x, room.forage.pond.y); }
    }
    if (room.doors) {
      var D = global.DG.dungeon;
      for (i = 0; i < room.doors.length; i++) { put('door', D.ROOM_W - D.WALL, room.doors[i].y); }
    }
    return out;
  }

  /* ── 화면 ─────────────────────────────────────────────── */

  function mount() {
    if (node || !global.document) { return null; }
    node = global.document.createElement('div');
    node.id = 'dg-minimap';
    node.setAttribute('title', '미니맵 — 탭하면 접힙니다');
    canvas = global.document.createElement('canvas');
    node.appendChild(canvas);
    node.style.display = 'none';           // tick() 이 던전일 때만 'block' 으로 켠다
    global.document.body.appendChild(node);
    node.addEventListener('click', tap);
    return node;
  }

  function tap(e) {
    if (e && e.preventDefault) { e.preventDefault(); }
    var now = Date.now();
    folded = !folded;
    lastTap = now;
    apply();
    draw();
  }

  function apply() {
    if (!node) { return; }
    node.classList.toggle('folded', folded);
  }

  function resize() {
    if (!canvas) { return 0; }
    var s = sizePx(), h = Math.round(s * 0.64);   // 방 비(560:360)에 가깝게
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(s * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(s * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = s + 'px';
      canvas.style.height = h + 'px';
      ctx = null;
    }
    if (!ctx) { ctx = canvas.getContext('2d'); }
    return dpr;
  }

  function draw() {
    var D = global.DG.dungeon;
    if (!D || !D.active() || folded || !canvas) { return 0; }
    var run = D.raw();
    if (!run || !run.room) { return 0; }
    var dpr = resize();
    if (!ctx) { return 0; }

    var s = sizePx(), h = Math.round(s * 0.64);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, s, h);

    ctx.fillStyle = 'rgba(10,8,5,.72)';
    ctx.fillRect(0, 0, s, h);

    var bs = blips(run), i, st;
    drawn = bs.length;
    for (i = 0; i < bs.length; i++) {
      st = STYLE[bs[i].t] || STYLE.enemy;
      ctx.fillStyle = st.c;
      ctx.beginPath();
      ctx.arc(bs[i].nx * s, bs[i].ny * h, st.r, 0, Math.PI * 2);
      ctx.fill();
    }

    /* 나 — 방 안 실제 자리 */
    var pn = norm(run.player.x, run.player.y);
    ctx.fillStyle = '#f5b445';
    ctx.beginPath();
    ctx.arc(pn.nx * s, pn.ny * h, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    /* 지역 경계 — 방 벽 */
    ctx.strokeStyle = 'rgba(212,178,110,.55)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(1, 1, s - 2, h - 2);

    return drawn;
  }

  function init() {
    mount();
    apply();
    draw();
    return true;
  }

  /** 게임 루프가 부른다 — 매 프레임 다시 그리지 않는다 */
  function tick(dt) {
    if (!node) { return false; }
    var D = global.DG.dungeon;
    var show = !!(D && D.active());
    /* `''` 는 인라인 스타일만 지운다 — CSS 시트의 `display: none;` 이 그대로
       이겨서 계속 안 보였다(실기기 검증 중 발견). 'block' 으로 확실히 덮는다 */
    node.style.display = show ? 'block' : 'none';
    if (!show) { return false; }
    acc += dt;
    if (acc < everySec()) { return false; }
    acc = 0;
    draw();
    return true;
  }

  /** 진단·데모가 값으로 들여다보는 창 */
  function stats() {
    return { folded: folded, size: sizePx(), mounted: !!node, drawn: drawn };
  }

  global.DG = global.DG || {};
  global.DG.minimap = {
    STYLE: STYLE,
    /* 값을 내는 함수 — 순수하다 (자가진단이 이것만 따로 본다) */
    norm: norm, blips: blips,
    /* 화면 */
    init: init, tick: tick, draw: draw, resize: resize, stats: stats,
    get folded() { return folded; },
    set: function (o) { if (o && typeof o.folded === 'boolean') { folded = o.folded; } apply(); draw(); },
    reset: function () { folded = false; }
  };
})(window);
