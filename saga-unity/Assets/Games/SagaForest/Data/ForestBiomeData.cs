using UnityEngine;

namespace Saga.Forest.Data
{
    /// <summary>
    /// saga-godot VERTICAL_SLICE_FOREST.md 4절이 "다음 슬라이스로 미룸"으로
    /// 남겨 둔 "바이옴 지형 다양성(꽃밭·어둑숲·버섯숲·바위 지대)"을 채운다.
    /// 순수 시각 다양성이지 게임플레이 규칙이 아니다 — 걷기 판정은 여전히
    /// 단일 평면(`ForestGroundBuilder` 클래스 주석 "판정은 항상 평면 좌표로").
    /// 네 자리는 `ForestCreatureBuilder`의 기존 den 좌표와 그대로 맞춰
    /// "그 창조물이 실제로 그 바이옴에 산다"는 인상을 준다(창조물 좌표는
    /// 안 옮김 — 이 자리가 이미 기존 콘텐츠와 안 겹치는 자리였다).
    /// </summary>
    public static class ForestBiomeData
    {
        public struct Zone
        {
            public string DisplayName;
            public Vector2 Center; // world XZ
            public float Radius;
            public float InnerRadius; // 이 반경 안은 100% Tint, Radius까지 흰색(1,1,1)으로 부드럽게 빠짐
            public Color Tint; // 지면 정점색에 곱해질 배율 — 흰색(1,1,1)이면 바이옴 밖(기본 초록) 그대로
        }

        public static readonly Zone[] Zones =
        {
            // dokkaebi(숲도깨비) den과 일치 — 어둑숲: 어둡고 차가운 초록.
            new Zone { DisplayName = "어둑숲", Center = new Vector2(-25f, -20f), Radius = 17f, InnerRadius = 6f, Tint = new Color(0.55f, 0.60f, 0.70f) },
            // bawi(바위도깨비) den과 일치 — 바위 지대: 밝고 마른 황토빛.
            new Zone { DisplayName = "바위 지대", Center = new Vector2(25f, 20f), Radius = 17f, InnerRadius = 6f, Tint = new Color(1.6f, 1.35f, 1.1f) },
            // beoseot(버섯정령) den과 일치 — 버섯숲: 축축한 보랏빛 갈색.
            new Zone { DisplayName = "버섯숲", Center = new Vector2(-25f, 20f), Radius = 17f, InnerRadius = 6f, Tint = new Color(1.1f, 0.75f, 1.3f) },
            // kkot(꽃정령) den과 일치 — 꽃밭: 밝고 따뜻한 연둣빛.
            new Zone { DisplayName = "꽃밭", Center = new Vector2(25f, -20f), Radius = 17f, InnerRadius = 6f, Tint = new Color(1.7f, 1.3f, 1.6f) },
        };

        /// <summary>(wx,wz) 지점의 정점색 배율. 흰색에서 시작해 각 존의 영향을 섞는다.</summary>
        public static Color SampleTint(float wx, float wz)
        {
            Color result = Color.white;
            foreach (var zone in Zones)
            {
                float dist = Vector2.Distance(new Vector2(wx, wz), zone.Center);
                float t = 1f - Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(zone.InnerRadius, zone.Radius, dist));
                if (t > 0f)
                {
                    result = Color.Lerp(result, zone.Tint, t);
                }
            }
            return result;
        }
    }
}
