using System.Reflection;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;
using Saga.Dungeon.UI;

namespace Saga.EditorTools
{
    /// <summary>
    /// DUNGEON "오버월드 지도 UI" 슬라이스(2026-09-12) — `OverworldMapUI.cs`가
    /// 플레이어 위치를 남/서/동/북/중심 다섯 칸 중 올바른 칸으로 강조하는지
    /// 확인한다. M키 입력 자체(`Keyboard.current.mKey`)는 이 프로젝트가
    /// 이미 스페이스바(PlayerCombat)·왼쪽 Alt(강공격) 등에서 검증 없이도
    /// 써 온 표준 Input System 패턴이라 새로 흉내 내지 않고, **핵심 로직인
    /// "좌표→강조 칸" 매핑**만 리플렉션으로 직접 불러 검증한다
    /// (`PlaytestDungeonFloorProgression.cs`가 private `_doorPods`를 읽는
    /// 것과 같은 결).
    /// </summary>
    public static class PlaytestOverworldMap
    {
        private const string ScenePath = "Assets/Scenes/TestDungeon.unity";

        private static bool _hadError;
        private static int _framesSeen;
        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        private enum Phase { Init, Checking, Done }
        private static Phase _phase = Phase.Init;

        private static Transform _player;
        private static CharacterController _playerController;
        private static OverworldMapUI _mapUi;
        private static GameObject _panel;

        [MenuItem("Saga/Playtest Overworld Map (Headless)")]
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
            _mapUi = null;
            _panel = null;

            Application.logMessageReceived += OnLog;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        private static void OnLog(string condition, string stackTrace, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception) return;
            if (stackTrace.Contains("UnityEditor.Search.SearchInit.IndexationOnStartup")) return;

            _hadError = true;
            Debug.LogError($"[PlaytestOverworldMap] runtime error: {condition}\n{stackTrace}");
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
                    ? "[PlaytestOverworldMap] OK - region highlight matched all five positions, panel starts hidden, no errors"
                    : $"[PlaytestOverworldMap] FAIL - error={_hadError} phase={_phase} frames={_framesSeen}");
                EditorApplication.Exit(ok ? 0 : 1);
            }
        }

        private static void Tick()
        {
            _framesSeen++;
            if (_framesSeen > 2000)
            {
                Debug.LogError("[PlaytestOverworldMap] 프레임 예산 초과");
                Fail();
                return;
            }

            switch (_phase)
            {
                case Phase.Init:
                    var playerGo = GameObject.FindWithTag("Player");
                    _player = playerGo != null ? playerGo.transform : null;
                    _playerController = playerGo != null ? playerGo.GetComponent<CharacterController>() : null;
                    var mapGo = GameObject.Find("OverworldMapUI");
                    _mapUi = mapGo != null ? mapGo.GetComponent<OverworldMapUI>() : null;
                    if (_player == null || _mapUi == null)
                    {
                        Debug.LogError("[PlaytestOverworldMap] Player/OverworldMapUI를 씬에서 못 찾음");
                        Fail();
                        return;
                    }

                    _panel = (GameObject)GetPrivate(_mapUi, "panel");
                    if (_panel == null || _panel.activeSelf)
                    {
                        Debug.LogError($"[PlaytestOverworldMap] 패널이 시작부터 열려 있음(닫힌 채 시작해야 함) — active={_panel?.activeSelf}");
                        Fail();
                        return;
                    }

                    // M키 시뮬레이션 없이 "열린 상태"만 강제해 강조 로직을 바로 검증(위 클래스 주석 참고).
                    SetPrivate(_mapUi, "_visible", true);

                    if (!CheckRegion(new Vector3(0f, 0f, -30f), "southCell") // Town2
                        || !CheckRegion(new Vector3(-30f, 0f, 0f), "westCell") // Town3
                        || !CheckRegion(new Vector3(30f, 0f, 0f), "eastCell") // Town4
                        || !CheckRegion(new Vector3(0f, 0f, 60f), "northCell") // Room3(던전 방향)
                        || !CheckRegion(new Vector3(0f, 0f, 0f), "centerCell")) // Room1
                    {
                        Fail();
                        return;
                    }

                    Debug.Log("[PlaytestOverworldMap] all five region checks passed");
                    EditorApplication.update -= Tick;
                    EditorApplication.isPlaying = false;
                    _phase = Phase.Done;
                    break;
            }
        }

        private static bool CheckRegion(Vector3 pos, string expectedFieldName)
        {
            _playerController.enabled = false;
            _player.position = pos;
            _playerController.enabled = true;

            InvokePrivate(_mapUi, "UpdateHighlight");

            string[] cellFields = { "centerCell", "northCell", "southCell", "westCell", "eastCell" };
            foreach (var fieldName in cellFields)
            {
                var img = (Image)GetPrivate(_mapUi, fieldName);
                if (img == null)
                {
                    Debug.LogError($"[PlaytestOverworldMap] {fieldName}이 안 채워짐");
                    return false;
                }
                bool shouldBeHighlighted = fieldName == expectedFieldName;
                bool isHighlighted = img.color.a > 0.3f; // HighlightColor.a=0.55, DimColor.a=0.12
                if (shouldBeHighlighted != isHighlighted)
                {
                    Debug.LogError($"[PlaytestOverworldMap] pos={pos} 기대={expectedFieldName} — {fieldName} highlighted={isHighlighted}(기대={shouldBeHighlighted})");
                    return false;
                }
            }
            return true;
        }

        private static void Fail()
        {
            _hadError = true;
            EditorApplication.update -= Tick;
            EditorApplication.isPlaying = false;
        }

        private static object GetPrivate(object target, string fieldName)
        {
            var field = target.GetType().GetField(fieldName, BindingFlags.NonPublic | BindingFlags.Instance);
            return field?.GetValue(target);
        }

        private static void SetPrivate(object target, string fieldName, object value)
        {
            var field = target.GetType().GetField(fieldName, BindingFlags.NonPublic | BindingFlags.Instance);
            field?.SetValue(target, value);
        }

        private static void InvokePrivate(object target, string methodName)
        {
            var method = target.GetType().GetMethod(methodName, BindingFlags.NonPublic | BindingFlags.Instance);
            method?.Invoke(target, null);
        }
    }
}
