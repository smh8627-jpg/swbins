using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using Saga.Story.World;
using Saga.Story.Player;
using Saga.Story.UI;
using Saga.Story.Data;
using Saga.Core;

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

        // 44장 "Player" 교체 — Dungeon/GO/Forest가 이미 쓰는 Maria 재사용
        // (BuildTestVillageScene.cs와 같은 결). STORY도 1.8m 실측 스케일이라
        // Maria 실측 높이(1.83m)와 거의 그대로 맞는다.
        private const string MariaBodyFbxPath = "Assets/Art/CharactersRealistic/Maria WProp J J Ong.fbx";
        private const string MariaControllerPath = "Assets/Animators/Maria.controller";
        private const float MariaNativeHeight = 1.83f;
        private const float PlayerTargetHeight = 1.8f;

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
            BuildLabyrinthRunner();
            BuildNpc();
            BuildJobTrainer();
            BuildDiscovery();
            BuildLabyrinthGate();
            var (playerGo, playerController) = BuildPlayer();
            BuildCamera();
            BuildPostProcessingVolume();
            BuildEventSystem();
            BuildHud();
            BuildDialogueLabel();
            BuildChoiceUi();
            BuildJobChoiceUi();
            BuildLabyrinthUi();
            BuildDebugOverlay();
            BuildSaveButton();
            BuildSettingsUi();
            BuildGoalBoardUi();
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

        /// <summary>PLAN.md 66-2장(파이널 판타지 최신작 기준) 라이팅/무드 —
        /// golden-hour급으로 각도를 낮추고 색을 데워 Bloom(66-2 후처리)이
        /// 반응하게 한다. 차가운 톤 RimLight로 실루엣 강조(66-2장).</summary>
        private static void BuildLighting()
        {
            var sunGo = new GameObject("Light");
            var light = sunGo.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.8f;
            light.color = new Color(1f, 0.87f, 0.68f);
            light.shadows = LightShadows.Soft;
            sunGo.transform.rotation = Quaternion.Euler(30f, -30f, 0f);

            var rimGo = new GameObject("RimLight");
            var rim = rimGo.AddComponent<Light>();
            rim.type = LightType.Directional;
            rim.intensity = 0.5f;
            rim.color = new Color(0.55f, 0.65f, 0.9f);
            rim.shadows = LightShadows.None;
            rimGo.transform.rotation = Quaternion.Euler(15f, 150f, 0f);

            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.5f, 0.55f, 0.6f);
        }

        // 44장 "Environment" 교체 — STORY는 GLB 없이 primitive 박스뿐이라
        // (StoryTerrainBuilder.cs 클래스 주석) Dungeon과 같은 방식(primitive
        // 크기에 맞춘 타일링 PBR 재질)을 그대로 옮길 수 있다. 바닥은 초록
        // 들판(GroundColor #6faf55와 톤이 맞는 leafy_grass), 발판은 나무
        // 색조(PlatColor)와 맞는 dark_wooden_planks — 둘 다 66-2장 ⑥이
        // 받아 두고 "아직 어느 씬에도 안 물렸다"던 후보를 처음 실전 배치.
        private const string StoryGroundMatPath = "Assets/Art/EnvironmentPBR_candidates/leafy_grass_URPLit.mat";
        private const string StoryPlatformMatPath = "Assets/Art/EnvironmentPBR_candidates/dark_wooden_planks_URPLit.mat";

        private static void BuildTerrain()
        {
            var go = new GameObject("Terrain");
            var builder = go.AddComponent<StoryTerrainBuilder>();

            var groundMat = AssetDatabase.LoadAssetAtPath<Material>(StoryGroundMatPath);
            var platformMat = AssetDatabase.LoadAssetAtPath<Material>(StoryPlatformMatPath);
            if (groundMat != null) SetPrivateField(builder, "groundMaterial", groundMat);
            if (platformMat != null) SetPrivateField(builder, "platformMaterial", platformMat);
            if (groundMat == null || platformMat == null)
            {
                Debug.LogWarning("[BuildTestStoryScene] Environment PBR 재질을 못 찾음 — 바닥/발판이 예전 평면색으로 대체됨.");
            }

            builder.Build(); // Awake()는 Play 모드에서만 자동으로 도니 edit-time 저장을 위해 직접 부른다.
        }

        // 44장 "주요 Enemy"/"Boss" 교체 — Dungeon 잡졸/두목과 같은 배역
        // (황건적)이라 Abe/Brute를 그대로 재사용. 실측 높이(Abe 1.94m,
        // Brute 2.34m — TempMeasureAbeBrute로 잰 값, GO BuildTestVillageScene.cs
        // 커밋과 같은 측정)를 이 판의 목표 높이(잡졸 1.6m, 두목
        // 1.6×1.4=2.24m — StoryEnemy.cs 기존 상수)에 맞춰 다시 스케일한다.
        private const string AbeAnimatedPrefabPath = "Assets/Art/CharactersRealistic/Abe/AbeAnimated.prefab";
        private const string BruteAnimatedPrefabPath = "Assets/Art/CharactersRealistic/Brute/BruteAnimated.prefab";
        private const float AbeNativeHeight = 1.94f;
        private const float BruteNativeHeight = 2.34f;
        private const float GruntTargetHeight = 1.6f;
        private const float BossTargetHeight = 1.6f * 1.4f;

        // 2026-09-14 "사운드" — GO/FOREST/REALM과 같은 Kenney CC0 자산
        // 트리(Assets/Art/Audio, 다섯 판 공유 원본) 재사용, 새 다운로드 없음.
        private const string HitClipPath = "Assets/Art/Audio/Kenney_RPGSounds/chop.ogg";
        private const string DeathClipPath = "Assets/Art/Audio/Kenney_InterfaceSounds/confirmation_001.ogg";

        private static void BuildEnemies()
        {
            var go = new GameObject("Enemies");
            var spawner = go.AddComponent<StoryEnemySpawner>();

            var hitClip = AssetDatabase.LoadAssetAtPath<AudioClip>(HitClipPath);
            var deathClip = AssetDatabase.LoadAssetAtPath<AudioClip>(DeathClipPath);
            if (hitClip != null) SetPrivateField(spawner, "hitClip", hitClip);
            if (deathClip != null) SetPrivateField(spawner, "deathClip", deathClip);

            var abe = AssetDatabase.LoadAssetAtPath<GameObject>(AbeAnimatedPrefabPath);
            var brute = AssetDatabase.LoadAssetAtPath<GameObject>(BruteAnimatedPrefabPath);
            if (abe != null)
            {
                SetPrivateField(spawner, "enemyModelPrefab", abe);
                SetPrivateField(spawner, "riggedVisualScale", GruntTargetHeight / AbeNativeHeight);
            }
            else
            {
                Debug.LogWarning($"[BuildTestStoryScene] {AbeAnimatedPrefabPath} 를 못 찾음(로컬 전용 자산) — character-d로 폴백.");
                SetPrivateField(spawner, "enemyModelPrefab", _characterD);
            }
            if (brute != null)
            {
                SetPrivateField(spawner, "bossModelPrefab", brute);
                SetPrivateField(spawner, "riggedBossVisualScale", BossTargetHeight / BruteNativeHeight);
            }
            spawner.Build();
        }

        /// <summary>PLAN.md 101-2 STORY "5-3 비경" 실행기 — 아레나 잡졸/보스도
        /// 필드와 같은 배역(Abe/Brute, 없으면 character-d)을 그대로
        /// 쓴다(BuildEnemies()와 같은 자산, 새 다운로드 없음).</summary>
        private static void BuildLabyrinthRunner()
        {
            var go = new GameObject("StoryLabyrinthRunner");
            var runner = go.AddComponent<StoryLabyrinthRunner>();

            var hitClip = AssetDatabase.LoadAssetAtPath<AudioClip>(HitClipPath);
            var deathClip = AssetDatabase.LoadAssetAtPath<AudioClip>(DeathClipPath);
            if (hitClip != null) SetPrivateField(runner, "hitClip", hitClip);
            if (deathClip != null) SetPrivateField(runner, "deathClip", deathClip);

            var abe = AssetDatabase.LoadAssetAtPath<GameObject>(AbeAnimatedPrefabPath);
            var brute = AssetDatabase.LoadAssetAtPath<GameObject>(BruteAnimatedPrefabPath);
            if (abe != null)
            {
                SetPrivateField(runner, "gruntModelPrefab", abe);
                SetPrivateField(runner, "riggedVisualScale", GruntTargetHeight / AbeNativeHeight);
            }
            else
            {
                SetPrivateField(runner, "gruntModelPrefab", _characterD);
            }
            if (brute != null)
            {
                SetPrivateField(runner, "bossModelPrefab", brute);
                SetPrivateField(runner, "riggedBossVisualScale", BossTargetHeight / BruteNativeHeight);
            }
        }

        /// <summary>PLAN.md 101-2 STORY "5-3 비경" 입구 — 필드가 이미
        /// 빽빽해서(잡졸 열 자리·발판 다섯·NPC 둘) 겹치지 않는 자리가
        /// 없다 — 척후병(0.6m)·플레이어 스폰(2m) 사이에 끼워 넣는다
        /// (다른 트리거와 반경이 겹쳐도 각자 독립으로 반응해 무해하다,
        /// 척후병 자신도 스폰 반경과 겹치는 게 기존 동작이다).</summary>
        private static void BuildLabyrinthGate()
        {
            var gateGo = new GameObject("Gate_Labyrinth");
            gateGo.transform.position = new Vector3(1.4f, 0.1f, 0f);
            gateGo.AddComponent<StoryLabyrinthGate>();
        }

        /// <summary>PLAN.md 101-2 STORY "5-3 비경" — `StoryLabyrinthMapUi.cs`가
        /// 자기 UI를 스스로 짓는 컴포넌트(StoryJobChoiceUi와 같은 결)라
        /// Build() 한 번만 부르면 끝난다.</summary>
        private static void BuildLabyrinthUi()
        {
            var go = new GameObject("StoryLabyrinthMapUI");
            var ui = go.AddComponent<StoryLabyrinthMapUi>();
            ui.Build();
        }

        private const string VillagerModelPath = "Assets/Art/Characters/character-b.glb"; // GO/FOREST 주민 배역과 같은 모델(StoryNpc.cs 클래스 주석 참고).

        /// <summary>PLAN.md 51장 "STORY 확장 — NPC" 첫 슬라이스 — 척후병
        /// 하나만, 잡졸 자리(첫 자리 3m)보다 앞·플레이어 스폰(2m)과 겹치는
        /// 자리에 세운다(StoryNpc.cs 클래스 주석 참고).</summary>
        private static void BuildNpc()
        {
            var npcGo = new GameObject("Npc_Scout");
            npcGo.transform.position = new Vector3(0.6f, 0.1f, 0f);
            var npc = npcGo.AddComponent<StoryNpc>();

            var villagerModel = AssetDatabase.LoadAssetAtPath<GameObject>(VillagerModelPath);
            if (villagerModel != null)
            {
                SetPrivateField(npc, "modelPrefab", villagerModel);
            }
            else
            {
                Debug.LogWarning($"[BuildTestStoryScene] {VillagerModelPath} 를 못 찾음 — 척후병은 primitive capsule로 대체됨.");
            }
        }

        /// <summary>PLAN.md 51장 "STORY 확장 — 전직·SP 투자 UI" —
        /// 척후병(0.6m)·첫 잡졸(3m) 사이가 아니라 그 너머 5m에 세운다(로프
        /// 6.8m·발판과도 안 겹치는 빈 자리, StoryJobTrainer.cs 클래스 주석
        /// 참고). 전직 전엔 Lv.10 미만이라 장식만 보이고 실제 상호작용은
        /// 사냥을 어느 정도 한 뒤에나 의미가 있다.</summary>
        private static void BuildJobTrainer()
        {
            var trainerGo = new GameObject("Npc_JobTrainer");
            trainerGo.transform.position = new Vector3(5f, 0.1f, 0f);
            var trainer = trainerGo.AddComponent<StoryJobTrainer>();

            var villagerModel = AssetDatabase.LoadAssetAtPath<GameObject>(VillagerModelPath);
            if (villagerModel != null)
            {
                SetPrivateField(trainer, "modelPrefab", villagerModel);
            }
            else
            {
                Debug.LogWarning($"[BuildTestStoryScene] {VillagerModelPath} 를 못 찾음 — 전직관은 primitive capsule로 대체됨.");
            }
        }

        /// <summary>PLAN.md 72~73장 World Event / Hidden Area + 51장
        /// "STORY 확장 — 사건" 첫 슬라이스 — 발판 다섯 자리 중 가장 높은
        /// #3(index 3) 위에 세운다(StoryDiscovery.cs 클래스 주석 참고).</summary>
        private static void BuildDiscovery()
        {
            var platform = FieldMapData.Platforms()[3];
            var discoveryGo = new GameObject("Discovery_Lookout");
            discoveryGo.transform.position = new Vector3(platform.X, platform.Height + 0.4f, 0f);
            discoveryGo.AddComponent<StoryDiscovery>();
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

            Animator playerAnimator;
            Transform visual = BuildPlayerVisual(playerGo.transform, out playerAnimator);

            var storyController = playerGo.AddComponent<StoryPlayerController>();
            SetPrivateField(storyController, "visual", visual);
            SetPrivateField(storyController, "animator", playerAnimator);
            playerGo.AddComponent<StoryWeaponVisual>(); // PLAN.md 101-3 G "장비 가시화".

            return (playerGo, storyController);
        }

        /// <summary>Maria(Humanoid, Animator 포함) → 실패 시 character-a →
        /// 실패 시 primitive capsule 순으로 폴백(BuildTestVillageScene.cs와
        /// 같은 결). Speed+Attack 트리거만 쓴다(StoryPlayerController.cs 참고).</summary>
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
                    Debug.LogWarning($"[BuildTestStoryScene] {MariaControllerPath} 를 못 찾음 — Maria 시각화는 되지만 애니메이션이 안 돎.");
                }
                animator.runtimeAnimatorController = controller;

                BuildTestCharacterRealisticScene.ApplySkinSplit(maria);
                return maria.transform;
            }

            Debug.LogWarning($"[BuildTestStoryScene] {MariaBodyFbxPath} 를 못 찾음(로컬 전용 자산, mixamo.com에서 받아야 함) — character-a로 폴백.");
            return _characterA != null
                ? Saga.Story.World.CharacterVisual.Spawn(_characterA, parent, PlayerTargetHeight, Color.white)
                : Saga.Story.World.CharacterVisual.SpawnFallbackCapsule(parent, PlayerTargetHeight, Color.white);
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
            camGo.AddComponent<UnityEngine.Rendering.Universal.UniversalAdditionalCameraData>()
                .renderPostProcessing = true;
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
                Debug.LogWarning("[BuildTestStoryScene] FF16Volume_PC.asset 을 못 찾음 — " +
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
            rect.sizeDelta = new Vector2(600f, 100f); // 두 줄(사명+MP, StoryHud.cs 2026-09-12 확장)

            var text = textGo.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 26;
            text.alignment = TextAnchor.UpperLeft;
            text.color = Color.white;
            text.text = "";

            var hud = canvasGo.AddComponent<StoryHud>();
            SetPrivateField(hud, "label", text);
        }

        /// <summary>PLAN.md 51장 "STORY 확장 — NPC" — DUNGEON `DialogueUI`와
        /// 같은 배치(화면 위쪽 가운데 배너), `StoryHud`(왼쪽 위 상시 표시)와
        /// 안 겹친다.</summary>
        private static void BuildDialogueLabel()
        {
            var canvasGo = new GameObject("StoryDialogueUI");
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

        /// <summary>PLAN.md 51장 "STORY 확장 — 선택" — 두목 처치 직후
        /// 척후병이 묻는 장식적 분기 팝업(StoryChoiceUi.cs 클래스 주석
        /// 참고). GO/DUNGEON `EncounterUiKit`과 달리 이 판에 한 곳뿐이라
        /// 그 kit를 안 쓰고 직접 조립한다.</summary>
        private static void BuildChoiceUi()
        {
            var canvasGo = new GameObject("StoryChoiceUI");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            canvasGo.AddComponent<GraphicRaycaster>();

            var panelGo = new GameObject("Panel", typeof(RectTransform));
            panelGo.transform.SetParent(canvasGo.transform, false);
            var panelRect = (RectTransform)panelGo.transform;
            panelRect.anchorMin = new Vector2(0.5f, 0.5f);
            panelRect.anchorMax = new Vector2(0.5f, 0.5f);
            panelRect.pivot = new Vector2(0.5f, 0.5f);
            panelRect.anchoredPosition = Vector2.zero;
            panelRect.sizeDelta = new Vector2(860f, 460f);
            var panelImg = panelGo.AddComponent<Image>();
            panelImg.color = new Color(0f, 0f, 0f, 0.75f);

            var promptGo = new GameObject("Prompt", typeof(RectTransform));
            promptGo.transform.SetParent(panelGo.transform, false);
            var promptRect = (RectTransform)promptGo.transform;
            promptRect.anchorMin = new Vector2(0.5f, 1f);
            promptRect.anchorMax = new Vector2(0.5f, 1f);
            promptRect.pivot = new Vector2(0.5f, 1f);
            promptRect.anchoredPosition = new Vector2(0f, -30f);
            promptRect.sizeDelta = new Vector2(760f, 200f);
            var promptText = promptGo.AddComponent<Text>();
            promptText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            promptText.fontSize = 32;
            promptText.alignment = TextAnchor.MiddleCenter;
            promptText.color = Color.white;
            promptText.horizontalOverflow = HorizontalWrapMode.Wrap;

            var optionA = BuildChoiceButton(panelGo.transform, new Vector2(0f, -260f), out var optionALabel);
            var optionB = BuildChoiceButton(panelGo.transform, new Vector2(0f, -360f), out var optionBLabel);

            var choiceUi = canvasGo.AddComponent<StoryChoiceUi>();
            SetPrivateField(choiceUi, "panel", panelGo);
            SetPrivateField(choiceUi, "promptLabel", promptText);
            SetPrivateField(choiceUi, "optionAButton", optionA);
            SetPrivateField(choiceUi, "optionALabel", optionALabel);
            SetPrivateField(choiceUi, "optionBButton", optionB);
            SetPrivateField(choiceUi, "optionBLabel", optionBLabel);
            panelGo.SetActive(false);
        }

        /// <summary>PLAN.md 51장 "전직·SP 투자 UI" — `StoryJobChoiceUi.cs`가
        /// 자기 UI를 스스로 짓는 컴포넌트(GoSettingsPanel 등과 같은 결)라
        /// Build() 한 번만 부르면 끝난다.</summary>
        private static void BuildJobChoiceUi()
        {
            var go = new GameObject("StoryJobChoiceUI");
            var ui = go.AddComponent<StoryJobChoiceUi>();
            ui.Build();
        }

        private static Button BuildChoiceButton(Transform parent, Vector2 anchoredPos, out Text label)
        {
            var go = new GameObject("Option", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = new Vector2(0.5f, 1f);
            rect.anchorMax = new Vector2(0.5f, 1f);
            rect.pivot = new Vector2(0.5f, 1f);
            rect.anchoredPosition = anchoredPos;
            rect.sizeDelta = new Vector2(700f, 80f);

            var img = go.AddComponent<Image>();
            img.color = new Color(1f, 1f, 1f, 0.18f);
            var button = go.AddComponent<Button>();
            button.targetGraphic = img;

            var textGo = new GameObject("Text", typeof(RectTransform));
            textGo.transform.SetParent(go.transform, false);
            var textRect = (RectTransform)textGo.transform;
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.offsetMin = Vector2.zero;
            textRect.offsetMax = Vector2.zero;
            label = textGo.AddComponent<Text>();
            label.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            label.fontSize = 26;
            label.alignment = TextAnchor.MiddleCenter;
            label.color = Color.white;

            return button;
        }

        /// <summary>화면 왼쪽 위 — 디버그 빌드에서만 렌더러 이름·FPS·사명·
        /// 좌표(DebugHud.cs 클래스 주석 참고, GO와 같은 결).</summary>
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
            rect.sizeDelta = new Vector2(650f, 140f);

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

        /// <summary>PLAN.md 67~69장 "접근성" — 효과음·진동·UI 크기·그래픽
        /// 품질. "저장" 버튼(-30,-30,160×80) 바로 아래가 GO/FOREST와 같은
        /// 이유로 이 판에서도 유일하게 빈 오른쪽 위 자리다.</summary>
        private static void BuildSettingsUi()
        {
            var go = new GameObject("StorySettingsPanel");
            var panel = go.AddComponent<StorySettingsPanel>();
            panel.Build();
        }

        /// <summary>PLAN.md 101-2 "공통 선행" A·B — 목표판 3줄 + 세션 마무리
        /// 카드(STORY 네 번째 이식, GO·DUNGEON·FOREST의 `BuildGoalBoardUi()`와
        /// 완전히 같은 배선). GoalBoard·SessionCard 는 Awake()가 자기 UI를
        /// 다시 짓는 SagaCore 공용 컴포넌트라 [SerializeField] 배선이
        /// 필요 없다 — StorySessionTracker(이 판 전용, Saga.Story.UI)
        /// 하나가 IGoalSource 를 구현하면서 SessionCard 표시도 같이 맡는다.
        /// Player가 이미 씬에 있어야 하니 BuildPlayer() 뒤에서만 부른다.</summary>
        private static void BuildGoalBoardUi()
        {
            var cardGo = new GameObject("SessionCard");
            var sessionCard = cardGo.AddComponent<SessionCard>();

            var trackerGo = new GameObject("StorySessionTracker");
            var tracker = trackerGo.AddComponent<StorySessionTracker>();
            tracker.Init(sessionCard);

            var boardGo = new GameObject("GoalBoard");
            var board = boardGo.AddComponent<GoalBoard>();
            board.Init(tracker);
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

            BuildActionButton(canvasGo.transform, new Vector2(-100f, 180f), "점프", new Color(0.15f, 0.45f, 0.6f, 0.55f), controller.TriggerJump, "action.jump");
            BuildActionButton(canvasGo.transform, new Vector2(-280f, 180f), "공격", new Color(0.7f, 0.2f, 0.15f, 0.55f), controller.TriggerAttack, "action.attack");

            // 무예 나머지 셋(횡소·기탄·기합, "STORY 콘텐츠 확장" 2026-09-12) —
            // 점프·공격과 같은 오른쪽 아래 모서리, 한 줄 위(y=380)에 둬서
            // 이동 hold 버튼 넷(왼쪽 아래 모서리, x≤320)과 안 겹치게 한다.
            BuildActionButton(canvasGo.transform, new Vector2(-100f, 380f), "기합", new Color(0.75f, 0.55f, 0.1f, 0.55f), controller.TriggerBrace, "action.brace");
            BuildActionButton(canvasGo.transform, new Vector2(-280f, 380f), "기탄", new Color(0.2f, 0.4f, 0.75f, 0.55f), controller.TriggerBolt, "action.bolt");
            BuildActionButton(canvasGo.transform, new Vector2(-460f, 380f), "횡소", new Color(0.4f, 0.6f, 0.25f, 0.55f), controller.TriggerSweep, "action.sweep");

            // PLAN.md 101-2 5-8 "동료 교대"(2026-09-21) — 무예 셋(y=380) 위
            // 한 줄(y=580)에 역할 셋. 웹판 "버튼 1개(초상 탭)" 대신 이 트랙엔
            // 초상이 없어 역할마다 버튼을 두는 쪽으로 재해석(더 명확하다).
            BuildActionButton(canvasGo.transform, new Vector2(-100f, 580f), "호법", new Color(0.55f, 0.35f, 0.65f, 0.55f), () => controller.TriggerPartySwap(2), "action.party_guardian");
            BuildActionButton(canvasGo.transform, new Vector2(-280f, 580f), "유격", new Color(0.35f, 0.55f, 0.6f, 0.55f), () => controller.TriggerPartySwap(1), "action.party_skirmisher");
            BuildActionButton(canvasGo.transform, new Vector2(-460f, 580f), "선봉", new Color(0.65f, 0.35f, 0.35f, 0.55f), () => controller.TriggerPartySwap(0), "action.party_vanguard");
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

        private static void BuildActionButton(Transform parent, Vector2 offset, string label, Color color, UnityEngine.Events.UnityAction onClick, string locKey)
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
            text.text = StoryLocalization.T(locKey, label);

            var localized = go.AddComponent<LocalizedButtonLabel>();
            localized.Init(locKey, label);
        }

        private static void BuildBootstrap()
        {
            var go = new GameObject("GameBootstrap");
            var bootstrap = go.AddComponent<GameBootstrap>();

            // 67장 "사운드" BGM(2026-09-15) — docs/ASSET_GUIDE.md 참고.
            var bgmClip = AssetDatabase.LoadAssetAtPath<AudioClip>("Assets/Art/Audio/CC0_BGM/story_fight_run_breath_deeply.mp3");
            if (bgmClip == null) Debug.LogWarning("[BuildTestStoryScene] BGM 클립을 못 찾음 — 소리 없이 동작.");
            SetPrivateField(bootstrap, "bgmClip", bgmClip);
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
