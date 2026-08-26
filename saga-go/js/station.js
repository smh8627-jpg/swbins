/**
 * 역참(驛站) — 원작(포켓몬GO)의 포켓스탑
 * ---------------------------------------------------------------
 * 지도 위 고정 지점에 들러 보급을 받는다. 한 번 들르면 5분을 쉰다.
 * 원작의 것을 같은 자리에 같은 역할로 옮겼다:
 *
 *   포켓스탑   → 역참        회전(스핀) → 들른다
 *   5분 쿨다운 → 그대로 5분   아이템     → 등용서 · 사료 · 금
 *   회전 XP 50 → 경험치 50
 *
 * 자리는 world.js 가 좌표 해시로 정한다(같은 땅은 늘 같은 자리).
 * 여기는 **쉬는 시간과 보급품만** 맡는다.
 *
 * 걷기 보급(game.js tickSupply)은 그대로 둔다 — 그쪽은 "걸음 자체의 보상"이고,
 * 역참은 "찾아가는 보상"이라 원작에서도 둘은 따로 논다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  /** 원작 포켓스탑과 같은 5분 */
  var COOLDOWN = 5 * 60 * 1000;

  var active = false;

  /** 세이브 칸이 없던 옛 세이브도 여기서 채운다 */
  function book() {
    if (!core.save.stations) { core.save.stations = {}; }
    return core.save.stations;
  }

  /**
   * 쉬는 중인지. 지나간 역참의 키가 세이브에 무한히 쌓이지 않도록,
   * 다 쉰 항목은 물어볼 때마다 하나씩 지운다.
   */
  function stateOf(key) {
    var b = book();
    var at = b[key] || 0;
    var left = COOLDOWN - (Date.now() - at);
    if (left <= 0) {
      if (b[key]) { delete b[key]; }
      return { ready: true, left: 0 };
    }
    return { ready: false, left: left };
  }

  /** 남은 시간을 "2분 30초" 로 */
  function leftLabel(ms) {
    var s = Math.ceil(ms / 1000);
    var m = Math.floor(s / 60);
    return m > 0 ? (m + '분 ' + (s % 60) + '초') : (s + '초');
  }

  /**
   * 보급품. 원작처럼 트레이너 레벨을 조금 탄다 —
   * 올라갈수록 같은 역참에서 더 많이 받는다.
   */
  function roll() {
    var lv = core.save.player.level;
    var r = {
      scroll: 1 + (Math.random() < 0.35 ? 1 : 0) + Math.floor(lv / 12),
      feed: 2 + Math.floor(Math.random() * 2) + Math.floor(lv / 10),
      gold: 14 + Math.floor(Math.random() * 12) + lv * 2,
      exp: 50,
      extra: null
    };
    /* 이따금 쓰는 물건 하나 — 원작 스탑이 열매·향로를 섞어 주는 자리 */
    var p = Math.random();
    if (p < 0.16) { r.extra = { key: 'treat', n: 1 }; }
    else if (p < 0.22) { r.extra = { key: 'incense', n: 1 }; }
    else if (p < 0.25) { r.extra = { key: 'prayer', n: 1 }; }
    return r;
  }

  /** 역참이 천거장을 줄 확률 — 원작에서 포켓스탑이 알을 주는 그 자리 */
  var LETTER_CHANCE = 0.22;

  /**
   * 들른다. 쉬는 중이면 아무것도 주지 않는다.
   * @returns {{ok:boolean, reason?:string, left?:number, reward?:object}}
   */
  function visit(st) {
    if (!st || !st.key) { return { ok: false, reason: 'none' }; }
    /* 적도가 들어 있으면 보급이 없다 — 물리쳐야 역참이 원래대로 돌아온다(rogue.js).
       원작에서 검게 물든 스탑이 회전하지 않는 그 자리다. */
    var R = global.DG.rogue;
    if (R && R.occupied(st)) { return { ok: false, reason: 'rogue' }; }
    var stt = stateOf(st.key);
    if (!stt.ready) { return { ok: false, reason: 'cooldown', left: stt.left }; }

    var r = roll();
    /* 격문 — 토벌에 쓰는 패스. 드물게 나온다 */
    if (Math.random() < 0.08 && global.DG.raid) {
      global.DG.raid.givePass(1);
      r.pass = 1;
    }
    /* 천거장 — 가방이 꽉 차 있으면 안 준다(원작과 같다) */
    if (Math.random() < LETTER_CHANCE && global.DG.letter) {
      var g = global.DG.letter.give();
      if (g) { r.letter = g; }
    }
    var B = global.DG.bag;
    r.scroll = B.add('scroll', r.scroll);
    r.feed = B.add('feed', r.feed);
    if (r.extra) {
      r.extra.n = B.add(r.extra.key, r.extra.n);
      if (!r.extra.n) { r.extra = null; }
    }
    core.save.player.gold += r.gold;
    core.gainExp(r.exp);
    var p = core.save.player;
    p.stationVisits = (p.stationVisits || 0) + 1;
    book()[st.key] = Date.now();
    if (global.DG.quest) {
      global.DG.quest.progress('station', 1);
      /* 원작에서 스탑이 리서치 과제를 주는 자리 — 손이 비어 있을 때만 */
      if (!global.DG.quest.full() && Math.random() < 0.5) {
        r.quest = global.DG.quest.take();
      }
    }

    core.log('🏮 ' + st.name + ' 에 들렀다 — 📜 +' + r.scroll +
      ' · 🍖 +' + r.feed + ' · 🪙 +' + r.gold +
      (r.extra ? ' · ' + global.DG.bag.def(r.extra.key).emoji +
                 ' ' + global.DG.bag.def(r.extra.key).name : '') +
      (r.letter ? ' · ' + r.letter.emoji + ' ' + r.letter.name : ''), 'good');
    if (global.DG.bag.full()) {
      core.emit('toast', '🎒 행낭이 가득 찼습니다 — 쓰거나 비워야 더 받습니다');
    }
    core.emit('changed');
    return { ok: true, reward: r };
  }

  /* ── 화면 ─────────────────────────────────────────────── */

  function host() { return document.getElementById('encounter'); }

  function close() {
    active = false;
    var el = host();
    if (el) { el.classList.remove('show'); el.innerHTML = ''; }
    core.emit('changed');
  }

  /** 들러서 받은 것을 보여 준다 (원작에서 아이템이 튀어나오는 자리) */
  function open(st) {
    if (global.DG.encounter && global.DG.encounter.active) { return; }
    /* 점거된 역참은 적도의 화면이 받는다 — 보급 창을 띄우지 않는다 */
    var R = global.DG.rogue;
    if (R && R.occupied(st)) { R.open(st); return; }
    var res = visit(st);
    var el = host();
    if (!el) { return; }

    if (!res.ok) {
      if (res.reason === 'cooldown') {
        core.emit('toast', '🏮 ' + st.name + ' — 아직 쉬는 중입니다 (' + leftLabel(res.left) + ' 남음)');
      }
      return;
    }

    var r = res.reward;
    active = true;
    el.innerHTML =
      '<div class="enc-card">' +
        '<div class="enc-big"><span style="font-size:56px">🏮</span></div>' +
        '<h3>' + st.name + '</h3>' +
        '<p class="quote">"먼 길 오셨소. 쓰실 것을 챙겨 드리리다."</p>' +
        '<div class="enc-reward">📜 등용서 +' + r.scroll + ' · 🍖 사료 +' + r.feed +
          ' · 🪙 금 +' + r.gold + ' · 경험치 +' + r.exp + '</div>' +
        (r.extra
          ? '<div class="enc-reward">' + global.DG.bag.def(r.extra.key).emoji + ' ' +
              global.DG.bag.def(r.extra.key).name + ' +' + r.extra.n + '</div>'
          : '') +
        (r.letter
          ? '<div class="enc-reward" style="color:' + r.letter.color + '">' +
              r.letter.emoji + ' ' + r.letter.name + ' — 행낭에 넣고 걸으면 열립니다</div>'
          : '') +
        (r.quest
          ? '<div class="enc-reward">📋 사명 — ' + r.quest.emoji + ' ' + r.quest.name + '</div>'
          : '') +
        (r.pass ? '<div class="enc-reward">⚔️ 격문 +1 — 성채의 적장을 칠 수 있습니다</div>' : '') +
        '<small class="muted">이 역참은 5분 뒤에 다시 채워집니다.</small>' +
        '<button class="btn primary wide" data-act="ok">받는다</button>' +
      '</div>';
    el.classList.add('show');
    var ok = el.querySelector('[data-act="ok"]');
    if (ok) { ok.addEventListener('click', close); }
  }

  /**
   * 자동 순행이 부르는 문 — 화면 없이 들르기만 한다.
   * @returns {{ok:boolean, name?:string, reward?:object}}
   */
  function autoVisit(st) {
    var res = visit(st);
    if (!res.ok) { return { ok: false }; }
    return { ok: true, name: st.name, reward: res.reward };
  }

  core.on('station:request', function (st) { open(st); });

  global.DG = global.DG || {};
  global.DG.station = {
    COOLDOWN: COOLDOWN,
    stateOf: stateOf,
    leftLabel: leftLabel,
    visit: visit,
    autoVisit: autoVisit,
    open: open,
    close: close,
    get active() { return active; }
  };
})(window);
