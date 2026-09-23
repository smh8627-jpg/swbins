/**
 * 사가 엔진 — 시뮬레이션 핵심(sim). three 없이 돈다(브라우저·node 둘 다) — 그래서 node 로 진단한다.
 *
 * 게임은 데이터(project.json)다. 이 파일이 그 데이터를 "규칙"으로 돌린다:
 *   장면(scene) · 개체(entity: 자리·모양·몸·컴포넌트·이벤트) · 전역 변수(vars) · 이벤트(언제 → 조건 → 행동)
 * 그리는 일(three.js)은 view.js 가 이 파일의 상태(state)를 읽어서 한다. 편집기도 여기 표(COMP·WHEN·DO)로 칸을 만든다.
 *
 * 좌표: y 가 위, 1 = 1m. 개체 pos 는 **발밑 가운데**(도형·모델 모두 바닥이 pos.y). 회전은 도(°).
 * 결정적: 난수는 mulberry32(씨앗) 하나뿐, 한 걸음(step)은 입력·dt 만 보고 움직인다.
 */
(function (root) {
  'use strict';

  var FORMAT = 'saga-engine';
  var VERSION = 1;

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function num(v, d) { v = +v; return isFinite(v) ? v : d; }
  function vec(a, d) { return [num(a && a[0], d[0]), num(a && a[1], d[1]), num(a && a[2], d[2])]; }

  /* ── 표: 편집기·검사·실행이 같이 쓴다 ─────────────────────────────────────────── */

  /* 도형의 크기(배율 1일 때 폭·높이·깊이). 모델은 크기를 모르니 편집기가 몸 크기를 모델 경계로 채운다. */
  var SHAPES = {
    box: { label: '상자', size: [1, 1, 1] },       sphere: { label: '공', size: [1, 1, 1] },
    cylinder: { label: '원기둥', size: [1, 1, 1] }, cone: { label: '원뿔', size: [1, 1, 1] },
    capsule: { label: '캡슐', size: [0.8, 1.8, 0.8] }, plane: { label: '판', size: [1, 0.05, 1] },
    torus: { label: '고리', size: [1, 1, 0.3] },   model: { label: '3D 모델', size: [1, 1.8, 1] },
    none: { label: '안 보임(표시점)', size: [1, 1, 1] }
  };

  /* 몸 종류 */
  var BODIES = {
    none: '없음(통과, 닿음도 없음)', solid: '벽·바닥(막힘)', trigger: '닿음만(통과)', dynamic: '떨어짐(중력·막힘)'
  };

  /* 컴포넌트 — f: 칸(이름 → [종류, 기본값, 설명]). 종류: n 숫자 · s 글자 · b 참거짓 · sel:<a|b> 고르기 · lines 여러 줄 · scene 장면 · var 변수 */
  var COMP = {
    player: { label: '플레이어', hint: '방향키/WASD 로 움직이고 Space 로 뛰고 E 로 말 걸기·공격. 장면마다 하나.',
      f: { mode: ['sel:jump|walk|side', 'jump', '조작(jump 3D 점프 · walk 걷기만 · side 옆 보기 2.5D)'],
           speed: ['n', 6, '걷는 빠르기(m/초)'], jump: ['n', 8, '뛰는 힘'], attack: ['n', 1, '공격 피해(0 이면 공격 없음)'],
           range: ['n', 1.8, '공격·말 걸기 거리'],
           sprint: ['b', true, '달리기(Shift 누르고 있기, 스태미나)'], glide: ['b', false, '활공(공중에서 Space 한 번 더)'],
           climb: ['b', false, '등반(벽으로 계속 밀면 붙는다)'], stamina: ['n', 100, '스태미나 최대'] } },
    spin: { label: '빙글빙글', hint: '제자리에서 Y 축으로 돈다.', f: { speed: ['n', 90, '초당 도'] } },
    bob: { label: '둥실둥실', hint: '위아래로 떠다닌다.', f: { amp: ['n', 0.25, '높이(m)'], speed: ['n', 2, '빠르기'] } },
    patrol: { label: '왕복', hint: '처음 자리에서 (dx,dy,dz) 만큼 오간다. 몸이 벽·바닥이면 올라탄 것을 싣고 간다(움직이는 발판).',
      f: { dx: ['n', 4, 'X 거리'], dy: ['n', 0, 'Y 거리'], dz: ['n', 0, 'Z 거리'], speed: ['n', 2, '빠르기(m/초)'] } },
    chase: { label: '쫓아가기', hint: '플레이어가 거리 안에 오면 쫓아간다.', f: { range: ['n', 8, '알아채는 거리'], speed: ['n', 3, '빠르기'] } },
    pickup: { label: '줍기', hint: '플레이어가 닿으면 변수를 더하고 사라진다(동전·열쇠).',
      f: { var: ['var', 'coins', '더할 변수'], add: ['n', 1, '더하는 양'], sound: ['s', 'coin', '소리'] } },
    hurt: { label: '아프게', hint: '플레이어가 닿으면 변수(체력)를 깎는다. 1초 무적.',
      f: { var: ['var', 'hp', '깎을 변수'], amount: ['n', 1, '깎는 양'] } },
    health: { label: '체력(맞으면 사라짐)', hint: '플레이어 공격에 맞는다. 0 이 되면 사라진다(사라짐 이벤트).', f: { hp: ['n', 3, '체력'] } },
    talk: { label: '대화', hint: '플레이어가 가까이서 E 를 누르면 말한다. {변수} 는 값으로 바뀐다.',
      f: { name: ['s', '', '말하는 이'], lines: ['lines', ['안녕!'], '대사(줄마다 한 장)'] } },
    portal: { label: '문(장면 이동)', hint: '플레이어가 닿으면 다른 장면으로 간다. 도착 자리는 그 장면의 개체 id(비우면 플레이어 자리).',
      f: { scene: ['scene', '', '갈 장면'], at: ['s', '', '도착 개체 id'] } },
    goal: { label: '결승점', hint: '플레이어가 닿으면 이긴다.', f: { text: ['s', '클리어!', '이겼을 때 글'] } },
    launch: { label: '점프대', hint: '플레이어가 닿으면 위로 튕겨 올린다.', f: { power: ['n', 16, '튕기는 힘'] } },
    foe: { label: '전투 적', hint: '프로젝트 설정의 전투 스타일(원신식·젤다식·파판식)로 싸우는 적. 간단 스타일에선 닿으면 아프다. 쓰러지면 사라짐 이벤트.',
      f: { hp: ['n', 60, '체력'], atk: ['n', 8, '공격력'], def: ['n', 2, '방어'], spd: ['n', 8, '빠르기(파판식 ATB)'],
           aggro: ['n', 9, '알아채는 거리'], move: ['n', 2.6, '걷는 빠르기'], range: ['n', 1.8, '공격 거리'],
           windup: ['n', 0.7, '공격 예고(초) — 이때 막거나 피한다'], cool: ['n', 1.6, '공격 사이 쉼(초)'],
           count: ['n', 1, '마릿수(파판식 — 닿으면 이만큼 나온다)'], exp: ['n', 10, '경험치'], gold: ['n', 5, '돈'],
           boss: ['b', false, '보스(도망 못 침)'], element: ['sel:|불|물|얼음|번개|바람', '', '처음 붙은 원소(원신식)'],
           ranged: ['b', false, '원거리(예고 뒤 탄을 쏜다)'], shield: ['n', 0, '원소 방패(원소 공격 2.5배로 깎인다)'],
           poise: ['n', 0, '기세(쌓인 피해가 넘으면 휘청, 0 없음)'], enrage: ['n', 0, '광폭(알아채고 몇 초 뒤 공격 1.5배, 0 없음)'],
           flee: ['n', 0, '도망(알아채고 몇 초 안에 못 잡으면 사라짐, 0 없음)'],
           drops: ['lines', [], '노획물 줄마다 "이름|확률 0~1|변수|양|등급(보통·마법·희귀·영웅·전설)"'] } }
  };

  /* 전투 스타일 — combat.js 같은 플러그인이 addStyle 로 채운다. simple 은 이 파일(닿으면 아픔·E 공격) */
  var STYLES = { simple: { label: '간단 — E 로 치고 닿으면 아프다', make: null } };
  function addStyle(name, label, make) { STYLES[name] = { label: label, make: make }; }
  /* 늘 켜지는 시스템(systems.js — 시간·날씨·상자·채집·퀘스트·도감 …). 쓰지 않는 판에선 아무것도 안 한다 */
  var SYSTEMS = [];
  function addSystem(name, make) { SYSTEMS.push({ name: name, make: make }); }
  function addComp(name, def) { COMP[name] = def; }
  function addDo(name, def) { DO[name] = def; }
  function addWhen(name, def) { WHEN[name] = def; }

  /* 이벤트 "언제" — f 는 칸 */
  var WHEN = {
    start: { label: '장면이 시작될 때', f: {} },
    every: { label: '몇 초마다', f: { sec: ['n', 2, '초'] } },
    touch: { label: '닿았을 때', f: { a: ['s', 'player', '누가(player·id·#태그·self)'], b: ['s', 'self', '무엇에'] } },
    act: { label: 'E 로 살폈을 때', f: { b: ['s', 'self', '무엇을(id·#태그·self)'] } },
    key: { label: '키를 눌렀을 때', f: { key: ['s', 'KeyF', '키(KeyF·Digit1·Enter …)'] } },
    var: { label: '변수가 조건에 맞게 될 때', f: { var: ['var', 'coins', '변수'], op: ['sel:>=|>|==|!=|<|<=', '>=', '비교'], value: ['s', '5', '값(숫자 또는 글 — 예: rain)'] } },
    gone: { label: '태그가 다 사라졌을 때', f: { b: ['s', '#coin', '대상(#태그)'] } },
    destroyed: { label: '사라졌을 때', f: { b: ['s', 'self', '대상'] } },
    fall: { label: '플레이어가 떨어졌을 때', f: {} }
  };

  /* 이벤트 "행동" */
  var DO = {
    say: { label: '말하기(대화창)', f: { name: ['s', '', '말하는 이'], text: ['s', '…', '말({변수} 가능)'] } },
    toast: { label: '잠깐 글 띄우기', f: { text: ['s', '', '글'], sec: ['n', 2, '초'] } },
    set: { label: '변수 = 값', f: { var: ['var', 'coins', '변수'], value: ['n', 0, '값'] } },
    add: { label: '변수 += 값', f: { var: ['var', 'coins', '변수'], value: ['n', 1, '더할 값(빼려면 -)'] } },
    random: { label: '변수 = 무작위', f: { var: ['var', 'r', '변수'], min: ['n', 1, '최소'], max: ['n', 6, '최대(정수)'] } },
    goto: { label: '장면 이동', f: { scene: ['scene', '', '장면'], at: ['s', '', '도착 개체 id'] } },
    destroy: { label: '없애기', f: { target: ['s', 'self', '대상(self·other·id·#태그)'] } },
    spawn: { label: '만들어 내기(복제)', f: { from: ['s', '', '원본 개체 id(보통 "처음엔 없음")'], at: ['s', 'self', '어디에'], dx: ['n', 0, 'X'], dy: ['n', 1, 'Y'], dz: ['n', 0, 'Z'] } },
    show: { label: '보이기', f: { target: ['s', '', '대상'] } },
    hide: { label: '숨기기', f: { target: ['s', '', '대상'] } },
    teleport: { label: '순간 이동', f: { target: ['s', 'player', '대상'], at: ['s', '', '어디로(개체)'], x: ['n', 0, 'X(개체 비우면)'], y: ['n', 0, 'Y'], z: ['n', 0, 'Z'] } },
    push: { label: '밀기(속도)', f: { target: ['s', 'player', '대상'], vx: ['n', 0, 'X'], vy: ['n', 10, 'Y'], vz: ['n', 0, 'Z'] } },
    wait: { label: '기다리기', f: { sec: ['n', 1, '초'] } },
    sound: { label: '소리', f: { name: ['sel:coin|jump|hit|win|lose|blip|door', 'blip', '소리'] } },
    shake: { label: '화면 흔들기', f: { sec: ['n', 0.3, '초'], power: ['n', 0.3, '세기'] } },
    win: { label: '이기기(끝)', f: { text: ['s', '클리어!', '글'] } },
    lose: { label: '지기(끝)', f: { text: ['s', '게임 오버', '글'] } }
  };

  var OPS = {
    '>=': function (a, b) { return a >= b; }, '>': function (a, b) { return a > b; }, '==': function (a, b) { return a == b; }, // eslint-disable-line eqeqeq
    '!=': function (a, b) { return a != b; }, '<': function (a, b) { return a < b; }, '<=': function (a, b) { return a <= b; } // eslint-disable-line eqeqeq
  };

  /* ── 지형 언덕 — 장면 env.ground.hills {height, size, seed, flat}. 높이는 늘 0 이상(땅 상자 위로만 솟는다).
     물리(sim)·땅 모양(view)·편집기 놓기가 같은 함수를 쓴다 */
  function hash2(ix, iz, seed) {
    var h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(seed, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function vnoise(x, z, seed) {
    var ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
    var u = fx * fx * (3 - 2 * fx), w = fz * fz * (3 - 2 * fz);
    var a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed), c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
    return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * w;
  }
  function terrainH(ground, x, z) {
    var hl = ground && ground.hills;
    if (!hl || !(num(hl.height, 0) > 0)) { return 0; }
    var half = num(ground.size, 60) / 2;
    if (Math.abs(x) > half || Math.abs(z) > half) { return 0; }
    var sz = Math.max(2, num(hl.size, 18)), seed = num(hl.seed, 1) | 0;
    var n = vnoise(x / sz, z / sz, seed) * 0.7 + vnoise(x / sz * 2.3 + 17, z / sz * 2.3 - 5, seed + 7) * 0.3;
    n = Math.max(0, n - 0.3) / 0.7;
    var flat = Math.max(0, num(hl.flat, 8)), d = Math.hypot(x, z), m = 1;
    if (d < flat + sz * 0.6) { m = Math.max(0, (d - flat) / (sz * 0.6)); m = m * m * (3 - 2 * m); }
    return num(hl.height, 0) * n * m;
  }

  function compDefaults(name) {
    var d = {}, f = (COMP[name] || {}).f || {};
    for (var k in f) { d[k] = clone(f[k][1]); }
    return d;
  }
  function fieldDefaults(tbl, name) {
    var d = {}, f = (tbl[name] || {}).f || {};
    for (var k in f) { d[k] = clone(f[k][1]); }
    return d;
  }

  /* ── 검사 — 서버 저장·편집기 표시·진단이 같이 쓴다 ───────────────────────────── */
  function validate(p) {
    var errors = [], warns = [];
    function E(m) { errors.push(m); } function W(m) { warns.push(m); }
    if (!p || typeof p !== 'object') { return { errors: ['프로젝트가 객체가 아니다'], warns: warns }; }
    if (p.format !== FORMAT) { E('format 이 "' + FORMAT + '" 가 아니다'); }
    if (p.version !== VERSION) { E('version 이 ' + VERSION + ' 이 아니다'); }
    if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(p.id || '')) { E('id 는 영소문자·숫자·- (40자 이하): ' + p.id); }
    if (!p.title) { W('제목이 비었다'); }
    var scenes = Array.isArray(p.scenes) ? p.scenes : [];
    if (!scenes.length) { E('장면이 하나도 없다'); }
    var sid = {};
    scenes.forEach(function (s) {
      if (!s || !s.id) { E('id 없는 장면'); return; }
      if (sid[s.id]) { E('장면 id 겹침: ' + s.id); }
      sid[s.id] = s;
    });
    if (scenes.length && !sid[p.start]) { E('시작 장면(start)이 없다: ' + p.start); }
    var vars = p.vars || {};
    var cb = p.combat || {};
    if (cb.style && !STYLES[cb.style]) { E('모르는 전투 스타일: ' + cb.style); }
    if (cb.party != null) {
      if (!Array.isArray(cb.party)) { E('combat.party 는 배열'); } else {
        if (cb.party.length > 4) { E('파티는 넷까지'); }
        cb.party.forEach(function (m, i) { if (!m || !m.name) { E('파티 ' + (i + 1) + '번 이름이 없다'); } });
      }
    }
    if ((cb.style === 'genshin' || cb.style === 'ff') && !(cb.party || []).length) { W('전투 스타일 ' + cb.style + ' 인데 파티가 비었다(기본 한 명으로 돈다)'); }
    function chkVar(v, where) { if (v && !(v in vars)) { W(where + ': 변수 "' + v + '" 가 프로젝트 변수 목록에 없다(0 에서 시작)'); } }
    function chkEvents(list, where, ids, sceneId) {
      (list || []).forEach(function (ev, i) {
        var w = ev && ev.when || {}, at = where + ' 이벤트 ' + (i + 1);
        if (!WHEN[w.on]) { E(at + ': 모르는 "언제" ' + w.on); }
        if (w.on === 'var') { chkVar(w.var, at); }
        (ev.if || []).forEach(function (c) { chkVar(c.var, at + ' 조건'); if (!OPS[c.op]) { E(at + ': 모르는 비교 ' + c.op); } });
        (ev.do || []).forEach(function (a, j) {
          var aat = at + ' 행동 ' + (j + 1);
          if (!a || !DO[a.do]) { E(aat + ': 모르는 행동 ' + (a && a.do)); return; }
          if (a.var) { chkVar(a.var, aat); }
          if (a.do === 'goto' && !sid[a.scene]) { E(aat + ': 없는 장면 ' + a.scene); }
          if (a.do === 'goto' && a.at && sid[a.scene] && !(sid[a.scene].entities || []).some(function (x) { return x.id === a.at; })) { W(aat + ': 장면 ' + a.scene + ' 에 도착 개체 ' + a.at + ' 가 없다'); }
          if (a.do === 'spawn' && !ids[a.from]) { E(aat + ': 복제 원본 ' + a.from + ' 이 이 장면(' + sceneId + ')에 없다'); }
        });
      });
    }
    scenes.forEach(function (s) {
      var ids = {}, players = 0, where = '장면 ' + s.id;
      (s.entities || []).forEach(function (e) {
        if (!e || !e.id) { E(where + ': id 없는 개체'); return; }
        if (ids[e.id]) { E(where + ': 개체 id 겹침 ' + e.id); }
        ids[e.id] = e;
      });
      (s.entities || []).forEach(function (e) {
        if (!e || !e.id) { return; }
        var at = where + ' / ' + (e.name || e.id);
        ['pos', 'rot', 'scale'].forEach(function (k) {
          if (e[k] != null && !(Array.isArray(e[k]) && e[k].length === 3 && e[k].every(function (x) { return typeof x === 'number' && isFinite(x); }))) { E(at + ': ' + k + ' 는 숫자 셋'); }
        });
        var look = e.look || {};
        if (look.shape && !SHAPES[look.shape]) { E(at + ': 모르는 모양 ' + look.shape); }
        if (look.shape === 'model' && !look.model) { E(at + ': 모델 모양인데 모델 파일이 없다'); }
        if (e.body && e.body.type && !BODIES[e.body.type]) { E(at + ': 모르는 몸 ' + e.body.type); }
        var c = e.comps || {};
        for (var k in c) { if (!COMP[k]) { E(at + ': 모르는 컴포넌트 ' + k); } }
        if (c.player && !e.off) { players++; }
        if (c.portal) { if (!sid[c.portal.scene]) { E(at + ': 문이 없는 장면으로 간다 ' + c.portal.scene); } }
        if (c.pickup) { chkVar(c.pickup.var, at + ' 줍기'); }
        if (c.hurt) { chkVar(c.hurt.var, at + ' 아프게'); }
        chkEvents(e.events, at, ids, s.id);
      });
      if (players > 1) { E(where + ': 플레이어가 ' + players + '명(장면마다 하나)'); }
      if (!players) { W(where + ': 플레이어가 없다(구경만 하는 장면)'); }
      chkEvents(s.events, where, ids, s.id);
    });
    return { errors: errors, warns: warns };
  }

  /* 편집기에서 "모든 표시 글자"를 모은다(실명 가드용) */
  function displayTexts(p) {
    var out = [p.title || '', p.desc || ''];
    ((p.combat || {}).party || []).forEach(function (m) { out.push((m && m.name) || ''); });
    (p.hud || []).forEach(function (h) { out.push(h.label || ''); });
    (p.items || []).forEach(function (it) { if (it && typeof it === 'object') { out.push(it.name || '', it.desc || ''); } else { out.push(String(it || '')); } });
    (p.furniture || []).forEach(function (it) { out.push((it && it.name) || ''); });
    var gr = p.gear || {};
    (gr.bases || []).forEach(function (b) { out.push((b && b.name) || ''); });
    (gr.sets || []).forEach(function (b) { out.push((b && b.name) || ''); });
    (gr.runewords || []).forEach(function (b) { out.push((b && b.name) || ''); });
    (p.quests || []).forEach(function (q) { out.push((q && q.name) || '', (q && q.desc) || ''); });
    /* 표의 글자 칸(s·lines) — 컴포넌트·행동을 새로 붙여도 여기서 저절로 본다 */
    function fields(tbl, name, obj) {
      var d = tbl[name]; if (!d || !obj) { return; }
      for (var k in d.f) {
        var t = d.f[k][0], v = obj[k];
        if (t === 's' && typeof v === 'string' && !/^#[0-9a-f]{3,8}$/i.test(v)) { out.push(v); }
        if (t === 'lines' && Array.isArray(v)) { out = out.concat(v.map(String)); }
      }
    }
    (p.scenes || []).forEach(function (s) {
      out.push(s.name || '');
      function evs(list) { (list || []).forEach(function (ev) { (ev.do || []).forEach(function (a) { out.push(a.text || '', a.name || ''); fields(DO, a.do, a); }); }); }
      evs(s.events);
      (s.entities || []).forEach(function (e) {
        out.push(e.name || '', (e.look && e.look.label) || '');
        var c = e.comps || {};
        for (var ck in c) { fields(COMP, ck, c[ck]); }
        evs(e.events);
      });
    });
    return out;
  }

  /* ── 실행 ─────────────────────────────────────────────────────────────────── */
  var GRAV = 22, STEP_UP = 0.35, FALL_Y = -30, REACH = 2.2, INV_SEC = 1;

  function create(project, opt) {
    opt = opt || {};
    var P = project;
    var rng = mulberry32(opt.seed == null ? 20260824 : opt.seed);
    var S = { t: 0, frame: 0, vars: {}, sceneId: null, scene: null, ents: [], byId: {}, player: null,
              dialog: null, over: null, fx: [], toast: null, entry: null, spawnSeq: 0,
              stamina: { v: 100, max: 100, wait: 0, tired: false }, flags: {}, mods: null, menu: null };
    var jobs = [], evs = [], prevVarOk = [], prevGone = [], touching = {}, everyAt = [], destroyedQ = [];
    var menuKinds = {}, menuPick = null, doKinds = {}, bus = {};
    function emit(name, data) { (bus[name] || []).forEach(function (fn) { fn(data); }); }
    /* 시스템이 등록한 "언제"(questDone 등) — match(when) 가 참인 이벤트를 일으킨다 */
    function fireWhen(on, match, ctx) {
      evs.forEach(function (x) { var w = x.ev.when || {}; if (w.on === on && (!match || match(w, x))) { fire(x.ev, Object.assign({ self: x.self }, ctx || {})); } });
    }
    function spawnDef(d, pos) {
      var nd = clone(d);
      S.spawnSeq++;
      nd.id = (d.id || 'x') + '~' + S.spawnSeq; nd.spawned = true;
      nd.pos = pos.slice();
      var e = makeEnt(nd);
      S.ents.push(e); S.byId[e.id] = e;
      (e.events || []).forEach(function (ev) { evs.push({ ev: clone(ev), self: e }); });
      return e;
    }
    function resetMods() { S.mods = { atk: 1, def: 1, speed: 1, exp: 1, gold: 1, hp: 0, stamina: 0, dmgTaken: 1 }; }
    resetMods();
    /* 스태미나 — 달리기·활공·등반·수영·회피가 같이 쓴다(saga-godot go_player 수치) */
    function stamUse(n) {
      var st = S.stamina;
      if (st.tired || st.v <= 0) { return false; }
      st.v -= n; st.wait = 0.8;
      if (st.v <= 0) { st.v = 0; st.tired = true; }
      return true;
    }

    function resetVars() {
      S.vars = {};
      var v = P.vars || {};
      for (var k in v) { S.vars[k] = clone(v[k]); }
    }
    function getVar(k) { var v = S.vars[k]; return v == null ? 0 : v; }
    function interp(t) {
      return String(t == null ? '' : t).replace(/\{([^{}]+)\}/g, function (m, k) { return k in S.vars ? S.vars[k] : m; });
    }
    function fx(o) { S.fx.push(o); }

    function makeEnt(d, scn) {
      var look = d.look || {}, shape = look.shape || 'box';
      var body = d.body || {};
      var bsz = body.size || (SHAPES[shape] || SHAPES.box).size;
      var comps = {};
      for (var k in (d.comps || {})) { if (COMP[k]) { comps[k] = Object.assign(compDefaults(k), d.comps[k]); } }
      var e = {
        id: d.id, name: d.name || d.id, tag: d.tag || '', def: d,
        p: vec(d.pos, [0, 0, 0]), r: vec(d.rot, [0, 0, 0]), s: vec(d.scale, [1, 1, 1]),
        v: [0, 0, 0], alive: true, hidden: !!d.hidden, ground: false, standOn: null,
        body: { type: body.type || (comps.player ? 'dynamic' : 'none'), size: vec(bsz, [1, 1, 1]), off: vec(body.off, [0, 0, 0]) },
        comps: comps, hp: comps.health ? num(comps.health.hp, 3) : 0, spd: 0, t: 0, inv: 0, hitT: 0, act: 0, events: d.events || [],
        mv: 'ground', coyote: 0, jumpT: 0, climbCd: 0, pushT: 0, climbT: 0
      };
      var tsc = scn || (S && S.scene);
      if (!comps.water && tsc && tsc.env) {
        var th = terrainH(tsc.env.ground, e.p[0], e.p[2]);
        if (e.p[1] < th) { e.p[1] = th; }
      }
      e.home = e.p.slice();
      return e;
    }

    function box(e) {
      var sx = Math.abs(e.s[0]), sy = Math.abs(e.s[1]), sz = Math.abs(e.s[2]);
      var w = e.body.size[0] * sx, h = e.body.size[1] * sy, d = e.body.size[2] * sz;
      var yaw = ((e.r[1] % 180) + 180) % 180;
      if (yaw > 45 && yaw < 135) { var t = w; w = d; d = t; }
      var cx = e.p[0] + e.body.off[0] * sx, cy = e.p[1] + e.body.off[1] * sy, cz = e.p[2] + e.body.off[2] * sz;
      return { x0: cx - w / 2, x1: cx + w / 2, y0: cy, y1: cy + h, z0: cz - d / 2, z1: cz + d / 2 };
    }
    function overlap(a, b, pad) {
      pad = pad || 0;
      return a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad && a.z0 < b.z1 + pad && a.z1 > b.z0 - pad;
    }

    function groundBox() {
      var g = S.scene.env && S.scene.env.ground;
      if (!g) { return null; }
      var h = num(g.size, 60) / 2;
      return { x0: -h, x1: h, y0: -4, y1: 0, z0: -h, z1: h, ground: true };
    }

    /* 막는 몸: 벽·바닥 + (자기 아닌) 떨어지는 몸 + 땅 */
    function solidsFor(e) {
      var out = [];
      for (var i = 0; i < S.ents.length; i++) {
        var o = S.ents[i];
        if (o === e || !o.alive || o.hidden) { continue; }
        if (o.body.type === 'solid' || (o.body.type === 'dynamic' && e.body.type === 'dynamic')) { out.push({ b: box(o), e: o }); }
      }
      var g = groundBox();
      if (g) { out.push({ b: g, e: null }); }
      return out;
    }

    function moveAxis(e, ax, d, solids) {
      if (!d) { return false; }
      e.p[ax] += d;
      var b = box(e), hit = false, lo = ['x0', 'y0', 'z0'][ax], hi = ['x1', 'y1', 'z1'][ax];
      for (var i = 0; i < solids.length; i++) {
        var o = solids[i].b;
        if (!overlap(b, o)) { continue; }
        /* 옆으로 막혔는데 낮은 턱이면 올라선다 */
        if (ax !== 1 && e.ground && o.y1 - b.y0 <= STEP_UP && o.y1 > b.y0) {
          var lift = o.y1 - b.y0 + 0.001;
          e.p[1] += lift;
          var nb = box(e), free = true;
          for (var j = 0; j < solids.length; j++) { if (overlap(nb, solids[j].b)) { free = false; break; } }
          if (free) { b = nb; continue; }
          e.p[1] -= lift;
        }
        var pen = d > 0 ? b[hi] - o[lo] : b[lo] - o[hi];
        e.p[ax] -= pen + (d > 0 ? 0.0005 : -0.0005);
        b = box(e); hit = true;
        if (ax === 1 && d < 0) { e.ground = true; e.standOn = solids[i].e; }
        if (ax !== 1) { e.wall = { ax: ax, sign: d > 0 ? 1 : -1, b: o, e: solids[i].e }; }
      }
      return hit;
    }

    function physics(e, dt, solids) {
      if (!e.noGrav) { e.v[1] -= num(S.scene.env && S.scene.env.gravity, GRAV) * dt; }
      if (e.v[1] < -40) { e.v[1] = -40; }
      if (e.mv === 'glide' && e.v[1] < -2.2) { e.v[1] = -2.2; }
      e.wall = null;
      var x0 = e.p[0], z0 = e.p[2];
      if (moveAxis(e, 0, e.v[0] * dt, solids)) { e.v[0] = 0; }
      if (moveAxis(e, 2, e.v[2] * dt, solids)) { e.v[2] = 0; }
      e.ground = false; e.standOn = null;
      if (moveAxis(e, 1, e.v[1] * dt, solids)) { e.v[1] = 0; }
      var th = terrainH(S.scene.env && S.scene.env.ground, e.p[0], e.p[2]);
      if (th > 0 && e.p[1] < th) { e.p[1] = th; if (e.v[1] < 0) { e.v[1] = 0; } e.ground = true; }
      e.spd = Math.hypot(e.p[0] - x0, e.p[2] - z0) / Math.max(dt, 1e-6);
    }

    /* 고르개: player · self · other · #태그 · id · any */
    function pick(sel, ctx) {
      sel = sel == null ? '' : String(sel).trim();
      var out = [];
      if (!sel) { return out; }
      if (sel === 'player') { return S.player && S.player.alive ? [S.player] : []; }
      if (sel === 'self') { return ctx && ctx.self ? [ctx.self] : []; }
      if (sel === 'other') { return ctx && ctx.other ? [ctx.other] : []; }
      for (var i = 0; i < S.ents.length; i++) {
        var e = S.ents[i];
        if (!e.alive) { continue; }
        if (sel === 'any' || (sel[0] === '#' ? e.tag === sel.slice(1) : e.id === sel || e.id.split('~')[0] === sel && e.def.spawned)) { out.push(e); }
      }
      return out;
    }
    function matches(sel, e, ctx) { return pick(sel, ctx).indexOf(e) >= 0; }
    /* 효과(소리·흔들기·장면 바뀜 …)는 쌓아 두고, 그리는 쪽이 가져가며 비운다 */
    function drainFx() { var f = S.fx; S.fx = []; return f; }

    function condOk(ev) {
      var cs = ev.if || [];
      for (var i = 0; i < cs.length; i++) {
        var c = cs[i], f = OPS[c.op] || OPS['=='];
        if (!f(getVar(c.var), typeof getVar(c.var) === 'number' ? num(c.value, 0) : c.value)) { return false; }
      }
      return true;
    }
    function fire(ev, ctx) {
      if (!condOk(ev)) { return; }
      if (ev.once) { if (ev._done) { return; } ev._done = true; }
      jobs.push({ list: ev.do || [], i: 0, ctx: ctx || {}, wait: 0, dlg: false });
    }

    function destroy(e) {
      if (!e || !e.alive) { return; }
      e.alive = false;
      if (e.def.once && !e.def.spawned) { S.flags['gone:' + S.sceneId + ':' + e.id] = 1; }
      destroyedQ.push(e);
      if (e === S.player) { S.player = null; }
    }

    function spawnFrom(src, at, off) {
      var d = null, ds = S.scene.entities || [];
      for (var i = 0; i < ds.length; i++) { if (ds[i].id === src) { d = ds[i]; break; } }
      if (!d) { return null; }
      var nd = clone(d);
      S.spawnSeq++;
      nd.id = d.id + '~' + S.spawnSeq; nd.off = false; nd.spawned = true;
      var base = at ? at.p : vec(d.pos, [0, 0, 0]);
      nd.pos = [base[0] + num(off[0], 0), base[1] + num(off[1], 0), base[2] + num(off[2], 0)];
      var e = makeEnt(nd);
      e.def.spawned = true;
      S.ents.push(e); S.byId[e.id] = e;
      (e.events || []).forEach(function (ev) { evs.push({ ev: clone(ev), self: e }); });
      return e;
    }

    /* 행동 하나 — 기다려야 하면 true */
    function doAction(a, job) {
      var ctx = job.ctx, i, list;
      switch (a.do) {
        case 'say': S.dialog = { name: interp(a.name), lines: [interp(a.text)], i: 0 }; job.dlg = true; fx({ type: 'sound', name: 'blip' }); return true;
        case 'toast': S.toast = { text: interp(a.text), until: S.t + num(a.sec, 2) }; break;
        case 'set': S.vars[a.var] = typeof a.value === 'number' ? a.value : (isFinite(+a.value) && a.value !== '' ? +a.value : a.value); break;
        case 'add': S.vars[a.var] = num(getVar(a.var), 0) + num(a.value, 0); break;
        case 'random': { var lo = Math.floor(num(a.min, 1)), hi = Math.floor(num(a.max, 6)); S.vars[a.var] = lo + Math.floor(rng() * (hi - lo + 1)); break; }
        case 'goto': job.ctx = {}; jobs = [job]; enterScene(a.scene, a.at); break;
        case 'destroy': list = pick(a.target, ctx); for (i = 0; i < list.length; i++) { destroy(list[i]); } break;
        case 'spawn': { var at = pick(a.at || 'self', ctx)[0]; spawnFrom(a.from, at, [a.dx, a.dy, a.dz]); break; }
        case 'show': case 'hide': list = pick(a.target, ctx); for (i = 0; i < list.length; i++) { list[i].hidden = a.do === 'hide'; } break;
        case 'teleport': {
          list = pick(a.target, ctx);
          var dst = a.at ? pick(a.at, ctx)[0] : null, to = dst ? dst.p.slice() : [num(a.x, 0), num(a.y, 0), num(a.z, 0)];
          for (i = 0; i < list.length; i++) { list[i].p = to.slice(); list[i].v = [0, 0, 0]; }
          break;
        }
        case 'push': list = pick(a.target, ctx); for (i = 0; i < list.length; i++) { list[i].v = [num(a.vx, 0), num(a.vy, 0), num(a.vz, 0)]; list[i].ground = false; } break;
        case 'wait': job.wait = num(a.sec, 1); return true;
        case 'sound': fx({ type: 'sound', name: a.name || 'blip' }); break;
        case 'shake': fx({ type: 'shake', sec: num(a.sec, 0.3), power: num(a.power, 0.3) }); break;
        case 'win': case 'lose': S.over = { win: a.do === 'win', text: interp(a.text) }; fx({ type: 'sound', name: a.do }); return true;
        default: if (doKinds[a.do]) { return !!doKinds[a.do](a, job, ctx); }
      }
      return false;
    }

    function runJobs(dt) {
      for (var n = 0; n < jobs.length; n++) {
        var job = jobs[n];
        if (job.dlg) { if (S.dialog || S.menu) { continue; } job.dlg = false; }
        if (job.wait > 0) { job.wait -= dt; if (job.wait > 0) { continue; } job.wait = 0; }
        while (job.i < job.list.length && !S.over) {
          var a = job.list[job.i++];
          var before = jobs;
          var stop = doAction(a, job);
          if (jobs !== before) { n = 0; } // 장면이 바뀌어 일감이 이것 하나로 줄었다
          if (stop) { break; }
        }
      }
      jobs = jobs.filter(function (j) { return j.i < j.list.length || j.dlg || j.wait > 0; });
    }

    function enterScene(id, atId) {
      var scn = null;
      (P.scenes || []).forEach(function (s) { if (s.id === id) { scn = s; } });
      if (!scn) { return false; }
      var keepYaw = S.player ? S.player.r[1] : null;
      S.sceneId = id; S.scene = scn; S.ents = []; S.byId = {}; S.player = null; S.dialog = null; S.toast = null;
      evs = []; touching = {}; destroyedQ = [];
      (scn.entities || []).forEach(function (d) {
        if (d.off || S.flags['gone:' + id + ':' + d.id]) { return; }
        var e = makeEnt(d, scn);
        S.ents.push(e); S.byId[e.id] = e;
        if (e.comps.player && !S.player) { S.player = e; }
      });
      if (S.player && atId && S.byId[atId]) {
        var a = S.byId[atId];
        S.player.p = [a.p[0], a.p[1], a.p[2]];
        S.player.r[1] = a.r[1];
      } else if (S.player && keepYaw != null && atId) { S.player.r[1] = keepYaw; }
      S.entry = S.player ? S.player.p.slice() : null;
      (scn.events || []).forEach(function (ev) { evs.push({ ev: clone(ev), self: null }); });
      S.ents.forEach(function (e) { (e.events || []).forEach(function (ev) { evs.push({ ev: clone(ev), self: e }); }); });
      prevVarOk = evs.map(function () { return null; });
      prevGone = evs.map(function () { return null; });
      everyAt = evs.map(function (x) { return x.ev.when && x.ev.when.on === 'every' ? num(x.ev.when.sec, 2) : 0; });
      S.sceneT = 0;
      plugs.forEach(function (g) { if (g.enter) { g.enter(); } });
      fx({ type: 'scene', id: id });
      evs.forEach(function (x) { if (x.ev.when && x.ev.when.on === 'start') { fire(x.ev, { self: x.self }); } });
      return true;
    }

    function restart() {
      resetVars();
      S.over = null; S.t = 0; S.frame = 0; S.fx = []; S.spawnSeq = 0; jobs = [];
      S.flags = {}; S.menu = null; resetMods();
      S.stamina = { v: 100, max: 100, wait: 0, tired: false };
      plugs.forEach(function (g) { if (g.reset) { g.reset(); } });
      enterScene(P.start || ((P.scenes || [])[0] || {}).id, null);
    }

    /* 물 — water 컴포넌트 상자 안에 몸 가운데가 있고 깊이가 1.1m 넘으면 헤엄 */
    function waterAt(pl) {
      var cx = pl.p[0], cy = pl.p[1] + 0.9, cz = pl.p[2];
      for (var i = 0; i < S.ents.length; i++) {
        var o = S.ents[i];
        if (!o.alive || !o.comps.water) { continue; }
        var b = box(o);
        if (cx > b.x0 && cx < b.x1 && cz > b.z0 && cz < b.z1 && cy < b.y1 + 0.2 && pl.p[1] > b.y0 - 1 && b.y1 - pl.p[1] > 1.1) { return b; }
      }
      return null;
    }

    /* 이동 기술 — 땅·공중·활공·등반·수영(saga-godot go_player 의 상태, 넘어오르기 포함). true 면 이 걸음 이동을 다 했다 */
    function traverse(pl, inp, dt, c, wx, wz) {
      var st = S.stamina, maxSt = num(c.stamina, 100) + S.mods.stamina;
      st.max = maxSt;
      if (st.tired && st.v >= 30) { st.tired = false; }
      var mv = pl.mv || 'ground';
      pl.noGrav = false;
      if (pl.ground) { pl.coyote = 0.1; pl.lastGround = pl.p.slice(); if (mv !== 'climb') { mv = 'ground'; } } else if (pl.coyote > 0) { pl.coyote -= dt; }
      if (pl.climbCd > 0) { pl.climbCd -= dt; }
      if (pl.jumpT > 0) { pl.jumpT -= dt; }
      var water = waterAt(pl);
      if (water && mv !== 'swim') { mv = 'swim'; fx({ type: 'sound', name: 'blip' }); }
      if (!water && mv === 'swim') { mv = 'air'; }
      var regen = true;
      if (mv === 'swim') {
        pl.noGrav = true;
        var fast = inp.sprint && !st.tired;
        var sp = fast ? 5.5 : 3;
        pl.v[0] = wx * sp; pl.v[2] = wz * sp;
        pl.v[1] = ((water.y1 - 1.25) - pl.p[1]) * 3;
        if (Math.abs(wx) + Math.abs(wz) > 0.05) { pl.r[1] = Math.atan2(wx, wz) * 180 / Math.PI; }
        if (!stamUse((fast ? 10 : 2) * dt)) {
          if (pl.lastGround) { pl.p = pl.lastGround.slice(); pl.v = [0, 0, 0]; }
          S.toast = { text: '힘이 다해 물가로 떠밀려 왔다', until: S.t + 2.5 };
          mv = 'ground';
        }
        pl.mv = mv;
        return true;
      }
      if (mv === 'climb') {
        var w = pl.climb;
        if (!w || (!pl.wall && pl.climbT > 0.05) || st.tired) { mv = 'air'; pl.climb = null; pl.climbCd = 0.3; }
        else {
          pl.climbT = (pl.climbT || 0) + dt;
          pl.noGrav = true;
          var up = num(inp.mz, 0), side = num(inp.mx, 0);
          /* 벽을 따라가는 옆 방향: 카메라 오른쪽을 벽 면에 눕힌 것 */
          var yaw = num(inp.yaw, 0), rx = Math.cos(yaw), rz = -Math.sin(yaw);
          var tan = w.ax === 0 ? 2 : 0, tdir = tan === 0 ? rx : rz;
          pl.v = [0, 0, 0];
          pl.v[1] = up * 2.4;
          pl.v[tan] = (tdir < 0 ? -1 : 1) * side * 2.4;
          pl.v[w.ax] = w.sign * 1.2;
          pl.r[1] = w.ax === 0 ? (w.sign > 0 ? 90 : -90) : (w.sign > 0 ? 0 : 180);
          stamUse((Math.abs(up) + Math.abs(side) > 0.1 ? 6 : 1.5) * dt);
          if (inp.jumpHit) {
            if (up < -0.3) { pl.v[w.ax] = -w.sign * 6; pl.v[1] = 6; mv = 'air'; pl.climb = null; pl.climbCd = 0.4; pl.noGrav = false; }
            else if (stamUse(15)) { pl.v[1] = 7; }
            fx({ type: 'sound', name: 'jump' });
          }
          /* 꼭대기 — 넘어오른다 */
          if (mv === 'climb' && pl.p[1] >= w.b.y1 - 0.45) {
            pl.p[1] = w.b.y1 + 0.01; pl.p[w.ax] += w.sign * 0.7; pl.v = [0, 0, 0];
            mv = 'ground'; pl.climb = null; pl.noGrav = false; pl.climbCd = 0.3;
          }
          pl.mv = mv;
          if (mv === 'climb') { return true; }
        }
      }
      /* 벽에 붙기 — 막힌 쪽으로 계속 밀면 */
      if (c.climb && pl.wall && pl.wall.e && pl.climbCd <= 0 && !st.tired && pl.wall.b.y1 - pl.p[1] > 0.8) {
        var push = pl.wall.ax === 0 ? wx * pl.wall.sign : wz * pl.wall.sign;
        pl.pushT = push > 0.5 ? (pl.pushT || 0) + dt : 0;
        if (pl.pushT > (pl.ground ? 0.18 : 0.02)) { pl.mv = 'climb'; pl.climb = pl.wall; pl.climbT = 0; pl.pushT = 0; return true; }
      }
      /* 활공 — 공중에서 Space 한 번 더 */
      if (mv === 'glide') {
        if (pl.ground || inp.jumpHit || !stamUse(5 * dt)) { mv = pl.ground ? 'ground' : 'air'; }
        else {
          var fy = pl.r[1] * Math.PI / 180, gx = wx, gz = wz;
          if (Math.abs(gx) + Math.abs(gz) < 0.1) { gx = Math.sin(fy); gz = Math.cos(fy); }
          pl.v[0] += (gx * 7 - pl.v[0]) * Math.min(1, 3 * dt); pl.v[2] += (gz * 7 - pl.v[2]) * Math.min(1, 3 * dt);
          pl.r[1] = Math.atan2(pl.v[0], pl.v[2]) * 180 / Math.PI;
          pl.mv = mv;
          return true;
        }
      } else if (c.glide && inp.jumpHit && !pl.ground && pl.coyote <= 0 && pl.jumpT <= 0 && !st.tired && pl.v[1] < 2) {
        pl.mv = 'glide'; pl.v[1] = Math.max(pl.v[1], -1); fx({ type: 'sound', name: 'door' });
        return true;
      }
      if (!pl.ground && mv === 'ground') { mv = 'air'; }
      pl.mv = mv;
      if (st.wait > 0) { st.wait -= dt; } else if (!pl.sprinting) { st.v = Math.min(st.max, st.v + 25 * dt); }
      return false;
    }

    function playerControl(pl, inp, dt) {
      var c = pl.comps.player, speed = num(c.speed, 6) * S.mods.speed;
      var mx = num(inp.mx, 0), mz = num(inp.mz, 0), yaw = num(inp.yaw, 0), wx, wz;
      var m = Math.hypot(mx, mz);
      if (m > 1) { mx /= m; mz /= m; }
      /* 1인칭은 몸이 시선을 따른다(inp.face) — 락온 같은 플러그인이 덮어쓸 수 있다 */
      var mod = { speed: 1, jump: true, face: inp.face != null ? num(inp.face, 0) : null, skip: false };
      plugs.forEach(function (g) { if (g.control) { g.control(pl, inp, dt, mod); } });
      if (mod.skip) { pl.mv = pl.ground ? 'ground' : 'air'; return; }
      speed *= mod.speed;
      if (c.mode === 'side') { wx = mx; wz = 0; } else {
        wx = Math.cos(yaw) * mx - Math.sin(yaw) * mz;
        wz = -Math.sin(yaw) * mx - Math.cos(yaw) * mz;
      }
      if (traverse(pl, inp, dt, c, wx, wz)) { return; }
      /* 달리기 — 땅에서 Shift 누르고 있기 */
      var wasSprint = pl.sprinting;
      pl.sprinting = false;
      if (c.sprint && inp.sprint && pl.ground && Math.abs(wx) + Math.abs(wz) > 0.1 && stamUse(8 * dt)) { speed *= 1.6; pl.sprinting = true; }
      if (wasSprint && !pl.sprinting) { S.stamina.wait = 0.8; }
      /* 땅에선 곧바로, 공중에선 조금 둔하게 */
      var k = pl.ground ? 1 : 0.12;
      pl.v[0] += (wx * speed - pl.v[0]) * Math.min(1, k * 60 * dt);
      pl.v[2] += (wz * speed - pl.v[2]) * Math.min(1, k * 60 * dt);
      if (mod.face != null || Math.abs(wx) + Math.abs(wz) > 0.05) {
        var want = mod.face != null ? mod.face : Math.atan2(wx, wz) * 180 / Math.PI, cur = pl.r[1];
        var dd = ((want - cur + 540) % 360) - 180;
        pl.r[1] = inp.face != null && mod.face === inp.face ? want : cur + dd * Math.min(1, 14 * dt);
      }
      if (inp.jump && mod.jump && c.mode !== 'walk' && (pl.ground || pl.coyote > 0) && !(pl.jumpT > 0)) {
        pl.v[1] = num(c.jump, 8); pl.ground = false; pl.coyote = 0; pl.jumpT = 0.25; pl.mv = 'air';
        fx({ type: 'sound', name: 'jump' });
      }
    }

    function nearest(pl, filter, reach) {
      var best = null, bd = reach;
      for (var i = 0; i < S.ents.length; i++) {
        var o = S.ents[i];
        if (o === pl || !o.alive || o.hidden || !filter(o)) { continue; }
        var d = Math.hypot(o.p[0] - pl.p[0], o.p[2] - pl.p[2]);
        if (Math.abs(o.p[1] - pl.p[1]) > 3) { continue; }
        if (d < bd) { bd = d; best = o; }
      }
      return best;
    }

    function actPress(pl) {
      var c = pl.comps.player, reach = Math.max(REACH, num(c.range, 1.8));
      /* 0) 시스템(채집·상자·상점·낚시 …)이 먼저 */
      for (var gi = 0; gi < plugs.length; gi++) { if (plugs[gi].act && plugs[gi].act(pl, reach)) { return; } }
      /* 1) 말 걸기 */
      var npc = nearest(pl, function (o) { return !!o.comps.talk; }, reach);
      if (npc) {
        var lines = (npc.comps.talk.lines || []).map(interp).filter(function (l) { return l !== ''; });
        if (lines.length) { S.dialog = { name: interp(npc.comps.talk.name || npc.name), lines: lines, i: 0 }; fx({ type: 'sound', name: 'blip' }); }
      }
      /* 2) "살폈을 때" 이벤트 */
      var fired = false;
      evs.forEach(function (x) {
        var w = x.ev.when || {};
        if (w.on !== 'act') { return; }
        var ctx = { self: x.self };
        var t = nearest(pl, function (o) { return matches(w.b || 'self', o, ctx); }, reach);
        if (t) { fire(x.ev, { self: t, other: pl }); fired = true; }
      });
      if (npc || fired) { return; }
      /* 3) 공격 */
      var dmg = num(c.attack, 0) * (S.mods.atk || 1);
      if (dmg <= 0 || plugs.some(function (g) { return g.sysName === 'combat'; })) { return; }
      pl.act = 0.25;
      fx({ type: 'swing' });
      var yaw = pl.r[1] * Math.PI / 180, fx0 = Math.sin(yaw), fz0 = Math.cos(yaw), hit = false;
      S.ents.forEach(function (o) {
        if (!o.alive || !o.comps.health || o === pl || o.hidden) { return; }
        var dx = o.p[0] - pl.p[0], dz = o.p[2] - pl.p[2], d = Math.hypot(dx, dz);
        if (d > num(c.range, 1.8) + 0.6 || Math.abs(o.p[1] - pl.p[1]) > 2) { return; }
        if (d > 0.3 && (dx * fx0 + dz * fz0) / d < 0.2) { return; }
        o.hp -= dmg; o.hitT = 0.25; hit = true;
        var kb = d > 0.01 ? 6 / d : 0;
        if (!o.comps.patrol) { o.v[0] = dx * kb; o.v[2] = dz * kb; if (o.body.type === 'dynamic') { o.v[1] = 3; } o.kb = 0.2; }
        if (o.hp <= 0) { destroy(o); fx({ type: 'poof', at: o.p.slice() }); }
      });
      if (hit) { fx({ type: 'sound', name: 'hit' }); }
    }

    function behaviours(e, dt) {
      var c = e.comps;
      var before = e.p.slice();
      if (c.spin) { e.r[1] = (e.r[1] + num(c.spin.speed, 90) * dt) % 360; }
      if (c.patrol) {
        var dx = num(c.patrol.dx, 0), dy = num(c.patrol.dy, 0), dz = num(c.patrol.dz, 0);
        var len = Math.hypot(dx, dy, dz);
        if (len > 0.001) {
          var ph = (e.t * num(c.patrol.speed, 2) / len) % 2, f = ph < 1 ? ph : 2 - ph;
          e.p = [e.home[0] + dx * f, e.home[1] + dy * f, e.home[2] + dz * f];
          if (Math.abs(dx) + Math.abs(dz) > 0.01 && !c.spin) { e.r[1] = Math.atan2(ph < 1 ? dx : -dx, ph < 1 ? dz : -dz) * 180 / Math.PI; }
        }
      }
      if (c.bob) { e.p[1] = (c.patrol ? e.p[1] : e.home[1]) + Math.sin(e.t * num(c.bob.speed, 2)) * num(c.bob.amp, 0.25); }
      if (c.chase && S.player && !e.kb) {
        var pl = S.player, ddx = pl.p[0] - e.p[0], ddz = pl.p[2] - e.p[2], d = Math.hypot(ddx, ddz);
        if (d < num(c.chase.range, 8) && d > 0.8) {
          var sp = num(c.chase.speed, 3);
          if (e.body.type === 'dynamic') { e.v[0] = ddx / d * sp; e.v[2] = ddz / d * sp; } else { e.p[0] += ddx / d * sp * dt; e.p[2] += ddz / d * sp * dt; }
          e.r[1] = Math.atan2(ddx, ddz) * 180 / Math.PI;
        } else if (e.body.type === 'dynamic') { e.v[0] *= 0.8; e.v[2] *= 0.8; }
      } else if (e.body.type === 'dynamic' && e.ground && !e.kb) { e.v[0] *= 0.85; e.v[2] *= 0.85; }
      if (e.body.type !== 'dynamic') { e.spd = Math.hypot(e.p[0] - before[0], e.p[2] - before[2]) / Math.max(dt, 1e-6); }
      return [e.p[0] - before[0], e.p[1] - before[1], e.p[2] - before[2]];
    }

    function touchEvents() {
      var now = {};
      var pl = S.player;
      /* 컴포넌트가 붙은 닿음(플레이어 기준) */
      if (pl && pl.alive) {
        var pb = box(pl);
        for (var i = 0; i < S.ents.length; i++) {
          var o = S.ents[i];
          if (o === pl || !o.alive || o.hidden || o.body.type === 'none') { continue; }
          if (!overlap(pb, box(o), o.body.type === 'trigger' ? 0 : 0.06)) { continue; }
          var c = o.comps, key = pl.id + '|' + o.id;
          now[key] = 1;
          var fresh = !touching[key];
          for (var gi = 0; gi < plugs.length; gi++) { if (plugs[gi].touch) { plugs[gi].touch(pl, o, fresh); } }
          if (!pl.alive || S.battle) { break; }
          if (c.hurt && pl.inv <= 0) {
            S.vars[c.hurt.var] = num(getVar(c.hurt.var), 0) - num(c.hurt.amount, 1);
            pl.inv = INV_SEC; fx({ type: 'sound', name: 'hit' }); fx({ type: 'shake', sec: 0.2, power: 0.25 });
            var kx = pl.p[0] - o.p[0], kz = pl.p[2] - o.p[2], kd = Math.hypot(kx, kz) || 1;
            pl.v[0] = kx / kd * 7; pl.v[2] = kz / kd * 7; pl.v[1] = 5; pl.ground = false;
          }
          if (!fresh) { continue; }
          if (c.pickup) {
            S.vars[c.pickup.var] = num(getVar(c.pickup.var), 0) + num(c.pickup.add, 1);
            fx({ type: 'sound', name: c.pickup.sound || 'coin' }); fx({ type: 'poof', at: o.p.slice(), small: true });
            destroy(o);
          }
          if (c.launch) { pl.v[1] = num(c.launch.power, 16); pl.ground = false; fx({ type: 'sound', name: 'jump' }); }
          if (c.goal && !S.over) { S.over = { win: true, text: interp(c.goal.text) }; fx({ type: 'sound', name: 'win' }); }
          if (c.portal && !S.over) { fx({ type: 'sound', name: 'door' }); jobs.push({ list: [{ do: 'goto', scene: c.portal.scene, at: c.portal.at }], i: 0, ctx: {}, wait: 0 }); }
        }
      }
      /* "닿았을 때" 이벤트 */
      evs.forEach(function (x, idx) {
        var w = x.ev.when || {};
        if (w.on !== 'touch') { return; }
        var ctx0 = { self: x.self };
        var A = pick(w.a || (x.self ? 'self' : 'player'), ctx0), B = pick(w.b || (x.self ? 'self' : ''), ctx0);
        for (var i = 0; i < A.length; i++) {
          for (var j = 0; j < B.length; j++) {
            var a = A[i], b = B[j];
            if (a === b || a.hidden || b.hidden || a.body.type === 'none' || b.body.type === 'none') { continue; }
            if (!overlap(box(a), box(b), (a.body.type === 'trigger' && b.body.type === 'trigger') ? 0 : 0.06)) { continue; }
            var k = idx + ':' + a.id + '|' + b.id;
            now[k] = 1;
            if (!touching[k]) { fire(x.ev, { self: x.self || a, other: x.self === a ? b : (x.self ? a : b) }); }
          }
        }
      });
      touching = now;
    }

    function edgeEvents() {
      evs.forEach(function (x, idx) {
        var w = x.ev.when || {};
        if (w.on === 'var') {
          var cur = getVar(w.var), ok = (OPS[w.op] || OPS['>='])(cur, typeof cur === 'number' ? num(w.value, 0) : String(w.value));
          if (ok && !prevVarOk[idx]) { fire(x.ev, { self: x.self }); }
          prevVarOk[idx] = ok;
        } else if (w.on === 'gone') {
          var n = pick(w.b, { self: x.self }).length;
          if (n === 0 && prevGone[idx] > 0) { fire(x.ev, { self: x.self }); }
          prevGone[idx] = n;
        }
      });
    }

    function step(dt, inp) {
      inp = inp || {};
      if (S.over) { return S; }
      /* 공용 메뉴(상점·선택지·거점·미니게임) — 열려 있으면 필드가 멈춘다 */
      if (S.menu) {
        var M = S.menu, n = M.items.length;
        if (menuPick != null) { M.cur = menuPick; menuPick = null; inp = Object.assign({}, inp, { ok: true }); }
        if (M.tick) { M.tick(dt, inp); }
        if (S.menu === M && n) {
          if (inp.up) { M.cur = (M.cur - 1 + n) % n; fx({ type: 'sound', name: 'blip' }); }
          if (inp.down) { M.cur = (M.cur + 1) % n; fx({ type: 'sound', name: 'blip' }); }
        }
        if (S.menu === M && inp.back && M.cancel !== false) { S.menu = null; if (M.onClose) { M.onClose(null); } }
        else if (S.menu === M && inp.ok && n) {
          var it = M.items[M.cur];
          if (it && !it.disabled) { var hnd = menuKinds[M.kind]; if (hnd) { hnd(it, M); } else if (M.onPick) { M.onPick(it, M); } }
        }
        runJobs(0);
        return S;
      }
      if (S.dialog) {
        if (inp.act || inp.jump) {
          S.dialog.i++;
          if (S.dialog.i >= S.dialog.lines.length) { S.dialog = null; }
        }
        runJobs(0);
        return S;
      }
      S.t += dt; S.sceneT += dt; S.frame++;
      if (S.toast && S.t > S.toast.until) { S.toast = null; }
      /* 전투 플러그인 — true 면 이 걸음은 필드를 멈춘다(파판식 전투 화면) */
      var held = false;
      for (var pgi = 0; pgi < plugs.length; pgi++) { if (plugs[pgi].step && plugs[pgi].step(dt, inp)) { held = true; break; } }
      if (held) { runJobs(dt); edgeEvents(); return S; }

      /* 몇 초마다 */
      evs.forEach(function (x, idx) {
        var w = x.ev.when || {};
        if (w.on !== 'every') { return; }
        everyAt[idx] -= dt;
        if (everyAt[idx] <= 0) { everyAt[idx] += Math.max(0.05, num(w.sec, 2)); fire(x.ev, { self: x.self }); }
      });
      /* 키 */
      if (inp.keys) {
        evs.forEach(function (x) { var w = x.ev.when || {}; if (w.on === 'key' && inp.keys[w.key]) { fire(x.ev, { self: x.self }); } });
      }

      /* 스스로 움직이는 것(왕복·둥실·돌기·쫓기) — 올라탄 떨어지는 몸을 싣고 간다 */
      var i, e;
      for (i = 0; i < S.ents.length; i++) {
        e = S.ents[i];
        if (!e.alive) { continue; }
        e.t += dt;
        if (e.inv > 0) { e.inv -= dt; }
        if (e.hitT > 0) { e.hitT -= dt; }
        if (e.act > 0) { e.act -= dt; }
        if (e.kb > 0) { e.kb -= dt; if (e.kb <= 0) { e.kb = 0; if (e.body.type !== 'dynamic') { e.v = [0, 0, 0]; } } }
        if (e === S.player) { continue; }
        var dlt = behaviours(e, dt);
        if (e.kb && e.body.type !== 'dynamic') { e.p[0] += e.v[0] * dt; e.p[2] += e.v[2] * dt; }
        if (e.body.type === 'solid' && (dlt[0] || dlt[1] || dlt[2])) {
          for (var j = 0; j < S.ents.length; j++) {
            var r = S.ents[j];
            if (r.alive && r.standOn === e) { r.p[0] += dlt[0]; r.p[1] += dlt[1]; r.p[2] += dlt[2]; }
          }
        }
      }
      /* 플레이어 */
      var pl = S.player;
      if (pl && pl.alive) { playerControl(pl, inp, dt); }
      /* 떨어지는 몸 */
      for (i = 0; i < S.ents.length; i++) {
        e = S.ents[i];
        if (e.alive && e.body.type === 'dynamic' && !e.hidden) { physics(e, dt, solidsFor(e)); }
      }
      if (pl && pl.alive && inp.act) { actPress(pl); }
      plugs.forEach(function (g) { if (g.post) { g.post(dt, inp); } });

      touchEvents();

      /* 사라짐 */
      while (destroyedQ.length) {
        var dd = destroyedQ.shift();
        evs.forEach(function (x) {
          var w = x.ev.when || {};
          if (w.on !== 'destroyed') { return; }
          /* 이미 죽은 개체는 pick 에 안 잡히니 직접 맞춘다 */
          var sel = w.b || 'self';
          var hit = sel === 'self' ? x.self === dd : sel[0] === '#' ? dd.tag === sel.slice(1) : sel === 'any' || dd.id === sel || dd.id.split('~')[0] === sel;
          if (hit) { fire(x.ev, { self: dd }); }
        });
      }
      edgeEvents();

      /* 떨어짐 — 들어온 자리로 되돌린다(이벤트가 있으면 그것도 돈다) */
      if (pl && pl.alive && pl.p[1] < FALL_Y) {
        evs.forEach(function (x) { if ((x.ev.when || {}).on === 'fall') { fire(x.ev, { self: x.self, other: pl }); } });
        if (S.entry) { pl.p = S.entry.slice(); pl.v = [0, 0, 0]; }
        fx({ type: 'sound', name: 'hit' });
      }
      runJobs(dt);
      /* 죽은 것 치우기(복제가 쌓이지 않게) */
      if (S.frame % 60 === 0) { S.ents = S.ents.filter(function (x) { return x.alive || !x.def.spawned; }); }
      return S;
    }

    function snapshot() {
      return JSON.stringify({
        t: +S.t.toFixed(4), scene: S.sceneId, vars: S.vars, over: S.over,
        ents: S.ents.filter(function (e) { return e.alive; }).map(function (e) { return [e.id, e.p.map(function (v) { return +v.toFixed(3); }), +e.r[1].toFixed(2), e.hp]; })
      });
    }

    /* 플러그인에게 주는 손잡이 */
    var plugs = [];
    var K = { S: S, P: P, rng: rng, fx: fx, box: box, overlap: overlap, pick: pick, destroy: destroy, getVar: getVar, interp: interp, num: num,
              solidsFor: solidsFor, moveAxis: moveAxis, physics: physics, fire: fire,
              addVar: function (k, v) { S.vars[k] = num(getVar(k), 0) + v; }, setVar: function (k, v) { S.vars[k] = v; },
              stamUse: stamUse, spawnFrom: spawnFrom, enterScene: function (id, at) { return enterScene(id, at); }, nearest: nearest,
              onMenu: function (kind, fn) { menuKinds[kind] = fn; }, plugs: function () { return plugs; },
              openMenu: function (m) { m.cur = m.cur || 0; S.menu = m; return m; },
              toast: function (t, sec) { S.toast = { text: interp(t), until: S.t + (sec || 2.5) }; },
              runAction: function (a, ctx) { jobs.push({ list: [a], i: 0, ctx: ctx || {}, wait: 0, dlg: false }); },
              onDo: function (name, fn) { doKinds[name] = fn; }, fireWhen: fireWhen, spawnDef: spawnDef, makeEnt: makeEnt,
              on: function (name, fn) { (bus[name] = bus[name] || []).push(fn); }, emit: emit,
              say: function (name, lines) { S.dialog = { name: interp(name || ''), lines: lines.map(interp), i: 0 }; fx({ type: 'sound', name: 'blip' }); } };
    SYSTEMS.forEach(function (sy) { var g = sy.make(K, P); if (g) { g.sysName = sy.name; plugs.push(g); } });
    var style = (P.combat && P.combat.style) || 'simple';
    if (STYLES[style] && STYLES[style].make) { var cg = STYLES[style].make(K, P.combat || {}); cg.sysName = 'combat'; plugs.push(cg); }

    /* 세이브 — 변수·깃발·배율·자리·시스템 상태(판 밖 localStorage 에 담는 건 play 쪽) */
    function save() {
      var pl = S.player, sys = {};
      plugs.forEach(function (g) { if (g.save) { sys[g.sysName] = g.save(); } });
      return { format: 'saga-engine-save', v: 1, project: P.id, t: S.t, scene: S.sceneId, pos: pl ? pl.p.slice() : null, yaw: pl ? pl.r[1] : 0,
               vars: clone(S.vars), flags: clone(S.flags), mods: clone(S.mods), sys: sys };
    }
    function load(o) {
      if (!o || o.format !== 'saga-engine-save' || o.project !== P.id) { return false; }
      restart();
      S.vars = clone(o.vars || {}); S.flags = clone(o.flags || {}); if (o.mods) { S.mods = Object.assign(S.mods, o.mods); }
      S.t = num(o.t, 0);
      plugs.forEach(function (g) { if (g.load && o.sys && o.sys[g.sysName] != null) { g.load(o.sys[g.sysName]); } });
      enterScene(o.scene, null);
      if (S.player && o.pos) { S.player.p = o.pos.slice(); S.player.r[1] = num(o.yaw, 0); S.entry = o.pos.slice(); }
      return true;
    }
    restart();
    return {
      state: S, step: step, drainFx: drainFx, restart: restart, enterScene: enterScene, snapshot: snapshot, pick: pick, box: box,
      getVar: getVar, setVar: function (k, v) { S.vars[k] = v; }, project: P, style: style,
      combat: plugs.filter(function (g) { return g.sysName === 'combat'; })[0] || null,
      system: function (n) { return plugs.filter(function (g) { return g.sysName === n; })[0] || null; },
      save: save, load: load, menuPick: function (i) { menuPick = i; }
    };
  }

  /* 빈 프로젝트 */
  function blank(id, title) {
    return {
      format: FORMAT, version: VERSION, id: id, title: title || id, desc: '', start: 'main',
      vars: { coins: 0, hp: 3 },
      hud: [{ var: 'hp', label: '체력', style: 'hearts' }, { var: 'coins', label: '동전' }],
      scenes: [{
        id: 'main', name: '첫 장면',
        env: { sky: '#9fd0ff', fog: 90, light: 1, ground: { size: 60, color: '#7fb069' }, gravity: GRAV },
        camera: { mode: 'follow', dist: 9, height: 4.5 },
        entities: [
          { id: 'player', name: '플레이어', pos: [0, 0, 0], look: { shape: 'capsule', color: '#3b82f6' },
            body: { type: 'dynamic', size: [0.8, 1.8, 0.8] }, comps: { player: compDefaults('player') } }
        ],
        events: [{ when: { on: 'var', var: 'hp', op: '<=', value: 0 }, do: [{ do: 'lose', text: '쓰러졌다…' }] }]
      }]
    };
  }

  var API = {
    FORMAT: FORMAT, VERSION: VERSION, SHAPES: SHAPES, BODIES: BODIES, COMP: COMP, WHEN: WHEN, DO: DO, OPS: OPS,
    STYLES: STYLES, addStyle: addStyle, SYSTEMS: SYSTEMS, addSystem: addSystem, addComp: addComp, addDo: addDo, addWhen: addWhen, create: create, validate: validate, displayTexts: displayTexts, blank: blank,
    compDefaults: compDefaults, fieldDefaults: fieldDefaults, mulberry32: mulberry32, clone: clone, terrainH: terrainH
  };
  root.SagaSim = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
})(typeof window !== 'undefined' ? window : globalThis);
