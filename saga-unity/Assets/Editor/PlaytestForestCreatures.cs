using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Saga.Forest.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// FOREST "몬스터·퓨전 콘텐츠" 슬라이스(2026-09-12) — `PlaytestForestHeadless`
    /// (10프레임, 플레이어 안 움직임)는 새 `ForestCreature`가 실제로 Idle→Wander→
    /// Flee 상태를 도는지 전혀 확인 못 한다(가만히 서 있으면 창조물이 굳이 반응할
    /// 이유가 없어서). DUNGEON `PlaytestDungeonFloorProgression.cs`·FOREST
    /// `PlaytestForestFurniture.cs`와 같은 결로, Play 모드에서 실제 위치 변화를
    /// 관찰해 배회·도주가 진짜로 도는지 GameObject 경로로 검증한다.
    /// </summary>
    public static class PlaytestForestCreatures
    {
        private const string ScenePath = "Assets/Scenes/TestVillageForest.unity";
        private static readonly string[] Kinds =
        {
            "dokkaebi", "bawi", "beoseot", "kkot",
            "pojagoemul", "angaeyuryeong", "musoetokkebi", "nabijeongryeong",
        };

        private static bool _hadError;
        private static int _framesSeen;
        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        private enum Phase { Init, WaitWander, CheckWander, ApproachFlee, WaitFlee, CheckFlee, Done }
        private static Phase _phase = Phase.Init;
        private static int _initFramesLeft;
        private static float _waitUntilTime;

        private static Transform _player;
        private static CharacterController _playerController;
        private static readonly Dictionary<string, Transform> _creatures = new Dictionary<string, Transform>();
        private static readonly Dictionary<string, Vector3> _startPos = new Dictionary<string, Vector3>();
        private static Vector3 _fleePosBefore;

        [MenuItem("Saga/Playtest Forest Creatures (Headless)")]
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
            _creatures.Clear();
            _startPos.Clear();

            Application.logMessageReceived += OnLog;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        private static void OnLog(string condition, string stackTrace, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception) return;
            if (stackTrace.Contains("UnityEditor.Search.SearchInit.IndexationOnStartup")) return;

            _hadError = true;
            Debug.LogError($"[PlaytestForestCreatures] runtime error: {condition}\n{stackTrace}");
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
                    ? "[PlaytestForestCreatures] OK - all eight creatures wandered and fled correctly, no errors"
                    : $"[PlaytestForestCreatures] FAIL - error={_hadError} phase={_phase} frames={_framesSeen}");
                EditorApplication.Exit(ok ? 0 : 1);
            }
        }

        private static void Tick()
        {
            _framesSeen++;
            if (_framesSeen > 200000)
            {
                Debug.LogError("[PlaytestForestCreatures] 프레임 예산 초과");
                Fail();
                return;
            }

            switch (_phase)
            {
                case Phase.Init:
                    if (_initFramesLeft-- > 0) return;
                    var playerGo = GameObject.FindWithTag("Player");
                    _player = playerGo != null ? playerGo.transform : null;
                    _playerController = playerGo != null ? playerGo.GetComponent<CharacterController>() : null;
                    foreach (var kind in Kinds)
                    {
                        var go = GameObject.Find($"Creature_{kind}");
                        if (go == null)
                        {
                            Debug.LogError($"[PlaytestForestCreatures] Creature_{kind}을 씬에서 못 찾음");
                            Fail();
                            return;
                        }
                        _creatures[kind] = go.transform;
                        _startPos[kind] = go.transform.position;
                    }
                    if (_player == null)
                    {
                        Debug.LogError("[PlaytestForestCreatures] Player를 씬에서 못 찾음");
                        Fail();
                        return;
                    }
                    // 최대 Idle(3.5초)이 다 지나고도 배회할 시간을 넉넉히 준다.
                    _waitUntilTime = Time.time + 5.5f;
                    _phase = Phase.WaitWander;
                    break;

                case Phase.WaitWander:
                    if (Time.time < _waitUntilTime) return;
                    _phase = Phase.CheckWander;
                    break;

                case Phase.CheckWander:
                    foreach (var kind in Kinds)
                    {
                        float moved = Vector3.Distance(_creatures[kind].position, _startPos[kind]);
                        Debug.Log($"[PlaytestForestCreatures] {kind} moved {moved:F2}m from den after wandering window");
                        if (moved < 0.2f)
                        {
                            Debug.LogError($"[PlaytestForestCreatures] {kind}이(가) 배회 시간이 지나도 거의 안 움직임(moved={moved:F3})");
                            Fail();
                            return;
                        }
                    }
                    _phase = Phase.ApproachFlee;
                    break;

                case Phase.ApproachFlee:
                {
                    // dokkaebi(fleeRadius=6.0) 바로 옆으로 순간이동시켜 도주를 유발한다.
                    var target = _creatures["dokkaebi"];
                    _fleePosBefore = target.position;
                    TeleportPlayer(target.position + new Vector3(1.0f, 0f, 0f));
                    _waitUntilTime = Time.time + 1.0f;
                    _phase = Phase.WaitFlee;
                    break;
                }

                case Phase.WaitFlee:
                    if (Time.time < _waitUntilTime) return;
                    _phase = Phase.CheckFlee;
                    break;

                case Phase.CheckFlee:
                {
                    var target = _creatures["dokkaebi"];
                    float distBefore = Vector3.Distance(_fleePosBefore, _player.position);
                    float distAfter = Vector3.Distance(target.position, _player.position);
                    Debug.Log($"[PlaytestForestCreatures] dokkaebi flee check — distBefore={distBefore:F2} distAfter={distAfter:F2}");
                    if (distAfter <= distBefore + 0.3f)
                    {
                        Debug.LogError("[PlaytestForestCreatures] 플레이어가 다가갔는데도 도주로 멀어지지 않음");
                        Fail();
                        return;
                    }
                    EditorApplication.update -= Tick;
                    EditorApplication.isPlaying = false;
                    _phase = Phase.Done;
                    break;
                }
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
