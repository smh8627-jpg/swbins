using UnityEngine;

namespace Saga.Forest.Data
{
    /// <summary>
    /// PLAN.md 101-2 5.7 FOREST "택배 사슬 — 다른 마을을 잇는 이유"
    /// (`saga-web/saga-forest/PLAN.md` 167행). 웹판은 우주기지·폐허·캠프
    /// 같은 고정 목적지 3곳을 전제하지만 이 트랙 지도엔 그런 랜드마크가
    /// 없다 — 대신 이미 있는 네 바이옴 존(<see cref="ForestBiomeData.Zones"/>)을
    /// 배달 목적지로 그대로 재사용한다(우체통은 `World/ForestDeliveryMailbox.cs`가
    /// 존마다 하나씩 짓는다). 소포 3종(보통/깨지기 쉬움/시간제한)·사슬
    /// 보너스는 원문 그대로, 보상은 이 트랙에 금 경제가 없어(`ForestState.cs`
    /// 클래스 주석) 과일로 재해석했다. "달리기 금지"는 <see cref="Player.PlayerController"/>가
    /// 매 프레임 <see cref="NotifyRunning"/>으로 보고한다.
    /// </summary>
    public static class ForestDeliveryState
    {
        public enum Kind { Normal, Fragile, Timed }

        private const float TimedLimitSec = 45f; // 웹판 "현실 5분"을 이 트랙 맵 크기(존 반경 17~45m)에 맞춰 축소.
        private const int NormalReward = 4;
        private const int RiskReward = 6; // 깨지기 쉬움·시간제한 — 위험 보상(1.5배 사슬 보너스가 정수로 딱 떨어지게 4/6으로 고름).
        private const int ChainStep = 3; // 연속 3배달마다.
        private const float ChainMultiplier = 1.5f;

        public static bool Carrying { get; private set; }
        public static Kind CurrentKind { get; private set; }
        public static int TargetIndex { get; private set; } = -1;
        public static int Chain { get; private set; }
        public static int DeliveredCount { get; private set; }

        private static float _deadline;
        private static bool _ranWhileFragile;

        /// <summary>이미 들고 있으면 false(접수대가 중복 접수를 막는다).</summary>
        public static bool TryPickup(Kind kind, int targetIndex)
        {
            if (Carrying) return false;
            Carrying = true;
            CurrentKind = kind;
            TargetIndex = targetIndex;
            _deadline = Time.time + TimedLimitSec;
            _ranWhileFragile = false;
            return true;
        }

        /// <summary>`Player/PlayerController.cs`가 매 프레임 달리는 중인지 보고한다 —
        /// 깨지기 쉬움 소포를 들고 있을 때만 실제로 값이 생긴다.</summary>
        public static void NotifyRunning(bool running)
        {
            if (running && Carrying && CurrentKind == Kind.Fragile) _ranWhileFragile = true;
        }

        public static float TimedSecondsLeft() => Mathf.Max(0f, _deadline - Time.time);

        /// <summary>목적지가 다르면 false(호출부가 안내만 하고 상태는 안 바꾼다).
        /// 맞으면 항상 true를 돌려주되 reward가 0일 수 있다(파손).</summary>
        public static bool TryDeliver(int atIndex, out int reward, out bool broke, out bool late, out bool chainBonus)
        {
            reward = 0;
            broke = CurrentKind == Kind.Fragile && _ranWhileFragile;
            late = CurrentKind == Kind.Timed && Time.time > _deadline;
            chainBonus = false;
            if (!Carrying || atIndex != TargetIndex) return false;

            if (broke)
            {
                Chain = 0;
            }
            else
            {
                int baseReward = CurrentKind == Kind.Normal ? NormalReward : RiskReward;
                if (late) baseReward = Mathf.Max(1, baseReward / 2);

                Chain++;
                chainBonus = Chain % ChainStep == 0;
                if (chainBonus) baseReward = Mathf.RoundToInt(baseReward * ChainMultiplier);

                reward = baseReward;
                DeliveredCount++;
                ForestState.AddFruit(reward);
            }

            Carrying = false;
            TargetIndex = -1;
            return true;
        }

        public static int Snapshot() => DeliveredCount;

        public static void Restore(int deliveredCount)
        {
            DeliveredCount = deliveredCount < 0 ? 0 : deliveredCount;
            Carrying = false;
            TargetIndex = -1;
            Chain = 0;
        }

        /// <summary>헤드리스 진단 전용 — 이전 검증의 접수 상태를 이어받지 않게.</summary>
        public static void ResetForTest()
        {
            Carrying = false;
            TargetIndex = -1;
            Chain = 0;
            DeliveredCount = 0;
            _ranWhileFragile = false;
        }
    }
}
