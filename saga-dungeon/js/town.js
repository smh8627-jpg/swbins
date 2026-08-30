/**
 * 마을(村) — 판이 시작하고, 돌아오는 자리
 * ---------------------------------------------------------------
 * 예전 첫 화면은 카드 한 장이었다. 층을 버튼으로 고르고 난도를 버튼으로 골랐다.
 * 그런데 원작(디아블로)에서 바깥은 **메뉴가 아니라 장소**다 — 야영지를 걸어
 * 다니며 대장장이에게 가고, 역참 돌을 밟고, 굴혈로 걸어 들어간다.
 * 고르는 것이 아니라 **가는 것**이다. 그 차이가 이 게임의 결을 정한다.
 *
 * 그래서 마을을 던전과 **같은 공간**으로 만들었다. 그림·조작·조명·조작판은
 * 전부 dungeon-view.js 것을 그대로 쓴다 — 이 파일이 하는 일은 dungeon.js 와
 * **같은 모양의 상태**를 내놓는 것뿐이다(raw · status · fx · setInput ·
 * moveTo · update). 화면은 자기가 마을을 그리는지 던전을 그리는지 몰라도 된다.
 *
 * 여기에 판정은 없다. 적도 피해도 없다 — 마을에서 하는 일은 걷는 것과 닿는 것뿐이다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  /* 던전 방과 **같은 크기**다(560×360 에 스물). 처음에는 720×460 으로 넓게
     잡았는데, 폰에서 그만큼 작게 그려졌다 — 아이소메트릭 마름모의 가로세로 비는
     1.83:1 로 고정이라(IX/IY), 폰 세로 화면에서는 늘 **가로가 병목**이다.
     방이 넓어지면 그 병목에 맞춰 축소되어 사람이 개미만 해진다.
     그래서 던전과 같은 스케일로 줄이고, 대신 사람을 3×3 으로 촘촘히 앉혔다.
     (390px 실측: 이 크기에서 마름모 가로가 화면의 1.2배 — 거의 한눈에 들어온다) */
  var ROOM_W = 560, ROOM_H = 380, WALL = 30, P_R = 13;
  var SPD = 158;                        // 마을 걸음 (던전보다 조금 빠르다 — 볼일만 보는 곳이라)
  var TALK_R = 40;                      // 이만큼 다가서면 말이 걸린다
  var LEAVE_R = 58;                     // 이만큼 떨어져야 다시 걸린다 (문턱 — 아래 armed 설명)

  /* 마을 테마 — 던전과 달리 **불을 피워 둔 자리**라 바닥이 따뜻하다.
     data-dungeon.js 의 THEMES 에 넣지 않았다. 거기 것은 층(floor)으로 고르는데
     마을은 층이 아니다 — 0층을 만들면 그 배열의 뜻이 흐려진다. */
  var THEME = {
    name: '모루골', floor: '#3b322a', wall: '#5c4e3d',
    tint: 'rgba(210,170,100,0.10)', town: true
  };

  /**
   * 마을 사람 여섯 — 원작 야영지의 그 사람들 자리에 이 판의 직군을 놓았다.
   *   sheet   닿으면 열리는 시트 (ui.js 의 그것과 같은 이름)
   *   trait   생김새를 정한다 (sprite.js 의 ruleLook 이 읽는다)
   *   color   옷 빛깔 — 진영색을 쓰지 않는다. 마을 사람은 어느 진영도 아니다
   */
  var NPCS = [
    { key: 'captain', name: '군교(軍校)', emoji: '⚔️', sheet: 'party',
      x: 110, y: 90,  color: '#8a6f4e', trait: 'might',  rarity: 3,
      line: '부대를 세우십시오. 앞에 설 자를 고르는 일이 먼저입니다.' },
    { key: 'quarter', name: '치중(輜重)', emoji: '🎒', sheet: 'gear',
      x: 280, y: 70,  color: '#6b7383', trait: 'virtue', rarity: 2,
      line: '주워 오신 것을 봐 드리지요. 걸치실 것과 파실 것을 가릅니다.' },
    { key: 'master',  name: '교두(敎頭)', emoji: '📜', sheet: 'skill',
      x: 450, y: 95,  color: '#5c6b8a', trait: 'wisdom', rarity: 4,
      line: '손에 든 것이 무예를 정합니다. 각궁을 들면 궁장의 길입니다.' },
    { key: 'smith',   name: '야장(冶匠)', emoji: '🔨', sheet: 'craft',
      x: 450, y: 200, color: '#7a4a32', trait: 'might',  rarity: 3,
      line: '구멍 뚫린 물건을 가져오시오. 박아 드리리다.' },
    { key: 'pedlar',  name: '행상(行商)', emoji: '🧺', sheet: 'vendor',
      x: 450, y: 305, color: '#6f5a8a', trait: 'virtue', rarity: 2,
      line: '한 회차마다 물건이 바뀝니다. 오늘 것을 보시겠소?' },
    { key: 'scribe',  name: '사관(史官)', emoji: '📖', sheet: 'dex',
      x: 110, y: 200, color: '#4e6b5a', trait: 'wisdom', rarity: 3,
      line: '이 판에서 만난 인물을 적어 두었습니다.' }
  ];

  /**
   * 표식 셋 — 사람이 아니라 **밟는 것**이다.
   *   gate      굴혈 입구. 밟으면 제1층부터 (원작의 던전 입구 — 고르는 창이 없다)
   *   waypoint  역참 돌. 밟으면 밟아 둔 층 목록이 뜬다 (원작의 웨이포인트가 정확히 이것)
   *   vow       결사비. 되돌릴 수 없는 것이라 확인을 한 번 받는다
   */
  var MARKS = [
    /* 굴혈은 **가운데 아래**다 — 화면 앞쪽이라 손이 가장 먼저 닿는 자리고,
       원작에서도 야영지의 출구가 그쯤이다 */
    { key: 'gate',     name: '굴혈(窟穴)', emoji: '🕳️', x: 280, y: 300 },
    /* 소용돌이다. 예전에 돌(🪨)을 썼다가 **흰 사각형**으로 떴다 —
       U+1FAA8 은 글꼴에 없는 기기가 아직 흔하다. 원작의 웨이포인트가
       파란 소용돌이 포탈이므로 이쪽이 그림으로도 맞다. */
    { key: 'waypoint', name: '역참(驛站)', emoji: '🌀', x: 280, y: 180 },
    { key: 'vow',      name: '결사비(決死碑)', emoji: '☠️', x: 110, y: 310 }
  ];

  /* 마을 장식 — 매번 같아야 한다. 집이 매번 옮겨 다니면 그건 마을이 아니다.
     그래서 던전처럼 굴리지 않고 **박아 둔다**. */
  var DECOR = [
    { t: 'torch',  x: 120, y: WALL - 4, seed: 0.4 },
    { t: 'torch',  x: 290, y: WALL - 4, seed: 2.1 },
    { t: 'torch',  x: 460, y: WALL - 4, seed: 4.3 },
    { t: 'torch',  x: WALL - 4, y: 130, seed: 1.2 },
    { t: 'torch',  x: WALL - 4, y: 280, seed: 5.0 },
    /* 모닥불 하나 — 벽 횃불과 같은 그림(drawTorch)이지만 **바닥 한복판**에 둔다.
       불이 없으면 사람만 아홉 서 있는 빈 마당으로 보인다. 원작 야영지의 그 불이다.
       사람이 앉은 3×3 격자의 **빈 칸**에만 놓을 수 있다 — 아홉 자리가 다 찼으니
       빈 칸은 넷뿐이고, 그중 하나는 **서는 자리**(195,240)라 비워 둔다.
       둘을 놓았다가 불이 내 머리 위에서 타올랐다. */
    { t: 'torch',  x: 370, y: 145, seed: 3.1 },
    { t: 'pillar', x: 370, y: 255 },
    { t: 'pillar', x: 190, y: 130 },
    { t: 'crack',  x: 330, y: 210, a: 0.6, len: 36 },
    { t: 'crack',  x: 230, y: 150, a: 2.2, len: 26 },
    /* 집 셋 · 우물 · 대장간 — 3D로 세울 때(`dungeon3d.js` `TOWN3D`) 빈 돌방이
       아니라 진짜 마을로 보이게 한다. 사람·표식과 안 겹치는 구석·한복판에 놓았다
       (닿아서 발동하는 자리가 아니라 순수 배경이라 겹쳐도 판정엔 안 걸리지만,
       그림이 서로 파고들면 보기 흉해 자리를 갈랐다). 2D 화면에서는 아직 도형
       그대로다(`dungeon-view.js`가 `house`·`well`·`blacksmith`를 못 그리면
       조용히 건너뛴다 — 3D 전용 소품). */
    { t: 'house', x: 60, y: 60, h: 130, seed: 11 },
    { t: 'house', x: 500, y: 60, h: 130, seed: 23 },
    { t: 'house', x: 55, y: 235, h: 120, seed: 37 },
    { t: 'well', x: 280, y: 250, h: 34 },
    { t: 'blacksmith', x: 520, y: 235, h: 140 }
  ];

  var room = null;                      // 마을 방 (한 번 만들고 계속 쓴다)
  var player = null;
  var on = false;
  var input = { dx: 0, dy: 0 };
  var target = null;                    // 걸어가는 목표 {x, y}
  var fx = [];
  var armed = {};                       // 닿아서 이미 발동한 것 — 벗어나야 풀린다

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function D() { return global.DG.dungeon; }

  function build() {
    var i, n;
    room = {
      kind: 'town', index: 0, cleared: true, last: true,
      enemies: [], drops: [], doors: [], chest: null, well: null, shrine: null,
      decor: DECOR, npcs: [], marks: []
    };
    /* 원본(NPCS·MARKS)은 건드리지 않는다 — 진단이 마을을 두 번 세울 수 있다 */
    for (i = 0; i < NPCS.length; i++) {
      n = NPCS[i];
      room.npcs.push({
        key: n.key, name: n.name, emoji: n.emoji, sheet: n.sheet, line: n.line,
        x: n.x, y: n.y, color: n.color,
        ref: { id: 'town_' + n.key, name: n.name, trait: n.trait, rarity: n.rarity },
        phase: core.hash2(i + 1, 7) * 6.28, facing: n.x > 380 ? -1 : 1
      });
    }
    for (i = 0; i < MARKS.length; i++) {
      n = MARKS[i];
      room.marks.push({ key: n.key, name: n.name, emoji: n.emoji, x: n.x, y: n.y });
    }
    player = {
      /* 역참과 굴혈 사이, 어느 쪽에도 닿지 않는 자리(둘 다 100 남짓 떨어진다).
         입구 코앞에 세우면 둘러보기 전에 아래로 한 번 끌자마자 내려가 버린다. */
      x: 195, y: 240, phase: 0, walking: false, facing: 1, hurt: 0,
      cds: [0, 0, 0, 0], dash: null, invuln: 0, rallyUntil: 0,
      dirX: 0, dirY: -1
    };
  }

  /* ── 드나들기 ─────────────────────────────────────────── */

  function enter(opts) {
    if (!room) { build(); }
    opts = opts || {};
    /* 던전에서 막 나온 참이면 굴혈 앞에 세운다 — 나온 자리에 서 있어야
       "다시 들어간다" 가 한 걸음이다. 다만 입구에 **닿은 채로** 세우면
       그 자리에서 곧바로 다시 빨려 들어간다. 그래서 한 발 물려 세우고
       그 표식은 발동을 잠가 둔다(armed). */
    if (opts.fromDungeon) {
      player.x = 200; player.y = 300;
      armed.gate = true;
    }
    on = true;
    input.dx = 0; input.dy = 0;
    target = null;
    fx.length = 0;
    core.emit('town:enter', null);
    core.emit('changed');
    return true;
  }

  function leave() {
    on = false;
    input.dx = 0; input.dy = 0;
    target = null;
    return true;
  }

  function active() { return on; }

  /* ── 조작 ─────────────────────────────────────────────── */

  function setInput(dx, dy) { input.dx = dx; input.dy = dy; if (dx || dy) { target = null; } }
  function moveTo(x, y) { target = { x: x, y: y }; }

  /** 마을에서는 무예가 나가지 않는다 — 벨 것이 없다 */
  function castSkill() { return false; }

  /** 단약도 마실 일이 없다(늘 가득) — potion.js 가 이 값을 보고 알을 아낀다 */
  function refill() { return false; }

  /* ── 닿음 ─────────────────────────────────────────────── */

  /**
   * 닿으면 발동한다 — 폰에서 "지목해서 말 걸기" 는 손이 갑절로 든다.
   * 대신 **벗어나기 전까지 다시 발동하지 않는다**(armed). 이 문턱이 없으면
   * 대장장이 옆에 서 있는 동안 창이 끝없이 다시 열린다.
   */
  function touchCheck() {
    var i, o, d;
    for (i = 0; i < room.npcs.length; i++) {
      o = room.npcs[i];
      d = dist(player, o);
      if (d <= TALK_R && !armed[o.key]) {
        armed[o.key] = true;
        o.facing = player.x > o.x ? 1 : -1;
        core.emit('town:npc', o);
      } else if (d > LEAVE_R && armed[o.key]) {
        armed[o.key] = false;
      }
    }
    for (i = 0; i < room.marks.length; i++) {
      o = room.marks[i];
      d = dist(player, o);
      if (d <= TALK_R && !armed[o.key]) {
        armed[o.key] = true;
        core.emit('town:mark', o);
      } else if (d > LEAVE_R && armed[o.key]) {
        armed[o.key] = false;
      }
    }
  }

  /** 지금 닿아 있는 것 (화면이 이름표를 띄울 때 쓴다) */
  function nearest() {
    var best = null, bd = TALK_R + 22, i, d;
    for (i = 0; i < room.npcs.length; i++) {
      d = dist(player, room.npcs[i]);
      if (d < bd) { bd = d; best = room.npcs[i]; }
    }
    for (i = 0; i < room.marks.length; i++) {
      d = dist(player, room.marks[i]);
      if (d < bd) { bd = d; best = room.marks[i]; }
    }
    return best;
  }

  /* ── 한 틱 ────────────────────────────────────────────── */

  function update(dt) {
    if (!on || !player) { return; }
    dt = Math.min(dt, 0.05);

    var dx = input.dx, dy = input.dy;
    if (!dx && !dy && target) {
      var tdx = target.x - player.x, tdy = target.y - player.y;
      var td = Math.hypot(tdx, tdy);
      if (td < 6) { target = null; }
      else { dx = tdx / td; dy = tdy / td; }
    }
    var len = Math.hypot(dx, dy);
    if (len > 0) {
      dx /= len; dy /= len;
      player.x += dx * SPD * dt;
      player.y += dy * SPD * dt;
      player.walking = true;
      player.phase += dt * 9;
      if (dx) { player.facing = dx > 0 ? 1 : -1; }
      player.dirX = dx; player.dirY = dy;
    } else {
      player.walking = false;
    }
    player.x = core.clamp(player.x, WALL + P_R, ROOM_W - WALL - P_R);
    player.y = core.clamp(player.y, WALL + P_R, ROOM_H - WALL - P_R);

    /* 마을 사람은 제자리에서 숨만 쉰다 — 돌아다니게 하면 볼일 보러 쫓아다녀야 한다 */
    for (var i = 0; i < room.npcs.length; i++) { room.npcs[i].phase += dt * 1.2; }

    for (i = fx.length - 1; i >= 0; i--) {
      fx[i].life -= dt;
      if (fx[i].life <= 0) { fx.splice(i, 1); }
    }

    touchCheck();
  }

  /** 표식 위에 글자 하나 띄운다 (역참을 밟았다 같은 것) */
  function note(text, color) {
    fx.push({ t: 'get', x: player.x, y: player.y, text: text,
              color: color || '#f0c45a', life: 1.1 });
  }

  /* ── 화면이 읽어 가는 것 — dungeon.js 와 같은 모양 ────── */

  function raw() {
    if (!on) { return null; }
    return {
      town: true, theme: THEME,
      floor: 0, startFloor: 0,
      room: room, player: player, shots: [],
      boons: {}, choice: null,
      loot: { gold: 0, items: [] },
      hp: 1, hpMax: 1, mp: 1, mpMax: 1,
      kills: 0, dead: false
    };
  }

  /**
   * 조작판(구슬·무예·요대)이 이 값을 읽는다. 마을에서도 판은 그대로 있다 —
   * 원작에서 야영지에 들어섰다고 조작판이 사라지지 않는다.
   * 구슬은 가득 찬다. 마을은 쉬는 자리다.
   */
  function status() {
    var st = D().status();               // 던전이 쉬는 중일 때의 통계(최고 층 따위)
    var skills = [], got = D().slotSkills ? D().slotSkills() : [];
    for (var i = 0; i < 4; i++) {
      if (!got[i]) {
        skills.push({ key: null, name: '비었다', emoji: '·', desc: '무예를 걸어 두세요',
                      cost: 0, cd: 0, cdMax: 1, ready: false, empty: true });
        continue;
      }
      var sk = got[i].sk;
      skills.push({
        key: sk.key, name: sk.name, emoji: sk.emoji,
        desc: '마을에서는 쓰지 않습니다 — ' + sk.desc,
        rank: got[i].rank, cost: sk.cost, cd: 0, cdMax: sk.cd, ready: false
      });
    }
    var hpMax = global.DG.hero ? Math.max(1, Math.round(global.DG.hero.partyPower().def * 3 + 60)) : 100;
    return {
      active: true, town: true, floor: 0, theme: THEME,
      hp: hpMax, hpMax: hpMax, mp: 100, mpMax: 100,
      skills: skills, rally: false,
      room: 1, roomTotal: 1, cleared: true, kind: 'town',
      loot: { gold: 0, items: 0 },
      boons: {}, choice: null,
      kills: 0, best: st.best || 0,
      atk: 0, reach: 0
    };
  }

  global.DG = global.DG || {};
  global.DG.town = {
    ROOM_W: ROOM_W, ROOM_H: ROOM_H, WALL: WALL, P_R: P_R,
    TALK_R: TALK_R, THEME: THEME,
    NPCS: NPCS, MARKS: MARKS,
    active: active, enter: enter, leave: leave, update: update,
    setInput: setInput, moveTo: moveTo, castSkill: castSkill, refill: refill,
    nearest: nearest, note: note,
    status: status,
    /** 화면 전용 — 상태를 직접 읽는다 (쓰지는 말 것) */
    raw: raw,
    fx: function () { return fx; },
    /** 자가진단용 — 마을을 처음 상태로 되돌린다 */
    _reset: function () { room = null; armed = {}; build(); },
    /** 자가진단용 — 그 자리로 순간 옮긴다 (걸어가지 않고) */
    _put: function (x, y) { if (player) { player.x = x; player.y = y; } }
  };
})(window);
