namespace Saga.Core
{
    /// <summary>
    /// PLAN.md 101-2 "공통 선행" A — 목표판(GoalBoard) 세 줄을 게임마다
    /// 다르게 채우기 위한 인터페이스. SagaCore→게임 단방향 의존(49장)을
    /// 지키려고 SagaCore 는 이 인터페이스만 알고, 실제 구현은 각 게임
    /// asmdef(Saga.Go.UI.GoSessionTracker 등)가 갖는다.
    /// </summary>
    public interface IGoalSource
    {
        /// <summary>지금 — 가장 가까운 상호작용(거리·이름 등, 한 줄 문구).</summary>
        string GoalLineNow();

        /// <summary>이번 세션 — 이번 플레이에서 남은 것(한 줄 문구).</summary>
        string GoalLineSession();

        /// <summary>이번 주 — 주간 사다리의 다음 단(한 줄 문구).</summary>
        string GoalLineWeek();
    }
}
