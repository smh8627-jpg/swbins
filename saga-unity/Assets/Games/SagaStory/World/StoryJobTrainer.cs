using UnityEngine;
using Saga.Story.Data;
using Saga.Story.UI;

namespace Saga.Story.World
{
    /// <summary>
    /// PLAN.md 51장 "STORY 확장 — 전직·SP 투자 UI"(saga-godot
    /// `story_job_trainer.gd`가 정본 — 이 세션의 출처). **재해석** —
    /// 원작(godot)은 "SP 투자"까지 같은 자리에서 겸하지만, 이 포트엔 직업별
    /// 무예(job-specific skill) 자체가 없다(STORY엔 아직 연참·횡소·기탄·
    /// 기합 네 무예뿐, 전부 직업 공통 — `StoryCombat.cs` JobsTier1 클래스
    /// 주석 참고) — SP 투자는 범위 밖으로 명시적으로 남긴다(godot 쪽도
    /// 처음엔 grow만 옮기고 SP는 다음 걸음이었다, 같은 경계).
    ///
    /// `StoryNpc.cs`와 같은 트리거 규칙(반경+쿨다운, 다가가면 자동 반응).
    /// 1차 전직(Lv.10, 무사·궁수·협객·방사 중 하나)만 옮긴다 — 2~4차 전직
    /// 체인은 이 포트에 아직 없는 job 데이터가 더 필요해 범위 밖.
    /// </summary>
    public class StoryJobTrainer : MonoBehaviour
    {
        private const float TalkRadius = 2f;
        private const float TalkGapSec = 15f;
        private const float LineShowSec = 4f;
        private const float NpcHeight = 1.6f;
        private static readonly Color BodyColor = new Color(0.55f, 0.42f, 0.18f); // 척후병(녹갈색)과 다른 갈색 계열

        [SerializeField] private GameObject modelPrefab; // BuildTestStoryScene.cs가 채운다(StoryNpc.cs와 같은 결).

        private float _lastShownTime = -TalkGapSec;

        private void Awake()
        {
            if (transform.Find("Visual") != null) return; // 씬 재로드 시 중복 생성 방지.
            BuildVisual();
            BuildTalkArea();
        }

        private void BuildVisual()
        {
            if (modelPrefab != null)
            {
                CharacterVisual.Spawn(modelPrefab, transform, NpcHeight, BodyColor);
            }
            else
            {
                CharacterVisual.SpawnFallbackCapsule(transform, NpcHeight, BodyColor);
            }
        }

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
            if (Time.time - _lastShownTime < TalkGapSec) return;
            _lastShownTime = Time.time;

            if (StoryJobState.CanChooseJob)
            {
                ShowChoice();
                return;
            }

            DialogueLabel.Instance?.Show($"{TrainerName} — {StatusText()}", LineShowSec);
        }

        private static string TrainerName => StoryLocalization.T("npc.trainer_name", "전직관");

        private void ShowChoice()
        {
            var ui = StoryJobChoiceUi.Instance;
            if (ui == null)
            {
                DialogueLabel.Instance?.Show($"{TrainerName} — {StatusText()}", LineShowSec);
                return;
            }

            ui.Show(
                StoryLocalization.T("npc.trainer_choice_prompt", "전직할 수 있습니다 — 원하는 길을 고르세요"),
                jobKey =>
                {
                    bool ok = StoryJobState.ChooseJob(jobKey);
                    if (ok)
                    {
                        var info = StoryCombat.JobsTier1[jobKey];
                        string mpPart = info.Mp > 0f
                            ? string.Format(StoryLocalization.T("npc.trainer_chosen_mp_suffix", " 기력+{0}"), Mathf.RoundToInt(info.Mp))
                            : "";
                        string name = StoryLocalization.T($"job.{jobKey}", info.Name);
                        // info.Hp(grow.hp)는 메시지에 안 넣는다 — 이 슬라이스는 플레이어가
                        // 안 맞아(StoryCombat.StartHp 주석 참고) 체력 상한이 어디에도 안
                        // 쓰인다, "체력+N"을 보여주면 실제로 안 일어나는 효과를 약속하는 셈.
                        DialogueLabel.Instance?.Show(string.Format(
                            StoryLocalization.T("npc.trainer_chosen", "{0} — {1}로 전직! 공격+{2}{3}"),
                            TrainerName, name, Mathf.RoundToInt(info.Atk), mpPart), LineShowSec);
                    }
                    else
                    {
                        DialogueLabel.Instance?.Show($"{TrainerName} — {StatusText()}", LineShowSec);
                    }
                });
        }

        private static string StatusText()
        {
            if (StoryJobState.HasJob)
            {
                string name = StoryLocalization.T($"job.{StoryJobState.Job}", StoryJobState.JobDisplayName);
                return string.Format(StoryLocalization.T("npc.trainer_status_done", "🎖️ {0} Lv.{1}"), name, StoryJobState.Level);
            }
            if (StoryJobState.Level < StoryCombat.JobChangeLevel)
            {
                return string.Format(StoryLocalization.T("npc.trainer_status_locked", "전직은 Lv.{0}부터(현재 Lv.{1})"),
                    StoryCombat.JobChangeLevel, StoryJobState.Level);
            }
            return StoryLocalization.T("npc.trainer_status_ready", "전직할 수 있습니다");
        }
    }
}
