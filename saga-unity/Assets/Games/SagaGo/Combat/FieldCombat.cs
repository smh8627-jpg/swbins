using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using Saga.Go.Data;
using Saga.Go.Player;
using Saga.Go.UI;
using Saga.Go.World;

namespace Saga.Go.Combat
{
    /// <summary>
    /// PLAN.md 107-1 "들판 전투" — 플레이어에 붙는다. 무대 전환 없이 지도 위에서 기본 공격 3타(J)·
    /// 원소 스킬(E)·원소 폭발(Q)·회피(L·왼쪽 Ctrl)·동료 교체(1~4). 명단은 주인공 + 등용한 동료 앞 셋,
    /// 체력·스킬 쿨·기력은 인물마다 따로. 옛 사건 결투 중(`DuelGate.Active`)엔 입력을 안 받는다.
    /// </summary>
    public class FieldCombat : MonoBehaviour
    {
        public const string HeroId = "hero";
        public const int MaxParty = 4;

        public static readonly float[] ComboMul = { 0.8f, 0.9f, 1.3f };
        public const float ComboWindowSec = 0.9f;
        public const float AttackIntervalSec = 0.33f;
        public const float AttackReach = 4.2f;
        public const float AutoFaceRadius = 6.5f;
        public const float SkillOffset = 2f;
        public const float SkillRadius = 7f;
        public const float SkillMul = 1.8f;
        public const float SkillCooldownSec = 6f;
        public const float BurstRadius = 12f;
        public const float BurstMul = 4f;
        public const float BurstCost = 100f;
        public const float EnergyPerHit = 2f;
        public const float EnergyPerSkillHit = 15f;
        public const float DodgeStamina = 15f;
        public const float DodgeInvulnSec = 0.3f;
        public const float DodgeDistance = 5f;
        public const float DodgeSec = 0.2f;
        public const float SwapCooldownSec = 1f;
        public const float RegenDelaySec = 8f;
        public const float RegenPerSec = 0.04f; // 최대 체력 비율

        public class Member
        {
            public string Id;
            public string Name;
            public GoElement Element;
            public float Hp;
            public float MaxHp;
            public float SkillCd;
            public float Energy;
            public bool Down => Hp <= 0f;
            public bool BurstReady => Energy >= BurstCost;
        }

        public static FieldCombat Instance { get; private set; }

        /// <summary>원소 스킬·폭발이 터진 원(가운데·반경·원소) — 적이 없어도 쏜다. 원소 석등(107-4)이 듣는다.</summary>
        public static event System.Action<Vector3, float, GoElement> ElementPulse;

        [SerializeField] private PlayerController player;

        private readonly List<Member> _party = new List<Member>();
        public IReadOnlyList<Member> Party => _party;
        public int ActiveIndex { get; private set; }
        public Member Active => _party.Count > 0 ? _party[ActiveIndex] : null;

        public int ComboStep { get; private set; }
        public float InvulnLeft { get; private set; }
        public float SwapCooldown { get; private set; }
        public bool Invulnerable => InvulnLeft > 0f;
        /// <summary>적이 노릴 수 있는가 — 결투 중·쓰러져 돌아가는 중엔 아니다.</summary>
        public bool CanBeTargeted => isActiveAndEnabled && !DuelGate.Active && Active != null && !Active.Down;

        public Vector3 SafePoint { get; set; }

        private PartyBodies _bodies;
        private float _comboWindow;
        private float _attackCd;
        private float _sinceHit = 999f;

        // 107 ⑤ — 불도깨비에게 맞은 화상(맞은 인물에게 남은 틱)
        public int BurnTicksLeft { get; private set; }
        private float _burnTimer;
        private float _burnDmg;
        private Member _burnTarget;

        public float Atk => (PartyState.Atk + PlayerStats.AtkBonus + Inventory.AtkBonus) * PerkState.AtkMultiplier * BondState.AtkMultiplier;
        public float Def => (PartyState.Def + PlayerStats.DefBonus + Inventory.DefBonus) * PerkState.DefMultiplier * BondState.DefMultiplier;

        private void Awake()
        {
            Instance = this;
            if (player == null) player = GetComponent<PlayerController>();
            SafePoint = transform.position;
            RebuildParty();
            PartyState.PowerChanged += OnPowerChanged;
        }

        private void OnDestroy()
        {
            PartyState.PowerChanged -= OnPowerChanged;
            if (Instance == this) Instance = null;
        }

        private void Start()
        {
            if (GetComponent<FieldCombatHud>() == null) gameObject.AddComponent<FieldCombatHud>();
        }

        private void OnPowerChanged(float atk, float def) => RebuildParty();

        /// <summary>명단을 다시 짠다 — 이미 있던 인물은 체력 비율·쿨·기력을 지킨다.</summary>
        public void RebuildParty()
        {
            var old = new Dictionary<string, Member>();
            foreach (var m in _party) old[m.Id] = m;
            string activeId = Active?.Id;
            _party.Clear();

            float maxHp = 200f + Def * 2f;
            AddMember(old, HeroId, GoLocalization.T("field.hero", "주인공"), GoElements.HeroElement, maxHp);
            foreach (var id in PartyState.MemberIds)
            {
                if (_party.Count >= MaxParty) break;
                bool dup = false;
                foreach (var m in _party) if (m.Id == id) { dup = true; break; }
                if (dup) continue;
                AddMember(old, id, id, GoElements.ForMember(id), maxHp);
            }
            ActiveIndex = 0;
            for (int i = 0; i < _party.Count; i++) if (_party[i].Id == activeId) ActiveIndex = i;
            ApplyLook();
        }

        private void AddMember(Dictionary<string, Member> old, string id, string name, GoElement el, float maxHp)
        {
            if (old.TryGetValue(id, out var m))
            {
                float ratio = m.MaxHp > 0f ? m.Hp / m.MaxHp : 1f;
                m.MaxHp = maxHp;
                m.Hp = maxHp * ratio;
            }
            else
            {
                m = new Member { Id = id, Name = name, Element = el, MaxHp = maxHp, Hp = maxHp };
            }
            _party.Add(m);
        }

        private void Update()
        {
            float dt = Time.deltaTime;
            TickTimers(dt);
            if (DuelGate.Active || Active == null || Saga.Go.Cinematics.GoCutscenes.Playing) return; // 106-9 등장 컷 동안 입력 안 받음

            var kb = Keyboard.current;
            if (kb == null) return;
            if (kb.jKey.wasPressedThisFrame) Attack();
            if (kb.eKey.wasPressedThisFrame) Skill();
            if (kb.qKey.wasPressedThisFrame) Burst();
            if (kb.lKey.wasPressedThisFrame || kb.leftCtrlKey.wasPressedThisFrame) Dodge();
            if (kb.digit1Key.wasPressedThisFrame) Swap(0);
            if (kb.digit2Key.wasPressedThisFrame) Swap(1);
            if (kb.digit3Key.wasPressedThisFrame) Swap(2);
            if (kb.digit4Key.wasPressedThisFrame) Swap(3);
        }

        /// <summary>진단이 시간을 건너뛰려고 직접 부른다.</summary>
        public void TickTimers(float dt)
        {
            if (_attackCd > 0f) _attackCd -= dt;
            if (_comboWindow > 0f) { _comboWindow -= dt; if (_comboWindow <= 0f) ComboStep = 0; }
            if (InvulnLeft > 0f) InvulnLeft -= dt;
            if (SwapCooldown > 0f) SwapCooldown -= dt;
            foreach (var m in _party) if (m.SkillCd > 0f) m.SkillCd = Mathf.Max(0f, m.SkillCd - dt);
            TickBurn(dt);
            _sinceHit += dt;
            if (_sinceHit >= RegenDelaySec)
            {
                foreach (var m in _party)
                {
                    if (!m.Down && m.Hp < m.MaxHp) m.Hp = Mathf.Min(m.MaxHp, m.Hp + m.MaxHp * RegenPerSec * dt);
                }
            }
        }

        // ---- 공격 셋 -----------------------------------------------------------

        /// <summary>기본 공격 한 타. 들어간 적 수를 돌려준다(-1 = 못 침).</summary>
        public int Attack()
        {
            if (!CanAct() || _attackCd > 0f) return -1;
            int step = _comboWindow > 0f ? ComboStep : 0;
            _attackCd = AttackIntervalSec;
            _comboWindow = ComboWindowSec;
            ComboStep = (step + 1) % ComboMul.Length;

            var target = Nearest(AutoFaceRadius);
            if (target != null && player != null) player.FaceToward(target.transform.position);
            if (player != null && player.Animator != null) player.Animator.SetTrigger("Attack");

            Vector3 fwd = Forward();
            int hits = 0;
            float atk = Atk;
            foreach (var e in Snapshot())
            {
                Vector3 d = Flat(e.transform.position - transform.position);
                if (d.magnitude > AttackReach) continue;
                if (d.sqrMagnitude > 0.25f && Vector3.Dot(d.normalized, fwd) < 0.5f) continue; // 앞 120°
                e.TakeHit(atk * ComboMul[step], GoElement.Physical, atk, out _);
                hits++;
            }
            if (hits > 0)
            {
                Active.Energy = Mathf.Min(BurstCost, Active.Energy + EnergyPerHit);
                GroundDecal.Spawn(transform.position + fwd * 2f, GroundDecal.Kind.HitMark);
            }
            return hits;
        }

        /// <summary>원소 스킬 — 앞 2m 중심 반경 7m. 들어간 적 수(-1 = 쿨·못 씀).</summary>
        public int Skill()
        {
            var m = Active;
            if (!CanAct() || m.SkillCd > 0f) return -1;
            m.SkillCd = SkillCooldownSec;
            var target = Nearest(AutoFaceRadius * 1.5f);
            if (target != null && player != null) player.FaceToward(target.transform.position);
            Vector3 center = transform.position + Forward() * SkillOffset;
            int hits = AreaHit(center, SkillRadius, Atk * SkillMul, m.Element);
            if (hits > 0) m.Energy = Mathf.Min(BurstCost, m.Energy + EnergyPerSkillHit);
            FieldRingFx.Spawn(center, SkillRadius, GoElements.ColorOf(m.Element));
            ElementPulse?.Invoke(center, SkillRadius, m.Element);
            if (player != null && player.Animator != null) player.Animator.SetTrigger("Attack");
            return hits;
        }

        /// <summary>원소 폭발 — 반경 12m, 기력 100 소모. 들어간 적 수(-1 = 기력 모자람).</summary>
        public int Burst()
        {
            var m = Active;
            if (!CanAct() || !m.BurstReady) return -1;
            m.Energy = 0f;
            int hits = AreaHit(transform.position, BurstRadius, Atk * BurstMul, m.Element);
            FieldRingFx.Spawn(transform.position, BurstRadius, GoElements.ColorOf(m.Element), 0.7f);
            FieldRingFx.Spawn(transform.position, BurstRadius * 0.6f, Color.white, 0.5f);
            ElementPulse?.Invoke(transform.position, BurstRadius, m.Element);
            ToastLine(string.Format(GoLocalization.T("field.burst", "{0} — 원소 폭발!"), m.Name), 1.5f);
            if (player != null && player.Animator != null) player.Animator.SetTrigger("Attack");
            return hits;
        }

        private int AreaHit(Vector3 center, float radius, float amount, GoElement el)
        {
            int hits = 0;
            float atk = Atk;
            foreach (var e in Snapshot())
            {
                if (Flat(e.transform.position - center).magnitude > radius) continue;
                e.TakeHit(amount, el, atk, out _);
                hits++;
            }
            return hits;
        }

        public bool Dodge()
        {
            if (!CanAct() || (player != null && player.IsDashing)) return false;
            if (!GoStamina.TrySpend(DodgeStamina)) return false;
            InvulnLeft = DodgeInvulnSec;
            Vector3 dir = player != null ? player.MoveIntent : Vector3.zero;
            if (dir.sqrMagnitude < 0.01f) dir = -Forward(); // 입력 없으면 뒤로 물러선다
            if (player != null) player.Dash(dir, DodgeDistance, DodgeSec);
            return true;
        }

        public bool Swap(int index)
        {
            if (DuelGate.Active || index < 0 || index >= _party.Count || index == ActiveIndex) return false;
            if (SwapCooldown > 0f || _party[index].Down) return false;
            ActiveIndex = index;
            SwapCooldown = SwapCooldownSec;
            ComboStep = 0;
            _comboWindow = 0f;
            ApplyLook();
            FieldRingFx.Spawn(transform.position, 2.5f, GoElements.ColorOf(Active.Element), 0.35f);
            return true;
        }

        private bool CanAct() => Active != null && !Active.Down && !DuelGate.Active && (player == null || player.OnFoot); // 107 ② 등반·활공·수영 중엔 못 싸운다

        // ---- 피격 --------------------------------------------------------------

        /// <summary>적 판정이 닿았을 때. 회피 무적이면 흘리고 false.</summary>
        public bool ReceiveStrike(float enemyAtk, FieldEnemy from)
        {
            var m = Active;
            if (m == null || m.Down) return false;
            if (Invulnerable)
            {
                FieldDamageText.Spawn(transform.position + Vector3.up * 4f, GoLocalization.T("field.evade", "회피!"), new Color(0.7f, 0.95f, 1f), 1.1f);
                return false;
            }
            float dmg = enemyAtk * 200f / (200f + Mathf.Max(0f, Def));
            m.Hp = Mathf.Max(0f, m.Hp - dmg);
            _sinceHit = 0f;
            FieldDamageText.Spawn(transform.position + Vector3.up * 4f, Mathf.RoundToInt(dmg).ToString(), new Color(1f, 0.3f, 0.25f));
            if (player != null && player.Animator != null) player.Animator.SetTrigger("Hit");
            if (m.Down) OnMemberDown();
            else if (from != null && from.IsElemental) ApplyFoeStatus(from.Element, dmg);
            return true;
        }

        /// <summary>107 ⑤ 원소 쓰는 적에게 맞았을 때 — 화 = 화상(그 피해 ×0.2 세 번, 1초 간격, 이것만으론 안 쓰러짐) ·
        /// 수 = 젖음(스태미나 -25) · 뇌 = 감전(나선 인물 기력 -25).</summary>
        public void ApplyFoeStatus(GoElement el, float strikeDmg)
        {
            var m = Active;
            if (m == null || m.Down) return;
            Vector3 textPos = transform.position + Vector3.up * 5f;
            switch (el)
            {
                case GoElement.Pyro:
                    _burnTarget = m;
                    BurnTicksLeft = GoElements.BurnTicks;
                    _burnTimer = GoElements.BurnTickSec;
                    _burnDmg = strikeDmg * GoElements.BurnMul;
                    FieldDamageText.Spawn(textPos, GoLocalization.T("field.st.burn", "화상"), GoElements.ColorOf(el), 1f);
                    break;
                case GoElement.Hydro:
                    GoStamina.Use(GoElements.WetStaminaLoss);
                    FieldDamageText.Spawn(textPos, GoLocalization.T("field.st.wet", "젖음 — 스태미나 -25"), GoElements.ColorOf(el), 1f);
                    break;
                case GoElement.Electro:
                    m.Energy = Mathf.Max(0f, m.Energy - GoElements.ShockEnergyLoss);
                    FieldDamageText.Spawn(textPos, GoLocalization.T("field.st.shock", "감전 — 기력 -25"), GoElements.ColorOf(el), 1f);
                    break;
            }
        }

        private void TickBurn(float dt)
        {
            if (BurnTicksLeft <= 0) return;
            if (_burnTarget == null || _burnTarget.Down) { BurnTicksLeft = 0; return; }
            _burnTimer -= dt;
            while (_burnTimer <= 0f && BurnTicksLeft > 0)
            {
                _burnTimer += GoElements.BurnTickSec;
                BurnTicksLeft--;
                float before = _burnTarget.Hp;
                _burnTarget.Hp = Mathf.Max(Mathf.Min(1f, before), before - _burnDmg); // 화상만으로는 안 쓰러진다
                FieldDamageText.Spawn(transform.position + Vector3.up * 4f, Mathf.RoundToInt(before - _burnTarget.Hp).ToString(), GoElements.ColorOf(GoElement.Pyro), 0.8f);
            }
        }

        private void OnMemberDown()
        {
            ToastLine(string.Format(GoLocalization.T("field.down", "{0} 쓰러짐"), Active.Name), 2f);
            for (int i = 1; i <= _party.Count; i++)
            {
                int idx = (ActiveIndex + i) % _party.Count;
                if (!_party[idx].Down)
                {
                    ActiveIndex = idx;
                    SwapCooldown = 0f;
                    ApplyLook();
                    return;
                }
            }
            WipeAndReturn();
        }

        /// <summary>모두 쓰러짐 — 잃는 것 없이 안전한 곳(마을 스폰)에서 전원 회복.</summary>
        public void WipeAndReturn()
        {
            foreach (var m in _party) { m.Hp = m.MaxHp; m.SkillCd = 0f; }
            BurnTicksLeft = 0;
            ActiveIndex = 0;
            ApplyLook();
            foreach (var e in FieldEnemy.All) e.ForceReturn();
            if (player != null) player.Teleport(SafePoint);
            else transform.position = SafePoint;
            GoStamina.ResetFull();
            ToastLine(GoLocalization.T("field.wipe", "모두 쓰러졌다 — 마을에서 기운을 차렸다(잃은 것 없음)"), 3f);
        }

        // ---- 도움 --------------------------------------------------------------

        private void ApplyLook()
        {
            if (player == null || player.Visual == null || Active == null) return;
            // 107 ⑥ — 나선 인물의 몸으로 바꾼다. 제 몸이 없는 동료(모델 없음)만 주인공 몸에 원소 빛을 옅게 입힌다.
            if (_bodies == null) _bodies = player.GetComponent<PartyBodies>();
            bool ownBody = _bodies != null && _bodies.Show(Active.Id);
            if (ActiveIndex == 0 || ownBody) CharacterVisual.ClearTint(player.Visual.gameObject);
            else CharacterVisual.Tint(player.Visual.gameObject, Color.Lerp(Color.white, GoElements.ColorOf(Active.Element), 0.35f));
        }

        private FieldEnemy Nearest(float radius)
        {
            FieldEnemy best = null;
            float bestD = radius;
            foreach (var e in FieldEnemy.All)
            {
                if (!e.Alive) continue;
                float d = Flat(e.transform.position - transform.position).magnitude;
                if (d <= bestD) { bestD = d; best = e; }
            }
            return best;
        }

        private static List<FieldEnemy> Snapshot()
        {
            var list = new List<FieldEnemy>();
            foreach (var e in FieldEnemy.All) if (e.Alive) list.Add(e);
            return list;
        }

        private Vector3 Forward()
        {
            Transform basis = player != null && player.Visual != null ? player.Visual : transform;
            Vector3 f = basis.forward;
            f.y = 0f;
            return f.sqrMagnitude > 0.0001f ? f.normalized : Vector3.forward;
        }

        private static Vector3 Flat(Vector3 v) { v.y = 0f; return v; }

        private static void ToastLine(string text, float sec)
        {
            if (DialogueLabel.Instance != null) DialogueLabel.Instance.Show(text, sec);
        }

        /// <summary>진단용 — 전원 회복·쿨/기력 초기화.</summary>
        public void ResetForTest()
        {
            foreach (var m in _party) { m.Hp = m.MaxHp; m.SkillCd = 0f; m.Energy = 0f; }
            ActiveIndex = 0;
            ComboStep = 0;
            _comboWindow = 0f;
            _attackCd = 0f;
            InvulnLeft = 0f;
            SwapCooldown = 0f;
            _sinceHit = 999f;
            BurnTicksLeft = 0;
            ApplyLook();
        }
    }
}
