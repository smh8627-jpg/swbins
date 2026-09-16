/**
 * 툰 재질 공용 부품 — SAGA-DESIGN §6.0/§6.1, PLAN §6.1 항목 3 적용
 * ---------------------------------------------------------------
 * `dungeon3d.js`(방·벽·소품을 직접 그리는 `mat()`/`texMat()`)와 `asset3d.js`
 * (GLB 몬스터·인물·자연물을 벗기는 `delam()`)가 같은 규격의 3단 램프 툰
 * 재질을 쓰게 한다.
 *
 *   ramp()            3단 그라디언트 맵(MeshToonMaterial.gradientMap)
 *   toonify(material) 기존 재질(Lambert 등)을 툰 재질로 바꿔 낸다
 *
 * **외곽선(뒤집힌 헐)은 이번 손질에서 뺐다** — 이 파일의 `mat()`은 방 벽·바닥
 * 같은 큰 판형 지오메트리와 배우 부품을 가리지 않고 같이 쓴다. 사가고처럼
 * "덩이만" 골라 외곽선을 붙이려면 `box()`의 수십 군데 호출부를 다 태그해야
 * 하는데, 화면으로 확인할 방법이 없는 이 세션에서 방 경계에 이상한 테두리가
 * 생길 위험을 무릅쓰지 않았다 — PLAN §6.1-3 후속 과제로 남긴다.
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
      /* 몬스터 눈빛·정예 고리(`emissive`)를 옮기려면 부르는 쪽에서 따로 얹는다
         — MeshToonMaterial 도 emissive 를 받으므로 이 함수 밖에서 세팅 가능 */
      gradientMap: ramp()
    });
  }

  global.DG = global.DG || {};
  global.DG.toon3d = { ramp: ramp, toonify: toonify, TOON_ON: TOON_ON };
})(window);
