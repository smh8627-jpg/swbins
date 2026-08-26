/**
 * 편지와 이사 — 마을이 살아 있게 하는 두 가지
 * ---------------------------------------------------------------
 * 원작에서 마을이 살아 있다고 느껴지는 까닭은 채집이 아니라 **사람이 오가기 때문**이다.
 * 그 둘을 옮겼다.
 *
 *   **이사** 마을에 온 지 오래됐는데 정이 옅은 주민은 **떠날 뜻**을 비친다(💭).
 *            사흘 안에 마음을 얻으면 붙잡을 수 있다 — 그날 부탁을 들어주고 말을 건다.
 *            못 붙잡으면 떠나고, 빈자리에 새 인물이 온다
 *   **편지** 날이 바뀔 때 우편함에 쌓인다. 어제 부탁을 들어준 주민의 감사장,
 *            새 주민의 인사, 떠난 이의 작별, **집 평가서**, 전방의 소식.
 *            선물이 붙기도 하고, **답장을 쓰면 정이 는다**
 *
 * 날짜가 이 파일의 심장이다 — 모든 판정은 `onNewDay()` 한 곳에서만 일어난다.
 * 프레임마다 굴리지 않는다(그러면 하루가 몇 번씩 지나간다).
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  var STAY_MIN = core.tuned('move.stayMin', 8);        // 이만큼 머문 뒤부터 떠날 뜻을 비친다
  var FRIEND_KEEP = core.tuned('move.friendKeep', 3); // 친밀도가 이만큼이면 떠나지 않는다
  var LEAVE_CHANCE = core.tuned('move.chance', 0.12); // 하루 판정
  var NOTICE_DAYS = core.tuned('move.noticeDays', 3); // 비친 뒤 이만큼 지나면 떠난다
  var MAIL_MAX = 40;

  function V() { return global.DG.village; }
  function VD() { return global.DG.villageData; }

  /* ── 세이브 자리 ──────────────────────────────────────── */

  function st() {
    var s = V().state();
    if (!s.mail) { s.mail = []; }
    if (!s.moveIn) { s.moveIn = {}; }
    if (!s.leaving) { s.leaving = {}; }
    if (!s.replied) { s.replied = {}; }
    if (!s.wrote) { s.wrote = {}; }
    return s;
  }

  /** 마을에 있는 인물은 오늘부터 센다 (옛 세이브를 이어받을 때 한 번) */
  function ensureMoveIn() {
    var s = st();
    for (var i = 0; i < s.residents.length; i++) {
      if (s.moveIn[s.residents[i]] === undefined) { s.moveIn[s.residents[i]] = s.day; }
    }
  }

  /* ── 편지함 ───────────────────────────────────────────── */

  var seq = 0;

  function put(letter) {
    var s = st();
    letter.id = 'm' + s.day + '-' + (seq++);
    letter.day = s.day;
    letter.read = false;
    s.mail.unshift(letter);
    /* 넘치면 **읽은 것부터** 버린다 — 안 읽은 편지를 말없이 버리면 안 된다 */
    while (s.mail.length > MAIL_MAX) {
      var cut = -1, i;
      for (i = s.mail.length - 1; i >= 0; i--) {
        if (s.mail[i].read && !s.mail[i].gift) { cut = i; break; }
      }
      s.mail.splice(cut >= 0 ? cut : s.mail.length - 1, 1);
    }
    return letter;
  }

  function list() { return st().mail; }
  function unread() {
    var m = st().mail, n = 0;
    for (var i = 0; i < m.length; i++) { if (!m[i].read) { n++; } }
    return n;
  }
  function find(id) {
    var m = st().mail;
    for (var i = 0; i < m.length; i++) { if (m[i].id === id) { return m[i]; } }
    return null;
  }

  function open(id) {
    var l = find(id);
    if (!l) { return null; }
    l.read = true;
    core.emit('changed');
    core.persist();
    return l;
  }

  /** 붙어 온 선물을 받는다 — 채집물은 가방으로, 가구는 창고로 */
  function take(id) {
    var l = find(id);
    if (!l || !l.gift) { return { kind: 'no', text: '받을 것이 없습니다' }; }
    var g = l.gift;
    l.gift = null;
    l.read = true;
    if (g.type === 'furn') {
      global.DG.home.stockAdd(g.key, g.n || 1);
      var f = VD().furn(g.key);
      core.log('📮 선물을 받았다 — 🪑 ' + (f ? f.name : g.key), 'good');
      core.emit('changed'); core.persist();
      return { kind: 'gift', text: '🪑 ' + (f ? f.name : g.key) + ' 을(를) 받았다' };
    }
    if (g.type === 'gold') {
      core.save.player.gold += g.n;
      core.log('📮 선물을 받았다 — 🪙 ' + core.fmt(g.n), 'good');
      core.emit('changed'); core.persist();
      return { kind: 'gift', text: '🪙 +' + core.fmt(g.n) };
    }
    var it = VD().item(g.key);
    if (!it) { return { kind: 'no', text: '받을 것이 없습니다' }; }
    V().bagAdd(it, g.n || 1);
    core.log('📮 선물을 받았다 — ' + it.emoji + ' ' + it.name + ' ×' + (g.n || 1), 'good');
    core.emit('changed'); core.persist();
    return { kind: 'gift', text: it.emoji + ' ' + it.name + ' ×' + (g.n || 1) };
  }

  /**
   * 답장을 쓴다 — 정이 는다. 사람마다 **하루 한 번**이다
   * (편지가 여러 통 와도 답장 한 번이 한 번이다).
   */
  function reply(id) {
    var l = find(id);
    if (!l) { return null; }
    if (!l.from || l.from === 'town') {
      return { kind: 'no', text: '답장할 곳이 없는 편지입니다' };
    }
    var s = st();
    if (s.replied[l.from] === s.day) {
      return { kind: 'no', text: '오늘은 이미 답장을 보냈습니다' };
    }
    s.replied[l.from] = s.day;
    l.read = true;
    l.replied = true;
    s.friend[l.from] = (s.friend[l.from] || 0) + 1;
    var h = global.DG.data.find(l.from);
    core.gainFeat(2, '답장');
    core.log('✉️ ' + (h ? h.name : l.from) + ' 에게 답장을 썼다 — 친밀도 ' + s.friend[l.from], 'good');
    core.emit('changed');
    core.persist();
    return { kind: 'reply', text: '✉️ 답장을 보냈다 — 친밀도 ' + s.friend[l.from] };
  }

  /**
   * 내가 먼저 편지를 쓴다 — 원작의 우체국 자리다.
   *
   * 답장(`reply`)과 **다른 칸**을 쓴다. 답장은 온 편지에 답하는 것이고, 이것은
   * 아무 소식이 없어도 먼저 마음을 전하는 것이다. 곁에 없어도 된다는 점이
   * 직접 주는 선물과 다르다. 사람마다 하루 한 번이고, **다음 날 답장이 온다.**
   */
  function write(heroId, text) {
    var s = st();
    if (s.residents.indexOf(heroId) < 0) {
      return { kind: 'no', text: '그 사람은 이 마을에 없습니다' };
    }
    if (!s.wrote) { s.wrote = {}; }
    if (s.wrote[heroId] === s.day) {
      return { kind: 'no', text: '오늘은 이미 편지를 보냈습니다' };
    }
    text = String(text || '').trim().slice(0, 60);
    if (!text) { return { kind: 'no', text: '쓸 말을 적어 주세요' }; }
    s.wrote[heroId] = s.day;
    s.friend[heroId] = (s.friend[heroId] || 0) + 1;
    var h = global.DG.data.find(heroId);
    core.gainFeat(2, '편지');
    core.log('✉️ ' + (h ? h.name : heroId) + ' 에게 편지를 부쳤다 — 「' + text +
      '」 (친밀도 ' + s.friend[heroId] + ')', 'good');
    core.emit('changed');
    core.persist();
    return { kind: 'write', text: '✉️ 부쳤습니다 — 친밀도 ' + s.friend[heroId] +
             ' · 답장은 내일 옵니다' };
  }

  function wroteToday(heroId) {
    var s = st();
    return !!(s.wrote && s.wrote[heroId] === s.day);
  }

  /* ── 이사 ─────────────────────────────────────────────── */

  /** 이 사람이 떠날 뜻을 비쳤나 (며칠 남았는지) */
  function leavingOf(id) {
    var s = st();
    if (s.leaving[id] === undefined) { return null; }
    return { due: s.leaving[id], left: Math.max(0, s.leaving[id] - s.day) };
  }

  /**
   * 붙잡는다 — **그날 부탁을 들어준 뒤에만** 통한다.
   * 말 몇 마디로 마음이 돌아서면 이사에 무게가 없다.
   */
  function keep(id) {
    var s = st();
    if (s.leaving[id] === undefined) { return { kind: 'no', text: '떠날 뜻을 비친 적이 없습니다' }; }
    var req = s.requests[id];
    if (!req || !req.done) {
      return { kind: 'no', text: '먼저 오늘의 부탁을 들어주세요 — 마음이 있어야 붙잡힙니다' };
    }
    delete s.leaving[id];
    s.friend[id] = (s.friend[id] || 0) + 2;
    s.moveIn[id] = s.day;                 // 다시 처음부터 센다
    var h = global.DG.data.find(id);
    core.gainFeat(8, '만류');
    core.save.player.fame += 30;
    core.log('🏡 ' + (h ? h.name : id) + ' 을(를) 붙잡았다 — 마을에 남기로 했다 (🎖️ +30)', 'good');
    core.emit('changed');
    core.persist();
    return { kind: 'keep', text: '🏡 마을에 남기로 했습니다 — 친밀도 ' + s.friend[id] };
  }

  /** 마을에 아직 없는 인물 하나 */
  function newcomer() {
    var s = st();
    var pool = global.DG.data.heroes.filter(function (h) {
      return s.residents.indexOf(h.id) < 0;
    });
    if (!pool.length) { return null; }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function gatherGift(n) {
    var cats = ['fruit', 'nut', 'ore', 'flower', 'fish'];
    var it = VD().pick(cats[Math.floor(Math.random() * cats.length)]);
    return it ? { type: 'item', key: it.key, n: n || 2 } : null;
  }

  function furnGift() {
    var all = VD().FURNITURE;
    var f = all[Math.floor(Math.random() * Math.min(all.length, 10))];
    return { type: 'furn', key: f.key, n: 1 };
  }

  /* ── 날이 바뀔 때 (여기서만 굴린다) ───────────────────── */

  /**
   * @param {string[]} helpedIds 어제 부탁을 들어준 주민들
   * @param {string[]} giftedIds 어제 선물을 받은 주민들
   * @param {string[]} writtenIds 어제 내가 편지를 부친 주민들
   * @param {number} wishes 어젯밤 별에 빈 소원 수
   * @returns {{moved:boolean, letters:number}}
   */
  function onNewDay(helpedIds, giftedIds, writtenIds, wishes) {
    var s = st();
    ensureMoveIn();
    var moved = false, n0 = s.mail.length, i;

    /* 1. 떠날 날이 된 사람 — 먼저 보낸다 */
    for (i = s.residents.length - 1; i >= 0; i--) {
      var id = s.residents[i];
      if (s.leaving[id] === undefined || s.day < s.leaving[id]) { continue; }
      var gone = global.DG.data.find(id);
      s.residents.splice(i, 1);
      delete s.leaving[id];
      delete s.moveIn[id];
      moved = true;
      put({ from: id, kind: 'bye',
            title: (gone ? gone.name : id) + ' 의 작별 인사',
            body: '떠나기로 했소. 짧지 않은 날이었소. 이 물건은 두고 가니 방에 놓아 주시오.',
            gift: furnGift() });
      core.log('🏡 ' + (gone ? gone.name : id) + ' 이(가) 마을을 떠났다', 'warn');

      /* 빈자리에 새 사람 */
      var nu = newcomer();
      if (nu) {
        s.residents.push(nu.id);
        s.moveIn[nu.id] = s.day;
        put({ from: nu.id, kind: 'hello',
              title: nu.name + ' 이(가) 이사 왔습니다',
              body: '오늘 이 마을로 왔소. 앞으로 잘 부탁하오. 자주 말을 걸어 주시오.',
              gift: gatherGift(2) });
        core.log('🏡 ' + nu.name + ' 이(가) 마을에 이사 왔다', 'good');
      }
    }

    /* 2. 떠날 뜻을 비치는 사람 — 오래 머물렀는데 정이 옅으면 */
    for (i = 0; i < s.residents.length; i++) {
      var rid = s.residents[i];
      if (s.leaving[rid] !== undefined) { continue; }
      var stay = s.day - (s.moveIn[rid] === undefined ? s.day : s.moveIn[rid]);
      var fr = s.friend[rid] || 0;
      if (stay < STAY_MIN || fr >= FRIEND_KEEP) { continue; }
      /* 마을이 정갈할수록 잘 떠나지 않는다 — 잡초를 뽑고 꽃을 심은 값이다 */
      var bt = global.DG.town ? global.DG.town.beauty() : null;
      var chance = LEAVE_CHANCE * (bt ? Math.max(0.3, 1 - bt.level * 0.18) : 1);
      if (Math.random() > chance) { continue; }
      s.leaving[rid] = s.day + NOTICE_DAYS;
      var lh = global.DG.data.find(rid);
      put({ from: rid, kind: 'notice',
            title: (lh ? lh.name : rid) + ' 이(가) 떠날 뜻을 비쳤습니다',
            body: '이 마을을 떠날까 하오. ' + NOTICE_DAYS + '일 뒤면 짐을 쌀 것이오. ' +
                  '붙잡고 싶거든 내 부탁을 들어주고 말을 걸어 주시오.',
            gift: null });
      core.log('💭 ' + (lh ? lh.name : rid) + ' 이(가) 떠날 뜻을 비쳤다 (' + NOTICE_DAYS + '일)', 'warn');
    }

    /* 3. 어제 부탁을 들어준 이의 감사장 */
    helpedIds = helpedIds || [];
    for (i = 0; i < helpedIds.length; i++) {
      if (s.residents.indexOf(helpedIds[i]) < 0) { continue; }
      var hh = global.DG.data.find(helpedIds[i]);
      var ht = global.DG.folk ? global.DG.folk.typeOf(helpedIds[i]) : null;
      put({ from: helpedIds[i], kind: 'thanks',
            title: (hh ? hh.name : helpedIds[i]) + ' 의 감사장',
            body: ht ? ht.letter : '어제 일은 고마웠소. 변변찮으나 마음이오.',
            gift: Math.random() < 0.6
              ? (Math.random() < 0.15 ? furnGift() : gatherGift(2 + Math.floor(Math.random() * 2)))
              : null });
    }

    /* 3-2. 어제 선물을 받은 이의 답례 — 부탁과 다른 자리에서 온다 */
    giftedIds = giftedIds || [];
    for (i = 0; i < giftedIds.length; i++) {
      if (s.residents.indexOf(giftedIds[i]) < 0) { continue; }
      if (helpedIds.indexOf(giftedIds[i]) >= 0) { continue; }   // 감사장과 겹치지 않게
      var gh = global.DG.data.find(giftedIds[i]);
      put({ from: giftedIds[i], kind: 'giftback',
            title: (gh ? gh.name : giftedIds[i]) + ' 의 답례',
            body: '어제 주신 것 잘 받았소. 빈손으로 보낼 수 없어 조금 보내오.',
            gift: Math.random() < 0.75
              ? (Math.random() < 0.2 ? furnGift() : gatherGift(2))
              : { type: 'gold', n: 300 + Math.floor(Math.random() * 400) } });
    }

    /* 3-3. 내가 어제 부친 편지의 답장 — 성격대로 답한다 */
    writtenIds = writtenIds || [];
    for (i = 0; i < writtenIds.length; i++) {
      if (s.residents.indexOf(writtenIds[i]) < 0) { continue; }
      var ah = global.DG.data.find(writtenIds[i]);
      var at = global.DG.folk ? global.DG.folk.typeOf(writtenIds[i]) : null;
      put({ from: writtenIds[i], kind: 'answer',
            title: (ah ? ah.name : writtenIds[i]) + ' 의 답장',
            body: (at ? at.letter + ' ' : '') + '편지 잘 받았소. 또 쓰시오.',
            gift: Math.random() < 0.45 ? gatherGift(2) : null });
    }

    /* 4. 정든 사람의 안부 — 하루 한 통까지 */
    var warm = s.residents.filter(function (x) {
      return (s.friend[x] || 0) >= FRIEND_KEEP && helpedIds.indexOf(x) < 0;
    });
    if (warm.length && Math.random() < 0.45) {
      var wid = warm[Math.floor(Math.random() * warm.length)];
      var wh = global.DG.data.find(wid);
      put({ from: wid, kind: 'warm',
            title: (wh ? wh.name : wid) + ' 의 안부',
            body: VD().season().hello + '. 별고 없으시오? 지나는 길에 들르시오.',
            gift: Math.random() < 0.3 ? gatherGift(1) : null });
    }

    /* 5. 집 평가서 — 가구를 하나라도 놓았으면 (원작의 그 평가서) */
    var home = global.DG.home;
    if (home && home.state().items.length) {
      var sc = home.score();
      var gr = home.grade(sc.total);
      var best = home.state().best || 0;
      var beat = sc.total > best;
      if (beat) { home.state().best = sc.total; }
      put({ from: 'town', kind: 'hha',
            title: '집 평가서 — ' + gr.name,
            body: '놓인 것 ' + sc.n + '점, 어울림 ' + sc.bonus + '점. 모두 ' + sc.total + '점이오. ' +
                  (beat ? '지난번보다 나아졌소. 이 물건을 상으로 보내오.'
                        : '지난 최고는 ' + best + '점이었소. 조금 더 손을 보시오.'),
            gift: beat ? { type: 'gold', n: 300 + sc.total * 4 } : null });
    }

    /* 5-2. 사고(史庫) — 등급이 오른 날에만 온다 */
    var mu = global.DG.museum;
    if (mu) {
      var g = mu.grade().name;
      if (s.museumGrade !== g) {
        var had = s.museumGrade;
        s.museumGrade = g;
        if (had !== undefined) {
          var c = mu.count();
          put({ from: 'town', kind: 'museum',
                title: '사고에서 — ' + g,
                body: '들여 주신 것이 ' + c.done + '점이 되었소. 사고를 ' + g +
                      ' 라 부르게 되었소. 고마운 일이오.',
                gift: { type: 'gold', n: 500 + c.done * 60 } });
        }
      }
    }

    /* 5-3. 행사 — 그날 아침에 알린다 (전날 밤에 알면 늦다) */
    var tw = global.DG.town;
    if (tw) {
      var ev = tw.event();
      if (ev) {
        put({ from: 'town', kind: 'event',
              title: '오늘은 ' + ev.name + ' 입니다',
              body: ev.hello + '. ' + ev.desc,
              gift: null });
      }
    }

    /* 5-3-2. 어젯밤에 빈 소원 — 별조각으로 답한다 */
    if (wishes > 0) {
      put({ from: 'town', kind: 'wish',
            title: '흐르는 별이 남긴 것',
            body: '어젯밤 ' + wishes + '번 빌었지요. 새벽에 물가에 이것이 떨어져 있었소.',
            gift: { type: 'item', key: 'stardust', n: wishes } });
    }

    /* 5-5. 마을 평가서 — 월요일 아침에만 (날마다 오면 시끄럽다) */
    var tw2 = global.DG.town;
    if (tw2 && global.DG.turnip && global.DG.turnip.dow(s.day) === 1) {
      var bs = tw2.beauty();
      put({ from: 'town', kind: 'beauty',
            title: '마을 평가 — ' + bs.grade,
            body: '잡초 ' + bs.weeds + '포기, 꽃 ' + bs.flowers + '송이, 심은 것 ' +
                  bs.planted + '. 모두 ' + bs.score + '점이오. ' +
                  (bs.weeds > 8 ? '잡초부터 뽑으시오.' : '정갈하오. 사람이 떠나지 않겠소.'),
            gift: bs.level >= 2 ? { type: 'gold', n: 200 * bs.level } : null });
    }

    /* 5-4. 순무 장 — 일요일 아침에만 */
    var tn = global.DG.turnip;
    if (tn && tn.dow(s.day) === 0) {
      put({ from: 'town', kind: 'turnip',
            title: '오늘 순무 장이 섭니다',
            body: '오늘 오전에만 순무를 팝니다. 개당 ' + tn.buyPrice(tn.week(s.day)) +
                  ' 이오. 다음 장이 서기 전에 처분하시오 — 묵으면 썩소.',
            gift: null });
    }

    /* 6. 전방 소식 — 가끔 */
    if (Math.random() < 0.25) {
      var today = home ? home.shopToday() : [];
      if (today.length) {
        put({ from: 'town', kind: 'shop',
              title: '전방에 물건이 들어왔습니다',
              body: '오늘은 ' + today.map(function (f) { return f.name; }).join(' · ') +
                    ' 이(가) 들어왔소. 오늘 것은 오늘뿐이오.',
              gift: null });
      }
    }

    if (moved) { core.emit('village:moved'); }
    core.persist();
    return { moved: moved, letters: s.mail.length - n0 };
  }

  function status() {
    var s = st();
    return { total: s.mail.length, unread: unread(),
             leaving: Object.keys(s.leaving).length };
  }

  global.DG = global.DG || {};
  global.DG.mail = {
    STAY_MIN: STAY_MIN, NOTICE_DAYS: NOTICE_DAYS, FRIEND_KEEP: FRIEND_KEEP,
    list: list, unread: unread, find: find, open: open, take: take, reply: reply,
    write: write, wroteToday: wroteToday,
    leavingOf: leavingOf, keep: keep, onNewDay: onNewDay, status: status,
    ensureMoveIn: ensureMoveIn,
    /** 자가진단용 */
    _put: put, _newcomer: newcomer
  };
})(window);
