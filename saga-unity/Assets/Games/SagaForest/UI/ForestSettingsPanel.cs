using UnityEngine;
using UnityEngine.UI;
using Saga.Forest.Data;

namespace Saga.Forest.UI
{
    /// <summary>
    /// `Saga.Go.UI.GoSettingsPanel.cs`와 같은 결(다섯 판이 각자 복사해
    /// 쓰는 관례) — 효과음·진동·UI 크기·그래픽 품질·언어. 화면 오른쪽 위,
    /// "저장" 버튼(-30,-30,160×80) 바로 아래(-30,-130)에 자리를 잡는다 —
    /// GO와 똑같이 그 자리가 이 판에서도 유일하게 빈 오른쪽 위 자리다
    /// (`BuildTestVillageForestScene.cs`의 Save/DebugUI 위치 참고).
    ///
    /// 2026-09-14 "Localization" — 다섯째 줄로 언어(ko/en)를 추가하며 패널
    /// 자신의 글자를 전부 `ForestLocalization.T()`로 바꿨다(GO와 같은 결).
    /// </summary>
    public class ForestSettingsPanel : MonoBehaviour
    {
        private GameObject _panel;
        private Text _toggleLabel;
        private Text _titleLabel;
        private Text _closeLabel;
        private Text _sfxNameLabel;
        private Text _sfxValueLabel;
        private Text _vibrationNameLabel;
        private Text _vibrationValueLabel;
        private Text _uiScaleNameLabel;
        private Text _uiScaleValueLabel;
        private Text _qualityNameLabel;
        private Text _qualityValueLabel;
        private Text _languageNameLabel;
        private Text _languageValueLabel;

        public void Build()
        {
            var canvas = EncounterUiKit.NewCanvas("ForestSettingsUI");
            canvas.transform.SetParent(transform, false);

            var toggleButton = EncounterUiKit.NewButton(canvas.transform, ForestLocalization.T("settings.title"),
                new Vector2(1f, 1f), new Vector2(-30f, -130f), new Vector2(160f, 80f), TogglePanel);
            _toggleLabel = toggleButton.GetComponentInChildren<Text>();

            _panel = EncounterUiKit.NewPanel(canvas.transform, new Vector2(0.5f, 0.5f), new Vector2(680f, 720f),
                new Color(0f, 0f, 0f, 0.8f));
            _panel.SetActive(false);

            _titleLabel = EncounterUiKit.NewText(_panel.transform, ForestLocalization.T("settings.title"),
                new Vector2(0.5f, 1f), new Vector2(0f, -60f), new Vector2(500f, 60f), 32);

            (_sfxNameLabel, _sfxValueLabel) = MakeRow(-160f, "settings.sfx", ChooseSfx);
            (_vibrationNameLabel, _vibrationValueLabel) = MakeRow(-260f, "settings.vibration", ChooseVibration);
            (_uiScaleNameLabel, _uiScaleValueLabel) = MakeRow(-360f, "settings.ui_scale", ChooseUiScale);
            (_qualityNameLabel, _qualityValueLabel) = MakeRow(-460f, "settings.graphics_quality", ChooseGraphicsQuality);
            (_languageNameLabel, _languageValueLabel) = MakeRow(-560f, "settings.language", ChooseLanguage);

            var closeButton = EncounterUiKit.NewButton(_panel.transform, ForestLocalization.T("settings.close"),
                new Vector2(0.5f, 0f), new Vector2(0f, 40f), new Vector2(300f, 70f), () => _panel.SetActive(false));
            _closeLabel = closeButton.GetComponentInChildren<Text>();

            Refresh();
        }

        private (Text name, Text value) MakeRow(float y, string nameKey, UnityEngine.Events.UnityAction onClick)
        {
            var name = EncounterUiKit.NewText(_panel.transform, ForestLocalization.T(nameKey), new Vector2(0f, 1f),
                new Vector2(60f, y), new Vector2(260f, 70f), 26);
            name.alignment = TextAnchor.MiddleLeft;
            var button = EncounterUiKit.NewButton(_panel.transform, "", new Vector2(1f, 1f), new Vector2(-60f, y),
                new Vector2(260f, 70f), onClick);
            return (name, button.GetComponentInChildren<Text>());
        }

        private void ChooseSfx() { ForestSettingsState.SfxOn = !ForestSettingsState.SfxOn; Refresh(); }
        private void ChooseVibration() { ForestSettingsState.VibrationOn = !ForestSettingsState.VibrationOn; Refresh(); }
        private void ChooseUiScale() { ForestSettingsState.CycleUiScale(); Refresh(); }
        private void ChooseGraphicsQuality() { ForestSettingsState.CycleGraphicsQuality(); Refresh(); }
        private void ChooseLanguage() { ForestLocalization.CycleLanguage(); Refresh(); }

        private void TogglePanel() => _panel.SetActive(!_panel.activeSelf);

        private void Refresh()
        {
            if (_sfxValueLabel == null) return;

            _toggleLabel.text = ForestLocalization.T("settings.title");
            _titleLabel.text = ForestLocalization.T("settings.title");
            _closeLabel.text = ForestLocalization.T("settings.close");
            _sfxNameLabel.text = ForestLocalization.T("settings.sfx");
            _vibrationNameLabel.text = ForestLocalization.T("settings.vibration");
            _uiScaleNameLabel.text = ForestLocalization.T("settings.ui_scale");
            _qualityNameLabel.text = ForestLocalization.T("settings.graphics_quality");
            _languageNameLabel.text = ForestLocalization.T("settings.language");

            _sfxValueLabel.text = ForestLocalization.T(ForestSettingsState.SfxOn ? "state.on" : "state.off");
            _vibrationValueLabel.text = ForestLocalization.T(ForestSettingsState.VibrationOn ? "state.on" : "state.off");
            _uiScaleValueLabel.text = ForestSettingsState.UiScaleLabel();
            _qualityValueLabel.text = ForestSettingsState.GraphicsQualityLabel();
            _languageValueLabel.text = ForestLocalization.LanguageLabel();
        }
    }
}
