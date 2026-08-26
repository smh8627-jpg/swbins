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
 *
 * **사냥터를 늘릴 때 같이 봐야 하는 것 둘.**
 *   1) `enemyLv` 가 `data-enemy.js` 의 `tierOf` 를 거쳐 적 풀을 고른다
 *      (~5: 잡졸 · ~12: 변방 · ~25: 정규군 · 26~: 정예). 보스도 같은 tier 에서 고른다
 *   2) `mood` 는 `side-view.js` 의 `drawBackdrop` 이 아는 이름이어야 한다
 *      ('sky'·'forest'·'cave'·'fire'). 모르는 이름을 주면 하늘만 있고 뒤가 빈다
 * 그 둘만 맞으면 나머지(사냥터 시트 · 미니맵 · 어드민 · 자동)는 표를 훑으므로 따라온다.
 */
(function (global) {
  'use strict';

  var STAGES = [
    {
      key: 'field', name: '허창 들판', need: 1, sky: ['#79c3e8', '#c6e6f2'], mood: 'sky',
      ground: '#6faf55', width: 2200, floor: 560,
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
      key: 'forest', name: '오림 숲', need: 5, sky: ['#5fa06a', '#a8d49a'], mood: 'forest',
      ground: '#417a3f', width: 2600, floor: 560,
      plats: [[260, 450, 220], [620, 360, 200], [980, 280, 220], [1340, 380, 260],
              [1720, 300, 200], [2060, 430, 260]],
      ropes: [[285, 450, 560, 'rope'], [650, 360, 560, 'rope'], [1010, 280, 560, 'rope'],
              [1370, 380, 560, 'ladder'], [1750, 300, 560, 'rope'], [2090, 430, 560, 'ladder']],
      portals: [[70, 'field'], [2530, 'cave']],
      enemyLv: 6, spawn: 9,
      boss: { name: '오랑캐 족장', cool: 20, hpMul: 14, dmgMul: 2.2 }
    },
    {
      key: 'cave', name: '한중 굴혈', need: 12, sky: ['#2b2436', '#4a3d58'], mood: 'cave',
      ground: '#3c3145', width: 3000, floor: 560,
      plats: [[300, 470, 240], [700, 390, 200], [1080, 300, 240], [1460, 400, 220],
              [1840, 320, 240], [2240, 440, 300]],
      ropes: [[325, 470, 560, 'ladder'], [730, 390, 560, 'ladder'], [1110, 300, 560, 'ladder'],
              [1490, 400, 560, 'rope'], [1870, 320, 560, 'ladder'], [2270, 440, 560, 'ladder']],
      portals: [[70, 'forest'], [2930, 'gorge']],
      enemyLv: 14, spawn: 11,
      boss: { name: '위군 도독', cool: 30, hpMul: 17, dmgMul: 2.5 }
    },
    {
      /* 넷째 — **가장 깊은 곳**(2026-08-26). 3차 전직(Lv.45)이 설 자리가 없어 넣었다:
         마지막 사냥터가 Lv.12 에 열려 있었으니 무예를 스물 더 얹어 놓고 쓸 데가 없었다.
         2차 전직과 같은 Lv.25 에 열리고, **적은 처음으로 tier 4 정예**다
         (`enemyLv` 26 → `data-enemy.js` 의 tierOf 가 4를 준다 — 철갑 중장병 · 흑기병 ·
         연노 사수 · 근위 기병 · 수군 함대). 2차로 들어와 3차로 걸어 나가는 곳이다.

         지형도 가장 험하다 — 발판이 일곱이고 **바닥이 가장 좁다**. 불길이 오르는
         골짜기라 오래 서 있을 자리를 주지 않는 것이 이 사냥터의 성격이다. */
      key: 'gorge', name: '호로곡(葫蘆谷)', need: 25, sky: ['#3a1410', '#8f3a1c'], mood: 'fire',
      ground: '#4a2a20', width: 3400, floor: 560,
      plats: [[260, 480, 200], [600, 400, 180], [940, 310, 200], [1300, 420, 180],
              [1640, 330, 200], [2000, 250, 180], [2360, 400, 220], [2740, 320, 200]],
      ropes: [[285, 480, 560, 'rope'], [630, 400, 560, 'ladder'], [970, 310, 560, 'rope'],
              [1330, 420, 560, 'rope'], [1670, 330, 560, 'ladder'], [2030, 250, 560, 'rope'],
              [2390, 400, 560, 'ladder'], [2770, 320, 560, 'rope']],
      portals: [[70, 'cave']],
      enemyLv: 26, spawn: 13,
      boss: { name: '적국 대장군', cool: 40, hpMul: 20, dmgMul: 2.8 }
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
