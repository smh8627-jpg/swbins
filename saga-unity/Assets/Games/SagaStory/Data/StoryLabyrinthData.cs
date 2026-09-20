namespace Saga.Story.Data
{
    /// <summary>
    /// PLAN.md 101-2 STORY "5-3 비경" — 웹판 saga-story/PLAN.md §5-3(경로
    /// 선택 미니던전+진입 축복 3택+기억 조각, 웹 자신은 아직 미착수)을
    /// saga-godot STORY(`story_labyrinth.gd`, HISTORY 2026-09-18 실기
    /// 승인)의 재해석을 이어 옮긴다. 클래스 주석은 실행 흐름 전체를 다루는
    /// `StoryLabyrinthRunner.cs`가 정본 — 여기는 순수 데이터만.
    ///
    /// **재해석 — 축복.** 원안 "도감 인물의 서명 효과를 빌려 쓴다"는 이
    /// 트랙에 인물 로스터 자체가 없어(`StoryCombat.cs` StartAtk 주석 —
    /// 웹판도 "인물 미선택 대체값"으로 시작) godot과 같은 결로 이 판에
    /// 실제 있는 채널(공격/방어/유틸 3축, 9종)로 다시 짰다. "방어"축은
    /// 이 트랙 플레이어가 피격당하지 않아(`StoryCombat.cs` StartHp 주석)
    /// 실제 방어가 없어, 이 비경의 진짜 위협인 "노드 제한시간"에 거는
    /// 안전축으로 재구성했다. godot은 3택을 뽑은 뒤 축 중복을 검사하지만,
    /// 이 포트는 **축마다 하나씩 뽑는 구조**로 짜서 애초에 중복이 생길 수
    /// 없다(진단 "3택 축 중복 0"이 구조적으로 항상 참).
    /// </summary>
    public static class StoryLabyrinthData
    {
        public enum BlessingAxis { Attack, Defense, Utility }

        public struct Blessing
        {
            public string Key;
            public BlessingAxis Axis;
            public string Name;
            public string Description;
        }

        // 공격축 — StoryPlayerController.CurrentAtk/StoryCombat.RollDamage
        // 크리티컬/무예 쿨다운, 실제 딜링 채널 셋.
        public static readonly Blessing[] AttackBlessings =
        {
            new Blessing { Key = "atk_power", Axis = BlessingAxis.Attack, Name = "예기(銳氣)", Description = "공격력 +25%" },
            new Blessing { Key = "atk_crit", Axis = BlessingAxis.Attack, Name = "회심(會心)", Description = "치명타 확률 +10%p" },
            new Blessing { Key = "atk_haste", Axis = BlessingAxis.Attack, Name = "쾌속(快速)", Description = "무예 재사용 대기 -20%" },
        };

        // 방어축 — 위 클래스 주석 "재해석" 참고. 이 비경의 진짜 위협인
        // 노드 제한시간 쪽 안전판으로 재구성했다.
        public static readonly Blessing[] DefenseBlessings =
        {
            new Blessing { Key = "time_margin", Axis = BlessingAxis.Defense, Name = "여유(餘裕)", Description = "노드 제한시간 +25%" },
            new Blessing { Key = "extra_life", Axis = BlessingAxis.Defense, Name = "재기(再起)", Description = "이번 회차 첫 실패 1회 무효(태세 정비)" },
            new Blessing { Key = "mp_shield", Axis = BlessingAxis.Defense, Name = "충전(充電)", Description = "전투 노드 진입 시 기력 전부 회복" },
        };

        // 유틸축.
        public static readonly Blessing[] UtilityBlessings =
        {
            new Blessing { Key = "move_speed", Axis = BlessingAxis.Utility, Name = "경신(輕身)", Description = "이동속도 +20%" },
            new Blessing { Key = "mp_regen", Axis = BlessingAxis.Utility, Name = "운기(運氣)", Description = "기력 재생 +30%" },
            new Blessing { Key = "memory_bonus", Axis = BlessingAxis.Utility, Name = "각인(刻印)", Description = "이번 회차 기억 조각 획득 +50%" },
        };

        public static readonly Blessing[][] AxisPools = { AttackBlessings, DefenseBlessings, UtilityBlessings };

        public enum NodeType { Combat, Elite, Treasure, Rest, Event, Boss }

        // 1~4층 노드 풀 — 층마다 2~3개 중 하나 선택(5층은 호출부가 Boss
        // 하나로 고정해서 다룬다, 이 풀엔 안 넣는다). godot NODE POOL과
        // 같은 다섯 가지(전투·정예·보물·휴식·사건).
        private static readonly NodeType[] FloorPool =
        {
            NodeType.Combat, NodeType.Elite, NodeType.Treasure, NodeType.Rest, NodeType.Event,
        };

        /// <summary>층별 노드 후보를 시드 고정 RNG로 뽑는다 — 같은 seed면
        /// 항상 같은 지도(진단 "씨앗 고정 시 지도 동일"). 5층(보스)은 이
        /// 함수가 안 다뤄 floorCount는 항상 4.</summary>
        public static NodeType[][] GenerateFloors(int seed, int floorCount = 4)
        {
            var rng = new System.Random(seed);
            var floors = new NodeType[floorCount][];
            for (int i = 0; i < floorCount; i++)
            {
                int count = rng.Next(0, 2) == 0 ? 2 : 3;
                var picks = new NodeType[count];
                for (int j = 0; j < count; j++) picks[j] = FloorPool[rng.Next(FloorPool.Length)];
                floors[i] = picks;
            }
            return floors;
        }

        public struct WeeklyVariant
        {
            public string Key;
            public string Name;
            public float EnemyHpMul;
            public float RewardMul;
        }

        // 주간 변형자 — godot "적 체력 +30%·보상 +50% 등" 그대로 두 값,
        // 이 포트는 종류만 셋으로 좁힌다(주 index 결정적 선택,
        // StoryLabyrinthState.CurrentWeeklyVariant 참고).
        public static readonly WeeklyVariant[] WeeklyVariants =
        {
            new WeeklyVariant { Key = "none", Name = "평온(平穩)", EnemyHpMul = 1f, RewardMul = 1f },
            new WeeklyVariant { Key = "tough", Name = "강적(强敵)", EnemyHpMul = 1.3f, RewardMul = 1.5f },
            new WeeklyVariant { Key = "swift", Name = "속전(速戰)", EnemyHpMul = 1f, RewardMul = 1.2f },
        };

        // 영구 강화(기억 조각) — **재해석**: 원안 "최대 HP +2%×10단"은 이
        // 트랙에 적용 축이 없어(`StoryJobTrainer.cs` "체력 상한이 어디에도
        // 안 쓰인다" 주석) 실제로 쓰이는 채널인 공격력에 얹는다.
        public const int MemoryTierMax = 10;
        public const float MemoryAtkBonusPerTier = StoryCombat.StartAtk * 0.02f; // +2%×10단.

        public static int MemoryUpgradeCost(int nextTier) => nextTier; // 1,2,3...10개(누적 55, 단순 증가).
    }
}
