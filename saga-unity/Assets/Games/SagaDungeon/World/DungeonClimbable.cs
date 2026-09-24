using UnityEngine;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// PLAN.md 106-5 "탐험" — 이 충돌체(또는 부모)에 붙어 있으면 플레이어가 기어오를 수 있다(담쟁이 벽 등).
    /// GO(107 ②)는 모든 가파른 면을 오르고 `NoClimb` 만 빼지만, 던전은 방·복도 벽을 넘어가면 안 되니 반대로 이것만 오른다.
    /// </summary>
    public class DungeonClimbable : MonoBehaviour
    {
    }
}
