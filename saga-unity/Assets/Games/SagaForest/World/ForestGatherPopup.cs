using UnityEngine;

namespace Saga.Forest.World
{
    /// <summary>
    /// PLAN.md 101-2 5.8① "수확 팝" — 웹판 "아이템 아이콘 0.6s 포물선 →
    /// 가방"(177행)은 가방이 없어(<see cref="Data.ForestMuseumState"/> 클래스
    /// 주석) 옮길 대상이 없다. 대신 `SagaDungeon/World/DamagePopup.cs`와 같은
    /// 결(TextMesh, 카메라를 바라보며 0.6초 떠오르다 사라짐)로 발견한
    /// 이름을 그대로 띄운다 — 다섯 판이 각자 복사해 쓰는 관례 그대로,
    /// 새 코드를 이 판에 따로 만든다.
    /// </summary>
    public class ForestGatherPopup : MonoBehaviour
    {
        private const float RiseSpeed = 0.9f;
        private const float LifeSec = 0.6f;

        private static readonly Color NormalColor = Color.white;
        private static readonly Color BonusColor = new Color(1f, 0.82f, 0.2f); // 리듬 보너스 — 금색.

        private float _t;
        private TextMesh _mesh;
        private Camera _cam;

        public static void Spawn(Vector3 worldPos, string text, bool bonus)
        {
            var go = new GameObject("ForestGatherPopup");
            go.transform.position = worldPos;

            var mesh = go.AddComponent<TextMesh>();
            mesh.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            go.GetComponent<MeshRenderer>().sharedMaterial = mesh.font.material;
            mesh.text = text;
            mesh.characterSize = bonus ? 0.24f : 0.18f;
            mesh.fontSize = 40;
            mesh.color = bonus ? BonusColor : NormalColor;
            mesh.anchor = TextAnchor.MiddleCenter;
            mesh.alignment = TextAlignment.Center;

            go.AddComponent<ForestGatherPopup>();
        }

        private void Awake()
        {
            _mesh = GetComponent<TextMesh>();
            _cam = Camera.main;
        }

        private void Update()
        {
            _t += Time.deltaTime;
            transform.position += Vector3.up * RiseSpeed * Time.deltaTime;
            if (_cam != null) transform.rotation = _cam.transform.rotation;

            if (_mesh != null)
            {
                Color c = _mesh.color;
                c.a = Mathf.Clamp01(1f - _t / LifeSec);
                _mesh.color = c;
            }

            if (_t >= LifeSec) Destroy(gameObject);
        }
    }
}
