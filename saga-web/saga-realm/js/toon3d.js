/**
 * 툰 재질 공용 부품 — SAGA-DESIGN §6.0/§6.1 적용
 * ---------------------------------------------------------------
 * `realm3d.js`(지형·바다·소품)·`battle3d.js`(깃발·전장 바닥)·`city3d.js`(성 안
 * 바닥)와 `asset3d.js`(GLB 인물·짐승·건물을 벗기는 `delam()`, 대역 프리미티브,
 * 세력 깃발)가 같은 규격의 3단 램프 툰 재질을 쓰게 한다.
 *
 *   ramp()            3단 그라디언트 맵(MeshToonMaterial.gradientMap)
 *   lambertLike(opts)  `new MeshLambertMaterial(opts)` 자리를 그대로 대신한다
 *   toonify(material)  이미 만든 재질(Standard/Physical 등)을 툰으로 바꿔 낸다
 *
 * **바다·강(`MeshPhongMaterial`)과 길·안개 등 `MeshBasicMaterial` 자리는
 * 건드리지 않는다** — 반투명·언라이트 표현이라 툰 램프와 무관하다.
 *
 * **외곽선은 이번 손질에서 뺐다** — 다섯 판 공통으로 화면 확인이 안 되는
 * 세션에서는 무릅쓰지 않기로 한 결정(사가고 제외, 그쪽은 choke point가 있어
 * 먼저 넣었다). PLAN §6 후속 과제로 남긴다.
 *
 * three 가 없으면(자가진단) 아무 것도 안 한다 — 판정에는 한 줄도 안 닿는다.
 */
(function (global) {
  'use strict';

  var T = null;
  function three() { if (!T) { T = global.THREE || null; } return T; }

  var rampTex = null;
  function ramp() {
    if (rampTex) { return rampTex; }
    var t = three();
    if (!t) { return null; }
    var data = new Uint8Array([80, 80, 80, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
    rampTex = new t.DataTexture(data, 3, 1, t.RGBAFormat);
    rampTex.magFilter = t.NearestFilter;
    rampTex.minFilter = t.NearestFilter;
    rampTex.needsUpdate = true;
    return rampTex;
  }

  /** 툰 손잡이 — 0 이면 예전 재질 그대로(되돌림용) */
  function TOON_ON() {
    var core = global.DG && global.DG.core;
    return core && core.tuned ? (core.tuned('world3d.toon', 1) ? true : false) : true;
  }

  /** 림 라이트 손잡이(2026-09-23, 사가의숲에서 옮김) — 툰이 꺼지면 같이 꺼진다 */
  function RIM_ON() {
    var core = global.DG && global.DG.core;
    if (!TOON_ON()) { return false; }
    return core && core.tuned ? (core.tuned('world3d.rim', 1) ? true : false) : true;
  }

  /**
   * 프레넬 림 라이트("원신급" 요청 2단계, 2026-09-23) — 사가의숲 `toon3d.js` 에서 옮기되 한 가지를 바꿨다:
   * 그쪽은 빛과 무관하게 따뜻한 흰빛을 **더해** 어두운 곳(던전·밤)에서도 가장자리가 형광처럼 뜰 수 있어,
   * 여기서는 **그 자리의 밝기에 비례해** 가장자리를 밝힌다 — 어두우면 거의 안 보인다. 안개·톤매핑 전
   * (`opaque_fragment` 바로 뒤)에 넣어 멀리 안개에 묻힌 인물 테두리가 안개색으로 번지지 않게 했다.
   * 법선은 스키닝을 거친 `objectNormal` 을 쓴다(걷는 팔다리에도 맞는 테두리). **배우(사람·짐승)에만** 건다 —
   * 땅에 걸면 낮은 카메라에서 먼 지면 전체가 스치는 각도라 지평선이 통째로 뿌옇게 뜬다.
   * 이미 다른 셰이더 덧대기(`onBeforeCompile`)가 있는 재질은 건너뛴다(프로그램 캐시 키가 섞이지 않게).
   * 렌더 결과(두께·세기)는 화면 없이는 못 본다 — 실기 확인 몫.
   */
  function applyRimLight(mat) {
    var t = three();
    if (!t || !mat || !RIM_ON() || (mat.userData && mat.userData.rimApplied)) { return mat; }
    if (!mat.isMeshToonMaterial && !mat.isMeshLambertMaterial) { return mat; }
    if (Object.prototype.hasOwnProperty.call(mat, 'onBeforeCompile')) { return mat; }
    mat.userData = mat.userData || {};
    mat.userData.rimApplied = true;
    mat.onBeforeCompile = function (shader) {
      shader.uniforms.rimColor = { value: new t.Color(0xfff0d8) };
      shader.uniforms.rimPower = { value: 2.4 };
      shader.uniforms.rimIntensity = { value: 0.9 };
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vRimN;\nvarying vec3 vRimV;'
      ).replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvRimN = normalize( normalMatrix * objectNormal );\nvRimV = normalize( -mvPosition.xyz );'
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        '#include <common>\nuniform vec3 rimColor;\nuniform float rimPower;\nuniform float rimIntensity;\nvarying vec3 vRimN;\nvarying vec3 vRimV;'
      ).replace(
        '#include <opaque_fragment>',
        '#include <opaque_fragment>\nfloat rimF = pow( 1.0 - clamp( abs( dot( normalize( vRimN ), normalize( vRimV ) ) ), 0.0, 1.0 ), rimPower );\ngl_FragColor.rgb += gl_FragColor.rgb * rimColor * ( rimIntensity * rimF );'
      );
    };
    return mat;
  }

  /** 재질 사본 — three 의 `clone()` 은 `onBeforeCompile`(림·VRoid 얼굴 그림자 셰이더)을 안 옮겨 사본이 맨 툰으로
   *  떨어진다(2026-09-23). 맞으면 번쩍이는 사본(`ownAllMat`)·반투명 사본 등 배우 재질을 떼어 올 때 이걸 쓴다 */
  function cloneMat(src) {
    var m = src.clone();
    var own = Object.prototype.hasOwnProperty;
    if (own.call(src, 'onBeforeCompile')) { m.onBeforeCompile = src.onBeforeCompile; }
    if (own.call(src, 'customProgramCacheKey')) { m.customProgramCacheKey = src.customProgramCacheKey; }
    return m;
  }

  /** 하늘 그라디언트 손잡이 — 0 이면 예전 단색 배경 */
  function SKY_ON() {
    var core = global.DG && global.DG.core;
    return core && core.tuned ? (core.tuned('world3d.skyGrad', 1) ? true : false) : true;
  }

  /**
   * 하늘 그라디언트 배경("원신급" 요청 2단계, 2026-09-23) — 단색 `scene.background` 를 화면 세로 그라디언트 텍스처로 바꾼다.
   * 사가의숲은 카메라를 따라다니는 구(`makeSkyDome`)를 쓰지만, 여기선 배경 텍스처 한 장이라 드로우콜·카메라 추적이 없다.
   * 아래 35% 는 지평선색(= 이 판이 안개색으로 쓰는 그 색) 그대로라 안개와 이음매가 안 생기고, 위로 갈수록 짙어진다 —
   * 밝은 하늘은 깊은 파랑 쪽으로, 어두운 하늘(굴·불 골짜기)은 같은 색을 반쯤 어둡게. 색마다 한 장만 만들어 캐싱한다.
   * 손잡이가 꺼져 있거나 three 가 없으면 예전과 같은 `Color` 를 돌려준다. 렌더 결과는 실기 확인 몫.
   */
  var skyCache = {};
  function skyBackground(hex) {
    var t = three();
    if (!t) { return null; }
    if (!SKY_ON() || !t.DataTexture) { return new t.Color(hex); }
    var key = String(hex >>> 0);
    if (skyCache[key]) { return skyCache[key]; }
    var H = 64, data = new Uint8Array(H * 4), i;
    var r0 = (hex >> 16) & 255, g0 = (hex >> 8) & 255, b0 = hex & 255;
    var lum = (0.299 * r0 + 0.587 * g0 + 0.114 * b0) / 255, r1, g1, b1;
    if (lum > 0.35) { r1 = r0 + (0x3a - r0) * 0.55; g1 = g0 + (0x6c - g0) * 0.55; b1 = b0 + (0xc8 - b0) * 0.55; }
    else { r1 = r0 * 0.5; g1 = g0 * 0.5; b1 = b0 * 0.5; }
    for (i = 0; i < H; i++) {
      var v = i / (H - 1), s = v < 0.35 ? 0 : (v - 0.35) / 0.65;
      s = s * s * (3 - 2 * s);
      data[i * 4] = Math.round(r0 + (r1 - r0) * s);
      data[i * 4 + 1] = Math.round(g0 + (g1 - g0) * s);
      data[i * 4 + 2] = Math.round(b0 + (b1 - b0) * s);
      data[i * 4 + 3] = 255;
    }
    var tex = new t.DataTexture(data, 1, H, t.RGBAFormat);   // 0 번 줄 = 화면 아래(지평선)
    tex.magFilter = t.LinearFilter;
    tex.minFilter = t.LinearFilter;
    if (t.SRGBColorSpace) { tex.colorSpace = t.SRGBColorSpace; }
    tex.needsUpdate = true;
    tex.userData = { skyHorizon: hex >>> 0 };
    skyCache[key] = tex;
    return tex;
  }

  /** 기존 재질 하나를 3단 툰 재질로 — 빛깔·맵·투명만 옮긴다(PBR 값은 버린다) */
  function toonify(src) {
    var t = three();
    if (!t || !src) { return src; }
    if (Array.isArray(src)) { return src.map(toonify); }
    if (src.isMeshToonMaterial) { return src; }
    return new t.MeshToonMaterial({
      color: src.color ? src.color.clone() : new t.Color(0xffffff),
      map: src.map || null,
      vertexColors: !!src.vertexColors,
      transparent: !!src.transparent,
      opacity: src.opacity === undefined ? 1 : src.opacity,
      alphaTest: src.alphaTest || 0,
      side: src.side === undefined ? t.FrontSide : src.side,
      gradientMap: ramp()
    });
  }

  /** `new MeshLambertMaterial(opts)` 자리를 그대로 대신한다 — opts 는 손 안 댄다 */
  function lambertLike(opts) {
    var t = three();
    if (!t) { return null; }
    if (!TOON_ON()) { return new t.MeshLambertMaterial(opts); }
    var o = {}, k;
    for (k in opts) { if (Object.prototype.hasOwnProperty.call(opts, k)) { o[k] = opts[k]; } }
    o.gradientMap = ramp();
    return new t.MeshToonMaterial(o);
  }

  global.DG = global.DG || {};
  global.DG.toon3d = { ramp: ramp, toonify: toonify, lambertLike: lambertLike, TOON_ON: TOON_ON, RIM_ON: RIM_ON, applyRimLight: applyRimLight, cloneMat: cloneMat, skyBackground: skyBackground, SKY_ON: SKY_ON };
})(window);
