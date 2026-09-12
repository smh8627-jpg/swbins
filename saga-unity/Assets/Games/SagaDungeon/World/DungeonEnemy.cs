using System.Collections.Generic;
using UnityEngine;
using Saga.Dungeon.Data;
using Saga.Dungeon.UI;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// VERTICAL_SLICE_DUNGEON.md 다음 슬라이스 "몬스터 무리"+"엘리트/보스" —
    /// 황건적(saga-dungeon 웹판 `js/data-enemy.js` tier1). 체력·공격력은
    /// `js/dungeon.js`의 실제 공식(`enemyHp`/`enemyDmg`, 1층·평 난이도
    /// 기준)을 그대로 옮겼다: 잡졸 HP=24·공격력=5, 두목(boss=true)은
    /// 같은 공식의 7배/2.2배 배율로 HP=168·공격력=11(dungeon.js:64-65).
    /// 몬스터 수는 `makeRoom('fight', ...)` 공식(dungeon.js:333, floor=1
    /// 기준 `min(12, 4 + rand(0~3))` = 4~7마리)에서 무작위 롤 없이 최소값
    /// 4마리를 결정적으로 씀(BuildTestDungeonScene.cs 참고). **원래 상수로
    /// 박혀 있던 체력·공격력·보상을 `[SerializeField]`로 바꿔 두목 변형을
    /// 하나의 컴포넌트로 같이 받게 했다** — GO의 `Gatherable.cs`와 같은
    /// 이유(자리마다 값이 다른 재사용 컴포넌트는 상수로 못 박지 못하고
    /// 편집기 빌드 스크립트가 `[SerializeField]`에 값을 채워 씬에
    /// 직렬화해 둔다, Awake는 Play 때만 돈다). GO의 BanditEncounter.cs와
    /// 달리 **선택지 화면이 없는 실시간 전투**다 — saga-dungeon 웹판
    /// 정체성 자체가 이동+근접 판정이라 GO의 턴제 UI 화면을 베끼지 않는다
    /// (VERTICAL_SLICE_DUNGEON.md "왜 GO와 다르게 설계하는가" 참고).
    /// </summary>
    public class DungeonEnemy : MonoBehaviour
    {
        [SerializeField] private float hp = 24f;
        [SerializeField] private float dmg = 5f;
        [SerializeField] private float aggroRadius = 8f;
        [SerializeField] private float chaseSpeed = 3.5f;
        [SerializeField] private float attackRange = 2.3f;
        [SerializeField] private float attackInterval = 1.0f;

        [SerializeField] private int rewardExp = 20;
        [SerializeField] private int rewardGold = 8;
        [SerializeField] private string rewardItemId = "wp_axe";

        [SerializeField] private bool isBoss;
        [SerializeField] private string displayName = "황건적";
        [SerializeField] private Color bodyColor = new Color(0.72f, 0.64f, 0.3f); // 황건 — 누런 두건.
        [SerializeField] private float visualScale = 1f;

        private const float ToastSec = 5f;

        public static readonly List<DungeonEnemy> Active = new List<DungeonEnemy>();

        private enum State { Idle, Chase, Dead }

        private State _state = State.Idle;
        private float _curHp;
        private float _attackCooldown;
        private Transform _player;

        private void Awake()
        {
            _curHp = hp;

            // DungeonRoomBuilder.cs와 같은 이유로 처음부터 넣는 방어 —
            // 2026-09-12에 SagaGo 쪽 6곳에서 빠뜨렸다가 뒤늦게 고친 패턴.
            if (transform.childCount == 0)
            {
                BuildVisual();
            }

            var playerGo = GameObject.FindWithTag("Player");
            _player = playerGo != null ? playerGo.transform : null;
        }

        private void OnEnable() => Active.Add(this);
        private void OnDisable() => Active.Remove(this);

        private void BuildVisual()
        {
            var visual = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            visual.name = "Visual";
            visual.transform.SetParent(transform, false);
            visual.transform.localPosition = new Vector3(0f, 1f, 0f); // 캡슐 기본 높이 2 — 바닥 기준 중앙.
            visual.transform.localScale = Vector3.one * visualScale;

            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "DungeonEnemy (generated)" };
            mat.color = bodyColor;
            visual.GetComponent<MeshRenderer>().sharedMaterial = mat;

            var col = visual.GetComponent<CapsuleCollider>();
            col.radius = 0.5f;
        }

        private void Update()
        {
            if (_state == State.Dead || _player == null) return;

            float dist = Vector3.Distance(transform.position, _player.position);

            if (_state == State.Idle)
            {
                if (dist <= aggroRadius) _state = State.Chase;
                return;
            }

            // Chase
            if (dist > attackRange)
            {
                Vector3 dir = _player.position - transform.position;
                dir.y = 0f;
                if (dir.sqrMagnitude > 0.0001f)
                {
                    dir.Normalize();
                    transform.position += dir * chaseSpeed * Time.deltaTime;
                    transform.rotation = Quaternion.LookRotation(dir);
                }
            }
            else
            {
                _attackCooldown -= Time.deltaTime;
                if (_attackCooldown <= 0f)
                {
                    _attackCooldown = attackInterval;
                    HeroState.TakeDamage(dmg);
                }
            }
        }

        /// <summary>플레이어 공격 사거리 안의 가장 가까운 살아있는 적 —
        /// Player/PlayerCombat.cs가 부른다.</summary>
        public static DungeonEnemy FindNearest(Vector3 pos, float maxRange)
        {
            DungeonEnemy best = null;
            float bestDist = maxRange;
            foreach (var e in Active)
            {
                if (e._state == State.Dead) continue;
                float d = Vector3.Distance(pos, e.transform.position);
                if (d <= bestDist)
                {
                    best = e;
                    bestDist = d;
                }
            }
            return best;
        }

        public void TakeDamage(float amount)
        {
            if (_state == State.Dead) return;
            _curHp -= amount;
            if (_curHp <= 0f) Die();
        }

        private void Die()
        {
            _state = State.Dead;

            int levelBefore = HeroState.Level;
            HeroState.AddExp(rewardExp);
            HeroState.AddGold(rewardGold);
            bool equipped = HeroState.EquipIfBetter(rewardItemId);
            var item = ItemData.Get(rewardItemId);

            string msg = $"{displayName}{(isBoss ? "을(를) 쓰러뜨렸다" : "을(를) 물리쳤다")} — 경험치 +{rewardExp} · 돈 +{rewardGold}냥";
            if (HeroState.Level > levelBefore) msg += $" — 레벨업! ({levelBefore} → {HeroState.Level})";
            if (item != null) msg += $"\n{item.Name}을(를) 주웠다{(equipped ? " — 바로 갖췄다." : ".")}";
            DialogueLabel.Instance?.Show(msg, ToastSec);

            Destroy(gameObject);
        }
    }
}
