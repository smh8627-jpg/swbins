using UnityEngine;
using UnityEngine.UI;
using Saga.Story.Data;
using Saga.Story.World;

namespace Saga.Story.UI
{
    /// <summary>
    /// PLAN.md 101-2 STORY "5-3 비경" — 노드 지도 화면(godot
    /// `StoryLabyrinth.tscn`의 재해석, 실행 흐름 전체는
    /// `StoryLabyrinthRunner.cs` 클래스 주석 참고). `StoryJobChoiceUi.cs`와
    /// 같은 결로 자기 UI를 스스로 짓는다(캔버스/패널/텍스트/버튼 헬퍼도
    /// 그대로 복사).
    /// </summary>
    public class StoryLabyrinthMapUi : MonoBehaviour
    {
        public static StoryLabyrinthMapUi Instance { get; private set; }

        [SerializeField] private GameObject _mapPanel;
        [SerializeField] private Text _floorLabel;
        [SerializeField] private Transform _nodeButtonRoot;
        [SerializeField] private GameObject _blessingPanel;
        [SerializeField] private Text _blessingTitle;
        [SerializeField] private Transform _blessingButtonRoot;

        // `StoryJobChoiceUi.cs`는 Instance를 Build()(에디터 전용, 런타임
        // 재호출 없음)에서만 채워 실제 플레이 세션(도메인 리로드 이후)엔
        // null로 남는 함정이 있다 — StoryChoiceUi/StoryCameraFollow처럼
        // Awake()에서도 채워 실제 게임 경로에서 확실히 살아 있게 한다
        // (필드 자체는 [SerializeField]라 씬 재로드에도 참조가 남는다).
        // 2026-09-23 — Build()(에디터 전용)에서 건 onClick 리스너는 씬 저장 때 안 남는다
        // (StoryJobChoiceUi와 같은 발견). 노드·축복 버튼은 런타임에 새로 지어 괜찮고, Build()가
        // 짓는 "포기" 버튼 하나만 참조를 직렬화해 Awake()에서 건다.
        [SerializeField] private Button _abandonButton;

        private void Awake()
        {
            Instance = this;
            if (_abandonButton != null) _abandonButton.onClick.AddListener(AbandonAndClose);
        }

        public void Build()
        {
            Instance = this;

            var canvas = NewCanvas("StoryLabyrinthUI");
            canvas.transform.SetParent(transform, false);

            _mapPanel = NewPanel(canvas.transform, new Vector2(0.5f, 0.5f), new Vector2(900f, 1200f), new Color(0.05f, 0.02f, 0.08f, 0.92f));
            _floorLabel = NewText(_mapPanel.transform, "", new Vector2(0.5f, 1f), new Vector2(0f, -50f), new Vector2(800f, 80f), 30);

            var nodeRootGo = new GameObject("NodeButtons", typeof(RectTransform));
            nodeRootGo.transform.SetParent(_mapPanel.transform, false);
            var nodeRect = (RectTransform)nodeRootGo.transform;
            nodeRect.anchorMin = new Vector2(0.5f, 1f);
            nodeRect.anchorMax = new Vector2(0.5f, 1f);
            nodeRect.pivot = new Vector2(0.5f, 1f);
            nodeRect.anchoredPosition = new Vector2(0f, -160f);
            nodeRect.sizeDelta = new Vector2(820f, 900f);
            _nodeButtonRoot = nodeRootGo.transform;

            _abandonButton = NewButton(_mapPanel.transform, StoryLocalization.T("labyrinth.abandon_button", "포기하고 나간다"),
                new Vector2(0.5f, 0f), new Vector2(0f, 40f), new Vector2(400f, 70f), null);

            _mapPanel.SetActive(false);

            _blessingPanel = NewPanel(canvas.transform, new Vector2(0.5f, 0.5f), new Vector2(900f, 700f), new Color(0.05f, 0.02f, 0.08f, 0.95f));
            _blessingTitle = NewText(_blessingPanel.transform, "", new Vector2(0.5f, 1f), new Vector2(0f, -50f), new Vector2(800f, 100f), 30);

            var blessingRootGo = new GameObject("BlessingButtons", typeof(RectTransform));
            blessingRootGo.transform.SetParent(_blessingPanel.transform, false);
            var blessingRect = (RectTransform)blessingRootGo.transform;
            blessingRect.anchorMin = new Vector2(0.5f, 1f);
            blessingRect.anchorMax = new Vector2(0.5f, 1f);
            blessingRect.pivot = new Vector2(0.5f, 1f);
            blessingRect.anchoredPosition = new Vector2(0f, -180f);
            blessingRect.sizeDelta = new Vector2(820f, 480f);
            _blessingButtonRoot = blessingRootGo.transform;
            _blessingPanel.SetActive(false);
        }

        private void AbandonAndClose()
        {
            StoryLabyrinthRunner.Instance?.AbandonRun();
            Close();
        }

        public void Close()
        {
            if (_mapPanel != null) _mapPanel.SetActive(false);
            if (_blessingPanel != null) _blessingPanel.SetActive(false);
        }

        /// <summary>회차 진입 직후 — 무조건 하나 고른다(취소 없음, PLAN
        /// 원안 그대로).</summary>
        public void ShowEntryBlessing(System.Action onDone) =>
            ShowBlessingPick(StoryLocalization.T("labyrinth.entry_blessing", "비경 진입 — 은사 하나를 고르십시오"), onDone);

        /// <summary>정예 처치 직후 — `onDone`은 보통 그 노드의 onCleared
        /// (StoryLabyrinthRunner.CompleteNode()가 넘겨준다) — 골라야 다음
        /// 층으로 넘어간다.</summary>
        public void ShowEliteBlessing(System.Action onDone) =>
            ShowBlessingPick(StoryLocalization.T("labyrinth.elite_blessing", "정예 처치 — 은사를 하나 더 고르십시오"), onDone);

        /// <summary>축마다 하나씩 뽑아 3택을 만든다 — `StoryLabyrinthData.cs`
        /// 클래스 주석 "재해석 — 축복" 참고, 이 구조 자체가 축 중복을
        /// 원천 차단한다.</summary>
        private void ShowBlessingPick(string title, System.Action onDone)
        {
            ClearChildren(_blessingButtonRoot);
            _blessingTitle.text = title;

            float y = -40f;
            foreach (var pool in StoryLabyrinthData.AxisPools)
            {
                var b = pool[Random.Range(0, pool.Length)];
                string label = $"[{AxisLabel(b.Axis)}] {b.Name} — {b.Description}";
                NewButton(_blessingButtonRoot, label, new Vector2(0.5f, 1f), new Vector2(0f, y), new Vector2(760f, 110f),
                    () =>
                    {
                        StoryLabyrinthState.ApplyBlessing(b.Key);
                        _blessingPanel.SetActive(false);
                        onDone?.Invoke();
                    });
                y -= 140f;
            }

            _mapPanel.SetActive(false);
            _blessingPanel.SetActive(true);
        }

        private static string AxisLabel(StoryLabyrinthData.BlessingAxis axis) => axis switch
        {
            StoryLabyrinthData.BlessingAxis.Attack => StoryLocalization.T("labyrinth.axis_attack", "공격"),
            StoryLabyrinthData.BlessingAxis.Defense => StoryLocalization.T("labyrinth.axis_defense", "방어"),
            _ => StoryLocalization.T("labyrinth.axis_utility", "유틸"),
        };

        public void ShowFloor()
        {
            _blessingPanel.SetActive(false);
            int floor = StoryLabyrinthState.Floor;
            ClearChildren(_nodeButtonRoot);

            if (floor >= 5)
            {
                _floorLabel.text = StoryLocalization.T("labyrinth.floor_boss", "5층 — 관문의 주인");
                NewButton(_nodeButtonRoot, StoryLocalization.T("labyrinth.enter_boss", "도전한다"),
                    new Vector2(0.5f, 1f), new Vector2(0f, -40f), new Vector2(700f, 100f),
                    () => EnterNode(StoryLabyrinthData.NodeType.Boss, OnBossCleared));
                _mapPanel.SetActive(true);
                return;
            }

            var nodes = StoryLabyrinthState.FloorNodes[floor - 1];
            _floorLabel.text = string.Format(StoryLocalization.T("labyrinth.floor_label", "{0}층 — 갈 길을 고르십시오"), floor);
            float y = -40f;
            foreach (var node in nodes)
            {
                var captured = node;
                NewButton(_nodeButtonRoot, NodeLabel(captured), new Vector2(0.5f, 1f), new Vector2(0f, y), new Vector2(700f, 100f),
                    () => EnterNode(captured, OnFloorNodeCleared));
                y -= 140f;
            }
            _mapPanel.SetActive(true);
        }

        private void EnterNode(StoryLabyrinthData.NodeType type, System.Action onCleared)
        {
            _mapPanel.SetActive(false);
            StoryLabyrinthRunner.Instance?.EnterNode(type, onCleared);
        }

        private void OnFloorNodeCleared()
        {
            StoryLabyrinthState.AdvanceFloor();
            ShowFloor();
        }

        private void OnBossCleared()
        {
            StoryLabyrinthRunner.Instance?.CompleteRun();
            Close();
        }

        private static string NodeLabel(StoryLabyrinthData.NodeType type) => type switch
        {
            StoryLabyrinthData.NodeType.Combat => StoryLocalization.T("labyrinth.node_combat", "⚔️ 전투"),
            StoryLabyrinthData.NodeType.Elite => StoryLocalization.T("labyrinth.node_elite", "👹 정예"),
            StoryLabyrinthData.NodeType.Treasure => StoryLocalization.T("labyrinth.node_treasure", "💰 보물"),
            StoryLabyrinthData.NodeType.Rest => StoryLocalization.T("labyrinth.node_rest", "🏕 휴식"),
            StoryLabyrinthData.NodeType.Event => StoryLocalization.T("labyrinth.node_event", "📜 사건"),
            _ => type.ToString(),
        };

        /// <summary>`Destroy()`는 실제 파괴를 프레임 끝으로 미루므로
        /// (`StoryEnemy.IsDead` 클래스 주석과 같은 함정) 같은 프레임 안에
        /// 은사/노드 화면을 연달아 다시 그리면(예: 정예 처치 직후 바로
        /// 다음 진입) 이전 버튼이 안 지워진 채 새 버튼 위에 쌓인다 —
        /// `DestroyImmediate`로 그 자리에서 확실히 지운다.</summary>
        private static void ClearChildren(Transform root)
        {
            for (int i = root.childCount - 1; i >= 0; i--) DestroyImmediate(root.GetChild(i).gameObject);
        }

        // StoryJobChoiceUi.cs와 같은 넷(캔버스/패널/텍스트/버튼) — 이 판에
        // 쓰는 곳이 이거 하나뿐이라 kit로 안 뽑고 그대로 복사한다(같은 판단).
        private static Canvas NewCanvas(string name)
        {
            var go = new GameObject(name);
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
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
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.sizeDelta = size;
            rect.anchoredPosition = Vector2.zero;
            var img = go.AddComponent<Image>();
            img.color = color;
            return go;
        }

        private static Text NewText(Transform parent, string content, Vector2 anchor, Vector2 pos, Vector2 size, int fontSize)
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

        private static Button NewButton(Transform parent, string label, Vector2 anchor, Vector2 pos, Vector2 size, UnityEngine.Events.UnityAction onClick)
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
            if (onClick != null) button.onClick.AddListener(onClick);

            NewText(go.transform, label, new Vector2(0.5f, 0.5f), Vector2.zero, size, 24);

            return button;
        }
    }
}
