using UnityEngine;
using Saga.Go.Data;

namespace Saga.Go.World
{
    /// <summary>
    /// 역참 사람 하나의 오가기 — 웹 ⑱ "4.5m 를 36초 주기로 오감(시각의 순수 함수)"을 이 판 키(사람 3.4m)로:
    /// 36초 중 4초 걸어 8m 가고, 14초 서 있다, 4초 걸어 돌아와, 14초 서 있다. 걸음이 짧아 발이 덜 미끄러진다.
    /// </summary>
    public class FolkWalker : MonoBehaviour
    {
        public const float Cycle = 36f;
        public const float WalkSec = 4f;
        public const float WalkDistance = 8f;
        private const float StandSec = Cycle * 0.5f - WalkSec;

        public GoEras.FolkRole Role { get; private set; }
        public int WaypointIndex { get; private set; }
        public Vector3 Origin { get; private set; }
        public Vector3 Dir { get; private set; }
        public float Phase { get; private set; }

        private Animator _animator;
        private float _lastY;

        public void Init(GoEras.FolkRole role, int waypointIndex, Vector3 start, Vector3 dir, float phase)
        {
            Role = role;
            WaypointIndex = waypointIndex;
            Origin = start;
            Dir = dir.normalized;
            Phase = phase;
            _lastY = transform.position.y;
            transform.rotation = Quaternion.LookRotation(Dir);
        }

        public void BindAnimator() => _animator = GetComponentInChildren<Animator>();

        /// <summary>시각 t 에 출발점에서 몇 m 나가 있나(0~`WalkDistance`)·걷는 중인가·어느 쪽으로(+1 나감, -1 돌아옴).</summary>
        public static float OffsetAt(float t, out bool walking, out int sign)
        {
            t = Mathf.Repeat(t, Cycle);
            walking = false;
            sign = 1;
            if (t < WalkSec) { walking = true; return WalkDistance * t / WalkSec; }
            t -= WalkSec;
            if (t < StandSec) return WalkDistance;
            t -= StandSec;
            if (t < WalkSec) { walking = true; sign = -1; return WalkDistance * (1f - t / WalkSec); }
            return 0f;
        }

        public Vector3 FlatPosAt(float t) => Origin + Dir * OffsetAt(t + Phase, out _, out _);

        private void Update()
        {
            float off = OffsetAt(Time.time + Phase, out bool walking, out int sign);
            Vector3 p = Origin + Dir * off;
            if (walking)
            {
                p = Grounded(new Vector3(p.x, _lastY, p.z));
                _lastY = p.y;
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(Dir * sign), 0.2f);
            }
            else p.y = _lastY;
            transform.position = p;
            if (_animator != null && _animator.runtimeAnimatorController != null) _animator.SetFloat("Speed", walking ? 0.3f : 0f);
        }

        public static Vector3 Grounded(Vector3 p)
        {
            var hits = Physics.RaycastAll(new Vector3(p.x, p.y + 30f, p.z), Vector3.down, 80f, ~0, QueryTriggerInteraction.Ignore);
            float best = float.NegativeInfinity;
            foreach (var h in hits)
            {
                if (h.collider is CharacterController) continue;
                if (h.point.y > p.y + 3f) continue;
                if (h.point.y > best) best = h.point.y;
            }
            if (best > float.NegativeInfinity) p.y = best;
            return p;
        }
    }
}
