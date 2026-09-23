using UnityEngine;
using Saga.Dungeon.Audio;
using Saga.Dungeon.Data;
using Saga.Dungeon.UI;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// PLAN.md 106-2 "잊힌 능묘" 입구 — 첫 발을 들이면 제목과 목표를 한 번 알리고
    /// `TempleFlag.Visited` 를 세운다(HUD 열쇠 줄이 이때부터 보인다). 지역 도착 타이틀
    /// 연출 본판은 106장 순서 3(Timeline).
    /// </summary>
    public class TempleEntrance : MonoBehaviour
    {
        private const float EnterRadius = 7f;

        private Transform _player;

        private void Awake()
        {
            var playerGo = GameObject.FindWithTag("Player");
            _player = playerGo != null ? playerGo.transform : null;
        }

        private void Update() => Tick();

        public void Tick()
        {
            if (_player == null || TempleState.Has(TempleFlag.Visited)) return;
            if (TempleVisuals.FlatDistance(transform.position, _player.position) > EnterRadius) return;
            TempleState.Set(TempleFlag.Visited);
            SfxPlayer.PlayDiscovery();
            DialogueLabel.Instance?.Show(DungeonLocalization.T("temple.enter",
                "— 잊힌 능묘 —\n작은 열쇠로 길을 열고, 보스 열쇠로 능묘지기에게 닿아라"), 5f);
        }
    }
}
