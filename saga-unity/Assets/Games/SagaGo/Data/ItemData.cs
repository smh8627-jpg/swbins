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
        private readonly string _name;
        public string Name => GoLocalization.T("item." + Id, _name);
        public readonly ItemSlot Slot;
        public readonly float AtkBonus;
        public readonly float DefBonus;

        // PLAN.md 101-3 G "장비 가시화" — 무기 소켓의 이미시브 림 3단(0~2).
        // 방어구는 이번 라운드에 시각화 대상이 아니라(소켓 자체가 무기 하나뿐)
        // 값은 그냥 0으로 둔다 — 실제로 안 읽힌다.
        public readonly int Grade;

        private ItemData(string id, string name, ItemSlot slot, float atk, float def, int grade = 0)
        {
            Id = id;
            _name = name;
            Slot = slot;
            AtkBonus = atk;
            DefBonus = def;
            Grade = grade;
        }

        public static readonly Dictionary<string, ItemData> Catalog = new Dictionary<string, ItemData>
        {
            ["wp_wood"] = new ItemData("wp_wood", "목검", ItemSlot.Weapon, 10f, 0f, grade: 0),
            ["wp_iron"] = new ItemData("wp_iron", "쇠칼", ItemSlot.Weapon, 22f, 0f, grade: 1),
            ["ar_cloth"] = new ItemData("ar_cloth", "베옷 갑주", ItemSlot.Armor, 0f, 8f),
            ["ar_leather"] = new ItemData("ar_leather", "가죽 갑주", ItemSlot.Armor, 0f, 16f),
            // 도적 전리품엔 안 나온다 — 굴 속 숨겨진 보물(World/HiddenTreasure.cs)
            // 전용, 탐험 보상이 전투 보상보다 확실히 세도록.
            ["wp_relic"] = new ItemData("wp_relic", "유물 검", ItemSlot.Weapon, 30f, 0f, grade: 2),
            // 희귀 몬스터(World/RareWolfEncounter.cs) 전용 확정 보상 — 방어구
            // 축의 최고치를 여기 둬서 "희귀"가 실제로 제일 좋은 걸 준다.
            ["ar_wolf"] = new ItemData("ar_wolf", "늑대 가죽 갑주", ItemSlot.Armor, 0f, 24f),
        };

        public static ItemData Get(string id) => id != null && Catalog.TryGetValue(id, out var d) ? d : null;
    }
}
