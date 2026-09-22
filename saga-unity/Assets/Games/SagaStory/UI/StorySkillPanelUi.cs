using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;
using Saga.Story.Data;

namespace Saga.Story.UI
{
    /// <summary>
    /// PLAN.md 101-2 STORY 5-2 1단계 — 무예 점수(SP)를 직업 무예에 붓는 화면. 웹판
    /// 무예 탭(`saga-web/saga-story/js/ui.js`)의 "이름 · 레벨 · 설명 · +" 줄을 옮겼다.
    /// `StoryJobChoiceUi`와 같은 결로 자기 UI를 스스로 짓되, 줄은 직업이 정해진 뒤에야
    /// 알 수 있어 열 때마다 다시 그린다. 여는 길: K키 · 모바일 "무예" 버튼 · 전직관(전직 뒤).
    /// </summary>
    public class StorySkillPanelUi : MonoBehaviour
    {
        public static StorySkillPanelUi Instance { get; private set; }

        [SerializeField] private GameObject _panel;
        [SerializeField] private Text _titleLabel;
        [SerializeField] private Text _statusLabel;
        [SerializeField] private Transform _rows;
        [SerializeField] private Text _closeLabel;
        // Build()(에디터 전용)가 거는 onClick은 씬 저장 때 안 남아 참조만 두고 Awake()에서 건다
        // (StoryJobChoiceUi 클래스의 같은 주석 참고). 줄 버튼은 Redraw()가 런타임에 지어 괜찮다.
        [SerializeField] private Button _closeButton;

        public bool IsShowing => _panel != null && _panel.activeSelf;

        private void Awake()
        {
            Instance = this;
            if (_closeButton != null) _closeButton.onClick.AddListener(Hide);
        }

        private void OnEnable() => StorySkillState.Changed += OnChanged;

        private void OnDisable() => StorySkillState.Changed -= OnChanged;

        public void Build()
        {
            Instance = this;

            var canvas = NewCanvas("StorySkillPanelUI");
            canvas.transform.SetParent(transform, false);

            _panel = NewPanel(canvas.transform, new Vector2(0.5f, 0.5f), new Vector2(900f, 1100f),
                new Color(0f, 0f, 0f, 0.88f));
            _panel.SetActive(false);

            _titleLabel = NewText(_panel.transform, "", new Vector2(0.5f, 1f), new Vector2(0f, -40f), new Vector2(840f, 80f), 30);
            _statusLabel = NewText(_panel.transform, "", new Vector2(0.5f, 1f), new Vector2(0f, -120f), new Vector2(840f, 60f), 22);

            var rowsGo = new GameObject("Rows", typeof(RectTransform));
            rowsGo.transform.SetParent(_panel.transform, false);
            var rect = (RectTransform)rowsGo.transform;
            rect.anchorMin = rect.anchorMax = rect.pivot = new Vector2(0.5f, 1f);
            rect.anchoredPosition = new Vector2(0f, -190f);
            rect.sizeDelta = new Vector2(840f, 800f);
            _rows = rowsGo.transform;

            _closeButton = NewButton(_panel.transform, StoryLocalization.T("settings.close"),
                new Vector2(0.5f, 0f), new Vector2(0f, 40f), new Vector2(300f, 70f), null);
            _closeLabel = _closeButton.GetComponentInChildren<Text>();
        }

        private void Update()
        {
            var kb = Keyboard.current;
            if (kb != null && kb.kKey.wasPressedThisFrame) Toggle();
        }

        public void Toggle()
        {
            if (IsShowing) Hide();
            else Show();
        }

        public void Show()
        {
            if (_panel == null) return;
            _panel.SetActive(true);
            _statusLabel.text = "";
            Redraw();
        }

        public void Hide()
        {
            if (_panel != null) _panel.SetActive(false);
        }

        /// <summary>줄 버튼 onClick과 같은 경로 — PlaytestStorySlice가 리플렉션 없이 부른다.</summary>
        public void ClickRaise(string key)
        {
            string why = StorySkillState.CanRaise(key);
            if (why != null)
            {
                _statusLabel.text = StoryLocalization.T(why);
                return;
            }
            StorySkillState.Raise(key); // Changed → OnChanged → Redraw
            _statusLabel.text = "";
        }

        /// <summary>테스트가 줄 수를 확인하는 용도.</summary>
        public int RowCount => _rows != null ? _rows.childCount : 0;

        private void OnChanged()
        {
            if (IsShowing) Redraw();
        }

        private void Redraw()
        {
            if (_closeLabel != null) _closeLabel.text = StoryLocalization.T("settings.close");

            if (!StoryJobState.HasJob)
            {
                ClearRows();
                _rowJob = null;
                _titleLabel.text = StoryLocalization.T("skill.panel_title_nojob", "무예");
                _statusLabel.text = string.Format(StoryLocalization.T("skill.panel_nojob", "전직(Lv.{0}) 뒤에 직업 무예를 익힌다"),
                    StoryCombat.JobChangeLevel);
                return;
            }

            string jobName = StoryLocalization.T($"job.{StoryJobState.Job}", StoryJobState.JobDisplayName);
            _titleLabel.text = string.Format(StoryLocalization.T("skill.panel_title", "{0} 무예 — 남은 점수 {1}"),
                jobName, StorySkillState.SpLeft);

            // 줄 구성(직업)이 그대로면 글자만 고친다 — "+" 버튼 onClick 한가운데서 그 버튼을
            // 지우면 이벤트 시스템이 이미 파괴된 버튼을 계속 붙든다.
            var skills = StorySkillData.OfJob(StoryJobState.Job);
            if (_rowJob == StoryJobState.Job && _rowLabels.Count == skills.Count && RowCount == skills.Count)
            {
                for (int i = 0; i < skills.Count; i++) _rowLabels[i].text = RowText(skills[i]);
                return;
            }

            ClearRows();
            _rowJob = StoryJobState.Job;
            float y = 0f;
            foreach (var sk in skills)
            {
                _rowLabels.Add(BuildRow(sk, y));
                y -= 130f;
            }
        }

        private string _rowJob;
        private readonly System.Collections.Generic.List<Text> _rowLabels = new System.Collections.Generic.List<Text>();

        private static string RowText(StorySkillData.Skill sk)
        {
            string name = StoryLocalization.T($"skill.{sk.Key}", sk.Name);
            string desc = StoryLocalization.T($"skill.{sk.Key}.desc", sk.Desc);
            return $"{name}  Lv.{StorySkillState.LevelOf(sk.Key)}/{sk.Max}\n{desc}";
        }

        private Text BuildRow(StorySkillData.Skill sk, float y)
        {
            var row = new GameObject($"Row_{sk.Key}", typeof(RectTransform));
            row.transform.SetParent(_rows, false);
            var rect = (RectTransform)row.transform;
            rect.anchorMin = rect.anchorMax = rect.pivot = new Vector2(0.5f, 1f);
            rect.anchoredPosition = new Vector2(0f, y);
            rect.sizeDelta = new Vector2(840f, 120f);

            var label = NewText(row.transform, RowText(sk), new Vector2(0f, 0.5f),
                new Vector2(10f, 0f), new Vector2(680f, 110f), 24);
            label.alignment = TextAnchor.MiddleLeft;

            string captured = sk.Key;
            NewButton(row.transform, "+", new Vector2(1f, 0.5f), new Vector2(-10f, 0f), new Vector2(110f, 100f),
                () => ClickRaise(captured));
            return label;
        }

        // Destroy()는 프레임 끝으로 밀려 같은 프레임에 다시 그리면 쌓인다
        // (StoryLabyrinthMapUi.ClearChildren()과 같은 함정, PROJECT_STATE "알려진 오류").
        private void ClearRows()
        {
            _rowLabels.Clear();
            if (_rows == null) return;
            for (int i = _rows.childCount - 1; i >= 0; i--) DestroyImmediate(_rows.GetChild(i).gameObject);
        }

        private static Canvas NewCanvas(string name)
        {
            var go = new GameObject(name);
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 20;
            var scaler = go.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080f, 1920f);
            StorySettingsState.ApplyUiScale(scaler);
            go.AddComponent<GraphicRaycaster>();
            return canvas;
        }

        private static GameObject NewPanel(Transform parent, Vector2 anchor, Vector2 size, Color color)
        {
            var go = new GameObject("Panel", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = rect.anchorMax = rect.pivot = anchor;
            rect.sizeDelta = size;
            rect.anchoredPosition = Vector2.zero;
            go.AddComponent<Image>().color = color;
            return go;
        }

        private static Text NewText(Transform parent, string content, Vector2 anchor, Vector2 pos, Vector2 size, int fontSize)
        {
            var go = new GameObject("Text", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = rect.anchorMax = rect.pivot = anchor;
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

        private static Button NewButton(Transform parent, string label, Vector2 anchor, Vector2 pos, Vector2 size, UnityEngine.Events.UnityAction onClick)
        {
            var go = new GameObject($"Btn_{label}", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = rect.anchorMax = rect.pivot = anchor;
            rect.anchoredPosition = pos;
            rect.sizeDelta = size;

            var img = go.AddComponent<Image>();
            img.color = new Color(1f, 1f, 1f, 0.18f);
            var button = go.AddComponent<Button>();
            button.targetGraphic = img;
            if (onClick != null) button.onClick.AddListener(onClick);

            NewText(go.transform, label, new Vector2(0.5f, 0.5f), Vector2.zero, size, 30);
            return button;
        }
    }
}
