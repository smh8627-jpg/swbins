namespace Saga.Story.Data
{
    /// <summary>
    /// PLAN.md 51장 "STORY 확장 — 관계" 첫 슬라이스 — NPC가 아직 척후병
    /// 하나뿐이라(`StoryNpc.cs`) 본격 호감도(사건별 증감·NPC마다 수치)
    /// 까지는 안 간다. "몇 번 말을 걸었는가"만 세어 마주칠수록 인사말이
    /// 조금씩 데워지는 정도로 "관계"라는 축이 존재한다는 것만 보여준다 —
    /// NPC가 늘거나 사용자가 방향을 더 주면 본격적인 수치형 호감도로
    /// 키울 몫으로 남긴다.
    ///
    /// **선택(2026-09-14 추가)** — `ChoiceMade`는 두목 처치 직후 척후병이
    /// 묻는 한 번짜리 장식적 분기(`StoryNpc.ShowChoice`) 결과다. 0=아직
    /// 안 고름, 1=함께 축배, 2=치하만. 어느 쪽이든 게임 상태(사명·MP·
    /// 골드 등)는 안 바뀐다 — STORY엔 갈릴 결과를 담을 시스템 자체가
    /// 없어(`StoryNpc.cs` 클래스 주석) 이후 대사 어투만 갈린다.
    /// </summary>
    public static class StoryNpcState
    {
        public static int ScoutTalkCount { get; private set; }
        public static int ChoiceMade { get; private set; }

        public static void AddScoutTalk() => ScoutTalkCount++;
        public static void SetChoice(int choice) => ChoiceMade = choice;

        public static void Restore(int scoutTalkCount, int choiceMade = 0)
        {
            ScoutTalkCount = scoutTalkCount < 0 ? 0 : scoutTalkCount;
            ChoiceMade = choiceMade;
        }
    }
}
