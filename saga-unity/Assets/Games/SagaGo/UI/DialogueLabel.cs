using System.Collections;
using UnityEngine;
using UnityEngine.UI;

namespace Saga.Go.UI
{
    /// <summary>
    /// 지나가다 듣는 한 마디를 띄우는 화면 상단 자막. 누르는 대화창이 아니다
    /// — saga-godot의 npc_builder.gd _say()와 같은 감각("dialogue_label"
    /// 그룹의 첫 Label을 찾아 글자만 갈아 끼움). Unity엔 그룹이 없어
    /// 자기등록 싱글턴으로 대신한다.
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
