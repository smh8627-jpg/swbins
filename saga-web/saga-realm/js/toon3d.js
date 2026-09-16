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
