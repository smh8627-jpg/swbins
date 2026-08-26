/**
 * 삼국지 — 세력(勢力)과 무장(武將)
 * ---------------------------------------------------------------
 * **`data.js` 를 건드리지 않는다.** 그 파일은 다섯 판이 나눠 가진 복사본이라
 * 여기서 한 줄만 늘려도 다섯 곳을 맞춰야 한다(인계 문서의 못이다).
 * 그래서 삼국지 무장은 이 파일이 따로 들고, `officer.js` 가 둘을 **합쳐서** 본다.
 *
 *   data.js 의 인물 70   — 삼국지 22 · 한국사 26 · 유럽사 22
 *   이 파일의 무장 54     — 삼국지 군주와 그 부하들
 *
 * 삼국지 사람이 아닌 인물(한국사·유럽사 48)은 **재야(在野)** 다.
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
    SCENARIOS: SCENARIOS, scenario: scenario, use: use,
    current: function () { return current; },
    find: function (id) { return byId[id] || null; },
    force: function (id) { return forceById[id] || null; },
    roster: roster
  };
})(window);
