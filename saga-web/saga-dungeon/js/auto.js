/**
 * 자동 순회 — 던전을 대신 돌아 준다
 * ---------------------------------------------------------------
 * 지도를 걷는 게임(deungyong-go)의 auto.js 에서 던전 부분만 떼어 왔다.
 * 원칙은 그대로다: **규칙을 새로 만들지 않는다.** 목표만 고르고 조작은
 * dungeon.js 의 공개 함수(moveTo · castSkill · goRoom · pickBoon · answerQuiz · leave)로
 * 넣는다. 그래서 손으로 할 때와 기대값이 어긋나지 않는다.
 *
 * 화면을 보고 있는 동안에만 돈다(requestAnimationFrame).
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  var FLAGS = [
    { key: 'grow', name: '승급 · 장비', emoji: '✨',
      desc: '승급 조건을 채운 인물을 올리고, 노획 장비를 갈아입힌다' },
    { key: 'retry', name: '다시 들어가기', emoji: '🔁',
      desc: '나오거나 쓰러지면 잠시 뒤 다시 내려간다' }
  ];

  var acc = { grow: 0, dg: 0, retry: 0 };
  var doing = '';
  var lastLog = 0;

  /* 세이브의 자동 설정. **빠진 칸은 채워 넣는다** — 옛 세이브나 다른 게임에서 넘어온
     모양이면 칸이 없어서 기능이 조용히 꺼진 것처럼 보인다(실제로 그렇게 헤맸다). */
  var DEFAULTS = { on: false, grow: true, retry: true };

  function st() {
    var s = core.save, k;
    if (!s.auto) { s.auto = {}; }
    for (k in DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, k) && s.auto[k] === undefined) {
        s.auto[k] = DEFAULTS[k];
      }
    }
    return s.auto;
  }

  function on(flag) { return !!st()[flag]; }
  function active() { return !!st().on; }

  function flagByKey(k) {
    for (var i = 0; i < FLAGS.length; i++) { if (FLAGS[i].key === k) { return FLAGS[i]; } }
    return null;
  }

  function setOn(v) {
    var s = st();
    v = !!v;
    if (s.on === v) { return v; }
    s.on = v;
    doing = v ? '내려갈 준비' : '';
    core.log(v ? '🤖 자동 순회를 켰다' : '🤖 자동 순회를 껐다', 'info');
    core.emit('toast', v ? '🤖 자동 순회 시작' : '⏸️ 자동 순회 정지');
    core.emit('changed');
    core.persist();
    return v;
  }

  function toggle() { return setOn(!st().on); }

  function toggleFlag(key) {
    if (!flagByKey(key)) { return false; }
    var s = st();
    s[key] = !s[key];
    core.emit('changed');
    core.persist();
    return !!s[key];
  }

  /* ── 승급 · 장비 ──────────────────────────────────────── */

  function autoRankUp() {
    var ids = Object.keys(core.save.dex.heroes), best = null, bestR = -1, i;
    for (i = 0; i < ids.length; i++) {
      var chk = global.DG.hero.rankUpCheck(ids[i]);
      if (!chk.ok) { continue; }
      var h = global.DG.data.find(ids[i]);
      var score = h ? h.rarity : 0;
      if (score > bestR) { bestR = score; best = ids[i]; }
    }
    if (best) { global.DG.hero.rankUp(best); return true; }
    return false;
  }

  function tickGrow(dt) {
    acc.grow += dt;
    if (acc.grow < 6) { return; }
    acc.grow = 0;
    autoRankUp();
    if (global.DG.item) {
      global.DG.item.autoEquip();
      global.DG.item.autoClean();
    }
  }

  /* ── 던전 ─────────────────────────────────────────────── */

  /** 은사 점수 — 오래 버티는 쪽을 먼저 집는다 */
  var BOON_SCORE = {
    wall: 100, fury: 92, drain: 88, haste: 84, ghost: 80, ward: 78,
    crit: 70, pierce: 66, reach: 60, mend: 58, dash: 50, greed: 40, eye: 36, scout: 20
  };

  /** 다음 방 우선순위 — 체력이 깎였으면 우물부터 */
  function doorScore(kind, hpRatio) {
    if (kind === 'stair') { return 55; }
    if (kind === 'well') { return hpRatio < 0.7 ? 200 : 30; }
    if (kind === 'trove') { return 90; }
    if (kind === 'shrine') { return 80; }
    return 50;
  }

  function nearestOf(list, p) {
    var best = null, bd = 1e9;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o.hp !== undefined && o.hp <= 0) { continue; }
      var d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d < bd) { bd = d; best = o; }
    }
    return best ? { o: best, d: bd } : null;
  }

  function fightSkills(run, near) {
    var D = global.DG.dungeon;
    var p = run.player, room = run.room, i, alive = 0, close = 0;
    for (i = 0; i < room.enemies.length; i++) {
      var e = room.enemies[i];
      if (e.hp <= 0) { continue; }
      alive++;
      if (Math.hypot(e.x - p.x, e.y - p.y) < 80) { close++; }
    }
    if (!alive) { return; }
    if (close >= 2) { D.castSkill(0); }            // 회전참 — 몰려 있을 때
    D.castSkill(3);                                 // 사기 — 되면 항상
    if (near && near.d > 90) { D.castSkill(2); }   // 기공파 — 멀리 있는 놈에게
    if (near && near.d > 150) { D.castSkill(1); }  // 돌진 — 거리를 좁힌다
  }

  function countAlive(room) {
    var n = 0;
    for (var i = 0; i < room.enemies.length; i++) { if (room.enemies[i].hp > 0) { n++; } }
    return n;
  }

  function tickDungeon(dt) {
    var D = global.DG.dungeon;
    var run = D.raw();                              // 읽기만 한다 (화면과 같은 방식)
    if (!run) { return; }
    var p = run.player;
    var hpRatio = run.hpMax ? run.hp / run.hpMax : 1;

    if (run.choice) {                               // 은사 고르기
      var bestKey = null, bs = -1;
      for (var i = 0; i < run.choice.length; i++) {
        var sc = BOON_SCORE[run.choice[i]] || 40;
        if (sc > bs) { bs = sc; bestKey = run.choice[i]; }
      }
      if (bestKey) { D.pickBoon(bestKey); }
      doing = '🎴 은사를 고르는 중';
      return;
    }

    /* 위험하면 **먼저 마신다** — 원작에서 사람이 하는 첫 동작이다.
       탈출은 마실 것이 다 떨어졌을 때의 마지막 수단이지, 첫 수단이 아니다.
       작은 것부터 쓴다(potion.useBest) — 큰 것을 아껴 둔다. */
    var P = global.DG.potion;
    if (P && hpRatio < 0.45) {
      if (P.useBest('hp').ok) { doing = '🍶 단약을 마시는 중'; return; }
    }
    if (P) {
      /* 기력은 급하지 않으니 마시고 나서 하던 일을 이어 간다 (return 하지 않는다) */
      var stt = D.status();
      if (stt.mpMax && stt.mp / stt.mpMax < 0.2) { P.useBest('mp'); }
    }

    /* 마실 것도 없이 위험하면 나온다 — 노획물을 지키는 쪽이 이득이다 */
    if (hpRatio < 0.22 && !(run.room.well && !run.room.well.used)) {
      doing = '🚪 체력이 낮아 탈출';
      D.leave();
      return;
    }

    var room = run.room;
    var near = nearestOf(room.enemies, p);

    if (near) {
      var ux = (near.o.x - p.x) / near.d, uy = (near.o.y - p.y) / near.d;
      var stop = near.o.r + 18;
      D.moveTo(near.o.x - ux * stop, near.o.y - uy * stop);
      fightSkills(run, near);
      doing = '⚔️ 제' + run.floor + '층 · 남은 적 ' + countAlive(room) + '마리';
      return;
    }

    var drop = nearestOf(room.drops, p);
    if (drop) {
      D.moveTo(drop.o.x, drop.o.y);
      doing = '💰 노획물 수습';
      return;
    }

    var obj = null;
    if (room.well && !room.well.used && hpRatio < 0.98) { obj = room.well; }
    else if (room.chest && !room.chest.taken) { obj = room.chest; }
    else if (room.shrine && !room.shrine.used) { obj = room.shrine; }
    if (obj) {
      D.moveTo(obj.x, obj.y);
      doing = '🔎 방을 둘러보는 중';
      return;
    }

    acc.dg += dt;
    if (acc.dg >= 0.6) {
      acc.dg = 0;
      var doors = room.doors || [], pickKind = null, ps = -1;
      for (var j = 0; j < doors.length; j++) {
        var s2 = doorScore(doors[j].kind, hpRatio);
        if (s2 > ps) { ps = s2; pickKind = doors[j].kind; }
      }
      if (pickKind) {
        D.goRoom(pickKind);
        doing = '🚪 다음 방으로 (' + pickKind + ')';
      }
    }
  }

  /** 본영에 있을 때 — 다시 내려간다 */
  function tickEntry(dt) {
    if (!on('retry')) { doing = '🏯 본영에서 대기 (다시 들어가기 꺼짐)'; return; }
    acc.retry += dt;
    if (acc.retry < 4) { doing = '🕳️ 다시 내려갈 준비'; return; }
    acc.retry = 0;
    if (!core.save.party.length) {
      doing = '⚠️ 동행이 없어 내려갈 수 없습니다';
      return;
    }
    var s = global.DG.dungeon.status();
    var floor = s.best >= 2 ? Math.max(1, Math.floor(s.best / 2)) : 1;
    global.DG.dungeon.enter({ floor: floor });
  }

  function update(dt) {
    if (!active()) { return; }
    if (global.DG.dungeon.active()) { tickDungeon(dt); }
    else { tickEntry(dt); }
    if (on('grow')) { tickGrow(dt); }
  }

  function status() {
    return { on: active(), doing: doing, flags: st() };
  }

  global.DG = global.DG || {};
  global.DG.auto = {
    FLAGS: FLAGS, flagByKey: flagByKey,
    state: st, active: active, on: on,
    setOn: setOn, toggle: toggle, toggleFlag: toggleFlag,
    update: update, status: status,
    /** 자가진단용 */
    _tickDungeon: tickDungeon, _tickEntry: tickEntry,
    _autoRankUp: autoRankUp
  };
})(window);
