using UnityEngine;
using UnityEngine.InputSystem;

namespace Saga.Dungeon.Player
{
    /// <summary>
    /// VERTICAL_SLICE_DUNGEON.md — SagaGo의 Player/CameraRig.cs를 그대로
    /// 복사(오빗 카메라 조작 감각은 게임과 무관). **기본 피치·줌만 다르게
    /// 튜닝**했다 — saga-dungeon 웹판 PLAN.md 16장·28-5절이 "디아블로
    /// 감각"(더 내려다보는 각도, 더 가까운 줌)을 목표로 적어 뒀고, 28-5절은
    /// 화각을 완전히 고정하는 시도는 한 번 되돌렸다(자유 오빗을 유지하는
    /// 쪽이 나았다는 뜻으로 읽었다) — 그래서 GO처럼 자유 오빗은 그대로 두고
    /// 기본값만 더 위·더 가깝게 잡았다.
    /// </summary>
    public class CameraRig : MonoBehaviour
    {
        private const float RotateSpeedDeg = 0.006f * Mathf.Rad2Deg;
        private const float MinZoom = 3f;
        private const float MaxZoom = 10f;
        private const float ZoomStep = 1f;
        private const float MinPitchDeg = 30f;
        private const float MaxPitchDeg = 75f;
        private const float DragThresholdPx = 10f;

        [SerializeField] private Camera cam;

        private float _zoom = 6f;
        private float _pitchDeg = 55f; // GO(35°)보다 더 내려다본다 — 디아블로 감각.
        private float _yawDeg;

        private bool _dragging;
        private bool _dragConfirmed;
        private Vector2 _dragStart;
        private Vector2 _lastPointerPos;

        // "타격감 1차" 슬라이스(PLAN.md 38장 "camera shake") — 짧고 작은
        // 흔들림만, 어지럽지 않게 강공격에도 0.12 정도로 제한한다.
        private float _shakeTimer;
        private float _shakeMagnitude;

        private void Awake()
        {
            if (cam == null) cam = GetComponentInChildren<Camera>();
            transform.localRotation = Quaternion.Euler(_pitchDeg, _yawDeg, 0f);
            ApplyZoom();
        }

        private void Update()
        {
            HandlePointer();
            ApplyZoom();
        }

        /// <summary>PlayerCombat.cs가 타격 성공 시 부른다 — magnitude는
        /// 로컬 좌표 오프셋 반경(m), duration은 지속 시간(초).</summary>
        public void Shake(float magnitude, float duration)
        {
            _shakeMagnitude = magnitude;
            _shakeTimer = duration;
        }

        private void HandlePointer()
        {
            var mouse = Mouse.current;
            if (mouse != null)
            {
                Vector2 pos = mouse.position.ReadValue();
                if (mouse.leftButton.wasPressedThisFrame) BeginDrag(pos);
                else if (mouse.leftButton.wasReleasedThisFrame) EndDrag();
                else if (mouse.leftButton.isPressed && _dragging)
                {
                    ApplyDrag(pos - _lastPointerPos, pos);
                }
                if (mouse.leftButton.isPressed) _lastPointerPos = pos;

                float scrollY = mouse.scroll.ReadValue().y;
                if (scrollY > 0f) Zoom(-ZoomStep);
                else if (scrollY < 0f) Zoom(ZoomStep);
            }

            var touch = Touchscreen.current;
            if (touch != null)
            {
                var primary = touch.primaryTouch;
                if (primary.press.wasPressedThisFrame)
                {
                    Vector2 pos = primary.position.ReadValue();
                    BeginDrag(pos);
                    _lastPointerPos = pos;
                }
                else if (primary.press.isPressed && _dragging)
                {
                    Vector2 pos = primary.position.ReadValue();
                    ApplyDrag(pos - _lastPointerPos, pos);
                    _lastPointerPos = pos;
                }
                else if (primary.press.wasReleasedThisFrame)
                {
                    EndDrag();
                }
            }
        }

        private void BeginDrag(Vector2 pos)
        {
            _dragging = true;
            _dragStart = pos;
            _dragConfirmed = false;
        }

        private void EndDrag()
        {
            _dragging = false;
        }

        private void ApplyDrag(Vector2 relative, Vector2 pos)
        {
            if (!_dragConfirmed)
            {
                if (Vector2.Distance(pos, _dragStart) < DragThresholdPx) return;
                _dragConfirmed = true;
            }
            _yawDeg += relative.x * RotateSpeedDeg;
            _pitchDeg = Mathf.Clamp(_pitchDeg + relative.y * RotateSpeedDeg, MinPitchDeg, MaxPitchDeg);
            transform.localRotation = Quaternion.Euler(_pitchDeg, _yawDeg, 0f);
        }

        private void Zoom(float delta)
        {
            _zoom = Mathf.Clamp(_zoom + delta, MinZoom, MaxZoom);
        }

        private void ApplyZoom()
        {
            if (cam == null) return;
            Vector3 shakeOffset = Vector3.zero;
            if (_shakeTimer > 0f)
            {
                _shakeTimer -= Time.deltaTime;
                shakeOffset = Random.insideUnitSphere * _shakeMagnitude;
            }
            cam.transform.localPosition = new Vector3(0f, 0f, -_zoom) + shakeOffset;
        }
    }
}
