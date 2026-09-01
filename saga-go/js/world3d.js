/**
 * 3D 렌더러 — 원작(포켓몬GO)의 화면을 WebGL 로 옮긴다
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  var T = null;
  var renderer = null, scene = null, camera = null;
  var sun = null, sky = null;
  var groundGroup = null, propGroup = null, actorGroup = null, fxGroup = null;
  var tileMeshes = {};
  var propMeshes = {};
  var actors = {};
  var texCache = {};
  var ready = false, failed = false;
  var canvas = null;
  var frame = 0;
  var lightNow = null;

  function TILE_SPAN() { return core.tuned('world3d.tileSpan', 3); }
  function PF(key) { var P = global.DG.perf; return P ? P.mul(key) : 1; }
  function PROP_R() { return core.tuned('world3d.propRadius', 260) * PF('radius'); }
  function PROP_UR(R) { return R * core.tuned('world3d.unloadRadius', 1.4); }
  function LOD_NEAR() { return core.tuned('world3d.lodNear', 90) * PF('radius'); }
  function SWAY_ON() { return core.tuned('world3d.sway', 1) ? true : false; }
  function SWAY_AMT() { return core.tuned('world3d.swayAmt', 0.06); }
  function FLAME_ON() { return core.tuned('world3d.flame', 1) ? true : false; }
  function FLAME_AMT() { return core.tuned('world3d.flameAmt', 0.18); }
  function SMOKE_ON() { return core.tuned('world3d.smoke', 1) ? true : false; }
  function CAM_DIST() { return core.tuned('world3d.camDist', 40); }
  function CAM_HIGH() { return core.tuned('world3d.camHeight', 15); }
  function ACTOR_H() { return core.tuned('world3d.actorH', 3.4); }
  function MAP_STYLE() { return core.tuned('world3d.mapStyle', 1); }
  function MESH_ON() { var P = global.DG.perf; if (P && !P.meshOk()) { return false; } return core.tuned('world3d.mesh', 1) ? true : false; }
  function DENSITY() { return core.tuned('world3d.density', 1) * PF('prop'); }
  function DAYNIGHT() { return core.tuned('world3d.dayNight', 0) ? true : false; }
  function WET() { return core.tuned('world3d.wetRiver', 1) ? true : false; }
  function PORTRAIT_FIT() { return core.tuned('world3d.portraitFit', 1) ? true : false; }
  function PORTRAIT_MAX() { return core.tuned('world3d.portraitMax', 1.8); }
  function FOV() { return core.tuned('world3d.fov', 52); }
  function FOV_MAX() { return core.tuned('world3d.fovMax', 80); }

  var REF_ASPECT = 1.5;
  var DEG = 180 / Math.PI;
  function fovFor(w, h) {
    var base = FOV();
    if (!PORTRAIT_FIT() || !w || !h) { return base; }
    var a = w / h;
    if (a >= REF_ASPECT) { return base; }
    var mul = Math.min(PORTRAIT_MAX(), Math.sqrt(REF_ASPECT / a));
    var t = Math.tan(base / 2 / DEG) * mul;
    return Math.min(FOV_MAX(), 2 * Math.atan(t) * DEG);
  }

  function wanted() { return core.tuned('world.render3d', 1) ? true : false; }
  function available() { return ready && !failed; }
  function active() { return available() && wanted(); }

  function mixHex(a, b, k) {
    k = k < 0 ? 0 : (k > 1 ? 1 : k);
    var ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    var br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    return (Math.round(ar + (br - ar) * k) << 16) | (Math.round(ag + (bg - ag) * k) << 8) | Math.round(ab + (bb - ab) * k);
  }
  function lum(hex) { return (((hex >> 16) & 255) * 0.299 + ((hex >> 8) & 255) * 0.587 + (hex & 255) * 0.114) / 255; }

  var C_NIGHT = { sun: 0xd0dcf5, sky: 0x5a719f, hemiSky: 0x6e8ab5, hemiGnd: 0x565f70, tint: 0x939cb6 };
  var C_GOLD = { sun: 0xffab63, sky: 0xe8946a, hemiSky: 0xf0b48a, hemiGnd: 0x4a4038, tint: 0xffd2b0 };
  var C_DAY = { sun: 0xfff0d0, sky: 0x8fb6d8, hemiSky: 0xdce9ff, hemiGnd: 0x53604a, tint: 0xffffff };

  function lightingAt(ms, wkey) {
    var d = new Date(ms === undefined ? Date.now() : ms);
    var hour = d.getHours() + d.getMinutes() / 60;
    var alt = Math.sin((hour - 6) / 12 * Math.PI);
    if (!DAYNIGHT()) { alt = 0.9; hour = 12; }

    var phase = alt > 0.30 ? 'day' : (alt > 0.04 ? (hour < 12 ? 'dawn' : 'dusk') : (alt > -0.14 ? 'twilight' : ((hour < 4) ? 'deepnight' : 'night')));
    var k = Math.max(0, Math.min(1, (alt + 0.14) / 0.62));
    var gold = Math.max(0, 1 - Math.abs(alt - 0.10) / 0.36);

    function pick(field) {
      var base = mixHex(C_NIGHT[field], C_DAY[field], k);
      return mixHex(base, C_GOLD[field], gold * 0.75);
    }

    var out = {
      hour: hour, alt: alt, phase: phase, night: phase === 'night',
      sun: { hex: pick('sun'), intensity: 1.7 + Math.max(0, alt) * 0.23, x: -Math.cos((hour - 6) / 12 * Math.PI) * 120, y: 40 + Math.abs(alt) * 110, z: -70 - Math.max(0, alt) * 40 },
      hemi: { sky: pick('hemiSky'), ground: pick('hemiGnd'), intensity: 1.4 + k * 0.27 },
      bg: pick('sky'), tint: pick('tint'),
      fog: { near: 90 + k * 170, far: 320 + k * 440 },
      lamp: alt < 0.06 ? Math.min(1, (0.06 - alt) * 4) : 0
    };

    if (phase === 'deepnight') {
      out.sun.intensity *= 0.90; out.hemi.intensity *= 0.90;
      out.bg = mixHex(out.bg, 0x05070c, 0.36); out.tint = mixHex(out.tint, 0x2a3040, 0.18); out.lamp = 1;
    }

    var w = wkey || 'clear';
    if (w === 'rain') { out.sun.intensity *= 0.48; out.hemi.intensity *= 0.80; out.bg = mixHex(out.bg, 0x55606e, 0.55); out.tint = mixHex(out.tint, 0x8f99a8, 0.45); out.fog.far *= 0.46; out.fog.near *= 0.7; }
    else if (w === 'snow') { out.sun.intensity *= 0.66; out.hemi.intensity *= 1.05; out.bg = mixHex(out.bg, 0xc8d2de, 0.55); out.tint = mixHex(out.tint, 0xe0e8f0, 0.45); out.fog.far *= 0.52; }
    else if (w === 'fog') { out.sun.intensity *= 0.55; out.hemi.intensity *= 0.92; out.bg = mixHex(out.bg, 0xb8bcc0, 0.6); out.tint = mixHex(out.tint, 0xc2c6ca, 0.35); out.fog.far *= 0.26; out.fog.near *= 0.35; }
    else if (w === 'cloud') { out.sun.intensity *= 0.70; out.hemi.intensity *= 0.94; out.bg = mixHex(out.bg, 0x8a929c, 0.42); out.tint = mixHex(out.tint, 0xb8bec6, 0.28); out.fog.far *= 0.78; }
    else if (w === 'wind') { out.fog.far *= 1.15; }
    out.weather = w;
    return out;
  }

  var forcedMs = null;
  function forceTime(ms) { forcedMs = (ms === null || ms === undefined) ? null : ms; return forcedMs; }
  function weatherKey() { var W = global.DG.weather; return W ? W.current().key : 'clear'; }

  function init(cv) {
    if (ready || failed) { return available(); }
    T = global.THREE || null;
    canvas = cv || document.getElementById('map3d');
    if (!T || !canvas) { failed = true; return false; }
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, preserveDrawingBuffer: !!global.DG_3D_PRESERVE });
      renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = T.SRGBColorSpace;
      if (!(global.DG_3D_DEBUG || {}).noShadow) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; }
    } catch (e) { failed = true; return false; }

    scene = new T.Scene();
    var L0 = lightingAt(undefined, weatherKey());
    var skyCol = new T.Color(L0.bg);
    scene.background = skyCol;
    renderer.setClearColor(skyCol, 1);
    if (!(global.DG_3D_DEBUG || {}).noFog) { scene.fog = new T.Fog(L0.bg, L0.fog.near, L0.fog.far); }

    // [SAGA 리뉴얼 패치: PBR 환경맵(IBL) 추가]
    var envData = new Uint8Array([180, 190, 210, 255]);
    var envTex = new T.DataTexture(envData, 1, 1, T.RGBAFormat);
    envTex.colorSpace = T.SRGBColorSpace;
    envTex.needsUpdate = true;
    envTex.mapping = T.EquirectangularReflectionMapping;
    scene.environment = envTex;

    camera = new T.PerspectiveCamera(fovFor(canvas.clientWidth || global.innerWidth, canvas.clientHeight || global.innerHeight), 1, 0.5, 1400);

    sky = new T.HemisphereLight(L0.hemi.sky, L0.hemi.ground, L0.hemi.intensity); scene.add(sky);
    sun = new T.DirectionalLight(L0.sun.hex, L0.sun.intensity);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 400;
    sun.shadow.camera.left = -140; sun.shadow.camera.right = 140;
    sun.shadow.camera.top = 140; sun.shadow.camera.bottom = -140;
    sun.shadow.bias = -0.0012;
    scene.add(sun); scene.add(sun.target);

    if (global.DG.post3d) { global.DG.post3d.init(T, renderer); }

    groundGroup = new T.Group(); scene.add(groundGroup);
    propGroup = new T.Group(); scene.add(propGroup);
    actorGroup = new T.Group(); scene.add(actorGroup);
    fxGroup = new T.Group(); scene.add(fxGroup);

    bindEvents();
    if (global.DG.prop3d) { global.DG.prop3d.preload(); }
    preloadLandTex();
    ready = true;
    resize();
    return true;
  }

  function resize() {
    if (!available() || !canvas) { return; }
    var w = canvas.clientWidth || global.innerWidth;
    var h = canvas.clientHeight || global.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.fov = fovFor(w, h);
    camera.updateProjectionMatrix();
    if (global.DG.post3d) { global.DG.post3d.resize(); }
  }

  function tileTexture(img) {
    if (!img || !img.ready) { return null; }
    var key = img.src;
    if (texCache[key]) { return texCache[key]; }
    var tex = new T.Texture(img);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4; tex.needsUpdate = true;
    texCache[key] = tex;
    return tex;
  }

  var LAND_COLOR = { grass: '#8fae6a', forest: '#5c7f4e', mount: '#9a9188', water: '#4a7fa6', road: '#c9bfa8', town: '#c2b49a', farm: '#7f9c5e' };
  function LAND_PAINT() { return core.tuned('world3d.landPaint', 1) ? true : false; }
  function PAINT_A() { return core.tuned('world3d.landPaintAlpha', 0.88); }

  var LAND_TEX_URL = { grass: 'assets/textures/land/grass.jpg', forest: 'assets/textures/land/forest.jpg', mount: 'assets/textures/land/mount.jpg', road: 'assets/textures/land/road.jpg', town: 'assets/textures/land/town.jpg', farm: 'assets/textures/land/farm.jpg' };
  var LAND_TEX_IMG = {};
  function landTexImg(kind) {
    if (LAND_TEX_IMG[kind]) { return LAND_TEX_IMG[kind]; }
    var img = new Image(); var url = LAND_TEX_URL[kind];
    if (url) { img.onload = function () { img.ready = true; }; img.src = url; }
    LAND_TEX_IMG[kind] = img; return img;
  }
  var LAND_TEX_METERS = 12;
  function landPattern(c, kind, x0, y0, k) {
    var img = landTexImg(kind);
    if (!img.ready || !img.naturalWidth || !c.createPattern) { return null; }
    var pat = c.createPattern(img, 'repeat');
    if (!pat || !pat.setTransform || typeof DOMMatrix === 'undefined') { return pat; }
    var side = LAND_TEX_METERS * k;
    var tx = -(((x0 % LAND_TEX_METERS) + LAND_TEX_METERS) % LAND_TEX_METERS) * k;
    var ty = -(((y0 % LAND_TEX_METERS) + LAND_TEX_METERS) % LAND_TEX_METERS) * k;
    pat.setTransform(new DOMMatrix([side / img.naturalWidth, 0, 0, side / img.naturalHeight, tx, ty]));
    return pat;
  }

  function landTexReadyKey() {
    var s = '', k;
    for (k in LAND_TEX_URL) { if (LAND_TEX_URL.hasOwnProperty(k)) { s += (LAND_TEX_IMG[k] && LAND_TEX_IMG[k].ready) ? '1' : '0'; } }
    return s;
  }
  function preloadLandTex() {
    var k;
    for (k in LAND_TEX_URL) { if (LAND_TEX_URL.hasOwnProperty(k)) { landTexImg(k); } }
  }

  var landTex = {};
  function shadeHex(hex, k) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, bb = n & 255;
    function f(v) { return Math.max(0, Math.min(255, Math.round(v * (1 + k)))); }
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(bb) + ')';
  }

  function landTexture(key, x0, y0, span, img) {
    var L = global.DG.land;
    if (!LAND_PAINT() || !L || !L.on()) { return null; }
    var g0x = Math.floor(x0 / GRID), g1x = Math.floor((x0 + span) / GRID);
    var g0y = Math.floor(y0 / GRID), g1y = Math.floor((y0 + span) / GRID);
    var gx, gy, any = false;
    for (gy = g0y; gy <= g1y && !any; gy++) {
      for (gx = g0x; gx <= g1x && !any; gx++) { if (L.owns(gx, gy)) { any = true; } }
    }
    if (!any) { return null; }

    var SSk = global.DG.season;
    var ck = key + '|' + (img && img.ready ? 'i' : 'n') + '|' + landTexReadyKey() + '|' + Math.round(PAINT_A() * 100) + '|' + (SSk ? SSk.now().key : '-');
    if (landTex[ck]) { return landTex[ck]; }

    var S = 256; var cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    var c = cv.getContext('2d');
    if (img && img.ready) { c.drawImage(img, 0, 0, S, S); } else { c.fillStyle = '#d7dbe0'; c.fillRect(0, 0, S, S); }

    var k = S / span; var a0 = PAINT_A();
    for (gy = g0y; gy <= g1y; gy++) {
      for (gx = g0x; gx <= g1x; gx++) {
        var at = L.at(gx, gy);
        if (!at) { continue; }
        var near = 0;
        if (L.owns(gx + 1, gy)) { near++; }
        if (L.owns(gx - 1, gy)) { near++; }
        if (L.owns(gx, gy + 1)) { near++; }
        if (L.owns(gx, gy - 1)) { near++; }
        c.globalAlpha = a0 * (near === 4 ? 1 : (0.62 + 0.09 * near));
        var SSc = global.DG.season;
        var baseCol = LAND_COLOR[at.kind] || LAND_COLOR.grass;
        if (SSc) { baseCol = SSc.landColor(at.kind, baseCol); }
        var rx = Math.round((gx * GRID - x0) * k), ry = Math.round((gy * GRID - y0) * k);
        var rw = Math.round((gx * GRID + GRID - x0) * k) - rx, rh = Math.round((gy * GRID + GRID - y0) * k) - ry;
        var pat = landPattern(c, at.kind, gx * GRID, gy * GRID, k);
        if (pat) {
          c.fillStyle = pat; c.fillRect(rx, ry, rw, rh);
          var seasonAlpha = c.globalAlpha;
          c.globalAlpha = seasonAlpha * 0.30;
          c.globalCompositeOperation = 'multiply'; c.fillStyle = baseCol; c.fillRect(rx, ry, rw, rh);
          c.globalCompositeOperation = 'source-over'; c.globalAlpha = seasonAlpha;
        } else {
          c.fillStyle = shadeHex(baseCol, (h1(gx * 17 + 5, gy * 23 + 9) - 0.5) * 0.06);
          c.fillRect(rx, ry, rw, rh);
        }
      }
    }
    c.globalAlpha = 1;

    var tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
    landTex[ck] = tex;
    return tex;
  }

  function RELIEF() { return global.DG.relief3d || null; }
  function RELIEF_ON() { var R = RELIEF(); return !!(R && R.on()); }
  function RELIEF_SEG() { return Math.max(1, Math.round(core.tuned('relief3d.seg', 8))); }
  function groundY(x, z) { var R = RELIEF(); return R ? R.heightAt(x, z) : 0; }

  function liftTile(mesh, x0, z0, span) {
    if (!RELIEF_ON()) { return false; }
    var mark = Math.round(x0) + '/' + Math.round(z0) + '/' + Math.round(span);
    if (mesh.userData.lifted === mark) { return false; }
    var pos = mesh.geometry.getAttribute('position');
    if (!pos) { return false; }
    var i;
    for (i = 0; i < pos.count; i++) {
      var lx = pos.getX(i), ly = pos.getY(i);
      var wx = x0 + span / 2 + lx, wz = z0 + span / 2 - ly;
      pos.setZ(i, groundY(wx, wz));
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.userData.lifted = mark;
    return true;
  }

  function syncGround(W) {
    var mpp = W.metersPerPixel();
    var span = W.TILE_PX * mpp;
    var pos = core.save.player.pos;
    var ll = W.worldToLatLng(pos.x, pos.y);
    var px = W.latLngToPixel(ll.lat, ll.lng);
    var cx = Math.floor(px.x / W.TILE_PX), cy = Math.floor(px.y / W.TILE_PX);
    var R = TILE_SPAN(), live = {};
    var tint = lightNow ? lightNow.tint : 0xffffff;

    for (var dy = -R; dy <= R; dy++) {
      for (var dx = -R; dx <= R; dx++) {
        var tx = cx + dx, ty = cy + dy;
        var key = tx + '/' + ty;
        live[key] = 1;
        var mesh = tileMeshes[key];
        var corner = worldOfLatLng(tile2lat(ty, W), tile2lng(tx, W));
        if (!mesh) {
          var seg = RELIEF_ON() ? RELIEF_SEG() : 1;
          var geo = new T.PlaneGeometry(span, span, seg, seg);
          var mat = new T.MeshLambertMaterial({ color: 0x1a1f28 });
          mesh = new T.Mesh(geo, mat);
          mesh.rotation.x = -Math.PI / 2;
          mesh.receiveShadow = true;
          groundGroup.add(mesh);
          tileMeshes[key] = mesh;
          mesh.userData.lifted = '';
        }
        mesh.position.set(corner.x + span / 2, -0.02, corner.y + span / 2);
        liftTile(mesh, corner.x, corner.y, span);

        var img = W.getTile(tx, ty, W.ZOOM, MAP_STYLE());
        var tex = landTexture(key, corner.x, corner.y, span, img) || tileTexture(img);
        if (tex) {
          if (mesh.material.map !== tex) { mesh.material.map = tex; mesh.material.needsUpdate = true; }
          mesh.material.color.setHex(tint);
        } else {
          mesh.material.color.setHex(mixHex(0xd7dbe0, tint, 0.85));
        }
      }
    }
    for (var k in tileMeshes) {
      if (!Object.prototype.hasOwnProperty.call(tileMeshes, k) || live[k]) { continue; }
      var m = tileMeshes[k];
      groundGroup.remove(m); m.geometry.dispose(); delete tileMeshes[k];
    }
  }

  function tile2lng(x, W) { return x / Math.pow(2, W.ZOOM) * 360 - 180; }
  function tile2lat(y, W) { var n = Math.PI - 2 * Math.PI * y / Math.pow(2, W.ZOOM); return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); }
  function worldOfLatLng(lat, lng) { var o = global.DG.world.origin; var mPerLat = 111320, mPerLng = 111320 * Math.cos(o.lat * Math.PI / 180); return { x: (lng - o.lng) * mPerLng, y: -(lat - o.lat) * mPerLat }; }

  var GRID = 48;
  var FAR_NEAR = 45, FAR_MAX = 4;
  function h1(a, b) { return Math.min(0.999999, core.hash2(a, b) * 2); }
  function urbanity(gx, gy) { var broad = h1(Math.floor(gx / 5) * 131 + 7, Math.floor(gy / 5) * 197 + 11); var fine = h1(gx * 31 + 3, gy * 57 + 5); return Math.min(1, broad * 0.72 + fine * 0.42); }

  function propPlan(kind, gx, gy, mapped) {
    var out = [], i, n;
    var u = urbanity(gx, gy);
    var dens = DENSITY();
    var half = GRID * 0.42;
    var RG = global.DG.land;
    var authored = !!(RG && RG.owns(gx, gy));
    var wk0 = weatherKey();
    var wet = WET() && (wk0 === 'rain' || wk0 === 'snow');
    if (authored) { var lu = RG.urbanity(gx, gy); if (lu !== null) { u = lu; } }
    
    function spot(seed) { return { x: (h1(gx * 3 + seed * 13, gy * 7 + seed * 5) * 2 - 1) * half, z: (h1(gx * 11 + seed * 3, gy * 17 + seed * 29) * 2 - 1) * half }; }

    if (kind === 'town') {
      n = Math.round((1 + u * 7) * dens);
      for (i = 0; i < n; i++) {
        var s = spot(i); var hh = h1(gx * 13 + i, gy * 19 + i * 3); var tall = u > 0.62 && hh > 0.55; var w = 5 + hh * (tall ? 5 : 7);
        out.push({ t: tall ? 'tower' : 'house', x: s.x, z: s.z, w: w, d: w * (0.8 + hh * 0.5), h: tall ? (12 + hh * 22) * (0.6 + u * 0.8) : 4 + hh * 4, rot: h1(gx + i * 7, gy - i * 5) * Math.PI, shade: 0.30 + hh * 0.46, roof: !tall });
      }
      n = u > 0.45 ? 2 : 1;
      for (i = 0; i < n; i++) { var ls = spot(30 + i); out.push({ t: 'lamp', x: ls.x, z: ls.z, h: 3.2 + h1(gx + i, gy + i) * 1.2 }); }
      if (u > 0.35 && h1(gx * 23 + 5, gy * 29 + 7) > 0.86) { var wsp = spot(200); out.push({ t: 'well', x: wsp.x, z: wsp.z, h: 1.25 }); }
      if (u > 0.5 && h1(gx * 31 + 9, gy * 37 + 3) > 0.90) { var msp = spot(210); out.push({ t: 'market', x: msp.x, z: msp.z, h: 1.3, rot: h1(gx * 3 + 1, gy * 5 + 2) * Math.PI * 2 }); }
    } else if (kind === 'forest') {
      // [SAGA 리뉴얼 패치: 숲 밀도 대폭 상향]
      n = Math.round((12 + h1(gx * 7 + 5, gy * 11 + 3) * 12) * dens);
      for (i = 0; i < n; i++) {
        var fs = spot(i + 40);
        out.push({ t: 'tree', x: fs.x, z: fs.z, h: 4 + h1(gx + i * 5, gy + i * 7) * 8 });
        if (h1(gx + i, gy) > 0.4) { out.push({ t: 'grass', x: fs.x + (h1(gx, gy+i)*4-2), z: fs.z + (h1(gy, gx+i)*4-2), h: 0.8 }); }
      }
      var rockN = Math.round(2 + h1(gx * 5, gy * 3) * 3);
      for (i = 0; i < rockN; i++) { var frs = spot(70 + i); out.push({ t: 'rock', x: frs.x, z: frs.z, h: 1.2 + h1(gx+i, gy) * 2.0 }); }
    } else if (kind === 'mount') {
      out.push({ t: 'peak', x: 0, z: 0, h: 14 + h1(gx * 3 + 1, gy * 5 + 2) * 22 });
      // [SAGA 리뉴얼 패치: 산지 바위 밀도 대폭 상향]
      n = Math.round((5 + h1(gx, gy) * 5) * dens);
      for (i = 0; i < n; i++) { var ms = spot(i + 80); out.push({ t: 'rock', x: ms.x, z: ms.z, h: 1.5 + h1(gx + i, gy + i * 3) * 3.5 }); }
    } else if (kind === 'water') {
      if (!mapped || authored) { out.push({ t: 'water', x: 0, z: 0, h: 0, sq: authored, rise: wet ? 1 : 0 }); }
      n = h1(gx * 9, gy * 13) > 0.5 ? 3 : 1; if (wet) { n = Math.max(0, n - 2); }
      for (i = 0; i < n; i++) { var ws = spot(i + 90); out.push({ t: 'reed', x: ws.x, z: ws.z, h: (1.2 + h1(gx + i, gy) * 1.0) * (wet ? 0.7 : 1) }); }
    } else if (kind === 'road') {
      out.push({ t: 'lamp', x: -half * 0.8, z: (h1(gx, gy) * 2 - 1) * half, h: 3.4 });
      if (h1(gx * 3 + 2, gy * 5 + 1) > 0.45) { out.push({ t: 'lamp', x: half * 0.8, z: (h1(gy, gx) * 2 - 1) * half, h: 3.4 }); }
      if (h1(gx * 21, gy * 11) > 0.62) { var rs = spot(60); out.push({ t: 'tree', x: rs.x, z: rs.z, h: 4 + h1(gx, gy) * 3 }); }
    } else if (kind === 'farm') {
      n = Math.round((2 + h1(gx * 3 + 7, gy * 5 + 11) * 2) * dens);
      for (i = 0; i < n; i++) {
        var ds = spot(i + 130); var fw = 11 + h1(gx + i, gy + i * 3) * 9; var fd = 9 + h1(gy + i, gx + i * 5) * 8;
        out.push({ t: 'field', x: ds.x, z: ds.z, w: fw, d: fd, rot: h1(gx * 5 + i, gy * 7 + i) * 0.5 - 0.25 });
        var rn = Math.round(5 * dens), rj;
        for (rj = 0; rj < rn; rj++) {
          var ra = h1(gx * 7 + rj * 5 + i, gy * 11 + rj * 3 + i * 2); var rb = h1(gx * 13 + rj * 3 + i * 7, gy * 5 + rj * 11 + i);
          out.push({ t: 'rice', x: ds.x + (ra * 2 - 1) * fw * 0.36, z: ds.z + (rb * 2 - 1) * fd * 0.36, h: 1.4 + ra * 0.7 });
        }
      }
      if (h1(gx * 17 + 3, gy * 13 + 5) > 0.5) { var cs = spot(150); out.push({ t: 'scare', x: cs.x, z: cs.z, h: 2.2 }); }
    } else { // grass
      // [SAGA 리뉴얼 패치: 들판 풀 밀도 대폭 상향]
      n = Math.round((8 + h1(gx * 41, gy * 23) * 10) * dens);
      for (i = 0; i < n; i++) { var gs = spot(i + 100); out.push({ t: 'grass', x: gs.x, z: gs.z, h: 0.8 + h1(gx + i, gy - i) * 1.0 }); }
      if (h1(gx * 7 + 9, gy * 3 + 4) > 0.6) { var grs = spot(120); out.push({ t: 'rock', x: grs.x, z: grs.z, h: 1.0 + h1(gx, gy) * 1.2 }); }
    }

    var mk = RG ? RG.markAt(gx, gy) : null;
    if (mk === 'bridge') {
      var bn = 7, bj, bh = (GRID / bn) / 0.76;
      for (bj = 0; bj < bn; bj++) { out.push({ t: 'bridge', x: 0, z: (bj - (bn - 1) / 2) * (GRID / bn), h: bh, seg: bj }); }
    }
    else if (mk === 'cave') { out.push({ t: 'cave', x: 0, z: 0, h: 7 }); }
    else if (mk === 'ruin') { out.push({ t: 'ruin', x: 0, z: 0, h: 4.5 }); }
    else if (mk === 'shrine') { out.push({ t: 'shrine', x: 0, z: 0, h: 5 }); }
    else if (mk === 'waterfall') { out.push({ t: 'waterfall', x: 0, z: 0, h: 16 }); }

    return out;
  }

  function houseRects(gx, gy) {
    var plan = propPlan('town', gx, gy, false);
    var ox = gx * GRID + GRID / 2, oz = gy * GRID + GRID / 2;
    var out = [], i;
    for (i = 0; i < plan.length; i++) {
      var p = plan[i];
      if (p.t === 'house' || p.t === 'tower') { out.push({ x: ox + p.x, z: oz + p.z, w: p.w, d: p.d, rot: p.rot }); }
      else if (p.t === 'well') { out.push({ x: ox + p.x, z: oz + p.z, w: p.h * 1.6, d: p.h * 1.6, rot: 0 }); }
      else if (p.t === 'market') { out.push({ x: ox + p.x, z: oz + p.z, w: p.h * 2.8, d: p.h * 1.8, rot: p.rot || 0 }); }
    }
    return out;
  }

  var unit = {};
  function unitGeo(name) {
    if (unit[name]) { return unit[name]; }
    var g;
    if (name === 'box') { g = new T.BoxGeometry(1, 1, 1); }
    else if (name === 'cyl') { g = new T.CylinderGeometry(0.5, 0.5, 1, 8); }
    else if (name === 'cone4') { g = new T.ConeGeometry(0.72, 1, 4); }
    else if (name === 'cone') { g = new T.ConeGeometry(0.5, 1, 7); }
    else if (name === 'sph') { g = new T.SphereGeometry(0.5, 8, 6); }
    else if (name === 'plane') { g = new T.PlaneGeometry(1, 1); }
    else if (name === 'disc') { g = new T.CircleGeometry(1, 20); }
    unit[name] = g;
    return g;
  }

  var swayShaders = [], swayClock = 0;
  function swayify(m) {
    m.onBeforeCompile = function (shader) {
      shader.uniforms.uSwTime = { value: swayClock };
      shader.uniforms.uSwAmt = { value: SWAY_AMT() };
      shader.vertexShader = 'uniform float uSwTime;\nuniform float uSwAmt;\n' +
        shader.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\n#ifdef USE_INSTANCING\n  float swPhase = dot(instanceMatrix[3].xyz, vec3(12.9898, 78.233, 37.719));\n#else\n  float swPhase = 0.0;\n#endif\n  float swLift = (transformed.y + 0.5) * uSwAmt;\n  transformed.x += sin(uSwTime * 1.6 + swPhase) * swLift;\n  transformed.z += cos(uSwTime * 1.3 + swPhase) * swLift * 0.6;\n');
      swayShaders.push(shader);
    };
    m.customProgramCacheKey = function () { return 'sway'; };
  }

  var propMat = {};
  function pmat(hex, opt) {
    var key = hex + '|' + (opt || '');
    if (propMat[key]) { return propMat[key]; }
    var m = new T.MeshLambertMaterial({ color: new T.Color(hex), flatShading: opt === 'flat' });
    if (opt === 'water') {
      var wm = global.DG.water3d ? global.DG.water3d.material(T, hex) : null;
      if (wm) { propMat[key] = wm; return wm; }
      m.transparent = true; m.opacity = 0.72; m.depthWrite = false;
    }
    if (opt === 'glow') { m.emissive = new T.Color(hex); m.emissiveIntensity = 0.9; }
    if (opt === 'sway') { swayify(m); }
    if (opt === 'smoke') { m.transparent = true; m.opacity = 0.32; m.depthWrite = false; }
    if (opt === 'fall') { m.transparent = true; m.opacity = 0.5; m.depthWrite = false; }
    propMat[key] = m;
    return m;
  }

  function box(g, geoName, mtl, x, y, z, sx, sy, sz, cast) {
    var m = new T.Mesh(unitGeo(geoName), mtl);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    if (cast) { m.castShadow = true; }
    g.add(m); return m;
  }

  function INST_ON() { return core.tuned('world3d.instanced', 1) ? true : false; }
  function INST_CAP() { return core.tuned('world3d.instCap', 1600); }
  function GLB_CAP() { return core.tuned('world3d.glbCap', 260); }

  var instKinds = {}; var instOf = {}; var ZERO = null;
  function instBox(name, geoName, hex, opt, cast) { return instMake(name, unitGeo(geoName), pmat(hex, opt), cast); }
  function instMake(name, geo, mtl, cast, cap) {
    if (instKinds[name]) { return instKinds[name]; }
    cap = cap || INST_CAP();
    var m = new T.InstancedMesh(geo, mtl, cap);
    m.instanceMatrix.setUsage(T.DynamicDrawUsage);
    m.castShadow = !!cast; m.receiveShadow = false; m.frustumCulled = false;
    if (!ZERO) { ZERO = new T.Matrix4().makeScale(0, 0, 0); }
    var free = [], i;
    for (i = cap - 1; i >= 0; i--) { m.setMatrixAt(i, ZERO); free.push(i); }
    m.instanceMatrix.needsUpdate = true;
    m.count = 0; propGroup.add(m);
    instKinds[name] = { mesh: m, free: free, n: 0, hi: 0 };
    return instKinds[name];
  }

  var _p = null, _q = null, _s = null, _m4 = null;
  function instPut(key, name, geoName, hex, opt, cast, x, y, z, sx, sy, sz, rx, ry, rz) {
    return instAt(instBox(name, geoName, hex, opt, cast), key, name, x, y, z, sx, sy, sz, rx, ry, rz);
  }

  function instAt(K, key, name, x, y, z, sx, sy, sz, rx, ry, rz) {
    if (!K.free.length) { return false; }
    var slot = K.free.pop();
    if (!_p) { _p = new T.Vector3(); _q = new T.Quaternion(); _s = new T.Vector3(); _m4 = new T.Matrix4(); }
    _p.set(x, y, z); _q.setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0)); _s.set(sx, sy, sz); _m4.compose(_p, _q, _s);
    K.mesh.setMatrixAt(slot, _m4); K.mesh.instanceMatrix.needsUpdate = true;
    if (slot + 1 > K.hi) { K.hi = slot + 1; K.mesh.count = K.hi; }
    K.n++; if (!instOf[key]) { instOf[key] = []; }
    instOf[key].push({ name: name, slot: slot }); return true;
  }

  function instDrop(key) {
    var list = instOf[key]; if (!list) { return 0; }
    for (var i = 0; i < list.length; i++) {
      var K = instKinds[list[i].name]; if (!K) { continue; }
      K.mesh.setMatrixAt(list[i].slot, ZERO); K.mesh.instanceMatrix.needsUpdate = true;
      K.free.push(list[i].slot); K.n--;
    }
    delete instOf[key]; return list.length;
  }

  function instStats() {
    var out = { on: INST_ON(), cap: INST_CAP(), kinds: 0, used: 0, by: {} };
    for (var k in instKinds) { if (!Object.prototype.hasOwnProperty.call(instKinds, k)) { continue; } out.kinds++; out.used += instKinds[k].n; out.by[k] = instKinds[k].n; }
    return out;
  }

  function instGlb(key, want, x, z, h, gx, gy, rot) {
    var P3 = global.DG.prop3d; if (!P3) { return false; }
    var got = P3.parts(want, gx, gy); if (!got || !got.parts.length) { return false; }
    var ry = typeof rot === 'number' ? rot : h1(gx * 41 + 7, gy * 83 + 13) * Math.PI * 2;
    var hh = h * P3.heightMul(want);
    var i, ok = true;
    for (i = 0; i < got.parts.length; i++) {
      var K = instMake(got.url + '#' + i, got.parts[i].geometry, got.parts[i].material, P3.casts(want), GLB_CAP());
      ok = instAt(K, key, got.url + '#' + i, x, groundY(x, z), z, hh, hh, hh, 0, ry, 0) && ok;
    }
    return ok;
  }

  function instProp(key, p, ox, oz) {
    if (!INST_ON()) { return false; }
    var x = ox + p.x, z = oz + p.z;
    var gx = Math.round((ox - GRID / 2) / GRID), gy = Math.round((oz - GRID / 2) / GRID);
    var GLB = { tree: 'tree', rock: 'rock', grass: 'grass', reed: 'grass', house: 'house', tower: 'tower', peak: 'peak', lamp: 'lamp', shrine: 'shrine', cave: 'cave', ruin: 'ruin', bridge: 'bridge', rice: 'rice', well: 'well', market: 'market', waterfall: 'waterfall' };
    var natureLod = p.t === 'tree' || p.t === 'rock' || p.t === 'grass' || p.t === 'reed';
    var lodOk = !natureLod || Math.hypot(x - core.save.player.pos.x, z - core.save.player.pos.y) <= LOD_NEAR();
    if (lodOk && GLB[p.t] && instGlb(key, GLB[p.t], x, z, p.h, gx + Math.round(p.x), gy + Math.round(p.z), p.rot)) { return true; }
    if (p.t === 'tree') {
      var SS = global.DG.season; var leafHex = SS ? SS.leaf(0x2f5a34) : 0x2f5a34;
      var a = instPut(key, 'trunk', 'cyl', 0x4a3a2a, '', true, x, p.h * 0.21, z, 1.2, p.h * 0.42, 1.2);
      var bb = instPut(key, 'leaf:' + leafHex, 'cone', leafHex, 'sway', true, x, p.h * 0.58, z, p.h * 0.68, p.h * 0.72, p.h * 0.68);
      return a && bb;
    }
    if (p.t === 'rock') { return instPut(key, 'rock', 'sph', 0x6b6a72, 'flat', true, x, p.h * 0.32, z, p.h * 1.5, p.h * 0.9, p.h * 1.3, 0.3, p.x, 0.2); }
    if (p.t === 'grass') { return instPut(key, 'grass', 'cone', 0x5d7a44, 'sway', false, x, p.h * 0.5, z, p.h * 1.5, p.h, p.h * 1.5); }
    if (p.t === 'reed') { return instPut(key, 'reed', 'cone', 0x6d7f4a, 'sway', false, x, p.h * 0.5, z, 0.5, p.h, 0.5); }
    return false;
  }

  function addLampBulb(g, x, y, z, r) {
    var b = box(g, 'sph', pmat(0xffd489, 'glow'), x, y, z, r, r * 1.25, r, false);
    b.userData.lamp = true; b.visible = !!(lightNow && lightNow.lamp > 0.2);
    return b;
  }

  var smokeByKey = {};
  function addLampSmoke(g, key, x, y, z) {
    try {
      var list = smokeByKey[key] || (smokeByKey[key] = []);
      var i;
      for (i = 0; i < 2; i++) {
        var s = box(g, 'sph', pmat(0xb9b9b9, 'smoke').clone(), x, y, z, 0.4, 0.4, 0.4, false);
        s.userData.lamp = true; s.userData.smoke = { x: x, baseY: y, z: z, ph: Math.random() * 6.28 + i * Math.PI };
        s.visible = !!(lightNow && lightNow.lamp > 0.2); list.push(s);
      }
    } catch (err) { }
  }

  function buildProp(kind, gx, gy, mapped, key) {
    var g = new T.Group();
    var plan = propPlan(kind, gx, gy, mapped);
    var ox = gx * GRID + GRID / 2, oz = gy * GRID + GRID / 2;
    var i;
    for (i = 0; i < plan.length; i++) {
      var p = plan[i];
      var inst = key && instProp(key, p, ox, oz);
      if (inst) {
        if (p.t === 'lamp') { addLampBulb(g, p.x, p.h + 0.25, p.z, 0.8); addLampSmoke(g, key, p.x, p.h + 0.7, p.z); }
        else if (p.t === 'shrine') { addLampBulb(g, -3.4, 2.8, 4.6, 0.7); addLampBulb(g, 3.4, 2.8, 4.6, 0.7); addLampSmoke(g, key, -3.4, 3.3, 4.6); addLampSmoke(g, key, 3.4, 3.3, 4.6); }
        continue;
      }
      if (p.t === 'house' || p.t === 'tower') {
        var sh = 0.55 + p.shade * 0.42;
        var wall = pmat(((Math.round(sh * 250) << 16) | (Math.round(sh * 244) << 8) | Math.round(sh * 232)));
        var body = box(g, 'box', wall, p.x, p.h / 2, p.z, p.w, p.h, p.d, true);
        body.rotation.y = p.rot; body.receiveShadow = true;
        if (p.roof) {
          var roof = box(g, 'cone4', pmat(0x4a5360, 'flat'), p.x, p.h + p.w * 0.22, p.z, p.w * 1.28, p.w * 0.55, p.d * 1.28, true);
          roof.rotation.y = p.rot + Math.PI / 4;
        } else {
          box(g, 'box', pmat(0x39404c), p.x, p.h + 0.3, p.z, p.w * 0.9, 0.6, p.d * 0.9, false).rotation.y = p.rot;
        }
      } else if (p.t === 'tree') {
        var SS = global.DG.season; var leafHex = SS ? SS.leaf(0x2f5a34) : 0x2f5a34;
        box(g, 'cyl', pmat(0x4a3a2a), p.x, p.h * 0.21, p.z, 1.2, p.h * 0.42, 1.2, true);
        box(g, 'cone', pmat(leafHex, 'sway'), p.x, p.h * 0.58, p.z, p.h * 0.68, p.h * 0.72, p.h * 0.68, true);
      } else if (p.t === 'rock') {
        var rk = box(g, 'sph', pmat(0x6b6a72, 'flat'), p.x, p.h * 0.32, p.z, p.h * 1.5, p.h * 0.9, p.h * 1.3, true); rk.rotation.set(0.3, p.x, 0.2);
      } else if (p.t === 'grass') {
        box(g, 'cone', pmat(0x5d7a44, 'sway'), p.x, p.h * 0.5, p.z, p.h * 1.5, p.h, p.h * 1.5, false);
      } else if (p.t === 'peak') {
        box(g, 'cone', pmat(0x4a4752, 'flat'), p.x, p.h / 2, p.z, GRID * 0.84, p.h, GRID * 0.84, true).receiveShadow = true;
      } else if (p.t === 'water') {
        var wy = 0.12 + (p.rise ? 0.55 : 0); var wg = p.rise ? 1.06 : 1; var whex = p.rise ? 0x2a5f88 : 0x2f6f9e;
        var w = p.sq ? box(g, 'plane', pmat(whex, 'water'), 0, wy, 0, (GRID + 0.5) * wg, (GRID + 0.5) * wg, 1, false) : box(g, 'disc', pmat(whex, 'water'), 0, wy, 0, GRID * 0.62 * wg, GRID * 0.62 * wg, 1, false);
        w.rotation.x = -Math.PI / 2;
      } else if (p.t === 'field') {
        var fld = box(g, 'box', pmat(0x3f6b52), p.x, 0.09, p.z, p.w, 0.18, p.d, false); fld.rotation.y = p.rot; fld.receiveShadow = true;
        var lw = 1.1, li;
        for (li = 0; li < 4; li++) {
          var ax = li < 2 ? p.w + lw : lw, az = li < 2 ? lw : p.d + lw;
          var lox = li === 0 ? 0 : (li === 1 ? 0 : (li === 2 ? -(p.w + lw) / 2 : (p.w + lw) / 2));
          var loz = li === 0 ? -(p.d + lw) / 2 : (li === 1 ? (p.d + lw) / 2 : 0);
          var lv = box(g, 'box', pmat(0x7a6f57), 0, 0.20, 0, ax, 0.22, az, false);
          lv.position.set(p.x + Math.cos(p.rot) * lox - Math.sin(p.rot) * loz, 0.20, p.z + Math.sin(p.rot) * lox + Math.cos(p.rot) * loz);
          lv.rotation.y = p.rot;
        }
      } else if (p.t === 'scare') {
        box(g, 'cyl', pmat(0x6b5a3f), p.x, p.h * 0.5, p.z, 0.16, p.h, 0.16, true);
        box(g, 'box', pmat(0x6b5a3f), p.x, p.h * 0.78, p.z, 1.6, 0.13, 0.13, false);
        box(g, 'cone', pmat(0xa8925f, 'flat'), p.x, p.h + 0.16, p.z, 1.1, 0.5, 1.1, false);
      } else if (p.t === 'bridge') {
        if (p.seg) { continue; }
        box(g, 'box', pmat(0x7a6a52), 0, 1.7, 0, 7, 0.5, GRID * 1.02, true).receiveShadow = true;
        var bi;
        for (bi = -1; bi <= 1; bi += 2) { box(g, 'box', pmat(0x8a7a60), bi * 3.3, 1.7 + 0.75, 0, 0.35, 1.0, GRID * 1.02, false); }
        for (bi = -1; bi <= 1; bi += 2) { box(g, 'cyl', pmat(0x5d5347), 0, 1.7 * 0.5, bi * GRID * 0.28, 1.5, 1.7 * 2, 1.5, false); }
      } else if (p.t === 'cave') {
        box(g, 'sph', pmat(0x5a5560, 'flat'), 0, p.h * 0.34, 0, p.h * 2.4, p.h * 1.5, p.h * 2.0, true);
        var mouth = box(g, 'disc', pmat(0x0d1014), 0, p.h * 0.34, p.h * 0.98, 2.6, 3.4, 1, false); mouth.rotation.set(0, 0, 0);
        box(g, 'box', pmat(0x6b6a72, 'flat'), -3.1, p.h * 0.25, p.h * 0.9, 0.9, p.h * 0.5, 0.9, false);
        box(g, 'box', pmat(0x6b6a72, 'flat'), 3.1, p.h * 0.25, p.h * 0.9, 0.9, p.h * 0.5, 0.9, false);
      } else if (p.t === 'ruin') {
        box(g, 'box', pmat(0x5f5a52, 'flat'), 0, 0.2, 0, 13, 0.4, 13, false).receiveShadow = true;
        var rp = [[-4.4, -4.4, 1.0], [4.4, -4.4, 0.55], [-4.4, 4.4, 0.75], [4.4, 4.4, 0.3]], ri;
        for (ri = 0; ri < rp.length; ri++) { box(g, 'cyl', pmat(0x8a8378, 'flat'), rp[ri][0], 0.4 + p.h * rp[ri][2] * 0.5, rp[ri][1], 1.1, p.h * rp[ri][2], 1.1, true); }
        box(g, 'box', pmat(0x7c766c, 'flat'), 1.2, 0.7, 0, 6, 0.7, 1.2, false).rotation.y = 0.4;
      } else if (p.t === 'shrine') {
        box(g, 'box', pmat(0x6a6258, 'flat'), 0, 0.3, 0, 9, 0.6, 9, false).receiveShadow = true;
        box(g, 'box', pmat(0xb9a88c), 0, p.h * 0.42, 0, 5.4, p.h * 0.66, 5.0, true);
        box(g, 'cone4', pmat(0x4a5360, 'flat'), 0, p.h * 0.86, 0, 8.2, p.h * 0.42, 8.2, true).rotation.y = Math.PI / 4;
        var si;
        for (si = -1; si <= 1; si += 2) {
          box(g, 'cyl', pmat(0x3f3a34), si * 3.4, 1.3, 4.6, 0.2, 2.6, 0.2, false);
          var sb = box(g, 'sph', pmat(0xffd489, 'glow'), si * 3.4, 2.8, 4.6, 0.7, 0.9, 0.7, false);
          sb.userData.lamp = true; sb.visible = !!(lightNow && lightNow.lamp > 0.2);
        }
      } else if (p.t === 'waterfall') {
        box(g, 'box', pmat(0x5a5560, 'flat'), 0, p.h * 0.5, -2.4, 13, p.h, 6, true).receiveShadow = true;
        box(g, 'box', pmat(0x9fd0e8, 'fall'), 0, p.h * 0.46, 0.3, 4.6, p.h * 0.86, 0.6, false);
        box(g, 'box', pmat(0x6fa8c4, 'water'), 0, 0.15, 3.4, 8, 0.3, 6.5, false);
      } else if (p.t === 'reed') {
        box(g, 'cone', pmat(0x6d7f4a, 'sway'), p.x, p.h * 0.5, p.z, 0.5, p.h, 0.5, false);
      } else if (p.t === 'lamp') {
        box(g, 'cyl', pmat(0x3f3a34), p.x, p.h * 0.5, p.z, 0.24, p.h, 0.24, false);
        var bulb = box(g, 'sph', pmat(0xffd489, 'glow'), p.x, p.h + 0.25, p.z, 0.8, 1.0, 0.8, false);
        bulb.userData.lamp = true; bulb.visible = !!(lightNow && lightNow.lamp > 0.2);
      }
    }
    return g;
  }

  var propScan = null;
  function syncProps(W) {
    var pos = core.save.player.pos; var R = PROP_R(); var mapped = !!(W.tilesUsable && W.tilesUsable());
    var RG3 = global.DG.land; var wkNow = weatherKey(); var wetNow = WET() && (wkNow === 'rain' || wkNow === 'snow');
    var seasonKey = global.DG.season ? global.DG.season.now().key : '-';
    var cell = Math.floor(pos.x / GRID) + ':' + Math.floor(pos.y / GRID) + ':' + Math.round(R) + ':' + (MESH_ON() ? 1 : 0) + ':' + Math.round(DENSITY() * 100) + ':' + (mapped ? 'm' : 'n') + ':' + (wetNow ? 'w' : 'd') + ':' + (RG3 && RG3.on() ? 'L' : '-') + ':' + seasonKey;
    if (propScan === cell) { return; }
    propScan = cell;
    var g0x = Math.floor((pos.x - R) / GRID), g1x = Math.floor((pos.x + R) / GRID);
    var g0y = Math.floor((pos.y - R) / GRID), g1y = Math.floor((pos.y + R) / GRID);
    var live = {};
    for (var gy = g0y; gy <= g1y; gy++) {
      for (var gx = g0x; gx <= g1x; gx++) {
        var kind = W.terrainAt(gx, gy); var mk = RG3 ? RG3.markAt(gx, gy) : null;
        var tileDist = Math.hypot((gx + 0.5) * GRID - pos.x, (gy + 0.5) * GRID - pos.y);
        var far = tileDist > R * 0.5; if (far && !mk && (kind === 'grass' || kind === 'road')) { continue; }
        var lodBand = kind !== 'town' ? (tileDist <= LOD_NEAR() ? 'n' : 'f') : '-';
        var key = kind + ':' + gx + ':' + gy + ':' + (mapped ? 'm' : 'n') + (mk ? ':' + mk : '') + (wetNow ? ':w' : '') + ':' + seasonKey + ':' + lodBand;
        live[key] = 1;
        if (propMeshes[key]) { continue; }
        var node = buildProp(kind, gx, gy, mapped, key);
        var pcx = gx * GRID + GRID / 2, pcz = gy * GRID + GRID / 2;
        node.position.set(pcx, groundY(pcx, pcz), pcz);
        propGroup.add(node); propMeshes[key] = node;
      }
    }
    var UR = PROP_UR(R);
    for (var k in propMeshes) {
      if (!Object.prototype.hasOwnProperty.call(propMeshes, k) || live[k]) { continue; }
      var kp = k.split(':'); var kgx = +kp[1], kgy = +kp[2];
      if (!(kgx >= g0x && kgx <= g1x && kgy >= g0y && kgy <= g1y)) {
        var leftNode = propMeshes[k]; var d = Math.hypot(leftNode.position.x - pos.x, leftNode.position.z - pos.y);
        if (d <= UR) { continue; }
      }
      propGroup.remove(propMeshes[k]); delete propMeshes[k]; delete smokeByKey[k]; instDrop(k);
    }
  }

  function syncLamps() {
    var on = lightNow ? lightNow.lamp > 0.2 : false;
    if (syncLamps.was === on) { return; }
    syncLamps.was = on;
    propGroup.traverse(function (o) { if (o.userData && o.userData.lamp) { o.visible = on; } });
  }

  var swayBroken = false;
  function syncSway(dt) {
    if (!SWAY_ON() || !swayShaders.length || swayBroken) { return; }
    try {
      swayClock += dt; var amt = SWAY_AMT(), i;
      for (i = 0; i < swayShaders.length; i++) { swayShaders[i].uniforms.uSwTime.value = swayClock; swayShaders[i].uniforms.uSwAmt.value = amt; }
    } catch (err) { swayBroken = true; }
  }

  var flameClock = 0, smokeClock = 0, flameBroken = false, smokeBroken = false;
  function syncFlame(dt) {
    if (!FLAME_ON() || flameBroken) { return; }
    try {
      flameClock += dt; var m = pmat(0xffd489, 'glow');
      m.emissiveIntensity = 0.9 + FLAME_AMT() * (Math.sin(flameClock * 9.1) * 0.7 + Math.sin(flameClock * 23.7) * 0.3);
    } catch (err) { flameBroken = true; }
  }

  function syncSmoke(dt) {
    if (!SMOKE_ON() || smokeBroken || !(lightNow && lightNow.lamp > 0.2)) { return; }
    try {
      smokeClock += dt; var RISE = 0.4, MAXH = 2.4, k;
      for (k in smokeByKey) {
        if (!Object.prototype.hasOwnProperty.call(smokeByKey, k)) { continue; }
        var list = smokeByKey[k], i;
        for (i = 0; i < list.length; i++) {
          var s = list[i], d = s.userData.smoke; var t = (smokeClock * RISE + d.ph) % MAXH; var frac = t / MAXH;
          s.position.set(d.x + Math.sin(smokeClock * 0.6 + d.ph) * 0.15, d.baseY + t, d.z);
          var sc = 0.35 + frac * 0.55; s.scale.set(sc, sc, sc); s.material.opacity = 0.34 * (1 - frac);
        }
      }
    } catch (err) { smokeBroken = true; }
  }

  function spriteTexture(kind, ref, px) {
    var key = kind + '/' + (ref.id || ref.key || ref.name) + '/' + px + '/' + global.DG.sprite.style() + '/' + global.DG.sprite.prop() + '/flat';
    if (texCache[key]) { return texCache[key]; }
    var url = global.DG.sprite.portrait(kind, ref, px, true);
    var img = new Image(); var tex = new T.Texture(img);
    tex.colorSpace = T.SRGBColorSpace; img.onload = function () { tex.needsUpdate = true; }; img.src = url;
    texCache[key] = tex; return tex;
  }

  var shadowGeo = null, shadowMat = null;
  function groundShadow() {
    if (!shadowGeo) { shadowGeo = new T.CircleGeometry(1, 18); shadowMat = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false }); }
    var m = new T.Mesh(shadowGeo, shadowMat); m.rotation.x = -Math.PI / 2; return m;
  }

  function actorOf(key, kind, ref, px) {
    var a = actors[key];
    if (a) { a.seen = frame; return a; }
    var A = global.DG.actor3d; var node = null, mesh = false;
    if (MESH_ON() && A && A.ready()) { node = A.build(kind === 'building' ? (ref.key === 'wall' ? 'fort' : 'station') : kind, ref); mesh = !!node; }
    if (!node) { var mat = new T.SpriteMaterial({ map: spriteTexture(kind, ref, px), transparent: true }); node = new T.Sprite(mat); }
    var sh = groundShadow();
    actorGroup.add(node); actorGroup.add(sh);
    a = actors[key] = { node: node, shadow: sh, seen: frame, mesh: mesh, kind: kind, ang: Math.PI, lx: null, ly: null, vanish: 0 };
    return a;
  }

  function farBoost(x, y) {
    if (!camPos) { return 1; }
    var d = Math.hypot(x - camPos.x, y - camPos.z);
    if (d < FAR_NEAR) { return 1; }
    return Math.min(FAR_MAX, Math.pow(d / FAR_NEAR, 0.85));
  }

  function placeActor(a, x, y, h, bob, walk, phase, now) {
    var gy0 = groundY(x, y);
    if (a.mesh) {
      a.node.scale.set(h, h, h); a.node.position.set(x, gy0, y);
      if (a.lx !== null) {
        var dx = x - a.lx, dz = y - a.ly;
        if (dx * dx + dz * dz > 0.0004) {
          var want = Math.atan2(dx, dz); var diff = want - a.ang;
          while (diff > Math.PI) { diff -= Math.PI * 2; } while (diff < -Math.PI) { diff += Math.PI * 2; }
          a.ang += diff * 0.22;
        }
      }
      a.lx = x; a.ly = y; a.node.rotation.y = a.ang;
      var animNow = (a.animUntil && now < a.animUntil) ? a.animName : undefined;
      global.DG.actor3d.step(a.node, { t: now / 1000, walking: walk, phase: phase, anim: animNow });
    } else {
      a.node.scale.set(h, h, 1); a.node.position.set(x, gy0 + h / 2 + (bob || 0), y);
    }
    a.shadow.position.set(x, gy0 + 0.06, y); a.shadow.scale.setScalar(h * 0.30);
  }

  function sweepActors(dt) {
    for (var k in actors) {
      if (!Object.prototype.hasOwnProperty.call(actors, k)) { continue; }
      var a = actors[k]; if (a.seen === frame) { continue; }
      if (stageAt && k === 'sp' + stageAt.uid) { a.seen = frame; continue; }
      a.vanish += dt; var t = Math.min(1, a.vanish / 0.7);
      a.node.position.y += dt * 2.4; a.node.scale.multiplyScalar(1 - dt * 1.1); a.shadow.scale.multiplyScalar(1 - dt * 2.2);
      if (t >= 1) { actorGroup.remove(a.node); actorGroup.remove(a.shadow); delete actors[k]; }
    }
  }

  function syncActors(W, now) {
    var pos = core.save.player.pos;
    var lead = core.save.party && core.save.party[0];
    var me = lead ? global.DG.data.find(lead) : null;
    var meRef = me || { id: '_me', name: '나', faction: '조선', rarity: 3, trait: 'virtue' };
    var meA = actorOf('me', 'hero', meRef, 96);
    var mot = W.motion; var h = ACTOR_H(); var walking = mot.speed > 1.5;
    var walkBob = walking ? Math.abs(Math.sin(mot.phase)) * h * 0.045 : Math.sin(now / 700) * h * 0.016;
    placeActor(meA, pos.x, pos.y, h * farBoost(pos.x, pos.y), walkBob, walking, mot.phase, now);

    if (duelFoe) {
      var dfa = actorOf('duelfoe', duelFoe.kind, duelFoe.ref, 96);
      placeActor(dfa, duelFoe.x, duelFoe.y, h * (duelFoe.kind === 'pet' ? 0.86 : 1), 0, false, 0, now);
      if (dfa.mesh) {
        var fax = pos.x - duelFoe.x, faz = pos.y - duelFoe.y;
        dfa.node.rotation.y = Math.atan2(fax, faz); dfa.ang = dfa.node.rotation.y;
      }
    }

    var sp = W.spawns, i;
    for (i = 0; i < sp.length; i++) {
      var s = sp[i]; var kind = s.kind === 'hero' ? 'hero' : 'pet';
      var a = actorOf('sp' + s.uid, kind, s.ref, 96);
      var bob = s.moving ? Math.abs(Math.sin(s.phase)) * h * 0.04 : Math.sin(now / 620 + s.uid) * h * 0.02;
      var onStage = stageAt && stageAt.uid === s.uid;
      var boost = onStage ? 1 : farBoost(s.x, s.y);
      placeActor(a, s.x, s.y, h * (kind === 'hero' ? 1 : 0.86) * boost, onStage ? 0 : bob, onStage ? false : !!s.moving, s.phase || 0, now);
      if (onStage) { stageAt.h = h * (kind === 'hero' ? 1 : 0.86); stageAt.x = s.x; stageAt.y = s.y; }
      if (onStage && a.mesh) {
        var ax = camera.position.x - s.x, az = camera.position.z - s.y;
        a.node.rotation.y = Math.atan2(ax, az); a.ang = a.node.rotation.y;
        a.node.position.y = stageAt.lift || 0;
        if (stageAt.back) {
          var bl = Math.max(0.5, Math.hypot(ax, az)); var ox = -ax / bl * stageAt.back, oz = -az / bl * stageAt.back;
          a.node.position.x = s.x + ox; a.node.position.z = s.y + oz; a.shadow.position.x = s.x + ox; a.shadow.position.z = s.y + oz;
        }
      }
    }

    var NP = global.DG.npc; var people = NP ? NP.live(pos, now) : [];
    for (i = 0; i < people.length; i++) {
      var n = people[i]; var na = actorOf('np' + n.p.id, 'hero', n.p, 96);
      var nbob = n.walking ? Math.abs(Math.sin(n.phase)) * h * 0.04 : Math.sin(now / 700 + i) * h * 0.014;
      placeActor(na, n.x, n.y, h * 0.94 * farBoost(n.x, n.y), nbob, n.walking, n.phase, now);
    }

    var AN = global.DG.animal; var beasts = AN ? AN.live(pos, now) : [];
    for (i = 0; i < beasts.length; i++) {
      var bt = beasts[i]; var ba = actorOf('an' + bt.m.id, 'pet', AN.refOf(bt.kind), 96);
      var bh = h * bt.kind.h * farBoost(bt.x, bt.y);
      placeActor(ba, bt.x, bt.y, bh, 0, bt.moving, bt.phase, now);
      if (bt.lift) { ba.node.position.y = bt.lift; ba.shadow.scale.setScalar(bh * 0.30 * Math.max(0.25, 1 - bt.lift / 12)); }
      if (bt.kind.act !== null && bt.alarm > 0.05) { ba.node.rotation.y = bt.ang; ba.ang = bt.ang; }
    }

    var sts = W.stationsNear ? W.stationsNear() : [];
    for (i = 0; i < sts.length; i++) {
      var st = sts[i]; var sa = actorOf('st' + st.key, 'building', { key: 'stable', id: 'st_' + st.key, color: '#e8c15a' }, 128);
      placeActor(sa, st.x, st.y, h * 1.7 * farBoost(st.x, st.y), 0, false, 0, now);
    }
    var fts = W.fortsNear ? W.fortsNear() : [];
    for (i = 0; i < fts.length; i++) {
      var ft = fts[i]; var fs = fortStyle(ft);
      var fa = actorOf('ft' + ft.key, 'building', { key: 'wall', id: 'ft_' + ft.key, color: ft.color || fs.color, tier: fs.tier }, 128);
      placeActor(fa, ft.x, ft.y, h * 2.4 * farBoost(ft.x, ft.y), 0, false, 0, now);
    }
  }

  var fortStyleCache = {};
  function fortStyle(ft) {
    if (fortStyleCache[ft.key]) { return fortStyleCache[ft.key]; }
    var F = global.DG.fort, D = global.DG.data; var o = { tier: 2, color: '#8a5cc0' };
    try {
      if (F && F.tierOf) { o.tier = F.tierOf(ft).tier; var fc = D && D.faction ? D.faction(F.factionNameOf(ft)) : null; if (fc && fc.color) { o.color = fc.color; } }
    } catch (e) { }
    fortStyleCache[ft.key] = o; return o;
  }

  var yaw = 0; var battleOn = false; var shakeAmp = 0; var holdUntil = 0;
  var focusAt = null; var stageAt = null; var beams = []; var duelFoe = null;

  function duelSpotBlocked(x, y, margin) {
    var m = margin === undefined ? 1 : margin;
    var gx0 = Math.floor(x / GRID), gy0 = Math.floor(y / GRID), gx, gy, rs, i, r;
    for (gy = gy0 - 1; gy <= gy0 + 1; gy++) {
      for (gx = gx0 - 1; gx <= gx0 + 1; gx++) {
        rs = houseRects(gx, gy);
        for (i = 0; i < rs.length; i++) {
          r = rs[i]; var dx = x - r.x, dz = y - r.z; var c = Math.cos(r.rot), s = Math.sin(r.rot);
          var lx = dx * c + dz * s, lz = -dx * s + dz * c;
          if (Math.abs(lx) < r.w / 2 + m && Math.abs(lz) < r.d / 2 + m) { return true; }
        }
      }
    }
    return false;
  }

  function duelStage(kind, ref) {
    if (!kind || !ref) { return false; }
    var pos = core.save.player.pos;
    var OFF = [[0, -6], [-6, -6], [6, -6], [-6, 0], [6, 0], [0, 6], [-6, 6], [6, 6]];
    var fx = pos.x + OFF[0][0], fy = pos.y + OFF[0][1], i;
    for (i = 0; i < OFF.length; i++) { var tx = pos.x + OFF[i][0], ty = pos.y + OFF[i][1]; if (!duelSpotBlocked(tx, ty)) { fx = tx; fy = ty; break; } }
    duelFoe = { kind: kind, ref: ref, x: fx, y: fy }; focusAt = { x: duelFoe.x, y: duelFoe.y }; return true;
  }

  function duelUnstage() {
    var a = actors.duelfoe; if (a) { actorGroup.remove(a.node); actorGroup.remove(a.shadow); delete actors.duelfoe; } duelFoe = null;
  }

  function playAnim(who, name, ms) {
    var key = who === 'foe' ? 'duelfoe' : 'me'; var a = actors[key]; if (!a) { return false; }
    a.animName = name; a.animUntil = (global.performance ? performance.now() : Date.now()) + (ms || 300); return true;
  }

  function bindEvents() {
    core.on('encounter:request', function (spawn) { if (spawn) { focusAt = { x: spawn.x, y: spawn.y }; } });
    core.on('station:request', function (st) { if (st) { focusAt = { x: st.x, y: st.y }; } });
    core.on('fort:request', function (ft) { if (ft) { focusAt = { x: ft.x, y: ft.y }; } });
    core.on('dex:new', function () { var f = focusLive(); if (f) { beam(f.x, f.y); } });
  }

  function focusLive() {
    if (!focusAt) { return null; }
    var el = document.getElementById('encounter'); if (el && el.classList.contains('show')) { return focusAt; }
    focusAt = null; return null;
  }

  function beam(x, y) {
    if (!available()) { return; }
    var geo = unitGeo('cyl');
    var m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0xffe6a8, transparent: true, opacity: 0.85, depthWrite: false }));
    m.position.set(x, 6, y); m.scale.set(2.6, 12, 2.6); fxGroup.add(m); beams.push({ mesh: m, t: 0 });
  }

  function syncBeams(dt) {
    var i;
    for (i = beams.length - 1; i >= 0; i--) {
      var b = beams[i]; b.t += dt; var k = b.t / 0.9;
      b.mesh.scale.x = b.mesh.scale.z = 2.6 + k * 5; b.mesh.material.opacity = Math.max(0, 0.85 * (1 - k));
      if (k >= 1) { fxGroup.remove(b.mesh); b.mesh.material.dispose(); beams.splice(i, 1); }
    }
  }

  var camPos = null, camLook = null;
  var CAM_HIGH_MUL = [2.27, 1.33, 0.80]; var CAM_BACK_MUL = [0.05, 0.40, 0.60]; var CAM_AHEAD = [0, 3, 5];
  function STAGE_DIST() { return core.tuned('world3d.stageDist', 10.5); }
  function DUEL_DIST() { return core.tuned('world3d.duelDist', 9); }

  function camAim(pos, mode, focus, stage, zoom, battle, yaw, duel) {
    var z = (zoom === undefined || !isFinite(zoom) || zoom <= 0) ? 1 : zoom;
    var yw = yaw || 0;
    if (battle) { z = z * 0.62; }
    if (!stage && duel) {
      var mx = (pos.x + duel.x) / 2, my = (pos.y + duel.y) / 2;
      var ddx = duel.x - pos.x, ddy = duel.y - pos.y; var dlen = Math.max(0.5, Math.hypot(ddx, ddy));
      var px = -ddy / dlen, pz = ddx / dlen; var DD = DUEL_DIST(); var CAM_MARGIN = 7;
      var side1 = { x: mx + px * DD, z: my + pz * DD }; var side2 = { x: mx - px * DD, z: my - pz * DD };
      var pick = !duelSpotBlocked(side1.x, side1.z, CAM_MARGIN) ? side1 : (!duelSpotBlocked(side2.x, side2.z, CAM_MARGIN) ? side2 : null);
      if (pick) { return { pos: { x: pick.x, y: DD * 0.55, z: pick.z }, look: { x: mx, y: 2.2, z: my } }; }
      var dback = CAM_DIST() * CAM_BACK_MUL[mode] * z; var dhigh = CAM_HIGH() * CAM_HIGH_MUL[mode] * Math.pow(z, 1.12);
      var fdx = duel.x - pos.x, fdy = duel.y - pos.y; var flen = Math.max(1, Math.hypot(fdx, fdy));
      var fux = fdx / flen, fuy = fdy / flen; var fspan = Math.min(dback * 2.2, Math.max(dback, flen * 0.9));
      return { pos: { x: pos.x - fux * fspan * 0.7 - fuy * fspan * 0.45, y: dhigh * 0.72, z: pos.y - fuy * fspan * 0.7 + fux * fspan * 0.45 }, look: { x: mx, y: 2.0, z: my } };
    }
    if (stage) {
      var sx = pos.x - stage.x, sy = pos.y - stage.y; var slen = Math.max(0.5, Math.hypot(sx, sy)); var sh = stage.h || 3.2; var D = STAGE_DIST() * (sh / 3.2);
      return { pos: { x: stage.x + sx / slen * D, y: sh * 0.95, z: stage.y + sy / slen * D }, look: { x: stage.x, y: sh * 0.45, z: stage.y } };
    }
    var back = CAM_DIST() * CAM_BACK_MUL[mode] * z; var high = CAM_HIGH() * CAM_HIGH_MUL[mode] * Math.pow(z, 1.12);
    if (focus) {
      var dx = focus.x - pos.x, dy = focus.y - pos.y; var len = Math.max(1, Math.hypot(dx, dy)); var ux = dx / len, uy = dy / len;
      var span = Math.min(back * 2.2, Math.max(back, len * 0.9));
      return { pos: { x: pos.x - ux * span * 0.7 - uy * span * 0.45, y: high * 0.72, z: pos.y - uy * span * 0.7 + ux * span * 0.45 }, look: { x: (pos.x + focus.x) / 2, y: 2.0, z: (pos.y + focus.y) / 2 } };
    }
    var cs = Math.cos(yw), sn = Math.sin(yw); var ax = 0, az = back; var ahead = CAM_AHEAD[mode];
    return { pos: { x: pos.x + ax * cs - az * sn, y: high, z: pos.y + ax * sn + az * cs }, look: { x: pos.x + ahead * sn, y: mode === 0 ? 0.5 : 2.4, z: pos.y - ahead * cs } };
  }

  function syncCamera(W, dt) {
    var pos = core.save.player.pos;
    var aim = camAim(pos, W.tiltMode, focusLive(), stageAt, stageAt ? 1 : W.zoom3d, battleOn, stageAt ? 0 : yaw, duelFoe);
    var camLift = groundY(aim.pos.x, aim.pos.z); var lookLift = groundY(aim.look.x, aim.look.z);
    var want = new T.Vector3(aim.pos.x, aim.pos.y + camLift, aim.pos.z); var look = new T.Vector3(aim.look.x, aim.look.y + lookLift, aim.look.z);
    if (!camPos) { camPos = want.clone(); camLook = look.clone(); }
    var k = Math.min(1, dt * (battleOn ? 9 : 6.5));
    camPos.lerp(want, k); camLook.lerp(look, k); camera.position.copy(camPos);
    if (shakeAmp > 0.001) {
      var ph = frame * 1.9; camera.position.x += Math.sin(ph) * shakeAmp; camera.position.y += Math.sin(ph * 1.7 + 1.1) * shakeAmp * 0.6; camera.position.z += Math.cos(ph * 1.3) * shakeAmp;
      shakeAmp *= Math.pow(0.02, dt);
    } else { shakeAmp = 0; }
    camera.lookAt(camLook);
  }

  var shadowOn = true;
  function syncShadow(zoom) {
    var P = global.DG.perf; var want = zoom < 4 && !(global.DG_3D_DEBUG || {}).noShadow && (!P || P.shadowOk());
    if (want === shadowOn) { return; }
    shadowOn = want; renderer.shadowMap.enabled = want;
    scene.traverse(function (o) { if (o.isMesh && o.material) { o.material.needsUpdate = true; } });
  }

  function syncLight(dt) {
    var L = lightingAt(forcedMs === null ? undefined : forcedMs, weatherKey()); lightNow = L;
    var pos = core.save.player.pos;
    sun.position.set(pos.x + L.sun.x, L.sun.y, pos.y + L.sun.z); sun.target.position.set(pos.x, 0, pos.y); sun.target.updateMatrixWorld();
    sun.color.setHex(L.sun.hex); sun.intensity = L.sun.intensity; sky.color.setHex(L.hemi.sky); sky.groundColor.setHex(L.hemi.ground); sky.intensity = L.hemi.intensity;
    if (scene.background && scene.background.setHex) { scene.background.setHex(L.bg); } renderer.setClearColor(L.bg, 1);
    if (scene.fog) { scene.fog.color.setHex(L.bg); scene.fog.near = L.fog.near; scene.fog.far = L.fog.far; }
  }

  function present() {
    var P3 = global.DG.post3d;
    if (P3) { if (P3.draw(renderer, scene, camera, lightNow)) { return; } renderer.setRenderTarget(null); }
    renderer.render(scene, camera);
  }

  var last = 0;
  function render() {
    if (!active()) { return false; }
    try {
      var W = global.DG.world; var now = performance.now(); var dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016; last = now; frame++;
      if (now < holdUntil) { present(); return true; }
      syncLight(dt); syncShadow(W.zoom3d || 1); syncGround(W); syncProps(W); syncLamps(); syncSway(dt); syncFlame(dt); syncSmoke(dt); syncActors(W, now); sweepActors(dt);
      if (global.DG.encounter3d) { global.DG.encounter3d.tick(dt); } if (global.DG.battle3d) { global.DG.battle3d.tick(dt); } if (global.DG.sky3d) { global.DG.sky3d.tick(dt, lightNow); } if (global.DG.water3d) { global.DG.water3d.tick(dt, lightNow); }
      syncBeams(dt); syncCamera(W, dt); present(); return true;
    } catch (err) { try { present(); } catch (err2) { } return true; }
  }

  function refreshProps() {
    if (!propGroup) { return 0; }
    var n = 0, k;
    for (k in propMeshes) { if (!Object.prototype.hasOwnProperty.call(propMeshes, k)) { continue; } instDrop(k); propGroup.remove(propMeshes[k]); n++; }
    propMeshes = {}; smokeByKey = {}; propScan = null; return n;
  }

  global.DG = global.DG || {};
  function instReport(filter) {
    var out = [], k;
    for (k in instKinds) {
      if (!Object.prototype.hasOwnProperty.call(instKinds, k)) { continue; }
      if (filter && k.indexOf(filter) < 0) { continue; }
      var K = instKinds[k], m = K.mesh; var det = '';
      if (filter) {
        var g = m.geometry, pa = g && g.getAttribute('position'); m.updateMatrixWorld(true); var e = m.matrixWorld.elements; var m0 = new T.Matrix4();
        if (m.count > 0) { m.getMatrixAt(0, m0); } var p0 = new T.Vector3(), q0 = new T.Quaternion(), s0 = new T.Vector3(); m0.decompose(p0, q0, s0);
        det = ' [보임' + (m.visible ? 1 : 0) + ' 재질' + (m.material && m.material.visible ? 1 : 0) + ' 투명' + (m.material && m.material.opacity !== undefined ? m.material.opacity : '?') + ' 정점' + (pa ? pa.count : '?') + ' 부모' + (m.parent ? m.parent.name || 'group' : 'none') + ' 월드' + e[12].toFixed(0) + ',' + e[13].toFixed(0) + ',' + e[14].toFixed(0) + ' 첫자리' + p0.x.toFixed(0) + ',' + p0.y.toFixed(1) + ',' + p0.z.toFixed(0) + ' 배율' + s0.x.toFixed(2) + ']';
      }
      out.push(k.split('/').pop() + '=' + K.n + '/' + m.count + det);
    }
    return out;
  }

  global.DG.world3d = {
    init: init, resize: resize, render: render, refreshProps: refreshProps, instReport: instReport, available: available, active: active, wanted: wanted,
    lightingAt: lightingAt, propPlan: propPlan, urbanity: urbanity, camAim: camAim, propRadius: PROP_R, unloadRadius: function () { return PROP_UR(PROP_R()); },
    lodNear: LOD_NEAR, swayOn: SWAY_ON, swayAmt: SWAY_AMT, flameOn: FLAME_ON, flameAmt: FLAME_AMT, smokeOn: SMOKE_ON, houseRects: houseRects,
    fov: function () { return camera ? camera.fov : FOV(); }, forceTime: forceTime, stage: function (o) { stageAt = o ? { x: o.x, y: o.y, uid: o.uid, lift: 0, back: 0 } : null; return stageAt; },
    stageAt: function () { return stageAt; }, three: function () { return T; }, addFx: function (n) { if (fxGroup && n) { fxGroup.add(n); } return n; }, removeFx: function (n) { if (fxGroup && n) { fxGroup.remove(n); } },
    camNode: function () { return camera; }, turn: function (d) { yaw += d || 0; while (yaw > Math.PI) { yaw -= Math.PI * 2; } while (yaw < -Math.PI) { yaw += Math.PI * 2; } return yaw; }, yaw: function (v) { if (v !== undefined) { yaw = v; } return yaw; },
    battle: function (on) { battleOn = !!on; if (!on) { shakeAmp = 0; } return battleOn; }, inBattle: function () { return battleOn; }, duelStage: duelStage, duelUnstage: duelUnstage, playAnim: playAnim, duelFoe: function () { return duelFoe; },
    shake: function (amp) { shakeAmp = Math.max(shakeAmp, amp || 0); return shakeAmp; }, shakeAmp: function () { return shakeAmp; }, hold: function (ms) { var v = Math.min(180, Math.max(0, ms || 0)); holdUntil = Math.max(holdUntil, (global.performance ? performance.now() : 0) + v); return v; },
    lum: lum, GRID: GRID, instStats: instStats, LAND_COLOR: LAND_COLOR, light: function () { return lightNow || lightingAt(undefined, weatherKey()); }, focus: function (o) { focusAt = o ? { x: o.x, y: o.y } : null; return focusAt; }, beam: beam,
    tileProbe: function () { var ks = Object.keys(tileMeshes); if (!ks.length) { return 'none'; } var out = [], i; for (i = 0; i < Math.min(3, ks.length); i++) { var m = tileMeshes[ks[i]]; out.push(ks[i] + ':col=' + m.material.color.getHexString() + ' map=' + (m.material.map ? (m.material.map.image && m.material.map.image.width ? 'img' + m.material.map.image.width : 'empty') : 'no') + ' at=' + Math.round(m.position.x) + ',' + Math.round(m.position.z)); } var lights = []; scene.traverse(function (o) { if (o.isLight) { lights.push(o.type + ':' + o.intensity.toFixed(2)); } }); out.push('lights=' + lights.join('/')); return out.join(' | '); },
    probe: function () { if (!available()) { return 'n/a'; } var gl = renderer.getContext(); var w = canvas.width, h = canvas.height; function at(px, py) { var b = new Uint8Array(4); gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, b); return b[0] + ',' + b[1] + ',' + b[2]; } var read = 'top=' + at(w >> 1, h - 8) + ' mid=' + at(w >> 1, h >> 1) + ' bot=' + at(w >> 1, 8) + ' size=' + w + 'x' + h; gl.clearColor(1, 0, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT); read += ' clearTest=' + at(w >> 1, h >> 1); read += ' near/far=' + camera.near + '/' + camera.far + ' look=' + (camLook ? [camLook.x, camLook.y, camLook.z].map(Math.round).join(',') : '-') + ' children=' + scene.children.length; return read; },
    stats: function () { var meshes = 0, a; for (a in actors) { if (Object.prototype.hasOwnProperty.call(actors, a) && actors[a].mesh) { meshes++; } } var drawn = 0; if (scene) { scene.traverse(function (o) { if (o.isMesh || o.isSprite) { drawn++; } }); } var L = lightNow; return { tiles: Object.keys(tileMeshes).length, props: Object.keys(propMeshes).length, actors: Object.keys(actors).length, meshActors: meshes, drawn: drawn, frames: frame, light: L ? (L.phase + ' ' + L.weather + ' 해' + L.sun.intensity.toFixed(2)) : '-', zoom: '×' + (global.DG.world.zoom3d || 1).toFixed(1), focus: focusAt ? (Math.round(focusAt.x) + ',' + Math.round(focusAt.y)) : '-', stage: stageAt ? (Math.round(stageAt.x) + ',' + Math.round(stageAt.y) + ' h' + (stageAt.h || 0).toFixed(1)) : '-', enc: (function () { var e = global.DG.encounter3d, st = e && e.state(); return st ? (st.kind + '/' + st.phase + '/t' + st.t + '/사료' + st.pellet) : '-'; })(), size: canvas ? (canvas.width + 'x' + canvas.height) : '-', cam: camera ? ([camera.position.x, camera.position.y, camera.position.z].map(function (v) { return Math.round(v); }).join(',')) : '-', failed: failed, ready: ready, wanted: wanted() }; }
  };
})(window);