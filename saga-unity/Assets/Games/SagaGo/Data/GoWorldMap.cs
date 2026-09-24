using UnityEngine;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 107-3 "지역 지도" — 지역 일곱·순간이동 지점 다섯·옛 망루 자리를 모은 표(글자 지도 칸 좌표).
    /// 이름은 전부 지어낸 것(실제 지명·원작 이름 아님).
    /// </summary>
    public static class GoWorldMap
    {
        public struct Region
        {
            public string Id;
            public string NameKey;
            public string NameKo;
            public float LabelGx, LabelGy;
        }

        public struct Waypoint
        {
            public string Id;
            public string NameKey;
            public string NameKo;
            public float Gx, Gy;
        }

        public static readonly Region[] Regions =
        {
            new Region { Id = "village",    NameKey = "region.village",    NameKo = "마을 들판",   LabelGx = 3f,   LabelGy = 3f },
            new Region { Id = "west_wood",  NameKey = "region.west_wood",  NameKo = "서쪽 숲길",   LabelGx = 0f,   LabelGy = 3f },
            new Region { Id = "east_grove", NameKey = "region.east_grove", NameKo = "동쪽 숲",     LabelGx = 7f,   LabelGy = 2.6f },
            new Region { Id = "north_foot", NameKey = "region.north_foot", NameKo = "북쪽 산기슭", LabelGx = 2.5f, LabelGy = 0.6f },
            new Region { Id = "river",      NameKey = "region.river",      NameKo = "너른 강",     LabelGx = 5.5f, LabelGy = 5f },
            new Region { Id = "south_glade",NameKey = "region.south_glade",NameKo = "남쪽 공터",   LabelGx = 3f,   LabelGy = 7f },
            new Region { Id = "farmland",   NameKey = "region.farmland",   NameKo = "끝 논밭",     LabelGx = 3f,   LabelGy = 9.3f },
        };

        public static readonly Waypoint[] Waypoints =
        {
            new Waypoint { Id = "wp_village", NameKey = "wp.village", NameKo = "마을 역참",     Gx = 3.4f, Gy = 2.25f },
            new Waypoint { Id = "wp_east",    NameKey = "wp.east",    NameKo = "동쪽 숲 역참",  Gx = 6.4f, Gy = 3.0f },
            new Waypoint { Id = "wp_north",   NameKey = "wp.north",   NameKo = "산기슭 역참",   Gx = 2.6f, Gy = 1.35f },
            new Waypoint { Id = "wp_south",   NameKey = "wp.south",   NameKo = "남쪽 공터 역참", Gx = 3.0f, Gy = 7.25f },
            new Waypoint { Id = "wp_farm",    NameKey = "wp.farm",    NameKo = "논밭 역참",     Gx = 2.4f, Gy = 9.2f },
        };

        /// <summary>옛 망루 — 길목(3,6) 옆 안쪽 산 고원 위. 마을에서 남쪽으로 보인다.</summary>
        public const int TowerGx = 4;
        public const int TowerGy = 6;
        public const float TowerHeight = 24f;
        public const float TowerWidth = 8f;

        public const float WaypointActivateRadius = 7f;

        /// <summary>PLAN.md 107-3 "지역마다 바이옴" — 안개 빛깔·짙기(기본 `SkyFogBuilder.FogDensity` 배율)·햇빛 빛깔(곱).
        /// 경계를 넘으면 `RegionAtmosphere` 가 몇 초에 걸쳐 스며들듯 바꾼다.</summary>
        public struct Atmosphere
        {
            public string RegionId;
            public Color Fog;
            public float DensityMul;
            public Color Sun;
        }

        public static readonly Atmosphere[] Atmospheres =
        {
            new Atmosphere { RegionId = "village",     Fog = new Color(0.85f, 0.72f, 0.58f), DensityMul = 1.0f, Sun = new Color(1f, 1f, 1f) },          // 기본 노을빛
            new Atmosphere { RegionId = "west_wood",   Fog = new Color(0.60f, 0.68f, 0.52f), DensityMul = 2.2f, Sun = new Color(0.88f, 0.98f, 0.84f) }, // 짙은 숲 녹빛
            new Atmosphere { RegionId = "east_grove",  Fog = new Color(0.80f, 0.64f, 0.48f), DensityMul = 1.6f, Sun = new Color(1f, 0.9f, 0.78f) },     // 호박빛 숲
            new Atmosphere { RegionId = "north_foot",  Fog = new Color(0.64f, 0.68f, 0.76f), DensityMul = 2.0f, Sun = new Color(0.86f, 0.9f, 1f) },     // 서늘한 산 회청
            new Atmosphere { RegionId = "river",       Fog = new Color(0.68f, 0.77f, 0.86f), DensityMul = 2.6f, Sun = new Color(0.9f, 0.95f, 1f) },     // 물안개
            new Atmosphere { RegionId = "south_glade", Fog = new Color(0.93f, 0.78f, 0.54f), DensityMul = 1.2f, Sun = new Color(1f, 0.92f, 0.76f) },    // 금빛 공터
            new Atmosphere { RegionId = "farmland",    Fog = new Color(0.90f, 0.83f, 0.60f), DensityMul = 0.9f, Sun = new Color(1f, 0.96f, 0.82f) },    // 밀빛 논밭
        };

        public static Atmosphere AtmosphereOf(string regionId)
        {
            foreach (var a in Atmospheres) if (a.RegionId == regionId) return a;
            return Atmospheres[0];
        }

        /// <summary>칸 → 지역 id. 산 칸은 그 줄 지역에 속한다.</summary>
        public static string RegionAt(int gx, int gy)
        {
            if (gy <= 1) return gx >= 6 ? "east_grove" : "north_foot";
            if (gy <= 4)
            {
                if (gx <= 0) return "west_wood";
                if (gx >= 6) return "east_grove";
                return "village";
            }
            if (gy == 5) return "river";
            if (gy <= 8) return "south_glade";
            return "farmland";
        }

        public static string RegionAt(Vector3 world)
        {
            var (gx, gy) = TestMapData.WorldToGrid(world);
            return RegionAt(Mathf.Clamp(gx, 0, TestMapData.Cols - 1), Mathf.Clamp(gy, 0, TestMapData.RowCount - 1));
        }

        public static string RegionName(string id)
        {
            foreach (var r in Regions) if (r.Id == id) return GoLocalization.T(r.NameKey, r.NameKo);
            return id;
        }

        public static string WaypointName(Waypoint w) => GoLocalization.T(w.NameKey, w.NameKo);

        /// <summary>지점 돌기둥이 서는 자리(땅 높이 포함).</summary>
        public static Vector3 WaypointPos(Waypoint w)
        {
            var (gx, gy) = TestMapData.WorldToGrid(TestMapData.WorldPos(w.Gx, w.Gy));
            return TestMapData.WorldPos(w.Gx, w.Gy) + Vector3.up * TestMapData.GroundHeight(gx, gy);
        }

        /// <summary>순간이동해 내리는 자리 — 돌기둥 남쪽 4m.</summary>
        public static Vector3 ArrivalPos(Waypoint w) => WaypointPos(w) + new Vector3(0f, 0.3f, 4f);

        /// <summary>월드 좌표 → 글자 지도 연속 좌표(칸 중심 = 정수).</summary>
        public static Vector2 WorldToGridF(Vector3 world)
        {
            return new Vector2(world.x / TestMapData.TileSize + TestMapData.Cols * 0.5f,
                               world.z / TestMapData.TileSize + TestMapData.RowCount * 0.5f);
        }
    }
}
