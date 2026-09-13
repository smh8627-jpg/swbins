namespace Saga.Realm.Data
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 3절 — 첫 공격 목표. 시나리오 194에서 허창과
    /// 맞닿은 이웃 중 뭍길·평지에 부수 효과(세력 멸망·보스전·랜드마크)가
    /// 없는 평범한 소성 하나(소패, js/data-city.js 그대로: wall 3600·
    /// land plain). **병력 800은 재해석** — 원작은 troops=0에서 시작해
    /// AI가 여러 달 채우는데 이 슬라이스엔 적 AI가 없어(그대로 두면
    /// 병력 없는 성을 시시하게 이기기만 하는 자리가 된다) 우리 성 셋이
    /// 몇 달 굴러 도달할 법한 중간 규모를 정적으로 채웠다(godot REALM
    /// 3절과 같은 재해석). train/tech도 마찬가지로 새 성의 기본값
    /// (RealmCityRecord 기본값과 같은 40/100)을 그대로 썼다 — 적 경제를
    /// 따로 시뮬레이션하지 않는다.
    /// </summary>
    public class RealmEnemyRecord
    {
        public int Wall;
        public int MaxWall;
        public int Troops;
        public int Train;
        public int Tech;
        public bool Captured;
    }

    public static class RealmEnemyCity
    {
        public const string XiaopeiId = "xiaopei";
        public const string XiaopeiName = "소패";
        public const RealmLand XiaopeiLand = RealmLand.Plain;
        public const int XiaopeiBaseWall = 3600;
        public const int XiaopeiBaseTroops = 800;
        public const int XiaopeiBaseTrain = 40;
        public const int XiaopeiBaseTech = 100;

        // 소패는 허창(xuchang)과만 맞닿아 있다 — 이 슬라이스의 유일한 출진 성.
        public const string AttackFromCityId = "xuchang";

        public static RealmEnemyRecord NewXiaopei() => new RealmEnemyRecord
        {
            Wall = XiaopeiBaseWall, MaxWall = XiaopeiBaseWall,
            Troops = XiaopeiBaseTroops, Train = XiaopeiBaseTrain, Tech = XiaopeiBaseTech,
            Captured = false,
        };
    }
}
