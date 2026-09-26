using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using Saga.Core;
using Saga.Title;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 110 ③ 측정 진단 — 에디터에서 `SagaPerf.ForceEnable` 로 켜고 시간을 줄여(몸풀기 0.3초·두 구간 3.5초) 돈다(`-quit` 없이).
    /// 타이틀에 자동 측정·성능 기록 단추 · 화면 줄이 찬다 · 자동 측정 = 다섯 판 × 상한/풀기 열 줄(순서·초·fps) → 타이틀로 돌아와 기록표가 저절로 열림 ·
    /// 자동 측정은 세이브를 안 건드림(바이트 그대로) · 사람이 논 구간은 "play" 한 줄(판 이름) · 기록 지우기. 오류 로그 0.
    /// 진짜 세이브 다섯과 `perf_log.json` 은 떠 두고 끝에 되돌린다.
    /// </summary>
    public static class PlaytestSagaPerf
    {
        private const string T = "[PlaytestSagaPerf]";
        private static readonly Dictionary<string, byte[]> Backup = new Dictionary<string, byte[]>();
        private static readonly List<string> Notes = new List<string>();
        private static IEnumerator _run;
        private static bool _ok, _done;
        private static bool _origOptionsEnabled;
        private static EnterPlayModeOptions _origOptions;

        private static IEnumerable<string> Files() => new[]
        {
            Saga.Go.Data.SaveState.FileName, Saga.Dungeon.Data.SaveState.FileName, Saga.Forest.Data.ForestSaveState.FileName,
            Saga.Story.Data.StorySaveState.FileName, Saga.Realm.Data.RealmSaveState.FileName, SagaPerf.LogFile,
        }.Select(f => Path.Combine(Application.persistentDataPath, f));

        [MenuItem("Saga/Playtest Saga Perf (Headless)")]
        public static void Run()
        {
            _ok = true;
            _done = false;
            Notes.Clear();
            Backup.Clear();
            foreach (var p in Files()) Backup[p] = File.Exists(p) ? File.ReadAllBytes(p) : null;
            SagaPerf.ClearLog();
            SagaPerf.ForceEnable = true;
            SagaPerf.WarmupSeconds = 0.3f;
            SagaPerf.CappedSeconds = 3.5f;
            SagaPerf.UncappedSeconds = 3.5f;
            SagaPlayerBuild.SyncEditorBuildScenes();
            _origOptionsEnabled = EditorSettings.enterPlayModeOptionsEnabled;
            _origOptions = EditorSettings.enterPlayModeOptions;
            EditorSettings.enterPlayModeOptionsEnabled = true;
            EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;
            EditorSceneManager.OpenScene(SagaFlow.TitleScenePath);
            Application.logMessageReceived += OnLog;
            EditorApplication.playModeStateChanged += OnState;
            EditorApplication.isPlaying = true;
        }

        private static void OnLog(string condition, string stack, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception) return;
            if (stack.Contains("UnityEditor.Search")) return;
            _ok = false;
            Debug.LogWarning($"{T} 오류 로그: {condition}");
        }

        private static void OnState(PlayModeStateChange s)
        {
            if (s == PlayModeStateChange.EnteredPlayMode)
            {
                _run = Script();
                EditorApplication.update += Tick;
            }
            else if (s == PlayModeStateChange.EnteredEditMode)
            {
                Application.logMessageReceived -= OnLog;
                EditorApplication.playModeStateChanged -= OnState;
                EditorSettings.enterPlayModeOptionsEnabled = _origOptionsEnabled;
                EditorSettings.enterPlayModeOptions = _origOptions;
                SetupSagaFonts.ResetDynamicFonts(); // 진단 중 동적 글꼴에 오른 글자를 비워 에셋을 늘 같게.
                SagaPerf.ForceEnable = false;
                foreach (var kv in Backup)
                {
                    try
                    {
                        if (kv.Value != null) File.WriteAllBytes(kv.Key, kv.Value);
                        else if (File.Exists(kv.Key)) File.Delete(kv.Key);
                    }
                    catch (System.Exception e) { Debug.LogWarning($"{T} 되돌리기 실패 {kv.Key}: {e.Message}"); }
                }
                bool ok = _ok && _done;
                Debug.Log(ok ? $"{T} OK - 단추·화면 줄·자동 측정 열 줄·기록표·세이브 그대로·놀이 한 줄·지우기·오류 0 | {string.Join(" · ", Notes)}"
                             : $"{T} FAIL - ok={_ok} done={_done} | {string.Join(" · ", Notes)}");
                EditorApplication.Exit(ok ? 0 : 1);
            }
        }

        private static void Tick()
        {
            bool more;
            try { more = _run.MoveNext(); }
            catch (System.Exception e) { Fail("진단 예외 " + e); more = false; }
            if (!more)
            {
                EditorApplication.update -= Tick;
                EditorApplication.isPlaying = false;
            }
        }

        private static IEnumerator Script()
        {
            yield return WaitTitle();
            var t = TitleScreen.Instance;
            if (t == null || t.BenchmarkButton == null || t.PerfButton == null) { Fail("타이틀 측정 단추 없음"); yield break; }
            for (int k = 0; k < 60; k++) yield return null;
            var runner = SagaPerfRunner.Instance;
            if (runner == null || !runner.OverlayText.Contains("fps")) Fail($"화면 줄 '{runner?.OverlayText}'");

            // 자동 측정 — 세이브는 그대로여야
            var before = Files().Where(p => !p.EndsWith(SagaPerf.LogFile)).ToDictionary(p => p, p => File.Exists(p) ? File.ReadAllBytes(p) : null);
            t.BenchmarkButton.onClick.Invoke();
            for (int k = 0; k < 5 && !SagaPerf.BenchmarkRunning; k++) yield return null;
            if (!SagaPerf.BenchmarkRunning) Fail("자동 측정이 안 시작");
            float deadline = Time.realtimeSinceStartup + 600f; // 에디터 배치는 초당 천 틱 넘게 돌아 틱 수로는 못 잰다.
            while (SagaPerf.BenchmarkRunning && Time.realtimeSinceStartup < deadline) yield return null;
            if (SagaPerf.BenchmarkRunning) { Fail("자동 측정이 안 끝남"); yield break; }
            yield return WaitTitle();
            var recs = SagaPerf.LoadLog();
            var games = TitleScreen.Games;
            if (recs.Count != games.Length * 2) Fail($"기록 {recs.Count}줄(10이어야)");
            for (int i = 0; i < games.Length && i * 2 + 1 < recs.Count; i++)
            {
                var a = recs[i * 2];
                var b = recs[i * 2 + 1];
                if (a.game != games[i].Key || b.game != games[i].Key || a.phase != "capped" || b.phase != "uncapped")
                    Fail($"{i} 번 기록 {a.game}/{a.phase}·{b.game}/{b.phase}");
                foreach (var r in new[] { a, b })
                    if (r.seconds < 3f || r.avgFps <= 0f || r.lowFps <= 0f || r.worstMs <= 0f || r.peakMemMB <= 0 || string.IsNullOrEmpty(r.device))
                        Fail($"{r.game}/{r.phase} 값 이상 {r.seconds:F1}s {r.avgFps:F1}fps {r.lowFps:F1} {r.worstMs:F0}ms {r.peakMemMB}MB");
                Notes.Add($"{a.game} {a.avgFps:F0}/{b.avgFps:F0}");
            }
            foreach (var kv in before)
            {
                var now = File.Exists(kv.Key) ? File.ReadAllBytes(kv.Key) : null;
                bool same = (now == null && kv.Value == null) || (now != null && kv.Value != null && now.SequenceEqual(kv.Value));
                if (!same) Fail($"자동 측정이 세이브를 바꿈 {Path.GetFileName(kv.Key)}");
            }
            t = TitleScreen.Instance;
            if (t == null || !t.PerfOpen) Fail("자동 측정 뒤 기록표가 안 열림");
            else foreach (var g in games) if (!t.PerfText.Contains(g.Key)) Fail($"기록표에 {g.Key} 없음");

            // 사람이 논 구간
            SagaPerf.ClearLog();
            int di = TitleScreen.IndexOf("dungeon");
            (t.ContinueButtons[di] ?? t.NewButtons[di]).onClick.Invoke();
            if (t.ConfirmOpen) t.ConfirmNo.onClick.Invoke();
            deadline = Time.realtimeSinceStartup + 120f;
            while (SagaFlow.CurrentGame != "dungeon" && Time.realtimeSinceStartup < deadline) yield return null;
            float until = Time.realtimeSinceStartup + 4f;
            while (Time.realtimeSinceStartup < until) yield return null;
            SagaFlow.ReturnToTitle();
            yield return WaitTitle();
            recs = SagaPerf.LoadLog();
            if (recs.Count != 1 || recs[0].game != "dungeon" || recs[0].phase != "play") Fail($"놀이 기록 {recs.Count}줄 {(recs.Count > 0 ? recs[0].game + "/" + recs[0].phase : "")}");
            else Notes.Add($"놀이 {recs[0].seconds:F1}s");

            TitleScreen.Instance.ShowPerf(true);
            SagaPerf.ClearLog();
            TitleScreen.Instance.ShowPerf(true);
            if (SagaPerf.LoadLog().Count != 0 || !TitleScreen.Instance.PerfText.StartsWith("기록 없음")) Fail("지우기 안 됨");
            _done = true;
        }

        private static IEnumerator WaitTitle()
        {
            float deadline = Time.realtimeSinceStartup + 120f;
            while (Time.realtimeSinceStartup < deadline)
            {
                if (SceneManager.GetActiveScene().name == SagaFlow.TitleSceneName && TitleScreen.Instance != null) break;
                yield return null;
            }
            for (int k = 0; k < 10; k++) yield return null;
        }

        private static void Fail(string why)
        {
            _ok = false;
            Debug.LogWarning($"{T} FAIL - {why}");
        }
    }
}
