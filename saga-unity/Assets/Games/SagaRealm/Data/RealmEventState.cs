using System;
using System.Collections.Generic;
using UnityEngine;

namespace Saga.Realm.Data
{
    /// <summary>
    /// PLAN.md 101-2 5-2 "관계·이벤트 체인"(웹판 `saga-web/saga-realm/PLAN.md`
    /// 117행) — 이 트랙은 무장이 3명뿐이고 충성·이탈 축이 없어(`RealmOfficerTraits.cs`
    /// 클래스 주석과 같은 결) 웹판의 "무장 사이 관계(의형제·원수 등) 20~30쌍
    /// + 세력 간 이벤트"를 그대로 못 옮긴다. saga-godot REALM(PROJECT_STATE.md
    /// "101-2 ⑤이벤트 체인")이 이미 "관계 대신 특성·야망 조건의 1인 서사
    /// 카드"로 재해석해 실기 승인을 받았다(2026-09-19 게이트 결정, 이 트랙
    /// 101-2 서두 참고) — 같은 결로 가되 UI·수치·코드는 이 트랙 자체
    /// 컴포넌트로 새로 짠다(코드 공유 없음 원칙).
    ///
    /// 카드 7종 — 특성(용맹·교활·현명) 각 1 + 야망(부귀·숙적·학문) 각 1 +
    /// 체인 후속 1(BraveReward, BraveChallenge를 "응한다"로 이겼을 때만
    /// 3달 뒤 예약). 매달 18%(웹판 5-2 "수치" 그대로) 확률로 하나 뽑되,
    /// 예약된 체인 후속이 기한에 닿으면 그쪽을 먼저 낸다 — 이 트랙은
    /// 세력이 하나뿐이라 웹판 "세력당 동시 진행 체인 최대 2" 대신 한 달
    /// 한 장으로 좁혔다. 효과는 전부 금(`RealmCityState.Gold`)만 건드린다
    /// — 전투력·계략 배율 등 다른 계수를 이벤트로 또 건드리면 5-1(특성)·
    /// 5-6(전술)과 겹쳐 원인 추적이 어려워지니 이 조각은 "서사 카드 + 금"
    /// 으로 스코프를 좁혔다. 세이브도 안 한다(진행 중 카드·예약된 체인은
    /// 재시작하면 사라진다 — 문답 학습 기록과 달리 값이 작아 잃어도
    /// 무방하다는 판단, `RealmQuizState`류와 같은 결).
    /// </summary>
    public static class RealmEventState
    {
        public enum Kind { BraveChallenge, BraveReward, CunningIntel, WiseInvite, WealthChance, RivalTip, ScholarLecture }
        public enum Choice { A, B, C }

        public readonly struct Card
        {
            public readonly Kind Kind;
            public readonly string OfficerId;
            public Card(Kind kind, string officerId) { Kind = kind; OfficerId = officerId; }
        }

        public readonly struct Outcome
        {
            public readonly string Message;
            public readonly bool Ok;
            public Outcome(string message, bool ok) { Message = message; Ok = ok; }
        }

        private const float MonthlyChance = 0.18f; // 웹판 5-2 "수치" 그대로.
        private const int ChainDelayMonths = 3; // 웹판 "체인 2~3단, 3~6달 뒤" 중 최솟값.

        private const float DuelWinChance = 0.65f;
        private const int DuelWinGold = 400;
        private const int DuelLoseGold = 200;
        private const int DuelBribeGold = 150;

        private const int RewardAcceptGold = 300;
        private const int RewardDivertGold = 150;

        private const int IntelCost = 200;
        private const float IntelSuccessChance = 0.7f;
        private const int IntelSuccessGold = 500;
        private const float IntelCounterChance = 0.5f;
        private const int IntelCounterGold = 300;
        private const int IntelCounterLoss = 150;

        private const int InviteAcceptGold = 250;
        private const int InviteGiftCost = 150;

        private const int WealthBigCost = 300;
        private const float WealthBigChance = 0.55f;
        private const int WealthBigGold = 700;
        private const int WealthSmallCost = 100;
        private const int WealthSmallReturn = 160;

        private const int RivalBribeCost = 200;
        private const int RivalBribeReturn = 300;
        private const float RivalScoutChance = 0.5f;
        private const int RivalScoutGold = 250;
        private const int RivalScoutLoss = 100;

        private const int ScholarGiftGold = 200;

        private struct Pending { public Kind Kind; public string OfficerId; public int DueYear; public int DueMonth; }
        private static readonly List<Pending> _pending = new List<Pending>();

        /// <summary>지금 열린 카드 — 답하기 전까진 그대로 남는다(패널을
        /// 닫았다 다시 열어도 같은 카드, `RollForMonth()`도 새로 안 뽑는다).</summary>
        public static Card? Current { get; private set; }

        public static event Action<Card> Presented;

        /// <summary>`RealmSessionTracker`가 "정확히 한 달 넘어갔을 때만"
        /// 부른다(`ShowSummary()`와 같은 게이트 — 세이브 로드로 여러 달을
        /// 한 번에 건너뛸 때는 안 낸다).</summary>
        public static void RollForMonth()
        {
            if (Current != null) return;

            for (int i = _pending.Count - 1; i >= 0; i--)
            {
                var p = _pending[i];
                bool due = RealmCityState.Year > p.DueYear || (RealmCityState.Year == p.DueYear && RealmCityState.Month >= p.DueMonth);
                if (!due) continue;
                _pending.RemoveAt(i);
                Present(new Card(p.Kind, p.OfficerId));
                return;
            }

            if (UnityEngine.Random.value > MonthlyChance) return;
            var card = PickCard();
            if (card != null) Present(card.Value);
        }

        private static void Present(Card card)
        {
            Current = card;
            Presented?.Invoke(card);
        }

        private static Card? PickCard()
        {
            var roster = RealmCityState.RosterIds;
            if (roster.Count == 0) return null;

            var candidates = new List<Card>();
            foreach (var id in roster)
            {
                if (RealmOfficerTraits.Has(id, RealmOfficerTraits.Trait.Brave)) candidates.Add(new Card(Kind.BraveChallenge, id));
                if (RealmOfficerTraits.Has(id, RealmOfficerTraits.Trait.Cunning)) candidates.Add(new Card(Kind.CunningIntel, id));
                if (RealmOfficerTraits.Has(id, RealmOfficerTraits.Trait.Wise)) candidates.Add(new Card(Kind.WiseInvite, id));

                if (RealmOfficerTraits.IsAmbitionDone(id)) continue;
                switch (RealmOfficerTraits.AmbitionOf(id))
                {
                    case RealmOfficerTraits.Ambition.Wealth: candidates.Add(new Card(Kind.WealthChance, id)); break;
                    case RealmOfficerTraits.Ambition.Rival: candidates.Add(new Card(Kind.RivalTip, id)); break;
                    default: candidates.Add(new Card(Kind.ScholarLecture, id)); break;
                }
            }
            if (candidates.Count == 0) return null;
            return candidates[UnityEngine.Random.Range(0, candidates.Count)];
        }

        private static string OfficerName(string officerId) => RealmOfficerPool.Get(officerId)?.Name ?? officerId;

        private static string RivalCityName(string officerId)
        {
            string rivalId = RealmOfficerTraits.RivalCityOf(officerId);
            if (rivalId == null) return RealmLocalization.T("event.rival_tip.unknown", "숙적");
            return RealmEnemyCity.Get(rivalId)?.Name ?? rivalId;
        }

        private static void SchedulePending(Kind kind, string officerId, int delayMonths)
        {
            int dueMonth = RealmCityState.Month + delayMonths;
            int dueYear = RealmCityState.Year;
            while (dueMonth > 12) { dueMonth -= 12; dueYear++; }
            _pending.Add(new Pending { Kind = kind, OfficerId = officerId, DueYear = dueYear, DueMonth = dueMonth });
        }

        /// <summary>제목·본문·선택지 3개 라벨 — `RealmCommandUi`가 패널을
        /// 지을 때 쓴다. 실제 효과는 <see cref="Resolve"/>가 낸다(라벨과
        /// 효과를 한곳에서 다시 계산하지 않도록 분리).</summary>
        public static (string title, string body, string a, string b, string c) Describe(Card card)
        {
            string name = OfficerName(card.OfficerId);
            switch (card.Kind)
            {
                case Kind.BraveChallenge:
                    return (RealmLocalization.T("event.brave_challenge.title", "결투 신청"),
                        string.Format(RealmLocalization.T("event.brave_challenge.body", "{0}에게 이름 없는 무사가 결투를 신청했다."), name),
                        RealmLocalization.T("event.brave_challenge.a", "응한다"),
                        RealmLocalization.T("event.brave_challenge.b", "거절한다"),
                        string.Format(RealmLocalization.T("event.brave_challenge.c", "돈으로 무마한다(-{0}냥)"), DuelBribeGold));
                case Kind.BraveReward:
                    return (RealmLocalization.T("event.brave_reward.title", "논공행상"),
                        string.Format(RealmLocalization.T("event.brave_reward.body", "지난 결투 소문이 퍼져 {0}을 따르려는 자들이 늘었다."), name),
                        RealmLocalization.T("event.brave_reward.a", "사례를 받는다"),
                        RealmLocalization.T("event.brave_reward.b", "사양한다"),
                        RealmLocalization.T("event.brave_reward.c", "군량으로 돌린다"));
                case Kind.CunningIntel:
                    return (RealmLocalization.T("event.cunning_intel.title", "밀서"),
                        string.Format(RealmLocalization.T("event.cunning_intel.body", "{0}에게 적정 밀서가 은밀히 들어왔다."), name),
                        string.Format(RealmLocalization.T("event.cunning_intel.a", "정보를 산다(-{0}냥)"), IntelCost),
                        RealmLocalization.T("event.cunning_intel.b", "무시한다"),
                        RealmLocalization.T("event.cunning_intel.c", "역이용을 노린다"));
                case Kind.WiseInvite:
                    return (RealmLocalization.T("event.wise_invite.title", "강론 초빙"),
                        string.Format(RealmLocalization.T("event.wise_invite.body", "먼 고을의 학사가 {0}을 강론에 초빙했다."), name),
                        RealmLocalization.T("event.wise_invite.a", "응한다"),
                        RealmLocalization.T("event.wise_invite.b", "거절한다"),
                        string.Format(RealmLocalization.T("event.wise_invite.c", "예물을 보낸다(-{0}냥)"), InviteGiftCost));
                case Kind.WealthChance:
                    return (RealmLocalization.T("event.wealth_chance.title", "재물 기회"),
                        string.Format(RealmLocalization.T("event.wealth_chance.body", "{0}에게 상단이 투자를 제안했다."), name),
                        string.Format(RealmLocalization.T("event.wealth_chance.a", "크게 투자한다(-{0}냥)"), WealthBigCost),
                        RealmLocalization.T("event.wealth_chance.b", "무시한다"),
                        string.Format(RealmLocalization.T("event.wealth_chance.c", "조금만 투자한다(-{0}냥)"), WealthSmallCost));
                case Kind.RivalTip:
                    return (RealmLocalization.T("event.rival_tip.title", "숙적 첩보"),
                        string.Format(RealmLocalization.T("event.rival_tip.body", "{0}이 벼르던 숙적({1})의 허점을 첩자가 알려왔다."), name, RivalCityName(card.OfficerId)),
                        string.Format(RealmLocalization.T("event.rival_tip.a", "첩자에게 사례한다(-{0}냥)"), RivalBribeCost),
                        RealmLocalization.T("event.rival_tip.b", "무시한다"),
                        RealmLocalization.T("event.rival_tip.c", "직접 확인한다"));
                default: // ScholarLecture
                    return (RealmLocalization.T("event.scholar_lecture.title", "학사 방문"),
                        string.Format(RealmLocalization.T("event.scholar_lecture.body", "{0}을 찾아온 학사가 가르침을 청했다."), name),
                        RealmLocalization.T("event.scholar_lecture.a", "무료로 가르친다"),
                        RealmLocalization.T("event.scholar_lecture.b", "돌려보낸다"),
                        string.Format(RealmLocalization.T("event.scholar_lecture.c", "예물을 받고 가르친다(+{0}냥)"), ScholarGiftGold));
            }
        }

        /// <summary>선택 효과 — 성공/실패 결과 문구와 SFX 훅용 Ok 플래그를
        /// 낸다. 호출 뒤 <see cref="Current"/>를 비워 다음 달 새 카드가
        /// 뜰 수 있게 한다.</summary>
        public static Outcome Resolve(Card card, Choice choice)
        {
            Outcome result;
            switch (card.Kind)
            {
                case Kind.BraveChallenge: result = ResolveBraveChallenge(card, choice); break;
                case Kind.BraveReward: result = ResolveBraveReward(card, choice); break;
                case Kind.CunningIntel: result = ResolveCunningIntel(card, choice); break;
                case Kind.WiseInvite: result = ResolveWiseInvite(card, choice); break;
                case Kind.WealthChance: result = ResolveWealthChance(card, choice); break;
                case Kind.RivalTip: result = ResolveRivalTip(card, choice); break;
                default: result = ResolveScholarLecture(card, choice); break;
            }
            Current = null;
            return result;
        }

        private static Outcome ResolveBraveChallenge(Card card, Choice choice)
        {
            string name = OfficerName(card.OfficerId);
            switch (choice)
            {
                case Choice.A:
                    if (UnityEngine.Random.value < DuelWinChance)
                    {
                        RealmCityState.AddGold(DuelWinGold);
                        SchedulePending(Kind.BraveReward, card.OfficerId, ChainDelayMonths);
                        return new Outcome(string.Format(RealmLocalization.T("event.brave_challenge.win", "{0}이(가) 결투에서 이겨 명성을 얻었다(+{1}냥)."), name, DuelWinGold), true);
                    }
                    RealmCityState.TrySpendGold(DuelLoseGold);
                    return new Outcome(string.Format(RealmLocalization.T("event.brave_challenge.lose", "{0}이(가) 결투에서 져 체면을 잃었다(-{1}냥)."), name, DuelLoseGold), false);
                case Choice.C:
                    bool paid = RealmCityState.TrySpendGold(DuelBribeGold);
                    return new Outcome(paid
                        ? string.Format(RealmLocalization.T("event.brave_challenge.bribe", "돈으로 무마했다(-{0}냥)."), DuelBribeGold)
                        : RealmLocalization.T("event.brave_challenge.bribe_fail", "돈이 모자라 그냥 넘어갔다."), true);
                default: // B
                    return new Outcome(RealmLocalization.T("event.brave_challenge.refuse", "거절했다 — 별다른 일은 없었다."), true);
            }
        }

        private static Outcome ResolveBraveReward(Card card, Choice choice)
        {
            string name = OfficerName(card.OfficerId);
            switch (choice)
            {
                case Choice.B:
                    return new Outcome(RealmLocalization.T("event.brave_reward.decline", "사양했다 — 별다른 일은 없었다."), true);
                case Choice.C:
                    RealmCityState.AddGold(RewardDivertGold);
                    return new Outcome(string.Format(RealmLocalization.T("event.brave_reward.divert", "군량으로 돌렸다(+{0}냥)."), RewardDivertGold), true);
                default: // A
                    RealmCityState.AddGold(RewardAcceptGold);
                    return new Outcome(string.Format(RealmLocalization.T("event.brave_reward.accept", "{0}이(가) 사례를 받았다(+{1}냥)."), name, RewardAcceptGold), true);
            }
        }

        private static Outcome ResolveCunningIntel(Card card, Choice choice)
        {
            switch (choice)
            {
                case Choice.A:
                    if (!RealmCityState.TrySpendGold(IntelCost))
                        return new Outcome(RealmLocalization.T("event.cunning_intel.no_gold", "돈이 모자라 밀서를 못 샀다."), false);
                    if (UnityEngine.Random.value < IntelSuccessChance)
                    {
                        RealmCityState.AddGold(IntelSuccessGold);
                        return new Outcome(string.Format(RealmLocalization.T("event.cunning_intel.success", "밀서가 진짜였다(+{0}냥)."), IntelSuccessGold), true);
                    }
                    return new Outcome(RealmLocalization.T("event.cunning_intel.fail", "밀서는 헛소문이었다."), false);
                case Choice.C:
                    if (UnityEngine.Random.value < IntelCounterChance)
                    {
                        RealmCityState.AddGold(IntelCounterGold);
                        return new Outcome(string.Format(RealmLocalization.T("event.cunning_intel.counter_win", "역이용에 성공했다(+{0}냥)."), IntelCounterGold), true);
                    }
                    RealmCityState.TrySpendGold(IntelCounterLoss);
                    return new Outcome(string.Format(RealmLocalization.T("event.cunning_intel.counter_lose", "들켜 손해를 봤다(-{0}냥)."), IntelCounterLoss), false);
                default: // B
                    return new Outcome(RealmLocalization.T("event.cunning_intel.ignore", "무시했다 — 별다른 일은 없었다."), true);
            }
        }

        private static Outcome ResolveWiseInvite(Card card, Choice choice)
        {
            string name = OfficerName(card.OfficerId);
            switch (choice)
            {
                case Choice.A:
                    RealmCityState.AddGold(InviteAcceptGold);
                    return new Outcome(string.Format(RealmLocalization.T("event.wise_invite.accept", "{0}이(가) 강론 사례를 받았다(+{1}냥)."), name, InviteAcceptGold), true);
                case Choice.C:
                    bool paid = RealmCityState.TrySpendGold(InviteGiftCost);
                    return new Outcome(paid
                        ? string.Format(RealmLocalization.T("event.wise_invite.gift", "예물을 보내 덕을 쌓았다(-{0}냥)."), InviteGiftCost)
                        : RealmLocalization.T("event.wise_invite.gift_fail", "돈이 모자라 예물을 못 보냈다."), true);
                default: // B
                    return new Outcome(RealmLocalization.T("event.wise_invite.decline", "거절했다 — 별다른 일은 없었다."), true);
            }
        }

        private static Outcome ResolveWealthChance(Card card, Choice choice)
        {
            switch (choice)
            {
                case Choice.A:
                    if (!RealmCityState.TrySpendGold(WealthBigCost))
                        return new Outcome(RealmLocalization.T("event.wealth_chance.no_gold", "돈이 모자라 투자를 못 했다."), false);
                    if (UnityEngine.Random.value < WealthBigChance)
                    {
                        RealmCityState.AddGold(WealthBigGold);
                        return new Outcome(string.Format(RealmLocalization.T("event.wealth_chance.win", "투자가 크게 맞아떨어졌다(+{0}냥)."), WealthBigGold), true);
                    }
                    return new Outcome(RealmLocalization.T("event.wealth_chance.lose", "투자가 실패해 밑돈만 날렸다."), false);
                case Choice.C:
                    if (!RealmCityState.TrySpendGold(WealthSmallCost))
                        return new Outcome(RealmLocalization.T("event.wealth_chance.no_gold_small", "돈이 모자라 조금도 못 넣었다."), false);
                    RealmCityState.AddGold(WealthSmallReturn);
                    return new Outcome(string.Format(RealmLocalization.T("event.wealth_chance.small_win", "조금 넣어 안전하게 불렸다(+{0}냥)."), WealthSmallReturn - WealthSmallCost), true);
                default: // B
                    return new Outcome(RealmLocalization.T("event.wealth_chance.ignore", "무시했다 — 별다른 일은 없었다."), true);
            }
        }

        private static Outcome ResolveRivalTip(Card card, Choice choice)
        {
            string rivalName = RivalCityName(card.OfficerId);
            switch (choice)
            {
                case Choice.A:
                    if (!RealmCityState.TrySpendGold(RivalBribeCost))
                        return new Outcome(RealmLocalization.T("event.rival_tip.no_gold", "돈이 모자라 첩자에게 사례하지 못했다."), false);
                    RealmCityState.AddGold(RivalBribeReturn);
                    return new Outcome(string.Format(RealmLocalization.T("event.rival_tip.bribe", "{0} 첩보 대가로 노획물을 나눠 받았다(+{1}냥)."), rivalName, RivalBribeReturn - RivalBribeCost), true);
                case Choice.C:
                    if (UnityEngine.Random.value < RivalScoutChance)
                    {
                        RealmCityState.AddGold(RivalScoutGold);
                        return new Outcome(string.Format(RealmLocalization.T("event.rival_tip.scout_win", "직접 확인해 허점을 찾았다(+{0}냥)."), RivalScoutGold), true);
                    }
                    RealmCityState.TrySpendGold(RivalScoutLoss);
                    return new Outcome(string.Format(RealmLocalization.T("event.rival_tip.scout_lose", "정찰 중 들켜 손해를 봤다(-{0}냥)."), RivalScoutLoss), false);
                default: // B
                    return new Outcome(RealmLocalization.T("event.rival_tip.ignore", "무시했다 — 별다른 일은 없었다."), true);
            }
        }

        private static Outcome ResolveScholarLecture(Card card, Choice choice)
        {
            string name = OfficerName(card.OfficerId);
            switch (choice)
            {
                case Choice.A:
                    return new Outcome(string.Format(RealmLocalization.T("event.scholar_lecture.teach", "{0}이(가) 무료로 가르쳐 명성이 올랐다."), name), true);
                case Choice.C:
                    RealmCityState.AddGold(ScholarGiftGold);
                    return new Outcome(string.Format(RealmLocalization.T("event.scholar_lecture.gift", "예물을 받고 가르쳤다(+{0}냥)."), ScholarGiftGold), true);
                default: // B
                    return new Outcome(RealmLocalization.T("event.scholar_lecture.decline", "돌려보냈다 — 별다른 일은 없었다."), true);
            }
        }

        /// <summary>테스트 전용 — 예약된 체인 중 그 종류가 있는지만 본다
        /// (`RealmSaveState.DeleteForTest()`와 같은 결, 실제 게임 코드
        /// 경로에선 안 쓴다).</summary>
        public static bool HasPendingChain(Kind kind)
        {
            foreach (var p in _pending) if (p.Kind == kind) return true;
            return false;
        }

        /// <summary>테스트 전용 — 뜬 카드·예약된 체인을 비운다(헤드리스
        /// 반복 실행 사이 상태가 새지 않도록).</summary>
        public static void ClearForTest()
        {
            _pending.Clear();
            Current = null;
        }
    }
}
