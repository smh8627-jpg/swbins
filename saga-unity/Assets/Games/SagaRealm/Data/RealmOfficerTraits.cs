using System;
using System.Collections.Generic;

namespace Saga.Realm.Data
{
    /// <summary>
    /// PLAN.md 101-2 5-1 "인물 특성·야망"(웹판 `saga-web/saga-realm/PLAN.md`
    /// 107행) — 이 트랙엔 무장이 258명이 아니라 3명뿐이고(`RealmOfficerPool`),
    /// 치안·태수·이간·매수·명성·등용서 같은 축이 없어(`RealmWar.cs`·
    /// `RealmQuizState.cs` 클래스 주석과 같은 결) 웹판 특성 12종·야망 6종을
    /// 그대로 못 옮긴다. 이 트랙에 실제로 있는 계수 자리 셋(계략 성공률·
    /// 출진 전투력·문답 보상)에 물리는 특성 3종, 값으로 판정 가능한 조건
    /// 셋(금 보유·특정 성 함락·문답 정답 수)에 물리는 야망 3종으로 좁혔다.
    ///
    /// 특성은 웹판처럼 `id` 해시로 결정적으로 정해져 세이브가 필요 없다
    /// (`GO DailyTaskState.StableHash`와 같은 결 — `GetHashCode()`는 프로세스
    /// 마다 값이 달라질 수 있어 안 쓴다). 야망도 종류·목표(숙적 성)는 해시로
    /// 결정적이라 세이브가 필요 없고, **달성 여부만** 저장한다(웹판 "달성/
    /// 좌절 상태"의 좌절 쪽은 이 트랙에 무장 충성·이탈 축이 없어 안 옮겼다
    /// — 대신 달성 시 즉시 금 보상만 준다, DUNGEON이 "저스트 회피"를
    /// 스코프에서 뺀 것과 같은 판단).
    /// </summary>
    public static class RealmOfficerTraits
    {
        public enum Trait { Brave, Cunning, Wise }
        public enum Ambition { Wealth, Rival, Scholar }

        private const int WealthTarget = 5000; // 웹판 "부귀"는 보물 2개지만 이 트랙엔 보물이 없어 금 보유로 재해석.
        private const int ScholarTarget = 15; // 웹판 "학문"은 학식 상한이지만 이 트랙엔 그 값이 없어 문답 정답 수로 재해석.
        public const int AmbitionRewardGold = 500; // 웹판 "능력 +2"는 무장 능력치가 불변값(readonly)이라 옮길 수 없어 금 보상으로 재해석.

        public const float BraveArmyPowerBonus = 0.15f; // 용맹 — 그 무장이 낀 출진군의 전투력 가산(RealmWar.ArmyPower).
        public const float CunningPlotMultiplier = 1.3f; // 교활 — 그 무장이 시전하는 계략 성공률 배율(RealmWarState.PlotChance).
        public const float WiseQuizMultiplier = 1.2f; // 현명 — 로스터에 한 명이라도 있으면 문답 보상 배율(RealmQuizState.Answer).

        // 특성 2개 조합 — 3종 중 2종을 고르는 3가지 조합에 해시를 매핑.
        private static readonly Trait[][] TraitPairs =
        {
            new[] { Trait.Brave, Trait.Cunning },
            new[] { Trait.Cunning, Trait.Wise },
            new[] { Trait.Brave, Trait.Wise },
        };

        private static readonly HashSet<string> _ambitionDone = new HashSet<string>();

        /// <summary>야망을 막 달성한 순간(무장 id, 야망 종류) — HUD 토스트 훅용,
        /// 안 구독해도 보상 지급 자체는 <see cref="CheckAmbitions"/>가 한다.</summary>
        public static event Action<string, Ambition> AmbitionAchieved;

        /// <summary>루트 CLAUDE.md 결정적 해시 관례 — `Saga.Go.Data.DailyTaskState.StableHash`와
        /// 같은 식(문자열 순회 곱셈), `string.GetHashCode()`는 프로세스마다
        /// 값이 달라질 수 있어 안 쓴다.</summary>
        private static uint StableHash(string s)
        {
            unchecked
            {
                uint hash = 2166136261;
                foreach (char c in s) hash = (hash ^ c) * 16777619;
                return hash;
            }
        }

        public static Trait[] TraitsOf(string officerId) =>
            TraitPairs[StableHash("trait_" + officerId) % (uint)TraitPairs.Length];

        public static bool Has(string officerId, Trait t) => Array.IndexOf(TraitsOf(officerId), t) >= 0;

        public static Ambition AmbitionOf(string officerId) =>
            (Ambition)(StableHash("amb_" + officerId) % 3);

        /// <summary>"숙적" 야망의 목표 성 — <see cref="RealmEnemyCity.AllIds"/>가
        /// 비어 있을 리는 없지만(51장 이후 항상 여럿) 방어적으로 null 처리.</summary>
        public static string RivalCityOf(string officerId)
        {
            var ids = RealmEnemyCity.AllIds;
            return ids.Length == 0 ? null : ids[StableHash("rival_" + officerId) % (uint)ids.Length];
        }

        public static bool IsAmbitionDone(string officerId) => _ambitionDone.Contains(officerId);

        public static float ArmyPowerBonus(string officerId) => Has(officerId, Trait.Brave) ? BraveArmyPowerBonus : 0f;

        public static float PlotChanceMultiplier(string officerId) => Has(officerId, Trait.Cunning) ? CunningPlotMultiplier : 1f;

        public static bool AnyWiseInRoster()
        {
            foreach (var id in RealmCityState.RosterIds)
            {
                if (Has(id, Trait.Wise)) return true;
            }
            return false;
        }

        /// <summary>야망 진행도(현재값, 목표값) — HUD·진단 공용. "숙적"은
        /// 함락 여부뿐이라 0/1 또는 1/1로 표현한다.</summary>
        public static (int current, int target) AmbitionProgress(string officerId)
        {
            switch (AmbitionOf(officerId))
            {
                case Ambition.Wealth: return (RealmCityState.Gold, WealthTarget);
                case Ambition.Scholar: return (RealmQuizState.GetProgress().Correct, ScholarTarget);
                default: // Rival
                    var rivalId = RivalCityOf(officerId);
                    var enemy = rivalId != null ? RealmWarState.Get(rivalId) : null;
                    bool captured = enemy != null && enemy.Captured;
                    return (captured ? 1 : 0, 1);
            }
        }

        /// <summary>로스터 전원의 야망 달성 여부를 확인해 막 달성한 사람에게
        /// 금 보상을 준다 — <see cref="RealmCityState.Changed"/>가 울릴 때마다
        /// (매달 정산뿐 아니라 문답·전투·계략 직후에도) `RealmSessionTracker`가
        /// 부른다. 이미 달성한 무장은 다시 안 본다.</summary>
        public static void CheckAmbitions()
        {
            foreach (var id in RealmCityState.RosterIds)
            {
                if (_ambitionDone.Contains(id)) continue;
                var (current, target) = AmbitionProgress(id);
                if (current < target) continue;

                _ambitionDone.Add(id);
                RealmCityState.AddGold(AmbitionRewardGold);
                AmbitionAchieved?.Invoke(id, AmbitionOf(id));
            }
        }

        public static List<string> SnapshotDone() => new List<string>(_ambitionDone);

        public static void Restore(List<string> done)
        {
            _ambitionDone.Clear();
            if (done != null)
            {
                foreach (var id in done) _ambitionDone.Add(id);
            }
        }
    }
}
