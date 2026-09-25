using System.Collections.Generic;
using UnityEngine;
using Saga.Forest.Data;
using Saga.Forest.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 108 끝줄 "FOREST 존 전용 소품" 진단 — `PlaytestForestHeadless` 가 존 진단 뒤에 부른다(읽기만, 끝나면 휨을 플레이어 자리로 되돌린다).
    /// 표(존 넷 모두 무더기 둘 이상 · 무더기 가운데가 제 존 · 조각이 마을 안) · 비킴(den 5.5m · 채집·우편함·명소·판·주민·나무 4.5m · 집 6m · 스폰 5m) ·
    /// 세운 것(조각 수 = 표 · 자리 · 밑면 = 땅 · 충돌은 뿌리에만·표대로 · LOD 둘 · 정적 아님 · 불빛 없음) ·
    /// 휨(먼 점 기준으로 조각마다 거리² × 0.004 만큼 내려감) · 존 하나 원본 삼각형 상한.
    /// </summary>
    public static class PlaytestForestZoneProps
    {
        private static bool _ok;

        public const float DenClearance = 5.5f;
        public const float ObjectClearance = 4.5f;
        public const float HouseClearance = 6f;
        public const float OwnLandmarkClearance = 2.5f;
        public const long MaxZoneTris = 250000;

        private static readonly HashSet<string> Objects = new HashSet<string>
        {
            "ForestCollectSpot", "ForestDeliveryMailbox", "ForestLandmark", "ForestFinishStall", "ForestVillager", "ForestFruitTree",
            "ForestTownScoreBoard", "ForestDeliveryCounter", "ForestWishStone", "ForestFurnitureStall",
        };

        public static bool Run()
        {
            _ok = true;
            CheckTable();
            var builder = Object.FindFirstObjectByType<ForestZonePropsBuilder>();
            if (builder == null) { Fail("ForestZonePropsBuilder 없음(씬 재빌드?)"); return false; }
            CheckClearance();
            string m = CheckBuilt(builder);
            CheckCurve(builder);
            var player = GameObject.FindWithTag("Player");
            if (player != null) builder.Follow(player.transform.position);
            if (_ok) Debug.Log($"[PlaytestForestHeadless] zoneProps OK - 존마다 무더기·제 존·마을 안·비킴(den·물건·집·스폰)·조각 수·자리·밑면·충돌·LOD·정적 아님·불빛 없음·휨 |{m}");
            return _ok;
        }

        private static void CheckTable()
        {
            var ids = new HashSet<string>();
            var perZone = new int[ForestBiomeData.Zones.Length];
            foreach (var c in ForestZoneProps.Clusters)
            {
                if (!ids.Add(c.Id)) Fail($"무더기 id 겹침 {c.Id}");
                int zi = ForestZoneProps.ZoneIndex(c.ZoneKey);
                if (zi < 0) { Fail($"{c.Id} 존 {c.ZoneKey} 없음"); continue; }
                perZone[zi]++;
                var center = ForestZoneProps.Center(c);
                if (ForestBiomeData.ZoneAt(center.x, center.z) != zi) Fail($"{c.Id} 가운데가 존 {ForestBiomeData.ZoneAt(center.x, center.z)} — 표는 {c.ZoneKey}");
                foreach (var p in c.Pieces)
                {
                    var at = ForestZoneProps.PiecePos(c, p);
                    if (Mathf.Abs(at.x) > ForestGroundBuilder.VillageWidth * 0.5f - 1.5f || Mathf.Abs(at.z) > ForestGroundBuilder.VillageDepth * 0.5f - 1.5f)
                        Fail($"{c.Id} 조각 {p.Model} 이 마을 가장자리 밖 {at}");
                }
            }
            for (int i = 0; i < perZone.Length; i++)
                if (perZone[i] < 2) Fail($"{ForestBiomeData.Zones[i].Key} 무더기 {perZone[i]} < 2");
        }

        private static void CheckClearance()
        {
            var dens = new List<Vector3>();
            foreach (var z in ForestBiomeData.Zones)
            {
                float sx = z.Center.x >= 0f ? 1f : -1f, sz = z.Center.y >= 0f ? 1f : -1f;
                dens.Add(new Vector3(z.Center.x, 0f, z.Center.y));
                dens.Add(new Vector3(z.Center.x + 6f * sx, 0f, z.Center.y + 4f * sz));
            }
            var objects = new List<(string, Vector3, float)>();
            foreach (var mb in Object.FindObjectsByType<MonoBehaviour>(FindObjectsInactive.Exclude, FindObjectsSortMode.None))
            {
                string n = mb.GetType().Name;
                if (n == "ForestLandmark") objects.Add((n + ((ForestLandmark)mb).ZoneIndex, mb.transform.position, ObjectClearance));
                else if (Objects.Contains(n)) objects.Add((n, mb.transform.position, ObjectClearance));
                else if (n == "ForestHouse") objects.Add((n, mb.transform.position, HouseClearance));
            }
            if (objects.Count < 12) Fail($"비킬 물건이 {objects.Count} 개뿐 — 이름표가 낡았나");
            var player = GameObject.FindWithTag("Player");
            foreach (var c in ForestZoneProps.Clusters)
                foreach (var p in c.Pieces)
                {
                    var at = ForestZoneProps.PiecePos(c, p);
                    foreach (var d in dens) if (Flat(d - at) < DenClearance) Fail($"{c.Id} {p.Model} 이 짐승 굴에서 {Flat(d - at):F1}m");
                    // 109-4 명소 곁 무더기는 제 명소 둘레에 선다 — 그 명소만 비킴 대신 땅 조각 2.5m(명소 몸 반지름)·잔해는 위에 뜬다.
                    string own = c.AtLandmark ? "ForestLandmark" + ForestZoneProps.ZoneIndex(c.ZoneKey) : null;
                    foreach (var (n, pos, r) in objects)
                    {
                        float need = n == own ? (p.Era == ForestEra.Future ? 0f : OwnLandmarkClearance) : r;
                        if (Flat(pos - at) < need) Fail($"{c.Id} {p.Model} 이 {n} 에서 {Flat(pos - at):F1}m");
                    }
                    if (player != null && Flat(player.transform.position - at) < 5f) Fail($"{c.Id} {p.Model} 이 플레이어 스폰 곁");
                }
        }

        private static string CheckBuilt(ForestZonePropsBuilder builder)
        {
            int pieces = 0, lods = 0;
            var zoneTris = new long[ForestBiomeData.Zones.Length];
            foreach (var c in ForestZoneProps.Clusters)
            {
                var root = builder.transform.Find("ZoneProps_" + c.Id);
                if (root == null) { Fail($"{c.Id} 무더기가 씬에 없다"); continue; }
                if (root.childCount != c.Pieces.Length) { Fail($"{c.Id} 조각 {root.childCount} ≠ 표 {c.Pieces.Length}(모델 못 찾음?)"); continue; }
                for (int i = 0; i < c.Pieces.Length; i++)
                {
                    var p = c.Pieces[i];
                    var piece = root.GetChild(i);
                    pieces++;
                    if (Flat(piece.position - ForestZoneProps.PiecePos(c, p)) > 0.01f || Mathf.Abs(piece.position.y) > 0.01f) Fail($"{c.Id} {piece.name} 자리 {piece.position}");
                    var visual = piece.Find("Visual");
                    if (visual == null) { Fail($"{c.Id} {piece.name} Visual 없음"); continue; }
                    bool listed = false;
                    foreach (var v in builder.Visuals) if (v == visual) listed = true;
                    if (!listed) Fail($"{c.Id} {piece.name} 가 휨 목록에 없다");
                    builder.Follow(piece.position); // 제 자리 기준이면 휨 0
                    if (!Bounds(visual.gameObject, out var b)) { Fail($"{c.Id} {piece.name} 렌더러 없음"); continue; }
                    if (Mathf.Abs(b.min.y - p.Y) > 0.05f) Fail($"{c.Id} {piece.name} 밑면 {b.min.y:F2} ≠ {p.Y:F2}");
                    var rootCols = piece.GetComponents<Collider>();
                    if (visual.GetComponentInChildren<Collider>(true) != null) Fail($"{c.Id} {piece.name} 충돌이 휨 따라 움직인다(Visual 아래)");
                    if (p.Collide != (rootCols.Length > 0)) Fail($"{c.Id} {piece.name} 충돌 {rootCols.Length} — 표 {p.Collide}");
                    if (piece.GetComponentInChildren<Light>(true) != null) Fail($"{c.Id} {piece.name} 에 불빛");
                    foreach (var t in piece.GetComponentsInChildren<Transform>(true))
                        if (t.gameObject.isStatic) { Fail($"{c.Id} {t.name} 정적 표시(휨이 안 먹는다)"); break; }
                    foreach (var r in piece.GetComponentsInChildren<MeshRenderer>(true))
                        foreach (var mat in r.sharedMaterials) if (mat == null) Fail($"{c.Id} {piece.name}/{r.name} 재질 빔");
                    var lod1 = visual.Find("Body/LOD1");
                    if (lod1 != null)
                    {
                        lods++;
                        var g = visual.GetComponent<LODGroup>();
                        if (g == null || g.lodCount != 2) Fail($"{c.Id} {piece.name} LODGroup 둘 아님");
                    }
                    var lod0 = visual.Find("Body/LOD0");
                    zoneTris[ForestZoneProps.ZoneIndex(c.ZoneKey)] += Tris(lod0 != null ? lod0 : visual);
                }
            }
            long max = 0;
            for (int i = 0; i < zoneTris.Length; i++)
            {
                max = System.Math.Max(max, zoneTris[i]);
                if (zoneTris[i] > MaxZoneTris) Fail($"{ForestBiomeData.Zones[i].Key} 원본 삼각형 {zoneTris[i] / 1000}k > {MaxZoneTris / 1000}k");
            }
            return $" 무더기 {ForestZoneProps.Clusters.Length}·조각 {pieces}(LOD {lods})·존 원본 삼각형 최대 {max / 1000}k";
        }

        private static void CheckCurve(ForestZonePropsBuilder builder)
        {
            var far = new Vector3(-40f, 0f, 28f);
            builder.Follow(far);
            foreach (var v in builder.Visuals)
            {
                Vector3 p = v.parent.position;
                float want = -((p.x - far.x) * (p.x - far.x) + (p.z - far.z) * (p.z - far.z)) * ForestLandmark.CurveAmount;
                if (Mathf.Abs(v.localPosition.y - want) > 0.001f) { Fail($"{v.parent.name} 휨 {v.localPosition.y:F3} ≠ {want:F3}"); break; }
                if (want > -0.01f && Flat(p - far) > 5f) { Fail($"{v.parent.name} 먼데도 안 내려감"); break; }
            }
        }

        private static long Tris(Transform t)
        {
            long n = 0;
            foreach (var f in t.GetComponentsInChildren<MeshFilter>(true))
                if (f.sharedMesh != null)
                    for (int s = 0; s < f.sharedMesh.subMeshCount; s++) n += (long)f.sharedMesh.GetIndexCount(s) / 3;
            return n;
        }

        private static bool Bounds(GameObject go, out Bounds b)
        {
            b = default;
            bool any = false;
            foreach (var r in go.GetComponentsInChildren<Renderer>(true))
            {
                if (!any) { b = r.bounds; any = true; }
                else b.Encapsulate(r.bounds);
            }
            return any;
        }

        private static float Flat(Vector3 v) => new Vector2(v.x, v.z).magnitude;

        private static void Fail(string msg)
        {
            _ok = false;
            Debug.LogError($"[PlaytestForestHeadless] zoneProps FAIL - {msg}");
        }
    }
}
