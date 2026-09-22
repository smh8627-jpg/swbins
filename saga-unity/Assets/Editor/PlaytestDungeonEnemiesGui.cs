using System.IO;
using System.Reflection;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Saga.Dungeon.Data;
using Saga.Dungeon.Player;
using Saga.Dungeon.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// 사용자가 "직접 확인해"로 명시적으로 요청했을 때만 쓰는 1회성 GUI
    /// 스크린샷 도구 — TestDungeon 씬에서 Boss(Brute)·Escort(Abe) 무리
    /// 근처로 플레이어를 텔레포트해(카메라가 따라옴, docs/HISTORY.md
    /// 2026-09-13 "44장 Boss 교체" 절의 패턴 재사용) 새로 받은 Mixamo
    /// Abe/Brute 캐릭터가 실제로 렌더링되는지 확인한다. 끝나면 스스로
    /// Play 종료+Unity 프로세스 종료.
    /// </summary>
    public static class PlaytestDungeonEnemiesGui
    {
        private const string ScenePath = "Assets/Scenes/TestDungeon.unity";
        public const string ShotDir =
            "C:/Users/user/AppData/Local/Temp/claude/C--swbins/26eb5289-b330-4562-8ce4-1630217d4eea/scratchpad/unity_screens/";

        private static readonly Vector3 TeleportPos = new Vector3(8.5f, 0.1f, -1.5f);

        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;
        private static int _frame;
        private static int _stage;

        [MenuItem("Saga/Playtest Dungeon Enemies (GUI Screenshot)")]
        public static void Run()
        {
            Directory.CreateDirectory(ShotDir);

            _origEnterPlayModeOptionsEnabled = EditorSettings.enterPlayModeOptionsEnabled;
            _origEnterPlayModeOptions = EditorSettings.enterPlayModeOptions;
            EditorSettings.enterPlayModeOptionsEnabled = true;
            EditorSettings.enterPlayModeOptions =
                EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;

            EditorSceneManager.OpenScene(ScenePath);
            _frame = 0;
            _stage = 0;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        private static void OnStateChanged(PlayModeStateChange state)
        {
            if (state == PlayModeStateChange.EnteredPlayMode)
            {
                EditorApplication.update += Tick;
            }
            else if (state == PlayModeStateChange.EnteredEditMode)
            {
                EditorApplication.playModeStateChanged -= OnStateChanged;
                EditorSettings.enterPlayModeOptionsEnabled = _origEnterPlayModeOptionsEnabled;
                EditorSettings.enterPlayModeOptions = _origEnterPlayModeOptions;
                Debug.Log($"[PlaytestDungeonEnemiesGui] done, screenshots in {ShotDir}");
                EditorApplication.Exit(0);
            }
        }

        private static void Tick()
        {
            _frame++;
            switch (_stage)
            {
                case 0: // 셰이더 변형 컴파일 대기 (66-2장 ⑩과 같은 함정)
                    if (_frame >= 180)
                    {
                        Teleport();
                        _stage = 1;
                        _frame = 0;
                    }
                    break;
                case 1: // 카메라가 새 위치로 따라붙을 시간
                    if (_frame >= 60)
                    {
                        var pgo = GameObject.FindGameObjectWithTag("Player");
                        Debug.Log($"[PlaytestDungeonEnemiesGui] pre-shot player pos: {(pgo != null ? pgo.transform.position.ToString() : "null")}");
                        ScreenCapture.CaptureScreenshot(ShotDir + "10_dungeon_bossgroup.png");
                        _stage = 2;
                        _frame = 0;
                    }
                    break;
                case 2:
                    if (_frame >= 20)
                    {
                        EditorApplication.update -= Tick;
                        EditorApplication.isPlaying = false;
                    }
                    break;
            }
        }

        private static void Teleport()
        {
            var playerGo = GameObject.FindGameObjectWithTag("Player");
            if (playerGo == null)
            {
                Debug.LogError("[PlaytestDungeonEnemiesGui] Player not found");
                return;
            }

            // 확인용 텔레포트 지점이 적 무리 바로 옆이라(의도적) 스크린샷을 찍기
            // 전에 두들겨 맞아 쓰러지면(HeroState.Died) 화면이 세션카드로 덮인다
            // (2026-09-22·2026-09-23 실제로 겪음) — HeroState.Invulnerable은
            // PlayerController.Update()가 매 프레임 _invulnTimeLeft 기준으로
            // 덮어써서(대시 무적 전용 필드) 한 번 켜 봐야 곧바로 꺼진다(경쟁
            // 상태로 실패 확인). 대신 적 AI(DungeonEnemy.Update)를 통째로
            // 꺼서 공격 자체가 안 나가게 한다 — 무적 틴트(하늘색)로 피부색이
            // 가려지는 부작용도 없다. 세이브 안 하고 Play 종료 즉시 프로세스가
            // 죽으니 원복 불필요.
            foreach (var enemy in Object.FindObjectsByType<DungeonEnemy>(FindObjectsSortMode.None))
            {
                enemy.enabled = false;
            }
            HeroState.FullHeal();
            // DungeonFloorRunner가 문 표지 구역 근접을 감지해 방을 새로 진행시키며
            // RepositionPlayerToEntry()로 위치를 되돌린다 — 스크린샷용 텔레포트가
            // 그 트리거 반경에 걸려 조용히 스폰으로 되돌아갔다(실제로 겪음). 확인
            // 동안만 꺼 둔다.
            var floorRunner = Object.FindFirstObjectByType<DungeonFloorRunner>();
            if (floorRunner != null)
            {
                floorRunner.enabled = false;
            }

            var controller = playerGo.GetComponent<CharacterController>();
            if (controller != null)
            {
                controller.enabled = false;
            }
            playerGo.transform.position = TeleportPos;
            if (controller != null)
            {
                controller.enabled = true;
            }

            // 105 Q-U3 피부 확인용(2026-09-23) — `_pitchDeg` 필드만 reflection으로
            // 바꿔서는 화면이 안 바뀌었다(실제로 겪음): `CameraRig.Update()`는
            // 매 프레임 `ApplyZoom()`만 다시 불러 줌(카메라 localPosition)만
            // 반영하고, 회전은 `Awake()`·`Rotate()`(드래그 입력 전용)에서만
            // `transform.localRotation`에 쓰인다 — 헤드리스엔 드래그가 없어
            // 필드를 아무리 바꿔도 실제 회전(기본 pitch=55°, 탑다운)이 안 먹혔다.
            // 그래서 회전은 rig의 `transform.localRotation`을 직접 덮어쓴다.
            // 피벗(`CameraRig` GO)이 플레이어 기준 로컬 (0, 0.9, 0) — 허리
            // 높이라(`BuildTestDungeonScene.BuildPlayer()`) pitch=0(완전 수평)
            // 이면 그 높이에서 정면으로 보는 구도가 된다. 줌도 게임 정상
            // 최소(MinZoom=3)보다 가깝게(2) 당겨 더 크게 보이게 한다 —
            // WallHeight=4m 천장은 pitch=0·zoom=2면 카메라 높이=피벗 높이
            // 그대로(0.9m)라 여유 충분.
            var rig = playerGo.GetComponentInChildren<CameraRig>();
            if (rig != null)
            {
                var t = typeof(CameraRig);
                t.GetField("_zoom", BindingFlags.NonPublic | BindingFlags.Instance)?.SetValue(rig, 2f);
                t.GetField("_pitchDeg", BindingFlags.NonPublic | BindingFlags.Instance)?.SetValue(rig, 0f);
                rig.transform.localRotation = Quaternion.Euler(0f, 0f, 0f);
            }

            // 던전 본연의 어두운 무드 조명이라 Abe/Brute 실루엣만 겨우 보였다
            // (2026-09-19 실제로 겪음) — 캐릭터 디테일만 보려는 확인용이라 이번
            // 샷에서만 조명을 확 올린다(씬 저장 안 함, Play 종료하면 원복).
            foreach (var light in Object.FindObjectsByType<Light>(FindObjectsSortMode.None))
            {
                if (light.type == LightType.Directional)
                {
                    light.intensity = Mathf.Max(light.intensity, 3f);
                }
            }
            RenderSettings.ambientLight = new Color(0.6f, 0.6f, 0.65f);
            RenderSettings.fog = false;

            var fillGo = new GameObject("TempFillLight");
            fillGo.transform.position = TeleportPos + new Vector3(0f, 2.5f, 1.5f);
            var fill = fillGo.AddComponent<Light>();
            fill.type = LightType.Point;
            fill.range = 12f;
            fill.intensity = 8f;
            fill.color = Color.white;
        }
    }
}
