namespace Saga.Dungeon.Data
{
    /// <summary>
    /// PLAN.md 101-2 5.3 "부적(符籍) 던전 — 나이트메어 티어와 변형자". 웹판
    /// §5.3(`saga-web/saga-dungeon/PLAN.md` 155행, 2026-09-18 기준 미착수)은
    /// "굴혈 앞에서 티어 1~10 + 변형자 2~3개를 골라 들어가는" 소모품형
    /// 선택지 던전을 전제한다 — 부적 인벤토리(상한 20)·드랍 확률·티어 선택
    /// UI까지 통째로 새 메타 시스템이 필요하다. 이 트랙엔 그 전제 셋 다
    /// 없다: 가방이 없고(`HeroState`엔 장비 슬롯 하나뿐), "굴혈 앞 선택" 할
    /// 허브 자체가 없다(편도 절차적 진행, `DungeonFloorRunner`) — 그래서
    /// "선택해서 들어가는 소모품 던전"이 아니라 **"층 10 이후 보스층마다
    /// 자동으로 걸리는 변형자"**로 좁혀 재해석했다. 변형자는 뽑기가 아니라
    /// 층 번호 자체로 결정된다(웹판 진단 문안 "변형자는 부적 id로
    /// 결정적이다"의 뜻 그대로 — 여기선 부적 id 대신 floor가 그 역할).
    ///
    /// 변형자 풀도 웹판 9개(이동속도·원소저항·정예2배·보물·시간제한·소환·
    /// 어둠·재생·유리대포)에서 **정예 폭증·유리대포 둘로 좁혔다** — 이
    /// 트랙엔 원소 시스템·시야 시스템이 없어 그 항목들은 걸 게 없다. 둘 다
    /// 숫자 배율 하나로 표현되고(<see cref="EnemyHpMultiplier"/>·
    /// <see cref="PlayerDamageMultiplier"/>) 기존 스탯 배율 적용 지점
    /// (`HeroState.HitDamage`·`World/DungeonFloorRunner.cs` 적 스폰)에
    /// 그대로 얹을 수 있어, 5.1(축복)처럼 새 시스템 없이 붙는다.
    /// </summary>
    public static class SigilState
    {
        public const int MinFloor = 10; // 웹판 "층 10+".

        public enum Mod { EliteSurge, GlassCannon }

        private const float EliteSurgeHpMultiplier = 2f;   // 웹판 "정예 2배" 그대로.
        private const float GlassCannonMultiplier = 1.5f;  // 웹판 "유리대포(피해 ±50%)" — 주고받는 피해 둘 다.

        /// <summary>층 10 이후 보스층(3의 배수)마다 항상 걸린다 — 웹판의
        /// "뽑기 확률"을 없애고 매번 확실히 변화를 주는 쪽을 택했다(선택
        /// UI가 없어 "안 뽑힘"이면 그 세션은 그냥 밋밋해지기 때문).</summary>
        public static bool IsSigilFloor(int floor) => floor >= MinFloor && DungeonFormulas.IsBossFloor(floor);

        /// <summary>층 번호로만 결정되는 순수 함수 — 같은 층은 세션이 몇 번
        /// 다시 열려도 항상 같은 변형자다(웹판 결정성 요구사항 그대로).</summary>
        public static Mod ModOf(int floor) => (floor / 3) % 2 == 0 ? Mod.EliteSurge : Mod.GlassCannon;

        public static float EnemyHpMultiplier(int floor) =>
            IsSigilFloor(floor) && ModOf(floor) == Mod.EliteSurge ? EliteSurgeHpMultiplier : 1f;

        /// <summary>유리대포 층에서 적이 주는 피해 배율 — <see cref="PlayerDamageMultiplier"/>와
        /// 같은 값(서로 배율, "유리대포"라는 이름의 핵심).</summary>
        public static float EnemyDamageMultiplier(int floor) =>
            IsSigilFloor(floor) && ModOf(floor) == Mod.GlassCannon ? GlassCannonMultiplier : 1f;

        /// <summary>`HeroState.HitDamage`가 곱한다 — 유리대포 층에서 플레이어도 더 세게 때린다.</summary>
        public static float PlayerDamageMultiplier(int floor) => EnemyDamageMultiplier(floor);

        /// <summary>부적 층을 클리어(다음 층으로 내려감)하면 주는 보상 — 웹판
        /// "보상 배율 1+0.25×T"를 새 상수 없이 두목 보상(`DungeonFormulas.RewardGold`)을
        /// 통째로 한 번 더 얹는 것으로 대신했다(사실상 그 층 두목 보상 2배).</summary>
        public static int ClearBonusGold(int floor) => IsSigilFloor(floor) ? DungeonFormulas.RewardGold(floor, true) : 0;

        public static string Label(Mod mod) => mod switch
        {
            Mod.EliteSurge => "정예 폭증(적 HP ×2)",
            Mod.GlassCannon => "유리대포(주고받는 피해 ×1.5)",
            _ => mod.ToString(),
        };
    }
}
