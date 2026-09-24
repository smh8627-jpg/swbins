using UnityEditor;
using UnityEngine;
using Saga.Story.Data;
using Saga.Story.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 106-10 "STORY 파티 — 교대 셋을 곁에 세우기" 진단. `PlaytestStorySlice` 가 Init 단계(두목 컷 진단 뒤)에서
    /// 부른다. 동료 `Step(dt)` 을 직접 굴려 결정적으로 본다 — 몸 셋(프리팹이 있으면 애니메이터) · 활성 역할 숨김 ·
    /// 멀면 곁으로 옮김 · 걸어서 따라옴 · 높이 다르면 뛰어오름 · 선봉 근접 타격 · 유격 화살 · 호법 기력 회복 ·
    /// 교대하면 들어가는 쪽 숨고 나오는 쪽 곁에 · 복원(Restore)도 따름. 끝나면 `PausedForTest` 로 멈춰 뒤 단계
    /// (잡졸 수·한 방 피해 전제)를 안 흔든다. 더미 적은 비경 적 표시라 경험치·퀘스트 수를 안 바꾼다.
    /// </summary>
    public static class PlaytestStoryCompanions
    {
        private const string T = "[PlaytestStorySlice] companions";
        private static bool _ok;

        public static bool Run()
        {
            _ok = true;
            var squad = StoryCompanionSquad.Instance;
            var playerGo = GameObject.FindWithTag("Player");
            var cc = playerGo != null ? playerGo.GetComponent<CharacterController>() : null;
            if (squad == null || playerGo == null || squad.Members.Count != 3)
            {
                Fail($"부대·플레이어 없음(부대 {squad != null}, 몸 {(squad != null ? squad.Members.Count : 0)}) — 씬 재빌드?");
                return false;
            }
            Vector3 start = playerGo.transform.position;
            int origActive = StoryPartyState.ActiveIndex;
            float origMp = StoryCombat.Mp;
            var dummies = new System.Collections.Generic.List<StoryEnemy>();
            GameObject floor = null, ledge = null;
            string metrics = "";
            try
            {
                Random.InitState(20260824); // 피해 굴림·치명타 — 세 번 돌려 같은 줄(루트 CLAUDE.md 진단 씨앗).
                StoryPartyState.Restore(0);
                squad.Refresh(false);

                // ── 몸 셋 · 활성(선봉) 숨김
                int models = 0;
                for (int i = 0; i < 3; i++)
                {
                    var m = squad.Member(i);
                    if (m == null) { Fail($"역할 {i} 몸이 없다"); continue; }
                    bool hasPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(
                        SetupNpcCharacterImports.PrefabPath(i == 0 ? "Paladin" : i == 1 ? "Archer" : "PeasantGirl")) != null;
                    if (hasPrefab)
                    {
                        if (m.ModelAnimator == null || m.ModelAnimator.runtimeAnimatorController == null) Fail($"역할 {i}: 몸 프리팹이 있는데 애니메이터가 없다");
                        else models++;
                    }
                    if (m.transform.GetComponentsInChildren<Collider>(true).Length > 0) Fail($"역할 {i}: 충돌체가 있다(플레이어를 막는다)");
                }
                if (squad.Member(0).gameObject.activeSelf) Fail("앞에 나선 선봉이 곁에도 서 있다");
                if (!squad.Member(1).gameObject.activeSelf || !squad.Member(2).gameObject.activeSelf) Fail("쉬는 둘(유격·호법)이 안 보인다");
                metrics += $"models {models}/3";

                // 맵 밖(x=-200)에 임시 바닥을 깔고 거기서 — 필드는 좁아 적 없는 16m 구간이 없고, 동료는 곁 적을 먼저 노린다.
                floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
                floor.name = "TestCompanionFloor";
                floor.transform.position = new Vector3(-200f, -0.5f, 0f);
                floor.transform.localScale = new Vector3(60f, 1f, 4f);
                Physics.SyncTransforms();
                var home = new Vector3(-200f, 0f, 0f);
                Teleport(cc, playerGo.transform, home);
                var archer = squad.Member(1);
                var mystic = squad.Member(2);

                // ── 멀면 곁으로 옮긴다
                archer.transform.position = home + new Vector3(30f, 0f, StoryCompanion.LaneZ);
                int tp = archer.Teleports;
                archer.Step(0.02f);
                if (archer.Teleports != tp + 1 || Mathf.Abs(archer.transform.position.x - home.x) > 3f)
                    Fail($"30m 떨어진 유격이 곁으로 안 옮겨짐(x {archer.transform.position.x:F1})");

                // ── 걸어서 따라온다
                archer.transform.position = new Vector3(home.x + 6f, home.y, StoryCompanion.LaneZ);
                float before = Mathf.Abs(archer.transform.position.x - home.x);
                for (int k = 0; k < 20; k++) archer.Step(0.05f);
                float after = Mathf.Abs(archer.transform.position.x - home.x);
                if (after >= before - 1f) Fail($"유격이 걸어서 안 따라옴({before:F1}→{after:F1}m, 표적 {(archer.Target != null ? archer.Target.name : "없음")})");
                if (Mathf.Abs(archer.transform.position.z - StoryCompanion.LaneZ) > 0.01f) Fail("유격이 뒤쪽 줄(z)을 벗어났다");
                metrics += $" · follow {before:F1}→{after:F1}m";

                // ── 허공에 두면 땅으로 떨어진다(발밑 땅 찾기·중력).
                mystic.transform.position = new Vector3(home.x - 2f, home.y + 2.5f, StoryCompanion.LaneZ);
                for (int k = 0; k < 40; k++) mystic.Step(0.05f);
                if (Mathf.Abs(mystic.transform.position.y - home.y) > 0.6f) Fail($"공중에 둔 호법이 땅으로 안 내려옴(y {mystic.transform.position.y:F2}, 땅 {home.y:F2})");

                // ── 높이가 다르면 곁으로 뛰어오른다 — 2m 높이 임시 발판 위에 플레이어.
                ledge = GameObject.CreatePrimitive(PrimitiveType.Cube);
                ledge.name = "TestCompanionLedge";
                ledge.transform.position = new Vector3(-190f, 1.5f, 0f);
                ledge.transform.localScale = new Vector3(6f, 1f, 4f);
                Physics.SyncTransforms();
                Teleport(cc, playerGo.transform, new Vector3(-190f, 2f, 0f));
                mystic.transform.position = new Vector3(-194f, 0f, StoryCompanion.LaneZ);
                int hops0 = mystic.Hops;
                mystic.Step(0.02f);
                if (mystic.Hops != hops0 + 1) Fail("발판 위 플레이어 곁으로 안 뛰어오름");
                for (int k = 0; k < 12; k++) mystic.Step(0.05f);
                if (Mathf.Abs(mystic.transform.position.y - 2f) > 0.15f) Fail($"뛰어오른 호법이 발판 위가 아니다(y {mystic.transform.position.y:F2})");
                metrics += $" · hop y{mystic.transform.position.y:F1}";
                Object.DestroyImmediate(ledge);
                ledge = null;
                Physics.SyncTransforms();
                Teleport(cc, playerGo.transform, home);
                mystic.transform.position = new Vector3(home.x - 1.5f, home.y, StoryCompanion.LaneZ);

                // ── 선봉 근접 — 교대로 유격을 앞에 세우면 선봉이 곁에 나온다.
                StoryPartyState.Restore(1);
                squad.Refresh(false);
                var van = squad.Member(0);
                if (!van.gameObject.activeSelf || squad.Member(1).gameObject.activeSelf) Fail("Restore(1) 뒤 선봉이 안 나오거나 유격이 안 숨음");
                var d1 = SpawnDummy(new Vector3(home.x + 4f, home.y, 0f));
                dummies.Add(d1);
                van.transform.position = new Vector3(home.x + 1f, home.y, StoryCompanion.LaneZ);
                float hp0 = d1.Hp;
                int hits0 = van.Hits;
                for (int k = 0; k < 60 && van.Hits == hits0; k++) van.Step(0.05f);
                if (van.Hits == hits0 || d1.Hp >= hp0) Fail($"선봉이 4m 앞 적을 안 쳤다(hits {van.Hits - hits0}, hp {hp0:F0}→{d1.Hp:F0})");
                if (van.Target != d1) Fail("선봉 표적이 그 적이 아니다");
                metrics += $" · vanguard {hp0 - d1.Hp:F1}dmg";

                // ── 유격 화살 — 다시 선봉을 앞에 세운다.
                StoryPartyState.Restore(0);
                squad.Refresh(false);
                archer.transform.position = new Vector3(home.x - 1f, home.y, StoryCompanion.LaneZ);
                int shots0 = archer.Hits;
                int boltsBefore = Object.FindObjectsByType<StoryBolt>(FindObjectsSortMode.None).Length;
                for (int k = 0; k < 60 && archer.Hits == shots0; k++) archer.Step(0.05f);
                var bolts = Object.FindObjectsByType<StoryBolt>(FindObjectsSortMode.None);
                if (archer.Hits == shots0 || bolts.Length <= boltsBefore) Fail("유격이 화살을 안 쏨");
                foreach (var b in bolts) if (b.name == "CompanionArrow" && b.Pierce) Fail("유격 화살이 관통한다(관통 없는 판이어야)");
                foreach (var b in bolts) if (b.name == "CompanionArrow") Object.DestroyImmediate(b.gameObject);

                // ── 호법 기력 회복(적이 곁에 있을 때 8초마다 12%)
                StoryCombat.RestoreMp(0f);
                mystic.transform.position = new Vector3(home.x - 1.5f, home.y, StoryCompanion.LaneZ);
                int heals0 = mystic.Heals;
                for (int k = 0; k < 200 && mystic.Heals == heals0; k++) mystic.Step(0.05f);
                float want = StoryCombat.MpMaxCurrent * StoryCompanion.MysticHealFrac;
                if (mystic.Heals != heals0 + 1 || Mathf.Abs(StoryCombat.Mp - want) > 0.5f) Fail($"호법 기력 회복 {StoryCombat.Mp:F1}(기대 {want:F1})");
                metrics += $" · mystic mp+{StoryCombat.Mp:F0}";

                // ── 진짜 교대 — 유격이 앞에 선 채로 선봉으로 바꾸면 선봉이 숨고 유격이 곁에서 튀어나온다.
                //    (서명은 횡소 — 곁엔 더미 하나뿐. 기합·기탄 서명은 뒤 단계 버프·투사체 전제를 흔들어 피한다.)
                StoryPartyState.Restore(1);
                squad.Refresh(false);
                var pc = playerGo.GetComponent<Saga.Story.Player.StoryPlayerController>();
                pc.TriggerPartySwap(0);
                squad.Refresh(false);
                if (StoryPartyState.ActiveIndex != 0) Fail("교대(선봉)가 안 됐다");
                if (squad.Member(0).gameObject.activeSelf) Fail("앞에 나선 선봉이 곁에도 서 있다");
                if (!squad.Member(1).gameObject.activeSelf) Fail("물러난 유격이 곁에 안 나왔다");
                if (Mathf.Abs(squad.Member(1).transform.position.x - home.x) > 3f) Fail("물러난 유격이 플레이어 곁이 아니다");
                typeof(Saga.Story.Player.StoryPlayerController)
                    .GetField("_sweepCooldownLeft", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
                    ?.SetValue(pc, 0f); // 뒤 SweepTest 가 쿨다운 0 에서 시작한다.
            }
            finally
            {
                foreach (var d in dummies) if (d != null) Object.DestroyImmediate(d.gameObject);
                if (floor != null) Object.DestroyImmediate(floor);
                if (ledge != null) Object.DestroyImmediate(ledge);
                StoryPartyState.Restore(origActive);
                squad.Refresh(false);
                StoryCombat.RestoreMp(origMp);
                Teleport(cc, playerGo.transform, start);
                StoryCompanionSquad.PausedForTest = true;
            }
            if (_ok) Debug.Log($"{T} OK — {metrics}");
            return _ok;
        }

        private static StoryEnemy SpawnDummy(Vector3 pos)
        {
            var go = new GameObject("TestCompanionDummy");
            go.transform.position = pos;
            var e = go.AddComponent<StoryEnemy>();
            e.SetLabyrinthEnemy(true); // 경험치·퀘스트 수를 안 건드린다.
            e.ApplyLabyrinthHpMul(20f); // 잡졸 18 은 동료 몇 타에 죽는다 — 단계 사이에 안 죽게.
            return e;
        }

        private static void Teleport(CharacterController cc, Transform t, Vector3 pos)
        {
            if (cc != null) cc.enabled = false;
            t.position = pos;
            if (cc != null) cc.enabled = true;
        }

        private static void Fail(string msg)
        {
            _ok = false;
            Debug.LogError($"{T} FAIL — {msg}");
        }
    }
}
