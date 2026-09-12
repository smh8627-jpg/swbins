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

        /// <summary>웹판 `home.js score()` 그대로 — 값/50 + 개수×2 + 계열 보너스
        /// (3개 이상 +25, 5개 이상 +45). 원작의 tier 보너스·벽지장판 보너스는
        /// 이 슬라이스엔 그 두 시스템 자체가 없어 뺐다.</summary>
        public static (int Total, int Count, int Bonus) Score()
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

            return ((int)System.Math.Round(sum), count, bonus);
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
    }
}
