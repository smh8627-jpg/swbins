/**
 * 사가 엔진 — 전투 화면(play-combat). play.js 가 부른다. 규칙은 combat.js, 여기는 보여 주기만.
 *   공통   적 체력 막대·원소 표시·공격 예고 고리·피해 숫자·글 튀기기·폭발 구·키 안내
 *   원신식 파티 명단(1~4)·원소 스킬 쿨·폭발 에너지·스태미나
 *   젤다식 주목 조준점·방패·모으기
 *   파판식 전투 무대(파티 왼쪽·적 오른쪽, 옆 카메라)·ATB 막대·명령 메뉴(누르거나 ↑↓ Enter)
 */
(function (root) {
  'use strict';
  var T = root.THREE, V = root.SagaView;
  var doc = root.document;
  var ELEM = (root.SagaCombat || {}).ELEM || {};
  var KEYS = {
    simple: 'WASD 이동 · Space 점프 · Shift 달리기 · J/클릭 공격 · E/F 말 걸기·줍기 · V 시점',
    genshin: 'J/클릭 공격 · E 원소 스킬 · Q 원소 폭발 · Shift 대시(누르고 있으면 달리기) · 1~4 교체 · F 말 걸기·줍기 · V 시점',
    zelda: 'J/클릭 베기(J 모았다 떼면 회전 베기) · Q/Tab 주목 · Shift 방패(막 내밀면 저스트 가드) · 주목 중 Space 회피 · F 말 걸기 · V 시점',
    ff: '적에 닿으면 전투 · 전투 중 ↑↓ 고르기 · Enter/Space 확인 · X 취소 · Shift 달리기 · V 시점'
  };

  function el(tag, cls, parent, text) {
    var e = doc.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    if (parent) { parent.appendChild(e); }
    return e;
  }

  var CSS = [
    '.cbl{position:absolute;inset:0;pointer-events:none;overflow:hidden}',
    '.cbl .num{position:absolute;font-weight:800;font-size:20px;text-shadow:0 2px 3px #000,0 0 2px #000;transform:translate(-50%,-50%);white-space:nowrap}',
    '.cbl .num small{display:block;font-size:13px;text-align:center}',
    '.cbl .fbar{position:absolute;z-index:0;width:64px;height:6px;background:rgba(0,0,0,.55);border-radius:3px;transform:translate(-50%,-50%)}',
    '.cbl .fbar i{position:absolute;left:0;top:0;bottom:0;background:#ff5d5d;border-radius:3px}',
    '.cbl .fbar b{position:absolute;right:-12px;top:-3px;width:10px;height:10px;border-radius:50%}',
    '.cbl .fbar.stun i{background:#ffd166}.cbl .fbar.frz i{background:#a8ecff}',
    '.cbl .reticle{position:absolute;width:44px;height:44px;border:3px solid #ffd166;border-radius:50%;transform:translate(-50%,-50%);display:none;box-shadow:0 0 8px #ffd166}',
    '.cbl .keys{position:absolute;left:14px;bottom:10px;font-size:12px;color:#fff;background:rgba(0,0,0,.4);padding:4px 10px;border-radius:6px;max-width:70vw}',
    '.cbl .pop{position:absolute;left:50%;top:30%;transform:translateX(-50%);font-size:24px;font-weight:800;text-shadow:0 2px 6px #000;white-space:nowrap}',
    '.cbl .party{position:absolute;right:14px;top:30%;z-index:2;display:flex;flex-direction:column;gap:6px}',
    '.cbl .party div{background:rgba(10,14,24,.7);padding:5px 10px;border-radius:8px;min-width:150px;color:#fff;font-size:13px;border-left:4px solid #888;opacity:.75}',
    '.cbl .party div.on{opacity:1;box-shadow:0 0 0 2px #ffd166}',
    '.cbl .party .hpb{height:4px;background:#333;border-radius:2px;margin-top:3px}.cbl .party .hpb i{display:block;height:100%;background:#52d39a;border-radius:2px}',
    '.cbl .skills{position:absolute;right:18px;bottom:22px;display:flex;gap:12px}',
    '.cbl .sk{width:62px;height:62px;border-radius:50%;background:rgba(10,14,24,.7);color:#fff;display:flex;align-items:center;justify-content:center;flex-direction:column;font-size:12px;border:3px solid #666;font-weight:700}',
    '.cbl .sk.ready{border-color:#ffd166}',
    '.cbl .shield{position:absolute;left:50%;top:58%;transform:translateX(-50%);font-size:34px;display:none;text-shadow:0 0 10px #7bdff2}',
    '.cbl .charge{position:absolute;left:50%;top:64%;width:90px;height:6px;transform:translateX(-50%);background:rgba(0,0,0,.5);border-radius:3px;display:none}',
    '.cbl .charge i{display:block;height:100%;background:#ffd166}',
    '.cbl .flurry{position:absolute;inset:0;box-shadow:inset 0 0 120px rgba(123,223,242,.6);display:none}',
    '.cbl .skbar{position:absolute;right:18px;bottom:96px;display:flex;gap:8px;align-items:flex-end}',
    '.cbl .sk2{width:58px;height:58px;border-radius:10px;background:rgba(10,14,24,.72);border:2px solid #555;color:#fff;font-size:11px;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:.6}',
    '.cbl .sk2.ready{opacity:1}.cbl .sk2 b{font-size:14px;color:#ffd166}.cbl .sk2 small{color:#aab}',
    '.cbl .mpb{position:relative;width:110px;height:14px;background:rgba(0,0,0,.5);border-radius:7px;overflow:hidden}.cbl .mpb i{position:absolute;left:0;top:0;bottom:0;background:#4f86e0}.cbl .mpb span{position:relative;font-size:10px;color:#fff;padding-left:6px}',
    '.cbl .pot{background:rgba(10,14,24,.72);color:#fff;padding:4px 10px;border-radius:8px;font-size:12px}',
    '.cbl .ff{position:absolute;left:0;right:0;bottom:0;display:none;gap:10px;padding:12px;pointer-events:auto}',
    '.cbl .ff.show{display:flex}',
    '.cbl .ff .box{background:rgba(12,20,60,.88);border:2px solid #c9d6ff;border-radius:8px;color:#fff;padding:8px 12px;font-size:15px}',
    '.cbl .ff .foes{flex:0 0 26%}.cbl .ff .pty{flex:1}.cbl .ff .menu{flex:0 0 190px}',
    '.cbl .ff .pr{display:grid;grid-template-columns:1fr 90px 60px 90px;gap:8px;align-items:center;padding:2px 4px;border-radius:4px}',
    '.cbl .ff .pr.turn{background:rgba(255,209,102,.2)}.cbl .ff .pr.ko{color:#ff7b7b}',
    '.cbl .ff .atb{height:7px;background:#222;border-radius:3px}.cbl .ff .atb i{display:block;height:100%;background:#7bdff2;border-radius:3px}.cbl .ff .atb i.full{background:#ffd166}',
    '.cbl .ff .mi{padding:3px 6px;border-radius:4px;cursor:pointer;display:flex;justify-content:space-between;gap:8px}',
    '.cbl .ff .mi.cur{background:rgba(255,255,255,.18)}.cbl .ff .mi.cur:before{content:"▶ "}.cbl .ff .mi.dis{opacity:.4}',
    '.cbl .msg{z-index:3;position:absolute;left:50%;top:14px;transform:translateX(-50%);background:rgba(12,20,60,.88);border:2px solid #c9d6ff;border-radius:8px;color:#fff;padding:6px 16px;white-space:nowrap}'
  ].join('\n');

  function create(ctx) {
    var S = ctx.S, sim = ctx.sim, style = ctx.style, cam = ctx.cam, scene3 = ctx.scene3, canvas = ctx.canvas, project = ctx.project;
    if (!doc.getElementById('saga-cb-css')) { var st = el('style', null, doc.head); st.id = 'saga-cb-css'; st.textContent = CSS; }
    var L = el('div', 'cbl', ctx.hud);
    var keys = el('div', 'keys', L, KEYS[style] || KEYS.simple);
    var reticle = el('div', 'reticle', L);
    var flurry = el('div', 'flurry', L);
    var nums = [], pops = [], bars = {}, rings = {}, fxMeshes = [];
    var tmp = new T.Vector3();

    function screen(x, y, z) {
      tmp.set(x, y, z).project(cam);
      var r = canvas.getBoundingClientRect();
      return { x: (tmp.x + 1) / 2 * r.width, y: (1 - tmp.y) / 2 * r.height, vis: tmp.z < 1 && tmp.z > -1 };
    }

    /* ── 원신식·젤다식 HUD ─────────────────────────────────────────── */
    var partyEl = null, skillsEl = null, shieldEl = null, chargeEl = null;
    var skBar = el('div', 'skbar', L);
    if (style === 'genshin') {
      partyEl = el('div', 'party', L);
      skillsEl = el('div', 'skills', L);
    }
    if (style === 'zelda') {
      shieldEl = el('div', 'shield', L, '🛡');
      chargeEl = el('div', 'charge', L); el('i', null, chargeEl);
    }
    /* ── 파판식 ─────────────────────────────────────────────────────── */
    var ffEl = null, ffMsg = null, stage = null, stageObjs = null, anims = [];
    if (style === 'ff') {
      ffEl = el('div', 'ff', L);
      ffMsg = el('div', 'msg', L); ffMsg.style.display = 'none';
    }

    function lookOf(m) { return m.model ? { shape: 'model', model: m.model, dy: m.dy || 0 } : { shape: 'capsule', color: m.color }; }
    function buildStage() {
      var B = S.battle;
      clearStage();
      stage = new T.Group();
      var c = B.center;
      stage.position.set(c[0], c[1], c[2]);
      var disk = new T.Mesh(new T.CylinderGeometry(7.5, 7.5, 0.06, 40), new T.MeshStandardMaterial({ color: 0x3a4a6a, roughness: 0.9, transparent: true, opacity: 0.85 }));
      disk.position.y = 0.03; disk.receiveShadow = true; stage.add(disk);
      stageObjs = { p: [], f: [] };
      B.party.forEach(function (m, i) {
        var o = V.entity({ id: 'bp' + i, look: lookOf(m), comps: { player: {} } });
        V.place(o, [-3.2, 0, (i - (B.party.length - 1) / 2) * 1.9], [0, 90, 0], [1, 1, 1]);
        o.userData.home = o.position.clone();
        stage.add(o); stageObjs.p.push(o);
      });
      B.foes.forEach(function (f, j) {
        var o = V.entity({ id: 'bf' + j, look: f.look, comps: { chase: {} } });
        V.place(o, [3.2, 0, (j - (B.foes.length - 1) / 2) * 2.1], [0, -90, 0], [1, 1, 1]);
        o.userData.home = o.position.clone();
        stage.add(o); stageObjs.f.push(o);
      });
      scene3.add(stage);
    }
    function clearStage() {
      if (stage) { scene3.remove(stage); stage.traverse(function (o) { if (o.isSprite) { V.dispose(o); } }); }
      stage = null; stageObjs = null; anims = [];
    }

    /* ── 효과 ───────────────────────────────────────────────────────── */
    function num(at, n, color, text) {
      var d = el('div', 'num', L);
      d.innerHTML = '';
      d.appendChild(doc.createTextNode(String(n)));
      if (text) { var s = el('small', null, d, text); s.style.color = '#fff'; }
      d.style.color = color || '#fff';
      nums.push({ el: d, p: at.slice(), t: 0.9, dx: (Math.random() - 0.5) * 0.6 });
    }
    function pop(text, color) {
      var d = el('div', 'pop', L, text);
      d.style.color = color || '#fff';
      pops.push({ el: d, t: 1.4 });
    }
    function burst(at, r, color, big) {
      var m = new T.Mesh(new T.SphereGeometry(1, 24, 16), new T.MeshBasicMaterial({ color: new T.Color(color || '#ffffff'), transparent: true, opacity: 0.45, depthWrite: false }));
      m.position.set(at[0], at[1] + 0.8, at[2]);
      m.userData = { t: 0, dur: big ? 0.6 : 0.35, r: r };
      scene3.add(m); fxMeshes.push(m);
    }
    /* 바닥 부채꼴 — 눕힌 고리에서 각 θ 는 (cosθ, 0, -sinθ) 이니 yaw 방향의 가운데 각은 yaw - 90° */
    function arc(at, yaw, r, color) {
      var half = Math.PI / 2.6, mid = yaw * Math.PI / 180 - Math.PI / 2;
      var g = new T.RingGeometry(0.4, r + 0.4, 24, 1, mid - half, half * 2);
      var m = new T.Mesh(g, new T.MeshBasicMaterial({ color: new T.Color(color), transparent: true, opacity: 0.55, side: T.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(at[0], at[1] + 0.08, at[2]);
      m.userData = { t: 0, dur: 0.22, flat: true, mat: m.material };
      scene3.add(m); fxMeshes.push(m);
    }

    /* 연쇄 번개 줄기 */
    function beam(a, b, color) {
      var g = new T.BufferGeometry().setFromPoints([new T.Vector3(a[0], a[1] + 1.2, a[2]), new T.Vector3((a[0] + b[0]) / 2 + (Math.random() - 0.5), (a[1] + b[1]) / 2 + 1.8, (a[2] + b[2]) / 2 + (Math.random() - 0.5)), new T.Vector3(b[0], b[1] + 1.2, b[2])]);
      var m = new T.Line(g, new T.LineBasicMaterial({ color: new T.Color(color || '#c07bff'), transparent: true }));
      m.userData = { t: 0, dur: 0.3, flat: true, mat: m.material };
      scene3.add(m); fxMeshes.push(m);
    }
    /* 탄·소환 정령 — 규칙 쪽 S.shots·S.allies 를 빛나는 공으로 */
    var shotMeshes = [], allyMeshes = [], orbGeo = new T.SphereGeometry(0.22, 12, 8);
    function orbs(list, pool, col) {
      while (pool.length < list.length) { var m = new T.Mesh(orbGeo, new T.MeshBasicMaterial({ color: 0xffffff })); scene3.add(m); pool.push(m); }
      pool.forEach(function (m, i) {
        var s = list[i];
        m.visible = !!s;
        if (!s) { return; }
        m.position.set(s.p[0], s.p[1], s.p[2]);
        m.material.color.set(s.el ? ELEM[s.el] : (s.side === 'f' ? '#ff5d5d' : col));
        m.scale.setScalar(s.side ? 1 : 1.6 + Math.sin(performance.now() / 120) * 0.2);
      });
    }

    function stageObj(side, i) { return stageObjs ? (side === 'p' ? stageObjs.p : stageObjs.f)[i] : null; }

    function fx(f) {
      switch (f.type) {
        case 'dmg': num(f.at, f.n, f.color, f.text); return true;
        case 'pop': pop(f.text, f.color); return true;
        case 'burst': burst(f.at, f.r, f.color, f.big); return true;
        case 'strike': arc(f.at, f.yaw, f.r, '#ff4d4d'); return true;
        case 'swing': if (S.player) { arc(S.player.p, S.player.r[1], 1.8, '#ffffff'); } return true;
        case 'spin': if (S.player) { burst(S.player.p, 2.9, '#ffffff'); } return true;
        case 'dash': return true;
        case 'beam': beam(f.from, f.to, f.color); return true;
        case 'battle-start': buildStage(); return true;
        case 'battle-end': clearStage(); return true;
        case 'battle-act': {
          var a = stageObj(f.side, f.i), t = f.tside ? stageObj(f.tside, f.ti) : null;
          if (a && t && t !== a && !f.heal) { anims.push({ o: a, to: t.position.clone(), t: 0 }); }
          else if (a) { anims.push({ o: a, hop: true, t: 0 }); }
          var tp = t ? t.position.clone().add(stage.position) : null;
          if (tp && f.dmg != null) { num([tp.x, tp.y + 2.2, tp.z], f.dmg, f.el ? ELEM[f.el] : (f.side === 'f' ? '#ff7b7b' : '#fff'), f.crit ? '치명!' : f.magic || ''); }
          if (tp && f.heal != null) { num([tp.x, tp.y + 2.2, tp.z], '+' + f.heal, '#52d39a', f.magic || ''); }
          if (f.el && tp) { burst([tp.x, tp.y, tp.z], 1.4, ELEM[f.el]); }
          return true;
        }
      }
      return false;
    }

    /* ── 매 프레임 ─────────────────────────────────────────────────── */
    function ringFor(id, o) {
      var r = rings[id];
      if (r && r.parent === o) { return r; }
      r = new T.Mesh(new T.RingGeometry(0.55, 0.75, 32), new T.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false }));
      r.rotation.x = -Math.PI / 2; r.position.y = 0.06;
      o.add(r); rings[id] = r;
      return r;
    }
    function sync(dt) {
      var objs = ctx.objs(), seen = {};
      /* 적 막대·고리 */
      if (style !== 'ff' || !S.battle) {
        S.ents.forEach(function (e) {
          if (!e.alive || !e.comps.foe || e.hidden || !e.cb && style === 'ff') { return; }
          var c = e.cb || {};
          var o = objs[e.id];
          if (!o) { return; }
          seen[e.id] = 1;
          if (style !== 'ff') {
            var bar = bars[e.id];
            if (!bar) { bar = bars[e.id] = el('div', 'fbar', L); el('i', null, bar); el('b', null, bar); }
            var s = screen(e.p[0], e.p[1] + (e.body.size[1] * e.s[1]) + 0.5, e.p[2]);
            /* 멀리 있는 멀쩡한 적은 막대를 숨긴다 — 벽·집 너머로 막대만 둥둥 뜨지 않게 */
            var pl = S.player, far = pl && Math.hypot(e.p[0] - pl.p[0], e.p[2] - pl.p[2]) > 16;
            bar.style.display = s.vis && !(far && e.hp >= (c.max || 1)) ? '' : 'none';
            bar.style.left = s.x + 'px'; bar.style.top = s.y + 'px';
            bar.firstChild.style.width = Math.max(0, e.hp / (c.max || 1) * 100) + '%';
            bar.className = 'fbar' + (c.stun > 0 ? ' stun' : c.freeze > 0 ? ' frz' : '');
            var dot = bar.lastChild;
            dot.style.display = c.aura ? '' : 'none';
            if (c.aura) { dot.style.background = ELEM[c.aura.el] || '#fff'; }
          }
          var ring = ringFor(e.id, o);
          var show = c.st === 'wind' || c.stun > 0 || c.freeze > 0;
          ring.visible = show;
          if (show) {
            ring.material.color.set(c.stun > 0 ? 0xffd166 : c.freeze > 0 ? 0xa8ecff : 0xff3b3b);
            var k = c.st === 'wind' ? 0.8 + c.wind * 1.2 : 1.1;
            ring.scale.set(k / (o.scale.x || 1), k / (o.scale.z || 1), 1);
          }
        });
      }
      for (var id in bars) { if (!seen[id]) { bars[id].remove(); delete bars[id]; } }
      /* 떠오르는 숫자 */
      nums = nums.filter(function (n) {
        n.t -= dt;
        if (n.t <= 0) { n.el.remove(); return false; }
        n.p[1] += dt * 1.2; n.p[0] += n.dx * dt;
        var s = screen(n.p[0], n.p[1], n.p[2]);
        n.el.style.left = s.x + 'px'; n.el.style.top = s.y + 'px';
        n.el.style.opacity = Math.min(1, n.t * 2.5);
        n.el.style.display = s.vis ? '' : 'none';
        return true;
      });
      pops = pops.filter(function (p) {
        p.t -= dt;
        if (p.t <= 0) { p.el.remove(); return false; }
        p.el.style.opacity = Math.min(1, p.t * 2);
        p.el.style.top = (30 - (1.4 - p.t) * 4) + '%';
        return true;
      });
      orbs(S.shots || [], shotMeshes, '#ffffff');
      orbs(S.allies || [], allyMeshes, '#9be15d');
      fxMeshes = fxMeshes.filter(function (m) {
        var u = m.userData;
        u.t += dt;
        var k = u.t / u.dur;
        if (k >= 1) { scene3.remove(m); return false; }
        if (u.flat) { u.mat.opacity = 0.55 * (1 - k); } else { m.scale.setScalar(Math.max(0.01, u.r * (0.3 + 0.7 * k))); m.material.opacity = 0.45 * (1 - k); }
        return true;
      });
      /* 파판식 무대 */
      if (stage && S.battle) {
        var B = S.battle;
        B.party.forEach(function (m, i) { var o = stageObjs.p[i]; if (o) { o.userData.inner.rotation.z = m.hp <= 0 ? Math.PI / 2 : 0; o.userData.inner.position.y = m.hp <= 0 ? 0.4 : 0; } });
        B.foes.forEach(function (f, j) { var o = stageObjs.f[j]; if (o) { o.visible = f.hp > 0 || (anims.some(function (a) { return a.o === o; })); } });
        anims = anims.filter(function (a) {
          a.t += dt;
          var k = Math.min(1, a.t / 0.5), s = Math.sin(k * Math.PI);
          if (a.hop) { a.o.position.y = a.o.userData.home.y + s * 0.6; } else { a.o.position.lerpVectors(a.o.userData.home, a.to, s * 0.6); }
          if (k >= 1) { a.o.position.copy(a.o.userData.home); return false; }
          return true;
        });
        stage.traverse(function (o) { if (o.userData && o.userData.mixer) { V.animate(o, false, dt); } });
      }
    }

    /* ── HUD ────────────────────────────────────────────────────────── */
    var lastFF = '', lastSk = '';
    function hud() {
      var cb = S.cb || {};
      var lock = cb.lock && cb.lock.alive ? cb.lock : null;
      if (lock) {
        var s = screen(lock.p[0], lock.p[1] + lock.body.size[1] * lock.s[1] * 0.55, lock.p[2]);
        reticle.style.display = s.vis ? 'block' : 'none';
        reticle.style.left = s.x + 'px'; reticle.style.top = s.y + 'px';
      } else { reticle.style.display = 'none'; }
      flurry.style.display = cb.flurryT > 0 ? 'block' : 'none';
      if (style === 'genshin' && cb.party) {
        var ph = cb.party.map(function (m) {
          return '<div class="' + (m.i === cb.active ? 'on' : '') + '" style="border-left-color:' + (ELEM[m.element] || '#888') + '">' +
            (m.i + 1) + ' ' + esc(m.name) + ' <small style="color:' + (ELEM[m.element] || '#aaa') + '">' + esc(m.element || '') + '</small>' +
            '<div class="hpb"><i style="width:' + Math.max(0, m.hp / m.maxhp * 100) + '%"></i></div></div>';
        }).join('');
        if (partyEl.innerHTML !== ph) { partyEl.innerHTML = ph; }
        var m = cb.party[cb.active];
        if (m) {
          var sk = '<div class="sk' + (m.skillCd <= 0 ? ' ready' : '') + '">E<span>' + (m.skillCd > 0 ? m.skillCd.toFixed(1) : '스킬') + '</span></div>' +
                   '<div class="sk' + (m.energy >= 60 ? ' ready' : '') + '" style="border-color:' + (m.energy >= 60 ? (ELEM[m.element] || '#ffd166') : '#666') + '">Q<span>' + Math.floor(m.energy / 60 * 100) + '%</span></div>';
          if (skillsEl.innerHTML !== sk) { skillsEl.innerHTML = sk; }
        }
      }
      if (style === 'zelda') {
        shieldEl.style.display = cb.blockT >= 0 ? 'block' : 'none';
        chargeEl.style.display = cb.charge > 0.15 ? 'block' : 'none';
        chargeEl.firstChild.style.width = Math.min(100, cb.charge / 0.8 * 100) + '%';
        chargeEl.firstChild.style.background = cb.charge >= 0.8 ? '#ffffff' : '#ffd166';
      }
      if (style === 'ff') { hudFF(); }
      /* 스킬 칸 Z X C R · MP · 포션 */
      var sb = '';
      if (cb.skills && cb.skills.length) {
        sb += cb.skills.map(function (s, i) {
          var d = s.def;
          return '<div class="sk2' + (s.cd <= 0 ? ' ready' : '') + '" style="border-color:' + (d.element ? (ELEM[d.element] || '#888') : (s.cd <= 0 ? '#ffd166' : '#555')) + '"><b>' + 'ZXCR'[i] + '</b><span>' + esc(d.name || d.kind) + '</span><small>' + (s.cd > 0 ? s.cd.toFixed(1) + 's' : (d.mp ? 'MP ' + d.mp : '')) + '</small></div>';
        }).join('');
      }
      var mpv = (project.combat && project.combat.mpVar) || 'mp';
      if (cb.skills && cb.skills.length && S.vars[mpv] != null) { sb += '<div class="mpb"><i style="width:' + Math.min(100, S.vars[mpv] / ((project.combat && project.combat.mpMax) || 50) * 100) + '%"></i><span>MP ' + Math.floor(S.vars[mpv]) + '</span></div>'; }
      var pv = (project.combat && project.combat.potionVar) || 'potion';
      if (S.vars[pv] != null && style !== 'ff') { sb += '<div class="pot">H 포션 ×' + S.vars[pv] + '</div>'; }
      if (sb !== lastSk) { skBar.innerHTML = sb; lastSk = sb; }
      skBar.style.display = S.battle ? 'none' : '';
      keys.style.display = S.battle ? 'none' : '';
    }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function hudFF() {
      var B = S.battle;
      ffEl.classList.toggle('show', !!B);
      ffMsg.style.display = B && B.msg ? '' : 'none';
      if (!B) { lastFF = ''; return; }
      ffMsg.textContent = B.msg;
      var M = B.menu;
      var foes = '<div class="box foes">' + B.foes.filter(function (f) { return f.hp > 0; }).map(function (f) { return '<div>' + esc(f.name) + '</div>'; }).join('') + '</div>';
      var pty = '<div class="box pty">' + B.party.map(function (m) {
        var a = Math.floor(m.atb || 0);
        return '<div class="pr' + (M && M.who === m.i ? ' turn' : '') + (m.hp <= 0 ? ' ko' : '') + '"><span>' + esc(m.name) + ' <small>Lv' + m.lv + '</small></span><span>HP ' + m.hp + '/' + m.maxhp + '</span><span>MP ' + m.mp + '</span>' +
          '<div class="atb"><i class="' + (a >= 100 ? 'full' : '') + '" style="width:' + a + '%"></i></div></div>';
      }).join('') + '</div>';
      var menu = '';
      if (M) {
        menu = '<div class="box menu">' + M.items.map(function (it, i) {
          return '<div class="mi' + (i === M.cur ? ' cur' : '') + (it.disabled ? ' dis' : '') + '" data-i="' + i + '"><span>' + esc(it.label) + '</span><small>' + esc(it.sub || '') + '</small></div>';
        }).join('') + (M.stage !== 'cmd' ? '<div class="mi" data-back="1"><small>← X 취소</small></div>' : '') + '</div>';
      }
      var html = foes + pty + menu;
      if (html !== lastFF) { ffEl.innerHTML = html; lastFF = html; }
    }
    if (ffEl) {
      ffEl.addEventListener('pointerdown', function (e) {
        var t = e.target.closest ? e.target.closest('.mi') : null;
        if (!t || !sim.combat) { return; }
        e.preventDefault();
        if (t.dataset.back) { var M = S.battle && S.battle.menu; if (M) { M.stage = 'cmd'; M.cur = 0; } return; }
        sim.combat.choose(+t.dataset.i);
      });
    }

    function camera(want, tgt) {
      if (!(style === 'ff' && S.battle && stage)) { return false; }
      var c = S.battle.center;
      want.set(c[0] + 1.5, c[1] + 4.2, c[2] + 10);
      tgt.set(c[0], c[1] + 1, c[2]);
      return true;
    }

    function scene() {
      for (var id in bars) { bars[id].remove(); } bars = {}; rings = {};
      clearStage();
      fxMeshes.forEach(function (m) { scene3.remove(m); }); fxMeshes = [];
      if (S.battle) { buildStage(); }
    }

    return { fx: fx, sync: sync, hud: hud, camera: camera, scene: scene, hidesField: function () { return style === 'ff' && !!S.battle; } };
  }

  root.SagaPlayCombat = { create: create, KEYS: KEYS };
})(window);
