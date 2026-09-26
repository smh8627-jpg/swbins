/**
 * 스프라이트 — 사람 그림(마을 지도·초상)과 펫 초상
 * ---------------------------------------------------------------
 * 사람(주민·나·NPC)은 실제 그림(Kenney `human_*`, 늘 있음)을 쓴다 — 절차적
 * human()/beast() 는 2026-09-22 Phase 4 에서 지웠다. 이 판은 지도에서 'beast'
 * 스탬프를 부르는 곳이 없어(짐승은 `village-view.js` 가 따로 그리는 배경
 * 생물 5종뿐, `assets/sprites2d/animals/`) map 쪽은 원래도 안 타던 길이었다.
 * 펫 초상(도감)은 디스크 초상(`assets/portraits/pet`, 105종 전부 구워져
 * 있다)이 먼저 잡히므로 3D 를 못 쓰는 드문 경우만 작은 자리표시로 대신한다
 * (2D 대체 그림이 없어 — saga-go 의 `BEAST_FORM_FILES` 같은 것이 없다).
 *
 * 외형 파라미터는 인물마다 일일이 적지 않는다. 기질(무/지/덕)·세력·등급에서
 * 규칙으로 뽑고, 특징이 뚜렷한 인물만 예외 표에 적는다(LOOKS).
 */
(function (global) {
  'use strict';

  /* ── 색 도구 ──────────────────────────────────────────── */

  /**
   * '#abc' · '#aabbcc' · 'rgb(1,2,3)' 을 모두 받는다.
   * shade() 의 반환값이 rgb() 문자열이라, 색을 두 번 겹쳐 어둡게 할 때 여기로 다시 들어온다.
   */
  function hex2rgb(h) {
    h = String(h);
    if (h.indexOf('rgb') === 0) {
      var m = h.replace(/[^0-9,.\-]/g, '').split(',');
      return [parseFloat(m[0]) || 0, parseFloat(m[1]) || 0, parseFloat(m[2]) || 0];
    }
    h = h.replace('#', '');
    if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function shade(hexColor, amt) {
    var c = hex2rgb(hexColor);
    for (var i = 0; i < 3; i++) {
      c[i] = amt >= 0 ? Math.round(c[i] + (255 - c[i]) * amt) : Math.round(c[i] * (1 + amt));
      c[i] = Math.max(0, Math.min(255, c[i]));
    }
    return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  }

  /* ── 몸 비례 ────────────────────────────────────────────
   * 사람 스프라이트의 비례. 값은 키(H)에 대한 비율이다.
   *   headR 머리 반지름 · headY 머리 중심 · shoY 어깨 · hipY 골반
   *   leg 다리 길이 · arm 팔 길이 · thick 팔다리 굵기 배율
   * 원작처럼 2등신 고정이다.
   */
  var PROPS_NORMAL = { headR: 0.240, headY: 0.735, shoY: 0.500, hipY: 0.300, leg: 0.270, arm: 0.230, thick: 1.45 };

  /* ── 그림 양식 ────────────────────────────────────────────
   * 그림책(도감)풍 하나로 고정이다 — 얇은 갈색 선화 + 낮은 채도의 플랫 채색.
   * 다 그린 다음 픽셀에서 한 번 훑어 만든다(storyize 참조) — 선화·플랫 채색은
   * 도형마다 손보는 게 아니라 화면 전체에 걸리는 성질이라 인물 48·짐승 25·
   * 장비까지 한 번에 맞추는 유일한 길이다.
   */

  /* ── 인물 외형 ────────────────────────────────────────── */

  /** 특징이 뚜렷한 인물만 지정한다. 나머지는 규칙으로 만들어진다. */
  var LOOKS = {
    sg_guanyu:     { weapon: 'guandao', helm: 'helmet', armor: 'plate', beard: true, cape: true },
    sg_zhangfei:   { weapon: 'spear', helm: 'helmet', armor: 'plate', beard: true },
    sg_zhaoyun:    { weapon: 'spear', helm: 'helmet', armor: 'plate', cape: true },
    sg_zhugeliang: { weapon: 'fan', helm: 'scholar', armor: 'robe' },
    sg_liubei:     { weapon: 'sword', helm: 'crown', armor: 'robe', cape: true },
    sg_machao:     { weapon: 'spear', helm: 'helmet', armor: 'plate', cape: true },
    sg_huangzhong: { weapon: 'bow', helm: 'helmet', armor: 'leather', beard: true },
    sg_caocao:     { weapon: 'sword', helm: 'crown', armor: 'plate', cape: true },
    sg_simayi:     { weapon: 'staff', helm: 'scholar', armor: 'robe', beard: true },
    sg_xiahoudun:  { weapon: 'sword', helm: 'helmet', armor: 'plate', eyepatch: true },
    sg_zhangliao:  { weapon: 'halberd', helm: 'helmet', armor: 'plate' },
    sg_xunyu:      { weapon: 'scroll', helm: 'scholar', armor: 'robe' },
    sg_sunquan:    { weapon: 'sword', helm: 'crown', armor: 'robe', cape: true },
    sg_zhouyu:     { weapon: 'sword', helm: 'scholar', armor: 'plate', cape: true },
    sg_luxun:      { weapon: 'fan', helm: 'scholar', armor: 'plate' },
    sg_taishici:   { weapon: 'bow', helm: 'helmet', armor: 'plate' },
    sg_ganning:    { weapon: 'sword', helm: 'none', armor: 'leather' },
    sg_lubu:       { weapon: 'halberd', helm: 'plume', armor: 'plate', cape: true },
    sg_diaochan:   { weapon: 'none', helm: 'hairpin', armor: 'dress', skirt: true },
    sg_pangtong:   { weapon: 'scroll', helm: 'scholar', armor: 'robe' },
    sg_huatuo:     { weapon: 'staff', helm: 'scholar', armor: 'robe', beard: true },
    sg_menghuo:    { weapon: 'club', helm: 'none', armor: 'leather', beard: true },

    kr_yisunsin:      { weapon: 'sword', helm: 'gapju', armor: 'plate', cape: true, beard: true },
    kr_euljimundeok:  { weapon: 'sword', helm: 'gapju', armor: 'plate', beard: true },
    kr_ganggamchan:   { weapon: 'staff', helm: 'gat', armor: 'robe', beard: true },
    kr_kimyusin:      { weapon: 'sword', helm: 'gapju', armor: 'plate' },
    kr_gyebaek:       { weapon: 'spear', helm: 'gapju', armor: 'plate' },
    kr_yeongaesomun:  { weapon: 'axe', helm: 'gapju', armor: 'plate', beard: true },
    kr_gwanggaeto:    { weapon: 'spear', helm: 'crown', armor: 'plate', cape: true },
    kr_sejong:        { weapon: 'scroll', helm: 'crown', armor: 'robe', beard: true },
    kr_jangyeongsil:  { weapon: 'staff', helm: 'gat', armor: 'robe' },
    kr_choemuseon:    { weapon: 'staff', helm: 'gat', armor: 'robe' },
    kr_daejoyeong:    { weapon: 'sword', helm: 'gapju', armor: 'plate', cape: true },
    kr_wanggeon:      { weapon: 'sword', helm: 'crown', armor: 'plate', cape: true, beard: true },
    kr_jeongyakyong:  { weapon: 'scroll', helm: 'gat', armor: 'robe' },
    kr_heojun:        { weapon: 'staff', helm: 'gat', armor: 'robe', beard: true },
    kr_sinsaimdang:   { weapon: 'brush', helm: 'hairpin', armor: 'dress', skirt: true },
    kr_ahnjunggeun:   { weapon: 'none', helm: 'none', armor: 'coat' },
    kr_yugwansun:     { weapon: 'none', helm: 'braid', armor: 'dress', skirt: true },
    kr_kimgu:         { weapon: 'none', helm: 'none', armor: 'coat', glasses: true },
    kr_wonhyo:        { weapon: 'staff', helm: 'monk', armor: 'robe' },
    kr_kimjeongho:    { weapon: 'scroll', helm: 'gat', armor: 'robe' },
    kr_gwakjaeu:      { weapon: 'sword', helm: 'gapju', armor: 'plate', cape: true },
    kr_nongae:        { weapon: 'none', helm: 'hairpin', armor: 'dress', skirt: true },
    kr_yihwang:       { weapon: 'scroll', helm: 'gat', armor: 'robe', beard: true },
    kr_yii:           { weapon: 'brush', helm: 'gat', armor: 'robe' },
    kr_hwanghui:      { weapon: 'scroll', helm: 'gat', armor: 'robe', beard: true },
    kr_jeongmongju:   { weapon: 'scroll', helm: 'gat', armor: 'robe', beard: true },

    /* 세계사(옛 유럽사) — 규칙(ruleLook)에 맡기면 갓·도포가 붙으므로 전원 지정한다.
       새 파츠를 만들지 않고 있는 것으로만 조합했다: 투구는 helmet, 장식 모자는 plume,
       왕관은 crown, 제복은 coat. */
    eu_caesar:        { weapon: 'sword', helm: 'crown', armor: 'plate', cape: true },
    eu_alexander:     { weapon: 'spear', helm: 'plume', armor: 'plate', cape: true },
    eu_hannibal:      { weapon: 'sword', helm: 'helmet', armor: 'plate', cape: true, beard: true },
    eu_charlemagne:   { weapon: 'sword', helm: 'crown', armor: 'plate', cape: true, beard: true },
    eu_joan:          { weapon: 'sword', helm: 'helmet', armor: 'plate', cape: true },
    eu_napoleon:      { weapon: 'sword', helm: 'plume', armor: 'coat', cape: true },
    eu_davinci:       { weapon: 'brush', helm: 'none', armor: 'robe', beard: true },
    eu_augustus:      { weapon: 'scroll', helm: 'crown', armor: 'robe', cape: true },
    eu_scipio:        { weapon: 'sword', helm: 'helmet', armor: 'plate', cape: true },
    eu_leonidas:      { weapon: 'spear', helm: 'plume', armor: 'plate', cape: true, beard: true },
    eu_aurelius:      { weapon: 'scroll', helm: 'crown', armor: 'robe', beard: true },
    eu_richard:       { weapon: 'sword', helm: 'helmet', armor: 'plate', cape: true },
    eu_william:       { weapon: 'sword', helm: 'helmet', armor: 'plate', cape: true },
    eu_harald:        { weapon: 'axe', helm: 'helmet', armor: 'plate', beard: true },
    eu_frederick:     { weapon: 'sword', helm: 'plume', armor: 'coat', cape: true },
    eu_peter:         { weapon: 'sword', helm: 'plume', armor: 'coat', beard: true },
    eu_elizabeth:     { weapon: 'none', helm: 'crown', armor: 'dress', skirt: true },
    eu_nelson:        { weapon: 'sword', helm: 'plume', armor: 'coat' },
    eu_machiavelli:   { weapon: 'brush', helm: 'none', armor: 'robe' },
    eu_newton:        { weapon: 'scroll', helm: 'scholar', armor: 'robe' },
    eu_michelangelo:  { weapon: 'brush', helm: 'none', armor: 'robe', beard: true },
    eu_eleanor:       { weapon: 'none', helm: 'crown', armor: 'dress', skirt: true },

    /* 일본사(2026-09-10) — 갑주 계열은 gapju(투구 대역)로 통일, 문인은 none+robe */
    jp_himiko:      { weapon: 'staff', helm: 'none', armor: 'dress', skirt: true },
    jp_taira:       { weapon: 'sword', helm: 'crown', armor: 'coat', cape: true },
    jp_yoritomo:    { weapon: 'sword', helm: 'helmet', armor: 'plate', cape: true },
    jp_yoshitsune:  { weapon: 'spear', helm: 'helmet', armor: 'plate', cape: true },
    jp_murasaki:    { weapon: 'brush', helm: 'none', armor: 'robe' },
    jp_seishonagon: { weapon: 'brush', helm: 'none', armor: 'robe' },
    jp_tomoegozen:  { weapon: 'guandao', helm: 'helmet', armor: 'plate', cape: true },
    jp_nobunaga:    { weapon: 'sword', helm: 'gapju', armor: 'plate', cape: true },
    jp_hideyoshi:   { weapon: 'fan', helm: 'gapju', armor: 'coat' },
    jp_ieyasu:      { weapon: 'sword', helm: 'gapju', armor: 'plate', cape: true },
    jp_shingen:     { weapon: 'guandao', helm: 'gapju', armor: 'plate', cape: true, beard: true },
    jp_kenshin:     { weapon: 'sword', helm: 'gapju', armor: 'plate', cape: true },
    jp_masamune:    { weapon: 'sword', helm: 'gapju', armor: 'plate', cape: true, beard: true },
    jp_yukimura:    { weapon: 'spear', helm: 'gapju', armor: 'plate', cape: true },
    jp_musashi:     { weapon: 'sword', helm: 'none', armor: 'leather' },
    jp_hanzo:       { weapon: 'club', helm: 'none', armor: 'leather' },
    jp_mitsukuni:   { weapon: 'scroll', helm: 'none', armor: 'robe', beard: true },
    jp_naosuke:     { weapon: 'scroll', helm: 'none', armor: 'coat', beard: true },
    jp_saigo:       { weapon: 'sword', helm: 'none', armor: 'coat', beard: true },
    jp_ryoma:       { weapon: 'sword', helm: 'none', armor: 'coat' },

    /* 세계사, 비유럽(2026-09-10) */
    wd_ashoka:      { weapon: 'staff', helm: 'crown', armor: 'robe' },
    wd_akbar:       { weapon: 'sword', helm: 'crown', armor: 'coat', cape: true },
    wd_saladin:     { weapon: 'sword', helm: 'helmet', armor: 'plate', cape: true, beard: true },
    wd_suleiman:    { weapon: 'sword', helm: 'crown', armor: 'coat', cape: true, beard: true },
    wd_ibnsina:     { weapon: 'scroll', helm: 'none', armor: 'robe', beard: true },
    wd_genghis:     { weapon: 'spear', helm: 'helmet', armor: 'plate', cape: true, beard: true },
    wd_khubilai:    { weapon: 'sword', helm: 'crown', armor: 'coat', cape: true, beard: true },
    wd_mansamusa:   { weapon: 'none', helm: 'crown', armor: 'robe', cape: true },
    wd_shaka:       { weapon: 'spear', helm: 'none', armor: 'leather' },
    wd_cleopatra:   { weapon: 'none', helm: 'crown', armor: 'dress', skirt: true },
    wd_pachacuti:   { weapon: 'staff', helm: 'crown', armor: 'robe' },
    wd_moctezuma:   { weapon: 'club', helm: 'crown', armor: 'leather' },
    wd_ibnbattuta:  { weapon: 'scroll', helm: 'none', armor: 'robe' },
    wd_hammurabi:   { weapon: 'scroll', helm: 'crown', armor: 'robe', beard: true },
    wd_attila:      { weapon: 'axe', helm: 'helmet', armor: 'plate', beard: true }
  };

  /** 표에 없는 인물은 기질·등급에서 규칙으로 만든다 */
  function ruleLook(hero) {
    if (hero.trait === 'might') {
      return { weapon: 'spear', helm: 'helmet', armor: 'plate', cape: hero.rarity >= 5 };
    }
    if (hero.trait === 'wisdom') {
      return { weapon: 'scroll', helm: 'scholar', armor: 'robe' };
    }
    return { weapon: 'sword', helm: hero.rarity >= 5 ? 'crown' : 'gat', armor: 'robe', cape: hero.rarity >= 4 };
  }

  var lookCache = {};

  /**
   * 인물의 외형. LOOKS 에 적힌 것을 그대로 쓰고, 적지 않아도 되는 것(눈썹 모양처럼
   * 기질에서 바로 나오는 것)은 여기서 파생시킨다. LOOKS 원본은 건드리지 않는다.
   */
  function lookOf(hero) {
    if (!hero) { return { weapon: 'sword', helm: 'none', armor: 'leather', brow: 'flat' }; }
    if (lookCache[hero.id]) { return lookCache[hero.id]; }
    var base = LOOKS[hero.id] || ruleLook(hero);
    var out = {}, k;
    for (k in base) {
      if (Object.prototype.hasOwnProperty.call(base, k)) { out[k] = base[k]; }
    }
    out.brow = hero.trait === 'might' ? 'sharp' : (hero.trait === 'virtue' ? 'soft' : 'flat');
    lookCache[hero.id] = out;
    return out;
  }

  /* ── 사람 ─────────────────────────────────────────────── */

  /**
   * @param o {x, y, s, facing, phase, walking, color, skin, look, t}
   *          (x, y) 는 발이 닿는 지점. s=1 이면 키 40px.
   */

  /* ── 짐승 ─────────────────────────────────────────────── */

  var BEAST_FORM = {
    pt_samjogo: 'bird', pt_haetae: 'quad', pt_cheongryong: 'dragon',
    pt_baekho: 'quad', pt_jujak: 'bird', pt_hyeonmu: 'turtle',
    pt_gumiho: 'quad', pt_dokkaebi: 'ogre', pt_bulgasari: 'quad',
    pt_jeoktoma: 'horse', pt_jeolyeong: 'horse',
    pt_jindo: 'quad', pt_sapsal: 'quad', pt_tiger: 'quad', pt_bear: 'quad',
    pt_magpie: 'bird', pt_crane: 'bird', pt_toad: 'toad', pt_carp: 'fish',
    pt_panda: 'quad', pt_monkey: 'quad', pt_deer: 'quad', pt_boar: 'quad',
    pt_owl: 'bird', pt_cat: 'quad',
    /* 창작 짐승 열여섯(2026-09-26, 옛 오마주 자리 — id 만 남았다). 모양은 입고 있는 CC0 모델(`asset3d` standin)을 따른다 */
    pk_bulbasaur: 'toad', pk_charmander: 'ogre', pk_squirtle: 'ogre', pk_magikarp: 'bird',
    pk_pikachu: 'quad', pk_eevee: 'ogre', pk_slowbro: 'toad', pk_gengar: 'ogre',
    pk_snorlax: 'ogre', pk_lapras: 'bird', pk_alakazam: 'ogre', pk_dragonite: 'bird',
    pk_charizard: 'dragon', pk_gyarados: 'dragon', pk_mewtwo: 'ogre', pk_mew: 'quad',
    /* 2026-09-23 — "펫 100개"(2026-09-07) 로 늘어난 64종이 이 표에 없어 전부 `quad`(네발)로 그려졌다.
       물고기·말·공룡만 제 형태로(여덟 형태 그대로 — 진단 "짐승 여덟 형태"). 여우·양·지렁이 등은 네발 기본값 */
    pt_dolphin: 'fish', pt_shark: 'fish', pt_whale: 'fish', pt_manta_ray: 'fish', pt_fish_1: 'fish',
    pt_fish_2: 'fish', pt_fish_3: 'fish', pt_anglerfish: 'fish', pt_armored_catfish: 'fish', pt_betta: 'fish',
    pt_black_lion_fish: 'fish', pt_blobfish: 'fish', pt_blue_goldfish: 'fish', pt_blue_tang: 'fish',
    pt_butterfly_fish: 'fish', pt_cardinal_fish: 'fish', pt_clownfish: 'fish', pt_coral_grouper: 'fish',
    pt_cowfish: 'fish', pt_flatfish: 'fish', pt_flower_horn: 'fish', pt_goblin_shark: 'fish', pt_goldfish: 'fish',
    pt_humphead: 'fish', pt_koi_2: 'fish', pt_lionfish: 'fish', pt_mandarin_fish: 'fish', pt_moorish_idol: 'fish',
    pt_parrot_fish: 'fish', pt_piranha: 'fish', pt_puffer: 'fish', pt_red_snapper: 'fish', pt_royal_gramma: 'fish',
    pt_shark_2: 'fish', pt_sunfish: 'fish', pt_swordfish: 'fish', pt_tang: 'fish', pt_tetra: 'fish', pt_tuna: 'fish',
    pt_turbot: 'fish', pt_yellow_tang: 'fish', pt_zebra_clown_fish: 'fish',
    pt_horse: 'horse', pt_white_horse: 'horse', pt_horse_farm: 'horse', pt_zebra: 'horse', pt_donkey: 'horse',
    pt_t_rex: 'dragon', pt_triceratops: 'dragon', pt_stegosaurus: 'dragon', pt_velociraptor: 'dragon',
    pt_apatosaurus: 'dragon', pt_parasaurolophus: 'dragon'
  };

  var BEAST_COLOR = {
    pt_samjogo: '#3a3a48', pt_haetae: '#c98f3a', pt_cheongryong: '#3aa9c9',
    pt_baekho: '#e6e6ec', pt_jujak: '#d95a45', pt_hyeonmu: '#3f6a5a',
    pt_gumiho: '#d98a45', pt_dokkaebi: '#b2453f', pt_bulgasari: '#8a8a96',
    pt_jeoktoma: '#a04a3a', pt_jeolyeong: '#3a3a44',
    pt_jindo: '#d9b98a', pt_sapsal: '#b8a58c', pt_tiger: '#d99a3a', pt_bear: '#5a4436',
    pt_magpie: '#2f3340', pt_crane: '#eceff5', pt_toad: '#6a9a4a', pt_carp: '#d98a5a',
    pt_panda: '#e8e8ee', pt_monkey: '#a87c52', pt_deer: '#c39a6a', pt_boar: '#6b5544',
    pt_owl: '#8a7358', pt_cat: '#9a9aa6',
    pk_bulbasaur: '#1f7f99', pk_charmander: '#b0306e', pk_squirtle: '#b83a6e', pk_magikarp: '#2f2a78',
    pk_pikachu: '#ecebe6', pk_eevee: '#8ccf3a', pk_slowbro: '#a8285e', pk_gengar: '#3a1d52',
    pk_snorlax: '#2f9aa8', pk_lapras: '#2f2a78', pk_alakazam: '#43205e', pk_dragonite: '#e8b82a',
    pk_charizard: '#e0801f', pk_gyarados: '#3fa58a', pk_mewtwo: '#5e2a8c', pk_mew: '#e0901f'
  };

  /**
   * 짐승의 무늬 — 형태(form)가 같아도 이것으로 구분이 된다.
   * 적지 않으면 무늬 없는 민무늬가 된다.
   */
  var BEAST_PATTERN = {
    pt_tiger: 'stripe', pt_baekho: 'stripe', pt_panda: 'patch', pt_deer: 'spot',
    pt_boar: 'tusk', pt_gumiho: 'ninetail', pt_haetae: 'mane', pt_bulgasari: 'mane',
    pt_bear: 'crescent', pt_sapsal: 'shaggy', pt_monkey: 'bareface',
    pk_eevee: 'patch', pk_snorlax: 'patch', pk_mew: 'stripe', pk_mewtwo: 'mane'
  };

  function beastPatternOf(pet) { return (pet && BEAST_PATTERN[pet.id]) || ''; }
  function beastFormOf(pet) { return (pet && BEAST_FORM[pet.id]) || 'quad'; }
  function beastColorOf(pet) { return (pet && BEAST_COLOR[pet.id]) || '#9a8f7a'; }

  /**
   * @param o {x, y, s, facing, phase, walking, form, color, divine, t}
   */

  /* ── 스탬프 캐시 ──────────────────────────────────────────
   * 매 프레임 수십 개의 path 를 다시 그리는 대신, 걸음 위상을 8단계로
   * 크기를 0.08 단위로 묶어 오프스크린에 한 번 굽고 drawImage 로 붙인다.
   * 좌우 방향은 붙일 때 뒤집으므로 캐시를 두 배로 쓰지 않는다.
   * 흔들림(bounce)만 캐시 밖에서 y 오프셋으로 준다 — 위상에서 바로 나오는 값이라
   * 캐시에 넣으면 단계 수만 늘어난다.
   */

  var TAU = Math.PI * 2;
  var PHASES = 8;                 // 걸음을 몇 컷으로 나눌지
  var SB = 0.08;                  // 크기 버킷 폭
  var stampCache = {};
  var stampOrder = [];
  var STAMP_MAX = 420;
  var stat = { hit: 0, miss: 0 };

  function bucketScale(s) {
    return Math.max(SB, Math.round(s / SB) * SB);
  }
  function bucketPhase(phase, walking) {
    if (!walking) { return PHASES; }          // 정지 자세는 한 컷
    var t = ((phase % TAU) + TAU) % TAU;
    return Math.floor(t / (TAU / PHASES)) % PHASES;
  }

  /** 지도 위 사람 그림 — Kenney Roguelike Characters(CC0)에서 오려 낸 열넷 중
   *  인물 id 로 하나를 정해 고른다(같은 인물은 늘 같은 얼굴). 등신·양식·개인별
   *  색상·걷기 다리 애니메이션은 이 그림 하나로는 못 낸다(고정 그림이라) —
   *  그 대신 걸음 통통거림(stamp() 의 bounce)과 좌우 뒤집기는 그대로 산다.
   *  PLAN 부록("코드로 그리지 말고 에셋으로") 방침, 2026-09-02 사용자 승인 */
  var HUMAN_SPRITE_N = 14;
  var humanImgCache = {};
  function humanImg(i) {
    var n = ((i - 1) % HUMAN_SPRITE_N + HUMAN_SPRITE_N) % HUMAN_SPRITE_N + 1;
    var src = 'assets/sprites2d/human_' + (n < 10 ? '0' + n : n) + '.png';
    var im = humanImgCache[src];
    if (!im) { im = new Image(); im.src = src; humanImgCache[src] = im; }
    return im;
  }
  function humanIndexOf(ref) {
    var id = String((ref && (ref.id || ref.key || ref.name)) || 'anon');
    var h = 0;
    for (var i = 0; i < id.length; i++) { h = (h * 31 + id.charCodeAt(i)) >>> 0; }
    return (h % HUMAN_SPRITE_N) + 1;
  }

  /** 캐시에 한 컷을 굽는다 */
  /** 그림이 아직 안 실린 순간에만 잠깐 보이는 자리표시(머리 원 + 몸통 타원) —
   *  human() 절차적 그림을 대신한다(2026-09-22 Phase 4). 마을 지도의 사람 스탬프는
   *  Kenney 열넷이 늘 있어 이 자리는 로컬 PNG 를 기다리는 찰나뿐이다 — 실리면
   *  stamp() 재굽기가 곧바로 다시 굽는다. 'beast' 갈래는 이 판 지도가 부르는 곳이
   *  없어(주민·나·NPC 전부 'human') 사실상 안 타지만, 만약을 대비해 남겨 둔다. */
  function loadingMark(ctx, footX, footY, H, color) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = color || '#8a8578';
    ctx.beginPath();
    ctx.ellipse(footX, footY - H * 0.86, H * 0.17, H * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(footX, footY - H * 0.42, H * 0.22, H * 0.40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function bake(kind, ref, sc, pb, o) {
    var base = kind === 'human' ? 40 : 30;
    var H = base * sc;
    var w = Math.ceil(H * (kind === 'human' ? 1.9 : 2.3));
    var h = Math.ceil(H * (kind === 'human' ? 1.75 : 1.6));
    var footX = w / 2, footY = h * 0.94;
    var dpr = Math.min(global.devicePixelRatio || 1, 2);

    var cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(w * dpr));
    cv.height = Math.max(1, Math.ceil(h * dpr));
    var c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (kind === 'human') {
      var himg = humanImg(humanIndexOf(o.ref));
      if (himg.complete && himg.naturalWidth) {
        var hdw = H * 1.2, hdh = H * 1.2;
        c.imageSmoothingEnabled = false;
        c.drawImage(himg, footX - hdw / 2, footY - hdh, hdw, hdh);
      } else {
        loadingMark(c, footX, footY, H, o.color);
      }
    } else {
      loadingMark(c, footX, footY, H, o.color);
    }
    /* 여기서 한 번 훑는다 — 지도 위 스탬프는 어두운 배경에 서므로
       실루엣만 밝은 테를 둘러 형태가 묻히지 않게 한다 */
    storyize(cv, { rim: STORY_RIM_MAP, inner: H >= 40, thick: 1 });
    return { cv: cv, w: w, h: h, footX: footX, footY: footY, base: base, sc: sc };
  }

  /**
   * 캐시된 스프라이트를 (x, y)=발 위치에 붙인다.
   * @param o {kind, ref, x, y, s, facing, phase, walking, color, look, form, divine, skin, t}
   */
  function stamp(ctx, o) {
    var kind = o.kind === 'beast' ? 'beast' : 'human';
    var sc = bucketScale(o.s || 1);
    var pb = bucketPhase(o.phase || 0, !!o.walking);
    var id = (o.ref && (o.ref.id || o.ref.name)) || o.key || 'anon';
    var key = kind + '|' + id + '|' + sc.toFixed(2) + '|' + pb;

    var e = stampCache[key];
    if (e) { stat.hit++; }
    else {
      stat.miss++;
      e = bake(kind, o.ref, sc, pb, o);
      stampCache[key] = e;
      stampOrder.push(key);
      if (stampOrder.length > STAMP_MAX) {          // 오래된 것부터 버린다
        for (var i = 0; i < 60; i++) {
          var old = stampOrder.shift();
          if (old) { delete stampCache[old]; }
        }
      }
    }

    var H = e.base * e.sc;
    var bounce = o.walking
      ? (kind === 'human' ? Math.abs(Math.sin(o.phase)) * H * 0.035
                          : Math.abs(Math.sin(o.phase * 2)) * H * 0.05)
      : (kind === 'human' ? Math.sin((o.t || 0) / 640) * H * 0.008
                          : Math.sin((o.t || 0) / 700) * H * 0.02);

    ctx.save();
    ctx.translate(o.x, o.y - bounce);
    if ((o.facing || 1) < 0) { ctx.scale(-1, 1); }
    ctx.drawImage(e.cv, -e.footX, -e.footY, e.w, e.h);
    ctx.restore();
  }

  function stampStats() {
    return { hit: stat.hit, miss: stat.miss, size: stampOrder.length };
  }

  /* ── 그림책풍 후처리 ────────────────────────────────────
   * 다 그린 스프라이트를 픽셀에서 한 번 훑는다.
   *   1) 채도를 낮추고 살짝 밝힌 뒤 색을 계단으로 끊는다 → 플랫 채색
   *   2) 밝기 단차·실루엣 경계를 찾아 얇은 선을 얹는다   → 선화
   *
   * 도형 코드를 건드리지 않으므로 인물·짐승·장비·건물이 한꺼번에 같은 양식이 된다.
   * 비용은 **캐시 미스 때 한 번**만 든다 (스탬프·초상 모두 캐시된다).
   *
   * 선 색을 두 가지로 쓴다:
   *   line 안쪽 경계 — 짙은 갈색 (종이 위 펜선)
   *   rim  실루엣    — 지도 스탬프는 어두운 지도 위에 서므로 밝은 테를 두른다.
   *                    (짙은 갈색으로 두르면 배경에 묻혀 형태가 사라진다)
   */
  var STORY_LINE = [78, 60, 46];
  var STORY_RIM_MAP = [242, 232, 208];
  var STORY_STEP = 24;              // 색 계단 폭 — 크면 더 플랫해진다
  var STORY_EDGE = 22;              // 색이 이만큼 꺾이면 선을 긋는다 (채널 최대 차)

  /** 선 굵기 — 화면 배율만큼 굽는데, 선은 **화면에서** 1px 로 보여야 한다 */
  function storyThick() {
    return Math.max(1, Math.round(Math.min(global.devicePixelRatio || 1, 2)));
  }

  function storyize(cv, opts) {
    opts = opts || {};
    var W = cv.width, H = cv.height;
    if (!W || !H) { return; }
    var c = cv.getContext('2d');
    var img;
    try { img = c.getImageData(0, 0, W, H); } catch (e) { return; }   // 오염된 캔버스면 그냥 둔다
    var d = img.data, n = W * H, i, q;

    var alp = new Uint8Array(n);
    for (i = 0; i < n; i++) {
      q = i * 4;
      var a = d[q + 3];
      alp[i] = a;
      if (!a) { continue; }
      var r = d[q], g = d[q + 1], b = d[q + 2];
      var y = 0.299 * r + 0.587 * g + 0.114 * b;
      r = y + (r - y) * 0.74;                    // 채도 낮추기
      g = y + (g - y) * 0.74;
      b = y + (b - y) * 0.74;
      r = r * 0.90 + 22; g = g * 0.90 + 20; b = b * 0.90 + 15;   // 종이 톤으로 살짝 들어올리기
      r = Math.round(r / STORY_STEP) * STORY_STEP;               // 계단
      g = Math.round(g / STORY_STEP) * STORY_STEP;
      b = Math.round(b / STORY_STEP) * STORY_STEP;
      d[q] = r < 0 ? 0 : (r > 255 ? 255 : r);
      d[q + 1] = g < 0 ? 0 : (g > 255 ? 255 : g);
      d[q + 2] = b < 0 ? 0 : (b > 255 ? 255 : b);
    }

    /* 경계 찾기 — 1 안쪽 선 · 2 실루엣.
       밝기만 보면 초록 옷과 초록 갑옷처럼 명도가 비슷한 경계를 놓친다.
       그래서 채널별 차이의 최댓값(색 차이)으로 본다. */
    function diff(i1, i2) {
      var a1 = i1 * 4, a2 = i2 * 4;
      var dr = d[a1] - d[a2], dg = d[a1 + 1] - d[a2 + 1], db = d[a1 + 2] - d[a2 + 2];
      dr = dr < 0 ? -dr : dr; dg = dg < 0 ? -dg : dg; db = db < 0 ? -db : db;
      return dr > dg ? (dr > db ? dr : db) : (dg > db ? dg : db);
    }

    /* 작은 스프라이트(지도 위 대상)는 안쪽 선을 빼고 실루엣만 두른다 —
       20~30px 안에 선을 다 그으면 형태가 뭉개져 뼈만 남은 것처럼 보인다. */
    var inner = opts.inner !== false;
    var edge = new Uint8Array(n), x, y2;
    for (y2 = 0; y2 < H; y2++) {
      for (x = 0; x < W; x++) {
        i = y2 * W + x;
        if (alp[i] <= 120) { continue; }
        if ((x + 1 < W && alp[i + 1] < 60) || (x > 0 && alp[i - 1] < 60) ||
            (y2 + 1 < H && alp[i + W] < 60) || (y2 > 0 && alp[i - W] < 60)) {
          edge[i] = 2;
        } else if (inner &&
                   ((x + 1 < W && alp[i + 1] > 120 && diff(i, i + 1) > STORY_EDGE) ||
                    (y2 + 1 < H && alp[i + W] > 120 && diff(i, i + W) > STORY_EDGE))) {
          edge[i] = 1;
        }
      }
    }

    /* 화면 배율이 2 면 1 device px 선은 화면에서 반 픽셀이라 보이지 않는다 —
       그만큼 오른쪽·아래로 한 번 불려 준다 (원본 표시를 따로 둬서 번지지 않게) */
    var thick = opts.thick || storyThick();
    if (thick > 1) {
      var base = edge.slice();
      for (y2 = 0; y2 < H; y2++) {
        for (x = 0; x < W; x++) {
          i = y2 * W + x;
          if (!base[i]) { continue; }
          if (x + 1 < W && !edge[i + 1] && alp[i + 1] > 120) { edge[i + 1] = base[i]; }
          if (y2 + 1 < H && !edge[i + W] && alp[i + W] > 120) { edge[i + W] = base[i]; }
        }
      }
    }

    var line = opts.line || STORY_LINE;
    var rim = opts.rim || line;
    for (i = 0; i < n; i++) {
      if (!edge[i]) { continue; }
      q = i * 4;
      var col = edge[i] === 2 ? rim : line;
      d[q] = d[q] * 0.12 + col[0] * 0.88;
      d[q + 1] = d[q + 1] * 0.12 + col[1] * 0.88;
      d[q + 2] = d[q + 2] * 0.12 + col[2] * 0.88;
      if (d[q + 3] < 240) { d[q + 3] = 240; }
    }
    c.putImageData(img, 0, 0);
  }

  /* ── 초상 캐시 (HTML 목록용) ──────────────────────────── */

  var cache = {};

  /**
   * 오프스크린으로 한 번 그려 data URL 로 캐시한다.
   * 도감처럼 수십 개를 나열할 때 <img> 로 쓰면 가볍다.
   */
  function portrait(kind, ref, size) {
    size = size || 56;
    var key = kind + '/' + (ref ? (ref.id || ref.key || ref.name || 'x') : 'x') + '/' + size;
    if (cache[key]) { return cache[key]; }

    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var cv = document.createElement('canvas');
    cv.width = Math.floor(size * dpr);
    cv.height = Math.floor(size * dpr);
    var c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* 그림책풍은 종이 바탕을 깔고 그린다 — 갈색 선화를 어두운 UI 에 그대로 얹으면
       선이 배경에 묻혀 그림이 뭉개진다. 도감 카드처럼 보이는 효과도 같이 난다. */
    c.fillStyle = '#f2e7cf';
    c.fillRect(0, 0, size, size);

    if (kind === 'hero') {
      var f = global.DG.data.faction(ref.faction);
      var himg2 = humanImg(humanIndexOf(ref));
      if (himg2.complete && himg2.naturalWidth) {
        c.imageSmoothingEnabled = false;
        var hw2 = size * 0.78;
        c.drawImage(himg2, size * 0.5 - hw2 / 2, size * 0.94 - hw2, hw2, hw2);
      } else {
        loadingMark(c, size * 0.5, size * 0.94, size * 0.8, f.color);
      }
    } else if (kind === 'pet') {
      /* 이 판엔 펫 2D 대체 그림이 없다 — 디스크 초상(`assets/portraits/pet`, 105종
         전부 구워져 있다)이 거의 늘 먼저 잡히므로 여긴 3D 를 못 쓰는 드문 경우만 */
      loadingMark(c, size * 0.5, size * 0.9, size * 0.8, beastColorOf(ref));
    }
    storyize(cv);
    cache[key] = cv.toDataURL();
    return cache[key];
  }

  /* ── 상세 화면용 큰 초상 ─────────────────────────────── */

  var cardCache = {};

  /**
   * 인물·펫 하나를 액자에 담아 그린다 (상세 화면용).
   * 배경은 세력색 그라디언트 + 큼직한 문양, 테두리는 등급색.
   * 목록용 portrait() 과 달리 가로세로 비율이 있고 배경까지 그린다.
   */
  function portraitCard(kind, ref, w, h) {
    w = w || 168; h = h || 190;
    var key = 'card/' + kind + '/' + (ref ? (ref.id || ref.name) : 'x') + '/' + w + 'x' + h;
    if (cardCache[key]) { return cardCache[key]; }

    var D = global.DG.data;
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var cv = document.createElement('canvas');
    cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr);
    var c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    var isHero = kind === 'hero';
    var fac = isHero ? D.faction(ref.faction) : { color: ref.kind === 'divine' ? '#8a5cc0' : '#5f7a4a', mark: ref.kind === 'divine' ? '神' : '獸' };
    var rar = D.rarity[ref.rarity] || D.rarity[3];

    /* 그림책풍 — 종이 바탕에 옅은 배경(하늘·산·들·기와)을 깔고 인물을 세운다.
       배경 선은 **여기서 직접 긋는다**. 배경까지 storyize() 에 맡기면 세력 문양
       같은 큰 무늬의 윤곽까지 따라 그려서, 인물을 가로지르는 네모가 생긴다. */
    var ink = 'rgba(122,98,74,0.75)';
    c.fillStyle = '#eef0e2';                         // 하늘
    c.fillRect(0, 0, w, h);

    c.save();
    c.globalAlpha = 0.14;                            // 세력 문양 — 종이에 찍은 도장처럼
    c.fillStyle = '#6b533a';
    c.font = '700 ' + Math.round(h * 0.5) + 'px "Malgun Gothic", serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(fac.mark, w * 0.5, h * 0.5);
    c.restore();

    c.beginPath();                                   // 먼 산
    c.moveTo(-2, h * 0.62);
    c.quadraticCurveTo(w * 0.26, h * 0.36, w * 0.52, h * 0.60);
    c.quadraticCurveTo(w * 0.74, h * 0.42, w + 2, h * 0.58);
    c.lineTo(w + 2, h * 0.72); c.lineTo(-2, h * 0.72);
    c.closePath();
    c.fillStyle = '#cddcc4'; c.fill();
    c.strokeStyle = ink; c.lineWidth = 1; c.stroke();

    c.fillStyle = '#b9c9ae';                         // 가까운 들
    c.fillRect(0, h * 0.70, w, h * 0.30);
    c.beginPath();
    c.moveTo(0, h * 0.70); c.lineTo(w, h * 0.70);
    c.strokeStyle = ink; c.lineWidth = 1; c.stroke();

    /* 기와 처마 한 줄 — 배경이 '동아시아' 로 읽히게 하는 최소한의 장치.
       맨 위에 얇게 붙인다. 아래로 내리면 인물 얼굴을 가로질러 큰 삿갓처럼 보인다. */
    c.beginPath();
    c.moveTo(w * 0.02, h * 0.085);
    c.quadraticCurveTo(w * 0.5, h * 0.015, w * 0.98, h * 0.085);
    c.lineTo(w * 0.98, h * 0.125);
    c.quadraticCurveTo(w * 0.5, h * 0.055, w * 0.02, h * 0.125);
    c.closePath();
    c.fillStyle = '#9c8f79'; c.fill();
    c.strokeStyle = ink; c.lineWidth = 1; c.stroke();

    /* 인물 · 펫 — **딴 캔버스에 그려 그것만** 후처리한 뒤 얹는다.
       (배경까지 같이 훑으면 문양·산의 윤곽이 인물을 가로지른다) */
    var figCv = document.createElement('canvas');
    figCv.width = cv.width; figCv.height = cv.height;
    var fig = figCv.getContext('2d');
    fig.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (isHero) {
      var himg3 = humanImg(humanIndexOf(ref));
      if (himg3.complete && himg3.naturalWidth) {
        fig.imageSmoothingEnabled = false;
        var hw3 = h * 0.62;
        fig.drawImage(himg3, w * 0.5 - hw3 / 2, h * 0.93 - hw3, hw3, hw3);
      } else {
        loadingMark(fig, w * 0.5, h * 0.93, h * 0.6, fac.color);
      }
    } else {
      loadingMark(fig, w * 0.5, h * 0.80, h * 0.6, beastColorOf(ref));
    }
    storyize(figCv);
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);      // 이미 배율이 반영된 캔버스라 그대로 얹는다
    c.drawImage(figCv, 0, 0);
    c.restore();

    /* 등급 테두리 */
    c.strokeStyle = rar.color;
    c.lineWidth = 2;
    c.strokeRect(1, 1, w - 2, h - 2);
    c.strokeStyle = 'rgba(107,83,58,0.45)';
    c.lineWidth = 1;
    c.strokeRect(4.5, 4.5, w - 9, h - 9);

    cardCache[key] = cv.toDataURL();
    return cardCache[key];
  }

  global.DG = global.DG || {};
  global.DG.sprite = {
    portraitCard: portraitCard,
    stamp: stamp, stampStats: stampStats,
    lookOf: lookOf, beastFormOf: beastFormOf, beastColorOf: beastColorOf,
    beastPatternOf: beastPatternOf,
    portrait: portrait, shade: shade
  };
})(window);
