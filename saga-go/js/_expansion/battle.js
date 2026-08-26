/**
 * 방치 자동 전투 (옛날 "키우기" 방식)
 * ---------------------------------------------------------------
 * 부대(등용한 인물 최대 5명 + 장착 펫)의 전투력으로 관문을 자동 돌파한다.
 * 화면을 안 봐도 진행되고, 껐다 켜면 오프라인 진행분을 정산해 준다.
 *
 * 전투력이 관문 요구치에 못 미치면 진격이 멈추고 "정체" 상태가 된다.
 * → 더 좋은 인물을 등용하거나 병영·성벽을 올려야 뚫린다.
 * 정체가 오래(STUCK_ROUT 초) 이어지면 **패퇴** 해서 그 관문의 파가 1로 돌아간다.
 *   (관문 자체는 유지된다 — 방치형이라 자리를 비운 사이 크게 잃으면 안 된다)
 *
 * 로그라이크 쪽 요소도 여기서 얹는다.
 *   · 파를 깰 때 확률로 장비가 떨어진다 (보스는 확정)
 *   · 관문을 돌파하면 전리(戰利) 셋 중 하나를 고른다.
 *     고르지 않아도 SPOIL_AUTO 초 뒤 자동으로 받는다 — 방치가 멈추면 안 되므로.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var data = global.DG.data;

  var WAVES_PER_STAGE = 10;
  var STUCK_ROUT = 60;          // 정체가 이만큼 이어지면 패퇴
  var SPOIL_AUTO = 12;          // 전리를 안 고르면 이 초 뒤 자동 수령
  var DROP_CHANCE = 0.08;       // 일반 파에서 장비가 떨어질 확률
  var BOSS_HP_MUL = 2.6;        // 보스는 일반 적보다 이만큼 오래 버틴다(=체력)
  var BOSS_LOOT_MUL = 2.4;      // 대신 전리품도 그만큼 준다
  var acc = 0;                  // 현재 웨이브 누적 진행 시간
  var lastResult = null;
  var stuckFor = 0;             // 정체가 이어진 시간
  var spoil = null;             // 고르기를 기다리는 전리 { stage, choices, left }

  /**
   * 부대 전투력.
   * 인물의 능력치는 hero.stats() 하나만 읽는다 — 레벨·승급·펫이 거기서 이미 합쳐져 온다.
   * 여기서 stats 를 다시 손대면 화면에 보이는 수치와 전투력이 어긋난다.
   */
  function power() {
    var p = core.save.party, atk = 0, def = 0, i, h, s;
    for (i = 0; i < p.length; i++) {
      h = data.find(p[i]);
      if (!h || !h.stats) { continue; }
      s = global.DG.hero.stats(p[i]);
      atk += s.might * 0.7 + s.wisdom * 0.3;
      def += s.command * 0.6 + s.wisdom * 0.2;
    }
    var e = core.effect();
    atk *= 1 + (e.atkPct || 0) / 100;
    def *= 1 + (e.hpPct || 0) / 100;
    return { atk: Math.round(atk), def: Math.round(def), total: Math.round(atk + def) };
  }

  /** 관문 요구 전투력 */
  function requirement(stage) {
    return Math.round(80 * Math.pow(1.33, stage - 1));
  }

  /** 웨이브 하나를 도는 데 걸리는 초. 전투력이 높을수록 빠르다. */
  function waveSeconds(stage, wave) {
    var pw = power().total;
    var req = requirement(stage);
    if (pw < req * 0.55) { return null; }             // 정체
    var ratio = req / Math.max(pw, 1);
    var sec = core.clamp(2.2 + ratio * 7, 1.0, 14);
    if (wave === WAVES_PER_STAGE) { sec *= BOSS_HP_MUL; }   // 보스는 오래 버틴다
    return sec;
  }

  function waveReward(stage, wave) {
    var e = core.effect();
    var loot = 1 + (e.lootPct || 0) / 100;
    var boss = wave === WAVES_PER_STAGE;
    var mul = boss ? BOSS_LOOT_MUL : 1;
    return {
      gold: Math.round(6 * Math.pow(1.22, stage - 1) * loot * mul),
      exp: Math.round(4 * Math.pow(1.18, stage - 1) * mul),
      feat: boss ? 3 : 0
    };
  }

  function clearWave() {
    var b = core.save.battle;
    var r = waveReward(b.stage, b.wave);
    core.save.player.gold += r.gold;
    core.gainExp(r.exp);
    global.DG.hero.awardParty(r.exp);          // 부대원 개별 성장
    if (r.feat) { core.gainFeat(r.feat, '보스 격파'); }

    // 장비 드랍 — 보스는 확정, 일반 파는 확률
    if (global.DG.item) {
      var boss = b.wave === WAVES_PER_STAGE;
      if (boss) { global.DG.item.drop(b.stage, { bias: 25 }); }
      else if (Math.random() < DROP_CHANCE) { global.DG.item.drop(b.stage, {}); }
    }
    b.wave += 1;
    if (b.wave > WAVES_PER_STAGE) {
      b.wave = 1;
      b.stage += 1;
      if (b.stage > b.best) { b.best = b.stage; }
      var feat = 4 + Math.floor(b.stage / 2);
      core.gainFeat(feat, '관문 돌파');
      // 관문 돌파 보상
      if (b.stage % 3 === 0) { core.save.items.scroll += 1; }
      if (b.stage % 2 === 0) { core.save.items.feed += 2; }
      core.log('⚔️ 제' + (b.stage - 1) + '관문 돌파! (다음: 제' + b.stage + '관문)', 'good');
      core.emit('toast', '⚔️ 제' + (b.stage - 1) + '관문 돌파!');
      offerSpoil(b.stage - 1);
      core.emit('changed');
    }
  }

  /* ── 전리(戰利) ───────────────────────────────────────
   * 관문을 돌파하면 셋 중 하나를 고른다. 로그라이크의 '보상 선택' 자리다.
   * 방치형이므로 고르지 않아도 시간이 지나면 자동으로 받는다.
   */

  var SPOILS = [
    { key: 'gold', emoji: '🪙', name: '군자금',
      desc: function (st) { return '금 ' + core.fmt(spoilGold(st)); } },
    { key: 'gear', emoji: '🎁', name: '전리품',
      desc: function () { return '장비 1점 (등급 보정)'; } },
    { key: 'feat', emoji: '🏅', name: '전공',
      desc: function (st) { return '공적 ' + spoilFeat(st); } },
    { key: 'supply', emoji: '📜', name: '보급',
      desc: function () { return '등용서 2 · 사료 4'; } },
    { key: 'exp', emoji: '📈', name: '훈공',
      desc: function (st) { return '부대 경험치 ' + spoilExp(st); } }
  ];

  function spoilGold(stage) { return Math.round(90 * Math.pow(1.24, stage - 1) * (1 + core.effect('goldPct') / 100)); }
  function spoilFeat(stage) { return 6 + Math.floor(stage * 1.2); }
  function spoilExp(stage) { return Math.round(14 * Math.pow(1.2, stage - 1)); }

  function offerSpoil(stage) {
    var pool = SPOILS.slice(), pick = [];
    while (pick.length < 3 && pool.length) {
      pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].key);
    }
    spoil = { stage: stage, choices: pick, left: SPOIL_AUTO };
    core.emit('battle:spoil', spoilInfo());
  }

  function spoilInfo() {
    if (!spoil) { return null; }
    var out = { stage: spoil.stage, left: spoil.left, choices: [] };
    for (var i = 0; i < spoil.choices.length; i++) {
      var def = null;
      for (var j = 0; j < SPOILS.length; j++) { if (SPOILS[j].key === spoil.choices[i]) { def = SPOILS[j]; } }
      if (def) {
        out.choices.push({ key: def.key, emoji: def.emoji, name: def.name, desc: def.desc(spoil.stage) });
      }
    }
    return out;
  }

  /** 전리를 받는다. key 를 안 주면 무작위로 하나 (자동 수령) */
  function takeSpoil(key) {
    if (!spoil) { return null; }
    var stage = spoil.stage;
    if (!key || spoil.choices.indexOf(key) < 0) { key = core.pick(spoil.choices); }
    var msg = '';
    if (key === 'gold') {
      var g = spoilGold(stage);
      core.save.player.gold += g;
      msg = '금 +' + core.fmt(g);
    } else if (key === 'gear') {
      var r = global.DG.item.drop(stage + 1, { bias: 40 });
      msg = global.DG.item.name(r.it);
    } else if (key === 'feat') {
      core.gainFeat(spoilFeat(stage), '전리');
      msg = '공적 +' + spoilFeat(stage);
    } else if (key === 'supply') {
      core.save.items.scroll += 2;
      core.save.items.feed += 4;
      msg = '등용서 +2 · 사료 +4';
    } else {
      var e = spoilExp(stage);
      global.DG.hero.awardParty(e);
      core.gainExp(e);
      msg = '경험치 +' + e;
    }
    spoil = null;
    core.log('🎴 전리 · ' + msg, 'good');
    core.emit('battle:spoil', null);
    core.emit('changed');
    core.persist();
    return key;
  }

  function update(dt) {
    var b = core.save.battle;
    b.lastTick = Date.now();

    if (spoil) {
      spoil.left -= dt;
      if (spoil.left <= 0) { takeSpoil(null); }
    }

    if (!b.auto) { return; }
    if (!core.save.party.length) { lastResult = 'noparty'; return; }
    var sec = waveSeconds(b.stage, b.wave);
    if (sec === null) {
      lastResult = 'stuck';
      acc = 0;
      stuckFor += dt;
      if (stuckFor >= STUCK_ROUT && b.wave > 1) {   // 패퇴 — 파가 1로 돌아간다
        stuckFor = 0;
        b.wave = 1;
        core.log('🏳️ 전투력이 모자라 패퇴했다 — 제' + b.stage + '관문 1파부터 다시', 'bad');
        core.emit('toast', '🏳️ 패퇴 · 제' + b.stage + '관문 1파로');
        core.emit('changed');
      }
      return;
    }
    stuckFor = 0;
    lastResult = 'ok';
    acc += dt;
    var guard = 0;
    while (acc >= sec && guard < 50) {
      acc -= sec;
      clearWave();
      sec = waveSeconds(core.save.battle.stage, core.save.battle.wave);
      if (sec === null) { break; }
      guard++;
    }
  }

  /** 오프라인 진행 정산 (최대 8시간) */
  function settleOffline(sec) {
    var b = core.save.battle;
    if (!b.auto || !core.save.party.length) { return null; }
    var capped = Math.min(sec, 8 * 3600);
    var cleared = 0, gold0 = core.save.player.gold, startStage = b.stage;
    var remain = capped, guard = 0;
    while (remain > 0 && guard < 3000) {
      var ws = waveSeconds(b.stage, b.wave);
      if (ws === null) { break; }
      if (remain < ws) { break; }
      remain -= ws;
      clearWave();
      cleared++;
      guard++;
    }
    if (!cleared) { return null; }
    return {
      sec: capped, waves: cleared,
      gold: core.save.player.gold - gold0,
      stageFrom: startStage, stageTo: b.stage
    };
  }

  /** 현재 웨이브 진행률 0~1 */
  function waveProgress() {
    var sec = waveSeconds(core.save.battle.stage, core.save.battle.wave);
    if (sec === null) { return 0; }
    return core.clamp(acc / sec, 0, 1);
  }

  function status() {
    var b = core.save.battle;
    return {
      power: power(),
      req: requirement(b.stage),
      state: lastResult,
      progress: waveProgress(),
      wavesPerStage: WAVES_PER_STAGE,
      boss: b.wave === WAVES_PER_STAGE,
      waveSec: waveSeconds(b.stage, b.wave),
      /** 전투력이 요구치의 몇 배인가 — 부대가 얼마나 여유로운지 */
      margin: power().total / Math.max(1, requirement(b.stage)),
      /** 정체가 이어진 시간 · 패퇴까지 남은 시간 */
      stuckFor: stuckFor,
      routIn: lastResult === 'stuck' ? Math.max(0, STUCK_ROUT - stuckFor) : null,
      spoil: spoilInfo()
    };
  }

  global.DG = global.DG || {};
  global.DG.battle = {
    update: update,
    settleOffline: settleOffline,
    status: status,
    power: power,
    waveSeconds: waveSeconds,
    previewReward: waveReward,
    spoilInfo: spoilInfo, takeSpoil: takeSpoil,
    STUCK_ROUT: STUCK_ROUT, SPOIL_AUTO: SPOIL_AUTO,
    BOSS_HP_MUL: BOSS_HP_MUL,
    requirement: requirement,
    WAVES_PER_STAGE: WAVES_PER_STAGE
  };
})(window);
