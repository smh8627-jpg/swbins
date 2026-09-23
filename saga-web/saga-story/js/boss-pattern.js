/**
 * 보스 패턴전(大將戰) — 메이플식 (PLAN §5-9, 2026-09-24 사용자 선택)
 * ---------------------------------------------------------------
 * 사냥터 보스는 여태 "뜸 들이다 달려들기" 하나뿐이었다(주간 관문 대장만 장판·소환).
 * 원작 보스전의 재미는 **읽고 피하는 것**이다 — 바닥에 떨어질 자리가 먼저 그려지고,
 * 체력 구간마다 패턴이 늘고, 마지막엔 안전지대로 뛰어들어야 사는 큰 기술이 온다.
 *
 *   1단계(체력 100~66%)  내려찍기(내 자리 원) · 낙석(세 줄기)
 *   2단계(66~33%)        + 지진(바닥 전체 — 점프하거나 발판 위면 산다) · 부하 둘 부르기
 *   3단계(33% 아래)      + 휩쓸기(화면 전체 — 초록 안전지대만 산다, 최대 체력의 55%)
 *                         광폭: 피해 ×1.25 · 패턴 간격 ×0.7
 *
 * 단계가 넘어가면 포효(흔들림·이름 띠·토스트)하고 걸려 있던 패턴을 거둔다.
 * 관문 대장(e.gate)은 제 패턴(§5-4)이 있어 여기 안 탄다.
 *
 * **판정은 `step(e, dt, api)` 하나다 — 순수하게 e 만 바꾸고 바깥 일은 api 로 한다**
 * (api.p·api.stg·api.fx·api.hurt·api.spawn·api.sfx·api.toast·api.rand·api.hpMax).
 * 그래서 자가진단이 가짜 api 로 단계·예고·판정을 값으로 굴린다.
 */
(function (global) {
  'use strict';

  function core() { return global.DG.core; }
  function K(key, def) { return core().tuned('bossPattern.' + key, def); }
  function on() { return K('on', 1) ? true : false; }

  var P_W = 26, P_H = 54;
  var PHASE_AT = [0.66, 0.33];
  var CD = [6.5, 5.0, 3.8];                  // 단계별 패턴 간격(초)
  var SLAM = { t: 1.0, r: 80, mul: 1.3 };
  var ROCK = { t: 1.1, r: 40, mul: 0.9, n: 3 };
  var QUAKE = { t: 1.2, mul: 1.2 };
  var SWEEP = { t: 1.8, w: 170, pct: 0.55 };
  function ENRAGE() { return K('enrage', 1.25); }

  /** 체력 비율 → 단계(0·1·2) */
  function phaseOf(hp, hpMax) {
    var r = hpMax > 0 ? hp / hpMax : 1;
    return r > PHASE_AT[0] ? 0 : (r > PHASE_AT[1] ? 1 : 2);
  }

  /** 이 단계에서 고를 수 있는 패턴 */
  function poolOf(ph) {
    if (ph === 0) { return ['slam', 'rock']; }
    if (ph === 1) { return ['slam', 'rock', 'quake', 'summon']; }
    return ['slam', 'rock', 'quake', 'sweep'];
  }

  function init(e) {
    if (e.bp) { return e.bp; }
    e.bp = { phase: 0, cd: 3.2, kind: '', t: 0, marks: null, safe: null, summoned: 0, baseDmg: e.dmg, last: '' };
    return e.bp;
  }

  function feet(api) { return { x: api.p.x + P_W / 2, y: api.p.y + P_H }; }

  /** 패턴을 건다 — 예고(fx)를 먼저 내고, t 초 뒤 resolve 가 판정한다 */
  function begin(e, kind, api) {
    var b = e.bp, f = feet(api), stg = api.stg, i;
    b.kind = kind; b.last = kind;
    if (kind === 'slam') {
      b.t = SLAM.t; b.marks = [{ x: f.x, y: f.y, r: SLAM.r }];
      api.fx.push({ t: 'zonewarn', x: f.x, y: f.y, r: SLAM.r, life: SLAM.t });
    } else if (kind === 'rock') {
      b.t = ROCK.t; b.marks = [];
      var off = [0, -(130 + api.rand() * 50), 130 + api.rand() * 50];
      for (i = 0; i < ROCK.n; i++) {
        var mx = Math.max(30, Math.min(stg.width - 30, f.x + off[i]));
        b.marks.push({ x: mx, y: f.y, r: ROCK.r });
        api.fx.push({ t: 'zonewarn', x: mx, y: f.y, r: ROCK.r, life: ROCK.t, rock: true });
      }
    } else if (kind === 'quake') {
      b.t = QUAKE.t; b.marks = null;
      api.fx.push({ t: 'quakewarn', x: f.x, y: stg.floor, life: QUAKE.t });
    } else if (kind === 'sweep') {
      b.t = SWEEP.t;
      var side = api.rand() < 0.5 ? -1 : 1, dist = 150 + api.rand() * 170;
      var sx = f.x + side * dist;
      if (sx < SWEEP.w / 2 + 10 || sx > stg.width - SWEEP.w / 2 - 10) { sx = f.x - side * dist; }
      sx = Math.max(SWEEP.w / 2 + 10, Math.min(stg.width - SWEEP.w / 2 - 10, sx));
      b.safe = { x: sx, w: SWEEP.w };
      api.fx.push({ t: 'sweepwarn', x: sx, w: SWEEP.w, y: stg.floor, life: SWEEP.t });
      api.toast('⚠️ ' + e.ref.name + '의 휩쓸기 — 초록 안전지대로!');
    } else if (kind === 'summon') {
      b.t = 0.4; b.summoned++;
      api.spawn(Math.max(40, e.x - 90));
      api.spawn(Math.min(stg.width - 40, e.x + 90));
      api.toast('👥 ' + e.ref.name + '이(가) 부하를 불렀다!');
    }
    api.sfx(kind === 'summon' ? 'boss' : 'charge');
    /* 돌진과 겹치지 않게 — 패턴이 풀릴 때까지 돌진을 미룬다 */
    e.chargeCd = Math.max(e.chargeCd || 0, b.t + 1.2);
  }

  /** 판정 — 맞았으면 api.hurt(피해). 돌려주는 것은 맞은 수 */
  function resolve(e, api) {
    var b = e.bp, f = feet(api), stg = api.stg, hit = 0, i;
    if (b.kind === 'slam' || b.kind === 'rock') {
      var mul = b.kind === 'slam' ? SLAM.mul : ROCK.mul;
      for (i = 0; i < b.marks.length; i++) {
        var m = b.marks[i];
        if (Math.abs(f.x - m.x) < m.r && Math.abs(f.y - m.y) < m.r * 0.9) { hit++; }
      }
      if (hit) { api.hurt(Math.round(e.dmg * mul)); }
      api.fx.push({ t: 'shake', x: e.x, y: e.y, life: 0.3, span: 0.3, amt: b.kind === 'slam' ? 6 : 4, big: true });
    } else if (b.kind === 'quake') {
      /* 바닥에 발을 붙인 채면 맞는다 — 뛰었거나 발판 위면 산다 */
      if (api.p.onGround && Math.abs(f.y - stg.floor) < 8) { hit = 1; api.hurt(Math.round(e.dmg * QUAKE.mul)); }
      api.fx.push({ t: 'shake', x: e.x, y: e.y, life: 0.5, span: 0.5, amt: 9, big: true });
    } else if (b.kind === 'sweep') {
      if (Math.abs(f.x - b.safe.x) > b.safe.w / 2) { hit = 1; api.hurt(Math.round(api.hpMax() * SWEEP.pct), true); }
      api.fx.push({ t: 'shake', x: e.x, y: e.y, life: 0.6, span: 0.6, amt: 12, big: true });
    }
    b.kind = ''; b.marks = null; b.safe = null;
    return hit;
  }

  /**
   * 한 걸음. near = 보스가 나를 보고 있나(side.js 의 near 와 같다).
   * @returns {{phase:number, changed:boolean, hit:number}}
   */
  function step(e, dt, api, near) {
    var b = init(e), out = { phase: b.phase, changed: false, hit: 0 };
    var ph = phaseOf(e.hp, e.hpMax);
    if (ph > b.phase) {
      b.phase = ph; out.phase = ph; out.changed = true;
      b.kind = ''; b.marks = null; b.safe = null; b.t = 0;
      b.cd = 1.4;                                  // 포효 뒤 곧 새 패턴
      if (ph === 2) { e.dmg = Math.round(b.baseDmg * ENRAGE()); }
      api.fx.push({ t: 'bossintro', name: e.ref.name + (ph === 1 ? ' — 2단계' : ' — 광폭'), life: 1.6 });
      api.fx.push({ t: 'shake', x: e.x, y: e.y, life: 0.6, span: 0.6, amt: 10, big: true });
      api.toast(ph === 1 ? '⚠️ ' + e.ref.name + ' 2단계 — 땅이 흔들린다(점프로 피하라)!' : '🔥 ' + e.ref.name + ' 광폭 — 휩쓸기가 온다!');
      api.sfx('boss');
      return out;
    }
    if (b.kind) {
      b.t -= dt;
      if (b.t <= 0) { out.hit = b.kind === 'summon' ? 0 : resolve(e, api); b.kind = ''; }
      return out;
    }
    b.cd -= dt * (b.phase === 2 ? 1 / 0.7 : 1);
    if (b.cd <= 0 && near && !(e.charge > 0)) {
      var pool = poolOf(b.phase);
      /* 같은 것을 두 번 잇지 않는다 · 부르기는 단계마다 한 번 */
      var cand = pool.filter(function (k) { return k !== b.last && !(k === 'summon' && b.summoned >= b.phase); });
      if (!cand.length) { cand = pool; }
      var kind = cand[Math.floor(api.rand() * cand.length) % cand.length];
      begin(e, kind, api);
      b.cd = CD[b.phase];
    }
    return out;
  }

  global.DG = global.DG || {};
  global.DG.bossPattern = {
    on: on, phaseOf: phaseOf, poolOf: poolOf, step: step, init: init,
    SLAM: SLAM, ROCK: ROCK, QUAKE: QUAKE, SWEEP: SWEEP, CD: CD, PHASE_AT: PHASE_AT
  };
})(window);
