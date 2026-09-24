using UnityEngine;
using Saga.Dungeon.Cinematics;
using Saga.Dungeon.Data;
using Saga.Dungeon.Player;
using Saga.Dungeon.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 106-5 "탐험" 진단 — `PlaytestDungeonHeadless` 가 능묘 진단 바로 앞에서 부른다. 진단이 `Step` 으로
    /// 실제로 걷고·뛰고·기어오른다: Room2 동쪽 문으로 뜰까지 걷기 · 점프 1.3m · 징검돌을 점프 없이 못 오름 → 점프로 선반까지 →
    /// 선반 상자 · 방 벽·돌은 못 오름 · 탑 밑에선 꼭대기 상자가 안 열림 · 탑을 기어올라 넘어오름 → 꼭대기 상자 · 등반 중
    /// 회피 막힘·F 로 손 놓기 · 탑에서 뛰어내려도 벽 위(막이)에 못 올라섬. 끝나면 자리·진행 비트·돈/경험치를 되돌린다.
    /// </summary>
    public static class PlaytestDungeonExplore
    {
        private const string T = "[PlaytestDungeonHeadless] explore";
        private const float Dt = 0.02f;
        private static bool _ok;
        private static string _metrics = "";

        public static bool Run()
        {
            _ok = true;
            _metrics = "";
            var playerGo = GameObject.FindWithTag("Player");
            var pc = playerGo != null ? playerGo.GetComponent<PlayerController>() : null;
            var hint = Object.FindFirstObjectByType<WatchCourtHint>();
            TempleChest towerChest = null, ledgeChest = null;
            foreach (var c in Object.FindObjectsByType<TempleChest>(FindObjectsSortMode.None))
            {
                if (c.name == "WatchChest_Tower") towerChest = c;
                else if (c.name == "WatchChest_Ledge") ledgeChest = c;
            }
            if (pc == null || hint == null || towerChest == null || ledgeChest == null)
            {
                Fail($"필요한 것 없음(pc {pc != null}, hint {hint != null}, 탑 상자 {towerChest != null}, 선반 상자 {ledgeChest != null}) — 씬 재빌드?");
                return false;
            }
            Vector3 start = playerGo.transform.position;
            int keys = TempleState.SmallKeys, flags = (int)TempleState.Flags;
            int level = HeroState.Level, exp = HeroState.Exp, hp = HeroState.Hp, gold = HeroState.Gold;
            string weapon = HeroState.EquippedWeaponId, gem = HeroState.SocketedGemId;
            Vector3 c0 = BuildDungeonWatchCourt.CourtCenter;
            try
            {
                DungeonCutscenes.Instance?.Skip();
                CheckWalkIn(pc, hint);
                CheckJumpHeight(pc, c0);
                CheckNoClimbWalls(pc, c0);
                CheckGapNeedsJump(pc, c0);
                CheckCourse(pc, ledgeChest, c0);
                CheckTower(pc, towerChest, c0);
                CheckBarrier(pc, c0);
            }
            finally
            {
                DungeonCutscenes.Instance?.Skip();
                pc.ClearTestInput();
                pc.Teleport(start);
                TempleState.Restore(keys, flags);
                HeroState.Restore(level, exp, hp, gold, weapon, gem);
            }
            if (_ok) Debug.Log($"{T} OK - 동쪽 문→뜰·안내·점프·징검돌→선반 상자·벽/돌 못 오름·탑 밑 상자 안 열림·탑 등반→꼭대기 상자·등반 중 회피 막힘·손 놓기·막이 |{_metrics}");
            return _ok;
        }

        private static void Fail(string msg)
        {
            Debug.LogError($"{T}: {msg}");
            _ok = false;
        }

        private static Vector3 L(Vector3 c0, float x, float y, float z) => c0 + new Vector3(x, y, z);

        private static void CheckWalkIn(PlayerController pc, WatchCourtHint hint)
        {
            hint.ResetForTest();
            pc.Teleport(new Vector3(6f, 0.1f, 30f));
            pc.SetTestInput(new Vector2(1f, 0f));
            bool inside = false;
            for (float t = 0f; t < 8f; t += Dt)
            {
                pc.Step(Dt);
                if (pc.transform.position.x > BuildDungeonWatchCourt.CourtCenter.x - 8f) { inside = true; break; }
            }
            pc.ClearTestInput();
            if (!inside) { Fail($"Room2 동쪽 문으로 뜰까지 못 걸어감(x {pc.transform.position.x:F1})"); return; }
            if (!hint.Tick(pc.transform.position)) Fail("뜰에 들어섰는데 안내가 안 뜸");
            if (hint.Tick(pc.transform.position)) Fail("안내가 두 번 뜸");
        }

        private static void CheckJumpHeight(PlayerController pc, Vector3 c0)
        {
            pc.Teleport(L(c0, -5f, 0.05f, 4f));
            for (int i = 0; i < 5; i++) pc.Step(Dt);
            float y0 = pc.transform.position.y, peak = y0;
            pc.RequestJump();
            for (float t = 0f; t < 2f; t += Dt)
            {
                pc.Step(Dt);
                peak = Mathf.Max(peak, pc.transform.position.y);
                if (t > 0.2f && pc.Mode == PlayerController.MoveMode.Ground) break;
            }
            float h = peak - y0;
            if (Mathf.Abs(h - 1.3f) > 0.15f) Fail($"점프 높이 {h:F2}m ≠ 1.3");
            if (pc.Mode != PlayerController.MoveMode.Ground) Fail("점프 뒤 땅에 안 내려섬");
            _metrics += $" 점프 {h:F2}m";
        }

        /// <summary>방 벽·징검돌은 DungeonClimbable 이 없어 밀어도 안 붙는다.</summary>
        private static void CheckNoClimbWalls(PlayerController pc, Vector3 c0)
        {
            if (PushFor(pc, L(c0, -5f, 0.05f, 8.3f), new Vector2(0f, 1f), 1.5f, out float maxY) || maxY > 0.5f) Fail("방 벽을 기어오름");
            float stoneX = BuildDungeonWatchCourt.StoneX[0];
            if (PushFor(pc, L(c0, stoneX - BuildDungeonWatchCourt.StoneLength * 0.5f - 0.6f, 0.05f, BuildDungeonWatchCourt.CourseZ), new Vector2(1f, 0f), 1.5f, out maxY) || maxY > 0.5f)
                Fail($"첫 징검돌(0.9m)에 점프 없이 올라섬/붙음(최고 {maxY:F2})");
        }

        private static bool PushFor(PlayerController pc, Vector3 from, Vector2 dir, float sec, out float maxY)
        {
            pc.Teleport(from);
            pc.SetTestInput(dir);
            bool climbed = false;
            float y0 = pc.transform.position.y;
            maxY = 0f;
            for (float t = 0f; t < sec; t += Dt)
            {
                pc.Step(Dt);
                if (pc.Climbing) climbed = true;
                maxY = Mathf.Max(maxY, pc.transform.position.y - y0);
            }
            pc.ClearTestInput();
            return climbed;
        }

        /// <summary>동쪽으로 걸으며 앞에 턱이 있거나 발밑 앞이 꺼지면 뛴다 — 징검돌 셋을 올라 선반에 서고 상자를 연다.</summary>
        private static void CheckCourse(PlayerController pc, TempleChest chest, Vector3 c0)
        {
            float z = BuildDungeonWatchCourt.CourseZ;
            pc.Teleport(L(c0, BuildDungeonWatchCourt.StoneX[0] - BuildDungeonWatchCourt.StoneLength * 0.5f - 0.6f, 0.05f, z));
            int gold = HeroState.Gold;
            pc.SetTestInput(new Vector2(1f, 0f));
            int jumps = 0;
            bool onLedge = false;
            float time = 0f;
            for (; time < 15f; time += Dt)
            {
                if (pc.Mode == PlayerController.MoveMode.Ground && NeedJump(pc)) { pc.RequestJump(); jumps++; }
                pc.Step(Dt);
                if (pc.Climbing) { Fail("징검돌을 기어오름(점프로만 올라야)"); break; }
                chest.Tick();
                Vector3 local = pc.transform.position - c0;
                if (local.x > BuildDungeonWatchCourt.LedgeMinX + 0.5f && local.y > BuildDungeonWatchCourt.LedgeTop - 0.2f) onLedge = true;
                if (chest.IsOpened) break;
            }
            pc.ClearTestInput();
            DungeonCutscenes.Instance?.Skip(); // 상자 컷 — 도는 동안엔 이동이 멈춘다
            if (!onLedge) { Fail($"징검돌로 선반까지 못 감(자리 {pc.transform.position - c0}, 점프 {jumps})"); return; }
            if (!chest.IsOpened) { Fail("선반 끝까지 갔는데 상자가 안 열림"); return; }
            if (jumps < 3) Fail($"0.9m 턱 셋인데 점프 {jumps}번");
            if (HeroState.Gold != gold + BuildDungeonWatchCourt.LedgeGold) Fail($"선반 상자 금 {HeroState.Gold - gold} ≠ {BuildDungeonWatchCourt.LedgeGold}");
            if (!TempleState.Has(TempleFlag.WatchLedgeChest)) Fail("선반 상자 비트가 안 섬");
            _metrics += $" · 징검돌 점프 {jumps}번 {time:F1}s";
        }

        /// <summary>셋째 돌 위에서 점프 없이 동쪽으로 걸으면 1.2m 틈으로 떨어진다(걸어서 못 건넌다).</summary>
        private static void CheckGapNeedsJump(PlayerController pc, Vector3 c0)
        {
            int last = BuildDungeonWatchCourt.StoneX.Length - 1;
            pc.Teleport(L(c0, BuildDungeonWatchCourt.StoneX[last], BuildDungeonWatchCourt.StoneTop[last] + 0.05f, BuildDungeonWatchCourt.CourseZ));
            pc.SetTestInput(new Vector2(1f, 0f));
            for (float t = 0f; t < 1.5f; t += Dt) pc.Step(Dt);
            pc.ClearTestInput();
            float y = pc.transform.position.y - c0.y;
            if (y > 1f) Fail($"셋째 돌에서 점프 없이 틈을 건넘(높이 {y:F2})");
        }

        private static bool NeedJump(PlayerController pc)
        {
            Vector3 p = pc.transform.position;
            Vector3 fwd = Vector3.right;
            // 앞 0.7m 무릎 높이에 턱
            if (Physics.Raycast(p + Vector3.up * 0.3f, fwd, 0.7f, ~0, QueryTriggerInteraction.Ignore)) return true;
            // 앞 0.5m 발밑이 0.5m 넘게 꺼짐
            if (!Physics.Raycast(p + fwd * 0.5f + Vector3.up * 0.3f, Vector3.down, 0.8f, ~0, QueryTriggerInteraction.Ignore)) return true;
            return false;
        }

        private static void CheckTower(PlayerController pc, TempleChest chest, Vector3 c0)
        {
            Vector3 tw = c0 + BuildDungeonWatchCourt.TowerLocal;
            float half = BuildDungeonWatchCourt.TowerSize * 0.5f;
            Vector3 chestPos = chest.transform.position;
            // 탑 밑(평면 거리는 가깝다) — 높이 차 8m 라 안 열린다
            pc.Teleport(new Vector3(tw.x + half + 0.6f, 0.05f, chestPos.z));
            chest.Tick();
            if (chest.IsOpened) { Fail("탑 밑에서 꼭대기 상자가 열림"); return; }

            // 남쪽 면을 향해 밀어 붙고, 계속 밀어 올라 넘어오른다
            pc.Teleport(new Vector3(tw.x, 0.05f, tw.z - half - 0.7f));
            pc.SetTestInput(new Vector2(0f, 1f));
            bool gripped = false, mantled = false, topped = false;
            float time = 0f;
            for (; time < 12f; time += Dt)
            {
                pc.Step(Dt);
                if (pc.Mode == PlayerController.MoveMode.Climb && !gripped)
                {
                    gripped = true;
                    pc.TryDodge();
                    if (pc.IsDodging) Fail("등반 중에 회피가 나감");
                }
                if (pc.Mode == PlayerController.MoveMode.Mantle) mantled = true;
                if (pc.Mode == PlayerController.MoveMode.Ground && pc.transform.position.y > tw.y + BuildDungeonWatchCourt.TowerHeight - 0.3f) { topped = true; break; }
            }
            if (!gripped) { pc.ClearTestInput(); Fail("담쟁이 탑 면에 안 붙음"); return; }
            if (!topped) { pc.ClearTestInput(); Fail($"탑 꼭대기까지 못 오름(y {pc.transform.position.y:F1}, mode {pc.Mode})"); return; }
            if (!mantled) Fail("꼭대기에서 넘어오르기를 안 거침");
            _metrics += $" · 탑 {BuildDungeonWatchCourt.TowerHeight:F0}m {time:F1}s";
            int gold = HeroState.Gold;
            for (float t = 0f; t < 2f && !chest.IsOpened; t += Dt) { pc.Step(Dt); chest.Tick(); }
            pc.ClearTestInput();
            DungeonCutscenes.Instance?.Skip();
            if (!chest.IsOpened) { Fail("탑 꼭대기에서 상자가 안 열림"); return; }
            if (HeroState.Gold != gold + BuildDungeonWatchCourt.TowerGold) Fail("탑 상자 금이 틀림");
            if (!TempleState.Has(TempleFlag.WatchTowerChest)) Fail("탑 상자 비트가 안 섬");

            // 등반 중 F = 손 놓기
            pc.Teleport(new Vector3(tw.x, 0.05f, tw.z - half - 0.7f));
            pc.SetTestInput(new Vector2(0f, 1f));
            for (float t = 0f; t < 1.5f && pc.Mode != PlayerController.MoveMode.Climb; t += Dt) pc.Step(Dt);
            for (int i = 0; i < 20; i++) pc.Step(Dt); // 조금 오른다
            pc.SetTestInput(Vector2.zero);
            pc.RequestJump();
            pc.Step(Dt);
            if (pc.Climbing) Fail("등반 중 F 로 손을 안 놓음");
            pc.ClearTestInput();
        }

        /// <summary>탑 꼭대기에서 동쪽(가까운 벽)으로 뛰어내려도 벽 위(4m)에 못 서고 뜰 바닥에 내려선다.</summary>
        private static void CheckBarrier(PlayerController pc, Vector3 c0)
        {
            Vector3 tw = c0 + BuildDungeonWatchCourt.TowerLocal;
            pc.Teleport(new Vector3(tw.x + 1.2f, tw.y + BuildDungeonWatchCourt.TowerHeight + 0.05f, tw.z - 1.2f));
            for (int i = 0; i < 3; i++) pc.Step(Dt);
            pc.SetTestInput(new Vector2(1f, 0f));
            pc.RequestJump();
            for (float t = 0f; t < 4f; t += Dt)
            {
                pc.Step(Dt);
                if (t > 0.5f && pc.Mode == PlayerController.MoveMode.Ground) break;
            }
            pc.ClearTestInput();
            Vector3 local = pc.transform.position - c0;
            if (local.y > 1f || local.x > DungeonRoomBuilder.RoomWidth * 0.5f - 0.4f) Fail($"탑에서 뛰어 방 벽을 넘거나 벽 위에 섬(자리 {local})");
        }
    }
}
