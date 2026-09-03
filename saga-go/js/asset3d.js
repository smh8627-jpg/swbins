/**
 * 3D 에셋 창고 — GLB 를 끼워 넣을 자리를 만든다 (3D 전환 PHASE 3)
 * ---------------------------------------------------------------
 * 지금 지도 위의 사람·짐승·건물은 `actor3d.js` 가 **도형을 조립해** 세운다.
 * 손으로 빚은 것이라 가볍고 어디서나 도는 대신, 아무리 다듬어도 손으로 빚은 티가 난다.
 * 언젠가 제대로 만든 모델(GLB)을 얹고 싶은데, 그때 가서 배우 세우는 코드를 뜯어고치면
 * 지금 서 있는 그림이 통째로 흔들린다. 그래서 **미리 자리만 파 둔다**.
 *
 *   REG           무엇을 무엇으로 세울지 적은 표. **인물 · 짐승 다섯 · 역참 · 성채가 차 있다**
 *   register()    표에 한 줄 적으면 그날부터 그 배우는 GLB 로 선다
 *   build()       GLB 를 받는 동안에도 화면은 안 빈다 — 도형을 먼저 세워 두고
 *                 다 받으면 그 자리에서 갈아 끼운다
 *   step()        GLB 는 뼈대 애니메이션(AnimationMixer), 도형은 `actor3d` 의 관절
 *
 * 되돌아가는 길 (PLAN 49절)
 *
 *   GLB ── 없거나 실패 ─→ actor3d 의 도형 ── 그것도 없으면 ─→ 캡슐·상자
 *
 * **한 줄도 판정에 닿지 않는다.** 여기서 만든 것은 전부 화면에만 쓴다.
 * 표를 읽는 함수(`lookup`·`chain`·`mapClips`·`fit`)는 **three 없이도 돈다** —
 * 자가진단이 그것만 따로 본다. 세우는 함수만 three 를 쓴다.
 *
 * **자리는 다 찼다.** 인물 여섯 벌 · 짐승 다섯 종 · 역참 · 성채 셋(등급마다 하나)이
 * 진짜 모델로 선다. 파 둔 자리가 옳았다는 증거는 **표에 줄만 늘었다는 것**이다 —
 * 세우는 코드는 그대로다.
 *
 * file:// (PC 단독판)에서는 GLB 를 못 받는다(브라우저가 막는다). 실패하면 조용히
 * 도형으로 남으므로 단독판도 그대로 돈다 — 그래서 실패를 시끄럽게 알리지 않는다.
 */
(function (global) {
  'use strict';

  var T = null;
  function three() { if (!T) { T = global.THREE || null; } return T; }
  function core() { return global.DG.core; }

  /** GLB 를 쓸까 — 0 이면 표에 적혀 있어도 도형으로 간다 (되돌림용 손잡이) */
  function GLB_ON() { return core().tuned('world3d.glb', 1) ? true : false; }

  /* ── 표 ───────────────────────────────────────────────
   * 키는 **좁은 것부터** 찾는다. 청룡만 따로 모델을 주고 싶으면 `pet:pt_cheongryong`,
   * 용 종류를 한꺼번에 주고 싶으면 `pet:form:dragon`, 짐승 전부면 `pet` 이다.
   *
   *   asset3d.register('hero', 'assets/models/hero.glb');
   *   asset3d.register('pet:form:dragon', 'assets/models/dragon.glb');
   *
   * 오래 비어 있었다. **이제 다 찼다** — 인물 여섯 벌 · 짐승 다섯 종 ·
   * 역참 · 성채 셋이다(Quaternius CC0, 까치만 Poly by Google CC-BY.
   * 출처는 `assets/ASSET_LICENSES.md`).
   */
  var PEOPLE = 'assets/models/people/';
  var BLD = 'assets/models/buildings/';
  /* 사람 몸(body)·옷(outfit)·머리(hair) 셋이 **뼈 이름까지 완전히 같은 한 뼈대**를
     쓰는 새 인물 창고(Quaternius `Universal Base Characters` + `Modular Character
     Outfits - Fantasy`, 2026-08-29 갈아 끼움). `assets/ASSET_LICENSES.md` 참고 */
  var REGULAR = PEOPLE + 'regular/';
  var ANIM_DIR = 'assets/models/anim/';

  /* 2026-09-03 — 사가의숲과 같은 이유로 사람 기본을 갈아 끼운다: 위 조합형(몸+옷+머리)
     은 그림체가 밋밋하다는 지적("2D도 허접해서" 조사 끝에 그림체 우선으로 결정, 사가의숲
     참고)에 Quaternius "RPG Character Pack"(CC0, 전사·궁수·도적·성직자·마법사·수도승
     6종)으로 바꾼다. 몸 파일 하나에 걷기·공격·사망 등 클립이 다 들어 있어 옷·머리도,
     ANIM_DIR 몸짓도 필요 없다 — `anim` 을 `body` 와 같은 파일로 주면 그 클립을 그대로 쓴다.
     `assets/ASSET_LICENSES.md` 참고. */
  var PEOPLE_QRPG = PEOPLE + 'quaternius_rpg/';
  var HERO_RECIPES = ['Warrior', 'Ranger', 'Rogue', 'Cleric', 'Wizard', 'Monk'].map(function (n) {
    var f = PEOPLE_QRPG + n + '.glb';
    return { key: 'qrpg_' + n.toLowerCase(), body: f, anim: f };
  });

  /**
   * 옛 인물 조합 — **몸 하나 + 옷 하나 + 머리 하나**가 한 벌이다. 셋 다 뼈 개수(65)와
   * 이름·순서가 파일 열둘(몸 둘·옷 넷·머리 여섯) 전부 한 글자도 안 다르다(직접
   * 대조했다) — 그래서 옷·머리를 몸의 뼈대에 그대로 `bind()` 해 얹으면 되고,
   * `Knight.glb` 를 빌려 옮겨 입히던 옛 리타기팅이 통째로 필요 없다.
   *
   * 지금은 표(`DEFAULTS.hero`)에서는 빠졌다 — 위 QRPG로 교체됐다. 지우지 않고
   * 남겨 둔다(되돌림 자리); `register('hero', HERO_RECIPES_FALLBACK)` 로 되돌릴 수 있다.
   */
  var HERO_RECIPES_FALLBACK = [
    { key: 'male_peasant_buzzed', body: REGULAR + 'Superhero_Male_FullBody.gltf',
      outfit: REGULAR + 'Male_Peasant.gltf', hair: REGULAR + 'Hair_Buzzed.gltf' },
    { key: 'male_ranger_long', body: REGULAR + 'Superhero_Male_FullBody.gltf',
      outfit: REGULAR + 'Male_Ranger.gltf', hair: REGULAR + 'Hair_Long.gltf' },
    { key: 'male_peasant_beard', body: REGULAR + 'Superhero_Male_FullBody.gltf',
      outfit: REGULAR + 'Male_Peasant.gltf', hair: REGULAR + 'Hair_Beard.gltf' },
    { key: 'female_peasant_buns', body: REGULAR + 'Superhero_Female_FullBody.gltf',
      outfit: REGULAR + 'Female_Peasant.gltf', hair: REGULAR + 'Hair_Buns.gltf' },
    { key: 'female_ranger_simple', body: REGULAR + 'Superhero_Female_FullBody.gltf',
      outfit: REGULAR + 'Female_Ranger.gltf', hair: REGULAR + 'Hair_SimpleParted.gltf' },
    { key: 'female_peasant_buzzed', body: REGULAR + 'Superhero_Female_FullBody.gltf',
      outfit: REGULAR + 'Female_Peasant.gltf', hair: REGULAR + 'Hair_BuzzedFemale.gltf' }
  ];

  /* 위 열둘(몸·옷·머리)은 이미 한 뼈대라 `dressUp`(Knight 몸짓 옮겨 입히기)을
     탈 필요가 없다 — 타면 파일마다 몸짓 마흔한 개를 헛되이 다시 굽는다. `acquire()`
     가 이 표에 있는 url 이면 자동 리타기팅을 건너뛴다. QRPG는 제 클립이 있어
     `needsRetarget()` 이 애초에 false 지만, 표에 같이 올려 뜻을 분명히 해 둔다 */
  var SKIP_AUTORETARGET = {};
  HERO_RECIPES.concat(HERO_RECIPES_FALLBACK).forEach(function (r) {
    SKIP_AUTORETARGET[r.body] = true;
    if (r.outfit) { SKIP_AUTORETARGET[r.outfit] = true; }
    if (r.hair) { SKIP_AUTORETARGET[r.hair] = true; }
  });

  var DEFAULTS = {
    'hero': HERO_RECIPES,
    'pet:an_deer': 'assets/models/animals/Deer.glb',
    'pet:an_wolf': 'assets/models/animals/Wolf.glb',
    'pet:an_ox':   'assets/models/animals/Cow.glb',
    'pet:an_carp': 'assets/models/animals/Koi.glb',
    /* 까치 — Poly by Google 의 `Crow`. **여기만 CC-BY 다**(나머지는 CC0) —
       저작자 표시가 **필수**이고 `assets/ASSET_LICENSES.md` 에 적어 두었다.
       `.glb` 한 덩이가 아니라 `.gltf` + `.bin` + `.png` 세 파일이라
       **셋이 같은 폴더에 이름 그대로** 있어야 한다 */
    'pet:an_magpie': 'assets/models/animals/Mesh_Crow.gltf',

    /* 역참 — **여관 한 벌**이다. 역참은 들러서 쉬고 보급받는 자리이니
       여관이 그 자체다. 여러 벌로 섞고 싶었지만 `Well`(우물 1.25m)·
       `MarketStand`(좌판 1.05m)는 **원본 키가 절반도 안 된다** — 이 창고는
       무엇이든 키 1 로 눕히므로(`normalize`) 섞으면 우물이 여관만 해진다.
       키가 비슷한 것끼리만 한 줄에 묶는다 */
    'station': BLD + 'Inn.glb',

    /* 성채 — **등급마다 다른 탑이 선다.** `fort.js` 의 세 등급(보·진·웅진)은
       수비대의 세기가 다른데 여태 화면에서는 다 같은 성채였다. 멀리서 보고
       "저건 웅진이다" 를 알면 걸어갈지 말지가 눈으로 정해진다.
       좁은 키(`fort:t3`)부터 찾으므로 등급이 안 실려 와도 `fort` 로 떨어진다 */
    'fort:t1': BLD + 'Watchtower.glb',
    'fort:t2': [BLD + 'Tower.glb', BLD + 'PointyTower.glb'],
    'fort:t3': [BLD + 'LargeTower.glb', BLD + 'LargeSquareTowerBricks.glb'],
    'fort': BLD + 'Tower.glb'
  };

  var REG = {};
  /** 기본 표를 옮겨 담는다 — `clear()` 로 비운 뒤 되돌릴 때도 이 함수를 쓴다 */
  function restore() {
    var k;
    for (k in DEFAULTS) { if (DEFAULTS.hasOwnProperty(k)) { REG[k] = DEFAULTS[k]; } }
    return REG;
  }
  restore();

  function register(key, url) {
    if (!key) { return REG; }
    if (url) { REG[key] = url; } else { delete REG[key]; }
    return REG;
  }

  /** 이 배우를 어떤 키들로 찾아볼까 — 좁은 것부터 넓은 것 순 */
  function keysFor(kind, ref) {
    var r = ref || {};
    if (kind === 'hero') {
      return ['hero:' + r.id, 'hero:era:' + r.era, 'hero'].filter(Boolean);
    }
    if (kind === 'pet') {
      var form = r.form || (global.DG.sprite && global.DG.sprite.beastFormOf ?
        global.DG.sprite.beastFormOf(r) : null);
      return ['pet:' + r.id, form ? 'pet:form:' + form : null, 'pet'].filter(Boolean);
    }
    /* 성채는 **등급이 먼저다** — `fort:t3` 가 있으면 그것, 없으면 `fort`.
       등급이 안 실려 와도(옛 부름) 넓은 키로 떨어지므로 화면은 안 빈다 */
    if (kind === 'fort') {
      return [r.tier ? 'fort:t' + r.tier : null, 'fort'].filter(Boolean);
    }
    if (kind === 'station') { return [kind]; }
    return kind ? [kind] : [];
  }

  /** 표에서 첫 히트 — 없으면 null. 순수 함수다 */
  function lookup(kind, ref) {
    var ks = keysFor(kind, ref), i;
    for (i = 0; i < ks.length; i++) {
      if (REG[ks[i]]) { return { key: ks[i], url: REG[ks[i]] }; }
    }
    return null;
  }

  /**
   * 표의 한 줄이 **여럿**이면 그중 하나를 고른다 — `ref.id` 해시로.
   * 같은 사람은 늘 같은 몸을 입는다(자리를 옮겨도, 창을 다시 열어도).
   * 한 줄짜리면 그대로 준다 — 옛 표기와 그대로 맞물린다.
   */
  function oneOf(list, ref) {
    if (!list) { return null; }
    if (typeof list === 'string') { return list; }
    if (!list.length) { return null; }
    var s = String((ref && (ref.id || ref.name)) || ''), i, h = 0;
    for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return list[h % list.length];
  }

  /**
   * 표 한 줄이 URL 문자열이 아니라 **조합 객체**(`{key, body, outfit, hair}`,
   * 인물의 몸·옷·머리 조합)일 수 있다 — 그때는 `key` 만 문자열로 내준다.
   * `chain()`·진단·데모는 이 문자열 하나로 "몇 벌 중 어느 벌인지"만 가르면
   * 되고, 실제로 세울 때는 `heroRecipe()` 가 객체 그대로를 다시 돌려준다.
   */
  function urlOf(kind, ref) {
    var h = lookup(kind, ref);
    if (!h) { return null; }
    var v = oneOf(h.url, ref);
    if (v && typeof v === 'object') { return v.key || null; }
    return v;
  }

  /** 인물의 몸·옷·머리 조합 — 표에 적힌 것이 조합 객체일 때만 준다(테스트가
   *  `register('hero', 'a.glb')` 처럼 문자열 하나로 덮어써도 안 깨지게) */
  function heroRecipe(ref) {
    var h = lookup('hero', ref);
    if (!h) { return null; }
    var v = oneOf(h.url, ref);
    return (v && typeof v === 'object' && v.body) ? v : null;
  }
  function wants(kind, ref) { return GLB_ON() && !!urlOf(kind, ref); }

  /** 이 배우는 무엇으로 설까 — 'glb' · 'shape' · 'primitive'. 순수 함수다 */
  function chain(kind, ref) {
    if (wants(kind, ref)) {
      var c = cache[urlOf(kind, ref)];
      if (!c || c.state !== 'fail') { return 'glb'; }
    }
    var A = global.DG.actor3d;
    /* actor3d 가 아는 종류인지 — 도형 계획이 비어 있으면 캡슐로 간다 */
    if (A && A.plan && A.plan(kind, ref).length) { return 'shape'; }
    return 'primitive';
  }

  /* ── 애니메이션 이름 맞추기 (PLAN 8절) ─────────────────
   * 모델마다 클립 이름이 제각각이다. mixamo 는 `Armature|mixamo.com|Layer0`,
   * blender 는 `Walk.001`, 어떤 것은 `Anim_Run_F`. 그래서 이름을 씻어 놓고
   * **점수를 매겨** 가장 잘 맞는 것부터 자리를 채운다 — 한 클립이 두 자리를
   * 차지하지는 않는다.
   *
   * `hit`(맞는다)과 `attack`(친다)이 서로 먹히기 쉬운데, 점수제라 `hit` 라는
   * 클립은 hit 자리에서 정확히 맞아(100점) attack 의 부분일치(40점)를 이긴다.
   */
  var SLOTS = ['idle', 'walk', 'run', 'sprint', 'attack', 'hit', 'dodge', 'death', 'interaction'];

  var WORDS = {
    idle: ['idle', 'stand', 'standing', 'breathe', 'rest', 'wait', 'loop'],
    walk: ['walk', 'walking', 'locomotion', 'move'],
    run: ['run', 'running', 'jog'],
    sprint: ['sprint', 'runfast', 'fastrun', 'dash'],
    attack: ['attack', 'atk', 'slash', 'swing', 'strike', 'punch', 'shoot', 'cast'],
    hit: ['hit', 'hurt', 'damage', 'gethit', 'takedamage', 'impact', 'flinch'],
    dodge: ['dodge', 'roll', 'evade', 'sidestep'],
    death: ['death', 'die', 'dead', 'dying', 'defeat'],
    interaction: ['interact', 'interaction', 'use', 'pick', 'gather', 'talk', 'open', 'action']
  };

  /** 이름을 씻는다 — `Armature|mixamo.com|Walk.001` → `walk` */
  function normName(s) {
    var n = String(s || '');
    if (n.indexOf('|') >= 0) { n = n.split('|').pop(); }   // 마지막 칸이 진짜 이름이다
    n = n.replace(/\.\d+$/, '');                            // blender 의 .001
    return n.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /** 한 자리와 한 이름이 얼마나 맞나 — 0 이면 안 맞는다 */
  function score(slot, name) {
    var ws = WORDS[slot] || [], i, w, best = 0, s;
    for (i = 0; i < ws.length; i++) {
      w = ws[i];
      if (name === w) { s = 100; }
      else if (name.indexOf(w) === 0) { s = 70; }
      else if (name.indexOf(w) >= 0) { s = 40; }
      else { continue; }
      s -= i;                       // 앞에 적은 후보가 조금 더 세다
      if (s > best) { best = s; }
    }
    return best;
  }

  /**
   * 클립 이름들 → 자리표. 순수 함수라 three 없이도 돈다.
   * 못 채운 자리는 대타로 메운다(`FALLBACK`) — 뛰는 그림이 없으면 걷는 그림이라도 쓴다.
   */
  var FALLBACK = {
    run: ['walk', 'idle'], sprint: ['run', 'walk'], walk: ['run', 'idle'],
    hit: ['idle'], dodge: ['run', 'walk'], attack: ['interaction', 'idle'],
    death: ['hit', 'idle'], interaction: ['idle'], idle: ['walk']
  };

  function mapClips(names) {
    var list = (names || []).map(function (n) { return { raw: n, n: normName(n) }; });
    var pairs = [], si, ci, sc;
    for (si = 0; si < SLOTS.length; si++) {
      for (ci = 0; ci < list.length; ci++) {
        sc = score(SLOTS[si], list[ci].n);
        if (sc > 0) { pairs.push({ slot: SLOTS[si], raw: list[ci].raw, s: sc, si: si, ci: ci }); }
      }
    }
    /* 점수가 같으면 자리 순서 → 클립 순서. 돌릴 때마다 답이 달라지면 안 된다 */
    pairs.sort(function (a, b) { return (b.s - a.s) || (a.si - b.si) || (a.ci - b.ci); });
    var out = {}, taken = {}, i, p;
    for (i = 0; i < pairs.length; i++) {
      p = pairs[i];
      if (out[p.slot] || taken[p.raw]) { continue; }
      out[p.slot] = p.raw; taken[p.raw] = true;
    }
    /* 대타 — 원본으로 채운 자리와 구별되게 `alias` 에 적어 둔다 */
    var alias = {}, j, alt;
    for (i = 0; i < SLOTS.length; i++) {
      if (out[SLOTS[i]]) { continue; }
      alt = FALLBACK[SLOTS[i]] || [];
      for (j = 0; j < alt.length; j++) {
        if (out[alt[j]]) { out[SLOTS[i]] = out[alt[j]]; alias[SLOTS[i]] = alt[j]; break; }
      }
    }
    out.alias = alias;
    return out;
  }

  /* ── 크기 맞추기 ──────────────────────────────────────
   * 이 판의 배우는 전부 **키 1** 로 만들어 두고 세우는 쪽에서 배율을 준다
   * (`actor3d.js` 의 규약). GLB 는 만든 사람마다 단위가 다르니 재서 맞춘다 —
   * 키를 1 로, 발을 y=0 으로.
   */
  function fit(box) {
    var h = (box.maxY - box.minY) || 1;
    var s = 1 / h;
    return {
      scale: s,
      dy: -box.minY * s,
      dx: -((box.minX + box.maxX) / 2) * s,
      dz: -((box.minZ + box.maxZ) / 2) * s
    };
  }

  /**
   * 키 1 위에 **얼마를 더 곱하나** — 순수 함수다.
   *
   * 배우는 전부 키 1 로 눕는데(`fit`), 도형으로 세우던 역참·성채는 그 규약을
   * 안 지키고 제 키로 서 있었다 — 역참 **1.73** · 성채 **2.64**(직접 재 봤다).
   * `world3d` 가 주는 배율은 그 키를 곱할 셈으로 잡힌 값이라, GLB 를 키 1 로
   * 그대로 세우면 **역참이 절반, 성채가 셋에 하나로 쪼그라든다.** 그만큼 보탠다.
   * (`prop3d.houseScale` 이 집에서 같은 함정을 밟고 남긴 자리와 같은 뜻이다)
   *
   * 성채는 여기에 **등급을 한 번 더 태운다.** 보(堡)는 작고 웅진(雄鎭)은 크다 —
   * 걸어가기 전에 멀리서 세기를 가늠하는 것이 이 판의 성채가 하는 일이다.
   */
  function heightMul(kind, ref) {
    var C = core();
    if (kind === 'station') { return C.tuned('asset3d.stationScale', 1.73); }
    if (kind === 'fort') {
      var base = C.tuned('asset3d.fortScale', 2.64);
      var t = ref && ref.tier;
      return base * (t === 1 ? 0.78 : (t === 3 ? 1.24 : 1));
    }
    return 1;
  }

  /**
   * 이 건물에 **표식 깃발**을 세우나 — 세우면 규격, 아니면 null. 순수 함수다.
   *
   * 왜 필요한가. 도형 역참에는 노란 깃발이, 도형 성채에는 세력 빛깔 배너가
   * 달려 있었고 **그것이 멀리서 알아보는 유일한 표식**이었다. 받아 온 탑과
   * 여관에는 깃발이 없다 — 그대로 갈아 끼우면 성채가 어느 세력인지 화면에서
   * 사라진다. 모양을 얻고 뜻을 잃는 맞바꿈이 되므로, 깃발만 다시 얹는다.
   *
   * 값은 **키 1 기준의 비율**이다(`heightMul` 을 곱한 뒤의 단위계).
   */
  function markOf(kind, ref) {
    if (kind !== 'station' && kind !== 'fort') { return null; }
    if (!core().tuned('asset3d.mark', 1)) { return null; }
    var col = (ref && ref.color) || (kind === 'fort' ? '#8a5cc0' : '#e8c15a');
    /* 성채는 **세로로 긴 배너**, 역참은 **가로로 넓은 작은 깃발** — 도형이 그랬다 */
    if (kind === 'fort') { return { color: col, pole: 1.02, w: 0.22, flag: 0.34 }; }
    return { color: col, pole: 0.95, w: 0.30, flag: 0.18 };
  }

  /* ── 여기서부터 three 가 필요하다 ─────────────────────── */

  var cache = {};        // { url: {state:'load'|'ok'|'fail', gltf, clips, map, waiting:[]} }
  /* 몇 벌을 세웠고 몇 벌이 GLB 로 갈아 끼워졌나 — 진단·데모가 값으로 본다 */
  var built = 0, swapped = 0, broke = '';

  function loader() {
    var t = three();
    if (!t || !t.GLTFLoader) { return null; }
    if (!loader.it) { loader.it = new t.GLTFLoader(); }
    return loader.it;
  }

  /* ── 몸짓 옮겨 입히기 (retarget) ──────────────────────
   * Quaternius 의 사람 모델 스물한 벌에는 **몸짓이 하나도 없다**(직접 세었다).
   * 그대로 세우면 마을 사람이 T 자로 선다 — 도형만 못하다.
   *
   * 몸짓을 들고 있는 것은 `Knight.glb` 하나뿐이라(열둘), **그것을 옮겨 입힌다.**
   * 뼈 이름은 열여덟이 겹치는데(Hips·Torso·Chest·Neck·Head·팔·다리)
   * **쉬는 자세가 다르다** — 팔·다리가 최대 180° 어긋난다. 그래서 그냥 틀면
   * 사지가 뒤틀린다. 직접 재 보고 알았다.
   *
   * three 의 `SkeletonUtils.retargetClip` 이 그 일을 한다: 원본을 한 프레임씩
   * 굴리며 **뼈의 월드 자세**를 읽어 목표 뼈대에 다시 푼다. 쉬는 자세가 달라도
   * 결과가 맞는 까닭이 이것이다. 겹치지 않는 뼈(손가락·IK)는 그냥 빠진다.
   *
   * 한 몸에 **한 번만** 한다(모델마다 캐시). 배우마다 하면 스물이 설 때마다
   * 열두 클립을 다시 굽는 셈이라 화면이 멎는다.
   */
  /* 예전엔 `Knight.glb`(제 몸짓 열둘) 하나를 빌려 나머지에게 옮겨 입혔다.
     지금은 몸·옷·머리가 다 같은 뼈대를 쓰므로, **뼈대가 다른 옛 물건**
     대신 **이름까지 같은 뼈대의 몸짓 마흔한 벌**(Quaternius
     `Universal Animation Library`)을 원본으로 쓴다 — 옮겨 입힐 필요 없이
     그대로 물린다(아래 `buildHero`). */
  var ANIM_SRC = ANIM_DIR + 'UAL1_Standard.glb';

  /** 뼈대가 몇 벌인가 — 몸통·발·머리·다리가 **저마다 딴 뼈대**를 지고 오는
   *  모델이 있다(Quaternius 의 몇몇 인물 팩이 그렇다: Farmer·Worker·Lady 넷 다
   *  뼈대 넷). 옮겨 입히기는 그중 하나만(`firstSkinned` 가 찾는 것) 골라 돌리므로,
   *  그 하나만 움직이고 나머지 셋은 제자리에 남아 걷는 동안 몸이 갈라진다.
   *  (2026-08-29, 사용자가 실기기로 재확인 — 정지 화면에선 이어 보여도 걷기
   *  시작하면 떨어졌다) */
  function skeletonCount(obj) {
    var set = {};
    obj.traverse(function (o) { if (o.isSkinnedMesh && o.skeleton) { set[o.skeleton.uuid] = 1; } });
    return Object.keys(set).length;
  }

  /** 이 모델은 제 몸짓이 있나 — 없으면 옮겨 입혀야 한다. 뼈대가 하나뿐일 때만
   *  옮겨 입힌다 — 여럿이면 하나만 돌리다 몸이 갈라지느니 **가만히 서는 쪽**을
   *  택한다(움직이는 부서진 몸보다 낫다) */
  function needsRetarget(c) {
    return !!(c && c.gltf && (!c.clips || !c.clips.length) && skeletonCount(c.gltf.scene) === 1);
  }

  function firstSkinned(obj) {
    var found = null;
    obj.traverse(function (o) { if (!found && o.isSkinnedMesh) { found = o; } });
    return found;
  }

  /**
   * 원본의 클립들을 이 몸에 맞게 다시 굽는다. 못 하면 빈 배열 — 그러면
   * 이 몸은 **가만히 선다**(뒤틀리는 것보다는 낫다).
   */
  /**
   * 목표 뼈 이름 → 원본 뼈 이름 표. **이름이 같은 것만** 잇는다(항등).
   * 겹치지 않는 뼈(손가락 · IK · 이 몸에만 있는 `Root`·`Chest`)는 표에 안 넣는다 —
   * 표에 없으면 그 뼈는 건드리지 않고 제 자세로 남는다. 그게 맞는 동작이다.
   */
  function boneNameMap(tm, sm) {
    var map = {}, n = 0, i;
    if (!tm.skeleton || !sm.skeleton) { return { map: map, count: 0 }; }
    var have = {}, sb = sm.skeleton.bones, tb = tm.skeleton.bones;
    for (i = 0; i < sb.length; i++) { have[sb[i].name] = 1; }
    for (i = 0; i < tb.length; i++) {
      if (have[tb[i].name]) { map[tb[i].name] = tb[i].name; n++; }
    }
    return { map: map, count: n };
  }

  /** 이 장면의 키(m) — 뼈대 크기를 견줄 때 쓴다 */
  function sceneHeight(obj) {
    var t = three();
    var b = new t.Box3().setFromObject(obj);
    return Math.max(1e-4, b.max.y - b.min.y);
  }

  function retargetInto(c, src) {
    var t = three();
    if (!t || !t.SkeletonUtils || !t.SkeletonUtils.retargetClip) { return []; }
    var tgt = firstSkinned(c.gltf.scene), s = firstSkinned(src.gltf.scene);
    if (!tgt || !s) { return []; }
    /* 옮기는 동안 뼈가 실제로 움직이므로 **사본**으로 굴린다 —
       원본을 굴리면 그 모델을 쓰는 다른 배우가 같이 뒤틀린다 */
    var tc = cloneScene(c.gltf), sc = cloneScene(src.gltf);
    var tm = firstSkinned(tc), sm = firstSkinned(sc);
    if (!tm || !sm) { return []; }
    tc.updateMatrixWorld(true); sc.updateMatrixWorld(true);

    /* **뼈대 크기를 맞춘다.** `retargetClip` 은 회전은 월드 자세로 풀어 주지만
       **엉덩이(hip)의 위치만은 원본 값을 그대로 옮긴다** — 되돌려 주는 것은
       hip 이 아닌 뼈뿐이다(`preserveBonePositions`). 그런데 몸짓 원본
       `Knight.glb` 는 키 5.60 으로 만들어져 있고 옮겨 입을 다섯 벌은 1.87 이라
       **세 배**다. 그대로 옮기면 엉덩이가 세 배 높이로 튀고 발은 땅에 붙은 채라
       몸이 늘어난다 — 재 보니 **폭이 키의 4.3 배**가 됐고, 그렇게 뭉개진 메시는
       화면에서 아예 사라졌다(2026-08-28 에 사용자가 발견했다).
       `options.scale` 이 정확히 이 자리에 곱해지는 값이다 */
    var mul = sceneHeight(tc) / sceneHeight(sc);

    /* **뼈 이름표를 손으로 만들어 준다.** 이것이 없으면 옮겨지지 않는다.
       번들된 `SkeletonUtils.retarget` 은 목표 뼈의 짝을 `options.names[뼈이름]`
       으로만 찾는다 — 세 군데 중 두 군데에 `|| bone.name` 되돌림이 **없어서**,
       표를 안 주면 `undefined` 로 찾다가 **한 뼈도 못 맞춘다**(직접 번들 소스를
       읽고 알았다). 이름이 같은 뼈끼리 항등으로 이어 준다 */
    var names = boneNameMap(tm, sm);
    if (!names.count) { return []; }

    var out = [], i, clip;
    for (i = 0; i < src.clips.length; i++) {
      try {
        clip = t.SkeletonUtils.retargetClip(tm, sm, src.clips[i],
          { hip: 'Hips', scale: mul, names: names.map });
        if (clip) { clip.name = src.clips[i].name; out.push(clip); }
      } catch (e) { /* 이 클립 하나만 건너뛴다 */ }
    }
    c.retargetScale = mul;
    return out;
  }

  /** 몸짓을 옮겨 입힐까 — 0 이면 안 입는다(클립 0 벌로 가만히 선다). 되돌림 손잡이 */
  function RETARGET_ON() { return core().tuned('asset3d.retarget', 1) ? true : false; }

  /** 몸짓 원본을 받아 두고, 그것을 이 몸에 입힌 뒤 기다리던 쪽에 넘긴다 */
  function dressUp(c, done) {
    if (!RETARGET_ON()) { done(); return; }
    acquire(ANIM_SRC, function (src) {
      if (src && src.clips && src.clips.length) {
        c.clips = retargetInto(c, src);
        c.map = mapClips(c.clips.map(function (a) { return a.name; }));
        c.dressed = true;
      }
      done();
    });
  }

  /**
   * **받은 그대로의 PBR 재질을 벗긴다.** Quaternius 인물·짐승 GLB 는 다 같은
   * `metallicFactor 0.4` 를 지고 온다 — 금속 반사는 환경맵(IBL)이 있어야
   * 밝게 보이는데 이 판은 방향광·반구광 둘뿐이라 환경맵이 없다. 그 결과
   * 배우가 화면에서 **거의 새까맣게** 선다(2026-08-29, 사용자가 발견했다 —
   * "캐릭터가 깨져 보인다"). 건물·나무는 `prop3d.js` 가 이미 빛깔만 뽑아 Lambert
   * 로 갈아 끼우고 있어 멀쩡했는데, 배우(`asset3d`)만 원본 재질을 그대로 뒀다.
   * **빛깔만 남기고 Lambert 로 바꾼다** — 스킨 메시도 그대로 움직인다(재질
   * 종류는 스키닝과 무관하다). 사본이 아니라 **원본을 바로 고친다** — 이
   * 모델을 처음 받은 그 순간(캐시에 한 번) 뿐이라 다른 배우와 부딪히지 않는다.
   */
  function delam(root) {
    var t = three();
    root.traverse(function (o) {
      if (!o.isMesh || !o.material) { return; }
      var one = Array.isArray(o.material) ? o.material : [o.material];
      var out = one.map(function (m) {
        if (!m || (!m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial)) { return m; }
        return new t.MeshLambertMaterial({
          color: m.color ? m.color.clone() : new t.Color(0xffffff),
          map: m.map || null, transparent: !!m.transparent, opacity: m.opacity,
          alphaTest: m.alphaTest || 0, side: m.side
        });
      });
      o.material = Array.isArray(o.material) ? out : out[0];
    });
  }

  function acquire(url, done) {
    var c = cache[url];
    if (c && c.state === 'ok') { done(c); return; }
    if (c && c.state === 'fail') { done(null); return; }
    if (c) { c.waiting.push(done); return; }

    var ld = loader();
    if (!ld) { cache[url] = { state: 'fail', waiting: [] }; done(null); return; }
    c = cache[url] = { state: 'load', waiting: [done] };
    ld.load(url, function (gltf) {
      c.state = 'ok';
      c.gltf = gltf;
      delam(gltf.scene);
      c.clips = gltf.animations || [];
      c.map = mapClips(c.clips.map(function (a) { return a.name; }));
      /* 제 몸짓이 없으면 원본에서 옮겨 입힌다 (원본 자신은 빼고 — 무한 재귀,
         이미 같은 뼈대인 몸·옷·머리도 빼고 — `buildHero` 가 따로 물린다) */
      if (needsRetarget(c) && url !== ANIM_SRC && !SKIP_AUTORETARGET[url]) {
        dressUp(c, function () { flush(c, c); });
        return;
      }
      flush(c, c);
    }, null, function () {
      /* 없는 파일·file:// 막힘·깨진 모델 — 전부 같은 결말이다. 도형으로 남는다 */
      c.state = 'fail';
      flush(c, null);
    });
  }

  function flush(c, arg) {
    var w = c.waiting; c.waiting = [];
    for (var i = 0; i < w.length; i++) { w[i](arg); }
  }

  /**
   * 이 배우를 무슨 빛깔로 물들이나 — **순수 함수다**(자가진단이 따로 본다).
   *
   * 모델 한 벌을 일흔 명이 나눠 쓰면 다 같은 사람이 된다. 그래서 **세력 빛깔**로
   * 물들인다: 촉은 초록, 위는 파랑… 세력이 없으면 **id 해시로 색상환을 돈다** —
   * 아무 두 사람도 같은 빛깔이 되지 않게.
   *
   * 흰 옷(1,1,1)에 곱하는 값이라 **너무 어두우면 안 된다** — 0.55 아래로 안 간다.
   * 물들이지 않을 것은 null 을 준다(짐승은 제 털빛이 맞다).
   */
  function tintOf(kind, ref) {
    if (kind !== 'hero' || !ref) { return null; }
    var t = three();
    if (!t) { return null; }
    var D = global.DG.data;
    /* 바탕색 — 제 빛깔이 있으면 그것(주민 열 사람은 저마다 색을 갖고 있다),
       없으면 세력 빛깔(촉·위·오·고구려…), 그것도 없으면 잿빛 */
    var base = ref.color || null;
    if (!base && ref.faction && D && D.faction) { base = D.faction(ref.faction).color; }
    if (!base) { base = '#8a94a6'; }

    /* **같은 세력 안에서도 갈라야 한다.** 촉 사람 여럿이 다 같은 초록이면
       한 벌을 나눠 쓰는 티가 그대로 난다 — id 해시로 색상과 밝기를 조금씩 민다 */
    var s = String(ref.id || ref.name || ''), i, h = 0;
    for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    var C = new t.Color(base);
    var hsl = { h: 0, s: 0, l: 0 };
    C.getHSL(hsl);
    var dh = ((h % 1000) / 1000 - 0.5) * 0.14;          // ±0.07 바퀴
    var dl = (((h >> 10) % 1000) / 1000 - 0.5) * 0.26;  // ±0.13
    /* 흰 옷에 곱하는 값이라 **너무 어두우면 안 된다** — 0.42 아래로 안 간다 */
    C.setHSL((hsl.h + dh + 1) % 1, Math.min(1, hsl.s * 0.9 + 0.12),
             Math.max(0.42, Math.min(0.82, hsl.l + dl)));
    return '#' + C.getHexString();
  }

  var tintCache = {};

  /** 복제한 모델의 재질을 물들인다 — 원본은 안 건드린다(다른 배우가 같이 쓴다) */
  function applyTint(model, hex) {
    var t = three();
    if (!hex || !t) { return model; }
    var tc = new t.Color(hex);
    model.traverse(function (o) {
      if (!o.isMesh || !o.material) { return; }
      var src = Array.isArray(o.material) ? o.material[0] : o.material;
      var key = (src.uuid || '') + '|' + hex;
      if (!tintCache[key]) {
        var m = src.clone();
        m.color = new t.Color(src.color ? src.color.getHex() : 0xffffff).multiply(tc);
        tintCache[key] = m;
      }
      o.material = tintCache[key];
    });
    return model;
  }

  /** 뼈대가 있는 모델은 그냥 복제하면 뼈대를 나눠 쓴다 — 배우 스물이 같이 걷는다 */
  function cloneScene(gltf) {
    var t = three();
    if (t.SkeletonUtils && t.SkeletonUtils.clone) { return t.SkeletonUtils.clone(gltf.scene); }
    return gltf.scene.clone(true);
  }

  /**
   * **모듈형 모델은 부위 변형을 전부 켜 놓고 온다.**
   * `Farmer_Body_1..4` · `Farmer_Head_1..5` 처럼 고를 것들이 **동시에 겹쳐** 있어
   * 그대로 세우면 모자 다섯을 겹쳐 쓴 덩어리가 된다. 직접 열어 보고 알았다.
   *
   * 그래서 **무리마다 하나씩만 켠다.** 어느 것을 켜는지는 `ref.id` 해시가 정하므로
   * 같은 사람은 늘 같은 차림이고, 사람이 다르면 차림이 갈린다 —
   * 몸 한 벌에서 **스무 가지쯤**이 나온다(몸통 넷 × 머리 다섯).
   *
   * 무리 이름은 이름 끝의 `_숫자` 를 떼어 만든다. `_숫자` 가 없는 것(다리·발 하나뿐)은
   * 무리가 하나뿐이므로 그대로 켜 둔다.
   */
  var REGION = /_(body|head|legs?|feet|foot|hair|hat|arms?|torso|pants|shoes?|face|beard|helmet|cape|skirt|top|bottom|acc\w*)$/i;

  /** 무리 하나의 세로 범위 — 다리 위에 몸통이, 몸통 위에 머리가 이어지는지 잰다.
   *  잴 수 없으면(three 가 없거나, 자가진단의 가짜 traverse 뭉치) null 을 준다 —
   *  그러면 `pickPieces` 가 옛 방식(해시만으로 고르기)으로 물러난다. */
  function yRange(o) {
    var t = three();
    if (!t || !o.isMesh || !o.geometry) { return null; }
    try {
      var b = new t.Box3().setFromObject(o);
      if (!isFinite(b.min.y) || !isFinite(b.max.y)) { return null; }
      return { min: b.min.y, max: b.max.y };
    } catch (e) { return null; }
  }

  /* 무리끼리 몸이 이어지려면 이 정도 틈은 넘어가 준다(옷깃이 살짝 뜨는 정도) —
     실제로 벌어졌던 틈(0.3 안팎)에 비하면 훨씬 작다. 모델의 키를 1로 보는 단위다. */
  var JOIN_GAP = 0.05;

  function pickPieces(model, ref) {
    /* **가지런히 잰다.** 갓 복제한 장면은 뼈대 자세가 계층에 안 갱신돼 있을 수
       있다 — 안 갱신하고 재면 몸통이 스무 배로 잘못 잰다(normalize() 의 같은 함정) */
    if (typeof model.updateMatrixWorld === 'function') { model.updateMatrixWorld(true); }

    var groups = {}, base = null, measurable = true;
    model.traverse(function (o) {
      if (!o.isMesh) { return; }
      var m = /^(.*)_(\d+)$/.exec(o.name || '');
      /* **부위 이름이 붙은 것만 변형으로 본다.** `Knight_1·2·3` 은 변형이 아니라
         한 사람의 부품(몸·칼·방패)이라, 이름 끝의 숫자만 보고 고르면 둘이 꺼져
         칼만 남은 사람이 선다. 실제로 그렇게 됐다 */
      if (!m || !REGION.test(m[1])) {
        /* 무리가 아닌 것(다리 하나뿐인 몸통 등)은 항상 서 있다 — 그 꼭대기가
           첫 무리를 이을 발판이다 */
        var r = yRange(o);
        if (r) { base = base ? { min: Math.min(base.min, r.min), max: Math.max(base.max, r.max) } : r; }
        return;
      }
      (groups[m[1]] = groups[m[1]] || []).push(o);
    });
    var s = String((ref && (ref.id || ref.name)) || ''), i, h = 0;
    for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }

    var names = [], g;
    for (g in groups) { if (groups.hasOwnProperty(g)) { names.push(g); } }

    /* **다리부터 머리 순서로 잇는다.** 무리 이름은 모델마다 다르므로(`Legs`·
       `Head`·`Body`…) 이름이 아니라 **잰 높이**로 순서를 정한다 — 낮은 무리부터
       하나씩 골라, 이미 고른 것들의 꼭대기에 잘 닿는 조각을 우선한다. 안 그러면
       해시가 몸통 없이 머리와 다리만 고를 수 있다(2026-08-29, 사용자가 실기기로
       발견 — 갓 하나가 허공에 떠 있었다). 잴 수 없으면(자가진단) 그냥 등장 순서로
       돈다 — 어차피 결과는 안 본다, 무리가 하나만 켜지는지만 본다. */
    var ranged = {}, gi;
    for (gi = 0; gi < names.length; gi++) {
      ranged[names[gi]] = groups[names[gi]].map(yRange);
      if (ranged[names[gi]].indexOf(null) >= 0) { measurable = false; }
    }
    if (measurable) {
      names.sort(function (ga, gb) {
        var ra = ranged[ga].reduce(function (a, r) { return Math.min(a, r.min); }, Infinity);
        var rb = ranged[gb].reduce(function (a, r) { return Math.min(a, r.min); }, Infinity);
        return ra - rb;
      });
    }

    var top = (measurable && base) ? base.max : -Infinity;
    var n = 0;
    for (gi = 0; gi < names.length; gi++) {
      var list = groups[names[gi]];
      if (list.length < 2) {
        if (measurable && list.length === 1) {
          var r1 = yRange(list[0]);
          if (r1) { top = Math.max(top, r1.max); }
        }
        continue;
      }
      /* 무리마다 다른 자릿수를 봐야 몸통과 머리가 같이 움직이지 않는다.
         **부호 없는 자리이동(`>>>`)이어야 한다** — `>>` 는 32비트 부호를 타서
         음수가 나오고, 그러면 무리 전체가 꺼져 몸통도 머리도 없는 사람이 선다.
         실제로 관우가 다리만 남았다 */
      var hashPick = (h >>> ((n * 3) % 29)) % list.length;
      n++;

      var keep = hashPick;
      if (measurable) {
        var ranges = ranged[names[gi]];
        if (top === -Infinity) { top = Math.min.apply(null, ranges.map(function (r) { return r.min; })); }
        var bestGap = Infinity;
        keep = -1;
        for (i = 0; i < ranges.length; i++) {
          var gap = ranges[i].min - top;
          if (gap <= JOIN_GAP && i === hashPick) { keep = i; break; }   // 이어지면 해시를 그대로 쓴다
          if (Math.abs(gap) < bestGap) { bestGap = Math.abs(gap); keep = i; }
        }
        top = Math.max(top, ranges[keep].max);
      }
      for (i = 0; i < list.length; i++) { list[i].visible = (i === keep); }
    }
    return model;
  }

  /**
   * 키 1 로 눕혀 담는다. `mul` 을 주면 그 키로 선다(`heightMul` 이 정한다).
   *
   * 눕힌 **뒤의 폭**을 껍데기에 적어 둔다 — 깃대를 건물 옆에 세우려면
   * 이 건물이 얼마나 넓은지를 알아야 하는데, 탑(폭비 0.28)과 여관(1.15)이
   * 네 배 넘게 차이 난다. 못박은 값을 쓰면 한쪽은 벽에 박히고 한쪽은 허공에 뜬다.
   */
  function normalize(obj, mul) {
    var t = three();
    /* **재기 전에 월드 행렬을 갱신한다.** 이 한 줄이 없으면 계층에 걸린 스케일이
       빠진 채로 재어, 키가 스무 배로 나오고 그만큼 잘게 줄여 놓는다 —
       **사람이 몸통만 옆으로 4배 넓은 조각**이 되어 화면에서 사라졌다.
       (`prop3d.partsOf` 는 이 줄이 있어서 나무·집은 멀쩡했다. 여기만 빠져 있었다) */
    obj.updateMatrixWorld(true);
    var b = new t.Box3().setFromObject(obj);
    var f = fit({
      minX: b.min.x, maxX: b.max.x, minY: b.min.y, maxY: b.max.y, minZ: b.min.z, maxZ: b.max.z
    });
    var m = mul || 1;
    var wrap = new t.Group();
    obj.scale.setScalar(f.scale * m);
    obj.position.set(f.dx * m, f.dy * m, f.dz * m);
    wrap.userData.span = {
      w: (b.max.x - b.min.x) * f.scale * m,
      d: (b.max.z - b.min.z) * f.scale * m,
      h: m
    };
    wrap.add(obj);
    return wrap;
  }

  /** 표식 깃발을 건물 옆에 세운다 — 규격은 `markOf` 가 정한다(순수) */
  function addMark(wrap, mark) {
    var t = three();
    if (!t || !mark || !wrap) { return wrap; }
    var span = (wrap.userData && wrap.userData.span) || { w: 1, d: 1, h: 1 };
    var h = span.h || 1;
    /* 앞을 가리지 않게 **옆 뒤쪽**에 세운다 — 도형 성채도 뒤 왼편에 꽂혀 있었다 */
    var x = span.w / 2 + h * 0.07;
    var z = -(span.d / 2) - h * 0.05;
    var poleH = h * mark.pole;
    var pole = new t.Mesh(
      new t.CylinderGeometry(h * 0.013, h * 0.013, poleH, 5),
      new t.MeshLambertMaterial({ color: 0x6b5533 })
    );
    pole.position.set(x, poleH / 2, z);
    wrap.add(pole);
    var fw = h * mark.w, fh = h * mark.flag;
    var cloth = new t.Mesh(
      new t.BoxGeometry(fw, fh, h * 0.008),
      new t.MeshLambertMaterial({ color: new t.Color(mark.color) })
    );
    cloth.position.set(x + fw / 2, poleH - fh * 0.62, z);
    wrap.add(cloth);
    return wrap;
  }

  /**
   * 캡슐·상자로 세운다 — 마지막 되돌림 자리 (PLAN 49절).
   * `actor3d` 가 모르는 종류가 들어와도 화면에 **무언가는** 선다.
   */
  function primitive(kind, ref) {
    var t = three();
    if (!t) { return null; }
    var g = new t.Group();
    var col = (ref && (ref.color || ref.tint)) || '#8a94a6';
    var m = new t.MeshLambertMaterial({ color: new t.Color(col) });
    var body;
    if (kind === 'station' || kind === 'fort' || kind === 'building') {
      body = new t.Mesh(new t.BoxGeometry(0.9, 1, 0.9), m);
      body.position.y = 0.5;
    } else {
      body = new t.Mesh(new t.CapsuleGeometry(0.22, 0.52, 4, 10), m);
      body.position.y = 0.5;
    }
    g.add(body);
    g.userData.primitive = true;
    return g;
  }

  /**
   * 인물 하나 — **몸 위에 옷·머리를 얹어 한 뼈대에 묶는다.**
   *
   * 셋 다 뼈 이름·순서가 완전히 같으므로(직접 대조했다) 옷·머리의 스킨 메시를
   * `mesh.bind(몸의 스켈레톤, mesh.bindMatrix)` 로 다시 물리기만 하면 된다 —
   * `pickPieces`(부위 변형 고르기)도 `retargetClip`(몸짓 옮겨 입히기)도 필요
   * 없다. 이게 옛 표(Farmer·Worker·Lady)가 걷다가 몸이 갈라지던 근본 원인
   * (뼈대가 부위마다 따로였다)을 애초에 없앤 자리다.
   *
   * 몸의 메시(머리·눈썹·눈 포함)는 옷에 안 가려지는 손·목·얼굴만 남기고 옷이
   * 그대로 덮는다 — Quaternius 가 옷 쪽에도 노출 피부(손·팔) 재질을 따로
   * 태워 보내는 것이 그 뜻이다.
   */
  function assembleHero(parts, ref) {
    var bodyScene = cloneScene(parts.body.gltf);
    var master = firstSkinned(bodyScene);
    if (!master || !master.skeleton) { throw new Error('몸에 스켈레톤이 없다'); }
    var skeleton = master.skeleton;

    [parts.outfit, parts.hair].forEach(function (p) {
      if (!p || !p.gltf) { return; }
      var scene = cloneScene(p.gltf);
      var meshes = [];
      scene.traverse(function (o) { if (o.isSkinnedMesh) { meshes.push(o); } });
      meshes.forEach(function (m) {
        m.bind(skeleton, m.bindMatrix);
        bodyScene.add(m);
      });
    });

    var model = normalize(bodyScene, heightMul('hero', ref));
    applyTint(model, tintOf('hero', ref));
    return model;
  }

  /**
   * 인물 하나를 조합형(몸+옷+머리)으로 세운다 — `build()` 가 `kind==='hero'`
   * 일 때 이 앞에서 부른다. 넷(몸·옷·머리·몸짓 원본)을 한꺼번에 받아 오고
   * 넷 다 모이면 `assembleHero()` 로 묶는다.
   */
  function buildHero(ref, makeShape) {
    var t = three();
    var rec = heroRecipe(ref);
    if (!rec) { return null; }

    var shell = new t.Group();
    var shape = makeShape ? makeShape() : null;
    if (!shape) { shape = primitive('hero', ref); }
    if (shape) {
      shell.add(shape);
      shell.userData.rig = shape.userData && shape.userData.rig;
    }
    shell.userData.assetUrl = rec.body;
    shell.userData.assetState = 'shape';
    built++;

    var parts = {}, pending = 4;
    function onOne() { pending--; if (pending === 0) { assemble(); } }
    acquire(rec.body, function (c) { parts.body = c; onOne(); });
    /* outfit·hair 는 조합형(옛 Quaternius) 레시피에만 있다 — QRPG 몸(통짜 스킨)은
       둘 다 없으니 헛수고로 받으러 가지 않고 바로 다음 칸으로 넘어간다 */
    if (rec.outfit) { acquire(rec.outfit, function (c) { parts.outfit = c; onOne(); }); } else { onOne(); }
    if (rec.hair) { acquire(rec.hair, function (c) { parts.hair = c; onOne(); }); } else { onOne(); }
    /* QRPG는 몸 파일 자체에 클립이 있다 — `rec.anim` 이 `rec.body` 와 같은 파일이면
       같은 캐시를 다시 받아 그 클립을 그대로 쓴다. 옛 조합형은 `rec.anim` 이 없어
       공용 ANIM_SRC(UAL) 로 몸짓을 옮겨 입는다 */
    acquire(rec.anim || ANIM_SRC, function (c) { parts.anim = c; onOne(); });

    function assemble() {
      if (!parts.body) { shell.userData.assetState = 'fail'; return; }
      var model;
      try {
        model = assembleHero(parts, ref);
      } catch (e) {
        shell.userData.assetState = 'fail';
        broke = (e && e.message) ? e.message : 'hero assemble 실패';
        return;
      }
      while (shell.children.length) { shell.remove(shell.children[0]); }
      shell.add(model);
      shell.userData.rig = null;
      shell.userData.assetState = 'glb';
      swapped++;

      var animC = parts.anim;
      if (animC && animC.clips && animC.clips.length) {
        var mx = new t.AnimationMixer(model);
        var acts = {}, i;
        for (i = 0; i < animC.clips.length; i++) { acts[animC.clips[i].name] = mx.clipAction(animC.clips[i]); }
        shell.userData.mixer = mx;
        shell.userData.actions = acts;
        shell.userData.clipMap = mapClips(animC.clips.map(function (a) { return a.name; }));
        shell.userData.anim = null;
      }
    }
    return shell;
  }

  /**
   * 배우 하나를 GLB 로 세운다 — `actor3d.build` 가 이 앞에서 부른다.
   *
   * GLB 는 받아 오는 데 시간이 걸리는데 지도는 지금 그려야 한다. 그래서
   * **껍데기(Group)** 를 먼저 돌려주고 그 안에 도형을 넣어 둔다. 다 받으면
   * 안의 것만 갈아 끼운다 — 껍데기를 쥔 `world3d` 는 아무것도 모른 채 그대로 돈다.
   *
   * `kind === 'hero'` 는 파일 하나가 아니라 몸+옷+머리 셋을 묶는 조합형이라
   * `buildHero()` 에 넘긴다(아래) — 그 안에서 GLB_ON 손잡이도 따로 본다.
   *
   * @param makeShape 도형을 만드는 함수 (actor3d 가 자기 것을 건네준다)
   */
  function build(kind, ref, makeShape) {
    var t = three();
    if (!t) { return null; }
    if (kind === 'hero') {
      return GLB_ON() ? buildHero(ref, makeShape) : null;
    }
    var url = wants(kind, ref) ? urlOf(kind, ref) : null;
    if (!url) { return null; }

    var shell = new t.Group();
    var shape = makeShape ? makeShape() : null;
    if (!shape) { shape = primitive(kind, ref); }
    if (shape) {
      shell.add(shape);
      /* 도형으로 서 있는 동안은 `actor3d.step` 이 관절을 돌려야 한다 */
      shell.userData.rig = shape.userData && shape.userData.rig;
    }
    shell.userData.assetUrl = url;
    shell.userData.assetState = 'shape';
    built++;

    acquire(url, function (c) {
      if (!c) { shell.userData.assetState = 'fail'; return; }
      var model;
      try {
        model = cloneScene(c.gltf);
        pickPieces(model, ref);           // 부위 변형은 무리마다 하나씩만
        model = normalize(model, heightMul(kind, ref));
        applyTint(model, tintOf(kind, ref));
        /* 건물은 물들이지 않는다(제 빛깔이 맞다) — 대신 **표식 깃발**을 얹는다 */
        addMark(model, markOf(kind, ref));
      } catch (e) {
        shell.userData.assetState = 'fail';
        broke = (e && e.message) ? e.message : 'swap 실패';
        return;
      }
      while (shell.children.length) { shell.remove(shell.children[0]); }
      shell.add(model);
      shell.userData.rig = null;                 // 이제 관절은 mixer 가 돌린다
      shell.userData.assetState = 'glb';
      swapped++;
      if (c.clips && c.clips.length) {
        var mx = new t.AnimationMixer(model);
        var acts = {}, i;
        for (i = 0; i < c.clips.length; i++) { acts[c.clips[i].name] = mx.clipAction(c.clips[i]); }
        shell.userData.mixer = mx;
        shell.userData.actions = acts;
        shell.userData.clipMap = c.map;
        shell.userData.anim = null;
      }
    });
    return shell;
  }

  /**
   * 한 프레임 — GLB 면 여기서 처리하고 true 를, 아니면 false 를 준다.
   * false 면 `actor3d` 가 제 도형 관절을 돌린다.
   */
  function step(node, o) {
    if (!node || !node.userData || !node.userData.mixer) { return false; }
    var u = node.userData;
    var want = o && o.anim;
    if (!want) { want = (o && o.walking) ? ((o.speed || 0) > 1.6 ? 'run' : 'walk') : 'idle'; }
    play(node, want);
    var t = (o && o.t) || 0;
    var dt = u.lastT === undefined ? 0 : Math.max(0, Math.min(0.25, t - u.lastT));
    u.lastT = t;
    u.mixer.update(dt);
    return true;
  }

  /** 자리 이름(idle·walk…)으로 바꿔 튼다. 갑자기 끊기지 않게 0.2초 넘긴다 */
  function play(node, slot) {
    var u = node.userData;
    if (!u.mixer || u.anim === slot) { return false; }
    var name = u.clipMap && u.clipMap[slot];
    var next = name && u.actions[name];
    if (!next) { return false; }
    var prev = u.anim && u.clipMap[u.anim] && u.actions[u.clipMap[u.anim]];
    next.reset().play();
    if (prev && prev !== next) { prev.crossFadeTo(next, 0.2, false); }
    u.anim = slot;
    return true;
  }

  /** 눈으로 확인할 때 — 표에 몇 줄이고 무엇이 서 있는지 */
  function stats() {
    var urls = Object.keys(cache), o = { registered: Object.keys(REG).length, loaded: 0, failed: 0 };
    for (var i = 0; i < urls.length; i++) {
      if (cache[urls[i]].state === 'ok') { o.loaded++; }
      if (cache[urls[i]].state === 'fail') { o.failed++; }
    }
    o.loader = !!loader();
    /* 옮겨 입힌 몸 수와 그 클립 수 — 리타기팅이 실제로 됐는지 값으로 본다 */
    o.dressed = 0; o.clips = 0; o.empty = 0;
    for (i = 0; i < urls.length; i++) {
      var c = cache[urls[i]];
      if (c.dressed) { o.dressed++; }
      if (c.state === 'ok') {
        o.clips += (c.clips ? c.clips.length : 0);
        if (!c.clips || !c.clips.length) { o.empty++; }
      }
    }
    o.built = built; o.swapped = swapped; o.broke = broke;
    return o;
  }

  global.DG = global.DG || {};
  global.DG.asset3d = {
    /* 표 — three 없이도 돈다 */
    REG: REG, register: register, keysFor: keysFor, lookup: lookup, urlOf: urlOf,
    wants: wants, chain: chain, SLOTS: SLOTS,
    /* 이름·크기 맞추기 — 순수 함수 */
    normName: normName, score: score, mapClips: mapClips, fit: fit,
    heightMul: heightMul, markOf: markOf,
    /* 세우기 — three 가 있어야 한다 */
    ready: function () { return !!three(); },
    hasLoader: function () { return !!loader(); },
    DEFAULTS: DEFAULTS, restore: restore, tintOf: tintOf, oneOf: oneOf,
    pickPieces: pickPieces,
    ANIM_SRC: ANIM_SRC, heroRecipe: heroRecipe,
    build: build, step: step, play: play, primitive: primitive, stats: stats,
    /** 표를 비운다 (진단이 제 뒤를 치울 때) */
    clear: function () {
      var k; for (k in REG) { if (Object.prototype.hasOwnProperty.call(REG, k)) { delete REG[k]; } }
      cache = {};
      return REG;
    }
  };
})(window);
