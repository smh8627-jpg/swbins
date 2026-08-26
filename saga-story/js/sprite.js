/**
 * 스프라이트 — 코드로 그리는 캐릭터 / 몬스터 / 건물
 * ---------------------------------------------------------------
 * 이미지 파일 없이 캔버스 도형으로 형상을 만든다. 벡터라서 2.5D 원근에 맞춰
 * 확대·축소해도 깨지지 않고, 관절 각도로 걷는 동작을 만들 수 있다.
 *
 *   human(ctx, o)     사람 — 머리·몸통·팔·다리·투구·무기. 걸음 위상으로 팔다리가 흔들린다
 *   beast(ctx, o)     짐승 — 네발 / 조류 / 용 / 거북 / 물고기 / 두꺼비
 *   building(ctx, o)  건물 — 한옥 기와 실루엣. 본편에서 부르는 곳은 없다(경영을 뺐다).
 *                     확장(js/_expansion)이 배경·장식으로 다시 쓸 수 있게 남겨 둔다
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

  /* ── 등신 비례 ────────────────────────────────────────────
   * 사람 스프라이트의 비례 프리셋. 값은 키(H)에 대한 비율이다.
   *   headR 머리 반지름 · headY 머리 중심 · shoY 어깨 · hipY 골반
   *   leg 다리 길이 · arm 팔 길이 · thick 팔다리 굵기 배율
   * 모드를 바꾸면 스탬프·초상 캐시를 전부 버려야 한다 (setProp 참조).
   */
  var PROPS = {
    chibi:  { headR: 0.240, headY: 0.735, shoY: 0.500, hipY: 0.300, leg: 0.270, arm: 0.230, thick: 1.45 },
    normal: { headR: 0.118, headY: 0.885, shoY: 0.760, hipY: 0.420, leg: 0.420, arm: 0.340, thick: 1.00 },
    tall:   { headR: 0.066, headY: 0.930, shoY: 0.825, hipY: 0.465, leg: 0.465, arm: 0.385, thick: 0.85 }
  };
  var propMode = 'normal';

  /* ── 그림 양식 ────────────────────────────────────────────
   * 'classic' 전통 삽화풍 — 사실적 비례, 부드러운 그라디언트 명암
   * 'anime'   일본 만화풍 — 큰 눈·뾰족한 머리·2톤 셀 셰이딩·검은 윤곽선
   * 'story'   그림책(도감)풍 — 얇은 갈색 선화 + 낮은 채도의 플랫 채색
   *
   * classic·anime 는 도형을 다르게 그려서 만든다(얼굴·머리·명암만 갈아끼우고
   * 골격은 공유한다). story 는 **다 그린 다음 픽셀에서 한 번 훑어** 만든다 —
   * 선화·플랫 채색은 도형마다 손보는 게 아니라 화면 전체에 걸리는 성질이라
   * 그쪽이 인물 48·짐승 25·장비까지 한 번에 맞추는 유일한 길이다 (storyize 참조).
   */
  var styleMode = 'maple';
  var STYLES = ['classic', 'story', 'anime', 'maple'];

  /** 등신 모드 변경 — 캐시를 전부 비워 다음 프레임부터 새 비례로 굽는다 */
  function setProp(mode) {
    if (!PROPS[mode] || mode === propMode) { return propMode; }
    propMode = mode;
    clearCaches();
    return propMode;
  }

  /** 그림 양식 변경 — 마찬가지로 캐시를 비운다 */
  function setStyle(mode) {
    if (STYLES.indexOf(mode) < 0 || mode === styleMode) { return styleMode; }
    styleMode = mode;
    clearCaches();
    return styleMode;
  }

  function clearCaches() {
    stampCache = {}; stampOrder = [];
    cache = {}; cardCache = {};
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

    /* 유럽사 — 규칙(ruleLook)에 맡기면 갓·도포가 붙으므로 전원 지정한다.
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
    eu_eleanor:       { weapon: 'none', helm: 'crown', armor: 'dress', skirt: true }
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
  function human(ctx, o) {
    var H = 40 * (o.s || 1);
    var look = o.look || {};
    var col = o.color || '#5b6572';
    var mid = shade(col, 0.12), dark = shade(col, -0.42), lite = shade(col, 0.3), deep = shade(col, -0.60);
    var skin = o.skin || '#e8c9a4';
    var skinDark = shade(skin, -0.20);
    var metal = '#b9c2cf', metalDark = '#7d879a', metalLite = '#e2e8f0';
    var cloth = '#f4efe4';                     // 동정 · 버선 같은 흰 천
    var hair = '#241e1c';
    var ph = o.phase || 0;
    var walking = !!o.walking;
    /* 너무 작게 그릴 때 잔 디테일은 생략한다 — 넣으면 오히려 지저분해진다 */
    var fine = H >= 22;
    var superFine = H >= 34;
    var swing = walking ? Math.sin(ph) * 0.42 : 0;          // 라디안
    var swingB = walking ? Math.sin(ph + Math.PI) * 0.42 : 0;
    /* 정지 자세에서 다리를 살짝 벌린다 — 겹치면 다리가 한 개로 보인다 */
    var stance = walking ? 0 : 0.15;
    var P = PROPS[propMode] || PROPS.normal;      // 등신 비례 (2등신/기본/8등신)
    var legLen = H * P.leg;
    var armLen = H * P.arm;
    var bounce = o.noBounce ? 0
      : (walking ? Math.abs(Math.sin(ph)) * H * 0.035
                 : Math.sin((o.t || 0) / 640) * H * 0.008);

    var hipY = -H * P.hipY, shoY = -H * P.shoY, headR = H * P.headR, headY = -H * P.headY;
    var lw = H * 0.085 * P.thick;
    var anime = styleMode === 'anime';            // 그림 양식 (얼굴·머리·명암만 다르다)
    var seed = anime ? animeSeed(o) : 0;
    /* 만화풍은 머리를 키운다 — 애니메 그림의 인상은 큰 머리·큰 눈에서 나온다.
       2등신은 이미 머리가 크므로 덜 키운다(넘치면 목이 사라진다). */
    if (anime) {
      headR *= propMode === 'chibi' ? 1.10 : 1.42;
      /* 턱이 어깨를 파고들면 목이 사라지고 어깨 갑옷이 턱에 달라붙는다.
         달걀형 턱 끝(headY + headR*1.16)이 어깨보다 조금 위에 오도록 머리를 올린다.
         등신마다 머리·어깨 위치가 달라서 고정 배수 대신 어깨에서 거꾸로 잡는다. */
      headY = shoY - H * 0.025 - headR * 1.16;
    }
    var robe = look.armor === 'robe' || look.armor === 'coat';

    ctx.save();
    ctx.translate(o.x, o.y - bounce);

    /* 발밑 그림자 — 빌보드라도 이게 있으면 땅을 딛고 선 느낌이 난다 */
    ctx.beginPath();
    ctx.ellipse(0, bounce * 0.5, H * 0.19, H * 0.055, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fill();

    if ((o.facing || 1) < 0) { ctx.scale(-1, 1); }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    /* ── 망토 (뒤) ── */
    if (look.cape) {
      var flap = walking ? Math.sin(ph) * H * 0.05 : Math.sin((o.t || 0) / 700) * H * 0.012;
      ctx.beginPath();
      ctx.moveTo(-H * 0.10, shoY);
      ctx.quadraticCurveTo(-H * 0.36 - flap, -H * 0.34, -H * 0.22 - flap, -H * 0.02);
      ctx.lineTo(H * 0.06, -H * 0.04);
      ctx.quadraticCurveTo(H * 0.10, -H * 0.44, H * 0.06, shoY);
      ctx.closePath();
      var cg = ctx.createLinearGradient(-H * 0.3, shoY, H * 0.1, 0);
      cg.addColorStop(0, deep); cg.addColorStop(1, dark);
      ctx.fillStyle = cg; ctx.fill();
      if (fine) {                                  // 주름 두 줄
        ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = H * 0.012;
        ctx.beginPath();
        ctx.moveTo(-H * 0.16 - flap * 0.6, shoY + H * 0.06);
        ctx.quadraticCurveTo(-H * 0.20, -H * 0.30, -H * 0.13, -H * 0.04);
        ctx.moveTo(-H * 0.04, shoY + H * 0.08);
        ctx.quadraticCurveTo(-H * 0.06, -H * 0.30, -H * 0.02, -H * 0.04);
        ctx.stroke();
      }
    }

    /* ── 뒤쪽 다리 · 팔 ── */
    if (!look.skirt) {
      var bLeg = swingB - stance;
      limb(ctx, 0, hipY, bLeg, legLen, lw * 1.15, deep);
      foot(ctx, Math.sin(bLeg) * legLen, hipY + Math.cos(bLeg) * legLen, H, '#23232a', cloth, fine);
    }
    var armB = swingB * 0.8 + 0.12;
    limb(ctx, -H * 0.02, shoY, armB, armLen, lw * 0.9, robe ? shade(mid, -0.32) : deep);
    if (fine) {
      hand(ctx, -H * 0.02 + Math.sin(armB) * armLen, shoY + Math.cos(armB) * armLen, H * 0.045, skinDark);
    }

    /* ── 몸통 ── */
    if (look.skirt) {
      /* 치마 — 어깨에서 발까지 넓어진다 */
      var sk = ctx.createLinearGradient(-H * 0.26, shoY, H * 0.26, 0);
      sk.addColorStop(0, shade(mid, -0.18)); sk.addColorStop(0.55, mid); sk.addColorStop(1, shade(mid, -0.10));
      ctx.beginPath();
      ctx.moveTo(-H * 0.13, shoY);
      ctx.lineTo(H * 0.13, shoY);
      ctx.quadraticCurveTo(H * 0.22, -H * 0.20, H * 0.27, -H * 0.02);
      ctx.lineTo(-H * 0.27, -H * 0.02);
      ctx.quadraticCurveTo(-H * 0.22, -H * 0.20, -H * 0.13, shoY);
      ctx.closePath();
      ctx.fillStyle = sk; ctx.fill();
      if (fine) {                                  // 치마 주름
        ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = H * 0.011;
        for (var sp = -1; sp <= 1; sp++) {
          ctx.beginPath();
          ctx.moveTo(sp * H * 0.09, -H * 0.42);
          ctx.lineTo(sp * H * 0.15, -H * 0.03);
          ctx.stroke();
        }
      }
      /* 저고리 */
      ctx.beginPath();
      ctx.moveTo(-H * 0.16, shoY - H * 0.02);
      ctx.lineTo(H * 0.16, shoY - H * 0.02);
      ctx.quadraticCurveTo(H * 0.15, -H * 0.36, H * 0.13, -H * 0.30);
      ctx.lineTo(-H * 0.13, -H * 0.30);
      ctx.quadraticCurveTo(-H * 0.15, -H * 0.36, -H * 0.16, shoY - H * 0.02);
      ctx.closePath();
      ctx.fillStyle = lite; ctx.fill();
      if (fine) {
        /* 동정(흰 깃) + 고름 */
        ctx.strokeStyle = cloth; ctx.lineWidth = H * 0.022;
        ctx.beginPath();
        ctx.moveTo(-H * 0.07, shoY - H * 0.01);
        ctx.lineTo(H * 0.02, shoY + H * 0.10);
        ctx.lineTo(H * 0.09, shoY - H * 0.01);
        ctx.stroke();
        ctx.strokeStyle = '#c94f6d'; ctx.lineWidth = H * 0.016;
        ctx.beginPath();
        ctx.moveTo(H * 0.03, shoY + H * 0.12);
        ctx.quadraticCurveTo(H * 0.10, shoY + H * 0.18, H * 0.06, -H * 0.40);
        ctx.stroke();
      }
      /* 버선 */
      ctx.beginPath();
      ctx.ellipse(-H * 0.06, -H * 0.01, H * 0.05, H * 0.026, 0, 0, Math.PI * 2);
      ctx.ellipse(H * 0.06, -H * 0.01, H * 0.05, H * 0.026, 0, 0, Math.PI * 2);
      ctx.fillStyle = cloth; ctx.fill();
    } else {
      /* 상체 — 전통풍은 그라디언트, 만화풍은 2톤 셀 셰이딩 */
      var tg;
      if (anime) {
        tg = ctx.createLinearGradient(-H * 0.15, 0, H * 0.15, 0);
        var edge = shade(mid, -0.26), face = shade(mid, 0.10);
        tg.addColorStop(0, edge); tg.addColorStop(0.34, edge);
        tg.addColorStop(0.341, face); tg.addColorStop(1, face);
      } else {
        tg = ctx.createLinearGradient(-H * 0.15, shoY, H * 0.15, hipY);
        tg.addColorStop(0, shade(mid, -0.22)); tg.addColorStop(0.45, mid); tg.addColorStop(1, shade(mid, 0.06));
      }
      ctx.beginPath();
      if (robe) {                                  // 도포 — 아래로 퍼진다
        ctx.moveTo(-H * 0.15, shoY);
        ctx.lineTo(H * 0.15, shoY);
        ctx.lineTo(H * 0.19, hipY + H * 0.02);
        ctx.lineTo(-H * 0.19, hipY + H * 0.02);
      } else {
        ctx.moveTo(-H * 0.145, shoY);
        ctx.lineTo(H * 0.145, shoY);
        ctx.lineTo(H * 0.115, hipY + H * 0.02);
        ctx.lineTo(-H * 0.115, hipY + H * 0.02);
      }
      ctx.closePath();
      ctx.fillStyle = tg; ctx.fill();

      if (look.armor === 'plate') {
        /* 찰갑 — 작은 비늘을 세 줄 */
        if (fine) {
          ctx.fillStyle = metalDark;
          for (var sr = 0; sr < 3; sr++) {
            for (var sc2 = -2; sc2 <= 2; sc2++) {
              ctx.beginPath();
              ctx.ellipse(sc2 * H * 0.055 + (sr % 2 ? H * 0.027 : 0),
                shoY + H * (0.11 + sr * 0.075), H * 0.026, H * 0.019, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else {
          ctx.fillStyle = metalDark;
          ctx.fillRect(-H * 0.13, shoY + H * 0.10, H * 0.26, H * 0.045);
          ctx.fillRect(-H * 0.12, shoY + H * 0.19, H * 0.24, H * 0.045);
        }
        /* 흉갑 — 가슴 판 */
        ctx.beginPath();
        ctx.moveTo(-H * 0.10, shoY + H * 0.02);
        ctx.quadraticCurveTo(0, shoY + H * 0.11, H * 0.10, shoY + H * 0.02);
        ctx.lineTo(H * 0.08, shoY - H * 0.01);
        ctx.lineTo(-H * 0.08, shoY - H * 0.01);
        ctx.closePath();
        ctx.fillStyle = metal; ctx.fill();
        /* 어깨 보호대 (리벳까지) */
        var shp = [H * 0.155, -H * 0.155];
        for (var si = 0; si < 2; si++) {
          ctx.beginPath();
          ctx.ellipse(shp[si], shoY + H * 0.055, H * 0.072, H * 0.046, 0, 0, Math.PI * 2);
          /* 세력색을 섞는다 — 전부 금속색이면 48명이 다 같은 어깨가 된다 */
          var sg2 = ctx.createLinearGradient(shp[si], shoY + H * 0.005, shp[si], shoY + H * 0.10);
          sg2.addColorStop(0, shade(col, 0.34)); sg2.addColorStop(1, shade(col, -0.34));
          ctx.fillStyle = sg2; ctx.fill();
          ctx.strokeStyle = metalDark; ctx.lineWidth = H * 0.013; ctx.stroke();
          if (superFine) {
            ctx.beginPath();
            ctx.arc(shp[si], shoY + H * 0.055, H * 0.013, 0, Math.PI * 2);
            ctx.fillStyle = '#5d6577'; ctx.fill();
          }
        }
        /* 허리띠 + 술 */
        ctx.fillStyle = '#3a2f28';
        ctx.fillRect(-H * 0.12, hipY - H * 0.08, H * 0.24, H * 0.055);
        ctx.fillStyle = '#c9a24a';
        ctx.fillRect(-H * 0.03, hipY - H * 0.085, H * 0.06, H * 0.065);
        if (fine) {
          ctx.strokeStyle = '#c04b45'; ctx.lineWidth = H * 0.014;
          ctx.beginPath();
          ctx.moveTo(H * 0.07, hipY - H * 0.03);
          ctx.lineTo(H * 0.09, hipY + H * 0.09);
          ctx.stroke();
        }
      } else if (robe) {
        /* 넓은 소매 (도포) */
        ctx.beginPath();
        ctx.moveTo(H * 0.13, shoY + H * 0.02);
        ctx.quadraticCurveTo(H * 0.26, shoY + H * 0.12, H * 0.20, shoY + H * 0.26);
        ctx.lineTo(H * 0.10, shoY + H * 0.20);
        ctx.closePath();
        ctx.fillStyle = shade(mid, -0.10); ctx.fill();
        /* 옷깃 — 흰 동정을 겹쳐 X 자로 */
        ctx.beginPath();
        ctx.moveTo(0, shoY);
        ctx.lineTo(H * 0.075, shoY + H * 0.15);
        ctx.lineTo(0, hipY + H * 0.02);
        ctx.lineTo(-H * 0.075, shoY + H * 0.15);
        ctx.closePath();
        ctx.fillStyle = lite; ctx.fill();
        if (fine) {
          ctx.strokeStyle = cloth; ctx.lineWidth = H * 0.02;
          ctx.beginPath();
          ctx.moveTo(-H * 0.075, shoY);
          ctx.lineTo(H * 0.015, shoY + H * 0.13);
          ctx.lineTo(H * 0.085, shoY - H * 0.005);
          ctx.stroke();
        }
        /* 허리띠 + 늘어진 끈 */
        ctx.fillStyle = dark;
        ctx.fillRect(-H * 0.15, hipY - H * 0.07, H * 0.30, H * 0.05);
        if (fine) {
          ctx.strokeStyle = dark; ctx.lineWidth = H * 0.014;
          ctx.beginPath();
          ctx.moveTo(H * 0.05, hipY - H * 0.02);
          ctx.quadraticCurveTo(H * 0.09, hipY + H * 0.06, H * 0.05, hipY + H * 0.14);
          ctx.stroke();
        }
      } else {
        /* 가죽 — 조끼와 어깨 끈 */
        ctx.fillStyle = shade('#7a5334', -0.1);
        ctx.beginPath();
        ctx.moveTo(-H * 0.14, shoY + H * 0.02);
        ctx.lineTo(-H * 0.06, shoY + H * 0.02);
        ctx.lineTo(-H * 0.08, hipY);
        ctx.lineTo(-H * 0.14, hipY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(90,60,38,0.85)'; ctx.lineWidth = H * 0.014;
        ctx.beginPath();
        ctx.moveTo(-H * 0.12, shoY + H * 0.04);
        ctx.lineTo(H * 0.10, shoY + H * 0.20);
        ctx.stroke();
        ctx.fillStyle = '#3a2f28';
        ctx.fillRect(-H * 0.12, hipY - H * 0.06, H * 0.24, H * 0.05);
      }
    }

    /* ── 앞쪽 다리 ── */
    if (!look.skirt) {
      var fLeg = swing + stance;
      limb(ctx, 0, hipY, fLeg, legLen, lw * 1.15, col, 'rgba(0,0,0,0.34)');
      foot(ctx, Math.sin(fLeg) * legLen, hipY + Math.cos(fLeg) * legLen, H, '#2b2b33', cloth, fine);
    }

    /* ── 앞쪽 팔 + 손 + 무기 ── */
    var armA = swing * 0.85 - 0.15;
    var hx = H * 0.02 + Math.sin(armA) * armLen;
    var hy = shoY + Math.cos(armA) * armLen;
    limb(ctx, H * 0.02, shoY, armA, H * 0.34, lw * 0.9,
      look.armor === 'plate' ? metalDark : (robe ? lite : shade(col, 0.16)), 'rgba(0,0,0,0.34)');
    weapon(ctx, look.weapon, hx, hy, H, metal, metalDark, col, dark);
    if (fine) { hand(ctx, hx, hy, H * 0.05, skin); }

    /* ── 목 · 머리 ──
     * 만화풍은 머리가 커서 목이 그만큼 길게 드러난다 — 얇으면 부러진 것처럼 보인다. */
    ctx.beginPath();
    ctx.moveTo(0, shoY);
    ctx.lineTo(0, headY + headR * 0.6);
    ctx.strokeStyle = skinDark;
    ctx.lineWidth = H * (anime ? 0.082 : 0.055);
    ctx.stroke();

    /* 머리 — 만화풍은 턱이 좁은 달걀형, 전통풍은 원형 */
    ctx.beginPath();
    if (anime) {
      ctx.moveTo(-headR * 0.94, headY - headR * 0.16);
      ctx.quadraticCurveTo(-headR * 0.92, headY - headR * 1.06, 0, headY - headR * 1.04);
      ctx.quadraticCurveTo(headR * 0.96, headY - headR * 1.02, headR * 0.98, headY - headR * 0.12);
      ctx.quadraticCurveTo(headR * 0.96, headY + headR * 0.72, headR * 0.30, headY + headR * 1.04);
      ctx.quadraticCurveTo(0, headY + headR * 1.16, -headR * 0.44, headY + headR * 0.86);
      ctx.quadraticCurveTo(-headR * 0.92, headY + headR * 0.52, -headR * 0.94, headY - headR * 0.16);
      ctx.closePath();
    } else {
      ctx.arc(0, headY, headR, 0, Math.PI * 2);
    }
    if (anime) {
      /* 셀 셰이딩 — 두 톤으로 딱 끊는다 */
      ctx.fillStyle = shade(skin, 0.16);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.beginPath();
      ctx.moveTo(-headR * 1.1, headY + headR * 1.2);
      ctx.lineTo(-headR * 1.1, headY - headR * 0.30);
      ctx.quadraticCurveTo(-headR * 0.2, headY + headR * 0.10, headR * 1.1, headY - headR * 0.55);
      ctx.lineTo(headR * 1.1, headY + headR * 1.2);
      ctx.closePath();
      ctx.fillStyle = shade(skin, -0.14);
      ctx.fill();
      ctx.restore();
      if (fine) {                                  // 윤곽선
        ctx.strokeStyle = 'rgba(60,40,38,0.55)';
        ctx.lineWidth = Math.max(0.5, headR * 0.07);
        ctx.stroke();
      }
    } else {
      var hg = ctx.createRadialGradient(headR * 0.35, headY - headR * 0.3, headR * 0.2,
                                        0, headY, headR * 1.25);
      hg.addColorStop(0, shade(skin, 0.22)); hg.addColorStop(1, shade(skin, -0.06));
      ctx.fillStyle = hg; ctx.fill();
    }

    /* 머리카락 — 투구를 쓰면 감춰진다 */
    var bare = !look.helm || look.helm === 'none' || look.helm === 'hairpin' ||
               look.helm === 'braid' || look.helm === 'topknot';
    if (anime && !bare && look.helm !== 'monk') {
      /* 투구·관모를 써도 만화풍은 앞머리가 삐져나온다 — 없으면 대머리처럼 보인다.
         단 승려(monk)는 민머리가 본인 특징이라 앞머리를 붙이면 안 된다 */
      animeFringe(ctx, headY, headR, seed, hair);
    }
    if (bare) {
      if (anime) {
        var female = !!(look.skirt || look.helm === 'hairpin' || look.helm === 'braid');
        animeHair(ctx, headY, headR, seed, fine, hair, female);
      } else {
        ctx.beginPath();
        ctx.arc(0, headY - headR * 0.10, headR * 1.0, Math.PI * 1.08, Math.PI * 1.98);
        ctx.lineTo(-headR * 0.70, headY + headR * 0.22);
        ctx.quadraticCurveTo(-headR * 1.02, headY - headR * 0.30, -headR * 0.92, headY - headR * 0.55);
        ctx.closePath();
        ctx.fillStyle = hair; ctx.fill();
        if (fine) {                                 // 상투 — 뒤통수 위로 묶은 머리
          ctx.beginPath();
          ctx.arc(-headR * 0.10, headY - headR * 1.06, headR * 0.26, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    /* 얼굴 */
    if (anime) {
      animeFace(ctx, headY, headR, look, seed, fine, superFine, hair);
    } else if (story() && fine) {
      storyFace(ctx, headY, headR, look);
    } else if (fine) {
      var browTilt = look.brow === 'sharp' ? -0.5 : (look.brow === 'soft' ? 0.22 : -0.1);
      ctx.fillStyle = 'rgba(252,252,252,0.92)';
      ctx.beginPath();
      ctx.ellipse(headR * 0.46, headY - headR * 0.08, headR * 0.20, headR * 0.15, 0, 0, Math.PI * 2);
      ctx.ellipse(headR * 0.02, headY - headR * 0.08, headR * 0.16, headR * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#241f1e';
      ctx.beginPath();
      ctx.arc(headR * 0.50, headY - headR * 0.07, Math.max(0.5, headR * 0.10), 0, Math.PI * 2);
      ctx.arc(headR * 0.06, headY - headR * 0.07, Math.max(0.5, headR * 0.09), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hair; ctx.lineWidth = Math.max(0.6, headR * 0.10);
      ctx.beginPath();
      ctx.moveTo(headR * 0.28, headY - headR * 0.34 + browTilt * headR * 0.2);
      ctx.lineTo(headR * 0.66, headY - headR * 0.30 - browTilt * headR * 0.2);
      ctx.moveTo(-headR * 0.16, headY - headR * 0.32 + browTilt * headR * 0.2);
      ctx.lineTo(headR * 0.16, headY - headR * 0.34 - browTilt * headR * 0.1);
      ctx.stroke();
      if (superFine) {
        ctx.strokeStyle = 'rgba(120,80,60,0.55)'; ctx.lineWidth = headR * 0.07;
        ctx.beginPath();
        ctx.moveTo(headR * 0.62, headY - headR * 0.02);
        ctx.lineTo(headR * 0.68, headY + headR * 0.16);
        ctx.stroke();
      }
      if (!look.beard) {
        ctx.strokeStyle = 'rgba(120,60,55,0.7)'; ctx.lineWidth = headR * 0.09;
        ctx.beginPath();
        ctx.moveTo(headR * 0.24, headY + headR * 0.42);
        ctx.lineTo(headR * 0.54, headY + headR * 0.40);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = 'rgba(30,25,25,0.75)';
      ctx.beginPath();
      ctx.arc(headR * 0.42, headY - headR * 0.12, Math.max(0.6, headR * 0.13), 0, Math.PI * 2);
      ctx.fill();
    }

    if (look.eyepatch || look.glasses) {
      /* 만화풍은 눈을 옮겨 그렸으니 안대·안경도 같이 옮겨야 눈에 맞는다 */
      ctx.save();
      if (anime) { ctx.translate(-headR * ANIME_FACE_DX, 0); }
    }
    if (look.eyepatch) {
      ctx.fillStyle = '#1b1b22';
      ctx.beginPath();
      ctx.ellipse(headR * 0.06, headY - headR * 0.10, headR * 0.26, headR * 0.22, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2b2b33'; ctx.lineWidth = H * 0.026;
      ctx.beginPath();
      ctx.moveTo(-headR, headY - headR * 0.25);
      ctx.lineTo(headR * 0.9, headY - headR * 0.05);
      ctx.stroke();
    }
    if (look.glasses) {
      ctx.strokeStyle = 'rgba(245,245,245,0.9)'; ctx.lineWidth = H * 0.016;
      ctx.beginPath();
      ctx.arc(headR * 0.50, headY - headR * 0.08, headR * 0.30, 0, Math.PI * 2);
      ctx.arc(headR * 0.02, headY - headR * 0.08, headR * 0.26, 0, Math.PI * 2);
      ctx.moveTo(headR * 0.28, headY - headR * 0.10);
      ctx.lineTo(headR * 0.20, headY - headR * 0.10);
      ctx.stroke();
    }
    if (look.eyepatch || look.glasses) { ctx.restore(); }
    if (look.beard) {
      /* 수염 — 전통풍은 길게 흐르고, 만화풍은 턱 끝에 짧게 붙는다(길면 얼굴을 먹는다) */
      var bl = anime ? 0.52 : 1.0;                 // 길이 배율
      ctx.beginPath();
      ctx.moveTo(-headR * 0.40, headY + headR * 0.80);
      ctx.quadraticCurveTo(-headR * 0.18, headY + headR * (0.80 + 0.86 * bl),
                           0, headY + headR * (0.80 + 1.08 * bl));
      ctx.quadraticCurveTo(headR * 0.28, headY + headR * (0.76 + 0.80 * bl),
                           headR * 0.46, headY + headR * 0.76);
      ctx.quadraticCurveTo(0, headY + headR * (0.80 + 0.32 * bl), -headR * 0.40, headY + headR * 0.80);
      /* 만화풍 수염은 밝은 갈색 — 머리색(거의 검정)을 쓰면 턱에 검은 덩어리가 생긴다 */
      ctx.fillStyle = anime ? 'rgba(120,92,68,0.95)'
        : (story() ? 'rgba(96,76,56,0.95)' : 'rgba(74,62,52,0.92)');
      ctx.fill();
      if (superFine) {                              // 콧수염 — 입 위에만 아주 얇게
        ctx.beginPath();
        ctx.moveTo(headR * 0.22, headY + headR * 0.34);
        ctx.quadraticCurveTo(headR * 0.44, headY + headR * 0.30, headR * 0.58, headY + headR * 0.42);
        ctx.strokeStyle = 'rgba(74,62,52,0.9)'; ctx.lineWidth = headR * 0.09;
        ctx.stroke();
      }
    }

    /* ── 투구 · 모자 ──
     * 만화풍은 머리가 커진 만큼 조금 더 크게 얹고 위로 올려 쓴다 —
     * 눈이 커져서 원래 위치로 씌우면 투구가 눈을 덮는다.
     * 단 **올려도 되는 건 머리를 감싸는 것들뿐**이다. 정수리에 얹는 관모·갓·면류관을
     * 같이 올리면 머리에서 떨어져 공중에 뜬다(관모 쓴 인물 전원이 그랬다). */
    headgear(ctx, look.helm, headY - (anime ? headR * HELM_LIFT(look.helm) : 0),
      headR * (anime ? 1.04 : 1), H, col, mid, dark, metal, metalDark, anime, skin);

    /* ★5 인물은 윤곽에 옅은 금빛이 돈다.
       만화풍은 머리가 커지고 모자가 위로 올라가 이 아치가 이마·모자를 가로지르는
       금색 링처럼 보인다 — 그래서 만화풍에서는 어깨 쪽 금빛만 남긴다. */
    if (o.rarity >= 5 && fine) {
      ctx.strokeStyle = 'rgba(240,190,90,0.5)';
      ctx.lineWidth = H * 0.014;
      if (!anime) {
        ctx.beginPath();
        ctx.arc(0, headY, headR * 1.04, Math.PI * 1.15, Math.PI * 1.95);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-H * 0.145, shoY + H * 0.01);
      ctx.lineTo(-H * 0.115, hipY + H * 0.02);
      ctx.stroke();
    }

    ctx.restore();
  }

  /* ── 만화풍(anime) 얼굴 · 머리카락 ────────────────────────
   * 애니메 그림이 사실화와 다른 지점은 다섯 가지뿐이다. 그것만 흉낸다.
   *   1 눈이 크고 위쪽에 몰려 있다 (흰자 + 큰 홍채 + 하이라이트 + 굵은 위 속눈썹)
   *   2 코·입이 아주 작다 (점과 짧은 선)
   *   3 머리카락이 뾰족한 다발로 갈라진다 + 광택 밴드가 있다
   *   4 명암이 두 톤으로 딱 끊긴다 (그라디언트 없음)
   *   5 윤곽선이 어둡게 들어간다
   */

  /** 인물 id 로 고정되는 값 — 같은 인물은 늘 같은 머리 모양·눈 색이 된다 */
  function animeSeed(o) {
    var key = (o.ref && (o.ref.id || o.ref.name)) || o.key || 'x';
    var h = 0;
    for (var i = 0; i < key.length; i++) { h = (h * 31 + key.charCodeAt(i)) & 0x7fffffff; }
    return h;
  }

  /* 눈 색 — 동양 인물이라 갈색·흑갈색을 중심에 두고 한둘만 청·자를 섞는다.
     (예전엔 청록·초록이 섞여 관우 눈이 초록으로 나왔다) */
  /* 만화풍 이목구비를 얼굴 안쪽으로 당기는 양 (headR 배수) — 눈·안경·안대가 공유한다 */
  /* 그림책풍 얼굴 — 정면을 보고 웃는다.
   * 전통풍 얼굴은 3/4 각도라 눈이 한쪽에 몰려 있고 흰자·눈동자가 아주 작다.
   * 그 상태로 storyize() 를 통과하면 이목구비가 계단·선에 먹혀 얼굴이 뭉갠 자국처럼
   * 남는다(실제로 그랬다). 그래서 이 양식만 **크고 단순한 정면 이목구비**로 그린다.
   * 굵기·크기는 후처리 뒤에도 남을 만큼(머리 반지름의 15% 이상) 잡는다.
   */
  var STORY_INK = '#4a3a2c';

  function storyFace(ctx, headY, headR, look) {
    /* 이목구비를 조금 내려 잡는다 — 투구·관모의 테가 이마를 덮으므로, 원래
       위치(눈이 머리 중심보다 위)에 두면 눈·눈썹이 테와 겹쳐 뭉갠 자국이 된다. */
    var ex = headR * 0.31, ey = headY + headR * 0.06;
    var er = Math.max(0.9, headR * 0.16);

    /* 눈 — 꽉 찬 타원 하나로. 흰자를 두면 이 크기에서는 회색 점으로 보인다 */
    ctx.fillStyle = STORY_INK;
    ctx.beginPath();
    ctx.ellipse(-ex, ey, er * 0.86, er, 0, 0, Math.PI * 2);
    ctx.ellipse(ex, ey, er * 0.86, er, 0, 0, Math.PI * 2);
    ctx.fill();

    /* 눈썹 — 기질(brow)에 따라 기울기만 바꾼다 */
    var tilt = look.brow === 'sharp' ? -0.28 : (look.brow === 'soft' ? 0.16 : -0.06);
    ctx.strokeStyle = STORY_INK;
    ctx.lineWidth = Math.max(0.8, headR * 0.11);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-ex - headR * 0.18, ey - headR * 0.26 - tilt * headR * 0.6);
    ctx.lineTo(-ex + headR * 0.16, ey - headR * 0.30 + tilt * headR * 0.6);
    ctx.moveTo(ex - headR * 0.16, ey - headR * 0.30 + tilt * headR * 0.6);
    ctx.lineTo(ex + headR * 0.18, ey - headR * 0.26 - tilt * headR * 0.6);
    ctx.stroke();

    /* 입 — 수염이 있으면 입은 수염이 가리므로 그리지 않는다 */
    if (!look.beard) {
      ctx.lineWidth = Math.max(0.7, headR * 0.09);
      ctx.beginPath();
      ctx.arc(0, headY + headR * 0.36, headR * 0.22, Math.PI * 0.18, Math.PI * 0.82);
      ctx.stroke();
    }
  }

  var ANIME_FACE_DX = 0.13;

  var ANIME_EYES = ['#5b3a26', '#7a4c2a', '#3d2a22', '#334f74', '#5a3550', '#2f2a30'];

  /**
   * 만화풍 얼굴. (0, headY) 가 머리 중심이고 오른쪽을 보는 기준이다.
   * @param fine 잔 디테일을 그릴 만큼 큰가 · superFine 더 큰가
   */
  function animeFace(ctx, headY, headR, look, seed, fine, superFine, hair) {
    var eyeCol = ANIME_EYES[seed % ANIME_EYES.length];
    /* 이목구비를 통째로 조금 왼쪽으로 — 3/4 각도라 오른쪽(앞쪽)에 몰리는 게 맞지만,
       만화풍은 머리를 1.4배 키우므로 같은 비율이면 왼쪽 뺨이 텅 비어 보인다.
       안경·안대도 같은 값을 써야 눈과 어긋나지 않는다(ANIME_FACE_DX). */
    ctx.save();
    ctx.translate(-headR * ANIME_FACE_DX, 0);
    /* 눈은 얼굴 가로 중앙보다 살짝 위, 서로 멀찍이 (애니메 특징).
       얼굴 폭의 3분의 1을 차지할 만큼 크게 — 이게 애니메의 핵이다. */
    var eyes = [
      { x: headR * 0.54, y: headY + headR * 0.10, w: headR * 0.28, h: headR * 0.40 },  // 앞쪽 눈(큼)
      { x: -headR * 0.28, y: headY + headR * 0.07, w: headR * 0.25, h: headR * 0.35 }  // 뒤쪽 눈
    ];
    var i, e;

    if (!fine) {
      /* 작을 때는 큰 눈 두 점만 — 이것만으로도 애니메로 읽힌다 */
      ctx.fillStyle = '#20242e';
      for (i = 0; i < eyes.length; i++) {
        e = eyes[i];
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, Math.max(0.7, e.w * 0.62), Math.max(0.9, e.h * 0.62), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    for (i = 0; i < eyes.length; i++) {
      e = eyes[i];
      /* 흰자 */
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, e.w, e.h, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#fbfcff';
      ctx.fill();
      /* 홍채 — 크지만 흰자를 남긴다 (꽉 채우면 인형 눈처럼 보인다) */
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + e.h * 0.08, e.w * 0.68, e.h * 0.70, 0, 0, Math.PI * 2);
      ctx.fillStyle = eyeCol;
      ctx.fill();
      /* 홍채 아래쪽이 밝다 (애니메 특유의 그라데) */
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + e.h * 0.30, e.w * 0.46, e.h * 0.28, 0, 0, Math.PI * 2);
      ctx.fillStyle = shade(eyeCol, 0.34);
      ctx.fill();
      /* 동공 */
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + e.h * 0.08, e.w * 0.30, e.h * 0.34, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#141118';
      ctx.fill();
      /* 하이라이트 — 이 점 하나가 눈을 살린다 */
      ctx.beginPath();
      ctx.ellipse(e.x + e.w * 0.26, e.y - e.h * 0.34, e.w * 0.22, e.h * 0.19, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fill();
      if (superFine) {
        ctx.beginPath();
        ctx.arc(e.x - e.w * 0.30, e.y + e.h * 0.30, e.w * 0.13, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fill();
      }
      /* 위 속눈썹 — 눈매를 결정한다. 눈 전체를 두르면 안경처럼 보이므로 위쪽만 얇게 */
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, e.w * 1.02, e.h * 1.02, 0, Math.PI * 1.12, Math.PI * 1.90);
      ctx.strokeStyle = '#171520';
      ctx.lineWidth = Math.max(0.6, e.h * 0.19);
      ctx.lineCap = 'round';
      ctx.stroke();
      /* 눈꼬리 — 바깥쪽으로 살짝 뻗는 선 하나 */
      if (superFine) {
        ctx.beginPath();
        ctx.moveTo(e.x + e.w * 0.86, e.y - e.h * 0.34);
        ctx.lineTo(e.x + e.w * 1.24, e.y - e.h * 0.52);
        ctx.lineWidth = Math.max(0.5, e.h * 0.13);
        ctx.stroke();
      }
    }

    /* 눈썹 — 얇고 높다. 기질에 따라 각도가 다르다 */
    var tilt = look.brow === 'sharp' ? -0.55 : (look.brow === 'soft' ? 0.28 : -0.12);
    ctx.strokeStyle = shade(hair, 0.12);
    ctx.lineWidth = Math.max(0.6, headR * 0.075);
    ctx.beginPath();
    ctx.moveTo(headR * 0.30, headY - headR * 0.56 + tilt * headR * 0.22);
    ctx.quadraticCurveTo(headR * 0.54, headY - headR * 0.66,
                         headR * 0.74, headY - headR * 0.52 - tilt * headR * 0.22);
    ctx.moveTo(-headR * 0.18, headY - headR * 0.54 + tilt * headR * 0.20);
    ctx.quadraticCurveTo(headR * 0.00, headY - headR * 0.64,
                         headR * 0.18, headY - headR * 0.52 - tilt * headR * 0.14);
    ctx.stroke();

    /* 코 — 작은 삼각 점 */
    ctx.beginPath();
    ctx.moveTo(headR * 0.66, headY + headR * 0.22);
    ctx.lineTo(headR * 0.77, headY + headR * 0.36);
    ctx.lineTo(headR * 0.58, headY + headR * 0.36);
    ctx.closePath();
    ctx.fillStyle = 'rgba(146,88,72,0.78)';
    ctx.fill();

    /* 입 — 짧은 곡선 (수염이 있으면 생략) */
    if (!look.beard) {
      ctx.beginPath();
      ctx.moveTo(headR * 0.34, headY + headR * 0.60);
      ctx.quadraticCurveTo(headR * 0.50, headY + headR * 0.72, headR * 0.64, headY + headR * 0.58);
      ctx.strokeStyle = 'rgba(150,62,58,0.95)';
      ctx.lineWidth = Math.max(0.7, headR * 0.085);
      ctx.stroke();
    }

    /* 볼 홍조 — 애니메 감성의 마무리 */
    if (superFine) {
      ctx.beginPath();
      ctx.ellipse(headR * 0.66, headY + headR * 0.40, headR * 0.20, headR * 0.11, 0, 0, Math.PI * 2);
      ctx.ellipse(-headR * 0.10, headY + headR * 0.38, headR * 0.16, headR * 0.09, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(232,120,120,0.30)';
      ctx.fill();
    }
    ctx.restore();
  }

  /** 투구·모자 아래로 삐져나오는 앞머리만 (모자는 나중에 위에 덮인다) */
  function animeFringe(ctx, headY, headR, seed, hair) {
    ctx.fillStyle = hair;
    /* 이마 밑판 — 두피를 따라 덮는다.
       예전엔 다발을 평평한 한 줄(y 고정)에서 시작해, 머리 곡면이 가장 높은
       정수리 쪽이 0.2R 남만큼 떠서 살색 두피가 비쳤다. */
    ctx.beginPath();
    ctx.arc(0, headY, headR * 0.99, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(headR * 0.10, headY - headR * 0.46, -headR * 0.96, headY - headR * 0.22);
    ctx.closePath();
    ctx.fill();

    var n = 3 + (seed % 2);
    for (var i = 0; i < n; i++) {
      var t = n === 1 ? 0.5 : i / (n - 1);
      var x = -headR * 0.70 + headR * 1.46 * t;
      /* 다발 뿌리를 머리 곡면 위에 올린다 (평평한 선에서 시작하면 떠 보인다) */
      var rx = Math.max(-0.96, Math.min(0.96, x / headR));
      var rootY = headY - Math.sqrt(1 - rx * rx) * headR * 0.97;
      var len = headR * (0.40 + ((seed >> (i * 3)) % 4) * 0.11);
      /* 다발 끝이 눈 위를 넘지 않게 — 넘으면 눈이 머리카락에 파묻힌다 */
      var tipY = Math.min(rootY + len, headY - headR * 0.16);
      ctx.beginPath();
      ctx.moveTo(x - headR * 0.17, rootY + headR * 0.02);
      ctx.quadraticCurveTo(x + headR * 0.02, tipY - headR * 0.14, x + headR * 0.10, tipY);
      ctx.quadraticCurveTo(x + headR * 0.24, tipY - headR * 0.18, x + headR * 0.21, rootY - headR * 0.02);
      ctx.closePath();
      ctx.fill();
    }
    /* 귀 앞 구레나룻 */
    ctx.beginPath();
    ctx.moveTo(headR * 0.80, headY - headR * 0.56);
    ctx.quadraticCurveTo(headR * 1.00, headY - headR * 0.10, headR * 0.84, headY + headR * 0.34);
    ctx.quadraticCurveTo(headR * 0.70, headY - headR * 0.06, headR * 0.66, headY - headR * 0.52);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * 만화풍 머리카락 — 뾰족한 다발 + 광택 밴드.
   * 다발 수·길이는 seed 로 고정되므로 같은 인물은 늘 같은 머리다.
   */
  function animeHair(ctx, headY, headR, seed, fine, hair, female) {
    var dark = shade(hair, -0.35), lite = shade(hair, 0.42);

    /* 뒷머리 덩어리 */
    ctx.beginPath();
    ctx.arc(0, headY - headR * 0.06, headR * 1.10, Math.PI * 0.98, Math.PI * 2.02);
    ctx.lineTo(headR * 0.92, headY + headR * 0.30);
    ctx.quadraticCurveTo(0, headY - headR * 0.20, -headR * 0.92, headY + headR * 0.34);
    ctx.closePath();
    ctx.fillStyle = hair;
    ctx.fill();

    /* 앞머리 다발 — 정수리에서 갈라져 뾰족하게 내려온다 */
    var n = 4 + (seed % 3);                       // 4~6 다발
    var spread = Math.PI * 1.06;                  // 이마를 덮는 각도 범위
    ctx.fillStyle = hair;
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);
      var a = Math.PI * 1.02 + spread * t;        // 왼쪽 → 오른쪽
      var rootX = Math.cos(a) * headR * 0.98;
      var rootY = headY + Math.sin(a) * headR * 0.98;
      /* 다발 길이·기울기를 seed 로 흔든다 (일정하면 빗자루처럼 보인다) */
      var len = headR * (0.54 + ((seed >> (i * 3)) % 5) * 0.10);
      var lean = ((seed >> (i * 2 + 1)) % 3 - 1) * headR * 0.22;
      var tipX = rootX * 0.72 + lean + headR * 0.14;
      var tipY = rootY + len;
      /* 얼굴 정면으로 내려오는 다발은 눈 위에서 멈춘다 — 안 그러면 눈이 파묻힌다.
         (얼굴 옆으로 흐르는 다발은 길어도 괜찮으니 건드리지 않는다) */
      if (Math.abs(tipX) < headR * 0.78) { tipY = Math.min(tipY, headY - headR * 0.18); }
      var w = headR * 0.30;
      ctx.beginPath();
      ctx.moveTo(rootX - w * 0.5, rootY - headR * 0.06);
      ctx.quadraticCurveTo(rootX + w * 0.2, rootY + len * 0.5, tipX, tipY);   // 다발 앞선
      ctx.quadraticCurveTo(rootX + w * 0.9, rootY + len * 0.4, rootX + w * 0.6, rootY - headR * 0.10);
      ctx.closePath();
      ctx.fill();
    }

    /* 옆머리 (귀 앞으로 내려오는 한 줄) — 얼굴 바깥선에 붙인다.
       안쪽으로 들어오면 뺨을 덮어 얼굴이 좁아 보인다(여성 인물에서 특히 심했다) */
    ctx.beginPath();
    ctx.moveTo(headR * 0.92, headY - headR * 0.30);
    ctx.quadraticCurveTo(headR * 1.14, headY + headR * 0.30, headR * 0.96, headY + headR * (female ? 1.30 : 0.66));
    ctx.quadraticCurveTo(headR * 0.84, headY + headR * 0.20, headR * 0.80, headY - headR * 0.26);
    ctx.closePath();
    ctx.fill();

    /* 여성은 뒤로 긴 머리를 하나 더 */
    if (female) {
      ctx.beginPath();
      ctx.moveTo(-headR * 0.94, headY - headR * 0.10);
      ctx.quadraticCurveTo(-headR * 1.30, headY + headR * 1.40, -headR * 0.62, headY + headR * 2.30);
      ctx.quadraticCurveTo(-headR * 0.46, headY + headR * 1.20, -headR * 0.58, headY - headR * 0.06);
      ctx.closePath();
      ctx.fill();
    }

    /* 광택 밴드 — 애니메 머리의 상징 */
    if (fine) {
      ctx.beginPath();
      ctx.ellipse(headR * 0.10, headY - headR * 0.62, headR * 0.66, headR * 0.15, -0.18, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fill();
      /* 다발 사이 음영 몇 줄 */
      ctx.strokeStyle = dark;
      ctx.lineWidth = Math.max(0.5, headR * 0.06);
      ctx.beginPath();
      ctx.moveTo(-headR * 0.30, headY - headR * 0.86);
      ctx.lineTo(-headR * 0.10, headY - headR * 0.20);
      ctx.moveTo(headR * 0.44, headY - headR * 0.90);
      ctx.lineTo(headR * 0.52, headY - headR * 0.26);
      ctx.stroke();
    }
    return lite;
  }

  /**
   * 팔·다리 하나 — (ox,oy) 관절에서 angle 방향으로 len.
   * outline 을 주면 굵은 어두운 선을 먼저 깔아 실루엣을 띄운다
   * (앞팔·앞다리가 몸통과 같은 색일 때 묻히지 않게).
   */
  function limb(ctx, ox, oy, angle, len, w, color, outline) {
    var ex = ox + Math.sin(angle) * len, ey = oy + Math.cos(angle) * len;
    if (outline) {
      ctx.beginPath();
      ctx.moveTo(ox, oy); ctx.lineTo(ex, ey);
      ctx.strokeStyle = outline; ctx.lineWidth = w * 1.38;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.stroke();
  }

  /** 손 — 무기를 쥔 자리에 하나 얹으면 팔이 끊긴 느낌이 사라진다 */
  function hand(ctx, x, y, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  /** 신발 — 앞코가 살짝 들린 짚신 / 버선 */
  function foot(ctx, x, y, H, color, sockColor, fine) {
    ctx.beginPath();
    ctx.ellipse(x, y, H * 0.062, H * 0.030, 0, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    if (fine) {
      ctx.beginPath();
      ctx.ellipse(x + H * 0.03, y - H * 0.012, H * 0.022, H * 0.012, 0, 0, Math.PI * 2);
      ctx.fillStyle = sockColor; ctx.fill();
    }
  }

  /**
   * 만화풍에서 모자를 얼마나 위로 올릴지 (headR 배수).
   * 머리를 감싸는 것(투구·갓·면류관·쪽머리)은 올려야 커진 눈을 덮지 않는다.
   * 관모(scholar)만은 정수리 위에 얹히는 판이라, 올리면 머리에서 떨어져
   * 공중에 뜬 검은 상자로 보인다 — 관모 쓴 인물 전원이 그랬다.
   */
  function HELM_LIFT(kind) {
    /* 관모·면류관은 정수리 위에 얹히는 물건이라 올리면 머리에서 떨어져 뜬다 */
    if (kind === 'scholar' || kind === 'crown') { return 0; }
    return 0.30;
  }

  function headgear(ctx, kind, headY, headR, H, col, mid, dark, metal, metalDark, anime, skin) {
    var topY = headY - headR;
    if (kind === 'helmet' || kind === 'gapju' || kind === 'plume') {
      ctx.beginPath();
      ctx.arc(0, headY - headR * 0.15, headR * 1.12, Math.PI, Math.PI * 2);
      ctx.fillStyle = metalDark; ctx.fill();
      ctx.beginPath();
      ctx.rect(-headR * 1.15, headY - headR * 0.2, headR * 2.3, headR * 0.22);
      ctx.fillStyle = metal; ctx.fill();
      if (kind === 'gapju') {           // 조선 갑주 — 위로 솟은 장식
        ctx.beginPath();
        ctx.moveTo(0, topY - headR * 0.9);
        ctx.lineTo(headR * 0.2, topY - headR * 0.1);
        ctx.lineTo(-headR * 0.2, topY - headR * 0.1);
        ctx.closePath();
        ctx.fillStyle = '#d9b23c'; ctx.fill();
      } else if (kind === 'plume') {    // 여포 — 꿩깃
        ctx.beginPath();
        ctx.moveTo(0, topY - headR * 0.2);
        ctx.quadraticCurveTo(headR * 1.4, topY - headR * 1.9, headR * 0.3, topY - headR * 2.1);
        ctx.quadraticCurveTo(headR * 0.5, topY - headR * 1.0, 0, topY - headR * 0.2);
        ctx.fillStyle = '#e2574a'; ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, topY - headR * 0.1, headR * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#d9b23c'; ctx.fill();
      }
    } else if (kind === 'crown') {
      ctx.beginPath();
      ctx.moveTo(-headR * 1.05, headY - headR * 0.35);
      ctx.lineTo(headR * 1.05, headY - headR * 0.35);
      ctx.lineTo(headR * 1.05, topY - headR * 0.35);
      ctx.lineTo(headR * 0.5, topY + headR * 0.05);
      ctx.lineTo(0, topY - headR * 0.5);
      ctx.lineTo(-headR * 0.5, topY + headR * 0.05);
      ctx.lineTo(-headR * 1.05, topY - headR * 0.35);
      ctx.closePath();
      ctx.fillStyle = '#e0b93f'; ctx.fill();
      ctx.strokeStyle = '#9c7a1c'; ctx.lineWidth = H * 0.012; ctx.stroke();
    } else if (kind === 'gat') {          // 갓
      ctx.beginPath();
      ctx.ellipse(0, headY - headR * 0.55, headR * 1.75, headR * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#2c2c33'; ctx.fill();
      ctx.beginPath();
      ctx.rect(-headR * 0.62, topY - headR * 0.62, headR * 1.24, headR * 0.75);
      ctx.fill();
    } else if (kind === 'scholar') {      // 문관 관모
      /* 아래 판은 머리에 물리게 — 정수리에 얹히면 좌우 밑으로 배경이 비쳐 떠 보인다 */
      ctx.beginPath();
      ctx.rect(-headR * 0.93, topY - headR * 0.34, headR * 1.86, headR * 0.56);
      ctx.fillStyle = '#2f3240'; ctx.fill();
      ctx.beginPath();
      ctx.rect(-headR * 0.46, topY - headR * 0.80, headR * 0.92, headR * 0.48);
      ctx.fill();
    } else if (kind === 'monk') {         // 승려 — 민머리 + 염주
      /* 얼굴 살색에서 살짝만 밝게 — 고정 살색을 쓰면 얼굴과 톤이 어긋나 빵모자처럼 보인다 */
      ctx.beginPath();
      ctx.arc(0, headY - headR * 0.1, headR * 1.02, Math.PI, Math.PI * 2);
      ctx.fillStyle = skin ? shade(skin, 0.22) : 'rgba(230,196,159,0.9)';
      ctx.fill();
      if (skin) {                         // 정수리 경계에 옅은 음영 — 두피가 둥글어 보인다
        ctx.strokeStyle = 'rgba(120,86,64,0.28)';
        ctx.lineWidth = Math.max(0.5, headR * 0.06);
        ctx.stroke();
      }
    } else if (kind === 'hairpin') {      // 여성 — 쪽머리 + 비녀
      /* 만화풍은 animeHair 가 이미 긴 머리·옆머리를 그린다.
         여기서 머리 덩어리를 또 얹으면 두 겹이 되어 뒤쪽 눈까지 덮었다 → 비녀만 남긴다. */
      if (!anime) {
        ctx.beginPath();
        ctx.arc(-headR * 0.75, headY + headR * 0.1, headR * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#2a2228'; ctx.fill();
        ctx.beginPath();
        ctx.arc(0, headY - headR * 0.25, headR * 1.05, Math.PI, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#d9b23c'; ctx.lineWidth = H * 0.016;
      ctx.beginPath();
      if (anime) {                        // 머리 안쪽에 비스듬히 — 이마도, 실루엣 밖도 벗어나지 않게
        ctx.moveTo(-headR * 0.55, headY - headR * 0.18);
        ctx.lineTo(headR * 0.05, headY - headR * 0.38);
      } else {
        ctx.moveTo(-headR * 1.3, headY + headR * 0.05);
        ctx.lineTo(-headR * 0.2, headY - headR * 0.1);
      }
      ctx.stroke();
    } else if (kind === 'braid') {        // 단발·댕기
      if (!anime) {
        ctx.beginPath();
        ctx.arc(0, headY - headR * 0.2, headR * 1.06, Math.PI, Math.PI * 2);
        ctx.fillStyle = '#2a2228'; ctx.fill();
      }
      ctx.beginPath();                    // 댕기 — 만화풍에서도 뒤로 늘어뜨린다
      ctx.moveTo(-headR * 0.9, headY);
      ctx.quadraticCurveTo(-headR * 1.2, headY + headR * 1.6, -headR * 0.5, headY + headR * 1.8);
      ctx.strokeStyle = '#2a2228'; ctx.lineWidth = H * 0.03; ctx.stroke();
    } else {                              // 상투
      ctx.beginPath();
      ctx.arc(0, headY - headR * 0.25, headR * 1.02, Math.PI, Math.PI * 2);
      ctx.fillStyle = '#2a2228'; ctx.fill();
      ctx.beginPath();
      ctx.arc(0, topY - headR * 0.18, headR * 0.24, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function weapon(ctx, kind, hx, hy, H, metal, metalDark, col, dark) {
    if (!kind || kind === 'none') { return; }
    ctx.save();
    ctx.translate(hx, hy);
    if (kind === 'spear' || kind === 'guandao' || kind === 'halberd') {
      ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = H * 0.032;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.16);
      ctx.lineTo(0, -H * 0.78);
      ctx.stroke();
      ctx.beginPath();
      if (kind === 'guandao') {          // 청룡언월도 — 넓은 날
        ctx.moveTo(0, -H * 0.78);
        ctx.quadraticCurveTo(H * 0.26, -H * 0.72, H * 0.16, -H * 0.48);
        ctx.quadraticCurveTo(H * 0.06, -H * 0.56, 0, -H * 0.52);
      } else if (kind === 'halberd') {   // 방천화극 — 양날
        ctx.moveTo(0, -H * 0.92); ctx.lineTo(H * 0.05, -H * 0.74);
        ctx.lineTo(-H * 0.05, -H * 0.74); ctx.closePath();
        ctx.moveTo(0, -H * 0.72); ctx.lineTo(H * 0.19, -H * 0.66);
        ctx.lineTo(0, -H * 0.58);
        ctx.moveTo(0, -H * 0.72); ctx.lineTo(-H * 0.19, -H * 0.66);
        ctx.lineTo(0, -H * 0.58);
      } else {                            // 창
        ctx.moveTo(0, -H * 0.96); ctx.lineTo(H * 0.055, -H * 0.76);
        ctx.lineTo(-H * 0.055, -H * 0.76); ctx.closePath();
      }
      ctx.fillStyle = metal; ctx.fill();
    } else if (kind === 'sword') {
      ctx.strokeStyle = metal; ctx.lineWidth = H * 0.038;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.02);
      ctx.lineTo(H * 0.10, -H * 0.42);
      ctx.stroke();
      ctx.strokeStyle = '#d9b23c'; ctx.lineWidth = H * 0.022;
      ctx.beginPath();
      ctx.moveTo(-H * 0.05, H * 0.03);
      ctx.lineTo(H * 0.06, -H * 0.02);
      ctx.stroke();
    } else if (kind === 'axe') {
      ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = H * 0.032;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.12); ctx.lineTo(H * 0.02, -H * 0.52); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(H * 0.02, -H * 0.52);
      ctx.quadraticCurveTo(H * 0.26, -H * 0.46, H * 0.14, -H * 0.26);
      ctx.quadraticCurveTo(H * 0.06, -H * 0.34, H * 0.02, -H * 0.32);
      ctx.fillStyle = metal; ctx.fill();
    } else if (kind === 'club') {
      ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = H * 0.05;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.10); ctx.lineTo(H * 0.06, -H * 0.44); ctx.stroke();
      ctx.beginPath();
      ctx.arc(H * 0.07, -H * 0.50, H * 0.10, 0, Math.PI * 2);
      ctx.fillStyle = '#6b4f2c'; ctx.fill();
    } else if (kind === 'bow') {
      ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = H * 0.028;
      ctx.beginPath();
      ctx.arc(0, -H * 0.16, H * 0.30, -Math.PI * 0.55, Math.PI * 0.55);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(240,240,240,0.6)'; ctx.lineWidth = H * 0.012;
      ctx.beginPath();
      ctx.moveTo(Math.cos(-Math.PI * 0.55) * H * 0.30, -H * 0.16 + Math.sin(-Math.PI * 0.55) * H * 0.30);
      ctx.lineTo(Math.cos(Math.PI * 0.55) * H * 0.30, -H * 0.16 + Math.sin(Math.PI * 0.55) * H * 0.30);
      ctx.stroke();
    } else if (kind === 'fan') {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, H * 0.24, -Math.PI * 0.95, -Math.PI * 0.3);
      ctx.closePath();
      ctx.fillStyle = '#e8e3d4'; ctx.fill();
      ctx.strokeStyle = '#9a8f76'; ctx.lineWidth = H * 0.012; ctx.stroke();
    } else if (kind === 'scroll') {
      ctx.beginPath();
      ctx.rect(-H * 0.03, -H * 0.20, H * 0.13, H * 0.24);
      ctx.fillStyle = '#e8e3d4'; ctx.fill();
      ctx.strokeStyle = '#a8a08c'; ctx.lineWidth = H * 0.012; ctx.stroke();
    } else if (kind === 'brush') {
      ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = H * 0.022;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.04); ctx.lineTo(H * 0.05, -H * 0.24); ctx.stroke();
      ctx.beginPath();
      ctx.arc(H * 0.055, -H * 0.27, H * 0.032, 0, Math.PI * 2);
      ctx.fillStyle = '#2f2f38'; ctx.fill();
    } else if (kind === 'staff') {
      ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = H * 0.030;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.16); ctx.lineTo(H * 0.02, -H * 0.62); ctx.stroke();
      ctx.beginPath();
      ctx.arc(H * 0.02, -H * 0.66, H * 0.055, 0, Math.PI * 2);
      ctx.fillStyle = '#7fd8c8'; ctx.fill();
    }
    ctx.restore();
  }

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
    /* 포켓몬 — 형태는 있는 것(quad·dragon·turtle·bird·fish·ogre) 안에서 고른다 */
    pk_bulbasaur: 'quad', pk_charmander: 'quad', pk_squirtle: 'turtle', pk_magikarp: 'fish',
    pk_pikachu: 'quad', pk_eevee: 'quad', pk_slowbro: 'quad', pk_gengar: 'ogre',
    pk_snorlax: 'quad', pk_lapras: 'turtle', pk_alakazam: 'ogre', pk_dragonite: 'dragon',
    pk_charizard: 'dragon', pk_gyarados: 'dragon', pk_mewtwo: 'ogre', pk_mew: 'quad'
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
    pk_bulbasaur: '#6aa84f', pk_charmander: '#e06c3a', pk_squirtle: '#5a9ad9', pk_magikarp: '#e0703a',
    pk_pikachu: '#e8c93a', pk_eevee: '#b98a5a', pk_slowbro: '#e8a0b0', pk_gengar: '#6a4a8c',
    pk_snorlax: '#4a6a7a', pk_lapras: '#7ab0d9', pk_alakazam: '#d9a83a', pk_dragonite: '#e8b45a',
    pk_charizard: '#e06c3a', pk_gyarados: '#4a7ad9', pk_mewtwo: '#d9c8e8', pk_mew: '#f0a8c0'
  };

  /**
   * 짐승의 무늬 — 형태(form)가 같아도 이것으로 구분이 된다.
   * 적지 않으면 무늬 없는 민무늬가 된다.
   */
  var BEAST_PATTERN = {
    pt_tiger: 'stripe', pt_baekho: 'stripe', pt_panda: 'patch', pt_deer: 'spot',
    pt_boar: 'tusk', pt_gumiho: 'ninetail', pt_haetae: 'mane', pt_bulgasari: 'mane',
    pt_bear: 'crescent', pt_sapsal: 'shaggy', pt_monkey: 'bareface',
    pk_pikachu: 'spot', pk_eevee: 'shaggy', pk_bulbasaur: 'patch', pk_snorlax: 'patch',
    pk_alakazam: 'mane', pk_gyarados: 'stripe', pk_mewtwo: 'mane'
  };

  function beastPatternOf(pet) { return (pet && BEAST_PATTERN[pet.id]) || ''; }
  function beastFormOf(pet) { return (pet && BEAST_FORM[pet.id]) || 'quad'; }
  function beastColorOf(pet) { return (pet && BEAST_COLOR[pet.id]) || '#9a8f7a'; }

  /**
   * @param o {x, y, s, facing, phase, walking, form, color, divine, t}
   */
  function beast(ctx, o) {
    var H = 30 * (o.s || 1);
    var col = o.color || '#9a8f7a';
    var dark = shade(col, -0.4), lite = shade(col, 0.3);
    var ph = o.phase || 0;
    var walking = !!o.walking;
    var sw = walking ? Math.sin(ph) * 0.42 : 0;
    var swB = walking ? Math.sin(ph + Math.PI) * 0.42 : 0;
    var bounce = o.noBounce ? 0
      : (walking ? Math.abs(Math.sin(ph * 2)) * H * 0.05
                 : Math.sin((o.t || 0) / 700) * H * 0.02);
    var form = o.form || 'quad';
    var pat = o.pattern || (o.ref ? beastPatternOf(o.ref) : '');
    var fine = H >= 18;
    var outline = 'rgba(0,0,0,0.32)';

    ctx.save();
    ctx.translate(o.x, o.y - bounce);

    /* 발밑 그림자 */
    ctx.beginPath();
    ctx.ellipse(0, bounce * 0.5, H * 0.34, H * 0.075, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    ctx.fill();

    if ((o.facing || 1) < 0) { ctx.scale(-1, 1); }
    ctx.lineCap = 'round';

    if (o.divine) {   // 신수 — 옅은 기운 + 테두리 빛
      ctx.beginPath();
      ctx.ellipse(0, -H * 0.5, H * 0.9, H * 0.75, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(180,220,255,0.10)';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, -H * 0.5, H * 0.82, H * 0.68, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200,230,255,0.16)'; ctx.lineWidth = H * 0.03;
      ctx.stroke();
    }

    if (form === 'bird') {
      // 다리
      ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = H * 0.05;
      ctx.beginPath();
      ctx.moveTo(-H * 0.04, -H * 0.28); ctx.lineTo(-H * 0.06, 0);
      ctx.moveTo(H * 0.06, -H * 0.28); ctx.lineTo(H * 0.08, 0);
      ctx.stroke();
      // 몸통
      ctx.beginPath();
      ctx.ellipse(0, -H * 0.52, H * 0.30, H * 0.26, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
      // 날개
      ctx.beginPath();
      ctx.moveTo(-H * 0.05, -H * 0.60);
      ctx.quadraticCurveTo(-H * 0.42, -H * 0.52 + (walking ? Math.sin(ph * 2) * H * 0.10 : 0), -H * 0.20, -H * 0.34);
      ctx.quadraticCurveTo(-H * 0.06, -H * 0.40, -H * 0.05, -H * 0.60);
      ctx.fillStyle = dark; ctx.fill();
      // 꼬리 — 세 갈래 깃
      for (var tf = 0; tf < 3; tf++) {
        ctx.beginPath();
        ctx.moveTo(-H * 0.26, -H * 0.56 + tf * H * 0.02);
        ctx.lineTo(-H * (0.58 + tf * 0.05), -H * (0.50 - tf * 0.06));
        ctx.lineTo(-H * 0.26, -H * (0.46 - tf * 0.02));
        ctx.closePath();
        ctx.fillStyle = tf === 1 ? shade(col, -0.55) : dark;
        ctx.fill();
      }
      if (fine) {                                  // 날개 깃 선
        ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = H * 0.014;
        for (var wf = 0; wf < 3; wf++) {
          ctx.beginPath();
          ctx.moveTo(-H * (0.10 + wf * 0.08), -H * 0.56);
          ctx.lineTo(-H * (0.16 + wf * 0.08), -H * 0.40);
          ctx.stroke();
        }
      }
      // 머리·부리
      ctx.beginPath();
      ctx.arc(H * 0.24, -H * 0.74, H * 0.13, 0, Math.PI * 2);
      ctx.fillStyle = lite; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(H * 0.34, -H * 0.76);
      ctx.lineTo(H * 0.52, -H * 0.72);
      ctx.lineTo(H * 0.34, -H * 0.68);
      ctx.closePath();
      ctx.fillStyle = '#e0b93f'; ctx.fill();
      if (fine) {                                  // 벼슬
        ctx.fillStyle = shade(col, -0.35);
        ctx.beginPath();
        ctx.moveTo(H * 0.18, -H * 0.85);
        ctx.quadraticCurveTo(H * 0.24, -H * 1.00, H * 0.32, -H * 0.84);
        ctx.closePath(); ctx.fill();
      }
      eye(ctx, H * 0.28, -H * 0.77, H * 0.026);
    } else if (form === 'dragon' || form === 'serpent') {
      // 굽이치는 몸통
      var wave = walking ? Math.sin(ph) * H * 0.10 : Math.sin((o.t || 0) / 500) * H * 0.05;
      ctx.beginPath();
      ctx.moveTo(-H * 0.62, -H * 0.22);
      ctx.quadraticCurveTo(-H * 0.24, -H * 0.62 + wave, H * 0.06, -H * 0.40);
      ctx.quadraticCurveTo(H * 0.32, -H * 0.22 - wave, H * 0.42, -H * 0.60);
      ctx.strokeStyle = outline; ctx.lineWidth = H * 0.24; ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = H * 0.20; ctx.stroke();
      ctx.strokeStyle = lite; ctx.lineWidth = H * 0.07;
      ctx.stroke();
      /* 등지느러미 — 몸 위로 톱니 */
      if (fine) {
        ctx.fillStyle = '#e0c060';
        var fpts = [[-H * 0.42, -H * 0.50], [-H * 0.16, -H * 0.66], [H * 0.10, -H * 0.56]];
        for (var fi = 0; fi < fpts.length; fi++) {
          ctx.beginPath();
          ctx.moveTo(fpts[fi][0] - H * 0.06, fpts[fi][1]);
          ctx.lineTo(fpts[fi][0], fpts[fi][1] - H * 0.16);
          ctx.lineTo(fpts[fi][0] + H * 0.06, fpts[fi][1]);
          ctx.closePath(); ctx.fill();
        }
        /* 비늘 — 몸통에 작은 호선 */
        ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = H * 0.015;
        for (var sc3 = 0; sc3 < 4; sc3++) {
          ctx.beginPath();
          ctx.arc(-H * 0.34 + sc3 * H * 0.20, -H * 0.40, H * 0.06, Math.PI * 0.15, Math.PI * 0.85);
          ctx.stroke();
        }
        /* 꼬리 지느러미 */
        ctx.beginPath();
        ctx.moveTo(-H * 0.62, -H * 0.22);
        ctx.lineTo(-H * 0.84, -H * 0.36);
        ctx.lineTo(-H * 0.78, -H * 0.10);
        ctx.closePath();
        ctx.fillStyle = lite; ctx.fill();
        /* 발톱 하나 (앞발) */
        ctx.strokeStyle = '#e8e0c8'; ctx.lineWidth = H * 0.026;
        ctx.beginPath();
        ctx.moveTo(H * 0.04, -H * 0.30); ctx.lineTo(H * 0.10, -H * 0.14);
        ctx.moveTo(H * 0.04, -H * 0.30); ctx.lineTo(-H * 0.02, -H * 0.14);
        ctx.stroke();
      }
      // 머리
      ctx.beginPath();
      ctx.ellipse(H * 0.46, -H * 0.68, H * 0.17, H * 0.12, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = outline; ctx.lineWidth = H * 0.018; ctx.stroke();
      /* 갈기 — 머리 뒤로 흐른다 */
      if (fine) {
        ctx.strokeStyle = '#e0c060'; ctx.lineWidth = H * 0.028;
        ctx.beginPath();
        ctx.moveTo(H * 0.34, -H * 0.74);
        ctx.quadraticCurveTo(H * 0.20, -H * 0.86, H * 0.10, -H * 0.70);
        ctx.stroke();
      }
      // 뿔·수염
      ctx.strokeStyle = '#e0c060'; ctx.lineWidth = H * 0.035;
      ctx.beginPath();
      ctx.moveTo(H * 0.40, -H * 0.78); ctx.lineTo(H * 0.30, -H * 0.98);
      ctx.moveTo(H * 0.50, -H * 0.78); ctx.lineTo(H * 0.52, -H * 0.99);
      ctx.stroke();
      if (fine) {                             // 입가 수염
        ctx.strokeStyle = 'rgba(230,220,180,0.9)'; ctx.lineWidth = H * 0.018;
        ctx.beginPath();
        ctx.moveTo(H * 0.60, -H * 0.64);
        ctx.quadraticCurveTo(H * 0.76, -H * 0.60, H * 0.74, -H * 0.44);
        ctx.stroke();
      }
      eye(ctx, H * 0.50, -H * 0.70, H * 0.028);
    } else if (form === 'turtle') {
      ctx.strokeStyle = '#3f4a52'; ctx.lineWidth = H * 0.06;
      ctx.beginPath();
      ctx.moveTo(-H * 0.22, -H * 0.16); ctx.lineTo(-H * 0.26, 0);
      ctx.moveTo(H * 0.20, -H * 0.16); ctx.lineTo(H * 0.24, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -H * 0.34, H * 0.42, H * 0.28, 0, Math.PI, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = H * 0.03;
      ctx.beginPath();
      ctx.moveTo(-H * 0.2, -H * 0.36); ctx.lineTo(-H * 0.1, -H * 0.54);
      ctx.moveTo(H * 0.2, -H * 0.36); ctx.lineTo(H * 0.1, -H * 0.54);
      ctx.stroke();
      if (fine) {                                  // 등껍질 칸
        ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = H * 0.016;
        for (var tg2 = -1; tg2 <= 1; tg2++) {
          ctx.beginPath();
          ctx.moveTo(tg2 * H * 0.16, -H * 0.34);
          ctx.lineTo(tg2 * H * 0.20, -H * 0.60);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.ellipse(0, -H * 0.34, H * 0.24, H * 0.16, 0, Math.PI, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(H * 0.46, -H * 0.30, H * 0.14, H * 0.10, 0, 0, Math.PI * 2);
      ctx.fillStyle = lite; ctx.fill();
      eye(ctx, H * 0.52, -H * 0.32, H * 0.024);
    } else if (form === 'fish') {
      ctx.beginPath();
      ctx.ellipse(0, -H * 0.46, H * 0.34, H * 0.20, 0, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-H * 0.30, -H * 0.46);
      ctx.lineTo(-H * 0.58, -H * 0.30);
      ctx.lineTo(-H * 0.58, -H * 0.62);
      ctx.closePath();
      ctx.fillStyle = dark; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-H * 0.04, -H * 0.64);
      ctx.lineTo(H * 0.10, -H * 0.86);
      ctx.lineTo(H * 0.16, -H * 0.60);
      ctx.closePath();
      ctx.fillStyle = lite; ctx.fill();
      if (fine) {
        ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = H * 0.014;
        for (var fs = 0; fs < 3; fs++) {
          ctx.beginPath();
          ctx.arc(-H * 0.14 + fs * H * 0.14, -H * 0.46, H * 0.09, Math.PI * 1.6, Math.PI * 2.4);
          ctx.stroke();
        }
        ctx.beginPath();                           // 배지느러미
        ctx.moveTo(-H * 0.04, -H * 0.28);
        ctx.lineTo(H * 0.06, -H * 0.12);
        ctx.lineTo(H * 0.14, -H * 0.32);
        ctx.closePath();
        ctx.fillStyle = lite; ctx.fill();
      }
      eye(ctx, H * 0.22, -H * 0.50, H * 0.026);
    } else if (form === 'toad') {
      ctx.beginPath();
      ctx.ellipse(0, -H * 0.24, H * 0.40, H * 0.24, 0, Math.PI, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
      ctx.beginPath();
      ctx.ellipse(H * 0.22, -H * 0.40, H * 0.20, H * 0.15, 0, 0, Math.PI * 2);
      ctx.fillStyle = lite; ctx.fill();
      eye(ctx, H * 0.30, -H * 0.46, H * 0.03);
      if (fine) {                                  // 등 돌기
        ctx.fillStyle = shade(col, -0.30);
        for (var tb = -2; tb <= 1; tb++) {
          ctx.beginPath();
          ctx.arc(tb * H * 0.14, -H * (0.30 + (tb % 2 ? 0.06 : 0.0)), H * 0.035, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.strokeStyle = dark; ctx.lineWidth = H * 0.05;
      ctx.beginPath();
      ctx.moveTo(-H * 0.28, -H * 0.12); ctx.lineTo(-H * 0.36, 0);
      ctx.moveTo(H * 0.28, -H * 0.12); ctx.lineTo(H * 0.36, 0);
      ctx.stroke();
    } else if (form === 'ogre') {
      // 도깨비 — 사람 형태에 뿔과 방망이
      human(ctx, {
        x: 0, y: 0, s: (o.s || 1) * 0.95, facing: 1, phase: ph, walking: walking,
        color: col, skin: '#c96a5a', t: o.t,
        look: { weapon: 'club', helm: 'none', armor: 'leather' }
      });
      var hy = -40 * (o.s || 1) * 0.95 * 0.90, hr = 40 * (o.s || 1) * 0.95 * 0.115;
      ctx.strokeStyle = '#e8e0c8'; ctx.lineWidth = hr * 0.34;
      ctx.beginPath();
      ctx.moveTo(-hr * 0.6, hy - hr * 0.9); ctx.lineTo(-hr * 0.9, hy - hr * 1.9);
      ctx.moveTo(hr * 0.6, hy - hr * 0.9); ctx.lineTo(hr * 0.9, hy - hr * 1.9);
      ctx.stroke();
    } else {
      // 네발 (개·호랑이·곰·말 …)
      var horse = form === 'horse';
      var bodyY = horse ? -H * 0.62 : -H * 0.48;
      var legLen = horse ? H * 0.62 : H * 0.48;
      // 뒷다리
      ctx.strokeStyle = dark; ctx.lineWidth = H * 0.095;
      leg2(ctx, -H * 0.22, bodyY, swB, legLen);
      leg2(ctx, H * 0.20, bodyY, sw, legLen);
      // 몸통 — 등은 진하고 배는 밝게
      ctx.beginPath();
      ctx.ellipse(0, bodyY, H * 0.40, H * 0.22, 0, 0, Math.PI * 2);
      var bgg = ctx.createLinearGradient(0, bodyY - H * 0.22, 0, bodyY + H * 0.22);
      bgg.addColorStop(0, shade(col, 0.10));
      bgg.addColorStop(0.55, col);
      bgg.addColorStop(1, shade(col, -0.26));
      ctx.fillStyle = bgg; ctx.fill();
      if (fine) {                                  // 배 — 밝은 부분
        ctx.beginPath();
        ctx.ellipse(H * 0.02, bodyY + H * 0.10, H * 0.28, H * 0.09, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fill();
      }
      // 앞다리
      ctx.strokeStyle = col; ctx.lineWidth = H * 0.095;
      leg2(ctx, -H * 0.16, bodyY, sw, legLen);
      leg2(ctx, H * 0.26, bodyY, swB, legLen);
      if (fine) {                                  // 발 — 다리 끝을 어둡게
        ctx.fillStyle = 'rgba(30,26,24,0.55)';
        var feet = [[-H * 0.22, swB], [H * 0.20, sw], [-H * 0.16, sw], [H * 0.26, swB]];
        for (var pi = 0; pi < feet.length; pi++) {
          ctx.beginPath();
          ctx.ellipse(feet[pi][0] + Math.sin(feet[pi][1]) * legLen * 0.42,
            bodyY + legLen * 0.98, H * 0.055, H * 0.03, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 꼬리
      ctx.strokeStyle = dark; ctx.lineWidth = H * 0.055;
      ctx.beginPath();
      ctx.moveTo(-H * 0.38, bodyY - H * 0.04);
      ctx.quadraticCurveTo(-H * 0.62, bodyY - H * 0.18, -H * 0.56, bodyY - H * 0.34);
      ctx.stroke();
      // 목·머리
      ctx.strokeStyle = col; ctx.lineWidth = H * 0.16;
      ctx.beginPath();
      ctx.moveTo(H * 0.30, bodyY - H * 0.06);
      ctx.lineTo(H * 0.44, bodyY - H * 0.26);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(H * 0.50, bodyY - H * 0.32, H * 0.16, H * 0.12, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = lite; ctx.fill();
      // 귀 (안쪽까지)
      ctx.beginPath();
      ctx.moveTo(H * 0.44, bodyY - H * 0.42);
      ctx.lineTo(H * 0.40, bodyY - H * 0.58);
      ctx.lineTo(H * 0.54, bodyY - H * 0.46);
      ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
      if (fine) {
        ctx.beginPath();
        ctx.moveTo(H * 0.45, bodyY - H * 0.45);
        ctx.lineTo(H * 0.43, bodyY - H * 0.54);
        ctx.lineTo(H * 0.50, bodyY - H * 0.47);
        ctx.closePath();
        ctx.fillStyle = 'rgba(200,120,120,0.55)'; ctx.fill();
      }
      eye(ctx, H * 0.54, bodyY - H * 0.34, H * 0.026);
      if (fine) {                                  // 코 · 입
        ctx.beginPath();
        ctx.ellipse(H * 0.64, bodyY - H * 0.30, H * 0.035, H * 0.026, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#3a2f2c'; ctx.fill();
        ctx.strokeStyle = 'rgba(50,40,38,0.7)'; ctx.lineWidth = H * 0.016;
        ctx.beginPath();
        ctx.moveTo(H * 0.60, bodyY - H * 0.24);
        ctx.lineTo(H * 0.50, bodyY - H * 0.22);
        ctx.stroke();
      }
      if (horse) {   // 갈기
        ctx.strokeStyle = dark; ctx.lineWidth = H * 0.05;
        ctx.beginPath();
        ctx.moveTo(H * 0.28, bodyY - H * 0.14);
        ctx.lineTo(H * 0.44, bodyY - H * 0.44);
        ctx.stroke();
      }

      /* ── 무늬 — 같은 네발이라도 이걸로 누군지 알아본다 ── */
      if (pat === 'stripe' && fine) {
        ctx.strokeStyle = 'rgba(40,32,28,0.55)'; ctx.lineWidth = H * 0.03;
        for (var st2 = -2; st2 <= 2; st2++) {
          ctx.beginPath();
          ctx.moveTo(st2 * H * 0.13, bodyY - H * 0.20);
          ctx.lineTo(st2 * H * 0.13 + H * 0.03, bodyY - H * 0.02);
          ctx.stroke();
        }
      } else if (pat === 'patch' && fine) {
        ctx.fillStyle = 'rgba(35,32,36,0.88)';
        ctx.beginPath();                              // 눈 주변
        ctx.ellipse(H * 0.50, bodyY - H * 0.36, H * 0.075, H * 0.058, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();                              // 귀
        ctx.moveTo(H * 0.44, bodyY - H * 0.42);
        ctx.lineTo(H * 0.40, bodyY - H * 0.58);
        ctx.lineTo(H * 0.54, bodyY - H * 0.46);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();                              // 어깨
        ctx.ellipse(H * 0.10, bodyY + H * 0.02, H * 0.16, H * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (pat === 'spot' && fine) {
        ctx.fillStyle = 'rgba(255,250,240,0.62)';
        for (var sp2 = 0; sp2 < 5; sp2++) {
          ctx.beginPath();
          ctx.arc(-H * 0.20 + sp2 * H * 0.11, bodyY - H * (sp2 % 2 ? 0.10 : 0.02), H * 0.028, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (pat === 'tusk' && fine) {
        ctx.strokeStyle = '#efe7d2'; ctx.lineWidth = H * 0.026;
        ctx.beginPath();
        ctx.moveTo(H * 0.60, bodyY - H * 0.24);
        ctx.quadraticCurveTo(H * 0.68, bodyY - H * 0.32, H * 0.62, bodyY - H * 0.42);
        ctx.stroke();
        ctx.strokeStyle = shade(col, -0.5); ctx.lineWidth = H * 0.03;   // 등 갈기
        for (var tk = -1; tk <= 1; tk++) {
          ctx.beginPath();
          ctx.moveTo(tk * H * 0.12, bodyY - H * 0.22);
          ctx.lineTo(tk * H * 0.12, bodyY - H * 0.34);
          ctx.stroke();
        }
      } else if (pat === 'ninetail') {
        ctx.strokeStyle = lite; ctx.lineWidth = H * 0.045;
        for (var nt = 0; nt < 4; nt++) {
          var sp3 = -0.30 - nt * 0.16;
          ctx.beginPath();
          ctx.moveTo(-H * 0.36, bodyY - H * 0.02);
          ctx.quadraticCurveTo(-H * (0.62 + nt * 0.05), bodyY + H * sp3,
            -H * (0.48 + nt * 0.10), bodyY + H * (sp3 - 0.16));
          ctx.stroke();
        }
      } else if (pat === 'mane' && fine) {
        ctx.fillStyle = shade(col, -0.32);
        ctx.beginPath();
        ctx.ellipse(H * 0.42, bodyY - H * 0.30, H * 0.24, H * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(H * 0.50, bodyY - H * 0.32, H * 0.16, H * 0.12, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = lite; ctx.fill();
        eye(ctx, H * 0.54, bodyY - H * 0.34, H * 0.026);
      } else if (pat === 'crescent' && fine) {
        ctx.beginPath();
        ctx.arc(H * 0.18, bodyY + H * 0.02, H * 0.13, Math.PI * 1.15, Math.PI * 1.85);
        ctx.strokeStyle = 'rgba(255,250,240,0.72)'; ctx.lineWidth = H * 0.04;
        ctx.stroke();
      } else if (pat === 'shaggy' && fine) {
        ctx.strokeStyle = shade(col, -0.22); ctx.lineWidth = H * 0.022;
        for (var sh2 = -3; sh2 <= 3; sh2++) {
          ctx.beginPath();
          ctx.moveTo(sh2 * H * 0.10, bodyY + H * 0.14);
          ctx.lineTo(sh2 * H * 0.10 - H * 0.03, bodyY + H * 0.26);
          ctx.stroke();
        }
      } else if (pat === 'bareface' && fine) {
        ctx.beginPath();
        ctx.ellipse(H * 0.54, bodyY - H * 0.31, H * 0.10, H * 0.085, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#e8b89a'; ctx.fill();
        eye(ctx, H * 0.56, bodyY - H * 0.34, H * 0.024);
      }
    }
    ctx.restore();
  }

  function leg2(ctx, ox, oy, angle, len) {
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + Math.sin(angle) * len * 0.35, oy + len);
    ctx.stroke();
  }

  /**
   * 짐승 눈 — 25종이 전부 이 함수를 쓴다.
   * 만화풍에서는 인물과 같은 눈 문법(흰자 + 큰 홍채 + 하이라이트 한 점)으로 그린다.
   * 안 그러면 인물만 큰 눈이 되어 동행·도감 화면에서 양식이 어긋난다.
   */
  function eye(ctx, x, y, r) {
    r = Math.max(0.6, r);
    if (styleMode !== 'anime') {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(25,22,22,0.85)';
      ctx.fill();
      return;
    }
    var R = r * 3.1;
    ctx.beginPath();                                 // 흰자
    ctx.ellipse(x, y, R * 0.86, R, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fbfcff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,24,26,0.7)';          // 윤곽 — 밝은 털에 묻히지 않게
    ctx.lineWidth = Math.max(0.5, R * 0.16);
    ctx.stroke();
    ctx.beginPath();                                 // 홍채
    ctx.ellipse(x, y + R * 0.10, R * 0.58, R * 0.68, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#221a1e';
    ctx.fill();
    ctx.beginPath();                                 // 하이라이트
    ctx.arc(x + R * 0.24, y - R * 0.32, Math.max(0.5, R * 0.20), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();
  }

  /* ── 건물 ─────────────────────────────────────────────── */

  /**
   * @param o {x, y, s, form, color, t, night}
   *          (x, y) 는 바닥 중앙. s=1 이면 높이 약 46px.
   */
  var ROOF = {
    hall: '#3f4a5c', barracks: '#5f3c3c', wall: '#6c6c76', market: '#7a4636',
    library: '#3c5450', stable: '#5a4530', farm: '#4a6b32', forge: '#4a4a54',
    beacon: '#6a6a74', shrine: '#8a3b32'
  };

  function building(ctx, o) {
    var H = 46 * (o.s || 1);
    var form = o.form || 'hall';
    var wood = '#7a5334', woodDark = '#5a3c26';
    var roof = o.color || ROOF[form] || '#3f4a5c', roofLite = shade(roof, 0.22), roofDark = shade(roof, -0.4);
    var wall = '#d9cdb4', wallDark = '#b8a98c';

    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.lineJoin = 'round';

    function tiledRoof(cx, cy, w, h) {          // 처마가 살짝 올라간 기와지붕
      ctx.beginPath();
      ctx.moveTo(cx - w, cy);
      ctx.quadraticCurveTo(cx - w * 0.55, cy + h * 0.14, cx - w * 0.30, cy - h * 0.62);
      ctx.lineTo(cx + w * 0.30, cy - h * 0.62);
      ctx.quadraticCurveTo(cx + w * 0.55, cy + h * 0.14, cx + w, cy);
      ctx.closePath();
      var g = ctx.createLinearGradient(0, cy - h, 0, cy);
      g.addColorStop(0, roofLite); g.addColorStop(1, roofDark);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = H * 0.02; ctx.stroke();
      // 기와 골
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = H * 0.012;
      for (var i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * w * 0.22, cy - h * 0.6);
        ctx.lineTo(cx + i * w * 0.30, cy - h * 0.02);
        ctx.stroke();
      }
      // 용마루 — 지붕 꼭대기의 밝은 선
      ctx.strokeStyle = shade(roof, 0.42); ctx.lineWidth = H * 0.026;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.30, cy - h * 0.62);
      ctx.lineTo(cx + w * 0.30, cy - h * 0.62);
      ctx.stroke();
      // 처마 밑 단청 — 붉은 띠에 푸른 점
      ctx.fillStyle = 'rgba(170,60,50,0.75)';
      ctx.fillRect(cx - w * 0.86, cy - h * 0.02, w * 1.72, H * 0.026);
      ctx.fillStyle = 'rgba(70,110,160,0.75)';
      for (var dc = -3; dc <= 3; dc++) {
        ctx.fillRect(cx + dc * w * 0.24 - H * 0.012, cy - h * 0.02, H * 0.024, H * 0.026);
      }
    }

    /** 기단 — 건물을 석축 위에 올려 놓으면 바닥에 박힌 느낌이 사라진다 */
    function stylobate(cx, cy, w) {
      ctx.beginPath();
      ctx.moveTo(cx - w * 1.10, cy);
      ctx.lineTo(cx + w * 1.10, cy);
      ctx.lineTo(cx + w * 1.00, cy - H * 0.075);
      ctx.lineTo(cx - w * 1.00, cy - H * 0.075);
      ctx.closePath();
      ctx.fillStyle = '#9b9689'; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = H * 0.01;
      ctx.stroke();
      // 계단
      ctx.fillStyle = '#b3aea0';
      ctx.fillRect(cx - w * 0.20, cy - H * 0.055, w * 0.40, H * 0.055);
    }

    function body(cx, cy, w, h) {               // 벽 + 기둥 + 문
      ctx.fillStyle = wall;
      ctx.fillRect(cx - w, cy - h, w * 2, h);
      ctx.fillStyle = wallDark;
      ctx.fillRect(cx - w, cy - h * 0.16, w * 2, h * 0.16);
      ctx.fillStyle = woodDark;
      ctx.fillRect(cx - w, cy - h, w * 0.13, h);
      ctx.fillRect(cx + w - w * 0.13, cy - h, w * 0.13, h);
      ctx.fillStyle = wood;
      ctx.fillRect(cx - w * 0.26, cy - h * 0.78, w * 0.52, h * 0.78);
      ctx.fillStyle = 'rgba(255,214,120,0.5)';
      ctx.fillRect(cx - w * 0.18, cy - h * 0.66, w * 0.36, h * 0.42);
      // 창호 격자 — 문에 세로 두 줄, 가로 한 줄
      ctx.strokeStyle = woodDark; ctx.lineWidth = H * 0.012;
      ctx.beginPath();
      ctx.moveTo(cx, cy - h * 0.78); ctx.lineTo(cx, cy);
      ctx.moveTo(cx - w * 0.26, cy - h * 0.40); ctx.lineTo(cx + w * 0.26, cy - h * 0.40);
      ctx.stroke();
      // 좌우 벽의 작은 창
      ctx.fillStyle = 'rgba(240,225,190,0.55)';
      ctx.fillRect(cx - w * 0.72, cy - h * 0.70, w * 0.24, h * 0.26);
      ctx.fillRect(cx + w * 0.48, cy - h * 0.70, w * 0.24, h * 0.26);
    }

    if (form === 'hall') {                       // 집무전 — 2층 기와 + 기단 + 현판
      stylobate(0, 0, H * 0.42);
      body(0, 0, H * 0.42, H * 0.42);
      // 현판 — 처마 아래 벽면에 걸린다
      ctx.fillStyle = '#2a2620';
      ctx.fillRect(-H * 0.13, -H * 0.37, H * 0.26, H * 0.075);
      ctx.fillStyle = '#d9b23c';
      ctx.fillRect(-H * 0.11, -H * 0.355, H * 0.22, H * 0.013);
      ctx.fillRect(-H * 0.11, -H * 0.322, H * 0.22, H * 0.013);
      tiledRoof(0, -H * 0.42, H * 0.56, H * 0.26);
      body(0, -H * 0.62, H * 0.30, H * 0.28);
      tiledRoof(0, -H * 0.90, H * 0.44, H * 0.24);
      ctx.fillStyle = '#d9b23c';
      ctx.fillRect(-H * 0.03, -H * 1.14, H * 0.06, H * 0.12);
    } else if (form === 'barracks') {            // 병영 — 낮은 건물 + 깃발
      body(0, 0, H * 0.44, H * 0.34);
      tiledRoof(0, -H * 0.34, H * 0.56, H * 0.22);
      flag(ctx, H * 0.34, -H * 0.52, H, o.t, '#c0453c');
      flag(ctx, -H * 0.34, -H * 0.52, H, (o.t || 0) + 400, '#c0453c');
    } else if (form === 'wall') {                // 성벽 — 톱니 성가퀴
      ctx.fillStyle = '#8f8f98';
      ctx.fillRect(-H * 0.52, -H * 0.46, H * 1.04, H * 0.46);
      ctx.fillStyle = '#a8a8b2';
      for (var w2 = -2; w2 <= 2; w2++) {
        ctx.fillRect(w2 * H * 0.22 - H * 0.08, -H * 0.60, H * 0.16, H * 0.16);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = H * 0.012;
      for (var r2 = 1; r2 <= 3; r2++) {
        ctx.beginPath();
        ctx.moveTo(-H * 0.52, -H * 0.46 + r2 * H * 0.11);
        ctx.lineTo(H * 0.52, -H * 0.46 + r2 * H * 0.11);
        ctx.stroke();
      }
    } else if (form === 'market') {              // 저잣거리 — 천막 + 좌판
      ctx.fillStyle = woodDark;
      ctx.fillRect(-H * 0.40, -H * 0.26, H * 0.80, H * 0.10);
      ctx.beginPath();
      ctx.moveTo(-H * 0.50, -H * 0.30);
      ctx.lineTo(H * 0.50, -H * 0.30);
      ctx.lineTo(H * 0.34, -H * 0.54);
      ctx.lineTo(-H * 0.34, -H * 0.54);
      ctx.closePath();
      ctx.fillStyle = '#c9563f'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = H * 0.02;
      ctx.beginPath();
      ctx.moveTo(-H * 0.12, -H * 0.30); ctx.lineTo(-H * 0.05, -H * 0.54);
      ctx.moveTo(H * 0.12, -H * 0.30); ctx.lineTo(H * 0.05, -H * 0.54);
      ctx.stroke();
      ctx.fillStyle = wood;
      ctx.fillRect(-H * 0.46, -H * 0.30, H * 0.05, H * 0.30);
      ctx.fillRect(H * 0.41, -H * 0.30, H * 0.05, H * 0.30);
    } else if (form === 'library') {             // 서고 — 낮고 긴 건물
      body(0, 0, H * 0.44, H * 0.30);
      tiledRoof(0, -H * 0.30, H * 0.54, H * 0.20);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(-H * 0.36, -H * 0.24, H * 0.14, H * 0.12);
      ctx.fillRect(H * 0.22, -H * 0.24, H * 0.14, H * 0.12);
    } else if (form === 'stable') {              // 마구간 — 개방형
      ctx.fillStyle = woodDark;
      ctx.fillRect(-H * 0.42, -H * 0.34, H * 0.84, H * 0.34);
      ctx.fillStyle = '#3b2c1f';
      ctx.fillRect(-H * 0.30, -H * 0.30, H * 0.24, H * 0.30);
      ctx.fillRect(H * 0.06, -H * 0.30, H * 0.24, H * 0.30);
      ctx.beginPath();
      ctx.moveTo(-H * 0.50, -H * 0.34);
      ctx.lineTo(H * 0.50, -H * 0.34);
      ctx.lineTo(H * 0.36, -H * 0.56);
      ctx.lineTo(-H * 0.36, -H * 0.56);
      ctx.closePath();
      ctx.fillStyle = '#6b5030'; ctx.fill();
    } else if (form === 'farm') {                // 둔전 — 이랑 + 허수아비
      ctx.fillStyle = '#4a6b32';
      ctx.beginPath();
      ctx.ellipse(0, -H * 0.06, H * 0.52, H * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6f9147'; ctx.lineWidth = H * 0.03;
      for (var f = -2; f <= 2; f++) {
        ctx.beginPath();
        ctx.moveTo(f * H * 0.18 - H * 0.06, -H * 0.02);
        ctx.lineTo(f * H * 0.18 + H * 0.02, -H * 0.22);
        ctx.stroke();
      }
      ctx.strokeStyle = wood; ctx.lineWidth = H * 0.035;
      ctx.beginPath();
      ctx.moveTo(0, -H * 0.10); ctx.lineTo(0, -H * 0.46);
      ctx.moveTo(-H * 0.14, -H * 0.34); ctx.lineTo(H * 0.14, -H * 0.34);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -H * 0.52, H * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = '#c9a24a'; ctx.fill();
    } else if (form === 'forge') {               // 대장간 — 화덕 + 연기
      body(0, 0, H * 0.34, H * 0.30);
      tiledRoof(0, -H * 0.30, H * 0.44, H * 0.18);
      ctx.fillStyle = '#5a5a64';
      ctx.fillRect(H * 0.20, -H * 0.62, H * 0.12, H * 0.32);
      var t = (o.t || 0) / 900;
      for (var sm = 0; sm < 3; sm++) {
        var k = (t + sm * 0.33) % 1;
        ctx.beginPath();
        ctx.arc(H * 0.26 + Math.sin(k * 6) * H * 0.05, -H * 0.66 - k * H * 0.34,
          H * (0.05 + k * 0.06), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200,200,210,' + (0.28 * (1 - k)) + ')';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, -H * 0.12, H * 0.09, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,150,60,0.85)'; ctx.fill();
    } else if (form === 'beacon') {              // 봉수대 — 돌탑 + 불
      ctx.fillStyle = '#8a8a94';
      ctx.beginPath();
      ctx.moveTo(-H * 0.26, 0);
      ctx.lineTo(H * 0.26, 0);
      ctx.lineTo(H * 0.17, -H * 0.62);
      ctx.lineTo(-H * 0.17, -H * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = H * 0.012;
      for (var b2 = 1; b2 <= 4; b2++) {
        ctx.beginPath();
        ctx.moveTo(-H * 0.26 + b2 * H * 0.02, -b2 * H * 0.14);
        ctx.lineTo(H * 0.26 - b2 * H * 0.02, -b2 * H * 0.14);
        ctx.stroke();
      }
      var fl = 1 + Math.sin((o.t || 0) / 130) * 0.18;
      ctx.beginPath();
      ctx.moveTo(-H * 0.13, -H * 0.62);
      ctx.quadraticCurveTo(-H * 0.05, -H * (0.62 + 0.30 * fl), 0, -H * (0.62 + 0.42 * fl));
      ctx.quadraticCurveTo(H * 0.05, -H * (0.62 + 0.30 * fl), H * 0.13, -H * 0.62);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,150,50,0.92)'; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-H * 0.06, -H * 0.62);
      ctx.quadraticCurveTo(0, -H * (0.62 + 0.26 * fl), H * 0.06, -H * 0.62);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,235,140,0.95)'; ctx.fill();
    } else if (form === 'shrine') {              // 사당 — 홍살문
      ctx.fillStyle = '#a33b32';
      ctx.fillRect(-H * 0.34, -H * 0.62, H * 0.08, H * 0.62);
      ctx.fillRect(H * 0.26, -H * 0.62, H * 0.08, H * 0.62);
      ctx.fillRect(-H * 0.44, -H * 0.70, H * 0.88, H * 0.08);
      ctx.fillRect(-H * 0.38, -H * 0.54, H * 0.76, H * 0.05);
      ctx.beginPath();
      ctx.moveTo(-H * 0.50, -H * 0.70);
      ctx.lineTo(H * 0.50, -H * 0.70);
      ctx.lineTo(H * 0.34, -H * 0.84);
      ctx.lineTo(-H * 0.34, -H * 0.84);
      ctx.closePath();
      ctx.fillStyle = '#2f3a4a'; ctx.fill();
    } else {
      body(0, 0, H * 0.38, H * 0.34);
      tiledRoof(0, -H * 0.34, H * 0.50, H * 0.20);
    }

    ctx.restore();
  }

  function flag(ctx, x, y, H, t, color) {
    ctx.strokeStyle = '#6b5030'; ctx.lineWidth = H * 0.02;
    ctx.beginPath();
    ctx.moveTo(x, y + H * 0.30); ctx.lineTo(x, y - H * 0.22);
    ctx.stroke();
    var wv = Math.sin((t || 0) / 240) * H * 0.03;
    ctx.beginPath();
    ctx.moveTo(x, y - H * 0.22);
    ctx.quadraticCurveTo(x + H * 0.10, y - H * 0.16 + wv, x + H * 0.20, y - H * 0.20);
    ctx.lineTo(x + H * 0.20, y - H * 0.05);
    ctx.quadraticCurveTo(x + H * 0.10, y - H * 0.02 + wv, x, y - H * 0.06);
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
  }


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

  /** 캐시에 한 컷을 굽는다 */
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

    var phase = pb === PHASES ? 0 : (pb + 0.5) * (TAU / PHASES);
    var walking = pb !== PHASES;
    var common = {
      x: footX, y: footY, s: sc, facing: 1, phase: phase,
      walking: walking, noBounce: true, t: 0
    };
    if (kind === 'human') {
      common.color = o.color; common.look = o.look; common.skin = o.skin;
      common.rarity = o.rarity || (o.ref && o.ref.rarity) || 0;
      human(c, common);
    } else {
      common.form = o.form; common.color = o.color; common.divine = o.divine;
      common.ref = o.ref;                      // 무늬는 ref 에서 뽑는다
      beast(c, common);
    }
    /* 그림책풍은 여기서 한 번 훑는다 — 지도 위 스탬프는 어두운 배경에 서므로
       실루엣만 밝은 테를 둘러 형태가 묻히지 않게 한다 */
    if (story()) { storyize(cv, { rim: STORY_RIM_MAP, inner: H >= 40, thick: 1 }); }
    else if (maple()) { storyize(cv, mapleOpts(H < 40)); }
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

  /* ── 그림책풍 후처리 (styleMode === 'story') ──────────────
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

    /* 색 처리 손잡이 — 그림책(story)과 메이플풍(maple)이 같은 훑기를 값만 달리 쓴다 */
    var sat = opts.sat === undefined ? 0.74 : opts.sat;
    var mulL = opts.mulL === undefined ? 0.90 : opts.mulL;
    var addL = opts.addL || [22, 20, 15];
    var step = opts.step || STORY_STEP;
    var edgeAt = opts.edgeAt || STORY_EDGE;

    var alp = new Uint8Array(n);
    for (i = 0; i < n; i++) {
      q = i * 4;
      var a = d[q + 3];
      alp[i] = a;
      if (!a) { continue; }
      var r = d[q], g = d[q + 1], b = d[q + 2];
      var y = 0.299 * r + 0.587 * g + 0.114 * b;
      r = y + (r - y) * sat;                     // 채도 (그림책은 낮추고, 메이플풍은 올린다)
      g = y + (g - y) * sat;
      b = y + (b - y) * sat;
      r = r * mulL + addL[0]; g = g * mulL + addL[1]; b = b * mulL + addL[2];
      r = Math.round(r / step) * step;                           // 계단
      g = Math.round(g / step) * step;
      b = Math.round(b / step) * step;
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
                   ((x + 1 < W && alp[i + 1] > 120 && diff(i, i + 1) > edgeAt) ||
                    (y2 + 1 < H && alp[i + W] > 120 && diff(i, i + W) > edgeAt))) {
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

  function story() { return styleMode === 'story'; }
  function maple() { return styleMode === 'maple'; }

  /**
   * 메이플풍 — 원작의 그림 문법을 옮긴 것이다(에셋은 가져오지 않는다).
   * 셋이 전부다: **채도를 올리고 · 색을 넓은 계단으로 눕히고 · 실루엣을 진하게 두른다.**
   * 그림책풍(storyize)과 같은 훑기를 값만 달리 쓴다 — 안쪽 선은 옅게 둬서
   * 플랫한 면이 살고, 실루엣만 굵게 둘러 밝은 배경에서도 형태가 또렷하다.
   */
  var MAPLE_LINE = [62, 50, 78];
  var MAPLE_RIM = [28, 24, 38];
  function mapleOpts(small) {
    /* 작은 그림에 안쪽 선까지 그으면 형태가 선에 먹혀 검은 덩어리가 된다 —
       storyize 가 지도 스탬프에서 겪은 그 함정이 여기서도 똑같이 난다. */
    return { sat: 1.4, mulL: 0.94, addL: [44, 42, 38], step: 32, edgeAt: 34,
             line: MAPLE_LINE, rim: MAPLE_RIM, inner: !small,
             thick: storyThick() };
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
    if (story()) {
      c.fillStyle = '#f2e7cf';
      c.fillRect(0, 0, size, size);
    } else if (maple()) {
      /* 원작풍도 바탕을 깐다 — 밝은 외피 위에 검은 실루엣만 뜨면 그림이 묻힌다 */
      c.fillStyle = '#eaf2ff';
      c.fillRect(0, 0, size, size);
    }

    if (kind === 'hero') {
      var f = global.DG.data.faction(ref.faction);
      human(c, {
        x: size * 0.5, y: size * 0.94, s: size / 46, facing: 1,
        phase: 0, walking: false, color: f.color, look: lookOf(ref),
        rarity: ref.rarity, t: 0
      });
    } else if (kind === 'pet') {
      beast(c, {
        x: size * 0.5, y: size * 0.9, s: size / 40, facing: 1,
        phase: 0, walking: false, form: beastFormOf(ref),
        color: beastColorOf(ref), divine: ref.kind === 'divine', ref: ref, t: 0
      });
    } else if (kind === 'building') {
      building(c, { x: size * 0.5, y: size * 0.95, s: size / 58, form: ref.key, color: ref.color, t: 0 });
    }
    if (story()) { storyize(cv); }
    else if (maple()) { storyize(cv, mapleOpts(size < 80)); }
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

    if (story()) {
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
    } else {
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
    }

    /* 인물 · 펫 — 그림책풍이면 **딴 캔버스에 그려 그것만** 후처리한 뒤 얹는다.
       (배경까지 같이 훑으면 문양·산의 윤곽이 인물을 가로지른다) */
    var fig = c, figCv = null;
    if (story()) {
      figCv = document.createElement('canvas');
      figCv.width = cv.width; figCv.height = cv.height;
      fig = figCv.getContext('2d');
      fig.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (isHero) {
      human(fig, {
        x: w * 0.5, y: h * 0.93, s: h / 56, facing: 1, phase: 0, walking: false,
        color: fac.color, look: lookOf(ref), rarity: ref.rarity, t: 0
      });
    } else {
      /* 짐승은 가로로 긴 형태(용·물고기)가 있어 폭 기준으로 맞춘다 (bake 상자 = 2.3H) */
      beast(fig, {
        x: w * 0.5, y: h * 0.80, s: h / 80, facing: 1, phase: 0, walking: false,
        form: beastFormOf(ref), color: beastColorOf(ref),
        divine: ref.kind === 'divine', ref: ref, t: 0
      });
    }
    if (figCv) {
      storyize(figCv, maple() ? mapleOpts(false) : {});
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);      // 이미 배율이 반영된 캔버스라 그대로 얹는다
      c.drawImage(figCv, 0, 0);
      c.restore();
    }

    /* 등급 테두리 */
    c.strokeStyle = rar.color;
    c.lineWidth = 2;
    c.strokeRect(1, 1, w - 2, h - 2);
    c.strokeStyle = story() ? 'rgba(107,83,58,0.45)' : 'rgba(255,255,255,0.18)';
    c.lineWidth = 1;
    c.strokeRect(4.5, 4.5, w - 9, h - 9);

    cardCache[key] = cv.toDataURL();
    return cardCache[key];
  }

  global.DG = global.DG || {};
  global.DG.sprite = {
    human: human, beast: beast, building: building,
    portraitCard: portraitCard,
    stamp: stamp, stampStats: stampStats,
    lookOf: lookOf, beastFormOf: beastFormOf, beastColorOf: beastColorOf,
    beastPatternOf: beastPatternOf,
    portrait: portrait, shade: shade,
    setProp: setProp,
    prop: function () { return propMode; },
    PROPS: PROPS,
    setStyle: setStyle,
    style: function () { return styleMode; }
  };
})(window);
