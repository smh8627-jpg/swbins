/**
 * 직업과 무예 — 전직 · 스킬 트리
 * ---------------------------------------------------------------
 * 메이플의 성장 골격이다:
 *   1) 처음엔 **무명(초보자)**. 정해진 네 가지만 쓴다
 *   2) Lv.10 에 **1차 전직** — 직업 넷 중 하나를 고른다 (되돌릴 수 없다)
 *   3) Lv.25 에 **2차 전직** — 같은 갈래의 윗자리로 오르고 무예 둘이 열린다
 *   4) 레벨마다 **무예 점수(SP) 3점**. 점수를 부어 무예를 올린다
 *
 * **SP 는 세이브에 따로 담지 않는다.** 총점은 (레벨-1)×3 이고 쓴 점수는 찍은
 * 무예 레벨의 합이다 — 파생값이라 옛 세이브도 그냥 맞는다(core.js 를 안 건드린다).
 *
 * 무예 하나의 힘은 `mul = [기본, 레벨당]` 이다. 레벨 0 이면 **못 쓴다**(원작 그대로).
 * 무명의 넷만 `max: 0` — 찍지 않아도 늘 쓸 수 있는 고정 무예다.
 */
(function (global) {
  'use strict';

  /* 갈래 넷. tier 1 은 Lv.10, tier 2 는 Lv.25 에 오른다. */
  var JOBS = [
    { key: 'none', name: '무명(無名)', emoji: '🚶', tier: 0, need: 0, from: null,
      desc: '아직 길을 정하지 않았다' },

    { key: 'warrior', name: '무사(武士)', emoji: '⚔️', tier: 1, need: 10, from: 'none',
      grow: { hp: 40, atk: 2 }, desc: '붙어서 벤다 — 체력이 두텁다' },
    { key: 'archer',  name: '궁수(弓手)', emoji: '🏹', tier: 1, need: 10, from: 'none',
      grow: { hp: 10, atk: 5 }, desc: '멀리서 쏜다 — 궁수 적과 같은 자리에서 싸운다' },
    { key: 'rogue',   name: '협객(俠客)', emoji: '🗡️', tier: 1, need: 10, from: 'none',
      grow: { hp: 18, atk: 4 }, desc: '빠르게 여러 번 벤다' },
    { key: 'mage',    name: '방사(方士)', emoji: '🔮', tier: 1, need: 10, from: 'none',
      grow: { hp: 12, atk: 3, mp: 40 }, desc: '도술을 부린다 — 기력이 깊다' },

    { key: 'general', name: '장군(將軍)', emoji: '🛡️', tier: 2, need: 25, from: 'warrior',
      grow: { hp: 110, atk: 7 }, desc: '무사의 윗자리' },
    { key: 'sniper',  name: '신궁(神弓)', emoji: '🎯', tier: 2, need: 25, from: 'archer',
      grow: { hp: 40, atk: 14 }, desc: '궁수의 윗자리' },
    { key: 'assassin', name: '자객(刺客)', emoji: '🥷', tier: 2, need: 25, from: 'rogue',
      grow: { hp: 55, atk: 11 }, desc: '협객의 윗자리' },
    { key: 'sage',    name: '도사(道士)', emoji: '☯️', tier: 2, need: 25, from: 'mage',
      grow: { hp: 45, atk: 9, mp: 90 }, desc: '방사의 윗자리' }
  ];

  /**
   * 무예. `effect` 가 side.js 가 아는 손잡이다:
   *   melee 앞을 벤다 · aoe 주위 · bolt 꿰뚫는 것 · arrow 첫 하나만 · volley 여러 발
   *   buff 잠깐 세진다 · heal 몸을 추스른다 · dash 밀고 나간다 · rain 앞쪽에 쏟는다
   */
  var SKILLS = [
    /* 무명 — 찍지 않아도 쓰는 넷 (이 판이 처음부터 갖고 있던 그 넷이다) */
    { key: 'slash', job: 'none', name: '연참(連斬)', emoji: '⚔️', cost: 0, cd: 0.36, max: 0,
      effect: 'melee', mul: [1.0, 0], desc: '앞을 벤다 (평타)' },
    { key: 'sweep', job: 'none', name: '횡소(橫掃)', emoji: '🌀', cost: 18, cd: 4, max: 0,
      effect: 'aoe', mul: [1.8, 0], r: 117, desc: '주위를 한 바퀴 벤다' },
    { key: 'bolt', job: 'none', name: '기탄(氣彈)', emoji: '💠', cost: 24, cd: 6, max: 0,
      effect: 'bolt', mul: [2.1, 0], desc: '앞으로 기를 날린다 · 관통' },
    { key: 'brace', job: 'none', name: '기합(氣合)', emoji: '🔥', cost: 30, cd: 14, max: 0,
      effect: 'buff', mul: [0, 0], buff: { sec: 8, atk: 1.35, speed: 1.2 },
      desc: '8초간 공격 +35% · 이동 +20%' },

    /* 무사 → 장군 */
    { key: 'w_cut', job: 'warrior', name: '참격(斬擊)', emoji: '🗡️', cost: 6, cd: 0.5, max: 10,
      effect: 'melee', mul: [1.15, 0.09], desc: '앞을 깊게 벤다' },
    { key: 'w_whirl', job: 'warrior', name: '선풍(旋風)', emoji: '🌪️', cost: 20, cd: 3.6, max: 10,
      effect: 'aoe', mul: [1.6, 0.14], r: 128, desc: '몸을 돌려 주위를 쓸어 벤다' },
    { key: 'w_rush', job: 'warrior', name: '돌진(突進)', emoji: '💨', cost: 24, cd: 6, max: 10,
      effect: 'dash', mul: [1.8, 0.16], dist: 210, desc: '앞으로 밀고 나가며 벤다' },
    { key: 'w_iron', job: 'warrior', name: '철갑(鐵甲)', emoji: '🛡️', cost: 28, cd: 16, max: 10,
      effect: 'buff', mul: [0, 0], buff: { sec: 9, atk: 1.2, guard: 0.35 },
      desc: '9초간 덜 맞고 공격 +20%' },
    { key: 'g_smash', job: 'general', name: '패왕격(霸王擊)', emoji: '💥', cost: 40, cd: 9, max: 10,
      effect: 'melee', mul: [3.4, 0.3], hits: 2, need: { key: 'w_cut', lv: 5 },
      desc: '앞을 두 번 내리친다 — 참격 5' },
    { key: 'g_roar', job: 'general', name: '함성(喊聲)', emoji: '📣', cost: 34, cd: 14, max: 10,
      effect: 'aoe', mul: [2.4, 0.2], r: 190, need: { key: 'w_whirl', lv: 5 },
      desc: '고함으로 사방을 친다 — 선풍 5' },

    /* 궁수 → 신궁 */
    { key: 'a_shot', job: 'archer', name: '사격(射擊)', emoji: '🏹', cost: 8, cd: 0.6, max: 10,
      effect: 'arrow', mul: [1.3, 0.11], desc: '화살 하나를 날린다' },
    { key: 'a_double', job: 'archer', name: '연사(連射)', emoji: '🎯', cost: 22, cd: 3.4, max: 10,
      effect: 'volley', mul: [1.1, 0.08], shots: 3, desc: '화살 셋을 잇달아 쏜다' },
    { key: 'a_pierce', job: 'archer', name: '관통시(貫通矢)', emoji: '➶', cost: 26, cd: 6, max: 10,
      effect: 'bolt', mul: [2.0, 0.18], desc: '줄지어 선 것을 꿰뚫는다' },
    { key: 'a_eye', job: 'archer', name: '응안(鷹眼)', emoji: '🦅', cost: 30, cd: 16, max: 10,
      effect: 'buff', mul: [0, 0], buff: { sec: 9, atk: 1.4 },
      desc: '9초간 공격 +40%' },
    { key: 's_rain', job: 'sniper', name: '전우(箭雨)', emoji: '🌧️', cost: 42, cd: 10, max: 10,
      effect: 'rain', mul: [2.6, 0.24], need: { key: 'a_shot', lv: 5 },
      desc: '앞쪽에 화살을 쏟는다 — 사격 5' },
    { key: 's_snipe', job: 'sniper', name: '일점사(一點射)', emoji: '🔭', cost: 36, cd: 8, max: 10,
      effect: 'bolt', mul: [4.0, 0.34], need: { key: 'a_pierce', lv: 5 },
      desc: '한 발에 힘을 모은다 — 관통시 5' },

    /* 협객 → 자객 */
    { key: 'r_twin', job: 'rogue', name: '쌍참(雙斬)', emoji: '⚡', cost: 7, cd: 0.42, max: 10,
      effect: 'melee', mul: [0.72, 0.06], hits: 2, desc: '앞을 두 번 긋는다' },
    { key: 'r_knife', job: 'rogue', name: '비도(飛刀)', emoji: '🔪', cost: 18, cd: 2.6, max: 10,
      effect: 'volley', mul: [1.0, 0.09], shots: 2, desc: '표창 둘을 던진다' },
    { key: 'r_step', job: 'rogue', name: '은신보(隱身步)', emoji: '👣', cost: 22, cd: 7, max: 10,
      effect: 'dash', mul: [1.2, 0.1], dist: 260, invuln: 0.7,
      desc: '한 걸음에 빠져나간다 — 잠깐 맞지 않는다' },
    { key: 'r_vital', job: 'rogue', name: '급소(急所)', emoji: '🎴', cost: 26, cd: 15, max: 10,
      effect: 'buff', mul: [0, 0], buff: { sec: 8, atk: 1.55 },
      desc: '8초간 공격 +55%' },
    { key: 'x_storm', job: 'assassin', name: '난무(亂舞)', emoji: '🌀', cost: 38, cd: 8, max: 10,
      effect: 'melee', mul: [1.5, 0.13], hits: 4, need: { key: 'r_twin', lv: 5 },
      desc: '앞을 네 번 긋는다 — 쌍참 5' },
    { key: 'x_fan', job: 'assassin', name: '만천화우(滿天花雨)', emoji: '🎇', cost: 40, cd: 9, max: 10,
      effect: 'volley', mul: [1.4, 0.12], shots: 5, need: { key: 'r_knife', lv: 5 },
      desc: '표창 다섯을 흩뿌린다 — 비도 5' },

    /* 방사 → 도사 */
    { key: 'm_fire', job: 'mage', name: '화구(火球)', emoji: '🔥', cost: 12, cd: 0.9, max: 10,
      effect: 'bolt', mul: [1.5, 0.13], desc: '불덩이를 굴린다 · 관통' },
    { key: 'm_bolt', job: 'mage', name: '뇌전(雷電)', emoji: '⚡', cost: 26, cd: 4, max: 10,
      effect: 'aoe', mul: [1.9, 0.17], r: 165, desc: '벼락이 주위에 떨어진다' },
    { key: 'm_heal', job: 'mage', name: '치유(治癒)', emoji: '💚', cost: 34, cd: 11, max: 10,
      effect: 'heal', mul: [0, 0], heal: [0.18, 0.022], desc: '몸을 추스른다 (체력 18%+)' },
    { key: 'm_talis', job: 'mage', name: '부적(符籍)', emoji: '📿', cost: 30, cd: 16, max: 10,
      effect: 'buff', mul: [0, 0], buff: { sec: 10, atk: 1.25, regen: 2.6 },
      desc: '10초간 공격 +25% · 기력이 빨리 찬다' },
    { key: 'p_quake', job: 'sage', name: '지진(地震)', emoji: '🌋', cost: 44, cd: 10, max: 10,
      effect: 'aoe', mul: [3.2, 0.28], r: 230, need: { key: 'm_bolt', lv: 5 },
      desc: '땅을 흔든다 — 뇌전 5' },
    { key: 'p_beam', job: 'sage', name: '천뢰(天雷)', emoji: '🌩️', cost: 40, cd: 9, max: 10,
      effect: 'rain', mul: [3.0, 0.26], need: { key: 'm_fire', lv: 5 },
      desc: '앞쪽에 벼락을 쏟는다 — 화구 5' }
  ];

  var SP_PER_LEVEL = 3;

  function job(key) {
    for (var i = 0; i < JOBS.length; i++) { if (JOBS[i].key === key) { return JOBS[i]; } }
    return JOBS[0];
  }

  function skill(key) {
    for (var i = 0; i < SKILLS.length; i++) { if (SKILLS[i].key === key) { return SKILLS[i]; } }
    return null;
  }

  /** 그 직업이 쓸 수 있는 무예 (윗자리는 아랫자리 것도 그대로 쓴다) */
  function skillsOf(jobKey) {
    var chain = [], j = job(jobKey);
    while (j) { chain.unshift(j.key); j = j.from ? job(j.from) : null; }
    return SKILLS.filter(function (s) { return chain.indexOf(s.job) >= 0; });
  }

  /** 다음 전직 후보 (없으면 빈 배열) */
  function nextJobs(jobKey) {
    return JOBS.filter(function (j) { return j.from === jobKey; });
  }

  global.DG = global.DG || {};
  global.DG.jobData = {
    JOBS: JOBS, SKILLS: SKILLS, SP_PER_LEVEL: SP_PER_LEVEL,
    job: job, skill: skill, skillsOf: skillsOf, nextJobs: nextJobs
  };
})(window);
