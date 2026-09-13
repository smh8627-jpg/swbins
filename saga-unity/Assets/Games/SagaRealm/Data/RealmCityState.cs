using System;
using System.Collections.Generic;
using UnityEngine;

namespace Saga.Realm.Data
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 1·3·4·5절 + 2-2~2-6절(명령 10종·여러 성·
    /// 무장 성 소속, saga-godot REALM 참고 — 개념만, 코드는 새로) —
    /// 성 셋(허창·진류·복양)짜리 REALM 슬라이스의 판정 전부. js/rtk.js의
    /// order()/settleMonth()/doSearch()/doHire()를 그대로 옮겼다(공식·
    /// 비용은 손대지 않는다).
    /// </summary>
    public static class RealmCityState
    {
        // rtk.js setup(): gold = 2000 + cities.length * 400 (성 셋 = 3200).
        public const int StartingGold = 3200;
        public const int UpkeepPerOfficer = 12; // rtk.js UPKEEP_PER_OFFICER
        public const int FoodPer1000 = 10; // rtk.js FOOD_PER_1000
        private static readonly int[] HarvestMonths = { 6, 10 }; // rtk.js HARVEST_MONTHS

        public struct CitySnapshot
        {
            public string CityId;
            public int Agri, Comm, Tech, Sec, Wall, Train, Ships, Pop, Troops, Food;
        }

        public static int Gold { get; private set; } = StartingGold;
        public static int Year { get; private set; } = 194;
        public static int Month { get; private set; } = 1;
        public static string CurrentCity { get; private set; } = RealmCityData.StartingCityId;

        private static readonly Dictionary<string, RealmCityRecord> _cities = BuildInitialCities();
        private static readonly List<string> _activeCityIds = new List<string>(RealmCityData.AllCityIds);
        private static readonly List<string> _roster = new List<string> { RealmOfficerPool.StartingOfficerId };
        private static readonly HashSet<string> _doneThisMonth = new HashSet<string>();
        private static readonly HashSet<string> _foundIds = new HashSet<string>();
        private static readonly Dictionary<string, string> _officerCity = new Dictionary<string, string>
        {
            [RealmOfficerPool.StartingOfficerId] = RealmOfficerPool.StartingOfficerCityId,
        };

        public static IReadOnlyList<string> RosterIds => _roster;
        /// <summary>지금까지 "우리 성"인 곳 — 시작 셋(RealmCityData.AllCityIds)
        /// 에 함락한 성(AbsorbCity)이 더해진다. "성" 패널·정산·저장이 이
        /// 목록으로 돈다(RealmCityData.AllCityIds는 "처음부터 우리 것"만
        /// 가리키는 고정 정의라 여기서 더 안 늘린다).</summary>
        public static IReadOnlyList<string> ActiveCityIds => _activeCityIds;
        public static IReadOnlyCollection<string> FoundIds => _foundIds;

        /// <summary>명령 실행·다음 달 정산·성 전환 뒤마다 울린다 — HUD·
        /// 디오라마가 이걸로 다시 그린다.</summary>
        public static event Action Changed;

        public readonly struct OrderResult
        {
            public readonly bool Ok;
            public readonly string Message;
            public OrderResult(bool ok, string message) { Ok = ok; Message = message; }
        }

        private static Dictionary<string, RealmCityRecord> BuildInitialCities()
        {
            var dict = new Dictionary<string, RealmCityRecord>();
            foreach (var id in RealmCityData.AllCityIds)
            {
                dict[id] = RealmCityRecord.FromDef(RealmCityData.Get(id));
            }
            return dict;
        }

        public static RealmCityRecord CityRecord(string cityId) => _cities.TryGetValue(cityId, out var r) ? r : null;

        public static bool IsOfficerDone(string officerId) => _doneThisMonth.Contains(officerId);

        /// <summary>RealmWarState.Attack()이 출진시킨 무장들을 이 달 명령
        /// 소진으로 표시할 때 쓴다 — ExecuteOrder()가 내부에서 쓰는 것과
        /// 같은 자리를 밖에 하나 튼 것뿐이다.</summary>
        public static void MarkOfficerDone(string officerId) => _doneThisMonth.Add(officerId);

        public static string OfficerCityId(string officerId) => _officerCity.TryGetValue(officerId, out var c) ? c : null;

        /// <summary>RealmWarState.Plot() 등 외부(다른 static 클래스)가 금고를
        /// 쓸 때 — Gold의 세터가 private이라 이 클래스 밖에서 직접 못
        /// 깎는다. 모자라면 아무 것도 안 하고 false.</summary>
        public static bool TrySpendGold(int amount)
        {
            if (Gold < amount) return false;
            Gold -= amount;
            Changed?.Invoke();
            return true;
        }

        /// <summary>RealmQuizState.Answer() 등 외부가 금고에 보태 넣을 때 —
        /// TrySpendGold()의 반대쪽.</summary>
        public static void AddGold(int amount)
        {
            if (amount <= 0) return;
            Gold += amount;
            Changed?.Invoke();
        }

        /// <summary>REALM 다음 조각 (2) "함락한 성을 플레이 가능한 성으로
        /// 들인다" — RealmWarState.Attack()이 소패를 함락한 직후 부른다.
        /// 전후 성벽·병력·훈련·기술은 그 전투가 실제로 남긴 값을 그대로
        /// 이어받고(원작 필드가 없던 개간·상업·인구는 RealmCityData의
        /// 정의값으로, js/data-city.js 그대로), 치안은 rtk.js 함락
        /// 뒤처리 관례대로 절반(기본 60→30)으로 깎인 채 시작한다 — 무장
        /// 배치·태수는 여전히 범위 밖(godot 3절 "뺀 것" 그대로, 등용·
        /// 수색을 이 성에서 쓰면 자연히 채워진다). 이미 편입돼 있으면
        /// (저장/불러오기 등으로 두 번 불릴 수 있다) 아무 것도 안 한다.</summary>
        public static void AbsorbCity(string cityId, int wall, int troops, int train, int tech)
        {
            if (_cities.ContainsKey(cityId)) return;
            var def = RealmCityData.Get(cityId);
            if (def == null) return;

            var record = RealmCityRecord.FromDef(def);
            record.Wall = wall;
            record.Troops = troops;
            record.Train = train;
            record.Tech = tech;
            record.Sec = 30;
            _cities[cityId] = record;
            _activeCityIds.Add(cityId);
            Changed?.Invoke();
        }

        public static void SetCurrentCity(string cityId)
        {
            if (!_cities.ContainsKey(cityId) || cityId == CurrentCity) return;
            CurrentCity = cityId;
            Changed?.Invoke();
        }

        // rtk.js secMul(): 0.5~1.0.
        private static float SecMul(int sec) => 0.5f + Mathf.Clamp(sec, 0, 100) / 200f;

        private static int GetStat(RealmOfficer o, RealmStat stat) => stat switch
        {
            RealmStat.Wisdom => o.Wisdom,
            RealmStat.Command => o.Command,
            RealmStat.Might => o.Might,
            _ => 0,
        };

        private static int GetField(RealmCityRecord r, string key) => key switch
        {
            "agri" => r.Agri,
            "comm" => r.Comm,
            "tech" => r.Tech,
            "sec" => r.Sec,
            "wall" => r.Wall,
            "train" => r.Train,
            "ships" => r.Ships,
            _ => 0,
        };

        private static void SetField(RealmCityRecord r, string key, int value)
        {
            switch (key)
            {
                case "agri": r.Agri = value; break;
                case "comm": r.Comm = value; break;
                case "tech": r.Tech = value; break;
                case "sec": r.Sec = value; break;
                case "wall": r.Wall = value; break;
                case "train": r.Train = value; break;
                case "ships": r.Ships = value; break;
            }
        }

        private static int CapOf(string key, RealmCityDef def) => key switch
        {
            "agri" => Mathf.RoundToInt(900 * RealmCityData.AgriCapMul(def.Land)),
            "comm" => Mathf.RoundToInt(900 * RealmCityData.CommCapMul(def.Land)),
            "tech" => 900,
            "sec" => 100,
            "train" => 100,
            "ships" => def.Land == RealmLand.River ? 300 : 0,
            "wall" => def.BaseWall * 2,
            _ => int.MaxValue,
        };

        /// <summary>성과 = base + 자질×per, 대성공(자질/400, 3~28%) 시 1.5배 —
        /// rtk.js order()의 공통 갈래.</summary>
        private static (int amount, bool crit) RollAmount(int sv, int baseVal, float per)
        {
            bool crit = UnityEngine.Random.value < Mathf.Clamp(sv / 400f, 0.03f, 0.28f);
            int amount = Mathf.RoundToInt((baseVal + sv * per) * (crit ? 1.5f : 1f));
            return (amount, crit);
        }

        /// <summary>이 명령이 요구하는 자질을 기준으로, (개발형·징병이면
        /// 이 성에 배치된, 수색·등용이면 로스터 아무나) 이 달에 아직
        /// 명령을 안 쓴 무장 중 가장 적임자를 고른다 — godot REALM
        /// 2-6절의 재해석 그대로.</summary>
        private static RealmOfficer BestAvailableOfficer(RealmStat stat, bool locationBound)
        {
            RealmOfficer best = null;
            foreach (var id in _roster)
            {
                if (_doneThisMonth.Contains(id)) continue;
                if (locationBound && OfficerCityId(id) != CurrentCity) continue;
                var o = RealmOfficerPool.Get(id);
                if (o == null) continue;
                if (best == null || GetStat(o, stat) > GetStat(best, stat)) best = o;
            }
            return best;
        }

        public static OrderResult ExecuteOrder(string orderKey)
        {
            var order = RealmOrderData.Get(orderKey);
            if (order == null) return new OrderResult(false, "없는 명령");

            var officer = BestAvailableOfficer(order.Stat, order.LocationBound);
            if (officer == null)
            {
                return new OrderResult(false, order.LocationBound
                    ? "이 성에서 명령을 쓸 수 있는 무장이 없습니다"
                    : "이 달에 이미 명령을 썼습니다");
            }

            var cityDef = RealmCityData.Get(CurrentCity);
            var record = _cities[CurrentCity];

            // rtk.js order() — 배는 물가에서만, 이 체크가 금 확인보다 먼저다.
            if (orderKey == "ships" && cityDef.Land != RealmLand.River)
            {
                return new OrderResult(false, "물길이 없는 성입니다");
            }
            if (Gold < order.Gold) return new OrderResult(false, "금이 모자랍니다");

            Gold -= order.Gold;
            _doneThisMonth.Add(officer.Id);

            OrderResult result = orderKey switch
            {
                "search" => DoSearch(officer),
                "hire" => DoHire(officer),
                "draft" => DoDraft(order, officer, record),
                _ => DoDevelop(orderKey, order, officer, cityDef, record),
            };
            Changed?.Invoke();
            return result;
        }

        /// <summary>개간·상업·기술·치안·축성·훈련·조선 — rtk.js order()의
        /// 일반 갈래(cap까지 채우면 초과분은 버린다).</summary>
        private static OrderResult DoDevelop(string key, RealmOrderData order, RealmOfficer officer, RealmCityDef cityDef, RealmCityRecord record)
        {
            int sv = GetStat(officer, order.Stat);
            var (rolled, crit) = RollAmount(sv, order.Base, order.Per);

            int cap = CapOf(key, cityDef);
            int before = GetField(record, key);
            int after = Mathf.Min(cap, before + rolled);
            int amount = after - before;
            SetField(record, key, after);

            string msg = $"{officer.Name} — {order.Name} {(amount > 0 ? $"+{amount}" : "더 올릴 곳이 없다")}" +
                         $"{(crit && amount > 0 ? " (대성공!)" : "")}";
            return new OrderResult(true, msg);
        }

        /// <summary>징병 — rtk.js order()의 draft 갈래. 인구를 깎아 병력을
        /// 만들고, 새 병사가 섞이면 훈련도가 희석된다.</summary>
        private static OrderResult DoDraft(RealmOrderData order, RealmOfficer officer, RealmCityRecord record)
        {
            int sv = GetStat(officer, order.Stat);
            var (rolled, _) = RollAmount(sv, order.Base, order.Per);

            int room = Mathf.FloorToInt(record.Pop * 0.06f) - record.Troops;
            int amount = Mathf.Max(0, Mathf.Min(rolled, Mathf.Max(0, room)));
            amount = Mathf.Min(amount, Mathf.FloorToInt(record.Pop / 12f));

            record.Troops += amount;
            record.Pop -= amount;
            if (record.Troops > 0)
            {
                record.Train = Mathf.RoundToInt(record.Train * (float)(record.Troops - amount) / record.Troops);
            }

            string msg = $"{officer.Name} — 징병 {(amount > 0 ? $"+{amount}" : "더 뽑을 사람이 없다")}";
            return new OrderResult(true, msg);
        }

        /// <summary>수색 — rtk.js doSearch(). 성마다 다른 재야 후보 목록
        /// (RealmOfficerPool.HiddenAt)에서, 지력이 높을수록 귀한 사람을
        /// 알아본다.</summary>
        private static OrderResult DoSearch(RealmOfficer officer)
        {
            var hidden = new List<RealmOfficer>();
            foreach (var id in RealmOfficerPool.HiddenAt(CurrentCity))
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

        /// <summary>등용 — rtk.js doHire()/tryHire(). 지금 조망 중인 성에서
        /// 찾아낸 재야 중 아직 로스터에 없는 사람을 부른다(이 슬라이스는
        /// 포로가 없다). 성공하면 그 성에 배치된다.</summary>
        private static OrderResult DoHire(RealmOfficer officer)
        {
            string targetId = null;
            foreach (var id in RealmOfficerPool.HiddenAt(CurrentCity))
            {
                if (_foundIds.Contains(id) && !_roster.Contains(id)) { targetId = id; break; }
            }
            if (targetId == null) return new OrderResult(true, "부를 사람이 없다 (먼저 수색하시오)");

            var target = RealmOfficerPool.Get(targetId);
            float chance = Mathf.Clamp(0.28f + officer.Wisdom / 260f - (target.Rarity - 2) * 0.09f, 0.05f, 0.9f);
            if (UnityEngine.Random.value > chance)
            {
                return new OrderResult(true, $"{target.Name}이(가) 설득에 응하지 않았다.");
            }
            _roster.Add(targetId);
            _officerCity[targetId] = CurrentCity;
            return new OrderResult(true, $"{target.Name}이(가) 세력에 합류했다({CityName(CurrentCity)} 배치)!");
        }

        private static string CityName(string cityId) => RealmCityData.Get(cityId)?.Name ?? cityId;

        /// <summary>다음 달 — rtk.js endMonth()(AI·전쟁·외교 호출은 이
        /// 슬라이스에 없어 뺐다) + settleMonth()의 금고/군량/치안 갈래.
        /// 인구 자연 증감·재해는 여전히 안 옮겼다(4절 "제외" — 징병이
        /// 생겼어도 인구는 징병으로만 준다, godot 2-3절과 같은 재해석).</summary>
        public static string NextMonth()
        {
            int income = 0;
            foreach (var cityId in _activeCityIds)
            {
                var r = _cities[cityId];
                income += Mathf.RoundToInt(r.Comm * 0.55f * SecMul(r.Sec));
            }
            int upkeep = _roster.Count * UpkeepPerOfficer;
            Gold = Mathf.Max(0, Gold + income - upkeep);

            bool harvest = Array.IndexOf(HarvestMonths, Month) >= 0;
            var starved = new List<string>();
            foreach (var cityId in _activeCityIds)
            {
                var r = _cities[cityId];
                if (harvest) r.Food += Mathf.RoundToInt(r.Agri * 6f * SecMul(r.Sec));

                int eat = Mathf.RoundToInt(r.Troops / 1000f * FoodPer1000);
                r.Food -= eat;
                if (r.Food < 0)
                {
                    int lost = Mathf.Min(r.Troops, Mathf.RoundToInt(-r.Food / (float)FoodPer1000 * 1000f));
                    r.Troops -= lost;
                    r.Food = 0;
                    if (lost > 0) starved.Add(CityName(cityId));
                }

                r.Sec = Mathf.Clamp(r.Sec - 1, 0, 100);
            }

            Month++;
            if (Month > 12) { Month = 1; Year++; }
            _doneThisMonth.Clear();

            Changed?.Invoke();
            string summary = $"{Year}년 {Month}월 — 금 +{income}-{upkeep}(봉록){(harvest ? ", 수확" : "")}";
            if (starved.Count > 0) summary += $" — {string.Join(", ", starved)} 굶주려 병사 흩어짐";
            return summary;
        }

        public static List<CitySnapshot> SnapshotCities()
        {
            var list = new List<CitySnapshot>();
            foreach (var cityId in _activeCityIds)
            {
                var r = _cities[cityId];
                list.Add(new CitySnapshot
                {
                    CityId = cityId, Agri = r.Agri, Comm = r.Comm, Tech = r.Tech, Sec = r.Sec,
                    Wall = r.Wall, Train = r.Train, Ships = r.Ships, Pop = r.Pop, Troops = r.Troops, Food = r.Food,
                });
            }
            return list;
        }

        public static void Restore(int gold, int year, int month, string currentCity,
            List<string> roster, List<string> done, List<string> found,
            List<string> officerCityIds, List<string> officerCityCities,
            List<CitySnapshot> cities)
        {
            Gold = gold; Year = year; Month = month;

            _roster.Clear();
            _roster.AddRange(roster != null && roster.Count > 0
                ? roster
                : new List<string> { RealmOfficerPool.StartingOfficerId });

            _doneThisMonth.Clear();
            if (done != null) foreach (var id in done) _doneThisMonth.Add(id);

            _foundIds.Clear();
            if (found != null) foreach (var id in found) _foundIds.Add(id);

            _officerCity.Clear();
            if (officerCityIds != null && officerCityCities != null)
            {
                for (int i = 0; i < officerCityIds.Count && i < officerCityCities.Count; i++)
                {
                    _officerCity[officerCityIds[i]] = officerCityCities[i];
                }
            }
            if (!_officerCity.ContainsKey(RealmOfficerPool.StartingOfficerId))
            {
                _officerCity[RealmOfficerPool.StartingOfficerId] = RealmOfficerPool.StartingOfficerCityId;
            }

            if (cities != null)
            {
                foreach (var snap in cities)
                {
                    if (!_cities.TryGetValue(snap.CityId, out var r))
                    {
                        // 저장 시점엔 함락해 편입돼 있었지만(AbsorbCity), 이
                        // 프로세스의 _cities는 시작 셋으로만 지어져 있다 —
                        // 정의가 있으면 새로 지어 편입한다(AbsorbCity와 같은
                        // 결, 값은 바로 아래에서 스냅샷으로 덮어쓴다).
                        var def = RealmCityData.Get(snap.CityId);
                        if (def == null) continue;
                        r = RealmCityRecord.FromDef(def);
                        _cities[snap.CityId] = r;
                        if (!_activeCityIds.Contains(snap.CityId)) _activeCityIds.Add(snap.CityId);
                    }
                    r.Agri = snap.Agri; r.Comm = snap.Comm; r.Tech = snap.Tech; r.Sec = snap.Sec;
                    r.Wall = snap.Wall; r.Train = snap.Train; r.Ships = snap.Ships;
                    r.Pop = snap.Pop; r.Troops = snap.Troops; r.Food = snap.Food;
                }
            }

            CurrentCity = _cities.ContainsKey(currentCity) ? currentCity : RealmCityData.StartingCityId;
            Changed?.Invoke();
        }
    }
}
