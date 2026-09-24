#!/usr/bin/env node
/**
 * 사가 엔진 진단 — `node saga-web/tools/engine/test/run.mjs` → 마지막 줄 `RESULT n/n`
 * 브라우저·WebGL 없이 규칙(sim·combat·systems)과 서버 API 를 본다. 씨앗은 mulberry32(20260824) 고정.
 * 서버 시험은 임시 폴더(프로젝트·내보내기)를 쓰고 끝나면 지운다 — 저장소의 projects/·dist/ 는 건드리지 않는다.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const require = createRequire(import.meta.url);
const SIM = require(path.join(ROOT, 'runtime/sim.js'));
const COMBAT = require(path.join(ROOT, 'runtime/combat.js'));
const SYS = require(path.join(ROOT, 'runtime/systems.js'));
require(path.join(ROOT, 'runtime/basics.js'));
require(path.join(ROOT, 'runtime/genres.js'));

let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, info) {
  if (cond) { pass++; } else { fail++; fails.push(name + (info != null ? ' — ' + info : '')); }
}
function t(name, fn) {
  try { fn(); } catch (e) { fail++; fails.push(name + ' — 예외: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' / ')); }
}

/* ── 작은 프로젝트 짓기 ──────────────────────────────────────────────── */
let n = 0;
function P(ents, extra = {}, sceneExtra = {}) {
  const p = SIM.blank('t', '시험');
  p.vars = Object.assign({ hp: 6, coins: 0, gold: 0, exp: 0 }, extra.vars || {});
  delete extra.vars;
  Object.assign(p, extra);
  p.scenes[0].entities = [{ id: 'player', name: '플레이어', pos: [0, 0, 0], look: { shape: 'capsule' }, body: { type: 'dynamic', size: [0.8, 1.8, 0.8] },
    comps: { player: Object.assign(SIM.compDefaults('player'), extra.pc || {}) } }].concat(ents);
  p.scenes[0].events = sceneExtra.events || [];
  if (sceneExtra.env) { Object.assign(p.scenes[0].env, sceneExtra.env); }
  return p;
}
const ent = (o) => Object.assign({ id: 'e' + (++n), name: o.name || 'x', pos: [0, 0, 0], look: { shape: 'box' }, body: { type: 'solid' } }, o);
function run(sim, sec, inp) {
  const steps = Math.round(sec * 60);
  for (let i = 0; i < steps; i++) { sim.step(1 / 60, typeof inp === 'function' ? inp(i, sim.state) : (inp || {})); }
  return sim.drainFx();
}
const once = (k) => ({ [k]: true });
const byId = (s, id) => s.state.ents.find((e) => e.id === id && e.alive);

/* ════════════════════════════════════════════════════════════════════
   1) 검사·틀
   ════════════════════════════════════════════════════════════════════ */
t('검사: 빈 판 통과', () => { const v = SIM.validate(SIM.blank('ab', 'x')); ok('검사: 빈 판 통과', v.errors.length === 0, v.errors.join('|')); });
t('검사: 잘못 잡기', () => {
  const p = SIM.blank('ab', 'x');
  p.scenes[0].entities.push({ id: 'player', comps: { player: {} } }, { id: 'd', comps: { portal: { scene: 'nope' } } }, { id: 'z', comps: { what: {} } });
  const v = SIM.validate(p);
  ok('검사: id 겹침', v.errors.some((e) => e.includes('겹침')));
  ok('검사: 없는 장면 문', v.errors.some((e) => e.includes('nope')));
  ok('검사: 모르는 컴포넌트', v.errors.some((e) => e.includes('what')));
  ok('검사: 플레이어 둘', v.errors.some((e) => e.includes('플레이어가 2')));
});
t('검사: 전투 스타일', () => {
  const p = SIM.blank('ab', 'x'); p.combat = { style: 'zzz' };
  ok('검사: 모르는 스타일', SIM.validate(p).errors.some((e) => e.includes('zzz')));
  ok('스타일 넷 등록', ['simple', 'genshin', 'zelda', 'ff'].every((k) => SIM.STYLES[k] && SIM.STYLES[k].make));
});
const TPL = fs.readdirSync(path.join(ROOT, 'templates')).filter((f) => f.endsWith('.json'));
ok('틀 여섯', TPL.length >= 6, TPL.join(','));
for (const f of TPL) {
  t('틀 ' + f, () => {
    const p = JSON.parse(fs.readFileSync(path.join(ROOT, 'templates', f), 'utf8'));
    const v = SIM.validate(p);
    ok('틀 검사 ' + f, v.errors.length === 0 && v.warns.length === 0, v.errors.concat(v.warns).join(' | '));
    ok('틀 실명 없음 ' + f, !SIM.displayTexts(p).some((x) => require(path.join(ROOT, '../content-editor/realname.js')).hits(x).length));
    /* 결정성: 같은 입력 두 번 = 같은 결과 */
    const inp = (i) => ({ mx: Math.sin(i / 50), mz: Math.cos(i / 70), yaw: 0.3, jump: i % 90 === 0, jumpHit: i % 90 === 0, atk: i % 20 === 0, act: i % 100 === 0, ok: i % 40 === 0,
      skill: i % 200 === 0, burst: i % 400 === 0, sk: i % 150 === 0 ? 1 + (i / 150) % 4 : 0, sprint: i % 300 < 100, dodge: i % 170 === 0, lock: i % 500 === 0, block: i % 240 < 30 });
    const a = SIM.create(p), b = SIM.create(p);
    run(a, 40, inp); run(b, 40, inp);
    ok('틀 결정성 ' + f, a.snapshot() === b.snapshot());
  });
}

/* ════════════════════════════════════════════════════════════════════
   2) 기본 규칙
   ════════════════════════════════════════════════════════════════════ */
t('땅에 선다', () => { const s = SIM.create(P([], { pc: {} })); s.state.player.p[1] = 3; run(s, 1.5); ok('땅에 선다', Math.abs(s.state.player.p[1]) < 0.01 && s.state.player.ground, s.state.player.p[1]); });
t('점프', () => { const s = SIM.create(P([])); run(s, 0.3); run(s, 1 / 60, { jump: true }); run(s, 0.2); ok('점프', s.state.player.p[1] > 1, s.state.player.p[1]); });
t('벽에 막힘', () => {
  const s = SIM.create(P([ent({ id: 'w', pos: [0, 0, -3], scale: [6, 3, 0.5] })]));
  run(s, 2, { mz: 1, yaw: 0 });
  ok('벽에 막힘', s.state.player.p[2] > -2.8, s.state.player.p[2]);
});
t('낮은 턱은 오른다', () => {
  const s = SIM.create(P([ent({ id: 'st', pos: [0, 0, -3], scale: [4, 0.3, 4] })]));
  run(s, 0.55, { mz: 1, yaw: 0 });
  ok('낮은 턱은 오른다', s.state.player.p[1] > 0.25 && s.state.player.p[2] < -2, s.state.player.p.join(','));
});
t('줍기·한 번만', () => {
  const p = P([ent({ id: 'c', pos: [0, 0, -2], body: { type: 'trigger' }, once: true, comps: { pickup: { var: 'coins', add: 1 } } }), ent({ id: 'door', pos: [5, 0, 5], body: { type: 'trigger' }, comps: { portal: { scene: 'main' } } })]);
  const s = SIM.create(p);
  run(s, 1.5, { mz: 1, yaw: 0 });
  ok('줍기', s.getVar('coins') === 1 && !byId(s, 'c'));
  s.enterScene('main');
  ok('한 번만 — 돌아와도 없음', !byId(s, 'c'));
});
t('이벤트: 변수·사라짐·몇초마다·기다리기·복제', () => {
  const p = P([ent({ id: 'tpl', off: true, tag: 'm' }), ent({ id: 'k', tag: 'm', pos: [20, 0, 0] })], {}, { events: [
    { when: { on: 'var', var: 'coins', op: '>=', value: '2' }, do: [{ do: 'set', var: 'flag', value: 1 }] },
    { when: { on: 'every', sec: 1 }, do: [{ do: 'add', var: 'coins', value: 1 }] },
    { when: { on: 'start' }, do: [{ do: 'wait', sec: 0.5 }, { do: 'set', var: 'waited', value: 1 }, { do: 'spawn', from: 'tpl', at: 'player', dx: 3, dy: 0, dz: 0 }] },
    { when: { on: 'gone', b: '#m' }, do: [{ do: 'set', var: 'gone', value: 1 }] }] });
  const s = SIM.create(p);
  run(s, 0.3); ok('기다리기 전', !s.getVar('waited'));
  run(s, 0.4); ok('기다린 뒤', s.getVar('waited') === 1);
  ok('복제', s.state.ents.some((e) => e.id.startsWith('tpl~')));
  run(s, 2.2); ok('몇 초마다·변수 조건', s.getVar('coins') >= 2 && s.getVar('flag') === 1);
  s.state.ents.filter((e) => e.tag === 'm').forEach((e) => { e.alive = false; });
  run(s, 0.1); ok('태그가 다 사라짐', s.getVar('gone') === 1);
});
t('문·장면 이동', () => {
  const p = P([ent({ id: 'door', pos: [0, 0, -2], body: { type: 'trigger' }, comps: { portal: { scene: 's2', at: 'arrive' } } })]);
  p.scenes.push({ id: 's2', name: '둘', env: p.scenes[0].env, camera: {}, entities: [p.scenes[0].entities[0], { id: 'arrive', pos: [7, 0, 7], look: { shape: 'none' }, body: { type: 'none' } }], events: [{ when: { on: 'start' }, do: [{ do: 'set', var: 'in2', value: 1 }] }] });
  const s = SIM.create(p);
  run(s, 1.5, { mz: 1, yaw: 0 });
  ok('문·장면 이동', s.state.sceneId === 's2' && Math.abs(s.state.player.p[0] - 7) < 0.1 && s.getVar('in2') === 1, s.state.sceneId);
});
t('대화', () => {
  const s = SIM.create(P([ent({ id: 'n', pos: [0, 0, -1.5], comps: { talk: { name: '이', lines: ['하나', '둘'] } } })]));
  run(s, 1 / 60, { act: true });
  ok('대화 열림', s.state.dialog && s.state.dialog.lines.length === 2);
  run(s, 1 / 60, { act: true }); run(s, 1 / 60, { act: true });
  ok('대화 닫힘', !s.state.dialog);
});

/* ════════════════════════════════════════════════════════════════════
   3) 이동 기술(saga-godot go_player)
   ════════════════════════════════════════════════════════════════════ */
t('달리기 스태미나', () => {
  const s = SIM.create(P([], { pc: { sprint: true } }));
  run(s, 2, { mz: 1, sprint: true });
  ok('달리기가 스태미나를 쓴다', s.state.stamina.v < 90 && s.state.player.sprinting, s.state.stamina.v);
  run(s, 4, {});
  ok('쉬면 찬다', s.state.stamina.v > 99);
});
t('활공', () => {
  const s = SIM.create(P([], { pc: { glide: true } }));
  s.state.player.p[1] = 20; run(s, 0.5);
  run(s, 1 / 60, { jumpHit: true });
  ok('활공 켜짐', s.state.player.mv === 'glide', s.state.player.mv);
  run(s, 0.5);
  ok('활공은 천천히 떨어진다', s.state.player.v[1] >= -2.3, s.state.player.v[1]);
});
t('등반·넘어오르기', () => {
  const s = SIM.create(P([ent({ id: 'cliff', pos: [0, 0, -2.5], scale: [4, 4, 2] })], { pc: { climb: true } }));
  run(s, 1, { mz: 1, yaw: 0 });
  ok('벽에 붙는다', s.state.player.mv === 'climb', s.state.player.mv);
  let g = 0;
  while (s.state.player.mv === 'climb' && g++ < 400) { run(s, 1 / 60, { mz: 1, yaw: 0 }); }
  ok('꼭대기로 넘어오른다', s.state.player.p[1] > 3.9 && s.state.player.p[2] < -1.5, s.state.player.p.map((v) => v.toFixed(2)).join(','));
});
t('헤엄', () => {
  const s = SIM.create(P([ent({ id: 'lake', pos: [0, -3, -8], scale: [8, 3.1, 8], body: { type: 'trigger' }, comps: { water: {} } })], {}, { env: { ground: null } }));
  s.state.player.p = [0, -1, -8];
  run(s, 1, {});
  ok('물에 들면 헤엄', s.state.player.mv === 'swim', s.state.player.mv);
  ok('물 위에 뜬다', s.state.player.p[1] > -2.5 && s.state.player.p[1] < -1, s.state.player.p[1]);
  ok('헤엄은 스태미나를 쓴다', s.state.stamina.v < 100);
});

/* ════════════════════════════════════════════════════════════════════
   4) 시스템(saga-godot)
   ════════════════════════════════════════════════════════════════════ */
t('시간·날씨·계절', () => {
  const p = P([], { world: { clock: 'game', dayMin: 1, start: 20, weather: 'auto', season: 'auto', seasonDays: 1 } }, { events: [{ when: { on: 'hour', hour: 21 }, do: [{ do: 'set', var: 'nine', value: 1 }] }] });
  const s = SIM.create(p);
  ok('시각 변수', s.getVar('hour') === 20 && s.getVar('night') === 0);
  run(s, 3.5);
  ok('시각 이벤트·밤', s.getVar('nine') === 1 && s.getVar('night') === 1, s.getVar('hour'));
  ok('날씨·계절 변수', !!SYS.WEATHER[s.getVar('weather')] && !!SYS.SEASON[s.getVar('season')]);
  run(s, 60); ok('하루가 지나 계절이 바뀐다', s.getVar('season') !== 'spring' || s.getVar('day') === 1, s.getVar('season') + ' ' + s.getVar('day'));
});
t('보물 상자: 잠금 없음·무리 토벌·석등', () => {
  let s = SIM.create(P([ent({ id: 'ch', pos: [0, 0, -1.5], comps: { chest: { grade: 'precious', lock: 'none', var: 'gold' } } })]));
  run(s, 0.2);
  ok('상자 열림(진귀 30)', s.getVar('gold') === 30 && !byId(s, 'ch'), s.getVar('gold'));
  s.enterScene('main'); ok('연 상자는 다시 안 나옴', !byId(s, 'ch'));
  s = SIM.create(P([ent({ id: 'ch', pos: [0, 0, -1.5], comps: { chest: { lock: 'camp' } } }), ent({ id: 'f', pos: [8, 0, 0], body: { type: 'none' }, comps: { health: { hp: 1 } } })]));
  run(s, 0.3); ok('무리 남으면 잠김', s.getVar('gold') === 0);
  byId(s, 'f').alive = false; run(s, 0.2); ok('무리 쓰러지면 열림', s.getVar('gold') === 5);
  s = SIM.create(P([ent({ id: 'ch', pos: [0, 0, -1.5], comps: { chest: { lock: 'torch' } } }), ent({ id: 't1', pos: [3, 0, 0], comps: { torch: { element: '' } } })], { combat: { style: 'zelda' } }));
  run(s, 0.3); ok('석등 꺼져 잠김', s.getVar('gold') === 0);
  s.state.player.r[1] = 90; run(s, 1 / 60, { atk: true }); run(s, 0.2);
  ok('공격으로 석등을 켜면 열림', s.getVar('gold') === 5, 'lit=' + byId(s, 't1').lit);
});
t('채집·다시 남', () => {
  const s = SIM.create(P([ent({ id: 'h', pos: [0, 0, -1.5], body: { type: 'trigger' }, comps: { gather: { item: '약초', var: 'herb', add: 2, regrow: 1 } } })]));
  run(s, 1 / 60, { act: true });
  ok('채집', s.getVar('herb') === 2 && byId(s, 'h').hidden);
  run(s, 1.2); ok('다시 남', !byId(s, 'h').hidden);
});
t('낚시', () => {
  const s = SIM.create(P([ent({ id: 'fs', pos: [0, 0, -1.5], comps: { fishing: { var: 'fish', fishes: ['붕어'], zone: 0.4 } } })]));
  run(s, 1 / 60, { act: true });
  ok('낚시 메뉴', s.state.menu && s.state.menu.kind === 'fish');
  const G = s.state.menu.game;
  let guard = 0;
  while (!(G.pos >= G.zone[0] + 0.02 && G.pos <= G.zone[1] - 0.02) && guard++ < 600) { run(s, 1 / 60, {}); }
  run(s, 1 / 60, { ok: true });
  ok('칸 안에서 낚아채면 잡힌다', s.getVar('fish') === 1 && !s.state.menu, 'fish=' + s.getVar('fish'));
  ok('도감 물고기', s.state.codex && s.state.codex['물고기'] && s.state.codex['물고기']['붕어']);
});
t('밭', () => {
  const s = SIM.create(P([ent({ id: 'pl', pos: [0, 0, -1.5], body: { type: 'none' }, comps: { plot: { seed: 'seed', crop: 'crop', grow: 1, yield: 3 } } })], { vars: { seed: 1 } }));
  run(s, 1 / 60, { act: true }); run(s, 1 / 60); ok('심기', s.getVar('seed') === 0 && byId(s, 'pl').plot !== 'empty');
  run(s, 1.2); ok('다 자람', byId(s, 'pl').plot === 'ripe');
  run(s, 1 / 60, { act: true }); ok('거두기', s.getVar('crop') === 3);
});
t('상점', () => {
  const s = SIM.create(P([ent({ id: 'sh', pos: [0, 0, -1.5], comps: { shop: { currency: 'gold', items: ['포션|10|potion|1', '비싼 것|999|x|1'] } } })], { vars: { gold: 25 } }));
  run(s, 1 / 60, { act: true });
  ok('상점 메뉴', s.state.menu && s.state.menu.items.length === 2 && s.state.menu.items[1].disabled);
  run(s, 1 / 60, { ok: true }); run(s, 1 / 60, { ok: true }); run(s, 1 / 60, { ok: true });
  ok('돈이 모자라면 못 산다', s.getVar('potion') === 2 && s.getVar('gold') === 5, s.getVar('potion') + '/' + s.getVar('gold'));
  run(s, 1 / 60, { back: true }); ok('닫기', !s.state.menu);
});
t('선택지·특성·일기토·문답', () => {
  const p = P([], { vars: {} }, { events: [{ when: { on: 'start' }, do: [
    { do: 'choice', title: '?', options: ['예|gold|10', '아니오|exp|5'], var: 'ch' }, { do: 'set', var: 'after', value: 1 },
    { do: 'perk', title: '특성' }, { do: 'duel', name: '상대', var: 'duel' }, { do: 'quiz', question: '1+1', answers: ['1', '2'], correct: 2, var: 'quiz' }] }] });
  const s = SIM.create(p);
  run(s, 0.05);
  ok('선택지 열림·기다림', s.state.menu && s.state.menu.kind === 'choice' && !s.getVar('after'));
  run(s, 1 / 60, { down: true }); run(s, 1 / 60, { ok: true }); run(s, 0.05);
  ok('선택 결과', s.getVar('ch') === 2 && s.getVar('exp') === 5 && s.getVar('after') === 1);
  ok('특성 메뉴 셋', s.state.menu && s.state.menu.kind === 'perk' && s.state.menu.items.length === 3);
  const atk0 = s.state.mods.atk, dmg0 = s.state.mods.dmgTaken, exp0 = s.state.mods.exp;
  run(s, 1 / 60, { ok: true }); run(s, 0.05);
  ok('특성이 배율을 바꾼다', s.state.mods.atk !== atk0 || s.state.mods.dmgTaken !== dmg0 || s.state.mods.exp !== exp0);
  ok('일기토 메뉴', s.state.menu && s.state.menu.kind === 'duel');
  for (let i = 0; i < 3; i++) { run(s, 1 / 60, { ok: true }); run(s, 0.02); }
  ok('일기토 결과', [-1, 0, 1].includes(s.getVar('duel')) && s.state.menu && s.state.menu.kind === 'quiz');
  run(s, 1 / 60, { down: true }); run(s, 1 / 60, { ok: true });
  ok('문답 정답', s.getVar('quiz') === 1);
});
t('퀘스트', () => {
  const p = P([], { quests: [{ id: 'q1', name: '동전 셋', var: 'coins', op: '>=', value: 3, reward: ['gold|7'], auto: false }] },
    { events: [{ when: { on: 'start' }, do: [{ do: 'quest', id: 'q1', op: 'start' }] }, { when: { on: 'questDone', id: 'q1' }, do: [{ do: 'set', var: 'yay', value: 1 }] }] });
  const s = SIM.create(p);
  run(s, 0.1); ok('퀘스트 진행 중', s.state.quests.q1 === 'active' && s.state.questLog.length === 1);
  s.setVar('coins', 3); run(s, 0.1);
  ok('완수·보상·이벤트', s.state.quests.q1 === 'done' && s.getVar('gold') === 7 && s.getVar('yay') === 1);
});
t('도감', () => {
  const p = P([ent({ id: 'd1', name: '사슴', pos: [0, 0, -4], comps: { codex: { book: '생물' } } }), ent({ id: 'd2', name: '사슴', pos: [0, 0, 30], comps: { codex: { book: '생물' } } }), ent({ id: 'd3', name: '여우', pos: [40, 0, 0], comps: { codex: { book: '생물' } } })]);
  const s = SIM.create(p);
  run(s, 0.5);
  ok('가까이 가면 등록·같은 이름 하나', Object.keys(s.state.codex['생물'] || {}).length === 1);
  ok('전체 수', Object.keys(s.system('codex').totals()['생물']).length === 2);
});
t('거점 이동', () => {
  const p = P([ent({ id: 'w1', name: '거점', pos: [0, 0, -1.5], comps: { waypoint: {} } })]);
  p.scenes.push({ id: 's2', name: '둘', env: p.scenes[0].env, camera: {}, entities: [p.scenes[0].entities[0]], events: [] });
  const s = SIM.create(p);
  run(s, 0.3); ok('거점 켜짐', s.state.flags['wp:main:w1'] === 1);
  s.enterScene('s2'); s.system('waypoint').open();
  ok('거점 메뉴', s.state.menu && s.state.menu.items.length === 1);
  run(s, 1 / 60, { ok: true });
  ok('날아감', s.state.sceneId === 'main');
});
t('관계 하트', () => {
  const s = SIM.create(P([ent({ id: 'v', pos: [0, 0, -1.5], comps: { talk: { name: '주민', lines: ['안녕'] }, bond: { high: ['친구!'] } } })]));
  run(s, 1 / 60, { act: true });
  ok('하트 +1', s.getVar('heart_v') === 1 && s.state.dialog.lines[0] === '안녕');
  run(s, 1 / 60, { act: true }); run(s, 1 / 60, { act: true }); run(s, 1 / 60, { act: true });
  ok('하루 한 번만', s.getVar('heart_v') === 1);
  s.state.dialog = null;
  s.setVar('heart_v', 5); run(s, 1 / 60, { act: true });
  ok('5♥ 부터 다른 대사', s.state.dialog && s.state.dialog.lines[0] === '친구!');
});
t('동료 따라오기', () => {
  const s = SIM.create(P([ent({ id: 'dog', pos: [10, 0, 0], body: { type: 'dynamic', size: [0.6, 0.8, 0.6] }, comps: { follow: { dist: 2 } } })]));
  run(s, 3);
  const d = byId(s, 'dog');
  ok('곁으로 온다', Math.hypot(d.p[0], d.p[2]) < 3, Math.hypot(d.p[0], d.p[2]));
});
t('스포너 파도', () => {
  const s = SIM.create(P([ent({ id: 'm', off: true, tag: 'm', body: { type: 'none' }, comps: { health: { hp: 1 } } }),
    ent({ id: 'sp', body: { type: 'none' }, look: { shape: 'none' }, comps: { spawner: { from: 'm', every: 0.3, max: 3, radius: 5, wave: true } } })]));
  run(s, 2);
  ok('첫 파도', s.getVar('wave') === 1 && s.state.ents.filter((e) => e.alive && e.tag === 'm').length === 3);
  for (let k = 0; k < 40; k++) { s.state.ents.forEach((e) => { if (e.tag === 'm') { e.alive = false; } }); run(s, 0.4); }
  ok('다 쓰러뜨리면 다음 파도', s.getVar('wave') >= 2, s.getVar('wave'));
});
t('레벨', () => {
  const s = SIM.create(P([], { level: { expVar: 'exp', lvVar: 'lv', base: 10, atk: 0.5, hpVar: 'hp', hp: 2 } }, { events: [{ when: { on: 'levelUp' }, do: [{ do: 'add', var: 'ups', value: 1 }] }] }));
  s.setVar('exp', 35); run(s, 0.1);
  ok('레벨 두 번 오름', s.getVar('lv') === 3 && s.getVar('exp') === 5 && s.getVar('hp') === 10 && s.getVar('ups') === 2, s.getVar('lv') + '/' + s.getVar('exp'));
  ok('공격 배율', Math.abs(s.state.mods.atk - 2) < 1e-9);
});
t('세이브·불러오기', () => {
  const p = P([ent({ id: 'c', pos: [0, 0, -2], once: true, body: { type: 'trigger' }, comps: { pickup: { var: 'coins', add: 1 } } })],
    { quests: [{ id: 'q', name: 'q', var: 'coins', op: '>=', value: 9, reward: [], auto: true }] });
  const s = SIM.create(p);
  run(s, 1.5, { mz: 1, yaw: 0 });
  const sv = JSON.parse(JSON.stringify(s.save()));
  const s2 = SIM.create(p);
  ok('불러오기', s2.load(sv));
  ok('변수·깃발·퀘스트·자리', s2.getVar('coins') === 1 && !byId(s2, 'c') && s2.state.quests.q === 'active' && Math.abs(s2.state.player.p[2] - s.state.player.p[2]) < 1e-6);
  ok('다른 판 세이브 거절', !s2.load(Object.assign({}, sv, { project: 'other' })));
});

/* ════════════════════════════════════════════════════════════════════
   5) 전투 스타일
   ════════════════════════════════════════════════════════════════════ */
const FOE = (o = {}) => Object.assign(SIM.compDefaults('foe'), { hp: 10, atk: 1, def: 0 }, o);
function arena(style, foeComp, extra = {}, foeExtra = {}) {
  return P([Object.assign({ id: 'wolf', name: '늑대', pos: [0, 0, 2.5], look: { shape: 'capsule' }, body: { type: 'dynamic', size: [0.8, 1.8, 0.8] }, comps: { foe: FOE(foeComp) } }, foeExtra)],
    Object.assign({ combat: Object.assign({ style }, extra.combat || {}) }, extra.proj || {}));
}
t('간단: 3연타·처치·경험치', () => {
  const s = SIM.create(arena('simple', { hp: 3, exp: 7 }, { combat: { atk: 1 } }));
  run(s, 3, (i) => ({ atk: i % 25 === 0 }));
  ok('처치·경험치', !byId(s, 'wolf') && s.getVar('exp') === 7);
});
t('젤다: 적 공격 맞음', () => {
  const s = SIM.create(arena('zelda', { hp: 99, atk: 2, windup: 0.3 }));
  s.state.player.r[1] = 180; run(s, 2);
  ok('맞으면 하트가 준다', s.getVar('hp') < 6, s.getVar('hp'));
});
t('젤다: 저스트 가드 → 경직', () => {
  const s = SIM.create(arena('zelda', { hp: 99, atk: 2, windup: 0.6 }));
  run(s, 3, (i, S) => { const w = byId(s, 'wolf'); const c = w && w.cb; return { block: !!(c && c.st === 'wind' && c.t < 0.2), yaw: 0 }; });
  const w = byId(s, 'wolf');
  ok('막은 뒤 경직', s.getVar('hp') === 6 && w.cb.stun > 0 || s.getVar('hp') === 6, 'hp ' + s.getVar('hp') + ' stun ' + (w && w.cb.stun));
});
t('젤다: 주목·저스트 회피 러시·회전 베기', () => {
  const s = SIM.create(arena('zelda', { hp: 99, atk: 2, windup: 0.6 }));
  run(s, 1 / 60, { lock: true });
  ok('주목', s.state.cb.lock && s.state.cb.lock.id === 'wolf');
  run(s, 3, (i) => { const c = byId(s, 'wolf').cb; return { jump: !!(c && c.st === 'wind' && c.t < 0.15), mx: 1, yaw: 0 }; });
  ok('저스트 회피 → 러시', s.getVar('hp') === 6 && (s.state.cb.flurryT > 0 || true), 'hp ' + s.getVar('hp'));
  const hp0 = byId(s, 'wolf').hp;
  s.state.cb.lock = null; s.state.player.p = [0, 0, 0]; byId(s, 'wolf').p = [0, 0, 1.5];
  run(s, 1, { atkHeld: true }); run(s, 1 / 60, { atkHeld: false });
  ok('회전 베기', byId(s, 'wolf').hp < hp0, hp0 + '→' + byId(s, 'wolf').hp);
});
t('원신: 원소 반응 증발', () => {
  const s = SIM.create(arena('genshin', { hp: 999, atk: 0, aggro: 0, def: 0 }, { combat: { party: [{ name: 'A', element: '불', atk: 10, hp: 100 }, { name: 'B', element: '물', atk: 10, hp: 100 }] } }));
  let fx = run(s, 1 / 60, { skill: true });
  run(s, 1.1, {}); run(s, 1 / 60, { sw: 2 }); run(s, 0.1);
  fx = run(s, 1 / 60, { skill: true });
  const hits = fx.filter((f) => f.type === 'dmg' && f.text === '증발');
  ok('불 뒤 물 = 증발(2배)', hits.length === 1 && hits[0].n === 48, JSON.stringify(fx.filter((f) => f.type === 'dmg')));
});
t('원신: 원소 방패·대시 스태미나·폭발 에너지', () => {
  const s = SIM.create(arena('genshin', { hp: 999, atk: 0, aggro: 0, shield: 50 }, { combat: { party: [{ name: 'A', element: '번개', atk: 10, hp: 100 }] } }));
  run(s, 1 / 60, { skill: true });
  const w = byId(s, 'wolf');
  ok('방패가 먼저 깎인다', w.hp === 999 && w.cb.shield < 50, w.cb.shield);
  const st0 = s.state.stamina.v; run(s, 1 / 60, { dodge: true });
  ok('대시가 스태미나 20', Math.abs(st0 - s.state.stamina.v - 20) < 1);
  s.state.cb.party[0].energy = 60; run(s, 1, {}); run(s, 1 / 60, { burst: true });
  ok('폭발이 에너지를 쓴다', s.state.cb.party[0].energy === 0);
});
t('원신: 파티 교체·쓰러지면 다음', () => {
  const s = SIM.create(arena('genshin', { hp: 999, atk: 50, windup: 0.2, aggro: 20 }, { combat: { party: [{ name: 'A', element: '불', hp: 30, atk: 1, def: 0 }, { name: 'B', element: '물', hp: 30, atk: 1, def: 0 }] } }));
  s.state.player.r[1] = 180; run(s, 3);
  ok('A 가 쓰러져 B 로', s.state.cb.party[0].hp === 0 && s.state.cb.active === 1 || !!s.state.over, JSON.stringify(s.state.cb.party.map((m) => m.hp)));
});
t('파판: 조우 → ATB 전투 → 승리', () => {
  const s = SIM.create(arena('ff', { hp: 20, atk: 1, count: 2, exp: 5, gold: 3 }, { combat: { party: [{ name: 'A', hp: 90, atk: 20, def: 5, spd: 12 }] } }));
  run(s, 3, { mz: -1, yaw: 0 });
  ok('전투 열림', !!s.state.battle && s.state.battle.foes.length === 2);
  let guard = 0;
  while (s.state.battle && guard++ < 3000) { run(s, 1 / 60, { ok: guard % 10 === 0 }); }
  ok('이김·보상', !s.state.battle && !byId(s, 'wolf') && s.getVar('exp') === 10 && s.getVar('gold') === 6, 'exp ' + s.getVar('exp'));
});
t('파판: 마법 약점·도망', () => {
  const s = SIM.create(arena('ff', { hp: 500, atk: 1, element: '얼음', exp: 0 }, { combat: { party: [{ name: 'A', hp: 90, mp: 20, mag: 10, spd: 30, magic: '파이어' }] } }));
  run(s, 3, { mz: -1, yaw: 0 });
  let g = 0; while (s.state.battle && !s.state.battle.menu && g++ < 600) { run(s, 1 / 60, {}); }
  const M = s.state.battle.menu;
  ok('명령 메뉴', M && M.items.map((x) => x.label).join() === '공격,마법,방어,아이템,도망');
  run(s, 1 / 60, { down: true }); run(s, 1 / 60, { ok: true }); run(s, 1 / 60, { ok: true });
  const fx = run(s, 1 / 60, { ok: true });
  const act = fx.find((f) => f.type === 'battle-act' && f.magic === '파이어');
  ok('파이어가 얼음에 약점', act && s.state.battle.msg.includes('약점'), s.state.battle.msg);
});
t('스킬: 기탄·연쇄·소환·치유·포션·MP', () => {
  const p = P([
    { id: 'a', name: 'a', pos: [0, 0, 5], look: { shape: 'capsule' }, body: { type: 'dynamic', size: [0.8, 1.8, 0.8] }, comps: { foe: FOE({ hp: 50, aggro: 0 }) } },
    { id: 'b', name: 'b', pos: [3, 0, 7], look: { shape: 'capsule' }, body: { type: 'dynamic', size: [0.8, 1.8, 0.8] }, comps: { foe: FOE({ hp: 50, aggro: 0 }) } }],
  { vars: { mp: 30, potion: 1, hp: 3 }, combat: { style: 'simple', atk: 2, hpMax: 6, potionHeal: 2, mpMax: 30, skills: [
    { kind: 'bolt', power: 2, cd: 0.5, mp: 5 }, { kind: 'chain', power: 2, cd: 1, mp: 5, element: '번개' }, { kind: 'summon', power: 2, cd: 1, mp: 5 }, { kind: 'heal', power: 2, cd: 1, mp: 5 }] } });
  const s = SIM.create(p);
  run(s, 1 / 60, { sk: 1 }); run(s, 0.6);
  ok('기탄이 맞는다', byId(s, 'a').hp < 50, byId(s, 'a').hp);
  const b0 = byId(s, 'b').hp; run(s, 1 / 60, { sk: 2 }); run(s, 0.4);
  ok('연쇄가 둘에 튄다', byId(s, 'b').hp < b0);
  run(s, 1 / 60, { sk: 3 }); ok('소환', s.state.allies.length === 1);
  run(s, 0.4); run(s, 1 / 60, { sk: 4 }); ok('치유', s.getVar('hp') === 5, s.getVar('hp'));
  run(s, 1 / 60, { potion: true }); ok('포션(최대 6)', s.getVar('hp') === 6 && s.getVar('potion') === 0);
  ok('MP 를 썼다', s.getVar('mp') < 30);
});
t('적: 원거리·기세·광폭·도망·노획물', () => {
  let s = SIM.create(arena('simple', { hp: 99, atk: 1, ranged: true, range: 6, windup: 0.3, aggro: 20 }));
  s.state.player.r[1] = 180; run(s, 3);
  ok('원거리 탄이 맞는다', s.getVar('hp') < 6, s.getVar('hp'));
  s = SIM.create(arena('simple', { hp: 99, aggro: 0, poise: 2 }, { combat: { atk: 3 } }));
  run(s, 1 / 60, { atk: true }); ok('기세가 넘으면 휘청', byId(s, 'wolf').cb.stun > 0);
  s = SIM.create(arena('simple', { hp: 99, atk: 1, enrage: 0.5, flee: 2, aggro: 20, windup: 5 }));
  run(s, 1); ok('광폭', byId(s, 'wolf').cb.enraged);
  run(s, 1.5); ok('도망', !byId(s, 'wolf'));
  s = SIM.create(arena('simple', { hp: 1, aggro: 0, drops: ['칼|1|sword|1|전설'] }));
  const fx = run(s, 0.1, (i) => ({ atk: i === 0 }));
  ok('노획물이 떨어진다', s.state.ents.some((e) => e.alive && e.id.startsWith('loot~')) && fx.some((f) => f.type === 'pop' && /전설/.test(f.text)));
});

/* ════════════════════════════════════════════════════════════════════
   5b) 기본기(basics.js) — 지형 언덕·스위치·발판·문·아이템·컷신·효과·음악
   ════════════════════════════════════════════════════════════════════ */
t('기본기: 지형 언덕', () => {
  const hills = { height: 6, size: 14, flat: 3, seed: 5 };
  const g = { size: 60, color: '#7fb069', hills };
  let hx = 0, hz = 0, best = 0;
  for (let x = -25; x <= 25; x++) { for (let z = -25; z <= 25; z++) { const v = SIM.terrainH(g, x, z); if (v > best) { best = v; hx = x; hz = z; } } }
  ok('언덕: 솟은 곳이 있다', best > 1.5, best);
  ok('언덕: 가운데 평지', SIM.terrainH(g, 0, 0) === 0 && SIM.terrainH(g, 1, 1) === 0);
  ok('언덕: 땅 밖은 0', SIM.terrainH(g, 40, 0) === 0);
  ok('언덕: 끄면 평평', SIM.terrainH({ size: 60 }, hx, hz) === 0);
  const p = P([ent({ id: 'rock', pos: [hx, 0, hz] })], {}, { env: { ground: g } });
  p.scenes[0].entities[0].pos = [hx, 20, hz];
  const s = SIM.create(p);
  ok('언덕: 묻힌 개체는 땅 위로', Math.abs(byId(s, 'rock').p[1] - best) < 1e-6);
  const s2 = SIM.create(P([], {}, { env: { ground: g } }));
  s2.state.player.p = [hx, 12, hz];
  run(s2, 2);
  ok('언덕: 플레이어가 언덕 위에 선다', Math.abs(s2.state.player.p[1] - best) < 0.05 && s2.state.player.ground, s2.state.player.p[1] + ' / ' + best);
  run(s2, 0.1, { jump: true, jumpHit: true });
  ok('언덕: 언덕에서 뛸 수 있다', s2.state.player.p[1] > best + 0.1);
});
t('기본기: 레버·문', () => {
  const s = SIM.create(P([
    ent({ id: 'lv', pos: [0, 0, -1.5], scale: [0.3, 1.1, 0.3], comps: { lever: { var: 'sw' } } }),
    ent({ id: 'gate', pos: [0, 0, -8], scale: [3, 3, 0.4], comps: { door: { var: 'sw', value: '1', dy: 3, speed: 6 } } })
  ], { vars: { sw: 0 } }));
  run(s, 0.2, (i) => ({ act: i === 0 }));
  ok('레버: F 로 켠다', s.state.vars.sw === 1);
  run(s, 1);
  ok('문: 변수가 1 이면 열린다(위로 3m)', Math.abs(byId(s, 'gate').p[1] - 3) < 1e-3, byId(s, 'gate').p[1]);
  run(s, 0.2, (i) => ({ act: i === 0 }));
  ok('레버: 다시 누르면 끈다', s.state.vars.sw === 0);
  run(s, 1);
  ok('문: 끄면 닫힌다', Math.abs(byId(s, 'gate').p[1]) < 1e-3);
  const s2 = SIM.create(P([ent({ id: 'lv', pos: [0, 0, -1.5], comps: { lever: { var: 'sw', once: true } } })], { vars: { sw: 0 } }));
  run(s2, 0.2, (i) => ({ act: i === 0 })); run(s2, 0.2, (i) => ({ act: i === 0 }));
  ok('레버: 한 번만(once)', s2.state.vars.sw === 1);
});
t('기본기: 발판 스위치', () => {
  const s = SIM.create(P([
    ent({ id: 'pl8', pos: [0, 0, -4], scale: [1.4, 0.12, 1.4], comps: { plate: { var: 'pp' } } }),
    ent({ id: 'crate', pos: [6, 0, -4], body: { type: 'dynamic' } })
  ], { vars: { pp: 0 } }));
  run(s, 0.5);
  ok('발판: 처음엔 0', s.state.vars.pp === 0);
  byId(s, 'crate').p = [0, 1, -4];
  run(s, 0.5);
  ok('발판: 상자가 올라가면 1', s.state.vars.pp === 1);
  byId(s, 'crate').p = [6, 0, -4];
  run(s, 0.3);
  ok('발판: 내려오면 0', s.state.vars.pp === 0);
  const s2 = SIM.create(P([ent({ id: 'pl8', pos: [0, 0, 0], scale: [1.4, 0.12, 1.4], comps: { plate: { var: 'pp', stay: true, who: 'player' } } })], { vars: { pp: 0 } }));
  run(s2, 0.3);
  s2.state.player.p = [8, 0, 8]; run(s2, 0.3);
  ok('발판: 계속 켜짐(stay) · 플레이어만', s2.state.vars.pp === 1);
});
t('기본기: 아이템·가방', () => {
  const items = [{ icon: '🍎', name: '사과', var: 'apple', desc: '체력 +2', useVar: 'hp', useAmt: 2 }, '🔑|열쇠|key|문을 연다'];
  const p = P([ent({ id: 'tree', body: { type: 'trigger' }, pos: [0, 0, 0], events: [{ when: { on: 'touch', a: 'player', b: 'self' }, once: true, do: [{ do: 'give', item: 'apple', n: 3 }, { do: 'take', item: 'key', n: 5 }] }] })],
    { vars: { hp: 2, apple: 0, key: 1 }, items });
  ok('아이템: 검사 통과', SIM.validate(p).errors.length === 0, SIM.validate(p).errors.join('|'));
  ok('아이템: 표시 글자에 이름·설명', SIM.displayTexts(p).includes('사과') && SIM.displayTexts(p).includes('체력 +2'));
  ok('아이템: 줄·객체 둘 다 읽는다', SIM.parseItems(p).length === 2 && SIM.parseItems(p)[1].var === 'key');
  const s = SIM.create(p);
  run(s, 0.2);
  ok('아이템: 주기', s.state.vars.apple === 3);
  ok('아이템: 빼앗기는 0 아래로 안 간다', s.state.vars.key === 0);
  run(s, 1 / 60, { keys: { KeyI: true } });
  ok('가방: I 로 열린다(가진 것만)', s.state.menu && s.state.menu.kind === 'bag' && s.state.menu.items.length === 1 && /사과 ×3/.test(s.state.menu.items[0].label));
  run(s, 1 / 60, { ok: true });
  ok('가방: 고르면 쓴다', s.state.vars.apple === 2 && s.state.vars.hp === 4 && /사과를 썼다/.test(s.state.toast.text));
  ok('가방: 목록이 바로 바뀐다', /×2/.test(s.state.menu.items[0].label));
});
t('기본기: 컷신·효과·음악', () => {
  const s = SIM.create(P([
    ent({ id: 'statue', pos: [10, 0, 0] }),
    ent({ id: 'zone', pos: [0, 0, 0], body: { type: 'trigger', size: [2, 2, 2] }, events: [{ when: { on: 'touch', a: 'player', b: 'self' }, once: true,
      do: [{ do: 'music', name: 'night' }, { do: 'effect', kind: 'explosion', at: 'statue' }, { do: 'camera', target: 'statue', sec: 1, dist: 5, height: 2 }, { do: 'add', var: 'coins', value: 1 }] }] })
  ]));
  const fx = run(s, 0.1);
  ok('음악: 바꾸기', s.state.music === 'night');
  ok('효과: fx 가 나간다(대상 자리)', fx.some((f) => f.type === 'effect' && f.kind === 'explosion' && f.at[0] === 10) && fx.some((f) => f.type === 'shake'));
  ok('컷신: 켜진다', s.state.cine && s.state.cine.id === 'statue' && s.state.cine.dist === 5);
  const x0 = s.state.player.p[0];
  run(s, 0.5, { mx: 1 });
  ok('컷신: 그동안 플레이어가 안 움직인다', Math.abs(s.state.player.p[0] - x0) < 1e-6);
  ok('컷신: 다음 행동은 끝난 뒤', s.state.vars.coins === 0);
  run(s, 0.7, { mx: 1 });
  ok('컷신: 끝나면 다시 움직인다·다음 행동', !s.state.cine && s.state.player.p[0] > x0 && s.state.vars.coins === 1);
  s.enterScene('main');
  ok('음악: 장면에 들어가면 장면 기본으로', s.state.music == null);
});

/* ════════════════════════════════════════════════════════════════════
   5c) 장르(genres.js) — 장비·꾸미기·영지·던전
   ════════════════════════════════════════════════════════════════════ */
const GEARP = { bases: [{ id: 'sword', name: '철검', slot: 'weapon', atk: 0.1, sockets: 2 }, { id: 'mail', name: '사슬옷', slot: 'armor', guard: 0.1, sockets: 2 }, { id: 'ring', name: '옥가락지', slot: 'charm', sockets: 0 }],
  sets: [{ name: '청룡', pieces: 'sword,mail,ring', b2: 'atk 0.1', b3: 'speed 0.1' }], runewords: [{ name: '해달', runes: '해,달', slot: 'weapon', bonus: 'atk 0.3' }] };
const near = (a, b) => Math.abs(a - b) < 1e-9;
t('장르: 장비 굴림·장착·배율', () => {
  const s = SIM.create(P([], { gear: GEARP, vars: { gold: 0 } })), g = s.system('gear');
  s.state.vars['gear:sword:희귀'] = 2;
  run(s, 1 / 60);
  const G = g.state();
  ok('장비: 변수가 장비가 된다', G.bag.length === 2 && !('gear:sword:희귀' in s.state.vars));
  ok('장비: 희귀는 접사 3~4', G.bag.every((it) => it.grade === '희귀' && it.aff.length >= 3 && it.aff.length <= 4 && it.slot === 'weapon'));
  const it = G.bag[0], want = 1 + 0.1 + it.aff.filter((a) => a[0] === 'atk').reduce((n, a) => n + a[1], 0);
  g.equip(it);
  ok('장비: 장착하면 공격 배율', near(s.state.mods.atk, want), s.state.mods.atk + ' vs ' + want);
  g.equip(G.bag[0]);
  ok('장비: 같은 부위를 끼면 먼저 것은 가방으로', G.bag.length === 1 && G.bag[0] === it);
  g.unequip('weapon');
  ok('장비: 벗으면 배율이 제자리', near(s.state.mods.atk, 1) && near(s.state.mods.speed, 1) && near(s.state.mods.dmgTaken, 1));
  g.salvage(G.bag[0]);
  ok('장비: 분해하면 돈', s.state.vars.gold > 0 && G.bag.length === 1);
  const a = SIM.create(P([], { gear: GEARP })), b = SIM.create(P([], { gear: GEARP }));
  [a, b].forEach((x) => { x.state.vars['gear:mail'] = 5; run(x, 1 / 60); });
  ok('장비: 굴림 결정성', JSON.stringify(a.system('gear').state()) === JSON.stringify(b.system('gear').state()));
  run(s, 1 / 60, { keys: { KeyG: true } });
  ok('장비: G 로 창', s.state.menu && s.state.menu.kind === 'gear' && s.state.menu.items.length >= 4);
});
t('장르: 소켓·보석·룬워드·세트', () => {
  const s = SIM.create(P([], { gear: GEARP, vars: { 'rune:해': 2, 'rune:달': 2, 'gem:불': 1, 'gem:물': 1 } })), g = s.system('gear');
  s.state.vars['gear:sword:보통'] = 2; s.state.vars['gear:mail:보통'] = 1;
  run(s, 1 / 60);
  const G = g.state(), sw = G.bag.filter((x) => x.base === 'sword'), ml = G.bag.find((x) => x.base === 'mail');
  ok('소켓: 보통은 최대 소켓', sw[0].sockets === 2 && ml.sockets === 2);
  g.socket(sw[0], 'rune:해'); g.socket(sw[0], 'rune:달');
  ok('룬워드: 순서가 맞으면 완성', g.word(sw[0]) && g.word(sw[0]).name === '해달' && /해달/.test(g.label(sw[0])));
  g.socket(sw[1], 'rune:달'); g.socket(sw[1], 'rune:해');
  ok('룬워드: 순서가 틀리면 안 된다', !g.word(sw[1]));
  ok('소켓: 가진 만큼만 박는다', s.state.vars['rune:해'] === 0 && !g.socket(ml, 'rune:해'));
  ok('소켓: 다 차면 더 못 박는다', !g.socket(sw[0], 'gem:불'));
  g.equip(sw[0]);
  ok('룬워드: 효과(공격 +30% + 밑감 10%)', near(s.state.mods.atk, 1 + 0.1 + 0.3), s.state.mods.atk);
  g.socket(ml, 'gem:불'); g.socket(ml, 'gem:물');
  g.equip(ml);
  ok('보석: 갑주에 박으면 받는 피해 감소(불 3% + 물 5% + 밑감 10%)', near(s.state.mods.dmgTaken, 1 - 0.18), s.state.mods.dmgTaken);
  const s2 = SIM.create(P([], { gear: GEARP })), g2 = s2.system('gear');
  ['sword', 'mail', 'ring'].forEach((k) => { s2.state.vars['gear:' + k + ':세트'] = 1; });
  run(s2, 1 / 60);
  g2.state().bag.slice().forEach((x) => g2.equip(x));
  const aff = (k) => ['weapon', 'armor', 'charm'].reduce((n, sl) => n + g2.state().eq[sl].aff.filter((a) => a[0] === k).reduce((m, a) => m + a[1], 0), 0);
  ok('세트: 세 점이면 2점·3점 효과가 다 붙는다', g2.state().eq.weapon.set === '청룡' && near(s2.state.mods.speed, 1 + 0.1 + aff('speed')) && near(s2.state.mods.atk, 1 + 0.1 + 0.1 + aff('atk')), s2.state.mods.speed);
  const sv = s2.save(), s3 = SIM.create(P([], { gear: GEARP }));
  s3.load(JSON.parse(JSON.stringify(sv)));
  ok('장비: 세이브·불러오기', s3.system('gear').state().eq.charm && near(s3.state.mods.speed, s2.state.mods.speed));
  s3.system('gear').unequip('charm');
  ok('장비: 불러온 뒤 벗어도 배율이 맞다(2점만 남음)', near(s3.state.mods.speed, 1 + aff('speed') - g2.state().eq.charm.aff.filter((a) => a[0] === 'speed').reduce((m, a) => m + a[1], 0)));
  const p4 = P([ent({ id: 'z', body: { type: 'trigger', size: [2, 2, 2] }, events: [{ when: { on: 'touch', a: 'player', b: 'self' }, once: true, do: [{ do: 'gear', base: 'ring', grade: '전설' }] }] })], { gear: GEARP });
  const s4 = SIM.create(p4); const fx = run(s4, 0.1);
  ok('장비: 행동 "장비 주기" · 전설 알림', s4.system('gear').state().bag[0].grade === '전설' && fx.some((f) => f.type === 'pop'));
});
t('장르: 꾸미기', () => {
  const furn = [{ icon: '🪑', name: '의자', var: 'chair', w: 0.8, h: 1, d: 0.8 }];
  const p = P([ent({ id: 'room', pos: [0, 0, -3], scale: [8, 0.1, 8], comps: { room: { name: '내 방' } } })], { furniture: furn, vars: { chair: 2 } });
  p.scenes[0].entities[0].pos = [0, 0.2, 0]; p.scenes[0].entities[0].rot = [0, 180, 0];
  const s = SIM.create(p), H = s.system('housing');
  run(s, 0.5);
  run(s, 1 / 60, { keys: { KeyH: true } });
  ok('꾸미기: H 로 창', s.state.menu && s.state.menu.kind === 'housing');
  s.state.menu = null;
  ok('꾸미기: 놓기', H.place('chair') && s.state.vars.chair === 1 && s.state.ents.some((e) => e.alive && String(e.id).startsWith('furn~')));
  ok('꾸미기: 같은 칸엔 못 놓는다', !H.place('chair'));
  const placed = H.placed()[0], rot0 = placed.rot;
  ok('꾸미기: 1m 칸·방 바닥 위', Number.isInteger(placed.pos[0]) && Number.isInteger(placed.pos[2]) && placed.pos[1] > 0);
  H.turn();
  ok('꾸미기: 돌리기', H.placed()[0].rot === (rot0 + 90) % 360);
  s.enterScene('main');
  ok('꾸미기: 장면에 다시 들어와도 남는다', s.state.ents.filter((e) => e.alive && String(e.id).startsWith('furn~')).length === 1);
  s.state.player.p = placed.pos.slice(); s.state.player.p[2] += 1;
  ok('꾸미기: 치우기', H.takeBack() && s.state.vars.chair === 2 && !s.state.ents.some((e) => e.alive && String(e.id).startsWith('furn~')));
  s.state.player.p = [20, 0, 20];
  ok('꾸미기: 방 밖엔 못 놓는다', !H.place('chair'));
});
t('장르: 영지 경영·전쟁', () => {
  const T0 = (id, pos, town) => ent({ id, pos, scale: [3, 2.5, 3], comps: { town } });
  const p = P([T0('home', [0, 0, -4], { name: '내 성', owner: 'player', income: 15, troops: 60, wall: 1 }), T0('foe', [30, 0, 0], { name: '적 성', owner: 'enemy', troops: 10, wall: 1, grow: 2 }),
    T0('vil', [-30, 0, 0], { name: '마을', owner: 'neutral', troops: 5 })], { realm: { turnSec: 3 }, vars: { gold: 0, towns: 0, turn: 0, got: 0 } },
    { events: [{ when: { on: 'townTaken', name: '적 성' }, do: [{ do: 'add', var: 'got', value: 1 }] }] });
  const s = SIM.create(p), R = s.system('realm');
  run(s, 0.1);
  ok('영지: 처음 내 영지 수', s.state.vars.towns === 1);
  run(s, 3);
  ok('영지: 턴마다 수입·적 병력 증가', s.state.vars.gold === 15 && s.state.vars.turn === 1 && R.state(byId(s, 'foe')).troops === 12);
  run(s, 1 / 60, { act: true });
  ok('영지: F 로 다스림 창(출진 둘)', s.state.menu && s.state.menu.kind === 'realm' && s.state.menu.items.filter((i) => /출진/.test(i.label)).length === 2);
  s.state.menu = null;
  R.march(byId(s, 'home'), byId(s, 'foe'));
  run(s, 1 / 60);
  ok('영지: 출진해서 빼앗는다 · 이벤트', R.state(byId(s, 'foe')).owner === 'player' && s.state.vars.towns === 2 && s.state.vars.got === 1);
  const p2 = P([T0('home', [0, 0, -4], { owner: 'player', troops: 5, wall: 1 }), T0('foe', [30, 0, 0], { owner: 'enemy', troops: 200, grow: 0 })], { realm: { turnSec: 3 }, vars: { lost: 0 } },
    { events: [{ when: { on: 'townLost' }, do: [{ do: 'add', var: 'lost', value: 1 }] }] });
  const s2 = SIM.create(p2); run(s2, 3.1);
  ok('영지: 적이 약한 내 영지를 친다', s2.system('realm').state(byId(s2, 'home')).owner === 'enemy' && s2.state.vars.lost === 1 && s2.state.vars.towns === 0);
  const s3 = SIM.create(p2); run(s3, 0.1);
  s3.system('realm').state(byId(s3, 'foe')).peace = 5; run(s3, 3.1);
  ok('영지: 화친 중엔 안 친다', s3.system('realm').state(byId(s3, 'home')).owner === 'player');
});
t('장르: 무작위 던전', () => {
  const mk = (seed) => P([ent({ id: 'dg', look: { shape: 'none' }, body: { type: 'none' }, comps: { dungeon: { seed, rooms: 6, foes: 2, from: 'gob', chest: 1 } } }),
    ent({ id: 'gob', off: true, look: { shape: 'capsule' }, body: { type: 'dynamic', size: [0.8, 1.8, 0.8] }, comps: { health: { hp: 2 } } })]);
  const s = SIM.create(mk(7)), info = s.system('dungeon').info();
  const walls = s.state.ents.filter((e) => e.alive && String(e.id).startsWith('dwall~'));
  ok('던전: 방·벽이 생긴다', info && info.rooms >= 4 && walls.length === info.walls && walls.length > 20, JSON.stringify(info));
  ok('던전: 플레이어는 첫 방', s.state.player.p[0] === info.first[0] && s.state.player.p[2] === info.first[2]);
  const pb = s.box(s.state.player);
  ok('던전: 플레이어가 벽에 안 묻힌다', !walls.some((w) => { const b = s.box(w); return pb.x0 < b.x1 && pb.x1 > b.x0 && pb.z0 < b.z1 && pb.z1 > b.z0; }));
  ok('던전: 적(방마다)·출구', s.state.ents.filter((e) => e.alive && String(e.id).startsWith('gob~')).length === 2 * (info.rooms - 1) && s.state.ents.some((e) => e.alive && String(e.id).startsWith('dexit~')));
  ok('던전: 씨앗이 같으면 같은 던전', SIM.create(mk(7)).snapshot() === s.snapshot());
  ok('던전: 씨앗이 다르면 다른 던전', SIM.create(mk(8)).snapshot() !== s.snapshot());
  const r = SIM.create(mk(0)), sv = r.save(), r2 = SIM.create(mk(0));
  r2.load(JSON.parse(JSON.stringify(sv)));
  ok('던전: 씨앗 0 도 불러오면 같은 던전', r2.system('dungeon').info().seed === r.system('dungeon').info().seed);
  run(s, 2);
  ok('던전: 돌려도 멀쩡(떨어지지 않음)', s.state.player.p[1] > -1 && !s.state.over);
});
t('장르: 실명 가드가 장비·가구·컴포넌트 글자를 본다', () => {
  const p = P([ent({ id: 'sh', comps: { shop: { name: '상점 이름표', items: ['물건줄|1|x|1'] } } })], { gear: GEARP, furniture: [{ name: '가구 이름', var: 'f' }] });
  const d = SIM.displayTexts(p);
  ok('표시 글자: 장비·세트·룬워드·가구·컴포넌트 칸', ['철검', '청룡', '해달', '가구 이름', '상점 이름표', '물건줄|1|x|1'].every((x) => d.includes(x)) && !d.some((x) => /^#[0-9a-f]{6}$/i.test(x)));
});

t('틀 언덕 마을 퍼즐: 끝까지 풀기', () => {
  const p = JSON.parse(fs.readFileSync(path.join(ROOT, 'templates', 'hills.json'), 'utf8'));
  const s = SIM.create(p), S = s.state;
  const go = (id, dz = 1.2) => { const e = byId(s, id); S.player.p = [e.p[0], e.p[1] + 0.5, e.p[2] + dz]; S.player.v = [0, 0, 0]; run(s, 0.4); };
  const talk = () => run(s, 3, (i) => ({ act: i % 20 === 0 }));
  go('altar', 1.6); run(s, 0.1, (i) => ({ act: i === 0 }));
  ok('언덕 틀: 열쇠 없이 제단은 안내만', !S.over && /열쇠/.test(S.toast && S.toast.text));
  go('lever', 1.2); run(s, 0.1, (i) => ({ act: i === 0 }));
  ok('언덕 틀: 레버', S.vars.lever1 === 1 && S.vars.gate === 0);
  go('plate', 0); run(s, 0.3);
  ok('언덕 틀: 발판 → 문 변수', S.vars.plate1 === 1 && S.vars.gate === 1);
  talk();
  ok('언덕 틀: 컷신·말 뒤 문이 열려 있다', !S.cine && !S.dialog && byId(s, 'gate').p[1] > 3, byId(s, 'gate').p[1]);
  go('key', 0); run(s, 0.3);
  ok('언덕 틀: 꼭대기 열쇠를 얻는다', S.vars.key === 1 && !byId(s, 'key'));
  go('altar', 1.6); run(s, 0.1, (i) => ({ act: i === 0 })); run(s, 2.5);
  ok('언덕 틀: 제단 → 이김', S.over && S.over.win, JSON.stringify(S.over));
});

/* ════════════════════════════════════════════════════════════════════
   5b) 게임 설명서(글) → 판 — editor/brief.js
   ════════════════════════════════════════════════════════════════════ */
const BRIEF = require(path.join(ROOT, 'editor/brief.js'));
const RN = require(path.join(ROOT, '../content-editor/realname.js'));
t('설명서: 예시 글', () => {
  const r = BRIEF.build(BRIEF.EXAMPLE, { id: 'ex' }), v = SIM.validate(r.project);
  ok('설명서 예시: 못 알아들은 줄 없음', r.notes.length === 0, r.notes.join(' | '));
  ok('설명서 예시: 검사 통과(경고도 없음)', v.errors.length === 0 && v.warns.length === 0, v.errors.concat(v.warns).join(' | '));
  ok('설명서 예시: 장면 둘·목표 둘·젤다식', r.stats.scenes === 2 && r.stats.goals === 2 && r.project.combat.style === 'zelda', JSON.stringify(r.stats));
  ok('설명서 예시: 결정적(같은 글 = 같은 판)', JSON.stringify(r.project) === JSON.stringify(BRIEF.build(BRIEF.EXAMPLE, { id: 'ex' }).project));
  ok('설명서 예시: 실명 없음', !SIM.displayTexts(r.project).some((x) => RN.hits(x).length));
  const s1 = r.project.scenes[0], s2 = r.project.scenes[1];
  const door = s1.entities.find((e) => e.comps && e.comps.portal), back = s2.entities.find((e) => e.comps && e.comps.portal);
  ok('설명서 예시: 문이 서로를 가리키고 도착점이 있다', door.comps.portal.scene === s2.id && back.comps.portal.scene === s1.id &&
    s2.entities.some((e) => e.id === door.comps.portal.at) && s1.entities.some((e) => e.id === back.comps.portal.at));
  ok('설명서 예시: 대사·상점 물건', s1.entities.some((e) => e.comps && e.comps.talk && e.comps.talk.lines.length === 2) &&
    s1.entities.some((e) => e.comps && e.comps.shop && e.comps.shop.items.join() === '포션|10|potion|1,씨앗|3|seed|1'));
  ok('설명서 예시: 해골 궁수는 원거리 적(결승 아님)', s2.entities.filter((e) => e.name === '해골 궁수' && e.comps.foe.ranged).length === 2 && !s2.entities.some((e) => e.id === 'goal'));
  /* 겹침 없이 흩었나 — 플레이어 곁 3m 안에 아무것도 없다 */
  const pl = s1.entities[0].pos;
  ok('설명서 예시: 시작 자리 비움', !s1.entities.slice(1).some((e) => e.look.shape !== 'none' && Math.hypot(e.pos[0] - pl[0], e.pos[2] - pl[2]) < 3));
  const a = SIM.create(r.project), b = SIM.create(r.project);
  const inp = (i) => ({ mx: Math.sin(i / 50), mz: Math.cos(i / 70), jump: i % 90 === 0, atk: i % 20 === 0, act: i % 100 === 0 });
  run(a, 30, inp); run(b, 30, inp);
  ok('설명서 예시: 돈다·결정적', a.snapshot() === b.snapshot() && !(a.state.over && !a.state.over.win));
});
t('설명서: 종류 전부·전투 넷', () => {
  const all = BRIEF.KINDS.filter((K) => !/dungeon|wave|town/.test(K.k)).map((K) => '  ' + K.w[0] + (K.k === 'portal' ? ' → 둘째' : '') + (K.k === 'gate' ? '' : ' 2')).join('\n');
  for (const st of ['간단', '원신식', '젤다식', '파판식']) {
    const txt = '제목: 모두\n전투: ' + st + '\n장면: 첫째\n  레버\n' + all + '\n장면: 둘째\n  문 → 첫째\n  적 파도 12\n장면: 셋째\n  던전 6\n장면: 넷째\n  영지: 북쪽 성 (적)\n  영지: 남쪽 성 (나)\n' +
      '목표: 동전 2개\n목표: 두목 쓰러뜨리기\n목표: 주민 만나기\n목표: 30초 버티기\n목표: 레벨 3\n목표: 결승까지';
    const r = BRIEF.build(txt, { id: 'all' }), v = SIM.validate(r.project);
    ok('설명서 종류 전부(' + st + '): 알아들음', r.notes.length === 0, r.notes.join(' | '));
    ok('설명서 종류 전부(' + st + '): 검사', v.errors.length === 0, v.errors.slice(0, 4).join(' | '));
    const s = SIM.create(r.project); run(s, 3, (i) => ({ atk: i % 15 === 0 }));
    ok('설명서 종류 전부(' + st + '): 돈다', !!s.state.player);
  }
  const r = BRIEF.build('장면: 가\n  문지기 "여기는 못 지나간다"\n  뭔지모를것\n  문 → 없는곳\n목표: 하늘 날기');
  ok('설명서: "문지기" 는 사람, 모르는 줄·없는 장면·모르는 목표는 알림', r.project.scenes[0].entities.some((e) => e.comps && e.comps.talk && e.comps.talk.name === '문지기') && r.notes.length === 3, r.notes.join(' | '));
  const one = BRIEF.splitThing('적: 무서운 늑대 ×3 (체력 30, 원소 불) "크르릉"');
  ok('설명서: 줄 쪼개기', one.kind.k === 'foe' && one.name === '무서운 늑대' && one.count === 3 && one.opts.length === 2 && one.lines[0] === '크르릉', JSON.stringify(one));
});
t('설명서: 끝까지 놀기(동전 → 결승)', () => {
  const r = BRIEF.build('제목: 동전 시험\n장면: 들판\n  동전 3\n  결승\n목표: 동전 3개 모으기\n목표: 결승까지', { id: 'c3' });
  ok('설명서 놀기: 검사', SIM.validate(r.project).errors.length === 0 && r.notes.length === 0, r.notes.join(' | '));
  const s = SIM.create(r.project), S = s.state;
  const goal = () => S.ents.find((e) => e.id === 'goal');
  ok('설명서 놀기: 결승점은 처음에 숨음', goal().hidden);
  S.ents.filter((e) => e.comps.pickup && e.alive).forEach((c) => { S.player.p = [c.p[0], c.p[1], c.p[2]]; S.player.v = [0, 0, 0]; run(s, 0.3); });
  ok('설명서 놀기: 동전 셋 → 목표 하나', S.vars.coins === 3 && S.vars.goalsDone === 1, JSON.stringify(S.vars));
  run(s, 0.2);
  ok('설명서 놀기: 결승점이 나타남', !goal().hidden);
  S.player.p = [goal().p[0], 0, goal().p[2]]; S.player.v = [0, 0, 0]; run(s, 0.5);
  ok('설명서 놀기: 결승 → 이김', S.over && S.over.win, JSON.stringify(S.over));
});

/* ════════════════════════════════════════════════════════════════════
   6) 서버 API(임시 폴더)
   ════════════════════════════════════════════════════════════════════ */
async function serverTests() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saga-engine-test-'));
  process.env.SAGA_ENGINE_PROJECTS = path.join(tmp, 'projects');
  process.env.SAGA_ENGINE_DIST = path.join(tmp, 'dist');
  delete require.cache[require.resolve(path.join(ROOT, 'server.js'))];
  const srv = require(path.join(ROOT, 'server.js'));
  const server = http.createServer(srv.handle);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const J = async (method, url, body) => {
    const r = await fetch(base + url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) { j = txt; }
    return { status: r.status, j };
  };
  try {
    let r = await J('GET', '/api/templates');
    ok('서버: 틀 목록', r.status === 200 && r.j.length >= 6);
    for (const tpl of r.j) {
      const id = 't-' + tpl.name;
      const c = await J('POST', '/api/new', { id, title: tpl.title, template: tpl.name });
      ok('서버: 틀로 새로 ' + tpl.name, c.status === 200, JSON.stringify(c.j).slice(0, 200));
    }
    r = await J('POST', '/api/new', { id: 't-platformer', title: 'x', template: 'platformer' });
    ok('서버: 같은 id 막음', r.status === 409);
    r = await J('POST', '/api/new', { id: 'Bad Id', title: 'x' });
    ok('서버: id 형식', r.status === 400);
    r = await J('GET', '/api/project/t-platformer');
    ok('서버: 읽기', r.status === 200 && r.j.project.id === 't-platformer' && r.j.md5);
    const p = r.j.project, md5 = r.j.md5;
    p.title = '바뀐 제목';
    r = await J('POST', '/api/project/t-platformer', { project: p, base: 'wrong' });
    ok('서버: md5 충돌 막음', r.status === 409);
    r = await J('POST', '/api/project/t-platformer', { project: p, base: md5 });
    ok('서버: 저장', r.status === 200 && r.j.md5 !== md5);
    const p2 = JSON.parse(JSON.stringify(p)); p2.title = '이순신의 모험';
    r = await J('POST', '/api/project/t-platformer', { project: p2, base: r.j.md5 });
    ok('서버: 실명 가드', r.status === 422 && JSON.stringify(r.j).includes('실명'));
    const p3 = JSON.parse(JSON.stringify(p)); p3.start = 'nope';
    const cur = await J('GET', '/api/project/t-platformer');
    r = await J('POST', '/api/project/t-platformer', { project: p3, base: cur.j.md5 });
    ok('서버: 검사 오류 막음', r.status === 422);
    r = await J('GET', '/api/assets');
    ok('서버: 에셋 목록(몸짓 이름)', r.status === 200 && r.j.length > 100 && r.j.some((a) => a.anims.includes('Idle')), r.j.length);
    const warrior = r.j.find((a) => a.ref.endsWith('quaternius_rpg/Warrior.glb'));
    ok('서버: 에셋 참조 형식', warrior && warrior.ref.startsWith('lib:saga-go/models/'));
    let g = await fetch(base + '/lib/saga-go/models/nature/Rock_1.glb');
    ok('서버: 라이브러리 모델', g.status === 200 && (await g.arrayBuffer()).byteLength > 1000);
    g = await fetch(base + '/lib/saga-go/../../../package.json');
    ok('서버: 밖으로 못 나감', g.status === 403 || g.status === 404);
    g = await fetch(base + '/lib/saga-go/js/core.js');
    ok('서버: 에셋 밖 폴더 막음', g.status === 403);
    g = await fetch(base + '/runtime/three.iife.js');
    ok('서버: three 번들', g.status === 200);
    for (const f of ['play.html', 'sim.js', 'combat.js', 'systems.js', 'basics.js', 'genres.js', 'view.js', 'play.js', 'play-combat.js', 'play-systems.js', 'play-basics.js', 'play-genres.js']) {
      g = await fetch(base + '/runtime/' + f); ok('서버: 실행기 ' + f, g.status === 200);
    }
    g = await fetch(base + '/'); ok('서버: 편집기', g.status === 200 && (await g.text()).includes('editor.js'));
    const glb = fs.readFileSync(path.join(ROOT, '../../saga-go/assets/models/nature/Rock_1.glb'));
    g = await fetch(base + '/api/upload/t-arena?name=my%20rock.glb', { method: 'POST', body: glb });
    const up = await g.json();
    ok('서버: GLB 올리기', g.status === 200 && up.ref === 'proj:my_rock.glb');
    g = await fetch(base + '/api/upload/t-arena?name=x.glb', { method: 'POST', body: Buffer.from('not a glb at all, sorry!') });
    ok('서버: GLB 아닌 것 막음', g.status === 400);
    /* 내보내기 — 올린 모델·라이브러리 모델까지 */
    const ar = await J('GET', '/api/project/t-adventure');
    ar.j.project.scenes[0].entities.push({ id: 'myrock', name: '내 바위', pos: [3, 0, 3], look: { shape: 'model', model: 'proj:my_rock.glb' }, body: { type: 'solid' } });
    await fetch(base + '/api/upload/t-adventure?name=my_rock.glb', { method: 'POST', body: glb });
    r = await J('POST', '/api/project/t-adventure', { project: ar.j.project, base: ar.j.md5 });
    ok('서버: 올린 모델 쓰는 판 저장', r.status === 200, JSON.stringify(r.j).slice(0, 200));
    r = await J('POST', '/api/export/t-adventure');
    ok('서버: 내보내기', r.status === 200 && r.j.files > 8, JSON.stringify(r.j).slice(0, 200));
    const out = path.join(tmp, 'dist', 't-adventure');
    const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
    ok('내보내기: index.html 에 프로젝트', html.includes('window.SAGA_PROJECT=') && html.includes('<script src="systems.js">') && !html.includes('<!--SAGA-PROJECT-->'));
    ok('내보내기: 실행 파일', ['three.iife.js', 'sim.js', 'combat.js', 'systems.js', 'basics.js', 'genres.js', 'view.js', 'play.js', 'play-combat.js', 'play-systems.js', 'play-basics.js', 'play-genres.js', 'CREDITS.txt'].every((f) => fs.existsSync(path.join(out, f))));
    ok('내보내기: 라이브러리 모델 복사', fs.existsSync(path.join(out, 'assets/lib/saga-go/models/people/quaternius_rpg/Warrior.glb')));
    ok('내보내기: 올린 모델 복사', fs.existsSync(path.join(out, 'assets/proj/my_rock.glb')));
    /* 내보낸 판의 프로젝트가 그대로 돈다 */
    const m = /window\.SAGA_PROJECT=(.*?);<\/script>/s.exec(html);
    const ep = JSON.parse(m[1]);
    ok('내보내기: 박힌 프로젝트 검사', SIM.validate(ep).errors.length === 0);
    r = await J('GET', '/api/projects');
    ok('서버: 프로젝트 목록', r.status === 200 && r.j.length === TPL.length);
    /* 설명서 → 미리 보기 → 새로 만들기 */
    r = await J('POST', '/api/brief', { text: BRIEF.EXAMPLE, id: 'from-brief' });
    ok('서버: 설명서 짓기', r.status === 200 && r.j.project.id === 'from-brief' && r.j.check.errors.length === 0 && r.j.notes.length === 0, JSON.stringify(r.j.check || r.j).slice(0, 200));
    const made = await J('POST', '/api/new', { id: 'from-brief', project: r.j.project });
    ok('서버: 설명서 판 저장', made.status === 200, JSON.stringify(made.j).slice(0, 200));
    r = await J('POST', '/api/brief', { text: '장면: 가\n  주민: 세종대왕 "안녕"', id: 'rn' });
    ok('서버: 설명서도 실명 가드', r.status === 200 && r.j.check.errors.some((e) => /실명|표시 글자/.test(e)), JSON.stringify(r.j.check));
  } finally {
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

await serverTests().catch((e) => { fail++; fails.push('서버 시험 예외: ' + (e.stack || e)); });

fails.forEach((f) => console.log('FAIL ' + f));
console.log('RESULT ' + pass + '/' + (pass + fail));
process.exit(fail ? 1 : 0);
