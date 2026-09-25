using System;
using System.Collections.Generic;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 109-6b 도감 화면 — 인물마다 세 단계: <b>안 만남</b>(그림자) → <b>만남</b>(들판에서 겨루기를 한 번이라도 연 사람,
    /// `FieldHeroes.StartDuel`) → <b>등용</b>(동행 명단 = `PartyState`). 여기엔 "만남"만 적는다 — 등용은 동행 명단이 정본이고
    /// 동행이면 만난 것으로 친다. 세이브 v17 `heroesSeen`(옛 세이브는 빈 목록 = 동행만 만남).
    /// </summary>
    public static class HeroDexState
    {
        private static readonly List<string> Seen = new List<string>();
        private static readonly HashSet<string> SeenSet = new HashSet<string>();

        public static event Action Changed;

        public static bool IsRecruited(string id)
        {
            foreach (var m in PartyState.MemberIds) if (m == id) return true;
            return false;
        }

        public static bool IsSeen(string id) => SeenSet.Contains(id) || IsRecruited(id);

        /// <summary>겨루기를 연 순간 부른다. 도감에 없는 id 는 무시한다.</summary>
        public static void MarkSeen(string id)
        {
            if (!GoHeroes.TryGet(id, out _) || !SeenSet.Add(id)) return;
            Seen.Add(id);
            Changed?.Invoke();
        }

        public static List<string> Snapshot() => new List<string>(Seen);

        public static void Restore(List<string> saved)
        {
            Seen.Clear();
            SeenSet.Clear();
            if (saved != null)
                foreach (var id in saved)
                    if (GoHeroes.TryGet(id, out _) && SeenSet.Add(id)) Seen.Add(id);
            Changed?.Invoke();
        }

        public struct Count
        {
            public int Got, Seen, Total;
        }

        /// <summary>시대 하나(null 이면 전체)의 등용·만남·전체 수. 만남은 등용을 포함한다.</summary>
        public static Count CountOf(HeroEra? era)
        {
            var c = new Count();
            foreach (var h in GoHeroes.All)
            {
                if (era.HasValue && h.Era != era.Value) continue;
                c.Total++;
                if (IsRecruited(h.Id)) { c.Got++; c.Seen++; }
                else if (SeenSet.Contains(h.Id)) c.Seen++;
            }
            return c;
        }
    }
}
