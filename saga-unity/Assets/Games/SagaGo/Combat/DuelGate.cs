using UnityEngine;

namespace Saga.Go.Combat
{
    /// <summary>
    /// PLAN.md 107-1 "옛 결투와의 경계" — 도적·희귀 늑대·사당 시련 결투가 `Update` 첫 줄에서
    /// <see cref="Report"/> 한다. 결투 중인 프레임(과 그다음 한 프레임)엔 <see cref="Active"/> 가 참이라
    /// 들판 전투 입력·적 AI 가 멈춘다. 끝낼 때 따로 해제할 필요가 없다(보고가 끊기면 저절로 풀린다 —
    /// 이긴 사건은 Destroy 되기도 해서 해제 호출을 믿을 수 없다).
    /// </summary>
    public static class DuelGate
    {
        private static int _lastFightFrame = -10;

        public static void Report(bool fighting)
        {
            if (fighting) _lastFightFrame = Time.frameCount;
        }

        public static bool Active => Time.frameCount - _lastFightFrame <= 1;

        /// <summary>진단용 — 결투 보고를 지운다.</summary>
        public static void ResetForTest() => _lastFightFrame = -10;
    }
}
