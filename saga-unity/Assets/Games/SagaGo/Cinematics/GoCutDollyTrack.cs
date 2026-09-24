using UnityEngine;
using UnityEngine.Playables;
using UnityEngine.Timeline;

namespace Saga.Go.Cinematics
{
    /// <summary>PLAN.md 106-9(DUNGEON 106-3 판별 복사) — 가상 카메라 하나(`GoCutDolly`)를 클립 진행도대로 민다.</summary>
    [TrackColor(0.35f, 0.6f, 0.9f)]
    [TrackClipType(typeof(GoCutDollyClip))]
    [TrackBindingType(typeof(GoCutDolly))]
    public class GoCutDollyTrack : TrackAsset
    {
        public override Playable CreateTrackMixer(PlayableGraph graph, GameObject go, int inputCount)
            => ScriptPlayable<GoCutDollyMixer>.Create(graph, inputCount);
    }

    public class GoCutDollyMixer : PlayableBehaviour
    {
        public override void ProcessFrame(Playable playable, FrameData info, object playerData)
        {
            var dolly = playerData as GoCutDolly;
            if (dolly == null) return;
            for (int i = 0; i < playable.GetInputCount(); i++)
            {
                if (playable.GetInputWeight(i) <= 0f) continue;
                var input = playable.GetInput(i);
                double duration = input.GetDuration();
                dolly.Apply(duration > 0.0 ? (float)(input.GetTime() / duration) : 1f);
                return;
            }
        }
    }
}
