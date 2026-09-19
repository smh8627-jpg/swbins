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

        // PLAN.md 101-2 ③ "75초 토벌" — 웹판 §5 ③(`saga-web/saga-go/PLAN.md`
        // 190행, raid.js) 수치 그대로. 웹판이 "토벌에서만 켠다(create({raid:true}))
        // — 야생 조우·성채 수비대는 옛 판정 그대로" 로 이미 정리해 둔 스코프를
        // 그대로 따른다: Raid=false(기본)면 위 DodgeCut 경로가 바이트 단위로
        // 그대로다. World/RareWolfEncounter.cs만 raid:true로 이 경로를 켠다
        // (BanditEncounter.cs는 안 건드림).
        public const float RaidTimeSec = 75f;
        public const float JustWindowSec = 0.25f; // 예고 끝 이 창 안에서만 저스트.
        public const float PassiveMitigation = 0.5f; // 예고 중 걷기만(아무 것도 안 눌러도)으로는 절반만 맞는다.
        public const float JustKiBonus = 0.30f; // 저스트 성공 시 기 +30%(KiMax 기준).
        public const int PartCount = 3;
        public const int PartRewardGold = 4; // 웹판 "재료 단사 4/부위"를 이 트랙 통화로.
        private static readonly float[] PartThresholds = { 0.75f, 0.50f, 0.25f }; // 기세 누적 문턱(웹판 구현 그대로 — 부위별 HP를 안 나눔).

        public float FoeHp, Hp, FoeAtk, MyAtk, Morale, MoraleMax, Left, Ki, Cd, FoeT, Tell;
        public int FoeN;
        public bool Dodged;

        // PLAN.md 101-2 ⑦ "승급 3택" 보(補) 축 — PerkState.KiMultiplier를 여기 앉힌다.
        // 기본 1f면 웹판 duel.js 그대로. Create() 밖에서 호출부가 직접 세팅한다
        // (Create 시그니처를 안 늘려 기존 호출부를 안 건드리려고).
        public float KiMul = 1f;

        public bool Raid;
        public readonly bool[] PartBroken = new bool[PartCount];
        public int PartsJustBroken; // Act() 호출마다 리셋 — 이번 타격으로 새로 깨진 부위 수.

        public float Dealt;
        public int Hits, Ults, DodgeTry, DodgeOk;
        public float Taken;

        public bool Over, Cleared, Fled;

        public static DuelRules Create(float foeHpIn, float myAtkIn, float myDefIn, float timeSec = TimeSec, bool raid = false)
        {
            var s = new DuelRules();
            s.FoeHp = Mathf.Max(1f, Mathf.Round(foeHpIn));
            s.Hp = s.FoeHp;
            s.FoeAtk = Mathf.Max(1f, Mathf.Round(s.FoeHp * 0.010f));
            s.MyAtk = Mathf.Max(1f, Mathf.Round(myAtkIn));
            s.Morale = Mathf.Max(200f, Mathf.Round(myDefIn * MoraleMul));
            s.MoraleMax = s.Morale;
            s.Raid = raid;
            s.Left = raid ? RaidTimeSec : timeSec;
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
            PartsJustBroken = 0;
            if (Over) return new ActResult { Ok = false, Reason = "over" };

            if (kind == "dodge")
            {
                DodgeTry++;
                if (Tell <= 0f) return new ActResult { Ok = false, Kind = "dodge", Reason = "notell" };

                // PLAN.md 101-2 ③ "저스트 회피" — Raid에서만 예고 끝 JustWindowSec
                // 안으로 좁힌다(그 밖은 실패 "early" — 이르다). 비raid는 예전 그대로
                // Tell 창 전체가 성공.
                if (Raid && Tell > JustWindowSec)
                {
                    return new ActResult { Ok = false, Kind = "dodge", Reason = "early" };
                }
                Dodged = true;
                DodgeOk++;
                return new ActResult { Ok = true, Kind = "dodge" };
            }

            if (kind == "ult")
            {
                if (Ki < KiMax) return new ActResult { Ok = false, Kind = "ult", Reason = "noki" };
                float big = Mathf.Round(MyAtk * UltMul);
                Ki = 0f;
                Hp -= big;
                Dealt += big;
                Ults++;
                CheckPartBreak();
                FinishIfDone();
                return new ActResult { Ok = true, Kind = "ult", Dmg = big };
            }

            if (kind != "quick") return new ActResult { Ok = false, Reason = "what" };
            if (Cd > 0f) return new ActResult { Ok = false, Kind = "quick", Reason = "cd" };

            float dmg = Mathf.Round(MyAtk * QuickMul * (0.9f + Random.value * 0.2f));
            Cd = QuickCd;
            Ki = Mathf.Min(KiMax, Ki + QuickKi * KiMul);
            Hp -= dmg;
            Dealt += dmg;
            Hits++;
            CheckPartBreak();
            FinishIfDone();
            return new ActResult { Ok = true, Kind = "quick", Dmg = dmg };
        }

        /// <summary>PLAN.md 101-2 ③ — 웹판 구현 그대로 부위별 HP를 안 나누고
        /// 같은 기세 풀을 75%·50%·25% 누적 문턱으로 읽는다(문턱을 넘을 때마다
        /// 부위 하나 파괴). Raid가 아니면 아무 일도 안 한다.</summary>
        private void CheckPartBreak()
        {
            if (!Raid) return;
            float frac = Mathf.Max(0f, Hp) / FoeHp;
            for (int i = 0; i < PartCount; i++)
            {
                if (!PartBroken[i] && frac <= PartThresholds[i])
                {
                    PartBroken[i] = true;
                    PartsJustBroken++;
                }
            }
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
                    if (Raid)
                    {
                        if (Dodged)
                        {
                            // 저스트 회피 성공 — 완전 회피 + 기 +30%(KiMax 기준).
                            heavy = 0f;
                            Ki = Mathf.Min(KiMax, Ki + KiMax * JustKiBonus * KiMul);
                        }
                        else
                        {
                            // 예고 중 걷기만으로는(저스트를 안 맞혀도) 절반만 맞는다.
                            heavy = Mathf.Round(heavy * PassiveMitigation);
                        }
                    }
                    else if (Dodged)
                    {
                        heavy = Mathf.Round(heavy * DodgeCut);
                    }
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
