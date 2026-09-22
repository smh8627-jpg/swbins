using System;
using System.Collections.Generic;
using UnityEngine;

namespace Saga.Story.Data
{
    /// <summary>
    /// PLAN.md 101-2 STORY 5-2 1단계 — 무예 레벨과 무예 점수(SP). 웹판
    /// `saga-web/saga-story/js/job.js`(levelOf·spTotal·spSpent·canRaise·mulOf) 규칙 그대로:
    /// SP는 세이브에 따로 안 담는 **파생값**((레벨-1)×<see cref="SpPerLevel"/> − 찍은 레벨 합),
    /// 레벨 0인 무예는 못 쓴다, 힘 = 기본 + 레벨당×(lv−1). 레벨당 점수는 웹판 현재값 2
    /// (§5-2가 3→2로 낮춘 뒤의 값 — 유파 2단계를 얹을 때 다시 안 바꾸려고 처음부터 맞춘다).
    ///
    /// 무예 칸(<see cref="SlotCount"/>개)은 웹판 조작 띠처럼 **사람이 안 고르고 자동으로**
    /// 채운다 — 이 직업 무예 중 찍은 것을 표 순서대로(웹판 "윗자리부터, 같은 자리 안에선 표
    /// 순서" — 이 트랙은 아직 1차 자리뿐이라 표 순서만 남는다).
    /// </summary>
    public static class StorySkillState
    {
        public const int SpPerLevel = 2;
        public const int SlotCount = 4;

        private static readonly Dictionary<string, int> Levels = new Dictionary<string, int>();

        /// <summary>무예 레벨이 바뀔 때(찍기·로드) — 패널·무예 칸 버튼이 다시 그린다.</summary>
        public static event Action Changed;

        public static int LevelOf(string key) => key != null && Levels.TryGetValue(key, out var lv) ? lv : 0;

        public static int SpTotal => Mathf.Max(0, (StoryJobState.Level - 1) * SpPerLevel);

        public static int SpSpent
        {
            get
            {
                int sum = 0;
                foreach (var kv in Levels) sum += kv.Value;
                return sum;
            }
        }

        public static int SpLeft => Mathf.Max(0, SpTotal - SpSpent);

        /// <summary>못 올리는 이유(현지화 키), 올릴 수 있으면 null — 웹판 canRaise()와 같은 순서.</summary>
        public static string CanRaise(string key)
        {
            var sk = StorySkillData.Get(key);
            if (sk == null) return "skill.why_unknown";
            if (!StoryJobState.HasJob || sk.Job != StoryJobState.Job) return "skill.why_other_job";
            if (LevelOf(key) >= sk.Max) return "skill.why_maxed";
            if (SpLeft <= 0) return "skill.why_no_sp";
            return null;
        }

        public static bool Raise(string key)
        {
            if (CanRaise(key) != null) return false;
            Levels[key] = LevelOf(key) + 1;
            Changed?.Invoke();
            return true;
        }

        public static float MulOf(StorySkillData.Skill sk) =>
            sk.MulBase + sk.MulPerLevel * Mathf.Max(0, LevelOf(sk.Key) - 1);

        /// <summary>무예 칸 i에 놓인 무예(비었으면 null).</summary>
        public static StorySkillData.Skill SlotSkill(int slot)
        {
            if (slot < 0 || slot >= SlotCount || !StoryJobState.HasJob) return null;
            int i = 0;
            foreach (var sk in StorySkillData.All)
            {
                if (sk.Job != StoryJobState.Job || LevelOf(sk.Key) <= 0) continue;
                if (i == slot) return sk;
                i++;
            }
            return null;
        }

        public static void Snapshot(out string[] keys, out int[] levels)
        {
            var k = new List<string>();
            var l = new List<int>();
            foreach (var kv in Levels)
            {
                if (kv.Value <= 0) continue;
                k.Add(kv.Key);
                l.Add(kv.Value);
            }
            keys = k.ToArray();
            levels = l.ToArray();
        }

        /// <summary>세이브 로드·테스트 초기화. 모르는 키(데이터에서 빠진 무예)와 상한 초과는
        /// 조용히 거른다 — 옛 세이브엔 두 배열이 아예 없어(null) 빈 상태로 시작한다.</summary>
        public static void Restore(string[] keys, int[] levels)
        {
            Levels.Clear();
            if (keys != null && levels != null)
            {
                int n = Mathf.Min(keys.Length, levels.Length);
                for (int i = 0; i < n; i++)
                {
                    var sk = StorySkillData.Get(keys[i]);
                    if (sk == null || levels[i] <= 0) continue;
                    Levels[sk.Key] = Mathf.Min(levels[i], sk.Max);
                }
            }
            Changed?.Invoke();
        }
    }
}
