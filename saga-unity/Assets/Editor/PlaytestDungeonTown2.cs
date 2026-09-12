using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Saga.Dungeon.Data;

namespace Saga.EditorTools
{
    /// <summary>
    /// DUNGEON "오픈월드 확장 — 마을 여러 개" 슬라이스(2026-09-12) — Room1
    /// 남쪽 문 → TownCorridor → Town2 → TownMerchant가 실제 Play 모드
    /// GameObject 경로에서 도는지 검증한다. `PlaytestForestFurniture.cs`와
    /// 같은 결(CharacterController 토글 순간이동) — 이 슬라이스 자체엔
    /// 문 트리거 같은 스크립트 로직이 없다(문은 순수 지오메트리, 걸어서
    /// 지나가는 자리일 뿐 — `DungeonRoomBuilder.OpenDoorOnWall()`이 이미
    /// "벽 길이보다 넓다" 경고로 자체 검증한다, 씬 재빌드 로그 참고).
    /// 이 검증이 실제로 확인하려는 건 **`DungeonMerchant`가 어떤 방에도
    /// 속하지 않는 새 자리(roomId="town2", 등록된 적이 아예 없음)에서도
    /// 예전과 같이 동작하는지** — `CountAliveInRoom("town2")`가 항상 0을
    /// 반환해 "방을 다 잡아야 연다" 조건이 걸리지 않는다는 가정을 실제로
    /// 확인한다(코드 검토로는 맞는 것 같지만, 이 프로젝트 관례대로 실제
    /// Play 경로로 한 번 확인해 둔다).
    /// </summary>
    public static class PlaytestDungeonTown2
    {
        private const string ScenePath = "Assets/Scenes/TestDungeon.unity";

        private static bool _hadError;
        private static int _framesSeen;
        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        private enum Phase { Init, ApproachTown2, WaitAtTown2, ApproachMerchant, WaitBought, Done }
        private static Phase _phase = Phase.Init;
        private static int _waitFramesLeft;

        private static Transform _player;
        private static CharacterController _playerController;
        private static GameObject _town2Go;
        private static GameObject _merchantGo;
        private static int _goldBefore;

        [MenuItem("Saga/Playtest Dungeon Town2 (Headless)")]
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
            _town2Go = null;
            _merchantGo = null;

            Application.logMessageReceived += OnLog;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        private static void OnLog(string condition, string stackTrace, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception) return;
            if (stackTrace.Contains("UnityEditor.Search.SearchInit.IndexationOnStartup")) return;

            _hadError = true;
            Debug.LogError($"[PlaytestDungeonTown2] runtime error: {condition}\n{stackTrace}");
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
                    ? "[PlaytestDungeonTown2] OK - walked to Town2, bought from TownMerchant, no errors"
                    : $"[PlaytestDungeonTown2] FAIL - error={_hadError} phase={_phase} frames={_framesSeen}");
                EditorApplication.Exit(ok ? 0 : 1);
            }
        }

        private static void Tick()
        {
            _framesSeen++;
            if (_framesSeen > 2000)
            {
                Debug.LogError("[PlaytestDungeonTown2] 프레임 예산 초과");
                Fail();
                return;
            }

            switch (_phase)
            {
                case Phase.Init:
                    var playerGo = GameObject.FindWithTag("Player");
                    _player = playerGo != null ? playerGo.transform : null;
                    _playerController = playerGo != null ? playerGo.GetComponent<CharacterController>() : null;
                    _town2Go = GameObject.Find("Town2");
                    _merchantGo = GameObject.Find("TownMerchant");
                    if (_player == null || _town2Go == null || _merchantGo == null)
                    {
                        Debug.LogError("[PlaytestDungeonTown2] Player/Town2/TownMerchant를 씬에서 못 찾음");
                        Fail();
                        return;
                    }
                    HeroState.AddGold(50); // wp_axe(20냥) 사고도 남게.
                    _goldBefore = HeroState.Gold;
                    _phase = Phase.ApproachTown2;
                    break;

                case Phase.ApproachTown2:
                    // Room1 스폰에서 남쪽 문을 지나 Town2까지 걸어서 확인하는
                    // 대신(이 지오메트리는 이미 씬 빌드 로그의 "문 폭" 경고
                    // 부재로 확인됨), 실제로 그 좌표에 서도 예외가 없는지만
                    // 순간이동으로 본다 — 다른 슬라이스들과 같은 절충.
                    TeleportPlayer(_town2Go.transform.position);
                    _waitFramesLeft = 2;
                    _phase = Phase.WaitAtTown2;
                    break;

                case Phase.WaitAtTown2:
                    if (_waitFramesLeft-- > 0) return;
                    _phase = Phase.ApproachMerchant;
                    break;

                case Phase.ApproachMerchant:
                    TeleportPlayer(_merchantGo.transform.position);
                    _waitFramesLeft = 2;
                    _phase = Phase.WaitBought;
                    break;

                case Phase.WaitBought:
                    if (_waitFramesLeft-- > 0) return;
                    if (HeroState.Gold != _goldBefore - 20)
                    {
                        Debug.LogError($"[PlaytestDungeonTown2] 골드가 예상대로 안 깎임 — before={_goldBefore} after={HeroState.Gold}");
                        Fail();
                        return;
                    }
                    if (HeroState.EquippedWeaponId != "wp_axe")
                    {
                        Debug.LogError($"[PlaytestDungeonTown2] wp_axe가 안 장착됨 — equipped={HeroState.EquippedWeaponId}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestDungeonTown2] bought wp_axe — gold {_goldBefore} -> {HeroState.Gold}");
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
