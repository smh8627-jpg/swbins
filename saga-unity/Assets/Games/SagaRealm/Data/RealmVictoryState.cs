using System.Linq;
using UnityEngine;

namespace Saga.Realm.Data
{
    /// <summary>
    /// PLAN.md 101-2 5-5 "승리 조건·결과 카드" — godot REALM(`realm_save_state.gd`
    /// `check_result()`/`_closest_victory_progress()`, 2026-09-17 실기 승인)의
    /// 재해석. 웹판 saga-realm/PLAN.md §5-5 "승리 조건 다중"(패권·문화·외교·
    /// 생존 넷) 중 godot은 세력·화친 시스템이 있어 문화·외교 둘을 옮겼지만,
    /// 이 트랙은 적국이 전부 무주공산 성일 뿐(`RealmEnemyCity.cs`) 다른 세력
    /// (AI 로드)·외교·화친·순위 시스템 자체가 없다 — 패권(세력 순위)·외교
    /// (화친 유지)·생존(전용 시나리오) 셋 다 그 개념 자체가 없어 보류하고,
    /// **정복**(지금까지 판정 자체가 없던 것을 이번에 신설)과 **문화**
    /// (문답 정답 수 — godot과 같은 지표, `RealmQuizState`) 둘만 남겼다.
    ///
    /// godot과 같은 "닫힌 판"(재해석 확정, 다시 안 바꿈) — 웹판처럼
    /// victories 배열로 계속 모으는 열린 판이 아니라, 둘 중 먼저 채운
    /// 조건 하나로 그 판이 끝나고 <see cref="RealmCommandUi"/>가 이후
    /// "다음 달"을 막는다("공격"·"명령" 등은 이미 다 정복했거나 계속해도
    /// 무해해 안 막는다 — godot도 월간 버튼만 막았다).
    /// </summary>
    public static class RealmVictoryState
    {
        // godot은 문답 은행 260개 기준 정답 200을 요구했다. 이 트랙 은행은
        // 36개뿐(RealmQuizData.Bank)이라 그대로 옮기면 사실상 못 채운다 —
        // 비율(200/260≈0.77)보다는 이 트랙의 다른 문답 목표(RealmOfficerTraits
        // "학문" 야망=15)의 두 배로 잡아 "야망보다 확실히 더 깊게 판다"는
        // 뜻을 살렸다.
        public const int CultureCorrectTarget = 30;

        public enum Kind { None, Conquest, Culture }

        public static Kind Result { get; private set; } = Kind.None;
        public static bool IsOver => Result != Kind.None;

        /// <summary>결과가 막 확정된 순간(그 종류) — UI 훅용, 안 구독해도
        /// <see cref="CheckResult"/> 자체는 상태를 그대로 기록한다.</summary>
        public static event System.Action<Kind> Achieved;

        public static int CapturedCount()
        {
            int count = 0;
            foreach (var id in RealmEnemyCity.AllIds)
            {
                if (RealmCityState.ActiveCityIds.Contains(id)) count++;
            }
            return count;
        }

        public static float ConquestProgress()
        {
            int total = RealmEnemyCity.AllIds.Length;
            return total == 0 ? 0f : Mathf.Clamp01(CapturedCount() / (float)total);
        }

        public static float CultureProgress() =>
            Mathf.Clamp01(RealmQuizState.GetProgress().Correct / (float)CultureCorrectTarget);

        /// <summary>목표판 셋째 줄용 — 두 조건 중 더 가까운 쪽 이름과
        /// 진척률(0~1)을 돌려준다(godot `_closest_victory_progress()` 재해석).</summary>
        public static (string name, float progress) ClosestProgress()
        {
            float conquest = ConquestProgress();
            float culture = CultureProgress();
            return conquest >= culture
                ? (RealmLocalization.T("victory.conquest", "정복"), conquest)
                : (RealmLocalization.T("victory.culture", "문화"), culture);
        }

        /// <summary><see cref="Data.RealmCityState.Changed"/>가 울릴 때마다
        /// <c>RealmSessionTracker</c>가 부른다(<see cref="RealmOfficerTraits.CheckAmbitions"/>와
        /// 같은 자리) — 한 번 결과가 굳으면(<see cref="IsOver"/>) 다시 안 본다
        /// (닫힌 판).</summary>
        public static void CheckResult()
        {
            if (IsOver) return;

            int total = RealmEnemyCity.AllIds.Length;
            if (total > 0 && CapturedCount() >= total)
            {
                Result = Kind.Conquest;
            }
            else if (RealmQuizState.GetProgress().Correct >= CultureCorrectTarget)
            {
                Result = Kind.Culture;
            }
            else
            {
                return;
            }

            Achieved?.Invoke(Result);
        }

        // ── 저장/불러오기 ──────────────────────────────────────
        public static string SnapshotResult() => Result.ToString();

        public static void Restore(string result)
        {
            Result = !string.IsNullOrEmpty(result) && System.Enum.TryParse<Kind>(result, out var k) ? k : Kind.None;
        }
    }
}
