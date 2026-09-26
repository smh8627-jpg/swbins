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
    /// 캔버스는 가로 1920×1080 기준·Expand(기준 영역이 통째로 들어감, 20:9 = 2400×1080·4:3 = 1920×1440) —
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

        /// <summary>PLAN.md 110 ⑤b — 다섯 판 HUD 캔버스의 기준(가로 1600×900, Expand). 옛 기준은 세로 1080×1920·폭 맞춤이라
        /// 가로 화면에서 논리 높이가 607(16:9)·486(20:9)으로 줄어 버튼끼리 부딪혔다. Expand 는 기준 영역이 어느 화면비에서도
        /// 통째로 들어가고 남는 쪽만 넓어진다(16:9 = 1600×900, 20:9 = 2000×900, 4:3 = 1600×1200).</summary>
        public static readonly Vector2 GameReference = new Vector2(1600f, 900f);

        /// <summary>판 HUD 캔버스 스케일러 한 곳 — 빌더·런타임·설정의 UI 크기(배수)가 다 이것을 부른다.</summary>
        public static void ApplyGameScaler(CanvasScaler scaler, float uiScale = 1f)
        {
            if (scaler == null || scaler.GetComponent<MenuCanvas>() != null) return; // 타이틀·일시정지 메뉴는 제 기준 유지
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.Expand;
            scaler.referenceResolution = GameReference / Mathf.Max(0.01f, uiScale);
        }

        /// <summary>PLAN.md 110 ⑤c — 공통 UI(타이틀·일시정지)의 언어. 판 설정의 언어는 판마다 따로 저장되고(PlayerPrefs),
        /// 타이틀이 켜질 때·타이틀 설정에서 바꿀 때 여기에 적는다(SagaCore 는 판 어셈블리를 모른다). 기본 "ko".</summary>
        public static string Lang = "ko";
        public static bool En => Lang == "en";
        public static string L(string ko, string en) => En ? en : ko;

        /// <summary>PLAN.md 110 ⑤c-2c-2 — 판 번역 표에 키가 없어 폴백(보통 한국어)을 돌려줄 때 부른다(판, 키, 폴백). 에디터 도구 `HangulWatch` 가 듣는다.</summary>
        public static System.Action<string, string, string> MissingText;

        /// <summary>판 HUD 와 같은 기준(1600×900 Expand)의 메뉴 캔버스 — 판 HUD 옆에 붙는 공통 단추(일시정지)용.
        /// 판 설정의 "UI 크기"는 이 캔버스를 건너뛴다(<see cref="MenuCanvas"/>).</summary>
        public static Canvas NewHudCanvas(string name, int sortingOrder, Transform parent = null)
        {
            var canvas = NewCanvas(name, sortingOrder, parent);
            canvas.GetComponent<CanvasScaler>().referenceResolution = GameReference;
            return canvas;
        }

        /// <summary>씬의 판 HUD 스케일러 하나(메뉴 캔버스 — 타이틀·일시정지·Ⅱ 단추 — 는 뺀다). 진단의 "UI 크기가 먹나" 검사용.</summary>
        public static CanvasScaler FirstGameScaler()
        {
            foreach (var s in Object.FindObjectsByType<CanvasScaler>(FindObjectsSortMode.InstanceID))
                if (s.GetComponent<MenuCanvas>() == null) return s;
            return null;
        }

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
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.Expand; // 110 ⑤b — 1920×1080 이 어느 화면비에서도 통째로 들어간다
            go.AddComponent<GraphicRaycaster>();
            go.AddComponent<MenuCanvas>();
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
