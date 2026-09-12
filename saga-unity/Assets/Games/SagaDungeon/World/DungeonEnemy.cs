using System.Collections;
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

        // "세공·행상 재고 굴리기·도감" 슬라이스 — 비어 있으면(기본값) 보석을
        // 안 준다. 잡졸·정예는 그대로 두고 미니보스·두목에만 채운다
        // (BuildTestDungeonScene.cs 참고).
        [SerializeField] private string rewardGemId;

        [SerializeField] private bool isBoss;
        [SerializeField] private string displayName = "황건적";
        [SerializeField] private Color bodyColor = new Color(0.72f, 0.64f, 0.3f); // 황건 — 누런 두건.
        [SerializeField] private float visualScale = 1f;

        // "GLB 자산 도입" 슬라이스 — Awake()는 실제 Play 때도 도는 런타임
        // 코드라 AssetDatabase를 못 쓴다(에디터 전용 API). SagaGo
        // NpcBuilder.cs가 이미 쓴 패턴대로 편집기 빌드 스크립트가 이
        // 필드를 채워 씬에 직렬화해 둔다. null이면(다른 PC에 아직 GLB가
        // 없는 경우 등) CharacterVisual.SpawnFallbackCapsule()로 대체.
        [SerializeField] private GameObject modelPrefab;

        // "방 종류 나머지" 슬라이스 — 오픈월드/필드로 방이 둘이 된 뒤
        // `DungeonTrove.cs`/`DungeonShrine.cs`가 "방 클리어"를 판정할 때
        // 이 방 저 방 몬스터를 다 합쳐서 세던 걸 방별로 가르려고 추가
        // (Room2 필드 잡졸이 살아 있으면 Room1 상자가 안 열리던 잠재
        // 버그를 여기서 같이 고쳤다). 기본값 "room1" — Room1 스폰은 안
        // 건드리고 Room2 스폰만 BuildTestDungeonScene.cs가 덮어쓴다.
        [SerializeField] private string roomId = "room1";

        private const float ToastSec = 5f;

        public static readonly List<DungeonEnemy> Active = new List<DungeonEnemy>();

        private enum State { Idle, Chase, Dead }

        private const float FlashSec = 0.08f; // "타격감 1차" 슬라이스 — enemy flash.

        private State _state = State.Idle;
        private float _curHp;
        private float _attackCooldown;
        private Transform _player;
        private GameObject _visualGo;
        private Coroutine _flashRoutine;

        /// <summary>"랜덤 이벤트" 슬라이스 — `DungeonAmbush.cs`처럼 런타임에
        /// 즉석으로 만든 개체에 값을 채우는 정식 API. 편집기 빌드 스크립트의
        /// 리플렉션 `SetPrivateField()`와 달리 Play 중에도 동작해야 한다.
        /// **`Awake()`가 아직 안 돈 상태에서만 의미가 있다** — 호출부가
        /// GameObject를 비활성 상태로 만들고 이 메서드를 부른 뒤 활성화해야
        /// `BuildVisual()`이 올바른 모델로 도는 게 보장된다.</summary>
        public void SetSpawnContext(string newRoomId, GameObject newModelPrefab)
        {
            roomId = newRoomId;
            modelPrefab = newModelPrefab;
        }

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
            float targetHeight = 2f * visualScale; // 기존 primitive capsule 기준(높이 2m × visualScale) 그대로 유지.

            Transform visual = modelPrefab != null
                ? CharacterVisual.Spawn(modelPrefab, transform, targetHeight, bodyColor)
                : CharacterVisual.SpawnFallbackCapsule(transform, targetHeight, bodyColor);
            _visualGo = visual.gameObject;
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

        /// <summary>방 종류 POI(`DungeonTrove.cs`·`DungeonShrine.cs`·
        /// `DungeonMerchant.cs`)가 "이 방 몬스터를 다 잡았는지"를 물을 때
        /// 쓴다 — `Active`는 씬 전체를 합친 목록이라 방이 여럿이 되면
        /// 그대로 못 쓴다.</summary>
        public static int CountAliveInRoom(string roomId)
        {
            int count = 0;
            foreach (var e in Active)
            {
                if (e._state != State.Dead && e.roomId == roomId) count++;
            }
            return count;
        }

        /// <summary>"타격감 1차" 슬라이스(PLAN.md 38장 "damage popup"·
        /// "enemy flash") — heavy는 PlayerCombat.TryHeavyAttack()이 넘겨
        /// 팝업 색·크기만 다르게 한다(새 크리티컬 확률 시스템은 범위 밖,
        /// 강공격 자체가 이미 있는 "확실히 센 한 방" 신호라 재사용).</summary>
        public void TakeDamage(float amount, bool heavy = false)
        {
            if (_state == State.Dead) return;
            _curHp -= amount;

            Vector3 popupPos = transform.position + Vector3.up * (2f * visualScale);
            DamagePopup.Spawn(popupPos, amount, heavy);

            if (_visualGo != null)
            {
                if (_flashRoutine != null) StopCoroutine(_flashRoutine);
                _flashRoutine = StartCoroutine(FlashHit());
            }

            if (_curHp <= 0f) Die();
        }

        private IEnumerator FlashHit()
        {
            CharacterVisual.Tint(_visualGo, Color.white);
            yield return new WaitForSeconds(FlashSec);
            // ClearTint()가 아니라 bodyColor로 되돌린다 — 두목·정예처럼
            // 원래부터 색이 있는 개체는 ClearTint()가 그 색까지 지워 버린다.
            if (_visualGo != null) CharacterVisual.Tint(_visualGo, bodyColor);
        }

        private void Die()
        {
            _state = State.Dead;

            int levelBefore = HeroState.Level;
            HeroState.AddExp(rewardExp);
            HeroState.AddGold(rewardGold);
            bool equipped = HeroState.EquipIfBetter(rewardItemId);
            var item = ItemData.Get(rewardItemId);
            bool socketed = !string.IsNullOrEmpty(rewardGemId) && HeroState.SocketIfBetter(rewardGemId);
            var gem = GemData.Get(rewardGemId);
            bool newlyDiscovered = BestiaryState.Record(displayName);

            string msg = $"{displayName}{(isBoss ? "을(를) 쓰러뜨렸다" : "을(를) 물리쳤다")} — 경험치 +{rewardExp} · 돈 +{rewardGold}냥";
            if (HeroState.Level > levelBefore) msg += $" — 레벨업! ({levelBefore} → {HeroState.Level})";
            if (item != null) msg += $"\n{item.Name}을(를) 주웠다{(equipped ? " — 바로 갖췄다." : ".")}";
            if (gem != null) msg += $"\n{gem.Name}을(를) 주웠다{(socketed ? " — 바로 세공했다." : ".")}";
            if (newlyDiscovered) msg += $"\n📖 도감에 처음 기록됨 — {displayName}";
            DialogueLabel.Instance?.Show(msg, ToastSec);

            Destroy(gameObject);
        }
    }
}
