using System.Collections.Generic;
using UnityEngine;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 67~69장 "Localization" — 화면 글자를 코드에 안 박고
    /// `Resources/Localization/go_&lt;lang&gt;.json`에서 읽어 온다(다섯 판이
    /// 각자 복사해 쓰는 관례 그대로, `GoSettingsState.cs`와 같은 결).
    /// 지금은 설정 패널 자신의 글자만 이 표를 거친다 — 나머지(대사·퀘스트·
    /// HUD)는 아직 하드코딩된 한국어 그대로고, 다음에 범위를 넓힐 때 이
    /// 클래스를 그대로 재사용하면 된다(PROJECT_STATE.md 2026-09-14
    /// "Localization" 항목 참고). ko/en 두 언어 파일은 다섯 판이 전부
    /// 같은 키·값을 쓴다 — data.js처럼 다섯 벌 함께 고치고 md5로 확인할 것.
    /// </summary>
    public static class GoLocalization
    {
        private const string LanguageKey = "saga_go_language";
        public static readonly string[] LanguageCodes = { "ko", "en" };
        public static readonly string[] LanguageNames = { "한국어", "English" };

        private static string _loadedLanguage;
        private static Dictionary<string, string> _table;

        public static string CurrentLanguage
        {
            get => PlayerPrefs.GetString(LanguageKey, LanguageCodes[0]);
            set => PlayerPrefs.SetString(LanguageKey, value);
        }

        /// <summary>버튼 하나로 순환시키는 이 판 공통 방식(UI 크기·그래픽
        /// 품질과 같은 결).</summary>
        public static void CycleLanguage()
        {
            int idx = System.Array.IndexOf(LanguageCodes, CurrentLanguage);
            idx = (idx < 0 ? 0 : idx + 1) % LanguageCodes.Length;
            CurrentLanguage = LanguageCodes[idx];
            _table = null; // 다음 T() 호출에서 새 언어 표를 다시 읽는다.
        }

        public static string LanguageLabel()
        {
            int idx = System.Array.IndexOf(LanguageCodes, CurrentLanguage);
            return LanguageNames[idx < 0 ? 0 : idx];
        }

        /// <summary>표에 키가 없으면(번역 누락, 언어 파일 못 찾음) 키 자체를
        /// 돌려준다 — 화면이 비는 대신 무슨 글자가 빠졌는지 바로 보인다.</summary>
        public static string T(string key)
        {
            EnsureLoaded();
            if (_table != null && _table.TryGetValue(key, out var value)) return value;
            Saga.Core.SagaUi.MissingText?.Invoke("go", key, key);
            return key;
        }

        /// <summary>데이터 콘텐츠(도시/장비 이름 등) 조회용 — 번역 누락일 때
        /// 키 대신 원래 값(보통 한국어 원문)을 그대로 보여준다.</summary>
        public static string T(string key, string fallback)
        {
            EnsureLoaded();
            if (_table != null && _table.TryGetValue(key, out var value)) return value;
            Saga.Core.SagaUi.MissingText?.Invoke("go", key, fallback);
            return fallback;
        }


        // PLAN.md 110 ⑤c-2c — 에디터 빌더가 씬에 구운 글(지을 때 언어 = 한국어)을 지금 언어로 바꾼다. 한국어 표 값과
        // 똑같은 글이면 그 키로 다시 읽는다. 글마다 (키, 마지막으로 쓴 글)을 기억해 영어 → 한국어도 되고, 코드가 글을
        // 딴 것으로 바꿨으면(값 라벨 등) 잊는다. 씬을 열 때(설정 창 Start)·판 안에서 언어를 바꿀 때 부른다.
        private static Dictionary<string, string> _koReverse;
        private static Dictionary<string, string> _koByKey;
        private static readonly Dictionary<int, (string key, string written)> _baked = new Dictionary<int, (string, string)>();

        public static int RelocalizeScene()
        {
            Saga.Core.SagaUi.Lang = CurrentLanguage == "en" ? "en" : "ko";
            if (_koReverse == null)
            {
                _koReverse = new Dictionary<string, string>();
                _koByKey = new Dictionary<string, string>();
                var asset = Resources.Load<TextAsset>("Localization/go_ko");
                var parsed = asset != null ? JsonUtility.FromJson<StringTable>(asset.text) : null;
                if (parsed?.entries != null)
                    foreach (var e in parsed.entries)
                    {
                        if (string.IsNullOrEmpty(e.value)) continue;
                        _koByKey[e.key] = e.value;
                        if (!_koReverse.ContainsKey(e.value)) _koReverse[e.value] = e.key;
                    }
            }
            int changed = 0;
            foreach (var t in Object.FindObjectsByType<TMPro.TMP_Text>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (t == null || string.IsNullOrEmpty(t.text)) continue;
                int id = t.GetInstanceID();
                string key = null;
                if (_baked.TryGetValue(id, out var was) && (t.text == was.written || t.text == _koByKey[was.key])) key = was.key;
                else if (!_koReverse.TryGetValue(t.text, out key)) { _baked.Remove(id); continue; }
                string v = T(key);
                if (v != t.text) { t.text = v; changed++; }
                _baked[id] = (key, v);
            }
            return changed;
        }

        private static void EnsureLoaded()
        {
            string lang = CurrentLanguage;
            if (_table != null && _loadedLanguage == lang) return;

            _table = new Dictionary<string, string>();
            _loadedLanguage = lang;
            var asset = Resources.Load<TextAsset>($"Localization/go_{lang}");
            if (asset == null)
            {
                Debug.LogWarning($"[GoLocalization] Resources/Localization/go_{lang}.json을 못 찾음");
                return;
            }
            var parsed = JsonUtility.FromJson<StringTable>(asset.text);
            if (parsed?.entries == null) return;
            foreach (var entry in parsed.entries) _table[entry.key] = entry.value;
        }

        [System.Serializable]
        private class StringEntry { public string key; public string value; }

        [System.Serializable]
        private class StringTable { public StringEntry[] entries; }
    }
}
