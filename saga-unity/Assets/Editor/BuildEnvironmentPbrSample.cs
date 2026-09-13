using UnityEditor;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 66-2장 "다음에 할 일" ② — 환경 PBR 텍스처 킷 조사. Poly Haven
    /// (CC0, Quixel Megascans급 포토스캔 재질)에서 받은 샘플 두 벌
    /// (Assets/Art/EnvironmentPBR_candidates/)이 URP Lit에 실제로 물리는지
    /// 확인하는 프로토타입 머티리얼을 코드로 만든다. 아직 게임 씬에는 안
    /// 쓴다 — 66-2장 "적용 순서" ③(순차 교체) 단계에서 실제 지형/건물에
    /// 붙인다.
    ///
    /// 채널 팩킹 주의 — Poly Haven의 Roughness 맵은 별도 텍스처인데, URP
    /// Lit의 Metallic 워크플로는 Smoothness를 Metallic맵의 알파 채널이나
    /// 알베도 알파로만 받는다(별도 Roughness 슬롯이 없다). 지금은
    /// Smoothness를 상수(러프니스 실측 평균의 반전 근사)로 두고, 실제
    /// 교체 때는 커스텀 Shader Graph로 Poly Haven의 arm(ORM 팩) 텍스처를
    /// 풀어 쓰거나 Roughness→Smoothness 반전 텍스처를 미리 구워야 한다 —
    /// 지금은 "PBR 텍스처가 실제로 이 정도 화질로 들어오는지" 확인이 목적.
    /// </summary>
    public static class BuildEnvironmentPbrSample
    {
        private const string CobblestoneDir = "Assets/Art/EnvironmentPBR_candidates/PolyHaven_CobblestoneFloor01/";
        private const string CastleWallDir = "Assets/Art/EnvironmentPBR_candidates/PolyHaven_CastleWallSlates/";

        [MenuItem("Saga/Build Environment PBR Sample Materials")]
        public static void Build()
        {
            BuildMaterial("cobblestone_floor_01", CobblestoneDir, 0.35f);
            BuildMaterial("castle_wall_slates", CastleWallDir, 0.3f);
            AssetDatabase.SaveAssets();
            Debug.Log("[BuildEnvironmentPbrSample] built PBR sample materials");
        }

        private static void BuildMaterial(string baseName, string dir, float smoothness)
        {
            var diff = LoadTexture(dir + baseName + "_diff_1k.jpg");
            var normal = LoadNormalTexture(dir + baseName + "_nor_gl_1k.jpg");
            var ao = LoadTexture(dir + baseName + "_ao_1k.jpg");

            var shader = Shader.Find("Universal Render Pipeline/Lit");
            var mat = new Material(shader) { name = baseName };
            mat.SetTexture("_BaseMap", diff);
            if (normal != null)
            {
                mat.SetTexture("_BumpMap", normal);
                mat.EnableKeyword("_NORMALMAP");
            }
            if (ao != null)
            {
                mat.SetTexture("_OcclusionMap", ao);
                mat.EnableKeyword("_OCCLUSIONMAP");
            }
            mat.SetFloat("_Smoothness", smoothness);

            var path = $"Assets/Art/EnvironmentPBR_candidates/{baseName}_URPLit.mat";
            var existing = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (existing != null)
            {
                AssetDatabase.DeleteAsset(path);
            }
            AssetDatabase.CreateAsset(mat, path);
        }

        private static Texture2D LoadTexture(string path) =>
            AssetDatabase.LoadAssetAtPath<Texture2D>(path);

        private static Texture2D LoadNormalTexture(string path)
        {
            var importer = AssetImporter.GetAtPath(path) as TextureImporter;
            if (importer != null && importer.textureType != TextureImporterType.NormalMap)
            {
                importer.textureType = TextureImporterType.NormalMap;
                importer.SaveAndReimport();
            }
            return AssetDatabase.LoadAssetAtPath<Texture2D>(path);
        }
    }
}
