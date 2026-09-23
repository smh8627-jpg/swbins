/**
 * 사가 엔진 — 기본기(basics). sim.js·systems.js 다음에 부른다. three 없이 돈다(node 진단).
 * 범용 엔진이면 있어야 할 것 중 빠져 있던 것:
 *
 *   lever     스위치(레버)      F 로 켠다·끈다 → 변수 0/1 (한 번만 켜지는 것도)
 *   plate     발판 스위치       떨어지는 몸(플레이어·상자)이 올라가 있는 동안 변수 1 — "계속 켜짐"이면 한 번 밟으면 끝
 *   door      문·움직이는 벽    변수가 값이 되면 (dx,dy,dz) 만큼 열리고, 아니면 닫힌다. 몸은 "벽·바닥"
 *   particles 파티클            불·연기·반짝이·분수·마법·낙엽·거품 — 그리기는 play-basics.js
 *   아이템    project.items     [{icon, name, var, desc, useVar, useAmt}] (또는 줄 "아이콘|이름|변수|설명|쓰면 바뀔 변수|양") — I 로 가방, 행동 give·take
 *   camera    컷신 카메라       대상을 몇 초 비춘다(위아래 검은 띠, 그동안 필드 멈춤) — 말하기와 이어 쓰면 컷신
 *   effect    효과              폭발·반짝·치유·연기·불꽃놀이 한 번
 *   music     배경음악 바꾸기   장면 env.music 이 기본(파일 없이 만드는 곡 일곱)
 *   지형 언덕은 sim.js(terrainH — 물리가 쓴다)·view.js(땅 모양)에 있다.
 */
(function (root) {
  'use strict';
  var SIM = root.SagaSim || (typeof require === 'function' ? require('./sim.js') : null);
  if (!SIM) { return; }
  function num(v, d) { v = +v; return isFinite(v) ? v : d; }
  function dist2(a, b) { return Math.hypot(a[0] - b[0], a[2] - b[2]); }

  var MUSIC = { none: '없음', calm: '잔잔(마을)', field: '모험(들판)', town: '장터(흥겨움)', battle: '전투', boss: '보스', night: '밤', cave: '동굴' };
  var PARTICLES = { fire: '불', smoke: '연기', sparkle: '반짝이', fountain: '분수', magic: '마법 고리', leaves: '낙엽', bubbles: '거품' };
  var EFFECTS = { burst: '퍼짐', explosion: '폭발', sparkle: '반짝', heal: '치유', smoke: '연기', firework: '불꽃놀이' };
  /* 조사 — 받침 있으면 a, 없으면 b */
  function jo(w, a, b) { w = String(w); var c = w.charCodeAt(w.length - 1) - 0xAC00; return w + (c >= 0 && c < 11172 && c % 28 === 0 ? b : a); }
  function selOf(o) { return 'sel:' + Object.keys(o).join('|'); }

  /* ── 아이템 표 ─────────────────────────────────────────────────────────── */
  function parseItems(P) {
    return (P.items || []).map(function (l) {
      if (l && typeof l === 'object') { return { icon: l.icon || '', name: l.name || l.var || '', var: l.var || '', desc: l.desc || '', useVar: l.useVar || '', useAmt: num(l.useAmt, 0) }; }
      var p = String(l || '').split('|').map(function (x) { return x.trim(); });
      return { icon: p[0] || '', name: p[1] || p[2] || '', var: p[2] || '', desc: p[3] || '', useVar: p[4] || '', useAmt: num(p[5], 0) };
    }).filter(function (it) { return it.var; });
  }
  SIM.parseItems = parseItems;
  SIM.MUSIC = MUSIC; SIM.PARTICLES = PARTICLES; SIM.EFFECTS = EFFECTS;

  /* ── 컴포넌트·행동 등록(편집기 칸도 여기서 생긴다) ────────────────────────── */
  SIM.addComp('lever', { label: '스위치(레버)', hint: '가까이서 F 로 켜고 끈다. 변수가 1(켬)·0(끔)이 된다. 문 컴포넌트·"변수가 조건에 맞게 될 때" 이벤트와 같이 쓴다.',
    f: { var: ['var', 'switch1', '바꿀 변수'], once: ['b', false, '한 번 켜면 끝(다시 못 끔)'] } });
  SIM.addComp('plate', { label: '발판 스위치', hint: '플레이어나 떨어지는 몸(상자)이 올라가 있는 동안 변수가 1. 내려오면 0.',
    f: { var: ['var', 'plate1', '바꿀 변수'], stay: ['b', false, '한 번 밟으면 계속 켜짐'], who: ['sel:any|player', 'any', '누가 밟아야(any 아무 몸 · player 플레이어만)'] } });
  SIM.addComp('door', { label: '문(열리는 벽)', hint: '변수가 값과 같아지면 (dx,dy,dz) 만큼 움직여 열리고, 달라지면 닫힌다. 몸은 "벽·바닥"으로.',
    f: { var: ['var', 'switch1', '보는 변수'], value: ['s', '1', '열리는 값'], dx: ['n', 0, 'X'], dy: ['n', 3, 'Y(위로 열림)'], dz: ['n', 0, 'Z'], speed: ['n', 3, '빠르기(m/초)'] } });
  SIM.addComp('particles', { label: '파티클', hint: '개체 자리에서 계속 나온다(불·연기·반짝이 …). 개체는 "안 보임"으로 두면 파티클만 보인다.',
    f: { kind: [selOf(PARTICLES), 'fire', '종류(' + Object.keys(PARTICLES).map(function (k) { return k + ' ' + PARTICLES[k]; }).join(' · ') + ')'],
         color: ['s', '', '색(비우면 종류 기본색, 예: #66ccff)'], rate: ['n', 30, '초당 개수'], size: ['n', 1, '크기 배수'] } });

  SIM.addDo('give', { label: '아이템 주기', f: { item: ['var', 'apple', '아이템 변수'], n: ['n', 1, '개수'] } });
  SIM.addDo('take', { label: '아이템 빼앗기', f: { item: ['var', 'apple', '아이템 변수'], n: ['n', 1, '개수'] } });
  SIM.addDo('camera', { label: '컷신 카메라', f: { target: ['s', 'self', '비출 대상'], sec: ['n', 2.5, '초'], dist: ['n', 6, '거리'], height: ['n', 2.5, '높이'], bars: ['b', true, '위아래 검은 띠'] } });
  SIM.addDo('effect', { label: '효과', f: { kind: [selOf(EFFECTS), 'burst', '종류'], at: ['s', 'self', '어디에'], color: ['s', '', '색(비우면 기본)'], size: ['n', 1, '크기 배수'] } });
  SIM.addDo('music', { label: '배경음악 바꾸기', f: { name: [selOf(MUSIC), 'calm', '곡(' + Object.keys(MUSIC).map(function (k) { return k + ' ' + MUSIC[k]; }).join(' · ') + ')'] } });

  /* ════════════════════════════════════════════════════════════════════════ */
  SIM.addSystem('basics', function (K, P) {
    var S = K.S;
    var items = parseItems(P), byVar = {};
    items.forEach(function (it) { byVar[it.var] = it; });
    function itemName(v) { var it = byVar[v]; return it ? (it.icon ? it.icon + ' ' : '') + it.name : v; }

    function enter() {
      S.cine = null;
      S.music = null; // 장면 기본(env.music)으로
      S.ents.forEach(function (e) {
        if (e.comps.door) { e.doorHome = e.p.slice(); }
        if (e.comps.lever) { e.leverOn = !!K.getVar(e.comps.lever.var); }
      });
    }

    /* 가방(I) — 가진 것만, 고르면 쓴다 */
    function openBag() {
      function list() {
        var out = items.filter(function (it) { return K.getVar(it.var) > 0; }).map(function (it) {
          return { label: itemName(it.var) + ' ×' + K.getVar(it.var), sub: it.desc + (it.useVar ? ' — 고르면 쓴다' : ''), it: it };
        });
        if (!out.length) { out.push({ label: '비어 있다', sub: '', disabled: true }); }
        return out;
      }
      K.openMenu({ title: '가방', kind: 'bag', items: list(), onPick: function (row, M) {
        var it = row.it;
        if (!it) { return; }
        if (!it.useVar) { K.toast(itemName(it.var) + ' — ' + (it.desc || '쓸 수 없다'), 2); return; }
        K.addVar(it.var, -1);
        K.addVar(it.useVar, it.useAmt);
        K.toast(jo(it.name, '을', '를') + ' 썼다 — ' + it.useVar + (it.useAmt >= 0 ? ' +' : ' ') + it.useAmt, 2);
        K.fx({ type: 'sound', name: 'coin' });
        M.items = list(); M.cur = Math.min(M.cur, M.items.length - 1);
      } });
    }

    K.onDo('give', function (a) {
      var n = Math.round(num(a.n, 1));
      K.addVar(a.item, n);
      K.toast(itemName(a.item) + ' +' + n, 2);
      K.fx({ type: 'sound', name: 'coin' });
    });
    K.onDo('take', function (a) {
      var n = Math.round(num(a.n, 1));
      K.setVar(a.item, Math.max(0, K.getVar(a.item) - n));
      K.toast(itemName(a.item) + ' -' + n, 2);
    });
    K.onDo('camera', function (a, job, ctx) {
      var t = K.pick(a.target || 'self', ctx)[0];
      var sec = Math.max(0.1, num(a.sec, 2.5));
      if (!t) { return false; }
      S.cine = { id: t.id, at: t.p.slice(), until: S.t + sec, dist: num(a.dist, 6), height: num(a.height, 2.5), bars: a.bars !== false };
      job.wait = sec;
      return true;
    });
    K.onDo('effect', function (a, job, ctx) {
      var t = K.pick(a.at || 'self', ctx)[0];
      var at = t ? [t.p[0], t.p[1] + 0.8, t.p[2]] : (S.player ? S.player.p.slice() : [0, 0, 0]);
      K.fx({ type: 'effect', kind: a.kind || 'burst', at: at, color: a.color || '', size: num(a.size, 1) });
      if (a.kind === 'explosion') { K.fx({ type: 'shake', sec: 0.35, power: 0.4 }); K.fx({ type: 'sound', name: 'hit' }); }
    });
    K.onDo('music', function (a) { S.music = a.name || 'none'; });

    function act(pl, reach) {
      var lv = K.nearest(pl, function (o) { return !!o.comps.lever; }, reach + 0.4);
      if (!lv) { return false; }
      var c = lv.comps.lever;
      if (c.once && lv.leverOn) { K.toast('이미 켜져 있다', 1.2); return true; }
      lv.leverOn = !lv.leverOn;
      K.setVar(c.var, lv.leverOn ? 1 : 0);
      K.fx({ type: 'sound', name: 'door' });
      return true;
    }

    function pressed(e) {
      var c = e.comps.plate, b = K.box(e);
      var top = { x0: b.x0, x1: b.x1, y0: b.y1 - 0.05, y1: b.y1 + 0.35, z0: b.z0, z1: b.z1 };
      return S.ents.some(function (o) {
        if (o === e || !o.alive || o.hidden || o.body.type !== 'dynamic') { return false; }
        if (c.who === 'player' && o !== S.player) { return false; }
        return K.overlap(K.box(o), top);
      });
    }

    function step(dt, inp) {
      /* 스위치·발판·문 */
      S.ents.forEach(function (e) {
        if (!e.alive) { return; }
        if (e.comps.plate) {
          var c = e.comps.plate, on = pressed(e);
          if (c.stay && K.getVar(c.var)) { on = true; }
          if (!!K.getVar(c.var) !== on) { K.setVar(c.var, on ? 1 : 0); K.fx({ type: 'sound', name: on ? 'door' : 'blip' }); }
          e.plateOn = on;
        }
        if (e.comps.door) {
          var d = e.comps.door, home = e.doorHome || (e.doorHome = e.p.slice());
          var open = String(K.getVar(d.var)) === String(d.value == null ? '1' : d.value);
          var to = open ? [home[0] + num(d.dx, 0), home[1] + num(d.dy, 3), home[2] + num(d.dz, 0)] : home;
          var dx = to[0] - e.p[0], dy = to[1] - e.p[1], dz = to[2] - e.p[2], len = Math.hypot(dx, dy, dz);
          if (len > 1e-4) {
            var k = Math.min(1, num(d.speed, 3) * dt / len);
            if (e.doorOpen !== open) { e.doorOpen = open; K.fx({ type: 'sound', name: 'door' }); }
            e.p[0] += dx * k; e.p[1] += dy * k; e.p[2] += dz * k;
          }
        }
        if (e.comps.lever) { e.leverOn = !!K.getVar(e.comps.lever.var); }
      });
      /* 컷신 — 끝날 때까지 필드 멈춤 */
      if (S.cine) {
        if (S.t >= S.cine.until) { S.cine = null; } else {
          var t = S.ents.filter(function (o) { return o.id === S.cine.id && o.alive; })[0];
          if (t) { S.cine.at = t.p.slice(); }
          return true;
        }
      }
      if (inp && inp.keys && inp.keys.KeyI && items.length) { openBag(); }
      return false;
    }

    return { enter: enter, step: step, act: act, openBag: openBag, itemName: itemName, items: items };
  });
})(typeof window !== 'undefined' ? window : globalThis);
