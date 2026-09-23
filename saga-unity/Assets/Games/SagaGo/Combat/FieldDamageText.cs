using UnityEngine;

namespace Saga.Go.Combat
{
    /// <summary>
    /// PLAN.md 107-1 "피해 숫자" — 맞은 자리 위로 떠오르며 흐려지는 글자(TextMesh, 새 셰이더 없음).
    /// 반응 이름은 반응 색으로 크게. 카메라를 늘 바라본다.
    /// </summary>
    public class FieldDamageText : MonoBehaviour
    {
        private const float LifeSec = 0.9f;
        private const float RiseSpeed = 2.4f;

        private TextMesh _text;
        private Color _color;
        private float _age;

        public static void Spawn(Vector3 worldPos, string text, Color color, float size = 1f)
        {
            var go = new GameObject("FieldDamageText (generated)");
            go.transform.position = worldPos + new Vector3(Random.Range(-0.6f, 0.6f), 0f, Random.Range(-0.6f, 0.6f));
            var t = go.AddComponent<TextMesh>();
            t.text = text;
            t.anchor = TextAnchor.MiddleCenter;
            t.alignment = TextAlignment.Center;
            t.fontSize = 64;
            t.characterSize = 0.06f * size;
            t.color = color;
            var d = go.AddComponent<FieldDamageText>();
            d._text = t;
            d._color = color;
        }

        private void Update()
        {
            _age += Time.deltaTime;
            transform.position += Vector3.up * (RiseSpeed * Time.deltaTime);
            var cam = Camera.main;
            if (cam != null) transform.rotation = Quaternion.LookRotation(transform.position - cam.transform.position);
            float a = 1f - Mathf.Clamp01((_age - LifeSec * 0.5f) / (LifeSec * 0.5f));
            _text.color = new Color(_color.r, _color.g, _color.b, a);
            if (_age >= LifeSec) Destroy(gameObject);
        }
    }
}
