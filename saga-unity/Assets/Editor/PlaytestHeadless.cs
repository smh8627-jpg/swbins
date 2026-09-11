using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

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
            if (_framesSeen >= FramesToRun)
            {
                EditorApplication.update -= CountFrames;
                EditorApplication.isPlaying = false;
            }
        }
    }
}
