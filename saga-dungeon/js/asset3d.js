/**
 * 3D 에셋 창고 — 사가고와 같은 것을 쓴다 (사가블로 4단계, PLAN 4·5·6절)
 * ---------------------------------------------------------------
 * 여태 이 판의 사람·짐승·나무·바위는 `dungeon3d.js`가 상자를 쌓아 조립했다.
 * 손으로 빚은 것이라 가볍고 늘 도는 대신, 아무리 다듬어도 손으로 빚은 티가 난다.
 *
 * 사가고가 몸이 갈라지는 문제를 근본에서 없앤 그 창고(Quaternius의 뼈대가
 * 완전히 같은 몸+옷+머리)를 **그대로** 옮겨 쓴다 — `assets/ASSET_LICENSES.md`
 * 에 적어 두었듯 `saga-go/assets/models/…`를 그대로 복사했다. 리타기팅도
 * `pickPieces`(부위 변형 고르기)도 필요 없는 것까지 그대로다.
 *
 * 이 판에는 사가고의 `world3d.js`가 없으므로 **여기서 직접 세운다** — GLB 가
 * 없거나 실패하면 `dungeon3d.js`가 원래 그리던 상자로 조용히 남는다
 * (`build()`가 돌려주는 shell 은 처음부터 그 상자를 담고 있다가 GLB 가
 * 오면 그 자리에서 갈아 끼운다).
 *
 * **표를 읽는 함수는 three 없이도 돈다** — 자가진단이 그것만 따로 본다.
 * 세우는 함수만 three 를 쓴다.
 */
(function (global) {
  'use strict';

  var T = null;
  function three() { if (!T) { T = global.THREE || null; } return T; }

  /* ── 손잡이 — 이 판의 core.js 에는 tuned 가 없다(dungeon3d.js 와 같은 사정) */
  var knobs = {};
  function tuned(k, def) {
    if (knobs[k] !== undefined) { return knobs[k]; }
    var D3 = global.DG.dungeon3d;
    if (D3 && D3.tuned) { return D3.tuned(k, def); }
    return def;
  }
  function set(k, v) { if (v === null || v === undefined) { delete knobs[k]; } else { knobs[k] = v; } return knobs; }
  function GLB_ON() { return tuned('asset3d.glb', 1) ? true : false; }

  /* ── 표 ─────────────────────────────────────────────── */
  var PEOPLE = 'assets/models/people/regular/';
  var ANIM_DIR = 'assets/models/anim/';
  var NATURE = 'assets/models/nature/';
  var NATURE_REAL = 'assets/models/nature/realistic/';
  var ANIMALS = 'assets/models/animals/';
  var PROPS = 'assets/models/props/';
  var BLD = 'assets/models/buildings/';
  var BLD_REAL = 'assets/models/buildings/realistic/';
  var BLD_HEX = 'assets/models/buildings/hexagon/';
  var DUN = 'assets/models/dungeon/';
  var WPN = 'assets/models/weapons/';
  var GEAR = 'assets/models/gear/';

  /* 2026-09-03 — 다른 네 판과 같은 이유로 사람 기본을 갈아 끼운다. Quaternius
     "RPG Character Pack"(CC0, 전사·궁수·도적·성직자·마법사·수도승 6종)은 몸 파일
     하나에 걷기·공격·사망 클립이 다 들어 있어 옷·머리·ANIM_SRC 몸짓이 필요 없다 */
  var PEOPLE_QRPG = 'assets/models/people/quaternius_rpg/';
  var HERO_RECIPES = ['Warrior', 'Ranger', 'Rogue', 'Cleric', 'Wizard', 'Monk'].map(function (n) {
    var f = PEOPLE_QRPG + n + '.glb';
    return { key: 'qrpg_' + n.toLowerCase(), body: f, anim: f };
  });

  /* 2026-09-04 — 나무·바위·덤불·통나무 실사화(사람은 Mixamo 재배포 금지로
     막다른 길, 자연물만 간다 — `saga-forest`가 이미 검증한 Poly Haven CC0
     사진측량 스캔을 그대로 복사해 옮겼다, `ASSET_LICENSES.md` 참고). 저다각형
     Quaternius 셋은 지우지 않고 여기 남겨 둔다 — 안 맞으면 DEFAULTS 의 해당
     줄을 이 값으로 되돌리면 그만이다. */
  var NATURE_STYLIZED = {
    'tree': [NATURE + 'CommonTree_1.glb', NATURE + 'CommonTree_2.glb', NATURE + 'CommonTree_3.glb'],
    'tree_dead': NATURE + 'CommonTree_Dead_1.glb',
    'rock': [NATURE + 'Rock_1.glb', NATURE + 'Rock_2.glb', NATURE + 'Rock_3.glb', NATURE + 'Rock_Moss_1.glb'],
    'bush': [NATURE + 'Bush_1.glb', NATURE + 'Bush_2.glb'],
    'log': NATURE + 'WoodLog.glb'
  };

  /* 옛 조합형 — 표 기본에서는 빠졌다. 지우지 않고 남겨 둔다(되돌림 자리) */
  var HERO_RECIPES_FALLBACK = [
    { key: 'male_peasant_buzzed', body: PEOPLE + 'Superhero_Male_FullBody.gltf',
      outfit: PEOPLE + 'Male_Peasant.gltf', hair: PEOPLE + 'Hair_Buzzed.gltf' },
    { key: 'male_ranger_long', body: PEOPLE + 'Superhero_Male_FullBody.gltf',
      outfit: PEOPLE + 'Male_Ranger.gltf', hair: PEOPLE + 'Hair_Long.gltf' },
    { key: 'male_peasant_beard', body: PEOPLE + 'Superhero_Male_FullBody.gltf',
      outfit: PEOPLE + 'Male_Peasant.gltf', hair: PEOPLE + 'Hair_Beard.gltf' },
    { key: 'female_peasant_buns', body: PEOPLE + 'Superhero_Female_FullBody.gltf',
      outfit: PEOPLE + 'Female_Peasant.gltf', hair: PEOPLE + 'Hair_Buns.gltf' },
    { key: 'female_ranger_simple', body: PEOPLE + 'Superhero_Female_FullBody.gltf',
      outfit: PEOPLE + 'Female_Ranger.gltf', hair: PEOPLE + 'Hair_SimpleParted.gltf' },
    { key: 'female_peasant_buzzed', body: PEOPLE + 'Superhero_Female_FullBody.gltf',
      outfit: PEOPLE + 'Female_Peasant.gltf', hair: PEOPLE + 'Hair_BuzzedFemale.gltf' }
  ];
  var SKIP_AUTORETARGET = {};
  HERO_RECIPES.concat(HERO_RECIPES_FALLBACK).forEach(function (r) {
    SKIP_AUTORETARGET[r.body] = true;
    if (r.outfit) { SKIP_AUTORETARGET[r.outfit] = true; }
    if (r.hair) { SKIP_AUTORETARGET[r.hair] = true; }
  });
  var ANIM_SRC = ANIM_DIR + 'UAL1_Standard.glb';

  var DEFAULTS = {
    'hero': HERO_RECIPES,
    'beast': ANIMALS + 'Wolf.glb',
    /* 몬스터 다양화 — 코끼리병처럼 몸집 큰 짐승 형 적은 소 GLB 로 대신한다
       (딱 맞는 코끼리는 CC0 로 못 찾았다, 늑대만 쓰면 다 같은 크기·모양이 된다) */
    'beast_big': ANIMALS + 'Cow.glb',
    /* 2026-09-04 — 도감(펫) 초상 실사화. "코드로 그리지 말고 에셋으로"가
       인물 초상은 이미 되는데(`portrait3d.js`) 펫(짐승)은 여태 빠져 있었다.
       펫 41종 중 신수(神獸) 11종·포켓몬 오마주 16종은 CC0로 존재할 리 없는
       창작물이라 손 안 대고, **실제 동물 14종만** 이번에 채운다. `pet:` 로
       묶어 들판 소품(`beast`=늑대, `beast_big`=소)과는 다른 자리임을 표시한다.
       출처는 `assets/ASSET_LICENSES.md` "도감(펫) 초상" 절 참고 */
    'pet:jindo': ANIMALS + 'ShibaInu.glb',
    'pet:sapsal': ANIMALS + 'Husky.glb',
    'pet:tiger': ANIMALS + 'Tiger.glb',
    'pet:bear': ANIMALS + 'Bear.glb',
    'pet:magpie': ANIMALS + 'Mesh_Crow.gltf',
    'pet:crane': ANIMALS + 'Crane.glb',
    'pet:toad': ANIMALS + 'Frog.glb',
    'pet:carp': ANIMALS + 'Koi.glb',
    'pet:panda': ANIMALS + 'Panda.glb',
    'pet:monkey': ANIMALS + 'Monkey.glb',
    'pet:deer': ANIMALS + 'Deer.glb',
    'pet:boar': ANIMALS + 'Boar.glb',
    'pet:owl': ANIMALS + 'Owl.glb',
    'pet:cat': ANIMALS + 'Cat.glb',
    /* 2026-09-04(이어서) — 사용자가 "사가고처럼 실사화"를 요청 → 사람은
       막다른 길(Mixamo 재배포 금지, 위 delam 주석 참고)이라 자연물만
       Poly Haven CC0 사진측량 스캔으로 갈아 끼웠다(`island_tree_02`,
       `saga-forest`가 이미 88% 심플리파이해 둔 4.86MB 짜리를 그대로 복사).
       옛 셋은 `NATURE_STYLIZED.tree`에 되돌림 자리로 남음 */
    'tree': NATURE_REAL + 'IslandTree_02.glb',
    /* 2026-09-04(이어서) — 같은 실사화, Poly Haven `dead_quiver_trunk`(선 채
       마른 줄기). 늪(swamp) Biome 에도 이 값이 그대로 쓰인다 */
    'tree_dead': NATURE_REAL + 'TreeDead.glb',
    /* 2026-09-04(이어서) — 같은 실사화. `saga-forest`가 처음 갈아 끼웠던 5종
       그대로(맑은 바위 Rock_07·Stone_01 + 이끼 바위 MossRock_a·b·c) — 이 판은
       바위를 결 하나(`rock`)로만 두므로 다섯을 한 표에 섞는다(`rock:moss`로
       가르지 않는다, PLAN 7절 "이끼"는 이 다섯 중 셋이 그대로 맡는다) */
    'rock': [NATURE_REAL + 'Rock_07.glb', NATURE_REAL + 'Stone_01.glb',
      NATURE_REAL + 'MossRock_a.glb', NATURE_REAL + 'MossRock_b.glb', NATURE_REAL + 'MossRock_c.glb'],
    /* 폐허의 기둥·무너진 벽 — 딱 맞는 "부러진 돌기둥" 낱개는 못 찾아
       `Arch.glb`(무너진 아치)로 대신한다. 사가고가 이미 같은 후보를 적어 뒀다
       (`saga-go/assets/ASSET_LICENSES.md` "사당·폐허의 다른 후보") */
    'pillar': PROPS + 'Arch.glb',
    'wall': PROPS + 'Wall.glb',
    /* 절벽 — 나무나 헤드보다 큰 산 덩이(Mountain)를 대신 세운다 */
    'cliff': [NATURE + 'Mountain_1.glb', NATURE + 'Mountain_2.glb'],
    /* 제단 — 사가고가 "사당" 후보로 적어 둔 그 Temple 을 그대로 쓴다 */
    'altar': PROPS + 'Temple.glb',
    /* 동굴 입구 — 사가고가 이미 "광산 어귀"로 적어 둔 그 Mine 을 그대로 쓴다 */
    'cavemouth': PROPS + 'Mine.glb',
    /* 천막 — 2026-09-04, saga-forest 가 이미 받아 둔 진짜 텐트(survival_pack,
       CC0)를 그대로 옮겨 왔다. 여태 대역으로 쓰던 장터 좌판(MarketStand)은
       'stall'로 이름만 남겨 둔다(행상 좌판이 여전히 그 자리를 쓴다) */
    'tent': PROPS + 'Tent.glb',
    'stall': BLD + 'MarketStand_1.glb',
    /* 모닥불 — 2026-09-04, saga-forest 가 받아 둔 medieval_village_pack 의
       Bonfire_Lit(CC0)로 갈아 끼웠다. 예전엔 "CC0로 딱 맞는 걸 못 찾았다"고
       적어 뒀던 자리다(도형 그대로 남겨 뒀었다) */
    'campfire': PROPS + 'Bonfire_Lit.glb',
    /* 물(못) — 2026-09-05, 사용자 요청("물 텍스처 실사화")으로 찾아봤지만
       **타일링되는 물 표면 텍스처 자체가 CC0에 없었다**(Poly Haven·ambientCG
       둘 다 뒤졌다 — 물은 사진 텍스처로 잘 안 만드는 소재라 원천적으로
       드물다. ambientCG의 'Ice00x'는 얼어붙은 호수라 못과 안 맞아 걸렀다).
       대신 poly.pizza의 Poly by Google 'Pond'(CC-BY 3.0, saga-dungeon이
       Tiger·Bear 등에서 이미 쓰는 그 출처)를 통째로 썼다 — 바위 고리·
       연잎·물결 데칼까지 다 갖춘 완성 모델이라 여태 코드가 그리던 단색
       반투명 상자(그리고 field3d.js 가 따로 놓던 갈대)를 한 번에 대신한다.
       실사 텍스처는 아니지만(저다각형 팔레트 색이다, 다른 실사화와 결이
       다르다는 뜻) **코드가 그리던 도형을 실제 완성 에셋으로 바꿨다**는
       원칙은 그대로 지킨다. 출처는 `ASSET_LICENSES.md` 참고 */
    'pond': NATURE + 'pond.glb',
    /* 표지판(들판의 'post') — SAGA WEB.md 11절 "표지판", 지난 여러 세션이
       "이 팩·다른 네 판 어디에도 CC0로 맞는 게 없다"고 적어 두고 도형으로
       남겨 뒀던 자리. 2026-09-05 — poly.pizza에서 Kenney의 'Signpost'
       (CC0, 로그인 없이 `static.poly.pizza` 직접 다운로드 확인)를 찾아
       채웠다. 원본 비율이 이미 세로가 최대 치수(0.46 대 가로 0.21)라
       'pond'처럼 가로세로를 뒤집어 풀 필요가 없다 — 다른 대다수 소품과
       같은 방식으로 그대로 `normalize()`에 맡긴다. 출처는
       `assets/ASSET_LICENSES.md` 참고 */
    'post': PROPS + 'signpost.glb',
    /* 땅바닥 잡초 — PLAN 7·11절 "풀·꽃·덤불·버섯·통나무", 이 판에만 여태
       하나도 없었다(다른 네 판은 다 갖고 있다). 판정에는 안 닿는 순수 장식
       (field3d.js `clutterAt()`) */
    'grass': [NATURE + 'Grass_2.glb', NATURE + 'Grass_Short.glb'],
    'flower': NATURE + 'Flowers.glb',
    /* 2026-09-04(이어서) — 같은 실사화. Poly Haven `shrub_04`(세로로 선 다발이라
       이 판의 normalize()가 옆으로 안 늘린다, `saga-forest` 주석 참고) */
    'bush': NATURE_REAL + 'Shrub_04.glb',
    'mushroom': [PROPS + 'Mushroom_1.glb', PROPS + 'Mushroom_2.glb'],
    /* 2026-09-04(이어서) — 같은 실사화. Poly Haven `dead_tree_trunk`·
       `dead_tree_trunk_02`(이름과 달리 쓰러진 통나무 — tree_dead가 아니라
       여기 자리가 원래 뜻에 맞는다, `saga-forest` 주석 참고) */
    'log': [NATURE_REAL + 'Log_a.glb', NATURE_REAL + 'Log_b.glb'],
    /* 마을(모루골) 건물 — 집 넷은 자리마다 씨앗으로 섞어 세운다(나무·바위와 같은 요령).
       2026-09-04(이어서) — 실사화. PolyScan(CC0, 로그인 없이 무료 다운로드 확인)의
       사진측량 아님·PBR 모델 둘로 갈아 끼웠다 — 돌집(house_stone)·통나무집
       (house_wooden). 원본은 집+수레+양동이가 한 장면에 묶여 있어 `House`·`Wood`
       재질(집 몸체·지붕널) 노드만 추려 냈다(수레·양동이는 버렸다) — 탑과 같은
       trimesh 파이프라인, 텍스처는 4096→768px jpeg85. 출처는 `ASSET_LICENSES.md` */
    'house': [BLD_REAL + 'house_stone.glb', BLD_REAL + 'house_wooden.glb'],
    /* 2026-09-05 — 우물을 실사화. PolyScan에는 우물 자체가 없었지만
       KayKit(같은 작가, 이미 던전 소품에서 쓰는 그 CC0)의 다른 팩
       "Medieval Hexagon Pack"엔 있다 — 지난 재탐색 때 "CC0인데 저다각형
       스타일이 안 어울린다"고 접었던 그 팩이다. 사용자 지시("아무거나
       대체하면 됨 … 시대가 퓨전이야 여러가지를 합쳐도 상관없어")로 스타일
       통일 조건이 풀려 다시 꺼냈다. 이 팩은 itch.io 페이지 자체는 로그인
       뒤에 있지만(Sketchfab과 같은 부류), Kay Lousberg가 이 팩도 자기
       GitHub 조직에 그대로 미러해 뒀다(던전 소품과 같은 경로) —
       `KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0`, 로그인 없이
       그대로 받았다. 색상별(blue·red·green·yellow·neutral) 진영 세트 중
       'blue'만 골랐다 — 이 판엔 진영 구분이 없어 하나면 된다. 원본은 이미
       .gltf+.bin+공용 텍스처 하나(작은 아틀라스, 팩 전체가 공유)로 완결돼
       있어 trimesh로 그대로 읽어 단일 glb로만 다시 구웠다(재질 분리·텍스처
       리사이즈 단계 자체가 필요 없었다 — PolyScan 사진측량과 달리 이
       팩은 원래도 저장이 가볍다). 출처는 `ASSET_LICENSES.md` 참고 */
    'well': BLD_HEX + 'well.glb',
    /* 2026-09-05 — 대장간을 실사화. PolyScan 카탈로그에 '대장간 건물'은
       원래도 없다(모루 소품 하나뿐, 위 재탐색 기록 참고) — 그런데 그 뒤
       카탈로그가 늘어 집 계열 세 번째(medieval-stone-and-wood-cottage)가
       새로 걸렸다. 사용자 지시("다른 건물로 변경해도 되니 있는 걸로
       위주로 해줘")를 따라 **모양은 집이지만 대장간 자리에** 앉혔다 —
       "대장간 모양"을 못 찾은 채 저다각형으로 5년 남느니, 돌집(화기에
       강한 석조)을 대장간으로 쓰는 편이 이 판의 다른 실사 건물과 결이
       맞는다. house_stone·house_wooden과 같은 trimesh 파이프라인
       (House·Wood 재질 노드만 추림, 4096→768px jpeg85) — 이번엔 원본에
       수레·양동이 같은 덤 오브젝트가 없어 그 단계가 필요 없었다.
       출처는 `ASSET_LICENSES.md` 참고 */
    'blacksmith': BLD_REAL + 'house_cottage.glb',
    /* 2026-09-05 — 여관·마방·방앗간도 같은 Medieval Hexagon Pack(위 우물
       주석 참고)에서 채웠다. 마방은 이 팩에 그 이름 그대로는 없다 — 병영
       (barracks)을 대신 앉혔다(사용자 지시로 역할·모양 일치를 요구하지
       않는다). 여관은 이 팩의 'tavern'(큰 맥주통이 통째로 간판을 겸하는
       모양 — 흔한 여관 도상은 아니지만 이 팩 자체의 방식이다), 방앗간은
      'windmill'(날개 달린 실제 풍차, 가장 자연스럽게 맞아떨어졌다) */
    'inn': BLD_HEX + 'tavern.glb',       // 갈대나루(나루터) — 나그네 쉼터
    'stable': BLD_HEX + 'barracks.glb',  // 자작재(산길) — 마방(대역)
    'mill': BLD_HEX + 'windmill.glb',    // 소금벌(염전) — 방앗간
    /* SAGA WEB.md "E. 건물" 목록의 "탑" — 모루골(중심 마을)의 표지 건물로
       하나만 세운다. 2026-09-04 — Poly Haven `modular_fort_01`
       (성채 모듈 키트, CC0)에서 원형 탑 조각(`tower_round`) 하나만
       추려 옮겼다. 이 판엔 Blender·gltf-transform이 없어(다른 실사화는
       전부 이미 만들어진 파일을 복사했다) **처음으로 직접 변환**했다 —
       `trimesh`(Python)로 gltf+bin+diffuse 세 장만 받아(법선·거칠기 맵은
       이 판 재질(Lambert)에 안 쓰여 안 받음, `delam` 과 같은 이유) 768px
       재압축 후 단일 glb로 구웠다. 출처는 `ASSET_LICENSES.md` 참고.
       2026-09-05 — E 건물 목록(집·우물·대장간·여관·마방·방앗간) 여섯이
       이제 다 실사·CC0 에셋으로 찼다(모양이 정확히 원작 그대로는 아니다,
       사용자가 그래도 된다고 정했다) */
    'belltower': BLD_REAL + 'tower_round.glb',
    /* SAGA WEB.md "F. 소품" 목록의 "무기" — `dungeon3d.js`의 `foeGear()`가
       사람 형 적(황건적·왜구…)에게 `data-enemy.js`의 `look.weapon`대로
       쥐여 주던 자리인데, 몸은 실사 GLB(QRPG 창고)인데 무기만 도형(각목)
       이었다. 2026-09-05 — poly.pizza에서 Quaternius CC0 무기를 찾아
       일곱 다 채웠다. `wpn:halberd`는 딱 맞는 CC0 도끼창을 못 찾아
       `wpn:spear`와 **같은 파일을 재사용**한다(대장간=집 모델 재사용과
       같은 판단 — "역할·모양이 정확히 안 맞아도 된다"). 못 받으면 옛
       도형(foeGear의 그 각목·활 그대로)으로 돌아간다. 출처는
       `assets/ASSET_LICENSES.md` 참고 */
    'wpn:club': WPN + 'club.glb',
    'wpn:axe': WPN + 'axe.glb',
    'wpn:sword': WPN + 'sword.glb',
    'wpn:spear': WPN + 'spear.glb',
    'wpn:halberd': WPN + 'spear.glb',
    'wpn:staff': WPN + 'staff.glb',
    'wpn:bow': WPN + 'bow.glb',
    /* 몬스터 다양화 이어서 — 투구·왕관(`foeGear()`의 `look.helm`). 'helmet'(일반
       투구, **CC-BY 3.0**)·'crown'(왕관, CC0)만 채웠다. 출처는
       `assets/ASSET_LICENSES.md` 참고 */
    'gear:helmet': GEAR + 'helmet.glb',
    'gear:crown': GEAR + 'crown.glb',
    /* 2026-09-05(이어서) — 사용자 지시("모양이 완전히 안 맞아도 실사화가
       우선이다 · 못 찾으면 삭제하고 있는 걸로 대체")로 나머지 둘도 채웠다.
       `gapju`(원뿔형 동아시아 투구)는 CC0/CC-BY 어디에도 없어 **바이킹
       투구**(뿔 달린 서양 투구, **CC-BY 3.0**)로 대신한다 — 대장간=집
       모델과 같은 판단, 뿔이 있어도 "다른 투구를 쓴 정예"로는 충분히
       읽힌다. `cape`(망토)도 CC0 표준형은 없어 유일하게 찾은 완성
       망토 모델(**CC-BY 3.0**, 색이 이미 붉·금이라 세력색으로 덧물들이면
       탁해져 **tint 는 안 준다** — 항상 같은 붉·금 망토로, 지휘관급이라는
       인상은 여전히 준다)을 쓴다. `beard`(수염)는 마스카·콧수염 말고는
       진짜 CC0 턱수염 낱개가 없어 — **끝까지 찾아도 없어서 도형(각목)
       자체를 지웠다**(`foeGear()`의 `look.beard` 분기 삭제, 없으면 없는
       대로 둔다는 판단) */
    'gear:gapju': GEAR + 'viking_helmet.glb',
    'gear:cape': GEAR + 'cape.glb',
    /* 방 안 장식(PLAN 6절) — KayKit Dungeon Remastered(CC0). 여태 상자를 쌓아
       흉내 내던 자리를 실물로 갈아 끼운다. `dg:` 로 묶은 것은 **들판(field)의
       'pillar'·'wall' 과는 다른 자리**라는 뜻이다 — 저 둘은 사가고에서 물려받은
       Arch.glb·Wall.glb 를 그대로 쓰므로 여기서 안 건드린다.
       출처는 `assets/ASSET_LICENSES.md` 참고 */
    'dg:chest': DUN + 'chest.glb',
    'dg:torch': DUN + 'torch_mounted.gltf.glb',
    'dg:pillar': DUN + 'pillar.gltf.glb',
    /* 갇힌 우리(POI: 이벤트방) — 실제 감옥 창살 기둥. 자리마다 넷을 둘러 세운다 */
    'dg:cage': DUN + 'barrier_column.gltf.glb',
    /* 다음 방 문 — 열린 아치 하나만 받았다. 잠금·해금은 모델을 안 바꾸고
       색(tint)만 바꾼다 — 2D 가 오래 쓰던 신호(잠기면 어둡게, 풀리면 금빛)를
       그대로 지킨다 */
    'dg:door': DUN + 'wall_doorway.glb',
    /* 방 구석 잡동사니(순수 장식, PLAN 6절 보강) — 술통·상자 더미. 판정 신호가
       아니라서 GLB 를 못 받으면 그냥 안 세운다(다른 dg: 항목과 달리 fallback
       도형을 안 둔다) */
    'dg:barrel': DUN + 'barrel_large.gltf.glb',
    'dg:crate': DUN + 'box_small.gltf.glb',
    'dg:crates': DUN + 'crates_stacked.gltf.glb',
    /* 2026-09-04 — SAGA WEB.md 감사("의자·무기·방패" 소품)로 같은 KayKit 팩에서
       두 가지 더 받았다. 술통·상자와 같은 순수 장식 자리(방 구석)에 섞인다 */
    'dg:chair': DUN + 'chair.gltf.glb',
    'dg:shield': DUN + 'sword_shield.gltf.glb',
    /* 2026-09-04 — PLAN §G "던전" 목록의 "함정". 판정(피해)은 손대지 않는다
       (밸런스는 사람이 정할 자리) — 방에 위험하다는 인상만 준다 */
    'dg:spikes': DUN + 'floor_tile_big_spikes.glb',
    /* 보스방 벽 현수막 — 색은 세력이 아니라 "여기가 보스방" 신호라 하나로 고정 */
    'dg:banner': DUN + 'banner_thin_red.gltf.glb',
    /* 행상 좌판 — MarketStand(=`tent`) 위에 놓일 긴 상. 딱 맞는 "행상 수레"는
       못 찾아 대신한다 */
    'dg:table': DUN + 'table_long.gltf.glb',
    /* 2026-09-04 — PLAN §G "던전" 목록의 "계단". 마지막 방의 문(`kind==='stair'`,
       dungeon.js의 makeDoors)은 다음 층으로 내려가는 자리인데, 3D는 여태
       다른 문과 똑같은 아치(dg:door)로만 그려 2D의 🪜 표시와 결이 안 맞았다.
       같은 KayKit 팩에서 실물 계단을 받아 이 문 하나만 갈아 끼운다 */
    'dg:stairs': DUN + 'stairs_wide.gltf.glb',
    /* 2026-09-04(이어서) — SAGA WEB.md "F. 소품" 목록의 "초"·"병". 같은
       KayKit 팩에서 받았다 — 키(key)·접시 더미는 세로가 짧고 가로가 길어
       (`normalize()`가 세로 기준으로 키를 맞추면 가로가 배로 부푼다) 이번엔
       건너뛰었다(부록 "안 되면 안 된다고 보고한다") */
    'dg:candle': DUN + 'candle_lit.gltf.glb',
    'dg:bottle': DUN + 'bottle_a_green.gltf.glb',
    /* 2026-09-05 — 바로 위 주석이 "침대도 세로가 짧아 안 맞는다"고 적어
       뒀었는데, 실제 GLB 치수를 재 보니 틀렸다(키·접시와 달리 침대는
       세로가 40~55% — 이미 쓰고 있는 `dg:chest`(50%)와 같은 급이다).
       PolyScan "로그인 필요" 오판과 같은 종류의 실수 — 확인 없이 넘겨짚은
       것. `bed_decorated`(이불·베개 있는 완성형, KayKit 팩 — 맨 프레임보다
       한눈에 침대로 읽힌다)로 SAGA WEB.md "F. 소품"의 "침대"를 채운다 */
    'dg:bed': DUN + 'bed_decorated.gltf.glb',
    /* 2026-09-05 — 같은 목록의 "책상". `dg:table`(긴 상, 행상 전용)과 갈라
       정사각 발판의 `table_small`을 쓴다 — 세로:가로 비율이 1:1:1이라
       `normalize()`와 가장 잘 맞는 모양이다 */
    'dg:desk': DUN + 'table_small.gltf.glb'
  };
  var REG = {};
  function restore() { var k; for (k in DEFAULTS) { if (DEFAULTS.hasOwnProperty(k)) { REG[k] = DEFAULTS[k]; } } return REG; }
  restore();
  function register(key, url) { if (!key) { return REG; } if (url) { REG[key] = url; } else { delete REG[key]; } return REG; }

  function lookup(kind) { return REG[kind] ? { key: kind, url: REG[kind] } : null; }

  /** 표 한 줄이 여럿이면 씨앗 문자열 해시로 하나를 고른다 — 같은 자리는 늘 같은 것 */
  function oneOf(list, seed) {
    if (!list) { return null; }
    if (typeof list === 'string') { return list; }
    if (!list.length) { return null; }
    var s = String(seed || ''), i, h = 0;
    for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return list[h % list.length];
  }
  function urlOf(kind, seed) {
    var h = lookup(kind);
    if (!h) { return null; }
    var v = oneOf(h.url, seed);
    if (v && typeof v === 'object') { return v.key || null; }
    return v;
  }
  function heroRecipe(seed) {
    var h = lookup('hero');
    if (!h) { return null; }
    var v = oneOf(h.url, seed);
    return (v && typeof v === 'object' && v.body) ? v : null;
  }
  function wants(kind, seed) { return GLB_ON() && !!urlOf(kind, seed); }

  /* ── 애니메이션 이름 맞추기 — 사가고와 같은 요령 ─────── */
  var SLOTS = ['idle', 'walk', 'run', 'sprint', 'attack', 'hit', 'dodge', 'death', 'interaction'];
  var WORDS = {
    idle: ['idle', 'stand', 'standing', 'breathe', 'rest', 'wait', 'loop'],
    walk: ['walk', 'walking', 'locomotion', 'move'],
    run: ['run', 'running', 'jog'],
    sprint: ['sprint', 'runfast', 'fastrun', 'dash'],
    attack: ['attack', 'atk', 'slash', 'swing', 'strike', 'punch', 'shoot', 'cast'],
    hit: ['hit', 'hurt', 'damage', 'gethit', 'takedamage', 'impact', 'flinch'],
    dodge: ['dodge', 'roll', 'evade', 'sidestep'],
    death: ['death', 'die', 'dead', 'dying', 'defeat'],
    interaction: ['interact', 'interaction', 'use', 'pick', 'gather', 'talk', 'open', 'action']
  };
  function normName(s) {
    var n = String(s || '');
    if (n.indexOf('|') >= 0) { n = n.split('|').pop(); }
    n = n.replace(/\.\d+$/, '');
    return n.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  function score(slot, name) {
    var ws = WORDS[slot] || [], i, w, best = 0, s;
    for (i = 0; i < ws.length; i++) {
      w = ws[i];
      if (name === w) { s = 100; } else if (name.indexOf(w) === 0) { s = 70; }
      else if (name.indexOf(w) >= 0) { s = 40; } else { continue; }
      s -= i;
      if (s > best) { best = s; }
    }
    return best;
  }
  var FALLBACK = {
    run: ['walk', 'idle'], sprint: ['run', 'walk'], walk: ['run', 'idle'],
    hit: ['idle'], dodge: ['run', 'walk'], attack: ['interaction', 'idle'],
    death: ['hit', 'idle'], interaction: ['idle'], idle: ['walk']
  };
  function mapClips(names) {
    var list = (names || []).map(function (n) { return { raw: n, n: normName(n) }; });
    var pairs = [], si, ci, sc;
    for (si = 0; si < SLOTS.length; si++) {
      for (ci = 0; ci < list.length; ci++) {
        sc = score(SLOTS[si], list[ci].n);
        if (sc > 0) { pairs.push({ slot: SLOTS[si], raw: list[ci].raw, s: sc, si: si, ci: ci }); }
      }
    }
    pairs.sort(function (a, b) { return (b.s - a.s) || (a.si - b.si) || (a.ci - b.ci); });
    var out = {}, taken = {}, i, p;
    for (i = 0; i < pairs.length; i++) {
      p = pairs[i];
      if (out[p.slot] || taken[p.raw]) { continue; }
      out[p.slot] = p.raw; taken[p.raw] = true;
    }
    var alias = {}, j, alt;
    for (i = 0; i < SLOTS.length; i++) {
      if (out[SLOTS[i]]) { continue; }
      alt = FALLBACK[SLOTS[i]] || [];
      for (j = 0; j < alt.length; j++) {
        if (out[alt[j]]) { out[SLOTS[i]] = out[alt[j]]; alias[SLOTS[i]] = alt[j]; break; }
      }
    }
    out.alias = alias;
    return out;
  }

  /* ── 크기 맞추기 — 키 1 로 눕히고 세우는 쪽이 배율(mul)을 준다 ───── */
  function fit(box) {
    var h = (box.maxY - box.minY) || 1;
    var s = 1 / h;
    return { scale: s, dy: -box.minY * s, dx: -((box.minX + box.maxX) / 2) * s, dz: -((box.minZ + box.maxZ) / 2) * s };
  }
  function normalize(obj, mul) {
    var t = three();
    obj.updateMatrixWorld(true);
    var b = new t.Box3().setFromObject(obj);
    var f = fit({ minX: b.min.x, maxX: b.max.x, minY: b.min.y, maxY: b.max.y, minZ: b.min.z, maxZ: b.max.z });
    var m = mul || 1;
    var wrap = new t.Group();
    obj.scale.setScalar(f.scale * m);
    obj.position.set(f.dx * m, f.dy * m, f.dz * m);
    wrap.add(obj);
    return wrap;
  }

  /* ── PBR 을 벗긴다 — 환경맵 없는 이 판의 조명에 그대로 쓰면 새까맣게
   *  선다(사가고가 2026-08-29 에 먼저 밟은 함정, `SAGA-HANDOFF.md` 참고) */
  function delam(root) {
    var t = three();
    root.traverse(function (o) {
      if (!o.isMesh || !o.material) { return; }
      /* **법선이 아예 없는 GLB**(2026-09-04, "House"·"Wood" 새까만 자리로
         잡힌 함정) — PolyScan 실사 스캔 일부는 좌표·UV만 있고 법선을 안
         담아 낸다. 법선이 없으면 Lambert 재질은 빛과 내적할 방향이 없어
         **조명 세기와 무관하게 통째로 새까맣게** 뜬다(재질·텍스처·그림자·
         SSAO 어느 것도 무관 — 줌을 당겨도 안 바뀌는 것이 이 함정의
         특징이다). 지오메트리에서 바로 계산해 채운다 */
      if (!o.geometry.attributes.normal) { o.geometry.computeVertexNormals(); }
      var one = Array.isArray(o.material) ? o.material : [o.material];
      var out = one.map(function (m) {
        if (!m || (!m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial)) { return m; }
        /* vertexColors 를 안 옮기면(정점빛깔로 색을 주고 baseColorFactor 는
           검게 비워 둔 옷감이 있다) 그 자리가 조명과 무관하게 통째로 새까맣게
           뜬다 — 2026-09-03, saga-realm 에서 먼저 밟은 함정 */
        return new t.MeshLambertMaterial({
          color: m.color ? m.color.clone() : new t.Color(0xffffff),
          map: m.map || null, vertexColors: !!m.vertexColors,
          transparent: !!m.transparent, opacity: m.opacity,
          alphaTest: m.alphaTest || 0,
          /* **뒤집힌 면(winding)도 있는 채로 받는다** — 2026-09-05, poly.pizza
             'Pond'(CC-BY)에서 물 표면 사각형 하나가 통째로 반대로 감겨 있어
             `side: m.side`(기본 FrontSide) 그대로 두면 이 각도에서 컬링돼
             안 보였다(지오메트리는 와이어프레임으로 확인하면 분명히 있다 —
             단면 컬링만의 문제). 실사 스캔·저다각형 팩 가릴 것 없이 이런
             면이 또 나올 수 있어 **항상 DoubleSide로 받는다** — 그리기 비용은
             미미하고, 맞는 면이면 결과가 똑같다 */
          side: t.DoubleSide
        });
      });
      o.material = Array.isArray(o.material) ? out : out[0];
    });
  }

  var cache = {};
  function loader() {
    var t = three();
    if (!t || !t.GLTFLoader) { return null; }
    if (!loader.it) { loader.it = new t.GLTFLoader(); }
    return loader.it;
  }
  function firstSkinned(obj) {
    var found = null;
    obj.traverse(function (o) { if (!found && o.isSkinnedMesh) { found = o; } });
    return found;
  }
  function cloneScene(gltf) {
    var t = three();
    if (t.SkeletonUtils && t.SkeletonUtils.clone) { return t.SkeletonUtils.clone(gltf.scene); }
    return gltf.scene.clone(true);
  }
  function acquire(url, done) {
    var c = cache[url];
    if (c && c.state === 'ok') { done(c); return; }
    if (c && c.state === 'fail') { done(null); return; }
    if (c) { c.waiting.push(done); return; }
    var ld = loader();
    if (!ld) { cache[url] = { state: 'fail', waiting: [] }; done(null); return; }
    c = cache[url] = { state: 'load', waiting: [done] };
    ld.load(url, function (gltf) {
      c.state = 'ok'; c.gltf = gltf;
      delam(gltf.scene);
      c.clips = gltf.animations || [];
      c.map = mapClips(c.clips.map(function (a) { return a.name; }));
      flush(c, c);
    }, null, function () { c.state = 'fail'; flush(c, null); });
  }
  function flush(c, arg) { var w = c.waiting; c.waiting = []; for (var i = 0; i < w.length; i++) { w[i](arg); } }

  /** 이 재질을 hex 로 물들인다(흰 옷에 곱하는 값이라 너무 어두우면 안 된다) — 없으면 안 물들인다 */
  var tintCache = {};
  function applyTint(model, hex) {
    var t = three();
    if (!hex || !t) { return model; }
    var tc = new t.Color(hex);
    model.traverse(function (o) {
      if (!o.isMesh || !o.material) { return; }
      var src = Array.isArray(o.material) ? o.material[0] : o.material;
      var key = (src.uuid || '') + '|' + hex;
      if (!tintCache[key]) {
        var m = src.clone();
        m.color = new t.Color(src.color ? src.color.getHex() : 0xffffff).multiply(tc);
        tintCache[key] = m;
      }
      o.material = tintCache[key];
    });
    return model;
  }

  /** 몸 하나 — 몸 위에 옷·머리를 얹어 한 뼈대에 묶는다(사가고와 같은 요령,
   *  세 파일이 뼈 이름·순서까지 완전히 같아 그냥 bind() 하면 된다) */
  function assembleHero(parts, mul, tintHex) {
    var bodyScene = cloneScene(parts.body.gltf);
    var master = firstSkinned(bodyScene);
    if (!master || !master.skeleton) { throw new Error('몸에 스켈레톤이 없다'); }
    var skeleton = master.skeleton;
    [parts.outfit, parts.hair].forEach(function (p) {
      if (!p || !p.gltf) { return; }
      var scene = cloneScene(p.gltf), meshes = [];
      scene.traverse(function (o) { if (o.isSkinnedMesh) { meshes.push(o); } });
      meshes.forEach(function (m) { m.bind(skeleton, m.bindMatrix); bodyScene.add(m); });
    });
    var model = normalize(bodyScene, mul);
    applyTint(model, tintHex);
    return model;
  }

  /**
   * 인물 하나 — 몸+옷+머리+몸짓을 한꺼번에 받아 온다.
   * @param seed      표에서 조합을 고를 씨앗(사람 id 등)
   * @param mul       세우는 키(로직 단위)
   * @param tintHex   물들일 색(없으면 원래 옷 빛깔 그대로)
   * @param makeShape 도형을 만드는 함수 — GLB 오기 전까지, 실패하면 계속 이것
   */
  function buildHero(seed, mul, tintHex, makeShape) {
    var t = three();
    var rec = heroRecipe(seed);
    var shell = new t.Group();
    var shape = makeShape ? makeShape() : null;
    if (shape) { shell.add(shape); }
    shell.userData.assetState = 'shape';
    if (!GLB_ON() || !rec) { return shell; }

    var parts = {}, pending = 4;
    function onOne() { pending--; if (pending === 0) { assemble(); } }
    acquire(rec.body, function (c) { parts.body = c; onOne(); });
    /* outfit·hair 는 조합형(옛 Quaternius) 레시피에만 있다 — QRPG 통짜 스킨은
       둘 다 없으니 헛수고로 받으러 가지 않고 바로 다음 칸으로 넘어간다 */
    if (rec.outfit) { acquire(rec.outfit, function (c) { parts.outfit = c; onOne(); }); } else { onOne(); }
    if (rec.hair) { acquire(rec.hair, function (c) { parts.hair = c; onOne(); }); } else { onOne(); }
    acquire(rec.anim || ANIM_SRC, function (c) { parts.anim = c; onOne(); });

    function assemble() {
      if (!parts.body) { shell.userData.assetState = 'fail'; return; }
      var model;
      try { model = assembleHero(parts, mul, tintHex); }
      catch (e) { shell.userData.assetState = 'fail'; return; }
      while (shell.children.length) { shell.remove(shell.children[0]); }
      shell.add(model);
      shell.userData.assetState = 'glb';
      var animC = parts.anim;
      if (animC && animC.clips && animC.clips.length) {
        var mx = new t.AnimationMixer(model);
        var acts = {}, i;
        for (i = 0; i < animC.clips.length; i++) { acts[animC.clips[i].name] = mx.clipAction(animC.clips[i]); }
        shell.userData.mixer = mx; shell.userData.actions = acts;
        shell.userData.clipMap = mapClips(animC.clips.map(function (a) { return a.name; }));
      }
    }
    return shell;
  }

  /** 사람이 아닌 홑짜리 GLB(짐승·나무·바위) 하나 — 부위 변형이 없으니 그대로 눕혀 세운다 */
  function build(kind, seed, mul, tintHex, makeShape) {
    var t = three();
    var shell = new t.Group();
    var shape = makeShape ? makeShape() : null;
    if (shape) { shell.add(shape); }
    shell.userData.assetState = 'shape';
    if (!wants(kind, seed)) { return shell; }
    var url = urlOf(kind, seed);

    acquire(url, function (c) {
      if (!c) { shell.userData.assetState = 'fail'; return; }
      var model;
      try {
        model = cloneScene(c.gltf);
        model = normalize(model, mul);
        applyTint(model, tintHex);
      } catch (e) { shell.userData.assetState = 'fail'; return; }
      while (shell.children.length) { shell.remove(shell.children[0]); }
      shell.add(model);
      shell.userData.assetState = 'glb';
      if (c.clips && c.clips.length) {
        var mx = new t.AnimationMixer(model);
        var acts = {}, i;
        for (i = 0; i < c.clips.length; i++) { acts[c.clips[i].name] = mx.clipAction(c.clips[i]); }
        shell.userData.mixer = mx; shell.userData.actions = acts; shell.userData.clipMap = c.map;
      }
    });
    return shell;
  }

  /** 한 프레임 — GLB(뼈대 애니메이션)면 여기서 처리하고 true, 아니면 false */
  function step(node, o) {
    if (!node || !node.userData || !node.userData.mixer) { return false; }
    var u = node.userData;
    var want = (o && o.anim) || ((o && o.walking) ? 'walk' : 'idle');
    play(node, want);
    var t = (o && o.t) || 0;
    var dt = u.lastT === undefined ? 0 : Math.max(0, Math.min(0.25, t - u.lastT));
    u.lastT = t;
    u.mixer.update(dt);
    return true;
  }
  function play(node, slot) {
    var u = node.userData;
    if (!u.mixer || u.anim === slot) { return false; }
    var name = u.clipMap && u.clipMap[slot];
    var next = name && u.actions[name];
    if (!next) { return false; }
    var prev = u.anim && u.clipMap[u.anim] && u.actions[u.clipMap[u.anim]];
    next.reset().play();
    if (prev && prev !== next) { prev.crossFadeTo(next, 0.2, false); }
    u.anim = slot;
    return true;
  }

  /** 맞으면 번쩍이는 재질들 — 배우가 GLB 든 상자든, 지금 보이는 모든 메시의
   *  재질을 사본으로 떼어 온다(사본이라야 배우끼리 안 부딪힌다) */
  function ownAllMat(root) {
    var out = [];
    if (!root) { return out; }
    root.traverse(function (o) {
      if (!o.isMesh || !o.material) { return; }
      var m = Array.isArray(o.material) ? o.material[0].clone() : o.material.clone();
      o.material = m;
      if (m.emissive) { out.push(m); }
    });
    return out;
  }
  function flashAllMat(mats, hurt, span) {
    if (!mats || !mats.length) { return; }
    var F = global.DG.fx3d;
    var k = F ? F.flashOf(hurt, span) : 0;
    for (var i = 0; i < mats.length; i++) { mats[i].emissive.setRGB(k, k * 0.8, k * 0.66); }
  }

  function stats() {
    var urls = Object.keys(cache), o = { registered: Object.keys(REG).length, loaded: 0, failed: 0 };
    for (var i = 0; i < urls.length; i++) {
      if (cache[urls[i]].state === 'ok') { o.loaded++; }
      if (cache[urls[i]].state === 'fail') { o.failed++; }
    }
    o.loader = !!loader();
    return o;
  }

  global.DG = global.DG || {};
  global.DG.asset3d = {
    REG: REG, register: register, lookup: lookup, urlOf: urlOf, wants: wants, oneOf: oneOf,
    normName: normName, score: score, mapClips: mapClips, SLOTS: SLOTS, fit: fit,
    ready: function () { return !!three(); }, hasLoader: function () { return !!loader(); },
    DEFAULTS: DEFAULTS, restore: restore, heroRecipe: heroRecipe, ANIM_SRC: ANIM_SRC,
    build: build, buildHero: buildHero, step: step, play: play,
    ownAllMat: ownAllMat, flashAllMat: flashAllMat,
    tuned: tuned, set: set, stats: stats,
    clear: function () { var k; for (k in REG) { if (Object.prototype.hasOwnProperty.call(REG, k)) { delete REG[k]; } } cache = {}; return REG; }
  };
})(window);
