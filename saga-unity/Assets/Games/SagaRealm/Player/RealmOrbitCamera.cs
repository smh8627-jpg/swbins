using UnityEngine;
using UnityEngine.InputSystem;

namespace Saga.Realm.Player
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 1절 "성 하나를 3D로 조망한다" — REALM에는
    /// 이동하는 플레이어 아바타가 없어(1절 "실시간 이동·전투는 이 슬라이스에
    /// 아예 없다"), 다른 네 판의 드래그 오빗(SagaDungeon/SagaGo
    /// `Player/CameraRig.cs`)을 그대로 안 옮기고 WASD 오빗으로 새로 짰다
    /// — saga-godot REALM 1절이 "성 조망 단일 화면엔 드래그보다 WASD가
    /// 더 어울린다"고 정한 것과 같은 결론(개념만 참고, 코드는 새로).
    /// 이 리그는 성 중심(원점)에 고정된 채 도는 궤도 카메라다 — 쫓아갈
    /// 대상이 없다.
    /// </summary>
    public class RealmOrbitCamera : MonoBehaviour
    {
        private const float RotateSpeedDeg = 60f;
        private const float ZoomSpeed = 8f;
        private const float MinZoom = 8f;
        private const float MaxZoom = 24f;
        private const float MinPitchDeg = 25f;
        private const float MaxPitchDeg = 70f;

        [SerializeField] private Camera cam;

        private float _zoom = 16f;
        private float _pitchDeg = 45f;
        private float _yawDeg;

        private void Awake()
        {
            if (cam == null) cam = GetComponentInChildren<Camera>();
            transform.localRotation = Quaternion.Euler(_pitchDeg, _yawDeg, 0f);
            ApplyZoom();
        }

        private void Update()
        {
            float dt = Time.deltaTime;
            var kb = Keyboard.current;
            if (kb != null)
            {
                if (kb.aKey.isPressed) _yawDeg -= RotateSpeedDeg * dt;
                if (kb.dKey.isPressed) _yawDeg += RotateSpeedDeg * dt;
                if (kb.wKey.isPressed) _pitchDeg = Mathf.Clamp(_pitchDeg - RotateSpeedDeg * dt, MinPitchDeg, MaxPitchDeg);
                if (kb.sKey.isPressed) _pitchDeg = Mathf.Clamp(_pitchDeg + RotateSpeedDeg * dt, MinPitchDeg, MaxPitchDeg);
                if (kb.qKey.isPressed) Zoom(-ZoomSpeed * dt);
                if (kb.eKey.isPressed) Zoom(ZoomSpeed * dt);
            }

            var mouse = Mouse.current;
            if (mouse != null)
            {
                float scrollY = mouse.scroll.ReadValue().y;
                if (scrollY != 0f) Zoom(-scrollY * 0.02f * ZoomSpeed);
            }

            transform.localRotation = Quaternion.Euler(_pitchDeg, _yawDeg, 0f);
            ApplyZoom();
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
