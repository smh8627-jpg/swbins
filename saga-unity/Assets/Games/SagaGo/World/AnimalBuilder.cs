using UnityEngine;
using Saga.Go.Data;

namespace Saga.Go.World
{
    /// <summary>
    /// PLAN.md 24~27장 "동물" — 사슴 세 마리(Idle/Wander/Flee/Group/
    /// Interaction, WanderingAnimal.cs 참고). 아직 GLB 전이라 작은 primitive
    /// Capsule로 만듦(PLAN.md 8장) — 사람 크기 capsule(Player·NPC·도적)과
    /// 다르게 작고 낮은 비율로 구분한다. 동물은 절대 안 움직이는 지오메트리가
    /// 아니라 MarkStatic() 대상이 아니다(TerrainBuilder·VegetationBuilder·
    /// LandmarksBuilder와 다른 점).
    /// </summary>
    public class AnimalBuilder : MonoBehaviour
    {
        private struct AnimalDef
        {
            public int Gx;
            public int Gy;

            /// <summary>같은 칸 안에서 살짝 비켜 두는 자리(월드 단위) — 칸
            /// 하나(48유닛)보다 무리 알림 반경(WanderingAnimal.GroupAlertRadius
            /// =40)이 좁아서, 서로 다른 칸에 심으면 무리가 절대 안 겹친다.
            /// deer_3을 deer_2와 같은 칸(4,4)에 이 오프셋만큼 떨어뜨려 둬서
            /// Group 전파(2026-09-12 추가, 지금까지 실제로 발동하는 장면이
            /// 없었다)가 실제로 보이게 한다.</summary>
            public Vector3 Offset;
        }

        // 마을(2,3)/(3,3)·상인(4,3)·촌장(1,3)·도적(5,3)·채집(1,2)(5,2)(2,4)·
        // 산신당(5,1)과 안 겹치는 들판 자리. deer_1(2,2)은 혼자 배회 — deer_2·
        // deer_3은 (4,4) 한 칸 안에서 17유닛쯤 떨어져 나란히 서 있어(둘 다
        // GroupAlertRadius=40 안) 한쪽이 플레이어를 보고 놀라면 다른 한쪽도
        // 같이 달아나는 걸 실제로 볼 수 있다.
        private static readonly AnimalDef[] Animals =
        {
            new AnimalDef { Gx = 2, Gy = 2, Offset = Vector3.zero },
            new AnimalDef { Gx = 4, Gy = 4, Offset = Vector3.zero },
            new AnimalDef { Gx = 4, Gy = 4, Offset = new Vector3(14f, 0f, 10f) },
        };

        private void Awake()
        {
            Build();
        }

        public void Build()
        {
            foreach (var a in Animals)
            {
                Spawn(a);
            }
        }

        private void Spawn(AnimalDef a)
        {
            char tile = TestMapData.TileAt(a.Gx, a.Gy);
            float ground = TestMapData.Legend[tile].Height;
            Vector3 pos = TestMapData.WorldPos(a.Gx, a.Gy) + a.Offset + new Vector3(0, ground + 0.55f, 0);

            var go = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            go.name = "Deer";
            go.transform.SetParent(transform, false);
            go.transform.position = pos;
            go.transform.localScale = new Vector3(0.7f, 0.55f, 0.7f);
            UnityEngine.Object.DestroyImmediate(go.GetComponent<Collider>());

            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "Deer (generated)" };
            mat.color = new Color(0.45f, 0.32f, 0.18f);
            go.GetComponent<MeshRenderer>().sharedMaterial = mat;

            go.AddComponent<WanderingAnimal>();
        }
    }
}
