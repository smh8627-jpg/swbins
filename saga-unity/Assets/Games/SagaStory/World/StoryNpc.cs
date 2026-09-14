using UnityEngine;
using Saga.Story.Data;
using Saga.Story.UI;

namespace Saga.Story.World
{
    /// <summary>
    /// PLAN.md 51장 "STORY 확장 — 스토리 챕터→NPC/선택/사건/관계"의 첫
    /// 칸(NPC)만 채운다. `StoryQuestState.cs` 클래스 주석이 이미 "gear/
    /// gather/visit/talk/skill/gold" 사명은 범위 밖이라고 적어 둔 대로,
    /// 이 NPC는 **말을 걸어도 아무 상태도 안 바꾼다** — 진행 중인 사명
    /// (첫 사냥·두목의 목)을 그대로 되읽어 주는 순수 잡담 한 마디뿐이다
    /// (GO `NpcBuilder.cs`의 촌장처럼 말을 걸면 사명을 시작시키거나
    /// 나그네처럼 골드를 주는 부수효과가 없다 — STORY엔 애초에 골드·
    /// 인벤토리 시스템 자체가 없어 그런 보상을 줄 데가 없다). 선택(대화
    /// 분기)·사건(월드 이벤트)·관계(호감도)는 각각 훨씬 큰 새 시스템이
    /// 필요해 이번 슬라이스엔 안 들어간다 — 다음 확장 몫으로 남긴다.
    ///
    /// GO `World/VillagerTalk.cs`와 같은 트리거 규칙(플레이어가 반경에
    /// 들어오면 쿨다운을 두고 한 줄), 시각은 `StoryEnemy.cs`처럼
    /// `CharacterVisual.SpawnFallbackCapsule`(리깅된 모델은 아직 없음 —
    /// 44장 우선순위가 Player/Enemy/Boss/Environment/Building까지만
    /// 끝났고 NPC는 그 표에 없던 새 칸이라 다음에 필요하면 따로 붙인다).
    /// </summary>
    public class StoryNpc : MonoBehaviour
    {
        private const float TalkRadius = 2f;
        private const float TalkGapSec = 30f;
        private const float LineShowSec = 5f;
        private const float NpcHeight = 1.6f;
        private static readonly Color BodyColor = new Color(0.35f, 0.5f, 0.32f); // 병졸 갑주와 다른 녹갈색 평상복

        private float _lastSaidTime = -TalkGapSec;

        private void Awake()
        {
            if (transform.Find("Visual") != null) return; // 씬 재로드 시 중복 생성 방지 — StoryEnemy.cs와 같은 결.
            BuildVisual();
            BuildTalkArea();
        }

        private void BuildVisual() =>
            CharacterVisual.SpawnFallbackCapsule(transform, NpcHeight, BodyColor);

        private void BuildTalkArea()
        {
            var talkGo = new GameObject("TalkArea");
            talkGo.transform.SetParent(transform, false);
            var col = talkGo.AddComponent<SphereCollider>();
            col.isTrigger = true;
            col.radius = TalkRadius;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!other.CompareTag("Player")) return;
            if (Time.time - _lastSaidTime < TalkGapSec) return;

            _lastSaidTime = Time.time;
            DialogueLabel.Instance?.Show($"들판의 척후병 — {Line()}", LineShowSec);
        }

        private static string Line()
        {
            if (StoryQuestState.QuestBossDone)
            {
                return "두목까지 처치하셨군요. 이 들판은 이제 안전합니다.";
            }
            if (StoryQuestState.QuestDone)
            {
                return "잡졸들은 거의 정리되셨군요. 안쪽에 두목이 아직 버티고 있습니다.";
            }
            if (StoryQuestState.Kills > 0)
            {
                return $"황건적이 아직 {StoryQuestState.KillGoal - StoryQuestState.Kills}명은 더 남았을 겁니다.";
            }
            return "이 들판에 황건적 떼가 진을 쳤습니다. 조심하십시오.";
        }
    }
}
