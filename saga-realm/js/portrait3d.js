/**
 * 초상 — 도감 카드의 그림을 **실제 모델로 굽는다**
 * ---------------------------------------------------------------
 * 다섯 판 공통 방침("스크립트로 그리는 것은 다 에셋으로", 2026-08-28) 을
 * saga-go 에 이어 이 판에도 옮긴다. 여태 인물(장수) 초상은 `sprite.js` 가
 * 캔버스에 도형으로 그렸다.
 *
 * 이 판은 인물이 걸어 다니지 않아(턴제 지도) 여태 사람 GLB 창고가 없었다 —
 * 이번에 `js/asset3d.js` 에 `HERO_RECIPES`·`buildHero()` 를 처음 들였다
 * (`assets/ASSET_LICENSES.md` 참고). `buildHero(ref, tintHex, cb)` 는
 * **콜백 방식**이라 saga-go 처럼 "굽는 대상이 아직 도형이면 몇 번 다시
 * 본다" 는 폴링이 필요 없다 — 콜백이 오는 순간 바로 굽는다.
 *
 * 이 판의 `buildHero` 는 몸짓 이름 맞추기(`mapClips`)를 옮기지 않았다 —
 * 걷는 화면이 없어 슬롯(걷기·공격 등)이 필요 없고, 초상은 **그냥 그럴듯한
 * 자세 하나**만 있으면 된다. 그래서 여기서 클립 이름에 "idle" 이 있으면
 * 그것을, 없으면 첫 클립을 그냥 쓴다.
 *
 *   of(kind, ref, w, h)    다 구웠으면 dataURL, 아니면 null (동기)
 *   warm(kind, ref, w, h)  굽기 시작한다. 되면 `sweep()` 이 화면을 갈아 끼운다
 *   sweep()                `[data-p3]` 가 붙은 <img> 를 훑어 src 를 바꾼다
 *
 * **되돌아가는 길이 그대로다.** three 가 없거나 GLB 를 못 받거나(`file://`
 * 단독판) 손잡이(`portrait3d.on`)를 내리면 `null` 을 주고, 부르는 쪽은
 * 여태 쓰던 `sprite.portraitCard` 그림을 그대로 쓴다. 화면은 안 빈다.
 *
 * **한 줄도 판정에 닿지 않는다.** 여기서 만드는 것은 그림뿐이다.
 */
(function (global) {
  'use strict';

  function core() { return global.DG.core; }
  var T = null;
  function three() { if (!T) { T = global.THREE || null; } return T; }

  /** 초상을 모델로 구울까 — 0 이면 여태 쓰던 캔버스 그림 그대로 (되돌림용) */
  function ON() { return core().tuned('portrait3d.on', 1) ? true : false; }

  /* ── 값을 내는 함수 — three 없이도 돈다 (자가진단이 이것만 본다) ────── */

  function keyOf(kind, ref, w, h) {
    var id = (ref && (ref.id || ref.key || ref.name)) || 'x';
    return kind + ':' + id + ':' + Math.round(w) + 'x' + Math.round(h);
  }

  function parseKey(s) {
    var m = /^([a-z]+):([^:]+):(\d+)x(\d+)$/.exec(String(s || ''));
    if (!m) { return null; }
    return { kind: m[1], id: m[2], w: +m[3], h: +m[4] };
  }

  function hexOf(css, def) {
    if (!css) { return def; }
    var n = parseInt(String(css).replace('#', ''), 16);
    return isNaN(n) ? def : n;
  }

  /** 카메라를 어디에 두나 — **키 1 로 눕힌 모델** 기준의 순수 계산이다 */
  function camPlan(w, h) {
    var aspect = w / Math.max(1, h);
    var span = 0.62;
    var fov = 26;
    var dist = (span / 2) / Math.tan(fov * Math.PI / 360);
    if (aspect < 1) { dist = dist / Math.max(0.55, aspect); }
    var look = 0.78;
    return { fov: fov, dist: dist, look: look, aspect: aspect, yaw: 0.42, pitch: 0.06 };
  }

  /* ── 여기서부터 three 가 필요하다 ─────────────────────── */

  var renderer = null, scene = null, camera = null, rig = null, failed = false;
  var cache = {};           // { key: dataURL }
  var pending = {};         // { key: true }  굽는 중
  var made = 0, gaveUp = 0;

  function ready() { return !!(three() && ON() && !failed); }

  function boot() {
    if (renderer || failed) { return !!renderer; }
    var t = three();
    if (!t) { failed = true; return false; }
    try {
      var cv = document.createElement('canvas');
      renderer = new t.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(1);
      scene = new t.Scene();
      camera = new t.PerspectiveCamera(26, 1, 0.01, 40);
      scene.add(new t.HemisphereLight(0xdCE8FF, 0x6a6055, 1.25));
      var sun = new t.DirectionalLight(0xFFF3DC, 1.55);
      sun.position.set(1.4, 2.2, 1.8);
      scene.add(sun);
      var fill = new t.DirectionalLight(0x9fb4d8, 0.5);
      fill.position.set(-1.6, 0.8, -1.2);
      scene.add(fill);
      rig = new t.Group();
      scene.add(rig);
    } catch (e) { failed = true; renderer = null; }
    return !!renderer;
  }

  function colorsOf(kind, ref) {
    var D = global.DG.data;
    var isHero = kind === 'hero';
    var fac = isHero ? D.faction(ref.faction)
      : { color: ref.kind === 'divine' ? '#8a5cc0' : '#5f7a4a',
          mark: ref.kind === 'divine' ? '神' : '獸' };
    var rar = D.rarity[ref.rarity] || D.rarity[3];
    return { fac: fac, rar: rar };
  }

  function paintBack(c, w, h, kind, ref) {
    var col = colorsOf(kind, ref);
    var g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, shade(col.fac.color, 0.16));
    g.addColorStop(1, shade(col.fac.color, -0.52));
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.save();
    c.globalAlpha = 0.16;
    c.fillStyle = '#ffffff';
    c.font = '700 ' + Math.round(h * 0.52) + 'px "Malgun Gothic", serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(col.fac.mark, w * 0.5, h * 0.5);
    c.restore();
    c.save();
    c.globalAlpha = 0.3;
    c.fillStyle = '#000000';
    c.beginPath();
    c.ellipse(w * 0.5, h * 0.93, w * 0.28, h * 0.035, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
    return col;
  }

  function paintFrame(c, w, h, col) {
    c.strokeStyle = col.rar && col.rar.color ? col.rar.color : '#8a94a6';
    c.lineWidth = 2;
    c.strokeRect(1, 1, w - 2, h - 2);
  }

  function shade(hex, amt) {
    var S = global.DG.sprite;
    if (S && S.shade) { return S.shade(hex, amt); }
    return hex;
  }

  /** 쉬는 자세로 한 번 굴린다 — `mapClips` 가 없으니 이름에 idle 이 있는
   *  클립을 직접 찾고, 없으면 첫 클립을 그냥 쓴다 */
  function settle(node) {
    if (!node || !node.userData || !node.userData.mixer || !node.userData.clips) { return; }
    var clips = node.userData.clips;
    var pick = null, i;
    for (i = 0; i < clips.length; i++) {
      if (/idle|stand|breathe|rest|wait/i.test(clips[i].name)) { pick = clips[i]; break; }
    }
    if (!pick) { pick = clips[0]; }
    if (!pick) { return; }
    try {
      node.userData.mixer.clipAction(pick).reset().play();
      node.userData.mixer.update(0.45);
    } catch (e) { /* 자세를 못 잡아도 그림은 나온다 */ }
  }

  function bake(kind, ref, w, h, node) {
    if (!boot() || !node) { return null; }

    var plan = camPlan(w, h);
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var pw = Math.max(16, Math.round(w * dpr)), ph = Math.max(16, Math.round(h * dpr));

    while (rig.children.length) { rig.remove(rig.children[0]); }
    rig.add(node);
    node.position.set(0, 0, 0);
    node.scale.setScalar(1);
    node.rotation.set(0, Math.PI + plan.yaw, 0);

    settle(node);

    camera.fov = plan.fov;
    camera.aspect = plan.aspect;
    camera.position.set(0, plan.look + plan.dist * Math.sin(plan.pitch), plan.dist);
    camera.lookAt(0, plan.look, 0);
    camera.updateProjectionMatrix();

    renderer.setSize(pw, ph, false);
    renderer.render(scene, camera);

    var cv = document.createElement('canvas');
    cv.width = pw; cv.height = ph;
    var c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    var col = paintBack(c, w, h, kind, ref);
    c.drawImage(renderer.domElement, 0, 0, w, h);
    paintFrame(c, w, h, col);

    rig.remove(node);
    made++;
    try { return cv.toDataURL('image/png'); } catch (e) { return null; }
  }

  function of(kind, ref, w, h) {
    if (!ready()) { return null; }
    return cache[keyOf(kind, ref, w, h)] || null;
  }

  /**
   * 굽는 줄 — **한 번에 하나씩만** 굽는다. 여러 인물을 한꺼번에 부르면
   * WebGL 렌더 여러 개가 겹친다 — 2026-09-02, 다른 판(사가블로·사가의숲)에서
   * 필드를 걷거나 전투할 때 끊긴다는 신고를 받고 줄을 세웠다. 실패도
   * `cache[key] = false` 로 **한 번만** 적어 두고 다시 시도하지 않는다 —
   * 안 그러면 실패하는 인물 하나가 화면이 떠 있는 내내 계속 다시 구우려
   * 든다(같은 신고의 진짜 원인이었다).
   */
  var queue = [];
  var busy = false;

  function has(key) { return Object.prototype.hasOwnProperty.call(cache, key); }

  function pump() {
    if (busy || !queue.length) { return; }
    var job = queue.shift();
    busy = true;
    var A3 = global.DG.asset3d;
    if (!A3 || !A3.buildHero) { delete pending[job.key]; cache[job.key] = false; busy = false; pump(); return; }

    var fac = global.DG.data.faction(job.ref.faction);
    try {
      A3.buildHero(job.ref, hexOf(fac.color, null), function (model) {
        delete pending[job.key];
        busy = false;
        if (!model) { cache[job.key] = false; gaveUp++; pump(); return; }
        var url = null;
        try { url = bake(job.kind, job.ref, job.w, job.h, model); } catch (e) { url = null; }
        if (url) { cache[job.key] = url; sweep(); } else { cache[job.key] = false; gaveUp++; }
        pump();
      });
    } catch (e) { delete pending[job.key]; cache[job.key] = false; gaveUp++; busy = false; pump(); }
  }

  /** 줄에 올린다 — `asset3d.buildHero` 콜백이 한 번 오면 그 자리에서 곧바로 굽는다 */
  function warm(kind, ref, w, h) {
    if (!ready() || !ref || kind !== 'hero') { return false; }
    var key = keyOf(kind, ref, w, h);
    if (has(key) || pending[key]) { return false; }
    var A3 = global.DG.asset3d;
    if (!A3 || !A3.buildHero) { return false; }
    pending[key] = true;
    queue.push({ kind: kind, ref: ref, w: w, h: h, key: key });
    pump();
    return true;
  }

  function sweep() {
    if (!ready() || !global.document) { return 0; }
    var list = document.querySelectorAll('img[data-p3]');
    var n = 0, i;
    for (i = 0; i < list.length; i++) {
      var el = list[i];
      var k = el.getAttribute('data-p3');
      var got = cache[k];
      if (got) {
        if (el.getAttribute('data-p3-done') !== '1') {
          el.src = got;
          el.setAttribute('data-p3-done', '1');
          n++;
        }
        continue;
      }
      var p = parseKey(k);
      if (!p) { continue; }
      var D = global.DG.data;
      var ref = D && D.find ? D.find(p.id) : null;
      if (ref) { warm(p.kind, ref, p.w, p.h); }
    }
    return n;
  }

  function stats() {
    return { on: ON(), ready: ready(), failed: failed, made: made, gaveUp: gaveUp,
      cached: Object.keys(cache).length, pending: Object.keys(pending).length };
  }

  global.DG = global.DG || {};
  global.DG.portrait3d = {
    ON: ON, ready: ready, keyOf: keyOf, of: of, warm: warm, sweep: sweep, stats: stats
  };
})(window);
