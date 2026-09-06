/**
 * 조우 — 등용(인물) / 포획(펫)
 * ---------------------------------------------------------------
 * 인물: 3라운드 설득. 인물의 성향(trait)에 맞는 어필을 고르면 호감도가 크게 오른다.
 *       호감도 100 이상이면 등용 성공. 등용서 1개와 명성을 소모한다.
 * 펫  : 타이밍 미니게임. 움직이는 바늘을 목표 구간에서 멈추면 포획률이 오른다.
 *       사료 1개를 소모한다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var data = global.DG.data;

  var el = null;         // 모달 루트
  var cur = null;        // 현재 조우 상태
  var rafId = null;

  function $(sel, root) { return (root || document).querySelector(sel); }

  /* 화면 층(`encounter3d.js`)이 켜져 있으면 조우를 3D 무대로 옮긴다.
     없거나 3D 가 안 도는 자리에서는 **전부 no-op** 이라 예전 화면 그대로다 —
     판정은 어느 쪽이든 이 파일의 같은 자리에서 난다. */
  function fx() {
    var f = global.DG.encounter3d;
    return (f && f.active()) ? f : null;
  }
  function openFx(kind, spawn) {
    var f = global.DG.encounter3d;
    var on = !!(f && f.on());
    /* 3D 무대가 있으면 `duel.js`의 `duel3d`와 같은 자리 — 화면 전체를 짙게
       가리면 뒤에 세운 등용·포획 대상이 안 보인다(2026-09-06, "등용 하려는
       인물이 안 보임"으로 지적받음). 카드도 아래로 붙여 얼굴을 비워 준다. */
    el.classList.toggle('enc3d', on);
    if (on) { f.open(kind, spawn); }
  }
  function closeFx() {
    var f = global.DG.encounter3d;
    if (f) { f.close(); }
  }

  function mount() {
    el = document.getElementById('encounter');
  }

  function close() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    // 도중에 물러나면 상대도 자리를 뜬다
    if (cur && !cur.done && cur.spawn) {
      global.DG.world.removeSpawn(cur.spawn.uid);
      core.log((cur.hero || cur.pet).name + ' 앞에서 물러났다.', 'info');
    }
    cur = null;
    closeFx();
    el.classList.remove('show', 'enc3d');
    el.innerHTML = '';
  }

  function open(spawn) {
    if (cur) { return; }
    mount();
    if (spawn.kind === 'hero') { startHero(spawn); }
    else { startPet(spawn); }
  }

  /* ── 인물 등용 ────────────────────────────────────────── */

  function startHero(spawn) {
    var h = spawn.ref;
    var need = h.rarity * 12;                    // 필요 명성
    cur = {
      spawn: spawn, hero: h, round: 1, maxRound: 3,
      favor: 0, needFame: need, done: false, history: [],
      revealed: h.rarity <= 3          // ★4 이상은 한 번 찔러봐야 기질을 안다
    };
    openFx('hero', spawn);
    renderHero();
    el.classList.add('show');
  }

  function renderHero() {
    var h = cur.hero;
    var rar = data.rarity[h.rarity];
    var canPay = core.save.items.scroll >= 1 && core.save.player.fame >= cur.needFame;

    var html = '' +
      '<div class="enc-card">' +
        '<div class="enc-head">' +
          '<div class="enc-icon" style="border-color:' + rar.color + '">' +
            '<img class="pt" alt="" src="' + global.DG.sprite.portrait('hero', h, 74) + '"></div>' +
          '<div>' +
            '<div class="enc-name">' + h.name + ' <span class="rar" style="color:' + rar.color + '">' + rar.label + '</span></div>' +
            '<div class="enc-sub">' + h.era + ' · ' + h.faction + ' · ' +
              (cur.revealed ? traitLabel(h.trait) : '<span class="muted">기질 불명 ❓</span>') + '</div>' +
            '<div class="enc-stats">무 ' + h.stats.might + ' / 지 ' + h.stats.wisdom + ' / 통 ' + h.stats.command + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="enc-bar"><div class="enc-bar-fill" style="width:' + core.clamp(cur.favor, 0, 100) + '%"></div>' +
          '<span class="enc-bar-label">호감도 ' + Math.round(cur.favor) + ' / 100</span></div>' +
        '<div class="enc-cost">소모: 📜 등용서 1 · 🎖️ 명성 ' + cur.needFame +
          (canPay ? '' : ' <b class="warn">(부족)</b>') + '</div>' +
        (cur.history.length ? '<div class="enc-hist">' + cur.history.join('<br>') + '</div>' : '<div class="enc-hist muted">어떤 방식으로 마음을 얻으시겠습니까? (' + cur.round + '/' + cur.maxRound + '라운드)</div>') +
        '<div class="enc-actions">' + appealButtons(canPay) + '</div>' +
        '<button class="btn ghost wide" data-act="flee">물러난다</button>' +
      '</div>';
    el.innerHTML = html;
    bindHero();
  }

  function traitLabel(t) {
    return t === 'might' ? '무인 기질 ⚔️' : (t === 'wisdom' ? '지략가 기질 📜' : '덕망가 기질 🙏');
  }

  function appealButtons(canPay) {
    if (cur.done) { return ''; }
    var out = '';
    for (var i = 0; i < data.appeals.length; i++) {
      var a = data.appeals[i];
      out += '<button class="btn appeal" data-appeal="' + a.key + '"' + (canPay ? '' : ' disabled') + '>' +
        '<b>' + a.emoji + ' ' + a.label + '</b><small>' + a.desc + '</small></button>';
    }
    return out;
  }

  function bindHero() {
    var btns = el.querySelectorAll('[data-appeal]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () { doAppeal(this.getAttribute('data-appeal')); });
    }
    var flee = $('[data-act="flee"]', el);
    if (flee) { flee.addEventListener('click', close); }
    var ok = $('[data-act="ok"]', el);
    if (ok) { ok.addEventListener('click', close); }
  }

  function doAppeal(key) {
    if (cur.done) { return; }
    var h = cur.hero;
    var hit = (key === h.trait);
    // 성향을 3번 다 맞히면 반드시 성공하도록(34*3=102) 하한을 잡는다
    var base = hit ? 34 + Math.random() * 14 : 8 + Math.random() * 10;
    // 부대 평균 능력치가 높으면 설득이 잘 먹힌다
    base *= 1 + partyStatBonus(key) / 200;
    cur.favor += base;
    var appeal = null;
    for (var i = 0; i < data.appeals.length; i++) { if (data.appeals[i].key === key) { appeal = data.appeals[i]; } }
    cur.history.unshift(
      '<span class="' + (hit ? 'good' : 'meh') + '">' + appeal.emoji + ' ' + appeal.label + ' → ' +
      (hit ? '깊이 공감했다' : '반응이 미지근하다') + ' (+' + Math.round(base) + ')</span>'
    );

    var f = fx();
    if (f) { f.react(hit); }

    cur.revealed = true;
    cur.round++;
    if (cur.favor >= 100) { succeedHero(); return; }
    if (cur.round > cur.maxRound) { failHero(); return; }
    renderHero();
  }

  /* ── 금 수급 ───────────────────────────────────────────────
   * 금은 승급(hero.rankUp — 220·1.7^rank)의 유일한 비용인데 수입원이 없어서
   * 초기 120 으로는 첫 승급(220)조차 닿지 않았다. 등용·포획 성공을 수입원으로 둔다.
   * 희귀도에 비례시켜, 흔한 인물을 여러 번 만나는 것과 드문 인물 한 번이 비슷해지게 했다.
   */
  var GOLD_PER_RARITY = { hero: 15, pet: 10 };

  function awardGold(kind, rarity) {
    var g = rarity * (GOLD_PER_RARITY[kind] || 10);
    core.save.player.gold += g;
    return g;
  }

  /**
   * 등용이 이루어졌을 때의 처리 — **손으로 하든, 자동이든, 천거장으로 찾아오든 같다.**
   * 셋이 같은 절차를 따로 들고 있어서, 금 수급을 붙일 때 두 곳을 고쳐야 했다.
   * 새 경로가 생기면 여기만 부르면 된다.
   */
  function gainHero(h) {
    registerDex('heroes', h.id);
    if (global.DG.quest) {
      global.DG.quest.progress('recruit', 1);
      if (h.rarity >= 3) { global.DG.quest.progress('rare', 1); }
    }
    global.DG.hero.ensure(h.id);
    var feat = h.rarity * 8;
    core.gainFeat(feat, '등용');
    var exp = core.gainExp(h.rarity * 14);
    var gold = awardGold('hero', h.rarity);
    global.DG.hero.awardParty(h.rarity * 3);      // 동행도 함께 배운다
    if (core.save.party.length < 5) { core.save.party.push(h.id); }
    return { feat: feat, exp: exp, gold: gold };
  }

  /**
   * 포획이 이루어졌을 때의 처리 — **손으로 던지든, 자동이든, 정화로 풀려나든 같다.**
   * `gainHero` 와 같은 뜻의 문이다. 여태 손·자동 두 곳이 같은 절차를 따로 들고
   * 있었고, 적도(rogue.js)의 정화가 셋째 경로가 되면서 하나로 모았다.
   * 새 경로가 생기면 여기만 부르면 된다.
   */
  function gainPet(p) {
    registerDex('pets', p.id);
    if (global.DG.quest) {
      global.DG.quest.progress('catch', 1);
      if (p.rarity >= 3) { global.DG.quest.progress('rare', 1); }
    }
    var feat = p.rarity * 5;
    core.gainFeat(feat, '포획');
    var exp = core.gainExp(p.rarity * 9);
    var fame = p.rarity * 6;                      // 명성 수급처 — 포획 성공
    core.save.player.fame += fame;
    var gold = awardGold('pet', p.rarity);
    global.DG.hero.awardParty(p.rarity * 2);
    /* 원작처럼 잡으면 그 종의 영초와 단사가 들어온다 (growth.js) */
    var got = global.DG.growth ? global.DG.growth.onCatch(p) : { herb: 0, dust: 0 };
    return { feat: feat, exp: exp, fame: fame, gold: gold, herb: got.herb, dust: got.dust };
  }

  function partyStatBonus(key) {
    var p = core.save.party, sum = 0, n = 0;
    var statKey = key === 'might' ? 'might' : (key === 'wisdom' ? 'wisdom' : 'command');
    for (var i = 0; i < p.length; i++) {
      var h = data.find(p[i]);
      if (h && h.stats) { sum += global.DG.hero.stats(p[i])[statKey]; n++; }
    }
    return n ? sum / n : 0;
  }

  function succeedHero() {
    var h = cur.hero;
    cur.done = true;
    core.save.items.scroll -= 1;
    core.save.player.fame -= cur.needFame;
    var got = gainHero(h);
    var feat = got.feat, exp = got.exp, gold = got.gold;
    global.DG.world.removeSpawn(cur.spawn.uid);
    core.log(h.name + ' 등용 성공!', 'good');

    el.innerHTML = '' +
      '<div class="enc-card result good">' +
        '<div class="enc-big"><img class="pt" alt="" src="' + global.DG.sprite.portrait('hero', h, 96) + '"></div>' +
        '<h3>' + h.name + ' 등용!</h3>' +
        '<p class="quote">"' + h.quote + '"</p>' +
        '<div class="enc-reward">공적 +' + feat + ' · 경험치 +' + exp + ' · 금 +' + gold + '</div>' +
        '<button class="btn primary wide" data-act="ok">확인</button>' +
      '</div>';
    bindHero();
    core.emit('changed');
    core.persist();
  }

  function failHero() {
    var h = cur.hero;
    cur.done = true;
    core.save.items.scroll -= 1;
    core.save.player.fame -= Math.floor(cur.needFame / 2);
    global.DG.world.removeSpawn(cur.spawn.uid);
    core.log(h.name + ' 등용 실패…', 'bad');
    el.innerHTML = '' +
      '<div class="enc-card result bad">' +
        '<div class="enc-big"><img class="pt" alt="" src="' + global.DG.sprite.portrait('hero', h, 96) + '"></div>' +
        '<h3>' + h.name + '은(는) 떠났다</h3>' +
        '<p class="quote">"인연이 아닌 듯하오."</p>' +
        '<div class="enc-reward">등용서 1 소모 · 명성 절반 반환</div>' +
        '<button class="btn ghost wide" data-act="ok">확인</button>' +
      '</div>';
    bindHero();
    core.emit('changed');
    core.persist();
  }

  /* ── 펫 포획 ──────────────────────────────────────────── */

  function startPet(spawn) {
    var p = spawn.ref;
    cur = {
      spawn: spawn, pet: p, done: false,
      needle: 0, dir: 1, speed: 0.85 + p.rarity * 0.13,
      zone: 0.5, zoneW: core.clamp(0.30 - p.rarity * 0.035, 0.08, 0.30),
      running: true
    };
    /* 무대를 **먼저** 연다 — 카드의 조작 안내가 3D 인지 아닌지를 보고 갈리기 때문이다
       (뒤에 열면 첫 화면만 옛 문구가 뜬다) */
    openFx('pet', spawn);
    renderPet();
    el.classList.add('show');
    loopPet();
  }

  function renderPet() {
    var p = cur.pet;
    var rar = data.rarity[p.rarity];
    var canPay = core.save.items.feed >= 1;
    var rate = Math.round((p.catchBase + core.effect('catchPct') / 100) * 100);

    el.innerHTML = '' +
      '<div class="enc-card">' +
        '<div class="enc-head">' +
          '<div class="enc-icon" style="border-color:' + rar.color + '">' +
            '<img class="pt" alt="" src="' + global.DG.sprite.portrait('pet', p, 74) + '"></div>' +
          '<div>' +
            '<div class="enc-name">' + p.name + ' <span class="rar" style="color:' + rar.color + '">' + rar.label + '</span></div>' +
            '<div class="enc-sub">' + (p.kind === 'divine' ? '신수(神獸)' : '동물') + ' · 기본 포획률 ' + rate + '%</div>' +
            '<div class="enc-stats">' + p.desc + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="catch-track"><div class="catch-zone"></div><div class="catch-needle"></div></div>' +
        '<div class="enc-cost">소모: 🍖 사료 1' + (canPay ? '' : ' <b class="warn">(부족)</b>') + ' · 보너스: 장착 마구간 +' + core.effect('catchPct') + '%</div>' +
        '<div class="enc-hint">' +
          (fx() ? '흰 고리가 <b>초록 테</b> 안에 들어왔을 때 <b>화면을 위로 밀거나</b>'
                : '바늘이 <b>초록 구간</b>에 있을 때') +
          ' <b>스페이스</b> 또는 버튼을 누르세요.</div>' +
        '<button class="btn primary wide" data-act="throw"' + (canPay ? '' : ' disabled') + '>🍖 던진다</button>' +
        '<button class="btn ghost wide" data-act="flee">물러난다</button>' +
      '</div>';

    var zone = $('.catch-zone', el);
    zone.style.left = ((cur.zone - cur.zoneW / 2) * 100) + '%';
    zone.style.width = (cur.zoneW * 100) + '%';

    $('[data-act="throw"]', el).addEventListener('click', throwFeed);
    $('[data-act="flee"]', el).addEventListener('click', close);
  }

  /** 지금 조준 상태 — 화면 층이 **바늘을 원으로 옮길 때** 읽어 간다(읽기만 한다) */
  function aim() {
    if (!cur || cur.pet === undefined) { return null; }
    return { needle: cur.needle, zone: cur.zone, zoneW: cur.zoneW, done: !!cur.done };
  }

  function loopPet() {
    if (!cur || cur.done) { return; }
    var last = performance.now();
    function step(now) {
      if (!cur || cur.done) { return; }
      var dt = (now - last) / 1000; last = now;
      cur.needle += cur.dir * cur.speed * dt;
      if (cur.needle > 1) { cur.needle = 1; cur.dir = -1; }
      if (cur.needle < 0) { cur.needle = 0; cur.dir = 1; }
      var n = $('.catch-needle', el);
      if (n) { n.style.left = (cur.needle * 100) + '%'; }
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }

  function throwFeed() {
    if (!cur || cur.done || core.save.items.feed < 1) { return; }
    cur.done = true;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    core.save.items.feed -= 1;

    var p = cur.pet;
    var off = Math.abs(cur.needle - cur.zone);
    var inZone = off <= cur.zoneW / 2;
    var accuracy = inZone ? 1 - (off / (cur.zoneW / 2)) : 0;      // 0~1
    var chance = p.catchBase + core.effect('catchPct') / 100;
    if (inZone) { chance += 0.18 + accuracy * 0.35; }
    else { chance *= 0.35; }
    chance = core.clamp(chance, 0.02, 0.97);
    var ok = Math.random() < chance;
    var html = '';

    if (ok) {
      var g = gainPet(p);
      var feat = g.feat, exp = g.exp, fameGain = g.fame, gold = g.gold;
      var got = { herb: g.herb, dust: g.dust };
      global.DG.world.removeSpawn(cur.spawn.uid);
      core.log(p.name + ' 포획 성공!', 'good');
      html = '' +
        '<div class="enc-card result good">' +
          '<div class="enc-big"><img class="pt" alt="" src="' + global.DG.sprite.portrait('pet', p, 96) + '"></div>' +
          '<h3>' + p.name + ' 포획!</h3>' +
          '<p class="quote">' + (inZone ? '완벽한 타이밍이었다 (정확도 ' + Math.round(accuracy * 100) + '%)' : '운이 좋았다') + '</p>' +
          '<div class="enc-reward">공적 +' + feat + ' · 명성 +' + fameGain + ' · 경험치 +' + exp + ' · 금 +' + gold + ' · 보정 ' + bonusLabel(p) + '</div>' +
          (got.herb ? '<div class="enc-reward">🌿 ' + p.name + ' 영초 +' + got.herb +
            ' · ✨ 단사 +' + got.dust + '</div>' : '') +
          '<button class="btn primary wide" data-act="ok">확인</button>' +
        '</div>';
    } else {
      global.DG.world.removeSpawn(cur.spawn.uid);
      core.log(p.name + ' 놓쳤다…', 'bad');
      html = '' +
        '<div class="enc-card result bad">' +
          '<div class="enc-big"><img class="pt" alt="" src="' + global.DG.sprite.portrait('pet', p, 96) + '"></div>' +
          '<h3>' + p.name + '은(는) 달아났다</h3>' +
          '<p class="quote">' + (inZone ? '아깝다! (포획률 ' + Math.round(chance * 100) + '%)' : '타이밍이 빗나갔다') + '</p>' +
          '<div class="enc-reward">사료 1 소모</div>' +
          '<button class="btn ghost wide" data-act="ok">확인</button>' +
        '</div>';
    }
    core.emit('changed');
    core.persist();

    /* 결과 창은 **던진 것이 날아가 맞은 뒤에** 뜬다. 판정은 위에서 이미 끝났으므로
       늦게 뜨든 곧바로 뜨든 결과는 같다 — 화면 층이 없으면(진단·자동이 그 길)
       곧바로 그린다. 뜨기 전에 창이 닫혔으면 아무것도 하지 않는다. */
    var show = function () {
      if (!cur) { return; }
      el.innerHTML = html;
      var okBtn = $('[data-act="ok"]', el);
      if (okBtn) { okBtn.addEventListener('click', close); }
    };
    var f = fx();
    if (f) { f.throwFx(ok, accuracy, show); } else { show(); }
  }

  function bonusLabel(p) {
    var m = { might: '무력', wisdom: '지력', command: '통솔', virtue: '덕망' };
    return (m[p.bonus.stat] || p.bonus.stat) + ' +' + p.bonus.value;
  }

  /* ── 자동 처리 (방치형) ───────────────────────────────
   * 화면을 띄우지 않고 같은 규칙으로 한 번 시도한다.
   * 확률을 따로 만들지 않고 **미니게임 규칙을 그대로 굴린다** —
   * 그래야 손으로 할 때와 자동일 때의 기대값이 어긋나지 않는다.
   */

  function autoHero(spawn) {
    var h = spawn.ref;
    var need = h.rarity * 12;
    if (core.save.items.scroll < 1 || core.save.player.fame < need) { return null; }
    // 기질을 모르는 채 3라운드를 무작위로 고른 셈으로 굴린다
    var favor = 0, r;
    for (r = 0; r < 3; r++) {
      var key = core.pick(data.appeals).key;
      var hit = key === h.trait;
      var base = hit ? 34 + Math.random() * 14 : 8 + Math.random() * 10;
      base *= 1 + partyStatBonus(key) / 200;
      favor += base;
      if (favor >= 100) { break; }
    }
    core.save.items.scroll -= 1;
    core.save.player.fame -= need;
    global.DG.world.removeSpawn(spawn.uid);
    if (favor < 100) {
      core.log('🤖 ' + h.name + ' 등용 실패 (자동)', 'bad');
      return { ok: false, kind: 'hero', name: h.name };
    }
    gainHero(h);
    core.log('🤖 ' + h.name + ' 등용 성공 (자동)', 'good');
    return { ok: true, kind: 'hero', name: h.name };
  }

  function autoPet(spawn) {
    var p = spawn.ref;
    if (core.save.items.feed < 1) { return null; }
    core.save.items.feed -= 1;
    // 자동은 조준을 못 하므로 정확도를 무작위로 본다
    var accuracy = Math.random();
    var inZone = accuracy > 0.45;
    var chance = p.catchBase + core.effect('catchPct') / 100;
    if (inZone) { chance += 0.18 + (accuracy - 0.45) / 0.55 * 0.35; }
    else { chance *= 0.35; }
    chance = core.clamp(chance, 0.02, 0.97);
    global.DG.world.removeSpawn(spawn.uid);
    if (Math.random() >= chance) {
      core.log('🤖 ' + p.name + ' 놓쳤다 (자동)', 'bad');
      return { ok: false, kind: 'pet', name: p.name };
    }
    gainPet(p);
    core.log('🤖 ' + p.name + ' 포획 성공 (자동)', 'good');
    return { ok: true, kind: 'pet', name: p.name };
  }

  /**
   * 자동 조우 — 성공/실패 결과를 돌려준다.
   * 소모품이 없으면 아무 것도 하지 않고 null 을 준다(대상도 그대로 남는다).
   */
  function autoResolve(spawn) {
    if (cur) { return null; }                     // 손으로 조우 중이면 끼어들지 않는다
    if (!spawn || !spawn.ref) { return null; }
    var r = spawn.kind === 'hero' ? autoHero(spawn) : autoPet(spawn);
    if (r) { core.emit('changed'); core.persist(); }
    return r;
  }

  /* ── 공통 ─────────────────────────────────────────────── */

  function registerDex(cat, id) {
    var dex = core.save.dex[cat];
    if (!dex[id]) {
      dex[id] = { count: 1, firstAt: Date.now() };
      core.emit('dex:new', { cat: cat, id: id });
    } else {
      dex[id].count += 1;
    }
  }

  // 영지 편입(addRegionDeed)은 경영을 게임에서 빼면서 함께 제거했다

  // 스페이스로 포획
  global.addEventListener('keydown', function (e) {
    if (e.key === ' ' && cur && cur.pet && !cur.done) { e.preventDefault(); throwFeed(); }
    if (e.key === 'Escape' && cur) { close(); }
  });

  core.on('encounter:request', function (spawn) { open(spawn); });

  global.DG = global.DG || {};
  global.DG.encounter = {
    open: open, close: close, autoResolve: autoResolve,
    /** 지금 조준 상태 (화면 층이 읽어 간다 — 바꾸지는 않는다) */
    aim: aim,
    /** 던진다 — 화면 층이 스와이프를 받아 **같은 함수로** 넣는다(버튼과 한 길이다) */
    throwNow: throwFeed,
    /** 등용 처리 — 천거장(letter.js)처럼 조우 밖에서 사람을 얻는 길도 이걸 쓴다 */
    gainHero: gainHero,
    /** 포획 처리 — 적도(rogue.js)의 정화처럼 조우 밖에서 짐승을 얻는 길도 이걸 쓴다 */
    gainPet: gainPet,
    get active() { return !!cur; }
  };
})(window);
