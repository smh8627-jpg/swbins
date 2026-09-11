using System;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 51장 GO 월드 확장 — 산신당의 가호(한 번뿐인 발견). 자리가
    /// 하나뿐이라 WorldEventState.cs(숨은 보물)와 똑같은 결의 전용 상태
    /// 클래스를 하나 더 둔다 — 세 번째 "자리 하나짜리" 월드 이벤트가
    /// 생기면 그때 GatherState.cs처럼 id 집합으로 합칠 것(지금은 둘뿐이라
    /// 아직 안 합침, 32장 "최소 변경").
    /// </summary>
    public static class ShrineState
    {
        public static bool Blessed { get; private set; }

        public static event Action Blessing;

        public static bool TryBless()
        {
            if (Blessed) return false;
            Blessed = true;
            Blessing?.Invoke();
            return true;
        }

        public static void Restore(bool blessed)
        {
            Blessed = blessed;
        }
    }
}
