using TMPro;
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
        // PLAN.md 104-1 ③ — Build()를 부르는 게 에디터 스크립트뿐이라(런타임 재호출 없음)
        // 씬 저장→재로드 후에도 참조가 남으려면 [SerializeField]가 필수(REALM/LocalizedButtonLabel과 같은 함정).
        [SerializeField] private GameObject _panel;
        [SerializeField] private TextMeshProUGUI _toggleLabel;
        [SerializeField] private TextMeshProUGUI _titleLabel;
        [SerializeField] private TextMeshProUGUI _closeLabel;
        [SerializeField] private TextMeshProUGUI _sfxNameLabel;
        [SerializeField] private TextMeshProUGUI _sfxValueLabel;
        [SerializeField] private TextMeshProUGUI _vibrationNameLabel;
        [SerializeField] private TextMeshProUGUI _vibrationValueLabel;
        [SerializeField] private TextMeshProUGUI _uiScaleNameLabel;
        [SerializeField] private TextMeshProUGUI _uiScaleValueLabel;
        [SerializeField] private TextMeshProUGUI _qualityNameLabel;
        [SerializeField] private TextMeshProUGUI _qualityValueLabel;
        [SerializeField] private TextMeshProUGUI _languageNameLabel;
        [SerializeField] private TextMeshProUGUI _languageValueLabel;
        [SerializeField] private TextMeshProUGUI _bgmNameLabel;
        [SerializeField] private TextMeshProUGUI _bgmValueLabel;

        public void Build()
        {
            var canvas = EncounterUiKit.NewCanvas("ForestSettingsUI");
            canvas.transform.SetParent(transform, false);

            var toggleButton = EncounterUiKit.NewButton(canvas.transform, ForestLocalization.T("settings.title"),
                new Vector2(1f, 1f), new Vector2(-30f, -130f), new Vector2(160f, 80f), TogglePanel);
            _toggleLabel = toggleButton.GetComponentInChildren<TextMeshProUGUI>();

            _panel = EncounterUiKit.NewPanel(canvas.transform, new Vector2(0.5f, 0.5f), new Vector2(680f, 820f),
                new Color(0f, 0f, 0f, 0.8f));
            _panel.SetActive(false);

            _titleLabel = EncounterUiKit.NewText(_panel.transform, ForestLocalization.T("settings.title"),
                new Vector2(0.5f, 1f), new Vector2(0f, -60f), new Vector2(500f, 60f), 32);

            (_sfxNameLabel, _sfxValueLabel) = MakeRow(-140f, "settings.sfx", ChooseSfx);
            (_vibrationNameLabel, _vibrationValueLabel) = MakeRow(-235f, "settings.vibration", ChooseVibration);
            (_uiScaleNameLabel, _uiScaleValueLabel) = MakeRow(-330f, "settings.ui_scale", ChooseUiScale);
            (_qualityNameLabel, _qualityValueLabel) = MakeRow(-425f, "settings.graphics_quality", ChooseGraphicsQuality);
            (_languageNameLabel, _languageValueLabel) = MakeRow(-520f, "settings.language", ChooseLanguage);
            (_bgmNameLabel, _bgmValueLabel) = MakeRow(-615f, "settings.bgm", ChooseBgm);

            var closeButton = EncounterUiKit.NewButton(_panel.transform, ForestLocalization.T("settings.close"),
                new Vector2(0.5f, 0f), new Vector2(0f, 40f), new Vector2(300f, 70f), ClosePanel);
            _closeLabel = closeButton.GetComponentInChildren<TextMeshProUGUI>();

            Refresh();
        }

        private (TextMeshProUGUI name, TextMeshProUGUI value) MakeRow(float y, string nameKey, UnityEngine.Events.UnityAction onClick)
        {
            var name = EncounterUiKit.NewText(_panel.transform, ForestLocalization.T(nameKey), new Vector2(0f, 1f),
                new Vector2(60f, y), new Vector2(260f, 70f), 26);
            name.alignment = TextAlignmentOptions.Left;
            var button = EncounterUiKit.NewButton(_panel.transform, "", new Vector2(1f, 1f), new Vector2(-60f, y),
                new Vector2(260f, 70f), onClick);
            return (name, button.GetComponentInChildren<TextMeshProUGUI>());
        }

        private void ChooseSfx() { ForestSettingsState.SfxOn = !ForestSettingsState.SfxOn; Refresh(); }
        private void ChooseVibration() { ForestSettingsState.VibrationOn = !ForestSettingsState.VibrationOn; Refresh(); }
        private void ChooseUiScale() { ForestSettingsState.CycleUiScale(); Refresh(); }
        private void ChooseGraphicsQuality() { ForestSettingsState.CycleGraphicsQuality(); Refresh(); }
        private void ChooseLanguage() { ForestLocalization.CycleLanguage(); Refresh(); }
        private void ChooseBgm() { ForestSettingsState.BgmOn = !ForestSettingsState.BgmOn; Refresh(); }

        private void TogglePanel() => _panel.SetActive(!_panel.activeSelf);
        // 영속 리스너는 람다를 못 건다(SagaCore/ButtonWiring.cs) — 이름 있는 메서드로.
        private void ClosePanel() => _panel.SetActive(false);

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
            _bgmNameLabel.text = ForestLocalization.T("settings.bgm");

            _sfxValueLabel.text = ForestLocalization.T(ForestSettingsState.SfxOn ? "state.on" : "state.off");
            _vibrationValueLabel.text = ForestLocalization.T(ForestSettingsState.VibrationOn ? "state.on" : "state.off");
            _uiScaleValueLabel.text = ForestSettingsState.UiScaleLabel();
            _qualityValueLabel.text = ForestSettingsState.GraphicsQualityLabel();
            _languageValueLabel.text = ForestLocalization.LanguageLabel();
            _bgmValueLabel.text = ForestLocalization.T(ForestSettingsState.BgmOn ? "state.on" : "state.off");
        }
    }
}
