/**
 * 삼국지 — 전투(戰): 출진 · 일기토 · 야전 · 공성
 * ---------------------------------------------------------------
 * 판정 층과 화면 층을 **가른다**. 이 파일은 수(數)만 굴리고 그림은 한 점도 그리지 않는다.
 * 그래야 헤드리스 자가진단이 화면 없이 그대로 붙는다(역사고 `duel.js` 에서 배운 것이다).
 *
 * 한 달 안에 못 떨어뜨리면 군을 물리지 않고 **성 밖에 진(陣)을 친다**.
 * 그 진영은 다음 달에도 그 자리에 있고, `resolveAll()` 이 달마다 한 번씩 더 친다 —
 * 이것이 **여러 달에 걸치는 원정**이다.
 *
 *   야전   성 밖에서 붙는다. 수비가 병력에 자신이 있을 때만 나온다
 *   공성   성벽이 수비 쪽 힘에 곱해진다. 깎을수록 그 곱이 준다
 *   일기토 붙기 전에 딱 한 번. 이긴 쪽은 그 싸움 내내 기세를 탄다
 *   진영   치중(輜重)이 바닥나거나 사기가 꺾이면 **스스로 물러난다**.
 *          그래서 긴 원정은 보급(`supply`)이 있어야 이어진다
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

  /* 진영(陣) — 달을 넘겨 이어지는 원정.
     진이 길어질수록 사기가 깎이고, 바닥나면 스스로 물러난다.
     이 두 수가 없으면 포위가 영영 안 끝나 판이 그 자리에서 언다. */
  var CAMP_DECAY = 0.94;        // 한 달 더 진을 치면 사기가 이만큼 남는다
  var CAMP_QUIT = 0.60;         // 사기가 이보다 낮으면 군이 지쳐 물러난다
  var CAMP_MIN = 500;           // 이보다 적게 남으면 군대라 할 수 없다

  /* ── 진영 목록 ────────────────────────────────────────── */

  /** save.rtk.camps — 옛 세이브에는 없다(삼국지 판을 갈아엎기 전 것) */
  function camps() {
    var st = global.DG.rtk.state();
    if (!st.camps) { st.camps = []; }
    return st.camps;
  }

  function campsOf(forceId) {
    var list = camps(), out = [], i;
    for (i = 0; i < list.length; i++) {
      if (list[i].force === forceId) { out.push(list[i]); }
    }
    return out;
  }

  function campById(id) {
    var list = camps(), i;
    for (i = 0; i < list.length; i++) { if (list[i].id === id) { return list[i]; } }
    return null;
  }

  /** 그 성을 에워싼 진영 (세력을 주면 그 세력의 것만) */
  function campAt(cityId, forceId) {
    var list = camps(), i;
    for (i = 0; i < list.length; i++) {
      if (list[i].to !== cityId) { continue; }
      if (forceId && list[i].force !== forceId) { continue; }
      return list[i];
    }
    return null;
  }

  /** 이 성이 지금 에워싸여 있는가 — 살림(settleMonth)이 이것을 본다 */
  function besieged(cityId) { return !!campAt(cityId); }

  /** 치중이 몇 달을 버티는가 */
  function monthsLeft(cp) {
    var eat = Math.round(cp.troops / 1000 * global.DG.rtk.FOOD_PER_1000);
    return eat > 0 ? Math.floor(cp.food / eat) : 99;
  }

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
    /* 이미 에워싸고 있으면 새 군대를 또 내보내지 않는다 — 늘리려면 **보급**이다.
       이 줄이 없으면 AI 가 달마다 새 진영을 세워 같은 성 앞에 군대가 쌓인다 */
    if (campAt(toId, from.force)) {
      return { ok: false, why: '이미 진을 치고 있습니다 (보급으로 늘리십시오)' };
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
    report.force = from.force;
    if (relief > 0) { report.log.splice(1, 0, '🚩 이웃 성에서 구원군 ' + core.fmt(relief) + ' 이 들어왔다'); }

    /* 들고 나간 군량에서 이 달 먹은 것을 뺀 나머지가 **치중(輜重)** 이다 */
    var eaten = Math.round(troops / 1000 * R.FOOD_PER_1000);
    var baggage = Math.max(0, chk.food - eaten);

    if (report.won) {
      capture(toId, from.force, atk, def, report);
      to.food += baggage;                       // 치중은 뺏은 성으로 들어간다
    } else if (report.routed) {
      /* 물러났다 — 살아 돌아온 병력과 치중은 출진한 성으로 되돌린다 */
      from.troops += atk.troops;
      from.food += baggage;
      to.troops = def.troops;
      for (i = 0; i < valid.length; i++) { off.addLoyal(valid[i], -2); }
    } else {
      /* 날이 저물었을 뿐이다 — 여기서 군을 되돌리면 공성이 영영 한 달짜리가 된다.
         물러나지 않고 **성 밖에 진을 친다**. 다음 달은 resolveAll() 이 잇는다 */
      to.troops = def.troops;
      report.campId = encamp(fromId, toId, atk, baggage, report).id;
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
    if (!won && !routed) { lines('🌒 날이 저물었다 — 이 달 안에는 못 떨어뜨렸다'); }

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
    /* 데려간 장수는 그 성에 남는다 (진영에서 들어왔으면 그 표시를 뗀다) */
    for (i = 0; i < atk.officers.length; i++) {
      off.rec(atk.officers[i]).camp = null;
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

  /* ── 여러 달에 걸치는 원정 ───────────────────────────── */

  /**
   * 진(陣)을 친다 — 원정이 다음 달로 이어진다.
   * 병력도 장수도 성으로 돌아가지 않는다. `off.rec(id).camp` 가 붙는 동안
   * 그 사람은 **성에 없는 사람**이라 내정도 못 하고 수비에도 안 선다.
   */
  function encamp(fromId, toId, atk, baggage, report) {
    var R = global.DG.rtk, off = global.DG.off;
    var st = R.state();
    st.campSeq = (st.campSeq || 0) + 1;
    var cp = {
      id: 'camp' + st.campSeq,
      force: atk.force, from: fromId, to: toId,
      troops: atk.troops, officers: atk.officers.slice(),
      train: atk.train, tech: atk.tech, morale: atk.morale,
      food: baggage, months: 1
    };
    camps().push(cp);
    for (var i = 0; i < cp.officers.length; i++) { off.rec(cp.officers[i]).camp = cp.id; }
    report.log.push('🏕️ 물러나지 않고 성 밖에 진을 쳤다 — 치중 ' + core.fmt(cp.food) +
      ' (' + monthsLeft(cp) + '달치)');
    core.log('🏕️ ' + R.forceName(cp.force) + ' 이(가) ' + CD.find(toId).name +
      ' 을(를) 에워쌌다', 'info');
    core.emit('rtk:camp', { kind: 'set', camp: cp.id, to: toId, force: cp.force });
    return cp;
  }

  /** 진영을 목록에서 뺀다 — 장수에 붙은 표시도 함께 뗀다 */
  function drop(cp) {
    var off = global.DG.off, list = camps(), i = list.indexOf(cp);
    if (i >= 0) { list.splice(i, 1); }
    for (i = 0; i < cp.officers.length; i++) { off.rec(cp.officers[i]).camp = null; }
  }

  /** 물러날 곳 — 출진한 성이 아직 우리 것이면 그리로, 아니면 가장 가까운 우리 성 */
  function homeFor(cp) {
    var R = global.DG.rtk;
    var from = R.city(cp.from);
    if (from && from.force === cp.force) { return cp.from; }
    var mine = R.citiesOf(cp.force), best = null, bd = 1e9, i, d;
    for (i = 0; i < mine.length; i++) {
      d = CD.hops(cp.to, mine[i]);
      if (d >= 0 && d < bd) { bd = d; best = mine[i]; }
    }
    return best;
  }

  /** 포위를 푼다 */
  function retreat(cp, why) {
    var R = global.DG.rtk, off = global.DG.off;
    var home = homeFor(cp);
    if (!home) { return disband(cp); }
    var h = R.city(home), i;
    h.troops += cp.troops; h.food += cp.food;
    for (i = 0; i < cp.officers.length; i++) {
      off.placeAt(cp.officers[i], home, cp.force);
      off.addLoyal(cp.officers[i], -2);
    }
    drop(cp);
    core.log('↩️ ' + R.forceName(cp.force) + ' 이(가) ' + CD.find(cp.to).name +
      ' 의 포위를 풀었다 — ' + why + ' ' + CD.find(home).name + ' 으로 물러났다', 'warn');
    core.emit('rtk:camp', { kind: 'retreat', camp: cp.id, to: cp.to, home: home, why: why });
    return { ok: true, kind: 'retreat', campId: cp.id, to: cp.to, home: home, why: why };
  }

  /** 그 사이 우리 깃발이 올랐다 (동맹이 뺏었거나 계략이 통했거나) — 그대로 들어간다 */
  function enterCity(cp) {
    var R = global.DG.rtk, off = global.DG.off;
    var to = R.city(cp.to), i;
    to.troops += cp.troops; to.food += cp.food;
    for (i = 0; i < cp.officers.length; i++) {
      off.placeAt(cp.officers[i], cp.to, cp.force);
    }
    drop(cp);
    core.log('🚩 ' + CD.find(cp.to).name + ' 에 이미 우리 깃발이 올라 그대로 입성했다', 'good');
    core.emit('rtk:camp', { kind: 'enter', camp: cp.id, to: cp.to });
    return { ok: true, kind: 'enter', campId: cp.id, to: cp.to };
  }

  /**
   * 돌아갈 나라가 사라졌다 — 원정군이 그 자리에서 흩어진다.
   * 장수는 **사로잡힌 것으로 둔다**. 그냥 지우면 판에서 사람이 조용히 사라진다
   * (성이 떨어질 때 수비 무장을 흩는 것과 같은 까닭이다).
   */
  function disband(cp) {
    var R = global.DG.rtk, off = global.DG.off, st = R.state(), i, id;
    for (i = 0; i < cp.officers.length; i++) {
      id = cp.officers[i];
      off.placeAt(id, cp.to, null);
      off.rec(id).found = true;
      off.rec(id).loyal = 0;
      st.captives[id] = cp.to;
    }
    drop(cp);
    core.log('🏳️ 돌아갈 곳을 잃은 원정군이 ' + CD.find(cp.to).name + ' 앞에서 흩어졌다', 'warn');
    core.emit('rtk:camp', { kind: 'disband', camp: cp.id, to: cp.to });
    return { ok: true, kind: 'disband', campId: cp.id, to: cp.to };
  }

  /** 일기토에서 다친 장수는 진을 떠나 돌아간다 */
  function sendHomeHurt(cp, was) {
    var off = global.DG.off, home = homeFor(cp), i;
    for (i = 0; i < was.length; i++) {
      if (cp.officers.indexOf(was[i]) >= 0) { continue; }
      off.rec(was[i]).camp = null;
      if (home) { off.placeAt(was[i], home, cp.force); }
    }
  }

  /**
   * 보급 — 진영에 병력과 치중을 보낸다.
   * 보내는 곳은 **그 진영과 맞닿은 우리 성**이다. 이것이 있어야 원정이 두 달을 넘긴다
   * (출진할 때 들고 나가는 군량이 두 달치라 보급이 없으면 거기서 끝난다).
   */
  function supply(campId, troops, food, fromId) {
    var R = global.DG.rtk;
    var cp = campById(campId);
    if (!cp) { return { ok: false, why: '없는 진영입니다' }; }
    fromId = fromId || cp.from;
    var from = R.city(fromId);
    if (!from || from.force !== cp.force) { return { ok: false, why: '우리 성이 아닙니다' }; }
    if (CD.find(fromId).adj.indexOf(cp.to) < 0) {
      return { ok: false, why: '진영과 맞닿아 있지 않습니다' };
    }
    troops = Math.max(0, Math.round(troops || 0));
    food = Math.max(0, Math.round(food || 0));
    if (troops > from.troops || food > from.food) { return { ok: false, why: '보낼 것이 모자랍니다' }; }
    if (!troops && !food) { return { ok: false, why: '보낼 것이 없습니다' }; }
    from.troops -= troops; from.food -= food;
    /* 갓 온 병사가 섞이면 훈련도가 내려간다 — 성에서 징병할 때와 같다 */
    if (troops > 0 && cp.troops + troops > 0) {
      cp.train = Math.round((cp.train * cp.troops + from.train * troops) / (cp.troops + troops));
    }
    cp.troops += troops; cp.food += food;
    core.emit('changed');
    core.persist();
    return { ok: true, troops: troops, food: food, left: monthsLeft(cp) };
  }

  /** 사람이 스스로 포위를 푼다 */
  function withdraw(campId) {
    var cp = campById(campId);
    if (!cp) { return { ok: false, why: '없는 진영입니다' }; }
    var res = retreat(cp, '스스로 군을 거두어');
    core.emit('changed');
    core.persist();
    return res;
  }

  /**
   * 진영 하나의 한 달.
   * **march 와 같은 `fight()` 를 쓴다** — 여기에만 있는 판정을 만들면 판정이 두 벌이 된다.
   */
  function resolveCamp(cp) {
    var R = global.DG.rtk, off = global.DG.off;
    var to = R.city(cp.to);
    if (!to) { drop(cp); return null; }

    if (!R.citiesOf(cp.force).length) { return disband(cp); }
    if (to.force === cp.force) { return enterCity(cp); }
    if (global.DG.diplo && global.DG.diplo.blocked(cp.force, to.force)) {
      return retreat(cp, '맹약이 맺어져');
    }

    /* 치중 — 한 달치를 먹는다.
       한 달치를 못 채우면 **굶어 흩어지기 전에 군을 돌린다.** 성처럼
       모자란 만큼을 그대로 병사에서 깎으면(settleMonth 의 식) 치중이 떨어지는
       그 달에 원정군이 통째로 사라진다 — 성은 물러날 데가 없지만 진영은 있다. */
    var eat = Math.round(cp.troops / 1000 * R.FOOD_PER_1000);
    if (cp.food < eat) {
      var lost = Math.round(cp.troops * 0.2);
      cp.troops = Math.max(0, cp.troops - lost);
      cp.food = 0;
      if (lost > 0) {
        core.log('🍚 ' + CD.find(cp.to).name + ' 진중 — 군량이 떨어져 병사 ' +
          core.fmt(lost) + ' 이 흩어졌다', 'warn');
      }
      return retreat(cp, '군량이 떨어져');
    }
    cp.food -= eat;

    /* 진이 길어질수록 사기가 깎인다 */
    cp.morale *= CAMP_DECAY;
    if (cp.morale < CAMP_QUIT || cp.troops < CAMP_MIN) { return retreat(cp, '군이 지쳐'); }

    var relief = reinforce(cp.to);
    var was = cp.officers.slice();
    var land = CD.landOf(cp.to);
    var atk = {
      side: 'atk', force: cp.force, troops: cp.troops, start: cp.troops,
      train: cp.train, tech: cp.tech, officers: cp.officers, morale: cp.morale
    };
    var def = {
      side: 'def', force: to.force, troops: to.troops, start: to.troops,
      train: to.train, tech: to.tech,
      officers: off.atCity(cp.to, to.force).map(function (h) { return h.id; }), morale: 1
    };

    var report = fight(atk, def, to, cp.to, land, false);
    report.from = cp.from; report.to = cp.to; report.relief = relief;
    report.force = cp.force;
    report.campId = cp.id; report.siege = true; report.months = cp.months;
    report.log.splice(1, 0, '🏕️ ' + cp.months + '달째 에워싸고 있다 — 사기 ' +
      Math.round(cp.morale * 100) + ' · 치중 ' + core.fmt(cp.food) +
      ' (' + monthsLeft(cp) + '달치)');
    if (relief > 0) {
      report.log.splice(2, 0, '🚩 이웃 성에서 구원군 ' + core.fmt(relief) + ' 이 들어왔다');
    }

    cp.troops = atk.troops; cp.morale = atk.morale;
    sendHomeHurt(cp, was);

    if (report.won) {
      to.food += cp.food;
      capture(cp.to, cp.force, atk, def, report);
      drop(cp);
    } else if (report.routed) {
      to.troops = def.troops;
      retreat(cp, '공격군이 무너져');
    } else {
      to.troops = def.troops;
      cp.months += 1;
    }
    core.emit('rtk:battle', report);
    return report;
  }

  /**
   * endMonth 가 부른다 — 서 있는 진영이 저마다 한 달을 더 산다.
   * 목록을 **베껴 두고** 돈다 — 도중에 함락·철군으로 목록이 줄기 때문이다.
   */
  function resolveAll() {
    var list = camps().slice(), out = [], i, r;
    for (i = 0; i < list.length; i++) {
      r = resolveCamp(list[i]);
      if (r) { out.push(r); }
    }
    if (out.length) { core.emit('changed'); core.persist(); }
    return out.length ? out : null;
  }

  global.DG = global.DG || {};
  global.DG.war = {
    ROUNDS: ROUNDS, ROUT: ROUT, DUEL_GAP: DUEL_GAP,
    CAMP_DECAY: CAMP_DECAY, CAMP_QUIT: CAMP_QUIT, CAMP_MIN: CAMP_MIN,
    armyPower: armyPower, topBy: topBy, duel: duel,
    reinforce: reinforce, reliefOf: reliefOf, forecast: forecast,
    canMarch: canMarch, march: march, capture: capture,
    transfer: transfer, moveOfficer: moveOfficer,
    camps: camps, campsOf: campsOf, campById: campById, campAt: campAt,
    besieged: besieged, monthsLeft: monthsLeft,
    supply: supply, withdraw: withdraw,
    resolveCamp: resolveCamp, resolveAll: resolveAll
  };
})(window);
