using TMPro;
using System.Text;
using UnityEngine;
using UnityEngine.UI;
using Saga.Realm.Data;

namespace Saga.Realm.UI
{
    /// <summary>화면 위 상태 줄 — 현재 성 이름과 그 성의 아홉 값(개간·
    /// 상업·기술·치안·축성·훈련·조선·인구·병력·군량), 세력 금고·연월·
    /// 로스터(이름+배치 성)·적국 전황 전부(3절, 51장으로 소패·정도 둘).
    /// RealmCityState.Changed·
    /// RealmWarState.Changed를 구독해 명령·다음 달 정산·성 전환·공격
    /// 직후 바로 갱신한다. RealmCityBuilder.cs와 같은 이유로 로드 순서
    /// 경합을 피하려 첫 Update 프레임에 한 번 더 강제 갱신한다.</summary>
    public class RealmHud : MonoBehaviour
    {
        [SerializeField] private TextMeshProUGUI label;

        private bool _synced;

        private void Awake()
        {
            RealmCityState.Changed += Refresh;
            RealmWarState.Changed += Refresh;
        }

        private void Update()
        {
            if (_synced) return;
            _synced = true;
            Refresh();
        }

        private void OnDestroy()
        {
            RealmCityState.Changed -= Refresh;
            RealmWarState.Changed -= Refresh;
        }

        private void Refresh()
        {
            if (label == null) return;
            var cityId = RealmCityState.CurrentCity;
            var cityDef = RealmCityData.Get(cityId);
            var record = RealmCityState.CityRecord(cityId);
            if (cityDef == null || record == null) return;

            var sb = new StringBuilder();
            sb.Append(cityDef.Name).Append(" · ")
                .Append(string.Format(RealmLocalization.T("hud.year_month"), RealmCityState.Year, RealmCityState.Month, RealmCityState.Gold))
                .Append('\n');
            sb.Append(RealmLocalization.T("hud.agri")).Append(' ').Append(record.Agri)
                .Append(" · ").Append(RealmLocalization.T("hud.comm")).Append(' ').Append(record.Comm)
                .Append(" · ").Append(RealmLocalization.T("hud.tech")).Append(' ').Append(record.Tech)
                .Append(" · ").Append(RealmLocalization.T("hud.sec")).Append(' ').Append(record.Sec).Append('\n');
            sb.Append(RealmLocalization.T("hud.wall")).Append(' ').Append(record.Wall)
                .Append(" · ").Append(RealmLocalization.T("hud.train")).Append(' ').Append(record.Train)
                .Append(" · ").Append(RealmLocalization.T("hud.ships")).Append(' ').Append(record.Ships).Append('\n');
            sb.Append(RealmLocalization.T("hud.pop")).Append(' ').Append(record.Pop)
                .Append(" · ").Append(RealmLocalization.T("hud.troops")).Append(' ').Append(record.Troops)
                .Append(" · ").Append(RealmLocalization.T("hud.food")).Append(' ').Append(record.Food).Append('\n');
            sb.Append(RealmLocalization.T("hud.roster"));
            bool first = true;
            foreach (var id in RealmCityState.RosterIds)
            {
                if (!first) sb.Append(", ");
                first = false;
                var officer = RealmOfficerPool.Get(id);
                var atCity = RealmCityData.Get(RealmCityState.OfficerCityId(id));
                sb.Append(officer != null ? officer.Name : id);
                if (atCity != null) sb.Append('(').Append(atCity.Name).Append(')');
                sb.Append(TraitsAndAmbitionOf(id));
            }
            sb.Append('\n');
            bool firstEnemy = true;
            foreach (var enemyId in RealmEnemyCity.AllIds)
            {
                var enemyDef = RealmEnemyCity.Get(enemyId);
                var enemy = RealmWarState.Get(enemyId);
                if (enemyDef == null || enemy == null) continue;
                if (!firstEnemy) sb.Append(" · ");
                firstEnemy = false;
                sb.Append(enemyDef.Name).Append(" — ").Append(enemy.Captured
                    ? RealmLocalization.T("hud.captured")
                    : string.Format(RealmLocalization.T("hud.enemy_status"), enemy.Troops, enemy.Wall, enemy.Train));
            }
            label.text = sb.ToString();
        }

        private static readonly System.Collections.Generic.Dictionary<RealmOfficerTraits.Trait, string> TraitLabel =
            new System.Collections.Generic.Dictionary<RealmOfficerTraits.Trait, string>
            {
                [RealmOfficerTraits.Trait.Brave] = "용맹",
                [RealmOfficerTraits.Trait.Cunning] = "교활",
                [RealmOfficerTraits.Trait.Wise] = "현명",
            };

        private static readonly System.Collections.Generic.Dictionary<RealmOfficerTraits.Ambition, string> AmbitionLabel =
            new System.Collections.Generic.Dictionary<RealmOfficerTraits.Ambition, string>
            {
                [RealmOfficerTraits.Ambition.Wealth] = "부귀",
                [RealmOfficerTraits.Ambition.Rival] = "숙적",
                [RealmOfficerTraits.Ambition.Scholar] = "학문",
            };

        /// <summary>PLAN.md 101-2 5-1 "인물 특성·야망" — 웹판 "무장 카드에
        /// 특성 배지 2개·야망 한 줄"을 이 판의 유일한 로스터 표시 자리
        /// (텍스트 한 줄짜리 HUD)에 대괄호로 욱여넣는다. 야망 달성 후엔
        /// 진행도 대신 체크 표시만 남긴다.</summary>
        // 110 ⑤c-2c-2 — 특성·야망 이름은 번역 표 `trait.<이름>`·`ambition.<이름>`.
        private static string TraitName(RealmOfficerTraits.Trait t) => RealmLocalization.T("trait." + t.ToString().ToLowerInvariant(), TraitLabel[t]);
        private static string AmbitionName(RealmOfficerTraits.Ambition a) => RealmLocalization.T("ambition." + a.ToString().ToLowerInvariant(), AmbitionLabel[a]);

        private static string TraitsAndAmbitionOf(string officerId)
        {
            var traits = RealmOfficerTraits.TraitsOf(officerId);
            string traitStr = traits.Length > 0 ? TraitName(traits[0]) : "";
            for (int i = 1; i < traits.Length; i++) traitStr += "·" + TraitName(traits[i]);

            var kind = RealmOfficerTraits.AmbitionOf(officerId);
            string ambStr;
            if (RealmOfficerTraits.IsAmbitionDone(officerId))
            {
                ambStr = string.Format(RealmLocalization.T("hud.ambition_done", "야망:{0} 달성✓"), AmbitionName(kind));
            }
            else
            {
                var (current, target) = RealmOfficerTraits.AmbitionProgress(officerId);
                ambStr = string.Format(RealmLocalization.T("hud.ambition", "야망:{0} {1}/{2}"), AmbitionName(kind), current, target);
            }
            return $"[{traitStr} {ambStr}]";
        }
    }
}
