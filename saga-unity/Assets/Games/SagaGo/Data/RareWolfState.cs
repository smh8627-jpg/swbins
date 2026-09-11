namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 51장 GO 월드 확장 — 희귀 몬스터(흰 늑대)를 이미 잡았는지.
    /// 등용 대상이 아니라 PartyState로는 못 가려서(BanditEncounter는
    /// "이미 부대에 있나"로 재등장을 막지만 이건 등용을 안 한다) 자리
    /// 하나짜리 전용 상태 클래스를 둔다 — WorldEventState.cs·
    /// ShrineState.cs와 같은 결.
    /// </summary>
    public static class RareWolfState
    {
        public static bool Defeated { get; private set; }

        public static void MarkDefeated()
        {
            Defeated = true;
        }

        public static void Restore(bool defeated)
        {
            Defeated = defeated;
        }
    }
}
