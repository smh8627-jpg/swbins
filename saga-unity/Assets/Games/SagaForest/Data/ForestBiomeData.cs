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
            public string Key;
            private string _displayName;
            /// <summary>Localization — ForestHomeData.FurnitureItem.Name과 같은 결(T(key, fallback)).
            /// PLAN.md 67~69장 "미착수: FOREST 데이터 콘텐츠 번역"(2026-09-22 마저 채움).</summary>
            public string DisplayName
            {
                get => ForestLocalization.T("biome." + Key, _displayName);
                set => _displayName = value;
            }
            public Vector2 Center; // world XZ
            public float Radius;
            public float InnerRadius; // 이 반경 안은 100% Tint, Radius까지 흰색(1,1,1)으로 부드럽게 빠짐
            public Color Tint; // 지면 정점색에 곱해질 배율 — 흰색(1,1,1)이면 바이옴 밖(기본 초록) 그대로

            // PLAN.md 108 ② "고정 특색 지역"(2026-09-24) — 한자·사연·짐승 명단·명소.
            // 한자·명소 이름은 지어낸 것. 명단은 `ForestCreatureBuilder` 가 이 존 안에 세우는 종과 같아야 한다(진단이 본다).
            public string Hanja;
            public string LoreKo;
            public string[] Roster;
            public string LandmarkKo;
            public string LandmarkLoreKo;
            /// <summary>명소 자리(world XZ) — 존 중심에서 바깥쪽 z 로 7m(den 둘·채집 자리·우편함과 안 겹치는 남은 축).</summary>
            public Vector2 LandmarkPos;

            public string Lore => ForestLocalization.T("biome." + Key + ".lore", LoreKo);
            public string LandmarkName => ForestLocalization.T("landmark." + Key, LandmarkKo);
            public string LandmarkLore => ForestLocalization.T("landmark." + Key + ".lore", LandmarkLoreKo);
        }

        /// <summary>108 ② — 이 거리 안이면 그 존에 들어선 것(안쪽 100% ~ 바깥 0% 빛깔 띠의 가운데).</summary>
        public const float EnterRadius = 11.5f;

        public static readonly Zone[] Zones =
        {
            // dokkaebi(숲도깨비) den과 일치 — 어둑숲: 어둡고 차가운 초록.
            new Zone { Key = "dark_forest", DisplayName = "어둑숲", Center = new Vector2(-25f, -20f), Radius = 17f, InnerRadius = 6f, Tint = new Color(0.55f, 0.60f, 0.70f),
                Hanja = "暗林", Roster = new[] { "dokkaebi", "angaeyuryeong" }, LandmarkPos = new Vector2(-25f, -27f),
                LoreKo = "해가 들지 않는 숲. 숲도깨비와 안개유령이 이끼 낀 돌제단 둘레를 맴돈다.",
                LandmarkKo = "이끼 돌제단", LandmarkLoreKo = "누가 쌓았는지 모르는 돌제단. 등불은 한 번도 꺼진 적이 없다고 한다." },
            // bawi(바위도깨비) den과 일치 — 바위 지대: 밝고 마른 황토빛.
            new Zone { Key = "rocky", DisplayName = "바위 지대", Center = new Vector2(25f, 20f), Radius = 17f, InnerRadius = 6f, Tint = new Color(1.6f, 1.35f, 1.1f),
                Hanja = "巖野", Roster = new[] { "bawi", "musoetokkebi" }, LandmarkPos = new Vector2(25f, 27f),
                LoreKo = "마른 황토에 큰 바위가 솟은 땅. 바위도깨비와 무쇠도깨비가 돌을 굴리며 논다.",
                LandmarkKo = "거인 선돌", LandmarkLoreKo = "거인이 땅에 꽂고 간 지팡이라는 선돌. 두드리면 낮게 운다." },
            // beoseot(버섯정령) den과 일치 — 버섯숲: 축축한 보랏빛 갈색.
            new Zone { Key = "mushroom_forest", DisplayName = "버섯숲", Center = new Vector2(-25f, 20f), Radius = 17f, InnerRadius = 6f, Tint = new Color(1.1f, 0.75f, 1.3f),
                Hanja = "菌林", Roster = new[] { "beoseot", "pojagoemul" }, LandmarkPos = new Vector2(-25f, 27f),
                LoreKo = "축축한 보랏빛 숲. 버섯정령이 살고, 포자괴물이 길을 막아선다.",
                LandmarkKo = "요정 돌고리", LandmarkLoreKo = "달 밝은 밤이면 버섯정령이 이 돌고리 안에서 춤춘다." },
            // kkot(꽃정령) den과 일치 — 꽃밭: 밝고 따뜻한 연둣빛.
            new Zone { Key = "flower_field", DisplayName = "꽃밭", Center = new Vector2(25f, -20f), Radius = 17f, InnerRadius = 6f, Tint = new Color(1.7f, 1.3f, 1.6f),
                Hanja = "花原", Roster = new[] { "kkot", "nabijeongryeong" }, LandmarkPos = new Vector2(25f, -27f),
                LoreKo = "따뜻한 연둣빛 들. 꽃정령과 나비정령이 옛 돌기둥 사이를 난다.",
                LandmarkKo = "옛 돌기둥터", LandmarkLoreKo = "무너진 정자의 기둥 넷. 기둥마다 꽃덩굴이 감겼다." },
        };

        /// <summary>108 ② — (wx,wz) 가 든 존 번호, 어느 존에도 안 들면 -1(마을).</summary>
        public static int ZoneAt(float wx, float wz)
        {
            for (int i = 0; i < Zones.Length; i++)
            {
                if (Vector2.Distance(new Vector2(wx, wz), Zones[i].Center) <= EnterRadius) return i;
            }
            return -1;
        }

        /// <summary>108 ② — 존에 들어설 때 자막. "— 이름 한자 —" + 짐승 명단, 이 판에서 처음이면 사연 한 줄 더.
        /// 짐승 이름은 `nameOf`(런타임은 `ForestCreature.KindName`)로 받는다 — 데이터 층이 World 를 안 부르게.</summary>
        public static string EnterText(int zone, bool first, System.Func<string, string> nameOf)
        {
            if (zone < 0) return ForestLocalization.T("zone.enter_village", "— 마을 —");
            var z = Zones[zone];
            string roster = "";
            for (int i = 0; i < z.Roster.Length; i++) roster += (i > 0 ? "·" : "") + nameOf(z.Roster[i]);
            string text = string.Format(ForestLocalization.T("zone.enter", "— {0} {1} —"), z.DisplayName, z.Hanja)
                + "\n" + string.Format(ForestLocalization.T("zone.roster", "사는 것: {0}"), roster);
            return first ? text + "\n" + z.Lore : text;
        }

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
