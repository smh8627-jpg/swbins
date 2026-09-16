using System.Reflection;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;
using Saga.Forest.Data;
using Saga.Forest.UI;

namespace Saga.EditorTools
{
    /// <summary>
    /// `PlaytestDungeonHeadless.cs`와 같은 결, 씬 경로만 다르다 —
    /// TestVillageForest 씬을 배치 모드에서 몇 프레임 재생해 런타임
    /// 예외가 없는지 확인한다. **주의 — -executeMethod로 부를 때 -quit을
    /// 같이 주지 않는다**(Run() 자신이 EditorApplication.Exit로 끝낸다).
    /// </summary>
    public static class PlaytestForestHeadless
    {
        private const string ScenePath = "Assets/Scenes/TestVillageForest.unity";
        private const int FramesToRun = 10;

        private static int _framesSeen;
        private static bool _hadError;
        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        [MenuItem("Saga/Playtest TestVillageForest (Headless)")]
        public static void Run()
        {
            _origEnterPlayModeOptionsEnabled = EditorSettings.enterPlayModeOptionsEnabled;
            _origEnterPlayModeOptions = EditorSettings.enterPlayModeOptions;
            EditorSettings.enterPlayModeOptionsEnabled = true;
            EditorSettings.enterPlayModeOptions =
                EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;

            ForestSaveState.DeleteForTest(); // 이전 헤드리스 실행이 남긴 세이브 무시(ForestSaveState.cs 주석 참고).
            EditorSceneManager.OpenScene(ScenePath);
            _framesSeen = 0;
            _hadError = false;
            Application.logMessageReceived += OnLog;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        private static void OnLog(string condition, string stackTrace, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception) return;
            if (stackTrace.Contains("UnityEditor.Search.SearchInit.IndexationOnStartup")) return;

            _hadError = true;
            Debug.LogError($"[PlaytestForestHeadless] runtime error: {condition}\n{stackTrace}");
        }

        private static void OnStateChanged(PlayModeStateChange state)
        {
            if (state == PlayModeStateChange.EnteredPlayMode)
            {
                EditorApplication.update += CountFrames;
            }
            else if (state == PlayModeStateChange.EnteredEditMode)
            {
                Application.logMessageReceived -= OnLog;
                EditorApplication.playModeStateChanged -= OnStateChanged;
                EditorSettings.enterPlayModeOptionsEnabled = _origEnterPlayModeOptionsEnabled;
                EditorSettings.enterPlayModeOptions = _origEnterPlayModeOptions;
                Debug.Log(_hadError
                    ? "[PlaytestForestHeadless] FAIL - runtime error(s) logged"
                    : $"[PlaytestForestHeadless] OK - {FramesToRun} frames, no errors");
                EditorApplication.Exit(_hadError ? 1 : 0);
            }
        }

        private static void CountFrames()
        {
            _framesSeen++;
            // PLAN.md 44~49장 디버그 화면(2026-09-14, GO/DUNGEON과 같은 결) —
            // 좌표 줄이 실제로 채워지는지 본다. 0.5초 FPS 타이머를 기다리는
            // 대신(배치 모드는 몇 프레임 안엔 절대 안 찬다) private
            // Refresh()를 리플렉션으로 직접 부른다.
            if (_framesSeen == 3)
            {
                CheckDebugHud();
                CheckSettingsPanel();
                CheckActionButtonLocalization();
            }
            if (_framesSeen >= FramesToRun)
            {
                EditorApplication.update -= CountFrames;
                EditorApplication.isPlaying = false;
            }
        }

        private static void CheckDebugHud()
        {
            var hudGo = GameObject.Find("DebugUI");
            var hud = hudGo != null ? hudGo.GetComponent<DebugHud>() : null;
            var labelGo = hudGo != null ? hudGo.transform.Find("Label") : null;
            var label = labelGo != null ? labelGo.GetComponent<Text>() : null;
            if (hud == null || label == null)
            {
                Debug.LogError("[PlaytestForestHeadless] DebugUI/Label을 못 찾음");
                _hadError = true;
                return;
            }

            var method = typeof(DebugHud).GetMethod("Refresh", BindingFlags.NonPublic | BindingFlags.Instance);
            method.Invoke(hud, null);

            if (!label.text.Contains("pos:"))
            {
                Debug.LogError($"[PlaytestForestHeadless] 디버그 오버레이에 좌표가 안 보임 text=\"{label.text}\"");
                _hadError = true;
            }
            else
            {
                Debug.Log($"[PlaytestForestHeadless] debug hud OK - \"{label.text.Replace("\n", " | ")}\"");
            }
        }

        /// <summary>PLAN.md 104-1 ②(2026-09-16) — GO
        /// `PlaytestHeadless.CheckSettingsPanel()`과 같은 결로 존재 확인만
        /// 하던 걸 TogglePanel()·ChooseSfx() 실제 호출 + 라벨 텍스트
        /// 확인으로 바꿨다(RealmCommandUi 사례 재발 방지 — 그쪽 클래스
        /// 주석 참고).</summary>
        private static void CheckSettingsPanel()
        {
            var panel = Object.FindFirstObjectByType<ForestSettingsPanel>();
            if (panel == null)
            {
                Debug.LogError("[PlaytestForestHeadless] ForestSettingsPanel 컴포넌트를 못 찾음");
                _hadError = true;
                return;
            }

            var panelGoField = typeof(ForestSettingsPanel).GetField("_panel", BindingFlags.NonPublic | BindingFlags.Instance);
            var panelGo = panelGoField.GetValue(panel) as GameObject;
            if (panelGo == null)
            {
                Debug.LogError("[PlaytestForestHeadless] ForestSettingsPanel._panel이 null — 씬 재로드 후 참조가 안 살아남음");
                _hadError = true;
                return;
            }

            var toggleMethod = typeof(ForestSettingsPanel).GetMethod("TogglePanel", BindingFlags.NonPublic | BindingFlags.Instance);
            toggleMethod.Invoke(panel, null); // 열기 — 여기서 NRE가 나면 그대로 테스트 실패로 드러난다.
            if (!panelGo.activeSelf)
            {
                Debug.LogError("[PlaytestForestHeadless] TogglePanel() 호출 후에도 설정 패널이 안 열림");
                _hadError = true;
                return;
            }
            toggleMethod.Invoke(panel, null); // 닫기
            if (panelGo.activeSelf)
            {
                Debug.LogError("[PlaytestForestHeadless] TogglePanel() 두 번째 호출 후에도 설정 패널이 안 닫힘");
                _hadError = true;
                return;
            }

            var sfxValueLabelField = typeof(ForestSettingsPanel).GetField("_sfxValueLabel", BindingFlags.NonPublic | BindingFlags.Instance);
            var sfxValueLabel = sfxValueLabelField.GetValue(panel) as Text;
            if (sfxValueLabel == null)
            {
                Debug.LogError("[PlaytestForestHeadless] ForestSettingsPanel._sfxValueLabel이 null");
                _hadError = true;
                return;
            }

            bool sfxBefore = ForestSettingsState.SfxOn;
            var chooseSfxMethod = typeof(ForestSettingsPanel).GetMethod("ChooseSfx", BindingFlags.NonPublic | BindingFlags.Instance);
            chooseSfxMethod.Invoke(panel, null); // 실제 버튼 핸들러 — 상태를 뒤집고 Refresh()까지 그대로 탄다.
            string expectedText = ForestLocalization.T(ForestSettingsState.SfxOn ? "state.on" : "state.off");
            if (ForestSettingsState.SfxOn == sfxBefore || sfxValueLabel.text != expectedText)
            {
                Debug.LogError($"[PlaytestForestHeadless] ChooseSfx() 이후 라벨이 실제로 안 바뀜 text=\"{sfxValueLabel.text}\"(기대=\"{expectedText}\")");
                _hadError = true;
                return;
            }
            chooseSfxMethod.Invoke(panel, null); // 원상복귀

            bool vibBefore = ForestSettingsState.VibrationOn;
            ForestSettingsState.VibrationOn = !vibBefore;
            if (ForestSettingsState.VibrationOn == vibBefore)
            {
                Debug.LogError("[PlaytestForestHeadless] 진동 토글이 안 바뀜");
                _hadError = true;
                return;
            }

            ForestSettingsState.UiScaleMultiplier = 1.15f;
            var scaler = Object.FindFirstObjectByType<CanvasScaler>();
            float expected = 1080f / 1.15f;
            if (scaler == null || Mathf.Abs(scaler.referenceResolution.x - expected) > 1f)
            {
                Debug.LogError($"[PlaytestForestHeadless] UI 크기가 캔버스에 안 먹음 — got={(scaler == null ? "null" : scaler.referenceResolution.x.ToString())}");
                _hadError = true;
                return;
            }
            ForestSettingsState.UiScaleMultiplier = 1f;

            ForestSettingsState.HighGraphicsQuality = false;
            if (!Mathf.Approximately(QualitySettings.shadowDistance, 15f) || QualitySettings.antiAliasing != 0)
            {
                Debug.LogError($"[PlaytestForestHeadless] 그래픽 품질(절약)이 QualitySettings에 안 먹음 — shadowDistance={QualitySettings.shadowDistance} aa={QualitySettings.antiAliasing}");
                _hadError = true;
                return;
            }
            ForestSettingsState.HighGraphicsQuality = true;

            string langBefore = ForestLocalization.CurrentLanguage;
            string qualityLabelBefore = ForestSettingsState.GraphicsQualityLabel();
            ForestLocalization.CycleLanguage();
            if (ForestLocalization.CurrentLanguage == langBefore
                || ForestSettingsState.GraphicsQualityLabel() == qualityLabelBefore)
            {
                Debug.LogError("[PlaytestForestHeadless] 언어 전환이 실제 문구를 안 바꿈");
                _hadError = true;
                return;
            }
            ForestLocalization.CurrentLanguage = langBefore;

            Debug.Log("[PlaytestForestHeadless] settings panel OK - sfx/vibration/ui-scale/graphics-quality/language all verified");
        }

        /// <summary>2026-09-15 "저장 버튼 언어 전환 반응" — GO/DUNGEON/STORY에
        /// 이어 FOREST도 같은 문제(씬 빌드 시점 언어로 굳음)가 있었다.
        /// `LocalizedButtonLabel`(폴링, Update()는 private이라 리플렉션).</summary>
        private static void CheckActionButtonLocalization()
        {
            var go = GameObject.Find("SaveButton");
            var localized = go != null ? go.GetComponent<LocalizedButtonLabel>() : null;
            var label = go != null ? go.GetComponentInChildren<Text>() : null;
            if (localized == null || label == null)
            {
                Debug.LogError("[PlaytestForestHeadless] SaveButton/LocalizedButtonLabel을 못 찾음");
                _hadError = true;
                return;
            }

            string langBefore = ForestLocalization.CurrentLanguage;
            var method = typeof(LocalizedButtonLabel).GetMethod("Update", BindingFlags.NonPublic | BindingFlags.Instance);

            ForestLocalization.CurrentLanguage = "en";
            method.Invoke(localized, null);
            if (label.text != "Save")
            {
                Debug.LogError($"[PlaytestForestHeadless] 저장 버튼 영어 전환이 안 먹음 text=\"{label.text}\"(기대=Save)");
                _hadError = true;
                ForestLocalization.CurrentLanguage = langBefore;
                return;
            }
            ForestLocalization.CurrentLanguage = langBefore;
            method.Invoke(localized, null);
            if (label.text != "저장")
            {
                Debug.LogError($"[PlaytestForestHeadless] 저장 버튼이 원래 언어로 안 돌아옴 text=\"{label.text}\"(기대=저장)");
                _hadError = true;
            }

            Debug.Log("[PlaytestForestHeadless] action button localization OK");
        }
    }
}
