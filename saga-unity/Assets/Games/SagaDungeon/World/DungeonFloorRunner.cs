using System;
using System.Collections.Generic;
using UnityEngine;
using Saga.Dungeon.Data;
using Saga.Dungeon.UI;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// "DUNGEON 오픈월드 확장 — 절차적 층 진행" 슬라이스(2026-09-12) — 사용자가
    /// "100층까지 진행해줘"로 요청했다. Room5~11까지 썼던 "층마다 방을
    /// 편집기 스크립트로 손으로 이어 붙이는" 물리적 확장은 100층 규모에선
    /// 불가능(방 수백~수천 개를 좌표로 하나하나 배치해야 함)이라, saga-dungeon
    /// 웹판의 실제 방식(방 하나를 클리어마다 갈아치우며 문 2~3개 중 다음
    /// 방 종류를 고르는 로그라이크식 진행, `js/dungeon.js` `run.room`/
    /// `goRoom()`/`descend()`)으로 전환했다 — Room5~11은 이 시스템으로
    /// 대체됐다(더 이상 물리적으로 존재하지 않는다).
    ///
    /// 문 선택은 화면 UI 버튼 대신 이 프로젝트의 기존 관례(우물·사당·퍼즐
    /// 제단처럼 "걸어서 가까이 가면 반응하는" 트리거)를 그대로 따른다 —
    /// 새 Canvas/EventSystem 배선이 필요 없다. 방이 갱신될 때마다 문 자리에
    /// 작은 표지(원기둥)+월드 공간 라벨(`DamagePopup.cs`와 같은 TextMesh
    /// 빌보드 패턴)을 세우고, 그 위로 걸어가면 그 종류로 다음 방이 열린다.
    ///
    /// 난수는 이 파일 안에서만 쓰는 시드 고정 `System.Random`(프로젝트 관례인
    /// 20260824 시드 재사용)이라 `Editor/SimulateDungeonFloors.cs`가 씬 없이도
    /// 같은 순서를 재현해 100층까지 미리 검증할 수 있다.
    /// </summary>
    public class DungeonFloorRunner : MonoBehaviour
    {
        private const string RoomId = "procroom";
        private const float DoorTriggerRadius = 1.8f;

        [SerializeField] private GameObject gruntModel;   // character-d
        [SerializeField] private GameObject eliteModel;   // character-c (엘리트/미니보스/두목 공용)

        private static readonly Vector3[] GruntOffsets =
        {
            new Vector3(0f, 0f, 2f),
            new Vector3(-4f, 0f, -2f),
            new Vector3(4f, 0f, 3f),
            new Vector3(-3f, 0f, 4f),
        };

        private static readonly Vector3 SoloOffset = new Vector3(2f, 0f, 0f);       // elite/miniboss/boss 본체
        private static readonly Vector3[] EscortOffsets =
        {
            new Vector3(1f, 0f, 2.5f),
            new Vector3(1f, 0f, -2.5f),
        };
        private static readonly Vector3 PoiAnchor = new Vector3(-2f, 0f, -3f);       // trove/well/shrine/cave/merchant/puzzle/forage 공용

        private static readonly Vector3[] DoorPodOffsets =
        {
            new Vector3(-3f, 0f, 8f),
            new Vector3(0f, 0f, 9f),
            new Vector3(3f, 0f, 8f),
        };

        private readonly System.Random _rng = new System.Random(20260824); // 루트 CLAUDE.md 진단 시드 관례 재사용
        private readonly List<(Transform Pod, string Kind)> _doorPods = new List<(Transform, string)>();

        private int _floor = 2;   // Room1~4가 이미 "층1" — 이 시스템은 그 다음(Room5~11이 쓰던 층2)부터 이어받는다.
        private int _roomIndex;
        private int _roomTotal;
        private bool _doorsShown;
        private Transform _contentRoot;
        private Transform _player;

        /// <summary>`Data/SaveState.cs`가 저장/복원 시점에 찾아 쓰는 정식
        /// 접근점 — 씬에 이 컴포넌트가 하나뿐이라(ProcRoom 하나) 싱글턴으로
        /// 충분하다.</summary>
        public static DungeonFloorRunner Instance { get; private set; }

        /// <summary>지금 층 — 세이브가 저장하는 값(정확한 방 인덱스·종류까지는
        /// 안 남긴다, 아래 `JumpToFloor()` 주석 참고).</summary>
        public int CurrentFloor => _floor;

        private void Awake()
        {
            Instance = this;
            _player = GameObject.FindWithTag("Player")?.transform;

            var contentGo = new GameObject("RoomContent");
            contentGo.transform.SetParent(transform, false);
            _contentRoot = contentGo.transform;

            _roomTotal = DungeonFormulas.RoomsFor(_floor);
            BuildRoomContent("fight"); // dungeon.js buildFloor() — 층의 첫 방은 항상 전투방.
        }

        private void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }

        /// <summary>`SaveState.TryLoad()`가 부른다(Awake가 끝난 뒤, GameBootstrap
        /// .Start()에서 — Unity 실행 순서상 이 컴포넌트의 Awake가 이미
        /// floor=2 첫 방을 지어 둔 다음이라 한 번 다시 짓는 비용이 든다,
        /// 단순함을 위해 감수). **정확한 방 인덱스·종류까지는 저장하지
        /// 않는다** — 층 하나가 이 프로젝트가 다루기로 한 "의미 있는 진행
        /// 단위"라(원작도 `dstate().best`로 최고 층만 따로 추적한다,
        /// dungeon.js descend()) 저장된 층의 첫 방(전투)부터 다시 시작한다.</summary>
        public void JumpToFloor(int floor)
        {
            if (floor < 2) return;
            ClearDoorPods();
            _floor = floor;
            _roomIndex = 0;
            _roomTotal = DungeonFormulas.RoomsFor(_floor);
            BuildRoomContent("fight");
        }

        private void Update()
        {
            if (_player == null) return;

            if (_doorsShown)
            {
                for (int i = 0; i < _doorPods.Count; i++)
                {
                    if (_doorPods[i].Pod == null) continue;
                    if (Vector3.Distance(_doorPods[i].Pod.position, _player.position) <= DoorTriggerRadius)
                    {
                        string chosen = _doorPods[i].Kind;
                        ClearDoorPods();
                        if (chosen == "stair") Descend();
                        else AdvanceRoom(chosen);
                        return;
                    }
                }
                return;
            }

            if (DungeonEnemy.CountAliveInRoom(RoomId) > 0) return; // 아직 안 치워짐 — dungeon.js room.cleared와 같은 뜻.

            if (_roomIndex >= _roomTotal - 1) ShowStairDoor();
            else ShowKindDoors();
        }

        private void ShowKindDoors()
        {
            _doorsShown = true;
            var kinds = DungeonFormulas.PickDoorKinds(_rng);
            for (int i = 0; i < kinds.Count && i < DoorPodOffsets.Length; i++)
            {
                var pod = BuildDoorPod(DoorPodOffsets[i], kinds[i]);
                _doorPods.Add((pod, kinds[i]));
            }
        }

        private void ShowStairDoor()
        {
            _doorsShown = true;
            var pod = BuildDoorPod(DoorPodOffsets[1], "stair");
            _doorPods.Add((pod, "stair"));
        }

        private Transform BuildDoorPod(Vector3 localOffset, string kind)
        {
            var go = new GameObject($"Door_{kind}");
            go.transform.SetParent(transform, false);
            go.transform.localPosition = localOffset;

            var visual = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            visual.name = "Visual";
            visual.transform.SetParent(go.transform, false);
            visual.transform.localScale = new Vector3(0.8f, 0.5f, 0.8f);
            visual.transform.localPosition = new Vector3(0f, 0.5f, 0f);
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "DungeonFloorDoor (generated)" };
            mat.color = new Color(0.85f, 0.75f, 0.3f);
            visual.GetComponent<MeshRenderer>().sharedMaterial = mat;
            UnityEngine.Object.Destroy(visual.GetComponent<Collider>());

            var labelGo = new GameObject("Label");
            labelGo.transform.SetParent(go.transform, false);
            labelGo.transform.localPosition = new Vector3(0f, 1.6f, 0f);
            var mesh = labelGo.AddComponent<TextMesh>();
            mesh.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            labelGo.GetComponent<MeshRenderer>().sharedMaterial = mesh.font.material;
            mesh.text = DungeonFormulas.KindDisplayName(kind);
            mesh.characterSize = 0.22f;
            mesh.fontSize = 40;
            mesh.color = Color.white;
            mesh.anchor = TextAnchor.MiddleCenter;
            mesh.alignment = TextAlignment.Center;
            labelGo.AddComponent<DoorLabelBillboard>();

            return go.transform;
        }

        private void ClearDoorPods()
        {
            for (int i = 0; i < _doorPods.Count; i++)
            {
                if (_doorPods[i].Pod != null) UnityEngine.Object.Destroy(_doorPods[i].Pod.gameObject);
            }
            _doorPods.Clear();
            _doorsShown = false;
        }

        private void AdvanceRoom(string kind)
        {
            _roomIndex++;
            bool forceBoss = DungeonFormulas.IsBossFloor(_floor) && _roomIndex >= _roomTotal - 1;
            BuildRoomContent(forceBoss ? "boss" : kind);
        }

        private void Descend()
        {
            _floor++;
            _roomIndex = 0;
            _roomTotal = DungeonFormulas.RoomsFor(_floor);
            DialogueLabel.Instance?.Show($"🪜 제{_floor}층으로 내려간다", 4f);
            BuildRoomContent("fight");
        }

        private void BuildRoomContent(string kind)
        {
            for (int i = _contentRoot.childCount - 1; i >= 0; i--)
            {
                UnityEngine.Object.Destroy(_contentRoot.GetChild(i).gameObject);
            }

            switch (kind)
            {
                case "fight": SpawnFight(); break;
                case "elite": SpawnElite(); break;
                case "miniboss": SpawnSolo("황건 살수", new Color(0.24f, 0.04f, 0.4f), isBoss: true, withEscorts: false); break;
                case "boss": SpawnSolo("황건적 두목", new Color(0.45f, 0.08f, 0.08f), isBoss: true, withEscorts: true); break;
                case "trove": SpawnTrove(); break;
                case "well": SpawnWell(); break;
                case "shrine": SpawnShrine(); break;
                case "cave": SpawnVein(); break;
                case "merchant": SpawnMerchant(); break;
                case "puzzle": SpawnPuzzle(); break;
                case "event": SpawnCaptive(); break;
                case "forage": SpawnForage(); break;
                default: SpawnFight(); break;
            }
        }

        private GameObject SpawnGrunt(Vector3 localOffset)
        {
            var go = new GameObject("Enemy_Floor_Grunt");
            go.SetActive(false);
            go.transform.SetParent(_contentRoot, false);
            go.transform.localPosition = localOffset;
            var enemy = go.AddComponent<DungeonEnemy>();
            enemy.SetSpawnContext(RoomId, gruntModel);
            enemy.ConfigureCombat(
                DungeonFormulas.EnemyHp(_floor, false), DungeonFormulas.EnemyDmg(_floor, false),
                DungeonFormulas.RewardExp(_floor, false), DungeonFormulas.RewardGold(_floor, false),
                "wp_axe", null, false, "황건적",
                new Color(0.72f, 0.64f, 0.3f), 1f);
            go.SetActive(true);
            return go;
        }

        private void SpawnFight()
        {
            foreach (var offset in GruntOffsets) SpawnGrunt(offset);
        }

        private void SpawnElite()
        {
            var go = new GameObject("Enemy_Floor_Elite");
            go.SetActive(false);
            go.transform.SetParent(_contentRoot, false);
            go.transform.localPosition = SoloOffset;
            var enemy = go.AddComponent<DungeonEnemy>();
            enemy.SetSpawnContext(RoomId, gruntModel);
            enemy.ConfigureCombat(
                DungeonFormulas.EliteHp(_floor), DungeonFormulas.EliteDmg(_floor),
                DungeonFormulas.EliteRewardExp(_floor), DungeonFormulas.EliteRewardGold(_floor),
                "wp_saber", null, false, "폐허의 황건 정예",
                new Color(0.75f, 0.35f, 0.15f), 1.25f);
            go.SetActive(true);

            foreach (var offset in EscortOffsets) SpawnGrunt(SoloOffset + offset);
        }

        private void SpawnSolo(string displayName, Color color, bool isBoss, bool withEscorts)
        {
            var go = new GameObject($"Enemy_Floor_{(withEscorts ? "Boss" : "Miniboss")}");
            go.SetActive(false);
            go.transform.SetParent(_contentRoot, false);
            go.transform.localPosition = SoloOffset;
            var enemy = go.AddComponent<DungeonEnemy>();
            enemy.SetSpawnContext(RoomId, eliteModel);
            enemy.ConfigureCombat(
                DungeonFormulas.EnemyHp(_floor, true), DungeonFormulas.EnemyDmg(_floor, true),
                DungeonFormulas.RewardExp(_floor, true), DungeonFormulas.RewardGold(_floor, true),
                "wp_greatblade", "gem_ruby", isBoss, displayName,
                color, withEscorts ? 2.0f : 1.8f);
            go.SetActive(true);

            if (withEscorts)
            {
                foreach (var offset in EscortOffsets) SpawnGrunt(SoloOffset + offset);
            }
        }

        private void SpawnTrove()
        {
            var go = new GameObject("Trove");
            go.transform.SetParent(_contentRoot, false);
            go.transform.localPosition = PoiAnchor;
            go.AddComponent<DungeonTrove>();
        }

        private void SpawnWell()
        {
            var go = new GameObject("Well");
            go.transform.SetParent(_contentRoot, false);
            go.transform.localPosition = PoiAnchor;
            go.AddComponent<DungeonWell>();
        }

        private void SpawnShrine()
        {
            var go = new GameObject("Shrine");
            go.transform.SetParent(_contentRoot, false);
            go.transform.localPosition = PoiAnchor;
            go.AddComponent<DungeonShrine>();
        }

        private void SpawnVein()
        {
            var go = new GameObject("Vein");
            go.transform.SetParent(_contentRoot, false);
            go.transform.localPosition = PoiAnchor;
            var vein = go.AddComponent<DungeonVein>();
            vein.SetRoomId(RoomId);
        }

        private void SpawnMerchant()
        {
            var go = new GameObject("Merchant");
            go.transform.SetParent(_contentRoot, false);
            go.transform.localPosition = PoiAnchor;
            var merchant = go.AddComponent<DungeonMerchant>();
            merchant.Configure(RoomId, "wp_saber", null, 45);
        }

        private void SpawnPuzzle()
        {
            var go = new GameObject("Puzzle");
            go.transform.SetParent(_contentRoot, false);
            go.transform.localPosition = PoiAnchor;
            go.AddComponent<DungeonPuzzle>();
        }

        private void SpawnCaptive()
        {
            var go = new GameObject("Captive");
            go.transform.SetParent(_contentRoot, false);
            go.transform.localPosition = SoloOffset;
            var captive = go.AddComponent<DungeonCaptive>();
            captive.SetRoomId(RoomId);

            foreach (var offset in EscortOffsets) SpawnGrunt(SoloOffset + offset);
        }

        private void SpawnForage()
        {
            var go = new GameObject("Forage");
            go.transform.SetParent(_contentRoot, false);
            go.transform.localPosition = PoiAnchor;
            var forage = go.AddComponent<DungeonForage>();
            forage.SetRoomId(RoomId);
        }

        /// <summary>`DamagePopup.cs`와 같은 결 — 문 라벨을 항상 카메라 쪽으로.</summary>
        private class DoorLabelBillboard : MonoBehaviour
        {
            private Camera _cam;
            private void Awake() => _cam = Camera.main;
            private void Update() { if (_cam != null) transform.rotation = _cam.transform.rotation; }
        }
    }
}
