using UnityEngine;
using UnityEngine.InputSystem;
using Saga.Story.Data;
using Saga.Story.UI;
using Saga.Story.World;

namespace Saga.Story.Player
{
    /// <summary>
    /// VERTICAL_SLICE_STORY.md 1·2·3절 — 2.5D 플랫포머 이동+공격.
    /// saga-godot `story_player.gd`와 같은 설계를 Unity 관용구로 새로 짰다
    /// (기계적 번역 아님 — 루트 CLAUDE.md 2장). 이 판은 **가로(X)·높이(Y)
    /// 평면에만** 움직인다(2절 "Z는 이번 슬라이스에서 고정") — 세로 입력
    /// (W/S, 위/아래 버튼)은 이동에 안 쓰고 줄 오르내리기 전용으로 돌린다.
    ///
    /// 물리 상수는 VERTICAL_SLICE_STORY.md 2절 그대로(비율만 웹과 맞춘
    /// 재설계, 원문 픽셀값을 그대로 옮기지 않는다).
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public class StoryPlayerController : MonoBehaviour
    {
        private const float Gravity = 36f;
        private const float JumpSpeed = 15f;
        private const float RunSpeed = 6f;
        private const float ClimbSpeed = 4f;
        private const float TurnRate = 12f; // DUNGEON PlayerController.cs와 같은 결 — LerpAngle의 보간 배율(각속도 아님).
        private const float AttackRange = 2.2f;
        private const float AttackCooldown = 0.36f; // 무예 연참(連斬) cd 0.36(js/data-job.js)

        [SerializeField] private Transform visual;
        // 44장 "Player" 교체 — Maria가 배정되면 채워짐(BuildTestStoryScene.
        // BuildPlayerVisual 참고). 이 판은 플레이어가 피격당하지 않아(Hit/
        // Death 트리거 대상이 없음) Speed+Attack만 쓴다.
        [SerializeField] private Animator animator;
        [SerializeField] private HoldButton leftButton;
        [SerializeField] private HoldButton rightButton;
        [SerializeField] private HoldButton climbUpButton;
        [SerializeField] private HoldButton climbDownButton;

        private CharacterController _controller;
        private float _verticalVelocity;
        private float _facing = 1f; // +1 오른쪽, -1 왼쪽
        private float _attackCooldownLeft;
        private float _sweepCooldownLeft;
        private float _boltCooldownLeft;
        private float _braceCooldownLeft;
        private float _buffUntilTime; // Time.time 기준 — 기합(氣合) 지속시간, StoryCombat.BraceSeconds
        private StoryRope _ropeArea;
        private bool _onRope;

        private bool BuffActive => Time.time < _buffUntilTime;

        /// <summary>side.js buffOn().atk와 같은 자리 — 기합이 켜져 있으면
        /// 연참·횡소·기탄 전부 이 값으로 굴린다. 2026-09-15 — 전직으로
        /// 얻은 grow.atk(StoryJobState.AtkBonus)를 기초값 위에 얹는다.</summary>
        private float CurrentAtk => (StoryCombat.StartAtk + StoryJobState.AtkBonus) * (BuffActive ? StoryCombat.BraceAtkMul : 1f);

        private void Awake()
        {
            _controller = GetComponent<CharacterController>();
            if (visual != null) visual.rotation = Quaternion.Euler(0f, 90f, 0f);
        }

        private void Update()
        {
            float dt = Time.deltaTime;
            _attackCooldownLeft = Mathf.Max(0f, _attackCooldownLeft - dt);
            _sweepCooldownLeft = Mathf.Max(0f, _sweepCooldownLeft - dt);
            _boltCooldownLeft = Mathf.Max(0f, _boltCooldownLeft - dt);
            _braceCooldownLeft = Mathf.Max(0f, _braceCooldownLeft - dt);
            StoryCombat.TickMpRegen(dt);
            CheckRope();

            if (_onRope && _ropeArea != null) Climb(dt);
            else Walk(dt);

            // 2절 "Z는 이번 슬라이스에서 고정" — 바닥·발판 충돌의 얕은
            // Z폭에서 모서리에 살짝 밀릴 수 있어 되돌린다. **실제로 겪은
            // 결함** — `p.z != 0f`(정확히 0과 비교)로 짰더니 부동소수점
            // 잔차(예: Move()의 충돌 슬라이딩이 남기는 1e-6 수준의 Z)가
            // 항상 걸려 매 프레임 CharacterController를 껐다 켰다 — 그
            // 결과 로프 트리거가 매 프레임 Enter→Exit를 반복해 실제로는
            // 로프 위에 서 있어도 `_ropeArea`가 널로 보였다(PlaytestStorySlice.cs
            // 가 잡아냈다). 무시해도 되는 잡음과 실제 밀림을 문턱값으로 가른다.
            var p = transform.position;
            if (Mathf.Abs(p.z) > 0.01f)
            {
                p.z = 0f;
                _controller.enabled = false;
                transform.position = p;
                _controller.enabled = true;
            }

            if (WantsAttack()) TryAttack();
            if (WantsSweep()) TrySweep();
            if (WantsBolt()) TryBolt();
            if (WantsBrace()) TryBrace();
        }

        /// <summary>모바일 "공격" 버튼(OnClick)이 부른다 — 쿨다운 확인은
        /// TryAttack() 안에서 하므로 이 경로도 DUNGEON PlayerCombat.cs의
        /// TriggerAttack()과 같이 쿨다운을 그대로 존중한다.</summary>
        public void TriggerAttack() => TryAttack();

        /// <summary>모바일 "횡소"·"기탄"·"기합" 버튼(OnClick)이 부른다 —
        /// 위 TriggerAttack()과 같은 결.</summary>
        public void TriggerSweep() => TrySweep();
        public void TriggerBolt() => TryBolt();
        public void TriggerBrace() => TryBrace();

        /// <summary>모바일 "점프" 버튼(OnClick)이 부른다.</summary>
        public void TriggerJump()
        {
            if (!_onRope && _controller.isGrounded) _verticalVelocity = JumpSpeed;
        }

        private void TryAttack()
        {
            if (_attackCooldownLeft > 0f) return;
            _attackCooldownLeft = AttackCooldown;
            PlayAttackAnim();

            bool hitAny = false;
            bool anyCrit = false;
            foreach (var enemy in StoryEnemy.All)
            {
                if (enemy == null) continue;
                float dx = enemy.transform.position.x - transform.position.x;
                if (Mathf.Abs(dx) > AttackRange) continue;
                if (Mathf.Abs(dx) > 0.3f && !Mathf.Approximately(Mathf.Sign(dx), _facing)) continue; // 등 뒤는 안 맞는다.

                var (dmg, crit) = StoryCombat.RollDamage(CurrentAtk);
                enemy.TakeDamage(dmg, crit);
                if (crit) StoryCombat.TriggerHitstop(this);
                hitAny = true;
                anyCrit |= crit;
            }
            ApplyHitFeedback(hitAny, anyCrit);
        }

        /// <summary>횡소(橫掃) — data-job.js sweep, aoe. 등 뒤·앞 구분 없이
        /// 반경 안 전부(side.js castSkill() effect==='aoe'와 같은 결).</summary>
        private void TrySweep()
        {
            if (_sweepCooldownLeft > 0f || !StoryCombat.TrySpendMp(StoryCombat.SweepCost)) return;
            _sweepCooldownLeft = StoryCombat.SweepCooldown;
            PlayAttackAnim();

            bool hitAny = false;
            bool anyCrit = false;
            Vector2 origin = new Vector2(transform.position.x, transform.position.y);
            foreach (var enemy in StoryEnemy.All)
            {
                if (enemy == null) continue;
                Vector2 pos = new Vector2(enemy.transform.position.x, enemy.transform.position.y);
                if (Vector2.Distance(origin, pos) > StoryCombat.SweepRadius) continue;

                var (dmg, crit) = StoryCombat.RollDamage(CurrentAtk, StoryCombat.SweepMul);
                enemy.TakeDamage(dmg, crit);
                if (crit) StoryCombat.TriggerHitstop(this);
                hitAny = true;
                anyCrit |= crit;
            }
            ApplyHitFeedback(hitAny, anyCrit);
        }

        /// <summary>PLAN.md 101-2 STORY "5-7 손맛 표준"(2026-09-17, 101-3 C
        /// 표) — 크리티컬 슬로모(`StoryCombat.TriggerHitstop`, 웹판 원문
        /// 기능)와 별개로 **모든 타격**에 카메라 흔들림 + 짧은 Animator
        /// 정지를 건다. 한 번의 공격이 여럿을 때려도(횡소) 한 번만 건다 —
        /// DUNGEON `PlayerCombat.TryWhirl()`과 같은 결.</summary>
        private void ApplyHitFeedback(bool hitAny, bool anyCrit)
        {
            if (!hitAny) return;
            StoryCameraFollow.Instance?.Shake(
                anyCrit ? StoryCombat.CritShakeMag : StoryCombat.HitShakeMag,
                anyCrit ? StoryCombat.CritShakeSec : StoryCombat.HitShakeSec);
            StoryCombat.ApplyHitFreeze(this, animator);
        }

        /// <summary>기탄(氣彈) — data-job.js bolt, 관통 투사체
        /// (`StoryBolt.cs` 참고).</summary>
        private void TryBolt()
        {
            if (_boltCooldownLeft > 0f || !StoryCombat.TrySpendMp(StoryCombat.BoltCost)) return;
            _boltCooldownLeft = StoryCombat.BoltCooldown;
            PlayAttackAnim();

            var go = new GameObject("StoryBolt");
            go.transform.position = transform.position + new Vector3(_facing * 0.6f, 1f, 0f);
            go.AddComponent<StoryBolt>().Configure(_facing, CurrentAtk, StoryCombat.BoltMul, animator);
        }

        /// <summary>기합(氣合) — data-job.js brace, buff. 8초간 공격·이동
        /// 배율만 올린다(side.js buffOn()과 달리 guard·regen은 이 슬라이스가
        /// 아직 안 쓰는 축이라 배선 안 함 — RunSpeed·CurrentAtk 둘만).</summary>
        private void TryBrace()
        {
            if (_braceCooldownLeft > 0f || !StoryCombat.TrySpendMp(StoryCombat.BraceCost)) return;
            _braceCooldownLeft = StoryCombat.BraceCooldown;
            _buffUntilTime = Time.time + StoryCombat.BraceSeconds;
        }

        private void Walk(float dt)
        {
            if (_controller.isGrounded && _verticalVelocity < 0f) _verticalVelocity = 0f;
            _verticalVelocity -= Gravity * dt;

            if (_controller.isGrounded && WantsJump()) _verticalVelocity = JumpSpeed;

            float axis = HorizontalInput();
            if (Mathf.Abs(axis) > 0.05f)
            {
                _facing = Mathf.Sign(axis);
                if (visual != null)
                {
                    float targetYaw = _facing > 0f ? 90f : -90f;
                    visual.rotation = Quaternion.Euler(0f, Mathf.LerpAngle(visual.eulerAngles.y, targetYaw, TurnRate * dt), 0f);
                }
            }

            float runSpeed = RunSpeed * (BuffActive ? StoryCombat.BraceSpeedMul : 1f);
            var move = new Vector3(axis * runSpeed, _verticalVelocity, 0f);
            _controller.Move(move * dt);

            if (animator != null)
            {
                animator.SetFloat("Speed", Mathf.Abs(axis) > 0.05f ? 1f : 0f);
            }
        }

        /// <summary>연참·횡소·기탄·기합 넷 다 검을 쓰는 동작이라 Maria.controller의
        /// 단일 "Attack" 트리거 하나로 같이 재생한다(무기별로 다른 클립을
        /// 만드는 건 이번 슬라이스 범위 밖).
        /// `animator?.`(null-조건 연산자)는 안 쓴다 — Maria 애셋이 없어(로컬
        /// 전용, mixamo.com) 캡슐 폴백으로 지어진 씬은 이 필드가 "진짜 C#
        /// null"이 아니라 "직렬화 때 한 번도 안 채워진" UnityEngine.Object라
        /// `?.`가 놓치고 그대로 호출해 UnassignedReferenceException을 던진다
        /// (Update()의 `if (animator != null)`과 같은 이유로 여기도 맞춘다,
        /// 2026-09-17 PlaytestStorySlice 3연속 재검증에서 발견).</summary>
        private void PlayAttackAnim()
        {
            if (animator != null) animator.SetTrigger("Attack");
        }

        /// <summary>줄 안에서는 중력이 없다 — 세로 입력을 오르내리기 전용으로
        /// 빌려 쓴다. 가로 입력이 세게 들어오면(> 0.3) 손을 놓은 것으로
        /// 본다(웹판엔 없는 규칙 — 로프에서 못 내려오는 사고를 막으려고
        /// 직접 정함, saga-godot도 같은 이유로 같은 값을 씀).</summary>
        private void Climb(float dt)
        {
            if (Mathf.Abs(HorizontalInput()) > 0.3f)
            {
                _onRope = false;
                return;
            }

            float vertical = ClimbInput();
            var pos = transform.position;
            pos.x = _ropeArea.RopeX;
            pos.y = Mathf.Clamp(pos.y + vertical * ClimbSpeed * dt, _ropeArea.Bottom, _ropeArea.Top);

            _controller.enabled = false;
            transform.position = pos;
            _controller.enabled = true;
            _verticalVelocity = 0f;

            if (WantsJump())
            {
                _onRope = false;
                _verticalVelocity = JumpSpeed * 0.6f;
            }
        }

        private void CheckRope()
        {
            if (_onRope || _ropeArea == null) return;
            if (Mathf.Abs(ClimbInput()) > 0.05f) _onRope = true;
        }

        /// <summary>StoryRope.cs가 트리거 진입/이탈 때 부른다(플레이어는
        /// CharacterController라 자기 쪽엔 트리거 콜백이 없다 — 줄 쪽에서
        /// 알려 주는 방향으로 배선했다).</summary>
        public void SetRopeArea(StoryRope rope) => _ropeArea = rope;

        public void ClearRopeArea(StoryRope rope)
        {
            if (_ropeArea == rope)
            {
                _ropeArea = null;
                _onRope = false;
            }
        }

        private float HorizontalInput()
        {
            float v = 0f;
            var kb = Keyboard.current;
            if (kb != null)
            {
                if (kb.aKey.isPressed || kb.leftArrowKey.isPressed) v -= 1f;
                if (kb.dKey.isPressed || kb.rightArrowKey.isPressed) v += 1f;
            }
            if (leftButton != null && leftButton.IsHeld) v -= 1f;
            if (rightButton != null && rightButton.IsHeld) v += 1f;
            return Mathf.Clamp(v, -1f, 1f);
        }

        private float ClimbInput()
        {
            float v = 0f;
            var kb = Keyboard.current;
            if (kb != null)
            {
                if (kb.sKey.isPressed || kb.downArrowKey.isPressed) v -= 1f;
                if (kb.wKey.isPressed || kb.upArrowKey.isPressed) v += 1f;
            }
            if (climbDownButton != null && climbDownButton.IsHeld) v -= 1f;
            if (climbUpButton != null && climbUpButton.IsHeld) v += 1f;
            return Mathf.Clamp(v, -1f, 1f);
        }

        private bool WantsJump()
        {
            var kb = Keyboard.current;
            return kb != null && kb.spaceKey.wasPressedThisFrame;
        }

        private bool WantsAttack()
        {
            var kb = Keyboard.current;
            return kb != null && kb.jKey.wasPressedThisFrame;
        }

        // 무예 넷 중 연참(J)만 기존 배선 — 나머지 셋은 숫자키로(모바일은
        // Trigger*() 버튼, BuildTestStoryScene.cs 참고).
        private bool WantsSweep()
        {
            var kb = Keyboard.current;
            return kb != null && kb.digit2Key.wasPressedThisFrame;
        }

        private bool WantsBolt()
        {
            var kb = Keyboard.current;
            return kb != null && kb.digit3Key.wasPressedThisFrame;
        }

        private bool WantsBrace()
        {
            var kb = Keyboard.current;
            return kb != null && kb.digit4Key.wasPressedThisFrame;
        }
    }
}
