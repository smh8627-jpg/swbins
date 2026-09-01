/**
 * 3D 에셋 창고 — 사냥터 지형지물을 GLB 로 세운다 (PLAN 36절 Phase 2)
 * ---------------------------------------------------------------
 * saga-forest·saga-realm 의 `asset3d.js` 와 같은 요령이다. 이 판은 인물이 아니라
 * **지형지물만** 표에 있다 — 사람(주인공·적)은 아직 도형 캡슐이고(뼈대 애니메이션이
 * 걸린 더 큰 작업이라 다음 단계), `side-view3d.js` 가 GLB 를 못 받으면 조용히
 * 도형(원뿔·구)으로 남는다. **한 줄도 판정에 닿지 않는다** — side.js 는 이 파일을 모른다.
 *
 * file:// (PC 단독판)에서는 GLB 를 못 받는다(브라우저가 막는다). 실패해도 조용히
 * 넘어가므로 단독판은 도형인 채로 그대로 돈다.
 */
(function (global) {
  'use strict';

  var T = null;
  function three() { if (!T) { T = global.THREE || null; } return T; }

  var NAT = 'assets/models/nature/';

  /** 표 — 키는 사냥터 mood 를 그대로 썼다(`data-side.js` 의 stage.mood) */
  var DEFAULTS = {
    'tree:near': [NAT + 'CommonTree_1.glb', NAT + 'CommonTree_2.glb', NAT + 'CommonTree_3.glb'],
    'tree:far': [NAT + 'PineTree_1.glb', NAT + 'PineTree_2.glb'],
    'rock': [NAT + 'Rock_1.glb', NAT + 'Rock_2.glb', NAT + 'Rock_3.glb'],
    'hill': [NAT + 'Mountain_1.glb', NAT + 'Mountain_2.glb']
  };

  var REG = {};
  function restore() {
    var k;
    REG = {};
    for (k in DEFAULTS) { if (DEFAULTS.hasOwnProperty(k)) { REG[k] = DEFAULTS[k]; } }
    return REG;
  }
  restore();

  function register(key, url) {
    if (!key) { return REG; }
    if (url) { REG[key] = url; } else { delete REG[key]; }
    return REG;
  }

  function clear() { REG = {}; return REG; }

  /** 표에서 첫 히트 — 없으면 null. three 없이도 돈다 */
  function lookup(kind) { return REG[kind] ? { key: kind, url: REG[kind] } : null; }

  /** 표의 한 줄이 여럿이면 그중 하나를 고른다 — seed 로 늘 같은 것 */
  function oneOf(list, seed) {
    if (!list) { return null; }
    if (typeof list === 'string') { return list; }
    if (!list.length) { return null; }
    var s = String(seed || ''), i, h = 0;
    for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return list[h % list.length];
  }

  /* ── 여기서부터 three 가 필요하다 ─────────────────────── */

  var loaderInst = null;
  function gltfLoader() {
    var t = three();
    if (!t || !t.GLTFLoader) { return null; }
    if (!loaderInst) { loaderInst = new t.GLTFLoader(); }
    return loaderInst;
  }

  /**
   * 받은 그대로의 PBR 재질을 벗긴다 — Quaternius 모델은 환경맵(IBL) 없이 서면
   * 거의 새까맣게 보인다. 빛깔만 남기고 Lambert 로 바꾼다(다른 판에서 실제로
   * 겪은 문제, 같은 고침).
   */
  function delam(root) {
    var t = three();
    root.traverse(function (o) {
      if (!o.isMesh || !o.material) { return; }
      var one = Array.isArray(o.material) ? o.material : [o.material];
      var out = one.map(function (m) {
        if (!m || (!m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial)) { return m; }
        return new t.MeshLambertMaterial({
          color: m.color ? m.color.clone() : new t.Color(0xffffff),
          map: m.map || null, transparent: !!m.transparent, opacity: m.opacity,
          alphaTest: m.alphaTest || 0, side: m.side
        });
      });
      o.material = Array.isArray(o.material) ? out : out[0];
    });
    root.traverse(function (o) {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
  }

  var cache = {};   // url → { state: 'load'|'ok'|'fail', gltf, waiting: [cb] }
  var built = 0, broke = '';

  function flush(c, arg) {
    var w = c.waiting; c.waiting = [];
    for (var i = 0; i < w.length; i++) { w[i](arg); }
  }

  /** GLB 하나를 받아 캐시한다 — 같은 url 을 몇이 동시에 물어도 한 번만 받는다 */
  function acquire(url, done) {
    var c = cache[url];
    if (c && c.state === 'ok') { done(c); return; }
    if (c && c.state === 'fail') { done(null); return; }
    if (c) { c.waiting.push(done); return; }

    var ld = gltfLoader();
    if (!ld) { cache[url] = { state: 'fail', waiting: [] }; done(null); return; }
    c = cache[url] = { state: 'load', waiting: [done] };
    ld.load(url, function (gltf) {
      c.state = 'ok';
      c.gltf = gltf;
      delam(gltf.scene);
      flush(c, c);
    }, undefined, function () {
      c.state = 'fail';
      flush(c, null);
    });
  }

  /** 뼈대가 없는 소품이라 그냥 복제한다(나무·바위는 뼈대가 없다) */
  function cloneScene(gltf) { return gltf.scene.clone(true); }

  /** 키 1 로 눕혀 담는다 — `mul` 로 실제 크기를 준다(사물마다 원하는 높이가 다르다) */
  function normalize(obj, mul) {
    var t = three();
    obj.updateMatrixWorld(true);
    var b = new t.Box3().setFromObject(obj);
    var h = (b.max.y - b.min.y) || 1;
    var s = (mul || 1) / h;
    var wrap = new t.Group();
    obj.scale.setScalar(s);
    obj.position.set(-((b.min.x + b.max.x) / 2) * s, -b.min.y * s, -((b.min.z + b.max.z) / 2) * s);
    wrap.add(obj);
    return wrap;
  }

  /**
   * 지형지물 하나 — 표에서 골라 그대로 받아 키 `heightPx` 로 눕힌다 (비동기, 콜백 방식).
   * 실패하거나 three/GLTFLoader 가 없거나 표에 없으면 cb(null) 로 부른다 —
   * 부르는 쪽(side-view3d.js)은 그러면 지금처럼 도형을 그린다.
   *
   * @param kind      'tree:near' | 'tree:far' | 'rock' | 'hill'
   * @param seed      같은 자리는 늘 같은 모델이 걸리게 하는 값(자리 좌표 등)
   * @param heightPx  다 세운 뒤 세로 높이(이 판의 좌표는 픽셀이다)
   */
  function build(kind, seed, heightPx, cb) {
    var hit = lookup(kind);
    if (!hit) { cb(null); return; }
    var url = oneOf(hit.url, seed);
    if (!url || typeof url !== 'string') { cb(null); return; }
    acquire(url, function (c) {
      if (!c || !c.gltf) { cb(null); return; }
      built++;
      var model;
      try {
        model = normalize(cloneScene(c.gltf), heightPx);
      } catch (e) {
        broke = (e && e.message) ? e.message : (kind + ' 조립 실패');
        cb(null);
        return;
      }
      cb(model);
    });
  }

  global.DG = global.DG || {};
  global.DG.asset3d = {
    register: register,
    restore: restore,
    clear: clear,
    lookup: lookup,
    oneOf: oneOf,
    build: build,
    three: three,
    REG: function () { return REG; },
    stats: function () { return { built: built, broke: broke }; }
  };
})(typeof window !== 'undefined' ? window : this);
