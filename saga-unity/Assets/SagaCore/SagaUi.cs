using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;

namespace Saga.Core
{
    /// <summary>
    /// PLAN.md 110 ② — 상용화 새 UI 의 공통 도구(타이틀·일시정지 메뉴가 먼저 쓴다, 110 ⑤ 에서 판별 HUD 도 이리로).
    /// 글자는 전부 TextMeshPro(기본 폰트 = TMP 설정의 Noto Sans KR 동적 SDF — `Editor/SetupSagaFonts`).
    /// 캔버스는 가로 1920×1080 기준·폭/높이 반반 맞춤이라 세로 폰(1080×2400)에서도 논리 폭 ≈ 966 으로 줄어든다 —
    /// 부르는 쪽이 <see cref="IsNarrow"/> 로 줄 배치를 고른다.
    /// </summary>
    public static class SagaUi
    {
        public static readonly Vector2 Reference = new Vector2(1920f, 1080f);
        public static readonly Color Ink = new Color(0.95f, 0.93f, 0.88f);
        public static readonly Color InkDim = new Color(0.72f, 0.70f, 0.66f);
        public static readonly Color Gold = new Color(0.95f, 0.78f, 0.38f);
        public static readonly Color Panel = new Color(0.07f, 0.07f, 0.09f, 0.92f);
        public static readonly Color ButtonIdle = new Color(0.18f, 0.17f, 0.2f, 0.95f);
        public static readonly Color ButtonAccent = new Color(0.62f, 0.42f, 0.16f, 0.98f);

        public static Canvas NewCanvas(string name, int sortingOrder, Transform parent = null)
        {
            var go = new GameObject(name);
            if (parent != null) go.transform.SetParent(parent, false);
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = sortingOrder;
            var scaler = go.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = Reference;
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0.5f;
            go.AddComponent<GraphicRaycaster>();
            return canvas;
        }

        /// <summary>세로 화면이면 true — 캔버스 논리 폭이 1400 밑으로 줄어 줄 배치를 세로로 바꾼다
        /// (캔버스 rect 는 스케일러가 한 프레임 뒤에 잡아 Awake 에선 못 믿는다).</summary>
        public static bool IsNarrow() => Screen.height > Screen.width;

        /// <summary>UI 가 눌리려면 씬에 EventSystem 이 하나 있어야 한다 — 없으면 새 입력 시스템 모듈로 만든다.</summary>
        public static void EnsureEventSystem()
        {
            if (Object.FindFirstObjectByType<EventSystem>() != null) return;
            var es = new GameObject("EventSystem");
            es.AddComponent<EventSystem>();
            es.AddComponent<InputSystemUIInputModule>();
        }

        public static RectTransform NewRect(Transform parent, string name, Vector2 anchor, Vector2 pos, Vector2 size)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rt = (RectTransform)go.transform;
            rt.anchorMin = rt.anchorMax = rt.pivot = anchor;
            rt.anchoredPosition = pos;
            rt.sizeDelta = size;
            return rt;
        }

        /// <summary>부모를 꽉 채우는 칸.</summary>
        public static RectTransform Fill(Transform parent, string name)
        {
            var rt = NewRect(parent, name, new Vector2(0.5f, 0.5f), Vector2.zero, Vector2.zero);
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
            return rt;
        }

        public static Image NewPanel(Transform parent, string name, Vector2 anchor, Vector2 pos, Vector2 size, Color color)
        {
            var img = NewRect(parent, name, anchor, pos, size).gameObject.AddComponent<Image>();
            img.color = color;
            return img;
        }

        public static TextMeshProUGUI NewText(Transform parent, string text, float fontSize, Color color,
            Vector2 anchor, Vector2 pos, Vector2 size, TextAlignmentOptions align = TextAlignmentOptions.Center)
        {
            var t = NewRect(parent, "Text", anchor, pos, size).gameObject.AddComponent<TextMeshProUGUI>();
            t.text = text;
            t.fontSize = fontSize;
            t.color = color;
            t.alignment = align;
            t.textWrappingMode = TextWrappingModes.Normal;
            t.raycastTarget = false;
            return t;
        }

        public static Button NewButton(Transform parent, string name, string label, Vector2 anchor, Vector2 pos, Vector2 size,
            Color color, float fontSize = 34f)
        {
            var rt = NewRect(parent, name, anchor, pos, size);
            var img = rt.gameObject.AddComponent<Image>();
            img.color = color;
            var b = rt.gameObject.AddComponent<Button>();
            b.targetGraphic = img;
            var colors = b.colors;
            colors.highlightedColor = new Color(1.15f, 1.15f, 1.15f);
            colors.pressedColor = new Color(0.8f, 0.8f, 0.8f);
            b.colors = colors;
            var t = NewText(rt, label, fontSize, Ink, new Vector2(0.5f, 0.5f), Vector2.zero, size);
            t.rectTransform.anchorMin = Vector2.zero;
            t.rectTransform.anchorMax = Vector2.one;
            t.rectTransform.offsetMin = new Vector2(8f, 4f);
            t.rectTransform.offsetMax = new Vector2(-8f, -4f);
            t.fontStyle = FontStyles.Bold;
            return b;
        }

        public static string Label(Button b) => b.GetComponentInChildren<TMP_Text>().text;
    }
}
