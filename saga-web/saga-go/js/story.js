/**
 * 이야기 임무 1~2장 — 대화 창·금빛 기둥·목록(O)·단계 여섯 (PLAN §5 ⑲-12, saga-godot PLAN 106 ㉕)
 * ---------------------------------------------------------------
 *   인물 셋    청하 촌장 누리(고향 마을) · 늙은 사공 버들(갈대 나루 탑) · 떠돌이 학자 은비(옛 성터 언덕 탑) —
 *              ⑮ 땅의 "고향에서 가장 가까운 탑" 곁에 늘 서 있다. 지금 단계가 아니면 혼잣말 한 줄
 *   단계       talk(곁에서 💬/F → 대화) · go(그 자리 반경 안) · boss(그 탑 ⑪ 수호자 — 이미 쓰러져 꽃을 기다리면 바로 넘김) ·
 *              kill(임무 적 무리 `sq:` — 되살아나지 않고 전리품 없음) · light(옛 제단에 어느 원소든 스킬·해방) ·
 *              domain(먹구름 제단 숨은 터 깨기 — `domain:clear`)
 *   장         여정 등급(플레이어 Lv) ar 에 열린다. 단계마다 부대 경험 10, 장 끝에 보상
 *   화면       목표에 금빛 기둥(3D) · 위쪽 추적 한 줄(장·목표·거리) · 미니맵 금빛 점 · O(📖 단추) 목록
 * 세이브 `save.story = { ch, step }` 하나(읽는 쪽 기본값 — SAVE_VERSION 그대로). 임무 적·제단은 저장하지 않는다
 * (불러오면 그 단계 처음). 이름·대사는 saga-godot `data/story.gd`(가상 마을 사람)를 옮겼다. 손잡이 `story.on` 0 이면 다 사라진다.
 * 자리는 칸 좌표가 아니라 ⑮ 땅의 탑이라 GPS 판에서도 같은 곳이다.
 */
(function (global) {
  'use strict';

  function core() { return global.DG.core; }
  function BM() { var b = global.DG.biome; return b && b.on && b.on() ? b : null; }
  function FC() { return global.DG.fieldCombat || null; }
  function K(key, def) { return core().tuned('story.' + key, def); }
  function on() { return !!(K('on', 1) && BM()); }
  function gps() { var W = global.DG.world; return !!(W && W.mode === 'geo'); }
  function TALK_R() { return gps() ? 15 : 6; }
  function GO_R() { return gps() ? 60 : 30; }
  function LIGHT_R() { return 2.5; }               // 원소 신호 고리 반지름 + 이만큼 안에 제단이 들면 켜진다
  var STEP_EXP = 10, KILL_NEAR = 150, IDLE_R = 12, IDLE_GAP = 45000;

  /* 인물 — zone 은 ⑮ 땅 key(고향은 'home'), off 는 그 땅 탑에서 떨어진 자리(m) */
  var NPCS = {
    elder:    { id: 'story_elder',    name: '청하 촌장 누리', short: '누리', zone: 'home',    off: [-22, 16],  color: '#6b7f61', idle: '먹구름이 걷히면 마을 잔치를 열어야지.' },
    ferryman: { id: 'story_ferryman', name: '늙은 사공 버들', short: '버들', zone: 'galdae',  off: [-18, -24], color: '#4d6688', idle: '물 냄새가 요즘 영 비릿해.' },
    scholar:  { id: 'story_scholar',  name: '떠돌이 학자 은비', short: '은비', zone: 'gojeong', off: [-18, -24], color: '#8c6b99', idle: '이 비문, 읽을수록 이상하다니까.' }
  };
  var NPC_KEYS = ['elder', 'ferryman', 'scholar'];

  /* 장 — 줄 = [말하는 이, 글] · 고르는 줄 = ['?', [대답, 대답]](대답만 다르고 흐름은 같다) */
  var CHAPTERS = [
    { id: 'ch1', name: '제1장 · 먹구름이 오는 마을', ar: 1,
      reward: { knot: 2, gold: 500, guide: 2, party: 300 },
      steps: [
        { type: 'talk', npc: 'elder', text: '청하 촌장을 찾아가기',
          lines: [['누리', '왔구나. 요 며칠 대숲 쪽에서 바람이 울고, 하늘에 먹구름이 걷히질 않는단다.'],
            ['누리', '옛날부터 먹구름은 나쁜 기운이 깨어날 때 온다고 했지.'],
            ['?', ['제가 알아볼게요.', '바람이 운다고요?']],
            ['누리', '대숲 고을 탑에 가 보렴. 거기 사나운 것이 둥지를 틀었다는 소문이 있어.']] },
        { type: 'go', zone: 'jugeup', off: [0, 0], text: '대숲 고을 탑, 바람이 우는 곳으로' },
        { type: 'boss', zone: 'jugeup', text: '대숲 고을 수호자를 쓰러뜨리기' },
        { type: 'talk', npc: 'ferryman', text: '갈대 나루의 늙은 사공에게 먹구름을 묻기',
          lines: [['버들', '수호자를 쓰러뜨렸다고? 허, 그놈도 먹구름에 홀렸던 게야.'],
            ['버들', '먹구름은 이 나루 건너 제단에서 피어오르지. 거기 오래 잠든 이무기가 있다더군.'],
            ['?', ['이무기요?', '어떻게 막죠?']],
            ['버들', '옛 성터의 학자가 비문을 읽고 있다던데, 그 아이한테 가 봐. 요즘 성터 어귀에 졸개들이 들끓는다니 조심하고.']] },
        { type: 'kill', zone: 'gojeong', off: [40, -30], kinds: ['raptor', 'raptor', 'imp', 'imp'], text: '옛 성터 어귀의 먹구름 졸개 물리치기' },
        { type: 'talk', npc: 'scholar', text: '떠돌이 학자와 이야기하기',
          lines: [['은비', '살았다! 졸개들 때문에 비문 곁엔 가지도 못했어.'],
            ['은비', '여길 봐. \'제단에 원소의 불을 밝히면 잠든 것의 이름이 드러난다\' — 네 힘이면 될지도 몰라.']] },
        { type: 'light', zone: 'gojeong', off: [-30, 26], text: '옛 제단에 원소 스킬로 불 밝히기' },
        { type: 'talk', npc: 'elder', text: '청하 촌장에게 알리기',
          lines: [['누리', '먹구름 이무기라… 옛이야기인 줄로만 알았는데.'],
            ['누리', '고맙다. 네 덕에 마을이 한시름 놓았구나. 이건 마을이 모은 작은 성의란다.'],
            ['누리', '이무기를 상대하려면 더 강해져야 할 게다. 모험을 더 쌓고 오렴.']] }
      ] },
    { id: 'ch2', name: '제2장 · 먹구름 제단', ar: 5,
      reward: { knot: 3, gold: 1000, secret: 1, party: 500 },
      steps: [
        { type: 'talk', npc: 'scholar', text: '학자에게 제단 가는 길을 묻기',
          lines: [['은비', '비문을 다 읽었어. 이무기는 갈대 나루 건너, 먹구름 제단 안에 잠들어 있어.'],
            ['은비', '이무기는 번개를 두르면 불에 약해. 준비 단단히 해!']] },
        { type: 'go', altar: true, text: '갈대 나루 건너 먹구름 제단으로' },
        { type: 'domain', text: '먹구름 제단에서 먹구름 이무기를 쓰러뜨리기' },
        { type: 'talk', npc: 'elder', text: '청하 촌장에게 알리기',
          lines: [['누리', '하늘이… 개었구나! 몇 해 만에 보는 맑은 하늘이냐.'],
            ['누리', '이무기는 또 깨어날지 모르지만, 네가 있으니 든든하다. 잔치 준비를 해야겠구나!'],
            ['누리', '참, 은비가 너와 함께 다니고 싶다더구나. 비문 읽는 솜씨가 싸움에도 쓸모 있을 게다.']] }
      ] }
  ];

  /* ── 자리(순수) ───────────────────────────────────────── */

  var anchorMemo = {};
  /** ⑮ 땅 zk 의 "고향에서 가장 가까운 탑" — { key, x, y }. 고향은 마을 가운데(0,0). 같은 세계면 늘 같다 */
  function anchorOf(zk) {
    if (anchorMemo[zk]) { return anchorMemo[zk]; }
    var B = BM();
    if (!B) { return null; }
    if (zk === 'home') { anchorMemo[zk] = { key: '0_0', x: 0, y: 0 }; return anchorMemo[zk]; }
    var best = null, bd = Infinity, i, j;
    for (j = -4; j <= 4; j++) {
      for (i = -4; i <= 4; i++) {
        var c = B.cellAt(i, j);
        if (!c || c.zone !== zk) { continue; }
        var d = Math.hypot(c.x, c.y);
        if (d < bd - 1e-6) { bd = d; best = c; }
      }
    }
    if (best) { anchorMemo[zk] = { key: best.key, x: best.x, y: best.y }; }
    return anchorMemo[zk] || null;
  }
  function at(zk, off) {
    var a = anchorOf(zk);
    return a ? { x: a.x + (off ? off[0] : 0), y: a.y + (off ? off[1] : 0) } : null;
  }
  function npcPos(k) { var n = NPCS[k]; return n ? at(n.zone, n.off) : null; }
  function altarPos() {
    var DM = global.DG.domain, L = DM && DM.list ? DM.list() : [];
    for (var i = 0; i < L.length; i++) { if (L[i].kind === 'weekly') { return { x: L[i].x, y: L[i].y, id: L[i].id }; } }
    return null;
  }
  function cellOf(zk) {
    var a = anchorOf(zk), B = BM();
    return a && B ? B.cellAt.apply(null, a.key.split('_').map(Number)) : null;
  }
  /** 단계의 목표 자리 — { x, y, r?, label }. 순수(세계 표만 읽는다) */
  function targetOf(st) {
    if (!st) { return null; }
    if (st.type === 'talk') { var p = npcPos(st.npc); return p ? { x: p.x, y: p.y, r: TALK_R(), label: NPCS[st.npc].name } : null; }
    if (st.type === 'go') {
      var g = st.altar ? altarPos() : at(st.zone, st.off);
      return g ? { x: g.x, y: g.y, r: GO_R(), label: st.text } : null;
    }
    if (st.type === 'boss') {
      var F = FC(), gd = F ? F.guardianAt(cellOf(st.zone)) : null;
      return gd ? { x: gd.x, y: gd.y, r: 0, label: st.text, rk: gd.region } : null;
    }
    if (st.type === 'domain') { var al = altarPos(); return al ? { x: al.x, y: al.y, r: 0, label: st.text } : null; }
    var q = at(st.zone, st.off);                             // kill · light
    return q ? { x: q.x, y: q.y, r: st.type === 'light' ? LIGHT_R() : 0, label: st.text } : null;
  }

  /* ── 세이브 ───────────────────────────────────────────── */

  function sv() {
    var s = core().save;
    if (!s.story || typeof s.story !== 'object') { s.story = { ch: 0, step: 0 }; }
    if (typeof s.story.ch !== 'number') { s.story.ch = 0; }
    if (typeof s.story.step !== 'number') { s.story.step = 0; }
    return s.story;
  }
  function chapter() { var c = sv().ch; return c < CHAPTERS.length ? CHAPTERS[c] : null; }
  function locked() { var ch = chapter(); return !!ch && (core().save.player.level || 1) < ch.ar; }
  /** 지금 단계 — 다 끝났거나 장이 잠겼으면 null */
  function step() { var ch = chapter(); return ch && !locked() ? ch.steps[sv().step] || null : null; }
  function done() { return sv().ch >= CHAPTERS.length; }
  function pos() { return core().save.player.pos; }
  function keyOf() { return 'sq:' + sv().ch + '_' + sv().step; }

  /* ── 나아가기 ─────────────────────────────────────────── */

  function toast(msg) { core().emit('toast', msg); }
  function sfx(n) { if (global.DG.audio) { try { global.DG.audio.play(n); } catch (e) { /* 소리는 없어도 된다 */ } } }
  function award(r) {
    var c = core(), TL = global.DG.talent, H = global.DG.hero, out = [];
    if (r.gold) { c.save.player.gold = (c.save.player.gold || 0) + r.gold; out.push('🪙 ' + r.gold); }
    if (TL && TL.mats) {
      var m = TL.mats();
      ['knot', 'guide', 'secret'].forEach(function (k) { if (r[k]) { m[k] = (m[k] || 0) + r[k]; out.push(TL.MATS[k].icon + ' ' + TL.MATS[k].name + ' ' + r[k]); } });
    }
    if (r.party && H && H.awardParty) { H.awardParty(r.party); out.push('부대 경험 ' + r.party); }
    return out.join(' · ');
  }
  /** 지금 단계를 끝낸다 — 장 끝이면 보상과 함께 다음 장으로 */
  function advance() {
    var s = sv(), ch = chapter(), H = global.DG.hero;
    if (!ch) { return false; }
    if (H && H.awardParty) { H.awardParty(STEP_EXP); }
    s.step += 1;
    if (s.step >= ch.steps.length) {
      var txt = award(ch.reward);
      s.ch += 1; s.step = 0;
      toast('📖 ' + ch.name + ' 끝 — ' + txt);
      core().log('📖 ' + ch.name + ' 끝 — ' + txt, 'good');
      sfx('reward');
    } else {
      var nx = ch.steps[s.step];
      toast('📖 ' + nx.text);
    }
    core().emit('story:step', { ch: s.ch, step: s.step });
    core().emit('changed');
    core().persist();
    return true;
  }

  /* ── 신호로 끝나는 단계 ───────────────────────────────── */

  function onGuard(e) { var st = step(), t = st && st.type === 'boss' ? targetOf(st) : null; if (t && e && e.region === t.rk) { advance(); } }
  function onClear(e) { var st = step(); if (st && st.type === 'kill' && e && e.camp === keyOf()) { advance(); } }
  function onElement(e) {
    var st = step();
    if (!st || st.type !== 'light' || !e) { return; }
    var t = targetOf(st);
    if (t && Math.hypot(e.x - t.x, e.y - t.y) <= (e.r || 3) + LIGHT_R()) { toast('🔥 옛 제단에 불이 붙었다 — 비문이 빛난다'); advance(); }
  }
  function onDomain(e) { var st = step(); if (st && st.type === 'domain' && e && e.kind === 'weekly') { advance(); } }

  /** 한 박자 — go 도착·boss 이미 쓰러짐·kill 무리 세우기·혼잣말 */
  var lastIdle = {};
  function check() {
    if (!on()) { return; }
    var st = step(), p = pos(), t;
    if (st && st.type === 'go') {
      t = targetOf(st);
      if (t && Math.hypot(p.x - t.x, p.y - t.y) <= t.r) { advance(); return; }
    } else if (st && st.type === 'boss') {
      t = targetOf(st);
      var FB = global.DG.fieldBoss;
      if (t && FB && FB.bloomAt && FB.bloomAt(t.rk) !== null) { advance(); return; }   // 이미 쓰러져 꽃을 기다린다
    } else if (st && st.type === 'kill') {
      t = targetOf(st);
      var F = FC(), S = F && F.state ? F.state() : null, key = keyOf();
      if (t && S && !S.camps[key] && Math.hypot(p.x - t.x, p.y - t.y) < KILL_NEAR) {
        F.spawnCamp(S, { key: key, x: t.x, y: t.y, tier: F.tierAt(t.x, t.y), kind: 'story',
          foes: st.kinds.map(function (k, i) { var a = i * 1.571; return { kind: k, dx: Math.cos(a) * 3, dy: Math.sin(a) * 3 }; }) });
        toast('⚔️ 먹구름 졸개가 나타났다');
      }
    }
    /* 지금 단계가 아닌 인물 곁 — 혼잣말 한 줄(45초에 한 번) */
    var now = Date.now();
    for (var i = 0; i < NPC_KEYS.length; i++) {
      var k = NPC_KEYS[i], np = npcPos(k);
      if (!np || (st && st.type === 'talk' && st.npc === k)) { continue; }
      if (Math.hypot(p.x - np.x, p.y - np.y) <= IDLE_R && (!lastIdle[k] || now - lastIdle[k] > IDLE_GAP)) {
        lastIdle[k] = now;
        toast('💬 ' + NPCS[k].name + ' — ' + NPCS[k].idle);
      }
    }
  }

  /* ── 대화 ─────────────────────────────────────────────── */

  var talk = null;          // { st, i } — 창이 열려 있으면
  function nearTalk() {
    var st = step();
    if (!st || st.type !== 'talk') { return null; }
    var np = npcPos(st.npc), p = pos();
    return np && Math.hypot(p.x - np.x, p.y - np.y) <= TALK_R() ? st : null;
  }
  function busy() {
    var D = global.DG;
    return !!((D.encounter && D.encounter.active) || (D.duel && D.duel.active) || (D.domain && D.domain.active && D.domain.active()) ||
      (document.body && document.body.classList.contains('sheet-open')));
  }
  /** 곁이면 대화를 연다 */
  function talkStart() {
    var st = nearTalk();
    if (!st || talk || busy()) { return false; }
    talk = { st: st, i: 0 };
    paintTalk();
    return true;
  }
  function talking() { return !!talk; }
  /** 다음 줄 — 고르는 줄이면 choice(0·1)로 넘긴다. 마지막 줄 뒤면 단계를 끝낸다 */
  function next(choice) {
    if (!talk) { return false; }
    var line = talk.st.lines[talk.i];
    if (line && line[0] === '?' && typeof choice !== 'number') { return false; }
    talk.i += 1;
    if (talk.i >= talk.st.lines.length) { talk = null; paintTalk(); advance(); return true; }
    paintTalk();
    return true;
  }

  /* ── 화면 ─────────────────────────────────────────────── */

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmtDist(d) { return d >= 1000 ? (d / 1000).toFixed(1) + 'km' : Math.round(d) + 'm'; }
  /** 추적 한 줄 글 — 순수(세이브·자리만 읽는다) */
  function trackText() {
    if (!on() || done()) { return ''; }
    var ch = chapter();
    if (locked()) { return '📖 ' + ch.name + ' — 여정 등급 ' + ch.ar + ' 에 열린다'; }
    var st = step(), t = targetOf(st), p = pos();
    return '📖 ' + ch.name + ' — ' + st.text + (t ? ' · ◆ ' + fmtDist(Math.hypot(p.x - t.x, p.y - t.y)) : '');
  }
  function el(id, cls) {
    var e = document.getElementById(id);
    if (!e && document.body) { e = document.createElement('div'); e.id = id; if (cls) { e.className = cls; } document.body.appendChild(e); }
    return e;
  }
  var lastTrack = '', lastBtn = '';
  function paintHud() {
    if (!document.body) { return; }
    var tr = el('story-track'), txt = trackText();
    if (txt !== lastTrack) { lastTrack = txt; tr.textContent = txt; tr.style.display = txt ? '' : 'none'; }
    var b = el('story-btn'), st = !talk && !busy() ? nearTalk() : null, bt = st ? '💬 ' + NPCS[st.npc].short + '와 이야기 (F)' : '';
    if (bt !== lastBtn) { lastBtn = bt; b.textContent = bt; b.style.display = bt ? '' : 'none'; }
  }
  function paintTalk() {
    var box = el('story-talk');
    if (!box) { return; }
    if (!talk) { box.classList.remove('show'); box.innerHTML = ''; return; }
    var line = talk.st.lines[talk.i], acts;
    if (line[0] === '?') {
      acts = line[1].map(function (a, i) { return '<button class="btn primary" data-st-pick="' + i + '">' + esc(a) + '</button>'; }).join('');
      box.innerHTML = '<div class="st-box"><b class="st-who">나</b><p class="st-line">……</p><div class="st-acts">' + acts + '</div></div>';
    } else {
      box.innerHTML = '<div class="st-box"><b class="st-who">' + esc(line[0]) + '</b><p class="st-line">' + esc(line[1]) + '</p>' +
        '<div class="st-acts"><small class="muted">' + (talk.i + 1) + '/' + talk.st.lines.length + '</small>' +
        '<button class="btn primary" data-st-next="1">' + (talk.i + 1 < talk.st.lines.length ? '다음 ▸' : '끝') + '</button></div></div>';
    }
    box.classList.add('show');
  }
  /** O 목록 — 장마다 끝남·지금(단계 ✓)·잠김 */
  function listHtml() {
    var s = sv(), out = '<div class="st-box"><b class="st-who">📖 이야기 임무</b>';
    for (var c = 0; c < CHAPTERS.length; c++) {
      var ch = CHAPTERS[c], state = c < s.ch ? '✅ 끝' : (c === s.ch ? ((core().save.player.level || 1) < ch.ar ? '🔒 여정 등급 ' + ch.ar : '▶ 진행 중') : '🔒 여정 등급 ' + ch.ar);
      out += '<div class="st-ch"><b>' + esc(ch.name) + '</b> <small>' + state + '</small>';
      if (c === s.ch && state === '▶ 진행 중') {
        for (var i = 0; i < ch.steps.length; i++) {
          out += '<small style="display:block" class="' + (i < s.step ? 'muted' : '') + '">' + (i < s.step ? '✓' : (i === s.step ? '◆' : '◇')) + ' ' + esc(ch.steps[i].text) + '</small>';
        }
      }
      out += '</div>';
    }
    return out + '<div class="st-acts"><button class="btn ghost" data-st-close="1">닫기 (O)</button></div></div>';
  }
  var listOpen = false;
  function toggleList(v) {
    var box = el('story-list');
    listOpen = typeof v === 'boolean' ? v : !listOpen;
    if (!box) { return; }
    box.innerHTML = listOpen ? listHtml() : '';
    box.classList.toggle('show', listOpen);
  }

  /* 3D — 목표 금빛 기둥 · 옛 제단(light 단계) */
  var fx = {}, clock = 0;
  function W3() { var w = global.DG.world3d; return w && w.active && w.active() ? w : null; }
  function dropFx(k) { var w = W3(); if (w && fx[k]) { w.removeFx(fx[k]); } delete fx[k]; }
  function paint3d(dt) {
    clock += dt || 0;
    var w = W3(), st = step(), t = st ? targetOf(st) : null, p = pos();
    if (!w || !t || Math.hypot(t.x - p.x, t.y - p.y) > 900) { dropFx('pillar'); dropFx('altar'); return; }
    var T3 = w.three();
    if (!T3) { return; }
    var gy = w.groundY ? w.groundY(t.x, t.y) : 0;
    if (!fx.pillar) {
      var g = new T3.Group();
      var mat = new T3.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.35, depthWrite: false, blending: T3.AdditiveBlending, fog: false });
      var cyl = new T3.Mesh(new T3.CylinderGeometry(0.9, 0.9, 60, 12, 1, true), mat);
      cyl.position.y = 30; g.add(cyl);
      w.addFx(g); fx.pillar = g;
    }
    fx.pillar.position.set(t.x, gy, t.y);
    fx.pillar.children[0].material.opacity = 0.28 + Math.sin(clock * 2.2) * 0.08;
    if (st.type === 'light') {
      if (!fx.altar) {
        var A = global.DG.asset3d, m = A && A.build ? A.build('lantern', { id: 'story_altar' }) : null, ag = new T3.Group();
        if (m) { m.scale.set(1.8, 1.8, 1.8); ag.add(m); }
        w.addFx(ag); fx.altar = ag;
      }
      fx.altar.position.set(t.x, gy, t.y);
    } else { dropFx('altar'); }
  }

  /** 지금 세울 이야기 인물 — folk.live 와 같은 모양 `{p, x, y, walking, phase, ang, dist}` */
  function live(p0, tms) {
    if (!on() || !p0) { return []; }
    var out = [], i;
    for (i = 0; i < NPC_KEYS.length; i++) {
      var n = NPCS[NPC_KEYS[i]], q = npcPos(NPC_KEYS[i]);
      if (!q) { continue; }
      var d = Math.hypot(q.x - p0.x, q.y - p0.y);
      if (d > 110) { continue; }
      var a = anchorOf(n.zone);
      out.push({ p: { id: n.id, name: n.name, color: n.color, rarity: 3, trait: 'virtue', story: NPC_KEYS[i] },
        x: q.x, y: q.y, walking: false, phase: 0, ang: Math.atan2(a.y - q.y, a.x - q.x), dist: d });
    }
    return out;
  }
  /** 미니맵 점 — 목표 하나(테두리에도) */
  function marker() {
    var st = step(), t = st ? targetOf(st) : null;
    return t ? { x: t.x, y: t.y, name: st.text } : null;
  }

  var acc = 0, bound = false;
  function tick(dt) {
    if (!on()) { return; }
    acc += dt || 0;
    if (acc > 0.5) { acc = 0; check(); }
    if (!global.DG_NO_DRAW) { paintHud(); paint3d(dt); }
  }
  function bind() {
    if (bound) { return; }
    bound = true;
    var c = core();
    c.on('field:guard', onGuard);
    c.on('field:clear', onClear);
    c.on('field:element', onElement);
    c.on('domain:clear', onDomain);
    if (!global.addEventListener || !document.body) { return; }
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target : null;
      if (!t) { return; }
      if (t.closest('#story-btn')) { talkStart(); }
      else if (t.closest('[data-st-next]')) { next(); }
      else if (t.closest('[data-st-pick]')) { next(+t.closest('[data-st-pick]').getAttribute('data-st-pick')); }
      else if (t.closest('[data-st-close]')) { toggleList(false); }
      else if (t.closest('#story-track')) { toggleList(); }
    });
    global.addEventListener('keydown', function (e) {
      var tag = e.target && e.target.tagName;
      if (!on() || e.repeat || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') { return; }
      var k = (e.key || '').toLowerCase();
      if (talk) {
        var line = talk.st.lines[talk.i];
        if (line[0] === '?') { if (k === '1' || k === '2') { e.preventDefault(); next(+k - 1); } return; }
        if (k === 'f' || k === ' ' || k === 'enter') { e.preventDefault(); next(); }
        return;
      }
      if (k === 'f' && nearTalk()) { e.preventDefault(); talkStart(); }
      else if (k === 'o') { toggleList(); }
      else if (k === 'escape' && listOpen) { toggleList(false); }
    });
  }
  function init() { if (on()) { sv(); } bind(); }

  global.DG = global.DG || {};
  global.DG.story = {
    NPCS: NPCS, CHAPTERS: CHAPTERS, STEP_EXP: STEP_EXP,
    on: on, anchorOf: anchorOf, npcPos: npcPos, targetOf: targetOf, trackText: trackText, listHtml: listHtml,
    state: sv, chapter: chapter, step: step, locked: locked, done: done, keyOf: keyOf,
    advance: advance, check: check, nearTalk: nearTalk, talkStart: talkStart, talking: talking, next: next,
    live: live, marker: marker, toggleList: toggleList, init: init, tick: tick,
    _resetForTest: function () { talk = null; lastIdle = {}; anchorMemo = {}; lastTrack = ''; lastBtn = ''; listOpen = false; }
  };
})(window);
