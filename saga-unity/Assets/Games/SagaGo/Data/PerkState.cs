using System;
using System.Collections.Generic;

namespace Saga.Go.Data
{
    /// <summary>
    /// PLAN.md 101-2 ⑦ "승급 3택" — 웹판 §5 ⑦(`saga-web/saga-go/js/hero.js` rank up
    /// 설계, 웹 자체도 미착수)을 이 트랙 실제 시스템에 맞춰 재해석한다.
    /// 웹판은 인물마다(hero.js) 승급 시 특성을 골랐지만, 이 트랙 GO엔 개별
    /// 인물 rank 시스템이 없다(<see cref="PartyState"/>는 등용 인원수만
    /// 센다) — saga-godot이 이미 이 설계 의도를 "부대 레벨업마다"로 재해석해
    /// 실기 승인을 받았으니(PLAN 101-2 서두 2026-09-19 결정), 여기서도 같은
    /// 결로 <see cref="PlayerStats.LeveledUp"/>을 승급 시점으로 삼는다.
    /// 다만 UI·수치는 그쪽을 베끼지 않고 다시 짠다(코드 공유 없음 원칙).
    ///
    /// 웹판 "공(攻)·수(守)·보(補) 축에서 각 1, 인물당 최대 3특성, 같은 축
    /// 둘 금지"를 다음처럼 구조로 못박는다 — 항상 축마다 정확히 하나씩
    /// 3장을 제안하고(<see cref="RollChoice"/>), 고르면 그 축의 특성을
    /// 갈아 끼운다(<see cref="Choose"/>, 이미 그 축에 있던 것은 교체). 축이
    /// 3개뿐이라 보유 특성은 구조적으로 항상 최대 3개 — 별도의 "다 찼으면
    /// 그만 제안" 상태를 안 둬도 "인물당 최대 3특성" 불변식이 저절로 지켜진다.
    /// 특성 효과는 배율로만 적용한다(기본치 불변 규칙 유지) — 기초 능력치
    /// 자체(<see cref="PlayerStats"/>·<see cref="PartyState"/>)는 안 건드리고,
    /// 전투에 넘길 때만(BanditEncounter/RareWolfEncounter) 곱한다.
    /// </summary>
    public static class PerkState
    {
        public enum Axis { Atk, Def, Support }

        public const int RejectGoldReward = 10; // 웹판 "거절 = 단사 10"을 이 트랙 통화(Gold)로.

        public readonly struct PerkDef
        {
            public readonly Axis Axis;
            public readonly string Id;
            public readonly string Name;
            public readonly float Bonus; // 0.05~0.08 (단일 축 배율 보너스)

            public PerkDef(Axis axis, string id, string name, float bonus)
            {
                Axis = axis;
                Id = id;
                Name = name;
                Bonus = bonus;
            }
        }

        // 풀 12 = 축 3 × 축당 4, 효과 +5~8% (웹판 수치 그대로).
        private static readonly PerkDef[] Pool =
        {
            new PerkDef(Axis.Atk, "atk_edge", "매서운 손속", 0.05f),
            new PerkDef(Axis.Atk, "atk_swift", "쾌속 검로", 0.06f),
            new PerkDef(Axis.Atk, "atk_reckless", "필사의 기세", 0.07f),
            new PerkDef(Axis.Atk, "atk_killer", "필살의 감각", 0.08f),
            new PerkDef(Axis.Def, "def_stance", "굳건한 자세", 0.05f),
            new PerkDef(Axis.Def, "def_hide", "질긴 맷집", 0.06f),
            new PerkDef(Axis.Def, "def_brace", "버팀의 요령", 0.07f),
            new PerkDef(Axis.Def, "def_grit", "불굴의 기백", 0.08f),
            new PerkDef(Axis.Support, "sup_breath", "숨 고르기", 0.05f),
            new PerkDef(Axis.Support, "sup_flow", "기의 순환", 0.06f),
            new PerkDef(Axis.Support, "sup_focus", "예기의 자각", 0.07f),
            new PerkDef(Axis.Support, "sup_core", "필살의 근원", 0.08f),
        };

        private static readonly Dictionary<Axis, PerkDef> Chosen = new Dictionary<Axis, PerkDef>();

        public static event Action<PerkDef> PerkChosen;
        public static event Action<int> Rejected; // 지급된 골드

        public static float AtkMultiplier => Multiplier(Axis.Atk);
        public static float DefMultiplier => Multiplier(Axis.Def);
        public static float KiMultiplier => Multiplier(Axis.Support);

        private static float Multiplier(Axis axis) =>
            Chosen.TryGetValue(axis, out var p) ? 1f + p.Bonus : 1f;

        public static bool HasPerk(Axis axis) => Chosen.ContainsKey(axis);

        public static PerkDef? PerkOf(Axis axis) => Chosen.TryGetValue(axis, out var p) ? p : (PerkDef?)null;

        /// <summary>축마다 그 축 풀(4개) 중 하나를 무작위로 골라 정확히 3장(축 3개) 돌려준다 —
        /// 이미 그 축에 특성이 있어도 다시 제안한다(고르면 교체, 100-3 위 클래스 주석).</summary>
        public static PerkDef[] RollChoice(Random rng = null)
        {
            rng ??= new Random();
            var axes = new[] { Axis.Atk, Axis.Def, Axis.Support };
            var result = new PerkDef[axes.Length];
            for (int i = 0; i < axes.Length; i++)
            {
                result[i] = RandomOfAxis(axes[i], rng);
            }
            return result;
        }

        private static PerkDef RandomOfAxis(Axis axis, Random rng)
        {
            var candidates = new List<PerkDef>(4);
            foreach (var p in Pool) if (p.Axis == axis) candidates.Add(p);
            return candidates[rng.Next(candidates.Count)];
        }

        /// <summary>그 축의 특성을 갈아 끼운다(있었으면 교체) — 기초 능력치는 그대로,
        /// 배율만 바뀐다.</summary>
        public static void Choose(PerkDef perk)
        {
            Chosen[perk.Axis] = perk;
            PerkChosen?.Invoke(perk);
        }

        public static void Reject()
        {
            GoldState.Add(RejectGoldReward);
            Rejected?.Invoke(RejectGoldReward);
        }

        /// <summary>SaveState.cs 전용 — 축별로 하나씩 있는 그대로 id만 뽑는다(순서는 Atk/Def/Support 고정).</summary>
        public static List<string> SnapshotIds()
        {
            var ids = new List<string>();
            foreach (var axis in new[] { Axis.Atk, Axis.Def, Axis.Support })
            {
                if (Chosen.TryGetValue(axis, out var p)) ids.Add(p.Id);
            }
            return ids;
        }

        /// <summary>세이브에서 복원 — id로 풀에서 되찾아 그 축에 앉힌다. 모르는 id는 조용히 무시.</summary>
        public static void Restore(IEnumerable<string> ids)
        {
            Chosen.Clear();
            if (ids == null) return;
            foreach (var id in ids)
            {
                foreach (var p in Pool)
                {
                    if (p.Id == id) { Chosen[p.Axis] = p; break; }
                }
            }
        }
    }
}
