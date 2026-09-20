/**
 * 초상 굽기 (SAGA-DESIGN §11 Phase 1) — 도감·카드 초상을 오프라인으로 한 번 구워
 * `<게임>/assets/portraits/` 에 webp 파일로 둔다. 게임은 이 파일을 곧바로 <img> 로 쓴다.
 *
 *   node tools/bake-portraits/bake.mjs <게임폴더> [--kind=hero|pet] [--limit=N] [--only=id,id]
 *
 * 그림은 **게임 자신의 `DG.portrait3d.warm()`** 이 굽는다 — 이 도구는 헤드리스 크롬(swiftshader)을
 * CDP 로 부려 결과 dataURL 을 webp 로 바꿔 받을 뿐이다. 그래서 다섯 판이 각자 다른 굽기 방식
 * (콜백/폴링, 굽는 대상 범위)을 가져도 도구는 하나다.
 *
 * 자리: 정사각(초상 96px → 192px)과 카드(150×172 → 300×344) 두 벌. 구워지지 않은 것(3D 모델이
 * 없는 펫·이 판이 안 굽는 종류)은 파일이 없고 `manifest.js` 에도 안 적힌다 → 게임은 여태처럼 굽는다.
 *
 * 헤드리스 크롬은 끝나면 이 스크립트가 **자기가 띄운 PID 만** 죽인다(크롬 통째 kill 금지).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import os from 'node:os';

const args = process.argv.slice(2);
const gameDir = path.resolve(args.find(a => !a.startsWith('--')) || '.');
const opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v === undefined ? true : v]; }));
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SQ = { w: 96, h: 96, tag: 's' }, CARD = { w: 150, h: 172, tag: 'c' };
const QUALITY = 0.8;
const OUT = path.resolve(opt.out || path.join(gameDir, 'assets', 'portraits'));

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.hdr': 'application/octet-stream', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(gameDir, p);
  if (!f.startsWith(gameDir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const dbg = 9400 + Math.floor(Math.random() * 500);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'bakeprof-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${dbg}`, `--user-data-dir=${prof}`,
  ...(opt.gl ? ['--use-angle=' + opt.gl, '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox']),
  '--force-device-scale-factor=2', '--window-size=900,700', '--no-first-run', '--mute-audio',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'
], { stdio: 'ignore' });

function done(code) {
  try { chrome.kill(); } catch (e) { /* 이미 끝남 */ }
  try { server.close(); } catch (e) { /* */ }
  setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) { /* */ } process.exit(code); }, 500);
}
process.on('SIGINT', () => done(1));

async function getWs() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${dbg}/json`);
      const list = await r.json();
      const t = list.find(x => x.type === 'page');
      if (t) return t.webSocketDebuggerUrl;
    } catch (e) { /* 아직 안 떴다 */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('크롬 디버그 포트가 안 열림');
}

const ws = new WebSocket(await getWs());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let nid = 0; const waits = new Map(); const logs = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && waits.has(m.id)) { const w = waits.get(m.id); waits.delete(m.id); m.error ? w.rej(new Error(m.error.message)) : w.res(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') { logs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)); }
};
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++nid; waits.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
async function evalJs(expr, timeout = 120000) {
  const r = await Promise.race([
    send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('evaluate 시간 초과')), timeout))
  ]);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });

  /* three·데이터·굽기 준비 — 스크립트가 다 올라올 때까지 */
  let ok = false;
  for (let i = 0; i < 120 && !ok; i++) {
    await new Promise(r => setTimeout(r, 1000));
    ok = await evalJs(`!!(window.DG && DG.portrait3d && DG.data && DG.data.heroes && window.THREE && DG.portrait3d.ready())`).catch(() => false);
  }
  if (!ok) throw new Error('게임이 준비되지 않음(portrait3d.ready 거짓) ' + logs.slice(0, 3).join(' | '));

  /* 이미 구운 디스크 초상이 굽기를 가로채지 않게 — 다시 굽는 것은 게임의 3D 굽기여야 한다 */
  await evalJs('window.DG.portraitDisk = null; true');

  /* 페이지 쪽 굽는 함수 — 한 개 굽고 webp dataURL 을 돌려준다(못 구우면 null) */
  await evalJs(`(function () {
    /* 사가블로처럼 무거운 조립을 게임 루프의 asset3d.tick() 이 한 프레임에 하나씩 비우는 판이 있다 — 굽기 페이지엔 루프가 없으니 대신 돌린다 */
    if (DG.asset3d && DG.asset3d.tick) { setInterval(function () { try { DG.asset3d.tick(); } catch (e) { /* 조립 실패는 게임 쪽 기록 */ } }, 40); }
    window.__bake = function (kind, id, w, h, quality) {
      return new Promise(function (resolve) {
        var P = DG.portrait3d, ref = DG.data.find(id);
        if (!ref) { resolve(null); return; }
        var t0 = Date.now();
        P.warm(kind, ref, w, h);
        (function poll() {
          var u = P.of(kind, ref, w, h);
          if (u) {
            var im = new Image();
            im.onload = function () {
              var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
              c.getContext('2d').drawImage(im, 0, 0);
              resolve(c.toDataURL('image/webp', quality));
            };
            im.onerror = function () { resolve(null); };
            im.src = u; return;
          }
          if (Date.now() - t0 > 45000 || (P.willSwap && !P.willSwap(kind, ref, w, h) && Date.now() - t0 > 1500)) { resolve(null); return; }
          setTimeout(poll, 120);
        })();
      });
    };
    return true;
  })()`);

  /* --eval=파일.js : 페이지 안에서 그 스크립트를 돌려 결과를 찍고 끝낸다(굽기가 안 될 때 원인 캐기용) */
  if (opt.eval) { console.log(JSON.stringify(await evalJs(fs.readFileSync(opt.eval, 'utf8'), 90000)), logs.slice(0, 5)); done(0); await new Promise(() => {}); }

  /* --tune=키:값 — 굽는 동안만 손잡이를 바꾼다(예: 외곽선 끄기 world3d.outline:0). 임시 프로필이라 세이브에 안 남는다 */
  if (opt.tune) { for (const kv of String(opt.tune).split(',')) { const [k, v] = kv.split(':'); await evalJs('DG.core.setTune(' + JSON.stringify(k) + ', ' + Number(v) + '); true'); } }

  const kinds = opt.kind ? [opt.kind] : ['hero', 'pet'];
  const only = opt.only ? String(opt.only).split(',') : null;
  const manifest = { hero: { s: [], c: [] }, pet: { s: [], c: [] } };
  const t0 = Date.now();
  fs.mkdirSync(OUT, { recursive: true });

  for (const kind of kinds) {
    let ids = await evalJs(`DG.data.${kind === 'hero' ? 'heroes' : 'pets'}.map(function (x) { return x.id; })`);
    if (only) ids = ids.filter(i => only.includes(i));
    if (opt.limit) ids = ids.slice(0, +opt.limit);
    fs.mkdirSync(path.join(OUT, kind), { recursive: true });
    let n = 0, miss = 0;
    for (const id of ids) {
      for (const sz of [SQ, CARD]) {
        const url = await evalJs(`window.__bake(${JSON.stringify(kind)}, ${JSON.stringify(id)}, ${sz.w}, ${sz.h}, ${QUALITY})`, 70000).catch(() => null);
        if (url && url.startsWith('data:image/webp')) {
          fs.writeFileSync(path.join(OUT, kind, `${id}_${sz.tag}.webp`), Buffer.from(url.split(',')[1], 'base64'));
          manifest[kind][sz.tag].push(id);
          n++;
        } else {
          miss++;
          if (miss <= 2) { console.log(`  못 구움 ${kind}:${id}:${sz.tag} — ` + (await evalJs('JSON.stringify(DG.portrait3d.stats())').catch(() => '?')) + (logs.length ? ' · 페이지 예외 ' + logs[logs.length - 1].slice(0, 160) : '')); }
        }
      }
      if ((n + miss) % 20 === 0) console.log(`${kind} ${n + miss}/${ids.length * 2}  ok ${n} miss ${miss}  ${Math.round((Date.now() - t0) / 1000)}s`);
    }
    console.log(`${kind} 끝 — 구움 ${n}, 못 구움 ${miss} (전체 ${ids.length * 2})`);
  }

  /* manifest — 부분 실행이면 기존 것과 합친다 */
  const mfPath = path.join(OUT, 'manifest.js');
  let prev = { hero: { s: '', c: '' }, pet: { s: '', c: '' } };
  if (fs.existsSync(mfPath)) {
    try { const m = fs.readFileSync(mfPath, 'utf8').match(/DG\.portraitDisk=(\{.*\});/s); if (m) prev = JSON.parse(m[1]).ids; } catch (e) { /* 새로 쓴다 */ }
  }
  const ids = {};
  for (const k of ['hero', 'pet']) {
    ids[k] = {};
    for (const t of ['s', 'c']) {
      const set = new Set([...(prev[k] && prev[k][t] ? String(prev[k][t]).split(',').filter(Boolean) : []), ...manifest[k][t]]);
      ids[k][t] = [...set].sort().join(',');
    }
  }
  fs.writeFileSync(mfPath, `/* bake-portraits 가 쓴다 — 손으로 고치지 않는다. 구운 초상 목록(s=정사각 96, c=카드 150×172). */\n(function(g){g.DG=g.DG||{};g.DG.portraitDisk=${JSON.stringify({ v: 1, base: 'assets/portraits/', ids })};})(window);\n`);
  console.log('manifest.js 갱신');
  if (logs.length) console.log('페이지 예외 ' + logs.length + '건, 첫 건: ' + logs[0].slice(0, 200));
  done(0);
} catch (e) {
  console.error('실패:', e.message);
  done(1);
}
