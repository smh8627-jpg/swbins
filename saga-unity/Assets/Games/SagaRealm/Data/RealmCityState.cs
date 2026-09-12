using System;
using System.Collections.Generic;
using UnityEngine;

namespace Saga.Realm.Data
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 1·3·5절 — 성 하나(허창)짜리 첫 슬라이스의
    /// 판정 전부. js/rtk.js의 order()/settleMonth()/doSearch()/doHire()를
    /// 그대로 옮겼다(공식·비용은 손대지 않는다 — 3절 "새 판정식을 상상하지
    /// 않는다"). GO의 GoldState.cs·PartyState.cs와 같은 정적 상태 클래스
    /// 결이되, REALM은 값들이 서로 강하게 얽혀 있어(금·군량·개간·상업이
    /// 정산 한 번에 같이 움직인다) 하나로 묶었다 — rtk.js도 이 값들을
    /// state() 객체 하나에 담는다.
    /// </summary>
    public static class RealmCityState
    {
        // rtk.js setup(): gold = 2000 + cities.length * 400 (성 하나뿐이라 2400).
        public const int StartingGold = 2400;
        public const int UpkeepPerOfficer = 12; // rtk.js UPKEEP_PER_OFFICER
        private static readonly int[] HarvestMonths = { 6, 10 }; // rtk.js HARVEST_MONTHS

        // data-city.js 'xuchang' 시작값.
        public static int Gold { get; private set; } = StartingGold;
        public static int Food { get; private set; }
        public static int Agri { get; private set; } = 400;
        public static int Comm { get; private set; } = 360;
        public static int Sec { get; private set; } = 60;
        public static int Year { get; private set; } = 194;
        public static int Month { get; private set; } = 1;

        private static readonly List<string> _roster = new List<string> { RealmOfficerPool.StartingOfficerId };
        private static readonly HashSet<string> _doneThisMonth = new HashSet<string>();
        private static readonly HashSet<string> _foundIds = new HashSet<string>();

        public static IReadOnlyList<string> RosterIds => _roster;
        public static IReadOnlyCollection<string> FoundIds => _foundIds;

        /// <summary>명령 실행·다음 달 정산 뒤마다 울린다 — HUD가 이걸로
        /// 다시 그린다(DialogueLabel류처럼 폴링 대신 이벤트를 쓴다,
        /// 값이 바뀌는 지점이 이 클래스 안 몇 곳뿐이라 가능하다).</summary>
        public static event Action Changed;

        public readonly struct OrderResult
        {
            public readonly bool Ok;
            public readonly string Message;
            public OrderResult(bool ok, string message) { Ok = ok; Message = message; }
        }

        public static bool IsOfficerDone(string officerId) => _doneThisMonth.Contains(officerId);

        // rtk.js secMul(): 0.5~1.0.
        private static float SecMul() => 0.5f + Mathf.Clamp(Sec, 0, 100) / 200f;

        /// <summary>이 달에 아직 명령을 안 쓴 로스터 중 지력(wisdom)이 가장
        /// 높은 무장을 자동으로 고른다 — rtk.js는 화면에서 무장을 직접
        /// 골라 명령하지만, 이 슬라이스는 로스터가 1~3명뿐이라 "제일
        /// 적임자가 알아서 나선다"로 단순화했다(무장 선택 UI는 로스터가
        /// 늘어날 다음 슬라이스 몫).</summary>
        private static RealmOfficer BestAvailableOfficer()
        {
            RealmOfficer best = null;
            foreach (var id in _roster)
            {
                if (_doneThisMonth.Contains(id)) continue;
                var o = RealmOfficerPool.Get(id);
                if (o == null) continue;
                if (best == null || o.Wisdom > best.Wisdom) best = o;
            }
            return best;
        }

        public static OrderResult ExecuteOrder(string orderKey)
        {
            var order = RealmOrderData.Get(orderKey);
            if (order == null) return new OrderResult(false, "없는 명령");

            var officer = BestAvailableOfficer();
            if (officer == null) return new OrderResult(false, "이 달에 이미 명령을 썼습니다");

            if (Gold < order.Gold) return new OrderResult(false, "금이 모자랍니다");

            Gold -= order.Gold;
            _doneThisMonth.Add(officer.Id);

            OrderResult result = orderKey switch
            {
                "search" => DoSearch(officer),
                "hire" => DoHire(officer),
                _ => DoDevelop(orderKey, order, officer),
            };
            Changed?.Invoke();
            return result;
        }

        /// <summary>개간·상업 — rtk.js order()의 일반 갈래(성과 = base +
        /// 자질×per, 대성공 시 1.5배).</summary>
        private static OrderResult DoDevelop(string key, RealmOrderData order, RealmOfficer officer)
        {
            int sv = officer.Wisdom;
            bool crit = UnityEngine.Random.value < Mathf.Clamp(sv / 400f, 0.03f, 0.28f);
            int amount = Mathf.RoundToInt((order.Base + sv * order.Per) * (crit ? 1.5f : 1f));

            int before = key == "agri" ? Agri : Comm;
            int after = Mathf.Min(RealmOrderData.DevelopCap, before + amount);
            amount = after - before;
            if (key == "agri") Agri = after; else Comm = after;

            string msg = $"{officer.Name} — {order.Name} {(amount > 0 ? $"+{amount}" : "더 올릴 곳이 없다")}" +
                         $"{(crit && amount > 0 ? " (대성공!)" : "")}";
            return new OrderResult(true, msg);
        }

        /// <summary>수색 — rtk.js doSearch(). 지력이 높을수록 귀한 사람을
        /// 알아본다(rarity 내림차순 정렬 뒤 reach 안에서 무작위).</summary>
        private static OrderResult DoSearch(RealmOfficer officer)
        {
            var hidden = new List<RealmOfficer>();
            foreach (var id in RealmOfficerPool.HiddenPool)
            {
                if (_foundIds.Contains(id) || _roster.Contains(id)) continue;
                hidden.Add(RealmOfficerPool.Get(id));
            }
            if (hidden.Count == 0) return new OrderResult(true, "더 찾을 사람이 없다");

            hidden.Sort((a, b) => b.Rarity.CompareTo(a.Rarity));
            int reach = Mathf.Clamp(Mathf.RoundToInt(hidden.Count * (officer.Wisdom / 130f)), 1, hidden.Count);
            var found = hidden[UnityEngine.Random.Range(0, reach)];
            _foundIds.Add(found.Id);
            return new OrderResult(true, $"{officer.Name} — {found.Name}을(를) 찾아냈다!");
        }

        /// <summary>등용 — rtk.js doHire()/tryHire(). 찾아낸 재야 중 아직
        /// 로스터에 없는 첫 사람을 부른다(이 슬라이스는 포로가 없다).</summary>
        private static OrderResult DoHire(RealmOfficer officer)
        {
            string targetId = null;
            foreach (var id in _foundIds)
            {
                if (!_roster.Contains(id)) { targetId = id; break; }
            }
            if (targetId == null) return new OrderResult(true, "부를 사람이 없다 (먼저 수색하시오)");

            var target = RealmOfficerPool.Get(targetId);
            float chance = Mathf.Clamp(0.28f + officer.Wisdom / 260f - (target.Rarity - 2) * 0.09f, 0.05f, 0.9f);
            if (UnityEngine.Random.value > chance)
            {
                return new OrderResult(true, $"{target.Name}이(가) 설득에 응하지 않았다.");
            }
            _roster.Add(targetId);
            return new OrderResult(true, $"{target.Name}이(가) 세력에 합류했다!");
        }

        /// <summary>다음 달 — rtk.js endMonth()(AI·전쟁·외교 호출은 이
        /// 슬라이스에 없어 뺐다) + settleMonth()의 금고/군량/치안 갈래만.
        /// 병력·인구·재해는 이 슬라이스에 그 값 자체가 없어(4절 "제외")
        /// eatOf()/굶주림·인구 증감 로직은 옮기지 않았다.</summary>
        public static string NextMonth()
        {
            int income = Mathf.RoundToInt(Comm * 0.55f * SecMul());
            int upkeep = _roster.Count * UpkeepPerOfficer;
            Gold = Mathf.Max(0, Gold + income - upkeep);

            int foodGain = 0;
            bool harvest = Array.IndexOf(HarvestMonths, Month) >= 0;
            if (harvest)
            {
                foodGain = Mathf.RoundToInt(Agri * 6f * SecMul());
                Food += foodGain;
            }

            Sec = Mathf.Clamp(Sec - 1, 0, 100);

            Month++;
            if (Month > 12) { Month = 1; Year++; }
            _doneThisMonth.Clear();

            Changed?.Invoke();
            return harvest
                ? $"{Year}년 {Month}월 — 금 +{income}-{upkeep}(봉록), 군량 +{foodGain}"
                : $"{Year}년 {Month}월 — 금 +{income}-{upkeep}(봉록)";
        }

        public static void Restore(int gold, int food, int agri, int comm, int sec, int year, int month,
            List<string> roster, List<string> done, List<string> found)
        {
            Gold = gold; Food = food; Agri = agri; Comm = comm; Sec = sec; Year = year; Month = month;
            _roster.Clear();
            _roster.AddRange(roster != null && roster.Count > 0
                ? roster
                : new List<string> { RealmOfficerPool.StartingOfficerId });
            _doneThisMonth.Clear();
            if (done != null) foreach (var id in done) _doneThisMonth.Add(id);
            _foundIds.Clear();
            if (found != null) foreach (var id in found) _foundIds.Add(id);
            Changed?.Invoke();
        }
    }
}
