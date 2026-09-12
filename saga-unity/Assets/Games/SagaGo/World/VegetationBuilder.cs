using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using Saga.Go.Data;

namespace Saga.Go.World
{
    /// <summary>
    /// PLAN.md 28~31장 — Vegetation/Rock 배치. saga-godot의 vegetation_builder.gd와
    /// 같은 원칙("자리는 시각의 순수 함수다"): 매 프레임 새로 뽑지 않고, 격자
    /// 좌표에서 결정적으로 해시해 늘 같은 자리에 같은 나무·바위가 선다.
    ///
    /// 2026-09-12 GLB 도입(PLAN.md 8장) — Kenney Nature Kit(CC0, saga-godot
    /// 트랙과 같은 파일, docs/ASSET_GUIDE.md 참고) tree_oak·rock_largeA·
    /// rock_smallA를 나무 한 그루/바위 하나씩 그대로 인스턴스화한다.
    /// TerrainBuilder처럼 하나의 결합 메시로 안 묶는 이유 — Unity의
    /// StaticBatchingUtility.Combine()(GameBootstrap.cs, PLAN.md 76장)이
    /// 이미 static MeshRenderer들을 같은 머티리얼끼리 자동으로 묶어 주므로,
    /// 직접 정점을 베이크하는 것보다 표준적이고 UV·텍스처도 그대로 산다.
    /// GLB를 못 찾으면(다른 PC 등) 예전 결합 메시 방식으로 대체한다.
    /// </summary>
    public class VegetationBuilder : MonoBehaviour
    {
        private const int TreesPerForestTile = 3;
        private const int RocksPerMountainTile = 1;

        // saga-godot의 tree_oak.glb 실측(0.64×1.23×0.74) 기준 스케일(docs/
        // ASSET_GUIDE.md 표와 동일 — 같은 TileSize=48 세계 축척이라 그대로
        // 재사용). 나무마다 s(0.7~1.3)를 곱해 크기 변주를 준다(기존 방식 유지).
        private const float TreeScale = 4.5f;
        private const float RockLargeScale = 2.6f;
        private const float RockSmallScale = 3.5f;

        // 트렁크 충돌은 시각과 분리 — 실제 나무 메시가 어디까지 트렁크인지
        // 몰라도 기존과 같은 크기의 캡슐로 막는다(걷는 느낌을 안 바꾼다).
        private const float TrunkRadius = 0.4f;
        private const float TrunkHeight = 3.0f;

        // ---- GLB 폴백(fallback) primitive 크기 — 예전 결합 메시 시절 그대로 ----
        private const float FallbackCanopyRadius = 2.2f;
        private const float FallbackRockRadius = 1.4f;
        private static readonly Color TrunkColor = new Color(0.32f, 0.21f, 0.12f);
        private static readonly Color CanopyColor = new Color(0.12f, 0.30f, 0.11f);
        private static readonly Color RockColor = new Color(0.5f, 0.48f, 0.46f);

        // 편집기 빌드 스크립트가 Init()으로 채워 준다 — NpcBuilder.cs와 같은
        // 이유(런타임 Awake()는 AssetDatabase를 못 쓴다).
        [SerializeField] private GameObject treeModel;
        [SerializeField] private GameObject rockLargeModel;
        [SerializeField] private GameObject rockSmallModel;

        public void Init(GameObject tree, GameObject rockLarge, GameObject rockSmall)
        {
            treeModel = tree;
            rockLargeModel = rockLarge;
            rockSmallModel = rockSmall;
        }

        private void Awake()
        {
            // 이미 저장된 씬을 실제 Play로 열면 Awake가 다시 불려 Build()를
            // 또 돌리는데, 편집기 빌드 스크립트가 이미 자식들을 만들어 둔
            // 뒤라 그대로 두면 나무·바위가 두 벌씩 겹쳐 생긴다 —
            // NpcBuilder.cs와 같은 방어(2026-09-12 GLB 교체 때 같이 발견).
            if (transform.childCount > 0) return;
            Build();
        }

        public void Build()
        {
            BuildTrees();
            BuildRocks();
            MarkStatic();
        }

        /// <summary>PLAN.md 76장 Mobile Performance Pass — 나무·바위는 절대
        /// 안 움직이니 정적 배칭·오클루전 컬링 대상으로 표시한다.</summary>
        private void MarkStatic()
        {
            foreach (Transform t in GetComponentsInChildren<Transform>(true))
            {
                t.gameObject.isStatic = true;
            }
        }

        // ---- 해시 --------------------------------------------------------

        /// <summary>
        /// 정수 좌표 + salt에서 결정적으로 0~1 값을 뽑는다. saga-godot의
        /// vegetation_builder.gd _hash()와 같은 공식(Math.random을 쓰지
        /// 않는다 — 무작위면 다시 켤 때마다 숲이 바뀐다).
        /// </summary>
        private static float Hash(int gx, int gy, int salt)
        {
            unchecked
            {
                long h = ((long)gx * 374761393) ^ ((long)gy * 668265263) ^ ((long)salt * 2246822519);
                h = (h ^ (h >> 13)) * 1274126177;
                h ^= h >> 16;
                return (h & 0x7fffffffL) / (float)0x7fffffff;
            }
        }

        // ---- 나무 --------------------------------------------------------

        private void BuildTrees()
        {
            float ground = TestMapData.Legend['T'].Height;

            var visualParent = new GameObject("Trees");
            visualParent.transform.SetParent(transform, false);
            var trunkParent = new GameObject("TreeTrunkCollisions");
            trunkParent.transform.SetParent(transform, false);

            // GLB 폴백용 결합 메시 재료(모델을 못 찾았을 때만 실제로 쓰인다).
            var verts = new List<Vector3>();
            var colors = new List<Color>();
            var tris = new List<int>();
            Mesh trunkSrc = treeModel == null ? GetPrimitiveMesh(PrimitiveType.Cylinder) : null;
            Mesh canopySrc = treeModel == null ? GetPrimitiveMesh(PrimitiveType.Sphere) : null;

            for (int y = 0; y < TestMapData.RowCount; y++)
            {
                string row = TestMapData.Rows[y];
                for (int x = 0; x < row.Length; x++)
                {
                    if (row[x] != 'T') continue;

                    for (int i = 0; i < TreesPerForestTile; i++)
                    {
                        float jx = (Hash(x, y, i * 2) - 0.5f) * TestMapData.TileSize * 0.8f;
                        float jz = (Hash(x, y, i * 2 + 1) - 0.5f) * TestMapData.TileSize * 0.8f;
                        float s = 0.7f + Hash(x, y, i * 2 + 100) * 0.6f;
                        float yaw = Hash(x, y, i * 2 + 200) * 360f;
                        Vector3 basePos = TestMapData.WorldPos(x, y) + new Vector3(jx, ground, jz);
                        Quaternion rot = Quaternion.Euler(0f, yaw, 0f);

                        if (treeModel != null)
                        {
                            var tree = Object.Instantiate(treeModel, visualParent.transform);
                            tree.name = "Tree";
                            tree.transform.position = basePos;
                            tree.transform.rotation = rot;
                            tree.transform.localScale = Vector3.one * (TreeScale * s);
                        }
                        else
                        {
                            float trunkH0 = TrunkHeight * s;
                            float trunkR0 = TrunkRadius * s;
                            var trunkXf = Matrix4x4.TRS(
                                basePos + Vector3.up * (trunkH0 * 0.5f), rot,
                                new Vector3(trunkR0 * 2f, trunkH0 * 0.5f, trunkR0 * 2f));
                            AppendTransformedMesh(trunkSrc, verts, colors, tris, trunkXf, TrunkColor);

                            float canopyR = FallbackCanopyRadius * s;
                            var canopyXf = Matrix4x4.TRS(
                                basePos + Vector3.up * (trunkH0 * 0.85f), Quaternion.identity,
                                Vector3.one * (canopyR * 2f));
                            AppendTransformedMesh(canopySrc, verts, colors, tris, canopyXf, CanopyColor);
                        }

                        // 트렁크 충돌은 시각 방식과 무관하게 항상 같은 크기(걷는 느낌
                        // 불변) — 잎까지 막으면 나무 사이를 지날 때 부자연스럽다.
                        float trunkH = TrunkHeight * s;
                        float trunkR = TrunkRadius * s;
                        var colGo = new GameObject("TrunkCol");
                        colGo.transform.SetParent(trunkParent.transform, false);
                        colGo.transform.position = basePos + Vector3.up * (trunkH * 0.5f);
                        var cap = colGo.AddComponent<CapsuleCollider>();
                        cap.radius = trunkR;
                        cap.height = trunkH;
                        cap.direction = 1; // Y축
                    }
                }
            }

            if (treeModel == null && verts.Count > 0)
            {
                BuildBakedMesh(visualParent.transform, "Trees", verts, colors, tris);
            }
        }

        // ---- 바위 --------------------------------------------------------

        /// <summary>
        /// 산 타일은 TerrainBuilder.BuildCollision이 이미 통째로 막아 뒀다(걸을
        /// 수 없는 지형) — 여기 바위는 순전히 눈에 보이는 장식이라 추가 충돌체가
        /// 필요 없다.
        /// </summary>
        private void BuildRocks()
        {
            float ground = TestMapData.Legend['^'].Height;

            var visualParent = new GameObject("Rocks");
            visualParent.transform.SetParent(transform, false);

            var verts = new List<Vector3>();
            var colors = new List<Color>();
            var tris = new List<int>();
            Mesh rockSrc = (rockLargeModel == null && rockSmallModel == null) ? GetPrimitiveMesh(PrimitiveType.Sphere) : null;
            bool anyModel = rockLargeModel != null || rockSmallModel != null;

            for (int y = 0; y < TestMapData.RowCount; y++)
            {
                string row = TestMapData.Rows[y];
                for (int x = 0; x < row.Length; x++)
                {
                    if (row[x] != '^') continue;

                    for (int i = 0; i < RocksPerMountainTile; i++)
                    {
                        float jx = (Hash(x, y, i * 3 + 500) - 0.5f) * TestMapData.TileSize * 0.6f;
                        float jz = (Hash(x, y, i * 3 + 501) - 0.5f) * TestMapData.TileSize * 0.6f;
                        float sizeVariant = 0.7f + Hash(x, y, i * 3 + 502) * 0.8f;
                        float yaw = Hash(x, y, i * 3 + 503) * 360f;
                        Vector3 basePos = TestMapData.WorldPos(x, y) + new Vector3(jx, ground, jz);

                        if (anyModel)
                        {
                            // 절반은 큰 바위, 절반은 작은 바위 — 결정적 해시로 고른다.
                            bool useLarge = Hash(x, y, i * 3 + 506) < 0.5f;
                            GameObject model = useLarge ? rockLargeModel : rockSmallModel;
                            if (model == null) model = useLarge ? rockSmallModel : rockLargeModel;
                            float baseScale = useLarge ? RockLargeScale : RockSmallScale;

                            var rock = Object.Instantiate(model, visualParent.transform);
                            rock.name = "Rock";
                            rock.transform.position = basePos;
                            rock.transform.rotation = Quaternion.Euler(0f, yaw, 0f);
                            rock.transform.localScale = Vector3.one * (baseScale * sizeVariant);
                        }
                        else
                        {
                            float radius = FallbackRockRadius * sizeVariant;
                            float wobbleX = 0.85f + Hash(x, y, i * 3 + 504) * 0.3f;
                            float wobbleZ = 0.85f + Hash(x, y, i * 3 + 505) * 0.3f;
                            var scale = new Vector3(radius * 2f * wobbleX, radius * 1.3f, radius * 2f * wobbleZ);
                            var xf = Matrix4x4.TRS(
                                basePos + Vector3.up * (scale.y * 0.5f),
                                Quaternion.Euler(0f, yaw, 0f), scale);
                            AppendTransformedMesh(rockSrc, verts, colors, tris, xf, RockColor);
                        }
                    }
                }
            }

            if (!anyModel && verts.Count > 0)
            {
                BuildBakedMesh(visualParent.transform, "Rocks", verts, colors, tris);
            }
        }

        // ---- 공통 --------------------------------------------------------

        private static void BuildBakedMesh(Transform parent, string name, List<Vector3> verts, List<Color> colors, List<int> tris)
        {
            var mesh = new Mesh { name = name };
            mesh.indexFormat = verts.Count > 65000 ? IndexFormat.UInt32 : IndexFormat.UInt16;
            mesh.SetVertices(verts);
            mesh.SetColors(colors);
            mesh.SetTriangles(tris, 0);
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();

            var go = new GameObject(name + "Mesh");
            go.transform.SetParent(parent, false);
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            go.AddComponent<MeshRenderer>().sharedMaterial =
                new Material(Shader.Find("Saga/VertexColorLit")) { name = $"{name} (generated)" };
        }

        /// <summary>
        /// 내장 primitive 메시(반지름 0.5 기준 Sphere/Cylinder)를 얻는다 —
        /// 임시 GameObject를 만들어 sharedMesh만 빼고 바로 지운다(엔진 내장
        /// 리소스라 GameObject를 지워도 메시 자체는 안 없어진다).
        /// </summary>
        private static Mesh GetPrimitiveMesh(PrimitiveType type)
        {
            var temp = GameObject.CreatePrimitive(type);
            Mesh mesh = temp.GetComponent<MeshFilter>().sharedMesh;
            Object.DestroyImmediate(temp);
            return mesh;
        }

        private static void AppendTransformedMesh(Mesh src, List<Vector3> verts, List<Color> colors,
            List<int> tris, Matrix4x4 xform, Color color)
        {
            Vector3[] srcVerts = src.vertices;
            int[] srcTris = src.triangles;
            int b = verts.Count;
            for (int i = 0; i < srcVerts.Length; i++)
            {
                verts.Add(xform.MultiplyPoint3x4(srcVerts[i]));
                colors.Add(color);
            }
            for (int i = 0; i < srcTris.Length; i++)
            {
                tris.Add(b + srcTris[i]);
            }
        }
    }
}
