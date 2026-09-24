using UnityEngine;
using Saga.Go.Combat;
using Saga.Go.Data;

namespace Saga.Go.World
{
    /// <summary>
    /// PLAN.md 107-3 "지역마다 바이옴" — 플레이어가 선 지역(`GoWorldMap.RegionAt`)의 안개 빛깔·짙기와 햇빛 빛깔로
    /// 몇 초에 걸쳐 스며들듯 옮겨 간다(경계에서 툭 바뀌지 않게). 햇빛은 씬의 방향광 원래 빛깔에 곱한다.
    /// `WorldMapBuilder` 가 Play 때 붙인다(씬엔 안 굳힌다). 식생은 편집기에서 굽는 씬 자산이라 여기선 안 바꾼다.
    /// </summary>
    public class RegionAtmosphere : MonoBehaviour
    {
        /// <summary>목표에 63% 다가가는 시간(초).</summary>
        public const float BlendSec = 2.5f;

        private Light _sun;
        private Color _sunBase = Color.white;
        private Color _fog;
        private float _density;
        private Color _sunTint = Color.white;

        public string CurrentRegion { get; private set; } = "village";

        private void Start()
        {
            foreach (var l in FindObjectsByType<Light>(FindObjectsSortMode.None))
            {
                if (l.type == LightType.Directional) { _sun = l; break; }
            }
            if (_sun != null) _sunBase = _sun.color;
            _fog = RenderSettings.fogColor;
            _density = RenderSettings.fogDensity;
        }

        private void Update()
        {
            var fc = FieldCombat.Instance;
            if (fc != null) Tick(fc.transform.position, Time.deltaTime);
        }

        /// <summary>한 틱 — 진단이 시간을 건너뛰려고 직접 부른다.</summary>
        public void Tick(Vector3 playerPos, float dt)
        {
            CurrentRegion = GoWorldMap.RegionAt(playerPos);
            var a = GoWorldMap.AtmosphereOf(CurrentRegion);
            float k = 1f - Mathf.Exp(-dt / BlendSec);
            _fog = Color.Lerp(_fog, a.Fog, k);
            _density = Mathf.Lerp(_density, SkyFogBuilder.FogDensity * a.DensityMul, k);
            _sunTint = Color.Lerp(_sunTint, a.Sun, k);
            RenderSettings.fogColor = _fog;
            RenderSettings.fogDensity = _density;
            if (_sun != null) _sun.color = _sunBase * _sunTint;
        }

        public Color SunTint => _sunTint;
    }
}
