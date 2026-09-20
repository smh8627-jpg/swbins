using UnityEngine;
using UnityEngine.UI;
using Saga.Realm.Audio;

namespace Saga.Realm.Data
{
    /// <summary>
    /// PLAN.md 67~69장 "접근성" — `Saga.Go.Data.GoSettingsState.cs`와 같은
    /// 결(다섯 판이 각자 복사해 쓰는 관례). 효과음은 새 저장소를 안 만들고
    /// 이미 있는 `RealmAudio.SfxVolume`을 0/1로 그대로 쓴다.
    /// </summary>
    public static class RealmSettingsState
    {
        private const string VibrationKey = "saga_realm_vibration_on";
        private const string SuccessionKey = "saga_realm_succession_on";
        private const string UiScaleKey = "saga_realm_ui_scale";
        private const string GraphicsQualityKey = "saga_realm_graphics_quality_high";

        private static readonly Vector2 BaseReferenceResolution = new Vector2(1080f, 1920f);
        public static readonly float[] UiScaleSteps = { 0.85f, 1f, 1.15f };
        private static readonly string[] UiScaleKeys = { "scale.small", "scale.normal", "scale.large" };

        public static bool SfxOn
        {
            get => RealmAudio.SfxVolume > 0.5f;
            set => RealmAudio.SfxVolume = value ? 1f : 0f;
        }

        public static bool BgmOn
        {
            get => RealmAudio.BgmVolume > 0.5f;
            set { RealmAudio.BgmVolume = value ? 1f : 0f; RealmAudio.RefreshBgmVolume(); }
        }

        public static bool VibrationOn
        {
            get => PlayerPrefs.GetInt(VibrationKey, 1) != 0;
            set => PlayerPrefs.SetInt(VibrationKey, value ? 1 : 0);
        }

        /// <summary>PLAN.md 101-2 5-8 "허창 자리 계승" — 정권 이양 때 허창
        /// 치안이 절반으로 깎이는 대가가 있어(`RealmSuccessionState.cs`
        /// 클래스 주석) 웹판·saga-godot 손잡이 관례 그대로 기본 꺼짐.</summary>
        public static bool SuccessionOn
        {
            get => PlayerPrefs.GetInt(SuccessionKey, 0) != 0;
            set => PlayerPrefs.SetInt(SuccessionKey, value ? 1 : 0);
        }

        public static float UiScaleMultiplier
        {
            get => PlayerPrefs.GetFloat(UiScaleKey, 1f);
            set
            {
                PlayerPrefs.SetFloat(UiScaleKey, value);
                ApplyToAllScalers();
            }
        }

        public static void CycleUiScale()
        {
            int idx = System.Array.IndexOf(UiScaleSteps, UiScaleMultiplier);
            idx = (idx < 0 ? 0 : idx + 1) % UiScaleSteps.Length;
            UiScaleMultiplier = UiScaleSteps[idx];
        }

        public static string UiScaleLabel()
        {
            int idx = System.Array.IndexOf(UiScaleSteps, UiScaleMultiplier);
            return RealmLocalization.T(UiScaleKeys[idx < 0 ? 1 : idx]);
        }

        public static bool HasGraphicsQualityOverride => PlayerPrefs.HasKey(GraphicsQualityKey);

        public static bool HighGraphicsQuality
        {
            get => PlayerPrefs.GetInt(GraphicsQualityKey, 1) != 0;
            set
            {
                PlayerPrefs.SetInt(GraphicsQualityKey, value ? 1 : 0);
                ApplyGraphicsQuality();
            }
        }

        public static void CycleGraphicsQuality() => HighGraphicsQuality = !HighGraphicsQuality;

        public static string GraphicsQualityLabel() => RealmLocalization.T(HighGraphicsQuality ? "quality.high" : "quality.low");

        /// <summary>66-1장 PC/Mobile 두 QualitySettings 레벨은 서로
        /// `excludedTargetPlatforms`로 배타적이라 `SetQualityLevel`로
        /// 상대 레벨을 골라 봐야 그 플랫폼 목록엔 애초에 없다(IndexOf가
        /// -1 — 헤드리스 검증 중 실제로 겪음, `Saga.Go.Data.
        /// GoSettingsState.cs` 클래스 주석 참고). 레벨 자체를 안 바꾸고
        /// 지금 활성 레벨 위에 그림자 거리·AA만 직접 낮춘다.</summary>
        public static void ApplyGraphicsQuality()
        {
            if (!HasGraphicsQualityOverride) return;
            QualitySettings.shadowDistance = HighGraphicsQuality ? 40f : 15f;
            QualitySettings.antiAliasing = HighGraphicsQuality ? 2 : 0;
        }

        public static void ApplyUiScale(CanvasScaler scaler)
        {
            if (scaler == null) return;
            scaler.referenceResolution = BaseReferenceResolution / Mathf.Max(0.01f, UiScaleMultiplier);
        }

        public static void ApplyToAllScalers()
        {
            var scalers = Object.FindObjectsByType<CanvasScaler>(FindObjectsSortMode.None);
            foreach (var scaler in scalers) ApplyUiScale(scaler);
        }
    }
}
