using System.Collections.Generic;
using System.Reflection;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

namespace Saga.EditorTools
{
    /// <summary>
    /// 2026-09-23 "모바일 버튼 먹통" 회귀 진단 — 네 판(GO·DUNGEON·FOREST·REALM)의
    /// Playtest가 같이 쓴다. 에디터 빌드가 `onClick.AddListener`로 건 리스너는 씬 저장 때
    /// 사라져, 저장된 씬을 Play하면 버튼이 눌려도 아무 일도 없었다. 옛 진단은 핸들러를
    /// 리플렉션으로 직접 불러 이걸 한 번도 못 잡았다.
    ///
    /// - <see cref="FindDeadButtons"/>: Play 중인 씬의 **모든** Button(비활성 포함) 중
    ///   영속 리스너도 런타임 리스너도 없는 것 — 누르면 아무 일도 안 일어나는 버튼.
    /// - <see cref="PressOpensAndCloses"/>: 진짜 `onClick.Invoke()`로 패널을 열고 닫아 본다.
    ///
    /// 런타임 리스너 수는 공개 API가 없어 `UnityEventBase.m_Calls.m_RuntimeCalls`를
    /// 리플렉션으로 센다 — Unity가 내부 이름을 바꾸면 여기서 먼저 실패로 알린다.
    /// </summary>
    public static class ButtonWiringCheck
    {
        public static List<string> FindDeadButtons(out int total, out string reflectionError)
        {
            var dead = new List<string>();
            total = 0;
            reflectionError = null;
            var callsField = typeof(UnityEventBase).GetField("m_Calls", BindingFlags.NonPublic | BindingFlags.Instance);
            if (callsField == null) { reflectionError = "UnityEventBase.m_Calls 없음"; return dead; }
            var runtimeField = callsField.FieldType.GetField("m_RuntimeCalls", BindingFlags.NonPublic | BindingFlags.Instance);
            if (runtimeField == null) { reflectionError = "InvokableCallList.m_RuntimeCalls 없음"; return dead; }

            foreach (var b in Object.FindObjectsByType<Button>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                total++;
                int persistent = b.onClick.GetPersistentEventCount();
                var list = runtimeField.GetValue(callsField.GetValue(b.onClick)) as System.Collections.ICollection;
                int runtime = list?.Count ?? 0;
                if (persistent + runtime == 0) { dead.Add(PathOf(b.transform)); continue; }
                // 영속 리스너가 가리키는 메서드가 지금 코드에 실제로 있는지 — 이름을 바꾸고
                // 씬 재빌드를 잊으면 리스너 수는 그대로인데 누르면 아무 일도 안 일어난다.
                for (int i = 0; i < persistent; i++)
                {
                    var target = b.onClick.GetPersistentTarget(i);
                    string method = b.onClick.GetPersistentMethodName(i);
                    if (target == null || !HasMethod(target.GetType(), method))
                        dead.Add($"{PathOf(b.transform)}(→{(target != null ? target.GetType().Name : "null")}.{method} 없음)");
                }
            }
            return dead;
        }

        private static bool HasMethod(System.Type type, string name)
        {
            const BindingFlags Flags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly;
            for (var t = type; t != null && t != typeof(object); t = t.BaseType)
            {
                foreach (var m in t.GetMethods(Flags)) if (m.Name == name) return true;
            }
            return false;
        }

        /// <summary>죽은 버튼이 없으면 true. 실패 땐 앞 열 개 경로를 로그에 남긴다.</summary>
        public static bool CheckNoDeadButtons(string tag)
        {
            var dead = FindDeadButtons(out int total, out string reflectionError);
            if (reflectionError != null)
            {
                Debug.LogError($"[{tag}] 버튼 배선 검사 리플렉션 실패 — {reflectionError}");
                return false;
            }
            if (total == 0)
            {
                Debug.LogError($"[{tag}] 씬에 Button이 하나도 없음 — 검사 대상이 잘못됨");
                return false;
            }
            if (dead.Count > 0)
            {
                int shown = Mathf.Min(10, dead.Count);
                Debug.LogError($"[{tag}] 리스너 없는(눌러도 먹통인) 버튼 {dead.Count}/{total}개 — " +
                               string.Join(", ", dead.GetRange(0, shown)) + (dead.Count > shown ? " …" : ""));
                return false;
            }
            Debug.Log($"[{tag}] button wiring OK - 버튼 {total}개 전부 리스너 있음");
            return true;
        }

        /// <summary>`openButton`을 진짜로 눌러 `panel`이 열리고, `closeButton`(null이면 `openButton`
        /// 한 번 더)으로 닫히는지.</summary>
        public static bool PressOpensAndCloses(string tag, string what, Button openButton, Button closeButton, GameObject panel)
        {
            if (openButton == null || panel == null)
            {
                Debug.LogError($"[{tag}] {what} — 버튼({openButton != null})·패널({panel != null}) 참조를 못 찾음");
                return false;
            }
            panel.SetActive(false);
            openButton.onClick.Invoke();
            bool opened = panel.activeSelf;
            (closeButton != null ? closeButton : openButton).onClick.Invoke();
            bool closed = !panel.activeSelf;
            panel.SetActive(false);
            if (!opened || !closed)
            {
                Debug.LogError($"[{tag}] {what} — 진짜 onClick으로 opened={opened} closed={closed}");
                return false;
            }
            Debug.Log($"[{tag}] {what} OK - 진짜 onClick으로 열고 닫힘");
            return true;
        }

        /// <summary>`root` 아래(비활성 포함)에서 글자가 정확히 `label`인 버튼.</summary>
        public static Button FindByLabel(Transform root, string label)
        {
            if (root == null) return null;
            foreach (var b in root.GetComponentsInChildren<Button>(true))
            {
                var t = b.GetComponentInChildren<Text>(true);
                if (t != null && t.text == label) return b;
            }
            return null;
        }

        private static string PathOf(Transform t)
        {
            string path = t.name;
            for (var p = t.parent; p != null; p = p.parent) path = p.name + "/" + path;
            return path;
        }
    }
}
