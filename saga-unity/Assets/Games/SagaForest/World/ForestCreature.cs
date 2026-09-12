using UnityEngine;

namespace Saga.Forest.World
{
    /// <summary>
    /// FOREST "몬스터·퓨전 콘텐츠" 슬라이스(2026-09-12) — saga-godot
    /// `VERTICAL_SLICE_FOREST.md` 5절 "몬스터·퓨전 자유" 결정(다섯 판 중
    /// FOREST의 주민은 애초에 역사 인물이 아니라 역할 이름이라, "괴물·다른
    /// 시대 요소를 넣어도 된다"는 자유가 있다)을 saga-unity에도 그대로
    /// 적용한 것 — saga-godot FOREST 트랙이 이미 네 종(숲도깨비·바위도깨비·
    /// 버섯정령·꽃정령, `forest_creature.gd`)으로 검증해 둔 걸 개념만
    /// 참고해 Unity로 새로 짰다(코드는 안 베낀다, 다섯 판/두 엔진 트랙 공통
    /// 원칙). **2026-09-12, 네 종(포자괴물·안개유령·무쇠도깨비·나비정령)
    /// 추가** — saga-godot에 없던 종이라 saga-forest 웹판 `data-village.js`
    /// (ANIMALS.mushnub)·한국 설화 모티프(도깨비불)만 참고해 saga-unity가
    /// 처음 짰다. 여덟 종이 네 바이옴에 둘씩(`ForestBiomeData.Zones`
    /// 참고).
    ///
    /// **전투·포획·HP는 이번에도 안 만든다** — 이 판의 핵심 루프는 "돌아다니면
    /// 재미있다"이지 전투가 아니다(`saga-godot/docs/LEGACY_FEATURE_AUDIT.md`
    /// 문장 그대로, GO `WanderingAnimal.cs`가 이미 같은 결정을 내린 것과도
    /// 같은 결). 상태기계(Idle→Wander→Flee)도 GO `WanderingAnimal.cs`와
    /// 같은 구조지만 **Group(무리 전파)는 없다** — godot 쪽 원본 설계에
    /// 없던 걸 새로 얹지 않는다. FOREST엔 GO의 타일 맵 같은 보행 가능
    /// 판정 데이터가 없어(단일 평면) 걸을 수 있는 자리 검사도 생략했다.
    /// </summary>
    public class ForestCreature : MonoBehaviour
    {
        private const float ArriveDist = 0.4f;
        private const float MinIdleSec = 1.5f;
        private const float MaxIdleSec = 3.5f;

        private enum State { Idle, Wander, Flee }

        private Vector3 _origin;
        private Vector3 _target;
        private float _idleUntil;
        private State _state;

        private float _moveSpeed;
        private float _fleeSpeed;
        private float _fleeRadius;      // 이 안에 플레이어가 들어오면 놀라 달아난다.
        private float _fleeStopRadius;  // 이만큼 멀어져야 진정한다(히스테리시스).
        private float _wanderRadius;
        private float _fleeStepRadius;

        private Transform _player;

        /// <summary>씬 빌더가 스폰 직후 한 번 부른다 — `kind`가 시각과 능력치를
        /// 함께 정한다(species별로 다른 primitive 조합·속도·경계심).</summary>
        public void Setup(string kind, Vector3 origin)
        {
            _origin = origin;
            _target = origin;
            transform.position = origin;

            switch (kind)
            {
                case "bawi":
                    _moveSpeed = 0.9f; _fleeSpeed = 2.2f; _fleeRadius = 4.0f; _wanderRadius = 2.5f;
                    SpawnVisualBawi();
                    break;
                case "beoseot":
                    _moveSpeed = 2.0f; _fleeSpeed = 4.2f; _fleeRadius = 3.0f; _wanderRadius = 3.5f;
                    SpawnVisualBeoseot();
                    break;
                case "kkot":
                    _moveSpeed = 1.2f; _fleeSpeed = 3.0f; _fleeRadius = 5.0f; _wanderRadius = 5.0f;
                    SpawnVisualKkot();
                    break;
                case "pojagoemul":
                    // 다섯째 종(2026-09-12) — 넷 중 가장 좁게 돈다(새 초과, 기존
                    // 넷의 "가장 ~함" 주장과 안 겹치는 축).
                    _moveSpeed = 1.1f; _fleeSpeed = 2.8f; _fleeRadius = 4.5f; _wanderRadius = 1.8f;
                    SpawnVisualPojagoemul();
                    break;
                case "angaeyuryeong":
                    // 여섯째 종(2026-09-12) — 넷 중 가장 쉽게 놀란다(fleeRadius
                    // 최댓값, 새 초과). 땅에 안 붙어 사는 유일한 종 — Den의 y가
                    // 1.0이라 배회 내내 그 높이를 유지한다(MoveToward가 y는
                    // 안 건드리므로).
                    _moveSpeed = 1.8f; _fleeSpeed = 4.0f; _fleeRadius = 7.5f; _wanderRadius = 4.2f;
                    SpawnVisualAngaeyuryeong();
                    break;
                case "musoetokkebi":
                    // 일곱째 종(2026-09-12) — 여섯 중 가장 느리게 튄다(fleeSpeed
                    // 최솟값, 새 초과 축 — 이전까지 이 축엔 기록이 없었다).
                    // 바위 지대(무쇠처럼 단단한 껍질, 놀라도 안 서두른다).
                    _moveSpeed = 1.0f; _fleeSpeed = 1.8f; _fleeRadius = 4.5f; _wanderRadius = 2.2f;
                    SpawnVisualMusoetokkebi();
                    break;
                case "nabijeongryeong":
                    // 여덟째 종(2026-09-12) — 여섯 중 가장 급하게 튄다(fleeSpeed
                    // 최댓값, musoetokkebi와 같은 축의 반대쪽 끝). 꽃밭(팔랑이며
                    // 날듯 산다는 인상, 실제 이동 로직은 다른 종과 동일).
                    _moveSpeed = 1.6f; _fleeSpeed = 4.8f; _fleeRadius = 5.5f; _wanderRadius = 4.5f;
                    SpawnVisualNabijeongryeong();
                    break;
                default: // "dokkaebi" — 첫 종, 기본값.
                    _moveSpeed = 1.5f; _fleeSpeed = 3.5f; _fleeRadius = 6.0f; _wanderRadius = 4.0f;
                    SpawnVisualDokkaebi();
                    break;
            }
            _fleeStopRadius = _fleeRadius * 2f;
            _fleeStepRadius = _wanderRadius * 1.5f;

            var playerGo = GameObject.FindWithTag("Player");
            _player = playerGo != null ? playerGo.transform : null;
            PickIdle();
        }

        private void Update()
        {
            if (_player == null) return;

            if (_state == State.Flee)
            {
                UpdateFlee();
                return;
            }

            float distSqr = FlatDistSqr(transform.position, _player.position);
            if (distSqr <= _fleeRadius * _fleeRadius)
            {
                StartFlee();
                return;
            }

            if (_state == State.Idle)
            {
                if (Time.time >= _idleUntil) PickTarget();
                return;
            }

            MoveToward(_target, _moveSpeed);
            if (FlatDistSqr(transform.position, _target) <= ArriveDist * ArriveDist) PickIdle();
        }

        private void UpdateFlee()
        {
            if (FlatDistSqr(transform.position, _player.position) > _fleeStopRadius * _fleeStopRadius)
            {
                PickIdle();
                return;
            }

            MoveToward(_target, _fleeSpeed);
            if (FlatDistSqr(transform.position, _target) <= ArriveDist * ArriveDist) PickFleeTarget();
        }

        private void StartFlee()
        {
            if (_state == State.Flee) return;
            _state = State.Flee;
            PickFleeTarget();
        }

        private void PickIdle()
        {
            _state = State.Idle;
            _idleUntil = Time.time + Random.Range(MinIdleSec, MaxIdleSec);
        }

        private void PickTarget()
        {
            Vector2 offset = Random.insideUnitCircle * _wanderRadius;
            _target = _origin + new Vector3(offset.x, 0f, offset.y);
            _state = State.Wander;
        }

        private void PickFleeTarget()
        {
            Vector3 fleeDir = transform.position - _player.position;
            fleeDir.y = 0f;
            if (fleeDir.sqrMagnitude < 0.01f)
            {
                Vector2 rand = Random.insideUnitCircle;
                fleeDir = new Vector3(rand.x, 0f, rand.y);
            }
            fleeDir.Normalize();
            _target = transform.position + fleeDir * _fleeStepRadius;
        }

        private void MoveToward(Vector3 target, float speed)
        {
            Vector3 toTarget = target - transform.position;
            toTarget.y = 0f;
            if (toTarget.sqrMagnitude <= ArriveDist * ArriveDist) return;

            Vector3 dir = toTarget.normalized;
            transform.position += dir * (speed * Time.deltaTime);
            transform.rotation = Quaternion.LookRotation(dir);
        }

        private static float FlatDistSqr(Vector3 a, Vector3 b)
        {
            float dx = a.x - b.x, dz = a.z - b.z;
            return dx * dx + dz * dz;
        }

        // ── 종별 시각 — 전부 primitive 조합(GLB 없음, PLAN.md 8장 placeholder),
        // `Saga/ForestWorldCurve` 머티리얼을 물려 땅과 같이 휘게 한다(안 그러면
        // 공중에 뜬 것처럼 보인다 — 셰이더 클래스 주석 "땅·나무·NPC 등" 참고).
        // 여덟 종 다 primitive 조합이 겹치지 않게 짰다(구+원기둥 / 상자+상자 /
        // 원기둥+구 / 구+납작구 / 구+작은구 셋 / 구+구 / 납작구+작은구 둘 /
        // 구+납작구 둘).

        private Material CurveMat(string name, Color color)
        {
            var mat = new Material(Shader.Find("Saga/ForestWorldCurve")) { name = name };
            mat.SetColor("_BaseColor", color);
            return mat;
        }

        private static GameObject Primitive(Transform parent, PrimitiveType type, string name,
            Vector3 localPos, Vector3 scale, Material mat)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPos;
            go.transform.localScale = scale;
            go.GetComponent<MeshRenderer>().sharedMaterial = mat;
            Object.Destroy(go.GetComponent<Collider>());
            return go;
        }

        // 숲도깨비 — 구 몸통 + 원기둥 뿔(Unity 기본 도형엔 원뿔이 없어 DUNGEON
        // 바이옴 소품의 나무(줄기+수관)와 같은 이유로 원기둥을 기울여 대신함).
        private void SpawnVisualDokkaebi()
        {
            var bodyMat = CurveMat("Dokkaebi (generated)", new Color(0.30f, 0.42f, 0.28f));
            Primitive(transform, PrimitiveType.Sphere, "Body", new Vector3(0f, 0.5f, 0f), Vector3.one * 0.9f, bodyMat);
            var horn = Primitive(transform, PrimitiveType.Cylinder, "Horn", new Vector3(0f, 1.1f, 0.2f),
                new Vector3(0.12f, 0.35f, 0.12f), bodyMat);
            horn.transform.localRotation = Quaternion.Euler(-20f, 0f, 0f);
        }

        // 바위도깨비 — 상자 몸통 + 작은 상자 혹(돌빛 회갈색), 숲도깨비보다
        // 느리고 덜 겁내게 잡아 체감을 갈랐다.
        private void SpawnVisualBawi()
        {
            var bodyMat = CurveMat("Bawi (generated)", new Color(0.5f, 0.45f, 0.4f));
            Primitive(transform, PrimitiveType.Cube, "Body", new Vector3(0f, 0.45f, 0f), new Vector3(1.0f, 0.8f, 0.8f), bodyMat);
            Primitive(transform, PrimitiveType.Cube, "Hump", new Vector3(0f, 0.95f, -0.1f), new Vector3(0.5f, 0.35f, 0.5f), bodyMat);
        }

        // 버섯정령 — 원기둥 줄기 + 구 갓(청록, 장식 소품보다 크게 잡아 "움직이는
        // 것"이 갈리게 함). 넷 중 가장 빠르고 가장 안 겁낸다.
        private void SpawnVisualBeoseot()
        {
            var stemMat = CurveMat("BeoseotStem (generated)", new Color(0.85f, 0.8f, 0.65f));
            var capMat = CurveMat("BeoseotCap (generated)", new Color(0.2f, 0.55f, 0.55f));
            Primitive(transform, PrimitiveType.Cylinder, "Stem", new Vector3(0f, 0.35f, 0f), new Vector3(0.22f, 0.35f, 0.22f), stemMat);
            Primitive(transform, PrimitiveType.Sphere, "Cap", new Vector3(0f, 0.75f, 0f), new Vector3(0.7f, 0.44f, 0.7f), capMat);
        }

        // 꽃정령 — 구 몸통 + 납작구 꽃관(Unity 기본 도형엔 토러스가 없어 구를
        // Y로 눌러 화관을 대신함 — 원작(godot)의 토러스 관을 이렇게 재해석).
        private void SpawnVisualKkot()
        {
            var bodyMat = CurveMat("Kkot (generated)", new Color(0.95f, 0.93f, 0.88f));
            var crownMat = CurveMat("KkotCrown (generated)", new Color(0.92f, 0.55f, 0.68f));
            Primitive(transform, PrimitiveType.Sphere, "Body", new Vector3(0f, 0.5f, 0f), Vector3.one * 0.85f, bodyMat);
            Primitive(transform, PrimitiveType.Sphere, "Crown", new Vector3(0f, 1.0f, 0f), new Vector3(0.9f, 0.18f, 0.9f), crownMat);
        }

        // 포자괴물 — 다섯째 종(2026-09-12). 웹판 saga-forest `data-village.js`
        // ANIMALS.mushnub("포자괴물", 버섯숲 한정 몬스터)를 개념만 참고 —
        // saga-godot에도 없던 종을 saga-unity에서 처음 짠다(코드가 없으니
        // "베낀다"는 문제 자체가 없음). 버섯정령(줄기+갓, 청록)과 실루엣이
        // 안 겹치게 "찌그러진 몸통 + 삐죽한 포자 혹 셋"으로 짰다 — 병적인
        // 노란빛-녹색.
        private void SpawnVisualPojagoemul()
        {
            var bodyMat = CurveMat("Pojagoemul (generated)", new Color(0.62f, 0.72f, 0.22f));
            var spikeMat = CurveMat("PojagoemulSpike (generated)", new Color(0.4f, 0.42f, 0.15f));
            Primitive(transform, PrimitiveType.Sphere, "Body", new Vector3(0f, 0.42f, 0f), new Vector3(0.9f, 0.6f, 0.9f), bodyMat);
            for (int i = 0; i < 3; i++)
            {
                float ang = i * 120f * Mathf.Deg2Rad;
                var spike = Primitive(transform, PrimitiveType.Sphere, $"Spore{i}",
                    new Vector3(Mathf.Cos(ang) * 0.4f, 0.55f, Mathf.Sin(ang) * 0.4f),
                    Vector3.one * 0.28f, spikeMat);
                spike.transform.localRotation = Quaternion.identity;
            }
        }

        // 안개유령 — 여섯째 종(2026-09-12). 도깨비불(will-o'-the-wisp) 모티프 —
        // 땅에 안 붙어 사는 유일한 종(Den y=1.0, 위 Setup 주석 참고). 창백한
        // 겉불꽃 구 + 안쪽의 밝은 속불꽃 구로 "빛이 흔들린다"는 인상만 정적으로
        // 흉내(애니메이션 없음 — 이 슬라이스 범위 밖).
        private void SpawnVisualAngaeyuryeong()
        {
            var outerMat = CurveMat("AngaeyuryeongOuter (generated)", new Color(0.78f, 0.86f, 0.9f));
            var coreMat = CurveMat("AngaeyuryeongCore (generated)", new Color(0.95f, 0.9f, 0.55f));
            Primitive(transform, PrimitiveType.Sphere, "Body", Vector3.zero, Vector3.one * 0.7f, outerMat);
            Primitive(transform, PrimitiveType.Sphere, "Core", new Vector3(0.08f, 0.05f, 0f), Vector3.one * 0.32f, coreMat);
        }

        // 무쇠도깨비 — 일곱째 종(2026-09-12), 바위 지대(bawi와 공유). 납작하게
        // 웅크린 몸통(무쇠빛 청회색) + 눈 혹 둘(밝은 회백)로 "단단히 웅크린
        // 짐승" 인상을 준다 — bawi(상자+상자 혹, 돌빛 회갈)와 실루엣·색조
        // 둘 다 갈랐다(납작 구 vs 상자, 청회 vs 회갈).
        private void SpawnVisualMusoetokkebi()
        {
            var bodyMat = CurveMat("Musoetokkebi (generated)", new Color(0.42f, 0.46f, 0.55f));
            var eyeMat = CurveMat("MusoetokkebiEye (generated)", new Color(0.75f, 0.78f, 0.8f));
            Primitive(transform, PrimitiveType.Sphere, "Body", new Vector3(0f, 0.28f, 0f), new Vector3(1.1f, 0.5f, 1.0f), bodyMat);
            Primitive(transform, PrimitiveType.Sphere, "EyeL", new Vector3(-0.25f, 0.55f, 0.35f), Vector3.one * 0.16f, eyeMat);
            Primitive(transform, PrimitiveType.Sphere, "EyeR", new Vector3(0.25f, 0.55f, 0.35f), Vector3.one * 0.16f, eyeMat);
        }

        // 나비정령 — 여덟째 종(2026-09-12), 꽃밭(kkot과 공유). 작은 구 몸통 +
        // 납작구 날개 둘(파스텔 보라/청보라)로 kkot(구+화관, 크림/분홍)과
        // 갈랐다 — 날개는 화관처럼 Y로 누른 구를 좌우 대칭으로 붙였다.
        private void SpawnVisualNabijeongryeong()
        {
            var bodyMat = CurveMat("Nabijeongryeong (generated)", new Color(0.85f, 0.55f, 0.85f));
            var wingMat = CurveMat("NabijeongryeongWing (generated)", new Color(0.6f, 0.7f, 0.95f));
            Primitive(transform, PrimitiveType.Sphere, "Body", new Vector3(0f, 0.55f, 0f), Vector3.one * 0.4f, bodyMat);
            Primitive(transform, PrimitiveType.Sphere, "WingL", new Vector3(-0.32f, 0.62f, 0f), new Vector3(0.5f, 0.08f, 0.32f), wingMat);
            Primitive(transform, PrimitiveType.Sphere, "WingR", new Vector3(0.32f, 0.62f, 0f), new Vector3(0.5f, 0.08f, 0.32f), wingMat);
        }
    }
}
