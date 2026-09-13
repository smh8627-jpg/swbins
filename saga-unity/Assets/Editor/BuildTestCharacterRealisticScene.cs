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
        private const string SplitMeshPath = "Assets/Art/CharactersRealistic/Generated/Maria_Split.asset";
        private const string SkinMatPath = "Assets/Art/CharactersRealistic/Generated/MariaSkin.mat";
        private const string RestMatPath = "Assets/Art/CharactersRealistic/Generated/MariaRest.mat";

        [MenuItem("Saga/Build Test Character Realistic Scene")]
        public static void Build()
        {
            var controller = BuildController();

            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var scene = EditorSceneManager.GetActiveScene();

            // 스카이박스/앰비언트 프로브를 변수에서 빼고 평평한 회색 앰비언트로 —
            // 리그·머티리얼만 순수하게 확인하기 위해서다(66-2장 FF16 무드는 각
            // 게임 씬의 몫, 여기서는 일부러 안 건드린다).
            RenderSettings.skybox = null;
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.35f, 0.35f, 0.35f);

            var lightGo = new GameObject("Directional Light", typeof(Light));
            var light = lightGo.GetComponent<Light>();
            light.type = LightType.Directional;
            light.color = Color.white;
            light.intensity = 1.2f;
            lightGo.transform.rotation = Quaternion.Euler(40f, 30f, 0f);

            var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.name = "Ground";
            ground.transform.localScale = new Vector3(2f, 1f, 2f);
            ground.GetComponent<Renderer>().sharedMaterial = CreateSimpleUrpLitMaterial("GroundGray", new Color(0.55f, 0.55f, 0.55f));

            var cameraGo = new GameObject("Main Camera", typeof(Camera));
            cameraGo.tag = "MainCamera";
            var cam = cameraGo.GetComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.5f, 0.6f, 0.7f);
            cameraGo.transform.position = new Vector3(0f, 1.4f, -3.2f);
            cameraGo.transform.rotation = Quaternion.Euler(8f, 0f, 0f);

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

            ApplySkinSplit(maria);

            if (!AssetDatabase.IsValidFolder("Assets/Scenes"))
            {
                AssetDatabase.CreateFolder("Assets", "Scenes");
            }
            EditorSceneManager.SaveScene(scene, ScenePath);
            Debug.Log($"[BuildTestCharacterRealisticScene] built {ScenePath}");
        }

        /// <summary>
        /// `BuildMariaSkinSplit.cs`가 미리 구워 둔 피부/기타 분리 메시·머티리얼이
        /// 있으면 물린다(66-2장 ⑤ 실제 적용) — 없으면(아직 안 돌렸으면) 원본
        /// 단일 머티리얼 그대로 둔다(조용히 건너뜀, 에러 아님). internal —
        /// 44장 순차 교체로 Maria를 쓰는 다른 Build*Scene.cs도 재사용한다
        /// (`BuildTestDungeonScene.BuildPlayer` 참고).
        /// </summary>
        internal static void ApplySkinSplit(GameObject maria)
        {
            var splitMesh = AssetDatabase.LoadAssetAtPath<Mesh>(SplitMeshPath);
            var skinMat = AssetDatabase.LoadAssetAtPath<Material>(SkinMatPath);
            var restMat = AssetDatabase.LoadAssetAtPath<Material>(RestMatPath);
            if (splitMesh == null || skinMat == null || restMat == null)
            {
                Debug.LogWarning("[BuildTestCharacterRealisticScene] skin-split assets not found — run 'Saga/Build Maria Skin Split' first. Using original single material for now.");
                return;
            }

            var smr = maria.GetComponentsInChildren<SkinnedMeshRenderer>(true)
                .FirstOrDefault(r => r.name == "Maria_J_J_Ong");
            if (smr == null)
            {
                return;
            }
            smr.sharedMesh = splitMesh;
            smr.sharedMaterials = new[] { skinMat, restMat };
        }

        private static Material CreateSimpleUrpLitMaterial(string name, Color color)
        {
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = name };
            mat.SetColor("_BaseColor", color);
            mat.SetFloat("_Smoothness", 0.2f);
            mat.SetFloat("_Metallic", 0f);
            return mat;
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
