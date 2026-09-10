/**
 * 화면 — 사가국지 (삼국지)
 * ---------------------------------------------------------------
 * 가운데는 **지도**다. 이 판에는 원래 지도가 없었다(강역이 목록이었다) —
 * 삼국지로 옮기면서 성 서른 곳과 그 사이의 길이 판 그 자체가 되었다.
 *
 *   지도    성을 누르면 그 성이 열린다. 우리 성이면 명령, 남의 성이면 출진·계략
 *   상단    연·월 · 세력 · 금 · 병력 · 군량 · 성 수 + **다음 달**
 *   독      🏯 성 · 👤 무장 · 🤝 외교 · 📚 학당(문답) · 📜 기록
 *
 * 판정은 한 줄도 여기 없다. 전부 rtk / war / diplo 를 부른다 —
 * 화면에서 셈을 하면 자가진단이 못 짚는 곳에 규칙이 생긴다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var CD = global.DG.cityData;
  var FD = global.DG.forceData;
  var ID = global.DG.item;

  var els = {};
  var openTab = null;
  var openCityId = null;
  var pickOrder = null;        // 명령을 고른 뒤 사람을 고르는 두 걸음
  var quizCur = null;
  var lastBattle = null;
  var pickScen = '194';        // 세력을 고르기 **전에** 고른 시나리오

  /* 개입형 실시간 전투(showBattleLive) — 지금 명령을 기다리는 중이면 여기 담긴다.
     act() 의 'bat-cmd' 손잡이가 이걸 불러 다음 합으로 잇는다 */
  var liveStep = null;
  var liveRepStub = null;
  var liveBase = null;

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function R() { return global.DG.rtk; }
  function off() { return global.DG.off; }

  /**
   * 초상 <img> 에 붙일 이름표. `portrait3d` 가 실제 모델로 그림을 다 구우면
   * 이 표를 보고 `src` 를 갈아 끼운다. 못 쓸 자리(three 없음 · 손잡이 내림)
   * 에서는 빈 문자열이라 **여태 그림이 그대로 남는다**.
   */
  function p3tag(ref, w, h) {
    var P3 = global.DG.portrait3d;
    if (!P3 || !P3.ready()) { return ''; }
    if (!p3tag.timer) {
      p3tag.timer = global.setTimeout(function () {
        p3tag.timer = null;
        P3.sweep();
      }, 40);
    }
    return ' data-p3="' + P3.keyOf('hero', ref, w, h) + '"';
  }

  function pt(ref, size) {
    var sz = size || 40;
    return '<img class="pt" alt=""' + p3tag(ref, sz, sz) + ' src="' +
      global.DG.sprite.portrait('hero', ref, sz) + '">';
  }

  /**
   * 무장 카드 큰 초상 — `pt()` 와 달리 정사각이 아니라 액자 비율이다.
   * CSS(`.pt{width:100%;height:100%}`)가 카드 폭만큼 늘려 보여주는데, 여태
   * `pt(h,52)` 로 52px 짜리를 그 자리에 늘여 써서 흐릿하게 뭉갰다(2026-09-03) —
   * 구울 해상도 자체를 표시 크기에 맞춘다. 되돌아가는 그림도 목록용 작은
   * `sprite.portrait()` 대신 액자·배경이 있는 `sprite.portraitCard()` 로 맞춘다.
   */
  function ptBig(ref, w, h) {
    w = w || 200; h = h || 224;
    return '<img class="pt" alt=""' + p3tag(ref, w, h) + ' src="' +
      global.DG.sprite.portraitCard('hero', ref, w, h) + '">';
  }

  function forceColor(id) {
    var f = FD.force(id);
    return f ? f.color : '#5b6572';
  }

  /* ── 지도 이동·확대(2026-09-10) ───────────────────────────
   * 세계가 삼국지 한 판이던 때는 늘 전체를 한눈에 보여주는 것으로 충분했다 —
   * 한국·일본·교주 등으로 늘어난 지금은 전체를 다 보여주면 성 하나하나가
   * 점 하나로 뭉개져 "내가 어느 땅을 가졌는지" 알아보기 어렵다. `renderMap()`
   * 의 viewBox 를 고정 문자열 대신 여기 상태(mapCx·mapCy·mapZoom)로 계산해
   * 확대·이동이 되게 한다 — **성·길 좌표(CD.CITIES)는 그대로다**, 보여주는
   * 창(viewBox)만 좁힌다. MAP_VB 는 `renderMap()` 이 그리는 전체 지도 범위와
   * 반드시 같아야 한다(그쪽 viewBox 주석 참고).
   */
  var MAP_VB = { x: -60, y: -30, w: 225, h: 180 };
  var MAP_ZOOM_MAX = 6;
  var mapCx = MAP_VB.x + MAP_VB.w / 2, mapCy = MAP_VB.y + MAP_VB.h / 2, mapZoom = 1;
  var MAP_PAN_SPEED = 0.022;   // 조이스틱을 완전히 기울였을 때 프레임당 이동(뷰포트 폭의 비율)

  function clampMapCenter() {
    var w = MAP_VB.w / mapZoom, h = MAP_VB.h / mapZoom;
    mapCx = core.clamp(mapCx, MAP_VB.x + w / 2, MAP_VB.x + MAP_VB.w - w / 2);
    mapCy = core.clamp(mapCy, MAP_VB.y + h / 2, MAP_VB.y + MAP_VB.h - h / 2);
  }
  function mapViewBox() {
    clampMapCenter();
    var w = MAP_VB.w / mapZoom, h = MAP_VB.h / mapZoom;
    return (mapCx - w / 2).toFixed(2) + ' ' + (mapCy - h / 2).toFixed(2) + ' ' +
      w.toFixed(2) + ' ' + h.toFixed(2);
  }
  /** renderMap() 을 통째로 다시 돌리지 않고 보이는 창만 바꾼다(조이스틱을
   *  쥔 동안 매 프레임 불러도 가볍다) */
  function applyMapViewNow() {
    var svg = els.realm && els.realm.querySelector('.rmap');
    if (svg) { svg.setAttribute('viewBox', mapViewBox()); }
  }
  function panMapBy(dx, dy) {
    var w = MAP_VB.w / mapZoom, h = MAP_VB.h / mapZoom;
    mapCx += dx * w * MAP_PAN_SPEED;
    mapCy += dy * h * MAP_PAN_SPEED;
    applyMapViewNow();
  }
  function zoomMapBy(factor) {
    mapZoom = core.clamp(mapZoom * factor, 1, MAP_ZOOM_MAX);
    applyMapViewNow();
  }
  /** "내 땅으로" — 내 성들의 무게중심으로 지도(2D·3D 다)를 옮기고, **내 땅의
   *  실제 넓이에 맞춰** 당긴다. 세력을 고른 직후에도 불러 처음부터 내 땅이
   *  보이게 한다.
   *
   *  2026-09-10 정정 — "시작시 너무 멀리서 시작해, 이동이 되면 멀리서 볼
   *  필요가 있나?"(사용자 피드백). 예전엔 늘 고정 배율(2.6)로만 당겨서
   *  전 세계 일부가 여전히 함께 보였다 — 이제 조이스틱·드래그·핀치로 얼마든
   *  더 넓게 볼 수 있으니, 기본값은 **내 성 몇 개만 꽉 차게 바짝** 당기고
   *  더 보고 싶으면 손으로 나가면 된다는 판단이다. 내 성들의 실제 좌표
   *  범위(bounding box)를 재서 그게 화면에 꽉 차는 배율을 스스로 구한다 —
   *  성 하나뿐이거나 다닥다닥 붙어 있어도 최소 폭(MIN_SPAN)만큼은 보장해
   *  카메라가 도시 안으로 파고들지 않게 한다.
   */
  var MIN_SPAN = 10;   // 지도 단위(0~100대, data-city.js 와 같은 잣대) — 성 하나뿐이어도 이만큼은 보여준다
  function centerOnMine(zoomTo) {
    var st = R().state();
    if (!st.started) { return; }
    var xs = [], ys = [], i;
    for (i = 0; i < CD.CITIES.length; i++) {
      var d = CD.CITIES[i];
      if (st.cities[d.id].force === st.me) { xs.push(d.x); ys.push(d.y); }
    }
    if (!xs.length) { return; }
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    /* 패딩 ×2 — 성 이름표·인접 성 일부까지 여백으로 보이게. 스팬이 0(성 하나)
       이어도 MIN_SPAN 이 바닥을 받쳐 카메라가 도시 안으로 안 들어간다 */
    var spanX = Math.max(maxX - minX, MIN_SPAN) * 2;
    var spanY = Math.max(maxY - minY, MIN_SPAN) * 2;
    var z = zoomTo || core.clamp(Math.min(MAP_VB.w / spanX, MAP_VB.h / spanY), 2, MAP_ZOOM_MAX);
    mapCx = cx; mapCy = cy; mapZoom = z;
    applyMapViewNow();
    if (global.DG.realm3d && global.DG.realm3d.panTo) {
      global.DG.realm3d.panTo(cx, cy, Math.max(spanX, spanY));
    }
  }

  /** 조이스틱(#rjoy) — 쥐고 있는 동안 2D(뷰박스) · 3D(궤도 중심) 중 지금
   *  보이는 쪽을 매 프레임 옮긴다. 판정은 없다 — 화면 이동뿐 */
  var mjoyId = null, mjoyCX = 0, mjoyCY = 0, mjoyDX = 0, mjoyDY = 0, mjoyLoop = false;
  var MJOY_R = 46, MJOY_DEAD = 8;
  function initMapStick() {
    var joyEl = $('rjoy'), knobEl = $('rjoy-knob');
    if (!joyEl || !knobEl) { return; }
    function knobAt(x, y) { knobEl.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
    function reset() { mjoyId = null; mjoyDX = 0; mjoyDY = 0; knobAt(0, 0); }
    function startLoop() {
      if (mjoyLoop) { return; }
      mjoyLoop = true;
      requestAnimationFrame(function tick() {
        if (mjoyDX || mjoyDY) {
          var R3 = global.DG.realm3d;
          if (R3 && R3.active()) { R3.panBy(mjoyDX, mjoyDY); } else { panMapBy(mjoyDX, mjoyDY); }
        }
        if (mjoyId !== null || mjoyDX || mjoyDY) { requestAnimationFrame(tick); }
        else { mjoyLoop = false; }
      });
    }
    joyEl.addEventListener('pointerdown', function (e) {
      if (mjoyId !== null) { return; }
      var r = joyEl.getBoundingClientRect();
      mjoyCX = r.left + r.width / 2; mjoyCY = r.top + r.height / 2;
      mjoyId = e.pointerId;
      joyEl.setPointerCapture && joyEl.setPointerCapture(e.pointerId);
      startLoop();
      e.preventDefault();
    });
    joyEl.addEventListener('pointermove', function (e) {
      if (e.pointerId !== mjoyId) { return; }
      var dx = e.clientX - mjoyCX, dy = e.clientY - mjoyCY;
      var len = Math.hypot(dx, dy);
      var kx = len > MJOY_R ? dx / len * MJOY_R : dx, ky = len > MJOY_R ? dy / len * MJOY_R : dy;
      knobAt(kx, ky);
      if (len < MJOY_DEAD) { mjoyDX = 0; mjoyDY = 0; return; }
      mjoyDX = dx / len; mjoyDY = dy / len;
      e.preventDefault();
    });
    function release(e) { if (e.pointerId === mjoyId) { reset(); } }
    joyEl.addEventListener('pointerup', release);
    joyEl.addEventListener('pointercancel', release);
    joyEl.addEventListener('pointerleave', release);
  }

  /** 2D 지도 한 손가락 드래그 + 두 손가락 핀치(2026-09-10) — "맵 이동이
   *  편해야 한다"는 신고로 조이스틱만으로는 부족하다고 보고 더한다. 지도를
   *  직접 밀고 두 손가락으로 오므리는 게 가장 자연스러운 손짓이다(구글지도·
   *  이 판 3D 지도(`realm3d.js` `bindPointer()`)와 같은 결). 손가락이 하나면
   *  드래그(살짝만 움직이면 성 탭, 크게 끌면 이동으로 가른다), 둘이면 핀치—
   *  `realm3d.js`의 pointers 표·twoPointerDist() 요령을 그대로 옮겼다 */
  var mapPointers = {}, mapDragMoved = false, mapPinchDist = 0;
  var mapVelX = 0, mapVelY = 0, mapMomentumOn = false;
  function mapPointerCount() {
    var n = 0, k;
    for (k in mapPointers) { if (mapPointers.hasOwnProperty(k)) { n++; } }
    return n;
  }
  function mapTwoDist() {
    var ks = Object.keys(mapPointers);
    if (ks.length < 2) { return 0; }
    var a = mapPointers[ks[0]], b = mapPointers[ks[1]];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  /** 손을 뗀 뒤에도 살짝 미끄러져 멎는다(2026-09-10, "맵이동이 편해야 한다"
   *  이어서) — 마지막 프레임의 픽셀 속도(mapVelX/Y)를 그대로 이어받아 매
   *  프레임 10%씩 줄이며 민다. 드래그 쪽과 똑같은 픽셀→지도단위 환산을 쓴다 */
  function startMapMomentum() {
    if (mapMomentumOn) { return; }
    mapMomentumOn = true;
    function step() {
      /* 2026-09-10 버그 수정 — 이 검사가 없으면 손을 다시 대서(pointerdown이
         mapMomentumOn = false 로 끔) 이 관성을 끊으려 해도, 이미 예약돼 있던
         requestAnimationFrame(step) 은 그 사실을 모른 채 한 번 더(사실상
         속도가 죽을 때까지 계속) 돌아 새 드래그와 밀어내기 싸움을 벌였다 —
         매 프레임 이 값부터 다시 확인해야 밖에서 끈 게 그 자리에서 먹힌다 */
      if (!mapMomentumOn) { return; }
      var svg = els.realm.querySelector('.rmap');
      mapVelX *= 0.9; mapVelY *= 0.9;
      if (!svg || Math.abs(mapVelX) + Math.abs(mapVelY) < 0.4) { mapMomentumOn = false; return; }
      var r = svg.getBoundingClientRect();
      if (r.width && r.height) {
        var w = MAP_VB.w / mapZoom, h = MAP_VB.h / mapZoom;
        mapCx -= mapVelX / r.width * w;
        mapCy -= mapVelY / r.height * h;
        applyMapViewNow();
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function bindMapDrag() {
    els.realm.addEventListener('pointerdown', function (e) {
      if (!els.realm.querySelector('.rmap')) { return; }
      mapPointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      try { els.realm.setPointerCapture(e.pointerId); } catch (ex) { /* noop */ }
      if (mapPointerCount() === 1) { mapDragMoved = false; mapVelX = 0; mapVelY = 0; mapMomentumOn = false; }
      if (mapPointerCount() === 2) { mapPinchDist = mapTwoDist(); }
    });
    els.realm.addEventListener('pointermove', function (e) {
      var p = mapPointers[e.pointerId];
      if (!p) { return; }
      var dx = e.clientX - p.x, dy = e.clientY - p.y;
      var svg = els.realm.querySelector('.rmap');
      var r = svg ? svg.getBoundingClientRect() : null;
      if (mapPointerCount() === 1) {
        if (Math.abs(dx) + Math.abs(dy) > 3) { mapDragMoved = true; }
        if (svg && r && r.width && r.height) {
          var w = MAP_VB.w / mapZoom, h = MAP_VB.h / mapZoom;
          mapCx -= dx / r.width * w;
          mapCy -= dy / r.height * h;
          applyMapViewNow();
        }
        mapVelX = dx; mapVelY = dy;
      } else if (mapPointerCount() === 2) {
        var nd = mapTwoDist();
        if (mapPinchDist > 0 && nd > 0) { zoomMapBy(nd / mapPinchDist); }
        mapPinchDist = nd;
        mapDragMoved = true;
        mapVelX = 0; mapVelY = 0;   // 핀치 중엔 관성을 안 쌓는다
      }
      mapPointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    });
    function endDrag(e) {
      var wasSingleDrag = mapPointerCount() === 1 && mapDragMoved;
      delete mapPointers[e.pointerId];
      if (wasSingleDrag && mapPointerCount() === 0) { startMapMomentum(); }
    }
    els.realm.addEventListener('pointerup', endDrag);
    els.realm.addEventListener('pointercancel', endDrag);
  }

  /** 지도 화면일 때만 조이스틱·홈·확대 손잡이를 보여준다(세력 고르기 전 ·
   *  시트가 지도를 덮었을 때는 숨긴다 — saga-go 의 #gjoy 와 같은 결) */
  function syncMapControls() {
    var show = R().state().started && !openTab;
    ['rjoy', 'rmapctl'].forEach(function (id) {
      var el = $(id);
      if (el) { el.classList.toggle('show', show); }
    });
  }

  /* ── 배선 ─────────────────────────────────────────────── */

  function init() {
    ['profile', 'wallet', 'realm', 'dock', 'sheet', 'sheet-title', 'sheet-body',
     'sheet-close', 'sheet-map', 'scrim', 'encounter', 'toast'].forEach(function (id) { els[id] = $(id); });

    els.dock.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sheet]');
      if (!b) { return; }
      var name = b.getAttribute('data-sheet');
      if (openTab === name) { closeSheet(); } else { openSheet(name); }
    });
    els['sheet-close'].addEventListener('click', closeSheet);
    els['sheet-map'].addEventListener('click', closeSheet);
    els.scrim.addEventListener('click', closeSheet);
    global.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (els.encounter.classList.contains('show')) { return; }
        if (openTab) { closeSheet(); }
      }
      /* M — 디아블로식 "지도로" 단축키. 이 판은 국토 지도가 늘 화면 밑에 깔려 있고
         성안·기록 등은 그 위 시트라, M 은 열린 시트를 닫아 국토 지도를 드러낸다.
         encounter(전투 결과·시나리오 선택 등 응답 대기 중인 카드)는 Escape 처럼 건드리지 않는다 */
      if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (els.encounter.classList.contains('show')) { return; }
        if (openTab) { closeSheet(); }
      }
    });

    els.realm.addEventListener('click', function (e) {
      if (mapDragMoved) { mapDragMoved = false; return; }
      var n = e.target.closest('[data-city]');
      if (n) { openCity(n.getAttribute('data-city')); return; }
      if (e.target.closest('[data-act="center-mine"]')) { centerOnMine(); }
    });
    bindMapDrag();
    var mapHome = $('btn-map-home'), mapZin = $('btn-map-zoomin'), mapZout = $('btn-map-zoomout');
    if (mapHome) { mapHome.addEventListener('click', function () { centerOnMine(); }); }
    if (mapZin) { mapZin.addEventListener('click', function () { zoomMapBy(1.5); }); }
    if (mapZout) { mapZout.addEventListener('click', function () { zoomMapBy(1 / 1.5); }); }
    initMapStick();
    els['sheet-body'].addEventListener('click', onAct);
    els.encounter.addEventListener('click', onAct);
    /* 음량 슬라이더 — 끌 때마다(input) 바로 듣고, 값칸만 직접 고쳐 슬라이더가
       손 밑에서 튀지 않게 한다(전체 renderSheet() 는 안 부른다) */
    els['sheet-body'].addEventListener('input', function (e) {
      var el = e.target, a0 = el.getAttribute('data-act');
      if (a0 === 'snd-vol') {
        var SF = global.DG.sfx;
        if (!SF) { return; }
        var v = SF.setVolume((parseInt(el.value, 10) || 0) / 100);
        var lbl = el.nextElementSibling;
        if (lbl) { lbl.textContent = Math.round(v * 100) + '%'; }
      }
    });

    core.on('toast', toast);
    core.on('changed', function () { renderTop(); renderMap(); renderSheet(); syncDock(); });
    core.on('rtk:battle', function (rep) {
      /* 내 세력이 친 싸움만 띄운다. 진영에서 벌어진 것(달을 넘긴 원정)도 여기로 온다 */
      if (rep.force === R().me()) { lastBattle = rep; showBattle(rep); }
    });
    core.on('rtk:camp', function () { syncDock(); });
    core.on('rtk:end', function (kind) { showEnd(kind); });

    if (!R().state().started) { showScenPick(); }
    renderTop(); renderMap();
  }

  function onAct(e) {
    var b = e.target.closest('[data-act]');
    if (!b) { return; }
    act(b.getAttribute('data-act'), b);
  }

  /* ── 손잡이 ───────────────────────────────────────────── */

  function act(a, b) {
    var g = function (k) { return b.getAttribute(k); };

    if (a === 'pick-scen') {
      pickScen = g('data-id');
      showForcePick(pickScen);
      return;
    }
    if (a === 'back-scen') { showScenPick(); return; }
    if (a === 'snd-toggle') {
      var SF0 = global.DG.sfx;
      if (SF0) { SF0.setEnabled(!SF0.enabled()); renderSheet(); }
      return;
    }
    if (a === 'shake-toggle') {
      core.setTune('battle3d.shake', core.tuned('battle3d.shake', 1) ? 0 : 1);
      renderSheet();
      return;
    }
    if (a === 'pick-force') {
      R().setup(g('data-id'), pickScen);
      closeEnc();
      centerOnMine();
      renderTop(); renderMap(); syncDock();
      return;
    }
    if (a === 'next-month') {
      var was = R().state();
      if (was.result) { return; }
      R().endMonth();
      renderTop(); renderMap(); renderSheet();
      return;
    }
    if (a === 'close-enc') { closeEnc(); return; }
    if (a === 'ask-part') {
      var rg = $('askrange');
      if (rg) {
        rg.value = String(Math.max(1, Math.round(parseInt(rg.max, 10) * parseFloat(g('data-p')))));
        askShow();
      }
      return;
    }
    if (a === 'ask-ok') {
      var rv = $('askrange');
      var val = rv ? parseInt(rv.value, 10) : 0;
      var cb = askCb; askCb = null; closeEnc();
      if (cb) { cb(val); }
      return;
    }
    if (a === 'ask-no') { askCb = null; closeEnc(); return; }
    if (a === 'open-city') { openCity(g('data-city')); return; }

    if (a === 'sel-order') { pickOrder = g('data-key'); renderSheet(); return; }
    if (a === 'do-order') {
      var res = R().order(openCityId, g('data-id'), pickOrder);
      if (!res.ok) { toast(res.why); } else if (res.text) { toast(res.text); }
      pickOrder = null;
    } else if (a === 'set-gov') {
      R().setGov(openCityId, g('data-id') || null);
    } else if (a === 'promote') {
      var pr = off().promote(g('data-id'));
      toast(pr.ok ? '✨ ' + pr.name + ' — 충성 ' + pr.loyal : pr.why);
    } else if (a === 'reward') {
      var rr = R().reward(g('data-id'), 300);
      toast(rr.ok ? '🎁 충성 ' + rr.loyal : rr.why);
    } else if (a === 'hire-one') {
      var hr = R().tryHire(openCityId, g('data-by'), g('data-id'));
      toast(hr.ok ? hr.text : hr.why);
      if (hr.ok) { off().rec(g('data-by')).done = true; }
    } else if (a === 'move-officer') {
      var mv = global.DG.war.moveOfficer(g('data-id'), g('data-to'));
      toast(mv.ok ? '🚶 옮겼습니다' : mv.why);
    } else if (a === 'send-troops') {
      var sFrom = openCityId, sTo = g('data-to');
      var sc = R().city(sFrom);
      if (sc.troops < 1) { toast('보낼 병력이 없습니다'); return; }
      askNumber({
        title: '🚚 ' + CD.find(sFrom).name + ' → ' + CD.find(sTo).name,
        hint: '몇 명을 보낼까요? 성에 🪖 ' + core.fmt(sc.troops) +
          ' <span class="muted">(군량도 그만큼 딸려 갑니다)</span>',
        max: sc.troops, value: Math.floor(sc.troops * 0.5), ok: '🚚 보낸다',
        done: function (n) {
          var tr = global.DG.war.transfer(sFrom, sTo, n, Math.round(n / 1000 * 20));
          toast(tr.ok ? '🚚 ' + core.fmt(tr.troops) + ' 을 보냈습니다' : tr.why);
          core.persist(); renderTop(); renderMap(); renderSheet();
        }
      });
      return;
    } else if (a === 'march') {
      doMarch(g('data-from'), g('data-to'));
      return;
    } else if (a === 'journey') {
      doJourney(g('data-from'), g('data-to'));
      return;
    } else if (a === 'bat-cmd') {
      var cmd = g('data-cmd');
      if (!cmd || cmd === 'none') { cmd = null; }
      var step = liveStep; liveStep = null;
      renderLiveCmd(false);
      if (step) { step(cmd); }
      return;
    } else if (a === 'camp-food' || a === 'camp-men') {
      doSupply(g('data-id'), a === 'camp-men');
      return;
    } else if (a === 'camp-quit') {
      var wr = global.DG.war.withdraw(g('data-id'));
      toast(wr.ok ? '↩️ 포위를 풀었습니다' : wr.why);
    } else if (a === 'plot') {
      var pr = global.DG.diplo.plot(g('data-kind'), g('data-by'), openCityId, null);
      toast(pr.ok ? pr.text : pr.why);
    } else if (a === 'trade') {
      doTrade(openCityId, g('data-dir'));
      return;
    } else if (a === 'envoy') {
      var er = global.DG.diplo.envoy(g('data-kind'), g('data-to'), g('data-by'),
        g('data-kind') === 'tribute' ? 600 : 200);
      toast(er.ok ? (er.done ? '🤝 이루어졌습니다' : er.text) : er.why);
    } else if (a === 'q-start') {
      quizCur = { p: global.DG.quiz.draw(g('data-cat') || null), result: null };
      if (!quizCur.p) { quizCur = null; toast('낼 문제가 없습니다'); }
    } else if (a === 'q-answer') {
      if (quizCur && quizCur.p && !quizCur.result) {
        quizCur.result = global.DG.quiz.answer(quizCur.p, parseInt(g('data-i'), 10));
      }
    } else if (a === 'q-next') {
      quizCur = { p: global.DG.quiz.draw(quizCur && quizCur.cat), result: null };
    } else if (a === 'q-quit') {
      quizCur = null;
    } else { return; }

    core.persist();
    renderTop(); renderMap(); renderSheet();
  }

  function doMarch(fromId, toId) {
    var c = R().city(fromId);
    var ready = R().readyAt(fromId);
    if (!ready.length) { toast('출진할 장수가 없습니다'); return; }
    var wet = CD.isWater(fromId, toId);
    var max = wet ? Math.min(c.troops, (c.ships || 0) * global.DG.war.SHIP_CREW) : c.troops;
    if (wet && max < 500) { toast('배가 모자랍니다 — 조선(造船)으로 지으십시오'); return; }
    if (max < 500) { toast('오백은 넘겨야 군대라 하지요'); return; }
    var lead = off().sortByPower(ready).slice(0, 3).map(function (h) { return h.id; });
    askNumber({
      title: (wet ? '🌊 ' : '⚔️ ') + CD.find(fromId).name + ' → ' + CD.find(toId).name,
      hint: '몇 명을 이끌고 갈까요? 성에 🪖 ' + core.fmt(c.troops) +
        (wet ? ' · <b>물길</b>이라 배로 ' + core.fmt(max) + '까지' : '') +
        '<br>장수 — ' + lead.map(function (id) { return esc(off().find(id).name); }).join(' · ') +
        formationHint(lead),
      max: max, value: Math.floor(max * 0.8), ok: (wet ? '🌊 물길로 친다' : '⚔️ 친다'),
      done: function (t) { runMarch(fromId, toId, lead, t); }
    });
  }

  /** 이 장수들로 나가면 진형이 서는가 — 서면 미리 알려 준다(war.js FORMATIONS) */
  function formationHint(officerIds) {
    var f = global.DG.war.formationOf(officerIds);
    return f ? '<br><span class="tag">' + f.emoji + ' ' + esc(f.name) + ' 발동 (위력 ×' +
      f.mul.toFixed(2) + ')</span>' : '';
  }

  function runMarch(fromId, toId, lead, t) {
    if (!(t > 0)) { return; }
    for (var i = 0; i < lead.length; i++) { off().rec(lead[i]).done = true; }
    showBattleLive(fromId, toId, lead, t);
  }

  /** 원정 — 인접하지 않은 먼 성으로 병력을 보낸다. `doMarch()` 와 같은 꼴이지만
   *  그 자리에서 붙지 않는다 — 몇 달 뒤 국경에 닿아야 `war.js` 가 알아서 붙인다 */
  function doJourney(fromId, toId) {
    var c = R().city(fromId);
    var ready = R().readyAt(fromId);
    if (!ready.length) { toast('보낼 장수가 없습니다'); return; }
    if (c.troops < 500) { toast('오백은 넘겨야 군대라 하지요'); return; }
    var path = CD.path(fromId, toId, function (cid) {
      var pc = R().city(cid); return !!pc && (pc.force === c.force || pc.force === null);
    });
    if (!path) { toast('갈 수 있는 길이 없습니다 (남의 땅에 막혔습니다)'); return; }
    var lead = off().sortByPower(ready).slice(0, 3).map(function (h) { return h.id; });
    askNumber({
      title: '🚩 ' + CD.find(fromId).name + ' → ' + CD.find(toId).name + ' (원정)',
      hint: '몇 명을 보낼까요? 성에 🪖 ' + core.fmt(c.troops) +
        '<br>거리 — 약 <b>' + CD.pathMonths(path) + '달</b> 예상' +
        '<br>장수 — ' + lead.map(function (id) { return esc(off().find(id).name); }).join(' · ') +
        formationHint(lead),
      max: c.troops, value: Math.floor(c.troops * 0.8), ok: '🚩 원정을 보낸다',
      done: function (t) { runJourney(fromId, toId, lead, t); }
    });
  }

  function runJourney(fromId, toId, lead, t) {
    if (!(t > 0)) { return; }
    var res = global.DG.war.startJourney(fromId, toId, lead, t);
    if (!res.ok) { toast(res.why); return; }
    for (var i = 0; i < lead.length; i++) { off().rec(lead[i]).done = true; }
    toast('🚩 원정을 떠났습니다 (' + res.months + '달 예상)');
    renderTop(); renderMap(); renderSheet(); syncDock();
  }

  /** 시장 — 명령이 아니라 물류라 askNumber 로 바로 받는다(장수를 안 고른다) */
  function doTrade(cityId, dir) {
    var c = R().city(cityId), rate = R().marketRate(cityId);
    if (dir === 'sell') {
      if (c.food < 1) { toast('팔 군량이 없습니다'); return; }
      askNumber({
        title: '💰 ' + CD.find(cityId).name + ' — 군량을 판다',
        hint: '군량 🍚 ' + core.fmt(c.food) + ' 중 얼마나 팔까요? (환율 🪙' + rate.toFixed(2) + ')',
        max: c.food, value: Math.floor(c.food * 0.3), ok: '💰 판다',
        done: function (n) {
          var r = R().trade(cityId, 'sell', n);
          toast(r.ok ? '💰 군량 ' + core.fmt(-r.food) + ' → 금 ' + core.fmt(r.gold) : r.why);
          core.persist(); renderTop(); renderSheet();
        }
      });
    } else {
      var f = R().force(c.force);
      if (!f || f.gold < Math.round(1 / rate)) { toast('살 만한 금이 없습니다'); return; }
      var maxBuy = Math.floor(f.gold * rate);
      askNumber({
        title: '🌾 ' + CD.find(cityId).name + ' — 군량을 산다',
        hint: '금 🪙 ' + core.fmt(f.gold) + ' 로 최대 🍚 ' + core.fmt(maxBuy) +
          ' 까지 살 수 있습니다 (환율 🪙' + rate.toFixed(2) + ')',
        max: maxBuy, value: Math.floor(maxBuy * 0.3), ok: '🌾 산다',
        done: function (n) {
          var r = R().trade(cityId, 'buy', n);
          toast(r.ok ? '🌾 금 ' + core.fmt(-r.gold) + ' → 군량 ' + core.fmt(r.food) : r.why);
          core.persist(); renderTop(); renderSheet();
        }
      });
    }
  }

  /** 개입형 실시간 전투 — 합마다 끊어 명령(돌격·수비·정공법·퇴각)을 받는다.
   *  끝나면 war.js 가 'rtk:battle' 을 쏘고, 그 리스너(위 init())가 showBattle()
   *  로 이 화면을 표준 요약(전체 재생 포함)으로 갈아 끼운다 — 여기선 진행
   *  중일 때만 그린다 */
  function renderLiveCmd(show) {
    var el = $('livecmd');
    if (!el) { return; }
    el.innerHTML = !show ? '' :
      '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">' +
      '<button class="btn tiny" data-act="bat-cmd" data-cmd="press">⚔️ 돌격</button>' +
      '<button class="btn tiny" data-act="bat-cmd" data-cmd="hold">🛡️ 수비</button>' +
      '<button class="btn tiny ghost" data-act="bat-cmd" data-cmd="none">➡️ 정공법</button>' +
      '<button class="btn tiny ghost" data-act="bat-cmd" data-cmd="retreat">↩️ 퇴각</button>' +
      '</div>';
  }

  function liveAppendLog(s) {
    var el = $('livelog');
    if (!el) { return; }
    var d = document.createElement('div');
    d.textContent = s;
    el.appendChild(d);
    el.scrollTop = el.scrollHeight;
  }

  function liveShowState(state) {
    if (liveBase && liveRepStub && global.DG.battle3d) {
      global.DG.battle3d.showState(liveRepStub, liveBase, state);
    }
  }

  /** 실시간 전투 현황판 — 3D 디오라마(깃발 다발)만으로는 지금 몇 대 몇인지
   *  숫자로 읽을 수가 없다는 신고(2026-09-10)로 더한다. `.rstat`(성 시트가
   *  쓰는 그 줄)를 그대로 재사용해 아군·적군 병력과(물길이 아니면) 성벽을
   *  막대+숫자로 보여주고, 합마다 `updateBattleHud()`가 값만 갈아 끼운다 —
   *  판정은 없다, war.js 가 이미 낸 수치를 그대로 읽을 뿐이다 */
  /** 일기토 예고장 — "OOO ⚔️ OOO"(초상 곁들여). 삼국지 게임들이 결투 전에
   *  두 장수를 마주 세워 보여주는 그 카드와 같은 결이다(2026-09-10). 이름·
   *  초상 다 안 바뀌는 값이라(합마다 그림이 바뀌는 건 3D 쪽 몫) 여기 한 번만
   *  적어 두고 갱신은 안 한다 — battle3d.js 의 실제 캐릭터 대결과 짝을 이룬다 */
  function duelCaptionHtml(rep) {
    if (!rep.duel || !rep.duel.a || !rep.duel.d) { return ''; }
    var oa = off().find(rep.duel.a), od = off().find(rep.duel.d);
    if (!oa || !od) { return ''; }
    return '<div class="bduel">' + pt(oa, 30) + '<b>' + esc(oa.name) + '</b>' +
      '<span>⚔️</span><b>' + esc(od.name) + '</b>' + pt(od, 30) + '</div>';
  }
  function battleHudHtml(rep) {
    var af = FD.force(rep.force), df = FD.force(rep.defForce);
    return '<div class="bhud" id="bhud">' +
      duelCaptionHtml(rep) +
      bar((af ? esc(af.name) : '아군') + ' ⚔️', rep.atkStart, rep.atkStart) +
      bar((df ? esc(df.name) : '적군') + ' 🛡️', rep.defStart, rep.defStart) +
      (rep.water ? '' : bar('성벽', rep.wallFrom || 1, rep.wallFrom || 1)) +
      '<div class="bhud-round" id="bhud-round">전투 시작</div>' +
      '</div>';
  }
  function setBarRow(row, val, max) {
    if (!row) { return; }
    var pct = Math.round(core.clamp(val / Math.max(1, max), 0, 1) * 100);
    var i = row.querySelector('.bar > i');
    if (i) { i.style.width = pct + '%'; }
    var b = row.querySelector('b');
    if (b) { b.textContent = core.fmt(Math.max(0, Math.round(val))); }
  }
  function updateBattleHud(rep, state) {
    var el = $('bhud');
    if (!el || !rep) { return; }
    var rows = el.querySelectorAll('.rstat');
    setBarRow(rows[0], state.atk != null ? state.atk : rep.atkStart, rep.atkStart);
    setBarRow(rows[1], state.def != null ? state.def : rep.defStart, rep.defStart);
    if (!rep.water && rows[2]) { setBarRow(rows[2], state.wall != null ? state.wall : rep.wallFrom, rep.wallFrom || 1); }
    var rd = $('bhud-round');
    if (rd && state.r != null) { rd.textContent = state.r > 0 ? state.r + '합째' : '전투 시작'; }
  }

  function showBattleLive(fromId, toId, lead, t) {
    liveStep = null; liveRepStub = null; liveBase = null;
    var res = global.DG.war.marchInteractive(fromId, toId, lead, t, {
      onIntro: function (lines, repStub) {
        var html = (global.DG.battle3d ? '<canvas id="battle3d"></canvas>' : '') +
          '<h3 style="margin:0 0 6px;font-size:18px">⚔️ 전황 (진행 중)</h3>' +
          battleHudHtml(repStub) +
          '<div class="warlog" id="livelog"></div><div id="livecmd"></div>';
        showEnc(html);
        liveRepStub = repStub;
        for (var i = 0; i < lines.length; i++) { liveAppendLog(lines[i]); }
        if (global.DG.battle3d) {
          liveBase = global.DG.battle3d.beginLive(repStub);
          liveShowState({ atk: repStub.atkStart, def: repStub.defStart, wall: repStub.wallFrom,
            duelPhase: repStub.duel ? 'done' : null });
        }
      },
      onLog: liveAppendLog,
      onRound: function (frame, r) {
        liveShowState({ atk: frame.atk, def: frame.def, wall: frame.wall,
          duelPhase: liveRepStub && liveRepStub.duel ? 'done' : null, roundTick: true });
        updateBattleHud(liveRepStub, { atk: frame.atk, def: frame.def, wall: frame.wall, r: r });
        var SFX = global.DG.sfx;
        if (SFX) { SFX.play('round_clash'); }
      },
      onPrompt: function (state, step) {
        liveStep = step;
        renderLiveCmd(true);
      },
      onDone: function () {
        liveStep = null;
        renderLiveCmd(false);
      }
    });
    if (res && res.ok === false) {
      for (var j = 0; j < lead.length; j++) { off().rec(lead[j]).done = false; }
      toast(res.why);
    }
  }

  /** 진영에 군량이나 병력을 보낸다 */
  function doSupply(campId, men) {
    var W = global.DG.war;
    var cp = W.campById(campId);
    if (!cp) { toast('없는 진영입니다'); return; }
    var home = R().city(cp.from);
    if (!home || home.force !== R().me()) { toast('보급할 성이 없습니다'); return; }
    var have = men ? home.troops : home.food;
    if (have < 1) { toast('보낼 것이 없습니다'); return; }
    /* 물 위의 진영은 배에 타는 만큼만 더 받는다 — 물어보기 전에 그만큼으로 줄인다 */
    if (men && cp.water) {
      have = Math.min(have, Math.max(0, (cp.ships || 0) * W.SHIP_CREW - cp.troops));
      if (have < 1) { toast('배가 다 찼습니다'); return; }
    }
    askNumber({
      title: (men ? '🪖 증원' : '🌾 보급') + ' — ' + CD.find(cp.from).name + ' → ' +
        CD.find(cp.to).name + ' 진중',
      hint: CD.find(cp.from).name + '에 ' + (men ? '🪖 ' : '🌾 ') + core.fmt(have) +
        '<br>지금 치중 ' + core.fmt(cp.food) + ' (' + W.monthsLeft(cp) + '달치)',
      max: have, value: Math.floor(have * 0.4), ok: '🚚 보낸다',
      done: function (n) {
        var res = men ? W.supply(campId, n, 0, cp.from) : W.supply(campId, 0, n, cp.from);
        toast(res.ok ? '🚚 보냈습니다 — 치중 ' + res.left + '달치' : res.why);
        renderTop(); renderMap(); renderSheet(); syncDock();
      }
    });
  }

  /* ── 상단 ─────────────────────────────────────────────── */

  var MONTH_SEASON = ['', '초봄', '봄', '늦봄', '초여름', '여름', '늦여름',
                      '초가을', '가을', '늦가을', '초겨울', '겨울', '늦겨울'];

  function renderTop() {
    var st = R().state();
    if (!st.started) {
      els.profile.innerHTML = '<div class="p-meta"><div class="p-title">사가국지 — 다스리고 꾀고 친다</div>' +
        '<div class="p-sub">세력을 고르십시오</div></div>';
      els.wallet.innerHTML = '';
      return;
    }
    var s = R().summary();
    var lord = off().find((FD.force(st.me) || {}).lord);

    els.profile.innerHTML =
      (lord ? '<span class="avatar-pt">' + pt(lord, 40) + '</span>' : '') +
      '<div class="p-meta">' +
        '<div class="p-title">' + esc(s.name) + ' — ' + st.year + '년 ' + st.month + '월' +
          ' <span class="muted">' + MONTH_SEASON[st.month] + '</span>' +
          ' <span class="tag">' + esc((FD.current() || {}).name || '') + '</span></div>' +
        '<div class="p-sub">🏯 성 <b>' + s.cities + '/' + CD.CITIES.length + '</b>' +
          ' · 👤 <b>' + s.officers + '</b>' +
          ' · 수입 <b>' + core.fmt(s.income - s.upkeep) + '</b>/월</div>' +
      '</div>';

    els.wallet.innerHTML =
      coin('🪙', core.fmt(s.gold), '금') +
      coin('🪖', core.fmt(s.troops), '병력') +
      coin('🍚', core.fmt(s.food), '군량') +
      '<button class="btn primary next-btn" data-act="next-month"' +
        (st.result ? ' disabled' : '') + '>▶ 다음 달</button>';
    var nb = els.wallet.querySelector('.next-btn');
    if (nb) { nb.addEventListener('click', function () { act('next-month', nb); }); }
  }

  function coin(icon, val, label) {
    return '<div class="coin" title="' + label + '"><span>' + icon + '</span>' + val + '</div>';
  }

  /* ── 지도 ─────────────────────────────────────────────── */

  /** 원정 하나가 경로 위 지금 어디쯤 있는가(화면 x·y, 0~100대) — 구간별 실제
   *  거리로 나눠 잡는다(칸 수 균등이 아니라 `CD.pathMonths()`와 같은 잣대) */
  function journeyPos(j) {
    var path = j.path, i;
    if (!path || path.length < 2) {
      var only = path && CD.find(path[0]);
      return only ? { x: only.x, y: only.y } : null;
    }
    var frac = core.clamp((j.monthsElapsed || 0) / (j.monthsTotal || 1), 0, 0.999);
    var segs = [], total = 0;
    for (i = 0; i < path.length - 1; i++) {
      var a = CD.find(path[i]), b = CD.find(path[i + 1]);
      if (!a || !b) { continue; }
      var len = Math.hypot(a.x - b.x, a.y - b.y);
      segs.push({ a: a, b: b, len: len });
      total += len;
    }
    if (!segs.length) { return null; }
    if (!total) { return { x: segs[0].a.x, y: segs[0].a.y }; }
    var target = frac * total, acc = 0;
    for (i = 0; i < segs.length; i++) {
      if (acc + segs[i].len >= target || i === segs.length - 1) {
        var segFrac = segs[i].len > 0 ? core.clamp((target - acc) / segs[i].len, 0, 1) : 0;
        return { x: segs[i].a.x + (segs[i].b.x - segs[i].a.x) * segFrac,
                 y: segs[i].a.y + (segs[i].b.y - segs[i].a.y) * segFrac };
      }
      acc += segs[i].len;
    }
    return { x: segs[segs.length - 1].b.x, y: segs[segs.length - 1].b.y };
  }

  function renderMap() {
    var st = R().state();
    if (!st.started) { els.realm.innerHTML = ''; return; }
    var i, j, s = '';

    /* viewBox 를 100→125→165(폭)·100→120(높이) 로 넓혀 왔다(2026-09-03 한국,
       2026-09-09 일본·교주 지역 확장) — 전부 동·남쪽(양수 좌표) 빈 자리였다.
       서역(2026-09-09 넷째)은 반대로 **서쪽**인데 무위(x:15)·성도(x:14)가
       이미 0 에 바짝 붙어 있어 그 결로는 room이 없었다 — 그래서 기존 51성
       좌표는 하나도 안 건드리고 **원점을 음수 쪽으로 옮겼다**
       (min-x -60·min-y -30, 너비 225·높이 150). 천축(여섯째)·막북(일곱째)은
       기존 120·-30 높이 안에 다 들어와 손 안 댔다. 임읍(여덟째, 2026-09-10)만
       y:118~134 로 아래로 더 뻗어 **높이를 150→180 으로 다시 넓혔다** —
       x/y 값 자체는 CD.CITIES 데이터가 그대로 쥐고 있어 여기 말고 고칠 곳이 없다.
     전체 범위 자체(MAP_VB, 위 "지도 이동·확대" 절)는 여기 -60/-30/225/180 과
     반드시 같아야 한다 — 보이는 창(viewBox)은 mapViewBox() 가 이동·확대
     상태에 따라 그 범위 **안의 일부**를 계산해 낸다(2026-09-10) */
    s += '<svg class="rmap" viewBox="' + mapViewBox() + '" preserveAspectRatio="xMidYMid meet">';

    /* 길 — 인접한 성끼리. 같은 편이면 밝게 */
    var drawn = {};
    for (i = 0; i < CD.CITIES.length; i++) {
      var a = CD.CITIES[i];
      for (j = 0; j < a.adj.length; j++) {
        var b = CD.find(a.adj[j]);
        var key = a.id < b.id ? a.id + b.id : b.id + a.id;
        if (drawn[key]) { continue; }
        drawn[key] = true;
        var fa = st.cities[a.id].force, fb = st.cities[b.id].force;
        var same = fa && fa === fb;
        var wet = CD.isWater(a.id, b.id);
        s += '<line class="rlink' + (same ? ' same' : '') + (wet ? ' water' : '') +
          '" x1="' + a.x + '" y1="' + a.y +
          '" x2="' + b.x + '" y2="' + b.y + '"' +
          (same && !wet ? ' stroke="' + forceColor(fa) + '"' : '') + '/>';
      }
    }

    /* 성 */
    for (i = 0; i < CD.CITIES.length; i++) {
      var d = CD.CITIES[i], c = st.cities[d.id];
      var mine = c.force === st.me;
      var rad = 1.5 + Math.min(2.2, c.troops / 12000);
      s += '<g class="rcity' + (mine ? ' mine' : '') + '" data-city="' + d.id + '">' +
        /* 손가락이 닿는 목표 — 성 점은 화면에서 8px 남짓이라 폰에서 못 누른다.
           보이지 않는 큰 원을 하나 깔아 둔다(그림은 그대로, 손만 커진다) */
        '<circle class="rhit" cx="' + d.x + '" cy="' + d.y + '" r="4.2"/>' +
        '<circle cx="' + d.x + '" cy="' + d.y + '" r="' + rad.toFixed(2) + '" fill="' +
          forceColor(c.force) + '"/>' +
        (mine ? '<circle cx="' + d.x + '" cy="' + d.y + '" r="' + (rad + 1.1).toFixed(2) +
          '" class="ring"/>' : '') +
        (c.disaster ? '<text class="rdis" x="' + (d.x + rad + 0.6) + '" y="' + (d.y - rad) +
          '">' + R().disasterByKey(c.disaster).emoji + '</text>' : '') +
        (global.DG.war.besieged(d.id) ? '<text class="rdis" x="' + (d.x - rad - 2.4) +
          '" y="' + (d.y - rad) + '">🏕️</text>' : '') +
        '<text class="rlab" x="' + d.x + '" y="' + (d.y + rad + 2.6) + '">' + esc(d.name) + '</text>' +
        '</g>';
    }

    /* 가고 있는 원정 — 경로 위 지금 자리에 깃발 하나(2026-09-04) */
    var jn = global.DG.war.journeys();
    for (i = 0; i < jn.length; i++) {
      var pos = journeyPos(jn[i]);
      if (!pos) { continue; }
      s += '<text class="rjourney" x="' + pos.x + '" y="' + pos.y +
        '" fill="' + forceColor(jn[i].force) + '">🚩</text>';
    }
    s += '</svg>';

    /* 범례 — 살아 있는 세력 */
    var rank = R().ranking();
    s += '<div class="rlegend">';
    for (i = 0; i < rank.length; i++) {
      var mine = rank[i].id === st.me;
      s += '<span class="rlg' + (mine ? ' me' : '') + '"' +
        (mine ? ' data-act="center-mine" title="내 땅으로"' : '') + '>' +
        '<i style="background:' + forceColor(rank[i].id) + '"></i>' +
        esc(rank[i].name) + ' <b>' + rank[i].cities + '</b></span>';
    }
    s += '</div>';

    els.realm.innerHTML = s;
    syncMapControls();
  }

  /* ── 시트 ─────────────────────────────────────────────── */

  var SHEET_TITLE = { city: '🏯 성', officers: '👤 무장', camp: '🏕️ 진·원정',
                      diplo: '🤝 외교', school: '📚 학당', log: '📜 기록', settings: '⚙️ 설정' };

  /** 2026-09-10 — 효과음(사가블로·사가스토리·사가의숲 설정 시트와 같은 결).
   *  이 판엔 그래픽 품질 손잡이가 없다(realm3d.js 에 등급표 자체가 없다) —
   *  진·BGM·진동도 없어(sfx.js 에 그 손잡이 자체가 없다) 효과음 하나만 둔다.
   *  상단 더보기(⋯)의 🔊 는 그대로 둔다(빠른 켬/끔 — 이 시트로 대체하지 않는다). */
  function viewSettings() {
    var SF = global.DG.sfx;
    if (!SF) { return '<div class="hint">소리 모듈을 찾을 수 없습니다</div>'; }
    var on = SF.enabled(), vol = Math.round(SF.volume() * 100);
    var shakeOn = core.tuned('battle3d.shake', 1) ? true : false;
    return '<div class="key-row"><b>효과음</b>' +
        '<button data-act="snd-toggle">' + (on ? '켜짐' : '꺼짐') + '</button></div>' +
      '<div class="key-row"><b>음량</b>' +
        '<input type="range" min="0" max="100" value="' + vol + '" data-act="snd-vol"' +
        (on ? '' : ' disabled') + '>' +
        '<span class="key-cur">' + vol + '%</span></div>' +
      /* 2026-09-10 — 전투 화면에 성벽 붕괴 카메라 흔들림(wallShake)을 더하면서
         같이 둔다. 부드러운 것(라운드 충격 거리·일기토 근접 컷)은 안 가리고
         진짜 화면이 떨리는 것만 끌 수 있다 */
      '<div class="key-row"><b>전투 화면 흔들림</b>' +
        '<button data-act="shake-toggle">' + (shakeOn ? '켜짐' : '꺼짐') + '</button></div>';
  }

  function openSheet(name) {
    openTab = name;
    els['sheet-title'].textContent = SHEET_TITLE[name] || name;
    els.sheet.setAttribute('data-tab', name);
    els.sheet.classList.add('show');
    document.body.classList.add('sheet-open');
    if (global.innerWidth <= 780) { els.scrim.classList.add('show'); }
    syncDock();
    syncMapControls();
    renderSheet();
  }

  function openCity(id) {
    openCityId = id;
    pickOrder = null;
    openSheet('city');
  }

  function closeSheet() {
    openTab = null;
    els.sheet.classList.remove('show');
    document.body.classList.remove('sheet-open');
    els.scrim.classList.remove('show');
    syncDock();
    syncMapControls();
  }

  function syncDock() {
    var bs = els.dock.querySelectorAll('[data-sheet]');
    for (var i = 0; i < bs.length; i++) {
      bs[i].classList.toggle('on', bs[i].getAttribute('data-sheet') === openTab);
    }
    /* 나가 있는 진·원정 수 — 눌러 보지 않으면 잊기 쉬운 칸이다 */
    var cb = els.dock.querySelector('[data-sheet="camp"]');
    if (!cb) { return; }
    var n = R().state().started ?
      global.DG.war.campsOf(R().me()).length + global.DG.war.journeysOf(R().me()).length : 0;
    var badge = cb.querySelector('i.badge');
    if (n > 0) {
      if (!badge) { badge = document.createElement('i'); badge.className = 'badge'; cb.appendChild(badge); }
      badge.textContent = String(n);
    } else if (badge) { badge.parentNode.removeChild(badge); }
  }

  function renderSheet() {
    if (!openTab) { return; }
    /* 설정은 게임을 시작하기 전(세력을 고르기 전)에도 소리를 끄고 싶을 수 있어
       "시작함" 문턱을 건너뛴다 — 나머지 시트는 국토 자체가 없어 그 문턱이 맞다 */
    if (openTab !== 'settings' && !R().state().started) { return; }
    var v = openTab === 'settings' ? viewSettings()
          : openTab === 'city' ? viewCity()
          : openTab === 'officers' ? viewOfficers()
          : openTab === 'camp' ? viewCamp()
          : openTab === 'diplo' ? viewDiplo()
          : openTab === 'school' ? viewSchool() : viewLog();
    els['sheet-body'].innerHTML = v;
    if (openTab === 'city' && openCityId && global.DG.city3d) {
      global.DG.city3d.render(openCityId);
    }
  }

  /* ── 성 ───────────────────────────────────────────────── */

  function bar(label, val, max, extra) {
    var pct = Math.round(core.clamp(val / max, 0, 1) * 100);
    return '<div class="rstat"><span>' + label + '</span>' +
      '<div class="bar sm"><i style="width:' + pct + '%"></i></div>' +
      '<b>' + core.fmt(val) + (extra || '') + '</b></div>';
  }

  function viewCity() {
    if (!openCityId) {
      return '<div class="hint">지도에서 성을 누르십시오.</div>';
    }
    var d = CD.find(openCityId), c = R().city(openCityId);
    var land = CD.landOf(openCityId);
    var mine = c.force === R().me();
    var html = '';

    html += '<div class="sec"><div class="card">' +
      '<div class="stat-row"><span><b>' + esc(d.name) + '</b> <span class="muted">' +
        esc(d.hanja) + ' · ' + esc(CD.provName(d.prov)) + ' · ' + land.name + '</span></span>' +
        '<span class="tag" style="background:' + forceColor(c.force) + '33;border-color:' +
        forceColor(c.force) + '">' + esc(R().forceName(c.force)) + '</span></div>' +
      '<small class="muted">' + esc(d.desc) + '</small>' +
      (c.disaster
        ? '<div class="warn">' + R().disasterByKey(c.disaster).emoji + ' ' +
          esc(R().disasterByKey(c.disaster).text) + ' <span class="muted">(' + c.dLeft + '개월)</span></div>'
        : '') +
      '</div></div>';

    html += '<div class="sec"><h4>살림</h4><div class="card">' +
      bar('🌾 농업', c.agri, R().capOf(openCityId, 'agri')) +
      bar('🏪 상업', c.comm, R().capOf(openCityId, 'comm')) +
      bar('🔨 기술', c.tech, 900) +
      bar('🪧 치안', c.sec, 100) +
      bar('🎯 훈련', c.train, 100) +
      bar('🧱 성벽', c.wall, c.maxWall) +
      '<div class="stat-row"><span>👥 인구</span><b>' + core.fmt(c.pop) + '</b></div>' +
      '<div class="stat-row"><span>🪖 병력</span><b>' + core.fmt(c.troops) + '</b></div>' +
      '<div class="stat-row"><span>🍚 군량</span><b>' + core.fmt(c.food) +
        ' <span class="muted">(월 ' + core.fmt(R().eatOf(openCityId)) + ' 소모)</span></b></div>' +
      (d.land === 'river'
        ? '<div class="stat-row"><span>🛶 배</span><b>' + core.fmt(c.ships || 0) +
          '척 <span class="muted">(' + core.fmt((c.ships || 0) * global.DG.war.SHIP_CREW) +
          '명까지 실린다)</span></b></div>'
        : '') +
      (mine
        ? '<div class="stat-row"><span>🪙 이 성의 달 수입</span><b>' +
          core.fmt(R().goldOf(openCityId)) + '</b></div>'
        : '') +
      '</div></div>';

    return html + (mine ? myCity(c, d) : enemyCity(c, d));
  }

  function myCity(c, d) {
    var html = '';
    var ready = R().readyAt(openCityId);
    var here = off().atCity(openCityId, c.force);

    /* 태수 */
    var gov = c.gov ? off().find(c.gov) : null;
    html += '<div class="sec"><h4>태수</h4><div class="card">' +
      '<div class="stat-row"><span>지금</span><b>' + (gov ? esc(gov.name) : '비어 있음') +
        '</b> <span class="muted">×' + R().govMul(openCityId).toFixed(2) + '</span></div>' +
      '<small class="muted">태수의 <b>지력·통솔</b>이 수입과 수확에 곱해집니다. ' +
      '비어 있으면 계략에 훤히 열립니다.</small><div class="bagtools">';
    for (var i = 0; i < Math.min(5, here.length); i++) {
      html += '<button class="btn tiny' + (c.gov === here[i].id ? ' primary' : '') +
        '" data-act="set-gov" data-id="' + here[i].id + '">' + esc(here[i].name) + '</button>';
    }
    html += '</div></div></div>';

    /* 시장 — 금↔군량 환전(명령이 아니다, 몇 번이든 쓸 수 있다) */
    var rate = R().marketRate(openCityId);
    html += '<div class="sec"><h4>시장 <span class="muted">환율 🍚1 = 🪙' + rate.toFixed(2) +
      ' (상업이 클수록 후해진다)</span></h4><div class="card">' +
      '<div class="bagtools">' +
      '<button class="btn tiny" data-act="trade" data-dir="sell">💰 군량을 판다</button>' +
      '<button class="btn tiny" data-act="trade" data-dir="buy">🌾 군량을 산다</button>' +
      '</div></div></div>';

    /* 명령 */
    html += '<div class="sec"><h4>명령 <span class="muted">이 달에 쓸 수 있는 장수 ' +
      ready.length + '명</span></h4>';
    if (!ready.length) {
      html += '<div class="hint">이 성의 장수가 이 달의 명령을 다 썼습니다. ' +
        '<b>다음 달</b>로 넘기십시오.</div>';
    } else if (!pickOrder) {
      html += '<div class="ordgrid">';
      for (var j = 0; j < R().ORDERS.length; j++) {
        var o = R().ORDERS[j];
        var afford = R().force(c.force).gold >= o.gold;
        /* 조선(造船)은 강을 낀 성에서만 — 아닌 성에서는 아예 못 고르게 둔다 */
        var dry = o.key === 'ships' && d.land !== 'river';
        html += '<button class="ordbtn' + (afford && !dry ? '' : ' poor') +
          (dry ? ' disabled" disabled' : '"') + ' data-act="sel-order" data-key="' +
          o.key + '" title="' + esc(dry ? '물길이 없는 성입니다' : o.desc) +
          '"><span>' + o.emoji + '</span><b>' + o.name +
          '</b><small>' + (dry ? '물길 없음' : '🪙' + o.gold) + '</small></button>';
      }
      html += '</div><small class="muted">명령을 고르면 <b>그 일에 맞는 사람</b> 순으로 뜹니다.</small>';
    } else {
      var od = R().orderByKey(pickOrder);
      var sorted = ready.slice().sort(function (a, b) {
        return off().stats(b.id)[od.stat] - off().stats(a.id)[od.stat];
      });
      html += '<div class="card"><div class="stat-row"><span>' + od.emoji + ' <b>' +
        od.name + '</b> <span class="muted">' + off().STAT_KOR[od.stat] + '을(를) 본다</span></span>' +
        '<button class="btn tiny ghost" data-act="sel-order" data-key="">그만</button></div>' +
        '<small class="muted">' + esc(od.desc) + '</small></div>';
      for (var k = 0; k < sorted.length; k++) {
        var s = off().stats(sorted[k].id);
        var gain = pickOrder === 'search' || pickOrder === 'hire' ? null
          : Math.round(od.base + s[od.stat] * od.per);
        html += '<button class="offrow" data-act="do-order" data-id="' + sorted[k].id + '">' +
          pt(sorted[k], 36) + '<span class="offname">' + esc(sorted[k].name) +
          '<small class="muted">' + off().STAT_KOR[od.stat] + ' ' + s[od.stat] +
          ' · 충성 ' + off().loyalOf(sorted[k].id) + '</small></span>' +
          '<b>' + (gain === null ? '—' : '+' + core.fmt(gain)) + '</b></button>';
      }
    }
    html += '</div>';

    /* 이 성에서 찾아낸 재야 · 포로 */
    var freeHere = off().freeAt(openCityId, true);
    var capHere = [];
    var st = R().state();
    for (var ck in st.captives) {
      if (Object.prototype.hasOwnProperty.call(st.captives, ck) && st.captives[ck] === openCityId) {
        var ch = off().find(ck);
        if (ch) { capHere.push(ch); }
      }
    }
    if (freeHere.length || capHere.length) {
      html += '<div class="sec"><h4>부를 수 있는 사람</h4>';
      var caller = ready.length ? ready[0] : null;
      var pool = freeHere.concat(capHere);
      for (var m = 0; m < pool.length; m++) {
        var isCap = capHere.indexOf(pool[m]) >= 0;
        var ps = off().stats(pool[m].id);
        html += '<div class="offrow">' + pt(pool[m], 36) +
          '<span class="offname">' + esc(pool[m].name) +
          (isCap ? ' <span class="tag">포로</span>' : ' <span class="muted">재야</span>') +
          '<small class="muted">무 ' + ps.might + ' 지 ' + ps.wisdom + ' 통 ' + ps.command + '</small></span>' +
          (caller
            ? '<button class="btn tiny primary" data-act="hire-one" data-by="' + caller.id +
              '" data-id="' + pool[m].id + '">등용</button>'
            : '<span class="muted">쓸 장수 없음</span>') +
          '</div>';
      }
      html += '</div>';
    }

    /* 이웃 */
    html += '<div class="sec"><h4>이웃한 성</h4>';
    for (var n = 0; n < d.adj.length; n++) {
      var nid = d.adj[n], nc = R().city(nid), nd = CD.find(nid);
      var ours = nc.force === c.force;
      html += '<div class="card"><div class="stat-row">' +
        '<span><b class="lnk" data-act="open-city" data-city="' + nid + '">' + esc(nd.name) + '</b> ' +
          '<span class="muted">' + esc(R().forceName(nc.force)) + '</span></span>' +
        '<span class="muted">🪖 ' + core.fmt(nc.troops) + ' · 🧱 ' + core.fmt(nc.wall) + '</span></div>' +
        (ours
          ? '<button class="btn tiny wide" data-act="send-troops" data-to="' + nid + '">🚚 병력을 보낸다</button>'
          : '<button class="btn tiny wide primary" data-act="march" data-from="' + openCityId +
            '" data-to="' + nid + '">⚔️ 출진</button>') +
        '</div>';
    }
    html += '</div>';

    /* 원정 — 인접하지 않은 먼 성. 내 땅·주인 없는 땅만 거쳐 가는 실제 경로가
       있는 곳만 고른다(2026-09-04, 출진의 "그 자리에서 인접" 한계를 벗어나는
       새 상위 명령) */
    var passable = function (cid) {
      var pc = R().city(cid);
      return !!pc && (pc.force === c.force || pc.force === null);
    };
    var farHtml = '';
    for (var f = 0; f < CD.CITIES.length; f++) {
      var fd = CD.CITIES[f];
      if (fd.id === openCityId || d.adj.indexOf(fd.id) >= 0) { continue; }
      var fc = R().city(fd.id);
      if (fc.force === c.force) { continue; }
      var p = CD.path(openCityId, fd.id, passable);
      if (!p) { continue; }
      farHtml += '<div class="card"><div class="stat-row">' +
        '<span><b class="lnk" data-act="open-city" data-city="' + fd.id + '">' + esc(fd.name) +
        '</b> <span class="muted">' + esc(R().forceName(fc.force)) + ' · ' + CD.pathMonths(p) + '달</span></span>' +
        '<span class="muted">🪖 ' + core.fmt(fc.troops) + '</span></div>' +
        '<button class="btn tiny wide" data-act="journey" data-from="' + openCityId +
        '" data-to="' + fd.id + '">🚩 원정</button></div>';
    }
    if (farHtml) {
      html += '<div class="sec"><h4>원정 <span class="muted">내 땅·빈 땅만 거쳐 여러 달에 걸쳐 옮깁니다</span></h4>' +
        farHtml + '</div>';
    }
    return html;
  }

  function enemyCity(c, d) {
    var html = '<div class="sec"><h4>여기서 할 수 있는 것</h4>';
    var D = global.DG.diplo;
    if (!D.touching(R().me(), openCityId)) {
      return html + '<div class="hint">우리 성과 맞닿아 있지 않습니다 — 손이 닿지 않습니다.</div></div>';
    }
    /* 계략을 걸 사람 — 맞닿은 우리 성에서 지력이 가장 높은, 아직 안 쓴 사람 */
    var by = null, bv = -1, i, j;
    for (i = 0; i < d.adj.length; i++) {
      if (!R().isMine(d.adj[i])) { continue; }
      var ready = R().readyAt(d.adj[i]);
      for (j = 0; j < ready.length; j++) {
        var w = off().stats(ready[j].id).wisdom;
        if (w > bv) { bv = w; by = ready[j]; }
      }
    }
    if (!by) {
      html += '<div class="hint">계략을 걸 장수가 없습니다 (이웃한 우리 성의 장수가 다 명령을 썼습니다).</div>';
    } else {
      html += '<div class="card"><div class="stat-row"><span>거는 사람</span><b>' +
        esc(by.name) + ' <span class="muted">지력 ' + bv + '</span></b></div>' +
        '<small class="muted">계략은 그 성의 <b>태수 지력</b>이 막습니다. ' +
        '성공률을 숨기지 않습니다 — 보고 거십시오.</small></div>';
      for (i = 0; i < D.PLOTS.length; i++) {
        var p = D.PLOTS[i];
        var ch = D.plotChance(p.key, by.id, openCityId, null);
        var afford = R().myForce().gold >= p.gold;
        html += '<div class="card"><div class="stat-row"><span>' + p.emoji + ' <b>' +
          p.name + '</b></span><span class="muted">🪙 ' + p.gold + ' · ' +
          Math.round(ch * 100) + '%</span></div>' +
          '<small class="muted">' + esc(p.desc) + '</small>' +
          '<button class="btn tiny wide' + (afford ? ' primary' : '') + '"' +
          (afford ? '' : ' disabled') + ' data-act="plot" data-kind="' + p.key +
          '" data-by="' + by.id + '">건다</button></div>';
      }
    }
    /* 출진 — 맞닿은 우리 성에서 */
    html += '</div><div class="sec"><h4>출진</h4>';
    for (i = 0; i < d.adj.length; i++) {
      if (!R().isMine(d.adj[i])) { continue; }
      var fc = R().city(d.adj[i]);
      var wet = CD.isWater(d.adj[i], openCityId);
      var cap = (fc.ships || 0) * global.DG.war.SHIP_CREW;
      html += '<div class="card"><div class="stat-row"><span><b>' + esc(CD.find(d.adj[i]).name) +
        '</b>에서</span><span class="muted">🪖 ' + core.fmt(fc.troops) + '</span></div>' +
        (wet
          ? '<small class="muted">🌊 <b>물길</b>입니다 — 배로만 건넙니다. ' +
            '🛶 ' + core.fmt(fc.ships || 0) + '척 · ' + core.fmt(cap) + '명까지. ' +
            '수전은 <b>성벽이 소용없고</b> 화공이 터집니다.</small>'
          : '') +
        '<button class="btn tiny wide' + (wet && cap < 500 ? '' : ' primary') +
        '" data-act="march" data-from="' + d.adj[i] +
        '" data-to="' + openCityId + '">' + (wet ? '🌊 물길로 친다' : '⚔️ 친다') +
        '</button></div>';
    }
    return html + '</div>';
  }

  /* ── 진영 (여러 달에 걸치는 원정) ─────────────────────── */

  function viewCamp() {
    var W = global.DG.war;
    var camps = W.campsOf(R().me());
    var jn = W.journeysOf(R().me());
    var html = '';

    if (!camps.length) {
      html += '<div class="hint">나가 있는 진(陣)이 없습니다.<br><br>' +
        '남의 성을 눌러 <b>친다</b> 를 고르면, 그 달에 못 떨어뜨린 군대는 ' +
        '물러나지 않고 성 밖에 <b>진(陣)</b> 을 칩니다. 진은 달마다 한 번씩 더 치고, ' +
        '<b>치중이 바닥나거나 사기가 꺾이면 스스로 물러납니다</b>.</div>';
    } else {
      html += '<div class="sec"><h4>나가 있는 진(陣) <span class="muted">' + camps.length + '</span></h4>' +
        '<small class="muted">출진할 때 들고 나가는 군량은 <b>두 달치</b>입니다. ' +
        '그보다 길게 에워싸려면 맞닿은 우리 성에서 <b>보급</b>해야 합니다. ' +
        '에워싸인 성은 그동안 <b>수확을 거두지 못합니다</b>.</small></div>';
      for (var i = 0; i < camps.length; i++) { html += campCard(camps[i]); }
    }

    if (jn.length) {
      html += '<div class="sec"><h4>가고 있는 원정 <span class="muted">' + jn.length + '</span></h4>' +
        '<small class="muted">내 땅·주인 없는 땅만 거쳐 먼 성까지 실시간으로 옮겨 가는 중입니다. ' +
        '국경(경로의 마지막 성)에 닿으면 그 자리에서 자동으로 붙습니다.</small></div>';
      for (var j = 0; j < jn.length; j++) { html += journeyCard(jn[j]); }
    }
    return html;
  }

  /** 가고 있는 원정 한 줄 — 진행률만 보여준다(v1엔 회군 명령이 없다) */
  function journeyCard(j) {
    var d = CD.find(j.to);
    var pct = Math.round(core.clamp(j.monthsElapsed / j.monthsTotal, 0, 1) * 100);
    var names = j.officers.map(function (id) {
      var h = off().find(id);
      return h ? esc(h.name) : id;
    }).join(' · ');
    return '<div class="card">' +
      '<div class="stat-row"><span>🚩 <b>' + esc(d.name) + '</b> 을(를) 향해</span>' +
      '<span class="muted">' + j.monthsElapsed + ' / ' + j.monthsTotal + '달</span></div>' +
      '<div class="bar sm"><i style="width:' + pct + '%"></i></div>' +
      '<div class="stat-row"><span class="muted">병력</span><b>🪖 ' + core.fmt(j.troops) + '</b></div>' +
      (j.lastEvent
        ? '<div class="warn">' + j.lastEvent.emoji + ' ' + esc(j.lastEvent.text) + '</div>'
        : '') +
      '<small class="muted">장수 — ' + names + '</small></div>';
  }

  function campCard(cp) {
    var W = global.DG.war;
    var d = CD.find(cp.to), to = R().city(cp.to);
    var left = W.monthsLeft(cp);
    var home = R().city(cp.from);
    var canFeed = !!home && home.force === R().me();
    var names = cp.officers.map(function (id) {
      var h = off().find(id);
      return h ? esc(h.name) : id;
    }).join(' · ');

    var html = '<div class="card">' +
      '<div class="stat-row"><span>' + (cp.water ? '⛵' : '🏕️') + ' <b>' + esc(d.name) +
      '</b> 을(를) 에워쌌다' + (cp.water ? ' <span class="tag">수채</span>' : '') + '</span>' +
      '<span class="muted">' + cp.months + '달째</span></div>' +
      '<div class="stat-row"><span class="muted">우리 군</span><b>🪖 ' + core.fmt(cp.troops) +
      ' · 🌾 ' + core.fmt(cp.food) + ' <span class="muted">(' + left + '달치)</span></b></div>' +
      (cp.water
        ? '<div class="stat-row"><span class="muted">배</span><b>🛶 ' + core.fmt(cp.ships || 0) +
          '척 <span class="muted">(' +
          core.fmt(Math.max(0, (cp.ships || 0) * global.DG.war.SHIP_CREW - cp.troops)) +
          '명 더 탄다)</span></b></div>'
        : '') +
      '<div class="stat-row"><span class="muted">사기 · 훈련</span><b>' +
      Math.round(cp.morale * 100) + ' · ' + cp.train + '</b></div>' +
      '<div class="stat-row"><span class="muted">성 안</span><b>🪖 ' + core.fmt(to.troops) +
      ' · 🧱 ' + core.fmt(to.wall) + '</b></div>' +
      '<small class="muted">장수 — ' + names + '</small>';

    if (canFeed) {
      html += '<div class="camp-acts">' +
        '<button class="btn tiny" data-act="camp-food" data-id="' + cp.id + '">🌾 보급</button>' +
        '<button class="btn tiny" data-act="camp-men" data-id="' + cp.id + '">🪖 증원</button></div>' +
        '<small class="muted">' + esc(CD.find(cp.from).name) + '에서 보냅니다 — 🪖 ' +
        core.fmt(home.troops) + ' · 🌾 ' + core.fmt(home.food) + '</small>';
    } else {
      html += '<div class="hint" style="margin-top:8px">보급할 성이 없습니다 — ' +
        esc(CD.find(cp.from).name) + ' 이(가) 우리 손을 떠났습니다.</div>';
    }
    return html + '<button class="btn tiny wide" data-act="camp-quit" data-id="' + cp.id +
      '">↩️ 포위를 푼다</button></div>';
  }

  /* ── 무장 ─────────────────────────────────────────────── */

  function viewOfficers() {
    var list = off().ofForce(R().me());
    var html = '<div class="sec"><h4>우리 무장 <span class="muted">' + list.length + '명</span></h4>' +
      '<small class="muted">충성이 <b>바닥</b>나면 스스로 떠납니다. 금을 내려 붙듭니다.<br>' +
      '일을 시키면 <b>경험</b>이 붙어 능력치가 오르고, 쌓인 <b>공</b>으로 <b>승진</b>시키면 ' +
      '능력치와 충성이 함께 오릅니다.</small></div>';
    var byCity = {};
    for (var i = 0; i < list.length; i++) {
      var r = off().rec(list[i].id);
      (byCity[r.city] = byCity[r.city] || []).push(list[i]);
    }
    var keys = Object.keys(byCity);
    for (var k = 0; k < keys.length; k++) {
      html += '<div class="sec"><h4>' + esc(CD.find(keys[k]).name) + '</h4>';
      for (var j = 0; j < byCity[keys[k]].length; j++) {
        html += officerCard(byCity[keys[k]][j], keys[k]);
      }
      html += '</div>';
    }
    return html;
  }

  /** 지니고 있는 보물 한 줄 — 없으면 빈 문자열(2026-09-09, data-item.js) */
  function itemBadge(itemId) {
    if (!itemId || !ID) { return ''; }
    var it = ID.itemById(itemId);
    if (!it) { return ''; }
    return '<div class="stat-row"><span class="muted">보물</span><b>' + it.emoji + ' ' +
      esc(it.name) + ' <span class="muted">(' + (off().STAT_KOR[it.stat] || it.stat) +
      ' +' + it.bonus + ')</span></b></div>';
  }

  /** 무장 한 장 — 능력치 · 충성 · 열전. 도감 상세를 여기로 옮겼다 */
  function officerCard(h, cityId) {
    var s = off().stats(h.id);
    var r = off().rec(h.id);
    var g = global.DG.hero.info(h.id);
    var isLord = (FD.force(r.force) || {}).lord === h.id;
    var bio = global.DG.data.bio ? global.DG.data.bio(h.id) : '';
    var c = R().city(cityId);
    return '<div class="card offcard">' +
      '<div class="dt-top">' + ptBig(h) +
        '<div class="dt-name"><b>' + esc(h.name) + '</b> <span class="muted">' +
          esc(h.hanja || '') + ' · ' + off().age(h.id) + '세</span>' +
          (isLord ? ' <span class="tag">군주</span>' : '') +
          (c && c.gov === h.id ? ' <span class="tag">태수</span>' : '') +
          (off().age(h.id) > 60 ? ' <span class="tag warnt">노쇠</span>' : '') +
          (r.hurt ? ' <span class="tag warnt">부상 ' + r.hurt + '개월</span>' : '') +
          (r.done ? ' <span class="muted">· 이 달 명령 씀</span>' : '') +
          (r.camp ? ' <span class="tag">진 치는 중</span>' : '') +
          (r.journey ? ' <span class="tag">원정 중</span>' : '') +
        '<div class="dt-stats"><span>무 <b>' + s.might + '</b></span>' +
          '<span>지 <b>' + s.wisdom + '</b></span>' +
          '<span>통 <b>' + s.command + '</b></span>' +
          '<span class="muted">Lv.' + g.lv + '</span></div>' +
        '</div></div>' +
      (itemBadge(r.item)) +
      '<div class="rstat"><span>충성</span><div class="bar sm' +
        (r.loyal < 25 ? ' bad' : '') + '"><i style="width:' + r.loyal + '%"></i></div>' +
        '<b>' + r.loyal + '</b></div>' +
      growRow(h) +
      (bio ? '<small class="muted dt-bio">' + esc(bio) + '</small>' : '') +
      (h.quote ? '<small class="quote">“' + esc(h.quote) + '”</small>' : '') +
      /* 군주는 상도 승진도 없다 — 제 나라에서 제가 올라갈 자리가 없다 */
      (isLord ? '' :
        '<div class="camp-acts">' +
          '<button class="btn tiny" data-act="reward" data-id="' + h.id + '">🎁 금 300</button>' +
          promoteBtn(h) +
        '</div>') +
      '</div>';
  }

  /** 관직과 경험 — 무장이 자라는 것이 보여야 기르는 뜻이 산다 */
  function growRow(h) {
    var H = global.DG.hero;
    var g = off().grow(h.id);
    var need = H.expNeed(g.lv);
    var pct = g.lv >= H.MAX_LV ? 100 : Math.round(core.clamp(g.exp / need, 0, 1) * 100);
    return '<div class="rstat"><span>' + esc(off().rankName(h.id)) + '</span>' +
      '<div class="bar sm gold"><i style="width:' + pct + '%"></i></div>' +
      '<b>' + (g.lv >= H.MAX_LV ? '만렙' : g.exp + '/' + need) + '</b></div>';
  }

  function promoteBtn(h) {
    var chk = off().promoteCheck(h.id);
    var g = off().grow(h.id);
    if (g.rank >= global.DG.hero.MAX_RANK) {
      return '<button class="btn tiny" disabled>✨ 더 올릴 자리 없음</button>';
    }
    var c = off().promoteCost(g.rank);
    return '<button class="btn tiny' + (chk.ok ? ' primary' : '') + '"' +
      (chk.ok ? '' : ' disabled') + ' data-act="promote" data-id="' + h.id +
      '" title="' + esc(chk.ok ? '올린다' : chk.why) + '">✨ 승진 <span class="muted">공 ' +
      off().rec(h.id).feats + '/' + c.feats + ' · 🪙' + c.gold + '</span></button>';
  }

  /* ── 외교 ─────────────────────────────────────────────── */

  function viewDiplo() {
    var D = global.DG.diplo;
    var me = R().me();
    var rank = R().ranking().filter(function (f) { return f.id !== me; });
    /* 사자 — 아무 성에서나, 아직 명령을 안 쓴 사람 중 지력 으뜸 */
    var by = null, bv = -1, cs = R().citiesOf(me), i, j;
    for (i = 0; i < cs.length; i++) {
      var ready = R().readyAt(cs[i]);
      for (j = 0; j < ready.length; j++) {
        var w = off().stats(ready[j].id).wisdom;
        if (w > bv) { bv = w; by = ready[j]; }
      }
    }
    var html = '<div class="sec"><div class="card">' +
      '<div class="stat-row"><span>사자</span><b>' + (by ? esc(by.name) + ' (지력 ' + bv + ')' : '없음') + '</b></div>' +
      '<small class="muted">사자는 <b>그 달의 명령 한 번</b>을 씁니다. ' +
      '동맹·화친 동안에는 서로 칠 수 없습니다.</small></div></div>';

    for (i = 0; i < rank.length; i++) {
      var f = rank[i];
      var rel = D.relation(me, f.id);
      var ally = D.alliedWith(me, f.id), truce = D.trucedWith(me, f.id);
      var mf = R().force(me);
      html += '<div class="card"><div class="stat-row">' +
        '<span><i class="fdot" style="background:' + forceColor(f.id) + '"></i> <b>' +
          esc(f.name) + '</b>' +
          (ally ? ' <span class="tag">동맹 ' + mf.allies[f.id] + '개월</span>' : '') +
          (truce ? ' <span class="tag">화친 ' + mf.truce[f.id] + '개월</span>' : '') + '</span>' +
        '<span class="muted">🏯 ' + f.cities + ' · 🪖 ' + core.fmt(f.troops) + '</span></div>' +
        '<div class="rstat"><span>우호</span><div class="bar sm"><i style="width:' + rel +
          '%"></i></div><b>' + rel + '</b></div>';
      if (by && !ally) {
        html += '<div class="bagtools">' +
          (truce ? '' :
            '<button class="btn tiny" data-act="envoy" data-kind="truce" data-to="' + f.id +
            '" data-by="' + by.id + '">화친 ' + Math.round(D.envoyChance('truce', me, f.id, by.id, 200) * 100) + '%</button>') +
          '<button class="btn tiny" data-act="envoy" data-kind="ally" data-to="' + f.id +
            '" data-by="' + by.id + '">동맹 ' + Math.round(D.envoyChance('ally', me, f.id, by.id, 200) * 100) + '%</button>' +
          '<button class="btn tiny ghost" data-act="envoy" data-kind="tribute" data-to="' + f.id +
            '" data-by="' + by.id + '">🎁 조공 600</button>' +
          '</div>';
      }
      html += '</div>';
    }
    return html;
  }

  /* ── 학당 (문답 — 곁가지) ─────────────────────────────── */

  function viewSchool() {
    var QD = global.DG.quizData;
    var pr = global.DG.quiz.progress();
    var st = R().state();
    var html = '<div class="sec"><div class="card">' +
      '<div class="stat-row"><span>익힌 문답</span><b>' + pr.learned + ' / ' + pr.total + '</b></div>' +
      '<div class="stat-row"><span>학식</span><b>' + (st.lore || 0) + ' / ' + R().LORE_PER_FIND + '</b></div>' +
      '<small class="muted">문답을 <b>처음</b> 맞히면 군자금이 들어오고 <b>학식</b>이 쌓입니다. ' +
      '학식이 차면 우리 땅에 묻힌 <b>재야 하나가 저절로 드러납니다</b> — 수색 명령을 아끼는 길입니다. ' +
      '이 판의 알맹이는 삼국지이고, 학당은 곁가지입니다.</small></div></div>';

    if (!quizCur) {
      html += '<div class="sec"><h4>분야</h4>' +
        '<button class="btn primary wide" data-act="q-start" data-cat="">🎲 전 분야 섞어서</button>' +
        '<div class="qcats">';
      for (var i = 0; i < QD.CATS.length; i++) {
        var c = QD.CATS[i], per = pr.per[c.key];
        html += '<button class="qcat-btn" data-act="q-start" data-cat="' + c.key + '">' +
          '<span style="color:' + c.color + '">' + c.emoji + '</span><b>' + esc(c.name) +
          '</b><small>' + per.learned + ' / ' + per.total + '</small></button>';
      }
      return html + '</div></div>';
    }

    var p = quizCur.p, cat = QD.catOf(p.cat);
    html += '<div class="sec"><div class="qbox">' +
      '<div class="qb-head"><b style="color:' + cat.color + '">' + cat.emoji + ' ' +
        esc(cat.name) + '</b><span class="muted">' + p.lvName + '</span>' +
      '<button class="btn tiny ghost" data-act="q-quit" style="margin-left:auto">그만</button></div>' +
      '<p class="qq">' + esc(p.q) + '</p>';
    if (!quizCur.result) {
      html += '<div class="qchoices">';
      for (var j = 0; j < p.choices.length; j++) {
        html += '<button class="qchoice" data-act="q-answer" data-i="' + j + '"><b>' +
          (j + 1) + '</b> ' + esc(p.choices[j]) + '</button>';
      }
      html += '</div>';
    } else {
      var r = quizCur.result;
      html += '<div class="qresult ' + (r.ok ? 'good' : 'bad') + '">' +
        (r.ok ? (r.first ? '✅ 정답 — 새로 익혔습니다' : '✅ 정답 (복습)') : '❌ 오답') +
        '<b> ' + esc(r.answerText) + '</b></div><p class="qwhy">' + esc(r.why) + '</p>';
      var bits = [];
      if (r.reward.gold) { bits.push('🪙 +' + r.reward.gold); }
      if (r.reward.school && r.reward.school.found) {
        bits.push('🔍 ' + r.reward.school.found.name + ' 이(가) 드러났다');
      }
      if (bits.length) { html += '<div class="qreward">' + bits.join(' · ') + '</div>'; }
      html += '<button class="btn primary wide" data-act="q-next">다음 문제</button>';
    }
    return html + '</div></div>';
  }

  /* ── 기록 ─────────────────────────────────────────────── */

  function viewLog() {
    var log = core.save.log;
    if (!log.length) { return '<div class="hint">아직 기록이 없습니다.</div>'; }
    var out = '<div class="loglist">';
    for (var i = 0; i < log.length; i++) {
      out += '<div class="lrow ' + log[i].kind + '">' + esc(log[i].text) + '</div>';
    }
    return out + '</div>';
  }

  /* ── 덮개 화면 ────────────────────────────────────────── */

  /* ── 수를 묻는다 (prompt 대신) ────────────────────────
   * 폰에서 `prompt()` 는 숫자 키패드가 아니라 글자판을 띄우고, 홈 화면에 담아
   * 띄운 앱(standalone)에서는 아예 뜨지 않는 기기가 있다. 출진·보급·병력 보내기는
   * 이 판에서 가장 자주 누르는 자리라, 막히면 폰에서는 놀 수가 없다.
   * 그래서 **자체 카드**로 바꿨다 — 미는 막대와 ¼·½·⅘·전부.
   */
  var askCb = null;

  function askNumber(opt) {
    askCb = opt.done;
    var max = Math.max(1, Math.floor(opt.max));
    var init = Math.max(1, Math.min(max, Math.floor(opt.value || max)));
    showEnc(
      '<h3 style="margin:0 0 2px;font-size:17px">' + esc(opt.title) + '</h3>' +
      (opt.hint ? '<small class="muted">' + opt.hint + '</small>' : '') +
      '<div class="numask">' +
        '<b id="asknum">' + core.fmt(init) + '</b>' +
        '<input id="askrange" type="range" min="1" max="' + max + '" value="' + init + '">' +
        '<div class="camp-acts">' +
          '<button class="btn tiny" data-act="ask-part" data-p="0.25">¼</button>' +
          '<button class="btn tiny" data-act="ask-part" data-p="0.5">½</button>' +
          '<button class="btn tiny" data-act="ask-part" data-p="0.8">⅘</button>' +
          '<button class="btn tiny" data-act="ask-part" data-p="1">전부</button>' +
        '</div>' +
        '<div class="camp-acts">' +
          '<button class="btn primary" data-act="ask-ok">' + esc(opt.ok || '보낸다') + '</button>' +
          '<button class="btn ghost" data-act="ask-no">그만</button>' +
        '</div>' +
      '</div>');
    var rg = $('askrange');
    if (rg) { rg.addEventListener('input', askShow); }
  }

  function askShow() {
    var rg = $('askrange'), n = $('asknum');
    if (rg && n) { n.textContent = core.fmt(parseInt(rg.value, 10)); }
  }

  function showEnc(html) {
    els.encounter.innerHTML = '<div class="enc-card">' + html + '</div>';
    els.encounter.classList.add('show');
  }

  function closeEnc() {
    els.encounter.classList.remove('show');
    els.encounter.innerHTML = '';
  }

  /** 먼저 **판(시나리오)** 을 고른다 */
  function showScenPick() {
    var html = '<h3 style="margin:0 0 2px;font-size:19px">어느 해에서 시작하시겠습니까</h3>' +
      '<small class="muted">같은 서른 성이지만, 누가 어디를 쥐고 있는지가 다릅니다.</small>' +
      '<div class="fpick scen">';
    for (var i = 0; i < FD.SCENARIOS.length; i++) {
      var sc = FD.SCENARIOS[i];
      html += '<button class="fcard wide-card" data-act="pick-scen" data-id="' + sc.id + '">' +
        '<b>' + sc.year + '년 · ' + esc(sc.name) + '</b>' +
        '<small class="muted">' + esc(sc.hanja) + ' · 세력 ' + sc.forces.length + '</small>' +
        '<small class="muted">' + esc(sc.desc) + '</small>' +
        '</button>';
    }
    showEnc(html + '</div>');
  }

  function showForcePick(scenId) {
    var sc = FD.scenario(scenId || pickScen);
    pickScen = sc.id;
    FD.use(sc.id);               // 이 화면이 보여 줄 표를 그 시나리오 것으로 갈아 끼운다
    var html = '<h3 style="margin:0 0 2px;font-size:19px">삼국지 ' + sc.year + '년 — ' +
      esc(sc.name) + '</h3>' +
      '<small class="muted">' + esc(sc.desc) + ' 성이 적을수록 어렵습니다.</small>' +
      '<button class="btn tiny ghost" data-act="back-scen" style="margin:8px 0 0">↩ 다른 해</button>' +
      '<div class="fpick">';
    var list = FD.FORCES.slice().sort(function (a, b) { return b.cities.length - a.cities.length; });
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      var lord = off().find(f.lord);
      var CREED_KOR = { aggressive: '공격', balanced: '균형', turtle: '수성' };
      html += '<button class="fcard" data-act="pick-force" data-id="' + f.id + '"' +
        ' style="border-color:' + f.color + '">' +
        (lord ? pt(lord, 44) : '') +
        '<b>' + esc(f.name) + '</b>' +
        '<small>🏯 ' + f.cities.length + ' · 👤 ' + (f.officers.length + 1) + '</small>' +
        '<small class="muted">' + esc(CD.find(f.cities[0]).name) + ' · ' +
          CREED_KOR[f.creed] + '</small>' +
        '</button>';
    }
    showEnc(html + '</div>');
  }

  /** 개입 없이 끝난 싸움(AI 가 친 것 · 진영 재개 등)도 실시간으로 숫자가
   *  바뀐다(2026-09-10) — 처음엔 시작 대 끝만 못박아 뒀는데("합마다 갈아
   *  끼우지 않는다"), battle3d.render() 가 이미 합·라운드마다 디오라마를
   *  갈아 끼우면서도 그 타이밍을 밖으로 안 알려 줘서 HUD 만 멈춰 있었다 —
   *  이제 render() 의 둘째 인자(onFrame)로 같은 타이밍을 받아 개입형 실시간
   *  전투(`updateBattleHud`, `showBattleLive` 참고)와 같은 함수로 갱신한다 */
  function showBattle(rep) {
    var html = (global.DG.battle3d ? '<canvas id="battle3d"></canvas>' : '') +
      '<h3 style="margin:0 0 6px;font-size:18px">⚔️ 전황</h3>' +
      battleHudHtml(rep) +
      '<div class="warlog">';
    for (var i = 0; i < rep.log.length; i++) {
      html += '<div>' + esc(rep.log[i]) + '</div>';
    }
    html += '</div><button class="btn primary wide" data-act="close-enc">확인</button>';
    showEnc(html);
    if (global.DG.battle3d) {
      global.DG.battle3d.render(rep, function (state) { updateBattleHud(rep, state); });
    }
  }

  function showEnd(kind) {
    var st = R().state();
    showEnc('<h3 style="margin:0 0 6px;font-size:20px">' +
      (kind === 'win' ? '👑 천하통일' : '🏳️ 멸망') + '</h3>' +
      '<small class="muted">' + st.year + '년 ' + st.month + '월. ' +
      (kind === 'win' ? '온 땅의 성이 모두 한 깃발 아래 들었습니다.'
                      : '성을 모두 잃었습니다. 처음부터(↺) 다시 시작할 수 있습니다.') +
      '</small><button class="btn primary wide" data-act="close-enc">확인</button>');
  }

  function showHelp() {
    showEnc('<h3 style="margin:0 0 4px;font-size:18px">📜 노는 법</h3><div class="helplist">' +
      '<div><b>달</b> 무장 한 사람이 한 달에 <b>명령 하나</b>를 씁니다. 다 쓰면 ▶ 다음 달</div>' +
      '<div><b>내정</b> 성을 눌러 개간·상업·기술·치안·축성·징병·훈련·수색·등용</div>' +
      '<div><b>금</b> 세력 금고 하나. <b>군량</b>은 성마다 따로 — 6·10월에 거둡니다</div>' +
      '<div><b>태수</b> 지력·통솔이 그 성의 수입과 수확에 곱해지고, 계략을 막습니다</div>' +
      '<div><b>출진</b> 맞닿은 성에만. 수비도 이웃에서 <b>구원군</b>을 부릅니다</div>' +
      '<div><b>일기토</b> 무력이 엇비슷한 장수끼리 붙습니다. 이기면 그 싸움 내내 기세를 탑니다</div>' +
      '<div><b>충성</b> 바닥나면 떠납니다. 금을 내려 붙듭니다 — 적의 이간이 노리는 곳입니다</div>' +
      '<div><b>재야</b> 한국사·일본사·세계사 인물은 재야입니다. 수색해야 보입니다</div>' +
      '<div><b>학당</b> 문답은 곁가지입니다 — 군자금과 <b>재야 하나</b>를 드러냅니다</div>' +
      '</div><button class="btn primary wide" data-act="close-enc">확인</button>');
  }

  /* ── 알림 ─────────────────────────────────────────────── */

  var toastTimer = null;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    if (toastTimer) { clearTimeout(toastTimer); }
    toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, 2400);
  }

  global.DG = global.DG || {};
  global.DG.ui = {
    init: init, toast: toast,
    openSheet: openSheet, closeSheet: closeSheet, openCity: openCity,
    renderTop: renderTop, renderMap: renderMap, renderSheet: renderSheet,
    showScenPick: showScenPick, showForcePick: showForcePick,
    showHelp: showHelp, showBattle: showBattle,
    closeEnc: closeEnc,
    /** 자가진단용 */
    _act: act, _tab: function () { return openTab; }, _city: function () { return openCityId; },
    _setOrder: function (k) { pickOrder = k; },
    _quiz: function () { return quizCur; }
  };
})(window);
