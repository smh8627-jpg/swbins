using UnityEngine;
using UnityEngine.UI;
using Saga.Go.Data;

namespace Saga.Go.UI
{
    /// <summary>
    /// PLAN.md 67~69장 "접근성" — 효과음·진동·UI 크기·그래픽 품질을 한
    /// 팝업에서 고른다. `RealmCommandUi.cs`와 같은 결로 자기 UI를 스스로
    /// 짓는 컴포넌트(kit는 `EncounterUiKit` 재사용 — 전투 사건과 같은 벌).
    /// 화면 오른쪽 위, "저장" 버튼(-30,-30,160×80) 바로 아래(-30,-130)에
    /// 자리를 잡는다 — `BuildTestVillageScene.cs`가 Save/DebugUI 위치를
    /// 이미 그렇게 잡아 둬서, 그 아래가 이 판에서 유일하게 빈 오른쪽 위
    /// 자리다(`BuildSettingsUi()` 클래스 주석 참고).
    /// </summary>
    public class GoSettingsPanel : MonoBehaviour
    {
        private GameObject _panel;
        private Text _sfxLabel;
        private Text _vibrationLabel;
        private Text _uiScaleLabel;
        private Text _qualityLabel;

        public void Build()
        {
            var canvas = EncounterUiKit.NewCanvas("GoSettingsUI");
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

        /// <summary>왼쪽 항목명 + 오른쪽(버튼 안에) 현재 값 — 버튼을 누를
        /// 때마다 다음 값으로 순환한다. 텍스트는 버튼 라벨을 그대로 쓴다
        /// (RealmCommandUi의 계략 패널처럼 매번 다시 짓지 않고, 버튼 안의
        /// Text 컴포넌트를 Refresh()에서 직접 갱신).</summary>
        private Text MakeRow(float y, string name, UnityEngine.Events.UnityAction onClick)
        {
            EncounterUiKit.NewText(_panel.transform, name, new Vector2(0f, 1f), new Vector2(60f, y),
                new Vector2(260f, 70f), 26).alignment = TextAnchor.MiddleLeft;
            var button = EncounterUiKit.NewButton(_panel.transform, "", new Vector2(1f, 1f), new Vector2(-60f, y),
                new Vector2(260f, 70f), onClick);
            return button.GetComponentInChildren<Text>();
        }

        private void ChooseSfx() { GoSettingsState.SfxOn = !GoSettingsState.SfxOn; Refresh(); }
        private void ChooseVibration() { GoSettingsState.VibrationOn = !GoSettingsState.VibrationOn; Refresh(); }
        private void ChooseUiScale() { GoSettingsState.CycleUiScale(); Refresh(); }
        private void ChooseGraphicsQuality() { GoSettingsState.CycleGraphicsQuality(); Refresh(); }

        private void TogglePanel() => _panel.SetActive(!_panel.activeSelf);

        private void Refresh()
        {
            if (_sfxLabel == null) return;
            _sfxLabel.text = GoSettingsState.SfxOn ? "켜짐" : "꺼짐";
            _vibrationLabel.text = GoSettingsState.VibrationOn ? "켜짐" : "꺼짐";
            _uiScaleLabel.text = GoSettingsState.UiScaleLabel();
            _qualityLabel.text = GoSettingsState.GraphicsQualityLabel();
        }
    }
}
