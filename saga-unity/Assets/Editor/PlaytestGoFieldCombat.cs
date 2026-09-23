using System.Collections.Generic;
using UnityEngine;
using Saga.Go.Combat;
using Saga.Go.Data;
using Saga.Go.Player;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 107-1 "들판 전투" 진단 — `PlaytestHeadless` 가 Play 3프레임째(다른 GO 진단 뒤, 일일 과제 앞)에 부른다.
    /// 같은 프레임 안에서 동기로 돌리므로 적 `Update` 가 끼어들지 않는다. 시간이 필요한 곳은 `Tick`/`TickTimers` 로 건너뛴다.
    /// 끝나면 적은 전부 집으로, 플레이어는 안전 지점으로, 명단은 전원 회복으로 되돌린다.
    /// </summary>
    public static class PlaytestGoFieldCombat
    {
        private static string _tag;
        private static bool _ok;

        public static bool Run(string tag)
        {
            _tag = tag;
            _ok = true;
            DuelGate.ResetForTest(); // 앞 진단이 결투 상태를 보고했을 수 있다

            CheckReactionTable();

            var fc = FieldCombat.Instance;
            var pc = fc != null ? fc.GetComponent<PlayerController>() : null;
            if (fc == null || pc == null) { Fail("FieldCombat/PlayerController 가 플레이어에 없음"); return false; }
            if (FieldEnemy.All.Count != FieldSpawner.PlannedCount)
                Fail($"들판 적 수 {FieldEnemy.All.Count} ≠ {FieldSpawner.PlannedCount}");
            var hud = fc.GetComponent<FieldCombatHud>();
            if (hud == null || hud.Root == null) Fail("FieldCombatHud 가 안 만들어짐");

            var enemies = new List<FieldEnemy>(FieldEnemy.All);
            if (enemies.Count < 3) { Fail("적이 셋 미만"); return false; }
            FieldEnemy e1 = enemies[0], e2 = enemies[1], e3 = enemies[2];
            Vector3 origin = fc.transform.position;

            try
            {
                CheckBasicAttackAndKill(fc, pc, e1, e2, e3, origin);
                CheckReactions(fc, e1, e2, origin);
                CheckSkillAndBurst(fc, pc, e1, e2, e3, origin);
                CheckEnemyStrikeAndDodge(fc, pc, e1, origin);
                CheckSwapAndWipe(fc, e1, origin);
                CheckDuelGate(fc);
                if (hud != null) CheckHud(fc, pc, hud, e1, origin);
            }
            finally
            {
                DuelGate.ResetForTest();
                foreach (var e in FieldEnemy.All) e.RestoreHomeForTest();
                fc.ResetForTest();
                pc.Teleport(fc.SafePoint);
                GoStamina.ResetFull();
            }

            if (_ok) Debug.Log($"[{_tag}] field combat OK - enemies {FieldEnemy.All.Count}, party {fc.Party.Count}, reactions·3타·스킬·폭발·피격·회피·교체·전멸 복귀·결투 경계·버튼");
            return _ok;
        }

        private static void Fail(string msg)
        {
            Debug.LogError($"[{_tag}] field combat: {msg}");
            _ok = false;
        }

        private static void CheckReactionTable()
        {
            if (GoElements.Resolve(GoElement.Pyro, GoElement.Hydro) != GoReaction.Vaporize) Fail("화+수 ≠ 증발");
            if (GoElements.Resolve(GoElement.Hydro, GoElement.Pyro) != GoReaction.Vaporize) Fail("수+화 ≠ 증발");
            if (GoElements.Resolve(GoElement.Electro, GoElement.Pyro) != GoReaction.Overload) Fail("뇌+화 ≠ 과부하");
            if (GoElements.Resolve(GoElement.Hydro, GoElement.Electro) != GoReaction.ElectroCharged) Fail("수+뇌 ≠ 감전");
            if (GoElements.Resolve(GoElement.Pyro, GoElement.Pyro) != GoReaction.None) Fail("같은 원소가 반응함");
            if (GoElements.Resolve(GoElement.Hydro, GoElement.Physical) != GoReaction.None) Fail("물리가 반응함");
            if (GoElements.ForMember("산적") != GoElements.ForMember("산적") || GoElements.ForMember("산적") == GoElement.Physical)
                Fail("동료 원소 해시가 흔들리거나 물리");
        }

        private static Vector3 Fwd(PlayerController pc)
        {
            Vector3 f = pc.Visual != null ? pc.Visual.forward : pc.transform.forward;
            f.y = 0f;
            return f.normalized;
        }

        private static void Place(FieldEnemy e, Vector3 pos) => e.WarpForTest(pos);

        private static void Park(FieldEnemy e, Vector3 origin, float offset)
        {
            Place(e, origin + new Vector3(60f + offset, 0f, 60f));
        }

        private static void CheckBasicAttackAndKill(FieldCombat fc, PlayerController pc, FieldEnemy e1, FieldEnemy e2, FieldEnemy e3, Vector3 origin)
        {
            fc.ResetForTest();
            Park(e2, origin, 0f);
            Park(e3, origin, 10f);
            Place(e1, origin + Fwd(pc) * 2.5f);

            float atk = fc.Atk;
            float hp0 = e1.Hp;
            int hits = fc.Attack();
            if (hits != 1) Fail($"기본 공격 1타 적중 {hits} ≠ 1");
            if (Mathf.Abs(hp0 - e1.Hp - atk * FieldCombat.ComboMul[0]) > 0.5f) Fail($"1타 피해 {hp0 - e1.Hp} ≠ {atk * FieldCombat.ComboMul[0]}");
            if (fc.Attack() != -1) Fail("공격 간격 안에 다시 쳐짐");
            fc.TickTimers(0.4f);
            float hp1 = e1.Hp;
            fc.Attack();
            if (Mathf.Abs(hp1 - e1.Hp - atk * FieldCombat.ComboMul[1]) > 0.5f) Fail("2타 배율이 안 먹음");
            if (fc.ComboStep != 2) Fail($"콤보 단계 {fc.ComboStep} ≠ 2");
            fc.TickTimers(FieldCombat.ComboWindowSec + 0.1f);
            if (fc.ComboStep != 0) Fail("이어 치기 창이 지나도 콤보가 안 끊김");

            int killed = 0;
            System.Action<FieldEnemy> onKill = e => { if (e == e1) killed++; };
            FieldEnemy.Killed += onKill;
            int lv0 = PlayerStats.Level, exp0 = PlayerStats.Exp;
            for (int i = 0; i < 60 && e1.Alive; i++) { fc.TickTimers(0.4f); fc.Attack(); }
            FieldEnemy.Killed -= onKill;
            if (e1.Alive) Fail("기본 공격으로 적이 안 쓰러짐");
            if (killed != 1) Fail($"Killed 이벤트 {killed} ≠ 1");
            if (PlayerStats.Level == lv0 && PlayerStats.Exp - exp0 != e1.ExpReward) Fail($"처치 경험치 {PlayerStats.Exp - exp0} ≠ {e1.ExpReward}");
            if (fc.Active.Energy <= 0f) Fail("기본 공격 적중에 기력이 안 참");
        }

        private static void CheckReactions(FieldCombat fc, FieldEnemy e1, FieldEnemy e2, Vector3 origin)
        {
            const float Atk = 100f;
            // 증발
            Place(e1, origin + new Vector3(30f, 0f, 30f));
            e1.TakeHit(1f, GoElement.Hydro, Atk, out var r0);
            if (r0 != GoReaction.None || e1.Aura != GoElement.Hydro) Fail("수 부착이 안 됨");
            float hp = e1.Hp;
            e1.TakeHit(100f, GoElement.Pyro, Atk, out var r1);
            if (r1 != GoReaction.Vaporize) Fail($"증발 안 남 ({r1})");
            if (Mathf.Abs(hp - e1.Hp - 150f) > 0.5f) Fail($"증발 피해 {hp - e1.Hp} ≠ 150");
            if (e1.AuraLeft > 0f) Fail("반응 뒤 부착이 안 지워짐");

            // 과부하 — 옆 적도 맞는다
            Place(e1, origin + new Vector3(30f, 0f, 30f));
            Place(e2, origin + new Vector3(33f, 0f, 30f));
            e1.TakeHit(1f, GoElement.Electro, Atk, out _);
            float hp2 = e2.Hp;
            e1.TakeHit(10f, GoElement.Pyro, Atk, out var r2);
            if (r2 != GoReaction.Overload) Fail($"과부하 안 남 ({r2})");
            if (Mathf.Abs(hp2 - e2.Hp - Atk * GoElements.OverloadAtkMul) > 0.5f) Fail($"과부하 광역 피해 {hp2 - e2.Hp} ≠ {Atk * GoElements.OverloadAtkMul}");

            // 감전 — 지속 + 젖은 옆 적에게 번짐
            Place(e1, origin + new Vector3(30f, 0f, 30f));
            Place(e2, origin + new Vector3(32f, 0f, 30f));
            e2.TakeHit(1f, GoElement.Hydro, Atk, out _);
            e1.TakeHit(1f, GoElement.Hydro, Atk, out _);
            e1.TakeHit(1f, GoElement.Electro, Atk, out var r3);
            if (r3 != GoReaction.ElectroCharged) Fail($"감전 안 남 ({r3})");
            if (!e1.Charged) Fail("감전 지속이 안 걸림");
            if (!e2.Charged) Fail("젖은 옆 적에게 감전이 안 번짐");
            float hp3 = e1.Hp;
            e1.Tick(GoElements.ChargedTickSec + 0.01f);
            if (Mathf.Abs(hp3 - e1.Hp - Atk * GoElements.ChargedTickAtkMul) > 0.5f) Fail($"감전 틱 피해 {hp3 - e1.Hp} ≠ {Atk * GoElements.ChargedTickAtkMul}");
            Park(e2, origin, 0f);
        }

        private static void CheckSkillAndBurst(FieldCombat fc, PlayerController pc, FieldEnemy e1, FieldEnemy e2, FieldEnemy e3, Vector3 origin)
        {
            fc.ResetForTest();
            Place(e1, origin + Fwd(pc) * 3f);
            int hits = fc.Skill();
            if (hits < 1) Fail($"원소 스킬이 앞 적을 못 맞힘({hits})");
            if (e1.Aura != fc.Active.Element) Fail($"스킬 원소 부착 {e1.Aura} ≠ {fc.Active.Element}");
            if (Mathf.Abs(fc.Active.SkillCd - FieldCombat.SkillCooldownSec) > 0.01f) Fail("스킬 쿨이 안 걸림");
            if (fc.Skill() != -1) Fail("쿨 중에 스킬이 또 나감");
            if (fc.Active.Energy < FieldCombat.EnergyPerSkillHit - 0.01f) Fail("스킬 적중 기력 +15 가 안 참");
            if (fc.Burst() != -1) Fail("기력 모자란데 폭발이 나감");
            fc.Active.Energy = FieldCombat.BurstCost;
            Place(e1, origin + Fwd(pc) * 8f);
            float hp = e1.Hp;
            if (fc.Burst() < 1) Fail("원소 폭발이 8m 적을 못 맞힘");
            if (fc.Active.Energy > 0f) Fail("폭발 뒤 기력이 안 비워짐");
            if (hp - e1.Hp < Mathf.Min(hp, fc.Atk * FieldCombat.BurstMul) - 0.5f) Fail("폭발 피해가 4배 미만"); // 즉사하면 남은 체력까지만 깎인다
        }

        private static void CheckEnemyStrikeAndDodge(FieldCombat fc, PlayerController pc, FieldEnemy e1, Vector3 origin)
        {
            fc.ResetForTest();
            Place(e1, origin + Fwd(pc) * 2f);
            e1.Tick(0.01f); // 배회 → 발견
            if (e1.CurrentState != FieldEnemy.State.Chase) Fail($"가까운 플레이어를 발견 못 함({e1.CurrentState})");
            e1.Tick(0.01f); // 추격 → 사거리 안이라 예고
            if (e1.CurrentState != FieldEnemy.State.Telegraph) Fail($"사거리 안인데 예고 안 함({e1.CurrentState})");
            float hp = fc.Active.Hp;
            e1.Tick(FieldEnemy.TelegraphSec + 0.05f);
            if (fc.Active.Hp >= hp) Fail("가만히 서 있는데 안 맞음");
            if (e1.CurrentState != FieldEnemy.State.Recover) Fail("판정 뒤 쉼으로 안 감");

            // 회피 — 무적 창 안의 판정은 흘린다
            fc.ResetForTest();
            GoStamina.ResetFull();
            if (!fc.Dodge()) Fail("회피가 안 나감");
            if (Mathf.Abs(GoStamina.Value - (GoStamina.Max - FieldCombat.DodgeStamina)) > 0.01f) Fail($"회피 스태미나 {GoStamina.Value}");
            float hp2 = fc.Active.Hp;
            if (fc.ReceiveStrike(e1.Atk, e1) || fc.Active.Hp < hp2) Fail("회피 무적 중에 맞음");
            fc.TickTimers(FieldCombat.DodgeInvulnSec + 0.01f);
            if (!fc.ReceiveStrike(e1.Atk, e1)) Fail("무적이 끝났는데 안 맞음");
            GoStamina.ResetFull();
            pc.Teleport(origin);
        }

        private static void CheckSwapAndWipe(FieldCombat fc, FieldEnemy e1, Vector3 origin)
        {
            fc.ResetForTest();
            fc.RebuildParty();
            int n = fc.Party.Count;
            if (n != Mathf.Min(FieldCombat.MaxParty, 1 + PartyState.MemberIds.Count)) Fail($"명단 {n} 이 등용 수와 안 맞음");
            if (fc.Party[0].Id != FieldCombat.HeroId || fc.Party[0].Element != GoElements.HeroElement) Fail("명단 첫 칸이 주인공(화)이 아님");
            if (n >= 2)
            {
                if (!fc.Swap(1) || fc.ActiveIndex != 1) Fail("교체 1 이 안 됨");
                if (fc.Active.Element != GoElements.ForMember(fc.Active.Id)) Fail("동료 원소가 해시와 다름");
                if (fc.Swap(0)) Fail("교체 쿨 중에 또 바뀜");
                fc.TickTimers(FieldCombat.SwapCooldownSec + 0.05f);
                if (!fc.Swap(0)) Fail("쿨이 끝났는데 안 바뀜");
                // 나선 인물이 쓰러지면 다음 사람으로
                fc.Active.Hp = 1f;
                fc.ReceiveStrike(9999f, e1);
                if (fc.ActiveIndex == 0 || fc.Party[0].Hp > 0f) Fail("쓰러진 뒤 자동 교체가 안 됨");
            }
            else
            {
                Debug.Log($"[{_tag}] field combat: 등용한 동료가 없어 교체 검사 건너뜀");
            }

            // 전멸 — 잃는 것 없이 안전 지점에서 전원 회복
            var pc = fc.GetComponent<PlayerController>();
            pc.Teleport(origin + new Vector3(20f, 0f, 20f));
            int gold0 = GoldState.Gold;
            fc.ResetForTest();
            int count = fc.Party.Count;
            for (int i = 0; i < count; i++)
            {
                fc.Active.Hp = 1f;
                fc.ReceiveStrike(9999f, e1);
            }
            foreach (var m in fc.Party) if (m.Hp < m.MaxHp) { Fail($"전멸 뒤 {m.Name} 이 회복 안 됨"); break; }
            if (fc.ActiveIndex != 0) Fail("전멸 뒤 주인공이 안 나섬");
            Vector3 d = fc.transform.position - fc.SafePoint; d.y = 0f;
            if (d.magnitude > 1f) Fail($"전멸 뒤 안전 지점으로 안 감(거리 {d.magnitude:F1})");
            if (GoldState.Gold != gold0) Fail("전멸로 돈을 잃음");
            pc.Teleport(origin);
        }

        private static void CheckDuelGate(FieldCombat fc)
        {
            fc.ResetForTest();
            DuelGate.Report(true);
            if (!DuelGate.Active) Fail("DuelGate 보고가 안 먹음");
            if (fc.CanBeTargeted) Fail("결투 중인데 적이 노릴 수 있음");
            if (fc.Attack() != -1) Fail("결투 중인데 들판 공격이 나감");
            DuelGate.ResetForTest();
            if (!fc.CanBeTargeted) Fail("결투가 끝났는데 안 풀림");
        }

        private static void CheckHud(FieldCombat fc, PlayerController pc, FieldCombatHud hud, FieldEnemy e1, Vector3 origin)
        {
            fc.ResetForTest();
            hud.Refresh();
            if (!hud.RosterText(0).Contains(fc.Party[0].Name)) Fail($"명단 첫 줄에 주인공 이름이 없음 \"{hud.RosterText(0)}\"");
            Place(e1, origin + Fwd(pc) * 2.5f);
            float hp = e1.Hp;
            hud.AttackButton.onClick.Invoke(); // 진짜 onClick
            if (e1.Hp >= hp) Fail("공격 버튼(진짜 onClick)이 안 먹음");
            if (fc.Party.Count >= 2)
            {
                fc.TickTimers(2f);
                hud.RosterButton(1).onClick.Invoke();
                if (fc.ActiveIndex != 1) Fail("명단 버튼(진짜 onClick)으로 교체가 안 됨");
            }
        }
    }
}
