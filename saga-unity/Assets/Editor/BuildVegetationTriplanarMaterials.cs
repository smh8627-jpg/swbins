using UnityEditor;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 102-4 — Rocks/Vegetation procgen 교체. procgen.py(tools/
    /// asset-forge)가 굽는 나무·바위 GLB는 UV가 없다 — Saga/
    /// VertexColorTriplanarLit(정점색 바탕 + 트라이플레이너 디테일)용
    /// 머티리얼 둘을 코드로 짓는다. BuildEnvironmentPbrSample.cs와 같은
    /// 결(Poly Haven diffuse 맵 하나만 그레이스케일 디테일로 사용 — normal·
    /// roughness는 이 셰이더가 아예 안 받는다, VertexColorLit과 같은 단순화).
    /// </summary>
    public static class BuildVegetationTriplanarMaterials
    {
        private const string BarkDiff = "Assets/Art/Environment/PBR/PolyHaven_BarkWillow02/bark_willow_02_diff_1k.jpg";
        private const string RockDiff = "Assets/Art/Environment/PBR/PolyHaven_RockBoulderDry/rock_boulder_dry_diff_1k.jpg";
        private const string OutDir = "Assets/Art/Generated/SagaGo/";

        [MenuItem("Saga/Build Vegetation Triplanar Materials")]
        public static void Build()
        {
            var shader = Shader.Find("Saga/VertexColorTriplanarLit");
            if (shader == null)
            {
                Debug.LogError("[BuildVegetationTriplanarMaterials] Saga/VertexColorTriplanarLit shader not found");
                return;
            }

            BuildMaterial(shader, "TriplanarDetail_Bark", BarkDiff, tiling: 1.2f);
            BuildMaterial(shader, "TriplanarDetail_RockBoulder", RockDiff, tiling: 1.5f);
            AssetDatabase.SaveAssets();
            Debug.Log("[BuildVegetationTriplanarMaterials] built triplanar detail materials");
        }

        private static void BuildMaterial(Shader shader, string name, string texPath, float tiling)
        {
            var tex = AssetDatabase.LoadAssetAtPath<Texture2D>(texPath);
            if (tex == null)
            {
                Debug.LogWarning($"[BuildVegetationTriplanarMaterials] texture not found: {texPath}");
                return;
            }

            var mat = new Material(shader) { name = name };
            mat.SetTexture("_DetailTex", tex);
            mat.SetFloat("_DetailTiling", tiling);
            mat.SetFloat("_DetailStrength", 0.6f);

            var path = OutDir + name + ".mat";
            var existing = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (existing != null)
            {
                AssetDatabase.DeleteAsset(path);
            }
            AssetDatabase.CreateAsset(mat, path);
        }
    }
}
