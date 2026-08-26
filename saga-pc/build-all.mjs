/**
 * 다섯 판을 한 폴더에 굽는다 — 집 PC 로 통째로 옮길 묶음
 * ---------------------------------------------------------------
 * 각 게임의 build/build-single.mjs 를 차례로 돌리고, 나온 html 다섯 개를
 * 여기 dist/ 로 모은 뒤 **런처(시작.html)** 를 만든다.
 *
 * 왜 한 폴더에 모아도 되나 — 다섯 판은 file:// 에서 같은 출처를 쓰지만
 * 세이브 키가 게임마다 다르다(`deungyong-go/save/…` · `yeoksa-dungeon/save/…` …).
 * 그래서 진행이 서로 섞이지 않는다. 가입(프로필) 목록도 게임마다 따로 산다.
 *
 * 쓰는 법:  node build-all.mjs      (또는 build-all.bat 더블클릭)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = path.resolve(HERE, '..');
const DIST = path.join(HERE, 'dist');

const GAMES = [
  { dir: 'saga-go',      name: '사가고',     sub: '포켓몬GO 처럼 — 걷고 만난다',        icon: '🧭' },
  { dir: 'saga-dungeon', name: '사가블로',   sub: '디아블로 처럼 — 내려간다',           icon: '🕳️' },
  { dir: 'saga-forest',  name: '사가의숲',   sub: '동물의숲 처럼 — 모으고 나눈다',      icon: '🏡' },
  { dir: 'saga-story',   name: '사가스토리', sub: '메이플스토리 처럼 — 뛰고 썬다',      icon: '🏃' },
  { dir: 'saga-realm',   name: '사가국지',   sub: '턴제 삼국지 — 다스리고 꾀고 친다',   icon: '🏯' }
];

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

const made = [];
for (const g of GAMES) {
  const cwd = path.join(TOOLS, g.dir);
  process.stdout.write(`· ${g.name} 굽는 중… `);
  execFileSync(process.execPath, ['build/build-single.mjs'], { cwd, stdio: 'pipe' });
  const src = path.join(cwd, 'dist', g.name + '.html');
  if (!fs.existsSync(src)) { throw new Error(g.name + ' 결과 파일이 없습니다: ' + src); }
  const dst = path.join(DIST, g.name + '.html');
  fs.copyFileSync(src, dst);
  const kb = (fs.statSync(dst).size / 1024).toFixed(0);
  made.push({ ...g, kb });
  console.log(`${kb}KB`);
}

/* ── 런처 ─────────────────────────────────────────────── */

const cards = made.map((g) => `      <a class="card" href="./${g.name}.html">
        <span class="ico">${g.icon}</span>
        <span class="meta"><b>${g.name}</b><small>${g.sub}</small></span>
        <span class="kb">${g.kb}KB</span>
      </a>`).join('\n');

const launcher = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>사가 시리즈 — 다섯 판</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:grid; place-items:center;
         background:radial-gradient(120% 80% at 50% 0%, #1d2130, #0b0d12 70%);
         color:#eef1f6; font:400 14px/1.7 "Malgun Gothic", system-ui; }
  .wrap { width:min(560px, calc(100vw - 32px)); padding:26px 0; }
  h1 { margin:0 0 4px; font-size:20px; color:#f5b445; }
  p.sub { margin:0 0 20px; font-size:12.5px; color:#9aa3b2; }
  .card { display:flex; align-items:center; gap:14px; padding:14px 16px; margin-bottom:9px;
          border-radius:18px; text-decoration:none; color:inherit;
          background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.10);
          transition:transform .12s, background .12s, border-color .12s; }
  .card:hover { transform:translateY(-2px); background:rgba(245,180,69,.12);
                border-color:rgba(245,180,69,.45); }
  .ico { font-size:26px; width:44px; text-align:center; }
  .meta { display:flex; flex-direction:column; }
  .meta b { font-size:15px; }
  .meta small { font-size:11.5px; color:#9aa3b2; }
  .kb { margin-left:auto; font:600 11px ui-monospace, Consolas, monospace; color:#7f8796; }
  .foot { margin-top:18px; font-size:11.5px; color:#7f8796; line-height:1.8; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>사가 시리즈</h1>
    <p class="sub">다섯 판이 각각 따로 돌아갑니다 — 진행도 따로 저장됩니다.</p>
${cards}
    <div class="foot">
      · 처음 열면 <b>이름</b>을 물어봅니다. 그 이름으로 진행이 저장됩니다(이 PC 안에만).<br>
      · 이름은 게임마다 따로입니다. 상단 <b>👤</b> 에서 바꾸거나 새 이름으로 시작할 수 있습니다.<br>
      · 인터넷이 되면 사가고의 지도가 실제 지도로 깔립니다. 안 되면 그림 지형으로 바뀝니다.<br>
      · 실제 위치(GPS)는 파일로 열면 브라우저가 막습니다 — 키보드 이동과 🤖 자동으로 노세요.
    </div>
  </div>
</body>
</html>
`;
/* 런처는 **index.html** 로 둔다 — 이름이 ASCII 라야 배치 파일이 가리킬 수 있다
   (한글 cmd 는 UTF-8 한글 경로를 오파싱한다). 폴더에서 바로 눌러도 된다. */
fs.writeFileSync(path.join(DIST, 'index.html'), launcher, 'utf8');

fs.writeFileSync(path.join(DIST, 'play.bat'),
  '@echo off\r\n' +
  'REM Saga series launcher (double-click me)\r\n' +
  'cd /d "%~dp0"\r\n' +
  'start "" "index.html"\r\n', 'ascii');

fs.writeFileSync(path.join(DIST, '사용법.txt'),
  [
    '사가 시리즈 — PC 단독 실행판 (다섯 판)',
    '',
    '1) 이 폴더를 통째로 집 PC 로 복사하세요 (USB · 메일 · 클라우드 아무거나).',
    '2) play.bat 을 더블클릭하면 런처가 열립니다.',
    '   (index.html 을 직접 더블클릭해도 같습니다)',
    '',
    '다섯 판은 각각 따로 돌아갑니다 — 진행도 따로 저장됩니다.',
    '  사가고      포켓몬GO 처럼 걷고 만난다',
    '  사가블로    디아블로 처럼 내려간다',
    '  사가의숲    동물의숲 처럼 모으고 나눈다',
    '  사가스토리  메이플스토리 처럼 뛰고 썬다',
    '  사가국지    턴제 삼국지 — 다스리고 꾀고 친다',
    '',
    '알아 둘 것',
    '  · 처음 열면 이름을 물어봅니다 — 그 이름으로 진행이 저장됩니다(이 PC 안에만).',
    '  · 이름은 게임마다 따로입니다. 상단 사람 아이콘에서 바꾸거나 새 이름을 만듭니다.',
    '  · 인터넷이 되면 사가고의 지도가 실제 지도로 깔립니다. 안 되면 그림 지형입니다.',
    '  · 실제 위치(GPS)는 파일로 열면 브라우저가 막습니다 — 키보드 이동과 자동으로 노세요.',
    ''
  ].join('\r\n'), 'utf8');

console.log(`\n묶음 완료 — ${DIST}`);
console.log(`  ${made.length}개 판 + index.html (런처) + play.bat`);
console.log('  이 폴더를 통째로 집 PC 로 옮기고 play.bat 을 더블클릭하세요.');
