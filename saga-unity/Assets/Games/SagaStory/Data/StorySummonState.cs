using UnityEngine;

namespace Saga.Story.Data
{
    /// <summary>
    /// PLAN.md 106-10 둘째 단계 "STORY 소환" — 소환 게이지(DUNGEON `PartyState` 소환 게이지의 판별 복사, 코드 공유 없음).
    /// 적을 맞힐 때마다 찬다: 플레이어 한 타 +3 · 곁의 동료 한 타 +1(106-10). 100 이면 V·"소환".
    /// 이 판 잡졸은 한 방에 죽어(체력 18) 평타로만 약 34 번 — 들판 한 바퀴(잡졸 10 + 두목 약 10 타)쯤이다.
    /// 세이브 안 함(한 판의 흐름, FF 도 ATB 는 저장 안 한다 — DUNGEON 과 같은 결). 소환 내리치기 자체는 안 채운다.
    /// </summary>
    public static class StorySummonState
    {
        public const float Max = 100f;
        public const float PlayerHitGain = 3f;
        public const float CompanionHitGain = 1f;

        public enum Source { Player, Companion, None }

        /// <summary>지금 들어가는 피해의 주인 — 기본은 플레이어, 동료·소환이 치는 동안만 잠깐 바꾼다(`StoryEnemy.TakeDamage` 가 읽는다).</summary>
        public static Source HitSource = Source.Player;

        public static float Gauge { get; private set; }
        public static bool Ready => Gauge >= Max;

        public static void OnEnemyHit()
        {
            if (HitSource == Source.None) return;
            Gauge = Mathf.Min(Max, Gauge + (HitSource == Source.Companion ? CompanionHitGain : PlayerHitGain));
        }

        public static bool TrySpend()
        {
            if (!Ready) return false;
            Gauge = 0f;
            return true;
        }

        /// <summary>진단·씬 시작용.</summary>
        public static void Set(float gauge) => Gauge = Mathf.Clamp(gauge, 0f, Max);
    }
}
