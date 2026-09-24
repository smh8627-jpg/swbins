/**
 * 사가 엔진 — 게임 설명서(글)로 게임 짓기. API·네트워크 없이 규칙만으로 project.json 을 만든다.
 *
 *   제목: 불의 동굴
 *   전투: 젤다식            (간단 · 원신식 · 젤다식 · 파판식)
 *   시점: 3인칭             (1인칭 · 3인칭 · 쿼터뷰 · 옆 · 고정)
 *   장면: 들녘 마을
 *     나무 12
 *     주민: 어르신 "어서 오게" "동굴의 두목을 부탁하네"
 *     적: 들개 ×3 (체력 3)
 *     문 → 동굴
 *   장면: 동굴
 *     보스: 두목 (체력 24)
 *   목표: 두목 쓰러뜨리기
 *
 * 자리는 씨앗(mulberry32) 흩기라 같은 글이면 늘 같은 판이 나온다. 편집기(브라우저)와 서버·시험(node) 둘 다 쓴다.
 * 표시 글자(이름·대사) 실명 가드는 서버 저장 때 걸린다 — 여기선 글을 그대로 옮긴다.
 */
(function (root) {
  'use strict';
  var SIM = root.SagaSim || (typeof require === 'function' ? require('../runtime/sim.js') : null);

  var CHAR = 'lib:saga-go/models/people/quaternius_rpg/';
  var NAT = 'lib:saga-go/models/nature/';
  var BLD = 'lib:saga-go/models/buildings/';
  var ANI = 'lib:saga-go/models/animals/';

  /* ── 낱말 표 ─────────────────────────────────────────────────────────── */
  var STYLE = [['원신', 'genshin'], ['젤다', 'zelda'], ['파판', 'ff'], ['파이널', 'ff'], ['턴', 'ff'], ['atb', 'ff'], ['간단', 'simple'], ['액션', 'simple'], ['없음', 'none']];
  var CAM = [['1인칭', 'first'], ['일인칭', 'first'], ['3인칭', 'follow'], ['삼인칭', 'follow'], ['쿼터', 'top'], ['위', 'top'], ['탑뷰', 'top'], ['옆', 'side'], ['횡', 'side'], ['2.5', 'side'], ['고정', 'fixed']];
  var SKY = { '맑음': ['#9fd0ff', 1, 110], '낮': ['#9fd0ff', 1, 110], '노을': ['#f4a582', 0.85, 100], '저녁': ['#f4a582', 0.85, 100], '밤': ['#1b2a4a', 0.5, 70],
    '흐림': ['#a9b4c2', 0.8, 80], '동굴': ['#1d1a24', 0.55, 45], '지하': ['#1d1a24', 0.55, 45], '하늘': ['#aee1ff', 1, 130], '사막': ['#f2d7a0', 1.05, 120], '눈': ['#dfe9f3', 0.95, 90] };
  var GROUND = { '풀': '#7fb069', '들판': '#86b55a', '잔디': '#7fb069', '모래': '#e2c275', '사막': '#e2c275', '눈': '#eef3f7', '돌': '#8d8577', '바위': '#8d8577',
    '흙': '#8b6b4a', '동굴': '#4a4452', '늪': '#556b4a', '용암': '#5a2a1a', '얼음': '#bfe3f2' };
  var MUSIC = { '잔잔': 'calm', '마을': 'calm', '모험': 'field', '들판': 'field', '장터': 'town', '흥겨움': 'town', '전투': 'battle', '보스': 'boss', '밤': 'night', '동굴': 'cave', '없음': 'none' };
  var HILLS = { '낮음': { height: 2, size: 20, flat: 12 }, '낮게': { height: 2, size: 20, flat: 12 }, '보통': { height: 4, size: 18, flat: 12 }, '높음': { height: 7, size: 16, flat: 14 }, '높게': { height: 7, size: 16, flat: 14 } };
  var WEATHER = { '자동': 'auto', '맑음': 'clear', '흐림': 'cloud', '비': 'rain', '바람': 'wind', '안개': 'fog', '눈': 'snow' };
  var SEASON = { '자동': 'auto', '봄': 'spring', '여름': 'summer', '가을': 'autumn', '겨울': 'winter' };
  var ELEM = ['불', '물', '얼음', '번개', '바람'];
  /* 줍는 것 이름 → 변수(영문이 HUD·목표에 안전하다) */
  var ITEMVAR = { '동전': 'coins', '금화': 'coins', '코인': 'coins', '보석': 'gem', '별': 'star', '열쇠': 'key', '사과': 'apple', '조개': 'shell', '구슬': 'orb', '깃털': 'feather',
    '약초': 'herb', '꽃': 'flower', '버섯': 'mushroom', '광석': 'ore', '나뭇가지': 'wood', '장작': 'wood', '포션': 'potion', '물약': 'potion', '씨앗': 'seed', '물고기': 'fish' };
  /* 동물 이름 → 모델(키 m) */
  var ANIMAL = [['늑대', 'Wolf', 1.1], ['들개', 'Wolf', 1.1], ['사슴', 'Deer', 1.7], ['수사슴', 'Stag', 1.9], ['여우', 'Fox', 0.8], ['고양이', 'Cat', 0.5], ['강아지', 'ShibaInu', 0.6], ['개', 'Husky', 0.8],
    ['말', 'Horse', 1.8], ['소', 'Cow', 1.5], ['황소', 'Bull', 1.6], ['당나귀', 'Donkey', 1.4], ['알파카', 'Alpaca', 1.6], ['곰', 'Bear', 1.4], ['판다', 'Panda', 1.2], ['호랑이', 'Tiger', 1.2],
    ['멧돼지', 'Boar', 1], ['원숭이', 'Monkey', 0.9], ['개구리', 'Frog', 0.4], ['뱀', 'Snake', 0.5], ['올빼미', 'Owl', 0.6], ['부엉이', 'Owl', 0.6], ['새', 'Birb', 0.5], ['비둘기', 'Pigeon', 0.4],
    ['학', 'Crane', 1.3], ['공룡', 'Trex', 3], ['랩터', 'Velociraptor', 1.6], ['트리케라톱스', 'Triceratops', 2.2], ['오크', 'Orc.gltf', 2], ['악마', 'Demon.gltf', 2.2]];
  /* 이름에 든 낱말로 적 겉모습 고르기 */
  var FOELOOK = [['슬라임', { shape: 'sphere', color: '#76c893' }, [1, 0.8, 1]], ['해골', { shape: 'capsule', color: '#e8e2d0' }], ['박쥐', { shape: 'sphere', color: '#5b4a6b' }, [0.7, 0.5, 0.7]],
    ['골렘', { shape: 'box', color: '#8d8577' }, [1.4, 1.6, 1.2]], ['유령', { shape: 'capsule', color: '#b8c4d6' }], ['망령', { shape: 'capsule', color: '#8e9aaf' }], ['도깨비', { shape: 'capsule', color: '#7a5c8a' }],
    ['기사', { shape: 'model', model: CHAR + 'Warrior.glb', fit: 1.9 }], ['병사', { shape: 'model', model: CHAR + 'Warrior.glb', fit: 1.8 }], ['도적', { shape: 'model', model: CHAR + 'Rogue.glb', fit: 1.8 }],
    ['궁수', { shape: 'model', model: CHAR + 'Ranger.glb', fit: 1.8 }], ['마법사', { shape: 'model', model: CHAR + 'Wizard.glb', fit: 1.8 }], ['승려', { shape: 'model', model: CHAR + 'Monk.glb', fit: 1.8 }]];
  var NPCMODEL = ['Cleric', 'Monk', 'Wizard', 'Ranger', 'Rogue'];
  var SKILLS = [['기탄', 'bolt'], ['탄', 'bolt'], ['화살', 'bolt'], ['파동', 'nova'], ['폭발', 'nova'], ['회오리', 'whirl'], ['돌진', 'dash'], ['치유', 'heal'], ['회복', 'heal'],
    ['강화', 'buff'], ['번개', 'chain'], ['연쇄', 'chain'], ['저주', 'curse'], ['소환', 'summon']];
  var PARTY = {
    genshin: [{ name: '불꽃검사', element: '불', color: '#ff6b3d', hp: 130, atk: 22, def: 4 }, { name: '물무희', element: '물', color: '#3da5ff', hp: 110, atk: 18, def: 3 },
      { name: '얼음창', element: '얼음', color: '#a8ecff', hp: 120, atk: 20, def: 4 }, { name: '바람궁', element: '바람', color: '#5ee6b0', hp: 100, atk: 19, def: 3 }],
    ff: [{ name: '검사', color: '#3b82f6', hp: 95, mp: 12, atk: 13, def: 5, mag: 5, spd: 11, magic: '케알' }, { name: '마도사', color: '#9b5de5', hp: 65, mp: 36, atk: 6, def: 2, mag: 13, spd: 9, magic: '파이어,블리자드,선더' },
      { name: '사제', color: '#f1faee', hp: 75, mp: 30, atk: 7, def: 3, mag: 11, spd: 10, magic: '케알,케알라,에어로' }]
  };
  /* 스타일별 적 기본 세기 — 하트(간단·젤다)와 수치(원신·파판)는 단위가 다르다 */
  var FOESTAT = { simple: { hp: 4, atk: 1, def: 0, boss: 24, batk: 2 }, zelda: { hp: 4, atk: 1, def: 0, boss: 24, batk: 2 },
    genshin: { hp: 60, atk: 8, def: 2, boss: 420, batk: 16 }, ff: { hp: 40, atk: 8, def: 2, boss: 400, batk: 16 } };

  /* 종류: w 낱말(앞쪽이 먼저 맞음) · zone 놓는 곳(near 시작 곁 · mid 곳곳 · far 먼 쪽 · edge 가장자리 · north 끝 · center 한가운데) · r 차지하는 반지름 */
  var KINDS = [
    { k: 'boss', w: ['보스', '두목', '마왕', '대장'], zone: 'north', r: 3 },
    { k: 'wave', w: ['적 파도', '몰려오는 적', '파도'], zone: 'center', r: 1 },
    { k: 'dungeon', w: ['무작위 던전', '던전', '미궁'], zone: 'center', r: 1 },
    { k: 'foe', w: ['적', '몬스터', '괴물', '졸개'], zone: 'far', r: 1.5 },
    { k: 'moving', w: ['움직이는 발판', '떠다니는 발판'], zone: 'mid', r: 3 },
    { k: 'plate', w: ['발판 스위치', '누름판', '압력판'], zone: 'mid', r: 1.5 },
    { k: 'platform', w: ['발판', '디딤돌', '계단'], zone: 'mid', r: 2.5 },
    { k: 'lever', w: ['레버', '스위치'], zone: 'mid', r: 1.5 },
    { k: 'gate', w: ['철문', '닫힌 문', '열리는 문', '성문', '창살'], zone: 'north', r: 3 },
    { k: 'portal', w: ['포탈', '문', '입구', '통로', '출입구'], zone: 'north', r: 3 },
    { k: 'goal', w: ['결승점', '결승', '깃발', '출구'], zone: 'north', r: 3 },
    { k: 'chest', w: ['보물상자', '보물 상자', '상자'], zone: 'mid', r: 1.5 },
    { k: 'coin', w: ['동전', '금화', '코인', '보석', '별', '열쇠', '사과', '조개', '구슬', '깃털'], zone: 'mid', r: 1 },
    { k: 'gather', w: ['약초', '꽃', '버섯', '광석', '나뭇가지', '장작'], zone: 'mid', r: 1 },
    { k: 'spike', w: ['가시', '함정', '가시덫'], zone: 'mid', r: 1.2 },
    { k: 'jumppad', w: ['점프대', '스프링'], zone: 'mid', r: 1.5 },
    { k: 'shop', w: ['상점', '상인', '가게', '잡화점', '장터'], zone: 'near', r: 2 },
    { k: 'companion', w: ['동료', '친구', '길동무'], zone: 'near', r: 1.5 },
    { k: 'npc', w: ['주민', '마을사람', '마을 사람', '사람', '어르신', '촌장', '노인', '아이', 'npc', '안내인', '경비'], zone: 'near', r: 1.5 },
    { k: 'fishing', w: ['낚시터'], zone: 'near', r: 6 },
    { k: 'water', w: ['연못', '호수', '웅덩이'], zone: 'edge', r: 6 },
    { k: 'plot', w: ['밭', '텃밭'], zone: 'near', r: 2.5 },
    { k: 'waypoint', w: ['봉수대', '거점', '이정표'], zone: 'near', r: 1.5 },
    { k: 'torch', w: ['석등', '등불', '횃불'], zone: 'mid', r: 1 },
    { k: 'fire', w: ['모닥불', '캠프파이어'], zone: 'near', r: 1.5 },
    { k: 'fountain', w: ['분수'], zone: 'near', r: 2 },
    { k: 'town', w: ['영지', '성채', '요새'], zone: 'far', r: 5 },
    { k: 'house', w: ['집', '오두막', '여관', '대장간', '우물', '탑', '망루', '노점'], zone: 'village', r: 4 },
    { k: 'wall', w: ['벽', '담', '울타리'], zone: 'mid', r: 3.5 },
    { k: 'tree', w: ['나무', '소나무', '단풍나무', '숲'], zone: 'edge', r: 2 },
    { k: 'bush', w: ['덤불', '풀숲', '수풀'], zone: 'edge', r: 1 },
    { k: 'rock', w: ['바위', '돌'], zone: 'edge', r: 1.5 },
    { k: 'mountain', w: ['산', '언덕 봉우리'], zone: 'rim', r: 8 },
    { k: 'animal', w: ANIMAL.map(function (a) { return a[0]; }), zone: 'mid', r: 1.5 }
  ];
  var WORDS = [];
  KINDS.forEach(function (K) { K.w.forEach(function (w) { WORDS.push([w.toLowerCase(), K]); }); });
  WORDS.sort(function (a, b) { return b[0].length - a[0].length; });

  function pick(list, s) {
    s = String(s || '').toLowerCase();
    for (var i = 0; i < list.length; i++) { if (s.indexOf(list[i][0]) >= 0) { return list[i][1]; } }
    return null;
  }
  function inMap(map, s) {
    s = String(s || '').trim();
    if (map[s] != null) { return map[s]; }
    var keys = Object.keys(map).sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < keys.length; i++) { if (s.indexOf(keys[i]) >= 0) { return map[keys[i]]; } }
    return null;
  }
  function animalOf(name) {
    var best = null;
    ANIMAL.forEach(function (a) { if (String(name).indexOf(a[0]) >= 0 && (!best || a[0].length > best[0].length)) { best = a; } });
    return best;
  }
  function hexOf(s) { var m = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/.exec(s || ''); return m ? m[0] : null; }
  function numOf(s, d) { var m = /-?\d+(?:\.\d+)?/.exec(s || ''); return m ? +m[0] : d; }

  /* ── 한 줄 쪼개기: 따옴표(대사) · 괄호(옵션) · 개수 · 종류 · 이름 ──────────── */
  function splitThing(raw) {
    var lines = [], opts = [], s = raw;
    s = s.replace(/"([^"]*)"|“([^”]*)”|「([^」]*)」|『([^』]*)』/g, function (m, a, b, c, d) { lines.push((a || b || c || d || '').trim()); return ' '; });
    s = s.replace(/[(（]([^)）]*)[)）]/g, function (m, a) { opts = opts.concat(a.split(/[,，、;]/).map(function (x) { return x.trim(); }).filter(Boolean)); return ' '; });
    var count = 1, m = /(?:[x×*]\s*(\d+))|(\d+)\s*(?:개|마리|그루|채|명|곳|군데|줄|칸|방)?(?=\s|$)/i.exec(s);
    if (m) { count = +(m[1] || m[2]); s = s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length); }
    s = s.replace(/\s+/g, ' ').trim();
    var arrow = null, am = /(?:→|->|=>|⇒)\s*(.+)$/.exec(s);
    if (am) { arrow = am[1].trim(); s = s.slice(0, am.index).trim(); }
    /* "종류: 이름" · "종류 이름" · "이름 종류" 모두 받는다 */
    var kind = null, name = '', low = s.toLowerCase(), head = s.split(/[:：]/)[0].trim().toLowerCase();
    /* 앞머리에 맞는 종류 — 한 글자 낱말(문·집·벽·돌·산…)은 바로 뒤가 글자가 아닐 때만("문지기"는 문이 아니다) */
    for (var i = 0; i < WORDS.length && !kind; i++) {
      var w = WORDS[i][0], nx = low.charAt(w.length);
      if (head === w || (low.indexOf(w) === 0 && (w.length > 1 || !nx || !/[가-힣a-z]/.test(nx)))) { kind = WORDS[i][1]; name = s.slice(w.length).replace(/^\s*[:：]?\s*/, ''); }
    }
    /* 아니면 낱말 하나가 종류로 끝나는 것("무서운 늑대", "빨간 보물상자") */
    var toks = s.replace(/[:：]/g, ' ').split(/\s+/).filter(Boolean);
    for (var j = 0; j < WORDS.length && !kind; j++) {
      for (var ti = 0; ti < toks.length && !kind; ti++) {
        var tk = toks[ti].toLowerCase();
        if (tk === WORDS[j][0] || (WORDS[j][0].length > 1 && tk.slice(-WORDS[j][0].length) === WORDS[j][0])) {
          kind = WORDS[j][1];
          name = tk === WORDS[j][0] ? toks.filter(function (x, k) { return k !== ti; }).join(' ') : toks.join(' ');
        }
      }
    }
    return { kind: kind, name: name.trim(), rest: s, count: Math.max(1, Math.min(count, 200)), opts: opts, lines: lines, arrow: arrow, raw: raw };
  }
  /* 옵션 "체력 30" · "원거리" · "원소 불" → {체력:'30', 원거리:true …} */
  function optMap(opts) {
    var o = {};
    opts.forEach(function (x) {
      var m = /^([^\d\s:=：]+)\s*[:=：]?\s*(.*)$/.exec(x);
      if (!m) { return; }
      o[m[1].trim()] = m[2].trim() === '' ? true : m[2].trim();
    });
    return o;
  }

  /* ── 짓기 ─────────────────────────────────────────────────────────────── */
  function build(text, opt) {
    opt = opt || {};
    var notes = [];
    var G = { title: '', desc: '', style: 'simple', cam: 'follow', hp: null, gold: null, abil: {}, clock: null, weather: null, season: null, toon: false, outline: false, curve: 0, level: false, skills: [], walkOnly: false };
    var scenes = [], goals = [], cur = null;
    function scene(name) { cur = { name: name || ('장면 ' + (scenes.length + 1)), things: [], env: {}, cam: null, lineNo: 0 }; scenes.push(cur); return cur; }

    String(text || '').split(/\r?\n/).forEach(function (line, no) {
      var t = line.replace(/^\s*[-*•·]\s*/, '').trim();
      if (!t || /^(#|\/\/)/.test(t)) { return; }
      var kv = /^([^:：]{1,8})[:：]\s*(.*)$/.exec(t), key = kv ? kv[1].trim() : '', val = kv ? kv[2].trim() : '';
      switch (key) {
        case '제목': G.title = val; return;
        case '설명': case '소개': G.desc = val; return;
        case '전투': G.style = pick(STYLE, val) || 'simple'; return;
        case '시점': case '카메라': G.cam = pick(CAM, val) || 'follow'; return;
        case '체력': G.hp = numOf(val, null); return;
        case '돈': case '소지금': G.gold = numOf(val, 0); return;
        case '능력':
          if (/달리/.test(val)) { G.abil.sprint = true; }
          if (/활공|글라이/.test(val)) { G.abil.glide = true; }
          if (/등반|벽타|기어/.test(val)) { G.abil.climb = true; }
          if (/점프 ?없|못 ?뛰/.test(val)) { G.walkOnly = true; }
          return;
        case '시간': G.clock = /실제|현실/.test(val) ? 'real' : /없|끔|멈/.test(val) ? 'off' : 'game'; return;
        case '날씨': G.weather = inMap(WEATHER, val) || 'auto'; if (!G.clock) { G.clock = 'game'; } return;
        case '계절': G.season = inMap(SEASON, val) || 'auto'; if (!G.clock) { G.clock = 'game'; } return;
        case '그래픽': case '그림':
          G.toon = /툰|만화|셀/.test(val); G.outline = /외곽|테두리/.test(val) || G.toon;
          if (/둥근|구면|휘/.test(val)) { G.curve = 0.003; }
          return;
        case '레벨': case '성장': G.level = !/없|끔/.test(val); return;
        case '스킬': case '기술':
          val.split(/[,，、]/).forEach(function (x) { x = x.trim(); if (x) { G.skills.push({ name: x, kind: pick(SKILLS, x) || 'bolt', el: ELEM.filter(function (e) { return x.indexOf(e) >= 0; })[0] || '' }); } });
          return;
        case '장면': case '맵': case '지역': scene(val); cur.lineNo = no + 1; return;
        case '목표': case '승리': case '클리어': val.split(/[\/,，]/).forEach(function (x) { if (x.trim()) { goals.push({ text: x.trim(), lineNo: no + 1 }); } }); return;
      }
      if (!cur) { scene('들판'); }
      switch (key) {
        case '하늘': cur.env.sky = val; return;
        case '땅': case '바닥': cur.env.ground = val; return;
        case '크기': case '넓이': cur.env.size = numOf(val, 70); return;
        case '언덕': case '지형': cur.env.hills = val; return;
        case '음악': case '배경음악': cur.env.music = inMap(MUSIC, val) || 'field'; return;
        case '시점': case '카메라': cur.cam = pick(CAM, val); return;
      }
      var th = splitThing(t);
      th.lineNo = no + 1;
      /* 모르는 이름이라도 대사가 붙어 있으면 사람(대장장이 "어서 와") */
      if (!th.kind && th.lines.length && th.rest) { th.kind = KINDS.filter(function (K) { return K.k === 'npc'; })[0]; th.name = th.rest.replace(/[:：]/g, ' ').trim(); }
      if (!th.kind) { notes.push(th.lineNo + '줄: 무엇인지 모르겠다 — "' + t + '" (도움말의 종류 목록 참고)'); return; }
      cur.things.push(th);
    });
    if (!scenes.length) { scene('들판'); }

    var style = G.style === 'none' ? 'simple' : G.style;
    var ST = FOESTAT[style];
    var rng = SIM.mulberry32(opt.seed || 20260924);
    var P = {
      format: SIM.FORMAT, version: SIM.VERSION, id: opt.id || 'my-game', title: G.title || opt.title || '내 게임', desc: G.desc || '',
      start: 'scene1', vars: {}, hud: [], goals: ['', '', ''], combat: { style: style }, scenes: []
    };
    var V = P.vars;
    function need(v, x) { if (!(v in V)) { V[v] = x || 0; } }
    /* 체력 */
    var hpStart = G.hp != null ? G.hp : style === 'genshin' ? 120 : style === 'ff' ? 90 : 5;
    need('hp', hpStart);
    if (style === 'simple' || style === 'zelda') { P.combat.hpMax = Math.max(hpStart, 3); P.combat.potionHeal = Math.max(1, Math.round(hpStart / 3)); P.combat.atk = 1; }
    if (G.style === 'none') { P.combat.atk = 0; }
    if (PARTY[style]) { P.combat.party = SIM.clone(PARTY[style]); P.combat.potionHeal = 50; need('potion', 2); }
    if (G.skills.length && style !== 'ff' && style !== 'genshin') {
      P.combat.skills = G.skills.slice(0, 4).map(function (s, i) { return { kind: s.kind, name: s.name, power: 2 + (i ? 0.5 : 0), cd: [0.8, 4, 6, 12][i], mp: [3, 10, 12, 20][i], element: s.el || undefined, r: s.kind === 'nova' ? 4 : undefined }; });
      P.combat.mpMax = 40; P.combat.mpRegen = 3; need('mp', 40);
    }
    if (G.gold != null) { need('gold', G.gold); }
    if (G.clock) { P.world = { clock: G.clock, dayMin: 12, start: 9, seasonDays: 3, weather: G.weather || 'auto', season: G.season || 'auto' }; }
    if (G.toon || G.outline || G.curve) { P.graphics = { toon: G.toon, outline: G.outline }; if (G.curve) { P.graphics.curve = G.curve; } }
    if (G.level) { need('exp', 0); need('lv', 1); P.level = { expVar: 'exp', lvVar: 'lv', base: 30, atk: 0.15, hpVar: 'hp', hp: style === 'genshin' || style === 'ff' ? 10 : 1 }; }

    /* 장면 id·이름 */
    scenes.forEach(function (sc, i) { sc.id = 'scene' + (i + 1); });
    function sceneByName(n) {
      n = String(n || '').trim();
      for (var k = 0; k < scenes.length; k++) { if (scenes[k].name === n) { return scenes[k]; } }
      n = n.replace(/(으로|로|에|쪽)?\s*(가는|향하는|이어지는)?\s*$/, '').trim();
      if (!n) { return null; }
      for (var i = 0; i < scenes.length; i++) { if (scenes[i].name === n) { return scenes[i]; } }
      for (var j = 0; j < scenes.length; j++) { if (scenes[j].name.indexOf(n) >= 0 || n.indexOf(scenes[j].name) >= 0) { return scenes[j]; } }
      return null;
    }

    var itemNames = {};   // 변수 → 보이는 이름(HUD·목표)
    var extraVar = 0;
    function itemVar(name) {
      var v = inMap(ITEMVAR, name);
      if (!v) {
        for (var k in itemNames) { if (itemNames[k] === name) { return k; } }
        v = 'item' + (++extraVar);
      }
      if (!itemNames[v]) { itemNames[v] = name; }
      need(v, 0);
      return v;
    }

    var nameIndex = [];   // 목표가 이름으로 찾는다: {name, sc, id, kind}
    scenes.forEach(function (sc, si) {
      var size = sc.env.size || (sc.things.some(function (t) { return t.kind.k === 'town'; }) ? 120 : 70);
      var half = size / 2;
      var skyK = sc.env.sky ? (hexOf(sc.env.sky) ? null : inMap(SKY, sc.env.sky)) : (/동굴|지하|던전|굴/.test(sc.name) ? SKY['동굴'] : /밤/.test(sc.name) ? SKY['밤'] : SKY['맑음']);
      var skyHex = hexOf(sc.env.sky) || (skyK || SKY['맑음'])[0];
      var cave = skyK === SKY['동굴'];
      var gHex = hexOf(sc.env.ground) || inMap(GROUND, sc.env.ground || '') || (cave ? GROUND['동굴'] : /눈|설원|겨울/.test(sc.name) ? GROUND['눈'] : /사막|모래/.test(sc.name) ? GROUND['모래'] : GROUND['풀']);
      var snowy = gHex === GROUND['눈'], autumn = /가을|단풍/.test(sc.name) || G.season === 'autumn';
      var env = { sky: skyHex, fog: (skyK || SKY['맑음'])[2] + size / 2, light: (skyK || SKY['맑음'])[1], ground: { size: size, color: gHex }, gravity: 22 };
      if (sc.env.hills && !/없/.test(sc.env.hills)) { env.ground.hills = Object.assign({ seed: si + 1 }, inMap(HILLS, sc.env.hills) || HILLS['보통']); }
      env.music = sc.env.music || (cave ? 'cave' : sc.things.some(function (t) { return t.kind.k === 'boss'; }) ? 'battle' : si === 0 ? 'field' : 'calm');
      var dungeonScene = sc.things.some(function (t) { return t.kind.k === 'dungeon'; });
      var camMode = sc.cam || (dungeonScene ? 'top' : G.cam);
      var camera = { mode: camMode, dist: camMode === 'top' ? 12 : 9, height: camMode === 'top' ? 14 : 4.5 };
      if (camMode === 'top') { camera.yaw = 20; }
      var S = { id: sc.id, name: sc.name, env: env, camera: camera, entities: [], events: [] };
      P.scenes.push(S);

      /* 자리 잡기 — 겹치지 않게 씨앗 흩기 */
      var pz = Math.min(12, half - 6);
      var taken = [{ x: 0, z: pz, r: 3.5 }, { x: 0, z: pz - 4, r: 1.5 }];
      function free(x, z, r) {
        if (Math.abs(x) > half - r - 1 || Math.abs(z) > half - r - 1) { return false; }
        for (var i = 0; i < taken.length; i++) { var t = taken[i], dx = t.x - x, dz = t.z - z; if (dx * dx + dz * dz < (t.r + r) * (t.r + r)) { return false; } }
        return true;
      }
      function place(zone, r) {
        for (var tries = 0; tries < 400; tries++) {
          var loose = tries > 250 ? 1.6 : 1, x, z, a, d;
          switch (zone) {
            case 'near': a = rng() * Math.PI * 2; d = 4 + rng() * 10 * loose; x = Math.cos(a) * d; z = pz - 6 + Math.sin(a) * d * 0.7; break;
            case 'village': a = rng() * Math.PI * 2; d = 9 + rng() * 9 * loose; x = Math.cos(a) * d; z = pz - 6 + Math.sin(a) * d * 0.8; break;
            case 'far': x = (rng() * 2 - 1) * (half - 6); z = -rng() * (half - 8) * loose + 2; break;
            case 'north': x = (rng() * 2 - 1) * Math.min(12, half - 8) * loose; z = -(half - 7) + rng() * 4 * loose; break;
            case 'center': x = 0; z = 0; if (tries) { x = (rng() * 2 - 1) * 4; z = (rng() * 2 - 1) * 4; } break;
            case 'rim': a = rng() * Math.PI * 2; d = half - r - 2; x = Math.cos(a) * d; z = Math.sin(a) * d; break;
            case 'edge': a = rng() * Math.PI * 2; d = (0.45 + rng() * 0.5) * (half - 3); x = Math.cos(a) * d; z = Math.sin(a) * d; if (Math.abs(x) < 4) { continue; } break;
            default: x = (rng() * 2 - 1) * (half - 5); z = (rng() * 2 - 1) * (half - 5);
          }
          if (tries > 350 || free(x, z, r)) { taken.push({ x: x, z: z, r: r }); return [+x.toFixed(1), 0, +z.toFixed(1)]; }
        }
        return [0, 0, 0];
      }
      var seq = {};
      function nid(k) { seq[k] = (seq[k] || 0) + 1; return k + seq[k]; }
      function E(o) { var e = Object.assign({ id: o.id || nid(o.k || 'e'), pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1] }, o); delete e.k; S.entities.push(e); return e; }
      function yawTo(p, tx, tz) { return Math.round(Math.atan2(tx - p[0], tz - p[2]) * 180 / Math.PI); }

      /* 플레이어 — 장면마다 하나, 북쪽(-z)을 본다 */
      var pcomp = Object.assign(SIM.compDefaults('player'), { mode: camMode === 'side' ? 'side' : G.walkOnly ? 'walk' : 'jump', sprint: G.abil.sprint !== false, glide: !!G.abil.glide, climb: !!G.abil.climb });
      if (G.style === 'none') { pcomp.attack = 0; }
      E({ id: 'player', name: '플레이어', pos: [0, 0, pz], rot: [0, 180, 0], look: { shape: 'model', model: CHAR + 'Warrior.glb', fit: 1.8 }, body: { type: 'dynamic', size: [0.8, 1.8, 0.8] }, comps: { player: pcomp } });
      S.events.push({ when: { on: 'var', var: 'hp', op: '<=', value: '0' }, do: [{ do: 'lose', text: '쓰러졌다…' }] });
      if (sc.things.some(function (t) { return t.kind.k === 'platform' || t.kind.k === 'moving'; })) {
        S.events.push({ when: { on: 'fall' }, do: [{ do: 'add', var: 'hp', value: style === 'genshin' || style === 'ff' ? -20 : -1 }] });
      }

      var lastLever = null, npcN = 0, platY = 0;
      sc.things.forEach(function (th) {
        var K = th.kind, o = optMap(th.opts), n = th.count, nm = th.name;
        var r = K.r, e, i;
        for (i = 0; i < n; i++) {
          var pos = place(K.zone, r);
          switch (K.k) {
            case 'tree': {
              var s = +(0.85 + rng() * 0.4).toFixed(2), tm = snowy ? 'CommonTree_Snow_' + (1 + (i % 2)) : autumn ? 'CommonTree_Autumn_' + (1 + (i % 2)) : /소나무/.test(th.raw) ? 'PineTree_' + (1 + (i % 2)) : 'CommonTree_' + (1 + (i % 3));
              E({ k: 'tree', name: '나무', pos: pos, rot: [0, Math.round(rng() * 360), 0], scale: [s, s, s], look: { shape: 'model', model: NAT + tm + '.glb', fit: 5 }, body: { type: 'solid', size: [0.8, 5, 0.8] } });
              break;
            }
            case 'bush': E({ k: 'bush', name: '덤불', pos: pos, rot: [0, Math.round(rng() * 360), 0], look: { shape: 'model', model: NAT + 'Bush_' + (1 + (i % 2)) + '.glb', fit: 1 }, body: { type: 'none' } }); break;
            case 'rock': E({ k: 'rock', name: '바위', pos: pos, rot: [0, Math.round(rng() * 360), 0], look: { shape: 'model', model: NAT + 'Rock_' + (1 + (i % 3)) + '.glb', fit: 1.4 }, body: { type: 'solid', size: [1.6, 1.4, 1.6] } }); break;
            case 'mountain': E({ k: 'mountain', name: '산', pos: pos, look: { shape: 'model', model: NAT + 'Mountain_' + (1 + (i % 2)) + '.glb', fit: 14 }, body: { type: 'solid', size: [12, 14, 12] } }); break;
            case 'house': {
              var hm = /여관/.test(th.raw) ? ['Inn', 7, 6] : /대장간/.test(th.raw) ? ['Blacksmith', 6, 6] : /우물/.test(th.raw) ? ['Well', 2.2, 2] : /망루/.test(th.raw) ? ['Watchtower', 8, 3] : /탑/.test(th.raw) ? ['Tower', 10, 4] : /노점/.test(th.raw) ? ['MarketStand_1', 3, 3] : ['House_' + (1 + (i % 4)), 6, 5];
              E({ k: 'house', name: nm || th.kind.w.filter(function (w) { return th.raw.indexOf(w) >= 0; })[0] || '집', pos: pos, rot: [0, yawTo(pos, 0, pz - 6), 0], look: { shape: 'model', model: BLD + hm[0] + '.glb', fit: hm[1] }, body: { type: 'solid', size: [hm[2], hm[1], hm[2]] } });
              break;
            }
            case 'wall': E({ k: 'wall', name: nm || '벽', pos: pos, rot: [0, rng() < 0.5 ? 0 : 90, 0], scale: [6, /울타리/.test(th.raw) ? 1.2 : 3, 0.6], look: { shape: 'box', color: hexOf(o['색']) || (/울타리/.test(th.raw) ? '#a47551' : '#8d99ae') }, body: { type: 'solid' } }); break;
            case 'platform': {
              /* 발판은 차례로 높아지는 징검다리 — 이전 발판에서 뛸 수 있는 거리 */
              platY += 1.1;
              var pp = i === 0 ? pos : [+(S.entities[S.entities.length - 1].pos[0] + (rng() * 2 - 1) * 3).toFixed(1), 0, +(S.entities[S.entities.length - 1].pos[2] - 3.5).toFixed(1)];
              if (Math.abs(pp[2]) > half - 3) { pp[2] = pos[2]; }
              pp[1] = +platY.toFixed(1);
              e = E({ k: 'plat', name: nm || '발판', pos: pp, scale: [3, 0.5, 3], look: { shape: 'box', color: hexOf(o['색']) || '#a47551' }, body: { type: 'solid' } });
              break;
            }
            case 'moving': E({ k: 'mover', name: nm || '움직이는 발판', pos: [pos[0], 2 + i, pos[2]], scale: [3, 0.4, 3], look: { shape: 'box', color: '#e9c46a' }, body: { type: 'solid' }, comps: { patrol: { dx: 8, dy: 0, dz: 0, speed: 2.5 } } }); break;
            case 'jumppad': E({ k: 'pad', name: '점프대', pos: pos, scale: [1.6, 0.3, 1.6], look: { shape: 'cylinder', color: '#06d6a0', glow: true }, body: { type: 'trigger', size: [1, 2, 1] }, comps: { launch: { power: numOf(o['힘'], 17) } } }); break;
            case 'spike': E({ k: 'spike', name: nm || '가시', tag: 'spike', pos: pos, scale: [0.8, 0.8, 0.8], look: { shape: 'cone', color: '#6c757d' }, body: { type: 'solid' }, comps: { hurt: { var: 'hp', amount: style === 'genshin' || style === 'ff' ? 15 : 1 } } }); break;
            case 'coin': {
              var cw = th.kind.w.filter(function (w) { return th.raw.indexOf(w) >= 0; })[0] || '동전';
              var cv = itemVar(cw), gem = cv !== 'coins';
              E({ k: cv, name: cw, tag: cv, pos: [pos[0], 0.6, pos[2]], scale: gem ? [0.5, 0.5, 0.5] : [0.6, 0.12, 0.6], look: { shape: gem ? (cv === 'key' ? 'torus' : 'sphere') : 'cylinder', color: gem ? '#66d9ff' : '#ffd166', glow: true },
                body: { type: 'trigger', size: [1.4, 6, 1.4], off: [0, -2, 0] }, comps: { spin: { speed: 180 }, pickup: { var: cv, add: 1, sound: 'coin' } } });
              break;
            }
            case 'gather': {
              var gw = th.kind.w.filter(function (w) { return th.raw.indexOf(w) >= 0; })[0] || '약초', gv = itemVar(gw);
              E({ k: gv, name: gw, tag: gv, pos: pos, scale: [0.5, 0.6, 0.5], look: { shape: 'cone', color: gw === '꽃' ? '#ff8fab' : gw === '광석' ? '#9aa5b1' : gw === '버섯' ? '#d9534f' : '#6abf4b' }, body: { type: 'trigger' },
                comps: { gather: { item: gw, var: gv, add: 1, regrow: 40 } } });
              break;
            }
            case 'chest': {
              var grade = /화려/.test(th.raw) ? 'luxurious' : /진귀/.test(th.raw) ? 'precious' : /정교/.test(th.raw) ? 'exquisite' : 'common';
              need('gold', 0);
              E({ k: 'chest', name: '보물 상자', pos: pos, rot: [0, yawTo(pos, 0, pz), 0], scale: [1, 0.7, 0.7], look: { shape: 'box', color: '#8c5c33' }, body: { type: 'solid' }, comps: { chest: { grade: grade, lock: 'none', var: 'gold', amount: 0 } } });
              break;
            }
            case 'npc': case 'companion': {
              var who = nm || (th.kind.w.filter(function (w) { return th.raw.indexOf(w) >= 0; })[0]) || '주민';
              var comps = { talk: { name: who, lines: th.lines.length ? th.lines : ['안녕!'] } };
              if (K.k === 'companion') { comps.follow = { dist: 2.2, speed: 6.5 }; }
              if (o['하트'] || o['관계']) { comps.bond = SIM.compDefaults('bond'); }
              e = E({ k: K.k, name: who + (n > 1 ? ' ' + (i + 1) : ''), pos: pos, rot: [0, yawTo(pos, 0, pz), 0], look: { shape: 'model', model: CHAR + NPCMODEL[(npcN++) % NPCMODEL.length] + '.glb', fit: 1.8, label: who }, body: { type: 'solid', size: [0.8, 1.8, 0.8] }, comps: comps });
              nameIndex.push({ name: who, sc: S, id: e.id, kind: K.k });
              break;
            }
            case 'shop': {
              var items = th.opts.map(function (x) {
                var m = /^(.+?)\s*[:=]?\s*(\d+)\s*(?:원|냥|골드|금)?$/.exec(x);
                if (!m) { return null; }
                var inm = m[1].trim();
                return inm + '|' + m[2] + '|' + itemVar(inm) + '|1';
              }).filter(Boolean);
              need('gold', 30);
              var sname = nm || (/상점|가게|잡화점|장터/.test(th.raw) ? th.kind.w.filter(function (w) { return th.raw.indexOf(w) >= 0; })[0] : '상점');
              E({ k: 'shop', name: '상인', pos: pos, rot: [0, yawTo(pos, 0, pz), 0], look: { shape: 'model', model: CHAR + 'Rogue.glb', fit: 1.8, label: sname }, body: { type: 'solid', size: [0.8, 1.8, 0.8] },
                comps: { shop: { name: sname, currency: 'gold', items: items.length ? items : ['포션|10|' + itemVar('포션') + '|1'] } } });
              break;
            }
            case 'animal': {
              var an = animalOf(th.raw) || ANIMAL[2];
              var mf = /\.gltf$/.test(an[1]) ? an[1] : an[1] + '.glb';
              E({ k: 'animal', name: an[0], pos: pos, rot: [0, Math.round(rng() * 360), 0], look: { shape: 'model', model: ANI + mf, fit: an[2] }, body: { type: 'solid', size: [0.8, an[2], 1.2] },
                comps: { codex: { book: '생물', name: an[0] }, patrol: { dx: 0, dy: 0, dz: 4, speed: 1.2 } } });
              break;
            }
            case 'foe': case 'boss': {
              var boss = K.k === 'boss', fname = nm || (boss ? (th.raw.indexOf('마왕') >= 0 ? '마왕' : '두목') : '적');
              var an2 = animalOf(fname), fl = null, fscale = null;
              if (an2) { fl = { shape: 'model', model: ANI + (/\.gltf$/.test(an2[1]) ? an2[1] : an2[1] + '.glb'), fit: an2[2] }; }
              else { FOELOOK.forEach(function (f) { if (!fl && fname.indexOf(f[0]) >= 0) { fl = SIM.clone(f[1]); fscale = f[2]; } }); }
              if (!fl) { fl = { shape: 'capsule', color: boss ? '#b71c1c' : '#8d6e63' }; }
              if (boss) { fl.label = fname; }
              var el = ELEM.filter(function (x) { return (o['원소'] || '').indexOf(x) >= 0 || fname.indexOf(x) >= 0; })[0] || '';
              var f = Object.assign(SIM.compDefaults('foe'), {
                hp: numOf(o['체력'], boss ? ST.boss : ST.hp), atk: numOf(o['공격'], boss ? ST.batk : ST.atk), def: numOf(o['방어'], ST.def),
                exp: boss ? 60 : 10, gold: boss ? 40 : 3, boss: boss, element: style === 'genshin' ? el : '', ranged: !!(o['원거리'] || /궁수|사수|마법사/.test(fname)),
                count: style === 'ff' && !boss ? 2 : 1
              });
              if (f.ranged) { f.range = 7; }
              if (boss) { f.poise = style === 'zelda' || style === 'simple' ? 6 : 0; f.enrage = 25; f.range = 2.6; f.windup = 0.9; f.drops = ['포션|0.8|' + itemVar('포션') + '|2|보통']; }
              if (o['빠르기']) { f.move = numOf(o['빠르기'], 2.6); }
              need('gold', 0); need('exp', 0);
              var sc2 = boss ? 1.6 : 1;
              e = E({ k: boss ? 'boss' : 'foe', name: fname, tag: 'foe', pos: pos, rot: [0, yawTo(pos, 0, pz), 0], scale: fscale ? fscale.map(function (v) { return v * sc2; }) : [sc2, sc2, sc2], look: fl,
                body: { type: 'dynamic', size: [0.8, 1.8, 0.8] }, comps: { foe: f }, once: style === 'ff' || boss ? true : undefined });
              if (e.once === undefined) { delete e.once; }
              nameIndex.push({ name: fname, sc: S, id: e.id, kind: K.k });
              break;
            }
            case 'wave': case 'dungeon': {
              if (i > 0) { break; }
              var tname = nm || (K.k === 'wave' ? '망령' : '도깨비');
              var tl = null; FOELOOK.forEach(function (x) { if (!tl && tname.indexOf(x[0]) >= 0) { tl = SIM.clone(x[1]); } });
              var tpl = E({ k: 'tpl', name: tname, tag: 'foe', pos: [0, 0, 0], look: tl || { shape: 'capsule', color: '#7a5c8a' }, body: { type: 'dynamic', size: [0.8, 1.8, 0.8] }, off: true,
                comps: { foe: Object.assign(SIM.compDefaults('foe'), { hp: ST.hp + (style === 'simple' || style === 'zelda' ? 1 : 0), atk: ST.atk, def: 0, aggro: K.k === 'wave' ? 40 : 9, exp: 6, gold: 2, drops: ['금화|0.5|gold|3|보통', '포션|0.1|' + itemVar('포션') + '|1|마법'] }) } });
              need('gold', 0); need('exp', 0);
              if (K.k === 'wave') {
                need('wave', 0);
                E({ k: 'spawner', name: '적 파도', pos: [0, 0, 0], look: { shape: 'none' }, body: { type: 'none' }, comps: { spawner: { from: tpl.id, every: 2, max: 8, radius: Math.min(16, half - 4), total: n > 1 ? n : 0, wave: true } } });
              } else {
                E({ k: 'dungeon', name: '던전', pos: [0, 0, 0], look: { shape: 'none' }, body: { type: 'none' },
                  comps: { dungeon: Object.assign(SIM.compDefaults('dungeon'), { seed: 0, rooms: n > 2 ? Math.min(n, 14) : 7, from: tpl.id, foes: 2, chest: 0.35, exit: 'goal' }) } });
              }
              break;
            }
            case 'portal': {
              var dest = sceneByName(th.arrow || nm);
              if (!dest) { notes.push(th.lineNo + '줄: 문이 갈 장면 "' + (th.arrow || nm) + '" 이 없다 — 장면 이름을 똑같이 쓸 것'); break; }
              if (dest === sc) { notes.push(th.lineNo + '줄: 문이 제 장면을 가리킨다'); break; }
              if (i > 0) { break; }
              E({ k: 'door', name: dest.name + '(으)로', pos: pos, scale: [2.4, 2.4, 2.4], rot: [0, yawTo(pos, 0, pz) + 180, 0], look: { shape: 'torus', color: '#9b5de5', glow: true, label: dest.name },
                body: { type: 'trigger', size: [0.8, 1, 0.4] }, comps: { spin: { speed: 40 }, portal: { scene: dest.id, at: 'from_' + sc.id } } });
              (sc.doors = sc.doors || {})[dest.id] = pos;
              break;
            }
            case 'goal': {
              if (i > 0) { break; }
              E({ id: 'goal', name: '결승점', pos: pos, scale: [0.3, 3, 0.3], look: { shape: 'cylinder', color: '#ffffff', glow: true, label: nm || '결승' }, body: { type: 'trigger', size: [8, 1, 8] }, comps: { goal: { text: th.lines[0] || '도착! 클리어!' } } });
              sc.hasGoal = S;
              break;
            }
            case 'fishing':
              E({ k: 'pond', name: '낚시 연못', pos: [pos[0], -3, pos[2]], scale: [8, 3.1, 8], look: { shape: 'box', color: '#3d8fd6' }, body: { type: 'trigger' }, comps: { water: {} } });
              E({ k: 'fishing', name: '낚시터', pos: [pos[0], 0, pos[2] + 4.6], scale: [1.5, 1, 1.5], look: { shape: 'plane', color: '#8d6e63', label: '낚시터' }, body: { type: 'solid', size: [1, 0.05, 1] },
                comps: { fishing: { var: itemVar('물고기'), fishes: th.lines.length ? th.lines : ['붕어', '잉어', '메기'], zone: 0.25 } } });
              break;
            case 'water': E({ k: 'water', name: nm || '연못', pos: [pos[0], -3, pos[2]], scale: [10, 3.1, 10], look: { shape: 'box', color: '#3d8fd6' }, body: { type: 'trigger' }, comps: { water: {} } }); break;
            case 'plot': {
              need('seed', 2); need('crop', 0); itemNames.crop = itemNames.crop || '수확';
              E({ k: 'plot', name: '밭', pos: pos, scale: [2.5, 1, 2.5], look: { shape: 'plane', color: '#6d4c41' }, body: { type: 'none' }, comps: { plot: { seed: 'seed', crop: 'crop', grow: 25, yield: 2 } } });
              break;
            }
            case 'waypoint': E({ k: 'wp', name: (nm || sc.name) + ' 봉수대', pos: pos, scale: [1.2, 3, 1.2], look: { shape: 'cylinder', color: '#78909c', label: '봉수대' }, body: { type: 'solid' }, comps: { waypoint: { name: nm || sc.name } } }); break;
            case 'torch':
              e = E({ k: 'torch', name: '석등', tag: 'torch', pos: pos, scale: [0.5, 1.4, 0.5], look: { shape: 'cylinder', color: '#9e9e9e' }, body: { type: 'solid' }, comps: { torch: { element: ELEM.filter(function (x) { return th.raw.indexOf(x) >= 0; })[0] || '', sec: 30 } } });
              break;
            case 'fire': E({ k: 'fire', name: '모닥불', pos: pos, scale: [1, 0.4, 1], look: { shape: 'cylinder', color: '#6d4c41' }, body: { type: 'solid' }, comps: { particles: { kind: 'fire', color: '', rate: 30, size: 1 } } }); break;
            case 'fountain': E({ k: 'fountain', name: '분수', pos: pos, scale: [2.4, 0.6, 2.4], look: { shape: 'cylinder', color: '#b0bec5' }, body: { type: 'solid' }, comps: { particles: { kind: 'fountain', color: '', rate: 40, size: 1 } } }); break;
            case 'lever': {
              var lv = 'lever' + (Object.keys(V).filter(function (k) { return /^lever\d+$/.test(k); }).length + 1);
              need(lv, 0); lastLever = lv;
              E({ k: 'lever', name: '레버', pos: pos, scale: [0.4, 1.2, 0.4], look: { shape: 'cylinder', color: '#c0392b', label: '레버' }, body: { type: 'solid' }, comps: { lever: { var: lv, once: true } } });
              break;
            }
            case 'plate': {
              var pv = 'plate' + (Object.keys(V).filter(function (k) { return /^plate\d+$/.test(k); }).length + 1);
              need(pv, 0); lastLever = pv;
              E({ k: 'plate', name: '발판 스위치', pos: pos, scale: [1.6, 0.15, 1.6], look: { shape: 'box', color: '#f4a261' }, body: { type: 'trigger', size: [1, 4, 1] }, comps: { plate: { var: pv, stay: true, who: 'any' } } });
              break;
            }
            case 'gate': {
              if (!lastLever) { notes.push(th.lineNo + '줄: 열리는 문 앞에 레버나 발판 스위치가 없다 — 문이 안 열린다(레버 줄을 먼저 쓸 것)'); }
              E({ k: 'gate', name: nm || '철문', pos: pos, scale: [5, 4, 0.6], look: { shape: 'box', color: '#5d6d7e' }, body: { type: 'solid' }, comps: { door: { var: lastLever || 'lever1', value: '1', dx: 0, dy: 4.2, dz: 0, speed: 3 } } });
              if (!lastLever) { need('lever1', 0); }
              break;
            }
            case 'town': {
              var own = /나|우리|내|아군/.test(o['주인'] || th.opts.join(' ')) ? 'player' : /적/.test(o['주인'] || th.opts.join(' ')) ? 'enemy' : 'neutral';
              need('gold', 60); need('towns', 0); need('turn', 0);
              E({ k: 'town', name: nm || ('영지 ' + ((seq.town || 0) + 1)), pos: pos, look: { shape: 'model', model: BLD + 'LargeTower.glb', fit: 8, label: nm || '영지' }, body: { type: 'solid', size: [5, 8, 5] },
                comps: { town: Object.assign(SIM.compDefaults('town'), { name: nm || '', owner: own, troops: numOf(o['병력'], own === 'enemy' ? 40 : 30) }) } });
              break;
            }
          }
        }
      });
      sc.S = S;
    });

    /* 문 도착점 — 상대 장면에 되돌아오는 문이 있으면 그 곁, 없으면 플레이어 자리 */
    scenes.forEach(function (sc) {
      (sc.S.entities || []).forEach(function (e) {
        if (!e.comps || !e.comps.portal) { return; }
        var dst = scenes.filter(function (x) { return x.id === e.comps.portal.scene; })[0];
        var back = dst.doors && dst.doors[sc.id], pl = dst.S.entities[0].pos;
        var at = back ? [back[0], 0, +(back[2] + (back[2] < pl[2] ? 3.5 : -3.5)).toFixed(1)] : pl.slice();
        if (!dst.S.entities.some(function (x) { return x.id === 'from_' + sc.id; })) {
          dst.S.entities.push({ id: 'from_' + sc.id, name: sc.name + '에서 온 자리', pos: at, rot: [0, back ? Math.round(Math.atan2(pl[0] - at[0], pl[2] - at[2]) * 180 / Math.PI) : 180, 0], scale: [1, 1, 1], look: { shape: 'none' }, body: { type: 'none' } });
        }
      });
    });

    /* 목표 → 이벤트. 여러 개면 다 이뤘을 때 이긴다(결승점이 있으면 그때 나타난다) */
    var allScenes = scenes.map(function (s) { return s.S; });
    var goalScene = scenes.filter(function (s) { return s.hasGoal; })[0];
    var conds = [];   // {text, evs:[{scene, when}]}
    goals.forEach(function (g) {
      var t = g.text, n = numOf(t, null), hit = null;
      if (/결승|깃발|출구|도착|골인/.test(t) && !/모으|모아|쓰러|물리|처치|잡/.test(t)) {
        if (!goalScene) { notes.push(g.lineNo + '줄: 목표에 결승점이 있는데 장면에 "결승" 줄이 없다'); }
        return;   // 결승점 자체가 이김
      }
      if (/(\d+)\s*초/.test(t) && /버티|살아|견디/.test(t)) {
        conds.push({ say: t, text: t, scene: allScenes[0], when: { on: 'every', sec: n } }); return;
      }
      if (/레벨/.test(t) && n) {
        if (!P.level) { need('exp', 0); need('lv', 1); P.level = { expVar: 'exp', lvVar: 'lv', base: 30, atk: 0.15, hpVar: 'hp', hp: 1 }; }
        conds.push({ say: t, text: '레벨 {lv}/' + n, scene: null, when: { on: 'var', var: 'lv', op: '>=', value: String(n) } }); return;
      }
      if (/모두|전부|다 /.test(t) && /적|몬스터|괴물/.test(t) && /쓰러|물리|처치|잡|없애/.test(t)) {
        var fsc = allScenes.filter(function (s) { return s.entities.some(function (e) { return e.tag === 'foe' && !e.off; }); })[0];
        if (fsc) { conds.push({ say: t, text: t, scene: fsc, when: { on: 'gone', b: '#foe' } }); } else { notes.push(g.lineNo + '줄: 쓰러뜨릴 적이 없다'); }
        return;
      }
      if (/쓰러|물리|처치|잡|무찌|이기/.test(t)) {
        nameIndex.forEach(function (x) { if (!hit && (x.kind === 'boss' || x.kind === 'foe') && t.indexOf(x.name) >= 0) { hit = x; } });
        if (!hit && /보스|두목|마왕/.test(t)) { hit = nameIndex.filter(function (x) { return x.kind === 'boss'; })[0]; }
        if (hit) { conds.push({ say: t, text: t, scene: hit.sc, when: { on: 'destroyed', b: hit.id } }); } else { notes.push(g.lineNo + '줄: 목표의 적 "' + t + '" 를 장면에서 못 찾았다'); }
        return;
      }
      if (/만나|말 ?걸|이야기|대화/.test(t)) {
        nameIndex.forEach(function (x) { if (!hit && (x.kind === 'npc' || x.kind === 'companion') && t.indexOf(x.name) >= 0) { hit = x; } });
        if (hit) { conds.push({ say: t, text: t, scene: hit.sc, when: { on: 'act', b: hit.id } }); } else { notes.push(g.lineNo + '줄: 목표의 사람 "' + t + '" 를 장면에서 못 찾았다'); }
        return;
      }
      /* 모으기 — 아는 줍는 것 이름 */
      var vname = null;
      Object.keys(ITEMVAR).concat(Object.keys(itemNames).map(function (k) { return itemNames[k]; })).sort(function (a, b) { return b.length - a.length; })
        .forEach(function (w) { if (!vname && t.indexOf(w) >= 0) { vname = w; } });
      if (vname) {
        var vv = itemVar(vname), goalN = n || Math.max(1, allScenes.reduce(function (a, s) { return a + s.entities.filter(function (e) { return e.comps && e.comps.pickup && e.comps.pickup.var === vv; }).length; }, 0));
        conds.push({ say: t, text: vname + ' {' + vv + '}/' + goalN, scene: null, when: { on: 'var', var: vv, op: '>=', value: String(goalN) } });
        return;
      }
      notes.push(g.lineNo + '줄: 목표를 못 알아들었다 — "' + t + '" (예: 동전 10개 모으기 · 두목 쓰러뜨리기 · 적 모두 쓰러뜨리기 · 60초 버티기 · 레벨 5 · 결승까지)');
    });

    var total = conds.length;
    if (total) {
      need('goalsDone', 0);
      /* 목표마다 표식 변수 — 변수 목표는 장면마다 같은 이벤트가 있고, 장면을 다시 오면 적이 되살아나니 한 번만 세게 막는다 */
      conds.forEach(function (c, i) {
        var flag = 'goal' + (i + 1); need(flag, 0);
        var ev = { when: c.when, if: [{ var: flag, op: '==', value: '0' }], once: true,
          do: [{ do: 'set', var: flag, value: 1 }, { do: 'add', var: 'goalsDone', value: 1 }, { do: 'toast', text: '목표 달성: ' + c.say, sec: 3 }, { do: 'sound', name: 'win' }] };
        (c.scene ? [c.scene] : allScenes).forEach(function (s) { s.events.push(SIM.clone(ev)); });
      });
      if (goalScene) {
        goalScene.S.entities.forEach(function (e) { if (e.id === 'goal') { e.hidden = true; } });
        goalScene.S.events.push({ when: { on: 'var', var: 'goalsDone', op: '>=', value: String(total) }, once: true, do: [{ do: 'toast', text: '결승점이 나타났다!', sec: 3 }, { do: 'show', target: 'goal' }] });
      } else {
        allScenes.forEach(function (s) { s.events.push({ when: { on: 'var', var: 'goalsDone', op: '>=', value: String(total) }, once: true, do: [{ do: 'win', text: '모든 목표를 이뤘다!' }] }); });
      }
      P.goals = conds.slice(0, 2).map(function (c) { return c.text; }).concat([total > 2 ? '그 밖 ' + (total - 2) + '개' : goalScene ? '그다음 결승점으로' : '']);
      while (P.goals.length < 3) { P.goals.push(''); }
      P.goals = P.goals.slice(0, 3);
    } else if (goalScene) {
      P.goals = ['결승점까지', '', ''];
    } else if (!goals.length) {
      notes.push('목표 줄이 없다 — 끝없이 노는 판이 된다(예: "목표: 동전 10개 모으기")');
    }

    /* HUD — 체력 + 목표에 쓰인 줍는 것 + 돈 */
    P.hud.push(style === 'simple' || style === 'zelda' ? { var: 'hp', label: '체력', style: 'hearts' } : { var: 'hp', label: '체력' });
    Object.keys(itemNames).forEach(function (v) { if (P.hud.length < 4 && conds.some(function (c) { return c.when.var === v; })) { P.hud.push({ var: v, label: itemNames[v] }); } });
    if ('gold' in V && P.hud.length < 4) { P.hud.push({ var: 'gold', label: '돈' }); }
    if (P.level && P.hud.length < 5) { P.hud.push({ var: 'lv', label: '레벨' }); }
    /* 가방 — 쓰는 물건(포션)만 */
    if ('potion' in V) { P.items = [{ icon: '🧪', name: '포션', var: 'potion', desc: '체력을 채운다', useVar: 'hp', useAmt: P.combat.potionHeal || 2 }]; }

    return { project: P, notes: notes, stats: { scenes: P.scenes.length, entities: P.scenes.reduce(function (a, s) { return a + s.entities.length; }, 0), goals: total } };
  }

  /* ── 도움말·AI 안내문 ─────────────────────────────────────────────────── */
  function kindList() {
    return KINDS.map(function (K) { return K.w.slice(0, K.k === 'animal' ? 12 : 6).join('·'); });
  }
  var EXAMPLE = [
    '제목: 불의 동굴',
    '설명: 마을에서 부탁을 받고 동굴의 두목을 쓰러뜨린다',
    '전투: 젤다식',
    '시점: 3인칭',
    '체력: 6',
    '능력: 달리기, 활공',
    '',
    '장면: 들녘 마을',
    '  음악: 잔잔',
    '  나무 14',
    '  집 3',
    '  주민: 어르신 "어서 오게, 여행자." "동굴의 두목을 부탁하네."',
    '  상점: 잡화점 (포션 10, 씨앗 3)',
    '  약초 5',
    '  보물상자 2',
    '  적: 들개 ×3 (체력 3)',
    '  문 → 어둑한 동굴',
    '',
    '장면: 어둑한 동굴',
    '  하늘: 동굴',
    '  바위 10',
    '  적: 해골 궁수 ×2 (원거리)',
    '  보스: 두목 (체력 24)',
    '  문 → 들녘 마을',
    '',
    '목표: 약초 3개 모으기',
    '목표: 두목 쓰러뜨리기'
  ].join('\n');
  var HELP = [
    '한 줄에 하나씩 쓴다. "#" 로 시작하는 줄은 메모.',
    '',
    '[게임 전체]',
    '제목: …  /  설명: …',
    '전투: 간단 · 원신식 · 젤다식 · 파판식 · 없음',
    '시점: 3인칭 · 1인칭 · 쿼터뷰 · 옆 · 고정',
    '체력: 숫자  /  돈: 숫자  /  레벨: 켬',
    '능력: 달리기, 활공, 등반, 점프 없음',
    '스킬: 기탄, 파동, 회오리, 연쇄 번개, 치유, 소환  (간단·젤다식 — 넷까지)',
    '시간: 흐름 · 실제 · 없음  /  날씨: 자동 · 맑음 · 비 · 눈 · 안개  /  계절: 봄 · 여름 · 가을 · 겨울',
    '그래픽: 툰, 외곽선, 둥근 세상',
    '',
    '[장면] "장면: 이름" 다음 줄부터 그 장면. 첫 장면에서 시작한다.',
    '하늘: 맑음 · 노을 · 밤 · 흐림 · 동굴 · 사막 · #색  /  땅: 풀 · 모래 · 눈 · 돌 · 흙 · 동굴 · #색',
    '크기: 70(m)  /  언덕: 낮음 · 보통 · 높음  /  음악: 잔잔 · 모험 · 장터 · 전투 · 보스 · 밤 · 동굴 · 없음',
    '',
    '[놓을 것] 종류 [이름] [개수] [(옵션, 옵션)] ["대사" "대사"]',
    '  개수: 12 · ×3 · 5개 · 3마리 — 자리는 알아서 흩어 놓는다',
    '  적·보스 옵션: 체력 30, 공격 5, 방어 2, 원소 불, 원거리, 빠르기 4',
    '  상점 옵션: (포션 10, 씨앗 3) — 이름 값',
    '  문: "문 → 장면 이름" — 도착 자리는 알아서. 레버·발판 스위치 다음 줄의 "철문" 은 그 스위치로 열린다',
    '  적 이름에 동물(늑대·곰·호랑이…)이나 슬라임·해골·박쥐·골렘·유령·기사·궁수·마법사가 들면 그 모습',
    '종류:',
  ].concat(kindList().map(function (x) { return '  ' + x; })).concat([
    '',
    '[목표] 여러 개면 다 이뤄야 이긴다(결승이 있으면 그때 나타난다)',
    '목표: 동전 10개 모으기 · 약초 3개 · 두목 쓰러뜨리기 · 적 모두 쓰러뜨리기 · 어르신 만나기 · 60초 버티기 · 레벨 5 · 결승까지'
  ]).join('\n');
  var AI_PROMPT = [
    '너는 "사가 엔진" 게임 설명서 작가다. 아래 형식 그대로, 설명서 글만 써라(설명·코드 블록·머리말 없이).',
    '규칙: 실존 역사 인물·유명 작품 캐릭터의 실명을 쓰지 않는다(이름은 지어낸다). 장면 이름은 문 줄과 똑같이. 한 장면에 놓는 것은 40개 안팎.',
    '',
    '[형식]',
    HELP,
    '',
    '[예시]',
    EXAMPLE,
    '',
    '[만들 게임]',
    '(여기에 원하는 게임을 적는다)'
  ].join('\n');

  var API = { build: build, splitThing: splitThing, HELP: HELP, EXAMPLE: EXAMPLE, AI_PROMPT: AI_PROMPT, KINDS: KINDS };
  root.SagaBrief = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
})(typeof window !== 'undefined' ? window : globalThis);
