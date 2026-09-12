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
        [SerializeField] private HoldButton leftButton;
        [SerializeField] private HoldButton rightButton;
        [SerializeField] private HoldButton climbUpButton;
        [SerializeField] private HoldButton climbDownButton;

        private CharacterController _controller;
        private float _verticalVelocity;
        private float _facing = 1f; // +1 오른쪽, -1 왼쪽
        private float _attackCooldownLeft;
        private StoryRope _ropeArea;
        private bool _onRope;

        private void Awake()
        {
            _controller = GetComponent<CharacterController>();
            if (visual != null) visual.rotation = Quaternion.Euler(0f, 90f, 0f);
        }

        private void Update()
        {
            float dt = Time.deltaTime;
            _attackCooldownLeft = Mathf.Max(0f, _attackCooldownLeft - dt);
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
        }

        /// <summary>모바일 "공격" 버튼(OnClick)이 부른다 — 쿨다운 확인은
        /// TryAttack() 안에서 하므로 이 경로도 DUNGEON PlayerCombat.cs의
        /// TriggerAttack()과 같이 쿨다운을 그대로 존중한다.</summary>
        public void TriggerAttack() => TryAttack();

        /// <summary>모바일 "점프" 버튼(OnClick)이 부른다.</summary>
        public void TriggerJump()
        {
            if (!_onRope && _controller.isGrounded) _verticalVelocity = JumpSpeed;
        }

        private void TryAttack()
        {
            if (_attackCooldownLeft > 0f) return;
            _attackCooldownLeft = AttackCooldown;

            foreach (var enemy in StoryEnemy.All)
            {
                if (enemy == null) continue;
                float dx = enemy.transform.position.x - transform.position.x;
                if (Mathf.Abs(dx) > AttackRange) continue;
                if (Mathf.Abs(dx) > 0.3f && !Mathf.Approximately(Mathf.Sign(dx), _facing)) continue; // 등 뒤는 안 맞는다.

                var (dmg, crit) = StoryCombat.RollDamage(StoryCombat.StartAtk);
                enemy.TakeDamage(dmg);
                if (crit) StoryCombat.TriggerHitstop(this);
            }
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

            var move = new Vector3(axis * RunSpeed, _verticalVelocity, 0f);
            _controller.Move(move * dt);
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
    }
}
