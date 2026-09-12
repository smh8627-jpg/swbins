using System;

namespace Saga.Dungeon.Data
{
    /// <summary>
    /// PLAN.md(saga-dungeon 웹판) 36장 "퀘스트 시스템" — 최소한
    /// 메인/지역/랜덤/이벤트 퀘스트를 지원하라는 요구 중 이 슬라이스는
    /// **메인 퀘스트 한 줄**만 놓는다(지역·랜덤·이벤트 퀘스트는 다음
    /// 슬라이스, 이 판은 아직 NPC 퀘스트 발주자 자체가 없다). 기존 방
    /// 진행(두목→미니보스→구출)을 그대로 목표로 삼아 **새 콘텐츠를 안
    /// 늘리고 이미 있는 이정표에 이름과 보상만 붙였다** — GO의
    /// QuestState.cs(촌장 대사 3단계)와 달리 이 판엔 대사 NPC가 없어
    /// 진행은 순수 폴링(`Poll()`, `GameBootstrap.Update()`가 매 프레임
    /// 부른다)과 완료 콜백(`MarkCaptiveFreed()`, `DungeonCaptive.cs`가
    /// 직접 부른다)으로 감지한다. 두목·미니보스는 기존 `BestiaryState`
    /// (도감 슬라이스가 이미 처치 시 이름을 기록해 둔다)를 그대로 재사용 —
    /// `DungeonEnemy.cs`를 안 건드리고 완료를 감지할 수 있다.
    ///
    /// **첫 버전(2026-09-12)의 결함을 여기서 고쳤다** — 세 목표를 단일
    /// `Stage` 열거값으로만 관리했더니, 순서를 벗어나(예: 미니보스보다
    /// 구출을 먼저) 끝내면 그 완료가 조용히 무시되고 다시는 인정되지
    /// 않았다(방 종류 마지막 슬라이스 이후로는 Room3→Room4를 순서대로
    /// 지나야 해 실제로는 거의 못 벗어나지만, 이론상 남아 있던 결함).
    /// 지금은 세 목표를 **각자 독립된 플래그**로 추적해 어떤 순서로
    /// 끝내도 그 즉시 인정되고, `Stage`(표시용)는 "순서대로 아직 안 끝난
    /// 첫 목표"를 매번 다시 계산해 보여 주는 파생값일 뿐이다.
    /// </summary>
    public static class QuestState
    {
        public enum Stage { HuntBoss, HuntMiniboss, Rescue, Done }

        private const string BossName = "황건적 두목";
        private const string MinibossName = "황건 살수";

        private const int StageRewardExp = 25;
        private const int StageRewardGold = 10;

        private static bool _bossDead;
        private static bool _minibossDead;
        private static bool _captiveFreed;

        public static bool BossDead => _bossDead;
        public static bool MinibossDead => _minibossDead;
        public static bool CaptiveFreed => _captiveFreed;

        /// <summary>순서대로 아직 안 끝난 첫 목표 — 실제 진행(위 세 플래그)에서
        /// 매번 다시 계산한다. HUD 표시용일 뿐 진행 상태 자체는 아니다.</summary>
        public static Stage Current
        {
            get
            {
                if (!_bossDead) return Stage.HuntBoss;
                if (!_minibossDead) return Stage.HuntMiniboss;
                if (!_captiveFreed) return Stage.Rescue;
                return Stage.Done;
            }
        }

        /// <summary>완료된 단계·보상 문구를 함께 넘긴다 — DialogueLabel
        /// 토스트·HUD 갱신에 그대로 쓸 수 있게.</summary>
        public static event Action<Stage, string> StageCompleted;

        public static string ObjectiveText => Current switch
        {
            Stage.HuntBoss => "메인 퀘스트 — 황건적 두목을 처치하라",
            Stage.HuntMiniboss => "메인 퀘스트 — 황건 살수(미니보스)를 처치하라",
            Stage.Rescue => "메인 퀘스트 — 갇힌 인영을 구출하라",
            _ => "메인 퀘스트 — 완료(던전을 정리했다)",
        };

        /// <summary>GameBootstrap.Update()가 매 프레임 부른다 — 두목·미니보스
        /// 처치는 별도 콜백 없이 도감 기록만 보고 판정한다.</summary>
        public static void Poll()
        {
            if (!_bossDead && BestiaryState.IsDiscovered(BossName))
            {
                Complete(ref _bossDead, "황건적 두목을 처치했다");
            }
            if (!_minibossDead && BestiaryState.IsDiscovered(MinibossName))
            {
                Complete(ref _minibossDead, "황건 살수를 처치했다");
            }
        }

        /// <summary>DungeonCaptive.cs가 구출 완료 시 직접 부른다 — 도감처럼
        /// 폴링만으로 감지할 표시가 없어서(구출은 몬스터가 아니다). 순서와
        /// 무관하게 항상 인정된다(위 클래스 주석 "결함" 참고).</summary>
        public static void MarkCaptiveFreed()
        {
            if (!_captiveFreed) Complete(ref _captiveFreed, "갇힌 인영을 구출했다");
        }

        private static void Complete(ref bool flag, string completedText)
        {
            flag = true;
            HeroState.AddExp(StageRewardExp);
            HeroState.AddGold(StageRewardGold);
            string msg = $"📜 {completedText} — 퀘스트 보상 경험치 +{StageRewardExp} · 돈 +{StageRewardGold}냥";
            StageCompleted?.Invoke(Current, msg);
        }

        /// <summary>SaveState v4 — 세 플래그를 직접 저장한다(위 클래스 주석
        /// 참고). v3 이하 세이브는 옛 단일 stage 정수를 대신 넘겨받아
        /// 등가 플래그로 환산한다(`RestoreLegacyStage`).</summary>
        public static void Restore(bool bossDead, bool minibossDead, bool captiveFreed)
        {
            _bossDead = bossDead;
            _minibossDead = minibossDead;
            _captiveFreed = captiveFreed;
        }

        public static void RestoreLegacyStage(int stage)
        {
            int clamped = Math.Clamp(stage, 0, (int)Stage.Done);
            _bossDead = clamped >= (int)Stage.HuntMiniboss;
            _minibossDead = clamped >= (int)Stage.Rescue;
            _captiveFreed = clamped >= (int)Stage.Done;
        }
    }
}
