using UnityEngine;
using Saga.Core;
using Saga.Dungeon.Data;
using Saga.Dungeon.World;

namespace Saga.Dungeon.UI
{
    /// <summary>
    /// PLAN.md 101-2 "다섯 게임 × 웹 §5 후보" — DUNGEON 두 번째 이식(GO
    /// 이식을 그대로 따른다, "UI 뼈대만" 범위). <see cref="IGoalSource"/>
    /// 세 줄 중 실제 값이 있는 것만 채운다("지금"=가장 가까운 살아있는
    /// 적, DungeonEnemy.Active 그대로 재사용 — 이 판의 핵심 루프가 GO의
    /// "숨은 보물 찾기"와 달리 근접 전투라 대상을 바꿨다. "이번 세션"=
    /// 걸은 거리·번 금, GO GoSessionTracker.cs와 완전히 같은 계산),
    /// "이번 주"는 GO와 같은 이유(⑦ 승급 3택 미이식)로 자리만 잡아 둔 문구다.
    ///
    /// 무입력 5분 또는 앱 백그라운드 전환을 세션 끝으로 보고
    /// <see cref="SessionCard"/>를 띄운다(GO와 동일).
    /// </summary>
    public class DungeonSessionTracker : MonoBehaviour, IGoalSource
    {
        private const float IdleSecondsForSummary = 300f;
        private const float MoveEpsilon = 0.05f;

        private Transform _player;
        private Vector3 _lastPlayerPos;
        private float _walkedMeters;
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
            _sessionStartGold = HeroState.Gold;

            // Init()으로 받은 참조도 plain private 필드라 씬 재로드 후엔
            // null이 된다(GoalBoard.cs 클래스 주석과 같은 함정, GO
            // GoSessionTracker.cs와 같은 방어) — SessionCard 는 씬에
            // 하나뿐이라 스스로 다시 찾는다.
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
            int goldGained = HeroState.Gold - _sessionStartGold;
            string goldStr = goldGained >= 0 ? $"+{goldGained}" : goldGained.ToString();
            _sessionCard.Show("이번 세션 정리",
                $"이동 {_walkedMeters:F0}m",
                $"금 {goldStr}",
                $"다음: {GoalLineNow()}");
        }

        public string GoalLineNow()
        {
            if (_player == null) return "-";
            var nearest = DungeonEnemy.FindNearest(_player.position, float.MaxValue);
            return nearest == null ? "가까운 적 없음" : $"가장 가까운 적까지 {Vector3.Distance(_player.position, nearest.transform.position):F0}m";
        }

        public string GoalLineSession()
        {
            int goldGained = HeroState.Gold - _sessionStartGold;
            string goldStr = goldGained >= 0 ? $"+{goldGained}" : goldGained.ToString();
            return $"이동 {_walkedMeters:F0}m · 금 {goldStr}";
        }

        public string GoalLineWeek() => "다음 승급 이정표 준비 중(101-2 ⑦ 대기)";
    }
}
