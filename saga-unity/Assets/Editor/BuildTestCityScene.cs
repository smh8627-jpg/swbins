using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using Saga.Realm.World;
using Saga.Realm.Player;
using Saga.Realm.UI;

namespace Saga.EditorTools
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md — TestCity 씬을 코드로 조립해 저장한다.
    /// `BuildTestStoryScene.cs`와 같은 결(멱등, 다시 실행하면 통째로 새로
    /// 짠다). REALM은 다섯 판 중 유일하게 실시간 이동·전투가 없는 턴제
    /// 경영이라(1절) 플레이어 GameObject·CharacterController·입력
    /// 액션 애셋이 아예 없다 — 카메라는 성 중심(원점)에 고정된 궤도
    /// 카메라 하나뿐이다.
    /// </summary>
    public static class BuildTestCityScene
    {
        private const string ScenePath = "Assets/Scenes/TestCity.unity";

        private static readonly Color SkyColor = new Color(0.55f, 0.75f, 0.92f);

        [MenuItem("Saga/Build TestCity Scene")]
        public static void Build()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            BuildLighting();
            BuildCity();
            BuildCamera();
            BuildEventSystem();
            BuildHudAndCommands();
            BuildBootstrap();

            AssetDatabase.SaveAssets();
            EditorSceneManager.SaveScene(scene, ScenePath);
            Debug.Log($"[BuildTestCityScene] saved to {ScenePath}");
        }

        private static void BuildLighting()
        {
            var sunGo = new GameObject("Light");
            var light = sunGo.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.15f;
            light.shadows = LightShadows.Soft;
            sunGo.transform.rotation = Quaternion.Euler(55f, -25f, 0f);

            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.5f, 0.55f, 0.6f);
        }

        private static void BuildCity()
        {
            var cityGo = new GameObject("City");
            var builder = cityGo.AddComponent<RealmCityBuilder>();
            builder.Rebuild(); // Awake()는 Play 모드에서만 자동으로 도니 edit-time 저장을 위해 직접 부른다.
        }

        /// <summary>카메라 리그는 성 중심(원점)에 고정 — 쫓아갈 플레이어가
        /// 없다(RealmOrbitCamera.cs 클래스 주석 참고).</summary>
        private static void BuildCamera()
        {
            var rigGo = new GameObject("RealmCameraRig");
            rigGo.transform.position = Vector3.zero;
            var orbitCam = rigGo.AddComponent<RealmOrbitCamera>();

            var camGo = new GameObject("RealmCamera");
            camGo.transform.SetParent(rigGo.transform, false);
            var cam = camGo.AddComponent<Camera>();
            cam.tag = "MainCamera";
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = SkyColor;
            camGo.AddComponent<AudioListener>();

            SetPrivateField(orbitCam, "cam", cam);
        }

        private static void BuildEventSystem()
        {
            var esGo = new GameObject("EventSystem");
            esGo.AddComponent<EventSystem>();
            esGo.AddComponent<InputSystemUIInputModule>();
        }

        private static void BuildHudAndCommands()
        {
            var hudCanvasGo = new GameObject("RealmHudUI");
            var canvas = hudCanvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = hudCanvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            hudCanvasGo.AddComponent<GraphicRaycaster>();

            var textGo = new GameObject("Label", typeof(RectTransform));
            textGo.transform.SetParent(hudCanvasGo.transform, false);
            var rect = (RectTransform)textGo.transform;
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = new Vector2(0f, 1f);
            rect.pivot = new Vector2(0f, 1f);
            rect.anchoredPosition = new Vector2(20f, -20f);
            rect.sizeDelta = new Vector2(760f, 340f);

            var text = textGo.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 26;
            text.alignment = TextAnchor.UpperLeft;
            text.color = Color.white;
            text.text = "";

            var hud = hudCanvasGo.AddComponent<RealmHud>();
            SetPrivateField(hud, "label", text);

            var toastGo = new GameObject("ToastLabel", typeof(RectTransform));
            toastGo.transform.SetParent(hudCanvasGo.transform, false);
            var toastRect = (RectTransform)toastGo.transform;
            toastRect.anchorMin = new Vector2(0.5f, 0f);
            toastRect.anchorMax = new Vector2(0.5f, 0f);
            toastRect.pivot = new Vector2(0.5f, 0f);
            toastRect.anchoredPosition = new Vector2(0f, 260f);
            toastRect.sizeDelta = new Vector2(900f, 90f);
            var toastText = toastGo.AddComponent<Text>();
            toastText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            toastText.fontSize = 28;
            toastText.alignment = TextAnchor.MiddleCenter;
            toastText.color = Color.white;
            var toast = hudCanvasGo.AddComponent<RealmToast>();
            SetPrivateField(toast, "label", toastText);

            var commandsGo = new GameObject("RealmCommands");
            var commandUi = commandsGo.AddComponent<RealmCommandUi>();
            commandUi.Build();
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
                Debug.LogError($"[BuildTestCityScene] {target.GetType().Name}에 필드 '{fieldName}'이 없다.");
                return;
            }
            field.SetValue(target, value);
        }
    }
}
