/**
 * 부트스트랩 — 사가국지 (삼국지)
 * ---------------------------------------------------------------
 * 이 판은 **턴제**다. 그래서 다른 넷과 달리 `requestAnimationFrame` 루프가 없다.
 * 시간은 사람이 "다음 달" 을 누를 때만 흐른다 — 헤드리스에서 rAF 가 거의 돌지
 * 않는 함정(다른 네 판을 괴롭힌 그것)이 여기서는 아예 성립하지 않는다.
 *
 *   맞힌다 → (곁가지) 학당에서 군자금과 재야 하나
 *   다스린다 → 성마다 무장이 달마다 명령 하나
 *   친다   → 맞닿은 성으로 출진. 수비는 구원군을 부른다
 *   꾄다   → 외교로 시간을 사고, 계략으로 싸우지 않고 깎는다
 *
 * 세이브는 saga-realm/save/<프로필> — **키는 그대로다**.
 * 삼국지로 갈아엎으면서도 키를 안 바꾼 것은, 바꾸면 지금까지의 진행이 사라지기 때문이다.
 * 옛 세이브에 남은 문답·지식은 그대로 살아 있고, 삼국지 판은 `save.rtk` 로 따로 붙는다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var ui = global.DG.ui;

  function start() {
    core.load();

    if (core.save.settings.prop) { global.DG.sprite.setProp(core.save.settings.prop); }
    if (core.save.settings.style) { global.DG.sprite.setStyle(core.save.settings.style); }

    if (global.DG.realm3d && !global.DG_NO_DRAW) {
      global.DG.realm3d.init(document.getElementById('realm3d'));
    }

    ui.init();
    bindTopbar();

    global.addEventListener('beforeunload', function () { core.persist(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { core.persist(); }
      else { core.save.lastSeen = Date.now(); }
    });
  }

  function bindTopbar() {
    var moreBtn = document.getElementById('btn-more');
    var more = document.getElementById('top-more');
    if (moreBtn && more) {
      moreBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        more.classList.toggle('show');
      });
      document.addEventListener('click', function (e) {
        if (more.classList.contains('show') && !more.contains(e.target) && e.target !== moreBtn) {
          more.classList.remove('show');
        }
      });
      global.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { more.classList.remove('show'); }
      });
    }

    var reset = document.getElementById('btn-reset');
    if (reset) {
      reset.addEventListener('click', function () {
        if (!confirm('정말 처음부터 다시 시작할까요? 성·무장·지식이 모두 사라집니다.')) { return; }
        core.reset();
        location.reload();
      });
    }

    var STYLE_ORDER = ['classic', 'story', 'anime'];
    var STYLE_ICON = { classic: '🖌️', story: '📗', anime: '🎴' };
    var styleBtn = document.getElementById('btn-style');
    if (styleBtn) {
      var syncStyleBtn = function () {
        var c = global.DG.sprite.style();
        styleBtn.textContent = STYLE_ICON[c] || '🖌️';
        styleBtn.classList.toggle('on', c !== 'classic');
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

    var btn3d = document.getElementById('btn-3d');
    if (btn3d && global.DG.realm3d) {
      var R3 = global.DG.realm3d;
      if (!R3.available()) { btn3d.style.display = 'none'; }
      btn3d.classList.toggle('on', R3.active());
      btn3d.addEventListener('click', function () {
        var on = R3.toggle();
        btn3d.classList.toggle('on', on);
        core.persist();
      });
    }

    var help = document.getElementById('btn-help');
    if (help) { help.addEventListener('click', ui.showHelp); }
  }

  global.DG = global.DG || {};
  global.DG.game = { start: start };

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
