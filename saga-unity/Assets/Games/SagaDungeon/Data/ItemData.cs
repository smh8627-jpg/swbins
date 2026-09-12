using System.Collections.Generic;

namespace Saga.Dungeon.Data
{
    /// <summary>
    /// VERTICAL_SLICE_DUNGEON.md — GO의 Data/ItemData.cs와 같은 결(코드
    /// 카탈로그, ScriptableObject 없음). 이번 슬라이스는 무기 하나뿐 —
    /// 방어구·세공·희귀도는 다음 슬라이스(saga-dungeon 웹판 30~32장) 몫.
    /// 원작 상표 없는 순수 설명형 이름.
    /// </summary>
    public class ItemData
    {
        public readonly string Id;
        public readonly string Name;
        public readonly float AtkBonus;

        private ItemData(string id, string name, float atk)
        {
            Id = id;
            Name = name;
            AtkBonus = atk;
        }

        public static readonly Dictionary<string, ItemData> Catalog = new Dictionary<string, ItemData>
        {
            ["wp_start"] = new ItemData("wp_start", "목검", 0f),
            // 황건적(World/DungeonEnemy.cs) 처치 확정 드랍 — 이번 슬라이스
            // 유일한 보상 아이템이라 확률 룰렛 없이 항상 나온다.
            ["wp_axe"] = new ItemData("wp_axe", "쇠도끼", 12f),
            // 두목(황건적 두목, DungeonEnemy isBoss=true) 확정 드랍 —
            // js/dungeon.js의 boss 공격력 배율(2.2배, enemyDmg 공식)을
            // 그대로 재사용해 wp_axe(12) × 2.2 = 26.4 → 26으로 잡았다
            // (웹판 boss 노획은 절차적 희귀도 시스템이라 이번 슬라이스
            // 범위 밖 — VERTICAL_SLICE_DUNGEON.md "제외" 참고, 그래도
            // 임의 수치 대신 기존 공식의 배율을 재사용).
            ["wp_glaive"] = new ItemData("wp_glaive", "귀두도", 26f),
        };

        public static ItemData Get(string id) => id != null && Catalog.TryGetValue(id, out var d) ? d : null;
    }
}
