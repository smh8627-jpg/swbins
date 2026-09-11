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

        private struct VillagerDef
        {
            public string Id;
            public string Name;
            public string Line;
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
                Line = "이 마을에 무슨 일로 오셨소.",
                Gx = 1, Gy = 3, Color = new Color(0.25f, 0.32f, 0.55f),
            },
            new VillagerDef
            {
                Id = "npc_merchant", Name = "떠돌이 상인",
                Line = "북쪽 산길은 요즘 값이 오르오. 짐꾼을 못 구해서.",
                Gx = 4, Gy = 3, Color = new Color(0.55f, 0.32f, 0.18f),
            },
        };

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
            Object.DestroyImmediate(visual.GetComponent<Collider>());
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
            talk.Init(v.Name, v.Line);
        }

        private static Material MakeMaterial(Color color)
        {
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "Villager (generated)" };
            mat.color = color;
            return mat;
        }
    }
}
