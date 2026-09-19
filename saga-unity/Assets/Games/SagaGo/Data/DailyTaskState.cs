using System;
using System.Collections.Generic;
using UnityEngine;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 101-2 ④ "일과판(오늘의 일과)" — 웹판 §5 ④(`saga-web/saga-go/js/daily.js`
    /// 설계, 아직 웹 자체도 실기 확인 대기)의 날짜 해시 일과 풀·도장·주간
    /// 보상을 이 트랙 실제 시스템에 맞춰 재해석한다. 2026-09-19 결정
    /// (PLAN.md 101-2 서두) — saga-godot 트랙이 같은 설계 의도를 실기
    /// 승인까지 받았으니 그걸 검증으로 인정하고, saga-web 문서의 검증
    /// 도장을 더 기다리지 않는다. 다만 UI·조작·수치는 두 트랙 다 베끼지
    /// 않고 각자 재구성한다(코드 공유 없음 원칙).
    ///
    /// 웹판 풀 8(걷기·조우 3·역참 2·사건 2·비석 3·토벌 1·반려 500m·사당 1)
    /// 중 역참·비석·사당·반려는 이 트랙에 아직 없고, 발견형 콘텐츠(숨은
    /// 보물·산신당·동쪽 숲 유물·채집)는 전부 <see cref="WorldEventState"/>·
    /// <see cref="GatherState"/>로 "한 번뿐"이라 반복되는 일과가 못 된다
    /// (자리 수가 유한해 며칠 지나면 채울 수 없게 된다). 그래서 이 트랙
    /// 풀은 실제로 **몇 번이고 다시 할 수 있는** 시스템 넷으로 짰다: 걷기·
    /// 도적 조우 승리(<see cref="World.BanditEncounter"/>)·희귀 늑대 토벌
    /// (<see cref="World.RareWolfEncounter"/>)·성황당 기원
    /// (<see cref="World.LuckyCairn"/>).
    ///
    /// 날짜 문자열(yyyy-MM-dd)을 결정적으로 해싱해 그날의 풀 순서를 섞고
    /// 앞 3개를 뽑는다(웹판 진단 "일과 — 같은 날은 같은 셋(해시)"과 같은
    /// 성질 — <see cref="string.GetHashCode"/>는 프로세스마다 값이 달라질
    /// 수 있어 안 쓰고 직접 해싱한다). 셋 다 채우면 그날의 '일과 도장' 1개,
    /// 도장 7개 = 주간 보상(수치는 웹판 그대로: 일과 3/일 · 도장 7).
    /// </summary>
    public static class DailyTaskState
    {
        public enum Kind { Walk, BanditWin, WolfWin, CairnWish }

        private struct TaskDef
        {
            public Kind Kind;
            public int Target;
            public string Label; // {0}=진행, {1}=목표
        }

        private static readonly TaskDef[] Pool =
        {
            new TaskDef { Kind = Kind.Walk, Target = 800, Label = "걷기 {0}/{1}m" },
            new TaskDef { Kind = Kind.BanditWin, Target = 2, Label = "도적 조우 승리 {0}/{1}" },
            new TaskDef { Kind = Kind.WolfWin, Target = 1, Label = "희귀 늑대 토벌 {0}/{1}" },
            new TaskDef { Kind = Kind.CairnWish, Target = 2, Label = "성황당 기원 {0}/{1}" },
        };

        private const int TasksPerDay = 3;
        public const int StampsPerReward = 7; // 웹판 그대로: 도장 7 = 주간 보상
        private const int WeeklyRewardGold = 100;
        private const int WeeklyRewardExp = 150;

        private static string _date = "";
        private static int[] _selected = Array.Empty<int>();
        private static int[] _progress = Array.Empty<int>();
        private static bool[] _done = Array.Empty<bool>();
        private static bool _dayStampGranted;
        private static int _stamps;

        /// <summary>주간 보상이 실제로 지급된 순간(금·경험치) — UI 토스트 훅용, 안 구독해도 지급 자체는 된다.</summary>
        public static event Action<int, int> WeeklyRewardGranted;

        public static string CurrentDate => _date;
        public static int Stamps => _stamps;

        /// <summary>실제 달력 날짜가 바뀌었으면 그날의 일과 3개를 새로 뽑는다(도장은 유지, 오늘 진행만 리셋).</summary>
        public static void EnsureToday()
        {
            string today = DateTime.Now.ToString("yyyy-MM-dd");
            if (_date == today && _selected.Length > 0) return;
            SelectForDate(today);
        }

        private static void SelectForDate(string dateKey)
        {
            _date = dateKey;
            _selected = PickIndices(dateKey, TasksPerDay);
            _progress = new int[_selected.Length];
            _done = new bool[_selected.Length];
            _dayStampGranted = false;
        }

        /// <summary>날짜 문자열을 해싱해 풀을 섞은 뒤 앞 count개 인덱스를 오름차순으로 돌려준다(표시 순서 안정).</summary>
        private static int[] PickIndices(string dateKey, int count)
        {
            int seed = StableHash(dateKey);
            var rng = new System.Random(seed);
            var indices = new List<int>(Pool.Length);
            for (int i = 0; i < Pool.Length; i++) indices.Add(i);
            for (int i = indices.Count - 1; i > 0; i--)
            {
                int j = rng.Next(i + 1);
                (indices[i], indices[j]) = (indices[j], indices[i]);
            }
            int n = Mathf.Min(count, indices.Count);
            var picked = indices.GetRange(0, n);
            picked.Sort();
            return picked.ToArray();
        }

        private static int StableHash(string s)
        {
            unchecked
            {
                int hash = 17;
                foreach (char c in s) hash = hash * 31 + c;
                return hash;
            }
        }

        /// <summary>해당 종류 일과가 오늘 뽑힌 셋에 있으면 진행을 더한다(없으면 조용히 무시).</summary>
        public static void ReportProgress(Kind kind, int amount)
        {
            if (amount <= 0) return;
            EnsureToday();
            bool anyChanged = false;
            for (int i = 0; i < _selected.Length; i++)
            {
                if (_done[i]) continue;
                if (Pool[_selected[i]].Kind != kind) continue;
                int target = Pool[_selected[i]].Target;
                _progress[i] = Mathf.Min(target, _progress[i] + amount);
                if (_progress[i] >= target) _done[i] = true;
                anyChanged = true;
            }
            if (anyChanged) CheckAllDone();
        }

        private static void CheckAllDone()
        {
            if (_dayStampGranted || _done.Length == 0) return;
            foreach (var d in _done) if (!d) return;

            _dayStampGranted = true;
            _stamps++;
            if (_stamps % StampsPerReward == 0)
            {
                GoldState.Add(WeeklyRewardGold);
                PlayerStats.AddExp(WeeklyRewardExp);
                WeeklyRewardGranted?.Invoke(WeeklyRewardGold, WeeklyRewardExp);
            }
        }

        public static bool AllDoneToday
        {
            get
            {
                EnsureToday();
                foreach (var d in _done) if (!d) return false;
                return _done.Length > 0;
            }
        }

        /// <summary>목표판 "이번 세션" 줄 — 오늘의 일과 3 중 남은 것 하나(웹판 §5 ④ 그대로의 역할).</summary>
        public static string SessionLineText()
        {
            EnsureToday();
            for (int i = 0; i < _selected.Length; i++)
            {
                if (_done[i]) continue;
                var def = Pool[_selected[i]];
                return string.Format(def.Label, _progress[i], def.Target);
            }
            return _selected.Length == 0 ? "-" : $"오늘의 일과 완료 (도장 {_stamps})";
        }

        /// <summary>목표판 "이번 주" 줄 — 일과 도장이 쌓이는 주간 사다리 다음 단.</summary>
        public static string WeekLineText()
        {
            EnsureToday();
            int rem = _stamps % StampsPerReward;
            int need = StampsPerReward - rem;
            return $"일과 도장 {rem}/{StampsPerReward}(다음 보상까지 {need})";
        }

        // ---- 저장/복원 (SaveState.cs 전용) ----

        public static int[] SnapshotProgress() => (int[])_progress.Clone();
        public static bool[] SnapshotDone() => (bool[])_done.Clone();
        public static bool SnapshotDayStampGranted() => _dayStampGranted;

        /// <summary>세이브에서 복원 — 저장된 날짜로 그날의 일과 셋을 다시 뽑은 뒤(해시가
        /// 결정적이라 순서·목표가 저장 시와 같다) 진행·완료·도장을 덮어쓴다. 날짜가
        /// 비어 있으면(v9 이하 파일) 새 게임과 같은 빈 상태로 둔다 — 다음 EnsureToday()
        /// 호출이 오늘 날짜로 채운다.</summary>
        public static void Restore(string date, int[] progress, bool[] done, bool dayStampGranted, int stamps)
        {
            _stamps = Mathf.Max(0, stamps);
            if (string.IsNullOrEmpty(date))
            {
                _date = "";
                _selected = Array.Empty<int>();
                _progress = Array.Empty<int>();
                _done = Array.Empty<bool>();
                _dayStampGranted = false;
                return;
            }

            SelectForDate(date);
            if (progress != null && progress.Length == _progress.Length) _progress = (int[])progress.Clone();
            if (done != null && done.Length == _done.Length) _done = (bool[])done.Clone();
            _dayStampGranted = dayStampGranted;
        }
    }
}
