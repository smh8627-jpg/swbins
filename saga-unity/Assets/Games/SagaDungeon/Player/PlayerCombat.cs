using UnityEngine;
using UnityEngine.InputSystem;
using Saga.Dungeon.Data;
using Saga.Dungeon.World;
using Saga.Dungeon.UI;

namespace Saga.Dungeon.Player
{
    /// <summary>
    /// VERTICAL_SLICE_DUNGEON.md의 유일한 공격 — 기본 공격 하나뿐(스킬
    /// 없음). 키보드는 스페이스바 직접 읽기(Keyboard.current) — 프로젝트
    /// 기본 InputActions 자산의 "Attack" 액션은 마우스 왼쪽 버튼에도
    /// 물려 있어 CameraRig.cs의 드래그 판정(마우스 왼쪽 버튼을 직접
    /// 읽는다)과 같은 프레임에 겹칠 수 있다 — 그 충돌을 피하려고 이번
    /// 슬라이스는 "Attack" 액션을 안 쓰고 새로 읽는다. 모바일은
    /// `TriggerAttack()`을 uGUI 버튼(OnClick)이 직접 부른다(SagaGo
    /// EncounterUiKit 버튼과 같은 결).
    /// </summary>
    [RequireComponent(typeof(PlayerController))]
    public class PlayerCombat : MonoBehaviour
    {
        private const float AttackRange = 2.5f;
        private const float AttackCooldown = 0.55f; // js/dungeon.js BASE_ATK_CD

        private float _cooldownLeft;

        private void Awake()
        {
            HeroState.Died += OnDied;
        }

        private void OnDestroy()
        {
            HeroState.Died -= OnDied;
        }

        private void Update()
        {
            if (_cooldownLeft > 0f) _cooldownLeft -= Time.deltaTime;

            var kb = Keyboard.current;
            if (kb != null && kb.spaceKey.wasPressedThisFrame)
            {
                TryAttack();
            }
        }

        /// <summary>모바일 화면의 "공격" 버튼(OnClick)이 부른다.</summary>
        public void TriggerAttack() => TryAttack();

        private void TryAttack()
        {
            if (_cooldownLeft > 0f) return;
            var enemy = DungeonEnemy.FindNearest(transform.position, AttackRange);
            if (enemy == null) return;

            _cooldownLeft = AttackCooldown;
            enemy.TakeDamage(HeroState.HitDamage);
        }

        /// <summary>이번 슬라이스는 죽음 화면·페널티 없이 바로 회복한다 —
        /// 다음 슬라이스가 실제 죽음 처리(귀환·손실 등)를 다룰 몫.</summary>
        private void OnDied()
        {
            HeroState.FullHeal();
            DialogueLabel.Instance?.Show("쓰러졌다가 정신을 차렸다.", 3f);
        }
    }
}
