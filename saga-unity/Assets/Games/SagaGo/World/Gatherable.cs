using UnityEngine;
using Saga.Go.Data;
using Saga.Go.UI;

namespace Saga.Go.World
{
    /// <summary>
    /// PLAN.md 51장 GO 월드 확장 — "수집" 콘텐츠. 들판에 흩어진 산나물을
    /// 캐면 약값으로 돈이 조금 생긴다. HiddenTreasure.cs와 같은 결(트리거
    /// 한 번, 캐면 사라짐)이지만 훨씬 흔하고 훨씬 작은 보상 — 매번 들를
    /// 이유는 아니고 "지나가다 주우면 이득"인 수준. 여러 자리를 두려고
    /// 자리·id를 필드로 받는다(HiddenTreasure는 자리가 하나라 상수로 박아
    /// 뒀지만 이건 GatherableBuilder가 여러 개를 찍어낸다).
    /// </summary>
    [RequireComponent(typeof(SphereCollider))]
    public class Gatherable : MonoBehaviour
    {
        private const float PickupRadius = 5f;
        private const int RewardGold = 8;
        private const float ToastSec = 2.5f;

        // [SerializeField] 필수 — BanditEncounter.cs·HiddenTreasure.cs와 달리
        // 이 클래스는 인스턴스마다 자리가 달라(자리를 상수로 못 박을 수 없다,
        // GatherableBuilder가 여러 개를 찍어낸다) Init()으로 받은 값이 씬
        // 파일에 실제로 저장돼야 한다 — 안 그러면 편집기 빌드 스크립트가
        // 끝난 뒤(진짜 씬 로드 시점) Awake()가 기본값(0,0,null)으로 도는
        // 문제가 생긴다.
        [SerializeField] private int gx;
        [SerializeField] private int gy;
        [SerializeField] private string spotId;

        public void Init(string spotIdIn, int gxIn, int gyIn)
        {
            spotId = spotIdIn;
            gx = gxIn;
            gy = gyIn;
        }

        /// <summary>
        /// 편집기 빌드 스크립트(Init 뒤 Build()를 직접 부름)와 실제 Play 진입
        /// (Awake, -executeMethod 배치 스크립트에서는 안 불림) 둘 다에서
        /// 안전하도록 — 이미 "Visual" 자식이 있으면(씬이 이미 채워진 채
        /// 저장돼 있으면) 다시 만들지 않는다. 이미 캤으면 자식 유무와 상관
        /// 없이 그냥 지운다.
        /// </summary>
        private void Awake()
        {
            if (GatherState.IsGathered(spotId))
            {
                Destroy(gameObject);
                return;
            }
            if (transform.Find("Visual") == null)
            {
                Build();
            }
        }

        public void Build()
        {
            float ground = TestMapData.Legend[TestMapData.TileAt(gx, gy)].Height;
            transform.position = TestMapData.WorldPos(gx, gy) + new Vector3(0, ground + 0.3f, 0);

            var visual = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            visual.name = "Visual";
            UnityEngine.Object.DestroyImmediate(visual.GetComponent<Collider>());
            visual.transform.SetParent(transform, false);
            visual.transform.localScale = Vector3.one * 0.6f;

            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "Herb (generated)" };
            mat.color = new Color(0.35f, 0.65f, 0.25f);
            visual.GetComponent<MeshRenderer>().sharedMaterial = mat;

            var col = GetComponent<SphereCollider>();
            col.isTrigger = true;
            col.radius = PickupRadius;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!other.CompareTag("Player")) return;
            if (!GatherState.TryGather(spotId)) return;

            GoldState.Add(RewardGold);
            DialogueLabel.Instance?.Show($"산나물을 캤다 — 약값으로 돈 +{RewardGold}냥", ToastSec);
            Destroy(gameObject);
        }
    }
}
