/**
 * 소품 에셋 — 나무 · 바위 · 덤불을 진짜 모델로 세운다 (새 PLAN STEP 4~5)
 */
(function (global) {
  'use strict';

  function core() { return global.DG.core; }
  var T = null;
  function three() { if (!T) { T = global.THREE || null; } return T; }

  function ON() {
    if (!core().tuned('prop3d.on', 1)) { return false; }
    var P = global.DG.perf;
    var tier = P && P.tier ? P.tier().key : 'HIGH';
    return tier !== 'LOW';
  }

  function casts(name) {
    return name === 'tree' || name === 'pine' || name === 'house' || name === 'tower' ||
      name === 'peak' || name === 'shrine' || name === 'ruin' || name === 'cave' ||
      name === 'bridge';
  }

  function heightMul(name) {
    if (name === 'house') { return core().tuned('prop3d.houseScale', 1.8); }
    if (name === 'tower') { return core().tuned('prop3d.towerScale', 1.4); }
    if (name === 'cave') { return core().tuned('prop3d.caveScale', 1.6); }
    if (name === 'ruin') { return core().tuned('prop3d.ruinScale', 1.8); }
    if (name === 'shrine') { return core().tuned('prop3d.shrineScale', 1.15); }
    return 1;
  }

  function houseOn() { return core().tuned('prop3d.house', 1) ? true : false; }
  function VARIANTS() { return Math.max(1, Math.round(core().tuned('prop3d.variants', 3))); }

  var BASE = 'assets/models/nature/';
  var BLD = 'assets/models/buildings/';
  var PRP = 'assets/models/props/';
  var REG = {
    tree: { all: [BASE + 'CommonTree_1.glb', BASE + 'CommonTree_2.glb', BASE + 'CommonTree_3.glb'], autumn: [BASE + 'CommonTree_Autumn_1.glb', BASE + 'CommonTree_Autumn_2.glb'], winter: [BASE + 'CommonTree_Snow_1.glb', BASE + 'CommonTree_Snow_2.glb'] },
    pine: { all: [BASE + 'PineTree_1.glb', BASE + 'PineTree_2.glb'] },
    rock: { all: [BASE + 'Rock_1.glb', BASE + 'Rock_2.glb', BASE + 'Rock_3.glb'] },
    grass: { all: [BASE + 'Grass_2.glb', BASE + 'Bush_1.glb', BASE + 'Bush_2.glb'] },
    house: { all: [BLD + 'House_1.glb', BLD + 'House_2.glb', BLD + 'House_3.glb', BLD + 'House_4.glb', BLD + 'Blacksmith.glb'] },
    tower: { all: [BLD + 'Tower.glb', BLD + 'PointyTower.glb', BLD + 'LargeTower.glb', BLD + 'Watchtower.glb', BLD + 'LargeSquareTowerBricks.glb'] },
    peak: { all: [BASE + 'Mountain_1.glb', BASE + 'Mountain_2.glb'] },
    lamp: { all: [PRP + 'WoodenTorch.glb'] },
    shrine: { all: [PRP + 'Gazebo.glb'] },
    cave: { all: [PRP + 'Mine.glb'] },
    ruin: { all: [PRP + 'Arch.glb'] },
    bridge: { all: [PRP + 'Bridge.glb'] },
    rice: { all: [PRP + 'Rice_4.glb'] },
    well: { all: [BLD + 'Well.glb'] },
    market: { all: [BLD + 'MarketStand_1.glb'] },
  };

  function register(name, season, urls) {
    if (!name) { return REG; }
    if (!urls) { delete REG[name]; return REG; }
    REG[name] = REG[name] || {};
    REG[name][season || 'all'] = [].concat(urls);
    return REG;
  }

  function seasonKey() {
    var S = global.DG.season;
    if (!S || !S.now) { return 'all'; }
    try { return S.now().key || 'all'; } catch (e) { return 'all'; }
  }

  function pick(name, gx, gy, sk) {
    if (!ON()) { return null; }
    if ((name === 'house' || name === 'tower') && !houseOn()) { return null; }
    var e = REG[name];
    if (!e) { return null; }
    var key = sk || seasonKey();
    var list = e[key] && e[key].length ? e[key] : e.all;
    if (!list || !list.length) { return null; }
    var n = Math.min(list.length, VARIANTS());
    var h = core().hash2(gx * 17 + 5, gy * 29 + 3) * 2;
    var i = Math.min(n - 1, Math.floor(h * n));
    return list[i];
  }

  function ready(name, gx, gy, sk) {
    var url = pick(name, gx, gy, sk);
    if (!url) { return false; }
    var c = cache[url];
    return !!(c && c.state === 'ok');
  }

  function urls() {
    var out = [], k, s, i;
    for (k in REG) {
      if (!REG.hasOwnProperty(k)) { continue; }
      for (s in REG[k]) {
        if (!REG[k].hasOwnProperty(s)) { continue; }
        for (i = 0; i < REG[k][s].length; i++) {
          if (out.indexOf(REG[k][s][i]) < 0) { out.push(REG[k][s][i]); }
        }
      }
    }
    return out;
  }

  var cache = {};
  var pending = 0, arrived = 0, refreshTimer = null;

  function loader() {
    var t = three();
    if (!t || !t.GLTFLoader) { return null; }
    if (!loader.it) { loader.it = new t.GLTFLoader(); }
    return loader.it;
  }

  function partsOf(gltf) {
    var t = three();
    var raw = [];
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(function (o) {
      if (o.isMesh && o.geometry) { raw.push(o); }
    });
    if (!raw.length) { return null; }

    var box = new t.Box3().setFromObject(gltf.scene);
    var hgt = Math.max(1e-4, box.max.y - box.min.y);
    var s = 1 / hgt;
    var cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;

    var m4 = new t.Matrix4();
    var out = [], i;
    for (i = 0; i < raw.length; i++) {
      var g = raw[i].geometry.clone();
      g.applyMatrix4(raw[i].matrixWorld);
      m4.makeTranslation(-cx, -box.min.y, -cz);
      g.applyMatrix4(m4);
      m4.makeScale(s, s, s);
      g.applyMatrix4(m4);
      g.computeBoundingSphere();
      out.push({ geometry: g, material: lambertOf(raw[i].material) });
    }
    return out;
  }

  var matCache = {};

  /**
   * [SAGA 리뉴얼 패치]
   * 환경 에셋(나무, 집, 바위 등)의 원본 PBR 재질을 유지합니다.
   */
  function lambertOf(src) {
    if (Array.isArray(src)) { return src[0]; }
    return src;
  }

  function scheduleRefresh() {
    if (refreshTimer) { return; }
    refreshTimer = global.setTimeout(function () {
      refreshTimer = null;
      var W3 = global.DG.world3d;
      if (W3 && W3.refreshProps) { W3.refreshProps(); }
    }, 120);
  }

  function acquire(url) {
    if (cache[url]) { return cache[url]; }
    var ld = loader();
    if (!ld) { cache[url] = { state: 'fail' }; return cache[url]; }
    var c = cache[url] = { state: 'load' };
    pending++;
    ld.load(url, function (gltf) {
      pending--;
      try {
        var ps = partsOf(gltf);
        if (!ps) { c.state = 'fail'; return; }
        c.state = 'ok'; c.parts = ps; arrived++;
        scheduleRefresh();
      } catch (e) { c.state = 'fail'; }
    }, null, function () {
      pending--;
      c.state = 'fail';
    });
    return c;
  }

  function parts(name, gx, gy, sk) {
    if (!three()) { return null; }
    var url = pick(name, gx, gy, sk);
    if (!url) { return null; }
    var c = acquire(url);
    return c.state === 'ok' ? { url: url, parts: c.parts } : null;
  }

  function preload() {
    if (!three() || !ON()) { return 0; }
    var list = urls(), i, n = 0;
    for (i = 0; i < list.length; i++) { acquire(list[i]); n++; }
    return n;
  }

  function stats() {
    var ok = 0, fail = 0, load = 0, k;
    for (k in cache) {
      if (!cache.hasOwnProperty(k)) { continue; }
      if (cache[k].state === 'ok') { ok++; }
      else if (cache[k].state === 'fail') { fail++; }
      else { load++; }
    }
    return {
      on: ON(), season: seasonKey(), listed: urls().length,
      ok: ok, fail: fail, loading: load, arrived: arrived, mats: Object.keys(matCache).length
    };
  }

  global.DG = global.DG || {};
  global.DG.prop3d = {
    REG: REG, register: register, pick: pick, urls: urls, seasonKey: seasonKey, ready: ready, casts: casts, houseOn: houseOn, heightMul: heightMul,
    parts: parts, preload: preload, stats: stats, reset: function () { cache = {}; matCache = {}; arrived = 0; pending = 0; }
  };
})(window);