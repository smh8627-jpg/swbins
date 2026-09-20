using UnityEngine;
using Saga.Forest.Data;
using Saga.Forest.UI;

namespace Saga.Forest.World
{
    /// <summary>
    /// PLAN.md 101-2 5.7 FOREST "택배 사슬" 접수대 — `ForestFurnitureStall.cs`와
    /// 같은 결(다가가면 쿨다운 걸고 하나 뽑는다)로, 소포 종류(보통/깨지기
    /// 쉬움/시간제한)와 목적지(네 바이옴 존 중 하나)를 무작위로 접수한다.
    /// 이미 들고 있으면 접수를 거절하고 지금 든 소포 안내만 다시 띄운다.
    /// </summary>
    public class ForestDeliveryCounter : MonoBehaviour
    {
        private const float InteractRadius = 1.2f;
        private const float CooldownSec = 3f;
        private const float ToastSec = 4f;

        private readonly System.Random _rng = new System.Random(20260824); // 루트 CLAUDE.md 진단 시드 관례.
        private Transform _player;
        private float _cooldownLeft;

        private void Awake()
        {
            if (transform.childCount == 0) BuildVisual();
            var playerGo = GameObject.FindWithTag("Player");
            _player = playerGo != null ? playerGo.transform : null;
        }

        private void BuildVisual()
        {
            var crate = GameObject.CreatePrimitive(PrimitiveType.Cube);
            crate.name = "Visual";
            crate.transform.SetParent(transform, false);
            crate.transform.localScale = new Vector3(1f, 0.9f, 1f);
            crate.transform.localPosition = new Vector3(0f, 0.45f, 0f);
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "ForestDeliveryCounter (generated)" };
            mat.color = new Color(0.75f, 0.35f, 0.15f);
            crate.GetComponent<MeshRenderer>().sharedMaterial = mat;
        }

        private void Update()
        {
            if (_cooldownLeft > 0f) _cooldownLeft -= Time.deltaTime;
            if (_player == null || _cooldownLeft > 0f) return;
            if (Vector3.Distance(transform.position, _player.position) > InteractRadius) return;

            _cooldownLeft = CooldownSec;

            if (ForestDeliveryState.Carrying)
            {
                string zoneName = ForestBiomeData.Zones[ForestDeliveryState.TargetIndex].DisplayName;
                DialogueLabel.Instance?.Show(
                    string.Format(ForestLocalization.T("delivery.already_carrying", "택배 — 지금 {0}(으)로 갈 소포를 들고 있다."), zoneName),
                    ToastSec);
                return;
            }

            var kind = PickKind();
            int targetIndex = _rng.Next(ForestBiomeData.Zones.Length);
            ForestDeliveryState.TryPickup(kind, targetIndex);

            string dest = ForestBiomeData.Zones[targetIndex].DisplayName;
            string kindLabel = kind switch
            {
                ForestDeliveryState.Kind.Fragile => ForestLocalization.T("delivery.kind_fragile", "깨지기 쉬움(달리면 파손!)"),
                ForestDeliveryState.Kind.Timed => ForestLocalization.T("delivery.kind_timed", "시간제한(45초 안에!)"),
                _ => ForestLocalization.T("delivery.kind_normal", "보통"),
            };
            DialogueLabel.Instance?.Show(
                string.Format(ForestLocalization.T("delivery.pickup_toast", "택배 접수 — 목적지: {0} · 소포: {1}"), dest, kindLabel),
                ToastSec);
        }

        private ForestDeliveryState.Kind PickKind()
        {
            int roll = _rng.Next(4); // 0~1 보통(50%) · 2 깨지기 쉬움(25%) · 3 시간제한(25%).
            if (roll == 2) return ForestDeliveryState.Kind.Fragile;
            if (roll == 3) return ForestDeliveryState.Kind.Timed;
            return ForestDeliveryState.Kind.Normal;
        }
    }
}
