/**
 * 사냥터 데이터 — 스테이지 · 발판 · 스킬
 * ---------------------------------------------------------------
 * 메이플스토리식 2D 사이드스크롤 게임의 뼈대 데이터.
 * 스테이지를 하나 늘리려면 STAGES 에 한 줄만 넣으면 된다.
 *
 * 발판  plats   [x, y, w]        y 는 발판 윗면
 * 줄    ropes   [x, top, bottom, kind]   kind: 'rope'(밧줄) | 'ladder'(사다리)
 *               top 은 위쪽 끝(대개 발판 윗면) · bottom 은 아래 끝(대개 바닥)
 * 문    portals [x, toKey]       ↑ 를 누르면 그 사냥터로 걸어 넘어간다
 *               도착 자리는 방향에서 나온다 — 오른쪽 문으로 나가면 다음 맵의 왼쪽 끝
 */
(function (global) {
  'use strict';

  var STAGES = [
    {
      key: 'field', name: '허창 들판', need: 1, sky: ['#3b5570', '#6a86a0'],
      ground: '#4e6b3d', width: 2200, floor: 560,
      plats: [[320, 430, 260], [760, 350, 220], [1180, 440, 300], [1620, 340, 240], [1900, 450, 220]],
      ropes: [[340, 430, 560, 'rope'], [790, 350, 560, 'rope'], [1210, 440, 560, 'rope'],
              [1650, 340, 560, 'rope'], [1930, 450, 560, 'ladder']],
      portals: [[2130, 'forest']],
      enemyLv: 1, spawn: 7,
      /* 보스 — 사냥터 오른쪽 끝을 지킨다. cool 은 잡은 뒤 다시 나오기까지의 분(分).
         hpMul·dmgMul 은 그 사냥터 일반 적 기준의 배수다. */
      boss: { name: '황건 두목', cool: 15, hpMul: 12, dmgMul: 2.0 }
    },
    {
      key: 'forest', name: '오림 숲', need: 5, sky: ['#26402f', '#4a6b4a'],
      ground: '#3d5a34', width: 2600, floor: 560,
      plats: [[260, 450, 220], [620, 360, 200], [980, 280, 220], [1340, 380, 260],
              [1720, 300, 200], [2060, 430, 260]],
      ropes: [[285, 450, 560, 'rope'], [650, 360, 560, 'rope'], [1010, 280, 560, 'rope'],
              [1370, 380, 560, 'ladder'], [1750, 300, 560, 'rope'], [2090, 430, 560, 'ladder']],
      portals: [[70, 'field'], [2530, 'cave']],
      enemyLv: 6, spawn: 9,
      boss: { name: '오랑캐 족장', cool: 20, hpMul: 14, dmgMul: 2.2 }
    },
    {
      key: 'cave', name: '한중 굴혈', need: 12, sky: ['#241d28', '#3d3040'],
      ground: '#332a36', width: 3000, floor: 560,
      plats: [[300, 470, 240], [700, 390, 200], [1080, 300, 240], [1460, 400, 220],
              [1840, 320, 240], [2240, 440, 300]],
      ropes: [[325, 470, 560, 'ladder'], [730, 390, 560, 'ladder'], [1110, 300, 560, 'ladder'],
              [1490, 400, 560, 'rope'], [1870, 320, 560, 'ladder'], [2270, 440, 560, 'ladder']],
      portals: [[70, 'forest']],
      enemyLv: 14, spawn: 11,
      boss: { name: '위군 도독', cool: 30, hpMul: 17, dmgMul: 2.5 }
    }
  ];

  function stage(key) {
    for (var i = 0; i < STAGES.length; i++) { if (STAGES[i].key === key) { return STAGES[i]; } }
    return STAGES[0];
  }

  /** 스킬 — 기력을 쓰고 쿨다운을 기다린다 (던전 게임과 같은 감각) */
  var SKILLS = [
    { key: 'slash', name: '연참(連斬)', emoji: '⚔️', cost: 0,  cd: 0.36,
      desc: '앞을 벤다 (평타)' },
    { key: 'sweep', name: '횡소(橫掃)', emoji: '🌀', cost: 18, cd: 4,
      desc: '주위를 한 바퀴 벤다 · 공격력 180%' },
    { key: 'bolt',  name: '기탄(氣彈)', emoji: '💠', cost: 24, cd: 6,
      desc: '앞으로 기를 날린다 · 관통 · 공격력 210%' },
    { key: 'brace', name: '기합(氣合)', emoji: '🔥', cost: 30, cd: 14,
      desc: '8초간 공격력 +35% · 이동 속도 +20%' }
  ];

  /**
   * 멀리서 쏘는 적 — **무기로 가른다.**
   *
   * `data-enemy.js` 는 던전 게임과 나눠 든 같은 파일이라 여기에 `ranged` 같은 칸을
   * 새로 만들지 않는다(만들면 두 판의 적 데이터가 갈린다). 다행히 그 파일에는
   * 이미 활을 든 적(오랑캐 궁수·여진 궁수·연노 사수·수군 척후선)과 조총병이 있다 —
   * **든 무기가 곧 사거리다.**
   */
  var RANGED_WEAPON = { bow: { name: '화살', spd: 430, mul: 0.8, cd: 2.2, range: 360 },
                        staff: { name: '탄환', spd: 560, mul: 1.0, cd: 3.2, range: 420 } };

  function rangedOf(ref) {
    if (!ref || !ref.look) { return null; }
    return RANGED_WEAPON[ref.look.weapon] || null;
  }

  /** 떨어지는 것 — 밟으면 줍는다 */
  var DROPS = {
    gold:   { name: '금',     emoji: '🪙', color: '#e8c15a' },
    potion: { name: '탕약',   emoji: '🧪', color: '#d0596b' },
    gear:   { name: '장비',   emoji: '📦', color: '#8ab4e8' },
    scroll: { name: '주문서', emoji: '📜', color: '#d8cba0' }
  };

  global.DG = global.DG || {};
  global.DG.sideData = {
    STAGES: STAGES, SKILLS: SKILLS, DROPS: DROPS,
    RANGED_WEAPON: RANGED_WEAPON,
    stage: stage, rangedOf: rangedOf
  };
})(window);
