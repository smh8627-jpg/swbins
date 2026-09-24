using UnityEditor;
using UnityEngine;
using Saga.Story.Cinematics;
using Saga.Story.Data;
using Saga.Story.Player;
using Saga.Story.UI;
using Saga.Story.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 106-10 둘째 단계 "STORY 소환" 진단 — `PlaytestStorySlice` Init(동료 진단 뒤). 맵 밖(x=-300) 임시 바닥에서:
    /// 게이지(플레이어 +3 · 동료 +1 · 소환 0) · 덜 참/곁에 적 없음 거절(게이지 안 씀) · 부르면 게이지 0·소환 컷·HUD 꺼짐·
    /// 이름표 · 3.2초 전엔 안 침 · 3.2초에 좌우 14m 안만 × 8 · 가까운 샷이 화면 앞 낮은 데 · 넘기면 그 자리에서 한 번만 ·
    /// 몸 프리팹이 있으면 모델로. 더미 적은 비경 적 표시(경험치·퀘스트 수 안 바뀜).
    /// </summary>
    public static class PlaytestStorySummon
    {
        private const string T = "[PlaytestStorySlice] summon";
        private static bool _ok;

        public static bool Run()
        {
            _ok = true;
            var playerGo = GameObject.FindWithTag("Player");
            var pc = playerGo != null ? playerGo.GetComponent<StoryPlayerController>() : null;
            var summoner = playerGo != null ? playerGo.GetComponent<StorySummoner>() : null;
            var cc = playerGo != null ? playerGo.GetComponent<CharacterController>() : null;
            var cuts = StoryCutscenes.Instance;
            var hud = Object.FindFirstObjectByType<StoryHud>();
            if (pc == null || summoner == null || cuts == null || hud == null || cuts.SummonDirector == null)
            {
                Fail($"필요한 것 없음(player {pc != null}, 소환 {summoner != null}, 컷 {cuts != null}, 소환 컷 {cuts != null && cuts.SummonDirector != null}, HUD {hud != null}) — 씬 재빌드?");
                return false;
            }
            Vector3 start = playerGo.transform.position;
            Quaternion visualRot = pc.Visual != null ? pc.Visual.rotation : Quaternion.identity;
            var dummies = new System.Collections.Generic.List<StoryEnemy>();
            GameObject floor = null;
            string metrics = "";
            try
            {
                Random.InitState(20260824);
                floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
                floor.name = "TestSummonFloor";
                floor.transform.position = new Vector3(-300f, -0.5f, 0f);
                floor.transform.localScale = new Vector3(80f, 1f, 4f);
                Physics.SyncTransforms();
                var home = new Vector3(-300f, 0f, 0f);
                Teleport(cc, playerGo.transform, home);
                if (pc.Visual != null) pc.Visual.rotation = Quaternion.Euler(0f, 90f, 0f); // +x 를 본다 → 소환수는 x -296.

                // ── 게이지
                StorySummonState.Set(0f);
                var probe = SpawnDummy(home + new Vector3(40f, 0f, 0f));
                dummies.Add(probe);
                probe.TakeDamage(1f);
                float g1 = StorySummonState.Gauge;
                StorySummonState.HitSource = StorySummonState.Source.Companion;
                probe.TakeDamage(1f);
                float g2 = StorySummonState.Gauge;
                StorySummonState.HitSource = StorySummonState.Source.None;
                probe.TakeDamage(1f);
                float g3 = StorySummonState.Gauge;
                StorySummonState.HitSource = StorySummonState.Source.Player;
                if (!Mathf.Approximately(g1, 3f) || !Mathf.Approximately(g2, 4f) || !Mathf.Approximately(g3, 4f))
                    Fail($"게이지 {g1}/{g2}/{g3}(기대 3/4/4 — 플레이어 +3·동료 +1·소환 0)");

                // ── 덜 참 → 거절
                if (summoner.TrySummon() || summoner.LastRefusal != "summon.not_ready" || StoryCutscenes.Playing)
                    Fail($"덜 찬 게이지로 불렸다(거절 {summoner.LastRefusal})");

                // ── 곁에 적 없음(probe 는 40m 밖) → 거절, 게이지 안 씀
                StorySummonState.Set(StorySummonState.Max);
                if (summoner.TrySummon() || summoner.LastRefusal != "summon.no_foe" || !StorySummonState.Ready)
                    Fail($"적 없는데 불렸거나 게이지를 썼다(거절 {summoner.LastRefusal}, 게이지 {StorySummonState.Gauge})");

                // ── 부른다 — 소환수 자리 x-296: 앞 x-286(10m) · 뒤 x-303(7m) 는 맞고, x-276(20m) 은 안 맞는다.
                var near = SpawnDummy(new Vector3(-286f, 0f, 0f));
                var behind = SpawnDummy(new Vector3(-303f, 0f, 0f));
                var far = SpawnDummy(new Vector3(-276f, 0f, 0f));
                dummies.Add(near); dummies.Add(behind); dummies.Add(far);
                float hpN = near.Hp, hpB = behind.Hp, hpF = far.Hp;
                int slams = StorySummon.SlamCount;
                if (!summoner.TrySummon()) Fail($"다 찬 게이지·곁에 적이 있는데 안 불렸다(거절 {summoner.LastRefusal})");
                var s = summoner.LastSummon;
                if (s == null) { Fail("소환수가 안 섰다"); return false; }
                if (StorySummonState.Gauge != 0f) Fail($"불렀는데 게이지가 {StorySummonState.Gauge}");
                if (Mathf.Abs(s.transform.position.x - (-296f)) > 0.01f) Fail($"소환수 자리 x {s.transform.position.x:F2}(기대 -296)");
                if (!cuts.PlayingSummon) Fail("소환 컷이 안 돌았다");
                if (hud.GetComponentInParent<Canvas>().enabled) Fail("소환 컷 동안 HUD 가 켜져 있다");
                string wantTitle = StoryLocalization.T("cut.summon_title", "우레뿔 거수");
                if (cuts.ShownName != wantTitle) Fail($"이름표 \"{cuts.ShownName}\"(기대 \"{wantTitle}\")");
                bool hasPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(SetupNpcCharacterImports.PrefabPath("Warrok")) != null;
                if (hasPrefab && !s.HasModel) Fail("Warrok 프리팹이 있는데 소환수가 캡슐이다");

                // 가까운 샷 — 화면 앞(-Z) 낮은 데.
                cuts.Seek(StoryCutscenes.SummonWideSec + 0.5);
                var closeCam = cuts.SummonCameraOf(true);
                Vector3 cp = closeCam != null ? closeCam.transform.position : Vector3.zero;
                if (closeCam == null || cp.z > s.transform.position.z - 3f || cp.y > s.transform.position.y + StorySummon.Height * 0.5f)
                    Fail($"가까운 샷 자리 {cp}");
                metrics += $"close cam z{cp.z - s.transform.position.z:F1} y{cp.y:F1}";

                // 3.2초 전엔 안 친다.
                s.Tick(3.0f);
                if (s.Slammed || near.Hp < hpN) Fail("3.2초 전에 내려찍었다");
                // 3.2초에 친다 — 좌우 14m 안만.
                s.Tick(0.25f);
                if (!s.Slammed || StorySummon.SlamCount != slams + 1) Fail("3.2초가 지났는데 안 내려찍었다");
                float dmg = s.Damage;
                float expect = pc.AttackPower * StorySummon.DamageMul;
                if (Mathf.Abs(dmg - expect) > 0.01f) Fail($"피해 {dmg:F1}(기대 공격력 × 8 = {expect:F1})");
                if (Mathf.Abs((hpN - near.Hp) - dmg) > 0.01f) Fail($"앞 적 피해 {hpN - near.Hp:F1}(기대 {dmg:F1})");
                if (Mathf.Abs((hpB - behind.Hp) - dmg) > 0.01f) Fail($"뒤 적 피해 {hpB - behind.Hp:F1}(기대 {dmg:F1})");
                if (far.Hp < hpF) Fail("20m 밖 적이 맞았다");
                if (s.LastHitCount != 2) Fail($"맞은 적 {s.LastHitCount}(기대 2)");
                if (StorySummonState.Gauge != 0f) Fail("내려찍기가 게이지를 채웠다");
                metrics += $" · slam {dmg:F0}×{s.LastHitCount}";
                cuts.Skip();
                if (StoryCutscenes.Playing) Fail("컷을 넘겼는데 안 끝났다");
                if (!hud.GetComponentInParent<Canvas>().enabled) Fail("컷이 끝났는데 HUD 가 안 돌아왔다");
                if (StorySummon.SlamCount != slams + 1) Fail("이미 내려찍은 뒤 넘겼는데 한 번 더 쳤다");
                if (s != null) Object.DestroyImmediate(s.gameObject);

                // ── 초반에 넘기면 그 자리에서 한 번만.
                StorySummonState.Set(StorySummonState.Max);
                hpN = near.Hp;
                if (!summoner.TrySummon()) Fail($"두 번째 소환이 안 불렸다(거절 {summoner.LastRefusal})");
                var s2 = summoner.LastSummon;
                s2.Tick(0.5f);
                cuts.Skip();
                if (StorySummon.SlamCount != slams + 2 || hpN - near.Hp < dmg - 0.01f) Fail("초반에 넘겼는데 그 자리에서 안 내려찍었다");
                if (s2 != null) Object.DestroyImmediate(s2.gameObject);
                metrics += hasPrefab ? " · model Warrok" : " · capsule";
            }
            finally
            {
                if (StoryCutscenes.Playing) cuts.Skip();
                foreach (var d in dummies) if (d != null) Object.DestroyImmediate(d.gameObject);
                if (floor != null) Object.DestroyImmediate(floor);
                StorySummonState.HitSource = StorySummonState.Source.Player;
                StorySummonState.Set(0f);
                if (pc.Visual != null) pc.Visual.rotation = visualRot;
                Teleport(cc, playerGo.transform, start);
            }
            if (_ok) Debug.Log($"{T} OK — {metrics}");
            return _ok;
        }

        private static StoryEnemy SpawnDummy(Vector3 pos)
        {
            var go = new GameObject("TestSummonDummy");
            go.transform.position = pos;
            var e = go.AddComponent<StoryEnemy>();
            e.SetLabyrinthEnemy(true);
            e.ApplyLabyrinthHpMul(40f); // 720 — 내려찍기 둘을 맞아도 안 죽게.
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
