using System.Collections;
using UnityEngine;

namespace Saga.Story.Data
{
    /// <summary>
    /// VERTICAL_SLICE_STORY.md 3절 — 웹판 saga-story `js/side.js`의 전투
    /// 판정을 옮겼다(saga-godot `story_combat.gd`와 같은 값 — 원문 상수
    /// 안 바꿈). 급소(crit)·경직(히트스톱)은 다섯 판 중 이 판만 갖는
    /// 손맛의 절반이라 첫 슬라이스부터 넣는다.
    ///
    /// **재해석** — 웹판 `power()`는 등용한 인물(might/wisdom/command)에서
    /// 공격력을 뽑지만 이 슬라이스는 아직 인물 로스터를 안 붙였다(등용은
    /// GO의 콘텐츠 확장 단계 몫). `side.js power()`가 인물 미선택일 때 쓰는
    /// 대체값(might:20·wisdom:10·command:15)을 그대로 시작 스탯으로 삼는다.
    ///
    /// **`Time.timeScale`을 이 프로젝트에서 처음 쓴다** — 다른 판은 델타를
    /// 직접 스케일하지 않는다. 급소가 터진 순간 화면 전체가 0.055초 동안
    /// 12% 속도로 느려진다(`WaitForSecondsRealtime`로 실제 경과 시간
    /// 기준으로 되돌린다 — 안 그러면 timeScale 자체가 되돌리는 시간까지
    /// 늘려 버린다).
    /// </summary>
    public static class StoryCombat
    {
        public const float CritRate = 0.15f;
        public const float CritMul = 1.6f;
        public const float HitstopTimeScale = 0.12f;
        public const float HitstopSeconds = 0.055f;

        // PLAN.md 101-2 STORY "5-7 손맛 표준"(2026-09-17) — 101-3 C 표의
        // hitstop·shake를 DUNGEON `PlayerCombat.cs`와 같은 결로 옮긴다.
        // 위 `HitstopTimeScale`(크리티컬 전용 전역 슬로모, 웹판 원문 그대로)과는
        // 별개 기능이다 — 이건 **모든 타격**에 걸리고 Animator.speed만
        // 건드려(Time.timeScale은 그대로) 모바일 입력 지연이 없다.
        public const float HitFreezeSeconds = 0.07f;
        public const float HitShakeMag = 0.05f;
        public const float HitShakeSec = 0.08f;
        public const float CritShakeMag = 0.12f;
        public const float CritShakeSec = 0.15f;

        // side.js power() 대체값: atk = might*0.9 + wisdom*0.3, hp = 60 + command*6 + level*12(레벨1).
        public const float StartAtk = 21f;  // round(20*0.9 + 10*0.3)
        public const float StartHp = 162f;  // 60 + 15*6 + 1*12(이 슬라이스는 플레이어가 안 맞아 미사용 — 다음 확장 대비 값만 남김)

        // 잡졸(황건적) — data-enemy.js 첫 항목 + side.js spawnEnemy() lv=1 공식.
        public const float EnemyHp = 18f;  // round(18*1.22^0)
        public const float EnemyDmg = 6f;  // round(4+1*1.6, 이 슬라이스는 미사용 — 잡졸이 반격하지 않음)

        // 두목(황건 두목) — "STORY 콘텐츠 확장"(2026-09-13), q_boss1 사명.
        // data-side.js STAGES.field boss{hpMul:12, dmgMul:2.0} 그대로.
        public const float BossHp = EnemyHp * 12f; // 216
        public const float BossDmg = EnemyDmg * 2f; // 12(잡졸과 같은 이유로 이 슬라이스는 미사용 — 두목도 반격 안 함)

        /// <summary>
        /// "STORY 콘텐츠 확장" (2026-09-12) — 무예 나머지 셋(횡소·기탄·기합,
        /// 1절 "제외" 목록)을 더한다. 값은 `js/data-job.js` SKILLS[0..3]
        /// (job:'none' 넷)과 `js/side.js` castSkill()/MP_MAX/MP_REGEN 그대로
        /// (원문 상수 안 바꿈), r·dist·speed 같은 픽셀 값만
        /// FieldMapData.ScaleMPerPx로 미터 환산.
        /// </summary>
        public const float MpMax = 100f;
        public const float MpRegenPerSec = 8f; // side.js MP_REGEN = core.tuned('side.mpRegen', 8)

        /// <summary>2026-09-15 "전직·SP 투자 UI" — 방사(mage) 전직 시
        /// grow.mp(+40)만큼 최대치가 늘어난다(StoryJobState.MpBonus).
        /// `Mp`(현재치) 자체는 그대로 두고 이 상한만 커져, 다음 TickMpRegen
        /// 호출부터 실제로 더 찰 수 있게 된다.</summary>
        public static float MpMaxCurrent => MpMax + StoryJobState.MpBonus;

        public const float SweepCost = 18f;
        public const float SweepCooldown = 4f;
        public const float SweepMul = 1.8f;
        public const float SweepRadius = 117f * FieldMapData.ScaleMPerPx; // data-job.js sweep r=117px ≈2.34m

        public const float BoltCost = 24f;
        public const float BoltCooldown = 6f;
        public const float BoltMul = 2.1f;
        public const float BoltSpeed = 520f * FieldMapData.ScaleMPerPx; // side.js castSkill() bolt spd=520px/s ≈10.4m/s
        public const float BoltLife = 1.2f; // side.js shots life

        public const float BraceCost = 30f;
        public const float BraceCooldown = 14f;
        public const float BraceSeconds = 8f;
        public const float BraceAtkMul = 1.35f;
        public const float BraceSpeedMul = 1.2f;

        /// <summary>인물 로스터를 아직 안 붙인 것과 같은 이유로(위 StartAtk
        /// 주석) MP도 "항상 가득 찬 상태로 시작"만 흉내낸다 — 세이브에
        /// 안 넣는다(1절 "이 슬라이스엔 레벨업·장비가 없다"와 같은 결,
        /// StorySaveState.cs 참고, 다음 켤 때도 금방 다시 차므로 무해).</summary>
        public static float Mp { get; private set; } = MpMax;

        /// <summary>101-2 5-3 "비경" — `StoryLabyrinthState.MpRegenMul`은
        /// 회차 밖에선 항상 1이라 평소엔 원문 그대로 돈다. <paramref name="buffRegenMul"/>은
        /// 강화 무예(방사 부적, `StorySkillData`)의 기력 회복 배율 — 강화가 없으면 1.</summary>
        public static void TickMpRegen(float dt, float buffRegenMul = 1f) =>
            Mp = Mathf.Min(MpMaxCurrent, Mp + MpRegenPerSec * StoryLabyrinthState.MpRegenMul * buffRegenMul * dt);

        public static bool TrySpendMp(float cost)
        {
            if (Mp < cost) return false;
            Mp -= cost;
            return true;
        }

        /// <summary>PlaytestStorySlice.cs가 스킬 하나씩 독립으로 검증하려고
        /// 매번 MP를 채워 두는 용도(테스트 전용 공개 API — 리플렉션 대신).</summary>
        public static void RestoreMp(float mp) => Mp = Mathf.Clamp(mp, 0f, MpMaxCurrent);

        private static bool _hitstopActive;

        /// <summary>side.js hit(): atk*(mul||1)*(0.88~1.12)*(crit?1.6:1).
        /// PLAN.md 101-2 STORY "5-3 비경" — `StoryLabyrinthState.CritRateBonus`는
        /// 회차 밖에선 항상 0이라 이 함수는 평소엔 원문 그대로 돈다.</summary>
        public static (float dmg, bool crit) RollDamage(float atk, float mul = 1f)
        {
            bool crit = Random.value < CritRate + StoryLabyrinthState.CritRateBonus;
            float variance = 0.88f + Random.value * 0.24f;
            float dmg = atk * mul * variance * (crit ? CritMul : 1f);
            return (dmg, crit);
        }

        public static void TriggerHitstop(MonoBehaviour runner)
        {
            if (_hitstopActive || runner == null) return;
            runner.StartCoroutine(HitstopRoutine());
        }

        private static IEnumerator HitstopRoutine()
        {
            _hitstopActive = true;
            Time.timeScale = HitstopTimeScale;
            yield return new WaitForSecondsRealtime(HitstopSeconds);
            Time.timeScale = 1f;
            _hitstopActive = false;
        }

        /// <summary>101-3 C hitstop — `runner`(공격자)의 Animator만 잠깐
        /// 멈춘다(이 슬라이스는 적 쪽 Animator가 없다 — `StoryEnemy.cs`
        /// 클래스 주석 "제자리에 서서 맞기만 한다" 그대로). 공격 쿨다운이
        /// 전부 이 길이(0.07s)보다 훨씬 길어(연참 0.36s+) 겹칠 일은 없다.</summary>
        public static void ApplyHitFreeze(MonoBehaviour runner, Animator animator)
        {
            if (runner == null || animator == null) return;
            runner.StartCoroutine(HitFreezeRoutine(animator));
        }

        private static IEnumerator HitFreezeRoutine(Animator animator)
        {
            animator.speed = 0f;
            yield return new WaitForSeconds(HitFreezeSeconds);
            if (animator != null) animator.speed = 1f;
        }

        /// <summary>2026-09-15 "STORY 확장 — 전직·SP 투자 UI"(PLAN.md 51장
        /// 다음 걸음, saga-godot `story_combat.gd`/`story_job_trainer.gd`가
        /// 정본). 원작은 레벨/경험치가 이 슬라이스에 아예 없었다(위 StartHp
        /// 주석 — "플레이어가 안 맞아 미사용"과 같은 이유로 지금까지 레벨이
        /// 늘 1 고정) — 전직보다 먼저 이 밑바탕부터 채운다.
        /// `core.js`/`story_combat.gd` expNeed()·gainExp() 원문 그대로,
        /// 새 숫자를 상상하지 않는다.</summary>
        public const float ExpBase = 50f;
        public const float ExpGrowth = 1.28f;

        public static float ExpNeed(int level) => ExpBase * Mathf.Pow(ExpGrowth, level - 1);

        // side.js/story_combat.gd enemy_exp(is_boss, lv=1) 그대로: (6+lv*4)*(boss?15:1).
        // 이 포트는 사냥터가 하나(lv=1 고정)라 매번 lv를 안 받고 고정값 둘로 좁힌다
        // (FieldMapData.cs에 다른 판처럼 여러 사냥터·lv 축이 아예 없다).
        public const float GruntExp = 10f;  // round((6+1*4)*1)
        public const float BossExp = 150f;  // round((6+1*4)*15)

        /// <summary>1차 전직(Lv.10) 넷 — data-job.js JOBS tier:1 grow만
        /// 옮긴다(그 자리에서 새로 열리는 무예 넷씩, 총 16개는 범위 밖 —
        /// saga-godot 쪽도 이걸 첫 걸음으로 그은 경계와 같다). key,
        /// 표시이름, grow(hp/atk/mp).</summary>
        public const int JobChangeLevel = 10;

        public struct JobInfo
        {
            public string Name;
            public float Hp;
            public float Atk;
            public float Mp;
        }

        public static readonly System.Collections.Generic.Dictionary<string, JobInfo> JobsTier1 =
            new System.Collections.Generic.Dictionary<string, JobInfo>
            {
                ["warrior"] = new JobInfo { Name = "무사(武士)", Hp = 40f, Atk = 2f, Mp = 0f },
                ["archer"] = new JobInfo { Name = "궁수(弓手)", Hp = 10f, Atk = 5f, Mp = 0f },
                ["rogue"] = new JobInfo { Name = "협객(俠客)", Hp = 18f, Atk = 4f, Mp = 0f },
                ["mage"] = new JobInfo { Name = "방사(方士)", Hp = 12f, Atk = 3f, Mp = 40f },
            };

        public static readonly string[] JobOrder = { "warrior", "archer", "rogue", "mage" };
    }
}
