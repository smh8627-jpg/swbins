/**
 * 세계 임무(곁가지) 셋 — 표만 (PLAN §5 ⑲-21, saga-godot PLAN 106 ㊴ `data/world_quests.gd`)
 * ---------------------------------------------------------------
 * 진행은 story.js — 이야기 임무와 **같은 단계 엔진**이고, "따라가는 임무" 하나만 목표·추적 글·임무 적이 선다.
 *   맡는 법   맡길 사람(giver) 머리 위 푸른 ! — 곁에서 말을 걸면(F) 그 임무가 시작되고 따라가는 임무가 된다
 *   이어 가기 따라가지 않는 임무도 다음 단계가 대화면 그 사람에게 말을 걸어 잇는다(그 순간 그 임무로).
 *             세계 임무를 따라가는 중에 이야기 인물에게 말을 걸면 이야기로 넘어간다. O 목록에서 따라갈 것을 고른다
 *   바꾸면    그 단계 처음부터(임무 적·제단·석등은 저장 안 함 — 이야기와 같은 규칙)
 * 인물 칸은 story.js NPCS 와 같은 꼴(zone = ⑮ 땅 key, off = 그 땅 탑에서 m). appear 칸 {wq, from, to} 는 그 임무 단계 동안만.
 * runPath 가 있는 인물은 쫓기(chase) 단계에서 그 길을 달린다. pet 이면 사람 몸 대신 들판 적 몸(`pet:fc_<pet>`)으로 선다.
 * era 는 표시 글자에만(이름 옆 작은 글씨). **전체 퓨전**(SAGA-DESIGN §12·§13) — 임무마다 과거·현대·미래 인물이 한 사건에.
 * 이야기·이름은 이 판 것(가명 · 실존 인물 없음). 보상은 이 판 척도(이야기 장 보상 기준).
 */
(function (global) {
  'use strict';

  var STEP_EXP = 8;

  var NPCS = {
    wq_postmaster: { id: 'wq_postmaster', name: '역참지기 묵호', short: '묵호', era: '과거', zone: 'home', off: [36, -8], color: '#80603e',
      idle: '파발 말은 늙었어도 편지는 늘 제때 가야지.' },
    wq_rider:      { id: 'wq_rider', name: '배달꾼 다래', short: '다래', era: '현대', zone: 'home', off: [54, 22], color: '#d9732a',
      idle: '오늘도 마을 한 바퀴! 짐칸 자물쇠만 말썽이야.', appear: [{ wq: 'wq_letters', from: 1, to: 3 }] },
    /* 둥실이 — 쫓기 길 첫 점이 제자리(다래 곁). 몸은 들판 적 정찰 드론(Quaternius CC0) */
    wq_dungsil:    { id: 'wq_dungsil', name: '배달 기계 둥실이', short: '둥실이', era: '미래', zone: 'home', off: [58, 26], color: '#8cd9f2', pet: 'drone',
      idle: '삐빅 — 배달 경로 다시 짜는 중.', appear: [{ wq: 'wq_letters', from: 2, to: 3 }],
      runPath: [[58, 26], [80, 4], [104, -22], [132, -14], [146, 18], [130, 52], [96, 64]] },
    wq_researcher: { id: 'wq_researcher', name: '바다 연구원 물결', short: '물결', era: '현대', zone: 'galdae', off: [22, 18], color: '#40808f',
      idle: '밤바다에 옛 등대 불빛 같은 게 깜박여. 기록해 둬야지.' },
    wq_hanbit:     { id: 'wq_hanbit', name: '등대 지기 한빛', short: '한빛', era: '미래', zone: 'galdae', off: [124, -6], color: '#66f2ff',
      idle: '신호 세기 백 분의 사. 불씨가 필요합니다.', appear: [{ wq: 'wq_lighthouse', from: 2, to: 4 }] },
    wq_byeori:     { id: 'wq_byeori', name: '시간 탐사대원 별이', short: '별이', era: '미래', zone: 'gojeong', off: [26, 18], color: '#d9e0f2',
      idle: '여기 연도 표시가 셋이나 겹쳐 보여. 시간 틈이 맞아.' },
    wq_dolsoe:     { id: 'wq_dolsoe', name: '옛 석공 돌쇠', short: '돌쇠', era: '과거', zone: 'gojeong', off: [-96, 16], color: '#736e61',
      idle: '돌은 거짓말을 안 하지. 사람이 할 뿐.', appear: [{ wq: 'wq_rift', from: 2, to: 6 }] }
  };

  var ORDER = ['wq_letters', 'wq_lighthouse', 'wq_rift'];

  /* 자리 — 등대 터(갈대 나루 탑 동쪽 130m — 둘레 10m 가 다 뭍이고 35m 안에 물)·틈 제단(옛 성터 탑 + [-90, 10]) */
  var LIGHT = [130, 0], RIFT = [-90, 10];
  function off(b, d) { return [b[0] + d[0], b[1] + d[1]]; }

  var QUESTS = {
    /* 마을 — 파발(과거)·오토바이 배달(현대)·배달 기계(미래)가 편지 세 통으로 엮인다 */
    wq_letters: { id: 'wq_letters', name: '바람에 흩어진 편지', place: '청하 마을', ar: 3, giver: 'wq_postmaster',
      reward: { gold: 600, guide: 2, knot: 1, party: 60 },
      steps: [
        { type: 'talk', npc: 'wq_postmaster', text: '역참지기 묵호의 부탁 듣기',
          lines: [['묵호', '어이, 거기 젊은이! 돌개바람이 역참 편지 자루를 뒤집어 놨지 뭔가.', 'surprised'],
            ['묵호', '세 통이 날아갔어. 한 통은 배달꾼 다래가 주웠다더군. 그 애는 늘 마을 들판을 누비지.'],
            ['?', ['찾아 드릴게요.', '편지가 그렇게 중요해요?']],
            ['묵호', '먼 데서 온 편지는 사람을 살리기도 하지. 부탁하네.']] },
        { type: 'talk', npc: 'wq_rider', text: '배달꾼 다래에게 편지 묻기',
          lines: [['다래', '아, 역참 편지? 한 통은 내 짐칸에 있어. 근데 둘째는…', 'fun'],
            ['다래', '배달 기계 둥실이가 물고 달아났어! 요즘 경로가 꼬였는지 아무거나 배달하려 들더라.', 'surprised'],
            ['?', ['잡아 올게요!', '기계가 편지를요?']],
            ['다래', '저기 날아간다! 걸어선 못 잡아 — 달려!']] },
        { type: 'chase', npc: 'wq_dungsil', text: '편지를 물고 달아나는 둥실이 따라잡기(달리기)',
          flee: '🏃 둥실이가 편지를 물고 날아간다 — 달려라!', caught: '🏃 둥실이를 붙잡았다 — 편지를 물고 있다',
          lost: '💨 놓쳤다 — 둥실이가 처음 자리로 돌아갔다. 다시 가까이 가면 달아난다' },
        { type: 'talk', npc: 'wq_dungsil', text: '붙잡힌 둥실이 달래기',
          lines: [['둥실이', '삐빅 — 수신인 확인 불가. 편지 한 통 반환합니다.', 'sorrow'],
            ['둥실이', '셋째 편지 위치 기록: 북서쪽 숲 언덕. 돌개바람 괴물이 둥지로 가져감. 경고 — 위험.', 'surprised'],
            ['?', ['고마워, 둥실아.', '괴물이라고?']],
            ['다래', '둥실이 경로는 내가 고쳐 둘게. 셋째 편지는 부탁해!', 'joy']] },
        { type: 'kill', zone: 'home', off: [-120, -110], kinds: ['hawk', 'hawk', 'boar'], text: '북서쪽 숲 언덕의 돌개바람 둥지에서 편지 되찾기' },
        { type: 'talk', npc: 'wq_postmaster', text: '묵호에게 편지 세 통 돌려주기',
          lines: [['묵호', '세 통 다! 이 늙은이 체면이 섰네.', 'joy'],
            ['묵호', '허허, 봉투를 보게 — 하나는 옛 파발 도장, 하나는 요즘 우편 도장, 하나는 빛으로 찍힌 도장이야. 시절이 뒤섞였구먼.', 'surprised'],
            ['묵호', '어느 시절에서 왔든 편지는 편지지. 고맙네. 약소하지만 받게.']] }
      ] },
    /* 갈대 나루 — 봉수 불씨(과거)·바다 연구원(현대)·등대 지기 기계(미래) */
    wq_lighthouse: { id: 'wq_lighthouse', name: '세 시절의 등대', place: '갈대 나루', ar: 8, giver: 'wq_researcher',
      reward: { gold: 750, guide: 3, knot: 1, party: 70 },
      steps: [
        { type: 'talk', npc: 'wq_researcher', text: '바다 연구원 물결의 이야기 듣기',
          lines: [['물결', '밤마다 동쪽 물가 끝에서 빛 신호가 와. 옛 봉수 무늬인데… 파형은 아주 새것이야.', 'surprised'],
            ['물결', '거긴 옛 등대 터밖에 없거든. 같이 가서 봐 줄래?'],
            ['?', ['가 볼게요.', '옛 봉수 무늬요?']],
            ['물결', '불 하나면 평안, 둘이면 적, 셋이면 싸움. 그런데 신호는 \'불을 달라\'야.']] },
        { type: 'go', zone: 'galdae', off: LIGHT, text: '동쪽 물가 끝 옛 등대 터로' },
        { type: 'talk', npc: 'wq_hanbit', text: '등대 터에 나타난 빛 사람과 이야기하기',
          lines: [['한빛', '신원 확인. 등대 지기 한빛, 먼 뒷날의 이 등대를 지키는 기계입니다.', 'fun'],
            ['한빛', '시간 틈으로 신호만 겨우 닿고 있습니다. 옛 봉수 불씨가 켜지면 길이 이어집니다.'],
            ['?', ['불씨를 켤게요.', '먼 뒷날이라고요?']],
            ['한빛', '경고 — 불씨 둘레에 무리가 모여 있습니다. 불빛을 싫어하는 것들입니다.', 'angry']] },
        { type: 'kill', zone: 'galdae', off: off(LIGHT, [-4, 6]), kinds: ['alien', 'toad', 'toad'], text: '등대 터를 차지한 무리 물리치기' },
        { type: 'light', zone: 'galdae', off: LIGHT, text: '옛 봉수대에 원소 불 켜기' },
        { type: 'talk', npc: 'wq_researcher', text: '물결에게 알리기',
          lines: [['물결', '봤어? 불이 켜지자마자 등대 터에 빛 기둥이 섰다가 사라졌어!', 'joy'],
            ['물결', '먼 뒷날의 등대 지기라니… 기록장이 모자라겠어. 이건 연구소에서 나온 사례금이야.', 'fun']] }
      ] },
    /* 옛 성터 — 옛 석공(과거)·시간 탐사대원(미래). 이야기 인물(학자)은 끌어들이지 않는다 */
    wq_rift: { id: 'wq_rift', name: '성터의 시간 틈', place: '옛 성터 언덕', ar: 12, giver: 'wq_byeori',
      reward: { gold: 900, guide: 3, secret: 2, knot: 1, party: 80 },
      steps: [
        { type: 'talk', npc: 'wq_byeori', text: '시간 탐사대원 별이 돕기',
          lines: [['별이', '안녕! 난 먼 뒷날에서 온 탐사대원이야. 시간 틈을 재다가… 여기로 떨어졌어.', 'sorrow'],
            ['별이', '돌아가려면 틈을 한 번 더 열어야 해. 틈 괴물들이 틈 조각을 삼켜 버렸지 뭐야.'],
            ['?', ['되찾아 줄게요.', '틈 괴물?']],
            ['별이', '북쪽 무너진 기둥 사이에 모여 있어. 조심해!']] },
        { type: 'kill', zone: 'gojeong', off: [12, -96], kinds: ['snowfox', 'raptor', 'imp'], text: '틈 괴물을 물리쳐 틈 조각 되찾기' },
        { type: 'talk', npc: 'wq_byeori', text: '별이에게 틈 조각 건네기',
          lines: [['별이', '조각 셋 다! 이제 틈을 열 자리가 필요한데… 이 성터 돌에 새긴 글이 내 기록이랑 맞아.', 'joy'],
            ['별이', '서쪽 끝에 옛 석공이 서성이던데, 돌을 잘 아는 사람 같더라.']] },
        { type: 'talk', npc: 'wq_dolsoe', text: '옛 석공 돌쇠에게 묻기',
          lines: [['돌쇠', '이 돌 제단 말인가? 내가 쌓았지. 아니, 쌓을 참이지… 헷갈리는군. 날짜가 엉켰어.', 'surprised'],
            ['돌쇠', '석등 셋을 달 → 해 → 별 차례로 밝히면 돌이 문이 된다네. 내 스승이 그리 일렀어.'],
            ['?', ['해 볼게요.', '문이 되면요?']],
            ['돌쇠', '문이 열리는 동안 틈에서 뭔가 몰려나올 게야. 제단을 지키게.']] },
        { type: 'seal', zone: 'gojeong', off: RIFT, order: ['moon', 'sun', 'star'], text: '틈 제단 석등을 차례대로 밝히기' },
        { type: 'defend', zone: 'gojeong', off: RIFT, name: '틈 제단', waves: [['snowfox', 'raptor', 'zombie'], ['imp', 'vine', 'rockbear']],
          text: '틈이 열리는 동안 제단 지키기' },
        { type: 'talk', npc: 'wq_dolsoe', text: '돌쇠와 이야기하기',
          lines: [['돌쇠', '허허, 문이 섰구먼. 이제 내 날짜도 제자리로 돌아가겠지.', 'joy'],
            ['돌쇠', '그 아이한테 전하게 — 돌은 오래 기다려 준다고.']] },
        { type: 'talk', npc: 'wq_byeori', text: '별이 배웅하기',
          lines: [['별이', '틈이 열렸어! 이제 돌아갈 수 있어.', 'joy'],
            ['별이', '먼 뒷날 이 성터는 공원이 돼. 네 이름도 안내판에 있을지 몰라 — 농담이야! 이건 탐사대 비상금.', 'fun'],
            ['?', ['잘 가요!', '또 만나요.']],
            ['별이', '시간 틈이 또 열리면, 그땐 내가 널 도우러 올게.']] }
      ] }
  };

  global.DG = global.DG || {};
  global.DG.worldQuests = { STEP_EXP: STEP_EXP, NPCS: NPCS, ORDER: ORDER, QUESTS: QUESTS, LIGHT: LIGHT, RIFT: RIFT };
})(window);
