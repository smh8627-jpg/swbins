using System.Collections.Generic;
using UnityEditor;
using UnityEngine;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 106-4 "캐릭터 통일" GO·FOREST·STORY 몫 + 두목 전용 몸(GO 수호장 Maw·DUNGEON 능묘지기 Ganfaul) 진단 — 네 판 헤드리스가 각자 부른다(읽기만, FOREST 는 휨을 되돌린다).
    /// NPC 마다: 그 몸의 `&lt;이름&gt;Animated.prefab` 이 이 PC 에 있으면 "Visual" 이 Humanoid Animator·컨트롤러를 가진 사실 모델이고
    /// Kenney 가 같이 서지 않음 · 키 = 그 판 사람 키(±6%) · 발 = 뿌리 높이 · `NpcIdle` · 접지 그림자.
    /// 프리팹이 없는 PC(로컬 전용 자산)면 그 NPC 는 건너뛴다고 적는다.
    /// FOREST 숲지기는 셰이더가 안 휘는 사실 모델이라 땅 휨만큼 내려가는지도 본다.
    /// </summary>
    public static class PlaytestNpcModels
    {
        private static bool _ok;
        private static string _tag;

        public static bool Go()
        {
            Begin("PlaytestHeadless");
            string m = Check("Villager_npc_elder", "PeasantMan", Saga.Go.World.CharacterVisual.HumanHeight, typeof(Saga.Go.World.NpcIdle))
                + Check("Villager_npc_merchant", "PeasantGirl", Saga.Go.World.CharacterVisual.HumanHeight, typeof(Saga.Go.World.NpcIdle))
                + Check("Villager_npc_traveler", "Archer", Saga.Go.World.CharacterVisual.HumanHeight, typeof(Saga.Go.World.NpcIdle));
            // 두목 전용 몸 — 망루 수호장 = Maw(없는 PC 는 Brute).
            var spawner = Object.FindFirstObjectByType<Saga.Go.Combat.FieldSpawner>();
            var maw = AssetDatabase.LoadAssetAtPath<GameObject>(SetupNpcCharacterImports.PrefabPath("Maw"));
            if (spawner == null) Fail("FieldSpawner 없음");
            else if (maw != null)
            {
                var so = new SerializedObject(spawner);
                if (so.FindProperty("guardianModel").objectReferenceValue != maw) Fail($"수호장 몸이 Maw 아님({so.FindProperty("guardianModel").objectReferenceValue})");
                else m += " 수호장=Maw";
            }
            else m += " 수호장: Maw 프리팹 없음(건너뜀)";
            return End(m);
        }

        public static bool Forest()
        {
            Begin("PlaytestForestHeadless");
            var keeper = Object.FindFirstObjectByType<Saga.Forest.World.ForestVillager>();
            if (keeper == null) { Fail("숲지기 없음"); return End(""); }
            keeper.FollowCurve(keeper.transform.position); // 제 자리 기준이면 휨 0
            string m = Check(keeper.gameObject.name, "PeasantMan", 1.8f, typeof(Saga.Forest.World.NpcIdle));
            if (keeper.RigVisual != null)
            {
                float y0 = keeper.RigVisual.localPosition.y;
                var far = keeper.transform.position + new Vector3(20f, 0f, 0f);
                keeper.FollowCurve(far);
                float want = y0 - 400f * Saga.Forest.World.ForestLandmark.CurveAmount;
                if (Mathf.Abs(keeper.RigVisual.localPosition.y - want) > 0.001f) Fail($"숲지기가 휨 따라 안 내려감 {keeper.RigVisual.localPosition.y:F3} ≠ {want:F3}");
                var player = GameObject.FindWithTag("Player");
                keeper.FollowCurve(player != null ? player.transform.position : keeper.transform.position);
            }
            return End(m);
        }

        /// <summary>DUNGEON — 능묘지기 = Ganfaul(없는 PC 는 Brute 1.5배), 키 3.5m·제 빛깔.</summary>
        public static bool Dungeon()
        {
            Begin("PlaytestDungeonHeadless");
            string m = "";
            var ganfaul = AssetDatabase.LoadAssetAtPath<GameObject>(SetupNpcCharacterImports.PrefabPath("Ganfaul"));
            Saga.Dungeon.World.DungeonEnemy keeper = null;
            foreach (var e in Object.FindObjectsByType<Saga.Dungeon.World.DungeonEnemy>(FindObjectsInactive.Include, FindObjectsSortMode.None))
                if (new SerializedObject(e).FindProperty("displayName").stringValue == "능묘지기") keeper = e;
            if (keeper == null) { Fail("능묘지기 없음"); return End(m); }
            if (ganfaul == null) return End(" 능묘지기: Ganfaul 프리팹 없음(건너뜀)");
            var so = new SerializedObject(keeper);
            if (so.FindProperty("modelPrefab").objectReferenceValue != ganfaul) Fail("능묘지기 몸이 Ganfaul 아님");
            if (so.FindProperty("bodyColor").colorValue != Color.white) Fail("전용 몸에 옛 검푸른 칠");
            float want = BuildDungeonTemple.GuardianHeight;
            var visual = keeper.transform.Find("Visual");
            if (visual != null)
            {
                var rs = visual.GetComponentsInChildren<Renderer>();
                if (rs.Length > 0)
                {
                    var b = rs[0].bounds;
                    foreach (var r in rs) b.Encapsulate(r.bounds);
                    if (Mathf.Abs(b.size.y - want) > want * 0.08f) Fail($"능묘지기 키 {b.size.y:F2} ≠ {want:F2}");
                    m += $" 능묘지기=Ganfaul({b.size.y:F2}m)";
                }
            }
            else m += $" 능묘지기=Ganfaul(배율 {keeper.VisualScale:F2}, 아직 안 섬)";
            return End(m);
        }

        public static bool Story()
        {
            Begin("PlaytestStorySlice");
            string m = Check("Npc_Scout", "PeasantMan", 1.75f, typeof(Saga.Story.World.NpcIdle)) + Check("Npc_JobTrainer", "Jolleen", 1.75f, typeof(Saga.Story.World.NpcIdle));
            return End(m);
        }

        private static string Check(string rootName, string body, float height, System.Type idleType)
        {
            var root = GameObject.Find(rootName);
            if (root == null) { Fail($"{rootName} 없음"); return ""; }
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(SetupNpcCharacterImports.PrefabPath(body));
            if (prefab == null) return $" {rootName}: {body} 프리팹 없음(이 PC 에 안 받음 — 건너뜀)";
            var visuals = new List<Transform>();
            foreach (Transform t in root.transform) if (t.name == "Visual") visuals.Add(t);
            if (visuals.Count != 1) { Fail($"{rootName} Visual {visuals.Count} 개(Kenney 가 같이 섰나)"); return ""; }
            var animator = visuals[0].GetComponent<Animator>();
            if (animator == null || !animator.isHuman || animator.runtimeAnimatorController == null) { Fail($"{rootName} 사실 모델 아님(Animator·Humanoid·컨트롤러)"); return ""; }
            if (root.GetComponent<Saga.Core.BlobShadow>() == null) Fail($"{rootName} 접지 그림자 없음");
            if (root.GetComponent(idleType) == null) Fail($"{rootName} NpcIdle 없음");
            var rs = visuals[0].GetComponentsInChildren<Renderer>();
            if (rs.Length == 0) { Fail($"{rootName} 렌더러 없음"); return ""; }
            var b = rs[0].bounds;
            foreach (var r in rs) b.Encapsulate(r.bounds);
            if (Mathf.Abs(b.size.y - height) > height * 0.06f) Fail($"{rootName} 키 {b.size.y:F2} ≠ {height:F2}");
            if (Mathf.Abs(b.min.y - root.transform.position.y) > 0.12f * height / 1.8f) Fail($"{rootName} 발 {b.min.y:F2} ≠ 뿌리 {root.transform.position.y:F2}");
            return $" {rootName}={body}({b.size.y:F2}m)";
        }

        private static void Begin(string tag) { _tag = tag; _ok = true; }

        private static bool End(string m)
        {
            if (_ok) Debug.Log($"[{_tag}] npcModels OK - 사실 모델·Humanoid·키·발·대기·그림자 |{m}");
            return _ok;
        }

        private static void Fail(string msg)
        {
            _ok = false;
            Debug.LogError($"[{_tag}] npcModels FAIL - {msg}");
        }
    }
}
