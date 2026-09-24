using System;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 107-7 "망루 수호장" — 한 번 쓰러뜨리면 다시 서지 않는다(무리처럼 90초 뒤 되살아나지 않는다, 웹 ⑪
    /// `save.field.guards` 와 같은 결). 세이브 v15 `guardianDown`. UnityEngine 을 안 끌어오는 순수 데이터.
    /// </summary>
    public static class GuardianState
    {
        public static bool Defeated { get; private set; }

        public static event Action Changed;

        public static void MarkDefeated()
        {
            if (Defeated) return;
            Defeated = true;
            Changed?.Invoke();
        }

        public static void Restore(bool defeated)
        {
            Defeated = defeated;
            Changed?.Invoke();
        }
    }
}
