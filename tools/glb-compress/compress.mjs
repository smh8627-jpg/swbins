#!/usr/bin/env node
/**
 * GLB 압축 파이프라인 — 다섯 판(saga-go·saga-dungeon·saga-forest·saga-story·
 * saga-realm) 이 공통으로 쓴다. 각 판은 assets/models/ 밑에 실제 GLB 파일을
 * 제 폴더에 따로 갖고 있다("다섯 벌 복사" 방침 그대로) — 이 스크립트는 그
 * 파일들을 갈아 끼우는 **도구**일 뿐이라 게임 폴더 밖(tools/)에 둔다.
 *
 * 무엇을 하나: geometry+animation 은 Meshopt로, 텍스처는 WebP로 다시
 * 압축한다(둘 다 three.js GLTFLoader가 별도 서버 설정 없이 그대로 읽는다 —
 * WebP는 EXT_texture_webp로 브라우저가 직접 디코드하고, Meshopt는
 * MeshoptDecoder.module.js가 파일 안에 wasm을 base64로 갖고 있어 file://
 * 단독판에서도 그대로 돈다). 뼈대(JOINTS/WEIGHTS)·애니메이션 클립 개수는
 * 그대로 두고 **용량만 줄인다** — simplify(정점 삭감)·palette·join·flatten·
 * instance 는 전부 꺼서 모양·구조를 안 건드린다.
 *
 * 사용법: node compress.mjs <대상 폴더> [--dry] [--force]
 *   대상 폴더    예: ../../saga-dungeon/assets/models
 *   --dry        실제로 바꾸지 않고 크기 변화만 미리 본다
 *   --force      이미 처리 표시(manifest)가 있어도 다시 돌린다
 *
 * 처리 기록은 대상 폴더 안 `.glb-compress-manifest.json`에 남는다 — 이미
 * 압축된 파일을 또 압축하면(특히 손실 WebP) 화질이 거듭 깎이므로, 한 번
 * 처리한 파일은 그 표를 보고 건너뛴다.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
/* .cmd 래퍼로 spawnSync 하면 윈도우에서 EINVAL 이 난다(node 20 알려진 함정) —
   node 로 cli.js 를 직접 부른다, OS 가리지 않는다 */
const CLI_JS = path.join(HERE, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const force = args.includes('--force');
const target = args.find((a) => !a.startsWith('--'));

if (!target) {
  console.error('사용법: node compress.mjs <대상 폴더> [--dry] [--force]');
  process.exit(1);
}

const root = path.resolve(target);
if (!fs.existsSync(root)) {
  console.error('없는 폴더: ' + root);
  process.exit(1);
}

const manifestPath = path.join(root, '.glb-compress-manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};

function walk(dir, out) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) { walk(p, out); }
    else if (name.isFile() && name.name.toLowerCase().endsWith('.glb')) { out.push(p); }
  }
  return out;
}

const files = walk(root, []);
console.log(`${files.length}개 GLB 발견 (${root})`);

const OPTIMIZE_FLAGS = [
  '--compress', 'meshopt', '--meshopt-level', 'high',
  '--texture-compress', 'webp', '--texture-size', '1024',
  '--simplify', 'false', '--palette', 'false', '--join', 'false',
  '--flatten', 'false', '--instance', 'false',
  '--resample', 'true', '--prune', 'true', '--weld', 'true', '--sparse', 'true'
];

let totalBefore = 0, totalAfter = 0, done = 0, skipped = 0, failed = 0;

for (const file of files) {
  const rel = path.relative(root, file);
  const before = fs.statSync(file).size;
  const rec = manifest[rel];
  if (!force && rec && rec.size === before) {
    skipped++;
    totalBefore += before; totalAfter += before;
    continue;
  }
  const tmp = file + '.tmp.glb';
  try {
    execFileSync(process.execPath, [CLI_JS, 'optimize', file, tmp, ...OPTIMIZE_FLAGS], { stdio: ['ignore', 'ignore', 'pipe'] });
    const after = fs.statSync(tmp).size;
    if (after <= 0 || after > before) {
      /* 압축이 오히려 커지면(이미 작은 파일 등) 원본을 그대로 둔다 */
      fs.unlinkSync(tmp);
      manifest[rel] = { size: before, result: 'kept-original', at: new Date().toISOString() };
      totalBefore += before; totalAfter += before;
      console.log(`- ${rel}  ${(before / 1024).toFixed(0)}KB → 그대로(이미 작음)`);
    } else {
      if (!dry) { fs.renameSync(tmp, file); } else { fs.unlinkSync(tmp); }
      manifest[rel] = { size: dry ? before : after, result: 'ok', at: new Date().toISOString() };
      totalBefore += before; totalAfter += after;
      done++;
      console.log(`✔ ${rel}  ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB` + (dry ? ' (dry-run, 실제로는 안 바꿈)' : ''));
    }
  } catch (e) {
    failed++;
    totalBefore += before; totalAfter += before;
    if (fs.existsSync(tmp)) { fs.unlinkSync(tmp); }
    console.error(`✘ ${rel}  실패: ${(e.stderr || e.message || e).toString().split('\n')[0]}`);
  }
}

if (!dry) { fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2)); }

console.log('---');
console.log(`처리 ${done} · 건너뜀(이미 처리) ${skipped} · 실패 ${failed}`);
console.log(`용량 ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB` +
  (totalBefore > 0 ? ` (${(100 - totalAfter / totalBefore * 100).toFixed(0)}% 감소)` : ''));
