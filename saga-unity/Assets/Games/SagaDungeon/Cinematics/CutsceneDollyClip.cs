using UnityEngine;
using UnityEngine.Playables;
using UnityEngine.Timeline;

namespace Saga.Dungeon.Cinematics
{
    /// <summary>PLAN.md 106-3 — `CutsceneDollyTrack` 의 클립. 값은 없고, 클립 길이가 곧 달리 한 번의 길이다.</summary>
    public class CutsceneDollyClip : PlayableAsset, ITimelineClipAsset
    {
        public ClipCaps clipCaps => ClipCaps.None;

        public override Playable CreatePlayable(PlayableGraph graph, GameObject owner)
            => ScriptPlayable<CutsceneDollyBehaviour>.Create(graph);
    }

    public class CutsceneDollyBehaviour : PlayableBehaviour
    {
    }
}
