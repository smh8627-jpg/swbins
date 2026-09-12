using UnityEngine;

namespace Saga.Dungeon.UI
{
    /// <summary>
    /// PLAN.md(saga-dungeon 웹판) 27장 "미니맵" — 이 던전이 Room1→Corridor→
    /// Room2→...→Room4로 이어지는 **한 줄짜리 통로**뿐이라(오픈월드/필드
    /// 슬라이스, 방 종류 마지막 슬라이스 참고, PLAN.md 28장 "월드맵"급
    /// 오버월드 지도는 범위 밖) 렌더텍스처용 위쪽 카메라를 새로 두지
    /// 않고 **좌표를 UI 사각형에 직접 투영하는 개략도**로 가장 작게
    /// 만들었다(모바일 성능 우선, PLAN.md 18장 — 카메라 추가 없음).
    /// 방 넷의 중심 좌표만 정적 점으로 찍어 두고(`roomMarkers`,
    /// BuildTestDungeonScene.cs가 배치), 플레이어 위치만 매 프레임
    /// 갱신한다.
    /// </summary>
    public class Minimap : MonoBehaviour
    {
        // 방1(z=0)~방4(z=90) + 방 반깊이(10)·복도(4)를 여유 있게 감싸는
        // 고정 범위(BuildTestDungeonScene.cs의 좌표 산출 주석과 같은 값).
        // "오픈월드 확장 — 마을 여러 개" — Town2(z=-30)가 남쪽에 생기면서
        // 아래쪽 여유도 그 남쪽에 다시 15(원래 Room1 위쪽에 두던 여유와
        // 같은 폭)를 더해 -15 → -45로 넓혔다(ProcRoom(z=120)이
        // WorldZMax(105) 밖에서 가장자리에 눌려 찍히는 것과 같은 기존
        // 관례를 Town2에도 그대로 적용해도 됐지만, 이번엔 여유가 남아
        // 정확한 위치로 찍히게 했다).
        private const float WorldXMin = -12f;
        private const float WorldXMax = 12f;
        private const float WorldZMin = -45f;
        private const float WorldZMax = 105f;

        [SerializeField] private RectTransform mapArea;
        [SerializeField] private RectTransform playerDot;

        private Transform _player;

        private void Awake()
        {
            var go = GameObject.FindWithTag("Player");
            _player = go != null ? go.transform : null;
        }

        private void Update()
        {
            if (_player == null || mapArea == null || playerDot == null) return;

            Vector2 size = mapArea.rect.size;
            float nx = Mathf.InverseLerp(WorldXMin, WorldXMax, _player.position.x);
            float nz = Mathf.InverseLerp(WorldZMin, WorldZMax, _player.position.z);
            playerDot.anchoredPosition = new Vector2((nx - 0.5f) * size.x, (nz - 0.5f) * size.y);
        }

        /// <summary>BuildTestDungeonScene.cs가 방 마커를 정적으로 배치할 때
        /// 쓴다 — Update()로 매 프레임 다시 계산할 필요가 없는 고정 점이라
        /// 빌드 시점에 한 번만 투영한다.</summary>
        public static Vector2 ProjectToMap(Vector3 worldPos, Vector2 mapSize)
        {
            float nx = Mathf.InverseLerp(WorldXMin, WorldXMax, worldPos.x);
            float nz = Mathf.InverseLerp(WorldZMin, WorldZMax, worldPos.z);
            return new Vector2((nx - 0.5f) * mapSize.x, (nz - 0.5f) * mapSize.y);
        }
    }
}
