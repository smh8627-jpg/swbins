using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering.Universal;
using Saga.Core;

namespace Saga.EditorTools
{
    /// <summary>
    /// 폰 발열 점검(2026-09-24) 진단 — GO `PlaytestHeadless` 가 부른다(읽기만, 에셋·설정 안 바꾼다).
    /// 원칙: **화질은 안 낮춘다**(사용자 2026-09-24 "그래픽을 낮추라는 게 아니다"). 그래서 여기서 보는 건
    /// Mobile URP 에셋이 원래 정한 모바일 값 그대로인지(렌더 스케일 0.8·MSAA 2·캐스케이드 1·그림자 맵 1024·소프트/추가 조명
    /// 그림자 끔·데칼 말고 기능 없음) · 화면에 안 보이는 60m 밖 데칼만 거름 · "고"(기본)는 값을 하나도 안 바꾸고
    /// "저"(사람이 고를 때만)만 가벼워짐 · 모바일 프레임 상한 30.
    /// </summary>
    public static class PlaytestMobileGraphics
    {
        private const string T = "[PlaytestHeadless] mobile graphics";
        private const string MobileAsset = "Assets/Settings/Mobile_RPAsset.asset";
        private const string MobileRenderer = "Assets/Settings/Mobile_Renderer.asset";
        private static bool _ok;

        public static bool Run()
        {
            _ok = true;
            string m = CheckMobileAsset();
            CheckTargets();
            if (MobileGraphics.MobileFrameRate != 30) Fail($"모바일 프레임 상한 {MobileGraphics.MobileFrameRate}");
            if (_ok) Debug.Log($"{T} OK - Mobile URP 값 그대로·데칼 60m·고=안 바꿈/저=가벼움·30fps |{m}");
            return _ok;
        }

        private static string CheckMobileAsset()
        {
            var urp = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(MobileAsset);
            if (urp == null) { Fail("Mobile_RPAsset 없음"); return ""; }
            if (!Mathf.Approximately(urp.renderScale, 0.8f)) Fail($"렌더 스케일 {urp.renderScale} ≠ 0.8");
            if (urp.msaaSampleCount != 2) Fail($"MSAA {urp.msaaSampleCount} ≠ 2");
            if (urp.shadowCascadeCount != 1) Fail($"그림자 캐스케이드 {urp.shadowCascadeCount}");
            if (urp.supportsSoftShadows) Fail("소프트 그림자 켜짐");
            if (urp.supportsAdditionalLightShadows) Fail("추가 조명 그림자 켜짐");
            if (urp.mainLightShadowmapResolution != 1024) Fail($"그림자 맵 {urp.mainLightShadowmapResolution}");
            float decal = -1f;
            int features = 0;
            foreach (var o in AssetDatabase.LoadAllAssetsAtPath(MobileRenderer))
            {
                if (!(o is ScriptableRendererFeature f)) continue;
                features++;
                if (f is DecalRendererFeature)
                {
                    var p = new SerializedObject(f).FindProperty("m_Settings.maxDrawDistance");
                    if (p != null) decal = p.floatValue;
                }
                else Fail($"Mobile 렌더러에 데칼 말고 기능 {f.GetType().Name}(SSAO 등은 PC 만)");
            }
            if (decal < 0f || decal > 60f) Fail($"데칼 거리 {decal}");
            return $" Mobile 스케일 {urp.renderScale}·MSAA {urp.msaaSampleCount}·그림자 {urp.shadowDistance}m/{urp.mainLightShadowmapResolution}·기능 {features}·데칼 {decal}m";
        }

        private static void CheckTargets()
        {
            var high = MobileGraphics.Target(true, 50f, 2, 0.8f, 4);
            if (!Mathf.Approximately(high.Shadow, 50f) || high.Msaa != 2 || !Mathf.Approximately(high.Scale, 0.8f) || high.Lights != 4) Fail($"고(기본)가 값을 바꿈 {high}");
            var low = MobileGraphics.Target(false, 50f, 2, 0.8f, 4);
            if (!Mathf.Approximately(low.Shadow, 15f) || low.Msaa != 1 || !Mathf.Approximately(low.Scale, 0.7f) || low.Lights != 2) Fail($"저 목표값 {low}");
        }

        private static void Fail(string msg)
        {
            _ok = false;
            Debug.LogError($"{T}: {msg}");
        }
    }
}
