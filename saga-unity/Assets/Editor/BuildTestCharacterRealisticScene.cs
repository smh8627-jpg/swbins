using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 66-2장 ⑦ "다음에 할 일" — Mixamo Maria(Humanoid 리깅 완료,
    /// SetupMixamoCharacterImport.cs)의 8개 클립을 Animator Controller로
    /// 엮고, 확인용 씬에 배치한다. 어느 게임(SagaGo/Dungeon/Forest/Story/
    /// Realm)에도 속하지 않는 독립 리그 검증 씬이다 — 조명/카메라는 일부러
    /// 단순하게 뒀다(66-2장 FF16 아트 패스는 각 게임 씬의 몫, 여기는 리그
    /// 확인만).
    /// </summary>
    public static class BuildTestCharacterRealisticScene
    {
        private const string Dir = "Assets/Art/CharactersRealistic/";
        private const string BodyFbx = Dir + "Maria WProp J J Ong.fbx";
        private const string IdleFbx = Dir + "Maria WProp J J Ong@Action Idle To Fight Idle.fbx";
        private const string WalkFbx = Dir + "Maria WProp J J Ong@Walking.fbx";
        private const string RunFbx = Dir + "Maria WProp J J Ong@Running.fbx";
        private const string AttackFbx = Dir + "Maria WProp J J Ong@Sword And Shield Slash.fbx";
        private const string HitFbx = Dir + "Maria WProp J J Ong@Hit Reaction.fbx";
        private const string DodgeFbx = Dir + "Maria WProp J J Ong@Stand To Roll.fbx";
        private const string DeathFbx = Dir + "Maria WProp J J Ong@Two Handed Sword Death.fbx";
        private const string InteractFbx = Dir + "Maria WProp J J Ong@Picking Up.fbx";

        private const string ControllerPath = "Assets/Animators/Maria.controller";
        private const string ScenePath = "Assets/Scenes/TestCharacterRealistic.unity";

        [MenuItem("Saga/Build Test Character Realistic Scene")]
        public static void Build()
        {
            var controller = BuildController();

            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var scene = EditorSceneManager.GetActiveScene();

            var lightGo = new GameObject("Directional Light", typeof(Light));
            var light = lightGo.GetComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.2f;
            lightGo.transform.rotation = Quaternion.Euler(40f, 30f, 0f);

            var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.name = "Ground";
            ground.transform.localScale = new Vector3(5f, 1f, 5f);

            var cameraGo = new GameObject("Main Camera", typeof(Camera));
            cameraGo.tag = "MainCamera";
            cameraGo.transform.position = new Vector3(0f, 1.6f, -3.5f);
            cameraGo.transform.rotation = Quaternion.Euler(10f, 0f, 0f);

            var bodyAsset = AssetDatabase.LoadAssetAtPath<GameObject>(BodyFbx);
            if (bodyAsset == null)
            {
                Debug.LogError($"[BuildTestCharacterRealisticScene] body FBX not found: {BodyFbx}");
                return;
            }
            var maria = (GameObject)PrefabUtility.InstantiatePrefab(bodyAsset);
            maria.name = "Maria";
            maria.transform.position = Vector3.zero;

            var animator = maria.GetComponent<Animator>();
            if (animator == null)
            {
                animator = maria.AddComponent<Animator>();
            }
            animator.runtimeAnimatorController = controller;

            if (!AssetDatabase.IsValidFolder("Assets/Scenes"))
            {
                AssetDatabase.CreateFolder("Assets", "Scenes");
            }
            EditorSceneManager.SaveScene(scene, ScenePath);
            Debug.Log($"[BuildTestCharacterRealisticScene] built {ScenePath}");
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
            controller.AddParameter("Dodge", AnimatorControllerParameterType.Trigger);
            controller.AddParameter("Death", AnimatorControllerParameterType.Trigger);
            controller.AddParameter("Interact", AnimatorControllerParameterType.Trigger);

            var sm = controller.layers[0].stateMachine;

            var idle = sm.AddState("Idle");
            idle.motion = LoadClip(IdleFbx, "idle");
            sm.defaultState = idle;

            var walk = sm.AddState("Walk");
            walk.motion = LoadClip(WalkFbx, "walk");

            var run = sm.AddState("Run");
            run.motion = LoadClip(RunFbx, "run");

            var attack = sm.AddState("Attack");
            attack.motion = LoadClip(AttackFbx, "attack");

            var hit = sm.AddState("Hit");
            hit.motion = LoadClip(HitFbx, "hit");

            var dodge = sm.AddState("Dodge");
            dodge.motion = LoadClip(DodgeFbx, "dodge");

            var death = sm.AddState("Death");
            death.motion = LoadClip(DeathFbx, "death");

            var interact = sm.AddState("Interaction");
            interact.motion = LoadClip(InteractFbx, "interaction");

            // 이동 블렌드 — Speed 값으로 Idle/Walk/Run을 오간다.
            AddParamTransition(idle, walk, "Speed", AnimatorConditionMode.Greater, 0.1f);
            AddParamTransition(walk, idle, "Speed", AnimatorConditionMode.Less, 0.1f);
            AddParamTransition(walk, run, "Speed", AnimatorConditionMode.Greater, 0.6f);
            AddParamTransition(run, walk, "Speed", AnimatorConditionMode.Less, 0.6f);

            // 어느 상태에서든 트리거 하나로 액션 클립 재생.
            AddAnyStateTrigger(sm, attack, "Attack");
            AddAnyStateTrigger(sm, hit, "Hit");
            AddAnyStateTrigger(sm, dodge, "Dodge");
            AddAnyStateTrigger(sm, death, "Death");
            AddAnyStateTrigger(sm, interact, "Interact");

            // 클립이 끝나면 Idle로 복귀 — Death는 마지막 프레임에 그대로 머문다(재생 후
            // 되살아나는 게 부자연스럽다, 실제 게임 사망 처리와 같은 관례).
            AddReturnToIdle(attack, idle);
            AddReturnToIdle(hit, idle);
            AddReturnToIdle(dodge, idle);
            AddReturnToIdle(interact, idle);

            AssetDatabase.SaveAssets();
            return controller;
        }

        private static void AddParamTransition(
            AnimatorState from, AnimatorState to, string param, AnimatorConditionMode mode, float threshold)
        {
            var t = from.AddTransition(to);
            t.hasExitTime = false;
            t.duration = 0.15f;
            t.AddCondition(mode, threshold, param);
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

        private static AnimationClip LoadClip(string path, string clipName) =>
            AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>()
                .FirstOrDefault(c => c.name == clipName);
    }
}
