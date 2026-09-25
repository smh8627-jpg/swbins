using System.Collections.Generic;
using UnityEngine;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 109-7 "몸 배정" — 도감 인물 105(`GoHeroes.All`)마다 겉모습 한 벌. 몸 고르기는 **이 표 한 곳**이다
    /// (`tools/char-forge` 단계 4 가 인물마다 몸을 내면 <see cref="BodyOverride"/> 에 id 를 더해 바꿔 끼운다).
    ///
    /// 몸 = 역사풍 사실 몸 열일곱(<see cref="Bodies"/> — GO 마을·역참 사람·적이 쓰는 몸은 되도록 뺐다: 주인공 Maria·산적 Abe·
    /// 해골·수호장·시대 적·역참 여섯). 남 열둘·여 다섯, 몸마다 기질·시대 어울림 점수로 고르고 한 몸에 너무 몰리지 않게 나눈다.
    ///
    /// 한 몸을 여럿이 나눠 쓰니 모양 다섯 축으로 가른다 — 키(작음·보통·큼) · 체격(가늚·보통·다부짐 = 몸 너비) · 등(칼 셋·철퇴·전투 망치·
    /// 도끼·방패 — Poly Haven 스캔 CC0 실측) · 허리(손도끼·단검·나침반·등잔) · 머리(어부 모자·둥근 안경). **같은 몸을 쓰는 두 사람은 이 다섯 축 중
    /// 둘 이상이 다르다**(<see cref="MinShapeDiff"/>, `PlaytestGoHeroLooks` 가 105 전부 잰다). 빛깔은 셈에 넣지 않는다 —
    /// 사용자 기준 "색만 다른 건 다른 게 아니다"(2026-09-25), 게다가 이 몸들은 피부·옷이 재질 하나라 빛깔을 입히면 얼굴까지 물든다.
    /// 머리 꾸밈은 투구·두건·복면을 쓴 몸에는 안 씌운다(<see cref="Body.Covered"/>).
    ///
    /// 표는 규칙으로 한 번 짓고(난수 없음, 표 순서대로 욕심 고르기) 이름을 걸어 고정한다 — 웹 도감을 다시 뽑아 순서가 바뀌면 배정이 달라질 수 있다.
    /// </summary>
    public static class GoHeroLooks
    {
        public enum Gear { None, Katana, Estoc, Saber, Mace, WarHammer, Axe, Hatchet, Shield, Dagger, Compass, Lantern, Hat, Spectacles }

        public const int MinShapeDiff = 2;

        public static readonly float[] HeightMul = { 0.93f, 1f, 1.07f };
        public static readonly float[] BuildMul = { 0.9f, 1f, 1.1f };
        /// <summary>여자 몸은 키를 조금 낮춘다(체형 축과 별개).</summary>
        public const float FemaleHeight = 0.95f;

        public struct Look
        {
            public string HeroId, Body;
            public int Height, Build;           // HeightMul·BuildMul 칸
            public Gear Back, Hip, Head;
            public float HeightScale => HeightMul[Height] * (GoHeroLooks.IsFemale(HeroId) ? FemaleHeight : 1f);
            public float WidthScale => BuildMul[Build];
        }

        public sealed class Body
        {
            public string Name;
            public bool Female;
            public bool Covered;                // 투구·두건·복면 — 모자·안경을 안 씌운다
            public int Might, Wisdom, Virtue;   // 기질 어울림 0~3
            public int ThreeKingdoms, Korea, Japan, World; // 시대 어울림 0~2
            public bool JapanOnly;
            public bool OverrideOnly;           // <see cref="BodyOverride"/> 로 박은 사람만(양복·복면처럼 한둘에게만 맞는 몸)
            public bool NoArms;                 // 등 무기·방패를 안 멘다(양복·치마)
            public int MinRarity;               // 이 희귀도 이상만(금빛 왕 갑옷 = ★5)
        }

        /// <summary>인물 몸 열일곱(프리팹 = `SetupNpcCharacterImports.PrefabPath(Name)`). 씬 빌더가 이 이름 순서로 프리팹을 넘긴다.</summary>
        public static readonly Body[] Bodies =
        {
            // 남
            new Body { Name = "Dreyar",        Might = 3, Virtue = 1, ThreeKingdoms = 1, Japan = 1, World = 2 },            // 검은 판금 기사
            new Body { Name = "CastleGuard02", Covered = true, Might = 2, Virtue = 1, Korea = 1, World = 2 },               // 투구 쓴 성 경비
            new Body { Name = "CastleGuard",   Covered = true, Might = 1, Virtue = 2, ThreeKingdoms = 1, Japan = 1, World = 1 }, // 투구 쓴 성 파수
            new Body { Name = "Heraklios",     Covered = true, Might = 2, Wisdom = 2, ThreeKingdoms = 2, Korea = 2 },       // 두건·가죽·털 대장
            new Body { Name = "Pelegrini",     Covered = true, Virtue = 3, Korea = 1, World = 2 },                          // 붉은 두건 순례 기사
            new Body { Name = "Brady",         Wisdom = 3, Virtue = 1, ThreeKingdoms = 2, Korea = 1, Japan = 2 },           // 무도복 수행자
            new Body { Name = "Ninja",         Covered = true, OverrideOnly = true },                                       // 복면 닌자(암영조 하나)
            new Body { Name = "Morak",         Might = 3, ThreeKingdoms = 1, Korea = 1, Japan = 1, World = 2 },             // 맨팔 장사
            new Body { Name = "Uriel",         Wisdom = 2, Virtue = 3, World = 2, ThreeKingdoms = 1, MinRarity = 5 },       // 금빛 장식 갑옷(★5 임금·황제)
            new Body { Name = "PeasantMan",    Wisdom = 3, Virtue = 2, Korea = 2, Japan = 1, ThreeKingdoms = 1 },           // 베옷 선비·장인
            new Body { Name = "Paladin",       Covered = true, Might = 2, Virtue = 2, Japan = 1, World = 2 },               // 투구·방패 무사
            new Body { Name = "Joe",           OverrideOnly = true, NoArms = true },                                        // 근대 양복
            // 여
            // 여 — 열두 명뿐이라 전부 손으로 짝지었다(BodyOverride). 점수는 표에 새 여자 인물이 생길 때 쓴다.
            new Body { Name = "Kachujin",      Female = true, Might = 3, Virtue = 1, Japan = 2, ThreeKingdoms = 1, Korea = 1 },  // 무희·여무사
            new Body { Name = "Arissa",        Female = true, Covered = true, Wisdom = 3, World = 2, Japan = 1 },               // 두건 망토 — 무녀·여왕·궁정 문필
            new Body { Name = "Eve",           Female = true, Might = 1, Virtue = 3, World = 2 },                               // 가죽 옷 — 성녀 기사·여왕
            new Body { Name = "PeasantGirl",   Female = true, NoArms = true, Wisdom = 2, Virtue = 2, Korea = 2, Japan = 1 },    // 치마 — 화가·만세 소녀·왕비
            new Body { Name = "Archer",        Female = true, Covered = true, Might = 2, Wisdom = 1, ThreeKingdoms = 1, Japan = 1 }, // 두건 궁수 — 수필가
        };

        /// <summary>여자 인물(몸 고르기 전용 — 표시 글자 아님).</summary>
        private static readonly HashSet<string> FemaleIds = new HashSet<string>
        {
            "sg_diaochan", "kr_sinsaimdang", "kr_yugwansun", "kr_nongae", "jp_himiko", "jp_murasaki", "jp_seishonagon",
            "jp_tomoegozen", "eu_joan", "eu_elizabeth", "eu_eleanor", "wd_cleopatra",
        };

        /// <summary>몸을 손으로 박은 인물 — 근대(19~20세기) 인물은 양복 몸. char-forge 몸이 나오면 여기에 id → 새 몸을 더한다.</summary>
        public static readonly Dictionary<string, string> BodyOverride = new Dictionary<string, string>
        {
            { "kr_ahnjunggeun", "Joe" }, { "kr_kimgu", "Joe" }, { "jp_ryoma", "Joe" }, { "jp_naosuke", "Joe" }, { "jp_saigo", "Joe" },
            { "jp_hanzo", "Ninja" },
            { "jp_tomoegozen", "Kachujin" }, { "sg_diaochan", "Kachujin" }, { "kr_nongae", "Kachujin" },
            { "jp_himiko", "Arissa" }, { "wd_cleopatra", "Arissa" }, { "jp_murasaki", "Arissa" },
            { "eu_joan", "Eve" }, { "eu_elizabeth", "Eve" },
            { "kr_sinsaimdang", "PeasantGirl" }, { "kr_yugwansun", "PeasantGirl" }, { "eu_eleanor", "PeasantGirl" },
            { "jp_seishonagon", "Archer" },
        };

        public static bool IsFemale(string heroId) => heroId != null && FemaleIds.Contains(heroId);

        public static bool IsBack(Gear g) => g >= Gear.Katana && g <= Gear.Shield && g != Gear.Hatchet;
        public static bool IsHip(Gear g) => g == Gear.Hatchet || g == Gear.Dagger || g == Gear.Compass || g == Gear.Lantern;
        public static bool IsHead(Gear g) => g == Gear.Hat || g == Gear.Spectacles;

        /// <summary>꾸밈 → Poly Haven id(씬 빌더가 `Art/Props/PolyHaven/&lt;id&gt;/&lt;id&gt;_1k.gltf` 를 이 순서로 넘긴다).</summary>
        public static string GearAsset(Gear g)
        {
            switch (g)
            {
                case Gear.Katana: return "antique_katana_01";
                case Gear.Estoc: return "antique_estoc";
                case Gear.Saber: return "wooden_handle_saber";
                case Gear.Mace: return "ornate_medieval_mace";
                case Gear.WarHammer: return "ornate_war_hammer";
                case Gear.Axe: return "wooden_axe";
                case Gear.Hatchet: return "hatchet";
                case Gear.Shield: return "kite_shield";
                case Gear.Dagger: return "ornate_medieval_dagger";
                case Gear.Compass: return "seadogs_compass";
                case Gear.Lantern: return "brass_diya_lantern";
                case Gear.Hat: return "fishermans_hat";
                case Gear.Spectacles: return "round_spectacles";
                default: return null;
            }
        }

        /// <summary>칼 종류는 칼날이 위로 선 채 받았다 — 등에 멜 땐 넓은 쪽(자루·코등이)이 어깨 위로 오게 뒤집는다(`HeroDresser` 가 정점으로 다시 잰다).</summary>
        public static readonly Gear[] AllGear =
        {
            Gear.Katana, Gear.Estoc, Gear.Saber, Gear.Mace, Gear.WarHammer, Gear.Axe, Gear.Hatchet, Gear.Shield,
            Gear.Dagger, Gear.Compass, Gear.Lantern, Gear.Hat, Gear.Spectacles,
        };

        public static int ShapeDiff(Look a, Look b)
        {
            int d = 0;
            if (a.Height != b.Height) d++;
            if (a.Build != b.Build) d++;
            if (a.Back != b.Back) d++;
            if (a.Hip != b.Hip) d++;
            if (a.Head != b.Head) d++;
            return d;
        }

        private static Dictionary<string, Look> _looks;
        private static Dictionary<Gear, int> _gearUse;

        public static bool TryGet(string heroId, out Look look)
        {
            if (_looks == null) Build();
            if (heroId != null && _looks.TryGetValue(heroId, out look)) return true;
            look = default;
            return false;
        }

        public static IEnumerable<Look> All
        {
            get
            {
                if (_looks == null) Build();
                foreach (var h in GoHeroes.All) yield return _looks[h.Id];
            }
        }

        public static Body BodyNamed(string name)
        {
            foreach (var b in Bodies) if (b.Name == name) return b;
            return null;
        }

        // ---- 짓기 --------------------------------------------------------------

        private static int TraitFit(Body b, HeroTrait t)
        {
            switch (t)
            {
                case HeroTrait.Might: return b.Might;
                case HeroTrait.Wisdom: return b.Wisdom;
                default: return Mathf.Max(b.Virtue, (b.Might + b.Wisdom) / 2); // 덕·통
            }
        }

        private static int EraFit(Body b, HeroEra e)
        {
            switch (e)
            {
                case HeroEra.ThreeKingdoms: return b.ThreeKingdoms;
                case HeroEra.Korea: return b.Korea;
                case HeroEra.Japan: return b.Japan;
                default: return b.World;
            }
        }

        private static string PickBody(GoHeroes.Hero h, Dictionary<string, int> used, int femaleCap, int maleCap)
        {
            if (BodyOverride.TryGetValue(h.Id, out var forced)) return forced;
            bool female = IsFemale(h.Id);
            Body best = null;
            float bestScore = float.MinValue;
            foreach (var b in Bodies)
            {
                if (b.Female != female || b.OverrideOnly) continue;
                if (b.JapanOnly && h.Era != HeroEra.Japan) continue;
                if (h.Rarity < b.MinRarity) continue;
                used.TryGetValue(b.Name, out int n);
                if (n >= (female ? femaleCap : maleCap)) continue;
                float s = TraitFit(b, h.Trait) * 3f + EraFit(b, h.Era) * 1.5f - n * 1.1f;
                if (s > bestScore) { bestScore = s; best = b; }
            }
            return best != null ? best.Name : (female ? "PeasantGirl" : "PeasantMan");
        }

        private static Gear[] BackPref(GoHeroes.Hero h, Body b)
        {
            if (b != null && b.NoArms) return new[] { Gear.None };
            Gear blade = h.Era == HeroEra.Japan ? Gear.Katana : h.Era == HeroEra.World ? Gear.Estoc : Gear.Saber;
            switch (h.Trait)
            {
                case HeroTrait.Might when h.Era == HeroEra.Japan:
                    return new[] { Gear.Katana, Gear.WarHammer, Gear.Axe, Gear.Mace, Gear.Shield, Gear.Saber, Gear.Estoc, Gear.None };
                case HeroTrait.Might: return new[] { Gear.WarHammer, Gear.Axe, blade, Gear.Mace, Gear.Shield, Gear.Saber, Gear.Katana, Gear.Estoc, Gear.None };
                case HeroTrait.Wisdom: return new[] { Gear.None, blade, Gear.Shield, Gear.Saber, Gear.Mace, Gear.Katana, Gear.Estoc, Gear.Axe, Gear.WarHammer };
                default: return new[] { blade, Gear.Shield, Gear.Mace, Gear.Saber, Gear.Estoc, Gear.Katana, Gear.None, Gear.WarHammer, Gear.Axe };
            }
        }

        private static Gear[] HipPref(GoHeroes.Hero h)
        {
            switch (h.Trait)
            {
                case HeroTrait.Wisdom: return new[] { Gear.Compass, Gear.Lantern, Gear.None, Gear.Dagger, Gear.Hatchet };
                case HeroTrait.Might: return new[] { Gear.None, Gear.Hatchet, Gear.Dagger, Gear.Lantern, Gear.Compass };
                default: return new[] { Gear.None, Gear.Lantern, Gear.Dagger, Gear.Hatchet, Gear.Compass };
            }
        }

        private static Gear[] HeadPref(GoHeroes.Hero h, Body b)
        {
            if (b != null && b.Covered) return new[] { Gear.None };
            return h.Trait == HeroTrait.Wisdom ? new[] { Gear.Spectacles, Gear.None, Gear.Hat } : new[] { Gear.None, Gear.Hat, Gear.Spectacles };
        }

        private static int[] HeightPref(GoHeroes.Hero h) =>
            h.Trait == HeroTrait.Might ? new[] { 2, 1, 0 } : h.Trait == HeroTrait.Wisdom ? new[] { 1, 0, 2 } : new[] { 1, 2, 0 };

        private static int[] BuildPref(GoHeroes.Hero h) =>
            h.Trait == HeroTrait.Might ? new[] { 2, 1, 0 } : h.Trait == HeroTrait.Wisdom ? new[] { 0, 1, 2 } : new[] { 1, 0, 2 };

        private static void Build()
        {
            _looks = new Dictionary<string, Look>();
            _gearUse = new Dictionary<Gear, int>();
            var used = new Dictionary<string, int>();
            var byBody = new Dictionary<string, List<Look>>();
            int females = 0;
            foreach (var h in GoHeroes.All) if (IsFemale(h.Id)) females++;
            int femaleBodies = 0, maleBodies = 0;
            foreach (var b in Bodies) { if (b.Female) femaleBodies++; else if (!b.OverrideOnly) maleBodies++; }
            int forcedMale = 0, forcedFemale = 0;
            foreach (var kv in BodyOverride) { if (IsFemale(kv.Key)) forcedFemale++; else forcedMale++; }
            // 손으로 박은 사람은 셈 밖 — 여자는 전부 박혀 있어 새 여자 인물이 생길 때만 캡이 쓰인다.
            int femaleCap = Mathf.CeilToInt((float)(females - forcedFemale) / femaleBodies) + 3;
            int maleCap = Mathf.CeilToInt((float)(GoHeroes.All.Length - females - forcedMale) / maleBodies) + 1;

            foreach (var h in GoHeroes.All)
            {
                string bodyName = PickBody(h, used, femaleCap, maleCap);
                used.TryGetValue(bodyName, out int n);
                used[bodyName] = n + 1;
                if (!byBody.TryGetValue(bodyName, out var mates)) byBody[bodyName] = mates = new List<Look>();
                var look = PickShape(h, BodyNamed(bodyName), mates);
                look.HeroId = h.Id;
                look.Body = bodyName;
                mates.Add(look);
                _looks[h.Id] = look;
                foreach (var g in new[] { look.Back, look.Hip, look.Head })
                    if (g != Gear.None) { _gearUse.TryGetValue(g, out int u); _gearUse[g] = u + 1; }
            }
        }

        /// <summary>이미 여럿이 쓴 꾸밈일수록 순위를 뒤로(다섯 명마다 한 칸) — 한두 가지로 몰리지 않게.</summary>
        private static int UsePenalty(Gear g)
        {
            if (g == Gear.None) return 0;
            _gearUse.TryGetValue(g, out int u);
            return u / 5;
        }

        /// <summary>선호 순위 합(+ 꾸밈 쏠림 벌점)이 가장 작은 조합 — 같은 몸 앞사람 모두와 <see cref="MinShapeDiff"/> 축 이상 다른 것.</summary>
        private static Look PickShape(GoHeroes.Hero h, Body body, List<Look> mates)
        {
            var hp = HeightPref(h); var bp = BuildPref(h);
            var back = BackPref(h, body); var hip = HipPref(h); var head = HeadPref(h, body);
            Look best = default;
            int bestRank = int.MaxValue;
            for (int a = 0; a < hp.Length; a++)
            for (int b = 0; b < bp.Length; b++)
            for (int c = 0; c < back.Length; c++)
            for (int d = 0; d < hip.Length; d++)
            for (int e = 0; e < head.Length; e++)
            {
                int rank = a * 3 + b * 3 + (c + UsePenalty(back[c])) * 2 + (d + UsePenalty(hip[d])) * 2 + (e + UsePenalty(head[e])) * 2;
                if (rank >= bestRank) continue;
                var look = new Look { Height = hp[a], Build = bp[b], Back = back[c], Hip = hip[d], Head = head[e] };
                bool ok = true;
                foreach (var m in mates) if (ShapeDiff(m, look) < MinShapeDiff) { ok = false; break; }
                if (!ok) continue;
                best = look;
                bestRank = rank;
            }
            return best;
        }
    }
}
