using UnityEngine;
using UnityEngine.Playables;
using UnityEngine.Timeline;

namespace Saga.Dungeon.Cinematics
{
    public enum CutsceneTitleStyle
    {
        Region, // 화면 가운데 큰 지역명(FF "지역 도착")
        Boss,   // 왼쪽 아래 보스 이름표
    }

    /// <summary>PLAN.md 106-3 — 제목 카드 한 장. 글자는 번역 키로 들고 있다가 재생할 때 찾는다.</summary>
    public class CutsceneTitleClip : PlayableAsset, ITimelineClipAsset
    {
        public CutsceneTitleStyle style;
        public string titleKey;
        public string titleFallback;
        public string subKey;
        public string subFallback;

        public ClipCaps clipCaps => ClipCaps.None;

        public override Playable CreatePlayable(PlayableGraph graph, GameObject owner)
        {
            var playable = ScriptPlayable<CutsceneTitleBehaviour>.Create(graph);
            var b = playable.GetBehaviour();
            b.style = style;
            b.titleKey = titleKey;
            b.titleFallback = titleFallback;
            b.subKey = subKey;
            b.subFallback = subFallback;
            return playable;
        }
    }

    public class CutsceneTitleBehaviour : PlayableBehaviour
    {
        public CutsceneTitleStyle style;
        public string titleKey;
        public string titleFallback;
        public string subKey;
        public string subFallback;
    }
}
