using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace Saga.Forest.World
{
    /// <summary>
    /// VERTICAL_SLICE_FOREST.md(saga-godot) 2·4절 — 마을 지형 하나(잔디,
    /// 바이옴 다양성은 범위 밖). 30×20칸 × 3m/칸 = 90×60m 단일 색 평면을
    /// 촘촘히 쪼개(1.5m 해상도) `Saga/ForestWorldCurve` 머티리얼을 입힌다
    /// — 정점이 너무 성기면(예: Unity 기본 Plane) 곡률이 뭉텅뭉텅 각져
    /// 보인다. **콜라이더는 평평한 원본 메시 그대로 붙인다** — 곡률은
    /// 순수 정점 셰이더 트릭이라 실제 좌표·충돌은 평면이어야 한다(1절
    /// "판정은 항상 평면 좌표로" 원칙, GO `TerrainBuilder.cs`와 달리 칸별
    /// 색·타일 데이터가 없어 훨씬 단순).
    /// </summary>
    [RequireComponent(typeof(MeshFilter))]
    [RequireComponent(typeof(MeshRenderer))]
    public class ForestGroundBuilder : MonoBehaviour
    {
        public const float VillageWidth = 90f; // 30 tiles × 3m (VERTICAL_SLICE_FOREST.md 2절)
        public const float VillageDepth = 60f; // 20 tiles × 3m

        private const int SegmentsX = 60; // 1.5m 해상도
        private const int SegmentsZ = 40;

        [SerializeField] private Material groundMaterialOverride;

        private void Awake()
        {
            Build();
        }

        public void Build()
        {
            var verts = new List<Vector3>();
            var normals = new List<Vector3>();
            var tris = new List<int>();

            float halfW = VillageWidth * 0.5f;
            float halfD = VillageDepth * 0.5f;

            for (int z = 0; z <= SegmentsZ; z++)
            {
                float v = (float)z / SegmentsZ;
                float wz = Mathf.Lerp(-halfD, halfD, v);
                for (int x = 0; x <= SegmentsX; x++)
                {
                    float u = (float)x / SegmentsX;
                    float wx = Mathf.Lerp(-halfW, halfW, u);
                    verts.Add(new Vector3(wx, 0f, wz));
                    normals.Add(Vector3.up);
                }
            }

            int rowStride = SegmentsX + 1;
            for (int z = 0; z < SegmentsZ; z++)
            {
                for (int x = 0; x < SegmentsX; x++)
                {
                    int i00 = z * rowStride + x;
                    int i10 = i00 + 1;
                    int i01 = i00 + rowStride;
                    int i11 = i01 + 1;
                    tris.Add(i00); tris.Add(i01); tris.Add(i11);
                    tris.Add(i00); tris.Add(i11); tris.Add(i10);
                }
            }

            var mesh = new Mesh { name = "ForestGround" };
            mesh.indexFormat = verts.Count > 65000 ? IndexFormat.UInt32 : IndexFormat.UInt16;
            mesh.SetVertices(verts);
            mesh.SetNormals(normals);
            mesh.SetTriangles(tris, 0);
            mesh.RecalculateBounds();

            GetComponent<MeshFilter>().sharedMesh = mesh;

            var mr = GetComponent<MeshRenderer>();
            mr.sharedMaterial = groundMaterialOverride != null
                ? groundMaterialOverride
                : new Material(Shader.Find("Saga/ForestWorldCurve")) { name = "ForestGround (generated)" };

            var col = gameObject.AddComponent<MeshCollider>();
            col.sharedMesh = mesh;
        }
    }
}
