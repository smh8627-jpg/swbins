using System.Collections.Generic;

namespace Saga.Realm.Data
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 4절 "인접 재야 무장 1~2명" + 2-5절 "재야를
    /// 성마다 나눠 묻기"(saga-godot REALM 참고, 개념만) — 수색은 이제
    /// 성마다 다른 사람을 내놓는다. 해장(kr_yisunsin)은 복양, 이도인
    /// (jp_musashi)은 진류에 묻었고, 허창(본거지, 이미 시작 무장이 있다)
    /// 엔 일부러 안 묻어 세 성을 다 둘러볼 이유를 만든다 — godot REALM이
    /// 이미 확인한 같은 배치를 그대로 썼다(게임 디자인 자료라 다시
    /// 안 고른다).
    /// </summary>
    public static class RealmOfficerPool
    {
        public const string StartingOfficerId = "sg_zhugeliang";
        public const string StartingOfficerCityId = "xuchang";

        private static readonly Dictionary<string, RealmOfficer> Catalog = new Dictionary<string, RealmOfficer>
        {
            ["sg_zhugeliang"] = new RealmOfficer("sg_zhugeliang", "현책", might: 38, wisdom: 100, command: 92, rarity: 5),
            ["kr_yisunsin"] = new RealmOfficer("kr_yisunsin", "해장", might: 92, wisdom: 98, command: 100, rarity: 5),
            ["jp_musashi"] = new RealmOfficer("jp_musashi", "이도인", might: 97, wisdom: 70, command: 60, rarity: 4),
        };

        /// <summary>성마다 수색으로 찾을 재야 후보 — 시작 무장이 있는
        /// 허창은 빈 배열.</summary>
        private static readonly Dictionary<string, string[]> HiddenByCity = new Dictionary<string, string[]>
        {
            ["xuchang"] = new string[0],
            ["chenliu"] = new[] { "jp_musashi" },
            ["puyang"] = new[] { "kr_yisunsin" },
        };

        public static RealmOfficer Get(string id) => Catalog.TryGetValue(id, out var o) ? o : null;

        public static string[] HiddenAt(string cityId) => HiddenByCity.TryGetValue(cityId, out var ids) ? ids : System.Array.Empty<string>();
    }
}
