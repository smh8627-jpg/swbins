using UnityEngine;
using Saga.Dungeon.Data;
using Saga.Dungeon.UI;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// VERTICAL_SLICE_DUNGEON.md 다음 슬라이스 "방 종류 나머지" —
    /// saga-dungeon 웹판 `room.merchant`(js/dungeon.js:359-365, 2173-2178)를
    /// 옮겼다. 웹판은 `rollMerchantStock()`으로 재고 셋을 절차적으로
    /// 굴려 고르는 화면인데, 그 절차적 재고 시스템은 이번 슬라이스 범위
    /// 밖(세공·행상 재고 굴리기는 VERTICAL_SLICE_DUNGEON.md "제외" 참고)
    /// 이라 GO `Data/ShopState.cs`가 이미 쓴 단순화("고정 물건 하나를
    /// 돈이 있으면 산다, 새 상점 화면 없음")를 그대로 재사용했다. GO와
    /// 달리 **살 돈이 없으면 "다 팔았다" 처리하지 않고 다시 다가오면
    /// 또 시도**한다(웹판도 `!room.merchant.used`만 보고 돈은 딱히
    /// 안 깎지도 확인하지도 않지만, 이 슬라이스는 GoldState가 있으니
    /// GO의 "돈 있어야 산다" 규칙을 그대로 가져왔다).
    /// </summary>
    public class DungeonMerchant : MonoBehaviour
    {
        private const float TriggerRadius = 2.0f;
        private const string SellItemId = "wp_saber";
        private const int Price = 45; // Room1을 다 정리하면 잡졸4×8+두목40=72골드라 무리 없이 살 수 있는 값
        private const float ToastSec = 4f;
        private const float DeclineCooldownSec = 3f; // 돈이 모자랄 때 매 프레임 토스트가 안 뜨게

        private float _declineCooldownLeft;

        [SerializeField] private string roomId = "room1";

        private static readonly Color MerchantColor = new Color(0.15f, 0.5f, 0.25f);

        private bool _sold;
        private Transform _player;

        private void Awake()
        {
            if (transform.childCount == 0) BuildVisual();
            var playerGo = GameObject.FindWithTag("Player");
            _player = playerGo != null ? playerGo.transform : null;
        }

        private void BuildVisual()
        {
            var visual = GameObject.CreatePrimitive(PrimitiveType.Cube);
            visual.name = "Visual";
            visual.transform.SetParent(transform, false);
            visual.transform.localScale = new Vector3(1.4f, 0.9f, 0.6f); // 좌판 — 상자보다 낮고 넓적하게
            visual.transform.localPosition = new Vector3(0f, 0.45f, 0f);

            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "DungeonMerchant (generated)" };
            mat.color = MerchantColor;
            visual.GetComponent<MeshRenderer>().sharedMaterial = mat;

            Object.Destroy(visual.GetComponent<Collider>());
        }

        private void Update()
        {
            if (_declineCooldownLeft > 0f) _declineCooldownLeft -= Time.deltaTime;

            if (_sold || _player == null) return;
            if (DungeonEnemy.CountAliveInRoom(roomId) > 0) return; // 웹판 room.cleared와 같은 뜻.
            if (Vector3.Distance(transform.position, _player.position) > TriggerRadius) return;
            if (_declineCooldownLeft > 0f) return; // 방금 거절당했다 — 매 프레임 토스트 스팸 방지.

            if (!HeroState.TrySpendGold(Price))
            {
                _declineCooldownLeft = DeclineCooldownSec;
                DialogueLabel.Instance?.Show($"행상 — 환도({Price}냥)를 살 돈이 모자라다.", ToastSec);
                return; // 안 판 상태로 남겨 둔다 — 돈이 모이면 다시 시도 가능(GO ShopState.cs와 같은 결).
            }

            _sold = true;
            bool equipped = HeroState.EquipIfBetter(SellItemId);
            var item = ItemData.Get(SellItemId);
            DialogueLabel.Instance?.Show(
                $"행상 — {item.Name}을(를) {Price}냥에 샀다{(equipped ? " — 바로 갖췄다." : ".")}", ToastSec);
        }
    }
}
