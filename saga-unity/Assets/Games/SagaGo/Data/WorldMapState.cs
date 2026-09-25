using System;
using System.Collections.Generic;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 107-3 — 활성화한 순간이동 지점·발 디딘 지역·망루로 지도를 밝혔는지. 세이브 v14
    /// `waypoints`·`regionsVisited`·`mapRevealed`. `Restore` 도 `Changed` 를 쏜다(돌기둥 빛·지도 화면이 안 낡게).
    /// </summary>
    public static class WorldMapState
    {
        private static readonly HashSet<string> _waypoints = new HashSet<string>();
        private static readonly HashSet<string> _regions = new HashSet<string>();
        private static readonly HashSet<string> _peaks = new HashSet<string>(); // 109-9 오른 정상(세이브 v18 peaksFound)

        public static bool Revealed { get; private set; }
        public static event Action Changed;

        public static bool IsActive(string waypointId) => _waypoints.Contains(waypointId);
        public static bool IsVisited(string regionId) => Revealed || _regions.Contains(regionId);
        public static bool HasStepped(string regionId) => _regions.Contains(regionId);
        public static int ActiveCount => _waypoints.Count;

        /// <summary>처음 활성화면 true.</summary>
        public static bool Activate(string waypointId)
        {
            if (!_waypoints.Add(waypointId)) return false;
            Changed?.Invoke();
            return true;
        }

        /// <summary>처음 발 디딘 지역이면 true.</summary>
        public static bool Visit(string regionId)
        {
            if (!_regions.Add(regionId)) return false;
            Changed?.Invoke();
            return true;
        }

        /// <summary>망루 꼭대기 — 처음이면 true.</summary>
        public static bool RevealAll()
        {
            if (Revealed) return false;
            Revealed = true;
            Changed?.Invoke();
            return true;
        }

        public static bool IsPeakFound(string peakId) => _peaks.Contains(peakId);
        public static int PeakCount => _peaks.Count;

        /// <summary>109-9 — 처음 오른 정상이면 true.</summary>
        public static bool FindPeak(string peakId)
        {
            if (!_peaks.Add(peakId)) return false;
            Changed?.Invoke();
            return true;
        }

        public static List<string> SnapshotPeaks() => new List<string>(_peaks);

        public static void RestorePeaks(IEnumerable<string> peaks)
        {
            _peaks.Clear();
            if (peaks != null) foreach (var p in peaks) _peaks.Add(p);
            Changed?.Invoke();
        }

        public static List<string> SnapshotWaypoints() => new List<string>(_waypoints);
        public static List<string> SnapshotRegions() => new List<string>(_regions);

        public static void Restore(IEnumerable<string> waypoints, IEnumerable<string> regions, bool revealed)
        {
            _waypoints.Clear();
            _regions.Clear();
            if (waypoints != null) foreach (var w in waypoints) _waypoints.Add(w);
            if (regions != null) foreach (var r in regions) _regions.Add(r);
            Revealed = revealed;
            Changed?.Invoke();
        }
    }
}
