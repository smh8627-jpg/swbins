using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using TMPro;
using UnityEngine;
using UnityEngine.Profiling;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace Saga.Core
{
    /// <summary>
    /// PLAN.md 110 ③ 폰 성능·발열 — 측정용 빌드(`SAGA_PERF` 기호, `SagaPlayerBuild.BuildAndroidPerf`)에서만 켜진다.
    /// ① 화면 아래 한 줄: fps · 프레임 ms · 1% 낮은 fps · 배터리 온도 · 발열 단계 · 메모리.
    /// ② 씬마다 기록(판 키·초·평균 fps·1% 낮은·가장 긴 프레임·최고 온도·최고 발열 단계·최고 메모리) → `perf_log.json` 에 덧붙인다.
    /// ③ 자동 측정 <see cref="RunBenchmark"/>: 다섯 판을 차례로 열어 가만히 둔 채 몸풀기 → 30fps 상한 그대로(실제로 버티나) → 상한 풀고(여유가 얼마나)
    ///    → 타이틀로. 자동 측정은 세이브를 안 쓴다(자동 저장 끔). 타이틀이 기록표를 보여 준다.
    /// 그래픽은 안 깎는다 — 재기만 한다.
    /// </summary>
    public static class SagaPerf
    {
#if SAGA_PERF
        public const bool Compiled = true;
#else
        public const bool Compiled = false;
#endif
        /// <summary>진단이 에디터에서 켤 때.</summary>
        public static bool ForceEnable;
        public static bool Enabled => Compiled || ForceEnable;

        public const string LogFile = "perf_log.json";
        public static float WarmupSeconds = 10f;
        public static float CappedSeconds = 30f;
        public static float UncappedSeconds = 15f;
        public const int UncappedTarget = 120;

        [Serializable]
        public class Record
        {
            public string game;
            public string phase;      // "capped" = 판 원래 상한, "uncapped" = 상한 풀기, "play" = 사람이 논 구간
            public string device;
            public int quality;
            public int width, height;
            public float seconds;
            public float avgFps;
            public float lowFps;      // 1% 낮은 — 가장 긴 1% 프레임의 평균
            public float worstMs;
            public float maxTempC;    // 배터리 온도(안드로이드만, 없으면 -1)
            public int maxThermal;    // PowerManager 발열 단계 0~6(API 29+, 없으면 -1)
            public int peakMemMB;
            public string at;
        }

        [Serializable]
        private class LogData { public List<Record> records = new List<Record>(); }

        public static string LogPath => Path.Combine(Application.persistentDataPath, LogFile);
        public static bool BenchmarkRunning { get; internal set; }
        public static event Action BenchmarkFinished;

        public static List<Record> LoadLog()
        {
            try
            {
                if (File.Exists(LogPath)) return JsonUtility.FromJson<LogData>(File.ReadAllText(LogPath))?.records ?? new List<Record>();
            }
            catch (Exception e) { Debug.LogWarning($"[SagaPerf] 기록 읽기 실패: {e.Message}"); }
            return new List<Record>();
        }

        internal static void Append(Record r)
        {
            var all = LoadLog();
            all.Add(r);
            if (all.Count > 200) all.RemoveRange(0, all.Count - 200);
            try { File.WriteAllText(LogPath, JsonUtility.ToJson(new LogData { records = all }, true)); }
            catch (Exception e) { Debug.LogWarning($"[SagaPerf] 기록 쓰기 실패: {e.Message}"); }
            Debug.Log($"[SagaPerf] {r.game}/{r.phase} {r.seconds:F0}s 평균 {r.avgFps:F1} · 1%↓ {r.lowFps:F1} · 최장 {r.worstMs:F0}ms · {r.maxTempC:F1}°C · 발열 {r.maxThermal} · {r.peakMemMB}MB");
        }

        public static void ClearLog()
        {
            try { if (File.Exists(LogPath)) File.Delete(LogPath); } catch (Exception) { }
        }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Boot()
        {
            if (Enabled) SagaPerfRunner.Ensure();
        }

        public static void RunBenchmark(IList<(string key, string scene)> games)
        {
            SagaPerfRunner.Ensure();
            SagaPerfRunner.Instance.StartBenchmark(games);
        }

        internal static void RaiseFinished() => BenchmarkFinished?.Invoke();

        /// <summary>기록표 한 줄 — TMP 위치 태그로 칸을 맞춘다(비례 폰트). 온도·발열 없는 칸은 "–".</summary>
        public static string Row(Record r) =>
            $"{r.game}<pos=11%>{PhaseKo(r.phase)}<pos=18%>평균 {r.avgFps:F1}<pos=32%>1%↓ {r.lowFps:F1}<pos=46%>최장 {r.worstMs:F0}ms" +
            $"<pos=61%>{(r.maxTempC >= 0 ? r.maxTempC.ToString("F1") + "°C" : "–")}<pos=72%>발열 {(r.maxThermal >= 0 ? r.maxThermal.ToString() : "–")}<pos=83%>{r.peakMemMB}MB";

        public static string PhaseKo(string phase) => phase == "capped" ? "상한" : phase == "uncapped" ? "풀기" : "놀이";
    }

    /// <summary>씬을 넘어 살아 있는 측정기(DontDestroyOnLoad).</summary>
    public class SagaPerfRunner : MonoBehaviour
    {
        public static SagaPerfRunner Instance { get; private set; }

        private const int MaxFrames = 20000;
        private readonly List<float> _frames = new List<float>(4096);
        private float _elapsed;
        private int _frameCount;
        private float _maxTemp = -1f;
        private int _maxThermal = -1;
        private long _peakMem;
        private float _sampleLeft;
        private string _phase = "play";
        private bool _recording = true;
        private TextMeshProUGUI _line;
        private float _lineLeft;
        private int _lineFrames;
        private float _lineTime;
        private string _windowName = "";

        public string OverlayText => _line != null ? _line.text : "";
        public float LastTempC { get; private set; } = -1f;
        public int LastThermal { get; private set; } = -1;

        public static void Ensure()
        {
            if (Instance != null) return;
            var go = new GameObject("SagaPerfRunner");
            DontDestroyOnLoad(go);
            Instance = go.AddComponent<SagaPerfRunner>();
        }

        private void Awake()
        {
            var canvas = SagaUi.NewCanvas("PerfCanvas", 300, transform);
            var bg = SagaUi.NewPanel(canvas.transform, "Bar", new Vector2(0.5f, 0f), new Vector2(0f, 22f), new Vector2(1180f, 40f), new Color(0f, 0f, 0f, 0.55f));
            bg.raycastTarget = false;
            _line = SagaUi.NewText(bg.transform, "", 24f, new Color(0.7f, 1f, 0.7f), new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(1160f, 40f));
            SceneManager.activeSceneChanged += OnSceneChanged;
        }

        private void OnDestroy()
        {
            SceneManager.activeSceneChanged -= OnSceneChanged;
            if (Instance == this) Instance = null;
        }

        private void OnSceneChanged(Scene from, Scene to)
        {
            if (!SagaPerf.BenchmarkRunning) Flush(); // 사람이 논 구간을 그 씬 이름으로 남긴다.
            ResetWindow("play");
        }

        private void OnApplicationPause(bool paused)
        {
            if (paused && !SagaPerf.BenchmarkRunning) Flush();
        }

        private void ResetWindow(string phase)
        {
            _frames.Clear();
            _elapsed = 0f;
            _frameCount = 0;
            _maxTemp = -1f;
            _maxThermal = -1;
            _peakMem = 0;
            _phase = phase;
        }

        private void Update()
        {
            float dt = Time.unscaledDeltaTime;
            // 타이틀로 떠나는 마지막 프레임엔 CurrentGame 이 이미 비었다 — 그때는 이름을 안 바꾼다.
            if (SagaFlow.CurrentGame != null) _windowName = SagaFlow.CurrentGame;
            else if (SceneManager.GetActiveScene().name == SagaFlow.TitleSceneName) _windowName = "title";
            if (_recording)
            {
                _elapsed += dt;
                _frameCount++;
                if (_frames.Count < MaxFrames) _frames.Add(dt); // 1%↓·최장은 앞 2만 프레임으로(30fps 면 11분).
            }
            _sampleLeft -= dt;
            if (_sampleLeft <= 0f)
            {
                _sampleLeft = 2f;
                LastTempC = ReadBatteryTemp();
                LastThermal = ReadThermal();
                if (LastTempC > _maxTemp) _maxTemp = LastTempC;
                if (LastThermal > _maxThermal) _maxThermal = LastThermal;
                long mem = Profiler.GetTotalAllocatedMemoryLong();
                if (mem > _peakMem) _peakMem = mem;
            }
            _lineFrames++;
            _lineTime += dt;
            _lineLeft -= dt;
            if (_lineLeft <= 0f)
            {
                float fps = _lineTime > 0f ? _lineFrames / _lineTime : 0f;
                _line.text = $"{fps:F0} fps · {(_lineFrames > 0 ? _lineTime * 1000f / _lineFrames : 0f):F1}ms · 1%↓ {LowFps(_frames):F0} · " +
                             $"{(LastTempC >= 0 ? LastTempC.ToString("F1") + "°C" : "온도 –")} · 발열 {(LastThermal >= 0 ? LastThermal.ToString() : "–")} · " +
                             $"{Profiler.GetTotalAllocatedMemoryLong() / (1024 * 1024)}MB · {SceneManager.GetActiveScene().name}" +
                             (SagaPerf.BenchmarkRunning ? " · 자동 측정 중" : "");
                _lineLeft = 0.5f;
                _lineFrames = 0;
                _lineTime = 0f;
            }
        }

        /// <summary>지금 창을 기록으로 남긴다(3초 넘게 쟀을 때만).</summary>
        public SagaPerf.Record Flush(string gameOverride = null)
        {
            if (_elapsed < 3f || _frames.Count == 0) return null;
            if (gameOverride == null && _windowName == "title") { ResetWindow(_phase); return null; } // 타이틀은 안 잰다.
            float worst = 0f;
            foreach (var f in _frames) if (f > worst) worst = f;
            var r = new SagaPerf.Record
            {
                game = gameOverride ?? _windowName, // 씬이 바뀐 뒤 부르면 지금 씬이 아니라 재던 씬 이름.
                phase = _phase,
                device = SystemInfo.deviceModel,
                quality = QualitySettings.GetQualityLevel(),
                width = Screen.width,
                height = Screen.height,
                seconds = _elapsed,
                avgFps = _frameCount / _elapsed,
                lowFps = LowFps(_frames),
                worstMs = worst * 1000f,
                maxTempC = _maxTemp,
                maxThermal = _maxThermal,
                peakMemMB = (int)(_peakMem / (1024 * 1024)),
                at = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
            };
            SagaPerf.Append(r);
            ResetWindow(_phase);
            return r;
        }

        public static float LowFps(List<float> frames)
        {
            if (frames.Count < 10) return 0f;
            var sorted = new List<float>(frames);
            sorted.Sort();
            int n = Mathf.Max(1, sorted.Count / 100);
            float sum = 0f;
            for (int i = sorted.Count - n; i < sorted.Count; i++) sum += sorted[i];
            return sum > 0f ? n / sum : 0f;
        }

        public void StartBenchmark(IList<(string key, string scene)> games)
        {
            if (SagaPerf.BenchmarkRunning) return;
            StartCoroutine(Benchmark(games));
        }

        private IEnumerator Benchmark(IList<(string key, string scene)> games)
        {
            SagaPerf.BenchmarkRunning = true;
            SagaFlow.SuppressAutoSave = true;
            int target = Application.targetFrameRate;
            try
            {
                foreach (var g in games)
                {
                    SceneManager.LoadScene(g.scene);
                    yield return null;
                    yield return null;
                    _recording = false;
                    yield return new WaitForSecondsRealtime(SagaPerf.WarmupSeconds);
                    Application.targetFrameRate = target;
                    ResetWindow("capped");
                    _recording = true;
                    yield return new WaitForSecondsRealtime(SagaPerf.CappedSeconds);
                    Flush(g.key);
                    Application.targetFrameRate = SagaPerf.UncappedTarget;
                    QualitySettings.vSyncCount = 0;
                    ResetWindow("uncapped");
                    yield return new WaitForSecondsRealtime(SagaPerf.UncappedSeconds);
                    Flush(g.key);
                    Application.targetFrameRate = target;
                }
            }
            finally
            {
                Application.targetFrameRate = target;
                _recording = true;
                SagaFlow.SuppressAutoSave = false;
                SagaPerf.BenchmarkRunning = false;
            }
            SagaFlow.LeaveWithoutSave();
            SceneManager.LoadScene(SagaFlow.TitleSceneName);
            SagaPerf.RaiseFinished();
        }

        /// <summary>배터리 온도(°C) — 안드로이드 BATTERY_CHANGED 의 temperature(0.1°C 단위). 그 밖은 -1.</summary>
        private static float ReadBatteryTemp()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            try
            {
                using var player = new AndroidJavaClass("com.unity3d.player.UnityPlayer");
                using var activity = player.GetStatic<AndroidJavaObject>("currentActivity");
                using var filter = new AndroidJavaObject("android.content.IntentFilter", "android.intent.action.BATTERY_CHANGED");
                // registerReceiver(null, filter) — 받는 쪽 없이 부르면 마지막 배터리 방송(sticky)을 돌려준다.
                // null 인자는 AndroidJavaObject.Call 이 서명을 못 짐작해 JNI 로 직접 부른다.
                IntPtr cls = AndroidJNI.GetObjectClass(activity.GetRawObject());
                IntPtr mid = AndroidJNI.GetMethodID(cls, "registerReceiver",
                    "(Landroid/content/BroadcastReceiver;Landroid/content/IntentFilter;)Landroid/content/Intent;");
                var args = new jvalue[2];
                args[0].l = IntPtr.Zero;
                args[1].l = filter.GetRawObject();
                IntPtr raw = AndroidJNI.CallObjectMethod(activity.GetRawObject(), mid, args);
                AndroidJNI.DeleteLocalRef(cls);
                if (raw == IntPtr.Zero) return -1f;
                using var intent = new AndroidJavaObject(raw);
                AndroidJNI.DeleteLocalRef(raw);
                return intent.Call<int>("getIntExtra", "temperature", -10) / 10f;
            }
            catch (Exception) { return -1f; }
#else
            return -1f;
#endif
        }

        /// <summary>안드로이드 PowerManager.getCurrentThermalStatus(0 없음 ~ 6 꺼짐, API 29+). 그 밖은 -1.</summary>
        private static int ReadThermal()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            try
            {
                using var version = new AndroidJavaClass("android.os.Build$VERSION");
                if (version.GetStatic<int>("SDK_INT") < 29) return -1;
                using var player = new AndroidJavaClass("com.unity3d.player.UnityPlayer");
                using var activity = player.GetStatic<AndroidJavaObject>("currentActivity");
                using var pm = activity.Call<AndroidJavaObject>("getSystemService", "power");
                return pm != null ? pm.Call<int>("getCurrentThermalStatus") : -1;
            }
            catch (Exception) { return -1; }
#else
            return -1;
#endif
        }
    }
}
