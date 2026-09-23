using System;
using System.Collections.Generic;
using UnityEngine;
using Saga.Go.Data;
using Saga.Go.World;

namespace Saga.Go.Combat
{
    /// <summary>
    /// PLAN.md 107-1 "적" — 지도 위를 떠도는 들판 적. 배회 → 발견(24m) → 추격 → 예고(0.6s) → 판정 → 쉼.
    /// 집에서 45m 끌려 나오면 귀가하며 회복, 쓰러지면 90초 뒤 다시 선다. 물리 충돌체는 없다 —
    /// 카메라 벽 pull-in(`CameraRig`, 모든 레이어 raycast)이 적 몸에 걸리지 않게 하려고, 대신 서로·
    /// 플레이어와 거리를 코드로 벌린다. 피해 판정도 물리 쿼리 없이 <see cref="All"/> 을 거리로 훑는다.
    /// </summary>
    public class FieldEnemy : MonoBehaviour
    {
        public enum Kind { Bandit, Skeleton }
        public enum State { Wander, Chase, Telegraph, Recover, Return, Dead }

        public const float DetectRadius = 24f;
        public const float GiveUpRadius = 32f;
        public const float LeashRadius = 45f;
        public const float WanderRadius = 10f;
        public const float ChaseSpeed = 7f;
        public const float WanderSpeed = 2.2f;
        public const float ReturnSpeed = 9f;
        public const float EngageRange = 3.4f;
        public const float StrikeRadius = 4.2f;
        public const float TelegraphSec = 0.6f;
        public const float RecoverSec = 1.2f;
        public const float RespawnSec = 90f;
        public const float SeparationRadius = 2.6f;
        private const float BodyHeight = 3.4f;

        private static readonly List<FieldEnemy> _all = new List<FieldEnemy>();
        public static IReadOnlyList<FieldEnemy> All => _all;

        /// <summary>쓰러진 순간 — 보물 상자 "무리 전멸" 잠금(107 ④)·진단이 듣는다.</summary>
        public static event Action<FieldEnemy> Killed;

        [SerializeField] private Kind kind;
        [SerializeField] private GameObject model;

        public Kind EnemyKind => kind;
        public string DisplayName { get; private set; }
        public float MaxHp { get; private set; }
        public float Hp { get; private set; }
        public float Atk { get; private set; }
        public int ExpReward { get; private set; }
        public Vector3 Home { get; private set; }
        private Vector3 _spawnHome;
        public State CurrentState { get; private set; } = State.Wander;
        public bool Alive => CurrentState != State.Dead;
        public GoElement Aura { get; private set; }
        public float AuraLeft { get; private set; }
        public bool Charged => _chargedLeft > 0f;
        public string GroupId { get; private set; }

        private Transform _visual;
        private Animator _animator;
        private float _timer;
        private Vector3 _wanderTarget;
        private float _chargedLeft;
        private float _chargedTick;
        private float _chargedAtk;
        private Vector3 _knock;
        private bool _tinted;

        private Transform _headUi;
        private TextMesh _nameText;
        private TextMesh _alertText;
        private Transform _hpFill;
        private Renderer _auraDot;
        private LineRenderer _warnRing;
        private MaterialPropertyBlock _block;

        public static FieldEnemy Spawn(Kind kind, Vector3 home, GameObject model, string groupId, Transform parent)
        {
            var go = new GameObject($"FieldEnemy_{kind}");
            go.transform.SetParent(parent, false);
            var e = go.AddComponent<FieldEnemy>();
            e.kind = kind;
            e.model = model;
            e.GroupId = groupId;
            e.Home = home;
            e._spawnHome = home;
            e.Setup();
            return e;
        }

        private void Setup()
        {
            switch (kind)
            {
                case Kind.Bandit:
                    DisplayName = GoLocalization.T("field.foe.bandit", "산적");
                    MaxHp = 320f; Atk = 26f; ExpReward = 15;
                    break;
                default:
                    DisplayName = GoLocalization.T("field.foe.skeleton", "해골 병사");
                    MaxHp = 220f; Atk = 20f; ExpReward = 10;
                    break;
            }
            Hp = MaxHp;
            transform.position = Grounded(Home);
            _wanderTarget = Home;
            _timer = UnityEngine.Random.Range(0.5f, 3f);
            BuildVisual();
            BuildHeadUi();
            BuildWarnRing();
        }

        private void OnEnable() { if (!_all.Contains(this)) _all.Add(this); }
        private void OnDisable() => _all.Remove(this);

        // ---- 모양 -------------------------------------------------------------

        private void BuildVisual()
        {
            if (model != null)
            {
                var inst = Instantiate(model, transform);
                inst.name = "Visual";
                inst.transform.localPosition = Vector3.zero;
                inst.transform.localRotation = Quaternion.identity;
                float h = MeasureHeight(inst);
                float target = kind == Kind.Skeleton ? BodyHeight * 1.05f : BodyHeight;
                if (h > 0.01f) inst.transform.localScale = Vector3.one * (target / h);
                _animator = inst.GetComponentInChildren<Animator>();
                if (_animator != null) _animator.applyRootMotion = false;
                _visual = inst.transform;
                if (kind == Kind.Skeleton) CharacterVisual.Tint(inst, new Color(0.88f, 0.9f, 0.96f));
            }
            else
            {
                _visual = CharacterVisual.SpawnFallbackCapsule(transform,
                    kind == Kind.Bandit ? new Color(0.5f, 0.2f, 0.15f) : new Color(0.85f, 0.85f, 0.8f));
            }
        }

        private static float MeasureHeight(GameObject go)
        {
            var renderers = go.GetComponentsInChildren<Renderer>();
            if (renderers.Length == 0) return 0f;
            var b = renderers[0].bounds;
            foreach (var r in renderers) b.Encapsulate(r.bounds);
            return b.size.y;
        }

        private void BuildHeadUi()
        {
            _block = new MaterialPropertyBlock();
            var head = new GameObject("HeadUI");
            head.transform.SetParent(transform, false);
            head.transform.localPosition = new Vector3(0f, BodyHeight + 0.9f, 0f);
            _headUi = head.transform;

            _nameText = NewText(_headUi, DisplayName, new Vector3(0f, 0.45f, 0f), 0.035f, Color.white);
            _alertText = NewText(_headUi, "!", new Vector3(0f, 1.2f, 0f), 0.09f, new Color(1f, 0.35f, 0.2f));
            _alertText.gameObject.SetActive(false);

            NewQuad(_headUi, "HpBack", new Vector3(0f, 0f, 0.01f), new Vector3(2.0f, 0.22f, 1f), new Color(0f, 0f, 0f, 0.6f));
            var fillPivot = new GameObject("HpFillPivot").transform;
            fillPivot.SetParent(_headUi, false);
            fillPivot.localPosition = new Vector3(-0.97f, 0f, 0f);
            var fill = NewQuad(fillPivot, "HpFill", new Vector3(0.5f, 0f, 0f), Vector3.one, new Color(0.9f, 0.25f, 0.2f));
            fill.localScale = Vector3.one;
            fillPivot.localScale = new Vector3(1.94f, 0.16f, 1f);
            _hpFill = fillPivot;
            _auraDot = NewQuad(_headUi, "AuraDot", new Vector3(-1.3f, 0f, 0f), new Vector3(0.3f, 0.3f, 1f), Color.clear).GetComponent<Renderer>();
            _auraDot.enabled = false;
        }

        private static TextMesh NewText(Transform parent, string text, Vector3 local, float size, Color color)
        {
            var go = new GameObject("Text");
            go.transform.SetParent(parent, false);
            go.transform.localPosition = local;
            var t = go.AddComponent<TextMesh>();
            t.text = text;
            t.anchor = TextAnchor.MiddleCenter;
            t.alignment = TextAlignment.Center;
            t.fontSize = 64;
            t.characterSize = size;
            t.color = color;
            return t;
        }

        private static Material _unlitMat;

        private static Transform NewQuad(Transform parent, string name, Vector3 local, Vector3 scale, Color color)
        {
            var q = GameObject.CreatePrimitive(PrimitiveType.Quad);
            q.name = name;
            var col = q.GetComponent<Collider>();
            if (Application.isPlaying) Destroy(col); else DestroyImmediate(col);
            q.transform.SetParent(parent, false);
            q.transform.localPosition = local;
            q.transform.localScale = scale;
            if (_unlitMat == null) _unlitMat = new Material(Shader.Find("Sprites/Default")) { name = "FieldEnemyUi (generated)" };
            var r = q.GetComponent<MeshRenderer>();
            r.sharedMaterial = _unlitMat;
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            r.receiveShadows = false;
            var block = new MaterialPropertyBlock();
            block.SetColor("_Color", color);
            r.SetPropertyBlock(block);
            return q.transform;
        }

        private void BuildWarnRing()
        {
            var go = new GameObject("WarnRing");
            go.transform.SetParent(transform, false);
            go.transform.localPosition = new Vector3(0f, 0.15f, 0f);
            _warnRing = go.AddComponent<LineRenderer>();
            _warnRing.useWorldSpace = false;
            _warnRing.loop = true;
            _warnRing.positionCount = 40;
            _warnRing.widthMultiplier = 0.18f;
            _warnRing.material = _unlitMat != null ? _unlitMat : new Material(Shader.Find("Sprites/Default"));
            _warnRing.startColor = _warnRing.endColor = new Color(1f, 0.3f, 0.15f, 0.85f);
            _warnRing.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            _warnRing.enabled = false;
        }

        private void SetRingRadius(float r)
        {
            for (int i = 0; i < _warnRing.positionCount; i++)
            {
                float a = i * Mathf.PI * 2f / _warnRing.positionCount;
                _warnRing.SetPosition(i, new Vector3(Mathf.Cos(a) * r, 0f, Mathf.Sin(a) * r));
            }
        }

        // ---- 흐름 -------------------------------------------------------------

        private void Update() => Tick(Time.deltaTime);

        /// <summary>한 틱 — 진단이 시간을 건너뛰려고 직접 부른다.</summary>
        public void Tick(float dt)
        {
            TickStatus(dt);
            if (CurrentState == State.Dead)
            {
                _timer -= dt;
                if (_timer <= 0f) Revive();
                return;
            }
            if (DuelGate.Active) { SetMoveAnim(0f); return; }

            var fc = FieldCombat.Instance;
            bool playerOk = fc != null && fc.CanBeTargeted;
            Vector3 toPlayer = playerOk ? Flat(fc.transform.position - transform.position) : Vector3.zero;
            float distPlayer = playerOk ? toPlayer.magnitude : float.MaxValue;

            if (_knock.sqrMagnitude > 0.01f)
            {
                MoveBy(_knock * dt);
                _knock = Vector3.Lerp(_knock, Vector3.zero, 8f * dt);
            }

            switch (CurrentState)
            {
                case State.Wander:
                    if (distPlayer < DetectRadius) { CurrentState = State.Chase; break; }
                    _timer -= dt;
                    if (_timer <= 0f)
                    {
                        Vector2 c = UnityEngine.Random.insideUnitCircle * WanderRadius;
                        _wanderTarget = Home + new Vector3(c.x, 0f, c.y);
                        _timer = UnityEngine.Random.Range(3f, 6f);
                    }
                    MoveToward(_wanderTarget, WanderSpeed, dt, 0.5f);
                    break;

                case State.Chase:
                    if (!playerOk || distPlayer > GiveUpRadius || Flat(transform.position - Home).magnitude > LeashRadius)
                    {
                        CurrentState = State.Return;
                        break;
                    }
                    if (distPlayer <= EngageRange)
                    {
                        BeginTelegraph();
                        break;
                    }
                    MoveToward(fc.transform.position, ChaseSpeed, dt, EngageRange * 0.9f);
                    break;

                case State.Telegraph:
                    SetMoveAnim(0f);
                    if (playerOk) Face(toPlayer);
                    _timer -= dt;
                    float p = 1f - Mathf.Clamp01(_timer / TelegraphSec);
                    SetRingRadius(Mathf.Lerp(0.6f, StrikeRadius, p));
                    TintVisual(Color.Lerp(Color.white, new Color(1f, 0.35f, 0.3f), p), true);
                    if (_timer <= 0f) ResolveStrike();
                    break;

                case State.Recover:
                    SetMoveAnim(0f);
                    _timer -= dt;
                    if (_timer <= 0f) CurrentState = playerOk && distPlayer < GiveUpRadius ? State.Chase : State.Return;
                    break;

                case State.Return:
                    if (MoveToward(Home, ReturnSpeed, dt, 1f))
                    {
                        Hp = MaxHp;
                        CurrentState = State.Wander;
                        _timer = 1f;
                    }
                    break;
            }
            RefreshHeadUi();
        }

        private void BeginTelegraph()
        {
            CurrentState = State.Telegraph;
            _timer = TelegraphSec;
            _alertText.gameObject.SetActive(true);
            _warnRing.enabled = true;
            SetRingRadius(0.6f);
        }

        /// <summary>예고 끝 판정 — 그 순간 반경 안이면 맞는다(회피 무적이면 `FieldCombat` 이 흘린다).</summary>
        public void ResolveStrike()
        {
            _alertText.gameObject.SetActive(false);
            _warnRing.enabled = false;
            TintVisual(Color.white, false);
            if (_animator != null) _animator.SetTrigger("Attack");
            var fc = FieldCombat.Instance;
            if (fc != null && fc.CanBeTargeted && Flat(fc.transform.position - transform.position).magnitude <= StrikeRadius)
            {
                fc.ReceiveStrike(Atk, this);
            }
            CurrentState = State.Recover;
            _timer = RecoverSec;
        }

        private void TickStatus(float dt)
        {
            if (AuraLeft > 0f)
            {
                AuraLeft -= dt;
                if (AuraLeft <= 0f) Aura = GoElement.Physical;
            }
            if (_chargedLeft > 0f && Alive)
            {
                _chargedLeft -= dt;
                _chargedTick -= dt;
                if (_chargedTick <= 0f)
                {
                    _chargedTick += GoElements.ChargedTickSec;
                    ApplyDamage(_chargedAtk, GoElements.ColorOf(GoReaction.ElectroCharged), 0.8f);
                }
            }
        }

        // ---- 피해 -------------------------------------------------------------

        /// <summary>플레이어 공격 한 번. 반응을 풀고 실제로 들어간 피해를 돌려준다.
        /// <paramref name="atk"/> 는 과부하·감전 피해를 셀 공격력.</summary>
        public float TakeHit(float amount, GoElement element, float atk, out GoReaction reaction)
        {
            reaction = GoReaction.None;
            if (!Alive) return 0f;

            if (element != GoElement.Physical)
            {
                reaction = AuraLeft > 0f ? GoElements.Resolve(Aura, element) : GoReaction.None;
                if (reaction == GoReaction.None)
                {
                    Aura = element;
                    AuraLeft = GoElements.AuraSec;
                }
                else
                {
                    Aura = GoElement.Physical;
                    AuraLeft = 0f;
                }
            }

            if (reaction == GoReaction.Vaporize) amount *= GoElements.VaporizeMul;

            if (reaction != GoReaction.None)
            {
                FieldDamageText.Spawn(transform.position + Vector3.up * (BodyHeight + 1.8f),
                    GoElements.NameOf(reaction), GoElements.ColorOf(reaction), 1.3f);
            }

            float dealt = ApplyDamage(amount, element == GoElement.Physical ? Color.white : GoElements.ColorOf(element), 1f);

            if (reaction == GoReaction.Overload)
            {
                // 과부하 — 둘레 적 전부(자기 포함 이미 맞은 몫과 별도로 광역 몫)·밀침.
                float blast = atk * GoElements.OverloadAtkMul;
                foreach (var other in _all.ToArray())
                {
                    if (!other.Alive) continue;
                    Vector3 d = Flat(other.transform.position - transform.position);
                    if (d.magnitude > GoElements.OverloadRadius) continue;
                    other.ApplyDamage(blast, GoElements.ColorOf(GoReaction.Overload), 1f);
                    other._knock = (d.sqrMagnitude > 0.01f ? d.normalized : -transform.forward) * GoElements.OverloadKnockback;
                    other.Aggro();
                }
            }
            else if (reaction == GoReaction.ElectroCharged)
            {
                StartCharged(atk);
                foreach (var other in _all)
                {
                    if (other == this || !other.Alive || other.Aura != GoElement.Hydro || other.AuraLeft <= 0f) continue;
                    if (Flat(other.transform.position - transform.position).magnitude > GoElements.ChargedSpreadRadius) continue;
                    other.Aura = GoElement.Physical;
                    other.AuraLeft = 0f;
                    other.StartCharged(atk);
                }
            }

            Aggro();
            return dealt;
        }

        private void StartCharged(float atk)
        {
            _chargedLeft = GoElements.ChargedSec;
            _chargedTick = GoElements.ChargedTickSec;
            _chargedAtk = atk * GoElements.ChargedTickAtkMul;
        }

        private void Aggro()
        {
            if (CurrentState == State.Wander || CurrentState == State.Return) CurrentState = State.Chase;
        }

        private float ApplyDamage(float amount, Color color, float size)
        {
            if (!Alive || amount <= 0f) return 0f;
            float dealt = Mathf.Min(Hp, amount);
            Hp -= amount;
            FieldDamageText.Spawn(transform.position + Vector3.up * (BodyHeight + 0.8f),
                Mathf.RoundToInt(amount).ToString(), color, size);
            if (Hp <= 0f)
            {
                Die();
            }
            else if (_animator != null && CurrentState != State.Telegraph)
            {
                _animator.SetTrigger("Hit");
            }
            RefreshHeadUi();
            return dealt;
        }

        private void Die()
        {
            Hp = 0f;
            CurrentState = State.Dead;
            _timer = RespawnSec;
            _chargedLeft = 0f;
            Aura = GoElement.Physical;
            AuraLeft = 0f;
            _alertText.gameObject.SetActive(false);
            _warnRing.enabled = false;
            TintVisual(Color.white, false);
            if (_animator != null) _animator.SetTrigger("Death");
            _headUi.gameObject.SetActive(false);
            PlayerStats.AddExp(ExpReward);
            Killed?.Invoke(this);
            Invoke(nameof(HideBody), 2.5f);
        }

        private void HideBody()
        {
            if (CurrentState == State.Dead && _visual != null) _visual.gameObject.SetActive(false);
        }

        private void Revive()
        {
            CancelInvoke(nameof(HideBody));
            Hp = MaxHp;
            transform.position = Grounded(Home);
            CurrentState = State.Wander;
            _timer = 1f;
            if (_visual != null) _visual.gameObject.SetActive(true);
            if (_animator != null) { _animator.Rebind(); _animator.Update(0f); }
            _headUi.gameObject.SetActive(true);
            RefreshHeadUi();
        }

        /// <summary>플레이어가 모두 쓰러져 마을로 돌아갈 때 — 쫓던 적은 귀가.</summary>
        public void ForceReturn()
        {
            if (!Alive) return;
            _alertText.gameObject.SetActive(false);
            _warnRing.enabled = false;
            TintVisual(Color.white, false);
            CurrentState = State.Return;
        }

        /// <summary>진단용 — 곧바로 다시 세운다.</summary>
        public void ReviveNow() => Revive();

        /// <summary>진단용 — 그 자리를 잠시 집으로 삼아 세운다(끌려 나옴 규칙에 안 걸리게).</summary>
        public void WarpForTest(Vector3 pos)
        {
            Revive();
            ClearAuraForTest();
            Home = pos;
            transform.position = Grounded(pos);
        }

        /// <summary>진단용 — 원래 집으로 되돌려 세운다.</summary>
        public void RestoreHomeForTest()
        {
            Home = _spawnHome;
            Revive();
            ClearAuraForTest();
        }

        /// <summary>진단용 — 원소 부착을 지운다.</summary>
        public void ClearAuraForTest()
        {
            Aura = GoElement.Physical;
            AuraLeft = 0f;
            _chargedLeft = 0f;
        }

        // ---- 움직임 ------------------------------------------------------------

        private bool MoveToward(Vector3 target, float speed, float dt, float stopDist)
        {
            Vector3 d = Flat(target - transform.position);
            float dist = d.magnitude;
            if (dist <= stopDist)
            {
                SetMoveAnim(0f);
                return true;
            }
            Vector3 step = d / dist * Mathf.Min(speed * dt, dist - stopDist * 0.5f);
            step += Separation() * dt;
            MoveBy(step);
            Face(d);
            SetMoveAnim(speed >= ChaseSpeed ? 1f : 0.5f);
            return false;
        }

        private Vector3 Separation()
        {
            Vector3 push = Vector3.zero;
            foreach (var other in _all)
            {
                if (other == this || !other.Alive) continue;
                Vector3 d = Flat(transform.position - other.transform.position);
                float m = d.magnitude;
                if (m > 0.01f && m < SeparationRadius) push += d / m * (SeparationRadius - m) * 3f;
            }
            return push;
        }

        private void MoveBy(Vector3 delta)
        {
            Vector3 next = transform.position + delta;
            if (!CanStandOn(next)) return; // 107 ② — 산 고원·강으로는 안 따라 들어온다
            transform.position = Grounded(next);
        }

        /// <summary>들판 적이 설 수 있는 칸인가 — 산(고원·절벽)과 강·다리 칸은 아니다.</summary>
        public static bool CanStandOn(Vector3 p)
        {
            var (gx, gy) = TestMapData.WorldToGrid(p);
            char c = TestMapData.TileAt(gx, gy);
            return c != '^' && !TestMapData.IsWater(c);
        }

        private void Face(Vector3 dir)
        {
            dir.y = 0f;
            if (dir.sqrMagnitude < 0.0001f) return;
            Quaternion want = Quaternion.LookRotation(dir);
            transform.rotation = Quaternion.Slerp(transform.rotation, want, 0.25f);
        }

        private void SetMoveAnim(float speed)
        {
            if (_animator != null && _animator.runtimeAnimatorController != null) _animator.SetFloat("Speed", speed);
        }

        private void TintVisual(Color c, bool on)
        {
            if (_visual == null) return;
            if (on)
            {
                CharacterVisual.Tint(_visual.gameObject, kind == Kind.Skeleton ? c * new Color(0.88f, 0.9f, 0.96f) : c);
                _tinted = true;
            }
            else if (_tinted)
            {
                if (kind == Kind.Skeleton) CharacterVisual.Tint(_visual.gameObject, new Color(0.88f, 0.9f, 0.96f));
                else CharacterVisual.ClearTint(_visual.gameObject);
                _tinted = false;
            }
        }

        private static Vector3 Grounded(Vector3 p)
        {
            var hits = Physics.RaycastAll(new Vector3(p.x, p.y + 30f, p.z), Vector3.down, 80f, ~0, QueryTriggerInteraction.Ignore);
            float best = float.NegativeInfinity;
            foreach (var h in hits)
            {
                if (h.collider is CharacterController) continue;
                if (h.point.y > p.y + 3f) continue; // 머리 위 지붕·나무 윗면엔 안 올라탄다
                if (h.point.y > best) best = h.point.y;
            }
            if (best > float.NegativeInfinity) p.y = best;
            return p;
        }

        private static Vector3 Flat(Vector3 v) { v.y = 0f; return v; }

        private void RefreshHeadUi()
        {
            if (_hpFill == null) return;
            float r = MaxHp > 0f ? Mathf.Clamp01(Hp / MaxHp) : 0f;
            _hpFill.localScale = new Vector3(1.94f * r, 0.16f, 1f);
            bool aura = AuraLeft > 0f && Aura != GoElement.Physical;
            _auraDot.enabled = aura;
            if (aura)
            {
                _auraDot.GetPropertyBlock(_block);
                _block.SetColor("_Color", GoElements.ColorOf(Aura));
                _auraDot.SetPropertyBlock(_block);
            }
        }

        private void LateUpdate()
        {
            var cam = Camera.main;
            if (cam != null && _headUi != null)
            {
                _headUi.rotation = Quaternion.LookRotation(_headUi.position - cam.transform.position);
            }
        }
    }
}
