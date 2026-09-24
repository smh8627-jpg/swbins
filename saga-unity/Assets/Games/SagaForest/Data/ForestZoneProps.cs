using UnityEngine;

namespace Saga.Forest.Data
{
    /// <summary>
    /// PLAN.md 108 끝줄 "FOREST 존 전용 소품" — 존마다 무더기 둘. 모델은 GO 지역 소품과 같은 Poly Haven 사진측량 스캔
    /// (`Assets/Art/Props/PolyHaven/`, CC0 — 에셋만 같이 쓰고 코드는 이 판 것). 자리는 존 가운데에서 바깥 방향 부호(sx·sz)를 곱한 오프셋:
    /// 존마다 이미 den 둘(가운데·(6sx,4sz))·도감 채집 자리(−6sx,−6sz)·우편함(8sx,0)·명소(0,7sz)가 있어
    /// 그와 5m 넘게 떨어진 두 곳 — A(−7sx, 2sz)·B(3sx, −7sz) — 에 둔다(`PlaytestForestZoneProps`).
    /// PBR 조각은 `ForestWorldCurve` 셰이더를 안 타니 조각마다 땅 휨만큼 내린다(`ForestZonePropsFollow`).
    /// </summary>
    public static class ForestZoneProps
    {
        /// <summary>Poly Haven 은 실측 미터 — 이 판은 사람 키가 실제와 같은 1.8m(주민·Maria `PlayerTargetHeight`)라 그대로.
        /// (`CharacterVisual.NativeHeight` 2.7 은 Kenney 모델 원래 키일 뿐 — 처음에 이걸 사람 키로 잘못 읽어 1.5배로 뒀다.)</summary>
        public const float WorldScale = 1.0f;

        public struct Piece
        {
            /// <summary>Poly Haven id · 묶음 안 한 덩이는 `id#노드이름 끝`.</summary>
            public string Model;
            /// <summary>무더기 가운데에서 m(부호는 존 방향을 곱하기 전). Y 는 쌓을 때만.</summary>
            public float X, Y, Z;
            public float Yaw;
            public float Scale;
            public bool Collide;
        }

        public struct Cluster
        {
            public string Id;
            public string ZoneKey;
            public string NameKo;
            /// <summary>존 가운데에서(부호 곱하기 전).</summary>
            public float Ax, Az;
            public Piece[] Pieces;
        }

        private static Piece P(string model, float x, float z, float scale = 1f, float yaw = 0f, bool collide = true) =>
            new Piece { Model = model, X = x, Z = z, Scale = scale, Yaw = yaw, Collide = collide };
        private static Piece Up(Piece p, float y) { p.Y = y; return p; }

        private const string Snag = "dead_quiver_trunk";
        private const string Log = "dead_tree_trunk";
        private const string Barrel = "wine_barrel_01";
        private const string Crate = "wooden_crate_01";
        private const string Lantern = "wooden_lantern_01";
        private const string Basket = "wicker_basket_01";
        private const string Bucket = "wooden_bucket_01";
        private const string RockA = "rock_moss_set_02#rock07";
        private const string RockB = "rock_moss_set_02#rock08";
        private const string RockC = "rock_moss_set_02#rock09";
        private const string RockD = "rock_moss_set_02#rock11";
        private const string RockE = "rock_moss_set_02#rock12";
        private const string RockF = "rock_moss_set_02#rock13";

        public const float AX = -7f, AZ = 2f, BX = 3f, BZ = -7f;

        public static readonly Cluster[] Clusters =
        {
            // 暗林 — 숲도깨비·안개유령. 쓰러진 고목과 이끼 바위.
            new Cluster { Id = "dark_a", ZoneKey = "dark_forest", NameKo = "이끼 고목", Ax = AX, Az = AZ, Pieces = new[] {
                P(Snag, 0f, 0f, 1.6f, 30f),
                P(Log, 1.2f, 1.4f, 0.9f, 70f),
                P(RockB, -1.3f, -0.8f, 0.8f, 10f),
            } },
            new Cluster { Id = "dark_b", ZoneKey = "dark_forest", NameKo = "버려진 등롱", Ax = BX, Az = BZ, Pieces = new[] {
                P(RockE, 0f, 0f, 0.9f, 140f),
                P(Lantern, 0.9f, -0.7f, 1f, 20f, false),
                P(RockC, 1.5f, 0.9f, 0.6f, 60f),
            } },
            // 巖野 — 바위도깨비·무쇠도깨비. 굴러온 바위와 캐다 만 광부 짐.
            new Cluster { Id = "rocky_a", ZoneKey = "rocky", NameKo = "굴러온 바위", Ax = AX, Az = AZ, Pieces = new[] {
                P(RockF, 0f, 0f, 1.1f, 20f),
                P(RockD, 1.8f, 1.2f, 0.9f, 200f),
                P(RockA, -1.6f, 1.0f, 1.0f, 110f),
            } },
            new Cluster { Id = "rocky_b", ZoneKey = "rocky", NameKo = "광부 짐", Ax = BX, Az = BZ, Pieces = new[] {
                P(Crate, 0f, 0f, 1f, 15f),
                Up(P(Crate, 0.05f, 0.1f, 1f, -10f), 0.35f),
                P(Bucket, 1.2f, -0.4f, 1f, 30f, false),
                P(Barrel, -1.2f, 0.3f),
            } },
            // 菌林 — 버섯정령·포자괴물. 버섯이 돋을 썩은 통나무와 버섯 바구니.
            new Cluster { Id = "mushroom_a", ZoneKey = "mushroom_forest", NameKo = "썩은 통나무", Ax = AX, Az = AZ, Pieces = new[] {
                P(Log, 0f, 0f, 1.1f, 20f),
                P(RockC, 0.9f, 1.4f, 0.7f, 95f),
                P(Snag, -1.8f, -0.6f, 1.2f, 200f),
            } },
            new Cluster { Id = "mushroom_b", ZoneKey = "mushroom_forest", NameKo = "버섯 바구니", Ax = BX, Az = BZ, Pieces = new[] {
                P(Basket, 0f, 0f, 1f, 40f, false),
                P(Basket, 0.8f, 0.5f, 1f, 130f, false),
                P(RockB, -1.1f, 0.4f, 0.6f, 80f),
            } },
            // 花原 — 꽃정령·나비정령. 꽃 따러 온 소풍 자리.
            new Cluster { Id = "flower_a", ZoneKey = "flower_field", NameKo = "꽃 따는 자리", Ax = AX, Az = AZ, Pieces = new[] {
                P(Basket, 0f, 0f, 1f, 10f, false),
                P(Basket, 0.7f, -0.5f, 1f, 75f, false),
                P(Bucket, -0.8f, 0.4f, 1f, 0f, false),
            } },
            new Cluster { Id = "flower_b", ZoneKey = "flower_field", NameKo = "쉼터", Ax = BX, Az = BZ, Pieces = new[] {
                P(Log, 0f, 0f, 0.9f, 0f),
                P(Crate, 1.9f, 0.4f, 1f, 20f),
                Up(P(Lantern, 1.9f, 0.45f, 1f, 0f, false), 0.35f),
                P(Barrel, -1.9f, -0.2f, 1f, 30f),
            } },
        };

        public static int ZoneIndex(string key)
        {
            for (int i = 0; i < ForestBiomeData.Zones.Length; i++) if (ForestBiomeData.Zones[i].Key == key) return i;
            return -1;
        }

        /// <summary>존 바깥 방향 부호 — 존 가운데가 원점에서 어느 쪽인가.</summary>
        public static Vector2 Signs(string zoneKey)
        {
            var c = ForestBiomeData.Zones[ZoneIndex(zoneKey)].Center;
            return new Vector2(c.x >= 0f ? 1f : -1f, c.y >= 0f ? 1f : -1f);
        }

        public static Vector3 Center(Cluster c)
        {
            var z = ForestBiomeData.Zones[ZoneIndex(c.ZoneKey)].Center;
            var s = Signs(c.ZoneKey);
            return new Vector3(z.x + c.Ax * s.x, 0f, z.y + c.Az * s.y);
        }

        public static Vector3 PiecePos(Cluster c, Piece p)
        {
            var s = Signs(c.ZoneKey);
            return Center(c) + new Vector3(p.X * s.x, 0f, p.Z * s.y);
        }
    }
}
