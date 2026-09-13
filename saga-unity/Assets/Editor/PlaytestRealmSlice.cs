using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Saga.Realm.Data;
using Saga.Realm.World;
using Saga.Realm.UI;

namespace Saga.EditorTools
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 5절 완료 조건 + REALM 다음 조각 셋(명령
    /// 나머지 6종·여러 성 확장·무장 로스터/성 소속)을 실제 Play 모드에서
    /// 확인한다(`PlaytestStorySlice.cs`와 같은 결 — 컴포넌트/정적 API를
    /// 직접 불러 판정 경로만 본다, UI 버튼 클릭 시뮬레이션은 안 함).
    /// (1) 성 소속 게이트 — 무장이 없는 성에서 개발형 명령이 막히는지,
    /// (2) 조선 물길 게이트 — 뭍길 성에서 막히는지(게이트 실패는 그 달
    /// 명령 소진을 안 시키는지도 같이),
    /// (3) 개간·상업·정산(금 공식),
    /// (4) 기술·치안·축성·훈련 — 새 명령 넷이 해당 필드를 올리는지,
    /// (5) 징병 — 병력이 늘고 인구가 주는지,
    /// (6) 수색·등용 — 성마다 다른 재야, 등용된 무장이 그 성에 배치되는지,
    /// (7) 새로 배치된 무장이 그 성에서 개발형 명령을 실제로 쓸 수 있는지,
    /// (8) 저장/불러오기 — 성 셋 전부·로스터·성 소속까지 왕복.
    /// </summary>
    public static class PlaytestRealmSlice
    {
        private const string ScenePath = "Assets/Scenes/TestCity.unity";
        private const int MaxHireAttempts = 30;

        private static bool _hadError;
        private static int _framesSeen;
        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        private enum Phase
        {
            Init, LocationGate, ShipsGate, Agri, SettleAfterAgri, Comm, SettleAfterComm,
            Tech, Sec, Wall, Train, Draft, SettleAfterDraft,
            SearchAtChenliu, Hire, AgriByNewOfficer, SaveLoad, Done,
        }
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
                    ? "[PlaytestRealmSlice] OK - location gate/ships gate/orders(10)/draft/search/hire/city-assignment/save-load all verified, no errors"
                    : $"[PlaytestRealmSlice] FAIL - error={_hadError} phase={_phase} frames={_framesSeen}");
                EditorApplication.Exit(ok ? 0 : 1);
            }
        }

        private static void Tick()
        {
            _framesSeen++;
            if (_framesSeen > 3000)
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
                    if (RealmCityState.Gold != RealmCityState.StartingGold || RealmCityState.RosterIds.Count != 1 ||
                        RealmCityState.CurrentCity != "xuchang")
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 시작 상태 이상 — gold={RealmCityState.Gold} roster={RealmCityState.RosterIds.Count} city={RealmCityState.CurrentCity}");
                        Fail();
                        return;
                    }
                    _phase = Phase.LocationGate;
                    break;

                case Phase.LocationGate:
                {
                    // 진류엔 아직 아무도 배치돼 있지 않다 — 개발형 명령이 막혀야 한다.
                    RealmCityState.SetCurrentCity("chenliu");
                    int goldBefore = RealmCityState.Gold;
                    var result = RealmCityState.ExecuteOrder("agri");
                    RealmCityState.SetCurrentCity("xuchang");
                    if (result.Ok || RealmCityState.Gold != goldBefore)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 성 소속 게이트 실패 — ok={result.Ok} gold={RealmCityState.Gold}(기대={goldBefore}) msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] location gate OK - {result.Message}");
                    _phase = Phase.ShipsGate;
                    break;
                }

                case Phase.ShipsGate:
                {
                    // 허창은 뭍길(land:plain) — 조선이 막혀야 하고, 게이트
                    // 실패는 이 달 명령 소진을 안 시켜야 한다(바로 이어 개간 성공).
                    int goldBefore = RealmCityState.Gold;
                    var result = RealmCityState.ExecuteOrder("ships");
                    if (result.Ok || RealmCityState.Gold != goldBefore)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 조선 게이트 실패 — ok={result.Ok} gold={RealmCityState.Gold}(기대={goldBefore}) msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] ships gate OK - {result.Message}");
                    _phase = Phase.Agri;
                    break;
                }

                case Phase.Agri:
                {
                    int goldBefore = RealmCityState.Gold;
                    int agriBefore = RealmCityState.CityRecord("xuchang").Agri;
                    var result = RealmCityState.ExecuteOrder("agri");
                    if (!result.Ok || RealmCityState.Gold != goldBefore - RealmOrderData.Get("agri").Gold ||
                        RealmCityState.CityRecord("xuchang").Agri <= agriBefore)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 개간 실패 — ok={result.Ok} msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] agri OK - {result.Message} (게이트 실패 둘은 명령 소진 안 시킴 확인됨)");
                    RealmCityState.NextMonth();
                    _phase = Phase.Comm;
                    break;
                }

                case Phase.Comm:
                {
                    int goldBefore = RealmCityState.Gold;
                    int commBefore = RealmCityState.CityRecord("xuchang").Comm;
                    var result = RealmCityState.ExecuteOrder("comm");
                    if (!result.Ok || RealmCityState.Gold != goldBefore - RealmOrderData.Get("comm").Gold ||
                        RealmCityState.CityRecord("xuchang").Comm <= commBefore)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 상업 실패 — ok={result.Ok} msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] comm OK - {result.Message}");
                    _goldBeforeSettle = RealmCityState.Gold;
                    _foodBeforeSettle = RealmCityState.CityRecord("xuchang").Food;
                    _phase = Phase.SettleAfterComm;
                    break;
                }

                case Phase.SettleAfterComm:
                {
                    // 시작 달(1월)에서 한 번 다음 달로 넘겼으니 지금은 2월 —
                    // 수확달(6·10월)이 아니고 병력도 아직 없어 군량은 그대로.
                    string summary = RealmCityState.NextMonth();
                    var xuchang = RealmCityState.CityRecord("xuchang");
                    // 세력 금고는 성 셋(허창·진류·복양) 소득의 합산이다(rtk.js
                    // settleMonth() "세력 금고" 루프 그대로) — 진류·복양은
                    // 아직 아무 명령도 안 받아 시작값 그대로지만 소득에는
                    // 잡힌다. 치안은 셋 다 시작값(60)에서 정확히 같은
                    // 횟수만큼만 깎였으므로(정산 이번 한 번뿐) +1로 되돌려
                    // 정산 전 값을 그대로 되짚을 수 있다.
                    int expectedIncome = 0;
                    foreach (var cityId in new[] { "xuchang", "chenliu", "puyang" })
                    {
                        var rec = RealmCityState.CityRecord(cityId);
                        float secMulBefore = 0.5f + Mathf.Clamp(rec.Sec + 1, 0, 100) / 200f;
                        expectedIncome += Mathf.RoundToInt(rec.Comm * 0.55f * secMulBefore);
                    }
                    int upkeep = RealmCityState.RosterIds.Count * RealmCityState.UpkeepPerOfficer;
                    int expectedGold = Mathf.Max(0, _goldBeforeSettle + expectedIncome - upkeep);
                    if (RealmCityState.Gold != expectedGold || xuchang.Food != _foodBeforeSettle)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 정산 불일치 — gold={RealmCityState.Gold}(기대={expectedGold}) food={xuchang.Food}(기대={_foodBeforeSettle}) summary={summary}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] settle OK - {summary}");
                    _phase = Phase.Tech;
                    break;
                }

                case Phase.Tech:
                {
                    int before = RealmCityState.CityRecord("xuchang").Tech;
                    var result = RealmCityState.ExecuteOrder("tech");
                    if (!result.Ok || RealmCityState.CityRecord("xuchang").Tech <= before)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 기술 실패 — ok={result.Ok} msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] tech OK - {result.Message}");
                    RealmCityState.NextMonth();
                    _phase = Phase.Sec;
                    break;
                }

                case Phase.Sec:
                {
                    int before = RealmCityState.CityRecord("xuchang").Sec;
                    var result = RealmCityState.ExecuteOrder("sec");
                    if (!result.Ok || RealmCityState.CityRecord("xuchang").Sec <= before)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 치안 실패 — ok={result.Ok} msg={result.Message} before={before} after={RealmCityState.CityRecord("xuchang").Sec}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] sec OK - {result.Message}");
                    RealmCityState.NextMonth();
                    _phase = Phase.Wall;
                    break;
                }

                case Phase.Wall:
                {
                    int before = RealmCityState.CityRecord("xuchang").Wall;
                    var result = RealmCityState.ExecuteOrder("wall");
                    if (!result.Ok || RealmCityState.CityRecord("xuchang").Wall <= before)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 축성 실패 — ok={result.Ok} msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] wall OK - {result.Message}");
                    RealmCityState.NextMonth();
                    _phase = Phase.Train;
                    break;
                }

                case Phase.Train:
                {
                    int before = RealmCityState.CityRecord("xuchang").Train;
                    var result = RealmCityState.ExecuteOrder("train");
                    if (!result.Ok || RealmCityState.CityRecord("xuchang").Train <= before)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 훈련 실패 — ok={result.Ok} msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] train OK - {result.Message}");
                    RealmCityState.NextMonth();
                    _phase = Phase.Draft;
                    break;
                }

                case Phase.Draft:
                {
                    var xuchang = RealmCityState.CityRecord("xuchang");
                    int popBefore = xuchang.Pop;
                    int goldBefore = RealmCityState.Gold;
                    var result = RealmCityState.ExecuteOrder("draft");
                    if (!result.Ok || xuchang.Troops <= 0 || xuchang.Pop >= popBefore ||
                        RealmCityState.Gold != goldBefore - RealmOrderData.Get("draft").Gold)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 징병 실패 — ok={result.Ok} troops={xuchang.Troops} pop={xuchang.Pop}(이전={popBefore}) msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] draft OK - {result.Message} (troops={xuchang.Troops}, pop={popBefore}->{xuchang.Pop})");
                    _phase = Phase.SettleAfterDraft;
                    break;
                }

                case Phase.SettleAfterDraft:
                {
                    // 병력이 생긴 뒤 첫 정산 — 군량을 먹는다(eatOf). 시작
                    // 군량이 0이라 즉시 굶주려 병사가 흩는 것까지가 정상
                    // 동작(rtk.js와 같은 결, "군량 없이 병력만 늘리면 안
                    // 지켜진다"). 음수로 안 남고(0 클램프) 병력이 음수가
                    // 안 되는지만 확인 — 정확한 감소량은 대성공 여부에
                    // 따라 갈리므로 손 계산은 안 한다.
                    var xuchang = RealmCityState.CityRecord("xuchang");
                    int troopsBefore = xuchang.Troops;
                    string summary = RealmCityState.NextMonth();
                    if (xuchang.Food < 0 || xuchang.Troops < 0 || xuchang.Troops > troopsBefore)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 군량 소비/굶주림 이상 — food={xuchang.Food} troops={xuchang.Troops}(이전={troopsBefore}) summary={summary}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] food upkeep OK - {summary} (troops {troopsBefore}->{xuchang.Troops})");
                    _phase = Phase.SearchAtChenliu;
                    break;
                }

                case Phase.SearchAtChenliu:
                {
                    // 수색·등용은 위치 무관 — 허창에 있는 현책이 진류를
                    // 대상으로 수색한다. 진류 재야 후보는 이도인 하나뿐이라
                    // reach가 항상 1 — 결과가 결정적이다.
                    RealmCityState.SetCurrentCity("chenliu");
                    var result = RealmCityState.ExecuteOrder("search");
                    if (!result.Ok || !RealmCityState.FoundIds.Contains("jp_musashi"))
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 수색 실패 — ok={result.Ok} found={RealmCityState.FoundIds.Count} msg={result.Message}");
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
                        if (RealmCityState.OfficerCityId("jp_musashi") != "chenliu")
                        {
                            Debug.LogError($"[PlaytestRealmSlice] 등용된 무장 배치 이상 — officerCity={RealmCityState.OfficerCityId("jp_musashi")}(기대=chenliu)");
                            Fail();
                            return;
                        }
                        Debug.Log($"[PlaytestRealmSlice] hire OK (attempt {_hireAttempts + 1}) - {result.Message}");
                        _phase = Phase.AgriByNewOfficer;
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

                case Phase.AgriByNewOfficer:
                {
                    // 이도인이 방금 진류에 배치됐다 — 같은 달 안에 바로
                    // 그 성에서 개발형 명령을 쓸 수 있어야 한다(등용은
                    // 현책의 이 달 몫을 썼을 뿐, 이도인은 아직 안 씀).
                    int before = RealmCityState.CityRecord("chenliu").Agri;
                    var result = RealmCityState.ExecuteOrder("agri");
                    if (!result.Ok || RealmCityState.CityRecord("chenliu").Agri <= before)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 새 배치 무장의 개간 실패 — ok={result.Ok} msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] new-officer agri OK - {result.Message}");
                    RealmCityState.SetCurrentCity("xuchang");
                    _phase = Phase.SaveLoad;
                    break;
                }

                case Phase.SaveLoad:
                {
                    int goldBeforeSave = RealmCityState.Gold;
                    int rosterBeforeSave = RealmCityState.RosterIds.Count;
                    int foundBeforeSave = RealmCityState.FoundIds.Count;
                    int yearBeforeSave = RealmCityState.Year;
                    int monthBeforeSave = RealmCityState.Month;
                    string currentCityBeforeSave = RealmCityState.CurrentCity;
                    int xuchangTechBefore = RealmCityState.CityRecord("xuchang").Tech;
                    int xuchangTroopsBefore = RealmCityState.CityRecord("xuchang").Troops;
                    int chenliuAgriBefore = RealmCityState.CityRecord("chenliu").Agri;
                    int puyangWallBefore = RealmCityState.CityRecord("puyang").Wall;
                    string musashiCityBefore = RealmCityState.OfficerCityId("jp_musashi");

                    if (!RealmSaveState.Save())
                    {
                        Debug.LogError("[PlaytestRealmSlice] RealmSaveState.Save() 실패");
                        Fail();
                        return;
                    }

                    // 상태를 흩트린 뒤(성 셋 전부 엉터리 값으로) 다시 불러와
                    // 그대로 돌아오는지 확인.
                    var dummyCities = new List<RealmCityState.CitySnapshot>();
                    foreach (var id in new[] { "xuchang", "chenliu", "puyang" })
                    {
                        dummyCities.Add(new RealmCityState.CitySnapshot
                        {
                            CityId = id, Agri = 1, Comm = 1, Tech = 1, Sec = 1, Wall = 1,
                            Train = 1, Ships = 1, Pop = 1, Troops = 1, Food = 1,
                        });
                    }
                    RealmCityState.Restore(999, 1, 1, "puyang",
                        new List<string> { "sg_zhugeliang" }, null, null,
                        new List<string> { "sg_zhugeliang" }, new List<string> { "xuchang" },
                        dummyCities);

                    if (!RealmSaveState.TryLoad())
                    {
                        Debug.LogError("[PlaytestRealmSlice] RealmSaveState.TryLoad() 실패");
                        Fail();
                        return;
                    }
                    bool mismatch = RealmCityState.Gold != goldBeforeSave ||
                        RealmCityState.RosterIds.Count != rosterBeforeSave ||
                        RealmCityState.FoundIds.Count != foundBeforeSave ||
                        RealmCityState.Year != yearBeforeSave ||
                        RealmCityState.Month != monthBeforeSave ||
                        RealmCityState.CurrentCity != currentCityBeforeSave ||
                        RealmCityState.CityRecord("xuchang").Tech != xuchangTechBefore ||
                        RealmCityState.CityRecord("xuchang").Troops != xuchangTroopsBefore ||
                        RealmCityState.CityRecord("chenliu").Agri != chenliuAgriBefore ||
                        RealmCityState.CityRecord("puyang").Wall != puyangWallBefore ||
                        RealmCityState.OfficerCityId("jp_musashi") != musashiCityBefore;
                    if (mismatch)
                    {
                        Debug.LogError("[PlaytestRealmSlice] 로드 후 불일치 발생 (성 셋/로스터/성 소속 중 하나)");
                        Fail();
                        return;
                    }

                    Debug.Log("[PlaytestRealmSlice] save/load round-trip OK (3 cities + roster + officer city assignment)");
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
