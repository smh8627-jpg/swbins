/**
 * 3D 에셋 창고 — GLB 를 끼워 넣을 자리를 만든다 (3D 전환 PHASE 3)
 * (중략된 주석은 원본과 동일하게 유지됩니다)
 */
(function (global) {
  'use strict';

  var T = null;
  function three() { if (!T) { T = global.THREE || null; } return T; }
  function core() { return global.DG.core; }

  function GLB_ON() { return core().tuned('world3d.glb', 1) ? true : false; }

  var PEOPLE = 'assets/models/people/';
  var BLD = 'assets/models/buildings/';
  var REGULAR = PEOPLE + 'regular/';
  var ANIM_DIR = 'assets/models/anim/';

  var HERO_RECIPES = [
    { key: 'male_peasant_buzzed', body: REGULAR + 'Superhero_Male_FullBody.gltf', outfit: REGULAR + 'Male_Peasant.gltf', hair: REGULAR + 'Hair_Buzzed.gltf' },
    { key: 'male_ranger_long', body: REGULAR + 'Superhero_Male_FullBody.gltf', outfit: REGULAR + 'Male_Ranger.gltf', hair: REGULAR + 'Hair_Long.gltf' },
    { key: 'male_peasant_beard', body: REGULAR + 'Superhero_Male_FullBody.gltf', outfit: REGULAR + 'Male_Peasant.gltf', hair: REGULAR + 'Hair_Beard.gltf' },
    { key: 'female_peasant_buns', body: REGULAR + 'Superhero_Female_FullBody.gltf', outfit: REGULAR + 'Female_Peasant.gltf', hair: REGULAR + 'Hair_Buns.gltf' },
    { key: 'female_ranger_simple', body: REGULAR + 'Superhero_Female_FullBody.gltf', outfit: REGULAR + 'Female_Ranger.gltf', hair: REGULAR + 'Hair_SimpleParted.gltf' },
    { key: 'female_peasant_buzzed', body: REGULAR + 'Superhero_Female_FullBody.gltf', outfit: REGULAR + 'Female_Peasant.gltf', hair: REGULAR + 'Hair_BuzzedFemale.gltf' }
  ];

  var SKIP_AUTORETARGET = {};
  HERO_RECIPES.forEach(function (r) {
    SKIP_AUTORETARGET[r.body] = SKIP_AUTORETARGET[r.outfit] = SKIP_AUTORETARGET[r.hair] = true;
  });

  var DEFAULTS = {
    'hero': HERO_RECIPES,
    'pet:an_deer': 'assets/models/animals/Deer.glb',
    'pet:an_wolf': 'assets/models/animals/Wolf.glb',
    'pet:an_ox':   'assets/models/animals/Cow.glb',
    'pet:an_carp': 'assets/models/animals/Koi.glb',
    'pet:an_magpie': 'assets/models/animals/Mesh_Crow.gltf',
    'station': BLD + 'Inn.glb',
    'fort:t1': BLD + 'Watchtower.glb',
    'fort:t2': [BLD + 'Tower.glb', BLD + 'PointyTower.glb'],
    'fort:t3': [BLD + 'LargeTower.glb', BLD + 'LargeSquareTowerBricks.glb'],
    'fort': BLD + 'Tower.glb'
  };

  var REG = {};
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

  function keysFor(kind, ref) {
    var r = ref || {};
    if (kind === 'hero') { return ['hero:' + r.id, 'hero:era:' + r.era, 'hero'].filter(Boolean); }
    if (kind === 'pet') {
      var form = r.form || (global.DG.sprite && global.DG.sprite.beastFormOf ? global.DG.sprite.beastFormOf(r) : null);
      return ['pet:' + r.id, form ? 'pet:form:' + form : null, 'pet'].filter(Boolean);
    }
    if (kind === 'fort') { return [r.tier ? 'fort:t' + r.tier : null, 'fort'].filter(Boolean); }
    if (kind === 'station') { return [kind]; }
    return kind ? [kind] : [];
  }

  function lookup(kind, ref) {
    var ks = keysFor(kind, ref), i;
    for (i = 0; i < ks.length; i++) {
      if (REG[ks[i]]) { return { key: ks[i], url: REG[ks[i]] }; }
    }
    return null;
  }

  function oneOf(list, ref) {
    if (!list) { return null; }
    if (typeof list === 'string') { return list; }
    if (!list.length) { return null; }
    var s = String((ref && (ref.id || ref.name)) || ''), i, h = 0;
    for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return list[h % list.length];
  }

  function urlOf(kind, ref) {
    var h = lookup(kind, ref);
    if (!h) { return null; }
    var v = oneOf(h.url, ref);
    if (v && typeof v === 'object') { return v.key || null; }
    return v;
  }

  function heroRecipe(ref) {
    var h = lookup('hero', ref);
    if (!h) { return null; }
    var v = oneOf(h.url, ref);
    return (v && typeof v === 'object' && v.body) ? v : null;
  }

  function wants(kind, ref) { return GLB_ON() && !!urlOf(kind, ref); }

  function chain(kind, ref) {
    if (wants(kind, ref)) {
      var c = cache[urlOf(kind, ref)];
      if (!c || c.state !== 'fail') { return 'glb'; }
    }
    var A = global.DG.actor3d;
    if (A && A.plan && A.plan(kind, ref).length) { return 'shape'; }
    return 'primitive';
  }

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

  function fit(box) {
    var h = (box.maxY - box.minY) || 1;
    var s = 1 / h;
    return { scale: s, dy: -box.minY * s, dx: -((box.minX + box.maxX) / 2) * s, dz: -((box.minZ + box.maxZ) / 2) * s };
  }

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

  function markOf(kind, ref) {
    if (kind !== 'station' && kind !== 'fort') { return null; }
    if (!core().tuned('asset3d.mark', 1)) { return null; }
    var col = (ref && ref.color) || (kind === 'fort' ? '#8a5cc0' : '#e8c15a');
    if (kind === 'fort') { return { color: col, pole: 1.02, w: 0.22, flag: 0.34 }; }
    return { color: col, pole: 0.95, w: 0.30, flag: 0.18 };
  }

  var cache = {};
  var built = 0, swapped = 0, broke = '';

  function loader() {
    var t = three();
    if (!t || !t.GLTFLoader) { return null; }
    if (!loader.it) { loader.it = new t.GLTFLoader(); }
    return loader.it;
  }

  var ANIM_SRC = ANIM_DIR + 'UAL1_Standard.glb';

  function skeletonCount(obj) {
    var set = {};
    obj.traverse(function (o) { if (o.isSkinnedMesh && o.skeleton) { set[o.skeleton.uuid] = 1; } });
    return Object.keys(set).length;
  }

  function needsRetarget(c) {
    return !!(c && c.gltf && (!c.clips || !c.clips.length) && skeletonCount(c.gltf.scene) === 1);
  }

  function firstSkinned(obj) {
    var found = null;
    obj.traverse(function (o) { if (!found && o.isSkinnedMesh) { found = o; } });
    return found;
  }

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
    var tc = cloneScene(c.gltf), sc = cloneScene(src.gltf);
    var tm = firstSkinned(tc), sm = firstSkinned(sc);
    if (!tm || !sm) { return []; }
    tc.updateMatrixWorld(true); sc.updateMatrixWorld(true);

    var mul = sceneHeight(tc) / sceneHeight(sc);
    var names = boneNameMap(tm, sm);
    if (!names.count) { return []; }

    var out = [], i, clip;
    for (i = 0; i < src.clips.length; i++) {
      try {
        clip = t.SkeletonUtils.retargetClip(tm, sm, src.clips[i], { hip: 'Hips', scale: mul, names: names.map });
        if (clip) { clip.name = src.clips[i].name; out.push(clip); }
      } catch (e) { }
    }
    c.retargetScale = mul;
    return out;
  }

  function RETARGET_ON() { return core().tuned('asset3d.retarget', 1) ? true : false; }

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
   * [SAGA 리뉴얼 패치] 
   * 기존: PBR 재질을 Lambert로 강등하여 퀄리티 저하 발생.
   * 변경: 모바일 기기의 성능이 향상됨에 따라 원본 MeshStandardMaterial/MeshPhysicalMaterial을 
   * 그대로 보존하여 금속성(Metallic)과 거칠기(Roughness) 등 고품질 질감을 살립니다.
   */
  function delam(root) {
    return;
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
      if (needsRetarget(c) && url !== ANIM_SRC && !SKIP_AUTORETARGET[url]) {
        dressUp(c, function () { flush(c, c); });
        return;
      }
      flush(c, c);
    }, null, function () {
      c.state = 'fail';
      flush(c, null);
    });
  }

  function flush(c, arg) {
    var w = c.waiting; c.waiting = [];
    for (var i = 0; i < w.length; i++) { w[i](arg); }
  }

  function tintOf(kind, ref) {
    if (kind !== 'hero' || !ref) { return null; }
    var t = three();
    if (!t) { return null; }
    var D = global.DG.data;
    var base = ref.color || null;
    if (!base && ref.faction && D && D.faction) { base = D.faction(ref.faction).color; }
    if (!base) { base = '#8a94a6'; }

    var s = String(ref.id || ref.name || ''), i, h = 0;
    for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    var C = new t.Color(base);
    var hsl = { h: 0, s: 0, l: 0 };
    C.getHSL(hsl);
    var dh = ((h % 1000) / 1000 - 0.5) * 0.14;
    var dl = (((h >> 10) % 1000) / 1000 - 0.5) * 0.26;
    C.setHSL((hsl.h + dh + 1) % 1, Math.min(1, hsl.s * 0.9 + 0.12), Math.max(0.42, Math.min(0.82, hsl.l + dl)));
    return '#' + C.getHexString();
  }

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

  function cloneScene(gltf) {
    var t = three();
    if (t.SkeletonUtils && t.SkeletonUtils.clone) { return t.SkeletonUtils.clone(gltf.scene); }
    return gltf.scene.clone(true);
  }

  var REGION = /_(body|head|legs?|feet|foot|hair|hat|arms?|torso|pants|shoes?|face|beard|helmet|cape|skirt|top|bottom|acc\w*)$/i;
  var JOIN_GAP = 0.05;

  function yRange(o) {
    var t = three();
    if (!t || !o.isMesh || !o.geometry) { return null; }
    try {
      var b = new t.Box3().setFromObject(o);
      if (!isFinite(b.min.y) || !isFinite(b.max.y)) { return null; }
      return { min: b.min.y, max: b.max.y };
    } catch (e) { return null; }
  }

  function pickPieces(model, ref) {
    if (typeof model.updateMatrixWorld === 'function') { model.updateMatrixWorld(true); }
    var groups = {}, base = null, measurable = true;
    model.traverse(function (o) {
      if (!o.isMesh) { return; }
      var m = /^(.*)_(\d+)$/.exec(o.name || '');
      if (!m || !REGION.test(m[1])) {
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
          if (gap <= JOIN_GAP && i === hashPick) { keep = i; break; }
          if (Math.abs(gap) < bestGap) { bestGap = Math.abs(gap); keep = i; }
        }
        top = Math.max(top, ranges[keep].max);
      }
      for (i = 0; i < list.length; i++) { list[i].visible = (i === keep); }
    }
    return model;
  }

  function normalize(obj, mul) {
    var t = three();
    obj.updateMatrixWorld(true);
    var b = new t.Box3().setFromObject(obj);
    var f = fit({
      minX: b.min.x, maxX: b.max.x, minY: b.min.y, maxY: b.max.y, minZ: b.min.z, maxZ: b.max.z
    });
    var m = mul || 1;
    var wrap = new t.Group();
    obj.scale.setScalar(f.scale * m);
    obj.position.set(f.dx * m, f.dy * m, f.dz * m);
    wrap.userData.span = { w: (b.max.x - b.min.x) * f.scale * m, d: (b.max.z - b.min.z) * f.scale * m, h: m };
    wrap.add(obj);
    return wrap;
  }

  function addMark(wrap, mark) {
    var t = three();
    if (!t || !mark || !wrap) { return wrap; }
    var span = (wrap.userData && wrap.userData.span) || { w: 1, d: 1, h: 1 };
    var h = span.h || 1;
    var x = span.w / 2 + h * 0.07, z = -(span.d / 2) - h * 0.05;
    var poleH = h * mark.pole;
    var pole = new t.Mesh(new t.CylinderGeometry(h * 0.013, h * 0.013, poleH, 5), new t.MeshLambertMaterial({ color: 0x6b5533 }));
    pole.position.set(x, poleH / 2, z);
    wrap.add(pole);
    var fw = h * mark.w, fh = h * mark.flag;
    var cloth = new t.Mesh(new t.BoxGeometry(fw, fh, h * 0.008), new t.MeshLambertMaterial({ color: new t.Color(mark.color) }));
    cloth.position.set(x + fw / 2, poleH - fh * 0.62, z);
    wrap.add(cloth);
    return wrap;
  }

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

  function buildHero(ref, makeShape) {
    var t = three();
    var rec = heroRecipe(ref);
    if (!rec) { return null; }

    var shell = new t.Group();
    var shape = makeShape ? makeShape() : null;
    if (!shape) { shape = primitive('hero', ref); }
    if (shape) { shell.add(shape); shell.userData.rig = shape.userData && shape.userData.rig; }
    shell.userData.assetUrl = rec.body;
    shell.userData.assetState = 'shape';
    built++;

    var parts = {}, pending = 4;
    function onOne() { pending--; if (pending === 0) { assemble(); } }
    acquire(rec.body, function (c) { parts.body = c; onOne(); });
    acquire(rec.outfit, function (c) { parts.outfit = c; onOne(); });
    acquire(rec.hair, function (c) { parts.hair = c; onOne(); });
    acquire(ANIM_SRC, function (c) { parts.anim = c; onOne(); });

    function assemble() {
      if (!parts.body) { shell.userData.assetState = 'fail'; return; }
      var model;
      try { model = assembleHero(parts, ref); } 
      catch (e) { shell.userData.assetState = 'fail'; broke = (e && e.message) ? e.message : 'hero assemble 실패'; return; }
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

  function build(kind, ref, makeShape) {
    var t = three();
    if (!t) { return null; }
    if (kind === 'hero') { return GLB_ON() ? buildHero(ref, makeShape) : null; }
    var url = wants(kind, ref) ? urlOf(kind, ref) : null;
    if (!url) { return null; }

    var shell = new t.Group();
    var shape = makeShape ? makeShape() : null;
    if (!shape) { shape = primitive(kind, ref); }
    if (shape) { shell.add(shape); shell.userData.rig = shape.userData && shape.userData.rig; }
    shell.userData.assetUrl = url;
    shell.userData.assetState = 'shape';
    built++;

    acquire(url, function (c) {
      if (!c) { shell.userData.assetState = 'fail'; return; }
      var model;
      try {
        model = cloneScene(c.gltf);
        pickPieces(model, ref);
        model = normalize(model, heightMul(kind, ref));
        applyTint(model, tintOf(kind, ref));
        addMark(model, markOf(kind, ref));
      } catch (e) {
        shell.userData.assetState = 'fail'; broke = (e && e.message) ? e.message : 'swap 실패'; return;
      }
      while (shell.children.length) { shell.remove(shell.children[0]); }
      shell.add(model);
      shell.userData.rig = null;
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

  function stats() {
    var urls = Object.keys(cache), o = { registered: Object.keys(REG).length, loaded: 0, failed: 0 };
    for (var i = 0; i < urls.length; i++) {
      if (cache[urls[i]].state === 'ok') { o.loaded++; }
      if (cache[urls[i]].state === 'fail') { o.failed++; }
    }
    o.loader = !!loader();
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
    REG: REG, register: register, keysFor: keysFor, lookup: lookup, urlOf: urlOf,
    wants: wants, chain: chain, SLOTS: SLOTS, normName: normName, score: score, mapClips: mapClips, fit: fit,
    heightMul: heightMul, markOf: markOf, ready: function () { return !!three(); }, hasLoader: function () { return !!loader(); },
    DEFAULTS: DEFAULTS, restore: restore, tintOf: tintOf, oneOf: oneOf, pickPieces: pickPieces, ANIM_SRC: ANIM_SRC, heroRecipe: heroRecipe,
    build: build, step: step, play: play, primitive: primitive, stats: stats,
    clear: function () { var k; for (k in REG) { if (Object.prototype.hasOwnProperty.call(REG, k)) { delete REG[k]; } } cache = {}; return REG; }
  };
})(window);