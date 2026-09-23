using UnityEngine;
using UnityEngine.Playables;
using UnityEngine.Timeline;
using Saga.Dungeon.Data;

namespace Saga.Dungeon.Cinematics
{
    /// <summary>PLAN.md 106-3 — 제목 카드(`CutsceneTitleCard`)를 클립 앞뒤 0.45초씩 페이드하며 띄운다.</summary>
    [TrackColor(0.95f, 0.8f, 0.35f)]
    [TrackClipType(typeof(CutsceneTitleClip))]
    [TrackBindingType(typeof(CutsceneTitleCard))]
    public class CutsceneTitleTrack : TrackAsset
    {
        public override Playable CreateTrackMixer(PlayableGraph graph, GameObject go, int inputCount)
            => ScriptPlayable<CutsceneTitleMixer>.Create(graph, inputCount);
    }

    public class CutsceneTitleMixer : PlayableBehaviour
    {
        private const double FadeSec = 0.45;

        private CutsceneTitleCard _card;

        public override void ProcessFrame(Playable playable, FrameData info, object playerData)
        {
            _card = playerData as CutsceneTitleCard;
            if (_card == null) return;
            for (int i = 0; i < playable.GetInputCount(); i++)
            {
                if (playable.GetInputWeight(i) <= 0f) continue;
                var input = (ScriptPlayable<CutsceneTitleBehaviour>)playable.GetInput(i);
                var b = input.GetBehaviour();
                double t = input.GetTime();
                double d = input.GetDuration();
                float alpha = (float)System.Math.Max(0.0, System.Math.Min(1.0, System.Math.Min(t / FadeSec, (d - t) / FadeSec)));
                _card.Show(b.style, DungeonLocalization.T(b.titleKey, b.titleFallback),
                    DungeonLocalization.T(b.subKey, b.subFallback), alpha);
                return;
            }
            _card.HideAll();
        }

        public override void OnPlayableDestroy(Playable playable)
        {
            if (_card != null) _card.HideAll();
        }
    }
}
