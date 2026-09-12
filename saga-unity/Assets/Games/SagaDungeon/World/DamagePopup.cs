using UnityEngine;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// PLAN.md(saga-dungeon 웹판) 38장 "시각 효과" — "damage popup"만 이
    /// 슬라이스에서 가져왔다(slash trail·hit spark·ground effect·skill
    /// particles는 셰이더·파티클 에셋이 새로 필요해 범위 밖). Canvas/UI
    /// 대신 `TextMesh`(월드 공간, 카메라를 바라보게 매 프레임 회전)로
    /// 가장 가볍게 만들었다 — 히트마다 하나씩 생겼다 0.6초 뒤 사라지는
    /// 짧은 수명이라 풀링 없이 Destroy해도 모바일 성능에 부담이 적다고
    /// 판단(PLAN.md 38장 "quality scaling" 요구는 이 정도 수명·개수에선
    /// 아직 필요 없음 — 나중에 팝업이 많아지면 재검토).
    /// </summary>
    public class DamagePopup : MonoBehaviour
    {
        private const float RiseSpeed = 1.4f;
        private const float LifeSec = 0.6f;

        private static readonly Color NormalColor = Color.white;
        private static readonly Color HeavyColor = new Color(1f, 0.55f, 0.1f); // 강공격 버튼과 같은 주황

        private float _t;
        private TextMesh _mesh;
        private Camera _cam;

        public static void Spawn(Vector3 worldPos, float amount, bool heavy)
        {
            var go = new GameObject("DamagePopup");
            go.transform.position = worldPos;

            var mesh = go.AddComponent<TextMesh>();
            mesh.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            go.GetComponent<MeshRenderer>().sharedMaterial = mesh.font.material;
            mesh.text = Mathf.RoundToInt(amount).ToString();
            mesh.characterSize = heavy ? 0.32f : 0.22f;
            mesh.fontSize = 48;
            mesh.color = heavy ? HeavyColor : NormalColor;
            mesh.anchor = TextAnchor.MiddleCenter;
            mesh.alignment = TextAlignment.Center;

            go.AddComponent<DamagePopup>();
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
