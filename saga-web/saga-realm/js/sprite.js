/**
 * 스프라이트 — 인물 초상 캐시 + `lookOf()`(3D 장비 배정용 외형 표)
 * ---------------------------------------------------------------
 * 이 판은 지도가 3D 뿐이라(`world3d`류 2D 스탬프가 없다) 절차적 human()/beast()
 * 는 2026-09-22 Phase 4 에서 통째로 지웠다 — 인물 105명 전부 디스크 초상이
 * 구워져 있어(`assets/portraits/hero`) 3D 를 못 쓰는 드문 경우(WebGL 없음 등)
 * 만 `loadingMark()` 자리표시로 대신한다. 펫 UI 는 이 판에 없어(`portrait()`
 * 의 'pet' 갈래는 실제로 안 탄다) 그림 걱정이 없다.
 *
 * `lookOf(hero)`(LOOKS·ruleLook) 는 그림 함수가 아니라 **데이터**다 —
 * `asset3d.js` 가 3D 인물 모델에 무기·투구를 얹을 때 이걸 읽으므로 남겨 뒀다.
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

  /* ── 초상 캐시 (HTML 목록용) ──────────────────────────── */

  /** 3D 초상(디스크·즉시 굽기)을 못 쓸 때만 보이는 자리표시(머리 원 + 몸통 타원) —
   *  절차적 human()/beast() 를 대신한다(2026-09-22 Phase 4). 이 판은 인물 105명
   *  전부 디스크 초상이 구워져 있어(`assets/portraits/hero`) 3D 가 정말 안 되는
   *  드문 경우(WebGL 없음 등)에만 보인다. 이 판은 펫 UI 가 없어 'pet' 갈래는
   *  실제로는 안 탄다. */
  function loadingMark(ctx, x, y, H, color) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = color || '#8a8578';
    ctx.beginPath();
    ctx.ellipse(x, y - H * 0.86, H * 0.17, H * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y - H * 0.42, H * 0.22, H * 0.40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

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

    if (kind === 'hero') {
      var f = global.DG.data.faction(ref.faction);
      loadingMark(c, size * 0.5, size * 0.94, size * 0.8, f.color);
    } else if (kind === 'pet') {
      loadingMark(c, size * 0.5, size * 0.9, size * 0.8, '#9a8f7a');
    }
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

    /* 배경 — 위는 세력색, 아래는 어둡게 */
    var bg = c.createLinearGradient(0, 0, w * 0.4, h);
    bg.addColorStop(0, shade(fac.color, -0.10));
    bg.addColorStop(0.55, shade(fac.color, -0.52));
    bg.addColorStop(1, '#14161c');
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);

    /* 문양 — 크게 깔아 두고 흐리게 */
    c.save();
    c.globalAlpha = 0.16;
    c.fillStyle = '#ffffff';
    c.font = '700 ' + Math.round(h * 0.62) + 'px "Malgun Gothic", serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(fac.mark, w * 0.5, h * 0.46);
    c.restore();

    /* 바닥 빛 */
    var floor = c.createRadialGradient(w * 0.5, h * 0.88, 2, w * 0.5, h * 0.88, w * 0.5);
    floor.addColorStop(0, 'rgba(255,255,255,0.20)');
    floor.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = floor;
    c.fillRect(0, h * 0.62, w, h * 0.38);

    /* 인물 · 펫 */
    if (isHero) {
      loadingMark(c, w * 0.5, h * 0.93, h * 0.7, fac.color);
    } else {
      loadingMark(c, w * 0.5, h * 0.80, h * 0.7, '#9a8f7a');
    }

    /* 등급 테두리 */
    c.strokeStyle = rar.color;
    c.lineWidth = 2;
    c.strokeRect(1, 1, w - 2, h - 2);
    c.strokeStyle = 'rgba(255,255,255,0.18)';
    c.lineWidth = 1;
    c.strokeRect(4.5, 4.5, w - 9, h - 9);

    cardCache[key] = cv.toDataURL();
    return cardCache[key];
  }

  global.DG = global.DG || {};
  global.DG.sprite = {
    portraitCard: portraitCard,
    lookOf: lookOf,
    portrait: portrait, shade: shade
  };
})(window);
