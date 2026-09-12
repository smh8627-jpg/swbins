using UnityEngine;
using Saga.Go.Data;
using Saga.Go.UI;

namespace Saga.Go.World
{
    /// <summary>
    /// PLAN.md 24~27장이 나열한 이벤트 종류 중 여태 없던 "랜덤 이벤트".
    /// 지금까지 심은 발견형 콘텐츠(HiddenTreasure·EastGroveRelic·MountainShrine
    /// 등)는 전부 WorldEventState로 "한 번뿐"이었다 — 이건 반대로 **몇 번이고
    /// 다시 들를 수 있는 자리**(쿨다운만 있음, WorldEventState 안 씀)에서 매번
    /// 결과가 갈리는 첫 콘텐츠. 민속 성황당 돌무더기에 노잣돈을 놓고 기원하는
    /// 모티프 — 실존 인물·사건이 아니라 이름 정책과 무관.
    /// 3냥을 내야 기원할 수 있다(공짜면 "반복 방문=순이익"이라 GoldState
    /// 경제가 무너진다) — 못 내면 그냥 지나가는 대사만 뜨고 굴리지 않는다.
    /// </summary>
    [RequireComponent(typeof(SphereCollider))]
    public class LuckyCairn : MonoBehaviour
    {
        private const int Gx = 4;
        private const int Gy = 7;
        private const float TriggerRadius = 6f;
        private const float CooldownSec = 20f;
        private const int WishCost = 3;

        private struct Outcome
        {
            public string Text;
            public int Gold;
            public int Exp;
            public float Weight;
        }

        // 합 100 — 대략 절반은 본전도 못 건지고, 아주 드물게 크게 웃는다.
        private static readonly Outcome[] Outcomes =
        {
            new Outcome { Text = "아무 일도 일어나지 않았다.", Gold = 0, Exp = 0, Weight = 50f },
            new Outcome { Text = "작은 행운 — 돈이 조금 돌아왔다.", Gold = 5, Exp = 0, Weight = 32f },
            new Outcome { Text = "제법 큰 행운 — 돈이 두둑이 돌아왔다.", Gold = 15, Exp = 0, Weight = 14f },
            new Outcome { Text = "큰 행운! 몸도 마음도 가벼워졌다.", Gold = 20, Exp = 10, Weight = 4f },
        };

        private float _lastWishTime = -CooldownSec;

        private void Awake()
        {
            // 이미 저장된 씬을 실제 Play로 열면 Awake가 다시 불려 Build()를
            // 또 돌리는데, 편집기 빌드 스크립트가 이미 돌 세 개를 만들어 둔
            // 뒤라 그대로 두면 돌무더기가 두 벌씩 겹쳐 생긴다 — NpcBuilder.cs와
            // 같은 방어(2026-09-12 GLB 교체 때 같이 발견한 패턴, 여기 뒤늦게
            // 적용). 이 자리는 다른 발견형 콘텐츠와 달리 WorldEventState로
            // 한 번뿐인 자리가 아니라(몇 번이고 다시 옴) 그 확인은 없다.
            if (transform.childCount > 0) return;
            Build();
        }

        public void Build()
        {
            float ground = TestMapData.Legend[TestMapData.TileAt(Gx, Gy)].Height;
            transform.position = TestMapData.WorldPos(Gx, Gy) + new Vector3(0, ground, 0);

            // 크고 작은 돌 세 개를 얼기설기 쌓은 돌무더기 — primitive Sphere로
            // 충분(발광 마커류와 결이 다르게, 은은한 회색 돌색).
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "Cairn (generated)" };
            mat.color = new Color(0.5f, 0.48f, 0.46f);

            AddStone(new Vector3(0f, 0.4f, 0f), 1.1f, mat);
            AddStone(new Vector3(0.3f, 1.0f, -0.2f), 0.7f, mat);
            AddStone(new Vector3(-0.2f, 1.4f, 0.1f), 0.45f, mat);

            var col = GetComponent<SphereCollider>();
            col.isTrigger = true;
            col.radius = TriggerRadius;
        }

        private void AddStone(Vector3 localPos, float scale, Material mat)
        {
            var stone = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            stone.name = "Stone";
            Object.DestroyImmediate(stone.GetComponent<Collider>());
            stone.transform.SetParent(transform, false);
            stone.transform.localPosition = localPos;
            stone.transform.localScale = Vector3.one * scale;
            stone.GetComponent<MeshRenderer>().sharedMaterial = mat;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!other.CompareTag("Player")) return;
            if (Time.time - _lastWishTime < CooldownSec) return;

            if (!GoldState.TrySpend(WishCost))
            {
                DialogueLabel.Instance?.Show("성황당 돌무더기 — 노잣돈이 모자라 기원하지 못했다.", 2.5f);
                return;
            }

            _lastWishTime = Time.time;
            var outcome = Roll();
            if (outcome.Gold > 0) GoldState.Add(outcome.Gold);
            if (outcome.Exp > 0) PlayerStats.AddExp(outcome.Exp);

            string reward = (outcome.Gold > 0 || outcome.Exp > 0)
                ? $" (돈 +{outcome.Gold}냥" + (outcome.Exp > 0 ? $" · 경험치 +{outcome.Exp})" : ")")
                : "";
            DialogueLabel.Instance?.Show($"돌 하나를 얹고 기원했다 — {outcome.Text}{reward}", 3f);
        }

        private static Outcome Roll()
        {
            float total = 0f;
            foreach (var o in Outcomes) total += o.Weight;

            float roll = Random.value * total;
            float acc = 0f;
            foreach (var o in Outcomes)
            {
                acc += o.Weight;
                if (roll <= acc) return o;
            }
            return Outcomes[0];
        }
    }
}
