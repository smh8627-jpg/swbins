using System;

namespace Saga.Dungeon.Data
{
    /// <summary>
    /// VERTICAL_SLICE_DUNGEON.md — saga-dungeon 웹판(js/hero.js)의
    /// `partyPower()`(여러 영웅의 might/wisdom/command 합산)는 다중 영웅
    /// 부대 시스템 전체를 요구해 이번 슬라이스 범위 밖이다. 이 슬라이스는
    /// **단일 캐릭터**라 그 계산 결과와 같은 자릿수로 값만 새로 잡았다
    /// (`hpMaxOf()`의 `Math.max(30, round(def*3))` 하한 30, `atkOf()`의
    /// `max(4, atk/6)` 한 타 공식은 그대로 가져옴). GO의 PlayerStats.cs와
    /// 같은 자리(static, UnityEngine 안 끌어오는 순수 데이터 클래스)지만
    /// DUNGEON은 부대(PartyState) 개념이 없어 체력·공격력·돈·장비까지
    /// 이 한 클래스에 모았다.
    /// </summary>
    public static class HeroState
    {
        public const int BaseHp = 30;
        public const float BaseAtk = 30f; // atk/6 = 5, js/dungeon.js:140 한 타 공식
        private const int HpPerLevel = 6;
        private const float AtkPerLevel = 6f;
        private const int ExpBase = 20;
        private const float ExpGrowth = 1.3f;

        public static int Level { get; private set; } = 1;
        public static int Exp { get; private set; }
        public static int ExpToNext => ExpForLevel(Level);
        public static int Gold { get; private set; }
        public static int HpMax => BaseHp + (Level - 1) * HpPerLevel;
        public static int Hp { get; private set; } = BaseHp;
        public static string EquippedWeaponId { get; private set; } = "wp_start";
        public static ItemData EquippedWeapon => ItemData.Get(EquippedWeaponId);
        public static float Atk => BaseAtk + (Level - 1) * AtkPerLevel + (EquippedWeapon?.AtkBonus ?? 0f);

        /// <summary>js/dungeon.js:140 — `Math.max(4, p.atk * ... / 6)` 한 타 피해.</summary>
        public static float HitDamage => Math.Max(4f, Atk / 6f);

        public static event Action<int> LeveledUp;
        public static event Action Died;

        private static int ExpForLevel(int level) => RoundInt(ExpBase * Pow(ExpGrowth, level - 1));

        public static void AddExp(int amount)
        {
            if (amount <= 0) return;
            Exp += amount;
            while (Exp >= ExpToNext)
            {
                Exp -= ExpToNext;
                Level++;
                LeveledUp?.Invoke(Level);
            }
        }

        public static void AddGold(int amount)
        {
            if (amount > 0) Gold += amount;
        }

        public static bool TrySpendGold(int amount)
        {
            if (amount <= 0 || Gold < amount) return false;
            Gold -= amount;
            return true;
        }

        /// <summary>더 센 무기만 자동 장착 — GO Inventory.cs와 같은 결.</summary>
        public static bool EquipIfBetter(string itemId)
        {
            var item = ItemData.Get(itemId);
            if (item == null) return false;
            if (EquippedWeapon != null && EquippedWeapon.AtkBonus >= item.AtkBonus) return false;
            EquippedWeaponId = itemId;
            return true;
        }

        public static void TakeDamage(float amount)
        {
            if (amount <= 0f || Hp <= 0) return;
            Hp = Math.Max(0, Hp - RoundInt(amount));
            if (Hp <= 0) Died?.Invoke();
        }

        /// <summary>죽었다가 다시 방에 들어올 때(이번 슬라이스는 죽음 화면
        /// 없이 바로 회복 — 다음 슬라이스에서 실제 페널티를 다룬다).</summary>
        public static void FullHeal()
        {
            Hp = HpMax;
        }

        /// <summary>우물(World/DungeonWell.cs)처럼 일부만 회복 — 최대치를
        /// 넘기지 않는다.</summary>
        public static void HealBy(int amount)
        {
            if (amount <= 0 || Hp <= 0) return;
            Hp = Math.Min(HpMax, Hp + amount);
        }

        public static void Restore(int level, int exp, int hp, int gold, string weaponId)
        {
            Level = Math.Max(1, level);
            Exp = Math.Max(0, exp);
            Gold = Math.Max(0, gold);
            EquippedWeaponId = string.IsNullOrEmpty(weaponId) ? "wp_start" : weaponId;
            Hp = Math.Clamp(hp, 0, HpMax);
            if (Hp <= 0) Hp = HpMax;
        }

        private static int RoundInt(float v) => (int)Math.Round(v, MidpointRounding.AwayFromZero);
        private static float Pow(float b, float e) => (float)Math.Pow(b, e);
    }
}
