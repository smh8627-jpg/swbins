using UnityEngine;

namespace Saga.Dungeon.Data
{
    /// <summary>
    /// PLAN.md 101-2 5.7 DUNGEON "시대 퓨전 — 현대·미래 인물 30·미래 무기
    /// look·시대 혼재 건물"(`saga-web/saga-dungeon/PLAN.md` 191행). 웹판
    /// "인물 30"(현대·근미래 인물, `data-hero-ext.js`)은 이 트랙에 인물
    /// 로스터 자체가 없어(단일 주인공 `HeroState`, GO의 `PartyState` 같은
    /// 등용 시스템 없음) 옮길 대상이 없다 — 스코프에서 뺐다. "시대 혼재
    /// 건물"도 절차적 층(`World/DungeonFloorRunner.cs`)이 바이옴 데코
    /// 후크(`World/DungeonRoomBuilder.BuildDecor()`)를 안 써(그건 손빚은
    /// Room1~4 전용) 마찬가지로 뺐다. 실제로 옮긴 건 **미래 무기 look 2**
    /// (`Data/ItemData.cs`의 <see cref="ItemData.WeaponShape.Lance"/>·
    /// <see cref="ItemData.WeaponShape.Gauntlet"/>)와 **기계화 변종** —
    /// 원안 "짐승형 파생 규칙"이 이 트랙엔 없어(짐승형 몬스터 자체가
    /// 없음) 대신 절차적 정예(<see cref="World.DungeonFloorRunner.SpawnElite"/>)를
    /// 깊은 층부터 이 변종으로 바꿔치기했다("emp 저항"은 이 트랙에 EMP
    /// 메커닉이 없어 순수 표시·보상 변형뿐).
    /// </summary>
    public static class EraFusionData
    {
        // Room1~4(손빚 "층1")를 지나 절차적 진행이 한동안 무르익은 뒤 —
        // 웹판 "Phase 5, 루프 위에 얹는 살" 결을 그대로 따라 후반 층으로 미룸.
        public const int FusionFloorThreshold = 5;

        public static readonly Color FusionBodyColor = new Color(0.55f, 0.62f, 0.68f); // 금속 팔레트.

        public static bool IsFusionFloor(int floor) => floor >= FusionFloorThreshold;

        /// <summary>층 홀짝으로 두 미래 무기를 번갈아 준다 — 별도 룰렛 없이 결정적.</summary>
        public static string FusionRewardItemId(int floor) => floor % 2 == 0 ? "wp_lance_e" : "wp_gauntlet";
    }
}
