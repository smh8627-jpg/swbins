using System.Collections.Generic;

namespace Saga.Story.Data
{
    /// <summary>
    /// PLAN.md 101-2 STORY 5-2 "무예 유파" 1단계 — 유파(세트 효과)를 얹기 전에
    /// 그 밑바탕인 **1차 직업 무예 + SP 투자**부터 들인다(2026-09-23 사용자 결정
    /// "무예 트리부터"). 값은 웹판 `saga-web/saga-story/js/data-job.js` SKILLS의
    /// job:warrior/archer/rogue/mage 항목 그대로(원문 상수 안 바꿈), 픽셀 값(r·dist)만
    /// `FieldMapData.ScaleMPerPx`로 미터 환산. `School`은 2단계(유파 세트)가 쓸 자리 —
    /// 웹판 태그 그대로 미리 옮겨 둔다.
    ///
    /// **재해석 — 빠진 것**: 이 트랙 플레이어는 피격당하지 않아(`StoryCombat.StartHp`
    /// 주석) 체력 축이 없다. 그래서 heal 무예 둘(무사 생기결·방사 치유)은 옮기지 않고,
    /// 철갑의 guard(덜 맞음)·은신보/축지의 invuln(무적)도 뺀다 — 적용할 축이 없는 효과를
    /// 약속하지 않는다(`StoryJobTrainer`가 전직 메시지에서 체력+N을 빼는 것과 같은 판단).
    /// 부적의 regen(기력 회복 배율)은 이 트랙에도 기력이 있어 그대로 옮긴다.
    ///
    /// **재해석 — 퇴보사**: 웹판 코드는 dash를 늘 바라보는 쪽으로 밀지만(`side.js`
    /// castBody), 이름·설명("뒤로 물러나며 화살을 놓는다")은 후퇴다 — 이 트랙은 설명대로
    /// 뒤로 민다(<see cref="Skill.Backward"/>).
    /// </summary>
    public static class StorySkillData
    {
        public enum Effect { Melee, Aoe, Bolt, Arrow, Volley, Dash, Buff }

        public sealed class Skill
        {
            public string Key;
            public string Job;
            public string School;
            public string Name;
            public string Desc;
            public float Cost;
            public float Cooldown;
            public int Max = 10;
            public Effect Effect;
            public float MulBase;
            public float MulPerLevel;
            public float RadiusM;
            public float DistM;
            public bool Backward;
            public int Hits = 1;
            public int Shots = 2;
            public float BuffSec;
            public float BuffAtk = 1f;
            public float BuffSpeed = 1f;
            public float BuffRegen = 1f;
        }

        private const float Px = FieldMapData.ScaleMPerPx;

        public static readonly Skill[] All =
        {
            // 무사(武士)
            new Skill { Key = "w_cut", Job = "warrior", School = "w_jung", Name = "참격(斬擊)", Desc = "앞을 깊게 벤다",
                Cost = 6, Cooldown = 0.5f, Effect = Effect.Melee, MulBase = 1.15f, MulPerLevel = 0.09f },
            new Skill { Key = "w_whirl", Job = "warrior", School = "w_pae", Name = "선풍(旋風)", Desc = "몸을 돌려 주위를 쓸어 벤다",
                Cost = 20, Cooldown = 3.6f, Effect = Effect.Aoe, MulBase = 1.6f, MulPerLevel = 0.14f, RadiusM = 128 * Px },
            new Skill { Key = "w_rush", Job = "warrior", School = "w_jil", Name = "돌진(突進)", Desc = "앞으로 밀고 나가며 벤다",
                Cost = 24, Cooldown = 6f, Effect = Effect.Dash, MulBase = 1.8f, MulPerLevel = 0.16f, DistM = 210 * Px },
            new Skill { Key = "w_iron", Job = "warrior", School = "w_su", Name = "철갑(鐵甲)", Desc = "9초간 공격 +20%",
                Cost = 28, Cooldown = 16f, Effect = Effect.Buff, BuffSec = 9f, BuffAtk = 1.2f },
            new Skill { Key = "w_edge", Job = "warrior", School = "w_pa", Name = "파공검(破空劍)", Desc = "벤 기운을 앞으로 쏘아 보낸다 · 관통",
                Cost = 18, Cooldown = 5f, Effect = Effect.Bolt, MulBase = 1.6f, MulPerLevel = 0.14f },

            // 궁수(弓手)
            new Skill { Key = "a_shot", Job = "archer", School = "a_u", Name = "사격(射擊)", Desc = "화살 하나를 날린다",
                Cost = 8, Cooldown = 0.6f, Effect = Effect.Arrow, MulBase = 1.3f, MulPerLevel = 0.11f },
            new Skill { Key = "a_double", Job = "archer", School = "a_yeon", Name = "연사(連射)", Desc = "화살 셋을 잇달아 쏜다",
                Cost = 22, Cooldown = 3.4f, Effect = Effect.Volley, MulBase = 1.1f, MulPerLevel = 0.08f, Shots = 3 },
            new Skill { Key = "a_pierce", Job = "archer", School = "a_gwan", Name = "관통시(貫通矢)", Desc = "줄지어 선 것을 꿰뚫는다",
                Cost = 26, Cooldown = 6f, Effect = Effect.Bolt, MulBase = 2.0f, MulPerLevel = 0.18f },
            new Skill { Key = "a_eye", Job = "archer", School = "a_an", Name = "응안(鷹眼)", Desc = "9초간 공격 +40%",
                Cost = 30, Cooldown = 16f, Effect = Effect.Buff, BuffSec = 9f, BuffAtk = 1.4f },
            new Skill { Key = "a_retreat", Job = "archer", School = "a_toe", Name = "퇴보사(退步射)", Desc = "뒤로 물러나며 화살을 놓는다",
                Cost = 20, Cooldown = 6f, Effect = Effect.Dash, MulBase = 1.3f, MulPerLevel = 0.11f, DistM = 180 * Px, Backward = true },
            new Skill { Key = "a_burst", Job = "archer", School = "a_hwan", Name = "환시(環矢)", Desc = "사방으로 화살을 흩놓는다",
                Cost = 20, Cooldown = 5f, Effect = Effect.Aoe, MulBase = 1.4f, MulPerLevel = 0.12f, RadiusM = 110 * Px },

            // 협객(俠客)
            new Skill { Key = "r_twin", Job = "rogue", School = "r_cham", Name = "쌍참(雙斬)", Desc = "앞을 두 번 긋는다",
                Cost = 7, Cooldown = 0.42f, Effect = Effect.Melee, MulBase = 0.72f, MulPerLevel = 0.06f, Hits = 2 },
            new Skill { Key = "r_knife", Job = "rogue", School = "r_hwa", Name = "비도(飛刀)", Desc = "표창 둘을 던진다",
                Cost = 18, Cooldown = 2.6f, Effect = Effect.Volley, MulBase = 1.0f, MulPerLevel = 0.09f, Shots = 2 },
            new Skill { Key = "r_step", Job = "rogue", School = "r_bo", Name = "은신보(隱身步)", Desc = "한 걸음에 빠져나가며 벤다",
                Cost = 22, Cooldown = 7f, Effect = Effect.Dash, MulBase = 1.2f, MulPerLevel = 0.1f, DistM = 260 * Px },
            new Skill { Key = "r_vital", Job = "rogue", School = "r_hon", Name = "급소(急所)", Desc = "8초간 공격 +55%",
                Cost = 26, Cooldown = 15f, Effect = Effect.Buff, BuffSec = 8f, BuffAtk = 1.55f },
            new Skill { Key = "r_whirl", Job = "rogue", School = "r_pung", Name = "선풍각(旋風脚)", Desc = "몸을 낮춰 주위를 걷어찬다",
                Cost = 20, Cooldown = 5f, Effect = Effect.Aoe, MulBase = 1.4f, MulPerLevel = 0.12f, RadiusM = 110 * Px },
            new Skill { Key = "r_dart", Job = "rogue", School = "r_pyo", Name = "관통표(貫通鏢)", Desc = "표창을 꿰뚫듯 던진다 · 관통",
                Cost = 18, Cooldown = 5f, Effect = Effect.Bolt, MulBase = 1.6f, MulPerLevel = 0.14f },

            // 방사(方士)
            new Skill { Key = "m_fire", Job = "mage", School = "m_seong", Name = "화구(火球)", Desc = "불덩이를 굴린다 · 관통",
                Cost = 12, Cooldown = 0.9f, Effect = Effect.Bolt, MulBase = 1.5f, MulPerLevel = 0.13f },
            new Skill { Key = "m_bolt", Job = "mage", School = "m_jin", Name = "뇌전(雷電)", Desc = "벼락이 주위에 떨어진다",
                Cost = 26, Cooldown = 4f, Effect = Effect.Aoe, MulBase = 1.9f, MulPerLevel = 0.17f, RadiusM = 165 * Px },
            new Skill { Key = "m_talis", Job = "mage", School = "m_bu", Name = "부적(符籍)", Desc = "10초간 공격 +25% · 기력이 빨리 찬다",
                Cost = 30, Cooldown = 16f, Effect = Effect.Buff, BuffSec = 10f, BuffAtk = 1.25f, BuffRegen = 2.6f },
            new Skill { Key = "m_step", Job = "mage", School = "m_chuk", Name = "축지(縮地)", Desc = "땅을 접어 순식간에 나아간다",
                Cost = 22, Cooldown = 7f, Effect = Effect.Dash, MulBase = 1.2f, MulPerLevel = 0.1f, DistM = 220 * Px },
            new Skill { Key = "m_orb", Job = "mage", School = "m_tan", Name = "마탄(魔彈)", Desc = "기운 구슬 셋을 잇달아 놓는다",
                Cost = 22, Cooldown = 3.4f, Effect = Effect.Volley, MulBase = 1.1f, MulPerLevel = 0.08f, Shots = 3 },
        };

        private static Dictionary<string, Skill> _byKey;

        public static Skill Get(string key)
        {
            if (_byKey == null)
            {
                _byKey = new Dictionary<string, Skill>();
                foreach (var s in All) _byKey[s.Key] = s;
            }
            return key != null && _byKey.TryGetValue(key, out var skill) ? skill : null;
        }

        public static List<Skill> OfJob(string job)
        {
            var list = new List<Skill>();
            foreach (var s in All)
            {
                if (s.Job == job) list.Add(s);
            }
            return list;
        }
    }
}
