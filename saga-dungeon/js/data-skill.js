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
 *   각궁·철태궁(bow)          → 궁장(弓將)   원작의 아마존 자리
 *   장창·편곤·부월·극창       → 무장(武將)   야만용사 자리
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
 * 직업마다 **일곱 갈래 × 세 단계 = 스물하나**(2026-09-10 하루에 다섯 번
 * 늘었다 — 세 갈래·아홉 → "스킬이 다양해야 하고"·"더 추가해"로 넷째 →
 * "더 추가해"로 다섯째 → "응 진행해"로 여섯째 → 다시 "응 진행해"로
 * 일곱째). 더 늘려 달라고 하면 같은 요령으로 여덟째도 열 수 있다 —
 * 막힌 이유가 없다(`ui.js`의 `br < 7` 하나만 갈래 수에 맞춰 늘리면
 * 된다. 모양×원소 조합은 다섯 모양(swing·bolt·nova·dash·chain) ×
 * 다섯 원소(phys·fire·cold·lit·pois·chi 여섯이니 실은 서른 자리) 중
 * 아직 안 채운 자리가 직업마다 여럿 남아 있어 당분간 재료가 안
 * 바닥난다). 원작은 세 탭 × 열이지만, 이 판은 인물이 여럿이고 레벨이
 * 낮게 오르므로 스물하나면 끝까지 타 볼 수 있다.
 *   · 한 무예는 **다섯 단**까지 올린다
 *   · **앞 단계에 1점이 있어야** 다음 단계가 열린다 (원작의 그 규칙)
 *   · 점수는 **인물 레벨만큼** 생긴다 — 인물마다 따로 센다
 *
 * ── 왜 '모양(shape)' 으로 짰나 ──────────────────────────────
 * 스물하나 × 다섯 직업 = 백다섯인데, 백다섯 개를 따로 구현하면 손을 못 댄다.
 * 원작의 스킬도 실은 **몇 가지 모양**이 원소·수치만 바꿔 가며 되풀이된다.
 * 그래서 모양만 dungeon.js 에 두고, 아래 표는 그 모양에 값을 끼운다.
 *
 *   swing   내 둘레를 벤다            bolt    곧게 나가는 것을 쏜다
 *   nova    내 자리에서 터진다        dash    앞으로 파고든다
 *   buff    잠깐 세진다               heal    그 자리에서 회복한다
 *   curse   둘레의 적을 약하게        summon  분신을 세운다
 *   chain   가까운 적을 치고 다음 적으로 튄다(2026-09-10 신설, 넷째 갈래 전용)
 *   passive 늘 붙어 있다 (쓰지 않는다)
 *
 * 다섯째 갈래부터는 새 모양을 안 늘렸다 — 대신 **그 직업이 여태 한 번도
 * 안 써 본 모양·원소 조합**을 채워 넣는 쪽으로 갔다(궁장의 첫 근접기,
 * 무장의 첫 원거리기, 여섯째 갈래는 이미 모든 모양을 갖춘 직업(방사·
 * 도독)엔 **안 써 본 원소**를 얹는 식). 참고 — `curse`·`heal`·`buff`·
 * `summon` 은 `el`(원소)을 안 읽는다(다치는 판정을 안 하거나 상태만
 * 바꾼다) — 이 네 모양엔 `el`을 안 붙인다, 붙여도 조용히 무시된다.
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

  /* ── 무예 아흔 ────────────────────────────────────────────
   * cls    직업 · br 갈래(0~5) · row 단계(0~2)
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
      desc: '기력이 빨리 찬다.' },

    /* ── 넷째 갈래(2026-09-10) — 다섯 직업 다 "연환(連環, chain)"을 하나씩
     * 들고, 나머지 두 자리는 그 직업이 여태 안 써 본 모양을 끼운다
     * (예: 책사가 처음 휘두르는 무기, 무장이 처음 던지는 원소 대시).
     * 직업 색은 그대로 두되 **손이 진짜 넓어지게**. */
    { key: 'a_chain', cls: 'archer', br: 3, row: 0, name: '연환시(連環矢)', emoji: '🔗',
      shape: 'chain', cost: 22, cd: 9, v: 1.7, grow: 0.4,
      desc: '가까운 적을 꿰고 다음 적으로 튄다.' },
    { key: 'a_venom', cls: 'archer', br: 3, row: 1, name: '독시(毒矢)', emoji: '🧪',
      shape: 'bolt', cost: 18, cd: 4, v: 1.4, grow: 0.35, el: 'pois',
      desc: '독을 바른 화살. 스민 독이 계속 아프게 한다.' },
    { key: 'a_cripple', cls: 'archer', br: 3, row: 2, name: '파훼시(破毀矢)', emoji: '💢',
      shape: 'curse', cost: 28, cd: 10, v: 36, grow: 9, r: 140, sec: 6,
      desc: '급소를 노려 적을 굼뜨고 약하게 만든다.' },

    { key: 'w_chain', cls: 'warrior', br: 3, row: 0, name: '연환격(連環擊)', emoji: '🔗',
      shape: 'chain', cost: 24, cd: 9, v: 1.8, grow: 0.4,
      desc: '가까운 적을 치고 다음 적으로 옮겨 붙는다.' },
    { key: 'w_blaze_dash', cls: 'warrior', br: 3, row: 1, name: '화염돌진(火焰突進)', emoji: '🔥',
      shape: 'dash', cost: 22, cd: 8, v: 1.4, grow: 0.35, el: 'fire',
      desc: '불을 두르고 파고든다.' },
    { key: 'w_palm', cls: 'warrior', br: 3, row: 2, name: '벽력장(霹靂掌)', emoji: '👊',
      shape: 'nova', cost: 40, cd: 13, v: 3.2, grow: 0.65, r: 150, el: 'chi',
      desc: '기를 뻗어 둘레를 크게 친다.' },

    { key: 's_chainfire', cls: 'scholar', br: 3, row: 0, name: '연쇄화염(連鎖火焰)', emoji: '🔗',
      shape: 'chain', cost: 26, cd: 9, v: 1.9, grow: 0.45, el: 'fire',
      desc: '불덩이가 적 사이를 옮겨 붙는다.' },
    { key: 's_fan', cls: 'scholar', br: 3, row: 1, name: '선풍(扇風)', emoji: '🪭',
      shape: 'swing', cost: 20, cd: 5, v: 1.6, grow: 0.35, r: 1.8, kb: 24, el: 'cold',
      desc: '부채를 크게 휘둘러 둘레를 벤다.' },
    { key: 's_spirit', cls: 'scholar', br: 3, row: 2, name: '빙정소환(氷精召喚)', emoji: '❄️',
      shape: 'summon', cost: 34, cd: 15, v: 1, grow: 1, sec: 13,
      desc: '얼음 정령을 불러 대신 싸우게 한다.' },

    { key: 'm_chain', cls: 'marshal', br: 3, row: 0, name: '연환기격(連環氣擊)', emoji: '🔗',
      shape: 'chain', cost: 24, cd: 9, v: 1.9, grow: 0.4, el: 'chi',
      desc: '기를 실어 가까운 적을 연달아 친다.' },
    { key: 'm_press', cls: 'marshal', br: 3, row: 1, name: '위압(威壓)', emoji: '📛',
      shape: 'curse', cost: 26, cd: 10, v: 32, grow: 8, r: 140, sec: 6,
      desc: '위세로 적을 굼뜨고 약하게 만든다.' },
    { key: 'm_charge', cls: 'marshal', br: 3, row: 2, name: '기신보(氣身步)', emoji: '💨',
      shape: 'dash', cost: 20, cd: 7, v: 1.5, grow: 0.35, el: 'chi',
      desc: '기를 두르고 파고든다.' },

    { key: 'y_chain', cls: 'mystic', br: 3, row: 0, name: '독쇄(毒鎖)', emoji: '🔗',
      shape: 'chain', cost: 22, cd: 9, v: 1.8, grow: 0.4, el: 'pois',
      desc: '독한 기운이 적 사이를 옮겨 붙는다.' },
    { key: 'y_ghoststrike', cls: 'mystic', br: 3, row: 1, name: '음령타(陰靈打)', emoji: '👻',
      shape: 'swing', cost: 22, cd: 6, v: 1.7, grow: 0.35, r: 1.8, kb: 20, el: 'chi',
      desc: '음기를 둘러 손이 닿는 대로 친다.' },
    { key: 'y_possess', cls: 'mystic', br: 3, row: 2, name: '귀합(鬼合)', emoji: '🕯️',
      shape: 'buff', cost: 32, cd: 16, v: 35, grow: 9, sec: 7, eff: 'atkPct',
      desc: '한동안 음병의 기운이 몸에 실려 공격이 세진다.' },

    /* ── 다섯째 갈래(2026-09-10, 같은 세션에 "더 추가해") — 새 모양은
     * 안 늘리고, 그 직업이 여태 한 번도 안 써 본 모양만 골라 채운다. */
    { key: 'a_flourish', cls: 'archer', br: 4, row: 0, name: '궁신무(弓身舞)', emoji: '🥋',
      shape: 'swing', cost: 20, cd: 5, v: 1.5, grow: 0.35, r: 1.6, kb: 18,
      desc: '활대로 후려친다. 가까이 붙은 적에게 쓴다.' },
    { key: 'a_speedy', cls: 'archer', br: 4, row: 1, name: '속사태세(速射態勢)', emoji: '🏃',
      shape: 'buff', cost: 28, cd: 14, v: 32, grow: 8, sec: 6, eff: 'atkSpdPct',
      desc: '한동안 손이 훨씬 빨라진다.' },
    { key: 'a_hawk', cls: 'archer', br: 4, row: 2, name: '응사소환(鷹使召喚)', emoji: '🦅',
      shape: 'summon', cost: 36, cd: 16, v: 1, grow: 1, sec: 14,
      desc: '매를 불러 대신 싸우게 한다.' },

    { key: 'w_throw', cls: 'warrior', br: 4, row: 0, name: '투창(投槍)', emoji: '🎯',
      shape: 'bolt', cost: 16, cd: 4, v: 1.6, grow: 0.4,
      desc: '창을 던진다. 곧게 나간다.' },
    { key: 'w_regen', cls: 'warrior', br: 4, row: 1, name: '회생(回生)', emoji: '💗',
      shape: 'heal', cost: 30, cd: 16, v: 16, grow: 6,
      desc: '상처를 다잡아 체력을 되찾는다.' },
    { key: 'w_hound', cls: 'warrior', br: 4, row: 2, name: '군견소환(軍犬召喚)', emoji: '🐕',
      shape: 'summon', cost: 34, cd: 15, v: 1, grow: 1, sec: 13,
      desc: '군견을 풀어 대신 싸우게 한다.' },

    { key: 's_blink', cls: 'scholar', br: 4, row: 0, name: '축지(縮地)', emoji: '⚡',
      shape: 'dash', cost: 20, cd: 7, v: 1.3, grow: 0.3, el: 'lit',
      desc: '번개처럼 파고든다.' },
    { key: 's_hex', cls: 'scholar', br: 4, row: 1, name: '저주(咀呪)', emoji: '🕸️',
      shape: 'curse', cost: 24, cd: 9, v: 30, grow: 8, r: 130, sec: 5,
      desc: '적을 굼뜨고 약하게 만든다.' },
    { key: 's_insight', cls: 'scholar', br: 4, row: 2, name: '심득(心得)', emoji: '🧠',
      shape: 'buff', cost: 32, cd: 15, v: 38, grow: 9, sec: 7, eff: 'skillPct',
      desc: '한동안 무예의 위력이 크게 오른다.' },

    { key: 'm_javelin', cls: 'marshal', br: 4, row: 0, name: '표창(標槍)', emoji: '🎯',
      shape: 'bolt', cost: 16, cd: 4, v: 1.5, grow: 0.35, el: 'chi',
      desc: '기를 실은 창을 던진다.' },
    { key: 'm_reserve', cls: 'marshal', br: 4, row: 1, name: '원군소환(援軍召喚)', emoji: '🛡️',
      shape: 'summon', cost: 36, cd: 16, v: 1, grow: 1, sec: 14,
      desc: '원군을 불러 대신 싸우게 한다.' },
    { key: 'm_precision', cls: 'marshal', br: 4, row: 2, name: '필중(必中)', emoji: '🎯',
      shape: 'buff', cost: 30, cd: 15, v: 12, grow: 4, sec: 6, eff: 'critPct',
      desc: '한동안 급소를 정확히 노린다.' },

    { key: 'y_soulbolt', cls: 'mystic', br: 4, row: 0, name: '혼탄(魂彈)', emoji: '🔮',
      shape: 'bolt', cost: 16, cd: 3, v: 1.6, grow: 0.4, el: 'chi',
      desc: '넋을 실은 기를 쏜다.' },
    { key: 'y_specter', cls: 'mystic', br: 4, row: 1, name: '귀보(鬼步)', emoji: '👻',
      shape: 'dash', cost: 20, cd: 7, v: 1.3, grow: 0.3, el: 'pois',
      desc: '혼백처럼 스며들어 파고든다.' },
    { key: 'y_soulmend', cls: 'mystic', br: 4, row: 2, name: '혼백치유(魂魄治癒)', emoji: '💗',
      shape: 'heal', cost: 34, cd: 18, v: 20, grow: 7,
      desc: '떠도는 기운을 모아 상처를 아문다.' },

    /* ── 여섯째 갈래(2026-09-10, 같은 세션에 다시 "더 추가해") — 궁장·
     * 무장·책사는 아직 안 남은 모양 자리(대시·회복·저주)부터 채우고,
     * 이미 모양을 다 갖춘 도독·방사는 **안 써 본 원소**로 채운다. */
    { key: 'a_dashshot', cls: 'archer', br: 5, row: 0, name: '질주사(疾走射)', emoji: '💨',
      shape: 'dash', cost: 18, cd: 6, v: 1.3, grow: 0.3,
      desc: '몸을 날려 스치며 벤다. 궁장의 첫 돌진기.' },
    { key: 'a_firstaid', cls: 'archer', br: 5, row: 1, name: '응급처치(應急處置)', emoji: '💗',
      shape: 'heal', cost: 26, cd: 14, v: 14, grow: 5,
      desc: '상처를 싸매 체력을 되찾는다.' },
    { key: 'a_gale', cls: 'archer', br: 5, row: 2, name: '기환시(氣環矢)', emoji: '🌀',
      shape: 'nova', cost: 30, cd: 9, v: 2.1, grow: 0.5, r: 130, el: 'chi',
      desc: '기를 실은 화살비. 시우(矢雨)와 달리 기 결이다.' },

    { key: 'w_intimidate', cls: 'warrior', br: 5, row: 0, name: '위해(威嚇)', emoji: '📛',
      shape: 'curse', cost: 24, cd: 9, v: 30, grow: 8, r: 130, sec: 5,
      desc: '노호로 적을 굼뜨고 약하게 만든다. 무장의 첫 저주.' },
    { key: 'w_frostcleave', cls: 'warrior', br: 5, row: 1, name: '빙인참(氷刃斬)', emoji: '🧊',
      shape: 'swing', cost: 24, cd: 6, v: 1.8, grow: 0.4, r: 1.7, kb: 30, el: 'cold',
      desc: '날을 얼려 벤다. 맞은 적이 굼떠진다.' },
    { key: 'w_thunderlance', cls: 'warrior', br: 5, row: 2, name: '벽력창(霹靂槍)', emoji: '⚡',
      shape: 'bolt', cost: 22, cd: 6, v: 1.8, grow: 0.45, el: 'lit',
      desc: '벼락을 실어 던진다.' },

    { key: 's_restore', cls: 'scholar', br: 5, row: 0, name: '축기회복(蓄氣回復)', emoji: '💗',
      shape: 'heal', cost: 30, cd: 16, v: 16, grow: 6,
      desc: '기를 모아 상처를 아문다. 책사의 첫 회복.' },
    { key: 's_plague', cls: 'scholar', br: 5, row: 1, name: '역병(疫病)', emoji: '🦠',
      shape: 'nova', cost: 32, cd: 10, v: 2.1, grow: 0.5, r: 130, el: 'pois',
      desc: '둘레에 역병을 퍼뜨린다.' },
    { key: 's_venombolt', cls: 'scholar', br: 5, row: 2, name: '독무탄(毒霧彈)', emoji: '☠️',
      shape: 'bolt', cost: 18, cd: 4, v: 1.5, grow: 0.4, el: 'pois',
      desc: '독무를 뭉쳐 던진다.' },

    { key: 'm_flamesaber', cls: 'marshal', br: 5, row: 0, name: '화도(火刀)', emoji: '🔥',
      shape: 'swing', cost: 24, cd: 6, v: 1.9, grow: 0.4, r: 1.7, kb: 26, el: 'fire',
      desc: '칼날에 불을 둘러 벤다. 도독의 첫 불.' },
    { key: 'm_venomfield', cls: 'marshal', br: 5, row: 1, name: '독진(毒陣)', emoji: '☠️',
      shape: 'nova', cost: 32, cd: 10, v: 2.2, grow: 0.5, r: 140, el: 'pois',
      desc: '둘레에 독 기운을 퍼뜨린다.' },
    { key: 'm_frostcharge', cls: 'marshal', br: 5, row: 2, name: '빙보(氷步)', emoji: '🧊',
      shape: 'dash', cost: 20, cd: 7, v: 1.4, grow: 0.35, el: 'cold',
      desc: '얼음을 두르고 파고든다.' },

    { key: 'y_thunderdoom', cls: 'mystic', br: 5, row: 0, name: '뇌쇄(雷殺)', emoji: '⚡',
      shape: 'nova', cost: 30, cd: 9, v: 2.2, grow: 0.5, r: 130, el: 'lit',
      desc: '벼락이 둘레에 떨어진다. 방사의 첫 벼락.' },
    { key: 'y_hellstrike', cls: 'mystic', br: 5, row: 1, name: '화령타(火靈打)', emoji: '🔥',
      shape: 'swing', cost: 24, cd: 6, v: 1.8, grow: 0.4, r: 1.7, kb: 22, el: 'fire',
      desc: '귀화(鬼火)를 둘러 손이 닿는 대로 친다.' },
    { key: 'y_frostchain', cls: 'mystic', br: 5, row: 2, name: '빙쇄(氷鎖)', emoji: '🧊',
      shape: 'chain', cost: 24, cd: 9, v: 1.8, grow: 0.4, el: 'cold',
      desc: '언 기운이 적 사이를 옮겨 붙는다.' },

    /* ── 일곱째 갈래(2026-09-10, "응 진행해") — 다섯 갈래·여섯째와 같은
     * 요령: 모양은 안 늘리고, 그 직업이 아직 안 써 본 모양×원소 조합을
     * 채운다. */
    { key: 'a_flamedance', cls: 'archer', br: 6, row: 0, name: '염인무(炎刃舞)', emoji: '🔥',
      shape: 'swing', cost: 22, cd: 6, v: 1.7, grow: 0.4, r: 1.7, kb: 22, el: 'fire',
      desc: '활대에 불을 둘러 후려친다.' },
    { key: 'a_venomchain', cls: 'archer', br: 6, row: 1, name: '독쇄시(毒鎖矢)', emoji: '🔗',
      shape: 'chain', cost: 24, cd: 9, v: 1.8, grow: 0.4, el: 'pois',
      desc: '독 기운이 적 사이를 옮겨 붙는다.' },
    { key: 'a_firerain', cls: 'archer', br: 6, row: 2, name: '화우(火雨)', emoji: '🌋',
      shape: 'nova', cost: 32, cd: 10, v: 2.3, grow: 0.5, r: 130, el: 'fire',
      desc: '불화살비가 둘레에 쏟아진다.' },

    { key: 'w_blastfire', cls: 'warrior', br: 6, row: 0, name: '폭염진(爆炎陣)', emoji: '🌋',
      shape: 'nova', cost: 34, cd: 11, v: 2.6, grow: 0.55, r: 140, el: 'fire',
      desc: '땅을 굴러 불길을 뿜는다.' },
    { key: 'w_firelance', cls: 'warrior', br: 6, row: 1, name: '화창(火槍)', emoji: '🔥',
      shape: 'bolt', cost: 20, cd: 5, v: 1.7, grow: 0.4, el: 'fire',
      desc: '불을 둘러 던진다.' },
    { key: 'w_frostchain', cls: 'warrior', br: 6, row: 2, name: '빙격연환(氷擊連環)', emoji: '🔗',
      shape: 'chain', cost: 24, cd: 9, v: 1.8, grow: 0.4, el: 'cold',
      desc: '언 기운이 적 사이를 옮겨 붙는다.' },

    { key: 's_thundercage', cls: 'scholar', br: 6, row: 0, name: '뇌옥(雷獄)', emoji: '⚡',
      shape: 'nova', cost: 34, cd: 10, v: 2.4, grow: 0.55, r: 130, el: 'lit',
      desc: '벼락 감옥이 둘레를 가둔다.' },
    { key: 's_flamefan', cls: 'scholar', br: 6, row: 1, name: '화선(火扇)', emoji: '🪭',
      shape: 'swing', cost: 22, cd: 6, v: 1.7, grow: 0.4, r: 1.8, kb: 20, el: 'fire',
      desc: '부채에 불을 실어 휘두른다.' },
    { key: 's_chichain', cls: 'scholar', br: 6, row: 2, name: '기쇄(氣鎖)', emoji: '🔗',
      shape: 'chain', cost: 26, cd: 9, v: 1.9, grow: 0.45, el: 'chi',
      desc: '기가 적 사이를 옮겨 붙는다.' },

    { key: 'm_firestrike', cls: 'marshal', br: 6, row: 0, name: '화표(火標)', emoji: '🔥',
      shape: 'bolt', cost: 20, cd: 5, v: 1.7, grow: 0.4, el: 'fire',
      desc: '불을 실은 표창을 던진다.' },
    { key: 'm_firestorm', cls: 'marshal', br: 6, row: 1, name: '화진(火陣)', emoji: '🌋',
      shape: 'nova', cost: 34, cd: 11, v: 2.5, grow: 0.55, r: 140, el: 'fire',
      desc: '둘레에 불길을 일으킨다.' },
    { key: 'm_frostblade', cls: 'marshal', br: 6, row: 2, name: '빙인(氷刃)', emoji: '🧊',
      shape: 'swing', cost: 22, cd: 6, v: 1.8, grow: 0.4, r: 1.7, kb: 26, el: 'cold',
      desc: '날을 얼려 벤다.' },

    { key: 'y_poisonbolt', cls: 'mystic', br: 6, row: 0, name: '독혼탄(毒魂彈)', emoji: '☠️',
      shape: 'bolt', cost: 18, cd: 4, v: 1.6, grow: 0.4, el: 'pois',
      desc: '독을 실은 넋을 쏜다.' },
    { key: 'y_frostspirit', cls: 'mystic', br: 6, row: 1, name: '빙령타(氷靈打)', emoji: '🧊',
      shape: 'swing', cost: 22, cd: 6, v: 1.7, grow: 0.4, r: 1.7, kb: 20, el: 'cold',
      desc: '언 기운을 둘러 손이 닿는 대로 친다.' },
    { key: 'y_infernoring', cls: 'mystic', br: 6, row: 2, name: '화염귀진(火焰鬼陣)', emoji: '🌋',
      shape: 'nova', cost: 32, cd: 10, v: 2.3, grow: 0.5, r: 130, el: 'fire',
      desc: '귀화가 둘레에 터진다.' }
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
