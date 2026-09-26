using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Saga.Dungeon.Data;

namespace Saga.Dungeon.UI
{
    /// <summary>
    /// `Saga.Story.UI.LocalizedButtonLabel`과 같은 결(2026-09-15, 같은
    /// 세션) — `BuildTestDungeonScene.BuildActionButton()`이 씬 빌드
    /// 시점 언어로 라벨을 한 번 구워 넣어서, 플레이 중 언어 전환에 공격/
    /// 강공격/회전베기/회피/저장 버튼 글자가 반응 안 하던 걸 푼다. 매
    /// 프레임 언어 문자열 하나만 비교하는 가벼운 폴링.
    ///
    /// **함정** — 참조 필드를 일반 private으로 두고 에디터 빌드 스크립트가
    /// `Init()`으로 한 번만 채우면, 씬 저장·재로드 후 Play 모드에서 전부
    /// null로 돌아온다(STORY 쪽 클래스 주석 참고, 이 세션에서 직접 밟았다).
    /// `key`/`fallback`은 `[SerializeField]`로 승격, `_text`는 Awake()에서
    /// 다시 찾는다.
    /// </summary>
    public class LocalizedButtonLabel : MonoBehaviour
    {
        [SerializeField] private string key;
        [SerializeField] private string fallback;

        private TextMeshProUGUI _text;
        private string _lastLang;

        public void Init(string locKey, string locFallback)
        {
            key = locKey;
            fallback = locFallback;
        }

        private void Awake()
        {
            _text = GetComponentInChildren<TextMeshProUGUI>();
            _lastLang = null;
        }

        private void Update()
        {
            if (_text == null || key == null) return;
            string lang = DungeonLocalization.CurrentLanguage;
            if (lang == _lastLang) return;
            _lastLang = lang;
            _text.text = DungeonLocalization.T(key, fallback);
        }
    }
}
