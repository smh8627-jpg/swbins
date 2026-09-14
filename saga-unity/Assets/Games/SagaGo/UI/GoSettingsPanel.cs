using UnityEngine;
using UnityEngine.UI;
using Saga.Go.Data;

namespace Saga.Go.UI
{
    /// <summary>
    /// PLAN.md 67~69장 "접근성" — 효과음·진동·UI 크기·그래픽 품질·언어를 한
    /// 팝업에서 고른다. `RealmCommandUi.cs`와 같은 결로 자기 UI를 스스로
    /// 짓는 컴포넌트(kit는 `EncounterUiKit` 재사용 — 전투 사건과 같은 벌).
    /// 화면 오른쪽 위, "저장" 버튼(-30,-30,160×80) 바로 아래(-30,-130)에
    /// 자리를 잡는다 — `BuildTestVillageScene.cs`가 Save/DebugUI 위치를
    /// 이미 그렇게 잡아 둬서, 그 아래가 이 판에서 유일하게 빈 오른쪽 위
    /// 자리다(`BuildSettingsUi()` 클래스 주석 참고).
    ///
    /// 2026-09-14 "Localization" — 다섯째 줄로 언어(ko/en)를 추가하며 패널
    /// 자신의 글자(제목·행 이름·닫기·토글 버튼)를 전부 `GoLocalization.T()`로
    /// 바꿨다 — 언어를 바꾸면 Refresh() 한 번으로 이 패널 전체가 다시
    /// 그려진다(패널 키(680×720)도 행 하나만큼 늘렸다).
    /// </summary>
    public class GoSettingsPanel : MonoBehaviour
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
            var canvas = EncounterUiKit.NewCanvas("GoSettingsUI");
            canvas.transform.SetParent(transform, false);

            var toggleButton = EncounterUiKit.NewButton(canvas.transform, GoLocalization.T("settings.title"),
                new Vector2(1f, 1f), new Vector2(-30f, -130f), new Vector2(160f, 80f), TogglePanel);
            _toggleLabel = toggleButton.GetComponentInChildren<Text>();

            _panel = EncounterUiKit.NewPanel(canvas.transform, new Vector2(0.5f, 0.5f), new Vector2(680f, 720f),
                new Color(0f, 0f, 0f, 0.8f));
            _panel.SetActive(false);

            _titleLabel = EncounterUiKit.NewText(_panel.transform, GoLocalization.T("settings.title"),
                new Vector2(0.5f, 1f), new Vector2(0f, -60f), new Vector2(500f, 60f), 32);

            (_sfxNameLabel, _sfxValueLabel) = MakeRow(-160f, "settings.sfx", ChooseSfx);
            (_vibrationNameLabel, _vibrationValueLabel) = MakeRow(-260f, "settings.vibration", ChooseVibration);
            (_uiScaleNameLabel, _uiScaleValueLabel) = MakeRow(-360f, "settings.ui_scale", ChooseUiScale);
            (_qualityNameLabel, _qualityValueLabel) = MakeRow(-460f, "settings.graphics_quality", ChooseGraphicsQuality);
            (_languageNameLabel, _languageValueLabel) = MakeRow(-560f, "settings.language", ChooseLanguage);

            var closeButton = EncounterUiKit.NewButton(_panel.transform, GoLocalization.T("settings.close"),
                new Vector2(0.5f, 0f), new Vector2(0f, 40f), new Vector2(300f, 70f), () => _panel.SetActive(false));
            _closeLabel = closeButton.GetComponentInChildren<Text>();

            Refresh();
        }

        /// <summary>왼쪽 항목명 + 오른쪽(버튼 안에) 현재 값 — 버튼을 누를
        /// 때마다 다음 값으로 순환한다. 항목명도 언어에 따라 바뀌어야 해서
        /// (닫기·토글 버튼처럼) 이름 Text도 같이 돌려준다.</summary>
        private (Text name, Text value) MakeRow(float y, string nameKey, UnityEngine.Events.UnityAction onClick)
        {
            var name = EncounterUiKit.NewText(_panel.transform, GoLocalization.T(nameKey), new Vector2(0f, 1f),
                new Vector2(60f, y), new Vector2(260f, 70f), 26);
            name.alignment = TextAnchor.MiddleLeft;
            var button = EncounterUiKit.NewButton(_panel.transform, "", new Vector2(1f, 1f), new Vector2(-60f, y),
                new Vector2(260f, 70f), onClick);
            return (name, button.GetComponentInChildren<Text>());
        }

        private void ChooseSfx() { GoSettingsState.SfxOn = !GoSettingsState.SfxOn; Refresh(); }
        private void ChooseVibration() { GoSettingsState.VibrationOn = !GoSettingsState.VibrationOn; Refresh(); }
        private void ChooseUiScale() { GoSettingsState.CycleUiScale(); Refresh(); }
        private void ChooseGraphicsQuality() { GoSettingsState.CycleGraphicsQuality(); Refresh(); }
        private void ChooseLanguage() { GoLocalization.CycleLanguage(); Refresh(); }

        private void TogglePanel() => _panel.SetActive(!_panel.activeSelf);

        private void Refresh()
        {
            if (_sfxValueLabel == null) return;

            _toggleLabel.text = GoLocalization.T("settings.title");
            _titleLabel.text = GoLocalization.T("settings.title");
            _closeLabel.text = GoLocalization.T("settings.close");
            _sfxNameLabel.text = GoLocalization.T("settings.sfx");
            _vibrationNameLabel.text = GoLocalization.T("settings.vibration");
            _uiScaleNameLabel.text = GoLocalization.T("settings.ui_scale");
            _qualityNameLabel.text = GoLocalization.T("settings.graphics_quality");
            _languageNameLabel.text = GoLocalization.T("settings.language");

            _sfxValueLabel.text = GoLocalization.T(GoSettingsState.SfxOn ? "state.on" : "state.off");
            _vibrationValueLabel.text = GoLocalization.T(GoSettingsState.VibrationOn ? "state.on" : "state.off");
            _uiScaleValueLabel.text = GoSettingsState.UiScaleLabel();
            _qualityValueLabel.text = GoSettingsState.GraphicsQualityLabel();
            _languageValueLabel.text = GoLocalization.LanguageLabel();
        }
    }
}
