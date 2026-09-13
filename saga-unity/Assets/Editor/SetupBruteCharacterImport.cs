using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// 44장 "Boss" 교체 — mixamo.com에서 받은 Brute(근육질 반라 전사, 칼
    /// 무기 — 황건적 두목·미니보스 이미지에 맞춰 고름) 몸 FBX + 애니메이션
    /// 5개를 리깅하고 Animator Controller를 엮어 `BruteAnimated.prefab`으로
    /// 저장한다. `SetupAbeCharacterImport.cs`와 같은 이유로 프리팹에
    /// Animator+Controller를 미리 붙인다 — Boss/Miniboss는 편집기 빌드
    /// 때 한 번만 놓이지만(`BuildTestDungeonScene.BuildBoss/BuildMiniboss`),
    /// 잡졸과 같은 `DungeonEnemy` 컴포넌트를 재사용하므로 같은 규약
    /// (Animator 유무로 리깅 판단)을 따라야 두 자리 모두에서 맞물린다.
    /// </summary>
    public static class SetupBruteCharacterImport
    {
        private const string Dir = "Assets/Art/CharactersRealistic/Brute/";
        private const string BodyFileName = "Brute.fbx";
        private const string ControllerPath = "Assets/Animators/Brute.controller";
        private const string PrefabPath = "Assets/Art/CharactersRealistic/Brute/BruteAnimated.prefab";

        private static readonly MixamoRigUtil.AnimMapping[] AnimMap =
        {
            new("Idle", "idle", true),
            new("Walking", "walk", true),
            new("SlashAdvance", "attack", false),
            new("HitReaction", "hit", false),
            new("Dying", "death", false),
        };

        [MenuItem("Saga/Setup Brute Character Import")]
        public static void Setup()
        {
            var bodyAvatar = MixamoRigUtil.RigCharacter(Dir, BodyFileName, AnimMap, "SetupBruteCharacterImport");
            if (bodyAvatar == null)
            {
                return;
            }

            var controller = BuildController();
            BuildPrefab(controller);
        }

        private static AnimatorController BuildController()
        {
            if (!AssetDatabase.IsValidFolder("Assets/Animators"))
            {
                AssetDatabase.CreateFolder("Assets", "Animators");
            }
            if (AssetDatabase.LoadAssetAtPath<AnimatorController>(ControllerPath) != null)
            {
                AssetDatabase.DeleteAsset(ControllerPath);
            }

            var controller = AnimatorController.CreateAnimatorControllerAtPath(ControllerPath);
            controller.AddParameter("Speed", AnimatorControllerParameterType.Float);
            controller.AddParameter("Attack", AnimatorControllerParameterType.Trigger);
            controller.AddParameter("Hit", AnimatorControllerParameterType.Trigger);
            controller.AddParameter("Death", AnimatorControllerParameterType.Trigger);

            var sm = controller.layers[0].stateMachine;

            var idle = sm.AddState("Idle");
            idle.motion = LoadClip(Dir + "Brute@Idle.fbx", "idle");
            sm.defaultState = idle;

            var walk = sm.AddState("Walk");
            walk.motion = LoadClip(Dir + "Brute@Walking.fbx", "walk");

            var attack = sm.AddState("Attack");
            attack.motion = LoadClip(Dir + "Brute@SlashAdvance.fbx", "attack");

            var hit = sm.AddState("Hit");
            hit.motion = LoadClip(Dir + "Brute@HitReaction.fbx", "hit");

            var death = sm.AddState("Death");
            death.motion = LoadClip(Dir + "Brute@Dying.fbx", "death");

            AddParamTransition(idle, walk, AnimatorConditionMode.Greater, 0.1f);
            AddParamTransition(walk, idle, AnimatorConditionMode.Less, 0.1f);

            AddAnyStateTrigger(sm, attack, "Attack");
            AddAnyStateTrigger(sm, hit, "Hit");
            AddAnyStateTrigger(sm, death, "Death");

            AddReturnToIdle(attack, idle);
            AddReturnToIdle(hit, idle);
            // Death는 마지막 프레임에 그대로 머문다 — Abe/Maria.controller와 같은 관례.

            AssetDatabase.SaveAssets();
            return controller;
        }

        private static void BuildPrefab(AnimatorController controller)
        {
            var bodyAsset = AssetDatabase.LoadAssetAtPath<GameObject>(Dir + BodyFileName);
            if (bodyAsset == null)
            {
                Debug.LogError($"[SetupBruteCharacterImport] body FBX not found: {Dir}{BodyFileName}");
                return;
            }

            var instance = (GameObject)PrefabUtility.InstantiatePrefab(bodyAsset);
            instance.name = "Brute";

            var animator = instance.GetComponent<Animator>();
            if (animator == null)
            {
                animator = instance.AddComponent<Animator>();
            }
            animator.runtimeAnimatorController = controller;

            PrefabUtility.SaveAsPrefabAsset(instance, PrefabPath);
            Object.DestroyImmediate(instance);
            Debug.Log($"[SetupBruteCharacterImport] saved {PrefabPath}");
        }

        private static void AddParamTransition(AnimatorState from, AnimatorState to, AnimatorConditionMode mode, float threshold)
        {
            var t = from.AddTransition(to);
            t.hasExitTime = false;
            t.duration = 0.15f;
            t.AddCondition(mode, threshold, "Speed");
        }

        private static void AddAnyStateTrigger(AnimatorStateMachine sm, AnimatorState to, string trigger)
        {
            var t = sm.AddAnyStateTransition(to);
            t.hasExitTime = false;
            t.duration = 0.1f;
            t.canTransitionToSelf = false;
            t.AddCondition(AnimatorConditionMode.If, 0, trigger);
        }

        private static void AddReturnToIdle(AnimatorState from, AnimatorState idle)
        {
            var t = from.AddTransition(idle);
            t.hasExitTime = true;
            t.exitTime = 0.9f;
            t.duration = 0.15f;
        }

        private static AnimationClip LoadClip(string path, string clipName)
        {
            foreach (var asset in AssetDatabase.LoadAllAssetsAtPath(path))
            {
                if (asset is AnimationClip clip && clip.name == clipName)
                {
                    return clip;
                }
            }
            return null;
        }
    }
}
