using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// 44장 "주요 Enemy" 교체 — mixamo.com에서 받은 Abe(맨몸 전투 캐릭터,
    /// 황건적 잡졸 이미지에 맞춰 고름) 몸 FBX + 애니메이션 5개를 Humanoid로
    /// 리깅하고, Animator Controller를 엮은 뒤 `AbeAnimated.prefab`으로
    /// 저장한다. 이 프리팹이 `BuildTestDungeonScene`의 character-d(잡졸)
    /// 자리를 대신한다 — Maria/Player 때와 달리 잡졸은 절차적 층 진행
    /// 중 **런타임에도** 새로 스폰되므로(`DungeonFloorRunner`), Animator+
    /// Controller를 매번 코드로 붙이는 대신 프리팹 자체에 박아 둬야
    /// 런타임에서 AssetDatabase 없이도 그대로 인스턴스화된다
    /// (`DungeonEnemy.BuildVisual()`이 `GetComponent&lt;Animator&gt;()`
    /// 유무로 "리깅된 캐릭터인지"를 판단 — Player 쪽 `PlayerController`와
    /// 같은 결).
    /// </summary>
    public static class SetupAbeCharacterImport
    {
        private const string Dir = "Assets/Art/CharactersRealistic/Abe/";
        private const string BodyFileName = "Abe.fbx";
        private const string ControllerPath = "Assets/Animators/Abe.controller";
        private const string PrefabPath = "Assets/Art/CharactersRealistic/Abe/AbeAnimated.prefab";

        private static readonly MixamoRigUtil.AnimMapping[] AnimMap =
        {
            new("Idle", "idle", true),
            new("Walking", "walk", true),
            new("Punching", "attack", false),
            new("HitReaction", "hit", false),
            new("Dying", "death", false),
        };

        [MenuItem("Saga/Setup Abe Character Import")]
        public static void Setup()
        {
            var bodyAvatar = MixamoRigUtil.RigCharacter(Dir, BodyFileName, AnimMap, "SetupAbeCharacterImport");
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
            idle.motion = LoadClip(Dir + "Abe@Idle.fbx", "idle");
            sm.defaultState = idle;

            var walk = sm.AddState("Walk");
            walk.motion = LoadClip(Dir + "Abe@Walking.fbx", "walk");

            var attack = sm.AddState("Attack");
            attack.motion = LoadClip(Dir + "Abe@Punching.fbx", "attack");

            var hit = sm.AddState("Hit");
            hit.motion = LoadClip(Dir + "Abe@HitReaction.fbx", "hit");

            var death = sm.AddState("Death");
            death.motion = LoadClip(Dir + "Abe@Dying.fbx", "death");

            AddParamTransition(idle, walk, AnimatorConditionMode.Greater, 0.1f);
            AddParamTransition(walk, idle, AnimatorConditionMode.Less, 0.1f);

            AddAnyStateTrigger(sm, attack, "Attack");
            AddAnyStateTrigger(sm, hit, "Hit");
            AddAnyStateTrigger(sm, death, "Death");

            AddReturnToIdle(attack, idle);
            AddReturnToIdle(hit, idle);
            // Death는 마지막 프레임에 그대로 머문다 — Maria.controller와 같은 관례
            // (DungeonEnemy.cs가 Death 트리거 직후 코루틴으로 짧게 기다렸다 Destroy).

            AssetDatabase.SaveAssets();
            return controller;
        }

        private static void BuildPrefab(AnimatorController controller)
        {
            var bodyAsset = AssetDatabase.LoadAssetAtPath<GameObject>(Dir + BodyFileName);
            if (bodyAsset == null)
            {
                Debug.LogError($"[SetupAbeCharacterImport] body FBX not found: {Dir}{BodyFileName}");
                return;
            }

            var instance = (GameObject)PrefabUtility.InstantiatePrefab(bodyAsset);
            instance.name = "Abe";

            var animator = instance.GetComponent<Animator>();
            if (animator == null)
            {
                animator = instance.AddComponent<Animator>();
            }
            animator.runtimeAnimatorController = controller;

            PrefabUtility.SaveAsPrefabAsset(instance, PrefabPath);
            Object.DestroyImmediate(instance);
            Debug.Log($"[SetupAbeCharacterImport] saved {PrefabPath}");
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
