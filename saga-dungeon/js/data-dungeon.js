/**
 * 던전 데이터 — 층 테마 · 방 종류 · 은사(恩賜)
 * ---------------------------------------------------------------
 * 던전은 로그라이크다. 한 회차(run) 안에서만 강해지고, 죽으면 그 회차가 끝난다.
 *
 *   층 테마   층수에 따라 배경·적 성향이 바뀐다 (5층 단위)
 *   방 종류   전투방 · 보물방 · 우물방(회복) · 사당방 · 계단방 · 보스방
 *   은사      층을 깨면 셋 중 하나를 고른다. 회차가 끝나면 사라진다
 *             (영구 강화는 환생 도장(prestige.js) 쪽이 담당한다)
 *
 * 은사를 추가할 때는 BOONS 에 한 줄만 넣는다. dungeon.js 는 eff 를 읽기만 한다.
 */
(function (global) {
  'use strict';

  /** 층 테마 — from 층부터 적용 */
  var THEMES = [
    { from: 1,  name: '고분(古墳)',   floor: '#2a2620', wall: '#4a4238', tint: 'rgba(120,100,70,0.10)' },
    { from: 6,  name: '폐성(廢城)',   floor: '#242830', wall: '#3d4450', tint: 'rgba(90,110,150,0.10)' },
    { from: 11, name: '산채(山寨)',   floor: '#232a24', wall: '#3a4a38', tint: 'rgba(90,140,90,0.10)' },
    { from: 16, name: '수궁(水宮)',   floor: '#1e2a30', wall: '#2f4650', tint: 'rgba(70,140,170,0.12)' },
    { from: 21, name: '지옥문(地獄門)', floor: '#2c1f1f', wall: '#4d2e2e', tint: 'rgba(180,70,60,0.12)' },
    { from: 26, name: '천계(天界)',   floor: '#2a2536', wall: '#453c58', tint: 'rgba(160,130,220,0.12)' }
  ];

  function themeOf(floor) {
    var t = THEMES[0];
    for (var i = 0; i < THEMES.length; i++) { if (floor >= THEMES[i].from) { t = THEMES[i]; } }
    return t;
  }

  /**
   * 은사(恩賜) — 회차 한정 강화.
   *   eff  던전 안에서만 쓰이는 값 (dungeon.js 가 읽는다)
   *   max  같은 은사를 몇 번까지 겹칠 수 있는지
   *   world 로 시작하는 키는 core.effect() 에 그대로 합산된다 (드랍·금 같은 것)
   */
  var BOONS = [
    { key: 'fury',   name: '맹공(猛攻)',   emoji: '⚔️', max: 5,
      desc: '공격력 +18%',            eff: { atkPct: 18 } },
    { key: 'wall',   name: '철벽(鐵壁)',   emoji: '🛡️', max: 5,
      desc: '최대 체력 +20% · 즉시 그만큼 회복', eff: { hpPct: 20, healOnPick: 20 } },
    { key: 'haste',  name: '연격(連擊)',   emoji: '💨', max: 4,
      desc: '공격 속도 +14%',          eff: { atkSpdPct: 14 } },
    { key: 'dash',   name: '질주(疾走)',   emoji: '🏃', max: 3,
      desc: '이동 속도 +16%',          eff: { moveSpdPct: 16 } },
    { key: 'pierce', name: '관통(貫通)',   emoji: '🗡️', max: 4,
      desc: '적 방어를 25% 무시',       eff: { piercePct: 25 } },
    { key: 'drain',  name: '흡혈(吸血)',   emoji: '🩸', max: 4,
      desc: '적을 잡으면 체력 3% 회복',  eff: { drainPct: 3 } },
    { key: 'crit',   name: '일격(一擊)',   emoji: '✨', max: 5,
      desc: '치명타 확률 +8%',          eff: { critPct: 8 } },
    { key: 'reach',  name: '장병(長兵)',   emoji: '📏', max: 3,
      desc: '공격 사거리 +18%',         eff: { reachPct: 18 } },
    { key: 'greed',  name: '재물운(財)',   emoji: '🪙', max: 4,
      desc: '던전에서 얻는 금 +30%',     eff: { goldPct: 30 } },
    { key: 'eye',    name: '탐색안(眼)',   emoji: '🔎', max: 4,
      desc: '좋은 물건이 나올 확률 +20%', eff: { worldFindPct: 20 } },
    { key: 'mend',   name: '회복술(治)',   emoji: '🌿', max: 3,
      desc: '층에 들어설 때 체력 25% 회복', eff: { healOnFloor: 25 } },
    { key: 'ghost',  name: '분신(分身)',   emoji: '👥', max: 3,
      desc: '공격 시 22% 확률로 한 번 더', eff: { echoPct: 22 } },
    { key: 'ward',   name: '수호부(符)',   emoji: '🧿', max: 3,
      desc: '받는 피해 -12%',           eff: { guardPct: 12 } },
    { key: 'scout',  name: '척후(斥候)',   emoji: '🗺️', max: 2,
      desc: '방을 들어서면 그 방이 바로 밝아진다', eff: { reveal: 1 } }
  ];

  function boonByKey(k) {
    for (var i = 0; i < BOONS.length; i++) { if (BOONS[i].key === k) { return BOONS[i]; } }
    return null;
  }

  /** 방마다 놓이는 항아리 수 — 원작에서 부술 것이 방마다 널려 있다 */
  var JARS = { min: 2, max: 5 };

  /** 방 종류 — 층마다 이 비율로 섞인다 */
  var ROOMS = [
    { key: 'fight',    weight: 46 },
    { key: 'trove',    weight: 12 },   // 보물방 — 상자 하나
    { key: 'well',     weight: 10 },   // 우물방 — 체력 회복
    { key: 'shrine',   weight: 16 },   // 사당방 — 은사 하나를 바로 준다
    /* POI(PLAN 11절) — 처음 둘. 잡졸·보물·우물·사당만 있던 문 목록에
       "가 볼 만한 곳" 을 늘린다. 판정은 기존 elite·boss 갈래를 그대로
       재사용한다(정예·보스 자체는 이미 다양화가 끝났다 — 새 규칙이 아니라
       새 자리다) */
    { key: 'elite',    weight: 10 },   // 정예 소굴 — 반드시 정예 하나를 낀다
    { key: 'miniboss', weight: 6 },    // 미니보스 — 부하 없이 혼자, 보스급 노획
    { key: 'cave',     weight: 8 },    // 채광방(POI: Cave) — 광맥을 캐면 세공 재료
    { key: 'merchant', weight: 7 },    // 행상(POI: Merchant) — 이 자리에서만 파는 재고 셋
    { key: 'puzzle',   weight: 6 }     // 퍼즐방(POI: Puzzle) — 제단 셋을 맞는 순서로 밟는다
  ];

  global.DG = global.DG || {};
  global.DG.dungeonData = {
    THEMES: THEMES, BOONS: BOONS, ROOMS: ROOMS, JARS: JARS,
    themeOf: themeOf, boonByKey: boonByKey,
    /** 층당 방 수 · 보스 주기 */
    roomsFor: function (floor) { return 4 + Math.min(5, Math.floor(floor / 3)); },
    isBossFloor: function (floor) { return floor % 3 === 0; }
  };
})(window);
