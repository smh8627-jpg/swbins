using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using Saga.Dungeon.World;
using Saga.Dungeon.Player;
using Saga.Dungeon.UI;
using Saga.Dungeon.Data;

namespace Saga.EditorTools
{
    /// <summary>
    /// VERTICAL_SLICE_DUNGEON.md — TestDungeon 씬을 코드로 조립해 저장한다.
    /// `BuildTestVillageScene.cs`(GO)와 같은 결이지만 방 하나뿐이라 훨씬
    /// 짧다 — GLB 캐릭터·Sky/Fog·NPC·조이스틱 세부는 이번 슬라이스 범위
    /// 밖(문서의 "제외" 참고). 멱등 — 다시 실행하면 씬을 통째로 새로 짠다.
    /// </summary>
    public static class BuildTestDungeonScene
    {
        private const string ScenePath = "Assets/Scenes/TestDungeon.unity";
        private const string InputActionsPath = "Assets/InputSystem_Actions.inputactions";

        private static readonly Vector3 PlayerSpawn = new Vector3(-6f, 0.1f, 0f);
        private static readonly Vector3 EnemySpawn = new Vector3(5f, 0f, 0f);

        [MenuItem("Saga/Build TestDungeon Scene")]
        public static void Build()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            BuildLighting();
            var roomGo = BuildRoom();
            BuildEnemy();
            var (playerGo, playerCombat) = BuildPlayer();
            BuildEventSystem();
            BuildDialogueUi();
            BuildPlayerHud();
            BuildSaveButton();
            BuildAttackButton(playerCombat);
            BuildMobileHud();
            BuildBootstrap();

            AssetDatabase.SaveAssets();
            EditorSceneManager.SaveScene(scene, ScenePath);
            Debug.Log($"[BuildTestDungeonScene] saved to {ScenePath} — room childCount={roomGo.transform.childCount}");
        }

        private static void BuildLighting()
        {
            // 던전다운 어두운 분위기 — 은은한 방향광 하나뿐(saga-dungeon 웹판의
            // 실내 조명 세부는 다음 슬라이스, GLB 도입 때 같이 다룬다).
            var sunGo = new GameObject("Light");
            var light = sunGo.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 0.7f;
            light.shadows = LightShadows.Soft;
            sunGo.transform.rotation = Quaternion.Euler(55f, -20f, 0f);

            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.16f, 0.15f, 0.18f);
        }

        private static GameObject BuildRoom()
        {
            var go = new GameObject("Room");
            var builder = go.AddComponent<DungeonRoomBuilder>();
            builder.Build();
            return go;
        }

        private static void BuildEnemy()
        {
            var go = new GameObject("Enemy_HwangGeon");
            go.transform.position = EnemySpawn;
            go.AddComponent<DungeonEnemy>();
        }

        private static (GameObject playerGo, PlayerCombat combat) BuildPlayer()
        {
            var playerGo = new GameObject("Player");
            playerGo.tag = "Player";
            playerGo.transform.position = PlayerSpawn;

            var controller = playerGo.AddComponent<CharacterController>();
            controller.radius = 0.4f;
            controller.height = 1.8f;
            controller.center = new Vector3(0f, 0.9f, 0f);

            // 아직 GLB 전(문서의 "제외" 참고) — primitive capsule.
            var visualGo = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            visualGo.name = "Visual";
            visualGo.transform.SetParent(playerGo.transform, false);
            visualGo.transform.localPosition = new Vector3(0f, 0.9f, 0f);
            Object.DestroyImmediate(visualGo.GetComponent<Collider>());
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "Player (generated)" };
            mat.color = Color.white;
            visualGo.GetComponent<MeshRenderer>().sharedMaterial = mat;

            var rigGo = new GameObject("CameraRig");
            rigGo.transform.SetParent(playerGo.transform, false);
            rigGo.transform.localPosition = new Vector3(0f, 0.9f, 0f);
            var cameraRig = rigGo.AddComponent<CameraRig>();

            var camGo = new GameObject("PlayerCamera");
            camGo.transform.SetParent(rigGo.transform, false);
            var cam = camGo.AddComponent<Camera>();
            cam.tag = "MainCamera";
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.03f, 0.03f, 0.04f);
            camGo.AddComponent<AudioListener>();

            var inputActions = AssetDatabase.LoadAssetAtPath<UnityEngine.InputSystem.InputActionAsset>(InputActionsPath);
            if (inputActions == null)
            {
                Debug.LogWarning($"[BuildTestDungeonScene] {InputActionsPath} 를 못 찾음 — Move/Sprint 입력이 안 먹는다.");
            }

            var pc = playerGo.AddComponent<PlayerController>();
            SetPrivateField(pc, "visual", visualGo.transform);
            SetPrivateField(pc, "cameraRig", cameraRig);
            SetPrivateField(pc, "inputActions", inputActions);

            var combat = playerGo.AddComponent<PlayerCombat>();

            return (playerGo, combat);
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
            textGo.SetActive(false);
        }

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
            rect.anchoredPosition = new Vector2(20f, -20f);
            rect.sizeDelta = new Vector2(600f, 100f);

            var text = textGo.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 24;
            text.alignment = TextAnchor.UpperLeft;
            text.color = Color.white;
            text.text = "";

            var hud = canvasGo.AddComponent<PlayerHud>();
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

        /// <summary>화면 오른쪽 아래 — 모바일 공격 버튼(PlayerCombat.TriggerAttack()).
        /// 데스크톱은 스페이스바로도 된다(PlayerCombat.cs 참고).</summary>
        private static void BuildAttackButton(PlayerCombat combat)
        {
            var canvasGo = new GameObject("AttackUI");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            canvasGo.AddComponent<GraphicRaycaster>();

            var btnGo = new GameObject("AttackButton", typeof(RectTransform));
            btnGo.transform.SetParent(canvasGo.transform, false);
            var rect = (RectTransform)btnGo.transform;
            rect.anchorMin = new Vector2(1f, 0f);
            rect.anchorMax = new Vector2(1f, 0f);
            rect.pivot = new Vector2(1f, 0f);
            rect.anchoredPosition = new Vector2(-100f, 180f);
            rect.sizeDelta = new Vector2(160f, 160f);

            var img = btnGo.AddComponent<Image>();
            img.color = new Color(0.7f, 0.2f, 0.15f, 0.55f);
            var button = btnGo.AddComponent<Button>();
            button.targetGraphic = img;
            button.onClick.AddListener(combat.TriggerAttack);

            var textGo = new GameObject("Text", typeof(RectTransform));
            textGo.transform.SetParent(btnGo.transform, false);
            var textRect = (RectTransform)textGo.transform;
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.offsetMin = Vector2.zero;
            textRect.offsetMax = Vector2.zero;
            var text = textGo.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 30;
            text.alignment = TextAnchor.MiddleCenter;
            text.color = Color.white;
            text.text = "공격";
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
            var go = new GameObject("GameBootstrap");
            go.AddComponent<GameBootstrap>();
        }

        private static void SetPrivateField(object target, string fieldName, object value)
        {
            var field = target.GetType().GetField(fieldName,
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            if (field == null)
            {
                Debug.LogError($"[BuildTestDungeonScene] {target.GetType().Name}에 필드 '{fieldName}'이 없다.");
                return;
            }
            field.SetValue(target, value);
        }
    }
}
