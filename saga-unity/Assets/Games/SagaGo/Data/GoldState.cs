using System;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 66장 Reward가 요구하는 보상 축 중 그동안 비워 뒀던 "돈"을
    /// 채운다(BanditEncounter.cs의 예전 주석 — "값을 치른다/달아난다는
    /// 골드 시스템이 없어 대사만 보여준다"를 실제로 해소). PartyState.cs와
    /// 같은 자리(static). 시작 소지금을 줘서 첫(유일한) 도적 조우에서도
    /// "값을 치른다"가 실제 선택지로 성립하게 한다 — 돈을 벌 기회가
    /// 그 조우 자체뿐이라 사전에 가진 돈이 없으면 선택지가 죽은 문구가 된다.
    /// </summary>
    public static class GoldState
    {
        public const int StartingGold = 50;

        public static int Gold { get; private set; } = StartingGold;

        public static event Action<int> GoldChanged;

        public static bool CanAfford(int amount) => Gold >= amount;

        public static void Add(int amount)
        {
            if (amount <= 0) return;
            Gold += amount;
            GoldChanged?.Invoke(Gold);
        }

        /// <summary>가진 돈보다 많이 쓰려 하면 아무것도 안 하고 false.</summary>
        public static bool TrySpend(int amount)
        {
            if (amount <= 0 || Gold < amount) return false;
            Gold -= amount;
            GoldChanged?.Invoke(Gold);
            return true;
        }

        public static void Restore(int gold)
        {
            Gold = Math.Max(0, gold);
        }
    }
}
