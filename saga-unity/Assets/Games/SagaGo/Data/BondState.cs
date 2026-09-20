using System;
using System.Collections.Generic;
using UnityEngine;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 101-2 GO ⑥ "인연(因緣)" — 웹판 PLAN.md §5-⑥(하데스 관계도·
    /// 파이어 엠블렘 지원 대화·포켓몬GO 버디 참고, 파티 5명 각자 결(faction/era)
    /// 궁합까지 있는 설계)을 이 트랙에 맞춰 크게 좁혔다: <see cref="PartyState"/>
    /// 는 등용 수만 세고 개별 인물 데이터가 없고(BanditEncounter의 "산적"이
    /// 이 슬라이스의 유일한 등용 대상 — RareWolfEncounter의 늑대는 등용 대상이
    /// 아니다), faction·era 같은 궁합 축도 없다. 그래서 "결(結)" 궁합 보너스는
    /// 스코프 밖으로 빼고, 등용된 인물마다 **함께 걸은 거리 · 함께 이긴 토벌**로
    /// 오르는 인연 0~3만 옮긴다(수치는 웹판 그대로: 2/6/15km 또는 3/10/25승,
    /// +2%/등급). 인물이 늘면(<see cref="PartyState.Recruit"/> 호출마다
    /// <see cref="EnsureMember"/>) 자동으로 새 항목이 생겨 나중에 등용 대상이
    /// 늘어도 그대로 확장된다.
    /// </summary>
    public static class BondState
    {
        private const float WalkKmTier1 = 2f;
        private const float WalkKmTier2 = 6f;
        private const float WalkKmTier3 = 15f;
        private const int WinTier1 = 3;
        private const int WinTier2 = 10;
        private const int WinTier3 = 25;
        public const float AtkBonusPerLevel = 0.02f; // 웹판 "+2%/등급" 그대로.
        public const float DefBonusPerLevel = 0.02f;
        public const int MaxLevel = 3;

        private class Entry
        {
            public float WalkedM;
            public int Wins;
        }

        private static readonly Dictionary<string, Entry> Entries = new Dictionary<string, Entry>();

        /// <summary>인연이 새로 올랐을 때(id, 새 등급) — UI 토스트 훅용.</summary>
        public static event Action<string, int> LeveledUp;

        public static void EnsureMember(string id)
        {
            if (!Entries.ContainsKey(id)) Entries[id] = new Entry();
        }

        /// <summary>플레이어가 걸은 거리 전부를 등용된 인물 전원에게 똑같이 매긴다
        /// (이 슬라이스엔 "파티에서 뺀다" 같은 편성 개념이 없어 등용된 순간부터
        /// 늘 함께 걷는다).</summary>
        public static void ReportWalked(float meters)
        {
            if (meters <= 0f || Entries.Count == 0) return;
            foreach (var kv in Entries)
            {
                int before = LevelOf(kv.Value);
                kv.Value.WalkedM += meters;
                int after = LevelOf(kv.Value);
                if (after > before) LeveledUp?.Invoke(kv.Key, after);
            }
        }

        /// <summary>토벌 승리마다 등용된 인물 전원의 "함께 이긴 토벌" 수를 올린다.</summary>
        public static void ReportWin()
        {
            if (Entries.Count == 0) return;
            foreach (var kv in Entries)
            {
                int before = LevelOf(kv.Value);
                kv.Value.Wins++;
                int after = LevelOf(kv.Value);
                if (after > before) LeveledUp?.Invoke(kv.Key, after);
            }
        }

        public static int LevelFor(string id) => Entries.TryGetValue(id, out var e) ? LevelOf(e) : 0;

        private static int LevelOf(Entry e)
        {
            float km = e.WalkedM / 1000f;
            int byWalk = km >= WalkKmTier3 ? 3 : km >= WalkKmTier2 ? 2 : km >= WalkKmTier1 ? 1 : 0;
            int byWin = e.Wins >= WinTier3 ? 3 : e.Wins >= WinTier2 ? 2 : e.Wins >= WinTier1 ? 1 : 0;
            return Mathf.Max(byWalk, byWin);
        }

        /// <summary>PLAN.md 101-2 ⑦ "승급 3택"의 PerkState.AtkMultiplier와 같은
        /// 결의 배율 자리 — 등용된 전원의 등급을 더해 기본 전투력에 곱한다.</summary>
        public static float AtkMultiplier
        {
            get
            {
                float bonus = 0f;
                foreach (var kv in Entries) bonus += LevelOf(kv.Value) * AtkBonusPerLevel;
                return 1f + bonus;
            }
        }

        public static float DefMultiplier
        {
            get
            {
                float bonus = 0f;
                foreach (var kv in Entries) bonus += LevelOf(kv.Value) * DefBonusPerLevel;
                return 1f + bonus;
            }
        }

        // ---- 저장/복원 (SaveState.cs 전용, PartyState.MemberIds와 같은 순서로 짝짓는다) ----

        public static float[] SnapshotWalked(IReadOnlyList<string> memberIds)
        {
            var arr = new float[memberIds.Count];
            for (int i = 0; i < memberIds.Count; i++)
                arr[i] = Entries.TryGetValue(memberIds[i], out var e) ? e.WalkedM : 0f;
            return arr;
        }

        public static int[] SnapshotWins(IReadOnlyList<string> memberIds)
        {
            var arr = new int[memberIds.Count];
            for (int i = 0; i < memberIds.Count; i++)
                arr[i] = Entries.TryGetValue(memberIds[i], out var e) ? e.Wins : 0;
            return arr;
        }

        /// <summary>PartyState.Restore() 뒤에 부른다 — memberIds 순서와
        /// walked/wins 배열 길이가 다르면(v11 이하 파일 등) 전부 0부터 다시
        /// 시작한다(진행 손실이랄 게 없다, 인연은 다시 쌓이는 값).</summary>
        public static void Restore(IReadOnlyList<string> memberIds, float[] walked, int[] wins)
        {
            Entries.Clear();
            bool haveWalked = walked != null && walked.Length == memberIds.Count;
            bool haveWins = wins != null && wins.Length == memberIds.Count;
            for (int i = 0; i < memberIds.Count; i++)
            {
                Entries[memberIds[i]] = new Entry
                {
                    WalkedM = haveWalked ? walked[i] : 0f,
                    Wins = haveWins ? wins[i] : 0,
                };
            }
        }
    }
}
