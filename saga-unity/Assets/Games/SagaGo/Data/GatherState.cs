using System.Collections.Generic;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 51장 GO 월드 확장 — "수집" 콘텐츠(산나물 채집). 도적·숨은
    /// 보물은 자리가 하나뿐이라 각자 전용 상태 클래스(QuestState/
    /// WorldEventState)를 뒀지만, 채집은 처음부터 여러 자리라 id 집합
    /// 하나로 묶는다(사전에 일반화한 게 아니라 이 콘텐츠 자체가 N개다).
    /// </summary>
    public static class GatherState
    {
        private static readonly HashSet<string> Gathered = new HashSet<string>();

        public static bool IsGathered(string spotId) => Gathered.Contains(spotId);

        /// <summary>아직 안 캤으면 캔 걸로 표시하고 true — 이미 캤으면 false.</summary>
        public static bool TryGather(string spotId) => Gathered.Add(spotId);

        public static IReadOnlyCollection<string> GatheredIds => Gathered;

        public static void Restore(IEnumerable<string> gathered)
        {
            Gathered.Clear();
            if (gathered == null) return;
            foreach (var id in gathered) Gathered.Add(id);
        }
    }
}
