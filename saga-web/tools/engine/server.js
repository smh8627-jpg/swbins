/**
 * 사가 엔진 서버 — 로컬 전용(127.0.0.1:8801). 게임 서버가 아니다. `run-engine.bat` 으로 켤 때만 뜬다.
 *
 *   /                          편집기(editor/)
 *   /runtime/…                 실행기(play.html·sim·view·play) — three.iife.js 는 saga-forest 번들을 그대로 준다
 *   /lib/<판>/<assets 아래>     다섯 판 에셋(models·textures·audio) 읽기 전용 — 프로젝트는 'lib:<판>/<경로>' 로 가리킨다
 *   /projects/<id>/assets/…    프로젝트가 올린 모델('proj:<파일>')
 *   /api/projects              목록 · /api/templates 틀 목록 · /api/assets 에셋 목록(GLB 몸짓 이름까지)
 *   /api/project/<id>          GET 읽기 · POST {project, base} 저장
 *   /api/new                   POST {id, title, template} 새 프로젝트
 *   /api/upload/<id>?name=     POST 몸통 = .glb 바이트
 *   /api/export/<id>           POST → dist/<id>/ 에 바로 도는 폴더(index.html 하나 열면 된다)
 *
 * 저장이 막히는 것: 검사 오류(sim.js validate) · 실명 가드(content-editor/realname) · 그새 파일이 바뀜(md5).
 * 시험할 땐 SAGA_ENGINE_PORT · SAGA_ENGINE_PROJECTS · SAGA_ENGINE_DIST · SAGA_WEB_ROOT 로 다른 곳을 가리킨다.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const SIM = require('./runtime/sim.js');
require('./runtime/combat.js');   // 전투 스타일을 SIM 에 등록(검사가 스타일 이름을 안다)
require('./runtime/systems.js');  // 시스템 컴포넌트·행동을 SIM 표에 등록(검사·편집기 칸)
require('./runtime/basics.js');   // 기본기(스위치·문·파티클·아이템·컷신·효과·음악)
require('./runtime/genres.js');   // 장르(장비·꾸미기·영지·던전)
const realname = require('../content-editor/realname');

const HERE = __dirname;
const WEB = process.env.SAGA_WEB_ROOT ? path.resolve(process.env.SAGA_WEB_ROOT) : path.join(HERE, '..', '..');
const PROJ = process.env.SAGA_ENGINE_PROJECTS ? path.resolve(process.env.SAGA_ENGINE_PROJECTS) : path.join(HERE, 'projects');
const DIST = process.env.SAGA_ENGINE_DIST ? path.resolve(process.env.SAGA_ENGINE_DIST) : path.join(HERE, 'dist');
const TEMPLATES = path.join(HERE, 'templates');
const PORT = +process.env.SAGA_ENGINE_PORT || 8801;
/* 같은 파일이 여러 판에 있으면 앞 판 것을 쓴다 */
const GAMES = ['saga-go', 'saga-forest', 'saga-story', 'saga-realm', 'saga-dungeon'];
const LIB_DIRS = ['models', 'textures', 'audio'];
const THREE_SRC = ['saga-forest', 'saga-go', 'saga-story', 'saga-realm', 'saga-dungeon'].map((g) => path.join(WEB, g, 'js', 'vendor', 'three.iife.js'));
const RUNTIME_FILES = ['play.html', 'sim.js', 'combat.js', 'systems.js', 'basics.js', 'genres.js', 'view.js', 'play.js', 'play-combat.js', 'play-systems.js', 'play-basics.js', 'play-genres.js'];
const MAX_UPLOAD = 30 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.wav': 'audio/wav', '.hdr': 'application/octet-stream', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8'
};

const md5 = (t) => crypto.createHash('md5').update(t).digest('hex');
const idOk = (id) => /^[a-z0-9][a-z0-9-]{0,39}$/.test(id || '');
const projFile = (id) => path.join(PROJ, id, 'project.json');
const stringify = (p) => JSON.stringify(p, null, 2) + '\n';

function threePath() { return THREE_SRC.find((p) => fs.existsSync(p)); }

/* 경로가 base 밖으로 새지 않게 */
function inside(base, rel) {
  const p = path.resolve(base, rel);
  return p === base || p.startsWith(base + path.sep) ? p : null;
}

function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function sendFile(res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { return send(res, 404, { error: '없다' }); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
}
function readBody(req, max) {
  return new Promise((ok, no) => {
    const bufs = []; let n = 0;
    req.on('data', (b) => { n += b.length; if (n > max) { no(new Error('너무 크다')); req.destroy(); } else { bufs.push(b); } });
    req.on('end', () => ok(Buffer.concat(bufs)));
    req.on('error', no);
  });
}

/* ── 프로젝트 ─────────────────────────────────────────────────────────── */
function listProjects() {
  if (!fs.existsSync(PROJ)) { return []; }
  return fs.readdirSync(PROJ).filter((d) => fs.existsSync(projFile(d))).map((id) => {
    const t = fs.readFileSync(projFile(id));
    let p = {};
    try { p = JSON.parse(t); } catch (e) { return { id, title: '(깨진 파일)', broken: String(e.message) }; }
    return { id, title: p.title, scenes: (p.scenes || []).length, md5: md5(t), mtime: fs.statSync(projFile(id)).mtimeMs };
  }).sort((a, b) => b.mtime - a.mtime);
}
function readProject(id) {
  const t = fs.readFileSync(projFile(id));
  return { project: JSON.parse(t), md5: md5(t) };
}
function checkProject(p) {
  const v = SIM.validate(p);
  const rn = realname.guard('표시 글자', ...SIM.displayTexts(p));
  if (rn) { v.errors.push(rn); }
  return v;
}
function saveProject(id, p, base) {
  if (!idOk(id)) { return { code: 400, body: { error: 'id 형식' } }; }
  if (p.id !== id) { return { code: 400, body: { error: 'project.id 가 주소와 다르다' } }; }
  const f = projFile(id);
  if (fs.existsSync(f)) {
    const cur = md5(fs.readFileSync(f));
    if (base !== cur) { return { code: 409, body: { error: '그새 파일이 바뀌었다(다른 창·손 편집) — 다시 불러온 뒤 고칠 것', md5: cur } }; }
  }
  const v = checkProject(p);
  if (v.errors.length) { return { code: 422, body: { error: '검사 오류', errors: v.errors, warns: v.warns } }; }
  const t = stringify(p);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, t);
  return { code: 200, body: { ok: true, md5: md5(Buffer.from(t)), warns: v.warns } };
}
function listTemplates() {
  if (!fs.existsSync(TEMPLATES)) { return []; }
  return fs.readdirSync(TEMPLATES).filter((f) => f.endsWith('.json')).map((f) => {
    const p = JSON.parse(fs.readFileSync(path.join(TEMPLATES, f), 'utf8'));
    return { name: f.replace(/\.json$/, ''), title: p.title, desc: p.desc || '', scenes: (p.scenes || []).length };
  });
}
function newProject(id, title, template) {
  if (!idOk(id)) { return { code: 400, body: { error: 'id 는 영소문자·숫자·- (예: my-game)' } }; }
  if (fs.existsSync(path.join(PROJ, id))) { return { code: 409, body: { error: '이미 있다: ' + id } }; }
  let p;
  if (template && template !== 'blank') {
    const tf = inside(TEMPLATES, template + '.json');
    if (!tf || !fs.existsSync(tf)) { return { code: 400, body: { error: '모르는 틀: ' + template } }; }
    p = JSON.parse(fs.readFileSync(tf, 'utf8'));
  } else { p = SIM.blank(id, title); }
  p.id = id;
  if (title) { p.title = title; }
  return saveProject(id, p, null);
}

/* ── 에셋 목록 — GLB 머리(JSON 덩이)만 읽어 몸짓 이름을 뽑는다 ──────────────── */
let assetCache = null;
function glbInfo(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const h = Buffer.alloc(20);
    fs.readSync(fd, h, 0, 20, 0);
    if (h.readUInt32LE(0) !== 0x46546C67) { return null; }
    const len = h.readUInt32LE(12);
    if (len > 8 * 1024 * 1024) { return { anims: [] }; }
    const j = Buffer.alloc(len);
    fs.readSync(fd, j, 0, len, 20);
    const g = JSON.parse(j.toString('utf8'));
    return { anims: (g.animations || []).map((a) => a.name), skinned: !!(g.skins && g.skins.length) };
  } catch (e) { return null; } finally { fs.closeSync(fd); }
}
function listAssets() {
  if (assetCache) { return assetCache; }
  const seen = new Map(), out = [];
  for (const g of GAMES) {
    const root = path.join(WEB, g, 'assets', 'models');
    if (!fs.existsSync(root)) { continue; }
    const walk = (d) => {
      for (const n of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, n.name);
        if (n.isDirectory()) { if (!n.name.startsWith('_')) { walk(f); } continue; }
        if (!/\.glb$/i.test(n.name)) { continue; }
        const rel = path.relative(path.join(WEB, g, 'assets'), f).split(path.sep).join('/');
        const size = fs.statSync(f).size;
        const key = rel + '|' + size;
        if (seen.has(key)) { continue; }
        seen.set(key, 1);
        const info = glbInfo(f) || { anims: [] };
        const parts = rel.split('/');
        out.push({ ref: 'lib:' + g + '/' + rel, game: g, cat: parts[1] || '', name: n.name.replace(/\.glb$/i, ''), size, anims: info.anims, skinned: !!info.skinned });
      }
    };
    walk(root);
  }
  out.sort((a, b) => (a.cat + a.name).localeCompare(b.cat + b.name));
  assetCache = out;
  return out;
}
function projectAssets(id) {
  const d = path.join(PROJ, id, 'assets');
  if (!fs.existsSync(d)) { return []; }
  return fs.readdirSync(d).filter((n) => /\.glb$/i.test(n)).map((n) => {
    const info = glbInfo(path.join(d, n)) || { anims: [] };
    return { ref: 'proj:' + n, game: '(이 프로젝트)', cat: 'uploaded', name: n.replace(/\.glb$/i, ''), size: fs.statSync(path.join(d, n)).size, anims: info.anims, skinned: !!info.skinned };
  });
}

/* ── 내보내기 ─────────────────────────────────────────────────────────── */
function refsOf(p) {
  const refs = new Set();
  (p.scenes || []).forEach((s) => (s.entities || []).forEach((e) => { if (e.look && e.look.model) { refs.add(e.look.model); } }));
  return [...refs];
}
function refFile(id, ref) {
  if (ref.startsWith('lib:')) {
    const rest = ref.slice(4), g = rest.split('/')[0];
    if (GAMES.indexOf(g) < 0) { return null; }
    const sub = rest.slice(g.length + 1);
    if (LIB_DIRS.indexOf(sub.split('/')[0]) < 0) { return null; }
    return inside(path.join(WEB, g, 'assets'), sub);
  }
  if (ref.startsWith('proj:')) { return inside(path.join(PROJ, id, 'assets'), ref.slice(5)); }
  return null;
}
function exportProject(id) {
  const { project } = readProject(id);
  const v = checkProject(project);
  if (v.errors.length) { return { code: 422, body: { error: '검사 오류', errors: v.errors } }; }
  const out = path.join(DIST, id);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  let bytes = 0, files = 0;
  const put = (rel, buf) => {
    const f = path.join(out, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, buf); bytes += buf.length; files++;
  };
  const missing = [], credits = [];
  for (const ref of refsOf(project)) {
    const f = refFile(id, ref);
    if (!f || !fs.existsSync(f)) { missing.push(ref); continue; }
    const rel = ref.startsWith('lib:') ? 'assets/lib/' + ref.slice(4) : 'assets/proj/' + ref.slice(5);
    put(rel, fs.readFileSync(f));
    if (ref.startsWith('lib:')) { credits.push(ref.slice(4) + '  (출처·라이선스: saga-web/' + ref.slice(4).split('/')[0] + '/assets/ASSET_LICENSES.md)'); }
  }
  if (missing.length) { fs.rmSync(out, { recursive: true, force: true }); return { code: 422, body: { error: '없는 모델', missing } }; }
  /* 프로젝트는 index.html 안에 박는다 — 파일을 열기만 하면(file://) 돈다. </script> 가 글에 있어도 안 깨지게 */
  const inj = '<script>window.SAGA_ASSETS={lib:"assets/lib/",proj:"assets/proj/"};window.SAGA_PROJECT=' +
    JSON.stringify(project).replace(/</g, '\\u003c') + ';</script>';
  const html = fs.readFileSync(path.join(HERE, 'runtime', 'play.html'), 'utf8')
    .replace('<title>사가 엔진 게임</title>', '<title>' + String(project.title || id).replace(/[<&]/g, '') + '</title>')
    .replace('<!--SAGA-PROJECT-->', inj);
  put('index.html', Buffer.from(html));
  for (const f of RUNTIME_FILES.filter((n) => n.endsWith('.js'))) { put(f, fs.readFileSync(path.join(HERE, 'runtime', f))); }
  put('three.iife.js', fs.readFileSync(threePath()));
  put('CREDITS.txt', Buffer.from(['"' + (project.title || id) + '" — 사가 엔진으로 만든 게임', '', '엔진: three.js (MIT)', '', '쓴 모델:', ...credits.map((c) => '  ' + c), ''].join('\n')));
  return { code: 200, body: { ok: true, dir: out, files, bytes } };
}

/* ── 요청 ─────────────────────────────────────────────────────────────── */
async function handle(req, res) {
  const u = new URL(req.url, 'http://x');
  const p = decodeURIComponent(u.pathname);
  let m;
  try {
    if (req.method === 'GET') {
      if (p === '/' || p === '/index.html') { return sendFile(res, path.join(HERE, 'editor', 'index.html')); }
      if (p.startsWith('/editor/')) { const f = inside(path.join(HERE, 'editor'), p.slice(8)); return f ? sendFile(res, f) : send(res, 403, { error: '밖' }); }
      if (p === '/runtime/three.iife.js') { return sendFile(res, threePath()); }
      if (p.startsWith('/runtime/')) {
        const n = p.slice(9);
        return RUNTIME_FILES.indexOf(n) >= 0 ? sendFile(res, path.join(HERE, 'runtime', n)) : send(res, 404, { error: '없다' });
      }
      if ((m = /^\/lib\/([a-z-]+)\/(.+)$/.exec(p))) {
        if (GAMES.indexOf(m[1]) < 0 || LIB_DIRS.indexOf(m[2].split('/')[0]) < 0) { return send(res, 403, { error: '안 되는 곳' }); }
        const f = inside(path.join(WEB, m[1], 'assets'), m[2]);
        return f ? sendFile(res, f) : send(res, 403, { error: '밖' });
      }
      if ((m = /^\/projects\/([a-z0-9-]+)\/assets\/(.+)$/.exec(p))) {
        const f = inside(path.join(PROJ, m[1], 'assets'), m[2]);
        return f ? sendFile(res, f) : send(res, 403, { error: '밖' });
      }
      if (p === '/api/projects') { return send(res, 200, listProjects()); }
      if (p === '/api/templates') { return send(res, 200, listTemplates()); }
      if (p === '/api/assets') {
        const id = u.searchParams.get('p');
        return send(res, 200, (idOk(id) ? projectAssets(id) : []).concat(listAssets()));
      }
      if ((m = /^\/api\/project\/([a-z0-9-]+)$/.exec(p))) {
        if (!fs.existsSync(projFile(m[1]))) { return send(res, 404, { error: '없는 프로젝트' }); }
        return send(res, 200, readProject(m[1]));
      }
      if (p === '/api/schema') { return send(res, 200, { SHAPES: SIM.SHAPES, BODIES: SIM.BODIES, COMP: SIM.COMP, WHEN: SIM.WHEN, DO: SIM.DO }); }
      return send(res, 404, { error: '없다' });
    }
    if (req.method === 'POST') {
      if ((m = /^\/api\/upload\/([a-z0-9-]+)$/.exec(p))) {
        const name = String(u.searchParams.get('name') || '').replace(/[^A-Za-z0-9_.-]/g, '_');
        if (!/\.glb$/i.test(name)) { return send(res, 400, { error: '.glb 만 올린다' }); }
        if (!fs.existsSync(projFile(m[1]))) { return send(res, 404, { error: '없는 프로젝트' }); }
        const buf = await readBody(req, MAX_UPLOAD);
        if (buf.length < 20 || buf.readUInt32LE(0) !== 0x46546C67) { return send(res, 400, { error: 'GLB 가 아니다' }); }
        const d = path.join(PROJ, m[1], 'assets');
        fs.mkdirSync(d, { recursive: true });
        fs.writeFileSync(path.join(d, name), buf);
        return send(res, 200, { ok: true, ref: 'proj:' + name });
      }
      const body = JSON.parse((await readBody(req, 20 * 1024 * 1024)).toString('utf8') || '{}');
      if ((m = /^\/api\/project\/([a-z0-9-]+)$/.exec(p))) { const r = saveProject(m[1], body.project, body.base); return send(res, r.code, r.body); }
      if (p === '/api/new') { const r = newProject(body.id, body.title, body.template); return send(res, r.code, r.body); }
      if (p === '/api/check') { return send(res, 200, checkProject(body.project)); }
      if ((m = /^\/api\/export\/([a-z0-9-]+)$/.exec(p))) {
        if (!fs.existsSync(projFile(m[1]))) { return send(res, 404, { error: '없는 프로젝트' }); }
        const r = exportProject(m[1]); return send(res, r.code, r.body);
      }
    }
    return send(res, 404, { error: '없다' });
  } catch (e) {
    return send(res, 500, { error: String(e && e.message || e) });
  }
}

if (require.main === module) {
  if (!threePath()) { console.error('three.iife.js 를 못 찾았다(saga-web/<판>/js/vendor/)'); process.exit(1); }
  http.createServer(handle).listen(PORT, '127.0.0.1', () => {
    console.log('사가 엔진 → http://127.0.0.1:' + PORT + '/   (프로젝트: ' + PROJ + ')');
  });
}

module.exports = { handle, listAssets, exportProject, saveProject, newProject, checkProject };
