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
  function S3() { return global.DG.season; }
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
            color: 0xcfc6b0, opacity: 0.4, top: 7 },
    leaf: { n: 46, fall: 1.1, drift: 1.6, sway: 1.1, len: 0.14, wide: 0.14,
            color: 0xc98a3d, opacity: 0.92, top: 9 }
  };

  /** 가을에 낙엽이 질까(PLAN 44절) — 손잡이로 끌 수 있다 */
  function leavesOn() { return core.tuned('sky3d.leaves', 1) ? true : false; }
  function autumnNow() {
    var S = S3();
    return !!(S && S.on() && S.now().key === 'autumn');
  }

  /** 이 천후에 무엇이 내리나 — 순수 함수(자가진단이 이것만 따로 본다).
   * **가을의 낙엽만 계절도 함께 본다** — 비·눈·바람은 진짜 하늘에서
   * 내리는 것이라 날씨만으로 정해지지만, 낙엽은 맑은 날에도 진다.
   * 진단·데모는 `DG.season.force('autumn')` 로 붙들어야 한다(다른 축과 같은 손). */
  function fallOf(wkey) {
    if (wkey === 'rain') { return 'rain'; }
    if (wkey === 'snow') { return 'snow'; }
    if (wkey === 'wind') { return 'wind'; }
    if ((wkey === 'clear' || wkey === 'cloud' || wkey === 'fog') &&
        leavesOn() && autumnNow()) { return 'leaf'; }
    return null;                       // 그 밖엔 아무것도 안 내린다
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
    tickClouds(dt);
    tickDust(dt);
    tickBirds(dt, light);
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
      /* 낙엽은 떨어지며 팔랑팔랑 뒤집힌다 — 눕는 축을 계속 바꿔야 진다는 느낌이 산다 */
      else if (kind === 'leaf') { p.node.rotation.set(p.ph, p.ph * 0.7, 0); }
      n++;
    }
    return n;
  }

  /* ── 구름 (PLAN 44절 "구름 이동") ─────────────────────────
   * 비·눈과 창고를 안 섞는다 — 그쪽은 천후가 바뀔 때마다 `reshape` 로 통째로
   * 갈아 끼우는데, 구름은 천후와 무관하게 늘 몇 장 떠 있어야 한다.
   * 플레이어를 살짝 벗어난 아주 넓은 반경에서 한 방향(+x)으로 아주 천천히
   * 흐르다가, 바람 반대쪽 끝을 벗어나면 반대편(윗바람)에서 다시 태어난다 —
   * 비가 상자를 벗어나면 위에서 다시 시작하는 것과 같은 손이다.
   */
  function CLOUD_ON() { return core.tuned('sky3d.clouds', 1) ? true : false; }
  function CLOUD_N() { return Math.max(0, Math.round(core.tuned('sky3d.cloudN', 7) * DENS())); }
  function CLOUD_R() { return core.tuned('sky3d.cloudR', 260); }        // 뜨는 반경(m)
  function CLOUD_H() { return core.tuned('sky3d.cloudH', 140); }        // 높이(m)
  function CLOUD_SPD() { return core.tuned('sky3d.cloudSpeed', 1.1); }  // 흐르는 빠르기(m/s)

  var clouds = [], cloudGroup = null, cloudGeoCache = {}, cloudMat = null;

  function cloudGeo(T, w, d) {
    var k = Math.round(w) + 'x' + Math.round(d);
    if (!cloudGeoCache[k]) { cloudGeoCache[k] = new T.BoxGeometry(w, w * 0.18, d); }
    return cloudGeoCache[k];
  }

  function ensureClouds() {
    var T = three();
    if (!T || cloudGroup) { return !!cloudGroup; }
    cloudGroup = new T.Group();
    W3().addFx(cloudGroup);
    /* **안개를 안 탄다** — 비 알갱이와 같은 사정이다. 안개까지 먹으면
       흐린 날 구름이 배경과 뭉개져 안 보인다 */
    cloudMat = new T.MeshBasicMaterial({
      color: 0xf4f6fa, transparent: true, opacity: 0.5, depthWrite: false
    });
    return true;
  }

  /** 구름 한 장을 자리에 놓는다. `fresh` 면 반경 안 아무 데나, 아니면 윗바람 끝 */
  function seedCloud(c, fresh) {
    var R = CLOUD_R();
    if (fresh) {
      c.x = (Math.random() * 2 - 1) * R;
    } else {
      c.x = -R;                              // 바람이 +x 로 부니 -R 이 윗바람이다
    }
    c.z = (Math.random() * 2 - 1) * R;
    c.w = R * (0.16 + Math.random() * 0.14);  // 장마다 크기를 조금씩 다르게
  }

  function reshapeClouds() {
    var T = three();
    if (!T || !ensureClouds()) { return 0; }
    var want = CLOUD_ON() ? CLOUD_N() : 0;
    while (clouds.length < want) {
      var c = { x: 0, z: 0, w: 40, node: new T.Mesh(cloudGeo(T, 40, 26), cloudMat) };
      seedCloud(c, true);
      c.node.geometry = cloudGeo(T, c.w, c.w * 0.65);
      cloudGroup.add(c.node);
      clouds.push(c);
    }
    var i;
    for (i = 0; i < clouds.length; i++) { clouds[i].node.visible = i < want; }
    return want;
  }

  /** 구름 한 프레임 — `tick` 안에서 비·눈과 나란히 굴린다 */
  function tickClouds(dt) {
    if (!live()) { return 0; }
    reshapeClouds();
    if (!clouds.length) { return 0; }
    var pos = core.save.player.pos, R = CLOUD_R(), spd = CLOUD_SPD(), n = 0, i;
    for (i = 0; i < clouds.length; i++) {
      var c = clouds[i];
      if (!c.node.visible) { continue; }
      c.x += spd * dt;
      if (c.x > R) { seedCloud(c, false); c.node.geometry = cloudGeo(three(), c.w, c.w * 0.65); }
      c.node.position.set(pos.x + c.x, CLOUD_H(), pos.y + c.z);
      n++;
    }
    return n;
  }

  /* ── 먼지 (PLAN 44절) ─────────────────────────────────────
   * 비·눈 알갱이 창고와 다시 안 섞는다 — 구름과 같은 사정이다. 먼지는
   * 천후와 거의 무관하게(비·눈만 씻어 낸다) **코앞 낮은 자리**에 늘 조금
   * 떠 있는다. 알갱이는 위아래로 아주 천천히 두둥실거리며 옆으로도 흐른다.
   */
  function DUST_ON() { return core.tuned('sky3d.dust', 1) ? true : false; }
  function DUST_N() { return Math.max(0, Math.round(core.tuned('sky3d.dustN', 26) * DENS())); }
  function DUST_R() { return core.tuned('sky3d.dustR', 12); }          // 사는 상자 반지름(m)
  function DUST_H() { return core.tuned('sky3d.dustH', 2.4); }         // 뜨는 높이(m)
  function DUST_SPD() { return core.tuned('sky3d.dustSpeed', 0.35); }  // 두둥실 빠르기(m/s)

  /** 비·눈이 씻어 내지 않는 날인가 — 순수 함수 */
  function dustWeatherOk(wkey) { return wkey !== 'rain' && wkey !== 'snow'; }

  var dust = [], dustGroup = null;

  function ensureDust() {
    var T = three();
    if (!T || dustGroup) { return !!dustGroup; }
    dustGroup = new T.Group();
    W3().addFx(dustGroup);
    return true;
  }

  /** 먼지 한 알을 상자 안 아무 데나 놓는다 */
  function seedDust(d) {
    var R = DUST_R();
    d.x = (Math.random() * 2 - 1) * R;
    d.z = (Math.random() * 2 - 1) * R;
    d.y = Math.random() * DUST_H();
    d.ph = Math.random() * 6.28;
    d.spd = 0.5 + Math.random() * 0.7;
    var a = Math.random() * Math.PI * 2;
    d.vx = Math.cos(a) * DUST_SPD() * 0.4;
    d.vz = Math.sin(a) * DUST_SPD() * 0.4;
  }

  function reshapeDust() {
    var T = three();
    if (!T || !ensureDust()) { return 0; }
    var W = global.DG.weather;
    var wkey = W ? W.current().key : 'clear';
    var want = (DUST_ON() && dustWeatherOk(wkey)) ? DUST_N() : 0;
    while (dust.length < want) {
      var d = { x: 0, y: 0, z: 0, vx: 0, vz: 0, ph: 0, spd: 1,
                node: new T.Mesh(geo(T, 0.05, 0.05), mat(T, 0xd8c9a0, 0.3)) };
      seedDust(d);
      dustGroup.add(d.node);
      dust.push(d);
    }
    var i;
    for (i = 0; i < dust.length; i++) { dust[i].node.visible = i < want; }
    return want;
  }

  /** 먼지 한 프레임 — `tick` 안에서 나란히 굴린다.
   * **어긋나면 스스로 꺼진다** — 여기서 예외가 나면 `tick()` 이 끊겨 그 뒤의
   * 비·눈·새는 물론 `world3d.render` 의 남은 줄(카메라·전투 무대)까지 그
   * 프레임에서 통째로 안 불린다. 장식 하나가 게임을 멈추는 것보다 낫다 */
  var dustBroken = false;
  function tickDust(dt) {
    if (!live() || dustBroken) { return 0; }
    try {
      reshapeDust();
      if (!dust.length) { return 0; }
      var pos = core.save.player.pos, R = DUST_R(), n = 0, i;
      for (i = 0; i < dust.length; i++) {
        var d = dust[i];
        if (!d.node.visible) { continue; }
        d.ph += dt * d.spd;
        d.x += d.vx * dt;
        d.z += d.vz * dt;
        if (Math.abs(d.x) > R || Math.abs(d.z) > R) { seedDust(d); }
        var bob = Math.sin(d.ph) * 0.5 + 0.5;               // 0~1 을 오간다
        d.node.position.set(pos.x + d.x, bob * DUST_H(), pos.y + d.z);
        n++;
      }
      return n;
    } catch (err) {
      dustBroken = true;
      if (global.console) { console.error('[sky3d] 먼지에서 멎어 껐다', err); }
      return 0;
    }
  }

  /* ── 새 (PLAN 44절 "새가 날아감") ───────────────────────────
   * 낮에만, 비·눈·안개가 없을 때만 뜬다 — 밤과 궂은 날엔 새도 깃든다.
   * 한 무리가 플레이어 둘레를 크게 돌며, 날개는 세로 배율로 팔랑인다.
   */
  function BIRD_ON() { return core.tuned('sky3d.birds', 1) ? true : false; }
  function BIRD_N() { return Math.max(0, Math.round(core.tuned('sky3d.birdN', 6) * DENS())); }
  function BIRD_R() { return core.tuned('sky3d.birdR', 46); }          // 도는 반경(m)
  function BIRD_H() { return core.tuned('sky3d.birdH', 20); }          // 나는 높이(m)
  function BIRD_SPD() { return core.tuned('sky3d.birdSpeed', 0.5); }   // 도는 빠르기(rad/s)

  /** 새가 뜰 만한 날인가 — 순수 함수 */
  function birdSkyOk(wkey, isNight) {
    return !isNight && wkey !== 'rain' && wkey !== 'snow' && wkey !== 'fog';
  }

  var birds = [], birdGroup = null;

  function ensureBirds() {
    var T = three();
    if (!T || birdGroup) { return !!birdGroup; }
    birdGroup = new T.Group();
    W3().addFx(birdGroup);
    return true;
  }

  function seedBird(b, i, n) {
    b.ang = (Math.PI * 2 / Math.max(1, n)) * i + Math.random() * 0.6;
    b.r = BIRD_R() * (0.7 + Math.random() * 0.5);
    b.h = BIRD_H() + (Math.random() * 2 - 1) * 4;
    b.flap = Math.random() * 6.28;
  }

  function reshapeBirds(want) {
    var T = three();
    if (!T || !ensureBirds()) { return 0; }
    while (birds.length < want) {
      var b = { ang: 0, r: 0, h: 0, flap: 0,
                node: new T.Mesh(geo(T, 0.9, 0.26), mat(T, 0x2c2c2c, 0.85)) };
      seedBird(b, birds.length, want);
      birdGroup.add(b.node);
      birds.push(b);
    }
    var i;
    for (i = 0; i < birds.length; i++) { birds[i].node.visible = i < want; }
    return want;
  }

  /** 새 한 프레임 — `tick` 안에서 나란히 굴린다. 어긋나면 스스로 꺼진다
   * (`tickDust` 와 같은 이유) */
  var birdBroken = false;
  function tickBirds(dt, light) {
    if (!live() || birdBroken) { return 0; }
    try {
      var W = global.DG.weather;
      var wkey = (light && light.weather) || (W ? W.current().key : 'clear');
      var isNight = !!(light && light.lamp > 0.2);
      var want = (BIRD_ON() && birdSkyOk(wkey, isNight)) ? BIRD_N() : 0;
      reshapeBirds(want);
      if (!birds.length) { return 0; }
      var pos = core.save.player.pos, spd = BIRD_SPD(), n = 0, i;
      for (i = 0; i < birds.length; i++) {
        var b = birds[i];
        if (!b.node.visible) { continue; }
        b.ang += dt * spd * (0.6 + (i % 3) * 0.2);
        b.flap += dt * 9;
        b.node.position.set(pos.x + Math.cos(b.ang) * b.r, b.h, pos.y + Math.sin(b.ang) * b.r);
        b.node.rotation.set(0, -b.ang, 0);
        var flapY = 0.35 + Math.abs(Math.sin(b.flap)) * 0.65;
        b.node.scale.set(1, flapY, 1);
        n++;
      }
      return n;
    } catch (err) {
      birdBroken = true;
      if (global.console) { console.error('[sky3d] 새에서 멎어 껐다', err); }
      return 0;
    }
  }

  /** 눈으로 확인할 때 */
  function stats() {
    var W = global.DG.weather;
    var wkey = W ? W.current().key : 'clear';
    var vis = 0, i;
    for (i = 0; i < pool.length; i++) { if (pool[i].node && pool[i].node.visible) { vis++; } }
    return {
      on: on(), live: live(), weather: wkey, falls: fallOf(wkey),
      want: countOf(wkey), pool: pool.length, shown: vis, kind: curKind,
      clouds: CLOUD_ON() ? clouds.length : 0, cloudsWant: CLOUD_ON() ? CLOUD_N() : 0,
      leaves: leavesOn(), autumn: autumnNow(),
      dust: dust.length, birds: birds.length
    };
  }

  global.DG = global.DG || {};
  global.DG.sky3d = {
    KINDS: KINDS,
    /* 값을 내는 함수 — 순수하다 */
    on: on, fallOf: fallOf, countOf: countOf,
    cloudOn: CLOUD_ON, cloudCount: CLOUD_N,
    leavesOn: leavesOn, autumnNow: autumnNow,
    dustOn: DUST_ON, dustCount: DUST_N, dustWeatherOk: dustWeatherOk,
    birdOn: BIRD_ON, birdCount: BIRD_N, birdSkyOk: birdSkyOk,
    /* 화면이 쓰는 것 */
    tick: tick, reshape: reshape, stats: stats,
    reset: function () {
      reshape(null);
      /* 구름은 반경 안에 있으면 눈에 보이므로, 진단이 뒤를 치울 때는
         숨겨 둔다 — 다음 tick 에서 다시 그만큼 켜진다 */
      var i;
      for (i = 0; i < clouds.length; i++) { clouds[i].node.visible = false; }
      for (i = 0; i < dust.length; i++) { dust[i].node.visible = false; }
      for (i = 0; i < birds.length; i++) { birds[i].node.visible = false; }
      return pool.length;
    },
    get pool() { return pool; }
  };
})(window);
