using UnityEngine;
using UnityEngine.UI;
using Saga.Story.Data;

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
            label.text = $"🗡️ 첫 사냥 {Mathf.Min(StoryQuestState.Kills, StoryQuestState.KillGoal)}/{StoryQuestState.KillGoal}" +
                         (done ? " — 완료!" : "");
        }
    }
}
