/**
 * UI — 프로필 / 재화 / 근처 대상 / 시트(서당·도감·사관·기록) / 상세 / 토스트
 * ---------------------------------------------------------------
 * 사가고 본편(포켓몬GO 형태) 화면. 던전·전투·장비 UI 는 js/_expansion/ 으로 뺐고,
 * 경영(영지·태수·건설)은 게임에서 아예 제거했다 (v1.0-full 커밋 94850f8 에 이력이 남아 있다).
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
    ['profile', 'wallet', 'near', 'autobar', 'dock', 'sheet',
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
      if (openTab && !global.DG.encounter.active) { closeSheet(); }
    });

    els.near.addEventListener('click', function (e) {
      if (e.target.closest('[data-act="visit"]')) {
        var ns = global.DG.world.nearestStation();
        if (ns && ns.inRange) { core.emit('station:request', ns.station); }
        return;
      }
      if (!e.target.closest('[data-act="meet"]')) { return; }
      var n = global.DG.world.nearest();
      if (n && n.inRange) { core.emit('encounter:request', n.spawn); }
    });

    els['sheet-body'].addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) { return; }
      var act = b.getAttribute('data-act'), id = b.getAttribute('data-id');
      if (act === 'detail') {
        openDetail(b.getAttribute('data-kind') || 'hero', id);
        return;
      }
      if (act === 'auto-on') {
        global.DG.auto.toggle();
      } else if (act === 'auto-flag') {
        global.DG.auto.toggleFlag(b.getAttribute('data-flag'));
      } else if (act === 'quest-claim') {
        var qr = global.DG.quest.claim(parseInt(b.getAttribute('data-i'), 10));
        if (qr && qr.breakthrough) { closeSheet(); }
      } else if (act === 'bag-use') {
        var ur = global.DG.bag.use(id);
        if (!ur.ok) { toast('쓸 수 없습니다'); }
      } else if (act === 'letter-put') {
        global.DG.letter.put(parseInt(b.getAttribute('data-i'), 10), null);
      } else if (act === 'buddy-feed') {
        var fr = global.DG.buddy.feed();
        if (!fr.ok) { toast('🍖 ' + fr.why); }
      } else if (act === 'purify') {
        var pr = global.DG.rogue ? global.DG.rogue.purify(id) : { ok: false, reason: '없음' };
        if (!pr.ok) {
          toast('✨ ' + pr.reason + (pr.cost ? ' — 단사 ' + pr.cost.dust + ' 필요' : ''));
        }
      } else { return; }
      core.persist(); renderSheet();
    });

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
      else if (act === 'buddy-set') { if (buddy()) { buddy().set(id); } }
      else if (act === 'buddy-clear') { if (buddy()) { buddy().clear(); } }
      else if (act === 'buddy-feed') {
        var fr2 = buddy() ? buddy().feed() : { ok: false, why: '반려 없음' };
        if (!fr2.ok) { toast('🍖 ' + fr2.why); }
      }
      else if (act === 'refine') { if (growth()) { growth().refine(id); } }
      else if (act === 'ascend') { if (growth()) { growth().ascend(id); } }
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

    /* 균형 손잡이가 잡혀 있으면 **화면에 드러낸다** — 잡아 둔 줄 모르고
       "균형이 이상하다" 고 볼까 봐. 다른 창(어드민)에서 바뀌면 그때도 알린다. */
    core.on('tune', function () {
      toast('🎛️ 균형 손잡이가 바뀌었습니다 — 새로고침하면 규칙에 반영됩니다');
      renderTop();
    });
    core.on('toast', toast);
    core.on('changed', function () { renderTop(); renderSheet(); });
    core.on('dex:new', function (p) {
      var ent = data.find(p.id);
      if (ent) { toast('📖 도감 신규 등록 · ' + ent.name); }
    });

    renderTop(); renderNear();
  }

  /* ── 시트 ─────────────────────────────────────────────── */

  var SHEET_TITLE = {
    quest: '📋 사명', bag: '🎒 행낭', letters: '✉️ 천거장',
    dex: '📖 도감', oracle: '🔮 사관', log: '📜 기록'
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
    var v = openTab === 'quest' ? viewQuest()
          : openTab === 'bag' ? viewBag()
          : openTab === 'letters' ? viewLetters()
          : openTab === 'dex' ? viewDex()
          : openTab === 'oracle' ? viewOracle() : viewLog();
    els['sheet-body'].innerHTML = v;
  }

  /* ── 상단 ─────────────────────────────────────────────── */

  function renderTop() {
    var p = core.save.player;
    var need = core.expNeed(p.level);
    var pct = Math.round(p.exp / need * 100);
    var w = global.DG.world;
    var rkey = w.currentRegionKey();

    var wx = global.DG.weather.current();
    els.profile.innerHTML =
      '<div class="avatar" style="--p:' + pct + '%"><i>🧭</i></div>' +
      '<div class="p-meta">' +
        '<div class="p-title">' + titleOf(p.featTotal) + ' · Lv.' + p.level + '</div>' +
        (core.tuneCount() ? '<div class="p-tune" title="어드민에서 잡아 둔 균형 손잡이가 있습니다">🎛️ 손잡이 ' +
          core.tuneCount() + '개' + (global.DG.world.speedMul > 1 ? ' · 걸음 ×' + global.DG.world.speedMul : '') +
          '</div>' : '') +
        '<div class="p-sub" title="' + esc(wx.text) + '">' + wx.emoji + ' ' + wx.name +
          ' · 📍 ' + esc(w.regionName(rkey)) +
          ' · <b>' + core.fmt(p.distance) + 'm</b> 이동' +
          (net().online() ? ' · <span class="on-dot">🔮</span>' : '') + '</div>' +
      '</div>';

    els.wallet.innerHTML =
      coin('🪙', core.fmt(p.gold), '금') +
      coin('🎖️', core.fmt(p.fame), '명성') +
      coin('🏅', core.fmt(p.feat), '공적', true) +
      coin('📜', core.fmt(core.save.items.scroll), '등용서') +
      coin('🍖', core.fmt(core.save.items.feed), '사료') +
      coin('✨', core.fmt(growth() ? growth().dust() : 0), '단사(丹砂) — 펫 연성에 쓴다');
  }

  function coin(icon, val, label, hi) {
    return '<div class="coin' + (hi ? ' hi' : '') + '" title="' + label + '"><span>' + icon + '</span>' + val + '</div>';
  }

  /* ── 근처 대상 ────────────────────────────────────────── */

  var nearUid = null;

  /** 야생 대상 카드 (등용 · 포획) */
  function nearSpawnCard(n) {
    var s = n.spawn, rar = data.rarity[s.ref.rarity];
    return '<div class="near-card">' +
        '<div class="near-ico" style="border-color:' + rar.color + '">' +
          pt(s.kind === 'hero' ? 'hero' : 'pet', s.ref, 46) + '</div>' +
        '<div class="near-meta"><b>' + esc(s.ref.name) + '</b>' +
          '<small style="color:' + rar.color + '">' + rar.label + ' · ' +
          (s.kind === 'hero' ? '등용 대상' : '포획 대상') + ' · ' + Math.round(n.dist) + 'm</small></div>' +
        (n.inRange
          ? '<button class="btn primary" data-act="meet">만난다</button>'
          : '<button class="btn ghost" disabled>가까이 가기</button>') +
      '</div>';
  }

  /** 역참 카드 — 원작에서 포켓스탑이 늘 근처에 하나쯤 있는 그 자리 */
  function nearStationCard(ns) {
    var st = ns.station, stn = global.DG.station;
    /* 적도가 들어 있으면 보급 카드가 아니라 **경고 카드**다 — 여기서 갈라 두지 않으면
       "보급 있음" 이라 적힌 자리를 눌렀는데 싸움이 열린다(rogue.js) */
    var R = global.DG.rogue;
    var held = R ? R.rankAt(st) : null;
    if (held) {
      return '<div class="near-card">' +
          '<div class="near-ico" style="border-color:#c0463c">🏴</div>' +
          '<div class="near-meta"><b>' + esc(st.name) + '</b>' +
            '<small style="color:#e0837a">적도 ' + held.name + ' 점거 · ' +
            Math.round(ns.dist) + 'm</small></div>' +
          (ns.inRange
            ? '<button class="btn primary" data-act="visit">맞선다</button>'
            : '<button class="btn ghost" disabled>가까이 가기</button>') +
        '</div>';
    }
    var stt = stn.stateOf(st.key);
    var btn = !stt.ready
      ? '<button class="btn ghost" disabled>' + stn.leftLabel(stt.left) + '</button>'
      : (ns.inRange
          ? '<button class="btn primary" data-act="visit">들른다</button>'
          : '<button class="btn ghost" disabled>가까이 가기</button>');
    return '<div class="near-card"' + (stt.ready ? '' : ' style="opacity:.62"') + '>' +
        '<div class="near-ico" style="border-color:' + (stt.ready ? '#e8c15a' : 'rgba(150,155,165,.5)') + '">🏮</div>' +
        '<div class="near-meta"><b>' + esc(st.name) + '</b>' +
          '<small style="color:' + (stt.ready ? '#e8c15a' : 'inherit') + '">역참 · ' +
          (stt.ready ? '보급 있음' : '쉬는 중') + ' · ' + Math.round(ns.dist) + 'm</small></div>' +
        btn +
      '</div>';
  }

  function renderNear() {
    var w = global.DG.world;
    var n = w.nearest();
    var ns = w.nearestStation();
    if (!n && !ns) {
      els.near.classList.remove('show');
      nearUid = null;
      return;
    }
    /* 다시 그리는 값이 실제로 바뀌었을 때만 innerHTML 을 갈아 끼운다
       (매 프레임 갈아 끼우면 버튼을 누르는 순간 노드가 사라진다) */
    var stn = global.DG.station;
    var key = (n ? n.spawn.uid + '|' + n.inRange + '|' + Math.round(n.dist / 5) : '-') + '||' +
      (ns ? ns.station.key + '|' + ns.inRange + '|' + Math.round(ns.dist / 5) + '|' +
        Math.ceil(stn.stateOf(ns.station.key).left / 1000) + '|' +
        (global.DG.rogue && global.DG.rogue.occupied(ns.station) ? 'R' : '-') : '-');
    if (key !== nearUid) {
      nearUid = key;
      els.near.innerHTML = (n ? nearSpawnCard(n) : '') + (ns ? nearStationCard(ns) : '');
    }
    els.near.classList.add('show');
  }

  /* ── 사명 (원작의 필드 리서치) ────────────────────────── */

  function viewQuest() {
    var Q = global.DG.quest;
    var st = Q.state();
    var list = Q.list();
    var html = '<div class="sec"><h4>인장(印章) <small class="muted">' +
      st.stamps + ' / ' + Q.STAMPS_FOR_BREAK + '</small></h4><div class="card">' +
      '<div class="bar blue"><i style="width:' +
        Math.round(st.stamps / Q.STAMPS_FOR_BREAK * 100) + '%"></i></div>' +
      '<small class="muted">사명을 거두면 인장이 <b>하루 한 개</b> 찍힙니다. ' +
      '일곱이 모이면 <b>명사(名士)</b> 가 코앞에 나타납니다.' +
      (st.stampedToday ? ' <b>오늘 몫은 이미 받았습니다.</b>' : '') +
      '</small></div></div>';

    html += '<div class="sec"><h4>받은 사명 <small class="muted">' +
      list.length + ' / ' + Q.MAX + '</small></h4>';
    if (!list.length) {
      html += '<div class="card"><small class="muted">역참(🏮)에 들르면 사명을 받습니다.</small></div>';
    }
    for (var i = 0; i < list.length; i++) {
      var q = list[i];
      html += '<div class="card">' +
        '<div class="stat-row"><span>' + q.def.emoji + ' <b>' + esc(q.def.name) + '</b></span>' +
          '<b>' + core.fmt(Math.min(q.got, q.need)) + ' / ' + core.fmt(q.need) + '</b></div>' +
        '<div class="bar sm"><i style="width:' + q.pct + '%"></i></div>' +
        (q.done
          ? '<button class="btn primary wide" data-act="quest-claim" data-i="' + q.i + '">거둔다</button>'
          : '<small class="muted">' + rewardLine(q.def.reward) + '</small>') +
      '</div>';
    }
    html += '</div>';
    html += '<div class="sec"><h4>지금까지</h4><div class="card">' +
      '<div class="stat-row"><span>거둔 사명</span><b>' + (st.done || 0) + '</b></div>' +
      '<div class="stat-row"><span>명사가 찾아온 횟수</span><b>' + (st.breaks || 0) + '</b></div>' +
      '</div></div>';
    return html;
  }

  /** 보상 한 줄 */
  function rewardLine(r) {
    var B = global.DG.bag, out = [];
    if (r.gold) { out.push('🪙 ' + r.gold); }
    if (r.exp) { out.push('경험치 ' + r.exp); }
    ['scroll', 'feed', 'treat', 'incense', 'prayer'].forEach(function (k) {
      if (r[k]) { out.push(B.def(k).emoji + ' ' + r[k]); }
    });
    return '채우면 ' + out.join(' · ');
  }

  /* ── 행낭 (원작의 가방) ───────────────────────────────── */

  function viewBag() {
    var B = global.DG.bag;
    var list = B.list();
    var html = '<div class="sec"><h4>행낭 <small class="muted">' +
      B.total() + ' / ' + B.CAP + '</small></h4><div class="card">' +
      '<div class="bar blue"><i style="width:' +
        Math.round(B.total() / B.CAP * 100) + '%"></i></div>' +
      '<small class="muted">가득 차면 역참이 더 주지 않습니다 — 쓰거나 비워야 합니다.</small>' +
      '</div></div>';

    var live = B.activeBoosts();
    if (live.length) {
      html += '<div class="sec"><h4>지금 걸린 것</h4>';
      for (var k = 0; k < live.length; k++) {
        html += '<div class="card"><div class="stat-row">' +
          '<span>' + live[k].def.emoji + ' ' + esc(live[k].def.name) + '</span>' +
          '<b>' + B.leftLabel(live[k].leftMs) + ' 남음</b></div></div>';
      }
      html += '</div>';
    }

    html += '<div class="sec"><h4>담긴 것</h4>';
    for (var i = 0; i < list.length; i++) {
      var e = list[i], d = e.def;
      var canUse = d.kind === 'use' && e.n > 0;
      html += '<div class="card">' +
        '<div class="stat-row"><span>' + d.emoji + ' <b>' + esc(d.name) + '</b></span>' +
          '<b>' + core.fmt(e.n) + '</b></div>' +
        '<small class="muted">' + esc(d.desc) + '</small>' +
        (d.kind === 'use'
          ? '<button class="btn tiny wide' + (canUse ? ' primary' : '') + '"' +
              (canUse ? '' : ' disabled') + ' data-act="bag-use" data-id="' + d.key + '">' +
              (e.boost ? '더 쓴다 (' + B.leftLabel(e.boost.leftMs) + ' 남음)' : '쓴다') +
            '</button>'
          : '') +
      '</div>';
    }
    return html + '</div>';
  }

  /* ── 천거장 (원작의 알) ───────────────────────────────── */

  /** 남은 거리를 사람이 읽는 단위로 */
  function distLabel(m) {
    return m >= 1000 ? (m / 1000).toFixed(1) + 'km' : Math.round(m) + 'm';
  }

  function viewLetters() {
    var L = global.DG.letter;
    var st = L.state();
    var out = '<div class="sec"><h4>행낭 <small class="muted">— 여기 넣은 것만 거리를 셉니다</small></h4>';

    for (var i = 0; i < L.SLOTS; i++) {
      var pr = L.progress(st.slots[i]);
      if (!pr) {
        out += '<div class="card" style="opacity:.6">' +
          '<div class="stat-row"><span>빈 칸</span><span class="muted">아래에서 넣습니다</span></div></div>';
        continue;
      }
      out += '<div class="card">' +
        '<div class="stat-row"><span>' + pr.grade.emoji + ' ' + esc(pr.grade.name) + '</span>' +
          '<b>' + pr.pct + '%</b></div>' +
        '<div class="bar blue"><i style="width:' + pr.pct + '%"></i></div>' +
        '<div class="stat-row"><span class="muted">' +
          distLabel(pr.walked) + ' / ' + distLabel(pr.need) + '</span>' +
          '<span class="muted">' + (pr.done ? '곧 열립니다' : distLabel(pr.left) + ' 남음') + '</span></div>' +
      '</div>';
    }
    out += '</div>';

    var full = st.slots.indexOf(null) < 0;
    out += '<div class="sec"><h4>받아 둔 천거장 <small class="muted">' +
      st.bag.length + ' / ' + L.BAG_MAX + '</small></h4>';
    if (!st.bag.length) {
      out += '<div class="card"><small class="muted">역참(🏮)에 들르면 이따금 받습니다.</small></div>';
    } else {
      out += '<div class="plist">';
      for (var k = 0; k < st.bag.length; k++) {
        var g = L.gradeOf(st.bag[k]);
        out += '<div class="pcard">' +
          '<div class="stat-row"><span style="color:' + g.color + '">' + g.emoji + ' ' +
            esc(g.name) + '</span>' +
            (full
              ? '<span class="muted">행낭이 찼습니다</span>'
              : '<button class="btn tiny primary" data-act="letter-put" data-i="' + k + '">행낭에 넣기</button>') +
          '</div>' +
          '<small class="muted">' + esc(g.desc) + '</small>' +
        '</div>';
      }
      out += '</div>';
    }
    out += '</div>';

    out += '<div class="sec"><h4>여는 법</h4><div class="card"><small class="muted">' +
      '행낭에 넣은 뒤 <b>걸은 거리</b>가 적힌 만큼 쌓이면 봉이 떨어지고 그 사람이 찾아옵니다.<br>' +
      '받아만 둔 천거장은 걸어도 줄지 않습니다 — 원작의 알과 같습니다.<br>' +
      '먼 천거장일수록 높은 등급의 인물이 옵니다. 지금까지 연 것 <b>' + st.opened + '</b>통.' +
      '</small></div></div>';
    return out;
  }

  /* ── 도감 ─────────────────────────────────────────────── */

  /** 도감 맨 위 — 지금 곁을 걷는 반려 (원작의 버디 칸) */
  function buddyStrip() {
    var B = buddy();
    if (!B) { return ''; }
    var cur = B.current();
    if (!cur) {
      return '<div class="sec"><h4>🐾 반려</h4>' +
        '<div class="hint">펫 카드를 열어 <b>반려로 세우면</b> 함께 걷는 것만으로 그 종의 ' +
        '<b>영초</b>가 나옵니다. 오래 함께할수록 사이가 깊어져 장착 보정도 커집니다.</div></div>';
    }
    return '<div class="sec"><h4>🐾 반려</h4>' +
      '<div class="near-card">' +
        '<div class="near-ico">' + pt('pet', cur.pet, 40) + '</div>' +
        '<div class="near-meta"><b>' + esc(cur.pet.name) + ' ' + cur.bond.def.mark + '</b>' +
          '<small>' + cur.bond.def.name + ' · 함께 ' + core.fmt(cur.log.walked) + 'm · ' +
          '다음 🌿' + cur.herbNext + ' 까지 ' + core.fmt(cur.left) + 'm</small></div>' +
        '<button class="btn" data-act="buddy-feed"' +
          (global.DG.bag.count('feed') < 1 ? ' disabled' : '') + '>🍖</button>' +
      '</div>' +
      '<div class="bar sm" style="margin-top:8px"><i style="width:' + (cur.pct * 100) + '%"></i></div></div>';
  }

  /**
   * 도감 맨 위 — 아직 정화하지 않은 암영(rogue.js).
   * **도감 안에 둔다.** 암영은 "도감에 들기 직전의 것"이라 다른 데 두면
   * 정화할 자리를 못 찾는다(탈환 화면에서 '나중에' 를 누르면 그길로 잊힌다).
   */
  function darkStrip() {
    var R = global.DG.rogue;
    if (!R) { return ''; }
    var list = R.darkList();
    if (!list.length) { return ''; }
    var have = growth() ? growth().dust() : 0;
    var rows = list.map(function (d) {
      var can = have >= d.cost.dust;
      return '<div class="near-card">' +
        '<div class="near-ico dark">' + pt('pet', d.pet, 40) + '</div>' +
        '<div class="near-meta"><b>' + esc(d.pet.name) +
          (d.n > 1 ? ' ×' + d.n : '') + '</b>' +
          '<small>정화하면 도감에 듭니다 · ✨ ' + d.cost.dust + '</small></div>' +
        '<button class="btn' + (can ? ' primary' : '') + '" data-act="purify" data-id="' +
          d.pet.id + '"' + (can ? '' : ' disabled') + '>🌕</button>' +
      '</div>';
    }).join('');
    return '<div class="sec"><h4>🌑 암영(暗影) ' + R.darkCount() + '</h4>' + rows +
      '<div class="hint">적도가 두고 간 것들입니다. <b>단사로 정화</b>해야 도감에 들고, ' +
      '정화하면 그 종의 영초를 얹어 줍니다. 지금 단사 ✨ ' + core.fmt(have) + '</div></div>';
  }

  function viewDex() {
    var hC = Object.keys(core.save.dex.heroes).length;
    var pC = Object.keys(core.save.dex.pets).length;
    return darkStrip() + buddyStrip() +
           '<div class="sec"><h4>인물</h4>' + dexBar(hC, data.heroes.length) +
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
    var out = viewCodex();
    if (!log.length) { return out + '<div class="hint">아직 기록이 없습니다.</div>'; }
    out += '<div class="loglist">';
    for (var i = 0; i < log.length; i++) {
      var t = new Date(log[i].t);
      var hh = ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2);
      out += '<div class="lrow ' + log[i].kind + '"><span>' + hh + '</span>' + esc(log[i].text) + '</div>';
    }
    return out + '</div>';
  }

  /**
   * 발견 — 무엇을 보았는지(`codex.js`). 기록 시트 **맨 위**에 붙인다.
   * 새 시트를 만들지 않은 까닭: 기록과 발견은 "지나온 것" 이라는 한 갈래고,
   * 아래 독(dock)에 칸을 더 늘리면 좁은 화면에서 글자가 뭉갠다.
   */
  function viewCodex() {
    var CX = global.DG.codex;
    if (!CX || !CX.on()) { return ''; }
    var r = CX.rate();
    var ts = CX.all();
    var out = '<div class="sec"><h4>발견 <small class="muted">' +
      r.seen + ' / ' + r.total + ' · ' + r.pct + '%</small></h4>' +
      '<div class="bar blue"><i style="width:' + r.pct + '%"></i></div>' +
      '<div class="cx-grid">';
    for (var i = 0; i < ts.length; i++) {
      var t = ts[i];
      if (!t.total) { continue; }
      out += '<div class="cx-cell' + (t.seen === t.total ? ' full' : '') +
        '" title="' + esc(t.rows.filter(function (x) { return x.seen; })
          .map(function (x) { return x.name; }).join(' · ') || '아직 없음') + '">' +
        '<b>' + t.emoji + '</b><span>' + t.name + '</span>' +
        '<small>' + t.seen + '/' + t.total + '</small></div>';
    }
    out += '<div class="cx-cell' + (r.dex.seen === r.dex.total ? ' full' : '') + '">' +
      '<b>📕</b><span>도감</span><small>' + r.dex.seen + '/' + r.dex.total + '</small></div>';
    out += '</div>';
    /* 아직 못 본 것 중 **숨은 곳**만 귀띔한다 — 다 알려 주면 찾을 것이 없다 */
    var hidden = [];
    for (i = 0; i < ts.length; i++) {
      if (ts[i].key !== 'place') { continue; }
      hidden = ts[i].rows.filter(function (x) { return !x.seen && x.hint === '숨은 곳'; });
    }
    if (hidden.length) {
      out += '<small class="muted">아직 못 찾은 숨은 곳이 ' + hidden.length + '군데 있습니다.</small>';
    }
    return out + '</div>';
  }

  /* ── 사관 (온라인 모드) ───────────────────────────────── */

  var aiBusy = null;          // 부르는 중 표시

  function viewOracle() {
    var N = net(), A = ai();
    var st = N.status();
    var a = A.state();
    var html = sectionAuto();

    /* 모드 */
    html += '<div class="sec"><h4>모드</h4><div class="card">' +
      '<div class="modeswitch">' +
        '<button class="btn ' + (st.mode === 'offline' ? 'primary' : 'ghost') + '" data-act="mode-off">' +
          '📴 오프라인</button>' +
        '<button class="btn ' + (st.mode === 'online' ? 'primary' : 'ghost') + '" data-act="mode-on">' +
          '🔮 온라인</button>' +
      '</div>' +
      '<small class="muted">오프라인은 이 기기 안에서만 돌아갑니다 — 세이브도 계산도 전부 로컬입니다.<br>' +
      '온라인은 거기에 <b>사관(AI)</b> 만 더합니다. 서버가 꺼져 있어도 게임은 그대로 돌아갑니다.</small>';

    if (st.mode === 'online') {
      html += '<div class="netrow' + (st.ok ? ' ok' : ' bad') + '">' +
        (st.ok ? '🟢 서버 연결됨 · ' + esc(st.model || '') : '🔴 서버에 닿지 못했습니다') +
        '<button class="btn tiny ghost" data-act="ai-base">주소 바꾸기</button></div>' +
        '<small class="muted">주소: ' + esc(st.base) + '</small>';
    }
    html += '</div></div>';

    if (st.mode !== 'online') {
      html += '<div class="hint">사관을 부르려면 온라인 모드로 바꾸세요. ' +
        '서버 실행은 <b>run-online.bat</b> (또는 <code>node server/dg-server.mjs</code>) 입니다.</div>';
      return html + sectionAiLog(a);
    }

    /* 천기 잔량 */
    if (st.ok) {
      var pct = st.cap ? core.clamp((st.cap - st.used) / st.cap, 0, 1) * 100 : 0;
      html += '<div class="sec"><h4>천기(天機) <small class="muted">= 남은 AI 예산</small></h4><div class="card">' +
        '<div class="bar' + (pct < 20 ? '' : ' blue') + '"><i style="width:' + pct + '%"></i></div>' +
        '<div class="stat-row"><span>오늘 남은 몫</span><b>$' + (st.cap - st.used).toFixed(4) +
          ' / $' + Number(st.cap).toFixed(2) + '</b></div>' +
        '<div class="stat-row"><span>오늘 부른 횟수</span><span class="muted">' + st.calls + '회</span></div>' +
        '<div class="stat-row"><span>누적(이 세이브)</span><span class="muted">' +
          a.calls + '회 · $' + (a.spent || 0).toFixed(4) + '</span></div>' +
        '<small class="muted">부를 때마다 실제 토큰 사용량만큼 깎입니다. ' +
        '한도는 서버가 잡습니다(클라이언트 숫자는 표시용).</small></div></div>';

      var left = A.buffLeft();
      if (left > 0) {
        html += '<div class="hint goodbox">🔮 길조 — <b>' + esc(a.buff.label) + '</b> · ' +
          core.fmtTime(left) + ' 남음</div>';
      }
    }

    /* 기능 */
    html += '<div class="sec"><h4>부를 수 있는 것</h4>';
    if (aiBusy) {
      html += '<div class="hint">⏳ ' + esc(aiBusy) + '</div>';
    }
    html += '<div class="acts">' +
      '<button class="btn wide" data-act="ai-advise">⚖️ 군략 — 다음에 할 일 셋</button>' +
      '<button class="btn wide" data-act="ai-omen">🔮 천기 — 앞길을 점친다 (길조면 보정)</button>' +
      '</div>';

    /* 대화 */
    var ids = Object.keys(core.save.dex.heroes);
    if (ids.length) {
      ids.sort(function (x, y) {
        var A2 = data.find(x), B2 = data.find(y);
        return (B2 ? B2.rarity : 0) - (A2 ? A2.rarity : 0);
      });
      var opt = '';
      for (var i = 0; i < ids.length; i++) {
        var h = data.find(ids[i]);
        if (!h) { continue; }
        opt += '<option value="' + h.id + '">' + esc(h.name) + '</option>';
      }
      html += '<div class="talkbox">' +
        '<div class="row"><span>💬</span><select data-talk-hero>' + opt + '</select></div>' +
        '<input type="text" data-talk-say maxlength="60" placeholder="무엇을 물어보시겠습니까?">' +
        '<button class="btn wide" data-act="ai-talk">말을 건다</button>' +
        '</div>';
    }
    html += '</div>';

    return html + sectionAiLog(a);
  }

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
      '<small class="muted">걷기·조우·문답·던전의 규칙은 <b>손으로 할 때와 같습니다</b> — ' +
      '자동은 무엇을 목표로 삼을지만 고릅니다.<br>' +
      '<b>새 문답은 대신 풀지 않습니다</b> (익힌 문제 복습만). ' +
      '실제 위치(📡)로는 대신 걸을 수 없어 자동을 켜면 지도 이동으로 바뀝니다.<br>' +
      '창을 보고 있는 동안에만 돕니다 — 덮어 두면 멈춥니다.</small>' +
      '</div></div>';
    return html;
  }

  function sectionAiLog(a) {
    if (!a.log || !a.log.length) { return ''; }
    var KIND = { advise: '⚖️ 군략', talk: '💬 대화', omen: '🔮 천기' };
    var out = '<div class="sec"><h4>사관의 말 ' + a.log.length + '건</h4><div class="ailog">';
    for (var i = 0; i < Math.min(a.log.length, 12); i++) {
      var e = a.log[i];
      var t = new Date(e.t);
      var hh = ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2);
      out += '<div class="airow"><div class="ai-top">' +
        '<b>' + (KIND[e.kind] || e.kind) + '</b>' +
        '<small>' + hh + ' · ' + e.inTok + '/' + e.outTok + ' 토큰 · $' +
          (e.cost || 0).toFixed(4) + '</small></div>' +
        '<div class="ai-text">' + esc(e.text).replace(/\n/g, '<br>') + '</div></div>';
    }
    return out + '</div></div>';
  }

  /* ── 인물 · 펫 상세 ───────────────────────────────────────
   * 도감 카드에서 열린다. 능력치는 hero.breakdown() 이 계산해 준 값만 보여준다.
   */

  /** 연성·승화 모듈 (이 판에만 있는 축이라 없을 수도 있다고 보고 쓴다) */
  function growth() { return global.DG.growth || null; }

  /** 반려 모듈 — 위와 같은 이유로 있으면 쓴다 */
  function buddy() { return global.DG.buddy || null; }

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
          statKor(bk.pet.bonus.stat) + ' +' +
          (growth() ? growth().bonusOf(bk.pet) : bk.pet.bonus.value) +
          (growth() && growth().lvOf(bk.pet.id) ? ' (연성 ' + growth().lvOf(bk.pet.id) + '단)' : '') +
          '</small>'
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
        '<small class="muted dt-tip">승급은 <b>같은 인물을 또 등용해 생긴 중복분</b>과 금을 씁니다. ' +
        '동행 선두가 지도 위 내 모습이 되고, 조우 성공 때 동행 전원이 경험치를 받습니다.</small>';
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

  /**
   * 반려(伴侶) — 원작의 버디 화면.
   * 곁에 세운 짐승 하나만 진행이 돌고, 우애는 **종별로 남는다**(갈아타도 지워지지 않는다).
   */
  function buddyBlock(p, owned) {
    var B = buddy();
    if (!B || !owned) { return ''; }
    var cur = B.current();
    var mine = !!(cur && cur.pet.id === p.id);
    var bd = B.bondOf(p.id);
    var lg = B.info(p.id);

    /* 보정은 **곁에 세워 둔 동안에만** 붙는다 — 세우지 않은 종에 그냥 "+2%" 라고
       적으면 이미 붙어 있는 것처럼 읽힌다 */
    var out = '<div class="dt-line"><span>반려(伴侶)</span><b>' + bd.def.mark + ' ' + bd.def.name +
      (bd.def.mul ? ' <small class="muted">· ' + (mine ? '장착 보정' : '세우면') + ' +' +
        Math.round(bd.def.mul * 100) + '%</small>' : '') +
      '</b></div>' +
      '<div class="dt-line"><span>함께 걸은 거리</span><b>' + core.fmt(lg.walked) + 'm' +
        (lg.fed ? ' <small class="muted">· 사료 ' + lg.fed + '줌</small>' : '') + '</b></div>';
    if (bd.next) {
      out += '<div class="bar sm"><i style="width:' + (bd.pct * 100) + '%"></i></div>' +
        '<small class="muted">' + bd.next.mark + ' ' + bd.next.name + ' 까지 ' + core.fmt(bd.left) + 'm</small>';
    }
    if (mine) {
      out += '<div class="dt-line"><span>다음 영초</span><b>🌿 ' + cur.herbNext + ' · ' +
          core.fmt(cur.left) + 'm 남음</b></div>' +
        '<div class="bar sm"><i style="width:' + (cur.pct * 100) + '%"></i></div>' +
        '<button class="btn wide" data-act="buddy-feed"' +
          (global.DG.bag.count('feed') < 1 ? ' disabled' : '') + '>🍖 사료를 먹인다 · 우애 +' +
          core.fmt(B.FEED_M) + ' (남은 사료 ' + global.DG.bag.count('feed') + ')</button>' +
        '<button class="btn ghost wide" data-act="buddy-clear">🐾 곁에서 물린다</button>';
    } else {
      out += '<button class="btn primary wide" data-act="buddy-set" data-id="' + p.id + '">' +
        '🐾 반려로 세운다 — ' + core.fmt(B.legOf(p)) + 'm 마다 🌿</button>';
    }
    return out;
  }

  /**
   * 연성(강화) · 승화(진화) — 원작의 사탕 화면.
   * 잡지 않은 종에는 아무것도 뜨지 않는다(무엇이 되는지만 흘려 보여 준다).
   */
  function petGrowBlock(p, owned) {
    var G = growth();
    if (!G) { return ''; }
    var gi = G.info(p.id);
    var ch = G.chainOf(p.id);
    var out = '';

    if (!owned) {
      return ch
        ? '<div class="dt-line"><span>승화</span><b class="muted">' +
            esc((data.find(ch.to) || {}).name || '') + ' 이 된다는 이야기가 있다</b></div>'
        : '';
    }

    /* 연성 */
    var rc = G.refineCheck(p.id);
    var cost = rc.cost || G.refineCost(gi.lv);
    out += '<div class="dt-line"><span>연성(鍊成)</span><b>' + gi.lv + ' / ' + G.MAX_LV + '단</b></div>' +
      '<div class="dt-line"><span>모은 영초</span><b>🌿 ' + core.fmt(gi.herb) +
        ' <small class="muted">· 잡을 때마다 +' + G.HERB_PER_CATCH + '</small></b></div>';
    if (gi.lv >= G.MAX_LV) {
      out += '<small class="muted">더 올릴 수 없습니다 — 연성이 끝났습니다.</small>';
    } else {
      out += '<button class="btn primary wide" data-act="refine" data-id="' + p.id + '"' +
        (rc.ok ? '' : ' disabled') + '>🌿 연성 — 영초 ' + cost.herb + ' · ✨ 단사 ' +
        core.fmt(cost.dust) + (rc.ok ? '' : ' (' + rc.why + ')') + '</button>';
    }

    /* 승화 */
    if (ch) {
      var ac = G.ascendCheck(p.id);
      var to = data.find(ch.to);
      out += '<div class="dt-line"><span>승화(昇華)</span><b>' + esc(to ? to.name : '') +
        ' <small class="muted">· ' + esc(ch.why) + '</small></b></div>' +
        '<button class="btn wide" data-act="ascend" data-id="' + p.id + '"' +
        (ac.ok ? '' : ' disabled') + '>✨ 승화 — 영초 ' + ch.herb +
        (ac.ok ? '' : ' (' + ac.why + ')') + '</button>';
    }
    return out;
  }

  function detailPet(p) {
    var d = core.save.dex.pets[p.id];
    var owned = !!d;
    var G = growth();
    var gi = G ? G.info(p.id) : { lv: 0, herb: 0 };
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
      '<div class="dt-line"><span>장착 보정</span><b>' + statKor(p.bonus.stat) + ' +' +
        (G ? G.bonusOf(p) : p.bonus.value) +
        (G && gi.lv ? ' <small class="muted">(기본 ' + p.bonus.value + ' · 연성 ' + gi.lv + '단)</small>' : '') +
        '</b></div>' +
      buddyBlock(p, owned) +
      petGrowBlock(p, owned) +
      '<p class="dt-bio">' + esc(p.desc || '') + '</p>' +
      '<small class="muted dt-tip">펫은 인물에게 하나씩 장착합니다. 인물 상세 화면에서 고르세요. ' +
        '<b>반려</b>는 따로입니다 — 곁을 걷는 한 마리이고, 장착과 함께 걸 수 있습니다.</small>' +
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
    renderNear();
    renderAutoBar();
    var a = document.activeElement;
    if (a && (a.tagName === 'SELECT' || a.tagName === 'INPUT') && els['sheet-body'].contains(a)) { return; }
    if (openTab === 'oracle' || openTab === 'dungeon') { renderSheet(); }
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
    renderPanel: renderSheet, renderHud: renderTop
  };
})(window);
