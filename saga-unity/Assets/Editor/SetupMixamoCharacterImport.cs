using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 66-2장 "다음에 할 일" — 사람이 mixamo.com에서 받아
    /// Assets/Art/CharactersRealistic/(.gitignore 대상, 로컬 전용)에 넣은
    /// Maria 몸 FBX + 애니메이션 FBX 8개를 Humanoid로 리깅한다. 몸은
    /// "Create From This Model"로 Avatar를 새로 만들고, 애니메이션들은
    /// "Copy From Other Avatar"로 몸의 Avatar를 그대로 써서 리타게팅이
    /// 확실히 같은 골격에 물리게 한다.
    /// </summary>
    public static class SetupMixamoCharacterImport
    {
        private const string Dir = "Assets/Art/CharactersRealistic/";
        private const string BodyFileName = "Maria WProp J J Ong.fbx";

        private static readonly (string Suffix, string ClipName, bool Loop)[] AnimMap =
        {
            ("Action Idle To Fight Idle", "idle", true),
            ("Walking", "walk", true),
            ("Running", "run", true),
            ("Sword And Shield Slash", "attack", false),
            ("Hit Reaction", "hit", false),
            ("Stand To Roll", "dodge", false),
            ("Two Handed Sword Death", "death", false),
            ("Picking Up", "interaction", false),
        };

        [MenuItem("Saga/Setup Mixamo Character Import")]
        public static void Setup()
        {
            var bodyPath = Dir + BodyFileName;
            var bodyImporter = AssetImporter.GetAtPath(bodyPath) as ModelImporter;
            if (bodyImporter == null)
            {
                Debug.LogError($"[SetupMixamoCharacterImport] body FBX not found: {bodyPath}");
                return;
            }

            bodyImporter.animationType = ModelImporterAnimationType.Human;
            bodyImporter.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            bodyImporter.SaveAndReimport();

            var bodyAvatar = AssetDatabase.LoadAllAssetsAtPath(bodyPath).OfType<Avatar>().FirstOrDefault();
            if (bodyAvatar == null || !bodyAvatar.isValid || !bodyAvatar.isHuman)
            {
                Debug.LogError("[SetupMixamoCharacterImport] body Avatar invalid or not Humanoid — check Mixamo T-pose/bone mapping.");
                return;
            }
            Debug.Log("[SetupMixamoCharacterImport] body Avatar OK (Humanoid, valid)");

            var animFiles = Directory.GetFiles(Dir, "*.fbx")
                .Select(p => p.Replace('\\', '/'))
                .Where(p => !p.EndsWith(BodyFileName));

            foreach (var path in animFiles)
            {
                var map = AnimMap.FirstOrDefault(m => path.Contains(m.Suffix));
                if (map.Suffix == null)
                {
                    Debug.LogWarning($"[SetupMixamoCharacterImport] no animation mapping for: {path}");
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
                Debug.Log($"[SetupMixamoCharacterImport] rigged {Path.GetFileName(path)} -> clip '{map.ClipName}' (loop={map.Loop})");
            }

            Debug.Log("[SetupMixamoCharacterImport] done");
        }
    }
}
