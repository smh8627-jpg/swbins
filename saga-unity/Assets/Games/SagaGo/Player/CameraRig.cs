using UnityEngine;
using UnityEngine.InputSystem;

namespace Saga.Go.Player
{
    /// <summary>
    /// VERTICAL_SLICE.md Phase 4 — Player의 자식으로 붙어 위치는 저절로
    /// 따라온다(부모-자식 관계). 회전·줌만 이 스크립트가 다룬다. 웹판
    /// 사가고 README "끌면 카메라가 돈다"와 같은 조작 감각 — 수치는
    /// saga-godot의 camera_rig.gd(ROTATE_SPEED·줌·피치 범위)를 그대로
    /// 가져왔다(새로 설계하지 않는다, PLAN.md 2장).
    ///
    /// 이 프로젝트는 activeInputHandler=1(새 Input System 전용)이라
    /// UnityEngine.Input(레거시)은 안 쓴다 — Mouse/Touchscreen 디바이스를
    /// 직접 읽는다(Godot의 InputEventMouseButton/InputEventScreenDrag를
    /// 직접 받는 것과 같은 결).
    ///
    /// 주의 — 드래그 방향의 부호는 Godot(오른손 좌표계)과 Unity(왼손
    /// 좌표계)가 서로 달라 기계적으로 옮기지 않고 "일반적인 오빗 카메라"
    /// 감각(오른쪽으로 끌면 시점이 오른쪽으로 돈다)으로 다시 판단해
    /// 정했다 — saga-godot 빌드와 나란히 놓고 볼 때 실제로 느낌이 같은지는
    /// 아직 눈으로 확인 전이다(0장의 병행 비교 목적, 다음 실기 확인 때 볼 것).
    /// </summary>
    public class CameraRig : MonoBehaviour
    {
        private const float RotateSpeedDeg = 0.006f * Mathf.Rad2Deg; // Godot 0.006 rad/px와 같은 값
        private const float MinZoom = 4f;
        private const float MaxZoom = 16f;
        private const float ZoomStep = 1f;
        private const float MinPitchDeg = 15f;
        private const float MaxPitchDeg = 70f;
        private const float DragThresholdPx = 10f;

        [SerializeField] private Camera cam;

        private float _zoom = 9f;
        private float _pitchDeg = 35f; // 양수 = 아래를 내려다보는 각도(Godot의 -35와 같은 뜻)
        private float _yawDeg;

        private bool _dragging;
        private bool _dragConfirmed;
        private Vector2 _dragStart;
        private Vector2 _lastPointerPos;

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
            cam.transform.localPosition = new Vector3(0f, 0f, -_zoom);
        }
    }
}
