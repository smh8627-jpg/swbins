using UnityEngine;

namespace Saga.Core
{
    /// <summary>바닥 판 하나(칸)의 지형 종류 — "water"면 래퍼(`Saga.Go.Layout.LayoutWalk`)가
    /// 다리 없는 칸을 막는다.</summary>
    public class LayoutGroundTile : MonoBehaviour
    {
        public string kind;
    }
}
