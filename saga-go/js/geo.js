/**
 * 실제 지형 — OpenStreetMap 데이터로 terrainAt() 을 채운다
 * ---------------------------------------------------------------
 * `land.js` 가 원점 둘레 1km 를 손으로 그렸다면, 이 파일은 **그 밖의 세상**을
 * 좌표 해시(`world.js`의 무작위 숲·산·물) 대신 **실제 지형**으로 채운다.
 * 계약은 land.js 와 똑같다 — `terrainAt(tx,ty)` 가 모르면 null 을 내서 다음
 * 레이어(좌표 해시)가 답하게 둔다.
 *
 *   구역(region)   1km 정사각 — 한 번에 이만큼만 Overpass 에 묻고 캐시한다
 *   classify()     Overpass 응답(요소 배열)을 48m 격자 분류로 바꾸는
 *                  **순수 함수** — 네트워크 없이도 돈다(자가진단이 이것만 본다)
 *   래스터화       면(숲·농지·시가지·물 폴리곤)은 격자 중심이 안이면 칠하고,
 *                  선(도로·강)은 지나는 격자를 칠한다
 *
 * **그리는 데만 쓴다** — land.js 와 같은 원칙. 스폰·거리·조우는 이 값을
 * 안 본다. 요청이 실패하거나(오프라인 등) 아직 안 왔으면 그 구역은 계속
 * null 을 내고 `world.js` 의 좌표 해시가 예전처럼 채운다 — 이 판은
 * "오프라인이 기본"이다(`js/net.js` 참고), 이 레이어가 죽어도 걷는 데
 * 아무 지장이 없다.
 *
 * 손잡이 `geo.on` 을 0 으로 두면 통째로 잠들고 예전 해시로 돌아간다.
 *
 * 2026-09-04 감사(`world3d.js` 819행 부근)에서 "실제 지도 사진을 3D 바닥에
 * 그대로 깔면 어색하다"고 밝혀져 그 텍스처는 껐다. 이 파일은 사진을
 * 되살리는 게 아니라 **분류 값의 출처**만 해시에서 실제 지형으로 바꾼다 —
 * 그리는 쪽(`terrainTexture`·미니맵 틴트)은 그대로다.
 */
(function (global) {
  'use strict';

  function core() { return global.DG.core; }
  function world() { return global.DG.world; }

  var GRID = 48;                 // land.js 와 같은 격자 한 칸(m)
  var REGION_M = 1000;           // 한 번에 묻는 구역 한 변(m)
  var MIN_GAP_MS = 3000;         // Overpass 공개 서버 예의상 요청 사이 최소 간격
                                  // (2026-09-05 — 1.5초로 처음 열어 뒀다가 실제로
                                  //  429 를 받았다. 공개 서버라 더 넉넉하게 둔다)
  var TIMEOUT_MS = 20000;
  var CACHE_KEY = 'deungyong-go/geo-cache/v1';
  var MAX_REGIONS = 60;          // localStorage 를 무한히 불리지 않는다
  var MAX_FAIL_STREAK = 4;       // 이만큼 연달아 실패하면 한동안 쉰다
  var BACKOFF_MS = 60000;

  var ENDPOINT = 'https://overpass-api.de/api/interpreter';

  var cache = null;              // { regionKey: { cells:{"tx,ty":kind}, places:[...], at } }
  var pending = {};               // regionKey → true (큐에 있거나 요청 중)
  var queue = [];
  var inFlight = false;
  var lastFetchAt = 0;
  var failStreak = 0;
  var pausedUntil = 0;
  var stats = { ok: 0, fail: 0 };
  var fetchImpl = (typeof global.fetch === 'function') ? global.fetch.bind(global) : null;

  function on() { return core().tuned('geo.on', 1) ? true : false; }

  /* ── 캐시 ─────────────────────────────────────────────── */

  function loadCache() {
    if (cache) { return cache; }
    cache = {};
    try {
      var raw = global.localStorage && global.localStorage.getItem(CACHE_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && typeof o === 'object') { cache = o; }
      }
    } catch (e) { /* 깨져 있으면 빈 캐시로 다시 쌓는다 */ }
    return cache;
  }

  function saveCache() {
    try {
      var keys = Object.keys(cache);
      if (keys.length > MAX_REGIONS) {
        keys.sort(function (a, b) { return (cache[a].at || 0) - (cache[b].at || 0); });
        while (keys.length > MAX_REGIONS) { delete cache[keys.shift()]; }
      }
      if (global.localStorage) { global.localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); }
    } catch (e) { /* 저장 못 해도 이번 판(메모리 캐시)은 돈다 */ }
  }

  /** 미터 좌표 → 구역 키 (REGION_M 단위 격자) */
  function regionKeyOf(x, y) {
    return Math.floor(x / REGION_M) + ',' + Math.floor(y / REGION_M);
  }

  /** 구역 키 → 그 구역이 덮는 미터 범위 { x0,y0,x1,y1 } */
  function regionBounds(key) {
    var p = key.split(',');
    var rx = +p[0], ry = +p[1];
    return { x0: rx * REGION_M, y0: ry * REGION_M, x1: (rx + 1) * REGION_M, y1: (ry + 1) * REGION_M };
  }

  /* ── 기하 — 순수 함수 ─────────────────────────────────── */

  /** 표준 레이캐스팅 — pt 가 ring(닫힌 폴리곤, {x,y}[]) 안이면 true */
  function pointInPolygon(pt, ring) {
    var inside = false, i, j, xi, yi, xj, yj, hit;
    for (i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      xi = ring[i].x; yi = ring[i].y;
      xj = ring[j].x; yj = ring[j].y;
      hit = ((yi > pt.y) !== (yj > pt.y)) &&
        (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
      if (hit) { inside = !inside; }
    }
    return inside;
  }

  function isClosedRing(pts) {
    if (pts.length < 3) { return false; }
    var a = pts[0], b = pts[pts.length - 1];
    return Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
  }

  /* ── Overpass 태그 → 이 판의 분류 ─────────────────────────
   * 여러 갈래가 한 칸을 다퉈도(강이 시가지를 지나는 등) 실제로 더
   * "특수한" 것이 이겨야 자연스럽다. 낮은 자리가 나중에 칠해져 이긴다 —
   * town(가장 흔함, 가장 약함) → farm → forest → mount → water →
   * road(길은 무엇 위에 있어도 길로 보여야 한다, 가장 강함).
   */
  var LAYER_ORDER = ['town', 'farm', 'forest', 'mount', 'water', 'road'];

  function kindOfTags(tags) {
    if (!tags) { return null; }
    if (tags.highway) { return 'road'; }
    if (tags.natural === 'water' || /river|stream|canal/.test(tags.waterway || '')) { return 'water'; }
    if (tags.natural === 'peak' || tags.natural === 'cliff') { return 'mount'; }
    if (tags.natural === 'wood' || tags.landuse === 'forest') { return 'forest'; }
    if (/^(farmland|farmyard|orchard|vineyard)$/.test(tags.landuse || '')) { return 'farm'; }
    if (/^(residential|commercial|retail|industrial)$/.test(tags.landuse || '') || tags.building) { return 'town'; }
    return null;
  }

  /** 이름이 있으면 "가 볼 이름난 자리" 후보 — PLAN 47·48절, 젤다식 구경거리 */
  function nameOf(tags) {
    if (!tags) { return null; }
    if (tags.name && (tags.place || tags.natural === 'peak' || tags.tourism || tags.historic)) {
      return tags.name;
    }
    return null;
  }

  /**
   * Overpass `out geom` 응답의 elements 배열 → 이 구역의 { cells, places }.
   * **순수 함수** — fetch·전역 캐시에 한 칸도 안 닿는다(자가진단이 이것만 본다).
   * @param elements  [{type,tags,geometry:[{lat,lon}]} | {type:'node',tags,lat,lon}]
   * @param toWorld   (lat,lng) => {x,y} — 보통 world.latLngToWorld
   * @param bounds    이 구역의 미터 범위 { x0,y0,x1,y1 } — 격자 범위를 좁히는 데만 쓴다
   */
  function classify(elements, toWorld, bounds) {
    var cells = {}, places = [], i, k;
    var tx0 = Math.floor(bounds.x0 / GRID), tx1 = Math.floor(bounds.x1 / GRID);
    var ty0 = Math.floor(bounds.y0 / GRID), ty1 = Math.floor(bounds.y1 / GRID);

    function stampCell(tx, ty, kind) {
      if (tx < tx0 || tx > tx1 || ty < ty0 || ty > ty1) { return; }
      cells[tx + ',' + ty] = kind;
    }

    function stampPolygon(pts, kind) {
      /* **자기만의 `pi`를 쓴다** — 밖의 `i`(elements 를 도는 자리)를 빌려 쓰면
         이 함수가 부모 루프 한복판에서 불릴 때(2번째 지나감) 그 `i`를 밟고
         지나가 버려 elements 순회가 어긋난다. 실제로 밟았다 */
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, p, pi;
      for (pi = 0; pi < pts.length; pi++) {
        p = pts[pi];
        if (p.x < minX) { minX = p.x; } if (p.x > maxX) { maxX = p.x; }
        if (p.y < minY) { minY = p.y; } if (p.y > maxY) { maxY = p.y; }
      }
      var gx0 = Math.max(tx0, Math.floor(minX / GRID)), gx1 = Math.min(tx1, Math.floor(maxX / GRID));
      var gy0 = Math.max(ty0, Math.floor(minY / GRID)), gy1 = Math.min(ty1, Math.floor(maxY / GRID));
      var tx, ty, cx, cy;
      for (ty = gy0; ty <= gy1; ty++) {
        for (tx = gx0; tx <= gx1; tx++) {
          cx = tx * GRID + GRID / 2; cy = ty * GRID + GRID / 2;
          if (pointInPolygon({ x: cx, y: cy }, pts)) { stampCell(tx, ty, kind); }
        }
      }
    }

    /** 선을 따라 걸으며 지나는 격자를 칠한다 — 도로·강처럼 폭이 없는 선형 */
    function stampLine(pts, kind) {
      var seg, a, b, len, steps, s, x, y;
      for (seg = 0; seg < pts.length - 1; seg++) {
        a = pts[seg]; b = pts[seg + 1];
        len = Math.hypot(b.x - a.x, b.y - a.y);
        steps = Math.max(1, Math.ceil(len / (GRID / 2)));
        for (s = 0; s <= steps; s++) {
          x = a.x + (b.x - a.x) * (s / steps);
          y = a.y + (b.y - a.y) * (s / steps);
          stampCell(Math.floor(x / GRID), Math.floor(y / GRID), kind);
        }
      }
      if (pts.length === 1) { stampCell(Math.floor(pts[0].x / GRID), Math.floor(pts[0].y / GRID), kind); }
    }

    /** 이 요소의 좌표를 세상 미터로 — 점이면 그 자리 하나, 선·면이면 꼭짓점들 */
    function worldPts(el) {
      if (el.type === 'node') { return [toWorld(el.lat, el.lon)]; }
      if (!el.geometry || !el.geometry.length) { return []; }
      var out = [];
      for (var g = 0; g < el.geometry.length; g++) {
        if (!el.geometry[g]) { continue; }               // Overpass 는 빠진 노드에 null 을 남긴다
        out.push(toWorld(el.geometry[g].lat, el.geometry[g].lon));
      }
      return out;
    }

    /* 1번째 지나감 — **이름난 자리**는 지형 갈래(kind)가 있든 없든 다 줍는다.
       `place=village`처럼 그 자체로는 숲도 시가지도 아닌 점도 "가 볼 곳"이다 */
    for (i = 0; i < elements.length; i++) {
      var nm0 = nameOf(elements[i].tags);
      if (!nm0) { continue; }
      var npts = worldPts(elements[i]);
      if (!npts.length) { continue; }
      var mid0 = npts[Math.floor(npts.length / 2)];
      places.push({ id: 'osm:' + (elements[i].id || i), name: nm0, x: mid0.x, y: mid0.y });
    }

    /* 2번째 지나감 — 지형 칸. 층 순서대로 돌아 **나중 층이 먼저 것을 덮어써 이긴다** */
    for (k = 0; k < LAYER_ORDER.length; k++) {
      var wantKind = LAYER_ORDER[k];
      for (i = 0; i < elements.length; i++) {
        var el = elements[i];
        var kind = kindOfTags(el.tags);
        if (kind !== wantKind) { continue; }
        var pts = worldPts(el);
        if (el.type === 'node') {
          if (pts.length) { stampCell(Math.floor(pts[0].x / GRID), Math.floor(pts[0].y / GRID), kind); }
          continue;
        }
        if (pts.length < 2) { continue; }
        if (kind === 'road' || (kind === 'water' && !isClosedRing(pts))) {
          stampLine(pts, kind);
        } else if (isClosedRing(pts)) {
          stampPolygon(pts, kind);
        } else {
          stampLine(pts, kind);
        }
      }
    }

    return { cells: cells, places: places };
  }

  /* ── Overpass 쿼리 문자열(순수) ───────────────────────── */

  function overpassQL(lat0, lng0, lat1, lng1) {
    var bbox = lat0 + ',' + lng0 + ',' + lat1 + ',' + lng1;
    var body =
      'way["highway"](' + bbox + ');' +
      'way["natural"="water"](' + bbox + ');' +
      'way["waterway"~"river|stream|canal"](' + bbox + ');' +
      'way["natural"="wood"](' + bbox + ');' +
      'way["landuse"="forest"](' + bbox + ');' +
      'way["landuse"~"farmland|farmyard|orchard|vineyard"](' + bbox + ');' +
      'way["landuse"~"residential|commercial|retail|industrial"](' + bbox + ');' +
      'way["building"](' + bbox + ');' +
      'node["natural"~"peak|cliff"](' + bbox + ');' +
      'node["place"](' + bbox + ');';
    return '[out:json][timeout:20];(' + body + ');out geom;';
  }

  /* ── 네트워크 ─────────────────────────────────────────── */

  function fetchRegion(key) {
    var b = regionBounds(key);
    var W = world();
    var ll0 = W.worldToLatLng(b.x0, b.y0), ll1 = W.worldToLatLng(b.x1, b.y1);
    var lat0 = Math.min(ll0.lat, ll1.lat), lat1 = Math.max(ll0.lat, ll1.lat);
    var lng0 = Math.min(ll0.lng, ll1.lng), lng1 = Math.max(ll0.lng, ll1.lng);
    var body = 'data=' + encodeURIComponent(overpassQL(lat0, lng0, lat1, lng1));

    if (!fetchImpl) { return Promise.reject(new Error('fetch 없음')); }
    var ctrl = global.AbortController ? new global.AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) { ctrl.abort(); } }, TIMEOUT_MS);
    return fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body,
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) { throw new Error('overpass ' + r.status); }
      return r.json();
    }, function (e) { clearTimeout(timer); throw e; }).then(function (j) {
      var out = classify(j.elements || [], W.latLngToWorld, b);
      out.at = Date.now();
      return out;
    });
  }

  /* ── 큐 펌프 — 한 번에 하나씩, 최소 간격을 두고 ───────── */

  function pump() {
    if (inFlight || !queue.length) { return; }
    if (Date.now() < pausedUntil) { return; }
    var wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastFetchAt));
    setTimeout(function () {
      if (inFlight || !queue.length) { return; }
      var key = queue.shift();
      inFlight = true;
      lastFetchAt = Date.now();
      fetchRegion(key).then(function (region) {
        inFlight = false;
        failStreak = 0;
        stats.ok++;
        delete pending[key];
        loadCache()[key] = region;
        saveCache();
        pump();
      }, function () {
        inFlight = false;
        failStreak++;
        stats.fail++;
        delete pending[key];
        if (failStreak >= MAX_FAIL_STREAK) { pausedUntil = Date.now() + BACKOFF_MS; }
        pump();
      });
    }, wait);
  }

  /** 이 자리(미터)를 덮는 구역이 아직 없으면 큐에 넣는다. 몇 번을 불러도 중복 요청 없다 */
  function ensureRegion(x, y) {
    if (!on()) { return; }
    var key = regionKeyOf(x, y);
    if (loadCache()[key] || pending[key]) { return; }
    pending[key] = true;
    queue.push(key);
    pump();
  }

  /* ── 읽기 ─────────────────────────────────────────────── */

  /** land.js 와 같은 계약 — 모르면 null(다음 레이어가 답한다) */
  function terrainAt(tx, ty) {
    if (!on()) { return null; }
    var x = tx * GRID + GRID / 2, y = ty * GRID + GRID / 2;
    var key = regionKeyOf(x, y);
    var region = loadCache()[key];
    if (!region) { ensureRegion(x, y); return null; }
    var k = region.cells[tx + ',' + ty];
    return k || 'grass';           // 구역은 왔는데 아무 갈래도 안 걸리면 실제로 빈 들이다
  }

  /** 지금까지 받아 온 구역의 이름난 자리를 다 모은다 (미니맵·오버월드맵이 쓴다) */
  function places() {
    var c = loadCache(), out = [], k, i;
    for (k in c) {
      if (!Object.prototype.hasOwnProperty.call(c, k) || !c[k].places) { continue; }
      for (i = 0; i < c[k].places.length; i++) { out.push(c[k].places[i]); }
    }
    return out;
  }

  function info() {
    var c = loadCache();
    return {
      on: on(), regions: Object.keys(c).length, queued: queue.length,
      pending: Object.keys(pending).length, ok: stats.ok, fail: stats.fail,
      pausedMs: Math.max(0, pausedUntil - Date.now())
    };
  }

  global.DG = global.DG || {};
  global.DG.geo = {
    GRID: GRID, REGION_M: REGION_M, LAYER_ORDER: LAYER_ORDER,
    on: on, terrainAt: terrainAt, places: places, ensureRegion: ensureRegion,
    regionKeyOf: regionKeyOf, regionBounds: regionBounds, info: info,
    /* 순수 함수 — 자가진단이 네트워크 없이 이것만 본다 */
    classify: classify, pointInPolygon: pointInPolygon, kindOfTags: kindOfTags,
    overpassQL: overpassQL,
    /** 진단·데모가 fetch 를 흉내 낼 때 쓰는 문 */
    _setFetch: function (fn) { fetchImpl = fn; },
    /** 진단이 제 뒤를 치울 때 — localStorage 는 안 건드린다(실제 캐시는 남는다) */
    reset: function () {
      cache = null; pending = {}; queue = []; inFlight = false;
      lastFetchAt = 0; failStreak = 0; pausedUntil = 0; stats = { ok: 0, fail: 0 };
    },
    /** 진단이 localStorage 캐시까지 지울 때 */
    clearCache: function () {
      cache = {};
      try { if (global.localStorage) { global.localStorage.removeItem(CACHE_KEY); } } catch (e) { /* noop */ }
    },
    /** 진단이 fetch·펌프 없이 구역 하나를 바로 넣어 볼 때 쓰는 문 (net.js 의 _setHealth 와 같은 자리) */
    _putRegion: function (key, region) { loadCache()[key] = region; }
  };
})(window);
