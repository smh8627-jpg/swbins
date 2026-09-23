using UnityEngine;

namespace Saga.Go.Combat
{
    /// <summary>
    /// PLAN.md 107-1 — 원소 스킬·폭발이 터진 자리에 원소 색 고리가 번졌다 사라진다(LineRenderer, 새 셰이더 없음).
    /// </summary>
    public class FieldRingFx : MonoBehaviour
    {
        private const int Segments = 48;
        private LineRenderer _line;
        private float _radius;
        private float _life;
        private float _age;
        private Color _color;

        public static void Spawn(Vector3 center, float radius, Color color, float life = 0.45f)
        {
            var go = new GameObject("FieldRingFx (generated)");
            go.transform.position = center + Vector3.up * 0.3f;
            var fx = go.AddComponent<FieldRingFx>();
            fx._radius = radius;
            fx._life = life;
            fx._color = color;
            var line = go.AddComponent<LineRenderer>();
            line.useWorldSpace = false;
            line.loop = true;
            line.positionCount = Segments;
            line.material = new Material(Shader.Find("Sprites/Default")) { name = "FieldRingFx (generated)" };
            line.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            fx._line = line;
            fx.Apply(0f);
        }

        private void Update()
        {
            _age += Time.deltaTime;
            Apply(Mathf.Clamp01(_age / _life));
            if (_age >= _life) Destroy(gameObject);
        }

        private void Apply(float t)
        {
            float r = Mathf.Lerp(_radius * 0.3f, _radius, 1f - (1f - t) * (1f - t));
            for (int i = 0; i < Segments; i++)
            {
                float a = i * Mathf.PI * 2f / Segments;
                _line.SetPosition(i, new Vector3(Mathf.Cos(a) * r, 0f, Mathf.Sin(a) * r));
            }
            _line.widthMultiplier = Mathf.Lerp(0.6f, 0.1f, t);
            var c = new Color(_color.r, _color.g, _color.b, 1f - t);
            _line.startColor = c;
            _line.endColor = c;
        }
    }
}
