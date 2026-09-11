using System.Collections.Generic;
using UnityEngine;

namespace Saga.Go.Data
{
    /// <summary>
    /// VERTICAL_SLICE.md 34절 — "duel.js를 그대로 재구현한다, 새로 설계하지
    /// 않는다". saga-godot의 duel_rules.gd(원본 saga-go/js/duel.js)의 판정
    /// 층(create/step/act)을 상수 하나 안 바꾸고 그대로 옮긴 것이다. 화면만
    /// 다르다 — 카드 무대가 아니라 실제 3D 인물이 맞붙는다
    /// (World/BanditEncounter.cs).
    /// </summary>
    public class DuelRules
    {
        public const float TimeSec = 60f;
        public const float QuickCd = 0.35f;
        public const float QuickMul = 0.10f;
        public const float QuickKi = 9f;
        public const float UltMul = 0.62f;
        public const float KiMax = 100f;

        public const float FoeGap = 2.6f;
        public const int FoeHeavy = 3;
        public const float TellSec = 1.1f;
        public const float HeavyMul = 2.4f;
        public const float DodgeCut = 0.15f;
        public const float MoraleMul = 3.0f;

        public float FoeHp, Hp, FoeAtk, MyAtk, Morale, MoraleMax, Left, Ki, Cd, FoeT, Tell;
        public int FoeN;
        public bool Dodged;

        public float Dealt;
        public int Hits, Ults, DodgeTry, DodgeOk;
        public float Taken;

        public bool Over, Cleared, Fled;

        public static DuelRules Create(float foeHpIn, float myAtkIn, float myDefIn, float timeSec = TimeSec)
        {
            var s = new DuelRules();
            s.FoeHp = Mathf.Max(1f, Mathf.Round(foeHpIn));
            s.Hp = s.FoeHp;
            s.FoeAtk = Mathf.Max(1f, Mathf.Round(s.FoeHp * 0.010f));
            s.MyAtk = Mathf.Max(1f, Mathf.Round(myAtkIn));
            s.Morale = Mathf.Max(200f, Mathf.Round(myDefIn * MoraleMul));
            s.MoraleMax = s.Morale;
            s.Left = timeSec;
            s.FoeT = FoeGap;
            return s;
        }

        /// <summary>
        /// 웹판 winChance(foeId, mine) 그대로 — 0.12~0.88 사이로 눌러 둔다.
        /// 이 판(3D 실시간)에서는 승패를 주사위가 아니라 실제로 기세를 다
        /// 깎았는지로 가르므로 전투 중에는 안 쓰인다 — 사건에 맞설지 고를
        /// 때 참고용으로만 남긴다.
        /// </summary>
        public static float WinChance(float mine, float foePower)
        {
            return Mathf.Clamp(mine / (mine + foePower), 0.12f, 0.88f);
        }

        public struct ActResult
        {
            public bool Ok;
            public string Kind;
            public string Reason;
            public float Dmg;
        }

        /// <summary>한 수 둔다. kind: "quick" | "ult" | "dodge"</summary>
        public ActResult Act(string kind)
        {
            if (Over) return new ActResult { Ok = false, Reason = "over" };

            if (kind == "dodge")
            {
                DodgeTry++;
                if (Tell > 0f)
                {
                    Dodged = true;
                    DodgeOk++;
                    return new ActResult { Ok = true, Kind = "dodge" };
                }
                return new ActResult { Ok = false, Kind = "dodge", Reason = "notell" };
            }

            if (kind == "ult")
            {
                if (Ki < KiMax) return new ActResult { Ok = false, Kind = "ult", Reason = "noki" };
                float big = Mathf.Round(MyAtk * UltMul);
                Ki = 0f;
                Hp -= big;
                Dealt += big;
                Ults++;
                FinishIfDone();
                return new ActResult { Ok = true, Kind = "ult", Dmg = big };
            }

            if (kind != "quick") return new ActResult { Ok = false, Reason = "what" };
            if (Cd > 0f) return new ActResult { Ok = false, Kind = "quick", Reason = "cd" };

            float dmg = Mathf.Round(MyAtk * QuickMul * (0.9f + Random.value * 0.2f));
            Cd = QuickCd;
            Ki = Mathf.Min(KiMax, Ki + QuickKi);
            Hp -= dmg;
            Dealt += dmg;
            Hits++;
            FinishIfDone();
            return new ActResult { Ok = true, Kind = "quick", Dmg = dmg };
        }

        private void FinishIfDone()
        {
            if (Hp <= 0f)
            {
                Over = true;
                Cleared = true;
            }
        }

        public struct DuelEvent
        {
            public string T;
            public float Dmg;
            public bool Dodged;
        }

        /// <summary>시간을 흘린다. 적의 차례(강타 예고 포함)도 여기서 온다 — 이게 "적 AI"다.</summary>
        public List<DuelEvent> Step(float dt)
        {
            var ev = new List<DuelEvent>();
            if (Over) return ev;

            if (Cd > 0f) Cd = Mathf.Max(0f, Cd - dt);
            Left -= dt;

            if (Tell > 0f)
            {
                Tell -= dt;
                if (Tell <= 0f)
                {
                    Tell = 0f;
                    float heavy = Mathf.Round(FoeAtk * HeavyMul);
                    if (Dodged) heavy = Mathf.Round(heavy * DodgeCut);
                    Morale -= heavy;
                    Taken += heavy;
                    ev.Add(new DuelEvent { T = "heavy", Dmg = heavy, Dodged = Dodged });
                    Dodged = false;
                    FoeT = FoeGap;
                }
            }
            else
            {
                FoeT -= dt;
                if (FoeT <= 0f)
                {
                    FoeN++;
                    if (FoeN % FoeHeavy == 0)
                    {
                        Tell = TellSec;
                        Dodged = false;
                        ev.Add(new DuelEvent { T = "tell" });
                    }
                    else
                    {
                        float d = Mathf.Round(FoeAtk * (0.85f + Random.value * 0.3f));
                        Morale -= d;
                        Taken += d;
                        ev.Add(new DuelEvent { T = "hit", Dmg = d });
                        FoeT = FoeGap;
                    }
                }
            }

            if (Morale <= 0f)
            {
                Morale = 0f;
                Over = true;
                Cleared = false;
                ev.Add(new DuelEvent { T = "rout" });
            }
            else if (Left <= 0f)
            {
                Left = 0f;
                Over = true;
                Cleared = Hp <= 0f;
                ev.Add(new DuelEvent { T = "time" });
            }

            return ev;
        }

        /// <summary>물러난다 — 그때까지 낸 만큼만 인정된다(한 대도 못 때렸으면 패배로 안 친다).</summary>
        public void Flee()
        {
            Over = true;
            Fled = true;
            Cleared = false;
        }
    }
}
