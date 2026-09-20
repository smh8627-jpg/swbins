using System.Collections.Generic;
using UnityEngine;

namespace Saga.Realm.Data
{
    /// <summary>
    /// PLAN.md 101-2 REALM 5-3(후반부) "설전" — 웹판 §5-3의 "외교 사절·
    /// 등용 때 3문 카드, 정답 수 0~3 → 배율 0.8/0.95/1.1/1.3"을 옮긴다.
    /// saga-godot REALM(`realm_save_state.gd` debate_draw()/debate_result())가
    /// 이미 이 수치·난도 문턱(지력 70+→3등급, 40+→2등급, 그 밖 1등급)으로
    /// 실기 승인을 받았다 — 이 트랙엔 동맹/화친(다른 세력) 자체가 없어
    /// (`RealmPlotData.cs` 클래스 주석 참고) 유일한 적용처인 "등용"(hire)
    /// 에만 건다. 학당 문답(`RealmQuizState`)의 익힘/오답/연속 상태는 안
    /// 건드린다(웹판 "문답 콘텐츠는 이 판 안에서만 도니 봉인 위반 아님"과
    /// 같은 결 — 별도로 뽑고 별도로 채점한다).
    /// </summary>
    public static class RealmDebateState
    {
        public const int Rounds = 3;

        private static readonly Dictionary<int, float> MulByCorrect = new Dictionary<int, float>
        {
            [0] = 0.8f,
            [1] = 0.95f,
            [2] = 1.1f,
            [3] = 1.3f,
        };

        /// <summary>사자의 지력으로 난도를 정해 3문 뽑는다 — quiz.js draw()와
        /// 달리 RealmQuizState._learned/_wrongs는 안 건드리는 독립 추첨.</summary>
        public static List<RealmQuizState.Presented> Draw(int wisdom)
        {
            int maxLv = wisdom >= 70 ? 3 : wisdom >= 40 ? 2 : 1;
            var pool = new List<RealmQuizQuestion>();
            foreach (var q in RealmQuizData.Bank)
            {
                if (q.Lv <= maxLv) pool.Add(q);
            }

            var result = new List<RealmQuizState.Presented>();
            if (pool.Count == 0) return result;
            for (int i = 0; i < Rounds; i++)
            {
                result.Add(Present(pool[Random.Range(0, pool.Count)]));
            }
            return result;
        }

        /// <summary>RealmQuizState.Present()와 같은 보기 셔플 로직 — 학습
        /// 상태를 안 건드리려 여기 따로 둔다(review는 의미 없어 항상 false).</summary>
        private static RealmQuizState.Presented Present(RealmQuizQuestion refQ)
        {
            var order = new List<int> { 0, 1, 2, 3 };
            for (int i = order.Count - 1; i > 0; i--)
            {
                int j = Random.Range(0, i + 1);
                (order[i], order[j]) = (order[j], order[i]);
            }
            var choices = new string[4];
            int correctIndex = 0;
            for (int i = 0; i < 4; i++)
            {
                choices[i] = refQ.Choices[order[i]];
                if (order[i] == refQ.AnswerIdx) correctIndex = i;
            }
            return new RealmQuizState.Presented(refQ.Id, refQ.Cat, refQ.Lv, refQ.Q, choices, correctIndex, review: false);
        }

        /// <summary>정답 수(0~3) → 배율. questions는 Draw()가 낸 순서 그대로,
        /// choiceIndices는 각 문제에서 고른 보기 자리(섞인 순서 기준).</summary>
        public static (int correct, float mul) Result(List<RealmQuizState.Presented> questions, List<int> choiceIndices)
        {
            int correct = 0;
            int n = Mathf.Min(questions.Count, choiceIndices.Count);
            for (int i = 0; i < n; i++)
            {
                if (choiceIndices[i] == questions[i].CorrectIndex) correct++;
            }
            float mul = MulByCorrect.TryGetValue(correct, out var m) ? m : 1f;
            return (correct, mul);
        }
    }
}
