using UnityEngine;
using Saga.Go.Data;
using Saga.Go.UI;

namespace Saga.Go.World
{
    /// <summary>
    /// PLAN.md 51장 GO 월드 확장 — 동쪽 확장(2026-09-12, TestMapData col7~8)
    /// 숲 공터(격자 7,3)에 심은 첫 콘텐츠. HiddenTreasure.cs와 같은 결(트리거
    /// 한 번, 작은 마커, 발견하면 보상) — 다만 굴 보물처럼 무기를 주는 대신
    /// 소소한 경험치·돈만 주는 가벼운 발견이라 새 ItemData를 안 늘린다.
    /// WorldEventState(2026-09-12에 GatherState.cs처럼 id 집합으로 일반화된
    /// 것)를 그대로 재사용 — 그 일반화 뒤 처음 생긴 네 번째 이벤트.
    /// </summary>
    [RequireComponent(typeof(SphereCollider))]
    public class EastGroveRelic : MonoBehaviour
    {
        private const int Gx = 7;
        private const int Gy = 3;
        private const string EventId = "east_grove_relic";
        private const float PickupRadius = 6f;
        private const int RewardExp = 20;
        private const int RewardGold = 15;
        private const float ToastSec = 4f;

        private void Awake()
        {
            if (WorldEventState.IsTriggered(EventId))
            {
                Destroy(gameObject);
                return;
            }
            // 이미 저장된 씬을 실제 Play로 열면 Awake가 다시 불려 Build()를
            // 또 돌리는데, 편집기 빌드 스크립트가 이미 자식을 만들어 둔
            // 뒤라 그대로 두면 돌기둥이 두 벌씩 겹쳐 생긴다 — NpcBuilder.cs와
            // 같은 방어(2026-09-12 GLB 교체 때 같이 발견한 패턴, 여기 뒤늦게
            // 적용).
            if (transform.childCount > 0) return;
            Build();
        }

        public void Build()
        {
            float ground = TestMapData.Legend[TestMapData.TileAt(Gx, Gy)].Height;
            transform.position = TestMapData.WorldPos(Gx, Gy) + new Vector3(0, ground, 0);

            // 살짝 기울어진 낡은 돌기둥 — HiddenTreasure의 반짝이는 구슬과
            // 달리 발광 없이도 숲 사이에서 눈에 띄게 크기만으로 구분한다.
            var visual = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            visual.name = "Visual";
            Object.DestroyImmediate(visual.GetComponent<Collider>());
            visual.transform.SetParent(transform, false);
            visual.transform.localScale = new Vector3(0.6f, 0.9f, 0.6f);
            visual.transform.localPosition = new Vector3(0f, 0.9f, 0f);
            visual.transform.localRotation = Quaternion.Euler(12f, 0f, 6f);

            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "Relic (generated)" };
            mat.color = new Color(0.62f, 0.6f, 0.56f);
            visual.GetComponent<MeshRenderer>().sharedMaterial = mat;

            var col = GetComponent<SphereCollider>();
            col.isTrigger = true;
            col.radius = PickupRadius;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!other.CompareTag("Player")) return;
            if (!WorldEventState.TryTrigger(EventId)) return;

            PlayerStats.AddExp(RewardExp);
            GoldState.Add(RewardGold);
            DialogueLabel.Instance?.Show(
                $"낡은 돌기둥을 발견했다 — 오래전 누군가의 흔적. 경험치 +{RewardExp} · 돈 +{RewardGold}냥", ToastSec);
            Destroy(gameObject);
        }
    }
}
