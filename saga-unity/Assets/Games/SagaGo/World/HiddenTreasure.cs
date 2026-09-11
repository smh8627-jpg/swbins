using UnityEngine;
using Saga.Go.Data;
using Saga.Go.UI;

namespace Saga.Go.World
{
    /// <summary>
    /// PLAN.md 72~73장 World Event / Hidden Area — 굴 입구
    /// (LandmarksBuilder.BuildCave, 격자 3,0) 옆에 반짝이는 무언가를 하나
    /// 둔다. BanditEncounter처럼 사건 선택지 UI까지는 필요 없다 — 그냥
    /// "발견"이라 VillagerTalk 수준의 단순 트리거로 충분하다. 한 번 찾으면
    /// WorldEventState가 기억해 두고, 세이브를 불러온 씬에서는 Awake에서
    /// 바로 스스로를 지워 다시 안 나오게 한다.
    /// </summary>
    [RequireComponent(typeof(SphereCollider))]
    public class HiddenTreasure : MonoBehaviour
    {
        private const int Gx = 3;
        private const int Gy = 0;

        // 굴 입구 상자(LandmarksBuilder.BuildCave, 크기 10x6x4)를 안 가리게
        // 옆으로 비켜 둔다.
        private static readonly Vector3 LocalOffset = new Vector3(7f, 0.8f, 0f);

        private const float PickupRadius = 6f;
        private const int RewardExp = 30;
        private const string RewardItemId = "wp_relic";
        private const float ToastSec = 5f;

        private void Awake()
        {
            if (WorldEventState.CaveTreasureFound)
            {
                Destroy(gameObject);
                return;
            }
            Build();
        }

        public void Build()
        {
            float ground = TestMapData.Legend[TestMapData.TileAt(Gx, Gy)].Height;
            transform.position = TestMapData.WorldPos(Gx, Gy) + LocalOffset + new Vector3(0, ground, 0);

            var visual = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            visual.name = "Visual";
            UnityEngine.Object.DestroyImmediate(visual.GetComponent<Collider>());
            visual.transform.SetParent(transform, false);
            visual.transform.localScale = Vector3.one * 1.2f;

            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "Treasure (generated)" };
            mat.color = new Color(1f, 0.85f, 0.2f);
            mat.EnableKeyword("_EMISSION");
            mat.SetColor("_EmissionColor", new Color(0.8f, 0.6f, 0.05f));
            visual.GetComponent<MeshRenderer>().sharedMaterial = mat;

            var col = GetComponent<SphereCollider>();
            col.isTrigger = true;
            col.radius = PickupRadius;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!other.CompareTag("Player")) return;
            if (!WorldEventState.TryFindCaveTreasure()) return;

            Inventory.AddItem(RewardItemId);
            PlayerStats.AddExp(RewardExp);
            var item = ItemData.Get(RewardItemId);
            DialogueLabel.Instance?.Show(
                $"숨겨진 보물을 발견했다! {item?.Name}을(를) 얻었다. 경험치 +{RewardExp}", ToastSec);
            Destroy(gameObject);
        }
    }
}
