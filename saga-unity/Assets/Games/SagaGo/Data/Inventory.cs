using System;
using System.Collections.Generic;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 63·64·65장 Inventory/Equipment/Equipment Stats — PartyState.cs와
    /// 같은 자리(어디서든 이름으로 쓰는 static 클래스, 씬 전환 간 유지가 아님).
    /// 슬롯 UI를 새로 만들지 않는다(범위 밖) — 주운 장비가 지금 낀 것보다
    /// 세면 자동으로 낀다(웹판 RPG들이 흔히 쓰는 "더 센 장비 자동 장착"과
    /// 같은 감각, 이 슬라이스엔 장비창을 열 화면이 없어 이게 유일한 조작
    /// 경로다).
    /// </summary>
    public static class Inventory
    {
        private static readonly List<string> Owned = new List<string>();

        public static string EquippedWeaponId { get; private set; }
        public static string EquippedArmorId { get; private set; }

        public static float AtkBonus => ItemData.Get(EquippedWeaponId)?.AtkBonus ?? 0f;
        public static float DefBonus => ItemData.Get(EquippedArmorId)?.DefBonus ?? 0f;

        public static IReadOnlyList<string> OwnedIds => Owned;

        /// <summary>장비를 얻었을 때 더 세면 자동 장착. null이면 아무것도 안 준 것(닫힌 빈 손).</summary>
        public static event Action<ItemData, bool> ItemGained; // (item, equipped)

        public static void AddItem(string itemId)
        {
            var item = ItemData.Get(itemId);
            if (item == null) return;

            Owned.Add(itemId);
            bool equipped = TryAutoEquip(item);
            ItemGained?.Invoke(item, equipped);
        }

        public static void Restore(IEnumerable<string> savedOwned, string savedWeapon, string savedArmor)
        {
            Owned.Clear();
            Owned.AddRange(savedOwned);
            EquippedWeaponId = ItemData.Get(savedWeapon) != null ? savedWeapon : null;
            EquippedArmorId = ItemData.Get(savedArmor) != null ? savedArmor : null;
        }

        private static bool TryAutoEquip(ItemData item)
        {
            if (item.Slot == ItemSlot.Weapon)
            {
                float current = ItemData.Get(EquippedWeaponId)?.AtkBonus ?? 0f;
                if (item.AtkBonus <= current) return false;
                EquippedWeaponId = item.Id;
                return true;
            }
            else
            {
                float current = ItemData.Get(EquippedArmorId)?.DefBonus ?? 0f;
                if (item.DefBonus <= current) return false;
                EquippedArmorId = item.Id;
                return true;
            }
        }
    }
}
