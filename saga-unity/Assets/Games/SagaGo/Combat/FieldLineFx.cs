using UnityEngine;

namespace Saga.Go.Combat
{
    /// <summary>
    /// PLAN.md 109-8 — 찌르기·돌진이 지나간 길, 등불 정령이 적을 친 줄기. 땅 위(또는 두 점 사이)에 원소 빛 띠가 번쩍였다 가늘어지며 사라진다
    /// (`FieldRingFx` 와 같은 LineRenderer, 새 셰이더 없음).
    /// </summary>
    public class FieldLineFx : MonoBehaviour
    {
        private LineRenderer _line;
        private float _width;
        private float _life;
        private float _age;
        private Color _color;

        public static FieldLineFx Spawn(Vector3 from, Vector3 to, float width, Color color, float life = 0.35f, float lift = 0.3f)
        {
            var go = new GameObject("FieldLineFx (generated)");
            var fx = go.AddComponent<FieldLineFx>();
            fx._width = width;
            fx._life = life;
            fx._color = color;
            var line = go.AddComponent<LineRenderer>();
            line.useWorldSpace = true;
            line.positionCount = 2;
            line.SetPosition(0, from + Vector3.up * lift);
            line.SetPosition(1, to + Vector3.up * lift);
            line.numCapVertices = 4;
            line.material = new Material(Shader.Find("Sprites/Default")) { name = "FieldLineFx (generated)" };
            line.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            line.alignment = LineAlignment.View;
            fx._line = line;
            fx.Apply(0f);
            return fx;
        }

        private void Update()
        {
            _age += Time.deltaTime;
            Apply(Mathf.Clamp01(_age / _life));
            if (_age >= _life) Destroy(gameObject);
        }

        private void Apply(float t)
        {
            _line.widthMultiplier = Mathf.Lerp(_width, _width * 0.15f, t);
            var c = new Color(_color.r, _color.g, _color.b, (1f - t) * 0.85f);
            _line.startColor = c;
            _line.endColor = new Color(c.r, c.g, c.b, c.a * 0.4f);
        }
    }
}
