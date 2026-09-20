using System;
using UnityEngine;

namespace Saga.Story.Data
{
    /// <summary>
    /// PLAN.md 101-2 STORY "5-3 비경" 진행 상태 — `StoryJobState.cs`와
    /// 같은 결의 정적 상태(인스턴스 하나뿐). 실행 흐름은
    /// `StoryLabyrinthRunner.cs`, 데이터는 `StoryLabyrinthData.cs` 참고.
    ///
    /// **재해석 — 세이브 범위.** 웹판/godot은 진행 중인 회차(층·경로·
    /// 축복)까지 세이브에 넣지만, 이 트랙은 `StoryCombat.Mp`(세션 중요치
    /// 아님 — "세이브에 안 넣는다" 주석)와 같은 선례를 따라 **회차 진행은
    /// 메모리만**이다 — 앱을 끄면 그 회차는 사라진다(다른 판 SessionTracker와
    /// 같은 결). 이미 확정된 기억 조각·영구강화 단수만 `StorySaveState.cs`를
    /// 거쳐 영구 저장된다.
    /// </summary>
    public static class StoryLabyrinthState
    {
        // ── 영구(세이브) ─────────────────────────────────────────
        public static int MemoryShards { get; private set; }
        public static int MemoryTier { get; private set; }

        public static float MemoryAtkBonus => MemoryTier * StoryLabyrinthData.MemoryAtkBonusPerTier;

        public static void AddShards(int amount)
        {
            if (amount <= 0) return;
            MemoryShards += amount;
        }

        /// <summary>비경 문(`StoryLabyrinthGate.cs`)의 "기억을 새긴다" —
        /// 조각이 부족하거나 이미 최대 단계면 조용히 실패.</summary>
        public static bool TryUpgradeMemory()
        {
            if (MemoryTier >= StoryLabyrinthData.MemoryTierMax) return false;
            int cost = StoryLabyrinthData.MemoryUpgradeCost(MemoryTier + 1);
            if (MemoryShards < cost) return false;
            MemoryShards -= cost;
            MemoryTier++;
            return true;
        }

        public static void Restore(int shards, int tier)
        {
            MemoryShards = Mathf.Max(0, shards);
            MemoryTier = Mathf.Clamp(tier, 0, StoryLabyrinthData.MemoryTierMax);
        }

        // ── 회차(메모리만) ───────────────────────────────────────
        public static bool InRun { get; private set; }
        public static int Floor { get; private set; } // 1~5.
        public static StoryLabyrinthData.NodeType[][] FloorNodes { get; private set; }
        public static bool ExtraLifeAvailable { get; private set; }

        public static float AtkMul { get; private set; } = 1f;
        public static float CritRateBonus { get; private set; }
        public static float CooldownMul { get; private set; } = 1f;
        public static float MoveSpeedMul { get; private set; } = 1f;
        public static float MpRegenMul { get; private set; } = 1f;
        public static float TimeLimitMul { get; private set; } = 1f;
        public static float ShardRewardMul { get; private set; } = 1f;
        public static bool MpShieldOnEntry { get; private set; }

        public static StoryLabyrinthData.WeeklyVariant CurrentWeeklyVariant =>
            StoryLabyrinthData.WeeklyVariants[CurrentWeekIndex() % StoryLabyrinthData.WeeklyVariants.Length];

        // godot/StorySaveState.ChampionAvailable()과 같은 결 — 실제 요일
        // 기준이 아니라 7일 창 index(달력 요일 무관, 체감 차이 없음).
        public static int CurrentWeekIndex() => (int)(DateTimeOffset.UtcNow.ToUnixTimeSeconds() / (7 * 86400));

        public static void StartRun(int seed)
        {
            InRun = true;
            Floor = 1;
            FloorNodes = StoryLabyrinthData.GenerateFloors(seed);
            ExtraLifeAvailable = false;
            AtkMul = 1f; CritRateBonus = 0f; CooldownMul = 1f; MoveSpeedMul = 1f;
            MpRegenMul = 1f; TimeLimitMul = 1f; ShardRewardMul = 1f; MpShieldOnEntry = false;
        }

        public static void ApplyBlessing(string key)
        {
            switch (key)
            {
                case "atk_power": AtkMul *= 1.25f; break;
                case "atk_crit": CritRateBonus += 0.10f; break;
                case "atk_haste": CooldownMul *= 0.8f; break;
                case "time_margin": TimeLimitMul *= 1.25f; break;
                case "extra_life": ExtraLifeAvailable = true; break;
                case "mp_shield": MpShieldOnEntry = true; break;
                case "move_speed": MoveSpeedMul *= 1.2f; break;
                case "mp_regen": MpRegenMul *= 1.3f; break;
                case "memory_bonus": ShardRewardMul *= 1.5f; break;
            }
        }

        public static void AdvanceFloor() => Floor++;

        /// <summary>실패(제한시간 초과) — `extra_life`가 있으면 그걸
        /// 소모하고 true(무효화됨, 다시 시도 가능)를 돌려준다.</summary>
        public static bool ConsumeExtraLifeIfAvailable()
        {
            if (!ExtraLifeAvailable) return false;
            ExtraLifeAvailable = false;
            return true;
        }

        public static void EndRun() => InRun = false;

        /// <summary>PlaytestStorySlice.cs 전용 — 다른 XxxState류와 같은
        /// 테스트 리셋 자리(실제 게임 코드 경로에선 안 쓴다).</summary>
        public static void ResetForTest()
        {
            InRun = false;
            Floor = 0;
            FloorNodes = null;
            ExtraLifeAvailable = false;
            AtkMul = 1f; CritRateBonus = 0f; CooldownMul = 1f; MoveSpeedMul = 1f;
            MpRegenMul = 1f; TimeLimitMul = 1f; ShardRewardMul = 1f; MpShieldOnEntry = false;
        }
    }
}
