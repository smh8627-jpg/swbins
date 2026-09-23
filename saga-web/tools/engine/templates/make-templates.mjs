#!/usr/bin/env node
/**
 * 사가 엔진 예제 틀 만들기 — `node saga-web/tools/engine/templates/make-templates.mjs`
 * 편집기 "새로 만들기"에 뜨는 틀(templates/*.json)을 여기서 짓는다. 틀은 데이터일 뿐이라 JSON 을 손으로 고쳐도 되지만,
 * 여기를 고치고 다시 돌리는 편이 덜 틀린다. 시험(test/run.mjs)이 틀마다 검사·자동 플레이를 돌린다.
 * 이름 정책: 실존 인물·원작 이름을 쓰지 않는다(루트 CLAUDE.md).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHAR = 'lib:saga-go/models/people/quaternius_rpg/';
const NAT = 'lib:saga-go/models/nature/';
const BLD = 'lib:saga-go/models/buildings/';

let seq = 0;
const E = (o) => Object.assign({ id: o.id || ('e' + (++seq)), pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1] }, o);
const player = (extra = {}, comp = {}) => E(Object.assign({ id: 'player', name: '플레이어', look: { shape: 'capsule', color: '#3b82f6' },
  body: { type: 'dynamic', size: [0.8, 1.8, 0.8] }, comps: { player: Object.assign({ mode: 'jump', speed: 6, jump: 8, attack: 1, range: 1.8 }, comp) } }, extra));
const box = (name, pos, scale, color, extra = {}) => E(Object.assign({ name, pos, scale, look: { shape: 'box', color }, body: { type: 'solid' } }, extra));
const coin = (pos) => E({ name: '동전', tag: 'coin', pos, look: { shape: 'cylinder', color: '#ffd166', glow: true }, scale: [0.6, 0.12, 0.6],
  body: { type: 'trigger', size: [1.4, 6, 1.4], off: [0, -2, 0] }, comps: { spin: { speed: 180 }, pickup: { var: 'coins', add: 1, sound: 'coin' } } });
const tree = (pos, s = 1) => E({ name: '나무', pos, scale: [s, s, s], look: { shape: 'model', model: NAT + 'CommonTree_1.glb', fit: 5 }, body: { type: 'solid', size: [0.8, 5, 0.8] } });
const foe = (name, pos, f, look, extra = {}) => E(Object.assign({ name, tag: 'foe', pos, look: look || { shape: 'capsule', color: '#8d6e63' },
  body: { type: 'dynamic', size: [0.8, 1.8, 0.8] }, comps: { foe: Object.assign({ hp: 60, atk: 8, def: 2, aggro: 9, move: 2.6, range: 1.8, windup: 0.7, cool: 1.6, exp: 10, gold: 5 }, f) } }, extra));
const npc = (name, pos, lines, extra = {}) => E(Object.assign({ name, pos, look: { shape: 'capsule', color: '#2a9d8f', label: name }, body: { type: 'solid', size: [0.8, 1.8, 0.8] },
  comps: { talk: { name, lines } } }, extra));
const env = (o = {}) => Object.assign({ sky: '#9fd0ff', fog: 110, light: 1, ground: { size: 80, color: '#7fb069' }, gravity: 22 }, o);
const loseOnHp = { when: { on: 'var', var: 'hp', op: '<=', value: '0' }, do: [{ do: 'lose', text: '쓰러졌다…' }] };
const base = (id, title, desc, extra) => Object.assign({ format: 'saga-engine', version: 1, id, title, desc }, extra);

const T = {};

/* ── 1) 3D 점프 수집 ─────────────────────────────────────────────── */
seq = 0;
T.platformer = base('platformer', '3D 점프 수집', '발판을 뛰어 동전 10개를 모으고 깃발로. 움직이는 발판·점프대·활공·등반.', {
  start: 'main', vars: { coins: 0, hp: 3 }, hud: [{ var: 'hp', label: '체력', style: 'hearts' }, { var: 'coins', label: '동전' }],
  goals: ['동전 {coins}/10', '끝의 깃발까지', ''],
  combat: { style: 'simple' },
  scenes: [{ id: 'main', name: '하늘 정원', env: env({ sky: '#aee1ff', ground: { size: 40, color: '#8bc34a' } }), camera: { mode: 'follow', dist: 10, height: 5 },
    entities: [
      player({ pos: [0, 0, 8], rot: [0, 180, 0] }, { glide: true, climb: true }),
      box('발판1', [0, 1, 0], [4, 0.5, 4], '#a47551'), box('발판2', [0, 2.2, -6], [3, 0.5, 3], '#a47551'),
      E({ name: '움직이는 발판', pos: [-5, 3, -10], scale: [3, 0.4, 3], look: { shape: 'box', color: '#e9c46a' }, body: { type: 'solid' }, comps: { patrol: { dx: 10, dy: 0, dz: 0, speed: 2.5 } } }),
      box('높은 발판', [6, 5, -16], [4, 0.5, 4], '#a47551'),
      box('절벽', [-8, 0, -18], [4, 7, 4], '#8d99ae'),
      E({ name: '점프대', pos: [6, 0, -10], scale: [1.6, 0.3, 1.6], look: { shape: 'cylinder', color: '#06d6a0', glow: true }, body: { type: 'trigger', size: [1, 2, 1] }, comps: { launch: { power: 17 } } }),
      coin([0, 1.9, 0]), coin([0, 3.1, -6]), coin([-5, 4, -10]), coin([0, 4, -10]), coin([6, 5.9, -16]), coin([-8, 7.6, -18]),
      coin([3, 0.6, 3]), coin([-3, 0.6, 3]), coin([10, 0.6, -2]), coin([-10, 0.6, -2]),
      E({ name: '가시', tag: 'spike', pos: [3, 0, -3], scale: [0.8, 0.8, 0.8], look: { shape: 'cone', color: '#6c757d' }, body: { type: 'solid' }, comps: { hurt: { var: 'hp', amount: 1 } } }),
      E({ id: 'goal', name: '결승점', pos: [0, 0, -22], scale: [0.2, 3, 0.2], look: { shape: 'cylinder', color: '#ffffff', glow: true, label: '결승' }, body: { type: 'trigger', size: [8, 1, 8] }, comps: { goal: { text: '동전을 모아 결승!' } }, hidden: true }),
      tree([12, 0, 8]), tree([-12, 0, 6], 1.2)
    ],
    events: [loseOnHp,
      { when: { on: 'var', var: 'coins', op: '>=', value: '10' }, do: [{ do: 'toast', text: '동전을 다 모았다! 결승점이 나타났다', sec: 3 }, { do: 'show', target: 'goal' }, { do: 'sound', name: 'win' }] },
      { when: { on: 'fall' }, do: [{ do: 'add', var: 'hp', value: -1 }] }] }]
});

/* ── 2) 모험 RPG(젤다식) — 마을·상점·상자·채집·낚시·퀘스트·하트·거점·동굴·보스 ── */
seq = 0;
T.adventure = base('adventure', '모험 RPG', '마을에서 부탁을 받고 동굴의 두목을 쓰러뜨린다. 상점·보물 상자·채집·낚시·관계 하트·거점 이동·시간과 날씨.', {
  start: 'village', vars: { hp: 6, gold: 20, exp: 0, lv: 1, herb: 0, fish: 0, potion: 1, seed: 2, crop: 0, mp: 30, bossDown: 0, charm: 0, sword: 0 },
  hud: [{ var: 'hp', label: '체력', style: 'hearts' }, { var: 'gold', label: '돈' }, { var: 'lv', label: '레벨' }],
  goals: ['약초 {herb}/3 · 물고기 {fish}', '레벨 {lv}', ''],
  combat: { style: 'zelda', atk: 1, hpMax: 10, potionHeal: 3, skills: [{ kind: 'bolt', name: '기탄', power: 2, cd: 2, mp: 5 }, { kind: 'nova', name: '파동', power: 2.5, cd: 8, mp: 15, r: 4 }], mpMax: 30, mpRegen: 3 },
  world: { clock: 'game', dayMin: 12, start: 8, seasonDays: 3, weather: 'auto', season: 'auto' },
  level: { expVar: 'exp', lvVar: 'lv', base: 30, atk: 0.2, hpVar: 'hp', hp: 1 },
  quests: [
    { id: 'herbs', name: '약초 세 줌', desc: '마을 어르신 부탁 — 들판의 약초', var: 'herb', op: '>=', value: 3, reward: ['gold|15', 'exp|20'], auto: false },
    { id: 'boss', name: '동굴의 두목', desc: '동굴 깊은 곳의 두목을 쓰러뜨린다', var: 'bossDown', op: '>=', value: 1, reward: ['gold|100', 'exp|60'], auto: false }
  ],
  scenes: [
    { id: 'village', name: '들녘 마을', env: env({ ground: { size: 90, color: '#86b55a' } }), camera: { mode: 'follow', dist: 9, height: 4.5 },
      entities: [
        player({ pos: [0, 0, 6], rot: [0, 180, 0], look: { shape: 'model', model: CHAR + 'Warrior.glb', fit: 1.8 } }, { sprint: true, climb: true, glide: true }),
        npc('어르신', [-4, 0, 0], ['어서 오게, 여행자.', '들판에서 약초 세 줌만 캐다 주겠나?'], {
          id: 'elder', events: [{ when: { on: 'act', b: 'self' }, once: true, do: [{ do: 'quest', id: 'herbs', op: 'start' }] },
            { when: { on: 'questDone', id: 'herbs' }, do: [{ do: 'say', name: '어르신', text: '고맙네! 동굴의 두목도 부탁하네 — 문은 마을 북쪽이야.' }, { do: 'quest', id: 'boss', op: 'start' }, { do: 'perk', title: '어르신의 가르침 — 하나를 고른다' }] }] }),
        E({ name: '상인', pos: [5, 0, -1], look: { shape: 'capsule', color: '#f4a261', label: '상점' }, body: { type: 'solid', size: [0.8, 1.8, 0.8] },
          comps: { shop: { name: '잡화점', currency: 'gold', items: ['포션|10|potion|1', '씨앗|3|seed|1', '강화 부적|40|charm|1'] } } }),
        E({ name: '주민', pos: [2, 0, -6], look: { shape: 'capsule', color: '#e76f51', label: '주민' }, body: { type: 'solid', size: [0.8, 1.8, 0.8] },
          comps: { talk: { name: '주민', lines: ['오늘 날씨가 좋네.'] }, bond: { max: 10, high: ['자네 덕에 마을이 든든해.', '(작은 선물을 건넸다)'] }, codex: { book: '사람', name: '주민' } } }),
        E({ name: '밭', pos: [-8, 0, 6], scale: [2.5, 1, 2.5], look: { shape: 'plane', color: '#6d4c41' }, body: { type: 'none' }, comps: { plot: { seed: 'seed', crop: 'crop', grow: 25, yield: 2 } } }),
        E({ name: '연못', pos: [10, -3, 8], scale: [8, 3.1, 8], look: { shape: 'box', color: '#3d8fd6' }, body: { type: 'trigger' }, comps: { water: {} } }),
        E({ name: '낚시터', pos: [5.4, 0, 8], scale: [1.5, 1, 1.5], look: { shape: 'plane', color: '#8d6e63', label: '낚시터' }, body: { type: 'solid', size: [1, 0.05, 1] }, comps: { fishing: { var: 'fish', fishes: ['붕어', '잉어', '메기'], zone: 0.25 } } }),
        E({ name: '약초', tag: 'herb', pos: [-14, 0, -8], scale: [0.5, 0.6, 0.5], look: { shape: 'cone', color: '#6abf4b' }, body: { type: 'trigger' }, comps: { gather: { item: '약초', var: 'herb', add: 1, regrow: 40 } } }),
        E({ name: '약초', tag: 'herb', pos: [-16, 0, -12], scale: [0.5, 0.6, 0.5], look: { shape: 'cone', color: '#6abf4b' }, body: { type: 'trigger' }, comps: { gather: { item: '약초', var: 'herb', add: 1, regrow: 40 } } }),
        E({ name: '약초', tag: 'herb', pos: [-12, 0, -15], scale: [0.5, 0.6, 0.5], look: { shape: 'cone', color: '#6abf4b' }, body: { type: 'trigger' }, comps: { gather: { item: '약초', var: 'herb', add: 1, regrow: 40 } } }),
        E({ name: '보물 상자', pos: [16, 0, -14], scale: [1, 0.7, 0.7], look: { shape: 'box', color: '#d6dde8' }, body: { type: 'solid' }, comps: { chest: { grade: 'exquisite', lock: 'camp', var: 'gold' } } }),
        foe('들개', [18, 0, -18], { hp: 3, atk: 1, def: 0, exp: 8, gold: 2 }, { shape: 'model', model: 'lib:saga-go/models/animals/Wolf.glb', fit: 1.1 }),
        foe('들개', [14, 0, -19], { hp: 3, atk: 1, def: 0, exp: 8, gold: 2 }, { shape: 'model', model: 'lib:saga-go/models/animals/Wolf.glb', fit: 1.1 }),
        E({ id: 'wp_village', name: '마을 봉수대', pos: [-6, 0, 9], scale: [1.2, 3, 1.2], look: { shape: 'cylinder', color: '#78909c', label: '봉수대' }, body: { type: 'solid' }, comps: { waypoint: { name: '마을' } } }),
        E({ name: '사슴', pos: [-20, 0, 12], look: { shape: 'model', model: 'lib:saga-go/models/animals/Deer.glb', fit: 1.7 }, body: { type: 'solid', size: [0.8, 1.7, 1.6] }, comps: { codex: { book: '생물', name: '사슴' } } }),
        E({ name: '여우', pos: [22, 0, 10], look: { shape: 'model', model: 'lib:saga-go/models/animals/Fox.glb', fit: 0.8 }, body: { type: 'solid', size: [0.6, 0.8, 1] }, comps: { codex: { book: '생물', name: '여우' }, patrol: { dx: 0, dy: 0, dz: 6, speed: 1.5 } } }),
        E({ name: '집', pos: [-10, 0, -2], look: { shape: 'model', model: BLD + 'House_1.glb', fit: 6 }, body: { type: 'solid', size: [5, 6, 5] } }),
        E({ name: '집', pos: [10, 0, -6], rot: [0, 90, 0], look: { shape: 'model', model: BLD + 'House_2.glb', fit: 6 }, body: { type: 'solid', size: [5, 6, 5] } }),
        E({ id: 'door_cave', name: '동굴 문', pos: [0, 0, -30], scale: [2.4, 2.4, 2.4], look: { shape: 'torus', color: '#9b5de5', glow: true, label: '동굴' }, body: { type: 'trigger', size: [0.8, 1, 0.4] }, comps: { spin: { speed: 40 }, portal: { scene: 'cave', at: 'cave_in' } } }),
        E({ id: 'from_cave', name: '돌아온 자리', pos: [0, 0, -26], look: { shape: 'none' }, body: { type: 'none' } }),
        tree([-24, 0, -20]), tree([24, 0, -24], 1.2), tree([-26, 0, 20]), tree([26, 0, 18])
      ],
      events: [loseOnHp, { when: { on: 'hour', hour: 21 }, do: [{ do: 'toast', text: '밤이 되었다 — 들개가 사나워진다', sec: 3 }] }] },
    { id: 'cave', name: '어둑한 동굴', env: env({ sky: '#1d1a24', fog: 45, light: 0.55, ground: { size: 50, color: '#4a4452' } }), camera: { mode: 'follow', dist: 8, height: 4 },
      entities: [
        player({ pos: [0, 0, 18], rot: [0, 180, 0], look: { shape: 'model', model: CHAR + 'Warrior.glb', fit: 1.8 } }, { sprint: true }),
        E({ id: 'cave_in', name: '동굴 입구', pos: [0, 0, 18], rot: [0, 180, 0], look: { shape: 'none' }, body: { type: 'none' } }),
        E({ name: '나가는 문', pos: [0, 0, 22], scale: [2.4, 2.4, 2.4], look: { shape: 'torus', color: '#9b5de5', glow: true, label: '마을' }, body: { type: 'trigger', size: [0.8, 1, 0.4] }, comps: { portal: { scene: 'village', at: 'from_cave' } } }),
        box('바위벽', [-8, 0, 0], [2, 5, 30], '#5c5566'), box('바위벽', [8, 0, 0], [2, 5, 30], '#5c5566'),
        foe('해골병', [-3, 0, 6], { hp: 4, atk: 1, def: 0, exp: 12, gold: 4 }), foe('해골 궁수', [3, 0, 2], { hp: 3, atk: 1, def: 0, ranged: true, range: 7, exp: 12, gold: 4 }),
        foe('두목', [0, 0, -8], { hp: 24, atk: 2, def: 0, poise: 6, enrage: 25, windup: 0.9, range: 2.6, boss: true, exp: 60, gold: 40, drops: ['영웅의 칼|1|sword|1|영웅', '포션|0.8|potion|2|보통'] },
          { shape: 'capsule', color: '#b71c1c', label: '두목' }, { id: 'boss', once: true, scale: [1.6, 1.6, 1.6],
            events: [{ when: { on: 'destroyed', b: 'self' }, do: [{ do: 'set', var: 'bossDown', value: 1 }, { do: 'shake', sec: 0.5, power: 0.5 }] }] }),
        E({ name: '보물 상자', pos: [0, 0, -14], scale: [1.2, 0.8, 0.8], look: { shape: 'box', color: '#f5c74d' }, body: { type: 'solid' }, comps: { chest: { grade: 'precious', lock: 'camp', var: 'gold' } } }),
        E({ name: '석등', pos: [-5, 0, -14], scale: [0.5, 1.4, 0.5], look: { shape: 'cylinder', color: '#9e9e9e' }, body: { type: 'solid' }, comps: { torch: { element: '', sec: 30 } } })
      ],
      events: [loseOnHp, { when: { on: 'var', var: 'bossDown', op: '>=', value: '1' }, do: [{ do: 'toast', text: '두목을 쓰러뜨렸다! 마을로 돌아가 보자', sec: 4 }] }] }
  ]
});

/* ── 3) 원신식 필드 ──────────────────────────────────────────────── */
seq = 0;
const elemFoe = (name, pos, el, extra = {}) => foe(name, pos, Object.assign({ hp: 220, atk: 14, def: 3, element: el, exp: 20, gold: 8 }, extra),
  { shape: 'capsule', color: { '불': '#ff6b3d', '물': '#3da5ff', '얼음': '#a8ecff', '번개': '#c07bff', '바람': '#5ee6b0' }[el] || '#888' });
T.genshin = base('genshin', '원신식 필드', '파티 넷을 바꿔 가며 원소 반응으로 싸운다. 절벽 등반·활공·헤엄·석등 상자.', {
  start: 'field', vars: { hp: 120, exp: 0, gold: 0, lv: 1, potion: 3 },
  hud: [{ var: 'gold', label: '모라' }, { var: 'lv', label: '레벨' }], goals: ['적을 쓰러뜨리고 석등 셋을 밝혀라', '레벨 {lv}', ''],
  graphics: { toon: true, outline: true },
  combat: { style: 'genshin', skillCd: 6, potionHeal: 50, party: [
    { name: '불꽃검사', element: '불', color: '#ff6b3d', hp: 130, atk: 22, def: 4 }, { name: '물무희', element: '물', color: '#3da5ff', hp: 110, atk: 18, def: 3 },
    { name: '얼음창', element: '얼음', color: '#a8ecff', hp: 120, atk: 20, def: 4 }, { name: '바람궁', element: '바람', color: '#5ee6b0', hp: 100, atk: 19, def: 3 }] },
  world: { clock: 'game', dayMin: 16, start: 10, weather: 'auto', season: 'auto', seasonDays: 4 },
  level: { expVar: 'exp', lvVar: 'lv', base: 40, atk: 0.1 },
  scenes: [{ id: 'field', name: '바람 언덕', env: env({ sky: '#8fd3ff', fog: 160, ground: { size: 120, color: '#93c572' } }), camera: { mode: 'follow', dist: 9, height: 4 },
    entities: [
      player({ pos: [0, 0, 10], rot: [0, 180, 0] }, { sprint: true, glide: true, climb: true, stamina: 120 }),
      elemFoe('불도깨비', [-6, 0, -8], '불'), elemFoe('물거북', [6, 0, -10], '물', { shield: 120 }), elemFoe('번개살쾡이', [0, 0, -16], '번개', { move: 3.6 }),
      elemFoe('얼음정령', [-12, 0, -22], '얼음', { ranged: true, range: 8, hp: 160 }),
      box('절벽', [20, 0, -10], [10, 14, 10], '#9a9188'), box('절벽 위 탑', [20, 14, -10], [3, 6, 3], '#b0b4af'),
      E({ name: '호수', pos: [-26, -4, 10], scale: [16, 4.1, 20], look: { shape: 'box', color: '#3d8fd6' }, body: { type: 'trigger' }, comps: { water: {} } }),
      E({ name: '석등(불)', pos: [-4, 0, -30], scale: [0.5, 1.4, 0.5], look: { shape: 'cylinder', color: '#9e9e9e' }, body: { type: 'solid' }, comps: { torch: { element: '불', sec: 20 } } }),
      E({ name: '석등(얼음)', pos: [4, 0, -30], scale: [0.5, 1.4, 0.5], look: { shape: 'cylinder', color: '#9e9e9e' }, body: { type: 'solid' }, comps: { torch: { element: '얼음', sec: 20 } } }),
      E({ name: '석등(물)', pos: [0, 0, -36], scale: [0.5, 1.4, 0.5], look: { shape: 'cylinder', color: '#9e9e9e' }, body: { type: 'solid' }, comps: { torch: { element: '물', sec: 20 } } }),
      E({ name: '화려한 상자', pos: [0, 0, -31], scale: [1.3, 0.9, 0.9], look: { shape: 'box', color: '#9a5ce0' }, body: { type: 'solid' }, comps: { chest: { grade: 'luxurious', lock: 'torch', var: 'gold' } } }),
      E({ name: '정교한 상자', pos: [20, 14.01, -6], scale: [1, 0.7, 0.7], look: { shape: 'box', color: '#d6dde8' }, body: { type: 'solid' }, comps: { chest: { grade: 'exquisite', lock: 'none', var: 'gold' } } }),
      E({ name: '봉수대', pos: [6, 0, 13], scale: [1.2, 3, 1.2], look: { shape: 'cylinder', color: '#78909c', label: '순간이동 지점' }, body: { type: 'solid' }, comps: { waypoint: { name: '언덕 아래' } } }),
      tree([10, 0, 12], 1.3), tree([-10, 0, 14]), tree([30, 0, 20], 1.5), tree([-34, 0, -20], 1.2)
    ],
    events: [{ when: { on: 'gone', b: '#foe' }, once: true, do: [{ do: 'toast', text: '적을 모두 물리쳤다!', sec: 3 }, { do: 'perk', title: '새 힘 — 특성 하나' }] }] }]
});

/* ── 4) 젤다식 결투 ──────────────────────────────────────────────── */
seq = 0;
T.zelda = base('zelda', '젤다식 결투장', '주목(Q)·방패 저스트 가드(Shift)·저스트 회피 러시·회전 베기로 기사 셋을 쓰러뜨린다. V 로 1인칭·3인칭·쿼터뷰.', {
  start: 'arena', vars: { hp: 6, exp: 0, gold: 0, potion: 2 }, hud: [{ var: 'hp', label: '', style: 'hearts' }], goals: ['기사를 모두 쓰러뜨린다', '', ''],
  combat: { style: 'zelda', atk: 1, hpMax: 6, potionHeal: 2 },
  scenes: [{ id: 'arena', name: '돌 결투장', env: env({ sky: '#c9d6e3', fog: 70, ground: { size: 36, color: '#b8a98e' } }), camera: { mode: 'follow', dist: 8, height: 3.5 },
    entities: [
      player({ pos: [0, 0, 8], rot: [0, 180, 0], look: { shape: 'model', model: CHAR + 'Rogue.glb', fit: 1.8 } }),
      foe('창기사', [0, 0, -4], { hp: 6, atk: 1, def: 0, windup: 0.8, cool: 1.8, range: 2.2, exp: 10 }, { shape: 'model', model: CHAR + 'Warrior.glb', fit: 1.9 }),
      foe('칼기사', [-5, 0, -8], { hp: 6, atk: 1, def: 0, windup: 0.6, cool: 1.4, exp: 10 }, { shape: 'model', model: CHAR + 'Monk.glb', fit: 1.9 }),
      foe('석궁병', [5, 0, -10], { hp: 4, atk: 1, def: 0, ranged: true, range: 8, windup: 0.9, exp: 10 }, { shape: 'model', model: CHAR + 'Ranger.glb', fit: 1.9 }),
      box('기둥', [-10, 0, 0], [1.5, 6, 1.5], '#8d8577'), box('기둥', [10, 0, 0], [1.5, 6, 1.5], '#8d8577'), box('기둥', [-10, 0, -12], [1.5, 6, 1.5], '#8d8577'), box('기둥', [10, 0, -12], [1.5, 6, 1.5], '#8d8577'),
      box('벽', [0, 0, -18], [36, 4, 1], '#7d7567'), box('벽', [0, 0, 18], [36, 4, 1], '#7d7567'), box('벽', [-18, 0, 0], [1, 4, 36], '#7d7567'), box('벽', [18, 0, 0], [1, 4, 36], '#7d7567')
    ],
    events: [loseOnHp, { when: { on: 'gone', b: '#foe' }, do: [{ do: 'win', text: '결투장의 승자!' }] },
      { when: { on: 'start' }, do: [{ do: 'toast', text: 'Q 로 주목, Shift 로 방패 — 공격 직전에 막으면 저스트 가드', sec: 5 }] }] }]
});

/* ── 5) 파판식 ATB ──────────────────────────────────────────────── */
seq = 0;
T.ff = base('ff', '파판식 모험(ATB)', '필드에서 적에 닿으면 ATB 커맨드 전투. 마을 상점에서 포션을 사고, 북쪽 성채의 마왕을 쓰러뜨린다.', {
  start: 'town', vars: { hp: 90, exp: 0, gold: 30, potion: 2 }, hud: [{ var: 'gold', label: '길' }, { var: 'potion', label: '포션' }],
  goals: ['북쪽 성채의 마왕', '', ''],
  combat: { style: 'ff', potionHeal: 50, party: [
    { name: '검사', color: '#3b82f6', hp: 95, mp: 12, atk: 13, def: 5, mag: 5, spd: 11, magic: '케알' },
    { name: '마도사', color: '#9b5de5', hp: 65, mp: 36, atk: 6, def: 2, mag: 13, spd: 9, magic: '파이어,블리자드,선더' },
    { name: '사제', color: '#f1faee', hp: 75, mp: 30, atk: 7, def: 3, mag: 11, spd: 10, magic: '케알,케알라,에어로' }] },
  scenes: [
    { id: 'town', name: '시작 마을', env: env({ ground: { size: 60, color: '#9ccc65' } }), camera: { mode: 'top', dist: 14, height: 14, yaw: 45 },
      entities: [
        player({ pos: [0, 0, 6], rot: [0, 180, 0] }, { mode: 'walk', sprint: true }),
        E({ name: '도구점', pos: [5, 0, 0], look: { shape: 'capsule', color: '#f4a261', label: '도구점' }, body: { type: 'solid', size: [0.8, 1.8, 0.8] },
          comps: { shop: { name: '도구점', currency: 'gold', items: ['포션|8|potion|1', '하이포션|20|potion|3'] } } }),
        npc('여관 주인', [-5, 0, 0], ['마왕이 북쪽 성채에 산다더군.', '초록 슬라임은 약하지만 무리로 다닌다네.']),
        E({ name: '필드로', pos: [0, 0, -20], scale: [2.4, 2.4, 2.4], look: { shape: 'torus', color: '#9b5de5', glow: true, label: '들판' }, body: { type: 'trigger', size: [0.8, 1, 0.4] }, comps: { portal: { scene: 'field', at: 'f_in' } } }),
        E({ id: 't_back', name: '마을 들어온 자리', pos: [0, 0, -16], look: { shape: 'none' }, body: { type: 'none' } }),
        E({ name: '집', pos: [-10, 0, -8], look: { shape: 'model', model: BLD + 'House_3.glb', fit: 6 }, body: { type: 'solid', size: [5, 6, 5] } })
      ], events: [] },
    { id: 'field', name: '넓은 들판', env: env({ ground: { size: 100, color: '#7cb342' } }), camera: { mode: 'top', dist: 16, height: 16, yaw: 45 },
      entities: [
        player({ pos: [0, 0, 30], rot: [0, 180, 0] }, { mode: 'walk', sprint: true }),
        E({ id: 'f_in', name: '들어온 자리', pos: [0, 0, 30], rot: [0, 180, 0], look: { shape: 'none' }, body: { type: 'none' } }),
        E({ name: '마을로', pos: [0, 0, 36], scale: [2.4, 2.4, 2.4], look: { shape: 'torus', color: '#9b5de5', glow: true, label: '마을' }, body: { type: 'trigger', size: [0.8, 1, 0.4] }, comps: { portal: { scene: 'town', at: 't_back' } } }),
        foe('초록 슬라임', [-6, 0, 16], { hp: 30, atk: 6, def: 1, spd: 7, count: 3, exp: 6, gold: 4, element: '물' }, { shape: 'sphere', color: '#76c893' }, { once: true }),
        foe('불박쥐', [8, 0, 6], { hp: 40, atk: 8, def: 2, spd: 12, count: 2, exp: 10, gold: 6, element: '불' }, { shape: 'sphere', color: '#ff6b3d' }, { once: true }),
        foe('바위골렘', [-4, 0, -6], { hp: 120, atk: 12, def: 6, spd: 6, count: 1, exp: 30, gold: 20, element: '번개' }, { shape: 'box', color: '#8d8577' }, { once: true, scale: [1.5, 1.5, 1.5] }),
        foe('마왕', [0, 0, -30], { hp: 420, atk: 16, def: 5, spd: 10, count: 1, exp: 200, gold: 200, boss: true, element: '얼음' }, { shape: 'capsule', color: '#4a148c', label: '마왕' },
          { id: 'maou', scale: [2, 2, 2], events: [{ when: { on: 'destroyed', b: 'self' }, do: [{ do: 'win', text: '마왕을 쓰러뜨렸다! 세계에 평화가.' }] }] }),
        tree([12, 0, 20], 1.4), tree([-14, 0, 2], 1.2), tree([16, 0, -12], 1.5)
      ], events: [] }
  ]
});

/* ── 6) 파도 생존(난입) ─────────────────────────────────────────── */
seq = 0;
T.arena = base('arena', '파도 생존', '쿼터뷰에서 스킬(Z X C R)로 끝없는 파도를 버틴다 — 기탄·연쇄 번개·회오리·소환. 쓰러뜨린 적에게서 노획물.', {
  start: 'pit', vars: { hp: 10, mp: 60, exp: 0, gold: 0, lv: 1, potion: 3, wave: 0 },
  hud: [{ var: 'hp', label: '체력', style: 'hearts' }, { var: 'wave', label: '파도' }, { var: 'gold', label: '금' }, { var: 'lv', label: '레벨' }],
  goals: ['파도 {wave} — 10파도를 버텨라', '', ''],
  combat: { style: 'simple', atk: 2, hpMax: 12, potionHeal: 4, mpMax: 60, mpRegen: 4, skills: [
    { kind: 'bolt', name: '기탄', power: 2, cd: 0.6, mp: 3 }, { kind: 'chain', name: '연쇄 번개', power: 3, cd: 4, mp: 12, element: '번개' },
    { kind: 'whirl', name: '회오리', power: 2, cd: 5, mp: 10 }, { kind: 'summon', name: '정령 소환', power: 2, cd: 15, mp: 20 }] },
  level: { expVar: 'exp', lvVar: 'lv', base: 25, atk: 0.15, hpVar: 'hp', hp: 1 },
  scenes: [{ id: 'pit', name: '투기장', env: env({ sky: '#2b2d42', fog: 60, light: 0.8, ground: { size: 40, color: '#5c4d3c' } }), camera: { mode: 'top', dist: 13, height: 15, yaw: 30 },
    entities: [
      player({ pos: [0, 0, 0], look: { shape: 'model', model: CHAR + 'Wizard.glb', fit: 1.8 } }, { sprint: true }),
      foe('망령', [0, 0, 0], { hp: 5, atk: 1, def: 0, aggro: 40, move: 2.4, exp: 5, gold: 1, drops: ['금화|0.5|gold|3|보통', '마나 구슬|0.2|mp|20|마법', '생명초|0.1|hp|2|희귀'] },
        { shape: 'capsule', color: '#8e9aaf' }, { id: 'wraith', off: true }),
      E({ name: '스포너', pos: [0, 0, 0], look: { shape: 'none' }, body: { type: 'none' }, comps: { spawner: { from: 'wraith', every: 2, max: 8, radius: 16, wave: true } } }),
      box('벽', [0, 0, -20], [40, 3, 1], '#3d3229'), box('벽', [0, 0, 20], [40, 3, 1], '#3d3229'), box('벽', [-20, 0, 0], [1, 3, 40], '#3d3229'), box('벽', [20, 0, 0], [1, 3, 40], '#3d3229')
    ],
    events: [loseOnHp, { when: { on: 'var', var: 'wave', op: '>=', value: '11' }, do: [{ do: 'win', text: '10파도를 버텼다!' }] },
      { when: { on: 'levelUp' }, do: [{ do: 'perk', title: '레벨 업 — 특성 하나' }] }] }]
});

for (const [name, p] of Object.entries(T)) {
  fs.writeFileSync(path.join(HERE, name + '.json'), JSON.stringify(p, null, 2) + '\n');
  console.log('wrote', name + '.json', (p.scenes || []).reduce((n, s) => n + s.entities.length, 0) + ' entities');
}
