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
    cv.addEventListener('pointermove', onMove);
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

  /**
   * 화면을 넷으로 나눠 읽는다 — **폰에는 방향키도 Space 도 없다.**
   *
   *      ┌─────────────────────┐
   *      │   위 45%  ↑ / 점프   │   줄·문 앞이면 오르기·들어가기, 아니면 점프
   *      ├──────┬───────┬──────┤
   *      │  ←   │   ↓   │  →   │   가운데 22% 가 ↓ 다
   *      └──────┴───────┴──────┘
   *
   * **↓ 자리를 뒤늦게 냈다.** 그전에는 아래쪽이 좌우뿐이라 폰에서 **줄을 타고 내려갈
   * 수도, 앉아 쉴 수도, 발판을 빠져나갈 수도 없었다** — 규칙은 다 있는데 손이 닿지
   * 않는 자리였다. 가운데를 좁게(22%) 잡은 것은 걷다가 잘못 눌리지 않게 하려는 것이다.
   */
  function readZone(e) {
    var r = cv.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    if (y < H * 0.45) { return 'up'; }
    if (x > W * 0.39 && x < W * 0.61) { return 'down'; }
    return x < W * 0.5 ? 'left' : 'right';
  }

  var zone = null;

  function apply(z) {
    /* 누르고 있는 자리 하나만 켜 둔다 — 끌어서 옮기면 앞의 것이 꺼진다 */
    S.setInput('left', z === 'left');
    S.setInput('right', z === 'right');
    S.setInput('down', z === 'down');
    if (z === 'up') {
      var s = S.status();
      /* 줄·문 앞이면 오르기·들어가기, 아니면 점프. 점프는 누르는 순간 한 번이다 */
      if (s.climbing || s.rope || s.gate) { S.setInput('up', true); }
      else { S.setInput('jump', true); }
    } else {
      S.setInput('up', false);
    }
  }

  function onDown(e) {
    if (!S.active()) { return; }
    zone = readZone(e);
    apply(zone);
    /* 손가락이 HUD 위를 지나도 안 끊긴다 (사가의숲에서 같은 자리를 밟았다) */
    if (cv.setPointerCapture && e.pointerId !== undefined) {
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
    }
  }

  /** 누른 채 끌면 그쪽으로 — 손가락을 떼지 않고 방향을 바꾼다 */
  function onMove(e) {
    if (!S.active() || zone === null) { return; }
    var z = readZone(e);
    if (z === zone) { return; }
    /* 끌어서 위로 올라가는 것은 점프로 읽지 않는다 — 걷다가 뛰어 버린다 */
    if (z === 'up' && zone !== 'up') {
      var s = S.status();
      if (!(s.climbing || s.rope || s.gate)) { return; }
    }
    zone = z;
    apply(zone);
  }

  function onUp() {
    zone = null;
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

    /* 화면 흔들림 — **화면 층에만 있다.** side.js 는 'shake' 한 줄을 남길 뿐이고
       세기도 위상도 여기서 정한다. 그래서 흔들림을 꺼도 판정은 한 자도 안 바뀐다.
       (사가고의 duel.js 가 판정 층과 화면 층을 가른 것과 같은 자리다) */
    var sh2 = shakeOf(S.fx()), sx = 0, sy = 0;
    if (sh2 > 0.2) {
      var ph = Date.now() / 18;
      sx = Math.sin(ph) * sh2;
      sy = Math.cos(ph * 1.7) * sh2 * 0.6;
    }
    ctx.save();
    ctx.translate(Math.round(sx), Math.round(sy));

    /* 하늘 */
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, stg.sky[0]);
    g.addColorStop(1, stg.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    drawBackdrop(stg);

    /* 바닥 */
    ctx.fillStyle = stg.ground;
    ctx.fillRect(0, stg.floor, W, H - stg.floor);
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.fillRect(0, stg.floor, W, 5);
    ctx.fillStyle = 'rgba(40,32,24,0.35)';
    ctx.fillRect(0, stg.floor + 5, W, 2);

    /* 발판 */
    for (var i = 0; i < stg.plats.length; i++) {
      var pl = stg.plats[i];
      var x = pl[0] - camX;
      if (x + pl[2] < -40 || x > W + 40) { continue; }
      /* 원작의 발판 — 위에 잔디(밝은 띠) · 아래에 흙, 그리고 진한 테 한 줄 */
      ctx.fillStyle = stg.ground;
      ctx.fillRect(x, pl[1], pl[2], 16);
      ctx.fillStyle = 'rgba(255,255,255,0.34)';
      ctx.fillRect(x, pl[1], pl[2], 4);
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      ctx.fillRect(x, pl[1] + 16, pl[2], 6);
      ctx.strokeStyle = 'rgba(40,32,24,0.55)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, pl[1] + 0.5, pl[2] - 1, 16);
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
    ctx.restore();

    /* 흔들리지 않는 것 — 조작에 쓰는 것은 흔들리면 안 읽힌다 */
    drawBossBar();
    drawMiniMap(run);
    drawOuch();
  }

  /** 지금 얼마나 흔들려야 하나 — fx 의 남은 목숨에서 곧바로 낸다(따로 상태를 안 둔다) */
  function shakeOf(list) {
    var amp = 0, i;
    for (i = 0; i < list.length; i++) {
      var f = list[i];
      if (f.t !== 'shake') { continue; }
      var span = f.big ? 0.22 : 0.18;
      amp = Math.max(amp, (f.big ? 8 : 3.6) * Math.min(1, Math.max(0, f.life / span)));
    }
    return amp;
  }

  /** 맞았을 때 화면 가장자리가 붉어진다 — 체력 막대를 안 봐도 안다 */
  function drawOuch() {
    var list = S.fx(), a = 0, i;
    for (i = 0; i < list.length; i++) {
      if (list[i].t === 'ouch') { a = Math.max(a, Math.min(1, list[i].life / 0.45)); }
    }
    if (a <= 0.02) { return; }
    var g2 = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28,
                                      W / 2, H / 2, Math.max(W, H) * 0.62);
    g2.addColorStop(0, 'rgba(200,40,40,0)');
    g2.addColorStop(1, 'rgba(200,40,40,' + (a * 0.42) + ')');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
  }

  /**
   * 뒷배경 — 원작의 그림 문법을 옮긴 것이다. 에셋은 가져오지 않고 **도형만** 쓴다.
   *   하늘 맵  둥근 언덕 두 겹 + 흰 구름          (원작 초반 들판)
   *   숲 맵    둥근 나무 두 겹                     (원작 숲)
   *   굴 맵    바위 이빨과 종유석                   (원작 동굴)
   * 겹마다 카메라보다 느리게 흘러 깊이가 난다.
   */
  function drawBackdrop(stg) {
    var mood = stg.mood || 'sky';
    var floor = stg.floor, m, mx;

    if (mood === 'cave') {
      /* 위에서 내려온 종유석 · 아래 바위 */
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      var f0 = -camX * 0.3;
      for (m = 0; m < 14; m++) {
        mx = f0 + m * 260;
        ctx.beginPath();
        ctx.moveTo(mx, 0); ctx.lineTo(mx + 60, 0); ctx.lineTo(mx + 30, 150 + (m % 3) * 50);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      var f1 = -camX * 0.5;
      for (m = 0; m < 12; m++) {
        mx = f1 + m * 330;
        ctx.beginPath();
        ctx.moveTo(mx, floor);
        ctx.quadraticCurveTo(mx + 80, floor - 130, mx + 165, floor);
        ctx.closePath(); ctx.fill();
      }
      return;
    }

    if (mood === 'fire') {
      /* 불타는 골짜기(호로곡) — 겹 셋. 뒤로 갈수록 어둡고 크다.
         **에셋은 없다** — 도형과 그러데이션만 쓴다(다른 맵과 같은 규칙).
         불길은 시각으로 흔들리지만 **판정에는 닿지 않는다**(그리기 층에만 있다). */
      var t2 = Date.now() / 620;

      /* ① 멀리 선 검은 산줄기 */
      ctx.fillStyle = 'rgba(24,10,8,0.55)';
      var gf0 = -camX * 0.22;
      for (m = 0; m < 16; m++) {
        mx = gf0 + m * 420;
        ctx.beginPath();
        ctx.moveTo(mx, floor);
        ctx.lineTo(mx + 130, floor - 230 - (m % 3) * 60);
        ctx.lineTo(mx + 270, floor);
        ctx.closePath(); ctx.fill();
      }

      /* ② 골짜기 벽 — 앞쪽 한 겹이 더 진하다 */
      ctx.fillStyle = 'rgba(40,16,10,0.62)';
      var gf1 = -camX * 0.46;
      for (m = 0; m < 14; m++) {
        mx = gf1 + m * 310;
        ctx.beginPath();
        ctx.moveTo(mx, floor);
        ctx.lineTo(mx + 74, floor - 150 - (m % 4) * 44);
        ctx.lineTo(mx + 158, floor);
        ctx.closePath(); ctx.fill();
      }

      /* ③ 바닥에서 오르는 불길 — 두 갈래로 흔들린다 */
      var gf2 = -camX * 0.72;
      for (m = 0; m < 22; m++) {
        mx = gf2 + m * 190;
        if (mx < -80 || mx > W + 80) { continue; }
        var sway = Math.sin(t2 + m) * 14;
        var tall = 150 + (m % 3) * 60 + Math.sin(t2 * 1.7 + m * 2) * 22;
        var fg = ctx.createLinearGradient(0, floor, 0, floor - tall);
        fg.addColorStop(0, 'rgba(255,196,86,0.85)');
        fg.addColorStop(0.35, 'rgba(240,120,40,0.55)');
        fg.addColorStop(0.75, 'rgba(200,52,24,0.22)');
        fg.addColorStop(1, 'rgba(180,40,20,0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(mx - 34, floor);
        ctx.quadraticCurveTo(mx + sway, floor - tall, mx + 34, floor);
        ctx.closePath(); ctx.fill();
      }

      /* ④ 떠오르는 불티 — 자리는 해시라 늘 같고, 오르는 것만 시각을 탄다 */
      ctx.fillStyle = 'rgba(255,190,110,0.75)';
      for (m = 0; m < 26; m++) {
        var ex2 = -camX * 0.9 + m * 168;
        if (ex2 < -20 || ex2 > W + 20) { continue; }
        var rise2 = (t2 * 26 + m * 37) % 400;
        ctx.globalAlpha = Math.max(0, 0.85 - rise2 / 400);
        ctx.fillRect(ex2 + Math.sin(t2 * 2 + m) * 16, floor - 40 - rise2, 4, 4);
      }
      ctx.globalAlpha = 1;
      return;
    }

    if (mood === 'forest') {
      /* 둥근 나무 두 겹 — 뒤엣것이 크고 흐리다 */
      var layers = [{ p: 0.28, s: 1.35, a: 0.18, step: 300 },
                    { p: 0.52, s: 1.0, a: 0.26, step: 210 }];
      for (var L = 0; L < layers.length; L++) {
        var lay = layers[L];
        ctx.fillStyle = 'rgba(20,60,30,' + lay.a + ')';
        var fx0 = -camX * lay.p;
        for (m = 0; m < 20; m++) {
          mx = fx0 + m * lay.step;
          var th = 150 * lay.s, tw = 62 * lay.s;
          ctx.fillRect(mx - 7 * lay.s, floor - th * 0.45, 14 * lay.s, th * 0.45);
          ctx.beginPath();
          ctx.ellipse(mx, floor - th * 0.55, tw, tw * 0.82, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return;
    }

    /* 하늘 맵 — 둥근 언덕 두 겹 + 구름 */
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    var cf = -camX * 0.14;
    for (m = 0; m < 12; m++) {
      mx = cf + m * 380 + (m % 3) * 60;
      var cy = 70 + (m % 4) * 46;
      ctx.beginPath();
      ctx.ellipse(mx, cy, 46, 20, 0, 0, Math.PI * 2);
      ctx.ellipse(mx + 38, cy + 6, 32, 15, 0, 0, Math.PI * 2);
      ctx.ellipse(mx - 34, cy + 8, 26, 13, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    var hills = [{ p: 0.24, h: 210, a: 'rgba(120,180,120,0.45)', step: 520 },
                 { p: 0.44, h: 150, a: 'rgba(90,155,95,0.55)', step: 380 }];
    for (var k = 0; k < hills.length; k++) {
      var hl = hills[k];
      ctx.fillStyle = hl.a;
      var hf = -camX * hl.p;
      for (m = 0; m < 16; m++) {
        mx = hf + m * hl.step;
        ctx.beginPath();
        ctx.moveTo(mx, floor);
        ctx.quadraticCurveTo(mx + hl.step * 0.5, floor - hl.h, mx + hl.step, floor);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  /** 미니맵의 자리·축척 — **그리기와 떼어 둔다.** 값을 내는 층이라 진단이 붙는다 */
  function miniBox(stg) {
    var w = Math.min(210, W - 24), h = 58;
    var top = 240, bot = stg.floor + 30;          // 세로로 담을 구간
    /* 상단 띠(프로필·지갑) 아래로 내려 앉힌다 — 겹치면 둘 다 못 읽는다.
       **좁은 폭에서는 그 띠가 두 줄로 접히므로** 더 내려야 한다(폰에서 지갑에 겹쳤다) */
    var y = W <= 560 ? 196 : Math.min(148, H * 0.26);
    return { x: 12, y: y, w: w, h: h,
             sx: w / stg.width, sy: h / (bot - top), top: top };
  }

  /**
   * 미니맵 — 원작에서 왼쪽 위에 늘 떠 있던 그 작은 지도다.
   * 사냥터 전체를 한 칸에 줄여 담아 **어디로 가야 문·보스가 있는지**를 보여 준다.
   */
  function drawMiniMap(run) {
    var stg = run.stage;
    var b = miniBox(stg);
    var w = b.w, h = b.h, x = b.x, y = b.y, sx = b.sx, sy = b.sy;
    function mx(vx) { return x + vx * sx; }
    function my(vy) { return y + (vy - b.top) * sy; }

    /* 원작의 미니맵 창 — 밝은 종이에 굵은 남색 테 */
    ctx.fillStyle = 'rgba(253,251,244,0.92)';
    ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
    ctx.strokeStyle = 'rgba(61,53,96,0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 6, y - 6, w + 12, h + 12);

    /* 바닥과 발판 */
    ctx.fillStyle = 'rgba(61,53,96,0.45)';
    ctx.fillRect(x, my(stg.floor), w, 1.5);
    var i;
    for (i = 0; i < stg.plats.length; i++) {
      var pl = stg.plats[i];
      ctx.fillRect(mx(pl[0]), my(pl[1]), pl[2] * sx, 1.5);
    }
    /* 줄 */
    ctx.strokeStyle = 'rgba(150,110,60,0.55)';
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
      ctx.fillStyle = S.unlocked(g[1]) ? '#3f7fd0' : 'rgba(120,120,135,0.7)';
      ctx.fillRect(mx(g[0]) - 2, my(stg.floor) - 7, 4, 7);
    }
    /* 적 · 보스 · 나 */
    for (i = 0; i < run.enemies.length; i++) {
      var e = run.enemies[i];
      ctx.fillStyle = e.boss ? '#e0501f' : 'rgba(200,60,60,0.9)';
      var d = e.boss ? 4 : 2;
      ctx.fillRect(mx(e.x + e.w / 2) - d / 2, my(e.y + e.h) - d, d, d);
    }
    ctx.fillStyle = '#f0a92b';
    ctx.fillRect(mx(run.player.x + S.P_W / 2) - 2.5, my(run.player.y + S.P_H) - 5, 5, 5);
    ctx.strokeStyle = 'rgba(61,53,96,0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx(run.player.x + S.P_W / 2) - 2.5, my(run.player.y + S.P_H) - 5, 5, 5);

    ctx.font = '600 9.5px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(43,36,64,0.85)';
    ctx.fillText(stg.name, x, y - 10);
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
      ctx.fillText((open ? (core.upHint() + ' ') : '🔒 ') + to.name, x, base - 104);
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
    /* 좁은 폭에서는 상단 UI 가 두 줄로 접힌다(프로필·도구·지갑) — 그 아래로 내린다.
       폰에서 보스 이름이 도구 단추에 가려 "무엇이 달려드는지" 를 못 읽었다. */
    var narrow = W <= 560;
    var w = Math.min(W - 40, 420), x = (W - w) / 2, y = narrow ? 254 : 14;
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
        /* 데미지 숫자 — 원작처럼 **굵고 크게, 검은 테를 둘러** 위로 튄다.
           **급소는 한눈에 갈린다** — 더 크고, 붉은 금빛이고, 뒤에 느낌표가 붙고,
           처음 한 박자 부풀었다 가라앉는다(원작의 크리티컬 숫자가 그렇다) */
        var a = Math.min(1, f.life * 2.2);
        var rise = (0.6 - f.life) * 52;
        /* 한 번에 여럿을 치면 숫자가 겹쳐 한 덩어리로 읽힌다(주위를 쓰는 무예가 그렇다.
           실제로 "24"·"42"·"35" 셋이 "244235" 로 보였다). **층을 쌓아 올린다** —
           같은 순간에 가까이서 난 숫자를 세어 그만큼 위로 올린다. 판정에는 닿지 않고,
           세는 값이 fx 목록의 순서라 늘 같은 자리에 선다 */
        var stack = 0, si;
        for (si = 0; si < i; si++) {
          var g0 = list[si];
          if (g0.t === 'hit' && Math.abs(g0.life - f.life) < 0.002 &&
              Math.abs(g0.x - f.x) < 52) { stack++; }
        }
        rise += stack * 21;
        x += (core.hash2(Math.round(f.x), Math.round(f.y)) - 0.5) * 12;
        var big = f.v >= 100 || f.crit;
        var pop = f.crit ? (1 + Math.max(0, f.life - 0.44) * 2.6) : 1;
        var size = (f.crit ? 25 : (big ? 21 : 17)) * pop;
        ctx.font = '900 ' + size.toFixed(1) + 'px "Malgun Gothic", system-ui';
        ctx.textAlign = 'center';
        ctx.lineWidth = f.crit ? 4.5 : 3.5;
        ctx.strokeStyle = 'rgba(30,24,20,' + a + ')';
        var txt = f.crit ? (f.v + '!') : String(f.v);
        ctx.strokeText(txt, x, f.y - rise);
        ctx.fillStyle = (f.crit ? 'rgba(255,150,70,'
                                : (big ? 'rgba(255,196,86,' : 'rgba(255,240,190,')) + a + ')';
        ctx.fillText(txt, x, f.y - rise);
      } else if (f.t === 'fall') {
        /* 죽는 모습 — **뒤로 넘어가며 흐려진다.** 원작에서 몹이 죽던 그 모습이다.
           적을 목록에서 이미 뺀 뒤라 여기서만 그린다(판정에는 없는 몸이다) */
        var span = f.boss ? 1.1 : 0.55;
        var k = 1 - Math.min(1, f.life / span);        // 0 → 1 로 간다
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - k * 1.1);
        ctx.translate(x + f.dir * k * 46, f.y + f.h / 2 + k * k * 40);
        ctx.rotate(f.dir * k * 1.5);
        ctx.fillStyle = (f.ref && f.ref.color) ? f.ref.color : 'rgba(60,48,40,0.85)';
        ctx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h * 0.9);
        ctx.fillStyle = 'rgba(0,0,0,0.30)';
        ctx.fillRect(-f.w / 2, -f.h / 2 + f.h * 0.55, f.w, f.h * 0.35);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(-f.w / 2, -f.h / 2, f.w, 4);
        ctx.restore();
      } else if (f.t === 'dust') {
        /* 착지 먼지 — 세게 떨어졌을 때만 인다 */
        var dk = 1 - Math.min(1, f.life / 0.32);
        ctx.globalAlpha = Math.max(0, 0.5 - dk * 0.5);
        ctx.fillStyle = '#d8cbb4';
        for (var dq = -1; dq <= 1; dq += 2) {
          ctx.beginPath();
          ctx.ellipse(x + dq * (6 + dk * 22), f.y - 3 - dk * 5,
                      5 + dk * 9, 3 + dk * 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (f.t === 'warn') {
        /* 보스가 달려들기 직전 — 소리만으로는 못 듣는 사람이 있다 */
        var wa = Math.min(1, f.life / 0.9);
        ctx.font = '900 17px "Malgun Gothic", system-ui';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = 'rgba(30,10,10,' + wa + ')';
        ctx.strokeText('달려든다!', x, f.y - 26);
        ctx.fillStyle = 'rgba(255,90,70,' + wa + ')';
        ctx.fillText('달려든다!', x, f.y - 26);
      } else if (f.t === 'shake' || f.t === 'ouch') {
        /* 화면 전체에 쓰는 것 — 여기서는 아무것도 안 그린다(위에서 이미 썼다) */
        continue;
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
    _cam: function () { return camX; },
    /** 진단용 — **흔들림의 세기는 화면 층이 정한다**(side.js 는 'shake' 한 줄만 남긴다) */
    _shake: shakeOf,
    /** 진단용 — 화면의 그 자리가 어느 조작인가 (폰에는 방향키가 없다) */
    _zone: function (x, y) { return readZone({ clientX: x, clientY: y }); }
  };
})(window);
