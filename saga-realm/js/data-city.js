/**
 * 삼국지 — 도시(城) 서른 곳 + 한국 지역 일곱 (2026-09-03 확장, 주인 없음)
 * ---------------------------------------------------------------
 * 코에이 삼국지의 골격은 "도시가 점이고, 인접한 점끼리만 군대가 오간다" 이다.
 * 그래서 이 파일이 정하는 것은 딱 둘이다 — **어디에 그릴지(x·y)** 와 **누구와 붙어 있는지(adj)**.
 *
 *   x·y      화면 비율(0~100). 실제 중국 지리를 대충 따른다(서→동 x, 북→남 y).
 *            지도는 svg 로 그린다 — 이 판에는 원래 지도가 없었다(강역은 목록이었다).
 *   adj      인접 도시. **한쪽만 적으면 된다** — link() 가 양쪽으로 이어 준다.
 *   agri/comm  논밭·저잣거리의 초기값(내정으로 올린다)
 *   wall     성벽 초기값. 공성전이 이 값을 깎는다
 *   land     지형. 'plain'(평야) | 'hill'(구릉) | 'river'(강) | 'mount'(산)
 *            공성·야전 보정과 내정 상한이 여기서 갈린다
 *            **양쪽이 다 river 인 길은 물길(水路)** 이다 — 배가 있어야 건넌다.
 *            물길 목록을 따로 두지 않은 것은, 지형 한 글자만 고치면 물길이
 *            따라 움직이게 두려는 것이다(장강·회수 줄기가 저절로 잡힌다)
 *
 * 도시를 늘릴 때는 이 파일만 고친다. 세력 배치는 data-force.js 다.
 */
(function (global) {
  'use strict';

  /* 州 — 도시를 묶어 보여줄 때만 쓴다 */
  var PROVINCES = {
    you: '유주', ji: '기주', bing: '병주', qing: '청주', yan: '연주',
    xu: '서주', yu: '예주', si: '사예', yong: '옹주', liang: '양주(涼)',
    jing: '형주', yi: '익주', yang: '양주(揚)',
    /* 2026-09-03 확장 — 한국 지역. 성 이름은 실제 역사 지명(저작권 대상이
       아니다), 그 성을 지키는 사람은 data-force.js KOREA_OFFICERS 에서
       가명으로 짓는다(루트 CLAUDE.md 이름 정책 — place명이 아니라 인물명만
       가린다) */
    kr: '한국',
    /* 2026-09-09 확장 — 일본열도. 한국과 같은 원칙 — 성 이름은 실제 지명,
       그 성을 지키는 사람은 data-force.js JAPAN_OFFICERS 에서 가명으로 짓는다 */
    jp: '일본',
    /* 2026-09-09 확장(셋째) — 교주(交州, 영남·베트남 북부). 같은 원칙 */
    jiao: '교주',
    /* 2026-09-09 확장(넷째) — 서역(西域, 하서주랑 너머 실크로드 오아시스). 같은 원칙 */
    xi: '서역',
    /* 2026-09-09 확장(다섯째) — 남중(南中, 강주 남쪽 산지·밀림). 같은 원칙 */
    nz: '남중',
    /* 2026-09-10 확장(여섯째) — 천축(天竺, 인도). 영창(남중) 너머, 실제
       한대 사료에 등장하는 서역·인도 지명을 그대로 썼다. 같은 원칙 */
    tz: '천축',
    /* 2026-09-10 확장(일곱째) — 막북(漠北, 몽골 초원·흉노 땅). 진양(병주)
       북쪽. 실제 한대 북방 변경 군(郡) 이름을 그대로 썼다. 같은 원칙 */
    mb: '막북',
    /* 2026-09-10 확장(여덟째) — 참파/임읍(林邑, 베트남 중부). 일남(교주)
       남쪽. 실제 한대 일남군 속현·임읍국 도성 이름을 그대로 썼다. 같은 원칙 */
    cp: '임읍'
  };

  var CITIES = [
    /* ── 북방 ─────────────────────────────────────────── */
    { id: 'beiping',  name: '북평', hanja: '北平', prov: 'you',  x: 84, y: 7,  land: 'hill',
      agri: 200, comm: 160, wall: 4200, pop: 130000, desc: '유주 동북의 관문. 오환과 맞닿아 기병이 억세다.' },
    { id: 'jixian',   name: '계',   hanja: '薊',   prov: 'you',  x: 73, y: 13, land: 'plain',
      agri: 260, comm: 220, wall: 4800, pop: 180000, desc: '유주의 치소. 북방 상인과 말이 모인다.' },
    { id: 'nanpi',    name: '남피', hanja: '南皮', prov: 'ji',   x: 70, y: 23, land: 'plain',
      agri: 320, comm: 260, wall: 5000, pop: 220000, desc: '기주 북쪽의 곡창. 원씨의 뒷마당.' },
    { id: 'ye',       name: '업',   hanja: '鄴',   prov: 'ji',   x: 61, y: 28, land: 'plain',
      agri: 420, comm: 380, wall: 6500, pop: 320000, desc: '하북 제일의 큰 성. 여기를 쥔 자가 북방을 쥔다.' },
    { id: 'jinyang',  name: '진양', hanja: '晉陽', prov: 'bing', x: 48, y: 20, land: 'mount',
      agri: 210, comm: 200, wall: 5200, pop: 150000, desc: '병주 산지의 요새. 흉노와 접한다.' },
    { id: 'beihai',   name: '북해', hanja: '北海', prov: 'qing', x: 83, y: 30, land: 'plain',
      agri: 300, comm: 240, wall: 4400, pop: 200000, desc: '청주의 학문 고을. 황건의 여파가 남았다.' },
    { id: 'puyang',   name: '복양', hanja: '濮陽', prov: 'yan',  x: 68, y: 33, land: 'river',
      agri: 300, comm: 280, wall: 4600, pop: 210000, desc: '황하를 낀 연주의 목. 물길이 곧 길이다.' },
    { id: 'chenliu',  name: '진류', hanja: '陳留', prov: 'yan',  x: 63, y: 39, land: 'plain',
      agri: 340, comm: 320, wall: 4800, pop: 240000, desc: '연주의 중심. 의병을 일으키기 좋은 자리.' },

    /* ── 중원 ─────────────────────────────────────────── */
    { id: 'luoyang',  name: '낙양', hanja: '洛陽', prov: 'si',   x: 47, y: 41, land: 'plain',
      agri: 380, comm: 420, wall: 6800, pop: 300000, desc: '한(漢)의 옛 서울. 불타고도 이름값이 남았다.' },
    { id: 'changan',  name: '장안', hanja: '長安', prov: 'si',   x: 35, y: 37, land: 'plain',
      agri: 360, comm: 400, wall: 6600, pop: 280000, desc: '관중의 서울. 사방이 관(關)으로 막혀 있다.' },
    { id: 'xuchang',  name: '허창', hanja: '許昌', prov: 'yu',   x: 58, y: 47, land: 'plain',
      agri: 400, comm: 360, wall: 5400, pop: 260000, desc: '중원 한복판. 둔전(屯田)을 벌이기에 이만한 땅이 없다.' },
    { id: 'runan',    name: '여남', hanja: '汝南', prov: 'yu',   x: 66, y: 54, land: 'plain',
      agri: 340, comm: 260, wall: 4200, pop: 230000, desc: '원씨 사대의 고향. 인재가 흔하다.' },
    { id: 'xiaopei',  name: '소패', hanja: '小沛', prov: 'xu',   x: 70, y: 43, land: 'plain',
      agri: 220, comm: 200, wall: 3600, pop: 120000, desc: '서주의 작은 성. 얹혀 사는 자의 자리다.' },
    { id: 'xiapi',    name: '하비', hanja: '下邳', prov: 'xu',   x: 79, y: 40, land: 'river',
      agri: 320, comm: 300, wall: 5200, pop: 220000, desc: '서주의 치소. 사수(泗水)가 성을 두른다.' },
    { id: 'shouchun', name: '수춘', hanja: '壽春', prov: 'yang', x: 74, y: 51, land: 'river',
      agri: 330, comm: 340, wall: 5000, pop: 230000, desc: '회남의 큰 성. 옥새를 품기 좋아하는 자리.' },

    /* ── 서방 ─────────────────────────────────────────── */
    { id: 'wuwei',    name: '무위', hanja: '武威', prov: 'liang', x: 15, y: 24, land: 'plain',
      agri: 180, comm: 220, wall: 3800, pop: 110000, desc: '하서의 길목. 서역 말이 들어온다.' },
    { id: 'tianshui', name: '천수', hanja: '天水', prov: 'yong',  x: 22, y: 36, land: 'hill',
      agri: 220, comm: 180, wall: 4400, pop: 140000, desc: '농서의 요충. 강족 기병을 부린다.' },
    { id: 'hanzhong', name: '한중', hanja: '漢中', prov: 'yi',    x: 29, y: 48, land: 'mount',
      agri: 280, comm: 220, wall: 5600, pop: 170000, desc: '촉으로 드는 문. 잔도(棧道) 하나가 나라를 가른다.' },
    { id: 'chengdu',  name: '성도', hanja: '成都', prov: 'yi',    x: 14, y: 62, land: 'plain',
      agri: 460, comm: 380, wall: 6000, pop: 340000, desc: '천부지국(天府之國). 굶는 해가 없다.' },
    { id: 'jiangzhou',name: '강주', hanja: '江州', prov: 'yi',    x: 25, y: 69, land: 'river',
      agri: 280, comm: 260, wall: 4600, pop: 180000, desc: '파(巴)의 물목. 촉의 동쪽 자물쇠.' },
    { id: 'yongan',   name: '영안', hanja: '永安', prov: 'yi',    x: 35, y: 63, land: 'mount',
      agri: 200, comm: 180, wall: 5000, pop: 120000, desc: '삼협의 입구. 물살이 성벽 노릇을 한다.' },

    /* ── 형주 ─────────────────────────────────────────── */
    { id: 'wan',      name: '완',   hanja: '宛',   prov: 'jing', x: 52, y: 52, land: 'plain',
      agri: 300, comm: 320, wall: 4800, pop: 220000, desc: '남양의 큰 저자. 중원과 형주 사이의 문.' },
    { id: 'xinye',    name: '신야', hanja: '新野', prov: 'jing', x: 56, y: 57, land: 'plain',
      agri: 200, comm: 160, wall: 3400, pop: 100000, desc: '작은 고을. 큰 뜻을 품기엔 좁다.' },
    { id: 'xiangyang',name: '양양', hanja: '襄陽', prov: 'jing', x: 50, y: 62, land: 'river',
      agri: 360, comm: 340, wall: 6200, pop: 260000, desc: '한수를 낀 형주의 머리. 물과 성벽이 겹친다.' },
    { id: 'jiangling',name: '강릉', hanja: '江陵', prov: 'jing', x: 44, y: 68, land: 'river',
      agri: 340, comm: 320, wall: 5400, pop: 240000, desc: '형주의 곳간. 배와 군량이 여기서 난다.' },
    { id: 'jiangxia', name: '강하', hanja: '江夏', prov: 'jing', x: 60, y: 65, land: 'river',
      agri: 280, comm: 300, wall: 4800, pop: 190000, desc: '장강과 한수가 만난다. 수군의 자리.' },
    { id: 'changsha', name: '장사', hanja: '長沙', prov: 'jing', x: 53, y: 77, land: 'hill',
      agri: 300, comm: 240, wall: 4400, pop: 200000, desc: '강남 사군(四郡)의 맏이. 활을 잘 쏜다.' },

    /* ── 강동 ─────────────────────────────────────────── */
    { id: 'chaisang', name: '시상', hanja: '柴桑', prov: 'yang', x: 66, y: 69, land: 'river',
      agri: 260, comm: 280, wall: 4600, pop: 180000, desc: '강동의 서쪽 문. 여기서 배를 내면 형주다.' },
    { id: 'jianye',   name: '건업', hanja: '建業', prov: 'yang', x: 77, y: 62, land: 'river',
      agri: 320, comm: 380, wall: 5200, pop: 250000, desc: '종산이 웅크린 자리. 왕기(王氣)가 있다 한다.' },
    { id: 'kuaiji',   name: '회계', hanja: '會稽', prov: 'yang', x: 84, y: 76, land: 'plain',
      agri: 300, comm: 340, wall: 4400, pop: 210000, desc: '강동의 끝. 소금과 배로 먹고산다.' },

    /* ── 한국 (2026-09-03 확장, 주인 없음 — force:null 로 시작해 정복 대상이다) ──
       x·y 는 기존 30성보다 동쪽(x:97~118)에 둔다 — 2D SVG viewBox 를
       0 0 100 100 → 0 0 125 100 로 넓혀야 잘린 채 안 뜬다(ui-rtk.js 한 곳).
       `garrison` 은 이 판에만 있는 새 필드 — rtk.js setup() 의 seedNeutral() 이
       이 값으로 troops/food 를 채운다(기존 30성에는 이 필드가 없다). */
    { id: 'yangping',  name: '양평',   hanja: '襄平',   prov: 'kr', x: 97,  y: 6,  land: 'plain',
      agri: 220, comm: 180, wall: 3800, pop: 90000, garrison: 12000,
      desc: '요동의 관문. 중원과 반도 사이, 누구의 땅도 아니다.' },
    { id: 'guknae',    name: '국내성', hanja: '國內城', prov: 'kr', x: 104, y: 14, land: 'mount',
      agri: 200, comm: 160, wall: 4600, pop: 100000, garrison: 15000,
      desc: '산이 성벽을 대신하는 곳. 오르는 자가 지친다.' },
    { id: 'nakrang',   name: '낙랑',   hanja: '樂浪',   prov: 'kr', x: 103, y: 24, land: 'plain',
      agri: 260, comm: 220, wall: 4200, pop: 130000, garrison: 16000,
      desc: '옛 군현의 저자. 배와 수레가 다 모인다.' },
    { id: 'daebang',   name: '대방',   hanja: '帶方',   prov: 'kr', x: 100, y: 33, land: 'plain',
      agri: 240, comm: 200, wall: 4000, pop: 110000, garrison: 14000,
      desc: '낙랑과 반도 남쪽을 잇는 목.' },
    { id: 'wirye',     name: '위례성', hanja: '慰禮城', prov: 'kr', x: 104, y: 42, land: 'river',
      agri: 300, comm: 260, wall: 4600, pop: 150000, garrison: 18000,
      desc: '큰 강을 낀 터. 다스리는 자마다 도읍으로 삼고 싶어한다.' },
    { id: 'geumseong', name: '금성',   hanja: '金城',   prov: 'kr', x: 118, y: 52, land: 'hill',
      agri: 280, comm: 240, wall: 5000, pop: 160000, garrison: 20000,
      desc: '반도 동남단의 큰 성. 산으로 둘러싸여 지키기 좋다.' },
    { id: 'gimhae',    name: '김해',   hanja: '金海',   prov: 'kr', x: 112, y: 58, land: 'river',
      agri: 260, comm: 300, wall: 3800, pop: 100000, garrison: 13000,
      desc: '남쪽 바닷가 나루. 배가 성벽만큼 값지다.' },

    /* ── 일본 (2026-09-09 확장, 주인 없음 — 한국과 같은 결) ──
       x·y 는 한국 지역보다 동남쪽(x:120~158)에 둔다 — 2D SVG viewBox 를
       0 0 125 100 → 0 0 165 100 으로 넓혀야 잘린 채 안 뜬다(ui-rtk.js 한 곳).
       김해→대마도→일기도→축자는 셋 다 land:'river' 라 물길로 이어진다 —
       배 없이는 바다를 못 건넌다(한반도 쪽 상륙 관문). 축자에 닿은 뒤로는
       규슈·혼슈 안쪽으로 육로가 이어진다(축자→출운만 다시 물길, 간몬해협). */
    { id: 'tsushima',  name: '대마도',   hanja: '對馬島', prov: 'jp', x: 122, y: 64, land: 'river',
      agri: 120, comm: 160, wall: 3000, pop: 50000, garrison: 8000,
      desc: '두 바다 사이 외딴 섬. 뭍이 보이는 날에만 배를 낸다.' },
    { id: 'iki',       name: '일기도',   hanja: '壹岐島', prov: 'jp', x: 128, y: 69, land: 'river',
      agri: 140, comm: 150, wall: 2800, pop: 45000, garrison: 7000,
      desc: '징검다리 같은 섬. 다음 물길로 넘어가는 길목이다.' },
    { id: 'chikushi',  name: '축자',     hanja: '筑紫',   prov: 'jp', x: 136, y: 71, land: 'river',
      agri: 260, comm: 280, wall: 4400, pop: 140000, garrison: 15000,
      desc: '규슈 북쪽의 큰 나루. 대륙 물건이 처음 닿는 자리다.' },
    { id: 'hyuga',     name: '일향',     hanja: '日向',   prov: 'jp', x: 133, y: 80, land: 'hill',
      agri: 200, comm: 160, wall: 3600, pop: 90000, garrison: 12000,
      desc: '규슈 남쪽의 산과 바다. 궁수가 많다.' },
    { id: 'izumo',     name: '출운',     hanja: '出雲',   prov: 'jp', x: 145, y: 64, land: 'river',
      agri: 220, comm: 240, wall: 4000, pop: 110000, garrison: 14000,
      desc: '큰 바다를 낀 혼슈의 관문. 신을 모시는 저자가 있다.' },
    { id: 'kibi',      name: '길비',     hanja: '吉備',   prov: 'jp', x: 151, y: 70, land: 'plain',
      agri: 300, comm: 260, wall: 4600, pop: 150000, garrison: 17000,
      desc: '기름진 안쪽 바다 연안. 곡식이 남아돈다.' },
    { id: 'yamato',    name: '야마토',   hanja: '大和',   prov: 'jp', x: 158, y: 75, land: 'plain',
      agri: 340, comm: 300, wall: 5200, pop: 180000, garrison: 20000,
      desc: '섬 안쪽의 너른 분지. 이곳을 쥔 자가 열도를 대표한다 여긴다.' },

    /* ── 교주 (2026-09-09 확장, 주인 없음 — 한국·일본과 같은 결) ──
       x·y 는 장사(x:53,y:77) 남쪽(y:82~112)에 둔다 — 2D SVG viewBox 를
       0 0 165 100 → 0 0 165 120 으로 다시 넓혀야 잘린 채 안 뜬다(ui-rtk.js
       한 곳). 실제 한대(漢代) 교주 칠군(남해·창오·울림·합포·교지·구진·
       일남) 이름을 그대로 쓴다(실제 지명, 정책 대상 아님). 합포→교지는
       둘 다 land:'river' 라 물길(합포만 연안 항로)로도 이어진다. */
    { id: 'nanhai',    name: '남해',     hanja: '南海',   prov: 'jiao', x: 70, y: 88, land: 'plain',
      agri: 260, comm: 280, wall: 4400, pop: 140000, garrison: 15000,
      desc: '영남으로 드는 첫 관문. 강남의 물건이 여기서 갈린다.' },
    { id: 'cangwu',    name: '창오',     hanja: '蒼梧',   prov: 'jiao', x: 60, y: 92, land: 'hill',
      agri: 200, comm: 180, wall: 3600, pop: 90000, garrison: 11000,
      desc: '산과 강이 겹치는 안쪽 땅. 오가는 길이 하나뿐이다.' },
    { id: 'yulin',     name: '울림',     hanja: '鬱林',   prov: 'jiao', x: 52, y: 95, land: 'hill',
      agri: 190, comm: 160, wall: 3400, pop: 80000, garrison: 10000,
      desc: '숲이 짙은 산골. 코끼리가 짐을 나른다.' },
    { id: 'hepu',      name: '합포',     hanja: '合浦',   prov: 'jiao', x: 58, y: 99, land: 'river',
      agri: 170, comm: 220, wall: 3200, pop: 85000, garrison: 10000,
      desc: '진주가 나는 바닷가. 배가 곧 재물이다.' },
    { id: 'jiaozhi',   name: '교지',     hanja: '交趾',   prov: 'jiao', x: 48, y: 102, land: 'river',
      agri: 280, comm: 260, wall: 4600, pop: 150000, garrison: 16000,
      desc: '붉은 강이 바다로 드는 삼각주. 교주에서 가장 큰 저자다.' },
    { id: 'jiuzhen',   name: '구진',     hanja: '九眞',   prov: 'jiao', x: 44, y: 107, land: 'plain',
      agri: 200, comm: 140, wall: 3000, pop: 70000, garrison: 9000,
      desc: '벼가 두 번 여무는 들. 남쪽으로 갈수록 낯설어진다.' },
    { id: 'rinan',     name: '일남',     hanja: '日南',   prov: 'jiao', x: 42, y: 112, land: 'hill',
      agri: 160, comm: 120, wall: 2800, pop: 55000, garrison: 7000,
      desc: '한(漢)의 땅이라 부르는 가장 남쪽 끝.' },

    /* ── 서역 (2026-09-09 확장, 주인 없음 — 앞 셋과 같은 결) ──
       한국·일본·교주는 지금까지 전부 기존 지도의 오른쪽·아래쪽(양수 좌표)
       빈 자리에 얹었지만, 서쪽은 무위(x:15)·성도(x:14)가 이미 0에 바짝
       붙어 있어 그 결로는 room이 없다. 그래서 이번만 **좌표 원점을
       움직이지 않고 viewBox 자체를 음수 쪽으로 넓힌다**(0 0 165 120 →
       -60 -30 225 150, ui-rtk.js 한 곳) — 기존 51성은 좌표를 단 하나도
       안 건드린다. 무위 서쪽의 하서주랑 너머, 실크로드 오아시스 나라들. */
    { id: 'dunhuang', name: '돈황', hanja: '敦煌', prov: 'xi', x: -8,  y: 22, land: 'hill',
      agri: 160, comm: 200, wall: 3600, pop: 70000, garrison: 9000,
      desc: '하서주랑의 끝. 사막으로 나서는 마지막 우물.' },
    { id: 'loulan',   name: '누란', hanja: '樓蘭', prov: 'xi', x: -20, y: 30, land: 'hill',
      agri: 100, comm: 160, wall: 2800, pop: 45000, garrison: 7000,
      desc: '소금 호수 곁의 작은 나라. 대상(隊商)이 쉬어 간다.' },
    { id: 'yanqi',    name: '언기', hanja: '焉耆', prov: 'xi', x: -22, y: 14, land: 'plain',
      agri: 220, comm: 180, wall: 3400, pop: 80000, garrison: 10000,
      desc: '북쪽 길의 첫 오아시스. 강이 눈 녹은 물을 실어 온다.' },
    { id: 'kucha',    name: '구자', hanja: '龜茲', prov: 'xi', x: -34, y: 12, land: 'plain',
      agri: 260, comm: 240, wall: 4000, pop: 120000, garrison: 13000,
      desc: '서역 북도의 큰 나라. 악사와 상인이 함께 온다.' },
    { id: 'khotan',   name: '우전', hanja: '于闐', prov: 'xi', x: -36, y: 34, land: 'river',
      agri: 240, comm: 220, wall: 3800, pop: 100000, garrison: 12000,
      desc: '옥이 강바닥에서 나는 나라. 남쪽 길의 요지.' },
    { id: 'kashgar',  name: '소륵', hanja: '疏勒', prov: 'xi', x: -48, y: 20, land: 'plain',
      agri: 240, comm: 260, wall: 4200, pop: 110000, garrison: 14000,
      desc: '남·북 두 길이 다시 만나는 자리. 파미르로 드는 문.' },
    { id: 'dayuan',   name: '대완', hanja: '大宛', prov: 'xi', x: -58, y: 16, land: 'hill',
      agri: 180, comm: 200, wall: 3200, pop: 60000, garrison: 8000,
      desc: '한혈마(汗血馬)가 난다는 서쪽 끝의 나라.' },

    /* ── 남중 (2026-09-09 확장, 주인 없음 — 앞 넷과 같은 결) ──
       강주(江州) 남쪽, 익주가 다스리기 벅차하던 산지·밀림 지대. 다른 점
       하나 — 관문 성 주제(朱提)를 강주처럼 land:'river' 로 둬서, 강주↔주제
       한 구간만 배 없이는 못 건넌다(노수(瀘水)를 건너야 남중에 든다는
       고사를 그대로 지형으로 옮겼다). 나머지 여섯 성은 전부 육로 나무 —
       건녕(建寧)이 허브, 실제 한대 남중 군(郡) 이름을 그대로 썼다. */
    { id: 'zhuti',    name: '주제', hanja: '朱提', prov: 'nz', x: 20, y: 82, land: 'river',
      agri: 160, comm: 140, wall: 3200, pop: 55000, garrison: 8500,
      desc: '노수(瀘水)를 건너야 닿는 첫 관문. 은광이 난다는 소문이 있다.' },
    { id: 'jianning', name: '건녕', hanja: '建寧', prov: 'nz', x: 14, y: 92, land: 'plain',
      agri: 200, comm: 180, wall: 3800, pop: 85000, garrison: 11000,
      desc: '남중 여러 부족을 아우르는 다스림의 중심.' },
    { id: 'yuexi',    name: '월수', hanja: '越巂', prov: 'nz', x: 4,  y: 78, land: 'mount',
      agri: 120, comm: 100, wall: 2800, pop: 42000, garrison: 7000,
      desc: '서쪽 산길, 강(羌)족과 맞닿은 변경.' },
    { id: 'zangke',   name: '장가', hanja: '牂柯', prov: 'nz', x: 28, y: 98, land: 'hill',
      agri: 150, comm: 120, wall: 3000, pop: 50000, garrison: 7500,
      desc: '협곡을 낀 물길, 배는 못 다녀도 걷기는 험하다.' },
    { id: 'yunnan',   name: '운남', hanja: '雲南', prov: 'nz', x: 8,  y: 104, land: 'mount',
      agri: 140, comm: 130, wall: 2900, pop: 46000, garrison: 7200,
      desc: '구름 남쪽의 큰 호수, 봄이면 꽃빛으로 물든다.' },
    { id: 'yongchang',name: '영창', hanja: '永昌', prov: 'nz', x: -8, y: 98, land: 'plain',
      agri: 170, comm: 200, wall: 3400, pop: 60000, garrison: 8800,
      desc: '머나먼 서쪽 땅, 천축(天竺)의 물건도 이 길을 거쳐 온다.' },
    { id: 'xinggu',   name: '흥고', hanja: '興古', prov: 'nz', x: 18, y: 112, land: 'hill',
      agri: 110, comm: 90, wall: 2600, pop: 38000, garrison: 6500,
      desc: '가장 먼 변경, 지도 위 마지막 이름.' },

    /* ── 천축 (2026-09-10 확장, 여섯째, 주인 없음 — 앞 다섯과 같은 결) ──
       영창(永昌, 남중)의 설명 그대로 "천축의 물건도 이 길을 거쳐 온다" —
       실제 촉신독도(蜀身毒道, Shu-Body road) 를 지형으로 옮겼다. 배가
       필요 없는 **육로**라는 점이 다르다(물길로 막힌 남중·일본과 다른 변주).
       성 이름은 한서·후한서에 실제로 나오는 서역·인도 지명 그대로다. */
    { id: 'shendu',      name: '신독',     hanja: '身毒',     prov: 'tz', x: -22, y: 100, land: 'plain',
      agri: 220, comm: 240, wall: 4000, pop: 95000, garrison: 11000,
      desc: '한서(漢書)가 "신독"이라 적은 땅. 촉의 장사꾼도 여기까지는 온다.' },
    { id: 'jiantuoluo',  name: '건타라',   hanja: '健馱邏',   prov: 'tz', x: -18, y: 92,  land: 'hill',
      agri: 160, comm: 180, wall: 3400, pop: 58000, garrison: 8500,
      desc: '간다라의 저자. 석상을 새기는 장인이 많다.' },
    { id: 'jibin',       name: '계빈',     hanja: '罽賓',     prov: 'tz', x: -25, y: 80,  land: 'mount',
      agri: 120, comm: 140, wall: 2800, pop: 40000, garrison: 6500,
      desc: '눈 덮인 산 아래 나라. 카슈미르의 옛 이름이다.' },
    { id: 'daxia',       name: '대하',     hanja: '大夏',     prov: 'tz', x: -15, y: 86,  land: 'hill',
      agri: 150, comm: 170, wall: 3200, pop: 52000, garrison: 8000,
      desc: '박트리아의 옛 이름. 대월지가 한때 이곳에 자리 잡았다.' },
    { id: 'wuyishanli',  name: '오익산리', hanja: '烏弋山離', prov: 'tz', x: -32, y: 88,  land: 'hill',
      agri: 110, comm: 130, wall: 2600, pop: 36000, garrison: 6000,
      desc: '알렉산드리아라 불리던 땅의 한역(漢譯) 이름.' },
    { id: 'moqietuo',    name: '마게타',   hanja: '摩揭陀',   prov: 'tz', x: -30, y: 106, land: 'plain',
      agri: 200, comm: 190, wall: 3600, pop: 70000, garrison: 9500,
      desc: '마가다. 항하(恒河) 유역의 크고 오래된 나라.' },
    { id: 'sheyi',       name: '사위',     hanja: '舍衛',     prov: 'tz', x: -26, y: 112, land: 'plain',
      agri: 170, comm: 150, wall: 3000, pop: 48000, garrison: 7500,
      desc: '사위성. 순례자들이 마지막으로 닿는 저자.' },

    /* ── 막북 (2026-09-10 확장, 일곱째, 주인 없음 — 앞 여섯과 같은 결) ──
       화북 북쪽, 흉노의 땅. 진양(晉陽)의 설명 그대로 "흉노와 접한다" —
       그 진양을 관문 삼는다. 배가 필요 없는 **초원길**(물길 없음)이라는
       점이 다르다. 성 이름은 실제 한대(漢代) 북방 변경 군(郡) 이름이다. */
    { id: 'yunzhong',   name: '운중', hanja: '雲中', prov: 'mb', x: 45, y: 5,   land: 'plain',
      agri: 160, comm: 130, wall: 3400, pop: 55000, garrison: 8500,
      desc: '흉노와 맞댄 첫 군(郡). 말 떼가 지평선을 채운다.' },
    { id: 'yanmen',     name: '안문', hanja: '雁門', prov: 'mb', x: 55, y: 0,   land: 'mount',
      agri: 130, comm: 110, wall: 3000, pop: 42000, garrison: 6800,
      desc: '기러기도 넘기 힘들다는 고개. 봉화가 자주 오른다.' },
    { id: 'dingxiang',  name: '정양', hanja: '定襄', prov: 'mb', x: 52, y: -10, land: 'plain',
      agri: 140, comm: 100, wall: 2800, pop: 38000, garrison: 6300,
      desc: '초원의 첫 저자. 가죽과 말을 바꾼다.' },
    { id: 'shangjun',   name: '상군', hanja: '上郡', prov: 'mb', x: 30, y: 10,  land: 'hill',
      agri: 150, comm: 120, wall: 3200, pop: 48000, garrison: 7500,
      desc: '황토 고원의 군. 오랜 세월 변방을 지켰다.' },
    { id: 'beidi',      name: '북지', hanja: '北地', prov: 'mb', x: 18, y: 6,   land: 'plain',
      agri: 170, comm: 110, wall: 3000, pop: 44000, garrison: 7000,
      desc: '농서와 이어지는 변경. 강족과 흉노가 뒤섞인다.' },
    { id: 'shuofang',   name: '삭방', hanja: '朔方', prov: 'mb', x: 28, y: -8,  land: 'plain',
      agri: 180, comm: 100, wall: 2900, pop: 40000, garrison: 6600,
      desc: '하남지(河南地)의 요새. 황하가 크게 굽이치는 자리다.' },
    { id: 'wuyuan',     name: '오원', hanja: '五原', prov: 'mb', x: 38, y: -15, land: 'hill',
      agri: 120, comm: 90,  wall: 2700, pop: 36000, garrison: 6000,
      desc: '가장 먼 북쪽 군. 겨울이 유난히 길다.' },

    /* ── 임읍(林邑, 참파) (2026-09-10 확장, 여덟째, 주인 없음 — 앞 일곱과 같은 결) ──
       교주 최남단 일남(日南) 너머. 실제 후한서·양서에 나오는 일남군 속현과
       임읍국 도성 이름을 그대로 썼다 — 상림(象林)은 후한 말 임읍국이 실제로
       일어난 바로 그 현이다. 2D 지도 viewBox 를 높이 방향(120→150)으로
       다시 넓혀야 한다(ui-rtk.js 한 곳) — 남쪽으로 더 뻗는 첫 지역. */
    { id: 'xianglin',   name: '상림', hanja: '象林', prov: 'cp', x: 38, y: 118, land: 'plain',
      agri: 180, comm: 150, wall: 3200, pop: 60000, garrison: 8000,
      desc: '일남군의 남쪽 끝 현. 임읍국이 바로 이곳에서 일어났다.' },
    { id: 'luorong',    name: '노용', hanja: '盧容', prov: 'cp', x: 34, y: 122, land: 'plain',
      agri: 160, comm: 130, wall: 2800, pop: 46000, garrison: 6800,
      desc: '상림과 나란한 옛 현. 벼가 두 번 여문다.' },
    { id: 'bijing',     name: '비경', hanja: '比景', prov: 'cp', x: 44, y: 124, land: 'river',
      agri: 150, comm: 170, wall: 3000, pop: 50000, garrison: 7200,
      desc: '해안의 옛 현. 진주조개를 캐는 배가 나간다.' },
    { id: 'zhuwu',      name: '주오', hanja: '朱吾', prov: 'cp', x: 30, y: 130, land: 'river',
      agri: 130, comm: 120, wall: 2600, pop: 38000, garrison: 6200,
      desc: '한(漢)의 문서에 남은 가장 남쪽 현.' },
    { id: 'xiquan',     name: '서권', hanja: '西卷', prov: 'cp', x: 50, y: 120, land: 'hill',
      agri: 140, comm: 110, wall: 2700, pop: 40000, garrison: 6400,
      desc: '산을 낀 서쪽 현. 코끼리가 짐을 나른다.' },
    { id: 'dianchong',  name: '전충', hanja: '典沖', prov: 'cp', x: 40, y: 128, land: 'plain',
      agri: 220, comm: 200, wall: 3800, pop: 72000, garrison: 9500,
      desc: '임읍국의 도성. 벽돌로 쌓은 성벽이 낯설다.' },
    { id: 'quzu',       name: '구속', hanja: '區粟', prov: 'cp', x: 36, y: 134, land: 'hill',
      agri: 120, comm: 100, wall: 2500, pop: 34000, garrison: 5800,
      desc: '지도 위 가장 남쪽 이름. 여기서부터는 기록도 흐릿하다.' }
  ];

  /* 인접 — 한쪽만 적는다. link() 가 양쪽에 넣는다.
     이 목록이 곧 이 게임의 "지도" 다: 여기 없는 두 성은 서로 출진할 수 없다. */
  var LINKS = [
    ['beiping', 'jixian'],
    ['jixian', 'nanpi'],
    ['nanpi', 'ye'], ['nanpi', 'beihai'],
    ['ye', 'jinyang'], ['ye', 'puyang'],
    ['jinyang', 'luoyang'], ['jinyang', 'changan'],
    ['beihai', 'puyang'], ['beihai', 'xiapi'],
    ['puyang', 'chenliu'], ['puyang', 'xiapi'],
    ['chenliu', 'xuchang'], ['chenliu', 'luoyang'],
    ['luoyang', 'xuchang'], ['luoyang', 'changan'], ['luoyang', 'wan'],
    ['changan', 'tianshui'], ['changan', 'hanzhong'],
    ['tianshui', 'wuwei'], ['tianshui', 'hanzhong'],
    ['hanzhong', 'chengdu'], ['hanzhong', 'jiangzhou'],
    ['chengdu', 'jiangzhou'],
    ['jiangzhou', 'yongan'],
    ['yongan', 'jiangling'],
    ['xuchang', 'runan'], ['xuchang', 'xiaopei'], ['xuchang', 'wan'],
    ['runan', 'shouchun'], ['runan', 'wan'], ['runan', 'jiangxia'],
    ['xiaopei', 'xiapi'], ['xiaopei', 'shouchun'],
    ['xiapi', 'shouchun'],
    ['shouchun', 'jianye'], ['shouchun', 'chaisang'],
    ['wan', 'xinye'],
    ['xinye', 'xiangyang'],
    ['xiangyang', 'jiangling'], ['xiangyang', 'jiangxia'],
    ['jiangling', 'jiangxia'], ['jiangling', 'changsha'],
    ['jiangxia', 'chaisang'],
    ['changsha', 'chaisang'], ['changsha', 'kuaiji'],
    ['chaisang', 'jianye'],
    ['jianye', 'kuaiji'],

    /* ── 한국 ─────────────────────────────────────────── */
    ['beiping', 'yangping'],
    ['yangping', 'guknae'],
    ['guknae', 'nakrang'],
    ['nakrang', 'daebang'],
    ['daebang', 'wirye'],
    ['wirye', 'geumseong'], ['wirye', 'gimhae'],
    ['geumseong', 'gimhae'],

    /* ── 일본 ─────────────────────────────────────────── */
    ['gimhae', 'tsushima'],
    ['tsushima', 'iki'],
    ['iki', 'chikushi'],
    ['chikushi', 'hyuga'], ['chikushi', 'izumo'],
    ['hyuga', 'kibi'],
    ['izumo', 'kibi'],
    ['kibi', 'yamato'],

    /* ── 교주 ─────────────────────────────────────────── */
    ['changsha', 'nanhai'],
    ['nanhai', 'cangwu'], ['nanhai', 'hepu'],
    ['cangwu', 'yulin'],
    ['yulin', 'jiaozhi'],
    ['hepu', 'jiaozhi'],
    ['jiaozhi', 'jiuzhen'],
    ['jiuzhen', 'rinan'],

    /* ── 서역 ─────────────────────────────────────────── */
    ['wuwei', 'dunhuang'],
    ['dunhuang', 'loulan'], ['dunhuang', 'yanqi'],
    ['loulan', 'khotan'],
    ['yanqi', 'kucha'],
    ['khotan', 'kashgar'],
    ['kucha', 'kashgar'],
    ['kashgar', 'dayuan'],

    /* ── 남중 ─────────────────────────────────────────── */
    ['jiangzhou', 'zhuti'],
    ['zhuti', 'jianning'],
    ['jianning', 'yuexi'], ['jianning', 'zangke'], ['jianning', 'yunnan'],
    ['yunnan', 'yongchang'],
    ['zangke', 'xinggu'],

    /* ── 천축 ─────────────────────────────────────────── */
    ['yongchang', 'shendu'],
    ['shendu', 'jiantuoluo'], ['shendu', 'daxia'], ['shendu', 'moqietuo'], ['shendu', 'sheyi'],
    ['jiantuoluo', 'jibin'],
    ['daxia', 'wuyishanli'],

    /* ── 막북 ─────────────────────────────────────────── */
    ['jinyang', 'yunzhong'],
    ['yunzhong', 'yanmen'], ['yunzhong', 'dingxiang'], ['yunzhong', 'shangjun'],
    ['shangjun', 'beidi'], ['shangjun', 'shuofang'],
    ['shuofang', 'wuyuan'],

    /* ── 임읍(林邑) ───────────────────────────────────── */
    ['rinan', 'xianglin'],
    ['xianglin', 'luorong'], ['xianglin', 'dianchong'],
    ['luorong', 'zhuwu'],
    ['dianchong', 'bijing'], ['dianchong', 'xiquan'], ['dianchong', 'quzu']
  ];

  var byId = {};
  var i, c;
  for (i = 0; i < CITIES.length; i++) {
    c = CITIES[i];
    c.adj = [];
    byId[c.id] = c;
  }

  /* 없는 도시를 가리키는 줄은 조용히 버린다 — 도시를 줄일 때 링크를 지우다 빠뜨려도
     지도가 통째로 안 그려지는 사고를 막는다(실제로 '평원' 을 빼면서 겪었다). */
  var dropped = [];
  for (i = 0; i < LINKS.length; i++) {
    var a = byId[LINKS[i][0]], b = byId[LINKS[i][1]];
    if (!a || !b) { dropped.push(LINKS[i].join('-')); continue; }
    if (a.adj.indexOf(b.id) < 0) { a.adj.push(b.id); }
    if (b.adj.indexOf(a.id) < 0) { b.adj.push(a.id); }
  }

  /** 지형 — 이름과 전투 보정 */
  var LANDS = {
    plain: { name: '평야', def: 1.0,  siege: 1.0,  agriCap: 1.0,  commCap: 1.0 },
    hill:  { name: '구릉', def: 1.15, siege: 0.9,  agriCap: 0.85, commCap: 0.9 },
    river: { name: '강',   def: 1.1,  siege: 0.95, agriCap: 1.0,  commCap: 1.15 },
    mount: { name: '산',   def: 1.3,  siege: 0.75, agriCap: 0.7,  commCap: 0.8 }
  };

  function find(id) { return byId[id] || null; }

  function landOf(id) {
    var city = find(id);
    return LANDS[(city && city.land) || 'plain'] || LANDS.plain;
  }

  function provName(key) { return PROVINCES[key] || key; }

  /**
   * 두 성 사이가 **물길**인가 — 맞닿아 있고 양쪽이 다 강(river)이면 그렇다.
   * 물길로는 **배로만** 군대가 건넌다. 그래서 강동은 배가 있어야 나가고,
   * 강하와 시상 사이(적벽)는 언제나 수전이 된다.
   */
  function isWater(a, b) {
    var ca = byId[a], cb = byId[b];
    return !!ca && !!cb && ca.land === 'river' && cb.land === 'river' &&
      ca.adj.indexOf(b) >= 0;
  }

  /** 물길로 이어진 이웃 */
  function waterAdj(id) {
    var c = byId[id], out = [], j;
    if (!c) { return out; }
    for (j = 0; j < c.adj.length; j++) {
      if (isWater(id, c.adj[j])) { out.push(c.adj[j]); }
    }
    return out;
  }

  /** 물길 전부 (자가진단이 센다) */
  var WATERWAYS = [];
  for (i = 0; i < CITIES.length; i++) {
    for (var wj = 0; wj < CITIES[i].adj.length; wj++) {
      var wb = CITIES[i].adj[wj];
      if (CITIES[i].id < wb && isWater(CITIES[i].id, wb)) {
        WATERWAYS.push([CITIES[i].id, wb]);
      }
    }
  }

  /** a 에서 b 까지 몇 성을 거치는가 (인접 그래프 너비 우선). 못 가면 -1 */
  function hops(a, b) {
    if (a === b) { return 0; }
    var seen = {}, q = [a], d = { }, cur, j;
    seen[a] = true; d[a] = 0;
    while (q.length) {
      cur = q.shift();
      var adj = find(cur) ? find(cur).adj : [];
      for (j = 0; j < adj.length; j++) {
        if (seen[adj[j]]) { continue; }
        seen[adj[j]] = true;
        d[adj[j]] = d[cur] + 1;
        if (adj[j] === b) { return d[adj[j]]; }
        q.push(adj[j]);
      }
    }
    return -1;
  }

  /**
   * a 에서 b 까지 **실제로 지나는 성 목록**(원정 전용, 2026-09-04) — 부모
   * 포인터로 경로를 되짚는 너비 우선. 중간 성(a·b 제외)은 `passableFn(cityId)`
   * 를 통과해야 지나갈 수 있다 — **b 자신은 이 검사를 안 받는다**(적의 성이라도
   * "도착지"는 될 수 있다, 거기서 싸우는 게 원정의 목적이다). **물길 간선은
   * 건너뛴다**(원정은 육로만 — 배 로지스틱스는 범위 밖). 못 가면 `null`,
   * 가면 `[a, ..., b]`(a===b 면 `[a]`).
   */
  function path(a, b, passableFn) {
    if (a === b) { return [a]; }
    var seen = {}, q = [a], parent = {}, cur, j;
    seen[a] = true;
    while (q.length) {
      cur = q.shift();
      var adj = find(cur) ? find(cur).adj : [];
      for (j = 0; j < adj.length; j++) {
        var nx = adj[j];
        if (seen[nx]) { continue; }
        if (isWater(cur, nx)) { continue; }
        if (nx !== b && !passableFn(nx)) { continue; }
        seen[nx] = true;
        parent[nx] = cur;
        if (nx === b) {
          var out = [b], p = cur;
          while (p !== undefined) { out.unshift(p); p = parent[p]; }
          return out;
        }
        q.push(nx);
      }
    }
    return null;
  }

  /**
   * `path()`가 준 경로를 실제로 도는 데 걸리는 개월 수(원정 전용).
   * 구간마다 화면 좌표(x·y, 0~100대) 거리를 더하되, 그 구간의 두 성 중
   * 하나라도 산(mount)이면 그 구간 길이에 ×1.5 — 험한 길은 더 걸린다.
   * 12로 나눠 올림, 최소 1달.
   */
  function pathMonths(p) {
    if (!p || p.length < 2) { return 1; }
    var total = 0, i;
    for (i = 0; i < p.length - 1; i++) {
      var ca = find(p[i]), cb = find(p[i + 1]);
      if (!ca || !cb) { continue; }
      var d = Math.hypot(ca.x - cb.x, ca.y - cb.y);
      if (ca.land === 'mount' || cb.land === 'mount') { d *= 1.5; }
      total += d;
    }
    return Math.max(1, Math.ceil(total / 12));
  }

  global.DG = global.DG || {};
  global.DG.cityData = {
    CITIES: CITIES, LINKS: LINKS, LANDS: LANDS, PROVINCES: PROVINCES,
    WATERWAYS: WATERWAYS,
    find: find, landOf: landOf, provName: provName, hops: hops,
    isWater: isWater, waterAdj: waterAdj, path: path, pathMonths: pathMonths,
    /** 자가진단용 — 없는 도시를 가리켜 버려진 링크 */
    _dropped: dropped
  };
})(window);
