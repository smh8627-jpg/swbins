/**
 * 전황 — 3D 전장 (README "Phase 7 전투")
 * ---------------------------------------------------------------
 * `war.js`의 `fight()`는 이미 다 계산해 둔다(병력 손실·성벽 파손·일기토 승패).
 * 이 파일은 그 결과를 작은 전장 디오라마로 다시 그릴 뿐이다 —
 * **판정은 한 줄도 없다.** `war.js`에 더한 것도 `atkStart`·`defStart`·`defForce`
 * 와 (2026-09-03) `frames`·`duel.hits` 뿐이다 — 전부 **이미 끝난 결과를
 * 되짚어 남긴 기록**이지 새 판정이 아니다(합마다 병력·성벽이 얼마였는지,
 * 일기토가 몇 합에 누가 맞았는지). 싸움 자체(무작위·승패)는 war.js 그대로다.
 *
 * **2026-09-03 — "실시간 전투" 요청**: 예전엔 이 리포트를 한 번에 최종
 * 상태로만 그렸다(병력도 성벽도 처음부터 다 깎인 채로 등장). 사용자가
 * "지금 결과를 실시간처럼 재생"을 골라, 같은 최종 결과를 **합 단위로
 * 시간차를 두고 재생**하도록만 바꿨다 — 일기토 합마다 깃발이 흔들리고,
 * 라운드마다 무리가 줄고 성벽이 깎이는 게 보인다. `playback()` 이 그
 * 순서를 맡고, `render()`(밖에서 부르는 자리)는 안 바뀌었다.
 *
 * 병력은 숫자를 그대로 세우지 않는다(장수는 30명 안팎 세우면 도리어 어수선하다) —
 * **깃발 다발**로 무리 크기만 어림잡아 세운다. 일기토는 이긴 쪽 금빛 깃발과
 * 진 쪽이 쓰러진 회색 깃발로만 표시한다(누구 편인지는 안 가린다 — 굳이
 * 편 색을 다시 가르는 것보다 승패 그 자체가 더 눈에 든다).
 */
(function (global) {
  'use strict';

  var A3 = null;
  function asset3d() { if (!A3) { A3 = global.DG.asset3d; } return A3; }
  var FD = null;
  function forceData() { if (!FD) { FD = global.DG.forceData; } return FD; }
  var T = null;
  function three() { if (!T) { T = global.THREE || null; } return T; }
  function R() { return global.DG.rtk; }

  var TIER_H = { t1: 6, t2: 8, t3: 11 };
  function tierOf(maxWall) {
    var w = maxWall || 0;
    if (w >= 5600) { return 't3'; }
    if (w >= 4600) { return 't2'; }
    return 't1';
  }

  function forceColor(id) {
    var f = forceData().force(id);
    return f ? f.color : '#5b6572';
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ring(n, r, startAng) {
    var pts = [], i;
    for (i = 0; i < n; i++) {
      var a = startAng + (i / n) * Math.PI * 2;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  }

  var canvas = null, renderer = null, scene = null, camera = null, dyn = null;
  /** liveDyn — 합마다 다시 그리는 것만 담는다(성벽·무리·일기토 깃발).
   *  땅·성 소품(dyn 의 나머지)은 재생 내내 한 번만 짓는다 */
  var liveDyn = null, curGroup = null;
  var ready = false, failed = false, loopRunning = false;
  var rebuildSeq = 0, spin = 0;
  var timers = [];   // playback() 이 건 setTimeout id들 — 새 전황이 오면 다 지운다

  function available() { return !!three() && !failed; }

  function active() {
    return !!(ready && document.getElementById('battle3d') === canvas &&
      canvas && canvas.isConnected);
  }

  /** 캔버스가 매번 새로 태어나므로(innerHTML 교체) 옛 렌더러를 명시적으로 버리고 다시 묻는다 */
  function ensureInit() {
    var t = three();
    var el = document.getElementById('battle3d');
    if (!t || !el) { failed = true; return false; }
    if (el === canvas && ready) { return true; }
    if (renderer) {
      try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) { /* noop */ }
    }
    canvas = el; renderer = null; ready = false;
    try {
      renderer = new t.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    } catch (e) { failed = true; return false; }
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));

    scene = new t.Scene();
    camera = new t.PerspectiveCamera(44, 1, 0.5, 300);
    scene.add(new t.HemisphereLight(0xffffff, 0x4a5a3a, 1.0));
    var sun = new t.DirectionalLight(0xfff4e0, 1.05);
    sun.position.set(-12, 20, 9);
    scene.add(sun);
    dyn = new t.Group();
    scene.add(dyn);
    liveDyn = new t.Group();
    dyn.add(liveDyn);
    curGroup = dyn;

    ready = true;
    resize();
    return true;
  }

  function resize() {
    if (!renderer || !camera || !canvas) { return; }
    var w = canvas.clientWidth || 320, h = canvas.clientHeight || 190;
    if (!w || !h) { return; }
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  var blobGeo = null, blobMat = null;
  function addShadow(x, z, r) {
    var t = three();
    if (!t || !curGroup) { return; }
    if (!blobGeo) {
      blobGeo = new t.CircleGeometry(1, 16);
      blobMat = new t.MeshBasicMaterial({ color: 0x14140c, transparent: true, opacity: 0.28, depthWrite: false });
    }
    var m = new t.Mesh(blobGeo, blobMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.015, z);
    m.scale.setScalar(Math.max(0.35, r));
    curGroup.add(m);
  }

  /** kind 별 소품 하나 — asset3d 캐시 덕에 같은 kind 를 여러 번(합마다 성벽을
   *  다시 그릴 때) 불러도 두 번째부터는 사실상 즉시 온다.
   *  `liveGate` 를 주면(합 단위 재생 중인 성벽) 그 합이 지난 뒤 늦게 돌아온
   *  응답은 버린다 — 안 그러면 두 합 전 성벽이 지금 화면에 끼어든다 */
  var liveSeq = 0;
  function addProp(kind, id, x, z, scaleH, rotY, seq, liveGate) {
    var g0 = curGroup;
    asset3d().build(kind, { id: id }, function (g) {
      if (seq !== rebuildSeq || (liveGate != null && liveGate !== liveSeq) || !g || !g0) { return; }
      g.position.set(x, 0, z);
      g.rotation.y = rotY || 0;
      g.scale.setScalar(scaleH);
      g0.add(g);
      var prevGroup = curGroup;
      curGroup = g0;
      addShadow(x, z, scaleH * 0.4);
      curGroup = prevGroup;
    });
  }

  /** 병력 한 무리를 어림잡아 세우는 깃발 — 실제 소품 GLB 대신 막대+천으로 직접 짓는다
   *  (이 무리는 "성 안"의 살림살이가 아니라 숫자를 어림잡는 표식일 뿐이다) */
  function banner(color, tipped) {
    var t = three();
    var g = new t.Group();
    var pole = new t.Mesh(
      new t.CylinderGeometry(0.035, 0.035, 1.5, 5),
      new t.MeshLambertMaterial({ color: 0x6b5533 })
    );
    pole.position.y = 0.75;
    g.add(pole);
    var cloth = new t.Mesh(
      new t.BoxGeometry(0.46, 0.62, 0.03),
      new t.MeshLambertMaterial({ color: new t.Color(color) })
    );
    cloth.position.set(0.26, 1.16, 0);
    g.add(cloth);
    if (tipped) { g.rotation.z = 1.15; g.position.y = 0.05; }
    return g;
  }

  function cluster(n, cx, cz, color) {
    var i, cols = Math.min(5, Math.max(1, n));
    for (i = 0; i < n; i++) {
      var row = Math.floor(i / cols), col = i % cols;
      var x = cx + (col - (cols - 1) / 2) * 0.55 + (Math.random() - 0.5) * 0.12;
      var z = cz - row * 0.55 + (Math.random() - 0.5) * 0.12;
      var b = banner(color, false);
      b.position.set(x, 0, z);
      curGroup.add(b);
      addShadow(x, z, 0.22);
    }
  }

  /** 한 번만 짓는 것 — 땅·성. 성벽·무리·일기토 깃발은 `renderLive()` 몫이다
   *  (합마다 다시 그려야 하므로).
   *  @returns {seq,h,maxWall} — renderLive() 에 그대로 넘긴다. 성이 없으면 null */
  function buildBase(rep) {
    var t = three();
    dyn.clear();
    liveDyn = new t.Group();
    dyn.add(liveDyn);
    rebuildSeq++;
    var seq = rebuildSeq;
    curGroup = dyn;
    var c = R().city(rep.to);
    if (!c) { return null; }
    var tier = tierOf(c.maxWall);
    var h = TIER_H[tier];
    var ownerCol = forceColor(c.force);

    scene.background = new t.Color(rep.water ? 0x8fc4e6 : 0xb9dcef);
    scene.fog = new t.Fog(rep.water ? 0x8fc4e6 : 0xb9dcef, 20, 70);

    var ground = new t.Mesh(
      new t.CircleGeometry(11, 28),
      new t.MeshLambertMaterial({ color: rep.water ? 0x5aa9d8 : 0xcfe0a0 })
    );
    ground.rotation.x = -Math.PI / 2;
    dyn.add(ground);

    asset3d().build('city:' + tier, { id: rep.to + ':battle', tint: ownerCol, flag: ownerCol }, function (g) {
      if (seq !== rebuildSeq || !g || !dyn) { return; }
      g.position.set(0, 0, -6.5);
      g.scale.setScalar(h);
      dyn.add(g);
      var prevGroup = curGroup;
      curGroup = dyn;
      addShadow(0, -6.5, h * 0.45);
      curGroup = prevGroup;
    });

    return { seq: seq, h: h, maxWall: c.maxWall || 1 };
  }

  /**
   * 합 하나(또는 최종)를 그린다 — **성벽·무리 크기·일기토 깃발만** 다시 그린다.
   * `state = { atk, def, wall, duelPhase }` — atk/def 는 그 순간의 병력(절대
   * 값), wall 은 그 순간의 성벽 값. duelPhase: null(아직 안 붙었다) ·
   * 'progress'(맞붙는 중, 승패색을 안 가른다) · 'done'(끝났다, 금빛/회색).
   * war.js 의 `frames` 를 순서대로 이 함수에 먹이면 재생이 된다 — **여기서
   * 새 판정은 안 한다**, 이미 정해진 값을 그릴 뿐이다.
   */
  function renderLive(rep, base, state) {
    if (!base || base.seq !== rebuildSeq || !liveDyn) { return; }
    var seq = base.seq, h = base.h;
    liveDyn.clear();
    curGroup = liveDyn;
    liveSeq++;
    var myLiveSeq = liveSeq;

    if (!rep.water) {
      var wallRatio = clamp((state.wall || 0) / base.maxWall, 0, 1);
      var wallN = Math.round(wallRatio * 6);
      ring(6, h * 0.7, 0).slice(0, wallN).forEach(function (p, i) {
        addProp('wall', rep.to + ':bwall:' + i, p[0], p[1] - 6.5, h * 0.5,
          Math.atan2(p[0], p[1]) + Math.PI / 2, seq, myLiveSeq);
      });
    }

    var atkStart = rep.atkStart || 6000, defStart = rep.defStart || 6000;
    var atkSurvive = clamp((state.atk != null ? state.atk : atkStart) / Math.max(1, atkStart), 0, 1);
    var defSurvive = clamp((state.def != null ? state.def : defStart) / Math.max(1, defStart), 0, 1);
    var atkN = clamp(Math.round((atkStart / 1200) * atkSurvive), 1, 14);
    var defN = clamp(Math.round((defStart / 1200) * defSurvive), 1, 14);

    cluster(atkN, 0, 4.2, forceColor(rep.force));
    cluster(defN, 0, -3.0, forceColor(rep.defForce));

    /* 일기토 — 끝나기 전엔 승패색 없이 마주 세우고, 끝나면 이긴 쪽 금빛·
       진 쪽 쓰러진 회색으로(누구 편인지는 안 가린다) */
    if (rep.duel && state.duelPhase) {
      if (state.duelPhase === 'done') {
        var wb = banner(0xd8b660, false);
        wb.position.set(-0.5, 0, 0.6);
        curGroup.add(wb);
        addShadow(-0.5, 0.6, 0.22);
        var lb = banner(0x4a4a4a, !!rep.duel.hurt);
        lb.position.set(0.5, 0, 0.3);
        curGroup.add(lb);
        addShadow(0.5, 0.3, 0.22);
      } else {
        var b1 = banner(0xcac0a0, false);
        b1.position.set(-0.5, 0, 0.6);
        curGroup.add(b1);
        addShadow(-0.5, 0.6, 0.22);
        var b2 = banner(0xcac0a0, false);
        b2.position.set(0.5, 0, 0.3);
        curGroup.add(b2);
        addShadow(0.5, 0.3, 0.22);
      }
    }
  }

  /** playback() 이 건 setTimeout 들 — 새 전황이 오거나 화면을 벗어나면 다 지운다 */
  function clearTimers() {
    for (var i = 0; i < timers.length; i++) { clearTimeout(timers[i]); }
    timers = [];
  }
  function schedule(fn, delay) { timers.push(setTimeout(fn, delay)); }

  var ROUND_MS = 550, HIT_MS = 380, PAUSE_MS = 500;

  /**
   * **"실시간 전투" 재생** — `war.js` 가 이미 끝내 둔 결과(`rep`)를 합 단위로
   * 시간차를 두고 다시 그린다. 판정은 전혀 안 한다 — `rep.frames`(라운드별
   * 병력·성벽)와 `rep.duel.hits`(일기토 합별 승패)를 순서대로 `renderLive()`
   * 에 먹일 뿐이다. 둘 다 없는 옛 리포트(세이브에 남아 있던 것 등)라도
   * 최종 상태 하나는 그린다 — 안전망.
   */
  function playback(rep) {
    clearTimers();
    var base = buildBase(rep);
    if (!base) { return; }
    var seq = base.seq;
    var atkStart = rep.atkStart || 6000, defStart = rep.defStart || 6000;
    var wallFrom = rep.wallFrom != null ? rep.wallFrom : base.maxWall;
    var guard = function (fn) { return function () { if (seq === rebuildSeq) { fn(); } }; };

    /* 0) 붙기 전 — 온전한 두 진 */
    renderLive(rep, base, { atk: atkStart, def: defStart, wall: wallFrom, duelPhase: null });
    var delay = PAUSE_MS;

    /* 1) 일기토 — 합마다 잠깐씩 멈춰 마주 선 깃발을 보여주다가 끝나면 승패색 */
    if (rep.duel) {
      var hits = rep.duel.hits || [];
      for (var i = 0; i < hits.length; i++) {
        schedule(guard(function () {
          renderLive(rep, base, { atk: atkStart, def: defStart, wall: wallFrom, duelPhase: 'progress' });
        }), delay);
        delay += HIT_MS;
      }
      schedule(guard(function () {
        renderLive(rep, base, { atk: atkStart, def: defStart, wall: wallFrom, duelPhase: 'done' });
      }), delay);
      delay += PAUSE_MS;
    }

    /* 2) 라운드 — war.js 가 남긴 합별 스냅샷을 그대로 순서대로 */
    var frames = rep.frames || [];
    var duelDone = rep.duel ? 'done' : null;
    for (var fi = 0; fi < frames.length; fi++) {
      (function (f) {
        schedule(guard(function () {
          renderLive(rep, base, { atk: f.atk, def: f.def, wall: f.wall, duelPhase: duelDone });
        }), delay);
      })(frames[fi]);
      delay += ROUND_MS;
    }

    /* 3) 마지막 — frames 가 없던 옛 리포트까지 포함해 최종 수치로 못박는다 */
    schedule(guard(function () {
      var finalAtk = atkStart - (rep.lossA || 0), finalDef = defStart - (rep.lossD || 0);
      renderLive(rep, base, { atk: finalAtk, def: finalDef, wall: rep.wallTo, duelPhase: duelDone });
    }), delay);
  }

  /** 밖에서 부르는 단 하나의 입구 — `rtk:battle` 리포트 하나를 그대로 재생한다 */
  function render(rep) {
    if (!rep || !ensureInit()) { return; }
    playback(rep);
    resize();
    startLoop();
  }

  function startLoop() {
    if (loopRunning) { return; }
    loopRunning = true;
    requestAnimationFrame(tick);
  }

  /** 카메라 손잡이를 새로 두지 않는다 — 천천히 저절로 돈다 */
  function tick() {
    if (!active()) { loopRunning = false; clearTimers(); return; }
    spin += 0.004;
    var dist = 13;
    camera.position.set(Math.sin(spin) * dist, 8.5, Math.cos(spin) * dist - 1);
    camera.lookAt(0, 3, -2);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  global.DG = global.DG || {};
  global.DG.battle3d = { available: available, render: render };
})(window);
