using UnityEngine;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// VERTICAL_SLICE_DUNGEON.md 다음 슬라이스 "오픈월드/필드" — 방
    /// 하나짜리 구조를 벗어나는 첫 조각. 웹판 saga-dungeon의 필드/바이옴
    /// 전체를 옮기는 대신(파급이 큰 작업, 이번 슬라이스 범위 밖 —
    /// VERTICAL_SLICE_DUNGEON.md "다음 슬라이스 후보" 참고) **방 두 개를
    /// 잇는 가장 작은 단위**만 짰다: `DungeonRoomBuilder.cs`의
    /// `OpenNorthDoor()`/`OpenSouthDoor()`로 두 방에 문을 뚫고, 그 사이를
    /// 이 복도로 잇는다. `DungeonRoomBuilder.cs`와 같은 결(primitive,
    /// Awake 중복 생성 방어, MarkStatic).
    ///
    /// "바이옴 5종" 슬라이스 — 복도 셋(Corridor·Corridor2·Corridor3)은
    /// 전부 `SagaBiome.Ruins`(무너진 통로)로 통일한다. 다섯 성격 중
    /// 방 넷(숲·늪·산·사당, `DungeonRoomBuilder.cs`)에 못 들어간 나머지
    /// 하나를 여기 배정한 것 — 좁은 통로(3m)엔 소품을 안 둔다(길 막힘
    /// 방지, 색 톤만 바뀐다).
    /// </summary>
    public class DungeonCorridorBuilder : MonoBehaviour
    {
        public const float DoorWidth = 3f;
        private const float WallHeight = 4f;
        private const float WallThickness = 1f;

        private static readonly Color NeutralFloorColor = new Color(0.24f, 0.22f, 0.2f);
        private static readonly Color NeutralWallColor = new Color(0.16f, 0.15f, 0.14f);
        // 웹판 THEME_BIAS 색 수치가 없어(SagaBiome.cs 참고) 새로 잡음 — 무너진 잔해 톤.
        private static readonly Color RuinsFloorColor = new Color(0.25f, 0.23f, 0.20f);
        private static readonly Color RuinsWallColor = new Color(0.20f, 0.18f, 0.16f);

        [SerializeField] private SagaBiome biome = SagaBiome.None;

        /// <summary>복도 길이(z축) — 두 방의 벽 바깥면 사이 거리는
        /// BuildTestDungeonScene.cs가 방 간격을 잡을 때 이 값을 그대로
        /// 씀.</summary>
        public const float Length = 8f;

        private void Awake()
        {
            if (transform.childCount > 0) return;
            Build();
        }

        public void Build()
        {
            BuildFloor();
            BuildSideWalls();
            MarkStatic();
        }

        private (Color floor, Color wall) Colors() =>
            biome == SagaBiome.Ruins ? (RuinsFloorColor, RuinsWallColor) : (NeutralFloorColor, NeutralWallColor);

        private void MarkStatic()
        {
            foreach (Transform t in GetComponentsInChildren<Transform>(true))
            {
                t.gameObject.isStatic = true;
            }
        }

        private void BuildFloor()
        {
            var floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
            floor.name = "Floor";
            floor.transform.SetParent(transform, false);
            floor.transform.localPosition = new Vector3(0f, -0.5f, 0f);
            floor.transform.localScale = new Vector3(DoorWidth, 1f, Length);
            floor.GetComponent<MeshRenderer>().sharedMaterial = MakeMaterial(Colors().floor);
        }

        private void BuildSideWalls()
        {
            float wallY = WallHeight * 0.5f;
            float offsetX = DoorWidth * 0.5f + WallThickness * 0.5f;
            var wallColor = Colors().wall;

            SpawnWall("Wall_E", new Vector3(offsetX, wallY, 0f), new Vector3(WallThickness, WallHeight, Length), wallColor);
            SpawnWall("Wall_W", new Vector3(-offsetX, wallY, 0f), new Vector3(WallThickness, WallHeight, Length), wallColor);
        }

        private void SpawnWall(string name, Vector3 pos, Vector3 size, Color color)
        {
            var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wall.name = name;
            wall.transform.SetParent(transform, false);
            wall.transform.localPosition = pos;
            wall.transform.localScale = size;
            wall.GetComponent<MeshRenderer>().sharedMaterial = MakeMaterial(color);
        }

        private static Material MakeMaterial(Color color)
        {
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "DungeonCorridor (generated)" };
            mat.color = color;
            return mat;
        }
    }
}
