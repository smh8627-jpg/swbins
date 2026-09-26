using UnityEngine;
using Saga.Story.Data;
using Saga.Story.UI;

namespace Saga.Story.World
{
    /// <summary>
    /// PLAN.md 72~73장 World Event / Hidden Area + 51장 "STORY 확장 —
    /// 사건" — GO `World/HiddenTreasure.cs`와 같은 결(다섯 판 공용 로직
    /// 복사 관례). 발판 다섯 자리 중 가장 높은 곳(#3, 4.4m — 4절 "제외"
    /// 목록에 없던 첫 "정확히 뛰어야 닿는" 지점)에 한 번뿐인 발견을
    /// 둔다. 아이템/골드가 없는 판이라(STORY엔 인벤토리·경제 자체가 없다
    /// — `StoryQuestState.cs` 클래스 주석 참고) GO식 전리품 대신 이미
    /// 있는 자원인 MP를 가득 채워 준다 — 새 보상 체계를 안 만들고
    /// `StoryCombat.RestoreMp`를 그대로 재사용.
    /// </summary>
    [RequireComponent(typeof(SphereCollider))]
    public class StoryDiscovery : MonoBehaviour
    {
        public const string EventId = "field_lookout"; // PlaytestStorySlice.cs가 직접 참조.
        private const float PickupRadius = 2f;
        private const float ToastSec = 6f;

        private void Awake()
        {
            if (StoryWorldEventState.IsTriggered(EventId))
            {
                Destroy(gameObject);
                return;
            }
            if (transform.childCount > 0) return; // 씬 재로드 시 중복 생성 방지 — StoryNpc.cs와 같은 결.
            Build();
        }

        public void Build()
        {
            var visual = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            visual.name = "Visual";
            Object.DestroyImmediate(visual.GetComponent<Collider>());
            visual.transform.SetParent(transform, false);
            visual.transform.localScale = Vector3.one * 0.6f;

            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "Lookout (generated)" };
            mat.color = new Color(0.3f, 0.75f, 0.95f);
            mat.EnableKeyword("_EMISSION");
            mat.SetColor("_EmissionColor", new Color(0.15f, 0.5f, 0.7f));
            visual.GetComponent<MeshRenderer>().sharedMaterial = mat;

            var col = GetComponent<SphereCollider>();
            col.isTrigger = true;
            col.radius = PickupRadius;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!other.CompareTag("Player")) return;
            if (!StoryWorldEventState.TryTrigger(EventId)) return;

            StoryCombat.RestoreMp(StoryCombat.MpMax);
            DialogueLabel.Instance?.Show(
                StoryLocalization.T("discovery.lookout", "발판 위 망루를 발견했다 — 잠시 숨을 고르니 내공이 가득 찼다."), ToastSec);
            Destroy(gameObject);
        }
    }
}
