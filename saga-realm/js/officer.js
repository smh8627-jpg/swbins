/**
 * 삼국지 — 무장(武將)
 * ---------------------------------------------------------------
 * 무장 명부는 두 곳에서 온다.
 *
 *   data.js       인물 70 (삼국지 22 · 한국사 26 · 유럽사 22) — **다섯 판이 나눠 가진 복사본**
 *   data-force.js 무장 54 (삼국지 군주와 부하)               — 이 판만의 것
 *
 * `data.js` 는 다섯 벌이 바이트까지 같다. 그래서 **파일을 고치지 않고**,
 * 부팅 때 이 파일이 54인을 `DG.data.heroes` 에 얹는다.
 * 그러면 `data.find` · `hero.stats` · `sprite.portrait` · 도감이 손대지 않고 그대로 돈다.
 * (data.find 는 배열을 그때그때 훑는다 — 미리 만든 색인이 아니라서 얹기만 하면 된다)
 *
 * 삼국지 사람이 아닌 인물(한국사·유럽사 48)은 **재야(在野)** 다. 어느 세력에도 없고
 * 도시에 흩어져 있다 — 수색으로 찾아 등용한다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var data = global.DG.data;
  var FD = global.DG.forceData;

  /* ── 명부 합치기 (부팅 때 한 번) ────────────────────────── */

  var merged = false;

  function mergeRoster() {
    if (merged) { return data.heroes.length; }
    for (var i = 0; i < FD.OFFICERS.length; i++) {
      var o = FD.OFFICERS[i];
      if (!data.find(o.id)) { data.heroes.push(o); }
    }
    /* 한국 지역 수비 무장(2026-09-03) — 같은 방식으로 얹는다.
       FD.roster()는 안 훑으므로 어느 세력에도 자동 배분되지 않는다 */
    var kr = FD.KOREA_OFFICERS || [];
    for (var k = 0; k < kr.length; k++) {
      if (!data.find(kr[k].id)) { data.heroes.push(kr[k]); }
    }
    merged = true;
    return data.heroes.length;
  }
  mergeRoster();

  /** 무장 전체 (펫은 빠진다 — data.heroes 는 인물만 담는다) */
  function all() { return data.heroes; }

  function find(id) {
    var h = data.find(id);
    return h && h.stats ? h : null;
  }

  /** 삼국지 사람인가 — 아니면 재야로 흩어 놓는다 */
  function isThree(id) {
    var h = find(id);
    return !!h && h.era === '삼국지';
  }

  /* ── 세이브의 무장 기록 ──────────────────────────────── */

  /**
   * save.rtk.officers[id] = { force, city, loyal, done, hurt, feats }
   *   force  소속 세력 id (null 이면 재야)
   *   city   지금 있는 도시
   *   loyal  충성 0~100 (재야는 뜻이 없다)
   *   done   이 달에 명령을 이미 썼는가
   *   hurt   부상 — 남은 달 수 (0 이면 성하다)
   *   feats  세운 공 (승진·상 판단에 쓴다)
   *   camp   **진(陣)을 치고 있는가** — 포위가 안 떨어져 성 밖에 머무는 진영 id
   *          (null 이면 성에 있다. UI 문구는 "진 치는 중")
   *   journey  **원정 가는 중인가** — 여러 달에 걸쳐 먼 성으로 실시간 이동하는
   *          중인 원정 id (null 이면 성에 있다. 2026-09-04, UI 문구는 "원정 중"
   *          — camp 와 이름이 헷갈리지 않게 필드부터 갈랐다)
   */
  function rec(id) {
    var m = global.DG.rtk.state().officers;
    if (!m[id]) {
      m[id] = { force: null, city: null, loyal: 50, done: false, hurt: 0, feats: 0,
        camp: null, journey: null };
    }
    return m[id];
  }

  function has(id) {
    var m = global.DG.rtk.state().officers;
    return Object.prototype.hasOwnProperty.call(m, id);
  }

  /** 무장을 도시에 놓는다 (force=null 이면 재야로) */
  function placeAt(id, cityId, forceId) {
    var r = rec(id);
    r.city = cityId;
    r.force = forceId || null;
    if (forceId && !r.loyal) { r.loyal = 50; }
    return r;
  }

  /**
   * 그 도시에 있는, 그 세력 소속 무장.
   * **진을 치고 있거나(`camp`) 원정 가는 중인(`journey`) 사람은 빠진다** —
   * 성에 없는 사람이 내정을 하거나 수비에 서면, 군대를 내보내고도 아무것도
   * 잃지 않은 셈이 된다. (봉급은 그대로 나간다 — `ofForce` 는 진중·원정 중인
   * 사람도 센다)
   */
  function atCity(cityId, forceId) {
    var m = global.DG.rtk.state().officers, out = [], k;
    for (k in m) {
      if (!Object.prototype.hasOwnProperty.call(m, k)) { continue; }
      if (m[k].camp) { continue; }
      if (m[k].journey) { continue; }
      if (m[k].city !== cityId) { continue; }
      if (forceId === undefined ? false : (m[k].force !== forceId)) { continue; }
      /* forceId 로 null 을 준다는 건 "주인 없는 성의 수비대"를 찾는 것이다
         (한국 지역, 2026-09-03). 그 성에 우연히 흩어져 있을 뿐인 숨은 재야
         (`found:false`)까지 수비군으로 끌려 들어오면 안 된다 — 숨은 사람은
         나서지 않는다. 기존 30성은 force:null 인 적이 없어 이 줄이 지금까지의
         어떤 호출도 안 바꾼다 */
      if (forceId === null && !m[k].found) { continue; }
      var h = find(k);
      if (h) { out.push(h); }
    }
    return sortByPower(out);
  }

  /** 그 도시의 재야 — **찾아낸 사람만** 보인다(수색 전에는 있는 줄도 모른다) */
  function freeAt(cityId, foundOnly) {
    var m = global.DG.rtk.state().officers, out = [], k;
    for (k in m) {
      if (!Object.prototype.hasOwnProperty.call(m, k)) { continue; }
      if (m[k].force || m[k].city !== cityId) { continue; }
      if (foundOnly && !m[k].found) { continue; }
      var h = find(k);
      if (h) { out.push(h); }
    }
    return sortByPower(out);
  }

  function ofForce(forceId) {
    var m = global.DG.rtk.state().officers, out = [], k;
    for (k in m) {
      if (!Object.prototype.hasOwnProperty.call(m, k)) { continue; }
      if (m[k].force !== forceId) { continue; }
      var h = find(k);
      if (h) { out.push(h); }
    }
    return sortByPower(out);
  }

  function sortByPower(list) {
    return list.sort(function (a, b) {
      return power(b.id) - power(a.id) || a.name.localeCompare(b.name, 'ko');
    });
  }

  /* ── 능력치 ───────────────────────────────────────────── */

  /** 최종 능력치 — hero.js 한 곳만 쓴다(화면과 판정이 갈라지지 않게) */
  function stats(id) { return global.DG.hero.stats(id); }

  function power(id) {
    var s = stats(id);
    return s.might + s.wisdom + s.command;
  }

  /** 이 무장이 그 일을 얼마나 잘하는가 (0~1 남짓) — 내정·전투가 같이 쓴다 */
  function skill(id, statKey) {
    var s = stats(id);
    return (s[statKey] || 0) / 100;
  }

  /* ── 성장 (經驗과 昇進) ────────────────────────────────
   * 능력치는 `hero.stats(id)` **한 곳**에서 나온다. 여기서 하는 일은
   * 그 함수가 읽는 `save.heroes[id]` 의 lv·rank 를 올려 주는 것뿐이다 —
   * 성장한 무장이 실제로 더 세게 싸우는 것은 `war.armyPower` 가 같은
   * `off.stats()` 를 읽기 때문이지, 전투에 따로 붙인 보정이 아니다.
   *
   * **`hero.gainExp` 를 쓰지 않는다.** 그쪽은 `save.dex.heroes[id]`(도감에서
   * 뽑은 인물)만 올려 주는데, 이 판에는 뽑기도 도감 획득도 없어 언제나 0 을 준다.
   * 같은 까닭으로 승진도 `hero.rankUp`(중복 인물 소모)이 아니라 **공(feats)** 으로 한다.
   */

  /* 무엇을 하면 얼마나 느는가. 120개월을 굴리면 무장이 Lv.8~12 언저리에 선다 —
     ×1.15~1.24 다. 이보다 후하게 주면 늦게 시작한 세력이 영영 못 따라잡는다 */
  var EXP = {
    order: 4,     // 내정 명령 하나
    march: 12,    // 출진에 따라나섰다
    siege: 8,     // 진을 치고 한 달을 더 버텼다
    win: 20,      // 성을 떨어뜨렸다
    duel: 15,     // 일기토에서 이겼다
    gov: 2        // 태수로 한 달을 앉아 있었다
  };

  function grow(id) {
    var m = core.save.heroes;
    if (!m[id]) { m[id] = { lv: 1, exp: 0, rank: 0 }; }
    return m[id];
  }

  /** 경험을 준다 — 레벨이 오르면 hero.stats 가 그만큼 곱해진다 */
  function gainExp(id, amount) {
    var H = global.DG.hero;
    amount = Math.max(0, Math.round(amount || 0));
    if (!amount || !find(id)) { return { gained: 0, levels: 0 }; }
    var g = grow(id);
    if (g.lv >= H.MAX_LV) { g.exp = 0; return { gained: 0, levels: 0 }; }
    g.exp += amount;
    var levels = 0, need = H.expNeed(g.lv);
    while (g.exp >= need && g.lv < H.MAX_LV) {
      g.exp -= need; g.lv += 1; levels++;
      need = H.expNeed(g.lv);
    }
    if (g.lv >= H.MAX_LV) { g.exp = 0; }
    if (levels) {
      var r = rec(id);
      /* 남의 무장이 크는 것까지 알릴 것은 없다 — 기록이 그것으로 덮인다 */
      if (r.force && r.force === global.DG.rtk.me()) {
        core.log('📈 ' + find(id).name + ' 이(가) Lv.' + g.lv + ' 이 되었다', 'level');
      }
      core.emit('rtk:grew', { id: id, lv: g.lv, levels: levels });
    }
    return { gained: amount, levels: levels };
  }

  /** 여럿에게 한꺼번에 */
  function gainExpAll(ids, amount) {
    var n = 0;
    for (var i = 0; i < (ids || []).length; i++) { n += gainExp(ids[i], amount).levels; }
    return n;
  }

  /** 승진에 드는 공과 금 — 올라갈수록 가파르다 */
  function promoteCost(rank) {
    return { feats: 20 + rank * 20, gold: 300 + rank * 300 };
  }

  var RANK_KOR = ['무관(無官)', '교위(校尉)', '중랑장(中郞將)', '장군(將軍)',
                  '대장군(大將軍)', '도독(都督)'];

  function rankName(id) { return RANK_KOR[grow(id).rank] || RANK_KOR[0]; }

  function promoteCheck(id) {
    var H = global.DG.hero, R = global.DG.rtk;
    var h = find(id);
    if (!h) { return { ok: false, why: '없는 무장입니다' }; }
    var r = rec(id);
    if (!r.force) { return { ok: false, why: '재야입니다' }; }
    var g = grow(id);
    if (g.rank >= H.MAX_RANK) { return { ok: false, why: '더 올릴 자리가 없습니다' }; }
    var c = promoteCost(g.rank);
    var f = R.force(r.force);
    if (r.feats < c.feats) { return { ok: false, why: '공이 모자랍니다 (' + r.feats + '/' + c.feats + ')', cost: c }; }
    if (!f || f.gold < c.gold) { return { ok: false, why: '금이 모자랍니다 (' + c.gold + ')', cost: c }; }
    return { ok: true, cost: c };
  }

  /**
   * 승진 — 쌓인 공과 금으로 관직을 올린다.
   * 능력치가 오르고(hero.growMul 의 rank 축), **충성이 크게 오른다** —
   * 원작에서 관직이 사람을 붙들어 두는 힘이 그것이다.
   */
  function promote(id) {
    var chk = promoteCheck(id);
    if (!chk.ok) { return chk; }
    var r = rec(id), g = grow(id);
    var f = global.DG.rtk.force(r.force);
    r.feats -= chk.cost.feats;
    f.gold -= chk.cost.gold;
    g.rank += 1;
    addLoyal(id, 12);
    core.log('✨ ' + find(id).name + ' 을(를) ' + rankName(id) + ' 로 올렸다 — 충성 ' +
      rec(id).loyal, 'good');
    core.emit('rtk:promote', { id: id, rank: g.rank });
    core.emit('changed');
    core.persist();
    return { ok: true, rank: g.rank, name: rankName(id), loyal: rec(id).loyal };
  }

  /* ── 충성 ─────────────────────────────────────────────── */

  var STAT_KOR = { might: '무력', wisdom: '지력', command: '통솔' };

  function loyalOf(id) { return rec(id).loyal; }

  function addLoyal(id, n) {
    var r = rec(id);
    r.loyal = core.clamp(Math.round(r.loyal + n), 0, 100);
    return r.loyal;
  }

  /**
   * 군주와의 인연 — 충성의 바닥값이다.
   * 같은 세력의 군주와 **성향(trait)** 이 같으면 잘 붙어 있고, 등급이 높을수록 콧대가 세다.
   * 이 값이 없으면 강한 무장일수록 잘 붙어 있게 되어 이탈이 영영 안 난다.
   */
  function baseLoyal(id, forceId) {
    var h = find(id);
    var f = FD.force(forceId);
    if (!h || !f) { return 50; }
    var lord = find(f.lord);
    var v = 52;
    if (lord && lord.trait === h.trait) { v += 12; }
    v -= (h.rarity - 3) * 6;                       // 귀한 사람일수록 붙들기 어렵다
    if (h.era !== '삼국지') { v -= 4; }             // 재야에서 온 이방인
    return core.clamp(v, 25, 85);
  }

  global.DG = global.DG || {};
  global.DG.off = {
    STAT_KOR: STAT_KOR, EXP: EXP, RANK_KOR: RANK_KOR,
    grow: grow, gainExp: gainExp, gainExpAll: gainExpAll,
    promoteCost: promoteCost, promoteCheck: promoteCheck, promote: promote,
    rankName: rankName,
    mergeRoster: mergeRoster, all: all, find: find, isThree: isThree,
    rec: rec, has: has, placeAt: placeAt,
    atCity: atCity, freeAt: freeAt, ofForce: ofForce, sortByPower: sortByPower,
    stats: stats, power: power, skill: skill,
    loyalOf: loyalOf, addLoyal: addLoyal, baseLoyal: baseLoyal
  };
})(window);
