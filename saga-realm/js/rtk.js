/**
 * 삼국지 — 판(盤): 연·월 · 도시 · 내정 · 정산
 * ---------------------------------------------------------------
 * 이 판의 시간은 **달(月)** 이다. 한 달에 무장 한 사람이 명령 하나를 쓴다.
 * "다음 달" 을 누르면 다른 세력이 제 명령을 쓰고, 그 달의 살림이 정산된다.
 *
 *   금(金)    세력 금고 하나 — 어느 성에서 써도 같은 주머니다
 *   군량(糧)  **도시마다 따로** — 그래서 먼 성으로 출진하면 군량이 발목을 잡는다
 *
 * 코에이 삼국지가 금은 나라 살림으로, 군량은 성 살림으로 갈라 둔 데에는 까닭이 있다.
 * 둘을 합치면 "군량이 있는 곳으로 싸우러 간다" 는 판단이 통째로 사라진다.
 *
 * 전투는 war.js, 외교·계략은 diplo.js 다. 이 파일은 **평시(平時)** 만 맡는다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var CD = global.DG.cityData;
  var FD = global.DG.forceData;

  var START_YEAR = 194;              // 표가 연도를 안 적었을 때의 값
  /* 아래 둘은 core.tuned 로 뽑았다(2026-08-31, 어드민 '균형 손잡이' 탭) —
     이 판은 턴제라 모듈이 뜰 때 한 번만 읽는다. 바꾼 뒤 새로고침해야 듣는다. */
  var UPKEEP_PER_OFFICER = core.tuned('rtk.upkeep', 12);      // 무장 한 사람의 달 봉급 (금)
  var FOOD_PER_1000 = core.tuned('rtk.foodPer1000', 10);      // 병사 1000명이 한 달에 먹는 군량
  var HARVEST_MONTHS = [6, 10];     // 군량이 들어오는 달

  /* ── 내정 명령 ────────────────────────────────────────── */

  /**
   *   stat   판정에 쓰는 자질
   *   gold   드는 금
   *   base/per  성과 = base + 자질 × per
   */
  var ORDERS = [
    { key: 'agri',   name: '개간', emoji: '🌾', stat: 'wisdom',  gold: 60,  base: 3, per: 0.055,
      desc: '논밭을 넓힌다. 수확이 늘어 군량이 넉넉해진다.' },
    { key: 'comm',   name: '상업', emoji: '🏪', stat: 'wisdom',  gold: 60,  base: 3, per: 0.055,
      desc: '저자를 키운다. 달마다 들어오는 금이 늘어난다.' },
    { key: 'tech',   name: '기술', emoji: '🔨', stat: 'wisdom',  gold: 100, base: 2, per: 0.04,
      desc: '병장기를 벼린다. 같은 병력이 더 세게 친다.' },
    { key: 'sec',    name: '치안', emoji: '🪧', stat: 'command', gold: 40,  base: 3, per: 0.05,
      desc: '민심을 다독인다. 낮으면 도적이 일고 백성이 흩어진다.' },
    { key: 'wall',   name: '축성', emoji: '🧱', stat: 'command', gold: 120, base: 60, per: 3.2,
      desc: '성벽을 높인다. 공성을 오래 버틴다.' },
    { key: 'draft',  name: '징병', emoji: '🪖', stat: 'command', gold: 200, base: 200, per: 9,
      desc: '백성을 병사로 뽑는다. 인구가 그만큼 준다.' },
    { key: 'train',  name: '훈련', emoji: '🎯', stat: 'might',   gold: 50,  base: 3, per: 0.05,
      desc: '훈련도를 올린다. 같은 병력이 더 오래 버틴다.' },
    { key: 'ships',  name: '조선', emoji: '🛶', stat: 'command', gold: 150, base: 4, per: 0.06,
      desc: '배를 짓는다. 물길은 배가 있어야 건넌다 (강을 낀 성에서만).' },
    { key: 'search', name: '수색', emoji: '🔍', stat: 'wisdom',  gold: 80,  base: 0, per: 0,
      desc: '재야에 묻힌 인재를 찾는다. 찾아야 등용할 수 있다.' },
    { key: 'hire',   name: '등용', emoji: '🤝', stat: 'wisdom',  gold: 150, base: 0, per: 0,
      desc: '찾아낸 재야나 사로잡은 포로를 부른다.' }
  ];

  function orderByKey(k) {
    for (var i = 0; i < ORDERS.length; i++) { if (ORDERS[i].key === k) { return ORDERS[i]; } }
    return null;
  }

  /* ── 재해 ─────────────────────────────────────────────── */

  var DISASTERS = [
    { key: 'drought', name: '가뭄', emoji: '🌵', months: 3, harvest: 0.5,  pop: 0,      text: '비가 오지 않아 논밭이 갈라졌다.' },
    { key: 'flood',   name: '수해', emoji: '🌊', months: 2, harvest: 0.6,  pop: -0.02,  wall: -400, text: '큰물이 나 둑과 성벽이 무너졌다.' },
    { key: 'plague',  name: '역병', emoji: '🦠', months: 3, harvest: 0.85, pop: -0.04,  troops: -0.05, text: '역병이 돌아 성 안이 조용하다.' },
    { key: 'locust',  name: '황충', emoji: '🦗', months: 2, harvest: 0.4,  pop: -0.01,  text: '메뚜기 떼가 하늘을 덮었다.' },
    { key: 'bumper',  name: '풍년', emoji: '🌻', months: 2, harvest: 1.6,  pop: 0.02,  good: true, text: '해가 좋아 이삭이 무겁다.' }
  ];

  function disasterByKey(k) {
    for (var i = 0; i < DISASTERS.length; i++) { if (DISASTERS[i].key === k) { return DISASTERS[i]; } }
    return null;
  }

  /* ── 상태 ─────────────────────────────────────────────── */

  /**
   * 세이브에 적힌 시나리오를 **다시 세워 준다**.
   * 세이브를 갈아 끼우거나(프로필) 새로고침해도 세력 표가 따라와야 한다 —
   * 이 한 줄이 없으면 208년 판을 열어 두고 새로고침했을 때 194년 표로 읽혀
   * 세력 이름과 색이 통째로 어긋난다.
   */
  var scenApplied = null;

  function state() {
    var s = core.save;
    if (!s.rtk) {
      s.rtk = {
        started: false, year: START_YEAR, month: 1, me: null, scen: '194',
        cities: {}, forces: {}, officers: {}, captives: {},
        camps: [], campSeq: 0,
        journeys: [], journeySeq: 0,
        result: null, turn: 0
      };
    }
    var want = s.rtk.scen || '194';
    if (scenApplied !== want) { FD.use(want); scenApplied = want; }
    if (s.rtk.started) { migrateNewCities(s.rtk); }
    return s.rtk;
  }

  /**
   * **옛 세이브 이사** — `setup()` 을 다시 부르지 않는 이어하기 세이브는
   * `data-city.js` 에 성을 늘려도(2026-09-03 한국 지역 확장) `st.cities` 가
   * 그 키를 못 얻는다. `realm3d.js`/`ui-rtk.js` 는 `CD.CITIES` 를 그때그때
   * 훑으므로 `st.cities[새성id]` 가 `undefined` 인 채 `.force` 를 읽다 그
   * 자리에서 터진다(실제로 배포판에서 겪었다 — TypeError, 화면이 통째로 안 뜸).
   * `state()` 가 부를 때마다 **없는 성만** 채운다(`setup()` 의 도시 초기화 +
   * `seedNeutral()` 과 같은 값) — 한 번 채우면 다음부터는 전부 있어 조용히 넘어간다.
   */
  function migrateNewCities(st) {
    var off = global.DG.off;
    var changed = false;
    for (var i = 0; i < CD.CITIES.length; i++) {
      var d = CD.CITIES[i];
      if (st.cities[d.id]) { continue; }
      changed = true;
      var c = st.cities[d.id] = {
        force: null,
        agri: d.agri, comm: d.comm, tech: 100, sec: 60,
        pop: d.pop, troops: 0, food: 0, train: 40,
        wall: d.wall, maxWall: d.wall,
        ships: d.land === 'river' ? 60 : 0,
        gov: null, disaster: null, dLeft: 0
      };
      if (d.garrison) {
        c.troops = d.garrison;
        c.food = d.garrison * 2;
        var ids = (FD.KOREA_GARRISON && FD.KOREA_GARRISON[d.id]) || [];
        var gov = null;
        for (var j = 0; j < ids.length; j++) {
          var r = off.placeAt(ids[j], d.id, null);
          r.found = true;
          if (!gov) { gov = ids[j]; }
        }
        c.gov = gov;
      }
    }
    if (changed) { core.persist(); }
    return changed;
  }

  function city(id) { return state().cities[id] || null; }
  function force(id) { return state().forces[id] || null; }
  function me() { return state().me; }
  function myForce() { return force(me()); }

  function isMine(cityId) {
    var c = city(cityId);
    return !!c && c.force === me();
  }

  /** 살아 있는 세력 id 목록 (도시를 하나라도 가진 것) */
  function liveForces() {
    var st = state(), out = [], k;
    for (k in st.forces) {
      if (Object.prototype.hasOwnProperty.call(st.forces, k) && citiesOf(k).length) { out.push(k); }
    }
    return out;
  }

  function citiesOf(forceId) {
    var st = state(), out = [], k;
    for (k in st.cities) {
      if (Object.prototype.hasOwnProperty.call(st.cities, k) && st.cities[k].force === forceId) {
        out.push(k);
      }
    }
    return out;
  }

  /* ── 판 세우기 ────────────────────────────────────────── */

  /**
   * 판을 세운다.
   * @param meId  내가 잡을 세력 id
   * @param scen  시나리오 id ('194' · '200' · '208'). 없으면 194년
   */
  function setup(meId, scen) {
    var st = state();
    var off = global.DG.off;
    var sc = FD.use(scen || '194');
    scenApplied = sc.id;
    st.scen = sc.id;
    st.started = true;
    st.year = sc.year || START_YEAR; st.month = 1; st.turn = 0;
    st.me = meId; st.result = null;
    st.cities = {}; st.forces = {}; st.officers = {}; st.captives = {};
    st.camps = []; st.campSeq = 0;
    st.journeys = []; st.journeySeq = 0;

    var i, j;

    /* 도시 */
    for (i = 0; i < CD.CITIES.length; i++) {
      var d = CD.CITIES[i];
      st.cities[d.id] = {
        force: null,
        agri: d.agri, comm: d.comm, tech: 100, sec: 60,
        pop: d.pop, troops: 0, food: 0, train: 40,
        wall: d.wall, maxWall: d.wall,
        /* 강을 낀 성은 처음부터 배를 좀 갖고 있다 — 없이 시작하면 강동이 첫해
           내내 아무 데도 못 가고, 판이 그대로 언다 */
        ships: d.land === 'river' ? 60 : 0,
        gov: null, disaster: null, dLeft: 0
      };
    }

    /* 세력 · 무장 배치 */
    for (i = 0; i < FD.FORCES.length; i++) {
      var f = FD.FORCES[i];
      st.forces[f.id] = { gold: 2000 + f.cities.length * 400, allies: {}, truce: {} };
      for (j = 0; j < f.cities.length; j++) { st.cities[f.cities[j]].force = f.id; }

      var roster = FD.roster(f.id);
      for (j = 0; j < roster.length; j++) {
        var cityId = f.cities[j % f.cities.length];
        var r = off.placeAt(roster[j], cityId, f.id);
        r.loyal = off.baseLoyal(roster[j], f.id) + (roster[j] === f.lord ? 100 : 0);
        r.loyal = core.clamp(r.loyal, 0, 100);
      }
      /* 군주가 있는 성이 본거지 — 태수는 그 성의 으뜸 무장 */
      for (j = 0; j < f.cities.length; j++) {
        var here = off.atCity(f.cities[j], f.id);
        st.cities[f.cities[j]].gov = here.length ? here[0].id : null;
        st.cities[f.cities[j]].troops = 3000 + Math.round(st.cities[f.cities[j]].pop / 90);
        st.cities[f.cities[j]].food = 8000 + st.cities[f.cities[j]].agri * 8;
      }
    }

    /* 어느 표에도 안 적힌 사람은 재야가 된다 — 200·208년의 여포·이각이 그렇다.
       한국 지역 수비 무장도 이 시점엔 force:null 이라 이 해시를 함께 타고
       아무 성에나 흩어진다 — 아래 seedNeutral() 이 곧바로 제자리로 되돌린다 */
    scatterFree();

    /* 세력 없는 성(한국 지역, 2026-09-03 확장) — 수비병·수비 무장을 채운다.
       scatterFree() **뒤에** 불러야 한다 — 위에서 흩어 놓은 한국 수비 무장의
       자리를 지정한 성으로 되돌려 놓는다(scatterFree()는 안 건드린다) */
    seedNeutral();

    /* 시나리오가 정한 맹약 — 적벽의 손·유 동맹이 여기서 선다 */
    var pacts = sc.pacts || [];
    for (i = 0; i < pacts.length; i++) {
      if (global.DG.diplo) {
        global.DG.diplo.setPact(pacts[i][0], pacts[i][1], pacts[i][2], pacts[i][3]);
      }
    }

    core.log('🏳️ ' + st.year + '년 봄 · ' + sc.name + '(' + sc.hanja + ') — ' +
      forceName(meId) + ' 의 깃발을 들었다.', 'good');
    core.emit('changed');
    core.persist();
    return st;
  }

  /**
   * 재야를 도시에 흩는다.
   * **결정적으로** 흩는다(이름 해시) — 다시 세워도 같은 사람이 같은 성에 있다.
   * 무작위로 흩으면 자가진단이 실행마다 다른 성을 짚는다.
   */
  function scatterFree() {
    var st = state();
    var off = global.DG.off;
    var pool = off.all();
    var placedCount = 0;
    for (var i = 0; i < pool.length; i++) {
      var h = pool[i];
      if (!h.stats) { continue; }
      if (st.officers[h.id] && st.officers[h.id].force) { continue; }
      var n = 0;
      for (var c = 0; c < h.id.length; c++) { n = (n * 31 + h.id.charCodeAt(c)) >>> 0; }
      var cityId = CD.CITIES[n % CD.CITIES.length].id;
      var r = off.placeAt(h.id, cityId, null);
      r.loyal = 0; r.found = false;
      placedCount++;
    }
    return placedCount;
  }

  /**
   * 세력 없는 성(한국 지역, `data-city.js`의 `garrison` 필드가 있는 성)을 채운다.
   * `setup()`이 처음 도시를 세울 때는 `FD.FORCES`에 실린 성만 병력을 받는다
   * (조사로 확인 — 세력 없는 성은 그냥 0으로 남는다). 그 성이 빈 채면 아무나
   * 걸어 들어가는 셈이라 "정복" 이라 할 게 없다 — 수비병·수비 무장을 준다.
   * 이 성의 수비 무장은 **수색 없이 바로 보인다**(`found:true`) — 성벽 뒤에
   * 있는 사람이 안 보이는 재야일 리 없다. `off.atCity()`는 found 여부를
   * 안 가리므로 전투(war.js)에서는 이미 문제없이 defOff 로 잡힌다.
   */
  function seedNeutral() {
    var st = state();
    var off = global.DG.off;
    for (var i = 0; i < CD.CITIES.length; i++) {
      var d = CD.CITIES[i];
      if (!d.garrison) { continue; }
      var c = st.cities[d.id];
      c.troops = d.garrison;
      c.food = d.garrison * 2;
      var ids = (FD.KOREA_GARRISON && FD.KOREA_GARRISON[d.id]) || [];
      var gov = null;
      for (var j = 0; j < ids.length; j++) {
        var r = off.placeAt(ids[j], d.id, null);
        r.found = true;
        if (!gov) { gov = ids[j]; }
      }
      c.gov = gov;
    }
  }

  function forceName(id) {
    if (!id) { return '주인 없음'; }     // 한국 지역 등 force:null 인 성 (2026-09-03)
    var f = FD.force(id);
    return f ? f.name : id;
  }

  /* ── 명령 ─────────────────────────────────────────────── */

  /** 이 도시에서 이 달에 아직 명령을 안 쓴 소속 무장 */
  function readyAt(cityId) {
    var c = city(cityId);
    if (!c) { return []; }
    var list = global.DG.off.atCity(cityId, c.force), out = [];
    for (var i = 0; i < list.length; i++) {
      var r = global.DG.off.rec(list[i].id);
      if (!r.done && !r.hurt) { out.push(list[i]); }
    }
    return out;
  }

  /** 내정 상한 — 지형이 정한다 (산성은 논밭이 좁다) */
  function capOf(cityId, key) {
    var d = CD.find(cityId);
    var land = CD.landOf(cityId);
    if (key === 'agri') { return Math.round(900 * land.agriCap); }
    if (key === 'comm') { return Math.round(900 * land.commCap); }
    if (key === 'tech') { return 900; }
    if (key === 'sec') { return 100; }
    if (key === 'train') { return 100; }
    if (key === 'ships') { return (d && d.land === 'river') ? 300 : 0; }
    if (key === 'wall') { return Math.round((d ? d.wall : 4000) * 2); }
    return 999999;
  }

  /**
   * 명령을 실행한다.
   * @returns {{ok:boolean, why:string, amount:number, crit:boolean, text:string}}
   */
  function order(cityId, officerId, orderKey) {
    var st = state();
    var off = global.DG.off;
    var c = city(cityId), o = orderByKey(orderKey), h = off.find(officerId);
    if (!c || !o || !h) { return { ok: false, why: '없는 명령' }; }
    var r = off.rec(officerId);
    if (r.city !== cityId) { return { ok: false, why: '그 성에 없습니다' }; }
    if (r.force !== c.force) { return { ok: false, why: '남의 무장입니다' }; }
    if (r.done) { return { ok: false, why: '이 달에 이미 명령을 썼습니다' }; }
    if (r.hurt) { return { ok: false, why: '부상 중입니다' }; }
    /* 배는 물가에서만 짓는다. 여기서 막지 않으면 금만 나가고 아무것도 안 는다 */
    if (orderKey === 'ships' && CD.find(cityId).land !== 'river') {
      return { ok: false, why: '물길이 없는 성입니다' };
    }
    var fs = force(c.force);
    if (!fs || fs.gold < o.gold) { return { ok: false, why: '금이 모자랍니다' }; }

    fs.gold -= o.gold;
    r.done = true;

    if (orderKey === 'search') { return doSearch(c, cityId, h, r); }
    if (orderKey === 'hire') { return doHire(c, cityId, h, r); }

    var sv = off.stats(officerId)[o.stat] || 0;
    /* 대성공 — 자질이 높을수록 잦다. 성과가 절반 더 붙는다 */
    var crit = Math.random() < core.clamp(sv / 400, 0.03, 0.28);
    var amount = Math.round((o.base + sv * o.per) * (crit ? 1.5 : 1));

    if (orderKey === 'draft') {
      /* 징병은 인구를 깎는다 — 사람이 없으면 병사도 없다 */
      var room = Math.floor(c.pop * 0.06) - c.troops;
      amount = Math.max(0, Math.min(amount, Math.max(0, room), Math.floor(c.pop / 12)));
      c.troops += amount;
      c.pop -= amount;
      /* 새 병사가 섞이면 훈련도가 내려간다 */
      if (c.troops > 0) {
        c.train = Math.round(c.train * (c.troops - amount) / c.troops);
      }
    } else {
      var cap = capOf(cityId, orderKey);
      var before = c[orderKey];
      c[orderKey] = Math.min(cap, before + amount);
      amount = c[orderKey] - before;
    }

    r.feats += 1;
    off.addLoyal(officerId, 1);
    off.gainExp(officerId, off.EXP.order);

    var txt = h.name + ' — ' + o.emoji + ' ' + o.name + ' ' +
      (amount > 0 ? '+' + core.fmt(amount) : '더 올릴 곳이 없다') + (crit && amount > 0 ? ' (대성공!)' : '');
    core.log('📋 ' + CD.find(cityId).name + ' · ' + txt, crit ? 'good' : 'info');
    core.emit('changed');
    return { ok: true, amount: amount, crit: crit, text: txt };
  }

  /** 수색 — 그 성에 묻힌 재야를 하나 찾아낸다 */
  function doSearch(c, cityId, h, r) {
    var off = global.DG.off;
    var hidden = [], all = off.freeAt(cityId, false), i;
    for (i = 0; i < all.length; i++) {
      if (!off.rec(all[i].id).found) { hidden.push(all[i]); }
    }
    if (!hidden.length) {
      core.log('🔍 ' + CD.find(cityId).name + ' — ' + h.name + ' 이 두루 찾았으나 아무도 없었다.', 'info');
      core.emit('changed');
      return { ok: true, amount: 0, found: null, text: '더 찾을 사람이 없다' };
    }
    /* 지력이 높을수록 귀한 사람을 알아본다 */
    var wis = off.stats(h.id).wisdom;
    hidden.sort(function (a, b) { return b.rarity - a.rarity; });
    var reach = core.clamp(Math.round(hidden.length * (wis / 130)), 1, hidden.length);
    var pickIdx = Math.floor(Math.random() * reach);
    var got = hidden[pickIdx];
    off.rec(got.id).found = true;
    core.log('🔍 ' + CD.find(cityId).name + ' — ' + h.name + ' 이 ' + got.name + ' 을(를) 찾아냈다!', 'good');
    core.emit('toast', '🔍 ' + got.name + ' 을(를) 찾았다');
    core.emit('changed');
    return { ok: true, amount: 1, found: got, text: got.name + ' 을(를) 찾았다' };
  }

  /** 등용 — 찾아낸 재야, 또는 이 성에 갇힌 포로 */
  function doHire(c, cityId, h, r) {
    var off = global.DG.off;
    var pool = off.freeAt(cityId, true);
    var st = state(), k;
    for (k in st.captives) {
      if (Object.prototype.hasOwnProperty.call(st.captives, k) && st.captives[k] === cityId) {
        var ch = off.find(k);
        if (ch) { pool.push(ch); }
      }
    }
    if (!pool.length) {
      core.emit('changed');
      return { ok: true, amount: 0, hired: null, text: '부를 사람이 없다 (먼저 수색하시오)' };
    }
    var target = pool[0];
    var res = tryHire(cityId, h.id, target.id);
    core.emit('changed');
    return res;
  }

  /**
   * 한 사람을 콕 집어 등용한다 (화면에서 고를 때).
   * 성공률은 **부르는 사람의 지력**과 **부름받는 사람의 콧대(등급)** 가 가른다.
   */
  function tryHire(cityId, byId, targetId) {
    var off = global.DG.off;
    var c = city(cityId);
    var by = off.find(byId), t = off.find(targetId);
    if (!c || !by || !t) { return { ok: false, why: '없는 사람' }; }
    var st = state();
    var wis = off.stats(byId).wisdom;
    var chance = core.clamp(0.28 + wis / 260 - (t.rarity - 2) * 0.09, 0.05, 0.9);
    /* 같은 성향이면 말이 통한다 */
    if (by.trait === t.trait) { chance += 0.10; }
    var captive = st.captives[targetId] === cityId;
    if (captive) { chance -= 0.15; }         // 잡혀 온 사람은 쉬이 굽히지 않는다

    if (Math.random() > chance) {
      core.log('🤝 ' + by.name + ' 이 ' + t.name + ' 을(를) 청했으나 거절당했다.', 'info');
      return { ok: true, hired: null, chance: chance, text: t.name + ' 이(가) 사양했다' };
    }
    delete st.captives[targetId];
    var r = off.placeAt(targetId, cityId, c.force);
    r.loyal = off.baseLoyal(targetId, c.force);
    r.found = true;
    r.done = true;                            // 들어온 달에는 일하지 않는다
    core.log('🤝 ' + t.name + ' 이(가) ' + forceName(c.force) + ' 에 합류했다!', 'good');
    core.emit('toast', '🤝 ' + t.name + ' 합류!');
    return { ok: true, hired: t, chance: chance, text: t.name + ' 합류!' };
  }

  /** 태수 임명 — 그 성의 내정·수입에 자질이 얹힌다 */
  function setGov(cityId, officerId) {
    var c = city(cityId);
    var off = global.DG.off;
    if (!c) { return false; }
    if (officerId) {
      var r = off.rec(officerId);
      if (r.city !== cityId || r.force !== c.force) { return false; }
    }
    c.gov = officerId || null;
    core.emit('changed');
    return true;
  }

  /** 태수 보정 — 지력(수입)·통솔(치안 유지)을 본다. 1.0 ~ 1.35 */
  function govMul(cityId) {
    var c = city(cityId);
    if (!c || !c.gov) { return 1; }
    var s = global.DG.off.stats(c.gov);
    return 1 + (s.wisdom * 0.6 + s.command * 0.4) / 100 * core.tuned('rtk.govCap', 0.35);
  }

  /* ── 정산 ─────────────────────────────────────────────── */

  function harvestMul(cityId) {
    var c = city(cityId);
    if (!c || !c.disaster) { return 1; }
    var d = disasterByKey(c.disaster);
    return d ? d.harvest : 1;
  }

  /** 치안이 살림에 미치는 몫 — 0.5 ~ 1.0 */
  function secMul(cityId) {
    var c = city(cityId);
    return c ? 0.5 + core.clamp(c.sec, 0, 100) / 200 : 1;
  }

  /** 이 도시가 이 달에 낳는 금 */
  function goldOf(cityId) {
    var c = city(cityId);
    if (!c) { return 0; }
    return Math.round(c.comm * core.tuned('rtk.goldMul', 0.55) * secMul(cityId) * govMul(cityId) * harvestMul(cityId));
  }

  /** 수확 달에 이 도시가 낳는 군량 */
  function foodOf(cityId) {
    var c = city(cityId);
    if (!c) { return 0; }
    return Math.round(c.agri * core.tuned('rtk.foodMul', 6) * secMul(cityId) * govMul(cityId) * harvestMul(cityId));
  }

  /** 이 도시가 이 달에 먹는 군량 */
  function eatOf(cityId) {
    var c = city(cityId);
    if (!c) { return 0; }
    return Math.round(c.troops / 1000 * FOOD_PER_1000);
  }

  function settleMonth() {
    var st = state();
    var off = global.DG.off;
    var harvest = HARVEST_MONTHS.indexOf(st.month) >= 0;
    var k, c, f;

    /* 세력 금고 */
    for (k in st.forces) {
      if (!Object.prototype.hasOwnProperty.call(st.forces, k)) { continue; }
      f = st.forces[k];
      var cs = citiesOf(k), i, income = 0;
      for (i = 0; i < cs.length; i++) { income += goldOf(cs[i]); }
      var upkeep = off.ofForce(k).length * UPKEEP_PER_OFFICER;
      f.gold = Math.max(0, f.gold + income - upkeep);
      f.lastIncome = income; f.lastUpkeep = upkeep;
    }

    /* 도시 살림 */
    for (k in st.cities) {
      if (!Object.prototype.hasOwnProperty.call(st.cities, k)) { continue; }
      c = st.cities[k];
      if (!c.force) { continue; }

      /* 에워싸인 성은 들에 나가지 못한다 — **수확을 못 거둔다**.
         이것이 없으면 긴 포위가 수비 쪽에 아무 값도 물리지 못해,
         "성문을 닫고 버틴다" 가 언제나 옳은 수가 된다 */
      var sieged = global.DG.war ? global.DG.war.besieged(k) : false;
      if (harvest && !sieged) { c.food += foodOf(k); }
      c.food -= eatOf(k);
      if (c.food < 0) {
        /* 굶으면 병사가 흩어진다 — 이 판에서 가장 아픈 벌이다 */
        var lost = Math.min(c.troops, Math.round(-c.food / FOOD_PER_1000 * 1000));
        c.troops -= lost;
        c.food = 0;
        if (lost > 0) {
          core.log('🍚 ' + CD.find(k).name + ' — 군량이 떨어져 병사 ' + core.fmt(lost) + ' 이 흩어졌다', 'warn');
        }
      }

      /* 인구 — 치안과 논밭이 사람을 부른다 (에워싸인 성은 늘지 않는다) */
      var grow = sieged ? 0 : c.pop * 0.006 * (c.agri / 320) * (secMul(k) * 2 - 0.8);
      var dz = c.disaster ? disasterByKey(c.disaster) : null;
      if (dz && dz.pop) { grow += c.pop * dz.pop; }
      if (c.sec < 35) { grow -= c.pop * 0.008; }
      c.pop = Math.max(5000, Math.round(c.pop + grow));
      if (dz && dz.troops) { c.troops = Math.max(0, Math.round(c.troops * (1 + dz.troops))); }
      if (dz && dz.wall) { c.wall = Math.max(200, c.wall + dz.wall); }

      /* 치안은 가만두면 내려간다 */
      c.sec = core.clamp(c.sec - 1, 0, 100);

      /* 재해가 지나간다 */
      if (c.disaster) {
        c.dLeft -= 1;
        if (c.dLeft <= 0) {
          var was = disasterByKey(c.disaster);
          core.log((was && was.emoji ? was.emoji : '☀️') + ' ' + CD.find(k).name +
            ' — ' + (was ? was.name : '') + ' 이(가) 지나갔다', 'info');
          c.disaster = null;
        }
      }
    }

    /* 태수로 한 달을 앉아 있으면 그만큼 는다 — 자리가 사람을 기른다 */
    for (k in st.cities) {
      if (!Object.prototype.hasOwnProperty.call(st.cities, k)) { continue; }
      if (st.cities[k].force && st.cities[k].gov) {
        off.gainExp(st.cities[k].gov, off.EXP.gov);
      }
    }

    rollDisasters();
    driftLoyalty();
    /* 이탈은 충성이 움직인 **뒤에** 본다 — 먼저 보면 이 달에 깎인 이간이 안 먹는다 */
    if (global.DG.diplo) { global.DG.diplo.checkDefection(); }
    checkResult();
  }

  /** 달마다 한 성쯤에 무슨 일이 난다 */
  function rollDisasters() {
    var st = state(), keys = Object.keys(st.cities);
    if (Math.random() > core.tuned('rtk.disasterChance', 0.42)) { return null; }
    var target = keys[Math.floor(Math.random() * keys.length)];
    var c = st.cities[target];
    if (!c || !c.force || c.disaster) { return null; }
    /* 치안이 낮은 성이 더 잘 무너진다 — 풍년은 그 반대 */
    var bad = Math.random() < core.clamp(0.55 + (60 - c.sec) / 200, 0.3, 0.9);
    var pool = DISASTERS.filter(function (d) { return !!d.good !== bad; });
    var d = pool[Math.floor(Math.random() * pool.length)];
    c.disaster = d.key; c.dLeft = d.months;
    core.log(d.emoji + ' ' + CD.find(target).name + ' — ' + d.text, d.good ? 'good' : 'warn');
    if (c.force === me()) { core.emit('toast', d.emoji + ' ' + CD.find(target).name + ' ' + d.name); }
    return { city: target, kind: d.key };
  }

  /**
   * 충성은 인연(baseLoyal)으로 **끌려간다**.
   * 위로 끌려가기만 하면 이탈이 영영 없고, 아래로만 두면 아무도 안 남는다.
   */
  function driftLoyalty() {
    var st = state(), off = global.DG.off, k;
    for (k in st.officers) {
      if (!Object.prototype.hasOwnProperty.call(st.officers, k)) { continue; }
      var r = st.officers[k];
      if (!r.force) { continue; }
      var f = FD.force(r.force);
      if (f && f.lord === k) { r.loyal = 100; continue; }
      var base = off.baseLoyal(k, r.force);
      /* 큰 성에 있으면 대접받는 느낌이 난다 */
      var c = st.cities[r.city];
      if (c && c.sec >= 70) { base += 4; }
      if (c && c.sec < 30) { base -= 6; }
      r.loyal = core.clamp(Math.round(r.loyal + (base - r.loyal) * 0.25), 0, 100);
      if (r.hurt > 0) { r.hurt -= 1; }
    }
  }

  /** 상 — 금을 주어 충성을 올린다 */
  function reward(officerId, gold) {
    var off = global.DG.off;
    var r = off.rec(officerId);
    var f = force(r.force);
    if (!f || !r.force) { return { ok: false, why: '내 무장이 아닙니다' }; }
    gold = Math.max(50, Math.round(gold || 200));
    if (f.gold < gold) { return { ok: false, why: '금이 모자랍니다' }; }
    f.gold -= gold;
    var up = core.clamp(Math.round(gold / 40), 1, 20);
    var now = off.addLoyal(officerId, up);
    var h = off.find(officerId);
    core.log('🎁 ' + h.name + ' 에게 금 ' + core.fmt(gold) + ' — 충성 ' + now, 'good');
    core.emit('changed');
    return { ok: true, loyal: now, up: up };
  }

  /* ── 학당 (문답 — 곁가지) ─────────────────────────────── */

  var LORE_PER_FIND = 6;        // 학식이 이만큼 차면 재야 하나가 저절로 드러난다

  /**
   * 문답을 맞혔을 때 quiz.js 가 부른다.
   * 문답은 이 판의 **곁가지**다 — 군자금과, 이따금 재야 하나를 드러내는 것까지.
   * 여기서 성을 넓히거나 병력을 주면 삼국지가 문답 게임이 되어 버린다.
   */
  function study(lv, gold, first) {
    var st = state();
    var f = myForce();
    if (!st.started || !f) { return null; }
    f.gold += Math.max(0, Math.round(gold || 0));
    var out = { gold: gold, found: null };
    if (!first) { return out; }
    st.lore = (st.lore || 0) + Math.max(1, lv || 1);
    while (st.lore >= LORE_PER_FIND) {
      st.lore -= LORE_PER_FIND;
      var got = revealFree();
      if (got) { out.found = got; }
    }
    return out;
  }

  /** 우리 땅에 묻힌 재야 하나를 드러낸다 (가장 귀한 사람부터) */
  function revealFree() {
    var off = global.DG.off;
    var mine = citiesOf(me()), pool = [], i;
    for (i = 0; i < mine.length; i++) {
      var all = off.freeAt(mine[i], false);
      for (var j = 0; j < all.length; j++) {
        if (!off.rec(all[j].id).found) { pool.push(all[j]); }
      }
    }
    if (!pool.length) { return null; }
    pool.sort(function (a, b) { return b.rarity - a.rarity; });
    off.rec(pool[0].id).found = true;
    core.log('📚 학식이 쌓여 ' + pool[0].name + ' 의 이름이 들려왔다', 'good');
    core.emit('toast', '🔍 ' + pool[0].name + ' 이(가) 드러났다');
    return pool[0];
  }

  /* ── 승패 ─────────────────────────────────────────────── */

  function checkResult() {
    var st = state();
    if (st.result) { return st.result; }
    var mine = citiesOf(st.me);
    if (!mine.length) {
      st.result = 'lose';
      core.log('🏳️ 성을 모두 잃었다. ' + st.year + '년 ' + st.month + '월.', 'warn');
      core.emit('rtk:end', 'lose');
    } else if (mine.length === Object.keys(st.cities).length) {
      st.result = 'win';
      core.log('👑 천하가 하나가 되었다! ' + st.year + '년 ' + st.month + '월.', 'good');
      core.emit('rtk:end', 'win');
    }
    return st.result;
  }

  /* ── 달 넘기기 ────────────────────────────────────────── */

  /**
   * 다음 달로 넘긴다.
   *   1) 다른 세력이 명령을 쓴다 (ai)
   *   2) 살림을 정산한다
   *   3) 달을 올리고 명령표를 비운다
   */
  function endMonth() {
    var st = state();
    if (!st.started || st.result) { return null; }

    global.DG.rtkAI.runAll();
    if (global.DG.war) { global.DG.war.resolveAll(); }
    if (global.DG.war) { global.DG.war.resolveJourneys(); }
    if (global.DG.diplo) { global.DG.diplo.monthly(); }
    settleMonth();

    st.month += 1;
    if (st.month > 12) { st.month = 1; st.year += 1; }
    st.turn += 1;

    var k;
    for (k in st.officers) {
      if (Object.prototype.hasOwnProperty.call(st.officers, k)) { st.officers[k].done = false; }
    }

    core.emit('rtk:month', { year: st.year, month: st.month });
    core.emit('changed');
    core.persist();
    return { year: st.year, month: st.month };
  }

  /* ── 요약 (화면용) ────────────────────────────────────── */

  function summary(forceId) {
    forceId = forceId || me();
    var cs = citiesOf(forceId), i, troops = 0, food = 0, income = 0, ships = 0;
    for (i = 0; i < cs.length; i++) {
      troops += state().cities[cs[i]].troops;
      food += state().cities[cs[i]].food;
      ships += state().cities[cs[i]].ships || 0;
      income += goldOf(cs[i]);
    }
    var f = force(forceId) || { gold: 0 };
    var offs = global.DG.off.ofForce(forceId);
    return {
      id: forceId, name: forceName(forceId),
      cities: cs.length, gold: f.gold, income: income,
      upkeep: offs.length * UPKEEP_PER_OFFICER,
      troops: troops, food: food, ships: ships, officers: offs.length
    };
  }

  /** 세력 순위 — 도시 수 → 병력 순 */
  function ranking() {
    var ids = liveForces(), out = [], i;
    for (i = 0; i < ids.length; i++) { out.push(summary(ids[i])); }
    out.sort(function (a, b) { return b.cities - a.cities || b.troops - a.troops; });
    return out;
  }

  global.DG = global.DG || {};
  global.DG.rtk = {
    START_YEAR: START_YEAR, ORDERS: ORDERS, DISASTERS: DISASTERS,
    scen: function () { return state().scen || '194'; },
    UPKEEP_PER_OFFICER: UPKEEP_PER_OFFICER, FOOD_PER_1000: FOOD_PER_1000,
    HARVEST_MONTHS: HARVEST_MONTHS, LORE_PER_FIND: LORE_PER_FIND,
    orderByKey: orderByKey, disasterByKey: disasterByKey,
    state: state, city: city, force: force, me: me, myForce: myForce,
    isMine: isMine, citiesOf: citiesOf, liveForces: liveForces, forceName: forceName,
    setup: setup, scatterFree: scatterFree,
    readyAt: readyAt, capOf: capOf, order: order, tryHire: tryHire,
    setGov: setGov, govMul: govMul, reward: reward,
    goldOf: goldOf, foodOf: foodOf, eatOf: eatOf, secMul: secMul, harvestMul: harvestMul,
    settleMonth: settleMonth, rollDisasters: rollDisasters, driftLoyalty: driftLoyalty,
    endMonth: endMonth, checkResult: checkResult,
    study: study, revealFree: revealFree,
    summary: summary, ranking: ranking
  };
})(window);
