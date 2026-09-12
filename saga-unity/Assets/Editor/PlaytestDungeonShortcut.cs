using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// DUNGEON "위성↔위성 지름길" 슬라이스(2026-09-12) — Town3→
    /// ShortcutCorridorNorth→Crossroads→ShortcutCorridorEast→Town2 경로가
    /// 실제 Play 모드 GameObject 경로에서 예외 없이 서 있을 자리인지
    /// 확인한다. `PlaytestDungeonTown2.cs`와 같은 결(문 자체는 순수
    /// 지오메트리라 씬 재빌드 로그의 "문 폭" 경고 부재로 이미 확인됨 —
    /// 여기서는 Crossroads가 실제로 존재하고 그 위에 서도 예외가 없는지만
    /// 순간이동으로 확인한다).
    /// </summary>
    public static class PlaytestDungeonShortcut
    {
        private const string ScenePath = "Assets/Scenes/TestDungeon.unity";

        private static bool _hadError;
        private static int _framesSeen;
        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        private enum Phase { Init, AtCrossroads, AtTown2ViaShortcut, Done }
        private static Phase _phase = Phase.Init;
        private static int _waitFramesLeft;

        private static Transform _player;
        private static CharacterController _playerController;
        private static GameObject _crossroadsGo, _town2Go;

        [MenuItem("Saga/Playtest Dungeon Shortcut (Headless)")]
        public static void Run()
        {
            _origEnterPlayModeOptionsEnabled = EditorSettings.enterPlayModeOptionsEnabled;
            _origEnterPlayModeOptions = EditorSettings.enterPlayModeOptions;
            EditorSettings.enterPlayModeOptionsEnabled = true;
            EditorSettings.enterPlayModeOptions =
                EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;

            EditorSceneManager.OpenScene(ScenePath);

            _hadError = false;
            _framesSeen = 0;
            _phase = Phase.Init;
            _player = null;
            _playerController = null;
            _crossroadsGo = null;
            _town2Go = null;

            Application.logMessageReceived += OnLog;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        private static void OnLog(string condition, string stackTrace, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception) return;
            if (stackTrace.Contains("UnityEditor.Search.SearchInit.IndexationOnStartup")) return;

            _hadError = true;
            Debug.LogError($"[PlaytestDungeonShortcut] runtime error: {condition}\n{stackTrace}");
        }

        private static void OnStateChanged(PlayModeStateChange state)
        {
            if (state == PlayModeStateChange.EnteredPlayMode)
            {
                EditorApplication.update += Tick;
            }
            else if (state == PlayModeStateChange.EnteredEditMode)
            {
                Application.logMessageReceived -= OnLog;
                EditorApplication.playModeStateChanged -= OnStateChanged;
                EditorSettings.enterPlayModeOptionsEnabled = _origEnterPlayModeOptionsEnabled;
                EditorSettings.enterPlayModeOptions = _origEnterPlayModeOptions;

                bool ok = !_hadError && _phase == Phase.Done;
                Debug.Log(ok
                    ? "[PlaytestDungeonShortcut] OK - walked Town3->Crossroads->Town2 shortcut, no errors"
                    : $"[PlaytestDungeonShortcut] FAIL - error={_hadError} phase={_phase} frames={_framesSeen}");
                EditorApplication.Exit(ok ? 0 : 1);
            }
        }

        private static void Tick()
        {
            _framesSeen++;
            if (_framesSeen > 2000)
            {
                Debug.LogError("[PlaytestDungeonShortcut] 프레임 예산 초과");
                Fail();
                return;
            }

            switch (_phase)
            {
                case Phase.Init:
                    var playerGo = GameObject.FindWithTag("Player");
                    _player = playerGo != null ? playerGo.transform : null;
                    _playerController = playerGo != null ? playerGo.GetComponent<CharacterController>() : null;
                    _crossroadsGo = GameObject.Find("Crossroads");
                    _town2Go = GameObject.Find("Town2");
                    if (_player == null || _crossroadsGo == null || _town2Go == null)
                    {
                        Debug.LogError("[PlaytestDungeonShortcut] Player/Crossroads/Town2를 씬에서 못 찾음");
                        Fail();
                        return;
                    }
                    TeleportPlayer(_crossroadsGo.transform.position);
                    _waitFramesLeft = 2;
                    _phase = Phase.AtCrossroads;
                    break;

                case Phase.AtCrossroads:
                    if (_waitFramesLeft-- > 0) return;
                    TeleportPlayer(_town2Go.transform.position + new Vector3(0f, 0f, 0f));
                    _waitFramesLeft = 2;
                    _phase = Phase.AtTown2ViaShortcut;
                    break;

                case Phase.AtTown2ViaShortcut:
                    if (_waitFramesLeft-- > 0) return;
                    Debug.Log("[PlaytestDungeonShortcut] visited Crossroads and Town2 via shortcut path, no errors");
                    EditorApplication.update -= Tick;
                    EditorApplication.isPlaying = false;
                    _phase = Phase.Done;
                    break;
            }
        }

        private static void Fail()
        {
            _hadError = true;
            EditorApplication.update -= Tick;
            EditorApplication.isPlaying = false;
        }

        private static void TeleportPlayer(Vector3 position)
        {
            if (_playerController != null) _playerController.enabled = false;
            _player.position = position;
            if (_playerController != null) _playerController.enabled = true;
        }
    }
}
