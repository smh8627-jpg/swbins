using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

namespace Saga.Dungeon.UI
{
    /// <summary>
    /// saga-dungeon 웹판 PLAN.md 28-1절 "지도 UI — 디아블로 M키 방식"을
    /// 옮겼다. `Minimap.cs`(늘 화면 구석에 방·마을 점만 찍는 작은 개략도)
    /// 와는 목적이 다르다 — M키를 누르면 화면 중앙에 나침반형 5칸이
    /// 펼쳐져 "지금 어느 지역에 있고 다른 마을이 어느 방향에 있는지"를
    /// 보여준다. **텔레포트 없음 — 보기만 하는 창**(웹판과 같은 결).
    /// 현재 위치 칸만 매 프레임(패널이 열려 있을 때만) 밝게 강조한다.
    /// </summary>
    public class OverworldMapUI : MonoBehaviour
    {
        // BuildTestDungeonScene.cs 좌표 산출과 같은 값 — 정확한 경계선이
        // 아니라 "대략 이 방향"을 가르는 느슨한 문턱이라 방마다 정확한
        // 범위를 따로 안 쓴다(Room1 자체는 반경 10 안쪽이라 항상 중심).
        private const float RegionThreshold = 15f;

        [SerializeField] private GameObject panel;
        [SerializeField] private Image centerCell;
        [SerializeField] private Image northCell;
        [SerializeField] private Image southCell;
        [SerializeField] private Image westCell;
        [SerializeField] private Image eastCell;

        private static readonly Color DimColor = new Color(1f, 1f, 1f, 0.12f);
        private static readonly Color HighlightColor = new Color(1f, 0.85f, 0.35f, 0.55f);

        private Transform _player;
        private bool _visible;

        private void Awake()
        {
            var go = GameObject.FindWithTag("Player");
            _player = go != null ? go.transform : null;
            if (panel != null) panel.SetActive(false);
        }

        private void Update()
        {
            var kb = Keyboard.current;
            if (kb != null && kb.mKey.wasPressedThisFrame)
            {
                _visible = !_visible;
                if (panel != null) panel.SetActive(_visible);
            }

            if (_visible) UpdateHighlight();
        }

        private void UpdateHighlight()
        {
            if (_player == null) return;

            ResetCell(centerCell);
            ResetCell(northCell);
            ResetCell(southCell);
            ResetCell(westCell);
            ResetCell(eastCell);

            Vector3 p = _player.position;
            Image current;
            if (p.z < -RegionThreshold) current = southCell;
            else if (p.x < -RegionThreshold) current = westCell;
            else if (p.x > RegionThreshold) current = eastCell;
            else if (p.z > RegionThreshold) current = northCell;
            else current = centerCell;

            if (current != null) current.color = HighlightColor;
        }

        private static void ResetCell(Image cell)
        {
            if (cell != null) cell.color = DimColor;
        }
    }
}
