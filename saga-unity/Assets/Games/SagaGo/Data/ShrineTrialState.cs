using System;
using UnityEngine;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 101-2 GO ② "사당 시련" — 웹판 §5②(`saga-web/saga-go/PLAN.md`
    /// 132행, 3분 방·파도 3·하루 3회) 수치를 이 트랙 실전투(DuelRules)에
    /// 맞춰 재해석한다. 27권역·105명 인물 풀이 없어 입구 하나로 좁히고,
    /// 클리어 보상도 "그 권역 인물 조우"(동료) 대신 "인장 조각" 수집(3개 =
    /// 인장 1)으로 재해석했다 — 영구 배율 대신 DailyTaskState.StampsPerReward와
    /// 같은 결의 일회성 이정표 보상(경험치·돈)을 인장 완성마다 준다. 경위는
    /// docs/HISTORY.md 2026-09-20 "GO② 사당 시련 설계 뒤 중단" 절 참고.
    /// </summary>
    public static class ShrineTrialState
    {
        public const int DailyLimit = 3; // 웹판 "하루 3회" 그대로.
        public const int ShardsPerStamp = 3; // 웹판 "인장 조각 3개 = 인장 1" 그대로.
        public const double LockWindowSec = 600.0; // 웹판 "재입장 10분" 그대로 — DropState와 같은 결로 DateTime.Now.Ticks 기준.

        private static string _date = "";
        private static int _dailyCount;
        private static int _shards;
        private static int _stamps;
        private static long _lockUntilTicks;

        public static int Shards => _shards;
        public static int Stamps => _stamps;

        private static void EnsureToday()
        {
            string today = DateTime.Now.ToString("yyyy-MM-dd");
            if (_date == today) return;
            _date = today;
            _dailyCount = 0;
        }

        public static bool IsLocked => DateTime.Now.Ticks < _lockUntilTicks;

        /// <summary>잠금이 없고 오늘 세 번을 아직 안 채웠으면 true.</summary>
        public static bool CanEnter()
        {
            EnsureToday();
            return !IsLocked && _dailyCount < DailyLimit;
        }

        /// <summary>문을 열고 실제로 시련을 시작할 때(승패와 무관) 하루 카운트를 채운다.</summary>
        public static void ReportEntry()
        {
            EnsureToday();
            _dailyCount++;
        }

        /// <summary>파도 3을 전부 돌파(클리어) 1회 — 조각 하나. 인장이 새로 찼으면 true(이정표 보상 지급 신호).</summary>
        public static bool ReportClear()
        {
            _shards++;
            if (_shards % ShardsPerStamp != 0) return false;
            _stamps++;
            return true;
        }

        /// <summary>실패(시간 초과·기세 소진) 시 10분 재입장 잠금을 건다.</summary>
        public static void ReportFailLock()
        {
            _lockUntilTicks = DateTime.Now.AddSeconds(LockWindowSec).Ticks;
        }

        // ---- 저장/복원 (SaveState.cs 전용) ----

        public static string SnapshotDate() => _date;
        public static int SnapshotDailyCount() => _dailyCount;
        public static int SnapshotShards() => _shards;
        public static int SnapshotStamps() => _stamps;
        public static long SnapshotLockUntilTicks() => _lockUntilTicks;

        public static void Restore(string date, int dailyCount, int shards, int stamps, long lockUntilTicks)
        {
            _date = date ?? "";
            _dailyCount = Mathf.Max(0, dailyCount);
            _shards = Mathf.Max(0, shards);
            _stamps = Mathf.Max(0, stamps);
            _lockUntilTicks = lockUntilTicks;
        }
    }
}
