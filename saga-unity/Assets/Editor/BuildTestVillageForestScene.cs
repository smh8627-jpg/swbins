using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using Saga.Forest.World;
using Saga.Forest.Player;
using Saga.Forest.UI;
using Saga.Forest.Data;

namespace Saga.EditorTools
{
    /// <summary>
    /// VERTICAL_SLICE_FOREST.md(saga-godot 설계를 그대로 참고) — 이 판
    /// 첫 슬라이스의 TestVillageForest 씬을 코드로 조립해 저장한다.
    /// `BuildTestDungeonScene.cs`와 같은 결(멱등 — 다시 실행하면 씬을
    /// 통째로 새로 짠다). 완료 조건(그 문서 4절): 걷는다 → 나무를 흔들어
    /// 과일을 줍는다 → 주민에게 말을 건다 → 집 안으로 들어간다(곡률
    /// 꺼짐 확인) → 다시 나온다(곡률 켜짐 확인) → 저장한다 → 다시
    /// 켜서 이어진다.
    /// </summary>
    public static class BuildTestVillageForestScene
    {
        private const string ScenePath = "Assets/Scenes/TestVillageForest.unity";
        private const string InputActionsPath = "Assets/InputSystem_Actions.inputactions";

        // GO가 이미 검증해 둔 나무 GLB·캐릭터 GLB를 그대로 재사용
        // (VERTICAL_SLICE_FOREST.md 2절 "새 자산을 안 구하고 GO가 검증해
        // 둔 나무 GLB를 재사용할 수 있다").
        private const string TreeGlbPath = "Assets/Art/Vegetation/tree_oak.glb";
        private const string VillagerGlbPath = "Assets/Art/Characters/character-b.glb";
        private const string PlayerGlbPath = "Assets/Art/Characters/character-a.glb";

        private static readonly Vector3 PlayerSpawn = new Vector3(0f, 0.1f, -15f);
        private static readonly Vector3 FruitTreeSpawn = new Vector3(-10f, 0f, 5f);
        private static readonly Vector3 VillagerSpawn = new Vector3(10f, 0f, 5f);
        private static readonly Vector3 HouseSpawn = new Vector3(15f, 0f, -10f);

        private static GameObject _treeGlb, _villagerGlb, _playerGlb;

        [MenuItem("Saga/Build TestVillageForest Scene")]
        public static void Build()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            LoadModels();
            BuildLighting();
            var groundGo = BuildGround();
            BuildFruitTree();
            BuildVillager();
            BuildHouse();
            var (playerGo, playerTransform) = BuildPlayer();
            BuildCurveDriver(playerTransform);
            BuildEventSystem();
            BuildDialogueUi();
            BuildSaveButton();
            BuildMobileHud();
            BuildBootstrap();

            AssetDatabase.SaveAssets();
            EditorSceneManager.SaveScene(scene, ScenePath);
            Debug.Log($"[BuildTestVillageForestScene] saved to {ScenePath} — ground childCount={groundGo.transform.childCount}");
        }

        private static void LoadModels()
        {
            _treeGlb = AssetDatabase.LoadAssetAtPath<GameObject>(TreeGlbPath);
            _villagerGlb = AssetDatabase.LoadAssetAtPath<GameObject>(VillagerGlbPath);
            _playerGlb = AssetDatabase.LoadAssetAtPath<GameObject>(PlayerGlbPath);
            if (_treeGlb == null || _villagerGlb == null || _playerGlb == null)
            {
                Debug.LogWarning("[BuildTestVillageForestScene] tree_oak.glb/character-b.glb/character-a.glb 중 일부를 못 찾음 — primitive 폴백으로 대체됨.");
            }
        }

        private static void BuildLighting()
        {
            var sunGo = new GameObject("Light");
            var light = sunGo.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.1f; // 던전보다 밝게 — 낮의 야외 숲마을.
            light.shadows = LightShadows.Soft;
            sunGo.transform.rotation = Quaternion.Euler(50f, -30f, 0f);

            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.35f, 0.38f, 0.3f);
        }

        private static GameObject BuildGround()
        {
            var go = new GameObject("Ground");
            go.AddComponent<ForestGroundBuilder>();
            return go;
        }

        private static void BuildFruitTree()
        {
            var go = new GameObject("FruitTree");
            go.transform.position = FruitTreeSpawn;
            var tree = go.AddComponent<ForestFruitTree>();
            SetPrivateField(tree, "treeModel", _treeGlb);
        }

        private static void BuildVillager()
        {
            var go = new GameObject("Villager_Keeper");
            go.transform.position = VillagerSpawn;
            var villager = go.AddComponent<ForestVillager>();
            SetPrivateField(villager, "modelPrefab", _villagerGlb);
        }

        private static void BuildHouse()
        {
            var go = new GameObject("House");
            go.transform.position = HouseSpawn;
            go.AddComponent<ForestHouse>();
        }

        private static (GameObject playerGo, Transform playerTransform) BuildPlayer()
        {
            var playerGo = new GameObject("Player");
            playerGo.tag = "Player";
            playerGo.transform.position = PlayerSpawn;

            var controller = playerGo.AddComponent<CharacterController>();
            controller.radius = 0.4f;
            controller.height = 1.8f;
            controller.center = new Vector3(0f, 0.9f, 0f);

            Transform visual = _playerGlb != null
                ? CharacterVisual.Spawn(_playerGlb, playerGo.transform, 1.8f, Color.white)
                : CharacterVisual.SpawnFallbackCapsule(playerGo.transform, 1.8f, Color.white);
            var visualGo = visual.gameObject;

            var rigGo = new GameObject("CameraRig");
            rigGo.transform.SetParent(playerGo.transform, false);
            rigGo.transform.localPosition = new Vector3(0f, 0.9f, 0f);
            var cameraRig = rigGo.AddComponent<CameraRig>();

            var camGo = new GameObject("PlayerCamera");
            camGo.transform.SetParent(rigGo.transform, false);
            var cam = camGo.AddComponent<Camera>();
            cam.tag = "MainCamera";
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.55f, 0.72f, 0.85f); // 하늘색 — 던전(검정)과 다르게 야외.
            camGo.AddComponent<AudioListener>();

            var inputActions = AssetDatabase.LoadAssetAtPath<UnityEngine.InputSystem.InputActionAsset>(InputActionsPath);
            if (inputActions == null)
            {
                Debug.LogWarning($"[BuildTestVillageForestScene] {InputActionsPath} 를 못 찾음 — Move/Sprint 입력이 안 먹는다.");
            }

            var pc = playerGo.AddComponent<PlayerController>();
            SetPrivateField(pc, "visual", visualGo.transform);
            SetPrivateField(pc, "cameraRig", cameraRig);
            SetPrivateField(pc, "inputActions", inputActions);

            return (playerGo, playerGo.transform);
        }

        /// <summary>곡률 중심을 매 프레임 플레이어 위치로 갱신 —
        /// ForestWorldCurveDriver.cs 참고.</summary>
        private static void BuildCurveDriver(Transform playerTransform)
        {
            var go = new GameObject("ForestWorldCurveDriver");
            var driver = go.AddComponent<ForestWorldCurveDriver>();
            SetPrivateField(driver, "player", playerTransform);
        }

        private static void BuildEventSystem()
        {
            var esGo = new GameObject("EventSystem");
            esGo.AddComponent<EventSystem>();
            esGo.AddComponent<InputSystemUIInputModule>();
        }

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
            rect.sizeDelta = new Vector2(920f, 160f);

            var text = textGo.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 32;
            text.alignment = TextAnchor.MiddleCenter;
            text.color = Color.white;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.text = "";

            var dialogueLabel = canvasGo.AddComponent<DialogueLabel>();
            SetPrivateField(dialogueLabel, "label", text);
            textGo.SetActive(false);
        }

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
            img.color = new Color(0f, 0f, 0f, 0.25f);
            var button = btnGo.AddComponent<Button>();
            button.targetGraphic = img;
            button.onClick.AddListener(() =>
            {
                bool ok = ForestSaveState.Save();
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

        private static void BuildMobileHud()
        {
            var canvasGo = new GameObject("MobileHUD");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
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
        }

        private static void BuildBootstrap()
        {
            var go = new GameObject("ForestBootstrap");
            go.AddComponent<ForestBootstrap>();
        }

        private static void SetPrivateField(object target, string fieldName, object value)
        {
            var field = target.GetType().GetField(fieldName,
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            if (field == null)
            {
                Debug.LogError($"[BuildTestVillageForestScene] {target.GetType().Name}에 필드 '{fieldName}'이 없다.");
                return;
            }
            field.SetValue(target, value);
        }
    }
}
