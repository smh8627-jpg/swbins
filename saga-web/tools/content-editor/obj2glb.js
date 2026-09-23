/**
 * OBJ(+MTL·텍스처) → GLB 변환기. 의존성 없음(obj2gltf 는 cesium 을 통째로 끌고 와 무겁다).
 *
 * 받는 것: files = [{ name, buf }] — .obj 정확히 하나, .mtl·이미지(png/jpg/webp)는 있으면 쓴다.
 * 내는 것: { glb: Buffer, warnings: [], stats: {...} } 또는 { error }.
 *
 * - 면(f)은 삼각형·사각형·n각형(부채꼴로 쪼갬), `v`·`v/vt`·`v//vn`·`v/vt/vn`, 음수 색인을 읽는다.
 * - 재질(usemtl)마다 primitive 하나. Kd → baseColorFactor, d/Tr → 투명(BLEND), map_Kd → baseColorTexture(GLB 안에 넣음).
 *   webp 텍스처는 EXT_texture_webp 로 넣는다(three.js GLTFLoader 가 읽는다).
 * - vn 이 없는 꼭짓점은 면 법선을 모아 부드러운 법선을 만든다. vt 의 v 는 glTF 규약대로 뒤집는다(1 - v).
 * - o/g/s/l/p 는 무시한다(한 메시·한 노드로 합친다). 없는 MTL·텍스처는 경고만 하고 회색/무텍스처로 넣는다.
 * - 잘못된 파일(꼭짓점·면이 없음, 숫자가 아님, 색인이 범위 밖)은 거절한다.
 */
'use strict';

const path = require('path');

const IMG_MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

function lines(text) {
  // 줄 끝 `\` 이어 쓰기까지 합친다
  return text.replace(/\\\r?\n/g, ' ').split(/\r?\n/);
}

function num(s, where) {
  const v = Number(s);
  if (s === undefined || s === '' || !Number.isFinite(v)) throw new Error(where + ': 숫자가 아님 "' + s + '"');
  return v;
}

function parseMtl(text) {
  const mats = {};
  let cur = null;
  lines(text).forEach((raw) => {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) return;
    const parts = line.split(/\s+/);
    const key = parts[0].toLowerCase();
    if (key === 'newmtl') {
      cur = { name: parts.slice(1).join(' '), kd: [0.8, 0.8, 0.8], d: 1, map: null };
      mats[cur.name] = cur;
      return;
    }
    if (!cur) return;
    if (key === 'kd') cur.kd = [1, 2, 3].map((i) => { const v = Number(parts[i]); return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.8; });
    else if (key === 'd') { const v = Number(parts[1]); if (Number.isFinite(v)) cur.d = v; }
    else if (key === 'tr') { const v = Number(parts[1]); if (Number.isFinite(v)) cur.d = 1 - v; }
    else if (key === 'map_kd') {
      // 옵션(-o 1 1 1, -bm 0.5 …)을 건너뛰고 마지막 토큰을 파일 이름으로 본다
      const rest = parts.slice(1).filter((p) => p);
      if (rest.length) cur.map = rest[rest.length - 1].replace(/\\/g, '/');
    }
  });
  return mats;
}

function parseObj(text) {
  const P = [], T = [], N = [];
  const groups = []; // { mat, faces: [[{v,t,n}...]] }
  const mtllibs = [];
  let cur = null;
  function useMat(name) {
    cur = groups.find((g) => g.mat === name);
    if (!cur) { cur = { mat: name, faces: [] }; groups.push(cur); }
  }
  const all = lines(text);
  for (let li = 0; li < all.length; li++) {
    const line = all[li].replace(/#.*/, '').trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    const key = parts[0];
    const where = (li + 1) + '줄';
    if (key === 'v') P.push([num(parts[1], where), num(parts[2], where), num(parts[3], where)]);
    else if (key === 'vt') T.push([num(parts[1], where), parts[2] === undefined ? 0 : num(parts[2], where)]);
    else if (key === 'vn') N.push([num(parts[1], where), num(parts[2], where), num(parts[3], where)]);
    else if (key === 'f') {
      if (parts.length < 4) throw new Error(where + ': 면의 꼭짓점이 셋보다 적음');
      if (!cur) useMat(null);
      const face = parts.slice(1).map((tok) => {
        const [a, b, c] = tok.split('/');
        const fix = (s, len, what) => {
          if (s === undefined || s === '') return -1;
          let i = num(s, where);
          if (!Number.isInteger(i) || i === 0) throw new Error(where + ': 색인이 이상함 "' + tok + '"');
          i = i < 0 ? len + i : i - 1;
          if (i < 0 || i >= len) throw new Error(where + ': ' + what + ' 색인이 범위 밖 "' + tok + '"');
          return i;
        };
        const v = fix(a, P.length, '꼭짓점');
        if (v < 0) throw new Error(where + ': 꼭짓점 색인이 없음 "' + tok + '"');
        return { v, t: fix(b, T.length, 'vt'), n: fix(c, N.length, 'vn') };
      });
      cur.faces.push(face);
    } else if (key === 'usemtl') useMat(parts.slice(1).join(' ') || null);
    else if (key === 'mtllib') mtllibs.push(...parts.slice(1));
    // o, g, s, l, p, 그 밖은 무시
  }
  if (!P.length) throw new Error('꼭짓점(v)이 하나도 없음 — OBJ 파일이 아니거나 비어 있음');
  const faceCount = groups.reduce((s, g) => s + g.faces.length, 0);
  if (!faceCount) throw new Error('면(f)이 하나도 없음 — 점·선만 있는 OBJ 는 넣지 않는다');
  return { P, T, N, groups: groups.filter((g) => g.faces.length), mtllibs };
}

function pad4(n) { return (n + 3) & ~3; }

/** files: [{ name, buf }] */
function convert(files) {
  const warnings = [];
  const byName = {};
  files.forEach((f) => { byName[path.basename(f.name).toLowerCase()] = f; });
  const objs = files.filter((f) => path.extname(f.name).toLowerCase() === '.obj');
  if (objs.length !== 1) return { error: 'OBJ 파일은 정확히 하나여야 함(지금 ' + objs.length + '개)' };

  let obj;
  try { obj = parseObj(objs[0].buf.toString('utf8')); } catch (err) { return { error: 'OBJ 읽기 실패: ' + err.message }; }

  // 재질 — mtllib 에 적힌 이름을 먼저, 없으면 함께 올린 .mtl 아무거나
  let mats = {};
  const mtlFiles = obj.mtllibs.map((n) => byName[path.basename(n.replace(/\\/g, '/')).toLowerCase()]).filter(Boolean);
  obj.mtllibs.forEach((n) => { if (!byName[path.basename(n.replace(/\\/g, '/')).toLowerCase()]) warnings.push('MTL 없음: ' + n + ' (회색 재질로 넣음)'); });
  if (!mtlFiles.length) files.filter((f) => path.extname(f.name).toLowerCase() === '.mtl').forEach((f) => mtlFiles.push(f));
  mtlFiles.forEach((f) => Object.assign(mats, parseMtl(f.buf.toString('utf8'))));

  // ── 꼭짓점 풀기: (v,t,n) 조합마다 한 꼭짓점 ──
  const bin = [];
  let binLen = 0;
  const bufferViews = [], accessors = [];
  function pushView(buf, target) {
    const off = binLen;
    bin.push(buf);
    binLen += buf.length;
    const padded = pad4(binLen);
    if (padded > binLen) { bin.push(Buffer.alloc(padded - binLen)); binLen = padded; }
    const bv = { buffer: 0, byteOffset: off, byteLength: buf.length };
    if (target) bv.target = target;
    bufferViews.push(bv);
    return bufferViews.length - 1;
  }
  function f32(arr) { const b = Buffer.alloc(arr.length * 4); arr.forEach((v, i) => b.writeFloatLE(v, i * 4)); return b; }

  const materials = [], textures = [], images = [], samplers = [];
  const texOf = {};
  let usesWebp = false;
  function textureFor(mapName) {
    const key = path.basename(mapName).toLowerCase();
    if (key in texOf) return texOf[key];
    const f = byName[key];
    const mime = IMG_MIME[path.extname(key)];
    if (!f) { warnings.push('텍스처 없음: ' + mapName + ' (텍스처 없이 넣음)'); texOf[key] = -1; return -1; }
    if (!mime) { warnings.push('텍스처 형식 모름: ' + mapName + ' (png·jpg·webp 만)'); texOf[key] = -1; return -1; }
    if (!samplers.length) samplers.push({ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 });
    images.push({ bufferView: pushView(f.buf), mimeType: mime, name: path.basename(mapName) });
    const tex = { sampler: 0 };
    if (mime === 'image/webp') { usesWebp = true; tex.extensions = { EXT_texture_webp: { source: images.length - 1 } }; }
    else tex.source = images.length - 1;
    textures.push(tex);
    texOf[key] = textures.length - 1;
    return texOf[key];
  }
  const matIndex = {};
  function materialFor(name) {
    const k = name === null ? '\u0000default' : name;
    if (k in matIndex) return matIndex[k];
    const m = name !== null ? mats[name] : null;
    if (name !== null && !m) warnings.push('재질 정의 없음: ' + name + ' (회색으로 넣음)');
    const kd = m ? m.kd : [0.8, 0.8, 0.8];
    const d = m ? Math.min(1, Math.max(0, m.d)) : 1;
    const pbr = { baseColorFactor: [kd[0], kd[1], kd[2], d], metallicFactor: 0, roughnessFactor: 1 };
    const mat = { name: name || 'default', pbrMetallicRoughness: pbr };
    if (m && m.map) {
      const ti = textureFor(m.map);
      if (ti >= 0) { pbr.baseColorTexture = { index: ti }; pbr.baseColorFactor = [1, 1, 1, d]; }
    }
    if (d < 1) mat.alphaMode = 'BLEND';
    materials.push(mat);
    matIndex[k] = materials.length - 1;
    return matIndex[k];
  }

  const primitives = [];
  let totalVerts = 0, totalTris = 0;
  const gMin = [Infinity, Infinity, Infinity], gMax = [-Infinity, -Infinity, -Infinity];
  obj.groups.forEach((g) => {
    const keyIdx = new Map();
    const pos = [], uv = [], nrm = [], hasN = [];
    const idx = [];
    let anyUv = false;
    function vert(c) {
      const key = c.v + '/' + c.t + '/' + c.n;
      let i = keyIdx.get(key);
      if (i !== undefined) return i;
      i = pos.length / 3;
      keyIdx.set(key, i);
      pos.push(...obj.P[c.v]);
      if (c.t >= 0) { anyUv = true; uv.push(obj.T[c.t][0], 1 - obj.T[c.t][1]); } else uv.push(0, 0);
      if (c.n >= 0) { nrm.push(...obj.N[c.n]); hasN.push(true); } else { nrm.push(0, 0, 0); hasN.push(false); }
      return i;
    }
    g.faces.forEach((face) => {
      const vi = face.map(vert);
      for (let k = 1; k + 1 < vi.length; k++) idx.push(vi[0], vi[k], vi[k + 1]);
    });
    // vn 없는 꼭짓점: 같은 위치(v)끼리 면 법선을 모아 부드럽게
    if (hasN.some((h) => !h)) {
      const acc = new Map();
      for (let k = 0; k < idx.length; k += 3) {
        const a = idx[k] * 3, b = idx[k + 1] * 3, c = idx[k + 2] * 3;
        const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
        const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
        const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
        [a, b, c].forEach((o) => {
          const pk = pos[o] + ',' + pos[o + 1] + ',' + pos[o + 2];
          const s = acc.get(pk) || [0, 0, 0];
          s[0] += n[0]; s[1] += n[1]; s[2] += n[2];
          acc.set(pk, s);
        });
      }
      for (let i = 0; i < hasN.length; i++) {
        if (hasN[i]) continue;
        const o = i * 3;
        const s = acc.get(pos[o] + ',' + pos[o + 1] + ',' + pos[o + 2]) || [0, 1, 0];
        nrm[o] = s[0]; nrm[o + 1] = s[1]; nrm[o + 2] = s[2];
      }
    }
    // 법선 정규화(길이 0 이면 위쪽)
    for (let o = 0; o < nrm.length; o += 3) {
      const L = Math.hypot(nrm[o], nrm[o + 1], nrm[o + 2]);
      if (L > 1e-12) { nrm[o] /= L; nrm[o + 1] /= L; nrm[o + 2] /= L; } else { nrm[o] = 0; nrm[o + 1] = 1; nrm[o + 2] = 0; }
    }
    const count = pos.length / 3;
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let o = 0; o < pos.length; o += 3) for (let j = 0; j < 3; j++) { mn[j] = Math.min(mn[j], pos[o + j]); mx[j] = Math.max(mx[j], pos[o + j]); }
    for (let j = 0; j < 3; j++) { gMin[j] = Math.min(gMin[j], mn[j]); gMax[j] = Math.max(gMax[j], mx[j]); }

    accessors.push({ bufferView: pushView(f32(pos), 34962), componentType: 5126, count, type: 'VEC3', min: mn, max: mx });
    const attributes = { POSITION: accessors.length - 1 };
    accessors.push({ bufferView: pushView(f32(nrm), 34962), componentType: 5126, count, type: 'VEC3' });
    attributes.NORMAL = accessors.length - 1;
    if (anyUv) {
      accessors.push({ bufferView: pushView(f32(uv), 34962), componentType: 5126, count, type: 'VEC2' });
      attributes.TEXCOORD_0 = accessors.length - 1;
    }
    const big = count > 65535;
    const ib = Buffer.alloc(idx.length * (big ? 4 : 2));
    idx.forEach((v, i) => { if (big) ib.writeUInt32LE(v, i * 4); else ib.writeUInt16LE(v, i * 2); });
    accessors.push({ bufferView: pushView(ib, 34963), componentType: big ? 5125 : 5123, count: idx.length, type: 'SCALAR' });
    primitives.push({ attributes, indices: accessors.length - 1, material: materialFor(g.mat), mode: 4 });
    totalVerts += count;
    totalTris += idx.length / 3;
  });

  const stem = path.basename(objs[0].name, path.extname(objs[0].name));
  const gltf = {
    asset: { version: '2.0', generator: 'saga content-editor obj2glb' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: stem }],
    meshes: [{ name: stem, primitives }],
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: binLen }],
  };
  if (textures.length) { gltf.textures = textures; gltf.images = images; gltf.samplers = samplers; }
  if (usesWebp) { gltf.extensionsUsed = ['EXT_texture_webp']; gltf.extensionsRequired = ['EXT_texture_webp']; }

  let json = Buffer.from(JSON.stringify(gltf), 'utf8');
  if (json.length % 4) json = Buffer.concat([json, Buffer.alloc(4 - (json.length % 4), 0x20)]);
  const binBuf = Buffer.concat(bin, binLen);
  const total = 12 + 8 + json.length + 8 + binBuf.length;
  const head = Buffer.alloc(12);
  head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(total, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(json.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(binBuf.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  const glb = Buffer.concat([head, jh, json, bh, binBuf]);

  const size = [0, 1, 2].map((j) => +(gMax[j] - gMin[j]).toFixed(4));
  if (Math.max(...size) > 1000) warnings.push('크기가 큼(' + size.join('×') + ') — 단위가 cm/mm 일 수 있음, 게임에서 scale 확인');
  return {
    glb,
    warnings,
    stats: { vertices: totalVerts, triangles: totalTris, materials: materials.length, textures: textures.length, size },
  };
}

module.exports = { convert, parseObj, parseMtl };
