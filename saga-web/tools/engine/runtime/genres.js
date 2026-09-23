/**
 * 사가 엔진 — 장르 시스템(genres). basics.js 다음에 부른다. three 없이 돈다(node 진단).
 * 다섯 판에만 있던 장르 규칙을 판에 안 묶이게 데이터로 옮겼다(원본 → 여기):
 *
 *   gear     장비 체계      사가블로 item.js·data-gem.js·data-set.js — 무기·갑주·부적 셋, 등급별 접사 굴림,
 *                           소켓(한 번 박으면 못 뺀다)·보석(박는 부위마다 다른 효과)·룬워드(순서가 맞아야)·세트(2·3점 누적)
 *   housing  꾸미기         사가의숲 가구 배치 — 방(room) 안에서 H 로 가진 가구를 1m 칸에 놓고 치우고 돌린다(저장된다)
 *   realm    영지 경영·전쟁  사가국지 — 영지(town)마다 주인·수입·병력·성벽, 턴마다 수입, 개발·징병·성벽·출진(자동 전투)·화친
 *   dungeon  무작위 던전    사가블로 던전 — 표시점(dungeon)에서 방·복도를 씨앗으로 짓고 적·상자·출구를 놓는다
 *   (둥근 세상 — 사가의숲 구면 투영은 화면만의 일이라 play-genres.js / 프로젝트 graphics.curve)
 *
 * 장비는 변수로 들어온다: 어디서든(줍기·상점·노획물·행동) 변수 "gear:<밑감 id>[:<등급>]" 를 더하면
 * 그만큼 장비가 굴려져 가방에 들어가고 변수는 지워진다. 보석은 "gem:<원소>", 룬은 "rune:<글자>" 변수(개수).
 */
(function (root) {
  'use strict';
  var SIM = root.SagaSim || (typeof require === 'function' ? require('./sim.js') : null);
  if (!SIM) { return; }
  function num(v, d) { v = +v; return isFinite(v) ? v : d; }
  function dist2(a, b) { return Math.hypot(a[0] - b[0], a[2] - b[2]); }
  function jo(w, a, b) { w = String(w); var c = w.charCodeAt(w.length - 1) - 0xAC00; return w + (c >= 0 && c < 11172 && c % 28 === 0 ? b : a); }

  /* ════════════════════════════════════════════════════════════════════════
     표
     ════════════════════════════════════════════════════════════════════════ */
  var SLOTS = { weapon: '무기', armor: '갑주', charm: '부적' };
  /* 능력 — 장비·보석·룬워드·세트가 모두 이 이름으로 낸다. 배율(S.mods)에 더했다가 뺀다 */
  var STAT = {
    atk: { name: '공격', pct: true, mod: 'atk', sign: 1 },
    guard: { name: '받는 피해', pct: true, mod: 'dmgTaken', sign: -1 },
    speed: { name: '이동', pct: true, mod: 'speed', sign: 1 },
    exp: { name: '경험치', pct: true, mod: 'exp', sign: 1 },
    gold: { name: '돈', pct: true, mod: 'gold', sign: 1 },
    stamina: { name: '스태미나', pct: false, mod: 'stamina', sign: 1 }
  };
  /* 등급 — 접사 개수·세기(원본 보통·마법·희귀·영웅·전설 + 세트) */
  var GRADE = {
    '보통': { n: [0, 0], mul: 1, color: '#e0e0e0', w: 60 }, '마법': { n: [1, 2], mul: 1, color: '#4aa3f0', w: 28 },
    '희귀': { n: [3, 4], mul: 1, color: '#f0d04a', w: 9 }, '영웅': { n: [4, 4], mul: 1.5, color: '#f0a53a', w: 2.5 },
    '전설': { n: [5, 5], mul: 2, color: '#ff7043', w: 0.5 }, '세트': { n: [2, 2], mul: 1, color: '#3ddc84', w: 0 }
  };
  var G_ORDER = ['보통', '마법', '희귀', '영웅', '전설'];
  /* 접사 — 최소~최대(굴림) · 붙는 부위 */
  var AFFIX = [
    { k: 'atk', lo: 0.04, hi: 0.12, slots: 'weapon,charm' }, { k: 'guard', lo: 0.03, hi: 0.08, slots: 'armor,charm' },
    { k: 'speed', lo: 0.03, hi: 0.08, slots: 'armor,charm' }, { k: 'exp', lo: 0.05, hi: 0.15, slots: 'weapon,armor,charm' },
    { k: 'gold', lo: 0.05, hi: 0.2, slots: 'weapon,armor,charm' }, { k: 'stamina', lo: 10, hi: 25, slots: 'armor,charm' }
  ];
  /* 보석 — 박는 부위에 따라 다른 것을 준다(원본 data-gem.js 규칙: 무기 공격 · 갑주 방어 · 부적 능력) */
  var GEM = {
    '불': { weapon: ['atk', 0.05], armor: ['guard', 0.03], charm: ['exp', 0.06], color: '#ff6b3d' },
    '물': { weapon: ['atk', 0.03], armor: ['guard', 0.05], charm: ['stamina', 15], color: '#3da5ff' },
    '얼음': { weapon: ['atk', 0.04], armor: ['guard', 0.04], charm: ['speed', 0.04], color: '#a8ecff' },
    '번개': { weapon: ['atk', 0.06], armor: ['guard', 0.02], charm: ['gold', 0.1], color: '#c07bff' },
    '바람': { weapon: ['atk', 0.02], armor: ['guard', 0.02], charm: ['speed', 0.08], color: '#5ee6b0' }
  };
  var RUNE_ONE = ['atk', 0.01]; // 룬 한 글자만으로는 공격 +1%

  /* "atk 0.2, speed 0.05" → [[atk,0.2],[speed,0.05]] */
  function parseBonus(s) {
    if (Array.isArray(s)) { s = s.join(','); }
    return String(s || '').split(',').map(function (x) { var p = x.trim().split(/\s+/); return [p[0], num(p[1], 0)]; })
      .filter(function (b) { return STAT[b[0]] && b[1]; });
  }
  function statText(k, v) {
    var st = STAT[k]; if (!st) { return ''; }
    if (!st.pct) { return st.name + ' ' + (v >= 0 ? '+' : '') + Math.round(v); }
    var p = Math.round(v * 100 * st.sign);
    return st.name + ' ' + (p >= 0 ? '+' : '') + p + '%';
  }
  function csv(s) { return (Array.isArray(s) ? s : String(s || '').split(',')).map(function (x) { return String(x).trim(); }).filter(Boolean); }

  SIM.GEAR = { SLOTS: SLOTS, STAT: STAT, GRADE: GRADE, AFFIX: AFFIX, GEM: GEM, parseBonus: parseBonus, statText: statText };

  /* ════════════════════════════════════════════════════════════════════════
     컴포넌트·행동·이벤트 등록
     ════════════════════════════════════════════════════════════════════════ */
  SIM.addDo('gear', { label: '장비 주기', f: { base: ['s', '', '밑감 id(설정 "장비")'], grade: ['sel:|보통|마법|희귀|영웅|전설|세트', '', '등급(비우면 굴림)'] } });
  SIM.addDo('gearOpen', { label: '장비 창 열기', f: {} });

  SIM.addComp('room', { label: '꾸미기 방', hint: '이 개체의 몸(크기) 안에서 H 로 가진 가구를 놓는다. 가구는 설정 "가구" 표, 개수는 변수. 놓은 자리는 저장된다.',
    f: { name: ['s', '내 방', '이름'] } });
  SIM.addComp('town', { label: '영지', hint: '가까이서 F 로 다스린다(개발·징병·성벽·출진·화친). 턴마다 수입. 주인이 바뀌면 "영지를 얻었을/잃었을 때" 이벤트.',
    f: { name: ['s', '', '영지 이름(비우면 개체 이름)'], owner: ['sel:player|enemy|neutral', 'neutral', '주인(player 나 · enemy 적 · neutral 중립)'],
         income: ['n', 10, '턴마다 돈'], troops: ['n', 30, '병력'], wall: ['n', 1, '성벽(방어 배율 +10%씩)'], grow: ['n', 5, '턴마다 병력 증가(적·중립)'] } });
  SIM.addComp('dungeon', { label: '무작위 던전', hint: '장면이 시작될 때 이 자리를 가운데로 방·복도를 짓는다. 적은 "원본 개체 id"(처음엔 없음)를 복제. 첫 방에 플레이어, 마지막 방에 출구.',
    f: { seed: ['n', 0, '씨앗(0 이면 들어갈 때마다 다름)'], rooms: ['n', 7, '방 수'], cell: ['n', 2, '칸 크기(m)'], grid: ['n', 26, '칸 수(한 변)'],
         wall: ['s', '#4a4238', '벽 색'], height: ['n', 3, '벽 높이'], from: ['s', '', '적 원본 개체 id'], foes: ['n', 2, '방마다 적 수'],
         chest: ['n', 0.4, '방마다 상자 확률'], exit: ['sel:goal|portal', 'goal', '출구(goal 이김 · portal 장면 이동)'], scene: ['scene', '', '출구 장면(portal)'] } });

  SIM.addWhen('townTaken', { label: '영지를 얻었을 때', f: { name: ['s', '', '영지 이름(비우면 아무)'] } });
  SIM.addWhen('townLost', { label: '영지를 잃었을 때', f: { name: ['s', '', '영지 이름(비우면 아무)'] } });
  SIM.addWhen('turn', { label: '턴이 지났을 때(영지)', f: {} });

  /* ════════════════════════════════════════════════════════════════════════
     1) 장비
     ════════════════════════════════════════════════════════════════════════ */
  SIM.addSystem('gear', function (K, P) {
    var S = K.S, cfg = P.gear || {};
    var BASES = {};
    (cfg.bases || []).forEach(function (b) { if (b && b.id) { BASES[b.id] = b; } });
    var SETS = (cfg.sets || []).map(function (s) { return { name: s.name, pieces: csv(s.pieces), b2: parseBonus(s.b2), b3: parseBonus(s.b3) }; }).filter(function (s) { return s.name && s.pieces.length; });
    var WORDS = (cfg.runewords || []).map(function (w) { return { name: w.name, runes: csv(w.runes), slot: w.slot || '', bonus: parseBonus(w.bonus) }; }).filter(function (w) { return w.name && w.runes.length; });
    var on = Object.keys(BASES).length > 0;
    var G = null, applied = {};
    function fresh() { G = { bag: [], eq: { weapon: null, armor: null, charm: null }, uid: 0 }; }
    fresh();

    function setOf(baseId) { for (var i = 0; i < SETS.length; i++) { if (SETS[i].pieces.indexOf(baseId) >= 0) { return SETS[i]; } } return null; }
    function rollGrade() {
      var tot = 0, i; for (i = 0; i < G_ORDER.length; i++) { tot += GRADE[G_ORDER[i]].w; }
      var r = K.rng() * tot;
      for (i = 0; i < G_ORDER.length; i++) { r -= GRADE[G_ORDER[i]].w; if (r < 0) { return G_ORDER[i]; } }
      return '보통';
    }
    function roll(baseId, grade) {
      var b = BASES[baseId]; if (!b) { return null; }
      grade = GRADE[grade] ? grade : rollGrade();
      if (grade === '세트' && !setOf(baseId)) { grade = '희귀'; }
      var gd = GRADE[grade], slot = SLOTS[b.slot] ? b.slot : 'weapon';
      var n = gd.n[0] + Math.floor(K.rng() * (gd.n[1] - gd.n[0] + 1));
      var pool = AFFIX.filter(function (a) { return a.slots.indexOf(slot) >= 0; }), aff = [];
      for (var i = 0; i < n && pool.length; i++) {
        var j = Math.floor(K.rng() * pool.length), a = pool.splice(j, 1)[0];
        var v = (a.lo + (a.hi - a.lo) * K.rng()) * gd.mul;
        aff.push([a.k, a.k === 'stamina' ? Math.round(v) : Math.round(v * 1000) / 1000]);
      }
      var maxS = Math.max(0, Math.min(4, Math.round(num(b.sockets, slot === 'charm' ? 0 : 2))));
      var sockets = grade === '보통' ? maxS : Math.min(maxS, Math.floor(K.rng() * (maxS + 1)));
      return { uid: ++G.uid, base: baseId, name: b.name || baseId, slot: slot, grade: grade, aff: aff, sockets: sockets, socketed: [], set: grade === '세트' ? setOf(baseId).name : '' };
    }
    function baseStats(it) {
      var b = BASES[it.base] || {}, out = [];
      if (num(b.atk, 0)) { out.push(['atk', num(b.atk, 0)]); }
      if (num(b.guard, 0)) { out.push(['guard', num(b.guard, 0)]); }
      return out;
    }
    function word(it) {
      if (!it.socketed.length || it.socketed.length < it.sockets) { return null; }
      var runes = it.socketed.map(function (s) { return s.indexOf('rune:') === 0 ? s.slice(5) : null; });
      if (runes.some(function (r) { return r == null; })) { return null; }
      for (var i = 0; i < WORDS.length; i++) {
        var w = WORDS[i];
        if (w.slot && w.slot !== it.slot) { continue; }
        if (w.runes.length === runes.length && w.runes.every(function (r, k) { return r === runes[k]; })) { return w; }
      }
      return null;
    }
    function itemStats(it) {
      var out = baseStats(it).concat(it.aff.map(function (a) { return a.slice(); }));
      var w = word(it);
      it.socketed.forEach(function (s) {
        if (s.indexOf('gem:') === 0) { var g = GEM[s.slice(4)]; if (g && g[it.slot]) { out.push(g[it.slot].slice()); } }
        else if (!w) { out.push(RUNE_ONE.slice()); }
      });
      if (w) { out = out.concat(w.bonus.map(function (b) { return b.slice(); })); }
      return out;
    }
    function label(it) {
      var w = word(it);
      return (w ? '《' + w.name + '》 ' : '') + it.name + (it.grade !== '보통' ? ' [' + it.grade + ']' : '');
    }
    function setCount(name) { var n = 0; for (var k in G.eq) { if (G.eq[k] && G.eq[k].set === name) { n++; } } return n; }
    function totals() {
      var t = {};
      function add(b) { t[b[0]] = (t[b[0]] || 0) + b[1]; }
      for (var k in G.eq) { if (G.eq[k]) { itemStats(G.eq[k]).forEach(add); } }
      SETS.forEach(function (s) { var n = setCount(s.name); if (n >= 2) { s.b2.forEach(add); } if (n >= 3) { s.b3.forEach(add); } });
      if (t.guard) { t.guard = Math.min(0.75, t.guard); }
      return t;
    }
    /* 배율에 반영 — 지난번에 더한 만큼 빼고 새로 더한다(특성·레벨이 만진 몫은 그대로) */
    function apply() {
      var t = totals(), k;
      for (k in applied) { var st = STAT[k]; if (st) { S.mods[st.mod] = num(S.mods[st.mod], st.mod === 'stamina' ? 0 : 1) - applied[k] * st.sign; } }
      for (k in t) { var s2 = STAT[k]; if (s2) { S.mods[s2.mod] = num(S.mods[s2.mod], s2.mod === 'stamina' ? 0 : 1) + t[k] * s2.sign; } }
      applied = t;
    }
    /* 같은 능력은 합쳐서 한 번만 보인다 */
    function statLine(list) {
      var sum = {}, order = [];
      list.forEach(function (b) { if (!(b[0] in sum)) { sum[b[0]] = 0; order.push(b[0]); } sum[b[0]] += b[1]; });
      return order.map(function (k) { return statText(k, sum[k]); }).filter(Boolean).join(' · ');
    }

    /* 변수로 들어온 장비를 굴려 가방에 */
    function intake() {
      for (var k in S.vars) {
        if (k.indexOf('gear:') !== 0) { continue; }
        var n = Math.round(num(S.vars[k], 0)), p = k.split(':');
        delete S.vars[k];
        for (var i = 0; i < n; i++) {
          var it = roll(p[1], p[2] || '');
          if (!it) { continue; }
          G.bag.push(it);
          K.toast('장비: ' + label(it), 2.5);
          if (it.grade === '전설' || it.grade === '영웅' || it.grade === '세트') { K.fx({ type: 'pop', text: it.grade + ' 장비: ' + it.name, color: GRADE[it.grade].color }); }
        }
      }
    }

    function equip(it) {
      var i = G.bag.indexOf(it); if (i < 0) { return; }
      G.bag.splice(i, 1);
      if (G.eq[it.slot]) { G.bag.push(G.eq[it.slot]); }
      G.eq[it.slot] = it;
      apply(); K.fx({ type: 'sound', name: 'door' });
    }
    function unequip(slot) { if (G.eq[slot]) { G.bag.push(G.eq[slot]); G.eq[slot] = null; apply(); } }
    function socket(it, what) {
      if (it.socketed.length >= it.sockets || K.getVar(what) < 1) { return false; }
      K.addVar(what, -1);
      it.socketed.push(what);
      var w = word(it);
      if (w) { K.toast('부문어 완성: 《' + w.name + '》', 3); K.fx({ type: 'sound', name: 'win' }); } else { K.fx({ type: 'sound', name: 'coin' }); }
      apply();
      return true;
    }
    function salvage(it) {
      var i = G.bag.indexOf(it); if (i < 0) { return; }
      G.bag.splice(i, 1);
      var g = 2 + G_ORDER.indexOf(it.grade) * 6 + (it.grade === '세트' ? 12 : 0);
      K.addVar(cfg.goldVar || 'gold', g);
      K.toast(jo(it.name, '을', '를') + ' 분해했다 — ' + (cfg.goldVar || 'gold') + ' +' + g, 2);
    }

    /* 창 — 메뉴 셋(장비 / 한 점 / 박을 것) */
    function socketables() {
      return Object.keys(S.vars).filter(function (k) { return (k.indexOf('gem:') === 0 || k.indexOf('rune:') === 0) && K.getVar(k) > 0; });
    }
    function openMain(cur) {
      var rows = [];
      Object.keys(SLOTS).forEach(function (sl) {
        var it = G.eq[sl];
        rows.push({ label: SLOTS[sl] + ': ' + (it ? label(it) : '(없음)'), sub: it ? statLine(itemStats(it)) : '', it: it, slot: sl, color: it ? GRADE[it.grade].color : '' });
      });
      G.bag.forEach(function (it) { rows.push({ label: '가방 · ' + SLOTS[it.slot] + ' · ' + label(it), sub: statLine(itemStats(it)) + (it.sockets ? ' · 소켓 ' + it.socketed.length + '/' + it.sockets : ''), it: it, color: GRADE[it.grade].color }); });
      var t = totals(), setsOn = SETS.filter(function (s) { return setCount(s.name) >= 2; }).map(function (s) { return s.name + ' ' + setCount(s.name) + '점'; });
      K.openMenu({ title: '장비 — ' + (statLine(Object.keys(t).map(function (k) { return [k, t[k]]; })) || '능력 없음') + (setsOn.length ? ' · 세트: ' + setsOn.join(', ') : ''),
        kind: 'gear', items: rows, cur: cur || 0, onPick: function (row) { if (row.it) { openItem(row.it, !!row.slot); } } });
    }
    function openItem(it, worn) {
      var rows = [];
      if (worn) { rows.push({ label: '벗기', act: 'off' }); } else { rows.push({ label: '장착', act: 'eq' }); }
      if (it.socketed.length < it.sockets) { rows.push({ label: '소켓에 박기 (' + it.socketed.length + '/' + it.sockets + ') — 한 번 박으면 못 뺀다', act: 'sock', disabled: !socketables().length }); }
      if (!worn) { rows.push({ label: '분해(돈으로)', act: 'salv' }); }
      rows.push({ label: '돌아가기', act: 'back' });
      var s = setOf(it.base);
      var info = statLine(itemStats(it)) + (it.socketed.length ? ' · 박은 것: ' + it.socketed.map(function (x) { return x.split(':')[1]; }).join('-') : '') +
        (it.set ? ' · 세트 ' + it.set + '(' + s.pieces.map(function (p) { return (BASES[p] || {}).name || p; }).join('·') + ')' : '');
      K.openMenu({ title: label(it) + ' — ' + info, kind: 'gear', items: rows, onPick: function (row) {
        if (row.act === 'eq') { equip(it); openMain(); } else if (row.act === 'off') { unequip(it.slot); openMain(); }
        else if (row.act === 'salv') { salvage(it); openMain(); } else if (row.act === 'sock') { openSock(it, worn); } else { openMain(); }
      } });
    }
    function openSock(it, worn) {
      var rows = socketables().map(function (k) {
        var p = k.split(':'), what = p[0] === 'gem' ? '보석 ' + p[1] : '룬 ' + p[1];
        var eff = p[0] === 'gem' && GEM[p[1]] ? statText(GEM[p[1]][it.slot][0], GEM[p[1]][it.slot][1]) : '(글자를 순서대로 모으면 부문어)';
        return { label: what + ' ×' + K.getVar(k), sub: eff, key: k };
      });
      rows.push({ label: '돌아가기', key: '' });
      K.openMenu({ title: '무엇을 박을까 — ' + label(it), kind: 'gear', items: rows, onPick: function (row) {
        if (row.key) { socket(it, row.key); }
        if (it.socketed.length < it.sockets && socketables().length && row.key) { openSock(it, worn); } else { openItem(it, worn); }
      } });
    }

    K.onDo('gear', function (a) { if (!a.base) { return; } var k = 'gear:' + a.base + (a.grade ? ':' + a.grade : ''); K.addVar(k, 1); intake(); });
    K.onDo('gearOpen', function () { openMain(); });

    function step(dt, inp) {
      intake();
      if (on && inp && inp.keys && inp.keys.KeyG) { openMain(); }
      return false;
    }
    function reset() { fresh(); applied = {}; }
    function save() { return { G: G, applied: applied }; }
    function load(o) { if (o && o.G) { G = o.G; applied = o.applied || {}; } }
    return { step: step, reset: reset, save: save, load: load, open: openMain, roll: roll, equip: equip, unequip: unequip, socket: socket, salvage: salvage,
      totals: totals, word: word, label: label, state: function () { return G; }, on: on };
  });

  /* ════════════════════════════════════════════════════════════════════════
     2) 꾸미기(가구 배치)
     ════════════════════════════════════════════════════════════════════════ */
  SIM.addSystem('housing', function (K, P) {
    var S = K.S;
    var FURN = (P.furniture || []).filter(function (f) { return f && f.var; });
    var byVar = {}; FURN.forEach(function (f) { byVar[f.var] = f; });
    function key() { return 'furn:' + S.sceneId; }
    function list() { return S.flags[key()] || (S.flags[key()] = []); }
    function roomAt(p) {
      return S.ents.filter(function (e) { if (!e.alive || !e.comps.room) { return false; } var b = K.box(e); return p[0] >= b.x0 && p[0] <= b.x1 && p[2] >= b.z0 && p[2] <= b.z1; })[0] || null;
    }
    function defOf(f, it, i) {
      var sz = [num(f.w, 1), num(f.h, 1), num(f.d, 1)];
      var look = f.model ? { shape: 'model', model: f.model, fit: sz[1] } : { shape: f.shape || 'box', color: f.color || '#c8a27a' };
      return { id: 'furn~' + i, name: f.name || f.var, tag: 'furniture', look: look, scale: f.model ? [1, 1, 1] : sz, rot: [0, it.rot || 0, 0],
        body: { type: 'solid', size: f.model ? sz : [1, 1, 1] } };
    }
    function build() {
      S.ents.forEach(function (e) { if (e.alive && e.def && e.def.tag === 'furniture' && String(e.id).indexOf('furn~') === 0) { e.alive = false; } });
      list().forEach(function (it, i) { var f = byVar[it.var]; if (f) { var o = K.spawnDef(defOf(f, it, i), it.pos.slice()); o.furnIdx = i; } });
    }
    function spot(pl) {
      var yaw = pl.r[1] * Math.PI / 180;
      return [Math.round(pl.p[0] + Math.sin(yaw) * 1.6), pl.p[1], Math.round(pl.p[2] + Math.cos(yaw) * 1.6)];
    }
    function nearestPlaced(pl) {
      var best = -1, bd = 2.4;
      list().forEach(function (it, i) { var d = dist2(it.pos, pl.p); if (d < bd) { bd = d; best = i; } });
      return best;
    }
    function place(v) {
      var pl = S.player, f = byVar[v]; if (!pl || !f || K.getVar(v) < 1) { return false; }
      var at = spot(pl), room = roomAt(at);
      if (!room) { K.toast('방 안에만 놓을 수 있다', 1.5); return false; }
      var b = K.box(room); at[1] = b.y0 + (room.body.type === 'solid' ? b.y1 - b.y0 : 0);
      if (list().some(function (it) { return it.pos[0] === at[0] && it.pos[2] === at[2]; })) { K.toast('그 칸엔 이미 있다', 1.5); return false; }
      K.addVar(v, -1);
      list().push({ var: v, pos: at, rot: Math.round(pl.r[1] / 90) * 90 % 360 });
      build(); K.fx({ type: 'sound', name: 'door' });
      return true;
    }
    function takeBack() {
      var i = nearestPlaced(S.player); if (i < 0) { K.toast('가까이 치울 가구가 없다', 1.5); return false; }
      var it = list().splice(i, 1)[0]; K.addVar(it.var, 1); build(); K.fx({ type: 'sound', name: 'blip' });
      return true;
    }
    function turn() {
      var i = nearestPlaced(S.player); if (i < 0) { K.toast('가까이 돌릴 가구가 없다', 1.5); return false; }
      list()[i].rot = ((list()[i].rot || 0) + 90) % 360; build();
      return true;
    }
    function open() {
      var room = S.player && roomAt(S.player.p);
      if (!room) { K.toast('꾸미기는 방 안에서(H)', 1.5); return; }
      var rows = FURN.filter(function (f) { return K.getVar(f.var) > 0; }).map(function (f) { return { label: (f.icon ? f.icon + ' ' : '') + (f.name || f.var) + ' ×' + K.getVar(f.var) + ' — 앞에 놓기', v: f.var }; });
      rows.push({ label: '가까운 가구 돌리기(90도)', act: 'turn' }, { label: '가까운 가구 치우기', act: 'take' }, { label: '닫기', act: 'close' });
      K.openMenu({ title: '꾸미기 — ' + (room.comps.room.name || room.name) + ' (놓은 것 ' + list().length + ')', kind: 'housing', items: rows, onPick: function (row) {
        if (row.v) { place(row.v); } else if (row.act === 'turn') { turn(); } else if (row.act === 'take') { takeBack(); }
        if (row.act === 'close') { S.menu = null; } else { open(); }
      } });
    }
    function enter() { if (FURN.length) { build(); } }
    function step(dt, inp) { if (FURN.length && inp && inp.keys && inp.keys.KeyH) { open(); } return false; }
    return { enter: enter, step: step, open: open, place: place, takeBack: takeBack, turn: turn, placed: list };
  });

  /* ════════════════════════════════════════════════════════════════════════
     3) 영지 경영·전쟁
     ════════════════════════════════════════════════════════════════════════ */
  SIM.addSystem('realm', function (K, P) {
    var S = K.S, cfg = P.realm || {};
    var turnSec = Math.max(3, num(cfg.turnSec, 30)), goldVar = cfg.goldVar || 'gold', T = null, acc = 0;
    function towns() { return S.ents.filter(function (e) { return e.alive && e.comps.town; }); }
    /* 영지 상태는 장면을 오가도 남는다(깃발 대신 S.flags 에) */
    function st(e) {
      var k = 'town:' + S.sceneId + ':' + e.id;
      if (!S.flags[k]) { var c = e.comps.town; S.flags[k] = { owner: c.owner || 'neutral', income: num(c.income, 10), troops: num(c.troops, 30), wall: num(c.wall, 1), peace: 0 }; }
      return S.flags[k];
    }
    function nameOf(e) { return e.comps.town.name || e.name; }
    function count() { var n = 0; towns().forEach(function (e) { if (st(e).owner === 'player') { n++; } }); K.setVar(cfg.townsVar || 'towns', n); return n; }
    function power(t, defending) { return t.troops * (defending ? 1 + 0.1 * t.wall : 1); }
    /* 자동 전투 — 양쪽 힘에 ±15% 운. 이긴 쪽 남은 병력 = 차이의 비율 */
    function battle(att, def, defE) {
      var a = att.troops * (0.85 + K.rng() * 0.3), d = power(def, true) * (0.85 + K.rng() * 0.3);
      if (a > d) { var left = Math.max(1, Math.round(att.troops * (1 - d / a))); return { win: true, left: left }; }
      return { win: false, left: Math.max(0, Math.round(def.troops * (1 - a / d))) };
    }
    function capture(e, newOwner, troops) {
      var s = st(e), was = s.owner;
      s.owner = newOwner; s.troops = troops; s.wall = Math.max(1, s.wall - 1);
      count();
      if (newOwner === 'player') { K.toast(jo(nameOf(e), '을', '를') + ' 얻었다!', 3); K.fx({ type: 'sound', name: 'win' }); K.fireWhen('townTaken', function (w) { return !w.name || w.name === nameOf(e); }, { other: e }); }
      if (was === 'player') { K.toast(jo(nameOf(e), '을', '를') + ' 빼앗겼다…', 3); K.fx({ type: 'sound', name: 'lose' }); K.fireWhen('townLost', function (w) { return !w.name || w.name === nameOf(e); }, { other: e }); }
    }
    function march(from, to) {
      var a = st(from), d = st(to), send = Math.floor(a.troops * 0.8);
      if (send < 1) { K.toast('보낼 병력이 없다', 1.5); return; }
      a.troops -= send;
      var r = battle({ troops: send }, d, to);
      if (r.win) { capture(to, 'player', r.left); } else { d.troops = r.left; K.toast('출진 실패 — ' + nameOf(to) + ' 남은 병력 ' + r.left, 3); K.fx({ type: 'sound', name: 'hit' }); }
    }
    function turn() {
      T.n++;
      var inc = 0;
      towns().forEach(function (e) {
        var s = st(e);
        if (s.owner === 'player') { inc += s.income; } else { s.troops += num(e.comps.town.grow, 5); }
        if (s.peace > 0) { s.peace--; }
      });
      if (inc) { K.addVar(goldVar, inc); }
      /* 적 영지의 공격 — 가장 약한 내 영지를 병력이 1.3배 넘으면 친다(화친 중엔 안 친다) */
      var mine = towns().filter(function (e) { return st(e).owner === 'player'; });
      towns().forEach(function (e) {
        var s = st(e);
        if (s.owner !== 'enemy' || s.peace > 0 || !mine.length) { return; }
        var tgt = mine.slice().sort(function (x, y) { return power(st(x), true) - power(st(y), true); })[0];
        if (s.troops > power(st(tgt), true) * 1.3) {
          var send = Math.floor(s.troops * 0.7); s.troops -= send;
          var r = battle({ troops: send }, st(tgt), tgt);
          if (r.win) { capture(tgt, 'enemy', r.left); mine = mine.filter(function (m) { return m !== tgt; }); } else { st(tgt).troops = r.left; K.toast(nameOf(tgt) + ' 이(가) 적의 공격을 막았다', 2.5); }
        }
      });
      count();
      K.setVar(cfg.turnVar || 'turn', T.n);
      K.fireWhen('turn', null, {});
    }
    var COST = { dev: 30, draft: 20, wall: 40, peace: 50 };
    function open(e) {
      var s = st(e), mine = s.owner === 'player', OWN = { player: '내 영지', enemy: '적', neutral: '중립' };
      var rows = [];
      if (mine) {
        rows.push({ label: '개발 — 수입 +5', sub: '돈 ' + COST.dev, act: 'dev', disabled: K.getVar(goldVar) < COST.dev });
        rows.push({ label: '징병 — 병력 +15', sub: '돈 ' + COST.draft, act: 'draft', disabled: K.getVar(goldVar) < COST.draft });
        rows.push({ label: '성벽 — 방어 +10%', sub: '돈 ' + COST.wall, act: 'wall', disabled: K.getVar(goldVar) < COST.wall });
        towns().filter(function (o) { return st(o).owner !== 'player'; }).forEach(function (o) {
          var so = st(o);
          rows.push({ label: '출진 → ' + nameOf(o) + '(' + OWN[so.owner] + ')', sub: '병력 ' + Math.floor(s.troops * 0.8) + ' 대 ' + so.troops + ' · 성벽 ' + so.wall, act: 'march', to: o, disabled: s.troops < 2 });
        });
      } else if (s.owner === 'enemy') {
        rows.push({ label: '화친 — 5턴 동안 공격하지 않는다', sub: '돈 ' + COST.peace, act: 'peace', disabled: K.getVar(goldVar) < COST.peace || s.peace > 0 });
      }
      rows.push({ label: '닫기', act: 'close' });
      K.openMenu({ title: nameOf(e) + ' — ' + OWN[s.owner] + ' · 병력 ' + s.troops + ' · 수입 ' + s.income + ' · 성벽 ' + s.wall + (s.peace ? ' · 화친 ' + s.peace + '턴' : '') + ' · 턴 ' + T.n,
        kind: 'realm', items: rows, onPick: function (row) {
          if (row.act === 'close') { S.menu = null; return; }
          if (row.act === 'dev') { K.addVar(goldVar, -COST.dev); s.income += 5; }
          if (row.act === 'draft') { K.addVar(goldVar, -COST.draft); s.troops += 15; }
          if (row.act === 'wall') { K.addVar(goldVar, -COST.wall); s.wall += 1; }
          if (row.act === 'peace') { K.addVar(goldVar, -COST.peace); s.peace = 5; K.toast(nameOf(e) + ' 와(과) 화친했다', 2); }
          K.fx({ type: 'sound', name: 'coin' });
          if (row.act === 'march') { S.menu = null; march(e, row.to); return; }
          open(e);
        } });
    }
    function act(pl, reach) {
      /* 성은 크니까 가운데가 아니라 상자 가장자리까지 잰다 */
      var e = null, bd = reach + 0.6;
      towns().forEach(function (o) {
        var b = K.box(o), dx = Math.max(b.x0 - pl.p[0], 0, pl.p[0] - b.x1), dz = Math.max(b.z0 - pl.p[2], 0, pl.p[2] - b.z1), d = Math.hypot(dx, dz);
        if (d < bd && Math.abs(o.p[1] - pl.p[1]) < 4) { bd = d; e = o; }
      });
      if (!e) { return false; }
      open(e); return true;
    }
    function enter() { acc = 0; towns().forEach(st); if (towns().length) { count(); } }
    function step(dt) {
      if (!towns().length) { return false; }
      acc += dt;
      if (acc >= turnSec) { acc -= turnSec; turn(); }
      return false;
    }
    function reset() { T = { n: 0 }; acc = 0; }
    reset();
    function save() { return T; }
    function load(o) { if (o) { T = o; } }
    return { enter: enter, step: step, act: act, reset: reset, save: save, load: load, turn: turn, march: march, state: st, open: open, left: function () { return turnSec - acc; } };
  });

  /* ════════════════════════════════════════════════════════════════════════
     4) 무작위 던전
     ════════════════════════════════════════════════════════════════════════ */
  /* 칸 격자에 방을 흩고, 방 가운데끼리 ㄱ자 복도로 잇는다(순서대로 = 첫 방에서 마지막 방까지 한 줄로 이어진다) */
  function genDungeon(c, seed) {
    var rng = SIM.mulberry32(seed >>> 0), N = Math.max(12, Math.min(60, Math.round(num(c.grid, 26)))), want = Math.max(2, Math.min(20, Math.round(num(c.rooms, 7))));
    var map = [], x, z, i;
    for (z = 0; z < N; z++) { map.push([]); for (x = 0; x < N; x++) { map[z].push(1); } }
    var rooms = [];
    for (var tries = 0; tries < want * 30 && rooms.length < want; tries++) {
      var w = 3 + Math.floor(rng() * 4), h = 3 + Math.floor(rng() * 4);
      var rx = 1 + Math.floor(rng() * (N - w - 2)), rz = 1 + Math.floor(rng() * (N - h - 2));
      if (rooms.some(function (r) { return rx < r.x + r.w + 1 && rx + w + 1 > r.x && rz < r.z + r.h + 1 && rz + h + 1 > r.z; })) { continue; }
      rooms.push({ x: rx, z: rz, w: w, h: h, cx: rx + Math.floor(w / 2), cz: rz + Math.floor(h / 2) });
    }
    rooms.forEach(function (r) { for (var zz = r.z; zz < r.z + r.h; zz++) { for (var xx = r.x; xx < r.x + r.w; xx++) { map[zz][xx] = 0; } } });
    /* 가까운 차례로 줄 세우기 — 첫 방에서 먼 방까지 */
    var order = [rooms[0]], rest = rooms.slice(1);
    while (rest.length) {
      var last = order[order.length - 1], bi = 0, bd = 1e9;
      rest.forEach(function (r, k) { var d = Math.abs(r.cx - last.cx) + Math.abs(r.cz - last.cz); if (d < bd) { bd = d; bi = k; } });
      order.push(rest.splice(bi, 1)[0]);
    }
    function carveH(x0, x1, zz) { for (var xx = Math.min(x0, x1); xx <= Math.max(x0, x1); xx++) { map[zz][xx] = 0; } }
    function carveV(z0, z1, xx) { for (var zz = Math.min(z0, z1); zz <= Math.max(z0, z1); zz++) { map[zz][xx] = 0; } }
    for (i = 1; i < order.length; i++) {
      var a = order[i - 1], b = order[i];
      if (rng() < 0.5) { carveH(a.cx, b.cx, a.cz); carveV(a.cz, b.cz, b.cx); } else { carveV(a.cz, b.cz, a.cx); carveH(a.cx, b.cx, b.cz); }
    }
    /* 벽 — 빈칸에 닿은 벽 칸만, 가로로 이어 붙여 상자 수를 줄인다 */
    var walls = [];
    function edge(xx, zz) {
      for (var dz = -1; dz <= 1; dz++) { for (var dx = -1; dx <= 1; dx++) { var nx = xx + dx, nz = zz + dz; if (nx >= 0 && nz >= 0 && nx < N && nz < N && !map[nz][nx]) { return true; } } }
      return false;
    }
    for (z = 0; z < N; z++) {
      x = 0;
      while (x < N) {
        if (map[z][x] && edge(x, z)) { var x0 = x; while (x < N && map[z][x] && edge(x, z)) { x++; } walls.push({ x: x0, z: z, w: x - x0 }); } else { x++; }
      }
    }
    return { N: N, map: map, rooms: order, walls: walls };
  }
  SIM.genDungeon = genDungeon;

  SIM.addSystem('dungeon', function (K, P) {
    var S = K.S, visits = 0, last = null, pending = null;
    function enter() {
      var mk = S.ents.filter(function (e) { return e.alive && e.comps.dungeon; })[0];
      if (!mk) { last = null; return; }
      visits++;
      var c = mk.comps.dungeon, cell = Math.max(1, num(c.cell, 2)), hgt = Math.max(1, num(c.height, 3));
      var seed = pending || num(c.seed, 0) || Math.floor(K.rng() * 1e9) + visits;
      pending = null;
      var D = genDungeon(c, seed), off = [mk.p[0] - D.N * cell / 2, mk.p[1], mk.p[2] - D.N * cell / 2];
      function at(cx, cz) { return [off[0] + (cx + 0.5) * cell, off[1], off[2] + (cz + 0.5) * cell]; }
      D.walls.forEach(function (w, i) {
        K.spawnDef({ id: 'dwall', name: '벽', look: { shape: 'box', color: c.wall || '#4a4238' }, scale: [w.w * cell, hgt, cell], body: { type: 'solid' } },
          [off[0] + (w.x + w.w / 2) * cell, off[1], off[2] + (w.z + 0.5) * cell]);
      });
      var first = D.rooms[0], lastR = D.rooms[D.rooms.length - 1];
      if (S.player) { S.player.p = at(first.cx, first.cz); S.player.v = [0, 0, 0]; S.entry = S.player.p.slice(); }
      var src = c.from ? (S.scene.entities || []).filter(function (d) { return d.id === c.from; })[0] : null;
      var rng = SIM.mulberry32((seed ^ 0x9e3779b9) >>> 0);
      D.rooms.forEach(function (r, ri) {
        if (ri === 0) { return; }
        var n = Math.round(num(c.foes, 2));
        for (var k = 0; src && k < n; k++) {
          var o = K.spawnDef(src, at(r.x + Math.floor(rng() * r.w), r.z + Math.floor(rng() * r.h)));
          o.def.off = false;
        }
        if (ri < D.rooms.length - 1 && rng() < num(c.chest, 0.4)) {
          K.spawnDef({ id: 'dchest', name: '보물 상자', look: { shape: 'box', color: '#8c5c33' }, scale: [1, 0.7, 0.7], body: { type: 'solid' },
            comps: { chest: Object.assign(SIM.compDefaults('chest'), { grade: rng() < 0.2 ? 'precious' : 'common', lock: 'camp' }) } }, at(r.x, r.z));
        }
      });
      var exitDef = c.exit === 'portal' && c.scene ?
        { id: 'dexit', name: '출구', look: { shape: 'torus', color: '#9b5de5', glow: true, label: '출구' }, scale: [2, 2, 2], body: { type: 'trigger', size: [0.8, 1, 0.4] }, comps: { spin: { speed: 40 }, portal: { scene: c.scene, at: '' } } } :
        { id: 'dexit', name: '출구', look: { shape: 'cylinder', color: '#ffffff', glow: true, label: '출구' }, scale: [0.3, 3, 0.3], body: { type: 'trigger', size: [5, 1, 5] }, comps: { goal: { text: '던전을 빠져나왔다!' } } };
      K.spawnDef(exitDef, at(lastR.cx, lastR.cz));
      last = { seed: seed, rooms: D.rooms.length, walls: D.walls.length, first: at(first.cx, first.cz), exit: at(lastR.cx, lastR.cz) };
    }
    function reset() { visits = 0; pending = null; }
    function save() { return last ? { seed: last.seed, visits: visits } : null; }
    function load(o) { if (o && o.seed) { pending = o.seed; visits = o.visits || 0; } }
    return { enter: enter, reset: reset, save: save, load: load, info: function () { return last; } };
  });
})(typeof window !== 'undefined' ? window : globalThis);
