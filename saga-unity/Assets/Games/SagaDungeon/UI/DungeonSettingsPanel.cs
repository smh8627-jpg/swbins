using UnityEngine;
using UnityEngine.UI;
using Saga.Dungeon.Data;

namespace Saga.Dungeon.UI
{
    /// <summary>
    /// PLAN.md 67~69장 "접근성" — 효과음·진동·UI 크기·그래픽 품질.
    /// `Saga.Realm.UI.RealmCommandUi.cs`와 같은 결로 자기 UI를 스스로
    /// 짓는다 — DUNGEON엔 GO/FOREST의 `EncounterUiKit` 같은 공용 부품이
    /// 없어(이 컴포넌트 하나만 쓸 것이라 새로 안 뽑는다, 이 저장소
    /// "N=1이면 안 뽑는다" 원칙 — `StoryChoiceUi.cs`와 같은 판단) 캔버스/
    /// 패널/텍스트/버튼 조립을 이 파일 안에 그대로 둔다.
    ///
    /// 화면 오른쪽 위 — "저장" 버튼(-30,-30,160×80) 바로 아래를 미니맵
    /// (-30,-130,140×220)이 이미 차지하고 있어(`BuildTestDungeonScene.cs`),
    /// 그 아래(-30,-370)에 20px 틈을 두고 둔다.
    /// </summary>
    public class DungeonSettingsPanel : MonoBehaviour
    {
        private GameObject _panel;
        private Text _sfxLabel;
        private Text _vibrationLabel;
        private Text _uiScaleLabel;
        private Text _qualityLabel;

        public void Build()
        {
            var canvas = NewCanvas("DungeonSettingsUI");
            canvas.transform.SetParent(transform, false);

            NewButton(canvas.transform, "설정", new Vector2(1f, 1f), new Vector2(-30f, -370f),
                new Vector2(160f, 80f), TogglePanel);

            _panel = NewPanel(canvas.transform, new Vector2(0.5f, 0.5f), new Vector2(680f, 620f),
                new Color(0f, 0f, 0f, 0.8f));
            _panel.SetActive(false);

            NewText(_panel.transform, "설정", new Vector2(0.5f, 1f), new Vector2(0f, -60f),
                new Vector2(500f, 60f), 32);

            _sfxLabel = MakeRow(-160f, "효과음", ChooseSfx);
            _vibrationLabel = MakeRow(-260f, "진동", ChooseVibration);
            _uiScaleLabel = MakeRow(-360f, "UI 크기", ChooseUiScale);
            _qualityLabel = MakeRow(-460f, "그래픽 품질", ChooseGraphicsQuality);

            NewButton(_panel.transform, "닫는다", new Vector2(0.5f, 0f), new Vector2(0f, 40f),
                new Vector2(300f, 70f), () => _panel.SetActive(false));

            Refresh();
        }

        private Text MakeRow(float y, string name, UnityEngine.Events.UnityAction onClick)
        {
            NewText(_panel.transform, name, new Vector2(0f, 1f), new Vector2(60f, y),
                new Vector2(260f, 70f), 26).alignment = TextAnchor.MiddleLeft;
            var button = NewButton(_panel.transform, "", new Vector2(1f, 1f), new Vector2(-60f, y),
                new Vector2(260f, 70f), onClick);
            return button.GetComponentInChildren<Text>();
        }

        private void ChooseSfx() { DungeonSettingsState.SfxOn = !DungeonSettingsState.SfxOn; Refresh(); }
        private void ChooseVibration() { DungeonSettingsState.VibrationOn = !DungeonSettingsState.VibrationOn; Refresh(); }
        private void ChooseUiScale() { DungeonSettingsState.CycleUiScale(); Refresh(); }
        private void ChooseGraphicsQuality() { DungeonSettingsState.CycleGraphicsQuality(); Refresh(); }

        private void TogglePanel() => _panel.SetActive(!_panel.activeSelf);

        private void Refresh()
        {
            if (_sfxLabel == null) return;
            _sfxLabel.text = DungeonSettingsState.SfxOn ? "켜짐" : "꺼짐";
            _vibrationLabel.text = DungeonSettingsState.VibrationOn ? "켜짐" : "꺼짐";
            _uiScaleLabel.text = DungeonSettingsState.UiScaleLabel();
            _qualityLabel.text = DungeonSettingsState.GraphicsQualityLabel();
        }

        // GO `UI/EncounterUiKit.cs`와 같은 넷(캔버스/패널/텍스트/버튼) —
        // 이 컴포넌트 하나만 써서 kit로 안 뽑고 그대로 둔다(클래스 주석 참고).
        private static Canvas NewCanvas(string name)
        {
            var go = new GameObject(name);
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = go.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080f, 1920f);
            DungeonSettingsState.ApplyUiScale(scaler);
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
