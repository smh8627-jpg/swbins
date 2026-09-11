using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using Saga.Go.Data;

namespace Saga.Go.World
{
    /// <summary>
    /// VERTICAL_SLICE.md의 글자 지도를 읽어 땅을 세운다. saga-godot의
    /// terrain_builder.gd와 같은 알고리즘(칸을 4x4로 더 쪼개, 칸 중심은 제
    /// 색 그대로 두고 가장자리만 이웃과 섞는다)을 처음부터 쓴다 — saga-godot이
    /// 2026-09-11에 "칸 경계가 바둑판처럼 갈라져 보이는" 문제를 나중에 고쳐야
    /// 했던 것과 같은 함정을 Unity 쪽은 처음부터 피한다(VERTICAL_SLICE.md
    /// "테스트 지역 설계" 절 참고). 높이는 안 섞는다 — 산·강은 여전히 벽처럼
    /// 뚝 끊겨야 막힌 지형임이 드러난다(충돌은 칸마다 따로, BuildCollision 참고).
    /// </summary>
    [RequireComponent(typeof(MeshFilter))]
    [RequireComponent(typeof(MeshRenderer))]
    public class TerrainBuilder : MonoBehaviour
    {
        private const int Sub = 4;
        private const float EdgeBlendMargin = 0.34f;

        [Tooltip("비워 두면 Awake에서 VertexColorLit 셰이더로 직접 만든다.")]
        [SerializeField] private Material groundMaterialOverride;

        private void Awake()
        {
            Build();
        }

        public void Build()
        {
            BuildGround();
            BuildWater();
            BuildCollision();
        }

        // ---- 땅 ------------------------------------------------------

        private void BuildGround()
        {
            var verts = new List<Vector3>();
            var colors = new List<Color>();
            var normals = new List<Vector3>();
            var tris = new List<int>();

            float half = TestMapData.TileSize * 0.5f;

            for (int y = 0; y < TestMapData.RowCount; y++)
            {
                string row = TestMapData.Rows[y];
                for (int x = 0; x < row.Length; x++)
                {
                    char ch = row[x];
                    if (!TestMapData.Legend.TryGetValue(ch, out TestMapData.TileInfo info))
                    {
                        Debug.LogWarning($"TerrainBuilder: 모르는 지형 글자 '{ch}'");
                        continue;
                    }

                    Vector3 center = TestMapData.WorldPos(x, y) + new Vector3(0, info.Height, 0);
                    Color own = info.Color;
                    Color col00 = CornerColor(x, y);
                    Color col10 = CornerColor(x + 1, y);
                    Color col01 = CornerColor(x, y + 1);
                    Color col11 = CornerColor(x + 1, y + 1);

                    AddTileQuads(verts, colors, normals, tris, center, half, own, col00, col10, col01, col11);
                }
            }

            var mesh = new Mesh { name = "Ground" };
            mesh.indexFormat = verts.Count > 65000 ? IndexFormat.UInt32 : IndexFormat.UInt16;
            mesh.SetVertices(verts);
            mesh.SetColors(colors);
            mesh.SetNormals(normals);
            mesh.SetTriangles(tris, 0);
            mesh.RecalculateBounds();

            GetComponent<MeshFilter>().sharedMesh = mesh;

            var mr = GetComponent<MeshRenderer>();
            mr.sharedMaterial = groundMaterialOverride != null
                ? groundMaterialOverride
                : new Material(Shader.Find("Saga/VertexColorLit")) { name = "Ground (generated)" };
        }

        /// <summary>칸 하나를 Sub x Sub 조각으로 나눠 넣는다. (u,v)는 칸 안의 상대 위치.</summary>
        private static void AddTileQuads(List<Vector3> verts, List<Color> colors, List<Vector3> normals, List<int> tris,
            Vector3 center, float half, Color own, Color col00, Color col10, Color col01, Color col11)
        {
            for (int j = 0; j < Sub; j++)
            {
                float v0 = (float)j / Sub;
                float v1 = (float)(j + 1) / Sub;
                for (int i = 0; i < Sub; i++)
                {
                    float u0 = (float)i / Sub;
                    float u1 = (float)(i + 1) / Sub;

                    Vector3 p00 = center + new Vector3(Mathf.Lerp(-half, half, u0), 0, Mathf.Lerp(-half, half, v0));
                    Vector3 p10 = center + new Vector3(Mathf.Lerp(-half, half, u1), 0, Mathf.Lerp(-half, half, v0));
                    Vector3 p11 = center + new Vector3(Mathf.Lerp(-half, half, u1), 0, Mathf.Lerp(-half, half, v1));
                    Vector3 p01 = center + new Vector3(Mathf.Lerp(-half, half, u0), 0, Mathf.Lerp(-half, half, v1));

                    Color cc00 = TileVertexColor(own, col00, col10, col01, col11, u0, v0);
                    Color cc10 = TileVertexColor(own, col00, col10, col01, col11, u1, v0);
                    Color cc11 = TileVertexColor(own, col00, col10, col01, col11, u1, v1);
                    Color cc01 = TileVertexColor(own, col00, col10, col01, col11, u0, v1);

                    int b = verts.Count;
                    verts.Add(p00); colors.Add(cc00); normals.Add(Vector3.up);
                    verts.Add(p10); colors.Add(cc10); normals.Add(Vector3.up);
                    verts.Add(p11); colors.Add(cc11); normals.Add(Vector3.up);
                    verts.Add(p01); colors.Add(cc01); normals.Add(Vector3.up);

                    // 노멀을 명시로 주고 셰이더가 Cull Off라 감김 방향은 안 가린다
                    // (Godot 쪽에서 겪은 외적 부호 계산 문제를 여기선 안 밟는다).
                    tris.Add(b + 0); tris.Add(b + 1); tris.Add(b + 2);
                    tris.Add(b + 0); tris.Add(b + 2); tris.Add(b + 3);
                }
            }
        }

        /// <summary>
        /// (u,v) 자리의 실제 정점 색. 네 모서리 사이를 이중선형보간한 "이웃과
        /// 섞은 색"과 "제 색"을, 가장자리까지 남은 거리(d)로 섞는다 — d가
        /// EdgeBlendMargin보다 크면(칸 중심 쪽) 100% 제 색, 0이면(칸 끝) 100%
        /// 이웃-평균색.
        /// </summary>
        private static Color TileVertexColor(Color own, Color c00, Color c10, Color c01, Color c11, float u, float v)
        {
            Color top = Color.Lerp(c00, c10, u);
            Color bot = Color.Lerp(c01, c11, u);
            Color cornerBlend = Color.Lerp(top, bot, v);
            float d = Mathf.Min(Mathf.Min(u, 1f - u), Mathf.Min(v, 1f - v));
            float t = Mathf.Clamp01((EdgeBlendMargin - d) / EdgeBlendMargin);
            return Color.Lerp(own, cornerBlend, t);
        }

        /// <summary>격자 교차점(cx,cy)에 맞닿은 칸(최대 4개)의 색을 평균낸다.</summary>
        private static Color CornerColor(int cx, int cy)
        {
            Color total = new Color(0, 0, 0, 0);
            int n = 0;
            for (int dy = -1; dy <= 0; dy++)
            {
                for (int dx = -1; dx <= 0; dx++)
                {
                    int ty = cy + dy;
                    int tx = cx + dx;
                    if (ty < 0 || ty >= TestMapData.RowCount) continue;
                    string row = TestMapData.Rows[ty];
                    if (tx < 0 || tx >= row.Length) continue;
                    char ch = row[tx];
                    if (!TestMapData.Legend.TryGetValue(ch, out TestMapData.TileInfo info)) continue;
                    total += info.Color;
                    n++;
                }
            }
            return n == 0 ? Color.black : total / n;
        }

        // ---- 물 --------------------------------------------------------

        /// <summary>강(river)·다리(bridge) 타일 위에 반투명 수면 한 장씩을 얹는다.</summary>
        private void BuildWater()
        {
            var positions = new List<Vector3>();
            for (int y = 0; y < TestMapData.RowCount; y++)
            {
                string row = TestMapData.Rows[y];
                for (int x = 0; x < row.Length; x++)
                {
                    char ch = row[x];
                    if (ch != '~' && ch != 'B') continue;
                    float bedHeight = TestMapData.Legend[ch].Height;
                    positions.Add(TestMapData.WorldPos(x, y) + new Vector3(0, bedHeight + TestMapData.WaterHeightAboveBed, 0));
                }
            }
            if (positions.Count == 0) return;

            var verts = new List<Vector3>();
            var tris = new List<int>();
            float half = TestMapData.TileSize * 0.5f;

            foreach (var center in positions)
            {
                Vector3 p00 = center + new Vector3(-half, 0, -half);
                Vector3 p10 = center + new Vector3(half, 0, -half);
                Vector3 p11 = center + new Vector3(half, 0, half);
                Vector3 p01 = center + new Vector3(-half, 0, half);
                int b = verts.Count;
                verts.Add(p00); verts.Add(p10); verts.Add(p11); verts.Add(p01);
                tris.Add(b + 0); tris.Add(b + 1); tris.Add(b + 2);
                tris.Add(b + 0); tris.Add(b + 2); tris.Add(b + 3);
            }

            var mesh = new Mesh { name = "WaterSurface" };
            mesh.indexFormat = verts.Count > 65000 ? IndexFormat.UInt32 : IndexFormat.UInt16;
            mesh.SetVertices(verts);
            mesh.SetTriangles(tris, 0);
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();

            var go = new GameObject("WaterSurface");
            go.transform.SetParent(transform, false);
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            var mat = new Material(Shader.Find("Saga/WaterUnlit")) { name = "Water (generated)" };
            go.AddComponent<MeshRenderer>().sharedMaterial = mat;
        }

        // ---- 충돌 --------------------------------------------------------

        /// <summary>
        /// 타일마다 실제 충돌체를 놓는다 — 산·강은 막힌 벽, 다리는 널판
        /// 높이에서, 나머지는 제 타일 높이에서 딛는다. saga-godot의
        /// terrain_builder.gd _build_collision()과 같은 규칙.
        /// </summary>
        private void BuildCollision()
        {
            var parent = new GameObject("TerrainCollision");
            parent.transform.SetParent(transform, false);

            for (int y = 0; y < TestMapData.RowCount; y++)
            {
                string row = TestMapData.Rows[y];
                for (int x = 0; x < row.Length; x++)
                {
                    char ch = row[x];
                    if (!TestMapData.Legend.TryGetValue(ch, out TestMapData.TileInfo info)) continue;

                    Vector3 pos = TestMapData.WorldPos(x, y);
                    Vector3 size;
                    Vector3 center;

                    if (ch == '^' || ch == '~')
                    {
                        size = new Vector3(TestMapData.TileSize, TestMapData.BlockHeight, TestMapData.TileSize);
                        center = pos + new Vector3(0, info.Height, 0);
                    }
                    else if (ch == 'B')
                    {
                        float bridgeTop = info.Height + TestMapData.BridgeClearance;
                        size = new Vector3(TestMapData.TileSize, 0.6f, TestMapData.TileSize);
                        center = pos + new Vector3(0, bridgeTop, 0);
                    }
                    else
                    {
                        size = new Vector3(TestMapData.TileSize, 1.0f, TestMapData.TileSize);
                        center = pos + new Vector3(0, info.Height - 0.5f, 0);
                    }

                    var tileGo = new GameObject($"Col_{info.Name}_{x}_{y}");
                    tileGo.transform.SetParent(parent.transform, false);
                    tileGo.transform.position = center;
                    var box = tileGo.AddComponent<BoxCollider>();
                    box.size = size;
                }
            }
        }
    }
}
