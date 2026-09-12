using UnityEngine;
using Saga.Story.Data;

namespace Saga.Story.World
{
    /// <summary>
    /// SagaDungeon/SagaGo의 World/GameBootstrap.cs와 같은 역할(네임스페이스만
    /// 변경) — 씬이 다 올라온 뒤 저장 파일이 있으면 위치·사명 진행도를
    /// 되돌린다. 이 슬라이스는 레벨업·오디오 훅이 없어 그만큼 더 짧다.
    /// </summary>
    public class GameBootstrap : MonoBehaviour
    {
        private void Start()
        {
            StorySaveState.TryLoad();
        }
    }
}
