using UnityEngine;
using UnityEngine.UI;
using Saga.Story.Data;

namespace Saga.Story.UI
{
    /// <summary>
    /// 2026-09-15 — `BuildTestStoryScene.BuildActionButton()`이 라벨을 씬
    /// 빌드 시점 언어로 한 번 구워 넣어서, 플레이 중 언어를 전환해도 모바일
    /// 액션 버튼(점프/공격/기합/기탄/횡소) 글자만 그대로 남던 걸 푼다
    /// (Localization 2차 세션이 "언어 전환 시 다시 그리는 훅부터 설계할
    /// 것"으로 남겨 둔 항목). 이벤트 배선 대신 `StoryHud.Refresh()`처럼
    /// 매 프레임 언어 문자열 하나만 비교하는 가벼운 폴링으로 간다 — 새
    /// 이벤트 인프라를 안 만들어도 된다.
    ///
    /// **함정(2026-09-15, 이 세션에서 직접 밟음)** — `Init()`을 에디터
    /// 빌드 스크립트가 딱 한 번 불러 필드를 채우는 방식으로 처음 짰다가,
    /// 일반 private 필드는 씬 저장·재로드 후 Play 모드에서 전부 기본값
    /// (null)으로 돌아와 헤드리스 Playtest가 그대로 걸렸다(`ForestPushback
    /// UI` 때 이미 한 번 겪은 것과 같은 함정, 메모리에 남아 있었는데도 또
    /// 밟았다). `_key`/`_fallback`은 `[SerializeField]`로 승격하고, `_text`는
    /// 필드로 안 들고 Awake()에서 다시 찾는다.
    /// </summary>
    public class LocalizedButtonLabel : MonoBehaviour
    {
        [SerializeField] private string key;
        [SerializeField] private string fallback;

        private Text _text;
        private string _lastLang;

        public void Init(string locKey, string locFallback)
        {
            key = locKey;
            fallback = locFallback;
        }

        private void Awake()
        {
            _text = GetComponentInChildren<Text>();
            _lastLang = null; // 첫 Update에서 한 번은 무조건 반영.
        }

        private void Update()
        {
            if (_text == null || key == null) return;
            string lang = StoryLocalization.CurrentLanguage;
            if (lang == _lastLang) return;
            _lastLang = lang;
            _text.text = StoryLocalization.T(key, fallback);
        }
    }
}
