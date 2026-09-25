using UnityEngine;
using Saga.Go.Data;

namespace Saga.Go.World
{
    /// <summary>
    /// PLAN.md 109-1b 시간 틈 잔해 — 떠 있는 미래 조각을 세로축으로 천천히 돌린다. 시각의 순수 함수(난수 없음)이고,
    /// 세로축 회전이라 기울인 조각도 꼭짓점 높이(밑면)가 변하지 않는다(지역 소품 진단의 밑면 검사 그대로).
    /// </summary>
    public class RiftSpin : MonoBehaviour
    {
        [SerializeField] private Quaternion baseRotation = Quaternion.identity;
        [SerializeField] private float phaseDeg;

        public Quaternion BaseRotation => baseRotation;

        public void Init(Quaternion rotation, float phase)
        {
            baseRotation = rotation;
            phaseDeg = phase;
        }

        public static Quaternion RotationAt(Quaternion baseRot, float phase, float t) =>
            Quaternion.AngleAxis(phase + t * GoRegionProps.RiftSpinDegPerSec, Vector3.up) * baseRot;

        private void Update() => transform.rotation = RotationAt(baseRotation, phaseDeg, Time.time);
    }
}
