using UnityEngine;
using UnityEngine.Rendering;

namespace Saga.Go.World
{
    /// <summary>
    /// VERTICAL_SLICE.md Phase 3 나머지 — Sky/Fog. 원래 saga-godot의
    /// env_pc.tres 값을 그대로 옮겼었는데(중립적인 대낮 톤), PLAN.md
    /// 66-2장(파이널 판타지 최신작 기준)에서 두 트랙 그래픽이 갈라진 뒤로는
    /// 이 팔레트도 saga-unity 자체 방향(golden-hour 시네마틱)에 맞춰
    /// 새로 잡는다 — **더 이상 saga-godot 값과 안 맞아도 된다**(66-2장
    /// "saga-unity와의 관계" 참고). 이전엔 전체 팔레트가 창백한 회록색
    /// 한 톤이라 GlobalVolume(66-2 후처리)의 Bloom·따뜻한 색보정이 화면에
    /// 거의 안 보였다 — Fog·Trilight 앰비언트가 태양보다 화면을 더 많이
    /// 덮어서다(GUI로 실제로 확인하고 나서 찾은 원인). Trilight
    /// 앰비언트(하늘/수평선/땅 3색), RenderSettings.fog로 원경 흐림.
    /// 카메라 배경색은 HorizonColor를 그대로 써서(BuildTestVillageScene
    /// 참고) 스카이박스 자산이 없어도 하늘이 보인다.
    /// </summary>
    public class SkyFogBuilder : MonoBehaviour
    {
        public static readonly Color SkyColor = new Color(0.45f, 0.55f, 0.72f);
        public static readonly Color HorizonColor = new Color(0.95f, 0.75f, 0.55f);
        public static readonly Color GroundColor = new Color(0.35f, 0.27f, 0.2f);
        public static readonly Color FogColor = new Color(0.85f, 0.72f, 0.58f);

        // 원경이 완전히 팔레트 한 색으로 뭉개지지 않도록 옅게 낮췄다
        // (0.006 → 0.0035) — 안개 자체(원근감 있는 흐림)는 남기되, 태양·
        // Bloom이 실제로 보일 여지를 준다. 실제로 먼 지형이 알맞게
        // 흐려지는지는 GUI로 몰아서 확인할 때 볼 것.
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
