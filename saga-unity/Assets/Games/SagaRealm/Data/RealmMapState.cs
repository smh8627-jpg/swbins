using System;

namespace Saga.Realm.Data
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 2-8절 "월드맵 첫 슬라이스" — saga-godot REALM
    /// 2-8절의 viewing_map과 같은 자리(개념만 참고, 코드는 새로). 성 디오라마와
    /// 월드맵 중 지금 어느 쪽을 보는지 하나만 담는다. **저장하지 않는다** —
    /// 세이브를 불러오면 항상 디오라마부터 보인다(godot 2-8절과 같은 결).
    /// </summary>
    public static class RealmMapState
    {
        public static bool ViewingMap { get; private set; }

        public static event Action Changed;

        public static void Toggle()
        {
            ViewingMap = !ViewingMap;
            Changed?.Invoke();
        }

        /// <summary>PlaytestRealmSlice.cs 전용 — 다음 phase로 넘어가기 전
        /// 확실히 디오라마로 되돌린다.</summary>
        public static void ForceOff()
        {
            if (!ViewingMap) return;
            ViewingMap = false;
            Changed?.Invoke();
        }
    }
}
