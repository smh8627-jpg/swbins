/**
 * 자동 마을살이 — 대신 돌아다니며 모으고 나눠 준다
 * ---------------------------------------------------------------
 * 다른 게임의 auto.js 와 같은 원칙이다: **규칙을 새로 만들지 않는다.**
 * village.js 의 공개 함수(walkTo · interact · sellAll)만 부른다.
 * 그래서 손으로 할 때와 얻는 것이 어긋나지 않는다.
 *
 * 고르는 순서
 *   1) 부탁을 채운 주민   — 건네주면 금·친밀도가 가장 크다
 *   2) 아직 여문 사물     — 가까운 것부터 (낚시터는 몇 번이든 되니 조금 낮춰 본다)
 *   3) 아무것도 없으면    — 전방에 팔고 다음 날을 기다린다

 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  var FLAGS = [
    { key: 'gather', name: '채집', emoji: '🌳', desc: '아직 여문 나무·바위·꽃·물가를 돈다' },
    { key: 'errand', name: '심부름', emoji: '🤝', desc: '부탁을 채운 주민에게 건네준다' },
    { key: 'bug', name: '곤충', emoji: '🦋', desc: '잠자리채가 있으면 살금살금 다가가 잡는다' },
    { key: 'sell', name: '전방에 팔기', emoji: '🪙', desc: '부탁 몫만 남기고 판다' },
  ];

  var DEFAULTS = { on: false, gather: true, errand: true, bug: true, sell: true };

  var acc = { aim: 0, act: 0, sell: 0 };
  var aim = null;                 // 지금 향하는 것
  var doing = '';
  var lastLog = 0;

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
    aim = null;
    global.DG.village.setAutoSneak(false);
    doing = v ? '갈 곳을 고르는 중…' : '';
    core.log(v ? '🤖 자동 마을살이를 켰다' : '🤖 자동 마을살이를 껐다', 'info');
    core.emit('toast', v ? '🤖 자동 마을살이 시작' : '⏸️ 자동 마을살이 정지');
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

  /* ── 목표 고르기 ──────────────────────────────────────── */

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  /** 부탁을 채운 주민 (건네줄 수 있는 사람) */
  function readyResident(raw) {
    var V = global.DG.village;
    var best = null, bd = 1e9;
    for (var i = 0; i < raw.residents.length; i++) {
      var res = raw.residents[i];
      var req = V.requestOf(res.id);
      if (req.done) { continue; }
      if (V.bagCount(req.want) < req.n) { continue; }
      var d = dist(res, raw.player);
      if (d < bd) { bd = d; best = res; }
    }
    return best ? { type: 'resident', obj: best, dist: bd } : null;
  }

  /** 아직 여문 사물 중 가까운 것 */
  function freshProp(raw) {
    var V = global.DG.village, VD = global.DG.villageData;
    var best = null, bs = -1e9;
    for (var i = 0; i < raw.props.length; i++) {
      var pr = raw.props[i];
      var def = VD.PROPS[pr.kind];
      if (!def || !def.gather) { continue; }
      if (pr.deco) { continue; }    // 숲 고리 장식(PLAN 40절 PHASE 3) — 자동도 안 노린다
      if (V.spent(pr)) { continue; }
      /* 도구가 없어 손을 못 대는 것은 목표로 삼지 않는다.
         삽 없이 갈라진 자리로 걸어가 아무것도 못 하고 다시 그리로 가는
         무한 되돌이에 빠진 적이 있다 */
      if (def.tool && !V.hasTool(def.tool)) { continue; }
      var d = dist(pr, raw.player);
      /* 가까운 것 우선. 낚시터는 계속 되니 조금 뒤로 미룬다(다른 걸 놓치지 않게) */
      var score = -d - (def.reset ? 0 : 240);
      if (score > bs) { bs = score; best = pr; }
    }
    return best ? { type: 'prop', obj: best, dist: dist(best, raw.player) } : null;
  }

  /**
   * 가까운 벌레 — 잠자리채가 있을 때만 본다.
   * 벌레는 **사라진다.** 그러니 사물보다 앞에 두되, 건네줄 부탁보다는 뒤다.
   */
  function nearBug(raw) {
    var B = global.DG.bug;
    if (!B || !B.hasNet()) { return null; }
    var list = B.list(), best = null, bd = 1e9;
    for (var i = 0; i < list.length; i++) {
      if (list[i].state === 'flee') { continue; }
      var d = dist(list[i], raw.player);
      if (d < bd) { bd = d; best = list[i]; }
    }
    return best ? { type: 'bug', obj: best, dist: bd } : null;
  }

  /* ── 매 프레임 ────────────────────────────────────────── */

  function update(dt) {
    if (!active()) { return; }
    var V = global.DG.village;
    /* 집 안에서는 아무것도 하지 않는다 — 꾸미기는 손으로 하는 놀이다 */
    if (V.indoors()) { doing = '🏠 집 안에서는 쉽니다'; V.setAutoSneak(false); return; }
    var raw = V.raw();

    /* 낚시 중이면 그것부터 — 입질을 기다렸다 당긴다.
       규칙을 새로 만들지 않는다: 손으로 할 때와 같은 interact() 를 같은 타이밍에 부른다.
       (매 프레임 본다 — 입질 창이 0.7초라 0.5초 간격으로 보면 놓칠 수 있다) */
    var fs = V.fishState();
    if (fs) {
      if (fs.state === 'bite') {
        V.interact();
      } else if (fs.state === 'late') {
        V.interact();                     // 이미 늦었다 — 줄을 거둔다
      }
      doing = fs.state === 'bite' ? '🎣 입질! 당긴다' : '🎣 입질을 기다린다';
      return;
    }

    /* 0.4초마다 목표를 다시 고른다 (날이 바뀌면 여문 것이 늘어난다) */
    acc.aim += dt;
    if (acc.aim >= 0.4) {
      acc.aim = 0;
      var pick = (on('errand') ? readyResident(raw) : null) ||
                 (on('bug') ? nearBug(raw) : null) ||
                 (on('gather') ? freshProp(raw) : null);
      aim = pick;
      if (aim) {
        V.walkTo(aim.obj.x, aim.obj.y + 6);
        var VD = global.DG.villageData;
        doing = aim.type === 'resident'
          ? '🤝 ' + aim.obj.ref.name + ' 에게 (' + Math.round(aim.dist) + ')'
          : aim.type === 'bug'
          ? '🐾 ' + aim.obj.ref.name + ' 에게 살금살금 (' + Math.round(aim.dist) + ')'
          : '🌳 ' + VD.PROPS[aim.obj.kind].name + ' 으로 (' + Math.round(aim.dist) + ')';
      } else {
        doing = '🛏️ 오늘 할 일을 마쳤습니다 — 날이 바뀌면 다시 여뭅니다';
      }
    }

    /* 벌레를 노릴 때는 **살금살금** 걷는다. 안 그러면 다가가는 족족 달아난다 —
       손으로 할 때와 같은 규칙을 자동도 그대로 탄다 */
    V.setAutoSneak(!!(aim && aim.type === 'bug' &&
                      dist(aim.obj, raw.player) < global.DG.bug.WARY * 1.5));

    /* 손이 닿으면 쓴다 — 규칙은 village.interact() 그대로 */
    acc.act += dt;
    if (acc.act >= 0.5) {
      acc.act = 0;
      var f = V.focus();
      if (f && aim && f.obj === aim.obj) {
        var r = V.interact();
        if (r && r.kind === 'open') { /* 건물은 자동으로 열지 않는다 */ }
      }
    }

    if (on('sell')) {
      acc.sell += dt;
      if (acc.sell >= 20) {
        acc.sell = 0;
        var got = V.sellAll();
        if (got && Date.now() - lastLog > 30000) {
          lastLog = Date.now();
          core.log('🪙 모은 것을 전방에 팔았다 (+' + core.fmt(got) + ')', 'info');
        }
      }
    }

  }

  function status() {
    return { on: active(), doing: doing, flags: st(), aim: aim };
  }

  global.DG = global.DG || {};
  global.DG.auto = {
    FLAGS: FLAGS, flagByKey: flagByKey,
    state: st, active: active, on: on,
    setOn: setOn, toggle: toggle, toggleFlag: toggleFlag,
    update: update, status: status,
    /** 자가진단용 */
    _readyResident: readyResident, _freshProp: freshProp
  };
})(window);
