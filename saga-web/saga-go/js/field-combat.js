/**
 * 들판 전투(野戰) — 원신식 (PLAN §5 ⑨, 2026-09-24 사용자 선택)
 * ---------------------------------------------------------------
 * 옛 전투(`rogue-action.js`)는 사건이 열어 주는 1:1 결투다. 이것은 **지도 위에
 * 원래 사는 적 무리**와 무대 전환 없이 싸운다 — 걷다가 보이면 붙고, 떨어지면 끝난다.
 *
 *   무리      160m 격자마다 해시로 자리·종류가 정해진다(세이브 없이도 늘 같은 자리).
 *             멀리(900m 마다) 갈수록 등급이 오른다 — 원신의 "세계 레벨" 자리
 *   편성      동행 앞 4명. 숫자 1~4(또는 초상)로 즉시 교체, 교체 1초 쿨
 *   조작      기본 공격 3타 · 원소 스킬(7초) · 원소 폭발(기력 60) · 회피(스태미나 20)
 *   원소      화·수·뇌 셋. 인물마다 id 해시로 고정(saga-godot PLAN 106장과 같은 규칙)
 *   반응      화+수 증발(×1.5) · 화+뇌 과부하(4m 광역·밀침) · 수+뇌 감전(3초 지속)
 *   원소 방패 정예 셋: 방패 동안 체력 대신 방패만 깎인다. 같은 원소 면역·물리 ×0.4·
 *             상성(수>화·뇌>수·화>뇌) ×2.5 → 깨지면 2초 비틀거림
 *
 * **판정 층(`create`·`step`·`attack`·`skill`·`burst`·`dodge`·`swap`·`react`·
 * `shieldMul`·`campAt`)은 순수 함수다** — 화면·세이브를 안 만진다. 자가진단이 이것만
 * 굴린다. 세이브는 런타임(`tick`)이 보상·치운 무리 시각(`save.field`)만 쓴다.
 * 화면은 `world3d.js` 가 `live()` 를 읽어 배우를 세우고, 원(예고·광역)·숫자는 여기서 얹는다.
 * 손잡이 `field.on` 을 0 으로 두면 무리째 사라진다.
 */
(function (global) {
  'use strict';

  function core() { return global.DG.core; }
  function data() { return global.DG.data; }
  function K(key, def) { return core().tuned('field.' + key, def); }

  /* ── 원소 ─────────────────────────────────────────────── */
  var EL = {
    fire:  { key: 'fire',  name: '화', icon: '🔥', color: '#ff6a3d' },
    water: { key: 'water', name: '수', icon: '💧', color: '#3fa9f5' },
    elec:  { key: 'elec',  name: '뇌', icon: '⚡', color: '#b57bff' }
  };
  var EL_KEYS = ['fire', 'water', 'elec'];
  /** 방패 원소 → 그것을 크게 깎는 원소 (수>화 · 뇌>수 · 화>뇌) */
  var COUNTER = { fire: 'water', water: 'elec', elec: 'fire' };
  var REACT_NAME = { vaporize: '증발', overload: '과부하', charged: '감전' };

  function on() { return K('on', 1) ? true : false; }
  function PARTY_MAX() { return 4; }
  function REACH() { return K('reach', 3.2); }           // 기본 공격 사거리(m)
  function LUNGE_R() { return K('lungeR', 6); }          // 이 안이면 한 걸음 파고들며 친다
  function SKILL_R() { return K('skillR', 4.5); }
  function SKILL_AIM() { return K('skillAim', 8); }      // 스킬이 적을 겨누는 거리
  function SKILL_CD() { return K('skillCd', 7); }
  function SKILL_MUL() { return K('skillMul', 2.2); }
  function BURST_R() { return K('burstR', 7); }
  function BURST_CD() { return K('burstCd', 12); }
  function BURST_MUL() { return K('burstMul', 4.5); }
  function ENERGY_MAX() { return 60; }
  function STA_MAX() { return 100; }
  function DODGE_COST() { return K('dodgeCost', 20); }
  function DODGE_IFRAME() { return K('dodgeIframe', 0.35); }
  function DASH_M() { return K('dashM', 3.6); }
  function DASH_T() { return 0.18; }
  function SWAP_CD() { return K('swapCd', 1); }
  function VAPOR_MUL() { return K('vaporMul', 1.5); }
  function OVERLOAD_R() { return 4; }
  function OVERLOAD_MUL() { return K('overloadMul', 1.2); }
  function CHARGED_R() { return 3; }
  function CHARGED_MUL() { return K('chargedMul', 0.45); }
  function AURA_T() { return 7; }
  function SHIELD_STUN() { return 2; }
  function STUN_MUL() { return 1.3; }
  function PHYS_SHIELD() { return 0.4; }
  function COUNTER_MUL() { return 2.5; }
  function AGGRO_R() { return K('aggroR', 12); }
  function LEASH_R() { return K('leashR', 34); }
  function CALM_REGEN() { return 4; }       // 이만큼 조용하면 체력이 돈다
  function REVIVE_CALM() { return K('reviveCalm', 15); }
  function HP_BASE() { return K('hpBase', 520); }
  function ATK_BASE() { return K('atkBase', 80); }
  function SHIELD_BASE() { return K('shieldBase', 300); }

  /* ── 해시(씨앗 없이 자리만으로) ───────────────────────── */
  function h3(a, b, s) {
    var h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function hs(str) {
    var h = 2166136261;
    str = String(str || '');
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }

  /** 인물의 원소 — id 해시로 고정(바뀌지 않는다) */
  function elementOf(id) { return EL_KEYS[Math.floor(hs(id) * 3) % 3]; }

  /**
   * 원소 반응 — 이미 붙어 있는 원소(aura)에 새 원소(hit)가 닿으면.
   * 같은 원소·물리는 반응 없음(null).
   */
  function react(aura, hit) {
    if (!aura || !hit || aura === hit) { return null; }
    var pair = [aura, hit].sort().join('+');
    if (pair === 'fire+water') { return { kind: 'vaporize', name: REACT_NAME.vaporize }; }
    if (pair === 'elec+fire') { return { kind: 'overload', name: REACT_NAME.overload }; }
    return { kind: 'charged', name: REACT_NAME.charged };
  }

  /** 원소 방패가 받는 배수 — 같은 원소 0 · 물리 0.4 · 상성 2.5 · 그 밖 1 */
  function shieldMul(shEl, hitEl) {
    if (!hitEl) { return PHYS_SHIELD(); }
    if (hitEl === shEl) { return 0; }
    if (COUNTER[shEl] === hitEl) { return COUNTER_MUL(); }
    return 1;
  }

  /* ── 적 ───────────────────────────────────────────────
   * ref 는 도감 펫 id — 이미 구워 둔 3D 몸·2D 그림을 그대로 빌린다(새 에셋 없음).
   * type: melee(코앞) · spit(내가 서 있던 자리에 떨어진다) · slam(제 둘레 원)
   */
  var FOES = {
    boar:   { name: '멧돼지',     ref: 'pt_boar',         el: null,    hp: 1.0, atk: 1.0, spd: 5.5, reach: 2.0, type: 'melee', wind: 0.6,  cd: 1.8, h: 0.95, exp: 1 },
    imp:    { name: '불도깨비',   ref: 'pt_dokkaebi',     el: 'fire',  hp: 0.9, atk: 1.1, spd: 4.5, reach: 2.2, type: 'melee', wind: 0.7,  cd: 1.9, h: 1.25, exp: 1 },
    toad:   { name: '물두꺼비',   ref: 'pt_toad',         el: 'water', hp: 1.1, atk: 0.9, spd: 3.2, reach: 6.5, type: 'spit',  wind: 0.9,  cd: 2.4, h: 0.9,  exp: 1, r: 1.8 },
    raptor: { name: '번개날쌘용', ref: 'pt_velociraptor', el: 'elec',  hp: 0.8, atk: 1.0, spd: 7.0, reach: 2.0, type: 'melee', wind: 0.45, cd: 1.5, h: 1.15, exp: 1 },
    bear:   { name: '반달곰',     ref: 'pt_bear',         el: null,    hp: 2.2, atk: 1.5, spd: 4.0, reach: 3.2, type: 'slam',  wind: 1.0,  cd: 2.6, h: 1.35, exp: 2, r: 3.4 },
    /* 정예 — 원소 방패 */
    ember:  { name: '홍염마',     ref: 'pt_jeoktoma',     el: 'fire',  hp: 1.8, atk: 1.3, spd: 5.0, reach: 2.4, type: 'melee', wind: 0.7,  cd: 1.8, h: 1.5,  exp: 3, shield: 'fire',  sh: 1.2 },
    tortoise: { name: '물거북 장수', ref: 'pt_hyeonmu',   el: 'water', hp: 2.2, atk: 1.2, spd: 3.0, reach: 7.0, type: 'spit',  wind: 1.0,  cd: 2.4, h: 1.4,  exp: 3, shield: 'water', sh: 1.5, r: 2.2 },
    bolt:   { name: '섬영마',     ref: 'pt_jeolyeong',    el: 'elec',  hp: 1.6, atk: 1.2, spd: 7.5, reach: 2.2, type: 'melee', wind: 0.5,  cd: 1.5, h: 1.5,  exp: 3, shield: 'elec',  sh: 1.0 },
    /* 우두머리 — 멀리서만 */
    rex:    { name: '폭군용',     ref: 'pt_t_rex',        el: null,    hp: 6.0, atk: 2.0, spd: 4.5, reach: 4.5, type: 'slam',  wind: 1.2,  cd: 2.8, h: 2.4,  exp: 8, r: 4.8, boss: true }
  };
  /** 무리 꼴 — 격자 해시로 고른다(앞의 다섯은 보통, 정예·우두머리는 따로 굴린다) */
  var THEMES = [
    ['boar', 'boar', 'boar'],
    ['imp', 'imp', 'boar'],
    ['toad', 'toad', 'toad'],
    ['raptor', 'raptor'],
    ['bear', 'boar', 'boar'],
    ['imp', 'toad', 'raptor']
  ];
  var ELITES = [['ember', 'imp', 'imp'], ['tortoise', 'toad', 'toad'], ['bolt', 'raptor', 'raptor']];

  var CELL = 160;          // 무리 격자(m)
  var TILE = 48;           // world3d GRID — 지형 칸
  function CAMP_CHANCE() { return K('campChance', 0.45); }
  function SAFE_R() { return 60; }                 // 시작점 둘레에는 안 선다
  function TIER_STEP() { return K('tierStep', 900); }
  function tierAt(x, y) { return 1 + Math.min(5, Math.floor(Math.hypot(x, y) / TIER_STEP())); }
  function tierMul(t) { return 1 + 0.3 * (t - 1); }

  /**
   * 격자 한 칸의 무리 — 없으면 null. 순수 함수(같은 칸은 늘 같은 답).
   * terr(tx,ty) 를 주면 물·마을·길 위에는 안 세운다(진단은 안 줘도 된다).
   */
  function campAt(cx, cy, terr) {
    if (h3(cx, cy, 7) > CAMP_CHANCE()) { return null; }
    var x = (cx + 0.2 + 0.6 * h3(cx, cy, 11)) * CELL;
    var y = (cy + 0.2 + 0.6 * h3(cx, cy, 13)) * CELL;
    var dist = Math.hypot(x, y);
    if (dist < SAFE_R()) { return null; }
    if (terr) {
      var k = terr(Math.floor(x / TILE), Math.floor(y / TILE));
      if (k === 'water' || k === 'town' || k === 'road') { return null; }
    }
    var r = h3(cx, cy, 17), list, kind = 'plain';
    if (dist > 400 && r < 0.05) { list = ['rex', 'boar', 'boar']; kind = 'boss'; }
    else if (r < 0.2) { list = ELITES[Math.floor(h3(cx, cy, 19) * ELITES.length) % ELITES.length]; kind = 'elite'; }
    else { list = THEMES[Math.floor(h3(cx, cy, 23) * THEMES.length) % THEMES.length]; }
    var foes = [];
    for (var i = 0; i < list.length; i++) {
      var a = (i / list.length) * Math.PI * 2 + h3(cx, cy, 29) * 6.283;
      var rr = i === 0 && kind !== 'plain' ? 0 : 3.2;
      foes.push({ kind: list[i], dx: Math.cos(a) * rr, dy: Math.sin(a) * rr });
    }
    return { key: cx + '_' + cy, x: x, y: y, tier: tierAt(x, y), kind: kind, foes: foes };
  }

  /* ── 편성 ─────────────────────────────────────────────── */
  function statsOf(id) {
    var H = global.DG.hero;
    if (H && H.stats && id !== '_me') {
      var s = H.stats(id);
      if (s && (s.might || s.wisdom || s.command)) { return s; }
    }
    return { might: 60, wisdom: 60, command: 60 };
  }
  function memberOf(id) {
    var h = id === '_me' ? null : (data() && data().find ? data().find(id) : null);
    var s = statsOf(id);
    var hpMax = Math.round(300 + s.command * 6);
    return {
      id: id, name: h ? h.name : '나', el: elementOf(id),
      atk: Math.max(20, Math.round(s.might * 0.7 + s.wisdom * 0.3)),
      hpMax: hpMax, hp: hpMax, em: s.wisdom, def: s.command,
      skillCd: 0, burstCd: 0, energy: 0, down: false, burn: null
    };
  }

  function create(partyIds) {
    var ids = (partyIds || []).slice(0, PARTY_MAX());
    if (!ids.length) { ids = ['_me']; }
    return {
      t: 0, party: ids.map(memberOf), active: 0, swapCd: 0,
      stamina: STA_MAX(), staT: 9, iframe: 0, dash: null,
      combo: 0, comboT: 9, atkCd: 0, calmT: 99,
      foes: {}, camps: {}, cleared: {}, uid: 0, ev: [], kills: 0
    };
  }

  /** 편성이 바뀌었을 때 — 같은 사람은 체력 비율·쿨·기력을 그대로 들고 온다 */
  function reparty(S, partyIds) {
    var old = {}, i;
    for (i = 0; i < S.party.length; i++) { old[S.party[i].id] = S.party[i]; }
    var activeId = S.party[S.active] && S.party[S.active].id;
    var fresh = create(partyIds).party;
    for (i = 0; i < fresh.length; i++) {
      var o = old[fresh[i].id], m = fresh[i];
      if (!o) { continue; }
      m.hp = Math.round(m.hpMax * (o.hp / o.hpMax)); m.down = o.down;
      m.skillCd = o.skillCd; m.burstCd = o.burstCd; m.energy = o.energy;
    }
    S.party = fresh;
    S.active = 0;
    for (i = 0; i < fresh.length; i++) { if (fresh[i].id === activeId) { S.active = i; } }
    if (S.party[S.active].down) { nextAlive(S); }
    return S;
  }

  function aliveIdx(S) {
    var out = [];
    for (var i = 0; i < S.party.length; i++) { if (!S.party[i].down) { out.push(i); } }
    return out;
  }
  function nextAlive(S) {
    for (var k = 1; k <= S.party.length; k++) {
      var j = (S.active + k) % S.party.length;
      if (!S.party[j].down) { S.active = j; return true; }
    }
    return false;
  }
  function allDown(S) { return aliveIdx(S).length === 0; }

  /* ── 무리 들이기·치우기 ───────────────────────────────── */
  function spawnCamp(S, c) {
    S.camps[c.key] = { key: c.key, x: c.x, y: c.y, tier: c.tier, kind: c.kind, uids: [] };
    for (var i = 0; i < c.foes.length; i++) {
      var F = FOES[c.foes[i].kind], m = tierMul(c.tier);
      var uid = ++S.uid;
      var hx = c.x + c.foes[i].dx, hy = c.y + c.foes[i].dy;
      var shieldMax = F.shield ? Math.round(SHIELD_BASE() * F.sh * m) : 0;
      S.foes[uid] = {
        uid: uid, camp: c.key, kind: c.foes[i].kind, name: F.name, el: F.el, tier: c.tier,
        x: hx, y: hy, hx: hx, hy: hy,
        hpMax: Math.round(HP_BASE() * F.hp * m), hp: Math.round(HP_BASE() * F.hp * m),
        atk: Math.round(ATK_BASE() * F.atk * m),
        shield: shieldMax, shieldMax: shieldMax, shEl: F.shield || null,
        aura: null, auraT: 0, st: 'idle', stT: 0, cd: 0.4 + (uid % 5) * 0.2,
        wa: (uid * 2.39996) % 6.283, stun: 0, shockN: 0, shockT: 0, shockDmg: 0,
        mark: null, dead: false, deadT: 0, hitT: -99, moving: false, phase: 0, calmReturn: 0
      };
      S.camps[c.key].uids.push(uid);
    }
  }

  /**
   * 내 둘레 격자를 훑어 무리를 들이고, 멀어진(그리고 싸우지 않는) 무리는 치운다.
   * 치운 무리는 다시 오면 온전한 모습으로 선다(체력은 기억하지 않는다).
   */
  function populate(S, px, py, terr, radius) {
    var R = radius || 200, far = R * 1.6;
    var c0x = Math.floor((px - R) / CELL), c1x = Math.floor((px + R) / CELL);
    var c0y = Math.floor((py - R) / CELL), c1y = Math.floor((py + R) / CELL);
    for (var cy = c0y; cy <= c1y; cy++) {
      for (var cx = c0x; cx <= c1x; cx++) {
        var key = cx + '_' + cy;
        if (S.camps[key] || S.cleared[key]) { continue; }
        var c = campAt(cx, cy, terr);
        if (c && Math.hypot(c.x - px, c.y - py) <= R) { spawnCamp(S, c); }
      }
    }
    for (var k in S.camps) {
      if (!S.camps.hasOwnProperty(k)) { continue; }
      var cp = S.camps[k];
      if (Math.hypot(cp.x - px, cp.y - py) <= far) { continue; }
      var busy = false, j;
      for (j = 0; j < cp.uids.length; j++) {
        var f = S.foes[cp.uids[j]];
        if (f && !f.dead && (f.st === 'chase' || f.st === 'wind')) { busy = true; }
      }
      if (busy) { continue; }
      for (j = 0; j < cp.uids.length; j++) { delete S.foes[cp.uids[j]]; }
      delete S.camps[k];
    }
  }

  /* ── 판정 ─────────────────────────────────────────────── */
  function push(S, e) { S.ev.push(e); return e; }
  function living(S) {
    var out = [];
    for (var k in S.foes) { if (S.foes.hasOwnProperty(k) && !S.foes[k].dead) { out.push(S.foes[k]); } }
    return out;
  }
  function nearestFoe(S, px, py, r) {
    var best = null, bd = r;
    var L = living(S);
    for (var i = 0; i < L.length; i++) {
      var d = Math.hypot(L[i].x - px, L[i].y - py);
      if (d <= bd) { bd = d; best = L[i]; }
    }
    return best;
  }
  function foesWithin(S, x, y, r) {
    var out = [], L = living(S);
    for (var i = 0; i < L.length; i++) { if (Math.hypot(L[i].x - x, L[i].y - y) <= r) { out.push(L[i]); } }
    return out;
  }
  function wake(f) { if (f.st === 'idle' || f.st === 'return') { f.st = 'chase'; f.stT = 0; } }

  function killCheck(S, f) {
    if (f.hp > 0 || f.dead) { return; }
    f.hp = 0; f.dead = true; f.deadT = 0; f.mark = null;
    S.kills++;
    push(S, { t: 'kill', uid: f.uid, kind: f.kind, tier: f.tier, x: f.x, y: f.y, camp: f.camp, boss: !!FOES[f.kind].boss, elite: !!FOES[f.kind].shield });
    var cp = S.camps[f.camp];
    if (!cp) { return; }
    for (var i = 0; i < cp.uids.length; i++) {
      var g = S.foes[cp.uids[i]];
      if (g && !g.dead) { return; }
    }
    S.cleared[cp.key] = true;
    push(S, { t: 'clear', camp: cp.key, tier: cp.tier, kind: cp.kind, x: cp.x, y: cp.y });
  }

  /** 방패부터 깎는 날것의 피해(광역 반응 조각·감전 틱이 쓴다) */
  function rawHit(S, f, dmg) {
    if (f.dead || dmg <= 0) { return 0; }
    if (f.shield > 0) {
      f.shield = Math.max(0, f.shield - dmg);
      if (f.shield <= 0) { f.stun = SHIELD_STUN(); f.mark = null; f.st = 'chase'; push(S, { t: 'break', uid: f.uid, x: f.x, y: f.y }); }
      return dmg;
    }
    f.hp -= dmg;
    killCheck(S, f);
    return dmg;
  }

  /**
   * 한 대 — 방패·원소 부착·반응을 다 여기서 가른다.
   * @returns {{uid, dmg, react, shield, immune}}
   */
  function hitFoe(S, f, m, raw, el, src) {
    var out = { uid: f.uid, dmg: 0, react: null, shield: false, immune: false };
    if (f.dead) { return out; }
    var emB = 1 + (m.em || 0) / 300;
    var mul = f.stun > 0 ? STUN_MUL() : 1;
    S.calmT = 0; f.hitT = S.t; wake(f);
    if (f.shield > 0) {
      var sm = shieldMul(f.shEl, el);
      out.shield = true; out.immune = sm === 0;
      out.dmg = Math.round(raw * mul * sm);
      rawHit(S, f, out.dmg);
    } else {
      var rc = react(f.aura, el);
      if (!rc && el) { f.aura = el; f.auraT = AURA_T(); }
      var dmg = raw * mul * (rc && rc.kind === 'vaporize' ? VAPOR_MUL() * emB : 1);
      out.dmg = Math.round(dmg);
      f.hp -= out.dmg;
      if (rc) {
        out.react = rc.kind;
        f.aura = null; f.auraT = 0;
        var near, i;
        if (rc.kind === 'overload') {
          near = foesWithin(S, f.x, f.y, OVERLOAD_R());
          var od = Math.round(m.atk * OVERLOAD_MUL() * emB);
          for (i = 0; i < near.length; i++) {
            var g = near[i];
            var ang = Math.atan2(g.y - f.y, g.x - f.x);
            if (g !== f) { g.x += Math.cos(ang) * 2.5; g.y += Math.sin(ang) * 2.5; }
            wake(g);
            rawHit(S, g, od);
          }
        } else if (rc.kind === 'charged') {
          near = foesWithin(S, f.x, f.y, CHARGED_R());
          for (i = 0; i < near.length; i++) {
            near[i].shockN = 3; near[i].shockT = 1;
            near[i].shockDmg = Math.round(m.atk * CHARGED_MUL() * emB);
            wake(near[i]);
          }
        }
        push(S, { t: 'react', kind: rc.kind, name: rc.name, x: f.x, y: f.y });
      }
      killCheck(S, f);
    }
    push(S, { t: 'hit', uid: f.uid, x: f.x, y: f.y, dmg: out.dmg, el: el, react: out.react, src: src, shield: out.shield, immune: out.immune });
    return out;
  }

  function active(S) { return S.party[S.active]; }

  /** 기본 공격 — 3타 사슬(0.9·1.0·1.5). 사거리 밖이면 6m 안의 적에게 파고든다 */
  function attack(S, px, py) {
    var m = active(S);
    if (!m || m.down || S.atkCd > 0) { return { ok: false }; }
    var tgt = nearestFoe(S, px, py, REACH());
    if (!tgt) {
      var n = nearestFoe(S, px, py, LUNGE_R());
      if (n) {
        var d = Math.hypot(n.x - px, n.y - py) || 1, go = Math.max(0, d - REACH() * 0.7);
        S.dash = { vx: (n.x - px) / d * go / 0.14, vy: (n.y - py) / d * go / 0.14, t: 0.14 };
        tgt = n;
      }
    }
    var step = S.combo % 3;
    S.combo++; S.comboT = 0;
    S.atkCd = step === 2 ? 0.55 : 0.34;
    if (!tgt) { push(S, { t: 'swing', step: step }); return { ok: true, miss: true, step: step }; }
    var r = hitFoe(S, tgt, m, m.atk * [0.9, 1.0, 1.5][step], null, 'basic');
    m.energy = Math.min(ENERGY_MAX(), m.energy + 1.5);
    push(S, { t: 'swing', step: step, uid: tgt.uid });
    return { ok: true, step: step, hit: r };
  }

  /** 원소 스킬 — 겨눈 적 둘레 4.5m 에 원소를 붙인다. 기력 +6(+2/마리), 대기 동료 +3 */
  function skill(S, px, py) {
    var m = active(S);
    if (!m || m.down || m.skillCd > 0) { return { ok: false, cd: m ? m.skillCd : 0 }; }
    var aim = nearestFoe(S, px, py, SKILL_AIM());
    var cx = aim ? aim.x : px, cy = aim ? aim.y : py;
    var hits = foesWithin(S, cx, cy, SKILL_R());
    for (var i = 0; i < hits.length; i++) { hitFoe(S, hits[i], m, m.atk * SKILL_MUL(), m.el, 'skill'); }
    m.skillCd = SKILL_CD();
    m.energy = Math.min(ENERGY_MAX(), m.energy + 6 + Math.min(6, hits.length * 2));
    for (var j = 0; j < S.party.length; j++) {
      var o = S.party[j];
      if (j !== S.active && !o.down) { o.energy = Math.min(ENERGY_MAX(), o.energy + 3); }
    }
    push(S, { t: 'skill', el: m.el, x: cx, y: cy, r: SKILL_R(), n: hits.length });
    return { ok: true, n: hits.length };
  }

  /** 원소 폭발 — 기력 60 을 다 쓴다. 내 둘레 7m, 1초 무적 */
  function burst(S, px, py) {
    var m = active(S);
    if (!m || m.down || m.energy < ENERGY_MAX() || m.burstCd > 0) { return { ok: false }; }
    m.energy = 0; m.burstCd = BURST_CD();
    S.iframe = Math.max(S.iframe, 1.0);
    var hits = foesWithin(S, px, py, BURST_R());
    for (var i = 0; i < hits.length; i++) { hitFoe(S, hits[i], m, m.atk * BURST_MUL(), m.el, 'burst'); }
    push(S, { t: 'burst', el: m.el, x: px, y: py, r: BURST_R(), n: hits.length });
    return { ok: true, n: hits.length };
  }

  /** 회피 — 스태미나 20, 0.35초 무적, 3.6m 미끄러진다. 방향이 없으면 가장 가까운 적 반대로 */
  function dodge(S, dx, dy, px, py) {
    if (S.stamina < DODGE_COST() || allDown(S)) { return { ok: false }; }
    if (!dx && !dy) {
      var n = nearestFoe(S, px || 0, py || 0, 30);
      if (n) { dx = (px || 0) - n.x; dy = (py || 0) - n.y; } else { dy = 1; }
    }
    var len = Math.hypot(dx, dy) || 1;
    S.stamina -= DODGE_COST(); S.staT = 0;
    S.iframe = Math.max(S.iframe, DODGE_IFRAME());
    S.dash = { vx: dx / len * DASH_M() / DASH_T(), vy: dy / len * DASH_M() / DASH_T(), t: DASH_T() };
    push(S, { t: 'dodge' });
    return { ok: true };
  }

  /** 교체 — 1초 쿨. 쓰러진 사람에게는 못 바꾼다 */
  function swap(S, idx) {
    var m = S.party[idx];
    if (!m || idx === S.active || m.down || S.swapCd > 0) { return { ok: false }; }
    S.active = idx; S.swapCd = SWAP_CD(); S.combo = 0;
    push(S, { t: 'swap', idx: idx, id: m.id, el: m.el });
    return { ok: true };
  }

  function hurt(S, f) {
    var m = active(S);
    if (!m || m.down) { return; }
    var dmg = Math.max(1, Math.round(f.atk * (1 - m.def / (m.def + 300))));
    m.hp -= dmg; S.calmT = 0;
    if (f.el === 'fire') { m.burn = { n: 3, t: 1, dmg: Math.max(1, Math.round(dmg * 0.2)) }; }
    else if (f.el === 'water') { S.stamina = Math.max(0, S.stamina - 25); S.staT = 0; }
    else if (f.el === 'elec') { m.energy = Math.max(0, m.energy - 10); }
    push(S, { t: 'hurt', uid: f.uid, dmg: dmg, el: f.el, id: m.id });
    if (m.hp <= 0) { downMember(S, S.active); }
  }

  function downMember(S, idx) {
    var m = S.party[idx];
    m.hp = 0; m.down = true; m.burn = null;
    push(S, { t: 'down', idx: idx, id: m.id });
    if (idx === S.active && nextAlive(S)) {
      push(S, { t: 'swap', idx: S.active, id: S.party[S.active].id, el: S.party[S.active].el, forced: true });
    }
    if (allDown(S)) {
      /* 전멸 — 모두 30% 로 일어나고 붙어 있던 무리는 제자리로 돌아가 다시 찬다 */
      for (var i = 0; i < S.party.length; i++) {
        var p = S.party[i];
        p.down = false; p.hp = Math.round(p.hpMax * 0.3); p.burn = null;
      }
      S.active = 0;
      var L = living(S);
      for (var j = 0; j < L.length; j++) {
        if (L[j].st !== 'idle') { L[j].st = 'return'; L[j].mark = null; L[j].calmReturn = 3; }
      }
      S.calmT = 0;
      push(S, { t: 'wipe' });
    }
  }

  /**
   * 한 걸음. inp = { px, py, blocked }. blocked 면(조우 창·시트) 적이 제자리에 멎는다.
   * 쌓인 사건은 S.ev 로 남는다 — 부른 쪽이 비운다(`drain`).
   */
  function step(S, dt, inp) {
    var px = inp.px, py = inp.py;
    S.t += dt;
    S.calmT += dt;
    S.iframe = Math.max(0, S.iframe - dt);
    S.swapCd = Math.max(0, S.swapCd - dt);
    S.atkCd = Math.max(0, S.atkCd - dt);
    S.comboT += dt;
    if (S.comboT > 1.0) { S.combo = 0; }
    S.staT += dt;
    if (S.staT > 0.8) { S.stamina = Math.min(STA_MAX(), S.stamina + 30 * dt); }
    if (S.dash) {
      var dd = Math.min(dt, S.dash.t);
      push(S, { t: 'move', dx: S.dash.vx * dd, dy: S.dash.vy * dd });
      S.dash.t -= dd;
      if (S.dash.t <= 1e-6) { S.dash = null; }
    }
    var i, m;
    for (i = 0; i < S.party.length; i++) {
      m = S.party[i];
      m.skillCd = Math.max(0, m.skillCd - dt);
      m.burstCd = Math.max(0, m.burstCd - dt);
      if (m.burn && !m.down) {
        m.burn.t -= dt;
        if (m.burn.t <= 0) {
          m.burn.t += 1; m.burn.n--;
          m.hp = Math.max(1, m.hp - m.burn.dmg);   // 화상만으로는 안 쓰러진다
          push(S, { t: 'burn', idx: i, dmg: m.burn.dmg });
          if (m.burn.n <= 0) { m.burn = null; }
        }
      }
      if (!m.down && S.calmT > CALM_REGEN()) { m.hp = Math.min(m.hpMax, m.hp + m.hpMax * 0.04 * dt); }
      if (m.down && S.calmT > REVIVE_CALM()) { m.down = false; m.hp = Math.round(m.hpMax * 0.3); push(S, { t: 'revive', idx: i }); }
    }

    var ids = Object.keys(S.foes);
    for (var n = 0; n < ids.length; n++) {
      var f = S.foes[ids[n]];
      if (!f) { continue; }
      if (f.dead) {
        f.deadT += dt;
        if (f.deadT > 1.2) { delete S.foes[ids[n]]; }
        continue;
      }
      f.moving = false;
      if (f.auraT > 0) { f.auraT -= dt; if (f.auraT <= 0) { f.aura = null; } }
      if (f.shockN > 0) {
        f.shockT -= dt;
        if (f.shockT <= 0) {
          f.shockT += 1; f.shockN--;
          var sd = rawHit(S, f, f.shockDmg);
          push(S, { t: 'dot', uid: f.uid, x: f.x, y: f.y, dmg: sd });
          if (f.dead) { continue; }
        }
      }
      if (inp.blocked) { continue; }
      if (f.stun > 0) { f.stun -= dt; continue; }
      var F = FOES[f.kind];
      var d = Math.hypot(f.x - px, f.y - py);
      var home = Math.hypot(f.x - f.hx, f.y - f.hy);
      if (f.st !== 'return' && f.st !== 'idle' && home > LEASH_R()) { f.st = 'return'; f.mark = null; }
      if (f.st === 'idle') {
        f.wa += dt * 0.35;
        var tx = f.hx + Math.cos(f.wa) * 2.2, ty = f.hy + Math.sin(f.wa * 0.8) * 2.2;
        moveToward(f, tx, ty, 1.1 * dt);
        if (d < AGGRO_R() && !allDown(S)) { f.st = 'chase'; push(S, { t: 'aggro', uid: f.uid, camp: f.camp }); }
      } else if (f.st === 'return') {
        f.calmReturn = Math.max(0, f.calmReturn - dt);
        moveToward(f, f.hx, f.hy, F.spd * 1.2 * dt);
        if (Math.hypot(f.x - f.hx, f.y - f.hy) < 0.6) {
          f.st = 'idle'; f.hp = f.hpMax; f.shield = f.shieldMax; f.aura = null; f.shockN = 0;
        }
      } else if (f.st === 'chase') {
        S.calmT = Math.min(S.calmT, 0);
        var want = F.type === 'spit' ? F.reach * 0.85 : F.reach * 0.8;
        if (d > want) { moveToward(f, px, py, F.spd * dt); }
        f.cd -= dt;
        if (d <= F.reach && f.cd <= 0 && !allDown(S)) {
          f.st = 'wind'; f.stT = F.wind;
          f.mark = F.type === 'spit' ? { x: px, y: py, r: F.r, t: F.wind }
            : (F.type === 'slam' ? { x: f.x, y: f.y, r: F.r, t: F.wind } : null);
          push(S, { t: 'tell', uid: f.uid, type: F.type, x: f.x, y: f.y });
        }
      } else if (f.st === 'wind') {
        S.calmT = Math.min(S.calmT, 0);
        f.stT -= dt;
        if (f.stT <= 0) {
          var inHit = f.mark ? Math.hypot(px - f.mark.x, py - f.mark.y) <= f.mark.r : d <= F.reach + 0.6;
          if (inHit && S.iframe <= 0) { hurt(S, f); }
          else if (inHit) { push(S, { t: 'evade', uid: f.uid }); }
          push(S, { t: 'strike', uid: f.uid, type: F.type, x: f.mark ? f.mark.x : f.x, y: f.mark ? f.mark.y : f.y, r: f.mark ? f.mark.r : 0 });
          f.mark = null; f.cd = F.cd;
          /* 이 한 대로 전멸했으면 downMember 가 이미 'return' 으로 돌려놨다 — 덮지 않는다 */
          if (f.st === 'wind') { f.st = 'recover'; f.stT = 0.5; }
        }
      } else if (f.st === 'recover') {
        f.stT -= dt;
        if (f.stT <= 0) { f.st = 'chase'; }
      }
      if (f.moving) { f.phase += dt * 9; }
    }
    return S;
  }

  function moveToward(f, tx, ty, stepM) {
    var dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy);
    if (d < 1e-3) { return; }
    var s = Math.min(d, stepM);
    f.x += dx / d * s; f.y += dy / d * s;
    f.moving = s > 0.004;
  }

  function drain(S) { var e = S.ev; S.ev = []; return e; }

  /** 지금 싸우는 중인가 — 쫓거나 예고 중인 적이 있거나, 방금 때리고 맞았다 */
  function engaged(S) {
    if (!S) { return false; }
    if (S.calmT < 3) { return true; }
    var L = living(S);
    for (var i = 0; i < L.length; i++) { if (L[i].st === 'chase' || L[i].st === 'wind' || L[i].st === 'recover') { return true; } }
    return false;
  }

  /* ══ 런타임 — 세이브·화면·입력 ═══════════════════════════ */
  var S = null, partyKey = '', popAcc = 9, refAcc = 0, bound = false, hudEl = null;
  var numLayer = null, fx = { marks: {}, rings: [] };
  var lastAuto = 0;

  function RESPAWN_MS() { return K('respawnMin', 15) * 60000; }
  function fieldSave() {
    var s = core().save;
    if (!s.field || typeof s.field !== 'object') { s.field = { camps: {}, kills: 0, clears: 0 }; }
    if (!s.field.camps) { s.field.camps = {}; }
    return s.field;
  }
  function pkey() { return (core().save.party || []).slice(0, PARTY_MAX()).join(','); }

  function ensureState() {
    var k = pkey();
    if (!S) {
      S = create(core().save.party);
      partyKey = k;
      var fs = fieldSave(), now = Date.now();
      for (var c in fs.camps) {
        if (fs.camps.hasOwnProperty(c) && now - fs.camps[c] < RESPAWN_MS()) { S.cleared[c] = true; }
      }
    } else if (k !== partyKey) {
      reparty(S, core().save.party);
      partyKey = k;
    }
    return S;
  }

  /** 레벨·장비가 바뀌면 공격력·최대 체력을 다시 읽는다(체력 비율은 그대로) */
  function refreshStats() {
    for (var i = 0; i < S.party.length; i++) {
      var m = S.party[i], f = memberOf(m.id);
      var ratio = m.hpMax ? m.hp / m.hpMax : 1;
      m.atk = f.atk; m.em = f.em; m.def = f.def; m.hpMax = f.hpMax;
      m.hp = Math.round(f.hpMax * ratio);
    }
  }

  function blocked() {
    var D = global.DG;
    return !!((D.encounter && D.encounter.active) || (D.rogue && D.rogue.active) ||
      (D.duel && D.duel.active) || (D.rogueAction && D.rogueAction.active) ||
      (document.body && document.body.classList.contains('sheet-open')));
  }

  function terrFn() {
    var W = global.DG.world;
    return W && W.terrainAt ? function (tx, ty) { try { return W.terrainAt(tx, ty); } catch (e) { return null; } } : null;
  }

  /** 자동 전투 — 🤖 자동 전투를 켰거나, 자동 순행 중이면(AI 가 걷는데 싸움만 사람에게 맡길 수는 없다) */
  function autoOn() {
    var sv = core().save, st = sv.settings;
    return !!((st && st.autoBattle) || (sv.auto && sv.auto.on));
  }

  function autoFight(pos) {
    var m = active(S);
    if (!m || m.down) { return; }
    var n = nearestFoe(S, pos.x, pos.y, SKILL_AIM());
    if (!n) { return; }
    if (m.energy >= ENERGY_MAX() && foesWithin(S, pos.x, pos.y, BURST_R()).length >= 2) { act('burst'); return; }
    if (m.skillCd <= 0) { act('skill'); return; }
    if (Math.hypot(n.x - pos.x, n.y - pos.y) <= LUNGE_R()) { act('attack'); }
  }

  function tick(dt) {
    if (!on() || !core() || !core().save) { hide(); return; }
    ensureState();
    var pos = core().save.player.pos;
    popAcc += dt; refAcc += dt;
    if (popAcc > 0.5) { popAcc = 0; populate(S, pos.x, pos.y, terrFn(), K('activeR', 200)); respawnSweep(); }
    if (refAcc > 2) { refAcc = 0; refreshStats(); }
    var bl = blocked();
    step(S, dt, { px: pos.x, py: pos.y, blocked: bl });
    if (!bl && autoOn() && engaged(S)) {
      lastAuto += dt;
      if (lastAuto > 0.3) { lastAuto = 0; autoFight(pos); }
    }
    handle(drain(S), pos);
    if (!global.DG_NO_DRAW) { paint(dt); }
  }

  function respawnSweep() {
    var fs = fieldSave(), now = Date.now();
    for (var c in S.cleared) {
      if (!S.cleared.hasOwnProperty(c)) { continue; }
      var at = fs.camps[c];
      if (!at || now - at >= RESPAWN_MS()) { delete S.cleared[c]; delete fs.camps[c]; }
    }
  }

  function toast(msg) { if (global.DG.ui && global.DG.ui.toast) { global.DG.ui.toast(msg); } }
  function sfx(name) { if (global.DG.audio) { try { global.DG.audio.play(name); } catch (e) { /* 소리는 없어도 된다 */ } } }
  function W3() { var w = global.DG.world3d; return w && w.active && w.active() ? w : null; }

  function handle(ev, pos) {
    var c = core(), H = global.DG.hero, i;
    for (i = 0; i < ev.length; i++) {
      var e = ev[i];
      if (e.t === 'move') { pos.x += e.dx; pos.y += e.dy; }
      else if (e.t === 'hit') {
        sfx('hit');
        floatNum(e.x, e.y, e.immune ? '면역' : String(e.dmg), e.el, e.react ? 1.3 : (e.src === 'burst' ? 1.25 : 1));
        var w = W3();
        if (w) {
          w.playAnim('fc' + e.uid, 'hit', 260);
          if (e.src === 'burst') { w.shake(0.5); w.hold(90); } else if (e.react) { w.shake(0.3); w.hold(60); } else { w.shake(0.12); }
        }
      } else if (e.t === 'react') {
        floatNum(e.x, e.y, e.name + '!', e.kind === 'vaporize' ? 'fire' : (e.kind === 'overload' ? 'fire' : 'elec'), 1.5, true);
        ring(e.x, e.y, e.kind === 'overload' ? OVERLOAD_R() : CHARGED_R(), e.kind === 'charged' ? EL.elec.color : '#ffb347', 0.45);
      } else if (e.t === 'dot') { floatNum(e.x, e.y, String(e.dmg), 'elec', 0.8); }
      else if (e.t === 'break') {
        floatNum(e.x, e.y, '방패 깨짐!', null, 1.4, true);
        ring(e.x, e.y, 2.4, '#ffffff', 0.4);
        if (W3()) { W3().shake(0.45); W3().hold(100); }
      } else if (e.t === 'swing') {
        if (W3()) { W3().playAnim('me', 'attack', 280); }
      } else if (e.t === 'skill') {
        ring(e.x, e.y, e.r, EL[e.el].color, 0.5);
        if (W3()) { W3().playAnim('me', 'attack', 380); }
      } else if (e.t === 'burst') {
        ring(e.x, e.y, e.r, EL[e.el].color, 0.8);
        ring(e.x, e.y, e.r * 0.55, '#ffffff', 0.5);
        sfx('thunder');
      } else if (e.t === 'dodge') { if (W3()) { W3().playAnim('me', 'dodge', 300); } }
      else if (e.t === 'tell') { if (W3()) { W3().playAnim('fc' + e.uid, 'attack', 700); } }
      else if (e.t === 'strike') { if (e.r) { ring(e.x, e.y, e.r, '#ff4d4d', 0.3); } }
      else if (e.t === 'hurt') {
        floatNum(pos.x, pos.y, '-' + e.dmg, e.el, 1, false, true);
        if (W3()) { W3().playAnim('me', 'hit', 260); W3().shake(0.25); }
      } else if (e.t === 'evade') { floatNum(pos.x, pos.y, '회피!', null, 1.1, true, true); }
      else if (e.t === 'swap') {
        var sm = S.party[e.idx];
        if (e.forced) { toast('💫 ' + sm.name + ' 교대 — 앞사람이 쓰러졌다'); }
        ring(pos.x, pos.y, 1.6, EL[sm.el].color, 0.35);
      } else if (e.t === 'down') {
        var dm = S.party[e.idx];
        c.log('💫 ' + dm.name + ' 쓰러짐 (들판 전투)', 'battle');
      } else if (e.t === 'wipe') {
        var D = global.DG.drop, lost = D && D.lose ? D.lose() : null;
        toast('🏳️ 모두 쓰러져 물러났다' + (lost ? ' — 금 ' + lost.gold + ' 을 흘렸다(되찾을 수 있다)' : ''));
        c.log('🏳️ 들판 전투 전멸 — 30% 로 일어났다', 'battle');
      } else if (e.t === 'kill') {
        var gold = 3 + 2 * e.tier, exp = Math.round(6 * e.tier * FOES[e.kind].exp);
        c.save.player.gold = (c.save.player.gold || 0) + gold;
        if (c.gainExp) { c.gainExp(Math.max(1, Math.round(exp / 2))); }
        for (var j = 0; j < S.party.length; j++) {
          if (S.party[j].id !== '_me' && !S.party[j].down && H && H.gainExp) { H.gainExp(S.party[j].id, exp); }
        }
        if (e.elite || e.boss) { c.save.dust = (c.save.dust || 0) + (e.boss ? 6 : 2); }
        fieldSave().kills = (fieldSave().kills || 0) + 1;
        floatNum(e.x, e.y, '+' + gold + '금', null, 0.9, false);
      } else if (e.t === 'clear') {
        var fs = fieldSave();
        fs.camps[e.camp] = Date.now();
        fs.clears = (fs.clears || 0) + 1;
        var bonus = 15 * e.tier + (e.kind === 'boss' ? 60 * e.tier : (e.kind === 'elite' ? 20 * e.tier : 0));
        c.save.player.gold = (c.save.player.gold || 0) + bonus;
        c.save.dust = (c.save.dust || 0) + (e.kind === 'boss' ? 3 : 1);
        var label = e.kind === 'boss' ? '우두머리' : (e.kind === 'elite' ? '정예 무리' : '무리');
        toast('⚔️ ' + label + ' 토벌! 금 +' + bonus + ' · 단사 +' + (e.kind === 'boss' ? 3 : 1));
        c.log('⚔️ 들판 ' + label + ' 토벌 (등급 ' + e.tier + ') — 금 +' + bonus, 'battle');
        sfx('reward');
        c.emit('field:clear', e);
        c.persist();
      }
    }
  }

  /** 입력 한 번 — 버튼·키·자동이 다 이 길로 온다 */
  function act(kind, arg) {
    if (!S || blocked()) { return { ok: false }; }
    var pos = core().save.player.pos, r;
    if (kind === 'attack') { r = attack(S, pos.x, pos.y); }
    else if (kind === 'skill') { r = skill(S, pos.x, pos.y); }
    else if (kind === 'burst') { r = burst(S, pos.x, pos.y); }
    else if (kind === 'dodge') {
      var W = global.DG.world, mv = W && W.motion ? W.motion : null;
      var moving = mv && mv.speed > 1.5;
      r = dodge(S, moving ? mv.vx : 0, moving ? mv.vy : 0, pos.x, pos.y);
    } else if (kind === 'swap') { r = swap(S, arg); }
    handle(drain(S), pos);
    return r || { ok: false };
  }

  /* ── 화면: HUD ────────────────────────────────────────── */
  function hide() {
    if (hudEl) { hudEl.classList.remove('show'); }
    if (document.body) { document.body.classList.remove('fc-on'); }
  }

  function buildHud() {
    hudEl = document.getElementById('field-hud');
    if (!hudEl) {
      hudEl = document.createElement('div');
      hudEl.id = 'field-hud';
      document.body.appendChild(hudEl);
    }
    hudEl.innerHTML =
      '<div class="fc-party"></div>' +
      '<div class="fc-acts">' +
        '<div class="fc-sta"><i></i></div>' +
        '<button class="fc-btn fc-burst" data-fc="burst"><span>폭발</span><em>Q</em><i class="fc-fill"></i></button>' +
        '<button class="fc-btn fc-skill" data-fc="skill"><span>스킬</span><em>E</em><i class="fc-cd"></i></button>' +
        '<button class="fc-btn fc-dodge" data-fc="dodge"><span>회피</span><em>␣</em></button>' +
        '<button class="fc-btn fc-atk" data-fc="attack"><span>⚔️</span><em>J</em></button>' +
      '</div>';
    var btns = hudEl.querySelectorAll('[data-fc]');
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        b.addEventListener('pointerdown', function (ev) { ev.preventDefault(); ev.stopPropagation(); act(b.getAttribute('data-fc')); });
      })(btns[i]);
    }
    numLayer = document.createElement('div');
    numLayer.className = 'fc-nums';
    hudEl.appendChild(numLayer);
    partyKeyPainted = '';
  }

  var partyKeyPainted = '';
  function paintParty() {
    var box = hudEl.querySelector('.fc-party');
    var key = S.party.map(function (m) { return m.id; }).join(',');
    if (key !== partyKeyPainted) {
      partyKeyPainted = key;
      var P3 = global.DG.portrait3d, html = '';
      for (var i = 0; i < S.party.length; i++) {
        var m = S.party[i], h = m.id === '_me' ? null : data().find(m.id);
        var face = h && P3 && P3.img ? P3.img('hero', h, 40) : '<b>' + EL[m.el].icon + '</b>';
        html += '<button class="fc-mem" data-idx="' + i + '" style="--el:' + EL[m.el].color + '">' +
          '<span class="fc-face">' + face + '</span>' +
          '<span class="fc-meta"><small>' + (i + 1) + ' · ' + EL[m.el].icon + ' ' + m.name + '</small>' +
          '<span class="fc-hp"><i></i></span><span class="fc-en"><i></i></span></span></button>';
      }
      box.innerHTML = html;
      var mb = box.querySelectorAll('.fc-mem');
      for (var j = 0; j < mb.length; j++) {
        (function (b) {
          b.addEventListener('pointerdown', function (ev) { ev.preventDefault(); ev.stopPropagation(); act('swap', +b.getAttribute('data-idx')); });
        })(mb[j]);
      }
    }
    var rows = box.querySelectorAll('.fc-mem');
    for (var k = 0; k < rows.length; k++) {
      var mm = S.party[k];
      if (!mm) { continue; }
      rows[k].classList.toggle('on', k === S.active);
      rows[k].classList.toggle('down', mm.down);
      rows[k].querySelector('.fc-hp i').style.width = Math.round(100 * mm.hp / mm.hpMax) + '%';
      rows[k].querySelector('.fc-en i').style.width = Math.round(100 * mm.energy / ENERGY_MAX()) + '%';
    }
  }

  function paint(dt) {
    var show = engaged(S) || !!nearestFoe(S, core().save.player.pos.x, core().save.player.pos.y, 22);
    if (!hudEl) { buildHud(); }
    hudEl.classList.toggle('show', show);
    document.body.classList.toggle('fc-on', show);
    paintMarks();
    tickRings(dt);
    if (!show) { return; }
    paintParty();
    var m = active(S);
    var sk = hudEl.querySelector('.fc-skill'), bu = hudEl.querySelector('.fc-burst');
    sk.style.setProperty('--el', EL[m.el].color);
    bu.style.setProperty('--el', EL[m.el].color);
    sk.querySelector('.fc-cd').style.height = Math.round(100 * m.skillCd / SKILL_CD()) + '%';
    sk.querySelector('span').textContent = m.skillCd > 0 ? m.skillCd.toFixed(1) : EL[m.el].icon + ' 스킬';
    var ready = m.energy >= ENERGY_MAX() && m.burstCd <= 0;
    bu.classList.toggle('ready', ready);
    bu.querySelector('.fc-fill').style.height = Math.round(100 * m.energy / ENERGY_MAX()) + '%';
    hudEl.querySelector('.fc-sta i').style.width = Math.round(S.stamina) + '%';
    paintBars();
  }

  /* 3D 좌표 → 화면 좌표. 3D 가 없으면 null(2D 에선 숫자를 내 머리 위에 띄운다) */
  function toScreen(x, y, up) {
    var w = W3();
    if (!w) { return null; }
    var T3 = w.three(), cam = w.camNode();
    if (!T3 || !cam) { return null; }
    var gy = w.groundY ? w.groundY(x, y) : 0;
    var v = new T3.Vector3(x, gy + (up || 2), y).project(cam);
    if (v.z > 1) { return null; }
    return { x: (v.x + 1) / 2 * global.innerWidth, y: (1 - v.y) / 2 * global.innerHeight };
  }

  function floatNum(x, y, text, el, scale, bold, mine) {
    if (!numLayer || global.DG_NO_DRAW) { return; }
    var p = toScreen(x, y, 2.4) || { x: global.innerWidth / 2 + (Math.random() - 0.5) * 60, y: global.innerHeight * 0.42 };
    var n = document.createElement('span');
    n.className = 'fc-num' + (bold ? ' big' : '') + (mine ? ' mine' : '');
    n.textContent = text;
    n.style.left = Math.round(p.x + (Math.random() - 0.5) * 24) + 'px';
    n.style.top = Math.round(p.y) + 'px';
    n.style.color = el ? EL[el].color : (mine ? '#ff8080' : '#ffe9a8');
    n.style.fontSize = Math.round(16 * (scale || 1)) + 'px';
    numLayer.appendChild(n);
    setTimeout(function () { if (n.parentNode) { n.parentNode.removeChild(n); } }, 900);
  }

  var barEls = {};
  function paintBars() {
    var seen = {}, L = living(S), pos = core().save.player.pos;
    for (var i = 0; i < L.length; i++) {
      var f = L[i];
      if (Math.hypot(f.x - pos.x, f.y - pos.y) > 30) { continue; }
      var F = FOES[f.kind];
      var p = toScreen(f.x, f.y, F.h * 1.9 + 0.4);
      if (!p) { continue; }
      var b = barEls[f.uid];
      if (!b) {
        b = barEls[f.uid] = document.createElement('div');
        b.className = 'fc-bar' + (F.boss ? ' boss' : '');
        b.innerHTML = '<small></small><span class="fc-bhp"><i></i></span><span class="fc-bsh"><i></i></span>';
        numLayer.appendChild(b);
      }
      seen[f.uid] = true;
      b.style.left = Math.round(p.x) + 'px';
      b.style.top = Math.round(p.y) + 'px';
      b.querySelector('small').textContent = (f.aura ? EL[f.aura].icon + ' ' : '') + f.name + ' Lv.' + (f.tier * 5) + (f.stun > 0 ? ' 💫' : '');
      b.querySelector('.fc-bhp i').style.width = Math.round(100 * f.hp / f.hpMax) + '%';
      var sh = b.querySelector('.fc-bsh');
      sh.style.display = f.shieldMax ? '' : 'none';
      if (f.shieldMax) {
        sh.querySelector('i').style.width = Math.round(100 * f.shield / f.shieldMax) + '%';
        sh.style.setProperty('--el', EL[f.shEl].color);
      }
    }
    for (var k in barEls) {
      if (barEls.hasOwnProperty(k) && !seen[k]) {
        if (barEls[k].parentNode) { barEls[k].parentNode.removeChild(barEls[k]); }
        delete barEls[k];
      }
    }
  }

  /* ── 화면: 3D 원(예고·광역) ─────────────────────────────── */
  function ringMesh(r, color, opacity) {
    var w = W3(), T3 = w && w.three();
    if (!T3) { return null; }
    var g = new T3.RingGeometry(Math.max(0.05, r - 0.18), r, 40);
    g.rotateX(-Math.PI / 2);
    var mat = new T3.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity, depthWrite: false, side: T3.DoubleSide });
    var mesh = new T3.Mesh(g, mat);
    mesh.renderOrder = 5;
    return mesh;
  }
  function ring(x, y, r, color, life) {
    var w = W3();
    if (!w || global.DG_NO_DRAW) { return; }
    var mesh = ringMesh(r, color, 0.9);
    if (!mesh) { return; }
    mesh.position.set(x, (w.groundY ? w.groundY(x, y) : 0) + 0.12, y);
    mesh.scale.setScalar(0.35);
    w.addFx(mesh);
    fx.rings.push({ mesh: mesh, t: 0, life: life || 0.4 });
  }
  function tickRings(dt) {
    var w = W3();
    for (var i = fx.rings.length - 1; i >= 0; i--) {
      var R = fx.rings[i];
      R.t += dt;
      var k = Math.min(1, R.t / R.life);
      R.mesh.scale.setScalar(0.35 + 0.65 * Math.sqrt(k));
      R.mesh.material.opacity = 0.9 * (1 - k);
      if (k >= 1) {
        if (w) { w.removeFx(R.mesh); }
        R.mesh.geometry.dispose(); R.mesh.material.dispose();
        fx.rings.splice(i, 1);
      }
    }
  }
  /** 적 예고 — 떨어질 자리를 붉은 원으로. 예고가 차오를수록 짙어진다 */
  function paintMarks() {
    var w = W3(), seen = {}, k;
    if (!w) { return; }
    var L = living(S);
    for (var i = 0; i < L.length; i++) {
      var f = L[i];
      if (!f.mark) { continue; }
      seen[f.uid] = true;
      var M = fx.marks[f.uid];
      if (!M) {
        M = fx.marks[f.uid] = ringMesh(f.mark.r, '#ff3b3b', 0.3);
        if (!M) { continue; }
        var T3 = w.three();
        var disk = new T3.Mesh(new T3.CircleGeometry(f.mark.r, 40).rotateX(-Math.PI / 2),
          new T3.MeshBasicMaterial({ color: '#ff3b3b', transparent: true, opacity: 0.15, depthWrite: false }));
        M.add(disk);
        M.userData.disk = disk;
        w.addFx(M);
      }
      M.position.set(f.mark.x, (w.groundY ? w.groundY(f.mark.x, f.mark.y) : 0) + 0.1, f.mark.y);
      var prog = 1 - Math.max(0, f.stT) / (f.mark.t || 1);
      M.material.opacity = 0.35 + 0.55 * prog;
      M.userData.disk.scale.setScalar(Math.max(0.05, prog));
      M.userData.disk.material.opacity = 0.18 + 0.2 * prog;
    }
    for (k in fx.marks) {
      if (fx.marks.hasOwnProperty(k) && !seen[k]) {
        var mm = fx.marks[k];
        if (mm) { w.removeFx(mm); mm.geometry.dispose(); mm.material.dispose(); }
        delete fx.marks[k];
      }
    }
  }

  /* ── 입력: 키 ─────────────────────────────────────────── */
  function bindKeys() {
    if (bound) { return; }
    bound = true;
    global.addEventListener('keydown', function (e) {
      if (!S || !on() || e.repeat) { return; }
      var tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') { return; }
      if (blocked()) { return; }
      var k = e.key.toLowerCase();
      var nearby = engaged(S) || !!nearestFoe(S, core().save.player.pos.x, core().save.player.pos.y, 22);
      if (k === 'j') { act('attack'); }
      else if (k === 'e') { act('skill'); }
      else if (k === 'q') { act('burst'); }
      else if (k === ' ' && nearby) { e.preventDefault(); act('dodge'); }
      else if (k >= '1' && k <= '4' && nearby) { act('swap', +k - 1); }
    });
  }

  /** 3D 배우 목록 — `world3d.js` 가 매 프레임 읽는다 */
  function live() {
    if (!S || !on()) { return []; }
    var out = [], D = data();
    for (var k in S.foes) {
      if (!S.foes.hasOwnProperty(k)) { continue; }
      var f = S.foes[k], F = FOES[f.kind];
      var ref = (D && D.find && D.find(F.ref)) || { id: 'fc_' + f.kind, name: F.name, kind: 'beast', rarity: 2, form: 'boar' };
      out.push({ uid: f.uid, x: f.x, y: f.y, h: F.h, ref: ref, moving: f.moving, phase: f.phase,
        dead: f.dead, deadT: f.deadT, stun: f.stun > 0, el: f.el, aura: f.aura, boss: !!F.boss });
    }
    return out;
  }

  /** 지도 위 아바타로 설 사람 — 교체하면 바뀐다(없으면 null → 동행 선두) */
  function leadId() {
    if (!S || !on()) { return null; }
    var m = active(S);
    return m && m.id !== '_me' ? m.id : null;
  }

  function init() { bindKeys(); }

  global.DG = global.DG || {};
  global.DG.fieldCombat = {
    EL: EL, FOES: FOES, THEMES: THEMES, ELITES: ELITES, CELL: CELL, ENERGY_MAX: ENERGY_MAX,
    SKILL_CD: SKILL_CD, SWAP_CD: SWAP_CD, DODGE_COST: DODGE_COST, VAPOR_MUL: VAPOR_MUL,
    /* 판정 층 — 화면 없이 굴린다(자가진단이 쓰는 문) */
    elementOf: elementOf, react: react, shieldMul: shieldMul, campAt: campAt, tierAt: tierAt,
    create: create, reparty: reparty, populate: populate, spawnCamp: spawnCamp, step: step, drain: drain,
    attack: attack, skill: skill, burst: burst, dodge: dodge, swap: swap, hitFoe: hitFoe,
    engaged: engaged, living: living, memberOf: memberOf,
    /* 런타임 */
    init: init, tick: tick, act: act, live: live, leadId: leadId,
    state: function () { return S; },
    _resetForTest: function () { S = null; partyKey = ''; popAcc = 9; }
  };
})(window);
