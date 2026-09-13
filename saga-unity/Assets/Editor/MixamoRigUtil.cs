using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// `SetupMixamoCharacterImport.cs`(Maria)의 리깅 절차를 44장 두 번째
    /// 캐릭터(Abe, `SetupAbeCharacterImport.cs`)에도 쓰려고 공용으로 뺐다 —
    /// 몸은 Humanoid Avatar를 새로 만들고, 애니메이션은 그 Avatar를
    /// "Copy From Other"로 그대로 써서 리타게팅이 같은 골격에 물리게 한다.
    /// </summary>
    public static class MixamoRigUtil
    {
        public readonly struct AnimMapping
        {
            public readonly string Suffix;
            public readonly string ClipName;
            public readonly bool Loop;

            public AnimMapping(string suffix, string clipName, bool loop)
            {
                Suffix = suffix;
                ClipName = clipName;
                Loop = loop;
            }
        }

        /// <returns>리깅된 몸의 Avatar(성공 시) — 실패하면 null.</returns>
        public static Avatar RigCharacter(string dir, string bodyFileName, AnimMapping[] animMap, string logTag)
        {
            var bodyPath = dir + bodyFileName;
            var bodyImporter = AssetImporter.GetAtPath(bodyPath) as ModelImporter;
            if (bodyImporter == null)
            {
                Debug.LogError($"[{logTag}] body FBX not found: {bodyPath}");
                return null;
            }

            bodyImporter.animationType = ModelImporterAnimationType.Human;
            bodyImporter.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            bodyImporter.SaveAndReimport();

            // 66-2장 ⑩ — FBX에 임베드된 diffuse/normal/specular는 Unity가
            // 자동 추출하지 않는다. 명시적으로 추출해야 머티리얼이 실제로
            // 색을 받는다(에디터 GUI "Extract Textures..." 버튼과 동일).
            bodyImporter.ExtractTextures(dir + "Textures/");

            var bodyAvatar = AssetDatabase.LoadAllAssetsAtPath(bodyPath).OfType<Avatar>().FirstOrDefault();
            if (bodyAvatar == null || !bodyAvatar.isValid || !bodyAvatar.isHuman)
            {
                Debug.LogError($"[{logTag}] body Avatar invalid or not Humanoid — check Mixamo T-pose/bone mapping.");
                return null;
            }
            Debug.Log($"[{logTag}] body Avatar OK (Humanoid, valid)");

            var animFiles = Directory.GetFiles(dir, "*.fbx")
                .Select(p => p.Replace('\\', '/'))
                .Where(p => !p.EndsWith(bodyFileName));

            foreach (var path in animFiles)
            {
                var map = animMap.FirstOrDefault(m => path.Contains(m.Suffix));
                if (map.Suffix == null)
                {
                    Debug.LogWarning($"[{logTag}] no animation mapping for: {path}");
                    continue;
                }

                var importer = AssetImporter.GetAtPath(path) as ModelImporter;
                if (importer == null)
                {
                    continue;
                }

                importer.animationType = ModelImporterAnimationType.Human;
                importer.avatarSetup = ModelImporterAvatarSetup.CopyFromOther;
                importer.sourceAvatar = bodyAvatar;

                var clips = importer.defaultClipAnimations;
                if (clips.Length > 0)
                {
                    clips[0].name = map.ClipName;
                    clips[0].loopTime = map.Loop;
                    importer.clipAnimations = clips;
                }

                importer.SaveAndReimport();
                Debug.Log($"[{logTag}] rigged {Path.GetFileName(path)} -> clip '{map.ClipName}' (loop={map.Loop})");
            }

            Debug.Log($"[{logTag}] done");
            return bodyAvatar;
        }
    }
}
