using System.Reflection;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;
using Saga.Core;
using Saga.Forest.Data;
using Saga.Forest.UI;
using Saga.Forest.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// `PlaytestDungeonHeadless.cs`와 같은 결, 씬 경로만 다르다 —
    /// TestVillageForest 씬을 배치 모드에서 몇 프레임 재생해 런타임
    /// 예외가 없는지 확인한다. **주의 — -executeMethod로 부를 때 -quit을
    /// 같이 주지 않는다**(Run() 자신이 EditorApplication.Exit로 끝낸다).
    /// </summary>
    public static class PlaytestForestHeadless
    {
        private const string ScenePath = "Assets/Scenes/TestVillageForest.unity";
        private const int FramesToRun = 10;

        private static int _framesSeen;
        private static bool _hadError;
        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        [MenuItem("Saga/Playtest TestVillageForest (Headless)")]
        public static void Run()
        {
            _origEnterPlayModeOptionsEnabled = EditorSettings.enterPlayModeOptionsEnabled;
            _origEnterPlayModeOptions = EditorSettings.enterPlayModeOptions;
            EditorSettings.enterPlayModeOptionsEnabled = true;
            EditorSettings.enterPlayModeOptions =
                EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;

            ForestSaveState.DeleteForTest(); // 이전 헤드리스 실행이 남긴 세이브 무시(ForestSaveState.cs 주석 참고).
            EditorSceneManager.OpenScene(ScenePath);
            _framesSeen = 0;
            _hadError = false;
            Application.logMessageReceived += OnLog;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        private static void OnLog(string condition, string stackTrace, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception) return;
            if (stackTrace.Contains("UnityEditor.Search.SearchInit.IndexationOnStartup")) return;

            _hadError = true;
            Debug.LogError($"[PlaytestForestHeadless] runtime error: {condition}\n{stackTrace}");
        }

        private static void OnStateChanged(PlayModeStateChange state)
        {
            if (state == PlayModeStateChange.EnteredPlayMode)
            {
                EditorApplication.update += CountFrames;
            }
            else if (state == PlayModeStateChange.EnteredEditMode)
            {
                Application.logMessageReceived -= OnLog;
                EditorApplication.playModeStateChanged -= OnStateChanged;
                EditorSettings.enterPlayModeOptionsEnabled = _origEnterPlayModeOptionsEnabled;
                EditorSettings.enterPlayModeOptions = _origEnterPlayModeOptions;
                Debug.Log(_hadError
                    ? "[PlaytestForestHeadless] FAIL - runtime error(s) logged"
                    : $"[PlaytestForestHeadless] OK - {FramesToRun} frames, no errors");
                EditorApplication.Exit(_hadError ? 1 : 0);
            }
        }

        private static void CountFrames()
        {
            _framesSeen++;
            // PLAN.md 44~49장 디버그 화면(2026-09-14, GO/DUNGEON과 같은 결) —
            // 좌표 줄이 실제로 채워지는지 본다. 0.5초 FPS 타이머를 기다리는
            // 대신(배치 모드는 몇 프레임 안엔 절대 안 찬다) private
            // Refresh()를 리플렉션으로 직접 부른다.
            if (_framesSeen == 3)
            {
                CheckDebugHud();
                CheckSettingsPanel();
                CheckActionButtonLocalization();
                CheckGoalBoardAndSessionCard();
                CheckMuseum();
            }
            if (_framesSeen >= FramesToRun)
            {
                EditorApplication.update -= CountFrames;
                EditorApplication.isPlaying = false;
            }
        }

        private static void CheckDebugHud()
        {
            var hudGo = GameObject.Find("DebugUI");
            var hud = hudGo != null ? hudGo.GetComponent<DebugHud>() : null;
            var labelGo = hudGo != null ? hudGo.transform.Find("Label") : null;
            var label = labelGo != null ? labelGo.GetComponent<Text>() : null;
            if (hud == null || label == null)
            {
                Debug.LogError("[PlaytestForestHeadless] DebugUI/Label을 못 찾음");
                _hadError = true;
                return;
            }

            var method = typeof(DebugHud).GetMethod("Refresh", BindingFlags.NonPublic | BindingFlags.Instance);
            method.Invoke(hud, null);

            if (!label.text.Contains("pos:"))
            {
                Debug.LogError($"[PlaytestForestHeadless] 디버그 오버레이에 좌표가 안 보임 text=\"{label.text}\"");
                _hadError = true;
            }
            else
            {
                Debug.Log($"[PlaytestForestHeadless] debug hud OK - \"{label.text.Replace("\n", " | ")}\"");
            }
        }

        /// <summary>PLAN.md 104-1 ②(2026-09-16) — GO
        /// `PlaytestHeadless.CheckSettingsPanel()`과 같은 결로 존재 확인만
        /// 하던 걸 TogglePanel()·ChooseSfx() 실제 호출 + 라벨 텍스트
        /// 확인으로 바꿨다(RealmCommandUi 사례 재발 방지 — 그쪽 클래스
        /// 주석 참고).</summary>
        private static void CheckSettingsPanel()
        {
            var panel = Object.FindFirstObjectByType<ForestSettingsPanel>();
            if (panel == null)
            {
                Debug.LogError("[PlaytestForestHeadless] ForestSettingsPanel 컴포넌트를 못 찾음");
                _hadError = true;
                return;
            }

            var panelGoField = typeof(ForestSettingsPanel).GetField("_panel", BindingFlags.NonPublic | BindingFlags.Instance);
            var panelGo = panelGoField.GetValue(panel) as GameObject;
            if (panelGo == null)
            {
                Debug.LogError("[PlaytestForestHeadless] ForestSettingsPanel._panel이 null — 씬 재로드 후 참조가 안 살아남음");
                _hadError = true;
                return;
            }

            var toggleMethod = typeof(ForestSettingsPanel).GetMethod("TogglePanel", BindingFlags.NonPublic | BindingFlags.Instance);
            toggleMethod.Invoke(panel, null); // 열기 — 여기서 NRE가 나면 그대로 테스트 실패로 드러난다.
            if (!panelGo.activeSelf)
            {
                Debug.LogError("[PlaytestForestHeadless] TogglePanel() 호출 후에도 설정 패널이 안 열림");
                _hadError = true;
                return;
            }
            toggleMethod.Invoke(panel, null); // 닫기
            if (panelGo.activeSelf)
            {
                Debug.LogError("[PlaytestForestHeadless] TogglePanel() 두 번째 호출 후에도 설정 패널이 안 닫힘");
                _hadError = true;
                return;
            }

            var sfxValueLabelField = typeof(ForestSettingsPanel).GetField("_sfxValueLabel", BindingFlags.NonPublic | BindingFlags.Instance);
            var sfxValueLabel = sfxValueLabelField.GetValue(panel) as Text;
            if (sfxValueLabel == null)
            {
                Debug.LogError("[PlaytestForestHeadless] ForestSettingsPanel._sfxValueLabel이 null");
                _hadError = true;
                return;
            }

            bool sfxBefore = ForestSettingsState.SfxOn;
            var chooseSfxMethod = typeof(ForestSettingsPanel).GetMethod("ChooseSfx", BindingFlags.NonPublic | BindingFlags.Instance);
            chooseSfxMethod.Invoke(panel, null); // 실제 버튼 핸들러 — 상태를 뒤집고 Refresh()까지 그대로 탄다.
            string expectedText = ForestLocalization.T(ForestSettingsState.SfxOn ? "state.on" : "state.off");
            if (ForestSettingsState.SfxOn == sfxBefore || sfxValueLabel.text != expectedText)
            {
                Debug.LogError($"[PlaytestForestHeadless] ChooseSfx() 이후 라벨이 실제로 안 바뀜 text=\"{sfxValueLabel.text}\"(기대=\"{expectedText}\")");
                _hadError = true;
                return;
            }
            chooseSfxMethod.Invoke(panel, null); // 원상복귀

            bool vibBefore = ForestSettingsState.VibrationOn;
            ForestSettingsState.VibrationOn = !vibBefore;
            if (ForestSettingsState.VibrationOn == vibBefore)
            {
                Debug.LogError("[PlaytestForestHeadless] 진동 토글이 안 바뀜");
                _hadError = true;
                return;
            }

            ForestSettingsState.UiScaleMultiplier = 1.15f;
            var scaler = Object.FindFirstObjectByType<CanvasScaler>();
            float expected = 1080f / 1.15f;
            if (scaler == null || Mathf.Abs(scaler.referenceResolution.x - expected) > 1f)
            {
                Debug.LogError($"[PlaytestForestHeadless] UI 크기가 캔버스에 안 먹음 — got={(scaler == null ? "null" : scaler.referenceResolution.x.ToString())}");
                _hadError = true;
                return;
            }
            ForestSettingsState.UiScaleMultiplier = 1f;

            ForestSettingsState.HighGraphicsQuality = false;
            if (!Mathf.Approximately(QualitySettings.shadowDistance, 15f) || QualitySettings.antiAliasing != 0)
            {
                Debug.LogError($"[PlaytestForestHeadless] 그래픽 품질(절약)이 QualitySettings에 안 먹음 — shadowDistance={QualitySettings.shadowDistance} aa={QualitySettings.antiAliasing}");
                _hadError = true;
                return;
            }
            ForestSettingsState.HighGraphicsQuality = true;

            string langBefore = ForestLocalization.CurrentLanguage;
            string qualityLabelBefore = ForestSettingsState.GraphicsQualityLabel();
            ForestLocalization.CycleLanguage();
            if (ForestLocalization.CurrentLanguage == langBefore
                || ForestSettingsState.GraphicsQualityLabel() == qualityLabelBefore)
            {
                Debug.LogError("[PlaytestForestHeadless] 언어 전환이 실제 문구를 안 바꿈");
                _hadError = true;
                return;
            }
            ForestLocalization.CurrentLanguage = langBefore;

            Debug.Log("[PlaytestForestHeadless] settings panel OK - sfx/vibration/ui-scale/graphics-quality/language all verified");
        }

        /// <summary>2026-09-15 "저장 버튼 언어 전환 반응" — GO/DUNGEON/STORY에
        /// 이어 FOREST도 같은 문제(씬 빌드 시점 언어로 굳음)가 있었다.
        /// `LocalizedButtonLabel`(폴링, Update()는 private이라 리플렉션).</summary>
        private static void CheckActionButtonLocalization()
        {
            var go = GameObject.Find("SaveButton");
            var localized = go != null ? go.GetComponent<LocalizedButtonLabel>() : null;
            var label = go != null ? go.GetComponentInChildren<Text>() : null;
            if (localized == null || label == null)
            {
                Debug.LogError("[PlaytestForestHeadless] SaveButton/LocalizedButtonLabel을 못 찾음");
                _hadError = true;
                return;
            }

            string langBefore = ForestLocalization.CurrentLanguage;
            var method = typeof(LocalizedButtonLabel).GetMethod("Update", BindingFlags.NonPublic | BindingFlags.Instance);

            ForestLocalization.CurrentLanguage = "en";
            method.Invoke(localized, null);
            if (label.text != "Save")
            {
                Debug.LogError($"[PlaytestForestHeadless] 저장 버튼 영어 전환이 안 먹음 text=\"{label.text}\"(기대=Save)");
                _hadError = true;
                ForestLocalization.CurrentLanguage = langBefore;
                return;
            }
            ForestLocalization.CurrentLanguage = langBefore;
            method.Invoke(localized, null);
            if (label.text != "저장")
            {
                Debug.LogError($"[PlaytestForestHeadless] 저장 버튼이 원래 언어로 안 돌아옴 text=\"{label.text}\"(기대=저장)");
                _hadError = true;
            }

            Debug.Log("[PlaytestForestHeadless] action button localization OK");
        }

        /// <summary>PLAN.md 101-2 "공통 선행" A·B(FOREST 세 번째 이식) —
        /// `PlaytestHeadless.CheckGoalBoardAndSessionCard()`(GO)·
        /// `PlaytestDungeonHeadless`(DUNGEON)와 완전히 같은 기준 — GoalBoard
        /// 세 줄이 실제로 채워지는지, Awake()의 IGoalSource 자동 재탐색이
        /// 동작하는지, SessionCard 가 뜨고 스스로 닫히는지를 직접 확인한다 —
        /// 존재 확인만으로 끝내지 않는다.</summary>
        private static void CheckGoalBoardAndSessionCard()
        {
            var board = Object.FindFirstObjectByType<GoalBoard>();
            if (board == null)
            {
                Debug.LogError("[PlaytestForestHeadless] GoalBoard 컴포넌트를 못 찾음");
                _hadError = true;
                return;
            }

            var sourceField = typeof(GoalBoard).GetField("_source", BindingFlags.NonPublic | BindingFlags.Instance);
            if (sourceField.GetValue(board) == null)
            {
                Debug.LogError("[PlaytestForestHeadless] GoalBoard._source가 null — Awake() 자동 재탐색 실패");
                _hadError = true;
                return;
            }

            var labelField = typeof(GoalBoard).GetField("_label", BindingFlags.NonPublic | BindingFlags.Instance);
            var label = labelField.GetValue(board) as Text;
            if (label == null || !label.text.Contains("지금 —") || !label.text.Contains("이번 세션 —") || !label.text.Contains("이번 주 —"))
            {
                Debug.LogError($"[PlaytestForestHeadless] GoalBoard 세 줄이 안 채워짐 text=\"{(label == null ? "null" : label.text.Replace("\n", " | "))}\"");
                _hadError = true;
                return;
            }

            var card = Object.FindFirstObjectByType<SessionCard>();
            if (card == null)
            {
                Debug.LogError("[PlaytestForestHeadless] SessionCard 컴포넌트를 못 찾음");
                _hadError = true;
                return;
            }
            if (card.IsShowing)
            {
                Debug.LogError("[PlaytestForestHeadless] SessionCard가 세션 시작부터 떠 있음(기본은 숨김)");
                _hadError = true;
                return;
            }

            card.Show("테스트", "줄1", "줄2");
            if (!card.IsShowing)
            {
                Debug.LogError("[PlaytestForestHeadless] SessionCard.Show() 호출 후에도 안 뜸");
                _hadError = true;
                return;
            }

            // 5초를 실제로 안 기다리고 _closeTimer를 만료 직전으로 돌린 뒤
            // Update()를 한 번 더 불러 자동 닫힘 경로를 확인한다.
            var closeTimerField = typeof(SessionCard).GetField("_closeTimer", BindingFlags.NonPublic | BindingFlags.Instance);
            closeTimerField.SetValue(card, 0.0001f);
            var updateMethod = typeof(SessionCard).GetMethod("Update", BindingFlags.NonPublic | BindingFlags.Instance);
            updateMethod.Invoke(card, null);
            if (card.IsShowing)
            {
                Debug.LogError("[PlaytestForestHeadless] SessionCard가 만료 후에도 자동으로 안 닫힘");
                _hadError = true;
                return;
            }

            if (Object.FindFirstObjectByType<ForestSessionTracker>() == null)
            {
                Debug.LogError("[PlaytestForestHeadless] ForestSessionTracker 컴포넌트를 못 찾음");
                _hadError = true;
                return;
            }

            Debug.Log("[PlaytestForestHeadless] goal board / session card OK - 3 lines filled, source auto-found, card shows and auto-closes");
        }

        /// <summary>PLAN.md 101-2 5.3 "마을 번들"(2026-09-20 추가) — 네
        /// `ForestCollectSpot`이 실제로 존별로 하나씩 있는지, 걸어서 가까이
        /// 가면(리플렉션으로 `Update()`를 직접 불러 쿨다운·거리 판정까지
        /// 실제로 타는지) 처음 발견이 기록되고 같은 프레임 중복 호출은 안
        /// 늘어나는지 확인한다. 나머지 항목은 `ForestMuseumState.Record()`를
        /// 직접 불러 번들 완성·시설 스폰·전체 완성 깃발까지 빠르게 훑는다
        /// (DUNGEON `CheckSigilState`처럼 순수 상태 API를 직접 두드리는 결).</summary>
        private static void CheckMuseum()
        {
            var spots = Object.FindObjectsByType<ForestCollectSpot>(FindObjectsSortMode.None);
            if (spots.Length != 4)
            {
                Debug.LogError($"[PlaytestForestHeadless] ForestCollectSpot이 4개가 아님 — {spots.Length}");
                _hadError = true;
                return;
            }

            var categoryField = typeof(ForestCollectSpot).GetField("category", BindingFlags.NonPublic | BindingFlags.Instance);
            ForestCollectSpot insectSpot = null;
            foreach (var s in spots)
            {
                if ((ForestMuseumState.Category)categoryField.GetValue(s) == ForestMuseumState.Category.Insect) insectSpot = s;
            }
            if (insectSpot == null)
            {
                Debug.LogError("[PlaytestForestHeadless] 곤충(Insect) 채집 자리를 못 찾음");
                _hadError = true;
                return;
            }

            var playerGo = GameObject.FindWithTag("Player");
            if (playerGo == null)
            {
                Debug.LogError("[PlaytestForestHeadless] 마을 번들 검증용 player를 못 찾음");
                _hadError = true;
                return;
            }
            playerGo.transform.position = insectSpot.transform.position;

            var updateMethod = typeof(ForestCollectSpot).GetMethod("Update", BindingFlags.NonPublic | BindingFlags.Instance);
            int before = ForestMuseumState.DiscoveredCountOf(ForestMuseumState.Category.Insect);
            updateMethod.Invoke(insectSpot, null);
            int afterFirst = ForestMuseumState.DiscoveredCountOf(ForestMuseumState.Category.Insect);
            updateMethod.Invoke(insectSpot, null); // 같은 프레임 — 쿨다운에 걸려 늘면 안 됨.
            int afterSecond = ForestMuseumState.DiscoveredCountOf(ForestMuseumState.Category.Insect);

            if (afterFirst != before + 1 || afterSecond != afterFirst)
            {
                Debug.LogError($"[PlaytestForestHeadless] 채집 자리 발견 카운트가 이상함 — before={before} afterFirst={afterFirst}(기대 {before + 1}) afterSecond={afterSecond}(기대 {afterFirst}, 쿨다운)");
                _hadError = true;
                return;
            }

            // 나머지는 상태 API로 빠르게 채워 번들 완성·시설 스폰·전체 완성을 확인한다.
            foreach (var item in ForestMuseumState.ItemsOf(ForestMuseumState.Category.Insect))
            {
                ForestMuseumState.Record(ForestMuseumState.Category.Insect, item);
            }
            if (!ForestMuseumState.IsBundleDone(ForestMuseumState.Category.Insect) || GameObject.Find("Decor_FireflyJar") == null)
            {
                Debug.LogError("[PlaytestForestHeadless] 곤충 번들 완성인데 IsBundleDone/시설(Decor_FireflyJar)이 없음");
                _hadError = true;
                return;
            }

            foreach (var item in ForestMuseumState.ItemsOf(ForestMuseumState.Category.Mushroom))
            {
                ForestMuseumState.Record(ForestMuseumState.Category.Mushroom, item);
            }
            foreach (var item in ForestMuseumState.ItemsOf(ForestMuseumState.Category.Fossil))
            {
                ForestMuseumState.Record(ForestMuseumState.Category.Fossil, item);
            }
            if (GameObject.Find("Decor_MushroomCap") == null || GameObject.Find("Decor_FossilStele") == null)
            {
                Debug.LogError("[PlaytestForestHeadless] 버섯/화석 번들 시설이 안 생김");
                _hadError = true;
                return;
            }
            if (ForestMuseumState.AllBundlesDone)
            {
                Debug.LogError("[PlaytestForestHeadless] 화초 갈래를 아직 안 채웠는데 AllBundlesDone==true");
                _hadError = true;
                return;
            }

            foreach (var item in ForestMuseumState.ItemsOf(ForestMuseumState.Category.Flower))
            {
                ForestMuseumState.Record(ForestMuseumState.Category.Flower, item);
            }
            if (!ForestMuseumState.AllBundlesDone || GameObject.Find("Decor_MuseumFlagPole") == null)
            {
                Debug.LogError("[PlaytestForestHeadless] 네 번째 번들 완성 후 AllBundlesDone/깃발(Decor_MuseumFlagPole)이 없음");
                _hadError = true;
                return;
            }

            Debug.Log("[PlaytestForestHeadless] museum bundle OK - 채집 자리 발견+쿨다운, 갈래별 시설 스폰, 네 갈래 완성 시 깃발까지 확인");
        }
    }
}
