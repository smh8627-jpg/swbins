/**
 * 도적전(賊徒戰) — 사가블로식 실시간 위치 전투
 * ---------------------------------------------------------------
 * 원래는 `rogue.js`(적도) 전용으로 짰지만 도적 특정 로직이 없는 범용 엔진이라
 * `duel.js`(속공·필살·회피 세 버튼 카드)와 완전히 같은 `open(o)`/`onDone` 모양을
 * 그대로 받는다 — `event.js`(야생 조우)·`fort.js`(성채·토벌)도 이제
 * `global.DG.rogueAction || global.DG.duel` 드롭인으로 이 엔진을 먼저 쓴다
 * (2026-09-06, 스태거·패턴3종·연타·차지를 그 세 곳에도 옮김). 스크립트 하나가
 * 빠지면 옛 `duel.js` 카드로 조용히 되돌아간다. 화면을 안 막고, 지도 위를
 * 실제로 움직이며 사거리 안에 들어가면 자동으로 때린다(사가블로 `dungeon.js`의 결).
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

  /* ── 몬스터헌터 나우 식 손맛 셋 (2026-09-06, "전투를 더 잼나게") ──────
   *   스태거   맞을수록 차는 게이지. 다 차면 적이 잠깐 기절한다 —
   *            공격을 못 하고, 그동안 내 피해가 늘어난다(MH의 "부위 파괴" 손맛)
   *   패턴     강타 하나뿐이던 적 큰 공격을 셋으로 늘린다 — 반경·예고 시간·
   *            피해가 저마다 달라 "이번엔 얼마나 물러서야 하나"가 매번 갈린다
   *   차지     시간이 지나면 저절로 차는 자원. 버튼으로 큰 한 방을 낸다
   *            (필살과 별개 — 필살은 때려야 차고, 차지는 가만있어도 찬다)
   */
  function STAGGER_SEC() { return core.tuned('rogueAction.staggerSec', 2.5); }
  function STAGGER_GAIN() { return core.tuned('rogueAction.staggerGain', 0.6); }   // 게이지 = 낸 피해 × 이 값
  function STAGGER_BONUS() { return core.tuned('rogueAction.staggerBonus', 1.5); } // 기절 중 피해 배수
  function POISE_DECAY() { return core.tuned('rogueAction.poiseDecay', 6); }       // 손 놓으면 초당 이만큼 식는다
  function COMBO_N() { return core.tuned('rogueAction.comboN', 5); }               // 몇 번째 연타마다 회심
  function COMBO_MUL() { return core.tuned('rogueAction.comboMul', 1.8); }
  function COMBO_GAP() { return core.tuned('rogueAction.comboGap', 1.4); }         // 이보다 오래 안 때리면 연타가 끊긴다
  function CHARGE_MAX() { return core.tuned('rogueAction.chargeSec', 5); }         // 이만큼 있으면 다 찬다
  function CHARGE_MUL() { return core.tuned('rogueAction.chargeAtkMul', 0.35); }   // 차지 피해 = 공격력 × 이 값

  /** 적의 큰 공격 사다리 — 예고가 풀리는 순간의 반경·배수가 저마다 다르다.
   *  **순서가 뜻이다**: `foeN`이 `FOE_HEAVY`의 배수가 될 때마다 다음 것으로
   *  넘어간다(무작위가 아니다 — 자가진단이 값으로 재현할 수 있어야 한다). */
  function foeMoves() {
    var Dl = D();
    return [
      { key: 'heavy', label: '⚠️ 강타! 원 밖으로 물러서라', tellSec: Dl.TELL_SEC, range: HEAVY_RANGE(), dmgMul: Dl.HEAVY_MUL },
      { key: 'charge', label: '⚠️ 돌진! 훨씬 멀리 물러서라', tellSec: Dl.TELL_SEC * 0.75, range: HEAVY_RANGE() * 1.6, dmgMul: Dl.HEAVY_MUL * 1.25 },
      { key: 'sweep', label: '⚠️ 휩쓸기! 넉넉히 물러서라', tellSec: Dl.TELL_SEC * 1.35, range: HEAVY_RANGE() * 1.15, dmgMul: Dl.HEAVY_MUL * 0.7 }
    ];
  }
  function moveByKey(key) {
    var ms = foeMoves();
    for (var i = 0; i < ms.length; i++) { if (ms[i].key === key) { return ms[i]; } }
    return ms[0];
  }

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
      tellMove: 'heavy',   // 지금 예고 중인(또는 마지막) 큰 공격이 무엇인지
      poise: 0,             // 스태거 게이지 — 다 차면 기절
      poiseMax: Math.max(30, Math.round(hp * 0.35)),
      staggered: 0,         // 0보다 크면 기절 중(공격을 못 한다, 내 피해 ↑)
      staggerCount: 0,
      combo: 0,
      comboMax: 0,
      comboT: 0,            // 마지막 명중 이후 지난 시간
      charge: 0,            // 0..CHARGE_MAX, 다 차면 차지 일격을 쓸 수 있다
      chargeUsed: 0,
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

  /** 스태거 게이지를 채운다 — 다 차면 기절시키고 `ev`에 알린다(호출한 쪽이 담당) */
  function addPoise(s, dmg, ev) {
    if (s.staggered > 0) { return; }       // 이미 기절 중이면 또 채우지 않는다
    s.poise = Math.min(s.poiseMax, s.poise + dmg * STAGGER_GAIN());
    if (s.poise >= s.poiseMax) {
      s.poise = 0;
      s.staggered = STAGGER_SEC();
      s.staggerCount++;
      if (ev) { ev.push({ t: 'stagger' }); }
    }
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
    s.comboT = (s.comboT || 0) + dt;
    s.charge = Math.min(CHARGE_MAX(), (s.charge || 0) + dt);   // 가만있어도 찬다(필살과 다르다)
    if (s.staggered > 0) { s.staggered = Math.max(0, s.staggered - dt); }
    else if (s.poise > 0 && s.comboT > COMBO_GAP()) { s.poise = Math.max(0, s.poise - POISE_DECAY() * dt); }

    /* 내 자동 공격 — 사거리 안 + 쿨 끝. 연타가 안 끊겼으면 다섯 번째마다 회심 */
    if (d <= MY_REACH() && s.cd <= 0) {
      s.combo = (s.comboT <= COMBO_GAP()) ? s.combo + 1 : 1;
      s.comboMax = Math.max(s.comboMax, s.combo);
      s.comboT = 0;
      var finisher = s.combo % COMBO_N() === 0;
      var mul = (finisher ? COMBO_MUL() : 1) * (s.staggered > 0 ? STAGGER_BONUS() : 1);
      var dmg = Math.round(s.myAtk * Dl.QUICK_MUL * (0.9 + Math.random() * 0.2) * mul);
      s.cd = Dl.QUICK_CD;
      s.ki = Math.min(Dl.KI_MAX, s.ki + Dl.QUICK_KI);
      s.hp -= dmg;
      s.dealt += dmg;
      s.hits++;
      note(s, finisher ? 'combo' : 'quick', dmg);
      ev.push({ t: finisher ? 'combo' : 'quick', dmg: dmg, combo: s.combo });
      addPoise(s, dmg, ev);
      finishIfDone(s);
      if (s.over) { return ev; }
    }

    /* 강타류 예고가 끝나면 실제로 맞는지 — 버튼이 아니라 **거리로만** 가른다.
       어느 몸짓이었는지는 예고를 걸 때 `tellMove`에 적어 뒀다(패턴마다 반경·배수가 다르다) */
    if (s.tell > 0) {
      s.tell -= dt;
      if (s.tell <= 0) {
        s.tell = 0;
        var mv = moveByKey(s.tellMove);
        var dodged = d > mv.range;
        var heavy = dodged ? 0 : Math.round(s.foeAtk * mv.dmgMul);
        if (!dodged) { s.morale -= heavy; s.taken += heavy; }
        ev.push({ t: 'heavy', dmg: heavy, dodged: dodged, move: mv.key });
        s.foeT = Dl.FOE_GAP;
      }
    } else if (s.staggered <= 0) {          // 기절 중엔 새 공격을 걸지 않는다 — 몰아칠 틈
      s.foeT -= dt;
      if (s.foeT <= 0) {
        s.foeN++;
        if (s.foeN % Dl.FOE_HEAVY === 0) {
          var fm = foeMoves();
          var move = fm[Math.floor(s.foeN / Dl.FOE_HEAVY - 1) % fm.length];
          s.tell = move.tellSec;
          s.tellMove = move.key;
          ev.push({ t: 'tell', move: move.key, label: move.label });
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

  /** 차지 일격 — 시간이 지나면 저절로 차고(필살과 다르다), 사거리 안이어야 맞는다.
   *  살짝 여유(× 1.4)를 주지만 그 밖이면 **헛친다**(차지는 그래도 소모된다 — 무를 수 없다) */
  function chargeAttack(s, dist) {
    if (!s || s.over) { return { ok: false, reason: 'over' }; }
    if ((s.charge || 0) < CHARGE_MAX()) { return { ok: false, kind: 'charge', reason: 'notready' }; }
    s.charge = 0;
    s.chargeUsed = (s.chargeUsed || 0) + 1;
    var d = (dist === undefined || dist === null) ? 1e9 : dist;
    if (d > MY_REACH() * 1.4) {
      note(s, 'chargeMiss', 0);
      return { ok: true, kind: 'charge', dmg: 0, whiffed: true };
    }
    var mul = s.staggered > 0 ? STAGGER_BONUS() : 1;
    var dmg = Math.round(s.myAtk * CHARGE_MUL() * mul);
    s.hp -= dmg;
    s.dealt += dmg;
    s.hits++;
    note(s, 'charge', dmg);
    var ev = [];
    addPoise(s, dmg * 1.4, ev);           // 차지는 스태거 게이지도 더 크게 채운다
    finishIfDone(s);
    return { ok: true, kind: 'charge', dmg: dmg, staggerEv: ev };
  }

  /** 물러난다 — 성과는 그때까지 낸 만큼만 인정된다 */
  function flee(s) { s.over = true; s.fled = true; s.cleared = false; }

  /** 성과 — `duel.js`의 `perf()`와 완전히 같은 모양(`rogue.js`가 이 모양만 본다).
   *  스태거·연타·차지 정보는 뒤에 얹기만 했다 — 없어도 `rogue.js`는 그대로 돈다 */
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
      acts: s.acts,
      staggerCount: s.staggerCount || 0,
      comboMax: s.comboMax || 0,
      chargeUsed: s.chargeUsed || 0
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
        '<div class="ra-row"><small>빈틈</small>' +
          '<div class="bar" id="ra-poise-bar"><i id="ra-poise" style="width:0%"></i></div></div>' +
        '<div class="ra-row"><small>차지</small>' +
          '<div class="bar" id="ra-chg-bar"><i id="ra-chg" style="width:0%"></i></div></div>' +
        '<div class="ra-tell" id="ra-tell">⚠️ 강타! 원 밖으로 물러서라</div>' +
        '<div class="ra-combo" id="ra-combo"></div>' +
        '<div class="ra-pad">' +
          '<button class="btn primary" id="ra-ult" data-ra="ult" disabled>필살</button>' +
          '<button class="btn primary" id="ra-charge" data-ra="charge" disabled>차지 일격</button>' +
          '<button class="btn ghost" id="ra-flee" data-ra="flee">물러나기</button>' +
        '</div>' +
      '</div>';
  }

  function refresh() {
    if (!el || !cur) { return; }
    var hp = $('#ra-hp'), mor = $('#ra-mor'), ki = $('#ra-ki'), poise = $('#ra-poise'), chg = $('#ra-chg'),
      tell = $('#ra-tell'), combo = $('#ra-combo'), ub = $('#ra-ult'), cb = $('#ra-charge');
    if (hp) { hp.style.width = Math.max(0, cur.hp / cur.foeHp * 100) + '%'; }
    if (mor) { mor.style.width = Math.max(0, cur.morale / cur.moraleMax * 100) + '%'; }
    if (ki) { ki.style.width = Math.min(100, cur.ki / D().KI_MAX * 100) + '%'; }
    if (poise) { poise.style.width = (cur.staggered > 0 ? 100 : Math.min(100, cur.poise / cur.poiseMax * 100)) + '%'; }
    if (chg) { chg.style.width = Math.min(100, cur.charge / CHARGE_MAX() * 100) + '%'; }
    if (combo) { combo.textContent = cur.combo > 1 ? '🔥 연타 ×' + cur.combo : ''; }
    if (tell) {
      /* 예고가 없을 땐 같은 자리를 "다가가라" 안내로 쓴다 — 무대가 세우는
         거리(약 8m)가 내 사거리(3m)보다 멀어, 걸어 들어가지 않으면 자동
         공격도 상대 공격도 영영 안 난다(2026-09-06, 실전 포획 첫 시험에서
         3초를 가만 서 있어도 아무 일이 안 일어나 발견). 기절 중엔 "몰아쳐라"가
         그 자리를 대신한다 — 셋이 겹칠 일이 없어(예고 중엔 기절 안 걸린다) 한 줄로 족하다. */
      if (cur.staggered > 0) {
        tell.textContent = '🌟 빈틈이다! 지금 몰아쳐라';
        tell.classList.add('show', 'stagger');
      } else if (cur.tell > 0) {
        tell.textContent = moveByKey(cur.tellMove).label;
        tell.classList.remove('stagger'); tell.classList.add('show');
      } else if (cur.lastDist > MY_REACH()) {
        tell.textContent = '🚶 다가가세요 — 사거리 안이면 저절로 공격합니다';
        tell.classList.remove('stagger'); tell.classList.add('show');
      } else {
        tell.classList.remove('show', 'stagger');
      }
    }
    if (ub) { ub.disabled = cur.ki < D().KI_MAX; }
    if (cb) { cb.disabled = cur.charge < CHARGE_MAX(); }
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
    var c = $('[data-ra="charge"]');
    if (c) {
      c.addEventListener('click', function () {
        if (!cur) { return; }
        var r = chargeAttack(cur, cur.lastDist);
        if (r.ok) {
          core.emit('duel:fx', { kind: 'charge', dmg: r.dmg, mine: true, whiffed: !!r.whiffed });
          if (r.staggerEv && r.staggerEv.length) { emitEvents(r.staggerEv); }
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
      else if (e.t === 'combo') { core.emit('duel:fx', { kind: 'combo', dmg: e.dmg, combo: e.combo, mine: true }); }
      else if (e.t === 'stagger') { core.emit('duel:fx', { kind: 'stagger', mine: true }); }
      else if (e.t === 'hit') { core.emit('duel:fx', { kind: 'hit', dmg: e.dmg, mine: false }); }
      else if (e.t === 'heavy') {
        core.emit('duel:fx', { kind: 'heavy', dmg: e.dmg, dodged: !!e.dodged, move: e.move, mine: false });
      } else if (e.t === 'tell') {
        /* 강타류 예고 — 화면 아래 HUD 문구만으로는 3D 화면을 보던 눈에 안 들어온다.
           상대 위에 뜨는 경고 알갱이로 같이 알린다(2026-09-05, "실시간 교전 손맛" 점검) */
        core.emit('duel:fx', { kind: 'tell', move: e.move, mine: false });
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
    CHARGE_MAX: CHARGE_MAX, COMBO_N: COMBO_N,
    foeMoves: foeMoves, moveByKey: moveByKey,
    /* 판정 층 — 화면 없이 굴린다 (자가진단이 쓰는 문) */
    create: create, tick: tick, ult: ult, flee: flee, perf: perf, fold: fold,
    chargeAttack: chargeAttack,
    /* 화면 층 */
    open: open,
    get active() { return !!cur; }
  };
})(window);
