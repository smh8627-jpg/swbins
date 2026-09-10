/**
 * 전황 — 3D 전장 (README "Phase 7 전투")
 * ---------------------------------------------------------------
 * `war.js`의 `fight()`는 이미 다 계산해 둔다(병력 손실·성벽 파손·일기토 승패).
 * 이 파일은 그 결과를 작은 전장 디오라마로 다시 그릴 뿐이다 —
 * **판정은 한 줄도 없다.** `war.js`에 더한 것도 `atkStart`·`defStart`·`defForce`
 * 와 (2026-09-03) `frames`·`duel.hits` 뿐이다 — 전부 **이미 끝난 결과를
 * 되짚어 남긴 기록**이지 새 판정이 아니다(합마다 병력·성벽이 얼마였는지,
 * 일기토가 몇 합에 누가 맞았는지). 싸움 자체(무작위·승패)는 war.js 그대로다.
 *
 * **2026-09-03 — "실시간 전투" 요청**: 예전엔 이 리포트를 한 번에 최종
 * 상태로만 그렸다(병력도 성벽도 처음부터 다 깎인 채로 등장). 사용자가
 * "지금 결과를 실시간처럼 재생"을 골라, 같은 최종 결과를 **합 단위로
 * 시간차를 두고 재생**하도록만 바꿨다 — 일기토 합마다 깃발이 흔들리고,
 * 라운드마다 무리가 줄고 성벽이 깎이는 게 보인다. `playback()` 이 그
 * 순서를 맡고, `render()`(밖에서 부르는 자리)는 안 바뀌었다.
 *
 * 병력은 숫자를 그대로 세우지 않는다(장수는 30명 안팎 세우면 도리어 어수선하다) —
 * **깃발 다발**로 무리 크기만 어림잡아 세운다. 일기토는 이긴 쪽 금빛 깃발과
 * 진 쪽이 쓰러진 회색 깃발로만 표시한다(누구 편인지는 안 가린다 — 굳이
 * 편 색을 다시 가르는 것보다 승패 그 자체가 더 눈에 든다).
 */
(function (global) {
  'use strict';

  var A3 = null;
  function asset3d() { if (!A3) { A3 = global.DG.asset3d; } return A3; }
  var FD = null;
  function forceData() { if (!FD) { FD = global.DG.forceData; } return FD; }
  var T = null;
  function three() { if (!T) { T = global.THREE || null; } return T; }
  function R() { return global.DG.rtk; }
  function off() { return global.DG.off; }
  var CO = null;
  function core() { if (!CO) { CO = global.DG.core; } return CO; }
  /** 성벽 붕괴 카메라 흔들림 켬/끔(⚙️ 설정 시트, 2026-09-10) — 흔들림에
   *  민감한 사람을 위해서다. 부드럽게 줄었다 늘었다 하는 것(라운드 충격의
   *  거리-당김, 일기토 근접 컷)은 안 가린다 — 진짜 화면이 떨리는 지터
   *  (`wallShake`)만 이 손잡이로 끈다 */
  function SHAKE_ON() { return core() ? (core().tuned('battle3d.shake', 1) ? true : false) : true; }

  var TIER_H = { t1: 6, t2: 8, t3: 11 };
  function tierOf(maxWall) {
    var w = maxWall || 0;
    if (w >= 5600) { return 't3'; }
    if (w >= 4600) { return 't2'; }
    return 't1';
  }

  function forceColor(id) {
    var f = forceData().force(id);
    return f ? f.color : '#5b6572';
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ring(n, r, startAng) {
    var pts = [], i;
    for (i = 0; i < n; i++) {
      var a = startAng + (i / n) * Math.PI * 2;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  }

  var canvas = null, renderer = null, scene = null, camera = null, dyn = null;
  /** liveDyn — 합마다 다시 그리는 것만 담는다(성벽·무리·일기토 깃발).
   *  땅·성 소품(dyn 의 나머지)은 재생 내내 한 번만 짓는다 */
  var liveDyn = null, curGroup = null;
  var ready = false, failed = false, loopRunning = false;
  var rebuildSeq = 0, spin = 0;
  /* 일기토 실제 캐릭터(2026-09-10) — 예전엔 금색/회색 깃발 둘로만 승패를
     표시했다. `duelActors = {a,d}` 는 war.js `duel()`이 붙여 준 `rep.duel.a`
     (공격 쪽 장수)·`rep.duel.d`(수비 쪽 장수)를 실제 QRPG 모델로 세운 것 —
     `dyn`에 한 번만 얹혀 전투 재생 내내 산다(성벽·무리처럼 합마다 새로
     안 짓는다). `duelWant = {a,d}`는 tick()이 매 프레임 읽어 미는 애니메이션
     슬롯이고, `renderLive()`가 그 값만 갈아 끼운다 — 판정은 없다, war.js가
     이미 낸 `hits[].who`를 그대로 옮길 뿐이다 */
  var duelActors = null, duelWant = { a: 'idle', d: 'idle' };
  /* 맞았을 때 붉게 번쩍(2026-09-10, 사가블로 asset3d.js 의 ownAllMat·flashAllMat
     과 같은 요령) — 'hit' 를 재생하기 시작한 그 프레임에 1로 켜고 tick()마다
     0.82배씩 죽인다. 재질을 복제해 두는 건(setupDuel() 이 짓는 순간, `place()`)
     성끼리 서로 다른 세력색을 입은 재질을 공유해 버리면 한쪽이 번쩍일 때
     둘 다 번쩍이는 사고를 막기 위해서다 */
  var flashA = 0, flashD = 0;
  /* 일기토 카메라(2026-09-10) — 합을 주고받는 동안만 두 장수 가까이 붙는다
     (`duelCamActive`, playback()이 켜고 끈다). `camBlend`는 그 켬/끔을 매
     프레임 살살 뒤쫓아 넓은 그림 ↔ 근접 샷을 부드럽게 오간다(딱 끊기지
     않게). 개입형 실시간 전투(`beginLive`)는 이 값을 안 건드린다 — 아직
     라운드 결과가 안 정해진 채로 정지한 두 장수를 당겨 봐야 볼 게 없다 */
  var duelCamActive = false, camBlend = 0;
  /* 라운드 충격(2026-09-10) — 무리(atk/def 깃발 다발) 자체를 실제 장수로 안
     바꾸기로 한 원래 판단(장수 30명을 세우면 오히려 어수선하다)은 그대로
     두고, 대신 **부딪히는 순간**을 카메라·무리 밀림·소리 셋으로 더 또렷하게
     낸다. `roundPulse`는 라운드가 넘어갈 때마다 1로 켜졌다가 tick()마다
     0.85배씩 죽는다 — atk/defGroupRef(위 cluster()가 돌려준 그 그룹)를
     서로에게로 살짝 밀었다 당기고, 넓은 카메라도 살짝 훅 당긴다 */
  var atkGroupRef = null, defGroupRef = null, roundPulse = 0;
  /* 성벽 붕괴 흔들림(2026-09-10) — lastWallN 은 "직전 프레임에 성벽이 몇
     칸이었나"만 기억하는 값(판정 아님, renderLive() 가 매 프레임 잰다).
     wallShake 는 roundPulse 와 같은 감쇠 방식이지만 더 크게 흔든다(성벽이
     무너지는 게 매 합 부딪히는 것보다 드물고 큰 사건이라서) */
  var lastWallN = null, wallShake = 0;
  var timers = [];   // playback() 이 건 setTimeout id들 — 새 전황이 오면 다 지운다

  function available() { return !!three() && !failed; }

  function active() {
    return !!(ready && document.getElementById('battle3d') === canvas &&
      canvas && canvas.isConnected);
  }

  /** 캔버스가 매번 새로 태어나므로(innerHTML 교체) 옛 렌더러를 명시적으로 버리고 다시 묻는다 */
  function ensureInit() {
    var t = three();
    var el = document.getElementById('battle3d');
    if (!t || !el) { failed = true; return false; }
    if (el === canvas && ready) { return true; }
    if (renderer) {
      try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) { /* noop */ }
    }
    canvas = el; renderer = null; ready = false;
    try {
      renderer = new t.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    } catch (e) { failed = true; return false; }
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));

    scene = new t.Scene();
    camera = new t.PerspectiveCamera(44, 1, 0.5, 300);
    scene.add(new t.HemisphereLight(0xffffff, 0x4a5a3a, 1.0));
    var sun = new t.DirectionalLight(0xfff4e0, 1.05);
    sun.position.set(-12, 20, 9);
    scene.add(sun);
    dyn = new t.Group();
    scene.add(dyn);
    liveDyn = new t.Group();
    dyn.add(liveDyn);
    curGroup = dyn;

    ready = true;
    resize();
    return true;
  }

  function resize() {
    if (!renderer || !camera || !canvas) { return; }
    var w = canvas.clientWidth || 320, h = canvas.clientHeight || 190;
    if (!w || !h) { return; }
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  var blobGeo = null, blobMat = null;
  function addShadow(x, z, r) {
    var t = three();
    if (!t || !curGroup) { return; }
    if (!blobGeo) {
      blobGeo = new t.CircleGeometry(1, 16);
      blobMat = new t.MeshBasicMaterial({ color: 0x14140c, transparent: true, opacity: 0.28, depthWrite: false });
    }
    var m = new t.Mesh(blobGeo, blobMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.015, z);
    m.scale.setScalar(Math.max(0.35, r));
    curGroup.add(m);
  }

  /** kind 별 소품 하나 — asset3d 캐시 덕에 같은 kind 를 여러 번(합마다 성벽을
   *  다시 그릴 때) 불러도 두 번째부터는 사실상 즉시 온다.
   *  `liveGate` 를 주면(합 단위 재생 중인 성벽) 그 합이 지난 뒤 늦게 돌아온
   *  응답은 버린다 — 안 그러면 두 합 전 성벽이 지금 화면에 끼어든다 */
  var liveSeq = 0;
  function addProp(kind, id, x, z, scaleH, rotY, seq, liveGate) {
    var g0 = curGroup;
    asset3d().build(kind, { id: id }, function (g) {
      if (seq !== rebuildSeq || (liveGate != null && liveGate !== liveSeq) || !g || !g0) { return; }
      g.position.set(x, 0, z);
      g.rotation.y = rotY || 0;
      g.scale.setScalar(scaleH);
      g0.add(g);
      var prevGroup = curGroup;
      curGroup = g0;
      addShadow(x, z, scaleH * 0.4);
      curGroup = prevGroup;
    });
  }

  /** 병력 한 무리를 어림잡아 세우는 깃발 — 실제 소품 GLB 대신 막대+천으로 직접 짓는다
   *  (이 무리는 "성 안"의 살림살이가 아니라 숫자를 어림잡는 표식일 뿐이다).
   *  전투 재생 한 판에 `renderLive()`가 수십 번(합마다) 이 함수를 무리당 최대
   *  14번 부르는데, 예전엔 매번 지오메트리·머티리얼을 새로 만들고
   *  `liveDyn.clear()`(dispose 안 함)로 버려서 GPU 자원이 계속 쌓였다.
   *  지오메트리는 딱 하나(깃발 모양은 다 같다), 천 머티리얼은 색상별로
   *  캐시해 재사용한다 — 그러면 `.clear()`가 참조만 끊어도 GPU 에는
   *  아무것도 안 남는다(감사, 2026-09-08) */
  var bannerPoleGeo = null, bannerPoleMat = null, bannerClothGeo = null, bannerClothMats = {};
  function banner(color, tipped) {
    var t = three();
    if (!bannerPoleGeo) {
      bannerPoleGeo = new t.CylinderGeometry(0.035, 0.035, 1.5, 5);
      bannerPoleMat = new t.MeshLambertMaterial({ color: 0x6b5533 });
      bannerClothGeo = new t.BoxGeometry(0.46, 0.62, 0.03);
    }
    var g = new t.Group();
    var pole = new t.Mesh(bannerPoleGeo, bannerPoleMat);
    pole.position.y = 0.75;
    g.add(pole);
    var hex = new t.Color(color).getHex();
    var clothMat = bannerClothMats[hex];
    if (!clothMat) { clothMat = bannerClothMats[hex] = new t.MeshLambertMaterial({ color: hex }); }
    var cloth = new t.Mesh(bannerClothGeo, clothMat);
    cloth.position.set(0.26, 1.16, 0);
    g.add(cloth);
    if (tipped) { g.rotation.z = 1.15; g.position.y = 0.05; }
    return g;
  }

  /** 무리 하나 — 예전엔 낱낱이 `curGroup`에 바로 얹어 놓는 자리(x,z)를 못
   *  옮겼다. 이제 한 그룹으로 묶어 그 그룹의 위치를 반환한다 — tick()이
   *  라운드가 부딪힐 때마다(`roundPulse`) 이 그룹째로 살짝 앞으로 밀었다
   *  당겨 "부딪힌다"는 걸 보여줄 수 있게(2026-09-10, 병력 무리도 실시간
   *  액션처럼 느껴지게 해 달라는 이어지는 요청) */
  function cluster(n, cx, cz, color) {
    var t = three();
    var i, cols = Math.min(5, Math.max(1, n));
    var g = new t.Group();
    var prevGroup = curGroup;
    curGroup = g;
    for (i = 0; i < n; i++) {
      var row = Math.floor(i / cols), col = i % cols;
      var x = (col - (cols - 1) / 2) * 0.55 + (Math.random() - 0.5) * 0.12;
      var z = -row * 0.55 + (Math.random() - 0.5) * 0.12;
      var b = banner(color, false);
      b.position.set(x, 0, z);
      g.add(b);
      addShadow(x, z, 0.22);
    }
    curGroup = prevGroup;
    g.position.set(cx, 0, cz);
    curGroup.add(g);
    return g;
  }

  /** 한 번만 짓는 것 — 땅·성. 성벽·무리·일기토 깃발은 `renderLive()` 몫이다
   *  (합마다 다시 그려야 하므로).
   *  @returns {seq,h,maxWall} — renderLive() 에 그대로 넘긴다. 성이 없으면 null */
  function buildBase(rep) {
    var t = three();
    dyn.clear();
    liveDyn = new t.Group();
    dyn.add(liveDyn);
    rebuildSeq++;
    var seq = rebuildSeq;
    curGroup = dyn;
    atkGroupRef = null; defGroupRef = null; roundPulse = 0;
    lastWallN = null; wallShake = 0;
    var c = R().city(rep.to);
    if (!c) { return null; }
    var tier = tierOf(c.maxWall);
    var h = TIER_H[tier];
    var ownerCol = forceColor(c.force);

    scene.background = new t.Color(rep.water ? 0x8fc4e6 : 0xb9dcef);
    scene.fog = new t.Fog(rep.water ? 0x8fc4e6 : 0xb9dcef, 20, 70);

    var ground = new t.Mesh(
      new t.CircleGeometry(11, 28),
      new t.MeshLambertMaterial({ color: rep.water ? 0x5aa9d8 : 0xcfe0a0 })
    );
    ground.rotation.x = -Math.PI / 2;
    dyn.add(ground);

    asset3d().build('city:' + tier, { id: rep.to + ':battle', tint: ownerCol, flag: ownerCol }, function (g) {
      if (seq !== rebuildSeq || !g || !dyn) { return; }
      g.position.set(0, 0, -6.5);
      g.scale.setScalar(h);
      dyn.add(g);
      var prevGroup = curGroup;
      curGroup = dyn;
      addShadow(0, -6.5, h * 0.45);
      curGroup = prevGroup;
    });

    setupDuel(rep, seq);

    return { seq: seq, h: h, maxWall: c.maxWall || 1 };
  }

  /**
   * 일기토 실제 캐릭터 둘을 세운다(비동기, `dyn`에 한 번만 얹는다 — 성벽·
   * 무리처럼 합마다 다시 짓지 않는다). `rep.duel.a`(공격 쪽 장수)·
   * `rep.duel.d`(수비 쪽 장수) 무장의 실제 QRPG 모델을 `off().find()`로
   * 찾아 각 세력 색으로 물들여 마주 세운다 — 일기토가 없는 싸움(무력 차가
   * 커서 아무도 안 나온 경우)은 `rep.duel`이 애초에 없어 조용히 건너뛴다.
   */
  /** 재질을 복제해 떼어 온다(사가블로 asset3d.js `ownAllMat`과 같은 요령) —
   *  안 그러면 캐시된 재질을 여러 모델이 같이 쓰다 한쪽만 번쩍이려 해도
   *  같은 재질을 쓰는 다른 데까지 같이 번쩍인다. emissive 있는 것만 돌려준다 */
  function ownAllMat(root) {
    var out = [];
    if (!root) { return out; }
    root.traverse(function (o) {
      if (!o.isMesh || !o.material) { return; }
      var m = Array.isArray(o.material) ? o.material[0].clone() : o.material.clone();
      o.material = m;
      if (m.emissive) { out.push(m); }
    });
    return out;
  }
  function setFlash(mats, k) {
    if (!mats || !mats.length) { return; }
    for (var i = 0; i < mats.length; i++) { mats[i].emissive.setRGB(k, k * 0.15, k * 0.1); }
  }

  function setupDuel(rep, seq) {
    duelActors = null;
    duelWant = { a: 'idle', d: 'idle' };
    flashA = 0; flashD = 0;
    if (!rep.duel || !rep.duel.a || !rep.duel.d) { return; }
    var OFF = off(), A3 = asset3d();
    if (!OFF || !A3 || !A3.buildHero) { return; }
    var oa = OFF.find(rep.duel.a), od = OFF.find(rep.duel.d);
    if (!oa || !od) { return; }
    var got = {};
    /* 마주 보고 서게 90도씩 돌린다 — QRPG 몸의 기본 정면이 어느 쪽인지는
       실기기로 확인 전이라, 반대로 등을 지고 서 보이면 이 두 rotation.y
       부호만 서로 바꾸면 된다(장수 위치·병력 무리 등 나머지는 안 건드려도 됨) */
    function place(slot, model) {
      if (seq !== rebuildSeq || !model || !dyn) { return; }
      model.scale.setScalar(1.5);
      model.position.set(slot === 'a' ? -0.6 : 0.6, 0, slot === 'a' ? 0.5 : -0.1);
      model.rotation.y = slot === 'a' ? Math.PI / 2 : -Math.PI / 2;
      model.userData.flashMats = ownAllMat(model);
      dyn.add(model);
      got[slot] = model;
      if (got.a && got.d) { duelActors = got; }
    }
    A3.buildHero(oa, forceColor(rep.force), function (m) { place('a', m); });
    A3.buildHero(od, forceColor(rep.defForce), function (m) { place('d', m); });
  }

  /**
   * 합 하나(또는 최종)를 그린다 — **성벽·무리 크기·일기토 깃발만** 다시 그린다.
   * `state = { atk, def, wall, duelPhase }` — atk/def 는 그 순간의 병력(절대
   * 값), wall 은 그 순간의 성벽 값. duelPhase: null(아직 안 붙었다) ·
   * 'progress'(맞붙는 중, 승패색을 안 가른다) · 'done'(끝났다, 금빛/회색).
   * war.js 의 `frames` 를 순서대로 이 함수에 먹이면 재생이 된다 — **여기서
   * 새 판정은 안 한다**, 이미 정해진 값을 그릴 뿐이다.
   */
  function renderLive(rep, base, state) {
    if (!base || base.seq !== rebuildSeq || !liveDyn) { return; }
    var seq = base.seq, h = base.h;
    liveDyn.clear();
    curGroup = liveDyn;
    liveSeq++;
    var myLiveSeq = liveSeq;

    if (!rep.water) {
      var wallRatio = clamp((state.wall || 0) / base.maxWall, 0, 1);
      var wallN = Math.round(wallRatio * 6);
      /* 성벽이 실제로 한 칸 무너지는 순간(2026-09-10) — 매 합 그려지는
         `wallN`이 직전 프레임보다 줄어든 그 프레임만 잡는다(공성 중이 아니면
         안 줄어드니 조용하다). `roundPulse`(매 합)보다 드물고 큰 충격이라
         카메라 흔들림(`wallShake`)·전용 소리(`wall_break`)를 따로 둔다 */
      if (lastWallN != null && wallN < lastWallN) {
        wallShake = 1;
        var SFX = global.DG.sfx;
        if (SFX) { SFX.play('wall_break'); }
      }
      lastWallN = wallN;
      ring(6, h * 0.7, 0).slice(0, wallN).forEach(function (p, i) {
        addProp('wall', rep.to + ':bwall:' + i, p[0], p[1] - 6.5, h * 0.5,
          Math.atan2(p[0], p[1]) + Math.PI / 2, seq, myLiveSeq);
      });
    }

    var atkStart = rep.atkStart || 6000, defStart = rep.defStart || 6000;
    var atkSurvive = clamp((state.atk != null ? state.atk : atkStart) / Math.max(1, atkStart), 0, 1);
    var defSurvive = clamp((state.def != null ? state.def : defStart) / Math.max(1, defStart), 0, 1);
    var atkN = clamp(Math.round((atkStart / 1200) * atkSurvive), 1, 14);
    var defN = clamp(Math.round((defStart / 1200) * defSurvive), 1, 14);

    atkGroupRef = cluster(atkN, 0, 4.2, forceColor(rep.force));
    defGroupRef = cluster(defN, 0, -3.0, forceColor(rep.defForce));
    if (state.roundTick) { roundPulse = 1; }

    /* 일기토 — 2026-09-10 부터는 깃발이 아니라 `duelActors`(setupDuel() 이
       세운 실제 장수 둘)를 실제로 움직인다. 여기선 "무슨 동작을 원하는지"
       (`duelWant`)만 갈아 끼우고, 실제 애니메이션 재생(mixer 갱신)은 매
       프레임 tick()이 한다 — 합마다 다시 그리는 다른 것들과 달리 캐릭터는
       끊김 없이 계속 움직여야 하기 때문이다 */
    if (rep.duel && state.duelPhase) {
      if (state.duelPhase === 'done') {
        var winA = rep.duel.winner === rep.duel.a;
        duelWant = winA
          ? { a: 'idle', d: rep.duel.hurt ? 'death' : 'idle' }
          : { d: 'idle', a: rep.duel.hurt ? 'death' : 'idle' };
        if (rep.duel.hurt) { if (winA) { flashD = 1; } else { flashA = 1; } }
      } else if (state.duelHit) {
        duelWant = state.duelHit.who === 'a' ? { a: 'attack', d: 'hit' } : { a: 'hit', d: 'attack' };
        if (state.duelHit.who === 'a') { flashD = 1; } else { flashA = 1; }
      } else {
        duelWant = { a: 'idle', d: 'idle' };
      }
    } else {
      duelWant = { a: 'idle', d: 'idle' };
    }
  }

  /** playback() 이 건 setTimeout 들 — 새 전황이 오거나 화면을 벗어나면 다 지운다 */
  function clearTimers() {
    for (var i = 0; i < timers.length; i++) { clearTimeout(timers[i]); }
    timers = [];
  }
  function schedule(fn, delay) { timers.push(setTimeout(fn, delay)); }

  var ROUND_MS = 550, HIT_MS = 380, PAUSE_MS = 500;

  /**
   * **"실시간 전투" 재생** — `war.js` 가 이미 끝내 둔 결과(`rep`)를 합 단위로
   * 시간차를 두고 다시 그린다. 판정은 전혀 안 한다 — `rep.frames`(라운드별
   * 병력·성벽)와 `rep.duel.hits`(일기토 합별 승패)를 순서대로 `renderLive()`
   * 에 먹일 뿐이다. 둘 다 없는 옛 리포트(세이브에 남아 있던 것 등)라도
   * 최종 상태 하나는 그린다 — 안전망.
   */
  function playback(rep, onFrame) {
    clearTimers();
    var base = buildBase(rep);
    if (!base) { return; }
    var seq = base.seq;
    var atkStart = rep.atkStart || 6000, defStart = rep.defStart || 6000;
    var wallFrom = rep.wallFrom != null ? rep.wallFrom : base.maxWall;
    var guard = function (fn) { return function () { if (seq === rebuildSeq) { fn(); } }; };
    /* 화면(diorama)만 그리던 자리에 콜백을 하나 더한다(2026-09-10) — showBattle()
       의 HUD(.rstat 숫자)가 여태 시작 vs 끝만 보여주고 합·라운드 중간은 안 바뀌던
       것을, 개입형 실시간 전투처럼 실시간으로 갱신하기 위해서다. 판정은 없다,
       renderLive() 에 먹이는 값을 그대로 한 번 더 넘길 뿐이다 */
    function frame(state) { renderLive(rep, base, state); if (onFrame) { onFrame(state); } }

    /* 0) 붙기 전 — 온전한 두 진 */
    frame({ atk: atkStart, def: defStart, wall: wallFrom, duelPhase: null });
    var delay = PAUSE_MS;

    /* 1) 일기토 — 합마다 실제로 공격·피격 동작을 주고받다가 끝나면 승패 자세로
       (2026-09-10 전엔 깃발 색만 바뀌었다). 합마다 `hits[i]`를 클로저로 붙잡아
       `duelHit`로 넘긴다 — 어느 쪽이 그 합에 맞았는지(who) 그대로 옮길 뿐이다.
       카메라도 이 구간만 두 장수 가까이 붙었다가(`duelCamActive`, tick() 참고)
       라운드(무리) 전투가 시작하면 다시 넓은 그림으로 돌아간다 — 실제 판정과
       무관한 연출이다. 합마다 부딪히는 소리(`sfx.js`'duel'`)도 같이 낸다 */
    duelCamActive = !!rep.duel;
    if (rep.duel) {
      var hits = rep.duel.hits || [];
      for (var i = 0; i < hits.length; i++) {
        (function (hit) {
          schedule(guard(function () {
            frame({ atk: atkStart, def: defStart, wall: wallFrom,
              duelPhase: 'progress', duelHit: hit });
            var SFX = global.DG.sfx;
            if (SFX) { SFX.play('duel'); }
          }), delay);
        })(hits[i]);
        delay += HIT_MS;
      }
      schedule(guard(function () {
        frame({ atk: atkStart, def: defStart, wall: wallFrom, duelPhase: 'done' });
      }), delay);
      delay += PAUSE_MS;
      schedule(guard(function () { duelCamActive = false; }), delay);
    }

    /* 2) 라운드 — war.js 가 남긴 합별 스냅샷을 그대로 순서대로. 무리가
       실제로 부딪힌 순간이라 `roundTick`을 얹어 카메라 훅·무리 밀림·부딪히는
       소리(`round_clash`)를 같이 켠다(2026-09-10) */
    var frames = rep.frames || [];
    var duelDone = rep.duel ? 'done' : null;
    for (var fi = 0; fi < frames.length; fi++) {
      (function (f, r) {
        schedule(guard(function () {
          frame({ atk: f.atk, def: f.def, wall: f.wall, duelPhase: duelDone, roundTick: true, r: r });
          var SFX = global.DG.sfx;
          if (SFX) { SFX.play('round_clash'); }
        }), delay);
      })(frames[fi], fi + 1);
      delay += ROUND_MS;
    }

    /* 3) 마지막 — frames 가 없던 옛 리포트까지 포함해 최종 수치로 못박는다 */
    schedule(guard(function () {
      var finalAtk = atkStart - (rep.lossA || 0), finalDef = defStart - (rep.lossD || 0);
      frame({ atk: finalAtk, def: finalDef, wall: rep.wallTo, duelPhase: duelDone });
    }), delay);
  }

  /** 밖에서 부르는 단 하나의 입구 — `rtk:battle` 리포트 하나를 그대로 재생한다.
   *  `onFrame(state)`(선택) — ui-rtk.js 가 화면 밖 HUD(숫자)를 같은 박자로
   *  갈아 끼우고 싶을 때 넘긴다. 안 넘기면 예전과 똑같이 디오라마만 돈다 */
  function render(rep, onFrame) {
    if (!rep || !ensureInit()) { return; }
    playback(rep, onFrame);
    resize();
    startLoop();
  }

  /**
   * **개입형 실시간 전투** 용 — `war.marchInteractive()` 가 합마다 끊어 부르므로
   * 여기서도 미리 정해진 재생(`playback`)이 아니라 그때그때 `showState()` 로
   * 한 걸음씩 그린다. 땅·성은 한 번만 짓고(`buildBase`), 그 뒤로는 `showState()`
   * 만 호출한다 — `render()`(예전 요약 재생)와는 다른 입구다.
   * @param repStub {to,water,force,defForce,atkStart,defStart,duel,wallFrom}
   * @returns base — showState() 에 그대로 넘긴다. 실패하면 null
   */
  function beginLive(repStub) {
    if (!repStub || !ensureInit()) { return null; }
    duelCamActive = false;   // 이 경로는 근접 연출을 안 쓴다(위 duelCamActive 주석 참고)
    clearTimers();
    var base = buildBase(repStub);
    resize();
    startLoop();
    return base;
  }

  /** beginLive() 로 세운 자리에 한 순간(state)을 그린다 — 새 판정은 안 한다 */
  function showState(repStub, base, state) {
    if (!base) { return; }
    renderLive(repStub, base, state);
  }

  function startLoop() {
    if (loopRunning) { return; }
    loopRunning = true;
    requestAnimationFrame(tick);
  }

  /** 카메라 손잡이를 새로 두지 않는다 — 천천히 저절로 돈다.
   *  일기토 장수(`duelActors`)가 서 있으면 매 프레임 실제로 움직인다
   *  (`duelWant`가 바뀔 때만 동작을 바꿔 타지만, mixer 는 계속 갱신해야
   *  끊기지 않고 부드럽게 이어진다 — 그래서 여기, 매 프레임에 있다) */
  function tick(now) {
    if (!active()) { loopRunning = false; clearTimers(); return; }
    /* 화면에 보이는 채로 다른 창을 쓰는 중이면 렌더를 쉰다 — 안 그러면
       천천히 도는 카메라만으로도 계속 GPU 를 잡아먹는다(2026-09-08) */
    if (document.hidden || !document.hasFocus()) {
      global.setTimeout(function () { requestAnimationFrame(tick); }, 500);
      return;
    }
    spin += 0.004;
    /* 라운드 충격 — 부딪힐 때마다 살짝 훅 당겼다가(dist 를 살짝 줄인다) 풀린다.
       tick() 는 렌더 직전에 한 번만 도니 여기서 감쇠도 같이 한다 */
    roundPulse *= 0.85;
    if (roundPulse < 0.01) { roundPulse = 0; }
    var lunge = roundPulse * 0.6;
    if (atkGroupRef) { atkGroupRef.position.z = 4.2 - lunge; }
    if (defGroupRef) { defGroupRef.position.z = -3.0 + lunge; }

    var dist = 13 - roundPulse * 1.2;
    var wideX = Math.sin(spin) * dist, wideY = 8.5, wideZ = Math.cos(spin) * dist - 1;

    /* 일기토 근접 샷 — 진짜 판정과 무관한 연출뿐이다. camBlend 를 목표값
       (0=넓은 그림·1=근접) 쪽으로 매 프레임 살살 당겨 뚝 끊기지 않게 한다 */
    var camTarget = (duelCamActive && duelActors) ? 1 : 0;
    camBlend += (camTarget - camBlend) * 0.12;
    if (camBlend > 0.01) {
      var closeX = 0.9, closeY = 1.35, closeZ = 1.9;
      var lookWx = 0, lookWy = 3, lookWz = -2;
      var lookCx = 0, lookCy = 0.85, lookCz = 0.2;
      camera.position.set(
        wideX + (closeX - wideX) * camBlend,
        wideY + (closeY - wideY) * camBlend,
        wideZ + (closeZ - wideZ) * camBlend
      );
      camera.lookAt(
        lookWx + (lookCx - lookWx) * camBlend,
        lookWy + (lookCy - lookWy) * camBlend,
        lookWz + (lookCz - lookWz) * camBlend
      );
    } else {
      camera.position.set(wideX, wideY, wideZ);
      camera.lookAt(0, 3, -2);
    }

    /* 성벽 붕괴 흔들림 — 카메라를 한 번 더 흔든다(위 wide/근접 블렌드가 이미
       잡아 둔 자리 위에 얹는다). 라운드 충격(dist)보다 눈에 띄어야 하는
       드문 사건이라 실제로 흔든다(위치를 지터) */
    wallShake *= 0.80;
    if (wallShake < 0.01) { wallShake = 0; }
    if (wallShake > 0 && SHAKE_ON()) {
      camera.position.x += (Math.random() - 0.5) * wallShake * 0.5;
      camera.position.y += (Math.random() - 0.5) * wallShake * 0.3;
    }

    flashA *= 0.82; flashD *= 0.82;
    if (flashA < 0.01) { flashA = 0; }
    if (flashD < 0.01) { flashD = 0; }
    if (duelActors) {
      var nowT = (now || 0) / 1000;
      var A3 = asset3d();
      A3.step(duelActors.a, { t: nowT, anim: duelWant.a });
      A3.step(duelActors.d, { t: nowT, anim: duelWant.d });
      if (duelActors.a) { setFlash(duelActors.a.userData.flashMats, flashA); }
      if (duelActors.d) { setFlash(duelActors.d.userData.flashMats, flashD); }
    }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  global.DG = global.DG || {};
  global.DG.battle3d = { available: available, render: render, beginLive: beginLive, showState: showState };
})(window);
