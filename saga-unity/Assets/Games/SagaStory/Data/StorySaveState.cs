using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Saga.Story.Data
{
    /// <summary>
    /// VERTICAL_SLICE_STORY.md 1절 완료 조건 "저장한다 → 다시 켜서
    /// 이어진다" — SagaDungeon `Data/SaveState.cs`와 같은 구조(로컬 파일
    /// 하나, 버전 필드). 파일명은 다르다(`save_story.json`, 다섯 판이
    /// 세이브 키를 따로 쓰는 것과 같은 원칙, 루트 CLAUDE.md).
    /// 저장하는 것 — 위치 + 사명("첫 사냥") 진행도(장비는 이 슬라이스에
    /// 없다 — 1절 "제외" 목록에 없는 것은 애초에 저장할 상태 자체가
    /// 없다). **2026-09-15부터 레벨업(level/exp/job)도 추가됐다** — 아래
    /// SaveVersion 6 항목 참고.
    /// </summary>
    public static class StorySaveState
    {
        // v6 — "STORY 확장 — 전직·SP 투자 UI"(2026-09-15), level/exp/job
        // 추가. 구버전 세이브는 level/exp가 기본값(0)으로 들어오는데,
        // StoryJobState.Restore()가 Mathf.Max(1, level)로 최소 1레벨을
        // 보장해 무해하다(job도 빈 문자열→"none"으로 정규화).
        private const int SaveVersion = 6;

        private static string SavePath => Path.Combine(Application.persistentDataPath, "save_story.json");

        [Serializable]
        private class SaveData
        {
            public int version;
            public float[] playerPos;
            public int kills;
            public int bossKills;
            public string[] triggeredEvents;
            public int scoutTalkCount;
            public int choiceMade;
            public int level;
            public float exp;
            public string job;
        }

        public static bool Save()
        {
            Transform player = FindPlayer();
            if (player == null) return false;

            var events = new List<string>(StoryWorldEventState.TriggeredIds);
            var data = new SaveData
            {
                version = SaveVersion,
                playerPos = new[] { player.position.x, player.position.y, player.position.z },
                kills = StoryQuestState.Kills,
                bossKills = StoryQuestState.BossKills,
                triggeredEvents = events.ToArray(),
                scoutTalkCount = StoryNpcState.ScoutTalkCount,
                choiceMade = StoryNpcState.ChoiceMade,
                level = StoryJobState.Level,
                exp = StoryJobState.Exp,
                job = StoryJobState.Job,
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

            StoryQuestState.Restore(data.kills, data.bossKills);
            StoryWorldEventState.Restore(data.triggeredEvents);
            StoryNpcState.Restore(data.scoutTalkCount, data.choiceMade);
            StoryJobState.Restore(data.level, data.exp, data.job);

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
