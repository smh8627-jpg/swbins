/**
 * 부트스트랩 & 메인 루프 — 사가고 본편 (포켓몬GO / 몬스터헌터 NOW 형태)
 * ---------------------------------------------------------------
 * 본편의 놀이 순환은 셋뿐이다:
 *   걷는다  → 일정 거리마다 보급(등용서·사료·명성)을 받는다
 *   만난다  → 인물 등용 · 펫 포획 → 도감이 쌓인다
 *
 * 여기에 한 축이 더 붙어 있다:
 *   자동    자동 순행(auto.js) — 걷지 못하는 동안 판단만 대신한다
 *
 * **네 게임 중 하나다.** 던전은 yeoksa-dungeon, 문답은 yeoksa-quiz,
 * 마을은 yeoksa-village, 사냥터는 yeoksa-side 가 맡는다 — 여기는 걷고 만나는 축만.
 * 경영(영지·태수·교역)은 완전히 뺐다 — 되살리지 않는다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var world = global.DG.world;
  var ui = global.DG.ui;

  var lastFrame = 0;
  var uiAcc = 0;
  var saveAcc = 0;

  /* ── 걷기 보급 — 포켓스탑 대신, 걸음 자체가 보급이다 ──── */

  /* 어드민이 잡을 수 있는 손잡이다(`core.tuned`). 켤 때 한 번 읽으므로
     바꾼 뒤에는 게임 창을 새로고침해야 듣는다. */
  var SUPPLY_STEP = core.tuned('game.supplyStep', 250);   // m 마다 보급 한 번
  var SUPPLY_GOLD = core.tuned('game.supplyGold', 8);     // 보급마다 딸려오는 금

  function tickSupply() {
    var p = core.save.player;
    if (p.supplyMark > p.distance) { p.supplyMark = p.distance; }
    var got = 0, scrolls = 0;
    while (p.distance - p.supplyMark >= SUPPLY_STEP) {
      p.supplyMark += SUPPLY_STEP;
      p.supplyCount = (p.supplyCount || 0) + 1;
      global.DG.bag.add('feed', 1);
      global.DG.quest.progress('walk', SUPPLY_STEP);
      p.fame += 10;
      p.gold += SUPPLY_GOLD;
      got += 1;
      if (p.supplyCount % 2 === 0) {       // 500m 마다 등용서
        global.DG.bag.add('scroll', 1);
        scrolls += 1;
      }
    }
    if (got) {
      var msg = '🎒 보급 — 🍖 +' + got + ' · 🎖️ +' + (got * 10) + ' · 🪙 +' + (got * SUPPLY_GOLD) +
        (scrolls ? ' · 📜 +' + scrolls : '');
      core.log(msg + ' (누적 ' + core.fmt(p.distance) + 'm)', 'good');
      core.emit('toast', msg);
      core.emit('changed');
    }
  }

  /* 주소에 #fps 를 붙이면 프레임 수를 표시한다 (성능 확인용) */
  var fpsBox = null, fpsFrames = 0, fpsAcc = 0, fpsWorst = 0;
  function initFps() {
    if (global.location.hash.indexOf('fps') < 0) { return; }
    fpsBox = document.createElement('div');
    fpsBox.style.cssText = 'position:fixed;left:12px;top:96px;z-index:90;padding:6px 10px;' +
      'border-radius:10px;background:rgba(10,12,16,.82);border:1px solid rgba(255,255,255,.12);' +
      'font:600 11px ui-monospace,Consolas,monospace;color:#9fe8b0;pointer-events:none';
    fpsBox.textContent = 'fps …';
    document.body.appendChild(fpsBox);
  }
  function tickFps(dt) {
    if (!fpsBox) { return; }
    fpsFrames++; fpsAcc += dt;
    if (dt * 1000 > fpsWorst) { fpsWorst = dt * 1000; }
    if (fpsAcc >= 0.5) {
      var fps = fpsFrames / fpsAcc;
      fpsBox.textContent = 'fps ' + fps.toFixed(0) + ' · 최악 ' + fpsWorst.toFixed(0) + 'ms' +
        ' · 대상 ' + world.spawns.length + ' · ' + (['2D', '2.5D', '3D'][world.tiltMode]);
      fpsBox.style.color = fps >= 50 ? '#9fe8b0' : (fps >= 30 ? '#e8d48a' : '#f09a9a');
      fpsFrames = 0; fpsAcc = 0; fpsWorst = 0;
    }
  }

  function start() {
    var fresh = !core.load();

    // 저장된 등신 비례·그림 양식을 스프라이트에 적용 (캐시가 쌓이기 전에)
    if (core.save.settings.prop) { global.DG.sprite.setProp(core.save.settings.prop); }
    if (core.save.settings.style) { global.DG.sprite.setStyle(core.save.settings.style); }
    // 옛 세이브: 보급 기준점이 없으면 지금 거리에서 시작 (누적분 몰아주기 방지)
    if (!core.save.player.supplyMark && core.save.player.distance > 0) {
      core.save.player.supplyMark = core.save.player.distance;
    }
    // 옛 세이브: 연성·승화가 없던 때 잡아 둔 마리수를 영초로 환산한다 (한 번만)
    if (global.DG.growth) { global.DG.growth.migrate(); }

    world.init(document.getElementById('map'), document.getElementById('map-ground'));
    ui.init();
    global.DG.minimap.init();          // 좌하단 미니맵 — 화면에만 쓰는 층이라 판정 뒤에 붙인다
    global.DG.overworld.init();        // 전체 지도(M키) — 마찬가지로 화면 층

    if (fresh) {
      core.log('여정을 시작합니다. 걸으면 보급을 받고, 만나면 도감이 쌓입니다.', 'info');
    }

    bindTopbar();
    initFps();
    // 온라인 모드로 저장돼 있으면 서버가 살아 있는지 조용히 확인한다
    if (global.DG.net.mode() === 'online') { global.DG.net.probe(true); }
    lastFrame = performance.now();
    requestAnimationFrame(loop);

    global.addEventListener('beforeunload', function () { core.persist(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { core.persist(); }
      else { core.save.lastSeen = Date.now(); }
    });
  }

  function bindTopbar() {
    var geoBtn = document.getElementById('btn-geo');
    geoBtn.addEventListener('click', function () {
      if (world.mode === 'geo') {
        world.useKeyboard();
        geoBtn.classList.remove('on');
        ui.toast('키보드 이동으로 돌아갑니다');
        return;
      }
      ui.toast('위치 권한을 허용하면 지금 있는 곳의 지도로 이동합니다');
      world.useGeo(function (msg) {
        geoBtn.classList.remove('on');
        ui.toast('⚠️ 위치를 못 받았습니다 · ' + msg);
      }, function (c) {
        geoBtn.classList.add('on');
        ui.toast('📡 현재 위치로 이동 · 오차 ±' + Math.round(c.accuracy) + 'm');
        core.emit('changed');
      });
    });

    var autoBtn = document.getElementById('btn-auto');
    if (autoBtn) {
      var syncAutoBtn = function () {
        autoBtn.classList.toggle('on', global.DG.auto.active());
      };
      syncAutoBtn();
      autoBtn.addEventListener('click', function () {
        global.DG.auto.toggle();
        syncAutoBtn();
      });
      core.on('changed', syncAutoBtn);
    }

    document.getElementById('btn-reset').addEventListener('click', function () {
      if (!confirm('정말 처음부터 다시 시작할까요? 도감·지식 서고가 모두 사라집니다.')) { return; }
      core.reset();
      location.reload();
    });

    var mapBtn = document.getElementById('btn-map');
    if (mapBtn) {
      mapBtn.addEventListener('click', function () {
        var st = world.cycleMapStyle();
        ui.toast('🗺️ ' + st.name);
      });
    }

    var TILT_LABEL = ['2D', '2.5D', '3D'];
    var TILT_MSG = [
      '🗺️ 2D — 위에서 내려다봅니다',
      '⛰️ 2.5D — 지면을 눕혔습니다',
      '🎥 3D — 포켓몬GO식 카메라'
    ];
    var tiltBtn = document.getElementById('btn-tilt');
    if (tiltBtn) {
      /* 배율을 라벨에 달아 둔다 — 걸음 배속을 늘 `×n` 으로 보여 주는 것과 같은
         이유다(당겨 놓고 잊으면 왜 안 보이는지 모른다). WebGL 3D 렌더러가 켜져
         있으면(대부분의 기기) 2D·2.5D·3D 어느 시점이든 zoom3d 가 실제로 그려지는
         카메라 배율이다 — 폴백(2D 캔버스)일 때만 camZoom2d 를 보여 준다 */
      var tiltLabel = function () {
        var m = world.tiltMode;
        var z = world.render3dOn ? world.zoom3d : world.camZoom2d;
        return TILT_LABEL[m] + ' ×' + z.toFixed(1);
      };
      tiltBtn.textContent = tiltLabel();
      tiltBtn.classList.toggle('on', world.tilt);
      tiltBtn.addEventListener('click', function () {
        var m = world.cycleTilt();
        tiltBtn.textContent = tiltLabel();
        tiltBtn.classList.toggle('on', m > 0);
        ui.toast(TILT_MSG[m] + ' · 휠·두 손가락·+/- 로 당깁니다');
      });
      core.on('zoom', function () { tiltBtn.textContent = tiltLabel(); });
      core.on('zoom2d', function () { tiltBtn.textContent = tiltLabel(); });
    }

    /* 3인치 모드 — 폰을 멀리 든 것처럼 화면을 확 줄여 넓게 본다 */
    var inchBtn = document.getElementById('btn-3inch');
    if (inchBtn) {
      inchBtn.classList.toggle('on', world.wide3in);
      inchBtn.addEventListener('click', function () {
        var on = world.toggle3inch();
        inchBtn.classList.toggle('on', on);
        ui.toast(on ? '🔍 3인치 모드 — 화면을 멀리서 봅니다' : '🔍 3인치 모드 해제 — 원래 배율로 돌아갑니다');
        if (tiltBtn) { tiltBtn.textContent = tiltLabel(); }
      });
    }

    /* 등신 비례 — 기본(4등신) → 2등신 → 8등신 순환 */
    var PROP_ORDER = ['normal', 'chibi', 'tall'];
    var PROP_LABEL = { normal: '4등', chibi: '2등', tall: '8등' };
    var PROP_MSG = {
      normal: '🧍 기본 비례 (4등신)',
      chibi: '🧒 2등신 — 귀엽게',
      tall: '🕴️ 8등신 — 늘씬하게'
    };
    var propBtn = document.getElementById('btn-prop');
    if (propBtn) {
      propBtn.textContent = PROP_LABEL[global.DG.sprite.prop()];
      propBtn.addEventListener('click', function () {
        var cur = PROP_ORDER.indexOf(global.DG.sprite.prop());
        var next = PROP_ORDER[(cur + 1) % PROP_ORDER.length];
        global.DG.sprite.setProp(next);
        core.save.settings.prop = next;
        core.persist();
        propBtn.textContent = PROP_LABEL[next];
        ui.toast(PROP_MSG[next]);
        core.emit('changed');           // 초상 <img> 들을 새 비례로 다시 굽는다
        if (global.DG.world3d) { global.DG.world3d.resetActors(); }  // 지도 위 3D 배우도 새 비례로 다시 짓는다
      });
    }

    /* 그림 양식 — 전통 삽화 → 그림책(도감) → 일본 만화 순환 */
    var STYLE_ORDER = ['classic', 'story', 'anime'];
    var STYLE_ICON = { classic: '🖌️', story: '📗', anime: '🎴' };
    var STYLE_MSG = {
      classic: '🖌️ 전통 삽화풍',
      story: '📗 그림책풍 — 선화 + 플랫 채색',
      anime: '🎴 일본 만화풍'
    };
    var styleBtn = document.getElementById('btn-style');
    if (styleBtn) {
      var syncStyleBtn = function () {
        var cur = global.DG.sprite.style();
        styleBtn.textContent = STYLE_ICON[cur] || '🖌️';
        styleBtn.classList.toggle('on', cur !== 'classic');
      };
      syncStyleBtn();
      styleBtn.addEventListener('click', function () {
        var cur = STYLE_ORDER.indexOf(global.DG.sprite.style());
        var next = STYLE_ORDER[(cur + 1) % STYLE_ORDER.length];
        global.DG.sprite.setStyle(next);
        core.save.settings.style = next;
        core.persist();
        syncStyleBtn();
        ui.toast(STYLE_MSG[next]);
        core.emit('changed');           // 초상 <img> 를 새 양식으로 다시 굽는다
      });
    }

    document.getElementById('btn-help').addEventListener('click', showHelp);
    bindMore();
  }

  /* ── 도구 서랍 (⋯) ────────────────────────────────────────
   * 폰 폭에서만 열린다. 넓은 화면에서는 CSS 가 서랍을 풀어(display:contents)
   * 단추가 도구줄에 그대로 서므로 여기서 하는 일은 아무 뜻이 없다.
   * 단추를 옮기지 않는다 — 옮기면 위에서 건 이벤트를 다시 걸어야 한다.
   */
  function bindMore() {
    var more = document.getElementById('btn-more');
    var drawer = document.getElementById('tools-drawer');
    if (!more || !drawer) { return; }
    function close() {
      drawer.classList.remove('show');
      more.classList.remove('on');
      more.setAttribute('aria-expanded', 'false');
    }
    more.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !drawer.classList.contains('show');
      drawer.classList.toggle('show', open);
      more.classList.toggle('on', open);
      more.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    /* 서랍 안의 무엇을 누르든 닫는다 — 시점·양식은 눌러 본 결과를 지도에서
       봐야 하는데 서랍이 덮고 있으면 볼 수가 없다 */
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('button')) { close(); }
    });
    document.addEventListener('click', function (e) {
      if (!drawer.classList.contains('show')) { return; }
      if (e.target.closest('.tools')) { return; }
      close();
    });
  }

  function showHelp() {
    var el = document.getElementById('encounter');
    el.innerHTML =
      '<div class="enc-card">' +
        '<h3 style="margin:0 0 4px;font-size:18px">🧭 조작 안내</h3>' +
        '<div class="helplist">' +
          '<div><b>이동</b> WASD · 방향키 (Shift 달리기) · 빈 땅을 탭하면 그쪽으로 걷습니다</div>' +
          '<div><b>지도</b> 실제 지도. 📡 를 누르면 지금 있는 곳으로 이동합니다</div>' +
          '<div><b>시점</b> 2D → 2.5D → 3D 버튼으로 순환합니다 (3D는 포켓몬GO식)</div>' +
          '<div><b>등신</b> 4등/2등/8등 버튼으로 캐릭터 비례를 바꿉니다</div>' +
          '<div><b>양식</b> 🖌️ 전통 → 📗 그림책 → 🎴 만화 순으로 그림이 바뀝니다</div>' +
          '<div><b>보급</b> ' + SUPPLY_STEP + 'm 걸을 때마다 사료·명성, 500m 마다 등용서를 받습니다</div>' +
          '<div><b>배속</b> 걸음을 빠르게 하려면 <b>_admin.html</b> 의 균형 손잡이에서 올립니다 (규칙은 그대로)</div>' +
          '<div><b>역참</b> 🏮 지도 위 고정 지점. 들르면 등용서·사료·금을 줍니다 (5분마다 다시 참)</div>' +
          '<div><b>천거</b> ✉️ 역참에서 받은 천거장을 행낭에 넣고 그만큼 걸으면 그 사람이 찾아옵니다</div>' +
          '<div><b>반려</b> 🐾 펫 하나를 곁에 세웁니다. 함께 걸으면 그 종의 영초가 나오고 사이가 깊어집니다</div>' +
          '<div><b>성채</b> 🏯 다른 세력이 지킵니다. 동행 부대로 밀어내면 열두 시간 동안 공물이 들어옵니다</div>' +
          '<div><b>토벌</b> ⚔️ 성채에 적장이 45분간 듭니다. 격문을 쓰고 이기면 그 자리에서 등용 기회</div>' +
          '<div><b>사명</b> 📋 역참에서 받습니다. 채우면 보상과 인장 — 인장 일곱이면 명사가 찾아옵니다</div>' +
          '<div><b>행낭</b> 🎒 별미·향·축문을 씁니다. 가득 차면 역참이 물건을 주지 않습니다</div>' +
          '<div><b>천후</b> 세 시간마다 바뀝니다. 비엔 짐승이, 바람엔 사람이, 안개엔 신수가 많습니다</div>' +
          '<div><b>조우</b> 파란 원 안의 대상을 클릭하거나 아래 <b>만난다</b></div>' +
          '<div><b>등용</b> 기질에 맞는 어필로 호감도 100 달성 (★4 이상은 기질이 숨겨져 있음)</div>' +
          '<div><b>포획</b> 바늘이 초록 구간일 때 스페이스 — 성공하면 명성도 받습니다</div>' +
          '<div><b>도감</b> 모은 인물·펫. 카드를 누르면 열전과 승급 화면이 열립니다</div>' +
          '<div><b>동행</b> 등용한 인물이 함께 걷습니다 — 선두가 지도 위 내 모습이 됩니다</div>' +
          '<div><b>자동</b> 🤖 를 누르면 대신 걷고 만납니다. 세부 설정은 🔮 사관 시트</div>' +
          '<div><b>사관</b> 🔮 온라인 모드에서 군략·대화·천기 (AI 토큰이 자원)</div>' +
        '</div>' +
        '<button class="btn primary wide" id="help-ok">확인</button>' +
      '</div>';
    el.classList.add('show');
    document.getElementById('help-ok').addEventListener('click', function () {
      el.classList.remove('show'); el.innerHTML = '';
    });
  }

  function loop(now) {
    var dt = Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;

    global.DG.auto.update(dt);          // 자동 순행 — 조작을 대신 넣어 준다
    world.update(dt);
    tickSupply();
    global.DG.letter.tick();            // 다 걸은 천거장을 연다
    global.DG.buddy.tick();             // 곁을 걷는 반려가 영초를 물어 온다
    global.DG.fort.tick();              // 사기가 다한 성채에서 손을 뗀다
    global.DG.npc.tick();               // 이 땅에 사는 열 사람 — 가까이 가면 한 마디 한다
    global.DG.animal.tick();            // 들·강의 짐승 — 늑대가 붙으면 알린다
    global.DG.event.tick();             // 걷다가 만나는 사건 — 거리로 잰다
    global.DG.codex.tick();             // 지나가며 본 것에 도장을 찍는다
    if (!global.DG_NO_DRAW) {
      world.draw();
      global.DG.minimap.tick(dt);      // 미니맵은 매 프레임이 아니라 제 박자로 다시 그린다
      global.DG.overworld.tick(dt);    // 전체 지도는 열려 있을 때만 다시 그린다
    }

    uiAcc += dt;
    if (uiAcc >= 0.3) { uiAcc = 0; ui.tickRefresh(); }

    tickFps(dt);
    global.DG.perf.tick(dt);            // 버거우면 스스로 품질을 낮춘다

    saveAcc += dt;
    if (saveAcc >= 10) { saveAcc = 0; core.persist(); }

    requestAnimationFrame(loop);
  }

  global.DG = global.DG || {};
  /** 자가진단이 걷기 보급을 직접 굴려 볼 수 있게 노출한다 */
  global.DG.game = { tickSupply: tickSupply, SUPPLY_STEP: SUPPLY_STEP };

  /** 진입 — **가입(프로필)이 정해진 뒤에** 게임을 켠다.
   *  account.gate() 가 세이브 키를 정하고 start() 를 돌린다. */
  function boot() {
    global.DG.account.gate(start);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
