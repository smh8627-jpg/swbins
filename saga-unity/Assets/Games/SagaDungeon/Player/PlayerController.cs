using UnityEngine;
using UnityEngine.InputSystem;
using Saga.Dungeon.Data;
using Saga.Dungeon.UI;

namespace Saga.Dungeon.Player
{
    /// <summary>
    /// VERTICAL_SLICE_DUNGEON.md — SagaGo의 Player/PlayerController.cs를
    /// 그대로 복사(네임스페이스만 변경, 루트 CLAUDE.md "다섯 판은 다섯 벌
    /// 복사" 원칙을 이 Unity 트랙에도 적용 — SagaCore가 비어 있어 공유할
    /// 기반도 없다). 이동·중력·CharacterController 로직은 게임과 무관해서
    /// 새로 설계하지 않는다. **다음 슬라이스 "회피"만 DUNGEON 고유 로직이라
    /// 새로 짰다** — 웹판 `js/dungeon.js:2510` `doDodge()`의 실제 상수를
    /// 그대로 옮김: `DODGE_CD=0.9`·`DODGE_SEC=0.16`·`DODGE_INVULN=0.22`
    /// (전부 시간 단위라 변환 불필요). `DODGE_SPD=520`(px/초)만 물리 거리라
    /// `DungeonRoomBuilder.cs`가 이미 쓴 px→m 환산(ROOM_W 560px = 20m,
    /// 28px/m)을 그대로 적용해 이동 거리 ≈2.97m→3m으로 잡았다.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public class PlayerController : MonoBehaviour
    {
        private const float WalkSpeed = 6f;
        private const float RunSpeed = 10f;
        private const float Gravity = 20f;
        private const float TurnRate = 12f;

        private const float DodgeCooldownSec = 0.9f;   // dungeon.js DODGE_CD
        private const float DodgeDurationSec = 0.16f;  // dungeon.js DODGE_SEC
        private const float DodgeInvulnSec = 0.22f;    // dungeon.js DODGE_INVULN
        private const float DodgeDistance = 3f;        // DODGE_SPD(520px/s) × 0.16s ÷ 28px/m ≈ 2.97m
        private const float DodgeSpeed = DodgeDistance / DodgeDurationSec;

        [SerializeField] private Transform visual;
        [SerializeField] private CameraRig cameraRig;
        [SerializeField] private InputActionAsset inputActions;
        [SerializeField] private VirtualJoystick joystick;

        private CharacterController _controller;
        private InputAction _moveAction;
        private InputAction _sprintAction;
        private float _verticalVelocity;

        private float _dodgeTimeLeft;
        private float _dodgeCooldownLeft;
        private float _invulnTimeLeft;
        private Vector3 _dodgeDir;

        public Transform Visual => visual;

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

            if (_dodgeCooldownLeft > 0f) _dodgeCooldownLeft -= dt;
            if (_invulnTimeLeft > 0f) _invulnTimeLeft -= dt;
            HeroState.Invulnerable = _invulnTimeLeft > 0f;

            var kb = Keyboard.current;
            if (kb != null && kb.leftCtrlKey.wasPressedThisFrame)
            {
                TryDodge();
            }

            Vector2 inputDir = MovementInput();
            Vector3 moveDir = WorldDirection(inputDir);

            if (_dodgeTimeLeft > 0f)
            {
                _dodgeTimeLeft -= dt;
                Vector3 dash = _dodgeDir * DodgeSpeed;
                _controller.Move(new Vector3(dash.x, _verticalVelocity, dash.z) * dt);
                return; // 회피 중엔 일반 이동·회전 입력을 무시 — dungeon.js도 dodge 중엔 p.dirX/Y를 안 봄.
            }

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

        /// <summary>회피 트리거 — 데스크톱은 Update()의 Left Ctrl, 모바일은
        /// 화면 "회피" 버튼(OnClick)이 직접 부른다(PlayerCombat.cs의
        /// TriggerAttack()과 같은 결).</summary>
        public void TryDodge()
        {
            if (_dodgeCooldownLeft > 0f || _dodgeTimeLeft > 0f) return;

            Vector3 dir = WorldDirection(MovementInput());
            if (dir.sqrMagnitude < 0.0001f)
            {
                dir = visual != null ? visual.forward : transform.forward;
            }
            dir.y = 0f;
            dir.Normalize();

            _dodgeDir = dir;
            _dodgeTimeLeft = DodgeDurationSec;
            _dodgeCooldownLeft = DodgeCooldownSec;
            _invulnTimeLeft = DodgeInvulnSec;
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
