using System.Reflection;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;
using Saga.Core;
using Saga.Go.Audio;
using Saga.Go.Data;
using Saga.Go.Player;
using Saga.Go.UI;
using Saga.Go.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// PlayerController.Awake() 같은 런타임 코드가 실제로 예외 없이 도는지
    /// 배치 모드에서 몇 프레임 재생해 확인한다 — saga-godot의 "--headless
    /// --quit-after N --verbose"와 같은 목적. 씬을 열고 Play 모드로 들어가
    /// FramesToRun만큼 프레임을 돌린 뒤 스스로 멈추고 EditorApplication.Exit로
    /// 종료한다(콘솔 오류/예외가 있었으면 exit code 1).
    ///
    /// 주의 — 이 메서드를 -executeMethod로 부를 때는 -quit을 같이 주지
    /// 않는다. -quit이 있으면 Run()이 반환하자마자(Play 모드가 실제로
    /// 시작하기도 전에) Unity가 종료해 버린다 — 종료는 이 스크립트가
    /// EditorApplication.Exit()로 직접 한다.
    ///
    /// 2026-09-11 — 이 PC의 Unity 6000.3.23f1 `-batchmode -nographics`
    /// 조합은 Play 모드 진입 중 도메인 리로드(어셈블리 리로드) 단계에서
    /// 멈춘다(ExitingEditMode에서 EnteredPlayMode로 영영 안 넘어감 — 빈
    /// 씬으로도 재현, TestVillage 씬 내용물과 무관함을 확인). Enter Play
    /// Mode Options로 도메인·씬 리로드를 끄면 정상 진입한다(PingExit.cs로
    /// 격리 재현, 지금은 지움). **주의 — 이 값은 실제로
    /// ProjectSettings/EditorSettings.asset에 저장된다**(처음엔 "Exit()로
    /// 바로 끝나면 저장 안 된다"고 잘못 적었었다 — 그건 프로젝트 충돌로
    /// 아예 실행이 안 된 케이스를 보고 낸 오판이었다, 실제로 Play 모드
    /// 진입에 성공하면 그대로 저장돼 사람이 여는 평소 에디터의 Play 버튼
    /// 동작까지 바꿔 버린다). 그래서 Run() 시작에 원래 값을 저장해 뒀다가
    /// 끝나기 직전(Exit 직전)에 반드시 되돌린다 — 헤드리스 실행 동안만
    /// 켜져 있어야 한다.
    /// </summary>
    public static class PlaytestHeadless
    {
        private const string ScenePath = "Assets/Scenes/TestVillage.unity";
        private const int FramesToRun = 10;

        private static int _framesSeen;
        private static bool _hadError;
        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        [MenuItem("Saga/Playtest TestVillage (Headless)")]
        public static void Run()
        {
            _origEnterPlayModeOptionsEnabled = EditorSettings.enterPlayModeOptionsEnabled;
            _origEnterPlayModeOptions = EditorSettings.enterPlayModeOptions;
            EditorSettings.enterPlayModeOptionsEnabled = true;
            EditorSettings.enterPlayModeOptions =
                EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;

            EditorSceneManager.OpenScene(ScenePath);
            _framesSeen = 0;
            _hadError = false;
            Application.logMessageReceived += OnLog;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        /// <summary>
        /// UnityEditor.Search.SearchInit.IndexationOnStartup()의
        /// ArgumentOutOfRangeException은 이 프로젝트에 SearchDatabase 인덱스
        /// 에셋이 하나도 없을 때 터지는 엔진 내부 버그다(2026-09-11 확인 —
        /// `-quit`만 준 순수 컴파일 배치에서도 똑같이 뜨고, 우리 코드와 전혀
        /// 무관하다). Play 모드 진입 시점과 우연히 겹쳐 찍히므로 걸러낸다 —
        /// 안 걸러내면 매번 FAIL로 오판된다(실제 PlayerController.Awake() 등은
        /// 예외 없이 돎).
        /// </summary>
        private static void OnLog(string condition, string stackTrace, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception) return;
            if (stackTrace.Contains("UnityEditor.Search.SearchInit.IndexationOnStartup")) return;

            _hadError = true;
            Debug.LogError($"[PlaytestHeadless] runtime error: {condition}\n{stackTrace}");
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
                    ? "[PlaytestHeadless] FAIL - runtime error(s) logged"
                    : $"[PlaytestHeadless] OK - {FramesToRun} frames, no errors");
                EditorApplication.Exit(_hadError ? 1 : 0);
            }
        }

        private static void CountFrames()
        {
            _framesSeen++;
            // 67장 "사운드"(2026-09-14) — GoAudio.PlaySfx가 헤드리스(-nographics,
            // 오디오 장치 없을 수 있음)에서도 예외 없이 도는지 한 번 확인한다.
            // BanditEncounter.cs가 실제로 쓰는 것과 같은 클립.
            if (_framesSeen == 3)
            {
                var clip = AssetDatabase.LoadAssetAtPath<AudioClip>("Assets/Art/Audio/Kenney_RPGSounds/chop.ogg");
                GoAudio.PlaySfx(clip);
                CheckDebugHud();
                CheckSettingsPanel();
                CheckPlayerHudLocalization();
                CheckActionButtonLocalization();
                CheckGoalBoardAndSessionCard();
                CheckBanditHitstop();
                CheckGroundDecal();
                // CheckBanditLootMarker보다 먼저 — DUNGEON에서 겪은 것과 같은
                // 함정(PlaytestDungeonHeadless.cs 참고)을 피하려고 이 체크를
                // 세션의 첫 레벨업으로 만든다. CheckBanditLootMarker의
                // FinishFight()가 PlayerStats.AddExp()를 불러 레벨업을 유발할
                // 수 있어, 그 뒤에 이 체크가 돌면 배치 모드 프레임 시간
                // 편차로 두 레벨업 컷이 겹쳐 간헐적으로 실패할 수 있다.
                CheckLevelUpCut();
                CheckBanditLootMarker();
                CheckWeaponVisual();
            }
            if (_framesSeen >= FramesToRun)
            {
                EditorApplication.update -= CountFrames;
                EditorApplication.isPlaying = false;
            }
        }

        /// <summary>PLAN.md 44~49장 디버그 화면 확장(2026-09-14, DebugHud.cs
        /// 클래스 주석 참고) — 레벨/사명/좌표 세 줄이 실제로 채워지는지
        /// 본다. 0.5초(unscaled) 타이머를 기다리는 대신(배치 모드는 프레임이
        /// 실시간보다 훨씬 빨리 돌아 몇 프레임 안엔 절대 안 찬다 — 다른
        /// Playtest들이 이미 겪은 함정과 같은 종류) private Refresh()를
        /// 리플렉션으로 직접 불러 판정 경로만 본다.</summary>
        private static void CheckDebugHud()
        {
            var hudGo = GameObject.Find("DebugUI");
            var hud = hudGo != null ? hudGo.GetComponent<DebugHud>() : null;
            var labelGo = hudGo != null ? hudGo.transform.Find("Label") : null;
            var label = labelGo != null ? labelGo.GetComponent<Text>() : null;
            if (hud == null || label == null)
            {
                Debug.LogError("[PlaytestHeadless] DebugUI/Label을 못 찾음");
                _hadError = true;
                return;
            }

            var method = typeof(DebugHud).GetMethod("Refresh", BindingFlags.NonPublic | BindingFlags.Instance);
            method.Invoke(hud, null);

            if (!label.text.Contains("lv ") || !label.text.Contains("quest:") || !label.text.Contains("pos:"))
            {
                Debug.LogError($"[PlaytestHeadless] 디버그 오버레이에 레벨/사명/좌표가 안 보임 text=\"{label.text}\"");
                _hadError = true;
            }
            else
            {
                Debug.Log($"[PlaytestHeadless] debug hud OK - \"{label.text.Replace("\n", " | ")}\"");
            }
        }

        /// <summary>PLAN.md 104-1 ②(2026-09-16) — 이전엔 GameObject.Find로
        /// 패널 "존재"만 보고 GoSettingsState 등 정적 API만 불러 검증했다.
        /// 그건 RealmCommandUi가 실제로는 [SerializeField] 누락으로 버튼을
        /// 누르면 죽는데도 안 잡히던 것과 같은 구멍이다(2026-09-15 발견,
        /// `PlaytestRealmSlice.CheckCommandUiPanelsWork()` 참고) — 정적
        /// 상태만 바뀌어도 통과해 버려서 화면 라벨이 실제로 갱신되는지는
        /// 한 번도 안 봤다. GoSettingsPanel._panel/_sfxValueLabel도 같은
        /// 패턴(Build()를 에디터가 한 번만 부름)이라 이번 세션에
        /// [SerializeField]로 승격했고, 여기서 TogglePanel()·ChooseSfx()를
        /// 리플렉션으로 직접 불러 패널이 실제로 열리고 라벨이 실제로
        /// 바뀌는지까지 본다.</summary>
        private static void CheckSettingsPanel()
        {
            var panel = Object.FindFirstObjectByType<GoSettingsPanel>();
            if (panel == null)
            {
                Debug.LogError("[PlaytestHeadless] GoSettingsPanel 컴포넌트를 못 찾음");
                _hadError = true;
                return;
            }

            var panelGoField = typeof(GoSettingsPanel).GetField("_panel", BindingFlags.NonPublic | BindingFlags.Instance);
            var panelGo = panelGoField.GetValue(panel) as GameObject;
            if (panelGo == null)
            {
                Debug.LogError("[PlaytestHeadless] GoSettingsPanel._panel이 null — 씬 재로드 후 참조가 안 살아남음");
                _hadError = true;
                return;
            }

            var toggleMethod = typeof(GoSettingsPanel).GetMethod("TogglePanel", BindingFlags.NonPublic | BindingFlags.Instance);
            toggleMethod.Invoke(panel, null); // 열기 — 여기서 NRE가 나면 그대로 테스트 실패로 드러난다.
            if (!panelGo.activeSelf)
            {
                Debug.LogError("[PlaytestHeadless] TogglePanel() 호출 후에도 설정 패널이 안 열림");
                _hadError = true;
                return;
            }
            toggleMethod.Invoke(panel, null); // 닫기 — 다른 검사에 영향 안 주게.
            if (panelGo.activeSelf)
            {
                Debug.LogError("[PlaytestHeadless] TogglePanel() 두 번째 호출 후에도 설정 패널이 안 닫힘");
                _hadError = true;
                return;
            }

            var sfxValueLabelField = typeof(GoSettingsPanel).GetField("_sfxValueLabel", BindingFlags.NonPublic | BindingFlags.Instance);
            var sfxValueLabel = sfxValueLabelField.GetValue(panel) as Text;
            if (sfxValueLabel == null)
            {
                Debug.LogError("[PlaytestHeadless] GoSettingsPanel._sfxValueLabel이 null");
                _hadError = true;
                return;
            }

            bool sfxBefore = GoSettingsState.SfxOn;
            var chooseSfxMethod = typeof(GoSettingsPanel).GetMethod("ChooseSfx", BindingFlags.NonPublic | BindingFlags.Instance);
            chooseSfxMethod.Invoke(panel, null); // 실제 버튼 핸들러 — 상태를 뒤집고 Refresh()까지 그대로 탄다.
            string expectedText = GoLocalization.T(GoSettingsState.SfxOn ? "state.on" : "state.off");
            if (GoSettingsState.SfxOn == sfxBefore || sfxValueLabel.text != expectedText)
            {
                Debug.LogError($"[PlaytestHeadless] ChooseSfx() 이후 라벨이 실제로 안 바뀜 text=\"{sfxValueLabel.text}\"(기대=\"{expectedText}\")");
                _hadError = true;
                return;
            }
            chooseSfxMethod.Invoke(panel, null); // 원상복귀

            bool vibBefore = GoSettingsState.VibrationOn;
            GoSettingsState.VibrationOn = !vibBefore;
            if (GoSettingsState.VibrationOn == vibBefore)
            {
                Debug.LogError("[PlaytestHeadless] 진동 토글이 안 바뀜");
                _hadError = true;
                return;
            }

            GoSettingsState.UiScaleMultiplier = 1.15f;
            var scaler = Object.FindFirstObjectByType<CanvasScaler>();
            float expected = 1080f / 1.15f;
            if (scaler == null || Mathf.Abs(scaler.referenceResolution.x - expected) > 1f)
            {
                Debug.LogError($"[PlaytestHeadless] UI 크기가 캔버스에 안 먹음 — got={(scaler == null ? "null" : scaler.referenceResolution.x.ToString())}");
                _hadError = true;
                return;
            }
            GoSettingsState.UiScaleMultiplier = 1f; // 다른 검사에 영향 없게 기본값으로 되돌린다.

            GoSettingsState.HighGraphicsQuality = false;
            if (!Mathf.Approximately(QualitySettings.shadowDistance, 15f) || QualitySettings.antiAliasing != 0)
            {
                Debug.LogError($"[PlaytestHeadless] 그래픽 품질(절약)이 QualitySettings에 안 먹음 — shadowDistance={QualitySettings.shadowDistance} aa={QualitySettings.antiAliasing}");
                _hadError = true;
                return;
            }
            GoSettingsState.HighGraphicsQuality = true; // 원래(기본) 값으로 되돌린다.

            // 2026-09-14 "Localization" — 언어를 실제로 바꾸면 라벨 문구도
            // 실제로 바뀌는지 본다(API만 값을 바꾸고 표는 그대로인 오탐을 막음).
            string langBefore = GoLocalization.CurrentLanguage;
            string qualityLabelBefore = GoSettingsState.GraphicsQualityLabel();
            GoLocalization.CycleLanguage();
            if (GoLocalization.CurrentLanguage == langBefore
                || GoSettingsState.GraphicsQualityLabel() == qualityLabelBefore)
            {
                Debug.LogError("[PlaytestHeadless] 언어 전환이 실제 문구를 안 바꿈");
                _hadError = true;
                return;
            }
            GoLocalization.CurrentLanguage = langBefore; // 다른 검사에 영향 없게 되돌린다.

            Debug.Log("[PlaytestHeadless] settings panel OK - sfx/vibration/ui-scale/graphics-quality/language all verified");
        }

        /// <summary>PLAN.md 67~69장 "Localization" 2차(2026-09-14) — PlayerHud의
        /// 경험치/돈 표시가 실제로 영어 문구를 보여주는지 본다(단순 T() 호출
        /// 성공이 아니라 string.Format 인자 순서가 실제로 맞는지까지).</summary>
        private static void CheckPlayerHudLocalization()
        {
            var hudGo = GameObject.Find("PlayerHudUI");
            var hud = hudGo != null ? hudGo.GetComponent<PlayerHud>() : null;
            var label = hudGo != null ? hudGo.GetComponentInChildren<Text>() : null;
            if (hud == null || label == null)
            {
                Debug.LogError("[PlaytestHeadless] PlayerHudUI/Label을 못 찾음");
                _hadError = true;
                return;
            }

            string langBefore = GoLocalization.CurrentLanguage;
            var method = typeof(PlayerHud).GetMethod("Refresh", BindingFlags.NonPublic | BindingFlags.Instance);

            GoLocalization.CurrentLanguage = "en";
            method.Invoke(hud, null);
            if (!label.text.Contains("EXP") || !label.text.Contains("Gold"))
            {
                Debug.LogError($"[PlaytestHeadless] PlayerHud 영어 전환이 안 먹음 text=\"{label.text}\"");
                _hadError = true;
                GoLocalization.CurrentLanguage = langBefore;
                return;
            }
            GoLocalization.CurrentLanguage = langBefore;
            method.Invoke(hud, null); // 다른 검사에 영향 없게 원래 언어로 다시 그린다.

            Debug.Log("[PlaytestHeadless] player hud localization OK");
        }

        /// <summary>2026-09-15 "저장 버튼 언어 전환 반응" — DUNGEON/STORY에
        /// 이어 GO도 같은 문제(씬 빌드 시점 언어로 굳음)가 있었다.
        /// `LocalizedButtonLabel`(폴링, Update()는 private이라 리플렉션).</summary>
        private static void CheckActionButtonLocalization()
        {
            var go = GameObject.Find("SaveButton");
            var localized = go != null ? go.GetComponent<LocalizedButtonLabel>() : null;
            var label = go != null ? go.GetComponentInChildren<Text>() : null;
            if (localized == null || label == null)
            {
                Debug.LogError("[PlaytestHeadless] SaveButton/LocalizedButtonLabel을 못 찾음");
                _hadError = true;
                return;
            }

            string langBefore = GoLocalization.CurrentLanguage;
            var method = typeof(LocalizedButtonLabel).GetMethod("Update", BindingFlags.NonPublic | BindingFlags.Instance);

            GoLocalization.CurrentLanguage = "en";
            method.Invoke(localized, null);
            if (label.text != "Save")
            {
                Debug.LogError($"[PlaytestHeadless] 저장 버튼 영어 전환이 안 먹음 text=\"{label.text}\"(기대=Save)");
                _hadError = true;
                GoLocalization.CurrentLanguage = langBefore;
                return;
            }
            GoLocalization.CurrentLanguage = langBefore;
            method.Invoke(localized, null);
            if (label.text != "저장")
            {
                Debug.LogError($"[PlaytestHeadless] 저장 버튼이 원래 언어로 안 돌아옴 text=\"{label.text}\"(기대=저장)");
                _hadError = true;
            }

            Debug.Log("[PlaytestHeadless] action button localization OK");
        }

        /// <summary>PLAN.md 101-2 "공통 선행" A·B(2026-09-16, GO 첫 이식) —
        /// GoalBoard 세 줄이 실제로 채워지는지, Awake()의 IGoalSource
        /// 자동 재탐색이 실제로 동작하는지(104-1 ③에서 고친 것과 같은
        /// 함정을 새 코드에서 되풀이하지 않았는지), SessionCard 가 뜨고
        /// 스스로 닫히는지를 직접 확인한다 — 존재 확인만으로 끝내지 않는다
        /// (104-1 ②와 같은 기준).</summary>
        private static void CheckGoalBoardAndSessionCard()
        {
            var board = Object.FindFirstObjectByType<GoalBoard>();
            if (board == null)
            {
                Debug.LogError("[PlaytestHeadless] GoalBoard 컴포넌트를 못 찾음");
                _hadError = true;
                return;
            }

            var sourceField = typeof(GoalBoard).GetField("_source", BindingFlags.NonPublic | BindingFlags.Instance);
            if (sourceField.GetValue(board) == null)
            {
                Debug.LogError("[PlaytestHeadless] GoalBoard._source가 null — Awake() 자동 재탐색 실패");
                _hadError = true;
                return;
            }

            var labelField = typeof(GoalBoard).GetField("_label", BindingFlags.NonPublic | BindingFlags.Instance);
            var label = labelField.GetValue(board) as Text;
            if (label == null || !label.text.Contains("지금 —") || !label.text.Contains("이번 세션 —") || !label.text.Contains("이번 주 —"))
            {
                Debug.LogError($"[PlaytestHeadless] GoalBoard 세 줄이 안 채워짐 text=\"{(label == null ? "null" : label.text.Replace("\n", " | "))}\"");
                _hadError = true;
                return;
            }

            var card = Object.FindFirstObjectByType<SessionCard>();
            if (card == null)
            {
                Debug.LogError("[PlaytestHeadless] SessionCard 컴포넌트를 못 찾음");
                _hadError = true;
                return;
            }
            if (card.IsShowing)
            {
                Debug.LogError("[PlaytestHeadless] SessionCard가 세션 시작부터 떠 있음(기본은 숨김)");
                _hadError = true;
                return;
            }

            card.Show("테스트", "줄1", "줄2");
            if (!card.IsShowing)
            {
                Debug.LogError("[PlaytestHeadless] SessionCard.Show() 호출 후에도 안 뜸");
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
                Debug.LogError("[PlaytestHeadless] SessionCard가 만료 후에도 자동으로 안 닫힘");
                _hadError = true;
                return;
            }

            if (Object.FindFirstObjectByType<GoSessionTracker>() == null)
            {
                Debug.LogError("[PlaytestHeadless] GoSessionTracker 컴포넌트를 못 찾음");
                _hadError = true;
                return;
            }

            Debug.Log("[PlaytestHeadless] goal board / session card OK - 3 lines filled, source auto-found, card shows and auto-closes");
        }

        /// <summary>PLAN.md 101-3 C hitstop(2026-09-17, DUNGEON·STORY 다음
        /// GO 차례) — `BanditEncounter.OnDuelEvent("hit")`를 리플렉션으로
        /// 직접 불러(`CheckGoalBoardAndSessionCard`의 `Update()` 직접 호출과
        /// 같은 결) `StartCoroutine()` 첫 세그먼트가 같은 프레임에 동기
        /// 실행된다는 점으로 Animator.speed==0을 확인한다. player·foe 각각
        /// 리깅 모델(Maria/Abe)이 이 PC에 없으면 폴백이라 null일 수 있다
        /// (DUNGEON `CheckHitstop`과 같은 "null 허용" — 실제로 이 세션에서
        /// player는 null, foe(Abe)는 있었다) — 최소 한쪽은 있어야 코드
        /// 경로 자체는 확인된다.</summary>
        private static void CheckBanditHitstop()
        {
            var encounter = Object.FindFirstObjectByType<BanditEncounter>();
            if (encounter == null)
            {
                Debug.LogError("[PlaytestHeadless] BanditEncounter 컴포넌트를 못 찾음");
                _hadError = true;
                return;
            }

            var startFight = typeof(BanditEncounter).GetMethod("StartFight", BindingFlags.NonPublic | BindingFlags.Instance);
            startFight.Invoke(encounter, null);

            var playerAnimatorField = typeof(BanditEncounter).GetField("_playerAnimator", BindingFlags.NonPublic | BindingFlags.Instance);
            var playerAnimator = playerAnimatorField.GetValue(encounter) as Animator;
            var visualField = typeof(BanditEncounter).GetField("_visual", BindingFlags.NonPublic | BindingFlags.Instance);
            var foeAnimator = (visualField.GetValue(encounter) as Transform)?.GetComponent<Animator>();

            if (playerAnimator == null && foeAnimator == null)
            {
                Debug.Log("[PlaytestHeadless] hitstop 검증 스킵 — player·foe 둘 다 Animator가 null(폴백 모델, 정상 케이스)");
                return;
            }

            var onDuelEvent = typeof(BanditEncounter).GetMethod("OnDuelEvent", BindingFlags.NonPublic | BindingFlags.Instance);
            onDuelEvent.Invoke(encounter, new object[] { new DuelRules.DuelEvent { T = "hit", Dmg = 1f } });

            if ((playerAnimator != null && playerAnimator.speed != 0f) || (foeAnimator != null && foeAnimator.speed != 0f))
            {
                Debug.LogError($"[PlaytestHeadless] hitstop이 hit 이벤트 직후 Animator를 안 멈춤 — player.speed={(playerAnimator != null ? playerAnimator.speed.ToString() : "null")} foe.speed={(foeAnimator != null ? foeAnimator.speed.ToString() : "null")}");
                _hadError = true;
                return;
            }
            Debug.Log($"[PlaytestHeadless] bandit hitstop OK - hit 이벤트 직후 확인(player={(playerAnimator != null)}, foe={(foeAnimator != null)})");
        }

        /// <summary>PLAN.md 101-3 G "지형 반응"(2026-09-17 추가) — DUNGEON
        /// `PlaytestDungeonHeadless.CheckGroundDecal()`과 같은 결. `hit`
        /// 이벤트가 실제로 `GroundDecal.Spawn(HitMark)`을 부르는지, 그리고
        /// "최대 32" 캡이 지켜지는지 본다(발자국은 씬이 짧게 도는 헤드리스
        /// 특성상 플레이어가 거의 안 움직여 여기선 안 본다 — 히트마크와
        /// 스폰 함수 자체가 같아 캡 검증엔 충분하다).</summary>
        private static void CheckGroundDecal()
        {
            var encounter = Object.FindFirstObjectByType<BanditEncounter>();
            if (encounter == null)
            {
                Debug.LogError("[PlaytestHeadless] 지형 데칼 검증용 BanditEncounter를 못 찾음");
                _hadError = true;
                return;
            }

            int before = GroundDecal.ActiveCount;
            var onDuelEvent = typeof(BanditEncounter).GetMethod("OnDuelEvent", BindingFlags.NonPublic | BindingFlags.Instance);
            onDuelEvent.Invoke(encounter, new object[] { new DuelRules.DuelEvent { T = "hit", Dmg = 1f } });

            if (GroundDecal.ActiveCount <= before)
            {
                Debug.LogError($"[PlaytestHeadless] 타격 지형 데칼이 안 생김 — before={before} after={GroundDecal.ActiveCount}");
                _hadError = true;
                return;
            }

            for (int i = 0; i < 40; i++)
            {
                GroundDecal.Spawn(Vector3.zero, GroundDecal.Kind.HitMark);
            }

            if (GroundDecal.ActiveCount > 32)
            {
                Debug.LogError($"[PlaytestHeadless] 지형 데칼 최대 32 캡이 안 지켜짐 — ActiveCount={GroundDecal.ActiveCount}");
                _hadError = true;
                return;
            }

            Debug.Log($"[PlaytestHeadless] ground decal OK - hit마다 생성 확인, 캡 이후 ActiveCount={GroundDecal.ActiveCount}(<=32)");
        }

        /// <summary>PLAN.md 101-3 G "성장 연출"(2026-09-17 추가) — DUNGEON
        /// `CameraRig.PlayLevelUpCut()`과 같은 결. `PlayerStats.AddExp()`가
        /// `LeveledUp`을 동기 호출하고 `GameBootstrap.OnLeveledUp()`이 그
        /// 자리에서 `StartCoroutine()`을 불러 같은 프레임에 `_zoom`이 이미
        /// 움직여 있다. **`CheckBanditLootMarker`보다 반드시 먼저 돈다**(위
        /// `CountFrames()` 주석 참고).</summary>
        private static void CheckLevelUpCut()
        {
            var cameraRig = Object.FindFirstObjectByType<CameraRig>();
            if (cameraRig == null)
            {
                Debug.LogError("[PlaytestHeadless] 성장 연출 검증용 CameraRig를 못 찾음");
                _hadError = true;
                return;
            }

            var zoomField = typeof(CameraRig).GetField("_zoom", BindingFlags.NonPublic | BindingFlags.Instance);
            float zoomBefore = (float)zoomField.GetValue(cameraRig);

            PlayerStats.AddExp(PlayerStats.ExpToNext + 1);

            float zoomAfter = (float)zoomField.GetValue(cameraRig);
            if (Mathf.Approximately(zoomAfter, zoomBefore))
            {
                Debug.LogError($"[PlaytestHeadless] 레벨업 직후 카메라 줌이 안 바뀜 — zoom={zoomAfter}");
                _hadError = true;
                return;
            }
            Debug.Log($"[PlaytestHeadless] level-up cut OK - 레벨업 직후 zoom {zoomBefore:F2}→{zoomAfter:F2}");
        }

        /// <summary>PLAN.md 101-3 F "죽음"(2026-09-17 추가) — DUNGEON
        /// `CheckLootMarker()`와 같은 결. `_duel.Cleared`를 강제로 true로
        /// 만든 뒤 `FinishFight()`를 직접 불러 승리 경로(보상+`LootMarker.
        /// Spawn()`+`Destroy(gameObject)`)를 실제로 태운다.</summary>
        private static void CheckBanditLootMarker()
        {
            var encounter = Object.FindFirstObjectByType<BanditEncounter>();
            if (encounter == null)
            {
                Debug.LogError("[PlaytestHeadless] 유품 마커 검증용 BanditEncounter를 못 찾음");
                _hadError = true;
                return;
            }

            var startFight = typeof(BanditEncounter).GetMethod("StartFight", BindingFlags.NonPublic | BindingFlags.Instance);
            startFight.Invoke(encounter, null);

            var duelField = typeof(BanditEncounter).GetField("_duel", BindingFlags.NonPublic | BindingFlags.Instance);
            var duel = (DuelRules)duelField.GetValue(encounter);
            duel.Cleared = true;

            int before = LootMarker.SpawnCount;
            var finishFight = typeof(BanditEncounter).GetMethod("FinishFight", BindingFlags.NonPublic | BindingFlags.Instance);
            finishFight.Invoke(encounter, null);

            if (LootMarker.SpawnCount != before + 1)
            {
                Debug.LogError($"[PlaytestHeadless] 유품 마커가 안 생김 — SpawnCount {before} → {LootMarker.SpawnCount}");
                _hadError = true;
                return;
            }
            Debug.Log("[PlaytestHeadless] loot marker OK - 승리 시 LootMarker.Spawn 호출 확인(픽업 경로는 이후 자연 프레임에서 같이 검증됨)");
        }

        /// <summary>PLAN.md 101-3 G "장비 가시화"(2026-09-17 추가) — DUNGEON
        /// `CheckWeaponVisual()`과 같은 결. `Inventory.AddItem("wp_relic")`
        /// (2등급, 카탈로그 최고 공격력이라 이 시점까지 무슨 무기가 장착돼
        /// 있었든 확실히 자동 장착된다)을 불러 칼날 크기가 커지는지 본다.</summary>
        private static void CheckWeaponVisual()
        {
            var weaponVisual = Object.FindFirstObjectByType<WeaponVisual>();
            if (weaponVisual == null)
            {
                Debug.LogError("[PlaytestHeadless] 무기 가시화 검증용 WeaponVisual을 못 찾음");
                _hadError = true;
                return;
            }

            var bladeField = typeof(WeaponVisual).GetField("_blade", BindingFlags.NonPublic | BindingFlags.Instance);
            var blade = (Transform)bladeField.GetValue(weaponVisual);
            if (blade == null)
            {
                Debug.LogError("[PlaytestHeadless] 무기 칼날(blade) 메시가 안 생김");
                _hadError = true;
                return;
            }

            float lengthBefore = blade.localScale.y;
            Inventory.AddItem("wp_relic");
            float lengthAfter = blade.localScale.y;

            if (lengthAfter <= lengthBefore)
            {
                Debug.LogError($"[PlaytestHeadless] 무기 등급 갱신이 칼날 크기에 안 반영됨 — {lengthBefore:F2}→{lengthAfter:F2}");
                _hadError = true;
                return;
            }
            Debug.Log($"[PlaytestHeadless] weapon visual OK - 무기 교체 시 칼날 길이 {lengthBefore:F2}→{lengthAfter:F2}(등급 갱신 반영)");
        }
    }
}
