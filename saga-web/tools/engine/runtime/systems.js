/**
 * 사가 엔진 — 늘 켜지는 시스템(systems). sim.js 다음에 부른다. three 없이 돈다(node 진단).
 * saga-godot 의 판에 묶이지 않은 시스템을 데이터로 쓸 수 있게 옮겼다(원본 → 여기):
 *
 *   world     시간·날씨·계절    time_of_day.gd · weather.gd(3시간 슬롯 결정적, 계절 가중) · season.gd — 변수 hour·night·day·weather·season
 *   chest     보물 상자·석등    treasure_chest.gd(등급 넷 × 잠금 셋: 없음·무리 토벌·석등) — 한 번 열면 끝
 *   gather    채집              gatherable_builder.gd — F 로 줍고 시간이 지나면 다시 난다
 *   fishing   낚시              fishing_spot.gd — 움직이는 표시가 칸 안일 때 낚아챈다
 *   plot      밭                forest_planting.gd — 씨앗 심기 → 자라면 거두기
 *   shop      상점              vendor·story_merchant — 돈 변수로 산다
 *   choice    선택지(3택)       choice_prompt.gd — 고른 번호가 변수로
 *   perk      특성 3택          perks.gd(공·수·보 축 12종, 축마다 하나씩 뽑기)
 *   quest     퀘스트            quest_state.gd — 목표(변수 조건)를 채우면 보상·"퀘스트 완수" 이벤트
 *   codex     도감              codex_state.gd — 본 것에 도장, 갈래별 n/전체
 *   waypoint  거점 이동         beacon_tower.gd(봉수대) — 닿아서 켜고 M 으로 날아간다
 *   bond      관계 하트         forest 주민 하트 — 말 걸 때마다 오르고 5♥ 부터 다른 대사
 *   follow    동료              companion_follow.gd — 플레이어를 따라온다
 *   spawner   스포너·파도       field_spawner.gd · dungeon_horde_state.gd(난입 파도)
 *   level     레벨              party_state.gd — 경험치가 차면 오르고 공격·체력 보정
 *   duel      일기토            duel_rules.gd(3합 가위바위보)
 *   quiz      문답·설득         persuade_rules.gd · realm_quiz
 *   save      저장 행동         save_state.gd — 실제 기록은 play 쪽(localStorage)
 */
(function (root) {
  'use strict';
  var SIM = root.SagaSim || (typeof require === 'function' ? require('./sim.js') : null);
  if (!SIM) { return; }
  function num(v, d) { v = +v; return isFinite(v) ? v : d; }
  function dist2(a, b) { return Math.hypot(a[0] - b[0], a[2] - b[2]); }
  /* "글|변수|값" 한 줄 */
  function parseLine(l) { var p = String(l || '').split('|').map(function (x) { return x.trim(); }); return p; }

  /* ── 표(원본 수치 그대로) ─────────────────────────────────────────────── */
  var WEATHER = {
    clear: { name: '맑음', exp: 10, fog: 0.6 }, cloud: { name: '흐림', exp: 5, fog: 1.0 }, rain: { name: '비', exp: 0, fog: 1.6 },
    wind: { name: '바람', exp: 8, fog: 0.8 }, fog: { name: '안개', exp: 4, fog: 2.4 }, snow: { name: '눈', exp: 12, fog: 1.2 }
  };
  var W_ORDER = ['clear', 'cloud', 'rain', 'wind', 'fog', 'snow'];
  var SEASON = {
    spring: { name: '봄', wx: { clear: 1.2, cloud: 1.0, rain: 1.1, wind: 1.2, fog: 1.1, snow: 0.05 } },
    summer: { name: '여름', wx: { clear: 1.1, cloud: 1.1, rain: 1.9, wind: 0.8, fog: 0.7, snow: 0.0 } },
    autumn: { name: '가을', wx: { clear: 1.3, cloud: 1.0, rain: 0.7, wind: 1.3, fog: 1.4, snow: 0.1 } },
    winter: { name: '겨울', wx: { clear: 0.9, cloud: 1.2, rain: 0.2, wind: 1.1, fog: 0.9, snow: 2.6 } }
  };
  var S_ORDER = ['spring', 'summer', 'autumn', 'winter'];
  var CHEST = {
    common: { name: '평범한 상자', amount: 5, color: '#8c5c33' }, exquisite: { name: '정교한 상자', amount: 15, color: '#d6dde8' },
    precious: { name: '진귀한 상자', amount: 30, color: '#f5c74d' }, luxurious: { name: '화려한 상자', amount: 60, color: '#9a5ce0' }
  };
  var PERKS = [
    { id: 'gangyeok', name: '강격', axis: 'attack', mul: 0.08 }, { id: 'maenggong', name: '맹공', axis: 'attack', mul: 0.06 },
    { id: 'bunjeon', name: '분전', axis: 'attack', mul: 0.07 }, { id: 'pilsa', name: '필사', axis: 'attack', mul: 0.05 },
    { id: 'cheolbyeok', name: '철벽', axis: 'defense', mul: 0.08 }, { id: 'inne', name: '인내', axis: 'defense', mul: 0.06 },
    { id: 'bangbyeok', name: '방벽', axis: 'defense', mul: 0.07 }, { id: 'gutgeon', name: '굳건', axis: 'defense', mul: 0.05 },
    { id: 'hwallyeok', name: '활력', axis: 'support', mul: 0.08 }, { id: 'seongsil', name: '성실', axis: 'support', mul: 0.06 },
    { id: 'geunmyeon', name: '근면', axis: 'support', mul: 0.07 }, { id: 'chongmyeong', name: '총명', axis: 'support', mul: 0.05 }
  ];
  var AXIS = { attack: '공격', defense: '받는 피해', support: '경험치·스태미나' };
  var RPS = ['가위', '바위', '보'];

  /* ── 컴포넌트·행동·이벤트 등록(편집기 칸도 여기서 생긴다) ──────────────────── */
  SIM.addComp('water', { label: '물(헤엄)', hint: '이 상자 안에서 깊이가 1.1m 넘으면 헤엄친다(스태미나). 몸은 "닿음만" 으로.', f: {} });
  SIM.addComp('chest', { label: '보물 상자', hint: '다가가면 열린다. 잠금: camp 는 둘레 12m 적을 다 쓰러뜨리면, torch 는 둘레 석등을 20초 안에 다 밝히면 풀린다. 한 번 열면 다시 안 나온다.',
    f: { grade: ['sel:common|exquisite|precious|luxurious', 'common', '등급(평범·정교·진귀·화려)'], lock: ['sel:none|camp|torch', 'none', '잠금'],
         var: ['var', 'gold', '보상 변수'], amount: ['n', 0, '보상(0 이면 등급대로 5·15·30·60)'] } });
  SIM.addComp('torch', { label: '석등', hint: '원소 스킬·폭발(원신식) 또는 공격으로 밝힌다. 20초 동안 켜져 있다. 둘레 보물 상자 잠금(torch)을 푼다.',
    f: { element: ['sel:|불|물|얼음|번개|바람', '', '밝히는 원소(비우면 아무 공격)'], sec: ['n', 20, '켜져 있는 초'] } });
  SIM.addComp('gather', { label: '채집', hint: '가까이서 F 로 줍는다. 시간이 지나면 다시 난다.',
    f: { item: ['s', '약초', '이름'], var: ['var', 'herb', '더할 변수'], add: ['n', 1, '양'], regrow: ['n', 60, '다시 나는 초(0 이면 안 남)'] } });
  SIM.addComp('fishing', { label: '낚시터', hint: 'F 로 낚싯대를 던지고, 움직이는 표시가 초록 칸에 올 때 F·Space.',
    f: { var: ['var', 'fish', '잡으면 더할 변수'], fishes: ['lines', ['붕어', '잉어', '메기'], '나오는 물고기(도감 "물고기")'], zone: ['n', 0.22, '칸 넓이(0.1 어려움 ~ 0.4 쉬움)'] } });
  SIM.addComp('plot', { label: '밭', hint: '씨앗 변수가 있으면 F 로 심고, 다 자라면 F 로 거둔다.',
    f: { seed: ['var', 'seed', '씨앗 변수'], crop: ['var', 'crop', '거둔 것 변수'], grow: ['n', 30, '자라는 초'], yield: ['n', 2, '거두는 양'] } });
  SIM.addComp('shop', { label: '상점', hint: '가까이서 F. 줄마다 "이름|값|변수|양".',
    f: { name: ['s', '상점', '이름'], currency: ['var', 'gold', '돈 변수'], items: ['lines', ['포션|10|potion|1', '씨앗|3|seed|1'], '물건'] } });
  SIM.addComp('codex', { label: '도감', hint: '플레이어가 5m 안에 오면 도감에 오른다. 같은 이름은 하나로 센다. 실행 중 B 로 본다.',
    f: { book: ['s', '생물', '갈래'], name: ['s', '', '도감 이름(비우면 개체 이름)'] } });
  SIM.addComp('waypoint', { label: '거점(순간 이동)', hint: '닿으면 켜진다. 실행 중 M 으로 켜 둔 거점 어디로든 날아간다.', f: { name: ['s', '', '거점 이름(비우면 개체 이름)'] } });
  SIM.addComp('bond', { label: '관계 하트', hint: '대화 컴포넌트와 같이 쓴다. 말 걸 때(하루 한 번) 하트가 오르고, 5♥ 부터 아래 대사로 바뀐다.',
    f: { var: ['var', '', '하트 변수(비우면 heart_<id>)'], max: ['n', 10, '최대'], high: ['lines', ['요즘 네 덕에 마을이 밝아졌어.'], '5♥ 이상 대사'] } });
  SIM.addComp('follow', { label: '동료(따라오기)', hint: '플레이어를 따라온다. 너무 멀어지면 곁으로 온다.', f: { dist: ['n', 2.2, '떨어지는 거리'], speed: ['n', 6.5, '빠르기'] } });
  SIM.addComp('spawner', { label: '스포너(파도)', hint: '원본 개체("처음엔 없음")를 둘레에 만들어 낸다. 파도를 켜면 다 쓰러뜨릴 때마다 더 많이(6+2×파도) 나온다 — 변수 wave.',
    f: { from: ['s', '', '원본 개체 id'], every: ['n', 4, '몇 초마다'], max: ['n', 4, '동시에 최대'], radius: ['n', 6, '둘레(m)'], total: ['n', 0, '모두 합쳐(0 이면 끝없이)'], wave: ['b', false, '파도(난입) 방식'] } });

  SIM.addDo('choice', { label: '선택지(3택)', f: { title: ['s', '어떻게 할까?', '물음'], options: ['lines', ['받는다|gold|10', '거절한다|exp|5'], '줄마다 "글|변수|더할 값"(변수 비워도 됨)'], var: ['var', 'choice', '고른 번호를 담을 변수'] } });
  SIM.addDo('perk', { label: '특성 3택', f: { title: ['s', '특성을 하나 고른다', '제목'] } });
  SIM.addDo('quest', { label: '퀘스트', f: { id: ['s', '', '퀘스트 id(프로젝트 설정)'], op: ['sel:start|done|fail', 'start', '시작·완수·실패'] } });
  SIM.addDo('duel', { label: '일기토(가위바위보 3합)', f: { name: ['s', '상대', '상대 이름'], var: ['var', 'duel', '결과 변수(1 이김·0 비김·-1 짐)'] } });
  SIM.addDo('quiz', { label: '문답·설득', f: { question: ['s', '물음', '물음'], answers: ['lines', ['첫째', '둘째', '셋째'], '답'], correct: ['n', 1, '정답 번호'], var: ['var', 'quiz', '결과 변수(1 맞음·0 틀림)'] } });
  SIM.addDo('save', { label: '저장하기', f: {} });
  SIM.addDo('codex', { label: '도감에 올리기', f: { book: ['s', '생물', '갈래'], name: ['s', '', '이름'] } });
  SIM.addWhen('questDone', { label: '퀘스트를 완수했을 때', f: { id: ['s', '', '퀘스트 id'] } });
  SIM.addWhen('hour', { label: '시각이 되었을 때', f: { hour: ['n', 21, '시(0~23)'] } });
  SIM.addWhen('levelUp', { label: '레벨이 올랐을 때', f: {} });

  /* ════════════════════════════════════════════════════════════════════════ */
  SIM.addSystem('world', function (K, P) {
    var S = K.S, W = P.world || {};
    var lastHour = null;
    function seasonOf(day) {
      if (W.season && W.season !== 'auto') { return W.season; }
      if (W.clock === 'real') { var m = new Date().getMonth() + 1; return m >= 3 && m <= 5 ? 'spring' : m <= 8 && m >= 6 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter'; }
      return S_ORDER[Math.floor(day / Math.max(1, num(W.seasonDays, 7))) % 4];
    }
    /* 3시간 슬롯마다 결정적(같은 슬롯 = 같은 날씨) */
    function weatherOf(slot, season) {
      if (W.weather && W.weather !== 'auto') { return W.weather; }
      var h = Math.imul((slot + 1) ^ 0x9e3779b9, 2654435761) >>> 0;
      h = (h ^ (h >>> 15)) >>> 0;
      var r = (h % 10000) / 10000, wx = SEASON[season].wx, tot = 0, k;
      for (k = 0; k < W_ORDER.length; k++) { tot += wx[W_ORDER[k]]; }
      var acc = 0;
      for (k = 0; k < W_ORDER.length; k++) { acc += wx[W_ORDER[k]] / tot; if (r < acc) { return W_ORDER[k]; } }
      return 'clear';
    }
    function tick() {
      if (!W.clock || W.clock === 'off') { S.world = null; return; }
      var hours;
      if (W.clock === 'real') { var d = new Date(); hours = d.getHours() + d.getMinutes() / 60 + Math.floor(d.getTime() / 864e5) * 24; } else {
        hours = num(W.start, 9) + S.t / (Math.max(0.1, num(W.dayMin, 24)) * 60) * 24;
      }
      var day = Math.floor(hours / 24), hour = hours - day * 24;
      var season = seasonOf(day), weather = weatherOf(Math.floor(hours / 3), season);
      S.world = { hour: hour, day: day, season: season, weather: weather, night: hour >= 21 || hour < 4,
                  label: SEASON[season].name + ' ' + (day + 1) + '일 ' + Math.floor(hour) + '시 · ' + WEATHER[weather].name };
      S.vars.hour = Math.floor(hour); S.vars.day = day + 1; S.vars.night = S.world.night ? 1 : 0;
      S.vars.weather = weather; S.vars.season = season;
      /* 날씨가 사건 경험치를 기울인다(weather.gd exp_pct) */
      S.weatherExp = 1 + WEATHER[weather].exp / 100;
      var hi = Math.floor(hour);
      if (lastHour !== null && hi !== lastHour) { K.fireWhen('hour', function (w) { return num(w.hour, -1) === hi; }); }
      lastHour = hi;
    }
    return { reset: function () { lastHour = null; tick(); }, enter: tick, step: function () { tick(); return false; } };
  });

  /* ════════════════════════════════════════════════════════════════════════ */
  SIM.addSystem('chest', function (K) {
    var S = K.S;
    function key(e) { return 'chest:' + S.sceneId + ':' + e.id; }
    function foesNear(e, r) {
      return S.ents.some(function (o) { return o.alive && !o.hidden && (o.comps.foe || o.comps.health) && dist2(o.p, e.p) < r; });
    }
    function torchesNear(e) { return S.ents.filter(function (o) { return o.alive && o.comps.torch && dist2(o.p, e.p) < 12; }); }
    function locked(e) {
      var c = e.comps.chest;
      if (c.lock === 'camp') { return foesNear(e, 12); }
      if (c.lock === 'torch') { var t = torchesNear(e); return !t.length || t.some(function (o) { return !(o.lit > 0); }); }
      return false;
    }
    function light(o, el) {
      var need = o.comps.torch.element;
      if (need && el !== need) { return; }
      if (!(o.lit > 0)) { K.fx({ type: 'sound', name: 'door' }); K.fx({ type: 'burst', at: o.p.slice(), r: 1.2, color: '#ffb84d' }); }
      o.lit = num(o.comps.torch.sec, 20);
    }
    /* 원소가 터진 자리(combat.js 가 알린다) · 공격 자리 */
    K.on('element', function (d) { S.ents.forEach(function (o) { if (o.alive && o.comps.torch && dist2(o.p, d.at) < d.r + 0.8) { light(o, d.el); } }); });
    K.on('swing', function (d) { S.ents.forEach(function (o) { if (o.alive && o.comps.torch && !o.comps.torch.element && dist2(o.p, d.at) < 2.6) { light(o, ''); } }); });
    function enter() {
      S.ents.forEach(function (e) { if (e.comps.chest && S.flags[key(e)]) { e.alive = false; } });
    }
    function step(dt) {
      var pl = S.player;
      S.ents.forEach(function (e) {
        if (!e.alive) { return; }
        if (e.comps.torch && e.lit > 0) { e.lit -= dt; }
        if (!e.comps.chest) { return; }
        e.locked = locked(e);
        if (!pl || e.locked || dist2(e.p, pl.p) > 1.9 || Math.abs(e.p[1] - pl.p[1]) > 2) { return; }
        var c = e.comps.chest, g = CHEST[c.grade] || CHEST.common;
        var amt = num(c.amount, 0) || g.amount;
        K.addVar(c.var || 'gold', Math.round(amt * (S.mods.gold || 1)));
        S.flags[key(e)] = 1;
        K.toast(g.name + '을 열었다 — ' + (c.var || 'gold') + ' +' + amt, 3);
        K.fx({ type: 'sound', name: 'win' }); K.fx({ type: 'burst', at: e.p.slice(), r: 1.6, color: g.color });
        K.destroy(e);
      });
      return false;
    }
    return { enter: enter, step: step };
  });

  /* ════════════════════════════════════════════════════════════════════════ */
  SIM.addSystem('gather', function (K) {
    var S = K.S;
    function act(pl, reach) {
      var g = K.nearest(pl, function (o) { return !!o.comps.gather || !!o.comps.plot || !!o.comps.fishing || !!o.comps.shop; }, reach);
      if (!g) { return false; }
      if (g.comps.gather) {
        var c = g.comps.gather;
        K.addVar(c.var || 'herb', num(c.add, 1));
        K.toast(c.item + ' +' + num(c.add, 1), 1.6);
        K.fx({ type: 'sound', name: 'coin' }); K.fx({ type: 'poof', at: g.p.slice(), small: true });
        K.emit('codex', { book: '채집', name: c.item });
        if (num(c.regrow, 60) > 0) { g.hidden = true; g.regrowT = num(c.regrow, 60); } else { K.destroy(g); }
        return true;
      }
      if (g.comps.plot) { return plot(g); }
      if (g.comps.fishing) { fish(g); return true; }
      if (g.comps.shop) { shop(g); return true; }
      return false;
    }
    function plotKey(e) { return 'plot:' + S.sceneId + ':' + e.id; }
    function plot(e) {
      var c = e.comps.plot, k = plotKey(e), st = S.flags[k];
      if (!st) {
        if (num(S.vars[c.seed], 0) <= 0) { K.toast('씨앗(' + c.seed + ')이 없다'); return true; }
        K.addVar(c.seed, -1);
        S.flags[k] = { at: S.t };
        K.toast('심었다 — ' + num(c.grow, 30) + '초 뒤에 거둔다'); K.fx({ type: 'sound', name: 'blip' });
        return true;
      }
      if (S.t - st.at < num(c.grow, 30)) { K.toast('아직 자라는 중 (' + Math.ceil(num(c.grow, 30) - (S.t - st.at)) + '초)'); return true; }
      K.addVar(c.crop, num(c.yield, 2));
      delete S.flags[k];
      K.toast('거뒀다 — ' + c.crop + ' +' + num(c.yield, 2)); K.fx({ type: 'sound', name: 'coin' });
      K.emit('codex', { book: '작물', name: c.crop });
      return true;
    }
    function fish(e) {
      var c = e.comps.fishing, zone = Math.max(0.06, Math.min(0.6, num(c.zone, 0.22)));
      var lo = 0.15 + K.rng() * (0.85 - zone - 0.15);
      var G = { pos: 0, dir: 1, speed: 0.9 + K.rng() * 0.6, zone: [lo, lo + zone], t: 0 };
      K.openMenu({ title: '낚시 — 초록 칸에서 F·Space', kind: 'fish', items: [{ label: '낚아채기' }], game: G,
        tick: function (dt) { G.t += dt; G.pos += G.dir * G.speed * dt; if (G.pos > 1) { G.pos = 1; G.dir = -1; } if (G.pos < 0) { G.pos = 0; G.dir = 1; } },
        onPick: function () {
          S.menu = null;
          if (G.pos >= G.zone[0] && G.pos <= G.zone[1]) {
            var list = (c.fishes || ['물고기']).filter(Boolean), name = list[Math.floor(K.rng() * list.length)] || '물고기';
            K.addVar(c.var || 'fish', 1);
            K.toast(name + '을(를) 낚았다!', 2.2); K.fx({ type: 'sound', name: 'win' });
            K.emit('codex', { book: '물고기', name: name });
          } else { K.toast('놓쳤다…', 1.6); K.fx({ type: 'sound', name: 'lose' }); }
        } });
      K.fx({ type: 'sound', name: 'blip' });
    }
    function shop(e) {
      var c = e.comps.shop, cur = c.currency || 'gold';
      function items() {
        return (c.items || []).map(parseLine).filter(function (p) { return p[0]; }).map(function (p) {
          var price = num(p[1], 0);
          return { label: p[0], sub: price + ' ' + cur, price: price, var: p[2] || p[0], add: num(p[3], 1), disabled: num(S.vars[cur], 0) < price };
        });
      }
      K.openMenu({ title: (c.name || e.name) + ' — 가진 ' + cur + ' ' + num(S.vars[cur], 0), kind: 'shop', items: items(),
        onPick: function (it, M) {
          K.addVar(cur, -it.price); K.addVar(it.var, it.add);
          K.fx({ type: 'sound', name: 'coin' });
          M.items = items(); M.title = (c.name || e.name) + ' — 가진 ' + cur + ' ' + num(S.vars[cur], 0);
        } });
    }
    function step(dt) {
      S.ents.forEach(function (e) {
        if (e.regrowT > 0) { e.regrowT -= dt; if (e.regrowT <= 0) { e.hidden = false; } }
        if (e.comps.plot) { var st = S.flags['plot:' + S.sceneId + ':' + e.id]; e.plot = !st ? 'empty' : (S.t - st.at >= num(e.comps.plot.grow, 30) ? 'ripe' : 'growing'); }
      });
      return false;
    }
    return { act: act, step: step };
  });

  /* ════════════════════════════════════════════════════════════════════════ */
  SIM.addSystem('dialogs', function (K) {
    var S = K.S;
    /* 선택지 — 고를 때까지 이벤트가 기다린다 */
    K.onDo('choice', function (a, job) {
      var opts = (a.options || []).map(parseLine).filter(function (p) { return p[0]; });
      if (!opts.length) { return false; }
      K.openMenu({ title: K.interp(a.title || ''), kind: 'choice', cancel: false, items: opts.map(function (p, i) { return { label: K.interp(p[0]), i: i, var: p[1], add: num(p[2], 0) }; }),
        onPick: function (it) {
          S.menu = null;
          if (a.var) { S.vars[a.var] = it.i + 1; }
          if (it.var) { K.addVar(it.var, it.add); }
          K.fx({ type: 'sound', name: 'blip' });
        } });
      job.dlg = true;
      return true;
    });
    /* 특성 3택 — 축마다 하나씩, 이미 가진 것은 빼고 */
    K.onDo('perk', function (a, job) {
      var pool = {};
      PERKS.forEach(function (p) { if (!S.flags['perk:' + p.id]) { (pool[p.axis] = pool[p.axis] || []).push(p); } });
      var pick = Object.keys(pool).map(function (ax) { var l = pool[ax]; return l[Math.floor(K.rng() * l.length)]; });
      if (!pick.length) { K.toast('더 고를 특성이 없다'); return false; }
      K.openMenu({ title: K.interp(a.title || '특성을 하나 고른다'), kind: 'perk', cancel: false,
        items: pick.map(function (p) { return { label: p.name, sub: AXIS[p.axis] + ' +' + Math.round(p.mul * 100) + '%', perk: p }; }),
        onPick: function (it) {
          S.menu = null;
          var p = it.perk;
          S.flags['perk:' + p.id] = 1;
          if (p.axis === 'attack') { S.mods.atk += p.mul; } else if (p.axis === 'defense') { S.mods.dmgTaken *= (1 - p.mul); } else { S.mods.exp += p.mul; S.mods.stamina += Math.round(p.mul * 100); }
          K.fx({ type: 'pop', text: '특성: ' + p.name, color: '#ffd166' }); K.fx({ type: 'sound', name: 'coin' });
        } });
      job.dlg = true;
      return true;
    });
    /* 일기토 — 3합 가위바위보(duel_rules.gd). 이긴 합이 많으면 이긴다 */
    K.onDo('duel', function (a, job) {
      var G = { round: 0, me: 0, you: 0, log: [] };
      var M = K.openMenu({ title: K.interp(a.name || '상대') + '와 일기토 — 1합', kind: 'duel', cancel: false, game: G,
        items: RPS.map(function (r, i) { return { label: r, i: i }; }),
        onPick: function (it) {
          var y = Math.floor(K.rng() * 3), res = (it.i - y + 3) % 3;
          if (res === 1) { G.me++; } else if (res === 2) { G.you++; }
          G.log.push(RPS[it.i] + ' 대 ' + RPS[y] + ' — ' + (res === 0 ? '비김' : res === 1 ? '이김' : '짐'));
          K.fx({ type: 'sound', name: res === 1 ? 'hit' : 'blip' });
          G.round++;
          if (G.round >= 3) {
            S.menu = null;
            var r = G.me > G.you ? 1 : G.me < G.you ? -1 : 0;
            if (a.var) { S.vars[a.var] = r; }
            K.toast('일기토 ' + (r > 0 ? '승리!' : r < 0 ? '패배…' : '무승부') + ' (' + G.me + ':' + G.you + ')', 3);
            K.fx({ type: 'sound', name: r > 0 ? 'win' : r < 0 ? 'lose' : 'blip' });
          } else { M.title = K.interp(a.name || '상대') + '와 일기토 — ' + (G.round + 1) + '합 (' + G.me + ':' + G.you + ')'; }
        } });
      job.dlg = true;
      return true;
    });
    K.onDo('quiz', function (a, job) {
      var ans = (a.answers || []).filter(function (x) { return x !== ''; });
      K.openMenu({ title: K.interp(a.question || ''), kind: 'quiz', cancel: false, items: ans.map(function (t, i) { return { label: K.interp(t), i: i }; }),
        onPick: function (it) {
          S.menu = null;
          var ok = it.i + 1 === num(a.correct, 1);
          if (a.var) { S.vars[a.var] = ok ? 1 : 0; }
          K.toast(ok ? '정답!' : '틀렸다…', 2); K.fx({ type: 'sound', name: ok ? 'win' : 'lose' });
        } });
      job.dlg = true;
      return true;
    });
    K.onDo('save', function () { K.fx({ type: 'save' }); return false; });
    return {};
  });

  /* ════════════════════════════════════════════════════════════════════════ */
  SIM.addSystem('quest', function (K, P) {
    var S = K.S, Q = P.quests || [], st = {};
    function q(id) { return Q.filter(function (x) { return x.id === id; })[0]; }
    function goalOk(x) {
      if (!x.var) { return false; }
      var cur = S.vars[x.var]; cur = cur == null ? 0 : cur;
      var v = typeof cur === 'number' ? num(x.value, 0) : String(x.value);
      return (SIM.OPS[x.op || '>='] || SIM.OPS['>='])(cur, v);
    }
    function reward(x) {
      (x.reward || []).map(parseLine).forEach(function (p) {
        if (!p[0]) { return; }
        var amt = num(p[1], 0);
        if (p[0] === 'exp') { amt = Math.round(amt * (S.mods.exp || 1) * (S.weatherExp || 1)); }
        K.addVar(p[0], amt);
      });
    }
    function done(id) {
      var x = q(id);
      if (!x || st[id] === 'done') { return; }
      st[id] = 'done';
      reward(x);
      K.fx({ type: 'pop', text: '퀘스트 완수: ' + x.name, color: '#ffd166' }); K.fx({ type: 'sound', name: 'win' });
      K.fireWhen('questDone', function (w) { return !w.id || w.id === id; });
    }
    function start(id) {
      var x = q(id);
      if (!x || st[id]) { return; }
      st[id] = 'active';
      K.toast('새 퀘스트: ' + x.name, 3); K.fx({ type: 'sound', name: 'door' });
    }
    K.onDo('quest', function (a) {
      if (a.op === 'done') { if (!st[a.id]) { st[a.id] = 'active'; } done(a.id); } else if (a.op === 'fail') { st[a.id] = 'fail'; } else { start(a.id); }
      return false;
    });
    function reset() { st = {}; Q.forEach(function (x) { if (x.auto) { st[x.id] = 'active'; } }); S.quests = st; }
    function step() {
      Q.forEach(function (x) { if (st[x.id] === 'active' && goalOk(x)) { done(x.id); } });
      S.quests = st;
      /* HUD 용 — 진행 중인 것만 */
      S.questLog = Q.filter(function (x) { return st[x.id] === 'active'; }).map(function (x) {
        return { name: x.name, desc: K.interp(x.desc || ''), prog: x.var ? (S.vars[x.var] == null ? 0 : S.vars[x.var]) + '/' + x.value : '' };
      });
      return false;
    }
    return { reset: reset, step: step, save: function () { return st; }, load: function (o) { st = Object.assign({}, o); S.quests = st; }, state: function () { return st; } };
  });

  /* ════════════════════════════════════════════════════════════════════════ */
  SIM.addSystem('codex', function (K, P) {
    var S = K.S, book = {};
    /* 갈래별 전체 — 프로젝트 모든 장면의 도감 컴포넌트(같은 이름은 하나) + 낚시 물고기 목록 */
    var TOTAL = {};
    (P.scenes || []).forEach(function (s) {
      (s.entities || []).forEach(function (e) {
        var c = e.comps || {};
        if (c.codex) { var b = c.codex.book || '생물'; (TOTAL[b] = TOTAL[b] || {})[c.codex.name || e.name || e.id] = 1; }
        if (c.fishing) { (c.fishing.fishes || []).forEach(function (f) { if (f) { (TOTAL['물고기'] = TOTAL['물고기'] || {})[f] = 1; } }); }
        if (c.gather) { (TOTAL['채집'] = TOTAL['채집'] || {})[c.gather.item] = 1; }
      });
    });
    function discover(b, name) {
      if (!name) { return; }
      book[b] = book[b] || {};
      if (book[b][name]) { return; }
      book[b][name] = 1;
      var all = TOTAL[b] ? Object.keys(TOTAL[b]).length : 0, have = Object.keys(book[b]).length;
      K.toast('도감 등록 — ' + b + ': ' + name + (all ? ' (' + have + '/' + all + ')' : ''), 2.2);
      K.fx({ type: 'sound', name: 'coin' });
      if (all && have >= all) { K.fx({ type: 'pop', text: '도감 "' + b + '" 완성!', color: '#ffd166' }); }
    }
    K.on('codex', function (d) { discover(d.book, d.name); });
    K.onDo('codex', function (a, job) { discover(a.book || '생물', K.interp(a.name || (job.ctx.self && job.ctx.self.name) || '')); return false; });
    function step() {
      var pl = S.player;
      if (!pl || S.frame % 10) { return false; }
      S.ents.forEach(function (e) {
        if (!e.alive || e.hidden || !e.comps.codex || dist2(e.p, pl.p) > 5) { return; }
        discover(e.comps.codex.book || '생물', e.comps.codex.name || e.name);
      });
      return false;
    }
    function open() {
      var books = Object.keys(TOTAL).concat(Object.keys(book)).filter(function (b, i, a) { return a.indexOf(b) === i; });
      if (!books.length) { K.toast('도감에 오를 것이 없다'); return; }
      K.openMenu({ title: '도감', kind: 'codex', items: books.map(function (b) {
        var all = TOTAL[b] ? Object.keys(TOTAL[b]).length : 0, have = book[b] ? Object.keys(book[b]).length : 0;
        return { label: b, sub: have + '/' + (all || '?'), b: b };
      }), onPick: function (it) {
        var names = Object.keys(Object.assign({}, TOTAL[it.b] || {}, book[it.b] || {}));
        K.openMenu({ title: '도감 — ' + it.b, kind: 'codex-page', items: names.map(function (n) { return { label: book[it.b] && book[it.b][n] ? n : '???', disabled: true }; }).concat([{ label: '← 닫기' }]),
          onPick: function () { S.menu = null; } });
      } });
    }
    return { reset: function () { book = {}; S.codex = book; }, step: step, open: open, save: function () { return book; }, load: function (o) { book = o || {}; S.codex = book; }, totals: function () { return TOTAL; } };
  });

  /* ════════════════════════════════════════════════════════════════════════ */
  SIM.addSystem('waypoint', function (K, P) {
    var S = K.S;
    function key(scene, id) { return 'wp:' + scene + ':' + id; }
    function step() {
      var pl = S.player;
      if (!pl) { return false; }
      S.ents.forEach(function (e) {
        if (!e.alive || !e.comps.waypoint) { return; }
        var k = key(S.sceneId, e.id);
        e.lit = !!S.flags[k];
        if (!e.lit && dist2(e.p, pl.p) < 2 && Math.abs(e.p[1] - pl.p[1]) < 2.5) {
          S.flags[k] = 1; e.lit = true;
          K.toast('거점 활성: ' + (e.comps.waypoint.name || e.name) + ' — M 으로 날아갈 수 있다', 3);
          K.fx({ type: 'sound', name: 'win' }); K.fx({ type: 'burst', at: e.p.slice(), r: 2, color: '#7bdff2' });
        }
      });
      return false;
    }
    function open() {
      var list = [];
      (P.scenes || []).forEach(function (s) {
        (s.entities || []).forEach(function (e) {
          if (e.comps && e.comps.waypoint && S.flags[key(s.id, e.id)]) { list.push({ label: e.comps.waypoint.name || e.name, sub: s.name || s.id, scene: s.id, id: e.id }); }
        });
      });
      if (!list.length) { K.toast('켜 둔 거점이 없다(거점에 닿으면 켜진다)'); return; }
      K.openMenu({ title: '거점 이동', kind: 'waypoint', items: list, onPick: function (it) {
        S.menu = null;
        if (it.scene !== S.sceneId) { K.enterScene(it.scene, it.id); } else {
          var t = S.ents.filter(function (e) { return e.id === it.id; })[0];
          if (t && S.player) { S.player.p = [t.p[0] + 1.2, t.p[1], t.p[2]]; S.player.v = [0, 0, 0]; }
        }
        K.fx({ type: 'sound', name: 'door' });
      } });
    }
    return { step: step, open: open };
  });

  /* ════════════════════════════════════════════════════════════════════════ */
  SIM.addSystem('people', function (K) {
    var S = K.S;
    /* 관계 하트 — 대화보다 먼저 가로챈다 */
    function act(pl, reach) {
      var npc = K.nearest(pl, function (o) { return !!o.comps.bond && !!o.comps.talk; }, reach);
      if (!npc) { return false; }
      var b = npc.comps.bond, v = b.var || ('heart_' + npc.id.split('~')[0]);
      var day = S.vars.day != null ? S.vars.day : Math.floor(S.t / 120);
      var fk = 'bond:' + v + ':' + day, lines;
      if (!S.flags[fk]) {
        S.flags[fk] = 1;
        var nv = Math.min(num(b.max, 10), num(S.vars[v], 0) + 1);
        if (nv > num(S.vars[v], 0)) { S.vars[v] = nv; K.fx({ type: 'pop', text: (npc.comps.talk.name || npc.name) + ' ♥' + nv, color: '#ff8fab' }); }
      }
      lines = num(S.vars[v], 0) >= 5 && (b.high || []).filter(Boolean).length ? b.high : npc.comps.talk.lines;
      K.say(npc.comps.talk.name || npc.name, (lines || []).filter(function (l) { return l !== ''; }));
      return true;
    }
    function step(dt) {
      var pl = S.player;
      S.ents.forEach(function (e) {
        if (!e.alive || !e.comps.follow || !pl) { return; }
        var f = e.comps.follow, d = dist2(e.p, pl.p), want = num(f.dist, 2.2);
        if (d > 25) { e.p = [pl.p[0] - 1, pl.p[1], pl.p[2] - 1]; e.v = [0, 0, 0]; return; }
        var dx = pl.p[0] - e.p[0], dz = pl.p[2] - e.p[2];
        var sp = d > want ? Math.min(num(f.speed, 6.5), (d - want) * 3) : 0;
        if (e.body.type === 'dynamic') { e.v[0] = d > 0.01 ? dx / d * sp : 0; e.v[2] = d > 0.01 ? dz / d * sp : 0; } else { e.p[0] += d > 0.01 ? dx / d * sp * dt : 0; e.p[2] += d > 0.01 ? dz / d * sp * dt : 0; e.spd = sp; }
        if (sp > 0.1) { e.r[1] = Math.atan2(dx, dz) * 180 / Math.PI; }
      });
      return false;
    }
    return { act: act, step: step };
  });

  /* ════════════════════════════════════════════════════════════════════════ */
  SIM.addSystem('spawner', function (K) {
    var S = K.S;
    function alive(e) { return S.ents.filter(function (o) { return o.alive && o.spawnedBy === e; }).length; }
    function enter() { S.ents.forEach(function (e) { if (e.comps.spawner) { e.spT = 0.5; e.spMade = 0; e.wave = 0; e.waveLeft = 0; } }); }
    function one(e) {
      var c = e.comps.spawner, a = K.rng() * Math.PI * 2, r = K.rng() * num(c.radius, 6);
      var src = (S.scene.entities || []).filter(function (d) { return d.id === c.from; })[0];
      if (!src) { return; }
      var o = K.spawnDef(src, [e.p[0] + Math.cos(a) * r, e.p[1], e.p[2] + Math.sin(a) * r]);
      o.def.off = false; o.spawnedBy = e;
      e.spMade++;
      K.fx({ type: 'poof', at: o.p.slice(), small: true });
    }
    function step(dt) {
      S.ents.forEach(function (e) {
        if (!e.alive || !e.comps.spawner || e.hidden) { return; }
        var c = e.comps.spawner;
        if (c.wave) {
          if (e.waveLeft <= 0 && alive(e) === 0) {
            e.wave++; e.waveLeft = 6 + 2 * (e.wave - 1);
            S.vars.wave = e.wave;
            K.fx({ type: 'pop', text: '파도 ' + e.wave, color: '#ff6b6b' }); K.fx({ type: 'sound', name: 'door' });
          }
          e.spT -= dt;
          if (e.waveLeft > 0 && e.spT <= 0 && alive(e) < Math.max(num(c.max, 4), 1)) { one(e); e.waveLeft--; e.spT = Math.max(0.2, num(c.every, 4) / 3); }
          return;
        }
        if (num(c.total, 0) > 0 && e.spMade >= num(c.total, 0)) { return; }
        e.spT -= dt;
        if (e.spT <= 0) { e.spT = Math.max(0.2, num(c.every, 4)); if (alive(e) < num(c.max, 4)) { one(e); } }
      });
      return false;
    }
    return { enter: enter, step: step };
  });

  /* ════════════════════════════════════════════════════════════════════════ */
  SIM.addSystem('level', function (K, P) {
    var S = K.S, L = P.level;
    function need(lv) { return Math.round(num(L.base, 30) * lv); }
    function step() {
      if (!L || !L.expVar) { return false; }
      var lvVar = L.lvVar || 'lv';
      if (S.vars[lvVar] == null) { S.vars[lvVar] = 1; }
      var guard = 0;
      while (num(S.vars[L.expVar], 0) >= need(S.vars[lvVar]) && guard++ < 20) {
        S.vars[L.expVar] -= need(S.vars[lvVar]);
        S.vars[lvVar]++;
        S.mods.atk += num(L.atk, 0.1);
        if (L.hpVar) { K.addVar(L.hpVar, num(L.hp, 1)); }
        K.fx({ type: 'pop', text: '레벨 ' + S.vars[lvVar] + '!', color: '#ffd166' }); K.fx({ type: 'sound', name: 'win' });
        K.fireWhen('levelUp');
      }
      return false;
    }
    return { step: step };
  });

  var API = { WEATHER: WEATHER, SEASON: SEASON, CHEST: CHEST, PERKS: PERKS };
  root.SagaSystems = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
})(typeof window !== 'undefined' ? window : globalThis);
