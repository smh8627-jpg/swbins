using UnityEngine;
using Saga.Core;
using Saga.Go.Data;
using Saga.Go.World;

namespace Saga.Go.UI
{
    /// <summary>
    /// PLAN.md 101-2 "다섯 게임 × 웹 §5 후보" — GO 첫 이식(④ 일과판+마무리
    /// 카드). <see cref="IGoalSource"/> 세 줄: "지금"=가장 가까운 은닉
    /// 보물, "이번 세션"=<see cref="DailyTaskState"/>의 오늘의 일과 3 중
    /// 남은 것, "이번 주"=일과 도장이 쌓이는 주간 사다리(2026-09-19,
    /// 101-2 서두 결정으로 착수 — 자세한 설계 재해석 이유는
    /// DailyTaskState.cs 클래스 주석 참고).
    ///
    /// 무입력 5분 또는 앱 백그라운드 전환을 세션 끝으로 보고
    /// <see cref="SessionCard"/>를 띄운다(웹판 §5 ④의 "5분 무입력" 그대로,
    /// visibilitychange 대신 OnApplicationPause 사용 — 모바일 대응).
    /// </summary>
    public class GoSessionTracker : MonoBehaviour, IGoalSource
    {
        private const float IdleSecondsForSummary = 300f;
        private const float MoveEpsilon = 0.05f;

        private Transform _player;
        private Vector3 _lastPlayerPos;
        private float _walkedMeters;
        private float _walkedMetersSinceDailyReport; // DailyTaskState.ReportProgress는 int만 받아 정수 m 단위로만 넘긴다 — 나머지는 여기 이월.
        private int _sessionStartGold;
        private float _idleTimer;
        private bool _summaryShown;
        private SessionCard _sessionCard;

        /// <summary>Awake() 순서와 무관하게 나중에 넘겨도 된다.</summary>
        public void Init(SessionCard sessionCard)
        {
            _sessionCard = sessionCard;
        }

        private void Awake()
        {
            var playerGo = GameObject.FindWithTag("Player");
            _player = playerGo != null ? playerGo.transform : null;
            _lastPlayerPos = _player != null ? _player.position : Vector3.zero;
            _sessionStartGold = GoldState.Gold;

            // Init()으로 받은 참조도 plain private 필드라 씬 재로드 후엔
            // null이 된다(GoalBoard.cs 클래스 주석과 같은 함정) — SessionCard
            // 는 씬에 하나뿐이라 스스로 다시 찾는다.
            if (_sessionCard == null) _sessionCard = Object.FindFirstObjectByType<SessionCard>();
        }

        private void Update()
        {
            if (_player == null) return;

            float moved = Vector3.Distance(_lastPlayerPos, _player.position);
            if (moved > MoveEpsilon)
            {
                _walkedMeters += moved;
                _walkedMetersSinceDailyReport += moved;
                int wholeMeters = Mathf.FloorToInt(_walkedMetersSinceDailyReport);
                if (wholeMeters > 0)
                {
                    DailyTaskState.ReportProgress(DailyTaskState.Kind.Walk, wholeMeters);
                    _walkedMetersSinceDailyReport -= wholeMeters;
                }
                _idleTimer = 0f;
                _summaryShown = false;
            }
            else
            {
                _idleTimer += Time.unscaledDeltaTime;
            }
            _lastPlayerPos = _player.position;

            if (_idleTimer >= IdleSecondsForSummary && !_summaryShown)
            {
                _summaryShown = true;
                ShowSummary();
            }
        }

        private void OnApplicationPause(bool paused)
        {
            if (paused && !_summaryShown)
            {
                _summaryShown = true;
                ShowSummary();
            }
        }

        private void ShowSummary()
        {
            if (_sessionCard == null) return;
            int goldGained = GoldState.Gold - _sessionStartGold;
            string goldStr = goldGained >= 0 ? $"+{goldGained}" : goldGained.ToString();
            _sessionCard.Show("이번 세션 정리",
                $"이동 {_walkedMeters:F0}m",
                $"금 {goldStr}",
                $"다음: {GoalLineNow()}");
        }

        public string GoalLineNow()
        {
            var treasures = Object.FindObjectsByType<HiddenTreasure>(FindObjectsSortMode.None);
            if (treasures.Length == 0 || _player == null) return "숨은 보물을 전부 찾음";

            HiddenTreasure nearest = null;
            float nearestDist = float.MaxValue;
            foreach (var t in treasures)
            {
                float d = Vector3.Distance(_player.position, t.transform.position);
                if (d < nearestDist)
                {
                    nearestDist = d;
                    nearest = t;
                }
            }
            return nearest == null ? "-" : $"은닉 보물까지 {nearestDist:F0}m";
        }

        public string GoalLineSession() => DailyTaskState.SessionLineText();

        public string GoalLineWeek() => DailyTaskState.WeekLineText();
    }
}
