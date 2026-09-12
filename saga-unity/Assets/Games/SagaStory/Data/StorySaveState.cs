using System;
using System.IO;
using UnityEngine;

namespace Saga.Story.Data
{
    /// <summary>
    /// VERTICAL_SLICE_STORY.md 1절 완료 조건 "저장한다 → 다시 켜서
    /// 이어진다" — SagaDungeon `Data/SaveState.cs`와 같은 구조(로컬 파일
    /// 하나, 버전 필드). 파일명은 다르다(`save_story.json`, 다섯 판이
    /// 세이브 키를 따로 쓰는 것과 같은 원칙, 루트 CLAUDE.md).
    /// 저장하는 것 — 위치 + 사명("첫 사냥") 진행도뿐(이 슬라이스엔 레벨업·
    /// 장비가 없다 — 1절 "제외" 목록에 없는 것은 애초에 저장할 상태
    /// 자체가 없다).
    /// </summary>
    public static class StorySaveState
    {
        private const int SaveVersion = 1;

        private static string SavePath => Path.Combine(Application.persistentDataPath, "save_story.json");

        [Serializable]
        private class SaveData
        {
            public int version;
            public float[] playerPos;
            public int kills;
        }

        public static bool Save()
        {
            Transform player = FindPlayer();
            if (player == null) return false;

            var data = new SaveData
            {
                version = SaveVersion,
                playerPos = new[] { player.position.x, player.position.y, player.position.z },
                kills = StoryQuestState.Kills,
            };

            try
            {
                File.WriteAllText(SavePath, JsonUtility.ToJson(data));
                return true;
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[StorySaveState] 저장 실패: {e.Message}");
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
                Debug.LogWarning($"[StorySaveState] 로드 실패: {e.Message}");
                return false;
            }
            if (data == null || data.version > SaveVersion) return false;

            StoryQuestState.Restore(data.kills);

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
