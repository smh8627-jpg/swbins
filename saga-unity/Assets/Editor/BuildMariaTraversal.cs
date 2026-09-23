using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 107 ② "이동" — Maria.controller 에 등반·활공·수영·점프 상태를 더한다(GO `PlayerController`
    /// 가 파라미터가 있을 때만 쓴다 — 없으면 걷기 클립 폴백). 클립은 `tools/mixamo_automation` 으로 받은
    /// 로컬 전용 FBX(gitignore, README 레시피 표):
    /// Climbing(Climbing Up A Wall, 제자리) · Gliding(Mid-Air Falling Idle) · Swimming(Swimming Underwater) ·
    /// Floating(Treading Water) · Jumping(Jump Up).
    ///
    /// 파라미터: `Climb`·`Glide`·`Swim`(bool) · `Jump`(trigger) · `ClimbRate`(float, 등반 상태 속도 배수 —
    /// 멈추면 0, 내려가면 -1). 수영은 `Speed` 1D 블렌드(0 = 물 위 대기, 0.5 = 헤엄).
    /// 루트 이동은 전부 자세에 굽는다(몸은 CharacterController 가 옮긴다).
    /// **멱등** — 다시 돌리면 상태 모션·전이만 새로 채운다. 클립이 하나라도 없으면 컨트롤러를 안 건드린다.
    /// 배치: `-executeMethod Saga.EditorTools.BuildMariaTraversal.Build`
    /// </summary>
    public static class BuildMariaTraversal
    {
        private const string Dir = "Assets/Art/CharactersRealistic/";
        private const string BodyPath = Dir + "Maria WProp J J Ong.fbx";
        private const string ControllerPath = "Assets/Animators/Maria.controller";
        private const string Tag = "[BuildMariaTraversal]";

        private static readonly (string file, string clip, bool loop)[] Clips =
        {
            ("Maria WProp J J Ong@Climbing.fbx", "climb", true),
            ("Maria WProp J J Ong@Gliding.fbx", "glide", true),
            ("Maria WProp J J Ong@Swimming.fbx", "swim", true),
            ("Maria WProp J J Ong@Floating.fbx", "tread", true),
            ("Maria WProp J J Ong@Jumping.fbx", "jump", false),
        };

        [MenuItem("Saga/Build Maria Traversal (Climb·Glide·Swim·Jump)")]
        public static void Build()
        {
            var bodyAvatar = AssetDatabase.LoadAllAssetsAtPath(BodyPath).OfType<Avatar>().FirstOrDefault();
            if (bodyAvatar == null || !bodyAvatar.isHuman)
            {
                Debug.LogWarning($"{Tag} Maria 몸 Avatar 가 없다({BodyPath}) — 건너뜀.");
                return;
            }

            var loaded = new AnimationClip[Clips.Length];
            for (int i = 0; i < Clips.Length; i++)
            {
                string path = Dir + Clips[i].file;
                var importer = AssetImporter.GetAtPath(path) as ModelImporter;
                if (importer == null)
                {
                    Debug.LogWarning($"{Tag} 클립 없음: {path} — tools/mixamo_automation 으로 받은 뒤 다시. 컨트롤러는 안 건드림.");
                    return;
                }
                importer.animationType = ModelImporterAnimationType.Human;
                importer.avatarSetup = ModelImporterAvatarSetup.CopyFromOther;
                importer.sourceAvatar = bodyAvatar;
                var defs = importer.defaultClipAnimations;
                if (defs.Length > 0)
                {
                    defs[0].name = Clips[i].clip;
                    defs[0].loopTime = Clips[i].loop;
                    defs[0].lockRootRotation = true;
                    defs[0].lockRootHeightY = true;
                    defs[0].lockRootPositionXZ = true;
                    defs[0].keepOriginalOrientation = true;
                    defs[0].keepOriginalPositionY = true;
                    defs[0].keepOriginalPositionXZ = true;
                    importer.clipAnimations = defs;
                }
                importer.SaveAndReimport();
                loaded[i] = AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>()
                    .FirstOrDefault(c => !c.name.StartsWith("__preview__"));
                if (loaded[i] == null)
                {
                    Debug.LogError($"{Tag} 클립을 못 읽음: {path}");
                    return;
                }
            }

            var controller = AssetDatabase.LoadAssetAtPath<AnimatorController>(ControllerPath);
            if (controller == null)
            {
                Debug.LogError($"{Tag} 컨트롤러 없음: {ControllerPath}");
                return;
            }
            EnsureParameter(controller, "Climb", AnimatorControllerParameterType.Bool);
            EnsureParameter(controller, "Glide", AnimatorControllerParameterType.Bool);
            EnsureParameter(controller, "Swim", AnimatorControllerParameterType.Bool);
            EnsureParameter(controller, "Jump", AnimatorControllerParameterType.Trigger);
            EnsureParameter(controller, "ClimbRate", AnimatorControllerParameterType.Float);

            var sm = controller.layers[0].stateMachine;
            AnimatorState Find(string name) => sm.states.Select(s => s.state).FirstOrDefault(s => s.name == name);
            AnimatorState Ensure(string name, Vector3 pos)
            {
                var st = Find(name) ?? sm.AddState(name, pos);
                // 배열만 비우면 옛 전이 개체가 컨트롤러 안에 고아로 남는다 — RemoveTransition 으로 지운다.
                foreach (var t in st.transitions.ToArray()) st.RemoveTransition(t);
                return st;
            }
            var idle = Find("Idle");
            var walk = Find("Walk");
            var run = Find("Run");
            var strafe = Find("Strafe");
            if (idle == null || walk == null)
            {
                Debug.LogError($"{Tag} Idle/Walk 상태가 없다 — Maria.controller 구조가 바뀜.");
                return;
            }

            var climb = Ensure("Climb", new Vector3(600f, -120f, 0f));
            climb.motion = loaded[0];
            climb.speedParameterActive = true;
            climb.speedParameter = "ClimbRate";

            var glide = Ensure("Glide", new Vector3(600f, -40f, 0f));
            glide.motion = loaded[1];

            var swim = Ensure("Swim", new Vector3(600f, 40f, 0f));
            var tree = swim.motion as BlendTree;
            if (tree == null)
            {
                tree = new BlendTree { name = "SwimBlend", hideFlags = HideFlags.HideInHierarchy };
                AssetDatabase.AddObjectToAsset(tree, controller);
                swim.motion = tree;
            }
            tree.children = new ChildMotion[0];
            tree.blendType = BlendTreeType.Simple1D;
            tree.blendParameter = "Speed";
            tree.useAutomaticThresholds = false;
            tree.AddChild(loaded[3], 0f);
            tree.AddChild(loaded[2], 0.5f);

            var jump = Ensure("Jump", new Vector3(600f, 120f, 0f));
            jump.motion = loaded[4];

            var ground = new[] { idle, walk, run, strafe }.Where(s => s != null).ToArray();
            // 지상 → 이동 상태(조건 전이를 목록 맨 앞에 — Speed 전이보다 먼저)
            foreach (var from in ground)
            {
                Front(from, climb, "Climb", true, 0.12f);
                Front(from, glide, "Glide", true, 0.15f);
                Front(from, swim, "Swim", true, 0.2f);
                FrontTrigger(from, jump, "Jump");
            }
            // 이동 상태끼리 · 끝나면 Idle
            Add(climb, glide, "Glide", true, 0.15f); Add(climb, swim, "Swim", true, 0.2f); Add(climb, idle, "Climb", false, 0.15f);
            Add(glide, climb, "Climb", true, 0.12f); Add(glide, swim, "Swim", true, 0.2f); Add(glide, idle, "Glide", false, 0.15f);
            Add(swim, climb, "Climb", true, 0.12f); Add(swim, idle, "Swim", false, 0.2f);
            Add(jump, climb, "Climb", true, 0.1f); Add(jump, glide, "Glide", true, 0.12f); Add(jump, swim, "Swim", true, 0.15f);
            var back = jump.AddTransition(idle);
            back.hasExitTime = true;
            back.exitTime = 0.85f;
            back.duration = 0.15f;

            EditorUtility.SetDirty(tree);
            EditorUtility.SetDirty(controller);
            AssetDatabase.SaveAssets();
            Debug.Log($"{Tag} OK — 상태 4(Climb·Glide·Swim·Jump)·클립 5, 지상 상태 {ground.Length}곳에서 전이");
        }

        private static void EnsureParameter(AnimatorController c, string name, AnimatorControllerParameterType type)
        {
            if (c.parameters.Any(p => p.name == name)) return;
            c.AddParameter(name, type);
        }

        private static AnimatorStateTransition Add(AnimatorState from, AnimatorState to, string param, bool on, float duration)
        {
            var tr = from.AddTransition(to);
            tr.hasExitTime = false;
            tr.duration = duration;
            tr.AddCondition(on ? AnimatorConditionMode.If : AnimatorConditionMode.IfNot, 0f, param);
            return tr;
        }

        /// <summary>그 파라미터 조건 전이를 하나만 두고 목록 맨 앞에(재실행해도 안 늘어난다).</summary>
        private static void Front(AnimatorState from, AnimatorState to, string param, bool on, float duration)
        {
            foreach (var old in from.transitions.Where(t => t.destinationState == to && t.conditions.Any(c => c.parameter == param)).ToArray())
                from.RemoveTransition(old);
            var tr = Add(from, to, param, on, duration);
            from.transitions = new[] { tr }.Concat(from.transitions.Where(t => t != tr)).ToArray();
        }

        private static void FrontTrigger(AnimatorState from, AnimatorState to, string trigger)
        {
            foreach (var old in from.transitions.Where(t => t.destinationState == to && t.conditions.Any(c => c.parameter == trigger)).ToArray())
                from.RemoveTransition(old);
            var tr = from.AddTransition(to);
            tr.hasExitTime = false;
            tr.duration = 0.08f;
            tr.AddCondition(AnimatorConditionMode.If, 0f, trigger);
            from.transitions = new[] { tr }.Concat(from.transitions.Where(t => t != tr)).ToArray();
        }
    }
}
