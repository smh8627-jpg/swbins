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
    ///
    /// **회전베기(2026-09-14 추가) — PLAN.md 51장 "DUNGEON 확장 — 빌드"**.
    /// GO/DUNGEON/FOREST/REALM 51장 확장 축 조사에서 DUNGEON만 "빌드"
    /// 칸이 비어 있었다(엘리트/보스/장비는 이미 있음 — `DungeonFormulas.
    /// EliteHp/EliteDmg`, `QuestState.cs`, `HeroState.EquipIfBetter`).
    /// STORY의 `StoryPlayerController.TriggerSweep`(범위 안 전체 타격)과
    /// 같은 결의 AoE를 더해 "단일 대상에 강공격을 쌓을지, 범위로 잡몹을
    /// 쓸어낼지" 플레이스타일 갈림을 만든다 — DUNGEON엔 MP 자원이 없어
    /// (`HeroState.cs`에 자원 필드 자체가 없다) 쿨다운만으로 억제한다.
    /// 한 대상당 피해는 평타보다 낮게(`WhirlDamageMul`) 잡아 "여럿을 조금씩"
    /// 대 "하나를 크게"(강공격)가 실제로 트레이드오프가 되게 했다.
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

        private const float WhirlCooldown = 3.5f;   // 평타·강공격보다 훨씬 길다 — 여럿을 한꺼번에 치는 대가.
        private const float WhirlDamageMul = 0.7f;  // 대상 하나당 피해는 평타보다 낮다(범위가 보상).
        private const float WhirlRadius = 2.8f;     // AttackRange보다 살짝 넓다 — "둘러싼 잡몹 쓸기" 용도.
        private const float WhirlRecoverSec = 0.2f;

        // "타격감 1차" 슬라이스(PLAN.md 38장 "camera shake") — 강공격이
        // 평타보다 더 크게 흔들린다.
        private const float HitShakeMag = 0.05f;
        private const float HitShakeSec = 0.08f;
        private const float HeavyShakeMag = 0.12f;
        private const float HeavyShakeSec = 0.15f;
        private const float WhirlShakeMag = 0.09f;
        private const float WhirlShakeSec = 0.12f;

        private float _cooldownLeft;
        private float _heavyCooldownLeft;
        private float _whirlCooldownLeft;
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
            if (_whirlCooldownLeft > 0f) _whirlCooldownLeft -= Time.deltaTime;

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
            if (kb.eKey.wasPressedThisFrame)
            {
                TryWhirl();
            }
        }

        /// <summary>모바일 화면의 "공격" 버튼(OnClick)이 부른다.</summary>
        public void TriggerAttack() => TryAttack();

        /// <summary>모바일 화면의 "강공격" 버튼(OnClick)이 부른다.</summary>
        public void TriggerHeavyAttack() => TryHeavyAttack();

        /// <summary>모바일 화면의 "회전베기" 버튼(OnClick)이 부른다. 데스크톱은 E키.</summary>
        public void TriggerWhirl() => TryWhirl();

        private void TryAttack()
        {
            if (_cooldownLeft > 0f) return;
            var enemy = DungeonEnemy.FindNearest(transform.position, AttackRange);
            if (enemy == null) return;

            _cooldownLeft = AttackCooldown;
            enemy.TakeDamage(HeroState.HitDamage);
            _cameraRig?.Shake(HitShakeMag, HitShakeSec);
            SfxPlayer.PlayHit();
            _controller.Animator?.SetTrigger("Attack");
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
            // Maria.controller엔 슬래시 클립이 하나뿐이라 강공격도 같은
            // "Attack" 트리거를 쓴다 — 전용 클립은 다음에 받을 몫.
            _controller.Animator?.SetTrigger("Attack");
        }

        /// <summary>회전베기 — 반경 안 살아있는 적을 전부 때린다(TryAttack의
        /// "가장 가까운 하나"와 달리 다수 타격). `DungeonEnemy.Active`가
        /// 이미 public static이라 별도 조회 API 없이 바로 순회한다.</summary>
        private void TryWhirl()
        {
            if (_whirlCooldownLeft > 0f || (_controller != null && _controller.IsDodging)) return;

            bool hitAny = false;
            float damage = HeroState.HitDamage * WhirlDamageMul;
            foreach (var enemy in DungeonEnemy.Active)
            {
                if (enemy == null) continue;
                if (Vector3.Distance(transform.position, enemy.transform.position) > WhirlRadius) continue;
                enemy.TakeDamage(damage);
                hitAny = true;
            }
            if (!hitAny) return;

            _whirlCooldownLeft = WhirlCooldown;
            _cooldownLeft = Mathf.Max(_cooldownLeft, WhirlRecoverSec);
            _cameraRig?.Shake(WhirlShakeMag, WhirlShakeSec);
            SfxPlayer.PlayHit();
            _controller.Animator?.SetTrigger("Attack"); // Maria.controller엔 슬래시 클립이 하나뿐(강공격과 같은 이유).
        }

        /// <summary>이번 슬라이스는 죽음 화면·페널티 없이 바로 회복한다 —
        /// 다음 슬라이스가 실제 죽음 처리(귀환·손실 등)를 다룰 몫.</summary>
        private void OnDied()
        {
            _controller.Animator?.SetTrigger("Death");
            HeroState.FullHeal();
            DialogueLabel.Instance?.Show("쓰러졌다가 정신을 차렸다.", 3f);
        }
    }
}
