using System.Collections.Generic;

namespace Saga.Story.Data
{
    /// <summary>
    /// PLAN.md 72~73장 World Event / Hidden Area + 51장 "STORY 확장 —
    /// 사건" — GO `Data/WorldEventState.cs`와 같은 결(다섯 판 공용 로직
    /// 복사 관례, 루트 CLAUDE.md). id 문자열 하나로 "한 번뿐인 발견"을
    /// 구분하는 최소형 — STORY는 아직 첫 이벤트(`StoryDiscovery.cs`)
    /// 하나뿐이지만, GO가 세 번째 이벤트에서 전용 bool 세 개를 이 모양
    /// 하나로 합쳤던 전례를 따라 처음부터 id 집합으로 짠다.
    /// </summary>
    public static class StoryWorldEventState
    {
        private static readonly HashSet<string> Triggered = new HashSet<string>();

        public static bool IsTriggered(string id) => Triggered.Contains(id);

        /// <summary>아직 안 일어났으면 일어난 걸로 표시하고 true — 이미 일어났으면 false(중복 방지).</summary>
        public static bool TryTrigger(string id) => Triggered.Add(id);

        public static IReadOnlyCollection<string> TriggeredIds => Triggered;

        public static void Restore(IEnumerable<string> triggered)
        {
            Triggered.Clear();
            if (triggered == null) return;
            foreach (var id in triggered) Triggered.Add(id);
        }
    }
}
