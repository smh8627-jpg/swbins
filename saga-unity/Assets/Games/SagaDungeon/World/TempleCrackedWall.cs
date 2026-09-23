using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Saga.Dungeon.Audio;
using Saga.Dungeon.Data;
using Saga.Dungeon.UI;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// PLAN.md 106-2 "잊힌 능묘" 금 간 벽 — 복도를 막은 돌벽. 벽력탄 폭발
    /// (`TempleBomb.Explode`)만 부순다. 다가가면 "무언가로 부술 수 있겠다"는 힌트를
    /// 한 번 준다(젤다의 "금 간 벽은 폭탄" 문법). 부서짐은 진행 비트로 저장된다.
    /// </summary>
    public class TempleCrackedWall : MonoBehaviour
    {
        private const float HintRadius = 3f;
        private const float Width = 4f;
        private const float Height = 4f;
        private const float Thickness = 1f;
        private const float CrumbleSec = 0.5f;

        public static readonly List<TempleCrackedWall> All = new List<TempleCrackedWall>();

        [SerializeField] private TempleFlag brokenFlag = TempleFlag.CrackedWall;
        [SerializeField] private Material stoneMaterial;

        private Transform _wall;
        private Transform _player;
        private bool _broken;
        private bool _wasNear;

        public bool IsBroken => _broken;

        private void Awake()
        {
            if (transform.childCount == 0) Build();
            else _wall = transform.Find("Wall");
            var playerGo = GameObject.FindWithTag("Player");
            _player = playerGo != null ? playerGo.transform : null;
        }

        private void OnEnable()
        {
            All.Add(this);
            TempleState.Changed += ApplyState;
        }

        private void OnDisable()
        {
            All.Remove(this);
            TempleState.Changed -= ApplyState;
        }

        private void Start() => ApplyState();

        public void Build()
        {
            var stone = stoneMaterial != null ? stoneMaterial : TempleVisuals.Solid(TempleVisuals.StoneColor);
            var crack = TempleVisuals.Solid(new Color(0.05f, 0.04f, 0.04f));
            _wall = new GameObject("Wall").transform;
            _wall.SetParent(transform, false);
            TempleVisuals.Box(_wall, "Stone", new Vector3(0f, Height * 0.5f, 0f), new Vector3(Width, Height, Thickness), stone);
            // 금 — 앞뒤 면에 얇은 검은 띠 몇 줄(번개 모양으로 기울여).
            float[] angles = { 28f, -35f, 62f, -18f };
            Vector3[] spots = { new Vector3(-0.6f, 2.2f, 0f), new Vector3(0.4f, 1.5f, 0f), new Vector3(0.1f, 2.9f, 0f), new Vector3(-0.2f, 0.9f, 0f) };
            for (int i = 0; i < spots.Length; i++)
            {
                foreach (float side in new[] { 1f, -1f })
                {
                    var c = TempleVisuals.Box(_wall, $"Crack_{i}_{(side > 0 ? "F" : "B")}",
                        spots[i] + new Vector3(0f, 0f, side * (Thickness * 0.5f + 0.01f)),
                        new Vector3(1.1f, 0.07f, 0.02f), crack, collider: false);
                    c.localRotation = Quaternion.Euler(0f, 0f, angles[i]);
                }
            }
        }

        private void Update() => Tick();

        public void Tick()
        {
            if (_broken || _player == null) return;
            bool near = TempleVisuals.FlatDistance(transform.position, _player.position) <= HintRadius;
            if (near && !_wasNear)
            {
                DialogueLabel.Instance?.Show(TempleState.HasBombs
                    ? DungeonLocalization.T("temple.wall_hint_bomb", "금이 간 벽이다 — 벽력탄(R)을 놓아 보자")
                    : DungeonLocalization.T("temple.wall_hint", "금이 간 벽이다 — 무언가로 부술 수 있을 것 같다"), 3f);
            }
            _wasNear = near;
        }

        /// <summary>벽력탄이 부른다 — 폭발 반경이 벽 면(폭 4m)에 닿으면 무너진다.</summary>
        public bool TryBreak(Vector3 blastPos, float radius)
        {
            if (_broken) return false;
            Vector3 local = transform.InverseTransformPoint(blastPos);
            float dx = Mathf.Max(0f, Mathf.Abs(local.x) - Width * 0.5f);
            float dz = Mathf.Max(0f, Mathf.Abs(local.z) - Thickness * 0.5f);
            if (dx * dx + dz * dz > radius * radius) return false;

            _broken = true;
            TempleState.Set(brokenFlag);
            SfxPlayer.PlayHeavyHit();
            DialogueLabel.Instance?.Show(DungeonLocalization.T("temple.wall_broken", "💥 벽이 무너졌다!"), 3f);
            if (isActiveAndEnabled) StartCoroutine(Crumble());
            else if (_wall != null) _wall.gameObject.SetActive(false);
            return true;
        }

        private void ApplyState()
        {
            if (_broken || !TempleState.Has(brokenFlag)) return;
            _broken = true;
            if (_wall != null) _wall.gameObject.SetActive(false);
        }

        private IEnumerator Crumble()
        {
            foreach (var col in _wall.GetComponentsInChildren<Collider>()) col.enabled = false;
            float t = 0f;
            while (t < CrumbleSec)
            {
                t += Time.deltaTime;
                float k = t / CrumbleSec;
                _wall.localScale = new Vector3(1f + k * 0.15f, 1f - k, 1f + k * 0.15f);
                yield return null;
            }
            _wall.gameObject.SetActive(false);
        }
    }
}
