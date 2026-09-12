using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Saga.Realm.Data;
using Saga.Realm.World;
using Saga.Realm.UI;

namespace Saga.EditorTools
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 5절 완료 조건을 실제 Play 모드에서 확인한다
    /// (`PlaytestStorySlice.cs`와 같은 결). REALM엔 플레이어 조작이 없어
    /// (턴제 경영, 1절) 순간이동·키 시뮬레이션 대신 `RealmCityState`의
    /// 공개 API를 직접 불러 **판정 경로**를 검증한다 — 이 프로젝트의
    /// 다른 Playtest들도 스킬·명령 로직은 컴포넌트를 직접 부르지 UI 버튼을
    /// 클릭 시뮬레이션하지 않는다(PlaytestStorySlice.cs 클래스 주석과
    /// 같은 선례). 버튼 배선 자체(RealmCommandUi.cs)는 사람이 GUI로
    /// 확인해야 한다.
    /// (1) 개간 명령 — 금 차감·개간 수치 증가,
    /// (2) 상업 명령 — 금 차감·상업 수치 증가,
    /// (3) 다음 달 정산 — 금이 공식대로 바뀌는지(수확달이 아니라 군량은
    /// 그대로),
    /// (4) 수색 — 재야 하나를 찾는지,
    /// (5) 등용 — 찾아낸 재야가 로스터에 합류하는지(확률 판정이라 성공할
    /// 때까지 반복),
    /// (6) 저장/불러오기 왕복.
    /// </summary>
    public static class PlaytestRealmSlice
    {
        private const string ScenePath = "Assets/Scenes/TestCity.unity";
        private const int MaxHireAttempts = 20;

        private static bool _hadError;
        private static int _framesSeen;
        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        private enum Phase { Init, Agri, SettleAfterAgri, Comm, SettleAfterComm, Search, SettleAfterSearch, Hire, SaveLoad, Done }
        private static Phase _phase = Phase.Init;
        private static int _hireAttempts;
        private static int _goldBeforeSettle;
        private static int _foodBeforeSettle;

        [MenuItem("Saga/Playtest Realm Slice (Headless)")]
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
            _hireAttempts = 0;

            Application.logMessageReceived += OnLog;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        private static void OnLog(string condition, string stackTrace, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception) return;
            if (stackTrace.Contains("UnityEditor.Search.SearchInit.IndexationOnStartup")) return;

            _hadError = true;
            Debug.LogError($"[PlaytestRealmSlice] runtime error: {condition}\n{stackTrace}");
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
                    ? "[PlaytestRealmSlice] OK - agri/comm/settle/search/hire/save-load all verified, no errors"
                    : $"[PlaytestRealmSlice] FAIL - error={_hadError} phase={_phase} frames={_framesSeen}");
                EditorApplication.Exit(ok ? 0 : 1);
            }
        }

        private static void Tick()
        {
            _framesSeen++;
            if (_framesSeen > 2000)
            {
                Debug.LogError("[PlaytestRealmSlice] 프레임 예산 초과");
                Fail();
                return;
            }

            switch (_phase)
            {
                case Phase.Init:
                    if (GameObject.Find("City") == null || GameObject.Find("RealmCameraRig") == null ||
                        Object.FindFirstObjectByType<RealmHud>() == null || Object.FindFirstObjectByType<RealmCommandUi>() == null)
                    {
                        Debug.LogError("[PlaytestRealmSlice] 씬 구성 못 찾음 — City/RealmCameraRig/RealmHud/RealmCommandUi 중 일부 없음");
                        Fail();
                        return;
                    }
                    if (RealmCityState.Gold != RealmCityState.StartingGold || RealmCityState.RosterIds.Count != 1)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 시작 상태 이상 — gold={RealmCityState.Gold} roster={RealmCityState.RosterIds.Count}");
                        Fail();
                        return;
                    }
                    _phase = Phase.Agri;
                    break;

                case Phase.Agri:
                {
                    int goldBefore = RealmCityState.Gold;
                    int agriBefore = RealmCityState.Agri;
                    var result = RealmCityState.ExecuteOrder("agri");
                    if (!result.Ok || RealmCityState.Gold != goldBefore - RealmOrderData.Get("agri").Gold || RealmCityState.Agri <= agriBefore)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 개간 실패 — ok={result.Ok} gold={RealmCityState.Gold}(기대={goldBefore - RealmOrderData.Get("agri").Gold}) agri={RealmCityState.Agri}(이전={agriBefore})");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] agri OK - {result.Message}");
                    RealmCityState.NextMonth();
                    _phase = Phase.Comm;
                    break;
                }

                case Phase.Comm:
                {
                    int goldBefore = RealmCityState.Gold;
                    int commBefore = RealmCityState.Comm;
                    var result = RealmCityState.ExecuteOrder("comm");
                    if (!result.Ok || RealmCityState.Gold != goldBefore - RealmOrderData.Get("comm").Gold || RealmCityState.Comm <= commBefore)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 상업 실패 — ok={result.Ok} gold={RealmCityState.Gold}(기대={goldBefore - RealmOrderData.Get("comm").Gold}) comm={RealmCityState.Comm}(이전={commBefore})");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] comm OK - {result.Message}");
                    _goldBeforeSettle = RealmCityState.Gold;
                    _foodBeforeSettle = RealmCityState.Food;
                    _phase = Phase.SettleAfterComm;
                    break;
                }

                case Phase.SettleAfterComm:
                {
                    // 시작 달(1월)에서 두 번 다음 달로 넘겼으니 지금은 3월 —
                    // 수확달(6·10월)이 아니라 군량은 그대로여야 한다.
                    int monthBefore = RealmCityState.Month;
                    string summary = RealmCityState.NextMonth();
                    int expectedIncome = Mathf.RoundToInt(RealmCityState.Comm * 0.55f * (0.5f + Mathf.Clamp(RealmCityState.Sec + 1, 0, 100) / 200f));
                    // Sec는 정산 중 -1 됐으니 계산 전 값(+1)으로 되돌려 손 계산.
                    int upkeep = RealmCityState.RosterIds.Count * RealmCityState.UpkeepPerOfficer;
                    int expectedGold = Mathf.Max(0, _goldBeforeSettle + expectedIncome - upkeep);
                    if (RealmCityState.Gold != expectedGold)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 정산 금 불일치 — gold={RealmCityState.Gold}(기대={expectedGold}) summary={summary}");
                        Fail();
                        return;
                    }
                    if (RealmCityState.Food != _foodBeforeSettle)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 수확달이 아닌데 군량이 바뀜 — food={RealmCityState.Food}(이전={_foodBeforeSettle}) month={monthBefore}->{RealmCityState.Month}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] settle OK - {summary}");
                    _phase = Phase.Search;
                    break;
                }

                case Phase.Search:
                {
                    int foundBefore = RealmCityState.FoundIds.Count;
                    var result = RealmCityState.ExecuteOrder("search");
                    if (!result.Ok || RealmCityState.FoundIds.Count != foundBefore + 1)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 수색 실패 — ok={result.Ok} found={RealmCityState.FoundIds.Count}(기대={foundBefore + 1}) msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] search OK - {result.Message}");
                    RealmCityState.NextMonth();
                    _phase = Phase.Hire;
                    break;
                }

                case Phase.Hire:
                {
                    int rosterBefore = RealmCityState.RosterIds.Count;
                    var result = RealmCityState.ExecuteOrder("hire");
                    if (result.Ok && RealmCityState.RosterIds.Count == rosterBefore + 1)
                    {
                        Debug.Log($"[PlaytestRealmSlice] hire OK (attempt {_hireAttempts + 1}) - {result.Message}");
                        _phase = Phase.SaveLoad;
                        break;
                    }
                    _hireAttempts++;
                    if (_hireAttempts >= MaxHireAttempts)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 등용이 {MaxHireAttempts}번 안에 성공 못 함(확률 판정) — last={result.Message}");
                        Fail();
                        return;
                    }
                    RealmCityState.NextMonth(); // 무장 done 초기화 + 금 보충, 다음 시도.
                    break;
                }

                case Phase.SaveLoad:
                {
                    int goldBeforeSave = RealmCityState.Gold;
                    int rosterBeforeSave = RealmCityState.RosterIds.Count;
                    int foundBeforeSave = RealmCityState.FoundIds.Count;
                    int yearBeforeSave = RealmCityState.Year;
                    int monthBeforeSave = RealmCityState.Month;

                    if (!RealmSaveState.Save())
                    {
                        Debug.LogError("[PlaytestRealmSlice] RealmSaveState.Save() 실패");
                        Fail();
                        return;
                    }

                    // 상태를 흩트린 뒤 다시 불러와 그대로 돌아오는지 확인.
                    RealmCityState.Restore(999, 999, 1, 1, 1, 1, 1, null, null, null);

                    if (!RealmSaveState.TryLoad())
                    {
                        Debug.LogError("[PlaytestRealmSlice] RealmSaveState.TryLoad() 실패");
                        Fail();
                        return;
                    }
                    if (RealmCityState.Gold != goldBeforeSave || RealmCityState.RosterIds.Count != rosterBeforeSave ||
                        RealmCityState.FoundIds.Count != foundBeforeSave || RealmCityState.Year != yearBeforeSave ||
                        RealmCityState.Month != monthBeforeSave)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 로드 후 불일치 — gold={RealmCityState.Gold}(기대={goldBeforeSave}) " +
                            $"roster={RealmCityState.RosterIds.Count}(기대={rosterBeforeSave}) found={RealmCityState.FoundIds.Count}(기대={foundBeforeSave}) " +
                            $"year/month={RealmCityState.Year}/{RealmCityState.Month}(기대={yearBeforeSave}/{monthBeforeSave})");
                        Fail();
                        return;
                    }

                    Debug.Log("[PlaytestRealmSlice] save/load round-trip OK");
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
    }
}
