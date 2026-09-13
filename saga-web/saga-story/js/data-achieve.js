/**
 * 업적 데이터 — 한 번만 터지는 배지(PLAN 33절 "반복 플레이 요소").
 * quest.js 의 반복 목표와 달리 **지금 값**만 본다(쌓아 세지 않는다) — 그래서
 * 이 파일은 조건 판정 로직을 안 갖고(그건 achieve.js), 이름·설명·문턱·보상만 쥔다.
 */
(function (global) {
  'use strict';

  var ACHIEVES = [
    { key: 'a_kill100', name: '백부장', need: 100, feat: 15, emoji: '⚔️',
      desc: '누적 100마리를 벤다.' },
    { key: 'a_kill500', name: '살성(殺星)', need: 500, feat: 40, emoji: '💀',
      desc: '누적 500마리를 벤다.' },
    { key: 'a_boss5', name: '토벌장', need: 5, feat: 30, emoji: '👺',
      desc: '보스를 다섯 번 잡는다.' },
    { key: 'a_lv10', name: '한 사람 몫', need: 10, feat: 15, emoji: '🌱',
      desc: 'Lv.10 에 이른다.' },
    { key: 'a_lv30', name: '노련한 몸', need: 30, feat: 50, emoji: '🌳',
      desc: 'Lv.30 에 이른다.' },
    { key: 'a_gold5000', name: '군자금', need: 5000, feat: 20, emoji: '🪙',
      desc: '금 오천을 지닌다.' },
    { key: 'a_gear7', name: '온몸 무장', need: 7, feat: 25, emoji: '🛡️',
      desc: '장비 일곱 부위를 모두 낀다.' },
    { key: 'a_dex20', name: '박식가', need: 20, feat: 20, emoji: '📖',
      desc: '도감에 스물을 등록한다.' },
    { key: 'a_quest10', name: '믿을 만한 사람', need: 10, feat: 20, emoji: '📋',
      desc: '사명을 열 번 마친다.' }
  ];

  function find(key) {
    for (var i = 0; i < ACHIEVES.length; i++) { if (ACHIEVES[i].key === key) { return ACHIEVES[i]; } }
    return null;
  }

  global.DG = global.DG || {};
  global.DG.achieveData = { ACHIEVES: ACHIEVES, find: find };
})(window);
