/**
 * 전투 연출 — 교전이 열리면 지도가 같이 싸운다 (3D 전환 PHASE 9)
 * ---------------------------------------------------------------
 * 교전(`duel.js`)은 여태 **카드 안에서만** 벌어졌다. 화면을 덮는 카드가 뜨고, 그 안의
 * 작은 무대에서 둘이 치고받는다. 뒤에 깔린 3D 지도는 아무 일도 없다는 듯 조용했다.
 *
 * `PLAN.md` 23·24절이 바라는 것을 그 자리에 얹는다.
 *
 *   교전 시작   카메라가 **약간 줌인**한다
 *   공격        카메라가 **약간 흔들린다**
 *   강한 스킬   짧은 **hit-stop** — 한 순간 화면이 멎는다
 *   스킬        검기 · 불꽃 · 흙먼지가 인다
 *
 * **Particle Pool 을 쓴다**(24절의 못박은 요구). 알갱이를 미리 만들어 두고 꺼내 쓰고
 * 되돌린다 — 칠 때마다 새로 만들면 60초 교전에 수백 개가 생겼다 버려진다.
 *
 * **판정에는 한 줄도 안 닿는다.** `duel.js` 가 내는 신호(`duel:open`·`duel:fx`·
 * `duel:close`)를 듣기만 하고, 듣는 쪽이 없어도 교전은 그대로 돈다. 3D 가 꺼져 있거나
 * WebGL 이 없으면 통째로 잠든다. 손잡이 `battle3d.on` 을 0 으로 두면 카드만 남는다.
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

  /** 지도까지 같이 싸울까 — 0 이면 예전처럼 카드 안에서만 벌어진다 */
  function on() { return core.tuned('battle3d.on', 1) ? true : false; }
  /** 흔들림 세기(m) — 멀미가 나면 여기를 내린다 */
  function SHAKE() { return core.tuned('battle3d.shake', 0.5); }
  /** 알갱이를 몇 개나 미리 만들어 둘까 */
  function POOL() { return core.tuned('battle3d.pool', 48); }

  /* ── 알갱이 창고 (Particle Pool) ──────────────────────
   * 미리 만들어 두고 **꺼내 쓰고 되돌린다.** `alive` 가 false 인 것을 찾아 되살리는
   * 것이 전부라, 교전이 아무리 길어도 도형·재질은 처음 만든 그만큼만 산다.
   */
  var pool = [];          // [{node, alive, life, max, vx, vy, vz, spin, kind}]
  var group = null;       // 알갱이가 사는 자리 (world3d 의 fx 무리에 얹는다)
  var geoCache = {}, matCache = {};

  var KINDS = {
    /* 검기 — 얇고 길게 빠르게 흩어진다. 속공에 붙는다 */
    slash: { color: 0xcfe0ff, n: 5, life: 0.26, speed: 13, size: 1.5, flat: true, rise: 1.4, add: true },
    /* 불꽃 — 크고 느리게 솟는다. 필살에 붙는다 */
    /* 불꽃은 **더하지 않는다.** 밝은 지면 위에서 가산 혼합은 주황을 흰색으로
       날려 버린다 — 불처럼 안 보이고 그냥 흰 뭉치가 된다(눈으로 보고 알았다).
       가산은 검기·바람처럼 **얇은 빛줄기**에만 어울린다 */
    flame: { color: 0xff5f14, n: 14, life: 0.62, speed: 7.5, size: 1.1, flat: false, rise: 5.2, add: false },
    /* 흙먼지 — 낮게 퍼진다. 맞았을 때. **빛이 아니라 흙이라 더하지 않는다** */
    dust: { color: 0x7d7264, n: 8, life: 0.5, speed: 5, size: 0.9, flat: false, rise: 0.9, add: false },
    /* 바람 — 피했을 때 옆으로 스친다 */
    wind: { color: 0x9fd8f5, n: 6, life: 0.3, speed: 11, size: 1.2, flat: true, rise: 0.6, add: true },
    /* 경고 — 강타 예고. 상대 위로 천천히 떠오르는 붉은 빛(다른 넷과 안 겹치는 색) */
    warn: { color: 0xff3b3b, n: 3, life: 0.9, speed: 1.4, size: 2.1, flat: true, rise: 2.0, add: true },
    /* 금빛 — 스태거(적 기절)·회심의 일격. 다른 다섯과 안 겹치는 밝은 노랑,
       MH류의 "빈틈이 열렸다" 손맛은 색부터 달라야 눈에 확 든다 */
    gold: { color: 0xffe066, n: 10, life: 0.5, speed: 8, size: 1.4, flat: false, rise: 2.4, add: true }
  };

  function geo(T, flat) {
    var k = flat ? 'flat' : 'ball';
    if (!geoCache[k]) {
      geoCache[k] = flat ? new T.PlaneGeometry(1, 0.22) : new T.SphereGeometry(0.5, 6, 5);
    }
    return geoCache[k];
  }
  /**
   * 알갱이 재질. **빛인 것만 가산 혼합**한다 —
   * 검기·불꽃·바람은 빛이라 더해야 맞고, 흙먼지는 빛이 아니다.
   * 흙먼지까지 더하면 **밝은 지면 위에서 죄다 흰 뭉치**가 된다(눈으로 보고 알았다).
   */
  function mat(T, hex, add) {
    var key = hex + (add ? '+' : '-');
    if (!matCache[key]) {
      matCache[key] = new T.MeshBasicMaterial({
        color: new T.Color(hex), transparent: true, opacity: add ? 0.9 : 0.82,
        depthWrite: false,
        blending: add ? T.AdditiveBlending : T.NormalBlending
      });
    }
    return matCache[key];
  }

  function ensure() {
    var T = three();
    if (!T || group) { return !!group; }
    group = new T.Group();
    W3().addFx(group);
    return true;
  }

  /** 죽어 있는 알갱이 하나를 꺼낸다. 창고가 비면 **가장 오래된 것을 뺏는다** */
  function grab(T) {
    var i, oldest = null;
    for (i = 0; i < pool.length; i++) {
      if (!pool[i].alive) { return pool[i]; }
      if (!oldest || pool[i].life < oldest.life) { oldest = pool[i]; }
    }
    if (pool.length < POOL()) {
      var p = { node: null, alive: false, life: 0, max: 1, vx: 0, vy: 0, vz: 0, spin: 0 };
      p.node = new T.Mesh(geo(T, false), mat(T, 0xffffff, true));
      p.node.visible = false;
      group.add(p.node);
      pool.push(p);
      return p;
    }
    return oldest;                      // 창고가 다 찼다 — 제일 시든 것을 다시 쓴다
  }

  /**
   * 한 자리에서 알갱이를 터뜨린다.
   * @param x,z 지도 좌표(m)   @param kind slash·flame·dust·wind
   */
  function burst(x, z, kind, up) {
    if (!live() || !ensure()) { return 0; }
    var T = three();
    var K = KINDS[kind] || KINDS.dust;
    var i, n = 0;
    for (i = 0; i < K.n; i++) {
      var p = grab(T);
      if (!p) { break; }
      p.node.geometry = geo(T, K.flat);
      p.node.material = mat(T, K.color, K.add);
      p.node.visible = true;
      p.node.position.set(x, (up === undefined ? 1.6 : up), z);
      p.node.scale.setScalar(K.size * (0.6 + Math.random() * 0.8));
      p.node.rotation.set(Math.random() * 3, Math.random() * 6.3, Math.random() * 3);
      var a = Math.random() * Math.PI * 2;
      var s = K.speed * (0.55 + Math.random() * 0.9);
      p.vx = Math.cos(a) * s;
      p.vz = Math.sin(a) * s;
      p.vy = K.rise * (0.4 + Math.random());
      p.spin = (Math.random() - 0.5) * 12;
      p.max = K.life * (0.75 + Math.random() * 0.5);
      p.life = p.max;
      p.alive = true;
      n++;
    }
    return n;
  }

  /** 한 프레임 — `world3d.render` 가 부른다 */
  function tick(dt) {
    if (!pool.length) { return 0; }
    var i, n = 0;
    for (i = 0; i < pool.length; i++) {
      var p = pool[i];
      if (!p.alive) { continue; }
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; p.node.visible = false; continue; }
      var k = p.life / p.max;
      p.node.position.x += p.vx * dt;
      p.node.position.y += p.vy * dt;
      p.node.position.z += p.vz * dt;
      p.vy -= 9 * dt;                                  // 떨어진다
      p.vx *= Math.pow(0.12, dt); p.vz *= Math.pow(0.12, dt);
      p.node.rotation.z += p.spin * dt;
      p.node.scale.multiplyScalar(1 + dt * 0.6);
      /* 재질은 **여럿이 나눠 쓰므로** 여기서 opacity 를 건드리면 다 같이 흐려진다.
         알갱이마다 다르게 사그라들려면 크기로 줄인다 */
      if (k < 0.35) { p.node.scale.multiplyScalar(0.88); }
      n++;
    }
    return n;
  }

  /** 싸움이 벌어지는 자리 — 내가 선 자리에서 앞으로 몇 걸음 */
  function spot() {
    var pos = core.save.player.pos;
    return { x: pos.x, z: pos.y - 6 };
  }

  /* ── duel.js 가 내는 신호를 듣는다 ────────────────────
   * 저쪽은 우리가 있는지 모른다 — 신호만 던지고 제 일을 한다.
   */
  /** 있으면 재생하고, 없으면(도형 배우·아직 안 받은 GLB) 조용히 넘어간다 */
  function anim(w, who, name, ms) { if (w.playAnim) { w.playAnim(who, name, ms); } }

  function bind() {
    core.on('duel:open', function (o) {
      if (!live()) { return; }
      W3().battle(true);
      var s = spot();
      /* 무대 알갱이도 사건 성격을 따라간다(2026-09-06, "비전투 이벤트 3D
         무대 연출") — `discover`(비문·지도 조각·약초)는 사람 대신 금빛
         반짝임으로 "발견했다"를 알리고, `water`(여울)는 물보라에 가까운
         바람 알갱이를 쓴다. 그 외(사람을 만나는 사건·전투)는 옛 흙먼지 그대로 */
      var mood = o && o.mood;
      var moodKind = mood === 'discover' ? 'gold' : (mood === 'water' ? 'wind' : 'dust');
      burst(s.x, s.z, moodKind, mood === 'discover' ? 1.4 : 0.5);
      /* 밤 사건은 조명도 같이 죽인다(`eerie` 딱지, 늑대 무리·적군 정찰병) —
         `duel:close`가 늘 원래대로 되돌린다(아래) */
      if (W3().eventMood) { W3().eventMood(o && o.eerie ? 0.6 : 0); }
      /* 상대를 실제로 세운다(2026-08-30) — `event.js`·`fort.js` 가 미리 정해
         건네준 몸(`stage3d`)이 있을 때만. 카드만 뜨는 조우도 여전히 있다 —
         `discover`·`water`는 이제 사람 대신 발견한 것 자체(`kind:'prop'`)를
         세운다(`actor3d.js`) */
      if (o && o.stage3d && W3().duelStage) {
        W3().duelStage(o.stage3d.kind, o.stage3d.ref);
        /* 사람을 만나는 사건은 서 있는 동안 사건다운 몸짓을 한다(2026-09-06,
           "비전투 이벤트 3D 무대 연출") — 부상병은 웅크리고, 상인·부탁·
           아이 찾기는 반기는 손짓. 카드가 열려 있는 동안은 충분히 긴
           시간(20초)을 주고, 카드가 그보다 먼저 닫히면 `duel:close`가
           배우 자체를 지워 버리니 따로 끊어 줄 필요가 없다 */
        if (o.pose && o.stage3d.kind === 'hero') { anim(W3(), 'foe', o.pose, 20000); }
      }
    });

    core.on('duel:close', function () {
      var w = W3();
      if (w && w.battle) { w.battle(false); }
      if (w && w.duelUnstage) { w.duelUnstage(); }
      if (w && w.eventMood) { w.eventMood(0); }
    });

    core.on('duel:fx', function (o) {
      if (!live() || !o) { return; }
      var w = W3(), s = spot();
      var amp = SHAKE();
      /* 카메라·이펙트는 그대로 두고, **몸짓만 얹는다** — 세운 상대가 없으면
         `playAnim` 이 조용히 아무 일도 안 한다(상대가 카드뿐인 조우도 있다) */
      if (o.mine) {
        if (o.kind === 'quick') {
          w.shake(amp * 0.45); burst(s.x, s.z, 'slash', 1.7);
          anim(w, 'me', 'attack', 240); anim(w, 'foe', 'hit', 240);
          /* 동행도 같이 친다 — 실제 피해는 이미 partyPower() 합산에 들어 있으니
             (hero.js) 몸짓만 얹는다(2026-09-06, "등용한 인물은 같이 싸우는 거지") */
          anim(w, 'ally', 'attack', 240);
        } else if (o.kind === 'combo') {
          /* 연타 회심 — 속공보다 굵게, 필살보다는 얕게(2026-09-06, "전투를 더 잼나게") */
          w.shake(amp * 0.9); burst(s.x, s.z, 'slash', 2.1); burst(s.x, s.z, 'gold', 1.0);
          anim(w, 'me', 'attack', 300); anim(w, 'foe', 'hit', 300);
          anim(w, 'ally', 'attack', 300);
        } else if (o.kind === 'charge') {
          if (o.whiffed) {
            w.shake(amp * 0.3); burst(s.x, s.z, 'wind', 1.0);
            anim(w, 'me', 'attack', 260);
          } else {
            w.hold(90); w.shake(amp * 1.6); burst(s.x, s.z, 'flame', 1.2);
            anim(w, 'me', 'attack', 420); anim(w, 'foe', 'hit', 420);
          }
        } else if (o.kind === 'ranged') {
          /* 원거리 견제기(2026-09-06) — 사거리를 안 보므로 멀리서도 나간다.
             속공보다 가볍게(hit-stop 없음), 화살처럼 바람 알갱이로 표현 */
          w.shake(amp * 0.35); burst(s.x, s.z, 'wind', 1.4);
          anim(w, 'me', 'attack', 260); anim(w, 'foe', 'hit', 260);
        } else if (o.kind === 'stagger') {
          /* 적이 기절했다 — 타격이 아니라 상태 변화라 hold(hit-stop)는 안 준다 */
          w.shake(amp * 0.6); burst(s.x, s.z, 'gold', 1.8);
        } else if (o.kind === 'ult') {
          /* 필살에만 hit-stop 을 준다 — 아무 데나 넣으면 화면이 계속 걸린다 */
          w.hold(110); w.shake(amp * 1.9); burst(s.x, s.z, 'flame', 1.4);
          anim(w, 'me', 'attack', 460); anim(w, 'foe', 'hit', 460);
        } else if (o.kind === 'dodge') {
          w.shake(amp * 0.25); burst(s.x, s.z, 'wind', 1.2);
          anim(w, 'me', 'dodge', 380);
        }
      } else {
        if (o.kind === 'heavy') {
          /* 강타류 패턴마다 세기가 다르다(2026-09-06) — 돌진은 더 세게, 휩쓸기는
             더 약하게(대신 반경이 넓다). `move` 가 없으면(옛 신호) 그대로 1배 */
          var moveAmp = o.move === 'charge' ? 1.3 : (o.move === 'sweep' ? 0.85 : 1);
          if (o.dodged) {
            w.shake(amp * 0.5 * moveAmp); burst(s.x, s.z, 'wind', 1.3);
            anim(w, 'foe', 'attack', 420); anim(w, 'me', 'dodge', 380);
          } else {
            w.hold(70); w.shake(amp * 2.4 * moveAmp); burst(s.x, s.z, 'dust', moveAmp);
            anim(w, 'foe', 'attack', 420); anim(w, 'me', 'hit', 420);
          }
        } else if (o.kind === 'hit') {
          w.shake(amp * 0.8); burst(s.x, s.z, 'dust', 1.2);
          anim(w, 'foe', 'attack', 300); anim(w, 'me', 'hit', 300);
        } else if (o.kind === 'tell') {
          /* 도적전(rogue-action.js) 전용 — 강타 예고를 상대 위 붉은 빛으로도 알린다.
             카메라·hit-stop 은 안 건드린다(경고이지 타격이 아니다) */
          burst(s.x, s.z, 'warn', 2.4);
        }
      }
    });
  }
  bind();

  /** 눈으로 확인할 때 — 창고가 몇이고 몇이 살아 있나 */
  function stats() {
    var alive = 0, i;
    for (i = 0; i < pool.length; i++) { if (pool[i].alive) { alive++; } }
    return {
      on: on(), live: live(), pool: pool.length, cap: POOL(), alive: alive,
      battle: !!(W3() && W3().inBattle && W3().inBattle()),
      shake: W3() && W3().shakeAmp ? Math.round(W3().shakeAmp() * 100) / 100 : 0
    };
  }

  global.DG = global.DG || {};
  global.DG.battle3d = {
    KINDS: KINDS,
    on: on, burst: burst, tick: tick, spot: spot, stats: stats,
    /** 창고를 비운다 (진단이 제 뒤를 치울 때) */
    reset: function () {
      for (var i = 0; i < pool.length; i++) { pool[i].alive = false; pool[i].node.visible = false; }
      return pool.length;
    },
    get pool() { return pool; }
  };
})(window);
