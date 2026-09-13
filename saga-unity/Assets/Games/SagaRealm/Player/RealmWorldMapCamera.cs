using UnityEngine;
using UnityEngine.InputSystem;
using Saga.Realm.Data;
using Saga.Realm.World;

namespace Saga.Realm.Player
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 2-10절 "월드맵 드래그 궤도 카메라" + 2-9절
    /// "성표 탭으로 조망 대상 바꾸기"를 한 컴포넌트로 합쳤다(saga-godot은
    /// 두 파일로 나눴지만 여기선 드래그 판정 하나가 회전과 탭을 같이
    /// 가르는 게 자연스러워 합쳤다 — 개념만 참고, 코드는 새로). 완전한
    /// 구면 좌표(yaw+pitch+radius)로 원점(지도 중심)을 돈다 — 이 리그
    /// 자체가 도는 궤도점이라 자식 카메라는 로컬 원점에 그대로 둔다
    /// (RealmOrbitCamera.cs의 "자식 카메라를 뒤로 미는" 방식과 다름).
    ///
    /// GO/DUNGEON `Player/CameraRig.cs`의 드래그+문지방 요령을 그대로
    /// 재사용(마우스·터치 각각 받고 10px 문지방으로 회전과 탭을 가른다) —
    /// 문지방을 못 넘은 즉 "탭"으로 끝난 손떼기는 성표 클릭 판정으로
    /// 넘긴다.
    /// </summary>
    public class RealmWorldMapCamera : MonoBehaviour
    {
        private const float MinRadius = 120f;
        private const float MaxRadius = 420f;
        private const float ZoomStep = 14f;
        private const float MinPitchRad = 0.35f;
        private const float MaxPitchRad = 1.3f;
        private const float RotateSpeedRad = 0.006f;
        private const float DragThresholdPx = 10f;

        [SerializeField] private Camera cam;

        private float _radius = 240f;
        private float _pitchRad = 0.8f;
        private float _yawRad;

        private bool _dragging;
        private bool _dragConfirmed;
        private Vector2 _dragStart;
        private Vector2 _lastPointerPos;

        public float DebugYaw => _yawRad;
        public float DebugPitch => _pitchRad;
        public float DebugRadius => _radius;

        private void Awake()
        {
            if (cam == null) cam = GetComponentInChildren<Camera>();
            ApplyOrbit();
        }

        private void OnEnable()
        {
            // 디오라마↔지도 전환으로 이 GameObject가 다시 활성화될 때마다
            // Awake는 두 번째부터 안 돌므로 여기서도 한 번 더 맞춘다.
            ApplyOrbit();
        }

        private void Update()
        {
            HandlePointer();
            ApplyOrbit();
        }

        private void HandlePointer()
        {
            var mouse = Mouse.current;
            if (mouse != null)
            {
                Vector2 pos = mouse.position.ReadValue();
                if (mouse.leftButton.wasPressedThisFrame) BeginDrag(pos);
                else if (mouse.leftButton.wasReleasedThisFrame) EndDrag(pos);
                else if (mouse.leftButton.isPressed && _dragging) ApplyDrag(pos - _lastPointerPos, pos);
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
                    EndDrag(primary.position.ReadValue());
                }
            }
        }

        private void BeginDrag(Vector2 pos)
        {
            _dragging = true;
            _dragStart = pos;
            _dragConfirmed = false;
        }

        private void EndDrag(Vector2 pos)
        {
            _dragging = false;
            if (!_dragConfirmed) TrySelectCity(pos);
        }

        private void ApplyDrag(Vector2 relative, Vector2 pos)
        {
            if (!_dragConfirmed)
            {
                if (Vector2.Distance(pos, _dragStart) < DragThresholdPx) return;
                _dragConfirmed = true;
            }
            _yawRad += relative.x * RotateSpeedRad;
            _pitchRad = Mathf.Clamp(_pitchRad + relative.y * RotateSpeedRad, MinPitchRad, MaxPitchRad);
        }

        private void Zoom(float delta)
        {
            _radius = Mathf.Clamp(_radius + delta, MinRadius, MaxRadius);
        }

        private void ApplyOrbit()
        {
            float x = _radius * Mathf.Sin(_yawRad) * Mathf.Cos(_pitchRad);
            float z = _radius * Mathf.Cos(_yawRad) * Mathf.Cos(_pitchRad);
            float y = _radius * Mathf.Sin(_pitchRad);
            transform.position = new Vector3(x, y, z);
            transform.LookAt(Vector3.zero, Vector3.up);
        }

        private void TrySelectCity(Vector2 screenPos)
        {
            if (cam == null) return;
            var ray = cam.ScreenPointToRay(screenPos);
            if (Physics.Raycast(ray, out var hit, 2000f))
            {
                var marker = hit.collider.GetComponent<RealmCityMarkerId>();
                if (marker != null) RealmCityState.SetCurrentCity(marker.CityId);
            }
        }

        /// <summary>PlaytestRealmSlice.cs 전용 — 가짜 드래그/탭을 흉내낼 때 쓴다.</summary>
        public void DebugBeginDrag(Vector2 pos) => BeginDrag(pos);
        public void DebugApplyDrag(Vector2 relative, Vector2 pos) => ApplyDrag(relative, pos);
        public void DebugEndDrag(Vector2 pos) => EndDrag(pos);
    }
}
