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
    /// </summary>
    public class DungeonCorridorBuilder : MonoBehaviour
    {
        public const float DoorWidth = 3f;
        private const float WallHeight = 4f;
        private const float WallThickness = 1f;

        private static readonly Color FloorColor = new Color(0.24f, 0.22f, 0.2f);
        private static readonly Color WallColor = new Color(0.16f, 0.15f, 0.14f);

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
            floor.GetComponent<MeshRenderer>().sharedMaterial = MakeMaterial(FloorColor);
        }

        private void BuildSideWalls()
        {
            float wallY = WallHeight * 0.5f;
            float offsetX = DoorWidth * 0.5f + WallThickness * 0.5f;

            SpawnWall("Wall_E", new Vector3(offsetX, wallY, 0f), new Vector3(WallThickness, WallHeight, Length));
            SpawnWall("Wall_W", new Vector3(-offsetX, wallY, 0f), new Vector3(WallThickness, WallHeight, Length));
        }

        private void SpawnWall(string name, Vector3 pos, Vector3 size)
        {
            var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wall.name = name;
            wall.transform.SetParent(transform, false);
            wall.transform.localPosition = pos;
            wall.transform.localScale = size;
            wall.GetComponent<MeshRenderer>().sharedMaterial = MakeMaterial(WallColor);
        }

        private static Material MakeMaterial(Color color)
        {
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "DungeonCorridor (generated)" };
            mat.color = color;
            return mat;
        }
    }
}
