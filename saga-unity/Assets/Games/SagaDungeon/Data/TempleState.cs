using System;

namespace Saga.Dungeon.Data
{
    /// <summary>PLAN.md 106-2 "잊힌 능묘" 진행 비트 — 세이브 v9 `templeFlags` 에 int 로 들어간다.
    /// **비트 순서는 바꾸지 않는다**(세이브 호환). 새 비트는 끝에만 붙인다.</summary>
    [Flags]
    public enum TempleFlag
    {
        None = 0,
        Visited = 1 << 0,
        KeyChest = 1 << 1,      // 시련의 방 상자(작은 열쇠) 열림
        SmallDoor = 1 << 2,     // 입구 홀 북쪽 잠긴 문 열림
        BlockSolved = 1 << 3,   // 벽력탄 방 블록이 발판 위
        BombChest = 1 << 4,     // 벽력탄 상자 열림 = 벽력탄 보유
        CrackedWall = 1 << 5,   // 보스 열쇠 방 앞 금 간 벽 부서짐
        BossKeyChest = 1 << 6,  // 큰 상자 열림 = 보스 열쇠 보유
        BossDoor = 1 << 7,      // 보스 문 열림(보스 열쇠 소비)
        BossDefeated = 1 << 8,  // 능묘지기 쓰러뜨림
    }

    /// <summary>
    /// PLAN.md 106-2 — 젤다식 던전 하나의 상태(작은 열쇠 수 + 진행 비트). 문·벽·상자·
    /// 블록·능묘지기는 `Changed` 를 듣고 자기 모습을 다시 입는다 — `Restore()`도
    /// 반드시 `Changed` 를 쏜다(PROJECT_STATE "정적 상태의 Restore()가 이벤트를 쏴야").
    /// </summary>
    public static class TempleState
    {
        public static int SmallKeys { get; private set; }
        public static TempleFlag Flags { get; private set; }

        public static event Action Changed;

        public static bool Has(TempleFlag flag) => flag != TempleFlag.None && (Flags & flag) == flag;
        public static bool HasBombs => Has(TempleFlag.BombChest);
        public static bool HasBossKey => Has(TempleFlag.BossKeyChest) && !Has(TempleFlag.BossDoor);

        public static void Set(TempleFlag flag)
        {
            if (flag == TempleFlag.None || Has(flag)) return;
            Flags |= flag;
            Changed?.Invoke();
        }

        public static void AddSmallKey()
        {
            SmallKeys++;
            Changed?.Invoke();
        }

        public static bool TryUseSmallKey()
        {
            if (SmallKeys <= 0) return false;
            SmallKeys--;
            Changed?.Invoke();
            return true;
        }

        public static void Restore(int smallKeys, int flags)
        {
            SmallKeys = Math.Max(0, smallKeys);
            Flags = (TempleFlag)flags;
            Changed?.Invoke();
        }

        /// <summary>HUD 한 줄 — 능묘에 한 번이라도 들어간 뒤에만(아니면 빈 문자열).</summary>
        public static string HudLine()
        {
            if (!Has(TempleFlag.Visited)) return string.Empty;
            string line = string.Format(DungeonLocalization.T("hud.temple_keys", "🗝 열쇠 {0}"), SmallKeys);
            if (HasBossKey) line += DungeonLocalization.T("hud.temple_bosskey", " · 보스 열쇠");
            if (HasBombs) line += DungeonLocalization.T("hud.temple_bombs", " · 벽력탄(R)");
            if (Has(TempleFlag.BossDefeated)) line += DungeonLocalization.T("hud.temple_cleared", " · 능묘 정복");
            return line;
        }
    }
}
