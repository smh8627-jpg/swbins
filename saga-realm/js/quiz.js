/**
 * 문답(퀴즈) — 서당(書堂)의 두뇌
 * ---------------------------------------------------------------
 * 데이터는 data-quiz.js, 화면은 ui.js 가 맡고, 여기서는 출제·채점·보상·기록만 한다.
 * 이 게임(saga-realm)에서는 처음 맞힌 문답이 **공훈(deed)** 이 되어 강역을 넓힌다.
 *
 *   출제    아직 못 익힌 문제를 먼저 낸다. 그 안에서는 **쉬운 등급부터** —
 *           초급을 다 익히면 중급, 그다음 고급으로 넘어간다.
 *           다 익혔으면 복습(틀린 것 우선).
 *   보기    낼 때마다 순서를 섞는다 — 위치로 못 외우게.
 *   보상    처음 맞히면 공적+금, 복습은 금 조금. **등급이 높으면 더 준다.**
 *           연속 정답 5마다 등용서 1.
 *   기록    맞힌 문제는 save.quiz.learned 에 남아 서고(지식 목록)에 쌓인다.
 *
 * 성장 보상이 공적(gainFeat) 한 곳으로 들어가는 원칙은 여기서도 지킨다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var QD = global.DG.quizData;

  /* 등급별 보상 — 어려운 것을 익히면 더 준다.
     초급 값이 예전 단일 보상과 같아서, 초급만 풀던 사람에게는 달라지는 게 없다. */
  var LV_REWARD = {
    1: { feat: 3, gold: 40, fame: 12, rgold: 10, rfame: 4 },
    2: { feat: 4, gold: 60, fame: 18, rgold: 15, rfame: 6 },
    3: { feat: 6, gold: 90, fame: 27, rgold: 22, rfame: 9 }
  };
  var LV_NAME = { 1: '초급', 2: '중급', 3: '고급' };
  var STREAK_EVERY = 5;         // 연속 정답 몇 개마다 등용서 1장

  /** 문제의 난이도 — 빠뜨린 문제는 초급으로 본다 */
  function lvOf(ref) {
    var lv = ref && ref.lv;
    return (lv === 2 || lv === 3) ? lv : 1;
  }

  function qstate() {
    var s = core.save;
    if (!s.quiz) {
      s.quiz = { learned: {}, wrongs: {}, total: 0, correct: 0, streak: 0, bestStreak: 0 };
    }
    return s.quiz;
  }

  /** 보기 순서를 섞은 출제용 문제 하나 */
  function present(ref) {
    var order = [0, 1, 2, 3], i, j, t;
    for (i = order.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = order[i]; order[i] = order[j]; order[j] = t;
    }
    var choices = [];
    for (i = 0; i < order.length; i++) { choices.push(ref.c[order[i]]); }
    return { id: ref.id, cat: ref.cat, lv: lvOf(ref), lvName: LV_NAME[lvOf(ref)],
             q: ref.q, choices: choices, order: order,
             review: !!qstate().learned[ref.id] };
  }

  /**
   * 문제를 하나 낸다.
   * @param catKey 분야 (없으면 전 분야)
   * 안 익힌 문제 우선. 다 익혔으면 틀렸던 문제부터 복습.
   */
  function draw(catKey) {
    var st = qstate();
    var pool = catKey ? QD.ofCat(catKey) : QD.BANK;
    if (!pool.length) { return null; }
    var fresh = [], i;
    for (i = 0; i < pool.length; i++) {
      if (!st.learned[pool[i].id]) { fresh.push(pool[i]); }
    }
    if (fresh.length) {
      /* 쉬운 등급부터 — 초급이 남아 있으면 초급만, 다 익히면 중급으로 올라간다 */
      var low = 3, tier = [];
      for (i = 0; i < fresh.length; i++) { if (lvOf(fresh[i]) < low) { low = lvOf(fresh[i]); } }
      for (i = 0; i < fresh.length; i++) { if (lvOf(fresh[i]) === low) { tier.push(fresh[i]); } }
      return present(core.pick(tier));
    }
    // 전부 익혔다 — 틀린 적 많은 것부터 복습
    var review = pool.slice().sort(function (a, b) {
      return (st.wrongs[b.id] || 0) - (st.wrongs[a.id] || 0);
    });
    var top = review.slice(0, Math.max(4, Math.ceil(review.length / 4)));
    return present(core.pick(top));
  }

  /**
   * 복습 전용 출제 — **이미 익힌 문제 안에서만** 고른다.
   * 자동 순행(auto.js)이 쓰는 통로다. 자동이 새 문제를 풀어 버리면
   * 서고에 "배운 적 없는 지식"이 쌓이므로, 새 문제는 draw() 쪽에만 남겨 둔다.
   * 틀린 적이 많은 문제를 먼저 낸다.
   */
  function drawReview(catKey) {
    var st = qstate();
    var pool = catKey ? QD.ofCat(catKey) : QD.BANK;
    var mine = [], i;
    for (i = 0; i < pool.length; i++) {
      if (st.learned[pool[i].id]) { mine.push(pool[i]); }
    }
    if (!mine.length) { return null; }
    mine.sort(function (a, b) { return (st.wrongs[b.id] || 0) - (st.wrongs[a.id] || 0); });
    var top = mine.slice(0, Math.max(4, Math.ceil(mine.length / 4)));
    return present(core.pick(top));
  }

  /* ── 오답노트 ─────────────────────────────────────────────
   * 틀린 횟수는 처음부터 세고 있었지만(`st.wrongs`) 볼 수가 없었다.
   * 틀린 문제를 다시 만나는 것이 문답 게임에서 가장 확실한 성장이라 밖으로 낸다.
   */

  /** 틀린 적 있는 문제 — 많이 틀린 것부터 */
  function wrongList() {
    var st = qstate(), out = [], id;
    for (id in st.wrongs) {
      if (!Object.prototype.hasOwnProperty.call(st.wrongs, id)) { continue; }
      if (!st.wrongs[id]) { continue; }
      var ref = QD.byId(id);
      if (!ref) { continue; }
      out.push({
        id: ref.id, cat: QD.catOf(ref.cat), lv: lvOf(ref), lvName: LV_NAME[lvOf(ref)],
        q: ref.q, answer: ref.c[ref.a], why: ref.why,
        n: st.wrongs[id], learned: !!st.learned[ref.id]
      });
    }
    out.sort(function (a, b) { return b.n - a.n; });
    return out;
  }

  /** 오답노트에서만 낸다 (없으면 null) */
  function drawWrong(catKey) {
    var st = qstate(), pool = [], id;
    for (id in st.wrongs) {
      if (!Object.prototype.hasOwnProperty.call(st.wrongs, id)) { continue; }
      if (!st.wrongs[id]) { continue; }
      var ref = QD.byId(id);
      if (!ref) { continue; }
      if (catKey && ref.cat !== catKey) { continue; }
      pool.push(ref);
    }
    if (!pool.length) { return null; }
    pool.sort(function (a, b) { return (st.wrongs[b.id] || 0) - (st.wrongs[a.id] || 0); });
    var top = pool.slice(0, Math.max(3, Math.ceil(pool.length / 3)));
    return present(core.pick(top));
  }

  /**
   * 오답노트에서 지운다 — **맞히면 한 번씩 지워진다**(0 이 되면 목록에서 빠진다).
   * 한 번 틀린 것을 영원히 안고 가면 노트가 쌓이기만 한다.
   */
  function clearWrong(id, all) {
    var st = qstate();
    if (!st.wrongs[id]) { return 0; }
    var before = st.wrongs[id];
    st.wrongs[id] = all ? 0 : Math.max(0, before - 1);
    if (!st.wrongs[id]) { delete st.wrongs[id]; }
    return before - (st.wrongs[id] || 0);
  }

  /**
   * 채점한다.
   * @param p draw() 가 준 문제
   * @param choiceIdx 사용자가 고른 보기 번호 (섞인 순서 기준)
   */
  function answer(p, choiceIdx) {
    var ref = QD.byId(p.id);
    if (!ref) { return null; }
    var st = qstate();
    var ok = p.order[choiceIdx] === ref.a;
    var first = ok && !st.learned[ref.id];
    st.total += 1;

    var lv = lvOf(ref), R = LV_REWARD[lv];
    var reward = { feat: 0, gold: 0, fame: 0, scroll: 0, lv: lv };
    if (ok) {
      st.correct += 1;
      st.streak += 1;
      /* 틀렸던 문제를 맞혔다 — 오답노트에서 한 번 지운다 */
      if (st.wrongs[ref.id]) { reward.cleared = clearWrong(ref.id, false); }
      if (st.streak > st.bestStreak) { st.bestStreak = st.streak; }
      if (first) {
        st.learned[ref.id] = Date.now();
        reward.feat = R.feat;
        reward.gold = R.gold;
        reward.fame = R.fame;
        core.gainFeat(R.feat, '문답');
      } else {
        reward.gold = R.rgold;
        reward.fame = R.rfame;
      }
      if (st.streak % STREAK_EVERY === 0) {
        reward.scroll = 1;
        core.save.items.scroll += 1;
      }
      /* 이 판의 금은 **세력 금고**로 들어간다(rtk.study).
         문답은 곁가지다 — 군자금과, 학식이 차면 재야 하나가 드러나는 것까지.
         삼국지 판이 아직 안 섰으면 갈 곳이 없으니 개인 지갑에 둔다. */
      if (global.DG.rtk && global.DG.rtk.state().started) {
        reward.school = global.DG.rtk.study(lv, reward.gold, first);
      } else {
        core.save.player.gold += reward.gold;
      }
      core.save.player.fame += reward.fame;
      if (first) {
        core.log('📚 지식 습득 · ' + QD.catOf(ref.cat).name + ' ' + LV_NAME[lv] + ' — ' +
          shortQ(ref.q), 'good');
      }
    } else {
      st.streak = 0;
      st.wrongs[ref.id] = (st.wrongs[ref.id] || 0) + 1;
    }
    core.persist();
    core.emit('quiz:answered', { id: ref.id, ok: ok });
    return {
      ok: ok, first: first, why: ref.why,
      answerText: ref.c[ref.a],
      lv: lv, lvName: LV_NAME[lv],
      streak: st.streak, reward: reward
    };
  }

  function shortQ(q) {
    return q.length > 26 ? q.slice(0, 25) + '…' : q;
  }

  /** 분야별 진행 현황 */
  function progress() {
    var st = qstate();
    var per = {}, i, c;
    for (i = 0; i < QD.CATS.length; i++) {
      c = QD.CATS[i];
      per[c.key] = { learned: 0, total: 0 };
    }
    /* 등급별 진행 — 지금 어느 등급을 풀고 있는지 화면에 보여 주려고 함께 센다 */
    var byLv = { 1: { learned: 0, total: 0 }, 2: { learned: 0, total: 0 }, 3: { learned: 0, total: 0 } };
    for (i = 0; i < QD.BANK.length; i++) {
      var b = QD.BANK[i], bl = lvOf(b);
      per[b.cat].total += 1;
      byLv[bl].total += 1;
      if (st.learned[b.id]) { per[b.cat].learned += 1; byLv[bl].learned += 1; }
    }
    var learned = 0;
    for (var k in st.learned) {
      if (Object.prototype.hasOwnProperty.call(st.learned, k)) { learned++; }
    }
    /* 지금 풀고 있는 등급 = 아직 남은 가장 낮은 등급 (다 익혔으면 고급 유지) */
    var now = 3;
    for (var L = 1; L <= 3; L++) {
      if (byLv[L].learned < byLv[L].total) { now = L; break; }
    }
    return {
      learned: learned, total: QD.BANK.length, per: per,
      byLv: byLv, lvNow: now, lvName: LV_NAME[now], LV_NAME: LV_NAME,
      answered: st.total, correct: st.correct,
      streak: st.streak, bestStreak: st.bestStreak
    };
  }

  /** 익힌 지식 목록 (서고) — 최근에 익힌 것부터 */
  function learnedList(catKey) {
    var st = qstate();
    var out = [], i;
    for (i = 0; i < QD.BANK.length; i++) {
      var b = QD.BANK[i];
      if (!st.learned[b.id]) { continue; }
      if (catKey && b.cat !== catKey) { continue; }
      out.push({ ref: b, at: st.learned[b.id] });
    }
    out.sort(function (a, b2) { return b2.at - a.at; });
    return out;
  }

  global.DG = global.DG || {};
  global.DG.quiz = {
    draw: draw, drawReview: drawReview, drawWrong: drawWrong, answer: answer,
    wrongList: wrongList, clearWrong: clearWrong,
    progress: progress, learnedList: learnedList,
    state: qstate
  };
})(window);
