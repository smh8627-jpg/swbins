using UnityEngine;
using Saga.Go.Data;

namespace Saga.Go.World
{
    /// <summary>
    /// PLAN.md 28~31장 — 지도 위 이름난 자리(랜드마크): 굴 입구·마을집·폐허·
    /// 다리·산신당. saga-godot의 landmarks_builder.gd와 같은 자리·같은 크기.
    ///
    /// 2026-09-12 GLB 도입(PLAN.md 8장) — Kenney Fantasy Town Kit·Modular
    /// Cave Kit(CC0, saga-godot 트랙과 같은 파일, docs/ASSET_GUIDE.md 참고)로
    /// 굴 입구·마을집 벽/지붕·폐허 기둥·다리 널판을 교체했다. GLB를 못 찾으면
    /// (다른 PC 등) 예전 primitive로 대체한다.
    ///
    /// **산신당은 그때 미뤄 뒀다가(altar-stone.glb가 기둥 4개짜리 옛 구조와
    /// 형태가 많이 달라 재설계가 필요했다) 같은 날 후속 조각으로 처리했다**
    /// — saga-godot landmarks_builder.gd의 SHRINE_SIZE/SHRINE_SCALE을 그대로
    /// 옮겨 받침대+기둥 4개 구조를 통째로 걷어내고 작은 제단 하나로 바꿨다
    /// (아래 BuildShrine() 참고).
    /// </summary>
    public class LandmarksBuilder : MonoBehaviour
    {
        private static readonly Color CaveColor = new Color(0.12f, 0.12f, 0.14f);
        private static readonly Color WallColor = new Color(0.72f, 0.6f, 0.4f);
        private static readonly Color RoofColor = new Color(0.45f, 0.18f, 0.14f);
        private static readonly Color RuinColor = new Color(0.5f, 0.48f, 0.46f);
        private static readonly Color BridgeColor = new Color(0.42f, 0.3f, 0.18f);
        private static readonly Color ShrineColor = new Color(0.62f, 0.52f, 0.3f);

        // docs/ASSET_GUIDE.md 실측 표와 같은 값(같은 TileSize=48 세계 축척이라
        // saga-godot 스케일을 그대로 재사용) — 편집기 빌드 스크립트가 Init()으로
        // 채워 준다(NpcBuilder.cs와 같은 이유, 런타임 Awake()는 AssetDatabase를
        // 못 쓴다).
        [SerializeField] private GameObject caveModel;   // gate-rock.glb, 실측 4.00×4.05×2.45, ×1.48
        [SerializeField] private GameObject wallModel;    // wall-block.glb, 실측 1×1×1(비균등 스케일=벽 크기 그대로)
        [SerializeField] private GameObject roofModel;    // roof-gable.glb, 실측 1.1×0.57×1.07, ×10(균일)
        [SerializeField] private GameObject pillarModel;  // pillar-stone.glb, 실측 0.16×1.0×0.16, 스케일=높이
        [SerializeField] private GameObject plankModel;   // planks.glb, 실측 1×0.06×1, 44개 이어 붙임
        [SerializeField] private GameObject shrineModel;  // altar-stone.glb, 실측 1.04×0.49×0.65, ×2.5(균일)

        public void Init(GameObject cave, GameObject wall, GameObject roof, GameObject pillar, GameObject plank, GameObject shrine)
        {
            caveModel = cave;
            wallModel = wall;
            roofModel = roof;
            pillarModel = pillar;
            plankModel = plank;
            shrineModel = shrine;
        }

        private void Awake()
        {
            // 이미 저장된 씬을 실제 Play로 열면 Awake가 다시 불려 Build()를
            // 또 돌리는데, 편집기 빌드 스크립트가 이미 자식들을 만들어 둔
            // 뒤라 그대로 두면 랜드마크가 두 벌씩 겹쳐 생긴다 — NpcBuilder.cs와
            // 같은 방어(2026-09-12 GLB 교체 때 같이 발견).
            if (transform.childCount > 0) return;
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
            Vector3 pos = TestMapData.WorldPos(3, 0) + new Vector3(0, ground, 0);

            if (caveModel != null)
            {
                var cave = Object.Instantiate(caveModel, transform);
                cave.name = "CaveEntrance";
                cave.transform.position = pos;
                const float scale = 1.48f; // docs/ASSET_GUIDE.md — 목표 높이 6m
                cave.transform.localScale = Vector3.one * scale;

                // GLB엔 콜라이더가 없다 — 실측 로컬 AABB(바닥 피벗)로 직접 추가.
                var col = cave.AddComponent<BoxCollider>();
                col.center = new Vector3(0f, 2.025f, 0f);
                col.size = new Vector3(4.0f, 4.05f, 2.45f);
            }
            else
            {
                var size = new Vector3(10f, 6f, 4f);
                var box = CreateBox("CaveEntrance", pos + Vector3.up * (size.y * 0.5f), size, CaveColor);
                box.transform.SetParent(transform, true);
            }
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

                if (wallModel != null)
                {
                    // wall-block.glb 실측이 정확히 1×1×1이라 비균등 스케일을
                    // bodySize 그대로 넣으면 예전 박스 발자국과 완전히 같다.
                    var wall = Object.Instantiate(wallModel, house.transform);
                    wall.name = "Wall";
                    wall.transform.localPosition = Vector3.zero;
                    wall.transform.localScale = bodySize;
                    var col = wall.AddComponent<BoxCollider>();
                    col.center = new Vector3(0f, 0.5f, 0f);
                    col.size = Vector3.one;
                }
                else
                {
                    var wall = CreateBox("Wall", basePos + Vector3.up * (bodySize.y * 0.5f), bodySize, WallColor);
                    wall.transform.SetParent(house.transform, true);
                }

                if (roofModel != null)
                {
                    // roof-gable.glb — docs/ASSET_GUIDE.md와 같은 균일 ×10(saga-godot
                    // 실측 기준). 지붕은 밟고 다니는 자리가 아니라 콜라이더 없음(기존과 동일).
                    var roof = Object.Instantiate(roofModel, house.transform);
                    roof.name = "Roof";
                    roof.transform.localPosition = new Vector3(0f, bodySize.y, 0f);
                    roof.transform.localScale = Vector3.one * 10f;
                }
                else
                {
                    var roof = CreateBox("Roof", basePos + Vector3.up * (bodySize.y + roofSize.y * 0.5f), roofSize, RoofColor, withCollider: false);
                    roof.transform.SetParent(house.transform, true);
                }
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
                Vector3 pos = basePos + new Vector3(offsets[i].x, 0f, offsets[i].y);
                SpawnPillar($"RuinPillar_{i}", pos, height, RuinColor);
            }
        }

        // ---- 다리 --------------------------------------------------------

        /// <summary>
        /// 충돌은 TerrainBuilder.BuildCollision이 'B' 타일에 이미 같은 높이로
        /// 놓아 뒀다(saga-godot landmarks_builder.gd의 같은 결정 — 두 곳이
        /// 각자 만들면 겹친다) — 여기 널판은 순전히 눈에 보이는 다리 덱이라
        /// 충돌체를 안 둔다. planks.glb(실측 1×0.06×1)를 이어 붙인다 —
        /// saga-godot도 같은 폭(44개)으로 이어 붙였다(docs/ASSET_GUIDE.md).
        /// </summary>
        private void BuildBridge()
        {
            float bed = TestMapData.Legend['B'].Height;
            Vector3 center = TestMapData.WorldPos(3, 5) + new Vector3(0, bed + TestMapData.BridgeClearance, 0);
            const float width = 6f;
            float depth = TestMapData.TileSize * 0.92f;

            if (plankModel != null)
            {
                var deck = new GameObject("Bridge");
                deck.transform.SetParent(transform, false);

                int count = Mathf.RoundToInt(depth);
                float plankLength = depth / count;
                for (int i = 0; i < count; i++)
                {
                    float z = center.z + (i - (count - 1) * 0.5f) * plankLength;
                    var plank = Object.Instantiate(plankModel, deck.transform);
                    plank.name = "Plank";
                    plank.transform.position = new Vector3(center.x, center.y - 0.03f, z);
                    plank.transform.localScale = new Vector3(width, 1f, plankLength);
                }
            }
            else
            {
                var size = new Vector3(width, 0.6f, depth);
                var bridge = CreateBox("Bridge", center, size, BridgeColor, withCollider: false);
                bridge.transform.SetParent(transform, true);
            }
        }

        // ---- 산신당 --------------------------------------------------------

        // saga-godot landmarks_builder.gd의 SHRINE_SIZE/SHRINE_SCALE 그대로
        // (altar-stone.glb, CC0 Kenney Graveyard Kit, 바닥 중앙 피벗) —
        // gate-rock.glb와 같은 이유로(실제 돌 표면 굴곡이 있는 조각) 균일
        // 스케일만 쓴다. 최종 크기 약 2.6×1.23×1.63m.
        private static readonly Vector3 ShrineSize = new Vector3(1.04f, 0.49f, 0.65f);
        private const float ShrineScale = 2.5f;

        /// <summary>
        /// PLAN.md 8장 "실제 3D 에셋" — 2026-09-12 재설계. 예전엔 받침대
        /// 박스(5×0.6×5)+기둥 4개짜리 구조였는데, 실제로 받아 온
        /// altar-stone.glb는 작은 제단 하나짜리 모양이라 그 구조를 통째로
        /// 걷어내고 saga-godot과 같은 단일 제단으로 바꿨다.
        /// </summary>
        private void BuildShrine()
        {
            float ground = TestMapData.Legend['S'].Height;
            Vector3 basePos = TestMapData.WorldPos(5, 1) + new Vector3(0, ground, 0);

            if (shrineModel != null)
            {
                var altar = Object.Instantiate(shrineModel, transform);
                altar.name = "ShrineAltar";
                altar.transform.position = basePos;
                altar.transform.localScale = Vector3.one * ShrineScale;

                // GLB엔 콜라이더가 없다 — 실측 로컬 AABB(바닥 피벗)로 직접 추가.
                var col = altar.AddComponent<BoxCollider>();
                col.center = new Vector3(0f, ShrineSize.y * 0.5f, 0f);
                col.size = ShrineSize;
            }
            else
            {
                var size = ShrineSize * ShrineScale;
                var altar = CreateBox("ShrineAltar", basePos + Vector3.up * (size.y * 0.5f), size, ShrineColor);
                altar.transform.SetParent(transform, true);
            }
        }

        // ---- 공통 --------------------------------------------------------

        /// <summary>pillar-stone.glb(실측 0.16×1.0×0.16, 바닥 피벗) — 스케일이
        /// 곧 목표 높이(docs/ASSET_GUIDE.md "높이=스케일값"). GLB가 없으면
        /// 예전 primitive Cylinder로 대체한다.</summary>
        private void SpawnPillar(string name, Vector3 groundPos, float height, Color color)
        {
            if (pillarModel != null)
            {
                var pillar = Object.Instantiate(pillarModel, transform);
                pillar.name = name;
                pillar.transform.position = groundPos;
                pillar.transform.localScale = Vector3.one * height;
                var col = pillar.AddComponent<CapsuleCollider>();
                col.radius = 0.08f;
                col.height = 1f;
                col.direction = 1; // Y축
            }
            else
            {
                const float radius = 0.6f;
                var pillar = CreateCylinder(name, groundPos + Vector3.up * (height * 0.5f), radius, height, color);
                pillar.transform.SetParent(transform, true);
            }
        }

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
