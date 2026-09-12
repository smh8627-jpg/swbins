using UnityEngine;
using Saga.Forest.UI;

namespace Saga.Forest.World
{
    /// <summary>
    /// VERTICAL_SLICE_FOREST.md(saga-godot) 4절 "결정 — 포함: 집 하나 +
    /// 들어가기/나가기 — 구면 투영이 실제로 꺼졌다 켜지는 것을 증명하는
    /// 자리(1절 '집 안만 안 휜다'의 첫 실증)". 별도 씬/서브레벨을 새로
    /// 안 만들고 **마을과 안 겹치는 먼 좌표(+500m)에 실내 방을 미리
    /// 지어 두고, 문 앞에 다가가면 플레이어 위치만 그 좌표로 옮긴다**
    /// (씬 전환 없이 "포켓 공간" 기법 — DUNGEON의 room-shell처럼 실제
    /// 지오메트리가 있는 방식과 달리, FOREST는 아직 정식 씬 관리가 없어
    /// 가장 작은 단위로 이렇게 풀었다). 실내 벽·바닥은 평범한 URP Lit
    /// 머티리얼(Saga/ForestWorldCurve가 아님)이라 **구면 투영을 아예 안
    /// 물린다** — 그게 "꺼짐"의 전부다(새 on/off 스위치 코드가 필요 없다,
    /// ForestWorldCurve.shader 클래스 주석 "실내 머티리얼은 이 셰이더를
    /// 아예 안 물리는 것으로" 참고).
    /// </summary>
    public class ForestHouse : MonoBehaviour
    {
        private static readonly Vector3 IndoorPocketOffset = new Vector3(0f, 0f, 500f); // 마을 좌표와 절대 안 겹치는 먼 자리
        private static readonly Vector3 RoomSize = new Vector3(6f, 3f, 6f);

        private const float TriggerRadius = 1.4f;
        private const float ToastSec = 3f;

        private static readonly Color WallColor = new Color(0.75f, 0.6f, 0.4f);
        private static readonly Color RoofColor = new Color(0.5f, 0.2f, 0.15f);
        private static readonly Color IndoorFloorColor = new Color(0.55f, 0.42f, 0.3f);
        private static readonly Color IndoorWallColor = new Color(0.82f, 0.78f, 0.68f);

        private Vector3 _entryTriggerPos;      // 야외 — 문 앞, 여기 다가가면 들어간다.
        private Vector3 _exitLandingPos;       // 야외 — 나올 때 돌아오는 자리(재진입 반경 밖).
        private Vector3 _entryLandingPosIndoor; // 실내 — 들어오면 서는 자리.
        private Vector3 _exitTriggerPosIndoor;  // 실내 — 반대편, 여기 다가가면 나간다.

        private Transform _player;
        private bool _isInside;

        private void Awake()
        {
            if (transform.childCount == 0)
            {
                BuildExterior();
                BuildIndoorRoom();
            }

            _entryTriggerPos = transform.position + new Vector3(0f, 0f, -2.5f);
            _exitLandingPos = transform.position + new Vector3(0f, 0.1f, -5f);

            Vector3 indoorCenter = transform.position + IndoorPocketOffset;
            _entryLandingPosIndoor = indoorCenter + new Vector3(0f, 0.1f, RoomSize.z * 0.5f - 1f);
            _exitTriggerPosIndoor = indoorCenter + new Vector3(0f, 0f, -RoomSize.z * 0.5f + 1f);

            var playerGo = GameObject.FindWithTag("Player");
            _player = playerGo != null ? playerGo.transform : null;
        }

        /// <summary>4m×2.5m 벽 셋(남쪽만 비워 문으로 삼는다) + 지붕. 실제
        /// GLB 건물 대신 임시 primitive(PLAN.md 8장 "Placeholder는 개발
        /// 초기 테스트용") — 다음에 실제 건물 GLB를 구하면 이 메서드만
        /// 바꾸면 된다.</summary>
        private void BuildExterior()
        {
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "ForestHouseWall (generated)" };
            mat.color = WallColor;

            BuildWall(transform, new Vector3(0f, 1.25f, 2f), new Vector3(4f, 2.5f, 0.3f), mat); // 북쪽
            BuildWall(transform, new Vector3(2f, 1.25f, 0f), new Vector3(0.3f, 2.5f, 4f), mat); // 동쪽
            BuildWall(transform, new Vector3(-2f, 1.25f, 0f), new Vector3(0.3f, 2.5f, 4f), mat); // 서쪽
            // 남쪽(-Z)은 일부러 안 세운다 — 문.

            var roof = GameObject.CreatePrimitive(PrimitiveType.Cube);
            roof.name = "Roof";
            roof.transform.SetParent(transform, false);
            roof.transform.localScale = new Vector3(4.6f, 0.4f, 4.6f);
            roof.transform.localPosition = new Vector3(0f, 2.7f, 0f);
            var roofMat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "ForestHouseRoof (generated)" };
            roofMat.color = RoofColor;
            roof.GetComponent<MeshRenderer>().sharedMaterial = roofMat;
            Object.Destroy(roof.GetComponent<Collider>());
        }

        /// <summary>+500m 포켓의 작은 방 — 남쪽만 비워 실외 문과 같은 자리에
        /// "들어온 자리"가 있게 맞춘다. 곡률 셰이더를 안 쓰는 평범한 Lit
        /// 머티리얼이 이 방 전체의 "안 휨"을 그대로 나타낸다.</summary>
        private void BuildIndoorRoom()
        {
            var indoorGo = new GameObject("IndoorRoom");
            indoorGo.transform.SetParent(transform, false);
            indoorGo.transform.position = transform.position + IndoorPocketOffset;

            var floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
            floor.name = "IndoorFloor";
            floor.transform.SetParent(indoorGo.transform, false);
            floor.transform.localScale = new Vector3(RoomSize.x, 0.2f, RoomSize.z);
            floor.transform.localPosition = new Vector3(0f, -0.1f, 0f);
            var floorMat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "ForestIndoorFloor (generated, no curve)" };
            floorMat.color = IndoorFloorColor;
            floor.GetComponent<MeshRenderer>().sharedMaterial = floorMat;

            var wallMat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "ForestIndoorWall (generated, no curve)" };
            wallMat.color = IndoorWallColor;

            BuildWall(indoorGo.transform, new Vector3(0f, RoomSize.y * 0.5f, RoomSize.z * 0.5f), new Vector3(RoomSize.x, RoomSize.y, 0.2f), wallMat); // 북쪽
            BuildWall(indoorGo.transform, new Vector3(RoomSize.x * 0.5f, RoomSize.y * 0.5f, 0f), new Vector3(0.2f, RoomSize.y, RoomSize.z), wallMat); // 동쪽
            BuildWall(indoorGo.transform, new Vector3(-RoomSize.x * 0.5f, RoomSize.y * 0.5f, 0f), new Vector3(0.2f, RoomSize.y, RoomSize.z), wallMat); // 서쪽
            // 남쪽은 안 세운다 — 실외 문과 같은 자리.
        }

        private static void BuildWall(Transform parent, Vector3 localPos, Vector3 size, Material mat)
        {
            var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wall.name = "Wall";
            wall.transform.SetParent(parent, false);
            wall.transform.localScale = size;
            wall.transform.localPosition = localPos;
            wall.GetComponent<MeshRenderer>().sharedMaterial = mat;
        }

        private void Update()
        {
            if (_player == null) return;

            if (!_isInside)
            {
                if (Vector3.Distance(_player.position, _entryTriggerPos) <= TriggerRadius)
                {
                    _isInside = true;
                    _player.position = _entryLandingPosIndoor;
                    DialogueLabel.Instance?.Show("집 안으로 들어왔다 — 화면이 더는 휘지 않는다.", ToastSec);
                }
            }
            else
            {
                if (Vector3.Distance(_player.position, _exitTriggerPosIndoor) <= TriggerRadius)
                {
                    _isInside = false;
                    _player.position = _exitLandingPos;
                    DialogueLabel.Instance?.Show("밖으로 나왔다 — 다시 마을이 휘어 보인다.", ToastSec);
                }
            }
        }
    }
}
