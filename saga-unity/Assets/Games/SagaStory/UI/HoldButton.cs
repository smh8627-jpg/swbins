using UnityEngine;
using UnityEngine.EventSystems;

namespace Saga.Story.UI
{
    /// <summary>
    /// VERTICAL_SLICE_STORY.md 19~21장(모바일 조작) — 이 판은 가로(X) 한
    /// 축뿐인 플랫포머라 다른 네 판이 쓰는 2축 `VirtualJoystick.cs`를
    /// 그대로 복사하지 않고(안 쓰는 세로 축이 화면만 차지) **누르고 있는
    /// 동안 true인 단순 버튼**을 새로 짰다(좌/우 이동 + 줄 오르내리기,
    /// 넷 다 "누르는 동안 계속"이 필요해 OnClick 한 번짜리로는 안 된다).
    /// </summary>
    public class HoldButton : MonoBehaviour, IPointerDownHandler, IPointerUpHandler, IPointerExitHandler
    {
        public bool IsHeld { get; private set; }

        public void OnPointerDown(PointerEventData eventData) => IsHeld = true;

        public void OnPointerUp(PointerEventData eventData) => IsHeld = false;

        // 손가락이 누른 채로 버튼 밖으로 미끄러지면 뗀 것으로 본다 —
        // 안 그러면 눌린 채로 못 풀려서 계속 이동/오르내리기가 남는다.
        public void OnPointerExit(PointerEventData eventData) => IsHeld = false;
    }
}
