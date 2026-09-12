namespace Saga.Forest.Data
{
    /// <summary>
    /// VERTICAL_SLICE_FOREST.md(saga-godot) 4절 "결정 — 포함" — 이 첫
    /// 슬라이스는 전투·성장·경제가 전혀 없다(GO/DUNGEON의 HeroState/
    /// PlayerStats에 대응하는 것 없음). "걷는다 → 채집한다 → 나눈다"
    /// 핵심 루프 중 지금 숫자로 남길 값은 채집한 과일 개수뿐이라 이
    /// 한 줄짜리 정적 클래스로 충분하다.
    /// </summary>
    public static class ForestState
    {
        public static int FruitCount { get; private set; }

        public static void AddFruit(int amount)
        {
            if (amount > 0) FruitCount += amount;
        }

        public static void Restore(int fruitCount)
        {
            FruitCount = fruitCount < 0 ? 0 : fruitCount;
        }
    }
}
