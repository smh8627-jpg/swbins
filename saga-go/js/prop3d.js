/**
 * 소품 에셋 — 나무 · 바위 · 덤불을 **진짜 모델**로 세운다 (새 PLAN STEP 4~5)
 * ---------------------------------------------------------------
 * `asset3d.js` 는 **배우**(사람 · 짐승 · 건물)를 GLB 로 세우는 자리다.
 * 여기는 그 옆자리 — **소품**(나무 · 바위 · 풀 · 덤불)을 맡는다. 둘을 가른 까닭은
 * 세우는 방식이 아예 다르기 때문이다:
 *
 *   배우   한 판에 스물 남짓. 저마다 제 뼈대로 움직인다 → `SkeletonUtils.clone`
 *   소품   한 판에 수백. 하나도 안 움직인다 → **`InstancedMesh` 로 한 덩이**
 *
 * 그래서 이 파일이 하는 일은 딱 하나다 — GLB 를 받아서
 * **`{geometry, material}` 조각들로 펴 놓는 것**. 그러면 `world3d` 의
 * 인스턴싱 창고가 여태 하던 그대로 자리만 빌려 주면 된다.
 *
 * 조각이 여럿인 까닭: 나무 한 그루는 줄기와 잎이 **다른 재질**이라 GLB 안에서도
 * 프리미티브 둘이다. 한 덩이로 못 묶으므로 조각마다 덩이를 하나씩 두고
 * **같은 행렬을 둘 다에 적어** 넣는다. 화면에서는 한 그루로 보인다.
 *
 * ── 계절 ────────────────────────────────────────────────
 *
 * Quaternius 나무는 `CommonTree_1` · `CommonTree_Autumn_1` · `CommonTree_Snow_1`
 * 처럼 **철마다 한 벌씩** 있다. `season.js` 가 이미 잎 색을 바꾸고 있었으니
 * 여기서는 **모델 자체를 갈아 끼운다** — 가을이면 단풍든 나무가, 겨울이면 눈 얹힌
 * 나무가 선다. 소품 캐시 키에 계절이 들어 있어(`world3d`) 저절로 다시 세워진다.
 *
 * ── 늦게 오는 것 ─────────────────────────────────────────
 *
 * GLB 는 받는 데 시간이 걸린다. 그동안 화면은 **여태 쓰던 도형**으로 선다
 * (원뿔 나무 · 공 바위). 다 받으면 `world3d.refreshProps()` 를 한 번 불러
 * 세워 둔 것을 지우고 다시 세운다 — 그 한 번에 나무가 바뀐다.
 *
 * 못 받으면(파일 없음 · `file://` 단독판 · 구형 기기) **조용히 도형으로 남는다.**
 * 그래서 PC 단독판도 그대로 돈다 — 실패를 시끄럽게 알리지 않는다.
 *
 * 값을 내는 함수(`pick`·`urlOf`)는 **three 없이도 돈다** — 자가진단이 그것만 본다.
 */
(function (global) {
  'use strict';

  function core() { return global.DG.core; }
  var T = null;
  function three() { if (!T) { T = global.THREE || null; } return T; }

  /** 소품을 GLB 로 세울까 — 0 이면 표에 적혀 있어도 도형으로 간다 (되돌림용) */
  function ON() {
    if (!core().tuned('prop3d.on', 1)) { return false; }
    /* **등급이 LOW 면 안 쓴다.** 진짜 나무는 도형 나무보다 삼각형이 백 배다 —
       느린 기기에서 가장 먼저 뺄 것이 이것이다 (물·그늘과 같은 규칙) */
    var P = global.DG.perf;
    var tier = P && P.tier ? P.tier().key : 'HIGH';
    return tier !== 'LOW';
  }

  /** 이 소품이 그림자를 지나 — 나무와 집만 진다. 풀·바위까지 지면 그림자 지도가 넘친다 */
  function casts(name) {
    return name === 'tree' || name === 'pine' || name === 'house' || name === 'tower';
  }

  /**
   * 이 소품의 키를 얼마나 보태나.
   * 도형으로 세우던 때 `p.h` 는 **벽 높이**였고 지붕은 그 위에 따로 얹혔다.
   * GLB 는 지붕까지가 키 1 이라 그대로 곱하면 집이 납작해진다 — 그만큼 보탠다.
   */
  function heightMul(name) {
    /* 집은 한 번 더 키운다. 도형이던 때 집은 **넓적한 상자**(폭 14m 까지)였는데
       GLB 는 키만 보고 고르게 늘이므로, 같은 `p.h` 로 세우면 마을이 훌쩍 작아
       보인다 — 옛 화면과 나란히 찍어 보고 알았다 */
    if (name === 'house') { return core().tuned('prop3d.houseScale', 1.8); }
    if (name === 'tower') { return core().tuned('prop3d.towerScale', 1.4); }
    return 1;
  }

  /** 집을 진짜 모델로 세울까 — 따로 뗀 손잡이다(마을 결이 바뀌므로 되돌리기 쉽게) */
  function houseOn() { return core().tuned('prop3d.house', 1) ? true : false; }
  /** 한 종류에 몇 가지 모양까지 섞나 (많을수록 덜 되풀이되지만 더 받는다) */
  function VARIANTS() { return Math.max(1, Math.round(core().tuned('prop3d.variants', 3))); }

  /* ── 표 ───────────────────────────────────────────────
   * 소품 이름 → 철마다의 파일 목록. 철이 없으면 `all` 을 쓴다.
   * 자리 하나에 여럿이면 **좌표 해시로 골라** 늘 같은 자리에 같은 모양이 선다.
   */
  var BASE = 'assets/models/nature/';
  var BLD = 'assets/models/buildings/';
  var REG = {
    tree: {
      all:    [BASE + 'CommonTree_1.glb', BASE + 'CommonTree_2.glb', BASE + 'CommonTree_3.glb'],
      autumn: [BASE + 'CommonTree_Autumn_1.glb', BASE + 'CommonTree_Autumn_2.glb'],
      winter: [BASE + 'CommonTree_Snow_1.glb', BASE + 'CommonTree_Snow_2.glb']
    },
    pine: {
      all: [BASE + 'PineTree_1.glb', BASE + 'PineTree_2.glb']
    },
    rock: {
      all: [BASE + 'Rock_1.glb', BASE + 'Rock_2.glb', BASE + 'Rock_3.glb']
    },
    grass: {
      all: [BASE + 'Grass_2.glb', BASE + 'Bush_1.glb', BASE + 'Bush_2.glb']
    },
    /* 마을 — 유럽 중세풍이다. 이 판은 삼국지·한국사인데도 얹은 까닭은
       사용자가 **품질을 먼저** 골랐기 때문이다(2026-08-28). 되돌리려면
       손잡이 `prop3d.house` 를 0 으로 내리면 기와지붕 코드로 돌아간다 */
    house: {
      all: [BLD + 'House_1.glb', BLD + 'House_2.glb', BLD + 'House_3.glb',
            BLD + 'House_4.glb', BLD + 'Blacksmith.glb']
    },
    /* 마을의 높은 집. **`Inn.glb` 를 여기서 뺐다** — 그 여관이 이제
       `asset3d` 의 **역참**이다(2026-08-28). 마을에도 같은 여관이 서면
       들판에서 여관 모양을 보고 역참인 줄 알고 걸어갔다가 그냥 남의 집이 된다.
       역참은 들판에 홀로 서고 깃발이 있다 — 그 규칙을 깨끗하게 두려고 뺐다.
       대신 남은 탑 하나(`LargeSquareTowerBricks`)를 넣어 가짓수를 지켰다 */
    tower: {
      all: [BLD + 'Tower.glb', BLD + 'PointyTower.glb', BLD + 'LargeTower.glb',
            BLD + 'Watchtower.glb', BLD + 'LargeSquareTowerBricks.glb']
    }
  };

  function register(name, season, urls) {
    if (!name) { return REG; }
    if (!urls) { delete REG[name]; return REG; }
    REG[name] = REG[name] || {};
    REG[name][season || 'all'] = [].concat(urls);
    return REG;
  }

  /* ── 값을 내는 함수 — three 없이도 돈다 ───────────────── */

  /** 지금 철 — `season.js` 가 없으면 늘 `all` 로 간다 */
  function seasonKey() {
    var S = global.DG.season;
    if (!S || !S.now) { return 'all'; }
    try { return S.now().key || 'all'; } catch (e) { return 'all'; }
  }

  /**
   * 이 소품·이 자리에 어느 파일이 서나 — 없으면 null. **순수 함수다.**
   *
   * @param name 'tree' | 'pine' | 'rock' | 'grass'
   * @param gx   격자 x (같은 자리면 늘 같은 모양이 서게 하는 씨앗)
   * @param gy   격자 y
   * @param sk   철을 못박고 싶을 때 (안 주면 지금 철)
   */
  function pick(name, gx, gy, sk) {
    if (!ON()) { return null; }
    if ((name === 'house' || name === 'tower') && !houseOn()) { return null; }
    var e = REG[name];
    if (!e) { return null; }
    var key = sk || seasonKey();
    var list = e[key] && e[key].length ? e[key] : e.all;
    if (!list || !list.length) { return null; }
    var n = Math.min(list.length, VARIANTS());
    var h = core().hash2(gx * 17 + 5, gy * 29 + 3) * 2;   // hash2 는 0~0.5 라 두 배로
    var i = Math.min(n - 1, Math.floor(h * n));
    return list[i];
  }

  /** 이 소품이 GLB 로 설 수 있나 — 파일이 이미 와 있어야 참이다 */
  function ready(name, gx, gy, sk) {
    var url = pick(name, gx, gy, sk);
    if (!url) { return false; }
    var c = cache[url];
    return !!(c && c.state === 'ok');
  }

  /** 표에 적힌 파일을 전부 (순수 — 미리 받기와 진단이 쓴다) */
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

  /* ── 여기서부터 three 가 필요하다 ─────────────────────── */

  var cache = {};        // { url: {state, parts:[{geometry, material}]} }
  var pending = 0, arrived = 0, refreshTimer = null;

  function loader() {
    var t = three();
    if (!t || !t.GLTFLoader) { return null; }
    if (!loader.it) { loader.it = new t.GLTFLoader(); }
    return loader.it;
  }

  /**
   * GLB 한 덩이 → **키 1 로 눕힌 조각들**.
   *
   * 세 가지를 한꺼번에 한다:
   *   1 부모들의 변환을 도형에 **구워 넣는다**(`matrixWorld`) — 인스턴스는
   *     행렬을 하나만 받으므로 안에 계층이 남아 있으면 자리가 어긋난다
   *   2 **키가 1** 이 되게 줄이고 **밑동을 0** 에 맞춘다 — 부르는 쪽이 높이만
   *     곱하면 되게. `asset3d.fit` 이 배우에게 하는 것과 같은 규칙이다
   *   3 재질은 GLB 것을 그대로 쓴다. 다만 **그림자를 지게** 켠다
   */
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
      /* 키 1 · 밑동 0 · 가운데 정렬 */
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
   * GLB 재질 → **이 판이 쓰는 Lambert 로 갈아 끼운다.** 빛깔만 가져온다.
   *
   * 왜 그대로 안 쓰나. 두 가지다.
   *
   * 1. **셰이더가 너무 는다.** GLB 재질은 `MeshStandardMaterial`(PBR)이고
   *    모델마다 제 것을 들고 온다 — 나무 열다섯 벌이면 서른 벌이다. 서른 벌이
   *    저마다 프로그램을 컴파일하느라 화면이 통째로 멎었다. 실제로 밟았다.
   *    빛깔로 묶으면 예닐곱 벌로 준다(같은 초록·같은 갈색이 많다)
   * 2. **혼자 다른 빛을 받는다.** 옆의 집·바위는 Lambert 인데 나무만 PBR 이면
   *    같은 해 아래서 다른 밝기로 선다 — 물에서 밟은 것과 같은 자리다
   *
   * 그림이 눈에 띄게 나빠지지 않는다. 이 모델들은 텍스처가 없고 **면마다 한 색**이라
   * PBR 로 얻는 것이 거의 없다.
   */
  function lambertOf(src) {
    var t = three();
    if (Array.isArray(src)) { src = src[0]; }
    var hex = src && src.color ? src.color.getHex() : 0x8a8a8a;
    var key = String(hex);
    if (matCache[key]) { return matCache[key]; }
    matCache[key] = new t.MeshLambertMaterial({ color: new t.Color(hex) });
    return matCache[key];
  }

  /** 다 받으면 세워 둔 소품을 한 번 갈아 준다 — 여러 개가 몰려 오므로 뭉쳐서 */
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
      /* 없는 파일 · file:// 막힘 · 깨진 모델 — 전부 같은 결말. 도형으로 남는다 */
      pending--;
      c.state = 'fail';
    });
    return c;
  }

  /**
   * 이 소품의 조각들 — 아직 안 왔으면 **받기 시작하고 null 을 준다**.
   * 부르는 쪽(`world3d`)은 null 을 받으면 그냥 여태 쓰던 도형으로 세운다.
   */
  function parts(name, gx, gy, sk) {
    if (!three()) { return null; }
    var url = pick(name, gx, gy, sk);
    if (!url) { return null; }
    var c = acquire(url);
    return c.state === 'ok' ? { url: url, parts: c.parts } : null;
  }

  /** 표에 적힌 것을 미리 받아 둔다 — 첫 화면에서 도형이 나무로 바뀌는 티를 줄인다 */
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
      ok: ok, fail: fail, loading: load, arrived: arrived,
      mats: Object.keys(matCache).length
    };
  }

  global.DG = global.DG || {};
  global.DG.prop3d = {
    REG: REG, register: register,
    /* 값을 내는 함수 — three 없이도 돈다 (자가진단이 이것만 따로 본다) */
    pick: pick, urls: urls, seasonKey: seasonKey, ready: ready, casts: casts,
    houseOn: houseOn, heightMul: heightMul,
    /* 그림 층 */
    parts: parts, preload: preload, stats: stats,
    /** 진단이 제 뒤를 치울 때 */
    reset: function () { cache = {}; matCache = {}; arrived = 0; pending = 0; }
  };
})(window);
