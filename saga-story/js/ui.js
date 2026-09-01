/**
 * UI — 프로필 / 재화 / 근처 대상 / 시트(서당·도감·사관·기록) / 상세 / 토스트
 * ---------------------------------------------------------------
 * 사가고 본편(포켓몬GO 형태) 화면. 던전·전투·장비 UI 는 js/_expansion/ 으로 뺐고,
 * 경영(영지·태수·건설)은 게임에서 아예 제거했다 (v1.0-full 커밋 94850f8 에 이력이 남아 있다).
 */
/**
 * 화면 — 사가스토리(메이플스토리식)
 * ---------------------------------------------------------------
 * 던전 게임의 ui.js 에서 갈라져 나왔다. 도감·상세·승급·서당·기록은 그대로 쓰고,
 * 던전 전용(본영·부대·장비)을 걷어낸 자리에 **사냥터 고르는 판**(가운데)과
 * **아래 조작 띠**(체력·기력·스킬·탕약)를 넣었다.
 *
 * 네 게임은 완전히 별개 프로젝트다 — 여기서 고친 것이 다른 게임에 가지 않는다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var data = global.DG.data;

  var els = {};
  var openTab = null;          // 열려 있는 시트 이름 (null 이면 닫힘)
  var openDetailRef = null;    // 열려 있는 상세 화면 { kind, id }

  function hero() { return global.DG.hero; }
  function net() { return global.DG.net; }
  function ai() { return global.DG.ai; }

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  /** 스프라이트 초상 <img> (캐시되므로 목록에 여러 번 써도 가볍다) */
  function pt(kind, ref, size) {
    return '<img class="pt" alt="" src="' + global.DG.sprite.portrait(kind, ref, size || 48) + '">';
  }

  var TITLES = [
    [4000, '패왕(霸王)'], [2000, '제후(諸侯)'], [900, '태수(太守)'],
    [350, '장군(將軍)'], [120, '교위(校尉)'], [30, '유사(有司)'], [0, '무명(無名)']
  ];
  function titleOf(featTotal) {
    for (var i = 0; i < TITLES.length; i++) { if (featTotal >= TITLES[i][0]) { return TITLES[i][1]; } }
    return TITLES[TITLES.length - 1][1];
  }

  function init() {
    ['profile', 'wallet', 'camp', 'hud', 'touchpad', 'autobar', 'dock', 'sheet',
     'sheet-title', 'sheet-body', 'sheet-close', 'scrim', 'toast'].forEach(function (id) {
      els[id] = $(id);
    });

    els.dock.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sheet]');
      if (!b) { return; }
      var name = b.getAttribute('data-sheet');
      if (openTab === name) { closeSheet(); } else { openSheet(name); }
    });
    els['sheet-close'].addEventListener('click', closeSheet);
    els.scrim.addEventListener('click', closeSheet);
    global.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') { return; }
      if (openDetailRef) { closeDetail(); return; }
      if (openTab) { closeSheet(); }
    });

    /* 사냥터 고르는 판 · 아래 조작 띠 — 시트와 같은 data-act 규칙을 쓴다 */
    els.camp.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) { return; }
      handleAct(b.getAttribute('data-act'), b);
    });
    if (els.hud) {
      els.hud.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (!b) { return; }
        handleAct(b.getAttribute('data-act'), b);
      });
    }

    els['sheet-body'].addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) { return; }
      handleAct(b.getAttribute('data-act'), b);
    });

    bindRest();
  }

  /** 시트·본영에서 눌린 것을 한 곳에서 받는다 */
  function handleAct(act, b) {
    {
      var id = b.getAttribute('data-id');
      if (act === 'detail') {
        openDetail(b.getAttribute('data-kind') || 'hero', id);
        return;
      }
      if (act === 's-enter') {
        global.DG.side.enter(b.getAttribute('data-stage'));
      } else if (act === 's-leave') {
        global.DG.side.leave();
      } else if (act === 's-skill') {
        global.DG.side.castSkill(parseInt(b.getAttribute('data-i'), 10) || 0);
      } else if (act === 's-drink') {
        if (!global.DG.side.drink()) { toast('탕약이 없거나 체력이 가득합니다'); }
      } else if (act === 'auto-on') {
        global.DG.auto.toggle();
      } else if (act === 'auto-flag') {
        global.DG.auto.toggleFlag(b.getAttribute('data-flag'));
      } else if (act === 'g-equip') {
        global.DG.gear.equip(parseInt(b.getAttribute('data-uid'), 10));
      } else if (act === 'g-unequip') {
        global.DG.gear.unequip(b.getAttribute('data-slot'));
      } else if (act === 'g-sell') {
        var got = global.DG.gear.sell(parseInt(b.getAttribute('data-uid'), 10));
        if (got) { toast('🪙 +' + core.fmt(got)); }
      } else if (act === 'g-scroll') {
        var r = global.DG.gear.apply(parseInt(b.getAttribute('data-uid'), 10),
                                     b.getAttribute('data-scroll'));
        if (!r.ok) { toast('⚠️ ' + r.why); }
      } else if (act === 'q-take') {
        global.DG.quest.take(b.getAttribute('data-q'));
      } else if (act === 'q-turn') {
        global.DG.quest.turnIn(b.getAttribute('data-q'));
      } else if (act === 'j-join') {
        global.DG.job.join(b.getAttribute('data-job'));
      } else if (act === 'j-raise') {
        global.DG.job.raise(b.getAttribute('data-skill'));
      } else if (act === 'sh-gear') {
        global.DG.gear.buyGear(b.getAttribute('data-key'));
      } else if (act === 'sh-scroll') {
        global.DG.gear.buyScroll(b.getAttribute('data-key'));
      } else if (act === 'sh-potion') {
        global.DG.gear.buyPotion(parseInt(b.getAttribute('data-n'), 10) || 1);
      } else { return; }
      core.persist(); renderSheet(); renderTop(); renderCamp();
    }
  }

  /** 상세 화면·자동 상태줄 배선 + 이벤트 구독 + 첫 렌더.
   *  init() 이 마지막에 한 번 부른다. */
  function bindRest() {
    /* 상세 화면 — 별도 오버레이라 이벤트도 따로 받는다 */
    var host = detailHost();
    host.addEventListener('click', function (e) {
      if (e.target === host) { closeDetail(); return; }
      var b = e.target.closest('[data-act]');
      if (!b) { return; }
      var act = b.getAttribute('data-act'), id = b.getAttribute('data-id');
      if (act === 'dt-close') { closeDetail(); return; }
      if (act === 'dt-talk') {
        var say = global.prompt('무엇을 물어보시겠습니까?', '요즘 어떠한가?');
        if (say === null) { return; }
        toast('💬 말을 전하는 중…');
        ai().talk(id, say).then(function (r) {
          if (r && r.error) { toast('⚠️ ' + r.error); return; }
          global.alert((data.find(id) || {}).name + ':\n\n' + (r.text || ''));
        });
        return;
      }
      if (act === 'rankup') { hero().rankUp(id); }
      else if (act === 'join') {
        if (core.save.party.length < 5 && core.save.party.indexOf(id) < 0) { core.save.party.push(id); }
      } else if (act === 'drop') {
        core.save.party = core.save.party.filter(function (x) { return x !== id; });
        delete core.save.petEquip[id];
      } else { return; }
      core.persist(); renderDetail(); renderSheet(); renderTop();
    });
    host.addEventListener('change', function (e) {
      var sel = e.target.closest('[data-equip]');
      if (!sel) { return; }
      var heroId = sel.getAttribute('data-equip');
      if (sel.value) { core.save.petEquip[heroId] = sel.value; }
      else { delete core.save.petEquip[heroId]; }
      core.persist(); renderDetail(); renderSheet();
    });

    if (els.autobar) {
      els.autobar.addEventListener('click', function (e) {
        if (e.target.closest('[data-act="auto-stop"]')) { global.DG.auto.setOn(false); }
      });
    }

    core.on('toast', toast);
    core.on('changed', function () { renderTop(); renderSheet(); renderCamp(); });
    core.on('dex:new', function (p) {
      var ent = data.find(p.id);
      if (ent) { toast('📖 도감 신규 등록 · ' + ent.name); }
    });

    renderTop(); renderCamp();
  }

  /* ── 시트 ─────────────────────────────────────────────── */

  var SHEET_TITLE = {
    field: '🏃 사냥터', bag: '🎒 가방', job: '🥋 무예', shop: '🏪 저자',
    dex: '📖 도감', log: '📜 기록'
  };

  function openSheet(name) {
    openTab = name;
    els['sheet-title'].textContent = SHEET_TITLE[name] || name;
    els.sheet.classList.add('show');
    document.body.classList.add('sheet-open');
    if (global.innerWidth <= 780) { els.scrim.classList.add('show'); }
    syncDock();
    renderSheet();
  }

  function closeSheet() {
    openTab = null;
    els.sheet.classList.remove('show');
    document.body.classList.remove('sheet-open');
    els.scrim.classList.remove('show');
    syncDock();
  }

  function syncDock() {
    var bs = els.dock.querySelectorAll('[data-sheet]');
    for (var i = 0; i < bs.length; i++) {
      bs[i].classList.toggle('on', bs[i].getAttribute('data-sheet') === openTab);
    }
  }

  function renderSheet() {
    if (!openTab) { return; }
    var v = openTab === 'field' ? viewField()
          : openTab === 'bag' ? viewBag()
          : openTab === 'job' ? viewJob()
          : openTab === 'shop' ? viewShop()
          : openTab === 'dex' ? viewDex() : viewLog();
    els['sheet-body'].innerHTML = v;
  }

  /* ── 상단 ─────────────────────────────────────────────── */

  function renderTop() {
    var p = core.save.player;
    var need = core.expNeed(p.level);
    var pct = Math.round(p.exp / need * 100);
    var st = global.DG.side.status();

    els.profile.innerHTML =
      '<div class="avatar" style="--p:' + pct + '%"><i>🏃</i></div>' +
      '<div class="p-meta">' +
        '<div class="p-title">' + titleOf(p.featTotal) + ' · Lv.' + p.level + '</div>' +
        '<div class="p-sub">' +
          (st.active ? esc(st.stage.name) + ' · ' + st.kills + '마리 · 🪙 ' + core.fmt(st.gold)
                     : '🏕️ 쉬는 중 · 누적 ' + core.fmt(st.kills) + '마리') +
          ' · 🧪 ' + st.potions + '</div>' +
        /* 체력·기력 — 예전엔 사냥 중에만 뜨는 #hud 안에만 있어, 쉬는 동안은
           에너지(기력)를 어디서도 볼 수 없었다. 캐릭 정보 카드에 상시 붙여 둔다 */
        '<div class="p-bars">' +
          '<div class="p-bar hp"><i style="width:' + (st.hp / st.hpMax * 100) + '%"></i></div>' +
          '<div class="p-bar mp"><i style="width:' + (st.mp / st.mpMax * 100) + '%"></i></div>' +
        '</div>' +
      '</div>';

    els.wallet.innerHTML =
      coin('🪙', core.fmt(p.gold), '금') +
      coin('🎖️', core.fmt(p.fame), '명성') +
      coin('🏅', core.fmt(p.feat), '공적', true) +
      coin('📜', core.fmt(core.save.items.scroll), '등용서') +
      coin('🍖', core.fmt(core.save.items.feed), '사료');
  }

  function coin(icon, val, label, hi) {
    return '<div class="coin' + (hi ? ' hi' : '') + '" title="' + label + '"><span>' + icon + '</span>' + val + '</div>';
  }

  /* ── 사냥터 고르는 판 (가운데) ─────────────────────────
   * 사냥 중에는 숨고, 쉬는 동안에만 나온다.
   */

  var campKey = null;
  function renderCamp() {
    if (!els.camp) { return; }
    var S = global.DG.side;
    var st = S.status();
    if (st.active) {
      els.camp.classList.remove('show');
      campKey = null;
      return;
    }
    var pw = S.power();
    var me = S.meRef();
    var bossFlags = st.stages.map(function (e) {
      return e.ref.boss ? (S.bossReady(e.ref.key) ? '1' : '0') : '-';
    }).join('');
    var key = [core.save.player.level, st.kills, st.deaths, st.potions, st.bosses, bossFlags,
               me && me.id, global.DG.auto.active(), global.DG.auto.status().doing].join('|');
    if (key === campKey) { els.camp.classList.add('show'); return; }
    campKey = key;

    var html = '<div class="camp-card">' +
      '<div class="camp-head"><b>🏕️ 쉬는 중</b>' +
        '<span class="muted">누적 ' + core.fmt(st.kills) + '마리 · 쓰러짐 ' + st.deaths + '</span></div>';
    if (me) {
      html += '<div class="stat-row"><span>' + esc(me.name) + ' 의 몸</span>' +
        '<b>체력 ' + core.fmt(pw.hp) + ' · 공격 ' + core.fmt(pw.atk) + '</b></div>';
    } else {
      html += '<div class="hint">📖 도감에서 인물을 골라 <b>동행에 넣기</b> 하세요 — 그 인물의 몸으로 싸웁니다.</div>';
    }
    var list = st.stages;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      var bmark = (e.open && e.ref.boss && S.bossReady(e.ref.key)) ? ' 👺' : '';
      html += '<button class="btn ' + (e.open ? (i === 0 ? 'primary' : '') : 'ghost') + ' wide"' +
        (e.open ? '' : ' disabled') + ' data-act="s-enter" data-stage="' + e.ref.key + '">' +
        (e.open ? '🏃 ' : '🔒 ') + esc(e.ref.name) + bmark +
        (e.open ? '' : ' (Lv.' + e.ref.need + ' 부터)') + '</button>';
    }
    html += '<div class="camp-auto">' + sectionAuto() + '</div>';
    html += '<small class="muted">쓰러지면 그 판에서 주운 금의 <b>절반만</b> 남습니다. ' +
      '레벨이 오르면 다음 사냥터가 열립니다.</small>';
    els.camp.innerHTML = html + '</div>';
    els.camp.classList.add('show');
  }

  /* ── 아래 조작 띠 (사냥 중) ───────────────────────────── */

  var hudKey = null;
  function renderHudBar() {
    if (!els.hud) { return; }
    var S = global.DG.side;
    var st = S.status();
    if (!st.active) {
      if (hudKey !== null) { els.hud.classList.remove('show'); els.hud.innerHTML = ''; hudKey = null; }
      if (els.touchpad) { els.touchpad.classList.remove('show'); }
      return;
    }
    var i, sk;
    /* 값만 바뀔 때는 DOM 을 다시 만들지 않는다 (스킬 칸 수가 같으면 갱신만) */
    if (hudKey === null) {
      var html = '<div class="hud-card">' +
        '<div class="hud-hint" id="hud-hint"></div>' +
        '<div class="hud-bars">' +
          '<div class="hud-bar hp"><i></i><span></span></div>' +
          '<div class="hud-bar mp"><i></i><span></span></div>' +
        '</div>' +
        '<div class="hud-skills">';
      for (i = 0; i < st.skills.length; i++) {
        sk = st.skills[i];
        html += '<button class="hud-sk" data-act="s-skill" data-i="' + i + '" title="' +
          esc(sk.name + ' — ' + sk.desc) + '"><b>' + sk.emoji + '</b>' +
          '<small>' + (i + 1) + '</small><u></u></button>';
      }
      html += '<button class="hud-sk potion" data-act="s-drink" title="탕약을 마신다 (Q)">' +
        '<b>🧪</b><small class="pn"></small></button>' +
        '<button class="btn tiny ghost hud-out" data-act="s-leave">🚪 나온다</button>' +
        '</div></div>';
      els.hud.innerHTML = html;
      hudKey = st.skills.length;
    }
    var hp = els.hud.querySelector('.hud-bar.hp');
    var mp = els.hud.querySelector('.hud-bar.mp');
    hp.querySelector('i').style.width = (st.hp / st.hpMax * 100) + '%';
    hp.querySelector('span').textContent = st.hp + ' / ' + st.hpMax;
    mp.querySelector('i').style.width = (st.mp / st.mpMax * 100) + '%';
    mp.querySelector('span').textContent = '기력 ' + st.mp;
    var btns = els.hud.querySelectorAll('.hud-sk');
    for (i = 0; i < st.skills.length; i++) {
      sk = st.skills[i];
      btns[i].classList.toggle('ready', sk.ready);
      btns[i].querySelector('u').style.height = (sk.cdMax ? (sk.cd / sk.cdMax * 100) : 0) + '%';
    }
    var pn = els.hud.querySelector('.pn');
    if (pn) { pn.textContent = st.potions; }
    /* 줄·문 안내 — 원작에서 사다리와 포탈 앞에 서면 무엇을 누를지 알려 주는 자리다 */
    var hint = els.hud.querySelector('.hud-hint');
    if (hint) {
      var msg = '';
      /* 폰에는 ↑ 도 Space 도 없다 — 손가락뿐인 기기에는 누를 자리를 알려 준다.
         키보드가 있으면 예전 문구 그대로다(진단 출력도 그래서 안 바뀐다) */
      var UP = core.upHint(), ACT = core.actHint();
      if (st.climbing) { msg = UP + ' ' + core.downHint() + ' 오르내리기 · ' + ACT + ' 손 떼기'; }
      else if (st.gate) {
        msg = st.gate.open ? (UP + ' → ' + st.gate.name) : ('🔒 ' + st.gate.name + ' — Lv.' + st.gate.need + ' 부터');
      } else if (st.rope) { msg = UP + ' 줄을 탄다'; }
      hint.textContent = msg;
      hint.classList.toggle('show', !!msg);
    }
    els.hud.classList.add('show');
    if (els.touchpad) { els.touchpad.classList.add('show'); }
  }

  /* ── 사냥터 시트 ──────────────────────────────────────── */

  /** 보스가 다시 나오기까지 */
  function bossLeftLabel(ms) {
    var m = Math.ceil(ms / 60000);
    return m >= 60 ? (Math.floor(m / 60) + '시간 ' + (m % 60) + '분') : (m + '분');
  }

  function viewField() {
    var S = global.DG.side;
    var st = S.status();
    var pw = S.power();
    var html = '<div class="sec"><h4>내 몸</h4><div class="card">' +
      '<div class="stat-row"><span>체력</span><b>' + core.fmt(pw.hp) + '</b></div>' +
      '<div class="stat-row"><span>공격력</span><b>' + core.fmt(pw.atk) + '</b></div>' +
      '<div class="stat-row"><span>탕약</span><b>🧪 ' + st.potions + '</b></div>' +
      '<small class="muted">앞에 세운 인물의 능력치가 그대로 몸이 됩니다. ' +
      '도감에서 다른 인물을 앞에 세우거나 승급하면 세집니다.</small></div></div>';

    html += '<div class="sec"><h4>사냥터</h4>';
    var list = st.stages;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      var bossLine = '';
      if (e.ref.boss) {
        var ready = S.bossReady(e.ref.key);
        var left = S.bossLeft(e.ref.key);
        bossLine = '<div class="stat-row"><span class="muted">👺 ' + esc(e.ref.boss.name) + '</span>' +
          '<span style="color:' + (ready ? '#e8c15a' : 'inherit') + '">' +
          (ready ? '지키고 있음' : bossLeftLabel(left) + ' 뒤 다시 나옴') + '</span></div>';
      }
      html += '<div class="card">' +
        '<div class="stat-row"><span><b>' + esc(e.ref.name) + '</b></span>' +
          '<span class="muted">적 Lv.' + e.ref.enemyLv + ' · ' + e.ref.spawn + '마리</span></div>' +
        bossLine +
        (e.open
          ? '<button class="btn primary wide" data-act="s-enter" data-stage="' + e.ref.key + '">들어간다</button>'
          : '<button class="btn ghost wide" disabled>🔒 Lv.' + e.ref.need + ' 부터</button>') +
        '</div>';
    }
    html += '</div>';

    html += sectionAuto();
    html += viewQuestSection();

    html += '<div class="sec"><h4>규칙</h4><div class="rulelist">' +
      (core.touchOnly()
        ? ('<div><b>이동</b> 화면 좌우 아래의 <b>◀ ▶</b> 단추를 누르고 있으면 걷습니다</div>' +
           '<div><b>▲</b> 점프 — 밧줄·사다리·문 앞에서는 <b>오르기·들어가기</b>가 됩니다</div>' +
           '<div><b>▼</b> 줄에서 내려가고, 가만히 있으면 앉아 쉬고, 발판을 빠져나갑니다</div>')
        : ('<div><b>이동</b> ← → · 점프 Space — 발판은 위에서만 밟힙니다</div>' +
           '<div><b>오르기</b> ↑ 밧줄·사다리 · ↓ 내려가기 · ↓+Space 발판 빠져나가기</div>' +
           '<div><b>문</b> 사냥터 끝의 빛 앞에서 ↑ — 옆 사냥터로 걸어 넘어갑니다 ' +
             '(체력·기력·주운 금은 그대로 이어집니다)</div>')) +
      '<div><b>공격</b> 조작 띠의 단추 ' +
        (core.touchOnly() ? '을 누릅니다' : '· 키 1~8') + '. 기력을 씁니다</div>' +
      '<div><b>탕약</b> ' + (core.touchOnly() ? '🧪 단추' : 'Q') +
        ' — 체력 45% 회복. 잡을 때 가끔 떨어집니다</div>' +
      '<div><b>궁수</b> 활·조총을 든 적은 멀리서 쏘고, 사거리 안에서는 다가오지 ' +
        '않습니다 (❗ 가 뜨면 화살이 옵니다)</div>' +
      '<div><b>쓰러짐</b> 주운 금의 절반만 남습니다 (사냥터는 그대로)</div>' +
      '<div><b>성장</b> 잡으면 경험치. 레벨이 오르면 사냥터가 열립니다</div>' +
      '<div><b>보스</b> 사냥터 <b>오른쪽 끝</b>을 지킵니다. 뜸을 들이다 달려듭니다 — ' +
        '잡으면 경험치·금이 크게 들어오고 탕약 3개를 떨굽니다 (한동안 다시 안 나옵니다)</div>' +
      '</div></div>';
    html = html.replace('<h4>내 몸</h4>', '<h4>내 몸 <small class="muted">— 토벌 ' +
      st.bosses + '회</small></h4>');
    return html;
  }

  /** 📋 사명 — 사냥터 시트 안에 산다 (원작에서도 퀘스트는 따로 도는 축이 아니다) */
  function viewQuestSection() {
    var Q = global.DG.quest;
    if (!Q) { return ''; }
    var list = Q.list();
    var html = '<div class="sec"><h4>📋 사명</h4>';
    if (!list.length) {
      html += '<div class="hint">지금 받을 사명이 없습니다. 레벨이 오르면 새로 뜹니다.</div></div>';
      return html;
    }
    for (var i = 0; i < list.length; i++) {
      var q = list[i], d = q.ref;
      var bits = [];
      if (d.reward.exp) { bits.push('경험치 ' + core.fmt(d.reward.exp)); }
      if (d.reward.gold) { bits.push('🪙 ' + core.fmt(d.reward.gold)); }
      if (d.reward.potion) { bits.push('🧪 ' + d.reward.potion); }
      if (d.reward.scroll) { bits.push('📜 ' + global.DG.gearData.scroll(d.reward.scroll).name); }
      html += '<div class="card' + (q.full ? ' on' : '') + '">' +
        '<div class="stat-row"><span><b>' + esc(d.name) + '</b>' +
          (d.repeat ? ' <small class="muted">— 되받는 사명' +
            (q.done ? ' · ' + q.done + '회' : '') + '</small>' : '') + '</span>' +
          '<span class="muted">' + (q.taken ? q.n + ' / ' + q.goal : 'Lv.' + d.need) + '</span></div>' +
        '<div class="stat-row"><span class="muted">' + esc(d.desc) + '</span>' +
          '<span class="muted">' + esc(bits.join(' · ')) + '</span></div>' +
        (q.taken
          ? (q.full
            ? '<button class="btn primary wide" data-act="q-turn" data-q="' + d.key + '">바친다</button>'
            : '<button class="btn ghost wide" disabled>아직 ' + (q.goal - q.n) + ' 남았다</button>')
          : '<button class="btn wide" data-act="q-take" data-q="' + d.key + '">받는다</button>') +
        '</div>';
    }
    html += '<small class="muted">받은 뒤부터 셉니다. 장비·무예·금처럼 <b>보면 알 수 있는 것</b>은 ' +
      '지금 값을 그대로 봅니다.</small></div>';
    return html;
  }

  /* ── 가방 · 저자 ──────────────────────────────────────── */

  function optLine(s) {
    var bits = [];
    if (s.atk) { bits.push('공격 +' + s.atk); }
    if (s.def) { bits.push('방어 +' + s.def); }
    if (s.hp) { bits.push('체력 +' + s.hp); }
    return bits.join(' · ') || '—';
  }

  /** 그 물건에 쓸 수 있는, 지금 가진 주문서 버튼들 */
  function scrollButtons(G, it) {
    var d = G.defOf(it);
    var kind = d.slot === 'weapon' ? 'weapon' : 'armor';
    var list = global.DG.gearData.SCROLLS, html = '';
    for (var i = 0; i < list.length; i++) {
      var sc = list[i];
      if (sc['for'] !== kind) { continue; }
      var n = G.scrollCount(sc.key);
      if (n <= 0) { continue; }
      html += '<button class="btn tiny" data-act="g-scroll" data-uid="' + it.uid +
        '" data-scroll="' + sc.key + '" title="' + esc(sc.name + ' — ' + sc.desc) + '">📜 ' +
        Math.round(sc.rate * 100) + '% ×' + n + '</button> ';
    }
    return html;
  }

  function viewBag() {
    var G = global.DG.gear, GD = global.DG.gearData;
    var S = global.DG.side;
    var eq = G.equipped(), bo = G.bonus(), pw = S.power();
    var i, html = '';

    html += '<div class="sec"><h4>낀 것</h4><div class="card">';
    for (i = 0; i < GD.SLOTS.length; i++) {
      var sl = GD.SLOTS[i], it = eq[sl.key];
      html += '<div class="stat-row"><span>' + sl.emoji + ' ' + esc(sl.name) + '</span>';
      if (it) {
        html += '<span><b>' + esc(G.nameOf(it)) + '</b> <small class="muted">' +
          esc(optLine(G.statsOf(it))) + '</small> ' +
          '<button class="btn tiny ghost" data-act="g-unequip" data-slot="' + sl.key +
          '">벗기</button></span>';
      } else {
        html += '<span class="muted">비어 있음</span>';
      }
      html += '</div>';
    }
    html += '<div class="stat-row" style="border-top:1px solid rgba(255,255,255,.12);padding-top:6px">' +
      '<span>합</span><b>공격 +' + bo.atk + ' · 방어 +' + bo.def + ' · 체력 +' + bo.hp + '</b></div>' +
      '<div class="stat-row"><span>지금 몸</span><b>체력 ' + core.fmt(pw.hp) +
        ' · 공격 ' + core.fmt(pw.atk) + '</b></div>' +
      '<small class="muted">방어는 맞는 값을 깎습니다 — 아무리 높아도 <b>6할까지</b>. ' +
      '지금 ' + Math.round(G.cut(bo.def) * 100) + '% 덜 맞습니다.</small>' +
      '</div></div>';

    var inv = G.inv();
    html += '<div class="sec"><h4>가방 <small class="muted">' + inv.length + ' / ' + G.BAG +
      '</small></h4>';
    if (!inv.length) {
      html += '<div class="hint">아직 아무것도 없습니다. 적이 가끔 떨구고, 🏪 저자에서도 삽니다.</div>';
    }
    for (i = 0; i < inv.length; i++) {
      var g = inv[i], d = G.defOf(g), on = G.isEquipped(g.uid);
      var canWear = core.save.player.level >= d.need;
      html += '<div class="card' + (on ? ' on' : '') + '">' +
        '<div class="stat-row"><span><b>' + esc(G.nameOf(g)) + '</b>' +
          (on ? ' <small class="muted">— 끼고 있음</small>' : '') + '</span>' +
          '<span class="muted">' + esc(GD.slot(d.slot).name) + ' · Lv.' + d.need + '</span></div>' +
        '<div class="stat-row"><span class="muted">' + esc(optLine(G.statsOf(g))) + '</span>' +
          '<span class="muted">업횟 ' + g.left + '</span></div>' +
        '<div class="btn-row">' +
          (on ? '' : (canWear
            ? '<button class="btn tiny primary" data-act="g-equip" data-uid="' + g.uid + '">낀다</button> '
            : '<button class="btn tiny ghost" disabled>🔒 Lv.' + d.need + '</button> ')) +
          (g.left > 0 ? scrollButtons(G, g) : '<small class="muted">업횟 없음 </small>') +
          (on ? '' : '<button class="btn tiny ghost" data-act="g-sell" data-uid="' + g.uid +
            '">팔기 🪙' + core.fmt(Math.round(d.price * G.SELL_RATE)) + '</button>') +
        '</div></div>';
    }
    html += '</div>';

    /* 가진 주문서 */
    var sc = GD.SCROLLS.filter(function (s) { return G.scrollCount(s.key) > 0; });
    html += '<div class="sec"><h4>주문서</h4>';
    if (!sc.length) {
      html += '<div class="hint">주문서는 적이 떨구거나 🏪 저자에서 삽니다. ' +
        '<b>실패해도 물건은 남습니다</b> — 닳는 것은 업횟뿐입니다.</div>';
    } else {
      html += '<div class="card">';
      for (i = 0; i < sc.length; i++) {
        html += '<div class="stat-row"><span>📜 ' + esc(sc[i].name) + '</span>' +
          '<b>×' + G.scrollCount(sc[i].key) + '</b></div>';
      }
      html += '<small class="muted">물건 아래의 📜 단추로 씁니다. 실패해도 물건은 남고 ' +
        '업횟만 닳습니다.</small></div>';
    }
    html += '</div>';
    return html;
  }

  /** 🥋 무예 — 전직과 스킬 트리. 원작의 스킬창 자리다 */
  function viewJob() {
    var J = global.DG.job, JD = global.DG.jobData;
    var me = J.cur(), left = J.spLeft();
    var i, html = '';

    html += '<div class="sec"><h4>지금 자리</h4><div class="card">' +
      '<div class="stat-row"><span>' + me.emoji + ' <b>' + esc(me.name) + '</b></span>' +
        '<span class="muted">Lv.' + core.save.player.level + '</span></div>' +
      '<div class="stat-row"><span class="muted">' + esc(me.desc) + '</span>' +
        '<b>무예 점수 ' + left + '</b></div>' +
      '<small class="muted">점수는 레벨마다 ' + JD.SP_PER_LEVEL + '점씩 늘어납니다 ' +
        '(쓴 것 ' + J.spSpent() + ' / 모두 ' + J.spTotal() + '). ' +
        '<b>찍은 무예만 조작 띠에 놓입니다.</b></small></div></div>';

    /* 전직 */
    var nexts = JD.nextJobs(me.key);
    if (nexts.length) {
      html += '<div class="sec"><h4>전직 <small class="muted">— 되돌릴 수 없습니다</small></h4>';
      for (i = 0; i < nexts.length; i++) {
        var nj = nexts[i], why = J.canJoin(nj.key);
        html += '<div class="card"><div class="stat-row">' +
          '<span>' + nj.emoji + ' <b>' + esc(nj.name) + '</b></span>' +
          '<span class="muted">Lv.' + nj.need + ' 부터</span></div>' +
          '<div class="stat-row"><span class="muted">' + esc(nj.desc) + '</span>' +
            '<span class="muted">체력 +' + (nj.grow ? nj.grow.hp : 0) +
            ' · 공격 +' + (nj.grow ? nj.grow.atk : 0) +
            (nj.grow && nj.grow.mp ? ' · 기력 +' + nj.grow.mp : '') + '</span></div>' +
          (why
            ? '<button class="btn ghost wide" disabled>🔒 ' + esc(why) + '</button>'
            : '<button class="btn primary wide" data-act="j-join" data-job="' + nj.key +
              '">이 길로 간다</button>') +
          '</div>';
      }
      html += '</div>';
    }

    /* 무예 목록 */
    var mine = JD.skillsOf(me.key).filter(function (s) { return s.max > 0; });
    html += '<div class="sec"><h4>무예</h4>';
    if (!mine.length) {
      html += '<div class="hint">아직 익힐 무예가 없습니다. <b>Lv.10</b> 에 전직하면 열립니다 — ' +
        '그때까지는 연참·횡소·기탄·기합 넷을 씁니다.</div>';
    }
    for (i = 0; i < mine.length; i++) {
      var sk = mine[i], lv = J.levelOf(sk.key), why2 = J.canRaise(sk.key);
      var mul = J.mulOf(sk);
      html += '<div class="card' + (lv > 0 ? ' on' : '') + '">' +
        '<div class="stat-row"><span>' + sk.emoji + ' <b>' + esc(sk.name) + '</b></span>' +
          '<b>' + lv + ' / ' + sk.max + '</b></div>' +
        '<div class="stat-row"><span class="muted">' + esc(sk.desc) + '</span>' +
          '<span class="muted">기력 ' + sk.cost + ' · 쿨 ' + sk.cd + 's</span></div>' +
        (lv > 0 && sk.mul[0]
          ? '<div class="stat-row"><span class="muted">지금 힘</span><b>공격력 ×' +
            mul.toFixed(2) + '</b></div>'
          : '') +
        '<div class="btn-row">' +
          (why2
            ? '<button class="btn tiny ghost" disabled>' + esc(why2) + '</button>'
            : '<button class="btn tiny primary" data-act="j-raise" data-skill="' + sk.key +
              '">＋ 한 점 붓는다</button>') +
        '</div></div>';
    }
    html += '</div>';

    /* 지금 조작 띠 */
    var bar = J.bar();
    html += '<div class="sec"><h4>조작 띠</h4><div class="card">';
    for (i = 0; i < bar.length; i++) {
      html += '<div class="stat-row"><span>' + (i + 1) + ' · ' + bar[i].emoji + ' ' +
        esc(bar[i].name) + '</span><span class="muted">' +
        (bar[i].max ? '레벨 ' + J.levelOf(bar[i].key) : '고정') + '</span></div>';
    }
    html += '<small class="muted">키 1~8 · 화면 아래 단추. 자리가 여덟을 넘으면 ' +
      '<b>윗자리 무예부터</b> 놓입니다 — 3차까지 열리면 한 갈래가 열둘입니다.</small></div></div>';
    return html;
  }

  function viewShop() {
    var G = global.DG.gear, GD = global.DG.gearData;
    var list = G.shopList();
    var gold = core.save.player.gold;
    var i, html = '<div class="sec"><h4>가진 것</h4><div class="card">' +
      '<div class="stat-row"><span>금</span><b>🪙 ' + core.fmt(gold) + '</b></div>' +
      '<div class="stat-row"><span>탕약</span><b>🧪 ' +
        global.DG.side.status().potions + '</b></div>' +
      '<div class="stat-row"><span>가방</span><b>' + (G.BAG - G.bagLeft()) + ' / ' + G.BAG +
        '</b></div></div></div>';

    html += '<div class="sec"><h4>탕약</h4><div class="card">' +
      '<div class="stat-row"><span>🧪 탕약</span><span class="muted">🪙 ' +
        list.potion.price + ' / 개</span></div>' +
      '<div class="btn-row">' +
        '<button class="btn tiny primary" data-act="sh-potion" data-n="1">1개</button> ' +
        '<button class="btn tiny" data-act="sh-potion" data-n="10">10개 🪙' +
          core.fmt(list.potion.price * 10) + '</button>' +
      '</div></div></div>';

    html += '<div class="sec"><h4>물건 <small class="muted">— 수준이 오르면 목록이 늡니다</small></h4>';
    for (i = 0; i < list.gears.length; i++) {
      var g = list.gears[i];
      html += '<div class="card"><div class="stat-row">' +
        '<span><b>' + esc(g.name) + '</b> <small class="muted">' +
          esc(GD.slot(g.slot).name) + ' · Lv.' + g.need + '</small></span>' +
        '<span class="muted">' + esc(optLine(g)) + '</span></div>' +
        '<button class="btn tiny ' + (gold >= g.price ? 'primary' : 'ghost') + '"' +
          ' data-act="sh-gear" data-key="' + g.key + '">🪙 ' + core.fmt(g.price) + ' 에 산다</button>' +
        '</div>';
    }
    html += '</div>';

    html += '<div class="sec"><h4>주문서</h4>';
    for (i = 0; i < list.scrolls.length; i++) {
      var s = list.scrolls[i];
      html += '<div class="card"><div class="stat-row">' +
        '<span><b>📜 ' + esc(s.name) + '</b></span>' +
        '<span class="muted">' + esc(optLine(s)) + ' · 가진 것 ' +
          G.scrollCount(s.key) + '</span></div>' +
        '<div class="stat-row"><span class="muted">' + esc(s.desc) + '</span>' +
          '<button class="btn tiny ' + (gold >= s.price ? 'primary' : 'ghost') + '"' +
          ' data-act="sh-scroll" data-key="' + s.key + '">🪙 ' + core.fmt(s.price) + '</button>' +
        '</div></div>';
    }
    html += '</div>';
    html += '<small class="muted">파는 값은 산 값의 3할입니다. 끼고 있는 것은 못 팝니다.</small>';
    return html;
  }

  /* ── 도감 ─────────────────────────────────────────────── */


  function viewDex() {
    var hC = Object.keys(core.save.dex.heroes).length;
    var pC = Object.keys(core.save.dex.pets).length;
    return '<div class="sec"><h4>인물</h4>' + dexBar(hC, data.heroes.length) +
             dexGrid(data.heroes, core.save.dex.heroes) + '</div>' +
           '<div class="sec"><h4>펫</h4>' + dexBar(pC, data.pets.length) +
             dexGrid(data.pets, core.save.dex.pets) + '</div>' +
           '<div class="hint">카드를 누르면 열전·승급·펫 장착 화면이 열립니다. ' +
           '같은 인물을 또 등용하면 <b>중복(+n)</b>이 쌓여 승급 재료가 됩니다.</div>';
  }

  function dexBar(n, total) {
    return '<div class="dexbar"><div class="bar"><i style="width:' + (n / total * 100) + '%"></i></div>' +
      '<small>' + n + ' / ' + total + '</small></div>';
  }

  function dexGrid(list, owned) {
    var out = '<div class="dexgrid">';
    var sorted = list.slice().sort(function (a, b) {
      return b.rarity - a.rarity || a.name.localeCompare(b.name, 'ko');
    });
    for (var i = 0; i < sorted.length; i++) {
      var e = sorted[i], have = !!owned[e.id], rar = data.rarity[e.rarity];
      var kind = e.stats ? 'hero' : 'pet';
      var dup = have ? owned[e.id].count - 1 : 0;
      out += '<button class="dcell' + (have ? '' : ' locked') + '" style="border-color:' +
        (have ? rar.color : 'transparent') + '" title="' +
        esc(e.name + (have ? (dup ? ' · 중복 ' + dup : '') : ' (미획득)')) + '"' +
        ' data-act="detail" data-kind="' + kind + '" data-id="' + e.id + '">' +
        (have ? '<span class="de">' + pt(kind, e, 52) + '</span>'
              : '<span class="de locked-mark">❔</span>') +
        '<small>' + (have ? esc(e.name) : '???') + '</small>' +
        (dup > 0 ? '<i class="cnt">+' + dup + '</i>' : '') + '</button>';
    }
    return out + '</div>';
  }

  /* ── 기록 ─────────────────────────────────────────────── */

  function viewLog() {
    var log = core.save.log;
    if (!log.length) { return '<div class="hint">아직 기록이 없습니다.</div>'; }
    var out = '<div class="loglist">';
    for (var i = 0; i < log.length; i++) {
      var t = new Date(log[i].t);
      var hh = ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2);
      out += '<div class="lrow ' + log[i].kind + '"><span>' + hh + '</span>' + esc(log[i].text) + '</div>';
    }
    return out + '</div>';
  }

  /* ── 사관 (온라인 모드) ───────────────────────────────── */


  /* ── 자동 순행 ────────────────────────────────────────────
   * 사관 시트에 뒀지만 **오프라인에서도 그대로 돈다** — 판단은 규칙이고,
   * AI(사관)를 쓰는 건 '길조 유지' 하나뿐이다. 그 점을 화면에 적어 둔다.
   */
  function sectionAuto() {
    var A = global.DG.auto;
    var stt = A.status();
    var html = '<div class="sec"><h4>자동 순행</h4><div class="card">' +
      '<button class="btn wide ' + (stt.on ? 'primary' : '') + '" data-act="auto-on">' +
        (stt.on ? '⏸️ 자동 순행 멈춤' : '🤖 자동 순행 시작') + '</button>';
    if (stt.on) {
      html += '<div class="stat-row"><span>지금</span><b>' + esc(stt.doing || '…') + '</b></div>';
    }
    html += '<div class="autoflags">';
    for (var i = 0; i < A.FLAGS.length; i++) {
      var f = A.FLAGS[i];
      var onf = A.on(f.key);
      html += '<button class="btn tiny ' + (onf ? 'primary' : 'ghost') + '" ' +
        'data-act="auto-flag" data-flag="' + f.key + '" title="' + esc(f.desc) + '">' +
        f.emoji + ' ' + f.name + '</button>';
    }
    html += '</div>' +
      '<small class="muted">사냥 규칙은 <b>손으로 할 때와 같습니다</b> — ' +
      '자동은 어느 적을 칠지·언제 탕약을 마실지만 고릅니다.<br>' +
      '<b>새 문답은 대신 풀지 않습니다</b> (익힌 문제 복습만).<br>' +
      '창을 보고 있는 동안에만 돕니다 — 덮어 두면 멈춥니다.</small>' +
      '</div></div>';
    return html;
  }


  /* ── 인물 · 펫 상세 ───────────────────────────────────────
   * 도감 카드에서 열린다. 능력치는 hero.breakdown() 이 계산해 준 값만 보여준다.
   */

  function detailHost() {
    var el = $('detail');
    if (!el) {                       // 자가진단 페이지처럼 뼈대가 없는 곳에서도 동작하게
      el = document.createElement('div');
      el.id = 'detail';
      document.body.appendChild(el);
      els.detail = el;
    }
    return el;
  }

  function openDetail(kind, id) {
    if (!id) { return; }
    openDetailRef = { kind: kind, id: id };
    renderDetail();
    detailHost().classList.add('show');
  }

  function closeDetail() {
    openDetailRef = null;
    var el = detailHost();
    el.classList.remove('show');
    el.innerHTML = '';
  }

  function rankStars(rank) {
    if (!rank) { return ''; }
    var out = ' ';
    for (var i = 0; i < rank; i++) { out += '✦'; }
    return out;
  }

  function statRow(label, base, grown, fin, cap) {
    var pct = core.clamp(fin / cap, 0, 1) * 100;
    var extra = fin - base;
    return '<div class="st">' +
      '<span class="st-l">' + label + '</span>' +
      '<span class="stbar"><i style="width:' + pct + '%"></i>' +
        (grown > base ? '<u style="width:' + (core.clamp(base / cap, 0, 1) * 100) + '%"></u>' : '') +
      '</span>' +
      '<b class="st-v">' + fin + (extra > 0 ? '<em>+' + extra + '</em>' : '') + '</b>' +
    '</div>';
  }

  function renderDetail() {
    if (!openDetailRef) { return; }
    var host = detailHost();
    var ref = data.find(openDetailRef.id);
    if (!ref) { closeDetail(); return; }
    host.innerHTML = openDetailRef.kind === 'pet' ? detailPet(ref) : detailHero(ref);
  }

  function detailHero(h) {
    var owned = !!core.save.dex.heroes[h.id];
    var rar = data.rarity[h.rarity];
    var fac = data.faction(h.faction);
    var g = hero().info(h.id);
    var bk = hero().breakdown(h.id);
    var need = hero().expNeed(g.lv);
    var maxLv = g.lv >= hero().MAX_LV;
    var inParty = core.save.party.indexOf(h.id) >= 0;
    var chk = hero().rankUpCheck(h.id);
    var cost = chk.cost || hero().rankUpCost(g.rank);

    var out = '<div class="dt-card">' +
      '<button class="icon-btn sm dt-x" data-act="dt-close">✕</button>' +
      '<div class="dt-top">' +
        '<img class="dt-portrait" alt="" src="' +
          global.DG.sprite.portraitCard('hero', h, 150, 172) + '">' +
        '<div class="dt-head">' +
          '<div class="dt-name"><b>' + esc(h.name) + '</b>' +
            (h.hanja ? '<span class="hanja">' + esc(h.hanja) + '</span>' : '') + '</div>' +
          '<div class="dt-tags">' +
            '<span class="tag fac" style="background:' + fac.color + '">' + fac.mark + ' ' + esc(h.faction) + '</span>' +
            '<span class="tag">' + esc(h.era) + '</span>' +
            '<span class="tag" style="color:' + rar.color + '">' + rar.label + '</span>' +
            '<span class="tag">' + data.traitMark[h.trait] + '</span>' +
          '</div>';

    if (owned) {
      out += '<div class="dt-lv">Lv.<b>' + g.lv + '</b>' +
        (maxLv ? ' <span class="tag">최대</span>' : '') +
        (g.rank ? ' <span class="rankmark">승급 ' + rankStars(g.rank).trim() + '</span>' : '') +
        '</div>' +
        '<div class="bar sm"><i style="width:' + (maxLv ? 100 : g.exp / need * 100) + '%"></i></div>' +
        '<small class="muted">' + (maxLv ? '더 오를 곳이 없습니다' : '경험치 ' + g.exp + ' / ' + need) +
          ' · 성장 배율 ×' + bk.mul.toFixed(2) + '</small>' +
        '<div class="dt-where">' + (inParty ? '🧭 동행 중' : '🏠 집에서 대기 중') + '</div>';
    } else {
      out += '<div class="dt-lv muted">아직 등용하지 않은 인물입니다</div>';
    }
    out += '</div></div>';

    if (owned) {
      var cap = 200;      // 능력치 바의 만점 기준 (Lv.30 ★5 까지 자랄 자리를 남긴다)
      out += '<div class="dt-stats">' +
        statRow('무력', bk.base.might, bk.grown.might, bk.final.might, cap) +
        statRow('지력', bk.base.wisdom, bk.grown.wisdom, bk.final.wisdom, cap) +
        statRow('통솔', bk.base.command, bk.grown.command, bk.final.command, cap) +
        '</div>' +
        '<div class="dt-line"><span>인물 됨됨이</span><b>' + core.fmt(hero().power(h.id)) + '</b></div>';

      out += '<div class="dt-pet"><span>🐾 펫</span>' +
        '<select data-equip="' + h.id + '">' + petOptions(h.id) + '</select>' +
        (bk.pet ? '<small class="muted">' + esc(bk.pet.name) + ' · ' +
          statKor(bk.pet.bonus.stat) + ' +' + bk.pet.bonus.value + '</small>'
                : '<small class="muted">장착하면 능력치가 더해집니다</small>') +
        '</div>';
    }

    var bio = data.bio(h.id);
    if (owned) {
      if (bio) { out += '<p class="dt-bio">' + esc(bio) + '</p>'; }
      out += '<p class="quote">"' + esc(h.quote) + '"</p>';
    } else {
      out += '<p class="dt-bio muted">등용하면 열전이 열립니다.</p>';
    }

    if (owned) {
      out += '<div class="dt-acts">';
      if (g.rank >= hero().MAX_RANK) {
        out += '<button class="btn ghost wide" disabled>✨ 최대 승급 (★' + g.rank + ')</button>';
      } else {
        out += '<button class="btn ' + (chk.ok ? 'primary' : 'ghost') + ' wide"' +
          (chk.ok ? '' : ' disabled') + ' data-act="rankup" data-id="' + h.id + '">' +
          '✨ 승급 ★' + (g.rank + 1) + ' · 중복 ' + hero().dupOf(h.id) + '/' + cost.dup +
          ' · 🪙 ' + core.fmt(cost.gold) + '</button>';
      }
      if (net().online()) {
        out += '<button class="btn wide" data-act="dt-talk" data-id="' + h.id + '">💬 말을 건다 (사관)</button>';
      }
      out += (inParty
        ? '<button class="btn ghost wide" data-act="drop" data-id="' + h.id + '">동행에서 뺀다</button>'
        : '<button class="btn wide"' + (core.save.party.length >= 5 ? ' disabled' : '') +
          ' data-act="join" data-id="' + h.id + '">동행에 넣는다' +
          (core.save.party.length >= 5 ? ' (가득 찼음)' : '') + '</button>');
      out += '</div>' +
        '<small class="muted dt-tip">맨 앞에 세운 인물이 <b>내 몸</b>이 됩니다 — 그 능력치로 싸웁니다. ' +
        '승급은 중복분과 금을 씁니다.</small>';
    }

    return out + '</div>';
  }

  function petOptions(heroId) {
    var owned = Object.keys(core.save.dex.pets);
    var equipped = core.save.petEquip[heroId] || '';
    var used = {}, k;
    for (k in core.save.petEquip) {
      if (Object.prototype.hasOwnProperty.call(core.save.petEquip, k) && k !== heroId) {
        used[core.save.petEquip[k]] = true;
      }
    }
    var out = '<option value="">— 펫 없음 —</option>';
    for (var i = 0; i < owned.length; i++) {
      var p = data.find(owned[i]);
      if (!p || used[p.id]) { continue; }
      out += '<option value="' + p.id + '"' + (equipped === p.id ? ' selected' : '') + '>' +
        p.emoji + ' ' + p.name + ' (' + statKor(p.bonus.stat) + ' +' + p.bonus.value + ')</option>';
    }
    return out;
  }

  function statKor(s) { return ({ might: '무력', wisdom: '지력', command: '통솔', virtue: '덕망' })[s] || s; }

  function detailPet(p) {
    var d = core.save.dex.pets[p.id];
    var owned = !!d;
    var rar = data.rarity[p.rarity];
    var wearer = null, k;
    for (k in core.save.petEquip) {
      if (Object.prototype.hasOwnProperty.call(core.save.petEquip, k) &&
          core.save.petEquip[k] === p.id) { wearer = data.find(k); }
    }
    return '<div class="dt-card">' +
      '<button class="icon-btn sm dt-x" data-act="dt-close">✕</button>' +
      '<div class="dt-top">' +
        '<img class="dt-portrait" alt="" src="' +
          global.DG.sprite.portraitCard('pet', p, 150, 172) + '">' +
        '<div class="dt-head">' +
          '<div class="dt-name"><b>' + esc(p.name) + '</b></div>' +
          '<div class="dt-tags">' +
            '<span class="tag fac" style="background:' + (p.kind === 'divine' ? '#8a5cc0' : '#5f7a4a') + '">' +
              (p.kind === 'divine' ? '神 신수' : '獸 동물') + '</span>' +
            '<span class="tag" style="color:' + rar.color + '">' + rar.label + '</span>' +
          '</div>' +
          '<div class="dt-lv">' + (owned
            ? '보유 ' + d.count + '마리' + (wearer ? ' · ' + esc(wearer.name) + ' 장착 중' : ' · 장착 안 됨')
            : '<span class="muted">아직 포획하지 않았습니다</span>') + '</div>' +
          '<small class="muted">기본 포획률 ' + Math.round(p.catchBase * 100) + '%</small>' +
        '</div>' +
      '</div>' +
      '<div class="dt-line"><span>장착 보정</span><b>' + statKor(p.bonus.stat) + ' +' + p.bonus.value + '</b></div>' +
      '<p class="dt-bio">' + esc(p.desc || '') + '</p>' +
      '<small class="muted dt-tip">펫은 인물에게 하나씩 장착합니다. 인물 상세 화면에서 고르세요.</small>' +
      '</div>';
  }

  /* ── 토스트 ───────────────────────────────────────────── */

  var toastTimer = null;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    if (toastTimer) { clearTimeout(toastTimer); }
    toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, 2600);
  }

  /** 매 프레임이 아니라 주기적으로만 갱신한다 */
  function tickRefresh() {
    renderTop();
    renderCamp();
    renderHudBar();
    renderAutoBar();
    var a = document.activeElement;
    if (a && (a.tagName === 'SELECT' || a.tagName === 'INPUT') && els['sheet-body'].contains(a)) { return; }
    if (openTab === 'field') { renderSheet(); }
  }

  /* ── 자동 순행 상태줄 ─────────────────────────────────── */

  var autoKey = null;
  function renderAutoBar() {
    var bar = els.autobar;
    if (!bar) { return; }
    var A = global.DG.auto;
    if (!A || !A.active()) {
      if (autoKey !== null) { bar.classList.remove('show'); bar.innerHTML = ''; autoKey = null; }
      return;
    }
    var stt = A.status();
    var key = stt.doing;
    if (key !== autoKey) {
      autoKey = key;
      bar.innerHTML = '<div class="auto-card"><b>🤖 자동 순행</b>' +
        '<span>' + esc(stt.doing || '…') + '</span>' +
        '<button class="btn tiny ghost" data-act="auto-stop">멈춤</button></div>';
    }
    bar.classList.add('show');
  }

  global.DG = global.DG || {};
  global.DG.ui = {
    init: init, toast: toast, tickRefresh: tickRefresh,
    openSheet: openSheet, closeSheet: closeSheet,
    openDetail: openDetail, closeDetail: closeDetail,
    renderPanel: renderSheet, renderHud: renderTop,
    renderCamp: renderCamp, renderHudBar: renderHudBar
  };
})(window);
