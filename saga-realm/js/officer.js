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
   *   camp   원정 나가 있는 진영 id (null 이면 성에 있다)
   */
  function rec(id) {
    var m = global.DG.rtk.state().officers;
    if (!m[id]) {
      m[id] = { force: null, city: null, loyal: 50, done: false, hurt: 0, feats: 0, camp: null };
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
   * **원정 나간 사람(`camp`)은 빠진다** — 성에 없는 사람이 내정을 하거나
   * 수비에 서면, 군대를 내보내고도 아무것도 잃지 않은 셈이 된다.
   * (봉급은 그대로 나간다 — `ofForce` 는 진중에 있는 사람도 센다)
   */
  function atCity(cityId, forceId) {
    var m = global.DG.rtk.state().officers, out = [], k;
    for (k in m) {
      if (!Object.prototype.hasOwnProperty.call(m, k)) { continue; }
      if (m[k].camp) { continue; }
      if (m[k].city !== cityId) { continue; }
      if (forceId === undefined ? false : (m[k].force !== forceId)) { continue; }
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
    STAT_KOR: STAT_KOR,
    mergeRoster: mergeRoster, all: all, find: find, isThree: isThree,
    rec: rec, has: has, placeAt: placeAt,
    atCity: atCity, freeAt: freeAt, ofForce: ofForce, sortByPower: sortByPower,
    stats: stats, power: power, skill: skill,
    loyalOf: loyalOf, addLoyal: addLoyal, baseLoyal: baseLoyal
  };
})(window);
