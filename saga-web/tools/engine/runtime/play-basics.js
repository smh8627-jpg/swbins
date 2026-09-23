/**
 * 사가 엔진 — 기본기 화면(play-basics). play.js 가 부른다. 규칙은 basics.js, 여기는 보여 주기·소리만.
 *   파티클(컴포넌트 particles · 행동 effect) · 배경음악(파일 없이 만드는 곡 일곱, N 으로 끄고 켜기)
 *   컷신 카메라(위아래 검은 띠) · 스위치/발판 켜짐 빛 · 가방 단추
 */
(function (root) {
  'use strict';
  var T = root.THREE;
  var doc = root.document;

  var CSS = [
    '.bal{position:absolute;inset:0;pointer-events:none;z-index:20}',
    '.bal.cine .bag{display:none}',
    '.bal .bar{position:absolute;left:0;right:0;height:0;background:#000;transition:height .45s ease}',
    '.bal .bar.top{top:0}.bal .bar.bot{bottom:0}',
    '.bal.cine .bar{height:11vh}',
    '.bal .bag{position:absolute;left:14px;bottom:52px;pointer-events:auto;border:0;border-radius:10px;background:rgba(10,14,24,.7);color:#fff;font:inherit;font-size:13px;padding:6px 10px;cursor:pointer}',
    '.bal .mus{position:absolute;right:14px;bottom:14px;background:rgba(10,14,24,.6);color:#fff;border-radius:8px;font-size:12px;padding:3px 9px;opacity:0;transition:opacity .3s}',
    '.bal .mus.show{opacity:1}'
  ].join('\n');

  function el(tag, cls, parent, text) {
    var e = doc.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    if (parent) { parent.appendChild(e); }
    return e;
  }

  /* ── 파티클 — 섞기 방식별 공용 풀 하나씩(빛나는 것 · 보통) ─────────────────── */
  var MAXP = 3000;
  function makePool(additive) {
    var g = new T.BufferGeometry();
    var pos = new Float32Array(MAXP * 3), col = new Float32Array(MAXP * 3), al = new Float32Array(MAXP), sz = new Float32Array(MAXP), hd = new Float32Array(MAXP);
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new T.BufferAttribute(col, 3));
    g.setAttribute('aAlpha', new T.BufferAttribute(al, 1));
    g.setAttribute('aSize', new T.BufferAttribute(sz, 1));
    g.setAttribute('aHard', new T.BufferAttribute(hd, 1));
    var m = new T.ShaderMaterial({
      uniforms: { uScale: { value: 400 } },
      /* 크기는 m 단위(멀면 작아짐), 화면에서 96px 을 넘지 않게. aHard 1 이면 가장자리가 또렷한 길쭉한 조각(낙엽) */
      vertexShader: 'attribute vec3 aColor; attribute float aAlpha; attribute float aSize; attribute float aHard; uniform float uScale; varying vec3 vC; varying float vA; varying float vH;\n' +
        'void main(){ vC = aColor; vA = aAlpha; vH = aHard; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = min(96.0, aSize * uScale / max(0.1, -mv.z)); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec3 vC; varying float vA; varying float vH;\n' +
        'void main(){ vec2 c = gl_PointCoord - 0.5; float d = vH > 0.5 ? length(c * vec2(1.0, 2.2)) : length(c);\n' +
        '  float a = (vH > 0.5 ? smoothstep(0.5, 0.42, d) : smoothstep(0.5, 0.05, d)) * vA; if (a < 0.01) discard;\n' +
        '  gl_FragColor = vec4(vC * (vH > 0.5 ? 0.75 + 0.5 * (0.5 - gl_PointCoord.y) : 1.0), a); }',
      transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending
    });
    var pts = new T.Points(g, m);
    pts.frustumCulled = false; pts.renderOrder = 5;
    return { pts: pts, list: [], additive: additive };
  }

  /* 종류 — c0→c1 색, a 처음 투명도, s0→s1 크기(m), life 초, v 처음 속도 함수, grav 중력(음수면 떠오름) */
  var KIND = {
    fire: { add: true, c0: '#ffe08a', c1: '#ff3d12', a: 0.9, s0: 0.55, s1: 0.1, life: 0.9, grav: -1.2, spread: 0.25, v: function (r) { return [(r() - 0.5) * 0.5, 1.2 + r() * 0.8, (r() - 0.5) * 0.5]; } },
    smoke: { add: false, c0: '#6f6f74', c1: '#c9c9cf', a: 0.35, s0: 0.5, s1: 1.8, life: 3, grav: -0.3, spread: 0.3, v: function (r) { return [(r() - 0.5) * 0.4, 0.7 + r() * 0.4, (r() - 0.5) * 0.4]; } },
    sparkle: { add: true, c0: '#fff7b0', c1: '#ffd166', a: 1, s0: 0.2, s1: 0.02, life: 1.1, grav: 0, spread: 0.9, twinkle: true, v: function (r) { return [(r() - 0.5) * 0.3, (r() - 0.3) * 0.4, (r() - 0.5) * 0.3]; } },
    fountain: { add: false, c0: '#bfe6ff', c1: '#6fb8ff', a: 0.8, s0: 0.18, s1: 0.12, life: 1.3, grav: 9, spread: 0.1, v: function (r) { var a = r() * 6.283, s = 0.6 + r() * 0.8; return [Math.cos(a) * s, 5.5 + r() * 1.5, Math.sin(a) * s]; } },
    magic: { add: true, c0: '#d6b8ff', c1: '#6a3dff', a: 0.9, s0: 0.25, s1: 0.05, life: 1.5, grav: -0.5, ring: 0.8, v: function (r) { return [0, 0.4 + r() * 0.3, 0]; } },
    leaves: { add: false, hard: true, c0: '#d9822b', c1: '#c0562b', a: 1, s0: 0.16, s1: 0.14, life: 5, grav: 0.5, spread: 3, sway: 1.2, y: 3.5, v: function (r) { return [(r() - 0.5) * 0.6, -0.2, (r() - 0.5) * 0.6]; } },
    bubbles: { add: false, c0: '#e4f7ff', c1: '#a8e0ff', a: 0.55, s0: 0.12, s1: 0.3, life: 2.5, grav: -0.6, spread: 0.4, sway: 0.5, v: function (r) { return [0, 0.5 + r() * 0.3, 0]; } }
  };
  /* 한 번 터지는 효과 — n 개수, 속도, 종류 */
  var BURST = {
    burst: { n: 45, speed: 4.5, life: 0.6, c0: '#ffffff', c1: '#ffd166', s0: 0.25, s1: 0.05, add: true, grav: 2 },
    explosion: { n: 110, speed: 8, life: 0.9, c0: '#fff0a0', c1: '#ff3d12', s0: 0.6, s1: 0.1, add: true, grav: 3, smoke: 24 },
    sparkle: { n: 36, speed: 1.4, life: 1.1, c0: '#fffbd0', c1: '#ffd166', s0: 0.2, s1: 0.02, add: true, grav: -0.4 },
    heal: { n: 45, speed: 1.2, life: 1.3, c0: '#c9ffd9', c1: '#3ddc84', s0: 0.28, s1: 0.05, add: true, grav: -2.2, ring: 0.9 },
    smoke: { n: 0, smoke: 30 },
    firework: { n: 140, speed: 7.5, life: 1.7, c0: null, c1: null, s0: 0.3, s1: 0.04, add: true, grav: 3.5, up: 6 }
  };

  /* ── 배경음악 — 코드로 짓는 짧은 순환곡(8마디) ─────────────────────────────── */
  /* 음 이름은 반음 수(0 = A3 220Hz). prog 는 마디마다 화음 뿌리, scale 은 선율 음계 */
  var SONGS = {
    calm: { bpm: 78, scale: [0, 2, 4, 7, 9], prog: [3, 10, 0, 8], minor: false, pad: 0.05, arp: 0.035, bass: 0.05, lead: 0.02, drum: 0 },
    field: { bpm: 108, scale: [0, 2, 4, 5, 7, 9, 11], prog: [3, 10, 5, 0], minor: false, pad: 0.035, arp: 0.04, bass: 0.06, lead: 0.03, drum: 0.03 },
    town: { bpm: 120, scale: [0, 2, 4, 7, 9], prog: [3, 8, 10, 3], minor: false, pad: 0.02, arp: 0.045, bass: 0.07, lead: 0.035, drum: 0.04 },
    battle: { bpm: 148, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 8, 10, 7], minor: true, pad: 0.03, arp: 0.04, bass: 0.09, lead: 0.03, drum: 0.07 },
    boss: { bpm: 160, scale: [0, 1, 3, 5, 7, 8, 11], prog: [0, 1, 0, 7], minor: true, pad: 0.04, arp: 0.045, bass: 0.1, lead: 0.035, drum: 0.09 },
    night: { bpm: 66, scale: [0, 2, 3, 7, 9], prog: [0, 5, 3, 10], minor: true, pad: 0.05, arp: 0.02, bass: 0.035, lead: 0.02, drum: 0 },
    cave: { bpm: 56, scale: [0, 1, 5, 7, 8], prog: [0, 0, 1, 0], minor: true, pad: 0.06, arp: 0.015, bass: 0.045, lead: 0, drum: 0 }
  };
  function hz(semi) { return 220 * Math.pow(2, semi / 12); }

  function create(ctx) {
    var S = ctx.S, sim = ctx.sim, scene3 = ctx.scene3, cam = ctx.cam;
    var st = doc.getElementById('saga-basics-css');
    if (!st) { st = el('style', null, doc.head); st.id = 'saga-basics-css'; st.textContent = CSS; }
    var L = el('div', 'bal', ctx.hud);
    el('div', 'bar top', L); el('div', 'bar bot', L);
    var musTag = el('div', 'mus', L);
    var bagBtn = null;
    var BA = sim.system && sim.system('basics');
    if (BA && BA.items.length) {
      bagBtn = el('button', 'bag', L, '🎒 가방 (I)');
      bagBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); if (!S.menu && !S.dialog && !S.over) { BA.openBag(); } });
    }

    /* 파티클 */
    var pools = { add: makePool(true), norm: makePool(false) };
    scene3.add(pools.add.pts); scene3.add(pools.norm.pts);
    var seed = 12345;
    function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    function spawn(pool, p) { if (pool.list.length < MAXP) { pool.list.push(p); } }
    function emit(k, at, color, size) {
      var r = rnd, a = 0, off = [0, 0, 0];
      if (k.ring) { a = r() * 6.283; off = [Math.cos(a) * k.ring, 0, Math.sin(a) * k.ring]; } else if (k.spread) { off = [(r() - 0.5) * 2 * k.spread, (r() - 0.5) * k.spread * 0.4, (r() - 0.5) * 2 * k.spread]; }
      var c0 = new T.Color(color || k.c0), c1 = new T.Color(color ? color : k.c1);
      if (color) { c1.multiplyScalar(0.6); }
      spawn(k.add ? pools.add : pools.norm, {
        p: [at[0] + off[0], at[1] + off[1] + (k.y || 0), at[2] + off[2]], v: k.v(r), age: 0, life: k.life * (0.75 + r() * 0.5),
        s0: k.s0 * size, s1: k.s1 * size, c0: c0, c1: c1, a: k.a, grav: k.grav, sway: k.sway || 0, tw: !!k.twinkle, ph: r() * 6.283, hard: k.hard ? 1 : 0
      });
    }
    function burst(kind, at, color, size) {
      var b = BURST[kind] || BURST.burst, i, r = rnd;
      size = size || 1;
      var base = [at[0], at[1] + (b.up || 0), at[2]];
      for (i = 0; i < b.n; i++) {
        var th = r() * 6.283, ph = Math.acos(2 * r() - 1), sp = b.speed * (0.5 + r() * 0.6) * size;
        var dir = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
        var c0 = new T.Color(color || b.c0 || new T.Color().setHSL(r(), 0.9, 0.65)), c1 = new T.Color(color || b.c1 || c0);
        var p = base.slice();
        if (b.ring) { p = [at[0] + Math.cos(th) * b.ring * size, at[1] - 0.6, at[2] + Math.sin(th) * b.ring * size]; dir = [0, 1, 0]; sp = b.speed * (0.6 + r()); }
        spawn(b.add ? pools.add : pools.norm, { p: p, v: [dir[0] * sp, dir[1] * sp, dir[2] * sp], age: 0, life: b.life * (0.7 + r() * 0.6), s0: b.s0 * size, s1: b.s1 * size, c0: c0, c1: c1, a: 1, grav: b.grav, sway: 0, tw: false, drag: 1.6 });
      }
      for (i = 0; i < (b.smoke || 0); i++) { emit(KIND.smoke, [at[0], at[1] - 0.3, at[2]], '', size * 1.4); }
    }
    var emitAcc = {};
    function updParticles(dt) {
      /* 컴포넌트 particles — 초당 rate 개 */
      S.ents.forEach(function (e) {
        if (!e.alive || e.hidden || !e.comps.particles) { return; }
        var c = e.comps.particles, k = KIND[c.kind] || KIND.fire;
        emitAcc[e.id] = (emitAcc[e.id] || 0) + Math.max(0, +c.rate || 0) * dt;
        var n = Math.min(40, Math.floor(emitAcc[e.id]));
        emitAcc[e.id] -= n;
        var at = [e.p[0], e.p[1] + 0.2, e.p[2]];
        for (var i = 0; i < n; i++) { emit(k, at, c.color, Math.max(0.1, +c.size || 1)); }
      });
      [pools.add, pools.norm].forEach(function (pool) {
        var g = pool.pts.geometry, P = g.attributes.position.array, C = g.attributes.aColor.array, A = g.attributes.aAlpha.array, Z = g.attributes.aSize.array, H = g.attributes.aHard.array;
        var tmp = new T.Color(), j = 0;
        pool.list = pool.list.filter(function (q) {
          q.age += dt;
          if (q.age >= q.life) { return false; }
          if (q.drag) { var f = Math.max(0, 1 - q.drag * dt); q.v[0] *= f; q.v[2] *= f; }
          q.v[1] -= q.grav * dt;
          var sw = q.sway ? Math.sin(q.age * 2.2 + q.ph) * q.sway * dt : 0;
          q.p[0] += q.v[0] * dt + sw; q.p[1] += q.v[1] * dt; q.p[2] += q.v[2] * dt + sw * 0.6;
          var t = q.age / q.life;
          P[j * 3] = q.p[0]; P[j * 3 + 1] = q.p[1]; P[j * 3 + 2] = q.p[2];
          tmp.copy(q.c0).lerp(q.c1, t);
          C[j * 3] = tmp.r; C[j * 3 + 1] = tmp.g; C[j * 3 + 2] = tmp.b;
          var fade = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
          A[j] = q.a * Math.max(0, fade) * (q.tw ? 0.5 + 0.5 * Math.sin(q.age * 18 + q.ph) : 1);
          Z[j] = q.s0 + (q.s1 - q.s0) * t;
          H[j] = q.hard || 0;
          j++;
          return true;
        });
        g.setDrawRange(0, j);
        ['position', 'aColor', 'aAlpha', 'aSize', 'aHard'].forEach(function (k) { g.attributes[k].needsUpdate = true; });
        pool.pts.material.uniforms.uScale.value = (ctx.canvas.clientHeight || 600) / (2 * Math.tan(cam.fov * Math.PI / 360));
      });
    }

    /* 배경음악 */
    var AC = null, master = null, muted = false, cur = null, nextT = 0, beat = 0, timer = null;
    try { muted = root.localStorage && root.localStorage.getItem('saga-engine-music') === 'off'; } catch (e) { muted = false; }
    function audio() {
      if (AC) { return AC; }
      try { AC = new (root.AudioContext || root.webkitAudioContext)(); } catch (e) { AC = null; return null; }
      master = AC.createGain(); master.gain.value = muted ? 0 : 1; master.connect(AC.destination);
      return AC;
    }
    function tone(type, f, t, len, vol, glide) {
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (glide) { o.frequency.exponentialRampToValueAtTime(glide, t + len); }
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, len * 0.2));
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + len + 0.05);
    }
    function noise(t, len, vol, hp) {
      var n = Math.floor(AC.sampleRate * len), b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < n; i++) { d[i] = (Math.random() * 2 - 1) * (1 - i / n); }
      var s = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = hp;
      s.buffer = b; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(master); s.start(t);
    }
    /* 한 박(8분음표) 짓기 */
    function playBeat(song, i, t, sp) {
      var bar = Math.floor(i / 8) % song.prog.length, root0 = song.prog[bar], inBar = i % 8;
      var third = song.minor ? 3 : 4, chord = [root0, root0 + third, root0 + 7];
      if (inBar === 0 && song.pad) { chord.forEach(function (n) { tone('triangle', hz(n), t, sp * 8, song.pad); }); }
      if (song.bass && (inBar % (song.bpm > 130 ? 1 : 2) === 0)) { tone('sawtooth', hz(root0 - 12 - (inBar === 6 ? 5 : 0)), t, sp * 0.9, song.bass * 0.6); }
      if (song.arp) { var an = chord[(inBar + (inBar > 3 ? 1 : 0)) % 3] + 12; tone('square', hz(an), t, sp * 0.8, song.arp * 0.5); }
      if (song.lead && inBar % 2 === 0) {
        var h = Math.sin(i * 12.9898 + bar * 78.233) * 43758.5453; h -= Math.floor(h);
        if (h > 0.35) { var sc = song.scale, deg = Math.floor(h * sc.length * 1.6); tone('sine', hz(12 + sc[deg % sc.length] + (deg >= sc.length ? 12 : 0) + (root0 > 6 ? -12 : 0)), t, sp * 1.8, song.lead); }
      }
      if (song.drum) {
        if (inBar % 4 === 0) { tone('sine', 110, t, 0.18, song.drum * 1.6, 40); }
        if (inBar % 4 === 2) { noise(t, 0.12, song.drum * 0.8, 1500); }
        if (song.bpm > 130) { noise(t, 0.04, song.drum * 0.35, 6000); }
      }
    }
    function tick() {
      if (!AC || !cur || cur === 'none') { return; }
      var song = SONGS[cur]; if (!song) { return; }
      var sp = 60 / song.bpm / 2;
      if (nextT < AC.currentTime) { nextT = AC.currentTime + 0.05; }
      while (nextT < AC.currentTime + 0.35) { playBeat(song, beat++, nextT, sp); nextT += sp; }
    }
    function wantSong() {
      if (S.battle) { return S.battle.boss ? 'boss' : 'battle'; }
      var m = S.music || (S.scene.env && S.scene.env.music) || 'none';
      return SONGS[m] ? m : 'none';
    }
    function showMus(t) { musTag.textContent = t; musTag.classList.remove('show'); void musTag.offsetWidth; musTag.classList.add('show'); setTimeout(function () { musTag.classList.remove('show'); }, 1600); }
    function music() {
      var w = wantSong();
      if (w !== cur) { cur = w; beat = 0; if (AC) { nextT = AC.currentTime + 0.1; } }
      if (cur !== 'none' && !AC && unlocked) { audio(); }
      if (AC && AC.state === 'suspended' && unlocked) { AC.resume(); }
    }
    var unlocked = false;
    function unlock() { unlocked = true; }
    root.addEventListener('keydown', unlock, { once: true });
    root.addEventListener('pointerdown', unlock, { once: true });
    timer = root.setInterval(tick, 100);

    /* 스위치·발판 빛 */
    function tint(o, on, col) {
      if (o.userData.baOn === on) { return; }
      o.userData.baOn = on;
      o.userData.inner.traverse(function (m) {
        if (!m.isMesh || m.userData.outline || !m.material || !m.material.emissive) { return; }
        if (!m.userData.baOwn) { m.material = m.material.clone(); m.userData.baOwn = true; }
        m.material.emissive.set(on ? col : '#000000').multiplyScalar(on ? 0.55 : 0);
      });
    }
    function states() {
      var objs = ctx.objs();
      S.ents.forEach(function (e) {
        var o = objs[e.id];
        if (!o || !e.alive) { return; }
        if (e.comps.lever) { tint(o, !!e.leverOn, '#ffd166'); }
        if (e.comps.plate) { tint(o, !!e.plateOn, '#7bdff2'); }
      });
    }

    /* 컷신 카메라 — 대상 앞에서 플레이어 쪽으로 비껴 본다 */
    var cineYaw = null;
    function camera(want, tgt) {
      L.classList.toggle('cine', !!(S.cine && S.cine.bars));
      if (!S.cine) { cineYaw = null; return false; }
      var c = S.cine, at = c.at, pl = S.player;
      if (cineYaw == null) { cineYaw = pl ? Math.atan2(pl.p[0] - at[0], pl.p[2] - at[2]) + 0.45 : 0.6; }
      tgt.set(at[0], at[1] + 1.2, at[2]);
      want.set(at[0] + Math.sin(cineYaw) * c.dist, at[1] + c.height, at[2] + Math.cos(cineYaw) * c.dist);
      return true;
    }

    function fx(f) {
      if (f.type === 'effect') { burst(f.kind, f.at, f.color, f.size); return true; }
      return false;
    }
    function keys(code) {
      if (code === 'KeyN') {
        muted = !muted;
        try { root.localStorage.setItem('saga-engine-music', muted ? 'off' : 'on'); } catch (e) { /* 저장 못 해도 된다 */ }
        if (master) { master.gain.value = muted ? 0 : 1; }
        showMus(muted ? '♪ 음악 끔 (N)' : '♪ 음악 켬 (N)');
      }
    }
    function sync(dt) { updParticles(dt); states(); music(); }
    function onScene() { emitAcc = {}; pools.add.list = []; pools.norm.list = []; }
    function stop() { root.clearInterval(timer); if (AC && AC.close) { AC.close(); } }

    return { sync: sync, fx: fx, camera: camera, keys: keys, onScene: onScene, stop: stop, burst: burst, song: function () { return cur; } };
  }

  root.SagaPlayBasics = { create: create, KIND: KIND, BURST: BURST, SONGS: SONGS };
})(typeof window !== 'undefined' ? window : globalThis);
