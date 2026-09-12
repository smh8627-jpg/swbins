namespace Saga.Dungeon.World
{
    /// <summary>
    /// VERTICAL_SLICE_DUNGEON.md 다음 슬라이스 후보 "바이옴 5종" — saga-dungeon
    /// 웹판 `js/field3d.js`의 `THEME_BIAS`(2026-09-06, PLAN §28-8 Phase 3)가
    /// 정의한 절차 생성 마을 다섯 성격을 그대로 옮겼다(`town:forest`·
    /// `town:ruins`·`town:swamp`·`town:mountain`·`town:shrine`, "town:"
    /// 접두 뗀 이름). **그 표는 소품 배치 가중치(나무·폐허·물 등이 얼마나
    /// 자주 나오는가)일 뿐 바닥/벽 색 수치가 따로 없다**(웹판은 이미 있는
    /// 3D 타일셋을 그대로 재사용) — 그래서 이 다섯 성격을 구분하는 색·
    /// 소품은 이 슬라이스에서 새로 잡았다(재사용할 기존 수치가 없을 때
    /// 새로 잡는 다른 조각들과 같은 원칙).
    /// </summary>
    public enum SagaBiome
    {
        None,
        Forest,
        Swamp,
        Mountain,
        Shrine,
        Ruins,
    }
}
