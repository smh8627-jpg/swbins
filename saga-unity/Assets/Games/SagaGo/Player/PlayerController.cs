using UnityEngine;
using UnityEngine.InputSystem;
using Saga.Go.UI;

namespace Saga.Go.Player
{
    /// <summary>
    /// VERTICAL_SLICE.md Phase 4 — 이동(조이스틱 우선, 없으면 Move
    /// 액션(WASD/화살표) 폴백) · 달리기(Sprint) · 중력 · CharacterController
    /// 충돌 · 이동 방향으로 몸통 회전. 수치는 saga-godot의 player.gd를
    /// 그대로 가져왔다(새로 설계하지 않는다).
    ///
    /// 아직 GLB 캐릭터가 없어 Visual은 primitive Capsule이다(PLAN.md 8장
    /// "Placeholder는 개발 초기 테스트용" — saga-godot도 처음엔 캡슐이었다
    /// 가 2026-09-11에 GLB로 바꿨다). 애니메이션 재생(idle/walk/sprint)은
    /// GLB가 들어온 뒤에 붙인다.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public class PlayerController : MonoBehaviour
    {
        private const float WalkSpeed = 6f;
        private const float RunSpeed = 10f;
        private const float Gravity = 20f;
        private const float TurnRate = 12f; // Godot lerp_angle(from,to,weight)의 weight와 같은 순수 보간 계수(각도 단위 아님)

        [SerializeField] private Transform visual;
        [SerializeField] private CameraRig cameraRig;
        [SerializeField] private InputActionAsset inputActions;
        [SerializeField] private VirtualJoystick joystick;

        private CharacterController _controller;
        private InputAction _moveAction;
        private InputAction _sprintAction;
        private float _verticalVelocity;

        private void Awake()
        {
            _controller = GetComponent<CharacterController>();

            if (inputActions != null)
            {
                var map = inputActions.FindActionMap("Player", throwIfNotFound: false);
                if (map != null)
                {
                    _moveAction = map.FindAction("Move");
                    _sprintAction = map.FindAction("Sprint");
                    map.Enable();
                }
            }

            if (joystick == null)
            {
                joystick = Object.FindFirstObjectByType<VirtualJoystick>();
            }
        }

        private void Update()
        {
            float dt = Time.deltaTime;

            if (_controller.isGrounded && _verticalVelocity < 0f)
            {
                _verticalVelocity = 0f;
            }
            _verticalVelocity -= Gravity * dt;

            Vector2 inputDir = MovementInput();
            Vector3 moveDir = WorldDirection(inputDir);

            bool running = _sprintAction != null && _sprintAction.IsPressed();
            float speed = running ? RunSpeed : WalkSpeed;

            Vector3 horizontal = moveDir * speed;
            _controller.Move(new Vector3(horizontal.x, _verticalVelocity, horizontal.z) * dt);

            if (moveDir.sqrMagnitude > 0.05f * 0.05f && visual != null)
            {
                float targetYaw = Mathf.Atan2(moveDir.x, moveDir.z) * Mathf.Rad2Deg;
                float yaw = Mathf.LerpAngle(visual.eulerAngles.y, targetYaw, TurnRate * dt);
                visual.rotation = Quaternion.Euler(0f, yaw, 0f);
            }
        }

        /// <summary>조이스틱이 있고 밀렸으면 그걸 우선한다(모바일) — 아니면 Move 액션으로 되돈다.</summary>
        private Vector2 MovementInput()
        {
            if (joystick != null && joystick.Value.sqrMagnitude > 0.05f * 0.05f)
            {
                return joystick.Value;
            }
            return _moveAction != null ? _moveAction.ReadValue<Vector2>() : Vector2.zero;
        }

        /// <summary>입력(x=오른쪽, y=앞)을 카메라가 보는 방향 기준 월드 벡터로 바꾼다.</summary>
        private Vector3 WorldDirection(Vector2 inputDir)
        {
            if (inputDir.sqrMagnitude < 0.001f) return Vector3.zero;

            Transform basis = cameraRig != null ? cameraRig.transform : transform;
            Vector3 forward = basis.forward; forward.y = 0f; forward.Normalize();
            Vector3 right = basis.right; right.y = 0f; right.Normalize();

            Vector3 dir = forward * inputDir.y + right * inputDir.x;
            if (dir.sqrMagnitude > 1f) dir.Normalize();
            return dir;
        }
    }
}
