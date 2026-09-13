using UnityEngine;
using Saga.Realm.Data;

namespace Saga.Realm.UI
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 1·2-3·2-4절 — "명령"(10종, 두 열)·"성"
    /// (조망·명령 대상 전환)·"다음 달" 버튼. SagaGo `World/BanditEncounter.cs`
    /// 처럼 자기 UI를 스스로 짓는 컴포넌트.
    /// </summary>
    public class RealmCommandUi : MonoBehaviour
    {
        private GameObject _orderPanel;
        private GameObject _cityPanel;

        public void Build()
        {
            var canvas = RealmUiKit.NewCanvas("RealmCommandUI");
            canvas.transform.SetParent(transform, false);

            RealmUiKit.NewButton(canvas.transform, "명령", new Vector2(0f, 0f), new Vector2(150f, 100f),
                new Vector2(220f, 110f), ToggleOrderPanel);
            RealmUiKit.NewButton(canvas.transform, "성", new Vector2(0.5f, 0f), new Vector2(0f, 100f),
                new Vector2(220f, 110f), ToggleCityPanel);
            RealmUiKit.NewButton(canvas.transform, "다음 달", new Vector2(1f, 0f), new Vector2(-150f, 100f),
                new Vector2(220f, 110f), ExecuteNextMonth);

            BuildOrderPanel(canvas.transform);
            BuildCityPanel(canvas.transform);
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

        private void ToggleOrderPanel()
        {
            _cityPanel.SetActive(false);
            _orderPanel.SetActive(!_orderPanel.activeSelf);
        }

        private void ToggleCityPanel()
        {
            _orderPanel.SetActive(false);
            _cityPanel.SetActive(!_cityPanel.activeSelf);
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
    }
}
