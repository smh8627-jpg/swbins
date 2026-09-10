/**
 * 삼국지 — 무장(武將)
 * ---------------------------------------------------------------
 * 무장 명부는 두 곳에서 온다.
 *
 *   data.js       인물 105 (삼국지 22 · 한국사 26 · 일본사 20 · 세계사 37) — **다섯 판이 나눠 가진 복사본**
 *                 (2026-09-10 — 일본사·세계사는 HEROES 가명화 후속으로 늘었다. 이 숫자는
 *                 앞으로도 또 늘 수 있어 코드에서는 절대 이 수를 못 박지 않는다 — 아래
 *                 mergeRoster()·_test.html 은 전부 DG.data.heroes.length 를 그때그때 잰다)
 *   data-force.js 무장 54 (삼국지 군주와 부하)               — 이 판만의 것
 *
 * `data.js` 는 다섯 벌이 바이트까지 같다. 그래서 **파일을 고치지 않고**,
 * 부팅 때 이 파일이 54인을 `DG.data.heroes` 에 얹는다.
 * 그러면 `data.find` · `hero.stats` · `sprite.portrait` · 도감이 손대지 않고 그대로 돈다.
 * (data.find 는 배열을 그때그때 훑는다 — 미리 만든 색인이 아니라서 얹기만 하면 된다)
 *
 * 삼국지 사람이 아닌 인물(한국사·일본사·세계사, data.js 쪽 83)은 **재야(在野)** 다. 어느 세력에도 없고
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
    /* 일본 지역 수비 무장(2026-09-09) — 같은 방식으로 얹는다 */
    var jp = FD.JAPAN_OFFICERS || [];
    for (var jj = 0; jj < jp.length; jj++) {
      if (!data.find(jp[jj].id)) { data.heroes.push(jp[jj]); }
    }
    /* 교주 지역 수비 무장(2026-09-09, 셋째 확장) — 같은 방식으로 얹는다 */
    var jz = FD.JIAOZHOU_OFFICERS || [];
    for (var zz = 0; zz < jz.length; zz++) {
      if (!data.find(jz[zz].id)) { data.heroes.push(jz[zz]); }
    }
    /* 서역 지역 수비 무장(2026-09-09, 넷째 확장) — 같은 방식으로 얹는다 */
    var xy = FD.XIYU_OFFICERS || [];
    for (var xx = 0; xx < xy.length; xx++) {
      if (!data.find(xy[xx].id)) { data.heroes.push(xy[xx]); }
    }
    /* 남중 지역 수비 무장(2026-09-09, 다섯째 확장) — 같은 방식으로 얹는다 */
    var nz = FD.NANZHONG_OFFICERS || [];
    for (var nn = 0; nn < nz.length; nn++) {
      if (!data.find(nz[nn].id)) { data.heroes.push(nz[nn]); }
    }
    /* 천축 지역 수비 무장(2026-09-10, 여섯째 확장) — 같은 방식으로 얹는다 */
    var tz = FD.TIANZHU_OFFICERS || [];
    for (var tt = 0; tt < tz.length; tt++) {
      if (!data.find(tz[tt].id)) { data.heroes.push(tz[tt]); }
    }
    /* 막북 지역 수비 무장(2026-09-10, 일곱째 확장) — 같은 방식으로 얹는다 */
    var mb = FD.MOBEI_OFFICERS || [];
    for (var mm = 0; mm < mb.length; mm++) {
      if (!data.find(mb[mm].id)) { data.heroes.push(mb[mm]); }
    }
    /* 임읍 지역 수비 무장(2026-09-10, 여덟째 확장) — 같은 방식으로 얹는다 */
    var ly = FD.LINYI_OFFICERS || [];
    for (var ll = 0; ll < ly.length; ll++) {
      if (!data.find(ly[ll].id)) { data.heroes.push(ly[ll]); }
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
   *   item   **지니고 있는 보물 id**(2026-09-09, data-item.js) — 한 번에 하나만
   *          지닌다(장비창 없음, v1). null 이면 맨몸.
   *   dead   **노환으로 별세했는가**(2026-09-10, 아래 "나이" 절). true 면
   *          `atCity`/`freeAt`/`ofForce` 어디에도 안 잡힌다.
   */
  function rec(id) {
    var m = global.DG.rtk.state().officers;
    if (!m[id]) {
      m[id] = { force: null, city: null, loyal: 50, done: false, hurt: 0, feats: 0,
        camp: null, journey: null, item: null, dead: false };
    }
    return m[id];
  }

  /** 보물을 씌운다(이미 있으면 갈아 낀다) — 장비창이 없어 하나만 지닌다 */
  function equip(id, itemId) { rec(id).item = itemId; return rec(id); }

  /** 보물을 벗긴다 */
  function unequip(id) { rec(id).item = null; }

  function has(id) {
    var m = global.DG.rtk.state().officers;
    return Object.prototype.hasOwnProperty.call(m, id);
  }

  /** 이 사람이 어느 세력의 군주인가 — `rec()`(없으면 만든다)이 아니라
   *  기록을 있는 그대로만 본다. 도감 등 아직 세이브에 안 얹힌 인물을
   *  `stats()`로 물어도 새 기록을 만들지 않게 하려는 것이다. */
  function isLordId(id) {
    var m = global.DG.rtk.state().officers, r = m[id];
    if (!r || !r.force) { return false; }
    var f = FD.force(r.force);
    return !!f && f.lord === id;
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
      if (m[k].dead) { continue; }
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
      if (m[k].dead) { continue; }
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
      if (m[k].dead) { continue; }
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

  /**
   * 최종 능력치 — hero.js 한 곳만 쓴다(화면과 판정이 갈라지지 않게).
   * **보물 보정은 여기서 얹지 않는다** — hero.js(다섯 판 공유 파일)가 이미
   * `global.DG.item.statBonus(id)` 라는 전용 자리를 갖고 있다(장비 % · flat
   * 층, `gearOf()`). `data-item.js`가 그 자리에 이 판의 "보물"을 꽂았다 —
   * 계산이 두 곳으로 갈라지면 화면과 판정이 어긋난다는 hero.js 머리말 경고를
   * 그대로 따른 것.
   */
  function stats(id) {
    var s = global.DG.hero.stats(id);
    if (isLordId(id)) { return s; }   // 군주는 나이 축 전체에서 빠진다(늙지도 죽지도 않는다)
    var mul = agingMul(age(id));
    if (mul >= 1) { return s; }
    return {
      might: Math.max(1, Math.round(s.might * mul)),
      wisdom: Math.max(1, Math.round(s.wisdom * mul)),
      command: Math.max(1, Math.round(s.command * mul))
    };
  }

  function power(id) {
    var s = stats(id);
    return s.might + s.wisdom + s.command;
  }

  /** 이 무장이 그 일을 얼마나 잘하는가 (0~1 남짓) — 내정·전투가 같이 쓴다 */
  function skill(id, statKey) {
    var s = stats(id);
    return (s[statKey] || 0) / 100;
  }

  /* ── 나이 · 노쇠 · 죽음 (2026-09-10, README "다음에 채울 것" 마지막 항목) ──
   * 원작에서는 무장이 늙고 죽는다. 실제 생년을 조사해 넣는 대신(명부
   * 231인 다수가 이 판이 새로 지어낸 가명 인물이라 애초에 "실제 생년"이
   * 없다) id 문자열을 해시해 **결정적** 생년을 만든다 — `realm3d.js`의
   * `hashOf`(재야 결정적 산포에 쓰는 것)와 같은 결이다. 세이브에 생년을
   * 따로 적지 않아도 늘 같은 값이 나오고, 시나리오(194/200/208)를 바꿔도
   * 그 사람의 생년 자체는 안 바뀐다 — 다만 시작 연도가 늦을수록 다들
   * 그만큼 나이 들어 시작한다(자연스럽다).
   *
   * `hero.js`(다섯 판 공유 파일)의 능력치 계산은 한 줄도 안 건드렸다 —
   * 노쇠 배율은 **`stats()` 한 곳**(위)에서 그 결과 위에 곱해진다. 무장
   * 성장(레벨·관직)이 같은 자리를 거치는 것과 같은 이유다.
   */
  function birthHash(id) {
    var s = String(id || ''), h = 0, i;
    for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return h;
  }
  /** 130~178년 사이로 흩는다 — 가장 이른 시나리오(194년)에도 누구나
   *  최소 16세는 되도록 잡은 바닥이다. */
  function birthYear(id) { return 130 + (birthHash(id) % 49); }
  function age(id) {
    return Math.max(0, global.DG.rtk.state().year - birthYear(id));
  }
  /** 60세부터 능력치가 서서히 준다 — 90세(30년 초과)에서 0.55배로 바닥진다 */
  function agingMul(a) {
    if (a <= 60) { return 1; }
    return 1 - Math.min(a - 60, 30) * 0.015;
  }
  /** 65세부터 자연사할 확률이 생긴다 — 연간 위험률을 12개월로 나눠
   *  달마다 굴린다(`rollAging` 이 부른다). */
  function deathChanceMonthly(a) {
    if (a < 65) { return 0; }
    var annual = core.clamp((a - 65) * 0.018, 0, 0.6);
    return 1 - Math.pow(1 - annual, 1 / 12);
  }
  function isDead(id) { return !!rec(id).dead; }

  /**
   * 달마다 한 번 — 노환으로 별세하는 사람이 있는지 본다. `rtk.js`
   * `settleMonth()` 가 재해·이간과 같은 자리에서 부른다.
   * **군주는 빠진다**(승계 체계가 없다 — 세력이 그 자리에서 끝나 버린다,
   * "새 판정을 만들지 않는다" 원칙과 같은 결로 이번엔 범위를 좁혔다).
   * 태수 자리(city.gov)를 비우는 것까지가 이 함수의 몫이다(`diplo.js`
   * `checkDefection` 이 이간으로 사람을 잃을 때 하는 정리와 같다).
   */
  function rollAging() {
    var R = global.DG.rtk, st = R.state(), k, gone = [];
    for (k in st.officers) {
      if (!Object.prototype.hasOwnProperty.call(st.officers, k)) { continue; }
      var r = st.officers[k];
      if (r.dead) { continue; }
      var a = age(k);
      if (a < 65) { continue; }
      if (r.force) {
        var f = FD.force(r.force);
        if (f && f.lord === k) { continue; }
      }
      if (Math.random() >= deathChanceMonthly(a) * core.tuned('rtk.agingDeathMul', 1)) { continue; }
      r.dead = true;
      var c = r.city ? R.city(r.city) : null;
      if (c && c.gov === k) { c.gov = null; }
      core.log('⚰️ ' + find(k).name + ' 이(가) 노환으로 별세했다(향년 ' + a + '세)', 'warn');
      if (r.force && r.force === R.me()) {
        core.emit('toast', '⚰️ ' + find(k).name + ' 이(가) 별세했다');
      }
      gone.push(k);
    }
    return gone;
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
    stats: stats, power: power, skill: skill, equip: equip, unequip: unequip,
    loyalOf: loyalOf, addLoyal: addLoyal, baseLoyal: baseLoyal,
    birthYear: birthYear, age: age, agingMul: agingMul,
    deathChanceMonthly: deathChanceMonthly, isDead: isDead, rollAging: rollAging
  };
})(window);
