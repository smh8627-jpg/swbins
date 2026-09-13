/**
 * 오버월드 전체 지도 — 디아블로 M키식 토글 (PLAN 25-1절, 2026-09-02)
 * ---------------------------------------------------------------
 * 이 판은 실제 GPS 좌표가 곧 오버월드라 사가블로처럼 "다른 마을로 걸어나간다"는
 * 구조는 없다. 대신 **지금까지 밟아 본 실제 위치**(`core.save.player.trail`,
 * `world.js`의 `trackTrail`이 40m 마다 한 점씩 남긴다)를 한눈에 펼쳐 보는
 * 화면이다 — 좌하단 미니맵(`minimap.js`, 코앞만 보여줌)과는 다른, 별개의
 * 전체 화면 오버레이다.
 *
 * 여는 문 둘 — 데스크톱은 M 키, 모바일은 도구줄의 🧭 단추(`#btn-owmap`).
 *
 * `project`(값을 내는 함수)는 판정에 한 줄도 닿지 않는다 — 위경도 배열을
 * 읽기만 하고 **캔버스 없이도 돈다**(자가진단이 그것만 따로 본다).
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  var node = null, canvas = null, ctx = null, btn = null;
  var opened = false;
  var lastDrawn = 0;   // 지난번에 찍은 점 수 (진단·데모가 들여다본다)

  function W() { return global.DG.world; }
  function MM() { return global.DG.minimap; }

  /**
   * 위경도 점들을 화면 정사각형(-1~1, 가운데가 (0,0))에 얹을 자리로 낸다.
   * `points` 는 발자취({lat,lng,kind}), `cur` 는 지금 위치({lat,lng})다.
   * 위도(lat) 스팬이 아주 좁아도(제자리걸음) 나눗셈이 터지지 않게 최소
   * 스팬(약 90m 어치)을 둔다.
   */
  function project(points, cur) {
    var all = points.concat([cur]);
    var minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    var i, p;
    for (i = 0; i < all.length; i++) {
      p = all[i];
      if (p.lat < minLat) { minLat = p.lat; }
      if (p.lat > maxLat) { maxLat = p.lat; }
      if (p.lng < minLng) { minLng = p.lng; }
      if (p.lng > maxLng) { maxLng = p.lng; }
    }
    /* 가운데(중점) 기준으로 잰다 — 점이 하나뿐이면(min===max) 화면 한가운데
       (0,0)에 놓인다. min을 기준으로 재면 그 경우 한쪽 구석(-1,-1)으로 쏠린다 */
    var midLat = (minLat + maxLat) / 2, midLng = (minLng + maxLng) / 2;
    var spanLat = Math.max(maxLat - minLat, 0.0008);
    var spanLng = Math.max(maxLng - minLng, 0.0008);

    function put(pt) {
      var nx = (pt.lng - midLng) / spanLng;      // -0.5~0.5, 동쪽일수록 큼
      var ny = (midLat - pt.lat) / spanLat;      // -0.5~0.5, 북쪽일수록 작음(위)
      return { x: nx * 2, y: ny * 2, kind: pt.kind };
    }

    return {
      trail: points.map(put),
      cur: put(cur),
      span: { lat: spanLat, lng: spanLng }
    };
  }

  /* ── 화면 ─────────────────────────────────────────────── */

  function mount() {
    if (node || !global.document) { return null; }
    node = global.document.createElement('div');
    node.id = 'overworld-map';
    node.innerHTML =
      '<div class="ow-scrim"></div>' +
      '<div class="ow-panel glass">' +
      '<div class="ow-head"><h3>🧭 전체 지도</h3>' +
      '<small class="muted">지금까지 밟아 본 곳</small>' +
      '<button class="icon-btn ow-close" title="닫기 (M / Esc)">✕</button></div>' +
      '<canvas></canvas>' +
      '</div>';
    global.document.body.appendChild(node);
    canvas = node.querySelector('canvas');
    node.querySelector('.ow-scrim').addEventListener('click', close);
    node.querySelector('.ow-close').addEventListener('click', close);
    return node;
  }

  function resize() {
    if (!canvas) { return; }
    var box = canvas.getBoundingClientRect();
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(box.width * dpr));
    var h = Math.max(1, Math.round(box.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h; ctx = null;
    }
    if (!ctx) { ctx = canvas.getContext('2d'); }
    return dpr;
  }

  function draw() {
    if (!opened || !canvas || !core.save) { return 0; }
    var dpr = resize();
    if (!ctx) { return 0; }
    var w = canvas.width, h = canvas.height;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var cw = canvas.clientWidth, ch = canvas.clientHeight;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#12141a';
    ctx.fillRect(0, 0, cw, ch);

    var pos = core.save.player.pos;
    var wl = W();
    var cur = wl ? wl.worldToLatLng(pos.x, pos.y) : { lat: 0, lng: 0 };
    var trail = core.save.player.trail || [];
    var pr = project(trail, cur);
    var pad = 26;
    var side = Math.min(cw, ch) - pad * 2;
    var ox = (cw - side) / 2, oy = (ch - side) / 2;
    var mm = MM();
    var TINT = mm ? mm.TINT : {};

    function px(pt) { return { x: ox + (pt.x + 1) / 2 * side, y: oy + (pt.y + 1) / 2 * side }; }

    /* 발자취 — 지형 빛깔로 점 하나씩 */
    var i, p, sp;
    ctx.globalAlpha = 0.85;
    for (i = 0; i < pr.trail.length; i++) {
      p = pr.trail[i]; sp = px(p);
      ctx.fillStyle = (TINT && TINT[p.kind]) || '#8d8674';
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* 지금 위치 — 금빛으로 크게 강조 */
    var cp = px(pr.cur);
    ctx.fillStyle = '#f5b445';
    ctx.beginPath(); ctx.arc(cp.x, cp.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1;
    ctx.strokeRect(ox + 0.5, oy + 0.5, side - 1, side - 1);

    lastDrawn = pr.trail.length;
    return lastDrawn;
  }

  function apply() {
    if (!node) { return; }
    node.classList.toggle('show', opened);
    if (btn) { btn.classList.toggle('on', opened); }
  }

  function open() {
    if (!node) { mount(); }
    opened = true;
    apply();
    draw();
  }
  function close() {
    opened = false;
    apply();
  }
  function toggle() {
    if (opened) { close(); } else { open(); }
  }

  function bindKeyAndButton() {
    global.addEventListener('keydown', function (e) {
      if (e.key === 'm' || e.key === 'M') {
        var tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') { return; }
        toggle();
        return;
      }
      if (e.key === 'Escape' && opened) { close(); }
    });
    btn = global.document.getElementById('btn-owmap');
    if (btn) { btn.addEventListener('click', toggle); }
  }

  function init() {
    mount();
    bindKeyAndButton();
    apply();
  }

  /** 열려 있는 동안만 다시 그린다 — 미니맵처럼 매 프레임 다시 그리지 않는다 */
  function tick() {
    if (!opened) { return false; }
    draw();
    return true;
  }

  /** 진단·데모가 값으로 들여다보는 창 */
  function stats() {
    return { opened: opened, drawn: lastDrawn, trailLen: (core.save && core.save.player.trail || []).length };
  }

  global.DG = global.DG || {};
  global.DG.overworld = {
    /* 값을 내는 함수 — 순수하다 (자가진단이 이것만 따로 본다) */
    project: project,
    /* 화면 */
    init: init, tick: tick, draw: draw, open: open, close: close, toggle: toggle,
    get opened() { return opened; },
    stats: stats,
    /** 진단이 제 뒤를 치울 때 */
    reset: function () { opened = false; lastDrawn = 0; }
  };
})(window);
