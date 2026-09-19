using UnityEngine;

namespace Saga.Forest.World
{
    /// <summary>
    /// PLAN.md 101-2 5.8① "대상 흔들림(나무 0.25s 스프링)" — 채집 자리·
    /// 나무의 기존 `Visual` 자식에 얹는 일회성 스케일 범프. 반 주기 사인
    /// 곡선으로 커졌다 원래 크기로 돌아온 뒤 스스로 컴포넌트를 뗀다
    /// (`HitSpark.cs`처럼 풀링 없이 짧은 수명에 기댄다 — 채집 쿨다운
    /// 2초가 범프 수명 0.25초보다 훨씬 길어 겹칠 일이 드물다).
    /// </summary>
    public class ForestGatherBump : MonoBehaviour
    {
        private const float DurationSec = 0.25f;
        private const float Amplitude = 0.35f;

        private Vector3 _baseScale;
        private float _t;

        public static void Apply(Transform target)
        {
            if (target == null) return;
            var existing = target.GetComponent<ForestGatherBump>();
            if (existing != null)
            {
                target.localScale = existing._baseScale; // 드물게 겹치면 원래 크기로 되돌린 뒤 새로 시작.
                Destroy(existing);
            }
            var bump = target.gameObject.AddComponent<ForestGatherBump>();
            bump._baseScale = target.localScale;
        }

        private void Update()
        {
            _t += Time.deltaTime;
            float p = Mathf.Clamp01(_t / DurationSec);
            float bump = Mathf.Sin(p * Mathf.PI) * Amplitude;
            transform.localScale = _baseScale * (1f + bump);

            if (_t >= DurationSec)
            {
                transform.localScale = _baseScale;
                Destroy(this);
            }
        }
    }
}
