using System;
using System.Collections.Generic;
using UnityEngine;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 101-2 GO ⑧ "패배 비용과 회수" — 웹판 PLAN.md §5-⑧(다크소울
    /// 재화 회수 참고)를 그대로 옮긴다: 토벌 패배 시 소지금 15%(상한 300)가
    /// 그 자리에 "떨어진 짐"으로 남고, 10분 안에 같은 자리로 돌아가 마커를
    /// 밟으면 돌려받는다(아니면 소멸). 실시간 10분은 <see cref="DailyTaskState"/>
    /// 가 이미 실제 달력 날짜(DateTime.Now)를 쓰는 것과 같은 결로
    /// DateTime.Now.Ticks 기준으로 잰다 — Time.time 은 앱을 완전히 끄고
    /// 다시 켜면 0으로 되돌아가 저장된 만료 시각과 안 맞는다.
    /// </summary>
    public static class DropState
    {
        public const float GoldFraction = 0.15f;
        public const int GoldCap = 300;
        public const double RecoverWindowSec = 600.0; // 10분
        public const int MaxActive = 3; // 웹판 "동시 3개" 그대로.

        [Serializable]
        public struct Drop
        {
            public string Id;
            public float X, Y, Z;
            public int Gold;
            public long ExpiresAtTicks;

            public Vector3 Position => new Vector3(X, Y, Z);
        }

        private static readonly List<Drop> Active = new List<Drop>();
        private static int _nextId;

        public static IReadOnlyList<Drop> ActiveDrops => Active;

        /// <summary>목록이 바뀔 때마다(새 짐·회수·만료) — 마커 스폰/정리 훅용.</summary>
        public static event Action Changed;

        /// <summary>소지금 15%(상한 300)를 그 자리에 떨어뜨린다. 가진 돈이 없으면
        /// 떨어뜨릴 것도 없어 false. 동시 3개를 넘으면 가장 오래된 것부터
        /// 밀어낸다(그 짐은 그대로 소멸 — 웹판 §5⑧ "동시 3개" 그대로).</summary>
        public static bool TryDrop(Vector3 pos, out Drop drop)
        {
            drop = default;
            int amount = Mathf.Min(GoldCap, Mathf.RoundToInt(GoldState.Gold * GoldFraction));
            if (amount <= 0) return false;
            if (!GoldState.TrySpend(amount)) return false;

            if (Active.Count >= MaxActive) Active.RemoveAt(0);

            drop = new Drop
            {
                Id = "drop_" + (_nextId++),
                X = pos.x,
                Y = pos.y,
                Z = pos.z,
                Gold = amount,
                ExpiresAtTicks = DateTime.Now.AddSeconds(RecoverWindowSec).Ticks,
            };
            Active.Add(drop);
            Changed?.Invoke();
            return true;
        }

        /// <summary>창 안이면 금을 돌려주고 목록에서 지운다(true). 창을 이미
        /// 넘겼으면 조용히 지우기만 하고 false.</summary>
        public static bool TryRecover(string id, out int gold)
        {
            gold = 0;
            for (int i = 0; i < Active.Count; i++)
            {
                if (Active[i].Id != id) continue;
                var d = Active[i];
                Active.RemoveAt(i);
                Changed?.Invoke();
                if (DateTime.Now.Ticks > d.ExpiresAtTicks) return false;
                gold = d.Gold;
                return true;
            }
            return false;
        }

        /// <summary>만료된 것만 조용히 지운다 — 세이브를 불러온 직후(앱이 꺼져
        /// 있던 사이 창이 이미 지났을 수 있다) 한 번 부른다.</summary>
        public static void PurgeExpired()
        {
            long now = DateTime.Now.Ticks;
            int before = Active.Count;
            Active.RemoveAll(d => now > d.ExpiresAtTicks);
            if (Active.Count != before) Changed?.Invoke();
        }

        /// <summary>DropMarker.Update()가 스스로 잰 만료 — 목록에서만 지운다(보상 없음).</summary>
        public static void Expire(string id)
        {
            for (int i = 0; i < Active.Count; i++)
            {
                if (Active[i].Id != id) continue;
                Active.RemoveAt(i);
                Changed?.Invoke();
                return;
            }
        }

        // ---- 저장/복원 (SaveState.cs 전용) ----

        public static Drop[] Snapshot() => Active.ToArray();

        public static void Restore(Drop[] drops)
        {
            Active.Clear();
            _nextId = 0;
            if (drops == null) return;
            foreach (var d in drops)
            {
                Active.Add(d);
                if (d.Id != null && d.Id.StartsWith("drop_") && int.TryParse(d.Id.Substring(5), out int n))
                {
                    _nextId = Mathf.Max(_nextId, n + 1);
                }
            }
        }
    }
}
