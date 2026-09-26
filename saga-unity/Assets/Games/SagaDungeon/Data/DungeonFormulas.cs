using System;
using System.Collections.Generic;

namespace Saga.Dungeon.Data
{
    /// <summary>
    /// "DUNGEON 오픈월드 확장 — 절차적 층 진행" 슬라이스 — 사용자가 "100층까지
    /// 진행해줘"로 요청해, Room5~11처럼 층마다 방을 편집기 스크립트로 손으로
    /// 이어 붙이는 방식(물리적 확장)을 접고 saga-dungeon 웹판 `js/dungeon.js`
    /// 의 실제 공식을 그대로 옮겨 런타임에 계산한다. UnityEngine 의존이 없는
    /// 순수 C#이라 `Editor/SimulateDungeonFloors.cs`가 씬 없이도 그대로
    /// 재사용해 100층까지 미리 계산 검증할 수 있다.
    /// </summary>
    public static class DungeonFormulas
    {
        /// <summary>dungeon.js:149 — enemyHp(floor, boss).</summary>
        public static float EnemyHp(int floor, bool boss) =>
            (float)Math.Round(24.0 * Math.Pow(1.26, floor - 1) * (boss ? 7.0 : 1.0));

        /// <summary>dungeon.js:152 — enemyDmg(floor, boss).</summary>
        public static float EnemyDmg(int floor, bool boss) =>
            (float)Math.Round(5.0 * Math.Pow(1.20, floor - 1) * (boss ? 2.2 : 1.0));

        /// <summary>dungeon.js:101 — roomsFor(floor). 층마다 방 개수(4~9).</summary>
        public static int RoomsFor(int floor) => 4 + Math.Min(5, floor / 3);

        /// <summary>dungeon.js:102 — isBossFloor(floor). 3의 배수 층만 진짜 보스.</summary>
        public static bool IsBossFloor(int floor) => floor % 3 == 0;

        /// <summary>HeroState.AddExp/AddGold가 `int`를 받아(`Data/HeroState.cs`)
        /// 100층 근처(약 78층)에서 `(int)` 캐스트가 오버플로해 음수로 뒤집히는
        /// 걸 `SimulateDungeonFloors`가 실제로 잡아냈다 — int 자체를 long으로
        /// 바꾸는 건 SaveState·PlayerHud 등 저장/표시 스택 전체를 건드리는
        /// 큰 손질이라, 이 계산 단계에서 int.MaxValue로 미리 눌러 두는 쪽을
        /// 택했다(어차피 이 깊이의 숫자는 실제로 의미 있는 밸런스가 아니라
        /// "100층까지 공식이 안 깨지는가"를 확인하는 스트레스 테스트다).</summary>
        private static int ClampToInt(double value) => (int)Math.Min(Math.Max(value, 0.0), int.MaxValue);

        /// <summary>일반 잡졸 보상 — 층1 잡졸(exp20·gold8) 기준 hp 성장률(1.26)에
        /// 맞춰 반올림(Room5~11 슬라이스가 이미 쓴 "약 1.25배" 관례를 공식화).</summary>
        public static int RewardExp(int floor, bool boss) =>
            ClampToInt(20.0 * Math.Pow(1.25, floor - 1) * (boss ? 5.0 : 1.0));

        public static int RewardGold(int floor, bool boss) =>
            ClampToInt(8.0 * Math.Pow(1.25, floor - 1) * (boss ? 5.0 : 1.0));

        /// <summary>정예(ELITES 'fierce' 배율, dungeon.js:342-347) — hp×1.35·dmg×1.9.</summary>
        public static float EliteHp(int floor) => (float)Math.Round(EnemyHp(floor, false) * 1.35);
        public static float EliteDmg(int floor) => (float)Math.Round(EnemyDmg(floor, false) * 1.9);
        public static int EliteRewardExp(int floor) => ClampToInt(RewardExp(floor, false) * 1.25);
        public static int EliteRewardGold(int floor) => ClampToInt(RewardGold(floor, false) * 1.25);

        /// <summary>data-dungeon.js:78-94 ROOMS — 문 종류 가중치 룰렛(보스는
        /// 층 끝에서만 강제되므로 후보에서 뺀다, dungeon.js:305-314
        /// pickRoomKind()).</summary>
        public static readonly (string Key, int Weight)[] RoomKinds =
        {
            ("fight", 46), ("trove", 12), ("well", 10), ("shrine", 16),
            ("elite", 10), ("miniboss", 6), ("cave", 8), ("merchant", 7),
            ("puzzle", 6), ("event", 7), ("forage", 8),
        };

        public static string PickRoomKind(Random rng)
        {
            int total = 0;
            foreach (var k in RoomKinds) total += k.Weight;
            int r = rng.Next(total);
            foreach (var k in RoomKinds)
            {
                r -= k.Weight;
                if (r < 0) return k.Key;
            }
            return "fight";
        }

        /// <summary>dungeon.js:508-529 makeDoors() — 문 2~3개, 중복 없이(30번
        /// 재시도 안에서). 보스방을 강제하는 마지막 방은 이 메서드를 안 쓰고
        /// "stair" 하나만 낸다(`DungeonFloorRunner` 참고).</summary>
        public static List<string> PickDoorKinds(Random rng)
        {
            int count = 2 + (rng.NextDouble() < 0.35 ? 1 : 0);
            var seen = new HashSet<string>();
            var result = new List<string>();
            int guard = 0;
            while (result.Count < count && guard < 30)
            {
                guard++;
                string k = PickRoomKind(rng);
                if (seen.Contains(k) && result.Count > 0) continue;
                seen.Add(k);
                result.Add(k);
            }
            return result;
        }

        /// <summary>문 라벨·토스트에 쓰는 한글 표시 이름 — 원작 상표 없는
        /// 순수 설명형 이름(루트 CLAUDE.md 이름 정책).</summary>
        /// <summary>PLAN.md 101-2 5.5 "난입(亂入)" — 웹판 §5.5(`saga-web/saga-dungeon/PLAN.md`
        /// 170행, 2026-09-19 기준 미착수)의 "파도 N 의 적 수는 6+2N, 40을 안 넘는다"
        /// 공식 그대로. <see cref="World.HordeRunner"/>가 이 두 순수 함수만 쓴다 —
        /// `SimulateDungeonFloors.cs`류가 씬 없이도 그대로 검증할 수 있게 여기 둔다.</summary>
        public static int HordeEnemyCount(int wave) => Math.Min(40, 6 + 2 * wave);

        /// <summary>웹판 "티어는 파도/8" — 이 트랙 층 공식(EnemyHp/EnemyDmg 등)의
        /// floor 인자로 그대로 넣는다(최소 1층 취급).</summary>
        public static int HordeTier(int wave) => Math.Max(1, wave / 8);

        /// <summary>PLAN.md 103-1 "DUNGEON 방 셸 — 티어별 마모 3단"(2026-09-22) —
        /// 새 지오메트리 없이 `ProcRoom`(층2~100이 갈아치우며 재사용하는 방 하나,
        /// `DungeonFloorRunner`) 재질 톤만 층이 깊을수록 낡아 보이게 3등분한다.
        /// 100층 스트레스 테스트 범위(`SimulateDungeonFloors.cs`)를 그대로 삼등분 —
        /// 웹판에 대응하는 공식이 없어 이 트랙에서 새로 정한 값.</summary>
        public static int RoomWearTier(int floor) => floor < 34 ? 0 : floor < 67 ? 1 : 2;

        /// <summary>방 표지 글(110 ⑤c-2c-2 — 번역 표 `room.&lt;종류&gt;`, 없으면 한국어).</summary>
        public static string KindDisplayName(string kind) => DungeonLocalization.T("room." + kind, KindDisplayNameKo(kind));

        private static string KindDisplayNameKo(string kind) => kind switch
        {
            "fight" => "잡졸 무리",
            "trove" => "보물상자",
            "well" => "우물",
            "shrine" => "사당",
            "elite" => "정예 소굴",
            "miniboss" => "미니보스",
            "cave" => "채광방",
            "merchant" => "행상",
            "puzzle" => "퍼즐방",
            "event" => "구출",
            "forage" => "채집",
            "boss" => "두목",
            "stair" => "지하로 내려간다",
            _ => kind,
        };
    }
}
