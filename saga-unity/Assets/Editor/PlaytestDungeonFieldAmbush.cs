using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// DUNGEON "마을 간 필드 조우" 슬라이스(2026-09-12) — 들길 셋(남/서/동,
    /// `Ambush_south`/`Ambush_west`/`Ambush_east`, `DungeonAmbush.cs` 재사용)
    /// 옆에 서면 실제로 룰렛이 굴러가고(무작위라 결과는 안 따진다 — 55%
    /// 고요·30% 매복·15% 돈주머니 중 아무거나) 예외가 없는지만 확인한다.
    /// `DungeonAmbush.Roll()`이 `Random.value`를 쓰는 비결정적 로직이라
    /// (기존 `PlaytestForestCreatures.cs`의 무작위 배회 검증과 같은 결)
    /// 세 자리를 각각 몇 프레임씩 서서 최소 한 번은 롤이 도는지 본다.
    /// </summary>
    public static class PlaytestDungeonFieldAmbush
    {
        private const string ScenePath = "Assets/Scenes/TestDungeon.unity";

        private static bool _hadError;
        private static int _framesSeen;
        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        private enum Phase { Init, AtSouth, AtWest, AtEast, Done }
        private static Phase _phase = Phase.Init;
        private static int _waitFramesLeft;

        private static Transform _player;
        private static CharacterController _playerController;
        private static GameObject _south, _west, _east;

        [MenuItem("Saga/Playtest Dungeon Field Ambush (Headless)")]
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
            _south = null;
            _west = null;
            _east = null;

            Application.logMessageReceived += OnLog;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        private static void OnLog(string condition, string stackTrace, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception) return;
            if (stackTrace.Contains("UnityEditor.Search.SearchInit.IndexationOnStartup")) return;

            _hadError = true;
            Debug.LogError($"[PlaytestDungeonFieldAmbush] runtime error: {condition}\n{stackTrace}");
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
                    ? "[PlaytestDungeonFieldAmbush] OK - visited south/west/east ambush points, no errors"
                    : $"[PlaytestDungeonFieldAmbush] FAIL - error={_hadError} phase={_phase} frames={_framesSeen}");
                EditorApplication.Exit(ok ? 0 : 1);
            }
        }

        private static void Tick()
        {
            _framesSeen++;
            if (_framesSeen > 2000)
            {
                Debug.LogError("[PlaytestDungeonFieldAmbush] 프레임 예산 초과");
                Fail();
                return;
            }

            switch (_phase)
            {
                case Phase.Init:
                    var playerGo = GameObject.FindWithTag("Player");
                    _player = playerGo != null ? playerGo.transform : null;
                    _playerController = playerGo != null ? playerGo.GetComponent<CharacterController>() : null;
                    _south = GameObject.Find("Ambush_south");
                    _west = GameObject.Find("Ambush_west");
                    _east = GameObject.Find("Ambush_east");
                    if (_player == null || _south == null || _west == null || _east == null)
                    {
                        Debug.LogError("[PlaytestDungeonFieldAmbush] Player/Ambush_south/Ambush_west/Ambush_east를 씬에서 못 찾음");
                        Fail();
                        return;
                    }
                    TeleportPlayer(_south.transform.position);
                    _waitFramesLeft = 5;
                    _phase = Phase.AtSouth;
                    break;

                case Phase.AtSouth:
                    if (_waitFramesLeft-- > 0) return;
                    TeleportPlayer(_west.transform.position);
                    _waitFramesLeft = 5;
                    _phase = Phase.AtWest;
                    break;

                case Phase.AtWest:
                    if (_waitFramesLeft-- > 0) return;
                    TeleportPlayer(_east.transform.position);
                    _waitFramesLeft = 5;
                    _phase = Phase.AtEast;
                    break;

                case Phase.AtEast:
                    if (_waitFramesLeft-- > 0) return;
                    Debug.Log("[PlaytestDungeonFieldAmbush] visited all three ambush points");
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
