using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;
using Saga.Realm.Data;
using Saga.Realm.World;
using Saga.Realm.Player;
using Saga.Realm.UI;
using Saga.Realm.Audio;

namespace Saga.EditorTools
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 5절 완료 조건 + REALM 다음 조각 넷(명령
    /// 나머지 6종·여러 성 확장·무장 로스터/성 소속·전쟁 첫 슬라이스)을
    /// 실제 Play 모드에서 확인한다(`PlaytestStorySlice.cs`와 같은 결 —
    /// 컴포넌트/정적 API를 직접 불러 판정 경로만 본다, UI 버튼 클릭
    /// 시뮬레이션은 안 함).
    /// (1) 성 소속 게이트 — 무장이 없는 성에서 개발형 명령이 막히는지,
    /// (2) 조선 물길 게이트 — 뭍길 성에서 막히는지(게이트 실패는 그 달
    /// 명령 소진을 안 시키는지도 같이),
    /// (3) 개간·상업·정산(금 공식),
    /// (4) 기술·치안·축성·훈련 — 새 명령 넷이 해당 필드를 올리는지,
    /// (5) 징병 — 병력이 늘고 인구가 주는지,
    /// (6) 수색·등용 — 성마다 다른 재야, 등용된 무장이 그 성에 배치되는지,
    /// (7) 새로 배치된 무장이 그 성에서 개발형 명령을 실제로 쓸 수 있는지,
    /// (8) 전쟁 — 잘못된 성/병력 부족 전제조건, 약한 군대는 못 뺏고
    /// 돌아오는지, 압도적 물량은 함락시키는지, 함락한 성 재공격이 막히는지,
    /// (8-1) 51장 "대규모 콘텐츠"(2026-09-14) — 둘째 목표(정도, 복양에서만
    /// 출진)도 같은 Attack() 경로로 함락·편입되는지,
    /// (8-2) 51장 2차 확장(2026-09-15) — 진류의 첫 목표(낙양)와, 소패·정도를
    /// 함락한 뒤 이어지는 둘째 단계 목표(하비·업)까지 같은 Attack() 경로로
    /// 순서대로(선행 성을 먼저 편입해야 열리는지 포함) 함락·편입되는지,
    /// (8-3) 51장 3차 확장(2026-09-16) — 낙양·하비·업을 함락한 뒤 각자
    /// 이어지는 셋째 단계 목표(장안·수춘·진양)까지 같은 경로로 되는지,
    /// (9) 계략(유언비어·화계) — 허창 밖 게이트, 성공 시 소패 훈련도/병력
    /// 실제 하락,
    /// (10) 함락한 성 편입 — 함락 즉시 네 번째 성으로 들어가는지, 무장
    /// 없이는 명령이 막히는지,
    /// (11) 문답 — 정답/오답 채점·금 보상·학습 기록,
    /// (12) 저장/불러오기 — 성 넷·로스터·성 소속·소패 전황·문답 진행까지 왕복.
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
            Init, WorldMap, LocationGate, ShipsGate, Agri, SettleAfterAgri, Comm, SettleAfterComm,
            Tech, Sec, Wall, Train, Draft, SettleAfterDraft,
            SearchAtChenliu, Hire, AgriByNewOfficer,
            PlotGate, PlotRumor, PlotFire,
            AttackWrongCity, AttackTooFewTroops, AttackWeak, AttackOverwhelm,
            CapturedCityDevelop, AttackAgainBlocked, AttackLuoyang, AttackXiapi, AttackDingtao, AttackYe,
            AttackChangan, AttackShouchun, AttackJinyang,
            QuizCorrect, QuizWrong, QuizArchive,
            SaveLoad, Done,
        }
        private static Phase _phase = Phase.Init;
        private static int _hireAttempts;
        private static int _plotAttempts;
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

            // GameBootstrap.Awake()가 매번 TryLoad()를 불러 이전 헤드리스
            // 실행이 남긴 세이브를 그대로 읽어 버린다 — "새 게임" 전제인
            // Init 단계가 깨지지 않도록 먼저 지운다(RealmSaveState.cs
            // DeleteForTest() 주석 참고).
            RealmSaveState.DeleteForTest();

            // CheckSettingsPanel()이 설정 버튼을 "Btn_설정"(한국어 라벨)으로
            // 찾는다 — RealmCommandUi.Build()가 그 이름을 지을 때 쓰는
            // RealmLocalization.CurrentLanguage는 PlayerPrefs에 저장돼 이전
            // 실행(또는 사람이 에디터에서 언어를 바꾼 뒤 안 되돌리고 끈 세션)이
            // "en"을 남기면 이번 실행이 처음부터 어긋난 이름으로 시작해 버튼을
            // 영영 못 찾는다 — 위 세이브 삭제와 같은 이유로 여기서 먼저 고정한다.
            RealmLocalization.CurrentLanguage = "ko";
            EditorSceneManager.OpenScene(ScenePath);

            _hadError = false;
            _framesSeen = 0;
            _phase = Phase.Init;
            _hireAttempts = 0;
            _plotAttempts = 0;

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
                    ? "[PlaytestRealmSlice] OK - world-map/location gate/ships gate/orders(10)/draft/search/hire/city-assignment/war/diplo(rumor+fire)/captured-city-absorb/quiz/save-load all verified, no errors"
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
                    var commandUi = Object.FindFirstObjectByType<RealmCommandUi>();
                    if (GameObject.Find("City") == null || GameObject.Find("RealmCameraRig") == null ||
                        Object.FindFirstObjectByType<RealmHud>() == null || commandUi == null)
                    {
                        Debug.LogError("[PlaytestRealmSlice] 씬 구성 못 찾음 — City/RealmCameraRig/RealmHud/RealmCommandUi 중 일부 없음");
                        Fail();
                        return;
                    }
                    // 2026-09-14 "사운드" — 이 테스트는 UI 버튼을 안 눌러(클래스
                    // 주석) RealmCommandUi.PlayOutcomeSfx()가 안 도는데, 씬
                    // 빌드가 confirm/error 클립을 실제로 채웠는지·헤드리스에서
                    // RealmAudio.PlaySfx가 예외 없이 도는지는 여기서 직접 본다
                    // (GO PlaytestHeadless의 GoAudio 스모크와 같은 결).
                    var confirmClip = GetPrivateField<AudioClip>(commandUi, "confirmClip");
                    var errorClip = GetPrivateField<AudioClip>(commandUi, "errorClip");
                    if (confirmClip == null || errorClip == null)
                    {
                        Debug.LogError("[PlaytestRealmSlice] RealmCommandUi confirm/error 클립 미배선");
                        Fail();
                        return;
                    }
                    RealmAudio.PlaySfx(confirmClip);
                    RealmAudio.PlaySfx(errorClip);
                    if (RealmCityState.Gold != RealmCityState.StartingGold || RealmCityState.RosterIds.Count != 1 ||
                        RealmCityState.CurrentCity != "xuchang")
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 시작 상태 이상 — gold={RealmCityState.Gold} roster={RealmCityState.RosterIds.Count} city={RealmCityState.CurrentCity}");
                        Fail();
                        return;
                    }
                    if (!CheckSettingsPanel()) { Fail(); return; }
                    if (!CheckRealmHudLocalization()) { Fail(); return; }
                    if (!CheckCommandUiPanelsWork()) { Fail(); return; }
                    _phase = Phase.WorldMap;
                    break;

                case Phase.WorldMap:
                {
                    // VERTICAL_SLICE_REALM.md 2-8~2-10절 — 지도 토글·성표
                    // 위치·탭 선택·드래그 회전/줌 클램프까지, 컴포넌트를
                    // 직접 불러 판정 경로만 본다(다른 phase들과 같은 관행).
                    // GameObject.Find()는 비활성 오브젝트를 못 찾는다(WorldMap
                    // 쪽은 시작 시 꺼져 있다) — 컴포넌트를 FindObjectsInactive
                    // .Include로 찾은 뒤 그 gameObject를 쓴다.
                    var worldMap = Object.FindFirstObjectByType<RealmWorldMap>(FindObjectsInactive.Include);
                    var mapCam = Object.FindFirstObjectByType<RealmWorldMapCamera>(FindObjectsInactive.Include);
                    var dioramaCam = Object.FindFirstObjectByType<RealmOrbitCamera>(FindObjectsInactive.Include);
                    var mapCameraRigGo = mapCam != null ? mapCam.gameObject : null;
                    var dioramaRigGo = dioramaCam != null ? dioramaCam.gameObject : null;
                    if (worldMap == null || mapCam == null || mapCameraRigGo == null || dioramaRigGo == null)
                    {
                        Debug.LogError("[PlaytestRealmSlice] 월드맵 구성 못 찾음 — RealmWorldMap/RealmWorldMapCamera/WorldMapCameraRig/RealmCameraRig 중 일부 없음");
                        Fail();
                        return;
                    }

                    // 켜기 전엔 디오라마만 활성.
                    if (!dioramaRigGo.activeSelf || mapCameraRigGo.activeSelf)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 초기 상태 이상 — diorama={dioramaRigGo.activeSelf}(기대=true) mapCam={mapCameraRigGo.activeSelf}(기대=false)");
                        Fail();
                        return;
                    }

                    RealmMapState.Toggle();
                    if (!RealmMapState.ViewingMap || dioramaRigGo.activeSelf || !mapCameraRigGo.activeSelf)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 지도 토글 실패 — viewingMap={RealmMapState.ViewingMap} diorama={dioramaRigGo.activeSelf} mapCam={mapCameraRigGo.activeSelf}");
                        Fail();
                        return;
                    }

                    // 성표 위치 — 손 계산과 대조(허창(58,47)·진류(63,39)·
                    // 복양(68,33), 중심=(63, 39.667), WorldScale=14).
                    var (centerX, centerY) = RealmWorldMap.MapCenter(RealmCityState.ActiveCityIds);
                    if (Mathf.Abs(centerX - 63f) > 0.01f || Mathf.Abs(centerY - 39.667f) > 0.01f)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 지도 중심 불일치 — center=({centerX},{centerY}) 기대=(63, 39.667)");
                        Fail();
                        return;
                    }
                    var xuchangPos = RealmWorldMap.WorldPos(RealmCityData.Get("xuchang"), centerX, centerY);
                    var expectedXuchang = new Vector3((58f - centerX) * 14f, 0f, (centerY - 47f) * 14f);
                    if (Vector3.Distance(xuchangPos, expectedXuchang) > 0.01f)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 성표 위치 불일치 — xuchang={xuchangPos} 기대={expectedXuchang}");
                        Fail();
                        return;
                    }

                    // 탭 선택 — 지금 조망은 xuchang, 진류 성표를 탭하면 바뀌어야 한다.
                    var chenliuMarkerGo = GameObject.Find("Marker_chenliu");
                    if (chenliuMarkerGo == null)
                    {
                        Debug.LogError("[PlaytestRealmSlice] Marker_chenliu 못 찾음");
                        Fail();
                        return;
                    }
                    var mapCameraComponent = mapCam.GetComponentInChildren<Camera>(); // Camera는 rig의 자식에 있다.
                    Vector2 markerScreenPos = mapCameraComponent != null
                        ? (Vector2)mapCameraComponent.WorldToScreenPoint(chenliuMarkerGo.transform.position)
                        : Vector2.zero;
                    mapCam.DebugBeginDrag(markerScreenPos);
                    mapCam.DebugEndDrag(markerScreenPos); // 문지방 안 넘긴 손떼기 = 탭.
                    if (RealmCityState.CurrentCity != "chenliu")
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 성표 탭 선택 실패 — currentCity={RealmCityState.CurrentCity}(기대=chenliu)");
                        Fail();
                        return;
                    }
                    RealmCityState.SetCurrentCity("xuchang"); // 이후 phase들의 전제(허창 시작)로 되돌린다.

                    // 드래그 회전 + 클램프 — 문지방 넘는 이동은 yaw/pitch를
                    // 공식대로 바꾸고, 확정된 드래그 뒤의 손떼기는 탭으로
                    // 오판하면 안 된다(성이 안 바뀜).
                    float yawBefore = mapCam.DebugYaw;
                    float pitchBefore = mapCam.DebugPitch;
                    var dragStart = new Vector2(500f, 500f);
                    mapCam.DebugBeginDrag(dragStart);
                    var dragPos = dragStart + new Vector2(80f, 40f); // 문지방(10px) 훌쩍 넘는 이동.
                    mapCam.DebugApplyDrag(dragPos - dragStart, dragPos);
                    mapCam.DebugEndDrag(dragPos);
                    if (RealmCityState.CurrentCity != "xuchang")
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 드래그 확정 후 탭 오판 — currentCity={RealmCityState.CurrentCity}(기대=xuchang, 안 바뀌어야 함)");
                        Fail();
                        return;
                    }
                    float expectedYaw = yawBefore + 80f * 0.006f;
                    float expectedPitch = Mathf.Clamp(pitchBefore + 40f * 0.006f, 0.35f, 1.3f);
                    if (Mathf.Abs(mapCam.DebugYaw - expectedYaw) > 0.0001f ||
                        Mathf.Abs(mapCam.DebugPitch - expectedPitch) > 0.0001f)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 드래그 회전 공식 불일치 — yaw={mapCam.DebugYaw}(기대={expectedYaw}) pitch={mapCam.DebugPitch}(기대={expectedPitch})");
                        Fail();
                        return;
                    }
                    // 문지방 안 넘는 미세한 드래그는 안 잠겨야 한다.
                    float yawBeforeSmall = mapCam.DebugYaw;
                    var smallStart = new Vector2(200f, 200f);
                    mapCam.DebugBeginDrag(smallStart);
                    var smallPos = smallStart + new Vector2(3f, 2f); // 거리 3.6 < 10.
                    mapCam.DebugApplyDrag(smallPos - smallStart, smallPos);
                    if (Mathf.Abs(mapCam.DebugYaw - yawBeforeSmall) > 0.00001f)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 문지방 미만 드래그가 잠김 — yaw={mapCam.DebugYaw}(기대={yawBeforeSmall})");
                        Fail();
                        return;
                    }
                    mapCam.DebugEndDrag(smallPos); // 문지방 안 넘겼으니 탭 판정 — 빈 곳이라 성 안 바뀜.
                    if (RealmCityState.CurrentCity != "xuchang")
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 빈 곳 탭인데 성이 바뀜 — currentCity={RealmCityState.CurrentCity}");
                        Fail();
                        return;
                    }

                    Debug.Log("[PlaytestRealmSlice] world map OK - toggle/marker-position/tap-select/drag-rotate(threshold+clamp) all verified");

                    RealmMapState.ForceOff();
                    if (RealmMapState.ViewingMap || !dioramaRigGo.activeSelf || mapCameraRigGo.activeSelf)
                    {
                        Debug.LogError("[PlaytestRealmSlice] 지도 되돌리기 실패");
                        Fail();
                        return;
                    }
                    _phase = Phase.LocationGate;
                    break;
                }

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
                    RealmCityState.NextMonth(); // 계략/전쟁 테스트를 위해 무장 done을 깨끗이 비운다.
                    _phase = Phase.PlotGate;
                    break;
                }

                case Phase.PlotGate:
                {
                    // 계략도 공격처럼 목표가 있는 성에서만 — 51장 2차 확장
                    // (2026-09-15)으로 진류도 낙양이라는 목표가 생겨 더 이상
                    // "목표 없는 성" 예시가 아니다. 목표가 아예 없는 성(wan,
                    // 시작 셋도 적국 다섯도 아니다)으로 바꿔 같은 게이트를 본다.
                    var result = RealmWarState.Plot("rumor", "wan");
                    if (result.Ok)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 계략 성 밖 게이트 실패 — msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] plot wrong-city gate OK - {result.Message}");
                    _phase = Phase.PlotRumor;
                    break;
                }

                case Phase.PlotRumor:
                {
                    // 확률 판정이라 등용처럼 성공할 때까지 반복(최대
                    // MaxHireAttempts번, NextMonth로 명령 소진·금고를 되돌려
                    // 가며). 성공하면 소패 훈련도가 실제로 떨어져야 한다.
                    int goldBefore = RealmCityState.Gold;
                    int trainBefore = RealmWarState.Xiaopei.Train;
                    var result = RealmWarState.Plot("rumor", "xuchang");
                    if (!result.Ok || RealmCityState.Gold != goldBefore - RealmPlotData.Get("rumor").Gold)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 유언비어 실행 이상 — ok={result.Ok} gold={RealmCityState.Gold}(기대={goldBefore - RealmPlotData.Get("rumor").Gold}) msg={result.Message}");
                        Fail();
                        return;
                    }
                    if (RealmWarState.Xiaopei.Train < trainBefore)
                    {
                        Debug.Log($"[PlaytestRealmSlice] plot rumor OK (success, attempt {_plotAttempts + 1}) - {result.Message}");
                        _plotAttempts = 0;
                        RealmCityState.NextMonth();
                        _phase = Phase.PlotFire;
                        break;
                    }
                    if (RealmWarState.Xiaopei.Train != trainBefore)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 유언비어 실패인데 훈련도가 바뀜 — before={trainBefore} after={RealmWarState.Xiaopei.Train}");
                        Fail();
                        return;
                    }
                    _plotAttempts++;
                    if (_plotAttempts >= MaxHireAttempts)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 유언비어가 {MaxHireAttempts}번 안에 성공 못 함(확률 판정) — last={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] plot rumor miss (attempt {_plotAttempts}) - {result.Message}");
                    RealmCityState.NextMonth();
                    break;
                }

                case Phase.PlotFire:
                {
                    int goldBefore = RealmCityState.Gold;
                    int troopsBefore = RealmWarState.Xiaopei.Troops;
                    var result = RealmWarState.Plot("fire", "xuchang");
                    if (!result.Ok || RealmCityState.Gold != goldBefore - RealmPlotData.Get("fire").Gold)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 화계 실행 이상 — ok={result.Ok} gold={RealmCityState.Gold}(기대={goldBefore - RealmPlotData.Get("fire").Gold}) msg={result.Message}");
                        Fail();
                        return;
                    }
                    if (RealmWarState.Xiaopei.Troops < troopsBefore)
                    {
                        Debug.Log($"[PlaytestRealmSlice] plot fire OK (success, attempt {_plotAttempts + 1}) - {result.Message}");
                        // 소패 병력/훈련이 계략으로 흐트러진 채면 뒤의 약한
                        // 공격/압도적 공격 시나리오(고정 수치를 전제로 한
                        // 테스트)가 어긋난다 — 기준값으로 되돌려 둔다.
                        var xiaopeiDef = RealmEnemyCity.Get(RealmEnemyCity.XiaopeiId);
                        RealmWarState.Restore(RealmEnemyCity.XiaopeiId, xiaopeiDef.BaseWall, xiaopeiDef.BaseWall,
                            xiaopeiDef.BaseTroops, xiaopeiDef.BaseTrain, xiaopeiDef.BaseTech, false);
                        RealmCityState.NextMonth();
                        _phase = Phase.AttackWrongCity;
                        break;
                    }
                    if (RealmWarState.Xiaopei.Troops != troopsBefore)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 화계 실패인데 병력이 바뀜 — before={troopsBefore} after={RealmWarState.Xiaopei.Troops}");
                        Fail();
                        return;
                    }
                    _plotAttempts++;
                    if (_plotAttempts >= MaxHireAttempts)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 화계가 {MaxHireAttempts}번 안에 성공 못 함(확률 판정) — last={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] plot fire miss (attempt {_plotAttempts}) - {result.Message}");
                    RealmCityState.NextMonth();
                    break;
                }

                case Phase.AttackWrongCity:
                {
                    // 51장 2차 확장(2026-09-15)으로 진류도 낙양이라는 목표가
                    // 생겨 더 이상 "목표 없는 성" 예시가 아니다(PlotGate와 같은
                    // 이유) — wan으로 바꿔 같은 게이트를 본다.
                    var result = RealmWarState.Attack("wan");
                    if (result.Ok || RealmWarState.Xiaopei.Captured)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 성 밖 공격 게이트 실패 — ok={result.Ok} msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] wrong-city attack gate OK - {result.Message}");
                    _phase = Phase.AttackTooFewTroops;
                    break;
                }

                case Phase.AttackTooFewTroops:
                {
                    // 병력 전제조건만 격리해서 본다 — 조작한 값이라 실제
                    // 징병 결과와 무관.
                    var xuchang = RealmCityState.CityRecord("xuchang");
                    xuchang.Troops = 100;
                    xuchang.Food = 1000;
                    var result = RealmWarState.Attack("xuchang");
                    if (result.Ok || xuchang.Troops != 100)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 병력 부족 게이트 실패 — ok={result.Ok} troops={xuchang.Troops}(기대=100) msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] too-few-troops attack gate OK - {result.Message}");
                    _phase = Phase.AttackWeak;
                    break;
                }

                case Phase.AttackWeak:
                {
                    // 소패(800명, 성벽 3600)에 한참 못 미치는 약한 군대 —
                    // 함락은 못 하고 살아남은 병력이 돌아와야 한다.
                    var xuchang = RealmCityState.CityRecord("xuchang");
                    xuchang.Troops = 600;
                    xuchang.Food = 1000;
                    var result = RealmWarState.Attack("xuchang");
                    if (!result.Ok || RealmWarState.Xiaopei.Captured || xuchang.Troops <= 0)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 약한 공격 실패 — ok={result.Ok} captured={RealmWarState.Xiaopei.Captured} troops={xuchang.Troops} msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] weak attack OK - {result.Message} (troops back={xuchang.Troops}, xiaopei troops={RealmWarState.Xiaopei.Troops})");
                    RealmCityState.NextMonth(); // 다음 공격을 위해 무장 done을 다시 비운다.
                    _phase = Phase.AttackOverwhelm;
                    break;
                }

                case Phase.AttackOverwhelm:
                {
                    // 압도적 물량 — 확실히 함락시킨다.
                    var xuchang = RealmCityState.CityRecord("xuchang");
                    xuchang.Troops = 100000;
                    xuchang.Food = 100000;
                    var result = RealmWarState.Attack("xuchang");
                    if (!result.Ok || !RealmWarState.Xiaopei.Captured)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 압도적 공격 실패 — ok={result.Ok} captured={RealmWarState.Xiaopei.Captured} msg={result.Message}");
                        Fail();
                        return;
                    }

                    // REALM 다음 조각 (2) — 함락한 성이 실제로 편입됐는지.
                    // RealmWarState.Xiaopei 스냅샷과 새로 생긴 RealmCityRecord가
                    // 정확히 같은 값을 들고 있어야 한다(AbsorbCity()가 그
                    // 자리에서 그대로 옮긴 것이므로).
                    var xiaopeiSnap = RealmWarState.Snapshot(RealmEnemyCity.XiaopeiId);
                    var xiaopeiRecord = RealmCityState.CityRecord(RealmEnemyCity.XiaopeiId);
                    var xiaopeiDef = RealmCityData.Get(RealmEnemyCity.XiaopeiId);
                    if (!RealmCityState.ActiveCityIds.Contains(RealmEnemyCity.XiaopeiId) || xiaopeiRecord == null ||
                        xiaopeiRecord.Wall != xiaopeiSnap.wall || xiaopeiRecord.Troops != xiaopeiSnap.troops ||
                        xiaopeiRecord.Train != xiaopeiSnap.train || xiaopeiRecord.Tech != xiaopeiSnap.tech ||
                        xiaopeiRecord.Sec != 30 || xiaopeiRecord.Agri != xiaopeiDef.BaseAgri || xiaopeiRecord.Comm != xiaopeiDef.BaseComm)
                    {
                        Debug.LogError("[PlaytestRealmSlice] 함락한 성 편입 값 불일치 (ActiveCityIds/필드 중 하나)");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] overwhelm attack + city absorb OK - {result.Message} (agri={xiaopeiRecord.Agri}, sec={xiaopeiRecord.Sec}, wall={xiaopeiRecord.Wall}, troops={xiaopeiRecord.Troops})");
                    _phase = Phase.CapturedCityDevelop;
                    break;
                }

                case Phase.CapturedCityDevelop:
                {
                    // 무장이 아직 아무도 없으니 개발형 명령이 막혀야 한다
                    // (진류가 처음에 그랬던 것과 같은 성 소속 게이트).
                    RealmCityState.SetCurrentCity(RealmEnemyCity.XiaopeiId);
                    var blocked = RealmCityState.ExecuteOrder("agri");
                    if (blocked.Ok)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 무장 없는 소패에서 개간이 성공해 버림 — msg={blocked.Message}");
                        Fail();
                        return;
                    }

                    // 무장 전임(성 사이 이동)은 이번 범위 밖(godot 3절 "뺀 것") —
                    // 테스트만을 위해 저장 스냅샷을 다시 불러오는 경로(Restore)로
                    // 현책을 소패에 심어, 새로 편입된 성에서도 개발형 명령이
                    // 실제로 도는지만 확인한다.
                    var roster = new List<string>(RealmCityState.RosterIds);
                    var officerCityIds = new List<string>();
                    var officerCityCities = new List<string>();
                    foreach (var id in roster)
                    {
                        officerCityIds.Add(id);
                        officerCityCities.Add(id == RealmOfficerPool.StartingOfficerId ? RealmEnemyCity.XiaopeiId : RealmCityState.OfficerCityId(id));
                    }
                    RealmCityState.Restore(RealmCityState.Gold, RealmCityState.Year, RealmCityState.Month,
                        RealmEnemyCity.XiaopeiId, roster, null, new List<string>(RealmCityState.FoundIds),
                        officerCityIds, officerCityCities, RealmCityState.SnapshotCities());

                    int before = RealmCityState.CityRecord(RealmEnemyCity.XiaopeiId).Agri;
                    var result = RealmCityState.ExecuteOrder("agri");
                    if (!result.Ok || RealmCityState.CityRecord(RealmEnemyCity.XiaopeiId).Agri <= before)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 소패 배치 후 개간 실패 — ok={result.Ok} msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] captured-city develop OK - {result.Message}");
                    RealmCityState.SetCurrentCity("xuchang");
                    _phase = Phase.AttackAgainBlocked;
                    break;
                }

                case Phase.AttackAgainBlocked:
                {
                    var result = RealmWarState.Attack("xuchang");
                    if (result.Ok)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 함락한 성 재공격이 안 막힘 — msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] re-attack blocked OK - {result.Message}");
                    _phase = Phase.AttackLuoyang;
                    break;
                }

                case Phase.AttackLuoyang:
                {
                    // 51장 2차 확장(2026-09-15) — 진류(시작 성 셋 중 그때까지
                    // 목표가 없던 유일한 곳)의 첫 출진 목표. 정도 공략과 같은
                    // 트릭(무장을 잠깐 옮겨 "출진할 무장 필요" 조건만 채운다).
                    var roster = new List<string>(RealmCityState.RosterIds);
                    var officerCityIds = new List<string>();
                    var officerCityCities = new List<string>();
                    foreach (var id in roster)
                    {
                        officerCityIds.Add(id);
                        officerCityCities.Add(id == RealmOfficerPool.StartingOfficerId ? "chenliu" : RealmCityState.OfficerCityId(id));
                    }
                    RealmCityState.Restore(RealmCityState.Gold, RealmCityState.Year, RealmCityState.Month,
                        "chenliu", roster, null, new List<string>(RealmCityState.FoundIds),
                        officerCityIds, officerCityCities, RealmCityState.SnapshotCities());

                    var chenliu = RealmCityState.CityRecord("chenliu");
                    chenliu.Troops = 100000;
                    chenliu.Food = 100000;

                    var result = RealmWarState.Attack("chenliu");
                    if (!result.Ok || !result.Won || RealmCityState.CityRecord(RealmEnemyCity.LuoyangId) == null ||
                        !RealmCityState.ActiveCityIds.Contains(RealmEnemyCity.LuoyangId))
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 낙양 공략 실패 — ok={result.Ok} won={result.Won} msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] luoyang attack + absorb OK - {result.Message}");
                    RealmCityState.SetCurrentCity("xuchang");
                    _phase = Phase.AttackXiapi;
                    break;
                }

                case Phase.AttackXiapi:
                {
                    // 51장 2차 확장 — 소패를 함락한 뒤에도 계속 확장할 거리가
                    // 있도록 소패에 붙는 둘째 단계 목표(TargetFrom("xiaopei")).
                    // AttackOverwhelm에서 이미 소패를 편입시켜 뒀으니 같은
                    // 트릭(무장을 소패로 옮긴다)이 그대로 통한다.
                    var roster = new List<string>(RealmCityState.RosterIds);
                    var officerCityIds = new List<string>();
                    var officerCityCities = new List<string>();
                    foreach (var id in roster)
                    {
                        officerCityIds.Add(id);
                        officerCityCities.Add(id == RealmOfficerPool.StartingOfficerId ? RealmEnemyCity.XiaopeiId : RealmCityState.OfficerCityId(id));
                    }
                    RealmCityState.Restore(RealmCityState.Gold, RealmCityState.Year, RealmCityState.Month,
                        RealmEnemyCity.XiaopeiId, roster, null, new List<string>(RealmCityState.FoundIds),
                        officerCityIds, officerCityCities, RealmCityState.SnapshotCities());

                    var xiaopeiCity = RealmCityState.CityRecord(RealmEnemyCity.XiaopeiId);
                    xiaopeiCity.Troops = 100000;
                    xiaopeiCity.Food = 100000;

                    var result = RealmWarState.Attack(RealmEnemyCity.XiaopeiId);
                    if (!result.Ok || !result.Won || RealmCityState.CityRecord(RealmEnemyCity.XiapiId) == null ||
                        !RealmCityState.ActiveCityIds.Contains(RealmEnemyCity.XiapiId))
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 하비 공략 실패 — ok={result.Ok} won={result.Won} msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] xiapi attack + absorb OK - {result.Message}");
                    RealmCityState.SetCurrentCity("xuchang");
                    _phase = Phase.AttackDingtao;
                    break;
                }

                case Phase.AttackDingtao:
                {
                    // 51장 "대규모 콘텐츠" — 정도(복양에서만 출진)도 소패와
                    // 같은 RealmWarState.Attack() 경로로 함락·편입되는지
                    // 확인한다. 무장 전임은 범위 밖(CapturedCityDevelop과
                    // 같은 트릭) — 현책을 잠깐 복양으로 옮겨 "출진할 무장
                    // 필요" 조건만 채운다.
                    var roster = new List<string>(RealmCityState.RosterIds);
                    var officerCityIds = new List<string>();
                    var officerCityCities = new List<string>();
                    foreach (var id in roster)
                    {
                        officerCityIds.Add(id);
                        officerCityCities.Add(id == RealmOfficerPool.StartingOfficerId ? "puyang" : RealmCityState.OfficerCityId(id));
                    }
                    RealmCityState.Restore(RealmCityState.Gold, RealmCityState.Year, RealmCityState.Month,
                        "puyang", roster, null, new List<string>(RealmCityState.FoundIds),
                        officerCityIds, officerCityCities, RealmCityState.SnapshotCities());

                    var puyang = RealmCityState.CityRecord("puyang");
                    puyang.Troops = 100000;
                    puyang.Food = 100000;

                    var result = RealmWarState.Attack("puyang");
                    var dingtaoRecord = RealmCityState.CityRecord(RealmEnemyCity.DingtaoId);
                    if (!result.Ok || !result.Won || dingtaoRecord == null ||
                        !RealmCityState.ActiveCityIds.Contains(RealmEnemyCity.DingtaoId))
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 정도 공략 실패 — ok={result.Ok} won={result.Won} msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] dingtao attack + absorb OK - {result.Message}");
                    RealmCityState.SetCurrentCity("xuchang");
                    _phase = Phase.AttackYe;
                    break;
                }

                case Phase.AttackYe:
                {
                    // 51장 2차 확장 — 정도를 함락한 뒤 이어지는 둘째 단계
                    // 목표(TargetFrom("dingtao")), 다섯 중 가장 어렵다. 같은
                    // 트릭(무장을 정도로 옮긴다).
                    var roster = new List<string>(RealmCityState.RosterIds);
                    var officerCityIds = new List<string>();
                    var officerCityCities = new List<string>();
                    foreach (var id in roster)
                    {
                        officerCityIds.Add(id);
                        officerCityCities.Add(id == RealmOfficerPool.StartingOfficerId ? RealmEnemyCity.DingtaoId : RealmCityState.OfficerCityId(id));
                    }
                    RealmCityState.Restore(RealmCityState.Gold, RealmCityState.Year, RealmCityState.Month,
                        RealmEnemyCity.DingtaoId, roster, null, new List<string>(RealmCityState.FoundIds),
                        officerCityIds, officerCityCities, RealmCityState.SnapshotCities());

                    var dingtaoCity = RealmCityState.CityRecord(RealmEnemyCity.DingtaoId);
                    dingtaoCity.Troops = 100000;
                    dingtaoCity.Food = 100000;

                    var result = RealmWarState.Attack(RealmEnemyCity.DingtaoId);
                    if (!result.Ok || !result.Won || RealmCityState.CityRecord(RealmEnemyCity.YeId) == null ||
                        !RealmCityState.ActiveCityIds.Contains(RealmEnemyCity.YeId))
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 업 공략 실패 — ok={result.Ok} won={result.Won} msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] ye attack + absorb OK - {result.Message}");
                    RealmCityState.SetCurrentCity("xuchang");
                    _phase = Phase.AttackChangan;
                    break;
                }

                case Phase.AttackChangan:
                {
                    // 51장 3차 확장(2026-09-16) — 낙양을 함락한 뒤 이어지는
                    // 셋째 단계 목표(TargetFrom("luoyang")). 같은 트릭.
                    var roster = new List<string>(RealmCityState.RosterIds);
                    var officerCityIds = new List<string>();
                    var officerCityCities = new List<string>();
                    foreach (var id in roster)
                    {
                        officerCityIds.Add(id);
                        officerCityCities.Add(id == RealmOfficerPool.StartingOfficerId ? RealmEnemyCity.LuoyangId : RealmCityState.OfficerCityId(id));
                    }
                    RealmCityState.Restore(RealmCityState.Gold, RealmCityState.Year, RealmCityState.Month,
                        RealmEnemyCity.LuoyangId, roster, null, new List<string>(RealmCityState.FoundIds),
                        officerCityIds, officerCityCities, RealmCityState.SnapshotCities());

                    var luoyangCity = RealmCityState.CityRecord(RealmEnemyCity.LuoyangId);
                    luoyangCity.Troops = 100000;
                    luoyangCity.Food = 100000;

                    var result = RealmWarState.Attack(RealmEnemyCity.LuoyangId);
                    if (!result.Ok || !result.Won || RealmCityState.CityRecord(RealmEnemyCity.ChanganId) == null ||
                        !RealmCityState.ActiveCityIds.Contains(RealmEnemyCity.ChanganId))
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 장안 공략 실패 — ok={result.Ok} won={result.Won} msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] changan attack + absorb OK - {result.Message}");
                    RealmCityState.SetCurrentCity("xuchang");
                    _phase = Phase.AttackShouchun;
                    break;
                }

                case Phase.AttackShouchun:
                {
                    // 51장 3차 확장 — 하비를 함락한 뒤 이어지는 셋째 단계
                    // 목표(TargetFrom("xiapi")). 같은 트릭.
                    var roster = new List<string>(RealmCityState.RosterIds);
                    var officerCityIds = new List<string>();
                    var officerCityCities = new List<string>();
                    foreach (var id in roster)
                    {
                        officerCityIds.Add(id);
                        officerCityCities.Add(id == RealmOfficerPool.StartingOfficerId ? RealmEnemyCity.XiapiId : RealmCityState.OfficerCityId(id));
                    }
                    RealmCityState.Restore(RealmCityState.Gold, RealmCityState.Year, RealmCityState.Month,
                        RealmEnemyCity.XiapiId, roster, null, new List<string>(RealmCityState.FoundIds),
                        officerCityIds, officerCityCities, RealmCityState.SnapshotCities());

                    var xiapiCity = RealmCityState.CityRecord(RealmEnemyCity.XiapiId);
                    xiapiCity.Troops = 100000;
                    xiapiCity.Food = 100000;

                    var result = RealmWarState.Attack(RealmEnemyCity.XiapiId);
                    if (!result.Ok || !result.Won || RealmCityState.CityRecord(RealmEnemyCity.ShouchunId) == null ||
                        !RealmCityState.ActiveCityIds.Contains(RealmEnemyCity.ShouchunId))
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 수춘 공략 실패 — ok={result.Ok} won={result.Won} msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] shouchun attack + absorb OK - {result.Message}");
                    RealmCityState.SetCurrentCity("xuchang");
                    _phase = Phase.AttackJinyang;
                    break;
                }

                case Phase.AttackJinyang:
                {
                    // 51장 3차 확장 — 업을 함락한 뒤 이어지는 셋째 단계
                    // 목표(TargetFrom("ye")), 여덟 중 가장 어렵다. 같은 트릭.
                    var roster = new List<string>(RealmCityState.RosterIds);
                    var officerCityIds = new List<string>();
                    var officerCityCities = new List<string>();
                    foreach (var id in roster)
                    {
                        officerCityIds.Add(id);
                        officerCityCities.Add(id == RealmOfficerPool.StartingOfficerId ? RealmEnemyCity.YeId : RealmCityState.OfficerCityId(id));
                    }
                    RealmCityState.Restore(RealmCityState.Gold, RealmCityState.Year, RealmCityState.Month,
                        RealmEnemyCity.YeId, roster, null, new List<string>(RealmCityState.FoundIds),
                        officerCityIds, officerCityCities, RealmCityState.SnapshotCities());

                    var yeCity = RealmCityState.CityRecord(RealmEnemyCity.YeId);
                    yeCity.Troops = 100000;
                    yeCity.Food = 100000;

                    var result = RealmWarState.Attack(RealmEnemyCity.YeId);
                    if (!result.Ok || !result.Won || RealmCityState.CityRecord(RealmEnemyCity.JinyangId) == null ||
                        !RealmCityState.ActiveCityIds.Contains(RealmEnemyCity.JinyangId))
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 진양 공략 실패 — ok={result.Ok} won={result.Won} msg={result.Message}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] jinyang attack + absorb OK - {result.Message}");
                    RealmCityState.SetCurrentCity("xuchang");
                    _phase = Phase.QuizCorrect;
                    break;
                }

                case Phase.QuizCorrect:
                {
                    var drawn = RealmQuizState.Draw();
                    if (drawn == null)
                    {
                        Debug.LogError("[PlaytestRealmSlice] 문답 출제 실패 — 문제은행이 비었나");
                        Fail();
                        return;
                    }
                    var p = drawn.Value;
                    int goldBefore = RealmCityState.Gold;
                    var result = RealmQuizState.Answer(p, p.CorrectIndex);
                    if (!result.Ok || !result.First || result.Gold <= 0 || RealmCityState.Gold != goldBefore + result.Gold)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 문답 정답 처리 이상 — ok={result.Ok} first={result.First} gold={result.Gold} 금고={RealmCityState.Gold}(기대={goldBefore + result.Gold})");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] quiz correct OK - {p.Q} (+{result.Gold}냥, {result.Why})");
                    _phase = Phase.QuizWrong;
                    break;
                }

                case Phase.QuizWrong:
                {
                    var drawn = RealmQuizState.Draw();
                    if (drawn == null)
                    {
                        Debug.LogError("[PlaytestRealmSlice] 문답 출제 실패(2)");
                        Fail();
                        return;
                    }
                    var p = drawn.Value;
                    int wrongIdx = (p.CorrectIndex + 1) % p.Choices.Length;
                    int goldBefore = RealmCityState.Gold;
                    var result = RealmQuizState.Answer(p, wrongIdx);
                    var progress = RealmQuizState.GetProgress();
                    if (result.Ok || RealmCityState.Gold != goldBefore || progress.Learned < 1 || progress.Answered < 2)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 문답 오답 처리 이상 — ok={result.Ok} gold={RealmCityState.Gold}(기대={goldBefore}) learned={progress.Learned} answered={progress.Answered}");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] quiz wrong OK - {p.Q} (정답은 \"{result.AnswerText}\") learned={progress.Learned}/{progress.Total}");
                    _phase = Phase.QuizArchive;
                    break;
                }

                case Phase.QuizArchive:
                {
                    // 서고 — QuizCorrect에서 익힌 문제 하나가 최근 순 목록
                    // 맨 앞(정확히 하나뿐)에 그대로 있는지 확인한다.
                    var list = RealmQuizState.LearnedList();
                    if (list.Count != 1)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 서고 목록 개수 이상 — count={list.Count}(기대=1)");
                        Fail();
                        return;
                    }
                    var entry = list[0];
                    if (string.IsNullOrEmpty(entry.Q) || string.IsNullOrEmpty(entry.AnswerText) || string.IsNullOrEmpty(entry.Why))
                    {
                        Debug.LogError("[PlaytestRealmSlice] 서고 항목 필드 비어 있음");
                        Fail();
                        return;
                    }
                    Debug.Log($"[PlaytestRealmSlice] quiz archive OK - {entry.Q} (정답: {entry.AnswerText})");
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
                    string startOfficerCityBefore = RealmCityState.OfficerCityId(RealmOfficerPool.StartingOfficerId);
                    // RealmEnemyCity.AllIds를 도는 걸로 해 뒀다 — 51장이 더 늘려도
                    // (code-review 지적) 여기 손대는 걸 잊을 일이 없다.
                    var enemyAgriBefore = new Dictionary<string, int>();
                    var enemySnapBefore = new Dictionary<string, (int wall, int maxWall, int troops, int train, int tech, bool captured)>();
                    foreach (var enemyId in RealmEnemyCity.AllIds)
                    {
                        enemyAgriBefore[enemyId] = RealmCityState.CityRecord(enemyId).Agri;
                        enemySnapBefore[enemyId] = RealmWarState.Snapshot(enemyId);
                    }
                    var quizBefore = RealmQuizState.GetProgress();

                    if (!RealmSaveState.Save())
                    {
                        Debug.LogError("[PlaytestRealmSlice] RealmSaveState.Save() 실패");
                        Fail();
                        return;
                    }

                    // 상태를 흩트린 뒤(성 다섯 — 함락한 소패·정도 포함 — 전부
                    // 엉터리 값으로) 다시 불러와 그대로 돌아오는지 확인.
                    var dummyCities = new List<RealmCityState.CitySnapshot>();
                    foreach (var id in RealmCityData.AllCityIds.Concat(RealmEnemyCity.AllIds))
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
                    foreach (var enemyId in RealmEnemyCity.AllIds) RealmWarState.Restore(enemyId, 1, 1, 1, 1, 1, false);
                    RealmQuizState.Restore(new List<string>(), null, null, 0, 0, 0, 0);

                    if (!RealmSaveState.TryLoad())
                    {
                        Debug.LogError("[PlaytestRealmSlice] RealmSaveState.TryLoad() 실패");
                        Fail();
                        return;
                    }
                    bool enemyMismatch = false;
                    foreach (var enemyId in RealmEnemyCity.AllIds)
                    {
                        if (RealmWarState.Snapshot(enemyId) != enemySnapBefore[enemyId] ||
                            !RealmCityState.ActiveCityIds.Contains(enemyId) ||
                            RealmCityState.CityRecord(enemyId).Agri != enemyAgriBefore[enemyId])
                        {
                            enemyMismatch = true;
                            break;
                        }
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
                        RealmCityState.OfficerCityId("jp_musashi") != musashiCityBefore ||
                        enemyMismatch ||
                        RealmCityState.OfficerCityId(RealmOfficerPool.StartingOfficerId) != startOfficerCityBefore;
                    var quizAfter = RealmQuizState.GetProgress();
                    bool quizMismatch = quizAfter.Learned != quizBefore.Learned || quizAfter.Answered != quizBefore.Answered ||
                        quizAfter.Correct != quizBefore.Correct || quizAfter.Streak != quizBefore.Streak ||
                        quizAfter.BestStreak != quizBefore.BestStreak;
                    if (mismatch || quizMismatch)
                    {
                        Debug.LogError($"[PlaytestRealmSlice] 로드 후 불일치 발생 (성 열하나/로스터/성 소속/적국 여덟 전황/문답 중 하나) — quizMismatch={quizMismatch}");
                        Fail();
                        return;
                    }

                    Debug.Log("[PlaytestRealmSlice] save/load round-trip OK (11 cities incl. captured xiaopei/dingtao/luoyang/xiapi/ye/changan/shouchun/jinyang + roster + officer city assignment + quiz progress)");
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

        private static T GetPrivateField<T>(object target, string fieldName) where T : class
        {
            var field = target.GetType().GetField(fieldName, BindingFlags.NonPublic | BindingFlags.Instance);
            return field?.GetValue(target) as T;
        }

        /// <summary>PLAN.md 67~69장 "접근성"(2026-09-14) — GO
        /// `PlaytestHeadless.CheckSettingsPanel()`과 같은 결. 이 파일도
        /// STORY처럼 새 Phase를 안 늘리고 Init 안에서 한 번만 부른다.</summary>
        private static bool CheckSettingsPanel()
        {
            // REALM엔 GO/DUNGEON/FOREST/STORY 같은 독립 XxxSettingsPanel
            // GameObject가 없다 — RealmCommandUi가 스스로 짓는 캔버스 안에
            // "설정" 버튼+패널로 얹혀 있다(RealmCommandUi.Build() 참고).
            // 버튼은 이름이 "Btn_설정"이라 그걸로 찾는다.
            if (GameObject.Find("Btn_설정") == null)
            {
                Debug.LogError("[PlaytestRealmSlice] 설정 버튼(Btn_설정)을 못 찾음");
                return false;
            }

            bool sfxBefore = RealmSettingsState.SfxOn;
            RealmSettingsState.SfxOn = !sfxBefore;
            bool vibBefore = RealmSettingsState.VibrationOn;
            RealmSettingsState.VibrationOn = !vibBefore;
            if (RealmSettingsState.SfxOn == sfxBefore || RealmSettingsState.VibrationOn == vibBefore)
            {
                Debug.LogError("[PlaytestRealmSlice] 효과음/진동 토글이 안 바뀜");
                return false;
            }

            RealmSettingsState.UiScaleMultiplier = 1.15f;
            var scaler = Object.FindFirstObjectByType<CanvasScaler>();
            float expected = 1080f / 1.15f;
            if (scaler == null || Mathf.Abs(scaler.referenceResolution.x - expected) > 1f)
            {
                Debug.LogError($"[PlaytestRealmSlice] UI 크기가 캔버스에 안 먹음 — got={(scaler == null ? "null" : scaler.referenceResolution.x.ToString())}");
                return false;
            }
            RealmSettingsState.UiScaleMultiplier = 1f;

            RealmSettingsState.HighGraphicsQuality = false;
            if (!Mathf.Approximately(QualitySettings.shadowDistance, 15f) || QualitySettings.antiAliasing != 0)
            {
                Debug.LogError($"[PlaytestRealmSlice] 그래픽 품질(절약)이 QualitySettings에 안 먹음 — shadowDistance={QualitySettings.shadowDistance} aa={QualitySettings.antiAliasing}");
                return false;
            }
            RealmSettingsState.HighGraphicsQuality = true;

            string langBefore = RealmLocalization.CurrentLanguage;
            string qualityLabelBefore = RealmSettingsState.GraphicsQualityLabel();
            RealmLocalization.CycleLanguage();
            if (RealmLocalization.CurrentLanguage == langBefore
                || RealmSettingsState.GraphicsQualityLabel() == qualityLabelBefore)
            {
                Debug.LogError("[PlaytestRealmSlice] 언어 전환이 실제 문구를 안 바꿈");
                return false;
            }
            RealmLocalization.CurrentLanguage = langBefore;

            Debug.Log("[PlaytestRealmSlice] settings panel OK - sfx/vibration/ui-scale/graphics-quality/language all verified");
            return true;
        }

        /// <summary>2026-09-15 발견 — RealmCommandUi의 패널/라벨 참조
        /// 필드가 전부 [SerializeField] 없이 Build()(에디터에서 딱 한 번)
        /// 로만 채워져 있어서, 씬을 저장·재로드한 뒤(=실제 플레이 환경)
        /// 전부 null이었다(리플렉션 덤프로 직접 확인). 그런데도
        /// CheckSettingsPanel()은 GameObject.Find로 버튼 "존재"만 보고
        /// ToggleSettingsPanel() 등 RealmCommandUi 자신의 메서드는 한 번도
        /// 안 불러서 이 문제를 못 잡고 있었다 — 실제로는 "설정" 버튼을
        /// 누르면 NullReferenceException으로 죽는 상태였다. [SerializeField]로
        /// 승격한 뒤, 이번엔 실제로 패널을 토글해서(리플렉션으로 private
        /// 메서드 호출) 열리는지까지 본다 — 존재 확인이 아니라 동작 확인.</summary>
        private static bool CheckCommandUiPanelsWork()
        {
            var ui = Object.FindFirstObjectByType<RealmCommandUi>();
            if (ui == null)
            {
                Debug.LogError("[PlaytestRealmSlice] RealmCommandUi 인스턴스를 못 찾음");
                return false;
            }

            var settingsPanelField = typeof(RealmCommandUi).GetField("_settingsPanel", BindingFlags.NonPublic | BindingFlags.Instance);
            var settingsPanel = settingsPanelField.GetValue(ui) as GameObject;
            if (settingsPanel == null)
            {
                Debug.LogError("[PlaytestRealmSlice] RealmCommandUi._settingsPanel이 null — 씬 재로드 후 참조가 안 살아남음");
                return false;
            }

            var toggleMethod = typeof(RealmCommandUi).GetMethod("ToggleSettingsPanel", BindingFlags.NonPublic | BindingFlags.Instance);
            toggleMethod.Invoke(ui, null); // 열기 — 여기서 NRE가 나면 그대로 테스트 실패로 드러난다.
            if (!settingsPanel.activeSelf)
            {
                Debug.LogError("[PlaytestRealmSlice] ToggleSettingsPanel() 호출 후에도 설정 패널이 안 열림");
                return false;
            }
            toggleMethod.Invoke(ui, null); // 다시 닫아 다른 검사에 영향 안 주게.
            if (settingsPanel.activeSelf)
            {
                Debug.LogError("[PlaytestRealmSlice] ToggleSettingsPanel() 두 번째 호출 후에도 설정 패널이 안 닫힘");
                return false;
            }

            // 여덟 상시 버튼(명령/성/계략/공격/다음달/문답/지도/서고)도
            // 같은 세션에서 같이 고친 언어 전환 반영을 확인한다.
            var ordersLabelField = typeof(RealmCommandUi).GetField("_ordersLabel", BindingFlags.NonPublic | BindingFlags.Instance);
            var ordersLabel = ordersLabelField.GetValue(ui) as Text;
            if (ordersLabel == null)
            {
                Debug.LogError("[PlaytestRealmSlice] RealmCommandUi._ordersLabel이 null");
                return false;
            }
            string langBefore = RealmLocalization.CurrentLanguage;
            var refreshMethod = typeof(RealmCommandUi).GetMethod("RefreshSettingsPanel", BindingFlags.NonPublic | BindingFlags.Instance);
            RealmLocalization.CurrentLanguage = "en";
            refreshMethod.Invoke(ui, null);
            if (ordersLabel.text != "Orders")
            {
                Debug.LogError($"[PlaytestRealmSlice] 명령 버튼 영어 전환이 안 먹음 text=\"{ordersLabel.text}\"(기대=Orders)");
                RealmLocalization.CurrentLanguage = langBefore;
                return false;
            }
            RealmLocalization.CurrentLanguage = langBefore;
            refreshMethod.Invoke(ui, null);
            if (ordersLabel.text != "명령")
            {
                Debug.LogError($"[PlaytestRealmSlice] 명령 버튼이 원래 언어로 안 돌아옴 text=\"{ordersLabel.text}\"(기대=명령)");
                return false;
            }

            // 저장 버튼(2026-09-15 신설 — REALM만 없던 저장 버튼을 이번에
            // 같이 채웠다) — 실제로 눌러서 파일이 생기는지까지 본다.
            var saveLabelField = typeof(RealmCommandUi).GetField("_saveLabel", BindingFlags.NonPublic | BindingFlags.Instance);
            var saveLabel = saveLabelField.GetValue(ui) as Text;
            if (saveLabel == null)
            {
                Debug.LogError("[PlaytestRealmSlice] RealmCommandUi._saveLabel이 null");
                return false;
            }
            RealmSaveState.DeleteForTest();
            var executeSaveMethod = typeof(RealmCommandUi).GetMethod("ExecuteSave", BindingFlags.NonPublic | BindingFlags.Instance);
            try
            {
                executeSaveMethod.Invoke(ui, null);
            }
            catch (System.Reflection.TargetInvocationException e)
            {
                Debug.LogError($"[PlaytestRealmSlice] ExecuteSave() 호출이 예외를 던짐 — {e.InnerException}");
                return false;
            }
            if (!RealmSaveState.TryLoad())
            {
                Debug.LogError("[PlaytestRealmSlice] 저장 버튼을 눌렀는데 세이브 파일을 못 읽음");
                return false;
            }

            RealmLocalization.CurrentLanguage = "en";
            refreshMethod.Invoke(ui, null);
            if (saveLabel.text != "Save")
            {
                Debug.LogError($"[PlaytestRealmSlice] 저장 버튼 영어 전환이 안 먹음 text=\"{saveLabel.text}\"(기대=Save)");
                RealmLocalization.CurrentLanguage = langBefore;
                return false;
            }
            RealmLocalization.CurrentLanguage = langBefore;
            refreshMethod.Invoke(ui, null);

            Debug.Log("[PlaytestRealmSlice] command UI panels OK - settings panel actually toggles, orders/save labels follow language, save button actually writes a file");
            return true;
        }

        /// <summary>PLAN.md 67~69장 "Localization" 2차(2026-09-14) — RealmHud의
        /// 개간/상업/병력 등 상태 표시가 실제로 영어 문구를 보여주는지 본다.</summary>
        private static bool CheckRealmHudLocalization()
        {
            var hudGo = GameObject.Find("RealmHudUI");
            var hud = hudGo != null ? hudGo.GetComponent<RealmHud>() : null;
            var label = hudGo != null ? hudGo.GetComponentInChildren<Text>() : null;
            if (hud == null || label == null)
            {
                Debug.LogError("[PlaytestRealmSlice] RealmHudUI/Label을 못 찾음");
                return false;
            }

            string langBefore = RealmLocalization.CurrentLanguage;
            var method = typeof(RealmHud).GetMethod("Refresh", BindingFlags.NonPublic | BindingFlags.Instance);

            RealmLocalization.CurrentLanguage = "en";
            method.Invoke(hud, null);
            if (!label.text.Contains("Farming") || !label.text.Contains("Troops"))
            {
                Debug.LogError($"[PlaytestRealmSlice] RealmHud 영어 전환이 안 먹음 text=\"{label.text}\"");
                RealmLocalization.CurrentLanguage = langBefore;
                return false;
            }
            RealmLocalization.CurrentLanguage = langBefore;
            method.Invoke(hud, null);

            Debug.Log("[PlaytestRealmSlice] realm hud localization OK");
            return true;
        }
    }
}
