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

        // "몬스터 무리" 슬라이스 — saga-dungeon 웹판 js/dungeon.js:333
        // makeRoom('fight', ...)의 floor=1 공식 min(12, 4 + rand(0~3))의
        // 최소값 4마리를 무작위 롤 없이 결정적으로 씀(DungeonEnemy.cs
        // 주석 참고). 방(20m×14m, 벽 두께 1m) 안쪽에서 서로 안 겹치게
        // 플레이어 스폰(-6,0,0) 반대편에 부채꼴로 흩어 둔다.
        private static readonly Vector3[] EnemySpawns =
        {
            new Vector3(5f, 0f, 0f),
            new Vector3(6.5f, 0f, 3.5f),
            new Vector3(6.5f, 0f, -3.5f),
            new Vector3(3f, 0f, 5f),
        };

        // "엘리트/보스" 슬라이스 — saga-dungeon 웹판 makeRoom('boss', ...)
        // (dungeon.js:327-330)와 같은 구성, floor=1 기준 부하 수 공식
        // min(6, 2 + floor(1/5)) = 2명. 잡졸 무리보다 더 안쪽(동쪽 벽
        // 가까이)에 둬 방을 가로질러야 만나는 "정점" 자리로 삼는다.
        private static readonly Vector3 BossSpawn = new Vector3(9f, 0f, 0f);
        private static readonly Vector3[] BossEscortSpawns =
        {
            new Vector3(8f, 0f, 2.5f),
            new Vector3(8f, 0f, -2.5f),
        };

        // "방 종류 다양화" 슬라이스 — saga-dungeon 웹판 room.well/chest/shrine
        // (dungeon.js:336-341)을 한 방 안에 같이 두는 걸로 옮겼다(웹판은
        // 각각 다른 kind의 방인데, 이 슬라이스는 방이 하나뿐). 몬스터 무리
        // (동쪽, x=3~9)와 안 겹치게 플레이어 스폰(-6,0,0) 주변 서쪽에 흩어
        // 둔다.
        private static readonly Vector3 WellSpawn = new Vector3(-2f, 0f, 5f);
        private static readonly Vector3 TroveSpawn = new Vector3(-2f, 0f, -5f);
        private static readonly Vector3 ShrineSpawn = new Vector3(-8f, 0f, -4f);

        // "오픈월드/필드" 슬라이스 — 방 하나짜리 구조를 벗어나는 첫 조각.
        // Room(방1)의 북쪽 벽에 문(3m)을 뚫고 복도(길이 8m)로 Room2와
        // 잇는다. 좌표 산출: Room1 북쪽 벽 바깥면 z = halfD(7)+두께(1) = 8,
        // 복도 길이 8 → Room2 남쪽 벽 바깥면 z = 8+8 = 16, Room2 중심
        // z = 16+halfD(7)+두께(1) = 24. 복도 중심 z = (8+16)/2 = 12.
        private const float DoorWidth = 3f; // DungeonCorridorBuilder.DoorWidth와 같은 값
        private static readonly Vector3 CorridorCenter = new Vector3(0f, 0f, 12f);
        private static readonly Vector3 Room2Center = new Vector3(0f, 0f, 24f);

        // Room2 "필드" 콘텐츠 — 잡졸 둘(기본값 그대로, 다음 구역에도
        // 몬스터가 있다는 걸 보여주는 최소 단위). 좌표는 Room2Center 기준
        // 로컬 오프셋을 world로 변환해 둠(월드 좌표를 직접 씀).
        private static readonly Vector3[] FieldEnemySpawns =
        {
            Room2Center + new Vector3(0f, 0f, 2f),
            Room2Center + new Vector3(-4f, 0f, -2f),
        };

        [MenuItem("Saga/Build TestDungeon Scene")]
        public static void Build()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            BuildLighting();
            var roomGo = BuildRoom();
            BuildEnemy();
            BuildRoomPois();
            BuildCorridorAndRoom2();
            var (playerGo, playerCombat, playerController) = BuildPlayer();
            BuildAlly();
            BuildEventSystem();
            BuildDialogueUi();
            BuildPlayerHud();
            BuildSaveButton();
            BuildAttackButton(playerCombat);
            BuildHeavyAttackButton(playerCombat);
            BuildDodgeButton(playerController);
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
            builder.OpenNorthDoor(DoorWidth); // "오픈월드/필드" 슬라이스 — 복도로 Room2와 잇는다.
            return go;
        }

        /// <summary>"오픈월드/필드" 슬라이스 — Room(방1)의 북쪽 문에서
        /// 복도를 지나 Room2(잡졸 둘)로 이어진다. 자세한 좌표 산출은 위
        /// `CorridorCenter`/`Room2Center` 주석 참고.</summary>
        private static void BuildCorridorAndRoom2()
        {
            var corridorGo = new GameObject("Corridor");
            corridorGo.transform.position = CorridorCenter;
            corridorGo.AddComponent<DungeonCorridorBuilder>().Build();

            var room2Go = new GameObject("Room2");
            room2Go.transform.position = Room2Center;
            var room2Builder = room2Go.AddComponent<DungeonRoomBuilder>();
            room2Builder.Build();
            room2Builder.OpenSouthDoor(DoorWidth);

            for (int i = 0; i < FieldEnemySpawns.Length; i++)
            {
                var go = new GameObject($"Enemy_HwangGeon_Field_{i + 1}");
                go.transform.position = FieldEnemySpawns[i];
                var enemy = go.AddComponent<DungeonEnemy>();
                SetPrivateField(enemy, "roomId", "room2"); // "방 종류 나머지" — Room2 행상이 이 방만 보고 클리어를 판정.
            }

            BuildMerchant();
        }

        /// <summary>"방 종류 나머지" 슬라이스 — Room2 잡졸 둘을 다 잡아야
        /// 여는 행상 좌판. 웹판 room.merchant를 GO ShopState.cs 방식으로
        /// 단순화(DungeonMerchant.cs 참고).</summary>
        private static void BuildMerchant()
        {
            var merchantGo = new GameObject("Merchant");
            merchantGo.transform.position = Room2Center + new Vector3(3f, 0f, -3f);
            var merchant = merchantGo.AddComponent<DungeonMerchant>();
            SetPrivateField(merchant, "roomId", "room2");
        }

        private static void BuildEnemy()
        {
            for (int i = 0; i < EnemySpawns.Length; i++)
            {
                var go = new GameObject($"Enemy_HwangGeon_{i + 1}");
                go.transform.position = EnemySpawns[i];
                go.AddComponent<DungeonEnemy>();
            }

            BuildBoss();
        }

        /// <summary>두목 하나 + 부하 둘 — 잡졸과 같은 `DungeonEnemy`
        /// 컴포넌트를 재사용하되(다음 슬라이스 코멘트 참고, 값이 다른
        /// 인스턴스라 [SerializeField]로 받는다) 두목만 스탯을 덮어쓴다.
        /// 부하 둘은 잡졸 기본값 그대로(웹판 boss room도 부하는 일반
        /// spawnEnemy).</summary>
        private static void BuildBoss()
        {
            var bossGo = new GameObject("Enemy_HwangGeon_Boss");
            bossGo.transform.position = BossSpawn;
            var boss = bossGo.AddComponent<DungeonEnemy>();
            SetPrivateField(boss, "hp", 168f);            // enemyHp(1, boss=true) = round(24*7)
            SetPrivateField(boss, "dmg", 11f);             // enemyDmg(1, boss=true) = round(5*2.2)
            SetPrivateField(boss, "rewardExp", 100);       // 잡졸(20)의 5배 — dungeon.js dropGold의 boss 배율(5) 재사용
            SetPrivateField(boss, "rewardGold", 40);       // 잡졸(8)의 5배, 같은 이유
            SetPrivateField(boss, "rewardItemId", "wp_glaive");
            SetPrivateField(boss, "isBoss", true);
            SetPrivateField(boss, "displayName", "황건적 두목");
            SetPrivateField(boss, "bodyColor", new Color(0.45f, 0.08f, 0.08f)); // 짙은 적갈 — 잡졸의 누런 두건과 구분
            SetPrivateField(boss, "visualScale", 1.6f);

            for (int i = 0; i < BossEscortSpawns.Length; i++)
            {
                var go = new GameObject($"Enemy_HwangGeon_Escort_{i + 1}");
                go.transform.position = BossEscortSpawns[i];
                go.AddComponent<DungeonEnemy>();
            }
        }

        private static void BuildRoomPois()
        {
            var wellGo = new GameObject("Well");
            wellGo.transform.position = WellSpawn;
            wellGo.AddComponent<DungeonWell>();

            var troveGo = new GameObject("Trove");
            troveGo.transform.position = TroveSpawn;
            troveGo.AddComponent<DungeonTrove>();

            var shrineGo = new GameObject("Shrine");
            shrineGo.transform.position = ShrineSpawn;
            shrineGo.AddComponent<DungeonShrine>();
        }

        private static (GameObject playerGo, PlayerCombat combat, PlayerController controller) BuildPlayer()
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

            return (playerGo, combat, pc);
        }

        /// <summary>"부대(다중 영웅) 시스템" 슬라이스 — 등용 없이 처음부터
        /// 함께 있는 동행 하나(`AllyFighter.cs` 참고). 플레이어 스폰
        /// 바로 옆에 둔다.</summary>
        private static void BuildAlly()
        {
            var go = new GameObject("Ally");
            go.transform.position = PlayerSpawn + new Vector3(1.5f, 0f, 0f);
            go.AddComponent<AllyFighter>();
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

        /// <summary>"스킬 다양화" 슬라이스 — 공격 버튼 바로 위(20px 간격),
        /// 데스크톱은 Left Alt로도 된다(PlayerCombat.TryHeavyAttack() 참고).</summary>
        private static void BuildHeavyAttackButton(PlayerCombat combat)
        {
            var canvasGo = new GameObject("HeavyAttackUI");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            canvasGo.AddComponent<GraphicRaycaster>();

            var btnGo = new GameObject("HeavyAttackButton", typeof(RectTransform));
            btnGo.transform.SetParent(canvasGo.transform, false);
            var rect = (RectTransform)btnGo.transform;
            rect.anchorMin = new Vector2(1f, 0f);
            rect.anchorMax = new Vector2(1f, 0f);
            rect.pivot = new Vector2(1f, 0f);
            rect.anchoredPosition = new Vector2(-100f, 360f); // AttackButton(y=180, 높이160) 바로 위, 20px 간격
            rect.sizeDelta = new Vector2(130f, 130f);

            var img = btnGo.AddComponent<Image>();
            img.color = new Color(0.75f, 0.4f, 0.05f, 0.55f);
            var button = btnGo.AddComponent<Button>();
            button.targetGraphic = img;
            button.onClick.AddListener(combat.TriggerHeavyAttack);

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
            text.text = "강공격";
        }

        /// <summary>"회피" 슬라이스 — 공격 버튼 왼쪽(20px 간격), 데스크톱은
        /// Left Ctrl로도 된다(PlayerController.TryDodge() 참고).</summary>
        private static void BuildDodgeButton(PlayerController controller)
        {
            var canvasGo = new GameObject("DodgeUI");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            canvasGo.AddComponent<GraphicRaycaster>();

            var btnGo = new GameObject("DodgeButton", typeof(RectTransform));
            btnGo.transform.SetParent(canvasGo.transform, false);
            var rect = (RectTransform)btnGo.transform;
            rect.anchorMin = new Vector2(1f, 0f);
            rect.anchorMax = new Vector2(1f, 0f);
            rect.pivot = new Vector2(1f, 0f);
            rect.anchoredPosition = new Vector2(-280f, 180f); // AttackButton(-100, 폭160)의 왼쪽, 20px 간격
            rect.sizeDelta = new Vector2(130f, 130f);

            var img = btnGo.AddComponent<Image>();
            img.color = new Color(0.15f, 0.45f, 0.6f, 0.55f);
            var button = btnGo.AddComponent<Button>();
            button.targetGraphic = img;
            button.onClick.AddListener(controller.TryDodge);

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
            text.text = "회피";
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
