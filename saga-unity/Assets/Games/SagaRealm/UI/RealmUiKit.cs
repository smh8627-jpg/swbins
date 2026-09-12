using UnityEngine;
using UnityEngine.UI;

namespace Saga.Realm.UI
{
    /// <summary>SagaGo `UI/EncounterUiKit.cs`와 같은 공통 UI 조립 부품
    /// (캔버스/패널/텍스트/버튼) — 어셈블리가 갈려 있어(게임별 asmdef가
    /// 서로를 안 참조한다, PLAN.md 31장 "단방향 의존") 그대로 재사용하지
    /// 않고 REALM 몫만 따로 뒀다. 필요한 넷만 옮겼다(막대는 REALM에
    /// 없다).</summary>
    public static class RealmUiKit
    {
        public static Canvas NewCanvas(string name)
        {
            var go = new GameObject(name);
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = go.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080f, 1920f);
            go.AddComponent<GraphicRaycaster>();
            return canvas;
        }

        public static GameObject NewPanel(Transform parent, Vector2 anchor, Vector2 size, Color color)
        {
            var go = new GameObject("Panel", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.sizeDelta = size;
            rect.anchoredPosition = Vector2.zero;
            var img = go.AddComponent<Image>();
            img.color = color;
            return go;
        }

        public static Text NewText(Transform parent, string content, Vector2 anchor, Vector2 pos, Vector2 size, int fontSize)
        {
            var go = new GameObject("Text", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.anchoredPosition = pos;
            rect.sizeDelta = size;

            var text = go.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = fontSize;
            text.alignment = TextAnchor.MiddleCenter;
            text.color = Color.white;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.text = content;
            return text;
        }

        public static Button NewButton(Transform parent, string label, Vector2 anchor, Vector2 pos, Vector2 size, UnityEngine.Events.UnityAction onClick)
        {
            var go = new GameObject($"Btn_{label}", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.anchoredPosition = pos;
            rect.sizeDelta = size;

            var img = go.AddComponent<Image>();
            img.color = new Color(1f, 1f, 1f, 0.18f);
            var button = go.AddComponent<Button>();
            button.targetGraphic = img;
            button.onClick.AddListener(onClick);

            NewText(go.transform, label, new Vector2(0.5f, 0.5f), Vector2.zero, size, 26);

            return button;
        }
    }
}
