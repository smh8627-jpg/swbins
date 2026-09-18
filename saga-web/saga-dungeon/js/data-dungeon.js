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
   * 축복(祝福) — PLAN §5.1(2026-09-18, 은사를 회차 빌드로 재해석).
   * 옛 은사(BOONS)는 전부 스탯 %(공격력·체력·속도…)라 "뭘 골라도 같았다" —
   * 그 자리를 세 축으로 대신한다. `axis`(skill/hero/world)·`rarity`
   * (common/rare/legendary) 로 나뉘고, `dungeon.js` `rollBoonChoice()`가
   * 축마다 하나씩 뽑아 세 장을 만든다(같은 축이 두 번 나올 수 없다 —
   * 축 하나에 후보 하나씩 뽑는 구조라 자동으로 충족된다).
   *
   *   skill 축   걸어 둔 무예의 모양(shape)을 강화한다 — 모양별로 common
   *              1개 + legendary 1개(수치 2배 + skillPct 보너스 합성).
   *              "무예 4칸 중 하나"가 아니라 **그 모양을 쓰는 무예 전부**에
   *              걸린다(어느 칸인지 세이브·UI로 추적하지 않는 단순화 —
   *              PLAN §5.1 원문보다 후하지만 로그라이트 특성상 문제 없다).
   *   hero  축   서명 무예(activeSigSkill)를 강화 — 쿨감/위력/그림자 서명.
   *   world 축   원소 시너지 12조합 — 실제 판정은 dungeon.js strike()/kill()
   *              안의 전용 분기(worldSynergy*)가 한다. eff 는 legendary
   *              둘만 "두 효과 합성"의 둘째 효과(skillPct)로 쓰인다.
   *
   *   max   같은 축복을 몇 번까지 겹칠 수 있는지 — 새 축복은 전부 1(다시
   *         안 나온다). 옛 %스탯 은사와 달리 "몇 겹" 개념이 없다.
   *   eff   dungeon.js 가 boonVal(key)로 읽는 범용 수치(있으면 합산).
   *         world 축의 특수 판정(화상·시너지 피해 등)은 eff가 아니라
   *         run.boons에 키가 있는지(hasBoon)만으로 켜진다.
   *
   * 대가로 옛 체계가 주던 hpPct·atkPct 같은 순수 스탯 성장은 사라졌다 —
   * 생존력 성장은 §5.2(유품)·§5.8(손맛)이 다른 축에서 맡는 쪽으로
   * 사용자와 방향을 맞췄다(HANDOFF 2026-09-18 참고).
   */
  var BOONS = [
    /* ── 무예 축 — 모양 아홉 × (common·legendary) ────────────── */
    { key: 'sk_swing_c', axis: 'skill', rarity: 'common', shape: 'swing', max: 1,
      name: '검세 확장(劍勢)', emoji: '⚔️', desc: '베기(swing) 무예의 범위 +25%',
      eff: { swingRangePct: 25 } },
    { key: 'sk_swing_l', axis: 'skill', rarity: 'legendary', shape: 'swing', max: 1,
      name: '검세 극(劍勢極)', emoji: '⚔️', desc: '베기 무예의 범위 +50% · 무예 위력 +10%',
      eff: { swingRangePct: 50, skillPct: 10 } },
    { key: 'sk_bolt_c', axis: 'skill', rarity: 'common', shape: 'bolt', max: 1,
      name: '연사(連射)', emoji: '🏹', desc: '기공탄(bolt) 무예가 +1발 나간다',
      eff: { boltShotAdd: 1 } },
    { key: 'sk_bolt_l', axis: 'skill', rarity: 'legendary', shape: 'bolt', max: 1,
      name: '연사 극(連射極)', emoji: '🏹', desc: '기공탄 무예가 +2발 · 무예 위력 +10%',
      eff: { boltShotAdd: 2, skillPct: 10 } },
    { key: 'sk_nova_c', axis: 'skill', rarity: 'common', shape: 'nova', max: 1,
      name: '이중 파동(二重波動)', emoji: '💥', desc: '터짐(nova) 무예가 한 번 더 터진다',
      eff: { novaExtraRing: 1 } },
    { key: 'sk_nova_l', axis: 'skill', rarity: 'legendary', shape: 'nova', max: 1,
      name: '삼중 파동(三重波動)', emoji: '💥', desc: '터짐 무예가 두 번 더 터진다 · 무예 위력 +10%',
      eff: { novaExtraRing: 2, skillPct: 10 } },
    { key: 'sk_dash_c', axis: 'skill', rarity: 'common', shape: 'dash', max: 1,
      name: '신법 가속(身法)', emoji: '🏃', desc: '돌진(dash) 무예의 무적 시간 +0.1초',
      eff: { dashInvulnAdd: 0.1 } },
    { key: 'sk_dash_l', axis: 'skill', rarity: 'legendary', shape: 'dash', max: 1,
      name: '신법 극(身法極)', emoji: '🏃', desc: '돌진 무예의 무적 시간 +0.2초 · 무예 위력 +10%',
      eff: { dashInvulnAdd: 0.2, skillPct: 10 } },
    { key: 'sk_chain_c', axis: 'skill', rarity: 'common', shape: 'chain', max: 1,
      name: '연환 확장(連環)', emoji: '🔗', desc: '연환(chain) 무예가 +2번 더 튄다',
      eff: { chainHopsAdd: 2 } },
    { key: 'sk_chain_l', axis: 'skill', rarity: 'legendary', shape: 'chain', max: 1,
      name: '연환 극(連環極)', emoji: '🔗', desc: '연환 무예가 +4번 더 튄다 · 무예 위력 +10%',
      eff: { chainHopsAdd: 4, skillPct: 10 } },
    { key: 'sk_summon_c', axis: 'skill', rarity: 'common', shape: 'summon', max: 1,
      name: '분신 증원(分身增員)', emoji: '👥', desc: '분신(summon) 무예의 소환 수 +1',
      eff: { summonCountAdd: 1 } },
    { key: 'sk_summon_l', axis: 'skill', rarity: 'legendary', shape: 'summon', max: 1,
      name: '분신 극(分身極)', emoji: '👥', desc: '분신 무예의 소환 수 +2 · 무예 위력 +10%',
      eff: { summonCountAdd: 2, skillPct: 10 } },
    { key: 'sk_curse_c', axis: 'skill', rarity: 'common', shape: 'curse', max: 1,
      name: '저주 지속(呪縛)', emoji: '🕸️', desc: '저주(curse) 무예의 지속시간 +40%',
      eff: { curseDurPct: 40 } },
    { key: 'sk_curse_l', axis: 'skill', rarity: 'legendary', shape: 'curse', max: 1,
      name: '저주 극(呪縛極)', emoji: '🕸️', desc: '저주 무예의 지속시간 +80% · 무예 위력 +10%',
      eff: { curseDurPct: 80, skillPct: 10 } },
    { key: 'sk_heal_c', axis: 'skill', rarity: 'common', shape: 'heal', max: 1,
      name: '치유 증폭(治癒)', emoji: '🌿', desc: '치유(heal) 무예의 회복량 +30%',
      eff: { healBonusPct: 30 } },
    { key: 'sk_heal_l', axis: 'skill', rarity: 'legendary', shape: 'heal', max: 1,
      name: '치유 극(治癒極)', emoji: '🌿', desc: '치유 무예의 회복량 +60% · 무예 위력 +10%',
      eff: { healBonusPct: 60, skillPct: 10 } },
    { key: 'sk_buff_c', axis: 'skill', rarity: 'common', shape: 'buff', max: 1,
      name: '기세 지속(氣勢)', emoji: '🔥', desc: '기세(buff) 무예의 지속시간 +50%',
      eff: { buffDurPct: 50 } },
    { key: 'sk_buff_l', axis: 'skill', rarity: 'legendary', shape: 'buff', max: 1,
      name: '기세 극(氣勢極)', emoji: '🔥', desc: '기세 무예의 지속시간 +100% · 무예 위력 +10%',
      eff: { buffDurPct: 100, skillPct: 10 } },

    /* ── 인물 축 — 서명 무예 강화 ────────────────────────────── */
    { key: 'hr_cd_c', axis: 'hero', rarity: 'common', max: 1,
      name: '심법 단축(心法)', emoji: '👤', desc: '서명 무예 쿨다운 -25%',
      eff: { sigCdPct: 25 } },
    { key: 'hr_dmg_c', axis: 'hero', rarity: 'common', max: 1,
      name: '심법 증폭(心法增幅)', emoji: '👤', desc: '서명 무예 위력 +40% · 발동 시 부대 전원 흔들림',
      eff: { sigDmgPct: 40 } },
    { key: 'hr_cd_r', axis: 'hero', rarity: 'rare', max: 1,
      name: '심법 단축 상(心法上)', emoji: '👤', desc: '서명 무예 쿨다운 -32%',
      eff: { sigCdPct: 32 } },
    { key: 'hr_dmg_r', axis: 'hero', rarity: 'rare', max: 1,
      name: '심법 증폭 상(心法增幅上)', emoji: '👤', desc: '서명 무예 위력 +50% · 발동 시 부대 전원 흔들림',
      eff: { sigDmgPct: 50 } },
    { key: 'hr_combo_l', axis: 'hero', rarity: 'legendary', max: 1,
      name: '심법 대성(心法大成)', emoji: '👤', desc: '서명 무예 쿨다운 -15% · 위력 +25% (합성)',
      eff: { sigCdPct: 15, sigDmgPct: 25 } },
    { key: 'hr_shadow_l', axis: 'hero', rarity: 'legendary', max: 1,
      name: '그림자 서명(影銘)', emoji: '🌑', desc: '부대 3~5번째 인물의 서명 무예가 20% 확률로 평타에 얹힌다',
      eff: { shadowSigPct: 20 } },

    /* ── 세계 축 — 원소 시너지 12조합. 실제 판정은 dungeon.js
       worldSynergyStrike()/worldSynergyOnKill() — eff 는 legendary 둘의
       "두 효과 합성" 둘째 효과(skillPct)에만 쓰인다. */
    { key: 'wd_fire_lit', axis: 'world', rarity: 'common', max: 1, pair: ['fire', 'lit'],
      name: '폭발(爆發)', emoji: '💥', desc: '화+뇌 — 처치 시 반경 80 안 적에게 화상을 건다', eff: {} },
    { key: 'wd_cold_chi', axis: 'world', rarity: 'common', max: 1, pair: ['cold', 'chi'],
      name: '결빙(結氷)', emoji: '❄️', desc: '빙+기 — 슬로우된 적에게 주는 피해 +30%', eff: {} },
    { key: 'wd_phys_fire', axis: 'world', rarity: 'common', max: 1, pair: ['phys', 'fire'],
      name: '작열(灼熱)', emoji: '🔥', desc: '물리+화 — 콤보 6 이상에서 물리 타격에 화상이 붙는다', eff: {} },
    { key: 'wd_phys_cold', axis: 'world', rarity: 'common', max: 1, pair: ['phys', 'cold'],
      name: '빙인(氷刃)', emoji: '🗡️', desc: '물리+빙 — 치명타가 대상을 얼려 슬로우를 건다', eff: {} },
    { key: 'wd_phys_chi', axis: 'world', rarity: 'common', max: 1, pair: ['phys', 'chi'],
      name: '경혈(經穴)', emoji: '🌀', desc: '물리+기 — 3연속 타격마다 기력을 되찾는다', eff: {} },
    { key: 'wd_phys_pois', axis: 'world', rarity: 'common', max: 1, pair: ['phys', 'pois'],
      name: '부패(腐敗)', emoji: '☠️', desc: '물리+독 — 처치 시 반경 80 안 적에게 독을 퍼뜨린다', eff: {} },
    { key: 'wd_pois_emp', axis: 'world', rarity: 'rare', max: 1, pair: ['pois', 'emp'],
      name: '부식(腐蝕)', emoji: '🧪', desc: '독+전자 — 적의 저항 -20', eff: {} },
    { key: 'wd_phys_lit', axis: 'world', rarity: 'rare', max: 1, pair: ['phys', 'lit'],
      name: '감전(感電)', emoji: '⚡', desc: '물리+뇌 — 처치 시 가까운 적 하나에게 번개가 옮는다', eff: {} },
    { key: 'wd_phys_emp', axis: 'world', rarity: 'rare', max: 1, pair: ['phys', 'emp'],
      name: '저지(沮止)', emoji: '🧲', desc: '물리+전자 — 처치 시 반경 80 안 적을 슬로우 건다', eff: {} },
    { key: 'wd_fire_cold', axis: 'world', rarity: 'rare', max: 1, pair: ['fire', 'cold'],
      name: '빙염(氷炎)', emoji: '🌡️', desc: '화+빙 — 화상과 슬로우가 겹친 적에게 피해 +15%', eff: {} },
    { key: 'wd_fire_chi', axis: 'world', rarity: 'legendary', max: 1, pair: ['fire', 'chi'],
      name: '폭기(爆氣)', emoji: '💫', desc: '화+기 — 치명타가 반경 80 안 적에게 화상을 퍼뜨린다 · 무예 위력 +8%',
      eff: { skillPct: 8 } },
    { key: 'wd_cold_lit', axis: 'world', rarity: 'legendary', max: 1, pair: ['cold', 'lit'],
      name: '뇌빙(雷氷)', emoji: '🌩️', desc: '빙+뇌 — 슬로우된 적을 치면 반드시 치명타 · 무예 위력 +8%',
      eff: { skillPct: 8 } }
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
    { key: 'puzzle',   weight: 6 },    // 퍼즐방(POI: Puzzle) — 제단 셋을 맞는 순서로 밟는다
    { key: 'event',    weight: 7 },    // 이벤트방(POI: Event, PLAN 35절 "NPC Rescue") — 잡혀 있는 이를 구한다
    { key: 'forage',   weight: 8 }     // 채집·낚시방(POI: Forage, PLAN 12절, 2026-08-30 추가) — 약초 셋 + 못 하나
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
