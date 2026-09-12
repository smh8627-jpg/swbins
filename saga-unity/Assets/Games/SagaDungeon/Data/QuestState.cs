using System;

namespace Saga.Dungeon.Data
{
    /// <summary>
    /// PLAN.md(saga-dungeon 웹판) 36장 "퀘스트 시스템" — 최소한
    /// 메인/지역/랜덤/이벤트 퀘스트를 지원하라는 요구 중 이 슬라이스는
    /// **메인 퀘스트 한 줄**만 놓는다(지역·랜덤·이벤트 퀘스트는 다음
    /// 슬라이스, 이 판은 아직 NPC 퀘스트 발주자 자체가 없다). 기존 방
    /// 진행(두목→미니보스→구출)을 그대로 목표로 삼아 **새 콘텐츠를 안
    /// 늘리고 이미 있는 이정표에 이름과 보상만 붙였다** — GO의
    /// QuestState.cs(촌장 대사 3단계)와 달리 이 판엔 대사 NPC가 없어
    /// 진행은 순수 폴링(`Poll()`, `GameBootstrap.Update()`가 매 프레임
    /// 부른다)과 완료 콜백(`MarkCaptiveFreed()`, `DungeonCaptive.cs`가
    /// 직접 부른다)으로 감지한다. 두목·미니보스는 기존 `BestiaryState`
    /// (도감 슬라이스가 이미 처치 시 이름을 기록해 둔다)를 그대로 재사용 —
    /// `DungeonEnemy.cs`를 안 건드리고 완료를 감지할 수 있다.
    /// </summary>
    public static class QuestState
    {
        public enum Stage { HuntBoss, HuntMiniboss, Rescue, Done }

        private const string BossName = "황건적 두목";
        private const string MinibossName = "황건 살수";

        private const int StageRewardExp = 25;
        private const int StageRewardGold = 10;

        public static Stage Current { get; private set; } = Stage.HuntBoss;

        /// <summary>완료된 단계·보상 문구를 함께 넘긴다 — DialogueLabel
        /// 토스트·HUD 갱신에 그대로 쓸 수 있게.</summary>
        public static event Action<Stage, string> StageCompleted;

        public static string ObjectiveText => Current switch
        {
            Stage.HuntBoss => "메인 퀘스트 — 황건적 두목을 처치하라",
            Stage.HuntMiniboss => "메인 퀘스트 — 황건 살수(미니보스)를 처치하라",
            Stage.Rescue => "메인 퀘스트 — 갇힌 인영을 구출하라",
            _ => "메인 퀘스트 — 완료(던전을 정리했다)",
        };

        /// <summary>GameBootstrap.Update()가 매 프레임 부른다 — 두목·미니보스
        /// 처치는 별도 콜백 없이 도감 기록만 보고 판정한다.</summary>
        public static void Poll()
        {
            if (Current == Stage.HuntBoss && BestiaryState.IsDiscovered(BossName))
            {
                Advance();
            }
            else if (Current == Stage.HuntMiniboss && BestiaryState.IsDiscovered(MinibossName))
            {
                Advance();
            }
        }

        /// <summary>DungeonCaptive.cs가 구출 완료 시 직접 부른다 — 도감처럼
        /// 폴링만으로 감지할 표시가 없어서(구출은 몬스터가 아니다).</summary>
        public static void MarkCaptiveFreed()
        {
            if (Current == Stage.Rescue) Advance();
        }

        private static void Advance()
        {
            Current = (Stage)((int)Current + 1);
            HeroState.AddExp(StageRewardExp);
            HeroState.AddGold(StageRewardGold);
            string msg = $"📜 {ObjectiveTextForCompleted()} — 퀘스트 보상 경험치 +{StageRewardExp} · 돈 +{StageRewardGold}냥";
            StageCompleted?.Invoke(Current, msg);
        }

        private static string ObjectiveTextForCompleted()
        {
            // Advance() 직후엔 Current가 이미 다음 단계라, 완료 문구는 이전
            // 단계 이름으로 되짚는다.
            return Current switch
            {
                Stage.HuntMiniboss => "황건적 두목을 처치했다",
                Stage.Rescue => "황건 살수를 처치했다",
                Stage.Done => "갇힌 인영을 구출했다",
                _ => "퀘스트 진행",
            };
        }

        public static void Restore(int stage)
        {
            int clamped = Math.Clamp(stage, 0, (int)Stage.Done);
            Current = (Stage)clamped;
        }
    }
}
