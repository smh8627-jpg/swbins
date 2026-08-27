/**
 * 손으로 그린 땅 — 시험 삼아 만든 한 조각 (3D 전환 PHASE 5)
 * ---------------------------------------------------------------
 * 이 판의 땅은 여태 **무한한 해시**였다(`world.js` 의 `terrainAt`). 좌표를 넣으면
 * 숲인지 산인지 답이 나오고, 어디까지 걸어도 끝이 없다. 걷는 게임에는 맞는 구조인데
 * **손으로 만든 자리**가 하나도 없다는 뜻이기도 하다 — 마을 남쪽에 다리가 있고
 * 그 다리를 건너면 폐허가 있는, 이야기가 걸릴 자리가 없다.
 *
 * 그래서 원점 둘레 1km 사방에 **한 조각만** 손으로 그렸다(`PLAN.md` 46절
 * "하북의 작은 마을"). 여기서 NPC·동물·사건을 시험하고, 되면 넓힌다.
 *
 *   지도    글자 한 칸 = 48m 격자 하나. 보고 고칠 수 있게 **글자 그림**으로 둔다
 *   at()    이 격자가 이 구역 것이냐 — 아니면 null 이고, 그러면 옛 해시가 그대로 답한다
 *   place() 이름난 자리의 좌표(m) — 데모·진단이 걸어가 볼 때 쓴다
 *
 * **한 줄도 판정에 닿지 않는다.** `terrainAt` 은 이 저장소에서 **그리는 데만** 쓰인다
 * (2D 폴백 지형과 3D 사물). 스폰·거리·조우는 이 값을 보지 않는다 — 그래서 구역을
 * 얹어도 균형이 안 움직인다. 손잡이 `land.on` 을 0 으로 두면 통째로 잠들고
 * 옛 땅으로 돌아간다.
 *
 * 좌표 약속: 게임은 **원점에서 몇 미터** 로 논다(`world.js`). 시작 자리는 (0,0) 이고
 * 48m 로 나눈 것이 격자 번호다. 이 땅은 시작 자리를 **마을 한가운데**에 두었다 —
 * 켜면 곧바로 그 안에 서 있다.
 */
(function (global) {
  'use strict';

  function core() { return global.DG.core; }

  /* ── 글자 그림 ────────────────────────────────────────
   * 위가 북(ty 가 작은 쪽)이다. 21×21 = 1008m 사방.
   *
   *   ^ 산    T 숲    ~ 강    = 길    H 마을    F 농지    . 들
   *   C 동굴(산)      S 옛 사당(숲)   R 폐허(들)   B 다리(강)
   *
   * 길이 하나로 이어져 있다 — 북쪽 산속 동굴에서 내려와 마을을 지나 남쪽 다리를
   * 건넌다. 걸어서 구역을 가로지르는 동안 아홉 가지 땅을 다 밟게 두었다.
   */
  var HEBEI = {
    id: 'hebei',
    name: '하북의 작은 마을',
    /* 번화도 — **작은 마을**이다. 이 값을 안 주면 해시가 정하는데, 원점 둘레는
       번화한 쪽으로 잡혀 있어 초가집 사이에 12~34m 탑이 솟는다(눈으로 보고 알았다).
       0.62 아래면 탑이 안 서고 한 칸에 서너 채가 앉는다 */
    urban: 0.34,
    /* 이 지도의 왼쪽 위 칸이 어느 격자냐 — 가운데(10,10)가 격자 (0,0) 이 되게 잡았다 */
    ox: -10, oy: -10,
    map: [
      '^^^^^^^^^^^^^^^^^^^^^',
      '^^^^^^^^^^C^^^^^^^^^^',
      '^^^^^^^^^=^^^^^^^^^^^',
      '.^^^^^^^^=^^^^^^^^^^.',
      '..TTTT^^^=^^^^^TTTT..',
      '.TTTTTTS.=...TTTTTTT.',
      '.TTTTT...=...TTTTTT..',
      '..TTT....===....TTT..',
      '...=============.....',
      '...=HHHHHHHHHHH=.....',
      '...=HHHHHHHHHHH=.....',
      '...=HHHHHHHHHHH=.....',
      '...=============.....',
      '..FFFF...===...FFFF..',
      '.FFFFFF..=..FFFFFFF..',
      '.FFFFFF..=..FFFFFFF..',
      '..FFF....=....FFFF...',
      '~~~~~~~~~B~~~~~~~~~~~',
      '..RR.....=.......T...',
      '..RR.....=.......T...',
      '.........=...........'
    ],
    /* 글자 → 무슨 땅이냐. `mark` 는 그 자리에만 서는 것(다리·동굴 입구·무너진 기둥) */
    legend: {
      '.': { kind: 'grass' },
      'T': { kind: 'forest' },
      '^': { kind: 'mount' },
      '~': { kind: 'water' },
      '=': { kind: 'road' },
      'H': { kind: 'town' },
      'F': { kind: 'farm' },
      'B': { kind: 'water', mark: 'bridge' },
      'C': { kind: 'mount', mark: 'cave' },
      'S': { kind: 'forest', mark: 'shrine' },
      'R': { kind: 'grass', mark: 'ruin' }
    },
    /* 이름난 자리 — 격자 번호로 적는다. PHASE 6 부터 여기에 사람과 사건을 건다.
       `hidden` 셋이 46절의 "숨겨진 장소 3개" 다 */
    places: [
      { id: 'village', name: '마을 한가운데', tx: 0, ty: 0 },
      { id: 'gate_n', name: '북문', tx: 0, ty: -3 },
      { id: 'gate_s', name: '남문', tx: 0, ty: 3 },
      { id: 'farm', name: '논둑', tx: -6, ty: 4 },
      { id: 'bridge', name: '옛 다리', tx: -1, ty: 7 },
      { id: 'river', name: '강나루', tx: 5, ty: 7 },
      { id: 'wood', name: '숲 어귀', tx: -6, ty: -4 },
      { id: 'ridge', name: '산등성이', tx: 0, ty: -7 },
      { id: 'cave', name: '이름 없는 굴', tx: 0, ty: -9, hidden: true },
      { id: 'shrine', name: '무너진 사당', tx: -3, ty: -5, hidden: true },
      { id: 'ruin', name: '강 건너 폐허', tx: -8, ty: 8, hidden: true }
    ]
  };

  var LANDS = { hebei: HEBEI };
  var current = HEBEI;

  /** 이 땅을 쓸까 — 0 이면 통째로 잠들고 옛 해시 지형으로 돌아간다 */
  function on() { return core().tuned('land.on', 1) ? true : false; }

  function use(id) { current = LANDS[id] || null; return current; }
  function region() { return current; }

  /** 이 이 땅이 덮는 격자 범위 */
  function bounds(r) {
    r = r || current;
    if (!r) { return null; }
    return { x0: r.ox, y0: r.oy, x1: r.ox + r.map[0].length - 1, y1: r.oy + r.map.length - 1 };
  }

  /**
   * 이 격자는 무엇이냐 — 이 땅 밖이거나 꺼져 있으면 **null**.
   * null 을 받은 쪽은 여태 하던 대로(해시) 답을 낸다.
   */
  function at(tx, ty) {
    if (!on()) { return null; }
    var r = current;
    if (!r) { return null; }
    var c = tx - r.ox, y = ty - r.oy;
    if (y < 0 || y >= r.map.length) { return null; }
    var row = r.map[y];
    if (c < 0 || c >= row.length) { return null; }
    var e = r.legend[row.charAt(c)];
    if (!e) { return null; }
    return { kind: e.kind, mark: e.mark || null, ch: row.charAt(c), region: r.id };
  }

  function terrainAt(tx, ty) { var a = at(tx, ty); return a ? a.kind : null; }
  /** 이 땅이 못박아 둔 번화도 — 안 정했으면 null 이고, 그러면 해시가 정한다 */
  function urbanity(tx, ty) {
    var a = at(tx, ty);
    return a && typeof current.urban === 'number' ? current.urban : null;
  }
  function markAt(tx, ty) { var a = at(tx, ty); return a ? a.mark : null; }
  /** 이 격자를 이 땅이 맡고 있나 — 3D 는 여기를 보고 **지도 대신 제 지형**을 세운다 */
  function owns(tx, ty) { return !!at(tx, ty); }

  /** 이름난 자리의 **미터 좌표** (격자 한가운데) */
  function place(id) {
    var r = current, i;
    if (!r) { return null; }
    for (i = 0; i < r.places.length; i++) {
      if (r.places[i].id === id) {
        return {
          id: id, name: r.places[i].name, hidden: !!r.places[i].hidden,
          tx: r.places[i].tx, ty: r.places[i].ty,
          x: r.places[i].tx * 48 + 24, y: r.places[i].ty * 48 + 24
        };
      }
    }
    return null;
  }

  function places() {
    var r = current;
    if (!r) { return []; }
    return r.places.map(function (p) { return place(p.id); });
  }

  /** 이 땅에 무엇이 몇 칸씩 있나 — 진단·어드민이 값으로 본다 */
  function tally(r) {
    r = r || current;
    var out = {}, y, x, e, row;
    if (!r) { return out; }
    for (y = 0; y < r.map.length; y++) {
      row = r.map[y];
      for (x = 0; x < row.length; x++) {
        e = r.legend[row.charAt(x)];
        if (!e) { continue; }
        out[e.kind] = (out[e.kind] || 0) + 1;
        if (e.mark) { out['@' + e.mark] = (out['@' + e.mark] || 0) + 1; }
      }
    }
    return out;
  }

  /**
   * 지도가 성한지 — 줄이 다 같은 길이고, 모르는 글자가 없고, 길이 하나로 이어지는가.
   * 지도는 손으로 고치는 것이라 **고친 자리에서 곧바로 걸린다**(진단이 이걸 본다).
   */
  function validate(r) {
    r = r || current;
    var bad = [], y, x, ch, w;
    if (!r) { return ['땅이 없다']; }
    w = r.map[0].length;
    for (y = 0; y < r.map.length; y++) {
      if (r.map[y].length !== w) { bad.push('줄 ' + y + ' 길이 ' + r.map[y].length + '≠' + w); }
      for (x = 0; x < r.map[y].length; x++) {
        ch = r.map[y].charAt(x);
        if (!r.legend[ch]) { bad.push('모르는 글자 ' + ch + ' (' + x + ',' + y + ')'); }
      }
    }
    for (y = 0; y < r.places.length; y++) {
      if (!at(r.places[y].tx, r.places[y].ty)) {
        bad.push('땅 밖 자리 ' + r.places[y].id);
      }
    }
    return bad;
  }

  /**
   * 길이 하나로 이어져 있나 — 아무 길 칸에서 네 방향으로 번져 나가 **모든** 길 칸에
   * 닿는지 본다. 다리(`B`)는 길로 친다. 길이 끊기면 걸어서 땅을 가로지를 수 없다.
   */
  function roadIslands(r) {
    r = r || current;
    var road = {}, y, x, e, row, keys = [], k;
    for (y = 0; y < r.map.length; y++) {
      row = r.map[y];
      for (x = 0; x < row.length; x++) {
        e = r.legend[row.charAt(x)];
        if (!e) { continue; }
        if (e.kind === 'road' || e.mark === 'bridge') { road[x + ',' + y] = 1; keys.push(x + ',' + y); }
      }
    }
    if (!keys.length) { return 0; }
    var seen = {}, groups = 0, i;
    for (i = 0; i < keys.length; i++) {
      if (seen[keys[i]]) { continue; }
      groups++;
      var stack = [keys[i]];
      seen[keys[i]] = 1;
      while (stack.length) {
        var cur = stack.pop().split(',');
        var cx = +cur[0], cy = +cur[1];
        var nb = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
        for (var j = 0; j < nb.length; j++) {
          k = nb[j][0] + ',' + nb[j][1];
          if (road[k] && !seen[k]) { seen[k] = 1; stack.push(k); }
        }
      }
    }
    return groups;
  }

  function info() {
    var r = current;
    if (!r || !on()) { return { on: false }; }
    var b = bounds(r);
    return {
      on: true, id: r.id, name: r.name,
      w: r.map[0].length, h: r.map.length,
      m: r.map[0].length * 48 + '×' + r.map.length * 48 + 'm',
      box: b.x0 + ',' + b.y0 + '..' + b.x1 + ',' + b.y1,
      places: r.places.length,
      tally: tally(r)
    };
  }

  global.DG = global.DG || {};
  global.DG.land = {
    LANDS: LANDS, use: use, region: region,
    on: on, at: at, terrainAt: terrainAt, markAt: markAt, owns: owns, urbanity: urbanity,
    bounds: bounds, place: place, places: places,
    tally: tally, validate: validate, roadIslands: roadIslands, info: info
  };
})(window);
