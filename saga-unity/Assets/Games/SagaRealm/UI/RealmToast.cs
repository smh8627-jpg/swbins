using System.Collections;
using UnityEngine;
using UnityEngine.UI;

namespace Saga.Realm.UI
{
    /// <summary>SagaGo `UI/DialogueLabel.cs`와 같은 자기등록 싱글턴 자막 —
    /// 명령 결과·다음 달 정산 문구를 한 줄 띄운다.</summary>
    public class RealmToast : MonoBehaviour
    {
        public static RealmToast Instance { get; private set; }

        [SerializeField] private Text label;

        private Coroutine _hideRoutine;

        private void Awake()
        {
            Instance = this;
            if (label != null) label.gameObject.SetActive(false);
        }

        public void Show(string text, float seconds = 5f)
        {
            if (label == null) return;
            label.text = text;
            label.gameObject.SetActive(true);
            if (_hideRoutine != null) StopCoroutine(_hideRoutine);
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
