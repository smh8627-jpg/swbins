using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// `PlaytestHeadless.cs`(GO)와 같은 결, 씬 경로만 다르다 — TestDungeon
    /// 씬을 배치 모드에서 몇 프레임 재생해 런타임 예외가 없는지 확인한다.
    /// **주의 — PlaytestHeadless.cs와 같은 이유로 -executeMethod로 부를
    /// 때 -quit을 같이 주지 않는다.**
    /// </summary>
    public static class PlaytestDungeonHeadless
    {
        private const string ScenePath = "Assets/Scenes/TestDungeon.unity";
        private const int FramesToRun = 10;

        private static int _framesSeen;
        private static bool _hadError;
        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        [MenuItem("Saga/Playtest TestDungeon (Headless)")]
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

        private static void OnLog(string condition, string stackTrace, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception) return;
            if (stackTrace.Contains("UnityEditor.Search.SearchInit.IndexationOnStartup")) return;

            _hadError = true;
            Debug.LogError($"[PlaytestDungeonHeadless] runtime error: {condition}\n{stackTrace}");
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
                    ? "[PlaytestDungeonHeadless] FAIL - runtime error(s) logged"
                    : $"[PlaytestDungeonHeadless] OK - {FramesToRun} frames, no errors");
                EditorApplication.Exit(_hadError ? 1 : 0);
            }
        }

        private static void CountFrames()
        {
            _framesSeen++;
            if (_framesSeen >= FramesToRun)
            {
                EditorApplication.update -= CountFrames;
                EditorApplication.isPlaying = false;
            }
        }
    }
}
