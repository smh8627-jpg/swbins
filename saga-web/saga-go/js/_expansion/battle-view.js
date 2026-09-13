/**
 * 전투 화면 — 방치 전투를 눈으로 보여주는 표현 레이어
 * ---------------------------------------------------------------
 * 전투 결과를 여기서 계산하지 않는다. battle.js 가 이미 굴리고 있는
 * "관문 / 파 / 진행률"을 읽어 그림으로만 옮긴다.
 * 그래서 창을 닫아도(=이 화면이 없어도) 전투와 오프라인 정산은 그대로 돌아가고,
 * 화면과 숫자가 어긋날 일도 없다.
 *
 * 적 HP 는 진행률을 나눠 표현한다. 3마리면 진행률 0~1/3 구간에서 첫째가 죽는다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var data = global.DG.data;
  var ed = global.DG.enemyData;

  var H = 200;                    // 전투 화면 높이 (CSS px)
  var canvas = null, ctx = null;
  var st = {
    key: '',                      // 현재 "관문/파"
    enemies: [],
    boss: false,
    hits: [],                     // 튀는 데미지 숫자
    slashes: [],                  // 공격 이펙트
    lunge: [],                    // 부대원 돌진 모션 (index → 남은 시간)
    atkTimer: 0,
    flash: 0,                     // 웨이브 격파 섬광
    counters: [],                 // 적의 반격 투사체
    hurt: [],                     // 반격을 맞은 부대원
    cTimer: 1.2,
    shake: 0,                     // 화면 흔들림
    red: 0,                       // 피격 붉은 섬광
    cryT: 0                       // "반격!" 표시 시간
  };

  /** 시트가 다시 렌더될 때마다 캔버스를 자리에 붙인다 (캔버스 자체는 재사용) */
  function ensureHost() {
    var host = document.getElementById('battle-stage');
    if (!host) { return false; }
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'battle-canvas';
      ctx = canvas.getContext('2d');
    }
    if (canvas.parentNode !== host) { host.appendChild(canvas); }
    return true;
  }

  function resize() {
    var dpr = global.devicePixelRatio || 1;
    var w = canvas.clientWidth || 340;
    var need = Math.floor(w * dpr);
    if (canvas.width !== need || canvas.height !== Math.floor(H * dpr)) {
      canvas.width = need;
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return { w: w, h: H };
  }

  /* ── 적 편성 ──────────────────────────────────────────── */

  function makeEnemies(stage, wave, wavesPerStage) {
    var boss = wave === wavesPerStage;
    var pool = ed.poolFor(stage, boss);
    var n = boss ? 1 : (core.hash2(stage * 7 + 1, wave * 13 + 3) > 0.45 ? 3 : 2);
    var out = [];
    var base = Math.floor(core.hash2(stage * 31 + wave * 5, wave * 11 + 7) * pool.length);
    var step = 1 + Math.floor(core.hash2(wave * 17 + 3, stage * 13 + 5) * (pool.length - 1));
    for (var i = 0; i < n; i++) {
      out.push({ ref: pool[(base + i * step) % pool.length], shake: 0, dead: 0 });
    }
    st.boss = boss;
    return out;
  }

  function syncWave() {
    var b = core.save.battle;
    var wps = global.DG.battle.WAVES_PER_STAGE;
    var key = b.stage + '/' + b.wave;
    if (key === st.key) { return; }
    if (st.key) { st.flash = 1; }             // 직전 파를 격파했다는 신호
    st.key = key;
    st.enemies = makeEnemies(b.stage, b.wave, wps);
    st.hits = []; st.slashes = []; st.lunge = [];
    st.counters = []; st.hurt = []; st.cTimer = 1.2; st.shake = 0; st.red = 0; st.cryT = 0;
  }

  /* ── 갱신 ─────────────────────────────────────────────── */

  function update(dt) {
    syncWave();
    var status = global.DG.battle.status();
    var party = core.save.party.length;
    var fighting = status.state === 'ok' && party > 0 && core.save.battle.auto;

    if (st.flash > 0) { st.flash = Math.max(0, st.flash - dt * 2.2); }

    // 살아있는 적 계산
    var alive = aliveIndex(status.progress);

    if (fighting && alive >= 0) {
      st.atkTimer -= dt;
      if (st.atkTimer <= 0) {
        st.atkTimer = 0.34 + Math.random() * 0.22;
        var who = Math.floor(Math.random() * party);
        st.lunge.push({ i: who, t: 0.32 });
        st.slashes.push({ from: who, to: alive, t: 0.26, life: 0.26 });
        var dmg = Math.max(1, Math.round(status.power.atk / 9 * (0.75 + Math.random() * 0.5)));
        st.hits.push({ target: alive, val: dmg, t: 0.85, crit: Math.random() < 0.16 });
        st.enemies[alive].shake = 0.18;
      }

      // 적의 반격 — 보스는 더 세게, 더 자주 때린다
      st.cTimer -= dt;
      if (st.cTimer <= 0) {
        var heavy = st.boss;
        st.cTimer = (heavy ? 1.7 : 2.2) + Math.random() * 0.9;
        var victim = Math.floor(Math.random() * party);
        st.counters.push({ from: alive, to: victim, t: 0.34, life: 0.34, heavy: heavy });
        st.hurt.push({ i: victim, t: 0.45, heavy: heavy });
        st.shake = heavy ? 0.34 : 0.15;
        st.red = heavy ? 0.55 : 0.24;
        if (heavy) { st.cryT = 0.8; }
      }
    }

    // 이펙트 수명
    var i;
    for (i = st.hits.length - 1; i >= 0; i--) {
      st.hits[i].t -= dt;
      if (st.hits[i].t <= 0) { st.hits.splice(i, 1); }
    }
    for (i = st.slashes.length - 1; i >= 0; i--) {
      st.slashes[i].t -= dt;
      if (st.slashes[i].t <= 0) { st.slashes.splice(i, 1); }
    }
    for (i = st.lunge.length - 1; i >= 0; i--) {
      st.lunge[i].t -= dt;
      if (st.lunge[i].t <= 0) { st.lunge.splice(i, 1); }
    }
    for (i = st.counters.length - 1; i >= 0; i--) {
      st.counters[i].t -= dt;
      if (st.counters[i].t <= 0) { st.counters.splice(i, 1); }
    }
    for (i = st.hurt.length - 1; i >= 0; i--) {
      st.hurt[i].t -= dt;
      if (st.hurt[i].t <= 0) { st.hurt.splice(i, 1); }
    }
    for (i = 0; i < st.enemies.length; i++) {
      if (st.enemies[i].shake > 0) { st.enemies[i].shake -= dt; }
    }
    if (st.shake > 0) { st.shake = Math.max(0, st.shake - dt); }
    if (st.red > 0) { st.red = Math.max(0, st.red - dt * 1.6); }
    if (st.cryT > 0) { st.cryT = Math.max(0, st.cryT - dt); }
  }

  /** 진행률에 따라 지금 때리고 있는 적의 번호 (없으면 -1) */
  function aliveIndex(progress) {
    var n = st.enemies.length;
    if (!n) { return -1; }
    for (var i = 0; i < n; i++) {
      if (hpRatio(i, progress, n) > 0) { return i; }
    }
    return -1;
  }

  function hpRatio(i, progress, n) {
    var seg = 1 / n;
    return core.clamp(((i + 1) * seg - progress) / seg, 0, 1);
  }

  /* ── 그리기 ───────────────────────────────────────────── */

  function draw() {
    if (!ensureHost()) { return; }
    var dim = resize();
    var W = dim.w;
    var status = global.DG.battle.status();
    var b = core.save.battle;
    var n = st.enemies.length;
    var party = core.save.party;
    var now = Date.now();

    ctx.save();
    if (st.shake > 0) {
      var amp = st.shake * 14;
      ctx.translate((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp);
    }

    /* 배경 — 관문 구간에 따라 색이 달라진다 */
    var tier = ed.tierOf(b.stage);
    var sky = ['#1b2233', '#231d2e', '#2b1d24', '#2a1f16'][tier - 1];
    var ground = ['#20283a', '#2a2334', '#33232a', '#33281c'][tier - 1];
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, st.boss ? '#3a1c22' : sky);
    g.addColorStop(0.62, sky);
    g.addColorStop(0.63, ground);
    g.addColorStop(1, '#14161d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 원경 실루엣 (관문 성벽 느낌)
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (var x = -20; x < W + 20; x += 46) {
      var hh = 26 + ((x * 7919) % 17);
      ctx.fillRect(x, 126 - hh, 34, hh);
      ctx.fillRect(x + 6, 118 - hh, 22, 8);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, 126, W, 1);

    ctx.textAlign = 'left';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText('제 ' + b.stage + ' 관문', 12, 22);
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillStyle = st.boss ? '#ff9b9b' : 'rgba(255,255,255,0.6)';
    ctx.fillText(st.boss ? '보스 · ' + b.wave + '/' + status.wavesPerStage + '파'
                         : b.wave + ' / ' + status.wavesPerStage + '파', 12, 38);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('전투력 ' + core.fmt(status.power.total), W - 12, 22);
    ctx.fillStyle = status.state === 'ok' ? 'rgba(120,220,160,0.9)' : '#ff9b9b';
    ctx.fillText(status.state === 'ok' ? '진격 중'
      : (status.state === 'stuck' ? '진격 정체' : '부대 없음'), W - 12, 38);

    // 부대 여유 — 전투력이 요구치의 몇 배인가
    var mg = status.margin || 0;
    ctx.font = '600 10.5px system-ui, sans-serif';
    ctx.fillStyle = st.red > 0.05 ? '#ff8f8f'
      : (mg < 1 ? '#ef6b6b' : (mg < 1.6 ? '#e8c455' : 'rgba(255,255,255,0.5)'));
    ctx.fillText('여유 ×' + mg.toFixed(2), W - 12, 53);
    ctx.textAlign = 'left';

    /* 부대 */
    var stuck = status.state === 'stuck';
    var back = stuck ? -6 + Math.sin(now / 90) * 1.2 : 0;
    for (var i = 0; i < party.length; i++) {
      var h = data.find(party[i]);
      if (!h) { continue; }
      var px = 34 + (i % 2) * 40 + Math.floor(i / 2) * 10 + back;
      var py = 176 - Math.floor(i / 2) * 30;
      var lg = 0;
      for (var L = 0; L < st.lunge.length; L++) {
        if (st.lunge[L].i === i) { lg = Math.sin((1 - st.lunge[L].t / 0.32) * Math.PI) * 13; }
      }
      var hitShake = 0, hitRing = null;
      for (var Hh = 0; Hh < st.hurt.length; Hh++) {
        if (st.hurt[Hh].i === i) {
          hitShake = Math.sin(st.hurt[Hh].t * 46) * (st.hurt[Hh].heavy ? 4.5 : 2.5);
          hitRing = st.hurt[Hh].heavy ? '#ff6b6b' : '#ff9b9b';
        }
      }
      var f = data.faction(h.faction);
      ring(px + lg + hitShake, py, 11, hitRing || data.rarity[h.rarity].color);
      global.DG.sprite.stamp(ctx, {
        kind: 'human', ref: h,
        x: px + lg + hitShake, y: py, s: 0.70, facing: 1,
        phase: lg ? now / 60 : 0, walking: !!lg,
        color: f.color, look: global.DG.sprite.lookOf(h), t: now
      });
    }
    if (!party.length) {
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText('부대가 비어 있습니다', 26, 168);
    }

    /* 적 */
    var target = aliveIndex(status.progress);   // 지금 때리고 있는 적
    var epos = [];
    for (var e = 0; e < n; e++) {
      var ex = st.boss ? W - 76 : (W - 50 - e * 46);
      var ey = st.boss ? 158 : (176 - (e % 2) * 28);
      epos.push({ x: ex, y: ey });
      var ratio = hpRatio(e, status.progress, n);
      var en = st.enemies[e];
      var sh = en.shake > 0 ? (Math.random() - 0.5) * 5 : 0;
      var R = st.boss ? 25 : 16;

      if (ratio <= 0) {
        // 쓰러진 적 — 넘어진 자세
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.translate(ex, ey);
        ctx.rotate(Math.PI / 2.1);
        drawFoe(0, 0, en.ref, st.boss ? 0.9 : 0.66, now);
        ctx.restore();
        ctx.globalAlpha = 1;
        continue;
      }
      ring(ex + sh, ey, st.boss ? 17 : 12, st.boss ? '#ff7b7b' : '#e0a0a0');
      drawFoe(ex + sh, ey, en.ref, st.boss ? 1.05 : 0.72, now);

      // HP 바
      var bw = st.boss ? 64 : 40;
      var bx = ex - bw / 2, by = ey - (st.boss ? 44 : 30) - 14;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(bx, by, bw, 5, 2.5); ctx.fill();
      ctx.fillStyle = ratio > 0.5 ? '#6fd07a' : (ratio > 0.22 ? '#e8c455' : '#ef6b6b');
      roundRect(bx, by, bw * ratio, 5, 2.5); ctx.fill();

      if (st.boss || n <= 2 || e === target) {
        ctx.textAlign = 'center';
        ctx.font = '600 9.5px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.62)';
        ctx.fillText(en.ref.name, ex, by - 5);
        ctx.textAlign = 'left';
      }
    }

    /* 공격 이펙트 */
    for (var s = 0; s < st.slashes.length; s++) {
      var sl = st.slashes[s];
      if (!epos[sl.to]) { continue; }
      var t = 1 - sl.t / sl.life;
      var fx = 40 + (sl.from % 2) * 40 + Math.floor(sl.from / 2) * 10,
          fy = 176 - Math.floor(sl.from / 2) * 30;
      var tx = epos[sl.to].x, ty = epos[sl.to].y;
      var cx = fx + (tx - fx) * t, cy = fy + (ty - fy) * t - Math.sin(t * Math.PI) * 22;
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5 * (1 - t * 0.4), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,230,160,' + (1 - t * 0.5) + ')';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(fx, fy); ctx.lineTo(cx, cy);
      ctx.strokeStyle = 'rgba(255,220,140,' + (0.22 * (1 - t)) + ')';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (t > 0.88) {
        ctx.beginPath();
        ctx.arc(tx, ty, 16, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,240,190,0.35)';
        ctx.fill();
      }
    }

    /* 적의 반격 */
    for (var c = 0; c < st.counters.length; c++) {
      var cn = st.counters[c];
      if (!epos[cn.from]) { continue; }
      var ct = 1 - cn.t / cn.life;
      var sx0 = epos[cn.from].x, sy0 = epos[cn.from].y;
      var dx0 = 40 + (cn.to % 2) * 40 + Math.floor(cn.to / 2) * 10;
      var dy0 = 176 - Math.floor(cn.to / 2) * 30;
      var ccx = sx0 + (dx0 - sx0) * ct, ccy = sy0 + (dy0 - sy0) * ct - Math.sin(ct * Math.PI) * 20;
      ctx.beginPath();
      ctx.arc(ccx, ccy, (cn.heavy ? 7 : 4.5) * (1 - ct * 0.3), 0, Math.PI * 2);
      ctx.fillStyle = cn.heavy ? 'rgba(255,120,120,0.95)' : 'rgba(255,160,150,0.85)';
      ctx.fill();
      if (ct > 0.85) {
        ctx.beginPath();
        ctx.arc(dx0, dy0, cn.heavy ? 24 : 15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,120,110,0.32)';
        ctx.fill();
      }
    }
    if (st.cryT > 0) {
      ctx.textAlign = 'center';
      ctx.font = '800 15px system-ui, sans-serif';
      ctx.globalAlpha = core.clamp(st.cryT / 0.8, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText('보스 반격!', 84, 104);
      ctx.fillStyle = '#ff8f8f';
      ctx.fillText('보스 반격!', 83, 103);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }

    /* 데미지 숫자 */
    ctx.textAlign = 'center';
    for (var d = 0; d < st.hits.length; d++) {
      var hit = st.hits[d];
      if (!epos[hit.target]) { continue; }
      var k = 1 - hit.t / 0.85;
      var hx = epos[hit.target].x + (hit.crit ? 0 : 10);
      var hy = epos[hit.target].y - 22 - k * 26;
      ctx.globalAlpha = core.clamp(1 - k, 0, 1);
      ctx.font = (hit.crit ? '800 16px' : '700 13px') + ' system-ui, sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText((hit.crit ? '치명! ' : '') + hit.val, hx + 1, hy + 1);
      ctx.fillStyle = hit.crit ? '#ffd166' : '#fff';
      ctx.fillText((hit.crit ? '치명! ' : '') + hit.val, hx, hy);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';

    /* 파 진행바 */
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, H - 6, W, 6);
    ctx.fillStyle = stuck ? '#ef6b6b' : '#4aa3f0';
    ctx.fillRect(0, H - 6, W * status.progress, 6);

    /* 격파 섬광 */
    if (st.flash > 0) {
      ctx.fillStyle = 'rgba(255,240,200,' + (st.flash * 0.32) + ')';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.font = '800 20px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,' + st.flash + ')';
      ctx.fillText('격파!', W / 2, H / 2 - 10 + (1 - st.flash) * -12);
      ctx.textAlign = 'left';
    }

    /* 피격 붉은 섬광 */
    if (st.red > 0) {
      ctx.fillStyle = 'rgba(255,70,60,' + (st.red * 0.3) + ')';
      ctx.fillRect(0, 0, W, H);
    }

    /* 정체 안내 */
    if (stuck) {
      ctx.fillStyle = 'rgba(20,10,12,0.5)';
      ctx.fillRect(0, 50, W, 28);
      ctx.textAlign = 'center';
      ctx.font = '700 11.5px system-ui, sans-serif';
      ctx.fillStyle = '#ff9b9b';
      ctx.fillText('전투력이 모자라 진격이 멈췄습니다', W / 2, 68);
      ctx.textAlign = 'left';
    }

    ctx.restore();
  }

  /** 발밑 고리 */
  function ring(x, y, r, color) {
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  /** 적 하나 — 사람형이면 사람, 짐승형이면 짐승으로 그린다 */
  function drawFoe(x, y, ref, scale, now) {
    var sp = global.DG.sprite;
    sp.stamp(ctx, {
      kind: ref.kind === 'beast' ? 'beast' : 'human', ref: ref,
      x: x, y: y, s: scale, facing: -1,
      phase: ref.kind === 'beast' ? now / 220 : 0,
      walking: ref.kind === 'beast',
      color: ref.color || (ref.kind === 'beast' ? '#8a7358' : '#6a6a74'),
      look: ref.look || { weapon: 'sword', helm: 'none', armor: 'leather' },
      form: ref.form || 'quad', skin: '#d8b48c', t: now
    });
  }

  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  global.DG = global.DG || {};
  global.DG.battleView = {
    update: update,
    draw: draw,
    /** 화면이 붙어 있는지 (테스트·루프 판단용) */
    get mounted() { return !!(canvas && canvas.parentNode); },
    get enemies() { return st.enemies; },
    hpRatio: function (i, progress) { return hpRatio(i, progress, st.enemies.length); }
  };
})(window);
