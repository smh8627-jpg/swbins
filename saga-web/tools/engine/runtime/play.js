/**
 * 사가 엔진 — 실행기(play). sim(규칙)을 1/60초씩 돌리고 view(그리기)로 보여 준다. 입력·카메라·HUD·소리·터치 조작.
 * 전투 스타일 화면(적 체력·피해 숫자·파티·ATB 메뉴)은 play-combat.js 가 맡는다.
 *
 * 프로젝트를 받는 길 셋(위에서부터):
 *   window.SAGA_PROJECT            내보낸 판(index.html 에 박혀 있다) — 에셋 앞머리는 window.SAGA_ASSETS
 *   ?p=<id>                        엔진 서버의 /api/project/<id> 를 받아 돈다
 *   ?embed=1                       편집기 안 "▶ 실행" — 부모 창이 postMessage 로 넘긴다(저장 안 한 것도 곧바로)
 *
 * 시점(장면 camera.mode): first 1인칭 · follow 3인칭 · top 쿼터뷰 · side 옆(2.5D) · fixed 고정.
 *   camera.switch 가 false 가 아니면 V 로 1인칭 → 3인칭 → 쿼터뷰를 돈다(옆·고정 장면은 안 돈다).
 *   1인칭은 화면을 누르면 마우스가 잠겨 시선이 된다(Esc 로 풀림).
 * 조작(공통): 방향키/WASD · Space 점프 · F(또는 E) 말 걸기·살피기 · 마우스 끌기 카메라 · 휠 거리 · R 다시 하기
 *   전투 스타일별 키는 화면 왼쪽 아래에 뜬다(play-combat.js KEYS).
 */
(function (root) {
  'use strict';
  var T = root.THREE, SIM = root.SagaSim, V = root.SagaView;
  var doc = root.document;
  var DT = 1 / 60;
  var VIEWS = ['first', 'follow', 'top'];
  var VIEW_NAME = { first: '1인칭', follow: '3인칭', top: '쿼터뷰', side: '옆 보기', fixed: '고정' };

  /* ── 소리 — 파일 없이 만든다 ───────────────────────────────────────────── */
  var AC = null;
  var SFX = {
    coin: [['square', 988, 0.05], ['square', 1319, 0.12]],
    jump: [['sine', 330, 0.02, 660, 0.14]],
    hit: [['sawtooth', 220, 0.02, 70, 0.18]],
    win: [['triangle', 523, 0.1], ['triangle', 659, 0.1], ['triangle', 784, 0.1], ['triangle', 1047, 0.3]],
    lose: [['triangle', 392, 0.15], ['triangle', 330, 0.15], ['triangle', 262, 0.4]],
    blip: [['square', 740, 0.04]],
    door: [['triangle', 220, 0.02, 440, 0.22]]
  };
  function sfx(name) {
    var seq = SFX[name];
    if (!seq) { return; }
    try { AC = AC || new (root.AudioContext || root.webkitAudioContext)(); } catch (e) { return; }
    if (AC.state === 'suspended') { AC.resume(); }
    var t = AC.currentTime;
    seq.forEach(function (n) {
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = n[0]; o.frequency.setValueAtTime(n[1], t);
      var len = n[4] != null ? n[4] : n[2];
      if (n[3]) { o.frequency.exponentialRampToValueAtTime(n[3], t + len); }
      g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + len + 0.03);
      o.connect(g); g.connect(AC.destination);
      o.start(t); o.stop(t + len + 0.05);
      t += n[4] != null ? n[4] : n[2];
    });
  }

  function el(tag, cls, parent, text) {
    var e = doc.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    if (parent) { parent.appendChild(e); }
    return e;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function start(project, opt) {
    opt = opt || {};
    var canvas = opt.canvas || doc.getElementById('cv');
    var hudRoot = opt.hud || doc.getElementById('hud');
    var val = SIM.validate(project);
    if (val.errors.length) {
      hudRoot.innerHTML = '<div class="err"><b>이 프로젝트는 돌릴 수 없다</b><br>' + val.errors.map(esc).join('<br>') + '</div>';
      return null;
    }
    V.setStyle(project.graphics || {});
    var sim = SIM.create(project, { seed: opt.seed });
    if (opt.scene && opt.scene !== sim.state.sceneId) { sim.enterScene(opt.scene, opt.at || null); }
    var S = sim.state, style = sim.style;

    var R = V.renderer(canvas);
    var scene3 = new T.Scene();
    var cam = new T.PerspectiveCamera(60, 1, 0.05, 500);
    var envNow = null, objs = {}, poofs = [];
    var view = 'follow', camYaw = 0, camPitch = 0, camH = 4.5, camD = 9, shakeT = 0, shakePow = 0;
    var listeners = [];
    function on(target, ev, fn, o) { target.addEventListener(ev, fn, o); listeners.push([target, ev, fn, o]); }

    /* HUD 뼈대 */
    hudRoot.innerHTML = '';
    var hudVars = el('div', 'vars', hudRoot);
    var toastEl = el('div', 'toast', hudRoot);
    var promptEl = el('div', 'prompt', hudRoot);
    var dlg = el('div', 'dialog', hudRoot);
    var dlgName = el('div', 'name', dlg), dlgText = el('div', 'text', dlg);
    el('div', 'more', dlg, '▶ F / Space');
    var over = el('div', 'over', hudRoot);
    var overBox = el('div', 'box', over);
    var overTitle = el('div', 'title', overBox), overText = el('div', 'text', overBox);
    var again = el('button', '', overBox, '다시 하기 (R)');
    again.onclick = function () { restart(); };
    var sceneName = el('div', 'scene-name', hudRoot);
    var viewTag = el('div', 'view-tag', hudRoot);
    var cross = el('div', 'cross', hudRoot, '+');

    var CB = root.SagaPlayCombat ? root.SagaPlayCombat.create({ sim: sim, S: S, style: style, project: project, scene3: scene3, cam: cam, canvas: canvas, hud: hudRoot, objs: function () { return objs; }, sfx: sfx }) : null;
    var SY = root.SagaPlaySystems ? root.SagaPlaySystems.create({ sim: sim, S: S, project: project, scene3: scene3, cam: cam, canvas: canvas, hud: hudRoot, objs: function () { return objs; },
      persist: !!opt.persist, feel: project.feel !== false }) : null;

    function sceneViews() {
      var c = S.scene.camera || {};
      if (c.mode === 'side' || c.mode === 'fixed' || c.switch === false) { return [c.mode || 'follow']; }
      return VIEWS;
    }
    function setView(v, silent) {
      view = v;
      var c = S.scene.camera || {};
      camH = +c.height || (v === 'top' ? 14 : 4.5);
      camD = +c.dist || (v === 'top' ? 14 : 9);
      if (v === 'top') { camYaw = (c.yaw != null ? +c.yaw : 45) * Math.PI / 180; }
      if ((v === 'follow' || v === 'first') && S.player) { camYaw = S.player.r[1] * Math.PI / 180 + Math.PI; camPitch = 0; }
      cam.fov = v === 'top' ? 42 : v === 'first' ? 72 : 60;
      cam.updateProjectionMatrix();
      if (v !== 'first' && doc.pointerLockElement === canvas) { doc.exitPointerLock(); }
      cross.classList.toggle('show', v === 'first');
      if (!silent) { viewTag.textContent = '시점: ' + VIEW_NAME[v] + (sceneViews().length > 1 ? '  (V 로 바꾸기)' : ''); viewTag.classList.remove('show'); void viewTag.offsetWidth; viewTag.classList.add('show'); }
    }

    function buildScene() {
      for (var k in objs) { scene3.remove(objs[k]); V.dispose(objs[k]); }
      objs = {};
      if (envNow) { scene3.remove(envNow.group); }
      envNow = V.env(S.scene);
      envNow.apply(scene3);
      var c = S.scene.camera || {};
      var keep = sceneViews().indexOf(view) >= 0 && sceneViews().length > 1;
      setView(keep ? view : (c.mode || 'follow'), true);
      placeCamera(1);
      sceneName.textContent = S.scene.name || '';
      sceneName.classList.remove('show'); void sceneName.offsetWidth; sceneName.classList.add('show');
      if (CB) { CB.scene(); }
    }
    function restart() { if (SY) { SY.clearSave(); } sim.restart(); sim.drainFx(); buildScene(); if (SY) { SY.resetSession(); } }

    /* ── 입력 ─────────────────────────────────────────────────────────── */
    var held = {}, hit = {}, joy = { x: 0, z: 0 }, jumpBuf = 0, clickAtk = false, relAtk = false, shiftT = 0;
    var MOVE = { KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
    function onKey(e, down) {
      if (e.code in MOVE || e.code === 'Space' || e.code === 'Tab' || e.code === 'Backspace') { e.preventDefault(); }
      if (down && !e.repeat) {
        hit[e.code] = true;
        if (e.code === 'Space') { jumpBuf = 0.12; }
        if (e.code === 'KeyR' && S.over) { restart(); }
        if (SY && (e.code === 'KeyB' || e.code === 'KeyM')) { SY.keys(e.code); }
        if (SY && e.code === 'KeyP' && !S.menu && !S.over) { SY.togglePhoto(); }
        if (SY && e.code === 'Enter' && SY.photo()) { SY.snapPhoto(R); }
        if (e.code === 'KeyV' && !S.battle) { var vs = sceneViews(); if (vs.length > 1) { setView(vs[(vs.indexOf(view) + 1) % vs.length]); } }
        if (e.code === 'Escape' && opt.onExit && doc.pointerLockElement !== canvas) { opt.onExit(); }
      }
      if (!down && e.code === 'KeyJ') { relAtk = true; }
      held[e.code] = down;
    }
    on(root, 'keydown', function (e) { onKey(e, true); });
    on(root, 'keyup', function (e) { onKey(e, false); });
    on(root, 'blur', function () { held = {}; });

    /* 마우스 — 끌면 카메라, 짧게 누르면 공격. 1인칭은 누르면 마우스를 잠근다 */
    var drag = null;
    on(canvas, 'pointerdown', function (e) {
      if (e.pointerType !== 'mouse') { return; }
      if (view === 'first' && doc.pointerLockElement !== canvas && canvas.requestPointerLock) { canvas.requestPointerLock(); return; }
      if (view === 'first') { if (e.button === 0) { clickAtk = true; } return; }
      drag = { x: e.clientX, y: e.clientY, moved: 0, btn: e.button };
    });
    on(root, 'pointermove', function (e) {
      if (view === 'first' && doc.pointerLockElement === canvas) {
        camYaw -= (e.movementX || 0) * 0.0025;
        camPitch = Math.max(-1.3, Math.min(1.3, camPitch - (e.movementY || 0) * 0.0025));
        return;
      }
      if (!drag) { return; }
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      if (view === 'follow' || view === 'first' || (SY && SY.photo())) { camYaw -= dx * 0.006; camH = Math.max(0.5, Math.min(20, camH + dy * 0.03)); }
      drag.x = e.clientX; drag.y = e.clientY;
    });
    on(root, 'pointerup', function () { if (drag && drag.moved < 5 && drag.btn === 0) { clickAtk = true; } drag = null; });
    on(canvas, 'wheel', function (e) { e.preventDefault(); camD = Math.max(3, Math.min(40, camD * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });

    /* 터치 — 왼쪽 막대, 오른쪽 단추(전투 스타일이면 공격·스킬 단추가 더 붙는다) */
    var touch = ('ontouchstart' in root) || (root.navigator && root.navigator.maxTouchPoints > 0);
    if (touch) {
      var pad = el('div', 'tpad', hudRoot), knob = el('div', 'knob', pad);
      var tid = null, t0 = null;
      pad.addEventListener('pointerdown', function (e) { tid = e.pointerId; t0 = { x: e.clientX, y: e.clientY }; pad.setPointerCapture(e.pointerId); });
      pad.addEventListener('pointermove', function (e) {
        if (e.pointerId !== tid) { return; }
        var dx = e.clientX - t0.x, dy = e.clientY - t0.y, m = Math.hypot(dx, dy), r = 50;
        if (m > r) { dx *= r / m; dy *= r / m; }
        joy.x = dx / r; joy.z = -dy / r;
        knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      });
      var end = function (e) { if (e.pointerId !== tid) { return; } tid = null; joy.x = joy.z = 0; knob.style.transform = ''; };
      pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
      var BTN = { simple: [['점프', 'Space'], ['E', 'KeyE']], genshin: [['점프', 'Space'], ['공격', 'KeyJ'], ['스킬', 'KeyE'], ['폭발', 'KeyQ'], ['대시', 'ShiftLeft']],
                  zelda: [['점프', 'Space'], ['공격', 'KeyJ'], ['주목', 'KeyQ'], ['방패', 'ShiftLeft']], ff: [['확인', 'Enter'], ['취소', 'KeyX'], ['▲', 'ArrowUp'], ['▼', 'ArrowDown']] };
      var extraBtn = [['F', 'KeyF']];
      ((S.cb && S.cb.skills) || []).forEach(function (s, i) { extraBtn.push([s.def.name || 'ZXCR'[i], ['KeyZ', 'KeyX', 'KeyC', 'KeyR'][i]]); });
      if (style !== 'ff' && S.vars.potion != null) { extraBtn.push(['포션', 'KeyH']); }
      extraBtn.push(['시점', 'KeyV']);
      (BTN[style] || BTN.simple).concat(extraBtn).forEach(function (b, i) {
        var bt = el('button', 'tbtn', hudRoot, b[0]);
        bt.style.right = (20 + (i % 3) * 74) + 'px'; bt.style.bottom = (24 + Math.floor(i / 3) * 74) + 'px';
        bt.addEventListener('pointerdown', function (e) { e.preventDefault(); hit[b[1]] = true; held[b[1]] = true; if (b[1] === 'Space') { jumpBuf = 0.12; } });
        bt.addEventListener('pointerup', function () { held[b[1]] = false; if (b[1] === 'KeyJ') { relAtk = true; } });
      });
    }

    function input() {
      var mx = joy.x, mz = joy.z;
      for (var k in MOVE) { if (held[k]) { mx += MOVE[k][0]; mz += MOVE[k][1]; } }
      var c = S.scene.camera || {};
      var yaw = view === 'side' ? 0 : camYaw;
      if (view === 'fixed') { yaw = Math.atan2(cam.position.x - (c.look ? c.look[0] : 0), cam.position.z - (c.look ? c.look[2] : 0)); }
      var g = style === 'genshin';
      var shiftHeld = !!(held.ShiftLeft || held.ShiftRight);
      shiftT = shiftHeld ? shiftT + DT : 0;
      var inp = {
        mx: mx, mz: mz, yaw: yaw, jump: jumpBuf > 0, jumpHit: !!hit.Space, keys: hit,
        sprint: style !== 'zelda' && shiftHeld && (style !== 'genshin' || shiftT > 0.25),
        sk: hit.KeyZ ? 1 : hit.KeyX ? 2 : hit.KeyC ? 3 : hit.KeyR && !S.over ? 4 : 0, potion: !!hit.KeyH,
        act: !!(hit.KeyF || hit.Enter || hit.NumpadEnter || (!g && hit.KeyE)),
        atk: !!(hit.KeyJ || clickAtk), atkHeld: !!held.KeyJ, atkUp: relAtk,
        skill: g && !!hit.KeyE, burst: g && !!hit.KeyQ,
        dodge: !!(hit.ShiftLeft || hit.ShiftRight), block: !!(held.ShiftLeft || held.ShiftRight || held.KeyK),
        lock: !!(hit.KeyQ || hit.Tab) && style === 'zelda',
        sw: hit.Digit1 ? 1 : hit.Digit2 ? 2 : hit.Digit3 ? 3 : hit.Digit4 ? 4 : 0,
        up: !!(hit.ArrowUp || hit.KeyW), down: !!(hit.ArrowDown || hit.KeyS),
        ok: !!(hit.Enter || hit.Space || hit.KeyJ || hit.KeyE || hit.KeyF || clickAtk), back: !!(hit.KeyX || hit.Backspace || hit.KeyQ)
      };
      if (view === 'first') { inp.face = Math.atan2(-Math.sin(camYaw), -Math.cos(camYaw)) * 180 / Math.PI; }
      if (style === 'simple' && (hit.KeyJ || clickAtk)) { inp.act = true; }
      if (style === 'ff' && S.battle) { inp.mx = inp.mz = 0; inp.jump = false; inp.act = false; }
      return inp;
    }

    /* ── 카메라 ───────────────────────────────────────────────────────── */
    var tgt = new T.Vector3(), want = new T.Vector3();
    function placeCamera(k) {
      var c = S.scene.camera || {}, pl = S.player;
      var p = pl ? pl.p : [0, 0, 0];
      if (CB && CB.camera(want, tgt)) {
        cam.position.lerp(want, k); cam.lookAt(tgt);
        if (envNow) { envNow.follow(tgt.x, tgt.y, tgt.z); }
        return;
      }
      var lock = S.cb && S.cb.lock && S.cb.lock.alive ? S.cb.lock : null;
      if (view === 'fixed') {
        var cp = c.pos || [0, 12, 16], lk = c.look || [0, 0, 0];
        want.set(cp[0], cp[1], cp[2]); tgt.set(lk[0], lk[1], lk[2]);
      } else if (view === 'side') {
        tgt.set(p[0], p[1] + 1.2, p[2]);
        want.set(p[0], p[1] + camH * 0.5, p[2] + camD);
      } else if (view === 'first') {
        var eye = (pl ? pl.body.size[1] * pl.s[1] : 1.8) * 0.9;
        var cp2 = Math.cos(camPitch);
        want.set(p[0], p[1] + eye, p[2]);
        cam.position.copy(want);
        tgt.set(p[0] - Math.sin(camYaw) * cp2, p[1] + eye + Math.sin(camPitch), p[2] - Math.cos(camYaw) * cp2);
        if (shakeT > 0) { cam.position.x += (Math.random() - 0.5) * shakePow * 0.3; }
        cam.lookAt(tgt);
        if (envNow) { envNow.follow(p[0], p[1], p[2]); }
        return;
      } else if (view === 'top') {
        tgt.set(p[0], p[1] + 0.8, p[2]);
        want.set(p[0] + Math.sin(camYaw) * camD, p[1] + camH, p[2] + Math.cos(camYaw) * camD);
      } else {
        if (lock) {
          /* 주목: 적 반대편 어깨 뒤에서 둘을 함께 본다 */
          var ly = Math.atan2(p[0] - lock.p[0], p[2] - lock.p[2]);
          var dd = ((ly - camYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          camYaw += dd * Math.min(1, 6 * DT * 2);
          tgt.set((p[0] * 2 + lock.p[0]) / 3, p[1] + 1.2, (p[2] * 2 + lock.p[2]) / 3);
        } else { tgt.set(p[0], p[1] + 1.2, p[2]); }
        want.set(p[0] + Math.sin(camYaw) * camD, p[1] + camH, p[2] + Math.cos(camYaw) * camD);
      }
      cam.position.lerp(want, k);
      if (shakeT > 0) { cam.position.x += (Math.random() - 0.5) * shakePow; cam.position.y += (Math.random() - 0.5) * shakePow; }
      cam.lookAt(tgt);
      if (envNow) { envNow.follow(p[0], p[1], p[2]); }
    }

    /* ── 개체 맞추기 ──────────────────────────────────────────────────── */
    function sync(dt) {
      var seen = {};
      var hideField = !!(CB && CB.hidesField());
      for (var i = 0; i < S.ents.length; i++) {
        var e = S.ents[i];
        if (!e.alive) { continue; }
        seen[e.id] = 1;
        var o = objs[e.id];
        var lk = e.lookOv ? JSON.stringify(e.lookOv) : '';
        if (o && o.userData.lk !== lk) { scene3.remove(o); V.dispose(o); o = null; }
        if (!o) {
          var def = e.lookOv ? Object.assign({}, e.def, { look: e.lookOv }) : e.def;
          o = objs[e.id] = V.entity(def); o.userData.lk = lk; scene3.add(o);
        }
        V.place(o, e.p, e.r, e.s);
        o.visible = !e.hidden && !hideField && !(view === 'first' && e === S.player);
        var inner = o.userData.inner;
        inner.visible = !(e.inv > 0 && Math.floor(e.inv * 16) % 2);
        var pulse = e.hitT > 0 ? 1 + e.hitT * 0.8 : 1;
        inner.scale.set(pulse, e.act > 0 ? 1 - e.act * 0.3 : pulse, pulse);
        V.animate(o, e.spd > 0.4 || (e.mv === 'climb' && Math.hypot(e.v[1], e.v[0], e.v[2]) > 0.5), dt, e.spd > 4.5 || e.sprinting);
        /* 이동 자세 — 활공은 앞으로 눕고 헤엄은 더 눕는다 */
        if (e === S.player) { inner.rotation.x = e.mv === 'glide' ? 0.9 : e.mv === 'swim' ? 1.25 : 0; inner.position.y = e.mv === 'swim' ? 0.9 : 0; }
      }
      for (var id in objs) { if (!seen[id]) { scene3.remove(objs[id]); V.dispose(objs[id]); delete objs[id]; } }
    }

    var poofGeo = new T.SphereGeometry(0.12, 8, 6);
    function poof(at, small) {
      for (var i = 0; i < (small ? 6 : 12); i++) {
        var m = new T.Mesh(poofGeo, new T.MeshBasicMaterial({ color: small ? 0xffe066 : 0xffffff, transparent: true }));
        m.position.set(at[0], at[1] + 0.6, at[2]);
        var a = i / (small ? 6 : 12) * Math.PI * 2;
        m.userData.v = [Math.cos(a) * 3, 2 + Math.random() * 2, Math.sin(a) * 3];
        m.userData.t = 0.5;
        scene3.add(m); poofs.push(m);
      }
    }
    function updPoofs(dt) {
      poofs = poofs.filter(function (m) {
        m.userData.t -= dt;
        if (m.userData.t <= 0) { scene3.remove(m); m.material.dispose(); return false; }
        var v = m.userData.v; v[1] -= 9 * dt;
        m.position.x += v[0] * dt; m.position.y += v[1] * dt; m.position.z += v[2] * dt;
        m.material.opacity = m.userData.t * 2;
        return true;
      });
    }

    function handleFx() {
      sim.drainFx().forEach(function (f) {
        if (SY && SY.fx(f)) { return; }
        if (CB && CB.fx(f)) { return; }
        if (f.type === 'sound') { sfx(f.name); } else if (f.type === 'shake') { shakeT = f.sec; shakePow = f.power; } else if (f.type === 'poof') { poof(f.at, f.small); } else if (f.type === 'scene') { buildScene(); }
      });
    }

    /* ── HUD 갱신 ─────────────────────────────────────────────────────── */
    var lastHud = '';
    function hud() {
      var h = (project.hud || []).map(function (x) {
        var v = S.vars[x.var]; v = v == null ? 0 : v;
        if (x.style === 'hearts') { return '<span class="hv"><b>' + esc(x.label) + '</b> <span class="hearts">' + '♥'.repeat(Math.max(0, Math.min(20, v | 0))) + '</span></span>'; }
        return '<span class="hv"><b>' + esc(x.label) + '</b> ' + esc(v) + '</span>';
      }).join('');
      if (h !== lastHud) { hudVars.innerHTML = h; lastHud = h; }
      toastEl.textContent = S.toast ? S.toast.text : '';
      toastEl.classList.toggle('show', !!S.toast);
      if (S.dialog) {
        dlg.classList.add('show');
        dlgName.textContent = S.dialog.name || '';
        dlgName.style.display = S.dialog.name ? '' : 'none';
        dlgText.textContent = S.dialog.lines[S.dialog.i] || '';
      } else { dlg.classList.remove('show'); }
      var near = '';
      if (S.player && !S.dialog && !S.over && !S.battle) {
        for (var i = 0; i < S.ents.length; i++) {
          var o = S.ents[i];
          if (!o.alive || o.hidden || !o.comps.talk) { continue; }
          if (Math.hypot(o.p[0] - S.player.p[0], o.p[2] - S.player.p[2]) < 2.2) { near = 'F  ' + (o.comps.talk.name || o.name) + '에게 말 걸기'; break; }
        }
      }
      promptEl.textContent = near;
      promptEl.classList.toggle('show', !!near);
      if (S.over) {
        over.classList.add('show');
        over.classList.toggle('win', S.over.win);
        overTitle.textContent = S.over.win ? '이겼다!' : '끝';
        var lines = SY ? SY.sessionLines() : [];
        overText.textContent = (S.over.text || '') + (lines.length ? '\n\n이번 판 — ' + lines.join(' · ') : '');
        overText.style.whiteSpace = 'pre-wrap';
        if (doc.pointerLockElement === canvas) { doc.exitPointerLock(); }
      } else { over.classList.remove('show'); }
      if (CB) { CB.hud(); }
      if (SY) { SY.hud(); }
    }

    function resize() {
      var w = canvas.clientWidth || root.innerWidth, hh = canvas.clientHeight || root.innerHeight;
      R.setSize(w, hh, false);
      cam.aspect = w / Math.max(1, hh); cam.updateProjectionMatrix();
    }
    on(root, 'resize', resize);
    resize();
    buildScene();
    setView(view);
    sim.drainFx();
    if (SY) { SY.offerContinue(function (ok) { if (ok) { sim.drainFx(); buildScene(); SY.resetSession(); } }); }

    var last = null, acc = 0, stopped = false;
    function frame(now) {
      if (stopped) { return; }
      root.requestAnimationFrame(frame);
      var dt = last == null ? DT : Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      var steps = 0;
      var frozen = SY && (SY.paused() || SY.hitstop(dt));
      if (frozen) { acc = 0; }
      while (!frozen && acc >= DT && steps < 6) {
        sim.step(DT, input());
        hit = {}; clickAtk = false; relAtk = false; jumpBuf = Math.max(0, jumpBuf - DT);
        handleFx();
        acc -= DT; steps++;
      }
      if (steps === 6) { acc = 0; }
      if (shakeT > 0) { shakeT -= dt; }
      sync(dt);
      updPoofs(dt);
      if (CB) { CB.sync(dt); }
      if (SY) { SY.sync(dt, envNow, view); }
      placeCamera(1 - Math.exp(-10 * dt));
      hud();
      R.render(scene3, cam);
    }
    root.requestAnimationFrame(frame);

    return {
      sim: sim,
      setView: setView,
      stop: function () {
        stopped = true;
        listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
        if (doc.pointerLockElement === canvas) { doc.exitPointerLock(); }
        R.dispose();
      }
    };
  }

  root.SagaPlay = { start: start, sfx: sfx, VIEWS: VIEW_NAME };

  /* ── 스스로 켜기 ─────────────────────────────────────────────────────── */
  function boot() {
    var canvas = doc.getElementById('cv');
    if (!canvas) { return; }
    var q = new URLSearchParams(root.location.search);
    if (root.SAGA_PROJECT) {
      if (root.SAGA_ASSETS) { V.setAssetBase(root.SAGA_ASSETS); }
      doc.title = root.SAGA_PROJECT.title || doc.title;
      start(root.SAGA_PROJECT, { persist: true });
    } else if (q.get('p')) {
      var id = q.get('p');
      V.setAssetBase({ lib: '/lib/', proj: '/projects/' + id + '/assets/' });
      root.fetch('/api/project/' + encodeURIComponent(id)).then(function (r) { return r.json(); }).then(function (j) {
        doc.title = j.project.title;
        start(j.project, { scene: q.get('scene') || null, persist: true });
      });
    } else if (q.get('embed')) {
      var game = null;
      root.addEventListener('message', function (e) {
        var m = e.data || {};
        if (m.type !== 'saga-play') { return; }
        if (game) { game.stop(); }
        V.setAssetBase(m.assets || {});
        game = start(m.project, { scene: m.scene, at: m.at, onExit: function () { root.parent.postMessage({ type: 'saga-play-exit' }, '*'); } });
        if (canvas.focus) { canvas.focus(); }
      });
      root.parent.postMessage({ type: 'saga-play-ready' }, '*');
    }
  }
  if (doc && doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', boot); } else if (doc) { boot(); }
})(window);
