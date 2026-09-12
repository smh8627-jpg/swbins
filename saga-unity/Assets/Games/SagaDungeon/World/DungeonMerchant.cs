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
    ///
    /// "세공·행상 재고 굴리기·도감" 슬라이스 — 웹판 `rollMerchantStock()`의
    /// 절차적 티어 룰렛은 여전히 범위 밖이지만, "행상마다 파는 게 다르다"는
    /// 핵심만 최소로 살렸다: 행상 인스턴스별로 무기(`sellItemId`) 또는
    /// 보석(`sellGemId`) 중 하나를 고정 재고로 배정한다(둘 다 프리팹
    /// 하나가 아니라 `BuildTestDungeonScene`가 인스턴스마다 다르게 채워
    /// 넣는 값 — 이 프로젝트의 "테스트 씬은 전부 고정 좌표" 결정성 원칙을
    /// 그대로 따름, 웹판처럼 `Math.random()`을 쓰지 않는다). Room2 행상은
    /// 기존 그대로(무기), Room3 행상(신규)은 보석을 판다.
    /// </summary>
    public class DungeonMerchant : MonoBehaviour
    {
        private const float TriggerRadius = 2.0f;
        private const float ToastSec = 4f;
        private const float DeclineCooldownSec = 3f; // 돈이 모자랄 때 매 프레임 토스트가 안 뜨게

        private float _declineCooldownLeft;

        [SerializeField] private string roomId = "room1";
        [SerializeField] private string sellItemId = "wp_saber";
        [SerializeField] private int price = 45; // Room2 잡졸 둘(8×2)이면 무리 없이 살 수 있는 값

        // 채워져 있으면 sellItemId 대신 이 보석을 판다(Room3 전용, 위 클래스 주석 참고).
        [SerializeField] private string sellGemId;

        /// <summary>"DUNGEON 오픈월드 확장 — 절차적 층 진행" 슬라이스 —
        /// `DungeonFloorRunner`가 런타임에 즉석으로 만든 행상에 값을 채우는
        /// 정식 API. Awake가 아직 안 돈 상태에서만 의미가 있다.</summary>
        public void Configure(string newRoomId, string newSellItemId, string newSellGemId, int newPrice)
        {
            roomId = newRoomId;
            sellItemId = newSellItemId;
            sellGemId = newSellGemId;
            price = newPrice;
        }

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

            bool isGem = !string.IsNullOrEmpty(sellGemId);
            string wantName = isGem ? GemData.Get(sellGemId)?.Name : ItemData.Get(sellItemId)?.Name;

            if (!HeroState.TrySpendGold(price))
            {
                _declineCooldownLeft = DeclineCooldownSec;
                DialogueLabel.Instance?.Show($"행상 — {wantName}({price}냥)를 살 돈이 모자라다.", ToastSec);
                return; // 안 판 상태로 남겨 둔다 — 돈이 모이면 다시 시도 가능(GO ShopState.cs와 같은 결).
            }

            _sold = true;
            if (isGem)
            {
                bool socketed = HeroState.SocketIfBetter(sellGemId);
                DialogueLabel.Instance?.Show(
                    $"행상 — {wantName}을(를) {price}냥에 샀다{(socketed ? " — 바로 세공했다." : ".")}", ToastSec);
            }
            else
            {
                bool equipped = HeroState.EquipIfBetter(sellItemId);
                DialogueLabel.Instance?.Show(
                    $"행상 — {wantName}을(를) {price}냥에 샀다{(equipped ? " — 바로 갖췄다." : ".")}", ToastSec);
            }
        }
    }
}
