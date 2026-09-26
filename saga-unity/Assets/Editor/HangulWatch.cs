using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using TMPro;
using UnityEditor;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 110 ⑤c-2c-2 — 영어 화면에 남은 한글을 **상태가 있어야 뜨는 글까지** 줍는다(대사·도감·알림·전투 단추).
    /// 배치 점검(`UiLayoutCheck`)은 첫 화면·패널만 보니, 판별 헤드리스 진단을 영어로 돌리며 옆에서 지켜본다:
    /// 명령줄에 `-hangulWatch` 가 있으면 다섯 판 언어를 en 으로 두고(끝나면 되돌림), 플레이 중 켜진 TMP 글
    /// (UI·월드 글자 둘 다)을 0.25초마다 + 글이 바뀔 때마다 훑어 한글이 든 글을 `Logs/hangul_watch.txt` 에 한 줄씩 덧붙인다
    /// (씬 · 경로 · 글, 숫자는 # 로 묶어 같은 글 한 번). 판 번역 표에 키가 없어 한국어 폴백이 나간 순간도
    /// `MISSING 판 키 폴백` 으로(`SagaUi.MissingText`). 세는 도구일 뿐 진단 결과엔 안 끼어든다 — 진단 쪽 한국어 검사는 영어에서 실패할 수 있다.
    /// </summary>
    [InitializeOnLoad]
    public static class HangulWatch
    {
        public const string OutPath = "Logs/hangul_watch.txt";
        private const string LangBackup = "Logs/hangul_watch_lang.bak";
        private const string NoKey = "-";
        private static readonly string[] Games = { "go", "dungeon", "forest", "story", "realm" };
        private static readonly Regex Hangul = new Regex("[가-힣]");
        private static readonly Regex Digits = new Regex("[0-9]+");
        private static readonly Dictionary<string, string> SceneGame = new Dictionary<string, string>
        {
            { "TestVillage", "go" }, { "TestDungeon", "dungeon" }, { "TestVillageForest", "forest" }, { "TestField", "story" }, { "TestCity", "realm" },
        };
        private static readonly HashSet<string> Seen = new HashSet<string>();
        private static readonly UTF8Encoding Utf8 = new UTF8Encoding(false);
        private static double _next;

        static HangulWatch()
        {
            if (System.Array.IndexOf(System.Environment.GetCommandLineArgs(), "-hangulWatch") < 0) return;
            Directory.CreateDirectory("Logs");
            // 원래 언어는 파일에 떠 둔다(도메인 재시작·강제 종료에도 남게) — 파일이 있으면 이미 떠 둔 것.
            if (!File.Exists(LangBackup))
            {
                var lines = new List<string>();
                foreach (var g in Games)
                {
                    string k = $"saga_{g}_language";
                    lines.Add(k + "\t" + (PlayerPrefs.HasKey(k) ? PlayerPrefs.GetString(k) : NoKey));
                }
                File.WriteAllLines(LangBackup, lines, Utf8);
            }
            if (!SessionState.GetBool("saga.hangulWatch.init", false))
            {
                SessionState.SetBool("saga.hangulWatch.init", true);
                foreach (var g in Games) PlayerPrefs.SetString($"saga_{g}_language", "en");
                PlayerPrefs.Save();
                File.AppendAllText(OutPath, $"# run {System.DateTime.Now:yyyy-MM-dd HH:mm:ss} {string.Join(" ", System.Environment.GetCommandLineArgs())}\n", Utf8);
            }
            Saga.Core.SagaUi.Lang = "en";
            EditorApplication.update += Tick;
            EditorApplication.quitting += RestoreLanguage;
            TMPro_EventManager.TEXT_CHANGED_EVENT.Add(OnTextChanged);
            Saga.Core.SagaUi.MissingText += OnMissing;
        }

        /// <summary>떠 둔 원래 언어로 되돌리고 백업 파일을 지운다(끝날 때 저절로 — 강제 종료됐으면 이 메뉴로).</summary>
        [MenuItem("Saga/Tools/HangulWatch — 언어 되돌리기")]
        public static void RestoreLanguage()
        {
            if (!File.Exists(LangBackup)) return;
            foreach (var line in File.ReadAllLines(LangBackup))
            {
                var kv = line.Split('\t');
                if (kv.Length != 2) continue;
                if (kv[1] == NoKey) PlayerPrefs.DeleteKey(kv[0]); else PlayerPrefs.SetString(kv[0], kv[1]);
            }
            PlayerPrefs.Save();
            File.Delete(LangBackup);
        }

        private static void OnMissing(string game, string key, string fallback)
        {
            if (string.IsNullOrEmpty(fallback) || !Hangul.IsMatch(fallback) || !Seen.Add("MISSING|" + game + "|" + key)) return;
            File.AppendAllText(OutPath, $"MISSING\t{game}\t{key}\t{fallback.Replace("\r", "").Replace("\n", "\\n")}\n", Utf8);
        }

        private static void Tick()
        {
            if (!EditorApplication.isPlaying || EditorApplication.timeSinceStartup < _next) return;
            _next = EditorApplication.timeSinceStartup + 0.25;
            foreach (var t in Object.FindObjectsByType<TMP_Text>(FindObjectsSortMode.None)) Look(t);
        }

        private static void OnTextChanged(Object o)
        {
            if (EditorApplication.isPlaying && o is TMP_Text t) Look(t);
        }

        private static void Look(TMP_Text t)
        {
            if (t == null || !t.isActiveAndEnabled || string.IsNullOrEmpty(t.text) || !Hangul.IsMatch(t.text)) return;
            if (t.color.a < 0.02f) return;
            string scene = SceneManager.GetActiveScene().name;
            // 진단이 판 언어를 잠깐 ko 로 돌리는 동안(언어 전환 검사)의 글은 안 센다.
            if (SceneGame.TryGetValue(scene, out var game) && PlayerPrefs.GetString($"saga_{game}_language", "ko") != "en") return;
            if (t is TextMeshProUGUI)
            {
                if (t.canvas == null || !t.canvas.isActiveAndEnabled) return;
                foreach (var g in t.GetComponentsInParent<CanvasGroup>()) if (g.alpha < 0.02f) return;
            }
            else if (t.TryGetComponent<Renderer>(out var r) && !r.enabled) return;
            string text = t.text.Replace("\r", "").Replace("\n", " ⏎ ");
            string path = PathOf(t.transform);
            if (path.StartsWith("DebugUI/")) return; // 개발 빌드 전용 DebugHud 는 릴리스에 안 뜬다.
            string key = scene + "|" + Digits.Replace(Regex.Replace(path, @" ?\(Clone\)|\s*\(\d+\)", ""), "#") + "|" + Digits.Replace(text, "#");
            if (!Seen.Add(key)) return;
            if (text.Length > 240) text = text.Substring(0, 240) + "…";
            File.AppendAllText(OutPath, $"{scene}\t{path}\t{text}\n", Utf8);
        }

        private static string PathOf(Transform tr)
        {
            var sb = new StringBuilder(tr.name);
            for (var p = tr.parent; p != null; p = p.parent) sb.Insert(0, p.name + "/");
            return sb.ToString();
        }
    }
}
