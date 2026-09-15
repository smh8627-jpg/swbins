using UnityEngine;
using UnityEngine.UI;
using Saga.Story.Data;

namespace Saga.Story.UI
{
    /// <summary>
    /// PLAN.md 51장 "STORY 확장 — 전직·SP 투자 UI" — `StoryChoiceUi.cs`가
    /// 두 선택지 전용(N=1이면 안 뽑는다 원칙으로 그대로 둠)이라, 넷 중 하나를
    /// 고르는 이 화면은 따로 만든다. `Saga.Story.UI.StorySettingsPanel.cs`와
    /// 같은 결로 자기 UI를 스스로 짓는다(캔버스/패널/텍스트/버튼 헬퍼도
    /// 그대로 복사).
    /// </summary>
    public class StoryJobChoiceUi : MonoBehaviour
    {
        public static StoryJobChoiceUi Instance { get; private set; }

        private GameObject _panel;
        private Text _titleLabel;
        private Text _closeLabel;
        private System.Action<string> _onChosen;

        public bool IsShowing => _panel != null && _panel.activeSelf;

        public void Build()
        {
            Instance = this;

            var canvas = NewCanvas("StoryJobChoiceUI");
            canvas.transform.SetParent(transform, false);

            _panel = NewPanel(canvas.transform, new Vector2(0.5f, 0.5f), new Vector2(680f, 640f),
                new Color(0f, 0f, 0f, 0.85f));
            _panel.SetActive(false);

            _titleLabel = NewText(_panel.transform, "", new Vector2(0.5f, 1f),
                new Vector2(0f, -60f), new Vector2(600f, 100f), 28);

            float y = -220f;
            foreach (var jobKey in StoryCombat.JobOrder)
            {
                string capturedKey = jobKey;
                NewButton(_panel.transform, JobLabel(capturedKey), new Vector2(0.5f, 1f),
                    new Vector2(0f, y), new Vector2(520f, 80f), () => Choose(capturedKey));
                y -= 100f;
            }

            var closeButton = NewButton(_panel.transform, StoryLocalization.T("settings.close"),
                new Vector2(0.5f, 0f), new Vector2(0f, 40f), new Vector2(300f, 70f), () => _panel.SetActive(false));
            _closeLabel = closeButton.GetComponentInChildren<Text>();
        }

        private static string JobLabel(string jobKey)
        {
            var info = StoryCombat.JobsTier1[jobKey];
            return StoryLocalization.T($"job.{jobKey}", info.Name);
        }

        public void Show(string prompt, System.Action<string> onChosen)
        {
            if (_panel == null) return;
            _titleLabel.text = prompt;
            if (_closeLabel != null) _closeLabel.text = StoryLocalization.T("settings.close");
            _onChosen = onChosen;
            _panel.SetActive(true);
        }

        private void Choose(string jobKey)
        {
            _panel.SetActive(false);
            _onChosen?.Invoke(jobKey);
        }

        // Saga.Story.UI.StorySettingsPanel.cs와 같은 넷(캔버스/패널/텍스트/버튼) —
        // 이 컴포넌트 하나만 써서 kit로 안 뽑고 그대로 둔다(같은 판단).
        private static Canvas NewCanvas(string name)
        {
            var go = new GameObject(name);
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = go.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080f, 1920f);
            StorySettingsState.ApplyUiScale(scaler);
            go.AddComponent<GraphicRaycaster>();
            return canvas;
        }

        private static GameObject NewPanel(Transform parent, Vector2 anchor, Vector2 size, Color color)
        {
            var go = new GameObject("Panel", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.sizeDelta = size;
            rect.anchoredPosition = Vector2.zero;
            var img = go.AddComponent<Image>();
            img.color = color;
            return go;
        }

        private static Text NewText(Transform parent, string content, Vector2 anchor, Vector2 pos, Vector2 size, int fontSize)
        {
            var go = new GameObject("Text", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.anchoredPosition = pos;
            rect.sizeDelta = size;

            var text = go.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = fontSize;
            text.alignment = TextAnchor.MiddleCenter;
            text.color = Color.white;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.text = content;
            return text;
        }

        private static Button NewButton(Transform parent, string label, Vector2 anchor, Vector2 pos, Vector2 size, UnityEngine.Events.UnityAction onClick)
        {
            var go = new GameObject($"Btn_{label}", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.anchoredPosition = pos;
            rect.sizeDelta = size;

            var img = go.AddComponent<Image>();
            img.color = new Color(1f, 1f, 1f, 0.18f);
            var button = go.AddComponent<Button>();
            button.targetGraphic = img;
            button.onClick.AddListener(onClick);

            NewText(go.transform, label, new Vector2(0.5f, 0.5f), Vector2.zero, size, 26);

            return button;
        }
    }
}
