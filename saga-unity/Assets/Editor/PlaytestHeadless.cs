using System.Reflection;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;
using Saga.Go.Audio;
using Saga.Go.Data;
using Saga.Go.UI;

namespace Saga.EditorTools
{
    /// <summary>
    /// PlayerController.Awake() 같은 런타임 코드가 실제로 예외 없이 도는지
    /// 배치 모드에서 몇 프레임 재생해 확인한다 — saga-godot의 "--headless
    /// --quit-after N --verbose"와 같은 목적. 씬을 열고 Play 모드로 들어가
    /// FramesToRun만큼 프레임을 돌린 뒤 스스로 멈추고 EditorApplication.Exit로
    /// 종료한다(콘솔 오류/예외가 있었으면 exit code 1).
    ///
    /// 주의 — 이 메서드를 -executeMethod로 부를 때는 -quit을 같이 주지
    /// 않는다. -quit이 있으면 Run()이 반환하자마자(Play 모드가 실제로
    /// 시작하기도 전에) Unity가 종료해 버린다 — 종료는 이 스크립트가
    /// EditorApplication.Exit()로 직접 한다.
    ///
    /// 2026-09-11 — 이 PC의 Unity 6000.3.23f1 `-batchmode -nographics`
    /// 조합은 Play 모드 진입 중 도메인 리로드(어셈블리 리로드) 단계에서
    /// 멈춘다(ExitingEditMode에서 EnteredPlayMode로 영영 안 넘어감 — 빈
    /// 씬으로도 재현, TestVillage 씬 내용물과 무관함을 확인). Enter Play
    /// Mode Options로 도메인·씬 리로드를 끄면 정상 진입한다(PingExit.cs로
    /// 격리 재현, 지금은 지움). **주의 — 이 값은 실제로
    /// ProjectSettings/EditorSettings.asset에 저장된다**(처음엔 "Exit()로
    /// 바로 끝나면 저장 안 된다"고 잘못 적었었다 — 그건 프로젝트 충돌로
    /// 아예 실행이 안 된 케이스를 보고 낸 오판이었다, 실제로 Play 모드
    /// 진입에 성공하면 그대로 저장돼 사람이 여는 평소 에디터의 Play 버튼
    /// 동작까지 바꿔 버린다). 그래서 Run() 시작에 원래 값을 저장해 뒀다가
    /// 끝나기 직전(Exit 직전)에 반드시 되돌린다 — 헤드리스 실행 동안만
    /// 켜져 있어야 한다.
    /// </summary>
    public static class PlaytestHeadless
    {
        private const string ScenePath = "Assets/Scenes/TestVillage.unity";
        private const int FramesToRun = 10;

        private static int _framesSeen;
        private static bool _hadError;
        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        [MenuItem("Saga/Playtest TestVillage (Headless)")]
        public static void Run()
        {
            _origEnterPlayModeOptionsEnabled = EditorSettings.enterPlayModeOptionsEnabled;
            _origEnterPlayModeOptions = EditorSettings.enterPlayModeOptions;
            EditorSettings.enterPlayModeOptionsEnabled = true;
            EditorSettings.enterPlayModeOptions =
                EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;

            EditorSceneManager.OpenScene(ScenePath);
            _framesSeen = 0;
            _hadError = false;
            Application.logMessageReceived += OnLog;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        /// <summary>
        /// UnityEditor.Search.SearchInit.IndexationOnStartup()의
        /// ArgumentOutOfRangeException은 이 프로젝트에 SearchDatabase 인덱스
        /// 에셋이 하나도 없을 때 터지는 엔진 내부 버그다(2026-09-11 확인 —
        /// `-quit`만 준 순수 컴파일 배치에서도 똑같이 뜨고, 우리 코드와 전혀
        /// 무관하다). Play 모드 진입 시점과 우연히 겹쳐 찍히므로 걸러낸다 —
        /// 안 걸러내면 매번 FAIL로 오판된다(실제 PlayerController.Awake() 등은
        /// 예외 없이 돎).
        /// </summary>
        private static void OnLog(string condition, string stackTrace, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception) return;
            if (stackTrace.Contains("UnityEditor.Search.SearchInit.IndexationOnStartup")) return;

            _hadError = true;
            Debug.LogError($"[PlaytestHeadless] runtime error: {condition}\n{stackTrace}");
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
                    ? "[PlaytestHeadless] FAIL - runtime error(s) logged"
                    : $"[PlaytestHeadless] OK - {FramesToRun} frames, no errors");
                EditorApplication.Exit(_hadError ? 1 : 0);
            }
        }

        private static void CountFrames()
        {
            _framesSeen++;
            // 67장 "사운드"(2026-09-14) — GoAudio.PlaySfx가 헤드리스(-nographics,
            // 오디오 장치 없을 수 있음)에서도 예외 없이 도는지 한 번 확인한다.
            // BanditEncounter.cs가 실제로 쓰는 것과 같은 클립.
            if (_framesSeen == 3)
            {
                var clip = AssetDatabase.LoadAssetAtPath<AudioClip>("Assets/Art/Audio/Kenney_RPGSounds/chop.ogg");
                GoAudio.PlaySfx(clip);
                CheckDebugHud();
                CheckSettingsPanel();
                CheckPlayerHudLocalization();
                CheckActionButtonLocalization();
            }
            if (_framesSeen >= FramesToRun)
            {
                EditorApplication.update -= CountFrames;
                EditorApplication.isPlaying = false;
            }
        }

        /// <summary>PLAN.md 44~49장 디버그 화면 확장(2026-09-14, DebugHud.cs
        /// 클래스 주석 참고) — 레벨/사명/좌표 세 줄이 실제로 채워지는지
        /// 본다. 0.5초(unscaled) 타이머를 기다리는 대신(배치 모드는 프레임이
        /// 실시간보다 훨씬 빨리 돌아 몇 프레임 안엔 절대 안 찬다 — 다른
        /// Playtest들이 이미 겪은 함정과 같은 종류) private Refresh()를
        /// 리플렉션으로 직접 불러 판정 경로만 본다.</summary>
        private static void CheckDebugHud()
        {
            var hudGo = GameObject.Find("DebugUI");
            var hud = hudGo != null ? hudGo.GetComponent<DebugHud>() : null;
            var labelGo = hudGo != null ? hudGo.transform.Find("Label") : null;
            var label = labelGo != null ? labelGo.GetComponent<Text>() : null;
            if (hud == null || label == null)
            {
                Debug.LogError("[PlaytestHeadless] DebugUI/Label을 못 찾음");
                _hadError = true;
                return;
            }

            var method = typeof(DebugHud).GetMethod("Refresh", BindingFlags.NonPublic | BindingFlags.Instance);
            method.Invoke(hud, null);

            if (!label.text.Contains("lv ") || !label.text.Contains("quest:") || !label.text.Contains("pos:"))
            {
                Debug.LogError($"[PlaytestHeadless] 디버그 오버레이에 레벨/사명/좌표가 안 보임 text=\"{label.text}\"");
                _hadError = true;
            }
            else
            {
                Debug.Log($"[PlaytestHeadless] debug hud OK - \"{label.text.Replace("\n", " | ")}\"");
            }
        }

        /// <summary>PLAN.md 67~69장 "접근성"(2026-09-14) — 패널 GameObject가
        /// 실제로 지어졌는지, 효과음/진동/UI 크기/그래픽 품질 토글이
        /// 상태를 바꾸고 CanvasScaler·QualitySettings에 실제로 반영되는지
        /// 직접 확인한다(UI 버튼 클릭 시뮬레이션은 안 함 — 이 파일의 다른
        /// 검사들과 같은 결로 정적 API를 직접 부른다).</summary>
        private static void CheckSettingsPanel()
        {
            if (GameObject.Find("GoSettingsPanel") == null)
            {
                Debug.LogError("[PlaytestHeadless] GoSettingsPanel을 못 찾음");
                _hadError = true;
                return;
            }

            bool sfxBefore = GoSettingsState.SfxOn;
            GoSettingsState.SfxOn = !sfxBefore;
            bool vibBefore = GoSettingsState.VibrationOn;
            GoSettingsState.VibrationOn = !vibBefore;
            if (GoSettingsState.SfxOn == sfxBefore || GoSettingsState.VibrationOn == vibBefore)
            {
                Debug.LogError("[PlaytestHeadless] 효과음/진동 토글이 안 바뀜");
                _hadError = true;
                return;
            }

            GoSettingsState.UiScaleMultiplier = 1.15f;
            var scaler = Object.FindFirstObjectByType<CanvasScaler>();
            float expected = 1080f / 1.15f;
            if (scaler == null || Mathf.Abs(scaler.referenceResolution.x - expected) > 1f)
            {
                Debug.LogError($"[PlaytestHeadless] UI 크기가 캔버스에 안 먹음 — got={(scaler == null ? "null" : scaler.referenceResolution.x.ToString())}");
                _hadError = true;
                return;
            }
            GoSettingsState.UiScaleMultiplier = 1f; // 다른 검사에 영향 없게 기본값으로 되돌린다.

            GoSettingsState.HighGraphicsQuality = false;
            if (!Mathf.Approximately(QualitySettings.shadowDistance, 15f) || QualitySettings.antiAliasing != 0)
            {
                Debug.LogError($"[PlaytestHeadless] 그래픽 품질(절약)이 QualitySettings에 안 먹음 — shadowDistance={QualitySettings.shadowDistance} aa={QualitySettings.antiAliasing}");
                _hadError = true;
                return;
            }
            GoSettingsState.HighGraphicsQuality = true; // 원래(기본) 값으로 되돌린다.

            // 2026-09-14 "Localization" — 언어를 실제로 바꾸면 라벨 문구도
            // 실제로 바뀌는지 본다(API만 값을 바꾸고 표는 그대로인 오탐을 막음).
            string langBefore = GoLocalization.CurrentLanguage;
            string qualityLabelBefore = GoSettingsState.GraphicsQualityLabel();
            GoLocalization.CycleLanguage();
            if (GoLocalization.CurrentLanguage == langBefore
                || GoSettingsState.GraphicsQualityLabel() == qualityLabelBefore)
            {
                Debug.LogError("[PlaytestHeadless] 언어 전환이 실제 문구를 안 바꿈");
                _hadError = true;
                return;
            }
            GoLocalization.CurrentLanguage = langBefore; // 다른 검사에 영향 없게 되돌린다.

            Debug.Log("[PlaytestHeadless] settings panel OK - sfx/vibration/ui-scale/graphics-quality/language all verified");
        }

        /// <summary>PLAN.md 67~69장 "Localization" 2차(2026-09-14) — PlayerHud의
        /// 경험치/돈 표시가 실제로 영어 문구를 보여주는지 본다(단순 T() 호출
        /// 성공이 아니라 string.Format 인자 순서가 실제로 맞는지까지).</summary>
        private static void CheckPlayerHudLocalization()
        {
            var hudGo = GameObject.Find("PlayerHudUI");
            var hud = hudGo != null ? hudGo.GetComponent<PlayerHud>() : null;
            var label = hudGo != null ? hudGo.GetComponentInChildren<Text>() : null;
            if (hud == null || label == null)
            {
                Debug.LogError("[PlaytestHeadless] PlayerHudUI/Label을 못 찾음");
                _hadError = true;
                return;
            }

            string langBefore = GoLocalization.CurrentLanguage;
            var method = typeof(PlayerHud).GetMethod("Refresh", BindingFlags.NonPublic | BindingFlags.Instance);

            GoLocalization.CurrentLanguage = "en";
            method.Invoke(hud, null);
            if (!label.text.Contains("EXP") || !label.text.Contains("Gold"))
            {
                Debug.LogError($"[PlaytestHeadless] PlayerHud 영어 전환이 안 먹음 text=\"{label.text}\"");
                _hadError = true;
                GoLocalization.CurrentLanguage = langBefore;
                return;
            }
            GoLocalization.CurrentLanguage = langBefore;
            method.Invoke(hud, null); // 다른 검사에 영향 없게 원래 언어로 다시 그린다.

            Debug.Log("[PlaytestHeadless] player hud localization OK");
        }

        /// <summary>2026-09-15 "저장 버튼 언어 전환 반응" — DUNGEON/STORY에
        /// 이어 GO도 같은 문제(씬 빌드 시점 언어로 굳음)가 있었다.
        /// `LocalizedButtonLabel`(폴링, Update()는 private이라 리플렉션).</summary>
        private static void CheckActionButtonLocalization()
        {
            var go = GameObject.Find("SaveButton");
            var localized = go != null ? go.GetComponent<LocalizedButtonLabel>() : null;
            var label = go != null ? go.GetComponentInChildren<Text>() : null;
            if (localized == null || label == null)
            {
                Debug.LogError("[PlaytestHeadless] SaveButton/LocalizedButtonLabel을 못 찾음");
                _hadError = true;
                return;
            }

            string langBefore = GoLocalization.CurrentLanguage;
            var method = typeof(LocalizedButtonLabel).GetMethod("Update", BindingFlags.NonPublic | BindingFlags.Instance);

            GoLocalization.CurrentLanguage = "en";
            method.Invoke(localized, null);
            if (label.text != "Save")
            {
                Debug.LogError($"[PlaytestHeadless] 저장 버튼 영어 전환이 안 먹음 text=\"{label.text}\"(기대=Save)");
                _hadError = true;
                GoLocalization.CurrentLanguage = langBefore;
                return;
            }
            GoLocalization.CurrentLanguage = langBefore;
            method.Invoke(localized, null);
            if (label.text != "저장")
            {
                Debug.LogError($"[PlaytestHeadless] 저장 버튼이 원래 언어로 안 돌아옴 text=\"{label.text}\"(기대=저장)");
                _hadError = true;
            }

            Debug.Log("[PlaytestHeadless] action button localization OK");
        }
    }
}
