using UnityEngine;
using Saga.Go.Combat;
using Saga.Go.Data;
using Saga.Go.Player;
using Saga.Go.UI;
using Saga.Go.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 107-3 남은 것 — "걸어 오르는 경사·고개"·"지역마다 바이옴" 진단. `PlaytestHeadless` 가 지역 지도 진단 뒤에 부른다.
    /// 비탈은 진단이 실제로 `Step` 으로 걸어 오르고(등반 없이·스태미나 안 씀), 고개는 넘어 반대편 칸까지 내려간다.
    /// 끝나면 플레이어 자리·안개를 시작 때로.
    /// </summary>
    public static class PlaytestGoSlopesBiome
    {
        private const float Dt = 0.02f;
        private static string _tag;
        private static bool _ok;
        private static string _metrics = "";

        public static bool Run(string tag)
        {
            _tag = tag;
            _ok = true;
            _metrics = "";
            DuelGate.ResetForTest();
            var fc = FieldCombat.Instance;
            var pc = fc != null ? fc.GetComponent<PlayerController>() : null;
            var atmo = WorldMapBuilder.Instance != null ? WorldMapBuilder.Instance.GetComponent<RegionAtmosphere>() : null;
            if (pc == null) { Fail("PlayerController 없음"); return false; }
            try
            {
                CheckRampData();
                foreach (var r in TestMapData.Ramps) CheckRampSurface(r);
                CheckWalkUp(pc, Find("tower_slope"));
                CheckPass(pc);
                if (atmo == null) Fail("RegionAtmosphere 가 안 붙음");
                else CheckAtmosphere(atmo);
                CheckMapLabels();
            }
            finally
            {
                pc.ClearTestInput();
                pc.Teleport(fc.SafePoint);
                GoStamina.ResetFull();
                if (atmo != null) atmo.Tick(TestMapData.WorldPos(2.5f, 3f), 60f);
            }
            if (_ok) Debug.Log($"[{_tag}] slopes/biome OK - 비탈 {TestMapData.Ramps.Length}(28°·걸어 오름·등반 없음)·고개 넘기·바이옴 {GoWorldMap.Atmospheres.Length}(안개·짙기·햇빛 스며듦) |{_metrics}");
            return _ok;
        }

        private static void Fail(string msg)
        {
            Debug.LogError($"[{_tag}] slopes/biome: {msg}");
            _ok = false;
        }

        private static TestMapData.Ramp Find(string id)
        {
            foreach (var r in TestMapData.Ramps) if (r.Id == id) return r;
            Fail($"비탈 {id} 가 없음");
            return TestMapData.Ramps[0];
        }

        private static void CheckRampData()
        {
            foreach (var r in TestMapData.Ramps)
            {
                char foot = TestMapData.TileAt(r.Gx, r.Gy), high = TestMapData.TileAt(r.Gx + r.Dx, r.Gy + r.Dy);
                if (foot == '^' || TestMapData.IsWater(foot)) Fail($"{r.Id} 발치 칸이 걸을 수 없음({foot})");
                if (high != '^') Fail($"{r.Id} 가 산 칸으로 안 오름({high})");
                if (TestMapData.HasPeak(r.Gx + r.Dx, r.Gy + r.Dy)) Fail($"{r.Id} 윗끝 산 칸에 봉우리가 겹침");
                if (Mathf.Abs(r.Dx) + Mathf.Abs(r.Dy) != 1) Fail($"{r.Id} 방향이 네 방향 중 하나가 아님");
                TestMapData.RampGeometry(r, out Vector3 b, out _, out Vector3 dir, out _);
                var (bgx, bgy) = TestMapData.WorldToGrid(b - dir * 0.5f);
                if (bgx != r.Gx || bgy != r.Gy) Fail($"{r.Id} 아래끝이 발치 칸 밖({bgx},{bgy})");
            }
            if (!System.Array.Exists(TestMapData.Ramps, r => r.Id == "pass_north") || !System.Array.Exists(TestMapData.Ramps, r => r.Id == "pass_south"))
                Fail("고개 양쪽 비탈이 없음");
        }

        private static void CheckRampSurface(TestMapData.Ramp r)
        {
            TestMapData.RampGeometry(r, out Vector3 b, out Vector3 t, out _, out _);
            Vector3 mid = (b + t) * 0.5f;
            if (!Physics.Raycast(mid + Vector3.up * 30f, Vector3.down, out RaycastHit hit, 80f, ~0, QueryTriggerInteraction.Ignore))
            { Fail($"{r.Id} 가운데에 충돌면이 없음"); return; }
            if (Mathf.Abs(hit.point.y - mid.y) > 0.4f) Fail($"{r.Id} 가운데 높이 {hit.point.y:F1} ≠ {mid.y:F1}");
            float want = Mathf.Cos(TestMapData.RampSlopeDeg * Mathf.Deg2Rad);
            if (Mathf.Abs(hit.normal.y - want) > 0.03f) Fail($"{r.Id} 윗면 법선 y {hit.normal.y:F2} ≠ {want:F2}");
            if (hit.normal.y < 0.5f) Fail($"{r.Id} 윗면이 등반할 만큼 가파름");
        }

        /// <summary>발치 3m 앞에서 오르는 쪽으로 걷는다 — 고원 높이에 땅을 딛고 서면 성공. 등반·스태미나는 안 쓴다.</summary>
        private static bool CheckWalkUp(PlayerController pc, TestMapData.Ramp r)
        {
            TestMapData.RampGeometry(r, out Vector3 b, out Vector3 t, out Vector3 dir, out _);
            pc.Teleport(b - dir * 3f + Vector3.up * 0.1f);
            GoStamina.ResetFull();
            pc.SetTestInput(new Vector2(dir.x, dir.z), false);
            bool climbed = false, reached = false;
            float time = 0f;
            for (; time < 20f; time += Dt)
            {
                pc.Step(Dt);
                if (pc.Mode == PlayerController.MoveMode.Climb || pc.Mode == PlayerController.MoveMode.Mantle) climbed = true;
                if (pc.Mode == PlayerController.MoveMode.Ground && pc.transform.position.y > t.y - 0.5f) { reached = true; break; }
            }
            pc.ClearTestInput();
            if (!reached) { Fail($"{r.Id} 을 걸어서 못 오름(y {pc.transform.position.y:F1} / {t.y:F1}, mode {pc.Mode})"); return false; }
            if (climbed) Fail($"{r.Id} 을 오르다 등반·넘어오르기로 바뀜");
            if (GoStamina.Value < GoStamina.Max - 0.01f) Fail($"{r.Id} 걸어 오르는데 스태미나가 닳음({GoStamina.Value:F0})");
            _metrics += $" · {r.Id} {t.y - b.y:F1}m {time:F1}s";
            return true;
        }

        /// <summary>고개 — 남쪽 공터 숲(1,7)에서 올라 (1,8) 고원을 가로질러 끝 논밭 숲(1,9)으로 비탈로 내려간다(떨어지지 않고).</summary>
        private static void CheckPass(PlayerController pc)
        {
            var up = Find("pass_north");
            if (!CheckWalkUp(pc, up)) return;
            var down = Find("pass_south");
            TestMapData.RampGeometry(down, out Vector3 db, out _, out Vector3 ddir, out _);
            pc.SetTestInput(new Vector2(-ddir.x, -ddir.z), false);
            float air = 0f, time = 0f;
            bool arrived = false;
            for (; time < 30f; time += Dt)
            {
                pc.Step(Dt);
                if (pc.Mode == PlayerController.MoveMode.Air) air += Dt;
                if (pc.Mode == PlayerController.MoveMode.Climb) { Fail("고개를 넘다 등반으로 바뀜"); break; }
                var (gx, gy) = TestMapData.WorldToGrid(pc.transform.position);
                if (gx == down.Gx && gy == down.Gy && pc.Mode == PlayerController.MoveMode.Ground
                    && pc.transform.position.y < TestMapData.GroundHeight(down.Gx, down.Gy) + 0.5f) { arrived = true; break; }
            }
            pc.ClearTestInput();
            if (!arrived) { Fail($"고개를 넘어 (1,9) 에 못 내려섬(자리 {pc.transform.position}, mode {pc.Mode})"); return; }
            // 15m 절벽에서 떨어지면 공중 1.2초 남짓 — 비탈로 걸어 내려왔으면 훨씬 짧다
            if (air > 0.6f) Fail($"고개 내리막에서 공중 {air:F2}s — 비탈이 아니라 떨어짐");
            _metrics += $" · 고개 넘기 {time:F1}s 공중 {air:F2}s";
        }

        private static void CheckAtmosphere(RegionAtmosphere atmo)
        {
            foreach (var reg in GoWorldMap.Regions)
                if (!System.Array.Exists(GoWorldMap.Atmospheres, a => a.RegionId == reg.Id)) Fail($"지역 {reg.Id} 바이옴이 없음");
            Vector3 village = TestMapData.WorldPos(2.5f, 3f), river = TestMapData.WorldPos(1f, 5f), west = TestMapData.WorldPos(0f, 3f);
            atmo.Tick(village, 60f);
            var riverA = GoWorldMap.AtmosphereOf("river");
            atmo.Tick(river, 0.5f);
            if (atmo.CurrentRegion != "river") Fail($"강 칸인데 지역이 {atmo.CurrentRegion}");
            float d0 = ColorDist(RenderSettings.fogColor, riverA.Fog);
            if (d0 < 0.01f) Fail("안개가 경계에서 툭 바뀜(스며들지 않음)");
            atmo.Tick(river, 30f);
            if (ColorDist(RenderSettings.fogColor, riverA.Fog) > 0.01f) Fail("강에 오래 있어도 물안개 빛깔이 아님");
            if (Mathf.Abs(RenderSettings.fogDensity - SkyFogBuilder.FogDensity * riverA.DensityMul) > 0.0001f) Fail($"강 안개 짙기 {RenderSettings.fogDensity:F4}");
            if (ColorDist(atmo.SunTint, riverA.Sun) > 0.01f) Fail("강 햇빛 빛깔이 안 바뀜");
            atmo.Tick(west, 30f);
            if (Mathf.Abs(RenderSettings.fogDensity - SkyFogBuilder.FogDensity * GoWorldMap.AtmosphereOf("west_wood").DensityMul) > 0.0001f) Fail("서쪽 숲길 안개 짙기가 틀림");
            atmo.Tick(village, 60f);
            if (ColorDist(RenderSettings.fogColor, SkyFogBuilder.FogColor) > 0.01f || Mathf.Abs(RenderSettings.fogDensity - SkyFogBuilder.FogDensity) > 0.0001f)
                Fail("마을로 돌아왔는데 기본 안개가 아님");
        }

        /// <summary>M 지도 "고개"·"비탈" 표시 — 안 가 본 지역이면 숨고, 발 디디면 보인다. 지도 상태는 되돌린다.</summary>
        private static void CheckMapLabels()
        {
            var ui = WorldMapUi.Instance;
            if (ui == null) { Fail("WorldMapUi 없음"); return; }
            int want = 0;
            foreach (var r in TestMapData.Ramps) if (!string.IsNullOrEmpty(r.LabelKo)) want++;
            if (ui.RampLabelCount != want || want < 2) { Fail($"지도 비탈 표시 {ui.RampLabelCount} ≠ {want}"); return; }
            var wp = WorldMapState.SnapshotWaypoints();
            var rg = WorldMapState.SnapshotRegions();
            bool rev = WorldMapState.Revealed;
            try
            {
                WorldMapState.Restore(null, null, false);
                ui.Open();
                for (int i = 0; i < want; i++) if (ui.RampLabelShown(i)) Fail("안 가 본 지역의 비탈 표시가 보임");
                WorldMapState.Visit("south_glade");
                ui.Open();
                for (int i = 0; i < want; i++) if (!ui.RampLabelShown(i)) Fail("남쪽 공터에 발 디뎠는데 고개·비탈 표시가 안 보임");
            }
            finally
            {
                WorldMapState.Restore(wp, rg, rev);
                ui.Close();
            }
        }

        private static float ColorDist(Color a, Color b) => Mathf.Abs(a.r - b.r) + Mathf.Abs(a.g - b.g) + Mathf.Abs(a.b - b.b);
    }
}
