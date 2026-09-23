/**
 * 사가 엔진 — 시스템 화면(play-systems). play.js 가 부른다. 규칙은 systems.js·sim.js, 여기는 보여 주기와 판 밖 일(저장)만.
 *   공용 메뉴(상점·선택지·특성·거점·도감·일기토·문답) · 낚시 막대 · 퀘스트 목록 · 목표판 3줄 · 시계·날씨
 *   하늘·빛·안개(시간대)·비/눈 입자·계절 땅색 · 스태미나 고리 · 상자/석등/거점/밭 상태 빛
 *   손맛(combat_feel): 히트스톱·피격 플래시 · 카메라 근접 흐림(camera_near_fade) · 사진 모드(P) · 저장/이어하기 · 마무리 카드
 */
(function (root) {
  'use strict';
  var T = root.THREE, V = root.SagaView;
  var doc = root.document;

  var CSS = [
    '.sysl{position:absolute;inset:0;pointer-events:none}',
    '.sysl .menu{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);min-width:280px;max-width:min(520px,92vw);max-height:70vh;overflow:auto;background:rgba(10,14,24,.92);border:2px solid rgba(255,255,255,.3);border-radius:12px;padding:12px 14px;color:#fff;display:none;pointer-events:auto}',
    '.sysl .menu.show{display:block}',
    '.sysl .menu h4{margin:0 0 8px;color:#ffd166;font-size:16px}',
    '.sysl .menu .mi{display:flex;justify-content:space-between;gap:10px;padding:6px 8px;border-radius:6px;cursor:pointer;font-size:15px}',
    '.sysl .menu .mi.cur{background:rgba(255,255,255,.16)}.sysl .menu .mi.cur:before{content:"▶ ";color:#ffd166}',
    '.sysl .menu .mi.dis{opacity:.45;cursor:default}',
    '.sysl .menu .mi small{color:#aab}',
    '.sysl .menu .hint{font-size:11px;color:#99a;margin-top:6px}',
    '.sysl .menu .log{font-size:13px;color:#cde;margin:6px 0}',
    '.sysl .fbar{position:relative;height:18px;background:#223;border-radius:9px;margin:8px 0 10px;overflow:hidden}',
    '.sysl .fbar .zone{position:absolute;top:0;bottom:0;background:#3fbf7f}',
    '.sysl .fbar .mark{position:absolute;top:-2px;bottom:-2px;width:4px;background:#fff;box-shadow:0 0 6px #fff}',
    '.sysl .quests{position:absolute;left:14px;top:52px;display:flex;flex-direction:column;gap:4px}',
    '.sysl .quests div{background:rgba(10,14,24,.65);color:#fff;padding:4px 10px;border-radius:6px;font-size:13px;border-left:3px solid #ffd166}',
    '.sysl .quests small{color:#aab;margin-left:6px}',
    '.sysl .goals.low{top:44px}',
    '.sysl .goals{position:absolute;right:14px;top:12px;background:rgba(10,14,24,.6);color:#fff;padding:6px 12px;border-radius:8px;font-size:13px;line-height:1.6;text-align:right}',
    '.sysl .clock{position:absolute;right:14px;top:12px;background:rgba(10,14,24,.6);color:#fff;padding:4px 10px;border-radius:8px;font-size:13px}',
    '.sysl .stam{position:absolute;width:44px;height:44px;transform:translate(-50%,-50%);display:none}',
    '.sysl .photo{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);background:rgba(0,0,0,.55);color:#fff;padding:5px 14px;border-radius:8px;font-size:13px;display:none}',
    '.sysl .cont{position:absolute;inset:0;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;pointer-events:auto}',
    '.sysl .cont.show{display:flex}',
    '.sysl .cont .box{background:rgba(10,14,24,.94);color:#fff;border-radius:14px;padding:22px 30px;text-align:center;border:2px solid #ffd166}',
    '.sysl .cont button{margin:10px 6px 0;padding:8px 18px;border-radius:8px;border:0;font:inherit;font-weight:700;cursor:pointer}',
    '.sysl .card{margin-top:10px;text-align:left;font-size:14px;color:#dde;line-height:1.6}'
  ].join('\n');

  function el(tag, cls, parent, text) {
    var e = doc.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    if (parent) { parent.appendChild(e); }
    return e;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* 개체별 재질 사본 — 모델 복제는 재질을 나눠 쓰므로 하나만 바꾸려면 먼저 떼어 낸다 */
  function ownMats(o) {
    if (o.userData.ownMats) { return o.userData.ownMats; }
    var list = [];
    o.userData.inner.traverse(function (m) {
      if (!m.isMesh || m.userData.outline) { return; }
      if (Array.isArray(m.material)) { return; }
      m.material = m.material.clone();
      list.push({ m: m, em: m.material.emissive ? m.material.emissive.clone() : null, op: m.material.opacity, tr: m.material.transparent });
    });
    o.userData.ownMats = list;
    return list;
  }

  var SKY = [ // 시각 → 하늘색·빛(0~24시)
    [0, '#0b1026', 0.28], [4.5, '#1a2244', 0.32], [6, '#f4a582', 0.7], [8, null, 1], [17, null, 1], [19, '#f08a5d', 0.65], [20.5, '#2a2550', 0.38], [24, '#0b1026', 0.28]
  ];
  var TINT = { spring: [0.95, 1.05, 0.95], summer: [1, 1, 1], autumn: [1.18, 0.95, 0.7], winter: [1.25, 1.3, 1.35] };
  var FOGMUL = { clear: 0.6, cloud: 1, rain: 1.6, wind: 0.8, fog: 2.4, snow: 1.2 };

  function create(ctx) {
    var S = ctx.S, sim = ctx.sim, project = ctx.project, cam = ctx.cam, scene3 = ctx.scene3, canvas = ctx.canvas;
    if (!doc.getElementById('saga-sys-css')) { var st = el('style', null, doc.head); st.id = 'saga-sys-css'; st.textContent = CSS; }
    var L = el('div', 'sysl', ctx.hud);
    var menuEl = el('div', 'menu', L);
    var questsEl = el('div', 'quests', L);
    var goalsEl = el('div', 'goals', L); goalsEl.style.display = 'none';
    var clockEl = el('div', 'clock', L); clockEl.style.display = 'none';
    var photoEl = el('div', 'photo', L, '📷 사진 모드 — 끌어서 돌리기 · 휠 거리 · Enter 저장 · P 나가기');
    var stamCv = el('canvas', 'stam', L); stamCv.width = stamCv.height = 88;
    var contEl = el('div', 'cont', L);
    var hitstop = 0, photo = false, lastMenu = '', lastQ = '', lastG = '';
    var saveKey = 'saga-engine/save/' + project.id;
    var startVars = JSON.parse(JSON.stringify(S.vars));

    /* ── 날씨 입자 ─────────────────────────────────────────────────── */
    var rain = null, flakeTex = null, DROP = [0.06, -0.55, 0.03];
    function flake() {
      if (flakeTex) { return flakeTex; }
      var cv = doc.createElement('canvas'); cv.width = cv.height = 32;
      var x = cv.getContext('2d');
      if (x) { var gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); }
      flakeTex = new T.CanvasTexture(cv);
      return flakeTex;
    }
    function particles(kind) {
      if (rain && rain.userData.kind === kind) { return; }
      if (rain) { scene3.remove(rain); rain.geometry.dispose(); rain.material.dispose(); rain = null; }
      if (kind !== 'rain' && kind !== 'snow') { return; }
      /* 비는 빗줄기(선 두 점씩, 살짝 기울게), 눈은 동그란 점 */
      var isRain = kind === 'rain', n = isRain ? 1400 : 900, per = isRain ? 2 : 1, pos = new Float32Array(n * 3 * per);
      for (var i = 0; i < n; i++) {
        var x = (Math.random() - 0.5) * 50, y = Math.random() * 25, z = (Math.random() - 0.5) * 50, o = i * 3 * per;
        pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
        if (isRain) { pos[o + 3] = x + DROP[0]; pos[o + 4] = y + DROP[1]; pos[o + 5] = z + DROP[2]; }
      }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
      if (isRain) {
        rain = new T.LineSegments(g, new T.LineBasicMaterial({ color: 0xb8d2ff, transparent: true, opacity: 0.45, depthWrite: false }));
      } else {
        rain = new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: 0.16, map: flake(), alphaTest: 0.05, transparent: true, opacity: 0.9, depthWrite: false }));
      }
      rain.userData.kind = kind; rain.frustumCulled = false;
      scene3.add(rain);
    }

    function skyAt(h, base) {
      for (var i = 0; i < SKY.length - 1; i++) {
        var a = SKY[i], b = SKY[i + 1];
        if (h >= a[0] && h <= b[0]) {
          var k = (h - a[0]) / (b[0] - a[0] || 1);
          var ca = new T.Color(a[1] || base), cb = new T.Color(b[1] || base);
          return { c: ca.lerp(cb, k), l: a[2] + (b[2] - a[2]) * k };
        }
      }
      return { c: new T.Color(base), l: 1 };
    }

    function world(env, dt) {
      var W = S.world;
      if (!W || !env) { particles(''); clockEl.style.display = 'none'; return; }
      var base = (S.scene.env && S.scene.env.sky) || '#9fd0ff';
      var sk = skyAt(W.hour, base);
      var wet = W.weather === 'rain' || W.weather === 'fog' || W.weather === 'cloud' || W.weather === 'snow';
      if (wet) { sk.c.lerp(new T.Color('#8a94a6'), 0.35); sk.l *= 0.8; }
      var t = TINT[W.season] || TINT.summer;
      env.mood(sk.c, sk.l, FOGMUL[W.weather] || 1, new T.Color(t[0], t[1], t[2]));
      particles(W.weather);
      if (rain) {
        var p = rain.geometry.attributes.position.array, fall = rain.userData.kind === 'rain' ? 22 : 2.5, c = cam.position;
        var stride = rain.isLineSegments ? 6 : 3;
        for (var i = 0; i < p.length; i += stride) {
          p[i + 1] -= fall * dt;
          if (rain.userData.kind === 'snow') { p[i] += Math.sin((p[i + 1] + i) * 0.5) * dt * 0.6; }
          if (p[i + 1] < c.y - 8) { p[i + 1] += 25; p[i] = c.x + (Math.random() - 0.5) * 50; p[i + 2] = c.z + (Math.random() - 0.5) * 50; }
          if (stride === 6) { p[i + 3] = p[i] + DROP[0]; p[i + 4] = p[i + 1] + DROP[1]; p[i + 5] = p[i + 2] + DROP[2]; }
        }
        rain.geometry.attributes.position.needsUpdate = true;
      }
      clockEl.style.display = '';
      clockEl.textContent = W.label;
    }

    /* ── 상태 빛: 상자 잠김/풀림 · 석등 · 거점 · 밭 ─────────────────── */
    function glow(o, col, k) {
      ownMats(o).forEach(function (x) { if (x.m.material.emissive) { x.m.material.emissive.set(col).multiplyScalar(k); } });
    }
    function states() {
      var objs = ctx.objs();
      S.ents.forEach(function (e) {
        var o = objs[e.id];
        if (!o || !e.alive) { return; }
        if (e.comps.chest) { var key = e.locked ? 'l' : 'u'; if (o.userData.st !== key) { o.userData.st = key; glow(o, e.locked ? '#000000' : '#ffd166', e.locked ? 0 : 0.35); } }
        if (e.comps.torch) { var tk = e.lit > 0 ? 'on' : 'off'; if (o.userData.st !== tk) { o.userData.st = tk; glow(o, '#ff9f43', e.lit > 0 ? 0.8 : 0); } }
        if (e.comps.waypoint) { var wk = e.lit ? 'on' : 'off'; if (o.userData.st !== wk) { o.userData.st = wk; glow(o, '#7bdff2', e.lit ? 0.7 : 0); } }
        if (e.comps.plot) {
          var sp = o.userData.sprout;
          if (!sp) { sp = o.userData.sprout = new T.Mesh(new T.ConeGeometry(0.25, 0.6, 8), new T.MeshStandardMaterial({ color: 0x5bbf4a })); sp.position.y = 0.35; o.add(sp); }
          sp.visible = e.plot !== 'empty';
          var k = e.plot === 'ripe' ? 1.6 : 0.7;
          sp.scale.set(k / (o.scale.x || 1), k / (o.scale.y || 1), k / (o.scale.z || 1));
          sp.material.color.set(e.plot === 'ripe' ? 0xffc93c : 0x5bbf4a);
        }
      });
    }

    /* ── 피격 플래시(80ms, combat_feel ③) ───────────────────────────── */
    var flashes = [];
    function flash(id) {
      var o = ctx.objs()[id];
      if (!o) { return; }
      ownMats(o).forEach(function (x) { if (x.m.material.emissive) { x.m.material.emissive.set(0xffffff); } });
      flashes.push({ o: o, t: 0.08 });
    }
    function stepFlash(dt) {
      flashes = flashes.filter(function (f) {
        f.t -= dt;
        if (f.t > 0) { return true; }
        f.o.userData.st = null;
        ownMats(f.o).forEach(function (x) { if (x.m.material.emissive && x.em) { x.m.material.emissive.copy(x.em); } });
        return false;
      });
    }

    /* ── 카메라 근접 흐림 — 카메라와 플레이어 사이를 가리는 것은 반투명 ───────── */
    var ray = new T.Raycaster(), faded = [];
    function nearFade(view) {
      faded.forEach(function (o) { ownMats(o).forEach(function (x) { x.m.material.opacity = x.op; x.m.material.transparent = x.tr; }); });
      faded = [];
      if (view !== 'follow' || !S.player) { return; }
      var objs = ctx.objs(), list = [], hits = [], seen = {};
      for (var id in objs) { if (S.player && id !== S.player.id && objs[id].visible) { list.push(objs[id].userData.inner); } }
      /* 머리만 보면 몸통을 가리는 낮은 기둥을 놓친다 — 발·허리·머리 세 점 */
      [0.2, 0.9, 1.6].forEach(function (hy) {
        var to = new T.Vector3(S.player.p[0], S.player.p[1] + hy, S.player.p[2]);
        var dir = to.sub(cam.position), d = dir.length();
        ray.set(cam.position, dir.normalize()); ray.far = Math.max(0.1, d - 0.5);
        hits = hits.concat(ray.intersectObjects(list, true));
      });
      hits.forEach(function (h) {
        var o = h.object; while (o && !o.userData.id) { o = o.parent; }
        if (!o || seen[o.userData.id]) { return; }
        seen[o.userData.id] = 1; faded.push(o);
        ownMats(o).forEach(function (x) { x.m.material.transparent = true; x.m.material.opacity = 0.28; });
      });
    }

    /* ── 스태미나 고리(원신 식 — 몸 옆에, 다 차면 숨는다) ───────────────── */
    var tmp = new T.Vector3();
    function stamina() {
      var st = S.stamina, pl = S.player;
      if (!pl || !st || st.v >= st.max - 0.5 || S.battle) { stamCv.style.display = 'none'; return; }
      tmp.set(pl.p[0], pl.p[1] + 1.4, pl.p[2]).project(cam);
      var r = canvas.getBoundingClientRect();
      stamCv.style.display = 'block';
      stamCv.style.left = ((tmp.x + 1) / 2 * r.width + 46) + 'px'; stamCv.style.top = ((1 - tmp.y) / 2 * r.height) + 'px';
      var g = stamCv.getContext('2d');
      if (!g) { return; }
      g.clearRect(0, 0, 88, 88);
      g.lineWidth = 9; g.strokeStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(44, 44, 32, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = st.tired ? '#ff6b6b' : '#ffd166'; g.beginPath(); g.arc(44, 44, 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * st.v / st.max); g.stroke();
    }

    /* ── 메뉴 ──────────────────────────────────────────────────────── */
    function menu() {
      var M = S.menu;
      menuEl.classList.toggle('show', !!M);
      if (!M) { lastMenu = ''; return; }
      var html = '<h4>' + esc(M.title) + '</h4>';
      if (M.kind === 'fish' && M.game) {
        var G = M.game;
        html += '<div class="fbar"><div class="zone" style="left:' + (G.zone[0] * 100) + '%;width:' + ((G.zone[1] - G.zone[0]) * 100) + '%"></div><div class="mark" style="left:calc(' + (G.pos * 100) + '% - 2px)"></div></div>';
      }
      if (M.kind === 'duel' && M.game && M.game.log.length) { html += '<div class="log">' + M.game.log.map(esc).join('<br>') + '</div>'; }
      html += M.items.map(function (it, i) {
        return '<div class="mi' + (i === M.cur ? ' cur' : '') + (it.disabled ? ' dis' : '') + '" data-i="' + i + '"><span>' + esc(it.label) + '</span><small>' + esc(it.sub || '') + '</small></div>';
      }).join('');
      html += '<div class="hint">↑↓ 고르기 · Enter/Space/F 확인' + (M.cancel === false ? '' : ' · X 닫기') + '</div>';
      if (html !== lastMenu) { menuEl.innerHTML = html; lastMenu = html; }
    }
    menuEl.addEventListener('pointerdown', function (e) {
      var t = e.target.closest ? e.target.closest('.mi') : null;
      if (!t) { return; }
      e.preventDefault();
      sim.menuPick(+t.dataset.i);
    });

    function hud() {
      var q = (S.questLog || []).map(function (x) { return '<div>' + esc(x.name) + (x.prog ? '<small>' + esc(x.prog) + '</small>' : '') + '</div>'; }).join('');
      if (q !== lastQ) { questsEl.innerHTML = q; lastQ = q; }
      var goals = (project.goals || []).filter(Boolean).map(function (l) { return esc(String(l).replace(/\{([^{}]+)\}/g, function (m, k) { return k in S.vars ? S.vars[k] : m; })); }).join('<br>');
      if (goals !== lastG) { goalsEl.innerHTML = goals; goalsEl.style.display = goals ? '' : 'none'; lastG = goals; }
      goalsEl.classList.toggle('low', !!S.world); /* 시계가 있으면 그 아래 — 좁은 화면 규칙(play.html)이 덮을 수 있게 클래스로 */
      menu();
      stamina();
      L.style.display = photo ? 'none' : '';
    }

    /* ── 저장 ──────────────────────────────────────────────────────── */
    function store() { if (!ctx.persist) { return; } try { root.localStorage.setItem(saveKey, JSON.stringify(sim.save())); } catch (e) { /* 저장소가 막힌 창 */ } }
    function saved() { try { return JSON.parse(root.localStorage.getItem(saveKey) || 'null'); } catch (e) { return null; } }
    function offerContinue(onDone) {
      var s = ctx.persist ? saved() : null;
      if (!s || s.project !== project.id) { onDone(false); return; }
      contEl.innerHTML = '';
      var box = el('div', 'box', contEl);
      el('div', null, box, '저장된 진행이 있다');
      var b1 = el('button', null, box, '이어하기'); b1.style.background = '#ffd166';
      var b2 = el('button', null, box, '새로 하기');
      contEl.classList.add('show');
      b1.onclick = function () { contEl.classList.remove('show'); onDone(sim.load(s)); };
      b2.onclick = function () { contEl.classList.remove('show'); try { root.localStorage.removeItem(saveKey); } catch (e) { /* 없어도 된다 */ } onDone(false); };
    }
    var autoT = 0;

    /* 마무리 카드(session_card) — 이번 판에 늘어난 것 */
    function sessionLines() {
      var out = [];
      Object.keys(S.vars).forEach(function (k) {
        var a = startVars[k], b = S.vars[k];
        if (typeof b !== 'number' || ['hour', 'day', 'night'].indexOf(k) >= 0) { return; }
        var d = b - (typeof a === 'number' ? a : 0);
        if (Math.abs(d) >= 1) { out.push(k + ' ' + (d > 0 ? '+' : '') + Math.round(d)); }
      });
      var qd = Object.keys(S.quests || {}).filter(function (k) { return S.quests[k] === 'done'; }).length;
      if (qd) { out.push('퀘스트 완수 ' + qd); }
      var cx = 0; for (var b in (S.codex || {})) { cx += Object.keys(S.codex[b]).length; }
      if (cx) { out.push('도감 ' + cx); }
      return out;
    }

    function fx(f) {
      if (f.type === 'dmg') {
        if (f.hitstop && ctx.feel !== false) { hitstop = Math.max(hitstop, f.hitstop); }
        if (f.id) { flash(f.id); }
        return false; // 숫자는 play-combat 가 띄운다
      }
      if (f.type === 'save') { store(); return true; }
      if (f.type === 'scene') { autoT = 0; store(); return false; }
      return false;
    }

    function keys(code) {
      if (S.menu || S.dialog || S.battle || S.over) { return; }
      if (code === 'KeyB') { var c = sim.system('codex'); if (c) { c.open(); } }
      if (code === 'KeyM') { var w = sim.system('waypoint'); if (w) { w.open(); } }
    }
    function togglePhoto() {
      photo = !photo;
      photoEl.style.display = photo ? 'block' : 'none';
      doc.body.appendChild(photoEl);
      if (!photo) { ctx.hud.appendChild(photoEl); }
    }
    function snapPhoto(R) {
      try {
        R.render(scene3, cam);
        var a = doc.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = (project.title || project.id) + '-' + Date.now() + '.png';
        a.click();
      } catch (e) { /* 막힌 창 */ }
    }

    return {
      /* play.js 가 한 프레임마다: 멈춰야 하는 시간(히트스톱·사진) */
      paused: function () { return photo; },
      hitstop: function (dt) { if (hitstop > 0) { hitstop -= dt; return true; } return false; },
      sync: function (dt, env, view) { world(env, dt); states(); stepFlash(dt); nearFade(view); if (ctx.persist) { autoT += dt; if (autoT > 30 && !S.over) { autoT = 0; store(); } } },
      hud: hud, fx: fx, keys: keys, togglePhoto: togglePhoto, snapPhoto: snapPhoto, photo: function () { return photo; },
      offerContinue: offerContinue, store: store, sessionLines: sessionLines, clearSave: function () { try { root.localStorage.removeItem(saveKey); } catch (e) { /* 없어도 된다 */ } },
      resetSession: function () { startVars = JSON.parse(JSON.stringify(S.vars)); }
    };
  }

  root.SagaPlaySystems = { create: create };
})(window);
