using UnityEngine;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 108 ① "지역 전용 소품 묶음" — 지역 사연(`GoWorldMap.Region.LoreKo`)을 눈으로 읽히게 하는 고정 소품 무더기.
    /// 모델은 Poly Haven 사진측량 스캔(CC0, `Assets/Art/Props/PolyHaven/`, 받는 법 `tools/fetch_polyhaven_models.py`)과
    /// 이미 쓰던 Kenney 돌기둥(`pillar`, 성벽 돌 PBR). 자리는 전부 손으로 박았다(난수 없음) — 상자·역참·무리·NPC·채집 자리와
    /// 떨어져 있어야 하고(`PlaytestGoRegionProps`), 식생은 `Clearing` 안에 나무·풀을 안 세운다(`VegetationBuilder`).
    /// 마을 들판은 이미 집·장터·폐허로 차 있어 뺐다.
    /// </summary>
    public static class GoRegionProps
    {
        /// <summary>Poly Haven 은 실측 미터 — 이 판 사람 키 3.4(실제 약 1.8m)에 맞춰 곱한다. `Piece.Scale` 은 이 배율 위에 또 곱한다.</summary>
        public const float WorldScale = 1.9f;

        public const string Pillar = "pillar";

        public struct Piece
        {
            /// <summary>Poly Haven id(`wooden_crate_01`) · 묶음 안 한 덩이는 `id#노드이름 끝` · Kenney 돌기둥은 `Pillar`.</summary>
            public string Model;
            /// <summary>무더기 가운데에서 m. Y 는 땅(강은 강바닥) 위로 — 밑면을 여기 맞춘다(쌓을 때·물에 띄울 때만 0 아님).</summary>
            public float X, Y, Z;
            public float Yaw, Pitch, Roll;
            /// <summary>Poly Haven 은 `WorldScale` 에 곱하는 배율, 돌기둥은 높이(m).</summary>
            public float Scale;
            /// <summary>밑면을 땅속으로 묻는 깊이(m) — 꽂힌 방패.</summary>
            public float Sink;
            /// <summary>벼락에 그을린 빛(바탕색 × `CharredTint`).</summary>
            public bool Charred;
            /// <summary>상자 충돌(메시 크기). 작은 바구니·들통·눕힌 방패는 밟고 지나간다.</summary>
            public bool Collide;
        }

        public enum Glow { None, Fire, Spark }

        public struct Cluster
        {
            public string Id;
            public string RegionId;
            public string NameKo;
            public float Gx, Gy;
            /// <summary>true 면 강바닥(`TestMapData.RiverBedHeight`)에 선다.</summary>
            public bool InRiver;
            /// <summary>이 반경(m) 안엔 나무·풀을 안 세운다. 0 이면 안 비킨다(강).</summary>
            public float Clearing;
            public Piece[] Pieces;
            public Glow Light;
            public Vector3 LightLocal;
        }

        public static readonly Color CharredTint = new Color(0.42f, 0.4f, 0.4f, 1f);

        private static Piece P(string model, float x, float z, float scale = 1f, float yaw = 0f, bool collide = true) =>
            new Piece { Model = model, X = x, Z = z, Scale = scale, Yaw = yaw, Collide = collide };

        private static Piece Charred(Piece p) { p.Charred = true; return p; }
        private static Piece Tilt(Piece p, float pitch, float roll = 0f) { p.Pitch = pitch; p.Roll = roll; return p; }
        private static Piece Up(Piece p, float y) { p.Y = y; return p; }
        private static Piece Sunk(Piece p, float sink) { p.Sink = sink; return p; }

        private const string Snag = "dead_quiver_trunk";
        private const string Log = "dead_tree_trunk";
        private const string FirePit = "stone_fire_pit";
        private const string Barrel = "wine_barrel_01";
        private const string Crate = "wooden_crate_01";
        private const string Lantern = "wooden_lantern_01";
        private const string Shield = "kite_shield";
        private const string Basket = "wicker_basket_01";
        private const string Bucket = "wooden_bucket_01";
        private const string RockA = "rock_moss_set_02#rock07";
        private const string RockB = "rock_moss_set_02#rock08";
        private const string RockC = "rock_moss_set_02#rock09";
        private const string RockD = "rock_moss_set_02#rock11";
        private const string RockE = "rock_moss_set_02#rock12";
        private const string RockF = "rock_moss_set_02#rock13";

        /// <summary>물 위로 반쯤 뜬 통나무의 밑면 — 강바닥 위 높이.</summary>
        private const float Float = TestMapData.WaterSurfaceHeight - TestMapData.RiverBedHeight - 0.3f;

        public static readonly Cluster[] Clusters =
        {
            // 雷林 — "벼락 맞은 고목이 늘어선 짙은 숲길. 번개귀가 나무 사이를 건너뛴다."
            new Cluster { Id = "thunder_snags", RegionId = "west_wood", NameKo = "벼락 고목", Gx = 0.08f, Gy = 3.6f, Clearing = 10f,
                Light = Glow.Spark, LightLocal = new Vector3(0f, 5.4f, 0f), Pieces = new[] {
                    Charred(P(Snag, 0f, 0f, 3.0f, 20f)),
                    Charred(Tilt(P(Snag, 4.5f, 3.5f, 2.3f, 150f), 0f, 6f)),
                    Charred(Tilt(P(Snag, -3.5f, -4f, 1.8f, 260f), 8f)),
                    Charred(P(Log, 2.2f, -3.6f, 1.9f, 35f)),
                } },
            new Cluster { Id = "thunder_snags_n", RegionId = "west_wood", NameKo = "벼락 고목", Gx = 0.12f, Gy = 2.7f, Clearing = 8f,
                Pieces = new[] {
                    Charred(P(Snag, 0f, 0f, 2.6f, 80f)),
                    Charred(P(Log, -2.6f, 2.2f, 1.6f, 110f)),
                } },
            // 丹林 — "호박빛 단풍 숲에 산적 소굴이 숨어 있다."
            new Cluster { Id = "bandit_camp", RegionId = "east_grove", NameKo = "산적 야영터", Gx = 7.2f, Gy = 3.35f, Clearing = 9f,
                Light = Glow.Fire, LightLocal = new Vector3(0f, 1.1f, 0f), Pieces = new[] {
                    P(FirePit, 0f, 0f),
                    P(Log, 0f, -3.4f, 1.3f, 0f),
                    P(Log, -3.4f, 0.3f, 1.3f, 90f),
                    P(Barrel, 4.0f, 2.6f),
                    P(Barrel, 4.9f, 1.3f, 1f, 40f),
                    P(Crate, -3.8f, 3.4f, 1f, 15f),
                    Up(P(Crate, -3.8f, 3.4f, 1f, 32f), 0.66f),
                    Up(P(Lantern, -3.7f, 3.3f, 1f, 0f, false), 1.32f),
                } },
            // 寒麓 — "무너진 성터 무덤이 흩어진 서늘한 비탈. 해골 병사가 줄지어 지킨다."
            new Cluster { Id = "grave_ruins", RegionId = "north_foot", NameKo = "무너진 성터", Gx = 1.0f, Gy = 0.85f, Clearing = 10f,
                Pieces = new[] {
                    P(Pillar, -3f, -1f, 4.6f),
                    P(Pillar, 2.5f, -2f, 2.2f),
                    P(Pillar, 0.5f, 2.5f, 1.1f),
                    Tilt(P(Pillar, 4.2f, 1.6f, 3.4f, 30f), 90f),
                    P(RockB, -1f, 4f, 1f, 20f),
                    P(RockC, 1.6f, 5f, 0.85f, 70f),
                    P(RockE, -3.6f, 4.4f, 0.8f, 140f),
                    P(Snag, -5.6f, 1f, 2.2f, 300f),
                } },
            new Cluster { Id = "grave_row", RegionId = "north_foot", NameKo = "무덤 줄", Gx = 2.0f, Gy = 0.72f, Clearing = 8f,
                Pieces = new[] {
                    P(RockB, -3f, 0f, 0.9f, 10f),
                    P(RockE, 0f, 0.3f, 0.8f, 95f),
                    P(RockC, 3f, -0.2f, 0.8f, 200f),
                    P(Pillar, 0f, -2.6f, 1.6f),
                } },
            // 廣川 — "마을과 남쪽 땅을 가르는 물줄기." 여울 바위에 떠내려온 통나무가 걸렸다.
            new Cluster { Id = "shoal_e", RegionId = "river", NameKo = "여울 바위", Gx = 5.2f, Gy = 5.0f, InRiver = true,
                Pieces = new[] {
                    P(RockF, 0f, 0f, 1.6f, 30f),
                    P(RockD, -5f, -2f, 1.5f, 200f),
                    P(RockA, 6f, 2.5f, 1.8f, 110f),
                    Up(P(Log, 2.6f, -1.4f, 2.0f, 70f), Float),
                } },
            new Cluster { Id = "shoal_w", RegionId = "river", NameKo = "여울 바위", Gx = 1.7f, Gy = 5.05f, InRiver = true,
                Pieces = new[] {
                    P(RockD, 0f, 0f, 1.6f, 60f),
                    Up(P(Log, -2.4f, 1.2f, 1.6f, 150f), Float),
                } },
            // 金坪 — "옛 망루 발치의 금빛 풀밭. 망루를 지키던 수호장이 아직 서 있다." 쓰러진 수비대의 방패.
            new Cluster { Id = "fallen_guard", RegionId = "south_glade", NameKo = "옛 수비대 자리", Gx = 2.35f, Gy = 7.28f, Clearing = 9f,
                Pieces = new[] {
                    Sunk(Tilt(P(Shield, 0f, 0f, 1f, 10f), -12f), 0.35f),
                    Tilt(P(Shield, 2.2f, 1.5f, 1f, 40f, false), 88f),
                    Tilt(P(Shield, -1.8f, -1.6f, 1f, 200f, false), 85f),
                    P(Pillar, -3.5f, 2.5f, 3.0f),
                    Tilt(P(Pillar, 3.8f, -2.8f, 3.8f, 70f), 90f),
                    P(RockE, -4.5f, -2.5f, 0.9f, 60f),
                } },
            // 末田 — "마른 논둑에 도깨비불이 인다. 산적이 가을걷이를 노린다." 거둬 쌓아 둔 바구니·들통.
            new Cluster { Id = "harvest_yard", RegionId = "farmland", NameKo = "가을걷이 마당", Gx = 3.7f, Gy = 9.28f, Clearing = 7f,
                Pieces = new[] {
                    P(Crate, 0f, 0f, 1f, 10f),
                    P(Crate, 1.7f, 0.4f, 1f, -8f),
                    Up(P(Basket, 0.1f, 0.05f, 1f, 25f, false), 0.66f),
                    P(Basket, -1.6f, 1.0f, 1f, 40f, false),
                    P(Basket, -1.2f, -1.3f, 1f, 100f, false),
                    P(Bucket, 2.6f, -1.4f, 1f, 0f, false),
                    P(Bucket, 3.2f, -0.6f, 1f, 60f, false),
                    P(Barrel, -3.0f, -0.2f),
                } },
        };

        public static Vector3 Center(Cluster c) => TestMapData.WorldPos(c.Gx, c.Gy);

        /// <summary>무더기 밑면 높이 — 강이면 강바닥, 아니면 그 칸 땅.</summary>
        public static float BaseHeight(Cluster c)
        {
            if (c.InRiver) return TestMapData.RiverBedHeight;
            var (gx, gy) = TestMapData.WorldToGrid(Center(c));
            return TestMapData.GroundHeight(gx, gy);
        }

        /// <summary>나무·풀이 비켜야 하는 자리인가(`VegetationBuilder`).</summary>
        public static bool InClearing(Vector3 p)
        {
            foreach (var c in Clusters)
            {
                if (c.Clearing <= 0f) continue;
                Vector3 q = Center(c);
                float dx = p.x - q.x, dz = p.z - q.z;
                if (dx * dx + dz * dz < c.Clearing * c.Clearing) return true;
            }
            return false;
        }
    }
}
