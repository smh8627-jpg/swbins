/**
 * 들판 — 방 밖으로 세상이 이어진다 (3D 전환 2단계)
 * ---------------------------------------------------------------
 * 1단계에서 방 하나를 입체로 세웠다. 그런데 그 방은 **허공에 뜬 상자**였다 —
 * 벽 너머는 새까맣고, 문을 나가도 또 같은 상자다. `PLAN.md` 4·5·6절이 바라는 것은
 * 그 반대다: 넓은 지형 · 숲 · 폐허 · 바위 · 절벽 · 길 · 강 · 동굴 입구 · 제단 · 캠프.
 *
 * **판정은 한 줄도 안 바꿨다.** `dungeon.js` 는 여전히 방 하나 안에서 논다 —
 * 58KB 짜리 판정의 심장을 통째로 뒤집는 것은 40절("이미 정상 작동하는 코드는
 * 수정하지 않는다")과 정면으로 부딪힌다. 대신 **방 둘레에 세상을 세운다.**
 * 화면에서는 "넓은 들 한복판의 한 자리" 로 보이고, 나중에 판정을 필드로 옮길 때
 * 이 지형이 그대로 쓰인다.
 *
 *   정직하게 적어 둔다 — **이것은 4·5·6절의 절반이다.** 눈에 보이는 세상은
 *   넓어졌지만 걸어 나갈 수는 없다. 나머지 절반(판정을 필드로)은 다음 단계다.
 *
 * 5절이 못박은 **씨앗 기반**을 지킨다 — `chunkAt()` 은 순수 함수라 같은 씨앗이면
 * 늘 같은 세상이 나온다. 그래서 자가진단이 값으로 붙들고, 같은 방에 다시 들어가도
 * 풍경이 안 바뀐다.
 *
 * 6절의 **chunk** 도 그대로다. 200 크기 조각으로 나누고 **가까운 것만** 세운다.
 * 반경 3 이면 7×7 = 49 조각, 1400×1400 — 방(560×360)의 예닐곱 배다.
 */
(function (global) {
  'use strict';

  /** 조각 한 변 */
  var CHUNK = 200;

  /**
   * 두 수를 섞어 0~1 을 낸다.
   * **격자 좌표에 쓰는 흔한 해시를 쓰면 안 된다** — 큰 수를 넣으면 이웃한 입력이
   * 이웃한 답을 준다(사가고에서 주민 둘이 같은 자리에 겹쳐 섰던 그 함정이다).
   */
  function mix(a, b) {
    var h = (Math.imul(a | 0, 2654435761) ^ Math.imul(b | 0, 1597334677)) >>> 0;
    h ^= h >>> 15; h = Math.imul(h, 2246822519);
    h ^= h >>> 13; h = Math.imul(h, 3266489917);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  /** 이 방의 씨앗 — 층과 방 번호에서 뽑는다. 같은 방이면 늘 같은 풍경이다 */
  function seedOf(floor, roomIdx, theme) {
    return (Math.imul(floor | 0, 73856093) ^ Math.imul((roomIdx | 0) + 1, 19349663) ^
            Math.imul(hashStr(theme || ''), 83492791)) >>> 0;
  }
  function hashStr(s) {
    var n = 0, i;
    s = String(s || '');
    for (i = 0; i < s.length; i++) { n = (n * 31 + s.charCodeAt(i)) % 100000; }
    return n;
  }

  /**
   * 땅의 높이 — **순수 함수다.** 방 안은 평평하고(0), 밖으로 갈수록 기복이 생긴다.
   * 4절 "단순 평면 하나가 아니라 높낮이가 있는 지형" 이 이것이다.
   *
   * 방을 평평하게 두는 까닭: 판정이 평면에서 돌기 때문이다. 지형이 방 안까지
   * 들어오면 **발밑이 그림과 어긋난다** — 보이는 것과 걷는 것이 달라진다.
   */
  function heightAt(x, z, seed, W, H) {
    /* 방에서 얼마나 멀리 나왔나 — 방 안이면 0, 한 조각 밖이면 1 */
    var dx = Math.max(0, Math.max(-x, x - W));
    var dz = Math.max(0, Math.max(-z, z - H));
    var out = Math.min(1, Math.hypot(dx, dz) / (CHUNK * 1.2));
    if (out <= 0) { return 0; }
    /* 굵은 물결 하나에 잔물결 하나 — 하나만 쓰면 규칙적인 골이 진다 */
    var big = mix(Math.floor(x / 260) + seed, Math.floor(z / 260) - seed);
    var fine = mix(Math.floor(x / 90) * 7 + seed, Math.floor(z / 90) * 13 - seed);
    return out * out * ((big - 0.35) * 190 + (fine - 0.5) * 46);
  }

  /* ── 무엇이 서나 ─────────────────────────────────────
   * 조각마다 성격을 하나 정하고 그 성격에 맞는 것을 세운다.
   * 5절 "완전 랜덤이 아니라 플레이 가능한 결과만" — 그래서 성격은 **거리로도** 갈린다:
   * 방 가까이는 길과 캠프, 멀리는 숲과 절벽.
   */
  var KINDS = ['forest', 'rock', 'ruin', 'cliff', 'road', 'water', 'cave', 'altar', 'camp'];

  function kindOf(cx, cz, seed, ring) {
    var h = mix(cx * 31 + seed, cz * 57 - seed);
    /* 방 바로 곁(ring 1)은 사람이 지나간 자리 — 길·캠프·폐허 */
    if (ring <= 1) { return h < 0.42 ? 'road' : (h < 0.62 ? 'camp' : (h < 0.82 ? 'ruin' : 'rock')); }
    /* 그 밖은 자연이 이긴다. 드물게 동굴 입구와 제단이 난다 */
    if (h < 0.30) { return 'forest'; }
    if (h < 0.46) { return 'rock'; }
    if (h < 0.58) { return 'ruin'; }
    if (h < 0.70) { return 'cliff'; }
    if (h < 0.80) { return 'water'; }
    if (h < 0.87) { return 'road'; }
    if (h < 0.93) { return 'cave'; }
    if (h < 0.97) { return 'altar'; }
    return 'camp';
  }

  /**
   * 이 조각에 무엇이 서나 — **순수 함수다.** 같은 씨앗·같은 자리면 늘 같다.
   * 돌려주는 것은 `{t, x, z, s, rot, h}` 의 목록(좌표는 월드).
   *
   *   t   tree · rock · pillar · cliff · path · pond · cavemouth · altar · tent · fire
   *   s   크기   rot 회전   h 높이(땅 높이는 부르는 쪽이 더한다)
   */
  function chunkAt(cx, cz, seed, ring, dens) {
    var out = [], i, n;
    var kind = kindOf(cx, cz, seed, ring);
    var ox = cx * CHUNK, oz = cz * CHUNK;
    var d = dens === undefined ? 1 : dens;

    function spot(k) {
      return {
        x: ox + mix(cx * 13 + k * 7 + seed, cz * 29 + k * 3) * CHUNK,
        z: oz + mix(cz * 11 + k * 17 - seed, cx * 41 + k * 5) * CHUNK
      };
    }
    function rnd(k) { return mix(cx * 101 + k + seed, cz * 211 - k); }

    if (kind === 'forest') {
      n = Math.round((7 + rnd(0) * 7) * d);
      for (i = 0; i < n; i++) {
        var f = spot(i);
        out.push({ t: 'tree', x: f.x, z: f.z, s: 0.7 + rnd(i + 40) * 0.9,
                   rot: rnd(i + 60) * 6.28, h: 46 + rnd(i + 80) * 44 });
      }
    } else if (kind === 'rock') {
      n = Math.round((4 + rnd(1) * 5) * d);
      for (i = 0; i < n; i++) {
        var r = spot(i + 10);
        out.push({ t: 'rock', x: r.x, z: r.z, s: 0.8 + rnd(i + 90) * 1.6,
                   rot: rnd(i + 20) * 6.28, h: 20 + rnd(i + 30) * 34 });
      }
    } else if (kind === 'ruin') {
      /* 폐허 — 부러진 기둥 넷과 무너진 벽 하나. 높이를 서로 다르게 해야 폐허로 보인다
         (같으면 짓다 만 집이다 — 사가고에서 배운 것) */
      var b = spot(3);
      for (i = 0; i < 4; i++) {
        out.push({ t: 'pillar', x: b.x + (i % 2 ? 34 : -34), z: b.z + (i < 2 ? -34 : 34),
                   s: 1, rot: 0, h: 30 + rnd(i + 50) * 66 });
      }
      out.push({ t: 'wall', x: b.x, z: b.z + 52, s: 1, rot: rnd(9) * 0.6 - 0.3, h: 26 });
    } else if (kind === 'cliff') {
      n = Math.round(2 + rnd(2) * 2);
      for (i = 0; i < n; i++) {
        var c = spot(i + 20);
        out.push({ t: 'cliff', x: c.x, z: c.z, s: 1.4 + rnd(i + 70) * 1.4,
                   rot: rnd(i + 11) * 6.28, h: 120 + rnd(i + 12) * 150 });
      }
    } else if (kind === 'road') {
      /* 길 — 조각을 가로지르는 흙바닥 띠. 옆에 이정표 하나 */
      out.push({ t: 'path', x: ox + CHUNK / 2, z: oz + CHUNK / 2, s: 1,
                 rot: rnd(4) < 0.5 ? 0 : Math.PI / 2, h: 1 });
      if (rnd(5) > 0.5) {
        var m = spot(7);
        out.push({ t: 'post', x: m.x, z: m.z, s: 1, rot: 0, h: 42 });
      }
    } else if (kind === 'water') {
      out.push({ t: 'pond', x: ox + CHUNK / 2, z: oz + CHUNK / 2,
                 s: 0.6 + rnd(6) * 0.5, rot: 0, h: 2 });
      n = Math.round(3 * d);
      for (i = 0; i < n; i++) {
        var w = spot(i + 30);
        out.push({ t: 'reed', x: w.x, z: w.z, s: 1, rot: 0, h: 16 + rnd(i) * 14 });
      }
    } else if (kind === 'cave') {
      var cv = spot(2);
      out.push({ t: 'cavemouth', x: cv.x, z: cv.z, s: 1, rot: rnd(8) * 6.28, h: 96 });
    } else if (kind === 'altar') {
      var al = spot(1);
      out.push({ t: 'altar', x: al.x, z: al.z, s: 1, rot: 0, h: 40 });
    } else if (kind === 'camp') {
      var cp = spot(0);
      out.push({ t: 'fire', x: cp.x, z: cp.z, s: 1, rot: 0, h: 12 });
      for (i = 0; i < 2; i++) {
        out.push({ t: 'tent', x: cp.x + (i ? 46 : -46), z: cp.z + (i ? 22 : -18),
                   s: 1, rot: rnd(i + 13) * 6.28, h: 34 });
      }
    }
    out.kind = kind;
    return out;
  }

  /** 어느 조각들을 세울까 — 반경 안의 것만(6절 "플레이어 주변 Chunk 만 활성화") */
  function ringOf(cx, cz, W, H) {
    /* 방이 걸친 조각을 0 으로 보고, 거기서 몇 칸 떨어졌는지 */
    var rx = Math.max(0, Math.max(-cx, cx - Math.floor(W / CHUNK)));
    var rz = Math.max(0, Math.max(-cz, cz - Math.floor(H / CHUNK)));
    return Math.max(rx, rz);
  }

  /** 눈으로 확인할 때 — 이 씨앗의 조각들이 어떤 성격인지 */
  function survey(seed, radius, W, H) {
    var by = {}, cx, cz, n = 0;
    var r = radius === undefined ? 3 : radius;
    for (cz = -r; cz <= r; cz++) {
      for (cx = -r; cx <= r; cx++) {
        var k = kindOf(cx, cz, seed, ringOf(cx, cz, W || 560, H || 360));
        by[k] = (by[k] || 0) + 1; n++;
      }
    }
    return { chunks: n, by: by, span: (r * 2 + 1) * CHUNK };
  }

  global.DG = global.DG || {};
  global.DG.field3d = {
    CHUNK: CHUNK, KINDS: KINDS,
    /* 전부 순수 함수다 — 자가진단이 값으로 본다 */
    mix: mix, seedOf: seedOf, heightAt: heightAt,
    kindOf: kindOf, chunkAt: chunkAt, ringOf: ringOf, survey: survey
  };
})(window);
