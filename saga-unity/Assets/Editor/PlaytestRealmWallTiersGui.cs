using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Saga.Realm.Data;
using Saga.Realm.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// 사용자가 "직접 실기해"로 명시적으로 요청했을 때만 쓰는 1회성 GUI
    /// 스크린샷 도구(`PlaytestDungeonEnemiesGui.cs`와 같은 결) — PLAN.md 103-1
    /// "REALM 성벽 3단"(2026-09-22)이 실제로 화면에 보이는지 `record.Wall`을
    /// 0/1/2단 경계값으로 직접 올리며 성 디오라마를 세 번 찍는다. REALM엔
    /// 걸어 다니는 플레이어가 없어(`RealmCityBuilder.cs` 클래스 주석) 텔레포트
    /// 대신 `RealmOrbitCamera`의 기본 조망 그대로 쓴다. 끝나면 스스로 Play
    /// 종료+Unity 프로세스 종료.
    /// </summary>
    public static class PlaytestRealmWallTiersGui
    {
        private const string ScenePath = "Assets/Scenes/TestCity.unity";
        public const string ShotDir =
            "C:/Users/user/AppData/Local/Temp/claude/C--swbins/ed93fe4d-26ed-4226-9dba-82a8fa65cb83/scratchpad/unity_screens/";

        private static readonly string[] Shots =
        {
            "30_realm_wall_tier0.png",
            "31_realm_wall_tier1.png",
            "32_realm_wall_tier2.png",
        };

        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;
        private static int _frame;
        private static int _stopIndex;
        private static int _phase; // 0=값 적용+대기, 1=찍음
        private static RealmCityBuilder _builder;
        private static RealmCityRecord _record;
        private static RealmCityDef _def;

        [MenuItem("Saga/Playtest Realm Wall Tiers (GUI Screenshot)")]
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
            _stopIndex = -1;
            _phase = 1;
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
                Debug.Log($"[PlaytestRealmWallTiersGui] done, screenshots in {ShotDir}");
                EditorApplication.Exit(0);
            }
        }

        private static void Tick()
        {
            _frame++;

            if (_phase == 1)
            {
                _stopIndex++;
                if (_stopIndex >= Shots.Length)
                {
                    EditorApplication.update -= Tick;
                    EditorApplication.isPlaying = false;
                    return;
                }
                if (!ApplyTier(_stopIndex)) return;
                _phase = 0;
                _frame = 0;
                return;
            }

            int waitFrames = _stopIndex == 0 ? 180 : 20; // 66-2장 ⑩ 셰이더 변형 컴파일 함정, 첫 지점만 넉넉히.
            if (_frame >= waitFrames)
            {
                ScreenCapture.CaptureScreenshot(ShotDir + Shots[_stopIndex]);
                Debug.Log($"[PlaytestRealmWallTiersGui] shot {_stopIndex}: {Shots[_stopIndex]}");
                _phase = 1;
                _frame = 0;
            }
        }

        private static bool ApplyTier(int tier)
        {
            if (_builder == null)
            {
                var cityGo = GameObject.Find("City");
                _builder = cityGo != null ? cityGo.GetComponent<RealmCityBuilder>() : null;
                _def = RealmCityData.Get(RealmCityState.CurrentCity);
                _record = RealmCityState.CityRecord(RealmCityState.CurrentCity);
                if (_builder == null || _def == null || _record == null)
                {
                    Debug.LogError("[PlaytestRealmWallTiersGui] City/def/record not found");
                    return false;
                }
            }

            // WallTier() 문턱(1.33/1.67, DungeonRoomBuilder.RoomWearTier와 같은 삼등분)을
            // 확실히 넘도록 각 단의 가운데 값을 쓴다.
            float[] ratioAt = { 1f, 1.5f, 2f };
            _record.Wall = Mathf.RoundToInt(_def.BaseWall * ratioAt[tier]);
            _builder.Rebuild();
            return true;
        }
    }
}
