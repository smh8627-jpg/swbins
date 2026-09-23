#!/usr/bin/env node
/**
 * 배치표 생성기 — 웹 판 `land.js` 글자 지도 + 트랙별 "지형 → 에셋" 표 → 씨앗 고정 배치표(JSON).
 * Godot(`saga-godot/tools/build_from_layout.gd`)·Unity(`saga-unity/Assets/Editor/BuildFromLayout.cs`)가
 * 이 배치표를 각자 읽어 씬을 조립한다 — 두 트랙은 **코드를 나누지 않고 데이터(기획)만** 나눈다(루트 CLAUDE.md).
 *
 *   node tools/scene-layout/layout.mjs --kinds saga-godot/tools/layout/kinds.json \
 *        [--land saga-web/saga-go/js/land.js] [--region hebei] [--seed 20260824] [--out <파일>]
 *
 * 좌표: 격자 (tx,ty) 한 칸 = kinds.json 의 `cell` 미터. 격자 (0,0) 가운데가 원점, +x 동쪽, +z 남쪽(글자 그림에서 아래).
 * 같은 씨앗·같은 입력이면 배치표가 바이트까지 같다(진단 씨앗 20260824 가 기본값).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const require = createRequire(import.meta.url);
const { evalLand } = require(path.join(REPO, 'saga-web', 'tools', 'map-editor', 'server.js'));

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const kindsPath = arg('kinds');
if (!kindsPath) { console.error('사용법: node layout.mjs --kinds <트랙 kinds.json> [--land ..] [--region ..] [--seed ..] [--out ..]'); process.exit(1); }
const landPath = path.resolve(REPO, arg('land', 'saga-web/saga-go/js/land.js'));
const seed = Number(arg('seed', 20260824)) >>> 0;
const K = JSON.parse(fs.readFileSync(path.resolve(REPO, kindsPath), 'utf8'));
const L = evalLand(fs.readFileSync(landPath, 'utf8'));
const regionId = arg('region', Object.keys(L.LANDS)[0]);
L.use(regionId);
const R = L.region();
if (!R) { console.error('땅이 없다: ' + regionId); process.exit(1); }
const bad = L.validate(R);
if (bad.length) { console.error('지도 오류 — 맵 편집기로 먼저 고칠 것: ' + bad.slice(0, 5).join(' · ')); process.exit(1); }

function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const rnd = mulberry32(seed);
const lerp = (a, b, t) => a + (b - a) * t;
const r3 = (v) => Math.round(v * 1000) / 1000;
const cell = K.cell || 4;

const ground = [], items = [], missing = new Set();
for (let y = 0; y < R.map.length; y++) {
  for (let x = 0; x < R.map[y].length; x++) {
    const e = R.legend[R.map[y][x]];
    const tx = R.ox + x, ty = R.oy + y;
    const cx = tx * cell, cz = ty * cell;
    ground.push({ tx, ty, kind: e.kind, x: r3(cx), z: r3(cz) });
    const put = (spec, fixedCenter, label) => {
      if (!spec || !spec.assets || !spec.assets.length) return;
      const per = spec.per == null ? 1 : spec.per;
      // per 가 1.5 면 한 칸에 1개 + 50% 확률로 하나 더
      let n = Math.floor(per); if (rnd() < per - n) n++;
      for (let i = 0; i < n; i++) {
        const asset = spec.assets[Math.floor(rnd() * spec.assets.length)];
        const j = fixedCenter ? 0 : (spec.jitter == null ? 0.4 : spec.jitter);
        const sc = spec.scale || [1, 1];
        items.push({
          asset, kind: label, tx, ty,
          x: r3(cx + (rnd() - 0.5) * 2 * j * cell), y: 0, z: r3(cz + (rnd() - 0.5) * 2 * j * cell),
          rotY: r3(spec.rotate === false ? 0 : rnd() * 360), scale: r3(lerp(sc[0], sc[1], rnd())),
        });
      }
    };
    if (e.mark) {
      const m = (K.marks || {})[e.mark];
      if (m) put({ per: 1, jitter: 0, rotate: false, ...m, assets: m.assets || [m.asset] }, !m.jitter, '@' + e.mark); else missing.add('@' + e.mark);
      continue; // 명소 칸은 명소 물건만 — 지형 물건을 겹쳐 깔지 않는다
    }
    const k = (K.kinds || {})[e.kind];
    if (k) put(k, false, e.kind); else if (!(K.kinds || {}).hasOwnProperty(e.kind)) missing.add(e.kind);
  }
}

const out = {
  schema: 'saga-layout/1',
  source: path.relative(REPO, landPath).replace(/\\/g, '/'), region: R.id, name: R.name,
  kinds: path.relative(REPO, path.resolve(REPO, kindsPath)).replace(/\\/g, '/'), seed, cell,
  w: R.map[0].length, h: R.map.length, ox: R.ox, oy: R.oy,
  groundColors: K.groundColors || {},
  ground, items,
  places: R.places.map((p) => ({ id: p.id, name: p.name, hidden: !!p.hidden, x: r3(p.tx * cell), z: r3(p.ty * cell) })),
};
const json = JSON.stringify(out, null, 1) + '\n';
const outPath = arg('out');
if (outPath) {
  fs.mkdirSync(path.dirname(path.resolve(REPO, outPath)), { recursive: true });
  fs.writeFileSync(path.resolve(REPO, outPath), json, 'utf8');
}
const byKind = {};
items.forEach((i) => { byKind[i.kind] = (byKind[i.kind] || 0) + 1; });
console.log(`배치표 ${R.id} ${out.w}×${out.h}칸 · 한 칸 ${cell}m · 씨앗 ${seed} · 바닥 ${ground.length} · 물건 ${items.length} (` +
  Object.entries(byKind).map(([k, v]) => k + ' ' + v).join(', ') + ') · 명소 ' + out.places.length + (outPath ? ' → ' + outPath : ''));
if (missing.size) console.log('표에 없는 지형(바닥만 깐다): ' + [...missing].join(', '));
