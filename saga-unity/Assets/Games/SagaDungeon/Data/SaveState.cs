using System;
using System.IO;
using UnityEngine;

namespace Saga.Dungeon.Data
{
    /// <summary>
    /// VERTICAL_SLICE_DUNGEON.md "저장/로드(로컬 파일 하나)". GO의
    /// Data/SaveState.cs와 같은 구조(마이그레이션 경로 포함, PLAN.md 75장
    /// "Data Versioning") — 파일명은 다르다(`save_dungeon.json`, GO의
    /// `save.json`과 안 겹치게 — 다섯 판이 세이브 키를 따로 쓰는 것과 같은
    /// 원칙, 루트 CLAUDE.md).
    /// </summary>
    public static class SaveState
    {
        // v3("퀘스트 시스템" 슬라이스) — questStage 추가. 구 v1/v2 세이브는
        // JsonUtility가 int 기본값(0=Stage.HuntBoss)으로 채워 그대로
        // 로드된다(PLAN.md 75장 "Data Versioning") — 처음부터 다시 하는
        // 셈이라 자연스럽다(예전 세이브엔 퀘스트 진행 개념 자체가 없었다).
        private const int SaveVersion = 3;

        private static string SavePath => Path.Combine(Application.persistentDataPath, "save_dungeon.json");

        [Serializable]
        private class SaveData
        {
            public int version;
            public float[] playerPos;
            public int level;
            public int exp;
            public int gold;
            public int hp;
            public string weaponId;
            public string gemId;
            public string[] discovered;
            public int questStage;
        }

        public static bool Save()
        {
            Transform player = FindPlayer();
            if (player == null) return false;

            var data = new SaveData
            {
                version = SaveVersion,
                playerPos = new[] { player.position.x, player.position.y, player.position.z },
                level = HeroState.Level,
                exp = HeroState.Exp,
                gold = HeroState.Gold,
                hp = HeroState.Hp,
                weaponId = HeroState.EquippedWeaponId,
                gemId = HeroState.SocketedGemId,
                discovered = BestiaryState.Snapshot(),
                questStage = (int)QuestState.Current,
            };

            try
            {
                File.WriteAllText(SavePath, JsonUtility.ToJson(data));
                return true;
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[SaveState] 저장 실패: {e.Message}");
                return false;
            }
        }

        /// <summary>저장 파일이 있으면 캐릭터 상태·위치에 적용하고 true,
        /// 없거나 깨져 있으면 아무것도 바꾸지 않고 false(새 게임 취급).</summary>
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
                Debug.LogWarning($"[SaveState] 로드 실패: {e.Message}");
                return false;
            }
            if (data == null) return false;

            // 이 빌드보다 나중 버전(다운그레이드)이면 반쯤 바뀐 채로 적용하지 않는다.
            if (data.version > SaveVersion) return false;

            HeroState.Restore(data.level, data.exp, data.hp, data.gold, data.weaponId, data.gemId);
            BestiaryState.Restore(data.discovered);
            QuestState.Restore(data.questStage);

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
