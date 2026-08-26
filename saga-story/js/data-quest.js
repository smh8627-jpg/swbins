/**
 * 사명(使命) — 원작의 퀘스트
 * ---------------------------------------------------------------
 * 원작에서 사냥 다음으로 손이 자주 가던 것이 퀘스트다. 이 판에는 그 축이 없어
 * 사냥터에 들어갈 이유가 '경험치' 하나뿐이었다.
 *
 * 한 자리 = { key, name, need(레벨), goal, desc, reward }
 *   goal.type  'kill'  아무 적 n 마리          (stage 를 적으면 그 사냥터에서만)
 *              'boss'  보스 n 번
 *              'gear'  장비를 n 가지 갖추기 (낀 것 기준)
 *              'skill' 무예 레벨 합 n
 *              'gold'  금 n
 *              'level' 레벨 n
 *   reward     { exp, gold, potion, scroll, gear }
 *
 * **되받는 사명 셋**(`repeat: true`)은 바친 뒤 다시 받을 수 있다 — 원작의 반복 퀘스트다.
 */
(function (global) {
  'use strict';

  var QUESTS = [
    { key: 'q_first', name: '첫 사냥', need: 1, repeat: false,
      goal: { type: 'kill', n: 10 },
      desc: '허창 들판에 나가 열을 베고 오라.',
      reward: { exp: 60, gold: 200, potion: 3 } },

    { key: 'q_field', name: '들판을 비운다', need: 3, repeat: false,
      goal: { type: 'kill', n: 40, stage: 'field' },
      desc: '허창 들판의 적 마흔.',
      reward: { exp: 220, gold: 700, scroll: 'def100' } },

    { key: 'q_gear1', name: '몸을 갖춘다', need: 4, repeat: false,
      goal: { type: 'gear', n: 3 },
      desc: '무엇이든 세 자리를 채워 입어라. 맨몸으로는 오래 못 버틴다.',
      reward: { exp: 180, gold: 600, potion: 5 } },

    { key: 'q_boss1', name: '두목의 목', need: 5, repeat: false,
      goal: { type: 'boss', n: 1 },
      desc: '사냥터 안쪽을 지키는 자를 하나 베어라.',
      reward: { exp: 400, gold: 1200, scroll: 'atk60' } },

    { key: 'q_forest', name: '오림의 그늘', need: 6, repeat: false,
      goal: { type: 'kill', n: 60, stage: 'forest' },
      desc: '오림 숲의 적 예순.',
      reward: { exp: 700, gold: 2000, potion: 8 } },

    { key: 'q_job', name: '길을 정한다', need: 10, repeat: false,
      goal: { type: 'skill', n: 1 },
      desc: '전직하고 무예에 점을 한 번 부어라.',
      reward: { exp: 500, gold: 1500, scroll: 'hp60' } },

    { key: 'q_gold1', name: '군자금', need: 8, repeat: false,
      goal: { type: 'gold', n: 8000 },
      desc: '금 팔천을 모아 보여라.',
      reward: { exp: 600, gold: 0, scroll: 'atk10' } },

    { key: 'q_cave', name: '굴혈로', need: 12, repeat: false,
      goal: { type: 'kill', n: 90, stage: 'cave' },
      desc: '한중 굴혈의 적 아흔.',
      reward: { exp: 1800, gold: 5000, scroll: 'def60' } },

    { key: 'q_gear2', name: '온몸을 갖춘다', need: 14, repeat: false,
      goal: { type: 'gear', n: 7 },
      desc: '일곱 자리를 다 채워 입어라.',
      reward: { exp: 2200, gold: 6000, scroll: 'hp10' } },

    { key: 'q_master', name: '무예를 익힌다', need: 18, repeat: false,
      goal: { type: 'skill', n: 20 },
      desc: '무예 레벨의 합이 스물에 이르도록 익혀라.',
      reward: { exp: 3000, gold: 8000, scroll: 'atk10' } },

    /* 되받는 셋 — 바친 뒤 다시 받는다 */
    { key: 'r_hunt', name: '토벌령(討伐令)', need: 3, repeat: true,
      goal: { type: 'kill', n: 30 },
      desc: '어디서든 서른을 베어 오라. 관아는 늘 사람이 모자란다.',
      reward: { exp: 260, gold: 900, potion: 3 } },

    { key: 'r_boss', name: '수급(首級)', need: 7, repeat: true,
      goal: { type: 'boss', n: 2 },
      desc: '두목 둘의 목을 가져오라.',
      reward: { exp: 900, gold: 2600, scroll: 'def60' } },

    { key: 'r_purse', name: '군량 조달', need: 9, repeat: true,
      goal: { type: 'gold', n: 4000 },
      desc: '금 사천을 마련해 보여라. (바쳐도 금은 줄지 않는다)',
      reward: { exp: 700, gold: 0, potion: 6 } }
  ];

  function find(key) {
    for (var i = 0; i < QUESTS.length; i++) { if (QUESTS[i].key === key) { return QUESTS[i]; } }
    return null;
  }

  global.DG = global.DG || {};
  global.DG.questData = { QUESTS: QUESTS, find: find };
})(window);
