using UnityEngine;
using UnityEngine.UI;
using Saga.Realm.Data;
using Saga.Realm.Audio;

namespace Saga.Realm.UI
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 1·2-3·2-4·3절 — "명령"(10종, 두 열)·"성"
    /// (조망·명령 대상 전환)·"공격"(적국 공략, 51장부터 소패·정도 둘)·
    /// "다음 달" 버튼. SagaGo
    /// `World/BanditEncounter.cs`처럼 자기 UI를 스스로 짓는 컴포넌트.
    ///
    /// 2026-09-14 "사운드" — 명령/문답/공격/계략 네 판정 결과에 confirm/
    /// error 두 클립을 재생한다(`RealmAudio.cs` 클래스 주석 참고). 클립은
    /// `BuildTestCityScene.cs`가 `SetPrivateField`로 채운다 — 비어 있으면
    /// (헤드리스 유닛 테스트 등) `RealmAudio.PlaySfx`가 조용히 넘어간다.
    /// </summary>
    public class RealmCommandUi : MonoBehaviour
    {
        [SerializeField] private AudioClip confirmClip;
        [SerializeField] private AudioClip errorClip;

        private GameObject _orderPanel;
        private GameObject _cityPanel;
        private GameObject _plotPanel;
        private GameObject _quizPanel;
        private GameObject _archivePanel;
        private GameObject _settingsPanel;
        private Transform _cityButtonsRoot;
        private Transform _plotButtonsRoot;
        private Transform _quizButtonsRoot;
        private Transform _archiveButtonsRoot;
        private Text _quizQuestionText;
        private Text _quizProgressText;
        private Text _settingsToggleLabel;
        private Text _settingsTitleLabel;
        private Text _settingsCloseLabel;
        private Text _settingsSfxNameLabel;
        private Text _settingsSfxLabel;
        private Text _settingsVibrationNameLabel;
        private Text _settingsVibrationLabel;
        private Text _settingsUiScaleNameLabel;
        private Text _settingsUiScaleLabel;
        private Text _settingsQualityNameLabel;
        private Text _settingsQualityLabel;
        private Text _settingsLanguageNameLabel;
        private Text _settingsLanguageLabel;
        private Text _settingsBgmNameLabel;
        private Text _settingsBgmLabel;
        private RealmQuizState.Presented? _currentQuiz;

        public void Build()
        {
            var canvas = RealmUiKit.NewCanvas("RealmCommandUI");
            canvas.transform.SetParent(transform, false);

            // 다섯 버튼(명령/성/계략/공격/다음달) — 외교(계략) 추가로
            // 넷에서 다섯으로 늘며 간격만 좁혔다(폭 190→180, 간격 270→210).
            RealmUiKit.NewButton(canvas.transform, RealmLocalization.T("command.orders"), new Vector2(0.5f, 0f), new Vector2(-420f, 100f),
                new Vector2(180f, 110f), ToggleOrderPanel);
            RealmUiKit.NewButton(canvas.transform, RealmLocalization.T("command.city"), new Vector2(0.5f, 0f), new Vector2(-210f, 100f),
                new Vector2(180f, 110f), ToggleCityPanel);
            RealmUiKit.NewButton(canvas.transform, RealmLocalization.T("command.plot"), new Vector2(0.5f, 0f), new Vector2(0f, 100f),
                new Vector2(180f, 110f), TogglePlotPanel);
            RealmUiKit.NewButton(canvas.transform, RealmLocalization.T("command.attack"), new Vector2(0.5f, 0f), new Vector2(210f, 100f),
                new Vector2(180f, 110f), ExecuteAttack);
            RealmUiKit.NewButton(canvas.transform, RealmLocalization.T("command.next_month"), new Vector2(0.5f, 0f), new Vector2(420f, 100f),
                new Vector2(180f, 110f), ExecuteNextMonth);

            // 문답(REALM 다음 조각 (3))은 명령/전쟁과 달리 턴·성·무장과
            // 무관한 개인 미니게임이라 아래 다섯 버튼 행에 안 끼우고
            // 화면 오른쪽 위 구석에 따로 뒀다(HUD가 왼쪽 위를 쓰니 안 겹침).
            RealmUiKit.NewButton(canvas.transform, RealmLocalization.T("command.quiz"), new Vector2(1f, 1f), new Vector2(-110f, -90f),
                new Vector2(180f, 110f), ToggleQuizPanel);

            // 월드맵(2-8절) — 문답과 같은 구석, 그 바로 아래에 둔다(명령/성/
            // 계략/공격/다음달 행과도, HUD 라벨과도 안 겹치는 유일한 빈 자리).
            RealmUiKit.NewButton(canvas.transform, RealmLocalization.T("command.map"), new Vector2(1f, 1f), new Vector2(-110f, -210f),
                new Vector2(180f, 110f), ToggleMap);

            // 서고(godot REALM 10절) — 문답보다도 위 구석(같은 결로 명령
            // 계열과 안 겹치는 유일한 빈 자리).
            RealmUiKit.NewButton(canvas.transform, RealmLocalization.T("command.archive"), new Vector2(1f, 1f), new Vector2(-110f, 30f),
                new Vector2(180f, 110f), ToggleArchivePanel);

            // 설정(PLAN.md 67~69장 "접근성") — 문답/지도/서고와 같은 구석
            // 기둥을 한 칸 더 내려 잇는다(지도 -210 바로 아래, 10px 틈).
            // 디버그 오버레이(BuildTestCityScene.cs, y -20~-140)보다 한참
            // 아래라 겹치지 않는다.
            var settingsToggleButton = RealmUiKit.NewButton(canvas.transform, RealmLocalization.T("settings.title"),
                new Vector2(1f, 1f), new Vector2(-110f, -330f), new Vector2(180f, 110f), ToggleSettingsPanel);
            _settingsToggleLabel = settingsToggleButton.GetComponentInChildren<Text>();

            BuildOrderPanel(canvas.transform);
            BuildCityPanel(canvas.transform);
            BuildPlotPanel(canvas.transform);
            BuildQuizPanel(canvas.transform);
            BuildArchivePanel(canvas.transform);
            BuildSettingsPanel(canvas.transform);
        }

        /// <summary>명령 10종 — rtk.js ORDERS 순서, 두 열(왼쪽 5·오른쪽 5)로
        /// 나눠 패널 높이를 감당할 만하게 잡는다.</summary>
        private void BuildOrderPanel(Transform parent)
        {
            _orderPanel = RealmUiKit.NewPanel(parent, new Vector2(0.5f, 0.5f), new Vector2(920f, 620f),
                new Color(0f, 0f, 0f, 0.75f));
            _orderPanel.SetActive(false);

            RealmUiKit.NewText(_orderPanel.transform, RealmLocalization.T("command.orders"), new Vector2(0.5f, 1f), new Vector2(0f, -60f),
                new Vector2(560f, 60f), 32);

            var keys = RealmOrderData.AllKeys;
            for (int i = 0; i < keys.Length; i++)
            {
                string key = keys[i];
                var order = RealmOrderData.Get(key);
                string label = order != null ? string.Format(RealmLocalization.T("ui.order_label", "{0} ({1}냥)"), order.Name, order.Gold) : key;

                int col = i / 5; // 0=왼쪽, 1=오른쪽
                int row = i % 5;
                float x = col == 0 ? -230f : 230f;
                float y = -150f - row * 100f;
                RealmUiKit.NewButton(_orderPanel.transform, label, new Vector2(0.5f, 1f), new Vector2(x, y),
                    new Vector2(420f, 84f), () => ChooseOrder(key));
            }

            RealmUiKit.NewButton(_orderPanel.transform, RealmLocalization.T("settings.close"), new Vector2(0.5f, 0f), new Vector2(0f, 40f),
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

            RealmUiKit.NewText(_cityPanel.transform, RealmLocalization.T("panel.city_title"), new Vector2(0.5f, 1f), new Vector2(0f, -60f),
                new Vector2(500f, 60f), 30);

            var root = new GameObject("CityButtons", typeof(RectTransform));
            root.transform.SetParent(_cityPanel.transform, false);
            var rootRect = (RectTransform)root.transform;
            rootRect.anchorMin = Vector2.zero;
            rootRect.anchorMax = Vector2.one;
            rootRect.sizeDelta = Vector2.zero;
            rootRect.anchoredPosition = Vector2.zero;
            _cityButtonsRoot = root.transform;

            RealmUiKit.NewButton(_cityPanel.transform, RealmLocalization.T("settings.close"), new Vector2(0.5f, 0f), new Vector2(0f, 30f),
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

            RealmUiKit.NewText(_plotPanel.transform, RealmLocalization.T("panel.plot_title"), new Vector2(0.5f, 1f), new Vector2(0f, -60f),
                new Vector2(600f, 60f), 30);

            var root = new GameObject("PlotButtons", typeof(RectTransform));
            root.transform.SetParent(_plotPanel.transform, false);
            var rootRect = (RectTransform)root.transform;
            rootRect.anchorMin = Vector2.zero;
            rootRect.anchorMax = Vector2.one;
            rootRect.sizeDelta = Vector2.zero;
            rootRect.anchoredPosition = Vector2.zero;
            _plotButtonsRoot = root.transform;

            RealmUiKit.NewButton(_plotPanel.transform, RealmLocalization.T("settings.close"), new Vector2(0.5f, 0f), new Vector2(0f, 40f),
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
                string chanceText = chance > 0f ? $"{Mathf.RoundToInt(chance * 100f)}%" : RealmLocalization.T("plot.no_officer", "무장 없음");
                string label = string.Format(RealmLocalization.T("ui.plot_label", "{0} {1} ({2}냥, 성공률 {3})"), plot.Emoji, plot.Name, plot.Gold, chanceText);
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
            RealmUiKit.NewText(_quizPanel.transform, RealmLocalization.T("command.quiz"), new Vector2(0.5f, 1f), new Vector2(0f, -50f),
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

            RealmUiKit.NewButton(_quizPanel.transform, RealmLocalization.T("settings.close"), new Vector2(0.5f, 1f), new Vector2(0f, -740f),
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
            _quizProgressText.text = string.Format(
                RealmLocalization.T("quiz.progress", "학습 {0}/{1} · 정답 {2}/{3} · 연속 {4}(최고 {5})"),
                progress.Learned, progress.Total, progress.Correct, progress.Answered, progress.Streak, progress.BestStreak);

            var drawn = RealmQuizState.Draw();
            _currentQuiz = drawn;
            if (drawn == null)
            {
                _quizQuestionText.text = RealmLocalization.T("quiz.none_left", "낼 문제가 없다.");
                return;
            }
            var p = drawn.Value;
            _quizQuestionText.text = string.Format(RealmLocalization.T("quiz.header", "[{0} · Lv{1}{2}]\n{3}"),
                RealmQuizData.CatName(p.Cat), p.Lv, p.Review ? RealmLocalization.T("quiz.review_suffix", " · 복습") : "", p.Q);

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
                ? string.Format(RealmLocalization.T("quiz.correct", "⭕ 정답! {0}"), result.Why)
                    + (result.Gold > 0 ? string.Format(RealmLocalization.T("quiz.correct_gold_suffix", " (+{0}냥)"), result.Gold) : "")
                : string.Format(RealmLocalization.T("quiz.wrong", "❌ 오답 — 정답은 \"{0}\". {1}"), result.AnswerText, result.Why);
            RealmToast.Instance?.Show(msg, 7f);
            PlayOutcomeSfx(result.Ok);
            RefreshQuizPanel();
        }

        /// <summary>명령/문답/공격/계략 네 결과 처리가 공통으로 쓰는
        /// confirm/error 재생 (`RealmAudio.cs` 클래스 주석 참고).</summary>
        private void PlayOutcomeSfx(bool ok) => RealmAudio.PlaySfx(ok ? confirmClip : errorClip);

        private void CloseAllPanels()
        {
            _orderPanel.SetActive(false);
            _cityPanel.SetActive(false);
            _plotPanel.SetActive(false);
            _quizPanel.SetActive(false);
            _archivePanel.SetActive(false);
            _settingsPanel.SetActive(false);
        }

        /// <summary>서고(godot REALM 10절) — 익힌 문제를 최근 순으로 다시
        /// 본다(RealmQuizState.LearnedList). 계략 패널과 같은 결로 열 때마다
        /// 다시 짓는다(문답 도중 새로 익힌 게 있을 수 있으니).</summary>
        private void BuildArchivePanel(Transform parent)
        {
            _archivePanel = RealmUiKit.NewPanel(parent, new Vector2(0.5f, 0.5f), new Vector2(760f, 800f),
                new Color(0f, 0f, 0f, 0.82f));
            _archivePanel.SetActive(false);

            RealmUiKit.NewText(_archivePanel.transform, RealmLocalization.T("panel.archive_title"), new Vector2(0.5f, 1f), new Vector2(0f, -50f),
                new Vector2(680f, 50f), 28);

            var root = new GameObject("ArchiveButtons", typeof(RectTransform));
            root.transform.SetParent(_archivePanel.transform, false);
            var rootRect = (RectTransform)root.transform;
            rootRect.anchorMin = Vector2.zero;
            rootRect.anchorMax = Vector2.one;
            rootRect.sizeDelta = Vector2.zero;
            rootRect.anchoredPosition = Vector2.zero;
            _archiveButtonsRoot = root.transform;

            RealmUiKit.NewButton(_archivePanel.transform, RealmLocalization.T("settings.close"), new Vector2(0.5f, 1f), new Vector2(0f, -740f),
                new Vector2(300f, 70f), () => _archivePanel.SetActive(false));
        }

        private void RefreshArchivePanel()
        {
            for (int i = _archiveButtonsRoot.childCount - 1; i >= 0; i--)
            {
                Destroy(_archiveButtonsRoot.GetChild(i).gameObject);
            }

            var list = RealmQuizState.LearnedList();
            if (list.Count == 0)
            {
                RealmUiKit.NewText(_archiveButtonsRoot, RealmLocalization.T("archive.empty", "아직 익힌 문제가 없다."), new Vector2(0.5f, 1f), new Vector2(0f, -120f),
                    new Vector2(660f, 60f), 24);
                return;
            }

            float y = -110f;
            foreach (var entry in list)
            {
                string label = string.Format(RealmLocalization.T("archive.entry_label", "[{0}] {1}"), RealmQuizData.CatName(entry.Cat), RealmQuizData.ShortQ(entry.Q));
                var captured = entry;
                RealmUiKit.NewButton(_archiveButtonsRoot, label, new Vector2(0.5f, 1f), new Vector2(0f, y),
                    new Vector2(680f, 60f), () => ShowArchiveEntry(captured));
                y -= 68f;
                if (y < -700f) break; // 패널이 스크롤 없이 이 높이까진 담는다.
            }
        }

        private void ShowArchiveEntry(RealmQuizState.LearnedEntry entry)
        {
            RealmToast.Instance?.Show(string.Format(RealmLocalization.T("archive.detail", "[{0} · Lv{1}]\n{2}\n정답: {3}\n{4}"),
                RealmQuizData.CatName(entry.Cat), entry.Lv, entry.Q, entry.AnswerText, entry.Why), 8f);
        }

        /// <summary>설정(PLAN.md 67~69장 "접근성") — 효과음·진동·UI 크기·
        /// 그래픽 품질. 계략 패널처럼 매번 다시 짓지 않고, 한 번 지은 뒤
        /// 버튼 안 Text만 갱신한다(값이 네 개뿐이라 다시 지을 이유가 없다).</summary>
        private void BuildSettingsPanel(Transform parent)
        {
            _settingsPanel = RealmUiKit.NewPanel(parent, new Vector2(0.5f, 0.5f), new Vector2(680f, 820f),
                new Color(0f, 0f, 0f, 0.8f));
            _settingsPanel.SetActive(false);

            _settingsTitleLabel = RealmUiKit.NewText(_settingsPanel.transform, RealmLocalization.T("settings.title"),
                new Vector2(0.5f, 1f), new Vector2(0f, -60f), new Vector2(500f, 60f), 32);

            (_settingsSfxNameLabel, _settingsSfxLabel) = MakeSettingsRow(-160f, "settings.sfx", ChooseSfx);
            (_settingsVibrationNameLabel, _settingsVibrationLabel) = MakeSettingsRow(-260f, "settings.vibration", ChooseVibration);
            (_settingsUiScaleNameLabel, _settingsUiScaleLabel) = MakeSettingsRow(-360f, "settings.ui_scale", ChooseUiScale);
            (_settingsQualityNameLabel, _settingsQualityLabel) = MakeSettingsRow(-460f, "settings.graphics_quality", ChooseGraphicsQuality);
            (_settingsLanguageNameLabel, _settingsLanguageLabel) = MakeSettingsRow(-560f, "settings.language", ChooseLanguage);
            (_settingsBgmNameLabel, _settingsBgmLabel) = MakeSettingsRow(-660f, "settings.bgm", ChooseBgm);

            var closeButton = RealmUiKit.NewButton(_settingsPanel.transform, RealmLocalization.T("settings.close"),
                new Vector2(0.5f, 0f), new Vector2(0f, 40f), new Vector2(300f, 70f), () => _settingsPanel.SetActive(false));
            _settingsCloseLabel = closeButton.GetComponentInChildren<Text>();

            RefreshSettingsPanel();
        }

        private (Text name, Text value) MakeSettingsRow(float y, string nameKey, UnityEngine.Events.UnityAction onClick)
        {
            var name = RealmUiKit.NewText(_settingsPanel.transform, RealmLocalization.T(nameKey), new Vector2(0f, 1f),
                new Vector2(60f, y), new Vector2(260f, 70f), 26);
            name.alignment = TextAnchor.MiddleLeft;
            var button = RealmUiKit.NewButton(_settingsPanel.transform, "", new Vector2(1f, 1f), new Vector2(-60f, y),
                new Vector2(260f, 70f), onClick);
            return (name, button.GetComponentInChildren<Text>());
        }

        private void ChooseSfx() { RealmSettingsState.SfxOn = !RealmSettingsState.SfxOn; RefreshSettingsPanel(); }
        private void ChooseVibration() { RealmSettingsState.VibrationOn = !RealmSettingsState.VibrationOn; RefreshSettingsPanel(); }
        private void ChooseUiScale() { RealmSettingsState.CycleUiScale(); RefreshSettingsPanel(); }
        private void ChooseGraphicsQuality() { RealmSettingsState.CycleGraphicsQuality(); RefreshSettingsPanel(); }
        private void ChooseLanguage() { RealmLocalization.CycleLanguage(); RefreshSettingsPanel(); }
        private void ChooseBgm() { RealmSettingsState.BgmOn = !RealmSettingsState.BgmOn; RefreshSettingsPanel(); }

        private void RefreshSettingsPanel()
        {
            if (_settingsSfxLabel == null) return;

            _settingsToggleLabel.text = RealmLocalization.T("settings.title");
            _settingsTitleLabel.text = RealmLocalization.T("settings.title");
            _settingsCloseLabel.text = RealmLocalization.T("settings.close");
            _settingsSfxNameLabel.text = RealmLocalization.T("settings.sfx");
            _settingsVibrationNameLabel.text = RealmLocalization.T("settings.vibration");
            _settingsUiScaleNameLabel.text = RealmLocalization.T("settings.ui_scale");
            _settingsQualityNameLabel.text = RealmLocalization.T("settings.graphics_quality");
            _settingsLanguageNameLabel.text = RealmLocalization.T("settings.language");
            _settingsBgmNameLabel.text = RealmLocalization.T("settings.bgm");

            _settingsSfxLabel.text = RealmLocalization.T(RealmSettingsState.SfxOn ? "state.on" : "state.off");
            _settingsVibrationLabel.text = RealmLocalization.T(RealmSettingsState.VibrationOn ? "state.on" : "state.off");
            _settingsUiScaleLabel.text = RealmSettingsState.UiScaleLabel();
            _settingsQualityLabel.text = RealmSettingsState.GraphicsQualityLabel();
            _settingsLanguageLabel.text = RealmLocalization.LanguageLabel();
            _settingsBgmLabel.text = RealmLocalization.T(RealmSettingsState.BgmOn ? "state.on" : "state.off");
        }

        private void ToggleSettingsPanel()
        {
            bool open = !_settingsPanel.activeSelf;
            CloseAllPanels();
            _settingsPanel.SetActive(open);
        }

        private void ToggleOrderPanel()
        {
            bool open = !_orderPanel.activeSelf;
            CloseAllPanels();
            _orderPanel.SetActive(open);
        }

        private void ToggleCityPanel()
        {
            bool open = !_cityPanel.activeSelf;
            CloseAllPanels();
            _cityPanel.SetActive(open);
            if (open) RefreshCityPanel();
        }

        private void TogglePlotPanel()
        {
            bool open = !_plotPanel.activeSelf;
            CloseAllPanels();
            _plotPanel.SetActive(open);
            if (open) RefreshPlotPanel();
        }

        private void ToggleQuizPanel()
        {
            bool open = !_quizPanel.activeSelf;
            CloseAllPanels();
            _quizPanel.SetActive(open);
            if (open) RefreshQuizPanel();
        }

        private void ToggleArchivePanel()
        {
            bool open = !_archivePanel.activeSelf;
            CloseAllPanels();
            _archivePanel.SetActive(open);
            if (open) RefreshArchivePanel();
        }

        /// <summary>월드맵을 열 때는 명령 계열 패널이 지도 위에 뜨는 게
        /// 어색해 미리 닫는다 — 닫는 쪽(지도→디오라마)은 패널과 무관해
        /// 그냥 토글만.</summary>
        private void ToggleMap()
        {
            if (!RealmMapState.ViewingMap) CloseAllPanels();
            RealmMapState.Toggle();
        }

        private void ChooseOrder(string key)
        {
            var result = RealmCityState.ExecuteOrder(key);
            RealmToast.Instance?.Show(result.Message, 5f);
            PlayOutcomeSfx(result.Ok);
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
            // 출진 자체가 무효면 error, 유효하면 전투 결과(승/패)로 고른다
            // (Won은 Ok=true일 때만 뜻이 있다 — RealmWarState.AttackResult 참고).
            PlayOutcomeSfx(result.Won);
        }

        private void ChoosePlot(string key)
        {
            var result = RealmWarState.Plot(key, RealmCityState.CurrentCity);
            RealmToast.Instance?.Show(result.Message, 6f);
            PlayOutcomeSfx(result.Ok);
            if (result.Ok) _plotPanel.SetActive(false);
        }
    }
}
