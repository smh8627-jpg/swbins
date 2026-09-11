using System;

namespace Saga.Go.Data
{
    public enum QuestStage { NotStarted, Active, Completed }

    /// <summary>
    /// PLAN.md 70~71장 Quest 시스템 / Quest Objective·Reward — 이번 슬라이스는
    /// 사건이 "도적의 습격" 하나뿐이라 퀘스트도 그 하나뿐이다(여러 퀘스트를
    /// 담을 사전 구조로 미리 일반화하지 않는다, 32장 "최소 변경"). 마을
    /// 촌장(NpcBuilder·VillagerTalk)이 말을 걸면 내주고, 도적을 물리치면
    /// BanditEncounter가 완료 처리한다 — PartyState.cs와 같은 자리(static).
    /// </summary>
    public static class QuestState
    {
        public const int BanditRewardExp = 50;

        public static QuestStage BanditQuest { get; private set; } = QuestStage.NotStarted;

        public static event Action<QuestStage> BanditQuestChanged;

        public static void StartBanditQuest()
        {
            if (BanditQuest != QuestStage.NotStarted) return;
            BanditQuest = QuestStage.Active;
            BanditQuestChanged?.Invoke(BanditQuest);
        }

        /// <summary>활성 상태일 때만 완료 처리하고 true를 돌려준다 — 이미 끝났거나
        /// 아직 시작 전(촌장을 못 만남)이면 false(보상 중복·건너뛰기 방지).</summary>
        public static bool CompleteBanditQuest()
        {
            if (BanditQuest != QuestStage.Active) return false;
            BanditQuest = QuestStage.Completed;
            BanditQuestChanged?.Invoke(BanditQuest);
            return true;
        }

        public static void Restore(QuestStage stage)
        {
            BanditQuest = stage;
        }
    }
}
