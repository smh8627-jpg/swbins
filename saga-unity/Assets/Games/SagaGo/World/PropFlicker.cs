using UnityEngine;

namespace Saga.Go.World
{
    /// <summary>
    /// PLAN.md 108 ① 지역 소품의 불빛 — 모닥불은 잔잔히 일렁이고(펄린), 벼락 고목은 평소 희미하다가
    /// 몇 초에 한 번 번쩍 튄다(시각에서 뽑은 결정적 박자, 난수 없음).
    /// </summary>
    public class PropFlicker : MonoBehaviour
    {
        public enum Mode { Fire, Spark }

        [SerializeField] private Mode mode;
        [SerializeField] private float baseIntensity = 1f;
        private Light _light;

        public const float SparkPeriod = 5.3f;
        public const float SparkLength = 0.22f;
        public const float SparkPeak = 3.2f;

        public void Init(Mode m, float intensity)
        {
            mode = m;
            baseIntensity = intensity;
        }

        private void Awake() => _light = GetComponent<Light>();

        private void Update()
        {
            if (_light == null) return;
            _light.intensity = Intensity(mode, baseIntensity, Time.time);
        }

        public static float Intensity(Mode m, float baseIntensity, float t)
        {
            if (m == Mode.Fire) return baseIntensity * (0.82f + 0.3f * Mathf.PerlinNoise(t * 3.1f, 0.37f));
            float phase = Mathf.Repeat(t, SparkPeriod);
            if (phase > SparkLength) return baseIntensity;
            // 두 번 튀는 번쩍임(찌릿 — 찌릿)
            float k = phase < SparkLength * 0.45f ? 1f : (phase < SparkLength * 0.6f ? 0.2f : 0.7f);
            return SparkPeak * k;
        }
    }
}
