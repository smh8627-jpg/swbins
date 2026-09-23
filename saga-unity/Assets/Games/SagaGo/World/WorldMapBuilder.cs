using System.Collections.Generic;
using UnityEngine;
using Saga.Go.UI;

namespace Saga.Go.World
{
    /// <summary>
    /// PLAN.md 107-3 — Play 시작 때 순간이동 지점 다섯·옛 망루를 세우고 지도 화면(`WorldMapUi`)을 붙인다.
    /// 씬 빌더는 돌 재질만 넘긴다(`FieldSpawner` 와 같은 결 — 상태를 가진 런타임 존재라 씬에 굳히지 않는다).
    /// </summary>
    public class WorldMapBuilder : MonoBehaviour
    {
        [SerializeField] private Material stoneMaterial;

        public readonly List<WaypointStone> Stones = new List<WaypointStone>();
        public Watchtower Tower { get; private set; }

        public static WorldMapBuilder Instance { get; private set; }

        private void Awake() => Instance = this;

        private void Start()
        {
            foreach (var w in Saga.Go.Data.GoWorldMap.Waypoints)
            {
                Stones.Add(WaypointStone.Spawn(w, transform, stoneMaterial));
            }
            Tower = Watchtower.Spawn(transform, stoneMaterial);
            if (GetComponent<WorldMapUi>() == null) gameObject.AddComponent<WorldMapUi>();
        }
    }
}
