/**
 * 게임 파일을 mobile/www 로 복사한다.
 * ---------------------------------------------------------------
 * 앱에 들어갈 것만 고른다 — 서버·node_modules·자가진단 페이지는 넣지 않는다.
 * (APK 크기와 무관하게, 앱 안에 개발용 페이지가 섞이면 헷갈린다)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '..');
const WWW = path.join(HERE, 'www');

const FILES = ['index.html', 'manifest.json', 'sw.js'];
const DIRS = ['css', 'js', 'icons'];

fs.rmSync(WWW, { recursive: true, force: true });
fs.mkdirSync(WWW, { recursive: true });

let n = 0;
for (const f of FILES) {
  fs.copyFileSync(path.join(SRC, f), path.join(WWW, f));
  n++;
}
for (const d of DIRS) {
  fs.cpSync(path.join(SRC, d), path.join(WWW, d), {
    recursive: true,
    // 확장 보관분(js/_expansion)은 본편 앱에 넣지 않는다
    filter: (src) => !src.includes('_expansion')
  });
  n += fs.readdirSync(path.join(SRC, d)).length;
}
console.log(`www 준비 완료 — ${n}개 항목 (${WWW})`);
