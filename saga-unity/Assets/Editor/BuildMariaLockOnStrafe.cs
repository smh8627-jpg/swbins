using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 106-1 "락온 중 이동" — Maria.controller 에 옆걸음 2D 블렌드 상태
    /// "Strafe" 와 파라미터 `LockOn`(bool)·`MoveX`·`MoveY`(float)를 더한다.
    /// 가운데 = 전투 대기(Idle 상태 클립), 앞 = 걷기(Walk 상태 클립),
    /// 뒤·좌·우 = Mixamo 검방 세트(`tools/mixamo_automation` 로 받은 로컬 전용
    /// FBX, gitignore). Idle·Walk·Run → Strafe 는 LockOn 참, Strafe → Idle 은 거짓.
    /// 공격·피격·회피·죽음은 기존 Any State 전이가 그대로 받는다.
    ///
    /// **멱등** — 다시 돌리면 블렌드 자식만 새로 채운다. 클립 셋 중 하나라도
    /// 없으면 컨트롤러를 안 건드리고 끝낸다(`PlayerController`는 `LockOn`
    /// 파라미터가 없으면 걷기 클립 폴백).
    /// 배치: `-executeMethod Saga.EditorTools.BuildMariaLockOnStrafe.Build`
    /// </summary>
    public static class BuildMariaLockOnStrafe
    {
        private const string Dir = "Assets/Art/CharactersRealistic/";
        private const string BodyPath = Dir + "Maria WProp J J Ong.fbx";
        private const string ControllerPath = "Assets/Animators/Maria.controller";
        private const string StateName = "Strafe";
        private const float StrafeStateSpeed = 1.4f; // 락온 이동 4.5m/s 에 발 미끄럼을 줄이려 클립을 조금 빨리.

        private static readonly (string file, string clip)[] Clips =
        {
            ("Maria WProp J J Ong@Sword And Shield Left Strafe Walk.fbx", "strafe_left"),
            ("Maria WProp J J Ong@Sword And Shield Right Strafe Walk.fbx", "strafe_right"),
            ("Maria WProp J J Ong@Sword And Shield Backward Walk.fbx", "walk_back"),
        };

        [MenuItem("Saga/Build Maria Lock-On Strafe")]
        public static void Build()
        {
            const string Tag = "[BuildMariaLockOnStrafe]";
            var bodyAvatar = AssetDatabase.LoadAllAssetsAtPath(BodyPath).OfType<Avatar>().FirstOrDefault();
            if (bodyAvatar == null || !bodyAvatar.isHuman)
            {
                Debug.LogWarning($"{Tag} Maria 몸 Avatar 가 없다({BodyPath}) — 먼저 Saga/Setup Mixamo Character Import. 건너뜀.");
                return;
            }

            var loaded = new AnimationClip[Clips.Length];
            for (int i = 0; i < Clips.Length; i++)
            {
                string path = Dir + Clips[i].file;
                if (AssetImporter.GetAtPath(path) == null)
                {
                    Debug.LogWarning($"{Tag} 클립 없음: {path} — tools/mixamo_automation 으로 받은 뒤 다시. 컨트롤러는 안 건드림.");
                    return;
                }
                MixamoRigUtil.RigAnimationClip(path, bodyAvatar, Clips[i].clip, true);
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

            EnsureParameter(controller, "LockOn", AnimatorControllerParameterType.Bool);
            EnsureParameter(controller, "MoveX", AnimatorControllerParameterType.Float);
            EnsureParameter(controller, "MoveY", AnimatorControllerParameterType.Float);

            var sm = controller.layers[0].stateMachine;
            AnimatorState Find(string name) => sm.states.Select(s => s.state).FirstOrDefault(s => s.name == name);
            var idle = Find("Idle");
            var walk = Find("Walk");
            var run = Find("Run");
            if (idle == null || walk == null)
            {
                Debug.LogError($"{Tag} Idle/Walk 상태가 없다 — Maria.controller 구조가 바뀜.");
                return;
            }

            var strafe = Find(StateName);
            BlendTree tree;
            if (strafe == null)
            {
                strafe = controller.CreateBlendTreeInController(StateName, out tree, 0);
            }
            else
            {
                tree = strafe.motion as BlendTree;
                if (tree == null)
                {
                    tree = new BlendTree { name = StateName, hideFlags = HideFlags.HideInHierarchy };
                    AssetDatabase.AddObjectToAsset(tree, controller);
                    strafe.motion = tree;
                }
                tree.children = new ChildMotion[0];
            }
            strafe.speed = StrafeStateSpeed;

            tree.blendType = BlendTreeType.SimpleDirectional2D;
            tree.blendParameter = "MoveX";
            tree.blendParameterY = "MoveY";
            tree.AddChild(idle.motion, Vector2.zero);
            tree.AddChild(walk.motion, new Vector2(0f, 1f));
            tree.AddChild(loaded[2], new Vector2(0f, -1f));
            tree.AddChild(loaded[0], new Vector2(-1f, 0f));
            tree.AddChild(loaded[1], new Vector2(1f, 0f));

            foreach (var from in new[] { idle, walk, run })
            {
                if (from == null) continue;
                EnsureTransition(from, strafe, AnimatorConditionMode.If);
            }
            EnsureTransition(strafe, idle, AnimatorConditionMode.IfNot);

            EditorUtility.SetDirty(tree);
            EditorUtility.SetDirty(controller);
            AssetDatabase.SaveAssets();
            Debug.Log($"{Tag} OK — Strafe 블렌드 5 자식, LockOn 전이 {(run != null ? 4 : 3)}개");
        }

        private static void EnsureParameter(AnimatorController c, string name, AnimatorControllerParameterType type)
        {
            if (c.parameters.Any(p => p.name == name)) return;
            c.AddParameter(name, type);
        }

        /// <summary>LockOn 조건 전이를 하나만 두고 그 상태의 전이 목록 맨 앞에 놓는다
        /// (Idle→Walk 같은 Speed 전이보다 먼저 보게).</summary>
        private static void EnsureTransition(AnimatorState from, AnimatorState to, AnimatorConditionMode mode)
        {
            var existing = from.transitions.FirstOrDefault(t => t.destinationState == to
                && t.conditions.Any(c => c.parameter == "LockOn"));
            if (existing != null) return;

            var tr = from.AddTransition(to);
            tr.hasExitTime = false;
            tr.duration = 0.15f;
            tr.AddCondition(mode, 0f, "LockOn");
            from.transitions = new[] { tr }.Concat(from.transitions.Where(t => t != tr)).ToArray();
        }
    }
}
