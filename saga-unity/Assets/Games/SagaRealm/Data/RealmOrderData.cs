using System.Collections.Generic;

namespace Saga.Realm.Data
{
    public enum RealmStat { Wisdom, Command, Might }

    /// <summary>
    /// VERTICAL_SLICE_REALM.md 2-3절 "나머지 다섯 마저 추가"(saga-godot
    /// REALM 참고, 개념만) — js/rtk.js ORDERS 10종 전부. gold/base/per/
    /// stat은 rtk.js 값 그대로(성과 = base + 자질×per). LocationBound —
    /// godot 2-6절의 재해석 그대로: 개발형 명령(+징병)은 그 성에 배치된
    /// 무장만, 수색·등용은 예외로 로스터 아무나(현재 조망 중인 성을
    /// 대상으로).</summary>
    public class RealmOrderData
    {
        public readonly string Key;
        public readonly string Name;
        public readonly int Gold;
        public readonly int Base;
        public readonly float Per;
        public readonly RealmStat Stat;
        public readonly bool LocationBound;

        private RealmOrderData(string key, string name, int gold, int @base, float per, RealmStat stat, bool locationBound)
        {
            Key = key;
            Name = name;
            Gold = gold;
            Base = @base;
            Per = per;
            Stat = stat;
            LocationBound = locationBound;
        }

        public static readonly Dictionary<string, RealmOrderData> Catalog = new Dictionary<string, RealmOrderData>
        {
            ["agri"] = new RealmOrderData("agri", "개간", 60, 3, 0.055f, RealmStat.Wisdom, true),
            ["comm"] = new RealmOrderData("comm", "상업", 60, 3, 0.055f, RealmStat.Wisdom, true),
            ["tech"] = new RealmOrderData("tech", "기술", 100, 2, 0.04f, RealmStat.Wisdom, true),
            ["sec"] = new RealmOrderData("sec", "치안", 40, 3, 0.05f, RealmStat.Command, true),
            ["wall"] = new RealmOrderData("wall", "축성", 120, 60, 3.2f, RealmStat.Command, true),
            ["draft"] = new RealmOrderData("draft", "징병", 200, 200, 9f, RealmStat.Command, true),
            ["train"] = new RealmOrderData("train", "훈련", 50, 3, 0.05f, RealmStat.Might, true),
            ["ships"] = new RealmOrderData("ships", "조선", 150, 4, 0.06f, RealmStat.Command, true),
            ["search"] = new RealmOrderData("search", "수색", 80, 0, 0f, RealmStat.Wisdom, false),
            ["hire"] = new RealmOrderData("hire", "등용", 150, 0, 0f, RealmStat.Wisdom, false),
        };

        /// <summary>명령 패널에 보여줄 순서 — rtk.js ORDERS 배열 순서 그대로.</summary>
        public static readonly string[] AllKeys =
        {
            "agri", "comm", "tech", "sec", "wall", "draft", "train", "ships", "search", "hire",
        };

        public static RealmOrderData Get(string key) => Catalog.TryGetValue(key, out var o) ? o : null;
    }
}
