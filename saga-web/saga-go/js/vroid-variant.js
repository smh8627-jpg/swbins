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

  function variantOf(src, kind, slot) {
    var key = (src.uuid || src.name || '') + '|' + kind + '|' + slot;
    if (!cache[key]) {
      var m = src.clone();
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

  global.DG.vroidVariant = { N: N, HAIR: HAIR, CLOTH: CLOTH, EYE: EYE, pick: pick, apply: apply, isVroid: isVroid, hash: hash };
})(window);
