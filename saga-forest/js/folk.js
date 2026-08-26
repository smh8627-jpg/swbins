/**
 * 주민의 거동 — 어슬렁거림과 **주민끼리의 대화**
 * ---------------------------------------------------------------
 * 원작에서 마을이 살아 있다고 느껴지는 마지막 조각이다. 주민이 나만 바라보고 서 있으면
 * 마을이 아니라 상점가다. 저희끼리 오가고 저희끼리 말을 주고받아야 한다.
 *
 *   **어슬렁** 제자리에서 아주 조금만 돈다(제 자리 둘레 64). 멀리 걷게 하면
 *             부탁을 들어주려고 사람을 찾아 헤매게 된다 — 그건 예전에 안 하기로 했다
 *   **잡담**   가까이 선 두 사람이 가끔 말을 주고받는다. 서너 마디를 번갈아 띄운다
 *   **엿듣기** 그 대화를 **끝까지** 곁에서 들으면 두 사람과 정이 는다 (하루 한 번)
 *
 * 대화는 마을의 지금을 말한다 — 계절·시간대·마을 이름·오늘의 행사·다른 주민.
 * 그래서 같은 말이 되풀이돼도 마을 얘기처럼 들린다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  var WANDER = 64;             // 제 자리에서 이만큼까지만 돈다
  var SPEED = 22;              // 걸음 (단위/초)
  var PAUSE_MIN = 2.2, PAUSE_VAR = 3.4;
  var CHAT_DIST = 150;         // 이만큼 가까우면 말을 걸 수 있다
  var CHAT_EVERY = 4;          // 몇 초마다 한 번 볼까 말까 굴린다
  var CHAT_CHANCE = 0.45;
  var LINE_MS = 2400;          // 한 마디가 떠 있는 시간
  var EARSHOT = 230;           // 이 안에 있으면 들린다

  var chat = null;             // { a, b, lines, i, t, heard }
  var look = 0;
  var seeded = false;

  function V() { return global.DG.village; }
  function VD() { return global.DG.villageData; }

  /* ── 이 파일만의 난수 ─────────────────────────────────────
   * **공용 Math.random 을 쓰지 않는다.** 여기는 프레임마다 도는 자리이고,
   * 헤드리스에서 프레임 수는 실행마다 다르다. 공용 흐름을 여기서 먹으면
   * 씨앗을 고정해 둔 자가진단이 실행마다 다른 수를 뽑는다 —
   * 실제로 그렇게 깨져서 이 칸을 따로 만들었다.
   *
   * 씨앗은 마을 씨앗과 날짜에서 뽑는다. 그래서 같은 날이면 같은 흐름이고,
   * 날이 바뀌면 이야기가 달라진다.
   */
  var rs = 20260826 >>> 0;

  function rnd() {
    rs = (rs + 0x6D2B79F5) >>> 0;
    var t = rs;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function reseed() {
    var st = V().state();
    rs = ((st.seed || 1) ^ ((st.day || 0) * 2654435761)) >>> 0;
    seeded = true;
  }

  /* ── 성격 ─────────────────────────────────────────────────
   * 인물 id 로 정해진다 — 세이브에 남기지 않는다. 같은 사람은 늘 같은 성격이다.
   * 말투·청하는 갈래·선물로 반기는 갈래가 여기서 갈린다.
   */
  function idNum(id) {
    var n = 0;
    for (var i = 0; i < id.length; i++) { n = (n * 31 + id.charCodeAt(i)) % 100000; }
    return n;
  }

  function typeOf(id) {
    var T = VD().FOLK_TYPES;
    var n = idNum(String(id));
    return T[Math.floor(core.hash2(n, n % 811 + 17) * T.length) % T.length];
  }

  /** 문구의 {it}·{n}·{have} 를 채운다 */
  function say(line, item, n, have) {
    return String(line)
      .replace(/\{it\}/g, item ? item.emoji + ' ' + item.name : '그것')
      .replace(/\{n\}/g, n === undefined ? '' : n)
      .replace(/\{have\}/g, have === undefined ? '' : have);
  }

  /* ── 대화거리 ─────────────────────────────────────────────
   * 첫 마디를 a 가 하고 번갈아 간다. {..} 는 말하는 그 순간의 마을로 채운다.
   */
  var TOPICS = [
    ['{season}이 완연하구려.', '{phase}에는 바람이 좋습니다.', '{town} 의 {season}은 볼만하지요.'],
    ['{town} 에 온 지도 꽤 되었소.', '나는 이 마을이 마음에 드오.', '떠날 일은 없을 듯하오.'],
    ['{other} 은(는) 요즘 어떻소?', '부지런한 사람이지요.', '나도 좀 배워야겠소.'],
    ['어제 못에서 큰 놈을 놓쳤소.', '입질이 오거든 서두르지 마시오.', '그 말이 옳소.'],
    ['밤에 반딧불이를 보았소.', '여름 밤에만 난다 하더이다.', '올해도 보게 되어 다행이오.'],
    ['사고에 들인 것이 늘었다 하오.', '뉘 덕이겠소.', '고마운 일이지요.'],
    ['집을 넓혔다 하던데.', '빚이 만만치 않겠소.', '그래도 방이 넓으면 좋지요.'],
    ['요즘 이 마을이 정갈해졌소.', '누구 덕인지 알 만하오.', '허허.'],
    ['전방에 새 물건이 들어왔습디다.', '오늘 것은 오늘뿐이라지요.', '서둘러야겠소.'],
    ['꽃을 심어 두면 이듬해가 곱소.', '나무도 그러하지요.', '심는 사람이 임자요.'],
    ['오늘 저이 차림이 곱지 않소?', '침선방에 다녀왔나 보오.', '어울리더이다.']
  ];

  var EVENT_TOPIC = ['오늘이 {event} 아니오.', '{hello}.', '해마다 이맘때가 좋소.'];

  function fill(line, a, b) {
    var vd = VD();
    var others = V().raw().residents.filter(function (r) {
      return r.id !== a.id && r.id !== b.id;
    });
    var other = others.length
      ? others[Math.floor(rnd() * others.length)].ref.name : '이웃';
    var e = global.DG.town ? global.DG.town.event() : null;
    return line
      .replace('{season}', vd.season().name)
      .replace('{phase}', vd.phaseOf(new Date().getHours()).name)
      .replace('{town}', global.DG.town ? global.DG.town.name() : '마을')
      .replace('{other}', other)
      .replace('{event}', e ? e.name : '오늘')
      .replace('{hello}', e ? e.hello : '좋은 날이오');
  }

  function pickTopic() {
    var e = global.DG.town ? global.DG.town.event() : null;
    if (e && rnd() < 0.6) { return EVENT_TOPIC; }
    return TOPICS[Math.floor(rnd() * TOPICS.length)];
  }

  /* ── 대화 ─────────────────────────────────────────────── */

  function start(a, b, topic) {
    var lines = (topic || pickTopic()).map(function (l) { return fill(l, a, b); });
    chat = { a: a, b: b, lines: lines, i: 0, t: 0, heard: true };
    /* 서로 마주 본다 — 말하는 쪽으로 몸을 돌리는 것만으로 대화처럼 보인다 */
    a.facing = b.x >= a.x ? 1 : -1;
    b.facing = a.x >= b.x ? 1 : -1;
    a.aim = null; b.aim = null;
    return chat;
  }

  function endChat() {
    if (!chat) { return; }
    var s = V().state();
    if (chat.heard && s.overheard !== s.day) {
      s.overheard = s.day;
      s.friend[chat.a.id] = (s.friend[chat.a.id] || 0) + 1;
      s.friend[chat.b.id] = (s.friend[chat.b.id] || 0) + 1;
      core.gainFeat(2, '엿듣기');
      core.log('💬 ' + chat.a.ref.name + ' 와(과) ' + chat.b.ref.name +
        ' 의 이야기를 끝까지 들었다 — 두 사람과 정이 늘었다', 'good');
      core.emit('changed');
      core.persist();
    }
    chat = null;
  }

  /** 지금 이 사람이 하고 있는 말 (없으면 null) */
  function lineOf(id) {
    if (!chat) { return null; }
    var who = chat.i % 2 === 0 ? chat.a : chat.b;
    if (who.id !== id) { return null; }
    return chat.lines[chat.i];
  }

  function current() { return chat; }

  /** 지금 대화 중인 사람인가 (말할 차례가 아니어도) */
  function inChat(id) {
    return !!(chat && (chat.a.id === id || chat.b.id === id));
  }

  /* ── 매 프레임 ────────────────────────────────────────── */

  function update(dt) {
    if (!seeded) { reseed(); }
    var raw = V().raw(), res = raw.residents, i;

    /* 1. 하던 대화를 이어 간다 */
    if (chat) {
      /* 대화 중인 사람이 마을을 떠났으면 대화도 끝난다 */
      if (res.indexOf(chat.a) < 0 || res.indexOf(chat.b) < 0) { chat = null; }
      else {
        chat.t += dt * 1000;
        if (Math.hypot(chat.a.x - raw.player.x, chat.a.y - raw.player.y) > EARSHOT) {
          chat.heard = false;
        }
        if (chat.t >= LINE_MS) {
          chat.t = 0;
          chat.i += 1;
          if (chat.i >= chat.lines.length) { endChat(); }
        }
      }
    }

    /* 2. 어슬렁 — 제 자리 둘레를 조금씩 돈다 */
    for (i = 0; i < res.length; i++) {
      var r = res[i];
      if (!r.home) { r.home = { x: r.x, y: r.y }; }
      if (inChat(r.id)) { continue; }               // 말하는 중에는 서 있는다

      if (r.pause === undefined) { r.pause = rnd() * PAUSE_VAR; }
      if (!r.aim) {
        r.pause -= dt;
        if (r.pause > 0) { continue; }
        r.pause = PAUSE_MIN + rnd() * PAUSE_VAR;
        var a = rnd() * Math.PI * 2;
        var rr = rnd() * WANDER;
        var nx = r.home.x + Math.cos(a) * rr;
        var ny = r.home.y + Math.sin(a) * rr;
        if (V().walkable(nx, ny)) { r.aim = { x: nx, y: ny }; }
        continue;
      }
      var dx = r.aim.x - r.x, dy = r.aim.y - r.y;
      var d = Math.hypot(dx, dy);
      if (d < 3) { r.aim = null; continue; }
      var step = Math.min(SPEED * dt, d);
      var mx = r.x + (dx / d) * step, my = r.y + (dy / d) * step;
      if (V().walkable(mx, my)) {
        r.x = mx; r.y = my;
        if (Math.abs(dx) > 1) { r.facing = dx > 0 ? 1 : -1; }
      } else {
        r.aim = null;
      }
    }

    /* 3. 새 대화를 굴린다 — 가까이 선 두 사람 중에서 */
    if (chat) { return; }
    look += dt;
    if (look < CHAT_EVERY) { return; }
    look = 0;
    if (rnd() > CHAT_CHANCE) { return; }

    var pairs = [];
    for (i = 0; i < res.length; i++) {
      for (var j = i + 1; j < res.length; j++) {
        if (Math.hypot(res[i].x - res[j].x, res[i].y - res[j].y) < CHAT_DIST) {
          pairs.push([res[i], res[j]]);
        }
      }
    }
    if (!pairs.length) { return; }
    var p = pairs[Math.floor(rnd() * pairs.length)];
    start(p[0], p[1]);
  }

  function status() {
    return chat
      ? { a: chat.a.ref.name, b: chat.b.ref.name, line: chat.lines[chat.i],
          i: chat.i, of: chat.lines.length, heard: chat.heard }
      : null;
  }

  global.DG = global.DG || {};
  global.DG.folk = {
    WANDER: WANDER, CHAT_DIST: CHAT_DIST, EARSHOT: EARSHOT, LINE_MS: LINE_MS,
    update: update, lineOf: lineOf, inChat: inChat, current: current, status: status,
    typeOf: typeOf, say: say,
    /** 자가진단용 — 두 사람을 바로 말 붙이게 한다 */
    _start: start, _end: endChat,
    _reset: function () { chat = null; look = 0; reseed(); }
  };
})(window);
