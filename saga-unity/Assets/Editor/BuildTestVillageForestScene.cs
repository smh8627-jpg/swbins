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
using Saga.Core;

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
        // 101-2 5.8① "채집 손맛 — 효과음 3종 라운드로빈"(ForestGatherFeel.cs) —
        // 새 에셋 없이 이미 임포트된 Kenney Interface Sounds 3종을 돌려쓴다.
        private static readonly string[] GatherClipPaths =
        {
            "Assets/Art/Audio/Kenney_InterfaceSounds/confirmation_001.ogg",
            "Assets/Art/Audio/Kenney_InterfaceSounds/confirmation_002.ogg",
            "Assets/Art/Audio/Kenney_InterfaceSounds/confirmation_003.ogg",
        };

        private const string TreeGlbPath = "Assets/Art/Vegetation/tree_oak.glb";
        private const string VillagerGlbPath = "Assets/Art/Characters/character-b.glb";
        private const string PlayerGlbPath = "Assets/Art/Characters/character-a.glb";

        // 44장 "Player" 교체 — Dungeon/GO가 이미 쓰는 Maria 재사용
        // (BuildTestVillageScene.cs와 같은 결). FOREST는 원래 1.8m 실측
        // 스케일이라(GO의 3.4m와 달리) Maria 실측 높이(1.83m)와 거의
        // 그대로 맞는다 — 그래도 정확한 비율로 다시 잰다.
        private const string MariaBodyFbxPath = "Assets/Art/CharactersRealistic/Maria WProp J J Ong.fbx";
        private const string MariaControllerPath = "Assets/Animators/Maria.controller";
        private const float MariaNativeHeight = 1.83f;
        private const float PlayerTargetHeight = 1.8f;

        private static readonly Vector3 PlayerSpawn = new Vector3(0f, 0.1f, -15f);
        private static readonly Vector3 FruitTreeSpawn = new Vector3(-10f, 0f, 5f);
        private static readonly Vector3 VillagerSpawn = new Vector3(10f, 0f, 5f);
        private static readonly Vector3 HouseSpawn = new Vector3(15f, 0f, -10f);
        // 집 안(가구 자리 여섯+가구전)이 이미 빽빽해 벽지/장판 좌판은 집
        // 밖에 둔다 — 동쪽 벽(HouseSpawn.x+2)에서 2m, 출입 트리거
        // (HouseSpawn+(0,0,-2.5), 반경 1.4)에서도 4.7m 떨어져 안전.
        private static readonly Vector3 FinishStallSpawn = new Vector3(19f, 0f, -10f);

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
            var houseGo = BuildHouse();
            BuildHomeFurniture(houseGo);
            BuildFinishStall();
            BuildCreatures();
            BuildMuseum();
            BuildTownScoreBoard();
            var (playerGo, playerTransform) = BuildPlayer();
            BuildCurveDriver(playerTransform);
            BuildPostProcessingVolume();
            BuildEventSystem();
            BuildDialogueUi();
            BuildHostileEncounterUi();
            BuildDebugOverlay();
            BuildSaveButton();
            BuildSettingsUi();
            BuildGoalBoardUi();
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

        /// <summary>PLAN.md 66-2장(파이널 판타지 최신작 기준) 라이팅/무드 —
        /// golden-hour급으로 각도를 낮추고 색을 데워 Bloom(66-2 후처리)이
        /// 반응하게 한다. 차가운 톤 RimLight로 실루엣 강조(66-2장).</summary>
        private static void BuildLighting()
        {
            var sunGo = new GameObject("Light");
            var light = sunGo.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.7f; // 던전보다 밝게 — 낮의 야외 숲마을.
            light.color = new Color(1f, 0.9f, 0.75f);
            light.shadows = LightShadows.Soft;
            sunGo.transform.rotation = Quaternion.Euler(30f, -30f, 0f);

            var rimGo = new GameObject("RimLight");
            var rim = rimGo.AddComponent<Light>();
            rim.type = LightType.Directional;
            rim.intensity = 0.45f;
            rim.color = new Color(0.6f, 0.7f, 0.9f);
            rim.shadows = LightShadows.None;
            rimGo.transform.rotation = Quaternion.Euler(15f, 150f, 0f);

            var skyFogGo = new GameObject("SkyFog");
            skyFogGo.AddComponent<ForestSkyFogBuilder>().Build();
        }

        private static GameObject BuildGround()
        {
            var go = new GameObject("Ground");
            go.AddComponent<ForestGroundBuilder>();
            return go;
        }

        private static AudioClip[] _gatherClips;

        private static AudioClip[] LoadGatherClips()
        {
            if (_gatherClips != null) return _gatherClips;
            var clips = new AudioClip[GatherClipPaths.Length];
            for (int i = 0; i < GatherClipPaths.Length; i++)
            {
                clips[i] = AssetDatabase.LoadAssetAtPath<AudioClip>(GatherClipPaths[i]);
            }
            _gatherClips = clips;
            return _gatherClips;
        }

        private static void BuildFruitTree()
        {
            var go = new GameObject("FruitTree");
            go.transform.position = FruitTreeSpawn;
            var tree = go.AddComponent<ForestFruitTree>();
            SetPrivateField(tree, "treeModel", _treeGlb);
            SetPrivateField(tree, "gatherClips", LoadGatherClips());
        }

        private static void BuildVillager()
        {
            var go = new GameObject("Villager_Keeper");
            go.transform.position = VillagerSpawn;
            var villager = go.AddComponent<ForestVillager>();
            SetPrivateField(villager, "modelPrefab", _villagerGlb);
        }

        private static GameObject BuildHouse()
        {
            var go = new GameObject("House");
            go.transform.position = HouseSpawn;
            var house = go.AddComponent<ForestHouse>();
            house.Build(); // Awake()는 Play 모드에서만 저절로 불려 edit-time엔 명시로 불러야 한다.
            return go;
        }

        // "집 꾸미기(가구)" 슬라이스(2026-09-12) → **자유 배치로 재설계
        // (2026-09-13)** — IndoorRoom(ForestHouse.Awake()가 이미 지어 둔 실내,
        // +500m 포켓) 안에 좌판 하나 + 격자 배치 컴포넌트 하나를 놓는다.
        // 좌판 좌표는 `ForestHomeState.StallLocalPos`(단일 출처, 격자
        // 유효성 판정도 이 값을 그대로 쓴다)를 그대로 따른다 — 여기서
        // 따로 상수를 안 둔다.
        private static void BuildHomeFurniture(GameObject houseGo)
        {
            var indoorRoom = houseGo.transform.Find("IndoorRoom");
            if (indoorRoom == null)
            {
                Debug.LogError("[BuildTestVillageForestScene] House 안에 IndoorRoom을 못 찾음 — ForestHouse.Awake() 순서 확인 필요.");
                return;
            }

            var stallGo = new GameObject("FurnitureStall");
            stallGo.transform.SetParent(indoorRoom, false);
            stallGo.transform.localPosition = ForestHomeState.StallLocalPos;
            stallGo.AddComponent<ForestFurnitureStall>();

            var placerGo = new GameObject("FurniturePlacer");
            placerGo.transform.SetParent(indoorRoom, false);
            var placer = placerGo.AddComponent<ForestFurniturePlacer>();
            placer.SetIndoorRoom(indoorRoom);
        }

        // FOREST 다음 조각 — 벽지/장판 좌판(도배전). House.RepaintFinish()가
        // 실내를 다시 칠하려면 House를 찾아야 하는데, 집 안(포켓 공간)과
        // 달리 이건 평범한 야외 오브젝트라 Awake()에서
        // FindFirstObjectByType로 바로 찾을 수 있다.
        private static void BuildFinishStall()
        {
            var go = new GameObject("FinishStall");
            go.transform.position = FinishStallSpawn;
            go.AddComponent<ForestFinishStall>();
        }

        // "몬스터·퓨전 콘텐츠" 슬라이스 — Awake()가 Play 모드에서만 저절로
        // 불려도 되는 컴포넌트라(GO AnimalBuilder.cs와 같은 결 — 아무도 edit-time에
        // 그 자식을 즉시 찾을 필요가 없다) 명시적 Build() 호출 없이 AddComponent만.
        private static void BuildCreatures()
        {
            var go = new GameObject("Creatures");
            go.AddComponent<ForestCreatureBuilder>();
        }

        /// <summary>PLAN.md 101-2 5.3 "마을 번들"(2026-09-20) — 네 바이옴 존
        /// (`ForestBiomeData.Zones`) 중심에서 살짝 비껴 둔다(그 존의 창조물
        /// den 둘과 안 겹치는 자리 — `ForestCreatureBuilder.cs` 좌표 주석
        /// 참고, 존마다 den 두 개가 중심과 대각선 방향으로 퍼져 있어 반대
        /// 대각선으로 6m씩 옮기면 셋 다 안 겹친다).</summary>
        private static void BuildMuseum()
        {
            BuildCollectSpot(ForestMuseumState.Category.Insect, new Vector3(-19f, 0f, -14f),
                new Color(0.55f, 0.85f, 0.95f)); // 어둑숲 — 반짝벌레류, 차가운 빛.
            BuildCollectSpot(ForestMuseumState.Category.Mushroom, new Vector3(-19f, 0f, 14f),
                new Color(0.75f, 0.35f, 0.6f)); // 버섯숲.
            BuildCollectSpot(ForestMuseumState.Category.Fossil, new Vector3(19f, 0f, 14f),
                new Color(0.55f, 0.5f, 0.42f)); // 바위 지대.
            BuildCollectSpot(ForestMuseumState.Category.Flower, new Vector3(19f, 0f, -14f),
                new Color(0.95f, 0.6f, 0.75f)); // 꽃밭.
        }

        // 마을 중심 통행로(플레이어 스폰(-15z)과 네 존·집·주민이 흩어진
        // 본 마을 사이) — 다른 오브젝트와 안 겹치는 빈 자리.
        private static readonly Vector3 TownScoreBoardSpawn = new Vector3(0f, 0f, -5f);

        private static void BuildTownScoreBoard()
        {
            var go = new GameObject("TownScoreBoard");
            go.transform.position = TownScoreBoardSpawn;
            go.AddComponent<ForestTownScoreBoard>();
        }

        private static void BuildCollectSpot(ForestMuseumState.Category category, Vector3 pos, Color color)
        {
            var go = new GameObject($"CollectSpot_{category}");
            go.transform.position = pos;
            var spot = go.AddComponent<ForestCollectSpot>();
            SetPrivateField(spot, "category", category);
            SetPrivateField(spot, "pool", ForestMuseumState.ItemsOf(category));
            SetPrivateField(spot, "spotColor", color);
            SetPrivateField(spot, "gatherClips", LoadGatherClips());
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

            Animator playerAnimator;
            Transform visual = BuildPlayerVisual(playerGo.transform, out playerAnimator);
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
            cam.backgroundColor = ForestSkyFogBuilder.HorizonColor; // golden-hour 톤 — 던전(검정)과 다르게 야외.
            camGo.AddComponent<AudioListener>();
            camGo.AddComponent<UnityEngine.Rendering.Universal.UniversalAdditionalCameraData>()
                .renderPostProcessing = true;

            var inputActions = AssetDatabase.LoadAssetAtPath<UnityEngine.InputSystem.InputActionAsset>(InputActionsPath);
            if (inputActions == null)
            {
                Debug.LogWarning($"[BuildTestVillageForestScene] {InputActionsPath} 를 못 찾음 — Move/Sprint 입력이 안 먹는다.");
            }

            var pc = playerGo.AddComponent<PlayerController>();
            SetPrivateField(pc, "visual", visualGo.transform);
            SetPrivateField(pc, "animator", playerAnimator);
            SetPrivateField(pc, "cameraRig", cameraRig);
            SetPrivateField(pc, "inputActions", inputActions);

            return (playerGo, playerGo.transform);
        }

        /// <summary>Maria(Humanoid, Animator 포함) → 실패 시 character-a →
        /// 실패 시 primitive capsule 순으로 폴백(BuildTestVillageScene.cs와
        /// 같은 결). 이 게임엔 전투가 없어 animator는 Speed만 쓴다.</summary>
        private static Transform BuildPlayerVisual(Transform parent, out Animator animator)
        {
            animator = null;

            var mariaBody = AssetDatabase.LoadAssetAtPath<GameObject>(MariaBodyFbxPath);
            if (mariaBody != null)
            {
                var maria = (GameObject)PrefabUtility.InstantiatePrefab(mariaBody, parent);
                maria.name = "Visual";
                maria.transform.localPosition = Vector3.zero;
                maria.transform.localRotation = Quaternion.identity;
                maria.transform.localScale = Vector3.one * (PlayerTargetHeight / MariaNativeHeight);

                animator = maria.GetComponent<Animator>();
                if (animator == null)
                {
                    animator = maria.AddComponent<Animator>();
                }
                var controller = AssetDatabase.LoadAssetAtPath<UnityEditor.Animations.AnimatorController>(MariaControllerPath);
                if (controller == null)
                {
                    Debug.LogWarning($"[BuildTestVillageForestScene] {MariaControllerPath} 를 못 찾음 — Maria 시각화는 되지만 애니메이션이 안 돎.");
                }
                animator.runtimeAnimatorController = controller;

                BuildTestCharacterRealisticScene.ApplySkinSplit(maria);
                return maria.transform;
            }

            Debug.LogWarning($"[BuildTestVillageForestScene] {MariaBodyFbxPath} 를 못 찾음(로컬 전용 자산, mixamo.com에서 받아야 함) — character-a로 폴백.");
            return _playerGlb != null
                ? CharacterVisual.Spawn(_playerGlb, parent, PlayerTargetHeight, Color.white)
                : CharacterVisual.SpawnFallbackCapsule(parent, PlayerTargetHeight, Color.white);
        }

        /// <summary>곡률 중심을 매 프레임 플레이어 위치로 갱신 —
        /// ForestWorldCurveDriver.cs 참고.</summary>
        private static void BuildCurveDriver(Transform playerTransform)
        {
            var go = new GameObject("ForestWorldCurveDriver");
            var driver = go.AddComponent<ForestWorldCurveDriver>();
            SetPrivateField(driver, "player", playerTransform);
        }

        /// <summary>PLAN.md 66-2장(파이널 판타지 최신작 기준) "다음에 할 일"
        /// ① 라이팅/색보정/후처리 — BuildFF16VolumeProfiles.cs가 지어 둔
        /// 공유 자산(PC/Mobile) 중 플랫폼에 맞는 쪽을 PlatformVolumeProfile이
        /// 골라 낀다. 에디터 프리뷰는 기본으로 PC 프로파일을 미리 꽂아 둔다.</summary>
        private static void BuildPostProcessingVolume()
        {
            var go = new GameObject("GlobalVolume");
            var volume = go.AddComponent<UnityEngine.Rendering.Volume>();
            volume.isGlobal = true;
            volume.weight = 1f;

            var pcProfile = AssetDatabase.LoadAssetAtPath<UnityEngine.Rendering.VolumeProfile>(
                BuildFF16VolumeProfiles.PcProfilePath);
            var mobileProfile = AssetDatabase.LoadAssetAtPath<UnityEngine.Rendering.VolumeProfile>(
                BuildFF16VolumeProfiles.MobileProfilePath);
            if (pcProfile == null)
            {
                Debug.LogWarning("[BuildTestVillageForestScene] FF16Volume_PC.asset 을 못 찾음 — " +
                                  "Saga > Build FF16 Volume Profiles 를 먼저 돌릴 것.");
            }

            var platform = go.AddComponent<PlatformVolumeProfile>();
            platform.pcProfile = pcProfile;
            platform.mobileProfile = mobileProfile;
            volume.sharedProfile = pcProfile; // .profile은 씬에 저장 안 되는 런타임 복사본용(Volume.cs 참고)
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

        // 67장 "사운드" 첫 슬라이스(2026-09-14, ForestAudio.cs 참고) — Kenney
        // Interface Sounds(누름)·RPG Sounds(해소) CC0, docs/ASSET_GUIDE.md 참고.
        private const string PressClipPath = "Assets/Art/Audio/Kenney_RPGSounds/chop.ogg";
        private const string ResolveClipPath = "Assets/Art/Audio/Kenney_InterfaceSounds/confirmation_001.ogg";

        /// <summary>44장 "전투 콘텐츠"(2026-09-14) — 포자괴물과 대치했을 때
        /// 뜨는 "밀어내기" 미니게임 UI. BuildDialogueUi()와 같은 패턴(자체
        /// Canvas 하나).</summary>
        private static void BuildHostileEncounterUi()
        {
            var canvasGo = new GameObject("HostileEncounterUI");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            canvasGo.AddComponent<GraphicRaycaster>();

            var pressClip = AssetDatabase.LoadAssetAtPath<AudioClip>(PressClipPath);
            var resolveClip = AssetDatabase.LoadAssetAtPath<AudioClip>(ResolveClipPath);
            if (pressClip == null || resolveClip == null)
            {
                Debug.LogWarning("[BuildTestVillageForestScene] 밀어내기 SFX 클립을 못 찾음 — 소리 없이 동작.");
            }

            var ui = canvasGo.AddComponent<ForestHostileEncounterUi>();
            ui.Build(canvasGo.transform, pressClip, resolveClip);
        }

        /// <summary>화면 왼쪽 위 — 디버그 빌드에서만 렌더러 이름·FPS·좌표
        /// (DebugHud.cs 클래스 주석 참고, GO와 같은 결).</summary>
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
            rect.sizeDelta = new Vector2(600f, 120f);

            var text = textGo.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 22;
            text.alignment = TextAnchor.UpperLeft;
            text.color = new Color(1f, 1f, 1f, 0.8f);
            text.text = "";

            var overlay = canvasGo.AddComponent<DebugHud>();
            SetPrivateField(overlay, "label", text);
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
            text.text = ForestLocalization.T("action.save", "저장");

            var localized = btnGo.AddComponent<LocalizedButtonLabel>();
            localized.Init("action.save", "저장");
        }

        /// <summary>PLAN.md 67~69장 "접근성" — 효과음·진동·UI 크기·그래픽
        /// 품질. "저장" 버튼(-30,-30,160×80) 바로 아래가 GO와 같은 이유로
        /// 이 판에서도 유일하게 빈 오른쪽 위 자리다.</summary>
        private static void BuildSettingsUi()
        {
            var go = new GameObject("ForestSettingsPanel");
            var panel = go.AddComponent<ForestSettingsPanel>();
            panel.Build();
        }

        /// <summary>PLAN.md 101-2 "공통 선행" A·B — 목표판 3줄 + 세션 마무리
        /// 카드(FOREST 세 번째 이식, GO·DUNGEON의 `BuildGoalBoardUi()`와
        /// 완전히 같은 배선). GoalBoard·SessionCard 는 Awake()가 자기 UI를
        /// 다시 짓는 SagaCore 공용 컴포넌트라 [SerializeField] 배선이
        /// 필요 없다 — ForestSessionTracker(이 판 전용, Saga.Forest.UI)
        /// 하나가 IGoalSource 를 구현하면서 SessionCard 표시도 같이 맡는다.
        /// Player가 이미 씬에 있어야 하니 BuildPlayer() 뒤에서만 부른다.</summary>
        private static void BuildGoalBoardUi()
        {
            var cardGo = new GameObject("SessionCard");
            var sessionCard = cardGo.AddComponent<SessionCard>();

            var trackerGo = new GameObject("ForestSessionTracker");
            var tracker = trackerGo.AddComponent<ForestSessionTracker>();
            tracker.Init(sessionCard);

            var boardGo = new GameObject("GoalBoard");
            var board = boardGo.AddComponent<GoalBoard>();
            board.Init(tracker);
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
            var bootstrap = go.AddComponent<ForestBootstrap>();

            // 67장 "사운드" BGM(2026-09-15) — docs/ASSET_GUIDE.md 참고.
            var bgmClip = AssetDatabase.LoadAssetAtPath<AudioClip>("Assets/Art/Audio/CC0_BGM/forest_peaceful_town.ogg");
            if (bgmClip == null) Debug.LogWarning("[BuildTestVillageForestScene] BGM 클립을 못 찾음 — 소리 없이 동작.");
            SetPrivateField(bootstrap, "bgmClip", bgmClip);
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
