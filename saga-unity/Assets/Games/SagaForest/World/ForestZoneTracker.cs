using System.Collections.Generic;
using UnityEngine;
using Saga.Forest.Data;
using Saga.Forest.UI;

namespace Saga.Forest.World
{
    /// <summary>
    /// PLAN.md 108 ② "고정 특색 지역" — 플레이어가 선 존(`ForestBiomeData.ZoneAt`)이 바뀌면 자막을 띄운다
    /// ("— 어둑숲 暗林 —" + 사는 것, 이 판에서 처음 든 존이면 사연 한 줄 더, 마을로 돌아오면 "— 마을 —").
    /// 시작 자리는 말없이 적기만 한다. `ForestBootstrap` 이 Play 때 붙인다(씬엔 안 굳힌다).
    /// </summary>
    public class ForestZoneTracker : MonoBehaviour
    {
        public const float CheckSec = 0.4f;
        private const int Unknown = int.MinValue;

        private static readonly HashSet<int> SeenZones = new HashSet<int>();
        private Transform _player;
        private int _zone = Unknown;
        private float _checkLeft;

        public static ForestZoneTracker Instance { get; private set; }
        public int CurrentZone => _zone;
        public string LastText { get; private set; }

        public static void ResetForTest() => SeenZones.Clear();

        private void Awake() => Instance = this;

        private void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }

        private void Start()
        {
            var playerGo = GameObject.FindWithTag("Player");
            _player = playerGo != null ? playerGo.transform : null;
        }

        private void Update()
        {
            if (_player != null) Tick(_player.position, Time.deltaTime);
        }

        /// <summary>한 틱 — 존이 바뀌어 자막을 띄웠으면 true. 진단은 dt 를 `CheckSec` 이상으로 준다.</summary>
        public bool Tick(Vector3 pos, float dt)
        {
            _checkLeft -= dt;
            if (_checkLeft > 0f) return false;
            _checkLeft = CheckSec;
            int zone = ForestBiomeData.ZoneAt(pos.x, pos.z);
            if (zone == _zone) return false;
            bool start = _zone == Unknown;
            _zone = zone;
            bool first = zone >= 0 && SeenZones.Add(zone);
            if (start) return false;
            LastText = ForestBiomeData.EnterText(zone, first, ForestCreature.KindName);
            DialogueLabel.Instance?.Show(LastText, first ? 4f : 2.2f);
            return true;
        }
    }
}
