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

        // Kenney Blocky Characters(CC0, docs/ASSET_GUIDE.md 참고 — saga-godot
        // assets/characters/*.glb와 같은 파일). a=플레이어, b=마을 촌장,
        // c=떠돌이 상인·나그네(모델 재사용, 색조로만 구분), d=산적.
        private const string PlayerModelPath = "Assets/Art/Characters/character-a.glb";

        // saga-godot TestVillage.tscn의 마을 중심 스폰 자리와 동일 — 마을 집 두 칸
        // (2,3)·(3,3) 사이 중앙. 예전엔 WorldPos(2.5,3)의 계산 결과를 상수로 박아
        // 뒀었는데(-48,0.1,-24), 그러면 TestMapData.Rows의 칸 수가 바뀔 때(지도
        // 확장) halfW/halfH가 바뀌어도 이 상수는 안 따라가 스폰 자리가 마을에서
        // 벗어나 버린다 — WorldPos()를 직접 불러 자동으로 같이 밀리게 한다.
        private static Vector3 PlayerSpawn =>
            TestMapData.WorldPos(2.5f, 3f) + new Vector3(0f, 0.1f, 0f);

        [MenuItem("Saga/Build TestVillage Scene")]
        public static void Build()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            BuildLighting();
            BuildSkyAndFog();
            var terrainGo = BuildTerrain();
            BuildVegetation();
            BuildLandmarks();
            BuildAnimals();
            BuildNpcs();
            BuildBanditEncounter();
            BuildRareWolfEncounter();
            BuildHiddenTreasure();
            BuildGatherables();
            BuildMountainShrine();
            BuildEastGroveRelic();
            BuildLuckyCairn();
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
        /// 2026-09-12 병합 정리 — 이 자리엔 한때 Skybox 머티리얼(Sky.mat) +
        /// RenderSettings.sun 기반의 다른 BuildSkyAndFog(Light) 구현이 있었다.
        /// 그런데 BuildPlayerCamera/BuildReviewCamera가 이미
        /// `clearFlags = CameraClearFlags.SolidColor` +
        /// `backgroundColor = SkyFogBuilder.HorizonColor`로 스카이박스 없이
        /// 단색 배경을 쓰도록 짜여 있어(둘 다 이 조건 없이 항상 그렇게
        /// 동작), Skybox 자산을 만드는 그 구현은 애초에 카메라에 안 보이는
        /// 죽은 코드였다 — 두 세션이 각자 다른 방향으로 SkyFogBuilder를
        /// 만들면서 생긴 병합 충돌을 정리하며 제거했다(SkyMaterialPath 상수도
        /// 그 구현에서만 쓰여 같이 지움). SkyFogBuilder.cs(Trilight 앰비언트 +
        /// ExponentialSquared 안개, env_pc.tres 수치 그대로)가 실제로 쓰이는
        /// 쪽이다.
        /// </summary>
        private static void BuildSkyAndFog()
        {
            var go = new GameObject("SkyFog");
            go.AddComponent<SkyFogBuilder>().Build();
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
            builder.Init(
                AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Art/Vegetation/tree_oak.glb"),
                AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Art/Rocks/rock_largeA.glb"),
                AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Art/Rocks/rock_smallA.glb"));
            builder.Build();
        }

        private static void BuildLandmarks()
        {
            var go = new GameObject("Landmarks");
            var builder = go.AddComponent<LandmarksBuilder>();
            builder.Init(
                AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Art/Dungeon/gate-rock.glb"),
                AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Art/Buildings/wall-block.glb"),
                AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Art/Buildings/roof-gable.glb"),
                AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Art/Buildings/pillar-stone.glb"),
                AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Art/Buildings/planks.glb"));
            builder.Build();
        }

        private static void BuildAnimals()
        {
            var go = new GameObject("Animals");
            var builder = go.AddComponent<AnimalBuilder>();
            builder.Build();
        }

        private static void BuildNpcs()
        {
            var go = new GameObject("NPCs");
            var builder = go.AddComponent<NpcBuilder>();
            builder.Init(
                AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Art/Characters/character-b.glb"),
                AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Art/Characters/character-c.glb"),
                // 나그네도 상인과 같은 모델(character-c)을 재사용 — 색조(v.Color)로만
                // 구분한다. Kenney 킷을 4종만 받아 뒀고 넷째(d)는 산적 몫이라(50~52행).
                AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Art/Characters/character-c.glb"));
            builder.Build();
        }

        private static void BuildBanditEncounter()
        {
            var go = new GameObject("BanditEncounter");
            var encounter = go.AddComponent<BanditEncounter>();
            encounter.Init(AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Art/Characters/character-d.glb"));
            encounter.Build();
        }

        private static void BuildRareWolfEncounter()
        {
            var go = new GameObject("RareWolfEncounter");
            var encounter = go.AddComponent<RareWolfEncounter>();
            encounter.Build();
        }

        private static void BuildHiddenTreasure()
        {
            var go = new GameObject("HiddenTreasure");
            var treasure = go.AddComponent<HiddenTreasure>();
            treasure.Build();
        }

        // 마을·굴·폐허·다리를 안 겹치는 들판(plains) 자리(PLAN.md 51장
        // "수집"). 격자 좌표는 TestMapData.Rows 참고 — (1,2)/(5,2)/(2,4)
        // 전부 '.' 타일이고 촌장(1,3)·상인(4,3)·도적(5,3)의 말 걸기/조우
        // 반경과 한 칸(48유닛) 이상 떨어져 안 겹친다. herb_4(3,7)은
        // 2026-09-12 지도 확장으로 새로 생긴 남쪽 숲 공터("^T...T^",
        // row7) 한가운데 — 남쪽 성벽 문을 지나 처음 만나는 새 콘텐츠라
        // "새 지역을 열었다"는 느낌을 곧바로 준다. herb_5(2,9)는 그 다음
        // 문 너머 둘째 남쪽 공터("^T.F.T^^^", row9)의 '.' 타일 — 옆에
        // 심은 'F'(논밭) 자체엔 안 둔다, Gatherable의 토스트 문구가
        // "산나물을 캤다"라 밭보다는 들판 쪽이 결이 맞는다.
        private static readonly (string Id, int Gx, int Gy)[] GatherSpots =
        {
            ("herb_1", 1, 2),
            ("herb_2", 5, 2),
            ("herb_3", 2, 4),
            ("herb_4", 3, 7),
            ("herb_5", 2, 9),
        };

        private static void BuildMountainShrine()
        {
            var go = new GameObject("MountainShrine");
            var shrine = go.AddComponent<MountainShrine>();
            shrine.Build();
        }

        private static void BuildEastGroveRelic()
        {
            var go = new GameObject("EastGroveRelic");
            var relic = go.AddComponent<EastGroveRelic>();
            relic.Build();
        }

        // PLAN.md 24~27장 "랜덤 이벤트" 첫 콘텐츠. 남쪽 첫 공터(row7)의
        // herb_4(3,7) 옆 빈 들판(4,7) — 남쪽 문을 지나면 채집 자리와 나란히
        // 바로 보인다.
        private static void BuildLuckyCairn()
        {
            var go = new GameObject("LuckyCairn");
            var cairn = go.AddComponent<LuckyCairn>();
            cairn.Build();
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

            // Visual — Kenney Blocky Characters character-a.glb(PLAN.md 8장,
            // docs/ASSET_GUIDE.md 참고 — saga-godot 트랙과 같은 CC0 파일 재사용).
            // GLB 피벗이 발밑이라 primitive capsule과 달리 y 오프셋이 필요 없다.
            var playerModel = AssetDatabase.LoadAssetAtPath<GameObject>(PlayerModelPath);
            Transform visual = playerModel != null
                ? CharacterVisual.Spawn(playerModel, playerGo.transform, CharacterVisual.HumanHeight, Color.white)
                : CharacterVisual.SpawnFallbackCapsule(playerGo.transform, Color.white);

            // CameraRig — Player 자식, capsule 중심 높이(1.7)에서 시작.
            var rigGo = new GameObject("CameraRig");
            rigGo.transform.SetParent(playerGo.transform, false);
            rigGo.transform.localPosition = new Vector3(0f, 1.7f, 0f);
            var cameraRig = rigGo.AddComponent<CameraRig>();

            var camGo = new GameObject("PlayerCamera");
            camGo.transform.SetParent(rigGo.transform, false);
            var cam = camGo.AddComponent<Camera>();
            cam.tag = "MainCamera";
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = SkyFogBuilder.HorizonColor;
            camGo.AddComponent<AudioListener>();

            var inputActions = AssetDatabase.LoadAssetAtPath<UnityEngine.InputSystem.InputActionAsset>(InputActionsPath);
            if (inputActions == null)
            {
                Debug.LogWarning($"[BuildTestVillageScene] {InputActionsPath} 를 못 찾음 — Move/Sprint 입력이 안 먹는다.");
            }

            var pc = playerGo.AddComponent<PlayerController>();
            SetPrivateField(pc, "visual", visual);
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
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = SkyFogBuilder.HorizonColor;
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
