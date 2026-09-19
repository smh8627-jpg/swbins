/**
 * 봉수대(烽燧臺) — 오르면 지도가 열린다 (PLAN §5 ①)
 * ---------------------------------------------------------------
 * 권역(한 9·일 9·중 9 = 27 대표점, `region-kr.js`·`region-jp.js`·`region-cn.js`)
 * 마다 하나. 대표점에서 **좌표 해시로 300~800m 밀어** 자리를 고정한다 — 역참
 * (`world.js`의 `h01`)과 같은 결정성이다. 늘 세계 좌표(lat/lng)로만 자리를
 * 잡고, 그때그때 `world.latLngToWorld()`로 지금 원점(origin) 기준 월드 좌표를
 * 다시 구한다 — origin 은 실제 GPS 를 처음 잡을 때 그 자리로 재설정되므로
 * (world.js `useGeo`), 미리 월드 좌표로 굳혀 두면 origin 이 바뀔 때 다 어긋난다.
 *
 * 30m 안에서 3초를 눌러 **불을 올린다** — 한 번만 보상. 그 뒤로는 그 권역
 * 반경 1.5km 의 역참·성채가 오버월드·미니맵에 미리 뜬다(48절 "가 보기 전까지
 * 안 뜬다"의 예외를 봉수대만 허용). 사당(②)·비석(⑤)은 아직 없어 자리만 비워
 * 뒀다 — 그 후보가 서면 `revealedNear()`에 한 줄씩 보탠다.
 *
 * **3D 탑 모델은 이 세션에 안 넣는다** — `asset3d.js`에 새 GLB 레시피(팔레트
 * 스왑)를 추가하는 일인데, 같은 종류(역참 `tower_ruin.glb`)의 아이콘 굽기가
 * SAGA-HANDOFF 기준 여섯 번 넘게 실패한 이력이 있다. 지금은 근접 카드(아래
 * `open()`)·미니맵·오버월드 점만으로 기능한다 — 3D 랜드마크는 자산이 생기면
 * 따로 붙인다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  var REVEAL_RADIUS = 1500;     // m — 불을 올리면 이 반경의 역참·성채가 미리 뜬다
  var HIT_RADIUS = 30;          // m — 불을 올릴 수 있는 거리
  var HOLD_SEC = 3;             // 홀드 시간
  var REWARD = { gold: 120, feat: 40, dan: 5 };

  /* world.js 의 것과 같은 요령 — core.hash2 는 0~0.5 만 돌려준다(부호 있는
     시프트 때문) — 그냥 쓰면 방향이 한쪽으로 쏠린다 */
  function h01(a, b) { return Math.min(0.999999, core.hash2(a, b) * 2); }

  function allRegions() {
    var RK = global.DG.regionKr, RJ = global.DG.regionJp, RC = global.DG.regionCn;
    return (RK ? RK.REGIONS : []).concat(RJ ? RJ.REGIONS : []).concat(RC ? RC.REGIONS : []);
  }

  var _list = null;
  /** 27 봉수대 — 대표점에서 해시로 밀어 정한 고정 lat/lng. 한 번 계산해 캐싱한다
   *  (REGIONS 는 정적 데이터라 세션 중 안 바뀐다) */
  function list() {
    if (_list) { return _list; }
    _list = allRegions().map(function (r) {
      /* 위경도를 그대로 시드로 쓴다 — 정수로 반올림해 늘 같은 해시가 나오게 한다 */
      var a = Math.round(r.center.lat * 1000), b = Math.round(r.center.lng * 1000);
      var ang = h01(a * 13 + 7, b * 17 + 3) * Math.PI * 2;
      var dist = 300 + h01(a * 29 + 11, b * 31 + 19) * 500;
      var mPerLat = 111320, mPerLng = 111320 * Math.cos(r.center.lat * Math.PI / 180);
      return {
        key: r.code, name: r.name, hanja: r.hanja, region: r,
        lat: r.center.lat + Math.cos(ang) * dist / mPerLat,
        lng: r.center.lng + Math.sin(ang) * dist / mPerLng
      };
    });
    return _list;
  }

  function byKey(key) {
    var ls = list();
    for (var i = 0; i < ls.length; i++) { if (ls[i].key === key) { return ls[i]; } }
    return null;
  }

  /** 지금 원점(origin) 기준 월드 좌표 — origin 이 바뀌면 값도 따라 바뀐다(의도대로) */
  function worldPos(b) {
    var W = global.DG.world;
    return W ? W.latLngToWorld(b.lat, b.lng) : { x: 0, y: 0 };
  }

  function book() {
    if (!core.save.beacons) { core.save.beacons = {}; }
    return core.save.beacons;
  }
  function lit(key) { return !!book()[key]; }

  /** 지금 위치에서 가장 가까운 봉수대(27개뿐이라 선형 탐색으로 충분) */
  function nearest() {
    var pos = core.save.player.pos;
    var ls = list(), best = null, bestD = Infinity;
    for (var i = 0; i < ls.length; i++) {
      var w = worldPos(ls[i]);
      var d = Math.hypot(w.x - pos.x, w.y - pos.y);
      if (d < bestD) { bestD = d; best = ls[i]; }
    }
    if (!best) { return null; }
    return { beacon: best, dist: bestD, inRange: bestD <= HIT_RADIUS, lit: lit(best.key) };
  }

  /** 아직 안 올린 것 중 가장 가까운 것 — 목표판 "지금" 줄이 쓴다 */
  function nearestUnlit() {
    var pos = core.save.player.pos;
    var ls = list(), best = null, bestD = Infinity;
    for (var i = 0; i < ls.length; i++) {
      if (lit(ls[i].key)) { continue; }
      var w = worldPos(ls[i]);
      var d = Math.hypot(w.x - pos.x, w.y - pos.y);
      if (d < bestD) { bestD = d; best = ls[i]; }
    }
    return best ? { beacon: best, dist: bestD } : null;
  }

  var holding = false, holdT = 0;
  function holdStart() { holding = true; holdT = 0; }
  function holdEnd() { holding = false; holdT = 0; }
  function holdPct() { return HOLD_SEC ? Math.min(1, holdT / HOLD_SEC) : 0; }

  /** 매 프레임(game.js loop) — 누르고 있는 동안만 채워진다. 자리를 벗어나거나
   *  손을 떼면 그대로 풀린다(중간에 저장해 두지 않는다 — 다시 처음부터) */
  function tick(dt) {
    if (!holding) { return; }
    var n = nearest();
    if (!n || !n.inRange || n.lit) { holding = false; holdT = 0; return; }
    holdT += dt;
    var bar = global.document && global.document.getElementById('beacon-hold-bar');
    if (bar) { bar.style.width = Math.round(holdPct() * 100) + '%'; }
    if (holdT >= HOLD_SEC) {
      holding = false; holdT = 0;
      light(n.beacon);
    }
  }

  /** 27개 다 올렸는지 — 칭호 '봉화사' */
  var TITLE_KEY = 'beaconMaster';
  function allLit() {
    var ls = list();
    for (var i = 0; i < ls.length; i++) { if (!lit(ls[i].key)) { return false; } }
    return true;
  }

  /** 불을 올린다 — 한 번만 보상. 이미 올린 자리면 조용히 거절(카드는 open() 이 가른다) */
  function light(b) {
    if (!b) { return { ok: false, reason: 'none' }; }
    var bk = book();
    if (bk[b.key]) { return { ok: false, reason: 'already' }; }
    bk[b.key] = Date.now();
    core.save.player.gold += REWARD.gold;
    core.gainFeat(REWARD.feat, '봉수');
    var GR = global.DG.growth;
    if (GR) { GR.addDust(REWARD.dan); }
    core.log('🔥 ' + b.name + ' 봉수대에 불을 올렸다 — 🪙 +' + REWARD.gold +
      ' · 공적 +' + REWARD.feat + (GR ? ' · 丹 +' + REWARD.dan : ''), 'good');
    core.emit('toast', '🔥 ' + b.region.name + ' 권역이 열렸다');
    var X = global.DG.codex;
    if (X && X.discover) { X.discover('landmark', b.key, { name: b.name + ' 봉수대' }); }
    var justCompleted = allLit();
    if (justCompleted && !(core.save.player.titles && core.save.player.titles[TITLE_KEY])) {
      core.save.player.titles = core.save.player.titles || {};
      core.save.player.titles[TITLE_KEY] = true;
      core.log('🏅 27개 봉수대를 모두 밝혔다 — 칭호 "봉화사"', 'good');
      core.emit('toast', '🏅 칭호 획득 — 봉화사');
    }
    core.emit('changed');
    core.persist();
    return { ok: true, reward: REWARD, title: justCompleted };
  }

  /** 이 봉수대 반경(REVEAL_RADIUS) 안의 역참·성채 — 오버월드가 부른다.
   *  불이 안 올랐으면 빈 배열(아직 열리지 않은 권역은 안 새어 나간다) */
  function revealedNear(b) {
    var W = global.DG.world;
    if (!W || !b || !lit(b.key)) { return []; }
    var c = worldPos(b);
    var RS = W.REGION_SIZE;
    var span = Math.ceil(REVEAL_RADIUS / RS) + 1;
    var rx0 = Math.floor(c.x / RS), ry0 = Math.floor(c.y / RS);
    var out = [], seen = {};
    for (var dy = -span; dy <= span; dy++) {
      for (var dx = -span; dx <= span; dx++) {
        var rx = rx0 + dx, ry = ry0 + dy;
        var sts = W.stationsIn(rx, ry);
        for (var i = 0; i < sts.length; i++) {
          var sd = Math.hypot(sts[i].x - c.x, sts[i].y - c.y);
          if (sd <= REVEAL_RADIUS && !seen[sts[i].key]) {
            seen[sts[i].key] = 1;
            out.push({ type: 'station', x: sts[i].x, y: sts[i].y, name: sts[i].name, key: sts[i].key });
          }
        }
        var ft = W.fortAt(rx, ry);
        if (ft) {
          var fd = Math.hypot(ft.x - c.x, ft.y - c.y);
          if (fd <= REVEAL_RADIUS && !seen[ft.key]) {
            seen[ft.key] = 1;
            out.push({ type: 'fort', x: ft.x, y: ft.y, name: ft.name, key: ft.key });
          }
        }
      }
    }
    return out;
  }

  /** 불이 오른 모든 봉수대의 공개 자리 — 오버월드가 한 번에 그릴 때 쓴다 */
  function revealedAll() {
    var out = [];
    var ls = list();
    for (var i = 0; i < ls.length; i++) {
      if (!lit(ls[i].key)) { continue; }
      out = out.concat(revealedNear(ls[i]));
    }
    return out;
  }

  /* ── 화면 ─────────────────────────────────────────────── */

  var active = false;

  function host() { return global.document && global.document.getElementById('encounter'); }

  function close() {
    active = false;
    holdEnd();
    var el = host();
    if (el) { el.classList.remove('show'); el.innerHTML = ''; }
    core.emit('changed');
  }

  /** 근접 카드 — 이미 올렸으면 안내만, 아니면 3초 홀드 단추 */
  function open(b) {
    if (global.DG.encounter && global.DG.encounter.active) { return; }
    var el = host();
    if (!el || !b) { return; }
    active = true;
    var already = lit(b.key);
    el.innerHTML =
      '<div class="enc-card">' +
        '<div class="enc-big"><span style="font-size:56px">🗼</span></div>' +
        '<h3>' + b.name + ' 봉수대</h3>' +
        '<p class="quote">' + b.region.name + '(' + (b.hanja || '') + ') 권역</p>' +
        (already
          ? '<div class="enc-reward">이미 불을 올렸습니다 — 이 권역은 열려 있습니다.</div>' +
            '<button class="btn primary wide" data-act="ok">닫는다</button>'
          : '<div class="enc-reward">3초 동안 눌러 불을 올립니다 — 🪙 +' + REWARD.gold +
              ' · 공적 +' + REWARD.feat + ' · 丹 +' + REWARD.dan + '</div>' +
            '<div class="bar blue" style="margin:8px 0"><i id="beacon-hold-bar" style="width:0%"></i></div>' +
            '<button class="btn primary wide" id="beacon-hold-btn">🔥 불을 올린다 (누르고 있기)</button>' +
            '<button class="btn ghost wide" data-act="ok">물러난다</button>') +
      '</div>';
    el.classList.add('show');
    var ok = el.querySelector('[data-act="ok"]');
    if (ok) { ok.addEventListener('click', close); }
    var hb = el.querySelector('#beacon-hold-btn');
    if (hb) {
      hb.addEventListener('pointerdown', function (e) { holdStart(); e.preventDefault(); });
      var release = function () { holdEnd(); var bar = el.querySelector('#beacon-hold-bar'); if (bar) { bar.style.width = '0%'; } };
      hb.addEventListener('pointerup', release);
      hb.addEventListener('pointercancel', release);
      hb.addEventListener('pointerleave', release);
    }
  }

  core.on('beacon:request', function (b) { open(b); });

  global.DG = global.DG || {};
  global.DG.beacon = {
    REVEAL_RADIUS: REVEAL_RADIUS, HIT_RADIUS: HIT_RADIUS, HOLD_SEC: HOLD_SEC, REWARD: REWARD,
    list: list, byKey: byKey, worldPos: worldPos, lit: lit, allLit: allLit,
    nearest: nearest, nearestUnlit: nearestUnlit,
    holdStart: holdStart, holdEnd: holdEnd, holdPct: holdPct, tick: tick,
    light: light, revealedNear: revealedNear, revealedAll: revealedAll,
    open: open, close: close, get active() { return active; },
    /** 진단이 씨를 되돌릴 때 */
    _resetForTest: function () { _list = null; }
  };
})(window);
