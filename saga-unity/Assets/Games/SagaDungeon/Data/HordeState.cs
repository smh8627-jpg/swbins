using System;

namespace Saga.Dungeon.Data
{
    /// <summary>
    /// PLAN.md 101-2 5.5 "난입(亂入) — 15분 생존 파도". 웹판 §5.5의 세이브
    /// 스키마 `save.dungeon.horde = {best(초), runs}`를 그대로 옮긴다. 웹판
    /// "10분 이상 생존 시 부적 1"은 이 트랙엔 부적 인벤토리가 없어(5.3
    /// <see cref="SigilState"/> 클래스 주석과 같은 이유) 금 보너스로
    /// 대체했다 — <see cref="World.HordeRunner"/> 참고.
    /// </summary>
    public static class HordeState
    {
        public static int BestSurvivalSec { get; private set; }
        public static int Runs { get; private set; }

        public static void RecordRun(int survivalSec)
        {
            Runs++;
            if (survivalSec > BestSurvivalSec) BestSurvivalSec = survivalSec;
        }

        /// <summary>SaveState.cs 전용 복원.</summary>
        public static void Restore(int bestSurvivalSec, int runs)
        {
            BestSurvivalSec = Math.Max(0, bestSurvivalSec);
            Runs = Math.Max(0, runs);
        }
    }
}
