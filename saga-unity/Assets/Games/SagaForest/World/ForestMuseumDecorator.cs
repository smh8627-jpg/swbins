using UnityEngine;
using Saga.Forest.Data;

namespace Saga.Forest.World
{
    /// <summary>
    /// PLAN.md 101-2 5.3 FOREST "마을 번들" — 웹판 "번들 완성 시 마을 시설
    /// 1개(정자·정원·석비·조개 길)"의 뜻. 실제 GLB 자산이 없어(원작 자산
    /// 금지, 루트 CLAUDE.md) 갈래마다 다른 모양의 primitive 조합으로
    /// 대신한다(DUNGEON `World/DungeonWell.cs`류와 같은 결). `World/
    /// ForestBootstrap.cs`가 실시간 완성 이벤트와 "로드 직후 이미 완성된
    /// 것" 양쪽에서 이 두 메서드를 부른다 — 멱등을 이 클래스가 보장하지
    /// 않으므로 호출부가 한 번만 부르도록 책임진다(`ForestMuseumState`의
    /// `BundleDone`/`AllBundlesDone` 가드가 실제로 그 역할을 한다).
    /// </summary>
    public static class ForestMuseumDecorator
    {
        private const float NearOffset = 2.5f; // 채집 자리(ForestCollectSpot)와 안 겹치는 거리.

        public static void SpawnBundleDecoration(ForestMuseumState.Category category, Vector3 nearPos)
        {
            Vector3 pos = nearPos + new Vector3(NearOffset, 0f, NearOffset);
            switch (category)
            {
                case ForestMuseumState.Category.Insect: BuildFireflyJar(pos); break;
                case ForestMuseumState.Category.Mushroom: BuildMushroomRing(pos); break;
                case ForestMuseumState.Category.Fossil: BuildStele(pos); break;
                case ForestMuseumState.Category.Flower: BuildFlowerBed(pos); break;
            }
        }

        public static void SpawnFlag(Vector3 pos)
        {
            var pole = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            pole.name = "Decor_MuseumFlagPole";
            pole.transform.position = pos + new Vector3(0f, 1.5f, 0f);
            pole.transform.localScale = new Vector3(0.12f, 1.5f, 0.12f);
            pole.GetComponent<MeshRenderer>().sharedMaterial = MakeMat(new Color(0.35f, 0.3f, 0.22f));
            Object.Destroy(pole.GetComponent<Collider>());

            var flag = GameObject.CreatePrimitive(PrimitiveType.Cube);
            flag.name = "Decor_MuseumFlagCloth";
            flag.transform.position = pos + new Vector3(0.5f, 2.6f, 0f);
            flag.transform.localScale = new Vector3(1f, 0.6f, 0.05f);
            flag.GetComponent<MeshRenderer>().sharedMaterial = MakeMat(new Color(0.85f, 0.65f, 0.15f));
            Object.Destroy(flag.GetComponent<Collider>());
        }

        private static void BuildFireflyJar(Vector3 pos)
        {
            var jar = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            jar.name = "Decor_FireflyJar";
            jar.transform.position = pos + new Vector3(0f, 0.4f, 0f);
            jar.transform.localScale = new Vector3(0.5f, 0.4f, 0.5f);
            jar.GetComponent<MeshRenderer>().sharedMaterial = MakeMat(new Color(0.7f, 0.85f, 0.6f, 0.6f));
            Object.Destroy(jar.GetComponent<Collider>());

            var lightGo = new GameObject("Decor_FireflyLight");
            lightGo.transform.position = pos + new Vector3(0f, 0.7f, 0f);
            var light = lightGo.AddComponent<Light>();
            light.type = LightType.Point;
            light.color = new Color(0.75f, 1f, 0.55f);
            light.range = 4f;
            light.intensity = 1.2f;
        }

        private static void BuildMushroomRing(Vector3 pos)
        {
            Vector3[] offsets = { new Vector3(0f, 0f, 0f), new Vector3(0.6f, 0f, 0.3f), new Vector3(-0.5f, 0f, 0.4f) };
            foreach (var off in offsets)
            {
                var stem = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                stem.name = "Decor_MushroomStem";
                stem.transform.position = pos + off + new Vector3(0f, 0.25f, 0f);
                stem.transform.localScale = new Vector3(0.12f, 0.25f, 0.12f);
                stem.GetComponent<MeshRenderer>().sharedMaterial = MakeMat(new Color(0.85f, 0.8f, 0.7f));
                Object.Destroy(stem.GetComponent<Collider>());

                var cap = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                cap.name = "Decor_MushroomCap";
                cap.transform.position = pos + off + new Vector3(0f, 0.5f, 0f);
                cap.transform.localScale = new Vector3(0.4f, 0.22f, 0.4f);
                cap.GetComponent<MeshRenderer>().sharedMaterial = MakeMat(new Color(0.7f, 0.2f, 0.55f));
                Object.Destroy(cap.GetComponent<Collider>());
            }
        }

        private static void BuildStele(Vector3 pos)
        {
            var slab = GameObject.CreatePrimitive(PrimitiveType.Cube);
            slab.name = "Decor_FossilStele";
            slab.transform.position = pos + new Vector3(0f, 0.9f, 0f);
            slab.transform.localScale = new Vector3(0.7f, 1.8f, 0.2f);
            slab.GetComponent<MeshRenderer>().sharedMaterial = MakeMat(new Color(0.5f, 0.48f, 0.45f));
            Object.Destroy(slab.GetComponent<Collider>());
        }

        private static void BuildFlowerBed(Vector3 pos)
        {
            var bed = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            bed.name = "Decor_FlowerBed";
            bed.transform.position = pos + new Vector3(0f, 0.1f, 0f);
            bed.transform.localScale = new Vector3(1.2f, 0.1f, 1.2f);
            bed.GetComponent<MeshRenderer>().sharedMaterial = MakeMat(new Color(0.3f, 0.22f, 0.15f));
            Object.Destroy(bed.GetComponent<Collider>());

            Color[] petalColors = { new Color(0.95f, 0.3f, 0.5f), new Color(0.95f, 0.85f, 0.3f), new Color(0.6f, 0.4f, 0.95f) };
            Vector3[] offsets = { new Vector3(0.3f, 0f, 0.2f), new Vector3(-0.3f, 0f, 0.1f), new Vector3(0f, 0f, -0.3f) };
            for (int i = 0; i < offsets.Length; i++)
            {
                var petal = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                petal.name = "Decor_FlowerBloom";
                petal.transform.position = pos + offsets[i] + new Vector3(0f, 0.25f, 0f);
                petal.transform.localScale = Vector3.one * 0.3f;
                petal.GetComponent<MeshRenderer>().sharedMaterial = MakeMat(petalColors[i]);
                Object.Destroy(petal.GetComponent<Collider>());
            }
        }

        private static Material MakeMat(Color color)
        {
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "ForestMuseumDecor (generated)" };
            mat.color = color;
            return mat;
        }
    }
}
