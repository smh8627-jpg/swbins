using System.Collections.Generic;
using System.Reflection;
using UnityEngine;
using Saga.Dungeon.Cinematics;
using Saga.Dungeon.Data;
using Saga.Dungeon.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 106-7 "층 두목 등장 컷" 진단 — `PlaytestDungeonHeadless` 가 파티 진단 앞에서 부른다. 더미로:
    /// 층 두목이 달려들면 컷(FieldBoss)·75초 타이머는 컷 동안 안 줄어듦 · 이름표가 그 두목 이름 · 넓은→가까운 샷 순간 포효 ·
    /// 가까운 카메라가 두목 곁 · 넘기면 타이머가 흐름 · 층 두목은 다시 만나도 또 틂 · 살수는 이름마다 한 번 · 능묘지기(갑주)·잡졸은 안 틂.
    /// </summary>
    public static class PlaytestDungeonBossIntro
    {
        private const string T = "[PlaytestDungeonHeadless] boss intro";
        private static bool _ok;
        private static readonly List<GameObject> Spawned = new List<GameObject>();

        public static bool Run()
        {
            _ok = true;
            var playerGo = GameObject.FindWithTag("Player");
            var cuts = DungeonCutscenes.Instance;
            if (playerGo == null || cuts == null || cuts.TitleCard == null)
            {
                Fail($"필요한 것 없음(player {playerGo != null}, 컷 {cuts != null}) — 씬 재빌드?");
                return false;
            }
            Vector3 p = playerGo.transform.position;
            var others = new List<DungeonEnemy>(DungeonEnemy.Active);
            foreach (var e in others) if (e != null) e.gameObject.SetActive(false);
            string metrics = "";
            try
            {
                cuts.Skip();
                DungeonEnemy.ResetIntroSeenForTest();

                // ── 층 두목
                var boss = Dummy(p + new Vector3(0f, 0f, 4f), "황건적 두목", isBoss: true, world: true, scale: 2f);
                int plays = cuts.PlayCount;
                boss.Tick(0.01f);
                if (!DungeonCutscenes.Playing || cuts.Current != CutsceneKind.FieldBoss) Fail($"층 두목이 달려들어도 등장 컷이 안 돌았다 ({cuts.Current})");
                if (!Near(boss.WorldBossTimeLeft, 75f)) Fail($"두목전 타이머가 시작 안 됨 ({boss.WorldBossTimeLeft})");
                boss.Tick(1f);
                if (!Near(boss.WorldBossTimeLeft, 75f)) Fail($"컷 동안 두목전 시간이 줄었다 ({boss.WorldBossTimeLeft})");

                cuts.Seek(2.3);
                string wantName = DungeonLocalization.T("enemy.boss", "황건적 두목");
                if (cuts.TitleCard.ShownTitle != wantName || cuts.TitleCard.ShownAlpha <= 0f)
                    Fail($"이름표가 이 두목이 아니다 (\"{cuts.TitleCard.ShownTitle}\", α {cuts.TitleCard.ShownAlpha:0.00}, 기대 \"{wantName}\")");
                var closeCam = cuts.CameraOf(CutsceneKind.FieldBoss, true);
                if (closeCam == null || cuts.CameraOf(CutsceneKind.FieldBoss) == null) Fail("등장 컷 카메라가 없다");
                else
                {
                    float d = Vector3.Distance(closeCam.transform.position, boss.transform.position);
                    if (d > 6f) Fail($"가까운 샷이 두목에게서 멀다 ({d:0.0}m)");
                    if (closeCam.transform.position.y > boss.transform.position.y + 1.2f) Fail("가까운 샷이 올려다보지 않는다(카메라가 높다)");
                    metrics += $" 가까운 샷 {d:0.0}m";
                }
                if (cuts.RoarFired) Fail("포효가 너무 일찍");
                cuts.Seek(1.7);
                cuts.Tick(0.01f);
                if (!cuts.RoarFired) Fail("넓은→가까운 샷 순간 포효 신호가 없다");

                cuts.Skip();
                if (DungeonCutscenes.Playing) Fail("등장 컷이 안 넘어갔다");
                boss.Tick(1f);
                if (!(boss.WorldBossTimeLeft < 75f)) Fail("컷 뒤에도 두목전 시간이 안 흐른다");
                Kill(boss);

                var boss2 = Dummy(p + new Vector3(0f, 0f, 4f), "황건적 두목", isBoss: true, world: true, scale: 2f);
                boss2.Tick(0.01f);
                if (cuts.Current != CutsceneKind.FieldBoss) Fail("다음 층 두목에 등장 컷이 또 안 돌았다");
                cuts.Skip();
                Kill(boss2);

                // ── 살수: 이름마다 한 번
                var mini = Dummy(p + new Vector3(0f, 0f, 4f), "황건 살수", isBoss: true, world: false, scale: 1.8f);
                mini.Tick(0.01f);
                if (cuts.Current != CutsceneKind.FieldBoss) Fail("살수 첫 만남에 등장 컷이 안 돌았다");
                cuts.Skip();
                Kill(mini);
                var mini2 = Dummy(p + new Vector3(0f, 0f, 4f), "황건 살수", isBoss: true, world: false, scale: 1.8f);
                mini2.Tick(0.01f);
                if (DungeonCutscenes.Playing) Fail("같은 살수를 다시 만났는데 컷이 또 돌았다");
                Kill(mini2);

                // ── 능묘지기(갑주)·잡졸은 안 튼다
                var armored = Dummy(p + new Vector3(0f, 0f, 4f), "능묘지기", isBoss: true, world: false, scale: 1.5f, armored: true);
                armored.Tick(0.01f);
                if (DungeonCutscenes.Playing) Fail("능묘지기가 층 두목 컷을 틀었다(제 컷이 따로 있다)");
                Kill(armored);
                var grunt = Dummy(p + new Vector3(0f, 0f, 4f), "황건적", isBoss: false, world: false, scale: 1f);
                grunt.Tick(0.01f);
                if (DungeonCutscenes.Playing) Fail("잡졸이 등장 컷을 틀었다");
                Kill(grunt);

                metrics += $" · 컷 {cuts.PlayCount - plays}번(두목 2·살수 1)";
                if (cuts.PlayCount - plays != 3) Fail($"컷 수 {cuts.PlayCount - plays} ≠ 3");
            }
            finally
            {
                cuts.Skip();
                foreach (var go in Spawned) if (go != null) Object.DestroyImmediate(go);
                Spawned.Clear();
                foreach (var e in others) if (e != null) e.gameObject.SetActive(true);
                DungeonEnemy.ResetIntroSeenForTest();
            }
            if (_ok) Debug.Log($"{T} OK - 층 두목 컷·타이머 멈춤·이름표·포효·가까운 샷·넘김 뒤 시간·또 틂·살수 한 번·능묘지기/잡졸 안 틂 |{metrics}");
            return _ok;
        }

        private static DungeonEnemy Dummy(Vector3 pos, string name, bool isBoss, bool world, float scale, bool armored = false)
        {
            var go = new GameObject("BossIntroDummy");
            go.SetActive(false);
            go.transform.position = pos;
            var e = go.AddComponent<DungeonEnemy>();
            e.ConfigureCombat(500f, 0f, 0, 0, null, null, isBoss, name, Color.gray, scale, world);
            if (armored)
            {
                typeof(DungeonEnemy).GetField("bombArmored", BindingFlags.NonPublic | BindingFlags.Instance).SetValue(e, true);
            }
            go.SetActive(true);
            Spawned.Add(go);
            return e;
        }

        private static void Kill(DungeonEnemy e)
        {
            if (e == null) return;
            Spawned.Remove(e.gameObject);
            Object.DestroyImmediate(e.gameObject);
        }

        private static bool Near(float a, float b, float eps = 0.01f) => Mathf.Abs(a - b) <= eps;

        private static void Fail(string msg)
        {
            Debug.LogError($"{T}: {msg}");
            _ok = false;
        }
    }
}
