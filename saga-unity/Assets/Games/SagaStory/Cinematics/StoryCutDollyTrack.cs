using UnityEngine;
using UnityEngine.Playables;
using UnityEngine.Timeline;

namespace Saga.Story.Cinematics
{
    /// <summary>PLAN.md 106-8(DUNGEON 106-3 판별 복사) — 가상 카메라 하나(`StoryCutDolly`)를 클립 진행도대로 민다.</summary>
    [TrackColor(0.35f, 0.6f, 0.9f)]
    [TrackClipType(typeof(StoryCutDollyClip))]
    [TrackBindingType(typeof(StoryCutDolly))]
    public class StoryCutDollyTrack : TrackAsset
    {
        public override Playable CreateTrackMixer(PlayableGraph graph, GameObject go, int inputCount)
            => ScriptPlayable<StoryCutDollyMixer>.Create(graph, inputCount);
    }

    public class StoryCutDollyMixer : PlayableBehaviour
    {
        public override void ProcessFrame(Playable playable, FrameData info, object playerData)
        {
            var dolly = playerData as StoryCutDolly;
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
