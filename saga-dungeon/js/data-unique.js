/**
 * 고유(固有) — 원작의 유니크 아이템
 * ===============================================================
 * 원작(디아블로2)에서 전설급은 **이름이 있다.** 윈드포스, 그리즈완디, 샤코…
 * 옵션이 무작위로 굴러 나오는 게 아니라 **정해진 물건**이고, 그래서 사람들이
 * 그 이름을 부르며 찾아다닌다. 이 판의 전설(傳說)은 여태 **접사가 네 개 굴러
 * 나온 물건**일 뿐이라, 주워도 "좋은 게 나왔다" 로 끝이었다.
 *
 * 이 판에서 정한 것
 *   · **전설(4) 등급에서만** 나온다. 그 밑감의 고유가 있을 때 40%
 *   · 접사는 **굴리지 않는다.** 표에 적힌 것이 그대로 붙는다 —
 *     그게 "정해진 물건" 이라는 뜻이다
 *   · 수치는 **수준(ilvl)을 탄다.** 안 그러면 제30층에서 주운 고유가
 *     제5층 것과 같아 버린다. 표의 값은 수준 20 기준이다
 *   · 이름은 **한자 이름 하나**로 부른다. 밑감 이름은 작게 뒤에 붙는다
 *   · 나올 때 **알린다** — 원작에서 유니크가 떨어지면 소리가 다르다
 *
 * 열둘을 두었다. 늘릴 때는 UNIQUES 에 한 줄 (밑감 하나에 하나씩).
 * 효과 모양은 접사(data-item.js AFFIXES)와 같다 — flat · pct · world.
 * 원소 피해·저항은 보석의 것과 같은 모양(eldmg·elres)을 쓴다.
 */
(function (global) {
  'use strict';

  /** 전설이 나왔을 때 그 밑감의 고유가 될 확률 */
  var UNIQUE_CHANCE = 0.40;

  /** 표의 수치가 기준으로 삼는 수준 */
  var BASE_ILVL = 20;

  /**
   * key   세이브에 남는 이름 (바꾸면 옛 세이브의 고유가 이름을 잃는다)
   * base  밑감 (data-item.js BASES 의 키)
   * eff   붙는 것 — 접사와 같은 모양. scale:false 면 수준을 안 탄다(%는 대개 안 탄다)
   */
  var UNIQUES = [
    /* ── 무기 ────────────────────────────────────────────── */
    { key: 'u_ssanggeom', base: 'w_hwando', name: '쌍룡도(雙龍刀)',
      desc: '두 마리 용이 새겨진 환도. 쥔 손이 뜨거워진다.',
      eff: [{ kind: 'flat', stat: 'might', v: 22 },
            { kind: 'eldmg', el: 'fire', v: 14 },
            { kind: 'world', eff: 'critPct', v: 9, scale: false }] },
    { key: 'u_byeoksan', base: 'w_pyeongon', name: '벽산편(劈山鞭)',
      desc: '산을 쪼갠다는 편곤. 무겁고, 무겁게 든다.',
      eff: [{ kind: 'flat', stat: 'might', v: 28 },
            { kind: 'pct', stat: 'might', v: 12, scale: false }] },
    { key: 'u_cheonjigang', base: 'w_changj', name: '천지창(天地槍)',
      desc: '하늘과 땅을 꿰는 창. 끝이 보이지 않는다.',
      eff: [{ kind: 'flat', stat: 'might', v: 24 },
            { kind: 'eldmg', el: 'lit', v: 16 },
            { kind: 'world', eff: 'atkPct', v: 8, scale: false }] },
    { key: 'u_cheongryong', base: 'w_wolto', name: '청룡언월도(靑龍偃月刀)',
      desc: '이름만으로 무게가 실리는 월도.',
      eff: [{ kind: 'flat', stat: 'might', v: 34 },
            { kind: 'flat', stat: 'command', v: 14 },
            { kind: 'world', eff: 'atkPct', v: 12, scale: false }] },
    { key: 'u_manbal', base: 'w_gakgung', name: '만발궁(萬發弓)',
      desc: '쏘아도 쏘아도 화살이 남는다는 각궁.',
      eff: [{ kind: 'flat', stat: 'might', v: 18 },
            { kind: 'eldmg', el: 'cold', v: 12 },
            { kind: 'world', eff: 'critPct', v: 12, scale: false }] },
    { key: 'u_gwiseon', base: 'w_bugae', name: '귀선부(鬼仙斧)',
      desc: '귀신이 벼렸다는 부월. 날이 검다.',
      eff: [{ kind: 'flat', stat: 'might', v: 26 },
            { kind: 'eldmg', el: 'pois', v: 18 }] },
    { key: 'u_baekhak', base: 'w_seonchae', name: '백학선(白鶴扇)',
      desc: '흰 학이 그려진 부채. 부치면 바람이 차다.',
      eff: [{ kind: 'flat', stat: 'wisdom', v: 26 },
            { kind: 'eldmg', el: 'cold', v: 16 },
            { kind: 'world', eff: 'expPct', v: 15, scale: false }] },
    { key: 'u_jukjang', base: 'w_jukjang', name: '녹죽장(綠竹杖)',
      desc: '푸른 대로 만든 지팡이. 짚으면 기가 돈다.',
      eff: [{ kind: 'flat', stat: 'wisdom', v: 22 },
            { kind: 'eldmg', el: 'chi', v: 18 },
            { kind: 'world', eff: 'findPct', v: 20, scale: false }] },
    { key: 'u_iljabul', base: 'w_bilbut', name: '일자필(一字筆)',
      desc: '한 글자로 사람을 움직였다는 붓.',
      eff: [{ kind: 'flat', stat: 'wisdom', v: 20 },
            { kind: 'pct', stat: 'wisdom', v: 14, scale: false }] },
    { key: 'u_yukdo', base: 'w_byeongseo', name: '육도삼략(六韜三略)',
      desc: '병법의 뿌리. 읽은 자가 곧 장수가 된다.',
      eff: [{ kind: 'flat', stat: 'command', v: 24 },
            { kind: 'pct', stat: 'all', v: 7, scale: false },
            { kind: 'world', eff: 'lootPct', v: 14, scale: false }] },

    /* ── 갑주 ────────────────────────────────────────────── */
    { key: 'u_geumsoe', base: 'w_dummy_none', name: '(자리 비움)', hidden: true, eff: [] },
    { key: 'u_dujeong', base: 'a_dujeong', name: '흑린두정(黑鱗頭釘)',
      desc: '검은 비늘을 박은 두정갑. 화살이 튕긴다.',
      eff: [{ kind: 'flat', stat: 'command', v: 26 },
            { kind: 'elres', el: 'fire', v: 20, scale: false },
            { kind: 'elres', el: 'cold', v: 20, scale: false },
            { kind: 'world', eff: 'hpPct', v: 10, scale: false }] },
    { key: 'u_chalgap', base: 'a_chalgap', name: '만인갑(萬人甲)',
      desc: '만 사람을 막아 냈다는 찰갑.',
      eff: [{ kind: 'flat', stat: 'command', v: 22 },
            { kind: 'flat', stat: 'might', v: 14 },
            { kind: 'world', eff: 'hpPct', v: 14, scale: false }] },
    { key: 'u_dopo', base: 'a_dopo', name: '학창의(鶴氅衣)',
      desc: '학의 깃으로 지은 도포. 걸치면 걸음이 가볍다.',
      eff: [{ kind: 'flat', stat: 'wisdom', v: 24 },
            { kind: 'elres', el: 'chi', v: 25, scale: false },
            { kind: 'world', eff: 'expPct', v: 18, scale: false }] },
    { key: 'u_cheollip', base: 'a_cheollip', name: '흑철립(黑鐵笠)',
      desc: '검은 무쇠로 만든 삿갓. 그늘이 짙다.',
      eff: [{ kind: 'flat', stat: 'might', v: 18 },
            { kind: 'elres', el: 'lit', v: 25, scale: false },
            { kind: 'world', eff: 'findPct', v: 16, scale: false }] },

    /* ── 부적 ────────────────────────────────────────────── */
    { key: 'u_hopae', base: 'c_hopae', name: '어사호패(御史號牌)',
      desc: '암행어사의 호패. 내보이면 길이 열린다.',
      eff: [{ kind: 'flat', stat: 'all', v: 10 },
            { kind: 'world', eff: 'goldPct', v: 35, scale: false }] },
    { key: 'u_okgae', base: 'c_okgae', name: '월하옥지(月下玉指)',
      desc: '달빛에 비추면 속이 비치는 옥가락지.',
      eff: [{ kind: 'pct', stat: 'all', v: 9, scale: false },
            { kind: 'world', eff: 'findPct', v: 28, scale: false }] },
    { key: 'u_dokkaebi', base: 'c_dokkaebi', name: '도깨비방울(鬼鈴)',
      desc: '흔들면 도깨비가 웃는다. 웃을 때마다 뭔가 떨어진다.',
      eff: [{ kind: 'flat', stat: 'might', v: 16 },
            { kind: 'world', eff: 'lootPct', v: 26, scale: false },
            { kind: 'world', eff: 'goldPct', v: 20, scale: false }] },
    { key: 'u_gyeong', base: 'c_gyeong', name: '조요경(照妖鏡)',
      desc: '요괴를 비추는 청동경. 비친 것은 숨지 못한다.',
      eff: [{ kind: 'flat', stat: 'command', v: 18 },
            { kind: 'elres', el: 'pois', v: 25, scale: false },
            { kind: 'world', eff: 'critPct', v: 8, scale: false }] }
  ].filter(function (u) { return !u.hidden; });

  function uniqueByKey(k) {
    for (var i = 0; i < UNIQUES.length; i++) { if (UNIQUES[i].key === k) { return UNIQUES[i]; } }
    return null;
  }

  /** 이 밑감에 딸린 고유 (없으면 null) */
  function uniqueOfBase(baseKey) {
    for (var i = 0; i < UNIQUES.length; i++) {
      if (UNIQUES[i].base === baseKey) { return UNIQUES[i]; }
    }
    return null;
  }

  /**
   * 수준에 맞춘 효과 목록.
   * flat 은 수준을 타고, % 는 안 탄다 — %가 수준을 타면 깊은 층에서 걷잡을 수 없다.
   */
  function effectsAt(u, ilvl) {
    var mul = 1 + ((ilvl || BASE_ILVL) - BASE_ILVL) * 0.035;
    if (mul < 0.45) { mul = 0.45; }
    return u.eff.map(function (e) {
      var scale = e.scale !== false && (e.kind === 'flat' || e.kind === 'eldmg');
      return {
        kind: e.kind, stat: e.stat, eff: e.eff, el: e.el,
        v: Math.max(1, Math.round(e.v * (scale ? mul : 1)))
      };
    });
  }

  global.DG = global.DG || {};
  global.DG.uniqueData = {
    UNIQUES: UNIQUES, UNIQUE_CHANCE: UNIQUE_CHANCE, BASE_ILVL: BASE_ILVL,
    uniqueByKey: uniqueByKey, uniqueOfBase: uniqueOfBase, effectsAt: effectsAt
  };
})(window);
