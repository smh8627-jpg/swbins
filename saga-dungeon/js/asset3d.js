/**
 * 3D 에셋 창고 — 사가고와 같은 것을 쓴다 (사가블로 4단계, PLAN 4·5·6절)
 * ---------------------------------------------------------------
 * 여태 이 판의 사람·짐승·나무·바위는 `dungeon3d.js`가 상자를 쌓아 조립했다.
 * 손으로 빚은 것이라 가볍고 늘 도는 대신, 아무리 다듬어도 손으로 빚은 티가 난다.
 *
 * 사가고가 몸이 갈라지는 문제를 근본에서 없앤 그 창고(Quaternius의 뼈대가
 * 완전히 같은 몸+옷+머리)를 **그대로** 옮겨 쓴다 — `assets/ASSET_LICENSES.md`
 * 에 적어 두었듯 `saga-go/assets/models/…`를 그대로 복사했다. 리타기팅도
 * `pickPieces`(부위 변형 고르기)도 필요 없는 것까지 그대로다.
 *
 * 이 판에는 사가고의 `world3d.js`가 없으므로 **여기서 직접 세운다** — GLB 가
 * 없거나 실패하면 `dungeon3d.js`가 원래 그리던 상자로 조용히 남는다
 * (`build()`가 돌려주는 shell 은 처음부터 그 상자를 담고 있다가 GLB 가
 * 오면 그 자리에서 갈아 끼운다).
 *
 * **표를 읽는 함수는 three 없이도 돈다** — 자가진단이 그것만 따로 본다.
 * 세우는 함수만 three 를 쓴다.
 */
(function (global) {
  'use strict';

  var T = null;
  function three() { if (!T) { T = global.THREE || null; } return T; }

  /* ── 손잡이 — 이 판의 core.js 에는 tuned 가 없다(dungeon3d.js 와 같은 사정) */
  var knobs = {};
  function tuned(k, def) {
    if (knobs[k] !== undefined) { return knobs[k]; }
    var D3 = global.DG.dungeon3d;
    if (D3 && D3.tuned) { return D3.tuned(k, def); }
    return def;
  }
  function set(k, v) { if (v === null || v === undefined) { delete knobs[k]; } else { knobs[k] = v; } return knobs; }
  function GLB_ON() { return tuned('asset3d.glb', 1) ? true : false; }

  /* ── 표 ─────────────────────────────────────────────── */
  var PEOPLE = 'assets/models/people/regular/';
  var ANIM_DIR = 'assets/models/anim/';
  var NATURE = 'assets/models/nature/';
  var ANIMALS = 'assets/models/animals/';
  var PROPS = 'assets/models/props/';
  var BLD = 'assets/models/buildings/';
  var DUN = 'assets/models/dungeon/';

  /* 2026-09-03 — 다른 네 판과 같은 이유로 사람 기본을 갈아 끼운다. Quaternius
     "RPG Character Pack"(CC0, 전사·궁수·도적·성직자·마법사·수도승 6종)은 몸 파일
     하나에 걷기·공격·사망 클립이 다 들어 있어 옷·머리·ANIM_SRC 몸짓이 필요 없다 */
  var PEOPLE_QRPG = 'assets/models/people/quaternius_rpg/';
  var HERO_RECIPES = ['Warrior', 'Ranger', 'Rogue', 'Cleric', 'Wizard', 'Monk'].map(function (n) {
    var f = PEOPLE_QRPG + n + '.gltf';
    return { key: 'qrpg_' + n.toLowerCase(), body: f, anim: f };
  });

  /* 옛 조합형 — 표 기본에서는 빠졌다. 지우지 않고 남겨 둔다(되돌림 자리) */
  var HERO_RECIPES_FALLBACK = [
    { key: 'male_peasant_buzzed', body: PEOPLE + 'Superhero_Male_FullBody.gltf',
      outfit: PEOPLE + 'Male_Peasant.gltf', hair: PEOPLE + 'Hair_Buzzed.gltf' },
    { key: 'male_ranger_long', body: PEOPLE + 'Superhero_Male_FullBody.gltf',
      outfit: PEOPLE + 'Male_Ranger.gltf', hair: PEOPLE + 'Hair_Long.gltf' },
    { key: 'male_peasant_beard', body: PEOPLE + 'Superhero_Male_FullBody.gltf',
      outfit: PEOPLE + 'Male_Peasant.gltf', hair: PEOPLE + 'Hair_Beard.gltf' },
    { key: 'female_peasant_buns', body: PEOPLE + 'Superhero_Female_FullBody.gltf',
      outfit: PEOPLE + 'Female_Peasant.gltf', hair: PEOPLE + 'Hair_Buns.gltf' },
    { key: 'female_ranger_simple', body: PEOPLE + 'Superhero_Female_FullBody.gltf',
      outfit: PEOPLE + 'Female_Ranger.gltf', hair: PEOPLE + 'Hair_SimpleParted.gltf' },
    { key: 'female_peasant_buzzed', body: PEOPLE + 'Superhero_Female_FullBody.gltf',
      outfit: PEOPLE + 'Female_Peasant.gltf', hair: PEOPLE + 'Hair_BuzzedFemale.gltf' }
  ];
  var SKIP_AUTORETARGET = {};
  HERO_RECIPES.concat(HERO_RECIPES_FALLBACK).forEach(function (r) {
    SKIP_AUTORETARGET[r.body] = true;
    if (r.outfit) { SKIP_AUTORETARGET[r.outfit] = true; }
    if (r.hair) { SKIP_AUTORETARGET[r.hair] = true; }
  });
  var ANIM_SRC = ANIM_DIR + 'UAL1_Standard.glb';

  var DEFAULTS = {
    'hero': HERO_RECIPES,
    'beast': ANIMALS + 'Wolf.glb',
    /* 몬스터 다양화 — 코끼리병처럼 몸집 큰 짐승 형 적은 소 GLB 로 대신한다
       (딱 맞는 코끼리는 CC0 로 못 찾았다, 늑대만 쓰면 다 같은 크기·모양이 된다) */
    'beast_big': ANIMALS + 'Cow.glb',
    'tree': [NATURE + 'CommonTree_1.glb', NATURE + 'CommonTree_2.glb', NATURE + 'CommonTree_3.glb'],
    'rock': [NATURE + 'Rock_1.glb', NATURE + 'Rock_2.glb', NATURE + 'Rock_3.glb'],
    /* 폐허의 기둥·무너진 벽 — 딱 맞는 "부러진 돌기둥" 낱개는 못 찾아
       `Arch.glb`(무너진 아치)로 대신한다. 사가고가 이미 같은 후보를 적어 뒀다
       (`saga-go/assets/ASSET_LICENSES.md` "사당·폐허의 다른 후보") */
    'pillar': PROPS + 'Arch.glb',
    'wall': PROPS + 'Wall.glb',
    /* 절벽 — 나무나 헤드보다 큰 산 덩이(Mountain)를 대신 세운다 */
    'cliff': [NATURE + 'Mountain_1.glb', NATURE + 'Mountain_2.glb'],
    /* 제단 — 사가고가 "사당" 후보로 적어 둔 그 Temple 을 그대로 쓴다 */
    'altar': PROPS + 'Temple.glb',
    /* 동굴 입구 — 사가고가 이미 "광산 어귀"로 적어 둔 그 Mine 을 그대로 쓴다 */
    'cavemouth': PROPS + 'Mine.glb',
    /* 천막 — 딱 맞는 "야영 텐트" 는 CC0 로 못 찾았다. 기둥+지붕 얼개가 비슷한
       장터 좌판(MarketStand)을 대신 세운다 — 완벽한 대역은 아니다(주석에 적어
       둔다, 나중에 진짜 텐트를 구하면 이 한 줄만 바꾸면 된다) */
    'tent': BLD + 'MarketStand_1.glb',
    /* 마을(모루골) 건물 — 집 넷은 자리마다 씨앗으로 섞어 세운다(나무·바위와 같은 요령) */
    'house': [BLD + 'House_1.glb', BLD + 'House_2.glb', BLD + 'House_3.glb', BLD + 'House_4.glb'],
    'well': BLD + 'Well.glb',
    'blacksmith': BLD + 'Blacksmith.glb',
    /* 방 안 장식(PLAN 6절) — KayKit Dungeon Remastered(CC0). 여태 상자를 쌓아
       흉내 내던 자리를 실물로 갈아 끼운다. `dg:` 로 묶은 것은 **들판(field)의
       'pillar'·'wall' 과는 다른 자리**라는 뜻이다 — 저 둘은 사가고에서 물려받은
       Arch.glb·Wall.glb 를 그대로 쓰므로 여기서 안 건드린다.
       출처는 `assets/ASSET_LICENSES.md` 참고 */
    'dg:chest': DUN + 'chest.glb',
    'dg:torch': DUN + 'torch_mounted.gltf.glb',
    'dg:pillar': DUN + 'pillar.gltf.glb',
    /* 갇힌 우리(POI: 이벤트방) — 실제 감옥 창살 기둥. 자리마다 넷을 둘러 세운다 */
    'dg:cage': DUN + 'barrier_column.gltf.glb',
    /* 다음 방 문 — 열린 아치 하나만 받았다. 잠금·해금은 모델을 안 바꾸고
       색(tint)만 바꾼다 — 2D 가 오래 쓰던 신호(잠기면 어둡게, 풀리면 금빛)를
       그대로 지킨다 */
    'dg:door': DUN + 'wall_doorway.glb',
    /* 방 구석 잡동사니(순수 장식, PLAN 6절 보강) — 술통·상자 더미. 판정 신호가
       아니라서 GLB 를 못 받으면 그냥 안 세운다(다른 dg: 항목과 달리 fallback
       도형을 안 둔다) */
    'dg:barrel': DUN + 'barrel_large.gltf.glb',
    'dg:crate': DUN + 'box_small.gltf.glb',
    'dg:crates': DUN + 'crates_stacked.gltf.glb',
    /* 보스방 벽 현수막 — 색은 세력이 아니라 "여기가 보스방" 신호라 하나로 고정 */
    'dg:banner': DUN + 'banner_thin_red.gltf.glb',
    /* 행상 좌판 — MarketStand(=`tent`) 위에 놓일 긴 상. 딱 맞는 "행상 수레"는
       못 찾아 대신한다 */
    'dg:table': DUN + 'table_long.gltf.glb'
  };
  var REG = {};
  function restore() { var k; for (k in DEFAULTS) { if (DEFAULTS.hasOwnProperty(k)) { REG[k] = DEFAULTS[k]; } } return REG; }
  restore();
  function register(key, url) { if (!key) { return REG; } if (url) { REG[key] = url; } else { delete REG[key]; } return REG; }

  function lookup(kind) { return REG[kind] ? { key: kind, url: REG[kind] } : null; }

  /** 표 한 줄이 여럿이면 씨앗 문자열 해시로 하나를 고른다 — 같은 자리는 늘 같은 것 */
  function oneOf(list, seed) {
    if (!list) { return null; }
    if (typeof list === 'string') { return list; }
    if (!list.length) { return null; }
    var s = String(seed || ''), i, h = 0;
    for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return list[h % list.length];
  }
  function urlOf(kind, seed) {
    var h = lookup(kind);
    if (!h) { return null; }
    var v = oneOf(h.url, seed);
    if (v && typeof v === 'object') { return v.key || null; }
    return v;
  }
  function heroRecipe(seed) {
    var h = lookup('hero');
    if (!h) { return null; }
    var v = oneOf(h.url, seed);
    return (v && typeof v === 'object' && v.body) ? v : null;
  }
  function wants(kind, seed) { return GLB_ON() && !!urlOf(kind, seed); }

  /* ── 애니메이션 이름 맞추기 — 사가고와 같은 요령 ─────── */
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
  function normName(s) {
    var n = String(s || '');
    if (n.indexOf('|') >= 0) { n = n.split('|').pop(); }
    n = n.replace(/\.\d+$/, '');
    return n.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  function score(slot, name) {
    var ws = WORDS[slot] || [], i, w, best = 0, s;
    for (i = 0; i < ws.length; i++) {
      w = ws[i];
      if (name === w) { s = 100; } else if (name.indexOf(w) === 0) { s = 70; }
      else if (name.indexOf(w) >= 0) { s = 40; } else { continue; }
      s -= i;
      if (s > best) { best = s; }
    }
    return best;
  }
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
    pairs.sort(function (a, b) { return (b.s - a.s) || (a.si - b.si) || (a.ci - b.ci); });
    var out = {}, taken = {}, i, p;
    for (i = 0; i < pairs.length; i++) {
      p = pairs[i];
      if (out[p.slot] || taken[p.raw]) { continue; }
      out[p.slot] = p.raw; taken[p.raw] = true;
    }
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

  /* ── 크기 맞추기 — 키 1 로 눕히고 세우는 쪽이 배율(mul)을 준다 ───── */
  function fit(box) {
    var h = (box.maxY - box.minY) || 1;
    var s = 1 / h;
    return { scale: s, dy: -box.minY * s, dx: -((box.minX + box.maxX) / 2) * s, dz: -((box.minZ + box.maxZ) / 2) * s };
  }
  function normalize(obj, mul) {
    var t = three();
    obj.updateMatrixWorld(true);
    var b = new t.Box3().setFromObject(obj);
    var f = fit({ minX: b.min.x, maxX: b.max.x, minY: b.min.y, maxY: b.max.y, minZ: b.min.z, maxZ: b.max.z });
    var m = mul || 1;
    var wrap = new t.Group();
    obj.scale.setScalar(f.scale * m);
    obj.position.set(f.dx * m, f.dy * m, f.dz * m);
    wrap.add(obj);
    return wrap;
  }

  /* ── PBR 을 벗긴다 — 환경맵 없는 이 판의 조명에 그대로 쓰면 새까맣게
   *  선다(사가고가 2026-08-29 에 먼저 밟은 함정, `SAGA-HANDOFF.md` 참고) */
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

  var cache = {};
  function loader() {
    var t = three();
    if (!t || !t.GLTFLoader) { return null; }
    if (!loader.it) { loader.it = new t.GLTFLoader(); }
    return loader.it;
  }
  function firstSkinned(obj) {
    var found = null;
    obj.traverse(function (o) { if (!found && o.isSkinnedMesh) { found = o; } });
    return found;
  }
  function cloneScene(gltf) {
    var t = three();
    if (t.SkeletonUtils && t.SkeletonUtils.clone) { return t.SkeletonUtils.clone(gltf.scene); }
    return gltf.scene.clone(true);
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
      c.state = 'ok'; c.gltf = gltf;
      delam(gltf.scene);
      c.clips = gltf.animations || [];
      c.map = mapClips(c.clips.map(function (a) { return a.name; }));
      flush(c, c);
    }, null, function () { c.state = 'fail'; flush(c, null); });
  }
  function flush(c, arg) { var w = c.waiting; c.waiting = []; for (var i = 0; i < w.length; i++) { w[i](arg); } }

  /** 이 재질을 hex 로 물들인다(흰 옷에 곱하는 값이라 너무 어두우면 안 된다) — 없으면 안 물들인다 */
  var tintCache = {};
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

  /** 몸 하나 — 몸 위에 옷·머리를 얹어 한 뼈대에 묶는다(사가고와 같은 요령,
   *  세 파일이 뼈 이름·순서까지 완전히 같아 그냥 bind() 하면 된다) */
  function assembleHero(parts, mul, tintHex) {
    var bodyScene = cloneScene(parts.body.gltf);
    var master = firstSkinned(bodyScene);
    if (!master || !master.skeleton) { throw new Error('몸에 스켈레톤이 없다'); }
    var skeleton = master.skeleton;
    [parts.outfit, parts.hair].forEach(function (p) {
      if (!p || !p.gltf) { return; }
      var scene = cloneScene(p.gltf), meshes = [];
      scene.traverse(function (o) { if (o.isSkinnedMesh) { meshes.push(o); } });
      meshes.forEach(function (m) { m.bind(skeleton, m.bindMatrix); bodyScene.add(m); });
    });
    var model = normalize(bodyScene, mul);
    applyTint(model, tintHex);
    return model;
  }

  /**
   * 인물 하나 — 몸+옷+머리+몸짓을 한꺼번에 받아 온다.
   * @param seed      표에서 조합을 고를 씨앗(사람 id 등)
   * @param mul       세우는 키(로직 단위)
   * @param tintHex   물들일 색(없으면 원래 옷 빛깔 그대로)
   * @param makeShape 도형을 만드는 함수 — GLB 오기 전까지, 실패하면 계속 이것
   */
  function buildHero(seed, mul, tintHex, makeShape) {
    var t = three();
    var rec = heroRecipe(seed);
    var shell = new t.Group();
    var shape = makeShape ? makeShape() : null;
    if (shape) { shell.add(shape); }
    shell.userData.assetState = 'shape';
    if (!GLB_ON() || !rec) { return shell; }

    var parts = {}, pending = 4;
    function onOne() { pending--; if (pending === 0) { assemble(); } }
    acquire(rec.body, function (c) { parts.body = c; onOne(); });
    /* outfit·hair 는 조합형(옛 Quaternius) 레시피에만 있다 — QRPG 통짜 스킨은
       둘 다 없으니 헛수고로 받으러 가지 않고 바로 다음 칸으로 넘어간다 */
    if (rec.outfit) { acquire(rec.outfit, function (c) { parts.outfit = c; onOne(); }); } else { onOne(); }
    if (rec.hair) { acquire(rec.hair, function (c) { parts.hair = c; onOne(); }); } else { onOne(); }
    acquire(rec.anim || ANIM_SRC, function (c) { parts.anim = c; onOne(); });

    function assemble() {
      if (!parts.body) { shell.userData.assetState = 'fail'; return; }
      var model;
      try { model = assembleHero(parts, mul, tintHex); }
      catch (e) { shell.userData.assetState = 'fail'; return; }
      while (shell.children.length) { shell.remove(shell.children[0]); }
      shell.add(model);
      shell.userData.assetState = 'glb';
      var animC = parts.anim;
      if (animC && animC.clips && animC.clips.length) {
        var mx = new t.AnimationMixer(model);
        var acts = {}, i;
        for (i = 0; i < animC.clips.length; i++) { acts[animC.clips[i].name] = mx.clipAction(animC.clips[i]); }
        shell.userData.mixer = mx; shell.userData.actions = acts;
        shell.userData.clipMap = mapClips(animC.clips.map(function (a) { return a.name; }));
      }
    }
    return shell;
  }

  /** 사람이 아닌 홑짜리 GLB(짐승·나무·바위) 하나 — 부위 변형이 없으니 그대로 눕혀 세운다 */
  function build(kind, seed, mul, tintHex, makeShape) {
    var t = three();
    var shell = new t.Group();
    var shape = makeShape ? makeShape() : null;
    if (shape) { shell.add(shape); }
    shell.userData.assetState = 'shape';
    if (!wants(kind, seed)) { return shell; }
    var url = urlOf(kind, seed);

    acquire(url, function (c) {
      if (!c) { shell.userData.assetState = 'fail'; return; }
      var model;
      try {
        model = cloneScene(c.gltf);
        model = normalize(model, mul);
        applyTint(model, tintHex);
      } catch (e) { shell.userData.assetState = 'fail'; return; }
      while (shell.children.length) { shell.remove(shell.children[0]); }
      shell.add(model);
      shell.userData.assetState = 'glb';
      if (c.clips && c.clips.length) {
        var mx = new t.AnimationMixer(model);
        var acts = {}, i;
        for (i = 0; i < c.clips.length; i++) { acts[c.clips[i].name] = mx.clipAction(c.clips[i]); }
        shell.userData.mixer = mx; shell.userData.actions = acts; shell.userData.clipMap = c.map;
      }
    });
    return shell;
  }

  /** 한 프레임 — GLB(뼈대 애니메이션)면 여기서 처리하고 true, 아니면 false */
  function step(node, o) {
    if (!node || !node.userData || !node.userData.mixer) { return false; }
    var u = node.userData;
    var want = (o && o.anim) || ((o && o.walking) ? 'walk' : 'idle');
    play(node, want);
    var t = (o && o.t) || 0;
    var dt = u.lastT === undefined ? 0 : Math.max(0, Math.min(0.25, t - u.lastT));
    u.lastT = t;
    u.mixer.update(dt);
    return true;
  }
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

  /** 맞으면 번쩍이는 재질들 — 배우가 GLB 든 상자든, 지금 보이는 모든 메시의
   *  재질을 사본으로 떼어 온다(사본이라야 배우끼리 안 부딪힌다) */
  function ownAllMat(root) {
    var out = [];
    if (!root) { return out; }
    root.traverse(function (o) {
      if (!o.isMesh || !o.material) { return; }
      var m = Array.isArray(o.material) ? o.material[0].clone() : o.material.clone();
      o.material = m;
      if (m.emissive) { out.push(m); }
    });
    return out;
  }
  function flashAllMat(mats, hurt, span) {
    if (!mats || !mats.length) { return; }
    var F = global.DG.fx3d;
    var k = F ? F.flashOf(hurt, span) : 0;
    for (var i = 0; i < mats.length; i++) { mats[i].emissive.setRGB(k, k * 0.8, k * 0.66); }
  }

  function stats() {
    var urls = Object.keys(cache), o = { registered: Object.keys(REG).length, loaded: 0, failed: 0 };
    for (var i = 0; i < urls.length; i++) {
      if (cache[urls[i]].state === 'ok') { o.loaded++; }
      if (cache[urls[i]].state === 'fail') { o.failed++; }
    }
    o.loader = !!loader();
    return o;
  }

  global.DG = global.DG || {};
  global.DG.asset3d = {
    REG: REG, register: register, lookup: lookup, urlOf: urlOf, wants: wants, oneOf: oneOf,
    normName: normName, score: score, mapClips: mapClips, SLOTS: SLOTS, fit: fit,
    ready: function () { return !!three(); }, hasLoader: function () { return !!loader(); },
    DEFAULTS: DEFAULTS, restore: restore, heroRecipe: heroRecipe, ANIM_SRC: ANIM_SRC,
    build: build, buildHero: buildHero, step: step, play: play,
    ownAllMat: ownAllMat, flashAllMat: flashAllMat,
    tuned: tuned, set: set, stats: stats,
    clear: function () { var k; for (k in REG) { if (Object.prototype.hasOwnProperty.call(REG, k)) { delete REG[k]; } } cache = {}; return REG; }
  };
})(window);
