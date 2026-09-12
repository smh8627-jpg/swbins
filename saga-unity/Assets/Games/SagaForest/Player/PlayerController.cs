using UnityEngine;
using UnityEngine.InputSystem;
using Saga.Forest.UI;

namespace Saga.Forest.Player
{
    /// <summary>
    /// VERTICAL_SLICE_FOREST.md(saga-godot) 3절 — "Player 루트는 회전하지
    /// 않는다(Visual 자식만 돈다)"가 고정 카메라의 핵심 전제라, GO의
    /// `Player/PlayerController.cs`(다섯 벌 복사 원칙, 이동·중력·회전
    /// 로직이 게임과 무관해 그대로 가져온다)를 네임스페이스만 바꿔
    /// 그대로 썼다 — DUNGEON판(회피 로직 포함)이 아니라 GO판을 기준으로
    /// 삼은 이유는 FOREST 첫 슬라이스에 전투/회피가 없어 GO 쪽이 더
    /// 가까운 대응이기 때문(godot 문서도 `games/saga_go/player/player.gd`
    /// 재사용을 명시).
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public class PlayerController : MonoBehaviour
    {
        private const float WalkSpeed = 6f;
        private const float RunSpeed = 10f;
        private const float Gravity = 20f;
        private const float TurnRate = 12f;

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

        private Vector2 MovementInput()
        {
            if (joystick != null && joystick.Value.sqrMagnitude > 0.05f * 0.05f)
            {
                return joystick.Value;
            }
            return _moveAction != null ? _moveAction.ReadValue<Vector2>() : Vector2.zero;
        }

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
