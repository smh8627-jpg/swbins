using UnityEngine;

namespace Saga.Story.Cinematics
{
    /// <summary>
    /// PLAN.md 106-8(DUNGEON 106-3 판별 복사) — 컷 전용 CinemachineCamera 에 붙는 "달리" 한 개. 두 점(from→to) 사이를
    /// 부드럽게 미끄러지며 두 시선점(lookFrom→lookTo)을 본다. `StoryCutDollyTrack` 이 클립 진행도로
    /// `Apply(t)` 를 부르고, 두목 등장처럼 자리가 매번 다른 컷은 `StoryCutscenes` 가 `Set` 으로 다시 잡는다.
    /// Cinemachine 의 스플라인 달리 대신 이걸 쓰는 건 컷마다 직선 한 줄이면 충분해서다.
    /// </summary>
    public class StoryCutDolly : MonoBehaviour
    {
        [SerializeField] private Vector3 from;
        [SerializeField] private Vector3 to;
        [SerializeField] private Vector3 lookFrom;
        [SerializeField] private Vector3 lookTo;

        public void Set(Vector3 fromPos, Vector3 toPos, Vector3 lookFromPos, Vector3 lookToPos)
        {
            from = fromPos;
            to = toPos;
            lookFrom = lookFromPos;
            lookTo = lookToPos;
            Apply(0f);
        }

        public void Apply(float t)
        {
            float k = Mathf.SmoothStep(0f, 1f, Mathf.Clamp01(t));
            Vector3 pos = Vector3.Lerp(from, to, k);
            Vector3 look = Vector3.Lerp(lookFrom, lookTo, k) - pos;
            transform.SetPositionAndRotation(pos, look.sqrMagnitude > 0.0001f ? Quaternion.LookRotation(look) : transform.rotation);
        }
    }
}
