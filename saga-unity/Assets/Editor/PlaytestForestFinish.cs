using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Saga.Forest.Data;

namespace Saga.EditorTools
{
    /// <summary>
    /// FOREST 다음 조각 — "벽지/장판"(`ForestFinishStall`·`ForestHomeState`
    /// 벽지/장판 필드·`ForestHouse.RepaintFinish()`)이 실제 Play 모드
    /// GameObject 경로에서 맞물려 도는지 확인한다. `PlaytestForestFurniture
    /// .cs`와 같은 결(플레이어를 강제로 옮겨 트리거를 밟음).
    /// </summary>
    public static class PlaytestForestFinish
    {
        private const string ScenePath = "Assets/Scenes/TestVillageForest.unity";

        private static bool _hadError;
        private static int _framesSeen;
        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        private enum Phase { Init, ApproachStall, WaitBought, SaveLoadRoundTrip, Done }
        private static Phase _phase = Phase.Init;
        private static int _initFramesLeft;
        private static int _waitFramesLeft;

        private static Transform _player;
        private static CharacterController _playerController;
        private static GameObject _stallGo;

        [MenuItem("Saga/Playtest ForestHouse Finish (Headless)")]
        public static void Run()
        {
            _origEnterPlayModeOptionsEnabled = EditorSettings.enterPlayModeOptionsEnabled;
            _origEnterPlayModeOptions = EditorSettings.enterPlayModeOptions;
            EditorSettings.enterPlayModeOptionsEnabled = true;
            EditorSettings.enterPlayModeOptions =
                EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;

            ForestSaveState.DeleteForTest(); // 이전 헤드리스 실행이 남긴 세이브 무시(ForestSaveState.cs 주석 참고).
            EditorSceneManager.OpenScene(ScenePath);

            _hadError = false;
            _framesSeen = 0;
            _initFramesLeft = 5;
            _phase = Phase.Init;
            _player = null;
            _playerController = null;
            _stallGo = null;

            Application.logMessageReceived += OnLog;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        private static void OnLog(string condition, string stackTrace, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception) return;
            if (stackTrace.Contains("UnityEditor.Search.SearchInit.IndexationOnStartup")) return;

            _hadError = true;
            Debug.LogError($"[PlaytestForestFinish] runtime error: {condition}\n{stackTrace}");
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
                    ? "[PlaytestForestFinish] OK - bought+equipped a finish, score bonus applied, save/load round-trip verified, no errors"
                    : $"[PlaytestForestFinish] FAIL - error={_hadError} phase={_phase} frames={_framesSeen}");
                EditorApplication.Exit(ok ? 0 : 1);
            }
        }

        private static void Tick()
        {
            _framesSeen++;
            if (_framesSeen > 2000)
            {
                Debug.LogError("[PlaytestForestFinish] 프레임 예산 초과");
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
                    _stallGo = GameObject.Find("FinishStall");
                    if (_player == null || _stallGo == null)
                    {
                        Debug.LogError("[PlaytestForestFinish] Player/FinishStall을 씬에서 못 찾음");
                        Fail();
                        return;
                    }
                    if (ForestHomeState.CurrentWall != "earth" || ForestHomeState.CurrentFloor != "wood")
                    {
                        Debug.LogError("[PlaytestForestFinish] 시작 상태 이상 — 기본 벽지/장판이 아님");
                        Fail();
                        return;
                    }
                    ForestState.AddFruit(99999); // 룰렛이 무엇을 내놓든 항상 살 수 있게.
                    _phase = Phase.ApproachStall;
                    break;

                case Phase.ApproachStall:
                    TeleportPlayer(_stallGo.transform.position);
                    _waitFramesLeft = 2;
                    _phase = Phase.WaitBought;
                    break;

                case Phase.WaitBought:
                    if (_waitFramesLeft-- > 0) return;
                    bool changed = ForestHomeState.CurrentWall != "earth" || ForestHomeState.CurrentFloor != "wood";
                    if (!changed)
                    {
                        Debug.LogError("[PlaytestForestFinish] 다가갔는데도 벽지/장판이 안 바뀜(구매/착용 로직 확인 필요)");
                        Fail();
                        return;
                    }
                    var (total, count, bonus, finish) = ForestHomeState.Score();
                    if (finish <= 0)
                    {
                        Debug.LogError($"[PlaytestForestFinish] 벽지/장판을 바꿨는데 점수 보너스가 안 붙음 — finish={finish}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestForestFinish] bought+equipped — wall={ForestHomeState.CurrentWall} floor={ForestHomeState.CurrentFloor} finishBonus={finish} total={total}(count={count},bonus={bonus})");
                    _phase = Phase.SaveLoadRoundTrip;
                    break;

                case Phase.SaveLoadRoundTrip:
                {
                    string wallBefore = ForestHomeState.CurrentWall;
                    string floorBefore = ForestHomeState.CurrentFloor;
                    bool ownsWallBefore = ForestHomeState.OwnsFinish(FinishKind.Wall, wallBefore);
                    bool ownsFloorBefore = ForestHomeState.OwnsFinish(FinishKind.Floor, floorBefore);

                    if (!ForestSaveState.Save())
                    {
                        Debug.LogError("[PlaytestForestFinish] ForestSaveState.Save() 실패");
                        Fail();
                        return;
                    }

                    // 흩트린 뒤(기본으로 되돌림) 다시 불러와 그대로 돌아오는지 확인.
                    ForestHomeState.RestoreFinishes(null, null, null, null);
                    if (ForestHomeState.CurrentWall != "earth" || ForestHomeState.CurrentFloor != "wood")
                    {
                        Debug.LogError("[PlaytestForestFinish] 흩트리기 자체가 안 됨(테스트 전제 오류)");
                        Fail();
                        return;
                    }

                    if (!ForestSaveState.TryLoad())
                    {
                        Debug.LogError("[PlaytestForestFinish] ForestSaveState.TryLoad() 실패");
                        Fail();
                        return;
                    }
                    if (ForestHomeState.CurrentWall != wallBefore || ForestHomeState.CurrentFloor != floorBefore ||
                        ForestHomeState.OwnsFinish(FinishKind.Wall, wallBefore) != ownsWallBefore ||
                        ForestHomeState.OwnsFinish(FinishKind.Floor, floorBefore) != ownsFloorBefore)
                    {
                        Debug.LogError($"[PlaytestForestFinish] 로드 후 불일치 — wall={ForestHomeState.CurrentWall}(기대={wallBefore}) floor={ForestHomeState.CurrentFloor}(기대={floorBefore})");
                        Fail();
                        return;
                    }
                    Debug.Log("[PlaytestForestFinish] save/load round-trip OK");
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
