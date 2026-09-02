/**
 * 3D 에셋 창고 — GLB 를 끼워 넣을 자리를 만든다 (PLAN 40절 PHASE 1~2)
 * ---------------------------------------------------------------
 * 지금 마을은 `village-view.js` 가 **2D 캔버스에 구면 투영**으로 그린다.
 * 나무·바위·사람은 도형(선·채움)이다. 언젠가 실제 3D 모델(GLB)을 얹고 싶은데,
 * 그때 가서 그리는 코드를 뜯어고치면 지금 서 있는 그림이 통째로 흔들린다.
 * 그래서 saga-go 의 `asset3d.js` 와 같은 요령으로 **미리 자리만 파 둔다**.
 *
 *   REG           무엇을 무엇으로 세울지 적은 표. PHASE 2 에서 채웠다 — 출처는
 *                 `assets/ASSET_LICENSES.md`(전부 Quaternius CC0)
 *   register()    표에 한 줄 적으면 그날부터 그 사물은 GLB 로 선다
 *   lookup()      표에서 첫 히트를 찾는다. three 없이도 도는 순수 함수 —
 *                 그래서 진단이 렌더러 없이도 표를 검사할 수 있다
 *   build()       GLB 를 실제로 불러 세운다 (three.GLTFLoader). `kind==='hero'`
 *                 는 몸+옷+머리+몸짓(UAL1) 넷을 한 뼈대로 묶는 조합형이고
 *                 (saga-go 의 `asset3d.js` 에서 옮겼다 — 넷이 같은 뼈대라
 *                 옮겨 입히기(retarget)가 필요 없다), 나머지는 표의 파일
 *                 하나를 그대로 받는다
 *
 * 되돌아가는 길 — GLB 가 없거나 실패하면 `build()` 가 cb(null) 로 부르고,
 * 부르는 쪽(앞으로 만들 `village-view3d.js`)은 지금처럼 도형을 그린다.
 * **한 줄도 판정에 닿지 않는다** — village.js 의 상태 계산은 이 파일을 모른다.
 *
 * file:// (PC 단독판)에서는 GLB 를 못 받는다(브라우저가 막는다). 실패해도
 * 조용히 넘어가므로 단독판은 그대로 돈다.
 *
 * **아직 이 표를 실제로 세우는 렌더러가 없다** — 나무·바위를 화면에 뿌리는
 * scatter 시스템(PLAN 9절 ForestDecorator)과 카메라·씬을 가진 진짜 Player 3D
 * 화면은 PHASE 2 나머지 몫이다. `build()` 는 이미 실제 GLB 를 실제로 세울 수
 * 있지만(헤드리스로 확인함), 부르는 씬이 없으니 화면엔 아직 아무 영향이 없다.
 */
(function (global) {
  'use strict';

  var T = null;
  function three() { if (!T) { T = global.THREE || null; } return T; }

  var NAT = 'assets/models/nature/';
  var PROP = 'assets/models/props/';
  var ANI = 'assets/models/animals/';
  var PEOPLE = 'assets/models/people/regular/';
  var ANIM_SRC = 'assets/models/anim/UAL1_Standard.glb';
  /* 2026-09-02 — 사용자가 "사람도 실사로" 요청, Mixamo(mixamo.com) 에서 직접 받아 온
     것을 fbx2gltf 로 변환해 넣었다. Quaternius 조합형(몸+옷+머리 따로)과 달리 이
     캐릭터는 통짜 스킨 메시 하나다 — outfit·hair 없이 body 하나로 선다.
     자세한 사정은 `assets/ASSET_LICENSES.md` 참고 */
  var PEOPLE_REAL = 'assets/models/people/realistic/';
  var ANIM_SRC_REAL = 'assets/models/anim/mixamo_realistic.glb';

  /* 사람 몸(body)·옷(outfit)·머리(hair) — saga-go 와 완전히 같은 뼈대·표.
     자세한 사정은 `assets/ASSET_LICENSES.md` 와 saga-go 의 `asset3d.js` 참고.
     **2026-09-02부터 기본은 실사(Mixamo) 하나뿐이다** — outfit·hair 가 없는
     레시피는 몸 하나로 그대로 선다(`buildHero()` 참고). 옛 Quaternius 조합형
     넷은 REG 표엔 안 남기고 여기 주석으로만 남긴다(되돌릴 때 참고용):
       Superhero_Male/Female_FullBody.gltf + Male/Female_Peasant·Ranger.gltf +
       Hair_Buzzed·Long·Buns·SimpleParted.gltf, 넷 다 `PEOPLE` 경로 */
  var HERO_RECIPES = [
    { key: 'mixamo_maria', body: PEOPLE_REAL + 'maria_body.glb', anim: ANIM_SRC_REAL }
  ];

  /* 되돌림 자리 — 실사(Mixamo) 파생물은 재배포 금지라 .gitignore 돼 있어 이 파일이
     없는 기기(다른 clone·다른 세션)에서는 몸이 하나도 안 실린다. 그때 이 옛
     Quaternius 조합형(2026-09-02 이전 기본값)으로 자동으로 갈아탄다 — 캐릭터가
     통째로 안 보이는 것보다는 스타일이 다르더라도 서 있는 쪽이 낫다. 2026-09-03 고침 */
  var HERO_RECIPES_FALLBACK = [
    { key: 'male_peasant_buzzed', body: PEOPLE + 'Superhero_Male_FullBody.gltf',
      outfit: PEOPLE + 'Male_Peasant.gltf', hair: PEOPLE + 'Hair_Buzzed.gltf' },
    { key: 'male_ranger_long', body: PEOPLE + 'Superhero_Male_FullBody.gltf',
      outfit: PEOPLE + 'Male_Ranger.gltf', hair: PEOPLE + 'Hair_Long.gltf' },
    { key: 'female_peasant_buns', body: PEOPLE + 'Superhero_Female_FullBody.gltf',
      outfit: PEOPLE + 'Female_Peasant.gltf', hair: PEOPLE + 'Hair_Buns.gltf' },
    { key: 'female_ranger_simple', body: PEOPLE + 'Superhero_Female_FullBody.gltf',
      outfit: PEOPLE + 'Female_Ranger.gltf', hair: PEOPLE + 'Hair_SimpleParted.gltf' }
  ];

  /** 표 — 키는 좁은 것부터. PLAN 8절(숲 오브젝트)·16절(동물) 어휘를 그대로 썼다.
   *   asset3d.register('tree:pine', 'assets/models/nature/Pine.glb');
   *   asset3d.register('animal:an_deer', 'assets/models/animals/Deer.glb');
   */
  var DEFAULTS = {
    'hero': HERO_RECIPES,

    /* 나무 — 계절은 season.js 가 정한 값을 ref.season 으로 넘기는 쪽(부르는 쪽)이 맡는다 */
    'tree:common': [NAT + 'CommonTree_1.glb', NAT + 'CommonTree_2.glb', NAT + 'CommonTree_3.glb'],
    'tree:common:autumn': [NAT + 'CommonTree_Autumn_1.glb', NAT + 'CommonTree_Autumn_2.glb'],
    'tree:common:snow': [NAT + 'CommonTree_Snow_1.glb', NAT + 'CommonTree_Snow_2.glb'],
    'tree:dead': NAT + 'CommonTree_Dead_1.glb',
    'tree:pine': [NAT + 'PineTree_1.glb', NAT + 'PineTree_2.glb'],
    'tree:birch': [NAT + 'BirchTree_1.glb', NAT + 'BirchTree_2.glb'],

    /* 식물·자연물 */
    'bush': [NAT + 'Bush_1.glb', NAT + 'Bush_2.glb', NAT + 'BushBerries_1.glb'],
    'rock': [NAT + 'Rock_1.glb', NAT + 'Rock_2.glb', NAT + 'Rock_3.glb'],
    'rock:moss': NAT + 'Rock_Moss_1.glb',
    'grass': [NAT + 'Grass_2.glb', NAT + 'Grass_Short.glb'],
    'flower': NAT + 'Flowers.glb',
    'plant': [NAT + 'Plant_1.glb', NAT + 'Plant_2.glb'],
    'mushroom': [PROP + 'Mushroom_1.glb', PROP + 'Mushroom_2.glb'],
    'stump': [NAT + 'TreeStump.glb', NAT + 'TreeStump_Moss.glb'],
    'log': [NAT + 'WoodLog.glb', NAT + 'WoodLog_Moss.glb'],
    'mountain': [NAT + 'Mountain_1.glb', NAT + 'Mountain_2.glb'],

    /* 장식 (PLAN 8절) */
    'bench': PROP + 'Bench_1.glb',
    'fence': PROP + 'Fence.glb',
    'cart': PROP + 'Cart.glb',
    'campfire': PROP + 'Bonfire_Lit.glb',
    'tent': PROP + 'Tent.glb',
    'lantern': PROP + 'WoodenTorch.glb',
    'well': PROP + 'Well.glb',
    'bridge': PROP + 'Bridge.glb',
    'gazebo': PROP + 'Gazebo.glb',

    /* 동물 (PLAN 16절) — 토끼·다람쥐·오리·새는 아직 못 찾았다.
       `assets/ASSET_LICENSES.md` 의 "아직 못 채운 자리" 참고 */
    'animal:an_deer': ANI + 'Deer.glb',
    'animal:an_wolf': ANI + 'Wolf.glb',
    'animal:an_fox': ANI + 'Fox.glb'
  };

  var REG = {};
  function restore() {
    var k;
    REG = {};
    for (k in DEFAULTS) { if (DEFAULTS.hasOwnProperty(k)) { REG[k] = DEFAULTS[k]; } }
    return REG;
  }
  restore();

  function register(key, url) {
    if (!key) { return REG; }
    if (url) { REG[key] = url; } else { delete REG[key]; }
    return REG;
  }

  function clear() { REG = {}; return REG; }

  /** 이 사물을 어떤 키들로 찾아볼까 — 좁은 것부터 넓은 것 순. 순수 함수 */
  function keysFor(kind, ref) {
    var r = ref || {};
    if (!kind) { return []; }
    return [r.id ? kind + ':' + r.id : null, kind].filter(Boolean);
  }

  /** 표에서 첫 히트 — 없으면 null. three 없이도 돈다 */
  function lookup(kind, ref) {
    var ks = keysFor(kind, ref), i;
    for (i = 0; i < ks.length; i++) {
      if (REG[ks[i]]) { return { key: ks[i], url: REG[ks[i]] }; }
    }
    return null;
  }

  /** 표의 한 줄이 여럿이면 그중 하나를 고른다 — ref.id 해시로 늘 같은 것 */
  function oneOf(list, ref) {
    if (!list) { return null; }
    if (typeof list === 'string') { return list; }
    if (!list.length) { return null; }
    var s = String((ref && (ref.id || ref.name)) || ''), i, h = 0;
    for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return list[h % list.length];
  }

  /* ── 애니메이션 이름 맞추기 (saga-go 의 asset3d.js 에서 그대로 옮겼다) ──
   * 모델마다 클립 이름이 제각각이다(mixamo·blender·수제). 이름을 씻어 놓고
   * **점수를 매겨** 가장 잘 맞는 것부터 자리를 채운다. three 없이도 도는
   * 순수 함수라 진단이 렌더러 없이 검사할 수 있다. */
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
      if (name === w) { s = 100; }
      else if (name.indexOf(w) === 0) { s = 70; }
      else if (name.indexOf(w) >= 0) { s = 40; }
      else { continue; }
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

  /** 키 1 로 눕히는 배율·이동값 — three 없이도 돈다 */
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

  /* ── 여기서부터 three 가 필요하다 ─────────────────────── */

  var loaderInst = null;
  function gltfLoader() {
    var t = three();
    if (!t || !t.GLTFLoader) { return null; }
    if (!loaderInst) { loaderInst = new t.GLTFLoader(); }
    return loaderInst;
  }

  /** 뼈대가 있는 모델은 그냥 복제하면 뼈대를 나눠 쓴다 — 배우 여럿이 같이 걷는다 */
  function cloneScene(gltf) {
    var t = three();
    if (t.SkeletonUtils && t.SkeletonUtils.clone) { return t.SkeletonUtils.clone(gltf.scene); }
    return gltf.scene.clone(true);
  }

  /**
   * 받은 그대로의 PBR 재질을 벗긴다 — Quaternius 모델은 `metallicFactor 0.4` 를
   * 지고 오는데 이 판에 환경맵(IBL)이 없으면 배우가 거의 새까맣게 선다.
   * 빛깔만 남기고 Lambert 로 바꾼다(saga-go 에서 실제로 겪은 문제, 같은 고침).
   */
  /** 2026-09-02 — 이 경로(`/realistic/`) 밑은 PBR 재질을 안 벗긴다. 이제
   *  `village-view3d.js` 가 HDRI 환경광(`scene.environment`)을 물려서 PBR 이
   *  까맣게 뜨던 옛 문제(주석 위 설명)가 풀렸다 — 오히려 Lambert 로 벗기면
   *  실사 텍스처의 반사·거칠기가 다 죽는다. 옛 Quaternius 계열은 그대로 벗긴다
   *  (그쪽은 애초에 환경맵을 받게 만든 텍스처가 아니라 벗기는 쪽이 더 낫다) */
  function looksRealistic(url) { return typeof url === 'string' && url.indexOf('/realistic/') >= 0; }

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

  var cache = {};   // url → { state: 'load'|'ok'|'fail', gltf, clips, waiting: [cb] }
  var built = 0, swapped = 0, broke = '';

  function flush(c, arg) {
    var w = c.waiting; c.waiting = [];
    for (var i = 0; i < w.length; i++) { w[i](arg); }
  }

  /** GLB 하나를 받아 캐시한다 — 같은 url 을 몇이 동시에 물어도 한 번만 받는다 */
  function acquire(url, done) {
    var c = cache[url];
    if (c && c.state === 'ok') { done(c); return; }
    if (c && c.state === 'fail') { done(null); return; }
    if (c) { c.waiting.push(done); return; }

    var ld = gltfLoader();
    if (!ld) { cache[url] = { state: 'fail', waiting: [] }; done(null); return; }
    c = cache[url] = { state: 'load', waiting: [done] };
    ld.load(url, function (gltf) {
      c.state = 'ok';
      c.gltf = gltf;
      if (!looksRealistic(url)) { delam(gltf.scene); }
      c.clips = gltf.animations || [];
      c.map = mapClips(c.clips.map(function (a) { return a.name; }));
      flush(c, c);
    }, undefined, function () {
      c.state = 'fail';
      flush(c, null);
    });
  }

  /**
   * 키 1 로 눕혀 담는다. `mul` 을 주면 그 키로 선다 — 지금은 전부 1(성채·역참처럼
   * 제 키로 서 있는 사물이 이 판엔 없다).
   */
  function normalize(obj, mul) {
    var t = three();
    /* 그림자 — HDRI·톤매핑과 같이 2026-09-02 에 얹었다. 세워지는 모든 사물에
       공통으로 건다(플레이어·나무·바위 다 포함) — 개별 kind 마다 따로 안 챙긴다 */
    obj.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    obj.updateMatrixWorld(true);
    var b = new t.Box3().setFromObject(obj);
    var f = fit({ minX: b.min.x, maxX: b.max.x, minY: b.min.y, maxY: b.max.y, minZ: b.min.z, maxZ: b.max.z });
    var m = mul || 1;
    var wrap = new t.Group();
    obj.scale.setScalar(f.scale * m);
    obj.position.set(f.dx * m, f.dy * m, f.dz * m);
    wrap.userData.span = {
      w: (b.max.x - b.min.x) * f.scale * m, d: (b.max.z - b.min.z) * f.scale * m, h: m
    };
    wrap.add(obj);
    return wrap;
  }

  /** 마지막 되돌림 자리 — GLB 가 안 되거나 아직 안 왔을 때 화면에 무언가는 선다 */
  function primitive(kind, ref) {
    var t = three();
    if (!t) { return null; }
    var g = new t.Group();
    var m = new t.MeshLambertMaterial({ color: new t.Color((ref && ref.color) || '#8a94a6') });
    var body = new t.Mesh(new t.CapsuleGeometry(0.22, 0.52, 4, 10), m);
    body.position.y = 0.5;
    g.add(body);
    g.userData.primitive = true;
    return g;
  }

  /**
   * 인물 하나 — **몸 위에 옷·머리를 얹어 한 뼈대에 묶는다.** 셋 다 뼈 이름·순서가
   * 완전히 같으므로(saga-go 에서 직접 대조했다) 스킨 메시를 몸의 스켈레톤에
   * 다시 물리기만 하면 된다.
   */
  function assembleHero(parts) {
    var bodyScene = cloneScene(parts.body.gltf);
    var master = null;
    bodyScene.traverse(function (o) { if (!master && o.isSkinnedMesh) { master = o; } });
    if (!master || !master.skeleton) { throw new Error('몸에 스켈레톤이 없다'); }
    var skeleton = master.skeleton;

    [parts.outfit, parts.hair].forEach(function (p) {
      if (!p || !p.gltf) { return; }
      var scene = cloneScene(p.gltf);
      var meshes = [];
      scene.traverse(function (o) { if (o.isSkinnedMesh) { meshes.push(o); } });
      meshes.forEach(function (m) { m.bind(skeleton, m.bindMatrix); bodyScene.add(m); });
    });

    return normalize(bodyScene, 1);
  }

  /**
   * 인물 하나를 몸+옷+머리+몸짓(UAL1) 넷을 받아 조합한다. **옮겨 입히기
   * (retarget) 가 필요 없다** — 넷 다 같은 뼈대(65뼈, 이름까지 동일)라
   * 몸짓 클립을 그대로 물릴 수 있다(saga-go 의 `HERO_RECIPES` 와 같은 규칙).
   *
   * @param cb  function(group|null) — group.userData 에 mixer·actions·clipMap 이 실린다
   */
  function buildHero(ref, cb) {
    var t = three();
    var rec = heroRecipe(ref);
    if (!rec || !t) { cb(null); return; }
    loadHeroRecipe(rec, ref, cb, false);
  }

  /** 실사 레시피의 몸이 안 실리면(파일이 이 기기에 없음) 옛 조합형으로 한 번만 다시 탄다 */
  function loadHeroRecipe(rec, ref, cb, isFallback) {
    built++;

    var parts = {}, pending = 4;
    function onOne() { pending--; if (pending === 0) { assemble(); } }
    acquire(rec.body, function (c) { parts.body = c; onOne(); });
    /* outfit·hair 는 조합형(Quaternius) 레시피에만 있다 — 통짜 스킨(Mixamo)은
       둘 다 없으니 헛수고로 받으러 가지 않고 바로 다음 칸으로 넘어간다 */
    if (rec.outfit) { acquire(rec.outfit, function (c) { parts.outfit = c; onOne(); }); } else { onOne(); }
    if (rec.hair) { acquire(rec.hair, function (c) { parts.hair = c; onOne(); }); } else { onOne(); }
    acquire(rec.anim || ANIM_SRC, function (c) { parts.anim = c; onOne(); });

    function assemble() {
      if (!parts.body) {
        if (!isFallback) {
          var fb = oneOf(HERO_RECIPES_FALLBACK, ref);
          if (fb) { loadHeroRecipe(fb, ref, cb, true); return; }
        }
        cb(null);
        return;
      }
      var model;
      try {
        model = assembleHero(parts);
      } catch (e) {
        broke = (e && e.message) ? e.message : 'hero assemble 실패';
        cb(null);
        return;
      }
      swapped++;
      var animC = parts.anim;
      if (animC && animC.clips && animC.clips.length) {
        var mx = new t.AnimationMixer(model.children[0]);
        var acts = {}, i;
        for (i = 0; i < animC.clips.length; i++) { acts[animC.clips[i].name] = mx.clipAction(animC.clips[i]); }
        model.userData.mixer = mx;
        model.userData.actions = acts;
        model.userData.clipMap = mapClips(animC.clips.map(function (a) { return a.name; }));
      }
      cb(model);
    }
  }

  /** 인물이 아닌 사물 하나 — 표에서 골라 그대로 받아 눕힌다 */
  function buildGeneric(kind, ref, cb) {
    var hit = lookup(kind, ref);
    if (!hit) { cb(null); return; }
    var url = oneOf(hit.url, ref);
    if (!url || typeof url !== 'string') { cb(null); return; }
    acquire(url, function (c) {
      if (!c || !c.gltf) { cb(null); return; }
      built++;
      var model = cloneScene(c.gltf);
      cb(normalize(model, 1));
    });
  }

  /**
   * GLB 를 실제로 불러 세운다 (비동기, 콜백 방식 — 화면은 안 기다린다).
   * `kind==='hero'` 는 몸+옷+머리+몸짓 넷을 묶는 조합형이라 `buildHero()` 로,
   * 나머지는 표의 파일 하나를 그대로 받는 `buildGeneric()` 으로 간다.
   * 실패하거나 three/GLTFLoader 가 없으면 cb(null) 로 부른다.
   */
  function build(kind, ref, cb) {
    if (kind === 'hero') { buildHero(ref, cb); return; }
    buildGeneric(kind, ref, cb);
  }

  /** 이 인물의 몸·옷·머리 조합 — 표에 조합 객체가 있을 때만 준다 */
  function heroRecipe(ref) {
    var h = lookup('hero', ref);
    if (!h) { return null; }
    var v = oneOf(h.url, ref);
    return (v && typeof v === 'object' && v.body) ? v : null;
  }

  global.DG = global.DG || {};
  global.DG.asset3d = {
    register: register,
    restore: restore,
    clear: clear,
    lookup: lookup,
    keysFor: keysFor,
    oneOf: oneOf,
    heroRecipe: heroRecipe,
    mapClips: mapClips,
    build: build,
    three: three,
    REG: function () { return REG; },
    stats: function () { return { built: built, swapped: swapped, broke: broke }; }
  };
})(typeof window !== 'undefined' ? window : this);
