using UnityEngine;
using Saga.Go.Combat;
using Saga.Go.Player;
using Saga.Go.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 107-6 "동료 모델" 진단 — `PlaytestHeadless` 가 보물 상자 진단 뒤에 부른다.
    /// "산적" 이 이미 등용돼 있어야 한다(앞선 도적 사건 진단이 등용함). 끝나면 주인공 몸으로 되돌린다.
    /// </summary>
    public static class PlaytestGoPartyBodies
    {
        private const float Dt = 0.02f;
        private static string _tag;
        private static bool _ok;

        public static bool Run(string tag)
        {
            _tag = tag;
            _ok = true;
            DuelGate.ResetForTest();
            var fc = FieldCombat.Instance;
            var pc = fc != null ? fc.GetComponent<PlayerController>() : null;
            var bodies = pc != null ? pc.GetComponent<PartyBodies>() : null;
            if (bodies == null) { Fail("플레이어에 PartyBodies 가 없음(씬 재빌드?)"); return false; }
            string metrics = "";
            try
            {
                fc.ResetForTest();
                pc.Teleport(fc.SafePoint);
                metrics = CheckSwap(fc, pc, bodies);
            }
            finally
            {
                DuelGate.ResetForTest();
                pc.ClearTestInput();
                fc.ResetForTest();
                pc.Teleport(fc.SafePoint);
                GoStamina.ResetFull();
            }
            if (pc.Visual != bodies.HeroVisual) Fail("진단 뒤 주인공 몸으로 안 돌아옴");
            if (_ok) Debug.Log($"[{_tag}] party bodies OK - 교체하면 몸이 바뀜(Humanoid·같은 컨트롤러·키·방향·날개·걷기 Speed·공격)·되돌림·전멸 복귀·모델 고르기 |{metrics}");
            return _ok;
        }

        private static void Fail(string msg)
        {
            Debug.LogError($"[{_tag}] party bodies: {msg}");
            _ok = false;
        }

        private static float Height(Transform t)
        {
            var rs = t.GetComponentsInChildren<Renderer>();
            if (rs.Length == 0) return 0f;
            var b = rs[0].bounds;
            foreach (var r in rs) b.Encapsulate(r.bounds);
            return b.size.y;
        }

        private static bool HasParam(Animator a, string name)
        {
            foreach (var p in a.parameters) if (p.name == name) return true;
            return false;
        }

        private static string CheckSwap(FieldCombat fc, PlayerController pc, PartyBodies bodies)
        {
            var hero = bodies.HeroVisual;
            if (hero == null || pc.Visual != hero || !hero.gameObject.activeSelf) { Fail("처음에 주인공 몸이 아님"); return ""; }
            var heroCtrl = pc.Animator != null ? pc.Animator.runtimeAnimatorController : null;
            if (bodies.PrefabFor(PartyBodies.HeroId) != null) Fail("주인공에 동료 모델이 골라짐");
            var a1 = bodies.PrefabFor("아무개");
            if (a1 != null && bodies.PrefabFor("아무개") != a1) Fail("같은 id 인데 모델이 흔들림");

            int idx = -1;
            for (int i = 0; i < fc.Party.Count; i++) if (fc.Party[i].Id == PartyBodies.BanditId) idx = i;
            if (idx < 0) { Fail("명단에 산적이 없음(도적 사건 진단 순서?)"); return ""; }
            if (bodies.PrefabFor(PartyBodies.BanditId) == null)
            {
                Debug.LogWarning($"[{_tag}] party bodies: Abe 모델이 이 PC 에 없음 — 몸 교체는 건너뛰고 빛깔 대신만 확인");
                fc.Swap(idx);
                if (pc.Visual != hero) Fail("모델이 없는데 몸이 바뀜");
                return " (모델 없음 — 빛깔 대신)";
            }

            hero.rotation = Quaternion.Euler(0f, 90f, 0f);
            if (!fc.Swap(idx)) { Fail("산적으로 교체가 안 됨"); return ""; }
            bodies.FinishMotion(); // 109-8 교체 연출(옛 몸이 물러남)은 PlaytestGoSkillShapes 가 본다 — 여기선 끝난 자리만
            var body = pc.Visual;
            if (body == hero || body == null) { Fail("교체했는데 몸이 그대로"); return ""; }
            if (hero.gameObject.activeSelf || !body.gameObject.activeSelf) Fail("옛 몸이 안 꺼지거나 새 몸이 안 켜짐");
            if (bodies.ShownId != PartyBodies.BanditId) Fail($"보이는 몸 id {bodies.ShownId}");
            if (pc.Animator == null || !pc.Animator.isHuman) Fail("동료 몸 Animator 가 Humanoid 가 아님");
            else if (pc.Animator.runtimeAnimatorController != heroCtrl) Fail("동료 몸에 주인공과 같은 컨트롤러가 안 씌워짐");
            if (pc.Animator != null && (!HasParam(pc.Animator, "Climb") || !HasParam(pc.Animator, "Speed"))) Fail("동료 몸 컨트롤러에 Climb/Speed 파라미터가 없음");
            float h = Height(body);
            if (Mathf.Abs(h - CharacterVisual.HumanHeight) > CharacterVisual.HumanHeight * 0.2f) Fail($"동료 몸 키 {h:F2} ≠ {CharacterVisual.HumanHeight}");
            if (Mathf.Abs(Mathf.DeltaAngle(body.eulerAngles.y, 90f)) > 1f) Fail($"보던 방향이 안 넘어감({body.eulerAngles.y:F0}°)");
            var wings = body.Find("GlideWings (generated)");
            if (wings == null) Fail("활공 날개가 새 몸으로 안 옮겨짐");
            else if (Mathf.Abs(wings.lossyScale.y - 1f) > 0.05f) Fail($"옮긴 날개 크기가 틀림({wings.lossyScale.y:F2})");
            foreach (var col in body.GetComponentsInChildren<Collider>()) { Fail("동료 몸에 충돌체가 남음"); break; }

            // 걷기 — 새 몸 Animator 로 Speed 가 들어간다
            pc.SetTestInput(new Vector2(1f, 0f), false);
            for (int i = 0; i < 10; i++) pc.Step(Dt);
            float speed = pc.Animator != null ? pc.Animator.GetFloat("Speed") : 0f;
            pc.ClearTestInput();
            if (speed <= 0f) Fail("동료 몸으로 걸어도 Speed 가 0");
            if (fc.Attack() < 0) Fail("동료 몸으로 기본 공격이 안 나감");

            // 되돌리기 — 같은 몸을 다시 쓰고(새로 안 만든다) 주인공 무기는 주인공 손에 그대로
            fc.ResetForTest(); // ActiveIndex 0 → 주인공 몸
            if (pc.Visual != hero || !hero.gameObject.activeSelf || body.gameObject.activeSelf) Fail("주인공으로 되돌렸는데 몸이 안 바뀜");
            if (hero.GetComponentInChildren<MeshRenderer>(true) == null || FindDeep(hero, "WeaponBlade (generated)") == null) Fail("주인공 손의 무기가 사라짐");
            fc.Swap(idx);
            bodies.FinishMotion();
            if (pc.Visual != body) Fail("두 번째 교체에서 몸을 새로 만듦");
            int bodyCount = 0;
            foreach (Transform c in pc.transform) if (c.name.StartsWith("Body_")) bodyCount++;
            if (bodyCount != 1) Fail($"동료 몸이 {bodyCount}벌");

            // 모두 쓰러짐 → 마을에서 주인공 몸으로
            fc.WipeAndReturn();
            if (pc.Visual != hero) Fail("전멸 복귀 뒤 주인공 몸이 아님");
            return $" 산적 몸 {body.name} 키 {h:F2}m · 걷기 Speed {speed:F2}";
        }

        private static Transform FindDeep(Transform root, string name)
        {
            foreach (var t in root.GetComponentsInChildren<Transform>(true)) if (t.name == name) return t;
            return null;
        }
    }
}
