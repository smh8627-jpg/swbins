using UnityEngine;

namespace Saga.Go.Combat
{
    /// <summary>
    /// PLAN.md 109-8 소환 — 곁에 떠 있는 등불 정령. 몸은 Poly Haven 스캔 등잔(`brass_diya_lantern`, CC0 — 인물 꾸밈과 같은 모델)을
    /// 사람 키 높이에 띄워 원소 빛 점광을 달고, 위아래로 흔들며 천천히 돈다. 수명·일격은 `FieldCombat` 구역이 맡는다(교체해도 남는다).
    /// </summary>
    public class SkillSpirit : MonoBehaviour
    {
        public const float Hover = 2.6f;
        private float _age;
        private Vector3 _base;
        private Light _light;

        public static SkillSpirit Spawn(Vector3 ground, GameObject model, Color color)
        {
            var go = new GameObject("SkillSpirit (generated)");
            go.transform.position = ground + Vector3.up * Hover;
            var s = go.AddComponent<SkillSpirit>();
            s._base = go.transform.position;
            if (model != null)
            {
                var m = Instantiate(model, go.transform);
                m.name = "Model";
                m.transform.localPosition = Vector3.zero;
                m.transform.localRotation = Quaternion.identity;
                m.transform.localScale = Vector3.one * (Saga.Go.World.CharacterVisual.HumanHeight / 1.75f * 1.6f);
                foreach (var col in m.GetComponentsInChildren<Collider>()) Destroy(col);
                foreach (var r in m.GetComponentsInChildren<Renderer>()) r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            }
            var lightGo = new GameObject("Glow");
            lightGo.transform.SetParent(go.transform, false);
            lightGo.transform.localPosition = Vector3.up * 0.5f;
            s._light = lightGo.AddComponent<Light>();
            s._light.type = LightType.Point;
            s._light.color = color;
            s._light.range = 7f;
            s._light.intensity = 2.2f;
            s._light.shadows = LightShadows.None;
            FieldRingFx.Spawn(ground, 2f, color, 0.5f);
            return s;
        }

        /// <summary>정령 머리(일격 줄기가 나가는 자리).</summary>
        public Vector3 Tip => transform.position + Vector3.up * 0.6f;

        private void Update()
        {
            _age += Time.deltaTime;
            transform.position = _base + Vector3.up * (Mathf.Sin(_age * 2.4f) * 0.25f);
            transform.rotation = Quaternion.Euler(0f, _age * 40f, 0f);
            if (_light != null) _light.intensity = Mathf.MoveTowards(_light.intensity, 2.2f + Mathf.Sin(_age * 7f) * 0.4f, Time.deltaTime * 10f);
        }

        /// <summary>한 번 칠 때 빛이 번쩍.</summary>
        public void Flash()
        {
            if (_light != null) _light.intensity = 5f;
        }
    }
}
