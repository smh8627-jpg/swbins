using System.Collections.Generic;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 72~73장 World Event / Hidden Area — 자리 하나짜리 "한 번뿐인
    /// 발견" 월드 이벤트를 id로 구분해 하나로 묶는다. 처음엔 굴 옆 숨은 보물
    /// 하나뿐이라 전용 static bool이었고, 산신당(ShrineState)·희귀 몬스터
    /// (RareWolfState)가 각각 같은 결의 전용 클래스를 하나씩 더 두면서
    /// "세 번째가 생기면 GatherState.cs처럼 id 집합으로 합칠 것"이라고
    /// 예고해 뒀던 게 2026-09-12에 실제로 세 번째(RareWolfState)까지
    /// 차서 합쳤다 — GatherState.cs와 똑같은 모양(id 문자열 집합).
    /// 기존 세 이벤트는 각각 "cave_treasure"·"shrine_blessing"·"rare_wolf"
    /// id를 쓴다(호출부 이름은 안 바꾸고 id만 부여).
    /// </summary>
    public static class WorldEventState
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
