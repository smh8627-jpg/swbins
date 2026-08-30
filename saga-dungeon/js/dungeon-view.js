/**
 * 던전 화면 — 표현 전용 (아이소메트릭)
 * ---------------------------------------------------------------
 * dungeon.js 가 굴리는 상태를 **그리고 입력만 넘긴다**. 여기서 계산하지 않는다.
 * (battle-view.js 와 같은 원칙 — 계산이 화면으로 새면 규칙이 두 벌이 된다)
 *
 * v1.0 — 디아블로 감성:
 *   아이소메트릭   논리 좌표(ROOM_W×H 직사각형)는 그대로 두고, 그릴 때만
 *                  마름모로 투영한다. proj()/unproj() 는 선형이라 역변환이 정확하다.
 *   조명           어둠 레이어에 플레이어·횃불·기공파 자리만 구멍을 뚫는다.
 *   오브 HUD       HP/기력 구슬 + 스킬 4버튼 (키보드 1~4, 터치 가능)
 *   전리품 이름표  바닥에 떨어진 장비에 등급색 이름이 뜬다
 *
 *   #dungeon        전체화면 오버레이 (없으면 만든다)
 *   #dg-canvas      방 하나를 그리는 캔버스
 *   #dg-hud         층 · 노획물 · 은사 · 탈출
 *   #dg-bottom      HP 오브 · 스킬바 · 기력 오브
 *   #dg-choice      은사 셋 중 하나 고르기
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var DG_ = null;                      // dungeon 모듈 (부트 후에 잡는다)
  var DD = null;

  var host = null, cv = null, ctx = null, hud = null, choiceEl = null;
  var bottomEl = null, foeEl = null;
  var lightCv = null, lightCtx = null;         // 어둠 레이어 (오프스크린)
  var shown = false;
  var keys = {};
  var shake = 0;
  var lastHp = 0;
  /* 바닥에 남는 핏자국 — 원작에서 방을 치우고 나면 남는 그 자국이다.
     판정과 무관한 순수 장식이라 세이브에도 run 에도 넣지 않는다(방이 바뀌면 사라진다). */
  var gore = [], goreRoom = null;
  var GORE_MAX = 60;

  /* 아이소메트릭 상수 — u=(x−y)·IX, v=(x+y)·IY. 2:1 마름모보다 살짝 눕혔다 */
  var IX = 0.84, IY = 0.46;
  var WALLH = 58;                              // 뒷벽을 위로 뽑는 높이 (논리 단위)
  /* 확대율 — 원작은 방 전체가 아니라 인물 언저리를 크게 보여 준다.
     1 이면 방이 화면에 딱 맞고(=예전), 키우면 바짝 붙는다. 1.5 넘게 주면
     이 방(560×360)에서는 적이 화면 밖으로 나가 손으로 놀기가 답답해진다. */
  /* 캔버스에 찍는 글자도 CSS 와 같은 결이어야 한다 — 로마자·숫자는 Cinzel,
     한글은 명조로 떨어진다(diablo.css 가 심어 둔 글꼴). 캔버스는 매 프레임 다시
     그리므로 글꼴이 늦게 올라와도 다음 프레임에 제대로 나온다. */
  var D2_FONT = 'Cinzel, Georgia, "Nanum Myeongjo", "Batang", serif';

  var ZOOM = 1.20;
  /* 화면 아래 조작판이 가리는 높이 — 무대를 그 위로 밀어 올린다.
     이 값을 빼지 않으면 인물이 판 뒤에 숨는다. */
  var PAD_BOT = 92;

  /**
   * 지금 그리는 장면 — 마을이거나 던전이다.
   *
   * 둘은 **같은 모양의 상태**를 내놓기로 약속돼 있다(raw · status · fx ·
   * setInput · moveTo · update). 그래서 아래 그리기·조작 코드는 자기가 마을을
   * 그리는지 던전을 그리는지 몰라도 된다 — 이 한 줄이 그 약속의 전부다.
   */
  function d() {
    var T = global.DG.town;
    return (T && T.active()) ? T : global.DG.dungeon;
  }
  function shade(c, amt) { return global.DG.sprite.shade(c, amt); }

  function build() {
    host = document.getElementById('dungeon');
    if (!host) {
      host = document.createElement('div');
      host.id = 'dungeon';
      document.body.appendChild(host);
    }
    host.innerHTML =
      '<div class="dg-wrap">' +
        '<div id="dg-hud"></div>' +
        '<div class="dg-stage"><canvas id="dg3d"></canvas><canvas id="dg-canvas"></canvas>' +
          '<div id="d2-foe"></div>' +
          '<div id="dg-choice"></div>' +
        '</div>' +
        '<div id="dg-bottom"></div>' +
        '<div class="dg-tip">이동 <b>WASD</b> · 물약 <b>1 2 3 4</b> · 스킬 <b>Z X C V</b> · ' +
          '<b>화면을 누른 채 끌면</b> 그쪽으로 걷습니다</div>' +
      '</div>';
    cv = document.getElementById('dg-canvas');
    ctx = cv.getContext('2d');
    /* 3D 층은 **있으면 쓴다.** WebGL 이 없거나 켜다 실패하면 그대로 2D 로 돈다
       (`dungeon3d.js`). 조작판·입력·시트는 그대로 이쪽 DOM 이 받는다.
       자가진단(DG_NO_DRAW)에서는 켜지도 않는다 — 헤드리스에도 WebGL 이 있어서
       켜 두면 켜진 것으로 판정되고, 화면 층이 그 값을 보고 갈린다 */
    if (global.DG.dungeon3d && !global.DG_NO_DRAW) {
      global.DG.dungeon3d.init(document.getElementById('dg3d'));
    }
    hud = document.getElementById('dg-hud');
    choiceEl = document.getElementById('dg-choice');
    bottomEl = document.getElementById('dg-bottom');
    foeEl = document.getElementById('d2-foe');
    lightCv = document.createElement('canvas');
    lightCtx = lightCv.getContext('2d');
    buildBottom();

    /* 조작 — 누르고 있으면 손가락 쪽으로 계속 걷는다(폰), 짧게 누르면 그 지점으로(마우스). */
    var steering = false, downAt = 0, downPt = null;

    function steer(e) {
      var r = cv.getBoundingClientRect();
      var p = toRoom(e.clientX - r.left, e.clientY - r.top);
      var run = d().raw();
      if (!run) { return; }
      var dx = p.x - run.player.x, dy = p.y - run.player.y;
      var len = Math.hypot(dx, dy);
      if (len < 14) { d().setInput(0, 0); return; }
      d().setInput(dx / len, dy / len);
    }

    cv.addEventListener('pointerdown', function (e) {
      steering = true;
      downAt = Date.now();
      downPt = { x: e.clientX, y: e.clientY };
      cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
      steer(e);
      e.preventDefault();
    });
    cv.addEventListener('pointermove', function (e) {
      if (!steering) { return; }
      steer(e);
    });
    function release(e) {
      if (!steering) { return; }
      steering = false;
      d().setInput(0, 0);
      var quick = Date.now() - downAt < 200;
      var moved = downPt ? Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y) : 99;
      if (quick && moved < 12) {
        var r = cv.getBoundingClientRect();
        var p = toRoom(e.clientX - r.left, e.clientY - r.top);
        d().moveTo(p.x, p.y);
      }
    }
    cv.addEventListener('pointerup', release);
    cv.addEventListener('pointercancel', function () { steering = false; d().setInput(0, 0); });
    cv.addEventListener('pointerleave', function (e) { if (steering) { release(e); } });

    hud.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) { return; }
      if (b.getAttribute('data-act') === 'leave') { d().leave(); }
    });

    choiceEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-boon]');
      if (b) { d().pickBoon(b.getAttribute('data-boon')); renderChoice(); return; }
      var m = e.target.closest('[data-buy]');
      if (m) { d().buyMerchant(Number(m.getAttribute('data-buy'))); renderChoice(); return; }
      var lv = e.target.closest('[data-leave-merchant]');
      if (lv) { d().leaveMerchant(); renderChoice(); }
    });


    bottomEl.addEventListener('pointerdown', function (e) {
      var bl = e.target.closest('[data-belt]');
      if (bl) { drink(parseInt(bl.getAttribute('data-belt'), 10)); return; }
      var b = e.target.closest('[data-skill]');
      if (!b) { return; }
      d().castSkill(parseInt(b.getAttribute('data-skill'), 10));
      e.preventDefault();
    });

    global.addEventListener('keydown', onKey);
    global.addEventListener('keyup', onKeyUp);
  }

  /* 조작 안내 한 줄 — 마을과 던전은 손이 다르다. 바뀔 때만 건드린다 */
  var tipTown = null;
  function setTip(town) {
    if (tipTown === town) { return; }
    tipTown = town;
    var el = host && host.querySelector('.dg-tip');
    if (!el) { return; }
    el.innerHTML = town
      ? '이동 <b>WASD</b> · <b>화면을 누른 채 끌면</b> 그쪽으로 걷습니다 · ' +
        '사람과 표식은 <b>다가서면</b> 말이 걸립니다'
      : '이동 <b>WASD</b> · 물약 <b>1 2 3 4</b> · 스킬 <b>Z X C V</b> · ' +
        '<b>화면을 누른 채 끌면</b> 그쪽으로 걷습니다';
  }

  /**
   * 하단 조작판 — 원작(디아블로2)의 그 판이다.
   *
   *   [체력 구슬]  [스킬 넷]  [경험치 띠 · 노획 · 은사]  [기력 구슬]
   *
   * 구슬을 쓴 이유는 멋이 아니다. 원작에서 체력은 **숫자가 아니라 양(量)** 으로
   * 읽힌다 — 곁눈질로 "얼마나 남았나" 를 보게 하려고 둥근 그릇에 액체를 채운다.
   * 막대(dg-hpbar)는 그래서 감췄다(diablo.css).
   *
   * DOM 은 여기서 한 번만 만들고 renderBottom 이 값만 만진다.
   */
  /* 스킬 키 — 원작은 F1~F8 인데 브라우저가 F1 을 도움말로 가로챈다.
     1 2 3 4 는 **벨트(물약)** 에 내줬으므로(원작 그대로), 스킬은 WASD 왼쪽 아래
     Z X C V 로 내렸다. 왼손이 이동에서 손을 안 떼고 닿는 자리다. */
  var SKILL_KEYS = ['Z', 'X', 'C', 'V'];

  function buildBottom() {
    /* 칸은 넷이다. **무엇이 걸려 있는지는 매 틱 renderBottom 이 채운다** —
       선두를 바꾸면 손이 통째로 바뀌므로 여기서 구워 두지 않는다 */
    var n = global.DG.dungeon.SKILL_SLOTS || 4;
    var html =
      '<div class="d2-globe life"><i class="d2-liq"></i><span class="d2-gv"></span></div>' +
      '<div class="d2-plate d2-left"><div class="d2-skills">';
    for (var i = 0; i < n; i++) {
      html += '<button class="dg-skill" data-skill="' + i + '">' +
        '<span class="dg-sk-e"></span>' +
        '<i class="dg-sk-cd"></i>' +
        '<b class="dg-sk-key">' + SKILL_KEYS[i] + '</b>' +
        '<small class="dg-sk-cost"></small>' +
        '</button>';
    }
    html += '</div></div>' +
      '<div class="d2-plate d2-mid">' +
        '<div class="d2-xp"><i style="width:0%"></i><span></span></div>' +
        '<div class="d2-line d2-loot"></div>' +
        '<div class="d2-line"><div class="d2-belt">' + beltCells() + '</div>' +
          '<span class="d2-boonline"></span></div>' +
      '</div>' +
      '<div class="d2-globe mana"><i class="d2-liq"></i><span class="d2-gv"></span></div>';
    bottomEl.innerHTML = html;
  }

  /** 요대(腰帶) 넷 — 원작의 벨트. 값은 renderBottom 이 채운다 */
  function beltCells() {
    var P = global.DG.potion;
    var n = P ? P.SLOTS : 4, h = '', i;
    for (i = 0; i < n; i++) {
      h += '<button class="d2-cell empty" data-belt="' + i + '" title="' + (i + 1) + '">' +
        '<span class="d2-pe"></span><i></i></button>';
    }
    return h;
  }

  function onKey(e) {
    if (!shown) { return; }
    if (e.key === 'Escape') { return; }              // 탈출은 버튼으로만 (실수 방지)
    var k = e.key.toLowerCase();
    /* 1 2 3 4 는 **벨트**다 (원작 그대로). 스킬은 Z X C V 로 내렸다. */
    if (k >= '1' && k <= '4') {
      drink(parseInt(k, 10) - 1);
      e.preventDefault();
      return;
    }
    var si = SKILL_KEYS.indexOf(k.toUpperCase());
    if (si >= 0) {
      d().castSkill(si);
      e.preventDefault();
      return;
    }
    keys[k] = true;
    pushInput();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(k) >= 0) {
      e.preventDefault();
    }
  }
  function onKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
    pushInput();
  }
  /** 한 칸 마신다 — 실패한 까닭을 짧게 알려 준다(빈 칸을 계속 누르게 두지 않는다) */
  function drink(slot) {
    var P = global.DG.potion;
    if (!P) { return; }
    var r = P.use(slot);
    if (r.ok) { return; }
    if (r.reason === 'empty') { core.emit('toast', '그 칸은 비었습니다'); }
    else if (r.reason === 'full') { core.emit('toast', '이미 가득합니다 — 아껴 둡니다'); }
  }

  function pushInput() {
    if (!shown) { return; }
    var dx = 0, dy = 0;
    if (keys.a || keys.arrowleft) { dx -= 1; }
    if (keys.d || keys.arrowright) { dx += 1; }
    if (keys.w || keys.arrowup) { dy -= 1; }
    if (keys.s || keys.arrowdown) { dy += 1; }
    d().setInput(dx, dy);
  }

  /* ── 좌표 변환 (아이소메트릭) ─────────────────────────── */

  /**
   * 논리 방(직사각형)을 마름모로 투영해 캔버스에 맞춘다.
   * uMin 은 마름모의 왼쪽 끝 (x=0, y=H 모서리).
   */
  function metrics() {
    var W = d().ROOM_W, H = d().ROOM_H;
    var cw = cv.clientWidth || 1, ch = cv.clientHeight || 1;
    var uw = (W + H) * IX;                     // 마름모 가로폭
    var vh = (W + H) * IY;                     // 마름모 세로높이
    /* 뒷벽 자리 + 조금. 적 머리 위 이름표를 없앤 뒤로 여유가 덜 든다 */
    var padTop = WALLH + 16;
    var chUse = Math.max(120, ch - PAD_BOT);   // 조작판에 가리지 않는 높이
    var fit = Math.min(cw / (uw + 20), chUse / (vh + padTop + 14));
    var s = fit * ZOOM;
    var uMin = -H * IX, uMax = W * IX, vMax = (W + H) * IY;

    /* 카메라 — 원작은 인물을 화면 한가운데 붙들고 방이 그 밖으로 흘러간다.
       다만 방 밖의 검은 여백이 보이면 무대가 아니라 그림판처럼 보이므로,
       마름모의 네 끝이 화면 안쪽으로 들어오지 않게 **가둔다**.
       가둘 수 없을 만큼(=방이 화면보다 작을 때) 이면 그냥 가운데에 놓는다. */
    var run = d() && d().raw();
    var ox, oy;
    if (run && run.player) {
      ox = cw / 2 - (run.player.x - run.player.y) * IX * s;
      oy = chUse * 0.50 - (run.player.x + run.player.y) * IY * s;
    } else {
      ox = (cw - uw * s) / 2 - uMin * s;
      oy = (chUse - (vh + padTop + 14) * s) / 2 + padTop * s;
    }
    var oxLo = cw - uMax * s, oxHi = -uMin * s;
    ox = oxLo <= oxHi ? core.clamp(ox, oxLo, oxHi) : (cw - uw * s) / 2 - uMin * s;
    var oyLo = chUse - vMax * s, oyHi = padTop * s;
    oy = oyLo <= oyHi ? core.clamp(oy, oyLo, oyHi)
                      : (chUse - (vh + padTop + 14) * s) / 2 + padTop * s;

    return { s: s, ox: ox, oy: oy, cw: cw, ch: ch };
  }

  function proj(m, x, y) {
    return { x: m.ox + (x - y) * IX * m.s, y: m.oy + (x + y) * IY * m.s };
  }

  function toRoom(px, py) {
    var m = metrics();
    var u = (px - m.ox) / m.s, v = (py - m.oy) / m.s;
    return { x: (u / IX + v / IY) / 2, y: (v / IY - u / IX) / 2 };
  }

  /** 논리 공간의 원 → 화면의 납작한 타원 (그림자·조명·범위 표시에 쓴다) */
  function isoEllipse(c, m, x, y, r) {
    var p = proj(m, x, y);
    c.ellipse(p.x, p.y, r * 1.414 * IX * m.s, r * 1.414 * IY * m.s, 0, 0, Math.PI * 2);
    return p;
  }

  /* ── 보이기 / 숨기기 ─────────────────────────────────── */

  function show() {
    if (!host) { build(); }
    shown = true;
    host.classList.add('show');
    document.body.classList.add('dungeon-open');
    resize();
    renderHud();
    renderChoice();
  }

  function hide() {
    shown = false;
    keys = {};
    if (host) { host.classList.remove('show'); }
    document.body.classList.remove('dungeon-open');
    if (d()) { d().setInput(0, 0); }
  }

  function resize() {
    if (!cv) { return; }
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var w = cv.clientWidth, h = cv.clientHeight;
    cv.width = Math.max(1, Math.floor(w * dpr));
    cv.height = Math.max(1, Math.floor(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lightCv.width = cv.width;
    lightCv.height = cv.height;
    lightCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ── HUD (상단) ──────────────────────────────────────── */

  var hudKey = '';
  function renderHud() {
    if (!shown) { return; }
    var st = d().status();
    if (!st.active) { return; }
    /* 마을은 층도 방도 노획도 없다 — "여기가 어디인가" 만 말한다 */
    if (st.town) {
      var kt = 'town|' + (st.best || 0);
      if (kt === hudKey) { return; }
      hudKey = kt;
      hud.innerHTML =
        '<div class="dg-row1">' +
          '<b class="dg-floor">🏯 마을</b>' +
          '<span class="dg-theme">' + st.theme.name + '</span>' +
          '<span class="dg-room">최고 제' + (st.best || 0) + '층</span>' +
        '</div>';
      setTip(true);
      return;
    }
    setTip(false);
    var k = st.floor + '|' + st.room + '|' + st.loot.gold + '|' +
            st.loot.items + '|' + JSON.stringify(st.boons) + '|' + (st.cleared ? 1 : 0);
    if (k === hudKey) { return; }
    hudKey = k;

    /* 노획·은사는 조작판이 들고 있다(renderBottom) — 위쪽은 "어디까지 왔나" 만 말한다 */
    hud.innerHTML =
      '<div class="dg-row1">' +
        '<b class="dg-floor">제 ' + st.floor + ' 층</b>' +
        '<span class="dg-theme">' + st.theme.name + '</span>' +
        '<span class="dg-room">' + st.room + ' / ' + st.roomTotal + ' 방' +
          (st.cleared ? ' · <b class="ok">정리됨</b>' : '') + '</span>' +
        '<button class="btn tiny ghost dg-leave" data-act="leave" ' +
          'title="지금까지 주운 것을 확정하고 나온다">🚪 탈출</button>' +
      '</div>';
  }

  /**
   * 화면 위쪽 가운데 — **지금 겨누고 있는 적**의 이름과 체력.
   * 원작에서 적 머리 위에는 아무것도 없고, 마우스가 가리킨 하나만 위쪽에 뜬다.
   * 그래서 여기서도 "가장 가까운 적" 하나만 올린다.
   * 순수하게 보여 주기만 한다 — 판정은 dungeon.js 몫이고 이 함수는 읽기만 한다.
   */
  var foeKey = '';
  function renderFoe() {
    if (!shown || !foeEl) { return; }
    var run = d().raw();
    if (!run || !run.room) { foeEl.className = ''; foeKey = ''; return; }
    var best = null, bestD = 1e9, i;
    for (i = 0; i < run.room.enemies.length; i++) {
      var e = run.room.enemies[i];
      if (e.hp <= 0) { continue; }
      var dd = Math.hypot(e.x - run.player.x, e.y - run.player.y);
      if (dd < bestD) { bestD = dd; best = e; }
    }
    if (!best || bestD > 260) { foeEl.className = ''; foeKey = ''; return; }

    var el = best.elite ? d().eliteOf(best.elite) : null;
    var k = best.ref.key + '|' + Math.round(best.hp) + '|' + (best.elite || '') + '|' + (best.boss ? 1 : 0);
    if (k === foeKey) { return; }
    foeKey = k;
    foeEl.className = 'show' + (best.boss ? ' boss' : el ? ' elite' : '');
    /* 저항 — 원작에서 "이놈은 불이 안 통한다" 를 알려 주는 그 줄이다.
       모르면 왜 안 깎이는지 알 길이 없다 */
    var rp = d().resistOf(best, 'phys'), rc = d().resistOf(best, 'chi');
    var res = [];
    if (rp >= 10) { res.push('칼 −' + Math.round(rp) + '%'); }
    if (rc >= 10) { res.push('기 −' + Math.round(rc) + '%'); }

    foeEl.innerHTML =
      '<div class="d2-fname">' + (el ? el.name + ' ' : '') + best.ref.name + '</div>' +
      '<div class="d2-fbar"><i style="width:' +
        (core.clamp(best.hp / (best.hpMax || best.hp || 1), 0, 1) * 100) + '%"></i></div>' +
      (res.length ? '<div class="d2-fres">저항 ' + res.join(' · ') + '</div>' : '') +
      (el ? '<div class="d2-faff">' + el.desc + '</div>' : '');
  }

  /** 조작판 — 매 틱 값만 만진다 (DOM 재생성 없음) */
  var lootKey = '', boonKey = '';
  function renderBottom() {
    if (!shown || !bottomEl) { return; }
    var st = d().status();
    if (!st.active) { return; }
    var globes = bottomEl.querySelectorAll('.d2-globe');
    if (globes.length < 2) { return; }
    var hpPct = st.hpMax ? core.clamp(st.hp / st.hpMax, 0, 1) * 100 : 0;
    var mpPct = st.mpMax ? core.clamp(st.mp / st.mpMax, 0, 1) * 100 : 0;
    globes[0].querySelector('.d2-liq').style.height = hpPct + '%';
    globes[0].querySelector('.d2-gv').textContent = core.fmt(st.hp) + ' / ' + core.fmt(st.hpMax);
    globes[0].classList.toggle('low', hpPct < 30);
    globes[1].querySelector('.d2-liq').style.height = mpPct + '%';
    globes[1].querySelector('.d2-gv').textContent = Math.round(st.mp) + ' / ' + Math.round(st.mpMax);

    /* 경험치 띠 — 원작에서 판 한가운데를 가로지르는 그 줄 */
    var pl = core.save.player;
    var need = core.expNeed(pl.level) || 1;
    var xp = bottomEl.querySelector('.d2-xp');
    if (xp) {
      xp.querySelector('i').style.width = core.clamp(pl.exp / need, 0, 1) * 100 + '%';
      xp.querySelector('span').textContent = 'Lv.' + pl.level;
    }

    /* 회차 노획 — 죽으면 잃는 값이라 늘 보여야 한다 */
    var lk = st.loot.gold + '|' + st.loot.items;
    var lootEl = bottomEl.querySelector('.d2-loot');
    if (lootEl && lk !== lootKey) {
      lootKey = lk;
      lootEl.innerHTML = '💼 금 <b>' + core.fmt(st.loot.gold) + '</b> · 장비 <b>' +
        st.loot.items + '</b>점' +
        '<span class="d2-keys">이동 WASD · 물약 1 2 3 4 · 스킬 Z X C V</span>';
    }

    /* 은사 — 이 회차에만 붙어 있는 것 */
    var bk = JSON.stringify(st.boons);
    var boonEl = bottomEl.querySelector('.d2-boonline');
    if (boonEl && bk !== boonKey) {
      boonKey = bk;
      var bl = '', key;
      for (key in st.boons) {
        if (!Object.prototype.hasOwnProperty.call(st.boons, key)) { continue; }
        var bd = global.DG.dungeonData.boonByKey(key);
        if (!bd) { continue; }
        bl += '<span class="dg-boon" title="' + bd.desc + '">' + bd.emoji +
          (st.boons[key] > 1 ? '<i>' + st.boons[key] + '</i>' : '') + '</span>';
      }
      boonEl.innerHTML = bl || '<span style="color:var(--ink-faint)">은사 없음</span>';
    }

    /* 요대 — 든 것과 개수 */
    var P = global.DG.potion;
    if (P) {
      var cells = bottomEl.querySelectorAll('[data-belt]');
      var bt = P.belt();
      for (var ci = 0; ci < cells.length; ci++) {
        var row = bt[ci];
        var em = cells[ci].querySelector('.d2-pe');
        var nn = cells[ci].querySelector('i');
        cells[ci].classList.toggle('empty', !row);
        if (row) {
          var kd = P.kindOf(row.kind);
          em.textContent = kd ? kd.emoji : '';
          nn.textContent = row.n > 1 ? row.n : '';
          cells[ci].title = P.label(row.kind, row.g) + ' ×' + row.n + '  (' + (ci + 1) + ')';
        } else {
          em.textContent = '';
          nn.textContent = '';
          cells[ci].title = (ci + 1);
        }
      }
    }

    var btns = bottomEl.querySelectorAll('.dg-skill');
    for (var i = 0; i < btns.length && i < st.skills.length; i++) {
      var sk = st.skills[i];
      var cdEl = btns[i].querySelector('.dg-sk-cd');
      var pct = sk.cdMax ? (sk.cd / sk.cdMax) * 100 : 0;
      cdEl.style.height = pct + '%';
      cdEl.textContent = sk.cd > 0.05 ? Math.ceil(sk.cd) : '';
      /* 걸린 무예가 바뀔 수 있으니 그림·값도 매 틱 맞춘다 (선두를 바꾸면 손이 바뀐다) */
      btns[i].querySelector('.dg-sk-e').textContent = sk.emoji;
      btns[i].querySelector('.dg-sk-cost').textContent = sk.empty ? '' : sk.cost;
      btns[i].title = sk.empty ? '무예를 걸어 두세요'
        : (sk.name + ' ' + (sk.rank || 1) + '단 — ' + sk.desc);
      btns[i].classList.toggle('empty', !!sk.empty);
      btns[i].classList.toggle('ready', sk.ready);
      btns[i].classList.toggle('nomana', !sk.empty && sk.cd <= 0 && !sk.ready);
    }
  }

  var choiceKey = '';
  function renderChoice() {
    if (!shown) { return; }
    var st = d().status();
    var c = st.active ? st.choice : null;
    var mc = st.active ? st.merchantChoice : null;
    var k = c ? 'b:' + c.join(',') :
      (mc ? 'm:' + mc.map(function (r) { return r.item.uid; }).join(',') : '');
    if (k === choiceKey) { return; }
    choiceKey = k;
    if (!c && !mc) { choiceEl.classList.remove('show'); choiceEl.innerHTML = ''; return; }
    var html;
    if (c) {
      html = '<div class="dg-choice-in"><h4>은사(恩賜)를 하나 받는다</h4><div class="dg-cards">';
      for (var i = 0; i < c.length; i++) {
        var b = global.DG.dungeonData.boonByKey(c[i]);
        if (!b) { continue; }
        var have = st.boons[b.key] || 0;
        html += '<button class="dg-card" data-boon="' + b.key + '">' +
          '<span class="dg-ce">' + b.emoji + '</span>' +
          '<b>' + b.name + '</b>' +
          '<small>' + b.desc + '</small>' +
          (have ? '<i class="dg-have">보유 ' + have + '</i>' : '') +
          '</button>';
      }
      html += '</div><small class="muted">은사는 이 회차에만 남습니다 — 죽거나 나가면 사라집니다</small></div>';
    } else {
      /* 행상(POI: Merchant) — 은사와 같은 석판 틀을 쓰되 물건·값을 보여 준다 */
      var IT = global.DG.item;
      html = '<div class="dg-choice-in"><h4>🧺 행상 · 살 것을 고른다</h4><div class="dg-cards">';
      for (var j = 0; j < mc.length; j++) {
        var row = mc[j], t = IT.tierOf(row.item);
        var afford = core.save.player.gold >= row.price;
        html += '<button class="dg-card" data-buy="' + j + '"' + (afford ? '' : ' disabled') + '>' +
          '<b style="color:' + t.color + '">' + IT.name(row.item) + '</b>' +
          '<small>' + t.name + '</small>' +
          '<i class="dg-have">금 ' + core.fmt(row.price) + '</i>' +
          '</button>';
      }
      html += '</div><button class="dg-card" data-leave-merchant style="margin-top:10px">' +
        '떠난다</button>' +
        '<small class="muted">이 행상은 여기서만 만난다 — 놓치면 다시 안 옵니다</small></div>';
    }
    choiceEl.innerHTML = html;
    choiceEl.classList.add('show');
  }

  /* ── 그리기 ───────────────────────────────────────────── */

  /* 방 종류는 data-dungeon.js 의 ROOMS 가 정본이다 — 여기에 없는 종류를 적어 두면
     영영 안 뜨는 아이콘이 남는다(서고 📖 가 실제로 그렇게 남아 있었다). */
  var DOOR_ICON = { fight: '⚔️', trove: '🎁', well: '💧', shrine: '⛩️', stair: '🪜',
    elite: '💠', miniboss: '👹', cave: '⛏️', merchant: '🧺', puzzle: '🧩' };

  /** 3D 를 쓰는 동안에는 2D 캔버스를 비워 둔다 (같은 그림을 두 번 그리지 않게) */
  function sync3d() {
    var on = !!(global.DG.dungeon3d && global.DG.dungeon3d.active());
    var el3 = document.getElementById('dg3d');
    if (el3) { el3.style.display = on ? 'block' : 'none'; }
    /* 2D 캔버스는 **입력을 받는 자리**라 지우지 않고 투명하게만 둔다(css `body.dg3d`) */
    if (document.body) { document.body.classList.toggle('dg3d', on); }
    return on;
  }

  function draw() {
    if (!shown || !ctx) { return; }
    var run = d().raw();
    if (!run) { return; }
    if (sync3d()) {
      /* 3D 가 그렸다 — 2D 방 그림은 건너뛴다. 조작판(HUD)은 DOM 이라 그대로다 */
      var m3 = metrics();
      ctx.clearRect(0, 0, m3.cw, m3.ch);
      global.DG.dungeon3d.resize();
      global.DG.dungeon3d.render();
      return;
    }
    var m = metrics();
    var W = d().ROOM_W, H = d().ROOM_H, WALLT = d().WALL;
    var theme = run.theme || DD.themeOf(run.floor);
    var now = Date.now();
    var i, p;

    if (run.room !== goreRoom) { goreRoom = run.room; gore = []; }

    ctx.clearRect(0, 0, m.cw, m.ch);
    ctx.save();

    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      shake -= 0.7;
    }

    /* 방 밖 배경 — 돌 어둠 */
    var bg = ctx.createLinearGradient(0, 0, 0, m.ch);
    bg.addColorStop(0, '#08090d');
    bg.addColorStop(1, '#0e1015');
    ctx.fillStyle = bg;
    ctx.fillRect(-30, -30, m.cw + 60, m.ch + 60);

    /* 바닥 마름모 */
    var c00 = proj(m, 0, 0), cW0 = proj(m, W, 0), cWH = proj(m, W, H), c0H = proj(m, 0, H);
    ctx.beginPath();
    ctx.moveTo(c00.x, c00.y); ctx.lineTo(cW0.x, cW0.y);
    ctx.lineTo(cWH.x, cWH.y); ctx.lineTo(c0H.x, c0H.y);
    ctx.closePath();
    var fg = ctx.createLinearGradient(0, c00.y, 0, cWH.y);
    fg.addColorStop(0, shade(theme.floor, -0.25));
    fg.addColorStop(0.5, theme.floor);
    fg.addColorStop(1, shade(theme.floor, 0.06));
    ctx.fillStyle = fg;
    ctx.fill();

    /* 바닥 판석(板石) — 원작의 바닥은 매끈한 면이 아니라 **낱장 돌**이다.
       칸마다 밝기를 조금씩 흔들고 이음선을 어둡게 파면, 그림 한 장 없이도
       돌을 깐 바닥으로 읽힌다. 흔들림은 hash2 라 방이 같으면 무늬도 같다
       (매 프레임 달라지면 바닥이 지글거린다). */
    var TS = 40, gx, gy, q0, q1, q2, q3, v;
    ctx.lineWidth = 1;
    for (gx = 0; gx < W; gx += TS) {
      for (gy = 0; gy < H; gy += TS) {
        var x2 = Math.min(gx + TS, W), y2 = Math.min(gy + TS, H);
        q0 = proj(m, gx, gy); q1 = proj(m, x2, gy);
        q2 = proj(m, x2, y2); q3 = proj(m, gx, y2);
        ctx.beginPath();
        ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y);
        ctx.lineTo(q2.x, q2.y); ctx.lineTo(q3.x, q3.y);
        ctx.closePath();
        /* 칸 **번호**로 흔든다 — 좌표(40의 배수)로 해싱하면 값이 규칙적으로
           맞물려 바닥이 체크무늬가 된다(실제로 그렇게 나왔다). */
        v = (core.hash2(gx / TS * 13 + gy / TS * 7, gy / TS * 29 + run.floor) - 0.5) * 0.09;
        ctx.fillStyle = shade(theme.floor, v);
        ctx.fill();
        /* 이음선 — 아래로 파인 쪽만 밝게 하면 돌이 솟아 보인다 */
        ctx.strokeStyle = 'rgba(0,0,0,0.34)';
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(q3.x, q3.y); ctx.lineTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.022)';
        ctx.stroke();
        /* 드물게 깨진 돌 하나 — 같은 무늬가 끝없이 반복되는 것을 끊는다 */
        if (core.hash2(gx / TS + 7, gy / TS + 13) > 0.86) {
          ctx.beginPath();
          ctx.moveTo((q0.x + q2.x) / 2, (q0.y + q2.y) / 2);
          ctx.lineTo(q1.x, q1.y);
          ctx.strokeStyle = 'rgba(0,0,0,0.34)';
          ctx.stroke();
        }
      }
    }

    /* 핏자국 — 판석 위, 균열 아래 */
    for (i = 0; i < gore.length; i++) {
      var gr0 = gore[i];
      ctx.save();
      ctx.globalAlpha = gr0.a;
      ctx.fillStyle = gr0.big ? '#4a0a06' : '#380806';
      for (var gj = 0; gj < 3; gj++) {
        ctx.beginPath();
        isoEllipse(ctx, m,
          gr0.x + (gr0.s[gj] - 0.5) * gr0.r * 1.6,
          gr0.y + (gr0.s[gj + 3] - 0.5) * gr0.r * 1.6,
          gr0.r * (0.45 + gr0.s[gj] * 0.55));
        ctx.fill();
      }
      ctx.restore();
    }

    /* 균열 */
    var dec = run.room.decor || [], di, o;
    ctx.strokeStyle = 'rgba(0,0,0,0.32)';
    ctx.lineWidth = 1.4;
    for (di = 0; di < dec.length; di++) {
      o = dec[di];
      if (o.t !== 'crack') { continue; }
      var ca = Math.cos(o.a), sa = Math.sin(o.a), L = o.len / 2;
      var pts = [[-L, 0], [-L / 3, -3], [L / 3, 2], [L, -1]];
      ctx.beginPath();
      for (var pi = 0; pi < pts.length; pi++) {
        var wx = o.x + pts[pi][0] * ca - pts[pi][1] * sa;
        var wy = o.y + pts[pi][0] * sa + pts[pi][1] * ca;
        var pp = proj(m, wx, wy);
        if (pi === 0) { ctx.moveTo(pp.x, pp.y); } else { ctx.lineTo(pp.x, pp.y); }
      }
      ctx.stroke();
    }

    /* 안쪽 통행 경계 (벽 두께만큼 안쪽) */
    var i1 = proj(m, WALLT, WALLT), i2 = proj(m, W - WALLT, WALLT),
        i3 = proj(m, W - WALLT, H - WALLT), i4 = proj(m, WALLT, H - WALLT);
    ctx.beginPath();
    ctx.moveTo(i1.x, i1.y); ctx.lineTo(i2.x, i2.y);
    ctx.lineTo(i3.x, i3.y); ctx.lineTo(i4.x, i4.y);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    /* 뒷벽 두 장 — (0,0)-(W,0) 위-오른쪽, (0,0)-(0,H) 위-왼쪽 */
    var wh = WALLH * m.s;
    wall(ctx, c00, cW0, wh, shade(theme.wall, 0.10), shade(theme.wall, -0.34));
    wall(ctx, c00, c0H, wh, shade(theme.wall, -0.18), shade(theme.wall, -0.50));

    /* 벽 횃불 — 여태 **빛만 있고 불이 없었다**. 어둠을 뚫는 구멍의 출처가
       화면에 안 보이면 조명이 아니라 얼룩으로 읽힌다. */
    for (di = 0; di < dec.length; di++) {
      if (dec[di].t === 'torch') { drawTorch(m, dec[di], now); }
    }

    /* 앞쪽 낮은 턱 — 방의 경계는 보이되 캐릭터를 가리지 않게 */
    rim(ctx, c0H, cWH, 9 * m.s, shade(theme.wall, -0.15));
    rim(ctx, cW0, cWH, 9 * m.s, shade(theme.wall, -0.3));

    /* 문 — 오른쪽 벽(x=W) 자리. 열리면 금빛으로 빛난다 */
    var open = run.room.cleared;
    for (i = 0; i < run.room.doors.length; i++) {
      var dr = run.room.doors[i];
      var dp1 = proj(m, W - WALLT, dr.y - 26), dp2 = proj(m, W - WALLT, dr.y + 26);
      var dp3 = proj(m, W, dr.y + 26), dp4 = proj(m, W, dr.y - 26);
      ctx.beginPath();
      ctx.moveTo(dp1.x, dp1.y); ctx.lineTo(dp2.x, dp2.y);
      ctx.lineTo(dp3.x, dp3.y); ctx.lineTo(dp4.x, dp4.y);
      ctx.closePath();
      ctx.fillStyle = open
        ? 'rgba(245,180,69,' + (0.55 + Math.sin(now / 300 + i) * 0.15) + ')'
        : 'rgba(120,120,130,0.4)';
      ctx.fill();
      var dc = proj(m, W - WALLT / 2, dr.y);
      ctx.font = Math.round(19 * m.s + 8) + 'px "Malgun Gothic", system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = open ? 1 : 0.45;
      ctx.fillText(DOOR_ICON[dr.kind] || '⚔️', dc.x, dc.y - 8 * m.s);
      ctx.globalAlpha = 1;
    }

    /* ── 깊이 정렬 대상 (기둥·장치·적·플레이어) ── */
    var items = [];

    for (di = 0; di < dec.length; di++) {
      o = dec[di];
      if (o.t === 'pillar') {
        items.push({ z: o.x + o.y, kind: 'pillar', o: o });
      } else if (o.t === 'jar') {
        items.push({ z: o.x + o.y, kind: 'jar', o: o });
      }
    }
    thingItem(items, run.room.chest, run.room.chest && run.room.chest.taken ? '📭' : '🎁');
    thingItem(items, run.room.well, run.room.well && run.room.well.used ? '🕳️' : '💧');
    thingItem(items, run.room.shrine, run.room.shrine && run.room.shrine.used ? '🪨' : '⛩️');
    thingItem(items, run.room.vein, run.room.vein && run.room.vein.used ? '🕳️' : '⛏️');
    thingItem(items, run.room.merchant, run.room.merchant && run.room.merchant.used ? '🚶' : '🧺');
    if (run.room.puzzle) {
      var pzPods = run.room.puzzle.pods;
      for (var pzi = 0; pzi < pzPods.length; pzi++) {
        thingItem(items, pzPods[pzi], pzPods[pzi].lit ? '🔆' : '🗿');
      }
    }

    for (i = 0; i < run.room.enemies.length; i++) {
      var e = run.room.enemies[i];
      if (e.hp <= 0) { continue; }
      items.push({ z: e.x + e.y, kind: 'foe', o: e });
    }
    /* 마을 사람과 표식 — 던전에는 없다(빈 배열이라 그냥 지나간다).
       **플레이어와의 거리**를 같이 담는다. 이름표를 아홉 개 늘 띄우면 폰에서
       글자가 뭉쳐 아무것도 못 읽는다 — 원작도 가리킨 것 하나만 이름을 보여 준다. */
    var npcs = run.room.npcs || [], marks = run.room.marks || [];
    var NEAR = 170;
    for (i = 0; i < npcs.length; i++) {
      items.push({ z: npcs[i].x + npcs[i].y, kind: 'npc', o: npcs[i],
        near: Math.hypot(npcs[i].x - run.player.x, npcs[i].y - run.player.y) < NEAR });
    }
    for (i = 0; i < marks.length; i++) {
      items.push({ z: marks[i].x + marks[i].y, kind: 'mark', o: marks[i],
        near: Math.hypot(marks[i].x - run.player.x, marks[i].y - run.player.y) < NEAR });
    }
    items.push({ z: run.player.x + run.player.y, kind: 'player', o: run.player });

    items.sort(function (a, b) { return a.z - b.z; });

    /* 바닥에 떨어진 것 (이름표는 조명 뒤에 다시 그린다) */
    var plates = [];
    for (i = 0; i < run.room.drops.length; i++) {
      var dp = run.room.drops[i];
      var bob = Math.sin((now + i * 300) / 320) * 2;
      p = proj(m, dp.x, dp.y);
      ctx.beginPath();
      isoEllipse(ctx, m, dp.x, dp.y, 6);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
      if (dp.kind === 'gold') {
        ctx.beginPath();
        ctx.arc(p.x, p.y - 5 + bob, 5.5 * Math.max(0.7, m.s), 0, Math.PI * 2);
        ctx.fillStyle = '#f0c45a'; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      } else if (dp.kind === 'scroll') {
        /* 감정서 — 말린 두루마리 */
        var sz = Math.max(0.7, m.s);
        ctx.fillStyle = '#d8ceb0';
        ctx.fillRect(p.x - 6 * sz, p.y - 10 * sz + bob, 12 * sz, 5 * sz);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x - 6 * sz, p.y - 10 * sz + bob, 12 * sz, 5 * sz);
        plates.push({ x: p.x, y: p.y - 20 * sz + bob, text: '감정서', color: '#8ec7ff' });
      } else if (dp.kind === 'potion') {
        /* 단약 — 작은 병. 이름표는 등급색 대신 그 물약의 색이다 */
        var P2 = global.DG.potion;
        var pz = Math.max(0.7, m.s);
        var pk = P2.kindOf(dp.p.kind), pg = P2.gradeOf(dp.p.g);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - 6 * pz + bob, 4 * pz, 5.5 * pz, 0, 0, Math.PI * 2);
        ctx.fillStyle = pk.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = 'rgba(220,210,190,0.9)';
        ctx.fillRect(p.x - 1.4 * pz, p.y - 13 * pz + bob, 2.8 * pz, 3.5 * pz);
        plates.push({ x: p.x, y: p.y - 20 * pz + bob,
          text: pg.name + ' ' + pk.short, color: pk.color });
      } else if (dp.kind === 'mat') {
        /* 세공 재료 — 보석은 둥글게, 부문(符文)은 글자로 */
        var GD = global.DG.gemData;
        var mz = Math.max(0.7, m.s);
        var mm = dp.mat;
        if (mm.kind === 'rune') {
          var rd = GD.runeByKey(mm.key);
          ctx.font = 'bold ' + (13 * mz) + 'px serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#f0a53a';
          ctx.fillText(rd ? rd.glyph : '符', p.x, p.y - 5 + bob);
          ctx.textAlign = 'left';
          plates.push({ x: p.x, y: p.y - 20 * mz + bob,
            text: rd ? (rd.glyph + '(' + rd.name + ')') : '부문', color: '#f0a53a' });
        } else {
          var gd = GD.gemByKey(mm.key), gr = GD.grade(mm.g);
          ctx.beginPath();
          ctx.arc(p.x, p.y - 6 + bob, 5 * mz, 0, Math.PI * 2);
          ctx.fillStyle = gr.color; ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.stroke();
          plates.push({ x: p.x, y: p.y - 19 * mz + bob,
            text: (gd ? gd.name : '보석'), color: gr.color });
        }
      } else {
        var t = global.DG.item.tierOf(dp.item);
        var dz = Math.max(0.7, m.s);
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 14 * dz + bob);
        ctx.lineTo(p.x + 6 * dz, p.y - 7 * dz + bob);
        ctx.lineTo(p.x, p.y + bob);
        ctx.lineTo(p.x - 6 * dz, p.y - 7 * dz + bob);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1; ctx.stroke();
        plates.push({ x: p.x, y: p.y - 20 * dz + bob,
          text: global.DG.item.name(dp.item), color: t.color });
      }
    }

    /* 정렬된 것들 그리기 */
    var bars = [];
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.kind === 'jar') { drawJar(m, it.o, now); }
      else if (it.kind === 'pillar') { drawPillar(m, it.o, theme, wh); }
      else if (it.kind === 'thing') { drawThing(m, it.o, it.icon, now); }
      else if (it.kind === 'foe') { drawFoe(m, it.o, now, bars); }
      else if (it.kind === 'npc') { drawNpc(m, it.o, now, plates, it.near); }
      else if (it.kind === 'mark') { drawMark(m, it.o, now, plates, it.near); }
      else { drawPlayer(m, run, now); }
    }

    /* 기공파 */
    for (i = 0; i < run.shots.length; i++) {
      var sh = run.shots[i];
      p = proj(m, sh.x, sh.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y - 10, 7 * Math.max(0.7, m.s), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(120,220,255,0.9)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x - sh.dx * 10, p.y - 10 - sh.dy * 6, 4 * Math.max(0.7, m.s), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(120,220,255,0.35)';
      ctx.fill();
    }

    /* 연출 (조명 아래층) — 같은 김에 **새로 터진 격파**에서 핏자국을 하나 받는다.
       fx 객체에 표시를 남겨 두 번 세지 않는다 (dungeon.js 는 life 만 보므로 안전하다). */
    var fxs = d().fx();
    for (i = 0; i < fxs.length; i++) {
      var fu = fxs[i];
      if (fu.t === 'pop' && !fu.goreDone) {
        fu.goreDone = true;
        if (gore.length >= GORE_MAX) { gore.shift(); }
        gore.push({
          x: fu.x, y: fu.y, r: fu.boss ? 26 : 13, big: !!fu.boss,
          a: fu.boss ? 0.55 : 0.36,
          s: [core.hash2(Math.round(fu.x), Math.round(fu.y)),
              core.hash2(Math.round(fu.x) + 3, Math.round(fu.y)),
              core.hash2(Math.round(fu.x), Math.round(fu.y) + 3),
              core.hash2(Math.round(fu.x) + 5, Math.round(fu.y) + 7),
              core.hash2(Math.round(fu.x) + 9, Math.round(fu.y) + 1),
              core.hash2(Math.round(fu.x) + 2, Math.round(fu.y) + 11)]
        });
      }
      drawFxUnder(m, fu);
    }

    ctx.restore();

    /* ── 조명 — 어둠 레이어에 빛 구멍을 뚫는다 ── */
    drawLights(m, run, theme, now);
    ctx.drawImage(lightCv, 0, 0, m.cw, m.ch);

    /* ── 조명 위층: 이름표 · 체력바 · 숫자 연출 (항상 읽히게) ── */
    ctx.save();
    /* 바닥에 떨어진 것의 이름 — 원작에서 물건은 **바닥에 이름으로 놓인다**.
       네모난 검은 쪽지에 등급색 글씨, 모서리는 각지게. 둥근 모서리를 주면
       그 순간 요즘 앱의 알림처럼 보인다. */
    for (i = 0; i < plates.length; i++) {
      var pl = plates[i];
      ctx.font = '600 11px ' + D2_FONT;
      var tw = ctx.measureText(pl.text).width;
      ctx.fillStyle = 'rgba(0,0,0,0.80)';
      ctx.fillRect(pl.x - tw / 2 - 6, pl.y - 9, tw + 12, 16);
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.lineWidth = 1;
      ctx.strokeRect(pl.x - tw / 2 - 6.5, pl.y - 9.5, tw + 13, 17);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = pl.color;
      ctx.fillText(pl.text, pl.x, pl.y - 1);
    }
    for (i = 0; i < bars.length; i++) {
      var br = bars[i];
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(br.x - br.w / 2 - 1, br.y - 1, br.w + 2, 5);
      ctx.fillStyle = br.boss ? '#c82a18' : (br.color || '#9c1109');
      ctx.fillRect(br.x - br.w / 2, br.y, br.w * br.p, 3);
      if (br.name) {
        ctx.font = '600 10px ' + D2_FONT;
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillStyle = br.color || '#f0a53a';
        ctx.fillText(br.name, br.x, br.y - 3);
      }
    }
    var fxs2 = d().fx();
    for (i = 0; i < fxs2.length; i++) { drawFxOver(m, fxs2[i]); }
    ctx.restore();

    /* 피격 시 화면이 붉어진다 + 흔들림 */
    var st = d().status();
    if (st.active) {
      if (st.hp < lastHp) { shake = Math.max(shake, 6); }
      lastHp = st.hp;
      for (i = 0; i < fxs2.length; i++) {
        if (fxs2[i].t === 'pop' && fxs2[i].life > 0.42) {
          shake = Math.max(shake, fxs2[i].boss ? 12 : 4);
        }
      }
      var low = st.hpMax ? st.hp / st.hpMax : 1;
      if (low < 0.34) {
        ctx.fillStyle = 'rgba(200,40,40,' + (0.20 * (1 - low / 0.34)) + ')';
        ctx.fillRect(0, 0, m.cw, m.ch);
      }
    }
  }

  /** 뒷벽 한 장 — 아랫변 p1→p2 를 위로 h 만큼 뽑는다 */
  function wall(c, p1, p2, h, colTop, colBot) {
    c.beginPath();
    c.moveTo(p1.x, p1.y - h);
    c.lineTo(p2.x, p2.y - h);
    c.lineTo(p2.x, p2.y);
    c.lineTo(p1.x, p1.y);
    c.closePath();
    var wg = c.createLinearGradient(0, p1.y - h, 0, Math.max(p1.y, p2.y));
    wg.addColorStop(0, colTop);
    wg.addColorStop(1, colBot);
    c.fillStyle = wg;
    c.fill();
    /* 벽돌 줄눈 */
    c.strokeStyle = 'rgba(0,0,0,0.22)';
    c.lineWidth = 1;
    for (var k = 1; k < 4; k++) {
      var t = k / 4;
      c.beginPath();
      c.moveTo(p1.x + (p2.x - p1.x) * t, p1.y + (p2.y - p1.y) * t - h);
      c.lineTo(p1.x + (p2.x - p1.x) * t, p1.y + (p2.y - p1.y) * t);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(p1.x, p1.y - h * 0.5);
    c.lineTo(p2.x, p2.y - h * 0.5);
    c.stroke();
  }

  /** 앞쪽 낮은 턱 */
  function rim(c, p1, p2, h, col) {
    c.beginPath();
    c.moveTo(p1.x, p1.y - h);
    c.lineTo(p2.x, p2.y - h);
    c.lineTo(p2.x, p2.y);
    c.lineTo(p1.x, p1.y);
    c.closePath();
    c.fillStyle = col;
    c.globalAlpha = 0.55;
    c.fill();
    c.globalAlpha = 1;
  }

  function thingItem(items, o, icon) {
    if (!o) { return; }
    items.push({ z: o.x + o.y, kind: 'thing', o: o, icon: icon });
  }

  function drawThing(m, o, icon, now) {
    var p = proj(m, o.x, o.y);
    ctx.beginPath();
    isoEllipse(ctx, m, o.x, o.y, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    ctx.font = Math.round(22 * m.s + 8) + 'px "Malgun Gothic", system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(icon, p.x, p.y - 12 * m.s + Math.sin(now / 500) * 2);
  }

  /**
   * 마을 사람 하나 — **플레이어와 같은 붓**(sprite.stamp)으로 그린다.
   * 다른 붓을 쓰면 마을에서만 사람이 다르게 생겨서 곧바로 눈에 걸린다.
   * 이름표는 여기서 바로 그리지 않고 plates 에 얹는다 — 조명 뒤에 그려야
   * 어둠에 먹히지 않는다(바닥에 떨어진 물건 이름과 같은 처리다).
   */
  function drawNpc(m, o, now, plates, near) {
    var p = proj(m, o.x, o.y);
    var sf = m.s * 1.12;
    var z = Math.max(0.7, m.s);
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    isoEllipse(ctx, m, o.x, o.y, 12);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();
    global.DG.sprite.stamp(ctx, {
      kind: 'human', ref: o.ref,
      x: p.x, y: p.y, s: 0.86 * sf, facing: o.facing,
      phase: o.phase, walking: false,
      color: o.color, look: global.DG.sprite.lookOf(o.ref), t: now
    });
    /* 멀면 **무슨 일을 하는 사람인지**만(그림 하나), 다가서면 이름까지.
       아홉을 다 이름으로 띄우면 폰에서 글자가 겹쳐 죄다 못 읽는다. */
    plates.push({ x: p.x, y: p.y - 44 * z,
      text: near ? (o.emoji + ' ' + o.name) : o.emoji, color: '#e6d3a6' });
  }

  /**
   * 표식 하나 — 사람이 아니라 **밟는 자리**다. 굴혈 입구 · 역참 돌 · 결사비.
   * 발밑 고리가 숨 쉬듯 늘었다 줄어든다 — 원작의 웨이포인트가 그렇게 뛴다.
   * 이 고리가 없으면 바닥에 이모지 하나 놓인 것으로만 보여서 밟을 것인 줄 모른다.
   */
  function drawMark(m, o, now, plates, near) {
    var p = proj(m, o.x, o.y);
    var z = Math.max(0.7, m.s);
    var puls = 0.5 + Math.sin(now / 420) * 0.5;
    ctx.save();
    ctx.beginPath();
    isoEllipse(ctx, m, o.x, o.y, 15);
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fill();
    ctx.beginPath();
    isoEllipse(ctx, m, o.x, o.y, 26 + puls * 5);
    ctx.strokeStyle = 'rgba(245,180,69,' + (0.18 + puls * 0.24).toFixed(3) + ')';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    ctx.font = Math.round(23 * m.s + 9) + 'px "Malgun Gothic", system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(o.emoji, p.x, p.y - 13 * m.s + Math.sin(now / 500) * 2);
    /* 표식은 바닥에 큰 그림이 이미 있다 — 멀면 이름표를 걸지 않는다 */
    if (near) {
      plates.push({ x: p.x, y: p.y - 38 * z, text: o.name, color: '#f5b445' });
    }
  }

  /** 벽에 걸린 횃불 하나 — 받침과 흔들리는 불꽃 */
  function drawTorch(m, o, now) {
    var p = proj(m, o.x, o.y);
    var z = Math.max(0.8, m.s);
    var base = p.y - 22 * z;
    /* 받침 */
    ctx.fillStyle = '#2b2018';
    ctx.fillRect(p.x - 2 * z, base, 4 * z, 12 * z);
    ctx.fillStyle = '#40301f';
    ctx.fillRect(p.x - 4 * z, base - 2 * z, 8 * z, 3 * z);
    /* 불꽃 — 세 겹 (겉 주황 · 속 노랑 · 심 흰빛) */
    var fl = Math.sin(now / 90 + o.seed) * 0.18 + Math.sin(now / 37 + o.seed * 2) * 0.08;
    var hgt = (13 + fl * 5) * z;
    function flame(w, h, col, off) {
      ctx.beginPath();
      ctx.moveTo(p.x, base - h - off);
      ctx.quadraticCurveTo(p.x + w, base - h * 0.35, p.x, base + 1);
      ctx.quadraticCurveTo(p.x - w, base - h * 0.35, p.x, base - h - off);
      ctx.fillStyle = col;
      ctx.fill();
    }
    flame(5.2 * z, hgt, 'rgba(226,96,20,0.92)', 0);
    flame(3.2 * z, hgt * 0.72, 'rgba(252,178,48,0.95)', 0);
    flame(1.6 * z, hgt * 0.40, 'rgba(255,240,190,0.95)', 0);
  }

  /** 항아리 — 성한 것은 배가 부르고, 깨진 것은 조각만 남는다 */
  function drawJar(m, o, now) {
    var p = proj(m, o.x, o.y);
    var z = Math.max(0.7, m.s);
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    isoEllipse(ctx, m, o.x, o.y, 7);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();
    if (o.broken) {
      ctx.fillStyle = '#4a3a2a';
      ctx.beginPath();
      ctx.moveTo(p.x - 7 * z, p.y);
      ctx.lineTo(p.x - 2 * z, p.y - 5 * z);
      ctx.lineTo(p.x + 3 * z, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(p.x + 3 * z, p.y - 2 * z, 4 * z, 2 * z);
      return;
    }
    var jg = ctx.createLinearGradient(p.x - 8 * z, 0, p.x + 8 * z, 0);
    jg.addColorStop(0, '#3a2c1e');
    jg.addColorStop(0.42, '#6b5236');
    jg.addColorStop(1, '#2a2016');
    ctx.fillStyle = jg;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - 8 * z, 7 * z, 9 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a3a26';
    ctx.fillRect(p.x - 3.5 * z, p.y - 18 * z, 7 * z, 3 * z);
  }

  function drawPillar(m, o, theme, wh) {
    var p = proj(m, o.x, o.y);
    var w = 10 * m.s, h = wh * 0.72;
    ctx.beginPath();
    isoEllipse(ctx, m, o.x, o.y, 9);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();
    var pg = ctx.createLinearGradient(p.x - w, 0, p.x + w, 0);
    pg.addColorStop(0, shade(theme.wall, -0.35));
    pg.addColorStop(0.45, shade(theme.wall, 0.12));
    pg.addColorStop(1, shade(theme.wall, -0.5));
    ctx.fillStyle = pg;
    ctx.fillRect(p.x - w, p.y - h, w * 2, h);
    ctx.fillStyle = shade(theme.wall, -0.15);
    ctx.fillRect(p.x - w * 1.3, p.y - h - 4 * m.s, w * 2.6, 5 * m.s);
    ctx.fillRect(p.x - w * 1.3, p.y - 3 * m.s, w * 2.6, 4 * m.s);
  }

  function drawFoe(m, e, now, bars) {
    var ref = e.ref;
    var p = proj(m, e.x, e.y);
    var sf = m.s * 1.12;
    /* 원작에서 인물은 화면에 꽤 크게 선다 — 작게 두면 아이소 지도처럼 보인다 */
    var s = (e.boss ? 1.12 : 0.76) * sf;
    var isHuman = ref.kind !== 'beast';
    var bodyH = (isHuman ? 40 : 30) * s;
    var el = e.elite ? d().eliteOf(e.elite) : null;

    /* 발밑 그림자 — 이게 없으면 인물이 바닥에 안 붙고 떠 보인다.
       원작의 인물에는 늘 발밑 그늘이 있다. */
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.beginPath();
    isoEllipse(ctx, m, e.x, e.y, e.r * 0.95);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();

    ctx.save();
    if (e.hurt > 0) { ctx.globalAlpha = 0.65; }
    /* 빙(氷)에 걸린 적 — 발밑이 푸르다. 왜 굼떠졌는지 보여야 한다 */
    if (e.slow > 0) {
      ctx.save();
      ctx.globalAlpha = 0.30;
      ctx.beginPath();
      isoEllipse(ctx, m, e.x, e.y, e.r + 5);
      ctx.fillStyle = '#5fa8e8';
      ctx.fill();
      ctx.restore();
    }
    if (el) {
      /* 정예 — 발밑에 그 접두의 빛을 깐다 (원작에서 이름 색이 다른 그 신호) */
      ctx.save();
      ctx.globalAlpha = 0.22 + Math.abs(Math.sin(now / 420)) * 0.16;
      ctx.beginPath();
      isoEllipse(ctx, m, e.x, e.y, e.r + 8);
      ctx.strokeStyle = el.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    global.DG.sprite.stamp(ctx, {
      kind: isHuman ? 'human' : 'beast',
      ref: ref, key: ref.name,
      x: p.x, y: p.y, s: s, facing: -1,
      phase: e.phase, walking: true,
      color: ref.color, look: ref.look, form: ref.form,
      divine: !!ref.divine, t: now
    });
    ctx.restore();
    /* 원작은 적 머리 위에 아무것도 띄우지 않는다 — 이름은 화면 위쪽 한 줄
       (#d2-foe) 이 맡는다. 다만 **깎여 나간 적**은 표가 나야 하므로,
       한 대라도 맞은 적에게만 얇은 줄을 남긴다. */
    if (e.hp < e.hpMax) {
      bars.push({
        x: p.x, y: p.y - bodyH - 10,
        w: (e.boss ? 52 : (el ? 36 : 26)) * Math.max(0.8, m.s),
        p: core.clamp(e.hp / e.hpMax, 0, 1),
        boss: e.boss,
        name: null,
        color: el ? el.color : null
      });
    }
  }

  function drawPlayer(m, run, now) {
    var lead = core.save.party.length ? global.DG.data.find(core.save.party[0]) : null;
    var pl = run.player;
    var p = proj(m, pl.x, pl.y);
    var sf = m.s * 1.12;

    /* 발밑 그림자 (적과 같은 이유) */
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    isoEllipse(ctx, m, pl.x, pl.y, 12);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();

    /* 사거리 표시 (아주 옅게) + 사기 버프 고리 */
    ctx.beginPath();
    isoEllipse(ctx, m, pl.x, pl.y, d().status().reach + 12);
    ctx.strokeStyle = 'rgba(120,200,255,0.10)';
    ctx.lineWidth = 1; ctx.stroke();
    if (pl.rallyUntil > now) {
      ctx.beginPath();
      isoEllipse(ctx, m, pl.x, pl.y, 24 + Math.sin(now / 160) * 3);
      ctx.strokeStyle = 'rgba(240,180,90,0.55)';
      ctx.lineWidth = 2; ctx.stroke();
    }
    /* 마을에서는 **내가 누구인지**가 안 보인다 — 서 있는 사람이 아홉이고
       다 같은 붓으로 그려지기 때문이다. 발밑 금빛 고리 하나로 가른다.
       던전에서는 필요 없다(거기 서 있는 사람은 나 하나다). */
    if (run.town) {
      ctx.beginPath();
      isoEllipse(ctx, m, pl.x, pl.y, 19);
      ctx.strokeStyle = 'rgba(245,180,69,0.60)';
      ctx.lineWidth = 2; ctx.stroke();
    }

    ctx.save();
    if (pl.hurt > 0) { ctx.globalAlpha = 0.6; }
    if (pl.dash) { ctx.globalAlpha = 0.85; }
    if (lead) {
      var fac = global.DG.data.faction(lead.faction);
      global.DG.sprite.stamp(ctx, {
        kind: 'human', ref: lead,
        x: p.x, y: p.y, s: 0.88 * sf, facing: pl.facing,
        phase: pl.phase, walking: pl.walking,
        color: fac.color, look: global.DG.sprite.lookOf(lead), t: now
      });
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y - 10, 11 * sf, 0, Math.PI * 2);
      ctx.fillStyle = '#f5b445'; ctx.fill();
    }
    ctx.restore();
  }

  /* ── 조명 레이어 ─────────────────────────────────────── */

  function drawLights(m, run, theme, now) {
    var c = lightCtx;
    c.clearRect(0, 0, m.cw, m.ch);
    /* 원작의 던전은 등불 반경 밖이 거의 검다 — 그 어둠이 "내려간다" 는 감각을 만든다.
       **마을은 그 반대다.** 불을 피워 두고 사람이 사는 자리라 훤하다 —
       던전과 같은 어둠을 씌우면 여섯 사람이 죄다 그림자에 잠겨 누가 누군지 안 보인다. */
    c.fillStyle = run.town ? 'rgba(3,3,6,0.30)' : 'rgba(2,2,4,0.74)';
    c.fillRect(0, 0, m.cw, m.ch);
    c.globalCompositeOperation = 'destination-out';

    /* 플레이어 빛 */
    hole(c, m, run.player.x, run.player.y, run.town ? 300 : 178, 1);

    /* 마을 표식 빛 — 밟을 자리는 멀리서도 보여야 간다 */
    var mks = run.room.marks || [];
    for (var mi = 0; mi < mks.length; mi++) {
      hole(c, m, mks[mi].x, mks[mi].y, 76, 0.8);
    }

    /* 횃불 빛 (일렁인다) */
    var dec = run.room.decor || [];
    for (var i = 0; i < dec.length; i++) {
      if (dec[i].t !== 'torch') { continue; }
      var fl = 0.72 + Math.sin(now / 140 + dec[i].seed) * 0.12;
      hole(c, m, dec[i].x, dec[i].y + 8, 118, fl);
    }
    /* 기공파 빛 */
    for (i = 0; i < run.shots.length; i++) {
      hole(c, m, run.shots[i].x, run.shots[i].y, 62, 0.9);
    }
    /* 열린 문 빛 */
    if (run.room.cleared) {
      for (i = 0; i < run.room.doors.length; i++) {
        hole(c, m, d().ROOM_W - 10, run.room.doors[i].y, 55, 0.7);
      }
    }

    /* 어둠을 뚫는 것으로 끝내지 않고 **불빛 색**을 덧댄다.
       원작의 횃불은 주황이고 그 언저리만 따뜻하다 — 이 한 겹이 없으면
       구멍만 뚫린 회색 무대가 된다. */
    c.globalCompositeOperation = 'lighter';
    glow(c, m, run.player.x, run.player.y, 170, 'rgba(255,186,112,0.085)');
    for (mi = 0; mi < mks.length; mi++) {
      glow(c, m, mks[mi].x, mks[mi].y, 80, 'rgba(255,196,96,0.10)');
    }
    for (i = 0; i < dec.length; i++) {
      if (dec[i].t !== 'torch') { continue; }
      var fw = 0.16 + Math.sin(now / 140 + dec[i].seed) * 0.05;
      glow(c, m, dec[i].x, dec[i].y + 8, 128, 'rgba(255,138,44,' + fw.toFixed(3) + ')');
    }
    for (i = 0; i < run.shots.length; i++) {
      glow(c, m, run.shots[i].x, run.shots[i].y, 60, 'rgba(120,200,255,0.12)');
    }
    if (run.room.cleared) {
      for (i = 0; i < run.room.doors.length; i++) {
        glow(c, m, d().ROOM_W - 10, run.room.doors[i].y, 58, 'rgba(255,196,96,0.11)');
      }
    }
    c.globalCompositeOperation = 'source-over';
  }

  /** 불빛 한 겹 — hole 과 같은 자리에 색을 얹는다 (composite 는 부르는 쪽이 정한다) */
  function glow(c, m, x, y, r, color) {
    var p = proj(m, x, y);
    var rx = r * 1.414 * IX * m.s, ry = r * 1.414 * IY * m.s;
    c.save();
    c.translate(p.x, p.y - 8 * m.s);
    c.scale(1, ry / rx);
    var g = c.createRadialGradient(0, 0, rx * 0.05, 0, 0, rx);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, rx, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  /** 어둠에 빛 구멍 하나 — 납작한 타원 그라디언트 */
  function hole(c, m, x, y, r, strength) {
    var p = proj(m, x, y);
    var rx = r * 1.414 * IX * m.s, ry = r * 1.414 * IY * m.s;
    c.save();
    c.translate(p.x, p.y - 8 * m.s);
    c.scale(1, ry / rx);
    var g = c.createRadialGradient(0, 0, rx * 0.12, 0, 0, rx);
    g.addColorStop(0, 'rgba(0,0,0,' + Math.min(1, strength) + ')');
    g.addColorStop(0.62, 'rgba(0,0,0,' + Math.min(1, strength * 0.55) + ')');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, rx, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  /* ── 연출 ─────────────────────────────────────────────── */

  /** 조명보다 아래 — 장면에 섞이는 것 (칼궤적·격파·돌진 잔상·회전참) */
  function drawFxUnder(m, f) {
    var p;
    if (f.t === 'slash') {
      p = proj(m, f.x, f.y);
      var a = (f.a || 0) * 0.5;              // 투영이 눕어 있어 각도를 죽인다
      ctx.save();
      ctx.translate(p.x, p.y - 10);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.arc(0, 0, 16 * Math.max(0.8, m.s), -0.7, 0.7);
      ctx.strokeStyle = f.crit ? 'rgba(255,220,120,' + (f.life / 0.16) + ')'
                               : 'rgba(240,245,255,' + (f.life / 0.16 * 0.85) + ')';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    } else if (f.t === 'pop') {
      ctx.beginPath();
      isoEllipse(ctx, m, f.x, f.y, (0.45 - f.life) * (f.boss ? 88 : 44));
      ctx.strokeStyle = 'rgba(255,220,150,' + (f.life / 0.45) + ')';
      ctx.lineWidth = 2; ctx.stroke();
    } else if (f.t === 'burst') {
      p = proj(m, f.x, f.y);
      var k = 1 - f.life / 0.5;
      ctx.save();
      ctx.globalAlpha = f.life / 0.5;
      ctx.fillStyle = f.color || '#c9a83a';
      for (var j = 0; j < (f.boss ? 10 : 6); j++) {
        var ang = f.seed + j * (6.283 / (f.boss ? 10 : 6));
        var rr = (10 + k * (f.boss ? 46 : 26)) * Math.max(0.8, m.s);
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(ang) * rr, p.y - 8 + Math.sin(ang) * rr * 0.5 - k * 14,
          (f.boss ? 3.4 : 2.4) * (1 - k * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (f.t === 'whirl') {
      ctx.beginPath();
      isoEllipse(ctx, m, f.x, f.y, f.r * (1.15 - f.life / 0.3 * 0.4));
      ctx.strokeStyle = 'rgba(150,220,255,' + (f.life / 0.3 * 0.8) + ')';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (f.t === 'ring') {
      ctx.beginPath();
      isoEllipse(ctx, m, f.x, f.y, (0.55 - f.life) * 130);
      ctx.strokeStyle = 'rgba(240,180,90,' + (f.life / 0.55) + ')';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else if (f.t === 'trail') {
      p = proj(m, f.x, f.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y - 10, 8 * (f.life / 0.22), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(150,220,255,' + (f.life / 0.22 * 0.3) + ')';
      ctx.fill();
    }
  }

  /** 조명 위 — 숫자·획득 문구 (어두워도 읽혀야 한다) */
  function drawFxOver(m, f) {
    var p;
    if (f.t === 'hit') {
      p = proj(m, f.x, f.y);
      var up = (0.6 - f.life) * 26;
      ctx.font = (f.crit ? '700 17px ' : '600 13px ') + D2_FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      /* 저항에 깎인 타격은 **흐린 잿빛**이다 — 숫자만 보고도 "안 통한다" 를 안다 */
      ctx.fillStyle = f.foe ? 'rgba(255,120,120,' + (f.life / 0.7) + ')'
                            : (f.crit ? 'rgba(255,220,120,' + (f.life / 0.6) + ')'
                                      : (f.resist ? 'rgba(150,150,160,' + (f.life / 0.6) + ')'
                                                  : 'rgba(255,255,255,' + (f.life / 0.6) + ')'));
      ctx.fillText((f.crit ? '★' : '') + f.v, p.x, p.y - 24 - up);
    } else if (f.t === 'elem') {
      /* 원소 피해 — 그 결의 색으로 뜬다. 독은 몇 초에 걸쳐 들어가므로 괄호를 씌운다 */
      p = proj(m, f.x, f.y);
      var eu = (0.6 - f.life) * 22;
      ctx.font = '700 12px ' + D2_FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = core.clamp(f.life / 0.6, 0, 1);
      ctx.fillStyle = f.color || '#fff';
      ctx.fillText((f.dot ? '(' + f.v + ')' : '' + f.v), p.x, p.y - 30 - eu);
      ctx.globalAlpha = 1;
    } else if (f.t === 'get') {
      p = proj(m, f.x, f.y);
      var uy = (1.1 - f.life) * 22;
      ctx.font = '600 11px ' + D2_FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = f.color || '#f0c45a';
      ctx.globalAlpha = core.clamp(f.life, 0, 1);
      ctx.fillText(f.text, p.x, p.y - 22 - uy);
      ctx.globalAlpha = 1;
    }
  }

  function roundedRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* ── 루프에서 불린다 ─────────────────────────────────── */

  function update(dt) {
    if (!DG_) { DG_ = global.DG.dungeon; DD = global.DG.dungeonData; }
    var on = d().active();
    if (on && !shown) { show(); }
    if (!on && shown) { hide(); }
    if (!on) { return; }
    d().update(dt);
    renderHud();
    renderBottom();
    renderFoe();
    renderChoice();
  }

  function init() {
    DG_ = global.DG.dungeon;
    DD = global.DG.dungeonData;
    build();
    hide();
    global.addEventListener('resize', function () { if (shown) { resize(); } });
    /* 던전이 끝나면 화면을 내렸었다. 이제는 **마을이 그 자리를 받는다** —
       update() 가 d().active() 로 알아서 갈아 끼우므로, 마을이 없을 때만 내린다.
       여기서 무조건 hide 하면 던전에서 나온 순간 한 틱 검게 깜빡인다. */
    core.on('dungeon:end', function () {
      var T = global.DG.town;
      if (!T || !T.active()) { hide(); }
    });
  }

  global.DG = global.DG || {};
  global.DG.dungeonView = {
    init: init, update: update, draw: draw,
    show: show, hide: hide,
    shown: function () { return shown; },
    /** 키 배치 — 1~4 는 요대, 스킬은 여기 넷 (진단이 이 약속을 검사한다) */
    SKILL_KEYS: SKILL_KEYS,
    /** 자가진단용 — 투영이 정확히 역변환되는지 검증한다 */
    _proj: function (x, y) { return proj(metrics(), x, y); },
    _unproj: toRoom
  };
})(window);
