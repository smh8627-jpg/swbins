/**
 * 3D 에셋 창고 — GLB 를 끼워 넣을 자리를 만든다 (3D 전환 PHASE 3)
 * ---------------------------------------------------------------
 * 지금 지도 위의 사람·짐승·건물은 `actor3d.js` 가 **도형을 조립해** 세운다.
 * 손으로 빚은 것이라 가볍고 어디서나 도는 대신, 아무리 다듬어도 손으로 빚은 티가 난다.
 * 언젠가 제대로 만든 모델(GLB)을 얹고 싶은데, 그때 가서 배우 세우는 코드를 뜯어고치면
 * 지금 서 있는 그림이 통째로 흔들린다. 그래서 **미리 자리만 파 둔다**.
 *
 *   REG           무엇을 무엇으로 세울지 적은 표. **지금은 비어 있다**
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
 * 아직 GLB 파일은 한 개도 없다. 그래서 **오늘 화면은 어제와 똑같다** — 그게 맞다.
 * 이 파일이 하는 일은 "나중에 파일만 놓으면 된다" 를 참으로 만드는 것이다.
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
   * 오래 비어 있었다. **이제 셋이 찼다** — 들의 짐승 사슴 · 늑대 · 소다
   * (Quaternius, CC0. `assets/ASSET_LICENSES.md`). 까치와 잉어는 아직 도형이다:
   * 새와 물고기는 맞는 모델을 못 찾았고, 억지로 다른 짐승을 세우느니 도형이 낫다.
   *
   * 인물은 아직 비워 둔다 — 이 판의 인물 일흔은 저마다 갓·도포·빛깔이 다르고
   * 그것을 `sprite.js` 가 정한다. 모델 하나를 일흔에 돌려 쓰면 **다 같은 사람**이
   * 되어 도감이 무너진다. 인물마다 다른 모델을 얹을 때 이 표에 한 줄씩 는다.
   */
  var PEOPLE = 'assets/models/people/';

  var DEFAULTS = {
    /* 인물 — **한 벌을 일흔이 나눠 쓴다.** 그대로 두면 일흔이 다 같은 사람이 되므로
       `tintOf` 가 세력 빛깔로 물들인다(아래). 그래도 갓·도포의 결은 잃는다 —
       사용자가 그것을 알고 **품질을 먼저** 골랐다(2026-08-28).
       `world3d.glb` 를 0 으로 내리면 여태 쓰던 도형으로 통째로 돌아간다.
       (이 모델만 뼈대 애니메이션을 들고 있다. 다른 사람 모델은 애니메이션이
        아예 없어 T 자로 서 버리므로 안 받았다 — 도형만 못하다) */
    /* **여섯 벌을 돌려 쓴다.** 인물 id 해시로 고르므로 같은 사람은 늘 같은 몸이다.
       그 위에 `tintOf` 가 세력 빛깔을 입혀 한 벌 안에서도 갈린다 */
    'hero': [
      PEOPLE + 'Knight.glb', PEOPLE + 'King.glb', PEOPLE + 'Casual.glb',
      PEOPLE + 'Farmer.glb', PEOPLE + 'Worker.glb', PEOPLE + 'Lady.glb'
    ],
    'pet:an_deer': 'assets/models/animals/Deer.glb',
    'pet:an_wolf': 'assets/models/animals/Wolf.glb',
    'pet:an_ox':   'assets/models/animals/Cow.glb',
    'pet:an_carp': 'assets/models/animals/Koi.glb'
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
    if (kind === 'station' || kind === 'fort') { return [kind]; }
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

  function urlOf(kind, ref) {
    var h = lookup(kind, ref);
    return h ? oneOf(h.url, ref) : null;
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
  var ANIM_SRC = PEOPLE + 'Knight.glb';

  /** 이 모델은 제 몸짓이 있나 — 없으면 옮겨 입혀야 한다 */
  function needsRetarget(c) {
    return !!(c && c.gltf && (!c.clips || !c.clips.length));
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
    var out = [], i, clip;
    for (i = 0; i < src.clips.length; i++) {
      try {
        clip = t.SkeletonUtils.retargetClip(tm, sm, src.clips[i], { hip: 'Hips' });
        if (clip) { clip.name = src.clips[i].name; out.push(clip); }
      } catch (e) { /* 이 클립 하나만 건너뛴다 */ }
    }
    return out;
  }

  /** 몸짓 원본을 받아 두고, 그것을 이 몸에 입힌 뒤 기다리던 쪽에 넘긴다 */
  function dressUp(c, done) {
    acquire(ANIM_SRC, function (src) {
      if (src && src.clips && src.clips.length) {
        c.clips = retargetInto(c, src);
        c.map = mapClips(c.clips.map(function (a) { return a.name; }));
        c.dressed = true;
      }
      done();
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
      c.clips = gltf.animations || [];
      c.map = mapClips(c.clips.map(function (a) { return a.name; }));
      /* 제 몸짓이 없으면 원본에서 옮겨 입힌다 (원본 자신은 빼고 — 무한 재귀) */
      if (needsRetarget(c) && url !== ANIM_SRC) {
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

  function pickPieces(model, ref) {
    var groups = {};
    model.traverse(function (o) {
      if (!o.isMesh) { return; }
      var m = /^(.*)_(\d+)$/.exec(o.name || '');
      /* **부위 이름이 붙은 것만 변형으로 본다.** `Knight_1·2·3` 은 변형이 아니라
         한 사람의 부품(몸·칼·방패)이라, 이름 끝의 숫자만 보고 고르면 둘이 꺼져
         칼만 남은 사람이 선다. 실제로 그렇게 됐다 */
      if (!m || !REGION.test(m[1])) { return; }
      (groups[m[1]] = groups[m[1]] || []).push(o);
    });
    var s = String((ref && (ref.id || ref.name)) || ''), i, h = 0;
    for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    var g, list, keep, n = 0;
    for (g in groups) {
      if (!groups.hasOwnProperty(g)) { continue; }
      list = groups[g];
      if (list.length < 2) { continue; }
      /* 무리마다 다른 자릿수를 봐야 몸통과 머리가 같이 움직이지 않는다.
         **부호 없는 자리이동(`>>>`)이어야 한다** — `>>` 는 32비트 부호를 타서
         음수가 나오고, 그러면 무리 전체가 꺼져 몸통도 머리도 없는 사람이 선다.
         실제로 관우가 다리만 남았다 */
      keep = (h >>> ((n * 3) % 29)) % list.length;
      for (i = 0; i < list.length; i++) { list[i].visible = (i === keep); }
      n++;
    }
    return model;
  }

  /** 키 1 로 눕혀 담는다 */
  function normalize(obj) {
    var t = three();
    var b = new t.Box3().setFromObject(obj);
    var f = fit({
      minX: b.min.x, maxX: b.max.x, minY: b.min.y, maxY: b.max.y, minZ: b.min.z, maxZ: b.max.z
    });
    var wrap = new t.Group();
    obj.scale.setScalar(f.scale);
    obj.position.set(f.dx, f.dy, f.dz);
    wrap.add(obj);
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
   * 배우 하나를 GLB 로 세운다 — `actor3d.build` 가 이 앞에서 부른다.
   *
   * GLB 는 받아 오는 데 시간이 걸리는데 지도는 지금 그려야 한다. 그래서
   * **껍데기(Group)** 를 먼저 돌려주고 그 안에 도형을 넣어 둔다. 다 받으면
   * 안의 것만 갈아 끼운다 — 껍데기를 쥔 `world3d` 는 아무것도 모른 채 그대로 돈다.
   *
   * @param makeShape 도형을 만드는 함수 (actor3d 가 자기 것을 건네준다)
   */
  function build(kind, ref, makeShape) {
    var t = three();
    if (!t) { return null; }
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
        model = normalize(model);
        applyTint(model, tintOf(kind, ref));
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
    /* 세우기 — three 가 있어야 한다 */
    ready: function () { return !!three(); },
    hasLoader: function () { return !!loader(); },
    DEFAULTS: DEFAULTS, restore: restore, tintOf: tintOf, oneOf: oneOf,
    pickPieces: pickPieces,
    ANIM_SRC: ANIM_SRC,
    build: build, step: step, play: play, primitive: primitive, stats: stats,
    /** 표를 비운다 (진단이 제 뒤를 치울 때) */
    clear: function () {
      var k; for (k in REG) { if (Object.prototype.hasOwnProperty.call(REG, k)) { delete REG[k]; } }
      cache = {};
      return REG;
    }
  };
})(window);
