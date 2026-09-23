/**
 * 사당(祠堂) 시련 — 3분 방 (PLAN §5 ②)
 * ---------------------------------------------------------------
 * 걷다가 만나는 사건은 30초짜리다. 5분 세션의 몸통이 될 **짧고 끝이 있는 도전**.
 * 권역(한 9·일 9·중 9·서역 9 = 36 대표점)마다 옛 사당 셋이 좌표 해시로 자리잡는다 —
 * 봉수대(`beacon.js`)와 같은 결정성이다(위경도로만 갖고, 그때그때 월드 좌표로).
 *
 * 숨은 자리다. 보이는 때는 셋뿐 — ① 120m 안으로 다가섰을 때 ② 그 권역 봉수대에
 * 불을 올려 반경 1.5km 가 열렸을 때(48절 "가 보기 전까지 안 뜬다"의 예외, 봉수대와
 * 같은 예외) ③ 한 번이라도 깬 자리. 30m 안이면 들어갈 수 있다.
 *
 * 시련: 파도 셋 — 늑대 무리(90) → 산적(120) → 사당 수호자(정찰병 170, 기세 ×1.6).
 * 엔진은 `rogue-action.open(o)` 그대로(수정 없음) — 파도 전환만 이 파일이 onDone 체인으로
 * 잇는다. 제한 3분은 파도마다 따로가 아니라 **전체 예산**이다(남은 시간이 다음 파도로
 * 넘어간다). 깨면 공적·금·丹·인장 조각과 함께 **그 권역의 인물**(genchar ★3~4)이 곁에
 * 선다. 지면(시간 초과·기세 꺾임·중도 이탈) 사료 2 를 잃고 그 사당은 10분간 닫힌다.
 * 하루 셋(`save.daily.shrine`, 날이 바뀌면 daily.js 가 0 으로).
 *
 * 인장 조각 셋은 자동으로 인장(사당 인장) 하나가 된다 — 쓸 곳(승급 3택 등)은 뒤 후보 몫이다.
 * 첫 파도에서 한 대도 못 때리고 물러나면 시련 자체가 없던 것으로 둔다(횟수·비용 없음).
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  var PER_REGION = 3;
  var ENTER_RADIUS = 30;          // m — 들어갈 수 있는 거리
  var HINT_RADIUS = 120;          // m — 이 안으로 오면 숨은 자리가 드러난다
  var DAILY_MAX = 3;
  var TIME_SEC = 180;             // 전체 예산(파도 셋이 나눠 쓴다)
  var LOCK_MS = 10 * 60 * 1000;   // 진 뒤 그 사당의 재입장 대기
  var FAIL_FEED = 2;
  var BOSS_HP_MUL = 1.6;
  var SHARDS_PER_SEAL = 3;
  var REWARD = { gold: 150, feat: 60, dan: 10, shard: 1 };

  /* 파도 표 — 적은 event.js 의 야생 조우 적을 그대로 빌린다(새 적 칸 없음) */
  var WAVES = [
    { foe: 'wolfpack' },
    { foe: 'bandit' },
    { foe: 'scout', boss: true, name: '사당 수호자', emoji: '🗿', note: '사당을 지키는 오래된 그림자' }
  ];
  var SUFFIX = ['옛 사당', '산신당', '석실 사당'];
  var QUOTES = [
    '이끼 낀 돌문 너머에서 무언가 숨을 죽이고 있다.',
    '향 냄새가 아직 남아 있다. 누군가 최근에 다녀간 흔적이다.',
    '문지방에 깊은 발톱 자국이 나 있다.'
  ];

  /* world.js·beacon.js 와 같은 요령 — core.hash2 는 0~0.5 만 돌려준다 */
  function h01(a, b) { return Math.min(0.999999, core.hash2(a, b) * 2); }

  function allRegions() {
    var RK = global.DG.regionKr, RJ = global.DG.regionJp, RC = global.DG.regionCn, RX = global.DG.regionXy;
    return (RK ? RK.REGIONS : []).concat(RJ ? RJ.REGIONS : []).concat(RC ? RC.REGIONS : []).concat(RX ? RX.REGIONS : []);
  }

  var _list = null;
  /** 108 사당(서역 27 은 2026-09-23) — 대표점에서 350~1400m 를 해시로 밀어 고정한 lat/lng. 한 번 계산해 캐싱 */
  function list() {
    if (_list) { return _list; }
    _list = [];
    allRegions().forEach(function (r) {
      var a = Math.round(r.center.lat * 1000), b = Math.round(r.center.lng * 1000);
      var mPerLat = 111320, mPerLng = 111320 * Math.cos(r.center.lat * Math.PI / 180);
      for (var i = 0; i < PER_REGION; i++) {
        var ang = h01(a * 41 + 5 + i * 101, b * 43 + 9 + i * 57) * Math.PI * 2;
        var dist = 350 + h01(a * 47 + 13 + i * 73, b * 53 + 21 + i * 89) * 1050;
        _list.push({
          key: r.code + '-s' + i, index: i, name: r.name + ' ' + SUFFIX[i],
          region: r, quote: QUOTES[i],
          lat: r.center.lat + Math.cos(ang) * dist / mPerLat,
          lng: r.center.lng + Math.sin(ang) * dist / mPerLng
        });
      }
    });
    return _list;
  }

  function byKey(key) {
    var ls = list();
    for (var i = 0; i < ls.length; i++) { if (ls[i].key === key) { return ls[i]; } }
    return null;
  }

  /** 지금 원점(origin) 기준 월드 좌표 — 봉수대와 같다 */
  function worldPos(s) {
    var W = global.DG.world;
    return W ? W.latLngToWorld(s.lat, s.lng) : { x: 0, y: 0 };
  }

  /* ── 세이브(읽기는 살피기 — 안 만든다 / 쓰기는 그때 만든다) ─── */

  function peek(key) {
    var b = core.save.shrines;
    return (b && b[key]) || { clears: 0, lastAt: 0, failAt: 0 };
  }
  function slot(key) {
    if (!core.save.shrines) { core.save.shrines = {}; }
    if (!core.save.shrines[key]) { core.save.shrines[key] = { clears: 0, lastAt: 0, failAt: 0 }; }
    return core.save.shrines[key];
  }
  function cleared(key) { return peek(key).clears > 0; }

  function dayKey() { return global.DG.daily ? global.DG.daily.dayKey() : ''; }
  function dailyMax() { return Math.max(1, Math.round(core.tuned('shrine.dailyMax', DAILY_MAX))); }
  function timeBudget() { return Math.max(30, Math.round(core.tuned('shrine.timeSec', TIME_SEC))); }

  /** 오늘 치른 횟수 — 날짜가 다르면 0. 세이브를 안 건드린다 */
  function todayCount() {
    var d = core.save.daily;
    if (!d || d.date !== dayKey()) { return 0; }
    return d.shrine | 0;
  }
  function bumpToday() {
    var D = global.DG.daily;
    if (!D) { return; }
    var s = D.state();
    s.shrine = (s.shrine | 0) + 1;
  }

  /* ── 보이는가·들어갈 수 있는가 ────────────────────────── */

  function distTo(s) {
    var pos = core.save.player.pos, w = worldPos(s);
    return Math.hypot(w.x - pos.x, w.y - pos.y);
  }

  /** 이 사당이 그 권역 봉수대에 밝혀진 반경 안인가 */
  function revealedByBeacon(s) {
    var BC = global.DG.beacon;
    if (!BC || !BC.lit(s.region.code)) { return false; }
    var b = BC.byKey(s.region.code);
    if (!b) { return false; }
    var bw = BC.worldPos(b), sw = worldPos(s);
    return Math.hypot(bw.x - sw.x, bw.y - sw.y) <= BC.REVEAL_RADIUS;
  }

  function visible(s, dist) {
    if (cleared(s.key)) { return true; }
    if ((dist === undefined ? distTo(s) : dist) <= HINT_RADIUS) { return true; }
    return revealedByBeacon(s);
  }

  /** 보이는 사당 중 가장 가까운 것(maxD 안에서만). 없으면 null */
  function nearest(maxD) {
    var ls = list(), best = null, bestD = maxD === undefined ? Infinity : maxD;
    for (var i = 0; i < ls.length; i++) {
      var d = distTo(ls[i]);
      if (d > bestD) { continue; }
      if (!visible(ls[i], d)) { continue; }
      best = ls[i]; bestD = d;
    }
    return best ? { shrine: best, dist: bestD, inRange: bestD <= ENTER_RADIUS, state: peek(best.key) } : null;
  }

  /** 반경 안의 사당(월드 좌표 기준) — 봉수대가 자기 반경 노출에 이어 붙인다 */
  function within(c, radius) {
    var ls = list(), out = [];
    for (var i = 0; i < ls.length; i++) {
      var w = worldPos(ls[i]);
      if (Math.hypot(w.x - c.x, w.y - c.y) <= radius) {
        out.push({ type: 'shrine', x: w.x, y: w.y, name: ls[i].name, key: ls[i].key });
      }
    }
    return out;
  }

  /** 지금 들어갈 수 있나 — reason: 'daily'(하루 셋) | 'lock'(진 뒤 10분) | null */
  function entry(s, now) {
    now = now === undefined ? Date.now() : now;
    var st = peek(s.key);
    var lockLeft = st.failAt ? Math.max(0, st.failAt + LOCK_MS - now) : 0;
    if (lockLeft > 0) { return { ok: false, reason: 'lock', lockLeftMs: lockLeft, left: dailyMax() - todayCount() }; }
    var left = dailyMax() - todayCount();
    if (left <= 0) { return { ok: false, reason: 'daily', lockLeftMs: 0, left: 0 }; }
    return { ok: true, reason: null, lockLeftMs: 0, left: left };
  }

  /* ── 시련 — 파도 표와 진행(순수) ───────────────────────── */

  /** i 번째 파도의 적 사양(기세·이름·무대). 판정에 안 닿는 화면 값은 event.js 것을 빌린다 */
  function waveSpec(i) {
    var w = WAVES[i], E = global.DG.event;
    var foe = E && E.FOES ? E.FOES[w.foe] : null;
    if (!foe) { return null; }
    var hp = Math.max(1, Math.round(foe.power * core.tuned('event.foeHpMul', 7) * (w.boss ? BOSS_HP_MUL : 1)));
    return {
      i: i, boss: !!w.boss, foe: foe, foeHp: hp,
      name: w.name || foe.name, emoji: w.emoji || foe.emoji, note: w.note || foe.note,
      stage3d: E.foeVisual ? E.foeVisual(foe) : null
    };
  }

  function begin(s) {
    return { key: s.key, wave: 0, used: 0, dealt: 0, over: false };
  }

  /**
   * 파도 하나가 끝났다 — 다음에 할 일을 낸다.
   * @param {{cleared, fled, dealt, timeUsed}} p  rogue-action 의 perf 모양
   * @returns {{next: 'wave'|'clear'|'fail'|'abort', run}}  abort = 첫 파도에서 한 대도 못 치고 물러남
   */
  function advance(run, p) {
    run.used += p.timeUsed || 0;
    run.dealt += p.dealt || 0;
    if (p.fled && !(p.dealt > 0) && run.wave === 0) { run.over = true; return { next: 'abort', run: run }; }
    if (!p.cleared) { run.over = true; return { next: 'fail', run: run }; }
    run.wave += 1;
    if (run.wave >= WAVES.length) { run.over = true; return { next: 'clear', run: run }; }
    if (run.used >= timeBudget()) { run.over = true; return { next: 'fail', run: run }; }
    return { next: 'wave', run: run };
  }

  /** 다음 파도에 줄 제한 시간 — 전체 예산에서 쓴 만큼을 뺀 나머지 */
  function timeLeft(run) { return Math.max(5, Math.round(timeBudget() - run.used)); }

  /* ── 정산(세이브가 바뀌는 곳은 여기 둘) ─────────────────── */

  function gencharOf(region) {
    if (region.country === 'jp') { return global.DG.gencharJp || null; }
    if (region.country === 'cn') { return global.DG.gencharCn || null; }
    if (region.country === 'xy') { return global.DG.gencharXy || null; }
    return global.DG.genchar || null;
  }

  /** 이 사당을 (clears 번째로) 깨면 만나는 그 권역의 인물 — 같은 (사당, 횟수)면 늘 같은 인물 */
  function heroFor(s, clears) {
    var GC = gencharOf(s.region);
    if (!GC) { return null; }
    var a = Math.round(s.lat * 1000), b = Math.round(s.lng * 1000);
    var h = h01(a * 61 + clears * 17 + s.index, b * 67 + 3);
    var rar = 3 + (h < 0.6 ? 0 : 1);                       // ★3 60% · ★4 40%
    return GC.hero(s.region.code, rar, Math.floor(h * 1e6) + clears);
  }

  /** 깼다 — 보상과 인물 조우. 한 번만 부를 것 */
  function settleClear(s) {
    var st = slot(s.key), B = global.DG.bag, GR = global.DG.growth;
    st.clears += 1; st.lastAt = Date.now(); st.failAt = 0;
    bumpToday();
    core.save.player.gold += REWARD.gold;
    core.gainFeat(REWARD.feat, '사당');
    if (GR) { GR.addDust(REWARD.dan); }
    var shard = B ? B.add('shard', REWARD.shard) : 0, sealed = false;
    if (B && B.count('shard') >= SHARDS_PER_SEAL) {
      B.take('shard', SHARDS_PER_SEAL);
      sealed = B.add('seal', 1) > 0;
    }
    var hero = heroFor(s, st.clears), spawn = null, W = global.DG.world;
    if (hero && W && W.spawnSpecial) { spawn = W.spawnSpecial(hero.rarity, hero); }
    if (global.DG.daily) { global.DG.daily.progress('shrine'); }
    core.log('⛩️ ' + s.name + ' 시련을 이겨냈다 — 🪙 +' + REWARD.gold + ' · 공적 +' + REWARD.feat +
      ' · 丹 +' + REWARD.dan + (shard ? ' · 🔖 인장 조각 +' + shard : '') +
      (sealed ? ' · 🏵️ 인장 하나로 합쳐졌다' : '') +
      (spawn ? ' · ' + spawn.ref.name + ' 이(가) 곁에 섰다' : ''), 'good');
    core.emit('toast', '⛩️ 시련 통과' + (spawn ? ' — ' + spawn.ref.name : ''));
    var back = global.DG.drop ? global.DG.drop.win() : null;   // 떨어진 짐 회수(⑧)
    core.emit('changed');
    core.persist();
    return { ok: true, reward: REWARD, shard: shard, sealed: sealed, spawn: spawn, hero: hero, clears: st.clears,
      recovered: back };
  }

  /** 졌다 — 사료 2 와 10분 봉쇄. 한 번만 부를 것 */
  function settleFail(s) {
    var st = slot(s.key), B = global.DG.bag;
    st.failAt = Date.now(); st.lastAt = st.failAt;
    bumpToday();
    var lost = B ? B.take('feed', FAIL_FEED) : 0;
    core.log('⛩️ ' + s.name + ' 시련에서 밀려났다' + (lost ? ' — 🍖 사료 ' + lost + ' 을 잃었다' : '') +
      ' · 10분 뒤 다시', 'bad');
    var dropped = global.DG.drop ? global.DG.drop.lose() : null;   // 패배 비용(⑧) — 사당은 늘 손으로 치른다
    core.emit('changed');
    core.persist();
    return { ok: false, lost: lost, lockMs: LOCK_MS, drop: dropped };
  }

  /* ── 화면 ─────────────────────────────────────────────── */

  var active = false, run = null, cur = null;

  function host() { return global.document && global.document.getElementById('encounter'); }
  function engine() { return global.DG.rogueAction || global.DG.duel; }

  function hide() { var el = host(); if (el) { el.classList.remove('show'); } }

  function close() {
    active = false; run = null; cur = null;
    var el = host();
    if (el) { el.classList.remove('show'); el.innerHTML = ''; }
    core.emit('changed');
  }

  function mins(ms) { return Math.max(1, Math.ceil(ms / 60000)); }

  /** 입구 카드 — 들어간다 / 물러난다. 못 들어가는 까닭이 있으면 안내만 */
  function open(s) {
    if (global.DG.encounter && global.DG.encounter.active) { return; }
    var el = host();
    if (!el || !s) { return; }
    active = true; cur = s;
    var en = entry(s), D = engine(), can = en.ok && D && global.DG.hero;
    var info =
      '<div class="enc-reward">파도 3 · 제한 ' + Math.round(timeBudget() / 60) + '분 · 오늘 ' + Math.max(0, en.left) +
      '/' + dailyMax() + '회 남음</div>' +
      '<div class="enc-reward">🪙 +' + REWARD.gold + ' · 공적 +' + REWARD.feat + ' · 丹 +' + REWARD.dan +
      ' · 🔖 인장 조각 +' + REWARD.shard + ' · ' + s.region.name + '의 인물이 곁에 선다</div>' +
      '<p class="quote">지면 🍖 사료 ' + FAIL_FEED + '을 잃고, 이 사당은 10분간 닫힌다.</p>';
    var tail;
    if (en.reason === 'lock') {
      tail = '<div class="enc-reward">문이 굳게 닫혔다 — ' + mins(en.lockLeftMs) + '분 뒤에 다시</div>' +
        '<button class="btn primary wide" data-act="ok">닫는다</button>';
    } else if (en.reason === 'daily') {
      tail = '<div class="enc-reward">오늘은 더 들어갈 수 없다 — 내일 다시</div>' +
        '<button class="btn primary wide" data-act="ok">닫는다</button>';
    } else if (!can) {
      tail = '<div class="enc-reward">봉인이 풀리지 않는다 (전투 화면을 불러오지 못했다)</div>' +
        '<button class="btn primary wide" data-act="ok">닫는다</button>';
    } else {
      tail = '<button class="btn primary wide" data-act="go">⛩️ 들어간다</button>' +
        '<button class="btn ghost wide" data-act="ok">물러난다</button>';
    }
    el.innerHTML =
      '<div class="enc-card">' +
        '<div class="enc-big"><span style="font-size:56px">⛩️</span></div>' +
        '<h3>' + s.name + '</h3>' +
        '<p class="quote">' + s.quote + '</p>' +
        (cleared(s.key) ? '<small>이 자리에서 ' + peek(s.key).clears + '번 이겼다</small>' : '') +
        info + tail +
      '</div>';
    el.classList.add('show');
    var ok = el.querySelector('[data-act="ok"]');
    if (ok) { ok.addEventListener('click', close); }
    var go = el.querySelector('[data-act="go"]');
    if (go) { go.addEventListener('click', function () { start(s); }); }
  }

  /** 들어간다 — 첫 파도를 연다 */
  function start(s) {
    var en = entry(s);
    if (!en.ok || !engine() || !global.DG.hero) { return false; }
    run = begin(s); cur = s;
    hide();
    openWave();
    return true;
  }

  function openWave() {
    var D = engine(), s = cur, spec = waveSpec(run.wave);
    if (!D || !spec) { finish('fail'); return; }
    var pw = global.DG.hero.partyPower();
    D.open({
      title: '⛩️ 사당 시련 ' + (run.wave + 1) + '/' + WAVES.length + ' — ' + spec.name,
      foeName: spec.name, emoji: spec.emoji,
      stage3d: spec.stage3d,
      foeHp: spec.foeHp, myAtk: pw.atk, myDef: pw.def,
      timeSec: timeLeft(run),
      onDone: function (p) { onWaveDone(p); }
    });
  }

  function onWaveDone(p) {
    var step = advance(run, p);
    if (step.next === 'wave') {
      core.log('⛩️ 파도 ' + run.wave + ' 을 넘었다 — 다음은 ' + WAVES.length + ' 중 ' + (run.wave + 1) + '번째', 'good');
      openWave();
    } else { finish(step.next); }
  }

  function finish(kind) {
    var s = cur;
    if (kind === 'abort') { close(); return; }
    var res = kind === 'clear' ? settleClear(s) : settleFail(s);
    showResult(s, res);
  }

  function showResult(s, res) {
    var el = host();
    active = true;
    if (!el) { return; }
    var body;
    if (res.ok) {
      body =
        '<div class="enc-card result good catchpop">' +
          '<div class="enc-big"><span style="font-size:56px">⛩️</span></div>' +
          '<h3>시련을 이겨냈다</h3>' +
          '<p class="quote">' + s.name + '의 문이 조용히 열린다.</p>' +
          '<div class="enc-reward">🪙 +' + REWARD.gold + ' · 공적 +' + REWARD.feat + ' · 丹 +' + REWARD.dan +
            (res.shard ? ' · 🔖 인장 조각 +' + res.shard : '') + (res.sealed ? ' · 🏵️ 인장 +1' : '') + '</div>' +
          (res.spawn
            ? '<div class="enc-reward">🙋 ' + res.spawn.ref.name + ' 이(가) 곁에 섰다 — 가까이 가 말을 걸어 보자</div>'
            : '') +
          (global.DG.drop ? global.DG.drop.backLine(res.recovered) : '') +
          '<button class="btn primary wide" data-act="ok">좋다</button>' +
        '</div>';
    } else {
      body =
        '<div class="enc-card result bad jolt">' +
          '<div class="enc-big"><span style="font-size:56px">💢</span></div>' +
          '<h3>시련에서 밀려났다</h3>' +
          '<p class="quote">돌문이 다시 닫힌다.</p>' +
          '<div class="enc-reward">' + (res.lost ? '🍖 사료 ' + res.lost + ' 을 잃었다 · ' : '') +
            '이 사당은 10분간 닫힌다</div>' +
          (global.DG.drop ? global.DG.drop.cardLine(res.drop) : '') +
          '<button class="btn primary wide" data-act="ok">물러난다</button>' +
        '</div>';
    }
    el.innerHTML = body;
    el.classList.add('show');
    var ok = el.querySelector('[data-act="ok"]');
    if (ok) { ok.addEventListener('click', close); }
  }

  core.on('shrine:request', function (s) { open(s); });

  global.DG = global.DG || {};
  global.DG.shrine = {
    PER_REGION: PER_REGION, ENTER_RADIUS: ENTER_RADIUS, HINT_RADIUS: HINT_RADIUS,
    DAILY_MAX: DAILY_MAX, TIME_SEC: TIME_SEC, LOCK_MS: LOCK_MS, FAIL_FEED: FAIL_FEED,
    SHARDS_PER_SEAL: SHARDS_PER_SEAL, REWARD: REWARD, WAVES: WAVES,
    /* 값을 내는 함수 — 순수하다. 세이브를 읽기만 한다 */
    list: list, byKey: byKey, worldPos: worldPos, peek: peek, cleared: cleared,
    todayCount: todayCount, visible: visible, nearest: nearest, within: within, entry: entry,
    waveSpec: waveSpec, begin: begin, advance: advance, timeLeft: timeLeft, heroFor: heroFor,
    /* 세이브가 바뀌는 곳은 여기 둘 */
    settleClear: settleClear, settleFail: settleFail,
    /* 화면 */
    open: open, start: start, close: close, get active() { return active; },
    /** 진단이 씨를 되돌릴 때 */
    _resetForTest: function () { _list = null; run = null; cur = null; active = false; }
  };
})(window);
