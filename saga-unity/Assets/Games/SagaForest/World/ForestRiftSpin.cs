using UnityEngine;
using Saga.Forest.Data;

namespace Saga.Forest.World
{
    /// <summary>
    /// PLAN.md 109-4 시간 틈 잔해 — 떠 있는 미래 조각의 "Body" 를 세로축으로 천천히 돌린다(DUNGEON `EraRiftSpin` 과 같은 결, 코드는 이 판 것).
    /// 시각의 순수 함수(난수 없음)이고 세로축 회전이라 밑면 높이가 변하지 않는다. 땅 휨은 부모 "Visual" 이 따로 내린다.
    /// </summary>
    public class ForestRiftSpin : MonoBehaviour
    {
        [SerializeField] private Quaternion baseRotation = Quaternion.identity;
        [SerializeField] private float phaseDeg;

        public Quaternion BaseRotation => baseRotation;

        public void Init(Quaternion localRotation, float phase)
        {
            baseRotation = localRotation;
            phaseDeg = phase;
        }

        public static Quaternion RotationAt(Quaternion baseRot, float phase, float t) =>
            Quaternion.AngleAxis(phase + t * ForestEras.RiftSpinDegPerSec, Vector3.up) * baseRot;

        private void Update() => transform.localRotation = RotationAt(baseRotation, phaseDeg, Time.time);
    }
}
