using UnityEngine;
using UnityEngine.UI;
using Saga.Story.Data;
using Saga.Story.World;

namespace Saga.Story.UI
{
    /// <summary>
    /// VERTICAL_SLICE_STORY.md 1절 사명 — 웹판 data-quest.js q_first
    /// ("첫 사냥", kill 10) 진행도를 상시 표시한다(saga-godot
    /// `quest_label.gd`와 같은 값). DUNGEON `PlayerHud.cs`와 같은 폴링
    /// 패턴(값이 바뀌는 곳이 StoryEnemy.Die() 하나뿐이라도 폴링이 신호
    /// 배선보다 단순하다).
    /// </summary>
    public class StoryHud : MonoBehaviour
    {
        [SerializeField] private Text label;

        private const float RefreshGapSec = 0.25f;
        private float _timer;

        private void Start() => Refresh();

        private void Update()
        {
            _timer += Time.unscaledDeltaTime; // 히트스톱(Time.timeScale)에 안 묶이게.
            if (_timer < RefreshGapSec) return;
            _timer = 0f;
            Refresh();
        }

        private void Refresh()
        {
            if (label == null) return;
            bool done = StoryQuestState.QuestDone;
            bool bossDone = StoryQuestState.QuestBossDone;
            string mp = string.Format(StoryLocalization.T("hud.mp"), Mathf.RoundToInt(StoryCombat.Mp), Mathf.RoundToInt(StoryCombat.MpMaxCurrent));
            string jobSuffix = StoryJobState.HasJob
                ? $" {StoryLocalization.T($"job.{StoryJobState.Job}", StoryJobState.JobDisplayName)}"
                : "";
            label.text = $"🎖️ {string.Format(StoryLocalization.T("hud.level"), StoryJobState.Level)}{jobSuffix}" +
                         $"\n🗡️ {StoryLocalization.T("quest.first_hunt", "첫 사냥")} {Mathf.Min(StoryQuestState.Kills, StoryQuestState.KillGoal)}/{StoryQuestState.KillGoal}" +
                         (done ? StoryLocalization.T("hud.done") : "") +
                         $"\n👺 {StoryLocalization.T("quest.boss_head", "두목의 목")} {Mathf.Min(StoryQuestState.BossKills, StoryQuestState.BossGoal)}/{StoryQuestState.BossGoal}" +
                         (bossDone ? StoryLocalization.T("hud.done") : "") +
                         $"\n{mp}";

            // PLAN.md 101-2 5-4 "관문 대장" — 챔피언전이 진행 중일 때만 카운트다운을 얹는다(DUNGEON PlayerHud와 같은 결).
            var champion = StoryEnemy.ActiveChampion;
            if (champion != null)
            {
                string shield = champion.ChampionShieldBroken ? StoryLocalization.T("gatechampion.shield_hud", " 🛡깨짐") : "";
                string timer = string.Format(StoryLocalization.T("gatechampion.timer", "🚪 관문 대장 — {0:0}초{1}"),
                    Mathf.Max(0f, champion.ChampionTimeLeft), shield);
                label.text += $"\n{timer}";
            }
        }
    }
}
