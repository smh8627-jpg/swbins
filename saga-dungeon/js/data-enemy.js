/**
 * 적 데이터 — 관문에 나오는 무리
 * ---------------------------------------------------------------
 * tier 는 관문 구간이다.  1: 1~5관문 / 2: 6~12 / 3: 13~25 / 4: 26관문 이상
 * 각 관문의 마지막 파(10파)에는 보스가 혼자 나온다.
 */
(function (global) {
  'use strict';

  /* ── 저항(抵抗) — 원작의 몬스터 내성 ────────────────────────
   * 원작에서 "이놈은 불이 안 통한다" 를 아는 순간 손이 바뀐다.
   * 이 판에는 원소가 없으니 **때리는 두 결**로 갈랐다.
   *
   *   phys 물리(物理) — 평타 · 회전참 · 돌진
   *   chi  기(氣)     — 기공파
   *
   * `resist` 는 그 결의 피해를 몇 % 깎는지다(없으면 0).
   * **면역(100%)은 두지 않았다.** 원작의 면역은 스킬이 여덟 개일 때 성립하는
   * 장치인데, 이 판은 넷이고 그중 기(氣)는 하나뿐이라 물리 면역이 뜨면
   * 재냉각을 기다리는 것 말고 할 게 없어진다. 상한은 eliteOf 쪽에서 75% 로 막는다.
   *
   * 결은 겉모습을 따른다 — 철갑을 두른 것은 칼이 잘 안 들고,
   * 짐승·수군처럼 두껍지 않은 것은 기가 잘 안 통한다.
   */

  var ENEMIES = [
    // tier 1 — 잡졸
    { name: '황건적', emoji: '🟡', kind: 'human', color: '#c9a83a', look: { weapon: 'club', helm: 'none', armor: 'leather' }, tier: 1 },
    { name: '산적', emoji: '🪓', kind: 'human', color: '#6b5030', look: { weapon: 'axe', helm: 'none', armor: 'leather' }, tier: 1 },
    { name: '도적떼', emoji: '🗡️', kind: 'human', color: '#5a4a58', look: { weapon: 'sword', helm: 'none', armor: 'leather' }, tier: 1 },
    { name: '들개', emoji: '🐕', kind: 'beast', color: '#8a7358', form: 'quad', tier: 1, resist: { chi: 25 } },
    { name: '떠돌이 병졸', emoji: '🥷', kind: 'human', color: '#6a6a74', look: { weapon: 'spear', helm: 'helmet', armor: 'leather' }, tier: 1 },
    /* 2026-09-05 — 짐승 형이 들개·코끼리병 둘뿐이라 다양화(사용자 요청).
       `body`는 asset3d.js REG 의 키 — 없으면 dungeon3d.js 가 기본 'beast'(늑대)로
       그린다. 멧돼지는 두꺼운 가죽이라 물리에 약간 강하고 기(氣)는 그대로 받는다 */
    { name: '멧돼지', emoji: '🐗', kind: 'beast', color: '#4a3a2a', form: 'quad', body: 'beast_boar', tier: 1, resist: { phys: 15 } },

    // tier 2 — 변방
    { name: '왜구', emoji: '⛵', kind: 'human', color: '#8a4a4a', look: { weapon: 'sword', helm: 'none', armor: 'leather' }, tier: 2 },
    { name: '마적', emoji: '🐎', kind: 'human', color: '#7a5a3a', look: { weapon: 'sword', helm: 'none', armor: 'leather' }, tier: 2 },
    { name: '오랑캐 궁수', emoji: '🏹', kind: 'human', color: '#7a6a4a', look: { weapon: 'bow', helm: 'none', armor: 'leather' }, tier: 2, atkEl: 'pois' },
    { name: '거란 기병', emoji: '🐴', kind: 'human', color: '#5a6a8a', look: { weapon: 'spear', helm: 'helmet', armor: 'plate' }, tier: 2, resist: { phys: 20 } },
    { name: '남만 코끼리병', emoji: '🐘', kind: 'beast', color: '#8a8a92', form: 'quad', body: 'beast_big', tier: 2, resist: { chi: 35, phys: 15 } },

    // tier 3 — 정규군
    { name: '여진 궁수', emoji: '🎯', kind: 'human', color: '#6a7a5a', look: { weapon: 'bow', helm: 'none', armor: 'leather' }, tier: 3 },
    { name: '몽골 기병', emoji: '🏇', kind: 'human', color: '#8a7a5a', look: { weapon: 'spear', helm: 'helmet', armor: 'plate' }, tier: 3, resist: { phys: 25 } },
    { name: '왜군 조총병', emoji: '🔫', kind: 'human', color: '#7a4a4a', look: { weapon: 'staff', helm: 'none', armor: 'leather' }, tier: 3, atkEl: 'fire' },
    { name: '위군 창병', emoji: '⚔️', kind: 'human', color: '#31609f', look: { weapon: 'spear', helm: 'helmet', armor: 'plate' }, tier: 3, resist: { phys: 20 } },
    { name: '수군 척후선', emoji: '🚤', kind: 'human', color: '#3a6a8a', look: { weapon: 'bow', helm: 'helmet', armor: 'leather' }, tier: 3, resist: { chi: 30 } },
    /* 산군(山君) — 호랑이의 옛 존칭(민담 표현, 실제 인물·시리즈 이름이 아니다).
       빠르고 사나운 맹수라 기·물리 둘 다 어느 정도 버틴다 */
    { name: '산군', emoji: '🐅', kind: 'beast', color: '#c9772f', form: 'quad', body: 'beast_tiger', tier: 3, resist: { chi: 25, phys: 15 } },

    // tier 4 — 정예
    { name: '철갑 중장병', emoji: '🛡️', kind: 'human', color: '#6a6a7a', look: { weapon: 'halberd', helm: 'helmet', armor: 'plate' }, tier: 4, resist: { phys: 40 } },
    { name: '근위 기병', emoji: '🐲', kind: 'human', color: '#8a3a4a', look: { weapon: 'spear', helm: 'helmet', armor: 'plate', cape: true }, tier: 4 },
    { name: '연노 사수', emoji: '🏹', kind: 'human', color: '#5a5a6a', look: { weapon: 'bow', helm: 'helmet', armor: 'plate' }, tier: 4, atkEl: 'lit' },
    { name: '수군 함대', emoji: '🚢', kind: 'human', color: '#3a5a7a', look: { weapon: 'sword', helm: 'helmet', armor: 'plate' }, tier: 4, resist: { chi: 40, phys: 15 }, atkEl: 'cold' },
    { name: '흑기병', emoji: '🖤', kind: 'human', color: '#3a3a44', look: { weapon: 'halberd', helm: 'helmet', armor: 'plate', cape: true }, tier: 4, resist: { phys: 30, chi: 20 } }
  ];

  var BOSSES = [
    { name: '황건 두목', emoji: '👺', kind: 'human', color: '#c9a83a', look: { weapon: 'club', helm: 'none', armor: 'leather', beard: true }, tier: 1 },
    { name: '산채 두령', emoji: '👹', kind: 'human', color: '#6b4a2a', look: { weapon: 'axe', helm: 'none', armor: 'leather', beard: true }, tier: 1 },
    { name: '왜구 선장', emoji: '🏴‍☠️', kind: 'human', color: '#8a3a3a', look: { weapon: 'sword', helm: 'none', armor: 'leather', cape: true }, tier: 2 },
    { name: '오랑캐 족장', emoji: '🐺', kind: 'human', color: '#7a5a2a', look: { weapon: 'axe', helm: 'none', armor: 'leather', cape: true, beard: true }, tier: 2 },
    { name: '거란 도통', emoji: '🦅', kind: 'human', color: '#4a6a9a', look: { weapon: 'halberd', helm: 'helmet', armor: 'plate', cape: true }, tier: 2 },
    { name: '몽골 만호장', emoji: '🐴', kind: 'human', color: '#8a6a3a', look: { weapon: 'spear', helm: 'helmet', armor: 'plate', cape: true }, tier: 3 },
    { name: '왜장', emoji: '🗾', kind: 'human', color: '#7a3a3a', look: { weapon: 'sword', helm: 'gapju', armor: 'plate', cape: true }, tier: 3 },
    { name: '위군 도독', emoji: '🎖️', kind: 'human', color: '#31609f', look: { weapon: 'sword', helm: 'crown', armor: 'plate', cape: true }, tier: 3 },
    { name: '관문 수호장', emoji: '🏯', kind: 'human', color: '#5a5a6a', look: { weapon: 'halberd', helm: 'gapju', armor: 'plate', cape: true, beard: true }, tier: 4 },
    { name: '적국 대장군', emoji: '🐉', kind: 'human', color: '#7a2a3a', look: { weapon: 'halberd', helm: 'plume', armor: 'plate', cape: true }, tier: 4 }
  ];

  function tierOf(stage) {
    if (stage <= 5) { return 1; }
    if (stage <= 12) { return 2; }
    if (stage <= 25) { return 3; }
    return 4;
  }

  global.DG = global.DG || {};
  global.DG.enemyData = {
    enemies: ENEMIES,
    bosses: BOSSES,
    tierOf: tierOf,
    /** 해당 관문에 어울리는 적 풀 */
    poolFor: function (stage, boss) {
      var t = tierOf(stage);
      var src = boss ? BOSSES : ENEMIES;
      var pool = src.filter(function (e) { return e.tier === t; });
      return pool.length ? pool : src;
    }
  };
})(window);
