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

        // side.js power() 대체값: atk = might*0.9 + wisdom*0.3, hp = 60 + command*6 + level*12(레벨1).
        public const float StartAtk = 21f;  // round(20*0.9 + 10*0.3)
        public const float StartHp = 162f;  // 60 + 15*6 + 1*12(이 슬라이스는 플레이어가 안 맞아 미사용 — 다음 확장 대비 값만 남김)

        // 잡졸(황건적) — data-enemy.js 첫 항목 + side.js spawnEnemy() lv=1 공식.
        public const float EnemyHp = 18f;  // round(18*1.22^0)
        public const float EnemyDmg = 6f;  // round(4+1*1.6, 이 슬라이스는 미사용 — 잡졸이 반격하지 않음)

        /// <summary>
        /// "STORY 콘텐츠 확장" (2026-09-12) — 무예 나머지 셋(횡소·기탄·기합,
        /// 1절 "제외" 목록)을 더한다. 값은 `js/data-job.js` SKILLS[0..3]
        /// (job:'none' 넷)과 `js/side.js` castSkill()/MP_MAX/MP_REGEN 그대로
        /// (원문 상수 안 바꿈), r·dist·speed 같은 픽셀 값만
        /// FieldMapData.ScaleMPerPx로 미터 환산.
        /// </summary>
        public const float MpMax = 100f;
        public const float MpRegenPerSec = 8f; // side.js MP_REGEN = core.tuned('side.mpRegen', 8)

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

        public static void TickMpRegen(float dt) => Mp = Mathf.Min(MpMax, Mp + MpRegenPerSec * dt);

        public static bool TrySpendMp(float cost)
        {
            if (Mp < cost) return false;
            Mp -= cost;
            return true;
        }

        /// <summary>PlaytestStorySlice.cs가 스킬 하나씩 독립으로 검증하려고
        /// 매번 MP를 채워 두는 용도(테스트 전용 공개 API — 리플렉션 대신).</summary>
        public static void RestoreMp(float mp) => Mp = Mathf.Clamp(mp, 0f, MpMax);

        private static bool _hitstopActive;

        /// <summary>side.js hit(): atk*(mul||1)*(0.88~1.12)*(crit?1.6:1).</summary>
        public static (float dmg, bool crit) RollDamage(float atk, float mul = 1f)
        {
            bool crit = Random.value < CritRate;
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
    }
}
