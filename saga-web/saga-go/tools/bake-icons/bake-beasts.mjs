/**
 * 짐승 2D 지도 스탬프 굽기(2026-09-23) — `node tools/bake-icons/bake-beasts.mjs [키,키...]`  (saga-go 폴더에서)
 *
 * `js/sprite.js` 의 `PET_BEAST_FILE`(펫별)·`BEAST_FORM_FILES`(형태 풀)·`BG_BEAST_FILE`(배경 생물)에 적힌 키를 모아
 * `_bake_one.html?view=pet` 으로 **한 개씩 새로 연 페이지**에서 굽고(README "알려진 흠" — 한 페이지에서 몰아 구우면 간헐적으로 멎는다)
 * `assets/sprites2d/beast_<키>.png` 에 쓴다. 키 → 모델: `<이름>_x2` 는 `animals_extra2/<이름>`, 나머지는 animals → animals_extra →
 * animals_extra2 순으로 찾는다. 물고기 형태에 쓰이는 키는 yaw 1.4(거의 옆모습). 헤드리스 크롬은 제가 띄운 것만 끈다.
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { spawn } from 'node:child_process';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const outDir = path.join(root, 'assets', 'sprites2d');
const only = process.argv[2] ? new Set(process.argv[2].split(',')) : null;
const spr = fs.readFileSync(path.join(root, 'js', 'sprite.js'), 'utf8');
const block = name => { const i = spr.indexOf('var ' + name + ' = {'); return i < 0 ? '' : spr.slice(i, spr.indexOf('};', i)); };
const petFile = Object.fromEntries([...block('PET_BEAST_FILE').matchAll(/(p[tk]_[a-z0-9_]+): '([A-Za-z0-9_]+)'/g)].map(m => [m[1], m[2]]));
const formFiles = block('BEAST_FORM_FILES'), bgFiles = block('BG_BEAST_FILE');
const fishPets = new Set([...block('BEAST_FORM').matchAll(/(p[tk]_[a-z0-9_]+): 'fish'/g)].map(m => m[1]));
const keys = new Set([...Object.values(petFile), ...[...formFiles.matchAll(/'([A-Za-z0-9_]+)'/g)].map(m => m[1]), ...[...bgFiles.matchAll(/: '([A-Za-z0-9_]+)'/g)].map(m => m[1])]);
const fishKeys = new Set([...Object.entries(petFile).filter(([id]) => fishPets.has(id)).map(([, k]) => k), ...((formFiles.match(/fish: \[([^\]]*)\]/) || ['', ''])[1].match(/[A-Za-z0-9_]+/g) || [])]);
function urlOf(k) {
  if (/_x2$/.test(k)) { return 'assets/models/animals_extra2/' + k.slice(0, -3) + '.glb'; }
  for (const d of ['animals', 'animals_extra', 'animals_extra2']) for (const e of ['.glb', '.gltf']) { const u = `assets/models/${d}/${k}${e}`; if (fs.existsSync(path.join(root, u))) return u; }
  return null;
}
const jobs = [...keys].sort().filter(k => !only || only.has(k)).map(k => ({ key: k, url: urlOf(k), yaw: fishKeys.has(k) ? 1.4 : null })).filter(j => j.url);
console.log('굽기 ' + jobs.length + '개(물고기 ' + jobs.filter(j => j.yaw).length + ')');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const server = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const port = server.address().port;
const dbg = 9900 + Math.floor(Math.random() * 90), prof = fs.mkdtempSync(path.join(os.tmpdir(), 'iconprof-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${dbg}`, `--user-data-dir=${prof}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--no-first-run', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
const end = c => { try { chrome.kill(); } catch (e) {} server.close(); setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {} process.exit(c); }, 500); };
let wsUrl; for (let i = 0; i < 60 && !wsUrl; i++) { try { const l = await (await fetch(`http://127.0.0.1:${dbg}/json`)).json(); wsUrl = (l.find(x => x.type === 'page') || {}).webSocketDebuggerUrl; } catch (e) {} if (!wsUrl) await new Promise(r => setTimeout(r, 500)); }
const ws = new WebSocket(wsUrl); await new Promise(r => ws.onopen = r); let nid = 0; const w = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && w.has(m.id)) { w.get(m.id)(m.result); w.delete(m.id); } };
const send = (method, params = {}) => new Promise(r => { const id = ++nid; w.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => ((await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result || {}).value;
fs.mkdirSync(outDir, { recursive: true }); let ok = 0; const fails = [];
for (const j of jobs) {
  let got = null;
  for (let attempt = 0; attempt < 2 && !got; attempt++) {
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/tools/bake-icons/_bake_one.html?key=${encodeURIComponent(j.key)}&group=beast&view=pet${j.yaw ? "&yaw=" + j.yaw : ""}&url=${encodeURIComponent('../../' + j.url)}` });
    const t0 = Date.now();
    while (Date.now() - t0 < 70000) { await new Promise(r => setTimeout(r, 300)); const t = await ev('document.title'); if (/BAKE_ONE_DONE/.test(t || '')) break; }
    const man = await ev('document.getElementById("manifest").textContent');
    try { const e = JSON.parse(man)[0]; if (e.ok) got = e.dataURL; } catch (e) {}
  }
  if (got) { fs.writeFileSync(path.join(outDir, 'beast_' + j.key + '.png'), Buffer.from(got.split(',')[1], 'base64')); ok++; } else fails.push(j.key);
  process.stdout.write(`${j.key}:${got ? 'ok' : 'FAIL'} `);
}
console.log(`\n아이콘 ${ok}/${jobs.length}` + (fails.length ? ' 실패 ' + fails.join(',') : ''));
end(0);
