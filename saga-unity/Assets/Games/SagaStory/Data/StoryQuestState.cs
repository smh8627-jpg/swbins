namespace Saga.Story.Data
{
    /// <summary>
    /// VERTICAL_SLICE_STORY.md 1절 사명 — 웹판 `data-quest.js` q_first
    /// ("첫 사냥", kill 10) 진행도만 옮긴다(saga-godot `story_save_state.gd`
    /// 의 kills 필드와 같은 값). 사명 나머지(gear/gather/visit/talk/skill/
    /// gold/boss)는 범위 밖 — DUNGEON `Data/QuestState.cs`처럼 정적 폴링
    /// 클래스로 짜기엔 이번 슬라이스는 조건 하나뿐이라 이벤트/폴링 없이
    /// `StoryEnemy.Die()`가 직접 `AddKill()`을 부르는 게 더 단순하다.
    /// </summary>
    public static class StoryQuestState
    {
        public const int KillGoal = 10;

        public static int Kills { get; private set; }

        public static bool QuestDone => Kills >= KillGoal;

        public static void AddKill() => Kills++;

        public static void Restore(int kills) => Kills = kills < 0 ? 0 : kills;
    }
}
