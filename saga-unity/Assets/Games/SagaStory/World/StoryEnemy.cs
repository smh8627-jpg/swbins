using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Saga.Story.Data;
using Saga.Story.Audio;

namespace Saga.Story.World
{
    /// <summary>
    /// VERTICAL_SLICE_STORY.md 1·3절 — 잡졸 하나(황건적, data-enemy.js
    /// 첫 항목 그대로, color '#c9a83a' — DUNGEON `DungeonEnemy.cs`가 이미
    /// 같은 색으로 옮겨 둔 값과 같다). HP=18은 side.js spawnEnemy() lv=1
    /// 공식(StoryCombat.cs 참고).
    ///
    /// **재해석** — 이번 슬라이스는 추격·원거리 반격이 없다(1·3절 "제외" —
    /// "때린다→쓰러진다" 감각부터 검증한다). saga-godot `story_enemy.gd`와
    /// 같은 결로 **제자리에 서서 맞기만 한다** — 넉백조차 이번엔 안
    /// 넣었다(시각 반응 없이 HP만 깎인다, 다음 콘텐츠 확장 때 DUNGEON
    /// `DungeonEnemy.cs` 패턴을 참고해 추격·반격을 붙이면 된다).
    ///
    /// **두목(boss) — "STORY 콘텐츠 확장"(2026-09-13)** — `SetBoss()`로
    /// 켜면 같은 컴포넌트가 data-enemy.js BOSSES[0]("황건 두목") 값으로
    /// 돈다: HP만 12배(StoryCombat.BossHp)로 커지고 시각도 1.4배 커진다 —
    /// 색은 원작처럼 그대로(잡졸과 같은 황건적 계열, 크기·이름·체력으로만
    /// 구분). 반격은 잡졸과 같은 이유로 여전히 안 넣었다.
    /// </summary>
    public class StoryEnemy : MonoBehaviour
    {
        private static readonly List<StoryEnemy> AllList = new List<StoryEnemy>();
        public static IReadOnlyList<StoryEnemy> All => AllList;

        // data-enemy.js 황건적/황건 두목 공통 color '#c9a83a'.
        private static readonly Color BodyColor = new Color(0.788f, 0.659f, 0.227f);
        private const float BossVisualScaleMul = 1.4f;

        [SerializeField] private GameObject modelPrefab; // 잡졸 — BuildTestStoryScene.cs가 채운다(44장 이후 Abe).
        // 44장 "Boss" 교체 — 비어 있으면 잡졸과 같은 modelPrefab을 그대로
        // 쓴다(예전 동작). Dungeon처럼 두목만 다른 모델(Brute)을 쓰고
        // 싶을 때 채운다.
        [SerializeField] private GameObject bossModelPrefab;
        // modelPrefab/bossModelPrefab에 Animator가 붙어 있을 때(리깅된
        // 캐릭터) 쓸 실제 스케일 — DungeonEnemy.ConfigureCombat의
        // visualScale과 같은 결(실측값을 이 클래스에 하드코딩하지 않는다).
        [SerializeField] private float riggedVisualScale = 1f;
        [SerializeField] private float riggedBossVisualScale = 1f;
        [SerializeField] private bool isBoss;

        // 2026-09-14 "사운드" — StoryAudio.cs 클래스 주석 참고. 이 컴포넌트
        // 하나가 잡졸·두목 공통이라(SetBoss로만 갈린다) 클립도 공용 한 벌.
        [SerializeField] private AudioClip hitClip;
        [SerializeField] private AudioClip deathClip;

        private const float FlashSec = 0.08f; // PLAN.md 101-2 STORY "5-7 손맛 표준" — DUNGEON DungeonEnemy.cs와 같은 값.

        private float _hp;
        private bool _dead;
        private GameObject _visualGo;
        private bool _isRiggedVisual; // 리깅된 캐릭터(Animator 포함)면 원래 색조가 안 입혀져 있다 — 플래시 복원 때 ClearTint로 되돌려야 한다(BuildVisual() 주석 참고).
        private Coroutine _flashRoutine;

        public bool IsBoss => isBoss;

        /// <summary>StoryEnemySpawner.cs 전용 — Awake() 전(AddComponent
        /// 직후)에 불러야 한다(BuildVisual()·HP 초기화가 이 값을 본다).</summary>
        public void SetBoss(bool value) => isBoss = value;

        /// <summary>`Destroy()`는 실제 파괴를 프레임 끝으로 미루므로(즉시
        /// null이 안 된다), 같은 프레임 안에서 죽었는지 확인해야 하는
        /// 호출부(PlaytestStorySlice.cs)는 GameObject 파괴 대신 이 플래그를
        /// 본다 — DUNGEON `DungeonEnemy._state`와 같은 결.</summary>
        public bool IsDead => _dead;

        private void Awake()
        {
            AllList.Add(this);
            _hp = isBoss ? StoryCombat.BossHp : StoryCombat.EnemyHp;
            if (transform.Find("Visual") == null) BuildVisual();
        }

        private void OnDestroy() => AllList.Remove(this);

        private void BuildVisual()
        {
            float height = isBoss ? 1.6f * BossVisualScaleMul : 1.6f;
            bool useBossModel = isBoss && bossModelPrefab != null;
            GameObject effectiveModel = useBossModel ? bossModelPrefab : modelPrefab;
            float effectiveRiggedScale = useBossModel ? riggedBossVisualScale : riggedVisualScale;

            // 44장 "주요 Enemy"/"Boss" 교체 — 리깅된 캐릭터(Animator 포함,
            // 예: Abe/Brute)면 DungeonEnemy.cs와 같은 결로 실제 스케일
            // 그대로 쓰고 색조는 안 입힌다(실제 텍스처를 곱색으로 오염시키지
            // 않으려고). 그 외(Kenney GLB·null)는 기존 경로 그대로.
            if (effectiveModel != null && effectiveModel.GetComponent<Animator>() != null)
            {
                var inst = Instantiate(effectiveModel, transform, false);
                inst.name = "Visual";
                inst.transform.localScale = Vector3.one * effectiveRiggedScale;
                inst.transform.localPosition = Vector3.zero;
                inst.transform.localRotation = Quaternion.identity;
                _visualGo = inst;
                _isRiggedVisual = true;
            }
            else if (effectiveModel != null)
            {
                _visualGo = CharacterVisual.Spawn(effectiveModel, transform, height, BodyColor).gameObject;
            }
            else
            {
                _visualGo = CharacterVisual.SpawnFallbackCapsule(transform, height, BodyColor).gameObject;
            }
        }

        /// <summary>PLAN.md 101-2 STORY "5-7 손맛 표준"(2026-09-17) — DUNGEON
        /// `DungeonEnemy.TakeDamage()`와 같은 결로 팝업·플래시를 더했다
        /// (기존 사운드·HP 판정은 그대로). `crit`은 호출부(StoryPlayerController
        /// ·StoryBolt)가 `StoryCombat.RollDamage()`에서 이미 굴린 값을
        /// 그대로 넘긴다 — 여기서 새로 굴리지 않는다.</summary>
        public void TakeDamage(float amount, bool crit = false)
        {
            if (_dead || amount <= 0f) return;
            _hp -= amount;
            StoryAudio.PlaySfx(hitClip);

            float height = isBoss ? 1.6f * BossVisualScaleMul : 1.6f;
            Vector3 popupPos = transform.position + Vector3.up * height;
            DamagePopup.Spawn(popupPos, amount, crit);
            HitSpark.Spawn(popupPos, crit);
            StoryGroundDecal.Spawn(transform.position, StoryGroundDecal.Kind.HitMark); // PLAN.md 101-3 G "지형 반응".

            if (_visualGo != null)
            {
                if (_flashRoutine != null) StopCoroutine(_flashRoutine);
                _flashRoutine = StartCoroutine(FlashHit());
            }

            if (_hp <= 0f) Die();
        }

        private IEnumerator FlashHit()
        {
            CharacterVisual.Tint(_visualGo, Color.white);
            yield return new WaitForSeconds(FlashSec);
            if (_visualGo == null) yield break;
            // 리깅된 캐릭터는 원래 색조가 안 입혀져 있다(BuildVisual() 주석 —
            // 실제 텍스처를 곱색으로 오염시키지 않으려고) — ClearTint로
            // 되돌려야 진짜 텍스처가 돌아온다. 비리깅(primitive)은 원래
            // BodyColor로 칠해져 있었으니 그 색으로 되돌린다.
            if (_isRiggedVisual) CharacterVisual.ClearTint(_visualGo);
            else CharacterVisual.Tint(_visualGo, BodyColor);
        }

        private void Die()
        {
            if (_dead) return;
            _dead = true;
            StoryAudio.PlaySfx(deathClip);
            StoryLootMarker.Spawn(transform.position); // PLAN.md 101-3 F "죽음" — Destroy 전에, transform이 아직 유효할 때.
            StoryQuestState.AddKill();
            if (isBoss) StoryQuestState.AddBossKill();
            StoryJobState.GainExp(isBoss ? StoryCombat.BossExp : StoryCombat.GruntExp);
            Destroy(gameObject);
        }
    }
}
