using System.Collections.Generic;

namespace Saga.Realm.Data
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 3절 "판정 로직 — 재사용, 새로 안 만든다" —
    /// js/rtk.js ORDERS 10종 중 첫 슬라이스가 쓰는 4종(개간·상업·수색·등용)
    /// 만 옮긴다. gold/base/per는 rtk.js 값 그대로(성과 = base + 자질×per,
    /// 지력(wisdom) 자질 사용 — 넷 다 rtk.js에서 stat:'wisdom'이다).
    /// 수색·등용은 base/per 공식이 없어(rtk.js도 0/0) 각각 RealmCityState가
    /// 따로 판정한다 — 여기 표는 "이름·비용"만 조회용으로 쓰인다.
    /// </summary>
    public class RealmOrderData
    {
        public readonly string Key;
        public readonly string Name;
        public readonly int Gold;
        public readonly int Base;
        public readonly float Per;

        private RealmOrderData(string key, string name, int gold, int @base, float per)
        {
            Key = key;
            Name = name;
            Gold = gold;
            Base = @base;
            Per = per;
        }

        public static readonly Dictionary<string, RealmOrderData> Catalog = new Dictionary<string, RealmOrderData>
        {
            ["agri"] = new RealmOrderData("agri", "개간", gold: 60, @base: 3, per: 0.055f),
            ["comm"] = new RealmOrderData("comm", "상업", gold: 60, @base: 3, per: 0.055f),
            ["search"] = new RealmOrderData("search", "수색", gold: 80, @base: 0, per: 0f),
            ["hire"] = new RealmOrderData("hire", "등용", gold: 150, @base: 0, per: 0f),
        };

        public static RealmOrderData Get(string key) => Catalog.TryGetValue(key, out var o) ? o : null;

        /// <summary>rtk.js 개간/상업 상한 — 허창은 land:'plain'(agriCap/commCap
        /// 배율 1.0)이라 round(900*1.0)로 고정. 다른 land의 성이 생기면
        /// 그때 배율 인자를 받게 넓힌다(지금은 성이 하나뿐이라 앞당겨
        /// 일반화하지 않는다).</summary>
        public const int DevelopCap = 900;
    }
}
