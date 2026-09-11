using UnityEngine;
using Saga.Go.Data;
using Saga.Go.UI;

namespace Saga.Go.World
{
    /// <summary>
    /// PLAN.md 51장 GO 월드 확장 — LandmarksBuilder.BuildShrine()이 세운
    /// 산신당(격자 5,1) 자체가 이미 눈에 보이는 표지라 HiddenTreasure.cs와
    /// 달리 반짝이는 마커를 따로 안 둔다 — 순전히 트리거뿐인 컴포넌트.
    /// 한 번 다가가면 산신령의 가호(경험치+돈)를 받고 다시 안 뜬다.
    /// </summary>
    [RequireComponent(typeof(SphereCollider))]
    public class MountainShrine : MonoBehaviour
    {
        private const int Gx = 5;
        private const int Gy = 1;
        private const float BlessRadius = 8f;
        private const int RewardExp = 50;
        private const int RewardGold = 25;
        private const float ToastSec = 5f;

        private void Awake()
        {
            if (ShrineState.Blessed)
            {
                Destroy(gameObject);
                return;
            }
            Build();
        }

        public void Build()
        {
            float ground = TestMapData.Legend[TestMapData.TileAt(Gx, Gy)].Height;
            transform.position = TestMapData.WorldPos(Gx, Gy) + new Vector3(0, ground + 1f, 0);

            var col = GetComponent<SphereCollider>();
            col.isTrigger = true;
            col.radius = BlessRadius;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!other.CompareTag("Player")) return;
            if (!ShrineState.TryBless()) return;

            PlayerStats.AddExp(RewardExp);
            GoldState.Add(RewardGold);
            DialogueLabel.Instance?.Show(
                $"산신령의 가호를 받았다 — 경험치 +{RewardExp} · 돈 +{RewardGold}냥", ToastSec);
            Destroy(gameObject);
        }
    }
}
