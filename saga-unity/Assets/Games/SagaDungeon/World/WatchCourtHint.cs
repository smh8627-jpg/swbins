using UnityEngine;
using Saga.Dungeon.Data;
using Saga.Dungeon.UI;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// PLAN.md 106-5 "옛 감시탑 뜰" — 방에 처음 들어서면(판마다 한 번) 제목과 조작을 알려 준다.
    /// 방 가운데(이 물체 자리)에서 반너비 안이면 "들어섰다"로 본다.
    /// </summary>
    public class WatchCourtHint : MonoBehaviour
    {
        public const float HalfSize = 9f;

        private Transform _player;
        private bool _shown;

        public bool Shown => _shown;

        private void Start()
        {
            var p = GameObject.FindWithTag("Player");
            _player = p != null ? p.transform : null;
        }

        private void Update()
        {
            if (_player != null) Tick(_player.position);
        }

        /// <summary>그 자리가 방 안이고 아직 안 알렸으면 알린다(처음이면 true). 진단도 부른다.</summary>
        public bool Tick(Vector3 playerPos)
        {
            if (_shown) return false;
            Vector3 d = playerPos - transform.position;
            if (Mathf.Abs(d.x) > HalfSize || Mathf.Abs(d.z) > HalfSize) return false;
            _shown = true;
            DialogueLabel.Instance?.Show(DungeonLocalization.T("explore.court_hint",
                "— 옛 감시탑 뜰 — 담쟁이 벽은 기어오를 수 있다 · F(「점프」)로 뛴다"), 5f);
            return true;
        }

        public void ResetForTest() => _shown = false;
    }
}
