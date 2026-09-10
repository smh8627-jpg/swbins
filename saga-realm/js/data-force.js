/**
 * 삼국지 — 세력(勢力)과 무장(武將)
 * ---------------------------------------------------------------
 * **`data.js` 를 건드리지 않는다.** 그 파일은 다섯 판이 나눠 가진 복사본이라
 * 여기서 한 줄만 늘려도 다섯 곳을 맞춰야 한다(인계 문서의 못이다).
 * 그래서 삼국지 무장은 이 파일이 따로 들고, `officer.js` 가 둘을 **합쳐서** 본다.
 *
 *   data.js 의 인물 105  — 삼국지 22 · 한국사 26 · 일본사 20 · 세계사 37
 *                        (2026-09-10 HEROES 가명화 후속으로 늘었다 — 더 늘 수 있으니
 *                        코드에서는 이 수를 못 박지 않는다)
 *   이 파일의 무장 54     — 삼국지 군주와 그 부하들
 *
 * 삼국지 사람이 아닌 인물(한국사·일본사·세계사, data.js 쪽 83)은 **재야(在野)** 다.
 * 도시에서 수색하면 나온다 — 이 판이 '역사 전체' 를 다루는 판이라는 뜻이기도 하다.
 *
 * 무장 기록은 data.js 의 인물과 **같은 모양**이어야 한다.
 * sprite.portrait('hero', ref) 가 rarity 를 읽고, hero.stats(id) 가 stats 를 읽는다.
 *
 *   stats  무력(전투) · 지력(내정·계략) · 통솔(치안·부대)
 *          이 판은 정치·매력을 따로 두지 않는다 — 세 자질로 태수 적성을 이미 가른다
 */
(function (global) {
  'use strict';

  function O(id, name, hanja, rarity, trait, might, wisdom, command, emoji, quote) {
    return {
      id: id, name: name, hanja: hanja, era: '삼국지', faction: '삼국지',
      rarity: rarity, trait: trait, emoji: emoji, quote: quote,
      stats: { might: might, wisdom: wisdom, command: command }
    };
  }

  /* ── 무장 54 (data.js 에 없는 사람만) ───────────────────── */
  var OFFICERS = [
    /* 조조군 */
    O('rf_xiahouyuan', '하후연', '夏侯淵', 4, 'might',  91, 62, 86, '🏇', '사흘에 오백 리, 엿새에 천 리요.'),
    O('rf_caoren',     '조인',   '曹仁',   4, 'command',88, 68, 91, '🧱', '성을 지키는 일이라면 제게 맡기십시오.'),
    O('rf_caohong',    '조홍',   '曹洪',   3, 'might',  82, 50, 74, '🐴', '천하에 저는 없어도 되나 공은 없어선 안 됩니다.'),
    O('rf_dianwei',    '전위',   '典韋',   4, 'might',  96, 34, 70, '🪓', '주공 앞을 지나려면 저를 넘어야 하오.'),
    O('rf_xuchu',      '허저',   '許褚',   4, 'might',  96, 36, 72, '🐯', '싸움이라면 벗고도 하지요.'),
    O('rf_yujin',      '우금',   '于禁',   3, 'command',80, 66, 86, '🎌', '군령은 무겁고 사정은 가볍습니다.'),
    O('rf_yuejin',     '악진',   '樂進',   3, 'might',  85, 55, 78, '⚡', '선봉은 언제나 제 자리입니다.'),
    O('rf_lidian',     '이전',   '李典',   3, 'wisdom', 76, 78, 80, '📗', '사사로운 원한으로 나라 일을 그르치겠습니까.'),
    O('rf_chengyu',    '정욱',   '程昱',   3, 'wisdom', 48, 89, 74, '🕯️', '험한 말도 해야 할 때는 합니다.'),
    O('rf_guojia',     '곽가',   '郭嘉',   5, 'wisdom', 32, 98, 70, '🍷', '열 가지로 이기고 열 가지로 집니다 — 들어 보시겠습니까.'),

    /* 원소군 */
    O('rf_yuanshao',   '원소',   '袁紹',   4, 'command',73, 74, 88, '🏆', '사대(四代)에 삼공을 낸 집안이오.'),
    O('rf_yanliang',   '안량',   '顔良',   4, 'might',  92, 40, 76, '⚔️', '하북에 나만 한 창이 또 있겠는가.'),
    O('rf_wenchou',    '문추',   '文醜',   4, 'might',  91, 38, 74, '🗡️', '안량의 원수를 갚겠다!'),
    O('rf_jushou',     '저수',   '沮授',   4, 'wisdom', 40, 93, 82, '🧭', '천자를 받들면 명분이 우리에게 옵니다.'),
    O('rf_tianfeng',   '전풍',   '田豊',   4, 'wisdom', 35, 94, 68, '⛓️', '옳은 말을 하고 옥에 갇히는 것이 신하의 팔자입니다.'),
    O('rf_shenpei',    '심배',   '審配',   3, 'command',62, 82, 84, '🏯', '성이 무너져도 북쪽을 보고 죽겠소.'),
    O('rf_zhanghe',    '장합',   '張郃',   5, 'command',89, 82, 91, '🌀', '지형을 읽는 것이 곧 병법입니다.'),
    O('rf_gaolan',     '고람',   '高覽',   3, 'might',  84, 55, 76, '🛡️', '하북 사정주(四庭柱)의 하나요.'),

    /* 공손찬군 */
    O('rf_gongsunzan', '공손찬', '公孫瓚', 3, 'might',  84, 60, 82, '🐎', '백마의천(白馬義從)을 아느냐.'),
    O('rf_yangang',    '엄강',   '嚴綱',   2, 'might',  72, 42, 66, '🏳️', '선봉은 백마가 맡습니다.'),

    /* 공융군 */
    O('rf_kongrong',   '공융',   '孔融',   3, 'wisdom', 24, 87, 58, '🍐', '자리에 손님이 늘 가득하고 잔이 비지 않으면 족하오.'),
    O('rf_wuanguo',    '무안국', '武安國', 2, 'might',  74, 38, 60, '🔨', '철퇴로 여포를 맞겠소!'),

    /* 유비군 */
    O('rf_mizhu',      '미축',   '麋竺',   3, 'wisdom', 26, 84, 62, '💰', '집안의 재물을 다 내어 군자금에 보태겠습니다.'),
    O('rf_jianyong',   '간옹',   '簡雍',   2, 'wisdom', 30, 80, 55, '🗣️', '말로 푸는 일이라면 제가 가지요.'),

    /* 여포군 */
    O('rf_chengong',   '진궁',   '陳宮',   4, 'wisdom', 45, 92, 80, '🕳️', '제 계책을 들었다면 이리 되지 않았습니다.'),
    O('rf_gaoshun',    '고순',   '高順',   4, 'command',87, 66, 90, '🪖', '함진영(陷陣營)은 물러선 적이 없습니다.'),

    /* 원술군 */
    O('rf_yuanshu',    '원술',   '袁術',   3, 'command',60, 58, 72, '🍯', '옥새가 내게 왔으니 하늘의 뜻이 아니겠는가.'),
    O('rf_jiling',     '기령',   '紀靈',   3, 'might',  85, 52, 78, '🌙', '삼첨도(三尖刀)의 무게를 견뎌 보아라.'),
    O('rf_yanghong',   '양홍',   '楊弘',   2, 'wisdom', 30, 74, 58, '📜', '창고를 열어 인심을 사시지요.'),

    /* 손책군 */
    O('rf_sunce',      '손책',   '孫策',   5, 'might',  93, 72, 92, '🐅', '강동은 젊은 손으로 여는 것이오.'),
    O('rf_chengpu',    '정보',   '程普',   4, 'command',84, 72, 88, '🔱', '삼대를 섬긴 늙은 신하올시다.'),
    O('rf_huanggai',   '황개',   '黃蓋', 4, 'command', 85, 68, 86, '🔥', '이 늙은 몸을 태워서라도 이기겠소.'),
    O('rf_handang',    '한당',   '韓當',   3, 'might',  83, 58, 80, '🏹', '활이든 창이든 배 위에서라면 지지 않소.'),
    O('rf_zhoutai',    '주태',   '周泰',   4, 'might',  89, 48, 78, '🩸', '이 흉터 하나하나가 주공을 지킨 자립니다.'),

    /* 유표군 */
    O('rf_liubiao',    '유표',   '劉表',   3, 'wisdom', 45, 80, 76, '🌾', '형주를 조용히 지키는 것도 공(功)이오.'),
    O('rf_caimao',     '채모',   '蔡瑁',   3, 'command',70, 72, 82, '⛵', '수군은 형주의 자랑입니다.'),
    O('rf_kuailiang',  '괴량',   '蒯良',   3, 'wisdom', 28, 88, 70, '🪶', '형주의 호족을 달래는 일부터 하십시오.'),
    O('rf_huangzu',    '황조',   '黃祖',   2, 'command',70, 50, 72, '🏹', '강하는 내가 지킨다.'),
    O('rf_wenpin',     '문빙',   '文聘',   3, 'command',82, 66, 85, '🚩', '북쪽 국경은 제가 맡겠습니다.'),

    /* 이각군 (동탁 잔당) */
    O('rf_lijue',      '이각',   '李傕',   3, 'might',  84, 56, 76, '🔥', '장안은 우리 것이다.'),
    O('rf_guosi',      '곽사',   '郭汜',   3, 'might',  82, 52, 74, '🐺', '천자를 끼고 있으면 누가 뭐라 하겠나.'),
    O('rf_zhangji',    '장제',   '張濟',   2, 'might',  76, 50, 70, '🛖', '군량만 있으면 어디든 갑니다.'),
    O('rf_jiaxu',      '가후',   '賈詡',   5, 'wisdom', 40, 99, 78, '🦊', '살아남는 계책만 말씀드립니다.'),

    /* 마등군 */
    O('rf_mateng',     '마등',   '馬騰',   3, 'might',  86, 60, 82, '🐫', '서량의 말은 바람을 탄다.'),
    O('rf_pangde',     '방덕',   '龐德',   4, 'might',  92, 60, 84, '⚰️', '관을 지고 나왔으니 살아 돌아갈 뜻이 없소.'),
    O('rf_hansui',     '한수',   '韓遂',   3, 'command',74, 74, 84, '🤝', '동맹은 오래갈 때만 동맹이오.'),

    /* 장로군 */
    O('rf_zhanglu',    '장로',   '張魯',   3, 'wisdom', 50, 78, 74, '☯️', '오두미(五斗米)면 병도 고치고 나라도 다스리오.'),
    O('rf_yangren',    '양임',   '楊任',   2, 'might',  76, 52, 70, '⛰️', '한중의 산길은 제가 압니다.'),
    O('rf_yangsong',   '양송',   '楊松',   1, 'wisdom', 20, 62, 30, '🪙', '금이면 열리지 않는 문이 없지요.'),

    /* 유장군 */
    O('rf_liuzhang',   '유장',   '劉璋',   2, 'wisdom', 30, 62, 55, '🍚', '백성을 싸움에 몰아넣고 싶지 않소.'),
    O('rf_zhangren',   '장임',   '張任',   4, 'command',87, 74, 88, '🏹', '충신은 두 주인을 섬기지 않소.'),
    O('rf_yanyan',     '엄안',   '嚴顔',   4, 'might',  86, 68, 84, '🧓', '목을 벨 장수는 있어도 항복할 장수는 없다.'),
    O('rf_fazheng',    '법정',   '法正',   5, 'wisdom', 42, 95, 76, '🗺️', '촉으로 드는 길을 그려 드리지요.'),
    O('rf_wuyi',       '오의',   '吳懿',   3, 'command',80, 66, 82, '🪧', '익주의 병사는 아직 쓸 만합니다.')
  ];

  /**
   * 한국 지역(2026-09-03 확장, `data-city.js` 참고) 수비 무장 9인.
   * **`OFFICERS`/`roster()`와 분리한다** — `roster(forceId)`는 `FORCES`에 실린
   * 사람만 돌려주므로 여기 있는 이름은 어느 중국 세력에도 자동 배분되지 않는다.
   * 세력 없이 `force:null`로 해당 성에 바로 서는 수비대다(재야처럼 수색해야
   * 보이는 게 아니라 처음부터 보인다 — `rtk.js`의 `seedNeutral()` 참고).
   *
   * 루트 `CLAUDE.md` 이름 정책(확장 지역 실존/역사 인물은 가명으로 임의
   * 정한다)에 따라 **실제 역사 인물이 아닌 지어낸 이름**을 쓴다 — 성 이름
   * (양평·국내성 등)은 실제 지명이라 정책 대상이 아니다.
   */
  var KOREA_OFFICERS = [
    { id: 'kr2_pasodan',   name: '파소단', hanja: '波蘇丹', era: '한국(가상)', faction: '양평',
      rarity: 4, trait: 'might', emoji: '⚔️', quote: '여기가 뚫리면 그다음은 없다.',
      stats: { might: 80, wisdom: 50, command: 75 } },
    { id: 'kr2_dokgaru',   name: '독가루', hanja: '禿加婁', era: '한국(가상)', faction: '국내성',
      rarity: 4, trait: 'might', emoji: '🛡️', quote: '산성은 무너지지 않는다. 오르는 자가 지칠 뿐이다.',
      stats: { might: 88, wisdom: 55, command: 82 } },
    { id: 'kr2_sogaram',   name: '소가람', hanja: '蘇加藍', era: '한국(가상)', faction: '국내성',
      rarity: 3, trait: 'wisdom', emoji: '📿', quote: '성 안에서는 곳간이 곧 무기다.',
      stats: { might: 40, wisdom: 90, command: 70 } },
    { id: 'kr2_mokrihae',  name: '목리해', hanja: '木利海', era: '한국(가상)', faction: '낙랑',
      rarity: 4, trait: 'command', emoji: '🏺', quote: '저자를 지키는 것도 싸움이다.',
      stats: { might: 60, wisdom: 65, command: 84 } },
    { id: 'kr2_ajinsa',    name: '아진사', hanja: '阿珍思', era: '한국(가상)', faction: '대방',
      rarity: 3, trait: 'wisdom', emoji: '🗺️', quote: '경계란 두려워할 것이 아니라 살필 것이다.',
      stats: { might: 45, wisdom: 85, command: 68 } },
    { id: 'kr2_yeonuru',   name: '연우루', hanja: '延于婁', era: '한국(가상)', faction: '위례성',
      rarity: 4, trait: 'wisdom', emoji: '📜', quote: '한강은 누구의 편도 아니다 — 다스리는 자의 편일 뿐.',
      stats: { might: 60, wisdom: 90, command: 78 } },
    { id: 'kr2_jimasol',   name: '지마솔', hanja: '支麻率', era: '한국(가상)', faction: '위례성',
      rarity: 4, trait: 'might', emoji: '🏹', quote: '강을 낀 성은 활로 지킨다.',
      stats: { might: 86, wisdom: 48, command: 80 } },
    { id: 'kr2_umorin',    name: '우모린', hanja: '于牟隣', era: '한국(가상)', faction: '금성',
      rarity: 4, trait: 'command', emoji: '🗻', quote: '산이 세 겹이면 군사는 반으로 줄어도 된다.',
      stats: { might: 82, wisdom: 58, command: 88 } },
    { id: 'kr2_seolharan', name: '설하란', hanja: '薛河蘭', era: '한국(가상)', faction: '김해',
      rarity: 3, trait: 'command', emoji: '⛵', quote: '바다는 넓어서 누구든 받아준다 — 지키는 자만 있다면.',
      stats: { might: 65, wisdom: 60, command: 80 } }
  ];

  /** 성 id → 그 성의 수비 무장 id 목록 (rtk.js seedNeutral() 이 쓴다) */
  var KOREA_GARRISON = {
    yangping: ['kr2_pasodan'],
    guknae: ['kr2_dokgaru', 'kr2_sogaram'],
    nakrang: ['kr2_mokrihae'],
    daebang: ['kr2_ajinsa'],
    wirye: ['kr2_yeonuru', 'kr2_jimasol'],
    geumseong: ['kr2_umorin'],
    gimhae: ['kr2_seolharan']
  };

  /**
   * 일본 지역(2026-09-09 확장, `data-city.js` 참고) 수비 무장 9인.
   * KOREA_OFFICERS 와 같은 결 — `FORCES`/`roster()` 에 안 실려 어느 세력에도
   * 자동 배분되지 않고, `force:null` 로 해당 성에 바로 선다.
   *
   * 루트 `CLAUDE.md` 이름 정책에 따라 **실제 역사·설화 인물이 아닌 지어낸
   * 이름**을 쓴다(히미코·도요타마 같은 실제 야마토·일본 신화·역사 속 이름을
   * 그대로/비슷하게 쓰지 않는다) — 성 이름(축자·야마토 등)은 실제 지명이라
   * 정책 대상이 아니다.
   */
  var JAPAN_OFFICERS = [
    { id: 'jp_umihiko',  name: '우미히코', hanja: '海彦', era: '일본(가상)', faction: '대마도',
      rarity: 3, trait: 'might', emoji: '🌊', quote: '섬은 작아도 물길을 아는 자가 지킨다.',
      stats: { might: 78, wisdom: 42, command: 70 } },
    { id: 'jp_shioji',   name: '시오지',   hanja: '潮路', era: '일본(가상)', faction: '일기도',
      rarity: 3, trait: 'wisdom', emoji: '🐚', quote: '다음 섬이 보이지 않아도 물때는 안다.',
      stats: { might: 40, wisdom: 80, command: 60 } },
    { id: 'jp_taketsumi',name: '다케쓰미', hanja: '武積', era: '일본(가상)', faction: '축자',
      rarity: 4, trait: 'command', emoji: '⚓', quote: '대륙에서 오는 것은 다 이 나루를 거친다.',
      stats: { might: 82, wisdom: 55, command: 88 } },
    { id: 'jp_himetsu',  name: '히메쓰',   hanja: '姫津', era: '일본(가상)', faction: '축자',
      rarity: 3, trait: 'wisdom', emoji: '📿', quote: '저자가 흔들리면 나루도 흔들립니다.',
      stats: { might: 38, wisdom: 84, command: 65 } },
    { id: 'jp_hikoyama', name: '히코야마', hanja: '彦山', era: '일본(가상)', faction: '일향',
      rarity: 4, trait: 'might', emoji: '🏹', quote: '산에서 나고 자란 활을 당해낼 자 없다.',
      stats: { might: 86, wisdom: 45, command: 74 } },
    { id: 'jp_kazenari', name: '가제나리', hanja: '風成', era: '일본(가상)', faction: '출운',
      rarity: 3, trait: 'wisdom', emoji: '⛩️', quote: '바람이 이는 쪽에 언제나 답이 있다.',
      stats: { might: 42, wisdom: 82, command: 68 } },
    { id: 'jp_asahime',  name: '아사히메', hanja: '旭姫', era: '일본(가상)', faction: '길비',
      rarity: 4, trait: 'command', emoji: '🌾', quote: '곡식이 마르지 않는 한 이 땅은 지지 않습니다.',
      stats: { might: 58, wisdom: 68, command: 84 } },
    { id: 'jp_wakahiko', name: '와카히코', hanja: '若彦', era: '일본(가상)', faction: '야마토',
      rarity: 4, trait: 'command', emoji: '🗡️', quote: '분지 안쪽까지 들어온 적은 아직 없다.',
      stats: { might: 84, wisdom: 58, command: 90 } },
    { id: 'jp_tamakiri', name: '다마키리', hanja: '玉切', era: '일본(가상)', faction: '야마토',
      rarity: 3, trait: 'wisdom', emoji: '🔮', quote: '중심을 지키는 것도 변경을 지키는 것만큼 무겁다.',
      stats: { might: 40, wisdom: 86, command: 70 } }
  ];

  /** 성 id → 그 성의 수비 무장 id 목록 (rtk.js seedNeutral() 이 쓴다) */
  var JAPAN_GARRISON = {
    tsushima: ['jp_umihiko'],
    iki: ['jp_shioji'],
    chikushi: ['jp_taketsumi', 'jp_himetsu'],
    hyuga: ['jp_hikoyama'],
    izumo: ['jp_kazenari'],
    kibi: ['jp_asahime'],
    yamato: ['jp_wakahiko', 'jp_tamakiri']
  };

  /**
   * 교주(交州, 2026-09-09 확장 셋째, `data-city.js` 참고) 수비 무장 9인.
   * KOREA_OFFICERS·JAPAN_OFFICERS 와 같은 결 — `FORCES`/`roster()` 에 안 실려
   * 어느 세력에도 자동 배분되지 않고, `force:null` 로 해당 성에 바로 선다.
   *
   * 루트 `CLAUDE.md` 이름 정책에 따라 **실제 역사 인물이 아닌 지어낸 이름**을
   * 쓴다(이 시대 교주를 실제로 다스린 사군(士郡) 일가의 이름을 그대로/비슷하게
   * 쓰지 않는다) — 성 이름(교지·일남 등)은 실제 지명이라 정책 대상이 아니다.
   */
  var JIAOZHOU_OFFICERS = [
    { id: 'jiao_luyan',   name: '노언',   hanja: '盧彦', era: '교주(가상)', faction: '남해',
      rarity: 4, trait: 'command', emoji: '⚓', quote: '강남에서 온 배는 다 이 나루를 거칩니다.',
      stats: { might: 78, wisdom: 58, command: 86 } },
    { id: 'jiao_hoangmi', name: '황미',   hanja: '黃眉', era: '교주(가상)', faction: '남해',
      rarity: 3, trait: 'wisdom', emoji: '📜', quote: '영남의 물목은 제가 압니다.',
      stats: { might: 38, wisdom: 82, command: 62 } },
    { id: 'jiao_madang',  name: '마당',   hanja: '馬棠', era: '교주(가상)', faction: '창오',
      rarity: 3, trait: 'might', emoji: '🐘', quote: '코끼리가 지나가면 길이 저절로 열립니다.',
      stats: { might: 82, wisdom: 44, command: 72 } },
    { id: 'jiao_dinggo',  name: '정고',   hanja: '丁高', era: '교주(가상)', faction: '울림',
      rarity: 3, trait: 'might', emoji: '🏹', quote: '숲에서는 활을 쏘는 자가 임자입니다.',
      stats: { might: 80, wisdom: 40, command: 68 } },
    { id: 'jiao_botran',  name: '보진',   hanja: '寶陳', era: '교주(가상)', faction: '합포',
      rarity: 3, trait: 'wisdom', emoji: '🦪', quote: '진주보다 귀한 건 그걸 지킬 배입니다.',
      stats: { might: 42, wisdom: 80, command: 66 } },
    { id: 'jiao_riquan',  name: '이권',   hanja: '李權', era: '교주(가상)', faction: '교지',
      rarity: 4, trait: 'command', emoji: '🐉', quote: '삼각주를 쥔 자가 교주를 쥡니다.',
      stats: { might: 76, wisdom: 62, command: 88 } },
    { id: 'jiao_jinja',   name: '진자',   hanja: '陳梓', era: '교주(가상)', faction: '교지',
      rarity: 3, trait: 'wisdom', emoji: '🌾', quote: '벼가 두 번 여무는 땅은 굶지 않습니다.',
      stats: { might: 36, wisdom: 84, command: 64 } },
    { id: 'jiao_muya',    name: '무아',   hanja: '武牙', era: '교주(가상)', faction: '구진',
      rarity: 3, trait: 'might', emoji: '🗡️', quote: '남쪽 끝까지 밀려도 물러설 곳은 없습니다.',
      stats: { might: 79, wisdom: 42, command: 70 } },
    { id: 'jiao_banrok',  name: '반록',   hanja: '潘祿', era: '교주(가상)', faction: '일남',
      rarity: 2, trait: 'command', emoji: '🚩', quote: '한(漢)의 이름이 여기서 끝나지 않게 하겠습니다.',
      stats: { might: 62, wisdom: 50, command: 74 } }
  ];

  /** 성 id → 그 성의 수비 무장 id 목록 (rtk.js seedNeutral() 이 쓴다) */
  var JIAOZHOU_GARRISON = {
    nanhai: ['jiao_luyan', 'jiao_hoangmi'],
    cangwu: ['jiao_madang'],
    yulin: ['jiao_dinggo'],
    hepu: ['jiao_botran'],
    jiaozhi: ['jiao_riquan', 'jiao_jinja'],
    jiuzhen: ['jiao_muya'],
    rinan: ['jiao_banrok']
  };

  /**
   * 서역(西域, 2026-09-09 확장 넷째, `data-city.js` 참고) 수비 무장 9인.
   * KOREA_OFFICERS·JAPAN_OFFICERS·JIAOZHOU_OFFICERS 와 같은 결 —
   * `FORCES`/`roster()` 에 안 실려 어느 세력에도 자동 배분되지 않고,
   * `force:null` 로 해당 성에 바로 선다.
   *
   * 루트 `CLAUDE.md` 이름 정책에 따라 **실제 역사 인물이 아닌 지어낸 이름**을
   * 쓴다(이 시대 오아시스 나라들을 실제로 다스린 왕들의 이름을 그대로/비슷하게
   * 쓰지 않는다) — 성 이름(구자·소륵 등)은 실제 지명이라 정책 대상이 아니다.
   */
  var XIYU_OFFICERS = [
    { id: 'xiyu_talban', name: '탈반', hanja: '脫槃', era: '서역(가상)', faction: '돈황',
      rarity: 3, trait: 'might', emoji: '🏜️', quote: '사막을 아는 자만이 사막에서 이깁니다.',
      stats: { might: 80, wisdom: 46, command: 72 } },
    { id: 'xiyu_yeoje',  name: '여저', hanja: '黎且', era: '서역(가상)', faction: '돈황',
      rarity: 3, trait: 'wisdom', emoji: '🐫', quote: '대상(隊商)의 길목을 쥔 자가 금을 쥡니다.',
      stats: { might: 40, wisdom: 80, command: 64 } },
    { id: 'xiyu_mokjil', name: '목질', hanja: '木質', era: '서역(가상)', faction: '누란',
      rarity: 3, trait: 'might', emoji: '🧂', quote: '소금 호수 곁에서는 물러설 곳이 없습니다.',
      stats: { might: 78, wisdom: 42, command: 68 } },
    { id: 'xiyu_dansu',  name: '단수', hanja: '檀須', era: '서역(가상)', faction: '언기',
      rarity: 3, trait: 'wisdom', emoji: '🎶', quote: '북쪽 길의 오아시스는 노래로 손님을 붙듭니다.',
      stats: { might: 38, wisdom: 82, command: 62 } },
    { id: 'xiyu_gumo',   name: '구모', hanja: '龜牟', era: '서역(가상)', faction: '구자',
      rarity: 4, trait: 'command', emoji: '🏺', quote: '악사도 상인도 다 이 나라를 거칩니다.',
      stats: { might: 74, wisdom: 60, command: 86 } },
    { id: 'xiyu_ochi',   name: '오지', hanja: '烏支', era: '서역(가상)', faction: '우전',
      rarity: 3, trait: 'wisdom', emoji: '💎', quote: '강바닥의 옥은 캐는 자가 임자입니다.',
      stats: { might: 42, wisdom: 84, command: 66 } },
    { id: 'xiyu_sarim',  name: '사림', hanja: '莎林', era: '서역(가상)', faction: '소륵',
      rarity: 4, trait: 'command', emoji: '🗺️', quote: '두 길이 다시 만나는 곳을 지키는 것이 제 일입니다.',
      stats: { might: 76, wisdom: 58, command: 88 } },
    { id: 'xiyu_banwol', name: '반월', hanja: '半月', era: '서역(가상)', faction: '소륵',
      rarity: 3, trait: 'wisdom', emoji: '🌙', quote: '파미르 너머 소식도 여기선 반나절이면 옵니다.',
      stats: { might: 36, wisdom: 80, command: 60 } },
    { id: 'xiyu_cheonma', name: '천마', hanja: '天馬', era: '서역(가상)', faction: '대완',
      rarity: 4, trait: 'might', emoji: '🐎', quote: '한혈마는 하루에 천 리를 달립니다.',
      stats: { might: 82, wisdom: 50, command: 70 } }
  ];

  /** 성 id → 그 성의 수비 무장 id 목록 (rtk.js seedNeutral() 이 쓴다) */
  var XIYU_GARRISON = {
    dunhuang: ['xiyu_talban', 'xiyu_yeoje'],
    loulan: ['xiyu_mokjil'],
    yanqi: ['xiyu_dansu'],
    kucha: ['xiyu_gumo'],
    khotan: ['xiyu_ochi'],
    kashgar: ['xiyu_sarim', 'xiyu_banwol'],
    dayuan: ['xiyu_cheonma']
  };

  /* ── 남중(南中) 지역 수비 무장 (2026-09-09, 다섯째 확장) — 앞 넷과 같은 결.
     era 는 전부 '남중(가상)' — 실존 인물이 아니다(루트 CLAUDE.md 이름 정책). */
  var NANZHONG_OFFICERS = [
    { id: 'nz_soman',     name: '소만', hanja: '蘇蠻', era: '남중(가상)', faction: '주제',
      rarity: 3, trait: 'might', emoji: '🗡️', quote: '산길을 막으면 코끼리도 못 지나갑니다.',
      stats: { might: 80, wisdom: 44, command: 70 } },
    { id: 'nz_ahyang',    name: '아향', hanja: '阿香', era: '남중(가상)', faction: '주제',
      rarity: 3, trait: 'wisdom', emoji: '🌿', quote: '독풀을 아는 자가 이 길의 주인입니다.',
      stats: { might: 40, wisdom: 82, command: 60 } },
    { id: 'nz_mokro',     name: '목로', hanja: '木老', era: '남중(가상)', faction: '건녕',
      rarity: 4, trait: 'command', emoji: '🐘', quote: '코끼리 부대는 산을 오르는 법을 압니다.',
      stats: { might: 76, wisdom: 58, command: 88 } },
    { id: 'nz_eunga',     name: '은가', hanja: '銀珂', era: '남중(가상)', faction: '건녕',
      rarity: 3, trait: 'wisdom', emoji: '🥁', quote: '북소리 하나로 부족 셋을 모읍니다.',
      stats: { might: 38, wisdom: 80, command: 64 } },
    { id: 'nz_jeokpyo',   name: '적표', hanja: '赤豹', era: '남중(가상)', faction: '월수',
      rarity: 3, trait: 'might', emoji: '🐆', quote: '표범처럼 능선을 타면 매복은 실패하지 않습니다.',
      stats: { might: 80, wisdom: 42, command: 68 } },
    { id: 'nz_hyeoncheon',name: '현천', hanja: '玄泉', era: '남중(가상)', faction: '장가',
      rarity: 3, trait: 'wisdom', emoji: '💧', quote: '협곡의 샘을 막으면 군대는 목이 마릅니다.',
      stats: { might: 42, wisdom: 78, command: 62 } },
    { id: 'nz_unhwa',     name: '운화', hanja: '雲花', era: '남중(가상)', faction: '운남',
      rarity: 3, trait: 'wisdom', emoji: '🌸', quote: '구름 남쪽 호수는 봄마다 꽃빛으로 물듭니다.',
      stats: { might: 36, wisdom: 80, command: 58 } },
    { id: 'nz_geumsang',  name: '금상', hanja: '金商', era: '남중(가상)', faction: '영창',
      rarity: 4, trait: 'command', emoji: '💰', quote: '천축(天竺)의 물건도 이 길을 거쳐 옵니다.',
      stats: { might: 70, wisdom: 62, command: 84 } },
    { id: 'nz_heukwol',   name: '흑월', hanja: '黑月', era: '남중(가상)', faction: '흥고',
      rarity: 3, trait: 'might', emoji: '🌑', quote: '가장 먼 변경일수록 밤이 깁니다.',
      stats: { might: 78, wisdom: 40, command: 66 } }
  ];

  /** 성 id → 그 성의 수비 무장 id 목록 (rtk.js seedNeutral() 이 쓴다) */
  var NANZHONG_GARRISON = {
    zhuti: ['nz_soman', 'nz_ahyang'],
    jianning: ['nz_mokro', 'nz_eunga'],
    yuexi: ['nz_jeokpyo'],
    zangke: ['nz_hyeoncheon'],
    yunnan: ['nz_unhwa'],
    yongchang: ['nz_geumsang'],
    xinggu: ['nz_heukwol']
  };

  /* ── 천축(天竺) 지역 수비 무장 (2026-09-10, 여섯째 확장) — 앞 다섯과 같은 결.
     era 는 전부 '천축(가상)' — 실존 인물이 아니다(루트 CLAUDE.md 이름 정책).
     faction 은 지키는 성 이름(신독·건타라 등)을 그대로 쓴다(앞 지역과 같은 관례).
     `boss: true` — 2026-09-10 "보스전"(README 여덟 축) 표시. 지역 허브를 지키는
     가장 센 수비 무장 한 명에게만 붙였다. `war.js` `capture()`가 이 표시를 보고
     쓰러뜨렸을 때 보상을 더 준다 — 새 전투 판정이 아니라 기존 fight()/capture()
     결과에 얹는 보상일 뿐이다. */
  var TIANZHU_OFFICERS = [
    { id: 'tz_beonwang',  name: '번왕', hanja: '番王', era: '천축(가상)', faction: '신독',
      rarity: 4, trait: 'command', emoji: '🐘', quote: '코끼리 부대 앞에서는 어떤 성벽도 오래 못 버팁니다.',
      stats: { might: 74, wisdom: 60, command: 86 }, boss: true },
    { id: 'tz_hyanggae',  name: '향개', hanja: '香蓋', era: '천축(가상)', faction: '신독',
      rarity: 3, trait: 'wisdom', emoji: '🕉️', quote: '항하의 물은 마르지 않듯, 이 땅의 셈도 끝이 없습니다.',
      stats: { might: 40, wisdom: 82, command: 62 } },
    { id: 'tz_seoksang',  name: '석상', hanja: '石像', era: '천축(가상)', faction: '건타라',
      rarity: 3, trait: 'wisdom', emoji: '🗿', quote: '돌에 새긴 얼굴은 세월이 지나도 웃고 있습니다.',
      stats: { might: 38, wisdom: 80, command: 60 } },
    { id: 'tz_ganda',     name: '간다', hanja: '干陀', era: '천축(가상)', faction: '건타라',
      rarity: 3, trait: 'might', emoji: '⚔️', quote: '동서의 상단이 다 이 저자를 거쳐 갑니다.',
      stats: { might: 78, wisdom: 46, command: 68 } },
    { id: 'tz_seolsan',   name: '설산', hanja: '雪山', era: '천축(가상)', faction: '계빈',
      rarity: 4, trait: 'might', emoji: '🏔️', quote: '눈 덮인 고개를 넘어 본 자만이 이 땅을 지킬 자격이 있습니다.',
      stats: { might: 84, wisdom: 48, command: 74 } },
    { id: 'tz_daehacheon',name: '대하천', hanja: '大夏泉', era: '천축(가상)', faction: '대하',
      rarity: 3, trait: 'wisdom', emoji: '🐎', quote: '대월지가 남긴 말과 활은 아직 녹슬지 않았습니다.',
      stats: { might: 44, wisdom: 78, command: 66 } },
    { id: 'tz_sanri',     name: '산리', hanja: '山離', era: '천축(가상)', faction: '오익산리',
      rarity: 3, trait: 'wisdom', emoji: '🏛️', quote: '먼 서쪽 나라의 돌기둥을 본 적이 있습니다.',
      stats: { might: 36, wisdom: 76, command: 58 } },
    { id: 'tz_hangha',    name: '항하', hanja: '恒河', era: '천축(가상)', faction: '마게타',
      rarity: 4, trait: 'command', emoji: '🌊', quote: '강이 곧 길이고, 강이 곧 국경입니다.',
      stats: { might: 68, wisdom: 64, command: 84 } },
    { id: 'tz_sawi',      name: '사위', hanja: '舍衛', era: '천축(가상)', faction: '사위',
      rarity: 3, trait: 'virtue', emoji: '🪷', quote: '순례자를 막지 않는 것이 이 저자의 오랜 법입니다.',
      stats: { might: 42, wisdom: 74, command: 60 } }
  ];

  /** 성 id → 그 성의 수비 무장 id 목록 (rtk.js seedNeutral() 이 쓴다) */
  var TIANZHU_GARRISON = {
    shendu: ['tz_beonwang', 'tz_hyanggae'],
    jiantuoluo: ['tz_seoksang', 'tz_ganda'],
    jibin: ['tz_seolsan'],
    daxia: ['tz_daehacheon'],
    wuyishanli: ['tz_sanri'],
    moqietuo: ['tz_hangha'],
    sheyi: ['tz_sawi']
  };

  /* ── 막북(漠北) 지역 수비 무장 (2026-09-10, 일곱째 확장) — 앞 여섯과 같은 결.
     era 는 전부 '막북(가상)' — 실존 인물이 아니다. faction 은 성 이름 그대로. */
  var MOBEI_OFFICERS = [
    { id: 'mb_cheolgak',  name: '철각', hanja: '鐵角', era: '막북(가상)', faction: '운중',
      rarity: 4, trait: 'might', emoji: '🐎', quote: '초원의 말은 지치는 법을 모릅니다.',
      stats: { might: 88, wisdom: 40, command: 76 } },
    { id: 'mb_hoja',      name: '호자', hanja: '胡刺', era: '막북(가상)', faction: '운중',
      rarity: 3, trait: 'might', emoji: '🏹', quote: '활은 말 위에서 쏘아야 제맛입니다.',
      stats: { might: 82, wisdom: 42, command: 68 } },
    { id: 'mb_baekwoon',  name: '백운', hanja: '白雲', era: '막북(가상)', faction: '안문',
      rarity: 3, trait: 'wisdom', emoji: '🪶', quote: '기러기 넘는 고개, 봉화가 늦으면 안 됩니다.',
      stats: { might: 44, wisdom: 78, command: 62 } },
    { id: 'mb_hanpung',   name: '한풍', hanja: '寒風', era: '막북(가상)', faction: '정양',
      rarity: 3, trait: 'might', emoji: '❄️', quote: '찬바람이 부는 쪽에서 적이 옵니다.',
      stats: { might: 80, wisdom: 38, command: 64 } },
    { id: 'mb_hwangto',   name: '황토', hanja: '黃土', era: '막북(가상)', faction: '상군',
      rarity: 4, trait: 'command', emoji: '🏜️', quote: '고원의 흙바람은 성벽보다 오래 버팁니다.',
      stats: { might: 72, wisdom: 58, command: 84 } },
    { id: 'mb_gangho',    name: '강호', hanja: '羌胡', era: '막북(가상)', faction: '북지',
      rarity: 3, trait: 'wisdom', emoji: '🐑', quote: '강족과 흉노가 뒤섞여도 셈은 하나입니다.',
      stats: { might: 46, wisdom: 76, command: 60 } },
    { id: 'mb_hanam',     name: '하남', hanja: '河南', era: '막북(가상)', faction: '삭방',
      rarity: 3, trait: 'wisdom', emoji: '🌊', quote: '황하가 크게 굽이치는 곳, 여기가 하남지입니다.',
      stats: { might: 40, wisdom: 74, command: 58 } },
    { id: 'mb_janggwang',name: '장광', hanja: '長光', era: '막북(가상)', faction: '오원',
      rarity: 3, trait: 'might', emoji: '🌌', quote: '가장 먼 북쪽, 겨울밤이 유난히 깁니다.',
      stats: { might: 76, wisdom: 40, command: 62 } },
    { id: 'mb_seonwoo',   name: '선우', hanja: '單于', era: '막북(가상)', faction: '운중',
      rarity: 4, trait: 'command', emoji: '👑', quote: '초원의 여러 부족이 제 깃발 아래 모입니다.',
      stats: { might: 78, wisdom: 56, command: 90 }, boss: true }
  ];

  /** 성 id → 그 성의 수비 무장 id 목록 (rtk.js seedNeutral() 이 쓴다) */
  var MOBEI_GARRISON = {
    yunzhong: ['mb_cheolgak', 'mb_hoja', 'mb_seonwoo'],
    yanmen: ['mb_baekwoon'],
    dingxiang: ['mb_hanpung'],
    shangjun: ['mb_hwangto'],
    beidi: ['mb_gangho'],
    shuofang: ['mb_hanam'],
    wuyuan: ['mb_janggwang']
  };

  /* ── 임읍(林邑) 지역 수비 무장 (2026-09-10, 여덟째 확장) — 앞 일곱과 같은 결.
     era 는 전부 '임읍(가상)' — 실존 인물이 아니다. faction 은 성 이름 그대로. */
  var LINYI_OFFICERS = [
    { id: 'ly_sangnim',   name: '상님', hanja: '象林', era: '임읍(가상)', faction: '상림',
      rarity: 4, trait: 'might', emoji: '🐘', quote: '임읍이 일어난 땅, 이 현을 지키는 것이 곧 나라를 지키는 일입니다.',
      stats: { might: 82, wisdom: 48, command: 78 } },
    { id: 'ly_uhwa',      name: '우화', hanja: '雨花', era: '임읍(가상)', faction: '상림',
      rarity: 3, trait: 'wisdom', emoji: '🌧️', quote: '우기가 오면 벼가 두 번 여뭅니다.',
      stats: { might: 38, wisdom: 80, command: 60 } },
    { id: 'ly_nogyong',   name: '노경', hanja: '盧景', era: '임읍(가상)', faction: '노용',
      rarity: 3, trait: 'might', emoji: '🌾', quote: '들이 기름지면 지킬 값어치도 큽니다.',
      stats: { might: 76, wisdom: 44, command: 66 } },
    { id: 'ly_jinju',     name: '진주', hanja: '眞珠', era: '임읍(가상)', faction: '비경',
      rarity: 3, trait: 'wisdom', emoji: '🦪', quote: '바다가 내어 주는 것은 진주만이 아닙니다.',
      stats: { might: 40, wisdom: 78, command: 62 } },
    { id: 'ly_juoh',      name: '주오', hanja: '朱吾', era: '임읍(가상)', faction: '주오',
      rarity: 3, trait: 'virtue', emoji: '🌊', quote: '기록이 끝나는 곳에서도 사람은 삽니다.',
      stats: { might: 42, wisdom: 70, command: 58 } },
    { id: 'ly_sanga',     name: '산아', hanja: '山牙', era: '임읍(가상)', faction: '서권',
      rarity: 3, trait: 'might', emoji: '🐆', quote: '코끼리가 못 오르는 산도 사람은 오릅니다.',
      stats: { might: 78, wisdom: 42, command: 64 } },
    { id: 'ly_jeonchung', name: '전충', hanja: '典沖', era: '임읍(가상)', faction: '전충',
      rarity: 4, trait: 'command', emoji: '🏯', quote: '벽돌로 쌓은 성벽은 불에도 잘 안 무너집니다.',
      stats: { might: 74, wisdom: 60, command: 88 }, boss: true },
    { id: 'ly_byeokjeon', name: '벽전', hanja: '甓塼', era: '임읍(가상)', faction: '전충',
      rarity: 3, trait: 'wisdom', emoji: '🧱', quote: '벽돌 굽는 가마 불은 밤에도 꺼지지 않습니다.',
      stats: { might: 44, wisdom: 76, command: 64 } },
    { id: 'ly_heuksang',  name: '흑상', hanja: '黑象', era: '임읍(가상)', faction: '구속',
      rarity: 3, trait: 'might', emoji: '🌑', quote: '지도 위 가장 남쪽, 기록도 여기서 흐려집니다.',
      stats: { might: 76, wisdom: 38, command: 60 } }
  ];

  /** 성 id → 그 성의 수비 무장 id 목록 (rtk.js seedNeutral() 이 쓴다) */
  var LINYI_GARRISON = {
    xianglin: ['ly_sangnim', 'ly_uhwa'],
    luorong: ['ly_nogyong'],
    bijing: ['ly_jinju'],
    zhuwu: ['ly_juoh'],
    xiquan: ['ly_sanga'],
    dianchong: ['ly_jeonchung', 'ly_byeokjeon'],
    quzu: ['ly_heuksang']
  };

  /* ── 시나리오 ───────────────────────────────────────────
   * 표를 하나 더 두면 시나리오가 하나 는다. 그 밖에 고칠 곳이 없다.
   *
   *   lord     군주 무장 id
   *   cities   시작 시 가진 도시
   *   officers 군주를 뺀 소속 무장 (data.js 인물도 섞인다)
   *   color    지도에 칠하는 색
   *   creed    AI 성향 — 'aggressive' 치고 나간다 | 'balanced' | 'turtle' 지킨다
   *
   * **어느 표에도 안 적힌 무장은 저절로 재야가 된다**(rtk.scatterFree).
   * 그래서 200년 표에 여포·이각을 안 적으면 그들은 재야로 흩어진다 —
   * 죽은 사람을 지우는 대신 판에 남겨 두는 것이 이 판의 결이다.
   *
   * **성 서른 곳이 하나도 빠짐없이, 겹치지 않게** 나뉘어야 한다.
   * 진단이 그걸 시나리오마다 센다(빠뜨리면 주인 없는 성이 생겨 아무도 못 친다).
   */

  var FORCES_194 = [
    { id: 'cao', name: '조조', color: '#5b8ff0', creed: 'aggressive',
      lord: 'sg_caocao', cities: ['chenliu', 'puyang', 'xuchang'],
      officers: ['sg_xiahoudun', 'sg_xunyu', 'rf_xiahouyuan', 'rf_caoren', 'rf_caohong',
                 'rf_dianwei', 'rf_xuchu', 'rf_yujin', 'rf_yuejin', 'rf_lidian',
                 'rf_chengyu', 'rf_guojia'] },
    { id: 'shao', name: '원소', color: '#c9a227', creed: 'balanced',
      lord: 'rf_yuanshao', cities: ['ye', 'nanpi', 'jinyang'],
      officers: ['rf_yanliang', 'rf_wenchou', 'rf_jushou', 'rf_tianfeng',
                 'rf_shenpei', 'rf_zhanghe', 'rf_gaolan'] },
    { id: 'zan', name: '공손찬', color: '#d8dee9', creed: 'aggressive',
      lord: 'rf_gongsunzan', cities: ['jixian', 'beiping'],
      officers: ['sg_zhaoyun', 'rf_yangang'] },
    { id: 'rong', name: '공융', color: '#8fbf8f', creed: 'turtle',
      lord: 'rf_kongrong', cities: ['beihai'],
      officers: ['sg_taishici', 'rf_wuanguo'] },
    { id: 'bei', name: '유비', color: '#4caf72', creed: 'balanced',
      lord: 'sg_liubei', cities: ['xiaopei'],
      officers: ['sg_guanyu', 'sg_zhangfei', 'rf_mizhu', 'rf_jianyong'] },
    { id: 'bu', name: '여포', color: '#b0524a', creed: 'aggressive',
      lord: 'sg_lubu', cities: ['xiapi'],
      officers: ['sg_zhangliao', 'sg_diaochan', 'rf_chengong', 'rf_gaoshun'] },
    { id: 'shu', name: '원술', color: '#c98a3c', creed: 'aggressive',
      lord: 'rf_yuanshu', cities: ['shouchun', 'runan'],
      officers: ['rf_jiling', 'rf_yanghong'] },
    { id: 'ce', name: '손책', color: '#e05c5c', creed: 'aggressive',
      lord: 'rf_sunce', cities: ['jianye', 'chaisang', 'kuaiji'],
      officers: ['sg_sunquan', 'sg_zhouyu', 'rf_chengpu', 'rf_huanggai',
                 'rf_handang', 'rf_zhoutai'] },
    { id: 'biao', name: '유표', color: '#7fb8d8', creed: 'turtle',
      lord: 'rf_liubiao', cities: ['xiangyang', 'xinye', 'jiangling', 'jiangxia', 'changsha', 'wan'],
      officers: ['sg_huangzhong', 'sg_ganning', 'rf_caimao', 'rf_kuailiang',
                 'rf_huangzu', 'rf_wenpin'] },
    { id: 'jue', name: '이각', color: '#9a6b9a', creed: 'balanced',
      lord: 'rf_lijue', cities: ['luoyang', 'changan'],
      officers: ['rf_guosi', 'rf_zhangji', 'rf_jiaxu'] },
    { id: 'teng', name: '마등', color: '#c07b4a', creed: 'balanced',
      lord: 'rf_mateng', cities: ['tianshui', 'wuwei'],
      officers: ['sg_machao', 'rf_pangde', 'rf_hansui'] },
    { id: 'lu', name: '장로', color: '#a8a2c8', creed: 'turtle',
      lord: 'rf_zhanglu', cities: ['hanzhong'],
      officers: ['rf_yangren', 'rf_yangsong'] },
    { id: 'zhang', name: '유장', color: '#7ac0a8', creed: 'turtle',
      lord: 'rf_liuzhang', cities: ['chengdu', 'jiangzhou', 'yongan'],
      officers: ['rf_zhangren', 'rf_yanyan', 'rf_fazheng', 'rf_wuyi'] }
  ];

  /* ── 200년 관도(官渡) ────────────────────────────────────
   * 군웅이 정리되고 하북(원소)과 중원(조조)이 마주 선다.
   * 여포·원술·공손찬·공융·이각은 이미 없다 — 그 사람들은 재야로 흩어진다.
   */
  var FORCES_200 = [
    { id: 'shao', name: '원소', color: '#c9a227', creed: 'aggressive',
      lord: 'rf_yuanshao', cities: ['ye', 'nanpi', 'jixian', 'beiping', 'jinyang', 'beihai'],
      officers: ['rf_yanliang', 'rf_wenchou', 'rf_jushou', 'rf_tianfeng',
                 'rf_shenpei', 'rf_zhanghe', 'rf_gaolan'] },
    { id: 'cao', name: '조조', color: '#5b8ff0', creed: 'aggressive',
      lord: 'sg_caocao',
      cities: ['xuchang', 'chenliu', 'puyang', 'luoyang', 'changan',
               'xiaopei', 'xiapi', 'shouchun'],
      officers: ['sg_xiahoudun', 'sg_xunyu', 'sg_zhangliao', 'rf_xiahouyuan', 'rf_caoren',
                 'rf_caohong', 'rf_xuchu', 'rf_yujin', 'rf_yuejin', 'rf_lidian',
                 'rf_chengyu', 'rf_guojia', 'rf_jiaxu'] },
    { id: 'bei', name: '유비', color: '#4caf72', creed: 'balanced',
      lord: 'sg_liubei', cities: ['runan'],
      officers: ['sg_guanyu', 'sg_zhangfei', 'sg_zhaoyun', 'rf_mizhu', 'rf_jianyong'] },
    { id: 'quan', name: '손권', color: '#e05c5c', creed: 'balanced',
      lord: 'sg_sunquan', cities: ['jianye', 'chaisang', 'kuaiji'],
      officers: ['sg_zhouyu', 'sg_taishici', 'rf_chengpu', 'rf_huanggai',
                 'rf_handang', 'rf_zhoutai'] },
    { id: 'biao', name: '유표', color: '#7fb8d8', creed: 'turtle',
      lord: 'rf_liubiao',
      cities: ['xiangyang', 'wan', 'xinye', 'jiangling', 'jiangxia', 'changsha'],
      officers: ['sg_huangzhong', 'sg_ganning', 'rf_caimao', 'rf_kuailiang',
                 'rf_huangzu', 'rf_wenpin'] },
    { id: 'teng', name: '마등', color: '#c07b4a', creed: 'balanced',
      lord: 'rf_mateng', cities: ['tianshui', 'wuwei'],
      officers: ['sg_machao', 'rf_pangde', 'rf_hansui'] },
    { id: 'lu', name: '장로', color: '#a8a2c8', creed: 'turtle',
      lord: 'rf_zhanglu', cities: ['hanzhong'],
      officers: ['rf_yangren', 'rf_yangsong'] },
    /* 유비(초록)와 색이 붙어 지도에서 헷갈렸다 — 이각이 없는 판이니 그 보라를 쓴다 */
    { id: 'zhang', name: '유장', color: '#9a6b9a', creed: 'turtle',
      lord: 'rf_liuzhang', cities: ['chengdu', 'jiangzhou', 'yongan'],
      officers: ['rf_zhangren', 'rf_yanyan', 'rf_fazheng', 'rf_wuyi'] }
  ];

  /* ── 208년 적벽(赤壁) ────────────────────────────────────
   * 조조가 스물 가까운 성을 쥐고 강을 내려온다. **아주 기울어진 판이다** —
   * 조조를 잡으면 마무리, 손권이나 유비를 잡으면 이 판에서 가장 어려운 싸움이다.
   * 손권과 유비는 **동맹으로 시작한다**(SCENARIOS 의 pacts). 그것 없이는 적벽이 아니다.
   */
  var FORCES_208 = [
    { id: 'cao', name: '조조', color: '#5b8ff0', creed: 'aggressive',
      lord: 'sg_caocao',
      cities: ['xuchang', 'chenliu', 'puyang', 'luoyang', 'changan', 'runan',
               'xiaopei', 'xiapi', 'shouchun', 'ye', 'nanpi', 'jixian', 'beiping',
               'jinyang', 'beihai', 'wan', 'xinye', 'xiangyang', 'jiangling'],
      officers: ['sg_xiahoudun', 'sg_xunyu', 'sg_zhangliao', 'sg_simayi',
                 'rf_xiahouyuan', 'rf_caoren', 'rf_caohong', 'rf_xuchu', 'rf_yujin',
                 'rf_yuejin', 'rf_lidian', 'rf_chengyu', 'rf_jiaxu', 'rf_zhanghe',
                 'rf_caimao', 'rf_wenpin', 'rf_kuailiang'] },
    { id: 'quan', name: '손권', color: '#e05c5c', creed: 'balanced',
      lord: 'sg_sunquan', cities: ['jianye', 'chaisang', 'kuaiji'],
      officers: ['sg_zhouyu', 'sg_luxun', 'sg_ganning', 'sg_taishici', 'rf_chengpu',
                 'rf_huanggai', 'rf_handang', 'rf_zhoutai'] },
    { id: 'bei', name: '유비', color: '#4caf72', creed: 'balanced',
      lord: 'sg_liubei', cities: ['jiangxia', 'changsha'],
      officers: ['sg_guanyu', 'sg_zhangfei', 'sg_zhaoyun', 'sg_zhugeliang',
                 'sg_huangzhong', 'rf_mizhu', 'rf_jianyong'] },
    { id: 'chao', name: '마초', color: '#c07b4a', creed: 'aggressive',
      lord: 'sg_machao', cities: ['tianshui', 'wuwei'],
      officers: ['rf_pangde', 'rf_hansui', 'rf_mateng'] },
    { id: 'lu', name: '장로', color: '#a8a2c8', creed: 'turtle',
      lord: 'rf_zhanglu', cities: ['hanzhong'],
      officers: ['rf_yangren', 'rf_yangsong'] },
    { id: 'zhang', name: '유장', color: '#9a6b9a', creed: 'turtle',
      lord: 'rf_liuzhang', cities: ['chengdu', 'jiangzhou', 'yongan'],
      officers: ['rf_zhangren', 'rf_yanyan', 'rf_fazheng', 'rf_wuyi', 'sg_pangtong'] }
  ];

  var SCENARIOS = [
    { id: '194', year: 194, name: '군웅할거', hanja: '群雄割據',
      desc: '열세 깃발이 한꺼번에 섰다. 누구를 잡아도 갈 길이 멀다.',
      forces: FORCES_194, pacts: [] },
    { id: '200', year: 200, name: '관도', hanja: '官渡',
      desc: '하북의 원소와 중원의 조조가 마주 섰다. 여포도 원술도 이미 없다.',
      forces: FORCES_200, pacts: [] },
    { id: '208', year: 208, name: '적벽', hanja: '赤壁',
      desc: '조조가 스물 가까운 성을 쥐고 강을 내려온다. 손권과 유비는 손을 잡았다.',
      forces: FORCES_208, pacts: [['quan', 'bei', 'ally', 24]] }
  ];

  function scenario(id) {
    for (var s = 0; s < SCENARIOS.length; s++) {
      if (SCENARIOS[s].id === id) { return SCENARIOS[s]; }
    }
    return SCENARIOS[0];
  }

  /**
   * 지금 쓰는 시나리오.
   * `FORCES` 는 **배열 그대로 갈아 끼운다**(새 배열로 바꾸지 않는다) —
   * 다른 파일이 `FD.FORCES` 를 이미 붙들고 있어서, 참조를 바꾸면 그쪽이 옛 표를 본다.
   */
  var FORCES = [];
  var current = null;

  function use(id) {
    var sc = scenario(id);
    current = sc;
    FORCES.length = 0;
    for (var s = 0; s < sc.forces.length; s++) { FORCES.push(sc.forces[s]); }
    forceById = {};
    for (s = 0; s < FORCES.length; s++) { forceById[FORCES[s].id] = FORCES[s]; }
    return sc;
  }

  /* ── 수전(水戰)에 능한 사람 ─────────────────────────────
   * 이 판의 자질은 무력·지력·통솔 셋뿐이다 — `data.js` 의 인물과 **모양이 같아야**
   * 도감·초상·능력치가 그대로 돌기 때문이다. 그래서 "물에서 더 잘 싸운다" 는
   * 넷째 자질을 만드는 대신 **이 파일의 목록**으로 둔다.
   * 다섯 판이 나눠 가진 `data.js` 를 한 줄도 건드리지 않고 적벽이 선다.
   *
   * 값은 수전에서 부대 힘에 곱하는 배수다. 부대에서 **가장 나은 한 사람**만 센다.
   */
  var NAVY = {
    kr_yisunsin: 1.40,      // 재야에서 온 수군 — "아직 신에게는 열두 척이 남아 있사옵니다"
    sg_zhouyu:   1.35,      // 적벽
    rf_huanggai: 1.30,      // 이 늙은 몸을 태워서라도
    sg_ganning:  1.30,
    rf_caimao:   1.30,      // 수군은 형주의 자랑입니다
    rf_handang:  1.25,      // 배 위에서라면 지지 않소
    rf_chengpu:  1.25,
    sg_luxun:    1.25,
    rf_zhoutai:  1.20,
    sg_taishici: 1.20,
    rf_huangzu:  1.15,      // 강하는 내가 지킨다
    sg_sunquan:  1.15,
    rf_sunce:    1.15
  };

  /** 수전 배수 — 물에서만 쓴다 (뭍에서는 언제나 1) */
  function navyOf(id) { return NAVY[id] || 1; }

  var byId = {}, i;
  for (i = 0; i < OFFICERS.length; i++) { byId[OFFICERS[i].id] = OFFICERS[i]; }

  var forceById = {};
  use('194');                       // 기본은 194년 군웅할거

  /** 이 세력의 무장 전부 (군주 포함) */
  function roster(forceId) {
    var f = forceById[forceId];
    if (!f) { return []; }
    return [f.lord].concat(f.officers);
  }

  global.DG = global.DG || {};
  global.DG.forceData = {
    OFFICERS: OFFICERS, FORCES: FORCES, NAVY: NAVY, navyOf: navyOf,
    KOREA_OFFICERS: KOREA_OFFICERS, KOREA_GARRISON: KOREA_GARRISON,
    JAPAN_OFFICERS: JAPAN_OFFICERS, JAPAN_GARRISON: JAPAN_GARRISON,
    JIAOZHOU_OFFICERS: JIAOZHOU_OFFICERS, JIAOZHOU_GARRISON: JIAOZHOU_GARRISON,
    XIYU_OFFICERS: XIYU_OFFICERS, XIYU_GARRISON: XIYU_GARRISON,
    NANZHONG_OFFICERS: NANZHONG_OFFICERS, NANZHONG_GARRISON: NANZHONG_GARRISON,
    TIANZHU_OFFICERS: TIANZHU_OFFICERS, TIANZHU_GARRISON: TIANZHU_GARRISON,
    MOBEI_OFFICERS: MOBEI_OFFICERS, MOBEI_GARRISON: MOBEI_GARRISON,
    LINYI_OFFICERS: LINYI_OFFICERS, LINYI_GARRISON: LINYI_GARRISON,
    SCENARIOS: SCENARIOS, scenario: scenario, use: use,
    current: function () { return current; },
    find: function (id) { return byId[id] || null; },
    force: function (id) { return forceById[id] || null; },
    roster: roster
  };
})(window);
