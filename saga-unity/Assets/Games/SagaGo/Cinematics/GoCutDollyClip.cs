using UnityEngine;
using UnityEngine.Playables;
using UnityEngine.Timeline;

namespace Saga.Go.Cinematics
{
    /// <summary>PLAN.md 106-9(DUNGEON 106-3 판별 복사) — `GoCutDollyTrack` 의 클립. 값은 없고, 클립 길이가 곧 달리 한 번의 길이다.</summary>
    public class GoCutDollyClip : PlayableAsset, ITimelineClipAsset
    {
        public ClipCaps clipCaps => ClipCaps.None;

        public override Playable CreatePlayable(PlayableGraph graph, GameObject owner)
            => ScriptPlayable<GoCutDollyBehaviour>.Create(graph);
    }

    public class GoCutDollyBehaviour : PlayableBehaviour
    {
    }
}
