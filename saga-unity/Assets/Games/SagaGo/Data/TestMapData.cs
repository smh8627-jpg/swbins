using System.Collections.Generic;
using UnityEngine;

namespace Saga.Go.Data
{
    /// <summary>
    /// VERTICAL_SLICE.md의 테스트 지역. saga-godot의 test_map.gd와 같은 글자
    /// 지도를 그대로 쓴다(0장 — 기획은 공유, 구현만 각자). 7x7칸(칸당 48m =
    /// 336m 사방).
    ///
    /// ^ 산   T 숲   ~ 강   = 길   H 마을   F 논밭   . 들
    /// C 굴 입구   S 옛 사당   R 폐허   B 다리
    /// </summary>
    public static class TestMapData
    {
        public static readonly string[] Rows =
        {
            "^^^C^^^",
            "^TT=TS^",
            "T..=..T",
            "T.HH.RT",
            "T..=..T",
            "~~~B~~~",
            "^^^=^^^",
        };

        public const float TileSize = 48f;

        public struct TileInfo
        {
            public string Name;
            public Color Color;
            public bool Walkable;
            public float Height;
        }

        /// <summary>
        /// height — "물은 12cm 낮춘다"는 사가의숲 웹판 원칙과 같은 결. 산은
        /// 두드러지고 강은 패어 보이게, 나머지는 거의 평면에 가깝게.
        /// saga-godot의 terrain_builder.gd LEGEND와 같은 수치.
        /// </summary>
        public static readonly Dictionary<char, TileInfo> Legend = new Dictionary<char, TileInfo>
        {
            ['^'] = new TileInfo { Name = "mountain", Color = new Color(0.55f, 0.53f, 0.5f), Walkable = false, Height = 2.5f },
            ['T'] = new TileInfo { Name = "forest", Color = new Color(0.16f, 0.32f, 0.14f), Walkable = true, Height = 0.15f },
            ['~'] = new TileInfo { Name = "river", Color = new Color(0.3f, 0.26f, 0.18f), Walkable = false, Height = -1.0f },
            ['='] = new TileInfo { Name = "path", Color = new Color(0.62f, 0.5f, 0.32f), Walkable = true, Height = 0.05f },
            ['H'] = new TileInfo { Name = "village", Color = new Color(0.78f, 0.68f, 0.42f), Walkable = true, Height = 0.1f },
            ['F'] = new TileInfo { Name = "farmland", Color = new Color(0.55f, 0.58f, 0.22f), Walkable = true, Height = 0.05f },
            ['.'] = new TileInfo { Name = "plains", Color = new Color(0.38f, 0.55f, 0.24f), Walkable = true, Height = 0.0f },
            ['C'] = new TileInfo { Name = "cave", Color = new Color(0.2f, 0.2f, 0.22f), Walkable = true, Height = 0.2f },
            ['S'] = new TileInfo { Name = "shrine", Color = new Color(0.5f, 0.42f, 0.3f), Walkable = true, Height = 0.2f },
            ['R'] = new TileInfo { Name = "ruins", Color = new Color(0.45f, 0.42f, 0.4f), Walkable = true, Height = 0.2f },
            ['B'] = new TileInfo { Name = "bridge", Color = new Color(0.5f, 0.36f, 0.2f), Walkable = true, Height = -1.0f },
        };

        public const float WaterHeightAboveBed = 0.55f;

        /// <summary>다리 널판이 강바닥 위로 뜨는 높이. LandmarksBuilder도 이 값을 그대로 쓴다.</summary>
        public const float BridgeClearance = 2.0f;

        /// <summary>산·강을 막는 벽의 높이(둘 다 walkable=false — 다리로만 강을 건넌다).</summary>
        public const float BlockHeight = 6.0f;

        public static int Cols => Rows[0].Length;
        public static int RowCount => Rows.Length;

        public static char TileAt(int gx, int gy)
        {
            if (gy < 0 || gy >= Rows.Length) return '^';
            string row = Rows[gy];
            if (gx < 0 || gx >= row.Length) return '^';
            return row[gx];
        }

        /// <summary>격자 좌표 -> 월드 좌표(중심이 원점). 지도의 그림과 걷는 자리가 같은 칸 크기를 쓴다.</summary>
        public static Vector3 WorldPos(float gx, float gy)
        {
            float halfW = Cols * 0.5f;
            float halfH = RowCount * 0.5f;
            return new Vector3((gx - halfW) * TileSize, 0f, (gy - halfH) * TileSize);
        }
    }
}
