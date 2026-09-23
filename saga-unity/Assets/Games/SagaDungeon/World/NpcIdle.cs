using UnityEngine;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// PLAN.md 106-4 — 서 있기만 하는 사실 모델 NPC(마을 사람·포로·상인)의 대기 동작. 같은 모델이
    /// 같은 박자로 숨 쉬지 않게 시작 위상을 흩고, 컨트롤러의 추가 대기 상태(예: 포로 `Kneel`)를
    /// 이름으로 튼다(`SetupNpcCharacterImports` 의 `ExtraIdles` — 트리거 없이 상태 이름으로 Play).
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

        /// <summary>다른 대기 상태로 부드럽게 넘어간다(포로가 풀려나면 `Idle`).</summary>
        public void SetState(string state)
        {
            stateName = state;
            if (_animator == null) _animator = GetComponentInChildren<Animator>();
            if (_animator == null) return;
            int hash = Animator.StringToHash(state);
            if (_animator.HasState(0, hash)) _animator.CrossFade(hash, 0.35f, 0);
        }

        /// <summary>리깅 프리팹을 parent 밑에 실제 크기로 심는다(Mixamo 는 사람 크기 단위로 들어온다 —
        /// `DungeonEnemy.BuildVisual` 리깅 분기와 같은 가정). 리깅이 아니면 null.</summary>
        public static GameObject SpawnRigged(GameObject prefab, Transform parent, string state, float yawDeg = 0f)
        {
            if (prefab == null || prefab.GetComponent<Animator>() == null) return null;
            var inst = Object.Instantiate(prefab, parent, false);
            inst.name = "Visual";
            inst.transform.localPosition = Vector3.zero;
            inst.transform.localRotation = Quaternion.Euler(0f, yawDeg, 0f);
            var idle = parent.GetComponent<NpcIdle>();
            if (idle == null) idle = parent.gameObject.AddComponent<NpcIdle>();
            idle.Init(state);
            CharacterVisual.EnsureBlobShadow(parent);
            return inst;
        }
    }
}
