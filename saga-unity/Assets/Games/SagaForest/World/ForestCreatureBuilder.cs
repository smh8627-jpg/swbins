using UnityEngine;

namespace Saga.Forest.World
{
    /// <summary>
    /// FOREST "몬스터·퓨전 콘텐츠" 슬라이스(2026-09-12) — `AnimalBuilder.cs`
    /// (GO)와 같은 "정의 배열 + Awake 스폰" 패턴. 첫 넷은 마을 네 귀퉁이
    /// (기존 콘텐츠 — 나무(-10,5)·주민(10,5)·집(15,-10)·플레이어 스폰(0,-15)과
    /// 안 겹치는 자리)에 하나씩. **바이옴 지형 다양성 슬라이스로 이 den
    /// 좌표가 그대로 `ForestBiomeData.Zones`의 중심과 일치한다**(den 좌표
    /// 자체는 안 옮김 — `ForestBiomeData.cs` 참고). **2026-09-12 종 늘리기 둘** —
    /// 포자괴물·안개유령을 버섯숲·어둑숲에, 무쇠도깨비·나비정령을 바위
    /// 지대·꽃밭에 추가해 네 바이옴 전부 종 둘씩이 됐다.
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
            new CreatureDef { Kind = "dokkaebi", Den = new Vector3(-25f, 0f, -20f) }, // SW — 어둑숲 존 중심.
            new CreatureDef { Kind = "bawi",     Den = new Vector3(25f, 0f, 20f) },   // NE — 바위 지대 존 중심.
            new CreatureDef { Kind = "beoseot",  Den = new Vector3(-25f, 0f, 20f) },  // NW — 버섯숲 존 중심.
            new CreatureDef { Kind = "kkot",     Den = new Vector3(25f, 0f, -20f) },  // SE — 꽃밭 존 중심.
            // 2026-09-12 종 추가 — 기존 넷과 같은 바이옴을 공유하되 den만
            // 살짝 비껴 둬(약 7~8m) 서로 배회 범위가 안 겹치게 했다
            // (`ForestBiomeData.Zones`의 반경 17m 안).
            new CreatureDef { Kind = "pojagoemul", Den = new Vector3(-31f, 0f, 24f) },     // 버섯숲(beoseot과 공유).
            new CreatureDef { Kind = "angaeyuryeong", Den = new Vector3(-31f, 1.0f, -24f) }, // 어둑숲(dokkaebi와 공유), 땅 위 1m에 떠 있음.
            // 2026-09-12 "바위 지대·꽃밭도 두 종씩" — 나머지 두 바이옴도
            // 같은 패턴(den을 zone 중심에서 약 7.2m 비껴 둠)으로 채웠다.
            new CreatureDef { Kind = "musoetokkebi", Den = new Vector3(31f, 0f, 24f) },      // 바위 지대(bawi와 공유).
            new CreatureDef { Kind = "nabijeongryeong", Den = new Vector3(31f, 0f, -24f) },  // 꽃밭(kkot과 공유).
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
