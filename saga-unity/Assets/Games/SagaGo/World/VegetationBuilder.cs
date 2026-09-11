using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using Saga.Go.Data;

namespace Saga.Go.World
{
    /// <summary>
    /// PLAN.md 28~31장 — Vegetation/Rock 배치. saga-godot의 vegetation_builder.gd와
    /// 같은 원칙("자리는 시각의 순수 함수다" — SAGA-HANDOFF.md의 npc.js/land.js
    /// 규칙): 매 프레임 새로 뽑지 않고, 격자 좌표에서 결정적으로 해시해 늘 같은
    /// 자리에 같은 나무·바위가 선다.
    ///
    /// saga-godot은 나무·바위를 CC0 GLB로 교체했지만(PLAN.md 43·44장 대응),
    /// 여기는 아직 primitive 단계(PLAN.md 8장) — GLB 교체는 나중 조각.
    /// TerrainBuilder와 같은 방식(하나의 결합 메시 + 정점 색 + VertexColorLit)을
    /// 써서 나무 수백 그루가 서도 draw call이 하나(나무)·하나(바위)로 끝난다.
    /// </summary>
    public class VegetationBuilder : MonoBehaviour
    {
        private const int TreesPerForestTile = 3;
        private const int RocksPerMountainTile = 1;

        // saga-godot이 primitive 시절 쓰던 크기 그대로(vegetation_builder.gd
        // 주석 — 트렁크 높이 3·수관 반지름 2.2 / 바위 반지름 1.4) — 나중에
        // GLB로 바꾸더라도 걷는 느낌(충돌 크기)이 갑자기 바뀌지 않게 한다.
        private const float TrunkRadius = 0.4f;
        private const float TrunkHeight = 3.0f;
        private const float CanopyRadius = 2.2f;
        private const float RockRadius = 1.4f;

        private static readonly Color TrunkColor = new Color(0.32f, 0.21f, 0.12f);
        private static readonly Color CanopyColor = new Color(0.12f, 0.30f, 0.11f);
        private static readonly Color RockColor = new Color(0.5f, 0.48f, 0.46f);

        private void Awake()
        {
            Build();
        }

        public void Build()
        {
            BuildTrees();
            BuildRocks();
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
            var verts = new List<Vector3>();
            var colors = new List<Color>();
            var tris = new List<int>();

            Mesh trunkSrc = GetPrimitiveMesh(PrimitiveType.Cylinder);
            Mesh canopySrc = GetPrimitiveMesh(PrimitiveType.Sphere);
            var trunkColliders = new List<(Vector3 center, float radius, float height)>();

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

                        float trunkH = TrunkHeight * s;
                        float trunkR = TrunkRadius * s;
                        // Unity 기본 Cylinder는 반지름 0.5·높이 2(로컬 -1~1).
                        var trunkXf = Matrix4x4.TRS(
                            basePos + Vector3.up * (trunkH * 0.5f), rot,
                            new Vector3(trunkR * 2f, trunkH * 0.5f, trunkR * 2f));
                        AppendTransformedMesh(trunkSrc, verts, colors, tris, trunkXf, TrunkColor);

                        // 수관은 트렁크 위쪽 끝에 걸쳐 얹는다(기본 Sphere는 반지름 0.5).
                        float canopyR = CanopyRadius * s;
                        var canopyXf = Matrix4x4.TRS(
                            basePos + Vector3.up * (trunkH * 0.85f), Quaternion.identity,
                            Vector3.one * (canopyR * 2f));
                        AppendTransformedMesh(canopySrc, verts, colors, tris, canopyXf, CanopyColor);

                        trunkColliders.Add((basePos + Vector3.up * (trunkH * 0.5f), trunkR, trunkH));
                    }
                }
            }

            if (verts.Count == 0) return;

            var mesh = new Mesh { name = "Trees" };
            mesh.indexFormat = verts.Count > 65000 ? IndexFormat.UInt32 : IndexFormat.UInt16;
            mesh.SetVertices(verts);
            mesh.SetColors(colors);
            mesh.SetTriangles(tris, 0);
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();

            var go = new GameObject("Trees");
            go.transform.SetParent(transform, false);
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            go.AddComponent<MeshRenderer>().sharedMaterial =
                new Material(Shader.Find("Saga/VertexColorLit")) { name = "Trees (generated)" };

            // 줄기만 막는다(잎까지 막으면 나무 사이를 지날 때 부자연스럽다) —
            // saga-godot vegetation_builder.gd의 같은 결정.
            var trunkParent = new GameObject("TreeTrunkCollisions");
            trunkParent.transform.SetParent(transform, false);
            foreach (var (center, radius, height) in trunkColliders)
            {
                var colGo = new GameObject("TrunkCol");
                colGo.transform.SetParent(trunkParent.transform, false);
                colGo.transform.position = center;
                var cap = colGo.AddComponent<CapsuleCollider>();
                cap.radius = radius;
                cap.height = height;
                cap.direction = 1; // Y축
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
            var verts = new List<Vector3>();
            var colors = new List<Color>();
            var tris = new List<int>();

            Mesh rockSrc = GetPrimitiveMesh(PrimitiveType.Sphere);

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

                        float radius = RockRadius * sizeVariant;
                        // 완전한 구는 부자연스러워 살짝 납작하게 + 가로세로 비대칭을 준다.
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

            if (verts.Count == 0) return;

            var mesh = new Mesh { name = "Rocks" };
            mesh.indexFormat = verts.Count > 65000 ? IndexFormat.UInt32 : IndexFormat.UInt16;
            mesh.SetVertices(verts);
            mesh.SetColors(colors);
            mesh.SetTriangles(tris, 0);
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();

            var go = new GameObject("Rocks");
            go.transform.SetParent(transform, false);
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            go.AddComponent<MeshRenderer>().sharedMaterial =
                new Material(Shader.Find("Saga/VertexColorLit")) { name = "Rocks (generated)" };
        }

        // ---- 공통 --------------------------------------------------------

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
