using UnityEngine;
using Saga.Realm.Data;

namespace Saga.Realm.UI
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 1·4절 — "명령" 버튼(수색·등용 포함 4종
    /// 선택지, saga-godot REALM의 ChoicePrompt형 성/전임 버튼과 같은
    /// 결)과 "다음 달" 버튼. SagaGo `World/BanditEncounter.cs`처럼 자기
    /// UI를 스스로 짓는 컴포넌트 — REALM엔 트리거로 열리는 사건이 없어
    /// (플레이어 아바타 자체가 없다) Awake가 아니라 편집기 빌드 스크립트가
    /// 직접 Build()를 부른다.
    /// </summary>
    public class RealmCommandUi : MonoBehaviour
    {
        private static readonly string[] OrderKeys = { "agri", "comm", "search", "hire" };

        private GameObject _orderPanel;

        public void Build()
        {
            var canvas = RealmUiKit.NewCanvas("RealmCommandUI");
            canvas.transform.SetParent(transform, false);

            RealmUiKit.NewButton(canvas.transform, "명령", new Vector2(0f, 0f), new Vector2(140f, 100f),
                new Vector2(220f, 110f), ToggleOrderPanel);
            RealmUiKit.NewButton(canvas.transform, "다음 달", new Vector2(1f, 0f), new Vector2(-140f, 100f),
                new Vector2(220f, 110f), ExecuteNextMonth);

            BuildOrderPanel(canvas.transform);
        }

        private void BuildOrderPanel(Transform parent)
        {
            _orderPanel = RealmUiKit.NewPanel(parent, new Vector2(0.5f, 0.5f), new Vector2(640f, 520f),
                new Color(0f, 0f, 0f, 0.75f));
            _orderPanel.SetActive(false);

            RealmUiKit.NewText(_orderPanel.transform, "명령", new Vector2(0.5f, 1f), new Vector2(0f, -60f),
                new Vector2(560f, 60f), 32);

            float y = -150f;
            foreach (var key in OrderKeys)
            {
                var order = RealmOrderData.Get(key);
                string capturedKey = key;
                string label = order != null ? $"{order.Name} ({order.Gold}냥)" : key;
                RealmUiKit.NewButton(_orderPanel.transform, label, new Vector2(0.5f, 1f), new Vector2(0f, y),
                    new Vector2(560f, 84f), () => ChooseOrder(capturedKey));
                y -= 100f;
            }

            RealmUiKit.NewButton(_orderPanel.transform, "닫는다", new Vector2(0.5f, 0f), new Vector2(0f, 40f),
                new Vector2(300f, 70f), () => _orderPanel.SetActive(false));
        }

        private void ToggleOrderPanel()
        {
            _orderPanel.SetActive(!_orderPanel.activeSelf);
        }

        private void ChooseOrder(string key)
        {
            var result = RealmCityState.ExecuteOrder(key);
            RealmToast.Instance?.Show(result.Message, 5f);
            if (result.Ok) _orderPanel.SetActive(false);
        }

        private void ExecuteNextMonth()
        {
            string summary = RealmCityState.NextMonth();
            RealmToast.Instance?.Show(summary, 5f);
        }
    }
}
