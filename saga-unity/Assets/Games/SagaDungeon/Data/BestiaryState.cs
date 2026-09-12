using System.Collections.Generic;

namespace Saga.Dungeon.Data
{
    /// <summary>
    /// VERTICAL_SLICE_DUNGEON.md 다음 슬라이스 "세공·행상 재고 굴리기·도감" —
    /// 웹판 PLAN 34절 "도감을 콘텐츠 수집 시스템으로"(js/dungeon.js:2609)는
    /// 포획한 몬스터를 saga-go와 공유하는 펫 도감(PD)에 등록하는 큰
    /// 시스템이다(포획·펫 장착까지 포함). DUNGEON엔 아직 펫 장착 자체가
    /// 없어 그 전체를 옮기지 않고, "만난 몬스터 종류를 기록해 둔다"는
    /// 핵심만 가장 작은 단위로 남겼다 — `DungeonEnemy.Die()`가 처치할
    /// 때마다 표시 이름을 기록하고, 처음 보는 이름이면 그 사실을 토스트에
    /// 덧붙인다(새 UI 화면 없음 — `DungeonTrove.cs`·`DungeonShrine.cs`가
    /// 이미 쓴 "화면 대신 토스트" 원칙과 같은 결).
    /// </summary>
    public static class BestiaryState
    {
        private static readonly HashSet<string> Discovered = new HashSet<string>();

        public static int Count => Discovered.Count;

        /// <summary>처음 보는 이름이면 true(도감에 새로 기록됨).</summary>
        public static bool Record(string displayName)
        {
            if (string.IsNullOrEmpty(displayName)) return false;
            return Discovered.Add(displayName);
        }

        public static bool IsDiscovered(string displayName) => Discovered.Contains(displayName);

        public static string[] Snapshot()
        {
            var arr = new string[Discovered.Count];
            Discovered.CopyTo(arr);
            return arr;
        }

        public static void Restore(string[] names)
        {
            Discovered.Clear();
            if (names == null) return;
            foreach (var n in names)
            {
                if (!string.IsNullOrEmpty(n)) Discovered.Add(n);
            }
        }
    }
}
