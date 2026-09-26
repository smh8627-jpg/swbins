using System.Collections;
using System.Collections.Generic;

namespace Saga.EditorTools
{
    /// <summary>
    /// `EditorApplication.update` 로 한 틱씩 미는 진단 스크립트용 — `yield return 다른IEnumerator()` 를 펼쳐 끝까지 돌린다.
    /// 2026-09-26 전엔 흐름·성능 진단이 `MoveNext()` 하나로 밀어, 중첩 대기(`WaitTitle`·`WaitGame`)가 한 틱으로 흘러
    /// 기다리지도 그 안의 검사를 하지도 않았다(PLAN 110 ⑤c 에서 발견).
    /// </summary>
    public sealed class NestedCoroutine
    {
        private readonly Stack<IEnumerator> _frames = new Stack<IEnumerator>();

        public NestedCoroutine(IEnumerator root) => _frames.Push(root);

        /// <summary>한 틱 — 더 돌 게 있으면 true.</summary>
        public bool Step()
        {
            while (_frames.Count > 0)
            {
                var top = _frames.Peek();
                if (!top.MoveNext()) { _frames.Pop(); continue; }
                if (top.Current is IEnumerator nested) { _frames.Push(nested); continue; }
                return true;
            }
            return false;
        }
    }
}
