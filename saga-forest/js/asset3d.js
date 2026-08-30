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
 *   build()       GLB 를 실제로 불러 세운다 (three.GLTFLoader)
 *
 * 되돌아가는 길 — GLB 가 없거나 실패하면 `build()` 가 null 을 돌려주고,
 * 부르는 쪽(앞으로 만들 `village-view3d.js`)은 지금처럼 도형을 그린다.
 * **한 줄도 판정에 닿지 않는다** — village.js 의 상태 계산은 이 파일을 모른다.
 *
 * file:// (PC 단독판)에서는 GLB 를 못 받는다(브라우저가 막는다). 실패해도
 * 조용히 넘어가므로 단독판은 그대로 돈다.
 *
 * **아직 이 표를 실제로 세우는 렌더러가 없다** — 나무·바위를 화면에 뿌리는
 * scatter 시스템(PLAN 9절 ForestDecorator)과 Player 3D 는 PHASE 3~4 몫이다.
 * 지금은 "무엇이 있는지"만 정해 둔 것이고, `lookup()`/`build()` 는 순수하게
 * 표만 보고 답한다 — 화면엔 아직 아무 영향이 없다.
 */
(function (global) {
  'use strict';

  var T = null;
  function three() { if (!T) { T = global.THREE || null; } return T; }

  var NAT = 'assets/models/nature/';
  var PROP = 'assets/models/props/';
  var ANI = 'assets/models/animals/';
  var PEOPLE = 'assets/models/people/regular/';

  /* 사람 몸(body)·옷(outfit)·머리(hair) — saga-go 와 완전히 같은 뼈대·표.
     자세한 사정은 `assets/ASSET_LICENSES.md` 와 saga-go 의 `asset3d.js` 참고 */
  var HERO_RECIPES = [
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

  var loader = null;
  function gltfLoader() {
    var t = three();
    if (!t || !t.GLTFLoader) { return null; }
    if (!loader) { loader = new t.GLTFLoader(); }
    return loader;
  }

  var cache = {};       // url → { scene, promise }

  /**
   * GLB 를 불러 THREE.Group 을 준다 (비동기, 콜백 방식 — 화면은 안 기다린다).
   * 실패하거나 three/GLTFLoader 가 없으면 cb(null) 로 부른다.
   */
  function build(kind, ref, cb) {
    var hit = lookup(kind, ref);
    if (!hit) { cb(null); return; }
    var url = oneOf(hit.url, ref);
    if (!url) { cb(null); return; }
    var t = three();
    if (!t) { cb(null); return; }
    if (cache[url] && cache[url].scene) { cb(cache[url].scene.clone()); return; }
    var ld = gltfLoader();
    if (!ld) { cb(null); return; }
    ld.load(url, function (gltf) {
      cache[url] = { scene: gltf.scene };
      cb(gltf.scene.clone());
    }, undefined, function () {
      cache[url] = { scene: null };
      cb(null);
    });
  }

  global.DG = global.DG || {};
  global.DG.asset3d = {
    register: register,
    restore: restore,
    clear: clear,
    lookup: lookup,
    keysFor: keysFor,
    oneOf: oneOf,
    build: build,
    three: three,
    REG: function () { return REG; }
  };
})(typeof window !== 'undefined' ? window : this);
