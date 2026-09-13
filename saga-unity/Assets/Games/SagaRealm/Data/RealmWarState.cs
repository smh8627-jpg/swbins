using System;
using System.Collections.Generic;
using UnityEngine;

namespace Saga.Realm.Data
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 3절 — war.js setupMarch()/finishMarch()의
    /// "출진 준비 → fight() 호출 → 뒤처리"를 소패 하나로 좁혀 옮겼다.
    /// **뺀 것**(문서 그대로): 수량 선택 UI(허창의 전군을 보낸다), 진영
    /// (camp — 무승부는 routed와 같이 취급), 함락 뒤처리(무장 배치·태수·
    /// 치안 반토막·랜드마크 — `Captured` 깃발만 세운다), 구원군·물길.
    /// </summary>
    public static class RealmWarState
    {
        private static RealmEnemyRecord _xiaopei = RealmEnemyCity.NewXiaopei();

        public static RealmEnemyRecord Xiaopei => _xiaopei;

        public static event Action Changed;

        public readonly struct AttackResult
        {
            public readonly bool Ok;
            public readonly string Message;
            public AttackResult(bool ok, string message) { Ok = ok; Message = message; }
        }

        /// <summary>출진할 수 있는가 — war.js canMarch()를 이 슬라이스
        /// 범위(성 하나·적 하나·물길 없음)로 좁힌 것.</summary>
        public static AttackResult Attack(string fromCityId)
        {
            if (_xiaopei.Captured) return new AttackResult(false, "이미 함락한 성입니다");
            if (fromCityId != RealmEnemyCity.AttackFromCityId)
            {
                return new AttackResult(false, $"{RealmCityData.Get(RealmEnemyCity.AttackFromCityId)?.Name}에서만 소패를 칠 수 있습니다");
            }

            var city = RealmCityState.CityRecord(fromCityId);
            int troops = city.Troops;
            if (troops < 500) return new AttackResult(false, "오백은 넘겨야 군대라 하지요");

            int need = Mathf.RoundToInt(troops / 1000f * RealmCityState.FoodPer1000 * 2f);
            if (city.Food < need) return new AttackResult(false, $"군량이 모자랍니다 ({need} 필요)");

            var officers = new List<string>();
            foreach (var id in RealmCityState.RosterIds)
            {
                if (RealmCityState.OfficerCityId(id) == fromCityId && !RealmCityState.IsOfficerDone(id))
                {
                    officers.Add(id);
                }
            }
            if (officers.Count == 0) return new AttackResult(false, "이 성에서 명령을 쓸 수 있는 무장이 없습니다");

            // 출진 — 병력 전군·군량 need만큼 미리 나간다(war.js와 같은 순서).
            city.Troops = 0;
            city.Food -= need;
            foreach (var id in officers) RealmCityState.MarkOfficerDone(id);

            var atk = new RealmArmy { Troops = troops, Start = troops, Train = city.Train, Tech = city.Tech, OfficerIds = officers, Morale = 1f };
            var def = new RealmArmy { Troops = _xiaopei.Troops, Start = _xiaopei.Troops, Train = _xiaopei.Train, Tech = _xiaopei.Tech, OfficerIds = new List<string>(), Morale = 1f };

            var result = RealmWar.Fight(atk, def, _xiaopei, RealmEnemyCity.XiaopeiLand);

            int eaten = Mathf.RoundToInt(troops / 1000f * RealmCityState.FoodPer1000);
            int baggage = Mathf.Max(0, need - eaten);

            string message;
            if (result.Won)
            {
                _xiaopei.Captured = true;
                _xiaopei.Troops = def.Troops;
                message = $"{RealmEnemyCity.XiaopeiName}을(를) 함락했다! (아군 손실 {result.LossA}, 적 손실 {result.LossD})";
            }
            else
            {
                // 물러났다 — 살아 돌아온 병력·치중을 출진한 성으로 되돌린다
                // (routed와 "날이 저묾" 둘 다 이 슬라이스에선 같이 취급).
                city.Troops += atk.Troops;
                city.Food += baggage;
                _xiaopei.Troops = def.Troops; // 병력·성벽이 이어져 재도전이 의미 있다.
                message = $"물러났다 — 생존 {atk.Troops}, 적 손실 {result.LossD}, 치중 {baggage} 귀환";
            }

            Changed?.Invoke();
            return new AttackResult(true, message);
        }

        public static (int wall, int maxWall, int troops, int train, int tech, bool captured) Snapshot() =>
            (_xiaopei.Wall, _xiaopei.MaxWall, _xiaopei.Troops, _xiaopei.Train, _xiaopei.Tech, _xiaopei.Captured);

        public static void Restore(int wall, int maxWall, int troops, int train, int tech, bool captured)
        {
            _xiaopei = new RealmEnemyRecord { Wall = wall, MaxWall = maxWall, Troops = troops, Train = train, Tech = tech, Captured = captured };
            Changed?.Invoke();
        }
    }
}
