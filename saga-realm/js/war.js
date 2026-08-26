/**
 * 삼국지 — 전투(戰): 출진 · 일기토 · 야전 · 공성
 * ---------------------------------------------------------------
 * 판정 층과 화면 층을 **가른다**. 이 파일은 수(數)만 굴리고 그림은 한 점도 그리지 않는다.
 * 그래야 헤드리스 자가진단이 화면 없이 그대로 붙는다(역사고 `duel.js` 에서 배운 것이다).
 *
 * 한 번의 출진은 **그 달 안에 끝난다**. 인접한 성으로만 갈 수 있으니 억지가 아니다.
 * 대신 성벽은 남는다 — 이번에 못 깨면 다음 달에 반쯤 깎인 성벽을 다시 친다.
 *
 *   야전   성 밖에서 붙는다. 수비가 병력에 자신이 있을 때만 나온다
 *   공성   성벽이 수비 쪽 힘에 곱해진다. 깎을수록 그 곱이 준다
 *   일기토 붙기 전에 딱 한 번. 이긴 쪽은 그 싸움 내내 기세를 탄다
 *
 * 병력을 잃는 쪽은 **상대의 힘**에 비례해 잃는다. 제 병력에 비례하게 두면
 * 큰 군대가 알아서 녹아 수가 커질수록 불리해진다(한 번 그렇게 짜서 겪었다).
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var CD = global.DG.cityData;

  var ROUNDS = 10;              // 한 달에 붙는 횟수
  var ROUT = 0.35;              // 처음 병력의 이만큼까지 줄면 물러난다
  var DUEL_GAP = 25;            // 무력 차가 이보다 작아야 일기토가 성립한다

  /* ── 부대의 힘 ────────────────────────────────────────── */

  /**
   * 부대 전투력.
   *   병력 × 훈련 × 기술 × 장수 보정
   * 장수 보정은 **가장 나은 한 사람**이 끌고, 나머지는 조금씩 보탠다.
   * 전원 평균으로 하면 약한 장수를 딸려 보낼수록 약해져서 "다 데려간다" 가 손해가 된다.
   */
  function armyPower(army) {
    var off = global.DG.off;
    var trainF = 0.5 + core.clamp(army.train, 0, 100) / 200;
    var techF = 0.7 + core.clamp(army.tech, 0, 900) / 900 * 0.6;
    var bestCmd = 0, bestMight = 0, extra = 0, i, s;
    for (i = 0; i < army.officers.length; i++) {
      s = off.stats(army.officers[i]);
      if (s.command > bestCmd) { bestCmd = s.command; }
      if (s.might > bestMight) { bestMight = s.might; }
      extra += (s.command + s.might) / 2;
    }
    var lead = 1 + bestCmd / 100 * 0.5 + bestMight / 100 * 0.25 +
      Math.max(0, army.officers.length - 1) * 0.03;
    if (extra === 0) { lead = 0.6; }         // 장수 없는 군대는 오합지졸이다
    return army.troops * trainF * techF * lead * (army.morale || 1);
  }

  function topBy(officerIds, key) {
    var off = global.DG.off, best = null, bv = -1;
    for (var i = 0; i < officerIds.length; i++) {
      var v = off.stats(officerIds[i])[key];
      if (v > bv) { bv = v; best = officerIds[i]; }
    }
    return best;
  }

  /* ── 일기토 ───────────────────────────────────────────── */

  /**
   * 서로 으뜸 무장이 창을 겨눈다.
   * 무력 차가 크면 아무도 안 나온다 — 뻔한 싸움은 일기토가 아니다.
   */
  function duel(aId, dId) {
    var off = global.DG.off;
    var am = off.stats(aId).might, dm = off.stats(dId).might;
    if (Math.abs(am - dm) > DUEL_GAP) { return null; }
    if (Math.random() > 0.35) { return null; }

    var rounds = [], ah = 100, dh = 100, n = 0;
    while (ah > 0 && dh > 0 && n < 12) {
      n++;
      var hit = am / (am + dm);
      if (Math.random() < hit) { dh -= 8 + Math.round(am / 12); rounds.push('a'); }
      else { ah -= 8 + Math.round(dm / 12); rounds.push('d'); }
    }
    var winner = dh <= 0 ? aId : (ah <= 0 ? dId : (ah >= dh ? aId : dId));
    var loser = winner === aId ? dId : aId;
    /* 크게 진 쪽만 다친다. 비긴 판에서 다치면 일기토를 걸 까닭이 없어진다 */
    var decisive = (winner === aId ? dh : ah) <= 0;
    var hurt = decisive && Math.random() < 0.5;
    if (hurt) { off.rec(loser).hurt = 1 + Math.floor(Math.random() * 2); }
    return {
      winner: winner, loser: loser, rounds: n, decisive: decisive, hurt: hurt,
      text: off.find(winner).name + ' 이(가) ' + off.find(loser).name + ' 을(를) ' +
        n + '합 만에 ' + (decisive ? '꺾었다' : '밀어냈다')
    };
  }

  /* ── 출진 ─────────────────────────────────────────────── */

  /** 출진할 수 있는가 — 인접·소속·병력·군량을 본다 */
  function canMarch(fromId, toId, troops) {
    var R = global.DG.rtk;
    var from = R.city(fromId), to = R.city(toId);
    if (!from || !to) { return { ok: false, why: '없는 성' }; }
    var d = CD.find(fromId);
    if (d.adj.indexOf(toId) < 0) { return { ok: false, why: '맞닿아 있지 않습니다' }; }
    if (from.force === to.force) { return { ok: false, why: '우리 성입니다' }; }
    if (troops > from.troops) { return { ok: false, why: '병력이 모자랍니다' }; }
    if (troops < 500) { return { ok: false, why: '오백은 넘겨야 군대라 하지요' }; }
    /* 원정 군량 — 병력의 한 달치는 들고 가야 한다 */
    var need = Math.round(troops / 1000 * global.DG.rtk.FOOD_PER_1000 * 2);
    if (from.food < need) { return { ok: false, why: '군량이 모자랍니다 (' + core.fmt(need) + ' 필요)' }; }
    if (global.DG.diplo && global.DG.diplo.blocked(from.force, to.force)) {
      return { ok: false, why: '맹약이 있어 칠 수 없습니다' };
    }
    return { ok: true, food: need };
  }

  /**
   * 친다.
   * @param officerIds 데려갈 무장 (이 성에 있고, 성한 사람만)
   * @returns 전황 보고 { won, log[], lossA, lossD, taken, duel }
   */
  function march(fromId, toId, officerIds, troops) {
    var R = global.DG.rtk;
    var off = global.DG.off;
    var chk = canMarch(fromId, toId, troops);
    if (!chk.ok) { return { ok: false, why: chk.why }; }

    var from = R.city(fromId), to = R.city(toId);
    var i, valid = [];
    for (i = 0; i < officerIds.length; i++) {
      var r = off.rec(officerIds[i]);
      if (r.city === fromId && r.force === from.force && !r.hurt) { valid.push(officerIds[i]); }
    }
    if (!valid.length) { return { ok: false, why: '데려갈 장수가 없습니다' }; }

    from.troops -= troops;
    from.food -= chk.food;

    /* 구원군 — 수비 쪽도 이웃한 제 성에서 병력을 끌어온다.
       이게 없으면 공격 쪽만 모을 수 있어 **큰 세력이 무조건 이긴다**
       (없이 120개월을 굴렸더니 263전 259함락 — 사실상 수비가 없는 판이었다) */
    var relief = reinforce(toId);
    var defOff = off.atCity(toId, to.force).map(function (h) { return h.id; });
    var land = CD.landOf(toId);

    var atk = {
      side: 'atk', force: from.force, troops: troops, start: troops,
      train: from.train, tech: from.tech, officers: valid, morale: 1
    };
    var def = {
      side: 'def', force: to.force, troops: to.troops, start: to.troops,
      train: to.train, tech: to.tech, officers: defOff, morale: 1
    };

    var report = fight(atk, def, to, toId, land, false);
    report.from = fromId; report.to = toId; report.relief = relief;
    if (relief > 0) { report.log.splice(1, 0, '🚩 이웃 성에서 구원군 ' + core.fmt(relief) + ' 이 들어왔다'); }

    /* 살아 돌아온 병력은 출진한 성으로 되돌린다 (이긴 쪽이 성에 들어간다) */
    if (report.won) {
      capture(toId, from.force, atk, def, report);
    } else {
      from.troops += atk.troops;
      to.troops = def.troops;
      for (i = 0; i < valid.length; i++) { off.addLoyal(valid[i], -2); }
    }

    core.emit('rtk:battle', report);
    core.emit('changed');
    core.persist();
    return report;
  }

  /**
   * 구원군 — 공격을 받은 성으로 이웃한 제 성의 병력이 달려온다.
   * 한 성에서 **사할까지**. 공격 쪽이 끌어모으는 오할보다 적게 둔 것은,
   * 치는 쪽이 때를 고르기 때문이다(그 이점까지 없애면 아무도 못 친다).
   */
  function reinforce(toId) {
    var R = global.DG.rtk;
    var to = R.city(toId);
    if (!to || !to.force) { return 0; }
    var adj = CD.find(toId).adj, sum = 0, i;
    for (i = 0; i < adj.length; i++) {
      var c = R.city(adj[i]);
      if (!c || c.force !== to.force) { continue; }
      var t = Math.floor(c.troops * 0.4);
      if (t < 200) { continue; }
      c.troops -= t; to.troops += t; sum += t;
    }
    return sum;
  }

  /** 그 성이 부를 수 있는 구원군의 크기 (AI 가 칠지 말지 가늠할 때 본다) */
  function reliefOf(toId) {
    var R = global.DG.rtk;
    var to = R.city(toId);
    if (!to || !to.force) { return 0; }
    var adj = CD.find(toId).adj, sum = 0, i;
    for (i = 0; i < adj.length; i++) {
      var c = R.city(adj[i]);
      if (c && c.force === to.force) { sum += Math.floor(c.troops * 0.4); }
    }
    return sum;
  }

  /**
   * 한 달치 싸움.
   * @param wallRef {wall,maxWall} 를 가진 것 — 진짜 도시이거나, 가늠할 때는 그 사본
   * @param dry     가늠(forecast)이면 true — 일기토를 굴리지 않는다(장수가 진짜로 다친다)
   */
  function fight(atk, def, wallRef, toId, land, dry) {
    var off = global.DG.off;
    var log = [];
    var lines = function (s) { log.push(s); };

    lines('⚔️ ' + CD.find(toId).name + ' — ' + global.DG.rtk.forceName(atk.force) +
      ' ' + core.fmt(atk.troops) + ' vs ' + global.DG.rtk.forceName(def.force) +
      ' ' + core.fmt(def.troops));

    /* 일기토 */
    var du = null;
    var aTop = topBy(atk.officers, 'might'), dTop = topBy(def.officers, 'might');
    if (aTop && dTop && !dry) {
      du = duel(aTop, dTop);
      if (du) {
        lines('🤺 ' + du.text + (du.hurt ? ' — ' + off.find(du.loser).name + ' 이(가) 다쳤다' : ''));
        var winSide = atk.officers.indexOf(du.winner) >= 0 ? atk : def;
        var loseSide = winSide === atk ? def : atk;
        winSide.morale *= 1.15;
        loseSide.morale *= 0.92;
        if (du.hurt) {
          /* 다친 장수는 그 싸움에서 빠진다 */
          var li = loseSide.officers.indexOf(du.loser);
          if (li >= 0) { loseSide.officers.splice(li, 1); }
        }
      }
    }

    /* 야전 — 수비가 병력에 자신이 있으면 성 밖으로 나온다 */
    var sortie = def.troops > atk.troops * 0.85;
    if (sortie) { lines('🏇 성문이 열리고 수비군이 마주 나왔다 (야전)'); }
    else { lines('🧱 수비군은 성을 닫고 지킨다 (공성)'); }

    var startWall = wallRef.wall;
    var r, won = false, routed = false;
    for (r = 0; r < ROUNDS; r++) {
      /* 성벽이 온전할수록 수비가 세다. 야전이면 성벽을 못 쓴다 */
      var wallF = sortie ? land.def
        : land.def * (1 + (wallRef.wall / Math.max(1, wallRef.maxWall)) * 0.9);

      var ap = armyPower(atk);
      var dp = armyPower(def) * wallF;

      /* 병력 손실은 **상대의 힘**에 비례한다.
         계수는 "힘이 엇비슷하면 열 합에 절반쯤 녹는다" 를 맞춘 값이다.
         (부대의 힘은 병력 × 0.85 남짓이므로 0.055 면 한 합에 6% 안팎이 된다) */
      var lossA = Math.round(dp * 0.055 * (0.85 + Math.random() * 0.3));
      var lossD = Math.round(ap * 0.055 * (0.85 + Math.random() * 0.3));
      atk.troops = Math.max(0, atk.troops - lossA);
      def.troops = Math.max(0, def.troops - lossD);

      /* 공성추 — 성벽을 깎는다 */
      if (!sortie) {
        wallRef.wall = Math.max(0, Math.round(wallRef.wall - atk.troops * 0.045 * land.siege));
      }

      if (def.troops <= 0) { won = true; lines('🏳️ 수비군이 무너졌다'); break; }
      if (atk.troops <= atk.start * ROUT) { routed = true; lines('↩️ 공격군이 물러났다'); break; }
      if (!sortie && wallRef.wall <= 0 && def.troops < atk.troops * 0.5) {
        won = true; lines('🧨 성문이 부서졌다 — 성이 떨어졌다'); break;
      }
      /* 성벽이 남아도 지킬 사람이 없으면 성문은 열린다.
         이 줄이 없으면 수백 명이 남은 성이 온전한 성벽 뒤에서 몇 달을 버틴다 */
      if (!sortie && def.troops <= atk.troops * 0.08) {
        won = true; lines('🚪 지킬 군사가 남지 않아 성문이 열렸다'); break;
      }
      if (sortie && def.troops < atk.troops * 0.25) {
        won = true; lines('🏳️ 수비군이 흩어졌다'); break;
      }
    }
    if (!won && !routed) { lines('🌒 날이 저물어 군을 거두었다 (다음 달에 다시 친다)'); }

    lines('📉 잃은 병력 — 공 ' + core.fmt(atk.start - atk.troops) +
      ' · 수 ' + core.fmt(def.start - def.troops));
    if (startWall !== wallRef.wall) {
      lines('🧱 성벽 ' + core.fmt(startWall) + ' → ' + core.fmt(wallRef.wall));
    }

    return {
      ok: true, won: won, routed: routed, duel: du, log: log,
      lossA: atk.start - atk.troops, lossD: def.start - def.troops,
      wallFrom: startWall, wallTo: wallRef.wall, sortie: sortie
    };
  }

  /**
   * 성을 뺏는다.
   * 수비 무장은 **달아나거나 · 잡히거나 · 재야로 흩어진다** — 그냥 사라지면
   * 그 세력의 사람이 판에서 조용히 지워져 등용할 거리가 줄어든다.
   */
  function capture(toId, newForce, atk, def, report) {
    var R = global.DG.rtk;
    var off = global.DG.off;
    var st = R.state();
    var to = R.city(toId);
    var oldForce = to.force;
    var i;

    var fled = [], caught = [];
    var refuge = null;
    var adj = CD.find(toId).adj;
    for (i = 0; i < adj.length; i++) {
      var a = R.city(adj[i]);
      if (a && a.force === oldForce) { refuge = adj[i]; break; }
    }

    for (i = 0; i < def.officers.length; i++) {
      var id = def.officers[i];
      var isLord = (global.DG.forceData.force(oldForce) || {}).lord === id;
      if (refuge && (isLord || Math.random() < 0.6)) {
        off.placeAt(id, refuge, oldForce);
        fled.push(id);
      } else {
        /* 사로잡힌다 — 세력에서 떨어져 나와 이 성에 갇힌다 */
        off.placeAt(id, toId, null);
        off.rec(id).found = true;
        off.rec(id).loyal = 0;
        st.captives[id] = toId;
        caught.push(id);
      }
    }

    to.force = newForce;
    to.troops = atk.troops;
    to.gov = atk.officers.length ? atk.officers[0] : null;
    to.sec = Math.max(10, Math.round(to.sec * 0.5));      // 갓 뺏은 성은 어수선하다
    to.train = atk.train;
    /* 데려간 장수는 그 성에 남는다 */
    for (i = 0; i < atk.officers.length; i++) {
      off.placeAt(atk.officers[i], toId, newForce);
      off.rec(atk.officers[i]).feats += 3;
      off.addLoyal(atk.officers[i], 3);
    }

    report.taken = toId;
    report.fled = fled;
    report.caught = caught;
    report.log.push('🚩 ' + CD.find(toId).name + ' 함락! ' + R.forceName(newForce) + ' 의 깃발이 올랐다');
    if (caught.length) {
      report.log.push('⛓️ 사로잡음 — ' + caught.map(function (x) { return off.find(x).name; }).join(', '));
    }
    if (fled.length) {
      report.log.push('🏃 달아남 — ' + fled.map(function (x) { return off.find(x).name; }).join(', '));
    }
    core.log('🚩 ' + CD.find(toId).name + ' 함락 — ' + R.forceName(newForce), 'good');

    /* 세력이 통째로 지워졌는가 */
    if (!R.citiesOf(oldForce).length) {
      core.log('🏳️ ' + R.forceName(oldForce) + ' 이(가) 멸망했다', 'warn');
      core.emit('rtk:fallen', oldForce);
    }
    R.checkResult();
  }

  /**
   * 쳐 보면 어찌 될까 — **진짜 전투식을 그대로** 굴려 본다.
   *
   * AI 가 "성벽 × 지형 × 병력" 같은 어림식으로 승산을 재게 두면 판정이 두 벌이 되고,
   * 그 두 벌이 어긋나는 만큼 판이 얼거나 터진다. 실제로 겪었다 —
   * 어림식이 **성벽 초깃값**으로만 재는 바람에 공성 중 성벽이 깎이는 것을 못 보고
   * 120개월에 다섯 번밖에 안 싸웠다. 여기서는 사본을 놓고 같은 함수를 돌린다.
   *
   * 판이 흔들리지 않게 일기토는 굴리지 않고(dry), 도시도 손대지 않는다.
   */
  function forecast(fromId, toId, officerIds, troops) {
    var R = global.DG.rtk;
    var from = R.city(fromId), to = R.city(toId);
    if (!from || !to) { return null; }
    var land = CD.landOf(toId);
    var wallRef = { wall: to.wall, maxWall: to.maxWall };
    var defTroops = to.troops + reliefOf(toId);
    var atk = {
      troops: troops, start: troops, train: from.train, tech: from.tech,
      officers: officerIds, morale: 1
    };
    var def = {
      troops: defTroops, start: defTroops, train: to.train, tech: to.tech,
      officers: global.DG.off.atCity(toId, to.force).map(function (h) { return h.id; }),
      morale: 1
    };
    var rep = fight(atk, def, wallRef, toId, land, true);
    return { won: rep.won, routed: rep.routed, lossA: rep.lossA, lossD: rep.lossD,
             wallTo: wallRef.wall, defTroops: defTroops };
  }

  /* ── 우리 성끼리 ──────────────────────────────────────── */

  /** 병력·군량을 이웃한 우리 성으로 보낸다 */
  function transfer(fromId, toId, troops, food) {
    var R = global.DG.rtk;
    var from = R.city(fromId), to = R.city(toId);
    if (!from || !to) { return { ok: false, why: '없는 성' }; }
    if (from.force !== to.force) { return { ok: false, why: '우리 성이 아닙니다' }; }
    if (CD.find(fromId).adj.indexOf(toId) < 0) { return { ok: false, why: '맞닿아 있지 않습니다' }; }
    troops = Math.max(0, Math.round(troops || 0));
    food = Math.max(0, Math.round(food || 0));
    if (troops > from.troops || food > from.food) { return { ok: false, why: '보낼 것이 모자랍니다' }; }
    from.troops -= troops; to.troops += troops;
    from.food -= food; to.food += food;
    core.emit('changed');
    return { ok: true, troops: troops, food: food };
  }

  /** 무장을 이웃한 우리 성으로 옮긴다 (그 달의 명령을 쓴다) */
  function moveOfficer(officerId, toId) {
    var R = global.DG.rtk;
    var off = global.DG.off;
    var r = off.rec(officerId);
    var from = R.city(r.city), to = R.city(toId);
    if (!from || !to) { return { ok: false, why: '없는 성' }; }
    if (to.force !== r.force) { return { ok: false, why: '우리 성이 아닙니다' }; }
    if (CD.find(r.city).adj.indexOf(toId) < 0) { return { ok: false, why: '맞닿아 있지 않습니다' }; }
    if (r.done) { return { ok: false, why: '이 달에 이미 명령을 썼습니다' }; }
    if (from.gov === officerId) { from.gov = null; }
    r.city = toId; r.done = true;
    core.emit('changed');
    return { ok: true };
  }

  /** endMonth 가 부른다 — 지금은 출진이 그 자리에서 끝나므로 할 일이 없다.
   *  여러 달에 걸치는 원정을 넣을 때 이 자리를 쓴다. */
  function resolveAll() { return null; }

  global.DG = global.DG || {};
  global.DG.war = {
    ROUNDS: ROUNDS, ROUT: ROUT, DUEL_GAP: DUEL_GAP,
    armyPower: armyPower, topBy: topBy, duel: duel,
    reinforce: reinforce, reliefOf: reliefOf, forecast: forecast,
    canMarch: canMarch, march: march, capture: capture,
    transfer: transfer, moveOfficer: moveOfficer, resolveAll: resolveAll
  };
})(window);
