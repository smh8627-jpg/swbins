using UnityEngine;
using UnityEngine.InputSystem;
using Saga.Dungeon.Data;
using Saga.Dungeon.UI;
using Saga.Dungeon.World;

namespace Saga.Dungeon.Player
{
    /// <summary>
    /// PLAN.md 106-2 "잊힌 능묘" — 벽력탄 놓기. R(데스크톱)·"벽력탄" 버튼(모바일).
    /// 능묘의 벽력탄 상자를 열어야 쓸 수 있고(`TempleState.HasBombs`), 한 번에 하나만
    /// 놓인다(젤다처럼 개수 관리는 없다 — 이 판은 퍼즐 도구로 먼저 검증한다).
    /// </summary>
    [RequireComponent(typeof(PlayerController))]
    public class PlayerBombs : MonoBehaviour
    {
        private const float PlaceAheadM = 1f;
        private const float ShakeMag = 0.18f;
        private const float ShakeSec = 0.22f;
        private const float ShakeRangeM = 12f;

        private PlayerController _controller;
        private CameraRig _cameraRig;
        private TempleBomb _active;

        public TempleBomb ActiveBomb => _active;

        private void Awake()
        {
            _controller = GetComponent<PlayerController>();
            _cameraRig = GetComponentInChildren<CameraRig>();
            TempleBomb.Exploded += OnExploded;
        }

        private void OnDestroy() => TempleBomb.Exploded -= OnExploded;

        private void Update()
        {
            var kb = Keyboard.current;
            if (kb != null && kb.rKey.wasPressedThisFrame) TryPlaceBomb();
        }

        /// <summary>모바일 "벽력탄" 버튼(영속 리스너)과 R키가 부른다.</summary>
        public void TryPlaceBomb()
        {
            if (!TempleState.HasBombs)
            {
                DialogueLabel.Instance?.Show(DungeonLocalization.T("temple.no_bombs", "아직 놓을 것이 없다 — 능묘 어딘가에 벽력탄이 있다"), 3f);
                return;
            }
            if (_active != null) return;

            Vector3 fwd = _controller.Visual != null ? _controller.Visual.forward : transform.forward;
            fwd.y = 0f;
            if (fwd.sqrMagnitude < 0.0001f) fwd = Vector3.forward;
            Vector3 pos = transform.position + fwd.normalized * PlaceAheadM;
            pos.y = transform.position.y + 0.25f;
            _active = TempleBomb.Spawn(pos);
        }

        private void OnExploded(Vector3 pos)
        {
            if (TempleVisuals.FlatDistance(pos, transform.position) <= ShakeRangeM) _cameraRig?.Shake(ShakeMag, ShakeSec);
        }
    }
}
