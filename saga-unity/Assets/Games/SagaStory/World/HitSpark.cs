using UnityEngine;

namespace Saga.Story.World
{
    /// <summary>
    /// `Saga.Dungeon.World.HitSpark`와 완전히 같은 로직(루트 CLAUDE.md
    /// "다섯 판은 다섯 벌 복사" 원칙 — SagaStory.asmdef가 SagaDungeon을
    /// 참조하지 않는다). PLAN.md 101-3 C "타격 VFX" — STORY는 `crit`을
    /// DUNGEON의 `heavy`와 같은 자리(더 굵고 빠른 스파크)로 쓴다.
    /// </summary>
    public static class HitSpark
    {
        private const float LifeSec = 0.25f;
        private const int NormalParticles = 8;
        private const int HeavyParticles = 14;
        private const float NormalSpeed = 3f;
        private const float HeavySpeed = 5f;

        private static readonly Color SparkColor = new Color(1f, 0.85f, 0.3f);

        public static int SpawnCount { get; private set; }

        public static void Spawn(Vector3 worldPos, bool heavy = false)
        {
            SpawnCount++;

            var go = new GameObject("HitSpark");
            go.transform.position = worldPos;

            var ps = go.AddComponent<ParticleSystem>();
            var main = ps.main;
            main.duration = LifeSec;
            main.loop = false;
            main.startLifetime = LifeSec;
            main.startSpeed = heavy ? HeavySpeed : NormalSpeed;
            main.startSize = heavy ? 0.16f : 0.1f;
            main.startColor = SparkColor;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.playOnAwake = false;
            main.stopAction = ParticleSystemStopAction.None;

            var emission = ps.emission;
            emission.rateOverTime = 0f;

            var shape = ps.shape;
            shape.shapeType = ParticleSystemShapeType.Sphere;
            shape.radius = 0.05f;

            var renderer = ps.GetComponent<ParticleSystemRenderer>();
            renderer.material = new Material(Shader.Find("Sprites/Default"));

            ps.Emit(heavy ? HeavyParticles : NormalParticles);
            Object.Destroy(go, LifeSec);
        }
    }
}
