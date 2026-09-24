using UnityEngine;

namespace Saga.Story.World
{
    /// <summary>
    /// PLAN.md 106-4 "캐릭터 통일" STORY 몫 — DUNGEON `NpcIdle` 과 같은 결(판별 복사). 서 있기만 하는 사실 모델 NPC 의
    /// 대기 동작: 같은 몸이 같은 박자로 숨 쉬지 않게 시작 위상을 흩는다. `SpawnRigged` 는 Mixamo 프리팹
    /// (`SetupNpcCharacterImports` 가 구운 `&lt;이름&gt;Animated.prefab`)을 이 판 사람 키로 맞춰 심는다.
    /// </summary>
    public class NpcIdle : MonoBehaviour
    {
        [SerializeField] private string stateName = "Idle";

        private Animator _animator;

        public string StateName => stateName;
        public Animator Animator => _animator;

        public void Init(string state) => stateName = state;

        private void Start()
        {
            _animator = GetComponentInChildren<Animator>();
            if (_animator == null || !_animator.isActiveAndEnabled) return;
            int hash = Animator.StringToHash(stateName);
            if (_animator.HasState(0, hash)) _animator.Play(hash, 0, Random.value);
        }

        /// <summary>리깅 프리팹을 parent 밑 "Visual" 로 심고 키를 `height` 로, 발을 parent 높이에 맞춘다. 리깅이 아니면 null(호출부가 예전 모델로 폴백).</summary>
        public static GameObject SpawnRigged(GameObject prefab, Transform parent, float height, float yawDeg = 0f, string state = "Idle")
        {
            if (prefab == null || prefab.GetComponent<Animator>() == null) return null;
            var inst = Object.Instantiate(prefab, parent, false);
            inst.name = "Visual";
            inst.transform.localPosition = Vector3.zero;
            inst.transform.localRotation = Quaternion.Euler(0f, yawDeg, 0f);
            if (TryBounds(inst, out var b) && b.size.y > 0.01f)
            {
                inst.transform.localScale *= height / b.size.y;
                TryBounds(inst, out b);
                inst.transform.position += Vector3.up * (parent.position.y - b.min.y);
            }
            var animator = inst.GetComponent<Animator>();
            animator.cullingMode = AnimatorCullingMode.CullUpdateTransforms;
            var idle = parent.GetComponent<NpcIdle>();
            if (idle == null) idle = parent.gameObject.AddComponent<NpcIdle>();
            idle.Init(state);
            CharacterVisual.EnsureBlobShadow(parent);
            return inst;
        }

        private static bool TryBounds(GameObject go, out Bounds b)
        {
            b = default;
            bool any = false;
            foreach (var r in go.GetComponentsInChildren<Renderer>(true))
            {
                if (!any) { b = r.bounds; any = true; }
                else b.Encapsulate(r.bounds);
            }
            return any;
        }
    }
}
