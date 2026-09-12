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
    /// `BuildTestVillageScene.cs`(GO)와 같은 결 — 캐릭터는 2026-09-12
    /// "GLB 자산 도입" 슬라이스로 SagaGo의 Kenney Blocky Characters를
    /// 재사용하게 됐지만, Sky/Fog·NPC·조이스틱 세부는 여전히 이번
    /// 슬라이스 범위 밖(문서의 "제외" 참고). 멱등 — 다시 실행하면 씬을
    /// 통째로 새로 짠다.
    /// </summary>
    public static class BuildTestDungeonScene
    {
        private const string ScenePath = "Assets/Scenes/TestDungeon.unity";
        private const string InputActionsPath = "Assets/InputSystem_Actions.inputactions";

        // "GLB 자산 도입" 슬라이스 — SagaGo가 이미 쓰는 Kenney Blocky
        // Characters를 그대로 재사용(CharacterVisual.cs 주석 참고). 배역
        // 배정: a=플레이어(무색), b=동행(청색), c=두목(적갈), d=잡졸(황건).
        private const string CharacterAPath = "Assets/Art/Characters/character-a.glb";
        private const string CharacterBPath = "Assets/Art/Characters/character-b.glb";
        private const string CharacterCPath = "Assets/Art/Characters/character-c.glb";
        private const string CharacterDPath = "Assets/Art/Characters/character-d.glb";

        // "환경/건물 GLB" 슬라이스 — SagaGo가 이미 쓰는 CC0 Kenney Modular
        // Cave Kit(gate-rock.glb와 같은 킷)에서 문·복도 타일만 마저 뽑아
        // saga-godot의 assets/dungeon/에서 그대로 복사(새 다운로드 없음).
        // "방 셸 GLB" 슬라이스(뒤이음)가 room-small.glb(방 셸)도 마저
        // 받아 왔다 — DungeonRoomBuilder.cs 클래스 주석 참고(비균등
        // 스케일 문제를 "방을 셸 원본 정사각 비율에 맞추는 균일 스케일"
        // 로 풀었다).
        private const string CorridorGlbPath = "Assets/Art/Dungeon/corridor.glb";
        private const string GateGlbPath = "Assets/Art/Dungeon/gate.glb";
        private const string RoomGlbPath = "Assets/Art/Dungeon/room-small.glb";

        private static readonly Vector3 PlayerSpawn = new Vector3(-6f, 0.1f, 0f);

        // "몬스터 무리" 슬라이스 — saga-dungeon 웹판 js/dungeon.js:333
        // makeRoom('fight', ...)의 floor=1 공식 min(12, 4 + rand(0~3))의
        // 최소값 4마리를 무작위 롤 없이 결정적으로 씀(DungeonEnemy.cs
        // 주석 참고). 방(가로 20m, 벽 두께 1m — 세로는 "방 셸 GLB"
        // 슬라이스로 14→20m, 아래 참고) 안쪽에서 서로 안 겹치게
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
        // Room(방1)의 북쪽 벽에 문을 뚫고 복도(길이 8m)로 Room2와 잇는다.
        //
        // "방 셸 GLB" 슬라이스(뒤이음) — room-small.glb(정사각 12×12)를
        // 왜곡 없이 쓰려고 `DungeonRoomBuilder.RoomDepth`를 14→20으로
        // 올렸다(그 파일 클래스 주석 참고) — halfD가 7→10으로 바뀌어
        // 아래 산출식도 전부 다시 잡음. 문 폭도 셸의 배율(RoomScale)을
        // 그대로 따라 gate.glb(4.4)×5/3 ≈ 7.33으로 넓어졌다(예전 3m는
        // 셸이 없던 시절 임의로 잡은 값 — 이제 셸의 실제 문 구멍 폭을
        // 따라야 어긋나지 않는다, DungeonRoomBuilder.cs 클래스 주석의
        // "확인 안 됨" 가정 참고). 좌표 산출: Room1 북쪽 벽 바깥면
        // z = halfD(10)+두께(1) = 11, 복도 길이 8(안 바뀜 — 복도는
        // room-small.glb가 아니라 corridor.glb 몫, DungeonCorridorBuilder
        // .cs 참고) → Room2 남쪽 벽 바깥면 z = 11+8 = 19, Room2 중심
        // z = 19+halfD(10)+두께(1) = 30. 복도 중심 z = (11+19)/2 = 15.
        private static readonly float RoomDoorWidth =
            DungeonRoomBuilder.GateModelWidth * DungeonRoomBuilder.RoomScale; // ≈7.33 — 방 셸 배율을 그대로 따름
        private static readonly Vector3 CorridorCenter = new Vector3(0f, 0f, 15f);
        private static readonly Vector3 Room2Center = new Vector3(0f, 0f, 30f);

        // Room2 "필드" 콘텐츠 — 잡졸 둘(기본값 그대로, 다음 구역에도
        // 몬스터가 있다는 걸 보여주는 최소 단위). 좌표는 Room2Center 기준
        // 로컬 오프셋을 world로 변환해 둠(월드 좌표를 직접 씀).
        private static readonly Vector3[] FieldEnemySpawns =
        {
            Room2Center + new Vector3(0f, 0f, 2f),
            Room2Center + new Vector3(-4f, 0f, -2f),
        };

        // "방 종류 마지막" 슬라이스 — Room2 북쪽에 복도로 Room3(정예 소굴+
        // 미니보스+채광방)을, 그 북쪽에 다시 복도로 Room4(구출+퍼즐+
        // 채집)를 잇는다. "방 셸 GLB" 슬라이스로 halfD가 7→10이 돼(위
        // 주석 참고) 산출식을 다시 잡음(방 halfD=10, 벽 두께=1, 복도
        // 길이=8은 안 바뀜): Room2 북쪽 벽 바깥면 z=30+10+1=41 →
        // 복도2 중심 z=41+4=45 → Room3 남쪽 벽 바깥면 z=41+8=49 →
        // Room3 중심 z=49+10+1=60 → Room3 북쪽 벽 바깥면 z=60+10+1=71 →
        // 복도3 중심 z=71+4=75 → Room4 남쪽 벽 바깥면 z=71+8=79 →
        // Room4 중심 z=79+10+1=90.
        private static readonly Vector3 Corridor2Center = new Vector3(0f, 0f, 45f);
        private static readonly Vector3 Room3Center = new Vector3(0f, 0f, 60f);
        private static readonly Vector3 Corridor3Center = new Vector3(0f, 0f, 75f);
        private static readonly Vector3 Room4Center = new Vector3(0f, 0f, 90f);

        // Room3 "정예 소굴"(js/dungeon.js:342-347) — 정예 하나(forceElite,
        // ELITES 표의 'fierce' 배율 hp×1.35·dmg×1.9를 그대로 적용,
        // 세공·희귀도 절차 표는 범위 밖이라 고정 한 종만 씀) + 잡졸 둘.
        private static readonly Vector3 EliteSpawn = Room3Center + new Vector3(6f, 0f, 0f);
        private static readonly Vector3[] EliteEscortSpawns =
        {
            Room3Center + new Vector3(5f, 0f, 2.5f),
            Room3Center + new Vector3(5f, 0f, -2.5f),
        };

        // Room3 "미니보스"(js/dungeon.js:348-352) — 부하 없이 혼자, 보스와
        // 같은 노획 흐름(`isBoss=true`)을 그대로 재사용(웹판도 `kill()`이
        // `e.boss`만 보고 이미 보스급 노획을 준다 — 미니보스도 같은 흐름).
        private static readonly Vector3 MinibossSpawn = Room3Center + new Vector3(9f, 0f, 0f);

        // Room3 "채광방"(js/dungeon.js:353-358, `DungeonVein.cs`) — 정예
        // 소굴·미니보스(동쪽)와 안 겹치게 서쪽에.
        private static readonly Vector3 VeinSpawn = Room3Center + new Vector3(-6f, 0f, -4f);

        // Room4 "이벤트방(구출)"(js/dungeon.js:383-393, `DungeonCaptive.cs`) —
        // 지키는 잡졸 둘을 다 잡아야 풀려난다. 동쪽에.
        private static readonly Vector3 CaptiveSpawn = Room4Center + new Vector3(6f, 0f, 0f);
        private static readonly Vector3[] CaptiveGuardSpawns =
        {
            Room4Center + new Vector3(5f, 0f, 2.5f),
            Room4Center + new Vector3(5f, 0f, -2.5f),
        };

        // Room4 "퍼즐방"(js/dungeon.js:366-382, `DungeonPuzzle.cs`) — 서쪽,
        // 구출 자리와 안 겹치게.
        private static readonly Vector3 PuzzleAnchor = Room4Center + new Vector3(-5f, 0f, 0f);

        // Room4 "채집·낚시방"(js/dungeon.js:394-412, `DungeonForage.cs`) —
        // 북쪽(플레이어 진입 방향인 남쪽 문과 안 겹치게). 내부 오프셋(herb
        // z=+3~+3.5)을 더하면 최대 z=2+3.5=5.5로 북쪽 벽(z=10, "방 셸
        // GLB" 슬라이스로 7→10)에서 4.5m 여유를 둔다.
        private static readonly Vector3 ForageAnchor = Room4Center + new Vector3(-2f, 0f, 2f);

        // Build() 시작에 한 번만 로드해 각 Build* 메서드가 나눠 쓴다.
        private static GameObject _characterA, _characterB, _characterC, _characterD;
        private static GameObject _corridorGlb, _gateGlb, _roomGlb;

        [MenuItem("Saga/Build TestDungeon Scene")]
        public static void Build()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            LoadCharacterModels();
            LoadDungeonModels();
            BuildLighting();
            var roomGo = BuildRoom();
            BuildEnemy();
            BuildRoomPois();
            BuildCorridorAndRoom2();
            BuildCorridorAndRoom3();
            BuildCorridorAndRoom4();
            var (playerGo, playerCombat, playerController) = BuildPlayer();
            BuildAlly();
            BuildEventSystem();
            BuildDialogueUi();
            BuildPlayerHud();
            BuildMinimap();
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

        private static void LoadCharacterModels()
        {
            _characterA = AssetDatabase.LoadAssetAtPath<GameObject>(CharacterAPath);
            _characterB = AssetDatabase.LoadAssetAtPath<GameObject>(CharacterBPath);
            _characterC = AssetDatabase.LoadAssetAtPath<GameObject>(CharacterCPath);
            _characterD = AssetDatabase.LoadAssetAtPath<GameObject>(CharacterDPath);
            if (_characterA == null || _characterB == null || _characterC == null || _characterD == null)
            {
                Debug.LogWarning("[BuildTestDungeonScene] character-{a,b,c,d}.glb 중 일부를 못 찾음 — primitive capsule로 대체됨(CharacterVisual.cs 폴백).");
            }
        }

        private static void LoadDungeonModels()
        {
            _corridorGlb = AssetDatabase.LoadAssetAtPath<GameObject>(CorridorGlbPath);
            _gateGlb = AssetDatabase.LoadAssetAtPath<GameObject>(GateGlbPath);
            _roomGlb = AssetDatabase.LoadAssetAtPath<GameObject>(RoomGlbPath);
            if (_corridorGlb == null || _gateGlb == null || _roomGlb == null)
            {
                Debug.LogWarning("[BuildTestDungeonScene] corridor.glb/gate.glb/room-small.glb 중 일부를 못 찾음 — primitive 색상으로 대체됨.");
            }
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
            // "바이옴 5종" — 황건적 소굴은 웹판 THEME_BIAS의 '산채(山寨)'
            // (forest 1.8 가중치)와 같은 결이라 숲으로 잡음. 우물(-2,5)·
            // 상자(-2,-5)·성소(-8,-4)·잡졸·두목과 안 겹치는 NW 빈 구석.
            SetPrivateField(builder, "biome", SagaBiome.Forest);
            SetPrivateField(builder, "decorOffset", new Vector3(-8f, 0f, 5f));
            SetPrivateField(builder, "gateModel", _gateGlb); // "환경/건물 GLB"
            SetPrivateField(builder, "roomModel", _roomGlb); // "방 셸 GLB"
            builder.Build();
            builder.OpenNorthDoor(RoomDoorWidth); // "오픈월드/필드" 슬라이스 — 복도로 Room2와 잇는다.
            return go;
        }

        /// <summary>"오픈월드/필드" 슬라이스 — Room(방1)의 북쪽 문에서
        /// 복도를 지나 Room2(잡졸 둘)로 이어진다. 자세한 좌표 산출은 위
        /// `CorridorCenter`/`Room2Center` 주석 참고.</summary>
        private static void BuildCorridorAndRoom2()
        {
            var corridorGo = new GameObject("Corridor");
            corridorGo.transform.position = CorridorCenter;
            var corridorBuilder = corridorGo.AddComponent<DungeonCorridorBuilder>();
            SetPrivateField(corridorBuilder, "biome", SagaBiome.Ruins); // "바이옴 5종" — 복도 셋은 전부 폐허
            SetPrivateField(corridorBuilder, "corridorModel", _corridorGlb); // "환경/건물 GLB"
            corridorBuilder.Build();

            var room2Go = new GameObject("Room2");
            room2Go.transform.position = Room2Center;
            var room2Builder = room2Go.AddComponent<DungeonRoomBuilder>();
            // "바이옴 5종" — 오픈월드/필드 방은 늪으로 잡음(필드 잡졸(0,2)·
            // (-4,-2)·행상(3,-3)과 안 겹치는 NE 빈 구석).
            SetPrivateField(room2Builder, "biome", SagaBiome.Swamp);
            SetPrivateField(room2Builder, "decorOffset", new Vector3(7f, 0f, 5f));
            SetPrivateField(room2Builder, "gateModel", _gateGlb); // "환경/건물 GLB"
            SetPrivateField(room2Builder, "roomModel", _roomGlb); // "방 셸 GLB"
            room2Builder.Build();
            room2Builder.OpenSouthDoor(RoomDoorWidth);
            room2Builder.OpenNorthDoor(RoomDoorWidth); // "방 종류 마지막" — 복도2로 Room3와 잇는다.

            for (int i = 0; i < FieldEnemySpawns.Length; i++)
            {
                var go = new GameObject($"Enemy_HwangGeon_Field_{i + 1}");
                go.transform.position = FieldEnemySpawns[i];
                var enemy = go.AddComponent<DungeonEnemy>();
                SetPrivateField(enemy, "roomId", "room2"); // "방 종류 나머지" — Room2 행상이 이 방만 보고 클리어를 판정.
                SetPrivateField(enemy, "modelPrefab", _characterD);
            }

            BuildMerchant();
            BuildAmbush();
        }

        /// <summary>"랜덤 이벤트" 슬라이스 — 필드 사건 자리(DungeonAmbush.cs).
        /// 기존 콘텐츠(필드 잡졸(0,2)·(-4,-2), 행상(3,-3), 늪 소품(7,5))와
        /// 안 겹치는 NW 빈 구석.</summary>
        private static void BuildAmbush()
        {
            var go = new GameObject("Ambush");
            go.transform.position = Room2Center + new Vector3(-6f, 0f, 6f);
            var ambush = go.AddComponent<DungeonAmbush>();
            SetPrivateField(ambush, "roomId", "room2");
            SetPrivateField(ambush, "enemyModelPrefab", _characterD);
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

        /// <summary>"방 종류 마지막" 슬라이스 — Room2 북쪽에서 복도2를 지나
        /// Room3(정예 소굴+미니보스+채광방)로 이어진다.</summary>
        private static void BuildCorridorAndRoom3()
        {
            var corridor2Go = new GameObject("Corridor2");
            corridor2Go.transform.position = Corridor2Center;
            var corridor2Builder = corridor2Go.AddComponent<DungeonCorridorBuilder>();
            SetPrivateField(corridor2Builder, "biome", SagaBiome.Ruins);
            SetPrivateField(corridor2Builder, "corridorModel", _corridorGlb); // "환경/건물 GLB"
            corridor2Builder.Build();

            var room3Go = new GameObject("Room3");
            room3Go.transform.position = Room3Center;
            var room3Builder = room3Go.AddComponent<DungeonRoomBuilder>();
            // "바이옴 5종" — 정예·미니보스·채광방(광산)이 있는 방은 산으로
            // 잡음. 정예(6,0)·호위(5,±2.5)·미니보스(9,0)·광맥(-6,-4)·
            // 신규 행상(-8,4)과 안 겹치는 남쪽 빈 자리(문 폭 밖 x=3).
            SetPrivateField(room3Builder, "biome", SagaBiome.Mountain);
            SetPrivateField(room3Builder, "decorOffset", new Vector3(3f, 0f, -6f));
            SetPrivateField(room3Builder, "gateModel", _gateGlb); // "환경/건물 GLB"
            SetPrivateField(room3Builder, "roomModel", _roomGlb); // "방 셸 GLB"
            room3Builder.Build();
            room3Builder.OpenSouthDoor(RoomDoorWidth);
            room3Builder.OpenNorthDoor(RoomDoorWidth); // 복도3으로 Room4와 잇는다.

            BuildElite();
            BuildMiniboss();

            var veinGo = new GameObject("Vein");
            veinGo.transform.position = VeinSpawn;
            var vein = veinGo.AddComponent<DungeonVein>();
            SetPrivateField(vein, "roomId", "room3");

            BuildGemMerchant();
        }

        /// <summary>"세공·행상 재고 굴리기·도감" 슬라이스 — Room2 행상(무기)과
        /// 재고를 다르게 배정한 두 번째 행상. 정예·미니보스·채광방과 안
        /// 겹치는 서쪽 빈 자리(EliteSpawn·MinibossSpawn은 동쪽 +X,
        /// VeinSpawn은 -6,-4)에 둔다.</summary>
        private static void BuildGemMerchant()
        {
            var merchantGo = new GameObject("GemMerchant");
            merchantGo.transform.position = Room3Center + new Vector3(-8f, 0f, 4f);
            var merchant = merchantGo.AddComponent<DungeonMerchant>();
            SetPrivateField(merchant, "roomId", "room3");
            SetPrivateField(merchant, "sellGemId", "gem_sapphire");
            SetPrivateField(merchant, "price", 50); // wp_saber(45)보다 비싸게 — 무기를 대체하지 않고 그 위에 더해지는 능력치라서
        }

        /// <summary>정예 소굴(js/dungeon.js:342-347) — 정예 하나(ELITES
        /// 'fierce' 배율 hp×1.35·dmg×1.9 고정 적용) + 잡졸 둘.</summary>
        private static void BuildElite()
        {
            var eliteGo = new GameObject("Enemy_HwangGeon_Elite");
            eliteGo.transform.position = EliteSpawn;
            var elite = eliteGo.AddComponent<DungeonEnemy>();
            SetPrivateField(elite, "roomId", "room3");
            SetPrivateField(elite, "hp", 32f);   // round(24 * 1.35)
            SetPrivateField(elite, "dmg", 10f);  // round(5 * 1.9)
            SetPrivateField(elite, "rewardExp", 30);
            SetPrivateField(elite, "rewardGold", 16);
            SetPrivateField(elite, "rewardItemId", "wp_saber");
            SetPrivateField(elite, "displayName", "사나운 황건적");
            SetPrivateField(elite, "bodyColor", new Color(0.88f, 0.4f, 0.4f)); // ELITES 'fierce' 색(#e06565)
            SetPrivateField(elite, "visualScale", 1.15f);
            SetPrivateField(elite, "modelPrefab", _characterD);

            for (int i = 0; i < EliteEscortSpawns.Length; i++)
            {
                var go = new GameObject($"Enemy_HwangGeon_EliteEscort_{i + 1}");
                go.transform.position = EliteEscortSpawns[i];
                var escort = go.AddComponent<DungeonEnemy>();
                SetPrivateField(escort, "roomId", "room3");
                SetPrivateField(escort, "modelPrefab", _characterD);
            }
        }

        /// <summary>미니보스(js/dungeon.js:348-352) — 부하 없이 혼자,
        /// 두목과 같은 노획 흐름(`isBoss=true`)을 재사용하되 덩치·색으로만
        /// 구분(두목=3.2m 짙은 적갈, 미니보스=2.6m 자보라).</summary>
        private static void BuildMiniboss()
        {
            var go = new GameObject("Enemy_HwangGeon_Miniboss");
            go.transform.position = MinibossSpawn;
            var miniboss = go.AddComponent<DungeonEnemy>();
            SetPrivateField(miniboss, "roomId", "room3");
            SetPrivateField(miniboss, "hp", 168f);
            SetPrivateField(miniboss, "dmg", 11f);
            SetPrivateField(miniboss, "rewardExp", 100);
            SetPrivateField(miniboss, "rewardGold", 40);
            SetPrivateField(miniboss, "rewardItemId", "wp_glaive");
            SetPrivateField(miniboss, "rewardGemId", "gem_ruby"); // "세공·행상 재고 굴리기·도감" 슬라이스 — GemData.cs 참고
            SetPrivateField(miniboss, "isBoss", true);
            SetPrivateField(miniboss, "displayName", "황건 살수");
            // 사람이 실기로 "두목보다 안 세 보인다"고 제보(2026-09-12) — 웹판
            // spawnEnemy(floor, true) 공식이 두목과 완전히 같은 HP/공격력이라
            // 수치는 그대로 두되(웹판 기준 원래 동급), 진행상 더 나중(Room3)에
            // 만나는 개체가 더 작고 색도 옅어 약해 보였다. 두목(1.6배·3.2m)보다
            // **더 크게(1.8배·3.6m)**·색도 짙고 채도 높은 자보라로 올려 "더
            // 깊이 들어갈수록 더 위협적"으로 읽히게 했다.
            SetPrivateField(miniboss, "bodyColor", new Color(0.24f, 0.04f, 0.4f));
            SetPrivateField(miniboss, "visualScale", 1.8f);
            SetPrivateField(miniboss, "modelPrefab", _characterC);
        }

        /// <summary>"방 종류 마지막" 슬라이스 — Room3 북쪽에서 복도3을 지나
        /// Room4(구출+퍼즐+채집)로 이어진다(막다른 방 — 더 북쪽은 없다).</summary>
        private static void BuildCorridorAndRoom4()
        {
            var corridor3Go = new GameObject("Corridor3");
            corridor3Go.transform.position = Corridor3Center;
            var corridor3Builder = corridor3Go.AddComponent<DungeonCorridorBuilder>();
            SetPrivateField(corridor3Builder, "biome", SagaBiome.Ruins);
            SetPrivateField(corridor3Builder, "corridorModel", _corridorGlb); // "환경/건물 GLB"
            corridor3Builder.Build();

            var room4Go = new GameObject("Room4");
            room4Go.transform.position = Room4Center;
            var room4Builder = room4Go.AddComponent<DungeonRoomBuilder>();
            // "바이옴 5종" — 퍼즐 제단·구출을 품은 막다른 방은 사당으로
            // 잡음(제단 셋 = 사당 콘셉트와 그대로 맞음). 구출(6,0)·호위
            // (5,±2.5)·퍼즐(-5,0)·채집(-2,2)과 안 겹치는 SW 빈 자리.
            SetPrivateField(room4Builder, "biome", SagaBiome.Shrine);
            SetPrivateField(room4Builder, "decorOffset", new Vector3(-8f, 0f, -5f));
            SetPrivateField(room4Builder, "gateModel", _gateGlb); // "환경/건물 GLB"
            SetPrivateField(room4Builder, "roomModel", _roomGlb); // "방 셸 GLB"
            room4Builder.Build();
            room4Builder.OpenSouthDoor(RoomDoorWidth);

            BuildCaptive();

            var puzzleGo = new GameObject("Puzzle");
            puzzleGo.transform.position = PuzzleAnchor;
            puzzleGo.AddComponent<DungeonPuzzle>();

            var forageGo = new GameObject("Forage");
            forageGo.transform.position = ForageAnchor;
            var forage = forageGo.AddComponent<DungeonForage>();
            SetPrivateField(forage, "roomId", "room4");
        }

        /// <summary>이벤트방(구출, js/dungeon.js:383-393) — 지키는 잡졸
        /// 둘을 다 잡아야 풀려난다.</summary>
        private static void BuildCaptive()
        {
            var captiveGo = new GameObject("Captive");
            captiveGo.transform.position = CaptiveSpawn;
            var captive = captiveGo.AddComponent<DungeonCaptive>();
            SetPrivateField(captive, "roomId", "room4");

            for (int i = 0; i < CaptiveGuardSpawns.Length; i++)
            {
                var go = new GameObject($"Enemy_HwangGeon_CaptiveGuard_{i + 1}");
                go.transform.position = CaptiveGuardSpawns[i];
                var guard = go.AddComponent<DungeonEnemy>();
                SetPrivateField(guard, "roomId", "room4");
                SetPrivateField(guard, "modelPrefab", _characterD);
            }
        }

        private static void BuildEnemy()
        {
            for (int i = 0; i < EnemySpawns.Length; i++)
            {
                var go = new GameObject($"Enemy_HwangGeon_{i + 1}");
                go.transform.position = EnemySpawns[i];
                var enemy = go.AddComponent<DungeonEnemy>();
                SetPrivateField(enemy, "modelPrefab", _characterD);
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
            SetPrivateField(boss, "modelPrefab", _characterC); // 잡졸(character-d)과 실루엣도 구분

            for (int i = 0; i < BossEscortSpawns.Length; i++)
            {
                var go = new GameObject($"Enemy_HwangGeon_Escort_{i + 1}");
                go.transform.position = BossEscortSpawns[i];
                var escort = go.AddComponent<DungeonEnemy>();
                SetPrivateField(escort, "modelPrefab", _characterD);
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

            // "GLB 자산 도입" 슬라이스 — character-a(무색), 못 찾으면 폴백.
            Transform visual = _characterA != null
                ? CharacterVisual.Spawn(_characterA, playerGo.transform, 1.8f, Color.white)
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
            var ally = go.AddComponent<AllyFighter>();
            SetPrivateField(ally, "modelPrefab", _characterB);
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
            rect.sizeDelta = new Vector2(700f, 140f); // "퀘스트 시스템" 슬라이스 — 퀘스트 목표 줄 추가로 100→140

            var text = textGo.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 24;
            text.alignment = TextAnchor.UpperLeft;
            text.color = Color.white;
            text.text = "";

            var hud = canvasGo.AddComponent<PlayerHud>();
            SetPrivateField(hud, "label", text);

            // "HUD 개선" 슬라이스 — 텍스트 줄 바로 아래 체력 게이지.
            var barBgGo = new GameObject("HealthBarBg", typeof(RectTransform));
            barBgGo.transform.SetParent(canvasGo.transform, false);
            var barBgRect = (RectTransform)barBgGo.transform;
            barBgRect.anchorMin = new Vector2(0f, 1f);
            barBgRect.anchorMax = new Vector2(0f, 1f);
            barBgRect.pivot = new Vector2(0f, 1f);
            barBgRect.anchoredPosition = new Vector2(20f, -170f); // Label(y=-20, 높이140) 바로 아래
            barBgRect.sizeDelta = new Vector2(320f, 22f);
            var barBgImg = barBgGo.AddComponent<Image>();
            barBgImg.color = new Color(0f, 0f, 0f, 0.4f);

            var barFillGo = new GameObject("HealthBarFill", typeof(RectTransform));
            barFillGo.transform.SetParent(barBgGo.transform, false);
            var barFillRect = (RectTransform)barFillGo.transform;
            barFillRect.anchorMin = Vector2.zero;
            barFillRect.anchorMax = Vector2.one;
            barFillRect.offsetMin = Vector2.zero;
            barFillRect.offsetMax = Vector2.zero;
            var barFillImg = barFillGo.AddComponent<Image>();
            barFillImg.color = new Color(0.75f, 0.15f, 0.15f);
            barFillImg.type = Image.Type.Filled;
            barFillImg.fillMethod = Image.FillMethod.Horizontal;
            barFillImg.fillOrigin = (int)Image.OriginHorizontal.Left;
            barFillImg.fillAmount = 1f;

            SetPrivateField(hud, "healthBarFill", barFillImg);
        }

        /// <summary>"미니맵" 슬라이스 — 방1~4 중심을 고정 점으로 찍고
        /// 플레이어 위치만 매 프레임 갱신하는 개략도(Minimap.cs 참고,
        /// 렌더텍스처용 카메라 없음). SaveButton(top-right, y=-30~-110)과
        /// 안 겹치게 그 아래에 둔다.</summary>
        private static void BuildMinimap()
        {
            var canvasGo = new GameObject("MinimapUI");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            canvasGo.AddComponent<GraphicRaycaster>();

            var areaGo = new GameObject("MapArea", typeof(RectTransform));
            areaGo.transform.SetParent(canvasGo.transform, false);
            var areaRect = (RectTransform)areaGo.transform;
            areaRect.anchorMin = new Vector2(1f, 1f);
            areaRect.anchorMax = new Vector2(1f, 1f);
            areaRect.pivot = new Vector2(1f, 1f);
            areaRect.anchoredPosition = new Vector2(-30f, -130f); // SaveButton(-30,-30, 160x80) 바로 아래.
            areaRect.sizeDelta = new Vector2(140f, 220f);

            var bgImg = areaGo.AddComponent<Image>();
            bgImg.color = new Color(0f, 0f, 0f, 0.35f);

            var minimap = areaGo.AddComponent<Minimap>();
            SetPrivateField(minimap, "mapArea", areaRect);

            // 방 넷 중심 — 정적 점(색으로만 구분: 숲/늪/산/사당 바이옴과
            // 같은 색조를 재사용해 방 종류를 굳이 새로 안 만든다).
            BuildMinimapDot(areaRect, Vector3.zero, new Color(0.3f, 0.55f, 0.3f), 14f); // Room1 — 숲
            BuildMinimapDot(areaRect, Room2Center, new Color(0.35f, 0.45f, 0.3f), 14f); // Room2 — 늪
            BuildMinimapDot(areaRect, Room3Center, new Color(0.55f, 0.5f, 0.45f), 14f); // Room3 — 산
            BuildMinimapDot(areaRect, Room4Center, new Color(0.6f, 0.35f, 0.2f), 14f);  // Room4 — 사당

            var dotGo = new GameObject("PlayerDot", typeof(RectTransform));
            dotGo.transform.SetParent(areaRect, false);
            var dotRect = (RectTransform)dotGo.transform;
            dotRect.sizeDelta = new Vector2(10f, 10f);
            var dotImg = dotGo.AddComponent<Image>();
            dotImg.color = Color.white;
            SetPrivateField(minimap, "playerDot", dotRect);
        }

        private static void BuildMinimapDot(RectTransform mapArea, Vector3 worldPos, Color color, float size)
        {
            var go = new GameObject("RoomMark", typeof(RectTransform));
            go.transform.SetParent(mapArea, false);
            var rect = (RectTransform)go.transform;
            rect.sizeDelta = new Vector2(size, size);
            rect.anchoredPosition = Minimap.ProjectToMap(worldPos, mapArea.rect.size);
            var img = go.AddComponent<Image>();
            img.color = color;
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
