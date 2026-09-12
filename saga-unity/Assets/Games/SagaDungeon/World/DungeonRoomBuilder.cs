using UnityEngine;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// VERTICAL_SLICE_DUNGEON.md "방 크기" — saga-dungeon 웹판
    /// `ROOM_W=560, ROOM_H=360`(논리 픽셀, 플레이어 반지름 13px 기준)와
    /// 같은 비율을 Unity 미터로 옮겼다(CharacterController 반지름 0.4m
    /// 기준 20m×14m). 이번 슬라이스는 방 하나가 전부라 door/다음 층
    /// 연결은 없다 — primitive Cube뿐(GLB는 다음 슬라이스, Modular
    /// Dungeon Kit 후보).
    /// </summary>
    public class DungeonRoomBuilder : MonoBehaviour
    {
        public const float RoomWidth = 20f;
        public const float RoomDepth = 14f;
        private const float WallHeight = 4f;
        private const float WallThickness = 1f;

        private static readonly Color FloorColor = new Color(0.28f, 0.26f, 0.24f);
        private static readonly Color WallColor = new Color(0.16f, 0.15f, 0.14f);

        private void Awake()
        {
            // 이미 저장된 씬을 실제 Play로 열면 Awake가 다시 불려 Build()를
            // 또 돌리는데, 편집기 빌드 스크립트가 이미 자식들을 만들어 둔
            // 뒤라 그대로 두면 바닥·벽이 두 벌씩 겹쳐 생긴다 — SagaGo의
            // NpcBuilder.cs와 같은 방어(2026-09-12에 이미 6곳에서 빠뜨렸다가
            // 고친 패턴 — 새로 짜는 컴포넌트엔 처음부터 넣는다).
            if (transform.childCount > 0) return;
            Build();
        }

        public void Build()
        {
            BuildFloor();
            BuildWalls();
            MarkStatic();
        }

        /// <summary>PLAN.md 76장 Mobile Performance Pass — 방은 절대 안
        /// 움직이니 정적 배칭·오클루전 컬링 대상으로 표시한다.</summary>
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
            floor.transform.localScale = new Vector3(RoomWidth, 1f, RoomDepth);
            floor.GetComponent<MeshRenderer>().sharedMaterial = MakeMaterial(FloorColor);
        }

        private void BuildWalls()
        {
            float halfW = RoomWidth * 0.5f;
            float halfD = RoomDepth * 0.5f;
            float wallY = WallHeight * 0.5f;

            SpawnWall("Wall_North", new Vector3(0f, wallY, halfD + WallThickness * 0.5f),
                new Vector3(RoomWidth + WallThickness * 2f, WallHeight, WallThickness));
            SpawnWall("Wall_South", new Vector3(0f, wallY, -halfD - WallThickness * 0.5f),
                new Vector3(RoomWidth + WallThickness * 2f, WallHeight, WallThickness));
            SpawnWall("Wall_East", new Vector3(halfW + WallThickness * 0.5f, wallY, 0f),
                new Vector3(WallThickness, WallHeight, RoomDepth));
            SpawnWall("Wall_West", new Vector3(-halfW - WallThickness * 0.5f, wallY, 0f),
                new Vector3(WallThickness, WallHeight, RoomDepth));
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
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "DungeonRoom (generated)" };
            mat.color = color;
            return mat;
        }
    }
}
