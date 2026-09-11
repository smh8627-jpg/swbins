using System.Collections.Generic;

namespace Saga.Go.Data
{
    public enum ItemSlot { Weapon, Armor }

    /// <summary>
    /// PLAN.md 62장 Item 시스템 — VERTICAL_SLICE 범위라 ScriptableObject
    /// 에셋을 따로 안 만들고(7장은 "최종"엔 SO를 권하지만, 이 슬라이스는
    /// TestMapData.cs처럼 이미 plain C# 정적 데이터로 통일돼 있다) 코드
    /// 카탈로그 하나로 정의한다. 도적을 이겼을 때만 나오는 최소 장비
    /// 몇 종 — 원작 상표 없는 순수 설명형 이름(루트 CLAUDE.md 이름 정책은
    /// 인물명에만 해당하지만 장비도 안전하게 일반명사로 둔다).
    /// </summary>
    public class ItemData
    {
        public readonly string Id;
        public readonly string Name;
        public readonly ItemSlot Slot;
        public readonly float AtkBonus;
        public readonly float DefBonus;

        private ItemData(string id, string name, ItemSlot slot, float atk, float def)
        {
            Id = id;
            Name = name;
            Slot = slot;
            AtkBonus = atk;
            DefBonus = def;
        }

        public static readonly Dictionary<string, ItemData> Catalog = new Dictionary<string, ItemData>
        {
            ["wp_wood"] = new ItemData("wp_wood", "목검", ItemSlot.Weapon, 10f, 0f),
            ["wp_iron"] = new ItemData("wp_iron", "쇠칼", ItemSlot.Weapon, 22f, 0f),
            ["ar_cloth"] = new ItemData("ar_cloth", "베옷 갑주", ItemSlot.Armor, 0f, 8f),
            ["ar_leather"] = new ItemData("ar_leather", "가죽 갑주", ItemSlot.Armor, 0f, 16f),
        };

        public static ItemData Get(string id) => id != null && Catalog.TryGetValue(id, out var d) ? d : null;
    }
}
