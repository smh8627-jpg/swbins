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

  global.DG = global.DG || {};
  global.DG.questData = {
    MAIN: MAIN, REGION: REGION, EVENT: EVENT, RANDOM_POOL: RANDOM_POOL,
    regionQuest: regionQuest
  };
})(window);
