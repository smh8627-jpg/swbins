/**
 * 지역(地域) — 원신식 지역 지도 (PLAN §5 ⑩, 2026-09-24 사용자 선택 "맵형태도")
 * ---------------------------------------------------------------
 * 손그림 땅 밖은 노이즈 들판이 끝없이 같았다. 세상을 **1.2km 지터 격자 보로노이**로
 * 나눠 지역마다 풍경을 준다.
 *
 *   고향 들녘   원점 지역 — 옛 지형 비율 그대로(회귀 없음), 랜드마크 대신 고향 마을
 *   푸른 벌판 · 대숲 골짜기 · 붉은 협곡 · 안개 늪 · 옛 성터 고원
 *
 * 바이옴이 바꾸는 것: 노이즈 지형 문턱(물·산·숲·마을 비율 — `world.terrainAt`),
 * 기복 세기(`relief3d`), 들판 적 무리 꼴(`field-combat` ⑨). 손으로 그린 땅과 실제
 * GPS 지형(OSM)은 그대로다 — 그쪽이 먼저 답한다.
 *
 * 지역 한가운데 **랜드마크**(탑)가 서고 금빛 기둥이 멀리서 보인다. 25m 안에 가면
 * 지역 발견 + **순간이동 지점**이 열린다 — 전체 지도(M)에서 눌러 건너뛴다(키보드
 * 모드만, 실제 GPS 로 걷는 중엔 안 된다). 지역 경계를 넘으면 이름 띠가 뜬다.
 *
 * 판정 층(`cellAt`·`regionAt`·`bandAt`·`reliefAt`·`biomeAt`·`landmarks`)은 순수
 * 함수다. 세이브는 `save.regions = { 지역키: 발견 시각 }` 하나(읽는 쪽 기본값).
 */
(function (global) {
  'use strict';

  function core() { return global.DG.core; }
  function K(key, def) { return core().tuned('biome.' + key, def); }
  function on() { return K('on', 1) ? true : false; }

  var SIZE = 1200;          // 지역 격자(m)
  var BLEND = 260;          // 경계에서 섞이는 폭(m)
  var LM_CLEAR = 34;        // 랜드마크 둘레는 들로 비운다(물 위에 탑이 서지 않게)
  var FIND_R = 25;          // 이만큼 다가가면 발견

  /* share = [물, 산, 숲, 마을] %, 나머지가 들. 고향은 world.js 옛 비율 그대로 */
  var BIOMES = {
    home:   { key: 'home',   name: '고향 들녘',   noun: '들녘', desc: '숲과 마을이 뒤섞인 첫 땅',     share: [14, 18, 36, 12], relief: 1.0,  color: '#9bc46f' },
    plain:  { key: 'plain',  name: '푸른 벌판',   noun: '벌판', desc: '바람이 먼저 닿는 너른 들',     share: [8, 8, 22, 12],   relief: 0.75, color: '#c3dc6a', themes: [0, 3, 4], elites: [2], boss: 0.05 },
    bamboo: { key: 'bamboo', name: '대숲 골짜기', noun: '대숲', desc: '하늘을 가린 짙은 숲',          share: [10, 14, 52, 10], relief: 1.15, color: '#5ea85a', themes: [1, 0, 4], elites: [0], boss: 0.04 },
    canyon: { key: 'canyon', name: '붉은 협곡',   noun: '협곡', desc: '불도깨비가 사는 바위 골',      share: [5, 46, 12, 7],   relief: 1.9,  color: '#e0824e', themes: [1, 4, 5], elites: [0], boss: 0.09 },
    marsh:  { key: 'marsh',  name: '안개 늪',     noun: '늪',   desc: '물두꺼비 울음이 번지는 물가',  share: [34, 4, 30, 8],   relief: 0.5,  color: '#5fb3b3', themes: [2, 5], elites: [1], boss: 0.04 },
    ruins:  { key: 'ruins',  name: '옛 성터 고원', noun: '고원', desc: '무너진 성벽 위로 번개가 친다', share: [6, 26, 14, 20],  relief: 1.4,  color: '#b3a3dc', themes: [3, 4, 5], elites: [2], boss: 0.1 }
  };
  var PICK = ['plain', 'bamboo', 'canyon', 'marsh', 'ruins'];
  var PREFIX = {
    plain: ['청풍', '황금', '너른', '봄빛', '흰구름', '종달새'],
    bamboo: ['밤이슬', '천년', '속삭이는', '푸른바람', '학이 앉은', '깊은'],
    canyon: ['화염', '노을', '적사', '불꽃바위', '마른', '용이 긁은'],
    marsh: ['달그림자', '갈대', '잠긴', '물안개', '버들', '두꺼비'],
    ruins: ['옛 왕의', '무너진', '번개', '잊힌', '돌거인', '바람 우는']
  };

  /* 노이즈 누적 분포 → 문턱(world.js 가 400만 표본으로 잰 분위수에 끝점만 더했다) */
  var CDF = [[0, 0], [0.14, 0.1614], [0.32, 0.2106], [0.68, 0.2905], [0.80, 0.3211], [1.0, 0.5]];
  function invCdf(q) {
    for (var i = 1; i < CDF.length; i++) {
      if (q <= CDF[i][0]) {
        var a = CDF[i - 1], b = CDF[i], t = (q - a[0]) / ((b[0] - a[0]) || 1);
        return a[1] + (b[1] - a[1]) * t;
      }
    }
    return 0.5;
  }
  function bandOf(B) {
    if (B._band) { return B._band; }
    var s = B.share, c = 0, out = [];
    for (var i = 0; i < 4; i++) { c += s[i] / 100; out.push(invCdf(c)); }
    B._band = { water: out[0], mount: out[1], forest: out[2], town: out[3] };
    return B._band;
  }

  function h3(a, b, s) {
    var h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  var cellCache = {}, cellCount = 0;
  /** 격자 한 칸 = 지역 하나. 가운데·바이옴·이름이 칸 좌표만으로 정해진다 */
  function cellAt(i, j) {
    var k = i + '_' + j;
    var c = cellCache[k];
    if (c) { return c; }
    var home = i === 0 && j === 0;
    var bk = home ? 'home' : PICK[Math.floor(h3(i, j, 3) * PICK.length) % PICK.length];
    var B = BIOMES[bk];
    var pre = home ? null : PREFIX[bk][Math.floor(h3(i, j, 5) * 6) % 6];
    c = {
      key: k, i: i, j: j, biome: bk,
      x: (i + (h3(i, j, 1) - 0.5) * 0.7) * SIZE,
      y: (j + (h3(i, j, 2) - 0.5) * 0.7) * SIZE,
      name: home ? B.name : pre + ' ' + B.noun
    };
    if (home) { c.x = 0; c.y = 0; }
    if (cellCount > 3000) { cellCache = {}; cellCount = 0; }
    cellCache[k] = c; cellCount++;
    return c;
  }

  /** 이 자리는 어느 지역이냐 — 가장 가까운 가운데(와 둘째) */
  function regionAt(x, y) {
    var i0 = Math.floor((x + SIZE / 2) / SIZE), j0 = Math.floor((y + SIZE / 2) / SIZE);
    var best = null, second = null, d1 = Infinity, d2 = Infinity;
    for (var dj = -1; dj <= 1; dj++) {
      for (var di = -1; di <= 1; di++) {
        var c = cellAt(i0 + di, j0 + dj);
        var d = Math.hypot(c.x - x, c.y - y);
        if (d < d1) { second = best; d2 = d1; best = c; d1 = d; }
        else if (d < d2) { second = c; d2 = d; }
      }
    }
    return { cell: best, second: second, d1: d1, d2: d2 };
  }

  function biomeAt(x, y) { return BIOMES[regionAt(x, y).cell.biome]; }

  /**
   * 섞는 비율 — 둘레 아홉 지역마다 (그 거리 − 가장 가까운 거리)가 BLEND 안이면
   * 1 에서 0 으로 준다. 둘째만 섞으면 세 지역이 만나는 자리에서 "둘째"가 바뀌는
   * 순간 값이 튄다(진단이 잡았다) — 아홉을 다 가중하면 어디서든 이어진다.
   */
  function mix(x, y) {
    var i0 = Math.floor((x + SIZE / 2) / SIZE), j0 = Math.floor((y + SIZE / 2) / SIZE);
    var cs = [], ds = [], d1 = Infinity, near = null, k;
    for (var dj = -1; dj <= 1; dj++) {
      for (var di = -1; di <= 1; di++) {
        var c = cellAt(i0 + di, j0 + dj), d = Math.hypot(c.x - x, c.y - y);
        cs.push(c); ds.push(d);
        if (d < d1) { d1 = d; near = c; }
      }
    }
    var ws = [], sum = 0;
    for (k = 0; k < cs.length; k++) {
      var t = 1 - (ds[k] - d1) / BLEND;
      var w = t > 0 ? t * t * (3 - 2 * t) : 0;
      ws.push(w); sum += w;
    }
    for (k = 0; k < ws.length; k++) { ws[k] /= sum; }
    return { cells: cs, ws: ws, near: near, d1: d1 };
  }

  /** 노이즈 지형 문턱 — 경계에서 이웃 바이옴과 섞인다(선이 안 생긴다). 순수 함수 */
  function bandAt(x, y) {
    var m = mix(x, y), o = { water: 0, mount: 0, forest: 0, town: 0 };
    for (var k = 0; k < m.cells.length; k++) {
      if (!m.ws[k]) { continue; }
      var b = bandOf(BIOMES[m.cells[k].biome]);
      o.water += b.water * m.ws[k]; o.mount += b.mount * m.ws[k];
      o.forest += b.forest * m.ws[k]; o.town += b.town * m.ws[k];
    }
    o.clear = m.d1 < LM_CLEAR && m.near.biome !== 'home';
    return o;
  }

  /** 기복 배수 — 협곡은 험하고 늪은 평평하다(화면 층) */
  function reliefAt(x, y) {
    var m = mix(x, y), r = 0;
    for (var k = 0; k < m.cells.length; k++) { r += BIOMES[m.cells[k].biome].relief * m.ws[k]; }
    return r;
  }

  /** 내 둘레 랜드마크(고향 제외) — 가까운 순 */
  function landmarks(x, y, R) {
    var out = [], rad = Math.ceil((R || 1500) / SIZE) + 1;
    var i0 = Math.floor((x + SIZE / 2) / SIZE), j0 = Math.floor((y + SIZE / 2) / SIZE);
    for (var dj = -rad; dj <= rad; dj++) {
      for (var di = -rad; di <= rad; di++) {
        var c = cellAt(i0 + di, j0 + dj);
        if (c.biome === 'home') { continue; }
        var d = Math.hypot(c.x - x, c.y - y);
        if (d <= (R || 1500)) { out.push({ key: c.key, x: c.x, y: c.y, biome: c.biome, name: c.name, dist: d }); }
      }
    }
    out.sort(function (a, b) { return a.dist - b.dist; });
    return out;
  }

  /* ══ 런타임 ═══════════════════════════════════════════════ */
  function regions() {
    var s = core().save;
    if (!s.regions || typeof s.regions !== 'object') { s.regions = {}; }
    return s.regions;
  }
  function found(key) { return key === '0_0' || !!regions()[key]; }

  /** 발견 — 처음 한 번만 보상. 순간이동 지점이 열린다 */
  function discover(key) {
    if (found(key)) { return false; }
    var c = core(), g = regions();
    g[key] = Date.now();
    var FC = global.DG.fieldCombat, parts = key.split('_');
    var cell = cellAt(+parts[0], +parts[1]);
    var tier = FC ? FC.tierAt(cell.x, cell.y) : 1;
    var gold = 60 + 30 * tier;
    c.save.player.gold = (c.save.player.gold || 0) + gold;
    c.save.dust = (c.save.dust || 0) + 2;
    if (c.gainExp) { c.gainExp(40); }
    c.log('🗼 지역 발견 — ' + cell.name + ' (금 +' + gold + ' · 순간이동 지점)', 'discover');
    if (global.DG.ui && global.DG.ui.toast) { global.DG.ui.toast('🗼 ' + cell.name + ' 발견! 순간이동 지점이 열렸다 (M)'); }
    if (global.DG.audio) { try { global.DG.audio.play('discover'); } catch (e) { /* 소리는 없어도 된다 */ } }
    c.emit('region:found', { key: key, name: cell.name });
    c.persist();
    return true;
  }

  /** 순간이동 지점 목록 — 고향 마을 + 발견한 랜드마크 */
  function waypoints() {
    var out = [{ key: '0_0', x: 0, y: 0, name: '고향 마을', biome: 'home' }];
    var g = regions();
    for (var k in g) {
      if (!g.hasOwnProperty(k)) { continue; }
      var p = k.split('_'), c = cellAt(+p[0], +p[1]);
      out.push({ key: k, x: c.x, y: c.y, name: c.name, biome: c.biome });
    }
    return out;
  }

  /** 순간이동 — 키보드 모드만(실제 GPS 로 걷는 중엔 몸이 거기 있다). 성공하면 true */
  function teleport(key) {
    var W = global.DG.world;
    if (!W || W.mode !== 'keyboard' || !found(key)) { return false; }
    var p = key.split('_'), c = cellAt(+p[0], +p[1]);
    var pos = core().save.player.pos;
    pos.x = c.x; pos.y = c.y + 8;
    if (W.walkTo) { W.walkTo(pos.x, pos.y); }
    core().log('🌀 순간이동 — ' + c.name, 'move');
    core().emit('region:teleport', { key: key });
    return true;
  }

  /* ══ ⑬ 지역 사명 — 지역마다 세 단(탑 찾기 → 그 지역 무리 토벌 → 탑 곁 수호자) ══════
   * 단은 **앞에서부터 차례로** 채워진다 — 탑을 찾기 전에 무리를 쳐 두면 셈은 쌓이고, 탑을
   * 찾는 순간 둘째 단까지 한꺼번에 넘어간다. 보상은 넘어간 단마다 한 번(`paid`). 첫 단 보상은
   * 발견(`discover`)이 이미 준다. 진행은 save.missions = { 지역키: { clears, paid } } */
  var MISSION_CLEARS = 2;
  function missions() {
    var s = core().save;
    if (!s.missions || typeof s.missions !== 'object') { s.missions = {}; }
    return s.missions;
  }
  /** 순수 함수 — st = { found, clears, guard } → 세 단과 지금 단 */
  function missionView(st) {
    var n = Math.min(MISSION_CLEARS, st.clears || 0);
    var steps = [
      { k: 'find', text: '가운데 탑을 찾아라', done: !!st.found },
      { k: 'clear', text: '이 지역 무리 토벌 ' + n + '/' + MISSION_CLEARS, done: (st.clears || 0) >= MISSION_CLEARS },
      { k: 'guard', text: '탑 곁 수호자를 쓰러뜨려라', done: !!st.guard }
    ];
    var stage = 0;
    while (stage < steps.length && steps[stage].done) { stage++; }
    return { steps: steps, stage: stage, next: steps[stage] || null, done: stage === steps.length };
  }
  function missionState(key) {
    var m = missions()[key] || {}, fs = core().save.field;
    return { found: found(key), clears: m.clears || 0, guard: !!(fs && fs.guards && fs.guards[key]), paid: m.paid || 0 };
  }
  /** 단이 넘어갔으면 보상 — 둘째 단 금 80×등급·단사 2, 셋째(평정) 금 200×등급·단사 10 */
  function progressMission(key) {
    if (!key || key === '0_0') { return null; }
    var c = core(), g = missions(), st = missionState(key), v = missionView(st);
    var m = g[key] || (g[key] = { clears: 0, paid: 0 });
    if (v.stage <= (m.paid || 0)) { return v; }
    var p = key.split('_'), cell = cellAt(+p[0], +p[1]);
    var FC = global.DG.fieldCombat, tier = FC ? FC.tierAt(cell.x, cell.y) : 1;
    if (v.stage >= 2 && (m.paid || 0) < 2) {
      var g2 = 80 * tier;
      c.save.player.gold = (c.save.player.gold || 0) + g2;
      c.save.dust = (c.save.dust || 0) + 2;
      c.log('📜 ' + cell.name + ' 사명 2/3 — 무리를 몰아냈다 (금 +' + g2 + ')', 'discover');
      if (global.DG.ui && global.DG.ui.toast) { global.DG.ui.toast('📜 ' + cell.name + ' 사명 2/3 — 이제 탑 곁 수호자'); }
    }
    if (v.done) {
      var g3 = 200 * tier;
      c.save.player.gold = (c.save.player.gold || 0) + g3;
      c.save.dust = (c.save.dust || 0) + 10;
      c.log('🏯 ' + cell.name + ' 평정 — 사명 3/3 (금 +' + g3 + ' · 단사 +10)', 'discover');
      if (global.DG.ui && global.DG.ui.toast) { global.DG.ui.toast('🏯 ' + cell.name + ' 평정! 금 +' + g3 + ' · 단사 +10'); }
      c.emit('region:settled', { key: key, name: cell.name });
    }
    m.paid = v.stage;
    c.persist();
    return v;
  }
  function onFieldClear(e) {
    if (!e || e.x === undefined || !on()) { return; }
    var key = regionAt(e.x, e.y).cell.key;
    if (key === '0_0') { return; }
    var g = missions(), m = g[key] || (g[key] = { clears: 0, paid: 0 });
    m.clears = (m.clears || 0) + 1;
    progressMission(key);
  }
  var subscribed = false;
  function subscribe() {
    if (subscribed || !core() || !core().on) { return; }
    subscribed = true;
    core().on('field:clear', onFieldClear);
    core().on('field:guard', function (e) { if (e && e.region) { progressMission(e.region); } });
    core().on('region:found', function (e) { if (e && e.key) { progressMission(e.key); } });
  }

  var missionEl = null, missionTxt = '';
  function paintMission(cell) {
    if (!global.document || global.DG_NO_DRAW) { return; }
    var txt = '';
    if (cell.biome !== 'home') {
      var v = missionView(missionState(cell.key));
      if (!v.done) { txt = '📜 ' + cell.name + ' 사명 ' + v.stage + '/3 · ' + v.next.text; }
    }
    if (txt === missionTxt) { return; }
    missionTxt = txt;
    if (!missionEl) {
      missionEl = document.createElement('div');
      missionEl.id = 'region-mission';
      document.body.appendChild(missionEl);
    }
    missionEl.textContent = txt;
    missionEl.style.display = txt ? '' : 'none';
  }

  var lastKey = null, bannerEl = null, bannerT = 0, acc = 0;
  var beams = {};

  function banner(cell) {
    if (!global.document || global.DG_NO_DRAW) { return; }
    if (!bannerEl) {
      bannerEl = document.createElement('div');
      bannerEl.id = 'region-banner';
      document.body.appendChild(bannerEl);
    }
    var B = BIOMES[cell.biome];
    bannerEl.style.setProperty('--bc', B.color);
    bannerEl.innerHTML = '<b>' + cell.name + '</b><small>' + B.desc + (found(cell.key) ? '' : ' · 가운데 탑을 찾아라') + '</small>';
    bannerEl.classList.remove('show');
    void bannerEl.offsetWidth;
    bannerEl.classList.add('show');
    bannerT = 3.2;
  }

  function tick(dt) {
    if (!on() || !core() || !core().save) { return; }
    subscribe();
    var pos = core().save.player.pos;
    acc += dt;
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0 && bannerEl) { bannerEl.classList.remove('show'); } }
    if (acc < 0.25) { return; }
    acc = 0;
    var r = regionAt(pos.x, pos.y);
    if (r.cell.key !== lastKey) {
      if (lastKey !== null) { banner(r.cell); }
      lastKey = r.cell.key;
    }
    var c = r.cell;
    if (c.biome !== 'home' && !found(c.key) && Math.hypot(pos.x - c.x, pos.y - c.y) < FIND_R) { discover(c.key); }
    if (!global.DG_NO_DRAW) { paintBeams(pos); paintMission(c); }
  }

  /* 빛기둥 — 안개를 뚫고 멀리서 보인다(fog:false). 못 찾은 곳은 금빛, 찾은 곳은 옅은 푸른빛 */
  function paintBeams(pos) {
    var w = global.DG.world3d;
    if (!w || !w.active || !w.active()) { return; }
    var T3 = w.three();
    if (!T3) { return; }
    var list = landmarks(pos.x, pos.y, 1350), seen = {}, i;
    for (i = 0; i < list.length; i++) {
      var L = list[i], f = found(L.key);
      seen[L.key] = true;
      var b = beams[L.key];
      if (!b || b.userData.found !== f) {
        if (b) { w.removeFx(b); b.geometry.dispose(); b.material.dispose(); }
        var geo = new T3.CylinderGeometry(f ? 0.8 : 1.6, f ? 0.8 : 1.6, 160, 12, 1, true);
        var mat = new T3.MeshBasicMaterial({ color: f ? '#9fd8ff' : '#ffd36b', transparent: true,
          opacity: f ? 0.18 : 0.34, depthWrite: false, fog: false, side: T3.DoubleSide });
        b = beams[L.key] = new T3.Mesh(geo, mat);
        b.userData.found = f;
        w.addFx(b);
      }
      b.position.set(L.x, (w.groundY ? w.groundY(L.x, L.y) : 0) + 80, L.y);
    }
    for (var k in beams) {
      if (beams.hasOwnProperty(k) && !seen[k]) {
        w.removeFx(beams[k]); beams[k].geometry.dispose(); beams[k].material.dispose();
        delete beams[k];
      }
    }
  }

  global.DG = global.DG || {};
  global.DG.biome = {
    BIOMES: BIOMES, SIZE: SIZE, BLEND: BLEND, FIND_R: FIND_R,
    on: on, cellAt: cellAt, regionAt: regionAt, biomeAt: biomeAt, bandAt: bandAt, reliefAt: reliefAt,
    landmarks: landmarks, bandOf: bandOf, invCdf: invCdf,
    found: found, discover: discover, waypoints: waypoints, teleport: teleport, tick: tick,
    MISSION_CLEARS: MISSION_CLEARS, missionView: missionView, missionState: missionState, progressMission: progressMission,
    subscribe: subscribe,
    _resetForTest: function () { lastKey = null; acc = 0; }
  };
})(window);
