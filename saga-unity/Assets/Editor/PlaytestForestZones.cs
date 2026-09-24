using System.Collections.Generic;
using UnityEngine;
using Saga.Forest.Data;
using Saga.Forest.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 108 ② "고정 특색 지역" 진단 — `PlaytestForestHeadless` 가 3프레임째에 부른다.
    /// 표(존 넷 · 한자 서로 다름 · 사연·명소 이름·명소 사연 · 명단) · 존 판정(중심은 제 존, 마을 가운데·플레이어 스폰은 -1) ·
    /// 명단 정직성(세운 짐승의 den 이 든 존 명단에 그 종이 있고, 명단의 종은 그 존에 실제로 선다) ·
    /// 명소(넷, 제 자리·제 존, GLB 모양이 붙음, den·채집 자리·우편함과 4m 넘게 떨어짐, 땅 휨 따라 내려감) ·
    /// 명소 자막(가까이 오면 한 번·처음이면 "발견"·멀리 갔다 오면 다시) · 존 자막(처음이면 사연·마을 복귀·다시 오면 사연 없음).
    /// 끝나면 추적기·명소 상태를 실제 플레이어 자리로 되돌린다.
    /// </summary>
    public static class PlaytestForestZones
    {
        private static bool _ok;

        public static bool Run()
        {
            _ok = true;
            CheckTable();
            CheckZoneAt();
            CheckRosters();
            string m = CheckLandmarks();
            CheckZoneTracker();
            if (_ok) Debug.Log($"[PlaytestForestHeadless] zones OK - 표(한자·사연·명소)·존 판정·명단 정직성·명소 자리/모양/휨·명소 자막·존 자막 |{m}");
            return _ok;
        }

        private static void CheckTable()
        {
            var zs = ForestBiomeData.Zones;
            if (zs.Length != 4) Fail($"존 {zs.Length} ≠ 4");
            var hanja = new HashSet<string>();
            foreach (var z in zs)
            {
                if (string.IsNullOrEmpty(z.Hanja) || !hanja.Add(z.Hanja)) Fail($"{z.Key} 한자 \"{z.Hanja}\" 비었거나 겹침");
                if (string.IsNullOrEmpty(z.Lore) || string.IsNullOrEmpty(z.LandmarkName) || string.IsNullOrEmpty(z.LandmarkLore)) Fail($"{z.Key} 사연·명소 글 없음");
                if (z.Roster == null || z.Roster.Length == 0) Fail($"{z.Key} 명단 없음");
            }
        }

        private static void CheckZoneAt()
        {
            for (int i = 0; i < ForestBiomeData.Zones.Length; i++)
            {
                var c = ForestBiomeData.Zones[i].Center;
                if (ForestBiomeData.ZoneAt(c.x, c.y) != i) Fail($"{ForestBiomeData.Zones[i].Key} 중심이 제 존이 아님");
                var lp = ForestBiomeData.Zones[i].LandmarkPos;
                if (ForestBiomeData.ZoneAt(lp.x, lp.y) != i) Fail($"{ForestBiomeData.Zones[i].Key} 명소가 제 존 밖");
            }
            if (ForestBiomeData.ZoneAt(0f, 0f) != -1 || ForestBiomeData.ZoneAt(0f, -15f) != -1) Fail("마을 가운데·스폰이 존 안");
        }

        private static void CheckRosters()
        {
            var creatures = Object.FindObjectsByType<ForestCreature>(FindObjectsSortMode.None);
            if (creatures.Length != 8) Fail($"짐승 {creatures.Length} ≠ 8");
            var seen = new Dictionary<int, HashSet<string>>();
            foreach (var c in creatures)
            {
                int zi = ForestBiomeData.ZoneAt(c.Den.x, c.Den.z);
                if (zi < 0) { Fail($"{c.Kind} den {c.Den} 이 존 밖"); continue; }
                if (System.Array.IndexOf(ForestBiomeData.Zones[zi].Roster, c.Kind) < 0) Fail($"{c.Kind} 가 {ForestBiomeData.Zones[zi].Key} 명단 밖");
                if (!seen.ContainsKey(zi)) seen[zi] = new HashSet<string>();
                seen[zi].Add(c.Kind);
            }
            for (int i = 0; i < ForestBiomeData.Zones.Length; i++)
            {
                foreach (var k in ForestBiomeData.Zones[i].Roster)
                    if (!seen.TryGetValue(i, out var s) || !s.Contains(k)) Fail($"{ForestBiomeData.Zones[i].Key} 명단의 {k} 가 그 존에 안 선다");
            }
            if (ForestCreature.KindName("angaeyuryeong") != "안개유령" && ForestLocalization.CurrentLanguage == "ko") Fail("짐승 이름");
        }

        private static string CheckLandmarks()
        {
            var lms = Object.FindObjectsByType<ForestLandmark>(FindObjectsSortMode.None);
            if (lms.Length != 4) { Fail($"명소 {lms.Length} ≠ 4(씬 재빌드?)"); return ""; }
            var others = new List<Vector3>();
            foreach (var c in Object.FindObjectsByType<ForestCreature>(FindObjectsSortMode.None)) others.Add(c.Den);
            foreach (var s in Object.FindObjectsByType<ForestCollectSpot>(FindObjectsSortMode.None)) others.Add(s.transform.position);
            foreach (var mb in Object.FindObjectsByType<ForestDeliveryMailbox>(FindObjectsSortMode.None)) others.Add(mb.transform.position);
            int pieces = 0;
            var player = GameObject.FindWithTag("Player");
            foreach (var lm in lms)
            {
                var z = ForestBiomeData.Zones[lm.ZoneIndex];
                var p = lm.transform.position;
                if (Vector2.Distance(new Vector2(p.x, p.z), z.LandmarkPos) > 0.01f) Fail($"{z.Key} 명소 자리 {p}");
                if (lm.Visual == null || lm.Visual.GetComponentsInChildren<MeshRenderer>().Length == 0) { Fail($"{z.Key} 명소 모양(GLB)이 없음"); continue; }
                pieces += lm.Visual.GetComponentsInChildren<MeshRenderer>().Length;
                foreach (var o in others)
                    if (Vector2.Distance(new Vector2(p.x, p.z), new Vector2(o.x, o.z)) < 4f) Fail($"{z.Key} 명소가 {o} 와 4m 안");
                // 땅 휨: 20m 떨어진 곳에서 보면 0.004 × 400 = 1.6m 내려간다
                lm.Follow(p + new Vector3(20f, 0f, 0f));
                if (Mathf.Abs(lm.Visual.localPosition.y + 1.6f) > 0.01f) Fail($"{z.Key} 휨 {lm.Visual.localPosition.y} ≠ -1.6");
                if (player != null) lm.Follow(player.transform.position);
            }
            // 자막 — 하나로 본다
            ForestLandmark.ResetForTest();
            var a = lms[0];
            string name = ForestBiomeData.Zones[a.ZoneIndex].LandmarkName;
            if (a.Tick(20f)) Fail("먼 데서 명소 자막");
            if (!a.Tick(3f) || !a.LastText.Contains(name) || !a.LastText.Contains("◆")) Fail($"가까이 와도 명소 자막 없음 \"{a.LastText}\"");
            string firstText = a.LastText;
            if (a.Tick(3f)) Fail("머무는 동안 자막이 또 뜸");
            a.Tick(10f);
            if (!a.Tick(3f) || a.LastText == firstText) Fail($"다시 온 자막이 처음과 같음 \"{a.LastText}\"");
            if (ForestLandmark.SeenCount != 1) Fail($"본 명소 {ForestLandmark.SeenCount} ≠ 1");
            a.Tick(10f);
            ForestLandmark.ResetForTest();
            return $" 명소 모양 조각 {pieces}";
        }

        private static void CheckZoneTracker()
        {
            var t = ForestZoneTracker.Instance;
            if (t == null) { Fail("ForestZoneTracker 가 안 붙음"); return; }
            ForestZoneTracker.ResetForTest();
            var z0 = ForestBiomeData.Zones[0];
            var c0 = new Vector3(z0.Center.x, 0f, z0.Center.y);
            t.Tick(Vector3.zero, 1f); // 마을에서 시작(이미 마을이면 조용)
            if (!t.Tick(c0, 1f) || t.CurrentZone != 0) Fail("존에 들어도 자막 없음");
            else if (!t.LastText.Contains(z0.Hanja) || !t.LastText.Contains(ForestCreature.KindName(z0.Roster[0])) || !t.LastText.Contains(z0.Lore)) Fail($"첫 존 자막 \"{t.LastText}\"");
            if (t.Tick(c0, 1f)) Fail("같은 존인데 자막이 또 뜸");
            if (!t.Tick(Vector3.zero, 1f) || t.CurrentZone != -1) Fail("마을 복귀 자막 없음");
            if (!t.Tick(c0, 1f) || t.LastText.Contains(z0.Lore)) Fail($"다시 온 존 자막에 사연 \"{t.LastText}\"");
            var player = GameObject.FindWithTag("Player");
            t.Tick(player != null ? player.transform.position : Vector3.zero, 1f);
            ForestZoneTracker.ResetForTest();
        }

        private static void Fail(string msg)
        {
            _ok = false;
            Debug.LogError($"[PlaytestForestHeadless] zones: {msg}");
        }
    }
}
