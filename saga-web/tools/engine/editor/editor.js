/**
 * 사가 엔진 편집기. 한 프로젝트(project.json)를 고친다 — 장면·개체·컴포넌트·이벤트·변수·HUD.
 *
 * 칸은 sim.js 의 표(SHAPES·BODIES·COMP·WHEN·DO)에서 만든다 — 엔진에 컴포넌트·행동을 더하면 편집기 칸도 저절로 생긴다.
 * 3D 화면은 view.js(실행기와 같은 그리기)로 그린다. 기즈모·궤도 카메라는 three 번들에 없어 여기서 만든다.
 * 고칠 때마다 통째 사본을 되돌리기 칸에 쌓는다(최대 120). 저장은 서버가 검사·실명 가드·md5 충돌을 본 뒤에 쓴다.
 */
(function () {
  'use strict';
  var T = window.THREE, SIM = window.SagaSim, V = window.SagaView;
  var $ = function (s) { return document.querySelector(s); };

  /* ── 상태 ─────────────────────────────────────────────────────────────── */
  var proj = null, md5 = null, sceneId = null, selId = null, dirty = false;
  var undoS = [], redoS = [], assets = [], templates = [];
  var mode = 'move';

  function scene() { return proj.scenes.filter(function (s) { return s.id === sceneId; })[0] || proj.scenes[0]; }
  function ents() { var s = scene(); s.entities = s.entities || []; return s.entities; }
  function ent(id) { return ents().filter(function (e) { return e.id === id; })[0] || null; }
  function sel() { return selId ? ent(selId) : null; }

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) {
      var v = attrs[k];
      if (v == null || v === false) { continue; }
      if (k === 'class') { e.className = v; } else if (k === 'text') { e.textContent = v; } else if (k.slice(0, 2) === 'on') { e.addEventListener(k.slice(2), v); } else if (k === 'value') { e.value = v; } else if (k === 'checked') { e.checked = !!v; } else { e.setAttribute(k, v === true ? '' : v); }
    }
    (kids || []).forEach(function (c) { if (c != null) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); } });
    return e;
  }
  function status(t, cls) { var s = $('#status'); s.textContent = t; s.className = cls || ''; s.title = t; }
  function r3(v) { return Math.round(v * 1000) / 1000; }

  /* ── 되돌리기 ─────────────────────────────────────────────────────────── */
  function snap() { return JSON.stringify({ p: proj, s: sceneId, sel: selId }); }
  function pushUndo() { undoS.push(snap()); if (undoS.length > 120) { undoS.shift(); } redoS = []; }
  /* 고치기 — fn 안에서 proj 를 바꾼다. 되돌리기 한 칸 + 화면 새로 */
  function edit(fn, opt) {
    opt = opt || {};
    if (!opt.noUndo) { pushUndo(); }
    fn();
    dirty = true;
    refresh(opt);
  }
  function restore(from, to) {
    if (!from.length) { return; }
    to.push(snap());
    var o = JSON.parse(from.pop());
    proj = o.p; sceneId = o.s; selId = o.sel;
    dirty = true;
    refresh({ scenes: true });
  }

  /* ── id ───────────────────────────────────────────────────────────────── */
  function newId(base) {
    base = String(base || 'e').toLowerCase().replace(/[^a-z0-9_-]+/g, '') || 'e';
    var used = {};
    ents().forEach(function (e) { used[e.id] = 1; });
    if (!used[base]) { return base; }
    for (var i = 2; ; i++) { if (!used[base + i]) { return base + i; } }
  }

  /* 개체 id 를 바꾸면 그 id 를 가리키던 곳(이벤트 칸·문 도착·복제 원본)도 같이 바꾼다 */
  function renameEntity(oldId, nid) {
    var sc = scene();
    function fixEv(list) {
      (list || []).forEach(function (ev) {
        var w = ev.when || {};
        ['a', 'b'].forEach(function (k) { if (w[k] === oldId) { w[k] = nid; } });
        (ev.do || []).forEach(function (a) { ['target', 'from', 'at'].forEach(function (k) { if (a[k] === oldId && !(a.do === 'goto' && k === 'at')) { a[k] = nid; } }); });
      });
    }
    fixEv(sc.events);
    sc.entities.forEach(function (e) { if (e.id === oldId) { e.id = nid; } fixEv(e.events); });
    /* 다른 장면에서 이 장면으로 오는 문·goto 의 도착 자리 */
    proj.scenes.forEach(function (s) {
      function fixAt(list) { (list || []).forEach(function (ev) { (ev.do || []).forEach(function (a) { if (a.do === 'goto' && a.scene === sc.id && a.at === oldId) { a.at = nid; } }); }); }
      fixAt(s.events);
      (s.entities || []).forEach(function (e) {
        fixAt(e.events);
        if (e.comps && e.comps.portal && e.comps.portal.scene === sc.id && e.comps.portal.at === oldId) { e.comps.portal.at = nid; }
      });
    });
  }

  /* ════════════════════════════════════════════════════════════════════════
     3D 화면
     ════════════════════════════════════════════════════════════════════════ */
  var cv = $('#cv'), R = V.renderer(cv), s3 = new T.Scene(), cam = new T.PerspectiveCamera(55, 1, 0.1, 1000);
  var envNow = null, envKey = '', objs = {}, objKey = {}, grid = null, bodyGroup = new T.Group(), selBox = null, pathLine = null;
  var orbit = { tx: 0, ty: 0, tz: 0, yaw: 0.7, pitch: 0.55, dist: 22 };
  var pendingFit = {};
  s3.add(bodyGroup);

  function camApply() {
    var cp = Math.cos(orbit.pitch);
    cam.position.set(orbit.tx + Math.sin(orbit.yaw) * cp * orbit.dist, orbit.ty + Math.sin(orbit.pitch) * orbit.dist, orbit.tz + Math.cos(orbit.yaw) * cp * orbit.dist);
    cam.lookAt(orbit.tx, orbit.ty, orbit.tz);
  }
  function resize() {
    var w = cv.clientWidth, hh = cv.clientHeight;
    if (!w || !hh) { return; }
    R.setSize(w, hh, false);
    cam.aspect = w / hh; cam.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  function buildEnv() {
    var sc = scene(), key = JSON.stringify(sc.env || {});
    if (key === envKey && envNow) { return; }
    envKey = key;
    if (envNow) { s3.remove(envNow.group); }
    envNow = V.env(sc);
    envNow.apply(s3);
    if (!grid) {
      grid = new T.GridHelper(100, 100, 0x445066, 0x2b3242);
      grid.material.transparent = true; grid.material.opacity = 0.55;
      s3.add(grid);
    }
    grid.position.y = 0.01;
  }

  /* 모양이 바뀐 개체만 새로 만든다(자리만 바뀌면 옮기기만) */
  function lookKey(e) { return JSON.stringify([e.look || {}, !!(e.comps && (e.comps.player || e.comps.talk || e.comps.chase)), e.body && e.body.size]); }
  function syncObjs() {
    var seen = {};
    ents().forEach(function (e) {
      seen[e.id] = 1;
      var k = lookKey(e), o = objs[e.id];
      if (!o || objKey[e.id] !== k) {
        if (o) { s3.remove(o); V.dispose(o); }
        o = objs[e.id] = V.entity(e, { edit: true, onLoad: onModelLoad });
        objKey[e.id] = k;
        s3.add(o);
      }
      V.place(o, e.pos || [0, 0, 0], e.rot || [0, 0, 0], e.scale || [1, 1, 1]);
      o.userData.inner.traverse(function (m) { if (m.material && m.isMesh) { m.material.transparent = !!e.off || !!e.hidden; m.material.opacity = e.off ? 0.35 : e.hidden ? 0.6 : 1; } });
    });
    for (var id in objs) { if (!seen[id]) { s3.remove(objs[id]); V.dispose(objs[id]); delete objs[id]; delete objKey[id]; } }
    drawBodies();
  }

  /* 모델을 처음 놓았을 때: 발밑 맞추기·몸 크기·키 맞추기(되돌리기 칸은 놓기와 한 칸) */
  function onModelLoad(o) {
    var id = o.userData.id, want = pendingFit[id];
    if (want === undefined) { drawBodies(); return; }
    delete pendingFit[id];
    var e = ent(id);
    if (!e || o.userData.loadError) { return; }
    fitModel(e, o, want);
    dirty = true;
    refresh({});
  }
  /* 모델 키 맞추기 — look.fit(키 m)을 정하면 실행기·편집기가 받을 때마다 실제 경계로 키·발밑·가운데를 맞춘다. 몸(충돌)도 그 키로 */
  function fitModel(e, o, wantH) {
    var b = V.bounds(o);
    if (!b || !(b.size[1] > 1e-6)) { return; }
    var hgt = b.size[1];
    var target = wantH || (hgt > 40 || hgt < 0.1 ? 2 : r3(hgt));
    var k = target / hgt;
    e.look.fit = r3(target); delete e.look.dy; delete e.look.scale;
    e.body = e.body || { type: 'none' };
    /* 사람 크기 몸은 좁게(팔 벌린 T 자세 경계라) */
    var person = e.comps && (e.comps.player || e.comps.talk || e.comps.chase || e.comps.foe || e.comps.follow);
    e.body.size = person ? [0.8, r3(target), 0.8] : [r3(Math.max(0.2, b.size[0] * k)), r3(target), r3(Math.max(0.2, b.size[2] * k))];
  }

  function boxOf(e) {
    var body = e.body || {}, look = e.look || {};
    var size = body.size || (SIM.SHAPES[look.shape || 'box'] || SIM.SHAPES.box).size;
    var s = e.scale || [1, 1, 1], p = e.pos || [0, 0, 0], off = body.off || [0, 0, 0];
    var w = size[0] * Math.abs(s[0]), hh = size[1] * Math.abs(s[1]), d = size[2] * Math.abs(s[2]);
    var yaw = ((((e.rot || [0, 0, 0])[1]) % 180) + 180) % 180;
    if (yaw > 45 && yaw < 135) { var t = w; w = d; d = t; }
    return { c: [p[0] + off[0] * s[0], p[1] + off[1] * s[1] + hh / 2, p[2] + off[2] * s[2]], s: [w, hh, d] };
  }
  var BODY_COL = { solid: 0x52d39a, trigger: 0xffd166, dynamic: 0x5b9cff };
  function wireBox(b, col) {
    var m = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(b.s[0], b.s[1], b.s[2])), new T.LineBasicMaterial({ color: col, depthTest: false, transparent: true, opacity: 0.9 }));
    m.position.set(b.c[0], b.c[1], b.c[2]);
    m.renderOrder = 998;
    return m;
  }
  function drawBodies() {
    while (bodyGroup.children.length) { var c = bodyGroup.children.pop(); c.geometry.dispose(); c.material.dispose(); }
    var all = $('#show-bodies').checked;
    ents().forEach(function (e) {
      var t = (e.body && e.body.type) || (e.comps && e.comps.player ? 'dynamic' : 'none');
      if (e.id === selId) {
        bodyGroup.add(wireBox(boxOf(e), t === 'none' ? 0xffffff : BODY_COL[t]));
        var pt = e.comps && e.comps.patrol;
        if (pt) {
          var p = e.pos || [0, 0, 0];
          var g = new T.BufferGeometry().setFromPoints([new T.Vector3(p[0], p[1] + 0.1, p[2]), new T.Vector3(p[0] + (+pt.dx || 0), p[1] + (+pt.dy || 0) + 0.1, p[2] + (+pt.dz || 0))]);
          var ln = new T.Line(g, new T.LineBasicMaterial({ color: 0xff66cc, depthTest: false }));
          ln.renderOrder = 998; bodyGroup.add(ln);
        }
      } else if (all && t !== 'none') { bodyGroup.add(wireBox(boxOf(e), BODY_COL[t])); }
    });
  }

  /* ── 기즈모 ───────────────────────────────────────────────────────────── */
  var gz = (function () {
    var root = new T.Group(), H = { move: new T.Group(), rot: new T.Group(), scale: new T.Group() };
    function m(col, op) { return new T.MeshBasicMaterial({ color: col, depthTest: false, transparent: true, opacity: op == null ? 0.95 : op }); }
    function tag(mesh, kind, axis) { mesh.userData.h = { kind: kind, axis: axis }; mesh.renderOrder = 999; return mesh; }
    var AX = [['x', 0xe05555, new T.Vector3(1, 0, 0)], ['y', 0x4fbf6a, new T.Vector3(0, 1, 0)], ['z', 0x4f86e0, new T.Vector3(0, 0, 1)]];
    AX.forEach(function (a) {
      var grp = new T.Group();
      var shaft = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 1.2, 8), m(a[1])); shaft.position.y = 0.6;
      var tip = new T.Mesh(new T.ConeGeometry(0.11, 0.3, 14), m(a[1])); tip.position.y = 1.35;
      var pick = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 1.6, 6), m(0xffffff, 0)); pick.position.y = 0.8;
      [shaft, tip, pick].forEach(function (x) { tag(x, 'move', a[2]); grp.add(x); });
      if (a[0] === 'x') { grp.rotation.z = -Math.PI / 2; } if (a[0] === 'z') { grp.rotation.x = Math.PI / 2; }
      H.move.add(grp);
    });
    var pl = tag(new T.Mesh(new T.PlaneGeometry(0.4, 0.4), m(0xffd166, 0.5)), 'plane', null);
    pl.material.side = T.DoubleSide; pl.rotation.x = -Math.PI / 2; pl.position.set(0.35, 0, 0.35);
    H.move.add(pl);
    var ring = tag(new T.Mesh(new T.TorusGeometry(1.1, 0.03, 8, 64), m(0xffd166)), 'rot', null); ring.rotation.x = Math.PI / 2;
    var ringPick = tag(new T.Mesh(new T.TorusGeometry(1.1, 0.14, 6, 48), m(0xffffff, 0)), 'rot', null); ringPick.rotation.x = Math.PI / 2;
    H.rot.add(ring); H.rot.add(ringPick);
    AX.forEach(function (a) {
      var c = tag(new T.Mesh(new T.BoxGeometry(0.2, 0.2, 0.2), m(a[1])), 'scale1', a[2]);
      c.position.copy(a[2]).multiplyScalar(1.1); H.scale.add(c);
      var ln = tag(new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 1.0, 6), m(a[1])), 'scale1', a[2]);
      ln.position.copy(a[2]).multiplyScalar(0.5);
      if (a[0] === 'x') { ln.rotation.z = -Math.PI / 2; } if (a[0] === 'z') { ln.rotation.x = Math.PI / 2; }
      H.scale.add(ln);
    });
    H.scale.add(tag(new T.Mesh(new T.BoxGeometry(0.28, 0.28, 0.28), m(0xffffff)), 'scale', null));
    root.add(H.move); root.add(H.rot); root.add(H.scale);
    root.visible = false;
    return { root: root, H: H };
  })();
  s3.add(gz.root);
  function gizmoUpdate() {
    var e = sel();
    gz.root.visible = !!e;
    if (!e) { return; }
    var p = e.pos || [0, 0, 0];
    gz.root.position.set(p[0], p[1], p[2]);
    gz.H.move.visible = mode === 'move'; gz.H.rot.visible = mode === 'rot'; gz.H.scale.visible = mode === 'scale';
  }

  /* ── 마우스 ───────────────────────────────────────────────────────────── */
  var ray = new T.Raycaster(), ndc = new T.Vector2();
  function setRay(ev) {
    var r = cv.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
  }
  function hitGizmo() {
    if (!gz.root.visible) { return null; }
    var act = gz.H[mode];
    var hits = ray.intersectObject(act, true);
    return hits.length ? hits[0].object.userData.h : null;
  }
  function hitEntity() {
    var list = [];
    for (var id in objs) { list.push(objs[id].userData.inner); }
    var hits = ray.intersectObjects(list, true);
    for (var i = 0; i < hits.length; i++) {
      var o = hits[i].object;
      while (o && !o.userData.id) { o = o.parent; }
      if (o) { return { id: o.userData.id, point: hits[i].point }; }
    }
    return null;
  }
  function rayPlane(normal, point) {
    var pl = new T.Plane().setFromNormalAndCoplanarPoint(normal, point), out = new T.Vector3();
    return ray.ray.intersectPlane(pl, out) ? out : null;
  }
  function snapV(v, step) { return $('#snap').checked ? Math.round(v / step) * step : r3(v); }
  function stepV() { return +$('#snap-step').value || 0.5; }

  var drag = null;
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  cv.addEventListener('pointerdown', function (ev) {
    cv.focus();
    cv.setPointerCapture(ev.pointerId);
    if (ev.button === 2 || ev.button === 1 || (ev.button === 0 && ev.altKey)) {
      drag = { kind: (ev.button === 1 || ev.shiftKey) ? 'pan' : 'orbit', x: ev.clientX, y: ev.clientY };
      return;
    }
    if (ev.button !== 0) { return; }
    setRay(ev);
    var e = sel(), hg = hitGizmo();
    if (e && hg) { startHandle(hg, ev, e); return; }
    var he = hitEntity();
    if (he) {
      if (he.id !== selId) { selId = he.id; refresh({ sel: true }); }
      /* 고른 것을 그대로 끌면 바닥 판(XZ)에서 옮긴다 */
      e = sel();
      if (e) { startHandle({ kind: 'plane' }, ev, e, true); }
      return;
    }
    if (selId) { selId = null; refresh({ sel: true }); }
  });
  function startHandle(hg, ev, e, lazy) {
    var p = e.pos || [0, 0, 0];
    var origin = new T.Vector3(p[0], p[1], p[2]);
    var d = { kind: hg.kind, axis: hg.axis, origin: origin, pos0: p.slice(), rot0: (e.rot || [0, 0, 0]).slice(), scale0: (e.scale || [1, 1, 1]).slice(),
              x: ev.clientX, y: ev.clientY, lazy: !!lazy, moved: false, undo: snap() };
    if (d.kind === 'move') {
      var camDir = new T.Vector3().subVectors(origin, cam.position).normalize();
      var n = new T.Vector3().crossVectors(d.axis, new T.Vector3().crossVectors(camDir, d.axis));
      if (n.lengthSq() < 1e-6) { n.set(0, 1, 0); }
      d.normal = n.normalize();
      var pt = rayPlane(d.normal, origin);
      d.t0 = pt ? pt.clone().sub(origin).dot(d.axis) : 0;
    } else if (d.kind === 'plane') {
      d.normal = new T.Vector3(0, 1, 0);
      var pp = rayPlane(d.normal, origin);
      d.p0 = pp ? pp.clone() : origin.clone();
    } else if (d.kind === 'rot') {
      var pr = rayPlane(new T.Vector3(0, 1, 0), origin);
      d.a0 = pr ? Math.atan2(pr.x - origin.x, pr.z - origin.z) : 0;
    }
    drag = d;
  }
  cv.addEventListener('pointermove', function (ev) {
    if (!drag) { return; }
    var dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (drag.kind === 'orbit') {
      orbit.yaw -= dx * 0.006; orbit.pitch = Math.max(-0.2, Math.min(1.5, orbit.pitch + dy * 0.006));
      drag.x = ev.clientX; drag.y = ev.clientY; return;
    }
    if (drag.kind === 'pan') {
      var k = orbit.dist * 0.0016;
      var right = new T.Vector3(Math.cos(orbit.yaw), 0, -Math.sin(orbit.yaw)), fwd = new T.Vector3(-Math.sin(orbit.yaw), 0, -Math.cos(orbit.yaw));
      orbit.tx -= (right.x * dx - fwd.x * dy) * k; orbit.tz -= (right.z * dx - fwd.z * dy) * k;
      drag.x = ev.clientX; drag.y = ev.clientY; return;
    }
    if (drag.lazy && !drag.moved && Math.hypot(dx, dy) < 4) { return; }
    drag.moved = true;
    var e = sel();
    if (!e) { return; }
    setRay(ev);
    var st = stepV();
    if (drag.kind === 'move') {
      var pt = rayPlane(drag.normal, drag.origin);
      if (!pt) { return; }
      var t = pt.sub(drag.origin).dot(drag.axis) - drag.t0;
      var np = drag.pos0.slice(), ai = drag.axis.x ? 0 : drag.axis.y ? 1 : 2;
      np[ai] = snapV(drag.pos0[ai] + t, st);
      e.pos = np;
    } else if (drag.kind === 'plane') {
      var pp = rayPlane(drag.normal, drag.origin);
      if (!pp) { return; }
      e.pos = [snapV(drag.pos0[0] + pp.x - drag.p0.x, st), drag.pos0[1], snapV(drag.pos0[2] + pp.z - drag.p0.z, st)];
    } else if (drag.kind === 'rot') {
      var pr = rayPlane(new T.Vector3(0, 1, 0), drag.origin);
      if (!pr) { return; }
      var a = Math.atan2(pr.x - drag.origin.x, pr.z - drag.origin.z);
      var deg = drag.rot0[1] + (a - drag.a0) * 180 / Math.PI;
      deg = $('#snap').checked ? Math.round(deg / 15) * 15 : Math.round(deg);
      deg = ((deg % 360) + 360) % 360;
      e.rot = [drag.rot0[0], deg, drag.rot0[2]];
    } else if (drag.kind === 'scale' || drag.kind === 'scale1') {
      var f = Math.exp((dx - dy) / 160);
      var s0 = drag.scale0, ns;
      var q = function (v) { v = Math.max(0.05, v); return $('#snap').checked ? Math.max(0.1, Math.round(v * 10) / 10) : r3(v); };
      if (drag.kind === 'scale') { ns = [q(s0[0] * f), q(s0[1] * f), q(s0[2] * f)]; } else {
        ns = s0.slice(); var i = drag.axis.x ? 0 : drag.axis.y ? 1 : 2; ns[i] = q(s0[i] * f);
      }
      e.scale = ns;
    }
    dirty = true;
    syncObjs(); gizmoUpdate(); inspXform();
  });
  cv.addEventListener('pointerup', function () {
    if (drag && drag.moved && drag.undo) { undoS.push(drag.undo); redoS = []; refresh({}); }
    drag = null;
  });
  cv.addEventListener('wheel', function (ev) {
    ev.preventDefault();
    orbit.dist = Math.max(2, Math.min(300, orbit.dist * (ev.deltaY > 0 ? 1.12 : 0.89)));
  }, { passive: false });
  cv.addEventListener('dblclick', function () { focusSel(); });

  function focusSel() {
    var e = sel();
    if (!e) { return; }
    var b = boxOf(e);
    orbit.tx = b.c[0]; orbit.ty = b.c[1]; orbit.tz = b.c[2];
    orbit.dist = Math.max(6, Math.max(b.s[0], b.s[1], b.s[2]) * 3);
  }
  /* 새 개체를 놓을 자리: 카메라가 보는 바닥 점(격자에 맞춤) */
  function dropPoint() {
    var st = stepV();
    return [snapV(orbit.tx, st), 0, snapV(orbit.tz, st)];
  }

  function loop() {
    requestAnimationFrame(loop);
    if (!proj) { return; }
    camApply();
    if (gz.root.visible) { gz.root.scale.setScalar(Math.max(0.4, cam.position.distanceTo(gz.root.position) * 0.1)); }
    R.render(s3, cam);
  }

  /* ════════════════════════════════════════════════════════════════════════
     왼쪽 — 추가·개체 목록
     ════════════════════════════════════════════════════════════════════════ */
  var CHAR = 'lib:saga-go/models/people/quaternius_rpg/';
  var PRESETS = [
    { cap: '기본 도형' },
    { n: '상자', e: { name: '상자', look: { shape: 'box', color: '#c8a27a' }, body: { type: 'solid' } } },
    { n: '공', e: { name: '공', look: { shape: 'sphere', color: '#e07a5f' }, body: { type: 'solid' } } },
    { n: '원기둥', e: { name: '원기둥', look: { shape: 'cylinder', color: '#9aa5b1' }, body: { type: 'solid' } } },
    { n: '원뿔', e: { name: '원뿔', look: { shape: 'cone', color: '#81b29a' }, body: { type: 'solid' } } },
    { n: '캡슐', e: { name: '캡슐', look: { shape: 'capsule', color: '#f2cc8f' }, body: { type: 'solid', size: [0.8, 1.8, 0.8] } } },
    { n: '판', e: { name: '판', look: { shape: 'plane', color: '#b8c0cc' }, scale: [4, 1, 4], body: { type: 'solid', size: [1, 0.05, 1] } } },
    { n: '고리', e: { name: '고리', look: { shape: 'torus', color: '#ffd166' }, body: { type: 'trigger' } } },
    { n: '표시점', e: { name: '표시점', tag: 'spawn', look: { shape: 'none' }, body: { type: 'none' } } },
    { cap: '놀이 부품' },
    { n: '🧍 플레이어', e: { name: '플레이어', id: 'player', look: { shape: 'capsule', color: '#3b82f6' }, body: { type: 'dynamic', size: [0.8, 1.8, 0.8] }, comps: { player: {} } } },
    { n: '🧍 플레이어(모델)', fit: 1.8, e: { name: '플레이어', id: 'player', look: { shape: 'model', model: CHAR + 'Warrior.glb' }, body: { type: 'dynamic', size: [0.8, 1.8, 0.8] }, comps: { player: {} } } },
    { n: '🟫 발판', e: { name: '발판', look: { shape: 'box', color: '#a47551' }, scale: [4, 0.5, 4], body: { type: 'solid' } } },
    { n: '🧱 벽', e: { name: '벽', look: { shape: 'box', color: '#8d99ae' }, scale: [6, 3, 0.5], body: { type: 'solid' } } },
    { n: '🪙 동전', e: { name: '동전', tag: 'coin', pos: [0, 0.6, 0], rot: [0, 0, 0], look: { shape: 'cylinder', color: '#ffd166', glow: true }, scale: [0.6, 0.12, 0.6], body: { type: 'trigger', size: [1.4, 6, 1.4], off: [0, -2, 0] }, comps: { spin: { speed: 180 }, pickup: { var: 'coins', add: 1 } } } },
    { n: '❤ 회복', e: { name: '회복', tag: 'heal', pos: [0, 0.5, 0], look: { shape: 'sphere', color: '#ff6b6b', glow: true }, scale: [0.5, 0.5, 0.5], body: { type: 'trigger', size: [1.6, 1.6, 1.6] }, comps: { bob: {}, pickup: { var: 'hp', add: 1, sound: 'coin' } } } },
    { n: '👾 적', e: { name: '적', tag: 'enemy', look: { shape: 'capsule', color: '#d62828' }, body: { type: 'dynamic', size: [0.8, 1.8, 0.8] }, comps: { chase: {}, hurt: {}, health: { hp: 2 } } } },
    { n: '👾 적(모델)', fit: 1.4, e: { name: '적', tag: 'enemy', look: { shape: 'model', model: 'lib:saga-dungeon/models/monsters/quaternius/Alien_0bb74be9.glb' }, body: { type: 'dynamic', size: [0.9, 1.4, 0.9] }, comps: { chase: {}, hurt: {}, health: { hp: 2 } } } },
    { n: '🔺 가시', e: { name: '가시', tag: 'spike', look: { shape: 'cone', color: '#6c757d' }, scale: [0.8, 0.8, 0.8], body: { type: 'solid' }, comps: { hurt: {} } } },
    { n: '🗣 사람', e: { name: '마을 사람', look: { shape: 'capsule', color: '#2a9d8f', label: '마을 사람' }, body: { type: 'solid', size: [0.8, 1.8, 0.8] }, comps: { talk: { name: '마을 사람', lines: ['안녕, 여행자!', '동전을 다 모으면 문이 열린대.'] } } } },
    { n: '🗣 사람(모델)', fit: 1.8, e: { name: '마을 사람', look: { shape: 'model', model: CHAR + 'Cleric.glb', label: '마을 사람' }, body: { type: 'solid', size: [0.8, 1.8, 0.8] }, comps: { talk: { name: '마을 사람', lines: ['안녕, 여행자!'] } } } },
    { n: '🚪 문', e: { name: '문', look: { shape: 'torus', color: '#9b5de5', glow: true }, scale: [2.4, 2.4, 2.4], body: { type: 'trigger', size: [0.8, 1, 0.4] }, comps: { spin: { speed: 40 }, portal: { scene: '', at: '' } } } },
    { n: '🏁 결승점', e: { name: '결승점', look: { shape: 'cylinder', color: '#ffffff', glow: true, label: '결승' }, scale: [0.2, 3, 0.2], body: { type: 'trigger', size: [8, 1, 8] }, comps: { goal: {} } } },
    { n: '↔ 움직이는 발판', e: { name: '움직이는 발판', look: { shape: 'box', color: '#e9c46a' }, scale: [3, 0.4, 3], body: { type: 'solid' }, comps: { patrol: { dx: 6, dy: 0, dz: 0, speed: 2 } } } },
    { n: '⤒ 점프대', e: { name: '점프대', look: { shape: 'cylinder', color: '#06d6a0', glow: true }, scale: [1.6, 0.3, 1.6], body: { type: 'trigger', size: [1, 2, 1] }, comps: { launch: {} } } },
    { cap: '풍경(모델)' },
    { n: '🌳 나무', e: { name: '나무', look: { shape: 'model', model: 'lib:saga-go/models/nature/CommonTree_1.glb', fit: 5 }, body: { type: 'solid' } } },
    { n: '🌲 소나무', e: { name: '소나무', look: { shape: 'model', model: 'lib:saga-go/models/nature/PineTree_1.glb', fit: 6 }, body: { type: 'solid' } } },
    { n: '🪨 바위', e: { name: '바위', look: { shape: 'model', model: 'lib:saga-go/models/nature/Rock_1.glb', fit: 1.2 }, body: { type: 'solid' } } },
    { n: '🏠 집', e: { name: '집', look: { shape: 'model', model: 'lib:saga-go/models/buildings/House_1.glb', fit: 6 }, body: { type: 'solid' } } },
    { cap: '전투(전투 스타일)' },
    { n: '⚔ 근접 적', e: { name: '늑대', tag: 'foe', look: { shape: 'capsule', color: '#8d6e63' }, body: { type: 'dynamic', size: [0.8, 1.8, 0.8] }, comps: { foe: { hp: 60, atk: 8, def: 2, exp: 10, gold: 5 } } } },
    { n: '🏹 원거리 적', e: { name: '궁수', tag: 'foe', look: { shape: 'capsule', color: '#6d4c41' }, body: { type: 'dynamic', size: [0.8, 1.8, 0.8] }, comps: { foe: { hp: 40, atk: 6, def: 1, ranged: true, range: 7, exp: 12, gold: 6 } } } },
    { n: '👹 보스', e: { name: '두목', tag: 'boss', once: true, look: { shape: 'capsule', color: '#b71c1c', label: '두목' }, scale: [1.8, 1.8, 1.8], body: { type: 'dynamic', size: [0.8, 1.8, 0.8] },
      comps: { foe: { hp: 400, atk: 14, def: 4, poise: 60, enrage: 30, shield: 80, element: '', boss: true, windup: 0.9, range: 2.6, exp: 100, gold: 50, drops: ['영웅의 칼|1|sword|1|영웅', '포션|0.6|potion|2|보통'] } } } },
    { n: '🌀 스포너(파도)', e: { name: '스포너', look: { shape: 'none' }, body: { type: 'none' }, comps: { spawner: { from: '', every: 3, max: 4, radius: 6, wave: true } } } },
    { cap: '탐험·생활(saga-godot 시스템)' },
    { n: '🎁 보물 상자', e: { name: '보물 상자', look: { shape: 'box', color: '#8c5c33' }, scale: [1, 0.7, 0.7], body: { type: 'solid' }, comps: { chest: { grade: 'common', lock: 'none', var: 'gold' } } } },
    { n: '🏮 석등', e: { name: '석등', look: { shape: 'cylinder', color: '#9e9e9e' }, scale: [0.5, 1.4, 0.5], body: { type: 'solid' }, comps: { torch: { element: '', sec: 20 } } } },
    { n: '🌊 물', e: { name: '물', look: { shape: 'box', color: '#3d8fd6' }, pos: [0, -3, 0], scale: [10, 3.1, 10], body: { type: 'trigger' }, comps: { water: {} } } },
    { n: '🌿 약초(채집)', e: { name: '약초', look: { shape: 'cone', color: '#6abf4b' }, scale: [0.5, 0.6, 0.5], body: { type: 'trigger' }, comps: { gather: { item: '약초', var: 'herb', add: 1, regrow: 60 } } } },
    { n: '🎣 낚시터', e: { name: '낚시터', look: { shape: 'plane', color: '#8d6e63', label: '낚시터' }, scale: [2, 1, 2], body: { type: 'solid', size: [1, 0.05, 1] }, comps: { fishing: {} } } },
    { n: '🌱 밭', e: { name: '밭', look: { shape: 'plane', color: '#6d4c41' }, scale: [2, 1, 2], body: { type: 'none' }, comps: { plot: {} } } },
    { n: '🛒 상점 주인', e: { name: '상인', look: { shape: 'capsule', color: '#f4a261', label: '상점' }, body: { type: 'solid', size: [0.8, 1.8, 0.8] }, comps: { shop: {} } } },
    { n: '💬 하트 주민', e: { name: '주민', look: { shape: 'capsule', color: '#e76f51', label: '주민' }, body: { type: 'solid', size: [0.8, 1.8, 0.8] }, comps: { talk: { name: '주민', lines: ['안녕!'] }, bond: {} } } },
    { n: '🔥 거점(봉수대)', e: { name: '봉수대', look: { shape: 'cylinder', color: '#78909c', label: '봉수대' }, scale: [1.2, 3, 1.2], body: { type: 'solid' }, comps: { waypoint: {} } } },
    { n: '🐕 동료', e: { name: '동료', look: { shape: 'capsule', color: '#ffb703' }, scale: [0.7, 0.7, 0.7], body: { type: 'dynamic', size: [0.8, 1.8, 0.8] }, comps: { follow: {} } } },
    { n: '🦌 도감 동물', e: { name: '사슴', look: { shape: 'model', model: 'lib:saga-go/models/animals/Deer.glb', fit: 1.7 }, body: { type: 'solid' }, comps: { codex: { book: '생물' } } } }
  ];

  function addEntity(tpl, fit) {
    var d = SIM.clone(tpl);
    var sc = scene();
    if (d.comps && d.comps.player && ents().some(function (x) { return x.comps && x.comps.player && !x.off; })) {
      status('플레이어는 장면마다 하나 — 이미 있다', 'bad'); return;
    }
    for (var k in (d.comps || {})) { d.comps[k] = Object.assign(SIM.compDefaults(k), d.comps[k]); }
    if (d.comps && d.comps.portal && !d.comps.portal.scene) { d.comps.portal.scene = (proj.scenes.filter(function (s) { return s.id !== sc.id; })[0] || sc).id; }
    var p = dropPoint();
    var py = d.pos ? d.pos[1] : 0;
    edit(function () {
      d.id = newId(d.id || (d.tag || 'e'));
      d.pos = [p[0], py, p[2]];
      d.rot = d.rot || [0, 0, 0];
      d.scale = d.scale || [1, 1, 1];
      ents().push(d);
      selId = d.id;
      if (d.look && d.look.shape === 'model') { pendingFit[d.id] = fit || 0; }
    });
    status('놓았다: ' + d.name, 'ok');
  }

  function buildPresets() {
    var box = $('#presets');
    box.innerHTML = '';
    PRESETS.forEach(function (p) {
      if (p.cap) { box.appendChild(h('div', { class: 'cap', text: p.cap })); return; }
      box.appendChild(h('button', { text: p.n, title: p.n + ' 놓기(보는 곳 가운데)', onclick: function () { addEntity(p.e, p.fit); } }));
    });
  }

  function entIcon(e) {
    var c = e.comps || {};
    if (c.player) { return '🧍'; } if (c.talk) { return '🗣'; } if (c.pickup) { return '🪙'; } if (c.hurt || c.chase) { return '👾'; }
    if (c.portal) { return '🚪'; } if (c.goal) { return '🏁'; } if (c.launch) { return '⤒'; }
    if (e.look && e.look.shape === 'model') { return '◆'; } if (e.look && e.look.shape === 'none') { return '✦'; }
    return '▪';
  }
  function buildList() {
    var q = $('#ent-filter').value.trim().toLowerCase();
    var ul = $('#ents');
    ul.innerHTML = '';
    var list = ents();
    $('#ent-count').textContent = list.length + '개';
    list.forEach(function (e) {
      var hay = (e.name + ' ' + e.id + ' ' + (e.tag || '')).toLowerCase();
      if (q && hay.indexOf(q) < 0) { return; }
      ul.appendChild(h('li', { class: (e.id === selId ? 'sel ' : '') + (e.off ? 'off' : ''), title: e.id + (e.off ? ' (처음엔 없음)' : ''),
        onclick: function () { selId = e.id; refresh({ sel: true }); },
        ondblclick: function () { selId = e.id; focusSel(); refresh({ sel: true }); } }, [
        h('span', { class: 'ico', text: entIcon(e) }), h('span', { text: e.name || e.id }), e.tag ? h('span', { class: 'tag', text: '#' + e.tag }) : null
      ]));
    });
  }
  $('#ent-filter').addEventListener('input', buildList);

  /* ════════════════════════════════════════════════════════════════════════
     오른쪽 — 속성
     ════════════════════════════════════════════════════════════════════════ */
  function row(label, input, title) { return h('div', { class: 'row', title: title || null }, [h('label', { text: label }), input]); }
  function card(title, kids, extra) {
    return h('div', { class: 'card' + (extra && extra.cls ? ' ' + extra.cls : '') }, [h('div', { class: 'hd' }, [h('span', { text: title }), h('span', { class: 'grow' })].concat(extra && extra.btns || []))].concat(kids));
  }
  function numIn(val, on, step) {
    return h('input', { type: 'number', step: step || 'any', value: val == null ? '' : val, onchange: function () { var v = +this.value; if (isFinite(v)) { on(v); } } });
  }
  function txtIn(val, on, ph) { return h('input', { type: 'text', value: val == null ? '' : val, placeholder: ph || null, onchange: function () { on(this.value); } }); }
  function selIn(opts, val, on) {
    var s = h('select', { onchange: function () { on(this.value); } });
    opts.forEach(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; s.appendChild(h('option', { value: v, text: t })); });
    s.value = val == null ? '' : val;
    return s;
  }
  function chkIn(val, on) { return h('input', { type: 'checkbox', checked: !!val, onchange: function () { on(this.checked); } }); }
  function v3In(arr, def, on, step) {
    arr = arr || def;
    var box = h('div', { class: 'v3' });
    [0, 1, 2].forEach(function (i) {
      box.appendChild(h('input', { type: 'number', step: step || 'any', value: r3(arr[i]), onchange: function () {
        var v = +this.value; if (!isFinite(v)) { return; }
        var n = (arr || def).slice(); n[i] = v; on(n);
      } }));
    });
    return box;
  }
  function varList() {
    var dl = $('#var-list');
    if (!dl) { dl = h('datalist', { id: 'var-list' }); document.body.appendChild(dl); }
    dl.innerHTML = '';
    Object.keys(proj.vars || {}).forEach(function (k) { dl.appendChild(h('option', { value: k })); });
  }

  /* 표(COMP·WHEN·DO)의 칸 하나 */
  function field(spec, val, on) {
    var t = spec[0];
    if (t === 'n') { return numIn(val, on); }
    if (t === 'b') { return chkIn(val, on); }
    if (t === 'lines') {
      return h('textarea', { rows: 3, value: (val || []).join('\n'), onchange: function () { on(this.value.split('\n')); } });
    }
    if (t === 'scene') { return selIn([['', '(고르기)']].concat(proj.scenes.map(function (s) { return [s.id, s.name + ' (' + s.id + ')']; })), val, on); }
    if (t === 'var') { var i = txtIn(val, on); i.setAttribute('list', 'var-list'); return i; }
    if (t.indexOf('sel:') === 0) { return selIn(t.slice(4).split('|'), val, on); }
    return txtIn(val, on);
  }
  function fieldsOf(tbl, name, obj, onChange, skip) {
    var f = (tbl[name] || {}).f || {}, out = [];
    Object.keys(f).forEach(function (k) {
      if (skip && skip.indexOf(k) >= 0) { return; }
      out.push(h('div', { class: 'fld', title: f[k][2] }, [h('span', { class: 'field-lbl', text: f[k][2] }),
        field(f[k], obj[k], function (v) { edit(function () { obj[k] = v; onChange && onChange(); }); })]));
    });
    return out;
  }

  var xformBox = null;
  function inspXform() {
    var e = sel();
    if (!e || !xformBox) { return; }
    xformBox.innerHTML = '';
    xformBox.appendChild(row('자리', v3In(e.pos, [0, 0, 0], function (n) { edit(function () { e.pos = n; }); })));
    xformBox.appendChild(row('회전(도)', v3In(e.rot, [0, 0, 0], function (n) { edit(function () { e.rot = n; }); }, 15)));
    xformBox.appendChild(row('크기', v3In(e.scale, [1, 1, 1], function (n) { edit(function () { e.scale = n; }); }, 0.1)));
  }

  function inspEntity(e) {
    var box = $('#insp');
    var c = e.comps = e.comps || {};
    e.look = e.look || { shape: 'box' };
    e.body = e.body || { type: 'none' };
    /* 이름·id·태그 */
    box.appendChild(card('개체', [
      row('이름', txtIn(e.name, function (v) { edit(function () { e.name = v; }); })),
      row('id', txtIn(e.id, function (v) {
        v = v.trim();
        if (!/^[A-Za-z0-9_-]+$/.test(v)) { status('id 는 영문·숫자·_·- 만', 'bad'); refresh({}); return; }
        if (ent(v)) { status('이미 있는 id: ' + v, 'bad'); refresh({}); return; }
        var old = e.id;
        edit(function () { renameEntity(old, v); selId = v; });
      }), '이벤트·문에서 이 개체를 가리키는 이름. 바꾸면 가리키던 곳도 같이 바뀐다'),
      row('태그', txtIn(e.tag, function (v) { edit(function () { e.tag = v.replace(/^#/, ''); }); }, '예: coin, enemy'), '#태그 로 여럿을 한꺼번에 가리킨다'),
      row('처음엔', h('div', { class: 'inl' }, [h('label', {}, [chkIn(e.off, function (v) { edit(function () { e.off = v; }); }), ' 없음(복제 원본)']),
        h('label', {}, [chkIn(e.hidden, function (v) { edit(function () { e.hidden = v; }); }), ' 숨김'])])),
      row('한 번만', h('label', {}, [chkIn(e.once, function (v) { edit(function () { if (v) { e.once = true; } else { delete e.once; } }); }), ' 없어지면 다시 안 나옴(장면에 돌아와도)']), '주운 동전·쓰러뜨린 보스·연 문이 그대로 남는다(저장에도)')
    ], { btns: [
      h('button', { text: '⎘', title: '복제 (Ctrl+D)', onclick: dupSel }),
      h('button', { class: 'danger', text: '🗑', title: '지우기 (Del)', onclick: delSel })
    ] }));
    /* 자리 */
    xformBox = h('div');
    box.appendChild(card('자리·회전·크기', [xformBox]));
    inspXform();
    /* 모양 */
    var look = e.look;
    var lk = [
      row('모양', selIn(Object.keys(SIM.SHAPES).map(function (k) { return [k, SIM.SHAPES[k].label]; }), look.shape || 'box', function (v) {
        edit(function () { look.shape = v; if (v !== 'model') { delete look.model; delete look.dy; delete look.fit; delete look.scale; } });
      }))
    ];
    if (look.shape === 'model') {
      var a = assets.filter(function (x) { return x.ref === look.model; })[0];
      lk.push(row('모델', h('div', { class: 'inl' }, [txtIn(look.model, function (v) { edit(function () { look.model = v.trim(); }); }, 'lib:… — 아래 에셋에서 "바꾸기"')])));
      lk.push(row('앞 보정(도)', numIn(look.yaw || 0, function (v) { edit(function () { look.yaw = v; }); }), '모델이 뒤를 보면 180'));
      lk.push(row('키(m)', numIn(look.fit || '', function (v) { edit(function () { if (v > 0) { look.fit = v; delete look.dy; delete look.scale; } else { delete look.fit; } }); }), '받을 때 실제 경계로 키·발밑·가운데를 맞춘다(비우면 원래 크기)'));
      if (a && a.anims.length) {
        var opts = [['', '(저절로)']].concat(a.anims.map(function (n) { return [n, n]; }));
        look.anim = look.anim || {};
        lk.push(row('쉬기 몸짓', selIn(opts, look.anim.idle || '', function (v) { edit(function () { look.anim.idle = v || undefined; }); })));
        lk.push(row('걷기 몸짓', selIn(opts, look.anim.move || '', function (v) { edit(function () { look.anim.move = v || undefined; }); })));
      }
      lk.push(h('div', { class: 'inl' }, [h('button', { text: '키 1.8m 로', title: '사람 크기로 맞추고 몸도 다시 잰다', onclick: function () { refit(e, 1.8); } }),
        h('button', { text: '몸·발밑 다시 재기', onclick: function () { refit(e, 0); } })]));
    } else if (look.shape !== 'none') {
      lk.push(row('색', h('div', { class: 'inl' }, [h('input', { type: 'color', value: look.color || '#cccccc', onchange: function () { var v = this.value; edit(function () { look.color = v; }); } }),
        h('label', {}, [chkIn(look.glow, function (v) { edit(function () { look.glow = v; }); }), ' 빛남'])])));
    }
    lk.push(row('머리 위 글', txtIn(look.label, function (v) { edit(function () { if (v) { look.label = v; } else { delete look.label; } }); }, '(없음)')));
    box.appendChild(card('모양', lk));
    /* 몸 */
    var body = e.body;
    box.appendChild(card('몸(충돌)', [
      row('종류', selIn(Object.keys(SIM.BODIES).map(function (k) { return [k, SIM.BODIES[k]]; }), body.type || 'none', function (v) { edit(function () { body.type = v; }); })),
      row('크기', v3In(body.size, (SIM.SHAPES[look.shape || 'box'] || SIM.SHAPES.box).size, function (n) { edit(function () { body.size = n; }); }, 0.1), '배율 1 일 때 크기(개체 크기가 곱해진다)'),
      row('어긋남', v3In(body.off, [0, 0, 0], function (n) { edit(function () { body.off = n; }); }, 0.1))
    ]));
    /* 컴포넌트 */
    Object.keys(c).forEach(function (k) {
      var def = SIM.COMP[k];
      if (!def) { return; }
      box.appendChild(card('⚙ ' + def.label, [h('div', { class: 'hint', text: def.hint })].concat(fieldsOf(SIM.COMP, k, c[k])), {
        btns: [h('button', { class: 'danger', text: '✕', title: '떼기', onclick: function () { edit(function () { delete c[k]; }); } })]
      }));
    });
    var addSel = selIn([['', '＋ 컴포넌트 붙이기…']].concat(Object.keys(SIM.COMP).filter(function (k) { return !c[k]; }).map(function (k) { return [k, SIM.COMP[k].label]; })), '', function (v) {
      if (!v) { return; }
      if (v === 'player' && ents().some(function (x) { return x !== e && x.comps && x.comps.player && !x.off; })) { status('플레이어는 장면마다 하나', 'bad'); refresh({}); return; }
      edit(function () {
        c[v] = SIM.compDefaults(v);
        if (v === 'player' && body.type === 'none') { body.type = 'dynamic'; }
        if ((v === 'pickup' || v === 'portal' || v === 'goal' || v === 'launch') && body.type === 'none') { body.type = 'trigger'; }
        if (v === 'hurt' && body.type === 'none') { body.type = 'solid'; }
      });
    });
    box.appendChild(addSel);
    /* 이벤트 */
    e.events = e.events || [];
    box.appendChild(h('h3', { text: '이 개체의 이벤트', style: 'margin-top:14px' }));
    box.appendChild(h('div', { class: 'hint', text: 'self = 이 개체. 예) 닿았을 때(player → self) → 변수 +1 → 없애기(self)' }));
    eventsUI(box, e.events, true);
  }

  function refit(e, wantH) {
    var o = objs[e.id];
    if (!o) { return; }
    edit(function () { fitModel(e, o, wantH); });
  }

  function inspScene() {
    var box = $('#insp'), sc = scene();
    sc.env = sc.env || {};
    sc.camera = sc.camera || { mode: 'follow' };
    var env = sc.env, cm = sc.camera;
    box.appendChild(h('div', { class: 'hint', text: '개체를 고르지 않으면 장면 설정이 보인다.' }));
    box.appendChild(card('장면', [
      row('이름', txtIn(sc.name, function (v) { edit(function () { sc.name = v; }, { scenes: true }); })),
      row('id', txtIn(sc.id, function (v) {
        v = v.trim();
        if (!/^[A-Za-z0-9_-]+$/.test(v) || proj.scenes.some(function (s) { return s.id === v; })) { status('id 가 이상하거나 겹친다', 'bad'); refresh({}); return; }
        var old = sc.id;
        edit(function () { renameScene(old, v); }, { scenes: true });
      })),
      row('시작 장면', h('label', {}, [chkIn(proj.start === sc.id, function (v) { if (v) { edit(function () { proj.start = sc.id; }); } }), ' 게임이 여기서 시작'])),
    ]));
    box.appendChild(card('하늘·빛·땅', [
      row('하늘색', h('input', { type: 'color', value: env.sky || '#9fd0ff', onchange: function () { var v = this.value; edit(function () { env.sky = v; }); } })),
      row('안개 거리', numIn(env.fog || 0, function (v) { edit(function () { env.fog = v; }); }), '0 이면 안개 없음'),
      row('밝기', numIn(env.light == null ? 1 : env.light, function (v) { edit(function () { env.light = v; }); }, 0.1)),
      row('중력', numIn(env.gravity == null ? 22 : env.gravity, function (v) { edit(function () { env.gravity = v; }); })),
      row('땅', h('div', { class: 'inl' }, [chkIn(!!env.ground, function (v) { edit(function () { env.ground = v ? { size: 60, color: '#7fb069' } : null; }); }),
        env.ground ? numIn(env.ground.size, function (v) { edit(function () { env.ground.size = v; }); }) : h('span', { text: '없음(발판만)' }),
        env.ground ? h('input', { type: 'color', value: env.ground.color || '#7fb069', onchange: function () { var v = this.value; edit(function () { env.ground.color = v; }); } }) : null]), '땅 한 변 길이(m)·색')
    ]));
    var camRows = [row('방식', selIn([['first', '1인칭'], ['follow', '3인칭(뒤따라가기)'], ['top', '쿼터뷰(내려다보기)'], ['side', '옆에서(2.5D)'], ['fixed', '고정']], cm.mode || 'follow', function (v) { edit(function () { cm.mode = v; }); })),
      row('V 로 바꾸기', h('label', {}, [chkIn(cm.switch !== false, function (v) { edit(function () { if (v) { delete cm.switch; } else { cm.switch = false; } }); }), ' 실행 중 1인칭·3인칭·쿼터뷰 돌려 보기']), '옆·고정 장면은 안 바뀐다')];
    if (cm.mode === 'fixed') {
      camRows.push(row('카메라 자리', v3In(cm.pos, [0, 12, 16], function (n) { edit(function () { cm.pos = n; }); })));
      camRows.push(row('보는 곳', v3In(cm.look, [0, 0, 0], function (n) { edit(function () { cm.look = n; }); })));
      camRows.push(h('button', { text: '지금 편집 화면 시점으로', onclick: function () { edit(function () { cm.pos = [r3(cam.position.x), r3(cam.position.y), r3(cam.position.z)]; cm.look = [r3(orbit.tx), r3(orbit.ty), r3(orbit.tz)]; }); } }));
    } else {
      camRows.push(row('거리', numIn(cm.dist || 9, function (v) { edit(function () { cm.dist = v; }); })));
      camRows.push(row('높이', numIn(cm.height || 4.5, function (v) { edit(function () { cm.height = v; }); })));
      if (cm.mode === 'top') { camRows.push(row('방향(도)', numIn(cm.yaw || 0, function (v) { edit(function () { cm.yaw = v; }); }))); }
    }
    box.appendChild(card('카메라', camRows));
    sc.events = sc.events || [];
    box.appendChild(h('h3', { text: '장면 이벤트', style: 'margin-top:14px' }));
    box.appendChild(h('div', { class: 'hint', text: '예) 변수 coins >= 5 가 될 때 → 말하기 → 보이기(#door)' }));
    eventsUI(box, sc.events, false);
  }

  function renameScene(old, nid) {
    proj.scenes.forEach(function (s) {
      if (s.id === old) { s.id = nid; }
      function fix(list) { (list || []).forEach(function (ev) { (ev.do || []).forEach(function (a) { if (a.do === 'goto' && a.scene === old) { a.scene = nid; } }); }); }
      fix(s.events);
      (s.entities || []).forEach(function (e) { fix(e.events); if (e.comps && e.comps.portal && e.comps.portal.scene === old) { e.comps.portal.scene = nid; } });
    });
    if (proj.start === old) { proj.start = nid; }
    sceneId = nid;
  }

  /* 이벤트 카드 — 언제 / 조건 / 행동 */
  function eventsUI(box, list, forEntity) {
    list.forEach(function (ev, i) {
      ev.when = ev.when || { on: 'start' };
      ev.do = ev.do || [];
      var w = ev.when;
      var whenSel = selIn(Object.keys(SIM.WHEN).map(function (k) { return [k, SIM.WHEN[k].label]; }), w.on, function (v) {
        edit(function () { var nw = SIM.fieldDefaults(SIM.WHEN, v); nw.on = v; if (!forEntity) { if ('a' in nw) { nw.a = 'player'; } if ('b' in nw) { nw.b = v === 'gone' ? '#coin' : ''; } } ev.when = nw; });
      });
      var kids = [h('div', { class: 'row' }, [h('label', { text: '언제' }), whenSel]), h('div', { class: 'flds', style: 'display:flex;flex-wrap:wrap;gap:3px' }, fieldsOf(SIM.WHEN, w.on, w))];
      /* 조건 */
      ev.if = ev.if || [];
      kids.push(h('div', { class: 'sub', text: '조건(모두 맞아야)' }));
      ev.if.forEach(function (cnd, j) {
        var vi = txtIn(cnd.var, function (v) { edit(function () { cnd.var = v; }); }, '변수'); vi.setAttribute('list', 'var-list');
        kids.push(h('div', { class: 'cond' }, [vi, selIn(Object.keys(SIM.OPS), cnd.op || '>=', function (v) { edit(function () { cnd.op = v; }); }),
          txtIn(cnd.value, function (v) { edit(function () { cnd.value = isFinite(+v) && v !== '' ? +v : v; }); }, '값'),
          h('button', { text: '✕', onclick: function () { edit(function () { ev.if.splice(j, 1); }); } })]));
      });
      kids.push(h('button', { text: '＋ 조건', onclick: function () { edit(function () { ev.if.push({ var: Object.keys(proj.vars || {})[0] || 'coins', op: '>=', value: 1 }); }); } }));
      /* 행동 */
      kids.push(h('div', { class: 'sub', text: '행동(위에서부터 차례로)' }));
      ev.do.forEach(function (a, j) {
        var dsel = selIn(Object.keys(SIM.DO).map(function (k) { return [k, SIM.DO[k].label]; }), a.do, function (v) {
          edit(function () { var na = SIM.fieldDefaults(SIM.DO, v); na.do = v; ev.do[j] = na; });
        });
        kids.push(h('div', { class: 'act' }, [h('span', { class: 'n', text: (j + 1) + '' }),
          h('div', {}, [dsel, h('div', { class: 'flds' }, fieldsOf(SIM.DO, a.do, a))]),
          h('div', { class: 'btns' }, [
            h('button', { text: '↑', disabled: j === 0, onclick: function () { edit(function () { var t = ev.do[j - 1]; ev.do[j - 1] = a; ev.do[j] = t; }); } }),
            h('button', { text: '↓', disabled: j === ev.do.length - 1, onclick: function () { edit(function () { var t = ev.do[j + 1]; ev.do[j + 1] = a; ev.do[j] = t; }); } }),
            h('button', { text: '✕', onclick: function () { edit(function () { ev.do.splice(j, 1); }); } })])]));
      });
      kids.push(h('button', { text: '＋ 행동', onclick: function () { edit(function () { ev.do.push({ do: 'say', name: '', text: '…' }); }); } }));
      box.appendChild(card('이벤트 ' + (i + 1), kids, { cls: 'ev', btns: [
        h('label', { title: '한 번만 일어난다' }, [chkIn(ev.once, function (v) { edit(function () { if (v) { ev.once = true; } else { delete ev.once; } }); }), ' 한 번만']),
        h('button', { class: 'danger', text: '✕', onclick: function () { edit(function () { list.splice(i, 1); }); } })
      ] }));
    });
    box.appendChild(h('button', { text: '＋ 이벤트', onclick: function () {
      edit(function () { list.push(forEntity ? { when: { on: 'touch', a: 'player', b: 'self' }, do: [{ do: 'toast', text: '닿았다!', sec: 2 }] } : { when: { on: 'start' }, do: [{ do: 'toast', text: '시작!', sec: 2 }] }); });
    } }));
  }

  function buildInsp() {
    var box = $('#insp');
    box.innerHTML = '';
    xformBox = null;
    varList();
    var e = sel();
    if (e) { inspEntity(e); } else { inspScene(); }
  }

  /* ════════════════════════════════════════════════════════════════════════
     위 — 장면·검사·저장·실행·내보내기
     ════════════════════════════════════════════════════════════════════════ */
  function buildScenes() {
    var s = $('#scene-sel');
    s.innerHTML = '';
    proj.scenes.forEach(function (sc) { s.appendChild(h('option', { value: sc.id, text: (sc.id === proj.start ? '★ ' : '') + (sc.name || sc.id) })); });
    s.value = sceneId;
    $('#proj-title').textContent = proj.title || proj.id;
    $('#b-scene-del').disabled = proj.scenes.length < 2;
  }
  $('#scene-sel').addEventListener('change', function () { sceneId = this.value; selId = null; envKey = ''; refresh({ scenes: true, view: true }); });
  $('#b-scene-add').onclick = function () {
    ask('장면 추가', [['name', '이름', '새 장면'], ['id', 'id(영문)', 'scene' + (proj.scenes.length + 1)]], function (v) {
      if (!/^[A-Za-z0-9_-]+$/.test(v.id) || proj.scenes.some(function (s) { return s.id === v.id; })) { return 'id 가 이상하거나 겹친다'; }
      var cur = scene();
      edit(function () {
        var pl = cur.entities.filter(function (e) { return e.comps && e.comps.player; })[0];
        proj.scenes.push({ id: v.id, name: v.name, env: SIM.clone(cur.env || {}), camera: SIM.clone(cur.camera || { mode: 'follow' }),
          entities: pl ? [Object.assign(SIM.clone(pl), { pos: [0, 0, 0] })] : [], events: [] });
        sceneId = v.id; selId = null;
      }, { scenes: true });
    });
  };
  $('#b-scene-dup').onclick = function () {
    var cur = scene(), n = 2;
    while (proj.scenes.some(function (s) { return s.id === cur.id + '-' + n; })) { n++; }
    edit(function () { var c = SIM.clone(cur); c.id = cur.id + '-' + n; c.name = (cur.name || cur.id) + ' 사본'; proj.scenes.push(c); sceneId = c.id; selId = null; }, { scenes: true });
  };
  $('#b-scene-del').onclick = function () {
    var cur = scene();
    if (proj.scenes.length < 2) { return; }
    if (!window.confirm('장면 "' + (cur.name || cur.id) + '" 을 지울까? (되돌리기 가능)')) { return; }
    edit(function () {
      proj.scenes = proj.scenes.filter(function (s) { return s !== cur; });
      if (proj.start === cur.id) { proj.start = proj.scenes[0].id; }
      sceneId = proj.scenes[0].id; selId = null;
    }, { scenes: true });
  };

  var lastCheck = { errors: [], warns: [] };
  function check() {
    lastCheck = SIM.validate(proj);
    var b = $('#b-issues'), n = lastCheck.errors.length, w = lastCheck.warns.length;
    b.textContent = n ? '✗ ' + n : w ? '! ' + w : '✓ 0';
    b.className = n ? 'bad' : w ? 'warn' : '';
    var box = $('#issues');
    box.innerHTML = '';
    lastCheck.errors.forEach(function (t) { box.appendChild(h('div', { class: 'e', text: '✗ ' + t })); });
    lastCheck.warns.forEach(function (t) { box.appendChild(h('div', { class: 'w', text: '! ' + t })); });
    if (!n && !w) { box.appendChild(h('div', { class: 'o', text: '✓ 문제 없음' })); }
    var dn = density();
    if (dn) { box.appendChild(h('div', { class: dn.pct > 25 ? 'w' : 'o', text: 'ⓘ 발견 밀도(saga-godot density_report) — 이 장면 땅의 ' + dn.pct + '% 가 할 거리(컴포넌트 달린 개체)에서 10m 넘게 떨어져 있다' + (dn.pct > 25 ? ' — 빈 들판이 넓다' : '') })); }
  }
  $('#b-issues').onclick = function () { tab('issues'); };
  /* 발견 밀도 — 땅을 2m 칸으로 나눠, 할 거리 10m 안에 없는 칸의 비율 */
  function density() {
    var sc = scene(), g = sc.env && sc.env.ground;
    if (!g) { return null; }
    var pts = ents().filter(function (e) { return e.comps && Object.keys(e.comps).some(function (k) { return k !== 'player'; }); }).map(function (e) { return e.pos || [0, 0, 0]; });
    var half = (+g.size || 60) / 2, far = 0, all = 0;
    for (var x = -half + 1; x < half; x += 2) {
      for (var z = -half + 1; z < half; z += 2) {
        all++;
        if (!pts.some(function (p) { return Math.hypot(p[0] - x, p[2] - z) <= 10; })) { far++; }
      }
    }
    return all ? { pct: Math.round(far / all * 1000) / 10 } : null;
  }

  function api(method, url, body) {
    return fetch(url, { method: method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().then(function (j) { j._status = r.status; return j; }); });
  }
  /* 저장·실행용 사본 — 화면이 쓰려고 만들어 둔 빈 목록(이벤트·조건)을 걷어 낸다. 편집 중인 proj 는 안 건드린다 */
  function cleaned() {
    var p = SIM.clone(proj);
    p.scenes.forEach(function (s) {
      function evs(list) { (list || []).forEach(function (ev) { if (ev.if && !ev.if.length) { delete ev.if; } }); }
      evs(s.events);
      (s.entities || []).forEach(function (e) { if (e.events && !e.events.length) { delete e.events; } evs(e.events); });
    });
    return p;
  }
  function save() {
    check();
    if (lastCheck.errors.length) { status('검사 오류가 있어 저장 안 함 — 아래 "검사"', 'bad'); tab('issues'); return Promise.resolve(false); }
    status('저장 중…');
    return api('POST', '/api/project/' + proj.id, { project: cleaned(), base: md5 }).then(function (j) {
      if (j._status === 200) { md5 = j.md5; dirty = false; status('저장했다 ' + new Date().toLocaleTimeString(), 'ok'); return true; }
      status((j.error || '저장 실패') + (j.errors ? ' — ' + j.errors.join(' / ') : ''), 'bad');
      return false;
    }, function (err) { status('서버에 못 닿았다: ' + err, 'bad'); return false; });
  }
  $('#b-save').onclick = save;

  function play(here) {
    var wrap = $('#playwrap'), fr = $('#playframe');
    wrap.hidden = false;
    var msg = { type: 'saga-play', project: cleaned(), assets: { lib: '/lib/', proj: '/projects/' + proj.id + '/assets/' } };
    if (here) { msg.scene = sceneId; if (selId && !(sel().comps || {}).player) { msg.at = selId; } }
    playMsg = msg;
    fr.src = '/runtime/play.html?embed=1&t=' + Date.now();
  }
  var playMsg = null;
  window.addEventListener('message', function (e) {
    var m = e.data || {};
    if (m.type === 'saga-play-ready' && playMsg) { $('#playframe').contentWindow.postMessage(playMsg, '*'); setTimeout(function () { try { $('#playframe').contentWindow.focus(); } catch (x) { /* 다른 출처 */ } }, 50); }
    if (m.type === 'saga-play-exit') { closePlay(); }
  });
  function closePlay() { $('#playwrap').hidden = true; $('#playframe').src = 'about:blank'; cv.focus(); }
  $('#b-play').onclick = function () { play(false); };
  $('#b-play-here').onclick = function () { play(true); };
  $('#b-play-close').onclick = closePlay;

  $('#b-export').onclick = function () {
    (dirty ? save() : Promise.resolve(true)).then(function (ok) {
      if (!ok) { return; }
      status('내보내는 중…');
      api('POST', '/api/export/' + proj.id).then(function (j) {
        if (j._status === 200) {
          status('내보냄 → ' + j.dir, 'ok');
          modal([h('h2', { text: '📦 내보냈다' }), h('p', { text: j.dir }),
            h('p', {}, ['파일 ' + j.files + '개 · ' + (j.bytes / 1048576).toFixed(1) + 'MB. 폴더째 올리면(GitHub Pages 등) 어디서나 돈다. ',
              '모델을 쓴 판은 index.html 을 파일로 바로 열면(file://) 브라우저가 모델을 막는다 — 정적 서버로 연다.']),
            h('div', { class: 'foot' }, [h('button', { text: '닫기', onclick: closeModal })])]);
        } else { status((j.error || '실패') + ' ' + (j.errors || j.missing || []).join(' / '), 'bad'); }
      });
    });
  };

  /* 표 편집 — 객체 배열(파티·스킬·퀘스트)을 줄마다 칸으로. cols: [키, 머리글, 종류(s·n·b·color·var·sel:a|b·csv)] */
  function tableEd(list, cols, blank, max) {
    var wrap = h('div'), tb = h('tbody');
    function cell(o, c) {
      var k = c[0], t = c[2] || 's', v = o[k];
      if (t === 'n') { return h('input', { type: 'number', value: v == null ? '' : v, onchange: function () { o[k] = this.value === '' ? undefined : +this.value; } }); }
      if (t === 'b') { return chkIn(v, function (x) { o[k] = x; }); }
      if (t === 'color') { return h('input', { type: 'color', value: v || '#cccccc', onchange: function () { o[k] = this.value; } }); }
      if (t.indexOf('sel:') === 0) { return selIn(t.slice(4).split('|').map(function (x) { var p = x.split('='); return [p[0], p[1] || p[0] || '(없음)']; }), v || '', function (x) { o[k] = x; }); }
      if (t === 'csv') { return h('input', { value: (v || []).join(', '), onchange: function () { o[k] = this.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean); } }); }
      var i = h('input', { value: v == null ? '' : v, onchange: function () { o[k] = this.value; } });
      if (t === 'var') { i.setAttribute('list', 'var-list'); }
      return i;
    }
    function draw() {
      tb.innerHTML = '';
      tb.appendChild(h('tr', {}, cols.map(function (c) { return h('td', {}, [h('small', { text: c[1] })]); }).concat([h('td')])));
      list.forEach(function (o, i) {
        tb.appendChild(h('tr', {}, cols.map(function (c) { return h('td', {}, [cell(o, c)]); }).concat([h('td', {}, [h('button', { text: '✕', onclick: function () { list.splice(i, 1); draw(); } })])])));
      });
      add.disabled = max && list.length >= max;
    }
    var add = h('button', { text: '＋ 줄', onclick: function () { list.push(SIM.clone(blank)); draw(); } });
    wrap.appendChild(h('table', {}, [tb])); wrap.appendChild(add);
    draw();
    return wrap;
  }

  /* 설정 — 제목·변수·HUD·목표판·전투 스타일·파티·스킬·세계 시계·그래픽·레벨·퀘스트 */
  $('#b-settings').onclick = function () {
    var d = SIM.clone({ title: proj.title, desc: proj.desc || '', vars: proj.vars || {}, hud: proj.hud || [], goals: proj.goals || ['', '', ''],
      combat: proj.combat || { style: 'simple' }, world: proj.world || { clock: 'off' }, graphics: proj.graphics || {}, feel: proj.feel !== false,
      level: proj.level || null, quests: proj.quests || [] });
    d.combat.party = d.combat.party || []; d.combat.skills = d.combat.skills || [];
    while (d.goals.length < 3) { d.goals.push(''); }
    var varRows = h('tbody'), hudRows = h('tbody');
    function drawVars() {
      varRows.innerHTML = '';
      Object.keys(d.vars).forEach(function (k) {
        varRows.appendChild(h('tr', {}, [h('td', {}, [h('input', { value: k, onchange: function () { var nk = this.value.trim(); if (nk && nk !== k && !(nk in d.vars)) { d.vars[nk] = d.vars[k]; delete d.vars[k]; drawVars(); } } })]),
          h('td', {}, [h('input', { value: d.vars[k], onchange: function () { var v = this.value.trim(); d.vars[k] = v !== '' && isFinite(+v) ? +v : v; } })]),
          h('td', {}, [h('button', { text: '✕', onclick: function () { delete d.vars[k]; drawVars(); } })])]));
      });
    }
    function drawHud() {
      hudRows.innerHTML = '';
      d.hud.forEach(function (x, i) {
        hudRows.appendChild(h('tr', {}, [h('td', {}, [h('input', { value: x.var, list: 'var-list', onchange: function () { x.var = this.value; } })]),
          h('td', {}, [h('input', { value: x.label, onchange: function () { x.label = this.value; } })]),
          h('td', {}, [selIn([['', '숫자'], ['hearts', '하트']], x.style || '', function (v) { if (v) { x.style = v; } else { delete x.style; } })]),
          h('td', {}, [h('button', { text: '✕', onclick: function () { d.hud.splice(i, 1); drawHud(); } })])]));
      });
    }
    drawVars(); drawHud();
    var ti = h('input', { value: d.title, style: 'width:100%' }), de = h('textarea', { value: d.desc, rows: 2 });
    var cb = d.combat, W = d.world, G = d.graphics;
    var ELS = 'sel:=(없음)|불|물|얼음|번개|바람';
    var SK = (window.SagaCombat && window.SagaCombat.SKILL) || {};
    var lvOn = !!d.level, lv = d.level || { expVar: 'exp', lvVar: 'lv', base: 30, atk: 0.1, hpVar: 'hp', hp: 1 };
    function sec(t, hint) { return [h('h3', { text: t, style: 'margin-top:16px' }), hint ? h('div', { class: 'hint', text: hint }) : null]; }
    function numRow(label, obj, key, def, hint) { return row(label, numIn(obj[key] == null ? def : obj[key], function (v) { obj[key] = v; }), hint); }
    modal([h('h2', { text: '⚙ 프로젝트 설정' })]
      .concat([row('제목', ti), row('설명', de)])
      .concat(sec('변수(게임 내내 이어진다) — 이름 · 처음 값(숫자나 글)'), [h('table', {}, [varRows]),
        h('button', { text: '＋ 변수', onclick: function () { var n = 'v' + (Object.keys(d.vars).length + 1); while (n in d.vars) { n += '_'; } d.vars[n] = 0; drawVars(); } })])
      .concat(sec('HUD(화면 위에 보일 변수) — 변수 · 이름표 · 모양'), [h('table', {}, [hudRows]),
        h('button', { text: '＋ HUD 줄', onclick: function () { d.hud.push({ var: Object.keys(d.vars)[0] || '', label: '' }); drawHud(); } })])
      .concat(sec('목표판 3줄(오른쪽 위) — {변수} 가 값으로', '예: 동전 {coins}/10 · 레벨 {lv}'), d.goals.map(function (g, i) { return row((i + 1) + '줄', txtIn(g, function (v) { d.goals[i] = v; })); }))
      .concat(sec('전투 스타일', '간단 · 원신식(파티·원소) · 젤다식(주목·방패) · 파판식(ATB 커맨드). 적은 "전투 적" 컴포넌트.'), [
        row('스타일', selIn(Object.keys(SIM.STYLES).map(function (k) { return [k, SIM.STYLES[k].label]; }), cb.style || 'simple', function (v) { cb.style = v; })),
        numRow('공격력', cb, 'atk', '', '원신식은 파티 칸의 공격을 쓴다'), numRow('체력 최대', cb, 'hpMax', '', '회복이 넘지 못하는 값(비우면 제한 없음)'),
        numRow('포션 회복', cb, 'potionHeal', ''), numRow('MP 최대', cb, 'mpMax', 50), numRow('MP 회복/초', cb, 'mpRegen', 2), numRow('원소 스킬 쿨', cb, 'skillCd', 6, '원신식 E'),
        h('div', { class: 'hint', text: '파티(원신식·파판식) — 넷까지. 마법은 파이어·블리자드·선더·워터·에어로·케알·케알라 중 쉼표로.' }),
        tableEd(cb.party, [['name', '이름'], ['element', '원소', ELS], ['color', '색', 'color'], ['model', '모델(lib:…)'], ['hp', 'HP', 'n'], ['mp', 'MP', 'n'], ['atk', '공격', 'n'], ['def', '방어', 'n'], ['mag', '마력', 'n'], ['spd', '빠르기', 'n'], ['magic', '마법']],
          { name: '동료', element: '', color: '#cccccc', hp: 100, mp: 10, atk: 15, def: 3, mag: 8, spd: 10, magic: '' }, 4),
        h('div', { class: 'hint', text: '스킬(무예, Z X C R) — ' + Object.keys(SK).map(function (k) { return k + ' ' + SK[k]; }).join(' · ') }),
        tableEd(cb.skills, [['kind', '갈래', 'sel:' + Object.keys(SK).join('|')], ['name', '이름'], ['power', '위력(배)', 'n'], ['cd', '쿨(초)', 'n'], ['mp', 'MP', 'n'], ['element', '원소', ELS], ['r', '범위', 'n']],
          { kind: 'bolt', name: '', power: 2, cd: 4, mp: 5, element: '', r: 4 }, 4)
      ])
      .concat(sec('시간·날씨·계절', '켜면 변수 hour·day·night·weather(clear·cloud·rain·wind·fog·snow)·season 이 생기고 하늘·빛·비/눈이 바뀐다.'), [
        row('시계', selIn([['off', '끔'], ['game', '게임 시계'], ['real', '실제 시각']], W.clock || 'off', function (v) { W.clock = v; })),
        numRow('하루(실제 분)', W, 'dayMin', 24), numRow('시작 시각', W, 'start', 9), numRow('계절 길이(일)', W, 'seasonDays', 7),
        row('날씨', selIn(['auto', 'clear', 'cloud', 'rain', 'wind', 'fog', 'snow'], W.weather || 'auto', function (v) { W.weather = v; })),
        row('계절', selIn(['auto', 'spring', 'summer', 'autumn', 'winter'], W.season || 'auto', function (v) { W.season = v; }))
      ])
      .concat(sec('그래픽·손맛'), [
        row('셀 셰이딩', h('label', {}, [chkIn(G.toon, function (v) { G.toon = v; }), ' 툰(3단 명암)'])),
        row('외곽선', h('label', {}, [chkIn(G.outline, function (v) { G.outline = v; }), ' 검은 테두리'])),
        row('손맛', h('label', {}, [chkIn(d.feel, function (v) { d.feel = v; }), ' 히트스톱·피격 플래시']))
      ])
      .concat(sec('레벨', '경험치 변수가 차면 레벨 변수가 오르고 공격 배율·체력이 는다(파티 스타일은 파티 칸 레벨을 따로 쓴다).'), [
        row('켜기', chkIn(lvOn, function (v) { lvOn = v; })),
        row('경험치 변수', txtIn(lv.expVar, function (v) { lv.expVar = v; })), row('레벨 변수', txtIn(lv.lvVar, function (v) { lv.lvVar = v; })),
        numRow('필요 경험치 ×레벨', lv, 'base', 30), numRow('공격 +', lv, 'atk', 0.1), row('체력 변수', txtIn(lv.hpVar, function (v) { lv.hpVar = v; })), numRow('체력 +', lv, 'hp', 1)
      ])
      .concat(sec('퀘스트', '목표(변수 비교)를 채우면 보상 · "퀘스트를 완수했을 때" 이벤트. 처음부터 켜기 또는 행동 "퀘스트 시작". 보상은 "변수|양" 을 쉼표로.'), [
        tableEd(d.quests, [['id', 'id'], ['name', '이름'], ['desc', '설명'], ['var', '목표 변수', 'var'], ['op', '비교', 'sel:>=|>|==|!=|<|<='], ['value', '값'], ['reward', '보상(gold|10, exp|5)', 'csv'], ['auto', '처음부터', 'b']],
          { id: 'q' + (d.quests.length + 1), name: '새 퀘스트', desc: '', var: 'coins', op: '>=', value: 5, reward: ['exp|10'], auto: true })
      ])
      .concat([h('div', { class: 'foot' }, [h('button', { text: '취소', onclick: closeModal }), h('button', { class: 'primary', text: '적용', onclick: function () {
        edit(function () {
          proj.title = ti.value; proj.desc = d.desc = de.value; proj.vars = d.vars; proj.hud = d.hud;
          var goals = d.goals.filter(Boolean); if (goals.length) { proj.goals = d.goals; } else { delete proj.goals; }
          if (!cb.party.length) { delete cb.party; } if (!cb.skills.length) { delete cb.skills; }
          Object.keys(cb).forEach(function (k) { if (cb[k] === undefined || cb[k] === '') { delete cb[k]; } });
          proj.combat = cb;
          if (W.clock && W.clock !== 'off') { proj.world = W; } else { delete proj.world; }
          if (G.toon || G.outline) { proj.graphics = G; } else { delete proj.graphics; }
          if (d.feel) { delete proj.feel; } else { proj.feel = false; }
          if (lvOn) { proj.level = lv; } else { delete proj.level; }
          d.quests.forEach(function (q) { if (q.value !== '' && isFinite(+q.value)) { q.value = +q.value; } });
          if (d.quests.length) { proj.quests = d.quests; } else { delete proj.quests; }
          /* 스타일이 쓰는 변수는 저절로 만든다 */
          ['hp', 'exp', 'gold'].forEach(function (k) { if (cb.style !== 'simple' && !(k in proj.vars)) { proj.vars[k] = k === 'hp' ? 6 : 0; } });
          if (cb.skills && !('mp' in proj.vars)) { proj.vars.mp = cb.mpMax || 50; }
          if (cb.style === 'ff' && !('potion' in proj.vars)) { proj.vars.potion = 3; }
        }, { scenes: true });
        closeModal();
      } })])]));
  };

  /* ── 작은 창 ─────────────────────────────────────────────────────────── */
  function modal(kids) { var b = $('#modal-box'); b.innerHTML = ''; kids.forEach(function (k) { if (k) { b.appendChild(k); } }); $('#modal').hidden = false; }
  function closeModal() { $('#modal').hidden = true; }
  function ask(title, fields, done) {
    var ins = {}, err = h('div', { class: 'err' });
    var kids = [h('h2', { text: title })];
    fields.forEach(function (f) { ins[f[0]] = h('input', { value: f[2] || '', style: 'width:100%' }); kids.push(row(f[1], ins[f[0]])); });
    kids.push(err);
    kids.push(h('div', { class: 'foot' }, [h('button', { text: '취소', onclick: closeModal }), h('button', { class: 'primary', text: '확인', onclick: function () {
      var v = {}; for (var k in ins) { v[k] = ins[k].value.trim(); }
      var e = done(v);
      if (e) { err.textContent = e; } else { closeModal(); }
    } })]));
    modal(kids);
    setTimeout(function () { var f = ins[fields[0][0]]; f.focus(); f.select(); }, 30);
  }

  /* 프로젝트 고르기·새로 만들기 */
  function projectPicker(canClose) {
    Promise.all([api('GET', '/api/projects'), api('GET', '/api/templates')]).then(function (r) {
      var list = Array.isArray(r[0]) ? r[0] : [], tpls = Array.isArray(r[1]) ? r[1] : [];
      templates = tpls;
      var chosen = 'blank';
      var tplBox = h('div', { class: 'list' });
      function drawT() {
        tplBox.innerHTML = '';
        [{ name: 'blank', title: '빈 판', desc: '땅과 플레이어만' }].concat(tpls).forEach(function (t) {
          tplBox.appendChild(h('div', { class: 'item' + (chosen === t.name ? ' on' : ''), onclick: function () { chosen = t.name; drawT(); } }, [h('b', { text: t.title }), h('span', { text: t.desc })]));
        });
      }
      drawT();
      var idIn = h('input', { placeholder: 'my-game (영소문자·숫자·-)', style: 'width:100%' }), titleIn = h('input', { placeholder: '내 게임', style: 'width:100%' });
      var err = h('div', { class: 'err' });
      var kids = [h('h2', { text: '사가 엔진 — 프로젝트' })];
      if (list.length) {
        kids.push(h('h3', { text: '열기' }));
        kids.push(h('div', { class: 'list' }, list.map(function (p) {
          return h('div', { class: 'item', onclick: function () { open(p.id); closeModal(); } }, [h('b', { text: p.title || p.id }), h('span', { text: p.id + ' · 장면 ' + (p.scenes || 0) + (p.broken ? ' · 깨짐' : '') })]);
        })));
      }
      kids.push(h('h3', { text: '새로 만들기 — 틀 고르기' }), tplBox, row('id', idIn), row('제목', titleIn), err,
        h('div', { class: 'foot' }, [canClose ? h('button', { text: '닫기', onclick: closeModal }) : null, h('button', { class: 'primary', text: '만들기', onclick: function () {
          api('POST', '/api/new', { id: idIn.value.trim(), title: titleIn.value.trim(), template: chosen }).then(function (j) {
            if (j._status !== 200) { err.textContent = (j.error || '실패') + (j.errors ? '\n' + j.errors.join('\n') : ''); return; }
            closeModal(); open(idIn.value.trim());
          });
        } })]));
      modal(kids);
    });
  }
  $('#b-projects').onclick = function () {
    if (dirty && !window.confirm('저장 안 한 것이 있다. 그래도 다른 프로젝트를 열까?')) { return; }
    projectPicker(!!proj);
  };

  function open(id) {
    api('GET', '/api/project/' + id).then(function (j) {
      if (j._status !== 200) { status(j.error || '못 열었다', 'bad'); return; }
      proj = j.project; md5 = j.md5; dirty = false; undoS = []; redoS = [];
      sceneId = proj.start || proj.scenes[0].id; selId = null; envKey = '';
      try { localStorage.setItem('saga-engine/last', id); } catch (e) { /* 없어도 된다 */ }
      history.replaceState(null, '', '?p=' + id);
      loadAssets();
      var pl = ents().filter(function (e) { return e.comps && e.comps.player; })[0];
      var p = pl ? pl.pos : [0, 0, 0];
      orbit.tx = p[0]; orbit.ty = p[1]; orbit.tz = p[2]; orbit.dist = 24;
      refresh({ scenes: true });
      status('열었다: ' + (proj.title || id), 'ok');
      resize();
    });
  }

  /* ════════════════════════════════════════════════════════════════════════
     아래 — 에셋·검사·도움말
     ════════════════════════════════════════════════════════════════════════ */
  function tab(name) {
    document.querySelectorAll('.tabs > button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === name); });
    document.querySelectorAll('.pane').forEach(function (p) { p.classList.toggle('on', p.id === 'pane-' + name); });
    $('#asset-tools').style.visibility = name === 'assets' ? '' : 'hidden';
  }
  document.querySelectorAll('.tabs > button').forEach(function (b) { b.onclick = function () { tab(b.dataset.tab); }; });

  function loadAssets() {
    api('GET', '/api/assets?p=' + (proj ? proj.id : '')).then(function (list) {
      assets = Array.isArray(list) ? list : [];
      var cats = {};
      assets.forEach(function (a) { cats[a.cat] = 1; });
      var cs = $('#asset-cat'), cur = cs.value;
      cs.innerHTML = '';
      cs.appendChild(h('option', { value: '', text: '모든 갈래 (' + assets.length + ')' }));
      Object.keys(cats).sort().forEach(function (c) { cs.appendChild(h('option', { value: c, text: c })); });
      cs.value = cur;
      drawAssets();
    });
  }
  function drawAssets() {
    var q = $('#asset-q').value.trim().toLowerCase(), cat = $('#asset-cat').value, onlyAnim = $('#asset-anim').checked;
    var box = $('#assets');
    box.innerHTML = '';
    var shown = 0;
    assets.forEach(function (a) {
      if (cat && a.cat !== cat) { return; }
      if (onlyAnim && !a.anims.length) { return; }
      if (q && (a.name + ' ' + a.ref).toLowerCase().indexOf(q) < 0) { return; }
      if (shown++ > 300) { return; }
      box.appendChild(h('div', { class: 'asset', title: a.ref + (a.anims.length ? '\n몸짓: ' + a.anims.join(', ') : '') }, [
        h('div', { class: 'nm', text: a.name }),
        h('div', { class: 'meta', text: a.cat + ' · ' + a.game.replace('saga-', '') + ' · ' + (a.size / 1024 | 0) + 'KB' + (a.anims.length ? ' · 몸짓 ' + a.anims.length : '') }),
        h('div', { class: 'btns' }, [
          h('button', { text: '놓기', title: '새 개체로 보는 곳 가운데에', onclick: function () {
            var man = a.skinned && a.anims.length;
            addEntity({ name: a.name, look: { shape: 'model', model: a.ref }, body: { type: man ? 'solid' : 'solid', size: [1, 1.8, 1] } }, man ? 1.8 : 0);
          } }),
          h('button', { text: '바꾸기', title: '고른 개체의 모양을 이 모델로', disabled: !selId, onclick: function () {
            var e = sel(); if (!e) { return; }
            edit(function () { e.look = Object.assign({}, e.look, { shape: 'model', model: a.ref }); delete e.look.dy; delete e.look.anim; delete e.look.fit; delete e.look.scale; pendingFit[e.id] = (e.comps && (e.comps.player || e.comps.talk || e.comps.foe)) ? 1.8 : 0; });
          } })
        ])
      ]));
    });
    if (shown > 300) { box.appendChild(h('div', { class: 'asset', text: '… ' + (shown - 300) + '개 더 — 찾기로 좁힐 것' })); }
  }
  ['#asset-q', '#asset-cat', '#asset-anim'].forEach(function (s) { $(s).addEventListener('input', drawAssets); });
  $('#asset-up').addEventListener('change', function () {
    var f = this.files[0];
    if (!f || !proj) { return; }
    status('올리는 중… ' + f.name);
    fetch('/api/upload/' + proj.id + '?name=' + encodeURIComponent(f.name), { method: 'POST', body: f }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.ok) { status('올렸다: ' + j.ref, 'ok'); loadAssets(); $('#asset-q').value = f.name.replace(/\.glb$/i, ''); } else { status(j.error || '실패', 'bad'); }
    });
    this.value = '';
  });

  function buildHelp() {
    var box = $('#help');
    function li(t) { return h('li', { text: t }); }
    box.appendChild(h('h4', { text: '사가 엔진이 뭔가' }));
    box.appendChild(h('p', { text: '코드 없이 3D 게임을 만드는 도구. 게임은 project.json 하나(장면·개체·컴포넌트·이벤트·변수)이고, 같은 실행기가 편집기 안(▶ 실행)과 내보낸 판(📦)을 돌린다.' }));
    box.appendChild(h('h4', { text: '만드는 순서' }));
    box.appendChild(h('ol', {}, [li('왼쪽 "놀이 부품"에서 플레이어·발판·동전·적·사람·문·결승점을 놓는다.'),
      li('개체를 고르고 오른쪽에서 모양·몸·컴포넌트를 고친다. 컴포넌트 칸 설명을 읽으면 된다.'),
      li('규칙이 더 필요하면 이벤트(언제 → 조건 → 행동)를 단다. 개체 이벤트의 self 는 그 개체다.'),
      li('▶ 실행(F5)으로 바로 해 본다. ▶ 여기서(F6)는 지금 장면·고른 개체 자리에서 시작한다.'),
      li('💾 저장(Ctrl+S) 후 📦 내보내기 → tools/engine/dist/<id>/ 에 바로 도는 폴더.')]));
    box.appendChild(h('h4', { text: '고르개(대상 적는 법)' }));
    box.appendChild(h('ul', {}, [li('player — 플레이어 · self — 이 개체(또는 이벤트를 일으킨 개체) · other — 상대'), li('#태그 — 그 태그를 단 것 전부 · 그 밖 — 개체 id')]));
    box.appendChild(h('h4', { text: '단축키' }));
    box.appendChild(h('ul', {}, [li('W 이동 · E 회전 · R 크기 · G 격자 켜고 끄기 · F 고른 것으로 · Ctrl+D 복제 · Del 지우기 · 화살표 한 칸 옮기기(PgUp/PgDn 위아래)'),
      li('Ctrl+Z 되돌리기 · Ctrl+Y 다시 · Ctrl+S 저장 · F5 실행 · F6 여기서 실행 · Esc 고르기 풀기/실행 창 닫기')]));
    box.appendChild(h('h4', { text: '게임 안 조작(실행 창)' }));
    box.appendChild(h('ul', {}, [li('WASD 이동 · Space 점프(공중에서 한 번 더 = 활공) · Shift 달리기 · 벽으로 계속 밀면 등반 · 물에 들면 헤엄 · F 말 걸기·줍기·낚시·상점'),
      li('J·클릭 공격 · Z X C R 스킬 · H 포션 · B 도감 · M 거점 이동 · V 시점(1인칭·3인칭·쿼터뷰) · P 사진 모드(Enter 저장)'),
      li('원신식: E 원소 스킬 · Q 원소 폭발 · Shift 대시 · 1~4 파티 교체 / 젤다식: Q·Tab 주목 · Shift 방패 · 주목 중 Space 회피 · J 모았다 떼면 회전 베기 / 파판식: 적에 닿으면 ATB 전투')]));
    box.appendChild(h('h4', { text: '프로젝트 설정(⚙)에서 켜는 것' }));
    box.appendChild(h('p', { text: '전투 스타일(간단·원신식·젤다식·파판식)과 파티·스킬 · 시간·날씨·계절 · 셀 셰이딩·외곽선·손맛 · 레벨 · 목표판 3줄 · 퀘스트. 컴포넌트(보물 상자·석등·채집·낚시터·밭·상점·도감·거점·관계 하트·동료·스포너·물·전투 적)는 개체에 붙인다.' }));
  }

  /* ── 복제·지우기·단축키 ───────────────────────────────────────────────── */
  function dupSel() {
    var e = sel();
    if (!e) { return; }
    if (e.comps && e.comps.player) { status('플레이어는 복제 안 함(장면마다 하나)', 'bad'); return; }
    edit(function () {
      var c = SIM.clone(e);
      c.id = newId(e.id.replace(/\d+$/, ''));
      var p = e.pos || [0, 0, 0];
      c.pos = [p[0] + stepV() * 2, p[1], p[2]];
      ents().push(c);
      selId = c.id;
    });
  }
  function delSel() {
    var e = sel();
    if (!e) { return; }
    edit(function () { var s = scene(); s.entities = s.entities.filter(function (x) { return x !== e; }); selId = null; });
  }
  function nudge(ax, d) {
    var e = sel();
    if (!e) { return; }
    edit(function () { var p = (e.pos || [0, 0, 0]).slice(); p[ax] = r3(p[ax] + d); e.pos = p; });
  }
  document.addEventListener('keydown', function (ev) {
    if (!$('#playwrap').hidden) { if (ev.key === 'Escape') { closePlay(); } return; }
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((ev.target || {}).tagName);
    var k = ev.key, ctrl = ev.ctrlKey || ev.metaKey;
    if (ctrl && (k === 's' || k === 'S')) { ev.preventDefault(); save(); return; }
    if (k === 'F5') { ev.preventDefault(); play(false); return; }
    if (k === 'F6') { ev.preventDefault(); play(true); return; }
    if (typing) { return; }
    if (!$('#modal').hidden) { if (k === 'Escape') { closeModal(); } return; }
    if (ctrl && (k === 'z' || k === 'Z')) { ev.preventDefault(); if (ev.shiftKey) { restore(redoS, undoS); } else { restore(undoS, redoS); } return; }
    if (ctrl && (k === 'y' || k === 'Y')) { ev.preventDefault(); restore(redoS, undoS); return; }
    if (ctrl && (k === 'd' || k === 'D')) { ev.preventDefault(); dupSel(); return; }
    if (k === 'Delete' || k === 'Backspace') { ev.preventDefault(); delSel(); return; }
    if (k === 'Escape') { selId = null; refresh({ sel: true }); return; }
    if (k === 'w' || k === 'W') { setMode('move'); } else if (k === 'e' || k === 'E') { setMode('rot'); } else if (k === 'r' || k === 'R') { setMode('scale'); } else if (k === 'g' || k === 'G') { $('#snap').checked = !$('#snap').checked; } else if (k === 'f' || k === 'F') { focusSel(); } else if (sel()) {
      var st = stepV(), yaw = orbit.yaw;
      /* 화살표는 화면 기준 — 카메라가 어느 쪽을 보든 "위"는 멀어지는 쪽 */
      var fx = -Math.sin(yaw), fz = -Math.cos(yaw), useX = Math.abs(fx) > Math.abs(fz);
      if (k === 'ArrowUp') { ev.preventDefault(); if (useX) { nudge(0, Math.sign(fx) * st); } else { nudge(2, Math.sign(fz) * st); } }
      if (k === 'ArrowDown') { ev.preventDefault(); if (useX) { nudge(0, -Math.sign(fx) * st); } else { nudge(2, -Math.sign(fz) * st); } }
      if (k === 'ArrowRight') { ev.preventDefault(); if (useX) { nudge(2, -Math.sign(fx) * st); } else { nudge(0, -Math.sign(fz) * st); } }
      if (k === 'ArrowLeft') { ev.preventDefault(); if (useX) { nudge(2, Math.sign(fx) * st); } else { nudge(0, Math.sign(fz) * st); } }
      if (k === 'PageUp') { ev.preventDefault(); nudge(1, st); }
      if (k === 'PageDown') { ev.preventDefault(); nudge(1, -st); }
    }
  });
  function setMode(m) {
    mode = m;
    document.querySelectorAll('#modes button').forEach(function (b) { b.classList.toggle('on', b.dataset.mode === m); });
    gizmoUpdate();
  }
  document.querySelectorAll('#modes button').forEach(function (b) { b.onclick = function () { setMode(b.dataset.mode); }; });
  $('#b-undo').onclick = function () { restore(undoS, redoS); };
  $('#b-redo').onclick = function () { restore(redoS, undoS); };
  $('#show-bodies').addEventListener('change', drawBodies);
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ── 새로 그리기 ─────────────────────────────────────────────────────── */
  var checkTimer = null;
  function refresh(opt) {
    opt = opt || {};
    if (!proj) { return; }
    if (!scene() || scene().id !== sceneId) { sceneId = scene().id; }
    if (selId && !sel()) { selId = null; }
    buildScenes();
    buildEnv();
    syncObjs();
    gizmoUpdate();
    buildList();
    buildInsp();
    $('#b-undo').disabled = !undoS.length; $('#b-redo').disabled = !redoS.length;
    document.title = (dirty ? '● ' : '') + (proj.title || proj.id) + ' — 사가 엔진';
    clearTimeout(checkTimer);
    checkTimer = setTimeout(check, 150);
    drawAssets();
  }

  /* ── 시작 ─────────────────────────────────────────────────────────────── */
  buildPresets();
  buildHelp();
  camApply();
  resize();
  loop();
  var want = new URLSearchParams(location.search).get('p');
  try { want = want || localStorage.getItem('saga-engine/last'); } catch (e) { /* 없어도 된다 */ }
  api('GET', '/api/projects').then(function (list) {
    if (want && Array.isArray(list) && list.some(function (p) { return p.id === want; })) { open(want); } else { projectPicker(false); }
  });
  window.SagaEditor = { get project() { return proj; }, open: open, edit: edit, save: save, addEntity: addEntity, PRESETS: PRESETS, select: function (id) { selId = id; refresh({ sel: true }); } };
})();
