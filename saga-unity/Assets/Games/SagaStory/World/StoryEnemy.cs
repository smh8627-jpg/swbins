using System.Collections.Generic;
using UnityEngine;
using Saga.Story.Data;

namespace Saga.Story.World
{
    /// <summary>
    /// VERTICAL_SLICE_STORY.md 1·3절 — 잡졸 하나(황건적, data-enemy.js
    /// 첫 항목 그대로, color '#c9a83a' — DUNGEON `DungeonEnemy.cs`가 이미
    /// 같은 색으로 옮겨 둔 값과 같다). HP=18은 side.js spawnEnemy() lv=1
    /// 공식(StoryCombat.cs 참고).
    ///
    /// **재해석** — 이번 슬라이스는 추격·원거리 반격이 없다(1·3절 "제외" —
    /// "때린다→쓰러진다" 감각부터 검증한다). saga-godot `story_enemy.gd`와
    /// 같은 결로 **제자리에 서서 맞기만 한다** — 넉백조차 이번엔 안
    /// 넣었다(시각 반응 없이 HP만 깎인다, 다음 콘텐츠 확장 때 DUNGEON
    /// `DungeonEnemy.cs` 패턴을 참고해 추격·반격을 붙이면 된다).
    /// </summary>
    public class StoryEnemy : MonoBehaviour
    {
        private static readonly List<StoryEnemy> AllList = new List<StoryEnemy>();
        public static IReadOnlyList<StoryEnemy> All => AllList;

        // data-enemy.js 황건적 color '#c9a83a'.
        private static readonly Color BodyColor = new Color(0.788f, 0.659f, 0.227f);

        [SerializeField] private GameObject modelPrefab; // BuildTestStoryScene.cs가 character-d를 채운다.

        private float _hp = StoryCombat.EnemyHp;
        private bool _dead;

        /// <summary>`Destroy()`는 실제 파괴를 프레임 끝으로 미루므로(즉시
        /// null이 안 된다), 같은 프레임 안에서 죽었는지 확인해야 하는
        /// 호출부(PlaytestStorySlice.cs)는 GameObject 파괴 대신 이 플래그를
        /// 본다 — DUNGEON `DungeonEnemy._state`와 같은 결.</summary>
        public bool IsDead => _dead;

        private void Awake()
        {
            AllList.Add(this);
            if (transform.Find("Visual") == null) BuildVisual();
        }

        private void OnDestroy() => AllList.Remove(this);

        private void BuildVisual()
        {
            if (modelPrefab != null) CharacterVisual.Spawn(modelPrefab, transform, 1.6f, BodyColor);
            else CharacterVisual.SpawnFallbackCapsule(transform, 1.6f, BodyColor);
        }

        public void TakeDamage(float amount)
        {
            if (_dead || amount <= 0f) return;
            _hp -= amount;
            if (_hp <= 0f) Die();
        }

        private void Die()
        {
            if (_dead) return;
            _dead = true;
            StoryQuestState.AddKill();
            Destroy(gameObject);
        }
    }
}
