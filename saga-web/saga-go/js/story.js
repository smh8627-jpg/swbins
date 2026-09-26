/**
 * 이야기 임무 1~4장 — 대화 창·금빛 기둥·목록(O)·단계 아홉 가지 (PLAN §5 ⑲-12·⑲-13, saga-godot PLAN 106 ㉕㉗㉘㉙)
 * ---------------------------------------------------------------
 *   인물 넷    청하 촌장 누리(고향 마을) · 늙은 사공 버들(갈대 나루 탑) · 떠돌이 학자 은비(옛 성터 언덕 탑) —
 *              ⑮ 땅의 "고향에서 가장 가까운 탑" 곁에 늘 서 있다. 지금 단계가 아니면 혼잣말 한 줄.
 *              가면 쓴 나그네는 4장 둘째~여섯째 단계에만 고향 남쪽 다리목에 서고, 따라가기를 지나면 길 끝에 선다
 *   단계       talk(곁에서 💬/F → 대화) · go(그 자리 반경 안) · boss(그 탑 ⑪ 수호자 — 이미 쓰러져 꽃을 기다리면 바로 넘김) ·
 *              kill(임무 적 무리 `sq:` — 되살아나지 않고 전리품 없음) · light(옛 제단에 어느 원소든 스킬·해방) ·
 *              domain(먹구름 제단 또는 id 로 고른 숨은 터 깨기 — `domain:clear`) · gather(그 채집물 n 번 — `cook:gather`) ·
 *              cook(아무 요리 하나 — `cook:done`) · follow(인물이 길 점을 따라 걷는다 — 가까우면 걷고 멀면 선다)
 *   장         여정 등급(플레이어 Lv) ar 에 열린다. 단계마다 부대 경험 10, 장 끝에 보상
 *   대화       글이 초당 30자로 흘러나온다 — F·Space·누르기 한 번이면 줄 전체, 한 번 더면 다음 줄. 고른 대답은 "나" 의 줄로
 *              한 번 나온다. 줄 셋째 칸은 표정(joy·angry·sorrow·surprised·fun). 카메라·입·손짓은 `talkShot()` 을 world3d 가
 *              읽어 `talkface.js` 로 그린다
 *   화면       목표에 금빛 기둥(3D) · 위쪽 추적 한 줄(장·목표·거리) · 미니맵 금빛 점 · O(📖 단추) 목록
 * 세이브 `save.story = { ch, step }` 하나(읽는 쪽 기본값 — SAVE_VERSION 그대로). 임무 적·제단·채집 센 수·따라가기 길은
 * 저장하지 않는다(불러오면 그 단계 처음). 이름·대사는 saga-godot `data/story.gd`(가상 마을 사람)를 옮겼다.
 * 손잡이 `story.on` 0 이면 다 사라진다. 자리는 칸 좌표가 아니라 ⑮ 땅의 탑이라 GPS 판에서도 같은 곳이다.
 */
(function (global) {
  'use strict';

  function core() { return global.DG.core; }
  function BM() { var b = global.DG.biome; return b && b.on && b.on() ? b : null; }
  function FC() { return global.DG.fieldCombat || null; }
  function CK() { return global.DG.cooking || null; }
  function K(key, def) { return core().tuned('story.' + key, def); }
  function on() { return !!(K('on', 1) && BM()); }
  function gps() { var W = global.DG.world; return !!(W && W.mode === 'geo'); }
  function TALK_R() { return gps() ? 15 : 6; }
  function GO_R() { return gps() ? 60 : 30; }
  function LIGHT_R() { return 2.5; }               // 원소 신호 고리 반지름 + 이만큼 안에 제단이 들면 켜진다
  function FOLLOW_NEAR() { return gps() ? 25 : 12; } // 이 안이면 따라가는 인물이 걷는다
  function FOLLOW_LOST() { return gps() ? 60 : 30; } // 이보다 멀면 추적 글 "너무 멀다"
  function REVEAL_CPS() { return K('reveal', 30); }  // 초당 글자 — 0 이면 한 번에
  var STEP_EXP = 10, KILL_NEAR = 150, IDLE_R = 12, IDLE_GAP = 45000, FOLLOW_SPEED = 2.6, GATHER_R = 900, POT_R = 6000;

  /* 인물 — zone 은 ⑮ 땅 key(고향은 'home'), off 는 그 땅 탑에서 떨어진 자리(m).
     appear 가 있으면 그 장(ch, 0부터)의 단계 from~to 에만 선다 */
  var NPCS = {
    elder:    { id: 'story_elder',    name: '청하 촌장 누리', short: '누리', zone: 'home',    off: [-22, 16],  color: '#6b7f61', idle: '먹구름이 걷히면 마을 잔치를 열어야지.' },
    ferryman: { id: 'story_ferryman', name: '늙은 사공 버들', short: '버들', zone: 'galdae',  off: [-18, -24], color: '#4d6688', idle: '물 냄새가 요즘 영 비릿해.' },
    scholar:  { id: 'story_scholar',  name: '떠돌이 학자 은비', short: '은비', zone: 'gojeong', off: [-18, -24], color: '#8c6b99', idle: '이 비문, 읽을수록 이상하다니까.' },
    wanderer: { id: 'story_wanderer', name: '가면 쓴 나그네', short: '나그네', zone: 'home',  off: [8, 70],    color: '#38384a', idle: '……',
      mask: true, appear: { ch: 3, from: 1, to: 5 } }
  };
  var NPC_KEYS = ['elder', 'ferryman', 'scholar', 'wanderer'];
  /* 나그네가 걷는 길 — 고향 남쪽 다리목(첫 점 = 나그네 자리)에서 남쪽 들녘까지(+y 가 남쪽) */
  var WANDER_PATH = [[8, 70], [-4, 76], [-4, 104], [-4, 122], [20, 134], [38, 138]];

  /* 장 — 줄 = [말하는 이, 글, 표정?] · 고르는 줄 = ['?', [대답, 대답]](대답만 다르고 흐름은 같다) */
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
          lines: [['버들', '수호자를 쓰러뜨렸다고? 허, 그놈도 먹구름에 홀렸던 게야.', 'surprised'],
            ['버들', '먹구름은 이 나루 건너 제단에서 피어오르지. 거기 오래 잠든 이무기가 있다더군.'],
            ['?', ['이무기요?', '어떻게 막죠?']],
            ['버들', '옛 성터의 학자가 비문을 읽고 있다던데, 그 아이한테 가 봐. 요즘 성터 어귀에 졸개들이 들끓는다니 조심하고.']] },
        { type: 'kill', zone: 'gojeong', off: [40, -30], kinds: ['raptor', 'raptor', 'imp', 'imp'], text: '옛 성터 어귀의 먹구름 졸개 물리치기' },
        { type: 'talk', npc: 'scholar', text: '떠돌이 학자와 이야기하기',
          lines: [['은비', '살았다! 졸개들 때문에 비문 곁엔 가지도 못했어.', 'joy'],
            ['은비', '여길 봐. \'제단에 원소의 불을 밝히면 잠든 것의 이름이 드러난다\' — 네 힘이면 될지도 몰라.']] },
        { type: 'light', zone: 'gojeong', off: [-30, 26], text: '옛 제단에 원소 스킬로 불 밝히기' },
        { type: 'talk', npc: 'elder', text: '청하 촌장에게 알리기',
          lines: [['누리', '먹구름 이무기라… 옛이야기인 줄로만 알았는데.', 'sorrow'],
            ['누리', '고맙다. 네 덕에 마을이 한시름 놓았구나. 이건 마을이 모은 작은 성의란다.', 'joy'],
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
          lines: [['누리', '하늘이… 개었구나! 몇 해 만에 보는 맑은 하늘이냐.', 'joy'],
            ['누리', '이무기는 또 깨어날지 모르지만, 네가 있으니 든든하다. 잔치 준비를 해야겠구나!'],
            ['누리', '참, 은비가 너와 함께 다니고 싶다더구나. 비문 읽는 솜씨가 싸움에도 쓸모 있을 게다.', 'fun']] }
      ] },
    { id: 'ch3', name: '제3장 · 잔칫날의 불청객', ar: 7,
      reward: { knot: 3, gold: 1250, guide: 2, secret: 1, party: 600 },
      steps: [
        { type: 'talk', npc: 'elder', text: '촌장에게 잔치 일손을 돕겠다고 하기',
          lines: [['누리', '하늘이 갠 기념으로 잔치를 열기로 했단다. 그런데 일손이 모자라구나.'],
            ['누리', '들에 피는 청하란을 셋만 꺾어다 주렴. 잔칫상에 꽂을 꽃이란다.'],
            ['?', ['맡겨 주세요.', '음식은요?']],
            ['누리', '꽃을 꺾거든 역참 솥에서 요리도 하나 해 오렴. 사공 버들이 요즘 통 입맛이 없다더구나.']] },
        { type: 'gather', item: 'orchid', count: 3, text: '청하란 꺾기' },
        { type: 'cook', text: '역참 곁 솥에서 요리 하나 만들기' },
        { type: 'talk', npc: 'ferryman', text: '갈대 나루의 사공에게 요리 가져다주기',
          lines: [['버들', '오, 냄새 좋구나! 이 늙은이를 다 챙겨 주고.', 'joy'],
            ['버들', '그런데 말이다, 어젯밤 가마골 쪽 하늘이 벌겋더구나. 불도깨비 우두머리가 또 날뛰는 게야.'],
            ['?', ['제가 가 볼게요.', '잔치에 불똥이 튀면 큰일이네요.']],
            ['버들', '그놈 불씨가 바람을 타고 마을로 날아들면 잔치고 뭐고 다 타 버릴 게다. 조심하거라.', 'angry']] },
        { type: 'boss', zone: 'gamagol', text: '가마골 수호자를 쓰러뜨리기' },
        { type: 'talk', npc: 'scholar', text: '떠돌이 학자에게 가마골 소식 전하기',
          lines: [['은비', '가마골 수호자를 잡았다고? 마침 잘 왔어. 비문 둘째 조각을 찾았거든.'],
            ['은비', '\'가면 쓴 나그네가 제단을 두드려 잠든 것을 깨웠다\' — 이무기는 스스로 깨어난 게 아니었어.', 'surprised'],
            ['?', ['가면 쓴 나그네?', '누가 그런 짓을?']],
            ['은비', '가마골 잠든 무덤 안쪽에 그 나그네가 남긴 흔적이 있을지도 몰라. 가 보자.']] },
        { type: 'domain', did: 'd:gamagol', text: '가마골 잠든 무덤에서 나그네의 흔적 찾기' },
        { type: 'kill', zone: 'home', off: [-10, 26], kinds: ['imp', 'imp', 'imp', 'hawk'], text: '잔치 마당에 쳐들어온 불도깨비 졸개 물리치기' },
        { type: 'talk', npc: 'elder', text: '청하 촌장에게 알리기',
          lines: [['누리', '휴, 네가 없었으면 잔치 마당이 잿더미가 될 뻔했구나.', 'sorrow'],
            ['누리', '가면 쓴 나그네라… 옛이야기에 그런 자가 있었지. 먹구름이 올 때마다 어딘가에 서 있었다던.'],
            ['누리', '오늘은 걱정 말고 실컷 먹고 즐기렴. 이건 잔치 손님께 드리는 선물이란다.', 'joy']] }
      ] },
    { id: 'ch4', name: '제4장 · 가면 쓴 나그네', ar: 10,
      reward: { knot: 3, gold: 1500, guide: 2, secret: 2, party: 650 },
      steps: [
        { type: 'talk', npc: 'elder', text: '촌장에게 새벽 소식 듣기',
          lines: [['누리', '잔치 이튿날 새벽이었단다. 남쪽 다리목에 웬 가면 쓴 나그네가 서 있더래.'],
            ['누리', '말을 걸어도 대꾸도 않고 강물만 보더라는구나. 옛이야기 속 그자일까…'],
            ['?', ['제가 만나 볼게요.', '위험한 사람일까요?']],
            ['누리', '조심하거라. 먹구름이 올 때마다 서 있었다던 자라면, 좋은 뜻인지 나쁜 뜻인지 아무도 모른단다.', 'sorrow']] },
        { type: 'talk', npc: 'wanderer', text: '남쪽 다리목의 가면 쓴 나그네에게 말 걸기',
          lines: [['나그네', '……먹구름을 걷어 낸 게 너로군.'],
            ['나그네', '여기선 귀가 많다. 할 말이 있으면 따라오게.'],
            ['?', ['따라가죠.', '당신은 누구죠?']],
            ['나그네', '걸으면서 생각해 보게. 너무 떨어지면 기다려 주지 않을 테니.']] },
        { type: 'follow', npc: 'wanderer', text: '가면 쓴 나그네를 놓치지 않고 따라가기' },
        { type: 'talk', npc: 'wanderer', text: '남쪽 들녘에서 나그네의 말 듣기',
          lines: [['나그네', '여기라면 듣는 이가 없겠지. 이무기를 깨운 건 내가 아니다.'],
            ['나그네', '나는 제단을 두드리고 다니는 자를 쫓고 있을 뿐이다. 그자도 가면을 쓰지 — 그래서 다들 나로 착각하더군.'],
            ['?', ['그럼 진짜는 따로 있다는 거예요?', '증거라도 있나요?']],
            ['나그네', '증거라… 마침 저기 풀숲이 수상하군. 너도 쫓기고 있었던 모양이다.']] },
        { type: 'kill', zone: 'home', off: [48, 146], kinds: ['imp', 'imp', 'snowfox', 'rockbear'], text: '들녘에 숨어 있던 가면 졸개 물리치기' },
        { type: 'talk', npc: 'wanderer', text: '나그네에게 돌아가기',
          lines: [['나그네', '제법이군. 이 졸개들이 쓴 가면을 보게 — 내 것과 무늬가 다르지.'],
            ['나그네', '이 조각을 옛 성터의 학자에게 보이게. 비문을 읽는 아이라면 알아볼 게다.'],
            ['나그네', '우린 또 만나겠지. 다음 먹구름이 오기 전에.']] },
        { type: 'talk', npc: 'scholar', text: '떠돌이 학자에게 가면 조각 보이기',
          lines: [['은비', '가면 조각? 어디 봐… 이 무늬, 비문 맨 아래 새겨진 거랑 똑같아!', 'surprised'],
            ['은비', '비문엔 제단이 다섯이라고 적혀 있어. 먹구름 제단은 그중 하나일 뿐이고.'],
            ['?', ['나머지 넷은 어디에?', '가면 쓴 자는 누구죠?']],
            ['은비', '아직은 몰라. 하지만 조각이 모이면 알 수 있을 거야. 서쪽 고개 너머 옛길을 먼저 뒤져 볼게.']] },
        { type: 'talk', npc: 'elder', text: '청하 촌장에게 알리기',
          lines: [['누리', '나그네가 쫓는 가면 쓴 자라… 먹구름이 다섯 번이나 더 올 수 있다는 말이냐.', 'sorrow'],
            ['누리', '네가 있어 다행이구나. 마을 사람들 몫으로 모은 것이니 받아 두렴.']] }
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
  function followIdx() { var L = CHAPTERS[3].steps; for (var i = 0; i < L.length; i++) { if (L[i].type === 'follow') { return i; } } return -1; }
  /** 나그네 자리 — 4장 단계 si 기준: 따라가기 앞이면 다리목, 따라가는 중이면 걷는 자리, 지나면 길 끝 */
  function wandererAt(si) {
    var fi = followIdx();
    if (si === fi && fol) { return { x: fol.x, y: fol.y }; }
    return at('home', si > fi ? WANDER_PATH[WANDER_PATH.length - 1] : WANDER_PATH[0]);
  }
  /** 인물 k 가 지금 서 있나 — appear 가 없으면 늘 */
  function visible(k) {
    var n = NPCS[k], ap = n && n.appear, s = sv();
    if (!n) { return false; }
    if (!ap) { return true; }
    return s.ch === ap.ch && s.step >= ap.from && s.step <= ap.to && !locked();
  }
  /** 인물 자리 — si(4장 단계)를 주면 그 단계 기준(목표 계산용), 안 주면 지금 기준 */
  function npcPos(k, si) {
    var n = NPCS[k];
    if (!n) { return null; }
    if (k === 'wanderer') { return wandererAt(typeof si === 'number' ? si : (sv().ch === 3 ? sv().step : 0)); }
    return at(n.zone, n.off);
  }
  function altarPos() {
    var DM = global.DG.domain, L = DM && DM.list ? DM.list() : [];
    for (var i = 0; i < L.length; i++) { if (L[i].kind === 'weekly') { return { x: L[i].x, y: L[i].y, id: L[i].id }; } }
    return null;
  }
  function cellOf(zk) {
    var a = anchorOf(zk), B = BM();
    return a && B ? B.cellAt.apply(null, a.key.split('_').map(Number)) : null;
  }
  function stepIdx(st) {
    for (var c = 0; c < CHAPTERS.length; c++) { var i = CHAPTERS[c].steps.indexOf(st); if (i >= 0) { return i; } }
    return -1;
  }
  /* gather·cook 목표는 둘레를 훑어야 해 칸(10m)·센 수가 같으면 다시 쓴다 */
  var aimMemo = { k: '', v: null };
  function gatherAim(st) {
    var p = pos(), C = CK(), mk = 'g' + st.item + ':' + Math.round(p.x / 10) + ',' + Math.round(p.y / 10) + ':' + (prog.n || 0);
    if (aimMemo.k === mk) { return aimMemo.v; }
    var best = null, bd = Infinity, L = C && C.near ? C.near(p.x, p.y, GATHER_R) : [], i;
    for (i = 0; i < L.length; i++) {
      if (L[i].item !== st.item || !C.available(L[i])) { continue; }
      var d = Math.hypot(L[i].x - p.x, L[i].y - p.y);
      if (d < bd) { bd = d; best = L[i]; }
    }
    aimMemo = { k: mk, v: best ? { x: best.x, y: best.y } : at('home', [0, 0]) };
    return aimMemo.v;
  }
  function potAim() {
    var p = pos(), C = CK(), mk = 'p:' + Math.round(p.x / 10) + ',' + Math.round(p.y / 10);
    if (aimMemo.k === mk) { return aimMemo.v; }
    var L = C && C.potsNear ? C.potsNear(p.x, p.y, POT_R) : [];
    aimMemo = { k: mk, v: L.length ? { x: L[0].x, y: L[0].y } : at('home', [0, 0]) };
    return aimMemo.v;
  }
  /** 단계의 목표 자리 — { x, y, r?, label }. 세계 표·세이브만 읽는다 */
  function targetOf(st) {
    if (!st) { return null; }
    if (st.type === 'talk' || st.type === 'follow') {
      var p = npcPos(st.npc, st.npc === 'wanderer' ? stepIdx(st) : undefined);
      return p ? { x: p.x, y: p.y, r: st.type === 'talk' ? TALK_R() : 0, label: st.type === 'talk' ? NPCS[st.npc].name : st.text } : null;
    }
    if (st.type === 'go') {
      var g = st.altar ? altarPos() : at(st.zone, st.off);
      return g ? { x: g.x, y: g.y, r: GO_R(), label: st.text } : null;
    }
    if (st.type === 'boss') {
      var F = FC(), gd = F ? F.guardianAt(cellOf(st.zone)) : null;
      return gd ? { x: gd.x, y: gd.y, r: 0, label: st.text, rk: gd.region } : null;
    }
    if (st.type === 'domain') {
      var DM = global.DG.domain, al = st.did ? (DM && DM.byId ? DM.byId(st.did) : null) : altarPos();
      return al ? { x: al.x, y: al.y, r: 0, label: st.text } : null;
    }
    if (st.type === 'gather') { var ga = gatherAim(st); return ga ? { x: ga.x, y: ga.y, r: 0, label: st.text } : null; }
    if (st.type === 'cook') { var pa = potAim(); return pa ? { x: pa.x, y: pa.y, r: 0, label: st.text } : null; }
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
    prog = { key: '', n: 0 }; fol = null;
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
  function onDomain(e) {
    var st = step();
    if (!st || st.type !== 'domain' || !e) { return; }
    if (st.did ? e.id === st.did : e.kind === 'weekly') { advance(); }
  }
  /* 채집 센 수 — 단계 키가 바뀌면 0 부터(저장 안 함) */
  var prog = { key: '', n: 0 };
  function gathered() { return prog.key === keyOf() ? prog.n : 0; }
  function onGather(e) {
    var st = step();
    if (!st || st.type !== 'gather' || !e || e.item !== st.item) { return; }
    if (prog.key !== keyOf()) { prog = { key: keyOf(), n: 0 }; }
    prog.n += 1;
    if (prog.n >= st.count) { advance(); } else { toast('📖 ' + st.text + ' ' + prog.n + '/' + st.count); }
  }
  function onCook() { var st = step(); if (st && st.type === 'cook') { advance(); } }

  /* ── 따라가기 ─────────────────────────────────────────── */

  var fol = null;           // { key, i(지난 길 점), x, y, walking } — 저장 안 함
  function followState() {
    var st = step();
    if (!st || st.type !== 'follow') { fol = null; return null; }
    if (!fol || fol.key !== keyOf()) {
      var p0 = at('home', WANDER_PATH[0]);
      fol = { key: keyOf(), i: 0, x: p0.x, y: p0.y, walking: false };
    }
    return fol;
  }
  /** 한 박자 — 내가 가까우면 FOLLOW_SPEED 로 다음 길 점까지 걷고, 멀면 선다. 길 끝이면 단계를 끝낸다 */
  function stepFollow(dt) {
    var fs = followState();
    if (!fs) { return null; }
    var p = pos();
    if (Math.hypot(p.x - fs.x, p.y - fs.y) > FOLLOW_NEAR()) { fs.walking = false; return fs; }
    var left = FOLLOW_SPEED * (dt || 0);
    while (left > 0 && fs.i < WANDER_PATH.length - 1) {
      var nx = at('home', WANDER_PATH[fs.i + 1]), d = Math.hypot(nx.x - fs.x, nx.y - fs.y);
      if (d <= left) { fs.x = nx.x; fs.y = nx.y; fs.i += 1; left -= d; }
      else { fs.x += (nx.x - fs.x) / d * left; fs.y += (nx.y - fs.y) / d * left; left = 0; }
    }
    fs.walking = true;
    if (fs.i >= WANDER_PATH.length - 1) { fol = null; toast('🎭 나그네가 걸음을 멈췄다'); advance(); return null; }
    return fs;
  }

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
      var k = NPC_KEYS[i], np = visible(k) ? npcPos(k) : null;
      if (!np || (st && (st.type === 'talk' || st.type === 'follow') && st.npc === k)) { continue; }
      if (Math.hypot(p.x - np.x, p.y - np.y) <= IDLE_R && (!lastIdle[k] || now - lastIdle[k] > IDLE_GAP)) {
        lastIdle[k] = now;
        toast('💬 ' + NPCS[k].name + ' — ' + NPCS[k].idle);
      }
    }
  }

  /* ── 대화 ─────────────────────────────────────────────── */

  var talk = null;          // { st, i, shown(나온 글자 수), since(마지막 글자 뒤 초), reply(고른 대답|null) } — 창이 열려 있으면
  function nearTalk() {
    var st = step();
    if (!st || st.type !== 'talk' || !visible(st.npc)) { return null; }
    var np = npcPos(st.npc), p = pos();
    return np && Math.hypot(p.x - np.x, p.y - np.y) <= TALK_R() ? st : null;
  }
  function busy() {
    var D = global.DG;
    return !!((D.encounter && D.encounter.active) || (D.duel && D.duel.active) || (D.domain && D.domain.active && D.domain.active()) ||
      (document.body && document.body.classList.contains('sheet-open')));
  }
  /** 지금 창에 나온 줄 — 고른 대답이 있으면 "나" 의 줄 */
  function curLine() { return !talk ? null : (talk.reply !== null ? ['나', talk.reply] : talk.st.lines[talk.i]); }
  function lineLen(line) { return line && line[0] !== '?' ? String(line[1]).length : 0; }
  function fresh() { talk.shown = REVEAL_CPS() > 0 ? 0 : lineLen(curLine()); talk.since = 0; }
  /** 곁이면 대화를 연다 */
  function talkStart() {
    var st = nearTalk();
    if (!st || talk || busy()) { return false; }
    talk = { st: st, i: 0, shown: 0, since: 0, reply: null };
    fresh();
    paintTalk();
    return true;
  }
  function talking() { return !!talk; }
  /** 줄이 다 나왔나 */
  function lineFull() { var l = curLine(); return !l || l[0] === '?' || talk.shown >= lineLen(l); }
  /**
   * 누르기 한 번 — 글이 흘러나오는 중이면 줄 전체를 보이고, 다 나왔으면 다음 줄.
   * 고르는 줄이면 choice(0·1)로 대답을 고른다(대답이 "나" 의 줄로 한 번 나온다). 마지막 줄 뒤면 단계를 끝낸다
   */
  function next(choice) {
    if (!talk) { return false; }
    var line = curLine();
    if (line[0] === '?') {
      if (typeof choice !== 'number' || !line[1][choice]) { return false; }
      talk.reply = line[1][choice];
      fresh(); paintTalk();
      return true;
    }
    if (!lineFull()) { talk.shown = lineLen(line); talk.since = 0; paintTalk(); return true; }
    if (talk.reply !== null) { talk.reply = null; }
    talk.i += 1;
    if (talk.i >= talk.st.lines.length) { talk = null; paintTalk(); advance(); return true; }
    fresh(); paintTalk();
    return true;
  }
  function speakerOf(name, fallback) {
    if (name === '?' || name === '나') { return 'me'; }
    for (var i = 0; i < NPC_KEYS.length; i++) { if (NPCS[NPC_KEYS[i]].short === name) { return NPC_KEYS[i]; } }
    return fallback;
  }
  /**
   * 대화 연출이 읽는 값(world3d → talkface) — 대화가 없으면 null.
   * { who('me'|인물 key), npc(대화 상대 key), spk·lst({x,y} 말하는 이·듣는 이), speaking, vowel, open(0~1), emo, line }
   */
  function talkShot() {
    if (!talk) { return null; }
    var TF = global.DG.talkface, k = talk.st.npc, np = npcPos(k), p = pos(), line = curLine();
    if (!np) { return null; }
    var who = speakerOf(line[0], k), me = who === 'me', n = Math.floor(talk.shown);
    var txt = line[0] === '?' ? '' : String(line[1]);
    var open = txt && n > 0 ? Math.max(0, 1 - talk.since / (TF ? TF.MOUTH_CLOSE : 0.14)) : 0;
    return {
      who: who, npc: k, spk: me ? { x: p.x, y: p.y } : np, lst: me ? np : { x: p.x, y: p.y },
      speaking: !!txt && (n < txt.length || talk.since < 0.4), vowel: TF && n > 0 ? TF.vowelOf(txt.charAt(n - 1)) : null,
      open: open, emo: line[2] || null, line: talk.i * 2 + (talk.reply !== null ? 1 : 0)
    };
  }

  /* ── 화면 ─────────────────────────────────────────────── */

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmtDist(d) { return d >= 1000 ? (d / 1000).toFixed(1) + 'km' : Math.round(d) + 'm'; }
  /** 추적 한 줄 글 — 세이브·자리만 읽는다 */
  function trackText() {
    if (!on() || done()) { return ''; }
    var ch = chapter();
    if (locked()) { return '📖 ' + ch.name + ' — 여정 등급 ' + ch.ar + ' 에 열린다'; }
    var st = step(), t = targetOf(st), p = pos(), d = t ? Math.hypot(p.x - t.x, p.y - t.y) : 0;
    var what = st.text;
    if (st.type === 'gather') { what += ' ' + gathered() + '/' + st.count; }
    if (st.type === 'follow' && d > FOLLOW_LOST()) { what = '너무 멀다, 가까이!'; }
    return '📖 ' + ch.name + ' — ' + what + (t ? ' · ◆ ' + fmtDist(d) : '');
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
  function shownText() { var l = curLine(); return String(l[1]).slice(0, Math.floor(talk.shown)); }
  function paintTalk() {
    var box = el('story-talk');
    if (!box) { return; }
    if (!talk) { box.classList.remove('show'); box.innerHTML = ''; return; }
    var line = curLine(), acts;
    if (line[0] === '?') {
      acts = line[1].map(function (a, i) { return '<button class="btn primary" data-st-pick="' + i + '">' + esc(a) + '</button>'; }).join('');
      box.innerHTML = '<div class="st-box"><b class="st-who">나</b><p class="st-line">……</p><div class="st-acts">' + acts + '</div></div>';
    } else {
      box.innerHTML = '<div class="st-box" data-st-next="1"><b class="st-who">' + esc(line[0]) + '</b><p class="st-line">' + esc(shownText()) + '</p>' +
        '<div class="st-acts"><small class="muted">' + (talk.i + 1) + '/' + talk.st.lines.length + '</small>' +
        '<button class="btn primary" data-st-next="1">' + (talk.i + 1 < talk.st.lines.length || talk.reply !== null ? '다음 ▸' : '끝') + '</button></div></div>';
    }
    box.classList.add('show');
  }
  /** 흘러나오는 동안은 글 한 줄만 바꾼다 — 창을 통째로 다시 쓰면 누르던 단추가 바뀌어 누름이 빠진다 */
  function paintLine() {
    var box = document.getElementById('story-talk'), p = box && box.querySelector('.st-line');
    if (p && talk && curLine()[0] !== '?') { p.textContent = shownText(); }
  }
  /** 글자 흘리기 한 박자 */
  function reveal(dt) {
    if (!talk) { return; }
    var line = curLine(), len = lineLen(line), cps = REVEAL_CPS();
    if (line[0] !== '?' && talk.shown < len && cps > 0) {
      var was = Math.floor(talk.shown);
      talk.shown = Math.min(len, talk.shown + cps * (dt || 0));
      if (Math.floor(talk.shown) !== was) { talk.since = 0; if (!global.DG_NO_DRAW) { paintLine(); } return; }
    }
    talk.since += dt || 0;
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
    var w = W3(), st = step(), t = st && !talk ? targetOf(st) : null, p = pos();
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

  /** 지금 세울 이야기 인물 — folk.live 와 같은 모양 `{p, x, y, walking, phase, ang, dist}`. 대화 상대는 나를 본다 */
  function live(p0, tms) {
    if (!on() || !p0) { return []; }
    var out = [], i, pp = pos(), fs = fol && step() && step().type === 'follow' ? fol : null;
    for (i = 0; i < NPC_KEYS.length; i++) {
      var k = NPC_KEYS[i], n = NPCS[k], q = visible(k) ? npcPos(k) : null;
      if (!q) { continue; }
      var d = Math.hypot(q.x - p0.x, q.y - p0.y);
      if (d > 110) { continue; }
      var a = anchorOf(n.zone), face = talk && talk.st.npc === k;
      out.push({ p: { id: n.id, name: n.name, color: n.color, rarity: 3, trait: 'virtue', story: k, mask: !!n.mask },
        x: q.x, y: q.y, walking: !!(k === 'wanderer' && fs && fs.walking), phase: (tms || 0) / 480,
        ang: face ? Math.atan2(pp.y - q.y, pp.x - q.x) : Math.atan2(a.y - q.y, a.x - q.x), dist: d });
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
    stepFollow(dt);
    reveal(dt);
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
    c.on('cook:gather', onGather);
    c.on('cook:done', onCook);
    if (!global.addEventListener || !document.body) { return; }
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target : null;
      if (!t) { return; }
      if (t.closest('#story-btn')) { talkStart(); }
      else if (t.closest('[data-st-pick]')) { next(+t.closest('[data-st-pick]').getAttribute('data-st-pick')); }
      else if (t.closest('[data-st-next]')) { next(); }
      else if (t.closest('[data-st-close]')) { toggleList(false); }
      else if (t.closest('#story-track')) { toggleList(); }
    });
    global.addEventListener('keydown', function (e) {
      var tag = e.target && e.target.tagName;
      if (!on() || e.repeat || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') { return; }
      var k = (e.key || '').toLowerCase();
      if (talk) {
        if (curLine()[0] === '?') { if (k === '1' || k === '2') { e.preventDefault(); next(+k - 1); } return; }
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
    NPCS: NPCS, CHAPTERS: CHAPTERS, STEP_EXP: STEP_EXP, WANDER_PATH: WANDER_PATH, FOLLOW_SPEED: FOLLOW_SPEED,
    FOLLOW_NEAR: FOLLOW_NEAR, FOLLOW_LOST: FOLLOW_LOST,
    on: on, anchorOf: anchorOf, npcPos: npcPos, visible: visible, targetOf: targetOf, trackText: trackText, listHtml: listHtml,
    state: sv, chapter: chapter, step: step, locked: locked, done: done, keyOf: keyOf, gathered: gathered,
    advance: advance, check: check, stepFollow: stepFollow, nearTalk: nearTalk, talkStart: talkStart, talking: talking, next: next,
    lineFull: lineFull, curLine: curLine, reveal: reveal, talkShot: talkShot,
    live: live, marker: marker, toggleList: toggleList, init: init, tick: tick,
    _resetForTest: function () {
      talk = null; lastIdle = {}; anchorMemo = {}; lastTrack = ''; lastBtn = ''; listOpen = false;
      fol = null; prog = { key: '', n: 0 }; aimMemo = { k: '', v: null };
    }
  };
})(window);
