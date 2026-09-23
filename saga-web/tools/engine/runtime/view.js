/**
 * 사가 엔진 — 그리기 공용(view). 편집기(edit)와 실행기(play)가 같이 쓴다. three.iife.js(전역 THREE)가 먼저 있어야 한다.
 *
 *   SagaView.setAssetBase({ lib, proj })   'lib:<판>/<assets 아래 경로>' · 'proj:<파일>' 을 실제 주소로 바꾸는 앞머리
 *   SagaView.renderer(canvas)              그림자·sRGB 켠 렌더러
 *   SagaView.env(sceneDef)                 하늘색·안개·빛·땅 묶음 { group, sun, apply(scene3), follow(x,z) }
 *   SagaView.entity(def)                   개체 한 벌(Group) — 도형은 곧바로, 모델은 받는 대로 바꿔 끼운다
 *   SagaView.place(obj, p, r, s)           자리·회전(도)·크기
 *   SagaView.animate(obj, moving, dt)      모델 몸짓(쉬기·걷기) — 이름에서 저절로 찾는다(look.anim 으로 고정 가능)
 *   SagaView.bounds(obj)                   경계 상자 크기(편집기가 몸 크기를 모델에 맞출 때)
 * 모델 look: model(주소) · fit(키 m — 받을 때 실제 경계로 키·발밑·가운데를 맞춘다) · 또는 scale(겉모습 배율)+dy(발밑 보정)
 *           · yaw(앞 방향 보정, 도) · anim{idle, move}(몸짓 이름 고정). 몸(충돌)은 개체 크기만 따른다 — 겉모습 배율과 따로다
 *
 * 개체 pos 는 발밑 가운데 — 도형 기하는 바닥이 y=0 이 되게 올려 둔다.
 */
(function (root) {
  'use strict';
  var T = root.THREE;
  var base = { lib: '/lib/', proj: '' };
  /* 그래픽 방식(프로젝트 graphics) — toon: 셀 셰이딩(3단 명암) · outline: 뒷면 외곽선 · 둘 다 saga-godot cel_toon 을 흉내 */
  var gstyle = { toon: false, outline: false, curve: 0 };
  function setStyle(o) { gstyle.toon = !!(o && o.toon); gstyle.outline = !!(o && o.outline); gstyle.curve = +(o && o.curve) || 0; }
  var gradTex = null;
  function gradient() {
    if (gradTex) { return gradTex; }
    var d = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
    gradTex = new T.DataTexture(d, 3, 1, T.RGBAFormat);
    gradTex.minFilter = gradTex.magFilter = T.NearestFilter; gradTex.generateMipmaps = false; gradTex.needsUpdate = true;
    return gradTex;
  }
  var outlineMat = null;
  function outline() {
    if (outlineMat) { return outlineMat; }
    outlineMat = new T.MeshBasicMaterial({ color: 0x1a1a22, side: T.BackSide });
    outlineMat.onBeforeCompile = function (sh) {
      sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed += normalize(normal) * (0.035 / max(1e-4, (length(modelMatrix[0].xyz) + length(modelMatrix[1].xyz) + length(modelMatrix[2].xyz)) / 3.0));');
    };
    return outlineMat;
  }
  /* 한 메시에 툰 재질·외곽선 입히기 */
  function stylize(m) {
    if (!m.isMesh || m.userData.styled) { return; }
    m.userData.styled = true;
    if (gstyle.toon && m.material && !m.material.isMeshToonMaterial && !m.material.isMeshBasicMaterial) {
      var o = m.material;
      m.material = new T.MeshToonMaterial({ color: o.color, map: o.map || null, gradientMap: gradient(), emissive: o.emissive || 0x000000,
        transparent: o.transparent, opacity: o.opacity, alphaTest: o.alphaTest || 0 });
    }
    if (gstyle.outline && m.geometry && m.geometry.attributes.normal) {
      try {
        var ol = m.isSkinnedMesh ? new T.SkinnedMesh(m.geometry, outline()) : new T.Mesh(m.geometry, outline());
        if (m.isSkinnedMesh) { ol.bind(m.skeleton, m.bindMatrix); }
        ol.userData.styled = true; ol.userData.outline = true; ol.castShadow = false; ol.raycast = function () {};
        m.add(ol);
      } catch (e) { /* 외곽선은 없어도 된다 */ }
    }
  }

  function setAssetBase(b) { for (var k in b) { base[k] = b[k]; } }
  function assetUrl(ref) {
    ref = String(ref || '');
    if (ref.indexOf('lib:') === 0) { return base.lib + ref.slice(4); }
    if (ref.indexOf('proj:') === 0) { return base.proj + ref.slice(5); }
    return ref;
  }

  function renderer(canvas) {
    var r = new T.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: false });
    r.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = T.PCFSoftShadowMap;
    if ('outputColorSpace' in r) { r.outputColorSpace = T.SRGBColorSpace; }
    return r;
  }

  /* ── 환경 ─────────────────────────────────────────────────────────────── */
  function env(sd) {
    var e = (sd && sd.env) || {};
    var g = new T.Group();
    var sky = new T.Color(e.sky || '#9fd0ff');
    var light = e.light == null ? 1 : +e.light;
    var hemi = new T.HemisphereLight(0xffffff, 0x556655, 0.9 * light);
    var fogFar = +e.fog || 0, groundCol = new T.Color((e.ground && e.ground.color) || '#7fb069');
    g.add(hemi);
    var sun = new T.DirectionalLight(0xffffff, 1.6 * light);
    sun.position.set(18, 30, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    var sc = sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 100;
    sun.shadow.bias = -0.0005;
    g.add(sun); g.add(sun.target);
    var ground = null;
    if (e.ground) {
      var size = +e.ground.size || 60;
      ground = new T.Mesh(new T.BoxGeometry(size, 1, size), new T.MeshStandardMaterial({ color: e.ground.color || '#7fb069', roughness: 1 }));
      ground.position.y = -0.5;
      ground.receiveShadow = true;
      ground.userData.ground = true;
      g.add(ground);
      /* 언덕(env.ground.hills) — 규칙과 같은 높이 함수로 판을 휜다. 비탈은 흙빛, 높은 곳은 밝게 */
      /* 둥근 세상(graphics.curve)은 정점마다 휘므로 평평한 땅도 촘촘한 판이어야 같이 굽는다 */
      var hl = e.ground.hills, SIM = root.SagaSim;
      if (((hl && +hl.height > 0) || gstyle.curve > 0) && SIM && SIM.terrainH) {
        var seg = Math.min(160, Math.max(24, Math.round(size / 0.75)));
        var pg = new T.PlaneGeometry(size, size, seg, seg);
        pg.rotateX(-Math.PI / 2);
        var pa = pg.attributes.position, cols = new Float32Array(pa.count * 3);
        for (var vi = 0; vi < pa.count; vi++) { pa.setY(vi, SIM.terrainH(e.ground, pa.getX(vi), pa.getZ(vi))); }
        pg.computeVertexNormals();
        var nrm = pg.attributes.normal, base = new T.Color(e.ground.color || '#7fb069'), dirt = new T.Color('#8a7355'), cc = new T.Color();
        for (vi = 0; vi < pa.count; vi++) {
          var slope = 1 - nrm.getY(vi), hk = Math.min(1, pa.getY(vi) / ((hl && +hl.height) || 1));
          cc.copy(base).lerp(dirt, Math.min(1, Math.max(0, (slope - 0.12) * 3))).multiplyScalar(0.92 + hk * 0.18);
          cols[vi * 3] = cc.r; cols[vi * 3 + 1] = cc.g; cols[vi * 3 + 2] = cc.b;
        }
        pg.setAttribute('color', new T.BufferAttribute(cols, 3));
        var hills = new T.Mesh(pg, new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1 }));
        hills.receiveShadow = true; hills.castShadow = true;
        hills.userData.ground = true;
        ground.position.y = -0.52;
        ground.add(hills); hills.position.y = 0.52;
        ground.userData.hills = hills;
      }
    }
    return {
      group: g, sun: sun, ground: ground, hemi: hemi,
      apply: function (scene3) {
        scene3.background = sky;
        scene3.fog = e.fog ? new T.Fog(sky, Math.max(1, +e.fog * 0.35), +e.fog) : null;
        scene3.add(g);
        this.scene3 = scene3;
      },
      /* 시간·날씨·계절 분위기(systems.js world) — skyCol 하늘 · k 빛 배수 · fogMul 안개 짙기 · tint 땅 색 배수 */
      mood: function (skyCol, k, fogMul, tint) {
        sky.copy(skyCol);
        hemi.intensity = 0.9 * light * Math.max(0.25, k);
        sun.intensity = 1.6 * light * Math.max(0.05, k);
        var sc3 = this.scene3;
        if (sc3) {
          var far = (fogFar || 140) / Math.max(0.3, fogMul);
          if (!sc3.fog) { sc3.fog = new T.Fog(sky, far * 0.35, far); }
          sc3.fog.color.copy(sky); sc3.fog.near = far * 0.35; sc3.fog.far = far;
        }
        if (ground && tint) { ground.material.color.copy(groundCol).multiply(tint); if (ground.userData.hills) { ground.userData.hills.material.color.setRGB(1, 1, 1).multiply(tint); } }
      },
      /* 그림자 상자를 따라다니게 */
      follow: function (x, y, z) {
        sun.position.set(x + 18, y + 30, z + 12);
        sun.target.position.set(x, y, z);
      }
    };
  }

  /* ── 도형 ─────────────────────────────────────────────────────────────── */
  var geoCache = {};
  function geo(shape) {
    if (geoCache[shape]) { return geoCache[shape]; }
    var gm;
    switch (shape) {
      case 'sphere': gm = new T.SphereGeometry(0.5, 28, 18); gm.translate(0, 0.5, 0); break;
      case 'cylinder': gm = new T.CylinderGeometry(0.5, 0.5, 1, 28); gm.translate(0, 0.5, 0); break;
      case 'cone': gm = new T.ConeGeometry(0.5, 1, 28); gm.translate(0, 0.5, 0); break;
      case 'capsule': gm = new T.CapsuleGeometry(0.4, 1.0, 6, 16); gm.translate(0, 0.9, 0); break;
      case 'plane': gm = new T.BoxGeometry(1, 0.05, 1); gm.translate(0, 0.025, 0); break;
      case 'torus': gm = new T.TorusGeometry(0.35, 0.15, 14, 28); gm.translate(0, 0.5, 0); break;
      default: gm = new T.BoxGeometry(1, 1, 1); gm.translate(0, 0.5, 0);
    }
    geoCache[shape] = gm;
    return gm;
  }
  function mat(color, glow) {
    var c = new T.Color(color || '#cccccc');
    return new T.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0.05, emissive: glow ? c.clone().multiplyScalar(0.45) : 0x000000 });
  }

  function label(text) {
    var cv = root.document.createElement('canvas');
    var ctx = cv.getContext('2d');
    var fs = 40;
    if (!ctx) { return new T.Object3D(); }
    ctx.font = 'bold ' + fs + 'px "Malgun Gothic", sans-serif';
    var w = Math.ceil(ctx.measureText(text).width) + 24;
    cv.width = w; cv.height = fs + 20;
    ctx.font = 'bold ' + fs + 'px "Malgun Gothic", sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(0, 0, w, cv.height, 14); ctx.fill(); } else { ctx.fillRect(0, 0, w, cv.height); }
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillText(text, w / 2, cv.height / 2 + 2);
    var tex = new T.CanvasTexture(cv);
    if ('colorSpace' in tex) { tex.colorSpace = T.SRGBColorSpace; }
    var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, depthTest: false, transparent: true, sizeAttenuation: false }));
    /* 화면 고정 크기 — 멀어도 안 작아지고 가까워도 화면을 덮지 않는다(1 = 시야 60도에서 화면 높이의 약 0.87) */
    var h = 0.034;
    sp.scale.set(h * w / cv.height, h, 1);
    sp.userData.base = [h * w / cv.height, h];
    sp.renderOrder = 10;
    return sp;
  }

  /* ── 모델 ─────────────────────────────────────────────────────────────── */
  var gltfCache = {};
  var loader = null;
  function loadGLTF(url) {
    if (gltfCache[url]) { return gltfCache[url]; }
    if (!T.GLTFLoader) { return Promise.reject(new Error('GLTFLoader 없음')); }
    if (!loader) {
      loader = new T.GLTFLoader();
      if (T.MeshoptDecoder && loader.setMeshoptDecoder) { loader.setMeshoptDecoder(T.MeshoptDecoder); }
    }
    gltfCache[url] = new Promise(function (ok, no) { loader.load(url, ok, undefined, no); });
    return gltfCache[url];
  }
  function cloneScene(gltf) {
    var s = T.SkeletonUtils && T.SkeletonUtils.clone ? T.SkeletonUtils.clone(gltf.scene) : gltf.scene.clone(true);
    s.traverse(function (o) {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true;
        /* 법선 없는 모델·unlit 재질은 빛을 안 받는다 — 표준 재질로 바꿔 장면 빛과 어울리게 */
        if (o.material && o.material.isMeshBasicMaterial) {
          var m = o.material;
          o.material = new T.MeshStandardMaterial({ map: m.map, color: m.color, transparent: m.transparent, alphaTest: m.alphaTest, roughness: 0.85 });
        }
        if (!o.geometry.attributes.normal) { o.geometry.computeVertexNormals(); }
      }
    });
    return s;
  }

  function faceMarker(color) {
    var m = new T.Mesh(new T.BoxGeometry(0.5, 0.18, 0.12), new T.MeshStandardMaterial({ color: new T.Color(color || '#222').multiplyScalar(0.35), roughness: 0.4 }));
    m.position.set(0, 1.45, 0.36);
    m.castShadow = true;
    return m;
  }

  /* 개체 한 벌 */
  function entity(def, opt) {
    opt = opt || {};
    var look = def.look || {}, shape = look.shape || 'box';
    var g = new T.Group();
    g.userData.id = def.id;
    var inner = new T.Group();       // 모양만(편집기 강조·깜빡임 대상)
    g.add(inner);
    g.userData.inner = inner;
    if (shape === 'model') {
      var ph = new T.Mesh(geo('box'), new T.MeshStandardMaterial({ color: 0x9999aa, wireframe: true }));
      inner.add(ph);
      loadGLTF(assetUrl(look.model)).then(function (gltf) {
        inner.remove(ph);
        var s = cloneScene(gltf);
        if (look.yaw) { s.rotation.y = look.yaw * Math.PI / 180; }
        if (+look.fit > 0) {
          /* 키 맞추기 — 받은 모델의 실제 경계를 재서 키가 fit(m)이 되게 줄이고, 바닥을 발밑에, 가운데를 원점에 */
          s.updateMatrixWorld(true);
          var bb = new T.Box3().setFromObject(s), sz = new T.Vector3();
          bb.getSize(sz);
          if (sz.y > 1e-6) {
            var k = +look.fit / sz.y;
            s.scale.multiplyScalar(k);
            s.position.set(-(bb.min.x + bb.max.x) / 2 * k, -bb.min.y * k, -(bb.min.z + bb.max.z) / 2 * k);
          }
        } else {
          if (+look.scale > 0) { s.scale.multiplyScalar(+look.scale); }
          if (look.dy) { s.position.y = +look.dy || 0; }
        }
        inner.add(s);
        if (!opt.edit) { s.traverse(stylize); }
        if (gltf.animations && gltf.animations.length) {
          var mixer = new T.AnimationMixer(s);
          g.userData.mixer = mixer;
          g.userData.clips = gltf.animations;
          g.userData.animPick = look.anim || {};
          g.userData.cur = null;
          animate(g, false, 0);
        }
        if (opt.onLoad) { opt.onLoad(g); }
      }, function (err) {
        ph.material.color.set(0xff3344);
        g.userData.loadError = String(err && err.message || err);
        if (opt.onLoad) { opt.onLoad(g); }
      });
    } else if (shape === 'none') {
      if (opt.edit) {
        var mk = new T.Mesh(new T.OctahedronGeometry(0.35), new T.MeshBasicMaterial({ color: 0xffaa00, wireframe: true }));
        mk.position.y = 0.4;
        inner.add(mk);
      }
    } else {
      var m = new T.Mesh(geo(shape), mat(look.color, look.glow));
      m.castShadow = true; m.receiveShadow = true;
      inner.add(m);
      if (shape === 'capsule' && def.comps && (def.comps.player || def.comps.talk || def.comps.chase || def.comps.foe || def.comps.follow)) { inner.add(faceMarker(look.color)); }
      if (!opt.edit) { inner.traverse(stylize); }
    }
    if (look.label) {
      var lb = label(look.label);
      var bh = (def.body && def.body.size ? def.body.size[1] : (shape === 'capsule' || shape === 'model' ? 1.8 : 1));
      lb.position.y = bh + 0.45;
      g.add(lb);
      g.userData.label = lb;
    }
    return g;
  }

  function place(obj, p, r, s) {
    obj.position.set(p[0], p[1], p[2]);
    obj.rotation.set((r[0] || 0) * Math.PI / 180, (r[1] || 0) * Math.PI / 180, (r[2] || 0) * Math.PI / 180, 'YXZ');
    obj.scale.set(s[0], s[1], s[2]);
    /* 이름표는 개체 크기를 따라 커지지 않게 */
    var lb = obj.userData.label;
    if (lb && lb.userData.base) { lb.scale.set(lb.userData.base[0] / (s[0] || 1), lb.userData.base[1] / (s[1] || 1), 1); }
  }

  function findClip(clips, want, pats) {
    if (want) { for (var i = 0; i < clips.length; i++) { if (clips[i].name === want) { return clips[i]; } } }
    for (var p = 0; p < pats.length; p++) {
      for (var j = 0; j < clips.length; j++) { if (pats[p].test(clips[j].name)) { return clips[j]; } }
    }
    return null;
  }
  function animate(obj, moving, dt, fast) {
    var u = obj.userData;
    if (!u.mixer) { return; }
    var pick = u.animPick || {};
    var clip = moving ? (findClip(u.clips, pick.move, fast ? [/^run$/i, /run/i, /walk/i] : [/^walk$/i, /walk/i, /run/i]) || findClip(u.clips, pick.idle, [/idle/i]))
                      : findClip(u.clips, pick.idle, [/^idle$/i, /idle/i, /stand/i]);
    if (!clip) { clip = u.clips[0]; }
    if (u.cur !== clip) {
      var act = u.mixer.clipAction(clip);
      act.reset().fadeIn(0.18).play();
      if (u.curAct) { u.curAct.fadeOut(0.18); }
      u.cur = clip; u.curAct = act;
    }
    if (dt) { u.mixer.update(dt); }
  }

  function bounds(obj) {
    var b = new T.Box3().setFromObject(obj.userData.inner || obj);
    if (b.isEmpty()) { return null; }
    var sz = new T.Vector3(); b.getSize(sz);
    var s = obj.scale;
    return { size: [sz.x / (s.x || 1), sz.y / (s.y || 1), sz.z / (s.z || 1)], min: b.min.clone(), max: b.max.clone() };
  }

  function dispose(obj) {
    obj.traverse(function (o) {
      if (o.isSprite && o.material) { if (o.material.map) { o.material.map.dispose(); } o.material.dispose(); }
    });
  }

  root.SagaView = {
    setAssetBase: setAssetBase, assetUrl: assetUrl, renderer: renderer, env: env, entity: entity, place: place,
    animate: animate, bounds: bounds, loadGLTF: loadGLTF, geo: geo, mat: mat, label: label, dispose: dispose, setStyle: setStyle, stylize: stylize
  };
})(typeof window !== 'undefined' ? window : globalThis);
