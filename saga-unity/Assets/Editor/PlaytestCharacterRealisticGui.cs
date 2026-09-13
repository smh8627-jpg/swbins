using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// 66-2장 ⑧이 만든 TestCharacterRealistic 씬을 실제 GUI 에디터로 열어
    /// Play 모드에서 idle/run/attack 세 장면을 스크린샷으로 찍는다 —
    /// 사용자가 "직접 확인해"로 명시적으로 요청했을 때만 쓴다(루트
    /// CLAUDE.md·이 폴더 CLAUDE.md의 "개발 중엔 GUI 스크린샷 습관적으로
    /// 안 찍는다" 원칙의 예외). 끝나면 스스로 EditorApplication.Exit로
    /// Unity를 완전히 종료한다 — 남겨 두지 않는다.
    /// </summary>
    public static class PlaytestCharacterRealisticGui
    {
        private const string ScenePath = "Assets/Scenes/TestCharacterRealistic.unity";
        public const string ShotDir =
            "C:/Users/Windows/AppData/Local/Temp/claude/C--swbins/336c4ec3-6c18-4d1d-b3a3-97bb21bfda70/scratchpad/unity_screens/";

        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;
        private static int _frame;
        private static int _stage;

        [MenuItem("Saga/Playtest TestCharacterRealistic (GUI Screenshot)")]
        public static void Run()
        {
            Directory.CreateDirectory(ShotDir);

            _origEnterPlayModeOptionsEnabled = EditorSettings.enterPlayModeOptionsEnabled;
            _origEnterPlayModeOptions = EditorSettings.enterPlayModeOptions;
            EditorSettings.enterPlayModeOptionsEnabled = true;
            EditorSettings.enterPlayModeOptions =
                EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;

            EditorSceneManager.OpenScene(ScenePath);
            _frame = 0;
            _stage = 0;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        private static void OnStateChanged(PlayModeStateChange state)
        {
            if (state == PlayModeStateChange.EnteredPlayMode)
            {
                EditorApplication.update += Tick;
            }
            else if (state == PlayModeStateChange.EnteredEditMode)
            {
                EditorApplication.playModeStateChanged -= OnStateChanged;
                EditorSettings.enterPlayModeOptionsEnabled = _origEnterPlayModeOptionsEnabled;
                EditorSettings.enterPlayModeOptions = _origEnterPlayModeOptions;
                Debug.Log($"[PlaytestCharacterRealisticGui] done, screenshots in {ShotDir}");
                EditorApplication.Exit(0);
            }
        }

        private static void Tick()
        {
            _frame++;
            var mariaGo = GameObject.Find("Maria");
            var animator = mariaGo != null ? mariaGo.GetComponent<Animator>() : null;

            switch (_stage)
            {
                case 0: // idle 정착 대기
                    if (_frame >= 60)
                    {
                        ScreenCapture.CaptureScreenshot(ShotDir + "01_idle.png");
                        if (animator != null)
                        {
                            animator.SetFloat("Speed", 1f);
                        }
                        _stage = 1;
                        _frame = 0;
                    }
                    break;
                case 1: // run 정착 대기
                    if (_frame >= 60)
                    {
                        ScreenCapture.CaptureScreenshot(ShotDir + "02_run.png");
                        if (animator != null)
                        {
                            animator.SetFloat("Speed", 0f);
                            animator.SetTrigger("Attack");
                        }
                        _stage = 2;
                        _frame = 0;
                    }
                    break;
                case 2: // attack 클립 중간 지점
                    if (_frame >= 20)
                    {
                        ScreenCapture.CaptureScreenshot(ShotDir + "03_attack.png");
                        _stage = 3;
                        _frame = 0;
                    }
                    break;
                case 3: // 캡처 파일 쓰기 여유 후 종료
                    if (_frame >= 20)
                    {
                        EditorApplication.update -= Tick;
                        EditorApplication.isPlaying = false;
                    }
                    break;
            }
        }
    }
}
