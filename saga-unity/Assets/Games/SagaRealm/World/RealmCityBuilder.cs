using UnityEngine;
using Saga.Realm.Data;

namespace Saga.Realm.World
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 2절 "3D로 뭘 새로 얹나"·2-1절 "디오라마로
    /// 재구성"(saga-godot REALM 참고, 개념만 — city3d.js "장식이 아니라
    /// 읽는 화면": 성벽·인구 등을 소품 개수로 그대로 세운다) — Unity
    /// 관용구로 새로 지었다. GLB 자산 없음(8장 우선순위 밖, 성 디오라마는
    /// primitive로 충분하다는 GO/DUNGEON 초기 판단과 같은 결) — 전부
    /// Cube/Cylinder 조합.
    ///
    /// `RealmCityState.Changed`를 구독해 값이 바뀔 때마다 다시 짓는다
    /// (realm_city.gd의 "성 숫자가 바뀔 때만 다시 짓는다"와 같은 습관이되,
    /// 이 슬라이스는 성이 하나뿐이라 sig() 캐시 없이 매번 다시 지어도
    /// 소품 수가 적어 무해하다).
    /// </summary>
    public class RealmCityBuilder : MonoBehaviour
    {
        private const int MaxFarms = 10;
        private const int MaxMarkets = 10;
        private const int MaxGranaries = 6;

        private static readonly Color GroundColor = new Color(0.42f, 0.55f, 0.32f);
        private static readonly Color WallColor = new Color(0.55f, 0.52f, 0.46f);
        private static readonly Color KeepColor = new Color(0.6f, 0.42f, 0.28f);
        private static readonly Color FarmColor = new Color(0.62f, 0.68f, 0.22f);
        private static readonly Color MarketColor = new Color(0.75f, 0.35f, 0.18f);
        private static readonly Color GranaryColor = new Color(0.45f, 0.32f, 0.18f);
        private static readonly Color FlagColor = new Color(0.85f, 0.75f, 0.15f);

        private bool _synced;

        private void Awake()
        {
            RealmCityState.Changed += Rebuild;
        }

        private void Update()
        {
            // ForestFurnitureAnchor.cs와 같은 이유 — GameBootstrap.Start()의
            // RealmSaveState.TryLoad()보다 이 Awake가 먼저 돌 수 있어, 첫
            // Update 프레임에 한 번만 로드된 값 기준으로 짓는다.
            if (_synced) return;
            _synced = true;
            Rebuild();
        }

        private void OnDestroy()
        {
            RealmCityState.Changed -= Rebuild;
        }

        /// <summary>edit-time 씬 빌드가 직접 부른다(Awake는 Play 모드에서만
        /// 자동으로 돈다 — StoryTerrainBuilder.cs와 같은 이유).</summary>
        public void Rebuild()
        {
            for (int i = transform.childCount - 1; i >= 0; i--)
            {
                DestroyImmediate(transform.GetChild(i).gameObject);
            }

            var record = RealmCityState.CityRecord(RealmCityState.CurrentCity);
            if (record == null) return; // 씬 첫 로드 등 아직 상태가 없을 때 — 다음 Changed에서 다시 지음.

            BuildGround();
            BuildWallAndTowers();
            BuildKeep();
            BuildRosterFlags();
            BuildCountedProps("Farm", Mathf.Clamp(record.Agri / 90, 0, MaxFarms), FarmColor,
                PrimitiveType.Cube, new Vector3(1.4f, 0.3f, 1.4f), radius: 5.5f, y: 0.15f);
            BuildCountedProps("Market", Mathf.Clamp(record.Comm / 80, 0, MaxMarkets), MarketColor,
                PrimitiveType.Cube, new Vector3(1.0f, 0.9f, 1.0f), radius: 7.5f, y: 0.45f);
            BuildCountedProps("Granary", Mathf.Clamp(record.Food / 400, 0, MaxGranaries), GranaryColor,
                PrimitiveType.Cylinder, new Vector3(1.1f, 1.4f, 1.1f), radius: 9.2f, y: 0.7f);
        }

        private static GameObject Spawn(string name, Transform parent, PrimitiveType type, Vector3 localPos,
            Vector3 scale, Color color)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPos;
            go.transform.localScale = scale;
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = $"{name} (generated)" };
            mat.color = color;
            go.GetComponent<MeshRenderer>().sharedMaterial = mat;
            return go;
        }

        private void BuildGround()
        {
            Spawn("Ground", transform, PrimitiveType.Cylinder, new Vector3(0f, -0.05f, 0f),
                new Vector3(14f, 0.1f, 14f), GroundColor);
        }

        /// <summary>담장 넷(남쪽만 문 폭만큼 비워 둔다) + 모서리 망루 넷 —
        /// realm_city.gd의 "대·누각·담장" 정적 실루엣과 같은 자리.</summary>
        private void BuildWallAndTowers()
        {
            const float r = 11f;
            const float wallH = 1.6f;
            const float wallThick = 0.5f;
            const float gateHalf = 1.4f; // 남쪽 벽 가운데 문 폭.

            Spawn("Wall_North", transform, PrimitiveType.Cube, new Vector3(0f, wallH / 2f, r),
                new Vector3(r * 2f, wallH, wallThick), WallColor);
            Spawn("Wall_East", transform, PrimitiveType.Cube, new Vector3(r, wallH / 2f, 0f),
                new Vector3(wallThick, wallH, r * 2f), WallColor);
            Spawn("Wall_West", transform, PrimitiveType.Cube, new Vector3(-r, wallH / 2f, 0f),
                new Vector3(wallThick, wallH, r * 2f), WallColor);
            // 남쪽 벽 — 문 폭만큼 가운데를 비우고 좌우 두 조각.
            float southSegLen = r - gateHalf;
            float southSegCenter = gateHalf + southSegLen / 2f;
            Spawn("Wall_South_East", transform, PrimitiveType.Cube, new Vector3(southSegCenter, wallH / 2f, -r),
                new Vector3(southSegLen, wallH, wallThick), WallColor);
            Spawn("Wall_South_West", transform, PrimitiveType.Cube, new Vector3(-southSegCenter, wallH / 2f, -r),
                new Vector3(southSegLen, wallH, wallThick), WallColor);

            Vector3[] corners =
            {
                new Vector3(r, 0f, r), new Vector3(-r, 0f, r),
                new Vector3(r, 0f, -r), new Vector3(-r, 0f, -r),
            };
            for (int i = 0; i < corners.Length; i++)
            {
                var pos = corners[i] + new Vector3(0f, 1.1f, 0f);
                Spawn($"Tower_{i}", transform, PrimitiveType.Cylinder, pos, new Vector3(1.2f, 1.1f, 1.2f), WallColor);
            }
        }

        private void BuildKeep()
        {
            Spawn("Keep", transform, PrimitiveType.Cube, new Vector3(0f, 1.4f, 0f),
                new Vector3(3.2f, 2.8f, 3.2f), KeepColor);
            Spawn("KeepRoof", transform, PrimitiveType.Cylinder, new Vector3(0f, 3.2f, 0f),
                new Vector3(2.4f, 0.9f, 2.4f), KeepColor);
        }

        /// <summary>로스터 깃발 — city3d.js의 "로스터 깃발"(무장 수)을
        /// 그대로. 여러 성으로 확장한 뒤로는 **이 성에 배치된** 무장
        /// 수만 센다(전체 로스터가 아니라) — "무장 성 소속"이 실제로
        /// 눈에 보이는 유일한 자리라 의미 있게 맞췄다.</summary>
        private void BuildRosterFlags()
        {
            int count = 0;
            foreach (var id in RealmCityState.RosterIds)
            {
                if (RealmCityState.OfficerCityId(id) == RealmCityState.CurrentCity) count++;
            }
            for (int i = 0; i < count; i++)
            {
                float angle = (i / (float)Mathf.Max(1, count)) * 40f - 20f;
                Vector3 pos = new Vector3(Mathf.Sin(angle * Mathf.Deg2Rad) * 4.5f, 0.9f, 4.5f);
                Spawn($"Flag_{i}", transform, PrimitiveType.Cube, pos, new Vector3(0.12f, 1.8f, 0.5f), FlagColor);
            }
        }

        private void BuildCountedProps(string label, int count, Color color, PrimitiveType type, Vector3 scale,
            float radius, float y)
        {
            if (count <= 0) return;
            var root = new GameObject($"{label}s");
            root.transform.SetParent(transform, false);
            for (int i = 0; i < count; i++)
            {
                float angle = (360f / count) * i;
                Vector3 pos = new Vector3(Mathf.Sin(angle * Mathf.Deg2Rad) * radius, y,
                    Mathf.Cos(angle * Mathf.Deg2Rad) * radius);
                Spawn($"{label}_{i}", root.transform, type, pos, scale, color);
            }
        }
    }
}
