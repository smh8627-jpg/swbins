using UnityEngine;
using Saga.Go.Data;

namespace Saga.Go.World
{
    /// <summary>
    /// PLAN.md 24~27장 "동물" — 이번 조각은 사슴 두 마리(Idle/Wander만,
    /// WanderingAnimal.cs 참고). 아직 GLB 전이라 작은 primitive Capsule로
    /// 만듦(PLAN.md 8장) — 사람 크기 capsule(Player·NPC·도적)과 다르게
    /// 작고 낮은 비율로 구분한다. 동물은 절대 안 움직이는 지오메트리가
    /// 아니라 MarkStatic() 대상이 아니다(TerrainBuilder·VegetationBuilder·
    /// LandmarksBuilder와 다른 점).
    /// </summary>
    public class AnimalBuilder : MonoBehaviour
    {
        private struct AnimalDef
        {
            public int Gx;
            public int Gy;
        }

        // 마을(2,3)/(3,3)·상인(4,3)·촌장(1,3)·도적(5,3)·채집(1,2)(5,2)(2,4)·
        // 산신당(5,1)과 안 겹치는 들판 두 자리.
        private static readonly AnimalDef[] Animals =
        {
            new AnimalDef { Gx = 2, Gy = 2 },
            new AnimalDef { Gx = 4, Gy = 4 },
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
            Vector3 pos = TestMapData.WorldPos(a.Gx, a.Gy) + new Vector3(0, ground + 0.55f, 0);

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
