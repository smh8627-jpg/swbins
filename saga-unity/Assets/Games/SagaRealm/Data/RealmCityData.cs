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
