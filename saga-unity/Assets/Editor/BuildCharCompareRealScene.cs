using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// char-forge 단계 3(`tools/char-forge/README.md` §7) — 지금 몸(Mixamo Maria, 로컬 전용)과 공방 사실 몸
    /// (`Assets/Art/CharactersForge/*.fbx`, MakeHuman·UAL 전부 CC0)을 같은 빛·같은 키(1.70m)로 나란히 세우는 비교 장면.
    /// 교체 문턱: 사람이 "못하지 않다"고 판정한 짝만 게임 몸을 바꾼다 — 이 장면은 그 판정용이고, 게임 씬은 안 건드린다.
    /// 두 몸이 같은 순서(서기 → 걷기 → 달리기 → 베기 → 맞기 → 구르기 → 줍기 → 쓰러짐)로 저절로 돈다(런타임 스크립트 없음).
    /// 다른 saga 편집기 코드에 기대지 않는다(빈 URP 프로젝트에서도 돈다). Maria 파일이 없는 PC 는 공방 몸만 선다.
    /// </summary>
    public static class BuildCharCompareRealScene
    {
        private const string ForgeDir = "Assets/Art/CharactersForge/";
        private const string ScenePath = "Assets/Scenes/CharCompareReal.unity";
        private const string AnimDir = "Assets/Animators/CharForge/";
        private const float Height = 1.70f;
        private const float Gap = 1.1f;

        private const string MariaDir = "Assets/Art/CharactersRealistic/";
        private const string MariaBody = MariaDir + "Maria WProp J J Ong.fbx";
        private static readonly Dictionary<string, string> MariaClips = new Dictionary<string, string>
        {
            { "idle", "Action Idle To Fight Idle" }, { "walk", "Walking" }, { "run", "Running" },
            { "attack", "Sword And Shield Slash" }, { "hit", "Hit Reaction" }, { "dodge", "Stand To Roll" },
            { "interaction", "Picking Up" }, { "death", "Two Handed Sword Death" },
        };
        // BuildMariaSkinSplit.cs 가 구운 피부/기타 분리(있으면 게임과 같게 물린다)
        private const string MariaSplit = MariaDir + "Generated/Maria_Split.asset";
        private const string MariaSkin = MariaDir + "Generated/MariaSkin.mat";
        private const string MariaRest = MariaDir + "Generated/MariaRest.mat";

        private static readonly string[] Cycle = { "idle", "walk", "run", "attack", "hit", "dodge", "interaction", "death" };
        private static readonly HashSet<string> Loops = new HashSet<string> { "idle", "walk", "run" };

        [MenuItem("Saga/Char Forge/Build Compare Real Scene")]
        public static void Build()
        {
            var forge = Directory.Exists(ForgeDir)
                ? Directory.GetFiles(ForgeDir, "*.fbx").Select(p => p.Replace('\\', '/')).OrderBy(p => p).ToList()
                : new List<string>();
            foreach (var fbx in forge) SetupForgeImport(fbx);

            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var scene = EditorSceneManager.GetActiveScene();
            RenderSettings.skybox = null;
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.35f, 0.35f, 0.35f);
            var light = new GameObject("Directional Light", typeof(Light)).GetComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.2f;
            light.shadows = LightShadows.Soft;
            light.transform.rotation = Quaternion.Euler(40f, 30f, 0f);
            var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.name = "Ground";
            ground.transform.localScale = new Vector3(2f, 1f, 2f);
            ground.GetComponent<Renderer>().sharedMaterial = Lit("CharCompareGround", new Color(0.55f, 0.55f, 0.55f));

            var rows = new List<(string label, GameObject go)>();
            var mariaAsset = AssetDatabase.LoadAssetAtPath<GameObject>(MariaBody);
            if (mariaAsset != null)
            {
                var clips = MariaClips.ToDictionary(kv => kv.Key,
                    kv => ClipIn(MariaDir + "Maria WProp J J Ong@" + kv.Value + ".fbx", kv.Key));
                var maria = (GameObject)PrefabUtility.InstantiatePrefab(mariaAsset);
                maria.name = "NOW_Mixamo_Maria";
                ApplyMariaSkinSplit(maria);
                Animate(maria, "Maria", clips);
                rows.Add(("NOW  Mixamo", maria));
            }
            else
            {
                Debug.LogWarning("[CharCompareReal] Maria 파일이 없다(Assets/Art/CharactersRealistic 은 로컬 전용) — 공방 몸만 세운다");
            }
            foreach (var fbx in forge)
            {
                var id = Path.GetFileNameWithoutExtension(fbx);
                var go = (GameObject)PrefabUtility.InstantiatePrefab(AssetDatabase.LoadAssetAtPath<GameObject>(fbx));
                go.name = "FORGE_" + id;
                var clips = AssetDatabase.LoadAllAssetsAtPath(fbx).OfType<AnimationClip>()
                    .Where(c => !c.name.StartsWith("__preview")).ToDictionary(c => c.name, c => c);
                Animate(go, id, clips);
                rows.Add(("FORGE  " + id, go));
            }

            for (int i = 0; i < rows.Count; i++)
            {
                var (label, go) = rows[i];
                FitHeight(go, Height);
                var p = go.transform.position;
                go.transform.position = new Vector3((i - (rows.Count - 1) * 0.5f) * Gap, p.y, 0f);
                go.transform.rotation = Quaternion.Euler(0f, 180f, 0f); // 카메라(-Z 쪽)를 보게
                Label(label, go.transform.position + Vector3.up * (Height + 0.25f));
            }

            var cam = new GameObject("Main Camera", typeof(Camera)).GetComponent<Camera>();
            cam.tag = "MainCamera";
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.5f, 0.6f, 0.7f);
            cam.fieldOfView = 35f;
            cam.transform.position = new Vector3(0f, 1.2f, -2.6f - 0.6f * rows.Count);
            cam.transform.rotation = Quaternion.Euler(6f, 0f, 0f);

            if (!AssetDatabase.IsValidFolder("Assets/Scenes")) AssetDatabase.CreateFolder("Assets", "Scenes");
            EditorSceneManager.SaveScene(scene, ScenePath);
            Debug.Log("[CharCompareReal] built " + ScenePath + " — " + string.Join(" | ", rows.Select(r => r.label)));
        }

        /// <summary>공방 FBX 를 Humanoid 로 — 클립 이름의 "뼈대|" 앞머리를 떼고 이동 셋은 반복, 텍스처를 꺼내 URP Lit 재질로 바꿔 끼운다.</summary>
        public static void SetupForgeImport(string fbx)
        {
            var mi = (ModelImporter)AssetImporter.GetAtPath(fbx);
            if (mi == null) return;
            mi.animationType = ModelImporterAnimationType.Human;
            mi.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            mi.SaveAndReimport();
            var id = Path.GetFileNameWithoutExtension(fbx);
            var texDir = ForgeDir + "Textures/";
            mi.ExtractTextures(texDir);
            AssetDatabase.Refresh();

            var clips = mi.defaultClipAnimations.Select(c =>
            {
                var n = c.name.Contains("|") ? c.name.Substring(c.name.LastIndexOf('|') + 1) : c.name;
                c.name = n;
                c.loopTime = Loops.Contains(n);
                c.lockRootRotation = c.lockRootHeightY = c.lockRootPositionXZ = true;
                c.keepOriginalOrientation = c.keepOriginalPositionY = c.keepOriginalPositionXZ = true;
                return c;
            }).ToArray();
            mi.clipAnimations = clips;
            mi.SaveAndReimport();

            // 재질: 가져온 것(읽기 전용)의 그림을 URP Lit 새 재질로 옮겨 이름으로 바꿔 끼운다
            var matDir = ForgeDir + "Materials/";
            if (!AssetDatabase.IsValidFolder(matDir.TrimEnd('/'))) AssetDatabase.CreateFolder(ForgeDir.TrimEnd('/'), "Materials");
            foreach (var src in AssetDatabase.LoadAllAssetsAtPath(fbx).OfType<Material>().ToList())
            {
                var path = matDir + id + "_" + src.name + ".mat";
                var m = AssetDatabase.LoadAssetAtPath<Material>(path);
                if (m == null)
                {
                    m = Lit(id + "_" + src.name, Color.white);
                    AssetDatabase.CreateAsset(m, path);
                }
                var baseTex = src.mainTexture;
                if (baseTex != null) m.SetTexture("_BaseMap", baseTex);
                var bump = src.HasProperty("_BumpMap") ? src.GetTexture("_BumpMap") : null;
                if (bump != null) { m.SetTexture("_BumpMap", bump); m.EnableKeyword("_NORMALMAP"); }
                // 칸별 손질 — 이름은 build_real.py 가 표준 칸으로 붙인다(skin·eye·hair·hair_brow·hair_lash·teeth·cloth_*)
                float smooth = src.name.StartsWith("eye") ? 0.85f : src.name.StartsWith("skin") ? 0.4f
                    : src.name.StartsWith("hair") ? 0.3f : src.name.StartsWith("teeth") ? 0.6f : 0.2f;
                m.SetFloat("_Smoothness", smooth);
                if (src.name.StartsWith("hair"))
                {
                    m.SetFloat("_AlphaClip", 1f);
                    m.SetFloat("_Cutoff", src.name == "hair" ? 0.35f : 0.5f);
                    m.EnableKeyword("_ALPHATEST_ON");
                    m.SetFloat("_Cull", 0f); // 머리카락 띠는 양면
                    m.renderQueue = (int)UnityEngine.Rendering.RenderQueue.AlphaTest;
                }
                EditorUtility.SetDirty(m);
                mi.AddRemap(new AssetImporter.SourceAssetIdentifier(typeof(Material), src.name), m);
            }
            mi.SaveAndReimport();
        }

        private static AnimationClip ClipIn(string fbx, string name) =>
            AssetDatabase.LoadAllAssetsAtPath(fbx).OfType<AnimationClip>().FirstOrDefault(c => c.name == name);

        /// <summary>Cycle 순서로 저절로 넘어가는 컨트롤러 — 이동 셋은 두 바퀴, 쓰러짐은 잠깐 머문 뒤 처음으로.</summary>
        private static void Animate(GameObject go, string key, Dictionary<string, AnimationClip> clips)
        {
            if (!AssetDatabase.IsValidFolder(AnimDir.TrimEnd('/')))
            {
                if (!AssetDatabase.IsValidFolder("Assets/Animators")) AssetDatabase.CreateFolder("Assets", "Animators");
                AssetDatabase.CreateFolder("Assets/Animators", "CharForge");
            }
            var path = AnimDir + key + "_cycle.controller";
            AssetDatabase.DeleteAsset(path);
            var ctl = AnimatorController.CreateAnimatorControllerAtPath(path);
            var sm = ctl.layers[0].stateMachine;
            var states = new List<AnimatorState>();
            foreach (var n in Cycle)
            {
                if (!clips.TryGetValue(n, out var clip) || clip == null) continue;
                var st = sm.AddState(n);
                st.motion = clip;
                states.Add(st);
            }
            if (states.Count == 0) { Debug.LogWarning("[CharCompareReal] 클립 없음: " + key); return; }
            sm.defaultState = states[0];
            for (int i = 0; i < states.Count; i++)
            {
                var n = states[i].name;
                var t = states[i].AddTransition(states[(i + 1) % states.Count]);
                t.hasExitTime = true;
                t.exitTime = Loops.Contains(n) ? 2f : n == "death" ? 1.6f : 1f;
                t.duration = 0.2f;
            }
            var anim = go.GetComponent<Animator>() ?? go.AddComponent<Animator>();
            anim.runtimeAnimatorController = ctl;
            anim.applyRootMotion = false;
        }

        /// <summary>쉼 자세 메시를 실제로 구워(BakeMesh) 잰 키로 맞추고 발바닥을 땅(y=0)에 — 스킨 경계 상자는 넉넉해서 안 쓴다.</summary>
        private static void FitHeight(GameObject go, float height)
        {
            Bounds? B(GameObject g)
            {
                Bounds? acc = null;
                foreach (var r in g.GetComponentsInChildren<SkinnedMeshRenderer>())
                {
                    var mesh = new Mesh();
                    r.BakeMesh(mesh, true);
                    var m = r.transform.localToWorldMatrix;
                    foreach (var v in mesh.vertices)
                    {
                        var w = m.MultiplyPoint3x4(v);
                        if (acc == null) acc = new Bounds(w, Vector3.zero);
                        else { var a = acc.Value; a.Encapsulate(w); acc = a; }
                    }
                    Object.DestroyImmediate(mesh);
                }
                return acc;
            }
            var b = B(go);
            if (b == null || b.Value.size.y < 0.01f) return;
            go.transform.localScale *= height / b.Value.size.y;
            b = B(go);
            go.transform.position += Vector3.down * b.Value.min.y;
        }

        private static void ApplyMariaSkinSplit(GameObject maria)
        {
            var split = AssetDatabase.LoadAssetAtPath<Mesh>(MariaSplit);
            var skin = AssetDatabase.LoadAssetAtPath<Material>(MariaSkin);
            var rest = AssetDatabase.LoadAssetAtPath<Material>(MariaRest);
            var smr = maria.GetComponentsInChildren<SkinnedMeshRenderer>(true).FirstOrDefault(r => r.name == "Maria_J_J_Ong");
            if (split == null || skin == null || rest == null || smr == null) return;
            smr.sharedMesh = split;
            smr.sharedMaterials = new[] { skin, rest };
        }

        private static void Label(string text, Vector3 at)
        {
            var go = new GameObject("Label_" + text.Split(' ')[0]);
            go.transform.position = at;
            go.transform.rotation = Quaternion.Euler(0f, 0f, 0f);
            var tm = go.AddComponent<TextMesh>();
            tm.text = text;
            tm.anchor = TextAnchor.MiddleCenter;
            tm.characterSize = 0.035f;
            tm.fontSize = 48;
            tm.color = Color.white;
        }

        private static Material Lit(string name, Color color)
        {
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = name };
            mat.SetColor("_BaseColor", color);
            mat.SetFloat("_Metallic", 0f);
            mat.SetFloat("_Smoothness", 0.2f);
            return mat;
        }
    }
}
