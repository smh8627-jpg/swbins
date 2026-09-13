using System.Collections.Generic;

namespace Saga.Forest.Data
{
    /// <summary>계열 — 벽지냐 장판이냐.</summary>
    public enum FinishKind { Wall, Floor }

    /// <summary>
    /// FOREST 다음 조각 — "벽지/장판"(saga-forest 웹판 `js/data-village.js`
    /// WALLS·FLOORS, `home.js score()`의 "벽지·장판을 갈아 끼운 것도 값이다"
    /// 절 그대로). 가구(`ForestHomeData.cs`)와 같은 재해석을 쓴다 — FOREST엔
    /// 금 경제가 없어 `Value`(원작 '냥' 가격, 점수 계산엔 실제로 안 쓰인다 —
    /// 원작도 가격이 아니라 "기본이 아니면 +12" 식 정액 보너스라 참고용으로만
    /// 남긴다)와 `FruitCost`(실제 구매가, 과일로 낸다)를 분리했다. 기본 한 벌
    /// (흙벽·마루)은 처음부터 갖고 있고 값이 0이다.
    /// </summary>
    public class FinishItem
    {
        public readonly string Key;
        public readonly string Name;
        public readonly FinishKind Kind;
        public readonly int Value;     // 원작 '냥' 가격(참고용).
        public readonly int FruitCost; // 실제 구매가(과일 개수) — 기본 한 벌은 0.

        public FinishItem(string key, string name, FinishKind kind, int value)
        {
            Key = key;
            Name = name;
            Kind = kind;
            Value = value;
            FruitCost = value <= 0 ? 0 : System.Math.Max(1, (int)System.Math.Round(value / 100.0));
        }
    }

    public static class ForestFinishData
    {
        public const string DefaultWallKey = "earth";
        public const string DefaultFloorKey = "wood";

        // 웹판 WALLS 순서 그대로(가격 오름차순, 기본 흙벽 제외 색 정보는 안 옮김 — GLB/셰이더 없음).
        public static readonly FinishItem[] Walls =
        {
            new FinishItem("earth", "흙벽",   FinishKind.Wall, 0),
            new FinishItem("hanji", "한지벽", FinishKind.Wall, 2000),
            new FinishItem("muk",   "먹빛벽", FinishKind.Wall, 3200),
            new FinishItem("sol",   "솔빛벽", FinishKind.Wall, 3800),
            new FinishItem("dan",   "단청벽", FinishKind.Wall, 5200),
        };

        // 웹판 FLOORS 순서 그대로.
        public static readonly FinishItem[] Floors =
        {
            new FinishItem("wood",    "마루",   FinishKind.Floor, 0),
            new FinishItem("mat",     "돗자리", FinishKind.Floor, 1800),
            new FinishItem("jangpan", "장판",   FinishKind.Floor, 2200),
            new FinishItem("stone",   "박석",   FinishKind.Floor, 3400),
            new FinishItem("ondol",   "구들장", FinishKind.Floor, 4200),
        };

        public static FinishItem[] CatalogOf(FinishKind kind) => kind == FinishKind.Wall ? Walls : Floors;

        public static FinishItem Get(FinishKind kind, string key)
        {
            foreach (var item in CatalogOf(kind)) if (item.Key == key) return item;
            return null;
        }

        public static string DefaultKeyOf(FinishKind kind) => kind == FinishKind.Wall ? DefaultWallKey : DefaultFloorKey;
    }
}
