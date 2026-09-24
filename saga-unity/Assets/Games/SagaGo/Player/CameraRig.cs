using System.Collections;
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

        // PLAN.md 102-5 "카메라 클리핑" 폴리시(2026-09-22) — DUNGEON
        // `CameraRig.ResolveCollisionZoom()`과 같은 로직(Cinemachine 없이
        // 수동 raycast pull-in, 이 asmdef가 SagaDungeon을 참조하지 않아
        // 새로 짠다).
        private const float CameraSkin = 0.6f;
        private const float CameraCollisionBuffer = 0.2f;

        [SerializeField] private Camera cam;
        // PLAN.md 106-9 — 있으면 실제 카메라 대신 이 플레이 가상 카메라(CinemachineCamera)를 민다. 실제 카메라는
        // `CinemachineBrain` 이 여기(평소) 또는 두목 등장 컷 카메라에 붙인다(DUNGEON `CameraRig.view` 와 같은 결).
        [SerializeField] private Transform view;

        private float _zoom = 9f;
        private float _pitchDeg = 35f; // 양수 = 아래를 내려다보는 각도(Godot의 -35와 같은 뜻)
        private float _yawDeg;

        private bool _dragging;
        private bool _dragConfirmed;
        private Vector2 _dragStart;
        private Vector2 _lastPointerPos;

        // PLAN.md 101-3 G "성장 연출"(2026-09-17) — DUNGEON `CameraRig.
        // PlayLevelUpCut()`과 같은 로직(줌을 MinZoom까지 당겼다 되돌린다).
        // 이 asmdef가 SagaDungeon을 참조하지 않아 새로 짠다.
        private const float LevelUpZoomInSec = 0.3f;
        private const float LevelUpHoldSec = 0.6f;
        private const float LevelUpZoomOutSec = 0.3f;
        private Coroutine _levelUpRoutine;

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

        /// <summary>`GameBootstrap.OnLeveledUp()`이 부른다 — 줌을 MinZoom까지
        /// 당겼다 잠깐 멎었다 되돌린다. 아무 키나 누르면 그 프레임에 원래
        /// 줌으로 바로 돌아간다(DUNGEON `CameraRig.PlayLevelUpCut()`과 같은 결).</summary>
        public void PlayLevelUpCut()
        {
            if (_levelUpRoutine != null) StopCoroutine(_levelUpRoutine);
            _levelUpRoutine = StartCoroutine(LevelUpCutRoutine());
        }

        private IEnumerator LevelUpCutRoutine()
        {
            float startZoom = _zoom;
            float t = 0f;
            while (t < LevelUpZoomInSec)
            {
                if (AnyKeyPressed()) { _zoom = startZoom; _levelUpRoutine = null; yield break; }
                t += Time.deltaTime;
                _zoom = Mathf.Lerp(startZoom, MinZoom, t / LevelUpZoomInSec);
                yield return null;
            }
            _zoom = MinZoom;

            t = 0f;
            while (t < LevelUpHoldSec)
            {
                if (AnyKeyPressed()) break;
                t += Time.deltaTime;
                yield return null;
            }

            t = 0f;
            while (t < LevelUpZoomOutSec)
            {
                t += Time.deltaTime;
                _zoom = Mathf.Lerp(MinZoom, startZoom, t / LevelUpZoomOutSec);
                yield return null;
            }
            _zoom = startZoom;
            _levelUpRoutine = null;
        }

        private static bool AnyKeyPressed()
        {
            var kb = Keyboard.current;
            if (kb != null && kb.anyKey.wasPressedThisFrame) return true;
            var mouse = Mouse.current;
            if (mouse != null && mouse.leftButton.wasPressedThisFrame) return true;
            var touch = Touchscreen.current;
            if (touch != null && touch.primaryTouch.press.wasPressedThisFrame) return true;
            return false;
        }

        private void ApplyZoom()
        {
            Transform target = view != null ? view : cam != null ? cam.transform : null;
            if (target == null) return;
            float clippedZoom = ResolveCollisionZoom(_zoom);
            target.localPosition = new Vector3(0f, 0f, -clippedZoom);
        }

        /// <summary>벽에 카메라가 파고들지 않도록 원하는 줌 거리 안에서
        /// raycast로 막힌 지점을 찾으면 그만큼 당긴다(102-5 "카메라 클리핑").
        /// 막힌 게 없으면 원래 _zoom 그대로 돌려준다 — 이 메서드는 _zoom
        /// 자체는 바꾸지 않아 장애물을 벗어나면 바로 원래 거리로 복귀한다.</summary>
        private float ResolveCollisionZoom(float desiredZoom)
        {
            if (desiredZoom <= CameraSkin) return desiredZoom;
            Vector3 origin = transform.position;
            Vector3 dir = transform.TransformDirection(Vector3.back);
            Vector3 castStart = origin + dir * CameraSkin;
            float castDistance = desiredZoom - CameraSkin;
            if (Physics.Raycast(castStart, dir, out RaycastHit hit, castDistance, ~0, QueryTriggerInteraction.Ignore))
            {
                return Mathf.Max(CameraSkin, CameraSkin + hit.distance - CameraCollisionBuffer);
            }
            return desiredZoom;
        }
    }
}
