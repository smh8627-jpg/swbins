/**
 * 캐릭터 데이터
 * ---------------------------------------------------------------
 * 코드를 건드리지 않고 이 파일만 늘려서 캐릭터를 추가한다.
 *
 * [인물] 등용(登用) 대상. 삼국지 / 한국사.
 *   id       : 고유키 (도감 저장에 쓰이므로 한 번 정하면 바꾸지 않는다)
 *   name     : 표시 이름
 *   era      : 시대 그룹 (도감 탭 분류)
 *   faction  : 세력 (위/촉/오/고구려/조선 …)
 *   rarity   : 1~5 (높을수록 조우 확률 낮고 요구 명성 높음)
 *   trait    : 'might'(무) | 'wisdom'(지) | 'virtue'(덕)  ← 설득 시 통하는 어필 방향
 *   stats    : 무력/지력/통솔
 *   emoji    : 지도·도감 표시용 (나중에 이미지로 교체 가능)
 *   quote    : 등용 성공 대사
 *
 * [펫] 포획 대상. 실존 동물 + 신수(神獸).
 *   kind     : 'beast'(동물) | 'divine'(신수)
 *   bonus    : 장착 시 인물에게 주는 보정
 *   catchBase: 기본 포획 확률(0~1). 미니게임 정확도로 가감된다.
 */
(function (global) {
  'use strict';

  var HEROES = [
    // ── 삼국지 ─────────────────────────────────────────────
    { id: 'sg_guanyu',    name: '명운',       era: '삼국지', faction: '촉',   rarity: 5, trait: 'virtue', stats: { might: 97, wisdom: 75, command: 95 }, hanja: '明雲', emoji: '🗡️', quote: '의(義)를 아는 이와 함께라면 어디든 가겠소.' },
    { id: 'sg_zhangfei',  name: '뇌호',       era: '삼국지', faction: '촉',   rarity: 4, trait: 'might',  stats: { might: 98, wisdom: 45, command: 80 }, hanja: '雷虎', emoji: '🍶', quote: '술이나 한잔 하며 이야기하세!' },
    { id: 'sg_zhaoyun',   name: '은창',       era: '삼국지', faction: '촉',   rarity: 5, trait: 'virtue', stats: { might: 96, wisdom: 76, command: 91 }, hanja: '銀槍', emoji: '🐎', quote: '한 몸 바쳐 주공을 지키겠습니다.' },
    { id: 'sg_zhugeliang',name: '현책',     era: '삼국지', faction: '촉',   rarity: 5, trait: 'wisdom', stats: { might: 38, wisdom: 100, command: 92 }, hanja: '玄策', emoji: '🪭', quote: '삼고초려의 뜻, 잊지 않겠습니다.' },
    { id: 'sg_liubei',    name: '인형',       era: '삼국지', faction: '촉',   rarity: 5, trait: 'virtue', stats: { might: 72, wisdom: 78, command: 90 }, hanja: '仁衡', emoji: '👑', quote: '백성을 생각하는 마음이 같구려.' },
    { id: 'sg_machao',    name: '서풍',       era: '삼국지', faction: '촉',   rarity: 4, trait: 'might',  stats: { might: 97, wisdom: 44, command: 87 }, hanja: '西風', emoji: '🏇', quote: '서량의 창끝을 빌려주겠다.' },
    { id: 'sg_huangzhong',name: '노궁',       era: '삼국지', faction: '촉',   rarity: 4, trait: 'might',  stats: { might: 93, wisdom: 62, command: 85 }, hanja: '老弓', emoji: '🏹', quote: '늙었다 얕보지 마라!' },
    { id: 'sg_caocao',    name: '패헌',       era: '삼국지', faction: '위',   rarity: 5, trait: 'wisdom', stats: { might: 72, wisdom: 96, command: 98 }, hanja: '霸軒', emoji: '⚔️', quote: '내가 천하를 저버릴지언정, 천하가 나를 저버리게 두지 않는다.' },
    { id: 'sg_simayi',    name: '은인',     era: '삼국지', faction: '위',   rarity: 5, trait: 'wisdom', stats: { might: 63, wisdom: 98, command: 94 }, hanja: '隱忍', emoji: '🕸️', quote: '때를 기다릴 줄 아는 자가 이깁니다.' },
    { id: 'sg_xiahoudun', name: '언무',     era: '삼국지', faction: '위',   rarity: 4, trait: 'might',  stats: { might: 92, wisdom: 58, command: 88 }, hanja: '彦武', emoji: '🩹', quote: '이 한쪽 눈으로도 적은 충분히 보인다.' },
    { id: 'sg_zhangliao', name: '철벽',       era: '삼국지', faction: '위',   rarity: 4, trait: 'might',  stats: { might: 94, wisdom: 78, command: 93 }, hanja: '鐵壁', emoji: '🛡️', quote: '팔백으로 십만을 막아 보이겠소.' },
    { id: 'sg_xunyu',     name: '청안',       era: '삼국지', faction: '위',   rarity: 4, trait: 'wisdom', stats: { might: 30, wisdom: 96, command: 70 }, hanja: '淸眼', emoji: '📜', quote: '왕좌지재(王佐之才)라 불러주시니 부끄럽습니다.' },
    { id: 'sg_sunquan',   name: '벽해',       era: '삼국지', faction: '오',   rarity: 4, trait: 'virtue', stats: { might: 70, wisdom: 86, command: 89 }, hanja: '碧海', emoji: '🔷', quote: '강동은 손을 잡을 줄 아는 자를 반깁니다.' },
    { id: 'sg_zhouyu',    name: '화풍',       era: '삼국지', faction: '오',   rarity: 5, trait: 'wisdom', stats: { might: 71, wisdom: 96, command: 97 }, hanja: '火風', emoji: '🔥', quote: '동남풍이 불면, 그때가 우리의 때입니다.' },
    { id: 'sg_luxun',     name: '담연',       era: '삼국지', faction: '오',   rarity: 4, trait: 'wisdom', stats: { might: 66, wisdom: 95, command: 94 }, hanja: '淡然', emoji: '🌊', quote: '서두르지 않는 것이 제 병법입니다.' },
    { id: 'sg_taishici',  name: '궁성',     era: '삼국지', faction: '오',   rarity: 4, trait: 'might',  stats: { might: 93, wisdom: 66, command: 82 }, hanja: '弓星', emoji: '🎯', quote: '활 솜씨를 보여드리지요.' },
    { id: 'sg_ganning',   name: '영진',       era: '삼국지', faction: '오',   rarity: 3, trait: 'might',  stats: { might: 94, wisdom: 60, command: 79 }, hanja: '鈴陣', emoji: '🔔', quote: '방울 소리가 들리면 이미 늦은 것이다.' },
    { id: 'sg_lubu',      name: '패창',       era: '삼국지', faction: '군웅', rarity: 5, trait: 'might',  stats: { might: 100, wisdom: 26, command: 88 }, hanja: '霸槍', emoji: '🐉', quote: '천하무쌍! 나를 막을 자가 있나?' },
    { id: 'sg_diaochan',  name: '월영',       era: '삼국지', faction: '군웅', rarity: 5, trait: 'virtue', stats: { might: 20, wisdom: 88, command: 40 }, hanja: '月影', emoji: '🌙', quote: '이 몸이 도움이 된다면요.' },
    { id: 'sg_pangtong',  name: '봉래',       era: '삼국지', faction: '촉',   rarity: 4, trait: 'wisdom', stats: { might: 40, wisdom: 97, command: 80 }, hanja: '鳳來', emoji: '🦅', quote: '봉추가 여기 있습니다.' },
    { id: 'sg_huatuo',    name: '신침',       era: '삼국지', faction: '재야', rarity: 4, trait: 'virtue', stats: { might: 15, wisdom: 92, command: 20 }, hanja: '神鍼', emoji: '💊', quote: '사람을 살리는 일이라면 함께하지요.' },
    { id: 'sg_menghuo',   name: '만왕',       era: '삼국지', faction: '남만', rarity: 3, trait: 'might',  stats: { might: 88, wisdom: 40, command: 76 }, hanja: '蠻王', emoji: '🐘', quote: '일곱 번 져도 여덟 번 일어난다!' },

    // ── 한국사 ─────────────────────────────────────────────
    { id: 'kr_yisunsin',  name: '해장',     era: '한국사', faction: '조선',   rarity: 5, trait: 'virtue', stats: { might: 92, wisdom: 98, command: 100 }, hanja: '海將', emoji: '🚢', quote: '아직 신에게는 열두 척의 배가 남아 있사옵니다.' },
    { id: 'kr_euljimundeok', name: '현묘', era: '한국사', faction: '고구려', rarity: 5, trait: 'wisdom', stats: { might: 88, wisdom: 97, command: 98 }, hanja: '玄妙', emoji: '🌊', quote: '만족함을 알고 그만두기를 권하노라.' },
    { id: 'kr_ganggamchan',  name: '강우',   era: '한국사', faction: '고려',   rarity: 5, trait: 'wisdom', stats: { might: 80, wisdom: 96, command: 97 }, hanja: '江雨', emoji: '⛰️', quote: '강물을 터뜨릴 준비는 끝났소.' },
    { id: 'kr_kimyusin',  name: '화랑준',     era: '한국사', faction: '신라',   rarity: 5, trait: 'might',  stats: { might: 95, wisdom: 88, command: 96 }, hanja: '花郞俊', emoji: '🗡️', quote: '삼한을 하나로 잇겠소.' },
    { id: 'kr_gyebaek',   name: '결사',       era: '한국사', faction: '백제',   rarity: 4, trait: 'might',  stats: { might: 94, wisdom: 70, command: 90 }, hanja: '決死', emoji: '🛡️', quote: '오천으로 오만을 맞겠다.' },
    { id: 'kr_yeongaesomun', name: '철령', era: '한국사', faction: '고구려', rarity: 5, trait: 'might', stats: { might: 96, wisdom: 82, command: 95 }, hanja: '鐵嶺', emoji: '🪓', quote: '요동의 성벽은 무너지지 않는다.' },
    { id: 'kr_gwanggaeto',name: '정복왕', era: '한국사', faction: '고구려', rarity: 5, trait: 'might',  stats: { might: 97, wisdom: 85, command: 99 }, hanja: '征服王', emoji: '🏇', quote: '북으로, 더 북으로 나아가자.' },
    { id: 'kr_sejong',    name: '훈민',   era: '한국사', faction: '조선',   rarity: 5, trait: 'wisdom', stats: { might: 40, wisdom: 100, command: 95 }, hanja: '訓民', emoji: '📖', quote: '백성이 쉽게 익혀 날로 쓰게 하고자 함이라.' },
    { id: 'kr_jangyeongsil', name: '성시',  era: '한국사', faction: '조선',   rarity: 4, trait: 'wisdom', stats: { might: 25, wisdom: 97, command: 45 }, hanja: '星時', emoji: '⏱️', quote: '해 그림자로 시간을 재어 보이겠습니다.' },
    { id: 'kr_choemuseon',name: '화포공',     era: '한국사', faction: '고려',   rarity: 4, trait: 'wisdom', stats: { might: 55, wisdom: 94, command: 70 }, hanja: '火砲工', emoji: '🧨', quote: '화약이라면 제게 맡기시지요.' },
    { id: 'kr_daejoyeong',name: '요동패',     era: '한국사', faction: '발해',   rarity: 5, trait: 'command',stats: { might: 90, wisdom: 88, command: 96 }, hanja: '遼東覇', emoji: '🌅', quote: '고구려의 뒤를 잇겠소.' },
    { id: 'kr_wanggeon',  name: '통합공',       era: '한국사', faction: '고려',   rarity: 5, trait: 'virtue', stats: { might: 82, wisdom: 88, command: 94 }, hanja: '統合公', emoji: '👑', quote: '흩어진 것을 다시 모으는 일이오.' },
    { id: 'kr_jeongyakyong', name: '만기',  era: '한국사', faction: '조선',   rarity: 4, trait: 'wisdom', stats: { might: 20, wisdom: 98, command: 60 }, hanja: '萬機', emoji: '🏗️', quote: '거중기로 백성의 짐을 덜겠습니다.' },
    { id: 'kr_heojun',    name: '활인',       era: '한국사', faction: '조선',   rarity: 4, trait: 'virtue', stats: { might: 15, wisdom: 95, command: 40 }, hanja: '活人', emoji: '🌿', quote: '병 앞에 귀천이 어디 있겠습니까.' },
    { id: 'kr_sinsaimdang', name: '초충당', era: '한국사', faction: '조선',   rarity: 4, trait: 'virtue', stats: { might: 12, wisdom: 92, command: 55 }, hanja: '草蟲堂', emoji: '🎨', quote: '붓끝에 마음을 담을 뿐입니다.' },
    { id: 'kr_ahnjunggeun', name: '동양평',   era: '한국사', faction: '대한제국', rarity: 5, trait: 'virtue', stats: { might: 88, wisdom: 90, command: 85 }, hanja: '東洋平', emoji: '🕊️', quote: '하루라도 글을 읽지 않으면 입에 가시가 돋는다.' },
    { id: 'kr_yugwansun', name: '소녀화',     era: '한국사', faction: '일제강점기', rarity: 5, trait: 'virtue', stats: { might: 60, wisdom: 80, command: 88 }, hanja: '少女花', emoji: '🔔', quote: '나라에 바칠 목숨이 하나뿐인 것이 슬플 따름입니다.' },
    { id: 'kr_kimgu',     name: '자강',       era: '한국사', faction: '일제강점기', rarity: 5, trait: 'virtue', stats: { might: 70, wisdom: 92, command: 94 }, hanja: '自强', emoji: '🇰🇷', quote: '나의 소원은 오직 완전한 자주독립이오.' },
    { id: 'kr_wonhyo',    name: '각원',       era: '한국사', faction: '신라',   rarity: 4, trait: 'wisdom', stats: { might: 30, wisdom: 96, command: 50 }, hanja: '覺圓', emoji: '🪷', quote: '모든 것은 마음이 짓는 것이오.' },
    { id: 'kr_kimjeongho',name: '방각',     era: '한국사', faction: '조선',   rarity: 4, trait: 'wisdom', stats: { might: 35, wisdom: 93, command: 40 }, hanja: '方刻', emoji: '🗺️', quote: '이 땅을 한 장에 담아보겠습니다.' },
    { id: 'kr_gwakjaeu',  name: '초모의',     era: '한국사', faction: '조선',   rarity: 4, trait: 'might',  stats: { might: 89, wisdom: 80, command: 88 }, hanja: '草募義', emoji: '🔴', quote: '홍의(紅衣)를 보면 왜적이 달아난다 하더이다.' },
    { id: 'kr_nongae',    name: '화영',       era: '한국사', faction: '조선',   rarity: 4, trait: 'virtue', stats: { might: 55, wisdom: 70, command: 50 }, hanja: '花影', emoji: '🌸', quote: '남강의 물결을 기억해 주십시오.' },
    { id: 'kr_yihwang',   name: '경헌',       era: '한국사', faction: '조선',   rarity: 3, trait: 'wisdom', stats: { might: 15, wisdom: 95, command: 55 }, hanja: '敬軒', emoji: '📚', quote: '경(敬)으로써 마음을 바로 합니다.' },
    { id: 'kr_yii',       name: '문형',       era: '한국사', faction: '조선',   rarity: 3, trait: 'wisdom', stats: { might: 20, wisdom: 96, command: 65 }, hanja: '文衡', emoji: '✒️', quote: '십만 양병이 늦지 않았기를 바랍니다.' },
    { id: 'kr_hwanghui',  name: '균형공',       era: '한국사', faction: '조선',   rarity: 3, trait: 'virtue', stats: { might: 18, wisdom: 90, command: 75 }, hanja: '均衡公', emoji: '⚖️', quote: '네 말도 옳고, 네 말도 옳다.' },
    { id: 'kr_jeongmongju', name: '청죽',   era: '한국사', faction: '고려',   rarity: 4, trait: 'virtue', stats: { might: 35, wisdom: 93, command: 68 }, hanja: '靑竹', emoji: '🌉', quote: '일백 번 고쳐 죽어도 마음은 하나입니다.' },

    // ── 유럽사 ─────────────────────────────────────────────
    // 이 판은 한자 문화권이 아니어서 hanja 칸에 원어 표기를 넣는다(도감이 이름 아래 작게 쓴다).
    { id: 'eu_caesar',    name: '발레리안',   era: '유럽사', faction: '로마',     rarity: 5, trait: 'wisdom', stats: { might: 78, wisdom: 92, command: 98 }, hanja: 'Valerian', emoji: '🏛️', quote: '왔노라, 보았노라, 그리고 함께 가겠노라.' },
    { id: 'eu_alexander', name: '카시안더', era: '유럽사', faction: '마케도니아', rarity: 5, trait: 'might', stats: { might: 94, wisdom: 88, command: 97 }, hanja: 'Kassiander', emoji: '🐎', quote: '세상의 끝까지 가 보고 싶지 않은가.' },
    { id: 'eu_hannibal',  name: '마그나로',     era: '유럽사', faction: '카르타고', rarity: 5, trait: 'wisdom', stats: { might: 85, wisdom: 95, command: 94 }, hanja: 'Magnaro', emoji: '🐘', quote: '길이 없다면 알프스를 넘어 만들면 된다.' },
    { id: 'eu_charlemagne', name: '로타리안', era: '유럽사', faction: '프랑크',   rarity: 5, trait: 'virtue', stats: { might: 85, wisdom: 82, command: 95 }, hanja: 'Lotharian', emoji: '👑', quote: '검과 글을 함께 쥔 나라를 세우려 하오.' },
    { id: 'eu_joan',      name: '셀렌느',  era: '유럽사', faction: '프랑스',   rarity: 5, trait: 'virtue', stats: { might: 78, wisdom: 70, command: 92 }, hanja: 'Selenne', emoji: '⚜️', quote: '두려움은 제 것이 아닙니다. 깃발을 드십시오.' },
    { id: 'eu_napoleon',  name: '발데나르',   era: '유럽사', faction: '프랑스',   rarity: 5, trait: 'wisdom', stats: { might: 80, wisdom: 96, command: 99 }, hanja: 'Baldenar', emoji: '🎖️', quote: '불가능이라는 말은 겁쟁이의 변명이오.' },
    { id: 'eu_davinci',   name: '마라노',    era: '유럽사', faction: '이탈리아', rarity: 5, trait: 'wisdom', stats: { might: 25, wisdom: 100, command: 58 }, hanja: 'Marano', emoji: '🪶', quote: '아직 그리지 못한 것이 너무 많소.' },
    { id: 'eu_augustus',  name: '세레누스', era: '유럽사', faction: '로마',   rarity: 4, trait: 'wisdom', stats: { might: 55, wisdom: 94, command: 92 }, hanja: 'Serenus', emoji: '🦅', quote: '벽돌의 도시를 대리석으로 바꾸겠소.' },
    { id: 'eu_scipio',    name: '코르비날',   era: '유럽사', faction: '로마',     rarity: 4, trait: 'might',  stats: { might: 82, wisdom: 88, command: 90 }, hanja: 'Corvinal', emoji: '🛡️', quote: '한니발을 이기는 법은 한니발에게 배웠소.' },
    { id: 'eu_leonidas',  name: '테살로르', era: '유럽사', faction: '스파르타', rarity: 4, trait: 'might',  stats: { might: 92, wisdom: 60, command: 86 }, hanja: 'Thessalor', emoji: '🔺', quote: '와서 가져가라.' },
    { id: 'eu_aurelius',  name: '베렌델', era: '유럽사', faction: '로마',   rarity: 4, trait: 'virtue', stats: { might: 58, wisdom: 96, command: 84 }, hanja: 'Verendel', emoji: '📖', quote: '오늘 할 수 있는 선(善)을 미루지 마시오.' },
    { id: 'eu_richard',   name: '코드윈', era: '유럽사', faction: '잉글랜드', rarity: 4, trait: 'might',  stats: { might: 93, wisdom: 65, command: 86 }, hanja: 'Cordwin', emoji: '🦁', quote: '사자의 심장은 물러서는 법을 모른다.' },
    { id: 'eu_william',   name: '펜드릭', era: '유럽사', faction: '노르만',   rarity: 4, trait: 'might',  stats: { might: 88, wisdom: 78, command: 90 }, hanja: 'Fendric', emoji: '🏹', quote: '바다를 건넜으면 배는 태워야 하오.' },
    { id: 'eu_harald',    name: '오스트바르드',       era: '유럽사', faction: '노르웨이', rarity: 4, trait: 'might',  stats: { might: 95, wisdom: 62, command: 84 }, hanja: 'Ostvard', emoji: '🪓', quote: '북쪽에서 왔다. 노를 저을 줄 아는가.' },
    { id: 'eu_frederick', name: '바실로른', era: '유럽사', faction: '프로이센', rarity: 4, trait: 'wisdom', stats: { might: 78, wisdom: 93, command: 95 }, hanja: 'Vasilorn', emoji: '🎼', quote: '왕은 나라의 첫째 종복이오.' },
    { id: 'eu_peter',     name: '볼카노프', era: '유럽사', faction: '러시아',   rarity: 4, trait: 'might',  stats: { might: 82, wisdom: 90, command: 93 }, hanja: 'Volkanov', emoji: '⚓', quote: '바다로 나가는 창을 열어야 하오.' },
    { id: 'eu_elizabeth', name: '코리넬레', era: '유럽사', faction: '잉글랜드', rarity: 4, trait: 'wisdom', stats: { might: 25, wisdom: 95, command: 90 }, hanja: 'Corinelle', emoji: '💍', quote: '나는 이 나라와 혼인했소.' },
    { id: 'eu_nelson',    name: '애쉬그레이브',       era: '유럽사', faction: '잉글랜드', rarity: 4, trait: 'might',  stats: { might: 85, wisdom: 88, command: 92 }, hanja: 'Ashgrave', emoji: '🔭', quote: '나라가 각자의 본분을 기대하고 있다.' },
    { id: 'eu_machiavelli', name: '반토렐리', era: '유럽사', faction: '이탈리아', rarity: 4, trait: 'wisdom', stats: { might: 22, wisdom: 96, command: 70 }, hanja: 'Vantorelli', emoji: '🖋️', quote: '사랑받기 어렵다면, 적어도 얕보이지는 마시오.' },
    { id: 'eu_newton',    name: '할베린',       era: '유럽사', faction: '잉글랜드', rarity: 3, trait: 'wisdom', stats: { might: 15, wisdom: 100, command: 48 }, hanja: 'Halberin', emoji: '🍎', quote: '거인의 어깨에 올라섰을 뿐이오.' },
    { id: 'eu_michelangelo', name: '첼로리니', era: '유럽사', faction: '이탈리아', rarity: 3, trait: 'wisdom', stats: { might: 32, wisdom: 94, command: 54 }, hanja: 'Cellorini', emoji: '🗿', quote: '돌 안에 이미 있는 것을 꺼낼 뿐이오.' },
    { id: 'eu_eleanor',   name: '바엘린', era: '유럽사', faction: '프랑스',   rarity: 3, trait: 'virtue', stats: { might: 20, wisdom: 90, command: 78 }, hanja: 'Vaellyn', emoji: '🌹', quote: '두 왕국의 왕비였으니, 셈은 제가 하겠소.' }
  ];

  var PETS = [
    // ── 신수 ───────────────────────────────────────────────
    { id: 'pt_samjogo',   name: '삼족오',     kind: 'divine', rarity: 5, emoji: '🐦‍⬛', catchBase: 0.24, bonus: { stat: 'wisdom',  value: 12 }, desc: '고구려 벽화의 세 발 까마귀. 해를 품고 난다.' },
    { id: 'pt_haetae',    name: '해태',       kind: 'divine', rarity: 5, emoji: '🦁', catchBase: 0.24, bonus: { stat: 'command', value: 12 }, desc: '시비와 선악을 가리는 상상의 짐승.' },
    { id: 'pt_cheongryong', name: '청룡',     kind: 'divine', rarity: 5, emoji: '🐉', catchBase: 0.20, bonus: { stat: 'might',   value: 14 }, desc: '동방을 지키는 사신(四神).' },
    { id: 'pt_baekho',    name: '백호',       kind: 'divine', rarity: 5, emoji: '🐅', catchBase: 0.20, bonus: { stat: 'might',   value: 13 }, desc: '서방을 지키는 흰 범.' },
    { id: 'pt_jujak',     name: '주작',       kind: 'divine', rarity: 5, emoji: '🔥', catchBase: 0.20, bonus: { stat: 'wisdom',  value: 13 }, desc: '남방을 지키는 붉은 새.' },
    { id: 'pt_hyeonmu',   name: '현무',       kind: 'divine', rarity: 5, emoji: '🐢', catchBase: 0.20, bonus: { stat: 'command', value: 13 }, desc: '북방을 지키는 거북과 뱀.' },
    { id: 'pt_gumiho',    name: '구미호',     kind: 'divine', rarity: 4, emoji: '🦊', catchBase: 0.30, bonus: { stat: 'wisdom',  value: 9 },  desc: '꼬리 아홉의 여우. 사람 말을 알아듣는다.' },
    { id: 'pt_dokkaebi',  name: '도깨비',     kind: 'divine', rarity: 4, emoji: '👹', catchBase: 0.32, bonus: { stat: 'might',   value: 9 },  desc: '방망이 하나로 뭐든 만들어낸다.' },
    { id: 'pt_bulgasari', name: '불가사리',   kind: 'divine', rarity: 4, emoji: '🐻‍❄️', catchBase: 0.30, bonus: { stat: 'command', value: 9 }, desc: '쇠를 먹고 자라는 짐승.' },
    { id: 'pt_jeoktoma',  name: '적토마',     kind: 'divine', rarity: 5, emoji: '🐴', catchBase: 0.22, bonus: { stat: 'might',   value: 11 }, desc: '하루에 천 리를 달린다는 명마.' },
    { id: 'pt_jeolyeong', name: '절영',       kind: 'divine', rarity: 4, emoji: '🐎', catchBase: 0.30, bonus: { stat: 'command', value: 8 },  desc: '조조를 태우고 달아난 준마.' },

    // ── 동물 ───────────────────────────────────────────────
    { id: 'pt_jindo',     name: '진돗개',     kind: 'beast',  rarity: 3, emoji: '🐕', catchBase: 0.48, bonus: { stat: 'command', value: 5 }, desc: '한번 정한 주인은 바꾸지 않는다.' },
    { id: 'pt_sapsal',    name: '삽살개',     kind: 'beast',  rarity: 3, emoji: '🐩', catchBase: 0.48, bonus: { stat: 'virtue',  value: 5 }, desc: '액운을 쫓는다는 털북숭이.' },
    { id: 'pt_tiger',     name: '백두산호랑이', kind: 'beast', rarity: 4, emoji: '🐯', catchBase: 0.30, bonus: { stat: 'might',  value: 8 }, desc: '산군(山君)이라 불린 이 땅의 주인.' },
    { id: 'pt_bear',      name: '반달가슴곰', kind: 'beast',  rarity: 3, emoji: '🐻', catchBase: 0.44, bonus: { stat: 'might',   value: 6 }, desc: '가슴에 반달을 품었다.' },
    { id: 'pt_magpie',    name: '까치',       kind: 'beast',  rarity: 2, emoji: '🐦', catchBase: 0.62, bonus: { stat: 'wisdom',  value: 3 }, desc: '좋은 소식을 물어온다.' },
    { id: 'pt_crane',     name: '학',         kind: 'beast',  rarity: 3, emoji: '🕊️', catchBase: 0.46, bonus: { stat: 'wisdom',  value: 5 }, desc: '선비의 벗.' },
    { id: 'pt_toad',      name: '두꺼비',     kind: 'beast',  rarity: 2, emoji: '🐸', catchBase: 0.66, bonus: { stat: 'command', value: 3 }, desc: '복을 부른다는 집지킴이.' },
    { id: 'pt_carp',      name: '잉어',       kind: 'beast',  rarity: 2, emoji: '🐟', catchBase: 0.66, bonus: { stat: 'wisdom',  value: 3 }, desc: '용문을 오르면 용이 된다던가.' },
    { id: 'pt_panda',     name: '판다',       kind: 'beast',  rarity: 4, emoji: '🐼', catchBase: 0.34, bonus: { stat: 'virtue',  value: 7 }, desc: '촉(蜀) 땅의 대나무 숲에 산다.' },
    { id: 'pt_monkey',    name: '원숭이',     kind: 'beast',  rarity: 2, emoji: '🐒', catchBase: 0.64, bonus: { stat: 'might',   value: 3 }, desc: '재주가 많고 손이 빠르다.' },
    { id: 'pt_deer',      name: '사슴',       kind: 'beast',  rarity: 2, emoji: '🦌', catchBase: 0.64, bonus: { stat: 'virtue',  value: 3 }, desc: '녹용은 예로부터 귀한 약재.' },
    { id: 'pt_boar',      name: '멧돼지',     kind: 'beast',  rarity: 3, emoji: '🐗', catchBase: 0.50, bonus: { stat: 'might',   value: 5 }, desc: '한번 달리면 멈추지 않는다.' },
    { id: 'pt_owl',       name: '올빼미',     kind: 'beast',  rarity: 3, emoji: '🦉', catchBase: 0.48, bonus: { stat: 'wisdom',  value: 5 }, desc: '밤에만 모습을 드러낸다.' },
    { id: 'pt_cat',       name: '고양이',     kind: 'beast',  rarity: 2, emoji: '🐈', catchBase: 0.60, bonus: { stat: 'wisdom',  value: 3 }, desc: '내킬 때만 따라온다.' },

    // ── 포켓몬 ─────────────────────────────────────────────
    // 원작(포켓몬GO)에서 건너온 손님들. 전설급은 신수(divine) 자리에 앉힌다.
    { id: 'pk_bulbasaur', name: '싹등이',   kind: 'beast',  rarity: 2, emoji: '🌱', catchBase: 0.66, bonus: { stat: 'virtue',  value: 3 }, desc: '등의 씨앗이 햇빛을 먹고 자란다.' },
    { id: 'pk_charmander', name: '불꼬리',    kind: 'beast',  rarity: 2, emoji: '🔥', catchBase: 0.64, bonus: { stat: 'might',   value: 3 }, desc: '꼬리의 불꽃이 기분을 그대로 보여준다.' },
    { id: 'pk_squirtle',  name: '물뿜이',     kind: 'beast',  rarity: 2, emoji: '💧', catchBase: 0.66, bonus: { stat: 'command', value: 3 }, desc: '등껍질에 숨어 물을 뿜는다.' },
    { id: 'pk_magikarp',  name: '뜀잉어',     kind: 'beast',  rarity: 2, emoji: '🐠', catchBase: 0.70, bonus: { stat: 'wisdom',  value: 2 }, desc: '지금은 튀어오를 뿐이지만, 언젠가는.' },
    { id: 'pk_pikachu',   name: '번개볼',     kind: 'beast',  rarity: 3, emoji: '⚡', catchBase: 0.48, bonus: { stat: 'might',   value: 5 }, desc: '볼주머니에 전기를 모아 둔다.' },
    { id: 'pk_eevee',     name: '떡잎이',     kind: 'beast',  rarity: 3, emoji: '🤎', catchBase: 0.48, bonus: { stat: 'virtue',  value: 5 }, desc: '어느 쪽으로도 자랄 수 있는 씨앗 같은 짐승.' },
    { id: 'pk_slowbro',   name: '늘보소라',     kind: 'beast',  rarity: 3, emoji: '🐚', catchBase: 0.50, bonus: { stat: 'wisdom',  value: 5 }, desc: '느긋해서 아픈 것도 한참 뒤에 안다.' },
    { id: 'pk_gengar',    name: '그늘귀',       kind: 'beast',  rarity: 3, emoji: '👻', catchBase: 0.44, bonus: { stat: 'wisdom',  value: 6 }, desc: '그림자에 섞여 따라다닌다.' },
    { id: 'pk_snorlax',   name: '누운산',     kind: 'beast',  rarity: 4, emoji: '😴', catchBase: 0.34, bonus: { stat: 'command', value: 8 }, desc: '먹고 자는 것 말고는 관심이 없다.' },
    { id: 'pk_lapras',    name: '나룻고래',   kind: 'beast',  rarity: 4, emoji: '🌊', catchBase: 0.34, bonus: { stat: 'virtue',  value: 8 }, desc: '등에 사람을 태우고 바다를 건넌다.' },
    { id: 'pk_alakazam',  name: '만권',       kind: 'beast',  rarity: 4, emoji: '🥄', catchBase: 0.32, bonus: { stat: 'wisdom',  value: 9 }, desc: '기억한 것을 하나도 잊지 않는다.' },
    { id: 'pk_dragonite', name: '순룡',     kind: 'beast',  rarity: 4, emoji: '🐲', catchBase: 0.30, bonus: { stat: 'command', value: 9 }, desc: '몸집과 달리 마음이 순하다.' },
    { id: 'pk_charizard', name: '화룡',     kind: 'beast',  rarity: 5, emoji: '🦖', catchBase: 0.22, bonus: { stat: 'might',   value: 13 }, desc: '날아오른 뒤에야 제 힘을 다 쓴다.' },
    { id: 'pk_gyarados',  name: '이무기',   kind: 'beast',  rarity: 5, emoji: '🌀', catchBase: 0.22, bonus: { stat: 'might',   value: 13 }, desc: '한번 성이 나면 좀처럼 가라앉지 않는다.' },
    { id: 'pk_mewtwo',    name: '의조',       kind: 'divine', rarity: 5, emoji: '🧬', catchBase: 0.18, bonus: { stat: 'wisdom',  value: 15 }, desc: '사람의 손으로 만들어진 것의 눈빛.' },
    { id: 'pk_mew',       name: '시조',         kind: 'divine', rarity: 5, emoji: '🩷', catchBase: 0.18, bonus: { stat: 'virtue',  value: 15 }, desc: '모든 것의 처음이라 전해진다.' }
  ];


  /**
   * 열전(列傳) — 상세 화면에 한 줄로 뜨는 인물 소개.
   * 인물을 추가할 때 여기 한 줄을 같이 넣으면 되고, 빠뜨려도 화면은 깨지지 않는다.
   */
  var BIOS = {
    sg_guanyu:     '유비의 의형제. 홀로 다섯 관문을 지나 형을 찾아갔고, 그 의(義)가 후대에 신으로 모셔졌다.',
    sg_zhangfei:   '장판교에서 홀로 다리를 막아 대군을 세웠다. 목소리만으로 적을 물린 사내.',
    sg_zhaoyun:    '장판파에서 유비의 어린 아들을 품에 안고 적진을 뚫었다. 한 몸이 곧 방패였다.',
    sg_zhugeliang: '초려에서 나와 천하삼분을 그렸다. 다섯 번 북벌에 나섰고 오장원에서 별이 떨어졌다.',
    sg_liubei:     '돗자리를 팔던 몸으로 촉한의 황제가 되었다. 사람을 얻는 일에서 누구에게도 지지 않았다.',
    sg_machao:     '서량의 기병을 이끌고 조조를 위교에서 몰아붙였다. 강족이 그를 신위천장군이라 불렀다.',
    sg_huangzhong: '정군산에서 노장의 활로 하후연을 베었다. 나이는 숫자일 뿐이라 증명한 사람.',
    sg_caocao:     '난세의 간웅. 시를 쓰고 둔전을 열고 북방을 통일해 위(魏)의 기틀을 세웠다.',
    sg_simayi:     '제갈량의 북벌을 지구전으로 받아냈다. 참는 법을 아는 자가 결국 천하를 가져갔다.',
    sg_xiahoudun:  '한쪽 눈을 잃고도 선봉을 놓지 않았다. 조조가 같은 수레에 태운 유일한 장수.',
    sg_zhangliao:  '합비에서 팔백 기로 십만 대군의 진영을 흔들었다. 오나라 아이들이 그 이름에 울음을 그쳤다.',
    sg_xunyu:      '조조의 참모. 관도의 승부처를 짚어냈으나 마지막에는 뜻이 갈렸다.',
    sg_sunquan:    '형의 뒤를 이어 강동을 지켰다. 적벽에서 유비와 손을 잡는 결단을 내렸다.',
    sg_zhouyu:     '적벽에서 화공으로 조조의 수군을 태웠다. 거문고를 아는 미주랑(美周郞).',
    sg_luxun:      '이릉에서 유비의 대군을 화공으로 되돌려 보냈다. 서두르지 않는 것이 그의 병법이었다.',
    sg_taishici:   '손책과 맞붙어 무승부를 낸 무장. 활을 쏘면 빗나가는 일이 없었다.',
    sg_ganning:    '강을 떠돌던 수적 출신. 방울을 달고 백 명으로 조조의 진영을 야습했다.',
    sg_lubu:       '방천화극과 적토마의 주인. 천하무쌍이었으나 사람을 믿는 법을 배우지 못했다.',
    sg_diaochan:   '동탁과 여포 사이를 갈라놓은 계책의 중심. 사서에는 없고 이야기에는 남았다.',
    sg_pangtong:   '제갈량과 나란히 불린 봉추(鳳雛). 낙성에서 화살에 맞아 뜻을 다 펴지 못했다.',
    sg_huatuo:     '마비산으로 마취를 하고 배를 열었다는 명의. 오금희(五禽戲)를 남겼다.',
    sg_menghuo:    '남만의 왕. 일곱 번 잡히고 일곱 번 풀려난 뒤에야 마음으로 굽혔다.',

    kr_yisunsin:      '옥포에서 노량까지 스물세 번 싸워 스물세 번 이겼다. 명량에서는 열두 척으로 삼백 척을 막았다.',
    kr_euljimundeok:  '수 양제의 삼십만 대군을 살수에서 수공으로 쓸어냈다. 시 한 수로 적장을 조롱한 배포.',
    kr_ganggamchan:   '귀주에서 거란 십만을 강물과 함께 몰아냈다. 예순을 넘겨 전장에 선 문신.',
    kr_kimyusin:      '황산벌을 넘어 삼한을 하나로 이었다. 신라의 칼이자 정치였다.',
    kr_gyebaek:       '오천의 결사대로 황산벌에서 오만을 맞았다. 물러설 곳을 스스로 지웠다.',
    kr_yeongaesomun:  '당 태종의 친정을 안시성에서 꺾었다. 요동의 성벽은 그의 시대에 무너지지 않았다.',
    kr_gwanggaeto:    '스물에 왕위에 올라 북으로 요동, 남으로 한강까지 넓혔다. 비석이 그 발자국을 적고 있다.',
    kr_sejong:        '훈민정음을 만들어 백성에게 글을 주었다. 측우기·자격루·칠정산이 한 시대에 나왔다.',
    kr_jangyeongsil:  '관노 출신으로 종3품에 올랐다. 자격루와 앙부일구로 조선의 시간을 세웠다.',
    kr_choemuseon:    '화약을 손에 넣어 화통도감을 세웠다. 진포에서 왜선 오백 척을 불태웠다.',
    kr_daejoyeong:    '천문령에서 당군을 꺾고 발해를 세웠다. 고구려의 이름을 북쪽에서 이었다.',
    kr_wanggeon:      '후삼국을 하나로 묶어 고려를 열었다. 호족을 적으로 두지 않고 사돈으로 삼았다.',
    kr_jeongyakyong:  '오백 권의 저술과 거중기. 유배지 강진에서 목민심서를 썼다.',
    kr_heojun:        '동의보감 스물다섯 권을 남겼다. 귀천을 가리지 않고 처방을 적은 어의.',
    kr_sinsaimdang:   '초충도의 화가이자 이이의 어머니. 붓과 자녀 교육을 함께 남겼다.',
    kr_ahnjunggeun:   '하얼빈 역에서 이토 히로부미를 저격했다. 뤼순 감옥에서 동양평화론을 쓰다 순국했다.',
    kr_yugwansun:     '아우내 장터에서 만세를 외쳤다. 서대문 형무소에서 열일곱 해의 삶을 마쳤다.',
    kr_kimgu:         '임시정부를 끝까지 지켰다. 백범일지에 "나의 소원"을 적어 두었다.',
    kr_wonhyo:        '해골에 담긴 물로 깨달아 유학길을 돌렸다. 일심(一心)으로 종파를 하나로 보았다.',
    kr_kimjeongho:    '대동여지도를 스스로 판각했다. 발로 걸어 이 땅을 한 장에 담은 사람.',
    kr_gwakjaeu:      '붉은 옷을 입고 의병을 이끌어 홍의장군으로 불렸다. 정암진에서 왜군의 북상을 막았다.',
    kr_nongae:        '진주성이 떨어진 촉석루에서 적장을 안고 남강에 뛰어들었다.',
    kr_yihwang:       '도산서당에서 후학을 길렀다. 성학십도로 임금에게 학문의 길을 그려 보였다.',
    kr_yii:           '아홉 번 장원한 구도장원공. 십만 양병을 청했으나 받아들여지지 않았다.',
    kr_hwanghui:      '세 임금을 섬기며 십팔 년을 영의정으로 지냈다. 다투는 종들에게도 옳다고 했다.',
    kr_jeongmongju:   '고려의 마지막 충신. 단심가를 남기고 선죽교에서 쓰러졌다.',

    eu_caesar:        '갈리아를 평정하고 루비콘을 건넜다. 종신 독재관이 된 이듬해 원로원 회의장에서 쓰러졌다.',
    eu_alexander:     '스무 살에 왕이 되어 페르시아를 넘어 인도까지 갔다. 서른둘에 바빌론에서 병으로 죽었다.',
    eu_hannibal:      '코끼리를 끌고 알프스를 넘어 로마의 안마당을 열여섯 해 동안 밟았다. 칸나에에서 완벽한 포위를 보여 주었다.',
    eu_charlemagne:   '프랑크를 하나로 묶고 서로마 황제로 관을 받았다. 궁정에 학교를 세워 글을 되살렸다.',
    eu_joan:          '열일곱 시골 소녀로 군을 이끌어 오를레앙을 풀었다. 열아홉에 루앙의 불길 속에서 갔다.',
    eu_napoleon:      '포병 소위에서 황제까지 올랐다. 유럽을 다시 그렸고, 워털루에서 지고 세인트헬레나에서 늙었다.',
    eu_davinci:       '그림과 해부와 비행을 한 공책에 적었다. 끝내지 않은 것이 끝낸 것보다 많았다.',
    eu_augustus:      '내전을 끝내고 원수정(元首政)을 세웠다. 사십 년의 평화가 그의 이름으로 불린다.',
    eu_scipio:        '자마에서 한니발을 꺾어 이차 포에니 전쟁을 끝냈다. 이긴 뒤 로마에서 시달렸다.',
    eu_leonidas:      '삼백으로 테르모필레의 좁은 길을 막았다. 길이 뚫린 뒤에도 그 자리를 떠나지 않았다.',
    eu_aurelius:      '전장의 천막에서 자기에게 쓰는 글을 남겼다. 황제였으나 스스로를 다스리는 데 더 힘썼다.',
    eu_richard:       '십자군을 이끌어 살라딘과 맞섰다. 재위 십 년 중 잉글랜드에 있던 것은 여섯 달뿐이었다.',
    eu_william:       '헤이스팅스에서 이겨 잉글랜드의 주인이 되었다. 온 나라를 세어 책 한 권에 담았다.',
    eu_harald:        '비잔티움의 근위대에서 이름을 얻고 돌아와 왕이 되었다. 스탬퍼드 브리지에서 화살에 갔다.',
    eu_frederick:     '플루트를 불고 볼테르와 편지하며 슐레지엔을 지켰다. 스스로를 나라의 첫째 종복이라 불렀다.',
    eu_peter:         '손수 배 만드는 법을 배우러 서쪽으로 갔다. 늪 위에 도시를 세워 바다로 가는 창을 열었다.',
    eu_elizabeth:     '사십오 년을 홀로 왕좌에 앉아 무적함대를 물렸다. 혼인을 묻는 이에게 나라와 혼인했다고 답했다.',
    eu_nelson:        '한 눈과 한 팔을 잃고도 함대를 이끌었다. 트라팔가에서 이기고 그 배 위에서 숨을 놓았다.',
    eu_machiavelli:   '공화국의 관리로 일하다 쫓겨나 농장에서 군주론을 썼다. 있어야 할 것 대신 있는 것을 적었다.',
    eu_newton:        '역병으로 대학이 닫힌 해에 미적분과 중력을 함께 얻었다. 말년에는 조폐국에서 위조범을 잡았다.',
    eu_michelangelo:  '시스티나 천장을 사 년간 올려다보며 그렸다. 조각가로 불리기를 더 좋아했다.',
    eu_eleanor:       '프랑스와 잉글랜드 두 왕국의 왕비였고, 두 왕의 어머니였다. 여든이 넘어서도 말을 타고 다녔다.'
  };

  /** 세력별 카드 색과 문양 — 인물 카드에 쓰인다 */
  var FACTIONS = {
    '촉':       { color: '#2f7d5c', mark: '蜀' },
    '위':       { color: '#31609f', mark: '魏' },
    '오':       { color: '#a03f3f', mark: '吳' },
    '군웅':     { color: '#6d5c8c', mark: '群' },
    '재야':     { color: '#5b6572', mark: '野' },
    '남만':     { color: '#7c5c2c', mark: '蠻' },
    '고구려':   { color: '#3a6ea5', mark: '高' },
    '백제':     { color: '#7a5aa8', mark: '濟' },
    '신라':     { color: '#b08a2e', mark: '羅' },
    '발해':     { color: '#2f7069', mark: '渤' },
    '고려':     { color: '#2e6c50', mark: '麗' },
    '조선':     { color: '#8b5c2c', mark: '朝' },
    '대한제국': { color: '#7c3d3d', mark: '韓' },
    '일제강점기': { color: '#4b4b5c', mark: '義' },
    /* 유럽사 — 한자 표식이 없으니 mark 는 라틴 한 글자로 둔다 */
    '로마':       { color: '#9c3d3d', mark: 'R' },
    '마케도니아': { color: '#b8892e', mark: 'M' },
    '카르타고':   { color: '#7c4a8c', mark: 'C' },
    '스파르타':   { color: '#a03a2e', mark: 'Λ' },
    '프랑크':     { color: '#3f6ba5', mark: 'F' },
    '프랑스':     { color: '#2f4f9f', mark: '⚜' },
    '잉글랜드':   { color: '#8b3a3a', mark: 'E' },
    '노르만':     { color: '#5a6a8c', mark: 'N' },
    '노르웨이':   { color: '#3a6a7a', mark: 'ᚱ' },
    '이탈리아':   { color: '#2f7d5c', mark: 'I' },
    '러시아':     { color: '#4a5a8c', mark: 'Р' },
    '프로이센':   { color: '#3a3a4c', mark: 'P' }
  };

  /** 기질 표기 */
  var TRAIT_MARK = { might: '武', wisdom: '智', virtue: '德' };

  /** 등급별 표시 정보 */
  var RARITY = {
    1: { label: '★',      color: '#9aa4b2' },
    2: { label: '★★',     color: '#5ec26a' },
    3: { label: '★★★',    color: '#4aa3f0' },
    4: { label: '★★★★',   color: '#b06bf0' },
    5: { label: '★★★★★',  color: '#f0a53a' }
  };

  /** 설득 어필 방향 (인물 trait 과 맞으면 호감도 크게 상승) */
  var APPEALS = [
    { key: 'might',  label: '무(武)로 겨루자', desc: '힘과 담대함으로 마음을 얻는다', emoji: '⚔️' },
    { key: 'wisdom', label: '지(智)를 논하자', desc: '식견과 계책으로 마음을 얻는다', emoji: '📜' },
    { key: 'virtue', label: '덕(德)으로 청하자', desc: '진심과 예로써 마음을 얻는다', emoji: '🙏' }
  ];

  global.DG = global.DG || {};
  global.DG.data = {
    heroes: HEROES,
    pets: PETS,
    rarity: RARITY,
    appeals: APPEALS,
    factions: FACTIONS,
    traitMark: TRAIT_MARK,
    /** 세력 정보 (없는 세력은 기본색) */
    faction: function (name) {
      return FACTIONS[name] || { color: '#5b6572', mark: '·' };
    },
    /** 열전 한 줄 (없으면 빈 문자열) */
    bio: function (id) { return BIOS[id] || ''; },
    /** id 로 찾기 */
    find: function (id) {
      var i;
      for (i = 0; i < HEROES.length; i++) { if (HEROES[i].id === id) { return HEROES[i]; } }
      for (i = 0; i < PETS.length; i++) { if (PETS[i].id === id) { return PETS[i]; } }
      return null;
    }
  };
})(window);
