using UnityEngine;
using Saga.Dungeon.Cinematics;
using Saga.Dungeon.Data;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// PLAN.md 106-3 — 보스방(능묘지기) 첫 발. 보스 문이 열려 있고 아직 등장 컷을 안 봤으면
    /// 컷을 한 번 틀고 `TempleFlag.BossIntroSeen` 을 세운다(세이브 v9 `templeFlags` 에 그대로 실린다).
    /// 쓰러뜨린 뒤엔 틀지 않는다.
    /// </summary>
    public class TempleBossIntro : MonoBehaviour
    {
        private const float EnterRadius = 8f;

        [SerializeField] private DungeonEnemy boss;

        private Transform _player;

        private void Awake()
        {
            var playerGo = GameObject.FindWithTag("Player");
            _player = playerGo != null ? playerGo.transform : null;
        }

        private void Update() => Tick();

        public void Tick()
        {
            if (_player == null || boss == null) return;
            if (!TempleState.Has(TempleFlag.BossDoor) || TempleState.Has(TempleFlag.BossIntroSeen)
                || TempleState.Has(TempleFlag.BossDefeated)) return;
            if (TempleVisuals.FlatDistance(transform.position, _player.position) > EnterRadius) return;
            TempleState.Set(TempleFlag.BossIntroSeen);
            DungeonCutscenes.Instance?.PlayBossIntro(boss);
        }
    }
}
