/**
 * 초상 — 도감 카드의 그림을 **실제 그림 조각으로 합친다**
 * ---------------------------------------------------------------
 * 여태(2026-09-02 까지) 이 자리는 인물 GLB 를 오프스크린 3D 로 구워 썼다.
 * 인물 일흔의 초상 일러스트는 CC0 로 존재하지 않고("관우"·"이순신"의 그림을
 * 받아 올 곳이 없다), 3D 를 구우면 지도 위의 그 사람과 그림이 같아지는
 * 이점은 있었지만 — **막상 구운 그림 자체의 품질이 낮다**는 지적을 받았다.
 *
 * 그래서 다시 옮긴다. 이번엔 **실제 CC0 얼굴 그림 조각**을 인물 id 해시로
 * 골라 합성한다(3D 인물의 HERO_RECIPES 가 몸·옷·머리를 id 해시로 고르는
 * 것과 같은 요령). 이름값이 있는 대체재가 아니라 **그림 자체가 좋은
 * 대체재**를 노린다. 자세한 출처는 `assets/ASSET_LICENSES.md` 참고:
 *
 *   - **진지한(기본) 얼굴** — EverFace(CC0, OpenGameArt) 18 종. 사가국지 같은
 *     장수·군주 도감에 어울리는 그림체
 *   - **귀여운 얼굴(손잡이로 켠다)** — nonemo's Character Pack(CC0, itch.io)
 *     머리·피부·표정을 층층이 쌓는 조합형. "등신"(필드 몸 비례)과는
 *     별개 개념이라 독립 손잡이(`portrait3d.cute`)를 둔다
 *
 *   of(kind, ref, w, h)    다 만들었으면 dataURL, 아니면 null (동기)
 *   warm(kind, ref, w, h)  만들기 시작한다. 되면 `sweep()` 이 화면을 갈아 끼운다
 *   sweep()                `[data-p3]` 가 붙은 <img> 를 훑어 src 를 바꾼다
 *
 * **되돌아가는 길이 그대로다.** 손잡이(`portrait3d.on`)를 내리면 `null` 을
 * 주고, 부르는 쪽은 여태 쓰던 `sprite.portraitCard` 그림을 그대로 쓴다.
 * 화면은 안 빈다. **한 줄도 판정에 닿지 않는다.** 여기서 만드는 것은 그림뿐이다.
 */
(function (global) {
  'use strict';

  function core() { return global.DG.core; }

  /** 초상을 그림 조각으로 합칠까 — 0 이면 여태 쓰던 캔버스 그림 그대로(되돌림용) */
  function ON() { return core().tuned('portrait3d.on', 1) ? true : false; }
  /** 귀여운(nonemo) 얼굴로 — "등신"(필드 몸 비례)과는 무관한 별개 손잡이다 */
  function CUTE() { return core().tuned('portrait3d.cute', 0) ? true : false; }

  function ready() { return !!(ON() && global.DG.data); }

  /** 이 그림의 이름표. `<img data-p3="...">` 에 적히는 그 값이다 */
  function keyOf(kind, ref, w, h) {
    var id = (ref && (ref.id || ref.key || ref.name)) || 'x';
    return kind + ':' + id + ':' + Math.round(w) + 'x' + Math.round(h) + ':' + (CUTE() ? 'cute' : 'serious');
  }

  /** 이름표를 되읽는다 — `sweep()` 이 <img> 에서 무엇을 만들지 알아내는 자리 */
  function parseKey(s) {
    var m = /^([a-z]+):([^:]+):(\d+)x(\d+):(cute|serious)$/.exec(String(s || ''));
    if (!m) { return null; }
    return { kind: m[1], id: m[2], w: +m[3], h: +m[4], style: m[5] };
  }

  /** 문자열 해시 — 인물마다 늘 같은 조합이 나오게(세션이 바뀌어도) */
  function hash(s) {
    var h = 0;
    s = String(s);
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
    return h >>> 0;
  }

  /* ── 그림 조각 캐시 — <img> 는 한 번만 만든다, 나머지는 재사용 ────── */
  var imgCache = {};
  function img(src) {
    var im = imgCache[src];
    if (!im) { im = new Image(); im.src = src; imgCache[src] = im; }
    return im;
  }
  function loaded(im) { return !!(im && im.complete && im.naturalWidth); }

  var SERIOUS_N = 18;
  var HAIR_COL = ['black', 'blond', 'blue', 'brown', 'green', 'orange', 'red', 'violet', 'white'];
  var FRONT_STYLE = ['chupchik', 'curly', 'elegant'];
  var BACK_STYLE = ['curly', 'long'];
  var CUTE_FACE = ['smile', 'willing', 'cute', 'laughs', 'gloating'];

  /** 인물 id 하나에 늘 같은 조합을 준다(3D HERO_RECIPES 와 같은 요령) */
  function recipe(id) {
    var h = hash(id);
    return {
      serious: h % SERIOUS_N,
      tint: 1 + (h >>> 4) % 3,
      hairCol: HAIR_COL[(h >>> 6) % HAIR_COL.length],
      front: FRONT_STYLE[(h >>> 10) % FRONT_STYLE.length],
      back: BACK_STYLE[(h >>> 12) % BACK_STYLE.length],
      face: CUTE_FACE[(h >>> 14) % CUTE_FACE.length]
    };
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function drawSerious(c, w, h, rec) {
    var im = img('assets/sprites2d/portrait/serious/face_' + pad2(rec.serious) + '.png');
    if (!loaded(im)) { return false; }
    var sc = Math.min(w / im.naturalWidth, h / im.naturalHeight) * 0.92;
    var dw = im.naturalWidth * sc, dh = im.naturalHeight * sc;
    c.imageSmoothingEnabled = false;
    c.drawImage(im, (w - dw) / 2, (h - dh) * 0.42, dw, dh);
    return true;
  }

  function drawCute(c, w, h, rec) {
    var parts = [
      'skin/tint_' + rec.tint + '/head.png',
      'hairs/back/' + rec.back + '.' + rec.hairCol + '.png',
      'faces/' + rec.face + '.png',
      'hairs/front/' + rec.front + '.' + rec.hairCol + '.png'
    ];
    var imgs = [], i;
    for (i = 0; i < parts.length; i++) {
      var im = img('assets/sprites2d/portrait/cute/' + parts[i]);
      if (!loaded(im)) { return false; }
      imgs.push(im);
    }
    var iw = imgs[0].naturalWidth, ih = imgs[0].naturalHeight;
    var sc = Math.min(w / iw, h / ih) * 0.86;
    var dw = iw * sc, dh = ih * sc;
    var dx = (w - dw) / 2, dy = (h - dh) * 0.46;
    c.imageSmoothingEnabled = false;
    for (i = 0; i < imgs.length; i++) { c.drawImage(imgs[i], dx, dy, dw, dh); }
    return true;
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

  function shade(hex, amt) {
    var S = global.DG.sprite;
    if (S && S.shade) { return S.shade(hex, amt); }
    return hex;
  }

  /**
   * 카드 배경 — 세력색 그라디언트에 큼직한 문양, 테두리는 등급색.
   * 3D 굽기 때와 같은 결을 잇는다(그림 만드는 방식만 바뀐 것이다).
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
    return col;
  }

  /** 테두리는 **그림 위에** 얹는다 — 밑에 깔면 그림 가장자리가 테두리를 덮는다 */
  function paintFrame(c, w, h, col) {
    c.strokeStyle = col.rar && col.rar.color ? col.rar.color : '#8a94a6';
    c.lineWidth = 2;
    c.strokeRect(1, 1, w - 2, h - 2);
  }

  var cache = {};           // { key: dataURL | false }
  var pending = {};         // { key: true }  만드는 중
  var made = 0, gaveUp = 0;

  function has(key) { return Object.prototype.hasOwnProperty.call(cache, key); }

  /** 한 사람을 그림으로 만든다. 그림 조각이 아직 안 왔으면 null */
  function bake(kind, ref, w, h) {
    var id = (ref && (ref.id || ref.key || ref.name)) || 'x';
    var rec = recipe(id);
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var c = cv.getContext('2d');
    var col = paintBack(c, w, h, kind, ref);
    var ok = CUTE() ? drawCute(c, w, h, rec) : drawSerious(c, w, h, rec);
    if (!ok) { return null; }
    paintFrame(c, w, h, col);
    made++;
    try { return cv.toDataURL('image/png'); } catch (e) { return null; }
  }

  /** 다 만들어 뒀으면 그림, 아니면 null */
  function of(kind, ref, w, h) {
    if (!ready()) { return null; }
    return cache[keyOf(kind, ref, w, h)] || null;
  }

  /**
   * 만들기 시작한다. 그림 조각(<img>)이 처음이면 로드가 끝나기 전이라
   * 바로는 못 만든다 — 잠깐씩 다시 본다(최대 스무 번, 그 뒤엔 포기해
   * `cache[key] = false` 로 한 번만 적어 두고 다시 시도하지 않는다).
   * 3D 굽기와 달리 GPU 컨텍스트를 안 쓰므로 **여러 인물을 한꺼번에
   * 만들어도 화면이 안 끊긴다** — 줄(queue)이 필요 없다.
   */
  function warm(kind, ref, w, h) {
    if (!ready() || !ref) { return false; }
    var key = keyOf(kind, ref, w, h);
    if (has(key) || pending[key]) { return false; }
    pending[key] = true;

    var tries = 0;
    function tick() {
      var url = null;
      try { url = bake(kind, ref, w, h); } catch (e) { url = null; }
      if (url) {
        cache[key] = url;
        delete pending[key];
        sweep();
        return;
      }
      if (++tries > 20) {
        cache[key] = false;
        delete pending[key];
        gaveUp++;
        return;
      }
      global.setTimeout(tick, 120);
    }
    tick();
    return true;
  }

  /**
   * 화면에 이미 붙은 그림을 갈아 끼운다.
   *
   * 부르는 쪽(`ui.js`)은 여태처럼 `sprite` 그림으로 `<img>` 를 만들고,
   * 거기에 이름표(`data-p3`)만 붙여 둔다. 다 만들어지면 여기서 `src` 만
   * 바꾼다 — **화면이 한 번도 비지 않는다.**
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
      on: ON(), ready: ready(), failed: false,
      made: made, gaveUp: gaveUp,
      cached: Object.keys(cache).length,
      baking: Object.keys(pending).length
    };
  }

  global.DG = global.DG || {};
  global.DG.portrait3d = {
    /* 값을 내는 함수 */
    keyOf: keyOf, parseKey: parseKey,
    /* 만들기 */
    ready: ready, of: of, warm: warm, sweep: sweep, stats: stats,
    /** 진단이 제 뒤를 치울 때 */
    reset: function () { cache = {}; pending = {}; made = 0; gaveUp = 0; }
  };
})(window);
