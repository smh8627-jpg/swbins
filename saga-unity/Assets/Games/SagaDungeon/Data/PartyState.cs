using System;

namespace Saga.Dungeon.Data
{
    public enum PartyRole
    {
        Guard,  // 동행 무사 — 앞줄, 명령 "방패 도발"
        Mystic, // 동행 술사 — 뒷줄, 명령 "치유의 빛"
    }

    /// <summary>
    /// PLAN.md 106-6 "FF 확장" — 동료 명령 게이지(ATB)와 소환 게이지. FF 최신작의 "싸우면 차고, 차면 명령한다"
    /// 문법만 옮긴다: 동료는 제 판단으로 평타를 치고, 특기는 플레이어가 게이지를 써서 시킨다. 게이지는 **맞힌 횟수**로
    /// 찬다(피해량이 아니라서 레벨·장비와 상관없이 한 판의 박자가 같다). 소환 게이지는 파티 전체가 맞힌 횟수로 더
    /// 천천히 차고, 한 번 쓰면 비운다. 세이브하지 않는다(전투 한 판의 흐름 — FF 도 ATB 는 저장 안 한다).
    /// UnityEngine 을 안 끌어오는 순수 데이터(`HeroState` 와 같은 결).
    /// </summary>
    public static class PartyState
    {
        public const float AtbMax = 100f;
        public const float SummonMax = 100f;

        // 명령 게이지 — 플레이어 평타 8번 ≈ 한 칸(동료 자기 평타도 조금 보탠다).
        public const float AtbPerPlayerHit = 12f;
        public const float AtbPerPlayerHeavy = 18f;
        public const float AtbPerOwnHit = 5f;
        public const float AtbPerPerfectDodge = 25f; // 완벽 회피는 FF7R 처럼 크게 채운다.

        // 소환 게이지 — 평타만으로 약 34번(한두 무리), 명령을 쓰면 더 빨리.
        public const float SummonPerPlayerHit = 3f;
        public const float SummonPerAllyHit = 1f;
        public const float SummonPerCommand = 12f;
        public const float SummonPerPerfectDodge = 6f;

        private static readonly float[] Atb = new float[2];

        public static float Summon { get; private set; }
        public static bool SummonReady => Summon >= SummonMax;

        /// <summary>게이지가 바뀔 때마다 — `PartyHud` 가 다시 그린다.</summary>
        public static event Action Changed;

        public static float AtbOf(PartyRole role) => Atb[(int)role];
        public static bool Ready(PartyRole role) => Atb[(int)role] >= AtbMax;

        public static void AddPlayerHit(bool heavy)
        {
            float gain = heavy ? AtbPerPlayerHeavy : AtbPerPlayerHit;
            AddAtbAll(gain);
            AddSummon(SummonPerPlayerHit);
            Changed?.Invoke();
        }

        public static void AddAllyHit(PartyRole role)
        {
            AddAtb(role, AtbPerOwnHit);
            AddSummon(SummonPerAllyHit);
            Changed?.Invoke();
        }

        public static void AddPerfectDodge()
        {
            AddAtbAll(AtbPerPerfectDodge);
            AddSummon(SummonPerPerfectDodge);
            Changed?.Invoke();
        }

        /// <summary>게이지가 가득이면 비우고 true. 명령 한 번은 소환 게이지를 보탠다.</summary>
        public static bool TrySpend(PartyRole role)
        {
            int i = (int)role;
            if (Atb[i] < AtbMax) return false;
            Atb[i] = 0f;
            AddSummon(SummonPerCommand);
            Changed?.Invoke();
            return true;
        }

        public static bool TrySpendSummon()
        {
            if (Summon < SummonMax) return false;
            Summon = 0f;
            Changed?.Invoke();
            return true;
        }

        /// <summary>진단·어드민용 — 게이지를 바로 채운다.</summary>
        public static void Fill(PartyRole role)
        {
            Atb[(int)role] = AtbMax;
            Changed?.Invoke();
        }

        public static void FillSummon()
        {
            Summon = SummonMax;
            Changed?.Invoke();
        }

        public static void Reset()
        {
            Atb[0] = Atb[1] = 0f;
            Summon = 0f;
            Changed?.Invoke();
        }

        private static void AddAtbAll(float gain)
        {
            for (int i = 0; i < Atb.Length; i++) Atb[i] = Math.Min(AtbMax, Atb[i] + gain);
        }

        private static void AddAtb(PartyRole role, float gain)
        {
            int i = (int)role;
            Atb[i] = Math.Min(AtbMax, Atb[i] + gain);
        }

        private static void AddSummon(float gain) => Summon = Math.Min(SummonMax, Summon + gain);
    }
}
