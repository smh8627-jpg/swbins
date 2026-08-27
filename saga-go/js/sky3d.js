/**
 * 하늘 — 비와 눈이 실제로 내린다 (3D 전환 PHASE 10)
 * ---------------------------------------------------------------
 * 이 판에 천후는 오래전부터 있었다(`weather.js`). 무엇이 잘 나오는지를 정하고,
 * 3D 조명(`world3d.lightingAt`)이 해를 죽이고 시야를 좁혔다. 그런데 **화면에는
 * 아무것도 안 내렸다** — 비 오는 날은 그냥 어둡고 뿌연 날이었다.
 *
 * `PLAN.md` 21절이 "날씨가 단순한 장식이 아니게 한다" 고 하는데, 그 앞에
 * **장식조차 없었다**. 여기서 내리게 한다.
 *
 *   비    가늘고 긴 것이 빠르게 비스듬히 떨어진다
 *   눈    작은 것이 천천히 좌우로 흔들리며 내린다
 *   바람  마른 티끌이 가로로 스친다
 *   안개  **알갱이를 안 만든다** — 이미 `fog` 로 있고, 알갱이로 또 덮으면 두 겹이 된다
 *
 * **Particle Pool 이다**(24절). `battle3d.js` 와 같은 원칙인데 창고는 따로 둔다 —
 * 비는 늘 내리고 검기는 이따금 튀므로, 한 창고를 나눠 쓰면 필살을 지를 때마다
 * 빗줄기가 끊긴다.
 *
 * **알갱이는 카메라를 따라다니는 상자 안에서만 산다.** 세상 전체에 비를 뿌리면
 * 몇 만 개가 필요하다 — 눈에 보이는 20m 상자에만 뿌리고, 상자를 카메라와 함께
 * 옮기면 어디를 가도 비가 내린다.
 *
 * **판정에는 한 줄도 안 닿는다.** 손잡이 `sky3d.on` 을 0 으로 두면 예전 화면이다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  function W3() { return global.DG.world3d; }
  function three() { return W3() && W3().three ? W3().three() : null; }
  function live() {
    var w = W3();
    return !!(w && w.available() && w.active() && on());
  }

  /** 하늘에서 무언가 내릴까 — 0 이면 조명만 바뀌던 예전 화면이다 */
  function on() { return core.tuned('sky3d.on', 1) ? true : false; }
  /** 알갱이 수 배수 — 폰이 버거우면 여기를 내린다 */
  function DENS() {
    var P = global.DG.perf;
    return core.tuned('sky3d.density', 1) * (P ? P.mul('sky') : 1);
  }
  /** 알갱이가 사는 상자의 반지름(m) */
  function BOX() { return core.tuned('sky3d.boxR', 22); }

  /* ── 내리는 것들 ──────────────────────────────────────
   *   n      한꺼번에 몇 개나 (배수를 곱한다)
   *   fall   떨어지는 빠르기(m/s)   drift  옆으로 밀리는 빠르기
   *   sway   좌우로 흔들리는 폭(m) — 눈만 쓴다
   *   len    세로 길이(m) · wide 가로 폭(m)
   */
  var KINDS = {
    rain: { n: 150, fall: 26, drift: 4.5, sway: 0, len: 1.5, wide: 0.045,
            color: 0xa9c4dd, opacity: 0.55, top: 16 },
    snow: { n: 110, fall: 2.6, drift: 1.1, sway: 1.5, len: 0.16, wide: 0.16,
            color: 0xeef4ff, opacity: 0.9, top: 14 },
    wind: { n: 34, fall: 0.7, drift: 15, sway: 0.5, len: 0.5, wide: 0.06,
            color: 0xcfc6b0, opacity: 0.4, top: 7 }
  };

  /** 이 천후에 무엇이 내리나 — 순수 함수(자가진단이 이것만 따로 본다) */
  function fallOf(wkey) {
    if (wkey === 'rain') { return 'rain'; }
    if (wkey === 'snow') { return 'snow'; }
    if (wkey === 'wind') { return 'wind'; }
    return null;                       // 맑음·흐림·안개는 아무것도 안 내린다
  }

  /** 이 천후에 알갱이가 몇이나 뜨나 — 순수 함수 */
  function countOf(wkey) {
    var k = fallOf(wkey);
    if (!k) { return 0; }
    return Math.max(0, Math.round(KINDS[k].n * DENS()));
  }

  /* ── 창고 ────────────────────────────────────────────── */

  var pool = [];        // [{node, x, y, z, vy, vx, vz, ph}]
  var group = null;
  var curKind = null;   // 지금 창고에 담긴 종류
  var geoCache = {}, matCache = {};

  function geo(T, wide, len) {
    var k = wide + 'x' + len;
    if (!geoCache[k]) { geoCache[k] = new T.PlaneGeometry(wide, len); }
    return geoCache[k];
  }
  function mat(T, hex, op) {
    var k = hex + '/' + op;
    if (!matCache[k]) {
      matCache[k] = new T.MeshBasicMaterial({
        color: new T.Color(hex), transparent: true, opacity: op,
        depthWrite: false, side: T.DoubleSide
      });
    }
    return matCache[k];
  }

  function ensure() {
    var T = three();
    if (!T || group) { return !!group; }
    group = new T.Group();
    /* 알갱이는 **안개를 안 탄다** — 코앞 20m 상자 안에만 사는데 안개까지 먹으면
       비가 회색으로 묻혀 안 보인다 */
    W3().addFx(group);
    return true;
  }

  /** 창고를 이 종류로 갈아 끼운다. 종류가 그대로면 아무것도 안 한다 */
  function reshape(kind) {
    var T = three();
    if (!T || !ensure()) { return 0; }
    var want = kind ? countOf(kindKeyOf(kind)) : 0;
    var K = kind ? KINDS[kind] : null;

    /* 모자라면 만들고, 남으면 **지우지 않고 숨긴다** — 천후는 세 시간마다 바뀌므로
       지웠다 만들었다 하면 그때마다 GPU 로 다시 올린다 */
    while (pool.length < want) {
      var p = { node: new T.Mesh(geo(T, 0.05, 1), mat(T, 0xffffff, 0.5)),
                x: 0, y: 0, z: 0, vy: 0, vx: 0, vz: 0, ph: 0 };
      p.node.visible = false;
      group.add(p.node);
      pool.push(p);
    }
    var i;
    for (i = 0; i < pool.length; i++) {
      var q = pool[i];
      if (i >= want || !K) { q.node.visible = false; continue; }
      q.node.geometry = geo(T, K.wide, K.len);
      q.node.material = mat(T, K.color, K.opacity);
      q.node.visible = true;
      if (curKind !== kind) { seed(q, K, true); }
    }
    curKind = kind;
    return want;
  }

  function kindKeyOf(kind) { return kind; }

  /** 알갱이 하나를 상자 안 아무 데나 놓는다. `fresh` 면 높이까지 흩는다 */
  function seed(p, K, fresh) {
    var R = BOX();
    p.x = (Math.random() * 2 - 1) * R;
    p.z = (Math.random() * 2 - 1) * R;
    p.y = fresh ? Math.random() * K.top : K.top;
    p.vy = -K.fall * (0.8 + Math.random() * 0.45);
    var a = Math.random() * Math.PI * 2;
    p.vx = Math.cos(a) * K.drift;
    p.vz = Math.sin(a) * K.drift;
    p.ph = Math.random() * 6.28;
  }

  /**
   * 한 프레임 — `world3d.render` 가 부른다.
   * 상자는 **카메라가 아니라 플레이어**를 따라간다 — 카메라를 따라가면 시점을
   * 돌릴 때 비가 통째로 미끄러진다.
   */
  function tick(dt, light) {
    if (!live()) {
      if (curKind && group) { reshape(null); }
      return 0;
    }
    var W = global.DG.weather;
    var wkey = (light && light.weather) || (W ? W.current().key : 'clear');
    var kind = fallOf(wkey);
    if (kind !== curKind) { reshape(kind); }
    if (!kind || !pool.length) { return 0; }

    var K = KINDS[kind];
    var pos = core.save.player.pos;
    var R = BOX();
    var i, n = 0;
    for (i = 0; i < pool.length; i++) {
      var p = pool[i];
      if (!p.node.visible) { continue; }
      p.y += p.vy * dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.ph += dt * 2.2;
      /* 땅에 닿았거나 상자를 벗어나면 **위에서 다시 시작한다**(되돌려 쓴다) */
      if (p.y < 0 || Math.abs(p.x) > R || Math.abs(p.z) > R) { seed(p, K, false); }
      var sway = K.sway ? Math.sin(p.ph) * K.sway : 0;
      p.node.position.set(pos.x + p.x + sway, p.y, pos.y + p.z);
      /* 비는 떨어지는 쪽으로 눕는다 — 세로 막대가 곧게 서 있으면 말뚝으로 보인다 */
      if (kind === 'rain') { p.node.rotation.set(0, 0, Math.atan2(p.vx, -p.vy)); }
      else if (kind === 'wind') { p.node.rotation.set(0, 0, 1.4); }
      n++;
    }
    return n;
  }

  /** 눈으로 확인할 때 */
  function stats() {
    var W = global.DG.weather;
    var wkey = W ? W.current().key : 'clear';
    var vis = 0, i;
    for (i = 0; i < pool.length; i++) { if (pool[i].node && pool[i].node.visible) { vis++; } }
    return {
      on: on(), live: live(), weather: wkey, falls: fallOf(wkey),
      want: countOf(wkey), pool: pool.length, shown: vis, kind: curKind
    };
  }

  global.DG = global.DG || {};
  global.DG.sky3d = {
    KINDS: KINDS,
    /* 값을 내는 함수 — 순수하다 */
    on: on, fallOf: fallOf, countOf: countOf,
    /* 화면이 쓰는 것 */
    tick: tick, reshape: reshape, stats: stats,
    reset: function () { reshape(null); return pool.length; },
    get pool() { return pool; }
  };
})(window);
