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
                // REALM 다음 조각 (2) — 함락한 성을 플레이 가능한 성으로
                // 들인다. 전후 성벽·병력·훈련·기술은 이 전투가 실제로 남긴
                // 값 그대로(RealmCityState.AbsorbCity() 주석 참고).
                RealmCityState.AbsorbCity(RealmEnemyCity.XiaopeiId, _xiaopei.Wall, _xiaopei.Troops, _xiaopei.Train, _xiaopei.Tech);
                message = $"{RealmEnemyCity.XiaopeiName}을(를) 함락했다! (아군 손실 {result.LossA}, 적 손실 {result.LossD}) — 이제 우리 성입니다";
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

        public readonly struct PlotResult
        {
            public readonly bool Ok;
            public readonly string Message;
            public PlotResult(bool ok, string message) { Ok = ok; Message = message; }
        }

        /// <summary>diplo.js plotChance() 의 일반 갈래(이간·매수가 아닌 것)
        /// 그대로 — 거는 사람 지력 대 막는 사람 지력, 태수가 없으면 30
        /// (원작 기본값, 소패는 처음부터 태수가 없다). 치안 항은 이
        /// 슬라이스의 소패에 치안 필드가 없어 뺐다(중립값으로 상쇄한
        /// 것과 같다 — RealmPlotData.cs 클래스 주석 참고).</summary>
        private static float PlotChance(RealmOfficer officer) =>
            Mathf.Clamp(0.30f + (officer.Wisdom - 30) / 200f, 0.05f, 0.9f);

        /// <summary>계략을 걸 수 있는 무장 — Attack()과 같은 자리(허창)에
        /// 배치된, 이 달에 아직 안 쓴 사람 중 지력 최고. UI가 % 미리보기에도
        /// 쓴다(RealmCommandUi.cs).</summary>
        private static RealmOfficer BestPlotter(string fromCityId)
        {
            RealmOfficer best = null;
            foreach (var id in RealmCityState.RosterIds)
            {
                if (RealmCityState.OfficerCityId(id) != fromCityId) continue;
                if (RealmCityState.IsOfficerDone(id)) continue;
                var o = RealmOfficerPool.Get(id);
                if (o == null) continue;
                if (best == null || o.Wisdom > best.Wisdom) best = o;
            }
            return best;
        }

        /// <summary>계략 버튼에 걸기 전 성공률을 보여주기 위한 미리보기 —
        /// 무장이 없으면 0(버튼에 "무장 없음"으로 뜬다).</summary>
        public static float PreviewPlotChance(string fromCityId)
        {
            var officer = BestPlotter(fromCityId);
            return officer == null ? 0f : PlotChance(officer);
        }

        /// <summary>계략을 건다 — diplo.js plot() 을 소패 하나로 좁힌 것.
        /// 이간·매수(적 무장 대상)는 소패에 무장이 없어 범위 밖 —
        /// RealmPlotData.cs 클래스 주석 참고.</summary>
        public static PlotResult Plot(string kind, string fromCityId)
        {
            if (_xiaopei.Captured) return new PlotResult(false, "이미 함락한 성입니다");
            if (fromCityId != RealmEnemyCity.AttackFromCityId)
            {
                return new PlotResult(false, $"{RealmCityData.Get(RealmEnemyCity.AttackFromCityId)?.Name}에서만 계략을 쓸 수 있습니다");
            }
            var plot = RealmPlotData.Get(kind);
            if (plot == null) return new PlotResult(false, "없는 계략");

            var officer = BestPlotter(fromCityId);
            if (officer == null) return new PlotResult(false, "이 성에서 계략을 쓸 수 있는 무장이 없습니다");
            if (!RealmCityState.TrySpendGold(plot.Gold)) return new PlotResult(false, "금이 모자랍니다");

            RealmCityState.MarkOfficerDone(officer.Id);
            float chance = PlotChance(officer);
            string message;
            if (UnityEngine.Random.value > chance)
            {
                message = $"{plot.Emoji} {plot.Name} — 들통났다 (성공률 {Mathf.RoundToInt(chance * 100f)}%였다)";
            }
            else
            {
                string effect = kind == "rumor" ? ApplyRumor() : ApplyFire();
                message = $"{plot.Emoji} {plot.Name} 성공 — {effect}";
            }

            Changed?.Invoke();
            return new PlotResult(true, message);
        }

        /// <summary>유언비어 — 원작은 치안을 깎지만(sec 필드 없음, 클래스
        /// 주석 참고) 훈련도를 깎아 실제로 다음 전투(RealmWar.ArmyPower)에
        /// 반영되게 재해석했다. 낙폭도 원작 수치(10+rand(12)) 그대로.</summary>
        private static string ApplyRumor()
        {
            int before = _xiaopei.Train;
            int drop = 10 + UnityEngine.Random.Range(0, 12);
            _xiaopei.Train = Mathf.Max(0, _xiaopei.Train - drop);
            return $"소패 훈련도 {before} → {_xiaopei.Train}";
        }

        /// <summary>화계 — 원작은 군량을 태우지만(소패에 군량 필드 없음)
        /// 병력을 그만큼 직접 깎아 재해석했다. 비율도 원작(25~55%) 그대로.</summary>
        private static string ApplyFire()
        {
            int before = _xiaopei.Troops;
            float frac = 0.25f + UnityEngine.Random.value * 0.3f;
            int burned = Mathf.RoundToInt(_xiaopei.Troops * frac);
            _xiaopei.Troops = Mathf.Max(0, _xiaopei.Troops - burned);
            return $"소패 병력 {before} → {_xiaopei.Troops} ({burned} 소실)";
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
