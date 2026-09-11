using UnityEngine;
using UnityEngine.Rendering;

namespace Saga.Go.World
{
    /// <summary>
    /// VERTICAL_SLICE.md Phase 3 나머지 — Sky/Fog. saga-godot의
    /// assets/environment/env_pc.tres(ProceduralSkyMaterial + Environment
    /// fog) 수치를 그대로 옮긴다. 스카이박스 셰이더 자산 없이 URP/
    /// RenderSettings API만으로 되는 만큼만 채운다(LandmarksBuilder가
    /// primitive+단색 머티리얼로 절제한 것과 같은 정신) — Trilight
    /// 앰비언트(하늘/수평선/땅 3색)가 Godot의 sky_top/horizon·
    /// ground_bottom/horizon 색과 같은 역할, RenderSettings.fog가
    /// fog_enabled/fog_density/fog_light_color와 같은 역할이다.
    /// 카메라 배경색은 HorizonColor를 그대로 써서(BuildTestVillageScene
    /// 참고) 스카이박스 자산이 없어도 하늘이 파랗게 보인다.
    /// </summary>
    public class SkyFogBuilder : MonoBehaviour
    {
        public static readonly Color SkyColor = new Color(0.38f, 0.55f, 0.82f);
        public static readonly Color HorizonColor = new Color(0.75f, 0.8f, 0.78f);
        public static readonly Color GroundColor = new Color(0.3f, 0.28f, 0.24f);
        public static readonly Color FogColor = new Color(0.75f, 0.78f, 0.72f);

        // env_pc.tres의 fog_density와 같은 값 — saga-godot·saga-unity가
        // 같은 세계 축척(TestMapData.TileSize 48m)을 쓰기로 한 결정
        // (PROJECT_STATE.md Phase 2)을 그대로 따라 값도 그대로 옮겼다.
        // 실제로 먼 지형이 알맞게 흐려지는지는 GUI로 몰아서 확인할 때 볼 것.
        public const float FogDensity = 0.006f;

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
