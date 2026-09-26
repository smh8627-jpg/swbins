using UnityEngine;
using UnityEngine.UI;
using Saga.Go.Audio;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 67~69장 "접근성" — 효과음·진동·UI 크기·그래픽 품질을 사람이
    /// 직접 고를 수 있게 한다(다섯 판이 각자 복사해 쓰는 관례 그대로,
    /// `GoAudio.cs`처럼 PlayerPrefs로 저장). 슬라이더는 이 프로젝트에
    /// 선례가 없어 새 위젯을 안 만들고, 이미 다섯 판 전부가 쓰는 버튼
    /// 하나로 값을 순환시키는 방식만 쓴다(`GoSettingsPanel.cs`).
    ///
    /// 효과음은 새 저장소를 안 만들고 이미 있는 `GoAudio.SfxVolume`을
    /// 0/1로 그대로 쓴다 — 두 값이 따로 놀 일이 없게.
    /// </summary>
    public static class GoSettingsState
    {
        private const string VibrationKey = "saga_go_vibration_on";
        private const string UiScaleKey = "saga_go_ui_scale";
        private const string GraphicsQualityKey = "saga_go_graphics_quality_high";

        public static readonly float[] UiScaleSteps = { 0.85f, 1f, 1.15f };
        private static readonly string[] UiScaleKeys = { "scale.small", "scale.normal", "scale.large" };

        public static bool SfxOn
        {
            get => GoAudio.SfxVolume > 0.5f;
            set => GoAudio.SfxVolume = value ? 1f : 0f;
        }

        /// <summary>효과음과 같은 결로 GoAudio.BgmVolume을 0/1로 그대로 쓴다.
        /// 이미 도는 트랙에도 바로 반영되도록 RefreshBgmVolume()을 같이 부른다.</summary>
        public static bool BgmOn
        {
            get => GoAudio.BgmVolume > 0.5f;
            set { GoAudio.BgmVolume = value ? 1f : 0f; GoAudio.RefreshBgmVolume(); }
        }

        public static bool VibrationOn
        {
            get => PlayerPrefs.GetInt(VibrationKey, 1) != 0;
            set => PlayerPrefs.SetInt(VibrationKey, value ? 1 : 0);
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

        /// <summary>다음 순서(작게→보통→크게→작게…)로 넘긴다 — 버튼 하나로
        /// 순환시키는 이 판 공통 방식(GraphicsQuality도 같은 결).</summary>
        public static void CycleUiScale()
        {
            int idx = System.Array.IndexOf(UiScaleSteps, UiScaleMultiplier);
            idx = (idx < 0 ? 0 : idx + 1) % UiScaleSteps.Length;
            UiScaleMultiplier = UiScaleSteps[idx];
        }

        public static string UiScaleLabel()
        {
            int idx = System.Array.IndexOf(UiScaleSteps, UiScaleMultiplier);
            return GoLocalization.T(UiScaleKeys[idx < 0 ? 1 : idx]);
        }

        /// <summary>사용자가 한 번도 안 건드렸으면 플랫폼 자동값(66-1장 —
        /// PC 빌드/에디터는 PC 프로필, 모바일 빌드는 Mobile 프로필)을 그대로
        /// 둔다 — 저장된 선택이 있을 때만 덮어쓴다.</summary>
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

        public static string GraphicsQualityLabel() => GoLocalization.T(HighGraphicsQuality ? "quality.high" : "quality.low");

        /// <summary>66-1장 PC/Mobile 두 QualitySettings 레벨은 서로
        /// `excludedTargetPlatforms`로 배타적이라(Mobile은 Standalone 제외,
        /// PC는 Android/iPhone 제외) `SetQualityLevel`로 상대 레벨을 골라
        /// 봐야 그 플랫폼에선 애초에 목록에 없다(QualitySettings.names에
        /// 안 잡혀 IndexOf가 -1 — 헤드리스 검증 중 실제로 겪음). 그래서
        /// 레벨 자체를 안 바꾸고, 지금 활성 레벨 위에 그림자 거리·AA만
        /// 직접 낮춰 "절약"을 흉내 낸다 — 플랫폼과 무관하게 항상 먹힌다.</summary>
        public static void ApplyGraphicsQuality()
        {
            if (!HasGraphicsQualityOverride) return;
            QualitySettings.shadowDistance = HighGraphicsQuality ? 40f : 15f;
            QualitySettings.antiAliasing = HighGraphicsQuality ? 2 : 0;
            Saga.Core.MobileGraphics.ApplyQuality(HighGraphicsQuality); // URP 는 위 둘을 안 읽는다 — 폰에선 파이프라인 에셋을 직접(2026-09-24 발열 점검)
        }

        /// <summary>다섯 판 모든 HUD 캔버스가 같은 기준(`SagaUi.GameReference`)을
        /// 쓴다는 걸 확인하고 고른 값이다(BuildTestVillageScene.cs 등의
        /// `referenceResolution` 전부 이 값) — 배수를 나눠 넣으면 "크게"가
        /// 실제로 더 크게 보인다(기준 해상도가 작아질수록 화면에 꽉 차게
        /// 늘어나므로).</summary>
        public static void ApplyUiScale(CanvasScaler scaler)
        {
            if (scaler == null) return;
            Saga.Core.SagaUi.ApplyGameScaler(scaler, UiScaleMultiplier); // 110 ⑤b — 기준은 SagaUi.GameReference 한 곳, 메뉴 캔버스는 건너뜀
        }

        /// <summary>씬에 이미 있는(에디터가 미리 지어 둔) 캔버스 전부에
        /// 지금 저장된 배율을 다시 먹인다 — GameBootstrap.Start()가 시작할
        /// 때 한 번, 설정에서 값을 바꿀 때마다 한 번씩 부른다. 전투 사건처럼
        /// 그 뒤에 새로 생기는 캔버스는 `EncounterUiKit.NewCanvas()`가
        /// 만들 때 스스로 이 값을 먹인다(따로 안 불러도 됨).</summary>
        public static void ApplyToAllScalers()
        {
            var scalers = Object.FindObjectsByType<CanvasScaler>(FindObjectsSortMode.None);
            foreach (var scaler in scalers) ApplyUiScale(scaler);
        }
    }
}
