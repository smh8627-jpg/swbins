using System.Collections;
using System.Reflection;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Saga.Dungeon.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// "DUNGEON 오픈월드 확장 — 절차적 층 진행" 슬라이스가 끝난 뒤 `docs/
    /// PROJECT_STATE.md` "다음 작업"이 적어 둔 빈틈을 메우는 도구 —
    /// `PlaytestDungeonHeadless`(10프레임, 플레이어가 안 움직임)는 ProcRoom
    /// 첫 방(전투) 스폰까지만 확인하지, 문 선택 트리거(`ShowKindDoors`/
    /// `BuildDoorPod`/`AdvanceRoom`)나 층 하강(`Descend`)이 실제로 도는지는
    /// 이 프로젝트의 어떤 자동 검증도 아직 통과 안 시켰다(`SimulateDungeonFloors
    /// .cs`는 공식(숫자)만 검증했지 실제 GameObject 생성 경로(TextMesh 폰트·
    /// 머티리얼·`DoorLabelBillboard` 중첩 컴포넌트 등)는 안 건드린다).
    ///
    /// Play 모드에서 ProcRoom 몬스터를 코드로 강제로 죽이고(`DungeonEnemy
    /// .TakeDamage`), 문 표지가 실제로 세워지면 플레이어를 그 위치로
    /// 순간이동시켜 `AdvanceRoom`/`Descend`가 실제로 도는지까지 여러 방·
    /// 여러 층에 걸쳐 헤드리스로 확인한다.
    /// </summary>
    public static class PlaytestDungeonFloorProgression
    {
        private const string ScenePath = "Assets/Scenes/TestDungeon.unity";
        private const int TargetAdvances = 12; // ProcRoom 방 전환을 최소 12번(층 하강 최소 한 번 포함) 확인.
        private const int FrameBudget = 400;   // 이 안에 못 끝내면 뭔가 걸린 것 — FAIL.

        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        private static bool _hadError;
        private static int _framesSeen;
        private static int _initFramesLeft = 5;
        private static int _advancesDone;
        private static int _waitFramesLeft;
        private static int _highestFloorSeen = 2;
        private static Transform _player;
        private static CharacterController _playerController;
        private static DungeonFloorRunner _runner;

        private enum Phase { Init, Kill, WaitDoors, Teleport, WaitAdvance, Done }
        private static Phase _phase = Phase.Init;

        [MenuItem("Saga/Playtest TestDungeon Floor Progression (Headless)")]
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
            _advancesDone = 0;
            _waitFramesLeft = 0;
            _highestFloorSeen = 2;
            _phase = Phase.Init;
            _player = null;
            _runner = null;

            Application.logMessageReceived += OnLog;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        private static void OnLog(string condition, string stackTrace, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception) return;
            if (stackTrace.Contains("UnityEditor.Search.SearchInit.IndexationOnStartup")) return;

            _hadError = true;
            Debug.LogError($"[PlaytestDungeonFloorProgression] runtime error: {condition}\n{stackTrace}");
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

                bool ok = !_hadError && _advancesDone >= TargetAdvances && _highestFloorSeen > 2;
                Debug.Log(ok
                    ? $"[PlaytestDungeonFloorProgression] OK - {_advancesDone} room advances, floor reached {_highestFloorSeen}, no errors"
                    : $"[PlaytestDungeonFloorProgression] FAIL - error={_hadError} advances={_advancesDone}/{TargetAdvances} highestFloor={_highestFloorSeen} frames={_framesSeen}");
                EditorApplication.Exit(ok ? 0 : 1);
            }
        }

        private static void Tick()
        {
            _framesSeen++;
            if (_framesSeen > FrameBudget)
            {
                EditorApplication.update -= Tick;
                EditorApplication.isPlaying = false;
                return;
            }

            switch (_phase)
            {
                case Phase.Init:
                    if (_initFramesLeft-- > 0) return;
                    _player = GameObject.FindWithTag("Player")?.transform;
                    _playerController = _player != null ? _player.GetComponent<CharacterController>() : null;
                    _runner = Object.FindFirstObjectByType<DungeonFloorRunner>();
                    if (_player == null || _runner == null)
                    {
                        Debug.LogError("[PlaytestDungeonFloorProgression] Player 또는 DungeonFloorRunner를 씬에서 못 찾음");
                        _hadError = true;
                        EditorApplication.update -= Tick;
                        EditorApplication.isPlaying = false;
                        return;
                    }
                    _phase = Phase.Kill;
                    break;

                case Phase.Kill:
                    KillProcRoomEnemies();
                    _waitFramesLeft = 2;
                    _phase = Phase.WaitDoors;
                    break;

                case Phase.WaitDoors:
                    if (_waitFramesLeft-- > 0) return;
                    if (TryTeleportToFirstDoorPod())
                    {
                        _waitFramesLeft = 2;
                        _phase = Phase.WaitAdvance;
                    }
                    else if (_waitFramesLeft > -10)
                    {
                        return; // 문 표지가 아직 안 세워졌다 — 몇 프레임 더 기다린다.
                    }
                    else
                    {
                        Debug.LogError("[PlaytestDungeonFloorProgression] 문 표지가 끝내 안 세워짐");
                        _hadError = true;
                        EditorApplication.update -= Tick;
                        EditorApplication.isPlaying = false;
                    }
                    break;

                case Phase.WaitAdvance:
                    if (_waitFramesLeft-- > 0) return;
                    _advancesDone++;
                    int floor = _runner.CurrentFloor;
                    if (floor > _highestFloorSeen) _highestFloorSeen = floor;
                    Debug.Log($"[PlaytestDungeonFloorProgression] advance {_advancesDone}/{TargetAdvances} — floor={floor}");
                    if (_advancesDone >= TargetAdvances)
                    {
                        EditorApplication.update -= Tick;
                        EditorApplication.isPlaying = false;
                    }
                    else
                    {
                        _phase = Phase.Kill;
                    }
                    break;
            }
        }

        private static void KillProcRoomEnemies()
        {
            var roomIdField = typeof(DungeonFloorRunner).GetField("RoomId", BindingFlags.NonPublic | BindingFlags.Static);
            string roomId = (string)roomIdField.GetValue(null);
            var enemyRoomIdField = typeof(DungeonEnemy).GetField("roomId", BindingFlags.NonPublic | BindingFlags.Instance);

            // Active는 순회 중 Die()가 리스트를 바꿀 수 있어 스냅샷을 뜬다.
            var snapshot = new System.Collections.Generic.List<DungeonEnemy>(DungeonEnemy.Active);
            foreach (var enemy in snapshot)
            {
                if (enemy == null) continue;
                string enemyRoomId = (string)enemyRoomIdField.GetValue(enemy);
                if (enemyRoomId != roomId) continue;
                enemy.TakeDamage(999999f);
            }
        }

        /// <summary>ProcRoom에 세워진 문 표지 중 첫째로 플레이어를 순간이동시킨다.
        /// `DungeonFloorRunner._doorPods`(private)를 리플렉션으로 읽는다 — 아직
        /// 안 세워졌으면 false.</summary>
        private static bool TryTeleportToFirstDoorPod()
        {
            var doorPodsField = typeof(DungeonFloorRunner).GetField("_doorPods", BindingFlags.NonPublic | BindingFlags.Instance);
            var list = doorPodsField.GetValue(_runner) as IList;
            if (list == null || list.Count == 0) return false;

            object first = list[0];
            var itemType = first.GetType();
            var pod = (Transform)itemType.GetField("Item1").GetValue(first);
            var kind = (string)itemType.GetField("Item2").GetValue(first);
            if (pod == null) return false;

            var floorField = typeof(DungeonFloorRunner).GetField("_floor", BindingFlags.NonPublic | BindingFlags.Instance);
            var roomIndexField = typeof(DungeonFloorRunner).GetField("_roomIndex", BindingFlags.NonPublic | BindingFlags.Instance);
            var roomTotalField = typeof(DungeonFloorRunner).GetField("_roomTotal", BindingFlags.NonPublic | BindingFlags.Instance);
            Debug.Log($"[PlaytestDungeonFloorProgression] pre-teleport state floor={floorField.GetValue(_runner)} roomIndex={roomIndexField.GetValue(_runner)} roomTotal={roomTotalField.GetValue(_runner)} podCount={list.Count} chosenKind={kind} podLocalPos={pod.localPosition} playerPosBefore={_player.position}");

            // CharacterController가 켜져 있으면 transform.position 대입이 다음 프레임에
            // 조용히 되돌아간다(CC가 자기 내부 캡슐 상태로 위치를 다시 맞춤) — 이 프로젝트가
            // 안 밟은, 순수 테스트 하니스 쪽 문제(끄고 옮기고 다시 켜야 실제로 이동함).
            if (_playerController != null) _playerController.enabled = false;
            _player.position = pod.position;
            if (_playerController != null) _playerController.enabled = true;
            Debug.Log($"[PlaytestDungeonFloorProgression] teleport to door kind={kind} podWorldPos={pod.position}");
            return true;
        }
    }
}
