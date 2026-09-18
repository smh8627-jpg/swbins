/**
 * 툰 재질 · 외곽선 공용 부품 — SAGA-DESIGN §6.0/§6.1, PLAN §6.1 항목 3 적용
 * ---------------------------------------------------------------
 * `dungeon3d.js`(방·벽·바닥을 직접 그리는 `mat()`/`texMat()`)와 `asset3d.js`
 * (GLB 몬스터·인물·자연물을 벗기는 `delam()`)가 같은 규격의 3단 램프 툰
 * 재질을 쓰게 한다.
 *
 *   ramp()            3단 그라디언트 맵(MeshToonMaterial.gradientMap)
 *   toonify(material) 기존 재질(Lambert 등)을 툰 재질로 바꿔 낸다
 *   outline(mesh)      뒤집힌 헐 외곽선 메시를 만들어 원본과 **같은 부모**에 얹는다.
 *                      SkinnedMesh 는 뼈대를 공유해 같이 움직인다.
 *
 * **외곽선은 배우(사람·짐승·몬스터 GLB)만 받는다**(2026-09-18, PLAN §6.1-3
 * 후속 과제를 닫음) — 이 파일의 `mat()`은 방 벽·바닥 같은 큰 판형
 * 지오메트리와 배우 부품을 가리지 않고 같이 쓰므로, 거기서 태그하는
 * 대신 `asset3d.js` 쪽에서 **GLB 폴더(people/animals/monsters)로 걸러**
 * `outline()`을 부른다(호출부는 `asset3d.js` `isActorAsset()` 참고) — 방·
 * 나무·건물·무기·갑주 GLB 는 이 판별에서 자동으로 빠진다(호출 자체가 안 옴).
 * `world3d.outline`(기본 1) 손잡이로 끄면 사가고처럼 예전 그대로(테두리
 * 없음)로 되돌아간다.
 *
 * 외곽선 폭은 "스케일 1.03"(PLAN §6.1)을 지오메트리 바운딩구 반지름의 3%로
 * 환산한다 — 균일 스케일 복제(피벗에서 멀수록 벌어짐)가 아니라 **법선
 * 방향으로 미는** 방식이라 스키닝 자세·원점 위치와 무관하게 항상 같은
 * 두께로 보인다(사가고 `toon3d.js` 와 같은 셰이더, 그대로 옮겼다).
 *
 * three 가 없으면(자가진단) 아무 것도 안 한다 — 판정에는 한 줄도 안 닿는다.
 */
(function (global) {
  'use strict';

  var T = null;
  function three() { if (!T) { T = global.THREE || null; } return T; }

  var OUTLINE_COLOR = 0x14120f;

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
  /** 외곽선 손잡이 — 0 이면 툰 재질은 그대로 두고 테두리만 뺀다 */
  function OUTLINE_ON() {
    var core = global.DG && global.DG.core;
    return core && core.tuned ? (core.tuned('world3d.outline', 1) ? true : false) : true;
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
      skinning: !!src.skinning,
      /* 몬스터 눈빛·정예 고리(`emissive`)를 옮기려면 부르는 쪽에서 따로 얹는다
         — MeshToonMaterial 도 emissive 를 받으므로 이 함수 밖에서 세팅 가능 */
      gradientMap: ramp()
    });
  }

  /* ── 외곽선 재질 — 폭(width)별로 캐싱한다. 스키닝 유무로 셰이더가 갈린다 ── */
  var matPool = {};
  function outlineMaterial(width, skinned) {
    var t = three();
    var key = (skinned ? 's' : 'p') + ':' + width.toFixed(4);
    if (matPool[key]) { return matPool[key]; }

    var vert = [
      '#include <common>',
      '#include <uv_pars_vertex>',
      '#include <skinning_pars_vertex>',
      'uniform float outlineWidth;',
      'void main() {',
      '  #include <uv_vertex>',
      '  #include <beginnormal_vertex>',
      '  #include <skinbase_vertex>',
      '  #include <skinnormal_vertex>',
      '  #include <begin_vertex>',
      '  #include <skinning_vertex>',
      '  transformed += normalize(objectNormal) * outlineWidth;',
      '  #include <project_vertex>',
      '}'
    ].join('\n');
    var frag = [
      'uniform vec3 outlineColor;',
      'void main() {',
      '  gl_FragColor = vec4(outlineColor, 1.0);',
      '}'
    ].join('\n');

    var m = new t.ShaderMaterial({
      uniforms: {
        outlineWidth: { value: width },
        outlineColor: { value: new t.Color(OUTLINE_COLOR) }
      },
      vertexShader: vert,
      fragmentShader: frag,
      side: t.BackSide,
      skinning: !!skinned
    });
    matPool[key] = m;
    return m;
  }

  /** 원본 메시 곁에 외곽선 메시를 하나 얹는다. 이미 얹었으면 다시 안 만든다 */
  function outline(mesh) {
    var t = three();
    if (!t || !mesh || !mesh.isMesh || !mesh.geometry || !mesh.parent) { return null; }
    if (mesh.userData && mesh.userData._toonOutline) { return mesh.userData._toonOutline; }
    if (!mesh.geometry.boundingSphere) { mesh.geometry.computeBoundingSphere(); }
    var r = (mesh.geometry.boundingSphere && mesh.geometry.boundingSphere.radius) || 0.3;
    var width = Math.max(0.006, r * 0.03);
    var skinned = !!mesh.isSkinnedMesh;
    var mat = outlineMaterial(width, skinned);
    var out;
    if (skinned) {
      out = new t.SkinnedMesh(mesh.geometry, mat);
      out.bind(mesh.skeleton, mesh.bindMatrix);
    } else {
      out = new t.Mesh(mesh.geometry, mat);
    }
    out.position.copy(mesh.position);
    out.rotation.copy(mesh.rotation);
    out.scale.copy(mesh.scale);
    out.castShadow = false;
    out.receiveShadow = false;
    out.renderOrder = (mesh.renderOrder || 0) - 1;
    out.name = (mesh.name || 'mesh') + '_outline';
    mesh.parent.add(out);
    mesh.userData = mesh.userData || {};
    mesh.userData._toonOutline = out;
    return out;
  }

  global.DG = global.DG || {};
  global.DG.toon3d = {
    ramp: ramp, toonify: toonify, outline: outline,
    TOON_ON: TOON_ON, OUTLINE_ON: OUTLINE_ON,
    outlineMaterial: outlineMaterial
  };
})(window);
