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
        public readonly string Name;
        public readonly RealmLand Land;
        public readonly int BaseAgri;
        public readonly int BaseComm;
        public readonly int BaseWall;
        public readonly int BasePop;

        public RealmCityDef(string id, string name, RealmLand land, int agri, int comm, int wall, int pop)
        {
            Id = id;
            Name = name;
            Land = land;
            BaseAgri = agri;
            BaseComm = comm;
            BaseWall = wall;
            BasePop = pop;
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
            ["xuchang"] = new RealmCityDef("xuchang", "허창", RealmLand.Plain, agri: 400, comm: 360, wall: 5400, pop: 260000),
            ["chenliu"] = new RealmCityDef("chenliu", "진류", RealmLand.Plain, agri: 340, comm: 320, wall: 4800, pop: 240000),
            ["puyang"] = new RealmCityDef("puyang", "복양", RealmLand.River, agri: 300, comm: 280, wall: 4600, pop: 210000),
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
