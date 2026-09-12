using UnityEngine;
using Saga.Dungeon.Data;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// SagaGo의 World/GameBootstrap.cs와 같은 역할(네임스페이스만 변경)
    /// — 씬이 다 올라온 뒤 저장 파일이 있으면 캐릭터 상태·위치를 되돌린다.
    /// </summary>
    public class GameBootstrap : MonoBehaviour
    {
        private void Start()
        {
            SaveState.TryLoad();
            CombineStaticBatches();
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
