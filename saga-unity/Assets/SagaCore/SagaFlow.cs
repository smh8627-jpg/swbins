using System;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace Saga.Core
{
    /// <summary>
    /// PLAN.md 110 ② 흐름 — 타이틀 ↔ 다섯 판. 판마다 부트스트랩이 세이브를 읽은 뒤 <see cref="Enter"/> 로 제 저장 함수를 건다.
    /// 그 뒤로는 여기가 맡는다: 타이틀로 돌아갈 때·앱이 뒤로 갈 때(폰 홈 버튼)·앱을 끌 때 **자동 저장**,
    /// Esc(PC)·뒤로 가기(안드로이드, 입력 시스템에선 Esc 와 같다)로 일시정지 메뉴(계속하기·저장·타이틀로·게임 종료).
    /// 예전엔 저장 버튼을 눌러야만 남았다. 타이틀 씬이 빌드 목록에 없으면(판 씬만 여는 헤드리스 진단) "타이틀로" 칸만 숨긴다.
    /// </summary>
    public static class SagaFlow
    {
        public const string TitleSceneName = "Title";
        public const string TitleScenePath = "Assets/Scenes/Title.unity";

        public static string CurrentGame { get; private set; }
        /// <summary>이번 실행에서 한 번이라도 들어간 판 — "새로 시작"이 메모리 상태를 되돌려야 하는지 가른다.</summary>
        public static readonly HashSet<string> EnteredThisRun = new HashSet<string>();
        public static bool TitleAvailable => SceneUtility.GetBuildIndexByScenePath(TitleScenePath) >= 0;
        /// <summary>마지막 자동 저장이 된 까닭(진단).</summary>
        public static string LastAutoSaveReason { get; private set; }

        private static Func<bool> _saver;

        public static void Enter(string game, Func<bool> saver)
        {
            CurrentGame = game;
            _saver = saver;
            EnteredThisRun.Add(game);
            SagaFlowRunner.Ensure();
        }

        public static bool SaveCurrent(string reason)
        {
            if (_saver == null) return false;
            bool ok = _saver();
            if (ok) LastAutoSaveReason = reason;
            return ok;
        }

        public static void ReturnToTitle()
        {
            SaveCurrent("title");
            Leave();
            SceneManager.LoadScene(TitleSceneName);
        }

        public static void QuitGame()
        {
            SaveCurrent("quit");
            Leave();
            Application.Quit();
        }

        private static void Leave()
        {
            CurrentGame = null;
            _saver = null;
            SagaPauseMenu.ForceClose();
        }
    }

    /// <summary>판 씬마다 하나(씬과 같이 사라진다) — 앱 일시정지·종료 자동 저장, Esc/뒤로 가기.</summary>
    public class SagaFlowRunner : MonoBehaviour
    {
        public static SagaFlowRunner Instance { get; private set; }

        public static void Ensure()
        {
            if (Instance != null) return;
            Instance = new GameObject("SagaFlowRunner").AddComponent<SagaFlowRunner>();
        }

        private void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }

        private void Update()
        {
            var kb = Keyboard.current;
            if (kb != null && kb.escapeKey.wasPressedThisFrame) SagaPauseMenu.Toggle();
        }

        private void OnApplicationPause(bool paused)
        {
            if (paused) SagaFlow.SaveCurrent("pause");
        }

        private void OnApplicationQuit() => SagaFlow.SaveCurrent("quit");
    }

    /// <summary>일시정지 메뉴 — 열린 동안 시간을 멈추고(연 때의 timeScale 로 되돌린다) 판 UI 위에 뜬다.</summary>
    public class SagaPauseMenu : MonoBehaviour
    {
        public static SagaPauseMenu Instance { get; private set; }
        public static bool IsOpen => Instance != null && Instance._root != null && Instance._root.activeSelf;

        public Button ResumeButton { get; private set; }
        public Button SaveButton { get; private set; }
        public Button TitleButton { get; private set; }
        public Button QuitButton { get; private set; }
        public string StatusText => _status != null ? _status.text : "";

        private GameObject _root;
        private TextMeshProUGUI _status;
        private float _timeScaleBefore = 1f;

        public static void Toggle()
        {
            if (IsOpen) Close();
            else Open();
        }

        public static void Open()
        {
            if (Instance == null) Instance = new GameObject("SagaPauseMenu").AddComponent<SagaPauseMenu>();
            Instance.Show();
        }

        public static void Close()
        {
            if (IsOpen) Instance.Hide();
        }

        /// <summary>씬을 떠날 때 — 시간을 되돌리고 없앤다.</summary>
        public static void ForceClose()
        {
            if (Instance == null) return;
            if (IsOpen) Time.timeScale = Instance._timeScaleBefore;
            Destroy(Instance.gameObject);
            Instance = null;
        }

        private void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }

        private void Show()
        {
            if (_root == null) Build();
            _timeScaleBefore = Time.timeScale;
            Time.timeScale = 0f;
            _status.text = "";
            TitleButton.gameObject.SetActive(SagaFlow.TitleAvailable);
            QuitButton.gameObject.SetActive(Application.platform != RuntimePlatform.IPhonePlayer);
            _root.SetActive(true);
        }

        private void Hide()
        {
            _root.SetActive(false);
            Time.timeScale = _timeScaleBefore;
        }

        private void Build()
        {
            SagaUi.EnsureEventSystem();
            var canvas = SagaUi.NewCanvas("PauseCanvas", 200, transform);
            _root = canvas.gameObject;
            var dim = SagaUi.Fill(canvas.transform, "Dim").gameObject.AddComponent<Image>();
            dim.color = new Color(0f, 0f, 0f, 0.6f);
            var center = new Vector2(0.5f, 0.5f);
            var panel = SagaUi.NewPanel(canvas.transform, "Panel", center, Vector2.zero, new Vector2(620f, 640f), SagaUi.Panel);
            SagaUi.NewText(panel.transform, "일시 정지", 52f, SagaUi.Gold, new Vector2(0.5f, 1f), new Vector2(0f, -70f), new Vector2(560f, 80f));
            var size = new Vector2(480f, 86f);
            ResumeButton = SagaUi.NewButton(panel.transform, "Resume", "계속하기", new Vector2(0.5f, 1f), new Vector2(0f, -170f), size, SagaUi.ButtonAccent);
            SaveButton = SagaUi.NewButton(panel.transform, "Save", "저장", new Vector2(0.5f, 1f), new Vector2(0f, -272f), size, SagaUi.ButtonIdle);
            TitleButton = SagaUi.NewButton(panel.transform, "Title", "타이틀로", new Vector2(0.5f, 1f), new Vector2(0f, -374f), size, SagaUi.ButtonIdle);
            QuitButton = SagaUi.NewButton(panel.transform, "Quit", "게임 종료", new Vector2(0.5f, 1f), new Vector2(0f, -476f), size, SagaUi.ButtonIdle);
            _status = SagaUi.NewText(panel.transform, "", 28f, SagaUi.InkDim, new Vector2(0.5f, 0f), new Vector2(0f, 50f), new Vector2(560f, 50f));
            ResumeButton.onClick.AddListener(Close);
            SaveButton.onClick.AddListener(OnSave);
            TitleButton.onClick.AddListener(SagaFlow.ReturnToTitle);
            QuitButton.onClick.AddListener(SagaFlow.QuitGame);
        }

        private void OnSave()
        {
            _status.text = SagaFlow.SaveCurrent("menu") ? "저장했다" : "지금은 저장할 수 없다";
        }
    }
}
