using UnityEngine;
using Saga.Story.Data;

namespace Saga.Story.World
{
    /// <summary>
    /// VERTICAL_SLICE_STORY.md 1절 — FieldMapData.EnemyPositionsM()의
    /// 고정 자리 셋에 잡졸(StoryEnemy)을 하나씩 세운다. 원작
    /// spawnEnemy()의 무작위 리스폰은 "제외" 목록(day/파도 시스템 자체가
    /// 범위 밖)이라, 한 번 세우고 그걸로 끝 — 다 잡으면 "첫 사냥" 사명만
    /// 남는다.
    /// </summary>
    public class StoryEnemySpawner : MonoBehaviour
    {
        private const float GroundY = 0f;

        [SerializeField] private GameObject enemyModelPrefab;

        private void Awake()
        {
            if (transform.childCount > 0) return;
            Build();
        }

        public void Build()
        {
            foreach (var x in FieldMapData.EnemyPositionsM())
            {
                var go = new GameObject("Enemy_HwangGeon");
                go.transform.SetParent(transform, false);
                go.transform.localPosition = new Vector3(x, GroundY, 0f);
                var enemy = go.AddComponent<StoryEnemy>();
                SetPrivateField(enemy, "modelPrefab", enemyModelPrefab);
            }
        }

        private static void SetPrivateField(object target, string fieldName, object value)
        {
            var field = target.GetType().GetField(fieldName,
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            field?.SetValue(target, value);
        }
    }
}
