using System;
using UnityEngine;

namespace Saga.Story.Data
{
    /// <summary>
    /// PLAN.md 51장 "STORY 확장 — 전직·SP 투자 UI"(saga-godot
    /// `story_save_state.gd`의 level/exp/job 부분이 정본, SP 투자 자체는
    /// 범위 밖 — `StoryCombat.JobsTier1` 클래스 주석 참고). `StoryQuestState.cs`
    /// 와 같은 결의 정적 상태 클래스 — 인스턴스가 하나뿐이라 MonoBehaviour로
    /// 안 만든다.
    /// </summary>
    public static class StoryJobState
    {
        public const string NoJob = "none";

        public static int Level { get; private set; } = 1;
        public static float Exp { get; private set; }
        public static string Job { get; private set; } = NoJob;

        public static event Action<int> LeveledUp;

        // PLAN.md 101-3 G "장비 가시화"(2026-09-18, `StoryWeaponVisual.cs`
        // 전용) — 전직은 딱 한 번뿐이라(1절 CanChooseJob) 매 프레임 폴링
        // 대신 이벤트로 배선한다. DUNGEON `HeroState.EquipmentChanged`·GO
        // `Inventory.ItemGained`와 같은 결.
        public static event Action<string> JobChosen;

        public static bool HasJob => Job != NoJob;

        /// <summary>core.js gainExp() 그대로 — 한 번에 여러 레벨을 넘을 수
        /// 있어 while로 처리한다(연속 처치 등).</summary>
        public static void GainExp(float amount)
        {
            if (amount <= 0f) return;
            Exp += amount;
            while (Exp >= StoryCombat.ExpNeed(Level))
            {
                Exp -= StoryCombat.ExpNeed(Level);
                Level++;
                LeveledUp?.Invoke(Level);
            }
        }

        public static bool CanChooseJob => !HasJob && Level >= StoryCombat.JobChangeLevel;

        /// <summary>story_job_trainer.gd `_choose()` 그대로 — 전직은 한
        /// 번뿐, 이미 골랐거나 레벨이 안 되면 조용히 실패(호출부가 상태
        /// 토스트로 알린다).</summary>
        public static bool ChooseJob(string jobKey)
        {
            if (!CanChooseJob) return false;
            if (!StoryCombat.JobsTier1.ContainsKey(jobKey)) return false;
            Job = jobKey;
            JobChosen?.Invoke(jobKey);
            return true;
        }

        public static float AtkBonus => HasJob ? StoryCombat.JobsTier1[Job].Atk : 0f;
        public static float MpBonus => HasJob ? StoryCombat.JobsTier1[Job].Mp : 0f;
        public static float HpBonus => HasJob ? StoryCombat.JobsTier1[Job].Hp : 0f;

        public static string JobDisplayName => HasJob ? StoryCombat.JobsTier1[Job].Name : "";

        /// <summary>세이브 로드·(테스트의) 상태 초기화 둘 다 이 경로를 탄다
        /// — `JobChosen`도 같이 쏴서 `StoryWeaponVisual`이 그때그때 손의
        /// 무기를 다시 맞추게 한다(2026-09-18, PLAN.md 101-3 G "장비
        /// 가시화" 이식 중 발견 — Restore가 이 이벤트를 안 쏘면 이전 세션이
        /// 남긴 무기 모델이 새 Job 상태와 안 맞게 손에 그대로 남는다).</summary>
        public static void Restore(int level, float exp, string job)
        {
            Level = Mathf.Max(1, level);
            Exp = Mathf.Max(0f, exp);
            Job = string.IsNullOrEmpty(job) ? NoJob : job;
            JobChosen?.Invoke(Job);
        }
    }
}
