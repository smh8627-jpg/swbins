/* data-rift.js — 비경(祕境) 표 (PLAN §5-3)
 *
 * 마을 밖 "짧은 반복 콘텐츠" — 5층 노드 지도(층마다 2~3 노드 중 하나 고르기), 진입·정예 뒤
 * 축복 3택, 죽으면 나가되 기억 조각은 남는다. 이 파일은 **표만** 든다(규칙은 rift.js).
 *
 * 축복 = 도감 인물이 "서명처럼 지닌 효과 하나"를 이번 비경 동안 빌려 쓰는 것. 효과는 새 계산이
 * 아니라 기존 곱셈·상태의 배율일 뿐이다(side.js 가 mods 를 읽어 한 줄씩 얹는다). 인물 이름은
 * 이미 가명인 HEROES 의 `name` 을 그대로 쓴다(실명 금지 — 표시 글자라서). */
(function (global) {
  'use strict';

  var FLOORS = 5;        // 층 수 — 5층은 늘 수호장(boss)
  var NEED_LV = 5;       // 이 레벨부터 문이 열린다(둘째 사냥터가 열리는 때)
  var MEM_HP_STEP = 0.02;   // 기억 조각 강화 한 단의 최대 체력 배율
  var MEM_HP_MAX = 10;      // 단 수
  var UNLOCK_COST = 6;      // 잠긴 축복 하나를 여는 기억 조각

  /** 노드 종류 — 지도 카드에 그대로 찍히는 글자 */
  var KINDS = {
    battle:   { emoji: '⚔️', name: '전투',   desc: '몰려오는 적을 정해진 수만큼 쓰러뜨린다' },
    elite:    { emoji: '💀', name: '정예',   desc: '크게 불린 정예 하나 — 쓰러뜨리면 축복 3택' },
    treasure: { emoji: '🎁', name: '보물',   desc: '싸움 없이 금과 장비를 얻는다' },
    rest:     { emoji: '🏕️', name: '휴식',   desc: '체력과 기력을 크게 채운다' },
    event:    { emoji: '❓', name: '이벤트', desc: '갈림길 사건 — 골라서 답한다' },
    boss:     { emoji: '🏯', name: '수호장', desc: '비경의 끝을 지키는 관문 수호장' }
  };

  /** 층마다 나올 수 있는 종류(가중은 중복으로) — 첫 층은 부담 없이, 마지막 앞 층에는 쉼터가 보장된다 */
  var FLOOR_POOL = [
    ['battle', 'battle', 'treasure'],
    ['battle', 'elite', 'event', 'treasure'],
    ['battle', 'elite', 'event', 'rest', 'treasure'],
    ['battle', 'elite', 'event', 'rest']
  ];

  /** 전투 층의 목표 처치 수(층 번호 0부터) — 40~60초 안에 끝나는 양 */
  var BATTLE_GOAL = [7, 8, 9, 10];
  var ELITE_ESCORT = 3;     // 정예 곁에 붙는 잡졸 수
  var BOSS_HP_MUL = 26, BOSS_DMG_MUL = 2.6;   // 사냥터 보스(12~20배)와 관문 대장(40배·방패) 사이

  /* 축복 열여덟 — 세 축(atk 공격 / def 방어 / util 유틸) 각 여섯. locked 인 것은 기억 조각으로 연다.
     hero 는 도감 id — 이름은 그때그때 HEROES 에서 읽는다. fx 값은 mods() 가 더해 모은다. */
  var BOONS = [
    { key: 'b_dmg',    axis: 'atk',  hero: 'sg_guanyu',      name: '검세',   desc: '주는 피해 +25%',                fx: { dmg: 0.25 } },
    { key: 'b_crit',   axis: 'atk',  hero: 'sg_zhaoyun',     name: '예리함', desc: '급소 확률 +15%p',               fx: { crit: 0.15 } },
    { key: 'b_critm',  axis: 'atk',  hero: 'jp_yoshitsune',  name: '일격',   desc: '급소 배율 +0.5',                fx: { critMul: 0.5 } },
    { key: 'b_leech',  axis: 'atk',  hero: 'eu_hannibal',    name: '흡혈',   desc: '준 피해의 12% 만큼 체력 회복',   fx: { leech: 0.12 } },
    { key: 'b_boss',   axis: 'atk',  hero: 'wd_genghis',     name: '파죽',   desc: '정예·수호장에게 피해 +40%',      fx: { bossDmg: 0.4 }, locked: true },
    { key: 'b_exec',   axis: 'atk',  hero: 'kr_gwanggaeto',  name: '마무리', desc: '체력 30% 이하 적에게 피해 +50%', fx: { exec: 0.5 }, locked: true },

    { key: 'b_guard',  axis: 'def',  hero: 'kr_yisunsin',    name: '철벽',   desc: '받는 피해 -20%',                fx: { guard: 0.2 } },
    { key: 'b_hp',     axis: 'def',  hero: 'kr_kimyusin',    name: '강건',   desc: '최대 체력 +30% (즉시 채움)',     fx: { hpUp: 0.3 } },
    { key: 'b_regen',  axis: 'def',  hero: 'wd_saladin',     name: '회복',   desc: '초마다 최대 체력 1.2% 회복',     fx: { regen: 0.012 } },
    { key: 'b_shield', axis: 'def',  hero: 'kr_daejoyeong',  name: '방패',   desc: '층마다 첫 피격 하나를 막는다',   fx: { shield: 1 } },
    { key: 'b_inv',    axis: 'def',  hero: 'jp_yukimura',    name: '보호',   desc: '맞은 뒤 무적 +0.5초',            fx: { invuln: 0.5 }, locked: true },
    { key: 'b_revive', axis: 'def',  hero: 'jp_saigo',       name: '불굴',   desc: '쓰러질 때 한 번 40% 로 일어선다', fx: { revive: 1 }, locked: true },

    { key: 'b_speed',  axis: 'util', hero: 'sg_lubu',        name: '질주',   desc: '이동 +15%',                     fx: { speed: 0.15 } },
    { key: 'b_mp',     axis: 'util', hero: 'sg_zhugeliang',  name: '집중',   desc: '기력 회복 ×1.8',                 fx: { mp: 0.8 } },
    { key: 'b_dodge',  axis: 'util', hero: 'sg_zhouyu',      name: '기민',   desc: '회피 식는 시간 -40%',            fx: { dodge: 0.4 } },
    { key: 'b_gold',   axis: 'util', hero: 'wd_mansamusa',   name: '재물',   desc: '얻는 금 +40%',                   fx: { gold: 0.4 } },
    { key: 'b_potion', axis: 'util', hero: 'kr_sejong',      name: '약술',   desc: '탕약 회복 +25%p',                fx: { potion: 0.25 }, locked: true },
    { key: 'b_shard',  axis: 'util', hero: 'eu_davinci',     name: '통찰',   desc: '정예·수호장이 기억 조각 +1',     fx: { shard: 1 }, locked: true }
  ];

  /** 이벤트 노드 — 결정론적이라 씨앗·층으로 종류만 고르고, 선택지의 결과는 rift.js 가 계산한다 */
  var EVENTS = [
    { key: 'altar',  emoji: '🗿', name: '낡은 제단',
      text: '이끼 낀 제단이 붉게 젖어 있다. 피를 바치면 무언가 응답할 것 같다.',
      opts: [{ key: 'give', label: '피를 바친다', hint: '최대 체력의 20%를 잃고 축복 3택' },
             { key: 'pass', label: '지나친다',   hint: '아무 일도 없다' }] },
    { key: 'spring', emoji: '⛲', name: '맑은 샘',
      text: '갈림길 한켠에 맑은 샘이 솟는다.',
      opts: [{ key: 'drink', label: '마신다',     hint: '체력 50% 회복' },
             { key: 'fill',  label: '병에 담는다', hint: '탕약 +2' }] },
    { key: 'gambler', emoji: '🎲', name: '떠돌이 노름꾼',
      text: '"기억 조각 하나를 거시오. 이기면 셋, 지면 그냥 가져가겠소."',
      opts: [{ key: 'bet',  label: '조각 1 을 건다', hint: '절반 확률로 +3 / 잃으면 -1 (조각이 없으면 못 건다)' },
             { key: 'pass', label: '돌아선다',      hint: '아무 일도 없다' }] }
  ];

  /** 주간 변형자 — 주 키 → 하나. 보상이 함께 커진다 */
  var VARIANTS = [
    { key: 'tough',  emoji: '🛡️', name: '단단한 적', desc: '적 체력 +30% · 금·경험치 +50%', enemyHp: 1.3, reward: 1.5 },
    { key: 'fierce', emoji: '🔥', name: '거센 적',   desc: '적 공격 +25% · 수호장이 기억 조각 +1', enemyDmg: 1.25, shardBoss: 1 },
    { key: 'dry',    emoji: '🏜️', name: '메마른 길', desc: '탕약을 못 마신다 · 금·경험치 +60%', noPotion: true, reward: 1.6 },
    { key: 'swift',  emoji: '💨', name: '빠른 걸음', desc: '적 이동 +25% · 금·경험치 +30%', enemySpd: 1.25, reward: 1.3 }
  ];

  function boon(key) {
    for (var i = 0; i < BOONS.length; i++) { if (BOONS[i].key === key) { return BOONS[i]; } }
    return null;
  }

  global.DG = global.DG || {};
  global.DG.riftData = {
    FLOORS: FLOORS, NEED_LV: NEED_LV, MEM_HP_STEP: MEM_HP_STEP, MEM_HP_MAX: MEM_HP_MAX,
    UNLOCK_COST: UNLOCK_COST, KINDS: KINDS, FLOOR_POOL: FLOOR_POOL,
    BATTLE_GOAL: BATTLE_GOAL, ELITE_ESCORT: ELITE_ESCORT,
    BOSS_HP_MUL: BOSS_HP_MUL, BOSS_DMG_MUL: BOSS_DMG_MUL,
    BOONS: BOONS, EVENTS: EVENTS, VARIANTS: VARIANTS, boon: boon
  };
})(window);
