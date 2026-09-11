using UnityEngine;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 67장 Loot Table. 이번 슬라이스엔 사건이 "도적의 습격" 하나뿐이라
    /// 테이블도 하나뿐 — 나중에 사건/몬스터가 늘면 (id → LootTable) 사전으로
    /// 바꾼다(지금 미리 그 구조를 짜지 않는다, 32장 "최소 변경").
    /// </summary>
    public static class LootTable
    {
        private struct Entry
        {
            public string ItemId; // null = 빈 손
            public float Weight;
        }

        private static readonly Entry[] BanditDrops =
        {
            new Entry { ItemId = null, Weight = 40f },
            new Entry { ItemId = "wp_wood", Weight = 20f },
            new Entry { ItemId = "wp_iron", Weight = 10f },
            new Entry { ItemId = "ar_cloth", Weight = 20f },
            new Entry { ItemId = "ar_leather", Weight = 10f },
        };

        /// <summary>null이면 이번엔 아무것도 안 나온 것.</summary>
        public static string RollBanditDrop()
        {
            float total = 0f;
            foreach (var e in BanditDrops) total += e.Weight;

            float roll = Random.value * total;
            float acc = 0f;
            foreach (var e in BanditDrops)
            {
                acc += e.Weight;
                if (roll <= acc) return e.ItemId;
            }
            return null;
        }
    }
}
