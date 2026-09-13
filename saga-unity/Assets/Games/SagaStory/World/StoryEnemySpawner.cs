using UnityEngine;
using Saga.Story.Data;

namespace Saga.Story.World
{
    /// <summary>
    /// VERTICAL_SLICE_STORY.md 1절 — FieldMapData.EnemyPositionsM()의
    /// 고정 자리 열에 잡졸(StoryEnemy)을 하나씩 세운다. 원작
    /// spawnEnemy()의 무작위 리스폰은 "제외" 목록(day/파도 시스템 자체가
    /// 범위 밖)이라, 한 번 세우고 그걸로 끝. **"STORY 콘텐츠 확장"
    /// (2026-09-13)에서 두목(황건 두목, q_boss1) 하나를 들판 가장
    /// 안쪽에 더했다** — 다 잡으면 "첫 사냥"·"두목의 목" 두 사명이 남는다.
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

            var bossGo = new GameObject("Boss_HwangGeon");
            bossGo.transform.SetParent(transform, false);
            bossGo.transform.localPosition = new Vector3(FieldMapData.BossPositionM(), GroundY, 0f);
            var boss = bossGo.AddComponent<StoryEnemy>();
            boss.SetBoss(true);
            SetPrivateField(boss, "modelPrefab", enemyModelPrefab);
        }

        private static void SetPrivateField(object target, string fieldName, object value)
        {
            var field = target.GetType().GetField(fieldName,
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            field?.SetValue(target, value);
        }
    }
}
