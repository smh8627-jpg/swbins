/**
 * 부트스트랩 & 메인 루프 — 사가GO 사냥터 (메이플스토리식)
 * ---------------------------------------------------------------
 * 놀이 순환은 셋이다:
 *   뛴다 → 썬다 → 오른다 (레벨이 오르면 다음 사냥터가 열린다)
 *
 * 다른 셋과 **완전히 다른 프로젝트**다. 세이브도 따로 쓴다 (yeoksa-side/save/v1).
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var ui = global.DG.ui;
  var S = global.DG.side;

  var lastFrame = 0;
  var uiAcc = 0;
  var saveAcc = 0;

  function start() {
    var fresh = !core.load();

    if (core.save.settings.prop) { global.DG.sprite.setProp(core.save.settings.prop); }
    if (core.save.settings.style) { global.DG.sprite.setStyle(core.save.settings.style); }

    global.DG.sideView.init(document.getElementById('stage'));
    if (global.DG.quest) { global.DG.quest.init(); }   // 사명이 'side:kill' 을 듣기 시작한다
    ui.init();
    bindKeys();

    if (fresh) {
      /* 싸울 몸이 필요하다 — 무인 기질 인물 하나를 앞에 세운다 */
      var pool = global.DG.data.heroes.filter(function (h) {
        return h.trait === 'might' && h.rarity <= 3;
      });
      var me = core.pick(pool.length ? pool : global.DG.data.heroes);
      core.save.dex.heroes[me.id] = { count: 1, firstAt: Date.now() };
      global.DG.hero.ensure(me.id);
      core.save.party = [me.id];
      core.log('사냥을 나갑니다. ' + me.name + ' 의 몸으로 싸웁니다.', 'info');
    }

    bindTopbar();
    lastFrame = performance.now();
    requestAnimationFrame(loop);

    global.addEventListener('beforeunload', function () { core.persist(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { core.persist(); }
      else { core.save.lastSeen = Date.now(); }
    });
  }

  /* 키보드 — **원작 배치**다.
     ← → 달리기 · ↑ 오르기/문 · ↓ 내려가기 · Space 점프(↓ 와 함께면 발판 빠져나가기) ·
     1~4 스킬 · Q 탕약. ↑ 를 점프로 두면 사다리와 부딪친다. */
  function bindKeys() {
    global.addEventListener('keydown', function (e) {
      var k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') { S.setInput('left', true); }
      else if (k === 'arrowright' || k === 'd') { S.setInput('right', true); }
      else if (k === 'arrowup' || k === 'w') { S.setInput('up', true); }
      else if (k === 'arrowdown' || k === 's') { S.setInput('down', true); }
      else if (k === ' ') { S.setInput('jump', true); }
      else if (k === 'q') { S.drink(); }
      else if (k >= '1' && k <= '8') { S.castSkill(parseInt(k, 10) - 1); }
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) >= 0) {
        if (e.target === document.body) { e.preventDefault(); }
      }
    });
    global.addEventListener('keyup', function (e) {
      var k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') { S.setInput('left', false); }
      else if (k === 'arrowright' || k === 'd') { S.setInput('right', false); }
      else if (k === 'arrowup' || k === 'w') { S.setInput('up', false); }
      else if (k === 'arrowdown' || k === 's') { S.setInput('down', false); }
    });
    global.addEventListener('blur', function () {
      S.setInput('left', false); S.setInput('right', false);
      S.setInput('up', false); S.setInput('down', false);
    });
  }

  function bindTopbar() {
    var autoBtn = document.getElementById('btn-auto');
    if (autoBtn) {
      var syncAutoBtn = function () { autoBtn.classList.toggle('on', global.DG.auto.active()); };
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

    var PROP_ORDER = ['normal', 'chibi', 'tall'];
    var PROP_LABEL = { normal: '4등', chibi: '2등', tall: '8등' };
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
        core.emit('changed');
      });
    }

    var STYLE_ORDER = ['maple', 'classic', 'story', 'anime'];
    var STYLE_ICON = { maple: '🍁', classic: '🖌️', story: '📗', anime: '🎴' };
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
        core.emit('changed');
      });
    }

    /* 소리 — 첫 눌림에서 깨어난다(브라우저 규칙). 그 규칙은 sfx.js 가 스스로 걸어 두므로
       여기서는 켜고 끄기만 한다. 끈 상태는 세이브(settings.sound)에 남는다 */
    var soundBtn = document.getElementById('btn-sound');
    if (soundBtn && global.DG.sfx) {
      var syncSoundBtn = function () {
        var on = global.DG.sfx.enabled();
        soundBtn.textContent = on ? '🔊' : '🔇';
        soundBtn.classList.toggle('on', on);
      };
      syncSoundBtn();
      soundBtn.addEventListener('click', function () {
        global.DG.sfx.setEnabled(!global.DG.sfx.enabled());
        syncSoundBtn();
      });
    }

    document.getElementById('btn-help').addEventListener('click', showHelp);
  }

  function showHelp() {
    var el = document.getElementById('encounter');
    el.innerHTML =
      '<div class="enc-card">' +
        '<h3 style="margin:0 0 4px;font-size:18px">🏃 조작 안내</h3>' +
        '<div class="helplist">' +
          '<div><b>이동</b> ← → (또는 A D) · 화면 아래 좌우를 눌러도 됩니다</div>' +
          '<div><b>점프</b> Space · 화면 위쪽을 누르기 — 발판은 <b>위에서만</b> 밟힙니다</div>' +
          '<div><b>오르기</b> ↑ 밧줄·사다리를 탄다 · ↓ 아래로 내려간다 ' +
            '(줄 위에서 Space 를 누르면 손을 뗍니다)</div>' +
          '<div><b>내려서기</b> ↓ + Space — 밟고 선 발판을 빠져나갑니다</div>' +
          '<div><b>문</b> 사냥터 끝의 빛 앞에서 ↑ — 옆 사냥터로 걸어 넘어갑니다</div>' +
          '<div><b>공격</b> 1~8 — 무엇이 놓이는지는 직업과 익힌 무예에 따릅니다</div>' +
          '<div><b>전직</b> Lv.10 에 무사·궁수·협객·방사 중 하나를 고릅니다 (🥋 무예). ' +
            'Lv.25 에 윗자리로 오릅니다 — <b>되돌릴 수 없습니다</b></div>' +
          '<div><b>무예 점수</b> 레벨마다 3점. 무예를 올리면 세지고, ' +
            '<b>찍어야 조작 띠에 놓입니다</b></div>' +
          '<div><b>탕약</b> Q — 체력 45% 회복. 적을 잡을 때 가끔 떨어집니다</div>' +
          '<div><b>궁수</b> 활·조총을 든 적은 <b>멀리서 쏩니다</b> — 사거리에 들면 ❗ 를 ' +
            '띄우고 다가오지 않습니다. 붙거나 기탄(3)으로 받아치세요</div>' +
          '<div><b>내 몸</b> 앞에 세운 인물의 능력치가 체력·공격력이 됩니다 (📖 도감)</div>' +
          '<div><b>장비</b> 🎒 가방에서 낍니다. 적이 떨구고 🏪 저자에서도 삽니다 — ' +
            '방어는 맞는 값을 깎습니다(6할까지)</div>' +
          '<div><b>주문서</b> 물건에 씁니다. <b>실패해도 물건은 남고</b> 업횟만 닳습니다</div>' +
          '<div><b>쓰러짐</b> 그 판에서 주운 금의 절반만 남습니다</div>' +
          '<div><b>사냥터</b> 레벨이 오르면 열립니다 (들판 → 숲 → 굴혈)</div>' +
          '<div><b>자동</b> 🤖 를 누르면 대신 사냥합니다 (쉬는 화면에서 세부 설정)</div>' +
        '</div>' +
        '<button class="btn primary wide" id="help-ok">확인</button>' +
      '</div>';
    el.classList.add('show');
    document.getElementById('help-ok').addEventListener('click', function () {
      el.classList.remove('show'); el.innerHTML = '';
    });
  }

  /* 경직(硬直) — 급소가 터지면 손이 한 박자 멎는다. 원작에서 큰 타격에 잠깐
     화면이 멈추던 그 감각이고, 손맛의 절반이 여기서 나온다.
     **판정 층이 아니라 이 루프에만 둔다** — 자가진단과 자동 사냥은 update(dt) 를
     직접 굴리므로 경직에 닿지 않는다. 그래서 균형이 한 자도 안 바뀐다. */
  var freeze = 0;

  function loop(now) {
    var dt = Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;

    /* side.js 가 남긴 'shake' 를 보고 멎는다 — 새 이벤트를 만들지 않았다 */
    if (S.active()) {
      var list = S.fx(), i;
      for (i = 0; i < list.length; i++) {
        if (list[i].t === 'shake' && list[i].big && !list[i].froze) {
          list[i].froze = true;
          freeze = 0.055;
        }
      }
    }
    if (freeze > 0) {
      freeze -= dt;
      dt *= 0.12;                                   // 아주 멎지는 않는다 — 느려질 뿐이다
    }

    global.DG.auto.update(dt);
    S.update(dt);
    if (!global.DG_NO_DRAW) { global.DG.sideView.draw(); }

    uiAcc += dt;
    if (uiAcc >= 0.15) { uiAcc = 0; ui.tickRefresh(); }   // 체력 바는 자주 갱신해야 한다

    saveAcc += dt;
    if (saveAcc >= 10) { saveAcc = 0; core.persist(); }

    requestAnimationFrame(loop);
  }

  global.DG = global.DG || {};
  global.DG.game = { boot: boot, start: start };

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
