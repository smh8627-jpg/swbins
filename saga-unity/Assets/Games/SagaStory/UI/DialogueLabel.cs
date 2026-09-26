using TMPro;
using System.Collections;
using UnityEngine;
using UnityEngine.UI;

namespace Saga.Story.UI
{
    /// <summary>
    /// PLAN.md 51장 "STORY 확장 — NPC" 첫 슬라이스 — GO `UI/DialogueLabel.cs`와
    /// 같은 결(다섯 판 공용 로직 복사 관례, 루트 CLAUDE.md). 지나가다 듣는
    /// 한 마디를 띄우는 화면 상단 자막. `StoryHud.cs`(사명/MP 상시 표시)와는
    /// 별개 Text — 겹쳐 쓰면 퀘스트 진행이 대사에 덮인다.
    /// </summary>
    public class DialogueLabel : MonoBehaviour
    {
        public static DialogueLabel Instance { get; private set; }

        [SerializeField] private TextMeshProUGUI label;

        private Coroutine _hideRoutine;

        private void Awake()
        {
            Instance = this;
            if (label != null)
            {
                label.gameObject.SetActive(false);
            }
        }

        public void Show(string text, float seconds)
        {
            if (label == null) return;

            label.text = text;
            label.gameObject.SetActive(true);
            if (_hideRoutine != null)
            {
                StopCoroutine(_hideRoutine);
            }
            _hideRoutine = StartCoroutine(HideAfter(seconds));
        }

        private IEnumerator HideAfter(float seconds)
        {
            yield return new WaitForSeconds(seconds);
            label.gameObject.SetActive(false);
            _hideRoutine = null;
        }
    }
}
