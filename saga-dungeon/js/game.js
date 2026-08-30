/**
 * 부트스트랩 & 메인 루프 — 사가블로 (디아블로식 로그라이크)
 * ---------------------------------------------------------------
 * 놀이 순환은 하나뿐이다:
 *   내려간다 → 방을 치운다 → 은사를 고른다 → 더 내려가거나 챙겨서 나온다
 *
 * 지도를 걷는 게임(deungyong-go)과 **완전히 다른 프로젝트**다. 세이브도 따로 쓴다
 * (yeoksa-dungeon/save/v1). 여기서 고친 것은 다른 게임에 가지 않는다.
 *
 * 인물은 어디서 오나 — 지도가 없으니 조우로 얻을 수 없다. 그래서
 *   시작할 때 출사표로 3명,
 *   보스 층(3층마다)을 답파하면 1명이 합류한다.
 * 도감이 던전으로 자라는 구조다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var ui = global.DG.ui;

  var lastFrame = 0;
  var uiAcc = 0;
  var saveAcc = 0;

  /* ── 인물 합류 ────────────────────────────────────────── */

  var START_PARTY = 3;

  /** 아직 없는 인물 중 하나 (등급이 낮은 쪽을 먼저 — 처음부터 ★5가 오면 재미가 없다) */
  function pickNewHero(maxRarity) {
    var pool = [], i;
    for (i = 0; i < global.DG.data.heroes.length; i++) {
      var h = global.DG.data.heroes[i];
      if (h.rarity > maxRarity) { continue; }
      if (!core.save.dex.heroes[h.id]) { pool.push(h); }
    }
    if (!pool.length) { return null; }
    return core.pick(pool);
  }

  /** 인물을 도감에 넣고 자리가 있으면 동행에 세운다 */
  function joinHero(h, why) {
    var dex = core.save.dex.heroes;
    if (dex[h.id]) {
      dex[h.id].count += 1;                 // 중복 — 승급 재료
      core.log('✨ ' + h.name + ' 이(가) 또 합류 — 중복 +1 (' + why + ')', 'good');
    } else {
      dex[h.id] = { count: 1, firstAt: Date.now() };
      global.DG.hero.ensure(h.id);
      core.gainFeat(h.rarity * 8, '합류');
      core.log('🤝 ' + h.name + ' 이(가) 합류했다 (' + why + ')', 'good');
      core.emit('dex:new', { cat: 'heroes', id: h.id });
    }
    if (core.save.party.length < 5 && core.save.party.indexOf(h.id) < 0) {
      core.save.party.push(h.id);
    }
    core.emit('changed');
  }

  /** 보스 층을 깼을 때 — 층이 깊을수록 좋은 인물이 온다 */
  function bossReward(floor) {
    var maxRar = floor >= 21 ? 5 : (floor >= 12 ? 4 : (floor >= 6 ? 3 : 2));
    var h = pickNewHero(maxRar);
    if (!h) {                                // 다 모았으면 중복으로 준다
      h = core.pick(global.DG.data.heroes);
    }
    joinHero(h, '제' + floor + '층 보스');
    core.emit('toast', '🤝 ' + h.name + ' 합류!');
  }

  /* ── 부트 ─────────────────────────────────────────────── */

  function start() {
    var fresh = !core.load();

    if (core.save.settings.prop) { global.DG.sprite.setProp(core.save.settings.prop); }
    if (core.save.settings.style) { global.DG.sprite.setStyle(core.save.settings.style); }
    /* 행상 — 회차가 끝날 때마다 새 물건이 온다(vendor.js 가 dungeon:end 를 듣는다) */
    if (global.DG.vendor) { global.DG.vendor.init(); }

    /* 던전이 끝나면 마을로 돌아온다.
       **dungeonView.init() 보다 먼저 걸어 둔다** — 화면도 dungeon:end 를 듣고
       스스로 내려가는데, 그때 마을이 이미 켜져 있어야 한 틱 검게 깜빡이지 않는다.
       core.on 은 걸어 둔 순서대로 부르므로, 이 순서가 곧 판정이다. */
    core.on('dungeon:end', function () {
      global.DG.town.enter({ fromDungeon: true });
    });

    /* **장면은 하나만 켜져 있어야 한다.** 둘이 동시에 켜지면 화면(dungeon-view)이
       마을을 그리는 동안 던전이 뒤에서 조용히 흘러간다 — 맞고 있는데 마을이
       보이는 꼴이다. 그 규칙을 여기서 지킨다. dungeon.js 는 마을을 몰라도 된다
       (자동 순행처럼 enter 를 직접 부르는 길이 여럿이라, 부르는 쪽마다
       마을을 끄게 맡기면 반드시 하나가 빠진다). */
    core.on('dungeon:enter', function () { global.DG.town.leave(); });

    ui.init();
    global.DG.dungeonView.init();
    if (global.DG.minimap) { global.DG.minimap.init(); }   // 우상단 미니맵 (PLAN 27절)

    if (fresh) {
      /* 출사표 — 맨몸으로는 던전에 들어갈 수 없으니 셋을 붙여 준다 */
      for (var i = 0; i < START_PARTY; i++) {
        var h = pickNewHero(3);
        if (h) { joinHero(h, '출사표'); }
      }
      core.log('출사표를 올렸습니다. 아래로 내려가면 될 일입니다.', 'info');
    }

    /* 보스 층을 깨면 인물이 합류한다 — 층을 내려가는 순간에 판정한다 */
    core.on('dungeon:floor', function (floor) {
      var cleared = floor - 1;               // 방금 깬 층
      if (cleared >= 1 && global.DG.dungeonData.isBossFloor(cleared)) {
        bossReward(cleared);
      }
    });

    /* 마을에서 시작한다 — 원작에서 판이 열리면 야영지에 서 있다.
       예전에는 카드 한 장(ui.renderCamp)이 첫 화면이었다. */
    global.DG.town.enter();

    bindTopbar();
    lastFrame = performance.now();
    requestAnimationFrame(loop);

    global.addEventListener('beforeunload', function () { core.persist(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { core.persist(); }
      else { core.save.lastSeen = Date.now(); }
    });
  }

  function bindTopbar() {
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
      if (!confirm('정말 처음부터 다시 시작할까요? 도감·장비·기록이 모두 사라집니다.')) { return; }
      core.reset();
      location.reload();
    });

    /* 등신 비례 */
    var PROP_ORDER = ['normal', 'chibi', 'tall'];
    var PROP_LABEL = { normal: '4등', chibi: '2등', tall: '8등' };
    var PROP_MSG = {
      normal: '🧍 기본 비례 (4등신)', chibi: '🧒 2등신 — 귀엽게', tall: '🕴️ 8등신 — 늘씬하게'
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
        core.emit('changed');
      });
    }

    /* 그림 양식 — 디아블로 → 전통 → 그림책 → 만화.
       이 판의 기본은 **디아블로풍**이다(sprite.js styleMode). 나머지 셋은
       시리즈 공통 양식이라 남겨 둔다 — 취향껏 갈아 볼 수 있게. */
    var STYLE_ORDER = ['diablo', 'classic', 'story', 'anime'];
    var STYLE_ICON = { diablo: '\uD83D\uDD25', classic: '🖌️', story: '📗', anime: '🎴' };
    var STYLE_MSG = {
      diablo: '\uD83D\uDD25 디아블로풍 — 낮은 채도 · 횃불 테',
      classic: '🖌️ 전통 삽화풍',
      story: '📗 그림책풍 — 선화 + 플랫 채색',
      anime: '🎴 일본 만화풍'
    };
    var styleBtn = document.getElementById('btn-style');
    if (styleBtn) {
      var syncStyleBtn = function () {
        var cur = global.DG.sprite.style();
        styleBtn.textContent = STYLE_ICON[cur] || '\uD83D\uDD25';
        styleBtn.classList.toggle('on', cur !== 'diablo');
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
        core.emit('changed');
      });
    }

    /* 소리 — 원작의 감각에서 큰 몫이라 켠 채로 시작한다(sfx.js).
       브라우저 규칙 때문에 **첫 눌림 전에는 소리가 안 난다** — 이 버튼을 누르는 것이
       대개 그 첫 눌림이 된다. sfx.js 가 스스로 깨어나므로 여기서는 켜고 끄기만 한다. */
    var soundBtn = document.getElementById('btn-sound');
    if (soundBtn && global.DG.sfx) {
      var S = global.DG.sfx;
      var syncSoundBtn = function () {
        var on = S.enabled();
        soundBtn.textContent = on ? '🔊' : '🔇';
        soundBtn.classList.toggle('on', on);
      };
      syncSoundBtn();
      soundBtn.addEventListener('click', function () {
        S.setEnabled(!S.enabled());
        syncSoundBtn();
        ui.toast(S.enabled() ? '🔊 소리를 켰습니다' : '🔇 소리를 껐습니다');
      });
    }

    /* 시점 — iso(원작의 3/4 부감, 기본) ↔ third(어깨너머 3인칭).
       빌드 시점엔 dungeon3d 가 아직 WebGL 을 켜기 전일 수 있어(dungeon-view.js
       가 던전 화면을 처음 세울 때 init 한다) **available() 는 누를 때 본다** —
       그때도 안 켜져 있으면(WebGL 없음 등) 2D 뿐이라는 뜻이니 조용히 알린다. */
    var camBtn = document.getElementById('btn-camera');
    if (camBtn && global.DG.dungeon3d) {
      var D3 = global.DG.dungeon3d;
      var syncCamBtn = function () {
        var third = D3.camMode() === 'third';
        camBtn.classList.toggle('on', third);
        camBtn.title = third ? '시점 (3인칭 어깨너머 — 눌러서 3/4 부감으로)'
                              : '시점 (3/4 부감 — 눌러서 3인칭 어깨너머로)';
      };
      syncCamBtn();
      camBtn.addEventListener('click', function () {
        if (!D3.available()) { ui.toast('이 화면은 3D 가 꺼져 있어 시점을 못 바꿉니다'); return; }
        D3.set('dg3d.camMode', D3.camMode() === 'third' ? 'iso' : 'third');
        syncCamBtn();
        ui.toast(D3.camMode() === 'third' ? '🎥 3인칭 어깨너머' : '🎥 3/4 부감');
      });
    }

    document.getElementById('btn-help').addEventListener('click', showHelp);
  }

  function showHelp() {
    var el = document.getElementById('encounter');
    el.innerHTML =
      '<div class="enc-card">' +
        '<h3 style="margin:0 0 4px;font-size:18px">🕳️ 조작 안내</h3>' +
        '<div class="helplist">' +
          '<div><b>이동</b> WASD · 방향키 · 화면을 누른 채 끌면 그쪽으로 걷습니다</div>' +
          '<div><b>확대</b> 손가락 둘로 벌리거나 오므립니다(휠도 됩니다) · <b>🎥</b> 로 시점 전환</div>' +
          '<div><b>마을</b> 사람과 표식은 <b>다가서면</b> 말이 걸립니다 — ' +
            '굴혈 🕳️ 로 들어가고, 역참 🌀 으로 밟아 둔 층으로 건너뜁니다</div>' +
          '<div><b>공격</b> 사거리에 들어오면 알아서 칩니다 (평타)</div>' +
          '<div><b>무예</b> Z X C V — <b>직업마다 아홉</b>. 배워서 네 칸에 겁니다 (📜 무예)</div>' +
          '<div><b>직업</b> <b>장착한 무기</b>가 정합니다 — 각궁이면 궁장, 선채면 책사…</div>' +
          '<div><b>단약</b> 1 2 3 4 — 요대에서 꺼내 마십니다 (원작의 그 넉 줄)</div>' +
          '<div><b>방</b> 적을 다 잡으면 문이 열립니다. 다음 방은 골라서 갑니다</div>' +
          '<div><b>은사</b> 층을 내려갈 때 셋 중 하나. <b>회차가 끝나면 사라집니다</b></div>' +
          '<div><b>우물·사당</b> 💧 한 번 체력 40% · ⛩️ 은사 하나를 바로 준다</div>' +
          '<div><b>보스</b> 3층마다 마지막 방. 답파하면 <b>새 인물이 합류</b>합니다</div>' +
          '<div><b>감정</b> 양품 이상은 <b>미확인</b>으로 나옵니다 \u2014 감정서를 태워 엽니다</div>' +
          '<div><b>내구</b> 층마다 닳습니다. 부서지면 값을 못 내니 <b>행상에서 수리</b>합니다</div>' +
          '<div><b>저항</b> 적마다 안 통하는 <b>결</b>이 있습니다 — 위쪽 줄에 뜹니다</div>' +
          '<div><b>요구</b> 좋은 물건은 <b>인물 레벨</b>이 차야 입습니다</div>' +
          '<div><b>역참</b> 5층마다 밟으면 다음부터 거기서 시작합니다</div>' +
          '<div><b>주옥</b> 접사가 <b>굴러 나오는</b> 박을 것 — 부위를 안 가립니다 (🔨 세공)</div>' +
          '<div><b>소리</b> 🔊 로 끕니다. <b>고유</b>가 떨어지면 종소리가 납니다</div>' +
          '<div><b>노획물</b> 층을 내려갈 때·탈출할 때 확정. 쓰러지면 <b>전부 잃습니다</b></div>' +
          '<div><b>자동</b> 🤖 를 누르면 대신 돌아 줍니다 (본영에서 세부 설정)</div>' +
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

    global.DG.auto.update(dt);
    global.DG.dungeonView.update(dt);
    /* 마을도 같은 화면에 그린다 — 마을과 던전은 한 무대를 나눠 쓴다 */
    if (!global.DG_NO_DRAW &&
        (global.DG.dungeon.active() || global.DG.town.active())) {
      global.DG.dungeonView.draw();
    }
    if (!global.DG_NO_DRAW && global.DG.minimap) { global.DG.minimap.tick(dt); }

    uiAcc += dt;
    if (uiAcc >= 0.3) { uiAcc = 0; ui.tickRefresh(); }

    saveAcc += dt;
    if (saveAcc >= 10) { saveAcc = 0; core.persist(); }

    requestAnimationFrame(loop);
  }

  global.DG = global.DG || {};
  /** 자가진단이 합류 규칙을 직접 굴려 볼 수 있게 노출한다 */
  global.DG.game = {
    START_PARTY: START_PARTY,
    pickNewHero: pickNewHero, joinHero: joinHero, bossReward: bossReward
  };

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
