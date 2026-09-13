/**
 * 조우 무대 — 등용·포획을 3D 로 옮긴다
 * ---------------------------------------------------------------
 * 여태 조우는 **HTML 카드 한 장**이었다. 지도는 3D 가 됐는데 대상을 누르는 순간
 * 초상 그림과 막대 하나짜리 창이 떠서, 원작에서 가장 오래 보는 화면만 2D 로 남아 있었다.
 * 원작은 그 자리에 짐승이 서고, 조준 원이 좁혀졌다 넓어지고, 아래에서 던진다.
 *
 * **규칙은 한 줄도 안 건드린다.** 판정은 전부 `encounter.js` 것을 그대로 쓴다 —
 * 여기서 하는 일은 셋뿐이다.
 *
 *   무대     카메라를 대상 앞에 세우고(`world3d.stage`) 상대가 이쪽을 보게 한다
 *   조준 링  `encounter.aim()` 의 **바늘 값을 반지름으로 옮긴다**. 초록 고리 사이에
 *            들어왔을 때 던지면 적중 — 막대에서 재던 것과 **같은 값**을 원으로 잰다
 *   던지기   사료가 포물선으로 날아가 맞는 0.4초. 그 뒤에 결과 창이 뜬다
 *
 * 결과가 뜨는 시각은 **타이머가 보장한다**(rAF 가 안 도는 자리에서도 창이 뜬다).
 * 3D 가 없으면 이 파일은 통째로 잠들고 `encounter.js` 는 예전처럼 곧바로 결과를 그린다.
 *
 * 성공·실패의 마지막 장면(떠오르며 흩어지기·빛기둥)은 여기서 또 만들지 않는다 —
 * `world.removeSpawn` 이 불리면 `world3d` 의 배우 정리가 이미 그 연출을 한다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  function W3() { return global.DG.world3d; }
  function three() { var w = W3(); return w && w.three ? w.three() : null; }

  var S = null;            // 무대 상태 (전부 화면용 — 판정은 여기 없다)
  var ring = null, zoneIn = null, zoneOut = null, pellet = null;

  /** 3D 무대를 쓸 수 있는가 */
  function on() {
    var w = W3();
    if (global.DG_NO_DRAW) { return false; }     // 진단은 늘 예전 카드 화면으로 간다
    return !!(w && w.active() && w.three && w.three() && STAGE_ON());
  }
  /** 조우를 3D 무대로 열까 — 0 이면 예전 카드 화면 그대로다 */
  function STAGE_ON() { return core.tuned('world3d.stage3d', 1) ? true : false; }
  /** 지금 무대가 열려 있는가 — `encounter.js` 가 이걸 보고 갈림길을 정한다 */
  function active() { return on() && !!S; }

  /* ── 값 (three 없이도 도는 순수 함수 — 자가진단이 이것만 본다) ── */

  /** 바늘(0~1)을 링 반지름으로. 바늘이 클수록 링이 **좁아진다** */
  function ringR(needle, base) {
    return (base || 1) * (2.35 - core.clamp(needle, 0, 1) * 1.75);
  }
  /** 초록 고리의 안팎 반지름 — 바늘의 적중 구간을 그대로 원으로 옮긴 것 */
  function zoneR(zone, zoneW, base) {
    return {
      outer: ringR(zone - zoneW / 2, base),
      inner: ringR(zone + zoneW / 2, base)
    };
  }
  /** 포물선 — 던진 것이 t(0~1) 만큼 날아간 자리 */
  function arcAt(t, from, to, hi) {
    t = core.clamp(t, 0, 1);
    return {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t + Math.sin(t * Math.PI) * (hi === undefined ? 1.2 : hi),
      z: from.z + (to.z - from.z) * t
    };
  }

  var FLY_SEC = 0.42;      // 사료가 날아가는 시간
  var HOLD_SEC = 0.40;     // 맞고 나서 결과 창이 뜨기까지

  /* ── 소품 ─────────────────────────────────────────────── */

  function build() {
    var T = three();
    if (!T || ring) { return; }
    function circle(color, r, thick) {
      var m = new T.Mesh(
        new T.TorusGeometry(r, thick, 6, 34),
        new T.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9, depthWrite: false })
      );
      return m;
    }
    zoneOut = circle(0x5ec26a, 1, 0.035);
    zoneIn = circle(0x5ec26a, 1, 0.035);
    ring = circle(0xffffff, 1, 0.05);
    pellet = new T.Mesh(
      new T.SphereGeometry(0.20, 10, 8),
      new T.MeshLambertMaterial({ color: 0xc9803a })
    );
    pellet.visible = false;
    W3().addFx(zoneOut); W3().addFx(zoneIn); W3().addFx(ring); W3().addFx(pellet);
  }

  function drop() {
    var w = W3();
    if (!w || !ring) { return; }
    w.removeFx(zoneOut); w.removeFx(zoneIn); w.removeFx(ring); w.removeFx(pellet);
    ring = zoneIn = zoneOut = pellet = null;
  }

  /* ── 열고 닫기 ────────────────────────────────────────── */

  /* 화면을 위로 밀면 던진다 — 원작의 그 조작이다. 넣는 자리는 버튼과 **같은
     함수**(`encounter.throwNow`)라 손으로 하든 스와이프하든 판정이 갈리지 않는다. */
  var swipe = null;
  function bindSwipe() {
    var host = document.getElementById('encounter');
    if (!host || host.dataset.enc3d) { return; }
    host.dataset.enc3d = '1';
    host.addEventListener('pointerdown', function (e) {
      if (!active() || S.kind !== 'pet' || S.phase !== 'aim') { return; }
      if (e.target && e.target.closest && e.target.closest('.enc-card')) { return; }
      swipe = { x: e.clientX, y: e.clientY, t: Date.now() };
    });
    host.addEventListener('pointerup', function (e) {
      if (!swipe) { return; }
      var dy = swipe.y - e.clientY, dt = Date.now() - swipe.t;
      swipe = null;
      if (!active() || S.phase !== 'aim') { return; }
      /* 위로 60px 넘게, 0.6초 안에 — 지도를 누른 것과 구분되는 정도 */
      if (dy > 60 && dt < 600) { global.DG.encounter.throwNow(); }
    });
  }

  function open(kind, spawn) {
    if (!on() || !spawn) { return false; }
    S = {
      kind: kind, spawn: spawn, phase: 'aim', t: 0,
      ok: false, acc: 0, from: null, to: null, cb: null, nudge: 0
    };
    W3().stage({ x: spawn.x, y: spawn.y, uid: spawn.uid });
    if (document.body) { document.body.classList.add('enc3d'); }
    if (kind === 'pet') { build(); bindSwipe(); }
    return true;
  }

  function close() {
    var w = W3();
    if (w && w.stage) { w.stage(null); }
    drop();
    if (document.body) { document.body.classList.remove('enc3d'); }
    S = null;
    held = false;
  }

  /** 던졌다 — 판정은 이미 `encounter.js` 에서 끝났고, 여기서는 날아가는 동안만 맡는다 */
  function throwFx(ok, acc, cb) {
    var done = false;
    function fire() {
      if (done) { return; }
      done = true;
      if (S) { S.cb = null; }
      cb();
    }
    if (!active()) { fire(); return; }
    S.phase = 'fly';
    S.t = 0;
    S.ok = !!ok;
    S.acc = acc || 0;
    S.cb = fire;
    /* 결과 창이 뜨는 시각은 **타이머가 잡는다** — 헤드리스처럼 rAF 가 거의 돌지 않는
       자리에서도 창이 떠야 한다(3D 는 못 봐도 게임은 끝까지 가야 한다) */
    global.setTimeout(fire, (FLY_SEC + HOLD_SEC) * 1000);
  }

  /** 설득 한 마디에 대한 반응 — 공감하면 한 걸음 다가오고, 아니면 물러선다 */
  function react(hit) {
    if (!active()) { return; }
    S.nudge = hit ? 1 : -1;
    S.t = 0;
  }

  /**
   * 데모가 **한 순간을 붙들어 세울 때** 쓰는 문 (게임에서는 안 부른다).
   * 던지는 0.42초·맞는 0.4초·다가서는 0.5초는 헤드리스 스크린샷으로는 못 잡는다 —
   * 거기서는 rAF 가 몇 프레임 안 돌기 때문이다(교전의 강타 예고와 같은 사정).
   * @param o {phase, k(0~1), ok, nudge}
   */
  function hold(o) {
    if (!active()) { return false; }
    o = o || {};
    if (o.nudge) {
      S.nudge = o.nudge;
      S.t = (o.k === undefined ? 0.5 : o.k) * 0.5;
    } else {
      S.phase = o.phase || 'fly';
      S.ok = !!o.ok;
      S.t = (o.k === undefined ? 0.5 : o.k) * (S.phase === 'fly' ? FLY_SEC : HOLD_SEC);
    }
    held = true;
    return true;
  }
  var held = false;

  /* ── 매 프레임 ────────────────────────────────────────── */

  function tick(dt) {
    if (!active() || !ring) { return; }
    var w = W3();
    var cam = w.camNode ? w.camNode() : null;
    var st = w.stageAt ? w.stageAt() : null;
    if (!cam || !st) { return; }
    if (!held) { S.t += dt; }

    /* 상대의 가슴께 — 링도 사료도 여기를 겨눈다. 키는 무대가 알려 준다
       (물뿜이와 여포는 겨누는 높이가 다르다) */
    var H = st.h || 3.0;
    var center = { x: st.x, y: H * 0.52, z: st.y };
    /* 고리의 크기도 상대에 맞춘다 — 가장 클 때가 상대 키만 하고, 가장 작을 때는
       상대보다 작다. 원작의 조준 원이 그 비례다 */
    var base = H * 0.42;

    if (S.kind === 'pet' && S.phase === 'aim') {
      var a = global.DG.encounter.aim();
      if (a) {
        var z = zoneR(a.zone, a.zoneW, base);
        setRing(zoneOut, center, z.outer, cam);
        setRing(zoneIn, center, z.inner, cam);
        setRing(ring, center, ringR(a.needle, base), cam);
        ring.visible = zoneIn.visible = zoneOut.visible = true;
      }
    } else {
      ring.visible = zoneIn.visible = zoneOut.visible = false;
    }

    if (S.phase === 'fly') {
      /* 던지는 손은 **늘 카메라 발치**다 — 화면 아래에서 손이 나가는 그림이다.
         출발점을 처음 한 번만 잡아 두면, 카메라가 아직 무대로 오는 중이었을 때
         **저 멀리에서 던지는 궤적**이 굳어 버린다(사료가 화면 밖으로 날아갔다).
         더 위에서 던지거나 더 높이 띄워도 정점이 화면 밖으로 나간다. */
      var from = { x: cam.position.x, y: cam.position.y - 1.55, z: cam.position.z };
      pellet.visible = true;
      var k = S.t / FLY_SEC;
      var p = arcAt(k, from, center, 0.55);
      pellet.position.set(p.x, p.y, p.z);
      pellet.scale.setScalar(1 - k * 0.25);
      if (k >= 1) {
        S.phase = 'hit';
        S.t = 0;
        pellet.visible = false;
        /* 맞은 자리에 고리 하나가 퍼진다. 잡혔으면 빛기둥은 `world3d` 가 세운다 */
        if (w.beam && S.ok) { w.beam(st.x, st.y); }
      }
    } else if (S.phase === 'hit') {
      if (!S.ok) {
        /* 놓쳤다 — 상대가 **뒤로 물러서며** 살짝 들썩인다.
           자리는 판정이 아니라 화면 값이다 */
        var q = Math.min(1, S.t / HOLD_SEC);
        st.back = Math.sin(q * Math.PI) * 0.8;
        st.lift = Math.sin(q * Math.PI) * 0.14;
      }
      if (S.t > HOLD_SEC) { S.phase = 'done'; st.lift = 0; st.back = 0; }
    }

    if (S.nudge) {
      /* 설득 반응 — 0.5초 동안 한 걸음 다가오거나(공감) 물러섰다가(미지근) 제자리로 */
      var n = Math.min(1, S.t / 0.5);
      st.back = Math.sin(n * Math.PI) * (S.nudge > 0 ? -0.55 : 0.35);
      st.lift = Math.sin(n * Math.PI) * (S.nudge > 0 ? 0.10 : 0.04);
      if (n >= 1) { S.nudge = 0; st.lift = 0; st.back = 0; }
    }
  }

  /** 링은 늘 카메라를 마주 본다 — 비스듬히 누우면 조준하는 원으로 안 보인다 */
  function setRing(node, center, r, cam) {
    node.position.set(center.x, center.y, center.z);
    node.scale.setScalar(Math.max(0.05, r));
    node.lookAt(cam.position);
  }

  global.DG = global.DG || {};
  global.DG.encounter3d = {
    on: on, active: active,
    open: open, close: close, throwFx: throwFx, react: react, tick: tick,
    hold: hold,
    /* 값 — three 없이도 돈다 */
    ringR: ringR, zoneR: zoneR, arcAt: arcAt,
    FLY_SEC: FLY_SEC, HOLD_SEC: HOLD_SEC,
    state: function () {
      if (!S) { return null; }
      return {
        kind: S.kind, phase: S.phase, ok: S.ok, t: Math.round(S.t * 100) / 100,
        pellet: (pellet && pellet.visible)
          ? [pellet.position.x, pellet.position.y, pellet.position.z]
              .map(function (v) { return Math.round(v * 10) / 10; }).join(',')
          : '-'
      };
    }
  };
})(window);
