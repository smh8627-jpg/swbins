using UnityEngine;
using Saga.Go.Data;

namespace Saga.Go.World
{
    /// <summary>
    /// PLAN.md 28~31장 — 지도 위 이름난 자리(랜드마크): 굴 입구·마을집·폐허·
    /// 다리·산신당. saga-godot의 landmarks_builder.gd와 같은 자리·같은 크기지만,
    /// 아직 GLB 전(PLAN.md 8장)이라 개수가 적은 이 자리들은 VegetationBuilder
    /// 처럼 결합 메시로 묶을 필요 없이 Unity 기본 primitive(Cube/Cylinder)를
    /// 그대로 쓴다 — draw call 몇 개 늘어나는 건 여기선 문제가 안 된다.
    /// </summary>
    public class LandmarksBuilder : MonoBehaviour
    {
        private static readonly Color CaveColor = new Color(0.12f, 0.12f, 0.14f);
        private static readonly Color WallColor = new Color(0.72f, 0.6f, 0.4f);
        private static readonly Color RoofColor = new Color(0.45f, 0.18f, 0.14f);
        private static readonly Color RuinColor = new Color(0.5f, 0.48f, 0.46f);
        private static readonly Color BridgeColor = new Color(0.42f, 0.3f, 0.18f);
        private static readonly Color ShrineColor = new Color(0.62f, 0.52f, 0.3f);

        private void Awake()
        {
            Build();
        }

        public void Build()
        {
            BuildCave();
            BuildVillage();
            BuildRuins();
            BuildBridge();
            BuildShrine();
            MarkStatic();
        }

        /// <summary>PLAN.md 76장 Mobile Performance Pass — 굴 입구·마을집·
        /// 폐허·다리는 절대 안 움직이니 정적 배칭·오클루전 컬링 대상으로
        /// 표시한다.</summary>
        private void MarkStatic()
        {
            foreach (Transform t in GetComponentsInChildren<Transform>(true))
            {
                t.gameObject.isStatic = true;
            }
        }

        // ---- 굴 입구 --------------------------------------------------------

        private void BuildCave()
        {
            float ground = TestMapData.Legend['C'].Height;
            var size = new Vector3(10f, 6f, 4f);
            Vector3 pos = TestMapData.WorldPos(3, 0) + new Vector3(0, ground + size.y * 0.5f, 0);
            var cave = CreateBox("CaveEntrance", pos, size, CaveColor);
            cave.transform.SetParent(transform, true);
        }

        // ---- 마을집 --------------------------------------------------------

        private void BuildVillage()
        {
            float ground = TestMapData.Legend['H'].Height;
            var bodySize = new Vector3(10f, 4f, 10f);
            var roofSize = new Vector3(11f, 1.2f, 11f);

            foreach (int gx in new[] { 2, 3 })
            {
                Vector3 basePos = TestMapData.WorldPos(gx, 3) + new Vector3(0, ground, 0);

                var house = new GameObject($"House_{gx}");
                house.transform.SetParent(transform, false);
                house.transform.position = basePos;

                var wall = CreateBox("Wall", basePos + Vector3.up * (bodySize.y * 0.5f), bodySize, WallColor);
                wall.transform.SetParent(house.transform, true);

                var roof = CreateBox("Roof", basePos + Vector3.up * (bodySize.y + roofSize.y * 0.5f), roofSize, RoofColor, withCollider: false);
                roof.transform.SetParent(house.transform, true);
            }
        }

        // ---- 폐허 --------------------------------------------------------

        private void BuildRuins()
        {
            float ground = TestMapData.Legend['R'].Height;
            Vector3 basePos = TestMapData.WorldPos(5, 3) + new Vector3(0, ground, 0);
            var offsets = new[] { new Vector2(-3, -2), new Vector2(2, 1), new Vector2(-1, 3) };

            for (int i = 0; i < offsets.Length; i++)
            {
                float height = 5f + (i % 2) * 1.5f;
                const float radius = 0.6f;
                Vector3 pos = basePos + new Vector3(offsets[i].x, height * 0.5f, offsets[i].y);
                var pillar = CreateCylinder($"RuinPillar_{i}", pos, radius, height, RuinColor);
                pillar.transform.SetParent(transform, true);
            }
        }

        // ---- 다리 --------------------------------------------------------

        /// <summary>
        /// 충돌은 TerrainBuilder.BuildCollision이 'B' 타일에 이미 같은 높이로
        /// 놓아 뒀다(saga-godot landmarks_builder.gd의 같은 결정 — 두 곳이
        /// 각자 만들면 겹친다) — 여기 널판은 순전히 눈에 보이는 다리 덱이라
        /// 충돌체를 안 둔다.
        /// </summary>
        private void BuildBridge()
        {
            float bed = TestMapData.Legend['B'].Height;
            Vector3 pos = TestMapData.WorldPos(3, 5) + new Vector3(0, bed + TestMapData.BridgeClearance, 0);
            var size = new Vector3(6f, 0.6f, TestMapData.TileSize * 0.92f);
            var bridge = CreateBox("Bridge", pos, size, BridgeColor, withCollider: false);
            bridge.transform.SetParent(transform, true);
        }

        // ---- 산신당 --------------------------------------------------------

        /// <summary>
        /// PLAN.md 51장 GO 월드 확장 — Legend엔 처음부터 있었지만 Rows엔 한
        /// 번도 안 쓰였던 'S'(사당) 타일을 처음 심는다(TestMapData.cs 2026-
        /// 09-11). 지도 격자 수는 그대로라 WorldPos()가 계산하는 나머지
        /// 모든 좌표가 안 밀린다 — 칸 하나 종류만 바꿨다.
        /// </summary>
        private void BuildShrine()
        {
            float ground = TestMapData.Legend['S'].Height;
            Vector3 basePos = TestMapData.WorldPos(5, 1) + new Vector3(0, ground, 0);

            var baseSize = new Vector3(5f, 0.6f, 5f);
            var baseBlock = CreateBox("ShrineBase", basePos + Vector3.up * (baseSize.y * 0.5f), baseSize, ShrineColor);
            baseBlock.transform.SetParent(transform, true);

            const float pillarHeight = 3.2f;
            const float pillarRadius = 0.35f;
            foreach (var offset in new[] { new Vector2(-1.6f, -1.6f), new Vector2(1.6f, -1.6f), new Vector2(-1.6f, 1.6f), new Vector2(1.6f, 1.6f) })
            {
                Vector3 pos = basePos + new Vector3(offset.x, baseSize.y + pillarHeight * 0.5f, offset.y);
                var pillar = CreateCylinder("ShrinePillar", pos, pillarRadius, pillarHeight, ShrineColor);
                pillar.transform.SetParent(transform, true);
            }
        }

        // ---- 공통 --------------------------------------------------------

        private static GameObject CreateBox(string name, Vector3 center, Vector3 size, Color color, bool withCollider = true)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.position = center;
            go.transform.localScale = size;
            if (!withCollider)
            {
                Object.DestroyImmediate(go.GetComponent<Collider>());
            }
            go.GetComponent<MeshRenderer>().sharedMaterial = MakeMaterial(color);
            return go;
        }

        private static GameObject CreateCylinder(string name, Vector3 center, float radius, float height, Color color)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            go.name = name;
            go.transform.position = center;
            // 기본 Cylinder는 반지름 0.5·높이 2.
            go.transform.localScale = new Vector3(radius * 2f, height * 0.5f, radius * 2f);
            go.GetComponent<MeshRenderer>().sharedMaterial = MakeMaterial(color);
            return go;
        }

        private static Material MakeMaterial(Color color)
        {
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "Landmark (generated)" };
            mat.color = color;
            return mat;
        }
    }
}
