using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Saga.Forest.Data;

namespace Saga.Forest.UI
{
    /// <summary>
    /// GO `UI/EncounterUiKit.cs`를 그대로 복사(네임스페이스만 변경, 루트
    /// CLAUDE.md "다섯 판은 다섯 벌 복사" 원칙) — 사건 UI 조립 공통 부품
    /// (캔버스/패널/텍스트/버튼/막대). `ForestHostileEncounterUi.cs`(2026-09-14
    /// 전투 콘텐츠 추가)가 쓴다.
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
            Saga.Core.SagaUi.ApplyGameScaler(scaler);
            ForestSettingsState.ApplyUiScale(scaler); // 설정에서 고른 UI 크기를 새 캔버스에도 그대로.
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

        public static TextMeshProUGUI NewText(Transform parent, string content, Vector2 anchor, Vector2 pos, Vector2 size, int fontSize)
        {
            var go = new GameObject("Text", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.anchoredPosition = pos;
            rect.sizeDelta = size;

            var text = go.AddComponent<TextMeshProUGUI>();
            text.fontSize = fontSize;
            text.alignment = TextAlignmentOptions.Center;
            text.color = Color.white;
            text.textWrappingMode = TextWrappingModes.Normal;
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
            // 에디터 빌드면 영속 리스너, Play 중이면 런타임 리스너 — SagaCore/ButtonWiring.cs(2026-09-23 먹통 버그).
            Saga.Core.ButtonWiring.Wire(button, onClick);

            NewText(go.transform, label, new Vector2(0.5f, 0.5f), Vector2.zero, size, 26);

            return button;
        }

        /// <summary>왼쪽 라벨 + 오른쪽으로 차는 막대 하나(Image.fillAmount 기반).</summary>
        public static Image NewBarRow(Transform parent, string label, float y, out Image background)
        {
            NewText(parent, label, new Vector2(0f, 1f), new Vector2(30f, y), new Vector2(110f, 40f), 22).alignment = TextAlignmentOptions.Left;

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
