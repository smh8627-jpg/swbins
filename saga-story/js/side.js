/**
 * 사냥터 — 메이플스토리식 2D 사이드스크롤의 규칙
 * ---------------------------------------------------------------
 * 순환은 셋이다:
 *   뛴다   좌우로 달리고 점프해 발판을 오른다
 *   썬다   앞을 베고 스킬을 쓴다 — 잡으면 경험치·금·탕약이 떨어진다
 *   오른다 레벨이 오르면 다음 사냥터가 열린다
 *
 * 화면은 side-view.js 가, 규칙은 여기가 맡는다. 이 파일은 캔버스를 모른다.
 *
 * 내 힘은 **선두 인물의 능력치**에서 나온다(hero.stats). 그래서 도감에서 더 좋은
 * 인물로 갈아타거나 승급하면 사냥이 수월해진다 — 다른 게임들과 같은 원칙이다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var SD = global.DG.sideData;

  /* 규칙 값은 균형 손잡이(core.tuned)를 거친다 — 어드민(`_admin.html`)이 잡는다.
     **켜질 때 한 번** 읽으므로 손잡이를 바꾼 뒤에는 게임 창을 새로고침해야 듣는다.
     자가진단·데모는 읽지 않는다(`DG_NO_TUNE`) — 판정이 흔들리면 안 된다. */
  var GRAV = core.tuned('side.grav', 1900);     // 중력 (단위/초²)
  var JUMP = core.tuned('side.jump', 760);      // 점프 속도
  var SPEED = core.tuned('side.speed', 270);    // 달리기
  var P_W = 26, P_H = 54;       // 사람 크기 (충돌 상자)
  var REACH = 78;               // 평타 사거리
  var MP_MAX = 100, MP_REGEN = core.tuned('side.mpRegen', 8);
  var BRACE_SEC = 8;
  var HIT_COOL = 0.7;           // 맞고 나서 무적
  var CLIMB = core.tuned('side.climb', 168);    // 줄을 오르내리는 속도
  var GRAB = 18;                // 줄에 붙는 좌우 여유 (중심에서)
  var PORTAL_R = 46;            // 문 앞으로 치는 좌우 여유
  var DROP_THRU = 0.26;         // ↓+점프로 발판을 빠져나가는 동안

  var E_HP = core.tuned('enemy.hpMul', 1);      // 적 체력 배수 (보스도 같이 탄다)
  var E_DMG = core.tuned('enemy.dmgMul', 1);    // 적 공격 배수
  var GAIN_EXP = core.tuned('gain.expMul', 1);  // 경험치 배수
  var GAIN_GOLD = core.tuned('gain.goldMul', 1);// 금 배수
  var DROP_POTION = core.tuned('drop.potion', 0.14);  // 탕약이 떨어질 확률
  var BOSS_COOL = core.tuned('boss.coolMul', 1);// 보스가 다시 나오기까지 (배수)
  /* 전투 연출(2026-08-26) — 판정에 닿는 것은 이 셋뿐이다.
     화면 흔들림·먼지·죽는 모습은 side-view.js 에만 있고 여기서는 모른다.
     **이 셋만 때릴 때마다 손잡이를 읽는다.** 다른 규칙 값은 켜질 때 한 번 읽지만
     (그래야 한 판 안에서 물리가 안 흔들린다), 이 셋은 어드민에서 눌러 보며 맞추는
     수라 곧바로 들어야 값이 있다. 한 번 더 읽는 값이 그만큼 싸기도 하다. */
  function critRate() { return core.tuned('crit.rate', 0.15); }   // 급소가 터질 확률
  function critMul() { return core.tuned('crit.mul', 1.6); }      // 그때 곱하는 값
  function knockPow() { return core.tuned('hit.knock', 62); }     // 맞은 적이 밀리는 힘

  /** 소리 한 번 — sfx.js 가 없어도 규칙은 그대로 돈다(진단·데모가 그렇다) */
  function sfx(key) {
    var S = global.DG.sfx;
    if (S) { S.play(key); }
  }

  var run = null;               // 지금 사냥 중인 판
  var input = { left: false, right: false, jump: false, up: false, down: false };
  var fx = [];

  /* ── 세이브 ───────────────────────────────────────────── */

  function st() {
    var s = core.save;
    if (!s.side) {
      s.side = { stage: 'field', potions: 3, kills: 0, deaths: 0, best: 'field', bosses: 0 };
    }
    /* 빠진 칸을 채운다 — 보스가 없던 시절의 세이브에는 이 칸이 없다 */
    if (!s.side.bossAt) { s.side.bossAt = {}; }
    if (typeof s.side.bosses !== 'number') { s.side.bosses = 0; }
    return s.side;
  }

  /* ── 내 힘 ────────────────────────────────────────────── */

  function meId() { return core.save.party[0] || null; }

  function meRef() {
    var id = meId();
    return id ? global.DG.data.find(id) : global.DG.data.heroes[0];
  }

  /** 낀 장비의 합 (gear.js 가 실려 있지 않아도 돌아야 한다) */
  function gearBonus() {
    var G = global.DG.gear;
    return G ? G.bonus() : { atk: 0, def: 0, hp: 0 };
  }

  /** 직업이 보태는 것 (job.js 가 없어도 돌아야 한다) */
  function jobGrow() {
    var J = global.DG.job;
    return J ? J.grow() : { hp: 0, atk: 0, mp: 0 };
  }

  /**
   * 선두 인물의 능력치에서 체력·공격력을 뽑고, **낀 장비를 그 위에 얹는다.**
   * 몸은 인물이 정하고 장비가 보태는 것 — 이 판의 두 성장축이 여기서 만난다.
   */
  function power() {
    var id = meId();
    var s = id ? global.DG.hero.stats(id) : { might: 20, wisdom: 10, command: 15 };
    var atk = s.might * 0.9 + s.wisdom * 0.3;
    var hp = 60 + s.command * 6 + core.save.player.level * 12;
    var g = gearBonus(), jb = jobGrow();
    return {
      atk: Math.max(4, Math.round(atk) + g.atk + jb.atk),
      hp: Math.round(hp) + g.hp + jb.hp,
      def: g.def,
      mp: MP_MAX + jb.mp,
      bare: { atk: Math.max(4, Math.round(atk)), hp: Math.round(hp) }
    };
  }

  /* ── 사냥터 열기 ──────────────────────────────────────── */

  function unlocked(key) {
    var stg = SD.stage(key);
    return core.save.player.level >= stg.need;
  }

  function stages() {
    var out = [], i;
    for (i = 0; i < SD.STAGES.length; i++) {
      var s = SD.STAGES[i];
      out.push({ ref: s, open: unlocked(s.key) });
    }
    return out;
  }

  /** 사냥터에 들어간다 */
  function enter(key) {
    var stg = SD.stage(key);
    if (!unlocked(stg.key)) {
      core.emit('toast', '⚠️ Lv.' + stg.need + ' 부터 들어갈 수 있습니다');
      return false;
    }
    if (!core.save.party.length) {
      core.emit('toast', '⚠️ 도감에서 인물을 하나 골라 앞에 세우세요');
      return false;
    }
    var pw = power();
    run = {
      stage: stg, hpMax: pw.hp, hp: pw.hp, mp: pw.mp, mpMax: pw.mp,
      player: { x: 80, y: stg.floor - P_H, vx: 0, vy: 0, facing: 1,
                onGround: true, phase: 0, atkCd: 0, hurt: 0, invuln: 0,
                cds: [0, 0, 0, 0, 0, 0], braceUntil: 0, buff: null,
                climb: null, dropThru: 0, resting: 0 },
      enemies: [], drops: [], shots: [], eshots: [],
      kills: 0, gold: 0, startedAt: Date.now()
    };
    st().stage = stg.key;
    for (var i = 0; i < stg.spawn; i++) { spawnEnemy(); }
    var b = spawnBoss();
    core.log('🏃 ' + stg.name + ' 에 들어섰다' +
      (b ? ' — 안쪽에 ' + b.ref.name + ' 이(가) 있다' : ''), 'info');
    if (b) { core.emit('toast', '👺 ' + b.ref.name + ' 이(가) 사냥터 안쪽을 지키고 있습니다'); }
    core.emit('side:enter', run);
    core.emit('changed');
    return true;
  }

  function leave() {
    if (!run) { return null; }
    var got = { gold: Math.round(run.gold), kills: run.kills, stage: run.stage.name };
    core.save.player.gold += got.gold;
    core.log('🚪 ' + got.stage + ' 에서 나왔다 · 🪙 ' + core.fmt(got.gold) +
      ' · ' + got.kills + '마리', 'info');
    run = null;
    core.emit('side:end', got);
    core.emit('changed');
    core.persist();
    return got;
  }

  /** 쉬는 화면(선택 메뉴) 없이 곧장 사냥터로 — 오픈월드처럼, 마지막 있던 자리부터
   *  다시 걷는다. 게임 루프(game.js)가 **쉬는 순간마다**(나온다 · 쓰러짐 뒤) 매 프레임
   *  이걸 불러 준다 — 그래서 side.js 자체의 leave()/die() 는 손대지 않는다:
   *  자가진단이 'S.leave() 뒤 !S.active()' 를 그대로 기대하기 때문이다(게임 루프를
   *  안 돌리는 자가진단에서는 이 함수가 안 불려 그 가정이 깨지지 않는다). */
  function resume() {
    if (run || !core.save.party.length) { return false; }
    return enter(st().stage || 'field');
  }

  function active() { return !!run; }

  /* ── 줄과 문 ──────────────────────────────────────────────
   * 원작의 세로 이동 둘이다. **밧줄·사다리는 ↑↓ 로 오르내리고**,
   * **문(포탈)은 ↑ 로 들어간다.** 발판 사이를 점프로만 오가던 것이
   * 이 판의 가장 큰 어색함이었다.
   *
   * 규칙은 여기(side.js)에만 있다 — 화면은 좌표를 읽어 그리기만 한다.
   */

  /** 이 자리에서 붙을 수 있는 줄 (없으면 null) */
  function ropeAt(cx, footY) {
    if (!run) { return null; }
    var list = run.stage.ropes || [], i;
    for (i = 0; i < list.length; i++) {
      var r = list[i];
      if (Math.abs(cx - r[0]) > GRAB) { continue; }
      /* 위쪽 끝보다 조금 높은 데까지 쳐 준다 — 발판 위에 서서 ↓ 로 타고 내려갈 수 있게 */
      if (footY < r[1] - 6 || footY > r[2] + 4) { continue; }
      return { x: r[0], top: r[1], bottom: r[2], kind: r[3] || 'rope' };
    }
    return null;
  }

  /** 이 자리에서 들어갈 수 있는 문 (없으면 null) */
  function portalAt(cx) {
    if (!run) { return null; }
    var list = run.stage.portals || [], i;
    for (i = 0; i < list.length; i++) {
      if (Math.abs(cx - list[i][0]) <= PORTAL_R) {
        return { x: list[i][0], to: list[i][1], ref: SD.stage(list[i][1]) };
      }
    }
    return null;
  }

  /** 줄에 붙는다 */
  function grab(rope) {
    var p = run.player;
    sfx('grab');
    p.climb = rope;
    p.x = rope.x - P_W / 2;
    p.vx = 0; p.vy = 0;
    p.onGround = false;
    p.dropThru = 0;
    return true;
  }

  /** 줄에서 손을 뗀다 (kick 은 튀는 방향 — 좌우 속도는 다음 프레임에 입력이 다시 정한다) */
  function letGo(kick) {
    var p = run.player;
    if (!p.climb) { return false; }
    p.climb = null;
    if (kick) { p.vy = -JUMP * 0.72; p.vx = kick; p.facing = kick > 0 ? 1 : -1; }
    return true;
  }

  /** 줄에만 붙는다 — 자동이 쓴다. **문은 건드리지 않는다**(자동이 사냥터를 넘어가 버린다) */
  function grabRope() {
    if (!run) { return false; }
    var p = run.player;
    if (p.climb) { return true; }
    var r = ropeAt(p.x + P_W / 2, p.y + P_H);
    return r ? grab(r) : false;
  }

  /** ↑ 를 눌렀을 때 — 줄이 먼저, 없으면 문 */
  function useUp() {
    if (!run) { return false; }
    var p = run.player;
    if (p.climb) { return true; }
    var r = ropeAt(p.x + P_W / 2, p.y + P_H);
    if (r) { return grab(r); }
    var g = portalAt(p.x + P_W / 2);
    if (g && p.onGround) { return travel(g.to); }
    return false;
  }

  /** ↓ 를 눌렀을 때 — 발판 위에서 그 아래로 뻗은 줄이 있으면 타고 내려간다 */
  function useDown() {
    if (!run) { return false; }
    var p = run.player;
    if (p.climb) { return true; }
    if (!p.onGround) { return false; }
    var r = ropeAt(p.x + P_W / 2, p.y + P_H + 8);
    if (!r || p.y + P_H + 8 > r.bottom) { return false; }
    grab(r);
    p.y += 6;
    return true;
  }

  /** ↓ + 점프 — 밟고 선 발판을 빠져나간다 (바닥에서는 안 된다) */
  function dropThrough() {
    if (!run) { return false; }
    var p = run.player;
    if (!p.onGround || p.climb) { return false; }
    if (p.y + P_H >= run.stage.floor - 1) { return false; }
    p.dropThru = DROP_THRU;
    p.onGround = false;
    p.y += 3;
    p.vy = 30;
    return true;
  }

  /** 문으로 다음 사냥터에 걸어 넘어간다 — 몸(체력·기력)과 벌이(금·마릿수)는 그대로 이어진다 */
  function travel(key) {
    if (!run) { return false; }
    var from = run.stage, stg = SD.stage(key);
    if (stg.key === from.key) { return false; }
    if (!unlocked(stg.key)) {
      core.emit('toast', '⚠️ ' + stg.name + ' 은(는) Lv.' + stg.need + ' 부터입니다');
      return false;
    }
    /* 오른쪽 문으로 나갔으면 다음 맵의 왼쪽에서 나온다 (그 반대도) */
    var goingRight = run.player.x > from.width / 2;
    run.stage = stg;
    run.enemies = []; run.drops = []; run.shots = []; run.eshots = []; run.boss = null;
    run.player.x = goingRight ? 130 : stg.width - 160;
    run.player.y = stg.floor - P_H;
    run.player.vx = 0; run.player.vy = 0; run.player.climb = null;
    run.player.onGround = true;
    run.player.facing = goingRight ? 1 : -1;
    st().stage = stg.key;
    for (var i = 0; i < stg.spawn; i++) { spawnEnemy(); }
    var b = spawnBoss();
    core.log('🚪 ' + from.name + ' → ' + stg.name + (b ? ' — ' + b.ref.name + ' 이(가) 지킨다' : ''), 'info');
    core.emit('toast', '🚪 ' + stg.name);
    core.emit('side:travel', run);
    core.emit('changed');
    return true;
  }

  /* ── 보스 ─────────────────────────────────────────────────
   * 사냥터마다 하나. **오른쪽 끝을 지킨다** — 원작에서 보스 맵 안쪽으로
   * 걸어 들어가는 그 감각이다. 잡으면 한동안 다시 나오지 않는다(리젠).
   */

  /** 이 사냥터의 보스가 지금 나와 있나 */
  function bossReady(key) {
    var stg = SD.stage(key);
    if (!stg.boss) { return false; }
    var at = st().bossAt[key] || 0;
    return Date.now() - at >= stg.boss.cool * 60000 * BOSS_COOL;
  }

  /** 다시 나오기까지 남은 밀리초 (0 이면 지금 나와 있다) */
  function bossLeft(key) {
    var stg = SD.stage(key);
    if (!stg.boss) { return 0; }
    var at = st().bossAt[key] || 0;
    return Math.max(0, stg.boss.cool * 60000 * BOSS_COOL - (Date.now() - at));
  }

  function spawnBoss() {
    if (!run) { return null; }
    var stg = run.stage;
    if (!stg.boss || !bossReady(stg.key)) { return null; }
    var ed = global.DG.enemyData;
    var ref = ed ? ed.bossByName(stg.boss.name) : { name: stg.boss.name, kind: 'human', color: '#7a3a3a' };
    var lv = stg.enemyLv;
    var baseHp = Math.round(18 * Math.pow(1.22, lv - 1));
    var hp = Math.max(1, Math.round(baseHp * stg.boss.hpMul * E_HP));
    var e = {
      ref: ref, boss: true,
      x: stg.width - 220, y: stg.floor - 52, w: 52, h: 52,
      hp: hp, hpMax: hp,
      dmg: Math.round((4 + lv * 1.6) * stg.boss.dmgMul * E_DMG),
      dir: -1, homeY: stg.floor,
      spd: 38 + Math.min(40, lv * 2),
      phase: 0, hurt: 0, cd: 0,
      chargeCd: 4 + Math.random() * 3, charge: 0
    };
    run.enemies.push(e);
    run.boss = e;
    sfx('boss');
    return e;
  }

  /* ── 적 ───────────────────────────────────────────────── */

  /** 적 정의 — 던전 게임과 같은 data-enemy.js 를 쓴다 (poolFor 는 관문 번호를 받는다) */
  function enemyRef(lv) {
    var ed = global.DG.enemyData;
    if (!ed) { return { name: '산적', kind: 'beast', color: '#8a5a44', form: 'quad' }; }
    var pool = ed.poolFor(lv, false);
    return core.pick(pool);
  }

  function spawnEnemy(atX) {
    if (!run) { return; }
    var stg = run.stage;
    var lv = stg.enemyLv;
    var ref = enemyRef(lv);
    var x = atX !== undefined ? atX : 200 + Math.random() * (stg.width - 300);
    /* 발판 위에 세우거나 바닥에 세운다 */
    var y = stg.floor;
    if (Math.random() < 0.45 && stg.plats.length) {
      var pl = core.pick(stg.plats);
      x = pl[0] + Math.random() * pl[2];
      y = pl[1];
    }
    var hp = Math.max(1, Math.round(18 * Math.pow(1.22, lv - 1) * E_HP));
    var rw = SD.rangedOf(ref);              // 활·조총을 들었으면 멀리서 쏜다
    run.enemies.push({
      ref: ref, x: x, y: y - 22, w: 34, h: 34,
      hp: hp, hpMax: hp, dmg: Math.round((4 + lv * 1.6) * E_DMG),
      dir: Math.random() < 0.5 ? -1 : 1, homeY: y,
      spd: 42 + Math.min(50, lv * 2), phase: Math.random() * 6.28, hurt: 0, cd: 0,
      ranged: rw, shotCd: rw ? rw.cd * (0.4 + Math.random() * 0.8) : 0
    });
  }

  /* ── 입력 ─────────────────────────────────────────────── */

  function setInput(k, v) {
    if (k in input) { input[k] = !!v; }
    if (k === 'jump' && v) { jump(); }
    if (k === 'up' && v) { useUp(); }
    if (k === 'down' && v) { useDown(); }
  }

  /** 점프 — 줄에 매달렸으면 손을 떼고 튀고, ↓ 를 누른 채면 발판을 빠져나간다 */
  function jump() {
    if (!run) { return false; }
    var p = run.player;
    if (p.climb) {
      letGo(input.left ? -SPEED * 0.8 : (input.right ? SPEED * 0.8 : 0));
      return true;
    }
    if (!p.onGround) { return false; }
    if (input.down && dropThrough()) { return true; }
    p.vy = -JUMP;
    p.onGround = false;
    sfx('jump');
    return true;
  }

  /* ── 판정 ─────────────────────────────────────────────── */

  /** 지금 걸려 있는 북돋움 (없으면 null) */
  function buffOn() {
    if (!run) { return null; }
    var b = run.player.buff;
    return (b && b.until > Date.now()) ? b : null;
  }

  function braceOn() { return !!buffOn(); }

  function atkOf() {
    var b = buffOn();
    return power().atk * (b ? b.atk : 1);
  }

  function hitBox() {
    var p = run.player;
    var w = REACH, h = 56;
    return {
      x: p.facing > 0 ? p.x + P_W : p.x - w,
      y: p.y - 4, w: w, h: h
    };
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /**
   * 한 대 친다.
   * **급소(急所)** — 원작의 크리티컬이다. 같은 무예를 같은 적에게 써도 수치가 갈려야
   * 손이 계속 간다. 확률과 배수는 손잡이로 열려 있다(어드민 '균형 손잡이').
   * **넉백** — 맞은 적이 뒤로 밀린다. 위치만 바뀌고 피해는 그대로다 —
   * 판정을 흔들지 않으면서 "때렸다" 는 감각을 주는 가장 싼 값이다.
   * 다만 **보스는 밀리지 않는다**(밀리면 달려드는 패턴이 뜻을 잃는다).
   */
  function strike(e, mul) {
    var crit = Math.random() < critRate();
    var dmg = atkOf() * (mul || 1) * (0.88 + Math.random() * 0.24) * (crit ? critMul() : 1);
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;
    e.hurt = crit ? 0.3 : 0.22;
    if (!e.boss) {
      var away = (e.x + e.w / 2) - (run.player.x + P_W / 2) >= 0 ? 1 : -1;
      e.kx = (e.kx || 0) + away * knockPow() * (crit ? 1.5 : 1) * (mul >= 2 ? 1.4 : 1);
    }
    fx.push({ t: 'hit', x: e.x + e.w / 2, y: e.y, v: dmg, life: 0.6, crit: crit });
    /* 화면 층이 읽는다 — 큰 것은 화면이 흔들리고, 손이 한 박자 멎는다 */
    if (crit || dmg >= 100) { fx.push({ t: 'shake', x: e.x, y: e.y, life: 0.22, big: crit }); }
    sfx(crit ? 'crit' : 'hit');
    if (e.hp <= 0) { kill(e); }
  }

  function kill(e) {
    if (!run) { return; }
    run.kills += 1;
    st().kills = (st().kills || 0) + 1;
    var lv = run.stage.enemyLv;
    var mul = e.boss ? 12 : 1;
    var gold = Math.round((6 + lv * 3) * (0.8 + Math.random() * 0.6) * mul * GAIN_GOLD);
    run.gold += gold;
    run.drops.push({ kind: 'gold', x: e.x + e.w / 2, y: e.y, vy: -180, n: gold });
    if (e.boss) {
      /* 보스는 탕약을 확정으로 떨군다 — 다음 판을 이어 갈 밑천이다 */
      run.drops.push({ kind: 'potion', x: e.x + e.w / 2 + 14, y: e.y, vy: -220, n: 3 });
    } else if (Math.random() < DROP_POTION) {
      run.drops.push({ kind: 'potion', x: e.x + e.w / 2 + 10, y: e.y, vy: -200, n: 1 });
    }
    /* 장비·주문서 — 무엇이 나올지는 gear.js 가 정한다 (여기는 떨구기만 한다) */
    var G = global.DG.gear;
    if (G) {
      var got = G.rollDrop(lv, !!e.boss);
      if (got) {
        run.drops.push({ kind: got.kind, key: got.key,
                         x: e.x + e.w / 2 - 12, y: e.y, vy: -240, n: 1 });
      }
    }
    core.gainExp((6 + lv * 4) * (e.boss ? 15 : 1) * GAIN_EXP);
    /* 사명(quest.js)이 이 소식을 듣는다 — 규칙이 서로를 부르지 않게 알림으로만 잇는다 */
    core.emit('side:kill', { ref: e.ref, boss: !!e.boss, lv: lv, stage: run.stage.key });
    if (global.DG.hero.awardParty) { global.DG.hero.awardParty((2 + lv) * (e.boss ? 8 : 1)); }
    fx.push({ t: 'pop', x: e.x + e.w / 2, y: e.y, life: e.boss ? 0.9 : 0.5 });
    /* 뒤로 넘어가며 사라진다 — 원작에서 몹이 죽던 그 모습이다(화면 층이 그린다) */
    fx.push({ t: 'fall', x: e.x + e.w / 2, y: e.y, w: e.w, h: e.h,
              dir: (e.x + e.w / 2) - (run.player.x + P_W / 2) >= 0 ? 1 : -1,
              ref: e.ref, boss: !!e.boss, life: e.boss ? 1.1 : 0.55 });
    if (e.boss) { fx.push({ t: 'shake', x: e.x, y: e.y, life: 0.6, big: true }); }
    sfx(e.boss ? 'bosskill' : 'kill');

    var idx = run.enemies.indexOf(e);
    if (idx >= 0) { run.enemies.splice(idx, 1); }

    if (e.boss) {
      var s = st();
      s.bosses = (s.bosses || 0) + 1;
      s.bossAt[run.stage.key] = Date.now();       // 여기서부터 다시 나오기까지를 센다
      run.boss = null;
      core.gainFeat(20 + lv * 3, '토벌');
      core.log('👺 ' + e.ref.name + ' 을(를) 잡았다! · 🪙 ' + core.fmt(gold) +
        ' · 🧪 +3 (' + run.stage.boss.cool + '분 뒤 다시 나온다)', 'good');
      core.emit('toast', '👺 ' + e.ref.name + ' 토벌!');
      core.emit('changed');
      return;                                     // 보스 자리는 다시 채우지 않는다
    }
    /* 잡은 자리 대신 다른 곳에서 하나가 더 나온다 (사냥터가 비지 않게) */
    spawnEnemy();
  }

  /** 맞을 때 — 낀 방어가 덜 맞게 해 준다 (아무리 높아도 6할까지) */
  function hurtMe(amount) {
    if (!run) { return; }
    var p = run.player;
    if (p.invuln > 0) { return; }
    var G = global.DG.gear;
    var cut = G ? G.cut(power().def) : 0;
    var b = buffOn();
    if (b && b.guard) { cut = Math.min(0.85, cut + b.guard); }   // 철갑 같은 것
    run.hp -= Math.max(1, Math.round(amount * (1 - cut)));
    sfx('hurt');
    fx.push({ t: 'ouch', x: p.x, y: p.y, life: 0.45 });
    fx.push({ t: 'shake', x: p.x, y: p.y, life: 0.18, big: false });
    p.hurt = 0.3;
    p.invuln = HIT_COOL;
    if (run.hp <= 0) { die(); }
  }

  function die() {
    var stg = run.stage;
    st().deaths = (st().deaths || 0) + 1;
    core.log('💀 ' + stg.name + ' 에서 쓰러졌다 — 주운 금은 절반만 남는다', 'bad');
    core.save.player.gold += Math.round(run.gold * 0.5);
    var name = stg.name;
    run = null;
    core.emit('side:end', { dead: true, stage: name });
    core.emit('toast', '💀 쓰러졌습니다');
    core.emit('changed');
    core.persist();
  }

  function drink() {
    var s = st();
    if (!run || s.potions <= 0) { return false; }
    if (run.hp >= run.hpMax) { return false; }
    s.potions -= 1;
    run.hp = Math.min(run.hpMax, run.hp + Math.round(run.hpMax * 0.45));
    fx.push({ t: 'heal', x: run.player.x, y: run.player.y, life: 0.5 });
    sfx('potion');
    core.emit('changed');
    return true;
  }

  /* ── 스킬 ─────────────────────────────────────────────── */

  /** 조작 띠에 놓인 무예들 (job.js 가 없으면 옛 네 가지로 돌아간다) */
  function barSkills() {
    var J = global.DG.job;
    return J ? J.bar() : SD.SKILLS;
  }

  /** 그 무예의 지금 힘 — 찍은 레벨이 실려 있다 */
  function mulOf(sk) {
    var J = global.DG.job;
    if (J && J.mulOf) { return J.mulOf(sk); }
    return sk.mul ? sk.mul[0] : 1;
  }

  /**
   * 무예를 쓴다. `effect` 하나하나가 이 판이 아는 손잡이다 —
   * 데이터(`data-job.js`)는 무엇을 할지만 적고, **어떻게 하는지는 여기에만** 있다.
   */
  function castSkill(i) {
    if (!run) { return false; }
    var list = barSkills();
    var sk = list[i], p = run.player;
    if (!sk) { return false; }
    if (p.cds[i] > 0 || run.mp < sk.cost) { return false; }
    run.mp -= sk.cost;
    p.cds[i] = sk.cd;
    var S0 = global.DG.sfx;
    sfx(sk.cost === 0 ? 'swing' : (S0 ? S0.skillCue(sk.effect) : 'skill'));

    var j, e, dx, dy, mul = mulOf(sk);
    var eff = sk.effect;

    if (eff === 'melee') {
      var hits = sk.hits || 1;
      var box = hitBox();
      fx.push({ t: 'slash', x: box.x, y: box.y, w: box.w, h: box.h, dir: p.facing, life: 0.16 });
      for (j = 0; j < run.enemies.length; j++) {
        if (overlap(box, run.enemies[j])) {
          for (var h = 0; h < hits; h++) { strike(run.enemies[j], mul); }
        }
      }
    } else if (eff === 'aoe') {
      var r = sk.r || REACH * 1.5;
      fx.push({ t: 'ring', x: p.x + P_W / 2, y: p.y + P_H / 2, r: r, life: 0.28 });
      for (j = 0; j < run.enemies.length; j++) {
        e = run.enemies[j];
        dx = (e.x + e.w / 2) - (p.x + P_W / 2);
        dy = (e.y + e.h / 2) - (p.y + P_H / 2);
        if (Math.sqrt(dx * dx + dy * dy) < r) { strike(e, mul); }
      }
    } else if (eff === 'bolt' || eff === 'arrow') {
      run.shots.push({ x: p.x + P_W / 2, y: p.y + P_H * 0.4, dir: p.facing,
                       spd: eff === 'arrow' ? 640 : 520, life: 1.2,
                       mul: mul, pierce: eff === 'bolt', kind: sk.key, hit: {} });
    } else if (eff === 'volley') {
      /* 여러 발 — 높이를 조금씩 달리해 한 줄로 겹치지 않게 한다 */
      var n = sk.shots || 2;
      for (j = 0; j < n; j++) {
        run.shots.push({ x: p.x + P_W / 2, y: p.y + P_H * (0.3 + 0.16 * j), dir: p.facing,
                         spd: 600 + j * 34, life: 1.1,
                         mul: mul, pierce: false, kind: sk.key, hit: {} });
      }
    } else if (eff === 'dash') {
      /* 밀고 나간다 — 지나간 자리의 적을 벤다. 은신보는 잠깐 맞지 않는다 */
      var from = p.x, dist = (sk.dist || 200) * p.facing;
      p.x = core.clamp(p.x + dist, 0, run.stage.width - P_W);
      p.climb = null;
      if (sk.invuln) { p.invuln = Math.max(p.invuln, sk.invuln); }
      var lo = Math.min(from, p.x) - 10, hi = Math.max(from, p.x) + P_W + 10;
      fx.push({ t: 'dash', x: lo, y: p.y, w: hi - lo, h: P_H, life: 0.22 });
      for (j = 0; j < run.enemies.length; j++) {
        e = run.enemies[j];
        if (e.x + e.w > lo && e.x < hi && Math.abs((e.y + e.h) - (p.y + P_H)) < 60) {
          strike(e, mul);
        }
      }
    } else if (eff === 'rain') {
      /* 앞쪽 넓은 자리에 쏟는다 — 서 있는 높이와 상관없이 위아래로 넓다 */
      var rx = p.facing > 0 ? p.x : p.x - 340;
      var band = { x: rx, y: p.y - 220, w: 340 + P_W, h: 300 };
      fx.push({ t: 'rain', x: band.x, y: band.y, w: band.w, h: band.h, life: 0.5 });
      for (j = 0; j < run.enemies.length; j++) {
        if (overlap(band, run.enemies[j])) { strike(run.enemies[j], mul); }
      }
    } else if (eff === 'heal') {
      var pct = sk.heal ? (sk.heal[0] + sk.heal[1] * Math.max(0, lvOf(sk) - 1)) : 0.2;
      run.hp = Math.min(run.hpMax, run.hp + Math.round(run.hpMax * pct));
      fx.push({ t: 'heal', x: p.x, y: p.y, life: 0.5 });
    } else if (eff === 'buff') {
      var b = sk.buff || { sec: BRACE_SEC, atk: 1.35 };
      p.buff = {
        until: Date.now() + (b.sec || BRACE_SEC) * 1000,
        atk: b.atk || 1, speed: b.speed || 1, guard: b.guard || 0, regen: b.regen || 1,
        name: sk.name
      };
      p.braceUntil = p.buff.until;               // 옛 이름 — 화면·진단이 아직 본다
      fx.push({ t: 'ring', x: p.x + P_W / 2, y: p.y + P_H / 2, r: 60, life: 0.4 });
    }
    core.emit('side:skill', sk.key);
    return true;
  }

  function lvOf(sk) {
    var J = global.DG.job;
    return J ? J.levelOf(sk.key) : 1;
  }

  /* ── 매 프레임 ────────────────────────────────────────── */

  function update(dt) {
    if (!run) { return; }
    dt = Math.min(dt, 0.05);
    var p = run.player, stg = run.stage, i;

    for (i = 0; i < p.cds.length; i++) { if (p.cds[i] > 0) { p.cds[i] -= dt; } }
    var bf = buffOn();
    run.mp = Math.min(run.mpMax, run.mp + MP_REGEN * (bf ? bf.regen : 1) * dt);
    if (p.invuln > 0) { p.invuln -= dt; }
    if (p.hurt > 0) { p.hurt -= dt; }

    if (p.dropThru > 0) { p.dropThru -= dt; }

    var mul = bf ? bf.speed : 1;

    if (p.climb) {
      /* 줄에 매달린 동안은 **중력도 좌우 이동도 없다** — ↑↓ 로만 오르내린다.
         원작의 밧줄·사다리가 그렇다. 뛰면(점프) 손을 떼고 그 방향으로 튄다. */
      p.vy = 0;
      var mv = input.up ? -CLIMB * dt : (input.down ? CLIMB * dt : 0);
      p.y += mv;
      if (mv) { p.phase += dt * 7; sfx('climb'); }
      p.x = p.climb.x - P_W / 2;
      var foot = p.y + P_H;
      /* **움직인 방향으로만** 끝을 판정한다 — 아래 끝(바닥)에서 막 잡은 줄이
         그 프레임에 곧바로 풀려 버리던 결함이 여기 있었다 */
      if (mv < 0 && foot <= p.climb.top) {    // 꼭대기를 넘어섰다 — 발판 위에 올라선다
        p.y = p.climb.top - P_H; p.climb = null; p.onGround = true;
      } else if (mv > 0 && foot >= p.climb.bottom) {   // 끝까지 내려왔다
        p.y = p.climb.bottom - P_H; p.climb = null; p.onGround = true;
      }
    } else {
      /* 좌우 */
      p.vx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (p.vx) { p.facing = p.vx > 0 ? 1 : -1; }
      p.x = core.clamp(p.x + p.vx * SPEED * mul * dt, 0, stg.width - P_W);
      if (p.vx) { p.phase += dt * 9; }

      /* 중력 · 발판 */
      var prevBottom = p.y + P_H;
      p.vyPrev = p.vy;                        // 착지 먼지가 읽는다 (닿는 순간엔 0 이 된다)
      p.vy += GRAV * dt;
      p.y += p.vy * dt;
      var bottom = p.y + P_H;
      var wasFalling = p.vy > 0;
      p.onGround = false;

      if (bottom >= stg.floor) {
        p.y = stg.floor - P_H; p.vy = 0; p.onGround = true;
      } else if (p.vy > 0 && p.dropThru <= 0) {
        /* 위에서 내려올 때만 발판에 선다 (↓+점프로 빠져나가는 동안은 통과) */
        for (i = 0; i < stg.plats.length; i++) {
          var pl = stg.plats[i];
          if (p.x + P_W > pl[0] && p.x < pl[0] + pl[2] &&
              prevBottom <= pl[1] + 2 && bottom >= pl[1]) {
            p.y = pl[1] - P_H; p.vy = 0; p.onGround = true;
            break;
          }
        }
      }
      if (p.onGround && wasFalling) {
        sfx('land');
        /* 세게 떨어졌을 때만 먼지가 인다 — 계단을 걸어 내려갈 때마다 일면 어지럽다 */
        if (p.vyPrev > 620) { fx.push({ t: 'dust', x: p.x + P_W / 2, y: p.y + P_H, life: 0.32 }); }
      }

      /* 떨어지다가 줄에 닿았을 때 ↑ 를 누르고 있으면 그대로 매달린다 */
      if (!p.onGround && input.up) {
        var rr = ropeAt(p.x + P_W / 2, p.y + P_H);
        if (rr) { grab(rr); }
      }
    }

    /* 앉아 쉰다 — 원작에서 의자에 앉아 체력·기력을 채우던 그 자리다.
       ↓ 를 누른 채 가만히 있으면 앉고, 곁에 적이 오거나 움직이면 곧 일어선다.
       (줄에 매달렸을 때는 ↓ 가 내려가기이므로 앉지 않는다) */
    var foeNear = false;
    for (i = 0; i < run.enemies.length; i++) {
      var fe = run.enemies[i];
      if (Math.abs((fe.x + fe.w / 2) - (p.x + P_W / 2)) < 190 &&
          Math.abs((fe.y + fe.h) - (p.y + P_H)) < 80) { foeNear = true; break; }
    }
    var canRest = input.down && p.onGround && !p.climb && !input.left && !input.right && !foeNear;
    if (canRest) {
      var wasUp = p.resting <= 0.4;
      p.resting += dt;
      if (p.resting > 0.4) {                    // 앉는 데 한 박자
        if (wasUp) { sfx('sit'); }
        run.hp = Math.min(run.hpMax, run.hp + run.hpMax * 0.020 * dt);
        run.mp = Math.min(run.mpMax, run.mp + run.mpMax * 0.055 * dt);
      }
    } else {
      p.resting = 0;
    }

    /* 내가 날린 것 — 꿰뚫는 것(pierce)은 계속 가고, 화살은 첫 하나에 걸린다 */
    for (i = run.shots.length - 1; i >= 0; i--) {
      var sh = run.shots[i];
      sh.x += sh.dir * sh.spd * dt;
      sh.life -= dt;
      var spent = false;
      for (var si = 0; si < run.enemies.length; si++) {
        var se = run.enemies[si];
        if (sh.hit[si]) { continue; }
        if (overlap({ x: sh.x - 10, y: sh.y - 10, w: 20, h: 20 }, se)) {
          sh.hit[si] = true;
          strike(se, sh.mul === undefined ? 2.1 : sh.mul);
          if (sh.pierce === false) { spent = true; break; }
        }
      }
      if (spent || sh.life <= 0 || sh.x < -20 || sh.x > stg.width + 20) { run.shots.splice(i, 1); }
    }

    /* 날아오는 것 — 화살·탄환. 맞으면 접촉과 같은 무적 시간이 걸린다 */
    for (i = run.eshots.length - 1; i >= 0; i--) {
      var es = run.eshots[i];
      es.x += es.dir * es.spd * dt;
      es.life -= dt;
      var gone = es.life <= 0 || es.x < -20 || es.x > stg.width + 20;
      if (!gone && overlap({ x: es.x - 7, y: es.y - 5, w: 14, h: 10 },
                           { x: p.x, y: p.y, w: P_W, h: P_H })) {
        gone = true;
        if (p.invuln <= 0) {
          hurtMe(es.dmg);
          if (!run) { return; }
        }
      }
      if (gone) { run.eshots.splice(i, 1); }
    }

    /* 적 — 순찰하다가 가까이 오면 쫓아온다 */
    for (i = 0; i < run.enemies.length; i++) {
      var e = run.enemies[i];
      if (e.hurt > 0) { e.hurt -= dt; }
      e.phase += dt * 6;
      var dx = (p.x + P_W / 2) - (e.x + e.w / 2);
      var near = Math.abs(dx) < (e.boss ? 420 : 260) && Math.abs((p.y + P_H) - (e.y + e.h)) < 70;
      if (near) { e.dir = dx > 0 ? 1 : -1; }
      /* 보스의 한 가지 패턴 — 뜸을 들이다 달려든다. 서서 때리기만 하면 안 되게 */
      var chargeMul = 1;
      if (e.boss) {
        if (e.charge > 0) {
          e.charge -= dt;
          chargeMul = 2.6;
        } else {
          e.chargeCd -= dt;
          if (e.chargeCd <= 0 && near) {
            e.charge = 1.1;
            e.chargeCd = 5 + Math.random() * 3;
            sfx('charge');
            fx.push({ t: 'ring', x: e.x + e.w / 2, y: e.y + e.h / 2, r: 46, life: 0.3 });
            /* 소리만으로는 못 듣는 사람이 있다 — 화면에도 한 박자 띄운다 */
            fx.push({ t: 'warn', x: e.x + e.w / 2, y: e.y, life: 0.9 });
          }
        }
      }
      /* 쏘는 적 — **사거리에 들면 멈춰서 쏜다.** 붙어서 때리는 적과 달리
         거리를 두고 버티므로, 이쪽이 다가가거나 기탄으로 받아쳐야 한다. */
      var holding = false;
      if (e.ranged && !e.boss) {
        e.shotCd -= dt;
        var flat = Math.abs((p.y + P_H) - (e.y + e.h)) < 64;
        var far = Math.abs(dx);
        if (flat && far < e.ranged.range) {
          e.dir = dx > 0 ? 1 : -1;
          if (far > REACH * 1.2) { holding = true; }     // 사거리 안이면 다가오지 않는다
          if (e.shotCd <= 0) {
            e.shotCd = e.ranged.cd * (0.8 + Math.random() * 0.4);
            run.eshots.push({
              x: e.x + e.w / 2 + e.dir * 16, y: e.y + e.h * 0.42,
              dir: e.dir, spd: e.ranged.spd, dmg: Math.round(e.dmg * e.ranged.mul),
              kind: e.ref.look.weapon, life: 2.4
            });
            fx.push({ t: 'aim', x: e.x + e.w / 2, y: e.y, life: 0.22 });
            sfx('aim');
          }
        }
      }
      e.x += (holding ? 0 : e.dir * e.spd * (near ? 1.25 : 0.7) * chargeMul) * dt;
      /* 밀린 만큼 미끄러지고 곧 잦아든다 — 맞는 동안은 못 붙는다는 뜻이기도 하다 */
      if (e.kx) {
        e.x += e.kx * dt;
        e.kx *= Math.max(0, 1 - dt * 9);
        if (Math.abs(e.kx) < 4) { e.kx = 0; }
      }
      if (e.x < 20) { e.x = 20; e.dir = 1; e.kx = 0; }
      if (e.x > stg.width - 40) { e.x = stg.width - 40; e.dir = -1; e.kx = 0; }
      e.cd -= dt;
      if (overlap({ x: p.x, y: p.y, w: P_W, h: P_H }, e) && e.cd <= 0) {
        e.cd = 1.0;
        hurtMe(e.dmg);
        if (!run) { return; }
      }
    }

    /* 떨어진 것 — 잠깐 튀었다가 내려앉고, 밟으면 줍는다 */
    for (i = run.drops.length - 1; i >= 0; i--) {
      var d = run.drops[i];
      d.vy += GRAV * 0.6 * dt;
      d.y += d.vy * dt;
      if (d.y > stg.floor - 12) { d.y = stg.floor - 12; d.vy = 0; }
      if (Math.abs((d.x) - (p.x + P_W / 2)) < 40 && Math.abs(d.y - (p.y + P_H)) < 60) {
        if (d.kind === 'potion') {
          st().potions += d.n;
          sfx('potion');
          core.emit('toast', '🧪 탕약 +' + d.n);
        } else if (d.kind === 'gear' || d.kind === 'scroll') {
          var GG = global.DG.gear;
          if (GG) {
            if (d.kind === 'gear') {
              var made = GG.make(d.key);
              /* 가방이 가득 차면 **줍지 못하고 그대로 남는다** — 원작의 그 답답함이다 */
              if (!GG.put(made)) { sfx('bagfull'); continue; }
              sfx('gear');
              core.emit('toast', '📦 ' + GG.nameOf(made));
            } else {
              GG.addScroll(d.key, 1);
              sfx('scroll');
              core.emit('toast', '📜 ' + global.DG.gearData.scroll(d.key).name);
            }
          }
        }
        if (d.kind === 'gold') { sfx('gold'); }
        run.drops.splice(i, 1);
      }
    }

    /* 연출 수명 */
    for (i = fx.length - 1; i >= 0; i--) {
      fx[i].life -= dt;
      if (fx[i].life <= 0) { fx.splice(i, 1); }
    }
  }

  /* 화면이 읽는 요약.
     **사냥 중이든 쉬는 중이든 같은 칸을 준다** — 한쪽에만 있는 칸(stages 같은)을
     두면 시트를 사냥 중에 열었을 때 undefined 로 죽는다(실제로 그랬다). */
  function status() {
    var s = st();
    var base = {
      potions: s.potions, kills: s.kills || 0, deaths: s.deaths || 0,
      bosses: s.bosses || 0,
      stages: stages(), skills: [],
      /* 사냥 중이 아니어도 같은 칸을 준다 — 한쪽에만 있는 칸을 두면 시트가 죽는다 */
      boss: null, climbing: false, rope: false, gate: null, def: 0, resting: false
    };
    if (!run) {
      base.active = false;
      base.stage = SD.stage(s.stage);
      /* 쉬는 중은 실제로 다음 판을 pw.hp/pw.mp(가득 참)로 시작한다(enter() 참조) —
         그러니 여기서도 0/0 이 아니라 가득 찬 값을 준다. 캐릭 정보 카드가 이 값을
         상시 띠로 보여 준다(예전에는 사냥 중에만 뜨는 #hud 안에만 있어 쉬는 동안
         에너지(기력)를 볼 수가 없었다) */
      var pw = power();
      base.hp = pw.hp; base.hpMax = pw.hp; base.mp = pw.mp; base.mpMax = pw.mp;
      base.gold = 0; base.enemies = 0; base.brace = false;
      base.atk = pw.atk; base.def = pw.def;
      return base;
    }
    var skills = [], i, list = barSkills();
    for (i = 0; i < list.length; i++) {
      var sk = list[i];
      skills.push({
        key: sk.key, name: sk.name, emoji: sk.emoji, desc: sk.desc, cost: sk.cost,
        lv: lvOf(sk), max: sk.max || 0,
        cd: Math.max(0, run.player.cds[i] || 0), cdMax: sk.cd,
        ready: (run.player.cds[i] || 0) <= 0 && run.mp >= sk.cost
      });
    }
    base.active = true;
    base.stage = run.stage;
    base.hp = Math.max(0, Math.round(run.hp));
    base.hpMax = run.hpMax;
    base.mp = Math.round(run.mp);
    base.mpMax = run.mpMax;
    base.gold = Math.round(run.gold);
    base.kills = run.kills;                 // 이 판에서 잡은 수 (누적은 state().kills)
    base.skills = skills;
    base.brace = braceOn();
    base.enemies = run.enemies.length;
    base.atk = Math.round(atkOf());
    base.def = power().def;
    /* 줄·문 — 조작 띠가 '↑' 를 언제 띄울지 이 셋으로 정한다 */
    base.climbing = !!run.player.climb;
    base.resting = run.player.resting > 0.4;
    base.rope = !!ropeAt(run.player.x + P_W / 2, run.player.y + P_H);
    var g = portalAt(run.player.x + P_W / 2);
    base.gate = g ? { to: g.to, name: g.ref.name, open: unlocked(g.to), need: g.ref.need } : null;
    if (run.boss) {
      base.boss = {
        name: run.boss.ref.name,
        hp: Math.max(0, Math.round(run.boss.hp)), hpMax: run.boss.hpMax,
        charging: run.boss.charge > 0
      };
    }
    return base;
  }

  global.DG = global.DG || {};
  global.DG.side = {
    GRAV: GRAV, SPEED: SPEED, P_W: P_W, P_H: P_H, REACH: REACH, CLIMB: CLIMB,
    enter: enter, leave: leave, resume: resume, active: active, update: update,
    setInput: setInput, jump: jump, castSkill: castSkill, drink: drink,
    travel: travel, useUp: useUp, useDown: useDown, dropThrough: dropThrough,
    grabRope: grabRope,
    ropeAt: ropeAt, portalAt: portalAt, letGo: letGo,
    power: power, unlocked: unlocked, stages: stages, barSkills: barSkills,
    bossReady: bossReady, bossLeft: bossLeft,
    status: status, state: st, meRef: meRef,
    /** 화면 전용 — 상태를 직접 읽는다 (쓰지는 말 것) */
    raw: function () { return run; },
    fx: function () { return fx; }
  };
})(window);
