using UnityEngine;
using UnityEngine.EventSystems;

namespace Saga.Forest.UI
{
    /// <summary>
    /// VERTICAL_SLICE_FOREST.md — GO/DUNGEON의 UI/VirtualJoystick.cs를
    /// 그대로 복사(네임스페이스만 변경, 조작 감각은 게임과 무관).
    /// </summary>
    public class VirtualJoystick : MonoBehaviour, IPointerDownHandler, IDragHandler, IPointerUpHandler
    {
        [SerializeField] private RectTransform knob;
        [SerializeField] private float radius = 60f;

        public Vector2 Value { get; private set; } = Vector2.zero;

        private RectTransform _rect;

        private void Awake()
        {
            _rect = (RectTransform)transform;
            CenterKnob();
        }

        private void CenterKnob()
        {
            if (knob != null) knob.anchoredPosition = Vector2.zero;
        }

        public void OnPointerDown(PointerEventData eventData) => UpdateKnob(eventData);
        public void OnDrag(PointerEventData eventData) => UpdateKnob(eventData);

        public void OnPointerUp(PointerEventData eventData)
        {
            CenterKnob();
            Value = Vector2.zero;
        }

        private void UpdateKnob(PointerEventData eventData)
        {
            RectTransformUtility.ScreenPointToLocalPointInRectangle(
                _rect, eventData.position, eventData.pressEventCamera, out Vector2 local);
            if (local.magnitude > radius) local = local.normalized * radius;
            if (knob != null) knob.anchoredPosition = local;
            Value = new Vector2(local.x / radius, local.y / radius);
        }
    }
}
