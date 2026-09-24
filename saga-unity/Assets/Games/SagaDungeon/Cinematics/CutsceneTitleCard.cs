using UnityEngine;
using UnityEngine.UI;

namespace Saga.Dungeon.Cinematics
{
    /// <summary>
    /// PLAN.md 106-3 — FF 식 제목 카드 두 벌(가운데 지역명 · 왼쪽 아래 보스 이름표). 알파는
    /// `CutsceneTitleTrack` 이 매 프레임 준다. 부품은 편집기 빌드(`BuildDungeonCinematics`)가 만든다.
    /// </summary>
    public class CutsceneTitleCard : MonoBehaviour
    {
        [SerializeField] private CanvasGroup regionGroup;
        [SerializeField] private Text regionTitle;
        [SerializeField] private Text regionSub;
        [SerializeField] private CanvasGroup bossGroup;
        [SerializeField] private Text bossTitle;
        [SerializeField] private Text bossSub;

        public string ShownTitle { get; private set; } = string.Empty;
        public float ShownAlpha { get; private set; }

        // PLAN.md 106-7 — 두목 등장 컷 하나를 여러 두목이 같이 쓴다. 틀기 전에 이름을 덮어쓰고 끝나면 지운다.
        private string _overrideTitle;
        private string _overrideSub;

        public void SetOverride(string title, string sub)
        {
            _overrideTitle = title;
            _overrideSub = sub;
        }

        public void ClearOverride()
        {
            _overrideTitle = null;
            _overrideSub = null;
        }

        private void Awake() => HideAll();

        public void Show(CutsceneTitleStyle style, string title, string sub, float alpha)
        {
            if (_overrideTitle != null)
            {
                title = _overrideTitle;
                sub = _overrideSub ?? string.Empty;
            }
            bool region = style == CutsceneTitleStyle.Region;
            var group = region ? regionGroup : bossGroup;
            var other = region ? bossGroup : regionGroup;
            if (other != null) other.alpha = 0f;
            if (group == null) return;
            var t = region ? regionTitle : bossTitle;
            var s = region ? regionSub : bossSub;
            if (t != null && t.text != title) t.text = title;
            if (s != null && s.text != sub) s.text = sub;
            group.alpha = alpha;
            // 지역명은 페이드 동안 글자 간격이 살짝 좁혀지며 들어온다(FF 타이틀 느낌) — 크기로 흉내.
            if (region) group.transform.localScale = Vector3.one * Mathf.Lerp(1.06f, 1f, alpha);
            ShownTitle = title;
            ShownAlpha = alpha;
        }

        public void HideAll()
        {
            if (regionGroup != null) regionGroup.alpha = 0f;
            if (bossGroup != null) bossGroup.alpha = 0f;
            ShownTitle = string.Empty;
            ShownAlpha = 0f;
        }
    }
}
