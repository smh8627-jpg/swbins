/**
 * 기복 — **땅에 높낮이를 준다** (새 `PLAN.md` 14절)
 * ---------------------------------------------------------------
 * 여태 이 판의 지면은 **완전한 평면**이었다. 지도 타일을 `PlaneGeometry` 한 장에
 * 텍스처로 깔고 눕힌 것이 전부였고, 산은 그 위에 얹은 **원뿔 하나**였다.
 * 그래서 카메라가 움직여도 지형이 움직이지 않는다 — PLAN 14절이 이것을 금지한다:
 * *"평지 · 언덕 · 경사 · 낮은 계곡 · 높은 산 … 카메라가 움직일 때 지형 변화가
 * 느껴져야 한다."*
 *
 *   heightAt(x, z)   그 자리의 땅 높이(m). **순수 함수다** — 자가진단이 이것만 본다
 *   ON()             손잡이 `relief3d.on`. 0 이면 늘 0 을 주고 **판이 평평해진다**
 *
 * ── 어떻게 정하나 ────────────────────────────────────────
 *
 * 새 값을 지어내지 않는다. **이미 있는 지형 격자**(`world.terrainAt`, 48m)를 읽어
 * 종류마다 목표 높이를 주고, 격자 사이를 **부드럽게 이어** 경사를 만든다.
 * 그래서 산은 산에서 솟고 강은 강에서 파인다 — 지도·미니맵·손으로 그린 땅과
 * 어긋나지 않는다.
 *
 * **마을 · 길 · 논밭은 흔들지 않는다.** 집이 기울고 길이 물결치면 사람이 만든
 * 자리로 안 보인다. 들과 숲만 잔무늬로 조금 흔든다.
 *
 * ── 판정에는 한 줄도 안 닿는다 ───────────────────────────
 *
 * `world.js` 의 좌표 · 거리 · 스폰은 **여전히 평면 2D** 다. 높이는 화면 층에서만
 * 쓴다(배우를 앉히고, 카메라를 띄우고, 지면 정점을 민다). 그래서 땅이 울퉁불퉁해져도
 * **균형이 한 칸도 안 움직인다** — 진단이 스폰 목록까지 견주고 있다.
 */
(function (global) {
  'use strict';

  function core() { return global.DG.core; }

  /** 격자 한 칸 — `world3d` 와 같은 48m */
  var GRID = 48;

  /** 땅에 높낮이를 줄까 — 0 이면 늘 0 (되돌림용 손잡이. 판이 평평해진다) */
  function ON() { return core().tuned('relief3d.on', 1) ? true : false; }

  /** 전체 세기 배수 — 1 이 기본. 0.5 면 야트막해지고 2 면 험해진다 */
  function AMP() { return core().tuned('relief3d.amp', 1); }

  /**
   * 종류마다의 **목표 높이(m)**.
   *
   * 산이 왜 16 인가 — 격자가 48m 이므로 이웃 칸과 16m 차이면 경사가 **약 18°** 다.
   * 걸어 오를 만하면서 멀리서 산으로 보이는 자리다. 더 키우면 벽이 되고,
   * 줄이면 언덕도 아닌 것이 된다(눈으로 보고 정했다).
   */
  var LEVEL = {
    mount: 16,
    forest: 2.2,
    grass: 0.9,
    road: 0.1,
    town: 0.15,
    farm: -0.35,
    water: -1.4
  };

  /** 잔무늬를 넣을 땅 — **사람이 만든 자리는 뺀다**(집이 기울고 길이 물결친다) */
  var JITTER = { mount: 1.1, forest: 0.7, grass: 0.45, water: 0.15 };

  /** 이 격자가 무슨 땅이냐 — `world.terrainAt` 하나만 본다(손으로 그린 땅도 그쪽이 답한다) */
  function kindAt(gx, gy) {
    var W = global.DG.world;
    if (!W || !W.terrainAt) { return 'grass'; }
    try { return W.terrainAt(gx, gy) || 'grass'; } catch (e) { return 'grass'; }
  }

  /* 격자 한 칸의 값은 **캐시한다.** 정점 하나를 밀 때마다 네 칸을 묻고, 산이면
     그 네 칸이 다시 이웃 아홉을 묻는다 — 타일 한 장(정점 여든)에 삼백 번이 넘는다 */
  var lvCache = {}, lvCount = 0;

  /**
   * 격자 한 칸의 높이 — 목표 높이에 잔무늬를 더한다.
   *
   * **산은 이웃을 보고 정한다.** 이 판의 산 격자는 해시로 흩어져 있어서
   * 한 칸씩 외따로 서는 일이 흔한데, 그것을 다 16m 로 솟구치면 산맥이 아니라
   * **압정밭**이 된다(눈으로 보고 알았다). 이웃 아홉 칸에 산이 몇인지 세어
   * 외딴 칸은 **언덕**으로, 산이 이어진 한가운데는 **높이** 솟게 한다.
   */
  function levelAt(gx, gy) {
    var ck = gx + ',' + gy;
    if (lvCache.hasOwnProperty(ck)) { return lvCache[ck]; }
    var k = kindAt(gx, gy);
    var base = LEVEL.hasOwnProperty(k) ? LEVEL[k] : LEVEL.grass;
    if (k === 'mount') {
      var n = 0, dx, dy;
      for (dy = -1; dy <= 1; dy++) {
        for (dx = -1; dx <= 1; dx++) {
          if (kindAt(gx + dx, gy + dy) === 'mount') { n++; }
        }
      }
      /* 외딴 한 칸이면 4m(언덕), 아홉 칸이 다 산이면 16m(봉우리) */
      base = 4 + ((n - 1) / 8) * (LEVEL.mount - 4);
    }
    var j = JITTER[k];
    if (j) {
      /* `hash2` 는 0~0.5 만 준다(이 판의 규약) — 두 배로 펴서 ±j 로 쓴다 */
      base += (core().hash2(gx * 37 + 11, gy * 53 + 7) * 4 - 1) * j;
    }
    /* 캐시가 무한히 자라지 않게 — 걸어서 지나온 격자는 다시 볼 일이 드물다 */
    if (lvCount > 4000) { lvCache = {}; lvCount = 0; }
    lvCache[ck] = base; lvCount++;
    return base;
  }

  /** 부드럽게 — 선형으로 이으면 격자 경계가 **접힌 선**으로 드러난다 */
  function smooth(t) { return t * t * (3 - 2 * t); }

  /**
   * 그 자리의 땅 높이(m). **순수 함수다.**
   *
   * 격자 네 칸의 값을 이중선형으로 섞되, 섞는 비율을 `smooth` 로 눌러 준다 —
   * 그냥 선형으로 이으면 칸 경계마다 꺾여 **종이접기처럼** 보인다.
   */
  function heightAt(x, z) {
    if (!ON()) { return 0; }
    /* 격자 **중심**을 기준으로 삼는다 — 그래야 칸 한가운데가 그 칸의 높이가 된다 */
    var fx = x / GRID - 0.5, fy = z / GRID - 0.5;
    var i = Math.floor(fx), j = Math.floor(fy);
    var tx = smooth(fx - i), ty = smooth(fy - j);
    var h00 = levelAt(i, j), h10 = levelAt(i + 1, j);
    var h01 = levelAt(i, j + 1), h11 = levelAt(i + 1, j + 1);
    var a = h00 + (h10 - h00) * tx;
    var b = h01 + (h11 - h01) * tx;
    return (a + (b - a) * ty) * AMP();
  }

  /**
   * 이 자리의 **기울기**(0 평지 ~ 1 벼랑). 화면 쪽에서 쓸 자리가 있다 —
   * 가파른 데는 나무를 덜 세운다든지. 순수 함수다.
   */
  function slopeAt(x, z) {
    var d = 6;
    var hx = heightAt(x + d, z) - heightAt(x - d, z);
    var hz = heightAt(x, z + d) - heightAt(x, z - d);
    return Math.min(1, Math.hypot(hx, hz) / (2 * d) / 0.6);
  }

  /** 눈으로 확인할 때 */
  function stats() {
    return { on: ON(), amp: AMP(), grid: GRID, levels: Object.keys(LEVEL).length };
  }

  global.DG = global.DG || {};
  global.DG.relief3d = {
    /* 값을 내는 함수 — three 없이도 돈다(자가진단이 이것만 본다) */
    heightAt: heightAt, slopeAt: slopeAt, levelAt: levelAt, kindAt: kindAt,
    LEVEL: LEVEL, GRID: GRID, on: ON, amp: AMP, stats: stats,
    /** 진단·어드민이 손잡이를 돌린 뒤 부른다 (캐시를 비운다) */
    reset: function () { lvCache = {}; lvCount = 0; }
  };
})(window);
