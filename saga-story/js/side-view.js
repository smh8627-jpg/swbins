/**
 * 사냥터 화면 — 옆에서 보는 2D
 * ---------------------------------------------------------------
 * 여기서는 **계산하지 않는다**. side.js 의 상태를 읽어 그리기만 한다.
 * 사람·짐승은 sprite.js 를 그대로 쓴다 (발 위치를 기준으로 붙는 스탬프라
 * 사이드스크롤에서도 그대로 맞는다).
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var S = null, SD = null;

  var cv = null, ctx = null;
  var W = 0, H = 0, dpr = 1;
  var camX = 0;

  function init(canvas) {
    S = global.DG.side;
    SD = global.DG.sideData;
    cv = canvas;
    ctx = cv.getContext('2d');
    resize();
    global.addEventListener('resize', resize);
    /* 화면 아래쪽 절반을 누르면 그 방향으로 달린다 (손가락 조작) */
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
  }

  function resize() {
    dpr = Math.min(global.devicePixelRatio || 1, 2);
    W = global.innerWidth; H = global.innerHeight;
    cv.width = Math.floor(W * dpr);
    cv.height = Math.floor(H * dpr);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function onDown(e) {
    if (!S.active()) { return; }
    var r = cv.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    /* 위쪽 절반 — 줄이나 문 앞이면 **오르기·들어가기**, 아니면 점프.
       손가락에는 ↑ 키가 없으니 그 자리를 대신 읽어 준다. */
    if (y < H * 0.45) {
      var s = S.status();
      if (s.climbing || s.rope || s.gate) { S.setInput('up', true); }
      else { S.setInput('jump', true); }
      return;
    }
    if (x < W * 0.5) { S.setInput('left', true); } else { S.setInput('right', true); }
  }

  function onUp() {
    S.setInput('left', false);
    S.setInput('right', false);
    S.setInput('up', false);
    S.setInput('down', false);
  }

  /* ── 그리기 ───────────────────────────────────────────── */

  function draw() {
    if (!ctx) { return; }
    var run = S.raw();
    if (!run) { ctx.clearRect(0, 0, W, H); return; }
    var stg = run.stage, p = run.player;

    camX = core.clamp(p.x + S.P_W / 2 - W / 2, 0, Math.max(0, stg.width - W));

    /* 하늘 */
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, stg.sky[0]);
    g.addColorStop(1, stg.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* 먼 산 — 카메라보다 느리게 흘러 깊이가 생긴다 */
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    var far = -camX * 0.35;
    for (var m = 0; m < 8; m++) {
      var mx = far + m * 460;
      ctx.beginPath();
      ctx.moveTo(mx, stg.floor);
      ctx.quadraticCurveTo(mx + 230, stg.floor - 250, mx + 460, stg.floor);
      ctx.closePath();
      ctx.fill();
    }

    /* 바닥 */
    ctx.fillStyle = stg.ground;
    ctx.fillRect(0, stg.floor, W, H - stg.floor);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(0, stg.floor, W, 3);

    /* 발판 */
    for (var i = 0; i < stg.plats.length; i++) {
      var pl = stg.plats[i];
      var x = pl[0] - camX;
      if (x + pl[2] < -40 || x > W + 40) { continue; }
      ctx.fillStyle = stg.ground;
      ctx.fillRect(x, pl[1], pl[2], 14);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(x, pl[1], pl[2], 3);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x, pl[1] + 14, pl[2], 5);
    }

    drawRopes(stg);
    drawPortals(stg);

    /* 떨어진 것 */
    for (i = 0; i < run.drops.length; i++) {
      var d = run.drops[i];
      var def = SD.DROPS[d.kind];
      ctx.font = '18px "Segoe UI Emoji", system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(def.emoji, d.x - camX, d.y);
    }

    /* 적 */
    for (i = 0; i < run.enemies.length; i++) { drawEnemy(run.enemies[i]); }

    /* 날아오는 화살·탄환 — 이쪽 기탄과 색을 갈라 둔다(붉은 계열) */
    for (i = 0; i < (run.eshots || []).length; i++) {
      var es = run.eshots[i];
      var ex = es.x - camX;
      if (es.kind === 'staff') {
        ctx.beginPath();
        ctx.arc(ex, es.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,190,120,0.95)';
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(240,210,170,0.95)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(ex - es.dir * 11, es.y);
        ctx.lineTo(ex + es.dir * 5, es.y);
        ctx.stroke();
        ctx.fillStyle = '#e0705a';
        ctx.beginPath();
        ctx.moveTo(ex + es.dir * 9, es.y);
        ctx.lineTo(ex + es.dir * 3, es.y - 3.5);
        ctx.lineTo(ex + es.dir * 3, es.y + 3.5);
        ctx.closePath();
        ctx.fill();
      }
    }

    /* 기탄 */
    for (i = 0; i < run.shots.length; i++) {
      var sh = run.shots[i];
      ctx.beginPath();
      ctx.arc(sh.x - camX, sh.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(150,210,255,0.9)';
      ctx.fill();
    }

    drawMe(p);
    drawFx();
    drawBossBar();
    drawMiniMap(run);
  }

  /**
   * 미니맵 — 원작에서 왼쪽 위에 늘 떠 있던 그 작은 지도다.
   * 사냥터 전체를 한 칸에 줄여 담아 **어디로 가야 문·보스가 있는지**를 보여 준다.
   */
  /** 미니맵의 자리·축척 — **그리기와 떼어 둔다.** 값을 내는 층이라 진단이 붙는다 */
  function miniBox(stg) {
    var w = Math.min(210, W - 24), h = 58;
    var top = 240, bot = stg.floor + 30;          // 세로로 담을 구간
    return { x: 12, y: Math.min(96, H * 0.16), w: w, h: h,
             sx: w / stg.width, sy: h / (bot - top), top: top };
  }

  function drawMiniMap(run) {
    var stg = run.stage;
    var b = miniBox(stg);
    var w = b.w, h = b.h, x = b.x, y = b.y, sx = b.sx, sy = b.sy;
    function mx(vx) { return x + vx * sx; }
    function my(vy) { return y + (vy - b.top) * sy; }

    ctx.fillStyle = 'rgba(10,12,16,0.62)';
    ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 5, y - 5, w + 10, h + 10);

    /* 바닥과 발판 */
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(x, my(stg.floor), w, 1.5);
    var i;
    for (i = 0; i < stg.plats.length; i++) {
      var pl = stg.plats[i];
      ctx.fillRect(mx(pl[0]), my(pl[1]), pl[2] * sx, 1.5);
    }
    /* 줄 */
    ctx.strokeStyle = 'rgba(205,175,120,0.5)';
    for (i = 0; i < (stg.ropes || []).length; i++) {
      var r = stg.ropes[i];
      ctx.beginPath();
      ctx.moveTo(mx(r[0]), my(r[1]));
      ctx.lineTo(mx(r[0]), my(r[2]));
      ctx.stroke();
    }
    /* 문 */
    for (i = 0; i < (stg.portals || []).length; i++) {
      var g = stg.portals[i];
      ctx.fillStyle = S.unlocked(g[1]) ? 'rgba(150,215,255,0.95)' : 'rgba(160,160,170,0.7)';
      ctx.fillRect(mx(g[0]) - 2, my(stg.floor) - 7, 4, 7);
    }
    /* 적 · 보스 · 나 */
    for (i = 0; i < run.enemies.length; i++) {
      var e = run.enemies[i];
      ctx.fillStyle = e.boss ? '#ff7a4a' : 'rgba(224,101,101,0.9)';
      var d = e.boss ? 4 : 2;
      ctx.fillRect(mx(e.x + e.w / 2) - d / 2, my(e.y + e.h) - d, d, d);
    }
    ctx.fillStyle = '#f5d76e';
    ctx.fillRect(mx(run.player.x + S.P_W / 2) - 2, my(run.player.y + S.P_H) - 4, 4, 4);

    ctx.font = '600 9.5px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(240,226,200,0.8)';
    ctx.fillText(stg.name, x, y - 8);
  }

  /** 밧줄·사다리 — 발판 뒤에 걸린다. 사다리는 가로대가 있고 밧줄은 한 가닥이다 */
  function drawRopes(stg) {
    var list = stg.ropes || [];
    for (var i = 0; i < list.length; i++) {
      var r = list[i], x = r[0] - camX;
      if (x < -30 || x > W + 30) { continue; }
      var top = r[1], bot = r[2], ladder = r[3] === 'ladder';
      if (ladder) {
        ctx.strokeStyle = 'rgba(190,160,110,0.85)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 9, top); ctx.lineTo(x - 9, bot);
        ctx.moveTo(x + 9, top); ctx.lineTo(x + 9, bot);
        ctx.stroke();
        ctx.lineWidth = 2.5;
        for (var y = top + 12; y < bot; y += 22) {
          ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y); ctx.stroke();
        }
      } else {
        ctx.strokeStyle = 'rgba(205,175,120,0.85)';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bot); ctx.stroke();
        /* 매듭 — 밧줄로 보이게 */
        ctx.fillStyle = 'rgba(160,130,85,0.9)';
        for (var k = top + 16; k < bot; k += 26) { ctx.fillRect(x - 3, k, 6, 3); }
      }
      /* 위쪽 고리 */
      ctx.fillStyle = 'rgba(120,95,60,0.9)';
      ctx.fillRect(x - 12, top - 4, 24, 5);
    }
  }

  /** 문(포탈) — 원작처럼 **↑ 를 누르면** 다음 맵으로 넘어간다. 그 자리를 빛으로 알린다 */
  function drawPortals(stg) {
    var list = stg.portals || [];
    var t = Date.now() / 1000;
    for (var i = 0; i < list.length; i++) {
      var g = list[i], x = g[0] - camX, base = stg.floor;
      if (x < -80 || x > W + 80) { continue; }
      var to = SD.stage(g[1]);
      var open = S.unlocked(g[1]);
      var pulse = 0.55 + Math.sin(t * 2.4 + i) * 0.2;
      var grad = ctx.createLinearGradient(x, base - 96, x, base);
      grad.addColorStop(0, 'rgba(150,215,255,0)');
      grad.addColorStop(1, open ? 'rgba(150,215,255,' + pulse + ')' : 'rgba(150,150,160,0.28)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(x, base - 44, 30, 52, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = open ? '#dff0ff' : 'rgba(220,220,230,0.6)';
      ctx.fillText((open ? '↑ ' : '🔒 ') + to.name, x, base - 104);
      if (!open) {
        ctx.fillStyle = 'rgba(220,220,230,0.5)';
        ctx.fillText('Lv.' + to.need, x, base - 90);
      }
      ctx.textAlign = 'left';
    }
  }

  /**
   * 보스 체력 — 화면 위에 굵게 하나. 원작에서 보스 방에 들어서면
   * 위쪽에 이름과 체력이 뜨는 그 자리다.
   */
  function drawBossBar() {
    var run = S.raw();
    if (!run || !run.boss) { return; }
    var b = run.boss;
    var w = Math.min(W - 40, 420), x = (W - w) / 2, y = 14;
    var r = Math.max(0, b.hp / b.hpMax);
    ctx.fillStyle = 'rgba(10,12,16,0.72)';
    ctx.fillRect(x - 6, y - 4, w + 12, 26);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x, y + 10, w, 8);
    ctx.fillStyle = b.charge > 0 ? '#ffb14a' : '#e06565';
    ctx.fillRect(x, y + 10, w * r, 8);
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0e2c8';
    ctx.fillText('👺 ' + b.ref.name + (b.charge > 0 ? ' — 달려든다!' : ''), W / 2, y + 6);
    ctx.textAlign = 'left';
  }

  function drawEnemy(e) {
    var x = e.x + e.w / 2 - camX, y = e.y + e.h;
    if (x < -60 || x > W + 60) { return; }
    var human = e.ref.kind === 'human';
    global.DG.sprite.stamp(ctx, {
      kind: human ? 'human' : 'beast', ref: e.ref, x: x, y: y, s: e.boss ? 1.9 : 0.8,
      facing: e.dir, phase: e.phase, walking: true,
      color: e.ref.color, look: e.ref.look || {},
      form: e.ref.form, rarity: e.boss ? 5 : 2, t: Date.now()
    });
    if (e.boss) {
      /* 발밑 고리 — 몸집만으로는 잡졸과 잘 안 갈린다. 달려드는 동안은 붉게 탄다 */
      var charging = e.charge > 0;
      ctx.globalAlpha = charging ? 0.55 : 0.3;
      ctx.fillStyle = charging ? '#ff7a4a' : '#c94a4a';
      ctx.beginPath();
      ctx.ellipse(x, y, charging ? 40 : 32, charging ? 11 : 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (e.hurt > 0) {                       // 맞은 순간 하얗게 번쩍
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - 18, y - 40, 36, 40);
      ctx.globalAlpha = 1;
    }
    /* 남은 체력 — 보스는 화면 위의 큰 바가 대신한다 */
    if (e.boss) { return; }
    var w = 32, r = Math.max(0, e.hp / e.hpMax);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - w / 2, y - 52, w, 4);
    ctx.fillStyle = r > 0.5 ? '#7ec96a' : (r > 0.22 ? '#e8c15a' : '#e06565');
    ctx.fillRect(x - w / 2, y - 52, w * r, 4);
  }

  function drawMe(p) {
    var ref = S.meRef();
    var x = p.x + S.P_W / 2 - camX, y = p.y + S.P_H;
    global.DG.sprite.stamp(ctx, {
      kind: 'human', ref: ref, x: x, y: y, s: 1.05,
      facing: p.facing, phase: p.phase, walking: !!p.vx && p.onGround,
      color: global.DG.data.faction(ref.faction).color,
      look: global.DG.sprite.lookOf(ref),
      rarity: ref.rarity, t: Date.now()
    });
    if (p.hurt > 0) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#e06565';
      ctx.fillRect(x - 20, y - 56, 40, 56);
      ctx.globalAlpha = 1;
    }
    if (p.resting > 0.4) {                  // 앉아 쉬는 중 — 원작의 그 표시
      ctx.font = '15px "Segoe UI Emoji", system-ui';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(200,230,255,' + (0.55 + Math.sin(Date.now() / 300) * 0.3) + ')';
      ctx.fillText('💤', x + 18, y - 56);
    }
  }

  function drawFx() {
    var list = S.fx(), i;
    for (i = 0; i < list.length; i++) {
      var f = list[i];
      var x = f.x - camX;
      if (f.t === 'hit') {
        ctx.font = '700 15px "Malgun Gothic", system-ui';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,235,150,' + Math.min(1, f.life * 2) + ')';
        ctx.fillText(f.v, x, f.y - (0.6 - f.life) * 40);
      } else if (f.t === 'slash') {
        ctx.fillStyle = 'rgba(255,255,255,' + (f.life * 3) + ')';
        ctx.fillRect(x, f.y, f.w, f.h);
      } else if (f.t === 'ring') {
        ctx.beginPath();
        ctx.arc(x, f.y, f.r * (1.2 - f.life), 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(245,180,69,' + Math.min(1, f.life * 3) + ')';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (f.t === 'pop') {
        ctx.beginPath();
        ctx.arc(x, f.y, 20 * (0.5 - f.life) * 2 + 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,' + f.life + ')';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (f.t === 'dash') {
        /* 밀고 나간 자리 — 잔상 한 줄 */
        var gd = ctx.createLinearGradient(x, 0, x + f.w, 0);
        gd.addColorStop(0, 'rgba(255,255,255,0)');
        gd.addColorStop(0.5, 'rgba(255,255,255,' + Math.min(0.5, f.life * 2) + ')');
        gd.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gd;
        ctx.fillRect(x, f.y, f.w, f.h);
      } else if (f.t === 'rain') {
        ctx.fillStyle = 'rgba(150,200,255,' + Math.min(0.22, f.life * 0.5) + ')';
        ctx.fillRect(x, f.y, f.w, f.h);
        ctx.strokeStyle = 'rgba(220,235,255,' + Math.min(0.9, f.life * 1.8) + ')';
        ctx.lineWidth = 2;
        for (var q = 0; q < 9; q++) {
          var qx = x + (q + 0.5) * (f.w / 9);
          var qy = f.y + ((0.5 - f.life) * 2 + q * 0.07) * f.h;
          ctx.beginPath();
          ctx.moveTo(qx, qy);
          ctx.lineTo(qx - 5, qy - 22);
          ctx.stroke();
        }
      } else if (f.t === 'aim') {
        /* 쏘기 직전 — 원작에서도 사격 몹은 한 박자 티를 낸다 */
        ctx.font = '13px "Segoe UI Emoji", system-ui';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,150,110,' + Math.min(1, f.life * 4) + ')';
        ctx.fillText('❗', x, f.y - 12);
      } else if (f.t === 'heal') {
        ctx.font = '20px "Segoe UI Emoji", system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('🧪', x, f.y - (0.5 - f.life) * 40);
      }
    }
  }

  global.DG = global.DG || {};
  global.DG.sideView = {
    init: init, draw: draw, resize: resize, miniBox: miniBox,
    _cam: function () { return camX; }
  };
})(window);
