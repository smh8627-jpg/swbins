/**
 * 툰 재질 공용 부품 — SAGA-DESIGN §6.0/§6.1 적용
 * ---------------------------------------------------------------
 * `village-view3d.js`(땅·타일)와 `asset3d.js`(GLB 주민·짐승·소품을 벗기는
 * `delam()`)가 같은 규격의 3단 램프 툰 재질을 쓰게 한다.
 *
 *   ramp()          3단 그라디언트 맵(MeshToonMaterial.gradientMap)
 *   toonify(material) 기존 재질(Lambert 등)을 툰 재질로 바꿔 낸다
 *
 * **물 재질(`waterMaterial()`)은 건드리지 않는다** — `scene.environment`
 * HDRI 반사를 쓰는 `MeshStandardMaterial`이라 툰으로 바꾸면 반사가 죽는다
 * (그 함수 자체의 주석 "반사는 공짜로 얻는다" 참고). `/realistic/` 밑
 * (Renvylle Castle 등, PBR+HDRI)도 `asset3d.js`가 이미 `delam()`을 안 태운다
 * — 그대로 둔다.
 *
 * **외곽선은 이번 손질에서 뺐다** — 땅 타일이 `InstancedMesh`로 수백~수천
 * 칸을 그리는 구조라, 칸마다 외곽선을 더하면 격자 전체가 검은 테두리로
 * 뒤덮여 오히려 "허접해" 보일 위험이 크다(화면 확인 불가능한 세션에서
 * 무릅쓰지 않았다). 배우(주민·짐승)만 골라 붙이는 절충안은 PLAN §6 후속 과제.
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

  /** 림 라이트 손잡이 — 외곽선(OUTLINE_ON)과 같은 결로 툰이 꺼지면 같이
   *  꺼진다. 외곽선과 달리 지오메트리를 안 늘리고 프래그먼트 셰이더 한
   *  줄만 더하는 값싼 효과라 배우뿐 아니라 땅·소품에도 그대로 건다
   *  (§6.1 외곽선 주석의 "격자 전체가 테두리로 뒤덮일 위험"은 여기 안
   *  걸린다 — 드로우콜·메시 수가 그대로다) */
  function RIM_ON() {
    var core = global.DG && global.DG.core;
    if (!TOON_ON()) { return false; }
    return core && core.tuned ? (core.tuned('world3d.rim', 1) ? true : false) : true;
  }

  /**
   * 프레넬 림 라이트 — `onBeforeCompile`로 셰이더에 한 항만 더한다(지오메트리
   * 불변). 원신류 셀셰이딩의 "가장자리가 빛을 받아 번지는" 인상을 셰이더
   * 만으로 흉내내는 자리 — 새 에셋·드로우콜 없이 값싸다. 표준 청크
   * (`common`·`worldpos_vertex`·`dithering_fragment`)에만 기대므로
   * MeshToonMaterial 전 계열에서 성립한다(vViewPosition 같이 조건부로만
   * 선언되는 varying 은 안 쓴다 — 직접 varying 을 새로 선언해 충돌을 피했다).
   * 렌더된 결과(번지는 두께·색이 과하지 않은지)는 셰이더라 화면 없이는
   * 확인 못 한다 — 실기 확인 대기(HANDOFF.md 2026-09-19).
   */
  function applyRimLight(mat) {
    var t = three();
    if (!t || !mat || !RIM_ON() || mat.userData.rimApplied) { return mat; }
    mat.userData.rimApplied = true;
    mat.onBeforeCompile = function (shader) {
      shader.uniforms.rimColor = { value: new t.Color(0xfff4d6) };
      shader.uniforms.rimPower = { value: 2.2 };
      shader.uniforms.rimIntensity = { value: 0.35 };
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vRimNormalW;\nvarying vec3 vRimViewW;'
      ).replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvRimNormalW = normalize( mat3( modelMatrix ) * normal );\nvRimViewW = normalize( cameraPosition - ( modelMatrix * vec4( transformed, 1.0 ) ).xyz );'
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        '#include <common>\nuniform vec3 rimColor;\nuniform float rimPower;\nuniform float rimIntensity;\nvarying vec3 vRimNormalW;\nvarying vec3 vRimViewW;'
      ).replace(
        '#include <dithering_fragment>',
        'float rimFresnel = pow( 1.0 - clamp( dot( normalize( vRimNormalW ), normalize( vRimViewW ) ), 0.0, 1.0 ), rimPower );\ngl_FragColor.rgb += rimColor * rimIntensity * rimFresnel;\n#include <dithering_fragment>'
      );
    };
    return mat;
  }

  /** 기존 재질 하나를 3단 툰 재질로 — 빛깔·맵·투명만 옮긴다(PBR 값은 버린다) */
  function toonify(src) {
    var t = three();
    if (!t || !src) { return src; }
    if (Array.isArray(src)) { return src.map(toonify); }
    if (src.isMeshToonMaterial) { return applyRimLight(src); }
    return applyRimLight(new t.MeshToonMaterial({
      color: src.color ? src.color.clone() : new t.Color(0xffffff),
      map: src.map || null,
      vertexColors: !!src.vertexColors,
      transparent: !!src.transparent,
      opacity: src.opacity === undefined ? 1 : src.opacity,
      alphaTest: src.alphaTest || 0,
      side: src.side === undefined ? t.FrontSide : src.side,
      gradientMap: ramp()
    }));
  }

  /** `new MeshLambertMaterial(opts)` 자리를 그대로 대신한다 — opts 는 손 안 댄다 */
  function lambertLike(opts) {
    var t = three();
    if (!t) { return null; }
    if (!TOON_ON()) { return new t.MeshLambertMaterial(opts); }
    var o = {}, k;
    for (k in opts) { if (Object.prototype.hasOwnProperty.call(opts, k)) { o[k] = opts[k]; } }
    o.gradientMap = ramp();
    return applyRimLight(new t.MeshToonMaterial(o));
  }

  var outlineMat = null;
  function outlineMaterial() {
    if (outlineMat) { return outlineMat; }
    var t = three();
    if (!t) { return null; }
    outlineMat = new t.MeshBasicMaterial({ color: 0x211a14, side: t.BackSide, toneMapped: false });
    return outlineMat;
  }

  /** 외곽선 손잡이 — 배우(주민·짐승·NPC)에만 쓴다(PLAN §6.1). 땅 타일은
   *  InstancedMesh 격자라 칸마다 붙이면 화면 전체가 검은 테두리로 뒤덮일
   *  위험이 커 일부러 안 건다(§6.1 주석 그대로). 기본은 툰과 같이 켜지지만
   *  손잡이를 따로 둬 외곽선만 되돌릴 길을 남긴다. */
  function OUTLINE_ON() {
    var core = global.DG && global.DG.core;
    if (!TOON_ON()) { return false; }
    return core && core.tuned ? (core.tuned('world3d.outline', 1) ? true : false) : true;
  }

  /**
   * 뒤집힌 헐(inverted-hull) 외곽선 — SkinnedMesh 포함, 몸 하나(root) 안의
   * Mesh/SkinnedMesh 마다 살짝 부풀린 뒷면 전용(BackSide) 복제를 같은
   * 부모에 덧붙인다. 스킨 메시는 같은 skeleton 에 다시 물려(`bind()`)
   * 걸을 때 몸과 같이 움직인다. 원본 메시는 손 안 댄다 — 지웠다 되돌릴
   * 필요가 있으면 root 를 통째로 버리면 같이 사라진다(별도 목록 안 남긴다).
   */
  function addOutline(root, width) {
    var t = three();
    var mat = outlineMaterial();
    if (!t || !mat || !OUTLINE_ON()) { return; }
    var w = width || 0.045;
    var targets = [];
    root.traverse(function (o) { if (o.isMesh || o.isSkinnedMesh) { targets.push(o); } });
    targets.forEach(function (o) {
      var dup;
      if (o.isSkinnedMesh) {
        dup = new t.SkinnedMesh(o.geometry, mat);
        dup.bind(o.skeleton, o.bindMatrix);
      } else {
        dup = new t.Mesh(o.geometry, mat);
      }
      dup.position.copy(o.position);
      dup.quaternion.copy(o.quaternion);
      dup.scale.copy(o.scale).multiplyScalar(1 + w);
      dup.castShadow = false;
      dup.receiveShadow = false;
      dup.renderOrder = (o.renderOrder || 0) - 1;
      o.parent.add(dup);
    });
  }

  global.DG = global.DG || {};
  global.DG.toon3d = { ramp: ramp, toonify: toonify, lambertLike: lambertLike, TOON_ON: TOON_ON,
    addOutline: addOutline, OUTLINE_ON: OUTLINE_ON, RIM_ON: RIM_ON };
})(window);
