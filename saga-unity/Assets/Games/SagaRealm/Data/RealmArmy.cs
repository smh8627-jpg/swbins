using System.Collections.Generic;

namespace Saga.Realm.Data
{
    /// <summary>js/war.js가 부대 하나로 다루는 값 — 병력·훈련·기술·데려간
    /// 무장·사기. `RealmWar.StepRound()`가 Troops를 직접 깎는다(war.js가
    /// `atk.troops -= lossA`로 직접 고치던 것과 같은 결 — 참조 타입 필드라
    /// 그대로 옮겨진다).</summary>
    public class RealmArmy
    {
        public int Troops;
        public int Start; // ROUT(0.35) 판정 기준 — 출진 시점 병력.
        public int Train;
        public int Tech;
        public List<string> OfficerIds = new List<string>();
        public float Morale = 1f;
    }
}
