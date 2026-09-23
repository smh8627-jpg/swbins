/**
 * saga-web 편집기 공용 — 판 폴더를 편집기 서버에서 그대로 서빙한다(읽기 전용).
 *
 *   /play/<판>/...   편집기 안 "▶ 실행" 창. 게임을 그대로 띄운다.
 *   /g/<판>/...      편집기 화면이 그 판의 js·모델을 **게임과 같은 상대 경로**로 부를 때(3D 배치 화면).
 *   /play-panel.js   편집기 화면에 "▶ 실행" 창을 붙이는 공용 스크립트(같은 폴더 play-panel.js).
 *
 * 둘 다 같은 파일을 준다. 다른 점:
 *   - 캐시 안 함(`no-store`) — 편집기가 저장하면 다음 새로고침에 곧바로 새 파일이 온다.
 *   - `/play/<판>/sw.js` 는 **스스로 등록을 푸는 빈 서비스워커**를 준다. 진짜 sw.js 는 파일을 오래 쥐고 있어
 *     고친 뒤에도 옛 화면이 뜬다. 판 파일은 안 건드린다.
 *   - `/play/<판>/index.html` 끝에 시작 자리 스크립트를 붙인다(`?at=x,y` — 판마다 다르다, START 표).
 *
 * 편집기 서버는 게임 서버와 **출처(포트)가 달라** localStorage 도 따로다 — 실행 창의 세이브는
 * 연습용이고, 실제 게임(8791~) 세이브와 섞이지 않는다.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.vrm': 'model/gltf-binary',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.hdr': 'application/octet-stream', '.ktx2': 'image/ktx2',
  '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
  '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

const SW_STUB = [
  '/* 편집기 실행 창 전용 — 진짜 sw.js 대신. 등록되자마자 스스로 풀려 캐시를 안 쥔다 */',
  "self.addEventListener('install', function () { self.skipWaiting(); });",
  "self.addEventListener('activate', function (e) {",
  '  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })',
  '    .then(function () { return self.registration.unregister(); }));',
  '});',
  '',
].join('\n');

/* 시작 자리 — 판마다 세이브 모양이 달라 여기 적는다. 없는 판은 `?at` 을 무시한다.
   값은 `?at=x,y`(미터). 게임이 뜬 뒤 한 번 옮긴다(`_demo.html` 의 `#land` 와 같은 요령) */
const START = {
  'saga-go': {
    pos: 'return DG.core && DG.core.save && DG.core.save.player ? DG.core.save.player.pos : null;',
    after: 'if (DG.world && DG.world.resize) { DG.world.resize(); }',
  },
};

/* 세이브를 불러오거나 프로필을 고르면 자리가 되돌아갈 수 있어 **자리가 가만히 있을 때까지**
   몇 번 더 본다(30m 넘게 벗어나 있으면 다시 옮긴다, 네 번 연속 제자리면 끝, 최대 15초) */
function startScript(game) {
  const S = START[game];
  if (!S) return '';
  return '\n<script>/* 편집기 실행 창 — 시작 자리(?at=x,y). 판 파일이 아니라 편집기가 붙인 것 */\n' +
    '(function () {\n' +
    "  var m = /[?&]at=(-?[\\d.]+),(-?[\\d.]+)/.exec(location.search); if (!m) { return; }\n" +
    '  var x = +m[1], y = +m[2], n = 0, still = 0;\n' +
    '  function pos() { try { ' + S.pos + ' } catch (e) { return null; } }\n' +
    '  function tick() {\n' +
    '    var p = pos();\n' +
    '    if (p) {\n' +
    '      if (Math.hypot(p.x - x, p.y - y) > 30) { p.x = x; p.y = y; still = 0; try { ' + S.after + ' } catch (e) {} }\n' +
    '      else if (++still >= 4) { return; }\n' +
    '    }\n' +
    '    if (++n < 60) { setTimeout(tick, 250); }\n' +
    '  }\n' +
    "  window.addEventListener('load', function () { setTimeout(tick, 400); });\n" +
    '})();\n</script>\n';
}

function send404(res, msg) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(msg || 'not found');
}

/**
 * 요청이 /play/·/g/ 이면 처리하고 true. 아니면 false(부르는 쪽이 계속 판정).
 * @param root  saga-web/ 경로
 * @param games 판 폴더 이름 목록
 * @param extra { '<판>/<경로>': (res) => void } — /g/ 아래 가상 파일(편집기 화면을 판 경로에 얹을 때)
 */
function handle(req, res, u, root, games, extra) {
  if (req.method === 'GET' && u.pathname === '/play-panel.js') {
    res.writeHead(200, { 'Content-Type': MIME['.js'], 'Cache-Control': 'no-store' });
    res.end(fs.readFileSync(path.join(__dirname, 'play-panel.js')));
    return true;
  }
  const m = /^\/(play|g)\/([a-z0-9-]+)(\/.*)?$/.exec(u.pathname);
  if (!m || req.method !== 'GET') return false;
  const kind = m[1], game = m[2];
  if (games.indexOf(game) < 0) { send404(res, '모르는 판'); return true; }
  if (!m[3]) { res.writeHead(302, { Location: '/' + kind + '/' + game + '/' + u.search }); res.end(); return true; }
  let rel;
  try { rel = decodeURIComponent(m[3].slice(1)); } catch (e) { send404(res); return true; }
  if (rel === '' ) rel = 'index.html';
  if (kind === 'g' && extra && extra[game + '/' + rel]) { extra[game + '/' + rel](res); return true; }
  const head = { 'Cache-Control': 'no-store' };
  if (kind === 'play' && rel === 'sw.js') {
    res.writeHead(200, Object.assign({ 'Content-Type': MIME['.js'] }, head));
    res.end(SW_STUB);
    return true;
  }
  const base = path.join(root, game);
  const target = path.resolve(base, rel);
  if (!target.startsWith(base + path.sep)) { res.writeHead(403); res.end('forbidden'); return true; }
  let st;
  try { st = fs.statSync(target); } catch (e) { send404(res); return true; }
  if (!st.isFile()) { send404(res); return true; }
  const type = MIME[path.extname(target).toLowerCase()] || 'application/octet-stream';
  let body = fs.readFileSync(target);
  if (kind === 'play' && rel === 'index.html') {
    const s = startScript(game);
    if (s) {
      const html = body.toString('utf8');
      const at = html.lastIndexOf('</body>');
      body = Buffer.from(at >= 0 ? html.slice(0, at) + s + html.slice(at) : html + s, 'utf8');
    }
  }
  res.writeHead(200, Object.assign({ 'Content-Type': type, 'Content-Length': body.length }, head));
  res.end(body);
  return true;
}

module.exports = { handle, MIME, START, SW_STUB, startScript };
