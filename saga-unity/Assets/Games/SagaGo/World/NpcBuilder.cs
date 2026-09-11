using System;
using UnityEngine;
using Saga.Go.Data;

namespace Saga.Go.World
{
    /// <summary>
    /// VERTICAL_SLICE.md 26절 — 주민 1~2명(대화만, 등용 대상 아님). saga-godot
    /// npc_builder.gd와 같은 범위로 좁힌다: 하루 일과·날씨·LOD는 이번 슬라이스
    /// 밖. saga-godot이 "대화가 전투보다 먼저"로 순서를 정정했던 교훈 그대로
    /// Combat보다 먼저 구현한다(PROJECT_STATE.md 참고). 아직 GLB 전이라
    /// Player와 같은 크기의 primitive Capsule + 옷 색만 다르게(PLAN.md 8장).
    /// </summary>
    public class NpcBuilder : MonoBehaviour
    {
        private const float TalkRadius = 14f;
        private const string TravelerEventId = "traveler_met";
        private const int TravelerRewardExp = 15;
        private const int TravelerRewardGold = 10;

        private struct VillagerDef
        {
            public string Id;
            public string Name;
            public Func<string> LineFn;
            public int Gx;
            public int Gy;
            public Color Color;
        }

        // 자리는 saga-godot과 동일한 좌표(같은 7x7 지도) — 마을집 좌우 평지.
        private static readonly VillagerDef[] Villagers =
        {
            new VillagerDef
            {
                Id = "npc_elder", Name = "마을 촌장",
                LineFn = ElderLine,
                Gx = 1, Gy = 3, Color = new Color(0.25f, 0.32f, 0.55f),
            },
            new VillagerDef
            {
                Id = "npc_merchant", Name = "떠돌이 상인",
                LineFn = MerchantLine,
                Gx = 4, Gy = 3, Color = new Color(0.55f, 0.32f, 0.18f),
            },
            new VillagerDef
            {
                // PLAN.md 24~27장 "NPC 이벤트" — 2026-09-12 지도 확장으로 생긴
                // 둘째 남쪽 공터(row9)에 세운 한 번뿐인 만남. 촌장(퀘스트)·
                // 상인(거래)과 달리 진행 상태가 없는 "말 걸면 한 번, 그걸로
                // 끝"인 가장 단순한 형태 — WorldEventState(2026-09-12에 id
                // 집합으로 일반화된 것)를 그대로 재사용.
                Id = "npc_traveler", Name = "나그네",
                LineFn = TravelerLine,
                Gx = 4, Gy = 9, Color = new Color(0.42f, 0.4f, 0.36f),
            },
        };

        /// <summary>PLAN.md 66장 Reward — 상인은 새 상점 화면 없이 "말을 걸면
        /// 살 수 있으면 판다"로 거래를 끝낸다(Inventory.cs의 "더 센 장비는
        /// 자동 장착"과 같은 결). 딱 한 번만 판다.</summary>
        private static string MerchantLine()
        {
            string itemName = ItemData.Get(ShopState.MerchantItemId)?.Name ?? ShopState.MerchantItemId;

            if (ShopState.MerchantSold)
            {
                return "덕분에 짐이 줄어 고맙네. 좋은 길 되시게.";
            }
            if (ShopState.TryBuyFromMerchant())
            {
                return $"짐이 무거워 골치였는데 — {itemName}을 {ShopState.MerchantPrice}냥에 내주지. 가져가시게.";
            }
            return $"북쪽 산길은 요즘 값이 오르오. {itemName}을 {ShopState.MerchantPrice}냥에 넘기고 싶은데, " +
                   "자네 주머니 사정이 넉넉지 않아 보이는군.";
        }

        /// <summary>PLAN.md 70장 — 도적 퀘스트를 내주고, 진행 중이면 재촉하고,
        /// 끝났으면 사례한다. 말을 거는 순간이 곧 "퀘스트 수락"이라 여기서
        /// QuestState.StartBanditQuest()를 직접 부른다(VillagerTalk.cs는 그냥
        /// 이 함수가 돌려주는 문장을 보여주기만 하는 화면 층).</summary>
        private static string ElderLine()
        {
            switch (QuestState.BanditQuest)
            {
                case QuestStage.NotStarted:
                    QuestState.StartBanditQuest();
                    return "이 근처에 도적 떼가 나온다더군. 처치해 주면 사례하지.";
                case QuestStage.Active:
                    return "아직인가? 도적 놈들 때문에 다들 걱정이 크네.";
                default:
                    return "고맙네, 자네 덕에 길이 편해졌어.";
            }
        }

        /// <summary>PLAN.md 24~27장 "NPC 이벤트" — 처음 말을 걸면 소소한 보상과
        /// 함께 흘려듣는 정보 한 마디, 그다음부턴 그냥 지나가는 인사말뿐이다
        /// (촌장의 3단계 퀘스트 대사·상인의 거래 상태 분기보다 훨씬 가벼운
        /// "한 번뿐인 만남").</summary>
        private static string TravelerLine()
        {
            if (WorldEventState.IsTriggered(TravelerEventId))
            {
                return "또 만났군. 좋은 길 되시게.";
            }
            WorldEventState.TryTrigger(TravelerEventId);
            PlayerStats.AddExp(TravelerRewardExp);
            GoldState.Add(TravelerRewardGold);
            return "이 근처 지리를 좀 아네. 도움이 될 만한 걸 나눠 주지 — " +
                   $"경험치 +{TravelerRewardExp} · 돈 +{TravelerRewardGold}냥";
        }

        private void Awake()
        {
            Build();
        }

        public void Build()
        {
            foreach (var v in Villagers)
            {
                Spawn(v);
            }
        }

        private void Spawn(VillagerDef v)
        {
            char tile = TestMapData.TileAt(v.Gx, v.Gy);
            float ground = TestMapData.Legend[tile].Height;
            Vector3 pos = TestMapData.WorldPos(v.Gx, v.Gy) + new Vector3(0, ground, 0);

            var root = new GameObject($"Villager_{v.Id}");
            root.transform.SetParent(transform, false);
            root.transform.position = pos;

            // Player.Visual과 같은 크기의 capsule(PlayerController 기준).
            var visual = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            visual.name = "Visual";
            UnityEngine.Object.DestroyImmediate(visual.GetComponent<Collider>());
            visual.transform.SetParent(root.transform, false);
            visual.transform.localScale = new Vector3(1.8f, 1.7f, 1.8f);
            visual.transform.localPosition = new Vector3(0f, 1.7f, 0f);
            visual.GetComponent<MeshRenderer>().sharedMaterial = MakeMaterial(v.Color);

            var talkGo = new GameObject("TalkArea");
            talkGo.transform.SetParent(root.transform, false);
            var col = talkGo.AddComponent<SphereCollider>();
            col.isTrigger = true;
            col.radius = TalkRadius;

            var talk = talkGo.AddComponent<VillagerTalk>();
            talk.Init(v.Name, v.LineFn);
        }

        private static Material MakeMaterial(Color color)
        {
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "Villager (generated)" };
            mat.color = color;
            return mat;
        }
    }
}
