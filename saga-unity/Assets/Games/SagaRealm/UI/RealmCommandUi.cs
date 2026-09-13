using UnityEngine;
using Saga.Realm.Data;

namespace Saga.Realm.UI
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 1·2-3·2-4·3절 — "명령"(10종, 두 열)·"성"
    /// (조망·명령 대상 전환)·"공격"(소패 공략)·"다음 달" 버튼. SagaGo
    /// `World/BanditEncounter.cs`처럼 자기 UI를 스스로 짓는 컴포넌트.
    /// </summary>
    public class RealmCommandUi : MonoBehaviour
    {
        private GameObject _orderPanel;
        private GameObject _cityPanel;
        private GameObject _plotPanel;
        private Transform _plotButtonsRoot;

        public void Build()
        {
            var canvas = RealmUiKit.NewCanvas("RealmCommandUI");
            canvas.transform.SetParent(transform, false);

            // 다섯 버튼(명령/성/계략/공격/다음달) — 외교(계략) 추가로
            // 넷에서 다섯으로 늘며 간격만 좁혔다(폭 190→180, 간격 270→210).
            RealmUiKit.NewButton(canvas.transform, "명령", new Vector2(0.5f, 0f), new Vector2(-420f, 100f),
                new Vector2(180f, 110f), ToggleOrderPanel);
            RealmUiKit.NewButton(canvas.transform, "성", new Vector2(0.5f, 0f), new Vector2(-210f, 100f),
                new Vector2(180f, 110f), ToggleCityPanel);
            RealmUiKit.NewButton(canvas.transform, "계략", new Vector2(0.5f, 0f), new Vector2(0f, 100f),
                new Vector2(180f, 110f), TogglePlotPanel);
            RealmUiKit.NewButton(canvas.transform, "공격", new Vector2(0.5f, 0f), new Vector2(210f, 100f),
                new Vector2(180f, 110f), ExecuteAttack);
            RealmUiKit.NewButton(canvas.transform, "다음 달", new Vector2(0.5f, 0f), new Vector2(420f, 100f),
                new Vector2(180f, 110f), ExecuteNextMonth);

            BuildOrderPanel(canvas.transform);
            BuildCityPanel(canvas.transform);
            BuildPlotPanel(canvas.transform);
        }

        /// <summary>명령 10종 — rtk.js ORDERS 순서, 두 열(왼쪽 5·오른쪽 5)로
        /// 나눠 패널 높이를 감당할 만하게 잡는다.</summary>
        private void BuildOrderPanel(Transform parent)
        {
            _orderPanel = RealmUiKit.NewPanel(parent, new Vector2(0.5f, 0.5f), new Vector2(920f, 620f),
                new Color(0f, 0f, 0f, 0.75f));
            _orderPanel.SetActive(false);

            RealmUiKit.NewText(_orderPanel.transform, "명령", new Vector2(0.5f, 1f), new Vector2(0f, -60f),
                new Vector2(560f, 60f), 32);

            var keys = RealmOrderData.AllKeys;
            for (int i = 0; i < keys.Length; i++)
            {
                string key = keys[i];
                var order = RealmOrderData.Get(key);
                string label = order != null ? $"{order.Name} ({order.Gold}냥)" : key;

                int col = i / 5; // 0=왼쪽, 1=오른쪽
                int row = i % 5;
                float x = col == 0 ? -230f : 230f;
                float y = -150f - row * 100f;
                RealmUiKit.NewButton(_orderPanel.transform, label, new Vector2(0.5f, 1f), new Vector2(x, y),
                    new Vector2(420f, 84f), () => ChooseOrder(key));
            }

            RealmUiKit.NewButton(_orderPanel.transform, "닫는다", new Vector2(0.5f, 0f), new Vector2(0f, 40f),
                new Vector2(300f, 70f), () => _orderPanel.SetActive(false));
        }

        private void BuildCityPanel(Transform parent)
        {
            _cityPanel = RealmUiKit.NewPanel(parent, new Vector2(0.5f, 0.5f), new Vector2(560f, 480f),
                new Color(0f, 0f, 0f, 0.75f));
            _cityPanel.SetActive(false);

            RealmUiKit.NewText(_cityPanel.transform, "성 — 조망·명령 대상", new Vector2(0.5f, 1f), new Vector2(0f, -60f),
                new Vector2(500f, 60f), 30);

            float y = -150f;
            foreach (var cityId in RealmCityData.AllCityIds)
            {
                var def = RealmCityData.Get(cityId);
                string capturedId = cityId;
                RealmUiKit.NewButton(_cityPanel.transform, def.Name, new Vector2(0.5f, 1f), new Vector2(0f, y),
                    new Vector2(460f, 84f), () => ChooseCity(capturedId));
                y -= 100f;
            }

            RealmUiKit.NewButton(_cityPanel.transform, "닫는다", new Vector2(0.5f, 0f), new Vector2(0f, 30f),
                new Vector2(300f, 70f), () => _cityPanel.SetActive(false));
        }

        /// <summary>diplo.js "계략은 성공률을 숨기지 않는다" — 성공률이
        /// 지금 조망 성·로스터 상태에 따라 매번 바뀌므로(RealmWarState
        /// .PreviewPlotChance), 정적으로 한 번 짓지 않고 열 때마다 버튼을
        /// 다시 만든다(RealmCityBuilder.Rebuild()와 같은 결).</summary>
        private void BuildPlotPanel(Transform parent)
        {
            _plotPanel = RealmUiKit.NewPanel(parent, new Vector2(0.5f, 0.5f), new Vector2(680f, 420f),
                new Color(0f, 0f, 0f, 0.75f));
            _plotPanel.SetActive(false);

            RealmUiKit.NewText(_plotPanel.transform, "계략 — 허창에서만", new Vector2(0.5f, 1f), new Vector2(0f, -60f),
                new Vector2(600f, 60f), 30);

            var root = new GameObject("PlotButtons", typeof(RectTransform));
            root.transform.SetParent(_plotPanel.transform, false);
            var rootRect = (RectTransform)root.transform;
            rootRect.anchorMin = Vector2.zero;
            rootRect.anchorMax = Vector2.one;
            rootRect.sizeDelta = Vector2.zero;
            rootRect.anchoredPosition = Vector2.zero;
            _plotButtonsRoot = root.transform;

            RealmUiKit.NewButton(_plotPanel.transform, "닫는다", new Vector2(0.5f, 0f), new Vector2(0f, 40f),
                new Vector2(300f, 70f), () => _plotPanel.SetActive(false));
        }

        private void RefreshPlotPanel()
        {
            for (int i = _plotButtonsRoot.childCount - 1; i >= 0; i--)
            {
                Destroy(_plotButtonsRoot.GetChild(i).gameObject);
            }

            float y = -150f;
            foreach (var key in RealmPlotData.AllKeys)
            {
                var plot = RealmPlotData.Get(key);
                float chance = RealmWarState.PreviewPlotChance(RealmCityState.CurrentCity);
                string chanceText = chance > 0f ? $"{Mathf.RoundToInt(chance * 100f)}%" : "무장 없음";
                string label = $"{plot.Emoji} {plot.Name} ({plot.Gold}냥, 성공률 {chanceText})";
                string capturedKey = key;
                RealmUiKit.NewButton(_plotButtonsRoot, label, new Vector2(0.5f, 1f), new Vector2(0f, y),
                    new Vector2(600f, 84f), () => ChoosePlot(capturedKey));
                y -= 100f;
            }
        }

        private void ToggleOrderPanel()
        {
            _cityPanel.SetActive(false);
            _plotPanel.SetActive(false);
            _orderPanel.SetActive(!_orderPanel.activeSelf);
        }

        private void ToggleCityPanel()
        {
            _orderPanel.SetActive(false);
            _plotPanel.SetActive(false);
            _cityPanel.SetActive(!_cityPanel.activeSelf);
        }

        private void TogglePlotPanel()
        {
            _orderPanel.SetActive(false);
            _cityPanel.SetActive(false);
            bool open = !_plotPanel.activeSelf;
            _plotPanel.SetActive(open);
            if (open) RefreshPlotPanel();
        }

        private void ChooseOrder(string key)
        {
            var result = RealmCityState.ExecuteOrder(key);
            RealmToast.Instance?.Show(result.Message, 5f);
            if (result.Ok) _orderPanel.SetActive(false);
        }

        private void ChooseCity(string cityId)
        {
            RealmCityState.SetCurrentCity(cityId);
            _cityPanel.SetActive(false);
        }

        private void ExecuteNextMonth()
        {
            string summary = RealmCityState.NextMonth();
            RealmToast.Instance?.Show(summary, 5f);
        }

        private void ExecuteAttack()
        {
            var result = RealmWarState.Attack(RealmCityState.CurrentCity);
            RealmToast.Instance?.Show(result.Message, 6f);
        }

        private void ChoosePlot(string key)
        {
            var result = RealmWarState.Plot(key, RealmCityState.CurrentCity);
            RealmToast.Instance?.Show(result.Message, 6f);
            if (result.Ok) _plotPanel.SetActive(false);
        }
    }
}
