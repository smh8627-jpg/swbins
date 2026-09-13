/**
 * 단약(丹藥)과 요대(腰帶) — 원작의 물약과 벨트
 * ===============================================================
 * 원작(디아블로2)에서 **손가락이 가장 자주 가는 자리**가 1·2·3·4 다.
 * 피가 깎이면 벨트에서 물약을 꺼내 마시고 계속 싸운다 — 그 한 동작이
 * 원작의 전투 리듬을 만든다. 이 판은 여태 회복이 **우물방 한 번(40%)** 과
 * 은사·층 진입뿐이라, 피가 깎이면 할 수 있는 게 도망밖에 없었다.
 *
 * 원작에서 그대로 옮긴 것
 *   · **키는 1 2 3 4.** 원작에서 그 넉 줄이 벨트다. 그래서 **스킬을 Q W E R 로 옮겼다**
 *     (원작도 스킬은 F1~F8 이고 물약이 1~4 다). 조작 안내와 도움말도 같이 고쳤다
 *   · **한 칸에 한 종류가 쌓인다.** 원작의 벨트도 세로줄마다 같은 물약이 쌓인다.
 *     네 칸 × 넉 개 = 열여섯이 가득 찬 벨트다
 *   · **벨트가 차면 못 줍는다.** 바닥에 그대로 남는다 (원작과 같다)
 *   · **회차를 넘어 남는다.** 마을에 돌아와도 벨트는 그대로다 — 그래서 세이브에 산다
 *     (은사처럼 회차 안에서만 사는 것과 다르다)
 *
 * 이 판에서 정한 것
 *   · 두 가지뿐이다 — **회복단**(체력) · **기력단**(기력). 원작의 해독·해방 물약에
 *     해당하는 축(중독·저주)이 이 판에 없다
 *   · 등급 셋(소·중·대)은 **최대치의 몇 %** 를 채운다. 원작처럼 고정량으로 하면
 *     깊은 층에서 종잇조각이 되고, 그때마다 표를 다시 짜야 한다
 *
 * 값을 바꾸는 일은 여기 두 표(KINDS·GRADES)에서만 한다.
 * 마시는 것 자체는 dungeon.refill() 한 곳을 통한다 — 체력·기력의 정본은 거기다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  var SLOTS = 4;          // 벨트 칸 (원작의 네 줄)
  var STACK = 4;          // 한 칸에 쌓이는 수 (원작의 가득 찬 벨트 = 4×4)

  /** 두 가지 — 무엇을 채우는가 */
  var KINDS = [
    { key: 'heal', name: '회복단(回復丹)', short: '회복단', emoji: '🍶',
      stat: 'hp', color: '#c0392b', desc: '체력을 채운다.' },
    { key: 'mana', name: '기력단(氣力丹)', short: '기력단', emoji: '🧪',
      stat: 'mp', color: '#3b5bdb', desc: '기력을 채운다.' }
  ];

  /** 등급 셋 — 최대치의 몇 % 를 채우는가 */
  var GRADES = [
    { g: 0, name: '소(小)', pct: 25, price: 40 },
    { g: 1, name: '중(中)', pct: 45, price: 110 },
    { g: 2, name: '대(大)', pct: 70, price: 280 }
  ];

  function kindOf(k) {
    for (var i = 0; i < KINDS.length; i++) { if (KINDS[i].key === k) { return KINDS[i]; } }
    return null;
  }
  function gradeOf(g) { return GRADES[core.clamp(g || 0, 0, GRADES.length - 1)]; }

  function label(k, g) { return gradeOf(g).name + ' ' + (kindOf(k) || {}).short; }

  /* ── 세이브 칸 ────────────────────────────────────────────
   * 옛 세이브엔 없다. 읽는 쪽마다 확인하지 않도록 st() 가 채운다.
   */
  function st() {
    var s = core.save;
    if (!s.belt || !s.belt.length || s.belt.length !== SLOTS) {
      var old = s.belt || [];
      s.belt = [];
      for (var i = 0; i < SLOTS; i++) { s.belt.push(old[i] || null); }
    }
    return s.belt;
  }

  function belt() { return st(); }

  function count(k, g) {
    var b = st(), n = 0, i;
    for (i = 0; i < b.length; i++) {
      if (b[i] && b[i].kind === k && b[i].g === g) { n += b[i].n; }
    }
    return n;
  }

  /** 벨트에 든 것 전부 (화면·자동이 쓴다) */
  function total() {
    var b = st(), n = 0, i;
    for (i = 0; i < b.length; i++) { if (b[i]) { n += b[i].n; } }
    return n;
  }

  /**
   * 한 알 넣는다.
   * 같은 종류·등급이 든 칸에 먼저 쌓고, 없으면 빈 칸에 놓는다.
   * @return {ok, slot} · 못 넣으면 {ok:false, reason:'full'}
   */
  function add(k, g) {
    if (!kindOf(k)) { return { ok: false, reason: 'kind' }; }
    g = core.clamp(g || 0, 0, GRADES.length - 1);
    var b = st(), i;
    for (i = 0; i < b.length; i++) {
      if (b[i] && b[i].kind === k && b[i].g === g && b[i].n < STACK) {
        b[i].n++;
        return { ok: true, slot: i };
      }
    }
    for (i = 0; i < b.length; i++) {
      if (!b[i]) {
        b[i] = { kind: k, g: g, n: 1 };
        return { ok: true, slot: i };
      }
    }
    return { ok: false, reason: 'full' };
  }

  /**
   * 한 칸을 마신다. **던전 안에서만** 듣는다 — 본영에서는 마실 일이 없다
   * (체력은 회차를 시작할 때 가득 찬다).
   * @return {ok, reason} reason: 'empty' 빈 칸 · 'off' 던전 밖 · 'full' 이미 가득
   */
  function use(slot) {
    var b = st();
    var row = b[core.clamp(slot, 0, SLOTS - 1)];
    if (!row || row.n <= 0) { return { ok: false, reason: 'empty' }; }

    var D = global.DG.dungeon;
    if (!D || !D.active()) { return { ok: false, reason: 'off' }; }

    var kd = kindOf(row.kind), gd = gradeOf(row.g);
    var r = D.refill(kd.stat === 'hp' ? gd.pct : 0,
                     kd.stat === 'mp' ? gd.pct : 0,
                     label(row.kind, row.g), kd.color);
    /* 이미 가득이면 **쓰지 않는다** — 원작도 가득 찬 채로 마시면 그냥 버려지지만,
       여기서는 실수로 대(大)를 날리는 일이 더 아깝다 */
    if (!r) { return { ok: false, reason: 'full' }; }

    row.n--;
    if (row.n <= 0) { b[slot] = null; }
    if (global.DG.sfx) { global.DG.sfx.play('potion'); }
    core.emit('changed');
    return { ok: true, kind: row.kind, g: row.g };
  }

  /** 자동이 쓴다 — 가장 **작은** 회복단부터 마신다(큰 것을 아낀다) */
  function useBest(stat) {
    var b = st(), pick = -1, pg = 99, i;
    for (i = 0; i < b.length; i++) {
      if (!b[i]) { continue; }
      var kd = kindOf(b[i].kind);
      if (!kd || kd.stat !== stat) { continue; }
      if (b[i].g < pg) { pg = b[i].g; pick = i; }
    }
    if (pick < 0) { return { ok: false, reason: 'empty' }; }
    return use(pick);
  }

  /* ── 나오는 곳 ───────────────────────────────────────────
   * 원작에서 물약은 **가장 흔한 드랍**이다. 그래서 확률이 장비보다 높다.
   * 등급은 층을 탄다 — 얕은 곳에서 대(大)가 나오면 아래가 시시해진다.
   */
  function rollDrop(floor) {
    var kind = Math.random() < 0.68 ? 'heal' : 'mana';
    var cap = floor >= 14 ? 2 : (floor >= 6 ? 1 : 0);
    var g = 0;
    while (g < cap && Math.random() < 0.42) { g++; }
    return { kind: kind, g: g };
  }

  /** 행상이 파는 값 — 등급표의 값에 깊이를 얹는다 */
  function price(g, lv) {
    return Math.round(gradeOf(g).price * (1 + (lv || 1) * 0.06));
  }

  global.DG = global.DG || {};
  global.DG.potion = {
    KINDS: KINDS, GRADES: GRADES, SLOTS: SLOTS, STACK: STACK,
    kindOf: kindOf, gradeOf: gradeOf, label: label,
    st: st, belt: belt, count: count, total: total,
    add: add, use: use, useBest: useBest,
    rollDrop: rollDrop, price: price
  };
})(window);
