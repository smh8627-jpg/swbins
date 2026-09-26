using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using TMPro;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 110 ⑤b 배치 점검 — 타이틀·다섯 판을 플레이로 켜고(첫 화면 = HUD) 화면비 셋(16:9·20:9·4:3)마다
    /// 보이는 UI 의 **실제 발자국**(TMP 는 그려진 글자 범위, 나머지는 사각형)을 화면 픽셀로 재서
    /// ① 서로 다른 위젯끼리 겹침 ② 화면 밖으로 나감 을 센다. 배치 모드는 화면이 없어, 잴 때만 루트 캔버스를
    /// 월드 공간으로 돌려 그 화면비의 논리 크기(CanvasScaler 식 그대로)를 입힌 뒤 되돌린다.
    ///
    /// - 위젯 = 캔버스(또는 꽉 찬 투명 틀) 바로 밑 덩어리. 한 위젯 안의 겹침(버튼 위 글자 등)은 설계라 안 센다.
    /// - 모달(화면 30% 넘는 판을 가진 위젯)은 다른 위젯과의 겹침에서 뺀다 — 일부러 위를 덮는다.
    /// - 세이브는 백업했다 되돌린다. 결과 "[UiLayoutCheck] OK/FAIL", 자세한 목록은 `Logs/ui_layout_report.txt`.
    /// `-executeMethod Saga.EditorTools.UiLayoutCheck.Run`
    /// </summary>
    public static class UiLayoutCheck
    {
        private const string T = "[UiLayoutCheck]";
        public const string ReportPath = "Logs/ui_layout_report.txt";

        public static readonly (string name, int w, int h)[] Screens =
        {
            ("16:9", 1920, 1080),
            ("20:9", 2400, 1080),
            ("4:3", 1440, 1080),
        };

        private static readonly string[] Scenes = SagaPlayerBuild.Scenes;

        private static IEnumerator _run;
        private static readonly StringBuilder Report = new StringBuilder();
        private static readonly StringBuilder Map = new StringBuilder();
        private static readonly List<string> Summary = new List<string>();
        private static int _issues;
        private static bool _done;
        private static readonly Dictionary<string, byte[]> SaveBackup = new Dictionary<string, byte[]>();
        private static bool _origOptionsEnabled;
        private static EnterPlayModeOptions _origOptions;

        [MenuItem("Saga/Check/UI Layout (3 aspect ratios)")]
        public static void Run()
        {
            Report.Clear(); Map.Clear(); Summary.Clear(); _issues = 0; _done = false;
            SaveBackup.Clear();
            foreach (var f in Directory.GetFiles(Application.persistentDataPath, "save*.json")) SaveBackup[f] = File.ReadAllBytes(f);
            _origOptionsEnabled = EditorSettings.enterPlayModeOptionsEnabled;
            _origOptions = EditorSettings.enterPlayModeOptions;
            EditorSettings.enterPlayModeOptionsEnabled = true;
            EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;
            EditorSceneManager.OpenScene(Scenes[0]);
            EditorApplication.playModeStateChanged += OnState;
            EditorApplication.isPlaying = true;
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
                EditorApplication.playModeStateChanged -= OnState;
                EditorSettings.enterPlayModeOptionsEnabled = _origOptionsEnabled;
                EditorSettings.enterPlayModeOptions = _origOptions;
                SetupSagaFonts.ResetDynamicFonts();
                foreach (var f in Directory.GetFiles(Application.persistentDataPath, "save*.json"))
                    if (!SaveBackup.ContainsKey(f)) File.Delete(f);
                foreach (var kv in SaveBackup) File.WriteAllBytes(kv.Key, kv.Value);
                Directory.CreateDirectory(Path.GetDirectoryName(ReportPath));
                File.WriteAllText(ReportPath, Report.ToString() + System.Environment.NewLine + Map, new UTF8Encoding(false));
                bool ok = _done && _issues == 0;
                Debug.Log($"{T} {(ok ? "OK" : "FAIL")} - 문제 {_issues} (done={_done}) | {string.Join(" · ", Summary)}");
                if (Application.isBatchMode) EditorApplication.Exit(ok ? 0 : 1);
            }
        }

        private static void Tick()
        {
            bool more;
            try { more = _run.MoveNext(); }
            catch (System.Exception e) { Debug.LogError($"{T} 예외 {e}"); _issues++; more = false; }
            if (!more)
            {
                EditorApplication.update -= Tick;
                EditorApplication.isPlaying = false;
            }
        }

        private static IEnumerator Script()
        {
            for (int i = 0; i < Scenes.Length; i++)
            {
                if (i > 0) EditorSceneManager.LoadSceneInPlayMode(Scenes[i], new LoadSceneParameters(LoadSceneMode.Single));
                float t0 = Time.realtimeSinceStartup;
                int frames = 0;
                while (frames < 60 || Time.realtimeSinceStartup - t0 < 1.5f) { frames++; yield return null; }
                string label = Path.GetFileNameWithoutExtension(Scenes[i]);
                foreach (var sc in Screens) Measure(label, sc.name, sc.w, sc.h);
            }
            _done = true;
        }

        // ───────── 재기 ─────────

        private struct Item
        {
            public Graphic g;
            public Rect px;       // 화면 픽셀 발자국
            public Transform widget;
            public bool modal;
        }

        private static void Measure(string scene, string screenName, int w, int h)
        {
            var roots = Object.FindObjectsByType<Canvas>(FindObjectsInactive.Exclude, FindObjectsSortMode.None)
                .Where(c => c.isRootCanvas && c.enabled && c.renderMode == RenderMode.ScreenSpaceOverlay).ToList();
            var saved = new List<(Canvas c, CanvasScaler s, bool se, Vector3 pos, Quaternion rot, Vector3 scale, Vector2 pivot, Vector2 size)>();
            var items = new List<Item>();
            var screen = new Rect(0, 0, w, h);
            foreach (var c in roots)
            {
                var rt = (RectTransform)c.transform;
                var scaler = c.GetComponent<CanvasScaler>();
                saved.Add((c, scaler, scaler != null && scaler.enabled, rt.position, rt.rotation, rt.localScale, rt.pivot, rt.sizeDelta));
                float k = ScaleFactor(scaler, w, h);
                if (scaler != null) scaler.enabled = false;
                c.renderMode = RenderMode.WorldSpace;
                rt.rotation = Quaternion.identity;
                rt.localScale = Vector3.one;
                rt.pivot = Vector2.zero;
                rt.position = Vector3.zero;
                rt.sizeDelta = new Vector2(w / k, h / k);
            }
            Canvas.ForceUpdateCanvases();
            foreach (var c in roots)
            {
                float k = ScaleFactor(c.GetComponent<CanvasScaler>(), w, h);
                Collect(c, k, w, h, items);
            }
            // 되돌리기
            foreach (var x in saved)
            {
                var rt = (RectTransform)x.c.transform;
                x.c.renderMode = RenderMode.ScreenSpaceOverlay;
                if (x.s != null) x.s.enabled = x.se;
                rt.pivot = x.pivot; rt.localScale = x.scale; rt.rotation = x.rot; rt.position = x.pos; rt.sizeDelta = x.size;
            }
            Canvas.ForceUpdateCanvases();

            int overlaps = 0, off = 0;
            var lines = new List<string>();
            foreach (var it in items)
            {
                var r = it.px;
                float outX = Mathf.Max(0, -r.xMin) + Mathf.Max(0, r.xMax - w);
                float outY = Mathf.Max(0, -r.yMin) + Mathf.Max(0, r.yMax - h);
                if (outX > 4 || outY > 4)
                {
                    off++;
                    lines.Add($"  화면 밖 {outX:F0}×{outY:F0}px  {PathOf(it.g.transform)}{TextOf(it.g)}");
                }
            }
            var reported = new HashSet<(Transform, Transform)>();
            for (int a = 0; a < items.Count; a++)
                for (int b = a + 1; b < items.Count; b++)
                {
                    var A = items[a]; var B = items[b];
                    if (A.widget == B.widget || A.modal || B.modal) continue;
                    var key = A.widget.GetInstanceID() < B.widget.GetInstanceID() ? (A.widget, B.widget) : (B.widget, A.widget);
                    if (reported.Contains(key)) continue;
                    float ix = Mathf.Min(A.px.xMax, B.px.xMax) - Mathf.Max(A.px.xMin, B.px.xMin);
                    float iy = Mathf.Min(A.px.yMax, B.px.yMax) - Mathf.Max(A.px.yMin, B.px.yMin);
                    if (ix <= 2 || iy <= 2) continue;
                    float area = ix * iy, small = Mathf.Min(A.px.width * A.px.height, B.px.width * B.px.height);
                    if (area < 64 || area < small * 0.08f) continue;
                    reported.Add(key);
                    overlaps++;
                    lines.Add($"  겹침 {ix:F0}×{iy:F0}px  {PathOf(A.g.transform)}{TextOf(A.g)}  ↔  {PathOf(B.g.transform)}{TextOf(B.g)}");
                }
            if (screenName == Screens[0].name)
            {
                // 16:9 자리표 — 위젯마다 발자국 합집합(화면 픽셀, 왼쪽 아래 원점). 배치를 고칠 때 본다.
                Map.AppendLine($"== {scene} {screenName} 위젯 자리(px x·y·w·h, 왼쪽 아래 원점)");
                foreach (var grp in items.GroupBy(i => i.widget).OrderBy(g => -g.Max(i => i.px.yMax)))
                {
                    var u = grp.Select(i => i.px).Aggregate((r1, r2) => Rect.MinMaxRect(Mathf.Min(r1.xMin, r2.xMin), Mathf.Min(r1.yMin, r2.yMin), Mathf.Max(r1.xMax, r2.xMax), Mathf.Max(r1.yMax, r2.yMax)));
                    Map.AppendLine($"  {u.xMin,5:F0} {u.yMin,5:F0} {u.width,5:F0} {u.height,5:F0}  {PathOf(grp.Key)}{(grp.First().modal ? " (모달)" : "")}");
                }
            }
            _issues += overlaps + off;
            Summary.Add($"{scene} {screenName} 겹침 {overlaps}·밖 {off}");
            Report.AppendLine($"== {scene} {screenName} ({w}×{h}) — 캔버스 {roots.Count} · 보이는 것 {items.Count} · 겹침 {overlaps} · 화면 밖 {off}");
            foreach (var l in lines) Report.AppendLine(l);
        }

        /// <summary>CanvasScaler 의 크기 식 그대로(ScaleWithScreenSize 세 방식·고정 픽셀).</summary>
        public static float ScaleFactor(CanvasScaler s, int w, int h)
        {
            if (s == null) return 1f;
            if (s.uiScaleMode == CanvasScaler.ScaleMode.ConstantPixelSize) return s.scaleFactor;
            if (s.uiScaleMode != CanvasScaler.ScaleMode.ScaleWithScreenSize) return 1f;
            var r = s.referenceResolution;
            switch (s.screenMatchMode)
            {
                case CanvasScaler.ScreenMatchMode.Expand: return Mathf.Min(w / r.x, h / r.y);
                case CanvasScaler.ScreenMatchMode.Shrink: return Mathf.Max(w / r.x, h / r.y);
                default:
                    float lw = Mathf.Log(w / r.x, 2), lh = Mathf.Log(h / r.y, 2);
                    return Mathf.Pow(2, Mathf.Lerp(lw, lh, s.matchWidthOrHeight));
            }
        }

        private static void Collect(Canvas c, float k, int w, int h, List<Item> items)
        {
            float screenArea = (float)w * h;
            var widgetOf = new Dictionary<Transform, Transform>();
            var modalWidgets = new HashSet<Transform>();
            var found = new List<Item>();
            foreach (var g in c.GetComponentsInChildren<Graphic>(false))
            {
                if (!g.enabled || !g.gameObject.activeInHierarchy) continue;
                if (Alpha(g) < 0.05f) continue;
                if (IsDebugOnly(g.transform)) continue; // 릴리스 빌드엔 안 뜨는 디버그 줄(DebugHud: !Debug.isDebugBuild 면 꺼짐)
                Rect px;
                if (g is TMP_Text t)
                {
                    if (string.IsNullOrWhiteSpace(t.text)) continue;
                    t.ForceMeshUpdate();
                    if (t.textInfo == null || t.textInfo.characterCount == 0) continue;
                    // textBounds 는 줄 높이(ascender~descender, Noto 1.45em)라 과하다 — 보이는 글자의 잉크 상자 합집합으로 잰다.
                    Vector2 mn = new Vector2(float.MaxValue, float.MaxValue), mx = new Vector2(float.MinValue, float.MinValue);
                    var info = t.textInfo;
                    for (int ci = 0; ci < info.characterCount; ci++)
                    {
                        var ch = info.characterInfo[ci];
                        if (!ch.isVisible) continue;
                        mn = Vector2.Min(mn, new Vector2(ch.bottomLeft.x, ch.bottomLeft.y));
                        mx = Vector2.Max(mx, new Vector2(ch.topRight.x, ch.topRight.y));
                    }
                    if (mx.x - mn.x <= 0.01f || mx.y - mn.y <= 0.01f) continue;
                    px = ToPx(t.transform, mn, mx, k);
                }
                else
                {
                    var corners = new Vector3[4];
                    g.rectTransform.GetWorldCorners(corners);
                    px = Rect.MinMaxRect(corners[0].x * k, corners[0].y * k, corners[2].x * k, corners[2].y * k);
                    if (px.width < 2 || px.height < 2) continue;
                }
                var widget = WidgetOf(g.transform, c.transform, w / k, h / k, widgetOf);
                if (px.width * px.height > screenArea * 0.3f) modalWidgets.Add(widget);
                found.Add(new Item { g = g, px = px, widget = widget });
            }
            foreach (var it in found)
            {
                var x = it;
                x.modal = modalWidgets.Contains(it.widget);
                // 모달의 큰 판 자체는 화면 밖 검사만 의미 없어 뺀다(꽉 찬 배경은 넘쳐도 된다)
                if (x.modal && x.px.width * x.px.height > screenArea * 0.3f) continue;
                items.Add(x);
            }
        }

        private static bool IsDebugOnly(Transform t)
        {
            for (var p = t; p != null; p = p.parent)
                foreach (var mb in p.GetComponents<MonoBehaviour>())
                    if (mb != null && mb.GetType().Name == "DebugHud") return true;
            return false;
        }

        private static Rect ToPx(Transform tr, Vector3 min, Vector3 max, float k)
        {
            var a = tr.TransformPoint(min); var b = tr.TransformPoint(max);
            return Rect.MinMaxRect(Mathf.Min(a.x, b.x) * k, Mathf.Min(a.y, b.y) * k, Mathf.Max(a.x, b.x) * k, Mathf.Max(a.y, b.y) * k);
        }

        private static float Alpha(Graphic g)
        {
            float a = g.color.a * g.canvasRenderer.GetAlpha();
            for (var p = g.transform; p != null; p = p.parent)
            {
                var cg = p.GetComponent<CanvasGroup>();
                if (cg == null) continue;
                a *= cg.alpha;
                if (cg.ignoreParentGroups) break;
            }
            return a;
        }

        /// <summary>캔버스 또는 "꽉 찬 투명 틀" 바로 밑의 조상 = 위젯.</summary>
        private static Transform WidgetOf(Transform t, Transform canvas, float lw, float lh, Dictionary<Transform, Transform> memo)
        {
            if (memo.TryGetValue(t, out var w)) return w;
            var chain = new List<Transform>();
            for (var p = t; p != null && p != canvas; p = p.parent) chain.Add(p);
            chain.Reverse(); // 캔버스 쪽부터
            Transform result = chain.Count > 0 ? chain[chain.Count - 1] : t;
            foreach (var n in chain)
            {
                if (IsContainer(n, lw, lh)) continue;
                result = n;
                break;
            }
            memo[t] = result;
            return result;
        }

        private static bool IsContainer(Transform n, float lw, float lh)
        {
            if (!(n is RectTransform rt)) return false;
            if (n.GetComponent<Canvas>() != null) return true; // 중첩 캔버스
            var size = rt.rect.size;
            if (size.x < lw * 0.9f || size.y < lh * 0.9f) return false;
            var g = n.GetComponent<Graphic>();
            return g == null || !g.enabled || Alpha(g) < 0.05f;
        }

        private static string PathOf(Transform t)
        {
            var parts = new List<string>();
            for (var p = t; p != null && parts.Count < 4; p = p.parent) parts.Add(p.name);
            parts.Reverse();
            return string.Join("/", parts);
        }

        private static string TextOf(Graphic g)
        {
            if (!(g is TMP_Text t)) return "";
            var s = t.text.Replace("\n", " ");
            return $" \"{(s.Length > 24 ? s.Substring(0, 24) + "…" : s)}\"";
        }
    }
}
