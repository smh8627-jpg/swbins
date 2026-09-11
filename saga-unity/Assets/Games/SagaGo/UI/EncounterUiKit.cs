using UnityEngine;
using UnityEngine.UI;

namespace Saga.Go.UI
{
    /// <summary>
    /// BanditEncounter.cs가 원래 자기 안에 private static으로 갖고 있던
    /// "사건 UI 조립" 공통 부품(캔버스/패널/텍스트/버튼/막대)을 뽑아낸
    /// 것 — 두 번째 실시간 전투 사건(World/RareWolfEncounter.cs)이 생기며
    /// 그대로 복붙하면 ~150줄이 그대로 두 벌이 될 상황이라 여기로 옮겼다
    /// (2026-09-11, N=2가 되고서야 뽑음 — N=1일 때 미리 일반화하지 않는다는
    /// 이 저장소 원칙 그대로). 판정(DuelRules.cs)·상태 흐름(각 Encounter의
    /// State 머신)은 안 건드리고 순수 UI 생성 코드만 옮긴 것이라 동작은
    /// 바이트 단위로 그대로다.
    /// </summary>
    public static class EncounterUiKit
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

        /// <summary>왼쪽 라벨 + 오른쪽으로 차는 막대 하나(Image.fillAmount 기반).</summary>
        public static Image NewBarRow(Transform parent, string label, float y, out Image background)
        {
            NewText(parent, label, new Vector2(0f, 1f), new Vector2(30f, y), new Vector2(110f, 40f), 22).alignment = TextAnchor.MiddleLeft;

            var bgGo = new GameObject($"{label}Bar", typeof(RectTransform));
            bgGo.transform.SetParent(parent, false);
            var rect = (RectTransform)bgGo.transform;
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = new Vector2(0f, 1f);
            rect.pivot = new Vector2(0f, 0.5f);
            rect.anchoredPosition = new Vector2(150f, y);
            rect.sizeDelta = new Vector2(500f, 30f);
            background = bgGo.AddComponent<Image>();
            background.color = new Color(1f, 1f, 1f, 0.15f);

            var fillGo = new GameObject("Fill", typeof(RectTransform));
            fillGo.transform.SetParent(bgGo.transform, false);
            var fillRect = (RectTransform)fillGo.transform;
            fillRect.anchorMin = Vector2.zero;
            fillRect.anchorMax = Vector2.one;
            fillRect.offsetMin = Vector2.zero;
            fillRect.offsetMax = Vector2.zero;
            var fill = fillGo.AddComponent<Image>();
            fill.color = new Color(0.85f, 0.25f, 0.2f, 0.9f);
            fill.type = Image.Type.Filled;
            fill.fillMethod = Image.FillMethod.Horizontal;
            fill.fillAmount = 1f;
            return fill;
        }
    }
}
