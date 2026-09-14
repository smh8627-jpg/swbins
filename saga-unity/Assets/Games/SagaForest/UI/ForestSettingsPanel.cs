using UnityEngine;
using UnityEngine.UI;
using Saga.Forest.Data;

namespace Saga.Forest.UI
{
    /// <summary>
    /// `Saga.Go.UI.GoSettingsPanel.cs`와 같은 결(다섯 판이 각자 복사해
    /// 쓰는 관례) — 효과음·진동·UI 크기·그래픽 품질. 화면 오른쪽 위,
    /// "저장" 버튼(-30,-30,160×80) 바로 아래(-30,-130)에 자리를 잡는다 —
    /// GO와 똑같이 그 자리가 이 판에서도 유일하게 빈 오른쪽 위 자리다
    /// (`BuildTestVillageForestScene.cs`의 Save/DebugUI 위치 참고).
    /// </summary>
    public class ForestSettingsPanel : MonoBehaviour
    {
        private GameObject _panel;
        private Text _sfxLabel;
        private Text _vibrationLabel;
        private Text _uiScaleLabel;
        private Text _qualityLabel;

        public void Build()
        {
            var canvas = EncounterUiKit.NewCanvas("ForestSettingsUI");
            canvas.transform.SetParent(transform, false);

            EncounterUiKit.NewButton(canvas.transform, "설정", new Vector2(1f, 1f), new Vector2(-30f, -130f),
                new Vector2(160f, 80f), TogglePanel);

            _panel = EncounterUiKit.NewPanel(canvas.transform, new Vector2(0.5f, 0.5f), new Vector2(680f, 620f),
                new Color(0f, 0f, 0f, 0.8f));
            _panel.SetActive(false);

            EncounterUiKit.NewText(_panel.transform, "설정", new Vector2(0.5f, 1f), new Vector2(0f, -60f),
                new Vector2(500f, 60f), 32);

            _sfxLabel = MakeRow(-160f, "효과음", ChooseSfx);
            _vibrationLabel = MakeRow(-260f, "진동", ChooseVibration);
            _uiScaleLabel = MakeRow(-360f, "UI 크기", ChooseUiScale);
            _qualityLabel = MakeRow(-460f, "그래픽 품질", ChooseGraphicsQuality);

            EncounterUiKit.NewButton(_panel.transform, "닫는다", new Vector2(0.5f, 0f), new Vector2(0f, 40f),
                new Vector2(300f, 70f), () => _panel.SetActive(false));

            Refresh();
        }

        private Text MakeRow(float y, string name, UnityEngine.Events.UnityAction onClick)
        {
            EncounterUiKit.NewText(_panel.transform, name, new Vector2(0f, 1f), new Vector2(60f, y),
                new Vector2(260f, 70f), 26).alignment = TextAnchor.MiddleLeft;
            var button = EncounterUiKit.NewButton(_panel.transform, "", new Vector2(1f, 1f), new Vector2(-60f, y),
                new Vector2(260f, 70f), onClick);
            return button.GetComponentInChildren<Text>();
        }

        private void ChooseSfx() { ForestSettingsState.SfxOn = !ForestSettingsState.SfxOn; Refresh(); }
        private void ChooseVibration() { ForestSettingsState.VibrationOn = !ForestSettingsState.VibrationOn; Refresh(); }
        private void ChooseUiScale() { ForestSettingsState.CycleUiScale(); Refresh(); }
        private void ChooseGraphicsQuality() { ForestSettingsState.CycleGraphicsQuality(); Refresh(); }

        private void TogglePanel() => _panel.SetActive(!_panel.activeSelf);

        private void Refresh()
        {
            if (_sfxLabel == null) return;
            _sfxLabel.text = ForestSettingsState.SfxOn ? "켜짐" : "꺼짐";
            _vibrationLabel.text = ForestSettingsState.VibrationOn ? "켜짐" : "꺼짐";
            _uiScaleLabel.text = ForestSettingsState.UiScaleLabel();
            _qualityLabel.text = ForestSettingsState.GraphicsQualityLabel();
        }
    }
}
