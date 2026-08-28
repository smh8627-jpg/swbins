/**
 * 초상 — 도감 카드의 그림을 **실제 모델로 굽는다**
 * ---------------------------------------------------------------
 * 여태 도감 카드와 목록의 인물 그림은 `sprite.js` 가 캔버스에 **도형으로 그렸다**.
 * 사용자 방침("스크립트로 그리는 것은 다 에셋으로", 2026-08-28)에 따라 그 자리를
 * 옮긴다 — 다만 **인물 일흔의 초상 일러스트는 CC0 로 존재하지 않는다.**
 * 관우·이순신·세종의 그림을 받아 올 곳이 없다.
 *
 * 그래서 다른 길로 간다. **이미 가진 인물 GLB 를 오프스크린으로 렌더해 초상을
 * 굽는다.** 그러면 코드가 그린 그림이 아니라 **에셋으로 만든 그림**이 되고,
 * 덤으로 **지도 위의 그 사람과 도감의 그 사람이 같아진다** — 여태 둘은 서로
 * 다른 그림이었다(3D 는 GLB, 도감은 캔버스 도형).
 *
 *   of(kind, ref, w, h)    다 구웠으면 dataURL, 아니면 null (동기)
 *   warm(kind, ref, w, h)  굽기 시작한다. 되면 `sweep()` 이 화면을 갈아 끼운다
 *   sweep()                `[data-p3]` 가 붙은 <img> 를 훑어 src 를 바꾼다
 *
 * **되돌아가는 길이 그대로다.** three 가 없거나(2D 기기) GLB 를 못 받거나
 * (`file://` 단독판) 손잡이를 내리면 `null` 을 주고, 부르는 쪽은 여태 쓰던
 * `sprite.portraitCard` 그림을 그대로 쓴다. 화면은 안 빈다.
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

  /** 이 그림의 이름표. `<img data-p3="...">` 에 적히는 그 값이다 */
  function keyOf(kind, ref, w, h) {
    var id = (ref && (ref.id || ref.key || ref.name)) || 'x';
    return kind + ':' + id + ':' + Math.round(w) + 'x' + Math.round(h);
  }

  /** 이름표를 되읽는다 — `sweep()` 이 <img> 에서 무엇을 구울지 알아내는 자리 */
  function parseKey(s) {
    var m = /^([a-z]+):([^:]+):(\d+)x(\d+)$/.exec(String(s || ''));
    if (!m) { return null; }
    return { kind: m[1], id: m[2], w: +m[3], h: +m[4] };
  }

  /**
   * 카메라를 어디에 두나 — **키 1 로 눕힌 모델** 기준의 순수 계산이다.
   *
   * 얼굴만 크게 담으면 갓·도포가 잘리고, 온몸을 담으면 얼굴이 점이 된다.
   * 도감 카드는 세로가 길므로(150×172) **가슴 위**를 담는 것이 맞다.
   * `tall` 을 올리면 더 멀리서 온몸을 담는다(목록용 작은 그림).
   */
  function camPlan(w, h, tall) {
    var aspect = w / Math.max(1, h);
    /* 담을 세로 범위(모델 키에 대한 비율) — 카드는 가슴 위, 목록은 온몸 */
    var span = tall ? 1.12 : 0.62;
    var fov = 26;
    var dist = (span / 2) / Math.tan(fov * Math.PI / 360);
    /* 가로가 좁으면 그만큼 더 물러나야 어깨가 안 잘린다 */
    if (aspect < 1) { dist = dist / Math.max(0.55, aspect); }
    var look = tall ? 0.52 : 0.78;          // 바라보는 높이(키 1 기준)
    return {
      fov: fov, dist: dist, look: look, aspect: aspect,
      /* 살짝 옆에서 본다 — 정면만 보면 납작해 보인다 */
      yaw: 0.42, pitch: 0.06
    };
  }

  /* ── 여기서부터 three 가 필요하다 ─────────────────────── */

  var renderer = null, scene = null, camera = null, rig = null, failed = false;
  var cache = {};           // { key: dataURL }
  var pending = {};         // { key: true }  굽는 중
  var made = 0, gaveUp = 0;

  function ready() { return !!(three() && ON() && !failed); }

  /** 오프스크린 렌더러 — **한 번만** 만든다. 초상마다 만들면 컨텍스트가 넘친다 */
  function boot() {
    if (renderer || failed) { return !!renderer; }
    var t = three();
    if (!t) { failed = true; return false; }
    try {
      var cv = document.createElement('canvas');
      renderer = new t.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
      renderer.setClearColor(0x000000, 0);       // 배경은 2D 쪽에서 깐다
      renderer.setPixelRatio(1);
      scene = new t.Scene();
      camera = new t.PerspectiveCamera(26, 1, 0.01, 40);
      /* 조명은 지도와 같은 결로 — 인물이 지도에서 걸어 나온 것처럼 보여야 한다 */
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

  /** 세력·등급 빛깔 — 카드 배경을 여기서 곧바로 정한다(`sprite` 와 같은 규칙) */
  function colorsOf(kind, ref) {
    var D = global.DG.data;
    var isHero = kind === 'hero';
    var fac = isHero ? D.faction(ref.faction)
      : { color: ref.kind === 'divine' ? '#8a5cc0' : '#5f7a4a',
          mark: ref.kind === 'divine' ? '神' : '獸' };
    var rar = D.rarity[ref.rarity] || D.rarity[3];
    return { fac: fac, rar: rar };
  }

  /**
   * 카드 배경 — 세력색 그라디언트에 큼직한 문양, 테두리는 등급색.
   * `sprite.portraitCard` 가 그리던 그 결을 잇는다(그림만 모델로 바뀐 것이다).
   */
  function paintBack(c, w, h, kind, ref) {
    var col = colorsOf(kind, ref);
    var g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, shade(col.fac.color, 0.16));
    g.addColorStop(1, shade(col.fac.color, -0.52));
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    /* 세력 문양 — 종이에 찍은 도장처럼 옅게 */
    c.save();
    c.globalAlpha = 0.16;
    c.fillStyle = '#ffffff';
    c.font = '700 ' + Math.round(h * 0.52) + 'px "Malgun Gothic", serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(col.fac.mark, w * 0.5, h * 0.5);
    c.restore();
    /* 발밑 그림자 — 인물이 허공에 뜬 것처럼 보이지 않게 */
    c.save();
    c.globalAlpha = 0.3;
    c.fillStyle = '#000000';
    c.beginPath();
    c.ellipse(w * 0.5, h * 0.93, w * 0.28, h * 0.035, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
    return col;
  }

  /** 테두리는 **인물 위에** 얹는다 — 밑에 깔면 어깨가 테두리를 덮는다 */
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

  /**
   * 한 사람을 굽는다. 모델이 아직 안 왔으면 **아무것도 안 하고 false** —
   * 다 오면 `warm` 이 다시 부른다.
   */
  function bake(kind, ref, w, h, node) {
    var t = three();
    if (!boot()) { return null; }
    /* 모델이 아직 도형이면 굽지 않는다 — 도형을 구우면 여태 그림과 다를 게 없다 */
    if (!node || !node.userData || node.userData.assetState !== 'glb') { return null; }

    var plan = camPlan(w, h, false);
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var pw = Math.max(16, Math.round(w * dpr)), ph = Math.max(16, Math.round(h * dpr));

    while (rig.children.length) { rig.remove(rig.children[0]); }
    rig.add(node);
    node.position.set(0, 0, 0);
    node.scale.setScalar(1);
    node.rotation.set(0, Math.PI + plan.yaw, 0);

    /* **쉬는 자세를 한 번 굴려 준다.** 안 그러면 T 자로 굳은 채 찍힌다 —
       클립이 있으면 idle 로, 없으면(옮겨 입기 실패) 그대로 선다 */
    var A = global.DG.asset3d;
    try {
      if (A && A.step) { A.step(node, { t: 0, walking: false }); A.step(node, { t: 0.45, walking: false }); }
    } catch (e) { /* 자세를 못 잡아도 그림은 나온다 */ }

    camera.fov = plan.fov;
    camera.aspect = plan.aspect;
    camera.position.set(
      Math.sin(plan.pitch) * 0,
      plan.look + plan.dist * Math.sin(plan.pitch),
      plan.dist
    );
    camera.lookAt(0, plan.look, 0);
    camera.updateProjectionMatrix();

    renderer.setSize(pw, ph, false);
    renderer.render(scene, camera);

    /* 배경 → 인물 → 테두리 순으로 합친다 */
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

  /** 다 구워 뒀으면 그림, 아니면 null */
  function of(kind, ref, w, h) {
    if (!ready()) { return null; }
    return cache[keyOf(kind, ref, w, h)] || null;
  }

  /**
   * 굽기 시작한다. 모델을 받는 데 시간이 걸리므로 **여러 번 두드린다** —
   * `asset3d.build` 가 준 껍데기는 GLB 가 오는 순간 안이 갈리는데, 그 순간을
   * 알려 주지 않으므로 잠깐씩 다시 본다(최대 여남은 번, 그 뒤엔 포기한다).
   */
  function warm(kind, ref, w, h) {
    if (!ready() || !ref) { return false; }
    var key = keyOf(kind, ref, w, h);
    if (cache[key] || pending[key]) { return false; }
    var A3 = global.DG.actor3d;
    if (!A3 || !A3.build) { return false; }
    pending[key] = true;

    var node = null;
    try { node = A3.build(kind, ref); } catch (e) { node = null; }
    if (!node) { delete pending[key]; gaveUp++; return false; }

    var tries = 0;
    function tick() {
      var url = null;
      try { url = bake(kind, ref, w, h, node); } catch (e) { url = null; }
      if (url) {
        cache[key] = url;
        delete pending[key];
        sweep();
        return;
      }
      if (++tries > 24) {                       // 여남은 번 뒤엔 포기 — 도형 그림으로 남는다
        delete pending[key];
        gaveUp++;
        return;
      }
      global.setTimeout(tick, 220);
    }
    tick();
    return true;
  }

  /**
   * 화면에 이미 붙은 그림을 갈아 끼운다.
   *
   * 부르는 쪽(`ui.js`)은 여태처럼 `sprite` 그림으로 `<img>` 를 만들고,
   * 거기에 이름표(`data-p3`)만 붙여 둔다. 다 구워지면 여기서 `src` 만 바꾼다 —
   * **화면이 한 번도 비지 않는다.**
   */
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
    return {
      on: ON(), ready: ready(), failed: failed,
      made: made, gaveUp: gaveUp,
      cached: Object.keys(cache).length,
      baking: Object.keys(pending).length
    };
  }

  global.DG = global.DG || {};
  global.DG.portrait3d = {
    /* 값을 내는 함수 — three 없이도 돈다 */
    keyOf: keyOf, parseKey: parseKey, camPlan: camPlan,
    /* 굽기 — three 가 있어야 한다 */
    ready: ready, of: of, warm: warm, sweep: sweep, stats: stats,
    /** 진단이 제 뒤를 치울 때 */
    reset: function () { cache = {}; pending = {}; made = 0; gaveUp = 0; }
  };
})(window);
