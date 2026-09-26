using TMPro;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using Saga.Go.Combat;
using Saga.Go.Data;
using Saga.Go.Player;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 109-8 "인물마다 다른 원소 스킬 모양 + 교체 연출" 진단 — `PlaytestHeadless` 가 인물 몸 진단 뒤에 부른다.
    /// 표(주인공 원형·기질 → 모양·지 인물 장판/소환 둘 다·도감 밖 id 결정성) ·
    /// 찌르기(선 위 8m 적만, 옆 4.5m·뒤는 안 맞음, ×2.3) · 돌진(겨눈 적 앞까지 파고듦·무적·길 위 적) ·
    /// 장판(첫 틱 둘·5초 동안 다섯 틱·밖 적 안 맞음·교체해도 남음) · 소환(정령·1.5초마다 하나씩 여섯 번·교체해도 남음·끝나면 사라짐) ·
    /// 스킬 칸 모양 이름 · 교체 연출(옛 몸이 떼어져 옆뒤로 2.4m×척도 물러남 → 0.9초에 꺼져 제자리 · 새 몸이 옆에서 0.35초 ease-out · 물러나던 몸을 곧바로 부르면 제자리).
    /// 적은 원소 없는 셋만 쓰고 나머지는 멀리 둔다. 끝나면 동행·적·자리를 되돌린다.
    /// </summary>
    public static class PlaytestGoSkillShapes
    {
        private const float Dt = 0.02f;
        private static string _tag;
        private static bool _ok;

        public static bool Run(string tag)
        {
            _tag = tag;
            _ok = true;
            string table = CheckTable();
            var fc = FieldCombat.Instance;
            var pc = fc != null ? fc.GetComponent<PlayerController>() : null;
            var bodies = pc != null ? pc.GetComponent<PartyBodies>() : null;
            if (fc == null || pc == null || bodies == null) { Fail("FieldCombat·PlayerController·PartyBodies 없음"); return false; }

            var foes = FieldEnemy.All.Where(e => e.Alive && !e.IsElemental && !e.IsGuardian && !e.IsHero && e.ShieldMax <= 0f).Take(3).ToList();
            if (foes.Count < 3) { Fail("원소 없는 들판 적이 셋 미만"); return false; }
            var startMembers = new List<string>(PartyState.MemberIds);
            string thrust = First(SkillShape.Thrust), dash = First(SkillShape.Dash), field = First(SkillShape.Field), summon = First(SkillShape.Summon);
            Vector3 origin = fc.SafePoint;
            string result = "";
            try
            {
                DuelGate.ResetForTest();
                int k = 0;
                foreach (var e in FieldEnemy.All) if (!foes.Contains(e)) e.WarpForTest(origin + new Vector3(300f + (k++ % 20) * 4f, 0f, 300f + k / 20 * 4f));
                PartyState.Restore(new[] { thrust, dash, field });
                fc.RebuildParty();
                result += CheckThrust(fc, pc, bodies, foes, origin, thrust);
                result += CheckDash(fc, pc, bodies, foes, origin, dash);
                result += CheckField(fc, pc, bodies, foes, origin, field, dash);
                PartyState.Restore(new[] { thrust, dash, summon });
                fc.RebuildParty();
                result += CheckSummon(fc, pc, bodies, foes, origin, summon);
                result += CheckSwapMotion(fc, pc, bodies, origin, dash, thrust);
            }
            finally
            {
                PartyState.Restore(startMembers);
                fc.RebuildParty();
                foreach (var e in FieldEnemy.All) e.RestoreHomeForTest();
                fc.ResetForTest();
                pc.ClearTestInput();
                pc.Teleport(fc.SafePoint);
                GoStamina.ResetFull();
                DuelGate.ResetForTest();
            }
            if (bodies.InMotion) Fail("진단 뒤 교체 연출이 남음");
            if (pc.Visual != bodies.HeroVisual) Fail("진단 뒤 주인공 몸이 아님");
            if (_ok) Debug.Log($"[{_tag}] skill shapes OK - {table}{result}");
            return _ok;
        }

        private static void Fail(string msg)
        {
            Debug.LogError($"[{_tag}] skill shapes: {msg}");
            _ok = false;
        }

        private static string First(SkillShape s) => GoHeroes.All.First(h => GoSkillShapes.ShapeOf(h.Id) == s).Id;

        // ---- 표 ------------------------------------------------------------------

        private static string CheckTable()
        {
            if (GoSkillShapes.ShapeOf(FieldCombat.HeroId) != SkillShape.Circle) Fail("주인공이 원형이 아님");
            var count = new Dictionary<SkillShape, int>();
            foreach (var h in GoHeroes.All)
            {
                var s = GoSkillShapes.ShapeOf(h.Id);
                count.TryGetValue(s, out int n);
                count[s] = n + 1;
                if (s == SkillShape.Circle) Fail($"{h.Id} 이 원형");
                if (h.Trait == HeroTrait.Might && s != SkillShape.Dash) Fail($"무 {h.Id} 가 돌진이 아님");
                if (h.Trait == HeroTrait.Virtue && s != SkillShape.Thrust) Fail($"덕 {h.Id} 가 찌르기가 아님");
                if (h.Trait == HeroTrait.Wisdom && s != SkillShape.Field && s != SkillShape.Summon) Fail($"지 {h.Id} 가 장판·소환이 아님");
                if (GoSkillShapes.ShapeOf(h.Id) != s) Fail($"{h.Id} 모양이 흔들림");
                if (string.IsNullOrEmpty(GoSkillShapes.Name(s))) Fail($"{s} 이름 없음");
            }
            foreach (SkillShape s in new[] { SkillShape.Thrust, SkillShape.Dash, SkillShape.Field, SkillShape.Summon })
                if (!count.TryGetValue(s, out int n) || n < 12) Fail($"{s} 인물 {n}명(<12)");
            var bandit = GoSkillShapes.ShapeOf(PartyBodies.BanditId);
            if (bandit == SkillShape.Circle || bandit != GoSkillShapes.ShapeOf(PartyBodies.BanditId)) Fail("도감 밖 id 모양이 원형이거나 흔들림");
            var colors = GoHeroes.All.Select(h => GoSkillShapes.FxColor(h.Id, GoHeroes.ElementOf(h))).Distinct().Count();
            if (colors < 7) Fail($"스킬 빛깔 {colors}가지(<7 — 웹 원소 일곱)");
            return $"모양 찌르기{count[SkillShape.Thrust]}·돌진{count[SkillShape.Dash]}·장판{count[SkillShape.Field]}·소환{count[SkillShape.Summon]} 빛깔 {colors}";
        }

        // ---- 넷 ------------------------------------------------------------------

        private static bool Become(FieldCombat fc, PartyBodies bodies, string id)
        {
            int idx = -1;
            for (int i = 0; i < fc.Party.Count; i++) if (fc.Party[i].Id == id) idx = i;
            if (idx < 0) { Fail($"명단에 {id} 가 없음"); return false; }
            if (fc.ActiveIndex != idx)
            {
                fc.TickTimers(FieldCombat.SwapCooldownSec + 0.05f);
                if (!fc.Swap(idx)) { Fail($"{id} 로 교체가 안 됨"); return false; }
            }
            bodies.FinishMotion();
            return true;
        }

        private static Vector3 X(PlayerController pc)
        {
            Vector3 f = pc.Visual != null ? pc.Visual.forward : Vector3.forward;
            f.y = 0f;
            return f.sqrMagnitude > 1e-4f ? f.normalized : Vector3.forward;
        }

        private static string CheckThrust(FieldCombat fc, PlayerController pc, PartyBodies bodies, List<FieldEnemy> foes, Vector3 o, string id)
        {
            fc.ResetForTest();
            pc.Teleport(o);
            if (!Become(fc, bodies, id)) return "";
            Vector3 x = X(pc), z = Vector3.Cross(Vector3.up, x);
            foes[0].WarpForTest(o + x * 8f);
            foes[1].WarpForTest(o + x * 9f + z * 4.5f);
            foes[2].WarpForTest(o - x * 9f);
            float h0 = foes[0].Hp, h1 = foes[1].Hp, h2 = foes[2].Hp;
            float want = fc.Atk * GoSkillShapes.ThrustMul;
            int hits = fc.Skill();
            if (fc.LastShape != SkillShape.Thrust) Fail($"찌르기 인물 스킬이 {fc.LastShape}");
            if (hits != 1) Fail($"찌르기 적중 {hits} ≠ 1");
            if (Mathf.Abs(h0 - foes[0].Hp - Mathf.Min(h0, want)) > 1f) Fail($"찌르기 피해 {h0 - foes[0].Hp:F0} ≠ {want:F0}");
            if (foes[1].Hp < h1 || foes[2].Hp < h2) Fail("찌르기가 옆·뒤 적을 맞힘");
            var hud = fc.GetComponent<FieldCombatHud>();
            string label = "";
            if (hud != null && hud.SkillButton != null)
            {
                hud.Refresh();
                label = hud.SkillButton.GetComponentInChildren<TextMeshProUGUI>().text;
                if (!label.StartsWith(GoSkillShapes.Name(SkillShape.Thrust))) Fail($"스킬 칸이 모양 이름이 아님({label})");
            }
            foreach (var e in foes) e.RestoreHomeForTest();
            return $" | 찌르기 {want:F0} 칸 \"{label.Split('\n')[0]}\"";
        }

        private static string CheckDash(FieldCombat fc, PlayerController pc, PartyBodies bodies, List<FieldEnemy> foes, Vector3 o, string id)
        {
            fc.ResetForTest();
            pc.Teleport(o);
            if (!Become(fc, bodies, id)) return "";
            Vector3 x = X(pc);
            foes[0].WarpForTest(o + x * 8f);
            foes[1].WarpForTest(o - x * 9f);
            foes[2].WarpForTest(o - x * 12f);
            Vector3 start = pc.transform.position;
            float h0 = foes[0].Hp;
            int hits = fc.Skill();
            if (fc.LastShape != SkillShape.Dash) Fail($"돌진 인물 스킬이 {fc.LastShape}");
            if (hits != 1 || foes[0].Hp >= h0) Fail($"돌진이 겨눈 적을 못 맞힘({hits})");
            if (fc.InvulnLeft < GoSkillShapes.DashInvulnSec - 0.01f) Fail("돌진 무적이 안 걸림");
            for (int i = 0; i < 20; i++) pc.Step(Dt);
            Vector3 moved = pc.transform.position - start; moved.y = 0f;
            float want = 8f - GoSkillShapes.DashStop;
            if (Mathf.Abs(moved.magnitude - want) > 1f) Fail($"돌진 거리 {moved.magnitude:F1} ≠ {want:F1}");
            if (Vector3.Dot(moved.normalized, x) < 0.9f) Fail("돌진이 겨눈 쪽이 아님");
            foreach (var e in foes) e.RestoreHomeForTest();
            return $" · 돌진 {moved.magnitude:F1}m";
        }

        private static string CheckField(FieldCombat fc, PlayerController pc, PartyBodies bodies, List<FieldEnemy> foes, Vector3 o, string id, string other)
        {
            fc.ResetForTest();
            pc.Teleport(o);
            if (!Become(fc, bodies, id)) return "";
            Vector3 x = X(pc), z = Vector3.Cross(Vector3.up, x);
            foes[0].WarpForTest(o + x * 6f);
            foes[1].WarpForTest(o + x * 6f + z * 3f);
            foes[2].WarpForTest(o + x * 6f + z * (GoSkillShapes.FieldRadius + 3f));
            float h0 = foes[0].Hp, h2 = foes[2].Hp;
            float atk = fc.Atk;
            int hits = fc.Skill();
            if (fc.LastShape != SkillShape.Field) Fail($"장판 인물 스킬이 {fc.LastShape}");
            if (hits != 2) Fail($"장판 첫 틱 적중 {hits} ≠ 2");
            if (fc.Zones.Count != 1) { Fail($"장판 구역 {fc.Zones.Count}"); return ""; }
            var zone = fc.Zones[0];
            Become(fc, bodies, other); // 교체해도 남는다
            for (int i = 0; i < 12; i++) fc.TickTimers(0.5f);
            if (zone.Ticks != 5) Fail($"장판 틱 {zone.Ticks} ≠ 5");
            if (fc.Zones.Count != 0) Fail("5초 뒤 장판이 안 사라짐");
            float want = 5f * atk * GoSkillShapes.FieldMul;
            if (Mathf.Abs(h0 - foes[0].Hp - Mathf.Min(h0, want)) > 1.5f) Fail($"장판 누적 피해 {h0 - foes[0].Hp:F0} ≠ {want:F0}");
            if (foes[2].Hp < h2) Fail("장판 밖 적이 맞음");
            foreach (var e in foes) e.RestoreHomeForTest();
            return $" · 장판 5틱 {want:F0}";
        }

        private static string CheckSummon(FieldCombat fc, PlayerController pc, PartyBodies bodies, List<FieldEnemy> foes, Vector3 o, string id)
        {
            fc.ResetForTest();
            pc.Teleport(o);
            if (!Become(fc, bodies, id)) return "";
            Vector3 x = X(pc);
            foes[0].WarpForTest(o + x * 8f);
            foes[1].WarpForTest(o + x * (GoSkillShapes.SummonOffset + GoSkillShapes.SummonRadius + 4f));
            foes[2].WarpForTest(o - x * 30f);
            float h0 = foes[0].Hp, h1 = foes[1].Hp;
            float atk = fc.Atk;
            int hits = fc.Skill();
            if (fc.LastShape != SkillShape.Summon) Fail($"소환 인물 스킬이 {fc.LastShape}");
            if (hits != 1) Fail($"소환 첫 일격 {hits} ≠ 1");
            if (fc.Zones.Count != 1) { Fail($"소환 구역 {fc.Zones.Count}"); return ""; }
            var zone = fc.Zones[0];
            var spirit = zone.Spirit;
            if (spirit == null || spirit.transform.Find("Model") == null) Fail("소환 정령 몸(등잔)이 없음");
            else if (spirit.transform.position.y < o.y + 1f) Fail("정령이 떠 있지 않음");
            Become(fc, bodies, FieldCombat.HeroId); // 교체해도 남는다
            for (int i = 0; i < 18; i++) fc.TickTimers(0.5f);
            if (zone.Ticks != 6) Fail($"소환 일격 {zone.Ticks} ≠ 6");
            if (fc.Zones.Count != 0) Fail("8초 뒤 소환이 안 끝남");
            float want = 6f * atk * GoSkillShapes.SummonMul;
            if (Mathf.Abs(h0 - foes[0].Hp - Mathf.Min(h0, want)) > 1.5f) Fail($"소환 누적 피해 {h0 - foes[0].Hp:F0} ≠ {want:F0}");
            if (foes[1].Hp < h1) Fail("소환 반경 밖 적이 맞음");
            foreach (var e in foes) e.RestoreHomeForTest();
            return $" · 소환 6번 {want:F0}";
        }

        // ---- 교체 연출 ----------------------------------------------------------

        private static string CheckSwapMotion(FieldCombat fc, PlayerController pc, PartyBodies bodies, Vector3 o, string a, string b)
        {
            fc.ResetForTest();
            pc.Teleport(o);
            var hero = bodies.HeroVisual;
            int ia = -1, ib = -1;
            for (int i = 0; i < fc.Party.Count; i++) { if (fc.Party[i].Id == a) ia = i; if (fc.Party[i].Id == b) ib = i; }
            if (ia < 0 || ib < 0) { Fail("교체 연출용 동행 없음"); return ""; }
            Vector3 fwd = hero.forward; fwd.y = 0f; fwd.Normalize();
            Vector3 heroStart = hero.position;
            if (!fc.Swap(ia)) { Fail("교체가 안 됨"); return ""; }
            var body = pc.Visual;
            if (body == hero) { Fail("교체했는데 주인공 몸(모델 없음?)"); return ""; }
            if (bodies.LeavingCount != 1 || bodies.LeavingVisual(0) != hero) Fail("옛 몸(주인공)이 물러나는 몸이 아님");
            if (!hero.gameObject.activeSelf || hero.parent != null) Fail("물러나는 옛 몸이 켜져 떼어져 있지 않음");
            if (bodies.Entering != body || Mathf.Abs(body.localPosition.magnitude - PartyBodies.EnterSide) > 0.05f) Fail($"새 몸이 옆 {PartyBodies.EnterSide:F1}m 에서 안 들어옴({body.localPosition.magnitude:F2})");
            bodies.TickMotion(PartyBodies.EnterSec * 0.5f);
            float mid = body.localPosition.magnitude / PartyBodies.EnterSide;
            if (Mathf.Abs(mid - 0.25f) > 0.03f) Fail($"들어오기 중간 {mid:F2} ≠ 0.25(ease-out)");
            bodies.TickMotion(PartyBodies.EnterSec * 0.5f + 0.001f);
            if (bodies.Entering != null || body.localPosition.magnitude > 0.01f) Fail("0.35초 뒤 새 몸이 제자리가 아님");
            bodies.TickMotion(PartyBodies.RetreatSec - PartyBodies.EnterSec);
            Vector3 back = hero.position - heroStart; back.y = 0f;
            if (Mathf.Abs(back.magnitude - PartyBodies.RetreatDist) > 0.1f) Fail($"물러난 거리 {back.magnitude:F2} ≠ {PartyBodies.RetreatDist:F2}");
            if (Vector3.Dot(back, fwd) >= 0f) Fail("옛 몸이 뒤로 물러나지 않음");
            bodies.TickMotion(PartyBodies.VanishSec - PartyBodies.RetreatSec + 0.01f);
            if (bodies.LeavingCount != 0 || hero.gameObject.activeSelf || hero.parent != pc.transform || hero.localPosition.magnitude > 0.01f)
                Fail("0.9초 뒤 옛 몸이 꺼져 제자리로 안 돌아감");

            // 물러나던 몸을 곧바로 다시 부르면 제자리로(연출 도중 교체)
            fc.TickTimers(FieldCombat.SwapCooldownSec + 0.05f);
            if (!fc.Swap(ib)) Fail("둘째 교체가 안 됨");
            var second = pc.Visual;
            fc.TickTimers(FieldCombat.SwapCooldownSec + 0.05f);
            bodies.TickMotion(0.1f);
            if (!fc.Swap(ia)) Fail("되돌리는 교체가 안 됨");
            if (pc.Visual != body || body.parent != pc.transform || !body.gameObject.activeSelf) Fail("물러나던 몸을 다시 불렀는데 제자리로 안 옴");
            if (bodies.LeavingCount != 1 || bodies.LeavingVisual(0) != second) Fail("둘째 몸이 물러나지 않음");
            bodies.TickMotion(1f);
            if (bodies.InMotion) Fail("연출이 1초 뒤에도 남음");
            return $" | 교체 연출 들어오기 {PartyBodies.EnterSide:F1}m·물러남 {back.magnitude:F1}m";
        }
    }
}
