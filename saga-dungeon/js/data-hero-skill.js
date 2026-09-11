/**
 * 인물별 서명 무예(署名武藝) — 2026-09-11, 사용자 요청
 * ===============================================================
 * 지금 105명 전부가 직업(무기) 공유 트리(data-skill.js, 5직업×24개)만 쓴다.
 * "캐릭터마다 스킬이 달라야 해"라는 요청에 답한다 — 다만 105명을 한 번에
 * 손대면 품질이 얕아진다는 PLAN.md의 지적대로, **파일럿 8명**(사국·한국·
 * 일본·세계사 각 era, might/wisdom/virtue 골고루)으로 시작했다.
 *
 * **2026-09-11(이어서) — 레어(rarity 5) 47명 전체로 확장.** 파일럿 8명이
 * 파일럿으로 검증됐으니, 같은 era에서 이미 있는 8명을 빼고 남은 39명을
 * 마저 채웠다. 계약·규칙(아래 문단들)은 그대로다 — 새로 늘 때 지킨 것:
 *   · 모양은 그 인물의 trait(might/wisdom/virtue/command)·quote·faction
 *     결에 맞춰 골랐지만, 같은 trait끼리도 모양을 겹치지 않게 흩었다
 *     (예: might 열 명이 전부 swing은 아니다 — dash·bolt·chain·buff·nova도 섞음).
 *   · buff의 `eff`는 이미 data-skill.js/data-set.js가 쓰는 검증된 키만
 *     썼다(allResPct·atkPct·atkSpdPct·critPct·guardPct·hpPct·skillPct) —
 *     새 eff 키를 만들지 않았다(엔진이 안 읽는 키를 넣어 봐야 조용히 무시된다).
 *   · v·r·cd 크기는 위 파일럿·`data-set.js`의 투장 무예 값 범위(swing
 *     v 3~3.6·r 2.2~2.6, nova v 3~4.2·r 140~170, curse v 40~48·r 140~150,
 *     buff v 18~45·sec 8~9, dash v 2.4~2.8·far 2.2~2.6, heal v 22~26,
 *     bolt v 2~2.4, chain v 1.7~2.4)를 그대로 따라 통일감을 지켰다.
 *
 * 계약은 "투장(套裝) 전용 무예"(data-set.js의 `.skill`)와 완전히 같다 —
 * 배우지 않는다, 슬롯(Z X C V)도 MP도 안 쓴다, `v`는 **고정값**(성장 없음,
 * `grow` 필드를 여기선 아예 안 쓴다 — 실수로 넣어도 아무도 안 읽는다).
 * 다른 점은 트리거 조건 하나뿐: 장비 3점이 아니라 **이 인물이 선두**면
 * 상시 켜진다(dungeon.js의 activeSigSkill/castSigSkill).
 *
 * name·desc는 반드시 era/faction/stats/quote에서만 소재를 딴다 — 실제
 * 역사 인물의 실명·특정 인물 귀속 전법명은 안 쓴다(../SAGA-HANDOFF.md
 * 2026-09-06/09-10 가명 정책, `_test.html`의 "가명 정책" 블랙리스트 테스트가
 * 이 파일의 name+desc도 같이 훑는다).
 *
 * 새 인물을 늘릴 때는 SIG 에 한 줄만 넣는다. `js/dungeon.js`는 이 표를
 * 읽기만 한다.
 */
(function (global) {
  'use strict';

  /**
   * heroId  data.js HEROES의 id (id는 절대 안 바뀐다 — 여기 키로 그대로 물린다)
   * name    보이는 이름 (한자 조어, 이 판의 무예 명명법을 따른다)
   * emoji   무예 아이콘
   * shape   data-skill.js와 같은 아홉 모양 중 하나 (applyShapeSkill이 읽는다)
   * el      원소 키(선택, 생략하면 물리)
   * v       고정 매김값 — 등급 성장 없음
   * cd      재사용 대기(초)
   * desc    한 줄 설명
   * 그 밖(r·kb·shots·spread·far·eff·sec·str·big·hops)은 shape가 실제로
   * 읽는 것만 넣는다 — data-skill.js 머리말의 "모양 아홉" 표를 참고할 것.
   */
  var SIG = {
    /* 삼국지 */
    sg_guanyu: {
      name: '독파관문(獨破關門)', emoji: '🗡️', shape: 'swing',
      v: 3.0, r: 2.0, kb: 50, cd: 20,
      desc: '의로운 마음이 앞장서 벤 자리마다 길을 낸다.'
    },
    sg_zhaoyun: {
      name: '호위결(護衛訣)', emoji: '🛡️', shape: 'buff',
      eff: 'guardPct', v: 42, sec: 8, cd: 20,
      desc: '몸을 바쳐 지키겠다는 다짐이 버티는 힘이 된다.'
    },
    sg_zhugeliang: {
      name: '신산결(神算訣)', emoji: '🪭', shape: 'curse',
      v: 42, r: 150, sec: 5, cd: 18,
      desc: '부챗바람에 계략을 실어 적진을 어지럽힌다.'
    },
    sg_liubei: {
      name: '인정활(仁情活)', emoji: '🌿', shape: 'heal',
      v: 24, cd: 20,
      desc: '백성을 헤아리는 마음이 그 자리에서 상처를 다스린다.'
    },
    sg_caocao: {
      name: '패자훈(霸者訓)', emoji: '⚔️', shape: 'buff',
      eff: 'atkPct', v: 30, sec: 8, cd: 20,
      desc: '천하를 저버리지 않겠다는 패기가 전군의 손끝에 옮아간다.'
    },
    sg_simayi: {
      name: '인고망(忍苦網)', emoji: '🕸️', shape: 'curse',
      v: 44, r: 150, sec: 6, cd: 18,
      desc: '기다림 끝에 펼친 그물이 걸린 자를 크게 무르게 한다.'
    },
    sg_zhouyu: {
      name: '화풍진(火風陣)', emoji: '🔥', shape: 'nova',
      el: 'fire', v: 3.5, r: 155, cd: 15,
      desc: '바람이 도는 때를 아는 눈이 불길을 사방으로 퍼뜨린다.'
    },
    sg_lubu: {
      name: '무쌍파(無雙破)', emoji: '🐉', shape: 'swing',
      v: 3.6, r: 2.4, kb: 70, cd: 16,
      desc: '천하에 대적할 자가 없다는 그 창끝이 한 번에 갈라놓는다.'
    },
    sg_diaochan: {
      name: '월영혹(月影惑)', emoji: '🌙', shape: 'curse',
      v: 40, r: 140, sec: 5, cd: 16,
      desc: '그림자처럼 스며든 자태가 다가선 적의 마음을 흐트러뜨린다.'
    },
    /* 한국사 */
    kr_yisunsin: {
      name: '결기(決氣)', emoji: '⚓', shape: 'buff',
      eff: 'atkSpdPct', v: 25, sec: 8, cd: 22,
      desc: '물러설 배가 없다는 각오가 전군의 창끝을 벼린다.'
    },
    kr_euljimundeok: {
      name: '현묘계(玄妙計)', emoji: '🌊', shape: 'curse',
      v: 46, r: 150, sec: 6, cd: 18,
      desc: '그만두기를 권하는 말 속에 감춘 계략이 다가선 적을 크게 무르게 한다.'
    },
    kr_ganggamchan: {
      name: '강우진(江雨陣)', emoji: '⛰️', shape: 'nova',
      el: 'cold', v: 3.3, r: 150, cd: 16,
      desc: '터뜨릴 준비를 마친 강물처럼 둘레를 한번에 쓸어 낸다.'
    },
    kr_kimyusin: {
      name: '일통섬(一統閃)', emoji: '🗡️', shape: 'dash',
      v: 2.6, far: 2.4, cd: 18,
      desc: '하나로 잇겠다는 다짐이 몸을 화살처럼 쏘아 보낸다.'
    },
    kr_yeongaesomun: {
      name: '철령단벽(鐵嶺斷壁)', emoji: '🪓', shape: 'swing',
      v: 3.2, r: 2.2, kb: 60, cd: 15,
      desc: '성벽처럼 버티던 팔이 도끼째로 앞을 무너뜨린다.'
    },
    kr_gwanggaeto: {
      name: '북정가(北征駕)', emoji: '🏇', shape: 'dash',
      v: 2.8, far: 2.6, cd: 16,
      desc: '더 멀리 나아가려는 고삐가 앞의 모든 것을 가른다.'
    },
    kr_sejong: {
      name: '만민통용(萬民通用)', emoji: '📖', shape: 'buff',
      eff: 'skillPct', v: 35, sec: 8, cd: 22,
      desc: '가르침이 삼군의 손끝에 닿아 무예가 예리해진다.'
    },
    kr_daejoyeong: {
      name: '요동훈(遼東訓)', emoji: '🌅', shape: 'buff',
      eff: 'atkPct', v: 32, sec: 8, cd: 20,
      desc: '뒤를 잇겠다는 다짐이 전군의 창끝을 벼린다.'
    },
    kr_wanggeon: {
      name: '통합훈(統合訓)', emoji: '👑', shape: 'buff',
      eff: 'hpPct', v: 25, sec: 8, cd: 20,
      desc: '흩어진 것을 모으겠다는 뜻이 둘레의 기운을 다시 채운다.'
    },
    kr_ahnjunggeun: {
      name: '독서훈(讀書訓)', emoji: '🕊️', shape: 'buff',
      eff: 'skillPct', v: 28, sec: 8, cd: 20,
      desc: '글을 놓지 않는 다짐이 손끝의 무예를 벼린다.'
    },
    kr_yugwansun: {
      name: '만세결(萬歲訣)', emoji: '🔔', shape: 'buff',
      eff: 'atkPct', v: 28, sec: 8, cd: 20,
      desc: '하나뿐인 목숨을 아끼지 않겠다는 다짐이 손끝을 뜨겁게 만든다.'
    },
    kr_kimgu: {
      name: '자강훈(自强訓)', emoji: '🇰🇷', shape: 'buff',
      eff: 'allResPct', v: 22, sec: 8, cd: 20,
      desc: '스스로 강해지겠다는 소원이 둘레를 두루 지켜 준다.'
    },
    /* 일본사 */
    jp_himiko: {
      name: '귀도유인(鬼道誘引)', emoji: '🔮', shape: 'curse',
      v: 48, r: 150, sec: 6, cd: 19,
      desc: '그림자 같은 귀도가 적의 눈을 홀린다.'
    },
    jp_yoritomo: {
      name: '개세훈(開世訓)', emoji: '🏯', shape: 'buff',
      eff: 'guardPct', v: 38, sec: 8, cd: 20,
      desc: '새 세상을 열겠다는 다짐이 버티는 힘으로 바뀐다.'
    },
    jp_yoshitsune: {
      name: '비전시(悲箭矢)', emoji: '🏹', shape: 'bolt',
      v: 2.2, shots: 4, spread: 0.4, cd: 12,
      desc: '그늘 속에서도 빗나가지 않던 화살이 한 번에 넷으로 갈라져 날아간다.'
    },
    jp_nobunaga: {
      name: '천마염화(天魔炎火)', emoji: '🔥', shape: 'nova',
      el: 'fire', v: 3.6, r: 160, kb: 40, cd: 16,
      desc: '울지 않는 것을 두고 보지 않는 성정이 불길로 사방을 태운다.'
    },
    jp_hideyoshi: {
      name: '재략계(才略計)', emoji: '🐒', shape: 'curse',
      v: 45, r: 140, sec: 5, cd: 17,
      desc: '재주로 쥐겠다는 자신감이 적의 대열을 흐트러뜨린다.'
    },
    jp_ieyasu: {
      name: '인내훈(忍耐訓)', emoji: '🐢', shape: 'buff',
      eff: 'guardPct', v: 44, sec: 9, cd: 22,
      desc: '울 때까지 기다리겠다는 인내가 버티는 힘으로 쌓인다.'
    },
    jp_shingen: {
      name: '풍림지훈(風林之訓)', emoji: '⛰️', shape: 'buff',
      eff: 'atkSpdPct', v: 30, sec: 8, cd: 20,
      desc: '바람처럼 빠르고 숲처럼 고요하라는 가르침이 손끝에 스민다.'
    },
    jp_kenshin: {
      name: '군신강림(軍神降臨)', emoji: '❄️', shape: 'nova',
      el: 'cold', v: 3.4, r: 150, cd: 20,
      desc: '북녘의 찬 서슬이 사방을 얼어붙게 후려친다.'
    },
    jp_yukimura: {
      name: '최후일창(最後一槍)', emoji: '🔴', shape: 'swing',
      v: 3.4, r: 2.3, kb: 55, cd: 14,
      desc: '마지막까지 쥐겠다는 창끝이 크게 원을 그리며 벤다.'
    },
    jp_saigo: {
      name: '애인활(愛人活)', emoji: '🐕', shape: 'heal',
      v: 26, cd: 20,
      desc: '하늘을 공경하고 사람을 아끼는 마음이 그 자리에서 상처를 낫게 한다.'
    },
    /* 세계사 */
    eu_caesar: {
      name: '결단령(決斷令)', emoji: '🏛️', shape: 'buff',
      eff: 'atkSpdPct', v: 32, sec: 8, cd: 20,
      desc: '보자마자 결단한다는 그 성정이 전군의 손발을 재촉한다.'
    },
    eu_alexander: {
      name: '천리원정(千里遠征)', emoji: '🐎', shape: 'dash',
      v: 2.4, far: 2.2, cd: 18,
      desc: '말굽이 닿는 곳마다 세상의 끝이 가까워진다.'
    },
    eu_hannibal: {
      name: '전상돌격(戰象突擊)', emoji: '🐘', shape: 'summon',
      v: 1, str: 1.4, big: true, sec: 14, cd: 30,
      desc: '높은 산도 넘게 한 그 짐승이 전장에 나타난다.'
    },
    eu_charlemagne: {
      name: '검문결(劍文訣)', emoji: '👑', shape: 'swing',
      v: 3.2, r: 2.2, kb: 45, cd: 15,
      desc: '검과 글을 함께 쥐겠다는 뜻이 팔 둘레를 크게 벤다.'
    },
    eu_joan: {
      name: '기치결(旗幟訣)', emoji: '⚜️', shape: 'buff',
      eff: 'atkSpdPct', v: 30, sec: 8, cd: 20,
      desc: '두려움 없이 든 깃발이 손발을 재촉한다.'
    },
    eu_napoleon: {
      name: '무불능결(無不能訣)', emoji: '🎖️', shape: 'buff',
      eff: 'skillPct', v: 32, sec: 8, cd: 20,
      desc: '불가능은 없다는 확신이 무예 하나하나를 더 예리하게 벼린다.'
    },
    eu_davinci: {
      name: '기공시(奇工矢)', emoji: '🪶', shape: 'bolt',
      el: 'lit', v: 2.4, shots: 3, spread: 0.4, cd: 12,
      desc: '아직 다 그리지 못한 궁리가 기이한 발사체로 빚어져 날아간다.'
    },
    wd_ashoka: {
      name: '법륜훈(法輪訓)', emoji: '☸️', shape: 'buff',
      eff: 'allResPct', v: 24, sec: 8, cd: 20,
      desc: '법으로 다스리겠다는 다짐이 둘레를 두루 지켜 준다.'
    },
    wd_akbar: {
      name: '관용훈(寬容訓)', emoji: '🕌', shape: 'buff',
      eff: 'allResPct', v: 20, sec: 8, cd: 20,
      desc: '강요하지 않는 마음이 둘레를 두루 지켜 준다.'
    },
    wd_saladin: {
      name: '의검결(義劍訣)', emoji: '🌙', shape: 'swing',
      v: 3.3, r: 2.2, kb: 50, cd: 15,
      desc: '자비로도 연다는 그 마음이 검 끝에 실려 둘레를 가른다.'
    },
    wd_suleiman: {
      name: '장려포(壯麗砲)', emoji: '🕌', shape: 'nova',
      el: 'fire', v: 3.4, r: 160, kb: 30, cd: 16,
      desc: '법과 영광을 함께 세우겠다는 포효가 둘레를 크게 뒤흔든다.'
    },
    wd_genghis: {
      name: '초원연사(草原連射)', emoji: '🏹', shape: 'chain',
      v: 2.4, hops: 4, r: 280, kb: 20, cd: 16,
      desc: '세상의 끝까지 달리는 말 위에서 화살이 적에서 적으로 옮겨 붙는다.'
    },
    wd_khubilai: {
      name: '일통가(一統駕)', emoji: '🐎', shape: 'dash',
      v: 2.6, far: 2.3, cd: 17,
      desc: '하나로 잇겠다는 뜻이 말을 앞으로 세차게 몰아낸다.'
    },
    wd_mansamusa: {
      name: '황금결(黃金訣)', emoji: '🪙', shape: 'buff',
      eff: 'critPct', v: 18, sec: 8, cd: 20,
      desc: '나눌수록 커진다는 믿음이 결정적인 순간의 손끝을 벼린다.'
    },
    wd_cleopatra: {
      name: '독사계(毒蛇計)', emoji: '🐍', shape: 'curse',
      v: 44, r: 140, sec: 5, cd: 17,
      desc: '나일강의 편이라 믿는 배짱이 다가온 적을 크게 무르게 한다.'
    },
    wd_attila: {
      name: '천벌편(天罰鞭)', emoji: '🐎', shape: 'swing',
      v: 3.5, r: 2.2, kb: 65, cd: 15,
      desc: '채찍이 신의 벌인 양 앞을 후려친다.'
    }
  };

  global.DG = global.DG || {};
  global.DG.heroSkillData = {
    SIG: SIG,
    /** 이 인물의 서명 무예 — 파일럿 밖이면 null */
    sigOf: function (heroId) { return SIG[heroId] || null; }
  };
})(window);
