using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using Saga.Go.World;
using Saga.Go.Player;
using Saga.Go.UI;

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

        // saga-godot TestVillage.tscn의 마을 중심 스폰 자리와 동일.
        private static readonly Vector3 PlayerSpawn = new Vector3(-48f, 0.1f, -24f);

        [MenuItem("Saga/Build TestVillage Scene")]
        public static void Build()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            BuildLighting();
            var terrainGo = BuildTerrain();
            BuildVegetation();
            BuildLandmarks();
            var (playerGo, cameraRig) = BuildPlayer();
            BuildReviewCamera();
            BuildEventSystem();
            var joystick = BuildMobileHud();

            // 조이스틱 참조를 Player에 연결(FindFirstObjectByType으로도 찾지만
            // 씬 저장 시점엔 명시로 잡아 두는 쪽이 안전하다).
            SetPrivateField(playerGo.GetComponent<PlayerController>(), "joystick", joystick);

            EditorSceneManager.SaveScene(scene, ScenePath);
            Debug.Log($"[BuildTestVillageScene] saved to {ScenePath} — " +
                      $"groundVerts={terrainGo.GetComponent<MeshFilter>().sharedMesh.vertexCount}");
        }

        private static void BuildLighting()
        {
            var sunGo = new GameObject("Sun");
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.intensity = 1.1f;
            sun.shadows = LightShadows.Soft;
            sunGo.transform.rotation = Quaternion.Euler(45f, -30f, 0f);
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
