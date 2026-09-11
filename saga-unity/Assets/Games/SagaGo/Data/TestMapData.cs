using System.Collections.Generic;
using UnityEngine;

namespace Saga.Go.Data
{
    /// <summary>
    /// VERTICAL_SLICE.md의 테스트 지역. saga-godot의 test_map.gd와 같은 글자
    /// 지도를 원안으로 쓰되(0장 — 기획은 공유, 구현만 각자), **2026-09-12
    /// PLAN.md 51장 "GO 월드 확장 — 지도 크기"로 saga-unity 쪽만 남쪽 2줄 +
    /// 동쪽 2칸을 늘렸다**(saga-godot은 아직 7x7 그대로 — 두 트랙이 지도
    /// 크기까지 반드시 같을 필요는 없다, 0장 "기획만 같이 본다"). 지금
    /// 9칸×9칸(칸당 48m = 432m×432m). 기존 BanditEncounter·HiddenTreasure·
    /// Gatherable·MountainShrine·RareWolfEncounter·NpcBuilder·
    /// WanderingAnimal이 전부 상수 (gx,gy)를 `TestMapData.WorldPos(gx,gy)`로만
    /// 넘겨 자리를 잡는다 — **행 끝·열 끝에만 새로 보태면 기존 좌표들의
    /// 내용은 하나도 안 바뀐다**(새 행/열은 기존보다 더 큰 index로만
    /// 추가되니까 — 남쪽 확장 때 검증한 원칙을 동쪽에도 그대로 적용, 실제로
    /// 문제없이 됨을 이번에 확인). 동쪽 확장은 마을 행(row2~4)의 동쪽 벽이
    /// 원래 숲(walkable)이라 남쪽처럼 따로 "문"을 뚫을 필요 없이 자연스럽게
    /// 이어진다 — col7에 숲 버퍼 한 칸(+ row3만 들판), col8에 새 산 경계.
    /// **주의 — 칸 수가 바뀌면 WorldPos()의 halfW/halfH가 같이 바뀌어 기존
    /// 모든 좌표가 월드 공간에서 다 같이 밀린다**(개별 좌표 사이 관계는
    /// 그대로라 안전하지만, WorldPos()를 거치지 않고 값을 상수로 박아 둔
    /// 자리가 있으면 그 자리만 안 따라간다 — BuildTestVillageScene.cs의
    /// PlayerSpawn이 실제로 이 함정에 걸려 있어서 남쪽 확장 때 WorldPos()
    /// 호출로 고쳤다, 동쪽 확장에서도 그 수정이 그대로 유효함을 확인).
    ///
    /// ^ 산   T 숲   ~ 강   = 길   H 마을   F 논밭   . 들
    /// C 굴 입구   S 옛 사당   R 폐허   B 다리
    /// </summary>
    public static class TestMapData
    {
        public static readonly string[] Rows =
        {
            "^^^C^^^^^",
            "^TT=TS^^^",
            "T..=..TT^",
            "T.HH.RT.^",
            "T..=..TT^",
            "~~~B~~~~~",
            "^^^=^^^^^",
            "^T...T^^^",
            "^^^^^^^^^",
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

        /// <summary>WorldPos()의 역함수 — PLAN.md 24~27장 "동물"의 배회 AI가
        /// 다음 목표 지점이 걸을 수 있는 칸인지 물을 때 쓴다.</summary>
        public static (int gx, int gy) WorldToGrid(Vector3 worldPos)
        {
            float halfW = Cols * 0.5f;
            float halfH = RowCount * 0.5f;
            int gx = Mathf.RoundToInt(worldPos.x / TileSize + halfW);
            int gy = Mathf.RoundToInt(worldPos.z / TileSize + halfH);
            return (gx, gy);
        }
    }
}
