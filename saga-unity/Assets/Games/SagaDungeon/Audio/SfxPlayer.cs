using System.Collections.Generic;
using UnityEngine;

namespace Saga.Dungeon.Audio
{
    /// <summary>
    /// PLAN.md(saga-dungeon 웹판) 37장 "사운드" — 이 프로젝트엔 아직
    /// 오디오 에셋 파이프라인 자체가 없다(saga-unity 전체를 훑어도
    /// AudioSource/AudioClip을 쓰는 코드가 하나도 없었다). 원작 에셋
    /// 반입 금지 원칙(루트 CLAUDE.md)상 CC0 SFX를 새로 구해 와야
    /// 정공법인데 이 세션엔 그럴 방법이 없어, 대신 같은 문서의 "그림은
    /// 코드가 그린다" 원칙을 소리에도 그대로 적용했다 — 파형을 코드로
    /// 합성한 아주 짧은 절차적 톤만 최소로 넣었다. 환경별 ambience
    /// (Forest/Ruins/Swamp — 새·바람·물)는 루프 음원이 있어야 자연스러워
    /// 순수 합성으로는 부자연스럽고 범위 밖으로 남긴다 — Combat 카테고리
    /// (hit·critical·skill·enemy death) 중 이 슬라이스가 가진 히트
    /// 종류(평타·강공격)·죽음·레벨업만 다룬다.
    /// </summary>
    public static class SfxPlayer
    {
        private const int SampleRate = 44100;

        private static AudioSource _source;
        private static readonly Dictionary<string, AudioClip> Cache = new Dictionary<string, AudioClip>();

        public static void PlayHit() => Play("hit", 520f, 0.06f, 0.5f);
        public static void PlayHeavyHit() => Play("heavy", 260f, 0.1f, 0.7f); // "critical effect" 대용 — 새 크리티컬 확률 시스템 없이 강공격 자체를 그 신호로 재사용.
        public static void PlayEnemyDeath() => Play("death", 180f, 0.22f, 0.6f, descend: true);
        public static void PlayLevelUp() => Play("levelup", 660f, 0.28f, 0.5f, ascend: true);

        private static void Play(string key, float freq, float duration, float volume, bool descend = false, bool ascend = false)
        {
            EnsureSource();
            if (_source == null) return; // AudioListener가 없는 헤드리스 등에서도 조용히 넘어간다.

            if (!Cache.TryGetValue(key, out var clip))
            {
                clip = BuildTone(freq, duration, descend, ascend);
                Cache[key] = clip;
            }
            _source.PlayOneShot(clip, volume);
        }

        private static void EnsureSource()
        {
            if (_source != null) return;
            var go = new GameObject("SfxPlayer");
            _source = go.AddComponent<AudioSource>();
            _source.playOnAwake = false;
            _source.spatialBlend = 0f; // 던전 규모가 작아 위치 기반 감쇠 없이 2D로 충분.
        }

        /// <summary>사인파 + 선형 감쇠 봉투. descend/ascend는 짧게 오르내리는
        /// 피치 스윕으로 죽음("뚝 떨어짐")·레벨업("띵 올라감") 인상을 준다.</summary>
        private static AudioClip BuildTone(float freq, float duration, bool descend, bool ascend)
        {
            int sampleCount = Mathf.Max(1, Mathf.RoundToInt(SampleRate * duration));
            var data = new float[sampleCount];

            for (int i = 0; i < sampleCount; i++)
            {
                float t = (float)i / SampleRate;
                float progress = (float)i / sampleCount;
                float f = freq;
                if (descend) f = Mathf.Lerp(freq, freq * 0.5f, progress);
                else if (ascend) f = Mathf.Lerp(freq * 0.7f, freq, progress);

                float envelope = 1f - progress; // 딱딱한 "삑" 대신 짧게 꼬리를 죽인다.
                data[i] = Mathf.Sin(2f * Mathf.PI * f * t) * envelope;
            }

            var clip = AudioClip.Create($"Sfx_{freq:0}_{duration:0.00}", sampleCount, 1, SampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }
    }
}
