using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.Rendering;
using UnityEngine.UI;
using Saga.Go.World;
using Saga.Go.Player;
using Saga.Go.UI;
using Saga.Go.Data;

namespace Saga.EditorTools
{
    /// <summary>
    /// VERTICAL_SLICE.md Phase 3~4 — TestVillage 씬을 코드로 조립해 저장한다.
    /// 손으로 .unity YAML을 쓰지 않는다(깨지기 쉽다) — 이 스크립트를
    /// -executeMethod로 배치 모드에서 돌려서 만든다. 멱등 — 다시 실행하면
    /// 씬을 통째로 새로 짠다(기존 씬을 덧그리지 않는다).
    /// </summary>
    public static class BuildTestVillageScene
    {
        private const string ScenePath = "Assets/Scenes/TestVillage.unity";
        private const string InputActionsPath = "Assets/InputSystem_Actions.inputactions";
        private const string SkyMaterialPath = "Assets/Games/SagaGo/World/Sky.mat";

        // saga-godot TestVillage.tscn의 마을 중심 스폰 자리와 동일.
        private static readonly Vector3 PlayerSpawn = new Vector3(-48f, 0.1f, -24f);

        [MenuItem("Saga/Build TestVillage Scene")]
        public static void Build()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            var sun = BuildLighting();
            BuildSkyAndFog(sun);
            var terrainGo = BuildTerrain();
            BuildVegetation();
            BuildLandmarks();
            BuildNpcs();
            BuildBanditEncounter();
            BuildHiddenTreasure();
            BuildGatherables();
            BuildMountainShrine();
            var (playerGo, cameraRig) = BuildPlayer();
            BuildReviewCamera();
            BuildEventSystem();
            BuildDialogueUi();
            BuildSaveButton();
            BuildPlayerHud();
            BuildDebugOverlay();
            BuildBootstrap();
            var joystick = BuildMobileHud();

            // 조이스틱 참조를 Player에 연결(FindFirstObjectByType으로도 찾지만
            // 씬 저장 시점엔 명시로 잡아 두는 쪽이 안전하다).
            SetPrivateField(playerGo.GetComponent<PlayerController>(), "joystick", joystick);

            AssetDatabase.SaveAssets();
            EditorSceneManager.SaveScene(scene, ScenePath);
            Debug.Log($"[BuildTestVillageScene] saved to {ScenePath} — " +
                      $"groundVerts={terrainGo.GetComponent<MeshFilter>().sharedMesh.vertexCount}");
        }

        private static Light BuildLighting()
        {
            var sunGo = new GameObject("Sun");
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.intensity = 1.1f;
            sun.shadows = LightShadows.Soft;
            sunGo.transform.rotation = Quaternion.Euler(45f, -30f, 0f);
            return sun;
        }

        /// <summary>
        /// PLAN.md 24·25장. HDRP 전용인 "Physically Based Sky" Volume은 URP엔
        /// 없다 — URP는 saga-godot(Environment 리소스, env_pc.tres)과 달리
        /// RenderSettings 기반 고전 방식(Skybox 머티리얼 + 기본 Fog)을 쓴다.
        /// 색 값은 env_pc.tres를 참고해 맞춤(완전히 같은 룩은 아니다 — Godot의
        /// ProceduralSkyMaterial은 top/horizon/ground를 따로 받지만 Unity
        /// Skybox/Procedural은 대기 산란 모델이라 파라미터가 다르다).
        /// 이 안개가 실제로 보이려면 VertexColorLit·WaterUnlit 셰이더에도
        /// URP 표준 안개 믹싱을 넣어야 한다(두 셰이더에 이미 추가함) — 안
        /// 넣으면 URP/Lit(랜드마크)만 안개가 지고 땅·나무·바위·강은 안 진다.
        /// </summary>
        private static void BuildSkyAndFog(Light sun)
        {
            var sky = AssetDatabase.LoadAssetAtPath<Material>(SkyMaterialPath);
            if (sky == null)
            {
                sky = new Material(Shader.Find("Skybox/Procedural")) { name = "Sky" };
                AssetDatabase.CreateAsset(sky, SkyMaterialPath);
            }
            sky.SetColor("_SkyTint", new Color(0.5f, 0.62f, 0.82f));
            sky.SetColor("_GroundColor", new Color(0.3f, 0.28f, 0.24f));
            sky.SetFloat("_AtmosphereThickness", 1.0f);
            sky.SetFloat("_Exposure", 1.3f);
            sky.SetFloat("_SunSize", 0.04f);
            sky.SetFloat("_SunSizeConvergence", 5f);
            EditorUtility.SetDirty(sky);

            RenderSettings.skybox = sky;
            RenderSettings.sun = sun;
            RenderSettings.ambientMode = AmbientMode.Skybox;
            DynamicGI.UpdateEnvironment();

            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogColor = new Color(0.75f, 0.78f, 0.72f);
            // 7x7칸×48m 지도(336m 사방, 대각선 약 475m) 기준 — 마을 안에선
            // 거의 안 보이고 지도 가장자리로 갈수록 흐려지게.
            RenderSettings.fogStartDistance = 150f;
            RenderSettings.fogEndDistance = 430f;
        }

        private static GameObject BuildTerrain()
        {
            var terrainGo = new GameObject("Terrain");
            var terrainBuilder = terrainGo.AddComponent<TerrainBuilder>();
            terrainBuilder.Build();
            return terrainGo;
        }

        private static void BuildVegetation()
        {
            var go = new GameObject("Vegetation");
            var builder = go.AddComponent<VegetationBuilder>();
            builder.Build();
        }

        private static void BuildLandmarks()
        {
            var go = new GameObject("Landmarks");
            var builder = go.AddComponent<LandmarksBuilder>();
            builder.Build();
        }

        private static void BuildNpcs()
        {
            var go = new GameObject("NPCs");
            var builder = go.AddComponent<NpcBuilder>();
            builder.Build();
        }

        private static void BuildBanditEncounter()
        {
            var go = new GameObject("BanditEncounter");
            var encounter = go.AddComponent<BanditEncounter>();
            encounter.Build();
        }

        private static void BuildHiddenTreasure()
        {
            var go = new GameObject("HiddenTreasure");
            var treasure = go.AddComponent<HiddenTreasure>();
            treasure.Build();
        }

        // 마을·굴·폐허·다리를 안 겹치는 들판(plains) 자리 3곳(PLAN.md 51장
        // "수집"). 격자 좌표는 TestMapData.Rows 참고 — (1,2)/(5,2)/(2,4) 전부
        // '.' 타일이고 촌장(1,3)·상인(4,3)·도적(5,3)의 말 걸기/조우 반경과
        // 한 칸(48유닛) 이상 떨어져 안 겹친다.
        private static readonly (string Id, int Gx, int Gy)[] GatherSpots =
        {
            ("herb_1", 1, 2),
            ("herb_2", 5, 2),
            ("herb_3", 2, 4),
        };

        private static void BuildMountainShrine()
        {
            var go = new GameObject("MountainShrine");
            var shrine = go.AddComponent<MountainShrine>();
            shrine.Build();
        }

        private static void BuildGatherables()
        {
            var parent = new GameObject("Gatherables");
            foreach (var spot in GatherSpots)
            {
                var go = new GameObject($"Gatherable_{spot.Id}");
                go.transform.SetParent(parent.transform, false);
                var g = go.AddComponent<Gatherable>();
                g.Init(spot.Id, spot.Gx, spot.Gy);
                g.Build();
            }
        }

        /// <summary>지나가다 듣는 한 마디를 띄우는 화면 상단 자막(누르는 대화창 아님).</summary>
        private static void BuildDialogueUi()
        {
            var canvasGo = new GameObject("DialogueUI");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            canvasGo.AddComponent<GraphicRaycaster>();

            var textGo = new GameObject("Label", typeof(RectTransform));
            textGo.transform.SetParent(canvasGo.transform, false);
            var rect = (RectTransform)textGo.transform;
            rect.anchorMin = new Vector2(0.5f, 1f);
            rect.anchorMax = new Vector2(0.5f, 1f);
            rect.pivot = new Vector2(0.5f, 1f);
            rect.anchoredPosition = new Vector2(0f, -80f);
            rect.sizeDelta = new Vector2(920f, 140f);

            var text = textGo.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 34;
            text.alignment = TextAnchor.MiddleCenter;
            text.color = Color.white;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.text = "";

            var dialogueLabel = canvasGo.AddComponent<DialogueLabel>();
            SetPrivateField(dialogueLabel, "label", text);
            // DialogueLabel.Awake()가 label 필드를 채우기 전(AddComponent 시점)에
            // 이미 돌아서 자동으로는 안 숨겨진다 — 여기서 직접 초기 상태를 맞춘다.
            textGo.SetActive(false);
        }

        /// <summary>12단계 완료 조건의 "저장한다" — 화면 오른쪽 위 버튼 하나.</summary>
        private static void BuildSaveButton()
        {
            var canvasGo = new GameObject("SaveUI");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            canvasGo.AddComponent<GraphicRaycaster>();

            var btnGo = new GameObject("SaveButton", typeof(RectTransform));
            btnGo.transform.SetParent(canvasGo.transform, false);
            var rect = (RectTransform)btnGo.transform;
            rect.anchorMin = new Vector2(1f, 1f);
            rect.anchorMax = new Vector2(1f, 1f);
            rect.pivot = new Vector2(1f, 1f);
            rect.anchoredPosition = new Vector2(-30f, -30f);
            rect.sizeDelta = new Vector2(160f, 80f);

            var img = btnGo.AddComponent<Image>();
            img.color = new Color(1f, 1f, 1f, 0.18f);
            var button = btnGo.AddComponent<Button>();
            button.targetGraphic = img;
            button.onClick.AddListener(() =>
            {
                bool ok = SaveState.Save();
                DialogueLabel.Instance?.Show(ok ? "저장했다." : "저장 실패 — 플레이어를 못 찾았다.", 3f);
            });

            var textGo = new GameObject("Text", typeof(RectTransform));
            textGo.transform.SetParent(btnGo.transform, false);
            var textRect = (RectTransform)textGo.transform;
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.offsetMin = Vector2.zero;
            textRect.offsetMax = Vector2.zero;
            var text = textGo.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 26;
            text.alignment = TextAnchor.MiddleCenter;
            text.color = Color.white;
            text.text = "저장";
        }

        /// <summary>화면 왼쪽 위 — 레벨/경험치/돈/장비, 릴리즈 빌드에서도 항상 보임
        /// (DebugUI와 자리가 겹치지 않게 그 아래 둔다).</summary>
        private static void BuildPlayerHud()
        {
            var canvasGo = new GameObject("PlayerHudUI");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            canvasGo.AddComponent<GraphicRaycaster>();

            var textGo = new GameObject("Label", typeof(RectTransform));
            textGo.transform.SetParent(canvasGo.transform, false);
            var rect = (RectTransform)textGo.transform;
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = new Vector2(0f, 1f);
            rect.pivot = new Vector2(0f, 1f);
            rect.anchoredPosition = new Vector2(20f, -130f);
            rect.sizeDelta = new Vector2(500f, 90f);

            var text = textGo.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 24;
            text.alignment = TextAnchor.UpperLeft;
            text.color = Color.white;
            text.text = "";

            var hud = canvasGo.AddComponent<PlayerHud>();
            SetPrivateField(hud, "label", text);
        }

        /// <summary>화면 왼쪽 위 — 디버그 빌드에서만 렌더러 이름·FPS.</summary>
        private static void BuildDebugOverlay()
        {
            var canvasGo = new GameObject("DebugUI");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            canvasGo.AddComponent<GraphicRaycaster>();

            var textGo = new GameObject("Label", typeof(RectTransform));
            textGo.transform.SetParent(canvasGo.transform, false);
            var rect = (RectTransform)textGo.transform;
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = new Vector2(0f, 1f);
            rect.pivot = new Vector2(0f, 1f);
            rect.anchoredPosition = new Vector2(20f, -20f);
            rect.sizeDelta = new Vector2(500f, 100f);

            var text = textGo.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 22;
            text.alignment = TextAnchor.UpperLeft;
            text.color = new Color(1f, 1f, 1f, 0.8f);
            text.text = "";

            var overlay = canvasGo.AddComponent<DebugHud>();
            SetPrivateField(overlay, "label", text);
        }

        /// <summary>씬이 다 올라온 뒤 저장 파일을 되돌린다(saga-godot test_village.gd와 같은 역할).</summary>
        private static void BuildBootstrap()
        {
            var go = new GameObject("GameBootstrap");
            go.AddComponent<GameBootstrap>();
        }

        private static (GameObject playerGo, CameraRig cameraRig) BuildPlayer()
        {
            var playerGo = new GameObject("Player");
            playerGo.tag = "Player";
            playerGo.transform.position = PlayerSpawn;

            var controller = playerGo.AddComponent<CharacterController>();
            controller.radius = 0.9f;
            controller.height = 3.4f;
            controller.center = new Vector3(0f, 1.7f, 0f);

            // Visual — 아직 GLB가 없어 primitive Capsule(PLAN.md 8장).
            var visual = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            visual.name = "Visual";
            Object.DestroyImmediate(visual.GetComponent<Collider>()); // CharacterController가 충돌을 대신한다
            visual.transform.SetParent(playerGo.transform, false);
            visual.transform.localScale = new Vector3(1.8f, 1.7f, 1.8f);
            visual.transform.localPosition = new Vector3(0f, 1.7f, 0f);

            // CameraRig — Player 자식, capsule 중심 높이(1.7)에서 시작.
            var rigGo = new GameObject("CameraRig");
            rigGo.transform.SetParent(playerGo.transform, false);
            rigGo.transform.localPosition = new Vector3(0f, 1.7f, 0f);
            var cameraRig = rigGo.AddComponent<CameraRig>();

            var camGo = new GameObject("PlayerCamera");
            camGo.transform.SetParent(rigGo.transform, false);
            var cam = camGo.AddComponent<Camera>();
            cam.tag = "MainCamera";
            camGo.AddComponent<AudioListener>();

            var inputActions = AssetDatabase.LoadAssetAtPath<UnityEngine.InputSystem.InputActionAsset>(InputActionsPath);
            if (inputActions == null)
            {
                Debug.LogWarning($"[BuildTestVillageScene] {InputActionsPath} 를 못 찾음 — Move/Sprint 입력이 안 먹는다.");
            }

            var pc = playerGo.AddComponent<PlayerController>();
            SetPrivateField(pc, "visual", visual.transform);
            SetPrivateField(pc, "cameraRig", cameraRig);
            SetPrivateField(pc, "inputActions", inputActions);

            return (playerGo, cameraRig);
        }

        /// <summary>
        /// 검토용 카메라(비활성) — saga-godot TestVillage.tscn의 ReviewCamera와
        /// 같은 역할. 기본은 Player 카메라가 활성 — 이 카메라는 필요할 때만
        /// 켠다(에디터에서 직접).
        /// </summary>
        private static void BuildReviewCamera()
        {
            var camGo = new GameObject("ReviewCamera");
            var cam = camGo.AddComponent<Camera>();
            cam.enabled = false;
            camGo.transform.position = new Vector3(0, 300, 140);
            camGo.transform.rotation = Quaternion.LookRotation(new Vector3(0, -0.9063f, -0.4226f), Vector3.forward);
        }

        private static void BuildEventSystem()
        {
            var esGo = new GameObject("EventSystem");
            esGo.AddComponent<EventSystem>();
            // 새 Input System 전용 프로젝트(activeInputHandler=1)라 UI 입력도
            // InputSystemUIInputModule을 쓴다(레거시 StandaloneInputModule 아님).
            esGo.AddComponent<InputSystemUIInputModule>();
        }

        /// <summary>왼쪽 아래 가상 조이스틱. saga-godot의 MobileHUD.tscn과 같은 역할.</summary>
        private static VirtualJoystick BuildMobileHud()
        {
            var canvasGo = new GameObject("MobileHUD");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920); // Portrait 기준, PLAN.md 19장
            canvasGo.AddComponent<GraphicRaycaster>();

            var baseGo = new GameObject("JoystickBase", typeof(RectTransform));
            baseGo.transform.SetParent(canvasGo.transform, false);
            var baseRect = (RectTransform)baseGo.transform;
            baseRect.anchorMin = new Vector2(0f, 0f);
            baseRect.anchorMax = new Vector2(0f, 0f);
            baseRect.pivot = new Vector2(0.5f, 0.5f);
            baseRect.anchoredPosition = new Vector2(140f, 220f);
            baseRect.sizeDelta = new Vector2(140f, 140f);
            var baseImg = baseGo.AddComponent<Image>();
            baseImg.color = new Color(1f, 1f, 1f, 0.18f);

            var knobGo = new GameObject("Knob", typeof(RectTransform));
            knobGo.transform.SetParent(baseGo.transform, false);
            var knobRect = (RectTransform)knobGo.transform;
            knobRect.anchorMin = knobRect.anchorMax = new Vector2(0.5f, 0.5f);
            knobRect.pivot = new Vector2(0.5f, 0.5f);
            knobRect.sizeDelta = new Vector2(64f, 64f);
            var knobImg = knobGo.AddComponent<Image>();
            knobImg.color = new Color(1f, 1f, 1f, 0.55f);

            var joystick = baseGo.AddComponent<VirtualJoystick>();
            SetPrivateField(joystick, "knob", knobRect);
            SetPrivateField(joystick, "radius", 60f);

            return joystick;
        }

        private static void SetPrivateField(object target, string fieldName, object value)
        {
            var field = target.GetType().GetField(fieldName,
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            if (field == null)
            {
                Debug.LogError($"[BuildTestVillageScene] {target.GetType().Name}에 필드 '{fieldName}'이 없다.");
                return;
            }
            field.SetValue(target, value);
        }
    }
}
