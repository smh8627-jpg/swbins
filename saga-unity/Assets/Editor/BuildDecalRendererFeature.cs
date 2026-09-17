using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering.Universal;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 101-3 G "지형 반응" — URP Decal Projector로 발자국·타격
    /// 흔적을 찍으려면 렌더러 자산에 Decal Renderer Feature가 있어야
    /// 한다(웹판은 절대 못 하는 것 — 엔진 장점). `BuildFF16VolumeProfiles.cs`와
    /// 같은 결로 씬이 아니라 `Assets/Settings/*.asset`을 코드로 고친다.
    ///
    /// 인스펙터의 "Add Renderer Feature" 메뉴가 하는 일(`ScriptableRendererDataEditor.
    /// AddComponent()`, `internal` 클래스라 직접 못 부른다)을 `SerializedObject`로
    /// 그대로 재현한다 — `m_RendererFeatures`(오브젝트 참조 배열)와
    /// `m_RendererFeaturesMap`(영속 식별용 로컬 fileID 배열) 둘 다 채워야
    /// 인스펙터에서도 정상으로 보인다. `DecalRendererFeature.settings`
    /// 필드(`DecalSettings`)는 URP 패키지 안에서만 `internal`이라 밖에서
    /// 못 건드리지만, 기본값(Automatic 기법·데칼 레이어 끔)이 이미
    /// "아무 표면이나 다 받는다"라 손댈 필요가 없다. 멱등 — 이미 있으면
    /// 건너뛴다.
    /// </summary>
    public static class BuildDecalRendererFeature
    {
        private const string PcRendererPath = "Assets/Settings/PC_Renderer.asset";
        private const string MobileRendererPath = "Assets/Settings/Mobile_Renderer.asset";

        [MenuItem("Saga/Build Decal Renderer Feature")]
        public static void Build()
        {
            AddIfMissing(PcRendererPath);
            AddIfMissing(MobileRendererPath);
            AssetDatabase.SaveAssets();
            Debug.Log("[BuildDecalRendererFeature] done");
        }

        private static void AddIfMissing(string path)
        {
            var rendererData = AssetDatabase.LoadAssetAtPath<UniversalRendererData>(path);
            if (rendererData == null)
            {
                Debug.LogWarning($"[BuildDecalRendererFeature] {path} 를 못 찾음");
                return;
            }

            foreach (var existing in rendererData.rendererFeatures)
            {
                if (existing is DecalRendererFeature)
                {
                    return; // 이미 있음 — 멱등.
                }
            }

            var feature = ScriptableObject.CreateInstance<DecalRendererFeature>();
            feature.name = "Decals";
            AssetDatabase.AddObjectToAsset(feature, rendererData);
            AssetDatabase.TryGetGUIDAndLocalFileIdentifier(feature, out _, out long localId);

            var so = new SerializedObject(rendererData);
            var featuresProp = so.FindProperty("m_RendererFeatures");
            featuresProp.arraySize++;
            featuresProp.GetArrayElementAtIndex(featuresProp.arraySize - 1).objectReferenceValue = feature;

            // 구버전 URP엔 이 맵이 없을 수 있어 방어(null이면 그냥 건너뜀).
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
