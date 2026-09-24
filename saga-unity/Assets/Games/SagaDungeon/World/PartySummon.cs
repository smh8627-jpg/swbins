using UnityEngine;
using Saga.Dungeon.Audio;
using Saga.Dungeon.Data;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// PLAN.md 106-6 "소환수 대형 연출" — 소환 게이지가 차면 부르는 "바위 거신"(가상, 원작 소환수 이름 없음).
    /// 두목 모델(Brute)을 3.2배로 키워 돌빛을 입히고, 발밑 금빛 진·큰 점광과 함께 땅에서 솟아(0~1.4초) 주먹으로
    /// 땅을 내리친다(3.2초 — 14m 안 살아 있는 적 전부에 플레이어 한 타 × 15, 강공격 판정이라 예비동작도 끊긴다).
    /// 4.2초부터 가라앉아 5초에 사라진다. 컷(`DungeonCutscenes.PlaySummon`)은 카메라·제목만 맡고, 시간은 이 개체가
    /// 스스로 센다 — 컷이 넘겨지거나 없으면 `ResolveNow()` 가 내리치기를 그 자리에서 끝낸다(피해는 한 번만).
    /// </summary>
    public class PartySummon : MonoBehaviour
    {
        public const float Radius = 14f;
        public const float DamageMul = 15f;
        public const float Scale = 3.2f;
        public const float RiseSec = 1.4f;
        public const float SwingSec = 2.7f;  // 공격 클립을 틀어 내리치는 순간이 SlamSec 에 닿게.
        public const float SlamSec = 3.2f;
        public const float SinkStartSec = 4.2f;
        public const float EndSec = 5.0f;
        public const float StandOffM = 4f;
        private const float FallbackHeight = 6f;

        private static readonly Color StoneTint = new Color(0.78f, 0.7f, 0.55f);
        private static readonly Color RuneColor = new Color(1f, 0.8f, 0.35f);

        private Transform _body;
        private Animator _animator;
        private Light _light;
        private LineRenderer _circle;
        private LineRenderer _shock;
        private float _t;
        private float _height;
        private bool _swung;
        private bool _slammed;
        private float _shockT = -1f;

        public bool Slammed => _slammed;
        public int LastHitCount { get; private set; }
        public float Elapsed => _t;
        public static int SlamCount { get; private set; } // 진단용 누적.

        /// <summary>플레이어 앞 `StandOffM`(벽이 가까우면 벽 앞)에 세운다.</summary>
        public static PartySummon Spawn(GameObject modelPrefab, Vector3 playerPos, Vector3 playerForward)
        {
            Vector3 fwd = playerForward;
            fwd.y = 0f;
            fwd = fwd.sqrMagnitude > 0.01f ? fwd.normalized : Vector3.forward;
            float d = StandOffM;
            Vector3 chest = playerPos + Vector3.up * 1.2f;
            if (Physics.Raycast(chest, fwd, out RaycastHit hit, StandOffM + 1.5f, ~0, QueryTriggerInteraction.Ignore))
            {
                d = Mathf.Clamp(hit.distance - 1.5f, 1.5f, StandOffM);
            }
            var go = new GameObject("PartySummon");
            go.transform.position = new Vector3(playerPos.x, playerPos.y, playerPos.z) + fwd * d;
            go.transform.rotation = Quaternion.LookRotation(fwd);
            var s = go.AddComponent<PartySummon>();
            s.Build(modelPrefab);
            return s;
        }

        private void Build(GameObject modelPrefab)
        {
            var bodyRoot = new GameObject("Body").transform;
            bodyRoot.SetParent(transform, false);
            _body = bodyRoot;
            if (modelPrefab != null && modelPrefab.GetComponent<Animator>() != null)
            {
                var inst = Instantiate(modelPrefab, bodyRoot, false);
                inst.name = "Visual";
                inst.transform.localScale = Vector3.one * Scale;
                _animator = inst.GetComponent<Animator>();
                CharacterVisual.Tint(inst, StoneTint);
                _height = 1.9f * Scale;
            }
            else
            {
                CharacterVisual.SpawnFallbackCapsule(bodyRoot, FallbackHeight, StoneTint);
                _height = FallbackHeight;
            }
            _body.localPosition = new Vector3(0f, -_height, 0f);

            _light = gameObject.AddComponent<Light>();
            _light.type = LightType.Point;
            _light.color = RuneColor;
            _light.range = 18f;
            _light.intensity = 0f;

            _circle = Ring("SummonCircle", 3.5f, 0.12f);
            _shock = Ring("SlamShock", 1f, 0.25f);
            _shock.enabled = false;
            SfxPlayer.PlayHeavyHit();
        }

        private LineRenderer Ring(string name, float radius, float width)
        {
            var go = new GameObject(name);
            go.transform.SetParent(transform, false);
            go.transform.localPosition = new Vector3(0f, 0.07f, 0f);
            var lr = go.AddComponent<LineRenderer>();
            lr.useWorldSpace = false;
            lr.loop = true;
            lr.widthMultiplier = width;
            lr.material = new Material(Shader.Find("Sprites/Default"));
            lr.startColor = lr.endColor = RuneColor;
            lr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            SetRadius(lr, radius);
            return lr;
        }

        private static void SetRadius(LineRenderer lr, float radius)
        {
            const int seg = 48;
            lr.positionCount = seg;
            for (int i = 0; i < seg; i++)
            {
                float a = i * Mathf.PI * 2f / seg;
                lr.SetPosition(i, new Vector3(Mathf.Cos(a) * radius, 0f, Mathf.Sin(a) * radius));
            }
        }

        private void Update() => Tick(Time.deltaTime);

        /// <summary>한 프레임 — 진단이 시간을 직접 넣는다. 끝나면 스스로 사라진다.</summary>
        public void Tick(float dt)
        {
            _t += dt;
            float rise = Mathf.SmoothStep(0f, 1f, Mathf.Clamp01(_t / RiseSec));
            float sink = Mathf.SmoothStep(0f, 1f, Mathf.Clamp01((_t - SinkStartSec) / (EndSec - SinkStartSec)));
            if (_body != null) _body.localPosition = new Vector3(0f, -_height * (1f - rise + sink), 0f);
            if (_light != null) _light.intensity = 8f * rise * (1f - sink);

            if (!_swung && _t >= SwingSec)
            {
                _swung = true;
                if (_animator != null) _animator.SetTrigger("Attack");
            }
            if (!_slammed && _t >= SlamSec) Slam();

            if (_shockT >= 0f && _shock != null)
            {
                _shockT += dt;
                float k = Mathf.Clamp01(_shockT / 0.5f);
                SetRadius(_shock, Mathf.Lerp(1f, Radius, k));
                _shock.startColor = _shock.endColor = new Color(RuneColor.r, RuneColor.g, RuneColor.b, 1f - k);
                if (k >= 1f) _shock.enabled = false;
            }
            if (_t >= EndSec) Destroy(gameObject);
        }

        /// <summary>컷이 넘겨졌거나 없을 때 — 아직 안 내리쳤으면 지금 내리치고 곧바로 사라진다.</summary>
        public void ResolveNow()
        {
            if (this == null) return;
            if (!_slammed) Slam();
            Destroy(gameObject);
        }

        private void Slam()
        {
            _slammed = true;
            SlamCount++;
            float damage = HeroState.HitDamage * DamageMul;
            int n = 0;
            Vector3 c = transform.position;
            // 목록을 베껴 돈다 — 죽는 적이 OnDisable 로 Active 에서 빠진다.
            foreach (var e in DungeonEnemy.Active.ToArray())
            {
                if (e == null || !e.IsAlive) continue;
                Vector3 d = e.transform.position - c;
                d.y = 0f;
                if (d.magnitude > Radius) continue;
                e.TakeDamage(damage, heavy: true);
                n++;
            }
            LastHitCount = n;
            if (_shock != null)
            {
                _shock.enabled = true;
                _shockT = 0f;
            }
            if (_circle != null) _circle.enabled = false;
            GroundDecal.Spawn(c, GroundDecal.Kind.HitMark);
            HitSpark.Spawn(c + Vector3.up * 0.5f, heavy: true);
            SfxPlayer.PlayHeavyHit();
        }
    }
}
