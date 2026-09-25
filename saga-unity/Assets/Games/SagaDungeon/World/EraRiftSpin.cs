using UnityEngine;
using Saga.Dungeon.Data;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// PLAN.md 109-2b 시간 틈 잔해 — 떠 있는 미래 조각을 세로축으로 천천히 돌린다. 시각의 순수 함수(난수 없음)이고,
    /// 세로축 회전이라 기울인 조각도 밑면 높이가 변하지 않는다. 명소 층 꾸밈은 방 가운데에 붙어 있어 로컬 회전으로 돌린다.
    /// </summary>
    public class EraRiftSpin : MonoBehaviour
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
            Quaternion.AngleAxis(phase + t * DungeonEraDecor.RiftSpinDegPerSec, Vector3.up) * baseRot;

        private void Update() => transform.localRotation = RotationAt(baseRotation, phaseDeg, Time.time);
    }
}
