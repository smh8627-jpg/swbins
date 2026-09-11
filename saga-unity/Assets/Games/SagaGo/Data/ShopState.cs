namespace Saga.Go.Data
{
    /// <summary>
    /// 떠돌이 상인이 딱 한 번 파는 물건 하나 — 새 상점 화면을 만들지 않고
    /// Inventory.cs의 "자동 장착"과 같은 결로 "말을 걸면 살 수 있으면 산다"
    /// 로 처리한다(NpcBuilder.cs). PartyState.cs와 같은 자리(static).
    /// </summary>
    public static class ShopState
    {
        public const string MerchantItemId = "ar_cloth";
        public const int MerchantPrice = 25;

        public static bool MerchantSold { get; private set; }

        /// <summary>살 돈이 있고 아직 안 샀으면 돈을 쓰고 물건을 준 뒤 true.</summary>
        public static bool TryBuyFromMerchant()
        {
            if (MerchantSold) return false;
            if (!GoldState.TrySpend(MerchantPrice)) return false;

            MerchantSold = true;
            Inventory.AddItem(MerchantItemId);
            return true;
        }

        public static void Restore(bool sold)
        {
            MerchantSold = sold;
        }
    }
}
