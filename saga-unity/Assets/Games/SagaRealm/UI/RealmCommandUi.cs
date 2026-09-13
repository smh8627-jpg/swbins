using UnityEngine;
using UnityEngine.UI;
using Saga.Realm.Data;

namespace Saga.Realm.UI
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 1·2-3·2-4·3절 — "명령"(10종, 두 열)·"성"
    /// (조망·명령 대상 전환)·"공격"(소패 공략)·"다음 달" 버튼. SagaGo
    /// `World/BanditEncounter.cs`처럼 자기 UI를 스스로 짓는 컴포넌트.
    /// </summary>
    public class RealmCommandUi : MonoBehaviour
    {
        private GameObject _orderPanel;
        private GameObject _cityPanel;
        private GameObject _plotPanel;
        private GameObject _quizPanel;
        private Transform _cityButtonsRoot;
        private Transform _plotButtonsRoot;
        private Transform _quizButtonsRoot;
        private Text _quizQuestionText;
        private Text _quizProgressText;
        private RealmQuizState.Presented? _currentQuiz;

        public void Build()
        {
            var canvas = RealmUiKit.NewCanvas("RealmCommandUI");
            canvas.transform.SetParent(transform, false);

            // 다섯 버튼(명령/성/계략/공격/다음달) — 외교(계략) 추가로
            // 넷에서 다섯으로 늘며 간격만 좁혔다(폭 190→180, 간격 270→210).
            RealmUiKit.NewButton(canvas.transform, "명령", new Vector2(0.5f, 0f), new Vector2(-420f, 100f),
                new Vector2(180f, 110f), ToggleOrderPanel);
            RealmUiKit.NewButton(canvas.transform, "성", new Vector2(0.5f, 0f), new Vector2(-210f, 100f),
                new Vector2(180f, 110f), ToggleCityPanel);
            RealmUiKit.NewButton(canvas.transform, "계략", new Vector2(0.5f, 0f), new Vector2(0f, 100f),
                new Vector2(180f, 110f), TogglePlotPanel);
            RealmUiKit.NewButton(canvas.transform, "공격", new Vector2(0.5f, 0f), new Vector2(210f, 100f),
                new Vector2(180f, 110f), ExecuteAttack);
            RealmUiKit.NewButton(canvas.transform, "다음 달", new Vector2(0.5f, 0f), new Vector2(420f, 100f),
                new Vector2(180f, 110f), ExecuteNextMonth);

            // 문답(REALM 다음 조각 (3))은 명령/전쟁과 달리 턴·성·무장과
            // 무관한 개인 미니게임이라 아래 다섯 버튼 행에 안 끼우고
            // 화면 오른쪽 위 구석에 따로 뒀다(HUD가 왼쪽 위를 쓰니 안 겹침).
            RealmUiKit.NewButton(canvas.transform, "문답", new Vector2(1f, 1f), new Vector2(-110f, -90f),
                new Vector2(180f, 110f), ToggleQuizPanel);

            // 월드맵(2-8절) — 문답과 같은 구석, 그 바로 아래에 둔다(명령/성/
            // 계략/공격/다음달 행과도, HUD 라벨과도 안 겹치는 유일한 빈 자리).
            RealmUiKit.NewButton(canvas.transform, "지도", new Vector2(1f, 1f), new Vector2(-110f, -210f),
                new Vector2(180f, 110f), ToggleMap);

            BuildOrderPanel(canvas.transform);
            BuildCityPanel(canvas.transform);
            BuildPlotPanel(canvas.transform);
            BuildQuizPanel(canvas.transform);
        }

        /// <summary>명령 10종 — rtk.js ORDERS 순서, 두 열(왼쪽 5·오른쪽 5)로
        /// 나눠 패널 높이를 감당할 만하게 잡는다.</summary>
        private void BuildOrderPanel(Transform parent)
        {
            _orderPanel = RealmUiKit.NewPanel(parent, new Vector2(0.5f, 0.5f), new Vector2(920f, 620f),
                new Color(0f, 0f, 0f, 0.75f));
            _orderPanel.SetActive(false);

            RealmUiKit.NewText(_orderPanel.transform, "명령", new Vector2(0.5f, 1f), new Vector2(0f, -60f),
                new Vector2(560f, 60f), 32);

            var keys = RealmOrderData.AllKeys;
            for (int i = 0; i < keys.Length; i++)
            {
                string key = keys[i];
                var order = RealmOrderData.Get(key);
                string label = order != null ? $"{order.Name} ({order.Gold}냥)" : key;

                int col = i / 5; // 0=왼쪽, 1=오른쪽
                int row = i % 5;
                float x = col == 0 ? -230f : 230f;
                float y = -150f - row * 100f;
                RealmUiKit.NewButton(_orderPanel.transform, label, new Vector2(0.5f, 1f), new Vector2(x, y),
                    new Vector2(420f, 84f), () => ChooseOrder(key));
            }

            RealmUiKit.NewButton(_orderPanel.transform, "닫는다", new Vector2(0.5f, 0f), new Vector2(0f, 40f),
                new Vector2(300f, 70f), () => _orderPanel.SetActive(false));
        }

        /// <summary>함락한 성(REALM 다음 조각 (2))이 늘면 목록도 늘어야
        /// 하므로, 계략 패널(RefreshPlotPanel)과 같은 결로 열 때마다
        /// RealmCityState.ActiveCityIds 기준으로 다시 짓는다.</summary>
        private void BuildCityPanel(Transform parent)
        {
            _cityPanel = RealmUiKit.NewPanel(parent, new Vector2(0.5f, 0.5f), new Vector2(560f, 560f),
                new Color(0f, 0f, 0f, 0.75f));
            _cityPanel.SetActive(false);

            RealmUiKit.NewText(_cityPanel.transform, "성 — 조망·명령 대상", new Vector2(0.5f, 1f), new Vector2(0f, -60f),
                new Vector2(500f, 60f), 30);

            var root = new GameObject("CityButtons", typeof(RectTransform));
            root.transform.SetParent(_cityPanel.transform, false);
            var rootRect = (RectTransform)root.transform;
            rootRect.anchorMin = Vector2.zero;
            rootRect.anchorMax = Vector2.one;
            rootRect.sizeDelta = Vector2.zero;
            rootRect.anchoredPosition = Vector2.zero;
            _cityButtonsRoot = root.transform;

            RealmUiKit.NewButton(_cityPanel.transform, "닫는다", new Vector2(0.5f, 0f), new Vector2(0f, 30f),
                new Vector2(300f, 70f), () => _cityPanel.SetActive(false));
        }

        private void RefreshCityPanel()
        {
            for (int i = _cityButtonsRoot.childCount - 1; i >= 0; i--)
            {
                Destroy(_cityButtonsRoot.GetChild(i).gameObject);
            }

            float y = -150f;
            foreach (var cityId in RealmCityState.ActiveCityIds)
            {
                var def = RealmCityData.Get(cityId);
                string capturedId = cityId;
                RealmUiKit.NewButton(_cityButtonsRoot, def.Name, new Vector2(0.5f, 1f), new Vector2(0f, y),
                    new Vector2(460f, 84f), () => ChooseCity(capturedId));
                y -= 100f;
            }
        }

        /// <summary>diplo.js "계략은 성공률을 숨기지 않는다" — 성공률이
        /// 지금 조망 성·로스터 상태에 따라 매번 바뀌므로(RealmWarState
        /// .PreviewPlotChance), 정적으로 한 번 짓지 않고 열 때마다 버튼을
        /// 다시 만든다(RealmCityBuilder.Rebuild()와 같은 결).</summary>
        private void BuildPlotPanel(Transform parent)
        {
            _plotPanel = RealmUiKit.NewPanel(parent, new Vector2(0.5f, 0.5f), new Vector2(680f, 420f),
                new Color(0f, 0f, 0f, 0.75f));
            _plotPanel.SetActive(false);

            RealmUiKit.NewText(_plotPanel.transform, "계략 — 허창에서만", new Vector2(0.5f, 1f), new Vector2(0f, -60f),
                new Vector2(600f, 60f), 30);

            var root = new GameObject("PlotButtons", typeof(RectTransform));
            root.transform.SetParent(_plotPanel.transform, false);
            var rootRect = (RectTransform)root.transform;
            rootRect.anchorMin = Vector2.zero;
            rootRect.anchorMax = Vector2.one;
            rootRect.sizeDelta = Vector2.zero;
            rootRect.anchoredPosition = Vector2.zero;
            _plotButtonsRoot = root.transform;

            RealmUiKit.NewButton(_plotPanel.transform, "닫는다", new Vector2(0.5f, 0f), new Vector2(0f, 40f),
                new Vector2(300f, 70f), () => _plotPanel.SetActive(false));
        }

        private void RefreshPlotPanel()
        {
            for (int i = _plotButtonsRoot.childCount - 1; i >= 0; i--)
            {
                Destroy(_plotButtonsRoot.GetChild(i).gameObject);
            }

            float y = -150f;
            foreach (var key in RealmPlotData.AllKeys)
            {
                var plot = RealmPlotData.Get(key);
                float chance = RealmWarState.PreviewPlotChance(RealmCityState.CurrentCity);
                string chanceText = chance > 0f ? $"{Mathf.RoundToInt(chance * 100f)}%" : "무장 없음";
                string label = $"{plot.Emoji} {plot.Name} ({plot.Gold}냥, 성공률 {chanceText})";
                string capturedKey = key;
                RealmUiKit.NewButton(_plotButtonsRoot, label, new Vector2(0.5f, 1f), new Vector2(0f, y),
                    new Vector2(600f, 84f), () => ChoosePlot(capturedKey));
                y -= 100f;
            }
        }

        /// <summary>문답 — quiz.js draw()/answer() 그대로(RealmQuizState.cs
        /// 참고). 명령/계략과 달리 무장·턴을 안 쓰는 개인 미니게임이라
        /// 답하면 바로 다음 문제를 이어 낸다(닫을 때까지 계속 풀 수 있게).</summary>
        private void BuildQuizPanel(Transform parent)
        {
            _quizPanel = RealmUiKit.NewPanel(parent, new Vector2(0.5f, 0.5f), new Vector2(760f, 800f),
                new Color(0f, 0f, 0f, 0.82f));
            _quizPanel.SetActive(false);

            // 전부 위(anchor top) 기준으로 순서대로 쌓는다 — 아래(닫는다
            // 버튼)만 따로 아래 기준을 쓰면 문제 텍스트 줄 수에 따라
            // 겹칠 수 있어 통일했다.
            RealmUiKit.NewText(_quizPanel.transform, "문답", new Vector2(0.5f, 1f), new Vector2(0f, -50f),
                new Vector2(600f, 50f), 30);
            _quizProgressText = RealmUiKit.NewText(_quizPanel.transform, "", new Vector2(0.5f, 1f), new Vector2(0f, -115f),
                new Vector2(680f, 36f), 22);
            _quizQuestionText = RealmUiKit.NewText(_quizPanel.transform, "", new Vector2(0.5f, 1f), new Vector2(0f, -230f),
                new Vector2(680f, 160f), 26);

            var root = new GameObject("QuizButtons", typeof(RectTransform));
            root.transform.SetParent(_quizPanel.transform, false);
            var rootRect = (RectTransform)root.transform;
            rootRect.anchorMin = Vector2.zero;
            rootRect.anchorMax = Vector2.one;
            rootRect.sizeDelta = Vector2.zero;
            rootRect.anchoredPosition = Vector2.zero;
            _quizButtonsRoot = root.transform;

            RealmUiKit.NewButton(_quizPanel.transform, "닫는다", new Vector2(0.5f, 1f), new Vector2(0f, -740f),
                new Vector2(300f, 70f), () => _quizPanel.SetActive(false));
        }

        /// <summary>새 문제를 뽑아 화면을 다시 채운다 — 열 때·정답을
        /// 고를 때마다 부른다.</summary>
        private void RefreshQuizPanel()
        {
            for (int i = _quizButtonsRoot.childCount - 1; i >= 0; i--)
            {
                Destroy(_quizButtonsRoot.GetChild(i).gameObject);
            }

            var progress = RealmQuizState.GetProgress();
            _quizProgressText.text = $"학습 {progress.Learned}/{progress.Total} · 정답 {progress.Correct}/{progress.Answered} · 연속 {progress.Streak}(최고 {progress.BestStreak})";

            var drawn = RealmQuizState.Draw();
            _currentQuiz = drawn;
            if (drawn == null)
            {
                _quizQuestionText.text = "낼 문제가 없다.";
                return;
            }
            var p = drawn.Value;
            _quizQuestionText.text = $"[{RealmQuizData.CatName(p.Cat)} · Lv{p.Lv}{(p.Review ? " · 복습" : "")}]\n{p.Q}";

            float y = -360f;
            for (int i = 0; i < p.Choices.Length; i++)
            {
                int idx = i;
                RealmUiKit.NewButton(_quizButtonsRoot, p.Choices[i], new Vector2(0.5f, 1f), new Vector2(0f, y),
                    new Vector2(660f, 84f), () => ChooseQuizAnswer(idx));
                y -= 100f;
            }
        }

        private void ChooseQuizAnswer(int choiceIdx)
        {
            if (_currentQuiz == null) return;
            var result = RealmQuizState.Answer(_currentQuiz.Value, choiceIdx);
            string msg = result.Ok
                ? $"⭕ 정답! {result.Why}" + (result.Gold > 0 ? $" (+{result.Gold}냥)" : "")
                : $"❌ 오답 — 정답은 \"{result.AnswerText}\". {result.Why}";
            RealmToast.Instance?.Show(msg, 7f);
            RefreshQuizPanel();
        }

        private void ToggleOrderPanel()
        {
            _cityPanel.SetActive(false);
            _plotPanel.SetActive(false);
            _quizPanel.SetActive(false);
            _orderPanel.SetActive(!_orderPanel.activeSelf);
        }

        private void ToggleCityPanel()
        {
            _orderPanel.SetActive(false);
            _plotPanel.SetActive(false);
            _quizPanel.SetActive(false);
            bool open = !_cityPanel.activeSelf;
            _cityPanel.SetActive(open);
            if (open) RefreshCityPanel();
        }

        private void TogglePlotPanel()
        {
            _orderPanel.SetActive(false);
            _cityPanel.SetActive(false);
            _quizPanel.SetActive(false);
            bool open = !_plotPanel.activeSelf;
            _plotPanel.SetActive(open);
            if (open) RefreshPlotPanel();
        }

        private void ToggleQuizPanel()
        {
            _orderPanel.SetActive(false);
            _cityPanel.SetActive(false);
            _plotPanel.SetActive(false);
            bool open = !_quizPanel.activeSelf;
            _quizPanel.SetActive(open);
            if (open) RefreshQuizPanel();
        }

        /// <summary>월드맵을 열 때는 명령 계열 패널이 지도 위에 뜨는 게
        /// 어색해 미리 닫는다 — 닫는 쪽(지도→디오라마)은 패널과 무관해
        /// 그냥 토글만.</summary>
        private void ToggleMap()
        {
            if (!RealmMapState.ViewingMap)
            {
                _orderPanel.SetActive(false);
                _cityPanel.SetActive(false);
                _plotPanel.SetActive(false);
                _quizPanel.SetActive(false);
            }
            RealmMapState.Toggle();
        }

        private void ChooseOrder(string key)
        {
            var result = RealmCityState.ExecuteOrder(key);
            RealmToast.Instance?.Show(result.Message, 5f);
            if (result.Ok) _orderPanel.SetActive(false);
        }

        private void ChooseCity(string cityId)
        {
            RealmCityState.SetCurrentCity(cityId);
            _cityPanel.SetActive(false);
        }

        private void ExecuteNextMonth()
        {
            string summary = RealmCityState.NextMonth();
            RealmToast.Instance?.Show(summary, 5f);
        }

        private void ExecuteAttack()
        {
            var result = RealmWarState.Attack(RealmCityState.CurrentCity);
            RealmToast.Instance?.Show(result.Message, 6f);
        }

        private void ChoosePlot(string key)
        {
            var result = RealmWarState.Plot(key, RealmCityState.CurrentCity);
            RealmToast.Instance?.Show(result.Message, 6f);
            if (result.Ok) _plotPanel.SetActive(false);
        }
    }
}
