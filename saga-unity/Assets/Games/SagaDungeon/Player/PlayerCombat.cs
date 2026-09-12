using UnityEngine;
using UnityEngine.InputSystem;
using Saga.Dungeon.Audio;
using Saga.Dungeon.Data;
using Saga.Dungeon.World;
using Saga.Dungeon.UI;

namespace Saga.Dungeon.Player
{
    /// <summary>
    /// VERTICAL_SLICE_DUNGEON.md의 기본 공격 + 다음 슬라이스 "스킬
    /// 다양화"의 강공격. 키보드는 둘 다 직접 읽기(Keyboard.current) —
    /// 프로젝트 기본 InputActions 자산의 "Attack" 액션은 마우스 왼쪽
    /// 버튼에도 물려 있어 CameraRig.cs의 드래그 판정(마우스 왼쪽 버튼을
    /// 직접 읽는다)과 같은 프레임에 겹칠 수 있다 — 그 충돌을 피하려고
    /// 이번 슬라이스는 "Attack" 액션을 안 쓰고 새로 읽는다. 모바일은
    /// `TriggerAttack()`/`TriggerHeavyAttack()`을 uGUI 버튼(OnClick)이
    /// 직접 부른다(SagaGo EncounterUiKit 버튼과 같은 결).
    /// 강공격은 웹판 `js/dungeon.js:2509` `heavyAttack()`의 실제 상수를
    /// 그대로 옮겼다 — 쿨다운 1.3초·피해 배율 2.6배·사거리 1.15배,
    /// 회피 중엔(웹판 `p.dash || p.dodge`) 못 쓴다. 넉백(HEAVY_KB=26)은
    /// 이 슬라이스에 밀치기 물리가 없어 뺐다(다음 슬라이스 몫).
    /// </summary>
    [RequireComponent(typeof(PlayerController))]
    public class PlayerCombat : MonoBehaviour
    {
        private const float AttackRange = 2.5f;
        private const float AttackCooldown = 0.55f; // js/dungeon.js BASE_ATK_CD

        private const float HeavyCooldown = 1.3f;      // dungeon.js HEAVY_CD
        private const float HeavyDamageMul = 2.6f;     // dungeon.js HEAVY_MUL
        private const float HeavyRangeMul = 1.15f;     // dungeon.js heavyAttack() reach
        private const float HeavyRecoverSec = 0.16f;   // dungeon.js HEAVY_RECOVER

        // "타격감 1차" 슬라이스(PLAN.md 38장 "camera shake") — 강공격이
        // 평타보다 더 크게 흔들린다.
        private const float HitShakeMag = 0.05f;
        private const float HitShakeSec = 0.08f;
        private const float HeavyShakeMag = 0.12f;
        private const float HeavyShakeSec = 0.15f;

        private float _cooldownLeft;
        private float _heavyCooldownLeft;
        private PlayerController _controller;
        private CameraRig _cameraRig;

        private void Awake()
        {
            HeroState.Died += OnDied;
            _controller = GetComponent<PlayerController>();
            _cameraRig = GetComponentInChildren<CameraRig>();
        }

        private void OnDestroy()
        {
            HeroState.Died -= OnDied;
        }

        private void Update()
        {
            if (_cooldownLeft > 0f) _cooldownLeft -= Time.deltaTime;
            if (_heavyCooldownLeft > 0f) _heavyCooldownLeft -= Time.deltaTime;

            var kb = Keyboard.current;
            if (kb == null) return;

            if (kb.spaceKey.wasPressedThisFrame)
            {
                TryAttack();
            }
            if (kb.leftAltKey.wasPressedThisFrame)
            {
                TryHeavyAttack();
            }
        }

        /// <summary>모바일 화면의 "공격" 버튼(OnClick)이 부른다.</summary>
        public void TriggerAttack() => TryAttack();

        /// <summary>모바일 화면의 "강공격" 버튼(OnClick)이 부른다.</summary>
        public void TriggerHeavyAttack() => TryHeavyAttack();

        private void TryAttack()
        {
            if (_cooldownLeft > 0f) return;
            var enemy = DungeonEnemy.FindNearest(transform.position, AttackRange);
            if (enemy == null) return;

            _cooldownLeft = AttackCooldown;
            enemy.TakeDamage(HeroState.HitDamage);
            _cameraRig?.Shake(HitShakeMag, HitShakeSec);
            SfxPlayer.PlayHit();
        }

        private void TryHeavyAttack()
        {
            if (_heavyCooldownLeft > 0f || (_controller != null && _controller.IsDodging)) return;
            var enemy = DungeonEnemy.FindNearest(transform.position, AttackRange * HeavyRangeMul);
            if (enemy == null) return;

            _heavyCooldownLeft = HeavyCooldown;
            _cooldownLeft = Mathf.Max(_cooldownLeft, HeavyRecoverSec);
            enemy.TakeDamage(HeroState.HitDamage * HeavyDamageMul, heavy: true);
            _cameraRig?.Shake(HeavyShakeMag, HeavyShakeSec);
            SfxPlayer.PlayHeavyHit();
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
