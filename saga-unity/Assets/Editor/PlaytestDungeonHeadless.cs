using System.Reflection;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;
using Saga.Dungeon.Data;
using Saga.Dungeon.Player;
using Saga.Dungeon.UI;
using Saga.Dungeon.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// `PlaytestHeadless.cs`(GO)와 같은 결, 씬 경로만 다르다 — TestDungeon
    /// 씬을 배치 모드에서 몇 프레임 재생해 런타임 예외가 없는지 확인한다.
    /// **주의 — PlaytestHeadless.cs와 같은 이유로 -executeMethod로 부를
    /// 때 -quit을 같이 주지 않는다.**
    ///
    /// **회전베기 검증(2026-09-14 추가)** — 이 프로젝트의 DUNGEON
    /// Playtest들은 지금까지 `TakeDamage(999999f)`로 적을 바로 죽여
    /// 전투 스킬(TryAttack/TryHeavyAttack) 자체는 한 번도 직접 확인한
    /// 적이 없었다(PlaytestDungeonFloorProgression.cs 등). 새 AoE
    /// 스킬(PlayerCombat.TriggerWhirl, PLAN.md 51장 "DUNGEON 확장 —
    /// 빌드")은 "반경 안 여럿, 반경 밖은 안 건드림"이 핵심이라 이번엔
    /// 직접 스폰한 더미로 실제로 확인한다(STORY `PlaytestStorySlice.
    /// SpawnDummyEnemy`와 같은 결).
    /// </summary>
    public static class PlaytestDungeonHeadless
    {
        private const string ScenePath = "Assets/Scenes/TestDungeon.unity";
        private const int FramesToRun = 10;
        private const int WhirlCheckFrame = 3; // 씬 로드 직후 Awake 체인이 다 돈 뒤(여유 있게 잡음).

        private static int _framesSeen;
        private static bool _hadError;
        private static bool _whirlChecked;
        private static bool _origEnterPlayModeOptionsEnabled;
        private static EnterPlayModeOptions _origEnterPlayModeOptions;

        [MenuItem("Saga/Playtest TestDungeon (Headless)")]
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
            _whirlChecked = false;
            Application.logMessageReceived += OnLog;
            EditorApplication.playModeStateChanged += OnStateChanged;
            EditorApplication.isPlaying = true;
        }

        private static void OnLog(string condition, string stackTrace, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception) return;
            if (stackTrace.Contains("UnityEditor.Search.SearchInit.IndexationOnStartup")) return;

            _hadError = true;
            Debug.LogError($"[PlaytestDungeonHeadless] runtime error: {condition}\n{stackTrace}");
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
                    ? "[PlaytestDungeonHeadless] FAIL - runtime error(s) logged"
                    : $"[PlaytestDungeonHeadless] OK - {FramesToRun} frames, no errors");
                EditorApplication.Exit(_hadError ? 1 : 0);
            }
        }

        private static void CountFrames()
        {
            _framesSeen++;

            if (_framesSeen == WhirlCheckFrame && !_whirlChecked)
            {
                _whirlChecked = true;
                CheckWhirl();
                CheckDebugHud();
                CheckSettingsPanel();
                CheckPlayerHudLocalization();
            }

            if (_framesSeen >= FramesToRun)
            {
                EditorApplication.update -= CountFrames;
                EditorApplication.isPlaying = false;
            }
        }

        private static void CheckWhirl()
        {
            var playerGo = GameObject.FindWithTag("Player");
            var combat = playerGo != null ? playerGo.GetComponent<PlayerCombat>() : null;
            if (playerGo == null || combat == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] 회전베기 검증용 player/PlayerCombat을 못 찾음");
                _hadError = true;
                return;
            }

            Vector3 origin = playerGo.transform.position;
            var near1 = SpawnDummyEnemy(origin + new Vector3(1.5f, 0f, 0f));
            var near2 = SpawnDummyEnemy(origin + new Vector3(-1.5f, 0f, 0f));
            var far = SpawnDummyEnemy(origin + new Vector3(10f, 0f, 0f));

            float hpBefore = (float)GetPrivate(near1, "hp");
            combat.TriggerWhirl();

            float near1Hp = (float)GetPrivate(near1, "_curHp");
            float near2Hp = (float)GetPrivate(near2, "_curHp");
            float farHp = (float)GetPrivate(far, "_curHp");

            if (near1Hp >= hpBefore || near2Hp >= hpBefore)
            {
                Debug.LogError($"[PlaytestDungeonHeadless] 회전베기가 반경 안 더미를 안 때림 — near1={near1Hp} near2={near2Hp}(기대 < {hpBefore})");
                _hadError = true;
            }
            else if (!Mathf.Approximately(farHp, hpBefore))
            {
                Debug.LogError($"[PlaytestDungeonHeadless] 회전베기가 반경 밖 더미까지 때림 — far={farHp}(기대={hpBefore})");
                _hadError = true;
            }
            else
            {
                Debug.Log($"[PlaytestDungeonHeadless] whirl OK - near1={near1Hp} near2={near2Hp} far={farHp}(변화 없음)");
            }
        }

        /// <summary>PLAN.md 44~49장 디버그 화면(2026-09-14, GO와 같은 결) —
        /// 레벨/층/적 수/사명/좌표 줄이 실제로 채워지는지 본다.</summary>
        private static void CheckDebugHud()
        {
            var hudGo = GameObject.Find("DebugUI");
            var hud = hudGo != null ? hudGo.GetComponent<DebugHud>() : null;
            var labelGo = hudGo != null ? hudGo.transform.Find("Label") : null;
            var label = labelGo != null ? labelGo.GetComponent<Text>() : null;
            if (hud == null || label == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] DebugUI/Label을 못 찾음");
                _hadError = true;
                return;
            }

            var method = typeof(DebugHud).GetMethod("Refresh", BindingFlags.NonPublic | BindingFlags.Instance);
            method.Invoke(hud, null);

            if (!label.text.Contains("lv ") || !label.text.Contains("floor ") || !label.text.Contains("quest:") || !label.text.Contains("pos:"))
            {
                Debug.LogError($"[PlaytestDungeonHeadless] 디버그 오버레이 내용 이상 text=\"{label.text}\"");
                _hadError = true;
            }
            else
            {
                Debug.Log($"[PlaytestDungeonHeadless] debug hud OK - \"{label.text.Replace("\n", " | ")}\"");
            }
        }

        /// <summary>PLAN.md 67~69장 "접근성"(2026-09-14) — GO
        /// `PlaytestHeadless.CheckSettingsPanel()`과 같은 결.</summary>
        private static void CheckSettingsPanel()
        {
            if (GameObject.Find("DungeonSettingsPanel") == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] DungeonSettingsPanel을 못 찾음");
                _hadError = true;
                return;
            }

            bool sfxBefore = DungeonSettingsState.SfxOn;
            DungeonSettingsState.SfxOn = !sfxBefore;
            bool vibBefore = DungeonSettingsState.VibrationOn;
            DungeonSettingsState.VibrationOn = !vibBefore;
            if (DungeonSettingsState.SfxOn == sfxBefore || DungeonSettingsState.VibrationOn == vibBefore)
            {
                Debug.LogError("[PlaytestDungeonHeadless] 효과음/진동 토글이 안 바뀜");
                _hadError = true;
                return;
            }

            DungeonSettingsState.UiScaleMultiplier = 1.15f;
            var scaler = Object.FindFirstObjectByType<CanvasScaler>();
            float expected = 1080f / 1.15f;
            if (scaler == null || Mathf.Abs(scaler.referenceResolution.x - expected) > 1f)
            {
                Debug.LogError($"[PlaytestDungeonHeadless] UI 크기가 캔버스에 안 먹음 — got={(scaler == null ? "null" : scaler.referenceResolution.x.ToString())}");
                _hadError = true;
                return;
            }
            DungeonSettingsState.UiScaleMultiplier = 1f;

            DungeonSettingsState.HighGraphicsQuality = false;
            if (!Mathf.Approximately(QualitySettings.shadowDistance, 15f) || QualitySettings.antiAliasing != 0)
            {
                Debug.LogError($"[PlaytestDungeonHeadless] 그래픽 품질(절약)이 QualitySettings에 안 먹음 — shadowDistance={QualitySettings.shadowDistance} aa={QualitySettings.antiAliasing}");
                _hadError = true;
                return;
            }
            DungeonSettingsState.HighGraphicsQuality = true;

            string langBefore = DungeonLocalization.CurrentLanguage;
            string qualityLabelBefore = DungeonSettingsState.GraphicsQualityLabel();
            DungeonLocalization.CycleLanguage();
            if (DungeonLocalization.CurrentLanguage == langBefore
                || DungeonSettingsState.GraphicsQualityLabel() == qualityLabelBefore)
            {
                Debug.LogError("[PlaytestDungeonHeadless] 언어 전환이 실제 문구를 안 바꿈");
                _hadError = true;
                return;
            }
            DungeonLocalization.CurrentLanguage = langBefore;

            Debug.Log("[PlaytestDungeonHeadless] settings panel OK - sfx/vibration/ui-scale/graphics-quality/language all verified");
        }

        /// <summary>PLAN.md 67~69장 "Localization" 2차(2026-09-14) — PlayerHud의
        /// 체력/경험치/돈/공격력/층 표시가 실제로 영어 문구를 보여주는지 본다.</summary>
        private static void CheckPlayerHudLocalization()
        {
            var hudGo = GameObject.Find("PlayerHudUI");
            var hud = hudGo != null ? hudGo.GetComponent<PlayerHud>() : null;
            var label = hudGo != null ? hudGo.GetComponentInChildren<Text>() : null;
            if (hud == null || label == null)
            {
                Debug.LogError("[PlaytestDungeonHeadless] PlayerHudUI/Label을 못 찾음");
                _hadError = true;
                return;
            }

            string langBefore = DungeonLocalization.CurrentLanguage;
            var method = typeof(PlayerHud).GetMethod("Refresh", BindingFlags.NonPublic | BindingFlags.Instance);

            DungeonLocalization.CurrentLanguage = "en";
            method.Invoke(hud, null);
            if (!label.text.Contains("HP") || !label.text.Contains("EXP") || !label.text.Contains("ATK"))
            {
                Debug.LogError($"[PlaytestDungeonHeadless] PlayerHud 영어 전환이 안 먹음 text=\"{label.text}\"");
                _hadError = true;
                DungeonLocalization.CurrentLanguage = langBefore;
                return;
            }
            DungeonLocalization.CurrentLanguage = langBefore;
            method.Invoke(hud, null);

            Debug.Log("[PlaytestDungeonHeadless] player hud localization OK");
        }

        private static DungeonEnemy SpawnDummyEnemy(Vector3 position)
        {
            var go = new GameObject("WhirlTestDummy");
            go.transform.position = position;
            return go.AddComponent<DungeonEnemy>();
        }

        private static object GetPrivate(object target, string fieldName)
        {
            var field = target.GetType().GetField(fieldName, BindingFlags.NonPublic | BindingFlags.Instance);
            return field?.GetValue(target);
        }
    }
}
