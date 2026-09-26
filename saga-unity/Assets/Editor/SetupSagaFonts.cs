using System.IO;
using TMPro;
using UnityEditor;
using UnityEngine;
using UnityEngine.TextCore.LowLevel;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 110 ② — 새 UI 는 TextMeshPro + 한글 폰트. 두 단계(배치 모드 두 번, 가져온 뒤 도메인이 다시 올라와야 TMP 설정이 보인다):
    /// ① <see cref="ImportTmpEssentials"/> — ugui 패키지 안 "TMP Essential Resources" 를 `Assets/TextMesh Pro/` 로(셰이더·기본 설정).
    /// ② <see cref="BuildFontAssets"/> — Noto Sans KR(OFL, `Assets/Art/Fonts/NotoSansKR/`) 보통·굵게를 동적 SDF 폰트 에셋으로 굽고
    ///    보통을 TMP 기본 폰트로, 굵게를 대체(fallback) 목록에 건다. 동적이라 쓴 글자만 아틀라스에 오르고 빌드 때 비운다.
    /// 둘 다 두 번 불러도 같은 결과(이미 있으면 건너뛴다).
    /// </summary>
    public static class SetupSagaFonts
    {
        private const string FontDir = "Assets/Art/Fonts/NotoSansKR";
        public const string RegularAsset = FontDir + "/NotoSansKR-Regular SDF.asset";
        public const string BoldAsset = FontDir + "/NotoSansKR-Bold SDF.asset";

        [MenuItem("Saga/Setup/Import TMP Essentials")]
        public static void ImportTmpEssentials()
        {
            if (File.Exists("Assets/TextMesh Pro/Resources/TMP Settings.asset"))
            {
                Debug.Log("[SetupSagaFonts] TMP essentials 이미 있음");
                Exit(true);
                return;
            }
            var pkg = Directory.GetDirectories("Library/PackageCache", "com.unity.ugui@*");
            string path = pkg.Length > 0 ? Path.Combine(pkg[0], "Package Resources", "TMP Essential Resources.unitypackage") : null;
            if (path == null || !File.Exists(path)) { Debug.LogError("[SetupSagaFonts] TMP Essential Resources.unitypackage 없음"); Exit(false); return; }
            AssetDatabase.ImportPackage(path, false);
            AssetDatabase.Refresh();
            bool ok = File.Exists("Assets/TextMesh Pro/Resources/TMP Settings.asset");
            Debug.Log($"[SetupSagaFonts] TMP essentials {(ok ? "OK" : "FAIL")}");
            Exit(ok);
        }

        [MenuItem("Saga/Setup/Build Korean Font Assets")]
        public static void BuildFontAssets()
        {
            var regular = MakeFontAsset(FontDir + "/NotoSansKR-Regular.otf", RegularAsset);
            var bold = MakeFontAsset(FontDir + "/NotoSansKR-Bold.otf", BoldAsset);
            var settings = Resources.Load<TMP_Settings>("TMP Settings");
            if (regular == null || bold == null || settings == null)
            {
                Debug.LogError($"[SetupSagaFonts] FAIL - regular {regular != null} bold {bold != null} settings {settings != null}");
                Exit(false);
                return;
            }
            var so = new SerializedObject(settings);
            so.FindProperty("m_defaultFontAsset").objectReferenceValue = regular;
            var fallbacks = so.FindProperty("m_fallbackFontAssets");
            fallbacks.ClearArray();
            fallbacks.InsertArrayElementAtIndex(0);
            fallbacks.GetArrayElementAtIndex(0).objectReferenceValue = bold;
            so.ApplyModifiedPropertiesWithoutUndo();
            EditorUtility.SetDirty(settings);
            AssetDatabase.SaveAssets();
            Debug.Log("[SetupSagaFonts] OK - 기본 폰트 Noto Sans KR(동적 SDF), 대체 = 굵게");
            Exit(true);
        }

        private static TMP_FontAsset MakeFontAsset(string fontPath, string assetPath)
        {
            var existing = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(assetPath);
            if (existing != null) return existing;
            var font = AssetDatabase.LoadAssetAtPath<Font>(fontPath);
            if (font == null) { Debug.LogError($"[SetupSagaFonts] 폰트 없음 {fontPath}"); return null; }
            // 샘플 90pt·여백 9·아틀라스 2048 — 한글 음절이 많아 아틀라스가 차면 새 장을 연다(multi atlas).
            var fa = TMP_FontAsset.CreateFontAsset(font, 90, 9, GlyphRenderMode.SDFAA, 2048, 2048,
                AtlasPopulationMode.Dynamic, true);
            fa.name = Path.GetFileNameWithoutExtension(assetPath);
            AssetDatabase.CreateAsset(fa, assetPath);
            var so = new SerializedObject(fa); // 공개 setter 가 internal 이라 직렬화 필드로.
            so.FindProperty("m_ClearDynamicDataOnBuild").boolValue = true;
            so.ApplyModifiedPropertiesWithoutUndo();
            fa.atlasTextures[0].name = fa.name + " Atlas";
            AssetDatabase.AddObjectToAsset(fa.atlasTextures[0], fa);
            fa.material.name = fa.name + " Material";
            AssetDatabase.AddObjectToAsset(fa.material, fa);
            AssetDatabase.SaveAssets();
            return fa;
        }

        private static void Exit(bool ok)
        {
            if (Application.isBatchMode) EditorApplication.Exit(ok ? 0 : 1);
        }
    }
}
