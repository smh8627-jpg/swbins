/**
 * 사가 엔진 — 전투 스타일 플러그인(combat). sim.js 다음에 불러야 한다. three 없이 돈다(node 진단).
 *
 * 프로젝트 `combat.style` 로 고른다(없으면 simple — sim.js 안의 "E 로 치고 닿으면 아픔"):
 *   genshin  원신식 — 파티 넷 교체(1~4) · 일반 공격 3연타(J·클릭) · 원소 스킬(E) · 원소 폭발(Q, 에너지) · 대시 회피(Shift, 스태미나)
 *            원소 반응: 증발·녹음(피해 2배) · 빙결(얼림) · 과부하(폭발) · 감전(지속 피해) · 초전도(방어 깎기) · 확산(바람이 옮김)
 *   zelda    젤다식 — 주목(Q·Tab 락온) · 방패(Shift 누르고 있기, 막 내밀면 저스트 가드 → 적 경직) · 락온 중 Space 회피
 *            (공격 직전에 피하면 저스트 회피 → 러시: 적이 멈추고 피해 2배) · 3연격 · J 모았다 떼면 회전 베기 · 하트
 *   ff       파판식 — 필드에서 전투 적에 닿으면 ATB 전투. 게이지가 차면 명령(공격·마법·방어·아이템·도망), 이기면 경험치·돈·레벨
 * 적은 `foe` 컴포넌트(sim.js COMP). 파티는 `combat.party`[{name, element, color, model, hp, mp, atk, def, mag, spd, magic}].
 *
 * 입력(play.js 가 채운다): atk(누름) atkHeld atkUp skill burst dodge block(누르고 있음) lock sw(1~4) · 파판식 메뉴 up down ok back
 */
(function (root) {
  'use strict';
  var SIM = root.SagaSim || (typeof require === 'function' ? require('./sim.js') : null);

  var ELEM = { '불': '#ff6b3d', '물': '#3da5ff', '얼음': '#a8ecff', '번개': '#c07bff', '바람': '#5ee6b0' };
  /* 원소 반응 — 두 원소를 가나다 순으로 이은 열쇠 */
  var REACT = {
    '물+불': { name: '증발', mul: 2 },
    '불+얼음': { name: '녹음', mul: 2 },
    '물+얼음': { name: '빙결', freeze: 3 },
    '번개+불': { name: '과부하', aoe: 3.2, aoeMul: 1.6, knock: 11 },
    '물+번개': { name: '감전', dot: 4, mul: 1.2 },
    '번개+얼음': { name: '초전도', shred: 6, mul: 1.2 }
  };
  function reactKey(a, b) { return [a, b].sort().join('+'); }
  /* 파판식 마법 */
  var MAGIC = {
    '파이어': { mp: 4, el: '불', pow: 2.4 }, '블리자드': { mp: 4, el: '얼음', pow: 2.4 }, '선더': { mp: 4, el: '번개', pow: 2.4 },
    '워터': { mp: 4, el: '물', pow: 2.4 }, '에어로': { mp: 4, el: '바람', pow: 2.4 },
    '케알': { mp: 5, heal: 2.2 }, '케알라': { mp: 12, heal: 1.6, all: true }
  };
  var WEAK = { '불': '얼음', '얼음': '불', '물': '번개', '번개': '물' };

  var DEF_PARTY = {
    genshin: [{ name: '여행자', element: '바람', color: '#f4d35e', hp: 120, atk: 20, def: 3 }],
    ff: [{ name: '용사', color: '#3b82f6', hp: 90, mp: 20, atk: 12, def: 4, mag: 8, spd: 10, magic: '파이어,케알' }]
  };

  function num(v, d) { v = +v; return isFinite(v) ? v : d; }
  function ang(x, z) { return Math.atan2(x, z) * 180 / Math.PI; }
  function angDiff(a, b) { return Math.abs(((a - b + 540) % 360) - 180); }

  function member(m, i) {
    m = m || {};
    var hp = num(m.hp, 100);
    return { i: i, name: m.name || ('동료' + (i + 1)), element: m.element || '', color: m.color || '#cccccc', model: m.model || '',
             maxhp: hp, hp: hp, maxmp: num(m.mp, 0), mp: num(m.mp, 0), atk: num(m.atk, 15), def: num(m.def, 2), mag: num(m.mag, 8), spd: num(m.spd, 10),
             magic: String(m.magic || '').split(/[,\s]+/).filter(function (x) { return MAGIC[x]; }), lv: 1, exp: 0, energy: 0, skillCd: 0 };
  }
  function lookOf(m) { return m.model ? { shape: 'model', model: m.model, dy: m.dy || 0 } : { shape: 'capsule', color: m.color }; }

  /* 적 데이터 — 전투 적(foe) 이 아니어도 체력(health) 컴포넌트가 있으면 맞는다(생각은 안 한다) */
  function foeDef(e) { return e.comps.foe || { hp: num(e.comps.health && e.comps.health.hp, 3), def: 0, exp: 0, gold: 0 }; }
  /* 적 상태(처음 볼 때 채운다) */
  function initFoe(e) {
    if (e.cb) { return e.cb; }
    var f = foeDef(e);
    e.cb = { st: 'idle', t: 0, cool: 0.6, max: num(f.hp, 60), stun: 0, freeze: 0, shred: 0, dot: 0, dotDmg: 0, dotTick: 0, slow: 0,
             aura: f.element ? { el: f.element, t: 999 } : null, wind: 0,
             shield: num(f.shield, 0), shieldMax: num(f.shield, 0), poise: 0, seen: 0, enraged: false };
    e.hp = e.cb.max;
    return e.cb;
  }
  /* 노획물 등급 색(saga-godot 노획물 등급색 외곽선) */
  var GRADE = { '보통': '#e8e8e8', '마법': '#5b9cff', '희귀': '#ffd166', '영웅': '#c77dff', '전설': '#ff8c42' };
  /* 스킬 갈래(saga-godot DUNGEON·STORY 무예 아홉 모양) */
  var SKILL = {
    bolt: '기탄(앞으로 날아가는 탄)', nova: '파동(둘레 폭발)', whirl: '회오리(도는 베기 3번)', dash: '돌진(앞으로 달려가며 벤다)',
    heal: '치유(체력 회복)', buff: '기합(8초 공격 1.5배)', chain: '연쇄(번개처럼 셋까지 튄다)', curse: '저주(둘레 적 느려지고 지속 피해)',
    summon: '소환(10초 동안 싸우는 정령)'
  };

  /* ════════════════════════════════════════════════════════════════════════
     액션 공통(원신식·젤다식)
     ════════════════════════════════════════════════════════════════════════ */
  function makeAction(K, cfg, kind) {
    var S = K.S;
    var hpVar = cfg.hpVar || 'hp';
    var pc;

    var mpVar = cfg.mpVar || 'mp', potVar = cfg.potionVar || 'potion';
    var skills = (cfg.skills || []).slice(0, 4).map(function (s, i) { return Object.assign({ key: 'ZXCV'[i], kind: 'bolt', name: '', power: 2, cd: 4, mp: 0, element: '', r: 4 }, s); });

    function reset() {
      var list = (cfg.party && cfg.party.length ? cfg.party : (DEF_PARTY[kind] || [{}]));
      pc = S.cb = { kind: kind, combo: 0, comboT: 0, atkT: 0, charge: 0, dodgeT: 0, dodgeV: [0, 0], iT: 0, perfectT: 0,
                    blockT: -1, lock: null, flurryT: 0, active: 0, swCd: 0, buffT: 0,
                    skills: skills.map(function (s) { return { def: s, cd: 0 }; }),
                    party: kind === 'genshin' ? list.slice(0, 4).map(member) : [], atk: num(cfg.atk, kind === 'genshin' ? 20 : 1) };
      S.shots = []; S.allies = [];
      if (kind === 'genshin') { mirrorHp(); }
    }
    function enter() {
      pc.lock = null; pc.flurryT = 0; pc.dodgeT = 0; pc.atkT = 0;
      S.shots = []; S.allies = [];
      if (kind === 'genshin') { applyLook(); }
    }
    function cur() { return pc.party[pc.active]; }
    function applyLook() { if (S.player && cur()) { S.player.lookOv = lookOf(cur()); } }
    function mirrorHp() { if (cur()) { S.vars[hpVar] = Math.max(0, Math.round(cur().hp)); } }
    function foes() { return S.ents.filter(function (e) { return e.alive && !e.hidden && (e.comps.foe || e.comps.health); }); }
    function atkPow() { return (kind === 'genshin' ? cur().atk : pc.atk) * (S.mods.atk || 1) * (pc.buffT > 0 ? 1.5 : 1); }
    function curEl() { return kind === 'genshin' && cur() ? cur().element || '' : ''; }
    function healPlayer(n) {
      if (kind === 'genshin') { var m = cur(); m.hp = Math.min(m.maxhp, m.hp + n); mirrorHp(); } else {
        var cap = cfg.hpMax != null ? num(cfg.hpMax, 99) : Infinity;
        S.vars[hpVar] = Math.min(cap, num(S.vars[hpVar], 0) + n);
      }
      if (S.player) { K.fx({ type: 'dmg', at: [S.player.p[0], S.player.p[1] + 2.1, S.player.p[2]], n: '+' + n, color: '#52d39a' }); }
    }

    /* 입력 방향 → 세계 방향(sim 의 걷기와 같은 식) */
    function worldDir(inp) {
      var mx = num(inp.mx, 0), mz = num(inp.mz, 0), yaw = num(inp.yaw, 0);
      var wx = Math.cos(yaw) * mx - Math.sin(yaw) * mz, wz = -Math.sin(yaw) * mx - Math.cos(yaw) * mz;
      var m = Math.hypot(wx, wz);
      return m > 0.1 ? [wx / m, wz / m] : null;
    }

    function killFoe(e) {
      var f = foeDef(e);
      K.destroy(e);
      K.fx({ type: 'poof', at: e.p.slice() });
      var ex = Math.round(num(f.exp, 0) * (S.mods.exp || 1) * (S.weatherExp || 1)), go = Math.round(num(f.gold, 0) * (S.mods.gold || 1));
      if (ex && (cfg.expVar || 'exp' in S.vars)) { K.addVar(cfg.expVar || 'exp', ex); }
      if (go && (cfg.goldVar || 'gold' in S.vars)) { K.addVar(cfg.goldVar || 'gold', go); }
      if (pc.lock === e) { pc.lock = null; }
      /* 노획물 — 줄마다 "이름|확률(0~1)|변수|양|등급" */
      (f.drops || []).forEach(function (l, i) {
        var p = String(l || '').split('|').map(function (x) { return x.trim(); });
        if (!p[0] || K.rng() >= num(p[1], 0.5)) { return; }
        var gc = GRADE[p[4]] || GRADE['보통'];
        var a = i * 2.1;
        K.spawnDef({ id: 'loot', name: p[0], look: { shape: 'sphere', color: gc, glow: true, label: p[0] }, scale: [0.45, 0.45, 0.45],
          body: { type: 'trigger', size: [2.6, 3, 2.6], off: [0, -0.5, 0] }, comps: { bob: { amp: 0.15, speed: 3 }, spin: { speed: 120 }, pickup: { var: p[2] || p[0], add: num(p[3], 1), sound: 'coin' } } },
          [e.p[0] + Math.cos(a) * 0.8, e.p[1] + 0.3, e.p[2] + Math.sin(a) * 0.8]);
        if (p[4] === '전설' || p[4] === '영웅') { K.fx({ type: 'pop', text: p[4] + ' 노획물: ' + p[0], color: gc }); }
      });
    }

    /* 적에게 피해 — el 이 있으면 원소를 붙이고 반응을 본다 */
    function damageFoe(e, base, opt) {
      opt = opt || {};
      var c = initFoe(e), f = foeDef(e), mul = 1, text = '', col = opt.el ? ELEM[opt.el] : '#ffffff';
      if (c.stun > 0 || pc.flurryT > 0) { mul *= 2; text = '치명!'; col = '#ffd166'; }
      if (c.shred > 0) { mul *= 1.3; }
      var extra = null;
      if (opt.el) {
        if (c.aura && c.aura.el !== opt.el) {
          if (opt.el === '바람' || c.aura.el === '바람') {
            var carried = opt.el === '바람' ? c.aura.el : opt.el;
            if (carried !== '바람') { extra = { name: '확산', spread: 4, el: carried, aoeMul: 0.6 }; }
          } else { extra = REACT[reactKey(c.aura.el, opt.el)] || null; }
          if (extra) { c.aura = null; text = extra.name; col = '#ffffff'; }
          else { c.aura = { el: opt.el, t: 8 }; }
        } else if (opt.el !== '바람') { c.aura = { el: opt.el, t: 8 }; }
      }
      if (extra && extra.mul) { mul *= extra.mul; }
      if (opt.el) { K.emit('element', { at: e.p.slice(), r: 1.5, el: opt.el }); }
      var dmg = Math.max(1, Math.round(base * mul - num(f.def, 0)));
      /* 원소 방패(saga-godot 원소 쓰는 적) — 방패가 먼저 받는다. 원소 공격은 2.5배, 맨 공격은 0.3배로 깎는다 */
      if (c.shield > 0) {
        var sd = Math.max(1, Math.round(dmg * (opt.el ? 2.5 : 0.3)));
        c.shield -= sd;
        K.fx({ type: 'dmg', at: [e.p[0], e.p[1] + 2.4, e.p[2]], n: sd, color: '#a8c8ff', text: c.shield <= 0 ? '방패 깨짐!' : '방패' });
        if (c.shield <= 0) { c.shield = 0; c.stun = 1.5; c.st = 'idle'; K.fx({ type: 'sound', name: 'door' }); }
        e.hitT = 0.15;
        return sd;
      }
      e.hp -= dmg; e.hitT = 0.2;
      K.fx({ type: 'dmg', at: [e.p[0], e.p[1] + 2.1, e.p[2]], n: dmg, color: col, text: text, hitstop: opt.heavy ? 0.12 : 0.07, id: e.id });
      /* 기세(poise) — 쌓인 피해가 문턱을 넘으면 잠깐 휘청인다(saga-godot 기세 문턱 스태거) */
      if (num(f.poise, 0) > 0) {
        c.poise += dmg;
        if (c.poise >= num(f.poise, 0)) { c.poise = 0; c.stun = Math.max(c.stun, 1.2); c.st = 'idle'; K.fx({ type: 'pop', text: '휘청!', color: '#ffd166' }); }
      }
      if (extra) {
        K.fx({ type: 'sound', name: 'door' });
        if (extra.freeze) { c.freeze = extra.freeze; c.st = 'idle'; }
        if (extra.shred) { c.shred = extra.shred; }
        if (extra.dot) { c.dot = extra.dot; c.dotDmg = Math.max(1, Math.round(base * 0.25)); c.dotTick = 1; }
        if (extra.aoe || extra.spread) {
          var r = extra.aoe || extra.spread;
          K.fx({ type: 'burst', at: e.p.slice(), r: r, color: extra.el ? ELEM[extra.el] : '#ff9f43' });
          foes().forEach(function (o) {
            if (o === e || Math.hypot(o.p[0] - e.p[0], o.p[2] - e.p[2]) > r) { return; }
            damageFoe(o, base * extra.aoeMul, { el: extra.el || null, knock: extra.knock || 4, from: e.p });
          });
        }
      }
      /* 밀기 — 무거운 타격·경직 중엔 공격 예고도 끊는다 */
      var from = opt.from || (S.player ? S.player.p : e.p);
      var kx = e.p[0] - from[0], kz = e.p[2] - from[2], kd = Math.hypot(kx, kz) || 1, kn = opt.knock != null ? opt.knock : 3;
      if (!c.freeze) { e.v[0] = kx / kd * kn; e.v[2] = kz / kd * kn; e.kb = 0.18; }
      if (opt.heavy && c.st === 'wind') { c.st = 'recover'; c.t = 0.5; }
      if (e.hp <= 0) { killFoe(e); }
      return dmg;
    }

    /* 부채꼴 안의 적 */
    function hitArc(range, arc, fn) {
      var pl = S.player, yaw = pl.r[1], n = 0;
      foes().forEach(function (e) {
        var dx = e.p[0] - pl.p[0], dz = e.p[2] - pl.p[2], d = Math.hypot(dx, dz);
        if (d > range + 0.5 || Math.abs(e.p[1] - pl.p[1]) > 2.5) { return; }
        if (arc < 360 && d > 0.4 && angDiff(ang(dx, dz), yaw) > arc / 2) { return; }
        fn(e); n++;
      });
      return n;
    }

    function combo() {
      pc.combo = pc.comboT > 0 ? (pc.combo + 1) % 3 : 0;
      pc.comboT = 0.75; pc.atkT = pc.combo === 2 ? 0.42 : 0.3;
      var pl = S.player, y = pl.r[1] * Math.PI / 180;
      pl.v[0] += Math.sin(y) * 3; pl.v[2] += Math.cos(y) * 3;
      pl.act = 0.25;
      K.fx({ type: 'swing', combo: pc.combo });
      K.emit('swing', { at: [pl.p[0] + Math.sin(y) * 1.2, pl.p[1], pl.p[2] + Math.cos(y) * 1.2] });
      var mul = [1, 1.1, 1.7][pc.combo];
      var hits = hitArc(2.2, 120, function (e) { damageFoe(e, atkPow() * mul, { heavy: pc.combo === 2, knock: pc.combo === 2 ? 6 : 2.5 }); });
      if (hits) { K.fx({ type: 'sound', name: 'hit' }); if (kind === 'genshin') { cur().energy = Math.min(60, cur().energy + 1); } }
    }

    function hitPlayer(e, raw) {
      var pl = S.player, f = foeDef(e);
      if (!pl || !pl.alive || S.over) { return; }
      if (pc.iT > 0) {
        if (pc.perfectT > 0 && kind === 'zelda') {
          pc.flurryT = 2.2;
          K.fx({ type: 'pop', text: '저스트 회피! 러시!', color: '#7bdff2' }); K.fx({ type: 'sound', name: 'win' });
        } else if (pc.perfectT > 0) { K.fx({ type: 'pop', text: '회피!', color: '#7bdff2' }); }
        return;
      }
      if (kind === 'zelda' && pc.blockT >= 0 && angDiff(ang(e.p[0] - pl.p[0], e.p[2] - pl.p[2]), pl.r[1]) < 80) {
        if (pc.blockT < 0.3) {
          if (e.cb) { e.cb.stun = 2.2; e.cb.st = 'idle'; }
          K.fx({ type: 'pop', text: '저스트 가드!', color: '#ffd166' }); K.fx({ type: 'sound', name: 'coin' }); K.fx({ type: 'shake', sec: 0.15, power: 0.2 });
        } else {
          K.fx({ type: 'sound', name: 'blip' });
          var bx = pl.p[0] - e.p[0], bz = pl.p[2] - e.p[2], bd = Math.hypot(bx, bz) || 1;
          pl.v[0] = bx / bd * 4; pl.v[2] = bz / bd * 4;
        }
        return;
      }
      var dmg = (raw != null ? raw : num(f.atk, 1)) * (e.cb && e.cb.enraged ? 1.5 : 1) * (S.mods.dmgTaken || 1);
      dmg = kind === 'genshin' ? Math.max(1, Math.round(dmg)) : Math.max(1, Math.round(dmg));
      if (kind === 'genshin') {
        var m = cur();
        m.hp -= Math.max(1, dmg - m.def);
        if (m.hp <= 0) {
          m.hp = 0;
          var next = pc.party.filter(function (x) { return x.hp > 0; })[0];
          if (next) { pc.active = next.i; applyLook(); K.fx({ type: 'pop', text: m.name + ' 쓰러짐 — ' + next.name + ' 교체', color: '#ff6b6b' }); } else { S.over = { win: false, text: '파티가 모두 쓰러졌다' }; K.fx({ type: 'sound', name: 'lose' }); }
        }
        mirrorHp();
      } else {
        K.addVar(hpVar, -dmg);
        if (num(S.vars[hpVar], 0) <= 0 && !S.over) { S.over = { win: false, text: '쓰러졌다…' }; K.fx({ type: 'sound', name: 'lose' }); }
      }
      pc.iT = 0.7; pl.inv = 0.7;
      var kx = pl.p[0] - e.p[0], kz = pl.p[2] - e.p[2], kd = Math.hypot(kx, kz) || 1;
      pl.v[0] = kx / kd * 7; pl.v[2] = kz / kd * 7; pl.v[1] = 4; pl.ground = false;
      K.fx({ type: 'sound', name: 'hit' }); K.fx({ type: 'shake', sec: 0.2, power: 0.3 });
      K.fx({ type: 'dmg', at: [pl.p[0], pl.p[1] + 2.1, pl.p[2]], n: dmg, color: '#ff6b6b' });
    }

    /* 적 생각 — 쫓기 → 공격 예고 → 치기 → 쉬기 */
    function foeAI(e, dt) {
      var c = initFoe(e), f = e.comps.foe, pl = S.player;
      if (c.stun > 0) { c.stun -= dt; }
      if (c.freeze > 0) { c.freeze -= dt; }
      if (c.shred > 0) { c.shred -= dt; }
      if (c.aura && c.aura.t < 999) { c.aura.t -= dt; if (c.aura.t <= 0) { c.aura = null; } }
      if (c.dot > 0) {
        c.dot -= dt; c.dotTick -= dt;
        if (c.dotTick <= 0) { c.dotTick = 1; e.hp -= c.dotDmg; K.fx({ type: 'dmg', at: [e.p[0], e.p[1] + 2.1, e.p[2]], n: c.dotDmg, color: ELEM['번개'] }); if (e.hp <= 0) { killFoe(e); return; } }
      }
      if (c.slow > 0) { c.slow -= dt; }
      c.wind = 0;
      var still = c.stun > 0 || c.freeze > 0 || pc.flurryT > 0 || e.kb > 0;
      if (still || !pl || !pl.alive) { if (e.body.type === 'dynamic' && !e.kb) { e.v[0] *= 0.7; e.v[2] *= 0.7; } e.spd = 0; return; }
      var dx = pl.p[0] - e.p[0], dz = pl.p[2] - e.p[2], d = Math.hypot(dx, dz), range = num(f.range, 1.8);
      if (c.cool > 0) { c.cool -= dt; }
      /* 알아챈 뒤 시간 — 광폭(enrage)·도망(flee, 월드 보스처럼 제한 시간 안에 못 잡으면 사라진다) */
      if (d < num(f.aggro, 9) || c.seen > 0) {
        c.seen += dt;
        if (num(f.enrage, 0) > 0 && !c.enraged && c.seen >= num(f.enrage, 0)) { c.enraged = true; K.fx({ type: 'pop', text: (e.name || '적') + ' 광폭!', color: '#ff4d4d' }); K.fx({ type: 'sound', name: 'door' }); }
        if (num(f.flee, 0) > 0 && c.seen >= num(f.flee, 0)) { K.fx({ type: 'pop', text: (e.name || '적') + ' 이(가) 달아났다', color: '#aaaaaa' }); K.fx({ type: 'poof', at: e.p.slice() }); e.alive = false; if (pc.lock === e) { pc.lock = null; } return; }
      }
      var spMul = (c.enraged ? 1.3 : 1) * (c.slow > 0 ? 0.5 : 1);
      /* 원거리 적 — 예고 뒤 탄을 쏜다 */
      if (f.ranged) {
        if (c.st === 'wind') {
          c.t -= dt; c.wind = 1 - c.t / Math.max(0.1, num(f.windup, 0.7)); e.r[1] = ang(dx, dz);
          if (e.body.type === 'dynamic') { e.v[0] = 0; e.v[2] = 0; }
          if (c.t <= 0) { c.st = 'idle'; c.cool = num(f.cool, 1.6); shoot('f', e.p, [dx / d, 0, dz / d], num(f.atk, 1), '', e); }
          return;
        }
        if (d < num(f.aggro, 9)) {
          e.r[1] = ang(dx, dz);
          var want = Math.max(range, 5);
          if (c.cool <= 0 && d <= want + 3) { c.st = 'wind'; c.t = num(f.windup, 0.7); return; }
          var rs = d > want ? num(f.move, 2.6) * spMul : d < want - 2 ? -num(f.move, 2.6) * 0.6 : 0;
          if (e.body.type === 'dynamic') { e.v[0] = dx / d * rs; e.v[2] = dz / d * rs; } else { e.p[0] += dx / d * rs * dt; e.p[2] += dz / d * rs * dt; e.spd = Math.abs(rs); }
        }
        return;
      }
      if (c.st === 'wind') {
        c.t -= dt; c.wind = 1 - c.t / Math.max(0.1, num(f.windup, 0.7));
        e.r[1] = ang(dx, dz);
        if (e.body.type === 'dynamic') { e.v[0] = 0; e.v[2] = 0; }
        if (c.t <= 0) {
          c.st = 'recover'; c.t = 0.45; c.cool = num(f.cool, 1.6);
          K.fx({ type: 'strike', at: e.p.slice(), yaw: e.r[1], r: range });
          if (d <= range + 0.7 && angDiff(ang(dx, dz), e.r[1]) < 70 && Math.abs(pl.p[1] - e.p[1]) < 2) { hitPlayer(e); }
        }
        return;
      }
      if (c.st === 'recover') { c.t -= dt; if (c.t <= 0) { c.st = 'idle'; } e.spd = 0; if (e.body.type === 'dynamic') { e.v[0] *= 0.8; e.v[2] *= 0.8; } return; }
      if (d < num(f.aggro, 9)) {
        e.r[1] = ang(dx, dz);
        if (d <= range + 0.2 && c.cool <= 0) { c.st = 'wind'; c.t = num(f.windup, 0.7); return; }
        var sp = d > range * 0.85 ? num(f.move, 2.6) * spMul : 0;
        if (e.body.type === 'dynamic') { e.v[0] = dx / d * sp; e.v[2] = dz / d * sp; } else { e.p[0] += dx / d * sp * dt; e.p[2] += dz / d * sp * dt; e.spd = sp; }
      } else if (e.body.type === 'dynamic') { e.v[0] *= 0.8; e.v[2] *= 0.8; }
    }

    /* ── 탄(기탄·적 원거리) ────────────────────────────────────────────── */
    function shoot(side, from, dir, dmg, el, owner) {
      S.shots.push({ side: side, p: [from[0] + dir[0] * 0.8, from[1] + 1.1, from[2] + dir[2] * 0.8], v: [dir[0] * 16, 0, dir[2] * 16], t: 1.1, dmg: dmg, el: el || '', owner: owner || null });
      K.fx({ type: 'sound', name: 'blip' });
    }
    function stepShots(dt) {
      var pl = S.player;
      S.shots = S.shots.filter(function (s) {
        s.t -= dt;
        if (s.t <= 0) { return false; }
        s.p[0] += s.v[0] * dt; s.p[1] += s.v[1] * dt; s.p[2] += s.v[2] * dt;
        if (s.side === 'p') {
          var hit = foes().filter(function (e) { return Math.hypot(e.p[0] - s.p[0], e.p[2] - s.p[2]) < 0.9 && s.p[1] > e.p[1] - 0.2 && s.p[1] < e.p[1] + e.body.size[1] * e.s[1] + 0.3; })[0];
          if (hit) { damageFoe(hit, s.dmg, { el: s.el || null, knock: 3, from: [s.p[0] - s.v[0], 0, s.p[2] - s.v[2]] }); K.fx({ type: 'burst', at: s.p.slice(), r: 0.8, color: s.el ? ELEM[s.el] : '#ffffff' }); return false; }
        } else if (pl && pl.alive && Math.hypot(pl.p[0] - s.p[0], pl.p[2] - s.p[2]) < 0.7 && s.p[1] > pl.p[1] - 0.2 && s.p[1] < pl.p[1] + 2) {
          hitPlayer(s.owner && s.owner.alive ? s.owner : { p: [s.p[0] - s.v[0], s.p[1], s.p[2] - s.v[2]], comps: { foe: { atk: s.dmg } }, cb: null }, s.dmg);
          return false;
        }
        return true;
      });
    }
    /* 소환 정령 — 가까운 적에게 날아가 친다 */
    function stepAllies(dt) {
      var pl = S.player;
      S.allies = S.allies.filter(function (a) {
        a.t -= dt; a.cool -= dt;
        if (a.t <= 0 || !pl) { return false; }
        var best = null, bd = 12;
        foes().forEach(function (e) { var d = Math.hypot(e.p[0] - a.p[0], e.p[2] - a.p[2]); if (d < bd) { bd = d; best = e; } });
        var tx = best ? best.p[0] : pl.p[0] + 1.2, tz = best ? best.p[2] : pl.p[2] + 1.2, ty = (best ? best.p[1] : pl.p[1]) + 1.4;
        var dx = tx - a.p[0], dz = tz - a.p[2], d = Math.hypot(dx, dz);
        if (d > (best ? 1.2 : 0.5)) { var sp = Math.min(8, d * 4); a.p[0] += dx / d * sp * dt; a.p[2] += dz / d * sp * dt; }
        a.p[1] += (ty - a.p[1]) * Math.min(1, 5 * dt);
        if (best && d < 1.6 && a.cool <= 0) { a.cool = 0.8; damageFoe(best, a.dmg, { el: a.el || null, knock: 2, from: a.p }); }
        return true;
      });
    }

    /* ── 필드 걸음마다 ───────────────────────────────────────────────── */
    function step(dt) {
      if (pc.flurryT > 0) { pc.flurryT -= dt; }
      if (pc.buffT > 0) { pc.buffT -= dt; }
      pc.skills.forEach(function (s) { if (s.cd > 0) { s.cd -= dt; } });
      if (skills.length && S.vars[mpVar] != null) {
        var mpMax = num(cfg.mpMax, 50);
        S.vars[mpVar] = Math.min(mpMax, num(S.vars[mpVar], 0) + num(cfg.mpRegen, 2) * dt);
      }
      foes().forEach(function (e) { if (e.comps.foe) { foeAI(e, dt); } else { initFoe(e); } });
      stepShots(dt);
      stepAllies(dt);
      if (pc.lock && (!pc.lock.alive || pc.lock.hidden || !S.player || Math.hypot(pc.lock.p[0] - S.player.p[0], pc.lock.p[2] - S.player.p[2]) > 20)) { pc.lock = null; }
      return false;
    }

    /* ── 스킬(무예) — Z X C V ─────────────────────────────────────────── */
    function useSkill(i, pl) {
      var s = pc.skills[i];
      if (!s || s.cd > 0 || pc.atkT > 0.1) { return; }
      var d = s.def, cost = num(d.mp, 0);
      if (cost > 0) { if (num(S.vars[mpVar], 0) < cost) { K.fx({ type: 'pop', text: 'MP 가 모자라다', color: '#7bb4ff' }); return; } S.vars[mpVar] = num(S.vars[mpVar], 0) - cost; }
      s.cd = num(d.cd, 4);
      var pw = num(d.power, 2), el = d.element || curEl(), r = num(d.r, 4), y = pl.r[1] * Math.PI / 180, fwd = [Math.sin(y), 0, Math.cos(y)];
      var dmg = atkPow() * pw;
      pc.atkT = 0.3; pl.act = 0.3;
      K.fx({ type: 'pop', text: d.name || SKILL[d.kind].split('(')[0], color: el ? ELEM[el] : '#ffffff' });
      switch (d.kind) {
        case 'bolt': shoot('p', pl.p, fwd, dmg, el); break;
        case 'nova':
          K.fx({ type: 'burst', at: pl.p.slice(), r: r, color: el ? ELEM[el] : '#ffffff' }); K.fx({ type: 'shake', sec: 0.2, power: 0.25 });
          if (el) { K.emit('element', { at: pl.p.slice(), r: r, el: el }); }
          hitArc(r, 360, function (e) { damageFoe(e, dmg, { el: el || null, heavy: true, knock: 7 }); }); break;
        case 'whirl':
          pc.whirl = 3; pc.whirlT = 0; pc.whirlDmg = dmg * 0.5; pc.whirlEl = el; break;
        case 'dash':
          pc.dodgeT = 0.3; pc.iT = 0.3; pc.dodgeV = [fwd[0] * 20, fwd[2] * 20];
          pc.dashHit = { dmg: dmg, el: el, hit: [] };
          K.fx({ type: 'dash' }); break;
        case 'heal': healPlayer(Math.max(1, Math.round(pw))); K.fx({ type: 'burst', at: pl.p.slice(), r: 1.6, color: '#52d39a' }); K.fx({ type: 'sound', name: 'coin' }); break;
        case 'buff': pc.buffT = 8; K.fx({ type: 'burst', at: pl.p.slice(), r: 1.8, color: '#ffb84d' }); K.fx({ type: 'sound', name: 'door' }); break;
        case 'chain': {
          var hit = [], from = pl.p, left = 3, cd = dmg;
          while (left-- > 0) {
            var best = null, bd = hit.length ? 5 : Math.max(r, 7);
            foes().forEach(function (e) { if (hit.indexOf(e) >= 0) { return; } var dd = Math.hypot(e.p[0] - from[0], e.p[2] - from[2]); if (dd < bd) { bd = dd; best = e; } });
            if (!best) { break; }
            hit.push(best);
            K.fx({ type: 'beam', from: from.slice(), to: best.p.slice(), color: el ? ELEM[el] : '#c07bff' });
            damageFoe(best, cd, { el: el || '번개', knock: 2, from: from });
            from = best.p; cd *= 0.8;
          }
          break;
        }
        case 'curse':
          K.fx({ type: 'burst', at: pl.p.slice(), r: r, color: '#7a3cff' });
          hitArc(r, 360, function (e) { var c = initFoe(e); c.slow = 5; c.dot = 5; c.dotDmg = Math.max(1, Math.round(dmg * 0.2)); c.dotTick = 1; }); break;
        case 'summon':
          S.allies.push({ p: [pl.p[0] + 1, pl.p[1] + 1.4, pl.p[2]], t: 10, cool: 0.4, dmg: dmg * 0.4, el: el });
          K.fx({ type: 'burst', at: pl.p.slice(), r: 1.4, color: el ? ELEM[el] : '#9be15d' }); break;
      }
      if (d.kind !== 'bolt') { K.fx({ type: 'sound', name: 'hit' }); }
    }
    function usePotion() {
      if (num(S.vars[potVar], 0) <= 0) { K.fx({ type: 'pop', text: '포션이 없다', color: '#aaaaaa' }); return; }
      K.addVar(potVar, -1);
      healPlayer(num(cfg.potionHeal, kind === 'genshin' ? 50 : 3));
      K.fx({ type: 'sound', name: 'coin' });
    }

    function control(pl, inp, dt, mod) {
      /* 시간 */
      ['atkT', 'comboT', 'dodgeT', 'iT', 'perfectT', 'swCd'].forEach(function (k) { if (pc[k] > 0) { pc[k] -= dt; } });
      if (kind === 'genshin') { pc.party.forEach(function (m) { if (m.skillCd > 0) { m.skillCd -= dt; } }); }
      var dir = worldDir(inp);
      /* 회오리 — 0.25초마다 한 번씩 세 번 */
      if (pc.whirl > 0) {
        pc.whirlT -= dt;
        if (pc.whirlT <= 0) { pc.whirl--; pc.whirlT = 0.25; K.fx({ type: 'spin' }); hitArc(2.8, 360, function (e) { damageFoe(e, pc.whirlDmg, { el: pc.whirlEl || null, knock: 3 }); }); }
        mod.speed = 0.5;
      }
      /* 회피·돌진 중 — 정해진 방향으로 미끄러진다(돌진은 지나가며 벤다) */
      if (pc.dodgeT > 0) {
        pl.v[0] = pc.dodgeV[0]; pl.v[2] = pc.dodgeV[1];
        if (pc.dashHit) {
          hitArc(1.6, 360, function (e) { if (pc.dashHit.hit.indexOf(e) < 0) { pc.dashHit.hit.push(e); damageFoe(e, pc.dashHit.dmg, { el: pc.dashHit.el || null, heavy: true, knock: 6 }); } });
          if (pc.dodgeT - dt <= 0) { pc.dashHit = null; }
        }
        mod.skip = true; return;
      }
      if (inp.potion) { usePotion(); }
      if (inp.sk) { useSkill(inp.sk - 1, pl); }
      if (kind === 'zelda') {
        if (inp.lock) {
          if (pc.lock) { pc.lock = null; } else {
            var best = null, bs = 1e9;
            foes().forEach(function (e) {
              var dx = e.p[0] - pl.p[0], dz = e.p[2] - pl.p[2], d = Math.hypot(dx, dz);
              if (d > 15) { return; }
              var sc = d + angDiff(ang(dx, dz), pl.r[1]) / 30;
              if (sc < bs) { bs = sc; best = e; }
            });
            pc.lock = best;
            if (best) { K.fx({ type: 'sound', name: 'blip' }); }
          }
        }
        if (pc.lock) { mod.face = ang(pc.lock.p[0] - pl.p[0], pc.lock.p[2] - pl.p[2]); }
        if (inp.block) { pc.blockT = pc.blockT < 0 ? 0 : pc.blockT + dt; mod.speed = 0.4; mod.jump = false; } else { pc.blockT = -1; }
        if (pc.lock && inp.jump && pl.ground && pc.blockT < 0) {
          var dd = dir || [-Math.sin(pl.r[1] * Math.PI / 180), -Math.cos(pl.r[1] * Math.PI / 180)];
          pc.dodgeT = 0.34; pc.iT = 0.34; pc.perfectT = 0.22; pc.dodgeV = [dd[0] * 11, dd[1] * 11];
          pl.v[1] = 3.5; pl.ground = false; mod.jump = false; mod.skip = true;
          K.fx({ type: 'sound', name: 'jump' });
          return;
        }
        /* 모으기 → 회전 베기 */
        if (inp.atkHeld && pc.atkT <= 0) { pc.charge += dt; } else if (!inp.atkHeld) {
          if (pc.charge >= 0.8) {
            pc.atkT = 0.5; pl.act = 0.4;
            K.fx({ type: 'spin' }); K.fx({ type: 'sound', name: 'hit' });
            hitArc(2.9, 360, function (e) { damageFoe(e, pc.atk * 2.5, { heavy: true, knock: 8 }); });
          }
          pc.charge = 0;
        }
      }
      if (kind === 'genshin') {
        if (inp.dodge && S.stamina.v >= 20 && !S.stamina.tired && pl.ground) {
          var gd = dir || [Math.sin(pl.r[1] * Math.PI / 180), Math.cos(pl.r[1] * Math.PI / 180)];
          pc.dodgeT = 0.28; pc.iT = 0.3; pc.perfectT = 0.2; pc.dodgeV = [gd[0] * 14, gd[1] * 14];
          K.stamUse(20);
          pl.r[1] = ang(gd[0], gd[1]);
          K.fx({ type: 'dash' });
          mod.skip = true; return;
        }
        if (inp.sw && pc.swCd <= 0 && pc.party[inp.sw - 1] && inp.sw - 1 !== pc.active) {
          var nm = pc.party[inp.sw - 1];
          if (nm.hp > 0) { pc.active = nm.i; pc.swCd = 1; applyLook(); mirrorHp(); K.fx({ type: 'pop', text: nm.name, color: ELEM[nm.element] || '#fff' }); K.fx({ type: 'sound', name: 'blip' }); }
        }
        var m = cur();
        if (inp.skill && m.skillCd <= 0 && pc.atkT <= 0.1) {
          m.skillCd = num(cfg.skillCd, 6); pc.atkT = 0.4; pl.act = 0.35;
          var y = pl.r[1] * Math.PI / 180, cx = pl.p[0] + Math.sin(y) * 2, cz = pl.p[2] + Math.cos(y) * 2;
          K.fx({ type: 'burst', at: [cx, pl.p[1], cz], r: 3.2, color: ELEM[m.element] || '#fff' }); K.fx({ type: 'sound', name: 'door' });
          if (m.element) { K.emit('element', { at: [cx, pl.p[1], cz], r: 3.4, el: m.element }); }
          var n = 0;
          foes().forEach(function (e) {
            if (Math.hypot(e.p[0] - cx, e.p[2] - cz) > 3.4) { return; }
            damageFoe(e, m.atk * 2.4, { el: m.element || null, knock: m.element === '바람' ? 9 : 4, from: [cx, 0, cz] }); n++;
          });
          m.energy = Math.min(60, m.energy + (n ? 15 : 5));
        }
        if (inp.burst && m.energy >= 60 && pc.atkT <= 0.1) {
          m.energy = 0; pc.atkT = 0.7; pl.act = 0.5;
          K.fx({ type: 'burst', at: pl.p.slice(), r: 6.5, color: ELEM[m.element] || '#fff', big: true });
          K.fx({ type: 'pop', text: m.name + ' — 원소 폭발!', color: ELEM[m.element] || '#fff' });
          K.fx({ type: 'shake', sec: 0.4, power: 0.5 }); K.fx({ type: 'sound', name: 'win' });
          if (m.element) { K.emit('element', { at: pl.p.slice(), r: 6.5, el: m.element }); }
          foes().forEach(function (e) {
            if (Math.hypot(e.p[0] - pl.p[0], e.p[2] - pl.p[2]) > 6.5) { return; }
            damageFoe(e, m.atk * 5.5, { el: m.element || null, heavy: true, knock: 8 });
          });
        }
      }
      if (inp.atk && pc.atkT <= 0.12 && pc.blockT < 0) { combo(); }
      if (pc.atkT > 0) { mod.speed = Math.min(mod.speed, 0.25); mod.jump = false; }
    }

    /* 세이브 — 원신식 파티 체력·에너지 */
    function save() { return { party: pc.party.map(function (m) { return { hp: m.hp, energy: m.energy }; }), active: pc.active }; }
    function load(o) {
      (o.party || []).forEach(function (x, i) { if (pc.party[i]) { pc.party[i].hp = x.hp; pc.party[i].energy = x.energy; } });
      pc.active = o.active || 0;
      if (kind === 'genshin') { mirrorHp(); }
    }

    reset();
    return { kind: kind, reset: reset, enter: enter, step: step, control: control, damageFoe: damageFoe, save: save, load: load, state: function () { return pc; } };
  }

  /* ════════════════════════════════════════════════════════════════════════
     파판식 — ATB 전투
     ════════════════════════════════════════════════════════════════════════ */
  function makeFF(K, cfg) {
    var S = K.S, rng = K.rng;
    var party, encCd = 0, pendingPick = null;
    var CMDS = ['공격', '마법', '방어', '아이템', '도망'];
    var potVar = cfg.potionVar || 'potion';

    function reset() {
      var list = cfg.party && cfg.party.length ? cfg.party : DEF_PARTY.ff;
      party = list.slice(0, 4).map(member);
      S.battle = null; encCd = 0;
      S.cb = { kind: 'ff', party: party };
      mirror();
    }
    function mirror() { var lead = party[0]; if (lead) { S.vars[cfg.hpVar || 'hp'] = lead.hp; } }
    function enter() { S.battle = null; encCd = 1; }
    function varf() { return 0.9 + rng() * 0.2; }

    function start(o) {
      var f = o.comps.foe, n = Math.max(1, Math.min(5, Math.round(num(f.count, 1)))), foes = [];
      for (var i = 0; i < n; i++) {
        foes.push({ i: i, name: (o.name || '적') + (n > 1 ? ' ' + 'ABCDE'[i] : ''), hp: num(f.hp, 60), maxhp: num(f.hp, 60), atk: num(f.atk, 8), def: num(f.def, 2),
                    spd: num(f.spd, 8), atb: rng() * 40, element: f.element || '', look: o.def.look || { shape: 'capsule', color: '#d62828' } });
      }
      party.forEach(function (m) { m.atb = rng() * 60; m.guard = false; if (m.hp <= 0) { m.hp = 1; } });
      S.battle = { src: o, foes: foes, party: party, menu: null, phase: 'run', t: 0, anim: 0, msg: foes[0].name + (n > 1 ? ' 무리' : '') + ' 가 나타났다!', center: o.p.slice(),
                   boss: !!f.boss, exp: num(f.exp, 10) * n, gold: num(f.gold, 5) * n };
      K.fx({ type: 'battle-start' }); K.fx({ type: 'sound', name: 'door' });
    }

    function alive(list) { return list.filter(function (x) { return x.hp > 0; }); }
    function openMenu(m) {
      var B = S.battle;
      B.menu = { who: m.i, stage: 'cmd', cur: 0, items: [] };
      m.guard = false;
      build();
    }
    function build() {
      var B = S.battle, M = B.menu, m = party[M.who];
      if (M.stage === 'cmd') {
        M.items = CMDS.map(function (c) {
          var dis = (c === '마법' && !m.magic.length) || (c === '아이템' && num(S.vars[potVar], 0) <= 0) || (c === '도망' && B.boss);
          return { label: c, disabled: dis };
        });
      } else if (M.stage === 'magic') {
        M.items = m.magic.map(function (k) { return { label: k, sub: 'MP ' + MAGIC[k].mp, disabled: m.mp < MAGIC[k].mp, key: k }; });
      } else if (M.stage === 'item') {
        M.items = [{ label: '포션', sub: '×' + num(S.vars[potVar], 0), disabled: num(S.vars[potVar], 0) <= 0, key: 'potion' }];
      } else if (M.stage === 'target') {
        var side = M.side === 'ally' ? party : B.foes;
        M.items = side.map(function (x) { return { label: x.name, sub: x.hp + '/' + x.maxhp, disabled: M.side !== 'ally' && x.hp <= 0, idx: x.i }; });
      }
      if (M.items[M.cur] && M.items[M.cur].disabled) { M.cur = firstOk(M.items, M.cur, 1); }
    }
    function firstOk(items, from, d) {
      for (var k = 0; k < items.length; k++) { var j = (from + d * k + items.length * 4) % items.length; if (!items[j].disabled) { return j; } }
      return from;
    }

    function act(actorSide, actor, targetSide, target, info) {
      var B = S.battle;
      B.anim = 0.75;
      actor.atb = 0;
      K.fx(Object.assign({ type: 'battle-act', side: actorSide, i: actor.i, tside: targetSide, ti: target ? target.i : -1 }, info));
    }
    function hurt(x, dmg) { x.hp = Math.max(0, x.hp - dmg); }

    function doCommand(m, M, it) {
      var B = S.battle;
      if (M.stage === 'cmd') {
        if (it.label === '공격') { M.stage = 'target'; M.side = 'foe'; M.pend = { cmd: 'attack' }; M.cur = 0; build(); return; }
        if (it.label === '마법') { M.stage = 'magic'; M.cur = 0; build(); return; }
        if (it.label === '아이템') { M.stage = 'item'; M.cur = 0; build(); return; }
        if (it.label === '방어') { m.guard = true; B.menu = null; act('p', m, null, null, { text: m.name + ' 방어 자세' }); B.msg = m.name + ' 은(는) 몸을 지킨다'; return; }
        if (it.label === '도망') {
          B.menu = null;
          if (rng() < 0.55) { B.phase = 'flee'; B.t = 1; B.msg = '도망쳤다!'; K.fx({ type: 'sound', name: 'jump' }); } else { m.atb = 0; B.msg = '도망칠 수 없었다!'; B.anim = 0.6; }
          return;
        }
      }
      if (M.stage === 'magic') {
        var sp = MAGIC[it.key];
        M.pend = { cmd: 'magic', key: it.key };
        if (sp.all) { castHeal(m, it.key, null); return; }
        M.stage = 'target'; M.side = sp.heal ? 'ally' : 'foe'; M.cur = sp.heal ? M.who : 0; build(); return;
      }
      if (M.stage === 'item') { M.pend = { cmd: 'potion' }; M.stage = 'target'; M.side = 'ally'; M.cur = M.who; build(); return; }
      if (M.stage === 'target') {
        var tgt = (M.side === 'ally' ? party : B.foes)[it.idx];
        var p = M.pend || {};
        B.menu = null;
        if (p.cmd === 'attack') {
          var dmg = Math.max(1, Math.round(m.atk * 2 * varf() - tgt.def));
          var crit = rng() < 0.08; if (crit) { dmg *= 2; }
          hurt(tgt, dmg);
          B.msg = m.name + ' 의 공격! ' + tgt.name + ' 에게 ' + dmg + (crit ? ' (치명!)' : '');
          act('p', m, 'f', tgt, { dmg: dmg, crit: crit });
          K.fx({ type: 'sound', name: 'hit' });
        } else if (p.cmd === 'magic') {
          var sp2 = MAGIC[p.key];
          if (sp2.heal) { castHeal(m, p.key, tgt); return; }
          m.mp -= sp2.mp;
          var weak = tgt.element && WEAK[sp2.el] === tgt.element;
          var md = Math.max(1, Math.round(m.mag * sp2.pow * varf() * (weak ? 1.5 : 1) - tgt.def / 2));
          hurt(tgt, md);
          B.msg = m.name + ' 의 ' + p.key + '! ' + tgt.name + ' 에게 ' + md + (weak ? ' (약점!)' : '');
          act('p', m, 'f', tgt, { dmg: md, el: sp2.el, magic: p.key });
          K.fx({ type: 'sound', name: 'door' });
        } else if (p.cmd === 'potion') {
          K.addVar(potVar, -1);
          var hv = Math.min(tgt.maxhp - tgt.hp, num(cfg.potionHeal, 50));
          tgt.hp += hv;
          B.msg = tgt.name + ' 의 HP 가 ' + hv + ' 회복';
          act('p', m, 'p', tgt, { heal: hv });
          K.fx({ type: 'sound', name: 'coin' });
        }
      }
    }
    function castHeal(m, key, tgt) {
      var B = S.battle, sp = MAGIC[key];
      B.menu = null;
      m.mp -= sp.mp;
      var list = sp.all ? alive(party) : [tgt], tot = 0;
      list.forEach(function (x) { var hv = Math.min(x.maxhp - x.hp, Math.round(m.mag * sp.heal * 4 * varf())); x.hp += hv; tot += hv; });
      B.msg = m.name + ' 의 ' + key + '! ' + (sp.all ? '모두' : list[0].name) + ' 회복 ' + tot;
      act('p', m, 'p', sp.all ? null : tgt, { heal: tot, magic: key });
      K.fx({ type: 'sound', name: 'coin' });
    }

    function foeTurn(f) {
      var B = S.battle, al = alive(party);
      if (!al.length) { return; }
      var t = al[Math.floor(rng() * al.length)];
      var dmg = Math.max(1, Math.round(f.atk * 2 * varf() - t.def));
      if (t.guard) { dmg = Math.max(1, Math.round(dmg / 2)); }
      hurt(t, dmg);
      B.msg = f.name + ' 의 공격! ' + t.name + ' 에게 ' + dmg + (t.guard ? ' (방어)' : '');
      act('f', f, 'p', t, { dmg: dmg });
      K.fx({ type: 'sound', name: 'hit' }); K.fx({ type: 'shake', sec: 0.15, power: 0.2 });
      mirror();
    }

    function finish() {
      var B = S.battle;
      if (B.phase === 'win') {
        K.destroy(B.src);
        K.addVar(cfg.expVar || 'exp', B.exp); K.addVar(cfg.goldVar || 'gold', B.gold);
        alive(party).forEach(function (m) {
          m.exp += B.exp;
          while (m.exp >= m.lv * 30) {
            m.exp -= m.lv * 30; m.lv++;
            m.maxhp = Math.round(m.maxhp * 1.1); m.atk = Math.round(m.atk * 1.1 + 1); m.mag = Math.round(m.mag * 1.1 + 1); m.def += 1; m.maxmp += 2;
            m.hp = m.maxhp; m.mp = m.maxmp;
            K.fx({ type: 'pop', text: m.name + ' 레벨 ' + m.lv + '!', color: '#ffd166' });
          }
        });
      }
      if (B.phase === 'flee' && S.player) {
        var dx = S.player.p[0] - B.src.p[0], dz = S.player.p[2] - B.src.p[2], d = Math.hypot(dx, dz) || 1;
        S.player.p[0] += dx / d * 2.5; S.player.p[2] += dz / d * 2.5;
      }
      if (B.phase === 'lose') { S.over = { win: false, text: '파티가 전멸했다…' }; K.fx({ type: 'sound', name: 'lose' }); }
      party.forEach(function (m) { if (m.hp <= 0) { m.hp = 1; } m.guard = false; });
      mirror();
      S.battle = null; encCd = 2.5;
      K.fx({ type: 'battle-end' });
    }

    function step(dt, inp) {
      var B = S.battle;
      if (!B) {
        if (encCd > 0) { encCd -= dt; }
        /* 필드의 전투 적은 가까우면 다가온다 */
        S.ents.forEach(function (e) {
          if (!e.alive || e.hidden || !e.comps.foe || !S.player) { return; }
          var dx = S.player.p[0] - e.p[0], dz = S.player.p[2] - e.p[2], d = Math.hypot(dx, dz), f = e.comps.foe;
          if (d < num(f.aggro, 9) && d > 0.5 && encCd <= 0) {
            var sp = num(f.move, 2.6) * 0.8;
            e.r[1] = ang(dx, dz);
            if (e.body.type === 'dynamic') { e.v[0] = dx / d * sp; e.v[2] = dz / d * sp; } else { e.p[0] += dx / d * sp * dt; e.p[2] += dz / d * sp * dt; e.spd = sp; }
          } else if (e.body.type === 'dynamic') { e.v[0] *= 0.8; e.v[2] *= 0.8; } else { e.spd = 0; }
        });
        return false;
      }
      B.t += dt;
      if (B.phase !== 'run') { B.t2 = (B.t2 || 0) + dt; if (B.t2 > (B.phase === 'win' ? 1.8 : 1.2)) { finish(); } return true; }
      if (B.anim > 0) { B.anim -= dt; if (B.anim > 0) { return true; } checkEnd(); if (B.phase !== 'run') { return true; } }
      var M = B.menu;
      if (M) {
        if (pendingPick != null) { M.cur = pendingPick; pendingPick = null; inp = Object.assign({}, inp, { ok: true }); }
        var n = M.items.length;
        if (inp.up) { M.cur = firstOk(M.items, (M.cur - 1 + n) % n, -1); K.fx({ type: 'sound', name: 'blip' }); }
        if (inp.down) { M.cur = firstOk(M.items, (M.cur + 1) % n, 1); K.fx({ type: 'sound', name: 'blip' }); }
        if (inp.back && M.stage !== 'cmd') { M.stage = 'cmd'; M.cur = 0; build(); return true; }
        if (inp.ok) { var it = M.items[M.cur]; if (it && !it.disabled) { doCommand(party[M.who], M, it); } }
        return true;
      }
      /* 기다림 방식 ATB — 메뉴가 열려 있으면 게이지가 안 찬다 */
      var ready = null;
      party.forEach(function (m) { if (m.hp > 0) { m.atb = Math.min(100, m.atb + (10 + m.spd) * dt * 3); if (m.atb >= 100 && !ready) { ready = ['p', m]; } } });
      B.foes.forEach(function (f) { if (f.hp > 0) { f.atb = Math.min(100, f.atb + (10 + f.spd) * dt * 3); if (f.atb >= 100 && !ready) { ready = ['f', f]; } } });
      if (ready) { if (ready[0] === 'p') { openMenu(ready[1]); B.msg = ready[1].name + ' 의 차례'; } else { foeTurn(ready[1]); } }
      return true;
    }
    function checkEnd() {
      var B = S.battle;
      if (!alive(B.foes).length) { B.phase = 'win'; B.t2 = 0; B.msg = '이겼다! 경험치 ' + B.exp + ' · 돈 ' + B.gold; K.fx({ type: 'sound', name: 'win' }); } else if (!alive(party).length) { B.phase = 'lose'; B.t2 = 0; B.msg = '전멸…'; }
    }

    function touch(pl, o, fresh) {
      /* 닿아 있는 동안 대기 시간이 끝나면 연다(장면 들어오자마자·도망 직후엔 잠깐 안 열린다) */
      if (o.comps.foe && !S.battle && encCd <= 0 && !S.over) { start(o); }
    }

    /* 세이브 — 파티 레벨·체력·MP·경험치 */
    function save() { return party.map(function (m) { return { lv: m.lv, exp: m.exp, hp: m.hp, maxhp: m.maxhp, mp: m.mp, maxmp: m.maxmp, atk: m.atk, def: m.def, mag: m.mag }; }); }
    function load(o) { (o || []).forEach(function (x, i) { if (party[i]) { Object.assign(party[i], x); } }); mirror(); }

    reset();
    return { kind: 'ff', save: save, load: load, reset: reset, enter: enter, step: step, touch: touch, choose: function (i) { pendingPick = i; }, party: function () { return party; } };
  }

  if (SIM) {
    SIM.addStyle('simple', '간단 — J·클릭 3연타, 닿으면 아프다(스킬·포션은 설정대로)', function (K, cfg) { return makeAction(K, cfg, 'simple'); });
    SIM.addStyle('genshin', '원신식 — 파티 교체·원소 스킬/폭발·원소 반응·대시', function (K, cfg) { return makeAction(K, cfg, 'genshin'); });
    SIM.addStyle('zelda', '젤다식 — 주목·방패 저스트 가드·저스트 회피 러시·회전 베기', function (K, cfg) { return makeAction(K, cfg, 'zelda'); });
    SIM.addStyle('ff', '파판식 — 닿으면 ATB 커맨드 전투·마법·레벨', function (K, cfg) { return makeFF(K, cfg); });
  }
  var API = { ELEM: ELEM, REACT: REACT, MAGIC: MAGIC, WEAK: WEAK, SKILL: SKILL, GRADE: GRADE };
  root.SagaCombat = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
})(typeof window !== 'undefined' ? window : globalThis);
