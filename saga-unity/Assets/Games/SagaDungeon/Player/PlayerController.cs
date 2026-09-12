using UnityEngine;
using UnityEngine.InputSystem;
using Saga.Dungeon.Data;
using Saga.Dungeon.UI;
using Saga.Dungeon.World;

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
    ///
    /// "회피 애니메이션·이펙트" 슬라이스 — 이 프로젝트엔 아직 Animator/
    /// 스켈레톤 애니메이션 재생 파이프라인이 전혀 없다(캐릭터 GLB는
    /// `CharacterVisual.Spawn()`으로 정적으로 세울 뿐, saga-godot의
    /// `assets/characters/*`엔 AnimationPlayer가 딸려 있어도 이쪽에서
    /// 아직 그 클립을 재생하지 않음). 그 파이프라인을 새로 놓는 건 이
    /// 조각 하나 몫을 훨씬 넘는 일이라, `BanditEncounter.cs`가 이미 쓰는
    /// 절차적 연출 방식(Tint·Coroutine 스케일 펄스)과 같은 결로 세
    /// 가지를 코드로 직접 만든다: **회전 애니메이션**(구르는 동작 —
    /// `visual`을 회피 방향으로 향하게 한 뒤 로컬 X축으로 360도 굴림,
    /// 정확히 한 바퀴라 끝나면 자동으로 다시 똑바로 섬), **잔상 이펙트**
    /// (`TrailRenderer`, 새 셰이더 없이 어디서나 되는 `Sprites/Default`),
    /// **무적 틴트**(`CharacterVisual.Tint()` 재사용 — 회피 대시(0.16초)
    /// 보다 긴 무적 시간(0.22초) 내내 옅은 하늘색으로 덮어써 "지금 안
    /// 맞는다"를 눈으로 알 수 있게).
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

        private const float DodgeTrailFadeSec = 0.25f; // 대시보다 살짝 길게 남는 잔상
        private static readonly Color DodgeTintColor = new Color(0.75f, 0.92f, 1f); // 무적 동안 옅은 하늘색

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
        private TrailRenderer _dodgeTrail;
        private bool _wasInvulnerable;

        public Transform Visual => visual;

        /// <summary>강공격(Player/PlayerCombat.cs)이 참고 — 웹판 heavyAttack()도
        /// `p.dodge`(회피 중) 동안엔 강공격을 막는다.</summary>
        public bool IsDodging => _dodgeTimeLeft > 0f;

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

            _dodgeTrail = BuildDodgeTrail();
        }

        /// <summary>회피 잔상 — 회전 애니메이션과 달리 `visual`이 아니라
        /// 플레이어 루트(`transform`)에 붙인다(구르는 회전에 잔상 폭이
        /// 같이 뒤틀리지 않게).</summary>
        private TrailRenderer BuildDodgeTrail()
        {
            var trail = gameObject.AddComponent<TrailRenderer>();
            trail.time = DodgeTrailFadeSec;
            trail.startWidth = 0.5f;
            trail.endWidth = 0.05f;
            trail.minVertexDistance = 0.05f;
            trail.material = new Material(Shader.Find("Sprites/Default")) { name = "DodgeTrail (generated)" };
            trail.startColor = new Color(DodgeTintColor.r, DodgeTintColor.g, DodgeTintColor.b, 0.55f);
            trail.endColor = new Color(DodgeTintColor.r, DodgeTintColor.g, DodgeTintColor.b, 0f);
            trail.emitting = false;
            return trail;
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
            bool invulnerableNow = _invulnTimeLeft > 0f;
            HeroState.Invulnerable = invulnerableNow;
            if (invulnerableNow != _wasInvulnerable && visual != null)
            {
                if (invulnerableNow) CharacterVisual.Tint(visual.gameObject, DodgeTintColor);
                else CharacterVisual.ClearTint(visual.gameObject);
            }
            _wasInvulnerable = invulnerableNow;

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

                if (visual != null)
                {
                    // 회피 방향을 향해 정확히 한 바퀴(360도) 구른다 — 끝나는
                    // 시점(progress=1)에 각도가 360도라 별도 복구 없이 저절로
                    // 다시 똑바로 선다.
                    float rollProgress = 1f - Mathf.Clamp01(_dodgeTimeLeft / DodgeDurationSec);
                    float yaw = Mathf.Atan2(_dodgeDir.x, _dodgeDir.z) * Mathf.Rad2Deg;
                    visual.rotation = Quaternion.Euler(0f, yaw, 0f) * Quaternion.Euler(rollProgress * 360f, 0f, 0f);
                }
                if (_dodgeTimeLeft <= 0f && _dodgeTrail != null)
                {
                    _dodgeTrail.emitting = false; // 대시 끝 — 남은 잔상은 trail.time 동안 저절로 흐려짐.
                }

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

            if (_dodgeTrail != null)
            {
                _dodgeTrail.Clear(); // 이전 잔상과 안 이어붙게.
                _dodgeTrail.emitting = true;
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
