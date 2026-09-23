using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

namespace Saga.Core
{
    /// <summary>
    /// 2026-09-23 "모바일 버튼 먹통" — 씬 빌더(에디터)가 지은 UI에 `onClick.AddListener`로
    /// 건 리스너는 런타임 전용이라 씬 저장 때 사라진다: 다섯 씬의 버튼 onClick이 전부
    /// 비어 있었고(키보드는 되니 PC 확인에선 안 드러남) 실제 폰에선 버튼이 하나도 안
    /// 눌렸다. 네 판의 UI kit·자기-빌드 UI가 이 한 곳을 거쳐 버튼을 건다.
    ///
    /// - **에디터에서 지을 때**(Play 아님): 영속 리스너(`UnityEventTools`)로 건다 — 씬에
    ///   저장된다. 영속 리스너는 대상이 UnityEngine.Object의 **이름 있는 메서드**여야 해서
    ///   람다는 못 건다(인자 하나는 string/int 오버로드로 넘긴다). 람다가 오면 경고를
    ///   남기고 런타임 리스너로 건다 — 그 UI가 Play 때 다시 지어지지 않으면 먹통이다.
    /// - **Play 중에 지을 때**(열 때마다 다시 짓는 목록 등): 그냥 `AddListener`.
    ///
    /// 영속 리스너는 private 메서드도 부른다(UnityEvent가 NonPublic까지 찾는다). 메서드
    /// 이름을 바꾸면 씬을 다시 빌드해야 한다 — 각 판 Playtest의 버튼 배선 검사가 잡는다.
    /// </summary>
    public static class ButtonWiring
    {
        public static void Wire(Button button, UnityAction onClick)
        {
            if (button == null || onClick == null) return;
#if UNITY_EDITOR
            if (!Application.isPlaying)
            {
                if (IsPersistable(onClick))
                {
                    UnityEditor.Events.UnityEventTools.AddPersistentListener(button.onClick, onClick);
                    return;
                }
                Warn(button, onClick);
            }
#endif
            button.onClick.AddListener(onClick);
        }

        public static void Wire(Button button, UnityAction<string> onClick, string arg)
        {
            if (button == null || onClick == null) return;
#if UNITY_EDITOR
            if (!Application.isPlaying)
            {
                if (IsPersistable(onClick))
                {
                    UnityEditor.Events.UnityEventTools.AddStringPersistentListener(button.onClick, onClick, arg);
                    return;
                }
                Warn(button, onClick);
            }
#endif
            button.onClick.AddListener(() => onClick(arg));
        }

        public static void Wire(Button button, UnityAction<int> onClick, int arg)
        {
            if (button == null || onClick == null) return;
#if UNITY_EDITOR
            if (!Application.isPlaying)
            {
                if (IsPersistable(onClick))
                {
                    UnityEditor.Events.UnityEventTools.AddIntPersistentListener(button.onClick, onClick, arg);
                    return;
                }
                Warn(button, onClick);
            }
#endif
            button.onClick.AddListener(() => onClick(arg));
        }

        /// <summary>진단용 — 버튼에 씬 저장을 버티는 리스너가 하나라도 있는가.</summary>
        public static bool HasPersistentListener(Button button) =>
            button != null && button.onClick.GetPersistentEventCount() > 0;

#if UNITY_EDITOR
        // 람다는 컴파일러가 `<Build>b__12_0` 같은 이름을 붙이거나(this만 잡을 때) 따로
        // 클로저 클래스에 둔다(지역 변수를 잡을 때) — 둘 다 영속 대상으로 쓰면 안 된다.
        private static bool IsPersistable(System.Delegate d) =>
            d.Target is Object && !d.Method.IsStatic && !d.Method.Name.StartsWith("<");

        private static void Warn(Button button, System.Delegate d) =>
            Debug.LogWarning($"[ButtonWiring] '{button.name}' — 람다/정적 메서드({d.Method.Name})는 씬에 저장 안 된다. " +
                             "이 UI가 Play 때 다시 지어지지 않으면 버튼이 먹통이다.", button);
#endif
    }
}
