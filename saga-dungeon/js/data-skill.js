/**
 * 직업(職業)과 무예(武藝) — 원작의 클래스와 스킬 트리
 * ===============================================================
 * 원작(디아블로2)에서 인물을 고르는 일은 **어떤 나무를 탈지**를 고르는 일이다.
 * 야만용사는 도끼를 휘두르고 소서리스는 불을 던진다 — 같은 던전인데 손이 다르다.
 * 이 판은 여태 스킬 넷이 **모두에게 똑같았다.**
 *
 * ── 직업은 **손에 쥔 무기**가 정한다 ───────────────────────
 * 원작에서 직업을 고르는 일은 결국 "무엇을 들고 싸울까" 를 고르는 일이다.
 * 이 판은 인물을 고르는 게임이라 직업을 따로 고를 자리가 없다 —
 * 그래서 **장착한 무기**가 직업이 되게 했다. 무기를 바꾸면 손이 통째로 바뀐다.
 *
 *   각궁(bow)                 → 궁장(弓將)   원작의 아마존 자리
 *   장창·편곤·부월            → 무장(武將)   야만용사 자리
 *   선채·필묵                 → 책사(策士)   소서리스 자리
 *   환도·월도                 → 도독(都督)   팔라딘 자리 (기·수호)
 *   죽장·병서                 → 방사(方士)   네크로맨서 자리 (분신·저주)
 *
 * 이렇게 하면 좋은 점 셋
 *   · **다섯 나무가 다 열린다.** 기질로만 가르면 인물 70 중 방사가 하나뿐이라
 *     그 나무는 영영 못 탄다 (실제로 그렇게 나와서 고쳤다)
 *   · **사람이 고를 수 있다.** 원작에서 직업을 고르는 그 자리다
 *   · `data.js` 를 안 건드린다 — 무기 밑감(data-item.js)의 `look` 을 읽을 뿐이다
 *
 * 맨몸일 때만 인물의 `trait` 을 본다 (무기를 줍기 전에도 손이 있어야 한다).
 * 점수는 **직업마다 따로** 센다 — 무기를 바꿔도 그 나무의 점수는 그대로 남는다.
 *
 * ── 나무의 모양 ────────────────────────────────────────────
 * 직업마다 **세 갈래 × 세 단계 = 아홉**. 원작은 세 탭 × 열이지만, 이 판은
 * 인물이 여럿이고 레벨이 낮게 오르므로 아홉이면 끝까지 타 볼 수 있다.
 *   · 한 무예는 **다섯 단**까지 올린다
 *   · **앞 단계에 1점이 있어야** 다음 단계가 열린다 (원작의 그 규칙)
 *   · 점수는 **인물 레벨만큼** 생긴다 — 인물마다 따로 센다
 *
 * ── 왜 '모양(shape)' 으로 짰나 ──────────────────────────────
 * 아홉 × 다섯 직업 = 마흔다섯인데, 마흔다섯 개를 따로 구현하면 손을 못 댄다.
 * 원작의 스킬도 실은 **몇 가지 모양**이 원소·수치만 바꿔 가며 되풀이된다.
 * 그래서 모양 아홉만 dungeon.js 에 두고, 아래 표는 그 모양에 값을 끼운다.
 *
 *   swing   내 둘레를 벤다            bolt    곧게 나가는 것을 쏜다
 *   nova    내 자리에서 터진다        dash    앞으로 파고든다
 *   buff    잠깐 세진다               heal    그 자리에서 회복한다
 *   curse   둘레의 적을 약하게        summon  분신을 세운다
 *   passive 늘 붙어 있다 (쓰지 않는다)
 *
 * 무예를 늘릴 때는 SKILLS 에 한 줄. dungeon.js 는 shape 만 보고 굴린다.
 */
(function (global) {
  'use strict';

  /* ── 직업 다섯 ─────────────────────────────────────────── */

  var CLASSES = [
    { key: 'archer', name: '궁장', hanja: '弓將', emoji: '🏹',
      desc: '멀리서 꿰뚫는다. 활을 든 이가 간다.' },
    { key: 'warrior', name: '무장', hanja: '武將', emoji: '⚔️',
      desc: '휘두르고 파고든다. 몸으로 하는 싸움.' },
    { key: 'scholar', name: '책사', hanja: '策士', emoji: '🪭',
      desc: '불과 얼음을 부린다. 손이 아니라 머리로 싸운다.' },
    { key: 'marshal', name: '도독', hanja: '都督', emoji: '🚩',
      desc: '기(氣)로 두르고 버틴다. 오래 서 있는 쪽이 이긴다.' },
    { key: 'mystic', name: '방사', hanja: '方士', emoji: '☯️',
      desc: '분신을 세우고 적을 묶는다. 혼자 싸우지 않는다.' }
  ];

  function classByKey(k) {
    for (var i = 0; i < CLASSES.length; i++) { if (CLASSES[i].key === k) { return CLASSES[i]; } }
    return null;
  }

  /** 무기 밑감의 look → 직업 (data-item.js 의 BASES[].look 과 같은 말이다) */
  var WEAPON_CLASS = {
    bow: 'archer',
    spear: 'warrior', club: 'warrior', axe: 'warrior', halberd: 'warrior',
    fan: 'scholar', brush: 'scholar',
    sword: 'marshal', guandao: 'marshal',
    staff: 'mystic', scroll: 'mystic'
  };

  /** 맨몸일 때 — 인물의 기질을 본다 */
  var TRAIT_CLASS = {
    might: 'warrior', wisdom: 'scholar', virtue: 'marshal', command: 'mystic'
  };

  /**
   * 인물 하나의 직업.
   * @param h        인물 (data.find 가 준 것)
   * @param weaponLook 장착한 무기의 look ('bow'·'sword'…). 없으면 맨몸이다
   */
  function classOf(h, weaponLook) {
    if (weaponLook && WEAPON_CLASS[weaponLook]) {
      return classByKey(WEAPON_CLASS[weaponLook]);
    }
    if (!h) { return CLASSES[1]; }
    return classByKey(TRAIT_CLASS[h.trait] || 'warrior');
  }

  /** 어느 무기가 어느 직업을 여는지 (화면이 알려 준다) */
  function weaponsFor(clsKey) {
    var out = [], k;
    for (k in WEAPON_CLASS) {
      if (Object.prototype.hasOwnProperty.call(WEAPON_CLASS, k) &&
          WEAPON_CLASS[k] === clsKey) { out.push(k); }
    }
    return out;
  }

  /* ── 무예 마흔다섯 ─────────────────────────────────────────
   * cls    직업 · br 갈래(0~2) · row 단계(0~2)
   * shape  모양 (위 주석)
   * cost   기력 · cd 재냉각(초) · el 결(없으면 물리)
   * v      1단 기준 값 (모양마다 뜻이 다르다 — 아래 각 줄에 적었다)
   * grow   한 단 오를 때마다 v 에 더해지는 몫
   */
  var MAX_RANK = 5;

  var SKILLS = [
    /* ── 궁장(弓將) — 멀리서 꿰뚫는다 ───────────────────── */
    { key: 'a_pierce', cls: 'archer', br: 0, row: 0, name: '관통사(貫通射)', emoji: '🎯',
      shape: 'bolt', cost: 14, cd: 3, v: 1.6, grow: 0.35,
      desc: '꿰뚫는 화살. 뒤의 적까지 닿는다.' },
    { key: 'a_multi', cls: 'archer', br: 0, row: 1, name: '연사(連射)', emoji: '🏹',
      shape: 'bolt', cost: 24, cd: 6, v: 1.3, grow: 0.3, shots: 3, spread: 0.34,
      desc: '한 번에 셋을 쏜다.' },
    { key: 'a_rain', cls: 'archer', br: 0, row: 2, name: '시우(矢雨)', emoji: '🌧️',
      shape: 'nova', cost: 34, cd: 10, v: 2.4, grow: 0.5, r: 130,
      desc: '화살비가 둘레에 쏟아진다.' },
    { key: 'a_fire', cls: 'archer', br: 1, row: 0, name: '화시(火矢)', emoji: '🔥',
      shape: 'bolt', cost: 18, cd: 4, v: 1.5, grow: 0.4, el: 'fire',
      desc: '불붙은 화살.' },
    { key: 'a_ice', cls: 'archer', br: 1, row: 1, name: '빙시(氷矢)', emoji: '❄️',
      shape: 'bolt', cost: 22, cd: 5, v: 1.4, grow: 0.35, el: 'cold',
      desc: '언 화살. 맞은 적이 굼떠진다.' },
    { key: 'a_storm', cls: 'archer', br: 1, row: 2, name: '뇌시(雷矢)', emoji: '⚡',
      shape: 'bolt', cost: 30, cd: 8, v: 2.0, grow: 0.55, el: 'lit',
      desc: '벼락을 실은 화살. 편차가 크다.' },
    { key: 'a_eye', cls: 'archer', br: 2, row: 0, name: '매의 눈(鷹眼)', emoji: '👁️',
      shape: 'passive', eff: 'critPct', v: 4, grow: 3,
      desc: '치명타 확률이 오른다.' },
    { key: 'a_reach', cls: 'archer', br: 2, row: 1, name: '장궁(長弓)', emoji: '📏',
      shape: 'passive', eff: 'reachPct', v: 8, grow: 6,
      desc: '닿는 거리가 길어진다.' },
    { key: 'a_swift', cls: 'archer', br: 2, row: 2, name: '질보(疾步)', emoji: '💨',
      shape: 'passive', eff: 'atkSpdPct', v: 6, grow: 4,
      desc: '손이 빨라진다.' },

    /* ── 무장(武將) — 몸으로 하는 싸움 ──────────────────── */
    { key: 'w_whirl', cls: 'warrior', br: 0, row: 0, name: '회전참(回轉斬)', emoji: '🌀',
      shape: 'swing', cost: 22, cd: 5, v: 1.7, grow: 0.35, r: 2.3, kb: 30,
      desc: '둘레의 모든 적을 벤다. 밀쳐낸다.' },
    { key: 'w_cleave', cls: 'warrior', br: 0, row: 1, name: '분쇄(粉碎)', emoji: '🔨',
      shape: 'swing', cost: 28, cd: 7, v: 2.6, grow: 0.5, r: 1.7, kb: 46,
      desc: '한 번에 크게. 멀리 밀린다.' },
    { key: 'w_quake', cls: 'warrior', br: 0, row: 2, name: '진각(震脚)', emoji: '💥',
      shape: 'nova', cost: 36, cd: 11, v: 3.0, grow: 0.6, r: 150, kb: 60,
      desc: '땅을 굴러 둘레를 뒤흔든다.' },
    { key: 'w_dash', cls: 'warrior', br: 1, row: 0, name: '돌진(突進)', emoji: '💨',
      shape: 'dash', cost: 18, cd: 6, v: 1.2, grow: 0.3,
      desc: '앞으로 파고들며 벤다. 잠깐 맞지 않는다.' },
    { key: 'w_leap', cls: 'warrior', br: 1, row: 1, name: '도약(跳躍)', emoji: '🦘',
      shape: 'dash', cost: 26, cd: 9, v: 2.0, grow: 0.45, far: 1.8,
      desc: '더 멀리 뛴다. 지나는 것을 다 벤다.' },
    { key: 'w_rage', cls: 'warrior', br: 1, row: 2, name: '광분(狂奮)', emoji: '🔺',
      shape: 'buff', cost: 34, cd: 18, v: 40, grow: 10, sec: 6, eff: 'atkSpdPct',
      desc: '한동안 손이 훨씬 빨라진다.' },
    { key: 'w_tough', cls: 'warrior', br: 2, row: 0, name: '단련(鍛鍊)', emoji: '🛡️',
      shape: 'passive', eff: 'hpPct', v: 8, grow: 5,
      desc: '부대 체력이 오른다.' },
    { key: 'w_mastery', cls: 'warrior', br: 2, row: 1, name: '병기술(兵器術)', emoji: '⚔️',
      shape: 'passive', eff: 'atkPct', v: 7, grow: 5,
      desc: '부대 공격력이 오른다.' },
    { key: 'w_second', cls: 'warrior', br: 2, row: 2, name: '이혼대법(離魂)', emoji: '🩸',
      shape: 'passive', eff: 'drainPct', v: 2, grow: 1,
      desc: '적을 잡으면 체력이 조금 돌아온다.' },

    /* ── 책사(策士) — 불과 얼음 ─────────────────────────── */
    { key: 's_fire', cls: 'scholar', br: 0, row: 0, name: '화탄(火彈)', emoji: '🔥',
      shape: 'bolt', cost: 16, cd: 3, v: 1.8, grow: 0.45, el: 'fire',
      desc: '불덩이를 던진다.' },
    { key: 's_blaze', cls: 'scholar', br: 0, row: 1, name: '염화(炎火)', emoji: '🌋',
      shape: 'nova', cost: 30, cd: 8, v: 2.4, grow: 0.55, r: 120, el: 'fire',
      desc: '둘레가 불바다가 된다.' },
    { key: 's_meteor', cls: 'scholar', br: 0, row: 2, name: '유성(流星)', emoji: '☄️',
      shape: 'nova', cost: 42, cd: 14, v: 4.0, grow: 0.9, r: 160, el: 'fire',
      desc: '별이 떨어진다.' },
    { key: 's_ice', cls: 'scholar', br: 1, row: 0, name: '빙탄(氷彈)', emoji: '❄️',
      shape: 'bolt', cost: 16, cd: 3, v: 1.5, grow: 0.4, el: 'cold',
      desc: '언 덩이를 던진다. 맞은 적이 굼떠진다.' },
    { key: 's_frost', cls: 'scholar', br: 1, row: 1, name: '한파(寒波)', emoji: '🧊',
      shape: 'nova', cost: 28, cd: 9, v: 2.0, grow: 0.5, r: 135, el: 'cold',
      desc: '둘레가 얼어붙는다.' },
    { key: 's_bolt', cls: 'scholar', br: 1, row: 2, name: '뇌격(雷擊)', emoji: '⚡',
      shape: 'bolt', cost: 32, cd: 7, v: 2.6, grow: 0.7, el: 'lit',
      desc: '벼락을 곧게 내리꽂는다. 편차가 크다.' },
    { key: 's_wave', cls: 'scholar', br: 2, row: 0, name: '기공파(氣功波)', emoji: '🌊',
      shape: 'bolt', cost: 30, cd: 8, v: 2.2, grow: 0.5, el: 'chi',
      desc: '꿰뚫는 기를 쏜다.' },
    { key: 's_wit', cls: 'scholar', br: 2, row: 1, name: '명민(明敏)', emoji: '🧠',
      shape: 'passive', eff: 'mpRegen', v: 2, grow: 1.4,
      desc: '기력이 빨리 찬다.' },
    { key: 's_focus', cls: 'scholar', br: 2, row: 2, name: '집중(集中)', emoji: '🎯',
      shape: 'passive', eff: 'skillPct', v: 10, grow: 7,
      desc: '무예의 위력이 오른다.' },

    /* ── 도독(都督) — 기로 두르고 버틴다 ────────────────── */
    { key: 'm_rally', cls: 'marshal', br: 0, row: 0, name: '사기(士氣)', emoji: '🚩',
      shape: 'buff', cost: 34, cd: 16, v: 30, grow: 8, sec: 6, eff: 'atkSpdPct',
      desc: '한동안 손과 발이 빨라진다.' },
    { key: 'm_guard', cls: 'marshal', br: 0, row: 1, name: '호신강기(護身)', emoji: '🛡️',
      shape: 'buff', cost: 30, cd: 14, v: 35, grow: 8, sec: 7, eff: 'guardPct',
      desc: '한동안 받는 피해가 준다.' },
    { key: 'm_banner', cls: 'marshal', br: 0, row: 2, name: '독전(督戰)', emoji: '🎌',
      shape: 'buff', cost: 40, cd: 20, v: 40, grow: 10, sec: 8, eff: 'atkPct',
      desc: '한동안 부대의 공격이 세진다.' },
    { key: 'm_smite', cls: 'marshal', br: 1, row: 0, name: '기격(氣擊)', emoji: '✊',
      shape: 'swing', cost: 20, cd: 4, v: 1.9, grow: 0.4, r: 1.6, el: 'chi',
      desc: '기를 실어 둘레를 친다.' },
    { key: 'm_ring', cls: 'marshal', br: 1, row: 1, name: '기환(氣環)', emoji: '⭕',
      shape: 'nova', cost: 30, cd: 9, v: 2.3, grow: 0.55, r: 140, el: 'chi',
      desc: '기의 고리가 퍼진다.' },
    { key: 'm_heal', cls: 'marshal', br: 1, row: 2, name: '치유(治癒)', emoji: '🌿',
      shape: 'heal', cost: 38, cd: 22, v: 18, grow: 6,
      desc: '그 자리에서 체력을 되찾는다.' },
    { key: 'm_res', cls: 'marshal', br: 2, row: 0, name: '기수련(氣修)', emoji: '☯️',
      shape: 'passive', eff: 'allResPct', v: 5, grow: 4,
      desc: '모든 결의 저항이 오른다.' },
    { key: 'm_wall', cls: 'marshal', br: 2, row: 1, name: '철벽(鐵壁)', emoji: '🧱',
      shape: 'passive', eff: 'guardPct', v: 4, grow: 3,
      desc: '받는 피해가 늘 조금 준다.' },
    { key: 'm_lead', cls: 'marshal', br: 2, row: 2, name: '통솔(統率)', emoji: '👑',
      shape: 'passive', eff: 'hpPct', v: 6, grow: 4,
      desc: '부대 체력이 오른다.' },

    /* ── 방사(方士) — 분신과 저주 ───────────────────────── */
    { key: 'y_shade', cls: 'mystic', br: 0, row: 0, name: '분신술(分身)', emoji: '👥',
      shape: 'summon', cost: 26, cd: 12, v: 1, grow: 1, sec: 12,
      desc: '분신을 세운다. 대신 싸운다.' },
    { key: 'y_horde', cls: 'mystic', br: 0, row: 1, name: '음병(陰兵)', emoji: '💀',
      shape: 'summon', cost: 36, cd: 16, v: 2, grow: 1, sec: 14, str: 1.5,
      desc: '더 많이, 더 세게 세운다.' },
    { key: 'y_golem', cls: 'mystic', br: 0, row: 2, name: '토우(土偶)', emoji: '🗿',
      shape: 'summon', cost: 44, cd: 24, v: 1, grow: 0, sec: 20, str: 4, big: true,
      desc: '흙으로 빚은 큰 것 하나. 오래 버틴다.' },
    { key: 'y_curse', cls: 'mystic', br: 1, row: 0, name: '주박(呪縛)', emoji: '🕸️',
      shape: 'curse', cost: 20, cd: 8, v: 30, grow: 8, r: 130, sec: 5,
      desc: '둘레의 적이 굼떠지고 더 아파한다.' },
    { key: 'y_wither', cls: 'mystic', br: 1, row: 1, name: '고독(蠱毒)', emoji: '🐛',
      shape: 'nova', cost: 28, cd: 9, v: 2.2, grow: 0.5, r: 130, el: 'pois',
      desc: '독기가 퍼진다. 시간을 두고 스민다.' },
    { key: 'y_doom', cls: 'mystic', br: 1, row: 2, name: '멸(滅)', emoji: '☠️',
      shape: 'curse', cost: 40, cd: 18, v: 55, grow: 10, r: 160, sec: 7,
      desc: '둘레의 적이 크게 약해진다.' },
    { key: 'y_leech', cls: 'mystic', br: 2, row: 0, name: '흡정(吸精)', emoji: '🩸',
      shape: 'passive', eff: 'drainPct', v: 2, grow: 1.5,
      desc: '적을 잡으면 체력이 돌아온다.' },
    { key: 'y_hex', cls: 'mystic', br: 2, row: 1, name: '주술(呪術)', emoji: '🔮',
      shape: 'passive', eff: 'skillPct', v: 8, grow: 6,
      desc: '무예의 위력이 오른다.' },
    { key: 'y_spirit', cls: 'mystic', br: 2, row: 2, name: '정신(精神)', emoji: '✨',
      shape: 'passive', eff: 'mpRegen', v: 2, grow: 1.2,
      desc: '기력이 빨리 찬다.' }
  ];

  function skillByKey(k) {
    for (var i = 0; i < SKILLS.length; i++) { if (SKILLS[i].key === k) { return SKILLS[i]; } }
    return null;
  }

  function skillsOf(clsKey) {
    return SKILLS.filter(function (s) { return s.cls === clsKey; });
  }

  /** 한 단 올렸을 때의 값 */
  function valueAt(sk, rank) {
    if (rank <= 0) { return 0; }
    return sk.v + sk.grow * (rank - 1);
  }

  /** 갈래 안에서 이 단계를 열려면 앞 단계에 1점이 있어야 한다 (원작의 규칙) */
  function prereqOf(sk) {
    if (sk.row === 0) { return null; }
    var pool = skillsOf(sk.cls);
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].br === sk.br && pool[i].row === sk.row - 1) { return pool[i]; }
    }
    return null;
  }

  global.DG = global.DG || {};
  global.DG.skillData = {
    CLASSES: CLASSES, SKILLS: SKILLS, MAX_RANK: MAX_RANK,
    classByKey: classByKey, classOf: classOf, weaponsFor: weaponsFor,
    WEAPON_CLASS: WEAPON_CLASS,
    skillByKey: skillByKey, skillsOf: skillsOf,
    valueAt: valueAt, prereqOf: prereqOf
  };
})(window);
