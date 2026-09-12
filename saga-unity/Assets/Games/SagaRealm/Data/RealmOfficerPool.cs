using System.Collections.Generic;

namespace Saga.Realm.Data
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 4절 "인접 재야 무장 1~2명" — 시작 무장 하나
    /// (허창 시작 세력의 군주 대행)와, 수색으로 찾아낼 재야 둘. 수치는
    /// js/data.js HEROES를 그대로 옮겼다(saga-godot REALM 착수 세션이
    /// 이미 같은 셋을 썼다 — 게임 디자인 자료라 다시 고르지 않는다,
    /// PLAN.md 4장).
    /// </summary>
    public static class RealmOfficerPool
    {
        public const string StartingOfficerId = "sg_zhugeliang";

        private static readonly Dictionary<string, RealmOfficer> Catalog = new Dictionary<string, RealmOfficer>
        {
            ["sg_zhugeliang"] = new RealmOfficer("sg_zhugeliang", "현책", might: 38, wisdom: 100, command: 92, rarity: 5),
            ["kr_yisunsin"] = new RealmOfficer("kr_yisunsin", "해장", might: 92, wisdom: 98, command: 100, rarity: 5),
            ["jp_musashi"] = new RealmOfficer("jp_musashi", "이도인", might: 97, wisdom: 70, command: 60, rarity: 4),
        };

        /// <summary>수색으로 찾을 재야 후보 — 시작 무장은 빼고 나머지 전부.</summary>
        public static readonly string[] HiddenPool = { "kr_yisunsin", "jp_musashi" };

        public static RealmOfficer Get(string id) => Catalog.TryGetValue(id, out var o) ? o : null;
    }
}
