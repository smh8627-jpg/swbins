/**
 * 퀘스트 데이터 — PLAN 36절: 메인 · 지역 · 무작위 · 이벤트
 * ---------------------------------------------------------------
 * PLAN 원문의 보기("숲의 늑대 10마리 처치")는 몬스터 종족까지 태그하는
 * 판이 아니라서(정예·보스 구분만 있다) 그대로 못 옮긴다 — 이 판의 결로는
 * "몬스터 10마리 처치"다. 요구(req)는 넷뿐이다:
 *
 *   kill      { t:'kill', tag, n }   tag 없으면 아무 몬스터나, 'elite'·'boss' 면 그것만
 *   discover  { t:'discover', room, n }  그 방 종류(POI)에 들어가면 센다 (dungeon.js ROOMS 의 kind)
 *   floor     { t:'floor', n }        그 층에 닿으면 바로 채워진다
 *   rescue    { t:'rescue', n }       이벤트방(구출)을 그만큼 치르면 찬다
 *
 * 진행 집계는 quest.js 가 dungeon.js 의 이벤트(dungeon:kill · dungeon:room ·
 * dungeon:floor · dungeon:rescue)를 듣고 한다 — 여기는 표만 쥔다.
 */
(function (global) {
  'use strict';

  /** 메인 — 정해진 순서로 하나씩. 다음 것은 앞 것을 끝내야 나온다 */
  var MAIN = [
    { key: 'm1', name: '첫 출정', desc: '제3층까지 내려가라',
      req: { t: 'floor', n: 3 }, reward: { gold: 200, exp: 30 } },
    { key: 'm2', name: '정예 사냥', desc: '정예 몬스터 3마리를 처치하라',
      req: { t: 'kill', tag: 'elite', n: 3 }, reward: { gold: 500, exp: 60 } },
    { key: 'm3', name: '보물찾기', desc: '상자방을 찾아라',
      req: { t: 'discover', room: 'trove', n: 1 }, reward: { gold: 300, exp: 40 } },
    { key: 'm4', name: '수호자의 흔적', desc: '사당을 찾아라',
      req: { t: 'discover', room: 'shrine', n: 1 }, reward: { gold: 400, exp: 50 } },
    { key: 'm5', name: '우두머리 사냥', desc: '보스급 몬스터(정예 우두머리든 층의 보스든)를 처치하라',
      req: { t: 'kill', tag: 'boss', n: 1 }, reward: { gold: 800, exp: 100 } },
    { key: 'm6', name: '깊은 곳으로', desc: '제10층까지 내려가라',
      req: { t: 'floor', n: 10 }, reward: { gold: 1200, exp: 150 } },
    { key: 'm7', name: '정예 다섯', desc: '정예 몬스터 5마리를 처치하라',
      req: { t: 'kill', tag: 'elite', n: 5 }, reward: { gold: 1500, exp: 180, feat: 20 } },
    { key: 'm8', name: '스무 층 답파', desc: '제20층까지 내려가라',
      req: { t: 'floor', n: 20 }, reward: { gold: 3000, exp: 400, feat: 40 } },
    /* 2026-09-06 — 사용자 요청("콘텐츠가 많아야 함")으로 메인 줄기를 지옥문·
       천계(THEMES 다섯째·여섯째)까지 늘렸다. 요구 종류(kill·discover·floor)는
       그대로, 수치만 키운다 — 새 req.t 는 안 만든다. */
    { key: 'm9', name: '지옥문 답파', desc: '제25층까지 내려가라',
      req: { t: 'floor', n: 25 }, reward: { gold: 4500, exp: 550, feat: 55 } },
    { key: 'm10', name: '정예 여덟', desc: '정예 몬스터 8마리를 처치하라',
      req: { t: 'kill', tag: 'elite', n: 8 }, reward: { gold: 5000, exp: 600, feat: 60 } },
    { key: 'm11', name: '기관진식 답사', desc: '기관진식(퍼즐방)을 찾아라',
      req: { t: 'discover', room: 'puzzle', n: 1 }, reward: { gold: 1200, exp: 120 } },
    { key: 'm12', name: '천계 답파', desc: '제30층까지 내려가라',
      req: { t: 'floor', n: 30 }, reward: { gold: 8000, exp: 1000, feat: 100 } },
    { key: 'm13', name: '두목 사냥', desc: '보스급 몬스터 2마리를 처치하라',
      req: { t: 'kill', tag: 'boss', n: 2 }, reward: { gold: 10000, exp: 1300, feat: 130 } },
    { key: 'm14', name: '전인미답', desc: '제40층까지 내려가라',
      req: { t: 'floor', n: 40 }, reward: { gold: 16000, exp: 2000, feat: 200 } }
  ];

  /** 지역 — 월드맵(PLAN 28절)의 여섯 지역과 같은 순서(THEMES 인덱스)로 하나씩.
   *  그 지역에 닿아야(최고 도달 층 >= from) 열린다. 요구는 깊을수록 세진다. */
  var REGION = [
    { name: '고분의 몬스터', kill: 6 },
    { name: '폐성의 몬스터', kill: 8 },
    { name: '산채의 몬스터', kill: 10 },
    { name: '수궁의 몬스터', kill: 12 },
    { name: '지옥문의 몬스터', kill: 14 },
    { name: '천계의 몬스터', kill: 16 }
  ];

  function regionQuest(i, themeName) {
    var r = REGION[i];
    return {
      key: 'reg' + i, name: r.name, desc: themeName + '에서 몬스터 ' + r.kill + '마리를 처치하라',
      req: { t: 'kill', n: r.kill },
      reward: { gold: 250 + i * 150, exp: 30 + i * 20 }
    };
  }

  /** 이벤트 — 이벤트방(구출)을 치른 누적 횟수로 단계가 오른다 */
  var EVENT = [
    { key: 'e1', name: '은혜 갚기', desc: '이벤트방에서 사람을 1명 구하라',
      req: { t: 'rescue', n: 1 }, reward: { gold: 200, exp: 20 } },
    { key: 'e2', name: '거듭된 구출', desc: '이벤트방에서 사람을 3명 구하라',
      req: { t: 'rescue', n: 3 }, reward: { gold: 500, exp: 50 } },
    { key: 'e3', name: '은인(恩人)', desc: '이벤트방에서 사람을 6명 구하라',
      req: { t: 'rescue', n: 6 }, reward: { gold: 1000, exp: 100, feat: 15 } },
    /* 2026-09-06 — 이벤트 줄기도 늘렸다(사용자 "콘텐츠가 많아야 함"). */
    { key: 'e4', name: '거듭된 은혜', desc: '이벤트방에서 사람을 10명 구하라',
      req: { t: 'rescue', n: 10 }, reward: { gold: 2200, exp: 220, feat: 25 } },
    { key: 'e5', name: '자비의 손길', desc: '이벤트방에서 사람을 15명 구하라',
      req: { t: 'rescue', n: 15 }, reward: { gold: 3800, exp: 380, feat: 40 } },
    { key: 'e6', name: '만인의 은인', desc: '이벤트방에서 사람을 25명 구하라',
      req: { t: 'rescue', n: 25 }, reward: { gold: 6500, exp: 650, feat: 70 } }
  ];

  /**
   * 무작위 — 필드를 도는 동안 늘 하나 떠 있다(원작의 현상금판과 같다).
   * 끝내면 곧바로 새것이 뜬다. n 은 [lo, hi] 사이에서 굴린다.
   */
  var RANDOM_POOL = [
    { name: '토벌', descOf: function (n) { return '몬스터 ' + n + '마리를 처치하라'; },
      req: { t: 'kill', lo: 5, hi: 12 } },
    { name: '정예 사냥', descOf: function (n) { return '정예 몬스터 ' + n + '마리를 처치하라'; },
      req: { t: 'kill', tag: 'elite', lo: 1, hi: 3 } },
    { name: '보물찾기', descOf: function () { return '상자방을 찾아라'; },
      req: { t: 'discover', room: 'trove', lo: 1, hi: 1 } },
    { name: '상인을 찾아라', descOf: function () { return '행상을 찾아라'; },
      req: { t: 'discover', room: 'merchant', lo: 1, hi: 1 } },
    { name: '숨겨진 동굴', descOf: function () { return '숨겨진 동굴(채광방)을 찾아라'; },
      req: { t: 'discover', room: 'cave', lo: 1, hi: 1 } },
    { name: '기관진식', descOf: function () { return '기관진식(퍼즐방)을 찾아라'; },
      req: { t: 'discover', room: 'puzzle', lo: 1, hi: 1 } },
    { name: '수호자의 흔적', descOf: function () { return '사당을 찾아라'; },
      req: { t: 'discover', room: 'shrine', lo: 1, hi: 1 } },
    /* 2026-09-06 — 무작위 현상판도 늘렸다(사용자 "콘텐츠가 많아야 함"). ROOMS의
       kind 중 아직 안 쓴 셋(well·miniboss·forage)만 새로 discover 로 얹었다 —
       새 req.t 는 안 만든다(kill·discover 그대로). */
    { name: '샘터를 찾아라', descOf: function () { return '샘터(우물방)를 찾아라'; },
      req: { t: 'discover', room: 'well', lo: 1, hi: 1 } },
    { name: '두목의 소굴', descOf: function () { return '숨은 두목의 소굴을 찾아라'; },
      req: { t: 'discover', room: 'miniboss', lo: 1, hi: 1 } },
    { name: '약초와 못', descOf: function () { return '채집처를 찾아라'; },
      req: { t: 'discover', room: 'forage', lo: 1, hi: 1 } }
  ];


  /**
   * 지역 사연(事緣) 사슬 — PLAN §5.14. 고정 세계 지도(§5.12)의 지역 아홉마다 네 걸음:
   *   0 토벌(그 지역 들판 몬스터 n) → 1 흔적(world-map clueSpot 에 닿기) →
   *   2 정예(그 지역 정예·우두머리 n) → 3 우두머리(§5.13 지역 우두머리 토벌) → 평정.
   * 디아블로 2 막(Act) 퀘스트처럼 걸음마다 한 줄 사연이 이어진다. 이름은 전부 창작(실명 없음).
   * 수치는 지역 기본 위험도(world-map FOES.lvl)로 정한다 — chainStep() 이 계산한다.
   */
  var CHAINS = {
    jungwon: { title: '흑기 도적의 밤', giver: '벌판 역참지기',
      intro: '밤마다 검은 깃발 무리가 역참을 턴다 — 벌판부터 조용히 시켜 달라',
      clue: { name: '불탄 역참 깃발', emoji: '🚩', found: '깃발 밑에 끼인 약탈 장부 — 두목의 진지가 적혀 있다' },
      elite: '도적 무리의 정예 척후', done: '벌판 길에 다시 수레가 다닌다' },
    neon: { title: '멈춘 공장의 심장', giver: '고물 줍는 아이',
      intro: '공장 쪽에서 쇠 긁는 소리가 밤새 난다 — 무서워서 못 가겠다',
      clue: { name: '깜빡이는 비상등 상자', emoji: '🚨', found: '상자 속 기록기가 "둥지" 라는 말과 좌표를 되풀이한다' },
      elite: '공장을 지키는 강철 정예', done: '굴뚝 아래가 조용해졌다 — 아이가 고철을 한 아름 들고 온다' },
    saltmarsh: { title: '물 빠진 바다의 노래', giver: '염전 늙은 뱃사공',
      intro: '썰물 때마다 갯벌 밑에서 무언가 운다 — 배가 셋이나 사라졌다',
      clue: { name: '녹슨 관측탑 일지', emoji: '📓', found: '마지막 장 — "촉수, 물길 셋째 갈래 아래" 라고 적혀 있다' },
      elite: '갯벌의 정예 괴물', done: '밀물이 제 소리로 돌아왔다 — 뱃사공이 소금 한 섬을 내민다' },
    hellgate: { title: '갈라진 땅의 문지기', giver: '떠돌이 퇴마사',
      intro: '균열이 해마다 한 뼘씩 넓어진다 — 새어 나오는 것들부터 막아야 한다',
      clue: { name: '금 간 봉인비', emoji: '🪨', found: '비문의 마지막 글자가 불에 녹았다 — 문지기가 안에서 깼다' },
      elite: '균열에서 나온 정예 원귀', done: '봉인비에 새 글자가 새겨졌다 — 균열이 멈췄다' },
    solar: { title: '과열된 태양로', giver: '개척지 정비공',
      intro: '태양로 온도가 계속 오른다 — 주변 기계들이 미쳐 날뛴다',
      clue: { name: '꺼진 제어 단말', emoji: '💻', found: '마지막 기록 — "냉각 실패. 거신 기동" 이 붉게 떠 있다' },
      elite: '폭주한 기계 정예', done: '태양판 위로 다시 새가 앉는다 — 개척지에 불이 들어왔다' },
    silkroad: { title: '끊긴 대상 길', giver: '대상 우두머리',
      intro: '서역 길목이 막힌 지 석 달 — 낙타도 짐도 돌아오지 않는다',
      clue: { name: '모래에 묻힌 낙타 방울', emoji: '🔔', found: '방울 곁에 거대한 뿔 자국 — 발자국이 모래바다 쪽으로 이어진다' },
      elite: '길목을 지키는 정예 짐승', done: '방울 소리가 다시 들린다 — 대상이 비단 한 필을 남기고 떠난다' },
    heaven: { title: '칼을 든 수호장', giver: '사당지기 도사',
      intro: '하늘 사당의 수호장이 사당을 버렸다 — 그 칼끝이 이제 우리를 향한다',
      clue: { name: '빛이 꺼진 홀로그램 비석', emoji: '🪧', found: '비석에 남은 마지막 빛 — 수호장의 맹세가 거꾸로 새겨져 있다' },
      elite: '타락을 따른 정예', done: '비석에 빛이 돌아왔다 — 도사가 향을 사른다' },
    snowfort: { title: '산성의 거한', giver: '케이블카 기사',
      intro: '산성 폐허에 누가 눌러앉아 케이블카가 끊겼다 — 골짜기가 고립됐다',
      clue: { name: '멈춘 케이블카 칸', emoji: '🚡', found: '칸 안에 얼어붙은 커다란 손자국 — 산성 꼭대기로 이어진다' },
      elite: '설산의 정예 짐승', done: '케이블카가 다시 움직인다 — 골짜기에 불빛이 켜졌다' },
    scrap: { title: '스스로 일어선 고철', giver: '떠돌이 수리 로봇',
      intro: '쓰러진 기계들이 하나씩 사라진다 — 누군가 그것들을 모으고 있다',
      clue: { name: '반쯤 묻힌 조립 설계도', emoji: '📐', found: '설계도 가장자리에 거대한 몸의 도면 — 이미 완성됐다고 적혀 있다' },
      elite: '고철 거신의 정예 부품', done: '황무지의 기계들이 잠들었다 — 수리 로봇이 나사 한 줌을 건넨다' }
  };
  var CHAIN_STEPS = ['토벌', '흔적', '정예', '우두머리'];
  /** 걸음 하나의 요구·보상 — lvl 은 그 지역 기본 위험도(0~6) */
  function chainStep(key, step, lvl, regionName, bossName) {
    var c = CHAINS[key];
    if (!c || step < 0 || step > 3) { return null; }
    var L = lvl || 0;
    if (step === 0) {
      var n = 10 + L * 2;
      return { name: CHAIN_STEPS[0], desc: regionName + ' 들판에서 몬스터 ' + n + '마리를 처치하라', need: n,
               reward: { gold: 60 + 30 * L, exp: 10 + 5 * L } };
    }
    if (step === 1) {
      return { name: CHAIN_STEPS[1], desc: c.clue.emoji + ' ' + c.clue.name + '을(를) 찾아라 (큰 지도 🔍)', need: 1,
               reward: { gold: 80 + 40 * L, exp: 15 + 5 * L } };
    }
    if (step === 2) {
      var m = L ? 3 : 2;
      return { name: CHAIN_STEPS[2], desc: c.elite + ' ' + m + '마리를 쓰러뜨려라', need: m,
               reward: { gold: 100 + 50 * L, exp: 20 + 8 * L } };
    }
    return { name: CHAIN_STEPS[3], desc: '☠️ ' + bossName + '을(를) 토벌하라', need: 1,
             reward: { gold: 400 + 200 * L, exp: 60 + 20 * L, feat: 20 + L } };
  }
  /** 아홉을 다 평정하면 한 번 */
  var CHAIN_ALL = { name: '구주 평정(九州平定)', reward: { gold: 20000, exp: 1000, feat: 100 } };

  global.DG = global.DG || {};
  global.DG.questData = {
    MAIN: MAIN, REGION: REGION, EVENT: EVENT, RANDOM_POOL: RANDOM_POOL,
    regionQuest: regionQuest,
    CHAINS: CHAINS, CHAIN_STEPS: CHAIN_STEPS, chainStep: chainStep, CHAIN_ALL: CHAIN_ALL
  };
})(window);
