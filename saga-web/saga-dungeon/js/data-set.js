/**
 * 투장(套裝) — 원작의 세트 아이템
 * ===============================================================
 * 원작(디아블로2)의 세트는 **여러 점을 같이 입어야** 값이 나온다.
 * 한 점만으로는 평범한데, 짝을 맞추면 다른 물건으로 바뀐다 —
 * 그래서 "이건 팔지 말고 나머지를 찾자" 는 목표가 생긴다.
 * 이 판은 여태 좋은 것 하나를 주우면 그걸로 끝이었다.
 *
 * 이 판에서 정한 것
 *   · **한 벌은 셋**이다 — 무기·갑주·부적. 인물 하나가 걸치는 자리 수와 같다.
 *     원작처럼 여섯 점짜리를 만들면 이 판에서는 영영 못 채운다
 *   · **같은 인물이 걸쳐야 센다.** 원작의 세트도 한 인물 기준이다.
 *     동행 다섯에 흩어 놓고 채워지면 그건 세트가 아니라 창고 정리다
 *   · **보물(寶物) 등급에만 붙는다.** 등급색이 이미 원작의 세트 초록(#00c000)이라,
 *     바닥에 뜬 이름 색만 보고 "저건 짝이 있는 물건" 임을 안다
 *   · **접사는 그대로 굴린다.** 원작의 세트는 수치가 고정이지만, 그러려면 조각마다
 *     표를 따로 짜야 한다. 고정인 것은 **투장 효과** 쪽이다
 *   · 부서진 것(내구 0)은 **짝으로 안 센다** — 값을 하나도 안 내는 물건이다
 *
 * 한 벌을 늘릴 때는 SETS 에 한 줄만 넣는다. item.js 는 이 표를 읽기만 한다.
 * `pieces` 의 밑감은 data-item.js 의 BASES 키다 — 부위가 겹치면 안 된다.
 */
(function (global) {
  'use strict';

  /**
   * key    세이브에 남는 이름 (바꾸면 옛 세이브의 조각이 짝을 잃는다)
   * name   보이는 이름
   * pieces 밑감 셋 — 무기 · 갑주 · 부적 하나씩
   * bonus  { 2: [효과…], 3: [효과…] }  — **누적이다**(셋을 채우면 2와 3이 다 붙는다)
   *        효과 모양은 socketEffects 와 같다:
   *          {kind:'flat', stat, v} · {kind:'pct', stat, v} · {kind:'world', eff, v}
   * skill  **세 점을 한 인물이 다 걸쳐야** 손에 잡히는 세트 전용 무예(2026-09-10
   *        사용자 요청 "방어구 세트마다 특색 스킬"). 배우지 않는다 — 점수도
   *        슬롯(Z X C V)도 안 쓴다. 강공격·회피와 같은 자리(쿨다운만 있는
   *        기본기)에 dungeon.js가 셋째 버튼(F)으로 놓는다. 모양(shape)은
   *        data-skill.js 의 아홉 가지를 그대로 재사용한다 — v 는 고정값(단수
   *        없음, 이 무예는 오르지 않는다). MP는 안 쓴다 — 세트를 맞춘 보상이다.
   */
  var SETS = [
    {
      key: 'chungmu', name: '충무(忠武)',
      pieces: ['w_hwando', 'a_dujeong', 'c_hopae'],
      desc: '바다를 지킨 이의 채비.',
      bonus: {
        2: [{ kind: 'flat', stat: 'command', v: 14 }],
        3: [{ kind: 'pct', stat: 'all', v: 8 }, { kind: 'world', eff: 'atkPct', v: 12 }]
      },
      skill: { name: '귀선포(龜船砲)', emoji: '💥', shape: 'nova', v: 3.2, r: 160, cd: 16,
        desc: '거북선의 포문처럼 사방을 친다.' }
    },
    {
      key: 'waryong', name: '와룡(臥龍)',
      pieces: ['w_seonchae', 'a_dopo', 'c_yeombul'],
      desc: '누운 용의 채비. 붓이 칼보다 앞선다.',
      bonus: {
        2: [{ kind: 'flat', stat: 'wisdom', v: 16 }],
        3: [{ kind: 'pct', stat: 'wisdom', v: 12 }, { kind: 'world', eff: 'expPct', v: 20 }]
      },
      skill: { name: '팔진도(八陣圖)', emoji: '🌀', shape: 'curse', v: 45, r: 150, sec: 6, cd: 16,
        desc: '둘레를 진(陣)으로 묶어 크게 약하게 한다.' }
    },
    {
      key: 'horang', name: '호랑(虎狼)',
      pieces: ['w_changj', 'a_chalgap', 'c_hobu'],
      desc: '범과 이리의 채비. 앞장서는 자의 것.',
      bonus: {
        2: [{ kind: 'flat', stat: 'might', v: 16 }],
        3: [{ kind: 'pct', stat: 'might', v: 12 }, { kind: 'world', eff: 'critPct', v: 10 }]
      },
      skill: { name: '맹호출림(猛虎出林)', emoji: '🐯', shape: 'dash', v: 2.8, far: 2.2, cd: 12,
        desc: '범처럼 뛰쳐나가 앞을 벤다.' }
    },
    {
      key: 'cheongnang', name: '청낭(靑囊)',
      pieces: ['w_bilbut', 'a_myeongap', 'c_gyeong'],
      desc: '푸른 주머니의 채비. 셈이 밝은 이의 것.',
      bonus: {
        2: [{ kind: 'world', eff: 'lootPct', v: 12 }],
        3: [{ kind: 'world', eff: 'goldPct', v: 30 }, { kind: 'world', eff: 'findPct', v: 25 }]
      },
      skill: { name: '활인술(活人術)', emoji: '🌿', shape: 'heal', v: 22, cd: 20,
        desc: '청낭의 의술로 그 자리에서 낫는다.' }
    },
    /* 2026-09-06 — 사용자 요청("콘텐츠가 많아야 함")으로 여섯 벌을 더 얹었다.
       그때까지 어느 세트에도 안 든 밑감(BASES 31개 중 12개만 위 네 벌이
       썼다)으로만 골랐다 — _test.html "한 밑감이 두 벌에 들어가도 안
       된다" 자가진단이 그대로 지킨다. w_pyeongon(편곤) 하나만 여전히
       어느 세트에도 없다(31개 중 30개를 쓰면 나머지 하나는 남는다). */
    {
      key: 'cheolong', name: '철옹(鐵甕)',
      pieces: ['a_jichap', 'h_tumo', 'n_geumpae'],
      desc: '무너지지 않는 성벽의 채비.',
      bonus: {
        2: [{ kind: 'flat', stat: 'command', v: 14 }],
        3: [{ kind: 'pct', stat: 'command', v: 10 }, { kind: 'world', eff: 'hpPct', v: 20 }]
      },
      skill: { name: '철옹성(鐵甕城)', emoji: '🧱', shape: 'buff', eff: 'guardPct', v: 45, sec: 8, cd: 20,
        desc: '한동안 성벽처럼 버틴다.' }
    },
    {
      key: 'eunha', name: '은하(銀河)',
      pieces: ['w_jukjang', 'n_okpae', 'c_okgae'],
      desc: '밤하늘의 지혜를 두른 채비.',
      bonus: {
        2: [{ kind: 'flat', stat: 'wisdom', v: 14 }],
        3: [{ kind: 'pct', stat: 'wisdom', v: 10 }, { kind: 'world', eff: 'findPct', v: 20 }]
      },
      skill: { name: '은하수(銀河水)', emoji: '✨', shape: 'nova', v: 3.0, r: 150, el: 'lit', cd: 14,
        desc: '별빛이 둘레에 쏟아진다.' }
    },
    {
      key: 'maenghon', name: '맹혼(猛魂)',
      pieces: ['w_bugae', 'a_cheollip', 'g_wangap'],
      desc: '사나운 범의 발톱을 한 채비.',
      bonus: {
        2: [{ kind: 'flat', stat: 'might', v: 14 }],
        3: [{ kind: 'pct', stat: 'might', v: 10 }, { kind: 'world', eff: 'atkPct', v: 15 }]
      },
      skill: { name: '광란베기(狂亂斬)', emoji: '🪓', shape: 'swing', v: 3.4, r: 2.6, kb: 50, cd: 12,
        desc: '도끼를 크게 휘둘러 둘레를 벤다.' }
    },
    {
      key: 'biyeong', name: '비영(飛影)',
      pieces: ['w_gakgung', 'b_hwaje', 'r_geumji'],
      desc: '그림자처럼 빠른 이의 채비.',
      bonus: {
        2: [{ kind: 'flat', stat: 'might', v: 10 }],
        3: [{ kind: 'pct', stat: 'might', v: 8 }, { kind: 'world', eff: 'critPct', v: 18 }]
      },
      skill: { name: '비영시(飛影矢)', emoji: '🏹', shape: 'bolt', v: 2.0, shots: 5, spread: 0.5, cd: 10,
        desc: '그림자 화살 다섯이 부챗살로 퍼진다.' }
    },
    {
      key: 'paewang', name: '패왕(霸王)',
      pieces: ['w_wolto', 'a_pigap', 'c_dokkaebi'],
      desc: '천하를 노리는 자의 채비.',
      bonus: {
        2: [{ kind: 'flat', stat: 'might', v: 16 }],
        3: [{ kind: 'pct', stat: 'might', v: 14 }, { kind: 'world', eff: 'atkPct', v: 18 }]
      },
      skill: { name: '패왕참(霸王斬)', emoji: '☄️', shape: 'nova', v: 4.2, r: 170, kb: 70, cd: 18,
        desc: '천하를 노리는 자의 일격, 둘레가 다 쓸린다.' }
    },
    {
      key: 'hyeonhak', name: '현학(玄鶴)',
      pieces: ['w_byeongseo', 'g_wandae', 'b_jipsin'],
      desc: '학처럼 초연한 이의 채비.',
      bonus: {
        2: [{ kind: 'flat', stat: 'wisdom', v: 12 }],
        3: [{ kind: 'pct', stat: 'wisdom', v: 8 }, { kind: 'world', eff: 'expPct', v: 18 }]
      },
      skill: { name: '학진(鶴陣)', emoji: '🕊️', shape: 'summon', v: 2, sec: 14, str: 2, cd: 20,
        desc: '학의 진을 세운다. 대신 싸운다.' }
    }
  ];

  /** 조각이 나오는 등급 — 보물(3). 등급색이 곧 원작의 세트 초록이다 */
  var SET_TIER = 3;

  /** 그 등급이 나왔을 때 조각이 될 확률 (밑감이 어느 한 벌에 속할 때만) */
  var SET_CHANCE = 0.55;

  function setByKey(k) {
    for (var i = 0; i < SETS.length; i++) { if (SETS[i].key === k) { return SETS[i]; } }
    return null;
  }

  /** 이 밑감이 속한 한 벌 (없으면 null) */
  function setOfBase(baseKey) {
    for (var i = 0; i < SETS.length; i++) {
      if (SETS[i].pieces.indexOf(baseKey) >= 0) { return SETS[i]; }
    }
    return null;
  }

  /** 몇 점을 걸쳤을 때 붙는 효과 — **누적이다** */
  function bonusFor(set, n) {
    var out = [], k;
    if (!set) { return out; }
    for (k in set.bonus) {
      if (!Object.prototype.hasOwnProperty.call(set.bonus, k)) { continue; }
      if (n >= parseInt(k, 10)) { out = out.concat(set.bonus[k]); }
    }
    return out;
  }

  global.DG = global.DG || {};
  global.DG.setData = {
    SETS: SETS, SET_TIER: SET_TIER, SET_CHANCE: SET_CHANCE,
    setByKey: setByKey, setOfBase: setOfBase, bonusFor: bonusFor
  };
})(window);
