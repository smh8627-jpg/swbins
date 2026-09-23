using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 106-4 "캐릭터 통일" — Kenney 블록·캡슐로 남아 있던 DUNGEON NPC·능묘 파수꾼을 Mixamo 사실
    /// 모델로. `SetupAbeCharacterImport` 를 캐릭터마다 한 벌씩 더 복사하는 대신 표 하나로 넷을 굽는다
    /// (몸체 T-pose FBX + `이름@클립.fbx` → Humanoid 리깅 → `Assets/Animators/<이름>.controller` →
    /// `<폴더>/<이름>Animated.prefab`). 원본은 `tools/mixamo_automation`(README 레시피 표)으로 받고,
    /// `CharactersRealistic/` 는 gitignore 라 **PC 마다 받은 뒤 이 메뉴를 한 번** 돌린다. 폴더가 없는
    /// 캐릭터는 건너뛰고, 씬 빌더는 프리팹이 없으면 예전 모델로 폴백한다.
    ///
    /// 컨트롤러 규칙은 Abe 와 같다: `Speed`(0 서기 · &gt;0.1 걷기 · &gt;0.6 달리기) + 트리거 `Attack`·`Hit`·`Death`
    /// (클립이 있을 때만). 걷기·달리기는 Mixamo "In Place" 로 받아 제자리 — 위치는 스크립트가 옮긴다.
    /// 추가 대기 상태(`extraIdles`)는 트리거 없이 `NpcIdle`(런타임)이 이름으로 튼다.
    /// </summary>
    public static class SetupNpcCharacterImports
    {
        private const string Root = "Assets/Art/CharactersRealistic/";

        private sealed class Spec
        {
            public string Name;
            public string Idle, Walk, Run, Attack, Hit, Death;
            public string[] ExtraIdles = new string[0];
        }

        private static readonly Spec[] Specs =
        {
            new Spec { Name = "Skeleton", Idle = "Idle", Walk = "Walking", Attack = "Attack", Hit = "HitReaction", Death = "Dying" },
            new Spec { Name = "Paladin", Idle = "Idle", Walk = "Walking", Run = "Running", Attack = "Attack" },
            new Spec { Name = "PeasantMan", Idle = "Idle" },
            new Spec { Name = "PeasantGirl", Idle = "Idle", ExtraIdles = new[] { "Kneel" } },
        };

        public static string PrefabPath(string name) => $"{Root}{name}/{name}Animated.prefab";

        [MenuItem("Saga/Setup NPC Character Imports")]
        public static void SetupAll()
        {
            int built = 0;
            foreach (var spec in Specs)
            {
                if (Setup(spec)) built++;
            }
            AssetDatabase.SaveAssets();
            Debug.Log($"[SetupNpcCharacterImports] {built}/{Specs.Length} 캐릭터 프리팹을 구움");
        }

        private static bool Setup(Spec spec)
        {
            string dir = $"{Root}{spec.Name}/";
            string body = $"{spec.Name}.fbx";
            if (!File.Exists(dir + body))
            {
                Debug.LogWarning($"[SetupNpcCharacterImports] {dir}{body} 없음 — 건너뜀(tools/mixamo_automation README 레시피로 받는다)");
                return false;
            }

            var map = new List<MixamoRigUtil.AnimMapping>();
            void Add(string suffix, bool loop)
            {
                if (!string.IsNullOrEmpty(suffix)) map.Add(new MixamoRigUtil.AnimMapping($"@{suffix}.fbx", Clip(suffix), loop));
            }
            Add(spec.Idle, true);
            Add(spec.Walk, true);
            Add(spec.Run, true);
            Add(spec.Attack, false);
            Add(spec.Hit, false);
            Add(spec.Death, false);
            foreach (var extra in spec.ExtraIdles) Add(extra, true);

            string tag = $"SetupNpcCharacterImports:{spec.Name}";
            if (MixamoRigUtil.RigCharacter(dir, body, map.ToArray(), tag) == null) return false;

            var controller = BuildController(spec, dir);
            if (controller == null) return false;
            return BuildPrefab(spec, dir, body, controller);
        }

        private static string Clip(string suffix) => suffix.ToLowerInvariant();

        private static AnimatorController BuildController(Spec spec, string dir)
        {
            if (!AssetDatabase.IsValidFolder("Assets/Animators")) AssetDatabase.CreateFolder("Assets", "Animators");
            string path = $"Assets/Animators/{spec.Name}.controller";
            if (AssetDatabase.LoadAssetAtPath<AnimatorController>(path) != null) AssetDatabase.DeleteAsset(path);

            var controller = AnimatorController.CreateAnimatorControllerAtPath(path);
            controller.AddParameter("Speed", AnimatorControllerParameterType.Float);
            var sm = controller.layers[0].stateMachine;

            var idle = State(sm, "Idle", dir, spec.Name, spec.Idle);
            if (idle == null)
            {
                Debug.LogError($"[SetupNpcCharacterImports] {spec.Name} 대기 클립이 없다");
                return null;
            }
            sm.defaultState = idle;

            var walk = State(sm, "Walk", dir, spec.Name, spec.Walk);
            var run = State(sm, "Run", dir, spec.Name, spec.Run);
            if (walk != null)
            {
                Speed(idle, walk, AnimatorConditionMode.Greater, 0.1f);
                Speed(walk, idle, AnimatorConditionMode.Less, 0.1f);
            }
            if (run != null)
            {
                var from = walk ?? idle;
                Speed(from, run, AnimatorConditionMode.Greater, 0.6f);
                Speed(run, from, AnimatorConditionMode.Less, 0.6f);
            }

            Trigger(controller, sm, idle, "Attack", State(sm, "Attack", dir, spec.Name, spec.Attack), back: true);
            Trigger(controller, sm, idle, "Hit", State(sm, "Hit", dir, spec.Name, spec.Hit), back: true);
            // Death 는 마지막 프레임에 머문다(Abe·Maria 관례).
            Trigger(controller, sm, idle, "Death", State(sm, "Death", dir, spec.Name, spec.Death), back: false);

            foreach (var extra in spec.ExtraIdles) State(sm, extra, dir, spec.Name, extra);

            EditorUtility.SetDirty(controller);
            return controller;
        }

        private static AnimatorState State(AnimatorStateMachine sm, string stateName, string dir, string charName, string suffix)
        {
            if (string.IsNullOrEmpty(suffix)) return null;
            var clip = LoadClip($"{dir}{charName}@{suffix}.fbx", Clip(suffix));
            if (clip == null)
            {
                Debug.LogWarning($"[SetupNpcCharacterImports] {charName}@{suffix}.fbx 클립 없음 — '{stateName}' 상태를 뺀다");
                return null;
            }
            var s = sm.AddState(stateName);
            s.motion = clip;
            return s;
        }

        private static void Speed(AnimatorState from, AnimatorState to, AnimatorConditionMode mode, float threshold)
        {
            var t = from.AddTransition(to);
            t.hasExitTime = false;
            t.duration = 0.15f;
            t.AddCondition(mode, threshold, "Speed");
        }

        private static void Trigger(AnimatorController controller, AnimatorStateMachine sm, AnimatorState idle,
            string trigger, AnimatorState to, bool back)
        {
            if (to == null) return;
            controller.AddParameter(trigger, AnimatorControllerParameterType.Trigger);
            var t = sm.AddAnyStateTransition(to);
            t.hasExitTime = false;
            t.duration = 0.1f;
            t.canTransitionToSelf = false;
            t.AddCondition(AnimatorConditionMode.If, 0, trigger);
            if (!back) return;
            var r = to.AddTransition(idle);
            r.hasExitTime = true;
            r.exitTime = 0.9f;
            r.duration = 0.15f;
        }

        private static bool BuildPrefab(Spec spec, string dir, string body, AnimatorController controller)
        {
            var bodyAsset = AssetDatabase.LoadAssetAtPath<GameObject>(dir + body);
            if (bodyAsset == null) return false;
            var instance = (GameObject)PrefabUtility.InstantiatePrefab(bodyAsset);
            instance.name = spec.Name;
            var animator = instance.GetComponent<Animator>();
            if (animator == null) animator = instance.AddComponent<Animator>();
            animator.runtimeAnimatorController = controller;
            animator.applyRootMotion = false; // 위치는 스크립트가 옮긴다(걷기·달리기는 In Place 클립).
            animator.cullingMode = AnimatorCullingMode.CullUpdateTransforms;
            PrefabUtility.SaveAsPrefabAsset(instance, PrefabPath(spec.Name));
            Object.DestroyImmediate(instance);
            Debug.Log($"[SetupNpcCharacterImports] saved {PrefabPath(spec.Name)}");
            return true;
        }

        private static AnimationClip LoadClip(string path, string clipName)
        {
            foreach (var asset in AssetDatabase.LoadAllAssetsAtPath(path))
            {
                if (asset is AnimationClip clip && clip.name == clipName) return clip;
            }
            return null;
        }
    }
}
