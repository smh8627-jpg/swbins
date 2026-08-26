/**
 * 자동 순행(自動巡行) — 손으로 못 걸을 때 대신 굴려 주는 조종사
 * ---------------------------------------------------------------
 * 이 게임은 원래 "걸어야" 돌아간다. 그런데 사무실·집에 앉아 있는 동안에는
 * 걸을 수가 없다. 그래서 **판단만 대신하는 층**을 하나 얹었다.
 *
 * 규칙을 새로 만들지 않는 것이 이 파일의 첫째 원칙이다.
 * 걷기·조우·문답·던전의 규칙은 각 모듈에 그대로 두고, 여기서는
 * "무엇을 목표로 삼을지" 고르고 **원래 있던 공개 함수만 부른다**:
 *
 *   지도    world.walkTo()          — 손으로 탭하는 것과 같은 길
 *           encounter.autoResolve() — 미니게임 확률을 그대로 굴린다
 *
 * 그래서 자동으로 얻는 기대값이 손으로 하는 것과 어긋나지 않는다.
 *
 * 일부러 자동화하지 않은 것
 *   - **실제 위치(GPS)** 는 대신 걸을 수 없다. 자동을 켜면 키보드 이동으로
 *     바꾼다 — 위치 공급자를 흉내 내는 것보다 정직하다.
 *
 * 화면을 보고 있는 동안에만 돈다(requestAnimationFrame). 창을 덮어 두면
 * 멈춘다 — 방치 수익을 새로 만들지 않기 위해 일부러 이렇게 뒀다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  /* 무엇을 자동으로 할지 — 화면에서 켜고 끈다 */
  var FLAGS = [
    { key: 'meet', name: '등용 · 포획', emoji: '🤝',
      desc: '사거리 안의 대상을 미니게임 확률대로 상대한다' },
    { key: 'grow', name: '승급 · 장비', emoji: '✨',
      desc: '승급 조건을 채운 인물을 올리고, 노획 장비를 갈아입힌다' },
    { key: 'omen', name: '길조 유지', emoji: '🔮',
      desc: '온라인일 때 천기를 물어 보정을 이어 붙인다 (토큰 소모)' },
    { key: 'stop', name: '역참 들르기', emoji: '🏮',
      desc: '채워진 역참으로 걸어가 보급을 받고, 점거된 역참은 이길 만하면 물린다' },
    { key: 'fort', name: '성채 공략', emoji: '🏯',
      desc: '이길 만한 성채에 도전하고, 점령한 성채의 공물을 걷는다' }
  ];

  /* 걷기 목표를 다시 정하는 간격 — 대상이 배회하므로 계속 따라간다 */
  var RETARGET = 0.45;
  var PATROL_MIN = 90, PATROL_MAX = 260;   // 순행 목표 거리 (m)

  var acc = { aim: 0, meet: 0, grow: 0, omen: 0, stop: 0, fort: 0 };
  var patrol = null;                       // 순행 목표 {x, y}
  var aimUid = null;                       // 지금 쫓는 대상
  var doing = '';                          // 화면에 보여 줄 한 줄
  var lastLog = 0;

  var DEFAULTS = { on: false, meet: true, grow: true, omen: false, stop: true, fort: true };

  function st() {
    var s = core.save;
    /* 빠진 칸은 채워 넣는다 — 옛 세이브에는 없던 칸이 있다 */
    if (!s.auto) { s.auto = {}; }
    var k;
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

  /* ── 켜고 끄기 ────────────────────────────────────────── */

  function setOn(v) {
    var s = st();
    v = !!v;
    if (s.on === v) { return v; }
    s.on = v;
    if (v) {
      /* 실제 위치로는 대신 걸을 수 없다 — 키보드 이동으로 돌려놓는다 */
      if (global.DG.world.mode === 'geo') {
        global.DG.world.useKeyboard();
        core.emit('toast', '🤖 자동 순행 — 실제 위치 대신 지도 위를 걷습니다');
      } else {
        core.emit('toast', '🤖 자동 순행 시작');
      }
      core.log('🤖 자동 순행을 켰다', 'info');
      patrol = null; aimUid = null; doing = '길을 고르는 중…';
    } else {
      doing = '';
      core.log('🤖 자동 순행을 껐다', 'info');
      core.emit('toast', '⏸️ 자동 순행 정지');
    }
    core.emit('changed');
    core.persist();
    return v;
  }

  function toggle() { return setOn(!st().on); }

  function toggleFlag(key) {
    var s = st();
    if (!flagByKey(key)) { return false; }
    s[key] = !s[key];
    core.emit('changed');
    core.persist();
    return !!s[key];
  }

  /* ── 지도 ─────────────────────────────────────────────── */

  /** 이 대상을 상대할 밑천이 있나 */
  function affordable(spawn) {
    if (spawn.kind === 'hero') {
      return core.save.items.scroll >= 1 &&
             core.save.player.fame >= spawn.ref.rarity * 12;
    }
    return core.save.items.feed >= 1;
  }

  /**
   * 목표 고르기 — 귀한 대상을 앞세우되 거리를 깎는다.
   * 도감에 없는 것은 크게 얹는다(도감을 채우는 게 본편의 목적이므로).
   */
  function scoreSpawn(s, pos) {
    var d = Math.hypot(s.x - pos.x, s.y - pos.y);
    var dex = s.kind === 'hero' ? core.save.dex.heroes : core.save.dex.pets;
    var fresh = !dex[s.ref.id];
    return s.ref.rarity * 12 + (fresh ? 40 : 0) - d * 0.14;
  }

  function bestTarget() {
    var pos = core.save.player.pos;
    var list = global.DG.world.spawns, best = null, bs = -1e9;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!affordable(s)) { continue; }
      var sc = scoreSpawn(s, pos);
      if (sc > bs) { bs = sc; best = s; }
    }
    return best;
  }

  /**
   * 지금 갈 만한 역참 — 채워져 있는 것 중 가장 가까운 것.
   * 원작에서 볼이 떨어지면 스탑을 돌러 가는 그 행동이다.
   */
  function bestStation() {
    var list = global.DG.world.stationsNear(), stn = global.DG.station;
    var R = global.DG.rogue;
    for (var i = 0; i < list.length; i++) {
      /* 점거된 역참은 보급을 주지 않는다 — 밑천을 채우러 갈 자리가 아니다.
         물리치는 것은 아래 사거리 갈래가 따로 판단한다(이길 만할 때만 붙는다) */
      if (R && R.occupied(list[i])) { continue; }
      if (stn.stateOf(list[i].key).ready) { return list[i]; }
    }
    return null;
  }

  /** 밑천이 없으면 걷는다 — 250m 마다 보급이 들어오므로 이게 회복 수단이다 */
  function repatrol() {
    var pos = core.save.player.pos;
    var ang = Math.random() * Math.PI * 2;
    var d = PATROL_MIN + Math.random() * (PATROL_MAX - PATROL_MIN);
    patrol = { x: pos.x + Math.cos(ang) * d, y: pos.y + Math.sin(ang) * d };
  }

  function tickMap(dt) {
    var w = global.DG.world;
    if (global.DG.encounter.active) { doing = '조우 화면이 열려 있습니다'; return; }

    acc.aim += dt;
    if (acc.aim >= RETARGET) {
      acc.aim = 0;
      var t = bestTarget();
      if (t) {
        aimUid = t.uid;
        patrol = null;
        w.walkTo(t.x, t.y);
        var dist = Math.hypot(t.x - core.save.player.pos.x, t.y - core.save.player.pos.y);
        doing = (t.kind === 'hero' ? '🤝 ' : '🐾 ') + t.ref.name +
          '(' + global.DG.data.rarity[t.ref.rarity].label + ') 으로 ' + Math.round(dist) + 'm';
      } else {
        aimUid = null;
        var pos = core.save.player.pos;
        /* 상대할 대상이 없다 = 밑천이 없다는 뜻이 대부분이다.
           채워진 역참이 있으면 순행보다 그쪽이 빠르다. */
        var stt = on('stop') ? bestStation() : null;
        if (stt) {
          patrol = null;
          w.walkTo(stt.x, stt.y);
          doing = '🏮 ' + stt.name + ' 으로 ' +
            Math.round(Math.hypot(stt.x - pos.x, stt.y - pos.y)) + 'm — 보급을 받으러';
        } else {
          if (!patrol || Math.hypot(patrol.x - pos.x, patrol.y - pos.y) < 8) { repatrol(); }
          w.walkTo(patrol.x, patrol.y);
          doing = '🚶 순행 — 보급을 모으는 중 (📜' + core.save.items.scroll +
            ' 🍖' + core.save.items.feed + ')';
        }
      }
    }

    /* 사거리 안의 성채 — 이길 만하면 도전하고, 내 것이면 공물을 걷는다 */
    acc.fort += dt;
    if (on('fort') && acc.fort >= 2.2) {
      acc.fort = 0;
      var nf = w.nearestFort();
      if (nf && nf.inRange) {
        /* 적장이 들었으면 성채보다 그쪽이 먼저다 */
        var rd = global.DG.raid.current(nf.fort);
        if (rd) {
          var rr = global.DG.raid.autoFight(rd);
          if (rr) {
            core.emit('toast', '⚔️ ' + rd.hero.name +
              (rr.win ? (rr.caught ? ' 격파·등용!' : ' 격파!') : ' 격파 실패'));
          }
          return;
        }
        var act = global.DG.fort.autoAct(nf.fort);
        if (act && act.did === 'fight') {
          core.emit('toast', '🏯 ' + nf.fort.name + (act.win ? ' 점령!' : ' 공략 실패'));
        } else if (act && act.did === 'collect') {
          core.emit('toast', '🏯 ' + nf.fort.name + ' 공물 🪙 +' + act.gold);
        }
      }
    }

    /* 지나는 길에 채워진 역참이 있으면 들른다 (밑천이 넉넉해도 원작처럼 줍고 간다) */
    acc.stop += dt;
    if (on('stop') && acc.stop >= 1.3) {
      acc.stop = 0;
      var ns = w.nearestStation();
      if (ns && ns.inRange) {
        /* 적도가 들어 있으면 보급보다 그쪽이 먼저다 — 이길 만할 때만 붙는다.
           (성채에서 적장이 성채보다 먼저인 것과 같은 손) */
        var R = global.DG.rogue;
        var rg = R ? R.at(ns.station) : null;
        if (rg) {
          var rres = R.autoFight(rg);
          if (rres) {
            core.emit('toast', '🏴 ' + rg.station.name +
              (rres.win ? ' 탈환! · 🌑 ' + rres.dark.name + ' 이(가) 남았다' : ' 탈환 실패'));
          }
          return;
        }
        if (global.DG.station.stateOf(ns.station.key).ready) {
          var got = global.DG.station.autoVisit(ns.station);
          if (got.ok) {
            core.emit('toast', '🏮 ' + got.name + ' — 📜 +' + got.reward.scroll +
              ' · 🍖 +' + got.reward.feed + ' · 🪙 +' + got.reward.gold);
          }
        }
      }
    }

    /* 사거리 안이면 상대한다 — 확률은 미니게임 규칙 그대로 */
    acc.meet += dt;
    if (on('meet') && acc.meet >= 1.1) {
      acc.meet = 0;
      var n = w.nearest();
      if (n && n.inRange && affordable(n.spawn)) {
        global.DG.encounter.autoResolve(n.spawn);
      }
    }
  }

  /* ── 승급 · 장비 ──────────────────────────────────────── */

  /** 승급 조건을 채운 인물 중 등급이 높은 쪽부터 한 명 */
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
    /* 받아만 둔 천거장은 걸어도 줄지 않는다 — 빈 칸이 있으면 채워 둔다 */
    global.DG.letter.autoFill();
  }

  /* ── 길조 유지 ────────────────────────────────────────── */

  function tickOmen(dt) {
    acc.omen += dt;
    if (acc.omen < 30) { return; }
    acc.omen = 0;
    if (!global.DG.net.online()) { return; }
    if (global.DG.ai.buffLeft() > 30) { return; }     // 아직 살아 있으면 아낀다
    global.DG.ai.omen();
  }

  /* ── 매 프레임 ────────────────────────────────────────── */

  function update(dt) {
    if (!active()) { return; }
    tickMap(dt);
    if (on('grow')) { tickGrow(dt); }
    if (on('omen')) { tickOmen(dt); }
  }

  function status() {
    return {
      on: active(), doing: doing,
      flags: st(),
      aim: aimUid
    };
  }

  global.DG = global.DG || {};
  global.DG.auto = {
    FLAGS: FLAGS, flagByKey: flagByKey,
    state: st, active: active, on: on,
    setOn: setOn, toggle: toggle, toggleFlag: toggleFlag,
    update: update, status: status,
    /** 자가진단용 — 한 판단만 굴려 본다 */
    _tickMap: tickMap, _autoRankUp: autoRankUp
  };
})(window);
