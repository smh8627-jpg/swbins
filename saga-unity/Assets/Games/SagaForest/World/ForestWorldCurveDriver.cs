using UnityEngine;

namespace Saga.Forest.World
{
    /// <summary>
    /// VERTICAL_SLICE_FOREST.md(saga-godot) 1절 — 곡률 중심은 플레이어
    /// 월드 좌표(godot의 `cam.x/cam.y`도 결국 플레이어를 따라가는 카메라
    /// 중심이라 같은 뜻). `Shader.SetGlobalVector`로 전역 파라미터 하나만
    /// 갱신하면 `ForestWorldCurve.shader`를 쓰는 모든 머티리얼(땅·나무·
    /// NPC 등)이 같은 값을 본다 — 개별 머티리얼마다 값을 넣을 필요 없다.
    /// </summary>
    public class ForestWorldCurveDriver : MonoBehaviour
    {
        private static readonly int CurveCenterId = Shader.PropertyToID("_SagaWorldCurveCenter");

        [SerializeField] private Transform player;

        private void Awake()
        {
            if (player == null)
            {
                var go = GameObject.FindWithTag("Player");
                if (go != null) player = go.transform;
            }
        }

        private void Update()
        {
            if (player == null) return;
            Shader.SetGlobalVector(CurveCenterId, player.position);
        }
    }
}
