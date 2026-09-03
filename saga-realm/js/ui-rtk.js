/**
 * 화면 — 사가국지 (삼국지)
 * ---------------------------------------------------------------
 * 가운데는 **지도**다. 이 판에는 원래 지도가 없었다(강역이 목록이었다) —
 * 삼국지로 옮기면서 성 서른 곳과 그 사이의 길이 판 그 자체가 되었다.
 *
 *   지도    성을 누르면 그 성이 열린다. 우리 성이면 명령, 남의 성이면 출진·계략
 *   상단    연·월 · 세력 · 금 · 병력 · 군량 · 성 수 + **다음 달**
 *   독      🏯 성 · 👤 무장 · 🤝 외교 · 📚 학당(문답) · 📜 기록
 *
 * 판정은 한 줄도 여기 없다. 전부 rtk / war / diplo 를 부른다 —
 * 화면에서 셈을 하면 자가진단이 못 짚는 곳에 규칙이 생긴다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var CD = global.DG.cityData;
  var FD = global.DG.forceData;

  var els = {};
  var openTab = null;
  var openCityId = null;
  var pickOrder = null;        // 명령을 고른 뒤 사람을 고르는 두 걸음
  var quizCur = null;
  var lastBattle = null;
  var pickScen = '194';        // 세력을 고르기 **전에** 고른 시나리오

  /* 개입형 실시간 전투(showBattleLive) — 지금 명령을 기다리는 중이면 여기 담긴다.
     act() 의 'bat-cmd' 손잡이가 이걸 불러 다음 합으로 잇는다 */
  var liveStep = null;
  var liveRepStub = null;
  var liveBase = null;

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function R() { return global.DG.rtk; }
  function off() { return global.DG.off; }

  /**
   * 초상 <img> 에 붙일 이름표. `portrait3d` 가 실제 모델로 그림을 다 구우면
   * 이 표를 보고 `src` 를 갈아 끼운다. 못 쓸 자리(three 없음 · 손잡이 내림)
   * 에서는 빈 문자열이라 **여태 그림이 그대로 남는다**.
   */
  function p3tag(ref, w, h) {
    var P3 = global.DG.portrait3d;
    if (!P3 || !P3.ready()) { return ''; }
    if (!p3tag.timer) {
      p3tag.timer = global.setTimeout(function () {
        p3tag.timer = null;
        P3.sweep();
      }, 40);
    }
    return ' data-p3="' + P3.keyOf('hero', ref, w, h) + '"';
  }

  function pt(ref, size) {
    var sz = size || 40;
    return '<img class="pt" alt=""' + p3tag(ref, sz, sz) + ' src="' +
      global.DG.sprite.portrait('hero', ref, sz) + '">';
  }

  /**
   * 무장 카드 큰 초상 — `pt()` 와 달리 정사각이 아니라 액자 비율이다.
   * CSS(`.pt{width:100%;height:100%}`)가 카드 폭만큼 늘려 보여주는데, 여태
   * `pt(h,52)` 로 52px 짜리를 그 자리에 늘여 써서 흐릿하게 뭉갰다(2026-09-03) —
   * 구울 해상도 자체를 표시 크기에 맞춘다. 되돌아가는 그림도 목록용 작은
   * `sprite.portrait()` 대신 액자·배경이 있는 `sprite.portraitCard()` 로 맞춘다.
   */
  function ptBig(ref, w, h) {
    w = w || 200; h = h || 224;
    return '<img class="pt" alt=""' + p3tag(ref, w, h) + ' src="' +
      global.DG.sprite.portraitCard('hero', ref, w, h) + '">';
  }

  function forceColor(id) {
    var f = FD.force(id);
    return f ? f.color : '#5b6572';
  }

  /* ── 배선 ─────────────────────────────────────────────── */

  function init() {
    ['profile', 'wallet', 'realm', 'dock', 'sheet', 'sheet-title', 'sheet-body',
     'sheet-close', 'sheet-map', 'scrim', 'encounter', 'toast'].forEach(function (id) { els[id] = $(id); });

    els.dock.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sheet]');
      if (!b) { return; }
      var name = b.getAttribute('data-sheet');
      if (openTab === name) { closeSheet(); } else { openSheet(name); }
    });
    els['sheet-close'].addEventListener('click', closeSheet);
    els['sheet-map'].addEventListener('click', closeSheet);
    els.scrim.addEventListener('click', closeSheet);
    global.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (els.encounter.classList.contains('show')) { return; }
        if (openTab) { closeSheet(); }
      }
      /* M — 디아블로식 "지도로" 단축키. 이 판은 국토 지도가 늘 화면 밑에 깔려 있고
         성안·기록 등은 그 위 시트라, M 은 열린 시트를 닫아 국토 지도를 드러낸다.
         encounter(전투 결과·시나리오 선택 등 응답 대기 중인 카드)는 Escape 처럼 건드리지 않는다 */
      if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (els.encounter.classList.contains('show')) { return; }
        if (openTab) { closeSheet(); }
      }
    });

    els.realm.addEventListener('click', function (e) {
      var n = e.target.closest('[data-city]');
      if (n) { openCity(n.getAttribute('data-city')); }
    });
    els['sheet-body'].addEventListener('click', onAct);
    els.encounter.addEventListener('click', onAct);

    core.on('toast', toast);
    core.on('changed', function () { renderTop(); renderMap(); renderSheet(); syncDock(); });
    core.on('rtk:battle', function (rep) {
      /* 내 세력이 친 싸움만 띄운다. 진영에서 벌어진 것(달을 넘긴 원정)도 여기로 온다 */
      if (rep.force === R().me()) { lastBattle = rep; showBattle(rep); }
    });
    core.on('rtk:camp', function () { syncDock(); });
    core.on('rtk:end', function (kind) { showEnd(kind); });

    if (!R().state().started) { showScenPick(); }
    renderTop(); renderMap();
  }

  function onAct(e) {
    var b = e.target.closest('[data-act]');
    if (!b) { return; }
    act(b.getAttribute('data-act'), b);
  }

  /* ── 손잡이 ───────────────────────────────────────────── */

  function act(a, b) {
    var g = function (k) { return b.getAttribute(k); };

    if (a === 'pick-scen') {
      pickScen = g('data-id');
      showForcePick(pickScen);
      return;
    }
    if (a === 'back-scen') { showScenPick(); return; }
    if (a === 'pick-force') {
      R().setup(g('data-id'), pickScen);
      closeEnc();
      renderTop(); renderMap(); syncDock();
      return;
    }
    if (a === 'next-month') {
      var was = R().state();
      if (was.result) { return; }
      R().endMonth();
      renderTop(); renderMap(); renderSheet();
      return;
    }
    if (a === 'close-enc') { closeEnc(); return; }
    if (a === 'ask-part') {
      var rg = $('askrange');
      if (rg) {
        rg.value = String(Math.max(1, Math.round(parseInt(rg.max, 10) * parseFloat(g('data-p')))));
        askShow();
      }
      return;
    }
    if (a === 'ask-ok') {
      var rv = $('askrange');
      var val = rv ? parseInt(rv.value, 10) : 0;
      var cb = askCb; askCb = null; closeEnc();
      if (cb) { cb(val); }
      return;
    }
    if (a === 'ask-no') { askCb = null; closeEnc(); return; }
    if (a === 'open-city') { openCity(g('data-city')); return; }

    if (a === 'sel-order') { pickOrder = g('data-key'); renderSheet(); return; }
    if (a === 'do-order') {
      var res = R().order(openCityId, g('data-id'), pickOrder);
      if (!res.ok) { toast(res.why); } else if (res.text) { toast(res.text); }
      pickOrder = null;
    } else if (a === 'set-gov') {
      R().setGov(openCityId, g('data-id') || null);
    } else if (a === 'promote') {
      var pr = off().promote(g('data-id'));
      toast(pr.ok ? '✨ ' + pr.name + ' — 충성 ' + pr.loyal : pr.why);
    } else if (a === 'reward') {
      var rr = R().reward(g('data-id'), 300);
      toast(rr.ok ? '🎁 충성 ' + rr.loyal : rr.why);
    } else if (a === 'hire-one') {
      var hr = R().tryHire(openCityId, g('data-by'), g('data-id'));
      toast(hr.ok ? hr.text : hr.why);
      if (hr.ok) { off().rec(g('data-by')).done = true; }
    } else if (a === 'move-officer') {
      var mv = global.DG.war.moveOfficer(g('data-id'), g('data-to'));
      toast(mv.ok ? '🚶 옮겼습니다' : mv.why);
    } else if (a === 'send-troops') {
      var sFrom = openCityId, sTo = g('data-to');
      var sc = R().city(sFrom);
      if (sc.troops < 1) { toast('보낼 병력이 없습니다'); return; }
      askNumber({
        title: '🚚 ' + CD.find(sFrom).name + ' → ' + CD.find(sTo).name,
        hint: '몇 명을 보낼까요? 성에 🪖 ' + core.fmt(sc.troops) +
          ' <span class="muted">(군량도 그만큼 딸려 갑니다)</span>',
        max: sc.troops, value: Math.floor(sc.troops * 0.5), ok: '🚚 보낸다',
        done: function (n) {
          var tr = global.DG.war.transfer(sFrom, sTo, n, Math.round(n / 1000 * 20));
          toast(tr.ok ? '🚚 ' + core.fmt(tr.troops) + ' 을 보냈습니다' : tr.why);
          core.persist(); renderTop(); renderMap(); renderSheet();
        }
      });
      return;
    } else if (a === 'march') {
      doMarch(g('data-from'), g('data-to'));
      return;
    } else if (a === 'bat-cmd') {
      var cmd = g('data-cmd');
      if (!cmd || cmd === 'none') { cmd = null; }
      var step = liveStep; liveStep = null;
      renderLiveCmd(false);
      if (step) { step(cmd); }
      return;
    } else if (a === 'camp-food' || a === 'camp-men') {
      doSupply(g('data-id'), a === 'camp-men');
      return;
    } else if (a === 'camp-quit') {
      var wr = global.DG.war.withdraw(g('data-id'));
      toast(wr.ok ? '↩️ 포위를 풀었습니다' : wr.why);
    } else if (a === 'plot') {
      var pr = global.DG.diplo.plot(g('data-kind'), g('data-by'), openCityId, null);
      toast(pr.ok ? pr.text : pr.why);
    } else if (a === 'envoy') {
      var er = global.DG.diplo.envoy(g('data-kind'), g('data-to'), g('data-by'),
        g('data-kind') === 'tribute' ? 600 : 200);
      toast(er.ok ? (er.done ? '🤝 이루어졌습니다' : er.text) : er.why);
    } else if (a === 'q-start') {
      quizCur = { p: global.DG.quiz.draw(g('data-cat') || null), result: null };
      if (!quizCur.p) { quizCur = null; toast('낼 문제가 없습니다'); }
    } else if (a === 'q-answer') {
      if (quizCur && quizCur.p && !quizCur.result) {
        quizCur.result = global.DG.quiz.answer(quizCur.p, parseInt(g('data-i'), 10));
      }
    } else if (a === 'q-next') {
      quizCur = { p: global.DG.quiz.draw(quizCur && quizCur.cat), result: null };
    } else if (a === 'q-quit') {
      quizCur = null;
    } else { return; }

    core.persist();
    renderTop(); renderMap(); renderSheet();
  }

  function doMarch(fromId, toId) {
    var c = R().city(fromId);
    var ready = R().readyAt(fromId);
    if (!ready.length) { toast('출진할 장수가 없습니다'); return; }
    var wet = CD.isWater(fromId, toId);
    var max = wet ? Math.min(c.troops, (c.ships || 0) * global.DG.war.SHIP_CREW) : c.troops;
    if (wet && max < 500) { toast('배가 모자랍니다 — 조선(造船)으로 지으십시오'); return; }
    if (max < 500) { toast('오백은 넘겨야 군대라 하지요'); return; }
    var lead = off().sortByPower(ready).slice(0, 3).map(function (h) { return h.id; });
    askNumber({
      title: (wet ? '🌊 ' : '⚔️ ') + CD.find(fromId).name + ' → ' + CD.find(toId).name,
      hint: '몇 명을 이끌고 갈까요? 성에 🪖 ' + core.fmt(c.troops) +
        (wet ? ' · <b>물길</b>이라 배로 ' + core.fmt(max) + '까지' : '') +
        '<br>장수 — ' + lead.map(function (id) { return esc(off().find(id).name); }).join(' · '),
      max: max, value: Math.floor(max * 0.8), ok: (wet ? '🌊 물길로 친다' : '⚔️ 친다'),
      done: function (t) { runMarch(fromId, toId, lead, t); }
    });
  }

  function runMarch(fromId, toId, lead, t) {
    if (!(t > 0)) { return; }
    for (var i = 0; i < lead.length; i++) { off().rec(lead[i]).done = true; }
    showBattleLive(fromId, toId, lead, t);
  }

  /** 개입형 실시간 전투 — 합마다 끊어 명령(돌격·수비·정공법·퇴각)을 받는다.
   *  끝나면 war.js 가 'rtk:battle' 을 쏘고, 그 리스너(위 init())가 showBattle()
   *  로 이 화면을 표준 요약(전체 재생 포함)으로 갈아 끼운다 — 여기선 진행
   *  중일 때만 그린다 */
  function renderLiveCmd(show) {
    var el = $('livecmd');
    if (!el) { return; }
    el.innerHTML = !show ? '' :
      '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">' +
      '<button class="btn tiny" data-act="bat-cmd" data-cmd="press">⚔️ 돌격</button>' +
      '<button class="btn tiny" data-act="bat-cmd" data-cmd="hold">🛡️ 수비</button>' +
      '<button class="btn tiny ghost" data-act="bat-cmd" data-cmd="none">➡️ 정공법</button>' +
      '<button class="btn tiny ghost" data-act="bat-cmd" data-cmd="retreat">↩️ 퇴각</button>' +
      '</div>';
  }

  function liveAppendLog(s) {
    var el = $('livelog');
    if (!el) { return; }
    var d = document.createElement('div');
    d.textContent = s;
    el.appendChild(d);
    el.scrollTop = el.scrollHeight;
  }

  function liveShowState(state) {
    if (liveBase && liveRepStub && global.DG.battle3d) {
      global.DG.battle3d.showState(liveRepStub, liveBase, state);
    }
  }

  function showBattleLive(fromId, toId, lead, t) {
    liveStep = null; liveRepStub = null; liveBase = null;
    var res = global.DG.war.marchInteractive(fromId, toId, lead, t, {
      onIntro: function (lines, repStub) {
        var html = (global.DG.battle3d ? '<canvas id="battle3d"></canvas>' : '') +
          '<h3 style="margin:0 0 6px;font-size:18px">⚔️ 전황 (진행 중)</h3>' +
          '<div class="warlog" id="livelog"></div><div id="livecmd"></div>';
        showEnc(html);
        liveRepStub = repStub;
        for (var i = 0; i < lines.length; i++) { liveAppendLog(lines[i]); }
        if (global.DG.battle3d) {
          liveBase = global.DG.battle3d.beginLive(repStub);
          liveShowState({ atk: repStub.atkStart, def: repStub.defStart, wall: repStub.wallFrom,
            duelPhase: repStub.duel ? 'done' : null });
        }
      },
      onLog: liveAppendLog,
      onRound: function (frame) {
        liveShowState({ atk: frame.atk, def: frame.def, wall: frame.wall,
          duelPhase: liveRepStub && liveRepStub.duel ? 'done' : null });
      },
      onPrompt: function (state, step) {
        liveStep = step;
        renderLiveCmd(true);
      },
      onDone: function () {
        liveStep = null;
        renderLiveCmd(false);
      }
    });
    if (res && res.ok === false) {
      for (var j = 0; j < lead.length; j++) { off().rec(lead[j]).done = false; }
      toast(res.why);
    }
  }

  /** 진영에 군량이나 병력을 보낸다 */
  function doSupply(campId, men) {
    var W = global.DG.war;
    var cp = W.campById(campId);
    if (!cp) { toast('없는 진영입니다'); return; }
    var home = R().city(cp.from);
    if (!home || home.force !== R().me()) { toast('보급할 성이 없습니다'); return; }
    var have = men ? home.troops : home.food;
    if (have < 1) { toast('보낼 것이 없습니다'); return; }
    /* 물 위의 진영은 배에 타는 만큼만 더 받는다 — 물어보기 전에 그만큼으로 줄인다 */
    if (men && cp.water) {
      have = Math.min(have, Math.max(0, (cp.ships || 0) * W.SHIP_CREW - cp.troops));
      if (have < 1) { toast('배가 다 찼습니다'); return; }
    }
    askNumber({
      title: (men ? '🪖 증원' : '🌾 보급') + ' — ' + CD.find(cp.from).name + ' → ' +
        CD.find(cp.to).name + ' 진중',
      hint: CD.find(cp.from).name + '에 ' + (men ? '🪖 ' : '🌾 ') + core.fmt(have) +
        '<br>지금 치중 ' + core.fmt(cp.food) + ' (' + W.monthsLeft(cp) + '달치)',
      max: have, value: Math.floor(have * 0.4), ok: '🚚 보낸다',
      done: function (n) {
        var res = men ? W.supply(campId, n, 0, cp.from) : W.supply(campId, 0, n, cp.from);
        toast(res.ok ? '🚚 보냈습니다 — 치중 ' + res.left + '달치' : res.why);
        renderTop(); renderMap(); renderSheet(); syncDock();
      }
    });
  }

  /* ── 상단 ─────────────────────────────────────────────── */

  var MONTH_SEASON = ['', '초봄', '봄', '늦봄', '초여름', '여름', '늦여름',
                      '초가을', '가을', '늦가을', '초겨울', '겨울', '늦겨울'];

  function renderTop() {
    var st = R().state();
    if (!st.started) {
      els.profile.innerHTML = '<div class="p-meta"><div class="p-title">사가국지 — 다스리고 꾀고 친다</div>' +
        '<div class="p-sub">세력을 고르십시오</div></div>';
      els.wallet.innerHTML = '';
      return;
    }
    var s = R().summary();
    var lord = off().find((FD.force(st.me) || {}).lord);

    els.profile.innerHTML =
      (lord ? '<span class="avatar-pt">' + pt(lord, 40) + '</span>' : '') +
      '<div class="p-meta">' +
        '<div class="p-title">' + esc(s.name) + ' — ' + st.year + '년 ' + st.month + '월' +
          ' <span class="muted">' + MONTH_SEASON[st.month] + '</span>' +
          ' <span class="tag">' + esc((FD.current() || {}).name || '') + '</span></div>' +
        '<div class="p-sub">🏯 성 <b>' + s.cities + '/' + CD.CITIES.length + '</b>' +
          ' · 👤 <b>' + s.officers + '</b>' +
          ' · 수입 <b>' + core.fmt(s.income - s.upkeep) + '</b>/월</div>' +
      '</div>';

    els.wallet.innerHTML =
      coin('🪙', core.fmt(s.gold), '금') +
      coin('🪖', core.fmt(s.troops), '병력') +
      coin('🍚', core.fmt(s.food), '군량') +
      '<button class="btn primary next-btn" data-act="next-month"' +
        (st.result ? ' disabled' : '') + '>▶ 다음 달</button>';
    var nb = els.wallet.querySelector('.next-btn');
    if (nb) { nb.addEventListener('click', function () { act('next-month', nb); }); }
  }

  function coin(icon, val, label) {
    return '<div class="coin" title="' + label + '"><span>' + icon + '</span>' + val + '</div>';
  }

  /* ── 지도 ─────────────────────────────────────────────── */

  function renderMap() {
    var st = R().state();
    if (!st.started) { els.realm.innerHTML = ''; return; }
    var i, j, s = '';

    /* viewBox 를 100→125 로 넓혔다(2026-09-03, 한국 지역 확장) — 그 동쪽에
       둔 새 성 7개(x:97~118)가 안 잘리게. x/y 값 자체는 CD.CITIES 데이터가
       그대로 쥐고 있어 여기 말고 고칠 곳이 없다 */
    s += '<svg class="rmap" viewBox="0 0 125 100" preserveAspectRatio="xMidYMid meet">';

    /* 길 — 인접한 성끼리. 같은 편이면 밝게 */
    var drawn = {};
    for (i = 0; i < CD.CITIES.length; i++) {
      var a = CD.CITIES[i];
      for (j = 0; j < a.adj.length; j++) {
        var b = CD.find(a.adj[j]);
        var key = a.id < b.id ? a.id + b.id : b.id + a.id;
        if (drawn[key]) { continue; }
        drawn[key] = true;
        var fa = st.cities[a.id].force, fb = st.cities[b.id].force;
        var same = fa && fa === fb;
        var wet = CD.isWater(a.id, b.id);
        s += '<line class="rlink' + (same ? ' same' : '') + (wet ? ' water' : '') +
          '" x1="' + a.x + '" y1="' + a.y +
          '" x2="' + b.x + '" y2="' + b.y + '"' +
          (same && !wet ? ' stroke="' + forceColor(fa) + '"' : '') + '/>';
      }
    }

    /* 성 */
    for (i = 0; i < CD.CITIES.length; i++) {
      var d = CD.CITIES[i], c = st.cities[d.id];
      var mine = c.force === st.me;
      var rad = 1.5 + Math.min(2.2, c.troops / 12000);
      s += '<g class="rcity' + (mine ? ' mine' : '') + '" data-city="' + d.id + '">' +
        /* 손가락이 닿는 목표 — 성 점은 화면에서 8px 남짓이라 폰에서 못 누른다.
           보이지 않는 큰 원을 하나 깔아 둔다(그림은 그대로, 손만 커진다) */
        '<circle class="rhit" cx="' + d.x + '" cy="' + d.y + '" r="4.2"/>' +
        '<circle cx="' + d.x + '" cy="' + d.y + '" r="' + rad.toFixed(2) + '" fill="' +
          forceColor(c.force) + '"/>' +
        (mine ? '<circle cx="' + d.x + '" cy="' + d.y + '" r="' + (rad + 1.1).toFixed(2) +
          '" class="ring"/>' : '') +
        (c.disaster ? '<text class="rdis" x="' + (d.x + rad + 0.6) + '" y="' + (d.y - rad) +
          '">' + R().disasterByKey(c.disaster).emoji + '</text>' : '') +
        (global.DG.war.besieged(d.id) ? '<text class="rdis" x="' + (d.x - rad - 2.4) +
          '" y="' + (d.y - rad) + '">🏕️</text>' : '') +
        '<text class="rlab" x="' + d.x + '" y="' + (d.y + rad + 2.6) + '">' + esc(d.name) + '</text>' +
        '</g>';
    }
    s += '</svg>';

    /* 범례 — 살아 있는 세력 */
    var rank = R().ranking();
    s += '<div class="rlegend">';
    for (i = 0; i < rank.length; i++) {
      s += '<span class="rlg' + (rank[i].id === st.me ? ' me' : '') + '">' +
        '<i style="background:' + forceColor(rank[i].id) + '"></i>' +
        esc(rank[i].name) + ' <b>' + rank[i].cities + '</b></span>';
    }
    s += '</div>';

    els.realm.innerHTML = s;
  }

  /* ── 시트 ─────────────────────────────────────────────── */

  var SHEET_TITLE = { city: '🏯 성', officers: '👤 무장', camp: '🏕️ 진영',
                      diplo: '🤝 외교', school: '📚 학당', log: '📜 기록' };

  function openSheet(name) {
    openTab = name;
    els['sheet-title'].textContent = SHEET_TITLE[name] || name;
    els.sheet.setAttribute('data-tab', name);
    els.sheet.classList.add('show');
    document.body.classList.add('sheet-open');
    if (global.innerWidth <= 780) { els.scrim.classList.add('show'); }
    syncDock();
    renderSheet();
  }

  function openCity(id) {
    openCityId = id;
    pickOrder = null;
    openSheet('city');
  }

  function closeSheet() {
    openTab = null;
    els.sheet.classList.remove('show');
    document.body.classList.remove('sheet-open');
    els.scrim.classList.remove('show');
    syncDock();
  }

  function syncDock() {
    var bs = els.dock.querySelectorAll('[data-sheet]');
    for (var i = 0; i < bs.length; i++) {
      bs[i].classList.toggle('on', bs[i].getAttribute('data-sheet') === openTab);
    }
    /* 나가 있는 원정 수 — 진영은 눌러 보지 않으면 잊기 쉬운 칸이다 */
    var cb = els.dock.querySelector('[data-sheet="camp"]');
    if (!cb) { return; }
    var n = R().state().started ? global.DG.war.campsOf(R().me()).length : 0;
    var badge = cb.querySelector('i.badge');
    if (n > 0) {
      if (!badge) { badge = document.createElement('i'); badge.className = 'badge'; cb.appendChild(badge); }
      badge.textContent = String(n);
    } else if (badge) { badge.parentNode.removeChild(badge); }
  }

  function renderSheet() {
    if (!openTab || !R().state().started) { return; }
    var v = openTab === 'city' ? viewCity()
          : openTab === 'officers' ? viewOfficers()
          : openTab === 'camp' ? viewCamp()
          : openTab === 'diplo' ? viewDiplo()
          : openTab === 'school' ? viewSchool() : viewLog();
    els['sheet-body'].innerHTML = v;
    if (openTab === 'city' && openCityId && global.DG.city3d) {
      global.DG.city3d.render(openCityId);
    }
  }

  /* ── 성 ───────────────────────────────────────────────── */

  function bar(label, val, max, extra) {
    var pct = Math.round(core.clamp(val / max, 0, 1) * 100);
    return '<div class="rstat"><span>' + label + '</span>' +
      '<div class="bar sm"><i style="width:' + pct + '%"></i></div>' +
      '<b>' + core.fmt(val) + (extra || '') + '</b></div>';
  }

  function viewCity() {
    if (!openCityId) {
      return '<div class="hint">지도에서 성을 누르십시오.</div>';
    }
    var d = CD.find(openCityId), c = R().city(openCityId);
    var land = CD.landOf(openCityId);
    var mine = c.force === R().me();
    var html = '';

    html += '<div class="sec"><div class="card">' +
      '<div class="stat-row"><span><b>' + esc(d.name) + '</b> <span class="muted">' +
        esc(d.hanja) + ' · ' + esc(CD.provName(d.prov)) + ' · ' + land.name + '</span></span>' +
        '<span class="tag" style="background:' + forceColor(c.force) + '33;border-color:' +
        forceColor(c.force) + '">' + esc(R().forceName(c.force)) + '</span></div>' +
      '<small class="muted">' + esc(d.desc) + '</small>' +
      (c.disaster
        ? '<div class="warn">' + R().disasterByKey(c.disaster).emoji + ' ' +
          esc(R().disasterByKey(c.disaster).text) + ' <span class="muted">(' + c.dLeft + '개월)</span></div>'
        : '') +
      '</div></div>';

    html += '<div class="sec"><h4>살림</h4><div class="card">' +
      bar('🌾 농업', c.agri, R().capOf(openCityId, 'agri')) +
      bar('🏪 상업', c.comm, R().capOf(openCityId, 'comm')) +
      bar('🔨 기술', c.tech, 900) +
      bar('🪧 치안', c.sec, 100) +
      bar('🎯 훈련', c.train, 100) +
      bar('🧱 성벽', c.wall, c.maxWall) +
      '<div class="stat-row"><span>👥 인구</span><b>' + core.fmt(c.pop) + '</b></div>' +
      '<div class="stat-row"><span>🪖 병력</span><b>' + core.fmt(c.troops) + '</b></div>' +
      '<div class="stat-row"><span>🍚 군량</span><b>' + core.fmt(c.food) +
        ' <span class="muted">(월 ' + core.fmt(R().eatOf(openCityId)) + ' 소모)</span></b></div>' +
      (d.land === 'river'
        ? '<div class="stat-row"><span>🛶 배</span><b>' + core.fmt(c.ships || 0) +
          '척 <span class="muted">(' + core.fmt((c.ships || 0) * global.DG.war.SHIP_CREW) +
          '명까지 실린다)</span></b></div>'
        : '') +
      (mine
        ? '<div class="stat-row"><span>🪙 이 성의 달 수입</span><b>' +
          core.fmt(R().goldOf(openCityId)) + '</b></div>'
        : '') +
      '</div></div>';

    return html + (mine ? myCity(c, d) : enemyCity(c, d));
  }

  function myCity(c, d) {
    var html = '';
    var ready = R().readyAt(openCityId);
    var here = off().atCity(openCityId, c.force);

    /* 태수 */
    var gov = c.gov ? off().find(c.gov) : null;
    html += '<div class="sec"><h4>태수</h4><div class="card">' +
      '<div class="stat-row"><span>지금</span><b>' + (gov ? esc(gov.name) : '비어 있음') +
        '</b> <span class="muted">×' + R().govMul(openCityId).toFixed(2) + '</span></div>' +
      '<small class="muted">태수의 <b>지력·통솔</b>이 수입과 수확에 곱해집니다. ' +
      '비어 있으면 계략에 훤히 열립니다.</small><div class="bagtools">';
    for (var i = 0; i < Math.min(5, here.length); i++) {
      html += '<button class="btn tiny' + (c.gov === here[i].id ? ' primary' : '') +
        '" data-act="set-gov" data-id="' + here[i].id + '">' + esc(here[i].name) + '</button>';
    }
    html += '</div></div></div>';

    /* 명령 */
    html += '<div class="sec"><h4>명령 <span class="muted">이 달에 쓸 수 있는 장수 ' +
      ready.length + '명</span></h4>';
    if (!ready.length) {
      html += '<div class="hint">이 성의 장수가 이 달의 명령을 다 썼습니다. ' +
        '<b>다음 달</b>로 넘기십시오.</div>';
    } else if (!pickOrder) {
      html += '<div class="ordgrid">';
      for (var j = 0; j < R().ORDERS.length; j++) {
        var o = R().ORDERS[j];
        var afford = R().force(c.force).gold >= o.gold;
        /* 조선(造船)은 강을 낀 성에서만 — 아닌 성에서는 아예 못 고르게 둔다 */
        var dry = o.key === 'ships' && d.land !== 'river';
        html += '<button class="ordbtn' + (afford && !dry ? '' : ' poor') +
          (dry ? ' disabled" disabled' : '"') + ' data-act="sel-order" data-key="' +
          o.key + '" title="' + esc(dry ? '물길이 없는 성입니다' : o.desc) +
          '"><span>' + o.emoji + '</span><b>' + o.name +
          '</b><small>' + (dry ? '물길 없음' : '🪙' + o.gold) + '</small></button>';
      }
      html += '</div><small class="muted">명령을 고르면 <b>그 일에 맞는 사람</b> 순으로 뜹니다.</small>';
    } else {
      var od = R().orderByKey(pickOrder);
      var sorted = ready.slice().sort(function (a, b) {
        return off().stats(b.id)[od.stat] - off().stats(a.id)[od.stat];
      });
      html += '<div class="card"><div class="stat-row"><span>' + od.emoji + ' <b>' +
        od.name + '</b> <span class="muted">' + off().STAT_KOR[od.stat] + '을(를) 본다</span></span>' +
        '<button class="btn tiny ghost" data-act="sel-order" data-key="">그만</button></div>' +
        '<small class="muted">' + esc(od.desc) + '</small></div>';
      for (var k = 0; k < sorted.length; k++) {
        var s = off().stats(sorted[k].id);
        var gain = pickOrder === 'search' || pickOrder === 'hire' ? null
          : Math.round(od.base + s[od.stat] * od.per);
        html += '<button class="offrow" data-act="do-order" data-id="' + sorted[k].id + '">' +
          pt(sorted[k], 36) + '<span class="offname">' + esc(sorted[k].name) +
          '<small class="muted">' + off().STAT_KOR[od.stat] + ' ' + s[od.stat] +
          ' · 충성 ' + off().loyalOf(sorted[k].id) + '</small></span>' +
          '<b>' + (gain === null ? '—' : '+' + core.fmt(gain)) + '</b></button>';
      }
    }
    html += '</div>';

    /* 이 성에서 찾아낸 재야 · 포로 */
    var freeHere = off().freeAt(openCityId, true);
    var capHere = [];
    var st = R().state();
    for (var ck in st.captives) {
      if (Object.prototype.hasOwnProperty.call(st.captives, ck) && st.captives[ck] === openCityId) {
        var ch = off().find(ck);
        if (ch) { capHere.push(ch); }
      }
    }
    if (freeHere.length || capHere.length) {
      html += '<div class="sec"><h4>부를 수 있는 사람</h4>';
      var caller = ready.length ? ready[0] : null;
      var pool = freeHere.concat(capHere);
      for (var m = 0; m < pool.length; m++) {
        var isCap = capHere.indexOf(pool[m]) >= 0;
        var ps = off().stats(pool[m].id);
        html += '<div class="offrow">' + pt(pool[m], 36) +
          '<span class="offname">' + esc(pool[m].name) +
          (isCap ? ' <span class="tag">포로</span>' : ' <span class="muted">재야</span>') +
          '<small class="muted">무 ' + ps.might + ' 지 ' + ps.wisdom + ' 통 ' + ps.command + '</small></span>' +
          (caller
            ? '<button class="btn tiny primary" data-act="hire-one" data-by="' + caller.id +
              '" data-id="' + pool[m].id + '">등용</button>'
            : '<span class="muted">쓸 장수 없음</span>') +
          '</div>';
      }
      html += '</div>';
    }

    /* 이웃 */
    html += '<div class="sec"><h4>이웃한 성</h4>';
    for (var n = 0; n < d.adj.length; n++) {
      var nid = d.adj[n], nc = R().city(nid), nd = CD.find(nid);
      var ours = nc.force === c.force;
      html += '<div class="card"><div class="stat-row">' +
        '<span><b class="lnk" data-act="open-city" data-city="' + nid + '">' + esc(nd.name) + '</b> ' +
          '<span class="muted">' + esc(R().forceName(nc.force)) + '</span></span>' +
        '<span class="muted">🪖 ' + core.fmt(nc.troops) + ' · 🧱 ' + core.fmt(nc.wall) + '</span></div>' +
        (ours
          ? '<button class="btn tiny wide" data-act="send-troops" data-to="' + nid + '">🚚 병력을 보낸다</button>'
          : '<button class="btn tiny wide primary" data-act="march" data-from="' + openCityId +
            '" data-to="' + nid + '">⚔️ 출진</button>') +
        '</div>';
    }
    return html + '</div>';
  }

  function enemyCity(c, d) {
    var html = '<div class="sec"><h4>여기서 할 수 있는 것</h4>';
    var D = global.DG.diplo;
    if (!D.touching(R().me(), openCityId)) {
      return html + '<div class="hint">우리 성과 맞닿아 있지 않습니다 — 손이 닿지 않습니다.</div></div>';
    }
    /* 계략을 걸 사람 — 맞닿은 우리 성에서 지력이 가장 높은, 아직 안 쓴 사람 */
    var by = null, bv = -1, i, j;
    for (i = 0; i < d.adj.length; i++) {
      if (!R().isMine(d.adj[i])) { continue; }
      var ready = R().readyAt(d.adj[i]);
      for (j = 0; j < ready.length; j++) {
        var w = off().stats(ready[j].id).wisdom;
        if (w > bv) { bv = w; by = ready[j]; }
      }
    }
    if (!by) {
      html += '<div class="hint">계략을 걸 장수가 없습니다 (이웃한 우리 성의 장수가 다 명령을 썼습니다).</div>';
    } else {
      html += '<div class="card"><div class="stat-row"><span>거는 사람</span><b>' +
        esc(by.name) + ' <span class="muted">지력 ' + bv + '</span></b></div>' +
        '<small class="muted">계략은 그 성의 <b>태수 지력</b>이 막습니다. ' +
        '성공률을 숨기지 않습니다 — 보고 거십시오.</small></div>';
      for (i = 0; i < D.PLOTS.length; i++) {
        var p = D.PLOTS[i];
        var ch = D.plotChance(p.key, by.id, openCityId, null);
        var afford = R().myForce().gold >= p.gold;
        html += '<div class="card"><div class="stat-row"><span>' + p.emoji + ' <b>' +
          p.name + '</b></span><span class="muted">🪙 ' + p.gold + ' · ' +
          Math.round(ch * 100) + '%</span></div>' +
          '<small class="muted">' + esc(p.desc) + '</small>' +
          '<button class="btn tiny wide' + (afford ? ' primary' : '') + '"' +
          (afford ? '' : ' disabled') + ' data-act="plot" data-kind="' + p.key +
          '" data-by="' + by.id + '">건다</button></div>';
      }
    }
    /* 출진 — 맞닿은 우리 성에서 */
    html += '</div><div class="sec"><h4>출진</h4>';
    for (i = 0; i < d.adj.length; i++) {
      if (!R().isMine(d.adj[i])) { continue; }
      var fc = R().city(d.adj[i]);
      var wet = CD.isWater(d.adj[i], openCityId);
      var cap = (fc.ships || 0) * global.DG.war.SHIP_CREW;
      html += '<div class="card"><div class="stat-row"><span><b>' + esc(CD.find(d.adj[i]).name) +
        '</b>에서</span><span class="muted">🪖 ' + core.fmt(fc.troops) + '</span></div>' +
        (wet
          ? '<small class="muted">🌊 <b>물길</b>입니다 — 배로만 건넙니다. ' +
            '🛶 ' + core.fmt(fc.ships || 0) + '척 · ' + core.fmt(cap) + '명까지. ' +
            '수전은 <b>성벽이 소용없고</b> 화공이 터집니다.</small>'
          : '') +
        '<button class="btn tiny wide' + (wet && cap < 500 ? '' : ' primary') +
        '" data-act="march" data-from="' + d.adj[i] +
        '" data-to="' + openCityId + '">' + (wet ? '🌊 물길로 친다' : '⚔️ 친다') +
        '</button></div>';
    }
    return html + '</div>';
  }

  /* ── 진영 (여러 달에 걸치는 원정) ─────────────────────── */

  function viewCamp() {
    var W = global.DG.war;
    var list = W.campsOf(R().me());
    if (!list.length) {
      return '<div class="hint">나가 있는 원정이 없습니다.<br><br>' +
        '남의 성을 눌러 <b>친다</b> 를 고르면, 그 달에 못 떨어뜨린 군대는 ' +
        '물러나지 않고 성 밖에 <b>진(陣)</b> 을 칩니다. 진영은 달마다 한 번씩 더 치고, ' +
        '<b>치중이 바닥나거나 사기가 꺾이면 스스로 물러납니다</b>.</div>';
    }
    var html = '<div class="sec"><h4>나가 있는 원정 <span class="muted">' + list.length + '</span></h4>' +
      '<small class="muted">출진할 때 들고 나가는 군량은 <b>두 달치</b>입니다. ' +
      '그보다 길게 에워싸려면 맞닿은 우리 성에서 <b>보급</b>해야 합니다. ' +
      '에워싸인 성은 그동안 <b>수확을 거두지 못합니다</b>.</small></div>';
    for (var i = 0; i < list.length; i++) { html += campCard(list[i]); }
    return html;
  }

  function campCard(cp) {
    var W = global.DG.war;
    var d = CD.find(cp.to), to = R().city(cp.to);
    var left = W.monthsLeft(cp);
    var home = R().city(cp.from);
    var canFeed = !!home && home.force === R().me();
    var names = cp.officers.map(function (id) {
      var h = off().find(id);
      return h ? esc(h.name) : id;
    }).join(' · ');

    var html = '<div class="card">' +
      '<div class="stat-row"><span>' + (cp.water ? '⛵' : '🏕️') + ' <b>' + esc(d.name) +
      '</b> 을(를) 에워쌌다' + (cp.water ? ' <span class="tag">수채</span>' : '') + '</span>' +
      '<span class="muted">' + cp.months + '달째</span></div>' +
      '<div class="stat-row"><span class="muted">우리 군</span><b>🪖 ' + core.fmt(cp.troops) +
      ' · 🌾 ' + core.fmt(cp.food) + ' <span class="muted">(' + left + '달치)</span></b></div>' +
      (cp.water
        ? '<div class="stat-row"><span class="muted">배</span><b>🛶 ' + core.fmt(cp.ships || 0) +
          '척 <span class="muted">(' +
          core.fmt(Math.max(0, (cp.ships || 0) * global.DG.war.SHIP_CREW - cp.troops)) +
          '명 더 탄다)</span></b></div>'
        : '') +
      '<div class="stat-row"><span class="muted">사기 · 훈련</span><b>' +
      Math.round(cp.morale * 100) + ' · ' + cp.train + '</b></div>' +
      '<div class="stat-row"><span class="muted">성 안</span><b>🪖 ' + core.fmt(to.troops) +
      ' · 🧱 ' + core.fmt(to.wall) + '</b></div>' +
      '<small class="muted">장수 — ' + names + '</small>';

    if (canFeed) {
      html += '<div class="camp-acts">' +
        '<button class="btn tiny" data-act="camp-food" data-id="' + cp.id + '">🌾 보급</button>' +
        '<button class="btn tiny" data-act="camp-men" data-id="' + cp.id + '">🪖 증원</button></div>' +
        '<small class="muted">' + esc(CD.find(cp.from).name) + '에서 보냅니다 — 🪖 ' +
        core.fmt(home.troops) + ' · 🌾 ' + core.fmt(home.food) + '</small>';
    } else {
      html += '<div class="hint" style="margin-top:8px">보급할 성이 없습니다 — ' +
        esc(CD.find(cp.from).name) + ' 이(가) 우리 손을 떠났습니다.</div>';
    }
    return html + '<button class="btn tiny wide" data-act="camp-quit" data-id="' + cp.id +
      '">↩️ 포위를 푼다</button></div>';
  }

  /* ── 무장 ─────────────────────────────────────────────── */

  function viewOfficers() {
    var list = off().ofForce(R().me());
    var html = '<div class="sec"><h4>우리 무장 <span class="muted">' + list.length + '명</span></h4>' +
      '<small class="muted">충성이 <b>바닥</b>나면 스스로 떠납니다. 금을 내려 붙듭니다.<br>' +
      '일을 시키면 <b>경험</b>이 붙어 능력치가 오르고, 쌓인 <b>공</b>으로 <b>승진</b>시키면 ' +
      '능력치와 충성이 함께 오릅니다.</small></div>';
    var byCity = {};
    for (var i = 0; i < list.length; i++) {
      var r = off().rec(list[i].id);
      (byCity[r.city] = byCity[r.city] || []).push(list[i]);
    }
    var keys = Object.keys(byCity);
    for (var k = 0; k < keys.length; k++) {
      html += '<div class="sec"><h4>' + esc(CD.find(keys[k]).name) + '</h4>';
      for (var j = 0; j < byCity[keys[k]].length; j++) {
        html += officerCard(byCity[keys[k]][j], keys[k]);
      }
      html += '</div>';
    }
    return html;
  }

  /** 무장 한 장 — 능력치 · 충성 · 열전. 도감 상세를 여기로 옮겼다 */
  function officerCard(h, cityId) {
    var s = off().stats(h.id);
    var r = off().rec(h.id);
    var g = global.DG.hero.info(h.id);
    var isLord = (FD.force(r.force) || {}).lord === h.id;
    var bio = global.DG.data.bio ? global.DG.data.bio(h.id) : '';
    var c = R().city(cityId);
    return '<div class="card offcard">' +
      '<div class="dt-top">' + ptBig(h) +
        '<div class="dt-name"><b>' + esc(h.name) + '</b> <span class="muted">' +
          esc(h.hanja || '') + '</span>' +
          (isLord ? ' <span class="tag">군주</span>' : '') +
          (c && c.gov === h.id ? ' <span class="tag">태수</span>' : '') +
          (r.hurt ? ' <span class="tag warnt">부상 ' + r.hurt + '개월</span>' : '') +
          (r.done ? ' <span class="muted">· 이 달 명령 씀</span>' : '') +
          (r.camp ? ' <span class="tag">원정 중</span>' : '') +
        '<div class="dt-stats"><span>무 <b>' + s.might + '</b></span>' +
          '<span>지 <b>' + s.wisdom + '</b></span>' +
          '<span>통 <b>' + s.command + '</b></span>' +
          '<span class="muted">Lv.' + g.lv + '</span></div>' +
        '</div></div>' +
      '<div class="rstat"><span>충성</span><div class="bar sm' +
        (r.loyal < 25 ? ' bad' : '') + '"><i style="width:' + r.loyal + '%"></i></div>' +
        '<b>' + r.loyal + '</b></div>' +
      growRow(h) +
      (bio ? '<small class="muted dt-bio">' + esc(bio) + '</small>' : '') +
      (h.quote ? '<small class="quote">“' + esc(h.quote) + '”</small>' : '') +
      /* 군주는 상도 승진도 없다 — 제 나라에서 제가 올라갈 자리가 없다 */
      (isLord ? '' :
        '<div class="camp-acts">' +
          '<button class="btn tiny" data-act="reward" data-id="' + h.id + '">🎁 금 300</button>' +
          promoteBtn(h) +
        '</div>') +
      '</div>';
  }

  /** 관직과 경험 — 무장이 자라는 것이 보여야 기르는 뜻이 산다 */
  function growRow(h) {
    var H = global.DG.hero;
    var g = off().grow(h.id);
    var need = H.expNeed(g.lv);
    var pct = g.lv >= H.MAX_LV ? 100 : Math.round(core.clamp(g.exp / need, 0, 1) * 100);
    return '<div class="rstat"><span>' + esc(off().rankName(h.id)) + '</span>' +
      '<div class="bar sm gold"><i style="width:' + pct + '%"></i></div>' +
      '<b>' + (g.lv >= H.MAX_LV ? '만렙' : g.exp + '/' + need) + '</b></div>';
  }

  function promoteBtn(h) {
    var chk = off().promoteCheck(h.id);
    var g = off().grow(h.id);
    if (g.rank >= global.DG.hero.MAX_RANK) {
      return '<button class="btn tiny" disabled>✨ 더 올릴 자리 없음</button>';
    }
    var c = off().promoteCost(g.rank);
    return '<button class="btn tiny' + (chk.ok ? ' primary' : '') + '"' +
      (chk.ok ? '' : ' disabled') + ' data-act="promote" data-id="' + h.id +
      '" title="' + esc(chk.ok ? '올린다' : chk.why) + '">✨ 승진 <span class="muted">공 ' +
      off().rec(h.id).feats + '/' + c.feats + ' · 🪙' + c.gold + '</span></button>';
  }

  /* ── 외교 ─────────────────────────────────────────────── */

  function viewDiplo() {
    var D = global.DG.diplo;
    var me = R().me();
    var rank = R().ranking().filter(function (f) { return f.id !== me; });
    /* 사자 — 아무 성에서나, 아직 명령을 안 쓴 사람 중 지력 으뜸 */
    var by = null, bv = -1, cs = R().citiesOf(me), i, j;
    for (i = 0; i < cs.length; i++) {
      var ready = R().readyAt(cs[i]);
      for (j = 0; j < ready.length; j++) {
        var w = off().stats(ready[j].id).wisdom;
        if (w > bv) { bv = w; by = ready[j]; }
      }
    }
    var html = '<div class="sec"><div class="card">' +
      '<div class="stat-row"><span>사자</span><b>' + (by ? esc(by.name) + ' (지력 ' + bv + ')' : '없음') + '</b></div>' +
      '<small class="muted">사자는 <b>그 달의 명령 한 번</b>을 씁니다. ' +
      '동맹·화친 동안에는 서로 칠 수 없습니다.</small></div></div>';

    for (i = 0; i < rank.length; i++) {
      var f = rank[i];
      var rel = D.relation(me, f.id);
      var ally = D.alliedWith(me, f.id), truce = D.trucedWith(me, f.id);
      var mf = R().force(me);
      html += '<div class="card"><div class="stat-row">' +
        '<span><i class="fdot" style="background:' + forceColor(f.id) + '"></i> <b>' +
          esc(f.name) + '</b>' +
          (ally ? ' <span class="tag">동맹 ' + mf.allies[f.id] + '개월</span>' : '') +
          (truce ? ' <span class="tag">화친 ' + mf.truce[f.id] + '개월</span>' : '') + '</span>' +
        '<span class="muted">🏯 ' + f.cities + ' · 🪖 ' + core.fmt(f.troops) + '</span></div>' +
        '<div class="rstat"><span>우호</span><div class="bar sm"><i style="width:' + rel +
          '%"></i></div><b>' + rel + '</b></div>';
      if (by && !ally) {
        html += '<div class="bagtools">' +
          (truce ? '' :
            '<button class="btn tiny" data-act="envoy" data-kind="truce" data-to="' + f.id +
            '" data-by="' + by.id + '">화친 ' + Math.round(D.envoyChance('truce', me, f.id, by.id, 200) * 100) + '%</button>') +
          '<button class="btn tiny" data-act="envoy" data-kind="ally" data-to="' + f.id +
            '" data-by="' + by.id + '">동맹 ' + Math.round(D.envoyChance('ally', me, f.id, by.id, 200) * 100) + '%</button>' +
          '<button class="btn tiny ghost" data-act="envoy" data-kind="tribute" data-to="' + f.id +
            '" data-by="' + by.id + '">🎁 조공 600</button>' +
          '</div>';
      }
      html += '</div>';
    }
    return html;
  }

  /* ── 학당 (문답 — 곁가지) ─────────────────────────────── */

  function viewSchool() {
    var QD = global.DG.quizData;
    var pr = global.DG.quiz.progress();
    var st = R().state();
    var html = '<div class="sec"><div class="card">' +
      '<div class="stat-row"><span>익힌 문답</span><b>' + pr.learned + ' / ' + pr.total + '</b></div>' +
      '<div class="stat-row"><span>학식</span><b>' + (st.lore || 0) + ' / ' + R().LORE_PER_FIND + '</b></div>' +
      '<small class="muted">문답을 <b>처음</b> 맞히면 군자금이 들어오고 <b>학식</b>이 쌓입니다. ' +
      '학식이 차면 우리 땅에 묻힌 <b>재야 하나가 저절로 드러납니다</b> — 수색 명령을 아끼는 길입니다. ' +
      '이 판의 알맹이는 삼국지이고, 학당은 곁가지입니다.</small></div></div>';

    if (!quizCur) {
      html += '<div class="sec"><h4>분야</h4>' +
        '<button class="btn primary wide" data-act="q-start" data-cat="">🎲 전 분야 섞어서</button>' +
        '<div class="qcats">';
      for (var i = 0; i < QD.CATS.length; i++) {
        var c = QD.CATS[i], per = pr.per[c.key];
        html += '<button class="qcat-btn" data-act="q-start" data-cat="' + c.key + '">' +
          '<span style="color:' + c.color + '">' + c.emoji + '</span><b>' + esc(c.name) +
          '</b><small>' + per.learned + ' / ' + per.total + '</small></button>';
      }
      return html + '</div></div>';
    }

    var p = quizCur.p, cat = QD.catOf(p.cat);
    html += '<div class="sec"><div class="qbox">' +
      '<div class="qb-head"><b style="color:' + cat.color + '">' + cat.emoji + ' ' +
        esc(cat.name) + '</b><span class="muted">' + p.lvName + '</span>' +
      '<button class="btn tiny ghost" data-act="q-quit" style="margin-left:auto">그만</button></div>' +
      '<p class="qq">' + esc(p.q) + '</p>';
    if (!quizCur.result) {
      html += '<div class="qchoices">';
      for (var j = 0; j < p.choices.length; j++) {
        html += '<button class="qchoice" data-act="q-answer" data-i="' + j + '"><b>' +
          (j + 1) + '</b> ' + esc(p.choices[j]) + '</button>';
      }
      html += '</div>';
    } else {
      var r = quizCur.result;
      html += '<div class="qresult ' + (r.ok ? 'good' : 'bad') + '">' +
        (r.ok ? (r.first ? '✅ 정답 — 새로 익혔습니다' : '✅ 정답 (복습)') : '❌ 오답') +
        '<b> ' + esc(r.answerText) + '</b></div><p class="qwhy">' + esc(r.why) + '</p>';
      var bits = [];
      if (r.reward.gold) { bits.push('🪙 +' + r.reward.gold); }
      if (r.reward.school && r.reward.school.found) {
        bits.push('🔍 ' + r.reward.school.found.name + ' 이(가) 드러났다');
      }
      if (bits.length) { html += '<div class="qreward">' + bits.join(' · ') + '</div>'; }
      html += '<button class="btn primary wide" data-act="q-next">다음 문제</button>';
    }
    return html + '</div></div>';
  }

  /* ── 기록 ─────────────────────────────────────────────── */

  function viewLog() {
    var log = core.save.log;
    if (!log.length) { return '<div class="hint">아직 기록이 없습니다.</div>'; }
    var out = '<div class="loglist">';
    for (var i = 0; i < log.length; i++) {
      out += '<div class="lrow ' + log[i].kind + '">' + esc(log[i].text) + '</div>';
    }
    return out + '</div>';
  }

  /* ── 덮개 화면 ────────────────────────────────────────── */

  /* ── 수를 묻는다 (prompt 대신) ────────────────────────
   * 폰에서 `prompt()` 는 숫자 키패드가 아니라 글자판을 띄우고, 홈 화면에 담아
   * 띄운 앱(standalone)에서는 아예 뜨지 않는 기기가 있다. 출진·보급·병력 보내기는
   * 이 판에서 가장 자주 누르는 자리라, 막히면 폰에서는 놀 수가 없다.
   * 그래서 **자체 카드**로 바꿨다 — 미는 막대와 ¼·½·⅘·전부.
   */
  var askCb = null;

  function askNumber(opt) {
    askCb = opt.done;
    var max = Math.max(1, Math.floor(opt.max));
    var init = Math.max(1, Math.min(max, Math.floor(opt.value || max)));
    showEnc(
      '<h3 style="margin:0 0 2px;font-size:17px">' + esc(opt.title) + '</h3>' +
      (opt.hint ? '<small class="muted">' + opt.hint + '</small>' : '') +
      '<div class="numask">' +
        '<b id="asknum">' + core.fmt(init) + '</b>' +
        '<input id="askrange" type="range" min="1" max="' + max + '" value="' + init + '">' +
        '<div class="camp-acts">' +
          '<button class="btn tiny" data-act="ask-part" data-p="0.25">¼</button>' +
          '<button class="btn tiny" data-act="ask-part" data-p="0.5">½</button>' +
          '<button class="btn tiny" data-act="ask-part" data-p="0.8">⅘</button>' +
          '<button class="btn tiny" data-act="ask-part" data-p="1">전부</button>' +
        '</div>' +
        '<div class="camp-acts">' +
          '<button class="btn primary" data-act="ask-ok">' + esc(opt.ok || '보낸다') + '</button>' +
          '<button class="btn ghost" data-act="ask-no">그만</button>' +
        '</div>' +
      '</div>');
    var rg = $('askrange');
    if (rg) { rg.addEventListener('input', askShow); }
  }

  function askShow() {
    var rg = $('askrange'), n = $('asknum');
    if (rg && n) { n.textContent = core.fmt(parseInt(rg.value, 10)); }
  }

  function showEnc(html) {
    els.encounter.innerHTML = '<div class="enc-card">' + html + '</div>';
    els.encounter.classList.add('show');
  }

  function closeEnc() {
    els.encounter.classList.remove('show');
    els.encounter.innerHTML = '';
  }

  /** 먼저 **판(시나리오)** 을 고른다 */
  function showScenPick() {
    var html = '<h3 style="margin:0 0 2px;font-size:19px">어느 해에서 시작하시겠습니까</h3>' +
      '<small class="muted">같은 서른 성이지만, 누가 어디를 쥐고 있는지가 다릅니다.</small>' +
      '<div class="fpick scen">';
    for (var i = 0; i < FD.SCENARIOS.length; i++) {
      var sc = FD.SCENARIOS[i];
      html += '<button class="fcard wide-card" data-act="pick-scen" data-id="' + sc.id + '">' +
        '<b>' + sc.year + '년 · ' + esc(sc.name) + '</b>' +
        '<small class="muted">' + esc(sc.hanja) + ' · 세력 ' + sc.forces.length + '</small>' +
        '<small class="muted">' + esc(sc.desc) + '</small>' +
        '</button>';
    }
    showEnc(html + '</div>');
  }

  function showForcePick(scenId) {
    var sc = FD.scenario(scenId || pickScen);
    pickScen = sc.id;
    FD.use(sc.id);               // 이 화면이 보여 줄 표를 그 시나리오 것으로 갈아 끼운다
    var html = '<h3 style="margin:0 0 2px;font-size:19px">삼국지 ' + sc.year + '년 — ' +
      esc(sc.name) + '</h3>' +
      '<small class="muted">' + esc(sc.desc) + ' 성이 적을수록 어렵습니다.</small>' +
      '<button class="btn tiny ghost" data-act="back-scen" style="margin:8px 0 0">↩ 다른 해</button>' +
      '<div class="fpick">';
    var list = FD.FORCES.slice().sort(function (a, b) { return b.cities.length - a.cities.length; });
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      var lord = off().find(f.lord);
      var CREED_KOR = { aggressive: '공격', balanced: '균형', turtle: '수성' };
      html += '<button class="fcard" data-act="pick-force" data-id="' + f.id + '"' +
        ' style="border-color:' + f.color + '">' +
        (lord ? pt(lord, 44) : '') +
        '<b>' + esc(f.name) + '</b>' +
        '<small>🏯 ' + f.cities.length + ' · 👤 ' + (f.officers.length + 1) + '</small>' +
        '<small class="muted">' + esc(CD.find(f.cities[0]).name) + ' · ' +
          CREED_KOR[f.creed] + '</small>' +
        '</button>';
    }
    showEnc(html + '</div>');
  }

  function showBattle(rep) {
    var html = (global.DG.battle3d ? '<canvas id="battle3d"></canvas>' : '') +
      '<h3 style="margin:0 0 6px;font-size:18px">⚔️ 전황</h3><div class="warlog">';
    for (var i = 0; i < rep.log.length; i++) {
      html += '<div>' + esc(rep.log[i]) + '</div>';
    }
    html += '</div><button class="btn primary wide" data-act="close-enc">확인</button>';
    showEnc(html);
    if (global.DG.battle3d) { global.DG.battle3d.render(rep); }
  }

  function showEnd(kind) {
    var st = R().state();
    showEnc('<h3 style="margin:0 0 6px;font-size:20px">' +
      (kind === 'win' ? '👑 천하통일' : '🏳️ 멸망') + '</h3>' +
      '<small class="muted">' + st.year + '년 ' + st.month + '월. ' +
      (kind === 'win' ? '온 땅의 성이 모두 한 깃발 아래 들었습니다.'
                      : '성을 모두 잃었습니다. 처음부터(↺) 다시 시작할 수 있습니다.') +
      '</small><button class="btn primary wide" data-act="close-enc">확인</button>');
  }

  function showHelp() {
    showEnc('<h3 style="margin:0 0 4px;font-size:18px">📜 노는 법</h3><div class="helplist">' +
      '<div><b>달</b> 무장 한 사람이 한 달에 <b>명령 하나</b>를 씁니다. 다 쓰면 ▶ 다음 달</div>' +
      '<div><b>내정</b> 성을 눌러 개간·상업·기술·치안·축성·징병·훈련·수색·등용</div>' +
      '<div><b>금</b> 세력 금고 하나. <b>군량</b>은 성마다 따로 — 6·10월에 거둡니다</div>' +
      '<div><b>태수</b> 지력·통솔이 그 성의 수입과 수확에 곱해지고, 계략을 막습니다</div>' +
      '<div><b>출진</b> 맞닿은 성에만. 수비도 이웃에서 <b>구원군</b>을 부릅니다</div>' +
      '<div><b>일기토</b> 무력이 엇비슷한 장수끼리 붙습니다. 이기면 그 싸움 내내 기세를 탑니다</div>' +
      '<div><b>충성</b> 바닥나면 떠납니다. 금을 내려 붙듭니다 — 적의 이간이 노리는 곳입니다</div>' +
      '<div><b>재야</b> 한국사·유럽사 인물 마흔여덟은 재야입니다. 수색해야 보입니다</div>' +
      '<div><b>학당</b> 문답은 곁가지입니다 — 군자금과 <b>재야 하나</b>를 드러냅니다</div>' +
      '</div><button class="btn primary wide" data-act="close-enc">확인</button>');
  }

  /* ── 알림 ─────────────────────────────────────────────── */

  var toastTimer = null;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    if (toastTimer) { clearTimeout(toastTimer); }
    toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, 2400);
  }

  global.DG = global.DG || {};
  global.DG.ui = {
    init: init, toast: toast,
    openSheet: openSheet, closeSheet: closeSheet, openCity: openCity,
    renderTop: renderTop, renderMap: renderMap, renderSheet: renderSheet,
    showScenPick: showScenPick, showForcePick: showForcePick,
    showHelp: showHelp, showBattle: showBattle,
    closeEnc: closeEnc,
    /** 자가진단용 */
    _act: act, _tab: function () { return openTab; }, _city: function () { return openCityId; },
    _setOrder: function (k) { pickOrder = k; },
    _quiz: function () { return quizCur; }
  };
})(window);
