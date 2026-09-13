using System.Collections.Generic;

namespace Saga.Forest.Data
{
    /// <summary>
    /// FOREST "집 꾸미기(가구)" 슬라이스(2026-09-12) — `DungeonBestiaryState`/
    /// `HeroState`와 같은 결의 정적 상태 클래스. 창고(구매한 가구, 아직 안 놓은
    /// 것)와 여섯 개 고정 자리(`World/ForestFurnitureAnchor.cs`)에 놓인 것을
    /// 나눠 관리한다.
    ///
    /// **원작(웹판 `home.js`)과 다른 점 — 자유 배치가 아니라 고정 자리 여섯.**
    /// 웹판은 "선 자리에 놓는다"(임의 좌표)지만, 이 프로젝트의 FOREST 트랙은
    /// 아직 상호작용 입력 자체가 없다(이동 뿐, 공격 버튼도 없는 GO판 컨트롤러
    /// 재사용) — 새 "놓기" 버튼을 만드는 대신, 이 트랙의 기존 관례(나무·주민·
    /// 집 문처럼 "가까이 다가가면 반응")를 그대로 따라 여섯 개 고정 자리를
    /// 두고 다가가면 놓거나 거둔다. 자유 배치·격자 판정은 다음 슬라이스 후보.
    /// </summary>
    public static class ForestHomeState
    {
        public const int AnchorCount = 6;

        private static readonly Dictionary<string, int> Stock = new Dictionary<string, int>();
        private static readonly string[] Anchors = new string[AnchorCount];

        // FOREST 다음 조각 — 벽지/장판(ForestFinishData.cs 클래스 주석
        // 참고). 기본 한 벌(흙벽·마루)은 처음부터 갖고 입은 채 시작한다.
        private static readonly HashSet<string> _ownedWalls = new HashSet<string> { ForestFinishData.DefaultWallKey };
        private static readonly HashSet<string> _ownedFloors = new HashSet<string> { ForestFinishData.DefaultFloorKey };
        private static string _currentWall = ForestFinishData.DefaultWallKey;
        private static string _currentFloor = ForestFinishData.DefaultFloorKey;

        public static int StockCount(string id) => id != null && Stock.TryGetValue(id, out var n) ? n : 0;

        public static string AnchorItem(int index) => (index >= 0 && index < AnchorCount) ? Anchors[index] : null;

        /// <summary>과일로 산다 — 모자라면 false(창고 안 늘어남).</summary>
        public static bool TryBuy(string id)
        {
            var item = FurnitureItem.Get(id);
            if (item == null) return false;
            if (!ForestState.SpendFruit(item.FruitCost)) return false;
            Stock[id] = StockCount(id) + 1;
            return true;
        }

        /// <summary>그 자리가 비어 있으면 창고에서 가장 값진 것부터 하나 놓는다
        /// (원작의 "선 자리에 놓는다"를 "어느 자리든 다가가면 창고에서 하나"로
        /// 단순화한 것 — 항목을 고르는 UI가 없어서). 놓인 품목 id를 돌려준다
        /// (null이면 실패 — 이미 있거나 창고가 빔).</summary>
        public static string TryPlaceAny(int index)
        {
            if (index < 0 || index >= AnchorCount) return null;
            if (!string.IsNullOrEmpty(Anchors[index])) return null;

            string best = null;
            int bestValue = -1;
            foreach (var item in FurnitureItem.Catalog)
            {
                if (StockCount(item.Id) <= 0) continue;
                if (item.Value > bestValue) { bestValue = item.Value; best = item.Id; }
            }
            if (best == null) return null;

            Stock[best] -= 1;
            Anchors[index] = best;
            return best;
        }

        /// <summary>그 자리에 놓인 걸 창고로 되거둔다. 거둔 품목 id(없으면 null).</summary>
        public static string PickUp(int index)
        {
            if (index < 0 || index >= AnchorCount) return null;
            string id = Anchors[index];
            if (string.IsNullOrEmpty(id)) return null;

            Anchors[index] = null;
            Stock[id] = StockCount(id) + 1;
            return id;
        }

        // ── 벽지/장판 ────────────────────────────────────────
        public static string CurrentWall => _currentWall;
        public static string CurrentFloor => _currentFloor;
        public static bool OwnsFinish(FinishKind kind, string key) =>
            (kind == FinishKind.Wall ? _ownedWalls : _ownedFloors).Contains(key);

        /// <summary>과일로 사서 바로 입는다 — 이 슬라이스엔 "갈아입기" UI가
        /// 없어(가구 자리처럼 다가가면 반응하는 것뿐) 구매=착용으로 합쳤다.
        /// 이미 가진 것이면 돈 안 내고 그냥 새로 입기만 한다.</summary>
        public static bool TryBuyAndEquipFinish(FinishKind kind, string key)
        {
            var item = ForestFinishData.Get(kind, key);
            if (item == null) return false;
            var owned = kind == FinishKind.Wall ? _ownedWalls : _ownedFloors;
            if (!owned.Contains(key))
            {
                if (!ForestState.SpendFruit(item.FruitCost)) return false;
                owned.Add(key);
            }
            if (kind == FinishKind.Wall) _currentWall = key; else _currentFloor = key;
            return true;
        }

        /// <summary>웹판 `home.js score()` 그대로 — 값/50 + 개수×2 + 계열 보너스
        /// (3개 이상 +25, 5개 이상 +45) + 벽지/장판 보너스(기본이 아니면
        /// 각 +12, 원작 그대로). 원작의 tier(증축) 보너스는 이 슬라이스엔
        /// 증축 시스템 자체가 없어 여전히 뺐다.</summary>
        public static (int Total, int Count, int Bonus, int Finish) Score()
        {
            float sum = 0f;
            int count = 0;
            var sets = new Dictionary<FurnitureSet, int>();

            foreach (var id in Anchors)
            {
                if (string.IsNullOrEmpty(id)) continue;
                var item = FurnitureItem.Get(id);
                if (item == null) continue;
                sum += item.Value / 50f;
                count++;
                sets[item.Set] = sets.TryGetValue(item.Set, out var n) ? n + 1 : 1;
            }
            sum += count * 2;

            int bonus = 0;
            foreach (var kv in sets)
            {
                if (kv.Value >= 5) bonus += 45;
                else if (kv.Value >= 3) bonus += 25;
            }
            sum += bonus;

            int finish = 0;
            if (_currentWall != ForestFinishData.DefaultWallKey) finish += 12;
            if (_currentFloor != ForestFinishData.DefaultFloorKey) finish += 12;
            sum += finish;

            return ((int)System.Math.Round(sum), count, bonus, finish);
        }

        public static (string[] Keys, int[] Counts) SnapshotStock()
        {
            var keys = new string[Stock.Count];
            var counts = new int[Stock.Count];
            int i = 0;
            foreach (var kv in Stock)
            {
                keys[i] = kv.Key;
                counts[i] = kv.Value;
                i++;
            }
            return (keys, counts);
        }

        public static void RestoreStock(string[] keys, int[] counts)
        {
            Stock.Clear();
            if (keys == null || counts == null) return;
            for (int i = 0; i < keys.Length && i < counts.Length; i++)
            {
                if (!string.IsNullOrEmpty(keys[i])) Stock[keys[i]] = counts[i];
            }
        }

        public static string[] SnapshotAnchors() => (string[])Anchors.Clone();

        public static void RestoreAnchors(string[] anchors)
        {
            for (int i = 0; i < AnchorCount; i++)
            {
                Anchors[i] = (anchors != null && i < anchors.Length) ? anchors[i] : null;
            }
        }

        public static (string[] Walls, string[] Floors, string CurWall, string CurFloor) SnapshotFinishes()
        {
            var walls = new string[_ownedWalls.Count];
            _ownedWalls.CopyTo(walls);
            var floors = new string[_ownedFloors.Count];
            _ownedFloors.CopyTo(floors);
            return (walls, floors, _currentWall, _currentFloor);
        }

        public static void RestoreFinishes(string[] ownedWalls, string[] ownedFloors, string curWall, string curFloor)
        {
            _ownedWalls.Clear();
            _ownedWalls.Add(ForestFinishData.DefaultWallKey);
            if (ownedWalls != null) foreach (var k in ownedWalls) if (!string.IsNullOrEmpty(k)) _ownedWalls.Add(k);

            _ownedFloors.Clear();
            _ownedFloors.Add(ForestFinishData.DefaultFloorKey);
            if (ownedFloors != null) foreach (var k in ownedFloors) if (!string.IsNullOrEmpty(k)) _ownedFloors.Add(k);

            _currentWall = !string.IsNullOrEmpty(curWall) ? curWall : ForestFinishData.DefaultWallKey;
            _currentFloor = !string.IsNullOrEmpty(curFloor) ? curFloor : ForestFinishData.DefaultFloorKey;
        }
    }
}
