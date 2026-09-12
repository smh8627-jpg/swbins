using System.Collections;
using UnityEngine;
using UnityEngine.UI;

namespace Saga.Dungeon.UI
{
    /// <summary>
    /// VERTICAL_SLICE_DUNGEON.md — SagaGo의 UI/DialogueLabel.cs를 그대로
    /// 복사(네임스페이스만 변경) — 처치 보상 토스트(경험치·돈·무기 획득
    /// 문구)를 띄우는 데 그대로 재사용한다.
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
