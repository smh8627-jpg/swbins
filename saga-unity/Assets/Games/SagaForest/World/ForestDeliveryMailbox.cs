using System.Collections.Generic;
using UnityEngine;
using Saga.Forest.Data;
using Saga.Forest.UI;

namespace Saga.Forest.World
{
    /// <summary>
    /// PLAN.md 101-2 5.7 FOREST "택배 사슬" 목적지 우체통 — 네 바이옴 존
    /// (<see cref="ForestBiomeData.Zones"/>)마다 하나씩 세운다(`Editor/
    /// BuildTestVillageForestScene.cs` `BuildDeliveryMailboxes()`).
    /// `ForestCollectSpot.cs`와 같은 결로 정적 위치 표를 둔다 — 지금은
    /// 안 쓰이지만 나중에 목표판(GoalBoard)이 "지금" 줄에 배달 목적지
    /// 거리를 보여줄 때 `PositionOf`를 그대로 재사용할 수 있다.
    /// </summary>
    public class ForestDeliveryMailbox : MonoBehaviour
    {
        private const float InteractRadius = 2f;
        private const float ToastSec = 4f;

        [SerializeField] private int zoneIndex;

        private static readonly Dictionary<int, Vector3> Positions = new Dictionary<int, Vector3>();

        public static Vector3 PositionOf(int index) =>
            Positions.TryGetValue(index, out var p) ? p : Vector3.zero;

        private Transform _player;
        private Transform _visual;
        private float _cooldownLeft;

        private void Awake()
        {
            Positions[zoneIndex] = transform.position;
            if (transform.childCount == 0) BuildVisual();
            _visual = transform.Find("Visual");
            var playerGo = GameObject.FindWithTag("Player");
            _player = playerGo != null ? playerGo.transform : null;
        }

        private void BuildVisual()
        {
            var post = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            post.name = "Visual";
            post.transform.SetParent(transform, false);
            post.transform.localScale = new Vector3(0.4f, 0.7f, 0.4f);
            post.transform.localPosition = new Vector3(0f, 0.7f, 0f);
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "ForestDeliveryMailbox (generated)" };
            mat.color = new Color(0.2f, 0.35f, 0.75f);
            post.GetComponent<MeshRenderer>().sharedMaterial = mat;
        }

        private void Update()
        {
            if (_cooldownLeft > 0f) _cooldownLeft -= Time.deltaTime;
            if (_player == null || _cooldownLeft > 0f || !ForestDeliveryState.Carrying) return;
            if (Vector3.Distance(transform.position, _player.position) > InteractRadius) return;

            bool delivered = ForestDeliveryState.TryDeliver(zoneIndex, out int reward, out bool broke, out bool late, out bool chainBonus);
            if (!delivered) return; // 목적지가 다르다 — 조용히 무시(우체통마다 안내판이 없어도 되게).

            _cooldownLeft = 1f;

            string toast;
            if (broke)
            {
                toast = ForestLocalization.T("delivery.broke_toast", "택배 — 뛰다가 소포가 깨졌다! 보상 없음(사슬 끊김)");
            }
            else
            {
                string tag = chainBonus
                    ? ForestLocalization.T("delivery.chain_tag", " (사슬 보너스!)")
                    : late
                        ? ForestLocalization.T("delivery.late_tag", " (시간 초과, 보상 절반)")
                        : "";
                toast = string.Format(
                    ForestLocalization.T("delivery.done_toast", "택배 완료 — 과일 +{0}{1}"),
                    reward, tag);
                ForestGatherPopup.Spawn(transform.position + Vector3.up * 1.6f, $"+{reward}", chainBonus);
                ForestGatherBump.Apply(_visual);
            }
            DialogueLabel.Instance?.Show(toast, ToastSec);
        }
    }
}
