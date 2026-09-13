/**
 * 퀘스트 — PLAN 36절. 메인 · 지역 · 무작위 · 이벤트 넷을 굴린다.
 * ---------------------------------------------------------------
 * 표(data-quest.js)는 요구(req)만 쥐고, 여기가 진행을 센다. dungeon.js 가
 * 던지는 사건 넷만 듣는다 — dungeon:kill · dungeon:room · dungeon:floor ·
 * dungeon:rescue. **판정(dungeon.js)은 한 줄도 안 건드린다**, 사건을 emit
 * 하는 자리 둘(kill · 구출)만 얹었다.
 *
 * 세이브는 core.save.quest 하나 — item.js 의 gear() 와 같은 지연 초기화
 * 모양이다. 메인·이벤트는 **순서대로 하나씩**(인덱스 하나로 충분하다),
 * 지역은 **여섯이 동시에 열릴 수 있어** 인덱스별로 진행을 따로 쥔다,
 * 무작위는 **늘 하나만 떠 있다**(끝내면 곧바로 새것).
 *
 * 보상은 끝나는 순간 **바로** 준다 — 이 판의 다른 것(드랍·자동장착)도
 * 다 그렇게 즉시 처리하지, 따로 "수령" 단추를 두지 않는다.
 */
(function (global) {
  'use strict';

  function core() { return global.DG.core; }
  function DD() { return global.DG.dungeonData; }
  function QD() { return global.DG.questData; }

  function qs() {
    var s = core().save;
    if (!s.quest) {
      s.quest = { mainIdx: 0, mainHave: 0, region: {}, eventIdx: 0, eventHave: 0, random: null };
    }
    if (!s.quest.region) { s.quest.region = {}; }
    return s.quest;
  }

  /** 층이 THEMES 중 몇째 지역인지 — 월드맵(viewWorldMap)과 같은 규칙 */
  function regionIndexOf(floor) {
    var THEMES = DD().THEMES, idx = 0, i;
    for (i = 0; i < THEMES.length; i++) { if (floor >= THEMES[i].from) { idx = i; } }
    return idx;
  }

  /** 최고 도달 층이 그 지역에 닿으면 연다(닿은 순서대로, 못 닿은 지역은 안 연다) */
  function unlockRegions() {
    var DN = global.DG.dungeon;
    var best = DN ? DN.status().best : 0;
    var THEMES = DD().THEMES, q = qs(), i;
    for (i = 0; i < THEMES.length; i++) {
      if (best >= THEMES[i].from && !q.region[i]) {
        q.region[i] = { have: 0, done: false };
      }
    }
  }

  function grant(reward, label) {
    var C = core();
    if (reward.gold) { C.save.player.gold += reward.gold; }
    if (reward.exp) { C.gainExp(reward.exp); }
    if (reward.feat) { C.gainFeat(reward.feat, '퀘스트'); }
    C.log('🚩 퀘스트 완료 · ' + label +
      (reward.gold ? ' · 금 +' + C.fmt(reward.gold) : ''), 'good');
    C.emit('toast', '🚩 퀘스트 완료 — ' + label);
  }

  function checkMain() {
    var q = qs(), m = QD().MAIN[q.mainIdx];
    if (!m || q.mainHave < m.req.n) { return false; }
    grant(m.reward, '메인 · ' + m.name);
    q.mainIdx++;
    q.mainHave = 0;
    return true;
  }

  function checkRegion(i) {
    var q = qs(), rq = q.region[i];
    if (!rq || rq.done) { return false; }
    var THEMES = DD().THEMES;
    if (!THEMES[i]) { return false; }
    var def = QD().regionQuest(i, THEMES[i].name);
    if (rq.have < def.req.n) { return false; }
    grant(def.reward, '지역 · ' + def.name);
    rq.done = true;
    return true;
  }

  function checkEvent() {
    var q = qs(), ev = QD().EVENT[q.eventIdx];
    if (!ev || q.eventHave < ev.req.n) { return false; }
    grant(ev.reward, '이벤트 · ' + ev.name);
    q.eventIdx++;
    return true;
  }

  function checkRandom() {
    var q = qs();
    if (!q.random || q.random.have < q.random.req.n) { return false; }
    grant(q.random.reward, '현상 · ' + q.random.name);
    q.random = rollRandom();
    return true;
  }

  /* ── 무작위 뽑기 ──────────────────────────────────────────── */

  function rollRandom() {
    var C = core();
    var tpl = C.pick(QD().RANDOM_POOL);
    var n = Math.round(tpl.req.lo + Math.random() * (tpl.req.hi - tpl.req.lo));
    var req = { t: tpl.req.t, n: Math.max(1, n) };
    if (tpl.req.tag) { req.tag = tpl.req.tag; }
    if (tpl.req.room) { req.room = tpl.req.room; }
    return {
      name: tpl.name, desc: tpl.descOf(req.n), req: req, have: 0,
      reward: { gold: 40 * req.n + 15, exp: 5 * req.n + 5 }
    };
  }

  function ensureRandom() {
    var q = qs();
    if (!q.random) { q.random = rollRandom(); }
  }

  /** 화면의 "다시 뽑기" — 그때까지 채운 것은 버린다(현상판을 바꿔 붙이는 셈) */
  function reroll() {
    qs().random = rollRandom();
    core().emit('changed');
  }

  /* ── 사건을 듣는다 ────────────────────────────────────────── */

  function killMatches(req, e) {
    if (req.tag === 'elite') { return !!e.elite; }
    if (req.tag === 'boss') { return !!e.boss; }
    return true;
  }

  function onKill(payload) {
    if (!payload || !payload.e) { return; }
    var e = payload.e, floor = payload.floor, q = qs(), changed = false;

    var m = QD().MAIN[q.mainIdx];
    if (m && m.req.t === 'kill' && killMatches(m.req, e)) {
      q.mainHave++;
      changed = checkMain() || changed;
    }

    unlockRegions();
    var ri = regionIndexOf(floor);
    var rq = q.region[ri];
    if (rq && !rq.done) {
      rq.have++;
      changed = checkRegion(ri) || changed;
    }

    /* 무작위 현상판은 **화면을 열어야** 처음 뽑힌다(status() 가 그때 굴린다) —
       여기서 미리 굴리면 전투 도중 아무 때나 Math.random() 을 하나 더 잡아먹어
       그 뒤로 뽑히는 모든 것(장비 롤 포함)이 밀린다. 실제로 그렇게 밀려서
       "원소 — 무기에 박으면…" 진단이 애먼 자리에서 넘어진 적이 있다(전설
       + 고유 판정까지 밀렸다). 화면을 아직 한 번도 안 열었으면 그냥 넘어간다. */
    if (q.random && q.random.req.t === 'kill' && killMatches(q.random.req, e)) {
      q.random.have++;
      changed = checkRandom() || changed;
    }

    if (changed) { core().emit('changed'); }
  }

  function onRoom(room) {
    if (!room) { return; }
    var q = qs(), changed = false;

    var m = QD().MAIN[q.mainIdx];
    if (m && m.req.t === 'discover' && m.req.room === room.kind) {
      q.mainHave = Math.max(q.mainHave, m.req.n);
      changed = checkMain() || changed;
    }

    if (q.random && q.random.req.t === 'discover' && q.random.req.room === room.kind) {
      q.random.have = Math.max(q.random.have, q.random.req.n);
      changed = checkRandom() || changed;
    }

    if (changed) { core().emit('changed'); }
  }

  function onFloor(floor) {
    unlockRegions();
    var q = qs(), changed = false;

    var m = QD().MAIN[q.mainIdx];
    if (m && m.req.t === 'floor' && floor >= m.req.n) {
      q.mainHave = m.req.n;
      changed = checkMain() || changed;
    }

    if (changed) { core().emit('changed'); }
  }

  function onRescue() {
    var q = qs(), changed = false;

    var ev = QD().EVENT[q.eventIdx];
    if (ev) {
      q.eventHave++;
      changed = checkEvent() || changed;
    }

    if (changed) { core().emit('changed'); }
  }

  global.DG = global.DG || {};
  core().on('dungeon:kill', onKill);
  core().on('dungeon:room', onRoom);
  core().on('dungeon:floor', onFloor);
  core().on('dungeon:rescue', onRescue);

  /* ── 화면이 읽어 가는 것 ──────────────────────────────────── */

  function status() {
    unlockRegions();
    var q = qs(), THEMES = DD().THEMES;
    var m = QD().MAIN[q.mainIdx];
    var regions = [], i;
    for (i = 0; i < THEMES.length; i++) {
      var rq = q.region[i];
      if (!rq) { regions.push({ locked: true, name: THEMES[i].name }); continue; }
      var def = QD().regionQuest(i, THEMES[i].name);
      regions.push({
        locked: false, done: rq.done, name: def.name, desc: def.desc,
        have: Math.min(rq.have, def.req.n), need: def.req.n
      });
    }
    var ev = QD().EVENT[q.eventIdx];
    ensureRandom();
    return {
      main: m ? { name: m.name, desc: m.desc, have: Math.min(q.mainHave, m.req.n), need: m.req.n }
              : null,
      mainDone: q.mainIdx >= QD().MAIN.length,
      mainIdx: q.mainIdx, mainTotal: QD().MAIN.length,
      regions: regions,
      event: ev ? { name: ev.name, desc: ev.desc, have: Math.min(q.eventHave, ev.req.n), need: ev.req.n }
                : null,
      eventDone: q.eventIdx >= QD().EVENT.length,
      random: { name: q.random.name, desc: q.random.desc,
                have: Math.min(q.random.have, q.random.req.n), need: q.random.req.n }
    };
  }

  global.DG.quest = {
    status: status, reroll: reroll,
    /** 자가진단용 — 사건을 직접 흘려본다 */
    _onKill: onKill, _onRoom: onRoom, _onFloor: onFloor, _onRescue: onRescue,
    _regionIndexOf: regionIndexOf
  };
})(window);
