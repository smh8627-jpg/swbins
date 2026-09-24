using System;
using System.Collections.Generic;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 107-8 — 지역마다 무리 토벌 셈과 받은 보상(단마다 한 번). 세이브 v16 `missions`(웹 `save.missions = { 지역키: { clears, paid } }` 결).
    /// `Refresh()` 가 지금 단을 다시 세어 아직 안 받은 보상을 준다 — 불러온 뒤 다시 불러도 두 번 주지 않는다(`paid`).
    /// </summary>
    public static class RegionMissionState
    {
        [Serializable]
        public class Entry
        {
            public string region;
            public int clears;
            /// <summary>비트 1 = 둘째 단 보상, 비트 2 = 평정 보상.</summary>
            public int paid;
        }

        public struct Payout
        {
            public string RegionId;
            public int Stage;
            public int Gold;
            public int Exp;
        }

        private static readonly Dictionary<string, Entry> _entries = new Dictionary<string, Entry>();

        public static event Action Changed;

        public static int ClearsOf(string regionId) => _entries.TryGetValue(regionId, out var e) ? e.clears : 0;
        public static int PaidOf(string regionId) => _entries.TryGetValue(regionId, out var e) ? e.paid : 0;

        public static int StageOf(string regionId)
        {
            int i = GoRegionMission.IndexOf(regionId);
            if (i < 0) return 0;
            var m = GoRegionMission.Missions[i];
            return GoRegionMission.StageOf(GoRegionMission.LandmarkDone(m), ClearsOf(regionId), GoRegionMission.FinalDone(m));
        }

        /// <summary>그 지역 무리 하나를 한꺼번에 다 쓰러뜨렸다. 사명 없는 지역(마을 들판 등)은 안 센다 → false.</summary>
        public static bool AddClear(string regionId)
        {
            if (regionId == null || GoRegionMission.IndexOf(regionId) < 0) return false;
            var e = Get(regionId);
            if (e.clears >= GoRegionMission.ClearsNeeded) return false;
            e.clears++;
            Changed?.Invoke();
            return true;
        }

        /// <summary>단을 다시 세어 아직 안 준 보상을 준다(금·경험치). 준 것만 돌려준다.</summary>
        public static List<Payout> Refresh()
        {
            var list = new List<Payout>();
            foreach (var m in GoRegionMission.Missions)
            {
                int stage = StageOf(m.RegionId);
                if (stage < 2) continue;
                var e = Get(m.RegionId);
                if ((e.paid & 1) == 0)
                {
                    e.paid |= 1;
                    list.Add(Pay(m.RegionId, 2, GoRegionMission.Stage2GoldPerGrade * m.Grade, GoRegionMission.Stage2ExpPerGrade * m.Grade));
                }
                if (stage >= 3 && (e.paid & 2) == 0)
                {
                    e.paid |= 2;
                    list.Add(Pay(m.RegionId, 3, GoRegionMission.FinalGoldPerGrade * m.Grade, GoRegionMission.FinalExpPerGrade * m.Grade));
                }
            }
            if (list.Count > 0) Changed?.Invoke();
            return list;
        }

        private static Payout Pay(string regionId, int stage, int gold, int exp)
        {
            GoldState.Add(gold);
            PlayerStats.AddExp(exp);
            return new Payout { RegionId = regionId, Stage = stage, Gold = gold, Exp = exp };
        }

        private static Entry Get(string regionId)
        {
            if (!_entries.TryGetValue(regionId, out var e))
            {
                e = new Entry { region = regionId };
                _entries[regionId] = e;
            }
            return e;
        }

        public static List<Entry> Snapshot()
        {
            var list = new List<Entry>();
            foreach (var e in _entries.Values)
                if (e.clears > 0 || e.paid != 0) list.Add(new Entry { region = e.region, clears = e.clears, paid = e.paid });
            return list;
        }

        public static void Restore(IEnumerable<Entry> entries)
        {
            _entries.Clear();
            if (entries != null)
                foreach (var e in entries)
                    if (e != null && !string.IsNullOrEmpty(e.region))
                        _entries[e.region] = new Entry { region = e.region, clears = e.clears, paid = e.paid };
            Changed?.Invoke();
        }
    }
}
