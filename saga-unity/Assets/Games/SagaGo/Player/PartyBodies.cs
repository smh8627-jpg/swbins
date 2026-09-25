using System.Collections.Generic;
using UnityEngine;
using Saga.Go.Data;
using Saga.Go.World;

namespace Saga.Go.Player
{
    /// <summary>
    /// PLAN.md 107-6 "동료 모델" — 들판 전투에서 인물을 바꾸면 몸이 바뀐다. 주인공은 씬에 굳힌 Maria,
    /// 동료는 id 로 고른 사실 모델(등용한 "산적" = Abe, 그 밖 = 기사·농부·아낙 중 FNV 해시)을 처음 나설 때 한 번
    /// 만들어 두고 켜고 끈다. 몸은 전부 Humanoid 라 주인공과 같은 Maria.controller 를 씌워(아바타 리타깃)
    /// 걷기·공격·등반·활공·수영 상태가 그대로 돈다. Humanoid 가 아닌 모델·빠진 모델은 쓰지 않고 주인공 몸에
    /// 원소 빛깔만 입힌다(예전 방식). 무기(`WeaponVisual`)는 주인공 몸 손에만 있다.
    ///
    /// 109-7 — 도감 인물은 `GoHeroLooks` 표의 몸(역사풍 열일곱 중 하나)에 키·체격·등·허리·머리 꾸밈을 입는다(`HeroDresser`).
    /// 표 밖 id(옛 세이브의 이름 없는 동행)만 예전처럼 기사·농부·아낙 해시. 들판 인물·겨루기 상대도 <see cref="Dress"/> 로 같은 겉모습.
    /// </summary>
    [RequireComponent(typeof(PlayerController))]
    public class PartyBodies : MonoBehaviour
    {
        public const string HeroId = Saga.Go.Combat.FieldCombat.HeroId;
        public const string BanditId = "산적";

        [SerializeField] private GameObject banditBody;
        [SerializeField] private GameObject[] extraBodies;
        [SerializeField] private RuntimeAnimatorController bodyController;
        // 109-7 — 인물 몸(`GoHeroLooks.Bodies` 이름 순서)·꾸밈(`GoHeroLooks.AllGear` 순서). 씬 빌더가 채운다(몸은 로컬 전용, 없으면 null).
        [SerializeField] private string[] lookBodyNames;
        [SerializeField] private GameObject[] lookBodies;
        [SerializeField] private string[] gearNames;
        [SerializeField] private GameObject[] gearModels;

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
            if (GoHeroLooks.TryGet(memberId, out var look))
            {
                var own = LookBody(look.Body);
                if (own != null) return own;
            }
            if (extraBodies == null || extraBodies.Length == 0) return null;
            uint h = 2166136261;
            foreach (char c in memberId) { h ^= c; h *= 16777619; }
            return extraBodies[(int)(h % (uint)extraBodies.Length)];
        }

        /// <summary>표의 몸 이름 → 프리팹(이 PC 에 없으면 null).</summary>
        public GameObject LookBody(string bodyName)
        {
            if (lookBodyNames == null || lookBodies == null) return null;
            for (int i = 0; i < lookBodyNames.Length && i < lookBodies.Length; i++)
                if (lookBodyNames[i] == bodyName) return lookBodies[i];
            return null;
        }

        public GameObject GearModel(GoHeroLooks.Gear g)
        {
            if (gearNames == null || gearModels == null) return null;
            string n = g.ToString();
            for (int i = 0; i < gearNames.Length && i < gearModels.Length; i++)
                if (gearNames[i] == n) return gearModels[i];
            return null;
        }

        /// <summary>막 만든 몸에 그 인물의 키·체격·꾸밈을 입힌다(표 밖 id 는 <paramref name="baseHeight"/> 로 키만 맞춘다).</summary>
        public void Dress(GameObject inst, string memberId, float baseHeight)
        {
            if (GoHeroLooks.TryGet(memberId, out var look))
            {
                HeroDresser.Dress(inst, look, baseHeight, GearModel);
                return;
            }
            float h = HeroDresser.MeasureHeight(inst);
            if (h > 0.01f) inst.transform.localScale = inst.transform.localScale * (baseHeight / h);
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
                Dress(inst, memberId, CharacterVisual.HumanHeight);
                foreach (var col in inst.GetComponentsInChildren<Collider>()) DestroyImmediate(col); // 꾸밈 모델 몫
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
    }
}
