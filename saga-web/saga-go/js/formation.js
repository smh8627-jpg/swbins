/**
 * 편성 — 동행 다섯 = 들판 명단 앞 넷 + 대기 하나 (PLAN §5 ⑲-15, saga-godot PLAN 106 ㉝)
 * ---------------------------------------------------------------
 * 자리 순서가 곧 `save.party` 순서라(들판 전투는 앞 FIELD 명, 숫자키 1~4) 세이브 모양은 그대로다.
 *   넣기       빈자리면 끝에, 꽉 찼으면 마지막(다섯째) 자리와 바뀐다
 *   빼기       자리가 비고 동행이 준다
 *   앞 자리로  바로 앞 사람과 바뀐다
 *   들판으로   대기(다섯째)를 넷째와 바꾼다
 * 들판 전투가 교전 중이면(`fieldCombat.engaged`) 막는다 — 싸우는 중에 명단이 바뀌면 교체 쿨·기력이 흐트러진다.
 * 판정은 순수(`plan`) — 세이브를 바꾸는 쪽은 `apply` 하나.
 */
(function (global) {
  'use strict';

  var MAX = 5, FIELD = 4;
  function core() { return global.DG.core; }
  function party() { var s = core().save; if (!Array.isArray(s.party)) { s.party = []; } return s.party; }

  /**
   * 순수 — 명단 list 에 op(put·drop·up·field)를 id 로 하면 { ok, list, why?, swap? }.
   * swap 은 자리를 내준 사람 id(넣기·앞으로·들판으로)
   */
  function plan(list, op, id) {
    var L = (list || []).slice(), i = L.indexOf(id), sw;
    if (op === 'put') {
      if (i >= 0) { return { ok: false, list: L, why: '이미 동행 중' }; }
      if (L.length < MAX) { L.push(id); return { ok: true, list: L }; }
      sw = L[MAX - 1]; L[MAX - 1] = id;
      return { ok: true, list: L, swap: sw };
    }
    if (i < 0) { return { ok: false, list: L, why: '동행이 아님' }; }
    if (op === 'drop') { L.splice(i, 1); return { ok: true, list: L }; }
    if (op === 'up') {
      if (i === 0) { return { ok: false, list: L, why: '이미 맨 앞' }; }
      sw = L[i - 1]; L[i - 1] = id; L[i] = sw;
      return { ok: true, list: L, swap: sw };
    }
    if (op === 'field') {
      if (i < FIELD) { return { ok: false, list: L, why: '이미 들판 명단' }; }
      sw = L[FIELD - 1]; L[FIELD - 1] = id; L[i] = sw;
      return { ok: true, list: L, swap: sw };
    }
    return { ok: false, list: L, why: '모르는 일' };
  }

  /** 지금 싸우는 중인가 — 들판 전투 교전 */
  function busy() {
    var F = global.DG.fieldCombat, S = F && F.state ? F.state() : null;
    return !!(S && F.engaged && F.engaged(S));
  }
  /** 세이브에 한다 — 막히면 { ok:false, why } */
  function apply(op, id) {
    if (busy()) { return { ok: false, why: '싸우는 중에는 명단을 바꿀 수 없다' }; }
    var r = plan(party(), op, id);
    if (!r.ok) { return r; }
    core().save.party = r.list;
    if (op === 'drop' && core().save.petEquip) { delete core().save.petEquip[id]; }
    core().emit('party:changed', { op: op, id: id, swap: r.swap || null });
    core().persist();
    return r;
  }
  /** 자리 n(0부터)이 들판 명단인가 */
  function onField(id) { var i = party().indexOf(id); return i >= 0 && i < FIELD; }
  /** 이 사람을 넣으면 누구와 바뀌나(꽉 찼을 때) — 없으면 null */
  function putSwap(id) { var r = plan(party(), 'put', id); return r.ok && r.swap ? r.swap : null; }

  global.DG = global.DG || {};
  global.DG.formation = { MAX: MAX, FIELD: FIELD, plan: plan, apply: apply, busy: busy, onField: onField, putSwap: putSwap };
})(window);
