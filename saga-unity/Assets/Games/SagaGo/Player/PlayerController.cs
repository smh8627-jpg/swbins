using UnityEngine;
using UnityEngine.InputSystem;
using Saga.Go.Combat;
using Saga.Go.UI;
using Saga.Go.World;

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
        // 44장 "Player" 교체 — Maria(리깅+Animator)가 배정되면 채워진다
        // (BuildTestVillageScene.BuildPlayerVisual 참고). null이면(character-a
        // 폴백 등) 예전처럼 몸통 회전만 하고 애니메이션은 안 돈다 — 씬이 안 깨짐
        // (Saga.Dungeon.Player.PlayerController와 같은 결).
        [SerializeField] private Animator animator;

        // PLAN.md 101-3 C hitstop(2026-09-17) — BanditEncounter/RareWolfEncounter가
        // 타격 순간 잠깐 멈추려고 읽는다(DUNGEON `PlayerCombat.cs`의 같은 이름
        // 프로퍼티와 같은 결).
        public Animator Animator => animator;

        /// <summary>PLAN.md 101-3 G "장비 가시화"(2026-09-17) — `WeaponVisual`이
        /// 무기 소켓을 심을 자리를 찾으려고 읽는다(DUNGEON `PlayerController.
        /// Visual`과 같은 결).</summary>
        public Transform Visual => visual;

        private const float FootprintIntervalSec = 0.35f; // PLAN.md 101-3 G "지형 반응" — 발자국 간격.

        private CharacterController _controller;
        private InputAction _moveAction;
        private InputAction _sprintAction;
        private float _verticalVelocity;
        private float _footprintCooldown;

        // PLAN.md 107-1 "회피" — 들판 전투(`FieldCombat`)가 부르는 짧은 대시. 무적은 FieldCombat 몫.
        private float _dashTimeLeft;
        private Vector3 _dashVelocity;

        public bool IsDashing => _dashTimeLeft > 0f;

        /// <summary>PLAN.md 107-1 — `dir` 쪽으로 `seconds` 동안 `distance` 만큼 미끄러진다(입력 무시).
        /// Maria 면 구르기 클립(`Dodge` 트리거).</summary>
        public void Dash(Vector3 dir, float distance, float seconds)
        {
            dir.y = 0f;
            if (dir.sqrMagnitude < 0.0001f) dir = visual != null ? visual.forward : transform.forward;
            dir.Normalize();
            _dashVelocity = dir * (distance / Mathf.Max(0.01f, seconds));
            _dashTimeLeft = seconds;
            if (visual != null) visual.rotation = Quaternion.LookRotation(dir);
            if (animator != null) animator.SetTrigger("Dodge");
        }

        /// <summary>`FieldCombat` 이 공격 순간 몸을 대상 쪽으로 돌릴 때.</summary>
        public void FaceToward(Vector3 worldPos)
        {
            if (visual == null) return;
            Vector3 d = worldPos - transform.position;
            d.y = 0f;
            if (d.sqrMagnitude < 0.0001f) return;
            visual.rotation = Quaternion.LookRotation(d);
        }

        /// <summary>현재 입력의 월드 방향(카메라 기준, 길이 ≤1) — 회피 방향용.</summary>
        public Vector3 MoveIntent => WorldDirection(MovementInput());

        /// <summary>쓰러져 마을로 돌아갈 때 — CharacterController 는 꺼야 순간이동이 먹는다.</summary>
        public void Teleport(Vector3 pos)
        {
            _controller.enabled = false;
            transform.position = pos;
            _controller.enabled = true;
            _verticalVelocity = 0f;
            _dashTimeLeft = 0f;
        }

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
            GoStamina.Tick(dt);

            if (_dashTimeLeft > 0f)
            {
                _dashTimeLeft -= dt;
                _controller.Move(new Vector3(_dashVelocity.x, _verticalVelocity, _dashVelocity.z) * dt);
                return;
            }

            Vector2 inputDir = MovementInput();
            Vector3 moveDir = WorldDirection(inputDir);

            // PLAN.md 107-1 — 달리기는 스태미나를 초당 8 쓴다(바닥나면 30까지 잠김).
            bool running = _sprintAction != null && _sprintAction.IsPressed()
                && moveDir.sqrMagnitude > 0.05f * 0.05f && GoStamina.Drain(GoStamina.SprintPerSec * dt);
            float speed = running ? RunSpeed : WalkSpeed;

            Vector3 horizontal = moveDir * speed;
            _controller.Move(new Vector3(horizontal.x, _verticalVelocity, horizontal.z) * dt);

            bool moving = moveDir.sqrMagnitude > 0.05f * 0.05f;
            if (moving && visual != null)
            {
                float targetYaw = Mathf.Atan2(moveDir.x, moveDir.z) * Mathf.Rad2Deg;
                float yaw = Mathf.LerpAngle(visual.eulerAngles.y, targetYaw, TurnRate * dt);
                visual.rotation = Quaternion.Euler(0f, yaw, 0f);
            }

            if (moving)
            {
                // PLAN.md 101-3 G "지형 반응" — 걷는 동안 일정 간격으로 발자국.
                _footprintCooldown -= dt;
                if (_footprintCooldown <= 0f)
                {
                    _footprintCooldown = FootprintIntervalSec;
                    GroundDecal.Spawn(transform.position, GroundDecal.Kind.Footprint);
                }
            }

            // Maria.controller의 Speed 파라미터(Idle↔Walk↔Run 블렌드,
            // Saga.Dungeon.Player.PlayerController와 같은 관례 — >0.1 걷기,
            // >0.6 뛰기 임계값은 Animator Controller 쪽에 있다).
            if (animator != null)
            {
                animator.SetFloat("Speed", moving ? (running ? 1f : 0.5f) : 0f);
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
