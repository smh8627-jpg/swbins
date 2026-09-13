using System.Text;
using UnityEngine;
using UnityEngine.UI;
using Saga.Realm.Data;

namespace Saga.Realm.UI
{
    /// <summary>화면 위 상태 줄 — 현재 성 이름과 그 성의 아홉 값(개간·
    /// 상업·기술·치안·축성·훈련·조선·인구·병력·군량), 세력 금고·연월·
    /// 로스터(이름+배치 성)·소패 전황(3절). RealmCityState.Changed·
    /// RealmWarState.Changed를 구독해 명령·다음 달 정산·성 전환·공격
    /// 직후 바로 갱신한다. RealmCityBuilder.cs와 같은 이유로 로드 순서
    /// 경합을 피하려 첫 Update 프레임에 한 번 더 강제 갱신한다.</summary>
    public class RealmHud : MonoBehaviour
    {
        [SerializeField] private Text label;

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
            sb.Append(cityDef.Name).Append(" · ").Append(RealmCityState.Year).Append("년 ")
                .Append(RealmCityState.Month).Append("월 · 금 ").Append(RealmCityState.Gold).Append('\n');
            sb.Append("개간 ").Append(record.Agri).Append(" · 상업 ").Append(record.Comm)
                .Append(" · 기술 ").Append(record.Tech).Append(" · 치안 ").Append(record.Sec).Append('\n');
            sb.Append("축성 ").Append(record.Wall).Append(" · 훈련 ").Append(record.Train)
                .Append(" · 조선 ").Append(record.Ships).Append('\n');
            sb.Append("인구 ").Append(record.Pop).Append(" · 병력 ").Append(record.Troops)
                .Append(" · 군량 ").Append(record.Food).Append('\n');
            sb.Append("로스터: ");
            bool first = true;
            foreach (var id in RealmCityState.RosterIds)
            {
                if (!first) sb.Append(", ");
                first = false;
                var officer = RealmOfficerPool.Get(id);
                var atCity = RealmCityData.Get(RealmCityState.OfficerCityId(id));
                sb.Append(officer != null ? officer.Name : id);
                if (atCity != null) sb.Append('(').Append(atCity.Name).Append(')');
            }
            sb.Append('\n');
            var xiaopei = RealmWarState.Xiaopei;
            sb.Append("소패 — ").Append(xiaopei.Captured ? "함락됨" : $"병력 {xiaopei.Troops} · 성벽 {xiaopei.Wall}");
            label.text = sb.ToString();
        }
    }
}
