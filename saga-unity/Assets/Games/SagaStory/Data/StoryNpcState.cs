namespace Saga.Story.Data
{
    /// <summary>
    /// PLAN.md 51장 "STORY 확장 — 관계" 첫 슬라이스 — NPC가 아직 척후병
    /// 하나뿐이라(`StoryNpc.cs`) 본격 호감도(사건별 증감·NPC마다 수치)
    /// 까지는 안 간다. "몇 번 말을 걸었는가"만 세어 마주칠수록 인사말이
    /// 조금씩 데워지는 정도로 "관계"라는 축이 존재한다는 것만 보여준다 —
    /// NPC가 늘거나 사용자가 방향을 더 주면 본격적인 수치형 호감도로
    /// 키울 몫으로 남긴다.
    /// </summary>
    public static class StoryNpcState
    {
        public static int ScoutTalkCount { get; private set; }

        public static void AddScoutTalk() => ScoutTalkCount++;

        public static void Restore(int scoutTalkCount) => ScoutTalkCount = scoutTalkCount < 0 ? 0 : scoutTalkCount;
    }
}
