using System.Collections;
using UnityEngine;
using UnityEngine.UI;

namespace Saga.Forest.UI
{
    /// <summary>
    /// VERTICAL_SLICE_FOREST.md — GO/DUNGEON의 UI/DialogueLabel.cs를 그대로
    /// 복사(네임스페이스만 변경, 루트 CLAUDE.md "다섯 판은 다섯 벌 복사"
    /// 원칙) — 채집·대화 결과 토스트를 띄우는 데 그대로 재사용한다.
    /// </summary>
    public class DialogueLabel : MonoBehaviour
    {
        public static DialogueLabel Instance { get; private set; }

        [SerializeField] private Text label;

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
