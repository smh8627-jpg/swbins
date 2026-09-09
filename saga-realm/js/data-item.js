/**
 * 삼국지 — 보물(寶物)
 * ---------------------------------------------------------------
 * 원작 코에이 삼국지의 "보물"(무장이 지니면 능력치가 오르는 물건)을
 * 이 판의 결로 가볍게 옮겼다. 실존 인물과 얽힌 이름(예: 유명한 명마·보검의
 * 원래 주인)은 쓰지 않는다 — 전부 가상의 물건이다(루트 CLAUDE.md 이름 정책).
 *
 * v1 범위 — **장비창을 만들지 않는다.** 무장 하나가 한 번에 하나만 지니고,
 * `war.js`의 원정 사건("유물 발견")이 원정 간 장수 중 하나에게 곧바로
 * 씌운다(이미 지닌 게 있으면 갈아 끼운다). 시장에서 사고팔거나 장수끼리
 * 건네주는 것은 범위 밖 — 필요해지면 그때 얹는다.
 *
 * **`global.DG.item` 으로 등록한다 — 이름이 곧 계약이다.** `hero.js`(다섯
 * 판이 나눠 가진 공유 파일)는 이미 `gearOf()`가 `global.DG.item.statBonus(id)`
 * 를 불러 장비 보정을 계산에 넣도록 짜여 있다(장비 모듈이 없으면 0을 준다 —
 * 그래서 이 판은 지금까지 손 안 대고도 멀쩡히 돌았다). `saga-dungeon/js/item.js`
 * 가 `{flat, pct}` 모양으로 이미 그 계약을 지키고 있어, 여기서도 같은 모양만
 * 맞추면 hero.js 쪽은 한 글자도 안 건드리고 "화면과 판정이 갈라지지 않는다"
 * 원칙을 그대로 물려받는다.
 */
(function (global) {
  'use strict';

  var ITEMS = [
    { id: 'itm_ironblade', name: '무쇠검', emoji: '🗡️', stat: 'might',   bonus: 6,
      desc: '날이 벼려진 채로 전해 내려온 검.' },
    { id: 'itm_warhorse',  name: '준마',   emoji: '🐎', stat: 'might',   bonus: 10,
      desc: '하루에 천 리를 달린다는 말.' },
    { id: 'itm_armor',     name: '보갑',   emoji: '🛡️', stat: 'might',   bonus: 8,
      desc: '화살도 뚫지 못하는 갑옷.' },
    { id: 'itm_scroll',    name: '병서',   emoji: '📜', stat: 'wisdom',  bonus: 6,
      desc: '옛 병가의 계책이 적힌 두루마리.' },
    { id: 'itm_compass',   name: '나침반', emoji: '🧭', stat: 'wisdom',  bonus: 10,
      desc: '산길에서도 방향을 잃지 않게 해 준다.' },
    { id: 'itm_jade',      name: '옥패',   emoji: '💎', stat: 'wisdom',  bonus: 8,
      desc: '몸에 지니면 마음이 가라앉는다는 옥.' },
    { id: 'itm_seal',      name: '인수',   emoji: '🔶', stat: 'command', bonus: 6,
      desc: '위엄을 세우는 관인.' },
    { id: 'itm_drum',      name: '전고',   emoji: '🥁', stat: 'command', bonus: 10,
      desc: '북소리 하나로 군세를 다잡는다.' }
  ];

  function itemById(id) {
    for (var i = 0; i < ITEMS.length; i++) { if (ITEMS[i].id === id) { return ITEMS[i]; } }
    return null;
  }

  function randomItem() { return ITEMS[Math.floor(Math.random() * ITEMS.length)]; }

  /**
   * hero.js `gearOf()` 가 부르는 계약대로 `{flat, pct}` 를 낸다.
   * `off.has(id)` 로 미리 걸러 — 세이브에 아직 없는(한 번도 못 만난) 무장의
   * 스탯을 조회했다고 `off.rec()` 이 빈 기록을 새로 만들어 버리면 안 된다.
   */
  function statBonus(heroId) {
    var out = { flat: { might: 0, wisdom: 0, command: 0 }, pct: { might: 0, wisdom: 0, command: 0 } };
    var off = global.DG.off;
    if (!off || !off.has(heroId)) { return out; }
    var it = itemById(off.rec(heroId).item);
    if (it) { out.flat[it.stat] += it.bonus; }
    return out;
  }

  global.DG = global.DG || {};
  global.DG.item = { ITEMS: ITEMS, itemById: itemById, randomItem: randomItem, statBonus: statBonus };
})(window);
