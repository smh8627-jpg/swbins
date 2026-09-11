using System;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 72~73장 World Event / Hidden Area — 이번 슬라이스는 굴 입구
    /// 옆에 숨은 보물 하나뿐이다(사건이 늘면 (id→상태) 사전으로 일반화,
    /// 지금은 안 함, 32장 "최소 변경"). PartyState.cs와 같은 자리(static).
    /// </summary>
    public static class WorldEventState
    {
        public static bool CaveTreasureFound { get; private set; }

        public static event Action TreasureFound;

        /// <summary>아직 못 찾았을 때만 찾은 걸로 바꾸고 true — 이미 찾았으면 false(중복 방지).</summary>
        public static bool TryFindCaveTreasure()
        {
            if (CaveTreasureFound) return false;
            CaveTreasureFound = true;
            TreasureFound?.Invoke();
            return true;
        }

        public static void Restore(bool found)
        {
            CaveTreasureFound = found;
        }
    }
}
