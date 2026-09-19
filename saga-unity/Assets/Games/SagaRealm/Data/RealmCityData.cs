using System.Collections.Generic;

namespace Saga.Realm.Data
{
    public enum RealmLand { Plain, River }

    /// <summary>
    /// VERTICAL_SLICE_REALM.md 2-4절 "여러 성으로 확장" — js/data-force.js가
    /// 시나리오 194 조조군에 원래부터 주는 성 셋(진류·복양·허창) 그대로.
    /// 정복·외교는 안 들인다(4절 "제외") — "이미 갖고 있던 것"만 플레이
    /// 가능하게 넓힌 것. 수치는 js/data-city.js 그대로.
    /// </summary>
    public class RealmCityDef
    {
        public readonly string Id;
        private readonly string _name;
        public string Name => RealmLocalization.T("city." + Id, _name);
        public readonly RealmLand Land;
        public readonly int BaseAgri;
        public readonly int BaseComm;
        public readonly int BaseWall;
        public readonly int BasePop;
        /// <summary>월드맵 좌표(VERTICAL_SLICE_REALM.md 2-8절) — js/data-city.js의
        /// x·y(0~100 지도 비율) 그대로. 디오라마 조망과는 무관 — 지도에서
        /// 성 위치를 잡을 때만 쓴다.</summary>
        public readonly float MapX;
        public readonly float MapY;

        public RealmCityDef(string id, string name, RealmLand land, int agri, int comm, int wall, int pop, float mapX, float mapY)
        {
            Id = id;
            _name = name;
            Land = land;
            BaseAgri = agri;
            BaseComm = comm;
            BaseWall = wall;
            BasePop = pop;
            MapX = mapX;
            MapY = mapY;
        }
    }

    public static class RealmCityData
    {
        public const string StartingCityId = "xuchang";

        // 지도 순서 그대로 둔다(진류↔복양↔허창 인접이지만 이 슬라이스는
        // 전임/이동을 안 들여 인접 관계 자체를 안 쓴다 — 다음 후보).
        public static readonly string[] AllCityIds = { "xuchang", "chenliu", "puyang" };

        private static readonly Dictionary<string, RealmCityDef> Catalog = new Dictionary<string, RealmCityDef>
        {
            ["xuchang"] = new RealmCityDef("xuchang", "허창", RealmLand.Plain, agri: 400, comm: 360, wall: 5400, pop: 260000, mapX: 58, mapY: 47),
            ["chenliu"] = new RealmCityDef("chenliu", "진류", RealmLand.Plain, agri: 340, comm: 320, wall: 4800, pop: 240000, mapX: 63, mapY: 39),
            ["puyang"] = new RealmCityDef("puyang", "복양", RealmLand.River, agri: 300, comm: 280, wall: 4600, pop: 210000, mapX: 68, mapY: 33),
            // js/data-city.js 그대로 — RealmEnemyCity.cs가 전쟁 판정(성벽 3600)에
            // 이미 쓰는 것과 같은 성. AllCityIds엔 안 넣는다(처음부터 우리
            // 것이 아니다) — 함락하면 RealmCityState.AbsorbCity()가 이 정의로
            // RealmCityRecord를 지어 편입한다(REALM 다음 조각 (2) 참고).
            ["xiaopei"] = new RealmCityDef("xiaopei", "소패", RealmLand.Plain, agri: 220, comm: 200, wall: 3600, pop: 120000, mapX: 70, mapY: 43),
            // 51장 "대규모 콘텐츠"(2026-09-14) — 소패와 같은 결의 둘째 목표.
            // 복양(mapX 68·mapY 33)과 맞닿은 자리로 좀 더 바깥에 둔다.
            // wall은 RealmEnemyCity.cs의 정도 정의(5000)와 맞춰 둔다(축성
            // 상한 계산 CapOf가 이 값을 쓴다).
            ["dingtao"] = new RealmCityDef("dingtao", "정도", RealmLand.Plain, agri: 260, comm: 235, wall: 5000, pop: 150000, mapX: 76, mapY: 25),
            // 51장 "대규모 콘텐츠" 2차 확장(2026-09-15) — saga-web/saga-realm/
            // js/data-city.js LINKS 그대로 쓴다: 진류(chenliu)는 시작 성 중
            // 유일하게 그때까지 목표가 없었다(허창→소패, 복양→정도는 이미
            // 있음) — 그 자리를 채우는 셋째 목표. agri/comm/pop/land/mapX/mapY는
            // 원작 데이터 그대로, wall은 RealmEnemyCity.cs 낙양 정의(6800)와
            // 맞춘다(dingtao와 같은 이유).
            ["luoyang"] = new RealmCityDef("luoyang", "낙양", RealmLand.Plain, agri: 380, comm: 420, wall: 6800, pop: 300000, mapX: 47, mapY: 41),
            // 51장 2차 확장 — 소패를 함락한 뒤에도 계속 확장할 거리가 있도록
            // 소패에 붙는 둘째 목표(원작 LINKS: xiaopei-xiapi). river라
            // DefMul/SiegeMul이 정도·낙양과 다르게 붙는다(RealmCityData 아래
            // 공식 참고). wall은 RealmEnemyCity.cs 하비 정의(5200)와 맞춘다.
            ["xiapi"] = new RealmCityDef("xiapi", "하비", RealmLand.River, agri: 320, comm: 300, wall: 5200, pop: 220000, mapX: 79, mapY: 40),
            // 51장 2차 확장 — 정도를 함락한 뒤 계속 확장할 거리(원작 LINKS:
            // puyang-ye, 정도는 원작에 없는 창작 지명이라 정도 다음 칸으로
            // 자연스럽게 이어 붙였다). wall은 RealmEnemyCity.cs 업 정의(6500)와
            // 맞춘다.
            ["ye"] = new RealmCityDef("ye", "업", RealmLand.Plain, agri: 420, comm: 380, wall: 6500, pop: 320000, mapX: 61, mapY: 28),
            // 51장 "대규모 콘텐츠" 3차 확장(2026-09-16) — 낙양·하비·업을
            // 함락한 뒤 각자 이어지는 셋째 단계(원작 LINKS: luoyang-changan·
            // xiaopei-xiapi-shouchun·puyang-ye-jinyang 그대로). wall은
            // RealmEnemyCity.cs 장안 정의(6600)와 맞춘다.
            ["changan"] = new RealmCityDef("changan", "장안", RealmLand.Plain, agri: 360, comm: 400, wall: 6600, pop: 280000, mapX: 35, mapY: 37),
            // wall은 RealmEnemyCity.cs 수춘 정의(5000)와 맞춘다.
            ["shouchun"] = new RealmCityDef("shouchun", "수춘", RealmLand.River, agri: 330, comm: 340, wall: 5000, pop: 230000, mapX: 74, mapY: 51),
            // 원작 land는 mount인데 RealmLand enum엔 plain/river뿐이라(다른
            // 성 어디도 mount/hill을 안 옮겼다 — 위 DefMul/SiegeMul 주석 참고)
            // Plain으로 둔다(효과 없음 — 새 enum 값 추가는 이 확장 범위 밖).
            // wall은 RealmEnemyCity.cs 진양 정의(5200)와 맞춘다.
            ["jinyang"] = new RealmCityDef("jinyang", "진양", RealmLand.Plain, agri: 210, comm: 200, wall: 5200, pop: 150000, mapX: 48, mapY: 20),
            // 51장 "대규모 콘텐츠" 4차 확장(2026-09-16) — 장안을 함락한 뒤
            // 이어지는 넷째 단계(원작 LINKS: changan-hanzhong, "촉으로 드는
            // 문"). 진양처럼 원작 land가 mount라 Plain으로 둔다. wall은
            // RealmEnemyCity.cs 한중 정의(5600)와 맞춘다. changan의 다른
            // 이웃(tianshui)은 이번에 안 골랐다 — 성 하나당 목표 하나뿐이라
            // 다음 확장 후보로 남겨 둔다.
            ["hanzhong"] = new RealmCityDef("hanzhong", "한중", RealmLand.Plain, agri: 280, comm: 220, wall: 5600, pop: 170000, mapX: 29, mapY: 48),
            // 51장 4차 확장 — 수춘을 함락한 뒤 이어지는 넷째 단계(원작
            // LINKS: xiapi-shouchun-runan). wall은 RealmEnemyCity.cs 여남
            // 정의(4200)와 맞춘다. shouchun의 다른 이웃(jianye·chaisang,
            // 오나라 방면)은 이번에 안 골랐다 — 다음 확장 후보.
            ["runan"] = new RealmCityDef("runan", "여남", RealmLand.Plain, agri: 340, comm: 260, wall: 4200, pop: 230000, mapX: 66, mapY: 54),
            // 51장 "대규모 콘텐츠" 5차 확장(2026-09-16) — 한중을 함락한 뒤
            // 이어지는 다섯째 단계(원작 LINKS: hanzhong-chengdu, "천부지국
            // (天府之國), 굶는 해가 없다" — 촉의 심장부). wall은
            // RealmEnemyCity.cs 성도 정의(6000)와 맞춘다. hanzhong의 다른
            // 이웃(tianshui·jiangzhou)은 이번에 안 골랐다 — 다음 확장 후보.
            ["chengdu"] = new RealmCityDef("chengdu", "성도", RealmLand.Plain, agri: 460, comm: 380, wall: 6000, pop: 340000, mapX: 14, mapY: 62),
            // 51장 5차 확장 — 여남을 함락한 뒤 이어지는 다섯째 단계(원작
            // LINKS: runan-jiangxia, "수군의 자리" — 형주 방면 첫걸음).
            // wall은 RealmEnemyCity.cs 강하 정의(4800)와 맞춘다. **wan은
            // 절대 목표로 안 붙인다** — PlaytestRealmSlice.cs가 "목표 없는
            // 성" 게이트 검증에 고정으로 쓰는 성이다(2차 확장 때 진류로
            // 같은 실수를 해서 회귀를 냈던 자리, RealmEnemyCity.cs 클래스
            // 주석 참고). runan의 다른 이웃(wan)은 그래서 이번에도 안 골랐다.
            ["jiangxia"] = new RealmCityDef("jiangxia", "강하", RealmLand.River, agri: 280, comm: 300, wall: 4800, pop: 190000, mapX: 60, mapY: 65),
            // 51장 "대규모 콘텐츠" 6차 확장(2026-09-16) — 성도를 함락한 뒤
            // 이어지는 여섯째 단계(원작 LINKS: chengdu-jiangzhou, "파(巴)의
            // 물목, 촉의 동쪽 자물쇠"). wall은 RealmEnemyCity.cs 강주
            // 정의(4600)와 맞춘다.
            ["jiangzhou"] = new RealmCityDef("jiangzhou", "강주", RealmLand.River, agri: 280, comm: 260, wall: 4600, pop: 180000, mapX: 25, mapY: 69),
            // 51장 6차 확장 — 강하를 함락한 뒤 이어지는 여섯째 단계(원작
            // LINKS: xiangyang-jiangxia, "한수를 낀 형주의 머리"). jiangxia의
            // 다른 이웃(chaisang, 오나라 방면)은 이번에 안 골랐다 — 다음
            // 확장 후보. wall은 RealmEnemyCity.cs 양양 정의(6200)와 맞춘다.
            ["xiangyang"] = new RealmCityDef("xiangyang", "양양", RealmLand.River, agri: 360, comm: 340, wall: 6200, pop: 260000, mapX: 50, mapY: 62),
            // 51장 "대규모 콘텐츠" 7차 확장(2026-09-16) — 강주를 함락한 뒤
            // 이어지는 일곱째 단계(원작 LINKS: jiangzhou-yongan, "삼협의
            // 입구, 물살이 성벽 노릇을 한다"). 원작 land는 mount인데
            // 진양·한중처럼 Plain으로 둔다. wall은 RealmEnemyCity.cs 영안
            // 정의(5000)와 맞춘다. jiangzhou의 다른 이웃(zhuti, 남중 방면)은
            // 이번에 안 골랐다 — 다음 확장 후보.
            ["yongan"] = new RealmCityDef("yongan", "영안", RealmLand.Plain, agri: 200, comm: 180, wall: 5000, pop: 120000, mapX: 35, mapY: 63),
            // 51장 7차 확장 — 양양을 함락한 뒤 이어지는 일곱째 단계(원작
            // LINKS: xiangyang-jiangling, "형주의 곳간, 배와 군량이 여기서
            // 난다"). wall은 RealmEnemyCity.cs 강릉 정의(5400)와 맞춘다.
            ["jiangling"] = new RealmCityDef("jiangling", "강릉", RealmLand.River, agri: 340, comm: 320, wall: 5400, pop: 240000, mapX: 44, mapY: 68),
            // 51장 "대규모 콘텐츠" 8차 확장(2026-09-16) — 강릉을 함락한 뒤
            // 이어지는 여덟째 단계(원작 LINKS: jiangling-changsha, "강남
            // 사군(四郡)의 맏이, 활을 잘 쏜다"). 원작 land는 hill인데
            // 진양·한중·영안처럼 Plain으로 둔다. wall은 RealmEnemyCity.cs
            // 장사 정의(4400)와 맞춘다. 영안(yongan)은 이웃이 전부 이미
            // 우리 성이라(강주·강릉) 이번엔 다음 목표를 못 붙였다 — 진양과
            // 같은 막다른 가지.
            ["changsha"] = new RealmCityDef("changsha", "장사", RealmLand.Plain, agri: 300, comm: 240, wall: 4400, pop: 200000, mapX: 53, mapY: 77),
            // 51장 "대규모 콘텐츠" 9차 확장(2026-09-16) — 장사를 함락한 뒤
            // 이어지는 아홉째 단계(원작 LINKS: changsha-chaisang, "강동의
            // 서쪽 문"). wall은 RealmEnemyCity.cs 시상 정의(4600)와
            // 맞춘다. 시상은 원작 LINKS상 수춘·강하와도 맞닿지만 그 둘은
            // 이미 각자 목표(여남·양양)가 있어 이번엔 장사 쪽에서만
            // 골랐다(성 하나당 목표 하나).
            ["chaisang"] = new RealmCityDef("chaisang", "시상", RealmLand.River, agri: 260, comm: 280, wall: 4600, pop: 180000, mapX: 66, mapY: 69),
            // 51장 "대규모 콘텐츠" 10차 확장(2026-09-16) — 시상을 함락한 뒤
            // 이어지는 열째 단계(원작 LINKS: chaisang-jianye, "종산이
            // 웅크린 자리, 왕기(王氣)가 있다 한다" — 훗날 오나라 도읍).
            // wall은 RealmEnemyCity.cs 건업 정의(5200)와 맞춘다. chaisang의
            // 다른 이웃(kuaiji, 강동 끝)은 이번에 안 골랐다 — 다음 확장 후보.
            ["jianye"] = new RealmCityDef("jianye", "건업", RealmLand.River, agri: 320, comm: 380, wall: 5200, pop: 250000, mapX: 77, mapY: 62),
            // 51장 "대규모 콘텐츠" 11차 확장(2026-09-16) — 건업을 함락한 뒤
            // 이어지는 열한째 단계(원작 LINKS: jianye-kuaiji, "강동의 끝,
            // 소금과 배로 먹고산다"). wall은 RealmEnemyCity.cs 회계
            // 정의(4400)와 맞춘다. 이 사슬의 마지막 칸 — 회계는 원작
            // LINKS상 더 이상 이웃이 없다(장사와도 맞닿지만 장사는 이미
            // 시상을 목표로 갖고 있다).
            ["kuaiji"] = new RealmCityDef("kuaiji", "회계", RealmLand.Plain, agri: 300, comm: 340, wall: 4400, pop: 210000, mapX: 84, mapY: 76),
            // 51장 "대규모 콘텐츠" 12차 확장(2026-09-17) — 진양을 함락한 뒤
            // 이어지는 복양 사슬의 새 넷째 단계(원작 LINKS: jinyang-yunzhong,
            // "막북의 첫 관문" — 이 저장소 창작 확장 지역 균열/폐허로 드는
            // 문). 원작 data-city.js 그대로 land: plain(mount 보정 불필요,
            // 이 확장에서 처음). wall은 RealmEnemyCity.cs 운중 정의(3400)와
            // 맞춘다.
            ["yunzhong"] = new RealmCityDef("yunzhong", "운중", RealmLand.Plain, agri: 160, comm: 130, wall: 3400, pop: 55000, mapX: 45, mapY: 5),
            // 51장 "대규모 콘텐츠" 13차 확장(2026-09-17) — 운중을 함락한 뒤
            // 이어지는 복양 사슬의 새 다섯째 단계(원작 LINKS: yunzhong-
            // shangjun, "막북 둘째 관문"). 원작 land는 hill인데 진양·한중
            // 등과 같은 이유로 Plain 처리. wall은 RealmEnemyCity.cs 상군
            // 정의(3200)와 맞춘다.
            ["shangjun"] = new RealmCityDef("shangjun", "상군", RealmLand.Plain, agri: 150, comm: 120, wall: 3200, pop: 48000, mapX: 30, mapY: 10),
            // 51장 "대규모 콘텐츠" 14차 확장(2026-09-17) — 상군을 함락한 뒤
            // 이어지는 복양 사슬의 새 여섯째 단계(원작 LINKS: shangjun-
            // shuofang, "막북 셋째 관문"). land는 원작 그대로 plain. wall은
            // RealmEnemyCity.cs 삭방 정의(2900)와 맞춘다.
            ["shuofang"] = new RealmCityDef("shuofang", "삭방", RealmLand.Plain, agri: 180, comm: 100, wall: 2900, pop: 40000, mapX: 28, mapY: -8),
            // 51장 "대규모 콘텐츠" 15차 확장(2026-09-17) — 삭방을 함락한 뒤
            // 이어지는 복양 사슬의 새 일곱째 단계이자 마지막 칸(원작 LINKS:
            // shuofang-wuyuan, "막북 넷째 관문", 오원엔 다른 이웃이 없다).
            // 원작 land는 hill인데 진양·한중 등과 같은 이유로 Plain 처리.
            // wall은 RealmEnemyCity.cs 오원 정의(2700)와 맞춘다.
            ["wuyuan"] = new RealmCityDef("wuyuan", "오원", RealmLand.Plain, agri: 120, comm: 90, wall: 2700, pop: 36000, mapX: 38, mapY: -15),
            // 51장 "대규모 콘텐츠" 16차 확장(2026-09-18) — "성 하나당 목표
            // 하나" 제약을 풀고(PLAN.md Q-U2, 사용자 결정) 국경 성이 여러
            // 방향으로 뻗을 수 있게 했다. 장안(changan)의 둘째 목표(원작
            // LINKS: changan-tianshui, 3차 확장 때 "다음 확장 후보"로만
            // 적어 뒀던 자리) — 한중(hanzhong)과도 맞닿지만(tianshui-hanzhong)
            // 한 성만 갖는다. 원작 land hill은 다른 성들과 같은 이유로
            // Plain 처리. wall은 RealmEnemyCity.cs 천수 정의(4400)와 맞춘다.
            ["tianshui"] = new RealmCityDef("tianshui", "천수", RealmLand.Plain, agri: 220, comm: 180, wall: 4400, pop: 140000, mapX: 22, mapY: 36),
            // 16차 확장 — 장사(changsha)의 둘째 목표(원작 LINKS:
            // changsha-nanhai, 교주(交州) 관문). land는 원작 그대로 plain.
            // wall은 RealmEnemyCity.cs 남해 정의(4400)와 맞춘다.
            ["nanhai"] = new RealmCityDef("nanhai", "남해", RealmLand.Plain, agri: 260, comm: 280, wall: 4400, pop: 140000, mapX: 70, mapY: 88),
            // 16차 확장 — 강주(jiangzhou)의 둘째 목표(원작 LINKS:
            // jiangzhou-zhuti, 남중(南中) 관문, "노수를 건너야 닿는다").
            // land는 원작 그대로 river. wall은 RealmEnemyCity.cs 주제
            // 정의(3200)와 맞춘다.
            ["zhuti"] = new RealmCityDef("zhuti", "주제", RealmLand.River, agri: 160, comm: 140, wall: 3200, pop: 55000, mapX: 20, mapY: 82),
            // 51장 "대규모 콘텐츠" 17차 확장(2026-09-18) — 남해(nanhai)를
            // 함락한 뒤 이어지는 교주 사슬의 다음 단계(원작 LINKS:
            // nanhai-cangwu, "산과 강이 겹치는 안쪽 땅, 길이 하나뿐").
            // 원작 land hill은 다른 성들과 같은 이유로 Plain 처리. wall은
            // RealmEnemyCity.cs 창오 정의(3600)와 맞춘다.
            ["cangwu"] = new RealmCityDef("cangwu", "창오", RealmLand.Plain, agri: 200, comm: 180, wall: 3600, pop: 90000, mapX: 60, mapY: 92),
            // 17차 확장 — 주제(zhuti)를 함락한 뒤 이어지는 남중 사슬의
            // 다음 단계(원작 LINKS: zhuti-jianning, "남중 여러 부족을
            // 아우르는 다스림의 중심"). land는 원작 그대로 plain. wall은
            // RealmEnemyCity.cs 건녕 정의(3800)와 맞춘다.
            ["jianning"] = new RealmCityDef("jianning", "건녕", RealmLand.Plain, agri: 200, comm: 180, wall: 3800, pop: 85000, mapX: 14, mapY: 92),
            // 51장 "대규모 콘텐츠" 18차 확장(2026-09-18) — 창오(cangwu)를
            // 함락한 뒤 이어지는 교주 사슬의 다음 단계(원작 LINKS:
            // cangwu-yulin, "숲이 짙은 산골, 코끼리가 짐을 나른다"). 원작
            // land hill은 다른 성들과 같은 이유로 Plain 처리. wall은
            // RealmEnemyCity.cs 울림 정의(3400)와 맞춘다.
            ["yulin"] = new RealmCityDef("yulin", "울림", RealmLand.Plain, agri: 190, comm: 160, wall: 3400, pop: 80000, mapX: 52, mapY: 95),
            // 18차 확장 — 건녕(jianning)을 함락한 뒤 이어지는 남중 사슬의
            // 다음 단계이자 마지막 칸(원작 LINKS: jianning-yuexi, "서쪽
            // 산길, 강족과 맞닿은 변경" — 월수엔 다른 LINKS가 없다). 원작
            // land mount는 다른 성들과 같은 이유로 Plain 처리. wall은
            // RealmEnemyCity.cs 월수 정의(2800)와 맞춘다.
            ["yuexi"] = new RealmCityDef("yuexi", "월수", RealmLand.Plain, agri: 120, comm: 100, wall: 2800, pop: 42000, mapX: 4, mapY: 78),
            // 51장 "대규모 콘텐츠" 19차 확장(2026-09-18) — 울림(yulin)을
            // 함락한 뒤 이어지는 교주 사슬의 다음 단계(원작 LINKS:
            // yulin-jiaozhi, "붉은 강이 바다로 드는 삼각주"). land는 원작
            // 그대로 river. wall은 RealmEnemyCity.cs 교지 정의(4600)와
            // 맞춘다.
            ["jiaozhi"] = new RealmCityDef("jiaozhi", "교지", RealmLand.River, agri: 280, comm: 260, wall: 4600, pop: 150000, mapX: 48, mapY: 102),
            // 19차 확장 — 건녕(jianning)의 둘째 목표(원작 LINKS:
            // jianning-zangke, "협곡을 낀 물길" — 건녕은 이미 월수를
            // 갖고 있다, 16차 "형제 가지" 규칙을 원래 세 국경 성 밖으로
            // 처음 확장). 원작 land hill은 다른 성들과 같은 이유로
            // Plain 처리. wall은 RealmEnemyCity.cs 장가 정의(3000)와
            // 맞춘다.
            ["zangke"] = new RealmCityDef("zangke", "장가", RealmLand.Plain, agri: 150, comm: 120, wall: 3000, pop: 50000, mapX: 28, mapY: 98),
            // 51장 "대규모 콘텐츠" 20차 확장(2026-09-18) — 교지(jiaozhi)를
            // 함락한 뒤 이어지는 교주 사슬의 다음 단계(원작 LINKS:
            // jiaozhi-jiuzhen, "벼가 두 번 여무는 들"). land는 원작
            // 그대로 plain. wall은 RealmEnemyCity.cs 구진 정의(3000)와
            // 맞춘다.
            ["jiuzhen"] = new RealmCityDef("jiuzhen", "구진", RealmLand.Plain, agri: 200, comm: 140, wall: 3000, pop: 70000, mapX: 44, mapY: 107),
            // 20차 확장 — 남해(nanhai)의 둘째 목표(원작 LINKS:
            // nanhai-hepu, "진주가 나는 바닷가" — 남해는 이미 창오를
            // 갖고 있다). land는 원작 그대로 river. wall은
            // RealmEnemyCity.cs 합포 정의(3200)와 맞춘다.
            ["hepu"] = new RealmCityDef("hepu", "합포", RealmLand.River, agri: 170, comm: 220, wall: 3200, pop: 85000, mapX: 58, mapY: 99),
            // 51장 "대규모 콘텐츠" 21차 확장(2026-09-18) — 구진(jiuzhen)을
            // 함락한 뒤 이어지는 교주 사슬의 다음 단계(원작 LINKS:
            // jiuzhen-rinan, "한(漢)의 땅이라 부르는 가장 남쪽 끝"). land는
            // 원작이 hill이라 다른 성들과 같은 이유로 Plain 처리. wall은
            // RealmEnemyCity.cs 일남 정의(2800)와 맞춘다.
            ["rinan"] = new RealmCityDef("rinan", "일남", RealmLand.Plain, agri: 160, comm: 120, wall: 2800, pop: 55000, mapX: 42, mapY: 112),
            // 21차 확장 — 건녕(jianning)의 셋째 목표(원작 LINKS:
            // jianning-yunnan, "구름 남쪽의 큰 호수" — 건녕은 이미
            // 월수·장가를 갖고 있다). land는 원작이 mount라 다른 성들과
            // 같은 이유로 Plain 처리. wall은 RealmEnemyCity.cs 운남
            // 정의(2900)와 맞춘다.
            ["yunnan"] = new RealmCityDef("yunnan", "운남", RealmLand.Plain, agri: 140, comm: 130, wall: 2900, pop: 46000, mapX: 8, mapY: 104),
            // 51장 "대규모 콘텐츠" 22차 확장(2026-09-19) — 일남(rinan)을
            // 함락한 뒤 이어지는 교주 사슬의 다음 단계(원작 LINKS:
            // rinan-xianglin, 임읍국이 일어난 바로 그 현). land는 원작
            // 그대로 plain. wall은 RealmEnemyCity.cs 상림 정의(3200)와
            // 맞춘다.
            ["xianglin"] = new RealmCityDef("xianglin", "상림", RealmLand.Plain, agri: 180, comm: 150, wall: 3200, pop: 60000, mapX: 38, mapY: 118),
            // 22차 확장 — 운남(yunnan)을 함락한 뒤 이어지는 남중 사슬의
            // 다음 단계(원작 LINKS: yunnan-yongchang, "머나먼 서쪽 땅").
            // land는 원작 그대로 plain. wall은 RealmEnemyCity.cs 영창
            // 정의(3400)와 맞춘다.
            ["yongchang"] = new RealmCityDef("yongchang", "영창", RealmLand.Plain, agri: 170, comm: 200, wall: 3400, pop: 60000, mapX: -8, mapY: 98),
            // 51장 "대규모 콘텐츠" 23차 확장(2026-09-19) — 상림(xianglin)을
            // 함락한 뒤 이어지는 교주 사슬의 다음 단계(원작 LINKS:
            // xianglin-dianchong, "임읍국의 도성"). land는 원작 그대로
            // plain. wall은 RealmEnemyCity.cs 전충 정의(3800)와 맞춘다.
            ["dianchong"] = new RealmCityDef("dianchong", "전충", RealmLand.Plain, agri: 220, comm: 200, wall: 3800, pop: 72000, mapX: 40, mapY: 128),
            // 23차 확장 — 영창(yongchang)을 함락한 뒤 이어지는 남중 사슬의
            // 다음 단계(원작 LINKS: yongchang-shendu, "한서가 '신독'이라
            // 적은 땅"). land는 원작 그대로 plain. wall은 RealmEnemyCity.cs
            // 신독 정의(4000)와 맞춘다.
            ["shendu"] = new RealmCityDef("shendu", "신독", RealmLand.Plain, agri: 220, comm: 240, wall: 4000, pop: 95000, mapX: -22, mapY: 100),
            // 51장 "대규모 콘텐츠" 24차 확장(2026-09-19) — 전충(dianchong)을
            // 함락한 뒤 이어지는 교주 사슬의 다음 단계, 여기서 끝(원작
            // LINKS에 더 없음). land는 원작 그대로 river. wall은
            // RealmEnemyCity.cs 비경 정의(3000)와 맞춘다.
            ["bijing"] = new RealmCityDef("bijing", "비경", RealmLand.River, agri: 150, comm: 170, wall: 3000, pop: 50000, mapX: 44, mapY: 124),
            // 24차 확장 — 신독(shendu)을 함락한 뒤 이어지는 남중 사슬의
            // 다음 단계(원작 LINKS: shendu-jiantuoluo). land는 원작
            // hill을 Plain으로 보정(이 트랙 enum엔 Hill이 없음). wall은
            // RealmEnemyCity.cs 건타라 정의(3400)와 맞춘다.
            ["jiantuoluo"] = new RealmCityDef("jiantuoluo", "건타라", RealmLand.Plain, agri: 160, comm: 180, wall: 3400, pop: 58000, mapX: -18, mapY: 92),
            // 51장 "대규모 콘텐츠" 25차 확장(2026-09-19) — 상림(xianglin)의
            // 둘째 자식(전충과 형제 가지, 22차가 안 골랐던 쪽). land는
            // 원작 그대로 plain. wall은 RealmEnemyCity.cs 노용 정의(2800)와
            // 맞춘다.
            ["luorong"] = new RealmCityDef("luorong", "노용", RealmLand.Plain, agri: 160, comm: 130, wall: 2800, pop: 46000, mapX: 34, mapY: 122),
            // 25차 확장 — 건타라(jiantuoluo)를 함락한 뒤 이어지는 남중
            // 사슬의 다음 단계이자 이 갈래의 끝. land는 원작 mount를
            // Plain으로 보정(이 트랙 enum엔 Hill/Mount가 없음). wall은
            // RealmEnemyCity.cs 계빈 정의(2800)와 맞춘다.
            ["jibin"] = new RealmCityDef("jibin", "계빈", RealmLand.Plain, agri: 120, comm: 140, wall: 2800, pop: 40000, mapX: -25, mapY: 80),
            // 51장 "대규모 콘텐츠" 26차 확장(2026-09-19) — 신독(shendu)의
            // 둘째 자식(건타라와 형제 가지, 24차가 안 골랐던 쪽). land는
            // 원작 hill을 Plain으로 보정. wall은 RealmEnemyCity.cs 대하
            // 정의(3200)와 맞춘다.
            ["daxia"] = new RealmCityDef("daxia", "대하", RealmLand.Plain, agri: 150, comm: 170, wall: 3200, pop: 52000, mapX: -15, mapY: 86),
            // 51장 "대규모 콘텐츠" 27차 확장(2026-09-19) — 대하(daxia)를
            // 함락한 뒤 이어지는 남중 사슬의 다음 단계이자 이 갈래의 끝.
            // land는 원작 hill을 Plain으로 보정. wall은 RealmEnemyCity.cs
            // 오익산리 정의(2600)와 맞춘다.
            ["wuyishanli"] = new RealmCityDef("wuyishanli", "오익산리", RealmLand.Plain, agri: 110, comm: 130, wall: 2600, pop: 36000, mapX: -32, mapY: 88),
            // 51장 "대규모 콘텐츠" 28차 확장(2026-09-19) — 신독(shendu)의
            // 셋째 자식(건타라·대하와 형제 가지, 신독이 목표 셋으로 늘어난
            // 첫 사례). land는 원작 그대로 plain. wall은 RealmEnemyCity.cs
            // 마게타 정의(3600)와 맞춘다.
            ["moqietuo"] = new RealmCityDef("moqietuo", "마게타", RealmLand.Plain, agri: 200, comm: 190, wall: 3600, pop: 70000, mapX: -30, mapY: 106),
            // 51장 "대규모 콘텐츠" 29차 확장(2026-09-19) — 신독(shendu)의
            // 넷째 자식이자 마지막 이웃(신독 갈래 전부 닫힘). land는 원작
            // 그대로 plain. wall은 RealmEnemyCity.cs 사위 정의(3000)와
            // 맞춘다.
            ["sheyi"] = new RealmCityDef("sheyi", "사위", RealmLand.Plain, agri: 170, comm: 150, wall: 3000, pop: 48000, mapX: -26, mapY: 112),
            // 51장 "대규모 콘텐츠" 30차 확장(2026-09-19) — 노용(luorong)을
            // 함락한 뒤 이어지는 교주 사슬의 다음 단계이자 이 갈래의 끝.
            // land는 원작 그대로 river. wall은 RealmEnemyCity.cs 주오
            // 정의(2600)와 맞춘다.
            ["zhuwu"] = new RealmCityDef("zhuwu", "주오", RealmLand.River, agri: 130, comm: 120, wall: 2600, pop: 38000, mapX: 30, mapY: 130),
        };

        public static RealmCityDef Get(string id) => Catalog.TryGetValue(id, out var d) ? d : null;

        // rtk.js LANDS: plain{agriCap:1.0,commCap:1.0}, river{agriCap:1.0,commCap:1.15}.
        public static float AgriCapMul(RealmLand land) => 1.0f;
        public static float CommCapMul(RealmLand land) => land == RealmLand.River ? 1.15f : 1.0f;

        // rtk.js LANDS: plain{def:1.0,siege:1.0}, river{def:1.1,siege:0.95}(3절 전쟁
        // 슬라이스가 처음 쓴다 — hill/mount는 우리 성·소패 어디도 안 써서 안 옮김).
        public static float DefMul(RealmLand land) => land == RealmLand.River ? 1.1f : 1.0f;
        public static float SiegeMul(RealmLand land) => land == RealmLand.River ? 0.95f : 1.0f;
    }
}
