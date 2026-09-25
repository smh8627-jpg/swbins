/**
 * 모험 등급 · 세계 등급 — 원신의 모험 등급·세계 레벨 (PLAN §5 ⑲-7, saga-godot PLAN 106 ㉒, Q9 권장안)
 * ---------------------------------------------------------------
 *   모험 등급  이미 있는 플레이어 Lv(`core.gainExp` 경험 곡선 그대로) — 새 경험 체계를 만들지 않는다.
 *              오를 때마다 금 100×등급 · 부대 경험 40×등급 · 강화석 2, 5 의 배수면 인연 매듭 1.
 *   세계 등급  0~8 — 모험 등급 1·3·6·9·12·15·18·21·24(Godot 1·5·10…40 을 이 판 1.28배 곡선으로 당김).
 *              들판 적(무리·정예·우두머리·겨루기 인물·수호자) 체력·방패 ×(1+0.35·세계), 공격 ×(1+0.22·세계)
 *              — **거리 등급 배율에 곱한다**(거리 등급 1+거리/900m 은 그대로). 사당 시련·비경·주간 보스는 안 받는다.
 *              전리품 금 ×(1+0.25·세계), 3 단계마다 단사 +1. 한 단계 낮추기·되돌리기(들판 전투 중엔 막음).
 *
 * 세이브 `save.adventure = { lowered: 0|1, paid: 보상을 받은 모험 등급 }`(읽는 쪽 기본값 — 없으면 paid = 지금 Lv,
 * 옛 세이브에 지난 보상이 쏟아지지 않게). 문턱·배율은 손잡이 `adventure.*`. 표·계산(`naturalOf`·`hpMul`·`atkMul`·
 * `lootMul`·`dustAdd`·`lvAdd`·`rewardOf`)은 순수 함수.
 */
(function (global) {
  'use strict';

  function core() { return global.DG.core; }
  function K(key, def) { return core().tuned('adventure.' + key, def); }
  function FC() { return global.DG.fieldCombat || null; }
  var enabled = true;
  /** 손잡이 adventure.on = 0 이면 세계 0·보상 없음(받은 등급은 따라 올려 다시 켤 때 쏟아지지 않게) */
  function on() { return enabled && K('on', 1) ? true : false; }
  function toast(msg) { if (global.DG.ui && global.DG.ui.toast && !global.DG_NO_DRAW) { global.DG.ui.toast(msg); } }

  /* ── 표 ─────────────────────────────────────────────── */
  var WL_AT = [1, 3, 6, 9, 12, 15, 18, 21, 24];       // 세계 등급 0~8 이 열리는 모험 등급
  var WL_MAX = WL_AT.length - 1;
  var LV_ADD = [0, 12, 18, 28, 37, 46, 55, 64, 77];   // 머리 위 Lv 덧셈(Godot 8·20·26·36·45·54·63·72·85 의 차이)
  var HP_STEP = 0.35, ATK_STEP = 0.22, LOOT_STEP = 0.25;

  /* ── 판정 층(순수) ───────────────────────────────────── */
  /** 모험 등급 ar 에서 저절로 열리는 세계 등급 */
  function naturalOf(ar) {
    var w = 0;
    for (var i = 1; i <= WL_MAX; i++) { if (ar >= WL_AT[i]) { w = i; } }
    return w;
  }
  function clampW(w) { return Math.max(0, Math.min(WL_MAX, w | 0)); }
  function hpMul(w) { return 1 + K('hpStep', HP_STEP) * clampW(w); }
  function atkMul(w) { return 1 + K('atkStep', ATK_STEP) * clampW(w); }
  function lootMul(w) { return 1 + K('lootStep', LOOT_STEP) * clampW(w); }
  function dustAdd(w) { return Math.floor(clampW(w) / 3); }
  function lvAdd(w) { return LV_ADD[clampW(w)]; }
  /** 모험 등급 ar 에 오르면 받는 것 */
  function rewardOf(ar) {
    return { gold: 100 * ar, exp: 40 * ar, ore: 2, knot: ar % 5 === 0 ? 1 : 0 };
  }

  /* ── 세이브 ──────────────────────────────────────────── */
  function st(paidDef) {
    var s = core().save;
    if (!s.adventure || typeof s.adventure !== 'object') {
      s.adventure = { lowered: 0, paid: paidDef != null ? paidDef : (s.player.level || 1) };
    }
    var a = s.adventure;
    if (typeof a.paid !== 'number') { a.paid = s.player.level || 1; }
    a.lowered = a.lowered ? 1 : 0;
    return a;
  }
  function rank() { return core().save.player.level || 1; }
  function natural() { return naturalOf(rank()); }
  function worldLevel() {
    if (!on()) { return 0; }
    var n = natural();
    return Math.max(0, n - (st().lowered && n > 0 ? 1 : 0));
  }
  function nextAt() { var n = natural(); return n < WL_MAX ? WL_AT[n + 1] : 0; }

  /* ── 바뀔 때 ─────────────────────────────────────────── */
  function worldChanged(from, to) {
    if (from === to) { return; }
    var F = FC();
    if (F && F.rescaleWorld) { F.rescaleWorld(); }
    core().emit('world:level', { from: from, to: to });
  }

  /** 받은 등급(paid) 다음부터 지금 등급까지 보상을 한 번씩 준다. 받은 것을 글로 돌려준다 */
  function payUpTo(ar) {
    var a = st(ar - 1), out = [], c = core(), H = global.DG.hero, WP = global.DG.weapon, TL = global.DG.talent;
    while (a.paid < ar) {
      a.paid += 1;
      var r = rewardOf(a.paid);
      c.save.player.gold = (c.save.player.gold || 0) + r.gold;
      if (H && H.awardParty) { H.awardParty(r.exp); }
      if (WP && WP.addOre) { WP.addOre(r.ore); }
      if (r.knot && TL && TL.addMats) { TL.addMats({ knot: r.knot }); }
      out.push('모험 등급 ' + a.paid + ' — 🪙 ' + r.gold + ' · 부대 경험 ' + r.exp + ' · 🪨 ' + r.ore + (r.knot ? ' · 🪢 ' + r.knot : ''));
    }
    return out;
  }

  var lastWL = null;
  function onLevelUp(lv) {
    if (!on()) { st(lv - 1).paid = Math.max(st().paid, lv); return; }
    var got = payUpTo(lv);
    for (var i = 0; i < got.length; i++) { core().log('🧭 ' + got[i], 'level'); }
    var w = worldLevel();
    if (lastWL !== null && w !== lastWL) {
      if (w > lastWL) { toast('🌍 세계 등급 ' + w + ' — 들판 적이 세지고 전리품이 늘어납니다'); core().log('🌍 세계 등급 ' + w + ' 로 올랐다', 'level'); }
      worldChanged(lastWL, w);
    }
    lastWL = w;
  }

  /** 한 단계 낮추기 — 세계 0 이거나 들판에서 싸우는 중이면 거절 */
  function lowerCheck() {
    var F = FC(), S = F && F.state ? F.state() : null;
    if (!on()) { return { ok: false, why: '모험 등급이 꺼져 있습니다' }; }
    if (st().lowered) { return { ok: false, why: '이미 한 단계 낮췄습니다' }; }
    if (natural() < 1) { return { ok: false, why: '세계 등급 0 은 더 낮출 수 없습니다' }; }
    if (S && F.engaged && F.engaged(S)) { return { ok: false, why: '싸우는 중엔 바꿀 수 없습니다' }; }
    return { ok: true };
  }
  function lower() {
    var chk = lowerCheck();
    if (!chk.ok) { return chk; }
    var from = worldLevel();
    st().lowered = 1;
    lastWL = worldLevel();
    worldChanged(from, lastWL);
    core().persist();
    return { ok: true, wl: lastWL };
  }
  function restoreCheck() {
    var F = FC(), S = F && F.state ? F.state() : null;
    if (!st().lowered) { return { ok: false, why: '낮춘 적이 없습니다' }; }
    if (S && F.engaged && F.engaged(S)) { return { ok: false, why: '싸우는 중엔 바꿀 수 없습니다' }; }
    return { ok: true };
  }
  function restore() {
    var chk = restoreCheck();
    if (!chk.ok) { return chk; }
    var from = worldLevel();
    st().lowered = 0;
    lastWL = worldLevel();
    worldChanged(from, lastWL);
    core().persist();
    return { ok: true, wl: lastWL };
  }

  /* ── 런타임 ──────────────────────────────────────────── */
  var hooked = false;
  function init() {
    st();
    lastWL = worldLevel();
    if (!hooked) { hooked = true; core().on('levelup', onLevelUp); }
  }

  /** 사명 탭 맨 위 카드 */
  function cardHtml() {
    var a = st(), ar = rank(), n = natural(), w = worldLevel(), nx = nextAt();
    var btn = a.lowered
      ? '<button class="btn wide" data-act="wl-restore">🌍 세계 등급 되돌리기 (' + w + ' → ' + n + ')</button>'
      : (n > 0 ? '<button class="btn ghost wide" data-act="wl-lower">🌍 세계 등급 한 단계 낮추기 (' + w + ' → ' + (w - 1) + ')</button>' : '');
    return '<div class="sec"><h4>🧭 모험 등급 <small class="muted">' + ar + ' · 세계 등급 ' + w + (a.lowered ? ' (낮춤)' : '') + '</small></h4>' +
      '<div class="card">' +
        '<div class="stat-row"><span>들판 적 체력·방패 / 공격</span><b>×' + hpMul(w).toFixed(2) + ' / ×' + atkMul(w).toFixed(2) + '</b></div>' +
        '<div class="stat-row"><span>전리품 금</span><b>×' + lootMul(w).toFixed(2) + (dustAdd(w) ? ' · 단사 +' + dustAdd(w) : '') + '</b></div>' +
        '<small class="muted">' + (nx ? '모험 등급 <b>' + nx + '</b> 에 세계 등급 ' + (n + 1) + ' 이 열립니다.' : '세계 등급 끝까지 올랐습니다.') +
          ' 모험 등급이 오를 때마다 금·부대 경험·강화석(5 의 배수면 인연 매듭)을 받습니다.</small>' +
        btn +
      '</div></div>';
  }

  global.DG = global.DG || {};
  global.DG.adventure = {
    WL_AT: WL_AT, WL_MAX: WL_MAX, LV_ADD: LV_ADD,
    /* 판정 층(순수) */
    naturalOf: naturalOf, hpMul: hpMul, atkMul: atkMul, lootMul: lootMul, dustAdd: dustAdd, lvAdd: lvAdd, rewardOf: rewardOf,
    /* 세이브·상태 */
    state: st, rank: rank, natural: natural, worldLevel: worldLevel, nextAt: nextAt, payUpTo: payUpTo,
    lowerCheck: lowerCheck, lower: lower, restoreCheck: restoreCheck, restore: restore,
    /* 런타임 */
    init: init, onLevelUp: onLevelUp, cardHtml: cardHtml, on: on,
    /* 진단 — 옛 항목(금·체력 값을 재는 것)은 끈 채로 돌고 ⑲-7 항목만 켠다 */
    _enableForTest: function (v) { enabled = !!v; lastWL = worldLevel(); },
    _resetForTest: function () { lastWL = worldLevel(); }
  };
})(window);
