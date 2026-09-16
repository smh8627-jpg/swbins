using UnityEngine;
using Saga.Core;
using Saga.Story.Data;
using Saga.Story.World;

namespace Saga.Story.UI
{
    /// <summary>
    /// PLAN.md 101-2 "다섯 게임 × 웹 §5 후보" — STORY 네 번째 이식(GO·
    /// DUNGEON·FOREST 이식을 그대로 따른다, "UI 뼈대만" 범위). <see cref="IGoalSource"/>
    /// 세 줄 중 실제 값이 있는 것만 채운다("지금"=가장 가까운 살아있는
    /// 적, `StoryEnemy.All`(이미 있던 static 목록) 중 `!IsDead`만 걸러
    /// DUNGEON `DungeonSessionTracker.cs`와 같은 결로 찾는다. "이번 세션"=
    /// 걸은 거리·처치 — 이 판엔 GO/DUNGEON의 금도 FOREST의 과일도 없고
    /// `StoryQuestState.Kills`(사명 집계, 이미 있음)만 있어 그것을 세션
    /// 시작 대비 증가분으로 썼다), "이번 주"는 나머지 세 판과 같은 이유
    /// (⑦ 승급 3택 미이식)로 자리만 잡아 둔 문구다.
    ///
    /// 무입력 5분 또는 앱 백그라운드 전환을 세션 끝으로 보고
    /// <see cref="SessionCard"/>를 띄운다(GO·DUNGEON·FOREST와 동일).
    /// </summary>
    public class StorySessionTracker : MonoBehaviour, IGoalSource
    {
        private const float IdleSecondsForSummary = 300f;
        private const float MoveEpsilon = 0.05f;

        private Transform _player;
        private Vector3 _lastPlayerPos;
        private float _walkedMeters;
        private int _sessionStartKills;
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
            _sessionStartKills = StoryQuestState.Kills;

            // Init()으로 받은 참조도 plain private 필드라 씬 재로드 후엔
            // null이 된다(GoalBoard.cs 클래스 주석과 같은 함정, GO·DUNGEON·
            // FOREST와 같은 방어) — SessionCard 는 씬에 하나뿐이라 스스로
            // 다시 찾는다.
            if (_sessionCard == null) _sessionCard = Object.FindFirstObjectByType<SessionCard>();
        }

        private void Update()
        {
            if (_player == null) return;

            float moved = Vector3.Distance(_lastPlayerPos, _player.position);
            if (moved > MoveEpsilon)
            {
                _walkedMeters += moved;
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
            int killsGained = StoryQuestState.Kills - _sessionStartKills;
            _sessionCard.Show("이번 세션 정리",
                $"이동 {_walkedMeters:F0}m",
                $"처치 +{killsGained}",
                $"다음: {GoalLineNow()}");
        }

        public string GoalLineNow()
        {
            if (_player == null) return "-";

            StoryEnemy nearest = null;
            float nearestDist = float.MaxValue;
            foreach (var e in StoryEnemy.All)
            {
                if (e.IsDead) continue;
                float d = Vector3.Distance(_player.position, e.transform.position);
                if (d < nearestDist)
                {
                    nearestDist = d;
                    nearest = e;
                }
            }
            return nearest == null ? "가까운 적 없음" : $"가장 가까운 적까지 {nearestDist:F0}m";
        }

        public string GoalLineSession()
        {
            int killsGained = StoryQuestState.Kills - _sessionStartKills;
            return $"이동 {_walkedMeters:F0}m · 처치 +{killsGained}";
        }

        public string GoalLineWeek() => "다음 승급 이정표 준비 중(101-2 ⑦ 대기)";
    }
}
