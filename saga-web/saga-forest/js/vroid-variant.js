/**
 * VRoid 몸 변형 — 같은 몸 넷(avatar_sample_a·b·c, avatar_custom_01)을 인물 백여 명이 나눠 써도
 * 머리·옷·눈동자 색이 인물마다 달라 보이게 한다. (다섯 판 공용 복사본 — 고치면 다섯 벌 함께, md5 로 확인)
 *
 * 2026-09-20 — 사용자 "104명은 다 바꾸라고 했는데" → (b) 기존 몸 4개 배정 + 색 변형.
 * 몸 자체가 다른 인물(고유 모델)은 (a) 트랙(VRoid Studio 로 한 명씩 제작)이라 이 파일이 대신하지 못한다.
 *
 *   - 색은 **재질 이름**으로 고른다: `_HAIR`(머리)·`_CLOTH`(옷: Tops/Bottoms/Shoes)·`EyeIris`(눈동자). 피부·얼굴은 안 건드린다.
 *   - 텍스처 × `material.color` 로 곱한다(GLB 재질 색은 전부 1). 그래서 어두운 원본은 어두운 채로 남는다 —
 *     팔레트는 1 을 넘는 곱(밝게)도 쓴다. 실제 화면에서 어떤지는 눈으로 확인하지 못했다(실기 몫).
 *   - 원본 재질은 절대 안 바꾼다(조립된 몸들이 재질을 공유한다) — 재질을 복제해 (원본 uuid + 종류 + 칸) 으로 캐시한다.
 *   - 같은 인물 id 는 늘 같은 색이다(해시). 칸은 12×12×12 = 1728 조합.
 */
(function (global) {
  'use strict';

  global.DG = global.DG || {};

  var N = 12;

  function hsl(h, s, l) {
    function f(n) {
      var k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
      return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    }
    return [f(0), f(8), f(4)];
  }

  /** 첫 칸은 원본 그대로(1,1,1) — 나머지 열한 칸은 색상환을 돈다. gain 은 어두운 원본을 살리는 밝기 배수 */
  function palette(sat, light, gain) {
    var out = [[1, 1, 1]], i;
    for (i = 0; i < N - 1; i++) {
      var c = hsl(i / (N - 1), sat, light);
      out.push([c[0] * gain, c[1] * gain, c[2] * gain]);
    }
    return out;
  }

  var HAIR = palette(0.5, 0.5, 1.7);
  var CLOTH = palette(0.6, 0.5, 1.5);
  var EYE = palette(0.7, 0.5, 1.8);

  function hash(s) {
    s = String(s === undefined || s === null ? '' : s);
    var h = 2166136261, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }

  /** 인물 id → 칸 셋 { hair, cloth, eye } (각 0~11) */
  function pick(id) {
    var h = hash(id);
    return { hair: h % N, cloth: Math.floor(h / N) % N, eye: Math.floor(h / (N * N)) % N };
  }

  function kindOf(name) {
    if (/_HAIR/.test(name)) { return 'hair'; }
    if (/_CLOTH/.test(name)) { return 'cloth'; }
    if (/EyeIris/.test(name)) { return 'eye'; }
    return '';
  }

  /** 옷은 종류마다 칸을 비켜 가서 윗도리·아랫도리·신이 같은 색이 되지 않는다 */
  function clothSlot(name, base) {
    if (/Bottoms/.test(name)) { return (base + 5) % N; }
    if (/Shoes/.test(name)) { return (base + 8) % N; }
    return base;
  }

  var cache = {}, baseOf = {};   // baseOf: 변형 재질 uuid → 원본 재질(두 번 입혀도 원본에서 다시 만든다)

  /** three 의 `material.clone()` 은 `onBeforeCompile`(림·얼굴 셰이더)을 안 옮긴다 — 손으로 넘긴다 */
  function carryShader(src, m) {
    if (Object.prototype.hasOwnProperty.call(src, 'onBeforeCompile')) { m.onBeforeCompile = src.onBeforeCompile; }
    if (Object.prototype.hasOwnProperty.call(src, 'customProgramCacheKey')) { m.customProgramCacheKey = src.customProgramCacheKey; }
    return m;
  }

  function variantOf(src, kind, slot) {
    var key = (src.uuid || src.name || '') + '|' + kind + '|' + slot;
    if (!cache[key]) {
      var m = carryShader(src, src.clone());
      var pal = kind === 'hair' ? HAIR : kind === 'eye' ? EYE : CLOTH;
      var c = pal[slot];
      if (m.color && slot > 0) { m.color.setRGB(m.color.r * c[0], m.color.g * c[1], m.color.b * c[2]); }
      m.userData = m.userData || {};
      m.userData.vroidVariant = kind + slot;
      baseOf[m.uuid] = src;
      cache[key] = m;
    }
    return cache[key];
  }

  /**
   * 조립된 VRoid 몸의 머리·옷·눈동자 재질을 그 인물의 색으로 바꾼다. 몸 안의 다른 재질은 그대로.
   * @returns { hair, cloth, eye } — 적용한 칸(진단·화면용)
   */
  function apply(model, id) {
    var p = pick(id);
    if (!model || !model.traverse) { return p; }
    model.traverse(function (o) {
      if (!o.isMesh || !o.material) { return; }
      var isArr = Array.isArray(o.material), mats = isArr ? o.material : [o.material], out = [], i, changed = false;
      for (i = 0; i < mats.length; i++) {
        var src = mats[i], name = (src && src.name) || '', kind = kindOf(name);
        if (!kind || !src.clone) { out.push(src); continue; }
        var slot = kind === 'hair' ? p.hair : kind === 'eye' ? p.eye : clothSlot(name, p.cloth);
        out.push(variantOf(baseOf[src.uuid] || src, kind, slot));
        changed = true;
      }
      if (changed) { o.material = isArr ? out : out[0]; }
    });
    model.userData = model.userData || {};
    model.userData.vroidVariant = p;
    return p;
  }

  /** 이 몸이 VRoid(경로에 /people/anime/) 인가 — 다른 몸(QRPG·MPFB)에는 안 건다 */
  function isVroid(url) { return typeof url === 'string' && url.indexOf('/people/anime/') >= 0; }

  /**
   * 2026-09-20 — **정면을 +Z 로 맞춘다.** 이 저장소의 VRM(`/people/anime/`) 넷은 전부 VRM 0.x 라 정면이 **-Z** 다
   * (GLB 를 직접 재 봤다 — 발끝이 발목보다 -Z). 다섯 판의 배우는 QRPG·MPFB 처럼 +Z 가 앞이라는 가정으로 돌려 세우는데
   * (`rotation.y = atan2(dx, dz)`·`lookAt`) VRM 만 그대로 세우면 **뒷걸음질(이동 반대)·마주 서야 할 때 등을 돌림·초상이 뒷모습**이 된다.
   * 몸의 **안쪽**에 그룹 하나를 끼워 그 안에서 반 바퀴 돌린다 — 뼈·몸짓은 안 건드린다(`anim-own` 은 뼈 로컬 값만 읽어 바깥 회전에 안 흔들린다).
   * **모델 자신의 `rotation.y` 는 건드리지 않는다**: 사가의숲은 돌려받은 모델을 그대로 `player.group` 으로 쓰며 매 프레임
   * `group.rotation.y = 걸음각` 을 대입한다 — 처음 고침(모델에 π 를 줌)은 그 대입에 지워져 숲에서만 여전히 뒤로 걸었다(2026-09-20 재보고).
   * 이미 돌렸으면 다시 안 돌린다. VRM 이 아닌 몸(url 이 다르면)은 그대로 둔다.
   */
  function faceFront(model, url) {
    if (!model || !isVroid(url)) { return model; }
    model.userData = model.userData || {};
    if (model.userData.vrmFront) { return model; }
    if (model.isMesh) { model.rotation.y = Math.PI; }   // 몸이 메시 하나인 경우는 안쪽에 낄 자리가 없다(지금 VRM 은 전부 그룹)
    else {
      var inner = new model.constructor();
      inner.name = 'vrmFront';
      while (model.children.length) { inner.add(model.children[0]); }
      inner.rotation.y = Math.PI;
      model.add(inner);
    }
    model.userData.vrmFront = true;
    return model;
  }

  /* ── 원신식 셀 셰이딩(2026-09-23, "원신급" 요청) ──────────────────────────────────────────────
   * VRM 은 재질을 `KHR_materials_unlit` 로 내보내 GLTFLoader 가 `MeshBasicMaterial`(빛을 안 받는다)로 읽는다.
   * 다섯 판 `delam()` 은 Standard/Physical 만 보므로 사가의숲(`toonifyAnime`)을 뺀 네 판은 VRoid 인물이
   * **명암 없이 평면으로(밤에도 환하게)** 그려지고 있었다. 사가의숲은 툰으로 바꾸긴 했지만 새 재질에 **이름**을
   * 안 옮겨, 위 `apply()`(재질 이름으로 머리·옷·눈을 고른다)가 한 칸도 못 바꿨다.
   *
   *   shade(root, url)  VRoid 재질 → 그 판의 툰 재질(`toon3d.toonify`). 이름·깊이쓰기를 지키고 얼굴엔 아래 얼굴 그림자를 건다.
   *                     GLB 를 받은 직후(원본 씬, 복제 전) 한 번 — 복제본은 재질을 나눠 쓴다.
   *   얼굴 그림자       원신류 "SDF 얼굴 그림자"를 텍스처 없이 해석식으로 흉내낸다. 코·눈두덩의 굴곡 법선 대신
   *                     **머리뼈의 앞·옆 방향과 주광 방향**만으로 얼굴을 세로 경계 하나로 두 톤(밝음/중간)으로 가른다 —
   *                     정면광이면 얼굴 전체가 밝고, 옆에서 오면 빛 쪽 절반, 뒤에서 오면 전체가 중간 톤이다.
   *                     머리를 돌려도 따라가도록 셰이더가 머리뼈 행렬(`getBoneMatrix`)을 직접 읽는다(매 프레임 JS 일 없음).
   *                     주광은 `directionalLights[0]` — three 는 그림자를 드리우는 빛을 앞에 세운다.
   * 손잡이: `world3d.faceShade`(기본 1, 0 이면 얼굴도 몸과 같은 보통 툰). 툰(`world3d.toon`)이 꺼지면 예전처럼 Lambert.
   * 렌더 결과(경계 위치·부드러움)는 화면 없이는 못 본다 — 실기 확인 몫.
   */
  var FACE_RE = /_FACE\b|_EYE\b|Face_\d+_SKIN/;   // 얼굴 메시 재질: 피부·입·눈썹·속눈썹·눈(몸 피부 Body_00_SKIN 은 아니다)
  var EYE_RE = /EyeWhite|EyeIris/;
  var SKIN_RE = /Face_\d+_SKIN/;
  var HEAD_BONE = 'J_Bip_C_Head';

  function faceShadeOn() {
    var core = global.DG && global.DG.core;
    return core && core.tuned ? !!core.tuned('world3d.faceShade', 1) : true;
  }

  /** 셰이더 덧대기 사슬 — 먼저 걸린 것(림 등)을 앞에 돌리고, 프로그램 캐시 키도 합쳐 서로 섞이지 않게 한다 */
  function chainCompile(mat, key, fn) {
    var own = Object.prototype.hasOwnProperty;
    var prev = own.call(mat, 'onBeforeCompile') ? mat.onBeforeCompile : null;
    var prevKey = !prev ? '' : own.call(mat, 'customProgramCacheKey') ? mat.customProgramCacheKey() : String(prev);
    mat.onBeforeCompile = function (shader, renderer) {
      if (prev) { prev.call(this, shader, renderer); }
      fn(shader);
    };
    mat.customProgramCacheKey = function () { return key + '|' + prevKey; };
  }

  function boneIndex(skel) {
    if (!skel || !skel.bones) { return -1; }
    for (var i = 0; i < skel.bones.length; i++) { if (skel.bones[i].name === HEAD_BONE) { return i; } }
    return -1;
  }

  /** 메시가 실제로 쓰는(인덱스가 가리키는) 꼭짓점을 bind 공간 좌표로 한 번씩 돈다 */
  function eachBindVertex(t, mesh, fn) {
    var g = mesh.geometry, pos = g && g.attributes && g.attributes.position;
    if (!pos) { return; }
    var idx = g.index, n = idx ? idx.count : pos.count, seen = idx ? new Uint8Array(pos.count) : null, v = new t.Vector3(), i, k;
    for (i = 0; i < n; i++) {
      k = idx ? idx.getX(i) : i;
      if (seen) { if (seen[k]) { continue; } seen[k] = 1; }
      v.fromBufferAttribute(pos, k);
      if (mesh.isSkinnedMesh && mesh.bindMatrix) { v.applyMatrix4(mesh.bindMatrix); }
      fn(v);
    }
  }

  /**
   * 얼굴 틀(bind 공간) — 가운데는 두 눈 꼭짓점의 무게중심, 앞은 머리뼈→눈의 수평 방향(정면 -Z 든 +Z 든 모델이 알려 준다),
   * 옆은 앞×위, 반폭은 눈보다 앞쪽 피부 꼭짓점의 옆 거리 최댓값의 0.9 배. 못 재면 null(얼굴 그림자 없이 보통 툰)
   */
  function faceFrame(t, root) {
    var eyes = [], skins = [], skel = null;
    root.traverse(function (o) {
      if (!o.isSkinnedMesh || !o.material) { return; }
      var nm = (Array.isArray(o.material) ? o.material[0] : o.material).name || '';
      if (EYE_RE.test(nm)) { eyes.push(o); }
      if (SKIN_RE.test(nm)) { skins.push(o); skel = skel || o.skeleton; }
    });
    var bone = boneIndex(skel);
    if (bone < 0 || !eyes.length || !skel.boneInverses[bone]) { return null; }
    var head = new t.Vector3().setFromMatrixPosition(new t.Matrix4().copy(skel.boneInverses[bone]).invert());
    var center = new t.Vector3(), ne = 0;
    eyes.forEach(function (m) { eachBindVertex(t, m, function (v) { center.add(v); ne++; }); });
    if (!ne) { return null; }
    center.multiplyScalar(1 / ne);
    var fwd = new t.Vector3(center.x - head.x, 0, center.z - head.z);
    var depth = fwd.length();
    if (depth < 1e-6) { return null; }
    fwd.multiplyScalar(1 / depth);
    var right = new t.Vector3().crossVectors(fwd, new t.Vector3(0, 1, 0)).normalize();
    var half = 0, d = new t.Vector3();
    skins.forEach(function (m) {
      eachBindVertex(t, m, function (v) {
        d.subVectors(v, center);
        if (d.dot(fwd) > -depth) { half = Math.max(half, Math.abs(d.dot(right))); }
      });
    });
    if (!(half > 0)) { half = depth; }
    return { bone: bone, center: center, fwd: fwd, right: right, half: half * 0.9 };
  }

  var FACE_VERT_DECL = [
    'uniform float vfsBone;', 'uniform vec3 vfsCenter;', 'uniform vec3 vfsFwd;', 'uniform vec3 vfsRight;', 'uniform float vfsHalf;',
    'varying float vVfsX;', 'varying vec3 vVfsFwd;', 'varying vec3 vVfsRight;'
  ].join('\n');
  var FACE_VERT_MAIN = [
    '#ifdef USE_SKINNING',
    '  vVfsX = dot( ( bindMatrix * vec4( position, 1.0 ) ).xyz - vfsCenter, vfsRight ) / vfsHalf;',
    '  mat4 vfsM = modelViewMatrix * bindMatrixInverse * getBoneMatrix( vfsBone );',
    '  vVfsFwd = ( vfsM * vec4( vfsFwd, 0.0 ) ).xyz;',
    '  vVfsRight = ( vfsM * vec4( vfsRight, 0.0 ) ).xyz;',
    '#else',
    '  vVfsX = 0.0;',
    '  vVfsFwd = vec3( 0.0, 0.0, 1.0 );',
    '  vVfsRight = vec3( 1.0, 0.0, 0.0 );',
    '#endif'
  ].join('\n');
  var FACE_FRAG_DECL = [
    'uniform float vfsSoft;', 'varying float vVfsX;', 'varying vec3 vVfsFwd;', 'varying vec3 vVfsRight;'
  ].join('\n');
  /* 빛의 수평 성분을 (앞 f, 옆 s) 로 재고, 얼굴 가로 좌표 x(-1~1)에서 x·sign(s) + f > 0 이면 밝다.
     밝으면 법선 = 빛 방향(램프 끝 칸), 그늘이면 빛과 직교(램프 가운데 칸) — 얼굴은 가장 어두운 칸에 안 떨어진다 */
  var FACE_FRAG_MAIN = [
    '#if NUM_DIR_LIGHTS > 0',
    '{',
    '  vec3 vfsL = directionalLights[ 0 ].direction;',
    '  vec3 vfsF = normalize( vVfsFwd );',
    '  vec3 vfsR = normalize( vVfsRight );',
    '  vec2 vfsH = vec2( dot( vfsL, vfsF ), dot( vfsL, vfsR ) );',
    '  float vfsLen = length( vfsH );',
    '  vfsH = vfsLen > 0.001 ? vfsH / vfsLen : vec2( 1.0, 0.0 );',
    '  float vfsSide = vfsH.y >= 0.0 ? 1.0 : -1.0;',
    '  float vfsLit = smoothstep( -vfsSoft, vfsSoft, vVfsX * vfsSide + vfsH.x );',
    '  vec3 vfsP = cross( vfsL, vfsR );',
    '  if ( dot( vfsP, vfsP ) < 0.0001 ) { vfsP = cross( vfsL, vfsF ); }',
    '  normal = normalize( vfsL * vfsLit + normalize( vfsP ) * ( 1.0 - vfsLit ) );',
    '}',
    '#endif'
  ].join('\n');

  function faceShadeMaterial(mat, fr, bone) {
    if (!mat || (mat.userData && mat.userData.vroidFace)) { return false; }
    mat.userData = mat.userData || {};
    mat.userData.vroidFace = { bone: bone };
    var U = {
      vfsBone: { value: bone }, vfsCenter: { value: fr.center.clone() }, vfsFwd: { value: fr.fwd.clone() },
      vfsRight: { value: fr.right.clone() }, vfsHalf: { value: fr.half }, vfsSoft: { value: 0.05 }
    };
    chainCompile(mat, 'vroidFace', function (shader) {
      for (var k in U) { if (Object.prototype.hasOwnProperty.call(U, k)) { shader.uniforms[k] = U[k]; } }
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n' + FACE_VERT_DECL)
        .replace('#include <skinning_vertex>', '#include <skinning_vertex>\n' + FACE_VERT_MAIN);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + FACE_FRAG_DECL)
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + FACE_FRAG_MAIN);
    });
    return true;
  }

  /** @returns 바꾼 재질 수. VRoid 가 아니거나 three·toon3d 가 없으면 0(자가진단에서도 안전) */
  function shade(root, url) {
    var t = global.THREE, TN = global.DG && global.DG.toon3d;
    if (!t || !root || !root.traverse || !isVroid(url)) { return 0; }
    var toon = !!(TN && TN.toonify && (!TN.TOON_ON || TN.TOON_ON()));
    var n = 0, faces = [];
    root.traverse(function (o) {
      if (!o.isMesh || !o.material) { return; }
      var isArr = Array.isArray(o.material), mats = isArr ? o.material : [o.material];
      var out = mats.map(function (m) {
        if (!m || !m.isMeshBasicMaterial) { return m; }
        var nm = toon ? TN.toonify(m) : new t.MeshLambertMaterial({
          color: m.color ? m.color.clone() : new t.Color(0xffffff),
          map: m.map || null, vertexColors: !!m.vertexColors,
          transparent: !!m.transparent, opacity: m.opacity,
          alphaTest: m.alphaTest || 0, side: m.side
        });
        if (!nm || nm === m) { return m; }
        nm.name = m.name;                 // apply() 가 이름으로 머리·옷·눈을 고른다
        nm.depthWrite = m.depthWrite;     // 속눈썹·눈썹(BLEND)은 GLTFLoader 가 깊이쓰기를 꺼 둔다
        if (toon && TN.applyRimLight) { TN.applyRimLight(nm); }
        if (toon && FACE_RE.test(m.name || '')) { faces.push({ mesh: o, mat: nm }); }
        n++;
        return nm;
      });
      o.material = isArr ? out : out[0];
    });
    if (faces.length && faceShadeOn()) {
      var fr = faceFrame(t, root);
      if (fr) {
        faces.forEach(function (f) {
          var b = boneIndex(f.mesh.skeleton);
          if (b >= 0) { faceShadeMaterial(f.mat, fr, b); }
        });
      }
    }
    return n;
  }

  global.DG.vroidVariant = { N: N, HAIR: HAIR, CLOTH: CLOTH, EYE: EYE, pick: pick, apply: apply, isVroid: isVroid, faceFront: faceFront, hash: hash,
    shade: shade, faceFrame: faceFrame, FACE_RE: FACE_RE };
})(window);
