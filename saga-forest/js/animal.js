/**
 * 짐승의 거동 — 어슬렁거리다 다가가면 달아난다 (PLAN 40절 PHASE 4 첫 칸)
 * ---------------------------------------------------------------
 * 터(home)는 village.js 의 buildAnimals() 가 정한다 — 여기서는 그 둘레를
 * 어떻게 오가는지만 맡는다. PLAN 16절이 적은 다섯 상태(IDLE→WANDER→STOP→
 * EAT→RUN_AWAY)를 그대로 다 나누지는 않았다 — STOP·EAT 은 화면에 성격을
 * 주는 정지 동작이라 `pause` 하나로 뭉쳤고(상태 이름만 idle/eat 로 번갈아
 * 붙여 애니메이션 힌트를 준다), 나머지 셋(IDLE·WANDER·RUN_AWAY)만 실제로
 * 자리를 바꾼다.
 *
 * **공용 Math.random·core.hash2 흐름을 프레임마다 쓰지 않는다.** folk.js
 * 와 같은 이유 — 헤드리스 자가진단은 프레임 수가 실행마다 달라서, 그
 * 흐름을 여기서 먹으면 씨앗을 고정해도 매번 다른 수가 나온다. 그래서
 * 짐승 전용 흐름을 따로 두고, 마을 seed 로만 다시 감는다(하루마다 다시
 * 감을 필요는 없다 — 짐승은 날짜를 모른다).
 */
(function (global) {
  'use strict';

  function V() { return global.DG.village; }
  function VD() { return global.DG.villageData; }

  var PAUSE_MIN = 1.6, PAUSE_VAR = 2.6;

  var rs = 20260901 >>> 0;
  function rnd() {
    rs = (rs + 0x6D2B79F5) >>> 0;
    var t = rs;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  var seeded = false;
  function reseed() {
    var s = V().state();
    rs = ((s.seed || 1) ^ 0x9e3779b9) >>> 0;
    seeded = true;
  }

  function defOf(kind) { var VD_ = VD(); return VD_ && VD_.ANIMALS ? VD_.ANIMALS[kind] : null; }

  function update(dt) {
    if (!seeded) { reseed(); }
    var Vv = V();
    var raw = Vv.raw(), list = raw.animals || [], i;

    for (i = 0; i < list.length; i++) {
      var a = list[i], d = defOf(a.kind);
      if (!d) { continue; }

      var pdx = raw.player.x - a.x, pdy = raw.player.y - a.y;
      var pd = Math.hypot(pdx, pdy);

      /* RUN_AWAY — 사람이 가까우면 무조건 이것부터. 제 터를 크게 벗어나지는
         않는다(터 중심에서 wander 의 1.4배까지만) */
      if (pd < d.flee) {
        a.state = 'flee';
        a.aim = null;
        var away = Math.atan2(a.y - raw.player.y, a.x - raw.player.x);
        var tx = a.home.x + Math.cos(away) * d.wander * 1.4;
        var ty = a.home.y + Math.sin(away) * d.wander * 1.4;
        var dx0 = tx - a.x, dy0 = ty - a.y, d0 = Math.hypot(dx0, dy0);
        if (d0 > 1) {
          var step0 = Math.min(d.fleeSpeed * dt, d0);
          var nx = a.x + (dx0 / d0) * step0, ny = a.y + (dy0 / d0) * step0;
          if (Vv.walkable(nx, ny)) { a.x = nx; a.y = ny; a.facing = dx0 >= 0 ? 1 : -1; }
        }
        continue;
      }
      if (a.state === 'flee') { a.aim = null; a.pause = PAUSE_MIN; a.state = 'idle'; }

      /* IDLE(+STOP/EAT 겸용) / WANDER — folk.js 의 어슬렁과 같은 요령,
         제 터(home) 둘레만 돈다 */
      if (!a.aim) {
        a.pause -= dt;
        if (a.pause > 0) { a.state = (a.pause > PAUSE_VAR * 0.5) ? 'idle' : 'eat'; continue; }
        a.pause = PAUSE_MIN + rnd() * PAUSE_VAR;
        var ang = rnd() * Math.PI * 2, rr = rnd() * d.wander;
        var wx = a.home.x + Math.cos(ang) * rr, wy = a.home.y + Math.sin(ang) * rr;
        if (Vv.walkable(wx, wy)) { a.aim = { x: wx, y: wy }; a.state = 'wander'; }
        continue;
      }
      var ddx = a.aim.x - a.x, ddy = a.aim.y - a.y, dd = Math.hypot(ddx, ddy);
      if (dd < 3) { a.aim = null; continue; }
      var step = Math.min(d.speed * dt, dd);
      var mx = a.x + (ddx / dd) * step, my = a.y + (ddy / dd) * step;
      if (Vv.walkable(mx, my)) {
        a.x = mx; a.y = my;
        if (Math.abs(ddx) > 1) { a.facing = ddx > 0 ? 1 : -1; }
      } else {
        a.aim = null;
      }
    }
  }

  global.DG = global.DG || {};
  global.DG.animal = {
    update: update,
    /** 진단 전용 — 다음 update() 가 seed 를 다시 읽게 한다 */
    _reseed: function () { seeded = false; }
  };
})(typeof window !== 'undefined' ? window : this);
