using System;
using System.IO;
using UnityEngine;

namespace Saga.Forest.Data
{
    /// <summary>
    /// VERTICAL_SLICE_FOREST.md(saga-godot) 4절 "결정 — 포함: 저장/불러오기
    /// (위치+채집한 과일 개수 정도, GO/DUNGEON과 같은 최소 범위)". 파일명은
    /// `save_forest.json` — 다섯 판이 세이브 키를 따로 쓰는 것과 같은 원칙
    /// (루트 CLAUDE.md), DUNGEON의 `save_dungeon.json`과도 안 겹친다.
    /// </summary>
    public static class ForestSaveState
    {
        private const int SaveVersion = 1;

        private static string SavePath => Path.Combine(Application.persistentDataPath, "save_forest.json");

        [Serializable]
        private class SaveData
        {
            public int version;
            public float[] playerPos;
            public int fruitCount;
        }

        public static bool Save()
        {
            Transform player = FindPlayer();
            if (player == null) return false;

            var data = new SaveData
            {
                version = SaveVersion,
                playerPos = new[] { player.position.x, player.position.y, player.position.z },
                fruitCount = ForestState.FruitCount,
            };

            try
            {
                File.WriteAllText(SavePath, JsonUtility.ToJson(data));
                return true;
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[ForestSaveState] 저장 실패: {e.Message}");
                return false;
            }
        }

        public static bool TryLoad()
        {
            if (!File.Exists(SavePath)) return false;

            SaveData data;
            try
            {
                data = JsonUtility.FromJson<SaveData>(File.ReadAllText(SavePath));
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[ForestSaveState] 로드 실패: {e.Message}");
                return false;
            }
            if (data == null) return false;
            if (data.version > SaveVersion) return false;

            ForestState.Restore(data.fruitCount);

            Transform player = FindPlayer();
            if (player != null && data.playerPos != null && data.playerPos.Length == 3)
            {
                player.position = new Vector3(data.playerPos[0], data.playerPos[1], data.playerPos[2]);
            }
            return true;
        }

        private static Transform FindPlayer()
        {
            var go = GameObject.FindWithTag("Player");
            return go != null ? go.transform : null;
        }
    }
}
