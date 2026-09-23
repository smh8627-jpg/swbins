using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using Saga.Dungeon.World;

namespace Saga.Dungeon.Player
{
    /// <summary>
    /// PLAN.md 106-1 "락온(주목)" — 젤다식 Z 주목. Q(데스크톱)·"주목" 버튼(모바일)
    /// 토글, Tab 은 다음 대상(카메라 정면 기준 시계 방향). 대상이 죽거나
    /// `BreakRange` 밖으로 나가면 가까운 다음 적으로 자동 전환하고, 없으면 풀린다.
    ///
    /// 이 컴포넌트는 "누구를 보는가"만 정한다 — 이동(`PlayerController`)·타격
    /// 대상(`PlayerCombat.PickTarget`)·카메라(`CameraRig.SetLockTarget`)가 각자
    /// `Target` 을 읽는다. 표식은 머리 위 역삼각 + 발밑 고리, `DodgeTrail`·
    /// `WarnRing` 과 같은 `Sprites/Default` 선(새 셰이더·에셋 없음).
    /// </summary>
    [RequireComponent(typeof(PlayerController))]
    public class PlayerLockOn : MonoBehaviour
    {
        public const float LockRange = 12f;
        public const float BreakRange = 16f;

        private static readonly Color MarkColor = new Color(1f, 0.8f, 0.3f, 0.95f);
        private const int RingSegments = 40;
        private const float ChevronHalfWidth = 0.22f;
        private const float ChevronHeight = 0.3f;

        private CameraRig _cameraRig;
        private DungeonEnemy _target;
        private bool _locked;

        private GameObject _markRoot;
        private LineRenderer _chevron;
        private LineRenderer _ring;
        private float _markTime;

        private readonly List<DungeonEnemy> _candidates = new List<DungeonEnemy>();

        /// <summary>살아 있는 대상이 잡혀 있을 때만 true.</summary>
        public bool IsLocked => _locked && _target != null && _target.IsAlive;
        public DungeonEnemy Target => IsLocked ? _target : null;
        public bool MarkerVisible => _markRoot != null && _markRoot.activeSelf;

        private void Awake()
        {
            _cameraRig = GetComponentInChildren<CameraRig>();
            BuildMarker();
        }

        private void OnDestroy()
        {
            if (_markRoot != null) Destroy(_markRoot);
        }

        private void Update()
        {
            var kb = Keyboard.current;
            if (kb != null)
            {
                if (kb.qKey.wasPressedThisFrame) Toggle();
                else if (kb.tabKey.wasPressedThisFrame) SwitchTarget();
            }
            Refresh();
            UpdateMarker(Time.deltaTime);
        }

        /// <summary>모바일 "주목" 버튼(영속 리스너)과 Q키가 부른다.</summary>
        public void Toggle()
        {
            if (IsLocked) Release();
            else SetTarget(FindBest());
        }

        /// <summary>Tab — 락온 중이면 다음 대상, 아니면 새로 잡는다.</summary>
        public void SwitchTarget()
        {
            if (!IsLocked)
            {
                SetTarget(FindBest());
                return;
            }
            var next = FindNextClockwise(_target);
            if (next != null) SetTarget(next);
        }

        public void Release() => SetTarget(null);

        /// <summary>대상을 잃었는지 보고 자동 전환·해제한다(진단도 직접 부른다).</summary>
        public void Refresh()
        {
            if (!_locked) return;
            bool lost = _target == null || !_target.IsAlive
                || Vector3.Distance(transform.position, _target.transform.position) > BreakRange;
            if (!lost) return;
            var next = FindBest();
            if (next != null) SetTarget(next);
            else Release();
        }

        private void SetTarget(DungeonEnemy target)
        {
            _target = target;
            _locked = target != null;
            _cameraRig?.SetLockTarget(target != null ? target.transform : null);
            UpdateMarker(0f);
        }

        private Vector3 CameraForwardFlat()
        {
            Vector3 f = _cameraRig != null ? _cameraRig.transform.forward : transform.forward;
            f.y = 0f;
            return f.sqrMagnitude > 0.0001f ? f.normalized : Vector3.forward;
        }

        private void CollectCandidates()
        {
            _candidates.Clear();
            foreach (var e in DungeonEnemy.Active)
            {
                if (e == null || !e.IsAlive) continue;
                if (Vector3.Distance(transform.position, e.transform.position) > LockRange) continue;
                _candidates.Add(e);
            }
        }

        /// <summary>점수 = 거리 × (2 − 카메라 정면 내적) — 앞에 있는 적을 뒤의
        /// 더 가까운 적보다 먼저 잡는다(정면 1배 ~ 등 뒤 3배).</summary>
        private DungeonEnemy FindBest()
        {
            CollectCandidates();
            Vector3 fwd = CameraForwardFlat();
            DungeonEnemy best = null;
            float bestScore = float.MaxValue;
            foreach (var e in _candidates)
            {
                Vector3 to = e.transform.position - transform.position;
                to.y = 0f;
                float d = to.magnitude;
                float dot = d > 0.001f ? Vector3.Dot(fwd, to / d) : 1f;
                float score = d * (2f - dot);
                if (score < bestScore)
                {
                    bestScore = score;
                    best = e;
                }
            }
            return best;
        }

        /// <summary>카메라 정면을 0°로 둔 시계 방향 각도 순서에서 현재 대상 다음.</summary>
        private DungeonEnemy FindNextClockwise(DungeonEnemy current)
        {
            CollectCandidates();
            if (_candidates.Count < 2) return null;
            Vector3 fwd = CameraForwardFlat();
            float AngleOf(DungeonEnemy e)
            {
                Vector3 to = e.transform.position - transform.position;
                to.y = 0f;
                float a = Vector3.SignedAngle(fwd, to, Vector3.up);
                return a < 0f ? a + 360f : a;
            }
            _candidates.Sort((a, b) => AngleOf(a).CompareTo(AngleOf(b)));
            int idx = _candidates.IndexOf(current);
            return _candidates[(idx + 1) % _candidates.Count];
        }

        private void BuildMarker()
        {
            _markRoot = new GameObject("LockOnMarker");
            var mat = new Material(Shader.Find("Sprites/Default")) { name = "LockOnMarker (generated)" };
            _chevron = NewLine("Chevron", mat, 3, 0.06f);
            _ring = NewLine("Ring", mat, RingSegments, 0.05f);
            _markRoot.SetActive(false);
        }

        private LineRenderer NewLine(string name, Material mat, int points, float width)
        {
            var go = new GameObject(name);
            go.transform.SetParent(_markRoot.transform, false);
            var lr = go.AddComponent<LineRenderer>();
            lr.useWorldSpace = true;
            lr.loop = true;
            lr.positionCount = points;
            lr.widthMultiplier = width;
            lr.material = mat;
            lr.startColor = MarkColor;
            lr.endColor = MarkColor;
            lr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            lr.receiveShadows = false;
            return lr;
        }

        private void UpdateMarker(float dt)
        {
            if (_markRoot == null) return;
            bool show = IsLocked;
            if (_markRoot.activeSelf != show) _markRoot.SetActive(show);
            if (!show) return;

            _markTime += dt;
            Vector3 p = _target.transform.position;
            float scale = Mathf.Max(0.5f, _target.VisualScale);

            // 머리 위 역삼각 — 카메라 쪽을 보게 카메라 right 축으로 편다.
            Vector3 right = _cameraRig != null ? _cameraRig.transform.right : Vector3.right;
            float h = 2f * scale + 0.45f + Mathf.Sin(_markTime * 4f) * 0.08f;
            Vector3 tip = p + Vector3.up * h;
            Vector3 top = tip + Vector3.up * ChevronHeight;
            _chevron.SetPosition(0, tip);
            _chevron.SetPosition(1, top - right * ChevronHalfWidth);
            _chevron.SetPosition(2, top + right * ChevronHalfWidth);

            // 발밑 고리 — 살짝 숨 쉬듯.
            float r = (0.75f + Mathf.Sin(_markTime * 3f) * 0.05f) * scale;
            for (int i = 0; i < RingSegments; i++)
            {
                float a = i * Mathf.PI * 2f / RingSegments + _markTime * 0.8f;
                _ring.SetPosition(i, p + new Vector3(Mathf.Cos(a) * r, 0.07f, Mathf.Sin(a) * r));
            }
        }
    }
}
