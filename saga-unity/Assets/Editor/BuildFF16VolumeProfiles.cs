using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 66-2장(파이널 판타지 최신작 기준) "다음에 할 일" ① 라이팅/
    /// 색보정/후처리 셋업 — 에셋 없이 바로 되는 항목이라 가장 먼저 한다.
    /// 66-1장의 PC_RPAsset/Mobile_RPAsset과 같은 결로 **공유 데이터 자산
    /// 둘**(FF16Volume_PC·FF16Volume_Mobile)을 여기서 한 번 짓고, 다섯 판
    /// 각자의 BuildXxxScene.cs가 이 자산을 참조하는 GlobalVolume을 추가로
    /// 짓는다(코드는 5벌 복사가 이 프로젝트 관례 — SetPrivateField처럼,
    /// 자산은 RPAsset처럼 공유).
    ///
    /// 멱등 — 다시 실행하면 두 자산을 지우고 새로 짓는다.
    /// </summary>
    public static class BuildFF16VolumeProfiles
    {
        public const string PcProfilePath = "Assets/Settings/FF16Volume_PC.asset";
        public const string MobileProfilePath = "Assets/Settings/FF16Volume_Mobile.asset";

        [MenuItem("Saga/Build FF16 Volume Profiles")]
        public static void Build()
        {
            var pc = CreateFreshProfile(PcProfilePath);
            BuildSharedOverrides(pc);
            BuildPcOnlyOverrides(pc);
            EditorUtility.SetDirty(pc);

            var mobile = CreateFreshProfile(MobileProfilePath);
            BuildSharedOverrides(mobile);
            // 45장 모바일 성능 목표 — ChromaticAberration·FilmGrain은 PC만.
            EditorUtility.SetDirty(mobile);

            AssetDatabase.SaveAssets();
            Debug.Log($"[BuildFF16VolumeProfiles] saved {PcProfilePath}, {MobileProfilePath}");
        }

        private static VolumeProfile CreateFreshProfile(string path)
        {
            if (AssetDatabase.LoadAssetAtPath<VolumeProfile>(path) != null)
            {
                AssetDatabase.DeleteAsset(path);
            }
            var profile = ScriptableObject.CreateInstance<VolumeProfile>();
            AssetDatabase.CreateAsset(profile, path);
            return profile;
        }

        /// <summary>66-2장 "무엇을 뜻하는가" 라이팅/무드 스펙 — 두 프로파일
        /// 공통(색 톤은 PC/Mobile에서 같게 유지, 66-1장 원칙 그대로).
        /// <see cref="VolumeProfile.Add{T}"/>는 컴포넌트를 메모리에 만들
        /// 뿐 자산 파일에 끼워 넣지 않는다 — <see cref="AddOverride"/>가
        /// AddObjectToAsset까지 해 준다(빠뜨리면 저장은 되는데 components
        /// 리스트가 전부 null 참조로 남는다 — 처음에 이 실수를 했었다).</summary>
        private static void BuildSharedOverrides(VolumeProfile profile)
        {
            var bloom = AddOverride<Bloom>(profile);
            bloom.threshold.value = 0.9f;
            bloom.intensity.value = 0.35f;
            bloom.scatter.value = 0.6f;
            bloom.tint.value = new Color(1f, 0.95f, 0.85f);

            var color = AddOverride<ColorAdjustments>(profile);
            color.postExposure.value = 0.1f;
            color.contrast.value = 12f;
            color.saturation.value = -8f;
            color.colorFilter.value = new Color(1f, 0.97f, 0.93f);

            var tone = AddOverride<Tonemapping>(profile);
            tone.mode.value = TonemappingMode.ACES;

            var vignette = AddOverride<Vignette>(profile);
            vignette.intensity.value = 0.25f;
            vignette.smoothness.value = 0.6f;
        }

        /// <summary>PC 프로파일에만 — 미세한 그레인·색수차. Depth of
        /// Field·Motion Blur는 아직 안 넣는다(66-2장 "다음에 할 일" 범위
        /// 밖 — DoF는 대화/연출 장면에서만 켜야 하는데 그 토글 시스템이
        /// 아직 없어, 지금 넣으면 평소 플레이 중에도 항상 흐려진다).</summary>
        private static void BuildPcOnlyOverrides(VolumeProfile profile)
        {
            var ca = AddOverride<ChromaticAberration>(profile);
            ca.intensity.value = 0.08f;

            var grain = AddOverride<FilmGrain>(profile);
            grain.intensity.value = 0.15f;
            grain.response.value = 0.7f;
        }

        private static T AddOverride<T>(VolumeProfile profile) where T : VolumeComponent
        {
            var component = profile.Add<T>(true);
            AssetDatabase.AddObjectToAsset(component, profile);
            return component;
        }
    }
}
