namespace Saga.Story.Data
{
    /// <summary>
    /// VERTICAL_SLICE_STORY.md 1절 사명 — 웹판 `data-quest.js` q_first
    /// ("첫 사냥", kill 10) 진행도만 옮긴다(saga-godot `story_save_state.gd`
    /// 의 kills 필드와 같은 값). **"STORY 콘텐츠 확장" (2026-09-13, 스물한
    /// 번째 세션)에서 q_boss1("두목의 목", boss 1)을 더했다** — 사명
    /// 나머지(gear/gather/visit/talk/skill/gold)는 여전히 범위 밖 — DUNGEON
    /// `Data/QuestState.cs`처럼 정적 폴링 클래스로 짜기엔 조건이 아직
    /// 둘뿐이라 이벤트/폴링 없이 `StoryEnemy.Die()`가 직접 `AddKill()`/
    /// `AddBossKill()`을 부르는 게 더 단순하다.
    /// </summary>
    public static class StoryQuestState
    {
        public const int KillGoal = 10;
        public const int BossGoal = 1;

        public static int Kills { get; private set; }
        public static int BossKills { get; private set; }

        public static bool QuestDone => Kills >= KillGoal;
        public static bool QuestBossDone => BossKills >= BossGoal;

        public static void AddKill() => Kills++;
        public static void AddBossKill() => BossKills++;

        public static void Restore(int kills, int bossKills)
        {
            Kills = kills < 0 ? 0 : kills;
            BossKills = bossKills < 0 ? 0 : bossKills;
        }
    }
}
