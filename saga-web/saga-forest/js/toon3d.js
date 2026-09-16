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
  global.DG.toon3d = { ramp: ramp, toonify: toonify, lambertLike: lambertLike, TOON_ON: TOON_ON };
})(window);
