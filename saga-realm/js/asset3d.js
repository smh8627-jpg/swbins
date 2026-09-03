/**
 * 3D 에셋 창고 — 사가국지 (PLAN 40절 PHASE 1~2)
 * ---------------------------------------------------------------
 * 지금 지도(`#realm`)는 svg 원·선으로 그린 평면 지도다. 언젠가 성 서른 곳을
 * 실제 3D 지형 위에 세우고 싶은데, saga-go·saga-dungeon·saga-forest 가 이미
 * 겪은 요령을 그대로 따른다 — **자리만 파 둔 창고 하나**를 두고, 부르는 화면
 * (`realm3d.js`)은 이 창고에서 이미 세운 사물을 받아 놓기만 한다.
 *
 * 이 판은 인물이 걸어 다니지 않는다(턴제 지도 화면) — 그래서 saga-go 의
 * `asset3d.js` 에 있던 인물 조립(몸+옷+머리)·몸짓 재타기팅은 이 창고에 없다.
 * 필요해지면(플레이어가 3D 로 걷는 화면이 생기면) 그때 그 요령을 옮겨 온다.
 *
 *   register()   표에 한 줄 적으면 그날부터 그 사물은 GLB 로 선다
 *   lookup()     표에서 첫 히트. three 없이도 도는 순수 함수
 *   build()      GLB 를 불러 세운다. 실패하면 조용히 도형(primitive)으로
 *                떨어진다 — **부르는 쪽은 실패를 몰라도 된다**(항상 뭔가는 온다)
 *
 * file://(PC 단독판)에서는 GLB 를 못 받는다(브라우저가 막는다) — 그때도
 * primitive 로 떨어지므로 단독판은 도형 지도로 그냥 돈다.
 */
(function (global) {
  'use strict';

  var T = null;
  function three() { if (!T) { T = global.THREE || null; } return T; }

  var BLD = 'assets/models/buildings/';
  var NAT = 'assets/models/nature/';
  var PRP = 'assets/models/props/';
  var PEOPLE = 'assets/models/people/regular/';
  var ANIM_DIR = 'assets/models/anim/';

  /* 2026-09-03 — 다른 네 판과 같은 이유로 사람 기본을 갈아 끼운다. Quaternius
     "RPG Character Pack"(CC0, 전사·궁수·도적·성직자·마법사·수도승 6종)은 몸 파일
     하나에 걷기·공격·사망 클립이 다 들어 있어 옷·머리·ANIM_SRC 몸짓이 필요 없다 */
  var PEOPLE_QRPG = 'assets/models/people/quaternius_rpg/';
  var HERO_RECIPES = ['Warrior', 'Ranger', 'Rogue', 'Cleric', 'Wizard', 'Monk'].map(function (n) {
    var f = PEOPLE_QRPG + n + '.glb';
    return { key: 'qrpg_' + n.toLowerCase(), body: f, anim: f };
  });

  /* 옛 조합형 — 표 기본에서는 빠졌다. 지우지 않고 남겨 둔다(되돌림 자리).
   * 2026-09-02, 도감 초상을 굽으려고 처음 들였던 것(`js/portrait3d.js`) —
   * `saga-dungeon`과 같은 여섯 조합(몸+옷+머리). */
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
  var ANIM_SRC = ANIM_DIR + 'UAL1_Standard.glb';

  /** 표 — 성채는 **등급마다 다른 탑**이 선다(wall 값이 클수록 높은 탑).
   *  좁은 키(`city:t3`)부터 찾으므로 등급이 안 실려 와도 `city` 로 떨어진다 */
  var DEFAULTS = {
    'hero': HERO_RECIPES,
    'city:t1': BLD + 'Watchtower.glb',
    'city:t2': [BLD + 'Tower.glb', BLD + 'PointyTower.glb'],
    'city:t3': [BLD + 'LargeTower.glb', BLD + 'LargeSquareTowerBricks.glb'],
    'city': BLD + 'Tower.glb',

    'mount': [NAT + 'Mountain_1.glb', NAT + 'Mountain_2.glb'],
    'tree': [NAT + 'CommonTree_1.glb', NAT + 'CommonTree_2.glb', NAT + 'PineTree_1.glb'],
    'rock': [NAT + 'Rock_1.glb', NAT + 'Rock_2.glb'],

    /* 40절 PHASE 4 — 퀄리티 보강. 다섯 판 공통 방침("코드로 그리지 말고
     * 에셋으로")에 따라 saga-go/saga-forest 가 이미 확인해 둔 CC0 를 그대로 옮겼다 */
    'bush': [NAT + 'Bush_1.glb', NAT + 'Bush_2.glb'],
    'grass': NAT + 'Grass_2.glb',
    'flower': NAT + 'Flowers.glb',
    'wall': PRP + 'Wall.glb',
    'temple': PRP + 'Temple.glb',
    'torch': PRP + 'WoodenTorch.glb',
    'market': BLD + 'MarketStand_1.glb',
    'well': BLD + 'Well.glb',
    'house': [BLD + 'House_1.glb', BLD + 'House_2.glb', BLD + 'House_3.glb', BLD + 'House_4.glb'],
    'log': NAT + 'WoodLog.glb',
    'tent': PRP + 'Tent.glb'
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

  /** 이 사물을 어떤 키들로 찾아볼까 — 좁은 것부터 넓은 것 순. 순수 함수 */
  function keysFor(kind, ref) {
    var r = ref || {};
    if (!kind) { return []; }
    return [r.id ? kind + ':' + r.id : null, kind].filter(Boolean);
  }

  function lookup(kind, ref) {
    var ks = keysFor(kind, ref), i;
    for (i = 0; i < ks.length; i++) {
      if (REG[ks[i]]) { return { key: ks[i], url: REG[ks[i]] }; }
    }
    return null;
  }

  function hashOf(s) {
    s = String(s || '');
    var h = 0, i;
    for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return h;
  }

  /** 표의 한 줄이 여럿이면 그중 하나를 고른다 — ref.id 해시로 늘 같은 것을 고른다
   *  (성 하나가 매번 다른 탑으로 바뀌면 화면이 산만해진다) */
  function oneOf(list, ref) {
    if (!list) { return null; }
    if (!Array.isArray(list)) { return list; }
    if (!list.length) { return null; }
    var seed = (ref && (ref.id || ref.seed)) || '';
    return list[hashOf(seed) % list.length];
  }

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

  function cloneScene(gltf) {
    var t = three();
    if (t.SkeletonUtils && t.SkeletonUtils.clone) { return t.SkeletonUtils.clone(gltf.scene); }
    return gltf.scene.clone(true);
  }

  /** Quaternius 모델은 PBR(metallic) 재질을 지고 오는데, 이 판에 환경맵이
   *  없으면 거의 새까맣게 선다. 빛깔만 남기고 Lambert 로 바꾼다 */
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

  var cache = {};   // url → { state: 'load'|'ok'|'fail', gltf, waiting: [cb] }
  var built = 0, broke = '';

  function flush(c, arg) {
    var w = c.waiting; c.waiting = [];
    for (var i = 0; i < w.length; i++) { w[i](arg); }
  }

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
      delam(gltf.scene);
      flush(c, c);
    }, undefined, function () {
      c.state = 'fail';
      broke = url;
      flush(c, null);
    });
  }

  /** 키 1 로 눕혀 담는다 — 실제 높이는 부르는 쪽이 `wrap.scale.setScalar()` 로 정한다 */
  function normalize(obj) {
    var t = three();
    obj.updateMatrixWorld(true);
    var b = new t.Box3().setFromObject(obj);
    var f = fit({ minX: b.min.x, maxX: b.max.x, minY: b.min.y, maxY: b.max.y, minZ: b.min.z, maxZ: b.max.z });
    var wrap = new t.Group();
    obj.scale.setScalar(f.scale);
    obj.position.set(f.dx, f.dy, f.dz);
    wrap.userData.span = { w: (b.max.x - b.min.x) * f.scale, d: (b.max.z - b.min.z) * f.scale, h: 1 };
    wrap.add(obj);
    return wrap;
  }

  /** 마지막 되돌림 자리 — GLB 가 안 되거나 아직 안 왔을 때도 화면엔 무언가는 선다 */
  function primitive(kind, ref) {
    var t = three();
    if (!t) { return null; }
    var g = new t.Group();
    var col = (ref && (ref.tint || ref.color)) || '#8a94a6';
    var m = new t.MeshLambertMaterial({ color: new t.Color(col) });
    var body;
    if (kind && kind.indexOf('city') === 0) {
      body = new t.Mesh(new t.ConeGeometry(0.32, 1, 4), m);
      body.position.y = 0.5;
    } else if (kind === 'mount') {
      body = new t.Mesh(new t.ConeGeometry(0.5, 1, 6), m);
      body.position.y = 0.5;
    } else {
      body = new t.Mesh(new t.BoxGeometry(0.5, 0.5, 0.5), m);
      body.position.y = 0.25;
    }
    g.add(body);
    g.userData.span = { w: 0.6, d: 0.6, h: 1 };
    g.userData.primitive = true;
    return g;
  }

  var tintCache = {};

  /** 복제한 모델의 재질을 물들인다 — 원본은 안 건드린다(다른 성이 같이 쓴다) */
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

  /** 세력 깃발 — 성채 옆에 배너를 꽂는다. `ref.flag` 가 있을 때만 */
  function addFlag(wrap, color) {
    var t = three();
    if (!t || !color || !wrap) { return wrap; }
    var span = (wrap.userData && wrap.userData.span) || { w: 1, d: 1, h: 1 };
    var h = span.h || 1;
    var x = span.w / 2 + h * 0.08, z = -(span.d / 2) - h * 0.06;
    var poleH = h * 1.08;
    var pole = new t.Mesh(
      new t.CylinderGeometry(h * 0.015, h * 0.015, poleH, 5),
      new t.MeshLambertMaterial({ color: 0x6b5533 })
    );
    pole.position.set(x, poleH / 2, z);
    wrap.add(pole);
    var fw = h * 0.26, fh = h * 0.38;
    var cloth = new t.Mesh(
      new t.BoxGeometry(fw, fh, h * 0.01),
      new t.MeshLambertMaterial({ color: new t.Color(color) })
    );
    cloth.position.set(x + fw / 2, poleH - fh * 0.6, z);
    wrap.add(cloth);
    return wrap;
  }

  /** 이 인물의 몸·옷·머리 조합 — 표에 조합 객체가 있을 때만 준다 */
  function heroRecipe(ref) {
    var h = lookup('hero', ref);
    if (!h) { return null; }
    var v = oneOf(h.url, ref);
    return (v && typeof v === 'object' && v.body) ? v : null;
  }

  /**
   * 몸+옷+머리 셋을 한 뼈대로 묶는다 — 넷(anim 포함)이 같은 뼈대(65뼈, 이름까지
   * 동일)라 옮겨 입히기(retarget)가 필요 없다(다른 네 판과 같은 규칙).
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

    return normalize(bodyScene);
  }

  /**
   * 사람 하나를 조합형으로 세운다(비동기, 콜백 방식) — 이 판은 인물이 걸어
   * 다니지 않아 여태 없었던 자리다. **지금은 `portrait3d.js`(도감 초상 굽기)
   * 만 이걸 부른다** — 언젠가 3D로 걷는 화면이 생기면 몸짓(mixer)도 그대로 쓴다.
   */
  function buildHero(ref, tintHex, cb) {
    var t = three();
    var rec = heroRecipe(ref);
    if (!rec || !t) { cb(null); return; }

    var parts = {}, pending = 4;
    function onOne() { pending--; if (pending === 0) { assemble(); } }
    acquire(rec.body, function (c) { parts.body = c; onOne(); });
    /* outfit·hair 는 조합형(옛 Quaternius) 레시피에만 있다 — QRPG 통짜 스킨은
       둘 다 없으니 헛수고로 받으러 가지 않고 바로 다음 칸으로 넘어간다 */
    if (rec.outfit) { acquire(rec.outfit, function (c) { parts.outfit = c; onOne(); }); } else { onOne(); }
    if (rec.hair) { acquire(rec.hair, function (c) { parts.hair = c; onOne(); }); } else { onOne(); }
    acquire(rec.anim || ANIM_SRC, function (c) { parts.anim = c; onOne(); });

    function assemble() {
      if (!parts.body) { cb(null); return; }
      var model;
      try {
        model = assembleHero(parts);
        if (tintHex) { applyTint(model, tintHex); }
      } catch (e) {
        broke = (e && e.message) ? e.message : 'hero assemble 실패';
        cb(null);
        return;
      }
      built++;
      var animC = parts.anim;
      if (animC && animC.clips && animC.clips.length) {
        model.userData.mixer = new t.AnimationMixer(model.children[0]);
        model.userData.clips = animC.clips;
      }
      cb(model);
    }
  }

  /**
   * GLB 를 불러 세운다(비동기). 실패하거나 three/GLTFLoader 가 없으면
   * **조용히 도형으로 떨어진다** — 부르는 쪽은 항상 그룹 하나를 받는다.
   * `ref.tint` 를 주면 색을 입히고, `ref.flag` 를 주면 세력 깃발을 꽂는다.
   */
  function build(kind, ref, cb) {
    function finish(wrap) {
      if (!wrap) { cb(null); return; }
      if (ref && ref.tint) { applyTint(wrap, ref.tint); }
      if (ref && ref.flag) { addFlag(wrap, ref.flag); }
      cb(wrap);
    }
    function fallback() { finish(primitive(kind, ref)); }

    var hit = lookup(kind, ref);
    if (!hit) { fallback(); return; }
    var url = oneOf(hit.url, ref);
    if (!url || typeof url !== 'string') { fallback(); return; }
    acquire(url, function (c) {
      if (!c || !c.gltf) { fallback(); return; }
      built++;
      finish(normalize(cloneScene(c.gltf)));
    });
  }

  global.DG = global.DG || {};
  global.DG.asset3d = {
    register: register,
    restore: restore,
    lookup: lookup,
    keysFor: keysFor,
    oneOf: oneOf,
    build: build,
    heroRecipe: heroRecipe,
    buildHero: buildHero,
    ANIM_SRC: ANIM_SRC,
    primitive: primitive,
    three: three,
    REG: function () { return REG; },
    stats: function () { return { built: built, broke: broke }; }
  };
})(window);
