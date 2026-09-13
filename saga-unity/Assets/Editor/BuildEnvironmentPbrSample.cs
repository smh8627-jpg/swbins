using System.IO;
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
    /// 채널 팩킹 해결(2026-09-13) — Poly Haven의 Roughness는 별도
    /// 텍스처인데 URP Lit의 Metallic 워크플로는 Smoothness를
    /// _MetallicGlossMap의 알파 채널로만 받는다. Shader Graph를 새로
    /// 짜는 대신, 에디터에서 Roughness 원본을 픽셀 단위로 읽어
    /// (RGB=0 비금속, A=255-Roughness) 구운 MetallicSmoothness PNG를
    /// 만들어 붙인다 — 결과는 표준 URP Lit Metallic 워크플로 그대로라
    /// 커스텀 셰이더가 필요 없다.
    /// </summary>
    public static class BuildEnvironmentPbrSample
    {
        private const string CobblestoneDir = "Assets/Art/EnvironmentPBR_candidates/PolyHaven_CobblestoneFloor01/";
        private const string CastleWallDir = "Assets/Art/EnvironmentPBR_candidates/PolyHaven_CastleWallSlates/";

        [MenuItem("Saga/Build Environment PBR Sample Materials")]
        public static void Build()
        {
            BuildMaterial("cobblestone_floor_01", CobblestoneDir);
            BuildMaterial("castle_wall_slates", CastleWallDir);
            AssetDatabase.SaveAssets();
            Debug.Log("[BuildEnvironmentPbrSample] built PBR sample materials");
        }

        private static void BuildMaterial(string baseName, string dir)
        {
            var diff = LoadTexture(dir + baseName + "_diff_1k.jpg");
            var normal = LoadNormalTexture(dir + baseName + "_nor_gl_1k.jpg");
            var ao = LoadTexture(dir + baseName + "_ao_1k.jpg");
            var metallicSmoothness = BuildMetallicSmoothnessMap(dir, baseName);

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
            if (metallicSmoothness != null)
            {
                mat.SetTexture("_MetallicGlossMap", metallicSmoothness);
                mat.EnableKeyword("_METALLICSPECGLOSSMAP");
                // URP LitInput.hlsl: specGloss.a *= _Smoothness — 1로 두면
                // 구운 알파(진짜 Roughness 반전값)가 그대로 통과한다.
                mat.SetFloat("_Smoothness", 1f);
            }

            var path = $"Assets/Art/EnvironmentPBR_candidates/{baseName}_URPLit.mat";
            var existing = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (existing != null)
            {
                AssetDatabase.DeleteAsset(path);
            }
            AssetDatabase.CreateAsset(mat, path);
        }

        /// <summary>
        /// Poly Haven의 별도 Roughness 텍스처를 읽어 URP Metallic 워크플로가
        /// 기대하는 팩(RGB=Metallic, A=Smoothness) PNG로 구워 낸다. 대상
        /// 재질이 전부 비금속(돌바닥·석벽)이라 Metallic RGB는 0으로 고정.
        /// </summary>
        private static Texture2D BuildMetallicSmoothnessMap(string dir, string baseName)
        {
            var roughPath = dir + baseName + "_rough_1k.jpg";
            var roughSource = ForceReadableUncompressed(roughPath);
            if (roughSource == null)
            {
                Debug.LogWarning($"[BuildEnvironmentPbrSample] roughness map not found: {roughPath}");
                return null;
            }

            var src = roughSource.GetPixels32();
            var packed = new Color32[src.Length];
            for (var i = 0; i < src.Length; i++)
            {
                byte smoothness = (byte)(255 - src[i].r);
                packed[i] = new Color32(0, 0, 0, smoothness);
            }

            var packedTex = new Texture2D(roughSource.width, roughSource.height, TextureFormat.RGBA32, false);
            packedTex.SetPixels32(packed);
            packedTex.Apply();
            var pngBytes = packedTex.EncodeToPNG();
            Object.DestroyImmediate(packedTex);

            var outPath = dir + baseName + "_metallicsmoothness_1k.png";
            File.WriteAllBytes(outPath, pngBytes);
            AssetDatabase.ImportAsset(outPath, ImportAssetOptions.ForceUpdate);

            var outImporter = AssetImporter.GetAtPath(outPath) as TextureImporter;
            if (outImporter != null)
            {
                outImporter.sRGBTexture = false;
                outImporter.textureType = TextureImporterType.Default;
                outImporter.alphaSource = TextureImporterAlphaSource.FromInput;
                outImporter.alphaIsTransparency = false;
                outImporter.SaveAndReimport();
            }

            return AssetDatabase.LoadAssetAtPath<Texture2D>(outPath);
        }

        private static Texture2D ForceReadableUncompressed(string path)
        {
            var importer = AssetImporter.GetAtPath(path) as TextureImporter;
            if (importer == null)
            {
                return null;
            }
            var changed = false;
            if (!importer.isReadable)
            {
                importer.isReadable = true;
                changed = true;
            }
            if (importer.textureCompression != TextureImporterCompression.Uncompressed)
            {
                importer.textureCompression = TextureImporterCompression.Uncompressed;
                changed = true;
            }
            if (changed)
            {
                importer.SaveAndReimport();
            }
            return AssetDatabase.LoadAssetAtPath<Texture2D>(path);
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
