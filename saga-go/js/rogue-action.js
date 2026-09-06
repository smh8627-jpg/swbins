/**
 * 도적전(賊徒戰) — 사가블로식 실시간 위치 전투 (`rogue.js` 전용)
 * ---------------------------------------------------------------
 * `duel.js`(속공·필살·회피 세 버튼 카드)는 야생 조우·성채·토벌이 그대로 쓴다.
 * 도적(적도)만 여기로 바뀐다 — 화면을 안 막고, 지도 위를 실제로 움직이며
 * 사거리 안에 들어가면 자동으로 때린다(사가블로 `dungeon.js`의 결).
 *
 *   자동 공격   사거리 안 + 쿨 끝나면 저절로 나간다(`duel.js`의 속공 수치 그대로)
 *   필살        기(氣)가 차면 버튼 하나로(사거리 안 봄 — 원작 필살과 같다)
 *   강타 회피   버튼이 아니라 **원 밖으로 실제로 벗어나야** 안 맞는다
 *               (사가블로 보스 강타 `dungeon.js SLAM_RANGE`와 같은 결)
 *
 * **판정 층(`create`·`tick`·`ult`·`flee`·`perf`·`fold`)은 순수 함수다.**
 * `duel.js`의 같은 이름 함수와 값 계산을 그대로 맞췄다 — 자가진단이 이것만
 * 직접 굴린다(화면 없이). 균형 상수(`QUICK_MUL`·`FOE_GAP`·`HEAVY_MUL`…)는
 * 새로 만들지 않고 `global.DG.duel`이 이미 뽑아 둔 것을 그대로 읽는다 —
 * 그래서 도적전 난도는 지금과 완전히 같다.
 *
 * `rogue.js`의 `fight(rg, {live:true, dealt, folded})`는 **어떻게 때렸는지 모른다**
 * — 최종 dealt 값만 본다. 그래서 이 파일은 `rogue.js`·`world3d.js`·`battle3d.js`
 * 어느 것도 고치지 않는다. `battle3d.js`가 듣는 `duel:open`·`duel:fx`·`duel:close`
 * 이벤트를 **같은 모양으로** 쏘기만 하면 카메라·알갱이·공격 애니메이션이 그대로
 * 따라온다. `world3d.duelStage()`가 세운 상대는 그 자리에 고정돼 있다(안 쫓아온다) —
 * 카메라(`camAim`)가 매 프레임 내 위치를 다시 읽어 둘을 옆에서 잡아 주므로
 * 움직여도 구도는 따라간다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  function D() { return global.DG.duel; }

  /** 내 사거리(m) — 이 안이면 자동으로 때린다 */
  function MY_REACH() { return core.tuned('rogueAction.reach', 3.0); }
  /** 적의 평타 사거리 — 이보다 멀면 적 평타가 그냥 빗나간다(안 맞는다) */
  function FOE_REACH() { return core.tuned('rogueAction.foeReach', 3.2); }
  /** 강타 반경 — 예고가 풀리는 순간 이 안에 있으면 맞는다, 밖이면 완전히 안 맞는다 */
  function HEAVY_RANGE() { return core.tuned('rogueAction.heavyRange', 5.5); }

  /* ── 판정 층 ──────────────────────────────────────────── */

  /**
   * @param {{foeHp:number, myAtk:number, myDef:number, timeSec?:number}} o
   */
  function create(o) {
    var Dl = D();
    var hp = Math.max(1, Math.round(o.foeHp || 1));
    return {
      foeHp: hp, hp: hp,
      foeAtk: Math.max(1, Math.round(hp * 0.010)),
      myAtk: Math.max(1, Math.round(o.myAtk || 1)),
      morale: Math.max(200, Math.round((o.myDef || 0) * Dl.MORALE_MUL)),
      moraleMax: Math.max(200, Math.round((o.myDef || 0) * Dl.MORALE_MUL)),
      left: o.timeSec || Dl.TIME_SEC,
      timeSec: o.timeSec || Dl.TIME_SEC,
      ki: 0,
      cd: 0,
      foeT: Dl.FOE_GAP,
      foeN: 0,
      tell: 0,             // 0보다 크면 강타를 예고하는 중
      dealt: 0,
      hits: 0,
      ults: 0,
      dodgeTry: 0,          // duel.js와 성과 모양을 맞추려고 남겨 둔다(늘 0)
      dodgeOk: 0,
      taken: 0,
      acts: [],
      over: false,
      cleared: false,
      fled: false
    };
  }

  function note(s, kind, dmg) {
    s.acts.push({ kind: kind, dmg: dmg, left: Math.max(0, s.hp) });
    if (s.acts.length > 60) { s.acts.shift(); }
  }

  function finishIfDone(s) {
    if (s.hp <= 0) { s.over = true; s.cleared = true; }
  }

  /**
   * 한 틱 — 위치(dist)를 받는다는 것만 `duel.js`의 `step(s, dt)`와 다르다.
   * @param dist 나와 적 사이 거리(m). null/undefined 면 "닿을 수 없다"로 본다
   * @returns {Array} 이 사이에 벌어진 일 — 화면 층이 `duel:fx`로 옮겨 쏜다
   */
  function tick(s, dt, dist) {
    var ev = [];
    if (s.over) { return ev; }
    var Dl = D();
    var d = (dist === undefined || dist === null) ? 1e9 : dist;

    if (s.cd > 0) { s.cd = Math.max(0, s.cd - dt); }
    s.left -= dt;

    /* 내 자동 공격 — 사거리 안 + 쿨 끝 */
    if (d <= MY_REACH() && s.cd <= 0) {
      var dmg = Math.round(s.myAtk * Dl.QUICK_MUL * (0.9 + Math.random() * 0.2));
      s.cd = Dl.QUICK_CD;
      s.ki = Math.min(Dl.KI_MAX, s.ki + Dl.QUICK_KI);
      s.hp -= dmg;
      s.dealt += dmg;
      s.hits++;
      note(s, 'quick', dmg);
      ev.push({ t: 'quick', dmg: dmg });
      finishIfDone(s);
      if (s.over) { return ev; }
    }

    /* 강타 예고가 끝나면 실제로 맞는지 — 버튼이 아니라 **거리로만** 가른다 */
    if (s.tell > 0) {
      s.tell -= dt;
      if (s.tell <= 0) {
        s.tell = 0;
        var dodged = d > HEAVY_RANGE();
        var heavy = dodged ? 0 : Math.round(s.foeAtk * Dl.HEAVY_MUL);
        if (!dodged) { s.morale -= heavy; s.taken += heavy; }
        ev.push({ t: 'heavy', dmg: heavy, dodged: dodged });
        s.foeT = Dl.FOE_GAP;
      }
    } else {
      s.foeT -= dt;
      if (s.foeT <= 0) {
        s.foeN++;
        if (s.foeN % Dl.FOE_HEAVY === 0) {
          s.tell = Dl.TELL_SEC;
          ev.push({ t: 'tell' });
        } else if (d <= FOE_REACH()) {
          var hit = Math.round(s.foeAtk * (0.85 + Math.random() * 0.3));
          s.morale -= hit;
          s.taken += hit;
          ev.push({ t: 'hit', dmg: hit });
          s.foeT = Dl.FOE_GAP;
        } else {
          /* 너무 멀어 헛손질 — 다음 차례를 기다린다 */
          ev.push({ t: 'miss' });
          s.foeT = Dl.FOE_GAP;
        }
      }
    }

    if (s.morale <= 0) { s.morale = 0; s.over = true; s.cleared = false; ev.push({ t: 'rout' }); }
    else if (s.left <= 0) { s.left = 0; s.over = true; s.cleared = s.hp <= 0; ev.push({ t: 'time' }); }
    return ev;
  }

  /** 필살 — 기(氣)가 차야 나가고, 사거리는 안 본다(원작·`duel.js`와 같다) */
  function ult(s) {
    if (!s || s.over) { return { ok: false, reason: 'over' }; }
    var Dl = D();
    if (s.ki < Dl.KI_MAX) { return { ok: false, kind: 'ult', reason: 'noki' }; }
    var big = Math.round(s.myAtk * Dl.ULT_MUL);
    s.ki = 0;
    s.hp -= big;
    s.dealt += big;
    s.ults++;
    note(s, 'ult', big);
    finishIfDone(s);
    return { ok: true, kind: 'ult', dmg: big };
  }

  /** 물러난다 — 성과는 그때까지 낸 만큼만 인정된다 */
  function flee(s) { s.over = true; s.fled = true; s.cleared = false; }

  /** 성과 — `duel.js`의 `perf()`와 완전히 같은 모양(`rogue.js`가 이 모양만 본다) */
  function perf(s) {
    var ratio = s.dealt / Math.max(1, s.foeHp);
    return {
      live: true,
      ratio: ratio,
      score: core.clamp(ratio, 0, 1.6),
      dealt: s.dealt,
      cleared: !!s.cleared,
      fled: !!s.fled,
      hits: s.hits, ults: s.ults,
      dodgeOk: s.dodgeOk, dodgeTry: s.dodgeTry,
      taken: s.taken,
      timeUsed: Math.round((s.timeSec - s.left) * 10) / 10,
      acts: s.acts
    };
  }

  /** `duel.js`의 `fold()`와 완전히 같다 — 백 번의 자동 공격을 열 덩이로 접는다 */
  function fold(s, cap) {
    var n = cap || 10;
    var acts = s.acts;
    if (!acts.length) { return []; }
    var per = Math.ceil(acts.length / n), out = [], i, k = 0;
    for (i = 0; i < acts.length; i += per) {
      var sum = 0, ult2 = 0, last = 0;
      for (var j = i; j < Math.min(acts.length, i + per); j++) {
        sum += acts[j].dmg;
        if (acts[j].kind === 'ult') { ult2++; }
        last = acts[j].left;
      }
      k++;
      out.push({ n: k, dmg: sum, left: last, ult: ult2 });
    }
    return out;
  }

  /* ── 화면 층 ──────────────────────────────────────────── */

  var el = null, cur = null, rafId = null, doneCb = null, meta = null, lastT = null;

  function host() { return document.getElementById('rogue-hud'); }
  function $(sel) { return el ? el.querySelector(sel) : null; }

  /** 지금 적이 실제로 선 자리 — `world3d.duelStage()`가 세운 자리를 우선 쓰고,
   *  3D가 꺼져 있으면(WebGL 없음 등) `battle3d.spot()`과 같은 계산으로 대신한다 */
  function foePos() {
    var W3 = global.DG.world3d;
    if (W3 && W3.duelFoe) {
      var df = W3.duelFoe();
      if (df) { return { x: df.x, y: df.y }; }
    }
    var pos = core.save.player.pos;
    return { x: pos.x, y: pos.y - 6 };
  }

  function myFighter() {
    var id = core.save.party && core.save.party[0];
    var h = id ? global.DG.data.find(id) : null;
    if (!h) { return { name: '나' }; }
    return { name: h.name };
  }

  function paint() {
    if (!el) { return; }
    el.innerHTML = '' +
      '<div class="ra-hud">' +
        '<div class="ra-row ra-foe"><small>' + meta.foeName + '</small>' +
          '<div class="bar red"><i id="ra-hp" style="width:100%"></i></div></div>' +
        '<div class="ra-row"><small>사기</small>' +
          '<div class="bar blue"><i id="ra-mor" style="width:100%"></i></div></div>' +
        '<div class="ra-row"><small>기(氣)</small>' +
          '<div class="bar ki"><i id="ra-ki" style="width:0%"></i></div></div>' +
        '<div class="ra-tell" id="ra-tell">⚠️ 강타! 원 밖으로 물러서라</div>' +
        '<div class="ra-pad">' +
          '<button class="btn primary" id="ra-ult" data-ra="ult" disabled>필살</button>' +
          '<button class="btn ghost" id="ra-flee" data-ra="flee">물러나기</button>' +
        '</div>' +
      '</div>';
  }

  function refresh() {
    if (!el || !cur) { return; }
    var hp = $('#ra-hp'), mor = $('#ra-mor'), ki = $('#ra-ki'), tell = $('#ra-tell'), ub = $('#ra-ult');
    if (hp) { hp.style.width = Math.max(0, cur.hp / cur.foeHp * 100) + '%'; }
    if (mor) { mor.style.width = Math.max(0, cur.morale / cur.moraleMax * 100) + '%'; }
    if (ki) { ki.style.width = Math.min(100, cur.ki / D().KI_MAX * 100) + '%'; }
    if (tell) {
      /* 예고가 없을 땐 같은 자리를 "다가가라" 안내로 쓴다 — 무대가 세우는
         거리(약 8m)가 내 사거리(3m)보다 멀어, 걸어 들어가지 않으면 자동
         공격도 상대 공격도 영영 안 난다(2026-09-06, 실전 포획 첫 시험에서
         3초를 가만 서 있어도 아무 일이 안 일어나 발견). */
      if (cur.tell > 0) {
        tell.textContent = '⚠️ 강타! 원 밖으로 물러서라';
        tell.classList.add('show');
      } else if (cur.lastDist > MY_REACH()) {
        tell.textContent = '🚶 다가가세요 — 사거리 안이면 저절로 공격합니다';
        tell.classList.add('show');
      } else {
        tell.classList.remove('show');
      }
    }
    if (ub) { ub.disabled = cur.ki < D().KI_MAX; }
  }

  function bind() {
    var u = $('[data-ra="ult"]');
    if (u) {
      u.addEventListener('click', function () {
        if (!cur) { return; }
        var r = ult(cur);
        if (r.ok) {
          core.emit('duel:fx', { kind: 'ult', dmg: r.dmg, mine: true });
          refresh();
          if (cur.over) { finish(); }
        }
      });
    }
    var f = $('[data-ra="flee"]');
    if (f) {
      f.addEventListener('click', function () {
        if (!cur) { return; }
        flee(cur);
        finish();
      });
    }
  }

  function emitEvents(ev) {
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i];
      if (e.t === 'quick') { core.emit('duel:fx', { kind: 'quick', dmg: e.dmg, mine: true }); }
      else if (e.t === 'hit') { core.emit('duel:fx', { kind: 'hit', dmg: e.dmg, mine: false }); }
      else if (e.t === 'heavy') {
        core.emit('duel:fx', { kind: 'heavy', dmg: e.dmg, dodged: !!e.dodged, mine: false });
      } else if (e.t === 'tell') {
        /* 강타 예고 — 화면 아래 HUD 문구만으로는 3D 화면을 보던 눈에 안 들어온다.
           상대 위에 뜨는 경고 알갱이로 같이 알린다(2026-09-05, "실시간 교전 손맛" 점검) */
        core.emit('duel:fx', { kind: 'tell', mine: false });
      }
      /* 'miss'·'rout'·'time' 은 카메라·알갱이로 옮길 것이 없다 — HUD 표시뿐 */
    }
  }

  function frame(ts) {
    if (!cur) { return; }
    var now = ts || (global.performance ? performance.now() : Date.now());
    var dt = Math.min(0.25, lastT === null ? 0 : (now - lastT) / 1000);
    lastT = now;
    var pos = core.save.player.pos, fp = foePos();
    var dist = Math.hypot(pos.x - fp.x, pos.y - fp.y);
    cur.lastDist = dist;
    var ev = tick(cur, dt, dist);
    emitEvents(ev);
    refresh();
    if (cur.over) { finish(); return; }
    rafId = requestAnimationFrame(frame);
  }

  /**
   * 화면을 연다 — `duel.js.open(o)`와 **같은 매개변수·같은 onDone 모양**을 받는다.
   * @param {{title, foeName, portrait?, stage3d?, foeHp, myAtk, myDef, timeSec?, onDone}} o
   */
  function open(o) {
    el = host();
    if (!el) { return null; }
    cur = create(o);
    meta = o;
    doneCb = o.onDone || null;
    lastT = null;
    el.classList.add('show');
    paint();
    bind();
    refresh();
    /* `battle3d.js`가 이 신호를 듣고 `world3d.duelStage()`를 부른다 — `duel.js`가
       쏘는 것과 완전히 같은 모양이라 그쪽 코드는 한 줄도 안 건드린다 */
    core.emit('duel:open', { title: o.title, foeName: o.foeName, stage3d: o.stage3d || null });
    rafId = requestAnimationFrame(frame);
    return cur;
  }

  function finish() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    var p = perf(cur);
    p.folded = fold(cur);
    var cb = doneCb;
    cur = null; doneCb = null; meta = null;
    if (el) { el.innerHTML = ''; el.classList.remove('show'); }
    core.emit('duel:close', p);
    if (cb) { cb(p); }
  }

  global.DG = global.DG || {};
  global.DG.rogueAction = {
    MY_REACH: MY_REACH, FOE_REACH: FOE_REACH, HEAVY_RANGE: HEAVY_RANGE,
    /* 판정 층 — 화면 없이 굴린다 (자가진단이 쓰는 문) */
    create: create, tick: tick, ult: ult, flee: flee, perf: perf, fold: fold,
    /* 화면 층 */
    open: open,
    get active() { return !!cur; }
  };
})(window);
