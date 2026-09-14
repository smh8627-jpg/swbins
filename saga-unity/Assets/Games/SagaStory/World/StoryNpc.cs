using UnityEngine;
using Saga.Story.Data;
using Saga.Story.UI;

namespace Saga.Story.World
{
    /// <summary>
    /// PLAN.md 51장 "STORY 확장 — 스토리 챕터→NPC/선택/사건/관계"의
    /// NPC·관계 두 칸을 채운다(사건은 `StoryDiscovery.cs`가 별도로 채움).
    /// `StoryQuestState.cs` 클래스 주석이 이미 "gear/gather/visit/talk/
    /// skill/gold" 사명은 범위 밖이라고 적어 둔 대로, 말을 걸어도 진행
    /// 자체(사명·골드 등)는 안 바꾼다 — GO `NpcBuilder.cs`의 촌장·나그네와
    /// 달리 부수효과가 없다(STORY엔 골드·인벤토리가 없어 줄 보상이 없다).
    ///
    /// **관계** — NPC가 아직 이 척후병 하나뿐이라 본격 호감도(수치·
    /// 사건별 증감)까지는 안 가고, `StoryNpcState.ScoutTalkCount`로 "몇
    /// 번 말을 걸었는가"만 센다 — 계속 마주칠수록 인사말 앞머리가 조금씩
    /// 데워진다. **선택**(대화 분기)은 여전히 미착수 — 새 UI(선택지
    /// 버튼)뿐 아니라 실제로 갈리는 결과가 있어야 의미가 있는데 이번
    /// 슬라이스 범위로는 장식적 분기밖에 못 만들어 다음 방향을 기다린다.
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
            StoryNpcState.AddScoutTalk();
            DialogueLabel.Instance?.Show($"들판의 척후병 — {Greeting()}{Line()}", LineShowSec);
        }

        /// <summary>관계 — 몇 번째 만남인지에 따라 인사말 앞머리만 데운다
        /// (본문 `Line()`은 그대로, 관계와 사명 진행을 서로 안 섞는다).</summary>
        private static string Greeting()
        {
            int count = StoryNpcState.ScoutTalkCount;
            if (count <= 1) return "";
            if (count <= 4) return "또 뵙는군요. ";
            return "이제 낯이 익어 마음이 놓입니다. ";
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
