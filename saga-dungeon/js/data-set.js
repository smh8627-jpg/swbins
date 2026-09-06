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
   */
  var SETS = [
    {
      key: 'chungmu', name: '충무(忠武)',
      pieces: ['w_hwando', 'a_dujeong', 'c_hopae'],
      desc: '바다를 지킨 이의 채비.',
      bonus: {
        2: [{ kind: 'flat', stat: 'command', v: 14 }],
        3: [{ kind: 'pct', stat: 'all', v: 8 }, { kind: 'world', eff: 'atkPct', v: 12 }]
      }
    },
    {
      key: 'waryong', name: '와룡(臥龍)',
      pieces: ['w_seonchae', 'a_dopo', 'c_yeombul'],
      desc: '누운 용의 채비. 붓이 칼보다 앞선다.',
      bonus: {
        2: [{ kind: 'flat', stat: 'wisdom', v: 16 }],
        3: [{ kind: 'pct', stat: 'wisdom', v: 12 }, { kind: 'world', eff: 'expPct', v: 20 }]
      }
    },
    {
      key: 'horang', name: '호랑(虎狼)',
      pieces: ['w_changj', 'a_chalgap', 'c_hobu'],
      desc: '범과 이리의 채비. 앞장서는 자의 것.',
      bonus: {
        2: [{ kind: 'flat', stat: 'might', v: 16 }],
        3: [{ kind: 'pct', stat: 'might', v: 12 }, { kind: 'world', eff: 'critPct', v: 10 }]
      }
    },
    {
      key: 'cheongnang', name: '청낭(靑囊)',
      pieces: ['w_bilbut', 'a_myeongap', 'c_gyeong'],
      desc: '푸른 주머니의 채비. 셈이 밝은 이의 것.',
      bonus: {
        2: [{ kind: 'world', eff: 'lootPct', v: 12 }],
        3: [{ kind: 'world', eff: 'goldPct', v: 30 }, { kind: 'world', eff: 'findPct', v: 25 }]
      }
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
      }
    },
    {
      key: 'eunha', name: '은하(銀河)',
      pieces: ['w_jukjang', 'n_okpae', 'c_okgae'],
      desc: '밤하늘의 지혜를 두른 채비.',
      bonus: {
        2: [{ kind: 'flat', stat: 'wisdom', v: 14 }],
        3: [{ kind: 'pct', stat: 'wisdom', v: 10 }, { kind: 'world', eff: 'findPct', v: 20 }]
      }
    },
    {
      key: 'maenghon', name: '맹혼(猛魂)',
      pieces: ['w_bugae', 'a_cheollip', 'g_wangap'],
      desc: '사나운 범의 발톱을 한 채비.',
      bonus: {
        2: [{ kind: 'flat', stat: 'might', v: 14 }],
        3: [{ kind: 'pct', stat: 'might', v: 10 }, { kind: 'world', eff: 'atkPct', v: 15 }]
      }
    },
    {
      key: 'biyeong', name: '비영(飛影)',
      pieces: ['w_gakgung', 'b_hwaje', 'r_geumji'],
      desc: '그림자처럼 빠른 이의 채비.',
      bonus: {
        2: [{ kind: 'flat', stat: 'might', v: 10 }],
        3: [{ kind: 'pct', stat: 'might', v: 8 }, { kind: 'world', eff: 'critPct', v: 18 }]
      }
    },
    {
      key: 'paewang', name: '패왕(霸王)',
      pieces: ['w_wolto', 'a_pigap', 'c_dokkaebi'],
      desc: '천하를 노리는 자의 채비.',
      bonus: {
        2: [{ kind: 'flat', stat: 'might', v: 16 }],
        3: [{ kind: 'pct', stat: 'might', v: 14 }, { kind: 'world', eff: 'atkPct', v: 18 }]
      }
    },
    {
      key: 'hyeonhak', name: '현학(玄鶴)',
      pieces: ['w_byeongseo', 'g_wandae', 'b_jipsin'],
      desc: '학처럼 초연한 이의 채비.',
      bonus: {
        2: [{ kind: 'flat', stat: 'wisdom', v: 12 }],
        3: [{ kind: 'pct', stat: 'wisdom', v: 8 }, { kind: 'world', eff: 'expPct', v: 18 }]
      }
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
