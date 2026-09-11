using UnityEngine;
using Saga.Go.Data;

namespace Saga.Go.World
{
    /// <summary>
    /// PLAN.md 24~27장 "동물" — 이번 조각은 Idle/Wander만(Flee/Group/
    /// Interaction은 다음에). 스폰 자리를 중심으로 걸을 수 있는 칸만 골라
    /// 걷기↔멈춤을 반복해 월드에 생명감을 준다(9~10장 "여기는 아무것도
    /// 없다는 느낌을 피한다"). 전투 대상이 아니다 — Collider가 없어
    /// 플레이어와 부딪혀도 아무 반응이 없다(부딪힘 자체가 없다).
    /// </summary>
    public class WanderingAnimal : MonoBehaviour
    {
        private const float WanderRadius = 24f;
        private const float MoveSpeed = 2.2f;
        private const float MinIdleSec = 2f;
        private const float MaxIdleSec = 5f;
        private const float ArriveDist = 0.6f;

        private Vector3 _origin;
        private Vector3 _target;
        private float _idleUntil;
        private bool _moving;

        private void Awake()
        {
            _origin = transform.position;
            _target = _origin;
            PickIdle();
        }

        private void Update()
        {
            if (!_moving)
            {
                if (Time.time >= _idleUntil) PickTarget();
                return;
            }

            Vector3 toTarget = _target - transform.position;
            toTarget.y = 0f;
            if (toTarget.sqrMagnitude <= ArriveDist * ArriveDist)
            {
                PickIdle();
                return;
            }

            Vector3 dir = toTarget.normalized;
            transform.position += dir * (MoveSpeed * Time.deltaTime);
            transform.rotation = Quaternion.LookRotation(dir);
        }

        private void PickIdle()
        {
            _moving = false;
            _idleUntil = Time.time + Random.Range(MinIdleSec, MaxIdleSec);
        }

        private void PickTarget()
        {
            // 몇 번 시도해도 걸을 수 있는 칸을 못 찾으면 이번 틱은 그냥 쉬고
            // 다음 틱에 다시 시도한다(강·산 한가운데서 스폰되는 일은 없지만
            // 배회 반경이 걸을 수 없는 칸을 스치는 경우는 있다).
            for (int tries = 0; tries < 6; tries++)
            {
                Vector2 offset = Random.insideUnitCircle * WanderRadius;
                Vector3 candidate = _origin + new Vector3(offset.x, 0f, offset.y);
                var (gx, gy) = TestMapData.WorldToGrid(candidate);
                char tile = TestMapData.TileAt(gx, gy);
                if (TestMapData.Legend.TryGetValue(tile, out var info) && info.Walkable)
                {
                    _target = new Vector3(candidate.x, transform.position.y, candidate.z);
                    _moving = true;
                    return;
                }
            }
            PickIdle();
        }
    }
}
