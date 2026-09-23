using UnityEngine;
using Saga.Go.Combat;
using Saga.Go.Data;
using Saga.Go.Player;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 107 ② "이동" 진단 — `PlaytestHeadless` 가 들판 전투 진단 뒤에 부른다. 같은 프레임 안에서
    /// `PlayerController.Step(dt)` 을 잘게 돌려 시간을 흘리고, 입력은 `SetTestInput`(월드 +X/+Z 곧장)으로 준다.
    /// 자리(글자 지도 칸): 점프 = 마을 스폰 · 등반/활공 = (2,7) 들판 → 북쪽 (2,6) 안쪽 산 남면 ·
    /// 수영 = (1,4) 들판 → 남쪽 (1,5) 강 · 경계 = (1,0) 테두리 산 꼭대기의 북쪽 끝.
    /// </summary>
    public static class PlaytestGoTraversal
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
            var fc = FieldCombat.Instance;
            var pc = fc != null ? fc.GetComponent<PlayerController>() : Object.FindFirstObjectByType<PlayerController>();
            if (pc == null) { Fail("PlayerController 없음"); return false; }
            if (!pc.Traversal) { Fail("TestVillage 플레이어의 traversal 이 꺼져 있음(씬 재빌드?)"); return false; }
            Vector3 home = fc != null ? fc.SafePoint : pc.transform.position;

            try
            {
                CheckTerrainData();
                CheckJump(pc, home);
                CheckClimbAndGlide(pc, fc);
                CheckSwim(pc);
                CheckBoundary(pc);
            }
            finally
            {
                pc.ClearTestInput();
                pc.Teleport(home);
                GoStamina.ResetFull();
            }
            if (_ok) Debug.Log($"[{_tag}] traversal OK - 점프·등반/넘어오르기·활공·수영/강둑·익사 복귀·경계벽·적 칸 제한 |{_metrics}");
            return _ok;
        }

        private static bool HasParam(Animator a, string name)
        {
            if (a == null || a.runtimeAnimatorController == null) return false;
            foreach (var p in a.parameters) if (p.name == name) return true;
            return false;
        }

        private static void Fail(string msg)
        {
            Debug.LogError($"[{_tag}] traversal: {msg}");
            _ok = false;
        }

        private static void Steps(PlayerController pc, float seconds)
        {
            for (float t = 0f; t < seconds; t += Dt) pc.Step(Dt);
        }

        private static bool StepUntil(PlayerController pc, float maxSeconds, System.Func<bool> done)
        {
            for (float t = 0f; t < maxSeconds; t += Dt)
            {
                pc.Step(Dt);
                if (done()) return true;
            }
            return false;
        }

        private static void CheckTerrainData()
        {
            float inner = TestMapData.MountainHeight(2, 6), border = TestMapData.MountainHeight(1, 0);
            if (inner < 12f || inner > 22f) Fail($"안쪽 산 높이 {inner} 가 12~22 밖");
            if (border < 30f || border > 38f) Fail($"테두리 산 높이 {border} 가 30~38 밖");
            if (TestMapData.MountainHeight(2, 6) != inner) Fail("산 높이 해시가 흔들림");
            Vector3 top = TestMapData.WorldPos(2, 6) + Vector3.up * 80f;
            if (!Physics.Raycast(top, Vector3.down, out RaycastHit hit, 200f, ~0, QueryTriggerInteraction.Ignore) || Mathf.Abs(hit.point.y - inner) > 0.1f)
                Fail($"(2,6) 산 고원 충돌 높이가 {inner} 가 아님");
            if (FieldEnemy.CanStandOn(TestMapData.WorldPos(1, 5)) || FieldEnemy.CanStandOn(TestMapData.WorldPos(2, 6)) || !FieldEnemy.CanStandOn(TestMapData.WorldPos(2, 7)))
                Fail("들판 적 칸 제한(강·산 금지, 들 허용)이 틀림");
        }

        private static void CheckJump(PlayerController pc, Vector3 home)
        {
            pc.SetTestInput(Vector2.zero, false);
            pc.Teleport(home);
            StepUntil(pc, 2f, () => pc.Mode == PlayerController.MoveMode.Ground);
            float y0 = pc.transform.position.y, peak = y0;
            pc.RequestJump();
            bool left = false;
            for (float t = 0f; t < 3f; t += Dt)
            {
                pc.Step(Dt);
                peak = Mathf.Max(peak, pc.transform.position.y);
                if (pc.Mode == PlayerController.MoveMode.Air) left = true;
                if (left && pc.Mode == PlayerController.MoveMode.Ground) break;
            }
            float rise = peak - y0;
            _metrics += $" 점프 {rise:F2}m";
            if (!left) Fail("점프해도 공중으로 안 뜸");
            if (rise < 2.0f || rise > 2.9f) Fail($"점프 높이 {rise:F2}m 가 2.0~2.9 밖(목표 2.4)");
            if (pc.Mode != PlayerController.MoveMode.Ground) Fail("점프 뒤 착지 안 함");
        }

        private static void CheckClimbAndGlide(PlayerController pc, FieldCombat fc)
        {
            float mountain = TestMapData.MountainHeight(2, 6);
            Vector3 c = TestMapData.WorldPos(2, 7);
            float wallZ = TestMapData.WorldPos(2, 6).z + TestMapData.TileSize * 0.5f;
            pc.Teleport(new Vector3(c.x, TestMapData.GroundHeight(2, 7) + 0.2f, wallZ + 3f));
            GoStamina.ResetFull();
            pc.SetTestInput(new Vector2(0f, -1f), false); // 북(-Z) 벽 쪽으로
            if (!StepUntil(pc, 2f, () => pc.Mode == PlayerController.MoveMode.Climb)) { Fail($"절벽을 향해 밀었는데 안 붙음(mode {pc.Mode})"); return; }
            if (fc != null && fc.Attack() != -1) Fail("등반 중에 들판 공격이 나감");
            if (HasParam(pc.Animator, "Climb") && !pc.Animator.GetBool("Climb")) Fail("등반 중인데 Animator Climb 가 꺼져 있음");

            pc.SetTestInput(new Vector2(0f, 1f), false); // 등반 중 raw.y = 위
            bool mantled = false;
            float climbT = 0f;
            bool topped = StepUntil(pc, 30f, () =>
            {
                climbT += Dt;
                if (pc.Mode == PlayerController.MoveMode.Mantle) mantled = true;
                return pc.Mode == PlayerController.MoveMode.Ground && pc.transform.position.y > mountain - 1f;
            });
            if (!topped) { Fail($"(2,6) 산({mountain:F1}m) 꼭대기까지 못 오름 — y {pc.transform.position.y:F1}, mode {pc.Mode}, 기력 {GoStamina.Value:F0}"); return; }
            if (!mantled) Fail("꼭대기에서 넘어오르기(Mantle)를 안 거침");
            float used = GoStamina.Max - GoStamina.Value;
            _metrics += $" · 등반 {mountain:F1}m {climbT:F1}s 기력 {used:F0}";
            if (used < mountain / PlayerController.ClimbSpeed * PlayerController.ClimbStaminaPerSec * 0.6f) Fail($"등반 스태미나가 너무 적게 닳음({used:F0})");

            // 활공 — 남쪽(+Z) 절벽 끝으로 걸어 나가 떨어지다가 4m 넘으면 Space
            GoStamina.ResetFull();
            pc.SetTestInput(new Vector2(0f, 1f), false);
            if (!StepUntil(pc, 3f, () => pc.Mode == PlayerController.MoveMode.Air && pc.HeightAboveGround() >= PlayerController.GlideMinHeight))
            { Fail($"절벽 끝에서 떨어지지 않음(mode {pc.Mode})"); return; }
            pc.RequestJump();
            pc.Step(Dt);
            if (pc.Mode != PlayerController.MoveMode.Glide) { Fail($"공중 Space 로 활공이 안 됨(mode {pc.Mode})"); return; }
            if (HasParam(pc.Animator, "Glide") && !pc.Animator.GetBool("Glide")) Fail("활공 중인데 Animator Glide 가 꺼져 있음");
            _metrics += HasParam(pc.Animator, "Glide") ? " · 전용 클립 있음" : " · 전용 클립 없음(폴백)";
            Vector3 a = pc.transform.position;
            Steps(pc, 1f);
            Vector3 b = pc.transform.position;
            float drop = a.y - b.y, run = new Vector2(b.x - a.x, b.z - a.z).magnitude;
            _metrics += $" · 활공 낙하 {drop:F2}/s 전진 {run:F2}/s({pc.Mode})";
            if (pc.Mode == PlayerController.MoveMode.Glide && (drop < 2.3f || drop > 3.7f)) Fail($"활공 낙하 {drop:F2}m/s 가 3 근처가 아님");
            if (pc.Mode == PlayerController.MoveMode.Glide && (run < 8f || run > 11f)) Fail($"활공 전진 {run:F2}m/s 가 10 근처가 아님");
            if (GoStamina.Value >= GoStamina.Max) Fail("활공에 스태미나가 안 닳음");
            if (!StepUntil(pc, 10f, () => pc.Mode == PlayerController.MoveMode.Ground)) Fail($"활공 뒤 착지 안 함(mode {pc.Mode})");
        }

        private static void CheckSwim(PlayerController pc)
        {
            Vector3 land = TestMapData.WorldPos(1, 4);
            float bankZ = land.z + TestMapData.TileSize * 0.5f;
            pc.Teleport(new Vector3(land.x, TestMapData.GroundHeight(1, 4) + 0.2f, bankZ - 3f));
            GoStamina.ResetFull();
            pc.SetTestInput(Vector2.zero, false);
            Steps(pc, 1f); // 마지막 땅 기록
            Vector3 lastLand = pc.LastLand;
            if ((lastLand - pc.transform.position).magnitude > 1.5f) Fail("땅에 서 있는데 마지막 땅이 안 기록됨");

            pc.SetTestInput(new Vector2(0f, 1f), false); // 남(+Z) 강으로
            if (!StepUntil(pc, 4f, () => pc.Mode == PlayerController.MoveMode.Swim)) { Fail($"강에 들어가도 수영이 안 됨(mode {pc.Mode}, y {pc.transform.position.y:F2})"); return; }
            Steps(pc, 1.5f);
            float want = TestMapData.WaterSurfaceHeight - PlayerController.SwimDepth;
            if (pc.Mode != PlayerController.MoveMode.Swim) Fail($"헤엄치다 수영이 풀림(mode {pc.Mode})");
            _metrics += $" · 수영 y {pc.transform.position.y:F2}(목표 {want:F2}) 기력 {GoStamina.Value:F0}";
            if (Mathf.Abs(pc.transform.position.y - want) > 0.35f) Fail($"수영 높이 {pc.transform.position.y:F2} ≠ {want:F2}");
            if (GoStamina.Value >= GoStamina.Max) Fail("수영에 스태미나가 안 닳음");

            // 강둑으로 돌아와 기어올라 나온다
            GoStamina.ResetFull();
            pc.SetTestInput(new Vector2(0f, -1f), false);
            if (!StepUntil(pc, 6f, () => pc.Mode == PlayerController.MoveMode.Climb)) Fail($"강둑을 못 잡음(mode {pc.Mode})");
            pc.SetTestInput(new Vector2(0f, 1f), false);
            if (!StepUntil(pc, 8f, () => pc.Mode == PlayerController.MoveMode.Ground && pc.transform.position.y > -0.5f))
                Fail($"강둑을 기어올라 못 나옴(mode {pc.Mode}, y {pc.transform.position.y:F2})");

            // 익사 — 물 한가운데서 기력이 다하면 마지막 땅으로
            pc.SetTestInput(Vector2.zero, false);
            Steps(pc, 1f);
            lastLand = pc.LastLand;
            Vector3 river = TestMapData.WorldPos(1, 5);
            pc.Teleport(new Vector3(river.x, want, river.z));
            StepUntil(pc, 2f, () => pc.Mode == PlayerController.MoveMode.Swim);
            if (pc.Mode != PlayerController.MoveMode.Swim) { Fail("강 한가운데서 수영 상태가 안 됨"); return; }
            GoStamina.SetForTest(0.5f);
            pc.SetTestInput(new Vector2(1f, 0f), true);
            if (!StepUntil(pc, 3f, () => pc.Mode != PlayerController.MoveMode.Swim)) { Fail("기력 0 인데 계속 헤엄침"); return; }
            if ((pc.transform.position - lastLand).magnitude > 1.5f) Fail($"익사 뒤 마지막 땅으로 안 감(거리 {(pc.transform.position - lastLand).magnitude:F1})");
            if (GoStamina.Value < GoStamina.Max) Fail("익사 복귀 뒤 기력이 안 참");
        }

        private static void CheckBoundary(PlayerController pc)
        {
            Vector3 c = TestMapData.WorldPos(1, 0);
            float edgeZ = c.z - TestMapData.TileSize * 0.5f;
            pc.Teleport(new Vector3(c.x, TestMapData.MountainHeight(1, 0) + 0.2f, edgeZ + 3f));
            pc.SetTestInput(new Vector2(0f, -1f), false); // 지도 밖(-Z)으로
            bool climbed = false;
            for (float t = 0f; t < 1.5f; t += Dt)
            {
                pc.Step(Dt);
                if (pc.Mode == PlayerController.MoveMode.Climb) climbed = true;
            }
            if (climbed) Fail("지도 경계벽을 기어오름(NoClimb 무시)");
            if (pc.transform.position.z < edgeZ) Fail($"지도 경계 밖으로 나감(z {pc.transform.position.z:F1} < {edgeZ:F1})");
        }
    }
}
