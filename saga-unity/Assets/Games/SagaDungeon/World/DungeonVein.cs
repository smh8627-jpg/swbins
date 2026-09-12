using UnityEngine;
using Saga.Dungeon.Data;
using Saga.Dungeon.UI;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// VERTICAL_SLICE_DUNGEON.md 다음 슬라이스 "방 종류 마지막" — saga-dungeon
    /// 웹판 `room.vein`(채광방, js/dungeon.js:357, 2163-2172)을 옮겼다. 웹판은
    /// 광맥을 캐면 세공 재료 둘이 확정으로 나오는데, 세공 시스템 자체가
    /// 이번 슬라이스 범위 밖(VERTICAL_SLICE_DUNGEON.md "제외")이라
    /// `DungeonShrine.cs`와 같은 단순화(재료 대신 경험치·돈 확정 지급)를
    /// 썼다 — 웹판 주석 "우물의 회복량 40%만큼 후하게"를 그대로 따라
    /// `DungeonTrove.cs`(24골드)보다 후하게 잡았다. `DungeonTrove.cs`와
    /// 같은 이유로 `room.cleared` 대신 `DungeonEnemy.CountAliveInRoom
    /// (roomId) == 0`을 씀.
    /// </summary>
    public class DungeonVein : MonoBehaviour
    {
        private const float TriggerRadius = 2.0f;
        private const int RewardExp = 15;
        private const int RewardGold = 36; // "우물의 회복량 40%만큼 후하게" — 트로브(24)보다 후하게
        private const float ToastSec = 4f;

        [SerializeField] private string roomId = "room1";

        private static readonly Color VeinColor = new Color(0.42f, 0.4f, 0.38f); // 광석 — 잿빛 바위

        private bool _used;
        private Transform _player;

        private void Awake()
        {
            if (transform.childCount == 0) BuildVisual();
            var playerGo = GameObject.FindWithTag("Player");
            _player = playerGo != null ? playerGo.transform : null;
        }

        private void BuildVisual()
        {
            var visual = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            visual.name = "Visual";
            visual.transform.SetParent(transform, false);
            visual.transform.localScale = new Vector3(1.3f, 0.6f, 1.1f); // 낮게 눌린 광맥 덩어리
            visual.transform.localPosition = new Vector3(0f, 0.3f, 0f);

            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "DungeonVein (generated)" };
            mat.color = VeinColor;
            visual.GetComponent<MeshRenderer>().sharedMaterial = mat;

            Object.Destroy(visual.GetComponent<Collider>());
        }

        private void Update()
        {
            if (_used || _player == null) return;
            if (DungeonEnemy.CountAliveInRoom(roomId) > 0) return; // 웹판 room.cleared와 같은 뜻.
            if (Vector3.Distance(transform.position, _player.position) > TriggerRadius) return;

            _used = true;
            HeroState.AddExp(RewardExp);
            HeroState.AddGold(RewardGold);
            DialogueLabel.Instance?.Show($"광맥 · 캐냈다 — 경험치 +{RewardExp} · 돈 +{RewardGold}냥", ToastSec);
        }
    }
}
