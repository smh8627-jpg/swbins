/**
 * 사가 엔진 — 장르 화면(play-genres). play.js 가 부른다. 규칙은 genres.js.
 *   둥근 세상(graphics.curve — 사가의숲 구면 투영: 멀수록 땅이 아래로 굽는다, 그림만 휘고 규칙은 평평)
 *   영지 깃발(주인 색) · 턴 남은 시간 · 키 안내(G 장비 · H 꾸미기)
 */
(function (root) {
  'use strict';
  var T = root.THREE;
  var doc = root.document;

  var CSS = [
    '.gnl{position:absolute;inset:0;pointer-events:none}',
    '.gnl .turn{position:absolute;left:50%;top:12px;transform:translateX(-50%);background:rgba(10,14,24,.6);color:#fff;padding:4px 12px;border-radius:8px;font-size:13px;display:none}',
    '.gnl .keys{position:absolute;left:14px;bottom:88px;background:rgba(10,14,24,.55);color:#dde;padding:3px 9px;border-radius:8px;font-size:12px;display:none}'
  ].join('\n');
  var OWNER = { player: '#3b82f6', enemy: '#e63946', neutral: '#9e9e9e' };

  /* 둥근 세상 — three 의 정점 마무리 조각에 "카메라에서 멀수록 아래로"를 끼운다. 모든 재질이 같이 휜다 */
  var origChunk = null;
  function setCurve(k) {
    var SC = T && T.ShaderChunk;
    if (!SC || !SC.project_vertex) { return; }
    if (origChunk == null) { origChunk = SC.project_vertex; }
    if (!(k > 0)) { SC.project_vertex = origChunk; return; }
    var line = 'gl_Position = projectionMatrix * mvPosition;';
    SC.project_vertex = origChunk.replace(line, 'mvPosition.y -= ' + (+k).toFixed(5) + ' * dot(mvPosition.xz, mvPosition.xz);\n' + line);
  }

  function el(tag, cls, parent, text) {
    var e = doc.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    if (parent) { parent.appendChild(e); }
    return e;
  }

  function create(ctx) {
    var S = ctx.S, sim = ctx.sim, project = ctx.project;
    var st = doc.getElementById('saga-genres-css');
    if (!st) { st = el('style', null, doc.head); st.id = 'saga-genres-css'; st.textContent = CSS; }
    var L = el('div', 'gnl', ctx.hud);
    var turnEl = el('div', 'turn', L), keysEl = el('div', 'keys', L);
    setCurve(+((project.graphics || {}).curve) || 0);
    var gear = sim.system && sim.system('gear'), realm = sim.system && sim.system('realm'), housing = sim.system && sim.system('housing');
    var hasFurn = (project.furniture || []).length > 0;

    function flag(o, owner) {
      var f = o.userData.flag;
      if (!f) {
        f = new T.Group();
        var pole = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 2.2, 6), new T.MeshStandardMaterial({ color: 0x5d4037 }));
        pole.position.y = 1.1; f.add(pole);
        var cloth = new T.Mesh(new T.BoxGeometry(0.9, 0.55, 0.04), new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0x000000 }));
        cloth.position.set(0.47, 1.9, 0); f.add(cloth);
        f.userData.cloth = cloth;
        var b = new T.Box3().setFromObject(o.userData.inner || o);
        f.position.y = isFinite(b.max.y) ? Math.max(0, b.max.y - o.position.y) / Math.max(0.01, o.scale.y) : 1;
        o.add(f); o.userData.flag = f;
      }
      if (f.userData.owner !== owner) {
        f.userData.owner = owner;
        var c = new T.Color(OWNER[owner] || OWNER.neutral);
        f.userData.cloth.material.color.copy(c); f.userData.cloth.material.emissive.copy(c).multiplyScalar(0.3);
      }
    }

    function sync() {
      var objs = ctx.objs(), anyTown = false;
      if (realm) {
        S.ents.forEach(function (e) {
          if (!e.alive || !e.comps.town) { return; }
          anyTown = true;
          var o = objs[e.id]; if (o) { flag(o, realm.state(e).owner); }
        });
      }
      turnEl.style.display = anyTown && !S.battle ? '' : 'none';
      if (anyTown) { turnEl.textContent = '턴 ' + (S.vars[(project.realm || {}).turnVar || 'turn'] || 0) + ' · 다음 턴까지 ' + Math.ceil(realm.left()) + '초'; }
      var keys = [];
      if (gear && gear.on) { keys.push('G 장비'); }
      if (housing && hasFurn && S.ents.some(function (e) { return e.alive && e.comps.room; })) { keys.push('H 꾸미기'); }
      keysEl.style.display = keys.length && !S.cine ? '' : 'none';
      keysEl.textContent = keys.join(' · ');
    }
    function stop() { setCurve(0); }
    return { sync: sync, stop: stop };
  }

  root.SagaPlayGenres = { create: create, setCurve: setCurve };
})(typeof window !== 'undefined' ? window : globalThis);
