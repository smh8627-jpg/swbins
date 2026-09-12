using UnityEngine;
using Saga.Forest.Data;

namespace Saga.Forest.World
{
    /// <summary>
    /// VERTICAL_SLICE_FOREST.md — GO/DUNGEON의 World/GameBootstrap.cs와
    /// 같은 역할(네임스페이스만 변경) — 씬이 다 올라온 뒤 저장 파일이
    /// 있으면 위치·채집 개수를 되돌린다. 이 슬라이스엔 정적 배칭할
    /// 대상(DUNGEON의 "Room"처럼 매번 새로 만드는 메시)이 따로 없어
    /// `CombineStaticBatches()` 같은 절차는 아직 없다.
    /// </summary>
    public class ForestBootstrap : MonoBehaviour
    {
        private void Start()
        {
            ForestSaveState.TryLoad();
        }
    }
}
