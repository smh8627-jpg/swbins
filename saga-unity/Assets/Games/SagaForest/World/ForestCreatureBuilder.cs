using UnityEngine;

namespace Saga.Forest.World
{
    /// <summary>
    /// FOREST "몬스터·퓨전 콘텐츠" 슬라이스(2026-09-12) — `AnimalBuilder.cs`
    /// (GO)와 같은 "정의 배열 + Awake 스폰" 패턴. 마을 네 귀퉁이(기존
    /// 콘텐츠 — 나무(-10,5)·주민(10,5)·집(15,-10)·플레이어 스폰(0,-15)과
    /// 안 겹치는 자리)에 하나씩 흩어 뒀다. **2026-09-12 바이옴 지형
    /// 다양성 슬라이스로 이 den 좌표가 그대로 `ForestBiomeData.Zones`의
    /// 중심과 일치하게 됐다** — saga-godot이 종마다 바이옴(어둑숲·바위
    /// 지대·버섯숲·꽃밭)에 den을 뒀던 것과 이제 같은 인상을 준다(den
    /// 좌표 자체는 안 옮김 — `ForestBiomeData.cs` 참고).
    /// </summary>
    public class ForestCreatureBuilder : MonoBehaviour
    {
        private struct CreatureDef
        {
            public string Kind;
            public Vector3 Den;
        }

        private static readonly CreatureDef[] Creatures =
        {
            new CreatureDef { Kind = "dokkaebi", Den = new Vector3(-25f, 0f, -20f) }, // SW — 어둑숲 자리를 흉내낸 구석.
            new CreatureDef { Kind = "bawi",     Den = new Vector3(25f, 0f, 20f) },   // NE.
            new CreatureDef { Kind = "beoseot",  Den = new Vector3(-25f, 0f, 20f) },  // NW.
            new CreatureDef { Kind = "kkot",     Den = new Vector3(25f, 0f, -20f) },  // SE.
        };

        private void Awake()
        {
            // 이미 저장된 씬을 실제 Play로 열면 Awake가 다시 불려 Build()를 또
            // 돌리는데, 편집기 빌드 스크립트가 이미 자식들을 만들어 둔 뒤라
            // 그대로 두면 두 벌씩 겹쳐 생긴다 — GO AnimalBuilder.cs와 같은 방어.
            if (transform.childCount > 0) return;
            Build();
        }

        public void Build()
        {
            foreach (var def in Creatures)
            {
                var go = new GameObject($"Creature_{def.Kind}");
                go.transform.SetParent(transform, false);
                go.AddComponent<ForestCreature>().Setup(def.Kind, def.Den);
            }
        }
    }
}
