using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 66-2장 "다음에 할 일"(⑤ 실제 적용) — Maria 몸 전체가 단일
    /// 서브메시+단일 머티리얼(`MariaMat`)이라 피부/갑옷에 각각 다른 셰이더를
    /// 물릴 수 없었다(66-2장 ⑨/⑩ 확인 사항). Shader Graph는 코드로 조립할
    /// 공식 API가 없어(AnimatorController와 달리) ⑤가 받아 둔
    /// `FakeSSS.shadersubgraph`를 그대로 코드로 연결하는 대신, **삼각형을
    /// UV 중심점의 디퓨즈 텍스처 색으로 피부/기타 두 그룹으로 나눠 서브메시를
    /// 분리**하고, 피부 쪽에만 살짝 따뜻한 톤+낮은 광택의 URP Lit 근사를
    /// 적용한다(진짜 SSS wrap-lighting은 아니다 — 45장 모바일 목표에도
    /// 맞는 가장 싼 근사). 결과 메시/머티리얼은 Mixamo 지오메트리 자체를
    /// 담으므로 `.gitignore`가 이미 막고 있는 `Assets/Art/
    /// CharactersRealistic/` 안(`Generated/` 하위)에만 저장한다 — 절대
    /// 그 밖으로 안 뺀다.
    /// </summary>
    public static class BuildMariaSkinSplit
    {
        private const string BodyFbx = "Assets/Art/CharactersRealistic/Maria WProp J J Ong.fbx";
        private const string DiffusePath = "Assets/Art/CharactersRealistic/Textures/maria_diffuse.png";
        private const string GeneratedDir = "Assets/Art/CharactersRealistic/Generated";
        private const string SplitMeshPath = GeneratedDir + "/Maria_Split.asset";
        private const string SkinMatPath = GeneratedDir + "/MariaSkin.mat";
        private const string RestMatPath = GeneratedDir + "/MariaRest.mat";

        [MenuItem("Saga/Build Maria Skin Split")]
        public static void Build()
        {
            var bodyGo = AssetDatabase.LoadAssetAtPath<GameObject>(BodyFbx);
            var smr = bodyGo.GetComponentsInChildren<SkinnedMeshRenderer>(true)
                .First(r => r.name == "Maria_J_J_Ong");
            var sourceMesh = smr.sharedMesh;
            var sourceMat = smr.sharedMaterials[0];

            var diffuse = ForceReadable(DiffusePath);

            var triangles = sourceMesh.triangles;
            var uv = sourceMesh.uv;
            var skinTris = new List<int>();
            var restTris = new List<int>();

            for (var i = 0; i < triangles.Length; i += 3)
            {
                var a = triangles[i];
                var b = triangles[i + 1];
                var c = triangles[i + 2];
                var u = (uv[a].x + uv[b].x + uv[c].x) / 3f;
                var v = (uv[a].y + uv[b].y + uv[c].y) / 3f;
                var sample = diffuse.GetPixelBilinear(u, v);

                var list = IsSkinTone(sample) ? skinTris : restTris;
                list.Add(a);
                list.Add(b);
                list.Add(c);
            }

            Debug.Log($"[BuildMariaSkinSplit] classified {skinTris.Count / 3} skin tris, {restTris.Count / 3} rest tris (of {triangles.Length / 3} total)");

            if (!AssetDatabase.IsValidFolder(GeneratedDir))
            {
                AssetDatabase.CreateFolder("Assets/Art/CharactersRealistic", "Generated");
            }

            var splitMesh = Object.Instantiate(sourceMesh);
            splitMesh.name = "Maria_Split";
            splitMesh.subMeshCount = 2;
            splitMesh.SetTriangles(skinTris, 0);
            splitMesh.SetTriangles(restTris, 1);

            var existingMesh = AssetDatabase.LoadAssetAtPath<Mesh>(SplitMeshPath);
            if (existingMesh != null)
            {
                AssetDatabase.DeleteAsset(SplitMeshPath);
            }
            AssetDatabase.CreateAsset(splitMesh, SplitMeshPath);

            var skinMat = new Material(sourceMat) { name = "MariaSkin" };
            // 진짜 SSS가 아니라 값싼 근사 — 살짝 따뜻하게 데우고 광택을 낮춰
            // 밀랍 같은 느낌을 줄인다(66-2장 스펙 "밀랍 같은 느낌을 피한다"
            // 참고, 진짜 wrap-lighting은 커스텀 포워드 패스가 필요해 다음 과제).
            skinMat.SetColor("_BaseColor", new Color(1f, 0.93f, 0.87f));
            skinMat.SetFloat("_Smoothness", 0.35f);
            SaveMaterial(skinMat, SkinMatPath);

            var restMat = new Material(sourceMat) { name = "MariaRest" };
            SaveMaterial(restMat, RestMatPath);

            AssetDatabase.SaveAssets();
            Debug.Log("[BuildMariaSkinSplit] built split mesh + skin/rest materials");
        }

        /// <summary>
        /// 피부색 근사 판정 — 갑옷의 금장식(고채도 금색)·검은 금속과 갈라내려고
        /// 채도를 중간대로 한정한다. 정밀한 인식이 아니라 근사치.
        /// </summary>
        private static bool IsSkinTone(Color c)
        {
            Color.RGBToHSV(c, out var h, out var s, out var val);
            return h is >= 0.02f and <= 0.11f
                   && s is >= 0.15f and <= 0.55f
                   && val is >= 0.45f and <= 0.95f;
        }

        private static void SaveMaterial(Material mat, string path)
        {
            var existing = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (existing != null)
            {
                AssetDatabase.DeleteAsset(path);
            }
            AssetDatabase.CreateAsset(mat, path);
        }

        private static Texture2D ForceReadable(string path)
        {
            var importer = AssetImporter.GetAtPath(path) as TextureImporter;
            if (importer != null && !importer.isReadable)
            {
                importer.isReadable = true;
                importer.SaveAndReimport();
            }
            return AssetDatabase.LoadAssetAtPath<Texture2D>(path);
        }
    }
}
