using UnityEngine;
using Saga.Dungeon.Audio;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// PLAN.md 101-3 F "죽음" — 적이 쓰러진 자리에 짧게 남는 표식. 실제
    /// 보상(경험치·돈·장비·보석)은 `DungeonEnemy.Die()`가 그 자리에서
    /// 이미 다 준다(세이브·베스티어리·퀘스트 완료까지 얽혀 있어 이번
    /// 항목 때문에 그 흐름을 늦추지 않는다 — 101-3 장 전제 "기존 씬
    /// 구성을 안 바꾸는 컴포넌트 추가"). 이 마커는 그 보상의 **시각적
    /// 잔향**일 뿐이라 주워도 아무것도 더 안 준다 — 반짝임+효과음으로
    /// "여기서 뭔가 떨어졌었다"는 확인만 준다.
    ///
    /// 회수 판정은 트리거 콜라이더 대신 `DungeonSecretStash.cs`와 같은
    /// "DUNGEON 관례"(Update() 폴링 거리 판정)를 그대로 따른다.
    /// </summary>
    public class LootMarker : MonoBehaviour
    {
        private const float PickupRadius = 2f; // PLAN.md 101-3 F "회수 반경 2m" 그대로.
        private const float LifetimeSec = 12f; // 안 주우면 스스로 사라진다 — 방에 계속 쌓이지 않게.
        private const float BobHeight = 0.12f;
        private const float BobSpeed = 2.5f;
        private const float SpinDegPerSec = 90f;

        private static readonly Color GlowColor = new Color(0.75f, 0.85f, 1f);
        private static readonly Color EmissionColor = new Color(0.5f, 0.6f, 0.9f);

        /// <summary>테스트 전용 카운터(리플렉션 대신) — `HitSpark.SpawnCount`와 같은 결.</summary>
        public static int SpawnCount { get; private set; }

        private Transform _player;
        private Transform _visual;
        private Vector3 _basePos;
        private float _age;

        public static void Spawn(Vector3 worldPos)
        {
            SpawnCount++;
            var go = new GameObject("LootMarker");
            go.transform.position = worldPos;
            go.AddComponent<LootMarker>();
        }

        private void Awake()
        {
            _basePos = transform.position;
            var playerGo = GameObject.FindWithTag("Player");
            _player = playerGo != null ? playerGo.transform : null;
            BuildVisual();
        }

        private void BuildVisual()
        {
            var visual = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            visual.name = "Visual";
            visual.transform.SetParent(transform, false);
            visual.transform.localScale = Vector3.one * 0.35f;
            visual.transform.localPosition = new Vector3(0f, 0.5f, 0f);
            Object.Destroy(visual.GetComponent<Collider>());

            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "LootMarker (generated)" };
            mat.color = GlowColor;
            mat.EnableKeyword("_EMISSION");
            mat.SetColor("_EmissionColor", EmissionColor);
            visual.GetComponent<MeshRenderer>().sharedMaterial = mat;

            _visual = visual.transform;
        }

        private void Update()
        {
            _age += Time.deltaTime;
            if (_visual != null)
            {
                float bob = Mathf.Sin(_age * BobSpeed) * BobHeight;
                _visual.localPosition = new Vector3(0f, 0.5f + bob, 0f);
                _visual.Rotate(Vector3.up, SpinDegPerSec * Time.deltaTime, Space.World);
            }

            if (_player != null && Vector3.Distance(_basePos, _player.position) <= PickupRadius)
            {
                SfxPlayer.PlayDiscovery();
                Destroy(gameObject);
                return;
            }

            if (_age >= LifetimeSec)
            {
                Destroy(gameObject);
            }
        }
    }
}
