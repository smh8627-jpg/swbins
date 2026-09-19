using UnityEngine;

namespace Saga.Forest.Data
{
    /// <summary>
    /// PLAN.md 101-2 5.8① "채집 손맛 — 연속 채집 리듬 보너스"(웹판
    /// `saga-web/saga-forest/PLAN.md` 177행 "연속 채집 3회마다 리듬
    /// 보너스(+1 확률)", 2026-09-18 웹 구현 노트 "손짓 타이밍(8초 안에
    /// 이어 침) 기준" 그대로 옮긴다). 이 트랙엔 낚시·"손짓" 입력이 없어
    /// 채집(<see cref="World.ForestCollectSpot"/>·<see cref="World.ForestFruitTree"/>)
    /// 성공 자체를 박자로 센다. 세이브 없음(계산) — 웹판 5.8 "세이브: 없음"과
    /// 같은 결, 세션이 끝나면 리셋돼도 무방하다.
    /// </summary>
    public static class ForestGatherStreak
    {
        private const float WindowSec = 8f;
        private const int BonusEvery = 3;

        private static float _lastGatherTime = -999f;
        private static int _streak;

        /// <summary>채집이 하나 성사될 때마다 부른다 — 직전 채집이
        /// <see cref="WindowSec"/> 안이면 이어진 것으로 보고 박자를 늘리고,
        /// 아니면 1로 리셋한다. 박자가 <see cref="BonusEvery"/>의 배수가 된
        /// 순간 true(보너스 지급 신호)를 돌려준다.</summary>
        public static bool ReportGather()
        {
            float now = Time.time;
            _streak = (now - _lastGatherTime <= WindowSec) ? _streak + 1 : 1;
            _lastGatherTime = now;
            return _streak % BonusEvery == 0;
        }

        /// <summary>헤드리스 진단 전용 — 다음 검증이 이전 검증의 박자를
        /// 이어받지 않게 리셋한다.</summary>
        public static void ResetForTest()
        {
            _lastGatherTime = -999f;
            _streak = 0;
        }
    }
}
