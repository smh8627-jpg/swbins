/**
 * 던전 — 로그라이크 (방 단위 진행)
 * ---------------------------------------------------------------
 * 방치 전투(battle.js)와 완전히 별개의 축이다. 이쪽은 **직접 조작** 하고,
 * **죽으면 그 회차가 끝난다**. 그래서 두 축의 규칙을 섞지 않는다.
 *
 *   한 방       화면 하나. 적을 다 잡으면 문이 열린다
 *   문 선택     ⚔️전투 · 🎁보물 · 💧우물 · ⛩️사당 · 🪜계단 중에서 고른다
 *   층 클리어   계단으로 내려가면 은사(恩賜) 셋 중 하나를 고른다
 *   노획물      층을 내려갈 때 · 탈출할 때 확정된다. **죽으면 전부 잃는다**
 *
 * 부대의 힘을 그대로 쓴다 — 공격력은 battle.power().atk, 체력은 def 기반.
 * 그래서 인물을 키우고 장비를 맞추면 던전도 같이 깊어진다(계산이 두 갈래로 갈리지 않게).
 *
 * 화면(dungeon-view.js)은 이 상태를 **그리기만** 한다. 계산은 전부 여기서 한다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var DD = global.DG.dungeonData;

  var ROOM_W = 560, ROOM_H = 360;       // 방의 논리 크기 (화면은 여기에 맞춰 늘린다)
  var WALL = 26;                        // 벽 두께
  var P_R = 13;                         // 플레이어 반지름
  var BASE_SPD = 148;                   // 이동 속도 (단위/초)
  var BASE_ATK_CD = 0.55;               // 공격 간격 (초)
  var BASE_REACH = 34;                  // 공격 사거리
  var ENEMY_CD = 1.15;                  // 적 공격 간격
  /* 몬스터 다양화(PLAN 14절) — 궁수·조총병(`look.weapon` bow·staff)은 붙지
     않고 거리를 두고 쏜다. 보스는 따로 텔레그래프가 있는 지진 강타를 쓴다 */
  var RANGED_STOP = 150;                // 이 거리에서 더 안 다가온다
  var RANGED_MAX = 260;                 // 이보다 멀면 아예 안 쏜다
  var SLAM_WARN = 0.7;                  // 강타 예고 시간(초) — 이 사이에 벗어나면 안 맞는다
  var SLAM_RANGE = 110;                 // 강타 반경
  var SLAM_MUL = 1.8;                   // 강타 배율(평타 대비)
  var MP_MAX = 100;                     // 기력 최대치
  var MP_REGEN = 7;                     // 기력 자연 회복 (초당)
  var MP_ON_KILL = 9;                   // 적을 잡으면 기력 회복

  /**
   * 스킬 — 디아블로식 4버튼. 기력(MP)을 쓰고 쿨다운을 기다린다.
   * 수치는 전부 atkOf()(한 타) 배율이라 부대가 강해지면 스킬도 같이 강해진다.
   */
  /* 스킬 넷을 여기 박아 두던 표는 **2026-08-26 에 무예(武藝)로 옮겼다** —
     직업마다 아홉씩 마흔다섯이 되었고, 어느 넷을 손에 드는지는 사람이 고른다
     (data-skill.js · skill.js). 이 상수는 "칸이 넷" 이라는 사실만 남긴다. */
  var SKILL_SLOTS = 4;
  var RALLY_SEC = 6;

  var run = null;                       // 진행 중인 회차 (없으면 null)
  var input = { dx: 0, dy: 0 };         // 키보드 입력
  var target = null;                    // 클릭 이동 목표 {x, y}
  var fx = [];                          // 연출용 (화면이 읽는다)

  /**
   * 소리 한 마디 (sfx.js). fx 와 같은 자리에서 부른다 —
   * **판정은 여기서 끝나고, 보이는 것과 들리는 것은 곁가지**라는 뜻이다.
   * 소리 모듈이 없어도 게임은 그대로 돈다.
   */
  function sfx(k, o) {
    var S = global.DG.sfx;
    if (S) { S.play(k, o); }
  }

  /* ── 은사 값 ─────────────────────────────────────────── */

  /**
   * 지금 회차의 은사 합 (없는 키는 0).
   * **선두의 상시 무예도 여기서 더한다** — dungeon.js 의 수치(공격력·체력·사거리·
   * 손 속도·받는 피해)가 전부 이 함수를 거치므로, 한 곳만 얹으면 다 따라온다.
   * 회차 밖에서도 물어볼 수 있게 run 이 없을 때는 무예만 돌려준다.
   */
  function boonVal(key) {
    var skl = global.DG.skill;
    var pass = skl ? skl.passive(leadId(), key) : 0;
    if (!run) { return pass; }
    var sum = pass, k;
    for (k in run.boons) {
      if (!Object.prototype.hasOwnProperty.call(run.boons, k)) { continue; }
      var b = DD.boonByKey(k);
      if (b && b.eff[key]) { sum += b.eff[key] * run.boons[k]; }
    }
    /* 잠깐 걸어 둔 무예(사기·광분·호신강기…) — 시간이 지나면 저절로 사라진다 */
    if (run.buffs && run.buffs[key] && run.buffs[key].t > 0) { sum += run.buffs[key].v; }
    return sum;
  }

  /** 잠깐짜리 버프를 건다 (같은 결이면 센 쪽이 남는다) */
  function addBuff(key, v, sec) {
    if (!run) { return; }
    if (!run.buffs) { run.buffs = {}; }
    var cur = run.buffs[key];
    if (!cur || cur.v <= v) { run.buffs[key] = { v: v, t: sec }; }
    else { cur.t = Math.max(cur.t, sec); }
  }

  /** core.effect() 훅 — 은사 중 '전역' 성격인 것만 내보낸다 */
  function boonEffect() {
    if (!run) { return {}; }
    var find = boonVal('worldFindPct');
    return find ? { findPct: find } : {};
  }

  /* ── 부대에서 끌어오는 수치 ───────────────────────────── */

  function partyPower() {
    return global.DG.hero.partyPower();
  }

  function hpMaxOf() {
    var p = partyPower();
    return Math.max(30, Math.round(p.def * 3 * (1 + boonVal('hpPct') / 100)));
  }

  function atkOf() {
    var p = partyPower();
    return Math.max(4, p.atk * (1 + boonVal('atkPct') / 100) / 6);   // 한 타 기준으로 나눈다
  }

  function reachOf() { return BASE_REACH * (1 + boonVal('reachPct') / 100); }
  function spdOf() { return BASE_SPD * (1 + boonVal('moveSpdPct') / 100); }
  function atkCdOf() { return BASE_ATK_CD / (1 + boonVal('atkSpdPct') / 100); }

  /* ── 적 ───────────────────────────────────────────────── */

  function enemyHp(floor, boss) {
    return Math.round(24 * Math.pow(1.26, floor - 1) * (boss ? 7 : 1) * mode().hp);
  }
  function enemyDmg(floor, boss) {
    return Math.round(5 * Math.pow(1.20, floor - 1) * (boss ? 2.2 : 1) * mode().dmg);
  }

  /**
   * data-enemy.js 의 적을 층에 맞게 하나 고른다.
   * 관문(stage) 기준 풀을 그대로 재사용한다 — 던전 층 ≈ 관문 난이도로 본다.
   */
  function pickEnemyRef(floor, boss) {
    var ed = global.DG.enemyData;
    if (!ed) { return { name: '적', kind: 'beast', form: 'quad', color: '#8a7a6a' }; }
    var pool = ed.poolFor(floor, !!boss);
    return core.pick(pool);
  }

  /* ── 정예(精銳) — 원작(디아블로)의 파란/노란 이름 몬스터 ───
   * 잡졸 중 일부가 접두(接頭)를 하나 달고 나온다. 색이 다르고, 이름 앞에 말이 붙고,
   * 규칙이 하나 달라진다. 잡으면 **장비가 확정으로 떨어진다**(원작과 같다).
   */
  var ELITES = [
    { key: 'swift', name: '날쌘', color: '#6ad9e0', spd: 1.9, cd: 0.55,
      desc: '움직임과 손이 빠르다' },
    { key: 'tough', name: '완강한', color: '#8a9ab2', hp: 2.6,
      desc: '좀처럼 쓰러지지 않는다' },
    { key: 'fierce', name: '사나운', color: '#e06565', dmg: 1.9,
      desc: '한 대가 아프다' },
    { key: 'regen', name: '되살아나는', color: '#7ec96a', regen: 0.035,
      desc: '피가 계속 아문다' },
    { key: 'thorn', name: '가시 돋친', color: '#c98ae0', thorn: 0.22,
      desc: '때리면 되받아친다' },
    { key: 'shade', name: '그림자', color: '#9a7ad9', split: 2,
      desc: '쓰러지면 분신 둘이 남는다' },
    /* 원작의 'Magic Resistant' 자리 — 결 하나가 잘 안 통한다 */
    { key: 'plated', name: '철갑 두른', color: '#9aa3b2', resist: { phys: 35 },
      desc: '칼이 잘 안 든다 (기공파를 쓴다)' },
    { key: 'warded', name: '호신 두른', color: '#6ad9e0', resist: { chi: 45 },
      desc: '기가 잘 안 통한다 (칼로 벤다)' }
  ];

  /* ── 저항(抵抗) ────────────────────────────────────────────
   * 원작에서 "이놈은 불이 안 통한다" 를 아는 순간 손이 바뀐다.
   * 이 판에는 원소가 없어 **때리는 두 결**로 갈랐다 —
   *   물리(物理) 평타·회전참·돌진 · 기(氣) 기공파.
   * 상한은 75% 다. **면역은 두지 않는다** — 원작의 면역은 스킬이 여덟일 때
   * 성립하는 장치인데, 이 판은 넷이고 기(氣)는 하나뿐이라 물리 면역이 뜨면
   * 재냉각만 기다리게 된다.
   */
  var RESIST_CAP = 75;

  /** 선두(부대 첫 인물) — 원작의 인물 하나에 해당하는 자리 */
  function leadId() { return core.save.party[0] || null; }

  /** 지금 무기에 박힌 원소 피해 { fire: n, … } */
  function elemDmgOf() {
    var id = leadId();
    return id ? global.DG.item.elemDamage(id) : {};
  }

  /** 지금 갑주에 박힌 원소 저항 (백분율, 상한 75) */
  function elemResOf(el) {
    var id = leadId();
    if (!id) { return 0; }
    var r = global.DG.item.elemResist(id);
    /* 기수련(氣修) 같은 상시 무예는 **모든 결**에 붙는다 */
    return core.clamp((r[el] || 0) + boonVal('allResPct'), 0, RESIST_CAP);
  }

  function resistOf(e, kind) {
    var n = 0;
    if (e.ref && e.ref.resist && e.ref.resist[kind]) { n += e.ref.resist[kind]; }
    var el = e.elite ? eliteOf(e.elite) : null;
    if (el && el.resist && el.resist[kind]) { n += el.resist[kind]; }
    /* 난도가 오르면 조금 더 버틴다 (원작에서 헬의 내성이 더 높은 그 감각) */
    n += (mode().resist || 0);
    return core.clamp(n, 0, RESIST_CAP);
  }

  function eliteOf(key) {
    for (var i = 0; i < ELITES.length; i++) { if (ELITES[i].key === key) { return ELITES[i]; } }
    return null;
  }

  /** 이 층에서 정예가 나올 확률 — 깊을수록 잦다 */
  function eliteChance(floor) {
    return Math.min(0.30, 0.06 + floor * 0.012);
  }

  function spawnEnemy(floor, boss, opts) {
    opts = opts || {};
    var ref = pickEnemyRef(floor, boss);
    var hp = enemyHp(floor, boss);
    var dmg = enemyDmg(floor, boss);
    var r = boss ? 22 : 13;

    /* 정예 — 보스는 이미 특별하므로 붙이지 않는다. 분신에도 안 붙는다.
       `opts.forceElite` 는 정예 소굴(POI)이 "반드시 하나는 정예" 를 보장할 때
       쓴다 — 안 쓰면 옛 확률 그대로다(값 규약을 안 깬다) */
    var elite = null;
    if (!boss && !opts.spawned && (opts.forceElite || Math.random() < eliteChance(floor))) {
      elite = core.pick(ELITES);
      hp = Math.round(hp * (elite.hp || 1.35));
      dmg = Math.round(dmg * (elite.dmg || 1.15));
      r = 16;
    }
    if (opts.shade) {                    // 그림자의 분신 — 작고 약하다
      hp = Math.max(1, Math.round(hp * 0.34));
      dmg = Math.round(dmg * 0.6);
      r = 10;
    }

    // 플레이어와 겹치지 않게 방 오른쪽 절반에 흩어 놓는다
    return {
      x: opts.x !== undefined ? opts.x : ROOM_W * (0.45 + Math.random() * 0.42),
      y: opts.y !== undefined ? opts.y : WALL + P_R + Math.random() * (ROOM_H - WALL * 2 - P_R * 2),
      r: r,
      hp: hp, hpMax: hp, boss: !!boss,
      elite: elite ? elite.key : null,
      shade: !!opts.shade,
      dmg: dmg,
      cd: 0.6 + Math.random() * 0.8,
      ref: ref,
      phase: Math.random() * 6.28,
      hurt: 0
    };
  }

  /** 적의 표시 이름 — 정예는 접두가 붙는다 */
  function enemyName(e) {
    var base = (e.ref && e.ref.name) || '적';
    var el = e.elite ? eliteOf(e.elite) : null;
    return el ? (el.name + ' ' + base) : base;
  }

  /* ── 방 생성 ─────────────────────────────────────────── */

  function pickRoomKind() {
    var total = 0, i;
    for (i = 0; i < DD.ROOMS.length; i++) { total += DD.ROOMS[i].weight; }
    var r = Math.random() * total;
    for (i = 0; i < DD.ROOMS.length; i++) {
      r -= DD.ROOMS[i].weight;
      if (r <= 0) { return DD.ROOMS[i].key; }
    }
    return 'fight';
  }

  /**
   * 방 하나를 만든다.
   * @param kind 'fight' | 'trove' | 'well' | 'shrine' | 'elite' | 'miniboss' | 'cave' | 'merchant' | 'puzzle' | 'event' | 'forage' | 'boss' | 'stair'
   */
  function makeRoom(kind, floor, index, total) {
    var room = {
      kind: kind, index: index, cleared: false,
      enemies: [], drops: [], doors: [], chest: null, well: null, shrine: null, vein: null,
      merchant: null, puzzle: null, captive: null, forage: null
    };
    var n;
    if (kind === 'boss') {
      room.enemies.push(spawnEnemy(floor, true));
      n = Math.min(6, 2 + Math.floor(floor / 5));         // 보스도 부하를 몰고 온다
      for (var b = 0; b < n; b++) { room.enemies.push(spawnEnemy(floor, false)); }
    } else if (kind === 'fight') {
      /* 디아블로처럼 몰려온다 — 4~7 + 층 보정, 상한 12 (성능·화면 밀도) */
      n = Math.min(12, 4 + Math.floor(Math.random() * 4) + Math.min(6, Math.floor(floor / 3)));
      for (var i = 0; i < n; i++) { room.enemies.push(spawnEnemy(floor, false)); }
    } else if (kind === 'trove') {
      room.chest = { x: ROOM_W * 0.72, y: ROOM_H * 0.5, taken: false };
      if (Math.random() < 0.5) { room.enemies.push(spawnEnemy(floor, false)); }
    } else if (kind === 'well') {
      room.well = { x: ROOM_W * 0.72, y: ROOM_H * 0.5, used: false };
    } else if (kind === 'shrine') {
      room.shrine = { x: ROOM_W * 0.72, y: ROOM_H * 0.5, used: false };
    } else if (kind === 'elite') {
      /* 정예 소굴(POI: Elite) — 반드시 정예 하나를 낀 채로 나온다. 잡졸 수는
         전투방보다 적다(정예 하나가 이미 벅차다) */
      n = Math.min(8, 3 + Math.floor(Math.random() * 3) + Math.min(3, Math.floor(floor / 5)));
      room.enemies.push(spawnEnemy(floor, false, { forceElite: true }));
      for (var ei = 1; ei < n; ei++) { room.enemies.push(spawnEnemy(floor, false)); }
    } else if (kind === 'miniboss') {
      /* 미니보스(POI: MiniBoss) — 층 끝 보스와 달리 부하 없이 혼자 나온다.
         `kill()` 이 `e.boss` 만 보고 이미 보스급 노획(확정 드랍·재료·단약·
         감정서)을 주므로 여기서 따로 더 챙길 것은 없다 */
      room.enemies.push(spawnEnemy(floor, true));
    } else if (kind === 'cave') {
      /* 채광방(POI: Cave) — PLAN 12절 "희귀 광석" 을 문 하나로 꺼낸다.
         광맥을 캐면(우물과 같은 손짓) 세공 재료가 확정으로 둘 나온다 —
         행상에서 사는 것보다 후하게(우물의 회복량 40% 만큼 후한 셈이다) */
      room.vein = { x: ROOM_W * 0.72, y: ROOM_H * 0.5, used: false };
      if (Math.random() < 0.35) { room.enemies.push(spawnEnemy(floor, false)); }
    } else if (kind === 'merchant') {
      /* 행상(POI: Merchant, PLAN 12절 "랜덤 상인") — 지나가는 길에 만난다.
         본영의 행상(vendor.js)과는 따로다 — 그쪽은 "회차가 끝나야 재고가
         새로 온다" 는 규칙이 있어 던전 안에서 함부로 같이 쓰면 그 규칙이
         깨진다. 대신 이 자리에서만 파는 재고를 셋 굴린다(한 번뿐이다). */
      room.merchant = { x: ROOM_W * 0.72, y: ROOM_H * 0.5, used: false };
      if (Math.random() < 0.15) { room.enemies.push(spawnEnemy(floor, false)); }
    } else if (kind === 'puzzle') {
      /* 퍼즐방(POI: Puzzle) — 제단 셋을 **맞는 순서**로 밟는다(원작에도 있는
         "손잡이 셋" 류 장치). 순서는 방마다 새로 섞는다 — 틀리면 처음부터
         (벌은 없다, 몸이 아니라 머리로 푸는 방이라 몸싸움을 안 섞었다) */
      var order = [0, 1, 2];
      for (var pi = order.length - 1; pi > 0; pi--) {
        var pj = Math.floor(Math.random() * (pi + 1));
        var tmp = order[pi]; order[pi] = order[pj]; order[pj] = tmp;
      }
      room.puzzle = {
        pods: [
          { x: ROOM_W * 0.55, y: ROOM_H * 0.28, idx: 0, lit: false },
          { x: ROOM_W * 0.72, y: ROOM_H * 0.5,  idx: 1, lit: false },
          { x: ROOM_W * 0.55, y: ROOM_H * 0.72, idx: 2, lit: false }
        ],
        order: order, progress: 0, solved: false
      };
    } else if (kind === 'event') {
      /* 이벤트방(POI: Event, PLAN 35절 "NPC Rescue") — 잡혀 있는 이를
         구한다. 지키는 잡졸을 다 치우면 풀려나 은사를 하나 갚는다(고르지
         않고 바로 얹는다 — 사당과 다르게 "받은 은혜" 라 고를 처지가
         아니다) + 노획물도 조금. Monster Ambush·Elite Monster·Merchant·
         Shrine·Mini Boss 는 PLAN 35절에도 같이 있지만 이미 다른 POI 로
         있으므로(elite·miniboss·merchant·shrine·fight) 여기서 새로 만든
         것은 이 구출뿐이다. */
      n = Math.min(6, 2 + Math.floor(Math.random() * 3) + Math.min(2, Math.floor(floor / 6)));
      for (var evi = 0; evi < n; evi++) { room.enemies.push(spawnEnemy(floor, false)); }
      room.captive = { x: ROOM_W * 0.72, y: ROOM_H * 0.5, freed: false };
    } else if (kind === 'forage') {
      /* 채집·낚시방(POI: Forage, PLAN 12절 "채집"·"낚시 가능한 지역") —
         사용자가 2026-08-30에 직접 요청해 넣었다. 사가의숲(동물의숲 모방)
         이 이미 낚시·채집을 담당하고 있어 처음엔 이 판(디아블로 모방)엔
         안 맞다고 봤는데, 뜻이 분명해 넣었다 — 대신 **이 판의 결로**
         옮긴다: 밭을 갈지 않고 낚싯대를 들지 않는다. 약초 셋은 **항아리와
         같은 손짓**(지나가며 스치면 단약이 뜬다 — `dropPotion` 을 그대로
         쓴다)이고, 못은 **우물·사당과 같은 손짓**(방을 다 치운 뒤 한 번,
         "손맛" 하나) 이다. 새 재료·인벤 칸을 만들지 않았다 — 이미 있는
         드랍 셋(potion·mat·gold·item)만 쓴다. */
      room.forage = {
        herbs: [
          { x: ROOM_W * 0.30, y: ROOM_H * 0.30, picked: false },
          { x: ROOM_W * 0.50, y: ROOM_H * 0.68, picked: false },
          { x: ROOM_W * 0.66, y: ROOM_H * 0.32, picked: false }
        ],
        pond: { x: ROOM_W * 0.80, y: ROOM_H * 0.62, used: false }
      };
      if (Math.random() < 0.25) { room.enemies.push(spawnEnemy(floor, false)); }
    }
    if (!room.enemies.length) { room.cleared = true; }
    room.last = index >= total - 1;
    room.decor = makeDecor(kind, floor, index);
    return room;
  }

  /**
   * 방 장식 — 기둥 · 횃불 · 균열. 통과에는 영향이 없고 눈으로만 쓴다
   * (충돌까지 넣으면 좁은 방에서 길이 막히는 사고가 난다).
   */
  function makeDecor(kind, floor, index) {
    var out = [], i;
    var cols = 2 + Math.floor(Math.random() * 3);
    for (i = 0; i < cols; i++) {
      out.push({
        t: 'pillar',
        x: ROOM_W * (0.22 + Math.random() * 0.6),
        y: ROOM_H * (0.18 + Math.random() * 0.64)
      });
    }
    var torches = kind === 'boss' ? 4 : 2;
    for (i = 0; i < torches; i++) {
      out.push({
        t: 'torch',
        x: WALL + 8 + (ROOM_W - WALL * 2 - 16) * ((i + 0.5) / torches),
        y: WALL - 4,
        seed: Math.random() * 6.28
      });
    }
    /* 항아리 — 원작에서 방마다 널려 있고, 부수면 뭔가 나온다.
       "지나가며 다 깨는" 그 손버릇이 원작의 리듬이다 */
    var jn = DD.JARS.min + Math.floor(Math.random() * (DD.JARS.max - DD.JARS.min + 1));
    for (i = 0; i < jn; i++) {
      out.push({
        t: 'jar', broken: false,
        x: WALL + 24 + Math.random() * (ROOM_W - WALL * 2 - 48),
        y: WALL + 24 + Math.random() * (ROOM_H - WALL * 2 - 48),
        seed: Math.random() * 6.28
      });
    }
    var cracks = 2 + Math.floor(Math.random() * 3);
    var crackList = [];
    for (i = 0; i < cracks; i++) {
      var cr = {
        t: 'crack',
        x: ROOM_W * (0.15 + Math.random() * 0.7),
        y: ROOM_H * (0.2 + Math.random() * 0.6),
        a: Math.random() * 3.14,
        len: 18 + Math.random() * 34
      };
      out.push(cr);
      crackList.push(cr);
    }
    /* 비밀(POI: Secret) — 문에 안 뜨고 숨어 있다. 겉보기엔 여느 균열과
       똑같다 — **닿아 봐야 안다**(그래서 room.decor 항목에 얹지, 문
       목록엔 아예 없다). 방마다 8% 확률로 균열 하나가 사실은 숨은 틈이다.
       보스방은 뺀다(정신없는 싸움 중에 발밑을 뒤질 계제가 아니다).
       **`Math.random()` 을 안 쓴다** — 여기서 하나 더 뽑으면 이 뒤로 도는
       모든 굴림(전리품 등급·원소 접사…)이 한 칸씩 밀린다. 자가진단이
       던전을 3000틱 자동으로 돌리는 항목이 있어(다른 방을 수백 번 만든다),
       그 밀림이 한참 뒤 엉뚱한 테스트(원소 접사 값)까지 흔드는 걸 실제로
       겪었다 — 대신 층·방 번호로만 결정되는 순수 해시(`core.hash2`)를
       쓴다(자리를 옮기지 않는 층 테마·바닥 무늬와 같은 요령). */
    if (kind !== 'boss' && crackList.length) {
      var secRoll = core.hash2((floor || 0) * 131 + (index || 0) * 7, crackList.length * 29 + 3);
      if (secRoll < 0.08) {
        var pickH = core.hash2((floor || 0) * 131 + (index || 0) * 7 + 1, crackList.length * 29 + 11);
        var sc = crackList[Math.min(crackList.length - 1, Math.floor(pickH * crackList.length))];
        sc.secret = true;
        sc.found = false;
      }
    }
    return out;
  }

  /** 다음 방 후보 2~3개 (문에 표시된다) */
  function makeDoors(floor, index, total) {
    var out = [];
    if (index >= total - 1) {
      out.push({ kind: 'stair', y: ROOM_H * 0.5 });
      return out;
    }
    var count = 2 + (Math.random() < 0.35 ? 1 : 0);
    var kinds = {};
    var guard = 0;
    while (out.length < count && guard < 30) {
      guard++;
      var k = pickRoomKind();
      if (kinds[k] && out.length) { continue; }
      kinds[k] = true;
      out.push({ kind: k, y: 0 });
    }
    // 문을 오른쪽 벽에 세로로 고르게 배치
    for (var i = 0; i < out.length; i++) {
      out[i].y = ROOM_H * ((i + 1) / (out.length + 1));
    }
    return out;
  }

  /* ── 회차 ─────────────────────────────────────────────── */

  /* ── 난도(難度) — 원작(디아블로)의 노멀 · 나이트메어 · 헬 ───
   * 원작에서 한 바퀴를 돈 사람은 같은 땅을 **더 사나운 규칙**으로 다시 돈다.
   * 여기서는 최고 층으로 열린다 — 열 층을 밟으면 험(險), 스무 층이면 절(絕).
   */
  var MODES = [
    { key: 'normal', name: '평(平)', need: 0,  hp: 1,    dmg: 1,   bias: 0,  gold: 1,   exp: 1,
      desc: '처음 내려가는 길.' },
    { key: 'hard',   name: '험(險)', need: 10, hp: 1.8,  dmg: 1.5, bias: 12, gold: 1.6, exp: 1.5, resist: 10,
      desc: '적이 두 배 가까이 버티고 손도 맵다. 저항도 붙는다. 대신 나오는 것이 좋아진다.' },
    { key: 'hell',   name: '절(絕)', need: 20, hp: 3.2,  dmg: 2.2, bias: 26, gold: 2.4, exp: 2.2, resist: 20,
      desc: '한 대가 치명적이다. 저항이 두껍다. 부문(符文)도 여기서 잘 나온다.' }
  ];

  function modeOf(key) {
    for (var i = 0; i < MODES.length; i++) { if (MODES[i].key === key) { return MODES[i]; } }
    return MODES[0];
  }

  /** 지금 열려 있는 난도들 */
  function modesOpen() {
    var best = dstate().best || 0;
    return MODES.filter(function (m) { return best >= m.need; });
  }

  /** 이번 회차의 난도 (던전 밖이면 고른 값) */
  function mode() {
    if (run && run.mode) { return modeOf(run.mode); }
    return modeOf(dstate().mode);
  }

  function setMode(key) {
    var m = modeOf(key);
    if ((dstate().best || 0) < m.need) { return false; }
    dstate().mode = m.key;
    core.emit('changed');
    core.persist();
    return true;
  }

  function dstate() {
    var s = core.save;
    if (!s.dungeon) { s.dungeon = { best: 0, runs: 0, kills: 0, clears: 0, mode: 'normal' }; }
    if (!s.dungeon.mode) { s.dungeon.mode = 'normal'; }
    return s.dungeon;
  }

  function active() { return !!run; }

  /**
   * 던전에 들어간다.
   * @param opts {floor} 시작 층 (기본 1)
   */
  /** 결사로 스러진 판인가 — 그렇다면 더 못 내려간다 */
  function fallen() { return !!(core.save.dungeon && core.save.dungeon.fallen); }

  function enter(opts) {
    if (fallen()) {
      core.emit('toast', '☠️ 결사로 스러진 판입니다 — 새 이름으로 시작하세요');
      return false;
    }
    opts = opts || {};
    if (!core.save.party.length) {
      core.emit('toast', '⚠️ 부대가 없습니다 — 먼저 인물을 등용하세요');
      return false;
    }
    if (run) { return false; }
    var floor = Math.max(1, Math.round(opts.floor || 1));
    /* 난도는 들어갈 때 정해지고 회차 내내 바뀌지 않는다 */
    var md = modeOf(opts.mode || dstate().mode);
    if ((dstate().best || 0) < md.need) { md = MODES[0]; }
    run = {
      mode: md.key,
      floor: floor, startFloor: floor,
      boons: {}, choice: null,
      hpMax: 0, hp: 0,
      buffs: {}, minions: [],          // 잠깐짜리 무예 · 분신 (회차 안에서만 산다)
      mp: MP_MAX, mpMax: MP_MAX,
      shots: [],                          // 기공파 투사체
      foeShots: [],                       // 궁수·조총병이 쏘는 것 (몬스터 다양화)
      roomIdx: 0, rooms: [], room: null,
      loot: { gold: 0, items: [] },
      fieldSpawnCd: 4,                    // 들판 로머 보충 주기(초) — PLAN 10절 "필드 사냥"
      kills: 0, startedAt: Date.now(), dead: false
    };
    run.hpMax = hpMaxOf();
    run.hp = run.hpMax;
    buildFloor();
    dstate().runs += 1;
    core.log('🕳️ 던전 진입 · 제' + floor + '층 (' + DD.themeOf(floor).name + ') · ' +
      md.name, 'info');
    /* 손이 비어 있으면 첫 무예 하나를 얹어 준다 — 배운 게 없으면 평타밖에 없다 */
    if (global.DG.skill) { global.DG.skill.ensureStarter(leadId()); }
    core.emit('dungeon:enter', run);
    core.emit('changed');
    return true;
  }

  function buildFloor() {
    var total = DD.roomsFor(run.floor);
    run.rooms = [];
    run.roomIdx = 0;
    var firstKind = 'fight';
    run.room = makeRoom(firstKind, run.floor, 0, total);
    run.roomTotal = total;
    run.room.doors = makeDoors(run.floor, 0, total);
    run.player = {
      x: WALL + 40, y: ROOM_H * 0.5, atkCd: 0, phase: 0, walking: false, facing: 1, hurt: 0,
      atkAnim: 0,                         // 공격 자세 남은 시간(초) — 3D·2D 렌더가 읽는다
      cds: [0, 0, 0, 0],                  // 스킬 쿨다운 (남은 초)
      dash: null,                         // 돌진 중 { t, dx, dy, hit }
      invuln: 0,                          // 무적 남은 초 (돌진)
      rallyUntil: 0                       // 사기 버프가 끝나는 시각 (ms)
    };
    run.shots = [];
    run.foeShots = [];
    var heal = boonVal('healOnFloor');
    if (heal) { healBy(run.hpMax * heal / 100); }
    /* 역참(驛站) — 원작의 웨이포인트. **다섯 층마다** 밟으면 다음부터 거기서 시작한다.
       "최고의 절반" 하나로 갈음하던 자리를, 원작처럼 **밟은 곳**으로 바꿨다 */
    if (run.floor % WAYPOINT_EVERY === 0) { markWaypoint(run.floor); }
    run.fieldSpawnCd = 4;
    spawnFieldEncounters(2 + Math.min(2, Math.floor(run.floor / 6)));
  }

  /** 다음 방으로 */
  function goRoom(kind) {
    if (!run || !run.room.cleared) { return false; }
    if (kind === 'stair') { return descend(); }
    run.roomIdx += 1;
    var isBoss = DD.isBossFloor(run.floor) && run.roomIdx >= run.roomTotal - 1;
    run.room = makeRoom(isBoss ? 'boss' : kind, run.floor, run.roomIdx, run.roomTotal);
    run.room.doors = makeDoors(run.floor, run.roomIdx, run.roomTotal);
    run.player.x = WALL + 40;
    run.player.y = ROOM_H * 0.5;
    target = null;
    run.fieldSpawnCd = 4;
    spawnFieldEncounters(2 + Math.min(2, Math.floor(run.floor / 6)));
    core.emit('dungeon:room', run.room);
    return true;
  }

  /** 층을 내려간다 — 노획물이 확정되고 은사를 고른다 */
  function descend() {
    settleLoot('층 답파');
    dstate().clears += 1;
    if (run.floor > dstate().best) {
      dstate().best = run.floor;
      if (global.DG.prestige) { global.DG.prestige.gainSeal(1, '던전 최고 층 갱신'); }
    }
    core.gainFeat(2 + Math.floor(run.floor / 2), '던전 답파');
    run.floor += 1;
    run.hpMax = hpMaxOf();
    run.choice = rollBoonChoice();
    buildFloor();
    core.log('🪜 제' + run.floor + '층으로 내려간다', 'good');
    /* 장비가 닳는다 — 원작처럼 쓰면 닳고 다 닳으면 부서진다.
       한 대 맞을 때마다 깎으면 판정 층 한복판을 건드려야 해서,
       **층을 내려가는 이 자리 하나**로 모았다 */
    if (global.DG.item.wearAll) { global.DG.item.wearAll(1); }
    core.emit('dungeon:floor', run.floor);
    core.emit('changed');
    return true;
  }

  /** 은사 후보 3개 (겹침 상한을 지킨다) */
  function rollBoonChoice() {
    var pool = [], i;
    for (i = 0; i < DD.BOONS.length; i++) {
      var b = DD.BOONS[i];
      if ((run.boons[b.key] || 0) < b.max) { pool.push(b.key); }
    }
    var out = [];
    while (out.length < 3 && pool.length) {
      var idx = Math.floor(Math.random() * pool.length);
      out.push(pool[idx]);
      pool.splice(idx, 1);
    }
    return out;
  }

  /** 은사 하나를 실제로 얹는다 — 고르기(`pickBoon`)와 구출 보상(이벤트방)이
   *  같이 쓴다. 상한 확인·체력 재계산·즉시 회복까지 여기 한 곳에 모았다. */
  function applyBoon(key) {
    var b = DD.boonByKey(key);
    if (!b) { return null; }
    if ((run.boons[key] || 0) >= b.max) { return null; }
    run.boons[key] = (run.boons[key] || 0) + 1;
    run.hpMax = hpMaxOf();
    var heal = b.eff.healOnPick;
    if (heal) { healBy(run.hpMax * heal / 100); }
    core.emit('changed');
    return b;
  }

  function pickBoon(key) {
    if (!run || !run.choice || run.choice.indexOf(key) < 0) { return false; }
    var b = applyBoon(key);
    if (!b) { return false; }
    run.choice = null;
    core.log('🎴 은사 · ' + b.name + ' (' + run.boons[key] + '중첩)', 'good');
    return true;
  }

  /** 사당방에서 바로 하나 받는다 */
  function shrineBoon() {
    var c = rollBoonChoice();
    if (!c.length) { return null; }
    run.choice = c;
    return c;
  }

  /* ── 행상(行商) — POI: Merchant, PLAN 12절 "랜덤 상인" ──────
   * 본영 행상(vendor.js)과 값 매기는 규칙만 같이 쓰고(item.price), 재고는
   * 따로 굴린다 — 그쪽 "회차가 끝나야 재고가 새로 온다" 는 규칙을 안 건드린다.
   */
  var MERCHANT_STOCK_N = 3;
  var MERCHANT_MUL = 1.8;              // 본영 행상(3.2배)보다 싸다 — 대신 셋뿐이고 한 번뿐이다
  var MERCHANT_TIER_MAX = 2;           // 본영과 같은 상한(명품까지) — 던전에서 다 사면 내려갈 맛이 준다

  function rollMerchantStock(floor) {
    var IT = global.DG.item, D = global.DG.itemData, i, w = [];
    for (i = 0; i <= MERCHANT_TIER_MAX; i++) { w.push(D.TIERS[i].weight); }
    var total = 0; for (i = 0; i < w.length; i++) { total += w[i]; }
    var out = [];
    for (i = 0; i < MERCHANT_STOCK_N; i++) {
      var r = Math.random() * total, tier = 0, acc = 0;
      for (var j = 0; j < w.length; j++) { acc += w[j]; if (r <= acc) { tier = j; break; } }
      var g = IT.roll(floor + 1, { tier: tier, unid: false });
      out.push({ item: g, price: Math.round(IT.price(g) * MERCHANT_MUL) });
    }
    return out;
  }

  /** 행상 재고 하나를 산다. `idx` 는 `run.merchantChoice` 의 자리 */
  function buyMerchant(idx) {
    if (!run || !run.merchantChoice || !run.merchantChoice[idx]) { return { ok: false, reason: 'gone' }; }
    var row = run.merchantChoice[idx];
    var IT = global.DG.item;
    if (core.save.player.gold < row.price) { return { ok: false, reason: 'gold' }; }
    if (IT.bag().length >= IT.bagCap()) { return { ok: false, reason: 'bag' }; }
    core.save.player.gold -= row.price;
    IT.add(row.item);
    run.merchantChoice.splice(idx, 1);
    if (!run.merchantChoice.length) { run.merchantChoice = null; }
    sfx('coin');
    core.log('🧺 ' + IT.name(row.item) + ' 을(를) 샀다 · 금 -' + core.fmt(row.price), 'info');
    core.emit('changed');
    return { ok: true, item: row.item, cost: row.price };
  }

  /** 행상 자리를 떠난다 (사지 않고 닫는다) */
  function leaveMerchant() {
    run.merchantChoice = null;
    core.emit('changed');
  }

  /* ── 퍼즐(POI: Puzzle) ────────────────────────────────────
   * 제단 셋을 맞는 순서로 밟는다. 틀리면 처음부터 — 벌은 없다(머리로
   * 푸는 방이라 몸싸움을 안 섞었다, PLAN 13절 "환경 상호작용"과 같은 결).
   */
  function touchPuzzlePod(room, pz, pod) {
    if (pz.order[pz.progress] === pod.idx) {
      pod.lit = true;
      pz.progress++;
      sfx('door');
      if (pz.progress >= pz.order.length) {
        pz.solved = true;
        dropItem(room, ROOM_W * 0.62, ROOM_H * 0.5, 20);
        dropGold(room, ROOM_W * 0.62, ROOM_H * 0.5, 2.4);
        sfx('chest');
        core.emit('toast', '🧩 퍼즐을 풀었다!');
      } else {
        core.emit('toast', '🧩 ✓ · 다음 제단 (' + pz.progress + '/' + pz.order.length + ')');
      }
    } else {
      var wasProgress = pz.progress > 0;
      pz.progress = 0;
      for (var i = 0; i < pz.pods.length; i++) { pz.pods[i].lit = false; }
      if (wasProgress) { core.emit('toast', '🧩 ✗ · 처음부터'); }
    }
  }

  /* ── 노획물 ───────────────────────────────────────────── */

  /** 층을 내려가거나 탈출할 때 확정 */
  function settleLoot(why) {
    if (!run) { return null; }
    var g = Math.round(run.loot.gold);
    var kept = 0, i;
    core.save.player.gold += g;
    for (i = 0; i < run.loot.items.length; i++) {
      var r = global.DG.item.add(run.loot.items[i]);
      if (r.kept) { kept++; }
    }
    var n = run.loot.items.length;
    run.loot = { gold: 0, items: [] };
    if (g || n) {
      core.log('💼 노획물 확정 (' + why + ') · 금 ' + core.fmt(g) + ' · 장비 ' + n + '점', 'good');
    }
    return { gold: g, items: n, kept: kept };
  }

  /** 탈출 — 지금까지 얻은 것을 지키고 나온다 */
  function leave() {
    if (!run) { return null; }
    var s = settleLoot('탈출');
    var floor = run.floor;
    core.log('🚪 던전에서 나왔다 · 제' + floor + '층까지', 'info');
    run = null;
    core.emit('dungeon:end', { reason: 'leave', floor: floor, loot: s });
    core.emit('changed');
    core.persist();
    return s;
  }

  /**
   * 결사(決死) — 원작의 하드코어.
   * 켜면 **쓰러지는 순간 그 프로필이 끝난다.** 켜는 것은 되돌릴 수 없다 —
   * 되돌릴 수 있으면 그건 하드코어가 아니다.
   */
  var WAYPOINT_EVERY = 5;

  /** 밟은 역참 중 가장 깊은 곳 */
  function waypoint() { return dstate().waypoint || 0; }

  function markWaypoint(floor) {
    var d = dstate();
    if ((d.waypoint || 0) >= floor) { return false; }
    d.waypoint = floor;
    sfx('waypoint');
    core.log('🪜 역참 · 제' + floor + '층 — 다음부터 여기서 시작할 수 있다', 'good');
    core.emit('changed');
    return true;
  }

  function hardcore() { return !!(core.save.dungeon && core.save.dungeon.hardcore); }

  function setHardcore() {
    dstate().hardcore = true;
    core.log('☠️ 결사(決死) — 이제 쓰러지면 이 판이 끝난다', 'bad');
    core.emit('changed');
    return true;
  }

  function die() {
    var lostGold = Math.round(run.loot.gold), lostItems = run.loot.items.length;
    var floor = run.floor;
    dstate().deaths = (dstate().deaths || 0) + 1;
    core.log('💀 제' + floor + '층에서 쓰러졌다 — 노획물 소실 (금 ' +
      core.fmt(lostGold) + ' · 장비 ' + lostItems + '점)', 'bad');
    run = null;
    core.emit('dungeon:end', { reason: 'dead', floor: floor, lost: { gold: lostGold, items: lostItems } });
    /* 결사(決死) — 원작의 하드코어. 쓰러지면 그 판이 끝난다 */
    if (hardcore()) {
      dstate().fallen = { floor: floor, at: Date.now() };
      core.log('☠️ 결사 — 제' + floor + '층에서 스러졌다. 이 판은 여기까지다', 'bad');
      core.emit('toast', '☠️ 결사 — 이 판이 끝났습니다 (제' + floor + '층)');
      core.emit('dungeon:fallen', floor);
      core.persist();
      return;
    }
    core.emit('toast', '💀 제' + floor + '층에서 패퇴 — 노획물을 잃었습니다');
    core.emit('changed');
    core.persist();
  }

  /* ── 피해 · 회복 ─────────────────────────────────────── */

  function healBy(amount) {
    if (!run) { return; }
    run.hp = Math.min(run.hpMax, run.hp + Math.round(amount));
  }

  /**
   * 단약(丹藥)이 부르는 창구 — 체력·기력을 최대치의 몇 % 만큼 채운다.
   * 체력과 기력의 정본은 이 파일이라, 물약이 run 을 직접 만지지 않게 여기로 모은다.
   * **이미 가득이면 false** 를 돌려준다 — 그러면 potion.js 가 그 알을 안 쓴다.
   */
  function refill(hpPct, mpPct, text, color) {
    if (!run) { return false; }
    var did = false;
    if (hpPct && run.hp < run.hpMax) { healBy(run.hpMax * hpPct / 100); did = true; }
    if (mpPct && run.mp < run.mpMax) {
      run.mp = Math.min(run.mpMax, run.mp + run.mpMax * mpPct / 100);
      did = true;
    }
    if (did && text) {
      fx.push({ t: 'get', x: run.player.x, y: run.player.y,
                text: text, color: color || '#c0392b', life: 0.9 });
    }
    return did;
  }

  /**
   * @param el 이 공격의 결 (없으면 물리). 갑주에 박은 보석이 그 결을 막는다 —
   *           **원작에서 갑옷에 젬을 박는 이유가 바로 이것**이다.
   */
  function hurtPlayer(amount, el) {
    if (!run) { return; }
    if (run.player.invuln > 0) { return; }        // 돌진 중에는 맞지 않는다
    amount = amount * (1 - boonVal('guardPct') / 100);
    if (el && el !== 'phys') { amount *= 1 - elemResOf(el) / 100; }
    amount = Math.max(1, amount);
    run.hp -= amount;
    run.player.hurt = 0.28;
    fx.push({ t: 'hit', x: run.player.x, y: run.player.y, v: Math.round(amount),
              life: 0.7, foe: true, el: el && el !== 'phys' ? el : null });
    sfx('hurt');
    if (run.hp <= 0) { die(); }
  }

  /* ── 진행 ─────────────────────────────────────────────── */

  function setInput(dx, dy) { input.dx = dx; input.dy = dy; if (dx || dy) { target = null; } }
  function moveTo(x, y) { target = { x: x, y: y }; }

  /* ── 방 밖 들판으로 나간다 (PLAN 4·5·6절의 나머지 절반) ─────
   * `field3d.js` 가 방 둘레에 세워 둔 세상은 여태 **눈에만 보였다** — 판정은
   * 여전히 방 사각형 안에만 사람을 가뒀다. 여기서 그 절반을 마저 잇는다.
   *
   * 방 안(옛 사각형)에서는 **한 줄도 안 바뀐다** — 문 판정(`p.x > ROOM_W - WALL
   * - P_R - 4`)이 그 경계에 그대로 물려 있으므로, 방 안 동작을 건드리면 그 판정도
   * 같이 흔들린다. 대신 **방 밖으로는 더 나갈 수 있게** 사각형을 넓히고, 들판에
   * 실제로 서 있는 소품(나무·바위·기둥·무너진 벽·절벽·굴 입구)과는 부딪힌다 —
   * `dungeon3d.js` 가 그리는 것과 **같은 값**(`field3d.chunkAt`)을 그대로 읽으므로
   * 눈에 보이는 나무를 그대로 통과하는 일은 없다.
   *
   * 렌더러가 없어도(자가진단) 그대로 돈다 — `field3d` 는 순수 함수다.
   */
  function fieldOn() {
    var D3 = global.DG.dungeon3d;
    return !D3 || !D3.tuned || D3.tuned('dg3d.field', 1) ? true : false;
  }
  function fieldRadiusUnits() {
    var D3 = global.DG.dungeon3d;
    var F = global.DG.field3d;
    var r = (D3 && D3.tuned) ? D3.tuned('dg3d.fieldR', 6) : 6;
    return r * (F ? F.CHUNK : 200);
  }
  /**
   * @param ctx 방 치수가 던전과 다른 곳(마을 등)이 빌려 쓸 때만 넘긴다 —
   *            {roomW, roomH, wall, pr}. 없으면 이 방(던전)의 치수 그대로다.
   */
  function inRoomRect(x, y, ctx) {
    var rw = (ctx && ctx.roomW) || ROOM_W, rh = (ctx && ctx.roomH) || ROOM_H;
    var wl = (ctx && ctx.wall) || WALL, pr = (ctx && ctx.pr) || P_R;
    var lo = wl + pr;
    return x >= lo - 0.01 && x <= rw - wl - pr + 0.01 &&
           y >= lo - 0.01 && y <= rh - wl - pr + 0.01;
  }
  /* 들판 소품 중 **막는 것만** 고른다 — 길·이정표·연못가 갈대 같은 장식은
     지나갈 수 있어야 걷는 맛이 안 답답하다. */
  var FIELD_BLOCK = { tree: 1, rock: 1, pillar: 1, wall: 1, cliff: 1, cavemouth: 1 };
  function pieceRadius(pc) {
    var s = pc.s || 1;
    if (pc.t === 'tree') { return 5 * s + 6; }
    if (pc.t === 'rock') { return pc.h * 0.55 * s; }
    if (pc.t === 'pillar') { return 12; }
    if (pc.t === 'wall') { return 46; }             // 길쭉해 원으로 뭉뚱그린다(넉넉하게)
    if (pc.t === 'cliff') { return 45 * s; }
    if (pc.t === 'cavemouth') { return pc.h * 0.6; }
    return 0;
  }
  /**
   * (x,y) 언저리 아홉 조각의 소품과 부딪히는지 — three 없이도 돈다.
   * @param ctx 마을처럼 방 치수·층·씨앗이 던전과 다른 곳이 빌려 쓸 때만 넘긴다 —
   *            {roomW, roomH, pr, floor, roomIdx, theme}.
   */
  function fieldBlockedAt(x, y, ctx) {
    var F = global.DG.field3d;
    var floor = ctx ? ctx.floor : (run && run.floor);
    if (!F || floor === undefined || floor === null) { return false; }
    var roomIdx = ctx ? ctx.roomIdx : (run && run.roomIdx);
    var rw = (ctx && ctx.roomW) || ROOM_W, rh = (ctx && ctx.roomH) || ROOM_H;
    var pr = (ctx && ctx.pr) || P_R;
    var DDf = global.DG.dataDungeon;
    var th = (ctx && ctx.theme) || (run && run.theme) || (DDf ? DDf.themeOf(floor) : null);
    var seed = F.seedOf(floor, roomIdx, th && th.name);
    var ccx = Math.floor(x / F.CHUNK), ccz = Math.floor(y / F.CHUNK), cx, cz, i, pc, r;
    for (cz = ccz - 1; cz <= ccz + 1; cz++) {
      for (cx = ccx - 1; cx <= ccx + 1; cx++) {
        var ring = F.ringOf(cx, cz, rw, rh);
        if (ring === 0) { continue; }              // 방이 걸친 조각엔 소품이 없다
        var list = F.chunkAt(cx, cz, seed, ring, 1);
        for (i = 0; i < list.length; i++) {
          pc = list[i];
          if (!FIELD_BLOCK[pc.t]) { continue; }
          r = pieceRadius(pc);
          if (r > 0 && Math.hypot(x - pc.x, y - pc.z) < r + pr) { return true; }
        }
      }
    }
    return false;
  }
  /**
   * 사각형 벽(방 안)은 그대로 지키고, 방 밖은 들판 반경까지 넓힌다.
   * 축을 나눠 시도해 **한쪽이 막혀도 다른 쪽은 미끄러진다**(대각선으로 나무에
   * 부딪혀도 그대로 안 멎는다 — 사가고 벽 충돌이 밟아 둔 요령과 같다).
   */
  /**
   * @param ctx 마을처럼 방 치수·씨앗이 던전과 다른 곳이 빌려 쓸 때만 넘긴다
   *            (inRoomRect·fieldBlockedAt 에 그대로 물려 준다).
   */
  function boundPlayer(p, px, py, ctx) {
    var rw = (ctx && ctx.roomW) || ROOM_W, rh = (ctx && ctx.roomH) || ROOM_H;
    var wl = (ctx && ctx.wall) || WALL, pr = (ctx && ctx.pr) || P_R;
    var lo = wl + pr, hiX = rw - wl - pr, hiY = rh - wl - pr;
    if (!fieldOn()) {
      p.x = core.clamp(p.x, lo, hiX);
      p.y = core.clamp(p.y, lo, hiY);
      return;
    }
    var R = fieldRadiusUnits();
    var nx = core.clamp(p.x, lo - R, hiX + R);
    p.x = (inRoomRect(nx, py, ctx) || !fieldBlockedAt(nx, py, ctx)) ? nx : px;
    var ny = core.clamp(p.y, lo - R, hiY + R);
    p.y = (inRoomRect(p.x, ny, ctx) || !fieldBlockedAt(p.x, ny, ctx)) ? ny : py;
  }

  var FIELD_ENEMY_CAP = 4;                // 들판에 동시에 사는 로머 상한

  /**
   * 필드 사냥(PLAN 10절) — 방을 다 안 치워도 방 밖 들판에서 바로 싸울 수 있게,
   * 로밍 몬스터를 들판에 흩어 둔다. **`room.enemies` 배열에 그대로 얹는다** —
   * 렌더링 · 기공파/돌진 충돌 · 미니맵 · 근접 자동 공격이 전부 이 배열을 이미
   * 순회하므로 여기 한 곳만 채우면 나머지는 공짜로 따라온다. `.field` 표시로
   * 방 몬스터와 가른다 — 방 정리(`alive`) 판정과 넉백 clamp가 이 표시를 본다.
   *
   * **자가진단(`DG_NO_DRAW`)에서는 켜지 않는다** — `_test.html`은 전체가 씨앗
   * 하나로 고정된 **하나로 이어진** Math.random() 수열을 쓴다(파일 앞머리 주석 —
   * "원소 피해 항목 하나가 그렇게 넘어갔다"). `spawnEnemy()`를 여기서 더 부르면
   * 그 수열이 밀려 뒤따르는 다른 항목의 기대값이 어긋난다 — three.js 때 밟았던
   * 것과 같은 함정이다. `game.js`가 이미 `minimap.tick()` 같은 비핵심 계는 이
   * 플래그로 끄고 있어(같은 자리), 새로 생긴 이 계도 같은 자리에 둔다. 실제 플레이
   * (`index.html`)에는 이 플래그가 없어 그대로 다 돈다.
   */
  /**
   * @param ctx 마을처럼 던전과 다른 방이 빌려 쓸 때만 넘긴다 —
   *            {roomW, roomH, wall, floor, room}. 없으면 이 방(던전)의 run 그대로다.
   */
  function spawnFieldEncounters(count, ctx) {
    if (!fieldOn() || global.DG_NO_DRAW) { return; }
    if (!ctx && !run) { return; }
    var rw = (ctx && ctx.roomW) || ROOM_W, rh = (ctx && ctx.roomH) || ROOM_H;
    var wl = (ctx && ctx.wall) || WALL;
    var floor = ctx ? ctx.floor : run.floor;
    var enemies = ctx ? ctx.room.enemies : run.room.enemies;
    var R = fieldRadiusUnits(), tries, i, a, d, x, y, en;
    for (i = 0; i < count; i++) {
      tries = 8;
      while (tries--) {
        a = Math.random() * Math.PI * 2;
        d = (wl + 60) + Math.random() * Math.max(40, R - wl - 60);
        x = rw * 0.5 + Math.cos(a) * d;
        y = rh * 0.5 + Math.sin(a) * d;
        if (inRoomRect(x, y, ctx) || fieldBlockedAt(x, y, ctx)) { continue; }
        en = spawnEnemy(floor, false, { x: x, y: y });
        en.field = true;
        enemies.push(en);
        break;
      }
    }
  }

  /**
   * 살아 있는 들판 로머 수
   * @param ctx spawnFieldEncounters 와 같은 뜻
   */
  function fieldEnemyCount(ctx) {
    var es = ctx ? ctx.room.enemies : (run && run.room.enemies);
    if (!es) { return 0; }
    var n = 0, i;
    for (i = 0; i < es.length; i++) { if (es[i].field && es[i].hp > 0) { n++; } }
    return n;
  }

  /**
   * `run`·`fx`(둘 다 이 모듈의 클로저 변수)를 잠깐 다른 판(마을)의 것으로
   * 바꿔 끼우고 fn 을 부른 뒤 되돌린다. `strike`·`hurtPlayer`·`kill` 은
   * 자가진단(`_strike`·`_hurt`·`_spawnEnemy`)이 지금 시그니처 그대로 직접
   * 부르므로 인자를 늘릴 수 없다 — 대신 이 스왑으로 "잠깐 빌려 쓴다".
   * 마을·던전은 동시에 active 하지 않으니 재진입 걱정은 없다.
   */
  function withRun(ctxRun, ctxFx, fn) {
    var savedRun = run, savedFx = fx;
    run = ctxRun;
    if (ctxFx) { fx = ctxFx; }
    try { fn(); } finally { run = savedRun; fx = savedFx; }
  }

  /**
   * 들판 로머 전투 한 틱 — `update()` 안의 적 AI·자동공격·투사체
   * 블록(이동·문 전환·방 정리 판정은 뺐다)을 그대로 옮겨 온 것이다.
   * **로직은 한 글자도 안 바꿨다** — `update()` 자체는 이 함수를 안 부른다
   * (58KB 판정의 심장을 건드리지 않는다는 원칙). 마을(`town.js`)이 자기
   * 이동을 다 계산한 뒤 이것만 불러 "그 자리에서 싸우는" 부분만 빌린다.
   * @param ctx {roomW, roomH, wall, pr, floor, roomIdx, theme, room, player,
   *             shots, foeShots} — `withRun`으로 run 을 이걸로 바꿔 끼운다.
   * @param fxArr 이 틱에서 난 연출(hit·slash·pop·burst 등)을 받을 배열
   *              (마을 자신의 `fx()` 배열을 넘긴다).
   */
  function stepFieldCombat(dt, ctx, fxArr) {
    withRun(ctx, fxArr, function () {
      var p = run.player, room = run.room, i;
      var rally = rallyOn();
      var rw = ctx.roomW || ROOM_W, rh = ctx.roomH || ROOM_H, wl = ctx.wall || WALL;

      if (p.atkAnim > 0) { p.atkAnim -= dt; }
      if (p.hurt > 0) { p.hurt -= dt; }

      /* 기공파 투사체 */
      for (i = run.shots.length - 1; i >= 0; i--) {
        var sh = run.shots[i];
        sh.x += sh.dx * sh.spd * dt;
        sh.y += sh.dy * sh.spd * dt;
        sh.life -= dt;
        for (var si = 0; si < room.enemies.length; si++) {
          var se = room.enemies[si];
          if (se.hp <= 0 || sh.hit[si]) { continue; }
          if (dist(sh, se) < se.r + 10) {
            sh.hit[si] = true;
            strike(se, sh.mul || 2.2, 14, sh.el || 'chi');
            if (!run) { return; }
          }
        }
        if (sh.life <= 0 || sh.x < wl || sh.x > rw - wl ||
            sh.y < wl || sh.y > rh - wl) {
          run.shots.splice(i, 1);
        }
      }

      /* 궁수·조총병이 쏜 것 */
      for (i = run.foeShots.length - 1; i >= 0; i--) {
        var fsh = run.foeShots[i];
        fsh.x += fsh.dx * fsh.spd * dt;
        fsh.y += fsh.dy * fsh.spd * dt;
        fsh.life -= dt;
        if (dist(fsh, p) < P_R + 8) {
          hurtPlayer(fsh.dmg, fsh.el);
          if (!run) { return; }
          run.foeShots.splice(i, 1);
          continue;
        }
        if (fsh.life <= 0 || fsh.x < wl || fsh.x > rw - wl ||
            fsh.y < wl || fsh.y > rh - wl) {
          run.foeShots.splice(i, 1);
        }
      }

      /* 내 공격 — 사거리 안에서 가장 가까운 적 */
      p.atkCd -= dt;
      var reach = reachOf();
      var near = null, nd = 1e9;
      for (i = 0; i < room.enemies.length; i++) {
        var e = room.enemies[i];
        if (e.hp <= 0) { continue; }
        var d = dist(p, e) - e.r;
        if (d < nd) { nd = d; near = e; }
      }
      if (near && nd <= reach && p.atkCd <= 0) {
        p.atkCd = atkCdOf() / (rally ? 1.4 : 1);
        p.atkAnim = 0.22;
        strike(near);
        if (!run) { return; }
        if (Math.random() * 100 < boonVal('echoPct')) { strike(near); }
        if (!run) { return; }
      }

      /* 적 */
      for (i = 0; i < room.enemies.length; i++) {
        var en = room.enemies[i];
        if (en.hp <= 0) { continue; }
        en.phase += dt * 7;
        if (en.hurt > 0) { en.hurt -= dt; }
        var ed = dist(en, p);
        var el = en.elite ? eliteOf(en.elite) : null;
        if (el && el.regen && en.hp < en.hpMax) {
          en.hp = Math.min(en.hpMax, en.hp + en.hpMax * el.regen * dt);
        }
        if (en.dots && en.dots.length) {
          for (var di2 = en.dots.length - 1; di2 >= 0; di2--) {
            var dt2 = en.dots[di2];
            en.hp -= dt2.dps * dt;
            dt2.t -= dt;
            if (dt2.t <= 0) { en.dots.splice(di2, 1); }
          }
          if (en.hp <= 0) { kill(en); if (!run) { return; } continue; }
        }
        var chill = 1;
        if (en.slow > 0) {
          en.slow -= dt;
          chill = 1 - (en.slowMul || 0.45);
        }
        var espd = (62 + Math.min(40, (ctx.floor || 0) * 1.5)) *
                   (el && el.spd ? el.spd : 1) * chill;
        var lookW = en.ref && en.ref.look && en.ref.look.weapon;
        var ranged = lookW === 'bow' || lookW === 'staff';
        var stopAt = ranged ? RANGED_STOP : (en.r + P_R - 2);
        var wob = (!ranged && lookW === 'axe') ? Math.sin(en.phase * 0.6) * 0.5 : 0;
        var lunge = (!ranged && lookW === 'club') ? 1 + Math.max(0, Math.sin(en.phase * 0.9)) * 0.7 : 1;
        if (ed > stopAt) {
          var mvx = (p.x - en.x) / ed, mvy = (p.y - en.y) / ed;
          if (wob) {
            var perpx = -mvy, perpy = mvx;
            mvx += perpx * wob; mvy += perpy * wob;
            var mvl = Math.sqrt(mvx * mvx + mvy * mvy) || 1;
            mvx /= mvl; mvy /= mvl;
          }
          en.x += mvx * espd * lunge * dt;
          en.y += mvy * espd * lunge * dt;
        }
        var reachBonus = (lookW === 'spear' || lookW === 'halberd') ? 14 : 0;
        en.cd -= dt;
        if (ed <= en.r + P_R + 6 + reachBonus && en.cd <= 0) {
          en.cd = ENEMY_CD * (el && el.cd ? el.cd : 1) / chill;
          hurtPlayer(en.dmg, en.ref && en.ref.atkEl);
          if (!run) { return; }
        } else if (ranged && ed > en.r + P_R + 6 && ed <= RANGED_MAX && en.cd <= 0) {
          en.cd = ENEMY_CD * 1.4 * (el && el.cd ? el.cd : 1) / chill;
          var frdx = p.x - en.x, frdy = p.y - en.y;
          var frd = Math.sqrt(frdx * frdx + frdy * frdy) || 1;
          var frEl = (en.ref && en.ref.atkEl) || 'phys';
          run.foeShots.push({
            x: en.x, y: en.y - 8, dx: frdx / frd, dy: frdy / frd, spd: 260, life: 1.8,
            dmg: en.dmg, el: frEl, color: elemColorOf(frEl)
          });
        }
        /* 들판 로머는 늘 boss:false 로 태어나므로(spawnFieldEncounters) 강타
           패턴은 안 타지만, 나중에 예외가 생겨도 안전하도록 그대로 둔다 */
        if (en.boss) {
          if (en.slamWarn > 0) {
            en.slamWarn -= dt;
            if (en.slamWarn <= 0) {
              if (dist(en, p) < SLAM_RANGE) {
                hurtPlayer(en.dmg * SLAM_MUL, en.ref && en.ref.atkEl);
                if (!run) { return; }
              }
              fx.push({ t: 'pop', x: en.x, y: en.y, life: 0.5, boss: true });
              en.slamCd = 6 + Math.random() * 2;
            }
          } else {
            en.slamCd = (en.slamCd === undefined ? 4 : en.slamCd) - dt;
            if (en.slamCd <= 0) {
              en.slamWarn = SLAM_WARN;
              fx.push({ t: 'whirl', x: en.x, y: en.y, r: SLAM_RANGE, life: SLAM_WARN,
                el: 'fire', color: '#ff6a3a' });
            }
          }
        }
      }
    });
  }

  /**
   * 들판에서 잡은 것 줍기 — `update()` 안의 "바닥에 떨어진 것 줍기"(1474행
   * 부근)와 판정은 완전히 같다(플레이어 반경 안이면 `take()`). **마을에는
   * 여태 이게 없어** 필드 로머를 잡아도 `room.drops`에 쌓이기만 하고
   * 회수가 안 됐다(2026-09-01 이전, 알려진 한계로 적어 뒀던 것).
   * `stepFieldCombat`과 분리해 둔 것은 그 함수의 문서화된 범위(전투만,
   * 이동·문 전환·방 정리는 뺐다)를 그대로 지키기 위해서다 — 마을은 자기
   * 이동을 다 계산한 뒤 이 함수를 따로 부른다.
   * @param ctx stepFieldCombat 과 같은 뜻(withRun으로 run 을 이걸로 바꿔 끼운다).
   * @param fxArr 이 틱의 연출을 받을 배열.
   */
  function pickupField(ctx, fxArr) {
    withRun(ctx, fxArr, function () {
      var p = run.player, room = run.room, i;
      for (i = room.drops.length - 1; i >= 0; i--) {
        var dp = room.drops[i];
        if (dist(p, dp) < P_R + 14) {
          if (take(dp) !== false) { room.drops.splice(i, 1); }
        }
      }
    });
  }

  /** 사기(士氣) 버프가 살아 있나 */
  function rallyOn() {
    return !!(run && run.player.rallyUntil > Date.now());
  }

  function update(dt) {
    if (!run || run.choice || run.merchantChoice) { return; }  // 고르는 동안에는 멈춘다
    dt = Math.min(dt, 0.05);
    var p = run.player, room = run.room, i;

    /* 스킬 쿨다운 · 기력 · 무적 시간 */
    for (i = 0; i < p.cds.length; i++) { if (p.cds[i] > 0) { p.cds[i] -= dt; } }
    /* 명민·정신 같은 상시 무예가 기력 회복을 올린다 */
    run.mp = Math.min(run.mpMax, run.mp + (MP_REGEN + boonVal('mpRegen')) * dt);
    if (p.invuln > 0) { p.invuln -= dt; }
    if (p.atkAnim > 0) { p.atkAnim -= dt; }
    var rally = rallyOn();

    /* 필드 사냥 보충 — 들판을 걸어다니는 동안 로머가 상한 밑으로 떨어지면
       주기적으로 하나씩 채운다(PLAN 10절 "랜덤 필드 구조") */
    run.fieldSpawnCd -= dt;
    if (run.fieldSpawnCd <= 0) {
      run.fieldSpawnCd = 4;
      if (fieldEnemyCount() < FIELD_ENEMY_CAP) { spawnFieldEncounters(1); }
    }

    /* 돌진 — 조작을 무시하고 정해진 방향으로 밀고 나간다 */
    var px0 = p.x, py0 = p.y;
    if (p.dash) {
      var dsh = p.dash;
      p.x += dsh.dx * 620 * dt;
      p.y += dsh.dy * 620 * dt;
      p.walking = true;
      p.phase += dt * 16;
      fx.push({ t: 'trail', x: p.x, y: p.y, life: 0.22,
        el: dsh.el && dsh.el !== 'phys' ? dsh.el : null,
        color: dsh.el && dsh.el !== 'phys' ? elemColorOf(dsh.el) : null });
      /* 지나는 적을 벤다 (한 번씩만) */
      for (i = 0; i < room.enemies.length; i++) {
        var de = room.enemies[i];
        if (de.hp <= 0 || dsh.hit[i]) { continue; }
        if (dist(p, de) < de.r + P_R + 6) {
          dsh.hit[i] = true;
          strike(de, dsh.mul || 1.2, 22, dsh.el || 'phys');
          if (!run) { return; }
        }
      }
      dsh.t -= dt;
      if (dsh.t <= 0) { p.dash = null; }
      boundPlayer(p, px0, py0);
    } else {
      /* 이동 */
      var dx = input.dx, dy = input.dy;
      if (!dx && !dy && target) {
        var tdx = target.x - p.x, tdy = target.y - p.y;
        var td = Math.sqrt(tdx * tdx + tdy * tdy);
        if (td < 6) { target = null; }
        else { dx = tdx / td; dy = tdy / td; }
      }
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        dx /= len; dy /= len;
        var spd = spdOf() * (rally ? 1.25 : 1);
        p.x += dx * spd * dt;
        p.y += dy * spd * dt;
        p.walking = true;
        p.phase += dt * 9;
        if (dx) { p.facing = dx > 0 ? 1 : -1; }
        p.dirX = dx; p.dirY = dy;              // 스킬 방향용 — 마지막 이동 방향
      } else {
        p.walking = false;
      }
      boundPlayer(p, px0, py0);
    }
    if (p.hurt > 0) { p.hurt -= dt; }

    /* 기공파 투사체 */
    for (i = run.shots.length - 1; i >= 0; i--) {
      var sh = run.shots[i];
      sh.x += sh.dx * sh.spd * dt;
      sh.y += sh.dy * sh.spd * dt;
      sh.life -= dt;
      for (var si = 0; si < room.enemies.length; si++) {
        var se = room.enemies[si];
        if (se.hp <= 0 || sh.hit[si]) { continue; }
        if (dist(sh, se) < se.r + 10) {
          sh.hit[si] = true;
          /* 쏜 것이 제 배수와 결을 들고 간다 (무예마다 다르다) */
          strike(se, sh.mul || 2.2, 14, sh.el || 'chi');
          if (!run) { return; }
        }
      }
      if (sh.life <= 0 || sh.x < WALL || sh.x > ROOM_W - WALL ||
          sh.y < WALL || sh.y > ROOM_H - WALL) {
        run.shots.splice(i, 1);
      }
    }

    /* 궁수·조총병이 쏜 것 — 근접 대신 거리를 두고 쏘는 적의 화살·탄환
       (몬스터 다양화: `look.weapon` 이 bow·staff 인 적은 아래 "적" 루프에서
       가까이 안 붙고 이걸 쏜다) */
    for (i = run.foeShots.length - 1; i >= 0; i--) {
      var fsh = run.foeShots[i];
      fsh.x += fsh.dx * fsh.spd * dt;
      fsh.y += fsh.dy * fsh.spd * dt;
      fsh.life -= dt;
      if (dist(fsh, p) < P_R + 8) {
        hurtPlayer(fsh.dmg, fsh.el);
        if (!run) { return; }
        run.foeShots.splice(i, 1);
        continue;
      }
      if (fsh.life <= 0 || fsh.x < WALL || fsh.x > ROOM_W - WALL ||
          fsh.y < WALL || fsh.y > ROOM_H - WALL) {
        run.foeShots.splice(i, 1);
      }
    }

    /* 내 공격 — 사거리 안에서 가장 가까운 적 */
    p.atkCd -= dt;
    var reach = reachOf();
    var near = null, nd = 1e9;
    for (i = 0; i < room.enemies.length; i++) {
      var e = room.enemies[i];
      if (e.hp <= 0) { continue; }
      var d = dist(p, e) - e.r;
      if (d < nd) { nd = d; near = e; }
    }
    if (near && nd <= reach && p.atkCd <= 0) {
      p.atkCd = atkCdOf() / (rally ? 1.4 : 1);
      p.atkAnim = 0.22;
      strike(near);
      if (!run) { return; }
      if (Math.random() * 100 < boonVal('echoPct')) { strike(near); }
      if (!run) { return; }
    }

    /* 적 */
    for (i = 0; i < room.enemies.length; i++) {
      var en = room.enemies[i];
      if (en.hp <= 0) { continue; }
      en.phase += dt * 7;
      if (en.hurt > 0) { en.hurt -= dt; }
      var ed = dist(en, p);
      var el = en.elite ? eliteOf(en.elite) : null;
      if (el && el.regen && en.hp < en.hpMax) {      // 되살아나는 — 피가 아문다
        en.hp = Math.min(en.hpMax, en.hp + en.hpMax * el.regen * dt);
      }
      /* 독(毒) — 몇 초에 걸쳐 들어간다 */
      if (en.dots && en.dots.length) {
        for (var di2 = en.dots.length - 1; di2 >= 0; di2--) {
          var dt2 = en.dots[di2];
          en.hp -= dt2.dps * dt;
          dt2.t -= dt;
          if (dt2.t <= 0) { en.dots.splice(di2, 1); }
        }
        if (en.hp <= 0) { kill(en); if (!run) { return; } continue; }
      }
      /* 빙(氷) — 굼떠진다 */
      var chill = 1;
      if (en.slow > 0) {
        en.slow -= dt;
        chill = 1 - (en.slowMul || 0.45);
      }
      var espd = (62 + Math.min(40, run.floor * 1.5)) *
                 (el && el.spd ? el.spd : 1) * chill;
      /* 궁수·조총병은 붙지 않고 RANGED_STOP 거리에서 멈춘다 — 나머지는 그대로
         닿을 때까지 다가온다(옛 동작과 완전히 같다) */
      var lookW = en.ref && en.ref.look && en.ref.look.weapon;
      var ranged = lookW === 'bow' || lookW === 'staff';
      var stopAt = ranged ? RANGED_STOP : (en.r + P_R - 2);
      /* 잡졸 이동 패턴 — 여태 궁수·조총병 말고는 다 같은 속도로 똑바로 걸어왔다
         (몬스터 다양화의 남은 절반). 무기마다 접근하는 결을 갈랐다 — 판정 값
         (속도·피해)은 안 건드리고 **경로만** 흔든다. `en.phase` 는 이미 dt 로만
         도는 결정적인 값이라 새 Math.random() 을 안 쓴다(진단이 이 흐름의
         Math.random() 순서에 기대지 않게 하려는 뜻이다). */
      var wob = (!ranged && lookW === 'axe') ? Math.sin(en.phase * 0.6) * 0.5 : 0;
      var lunge = (!ranged && lookW === 'club') ? 1 + Math.max(0, Math.sin(en.phase * 0.9)) * 0.7 : 1;
      if (ed > stopAt) {
        var mvx = (p.x - en.x) / ed, mvy = (p.y - en.y) / ed;
        if (wob) {
          var perpx = -mvy, perpy = mvx;
          mvx += perpx * wob; mvy += perpy * wob;
          var mvl = Math.sqrt(mvx * mvx + mvy * mvy) || 1;
          mvx /= mvl; mvy /= mvl;
        }
        en.x += mvx * espd * lunge * dt;
        en.y += mvy * espd * lunge * dt;
      }
      /* 창·극(戟) 은 자루가 길다 — 몸이 닿기 전에 먼저 닿는다(무기마다 다른
         사거리, 몬스터 다양화의 나머지 절반) */
      var reachBonus = (lookW === 'spear' || lookW === 'halberd') ? 14 : 0;
      en.cd -= dt;
      if (ed <= en.r + P_R + 6 + reachBonus && en.cd <= 0) {
        /* 붙었으면 궁수·조총병도 그냥 몸으로 밀친다(막다른 곳에 몰렸을 때) */
        en.cd = ENEMY_CD * (el && el.cd ? el.cd : 1) / chill;
        hurtPlayer(en.dmg, en.ref && en.ref.atkEl);
        if (!run) { return; }
      } else if (ranged && ed > en.r + P_R + 6 && ed <= RANGED_MAX && en.cd <= 0) {
        en.cd = ENEMY_CD * 1.4 * (el && el.cd ? el.cd : 1) / chill;
        var frdx = p.x - en.x, frdy = p.y - en.y;
        var frd = Math.sqrt(frdx * frdx + frdy * frdy) || 1;
        var frEl = (en.ref && en.ref.atkEl) || 'phys';
        run.foeShots.push({
          x: en.x, y: en.y - 8, dx: frdx / frd, dy: frdy / frd, spd: 260, life: 1.8,
          dmg: en.dmg, el: frEl, color: elemColorOf(frEl)
        });
      }

      /* 보스 강타 — 예고(붉은 파문) 뒤 터진다(PLAN 15절 "보스 패턴") */
      if (en.boss) {
        if (en.slamWarn > 0) {
          en.slamWarn -= dt;
          if (en.slamWarn <= 0) {
            if (dist(en, p) < SLAM_RANGE) {
              hurtPlayer(en.dmg * SLAM_MUL, en.ref && en.ref.atkEl);
              if (!run) { return; }
            }
            fx.push({ t: 'pop', x: en.x, y: en.y, life: 0.5, boss: true });
            en.slamCd = 6 + Math.random() * 2;
          }
        } else {
          en.slamCd = (en.slamCd === undefined ? 4 : en.slamCd) - dt;
          if (en.slamCd <= 0) {
            en.slamWarn = SLAM_WARN;
            fx.push({ t: 'whirl', x: en.x, y: en.y, r: SLAM_RANGE, life: SLAM_WARN,
              el: 'fire', color: '#ff6a3a' });
          }
        }
      }
    }

    /* 방 정리 판정 */
    if (!room.cleared) {
      var alive = 0;
      /* 들판 로머(`.field`)는 문 열림 판정에서 뺀다 — 방 안 몬스터만 다 잡으면
         된다. 안 그러면 계속 보충되는 필드 로머 때문에 방이 영영 안 열린다 */
      for (i = 0; i < room.enemies.length; i++) {
        if (room.enemies[i].hp > 0 && !room.enemies[i].field) { alive++; }
      }
      if (!alive) {
        room.cleared = true;
        core.emit('dungeon:clear', room);
      }
    }

    /* 바닥에 떨어진 것 줍기 */
    for (i = room.drops.length - 1; i >= 0; i--) {
      var dp = room.drops[i];
      if (dist(p, dp) < P_R + 14) {
        /* take 가 false 를 돌려주면 **바닥에 그대로 둔다** —
           벨트가 찼을 때 물약이 사라지면 원작의 감각이 깨진다 */
        if (take(dp) !== false) { room.drops.splice(i, 1); }
      }
    }

    /* 항아리 — 지나가기만 해도 깨진다. 원작처럼 뭔가 조금 나온다 */
    var dec2 = room.decor || [];
    for (i = 0; i < dec2.length; i++) {
      var jr = dec2[i];
      if (jr.t !== 'jar' || jr.broken) { continue; }
      if (dist(p, jr) > P_R + 16) { continue; }
      jr.broken = true;
      fx.push({ t: 'pop', x: jr.x, y: jr.y, life: 0.3 });
      sfx('jar');
      var roll = Math.random();
      if (roll < 0.42) { dropGold(room, jr.x, jr.y, 0.5); }
      else if (roll < 0.62) { dropPotion(room, jr.x, jr.y); }
      else if (roll < 0.70) { dropMat(room, jr.x, jr.y, -10); }
      else if (roll < 0.74) { dropItem(room, jr.x, jr.y, -8); }
    }

    /* 상자 · 우물 · 사당 */
    if (room.chest && !room.chest.taken && room.cleared && dist(p, room.chest) < P_R + 20) {
      room.chest.taken = true;
      var bonus = 1 + Math.floor(Math.random() * 2);
      for (var c = 0; c < bonus; c++) {
        dropItem(room, room.chest.x, room.chest.y, 22);
      }
      dropGold(room, room.chest.x, room.chest.y, 3);
      sfx('chest');
      core.emit('toast', '🎁 보물상자!');
    }
    if (room.well && !room.well.used && dist(p, room.well) < P_R + 20) {
      room.well.used = true;
      healBy(run.hpMax * 0.4);
      sfx('well');
      core.emit('toast', '💧 우물 · 체력 40% 회복');
    }
    if (room.shrine && !room.shrine.used && room.cleared && dist(p, room.shrine) < P_R + 20) {
      room.shrine.used = true;
      shrineBoon();
      sfx('shrine');
      core.emit('toast', '⛩️ 사당 · 은사를 고르세요');
    }
    if (room.vein && !room.vein.used && room.cleared && dist(p, room.vein) < P_R + 20) {
      /* 채광방(POI: Cave) — 광맥을 캔다. 상자·사당과 같은 손짓(지킴이가
         있을 수 있으니 방을 다 치운 뒤에만)이지만, 나오는 것은 재료 둘
         확정이다(우물의 회복량 40% 만큼 후하게 잡았다) */
      room.vein.used = true;
      dropMat(room, room.vein.x, room.vein.y, 26);
      dropMat(room, room.vein.x, room.vein.y, 26);
      sfx('chest');
      core.emit('toast', '⛏️ 광맥 · 세공 재료를 캤다');
    }
    if (room.merchant && !room.merchant.used && room.cleared && dist(p, room.merchant) < P_R + 20) {
      room.merchant.used = true;
      run.merchantChoice = rollMerchantStock(run.floor);
      sfx('shrine');
      core.emit('toast', '🧺 행상 · 살 것을 고르세요');
    }
    if (room.puzzle && !room.puzzle.solved) {
      var pz = room.puzzle;
      for (var pk = 0; pk < pz.pods.length; pk++) {
        var pod = pz.pods[pk];
        var podNear = dist(p, pod) < P_R + 20;
        if (podNear && !pod.near) { touchPuzzlePod(room, pz, pod); }
        pod.near = podNear;
      }
    }
    if (room.captive && !room.captive.freed && room.cleared && dist(p, room.captive) < P_R + 20) {
      /* 이벤트방(POI: Event) — 구출. 사당과 달리 고르지 않고 바로 하나
         얹는다("받은 은혜" 라는 뜻이다) */
      room.captive.freed = true;
      var freePool = [], fi;
      for (fi = 0; fi < DD.BOONS.length; fi++) {
        var fb = DD.BOONS[fi];
        if ((run.boons[fb.key] || 0) < fb.max) { freePool.push(fb.key); }
      }
      if (freePool.length) {
        var freeKey = freePool[Math.floor(Math.random() * freePool.length)];
        var gotBoon = applyBoon(freeKey);
        if (gotBoon) { core.log('🙏 구출 · 은사 ' + gotBoon.name + ' (' + run.boons[freeKey] + '중첩)', 'good'); }
      }
      dropItem(room, room.captive.x, room.captive.y, 16);
      dropGold(room, room.captive.x, room.captive.y, 2);
      sfx('shrine');
      core.emit('toast', '🙏 구출 · 은혜를 갚는다');
      core.emit('dungeon:rescue', { floor: run.floor });
    }
    if (room.forage) {
      /* 약초 — 항아리와 같은 손짓(닿기만 해도, 방을 안 치워도) */
      var fg = room.forage;
      for (var fhi = 0; fhi < fg.herbs.length; fhi++) {
        var herb = fg.herbs[fhi];
        if (herb.picked || dist(p, herb) > P_R + 16) { continue; }
        herb.picked = true;
        fx.push({ t: 'pop', x: herb.x, y: herb.y, life: 0.3 });
        sfx('jar');
        dropPotion(room, herb.x, herb.y);
      }
      /* 못 — 우물·사당과 같은 손짓(방을 다 치운 뒤 한 번) */
      if (fg.pond && !fg.pond.used && room.cleared && dist(p, fg.pond) < P_R + 20) {
        fg.pond.used = true;
        var catchRoll = Math.random();
        if (catchRoll < 0.5) { dropGold(room, fg.pond.x, fg.pond.y, 1.4); }
        else if (catchRoll < 0.85) { dropMat(room, fg.pond.x, fg.pond.y, 10); }
        else { dropItem(room, fg.pond.x, fg.pond.y, 6); }
        sfx('chest');
        core.emit('toast', '🎣 손맛 · 무언가 걸렸다');
      }
    }
    /* 비밀(POI: Secret) — 균열들 사이에 숨어 있다. 문 목록엔 아예 없으므로
       여기서 방마다 있는 균열을 훑어 찾는다(있으면 하나뿐이다) */
    for (i = 0; i < room.decor.length; i++) {
      var dc = room.decor[i];
      if (!dc.secret || dc.found) { continue; }
      var dcNear = dist(p, dc) < P_R + 22;
      if (dcNear && !dc.near) {
        dc.found = true;
        dropItem(room, dc.x, dc.y, 24);
        dropGold(room, dc.x, dc.y, 2.6);
        sfx('chest');
        core.emit('toast', '🔍 비밀 통로를 찾았다!');
      }
      dc.near = dcNear;
    }

    /* 문 */
    if (room.cleared) {
      for (i = 0; i < room.doors.length; i++) {
        var dr = room.doors[i];
        if (p.x > ROOM_W - WALL - P_R - 4 && Math.abs(p.y - dr.y) < 34) {
          sfx('door');
          goRoom(dr.kind);
          break;
        }
      }
    }

    /* 잠깐짜리 무예가 식는다 */
    if (run.buffs) {
      for (var bk in run.buffs) {
        if (!Object.prototype.hasOwnProperty.call(run.buffs, bk)) { continue; }
        run.buffs[bk].t -= dt;
        if (run.buffs[bk].t <= 0) { delete run.buffs[bk]; }
      }
    }
    /* 저주가 풀린다 */
    for (i = 0; i < room.enemies.length; i++) {
      var hx = room.enemies[i].hex;
      if (hx && hx.t > 0) {
        hx.t -= dt;
        if (hx.t <= 0) { room.enemies[i].hex = null; }
      }
    }
    /* 분신이 대신 싸운다 */
    updateMinions(dt);
    if (!run) { return; }

    /* 연출 수명 */
    for (i = fx.length - 1; i >= 0; i--) {
      fx[i].life -= dt;
      if (fx[i].life <= 0) { fx.splice(i, 1); }
    }
  }

  /**
   * 한 대 때린다.
   * @param mul  스킬 배율 (기본 1)
   * @param kb   밀쳐내는 거리 (기본 8 — 타격감의 핵심)
   */
  /**
   * @param kind 'phys'(칼) | 'chi'(기) — 적의 저항이 이 결을 보고 깎는다.
   *             안 주면 물리다(평타·회전참·돌진).
   */
  function strike(e, mul, kb, kind) {
    kind = kind || 'phys';
    var dmg = atkOf() * (mul || 1) * (0.86 + Math.random() * 0.28);
    var critChance = boonVal('critPct') + core.effect('critPct');
    var crit = Math.random() * 100 < critChance;
    if (crit) { dmg *= 1.85; }
    dmg *= 1 + boonVal('piercePct') / 100 * 0.5;
    /* 주박·멸에 걸린 적은 더 아파한다 */
    if (e.hex && e.hex.t > 0) { dmg *= 1 + e.hex.v / 100; }
    /* 저항 — 관통(貫通) 은사가 저항도 절반만큼 뚫는다(방어를 무시하듯) */
    var res = resistOf(e, kind) * (1 - boonVal('piercePct') / 100 * 0.5);
    if (res > 0) { dmg *= 1 - res / 100; }
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;
    e.hurt = 0.2;
    /* 넉백 — 보스는 거의 안 밀린다 */
    var push = (kb === undefined ? 8 : kb) * (e.boss ? 0.25 : 1);
    if (push && run) {
      var p = run.player;
      var dx = e.x - p.x, dy = e.y - p.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      /* 들판 로머(`.field`)는 방 벽 좌표로 clamp하지 않는다 — 안 그러면
         맞을 때마다 방 안으로 순간이동해 버린다 */
      if (e.field) {
        e.x += dx / d * push;
        e.y += dy / d * push;
      } else {
        e.x = core.clamp(e.x + dx / d * push, WALL + e.r, ROOM_W - WALL - e.r);
        e.y = core.clamp(e.y + dy / d * push, WALL + e.r, ROOM_H - WALL - e.r);
      }
      fx.push({ t: 'slash', x: e.x, y: e.y - e.r * 0.6,
        a: Math.atan2(dy, dx), life: 0.16, crit: crit,
        el: kind !== 'phys' ? kind : null, color: kind !== 'phys' ? elemColorOf(kind) : null });
    }
    fx.push({ t: 'hit', x: e.x, y: e.y - e.r, v: dmg, crit: crit, life: 0.6,
              resist: res >= 20 });
    sfx(crit ? 'crit' : 'hit');

    /* 원소 — 무기에 박은 보석이 얹는다. **결마다 저항이 따로**다(원작과 같다).
       한 대에 여러 결이 같이 들어갈 수 있다 — 원작의 무기 피해가 그렇다. */
    applyElem(e, mul || 1);
    /* 가시 돋친 정예 — 때린 만큼 조금 되돌아온다 */
    var elS = e.elite ? eliteOf(e.elite) : null;
    if (elS && elS.thorn && e.hp > 0) {
      hurtPlayer(Math.max(1, Math.round(dmg * elS.thorn)));
      if (!run) { return; }
    }
    if (e.hp <= 0) { kill(e); }
  }

  /**
   * 원소 피해 한 묶음. 결마다 성질이 다르다 (data-elem.js):
   *   빙 느리게 · 뇌 편차 크게 · 독 몇 초에 걸쳐 · 화·기 곧게.
   * 물리는 여기 안 온다 — 무기 자체가 물리다.
   */
  function applyElem(e, mul) {
    var ED = global.DG.elemData;
    if (!ED) { return; }
    var dmgs = elemDmgOf(), k;
    for (k in dmgs) {
      if (!Object.prototype.hasOwnProperty.call(dmgs, k) || !dmgs[k]) { continue; }
      var def = ED.elemByKey(k);
      if (!def) { continue; }
      var v = dmgs[k] * mul * (1 + run.floor * 0.06);
      if (def.spread) {                       // 뇌 — 편차가 크다
        v *= 1 - def.spread / 2 + Math.random() * def.spread;
      }
      var er = resistOf(e, k);
      v *= 1 - er / 100;
      v = Math.max(1, Math.round(v));

      if (def.dot) {                          // 독 — 몇 초에 걸쳐
        if (!e.dots) { e.dots = []; }
        e.dots.push({ el: k, dps: v / def.dot, t: def.dot });
      } else {
        e.hp -= v;
      }
      if (def.slow) {                         // 빙 — 굼떠진다
        e.slow = Math.max(e.slow || 0, def.slowSec);
        e.slowMul = def.slow;
      }
      fx.push({ t: 'elem', x: e.x + (Math.random() - 0.5) * 10, y: e.y - e.r - 6,
                v: v, el: k, color: def.color, life: 0.6, dot: !!def.dot });
    }
  }

  function kill(e) {
    run.kills += 1;
    dstate().kills = (dstate().kills || 0) + 1;
    core.emit('dungeon:kill', { e: e, floor: run.floor });
    var drain = boonVal('drainPct');
    if (drain) { healBy(run.hpMax * drain / 100); }
    run.mp = Math.min(run.mpMax, run.mp + MP_ON_KILL);
    fx.push({ t: 'pop', x: e.x, y: e.y, life: 0.45, boss: e.boss });
    fx.push({ t: 'burst', x: e.x, y: e.y - e.r * 0.5, life: 0.5, boss: e.boss,
      color: (e.ref && e.ref.color) || '#c9a83a', seed: Math.random() * 6.28 });
    sfx(e.boss ? 'boss' : 'kill');
    var elK = e.elite ? eliteOf(e.elite) : null;
    if (elK && elK.split && !e.shade) {
      /* 그림자 — 쓰러진 자리에 분신이 선다 (원작의 분열 몬스터) */
      for (var sp = 0; sp < elK.split; sp++) {
        var kid = spawnEnemy(run.floor, false, {
          spawned: true, shade: true,
          x: core.clamp(e.x + (sp ? 22 : -22), WALL + 12, ROOM_W - WALL - 12),
          y: core.clamp(e.y + (sp ? 14 : -14), WALL + 12, ROOM_H - WALL - 12)
        });
        run.room.enemies.push(kid);
      }
      core.emit('toast', '👤 그림자가 갈라졌다');
    }
    dropGold(run.room, e.x, e.y, e.boss ? 5 : (elK ? 2.2 : 1));
    /* 정예는 원작처럼 **확정으로** 떨어뜨린다 */
    var chance = e.boss ? 1 : (elK ? 1 : 0.2 + Math.min(0.15, run.floor * 0.004));
    if (Math.random() < chance) {
      dropItem(run.room, e.x, e.y, e.boss ? 30 : (elK ? 14 : 0));
    }
    /* 세공 재료 — 장비보다 자주 나온다(박을 자리는 늘 모자라다) */
    if (Math.random() < (e.boss ? 0.9 : 0.12)) {
      dropMat(run.room, e.x, e.y, e.boss ? 30 : 0);
    }
    /* 단약 — 원작에서 **가장 흔한 드랍**이다. 벨트가 비면 싸움을 이어 갈 수 없다 */
    if (Math.random() < (e.boss ? 1 : (elK ? 0.34 : 0.16))) {
      dropPotion(run.room, e.x, e.y);
    }
    /* 감정서 — 미확인 물건이 쌓이는 속도에 맞춰 나온다.
       모자라면 행상에서 싸게 산다(막는 관문이 아니라 거쳐 가는 자리다) */
    if (Math.random() < (e.boss ? 0.8 : 0.07)) {
      run.room.drops.push({ kind: 'scroll', x: jitter(e.x), y: jitter(e.y) });
    }
    core.gainExp(Math.round((1 + Math.floor(run.floor / 3)) * mode().exp));
    global.DG.hero.awardParty(1 + Math.floor(run.floor / 4));
  }

  function dropGold(room, x, y, mul) {
    var g = Math.round(5 * Math.pow(1.19, run.floor - 1) * mul * mode().gold *
      (1 + boonVal('goldPct') / 100) * (1 + core.effect('goldPct') / 100));
    room.drops.push({ kind: 'gold', gold: g, x: jitter(x), y: jitter(y) });
  }

  function dropItem(room, x, y, bias) {
    var it = global.DG.item.roll(run.floor + 1, { bias: (bias || 0) + mode().bias });
    room.drops.push({ kind: 'item', item: it, x: jitter(x), y: jitter(y) });
  }

  /**
   * 세공 재료 — 보석 · 부문(符文) · 주옥(珠玉).
   * 부문은 층이 깊어야 나온다(원작에서 높은 룬이 깊은 곳에서만 나오는 그 규칙).
   * 주옥은 셋 중 가장 드물고 **4층부터** 나온다 — 굴러 나오는 물건이라
   * 처음부터 쏟아지면 보석을 박을 까닭이 없어진다.
   */
  function dropMat(room, x, y, bias) {
    var GD = global.DG.gemData;
    if (!GD) { return; }
    var floor = run.floor;
    if (GD.rollJewel && floor >= 4) {
      var jewelChance = Math.min(0.10, 0.02 + floor * 0.004) +
        ((bias || 0) + mode().bias) / 600;
      if (Math.random() < jewelChance) {
        room.drops.push({ kind: 'mat', mat: { kind: 'jewel', j: GD.rollJewel(floor + 1) },
                          x: jitter(x), y: jitter(y) });
        return;
      }
    }
    var runeChance = 0.22 + ((bias || 0) + mode().bias) / 200;
    if (Math.random() < runeChance) {
      /* 부문 — 층이 감당하는 등급까지만 */
      var maxTier = core.clamp(1 + Math.floor(floor / 4), 1, 5);
      var pool = GD.RUNES.filter(function (r) { return r.tier <= maxTier; });
      if (pool.length) {
        var wsum = 0, i;
        for (i = 0; i < pool.length; i++) { wsum += 1 / pool[i].tier; }
        var pick = Math.random() * wsum, chosen = pool[0];
        for (i = 0; i < pool.length; i++) {
          pick -= 1 / pool[i].tier;
          if (pick <= 0) { chosen = pool[i]; break; }
        }
        room.drops.push({ kind: 'mat', mat: { kind: 'rune', key: chosen.key },
                          x: jitter(x), y: jitter(y) });
        return;
      }
    }
    /* 보석 — 등급도 층을 탄다 */
    var gem = core.pick(GD.GEMS);
    var g = 0, cap = core.clamp(Math.floor(floor / 3), 0, 4);
    while (g < cap && Math.random() < 0.45) { g++; }
    room.drops.push({ kind: 'mat', mat: { kind: 'gem', key: gem.key, g: g },
                      x: jitter(x), y: jitter(y) });
  }

  function dropPotion(room, x, y) {
    var P = global.DG.potion;
    if (!P) { return; }
    room.drops.push({ kind: 'potion', p: P.rollDrop(run.floor), x: jitter(x), y: jitter(y) });
  }

  function jitter(v) { return v + (Math.random() - 0.5) * 26; }

  function take(dp) {
    if (dp.kind === 'gold') {
      /* 마을(`run.town`)은 탈출해야 정산되는 노획물 개념이 없다 — 이미 안전지대에
         있으므로 주운 즉시 지갑으로 넣는다(재료·물약·감정서와 같은 대접) */
      if (run.town) { core.save.player.gold += dp.gold; }
      else { run.loot.gold += dp.gold; }
      fx.push({ t: 'get', x: dp.x, y: dp.y, text: '+' + core.fmt(dp.gold), life: 0.8 });
      sfx('gold');
    } else if (dp.kind === 'scroll') {
      /* 감정서도 재료처럼 **바로 주머니로** — 노획물 정산을 타지 않는다 */
      global.DG.item.addScroll(1);
      fx.push({ t: 'get', x: dp.x, y: dp.y, text: '감정서', color: '#8ec7ff', life: 1.0 });
      sfx('scroll');
    } else if (dp.kind === 'potion') {
      var P = global.DG.potion;
      if (!P) { return false; }
      var pr = P.add(dp.p.kind, dp.p.g);
      if (!pr.ok) { return false; }               // 벨트가 찼다 — 바닥에 남는다
      var pl = P.label(dp.p.kind, dp.p.g);
      fx.push({ t: 'get', x: dp.x, y: dp.y, text: pl,
                color: P.kindOf(dp.p.kind).color, life: 1.0 });
      sfx('coin');
    } else if (dp.kind === 'mat') {
      /* 재료는 즉시 주머니로 — 노획물 정산을 타지 않는다(죽어도 잃지 않는다).
         디아블로에서도 룬·젬은 인벤에 바로 들어간다 */
      var GD = global.DG.gemData;
      var m = dp.mat, label, color;
      if (m.kind === 'jewel') {
        /* 주옥은 낱개라 자리가 없으면 **바닥에 남는다**(요대와 같은 규칙) */
        var jr = global.DG.item.addJewel(m.j);
        if (!jr.ok) { return false; }
        m.j = jr.jewel;                       // id 가 붙은 것으로 갈아 둔다
        label = GD.jewelName(jr.jewel);
        color = '#f07ac0';
      } else {
        global.DG.item.addMat(m.kind, m.key, m.g || 0, 1);
        label = m.kind === 'gem'
          ? (GD.grade(m.g).name + ' ' + GD.gemByKey(m.key).name)
          : (GD.runeByKey(m.key).glyph + '(' + GD.runeByKey(m.key).name + ')');
        color = m.kind === 'rune' ? '#f0a53a' : GD.grade(m.g).color;
      }
      fx.push({ t: 'get', x: dp.x, y: dp.y, text: label, color: color, life: 1.1 });
      sfx(m.kind === 'gem' ? 'mat' : (m.kind === 'rune' ? 'rune' : 'jewel'));
      if (m.kind === 'rune') { core.emit('toast', '📜 부문 ' + label); }
      if (m.kind === 'jewel') { core.emit('toast', '◈ 주옥 · ' + label); }
    } else {
      run.loot.items.push(dp.item);
      var t = global.DG.item.tierOf(dp.item);
      fx.push({ t: 'get', x: dp.x, y: dp.y, text: global.DG.item.name(dp.item), color: t.color, life: 1.1 });
      /* 고유가 떨어지면 따로 알린다 — 원작에서 유니크는 **소리부터** 다르다.
         2026-08-26 부터 여기도 실제로 소리가 다르다(sfx.js 의 'uniq' — 그 종소리) */
      var uq2 = global.DG.item.uniqOf(dp.item);
      var S2 = global.DG.sfx;
      if (S2) { S2.play(S2.dropCue(dp.item.tier, uq2)); }
      if (uq2) { core.emit('toast', '⭐ 고유 · ' + uq2.name); }
      else if (dp.item.tier >= 2) {
        core.emit('toast', '🎁 ' + t.name + ' · ' + global.DG.item.name(dp.item));
      }
    }
  }

  function dist(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy) || 0.0001;
  }

  /* ── 스킬 ─────────────────────────────────────────────── */

  /**
   * 스킬을 쓴다.
   * @param i 0 회전참 · 1 돌진 · 2 기공파 · 3 사기
   * @return true = 시전됨
   */
  /* ── 무예(武藝) — 원작의 스킬 ───────────────────────────────
   * 직업마다 아홉씩, 다섯 직업이면 마흔다섯이다. 마흔다섯을 따로 구현하면
   * 손을 못 댄다 — 원작의 스킬도 실은 **몇 가지 모양**이 원소·수치만 바꿔 가며
   * 되풀이된다. 그래서 **모양 아홉**만 여기 두고, 표(data-skill.js)가 값을 끼운다.
   *
   * 어느 무예를 쓰느냐는 **선두**가 정한다. 동행을 바꾸면 손이 통째로 바뀐다 —
   * 그게 원작에서 직업을 고르는 감각이다.
   */

  /** 네 칸에 걸린 무예 (없으면 빈 칸) */
  function slotSkills() {
    var skl = global.DG.skill, id = leadId();
    if (!skl || !id) { return [null, null, null, null]; }
    return skl.equipped(id);
  }

  /** 무예의 위력 배수 — '집중·주술' 같은 상시가 여기 얹힌다 */
  function skillMul() { return 1 + boonVal('skillPct') / 100; }

  function castSkill(i) {
    if (!run || run.choice) { return false; }
    var got = slotSkills()[i];
    if (!got) { return false; }
    var sk = got.sk, rank = got.rank;
    var SDx = global.DG.skillData;
    var p = run.player;
    if (p.cds[i] > 0 || run.mp < sk.cost || p.dash) { return false; }
    run.mp -= sk.cost;
    p.cds[i] = sk.cd;

    var v = SDx.valueAt(sk, rank);
    var room = run.room, j;

    if (sk.shape === 'swing') {
      var radius = reachOf() * (sk.r || 2.0);
      fx.push({ t: 'whirl', x: p.x, y: p.y, r: radius, life: 0.3,
        el: sk.el || null, color: sk.el ? elemColorOf(sk.el) : null });
      for (j = 0; j < room.enemies.length; j++) {
        var we = room.enemies[j];
        if (we.hp <= 0) { continue; }
        if (dist(p, we) <= radius + we.r) {
          strike(we, v * skillMul(), sk.kb === undefined ? 20 : sk.kb, sk.el || 'phys');
        }
      }

    } else if (sk.shape === 'nova') {
      var nr = (sk.r || 130);
      fx.push({ t: 'ring', x: p.x, y: p.y, life: 0.55,
        el: sk.el || null, color: sk.el ? elemColorOf(sk.el) : null });
      for (j = 0; j < room.enemies.length; j++) {
        var ne = room.enemies[j];
        if (ne.hp <= 0) { continue; }
        if (dist(p, ne) <= nr + ne.r) {
          strike(ne, v * skillMul(), sk.kb || 0, sk.el || 'phys');
        }
      }

    } else if (sk.shape === 'bolt') {
      var bdx = p.dirX || p.facing, bdy = p.dirY || 0;
      var bl = Math.sqrt(bdx * bdx + bdy * bdy) || 1;
      var shots = sk.shots || 1;
      for (j = 0; j < shots; j++) {
        /* 여럿이면 부챗살로 퍼진다 (연사) */
        var ang = Math.atan2(bdy / bl, bdx / bl) +
                  (shots > 1 ? (j - (shots - 1) / 2) * (sk.spread || 0.3) : 0);
        run.shots.push({
          x: p.x, y: p.y - 8, dx: Math.cos(ang), dy: Math.sin(ang),
          spd: 330, life: 1.5, hit: {},
          mul: v * skillMul(), el: sk.el || 'phys', color: elemColorOf(sk.el)
        });
      }

    } else if (sk.shape === 'dash') {
      var ddx = p.dirX || p.facing, ddy = p.dirY || 0;
      var dl = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
      p.dash = { t: 0.2 * (sk.far || 1), dx: ddx / dl, dy: ddy / dl, hit: {},
                 mul: v * skillMul(), el: sk.el || 'phys' };
      p.invuln = 0.34 * (sk.far || 1);

    } else if (sk.shape === 'buff') {
      addBuff(sk.eff, v, sk.sec || 6);
      if (sk.eff === 'atkSpdPct') { p.rallyUntil = Date.now() + (sk.sec || 6) * 1000; }
      fx.push({ t: 'ring', x: p.x, y: p.y, life: 0.55 });

    } else if (sk.shape === 'heal') {
      healBy(run.hpMax * v / 100);
      fx.push({ t: 'get', x: p.x, y: p.y, text: '+' + Math.round(run.hpMax * v / 100),
                color: '#6ea24a', life: 0.9 });

    } else if (sk.shape === 'curse') {
      var cr = sk.r || 130;
      for (j = 0; j < room.enemies.length; j++) {
        var ce = room.enemies[j];
        if (ce.hp <= 0 || dist(p, ce) > cr + ce.r) { continue; }
        ce.slow = Math.max(ce.slow || 0, sk.sec || 5);
        ce.slowMul = 0.35;
        ce.hex = { v: v, t: sk.sec || 5 };            // 받는 피해가 늘어난다
      }
      fx.push({ t: 'ring', x: p.x, y: p.y, life: 0.55 });

    } else if (sk.shape === 'summon') {
      summon(Math.round(v), sk.sec || 12, sk.str || 1, !!sk.big);
    }

    core.emit('dungeon:skill', sk.key);
    return true;
  }

  function elemColorOf(el) {
    var ED = global.DG.elemData;
    return el && ED ? ED.elemColor(el) : 'rgba(120,220,255,0.9)';
  }

  /* ── 분신(分身) — 원작의 소환 ───────────────────────────────
   * 방사(方士)의 나무가 세운다. 적을 쫓아가 대신 때리고, 때가 되면 흩어진다.
   * **적이 분신을 때리지는 않는다** — 적의 표적을 나누는 규칙까지 넣으면
   * 이 판의 전투가 통째로 달라진다. 원작의 소환수 감각 중 "대신 때린다" 만 옮겼다.
   */
  function summon(n, sec, strMul, big) {
    if (!run) { return; }
    if (!run.minions) { run.minions = []; }
    for (var i = 0; i < n; i++) {
      run.minions.push({
        x: run.player.x + (Math.random() - 0.5) * 40,
        y: run.player.y + (Math.random() - 0.5) * 30,
        t: sec, cd: 0.5 + Math.random() * 0.4,
        mul: 0.5 * strMul, big: !!big, phase: Math.random() * 6.28
      });
    }
    fx.push({ t: 'ring', x: run.player.x, y: run.player.y, life: 0.5 });
  }

  function updateMinions(dt) {
    if (!run || !run.minions || !run.minions.length) { return; }
    var room = run.room, i, j;
    for (i = run.minions.length - 1; i >= 0; i--) {
      var mn = run.minions[i];
      mn.t -= dt;
      if (mn.t <= 0) { run.minions.splice(i, 1); continue; }
      mn.phase += dt * 6;
      /* 가장 가까운 적을 쫓는다 */
      var best = null, bd = 1e9;
      for (j = 0; j < room.enemies.length; j++) {
        var en2 = room.enemies[j];
        if (en2.hp <= 0) { continue; }
        var dd = dist(mn, en2);
        if (dd < bd) { bd = dd; best = en2; }
      }
      if (!best) {
        /* 적이 없으면 주인 곁으로 */
        var pd = dist(mn, run.player) || 1;
        if (pd > 40) {
          mn.x += (run.player.x - mn.x) / pd * 90 * dt;
          mn.y += (run.player.y - mn.y) / pd * 90 * dt;
        }
        continue;
      }
      if (bd > best.r + 14) {
        mn.x += (best.x - mn.x) / bd * (mn.big ? 70 : 110) * dt;
        mn.y += (best.y - mn.y) / bd * (mn.big ? 70 : 110) * dt;
      } else {
        mn.cd -= dt;
        if (mn.cd <= 0) {
          mn.cd = mn.big ? 1.1 : 0.7;
          strike(best, mn.mul, 4, 'phys');
          if (!run) { return; }
        }
      }
    }
  }

  /* ── 화면이 읽어 가는 것 ──────────────────────────────── */

  function status() {
    if (!run) {
      var d = dstate();
      return { active: false, best: d.best || 0, runs: d.runs || 0, kills: d.kills || 0, deaths: d.deaths || 0 };
    }
    /* 네 칸 — 선두가 걸어 둔 무예. 빈 칸도 그대로 넘긴다(화면이 흐리게 그린다) */
    var skills = [], got = slotSkills();
    for (var i = 0; i < got.length; i++) {
      var cd = Math.max(0, run.player.cds[i]);
      if (!got[i]) {
        skills.push({ key: null, name: '비었다', emoji: '·', desc: '무예를 걸어 두세요',
                      cost: 0, cd: 0, cdMax: 1, ready: false, empty: true });
        continue;
      }
      var sk = got[i].sk;
      skills.push({
        key: sk.key, name: sk.name, emoji: sk.emoji, desc: sk.desc,
        rank: got[i].rank,
        cost: sk.cost, cd: cd, cdMax: sk.cd,
        ready: cd <= 0 && run.mp >= sk.cost
      });
    }
    return {
      active: true, floor: run.floor, theme: DD.themeOf(run.floor),
      hp: Math.max(0, Math.round(run.hp)), hpMax: run.hpMax,
      mp: Math.max(0, Math.round(run.mp)), mpMax: run.mpMax,
      skills: skills, rally: rallyOn(),
      room: run.room.index + 1, roomTotal: run.roomTotal,
      cleared: run.room.cleared, kind: run.room.kind,
      loot: { gold: Math.round(run.loot.gold), items: run.loot.items.length },
      boons: run.boons, choice: run.choice, merchantChoice: run.merchantChoice,
      kills: run.kills, best: dstate().best || 0,
      atk: Math.round(atkOf()), reach: Math.round(reachOf())
    };
  }

  global.DG = global.DG || {};
  global.DG.dungeon = {
    ELITES: ELITES, eliteOf: eliteOf, eliteChance: eliteChance, enemyName: enemyName,
    MODES: MODES, modeOf: modeOf, modesOpen: modesOpen, mode: mode, setMode: setMode,
    resistOf: resistOf, RESIST_CAP: RESIST_CAP,
    slotSkills: slotSkills,
    WAYPOINT_EVERY: WAYPOINT_EVERY, waypoint: waypoint, markWaypoint: markWaypoint,
    hardcore: hardcore, setHardcore: setHardcore, fallen: fallen,
    elemDmgOf: elemDmgOf, elemResOf: elemResOf,
    /** 자가진단용 — 한 대만 때려 본다 (저항이 결마다 다르게 깎는지) */
    _strike: strike,
    /** 자가진단용 — 한 대 맞아 본다 (갑주의 원소 저항이 실제로 깎는지) */
    _hurt: hurtPlayer,
    /** 자가진단용 — 적 하나를 만들어만 본다 */
    _spawnEnemy: spawnEnemy,
    /** 자가진단용 — 재료를 한 번 굴려 본다 (주옥이 얼마나 드문지는 굴려 봐야 안다) */
    _dropMat: dropMat,
    ROOM_W: ROOM_W, ROOM_H: ROOM_H, WALL: WALL, P_R: P_R,
    SKILL_SLOTS: SKILL_SLOTS,
    /** 던전 밖(마을 등)이 같은 필드 메커니즘을 빌려 쓸 때 쓰는 자리 —
     *  각 함수의 ctx 인자는 그 함수 정의 옆 주석을 볼 것 (사가블로 마을 필드전투). */
    FIELD_ENEMY_CAP: FIELD_ENEMY_CAP,
    fieldOn: fieldOn, fieldRadiusUnits: fieldRadiusUnits,
    fieldBoundPlayer: boundPlayer,
    spawnFieldRoamers: spawnFieldEncounters,
    fieldRoamerCount: fieldEnemyCount,
    stepFieldCombat: stepFieldCombat,
    pickupField: pickupField,
    active: active, enter: enter, leave: leave, update: update,
    setInput: setInput, moveTo: moveTo,
    pickBoon: pickBoon, goRoom: goRoom,
    buyMerchant: buyMerchant, leaveMerchant: leaveMerchant,
    castSkill: castSkill, refill: refill,
    boonVal: boonVal, boonEffect: boonEffect,
    status: status, state: dstate,
    /** 화면 전용 — 상태를 직접 읽는다 (쓰지는 말 것) */
    raw: function () { return run; },
    fx: function () { return fx; }
  };
})(window);
