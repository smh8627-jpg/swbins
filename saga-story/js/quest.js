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
        full: taken(d.key) && full(d.key), done: doneCount(d.key)
      });
    }
    return out;
  }

  /* ── 받기 · 바치기 ────────────────────────────────────── */

  function take(key) {
    var d = QD.find(key);
    if (!d) { return false; }
    if (core.save.player.level < d.need) {
      core.emit('toast', '⚠️ Lv.' + d.need + ' 부터입니다');
      return false;
    }
    if (taken(key)) { return false; }
    var r = rec(key);
    r.taken = Date.now();
    r.n = 0;                                    // 받은 뒤부터 센다
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
    core.log('📋 ' + d.name + ' 을(를) 마쳤다 — ' + bits.join(' · '), 'good');
    core.emit('toast', '📋 ' + d.name + ' 완수!');
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

  var bound = false;
  function init() {
    if (bound) { return; }
    bound = true;
    core.on('side:kill', onKill);
  }

  global.DG = global.DG || {};
  global.DG.quest = {
    state: st, init: init,
    list: list, take: take, turnIn: turnIn,
    taken: taken, progress: progress, full: full, doneCount: doneCount,
    _onKill: onKill
  };
})(window);
