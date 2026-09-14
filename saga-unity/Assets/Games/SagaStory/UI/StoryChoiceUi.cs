using System;
using UnityEngine;
using UnityEngine.UI;

namespace Saga.Story.UI
{
    /// <summary>
    /// PLAN.md 51장 "STORY 확장 — 선택" — NPC/사건/관계에 이어 STORY 네 칸의
    /// 마지막 칸. `StoryNpc.cs` 클래스 주석이 적어 둔 대로 STORY엔 갈릴
    /// 결과(골드·평판 등)를 담을 시스템이 없어 **장식적 분기**로 간다 —
    /// 두 선택지 다 게임 상태를 안 바꾸고 이후 대사 어투만 갈린다
    /// (`Saga.Story.Data.StoryNpcState.ChoiceMade`). GO/DUNGEON
    /// `EncounterUiKit`과 달리 이 판에 쓰는 곳이 하나뿐이라 kit로 안 뽑고
    /// 이 파일 하나로 끝낸다.
    /// </summary>
    public class StoryChoiceUi : MonoBehaviour
    {
        public static StoryChoiceUi Instance { get; private set; }

        [SerializeField] private GameObject panel;
        [SerializeField] private Text promptLabel;
        [SerializeField] private Button optionAButton;
        [SerializeField] private Text optionALabel;
        [SerializeField] private Button optionBButton;
        [SerializeField] private Text optionBLabel;

        public bool IsShowing => panel != null && panel.activeSelf;

        private void Awake()
        {
            Instance = this;
            if (panel != null) panel.SetActive(false);
        }

        public void Show(string prompt, string optionA, string optionB, Action<int> onChosen)
        {
            if (panel == null) return;

            promptLabel.text = prompt;
            optionALabel.text = optionA;
            optionBLabel.text = optionB;

            optionAButton.onClick.RemoveAllListeners();
            optionBButton.onClick.RemoveAllListeners();
            optionAButton.onClick.AddListener(() => Choose(1, onChosen));
            optionBButton.onClick.AddListener(() => Choose(2, onChosen));

            panel.SetActive(true);
        }

        private void Choose(int option, Action<int> onChosen)
        {
            panel.SetActive(false);
            onChosen?.Invoke(option);
        }
    }
}
