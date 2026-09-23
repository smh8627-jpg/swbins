using UnityEngine;

namespace Saga.Go.Combat
{
    public enum GoElement { Physical = 0, Pyro = 1, Hydro = 2, Electro = 3 }

    public enum GoReaction { None, Vaporize, Overload, ElectroCharged }

    /// <summary>
    /// PLAN.md 107-1 "원소 3·반응 3" — 규칙표만 모은 순수 정적 클래스(웹·Godot 사가고와
    /// 비율만 같고 코드는 따로). 물리(기본 공격)는 부착도 반응도 없다. 반응은 부착을 지운다.
    /// </summary>
    public static class GoElements
    {
        public const float AuraSec = 6f;
        public const float VaporizeMul = 1.5f;
        public const float OverloadRadius = 7f;      // GO 사람 키 3.4m 기준(Godot 4m × 약 1.85)
        public const float OverloadAtkMul = 1.0f;
        public const float OverloadKnockback = 6f;
        public const float ChargedSec = 2f;
        public const float ChargedTickSec = 0.5f;
        public const float ChargedTickAtkMul = 0.3f;
        public const float ChargedSpreadRadius = 4f;

        /// <summary>주인공의 원소 — 동료는 <see cref="ForMember"/>.</summary>
        public const GoElement HeroElement = GoElement.Pyro;

        public static GoReaction Resolve(GoElement aura, GoElement incoming)
        {
            if (aura == GoElement.Physical || incoming == GoElement.Physical || aura == incoming) return GoReaction.None;
            if (Pair(aura, incoming, GoElement.Pyro, GoElement.Hydro)) return GoReaction.Vaporize;
            if (Pair(aura, incoming, GoElement.Pyro, GoElement.Electro)) return GoReaction.Overload;
            return GoReaction.ElectroCharged; // 남은 짝은 수↔뇌뿐
        }

        private static bool Pair(GoElement a, GoElement b, GoElement x, GoElement y) =>
            (a == x && b == y) || (a == y && b == x);

        /// <summary>동료 id → 원소(화·수·뇌 중 하나로 고정). string.GetHashCode 는 런타임마다
        /// 다를 수 있어 FNV-1a 를 직접 쓴다.</summary>
        public static GoElement ForMember(string id)
        {
            if (string.IsNullOrEmpty(id)) return HeroElement;
            uint h = 2166136261;
            foreach (char c in id)
            {
                h ^= c;
                h *= 16777619;
            }
            return (GoElement)(1 + (int)(h % 3));
        }

        public static Color ColorOf(GoElement e)
        {
            switch (e)
            {
                case GoElement.Pyro: return new Color(1f, 0.45f, 0.2f);
                case GoElement.Hydro: return new Color(0.25f, 0.6f, 1f);
                case GoElement.Electro: return new Color(0.72f, 0.45f, 1f);
                default: return new Color(0.85f, 0.85f, 0.85f);
            }
        }

        public static string NameOf(GoElement e)
        {
            switch (e)
            {
                case GoElement.Pyro: return Saga.Go.Data.GoLocalization.T("field.el.pyro", "화");
                case GoElement.Hydro: return Saga.Go.Data.GoLocalization.T("field.el.hydro", "수");
                case GoElement.Electro: return Saga.Go.Data.GoLocalization.T("field.el.electro", "뇌");
                default: return Saga.Go.Data.GoLocalization.T("field.el.physical", "물리");
            }
        }

        public static string NameOf(GoReaction r)
        {
            switch (r)
            {
                case GoReaction.Vaporize: return Saga.Go.Data.GoLocalization.T("field.re.vaporize", "증발");
                case GoReaction.Overload: return Saga.Go.Data.GoLocalization.T("field.re.overload", "과부하");
                case GoReaction.ElectroCharged: return Saga.Go.Data.GoLocalization.T("field.re.charged", "감전");
                default: return "";
            }
        }

        public static Color ColorOf(GoReaction r)
        {
            switch (r)
            {
                case GoReaction.Vaporize: return new Color(1f, 0.8f, 0.4f);
                case GoReaction.Overload: return new Color(1f, 0.4f, 0.65f);
                case GoReaction.ElectroCharged: return new Color(0.6f, 0.55f, 1f);
                default: return Color.white;
            }
        }
    }
}
