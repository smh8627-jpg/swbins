using System.Text;
using UnityEngine;
using UnityEngine.UI;
using Saga.Realm.Data;

namespace Saga.Realm.UI
{
    /// <summary>화면 위 상태 줄 — 금·군량·개간·상업·치안·연월·로스터.
    /// RealmCityState.Changed를 구독해 명령·다음 달 정산 직후 바로
    /// 갱신한다. RealmCityBuilder.cs와 같은 이유로 로드 순서 경합을
    /// 피하려 첫 Update 프레임에 한 번 더 강제 갱신한다.</summary>
    public class RealmHud : MonoBehaviour
    {
        [SerializeField] private Text label;

        private bool _synced;

        private void Awake()
        {
            RealmCityState.Changed += Refresh;
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
        }

        private void Refresh()
        {
            if (label == null) return;
            var sb = new StringBuilder();
            sb.Append("허창 · ").Append(RealmCityState.Year).Append("년 ").Append(RealmCityState.Month).Append("월\n");
            sb.Append("금 ").Append(RealmCityState.Gold).Append(" · 군량 ").Append(RealmCityState.Food).Append('\n');
            sb.Append("개간 ").Append(RealmCityState.Agri).Append(" · 상업 ").Append(RealmCityState.Comm)
                .Append(" · 치안 ").Append(RealmCityState.Sec).Append('\n');
            sb.Append("로스터: ");
            bool first = true;
            foreach (var id in RealmCityState.RosterIds)
            {
                if (!first) sb.Append(", ");
                first = false;
                var officer = RealmOfficerPool.Get(id);
                sb.Append(officer != null ? officer.Name : id);
            }
            label.text = sb.ToString();
        }
    }
}
