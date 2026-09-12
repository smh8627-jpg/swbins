using System.Collections.Generic;

namespace Saga.Dungeon.Data
{
    /// <summary>
    /// VERTICAL_SLICE_DUNGEON.md 다음 슬라이스 "세공·행상 재고 굴리기·도감" —
    /// saga-dungeon 웹판 `js/data-gem.js`(보석·부문·주옥, 등급별 세공
    /// 재료)의 실제 절차적 세공(구멍 수·등급별 옵션 룰렛)은 범위 밖(신규
    /// UI·밸런스 표가 필요한 큰 손질)이라, `ItemData.cs`와 같은 결(코드
    /// 카탈로그, 고정 3종)로 단순화했다. 무기에 소켓 하나뿐(둘째 소켓·
    /// 세트 효과 없음) — `HeroState.SocketIfBetter()`가
    /// `EquipIfBetter()`와 같은 규칙("더 센 것만")으로 자동 장착한다.
    /// </summary>
    public class GemData
    {
        public readonly string Id;
        public readonly string Name;
        public readonly float AtkBonus;

        private GemData(string id, string name, float atk)
        {
            Id = id;
            Name = name;
            AtkBonus = atk;
        }

        public static readonly Dictionary<string, GemData> Catalog = new Dictionary<string, GemData>
        {
            // 광맥(World/DungeonVein.cs) 확정 드랍 — 웹판 주석 "세공 재료
            // 둘 확정"을 하나로 줄였다(이 슬라이스엔 둘째 소켓이 없어서).
            ["gem_jade"] = new GemData("gem_jade", "벽옥", 4f),
            // 행상(World/DungeonMerchant.cs, Room3 전용 재고) 확정 판매.
            ["gem_sapphire"] = new GemData("gem_sapphire", "남주", 8f),
            // 미니보스(World/DungeonEnemy.cs isBoss) 확정 드랍.
            ["gem_ruby"] = new GemData("gem_ruby", "홍옥", 14f),
        };

        public static GemData Get(string id) => id != null && Catalog.TryGetValue(id, out var d) ? d : null;
    }
}
