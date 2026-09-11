/**
 * 인물별 서명 무예(署名武藝) — 2026-09-11, 사용자 요청
 * ===============================================================
 * 지금 105명 전부가 직업(무기) 공유 트리(data-skill.js, 5직업×24개)만 쓴다.
 * "캐릭터마다 스킬이 달라야 해"라는 요청에 답한다 — 다만 105명을 한 번에
 * 손대면 품질이 얕아진다는 PLAN.md의 지적대로, **파일럿 8명**(사국·한국·
 * 일본·세계사 각 era, might/wisdom/virtue 골고루)으로 시작한다.
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
    sg_zhugeliang: {
      name: '신산결(神算訣)', emoji: '🪭', shape: 'curse',
      v: 42, r: 150, sec: 5, cd: 18,
      desc: '부챗바람에 계략을 실어 적진을 어지럽힌다.'
    },
    /* 한국사 */
    kr_yisunsin: {
      name: '결기(決氣)', emoji: '⚓', shape: 'buff',
      eff: 'atkSpdPct', v: 25, sec: 8, cd: 22,
      desc: '물러설 배가 없다는 각오가 전군의 창끝을 벼린다.'
    },
    kr_sejong: {
      name: '만민통용(萬民通用)', emoji: '📖', shape: 'buff',
      eff: 'skillPct', v: 35, sec: 8, cd: 22,
      desc: '가르침이 삼군의 손끝에 닿아 무예가 예리해진다.'
    },
    /* 일본사 */
    jp_himiko: {
      name: '귀도유인(鬼道誘引)', emoji: '🔮', shape: 'curse',
      v: 48, r: 150, sec: 6, cd: 19,
      desc: '그림자 같은 귀도가 적의 눈을 홀린다.'
    },
    jp_kenshin: {
      name: '군신강림(軍神降臨)', emoji: '❄️', shape: 'nova',
      el: 'cold', v: 3.4, r: 150, cd: 20,
      desc: '북녘의 찬 서슬이 사방을 얼어붙게 후려친다.'
    },
    /* 세계사 */
    eu_alexander: {
      name: '천리원정(千里遠征)', emoji: '🐎', shape: 'dash',
      v: 2.4, far: 2.2, cd: 18,
      desc: '말굽이 닿는 곳마다 세상의 끝이 가까워진다.'
    },
    eu_hannibal: {
      name: '전상돌격(戰象突擊)', emoji: '🐘', shape: 'summon',
      v: 1, str: 1.4, big: true, sec: 14, cd: 30,
      desc: '높은 산도 넘게 한 그 짐승이 전장에 나타난다.'
    }
  };

  global.DG = global.DG || {};
  global.DG.heroSkillData = {
    SIG: SIG,
    /** 이 인물의 서명 무예 — 파일럿 밖이면 null */
    sigOf: function (heroId) { return SIG[heroId] || null; }
  };
})(window);
