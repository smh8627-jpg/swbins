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
 * **2026-09-11(같은 날, 세 번째) — 남은 rarity 1~4, 58명까지 채워
 * 105명 전부가 서명 무예를 갖게 됐다.** 같은 규칙·값 범위를 그대로
 * 따랐다 — name 중복만 새로 늘어난 만큼(105개) 한 번 더 훑어 확인했다
 * (`역세훈`으로 고쳐 잡은 것 하나 — `개세훈`이 이미 jp_yoritomo에 있었다).
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
    sg_zhangfei: {
      name: '호기훈(豪氣訓)', emoji: '🍶', shape: 'buff',
      eff: 'atkPct', v: 30, sec: 8, cd: 20,
      desc: '한잔 걸친 호기가 손끝을 뜨겁게 만든다.'
    },
    sg_machao: {
      name: '서풍가(西風駕)', emoji: '🏇', shape: 'dash',
      v: 2.6, far: 2.4, cd: 17,
      desc: '서쪽 벌판을 달리던 창끝이 앞으로 세차게 뻗는다.'
    },
    sg_huangzhong: {
      name: '노익시(老益矢)', emoji: '🏹', shape: 'bolt',
      v: 2.2, shots: 3, spread: 0.35, cd: 11,
      desc: '늙었다는 말을 비웃듯 화살 셋이 정확히 꽂힌다.'
    },
    sg_xiahoudun: {
      name: '독안결(獨眼決)', emoji: '🩹', shape: 'swing',
      v: 3.3, r: 2.2, kb: 55, cd: 15,
      desc: '한쪽 눈으로도 충분하다는 기백이 앞을 크게 벤다.'
    },
    sg_zhangliao: {
      name: '철벽훈(鐵壁訓)', emoji: '🛡️', shape: 'buff',
      eff: 'guardPct', v: 40, sec: 8, cd: 20,
      desc: '적은 수로도 막아내겠다는 배짱이 버티는 힘이 된다.'
    },
    sg_xunyu: {
      name: '왕좌훈(王佐訓)', emoji: '📜', shape: 'buff',
      eff: 'skillPct', v: 30, sec: 8, cd: 20,
      desc: '돕는 재주라 부끄러워하는 그 안목이 무예를 벼린다.'
    },
    sg_sunquan: {
      name: '벽해훈(碧海訓)', emoji: '🔷', shape: 'buff',
      eff: 'hpPct', v: 24, sec: 8, cd: 20,
      desc: '손을 잡을 줄 아는 마음이 둘레의 기운을 다시 채운다.'
    },
    sg_luxun: {
      name: '담연계(淡然計)', emoji: '🌊', shape: 'curse',
      v: 45, r: 145, sec: 6, cd: 18,
      desc: '서두르지 않는 눈이 다가선 적을 크게 무르게 한다.'
    },
    sg_taishici: {
      name: '궁성시(弓星矢)', emoji: '🎯', shape: 'bolt',
      v: 2.3, shots: 3, spread: 0.4, cd: 11,
      desc: '별처럼 빛나는 활 솜씨가 화살 셋으로 퍼진다.'
    },
    sg_ganning: {
      name: '영진습(鈴陣襲)', emoji: '🔔', shape: 'dash',
      v: 2.7, far: 2.3, cd: 16,
      desc: '방울 소리가 울릴 즈음엔 이미 앞이 갈라져 있다.'
    },
    sg_pangtong: {
      name: '봉래계(鳳來計)', emoji: '🦅', shape: 'curse',
      v: 46, r: 145, sec: 6, cd: 18,
      desc: '숨어 있던 재주가 드러나 다가선 적을 크게 무르게 한다.'
    },
    sg_huatuo: {
      name: '신침활(神鍼活)', emoji: '💊', shape: 'heal',
      v: 25, cd: 20,
      desc: '사람을 살리겠다는 마음이 그 자리에서 상처를 다스린다.'
    },
    sg_menghuo: {
      name: '불굴훈(不屈訓)', emoji: '🐘', shape: 'buff',
      eff: 'allResPct', v: 22, sec: 8, cd: 20,
      desc: '일곱 번 져도 다시 일어서는 기개가 둘레를 두루 지켜 준다.'
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
    kr_gyebaek: {
      name: '결사단(決死斷)', emoji: '🛡️', shape: 'swing',
      v: 3.4, r: 2.3, kb: 60, cd: 15,
      desc: '물러서지 않겠다는 각오가 앞을 크게 무너뜨린다.'
    },
    kr_jangyeongsil: {
      name: '성시훈(星時訓)', emoji: '⏱️', shape: 'buff',
      eff: 'skillPct', v: 30, sec: 8, cd: 20,
      desc: '그림자로 시간을 재던 정밀함이 무예를 벼린다.'
    },
    kr_choemuseon: {
      name: '화포탄(火砲彈)', emoji: '🧨', shape: 'bolt',
      el: 'fire', v: 2.6, cd: 10,
      desc: '화약을 다루던 손이 불덩이를 곧게 쏘아 보낸다.'
    },
    kr_jeongyakyong: {
      name: '거중훈(擧重訓)', emoji: '🏗️', shape: 'buff',
      eff: 'hpPct', v: 26, sec: 8, cd: 20,
      desc: '짐을 덜어주겠다는 궁리가 둘레의 기운을 다시 채운다.'
    },
    kr_heojun: {
      name: '제중활(濟衆活)', emoji: '🌿', shape: 'heal',
      v: 26, cd: 20,
      desc: '귀천을 가리지 않는 마음이 그 자리에서 상처를 다스린다.'
    },
    kr_sinsaimdang: {
      name: '초충훈(草蟲訓)', emoji: '🎨', shape: 'buff',
      eff: 'skillPct', v: 26, sec: 8, cd: 20,
      desc: '붓끝에 담은 마음이 손끝의 무예를 벼린다.'
    },
    kr_wonhyo: {
      name: '각원훈(覺圓訓)', emoji: '🪷', shape: 'buff',
      eff: 'allResPct', v: 22, sec: 8, cd: 20,
      desc: '마음이 짓는 것이라는 깨달음이 둘레를 두루 지켜 준다.'
    },
    kr_kimjeongho: {
      name: '방각훈(方刻訓)', emoji: '🗺️', shape: 'buff',
      eff: 'reachPct', v: 20, sec: 8, cd: 20,
      desc: '땅을 한 장에 담던 눈썰미가 손이 닿는 자리를 넓힌다.'
    },
    kr_gwakjaeu: {
      name: '홍의진(紅衣陣)', emoji: '🔴', shape: 'nova',
      v: 3.4, r: 150, kb: 35, cd: 15,
      desc: '붉은 옷이 나타나면 그 자리 전체가 흔들린다.'
    },
    kr_nongae: {
      name: '화영결(花影決)', emoji: '🌸', shape: 'dash',
      v: 2.5, far: 2.0, cd: 17,
      desc: '물결을 기억해 달라는 다짐이 몸을 앞으로 던진다.'
    },
    kr_yihwang: {
      name: '경헌훈(敬軒訓)', emoji: '📚', shape: 'buff',
      eff: 'skillPct', v: 27, sec: 8, cd: 20,
      desc: '마음을 바로 하는 공부가 무예를 한층 벼린다.'
    },
    kr_yii: {
      name: '양병훈(養兵訓)', emoji: '✒️', shape: 'buff',
      eff: 'guardPct', v: 40, sec: 8, cd: 20,
      desc: '미리 대비하자는 헤아림이 버티는 힘으로 쌓인다.'
    },
    kr_hwanghui: {
      name: '균형훈(均衡訓)', emoji: '⚖️', shape: 'buff',
      eff: 'allResPct', v: 22, sec: 8, cd: 20,
      desc: '양쪽 다 옳다 여기는 균형이 둘레를 두루 지켜 준다.'
    },
    kr_jeongmongju: {
      name: '일편훈(一片訓)', emoji: '🌉', shape: 'buff',
      eff: 'guardPct', v: 42, sec: 9, cd: 21,
      desc: '백 번 고쳐 죽어도 하나인 마음이 버티는 힘으로 쌓인다.'
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
    jp_taira: {
      name: '평가훈(平家訓)', emoji: '⚓', shape: 'buff',
      eff: 'atkPct', v: 30, sec: 8, cd: 20,
      desc: '가문이 아니면 안 된다는 자부가 전군의 손끝에 옮아간다.'
    },
    jp_murasaki: {
      name: '물어계(物語計)', emoji: '🖋️', shape: 'curse',
      v: 44, r: 140, sec: 5, cd: 17,
      desc: '덧없는 이야기가 다가선 적의 마음을 흐트러뜨린다.'
    },
    jp_seishonagon: {
      name: '침초훈(枕草訓)', emoji: '📝', shape: 'buff',
      eff: 'skillPct', v: 27, sec: 8, cd: 20,
      desc: '가장 좋은 순간을 알아채는 눈썰미가 무예를 벼린다.'
    },
    jp_tomoegozen: {
      name: '여무시(女武矢)', emoji: '🗡️', shape: 'bolt',
      v: 2.3, shots: 3, spread: 0.4, cd: 11,
      desc: '못 당길 이유가 없다는 그 활이 셋으로 퍼져 나간다.'
    },
    jp_masamune: {
      name: '독안룡파(獨眼龍破)', emoji: '🐉', shape: 'nova',
      v: 3.7, r: 160, kb: 45, cd: 16,
      desc: '한쪽 눈으로 다 본다는 그 위엄이 둘레를 크게 뒤흔든다.'
    },
    jp_musashi: {
      name: '이도단련(二刀鍛鍊)', emoji: '🗡️', shape: 'swing',
      v: 3.6, r: 2.3, kb: 45, cd: 14,
      desc: '만 일의 단련이 두 자루 칼끝으로 한 번에 갈라놓는다.'
    },
    jp_hanzo: {
      name: '암영섬(暗影閃)', emoji: '🥷', shape: 'dash',
      v: 2.7, far: 2.5, cd: 17,
      desc: '소리를 안 남기는 그림자가 순식간에 앞으로 파고든다.'
    },
    jp_mitsukuni: {
      name: '수사훈(修史訓)', emoji: '📖', shape: 'buff',
      eff: 'skillPct', v: 28, sec: 8, cd: 20,
      desc: '역사를 엮겠다는 정성이 손끝의 무예를 벼린다.'
    },
    jp_naosuke: {
      name: '개항훈(開港訓)', emoji: '⚓', shape: 'buff',
      eff: 'allResPct', v: 21, sec: 8, cd: 20,
      desc: '문을 여는 것도 지키는 길이라는 믿음이 둘레를 두루 지켜 준다.'
    },
    jp_ryoma: {
      name: '해원가(海援駕)', emoji: '⛵', shape: 'dash',
      v: 2.6, far: 2.3, cd: 17,
      desc: '세상을 씻어내겠다는 뜻이 앞으로 세차게 나아간다.'
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
    },
    eu_augustus: {
      name: '대리훈(大理訓)', emoji: '🦅', shape: 'buff',
      eff: 'guardPct', v: 40, sec: 8, cd: 20,
      desc: '벽돌을 대리석으로 바꾸겠다는 다짐이 버티는 힘이 된다.'
    },
    eu_scipio: {
      name: '전법습득(戰法習得)', emoji: '🛡️', shape: 'swing',
      v: 3.3, r: 2.2, kb: 50, cd: 15,
      desc: '적에게 배운 그 수로 되받아치며 앞을 크게 벤다.'
    },
    eu_leonidas: {
      name: '불퇴진(不退陣)', emoji: '🔺', shape: 'swing',
      v: 3.5, r: 2.4, kb: 65, cd: 15,
      desc: '와서 가져가라는 배짱이 앞을 크게 쓸어버린다.'
    },
    eu_aurelius: {
      name: '성찰훈(省察訓)', emoji: '📖', shape: 'buff',
      eff: 'allResPct', v: 25, sec: 9, cd: 21,
      desc: '미루지 않겠다는 다짐이 둘레를 두루 지켜 준다.'
    },
    eu_richard: {
      name: '사자심결(獅子心決)', emoji: '🦁', shape: 'swing',
      v: 3.5, r: 2.3, kb: 60, cd: 15,
      desc: '물러서는 법을 모르는 심장이 창끝으로 앞을 크게 벤다.'
    },
    eu_william: {
      name: '소선가(燒船駕)', emoji: '🏹', shape: 'dash',
      v: 2.8, far: 2.6, cd: 16,
      desc: '돌아갈 배가 없다는 각오가 몸을 앞으로 세차게 던진다.'
    },
    eu_harald: {
      name: '북풍부(北風斧)', emoji: '🪓', shape: 'swing',
      v: 3.6, r: 2.3, kb: 60, cd: 15,
      desc: '노를 젓던 팔이 도끼를 크게 휘둘러 앞을 벤다.'
    },
    eu_frederick: {
      name: '종복훈(從僕訓)', emoji: '🎼', shape: 'buff',
      eff: 'skillPct', v: 32, sec: 8, cd: 20,
      desc: '첫째 종복이라는 마음가짐이 무예를 벼린다.'
    },
    eu_peter: {
      name: '해로진(海路陣)', emoji: '⚓', shape: 'nova',
      el: 'cold', v: 3.4, r: 155, cd: 16,
      desc: '바다로 나가려는 뜻이 둘레를 얼어붙게 후려친다.'
    },
    eu_elizabeth: {
      name: '혼인서(婚姻誓)', emoji: '💍', shape: 'buff',
      eff: 'guardPct', v: 42, sec: 8, cd: 20,
      desc: '나라와 혼인했다는 맹세가 버티는 힘으로 쌓인다.'
    },
    eu_nelson: {
      name: '본분훈(本分訓)', emoji: '🔭', shape: 'buff',
      eff: 'atkSpdPct', v: 30, sec: 8, cd: 20,
      desc: '본분을 다하라는 기대가 전군의 손발을 재촉한다.'
    },
    eu_machiavelli: {
      name: '외경계(畏敬計)', emoji: '🖋️', shape: 'curse',
      v: 44, r: 140, sec: 5, cd: 17,
      desc: '얕보이지 않겠다는 셈이 다가선 적을 크게 무르게 한다.'
    },
    eu_newton: {
      name: '만유시(萬有矢)', emoji: '🍎', shape: 'bolt',
      el: 'lit', v: 2.5, shots: 3, spread: 0.4, cd: 12,
      desc: '떨어지는 이치를 꿰뚫어 본 궁리가 셋으로 갈라져 날아간다.'
    },
    eu_michelangelo: {
      name: '조각파(彫刻破)', emoji: '🗿', shape: 'nova',
      v: 3.3, r: 150, cd: 15,
      desc: '돌 안의 형상을 꺼내는 손놀림이 둘레를 한 번에 쓸어 낸다.'
    },
    eu_eleanor: {
      name: '이관훈(二冠訓)', emoji: '🌹', shape: 'buff',
      eff: 'hpPct', v: 26, sec: 8, cd: 20,
      desc: '두 왕관을 지녔던 관록이 둘레의 기운을 다시 채운다.'
    },
    wd_ibnsina: {
      name: '의전활(醫典活)', emoji: '📗', shape: 'heal',
      v: 28, cd: 20,
      desc: '몸의 이치를 담은 책이 그 자리에서 상처를 다스린다.'
    },
    wd_shaka: {
      name: '단창파(短槍破)', emoji: '🛡️', shape: 'swing',
      v: 3.4, r: 2.1, kb: 55, cd: 14,
      desc: '짧은 창이 이긴다는 그 이치가 가까운 둘레를 벤다.'
    },
    wd_pachacuti: {
      name: '역세훈(易世訓)', emoji: '🏔️', shape: 'buff',
      eff: 'atkPct', v: 32, sec: 8, cd: 20,
      desc: '세상을 뒤바꾸겠다는 그 이름값이 전군의 손끝에 옮아간다.'
    },
    wd_moctezuma: {
      name: '창천훈(蒼天訓)', emoji: '🦅', shape: 'buff',
      eff: 'allResPct', v: 23, sec: 8, cd: 20,
      desc: '하늘의 조짐을 읽던 눈이 둘레를 두루 지켜 준다.'
    },
    wd_ibnbattuta: {
      name: '천리행(千里行)', emoji: '🧭', shape: 'dash',
      v: 2.5, far: 2.4, cd: 17,
      desc: '멈추지 않겠다는 그 걸음이 몸을 앞으로 세차게 나아가게 한다.'
    },
    wd_hammurabi: {
      name: '율법계(律法計)', emoji: '🪨', shape: 'curse',
      v: 46, r: 145, sec: 6, cd: 18,
      desc: '돌에 새긴 그 셈법대로, 준 만큼 되받게 한다.'
    }
  };

  global.DG = global.DG || {};
  global.DG.heroSkillData = {
    SIG: SIG,
    /** 이 인물의 서명 무예 — 파일럿 밖이면 null */
    sigOf: function (heroId) { return SIG[heroId] || null; }
  };
})(window);
