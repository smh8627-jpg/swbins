using UnityEngine;

namespace Saga.Story.World
{
    /// <summary>
    /// VERTICAL_SLICE_STORY.md 2절 — "플레이어는 X만 따라가고(Y는 완만하게
    /// 보간), Z는 항상 같은 거리". DUNGEON `CameraRig.cs`의 추적·회전·줌
    /// 카메라와 달리 이 판은 **회전 자체가 없다** — 플레이어의 자식으로
    /// 안 두고 독립 오브젝트로 둔 이유도 그거다(자식으로 두면 부모 위치를
    /// 그대로 따라가 Y 보간을 못 한다).
    ///
    /// Unity 카메라는 로컬 +Z를 정면으로 본다(Godot는 -Z) — 그래서
    /// 플레이어(Z=0 평면)를 보려면 카메라가 **음(-)의 Z distance**에
    /// 서야 한다(saga-godot `story_camera.gd`는 +Z에 선다 — 핸디니스
    /// 차이, 값 자체는 같다).
    /// </summary>
    public class StoryCameraFollow : MonoBehaviour
    {
        private const float YOffset = 2.6f;
        private const float ZDistance = 16f;
        private const float YLerpRate = 3f;

        /// <summary>`DialogueLabel.Instance`·`RealmToast.Instance`와 같은
        /// 결 — 씬에 하나뿐이라 다른 컴포넌트(StoryPlayerController 등)가
        /// 참조 배선 없이 바로 Shake()를 부를 수 있다.</summary>
        public static StoryCameraFollow Instance { get; private set; }

        private Transform _player;
        private float _followY; // 흔들림과 분리한 "진짜" Lerp 목표 — 안 그러면 흔들림 오프셋이 다음 프레임 Lerp 시작점으로 누적된다.
        private float _shakeMagnitude;
        private float _shakeTimer;

        private void Awake() => Instance = this;
        private void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }

        private void Start()
        {
            var pos = transform.position;
            pos.z = -ZDistance;
            transform.position = pos;
            transform.rotation = Quaternion.identity;
            _followY = pos.y;
        }

        /// <summary>PLAN.md 101-3 C "shake" — DUNGEON `CameraRig.Shake()`와
        /// 같은 서명. 이 판은 회전 카메라가 없어 X·Y 평면 오프셋만 준다
        /// (Z는 항상 -ZDistance 고정).</summary>
        public void Shake(float magnitude, float duration)
        {
            _shakeMagnitude = magnitude;
            _shakeTimer = duration;
        }

        private void Update()
        {
            if (_player == null)
            {
                var go = GameObject.FindWithTag("Player");
                if (go == null) return;
                _player = go.transform;
            }

            _followY = Mathf.Lerp(_followY, _player.position.y + YOffset, YLerpRate * Time.deltaTime);

            Vector2 shakeOffset = Vector2.zero;
            if (_shakeTimer > 0f)
            {
                _shakeTimer -= Time.deltaTime;
                shakeOffset = Random.insideUnitCircle * _shakeMagnitude;
            }

            var pos = transform.position;
            pos.x = _player.position.x + shakeOffset.x;
            pos.y = _followY + shakeOffset.y;
            pos.z = -ZDistance;
            transform.position = pos;
        }
    }
}
