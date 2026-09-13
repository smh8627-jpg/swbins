using UnityEngine;
using UnityEngine.Rendering;

namespace Saga.Forest.World
{
    /// <summary>
    /// 2026-09-13 GUI 실기 확인에서 Forest만 여전히 밋밋한 채도 높은
    /// 초록 평면으로 보인 것을 데운다 — `SagaGo.World.SkyFogBuilder`와
    /// 같은 결(Trilight 앰비언트 + 옅은 안개로 golden-hour 톤을 만드는
    /// 방식)이지만 숲마을에 맞게 색을 새로 잡았다(초록 지면이 죽지 않게
    /// GroundColor는 GO보다 덜 갈색, HorizonColor는 살짝 덜 진하게).
    /// 카메라 배경색도 이 HorizonColor를 그대로 써서 스카이박스 없이도
    /// 하늘이 보이게 한다(`BuildTestVillageForestScene.BuildCamera` 참고).
    /// </summary>
    public class ForestSkyFogBuilder : MonoBehaviour
    {
        public static readonly Color SkyColor = new Color(0.5f, 0.62f, 0.78f);
        public static readonly Color HorizonColor = new Color(0.92f, 0.78f, 0.58f);
        public static readonly Color GroundColor = new Color(0.32f, 0.34f, 0.2f);
        public static readonly Color FogColor = new Color(0.8f, 0.75f, 0.55f);
        public const float FogDensity = 0.0035f;

        public void Build()
        {
            RenderSettings.skybox = null;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = SkyColor;
            RenderSettings.ambientEquatorColor = HorizonColor;
            RenderSettings.ambientGroundColor = GroundColor;

            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            RenderSettings.fogColor = FogColor;
            RenderSettings.fogDensity = FogDensity;
        }
    }
}
