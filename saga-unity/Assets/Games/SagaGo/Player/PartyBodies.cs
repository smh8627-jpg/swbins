using System.Collections.Generic;
using UnityEngine;
using Saga.Go.World;

namespace Saga.Go.Player
{
    /// <summary>
    /// PLAN.md 107-6 "동료 모델" — 들판 전투에서 인물을 바꾸면 몸이 바뀐다. 주인공은 씬에 굳힌 Maria,
    /// 동료는 id 로 고른 사실 모델(등용한 "산적" = Abe, 그 밖 = 기사·농부·아낙 중 FNV 해시)을 처음 나설 때 한 번
    /// 만들어 두고 켜고 끈다. 몸은 전부 Humanoid 라 주인공과 같은 Maria.controller 를 씌워(아바타 리타깃)
    /// 걷기·공격·등반·활공·수영 상태가 그대로 돈다. Humanoid 가 아닌 모델·빠진 모델은 쓰지 않고 주인공 몸에
    /// 원소 빛깔만 입힌다(예전 방식). 무기(`WeaponVisual`)는 주인공 몸 손에만 있다.
    /// </summary>
    [RequireComponent(typeof(PlayerController))]
    public class PartyBodies : MonoBehaviour
    {
        public const string HeroId = Saga.Go.Combat.FieldCombat.HeroId;
        public const string BanditId = "산적";

        [SerializeField] private GameObject banditBody;
        [SerializeField] private GameObject[] extraBodies;
        [SerializeField] private RuntimeAnimatorController bodyController;

        private PlayerController _pc;
        private Transform _heroVisual;
        private Animator _heroAnimator;
        private readonly Dictionary<string, Body> _bodies = new Dictionary<string, Body>();

        private class Body
        {
            public Transform Visual;
            public Animator Animator;
        }

        public string ShownId { get; private set; } = HeroId;
        /// <summary>109-6 — 들판 인물(겨루기 상대)도 동행이 됐을 때와 같은 몸·같은 컨트롤러를 쓴다.</summary>
        public RuntimeAnimatorController BodyController => bodyController;
        public Transform HeroVisual => _heroVisual;

        private void Awake()
        {
            _pc = GetComponent<PlayerController>();
            _heroVisual = _pc.Visual;
            _heroAnimator = _pc.Animator;
        }

        /// <summary>이 인물이 쓸 몸 모델(없으면 null = 주인공 몸 + 빛깔).</summary>
        public GameObject PrefabFor(string memberId)
        {
            if (string.IsNullOrEmpty(memberId) || memberId == HeroId) return null;
            if (memberId == BanditId) return banditBody;
            if (extraBodies == null || extraBodies.Length == 0) return null;
            uint h = 2166136261;
            foreach (char c in memberId) { h ^= c; h *= 16777619; }
            return extraBodies[(int)(h % (uint)extraBodies.Length)];
        }

        /// <summary>그 인물의 몸을 보인다. 제 몸이 있으면 true, 주인공 몸으로 대신하면 false.</summary>
        public bool Show(string memberId)
        {
            if (_pc == null) Awake();
            Body body = memberId == HeroId ? null : GetOrBuild(memberId);
            if (body == null)
            {
                if (_heroVisual != null) _pc.SetBody(_heroVisual, _heroAnimator);
                ShownId = HeroId;
                return false;
            }
            _pc.SetBody(body.Visual, body.Animator);
            ShownId = memberId;
            return true;
        }

        private Body GetOrBuild(string memberId)
        {
            if (_bodies.TryGetValue(memberId, out var cached)) return cached;
            var prefab = PrefabFor(memberId);
            Body body = null;
            if (prefab != null)
            {
                var inst = Instantiate(prefab, transform);
                inst.name = $"Body_{memberId}";
                inst.transform.localPosition = Vector3.zero;
                inst.transform.localRotation = Quaternion.identity;
                foreach (var col in inst.GetComponentsInChildren<Collider>()) DestroyImmediate(col); // 제 CharacterController·카메라 pull-in 과 안 부딪게
                float h = MeasureHeight(inst);
                if (h > 0.01f) inst.transform.localScale = inst.transform.localScale * (CharacterVisual.HumanHeight / h);
                var anim = inst.GetComponentInChildren<Animator>();
                if (anim != null && anim.isHuman && bodyController != null)
                {
                    anim.runtimeAnimatorController = bodyController;
                    anim.applyRootMotion = false;
                    anim.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                    inst.SetActive(false);
                    body = new Body { Visual = inst.transform, Animator = anim };
                }
                else
                {
                    Debug.LogWarning($"[PartyBodies] {prefab.name} 가 Humanoid 가 아니거나 컨트롤러가 없음 — {memberId} 는 주인공 몸에 빛깔로 대신");
                    Destroy(inst);
                }
            }
            _bodies[memberId] = body;
            return body;
        }

        private static float MeasureHeight(GameObject go)
        {
            var renderers = go.GetComponentsInChildren<Renderer>();
            if (renderers.Length == 0) return 0f;
            var b = renderers[0].bounds;
            foreach (var r in renderers) b.Encapsulate(r.bounds);
            return b.size.y;
        }
    }
}
