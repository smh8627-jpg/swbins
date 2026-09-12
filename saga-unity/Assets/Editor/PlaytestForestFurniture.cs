using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Saga.Forest.Data;
using Saga.Forest.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// FOREST "집 꾸미기(가구)" 슬라이스(2026-09-12) — `ForestFurnitureStall`
    /// (구매)·`ForestFurnitureAnchor`(놓기/거두기)·`ForestHomeState`(점수)가
    /// 실제 Play 모드 GameObject 경로에서 맞물려 도는지 검증한다. `PlaytestForestHouseTransition
    /// .cs`와 같은 결 — 플레이어를 강제로 옮겨 트리거를 밟되, `CharacterController`
    /// 순간이동 반영 문제(같은 세션에서 두 번 겪음)를 다시 밟지 않게 토글한다.
    /// </summary>
    public static class PlaytestForestFurniture
    {
        private const string ScenePath = "Assets/Scenes/TestVillageForest.unity";

        private static bool _hadError;
        private static int _framesSeen;
        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        private enum Phase { Init, ApproachStall, WaitBought, ApproachAnchor, WaitPlaced, LeaveAnchor, WaitCooldown, ReturnAnchor, WaitPickedUp, Done }
        private static Phase _phase = Phase.Init;
        private static int _waitFramesLeft;
        private static int _initFramesLeft;
        private static int _buyAttemptsLeft;
        private static float _waitUntilTime;

        private static Transform _player;
        private static CharacterController _playerController;
        private static GameObject _stallGo;
        private static GameObject _anchorGo;

        [MenuItem("Saga/Playtest ForestHouse Furniture (Headless)")]
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
            _buyAttemptsLeft = 20; // 룰렛이 랜덤이라 한 번에 안 사질 수 있어 여러 번 시도한다.
            _phase = Phase.Init;
            _player = null;
            _playerController = null;
            _stallGo = null;
            _anchorGo = null;

            Application.logMessageReceived += OnLog;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        private static void OnLog(string condition, string stackTrace, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception) return;
            if (stackTrace.Contains("UnityEditor.Search.SearchInit.IndexationOnStartup")) return;

            _hadError = true;
            Debug.LogError($"[PlaytestForestFurniture] runtime error: {condition}\n{stackTrace}");
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
                    ? "[PlaytestForestFurniture] OK - bought, placed and picked up furniture, score changed as expected, no errors"
                    : $"[PlaytestForestFurniture] FAIL - error={_hadError} phase={_phase} frames={_framesSeen}");
                EditorApplication.Exit(ok ? 0 : 1);
            }
        }

        private static void Tick()
        {
            _framesSeen++;
            if (_framesSeen > 20000) // 쿨다운 하나가 Time.time 기준 1.3초라 프레임 수가 넉넉해야 한다.
            {
                Debug.LogError("[PlaytestForestFurniture] 프레임 예산 초과");
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
                    _stallGo = GameObject.Find("FurnitureStall");
                    _anchorGo = GameObject.Find("FurnitureAnchor_0");
                    if (_player == null || _stallGo == null || _anchorGo == null)
                    {
                        Debug.LogError("[PlaytestForestFurniture] Player/FurnitureStall/FurnitureAnchor_0을 씬에서 못 찾음");
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
                    if (TotalStock() > 0)
                    {
                        Debug.Log($"[PlaytestForestFurniture] bought — totalStock={TotalStock()} fruit={ForestState.FruitCount}");
                        _phase = Phase.ApproachAnchor;
                        break;
                    }
                    if (--_buyAttemptsLeft <= 0)
                    {
                        Debug.LogError("[PlaytestForestFurniture] 여러 번 다가가도 구매가 안 됨(쿨다운 로직 확인 필요)");
                        Fail();
                        return;
                    }
                    // 쿨다운 때문일 수 있다 — 자리에서 잠깐 떨어졌다 다시 다가간다.
                    TeleportPlayer(_stallGo.transform.position + new Vector3(3f, 0f, 0f));
                    _waitFramesLeft = 8;
                    _phase = Phase.ApproachStall;
                    break;

                case Phase.ApproachAnchor:
                    TeleportPlayer(_anchorGo.transform.position);
                    _waitFramesLeft = 2;
                    _phase = Phase.WaitPlaced;
                    break;

                case Phase.WaitPlaced:
                    if (_waitFramesLeft-- > 0) return;
                    if (string.IsNullOrEmpty(ForestHomeState.AnchorItem(0)))
                    {
                        Debug.LogError("[PlaytestForestFurniture] 창고에 재고가 있는데도 자리에 안 놓임");
                        Fail();
                        return;
                    }
                    var (total, count, _) = ForestHomeState.Score();
                    if (total <= 0 || count != 1)
                    {
                        Debug.LogError($"[PlaytestForestFurniture] 점수 계산이 이상함 — total={total} count={count}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestForestFurniture] placed — item={ForestHomeState.AnchorItem(0)} score={total}");
                    _phase = Phase.LeaveAnchor;
                    break;

                case Phase.LeaveAnchor:
                    TeleportPlayer(_anchorGo.transform.position + new Vector3(0f, 0f, 5f));
                    // ForestFurnitureAnchor의 쿨다운(1초, Time.deltaTime 기준)이 실제로
                    // 지나야 다시 트리거된다 — 프레임 수가 아니라 Time.time으로 기다린다
                    // (배치 모드는 프레임이 실시간보다 훨씬 빨리 돌 수 있어서, 처음엔
                    // 프레임 2장만 기다렸다가 쿨다운이 안 끝나 실패했었다).
                    _waitUntilTime = Time.time + 1.3f;
                    Debug.Log($"[PlaytestForestFurniture] waiting for cooldown — Time.time={Time.time} target={_waitUntilTime}");
                    _phase = Phase.WaitCooldown;
                    break;

                case Phase.WaitCooldown:
                    if (Time.time < _waitUntilTime) return;
                    _phase = Phase.ReturnAnchor;
                    break;

                case Phase.ReturnAnchor:
                    TeleportPlayer(_anchorGo.transform.position);
                    _waitFramesLeft = 2;
                    _phase = Phase.WaitPickedUp;
                    break;

                case Phase.WaitPickedUp:
                    if (_waitFramesLeft-- > 0) return;
                    if (!string.IsNullOrEmpty(ForestHomeState.AnchorItem(0)))
                    {
                        Debug.LogError("[PlaytestForestFurniture] 다시 다가갔는데도 안 거둬짐(놓기/거두기가 같은 트리거로 뒤집혀야 함)");
                        Fail();
                        return;
                    }
                    var (totalAfter, countAfter, _) = ForestHomeState.Score();
                    if (totalAfter != 0 || countAfter != 0)
                    {
                        Debug.LogError($"[PlaytestForestFurniture] 거둔 뒤 점수가 0으로 안 돌아감 — total={totalAfter} count={countAfter}");
                        Fail();
                        return;
                    }
                    Debug.Log("[PlaytestForestFurniture] picked up — score back to 0");
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

        private static int TotalStock()
        {
            int sum = 0;
            foreach (var item in FurnitureItem.Catalog) sum += ForestHomeState.StockCount(item.Id);
            return sum;
        }

        private static void TeleportPlayer(Vector3 position)
        {
            if (_playerController != null) _playerController.enabled = false;
            _player.position = position;
            if (_playerController != null) _playerController.enabled = true;
        }
    }
}
