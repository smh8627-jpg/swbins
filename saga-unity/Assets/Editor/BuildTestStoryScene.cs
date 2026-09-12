using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using Saga.Story.World;
using Saga.Story.Player;
using Saga.Story.UI;

namespace Saga.EditorTools
{
    /// <summary>
    /// VERTICAL_SLICE_STORY.md — TestField 씬을 코드로 조립해 저장한다.
    /// `BuildTestDungeonScene.cs`(DUNGEON)와 같은 결 — 멱등, 다시 실행하면
    /// 씬을 통째로 새로 짠다. STORY는 다섯 판 중 유일하게 2.5D 플랫포머라
    /// 카메라·조작·월드 빌더가 전부 새로 설계됐다(PLAN.md 5장 — 게임
    /// 디자인은 엔진과 무관하되 이 판만 축 자체가 다르다).
    /// </summary>
    public static class BuildTestStoryScene
    {
        private const string ScenePath = "Assets/Scenes/TestField.unity";
        private const string InputActionsPath = "Assets/InputSystem_Actions.inputactions";

        // "GLB 자산 도입"(DUNGEON) 슬라이스가 이미 받아 둔 Kenney Blocky
        // Characters를 그대로 재사용 — 플레이어=character-a(무색),
        // 잡졸(황건적)=character-d(DUNGEON 잡졸과 같은 배역).
        private const string CharacterAPath = "Assets/Art/Characters/character-a.glb";
        private const string CharacterDPath = "Assets/Art/Characters/character-d.glb";

        private static readonly Color SkyColor = new Color(0.55f, 0.75f, 0.92f); // data-side.js field.mood='sky'

        private static GameObject _characterA, _characterD;

        [MenuItem("Saga/Build TestField Scene")]
        public static void Build()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            LoadCharacterModels();
            BuildLighting();
            BuildTerrain();
            BuildEnemies();
            var (playerGo, playerController) = BuildPlayer();
            BuildCamera();
            BuildEventSystem();
            BuildHud();
            BuildSaveButton();
            BuildMobileControls(playerController);
            BuildBootstrap();

            AssetDatabase.SaveAssets();
            EditorSceneManager.SaveScene(scene, ScenePath);
            Debug.Log($"[BuildTestStoryScene] saved to {ScenePath} — player={playerGo.name}");
        }

        private static void LoadCharacterModels()
        {
            _characterA = AssetDatabase.LoadAssetAtPath<GameObject>(CharacterAPath);
            _characterD = AssetDatabase.LoadAssetAtPath<GameObject>(CharacterDPath);
            if (_characterA == null || _characterD == null)
            {
                Debug.LogWarning("[BuildTestStoryScene] character-{a,d}.glb 중 일부를 못 찾음 — primitive capsule로 대체됨(CharacterVisual.cs 폴백).");
            }
        }

        private static void BuildLighting()
        {
            var sunGo = new GameObject("Light");
            var light = sunGo.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.1f;
            light.shadows = LightShadows.Soft;
            sunGo.transform.rotation = Quaternion.Euler(50f, -30f, 0f);

            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.5f, 0.55f, 0.6f);
        }

        private static void BuildTerrain()
        {
            var go = new GameObject("Terrain");
            var builder = go.AddComponent<StoryTerrainBuilder>();
            builder.Build(); // Awake()는 Play 모드에서만 자동으로 도니 edit-time 저장을 위해 직접 부른다.
        }

        private static void BuildEnemies()
        {
            var go = new GameObject("Enemies");
            var spawner = go.AddComponent<StoryEnemySpawner>();
            SetPrivateField(spawner, "enemyModelPrefab", _characterD);
            spawner.Build();
        }

        private static (GameObject playerGo, StoryPlayerController controller) BuildPlayer()
        {
            var playerGo = new GameObject("Player");
            playerGo.tag = "Player";
            playerGo.transform.position = new Vector3(2f, 0.1f, 0f);

            var controller = playerGo.AddComponent<CharacterController>();
            controller.radius = 0.4f;
            controller.height = 1.8f;
            controller.center = new Vector3(0f, 0.9f, 0f);

            Transform visual = _characterA != null
                ? Saga.Story.World.CharacterVisual.Spawn(_characterA, playerGo.transform, 1.8f, Color.white)
                : Saga.Story.World.CharacterVisual.SpawnFallbackCapsule(playerGo.transform, 1.8f, Color.white);

            var storyController = playerGo.AddComponent<StoryPlayerController>();
            SetPrivateField(storyController, "visual", visual);

            return (playerGo, storyController);
        }

        /// <summary>2절 — 카메라는 플레이어의 자식이 아니라 독립 오브젝트
        /// (StoryCameraFollow.cs 클래스 주석 참고, Y 보간을 위해서다).</summary>
        private static void BuildCamera()
        {
            var camGo = new GameObject("StoryCamera");
            camGo.transform.position = new Vector3(2f, 2.6f, -16f);
            var cam = camGo.AddComponent<Camera>();
            cam.tag = "MainCamera";
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = SkyColor;
            camGo.AddComponent<AudioListener>();
            camGo.AddComponent<StoryCameraFollow>();
        }

        private static void BuildEventSystem()
        {
            var esGo = new GameObject("EventSystem");
            esGo.AddComponent<EventSystem>();
            esGo.AddComponent<InputSystemUIInputModule>();
        }

        private static void BuildHud()
        {
            var canvasGo = new GameObject("StoryHudUI");
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
            rect.sizeDelta = new Vector2(600f, 60f);

            var text = textGo.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 26;
            text.alignment = TextAnchor.UpperLeft;
            text.color = Color.white;
            text.text = "";

            var hud = canvasGo.AddComponent<StoryHud>();
            SetPrivateField(hud, "label", text);
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
            img.color = new Color(1f, 1f, 1f, 0.18f);
            var button = btnGo.AddComponent<Button>();
            button.targetGraphic = img;
            button.onClick.AddListener(() =>
            {
                Saga.Story.Data.StorySaveState.Save();
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

        /// <summary>19~21장 모바일 조작 — 이 판은 1축 플랫포머라 다른 네
        /// 판의 2축 조이스틱 대신 좌/우·오르내리기 hold 버튼 넷 +
        /// 점프·공격 버튼 둘(HoldButton.cs 클래스 주석 참고).</summary>
        private static void BuildMobileControls(StoryPlayerController controller)
        {
            var canvasGo = new GameObject("MobileHUD");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            canvasGo.AddComponent<GraphicRaycaster>();

            var leftBtn = BuildHoldButton(canvasGo.transform, new Vector2(0f, 0f), new Vector2(120f, 200f), "◀", new Color(1f, 1f, 1f, 0.18f));
            var rightBtn = BuildHoldButton(canvasGo.transform, new Vector2(0f, 0f), new Vector2(260f, 200f), "▶", new Color(1f, 1f, 1f, 0.18f));
            var upBtn = BuildHoldButton(canvasGo.transform, new Vector2(0f, 0f), new Vector2(120f, 440f), "▲", new Color(1f, 1f, 1f, 0.14f));
            var downBtn = BuildHoldButton(canvasGo.transform, new Vector2(0f, 0f), new Vector2(260f, 440f), "▼", new Color(1f, 1f, 1f, 0.14f));

            SetPrivateField(controller, "leftButton", leftBtn);
            SetPrivateField(controller, "rightButton", rightBtn);
            SetPrivateField(controller, "climbUpButton", upBtn);
            SetPrivateField(controller, "climbDownButton", downBtn);

            BuildActionButton(canvasGo.transform, new Vector2(-100f, 180f), "점프", new Color(0.15f, 0.45f, 0.6f, 0.55f), controller.TriggerJump);
            BuildActionButton(canvasGo.transform, new Vector2(-280f, 180f), "공격", new Color(0.7f, 0.2f, 0.15f, 0.55f), controller.TriggerAttack);
        }

        private static HoldButton BuildHoldButton(Transform parent, Vector2 anchorFromBottomLeft, Vector2 offset, string label, Color color)
        {
            var go = new GameObject("HoldButton_" + label, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = new Vector2(0f, 0f);
            rect.anchorMax = new Vector2(0f, 0f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = offset;
            rect.sizeDelta = new Vector2(120f, 120f);

            var img = go.AddComponent<Image>();
            img.color = color;
            var hold = go.AddComponent<HoldButton>();

            var textGo = new GameObject("Text", typeof(RectTransform));
            textGo.transform.SetParent(go.transform, false);
            var textRect = (RectTransform)textGo.transform;
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.offsetMin = Vector2.zero;
            textRect.offsetMax = Vector2.zero;
            var text = textGo.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 34;
            text.alignment = TextAnchor.MiddleCenter;
            text.color = Color.white;
            text.text = label;

            return hold;
        }

        private static void BuildActionButton(Transform parent, Vector2 offset, string label, Color color, UnityEngine.Events.UnityAction onClick)
        {
            var go = new GameObject("ActionButton_" + label, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = new Vector2(1f, 0f);
            rect.anchorMax = new Vector2(1f, 0f);
            rect.pivot = new Vector2(1f, 0f);
            rect.anchoredPosition = offset;
            rect.sizeDelta = new Vector2(160f, 160f);

            var img = go.AddComponent<Image>();
            img.color = color;
            var button = go.AddComponent<Button>();
            button.targetGraphic = img;
            button.onClick.AddListener(onClick);

            var textGo = new GameObject("Text", typeof(RectTransform));
            textGo.transform.SetParent(go.transform, false);
            var textRect = (RectTransform)textGo.transform;
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.offsetMin = Vector2.zero;
            textRect.offsetMax = Vector2.zero;
            var text = textGo.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 28;
            text.alignment = TextAnchor.MiddleCenter;
            text.color = Color.white;
            text.text = label;
        }

        private static void BuildBootstrap()
        {
            var go = new GameObject("GameBootstrap");
            go.AddComponent<GameBootstrap>();
        }

        private static void SetPrivateField(object target, string fieldName, object value)
        {
            var field = target.GetType().GetField(fieldName,
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            if (field == null)
            {
                Debug.LogError($"[BuildTestStoryScene] {target.GetType().Name}에 필드 '{fieldName}'이 없다.");
                return;
            }
            field.SetValue(target, value);
        }
    }
}
