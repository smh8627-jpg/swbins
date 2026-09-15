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
