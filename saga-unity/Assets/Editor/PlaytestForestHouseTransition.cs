using System.Reflection;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Saga.Forest.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// `PlaytestForestHeadless`(10프레임, 플레이어가 안 움직임)는 `ForestHouse`의
    /// 들어가기/나가기 트리거를 한 번도 실제로 밟아 보지 않는다. DUNGEON
    /// `PlaytestDungeonFloorProgression.cs`가 실제로 잡아낸 것과 같은 버그 계열
    /// (`CharacterController`가 켜진 채 `transform.position`을 그냥 대입하면 다음
    /// 프레임에 조용히 되돌아감)을 `ForestHouse.cs`에서도 코드 검토로 미리 찾아
    /// 고쳤다(`TeleportPlayer()` 신규) — 이 도구는 그 수정이 실제 Play 모드에서
    /// 진짜로 동작하는지, 들어간 자리에 몇 프레임이 지나도 그대로 있는지까지
    /// GameObject 경로로 검증한다.
    /// </summary>
    public static class PlaytestForestHouseTransition
    {
        private const string ScenePath = "Assets/Scenes/TestVillageForest.unity";

        private static bool _hadError;
        private static int _framesSeen;
        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        private enum Phase { Init, ApproachEntry, WaitInside, VerifyInsideSettled, ApproachExit, WaitOutside, VerifyOutsideSettled, Done }
        private static Phase _phase = Phase.Init;
        private static int _waitFramesLeft;
        private static int _initFramesLeft;

        private static Transform _player;
        private static CharacterController _playerController;
        private static ForestHouse _house;

        [MenuItem("Saga/Playtest ForestHouse Transition (Headless)")]
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
            _initFramesLeft = 5;
            _phase = Phase.Init;
            _player = null;
            _playerController = null;
            _house = null;

            Application.logMessageReceived += OnLog;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        private static void OnLog(string condition, string stackTrace, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception) return;
            if (stackTrace.Contains("UnityEditor.Search.SearchInit.IndexationOnStartup")) return;

            _hadError = true;
            Debug.LogError($"[PlaytestForestHouseTransition] runtime error: {condition}\n{stackTrace}");
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
                    ? "[PlaytestForestHouseTransition] OK - entered and exited the house, position held across frames, no errors"
                    : $"[PlaytestForestHouseTransition] FAIL - error={_hadError} phase={_phase} frames={_framesSeen}");
                EditorApplication.Exit(ok ? 0 : 1);
            }
        }

        private static void Tick()
        {
            _framesSeen++;
            if (_framesSeen > 200)
            {
                Debug.LogError("[PlaytestForestHouseTransition] 프레임 예산 초과");
                _hadError = true;
                EditorApplication.update -= Tick;
                EditorApplication.isPlaying = false;
                return;
            }

            switch (_phase)
            {
                case Phase.Init:
                    if (_initFramesLeft-- > 0) return;
                    var playerGo = GameObject.FindWithTag("Player");
                    _player = playerGo != null ? playerGo.transform : null;
                    _playerController = playerGo != null ? playerGo.GetComponent<CharacterController>() : null;
                    _house = Object.FindFirstObjectByType<ForestHouse>();
                    if (_player == null || _house == null)
                    {
                        Debug.LogError("[PlaytestForestHouseTransition] Player 또는 ForestHouse를 씬에서 못 찾음");
                        _hadError = true;
                        EditorApplication.update -= Tick;
                        EditorApplication.isPlaying = false;
                        return;
                    }
                    _phase = Phase.ApproachEntry;
                    break;

                case Phase.ApproachEntry:
                    TeleportPlayer(GetField<Vector3>("_entryTriggerPos"));
                    _waitFramesLeft = 2;
                    _phase = Phase.WaitInside;
                    break;

                case Phase.WaitInside:
                    if (_waitFramesLeft-- > 0) return;
                    if (!GetField<bool>("_isInside"))
                    {
                        Debug.LogError("[PlaytestForestHouseTransition] 문 앞에 다가갔는데도 _isInside가 안 켜짐");
                        _hadError = true;
                        EditorApplication.update -= Tick;
                        EditorApplication.isPlaying = false;
                        return;
                    }
                    Debug.Log($"[PlaytestForestHouseTransition] entered — playerPos={_player.position}");
                    _waitFramesLeft = 5; // CC가 위치를 되돌리는지 몇 프레임 더 지켜본다.
                    _phase = Phase.VerifyInsideSettled;
                    break;

                case Phase.VerifyInsideSettled:
                    if (_waitFramesLeft-- > 0) return;
                    Vector3 indoorLanding = GetField<Vector3>("_entryLandingPosIndoor");
                    if (Vector3.Distance(_player.position, indoorLanding) > 0.5f)
                    {
                        Debug.LogError($"[PlaytestForestHouseTransition] 실내 착지 위치가 몇 프레임 뒤 되돌아감 — expected={indoorLanding} actual={_player.position}");
                        _hadError = true;
                        EditorApplication.update -= Tick;
                        EditorApplication.isPlaying = false;
                        return;
                    }
                    Debug.Log("[PlaytestForestHouseTransition] indoor position held across frames");
                    _phase = Phase.ApproachExit;
                    break;

                case Phase.ApproachExit:
                    TeleportPlayer(GetField<Vector3>("_exitTriggerPosIndoor"));
                    _waitFramesLeft = 2;
                    _phase = Phase.WaitOutside;
                    break;

                case Phase.WaitOutside:
                    if (_waitFramesLeft-- > 0) return;
                    if (GetField<bool>("_isInside"))
                    {
                        Debug.LogError("[PlaytestForestHouseTransition] 실내 출구 앞에 다가갔는데도 _isInside가 안 꺼짐");
                        _hadError = true;
                        EditorApplication.update -= Tick;
                        EditorApplication.isPlaying = false;
                        return;
                    }
                    Debug.Log($"[PlaytestForestHouseTransition] exited — playerPos={_player.position}");
                    _waitFramesLeft = 5;
                    _phase = Phase.VerifyOutsideSettled;
                    break;

                case Phase.VerifyOutsideSettled:
                    if (_waitFramesLeft-- > 0) return;
                    Vector3 outdoorLanding = GetField<Vector3>("_exitLandingPos");
                    if (Vector3.Distance(_player.position, outdoorLanding) > 0.5f)
                    {
                        Debug.LogError($"[PlaytestForestHouseTransition] 실외 착지 위치가 몇 프레임 뒤 되돌아감 — expected={outdoorLanding} actual={_player.position}");
                        _hadError = true;
                        EditorApplication.update -= Tick;
                        EditorApplication.isPlaying = false;
                        return;
                    }
                    Debug.Log("[PlaytestForestHouseTransition] outdoor position held across frames");
                    EditorApplication.update -= Tick;
                    EditorApplication.isPlaying = false;
                    _phase = Phase.Done;
                    break;
            }
        }

        private static T GetField<T>(string name)
        {
            var field = typeof(ForestHouse).GetField(name, BindingFlags.NonPublic | BindingFlags.Instance);
            return (T)field.GetValue(_house);
        }

        /// <summary>테스트 하니스 자신도 CharacterController를 껐다 켜야 한다 —
        /// 안 그러면 우리가 옮긴 위치 자체가 다음 프레임에 되돌아가 트리거를
        /// 영영 못 밟는다(`PlaytestDungeonFloorProgression.cs`와 같은 교훈).</summary>
        private static void TeleportPlayer(Vector3 position)
        {
            if (_playerController != null) _playerController.enabled = false;
            _player.position = position;
            if (_playerController != null) _playerController.enabled = true;
        }
    }
}
