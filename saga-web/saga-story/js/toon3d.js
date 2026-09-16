/**
 * 툰 재질 공용 부품 — SAGA-DESIGN §6.0/§6.1, PLAN §6 "MeshToonMaterial + 그라디언트 맵" 적용
 * ---------------------------------------------------------------
 * `side-view3d.js`(하늘·바닥·발판·소품을 `new MeshLambertMaterial({...})`로
 * 곳곳에서 직접 만든다)와 `asset3d.js`(GLB 인물·짐승을 벗기는 `delam()`)가
 * 같은 규격의 3단 램프 툰 재질을 쓰게 한다.
 *
 *   ramp()          3단 그라디언트 맵(MeshToonMaterial.gradientMap)
 *   lambertLike(o)  `new MeshLambertMaterial(o)`을 대신할 자리 — 손잡이가
 *                   켜져 있으면 같은 옵션 객체로 MeshToonMaterial 을 만든다
 *   toonify(m)      이미 만든 재질(Standard/Physical 등)을 툰으로 바꿔 낸다
 *
 * **외곽선은 이번 손질에서 뺐다** — `side-view3d.js`는 하늘·바닥·소품·배우가
 * 전부 낱개 `new Mesh(...)` 호출이라(공용 캐시 함수가 없다) 태그할 choke
 * point 가 없다. 화면 확인이 안 되는 세션에서 소품마다 외곽선을 개별로
 * 잘못 붙일 위험을 무릅쓰지 않았다 — PLAN §6 후속 과제로 남긴다.
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

  global.DG = global.DG || {};
  global.DG.toon3d = { ramp: ramp, lambertLike: lambertLike, toonify: toonify, TOON_ON: TOON_ON };
})(window);
