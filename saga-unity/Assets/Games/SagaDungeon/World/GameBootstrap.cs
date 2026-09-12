using UnityEngine;
using Saga.Dungeon.Audio;
using Saga.Dungeon.Data;
using Saga.Dungeon.UI;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// SagaGo의 World/GameBootstrap.cs와 같은 역할(네임스페이스만 변경)
    /// — 씬이 다 올라온 뒤 저장 파일이 있으면 캐릭터 상태·위치를 되돌린다.
    /// "퀘스트 시스템" 슬라이스 — QuestState는 NPC 발주자 없이 순수
    /// 폴링으로 진행을 감지해(Data/QuestState.cs 참고) 매 프레임 확인할
    /// 곳이 필요한데, 새 GameObject를 늘리지 않고 이미 씬에 하나뿐인 이
    /// 컴포넌트의 Update()에 얹었다.
    /// </summary>
    public class GameBootstrap : MonoBehaviour
    {
        private void Start()
        {
            SaveState.TryLoad();
            CombineStaticBatches();
            QuestState.StageCompleted += OnQuestStageCompleted;
            HeroState.LeveledUp += OnLeveledUp; // "사운드" 슬라이스 — PLAN.md 37장, 레벨업 신호음.
        }

        private void OnDestroy()
        {
            QuestState.StageCompleted -= OnQuestStageCompleted;
            HeroState.LeveledUp -= OnLeveledUp;
        }

        private void OnLeveledUp(int newLevel)
        {
            SfxPlayer.PlayLevelUp();
        }

        private void Update()
        {
            QuestState.Poll();
        }

        private void OnQuestStageCompleted(QuestState.Stage stage, string message)
        {
            DialogueLabel.Instance?.Show(message, 5f);
        }

        /// <summary>PLAN.md 76장 Mobile Performance Pass — Room은 Awake()에서
        /// 매번 새로 만드는 메시라 빌드타임 정적 배칭 대상이 아니다.</summary>
        private void CombineStaticBatches()
        {
            var root = GameObject.Find("Room");
            if (root != null)
            {
                StaticBatchingUtility.Combine(root);
            }
        }
    }
}
