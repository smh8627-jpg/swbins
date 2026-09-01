/**
 * 3D 에셋 창고 — 사냥터 지형지물·사람·짐승을 GLB 로 세운다 (PLAN 36절 Phase 2)
 * ---------------------------------------------------------------
 * saga-forest·saga-realm·saga-dungeon 의 `asset3d.js` 와 같은 요령이다.
 * `side-view3d.js` 가 GLB 를 못 받으면 조용히 도형(원뿔·구·캡슐)으로 남는다 —
 * **한 줄도 판정에 닿지 않는다**, side.js 는 이 파일을 모른다.
 *
 * 인물(주인공·사람 형 적)은 몸+옷+머리 넷을 한 뼈대에 묶는 조합형이다
 * (`buildHero`, 사가블로의 `asset3d.js`에서 그대로 옮겼다) — 셋이 뼈 이름·순서까지
 * 완전히 같아 옮겨 입히기(retarget)가 필요 없다. 짐승 형 적(들개·코끼리병)은
 * 조합 없이 홑 GLB 하나로 선다(늑대·소로 대신한다 — 몸집 큰 짐승의 CC0 대역).
 *
 * file:// (PC 단독판)에서는 GLB 를 못 받는다(브라우저가 막는다). 실패해도 조용히
 * 넘어가므로 단독판은 도형인 채로 그대로 돈다.
 */
(function (global) {
  'use strict';

  var T = null;
  function three() { if (!T) { T = global.THREE || null; } return T; }

  var NAT = 'assets/models/nature/';
  var PEOPLE = 'assets/models/people/regular/';
  var ANIMALS = 'assets/models/animals/';
  var ANIM_SRC = 'assets/models/anim/UAL1_Standard.glb';

  /* 사람 몸(body)·옷(outfit)·머리(hair) — saga-forest·saga-dungeon 과 완전히 같은
     뼈대·표. 자세한 사정은 `assets/ASSET_LICENSES.md` 참고 */
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

  /** 표 — 지형지물은 사냥터 mood 어휘, 사람·짐승은 PLAN 36절 Phase 2 어휘 */
  var DEFAULTS = {
    'tree:near': [NAT + 'CommonTree_1.glb', NAT + 'CommonTree_2.glb', NAT + 'CommonTree_3.glb'],
    'tree:far': [NAT + 'PineTree_1.glb', NAT + 'PineTree_2.glb'],
    'rock': [NAT + 'Rock_1.glb', NAT + 'Rock_2.glb', NAT + 'Rock_3.glb'],
    'hill': [NAT + 'Mountain_1.glb', NAT + 'Mountain_2.glb'],
    'hero': HERO_RECIPES,
    /* 몬스터 다양화 — 코끼리병처럼 몸집 큰 짐승형 적은 소 GLB 로 대신한다
       (딱 맞는 코끼리는 CC0 로 못 찾았다, 늑대만 쓰면 다 같은 크기·모양이 된다) */
    'beast': ANIMALS + 'Wolf.glb',
    'beast_big': ANIMALS + 'Cow.glb'
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

  /** 표에서 첫 히트 — 없으면 null. three 없이도 돈다 */
  function lookup(kind) { return REG[kind] ? { key: kind, url: REG[kind] } : null; }

  /** 표의 한 줄이 여럿이면 그중 하나를 고른다 — seed 로 늘 같은 것 */
  function oneOf(list, seed) {
    if (!list) { return null; }
    if (typeof list === 'string') { return list; }
    if (!list.length) { return null; }
    var s = String(seed || ''), i, h = 0;
    for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return list[h % list.length];
  }

  /* ── 여기서부터 three 가 필요하다 ─────────────────────── */

  var loaderInst = null;
  function gltfLoader() {
    var t = three();
    if (!t || !t.GLTFLoader) { return null; }
    if (!loaderInst) { loaderInst = new t.GLTFLoader(); }
    return loaderInst;
  }

  /**
   * 받은 그대로의 PBR 재질을 벗긴다 — Quaternius 모델은 환경맵(IBL) 없이 서면
   * 거의 새까맣게 보인다. 빛깔만 남기고 Lambert 로 바꾼다(다른 판에서 실제로
   * 겪은 문제, 같은 고침).
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
    root.traverse(function (o) {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
  }

  var cache = {};   // url → { state: 'load'|'ok'|'fail', gltf, waiting: [cb] }
  var built = 0, broke = '';

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
      delam(gltf.scene);
      c.clips = gltf.animations || [];
      flush(c, c);
    }, undefined, function () {
      c.state = 'fail';
      flush(c, null);
    });
  }

  /** 뼈대가 있으면(사람) SkeletonUtils 로 복제한다 — 그냥 복제하면 뼈대를 나눠 쓴다
   *  (배우 여럿이 같이 걷는다). 뼈대가 없는 나무·바위는 어차피 평범한 복제와 같다 */
  function cloneScene(gltf) {
    var t = three();
    if (t.SkeletonUtils && t.SkeletonUtils.clone) { return t.SkeletonUtils.clone(gltf.scene); }
    return gltf.scene.clone(true);
  }

  /** 표에서 이 씨앗이 고를 몸+옷+머리 조합 — 조합 객체일 때만 돌려준다 */
  function heroRecipe(seed) {
    var h = lookup('hero');
    if (!h) { return null; }
    var v = oneOf(h.url, seed);
    return (v && typeof v === 'object' && v.body) ? v : null;
  }

  /** 이 재질을 hex 로 물들인다(흰 옷에 곱하는 값이라 너무 어두우면 안 된다) — 없으면 안 물들인다.
   *  짐승은 제 털빛이 맞으므로 부르지 않는다(다른 판과 같은 규칙) */
  var tintCache = {};
  function applyTint(model, hex) {
    var t = three();
    if (!hex) { return model; }
    var tc = new t.Color(hex);
    model.traverse(function (o) {
      if (!o.isMesh || !o.material) { return; }
      var src = o.material;
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

  /** 키 1 로 눕혀 담는다 — `mul` 로 실제 크기를 준다(사물마다 원하는 높이가 다르다) */
  function normalize(obj, mul) {
    var t = three();
    obj.updateMatrixWorld(true);
    var b = new t.Box3().setFromObject(obj);
    var h = (b.max.y - b.min.y) || 1;
    var s = (mul || 1) / h;
    var wrap = new t.Group();
    obj.scale.setScalar(s);
    obj.position.set(-((b.min.x + b.max.x) / 2) * s, -b.min.y * s, -((b.min.z + b.max.z) / 2) * s);
    wrap.add(obj);
    return wrap;
  }

  /* ── 애니메이션 이름 맞추기 (saga-forest·saga-dungeon 의 asset3d.js 와 같다) ──
   * 모델마다 클립 이름이 제각각이다. 이름을 씻어 놓고 **점수를 매겨** 가장 잘
   * 맞는 것부터 자리를 채운다. three 없이도 도는 순수 함수라 진단이 렌더러 없이
   * 검사할 수 있다. */
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

  /**
   * 인물 하나 — **몸 위에 옷·머리를 얹어 한 뼈대에 묶는다.** 셋 다 뼈 이름·순서가
   * 완전히 같으므로 스킨 메시를 몸의 스켈레톤에 다시 물리기만 하면 된다.
   */
  function assembleHero(parts, heightPx, tintHex) {
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

    var model = normalize(bodyScene, heightPx);
    applyTint(model, tintHex);
    return model;
  }

  /**
   * 인물 하나를 몸+옷+머리+몸짓(UAL1) 넷을 받아 조합한다(비동기, 콜백 방식).
   * 실패하거나 표에 조합이 없으면 cb(null) 로 부른다 — 부르는 쪽은 그러면
   * 지금처럼 도형(캡슐)을 그린다.
   *
   * @param seed      표에서 조합을 고를 씨앗(사람 id·적 이름 등)
   * @param heightPx  다 세운 뒤 세로 높이(이 판의 좌표는 픽셀이다)
   * @param tintHex   물들일 색(없으면 원래 옷 빛깔 그대로) — 짐승은 안 부른다
   */
  function buildHero(seed, heightPx, tintHex, cb) {
    var t = three();
    var rec = heroRecipe(seed);
    if (!rec || !t) { cb(null); return; }

    var parts = {}, pending = 4;
    function onOne() { pending--; if (pending === 0) { assemble(); } }
    acquire(rec.body, function (c) { parts.body = c; onOne(); });
    acquire(rec.outfit, function (c) { parts.outfit = c; onOne(); });
    acquire(rec.hair, function (c) { parts.hair = c; onOne(); });
    acquire(ANIM_SRC, function (c) { parts.anim = c; onOne(); });

    function assemble() {
      if (!parts.body) { cb(null); return; }
      var model;
      try {
        model = assembleHero(parts, heightPx, tintHex);
      } catch (e) {
        broke = (e && e.message) ? e.message : 'hero assemble 실패';
        cb(null);
        return;
      }
      built++;
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

  /**
   * 지형지물 하나 — 표에서 골라 그대로 받아 키 `heightPx` 로 눕힌다 (비동기, 콜백 방식).
   * 실패하거나 three/GLTFLoader 가 없거나 표에 없으면 cb(null) 로 부른다 —
   * 부르는 쪽(side-view3d.js)은 그러면 지금처럼 도형을 그린다.
   *
   * @param kind      'tree:near' | 'tree:far' | 'rock' | 'hill'
   * @param seed      같은 자리는 늘 같은 모델이 걸리게 하는 값(자리 좌표 등)
   * @param heightPx  다 세운 뒤 세로 높이(이 판의 좌표는 픽셀이다)
   */
  function build(kind, seed, heightPx, cb) {
    var hit = lookup(kind);
    if (!hit) { cb(null); return; }
    var url = oneOf(hit.url, seed);
    if (!url || typeof url !== 'string') { cb(null); return; }
    acquire(url, function (c) {
      if (!c || !c.gltf) { cb(null); return; }
      built++;
      var model;
      try {
        model = normalize(cloneScene(c.gltf), heightPx);
      } catch (e) {
        broke = (e && e.message) ? e.message : (kind + ' 조립 실패');
        cb(null);
        return;
      }
      cb(model);
    });
  }

  /** 맞으면 번쩍이는 재질들 — 배우가 GLB 든 도형이든, 지금 보이는 모든 메시의
   *  재질을 사본으로 떼어 온다(사본이라야 배우끼리 안 부딪힌다 — tintCache 를
   *  공유하는 재질을 그대로 건드리면 같은 옷을 입은 다른 배우까지 번쩍인다) */
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

  global.DG = global.DG || {};
  global.DG.asset3d = {
    register: register,
    restore: restore,
    clear: clear,
    lookup: lookup,
    oneOf: oneOf,
    heroRecipe: heroRecipe,
    mapClips: mapClips,
    build: build,
    buildHero: buildHero,
    ownAllMat: ownAllMat,
    three: three,
    REG: function () { return REG; },
    stats: function () { return { built: built, broke: broke }; }
  };
})(typeof window !== 'undefined' ? window : this);
