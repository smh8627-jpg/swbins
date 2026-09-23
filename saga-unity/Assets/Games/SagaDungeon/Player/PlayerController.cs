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
    /// "회피 애니메이션·이펙트" 슬라이스 — 당시엔 Animator/스켈레톤
    /// 애니메이션 재생 파이프라인이 전혀 없어서(캐릭터 GLB는
    /// `CharacterVisual.Spawn()`으로 정적으로 세울 뿐) `BanditEncounter.cs`가
    /// 이미 쓰는 절차적 연출 방식(Tint·Coroutine 스케일 펄스)과 같은 결로
    /// 세 가지를 코드로 직접 만들었다: **회전 애니메이션**(구르는 동작 —
    /// `visual`을 회피 방향으로 향하게 한 뒤 로컬 X축으로 360도 굴림,
    /// 정확히 한 바퀴라 끝나면 자동으로 다시 똑바로 섬), **잔상 이펙트**
    /// (`TrailRenderer`, 새 셰이더 없이 어디서나 되는 `Sprites/Default`),
    /// **무적 틴트**(`CharacterVisual.Tint()` 재사용 — 회피 대시(0.16초)
    /// 보다 긴 무적 시간(0.22초) 내내 옅은 하늘색으로 덮어써 "지금 안
    /// 맞는다"를 눈으로 알 수 있게).
    ///
    /// **44장 "Player" 교체(2026-09-13)** — Maria(Humanoid Animator,
    /// `BuildTestDungeonScene.BuildPlayerVisual` 참고)가 배정되면 `animator`가
    /// 채워진다. 그 경우 이동은 `Speed` 파라미터로 Idle/Walk/Run을 블렌드,
    /// 회피는 위 절차적 X축 롤 대신 `Dodge` 트리거(Maria의 실제 구르기
    /// 클립)를 쓴다 — 얼굴 방향만 맞추고 회전 자체는 클립에 맡긴다. Maria가
    /// 없어(로컬 전용 자산 미다운로드) character-a 폴백이 배정되면
    /// `animator`가 null이라 예전 절차적 롤이 그대로 쓰인다.
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

        private const float FootprintIntervalSec = 0.35f; // PLAN.md 101-3 G "지형 반응" — 발자국 간격.

        // PLAN.md 106-1 "락온 중 이동" — 달리기 없이 대상을 보며 옆걸음.
        private const float LockMoveSpeed = 4.5f;
        private const float LockTurnRate = 14f;

        [SerializeField] private Transform visual;
        [SerializeField] private Animator animator;
        [SerializeField] private CameraRig cameraRig;
        [SerializeField] private InputActionAsset inputActions;
        [SerializeField] private VirtualJoystick joystick;
        [SerializeField] private PlayerLockOn lockOn;

        /// <summary>PLAN.md 106-1 "완벽 회피" — 적 판정 순간 회피 무적 중이었으면
        /// `DungeonEnemy.ResolveStrike()`가 `ReportDodgedStrike()`로 쏜다.
        /// `PlayerCombat`이 받아 반격 창을 연다.</summary>
        public static event System.Action PerfectDodged;

        public static void ReportDodgedStrike() => PerfectDodged?.Invoke();

        // Maria.controller 에 락온 옆걸음 블렌드(`Editor/BuildMariaLockOnStrafe.cs`)가
        // 들어가 있을 때만 true — 없으면 걷기 클립 폴백.
        private bool _hasStrafeParams;
        private bool _strafeFlag;

        // PLAN.md 106-2 "밀기 블록" — 이번 프레임 입력의 월드 방향(카메라 기준, 길이 ≤1).
        // `TemplePushBlock`이 "블록 쪽으로 밀고 있는가"를 본다.
        private Vector3 _moveIntent;
        public Vector3 MoveIntent => _moveIntent;

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
        private float _footprintCooldown;

        public Transform Visual => visual;

        /// <summary>Maria 배정 때만 non-null(위 클래스 주석 참고) — null이면
        /// 리깅 안 된 캐릭터라 PlayerCombat이 Attack/Death 트리거를 건너뛴다.</summary>
        public Animator Animator => animator;

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

            if (animator == null)
            {
                animator = GetComponentInChildren<Animator>();
            }
            if (lockOn == null)
            {
                lockOn = GetComponent<PlayerLockOn>();
            }
            if (animator != null)
            {
                foreach (var p in animator.parameters)
                {
                    if (p.name == "LockOn") { _hasStrafeParams = true; break; }
                }
            }

            _dodgeTrail = BuildDodgeTrail();
        }

        /// <summary>`PlayerCombat`이 타격 순간 몸을 대상 쪽으로 돌릴 때 쓴다.</summary>
        public void FaceToward(Vector3 worldPos)
        {
            if (visual == null) return;
            Vector3 dir = worldPos - transform.position;
            dir.y = 0f;
            if (dir.sqrMagnitude < 0.0001f) return;
            visual.rotation = Quaternion.Euler(0f, Mathf.Atan2(dir.x, dir.z) * Mathf.Rad2Deg, 0f);
        }

        private bool LockedOn => lockOn != null && lockOn.IsLocked;

        private void SetStrafeFlag(bool on)
        {
            if (!_hasStrafeParams || animator == null || _strafeFlag == on) return;
            _strafeFlag = on;
            animator.SetBool("LockOn", on);
            if (!on)
            {
                animator.SetFloat("MoveX", 0f);
                animator.SetFloat("MoveY", 0f);
            }
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
            _moveIntent = moveDir;

            if (_dodgeTimeLeft > 0f)
            {
                _dodgeTimeLeft -= dt;
                Vector3 dash = _dodgeDir * DodgeSpeed;
                _controller.Move(new Vector3(dash.x, _verticalVelocity, dash.z) * dt);

                if (visual != null)
                {
                    float yaw = Mathf.Atan2(_dodgeDir.x, _dodgeDir.z) * Mathf.Rad2Deg;
                    if (animator != null)
                    {
                        // Maria의 "Dodge" 클립이 구르는 동작 자체를 담당 —
                        // 여기선 방향만 맞춘다(절차적 X축 롤과 안 겹치게).
                        visual.rotation = Quaternion.Euler(0f, yaw, 0f);
                    }
                    else
                    {
                        // 회피 방향을 향해 정확히 한 바퀴(360도) 구른다 —
                        // 끝나는 시점(progress=1)에 각도가 360도라 별도 복구
                        // 없이 저절로 다시 똑바로 선다.
                        float rollProgress = 1f - Mathf.Clamp01(_dodgeTimeLeft / DodgeDurationSec);
                        visual.rotation = Quaternion.Euler(0f, yaw, 0f) * Quaternion.Euler(rollProgress * 360f, 0f, 0f);
                    }
                }
                if (_dodgeTimeLeft <= 0f && _dodgeTrail != null)
                {
                    _dodgeTrail.emitting = false; // 대시 끝 — 남은 잔상은 trail.time 동안 저절로 흐려짐.
                }

                return; // 회피 중엔 일반 이동·회전 입력을 무시 — dungeon.js도 dodge 중엔 p.dirX/Y를 안 봄.
            }

            if (LockedOn)
            {
                UpdateLockedMove(moveDir, dt);
                return;
            }
            SetStrafeFlag(false);

            bool running = _sprintAction != null && _sprintAction.IsPressed();
            float speed = running ? RunSpeed : WalkSpeed;

            Vector3 horizontal = moveDir * speed;
            _controller.Move(new Vector3(horizontal.x, _verticalVelocity, horizontal.z) * dt);

            if (animator != null)
            {
                // Maria.controller의 Idle→Walk(>0.1)→Run(>0.6) 문턱과
                // 겹치지 않게 0/0.5/1로 확실히 갈라 준다.
                bool moving = moveDir.sqrMagnitude > 0.05f * 0.05f;
                animator.SetFloat("Speed", moving ? (running ? 1f : 0.5f) : 0f);
            }

            if (moveDir.sqrMagnitude > 0.05f * 0.05f)
            {
                if (visual != null)
                {
                    float targetYaw = Mathf.Atan2(moveDir.x, moveDir.z) * Mathf.Rad2Deg;
                    float yaw = Mathf.LerpAngle(visual.eulerAngles.y, targetYaw, TurnRate * dt);
                    visual.rotation = Quaternion.Euler(0f, yaw, 0f);
                }

                // PLAN.md 101-3 G "지형 반응" — 걷는 동안 일정 간격으로 발자국.
                _footprintCooldown -= dt;
                if (_footprintCooldown <= 0f)
                {
                    _footprintCooldown = FootprintIntervalSec;
                    GroundDecal.Spawn(transform.position, GroundDecal.Kind.Footprint);
                }
            }
        }

        /// <summary>PLAN.md 106-1 — 락온 중엔 몸이 늘 대상을 보고, 입력은
        /// 카메라 기준(카메라가 대상 쪽을 따라가므로 위=다가가기·아래=물러서기·
        /// 좌우=돌기)으로 옆걸음한다. 옆걸음 블렌드가 있으면 몸 기준 MoveX/MoveY 를 준다.</summary>
        private void UpdateLockedMove(Vector3 moveDir, float dt)
        {
            Vector3 horizontal = moveDir * LockMoveSpeed;
            _controller.Move(new Vector3(horizontal.x, _verticalVelocity, horizontal.z) * dt);

            Vector3 toTarget = lockOn.Target.transform.position - transform.position;
            toTarget.y = 0f;
            if (visual != null && toTarget.sqrMagnitude > 0.0001f)
            {
                float targetYaw = Mathf.Atan2(toTarget.x, toTarget.z) * Mathf.Rad2Deg;
                float yaw = Mathf.LerpAngle(visual.eulerAngles.y, targetYaw, LockTurnRate * dt);
                visual.rotation = Quaternion.Euler(0f, yaw, 0f);
            }

            bool moving = moveDir.sqrMagnitude > 0.05f * 0.05f;
            if (animator != null)
            {
                SetStrafeFlag(true);
                animator.SetFloat("Speed", moving ? 0.5f : 0f);
                if (_hasStrafeParams && visual != null)
                {
                    Vector3 local = moving ? moveDir.normalized : Vector3.zero;
                    animator.SetFloat("MoveX", Vector3.Dot(local, visual.right), 0.1f, dt);
                    animator.SetFloat("MoveY", Vector3.Dot(local, visual.forward), 0.1f, dt);
                }
            }

            if (moving)
            {
                _footprintCooldown -= dt;
                if (_footprintCooldown <= 0f)
                {
                    _footprintCooldown = FootprintIntervalSec;
                    GroundDecal.Spawn(transform.position, GroundDecal.Kind.Footprint);
                }
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
                if (LockedOn)
                {
                    // PLAN.md 106-1 — 락온 중 입력 없이 회피하면 백스텝(대상 반대쪽).
                    dir = transform.position - lockOn.Target.transform.position;
                }
                else
                {
                    dir = visual != null ? visual.forward : transform.forward;
                }
            }
            dir.y = 0f;
            if (dir.sqrMagnitude < 0.0001f) dir = transform.forward;
            dir.Normalize();

            _dodgeDir = dir;
            _dodgeTimeLeft = DodgeDurationSec;
            _dodgeCooldownLeft = DodgeCooldownSec;
            _invulnTimeLeft = DodgeInvulnSec;
            // 같은 프레임에 판정하는 적(예비동작 끝)도 무적을 보게 바로 올린다 —
            // Update()가 다음 프레임부터 _invulnTimeLeft 로 다시 계산한다.
            HeroState.Invulnerable = true;

            animator?.SetTrigger("Dodge");

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
