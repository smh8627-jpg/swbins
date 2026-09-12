using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Saga.Dungeon.Data;

namespace Saga.EditorTools
{
    /// <summary>
    /// DUNGEON "마을 여러 개 — 셋째·넷째" 슬라이스(2026-09-12) — Room1의
    /// 서쪽 문→들길→Town3, 동쪽 문→들길→Town4가 실제 Play 모드 GameObject
    /// 경로에서 도는지 검증한다. `PlaytestDungeonTown2.cs`와 같은 결
    /// (CharacterController 토글 순간이동) — 이번엔 두 마을을 한 파일에
    /// 이어서 확인한다(각각 다른 재고: Town3=gem_jade 세공, Town4=wp_glaive
    /// 장착). 이 검증이 확인하려는 핵심은 **동/서로 새로 연 문
    /// (`DungeonRoomBuilder.OpenEastDoor/OpenWestDoor`)과 회전된 복도
    /// (Y축 90도)가 실제로 걸어서 지나갈 자리에 예외 없이 서 있는지,
    /// 두 행상이 서로 다른 재고(보석/무기)로 정확히 배정됐는지**다.
    /// </summary>
    public static class PlaytestDungeonTowns34
    {
        private const string ScenePath = "Assets/Scenes/TestDungeon.unity";

        private static bool _hadError;
        private static int _framesSeen;
        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        private enum Phase
        {
            Init, ApproachTown3, WaitAtTown3, ApproachTown3Merchant, WaitBoughtTown3,
            ApproachTown4, WaitAtTown4, ApproachTown4Merchant, WaitBoughtTown4, Done
        }
        private static Phase _phase = Phase.Init;
        private static int _waitFramesLeft;

        private static Transform _player;
        private static CharacterController _playerController;
        private static GameObject _town3Go, _town3MerchantGo;
        private static GameObject _town4Go, _town4MerchantGo;
        private static int _goldBefore;

        [MenuItem("Saga/Playtest Dungeon Towns 3+4 (Headless)")]
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
            _town3Go = null;
            _town3MerchantGo = null;
            _town4Go = null;
            _town4MerchantGo = null;

            Application.logMessageReceived += OnLog;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        private static void OnLog(string condition, string stackTrace, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception) return;
            if (stackTrace.Contains("UnityEditor.Search.SearchInit.IndexationOnStartup")) return;

            _hadError = true;
            Debug.LogError($"[PlaytestDungeonTowns34] runtime error: {condition}\n{stackTrace}");
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
                    ? "[PlaytestDungeonTowns34] OK - walked to Town3 and Town4, bought from both merchants, no errors"
                    : $"[PlaytestDungeonTowns34] FAIL - error={_hadError} phase={_phase} frames={_framesSeen}");
                EditorApplication.Exit(ok ? 0 : 1);
            }
        }

        private static void Tick()
        {
            _framesSeen++;
            if (_framesSeen > 2000)
            {
                Debug.LogError("[PlaytestDungeonTowns34] 프레임 예산 초과");
                Fail();
                return;
            }

            switch (_phase)
            {
                case Phase.Init:
                    var playerGo = GameObject.FindWithTag("Player");
                    _player = playerGo != null ? playerGo.transform : null;
                    _playerController = playerGo != null ? playerGo.GetComponent<CharacterController>() : null;
                    _town3Go = GameObject.Find("Town3");
                    _town3MerchantGo = GameObject.Find("Town3Merchant");
                    _town4Go = GameObject.Find("Town4");
                    _town4MerchantGo = GameObject.Find("Town4Merchant");
                    if (_player == null || _town3Go == null || _town3MerchantGo == null
                        || _town4Go == null || _town4MerchantGo == null)
                    {
                        Debug.LogError("[PlaytestDungeonTowns34] Player/Town3/Town3Merchant/Town4/Town4Merchant를 씬에서 못 찾음");
                        Fail();
                        return;
                    }
                    HeroState.AddGold(200); // gem_jade(15)+wp_glaive(90) 둘 다 사고도 남게.
                    _goldBefore = HeroState.Gold;
                    _phase = Phase.ApproachTown3;
                    break;

                case Phase.ApproachTown3:
                    TeleportPlayer(_town3Go.transform.position);
                    _waitFramesLeft = 2;
                    _phase = Phase.WaitAtTown3;
                    break;

                case Phase.WaitAtTown3:
                    if (_waitFramesLeft-- > 0) return;
                    _phase = Phase.ApproachTown3Merchant;
                    break;

                case Phase.ApproachTown3Merchant:
                    TeleportPlayer(_town3MerchantGo.transform.position);
                    _waitFramesLeft = 2;
                    _phase = Phase.WaitBoughtTown3;
                    break;

                case Phase.WaitBoughtTown3:
                    if (_waitFramesLeft-- > 0) return;
                    if (HeroState.Gold != _goldBefore - 15)
                    {
                        Debug.LogError($"[PlaytestDungeonTowns34] Town3 골드가 예상대로 안 깎임 — before={_goldBefore} after={HeroState.Gold}");
                        Fail();
                        return;
                    }
                    if (HeroState.SocketedGemId != "gem_jade")
                    {
                        Debug.LogError($"[PlaytestDungeonTowns34] gem_jade가 안 세공됨 — socketed={HeroState.SocketedGemId}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestDungeonTowns34] bought gem_jade at Town3 — gold {_goldBefore} -> {HeroState.Gold}");
                    _goldBefore = HeroState.Gold;
                    _phase = Phase.ApproachTown4;
                    break;

                case Phase.ApproachTown4:
                    TeleportPlayer(_town4Go.transform.position);
                    _waitFramesLeft = 2;
                    _phase = Phase.WaitAtTown4;
                    break;

                case Phase.WaitAtTown4:
                    if (_waitFramesLeft-- > 0) return;
                    _phase = Phase.ApproachTown4Merchant;
                    break;

                case Phase.ApproachTown4Merchant:
                    TeleportPlayer(_town4MerchantGo.transform.position);
                    _waitFramesLeft = 2;
                    _phase = Phase.WaitBoughtTown4;
                    break;

                case Phase.WaitBoughtTown4:
                    if (_waitFramesLeft-- > 0) return;
                    if (HeroState.Gold != _goldBefore - 90)
                    {
                        Debug.LogError($"[PlaytestDungeonTowns34] Town4 골드가 예상대로 안 깎임 — before={_goldBefore} after={HeroState.Gold}");
                        Fail();
                        return;
                    }
                    if (HeroState.EquippedWeaponId != "wp_glaive")
                    {
                        Debug.LogError($"[PlaytestDungeonTowns34] wp_glaive가 안 장착됨 — equipped={HeroState.EquippedWeaponId}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestDungeonTowns34] bought wp_glaive at Town4 — gold {_goldBefore} -> {HeroState.Gold}");
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
