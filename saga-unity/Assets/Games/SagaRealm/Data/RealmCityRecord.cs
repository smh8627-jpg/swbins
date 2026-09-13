namespace Saga.Realm.Data
{
    /// <summary>
    /// 성 하나의 달마다 바뀌는 값 — js/rtk.js `migrateNewCities()`가 새 성을
    /// 처음 채울 때 쓰는 기본값과 정확히 같다(tech 100·train 40·ships는
    /// 강가 성만 60에서 시작 등, 전부 0이 아니다 — 실수로 0으로 시작하면
    /// 안 된다). agri/comm/tech/sec/wall/train/ships는 명령으로 늘리고,
    /// pop/troops/food는 징병·정산이 움직인다.
    /// </summary>
    public class RealmCityRecord
    {
        public int Agri;
        public int Comm;
        public int Tech = 100;
        public int Sec = 60;
        public int Wall;
        public int Train = 40;
        public int Ships;
        public int Pop;
        public int Troops;
        public int Food;

        public static RealmCityRecord FromDef(RealmCityDef def)
        {
            return new RealmCityRecord
            {
                Agri = def.BaseAgri,
                Comm = def.BaseComm,
                Wall = def.BaseWall,
                Pop = def.BasePop,
                Ships = def.Land == RealmLand.River ? 60 : 0,
            };
        }
    }
}
