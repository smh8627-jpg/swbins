/**
 * 사명 — 받고, 채우고, 바친다
 * ---------------------------------------------------------------
 * 원작의 퀘스트가 그렇듯 셋으로 돈다: **받는다 → 채운다 → 바친다.**
 * 받지 않은 사명은 세어 주지 않는다(원작도 그렇다).
 *
 * 세이브
 *   save.quests = { key: { taken: 시각, n: 센 수, done: 바친 횟수 } }
 *
 * **세는 방법이 둘이다.**
 *   쌓이는 것(kill·boss) — 받은 뒤부터 알림('side:kill')을 듣고 하나씩 센다
 *   보는 것(gear·skill·gold·level) — 셀 것이 없다. **물어볼 때마다 지금 값을 본다**
 * 뒤엣것을 굳이 세어 두면 장비를 벗었다 껴도 수가 남아 어긋난다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var QD = global.DG.questData;

  function st() {
    var s = core.save;
    if (!s.quests) { s.quests = {}; }
    return s.quests;
  }

  function rec(key) {
    var q = st();
    if (!q[key]) { q[key] = { taken: 0, n: 0, done: 0 }; }
    return q[key];
  }

  function taken(key) { return !!rec(key).taken; }
  function doneCount(key) { return rec(key).done || 0; }

  /* ── 일일 사명(PLAN 33절) ─────────────────────────────────
   * 되받는 사명(repeat)은 바치자마자 다시 받을 수 있는데, 일일 사명은
   * **하루에 한 번**만 — turnIn() 이 남긴 lastDoneDay 가 오늘과 같으면 잠긴다.
   * 실제 시각이 아니라 로컬 달력의 '그 날'만 본다(자정에 넘어간다). */
  function todayKey(t) {
    var d = new Date(t || Date.now());
    return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
  }
  function doneToday(key) { return rec(key).lastDoneDay === todayKey(); }

  /* ── 지금 얼마나 찼나 ─────────────────────────────────── */

  /** 보는 것 — 세어 두지 않고 그때그때 읽는다 */
  function look(goal) {
    var G = global.DG.gear, J = global.DG.job;
    if (goal.type === 'gear') {
      if (!G) { return 0; }
      var e = G.equipped(), n = 0, k;
      for (k in e) { if (Object.prototype.hasOwnProperty.call(e, k)) { n++; } }
      return n;
    }
    if (goal.type === 'skill') { return J ? J.spSpent() : 0; }
    if (goal.type === 'gold') { return core.save.player.gold; }
    if (goal.type === 'level') { return core.save.player.level; }
    return -1;                                  // 쌓이는 것
  }

  function progress(key) {
    var def = QD.find(key);
    if (!def) { return 0; }
    var seen = look(def.goal);
    return seen >= 0 ? seen : (rec(key).n || 0);
  }

  function full(key) {
    var def = QD.find(key);
    return !!def && progress(key) >= def.goal.n;
  }

  /* ── 목록 ─────────────────────────────────────────────── */

  /** 지금 화면에 보일 사명들 — 레벨이 되면 뜨고, 한 번뿐인 것은 바치면 사라진다 */
  function list() {
    var lv = core.save.player.level, out = [];
    for (var i = 0; i < QD.QUESTS.length; i++) {
      var d = QD.QUESTS[i];
      if (lv < d.need) { continue; }
      if (!d.repeat && doneCount(d.key) > 0) { continue; }
      out.push({
        ref: d, taken: taken(d.key), n: progress(d.key), goal: d.goal.n,
        full: taken(d.key) && full(d.key), done: doneCount(d.key),
        lockedToday: !!d.daily && doneToday(d.key)
      });
    }
    return out;
  }

  /* ── 받기 · 바치기 ────────────────────────────────────── */

  /** 소리 한 번 — sfx.js 가 없어도 규칙은 그대로 돈다(진단·데모가 그렇다) */
  function sfx(key) {
    var S = global.DG.sfx;
    if (S) { S.play(key); }
  }

  function take(key) {
    var d = QD.find(key);
    if (!d) { return false; }
    if (core.save.player.level < d.need) {
      core.emit('toast', '⚠️ Lv.' + d.need + ' 부터입니다');
      return false;
    }
    if (taken(key)) { return false; }
    if (d.daily && doneToday(key)) {
      core.emit('toast', '⚠️ 오늘은 이미 받았습니다 — 자정이 지나면 다시');
      return false;
    }
    var r = rec(key);
    r.taken = Date.now();
    r.n = 0;                                    // 받은 뒤부터 센다
    r.visited = null;                           // 'visit' 전용 — 밟은 사냥터 집합도 새로 센다
    sfx('quest');
    core.log('📋 사명을 받았다 — ' + d.name, 'info');
    core.emit('changed');
    core.persist();
    return true;
  }

  /** 바친다 — 조건을 채웠으면 보상을 준다 */
  function turnIn(key) {
    var d = QD.find(key);
    if (!d || !taken(key)) { return false; }
    if (!full(key)) { core.emit('toast', '⚠️ 아직 채우지 못했습니다'); return false; }
    var r = rec(key);
    r.done = (r.done || 0) + 1;
    r.taken = 0;
    r.n = 0;
    if (d.daily) { r.lastDoneDay = todayKey(); }

    var rw = d.reward || {}, bits = [];
    if (rw.exp) { core.gainExp(rw.exp); bits.push('경험치 ' + core.fmt(rw.exp)); }
    if (rw.gold) { core.save.player.gold += rw.gold; bits.push('🪙 ' + core.fmt(rw.gold)); }
    if (rw.potion) {
      global.DG.side.state().potions += rw.potion;
      bits.push('🧪 ' + rw.potion);
    }
    if (rw.scroll && global.DG.gear) {
      global.DG.gear.addScroll(rw.scroll, 1);
      bits.push('📜 ' + global.DG.gearData.scroll(rw.scroll).name);
    }
    if (rw.gear && global.DG.gear) {
      global.DG.gear.put(global.DG.gear.make(rw.gear));
      bits.push('📦 ' + global.DG.gearData.find(rw.gear).name);
    }
    core.gainFeat(6 + Math.round(d.need / 2), '사명');
    sfx('questdone');
    core.log('📋 ' + d.name + ' 을(를) 마쳤다 — ' + bits.join(' · '), 'good');
    core.emit('toast', '📋 ' + d.name + ' 완수!');
    core.emit('questdone', d.name);   // 화면 배너(PLAN 35절) — js/side.js 가 받는다
    core.emit('changed');
    core.persist();
    return true;
  }

  /* ── 쌓이는 것 세기 ───────────────────────────────────── */

  function onKill(info) {
    var q = st(), i;
    for (i = 0; i < QD.QUESTS.length; i++) {
      var d = QD.QUESTS[i];
      if (!taken(d.key)) { continue; }
      var g = d.goal;
      if (g.type === 'kill') {
        if (g.stage && g.stage !== info.stage) { continue; }
        rec(d.key).n += 1;
      } else if (g.type === 'boss' && info.boss) {
        rec(d.key).n += 1;
      }
    }
    void q;
  }

  /** 채집(PLAN 15절 "아이템 수집") — side.js 가 캘 때마다 알린다 */
  function onGather(info) {
    for (var i = 0; i < QD.QUESTS.length; i++) {
      var d = QD.QUESTS[i];
      if (!taken(d.key) || d.goal.type !== 'gather') { continue; }
      if (d.goal.kind && d.goal.kind !== info.kind) { continue; }
      rec(d.key).n += 1;
    }
  }

  /** 사냥터 밟기(PLAN 15절 "특정 장소 방문·탐험") — 처음 밟는 곳만 센다.
   *  세는 방법이 kill·gather 와 다르다: 같은 곳을 두 번 밟아도 늘지 않아야 해서
   *  집합(record.visited)에 넣어 두고 그 크기를 잰다. */
  function onStage(run) {
    if (!run || !run.stage) { return; }
    var key = run.stage.key;
    for (var i = 0; i < QD.QUESTS.length; i++) {
      var d = QD.QUESTS[i];
      if (!taken(d.key) || d.goal.type !== 'visit') { continue; }
      var r = rec(d.key);
      if (!r.visited) { r.visited = {}; }
      if (!r.visited[key]) {
        r.visited[key] = true;
        r.n = Object.keys(r.visited).length;
      }
    }
  }

  /** 말 걸기(PLAN 15절 "NPC 대화") — 마을 사람 아무나 말을 걸 때마다 센다 */
  function onTalk(info) {
    for (var i = 0; i < QD.QUESTS.length; i++) {
      var d = QD.QUESTS[i];
      if (!taken(d.key) || d.goal.type !== 'talk') { continue; }
      rec(d.key).n += 1;
    }
    void info;
  }

  var bound = false;
  function init() {
    if (bound) { return; }
    bound = true;
    core.on('side:kill', onKill);
    core.on('side:gather', onGather);
    core.on('side:enter', onStage);
    core.on('side:travel', onStage);
    core.on('side:talk', onTalk);
  }

  global.DG = global.DG || {};
  global.DG.quest = {
    state: st, init: init,
    list: list, take: take, turnIn: turnIn,
    taken: taken, progress: progress, full: full, doneCount: doneCount,
    _onKill: onKill, _onGather: onGather, _onStage: onStage, _onTalk: onTalk,
    /** 진단 전용 — 일일 사명(PLAN 33절)의 '오늘' 표기. 실제 시각 없이도
     *  세이브에 이 문자열을 직접 넣어 "이미 오늘 했다"를 흉내낼 수 있다 */
    _todayKey: todayKey, doneToday: doneToday
  };
})(window);
