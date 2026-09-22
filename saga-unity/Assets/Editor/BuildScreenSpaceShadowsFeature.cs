using System;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering.Universal;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 102-5 "허접 10가지" 후처리 항목의 마지막 하나 —
    /// `BuildDecalRendererFeature.cs`와 완전히 같은 결(SerializedObject로
    /// `m_RendererFeatures`/`m_RendererFeaturesMap`을 채워 인스펙터의
    /// "Add Renderer Feature"를 코드로 재현)이다.
    ///
    /// URP 내장 `ScreenSpaceShadows` 기능 클래스는 `internal`이라(Decal과
    /// 달리 `Unity.RenderPipelines.Universal.Runtime` 밖에서 타입 이름으로
    /// 직접 못 쓴다) 리플렉션(`Type.GetType(...풀네임...)`)으로 만든다 —
    /// `ScriptableObject.CreateInstance(Type)`은 접근 제한자를 안 가린다.
    /// 셰이더 필드(`m_Shader`)는 비워 둬도 된다 — 그 클래스의
    /// `LoadMaterial()`이 null이면 `Shader.Find("Hidden/Universal Render
    /// Pipeline/ScreenSpaceShadows")`로 스스로 채운다(패키지 Shaders 폴더에
    /// 이미 있음, 직접 확인). 멱등 — 이미 있으면 건너뛴다.
    ///
    /// **PC 프로파일에만 건다.** 102-2 원안(모바일 성능 목표로 Cascade 1
    /// 유지 + BlobShadow로 접지만 보완)과 같은 이유 — 스크린 스페이스
    /// 셰도우는 화면 전체 블릿 패스를 추가로 태우는 무거운 기법이라
    /// Mobile_Renderer.asset은 건드리지 않는다(DecalRendererFeature는
    /// 가벼워 다섯 판·두 프로파일 전부에 걸었던 것과 다른 판단).
    /// </summary>
    public static class BuildScreenSpaceShadowsFeature
    {
        private const string PcRendererPath = "Assets/Settings/PC_Renderer.asset";
        private const string FeatureTypeName =
            "UnityEngine.Rendering.Universal.ScreenSpaceShadows, Unity.RenderPipelines.Universal.Runtime";

        [MenuItem("Saga/Build Screen Space Shadows Feature")]
        public static void Build()
        {
            var featureType = Type.GetType(FeatureTypeName);
            if (featureType == null)
            {
                Debug.LogError($"[BuildScreenSpaceShadowsFeature] 타입을 못 찾음: {FeatureTypeName} (URP 버전이 바뀌었을 수 있다)");
                return;
            }

            AddIfMissing(PcRendererPath, featureType);
            AssetDatabase.SaveAssets();
            Debug.Log("[BuildScreenSpaceShadowsFeature] done");
        }

        private static void AddIfMissing(string path, Type featureType)
        {
            var rendererData = AssetDatabase.LoadAssetAtPath<UniversalRendererData>(path);
            if (rendererData == null)
            {
                Debug.LogWarning($"[BuildScreenSpaceShadowsFeature] {path} 를 못 찾음");
                return;
            }

            foreach (var existing in rendererData.rendererFeatures)
            {
                if (existing != null && existing.GetType() == featureType)
                {
                    return; // 이미 있음 — 멱등.
                }
            }

            var feature = (ScriptableRendererFeature)ScriptableObject.CreateInstance(featureType);
            feature.name = "Screen Space Shadows";
            AssetDatabase.AddObjectToAsset(feature, rendererData);
            AssetDatabase.TryGetGUIDAndLocalFileIdentifier(feature, out _, out long localId);

            var so = new SerializedObject(rendererData);
            var featuresProp = so.FindProperty("m_RendererFeatures");
            featuresProp.arraySize++;
            featuresProp.GetArrayElementAtIndex(featuresProp.arraySize - 1).objectReferenceValue = feature;

            var mapProp = so.FindProperty("m_RendererFeaturesMap");
            if (mapProp != null)
            {
                mapProp.arraySize++;
                mapProp.GetArrayElementAtIndex(mapProp.arraySize - 1).longValue = localId;
            }

            so.ApplyModifiedProperties();
            EditorUtility.SetDirty(rendererData);
        }
    }
}
