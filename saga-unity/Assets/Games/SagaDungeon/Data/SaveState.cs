using System;
using System.IO;
using UnityEngine;
using Saga.Dungeon.World;

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
        // v5("절차적 층 진행" 슬라이스) — `DungeonFloorRunner.CurrentFloor`를
        // 저장 안 하면 저장/로드할 때마다 던전 진행이 항상 층2로 돌아가
        // 버리는 실제 결함이 있었다(이 필드가 생기기 전엔 방이 넷뿐이라
        // 저장할 "층" 개념 자체가 없어서 문제가 안 됐다). v4 이하 세이브는
        // dungeonFloor가 int 기본값 0으로 채워지고, `TryLoad()`가 2 미만이면
        // 무시하도록 짜서 옛 세이브도 그대로 로드된다(새로 층2부터 시작).
        private const int SaveVersion = 5;

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
            public int questStage; // v3 이하 호환용 — v4부터는 아래 세 플래그가 정본.
            public bool bossDead;
            public bool minibossDead;
            public bool captiveFreed;
            public int dungeonFloor; // v5 — DungeonFloorRunner.CurrentFloor, 0이면 "없음"(v4 이하 세이브).
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
                bossDead = QuestState.BossDead,
                minibossDead = QuestState.MinibossDead,
                captiveFreed = QuestState.CaptiveFreed,
                dungeonFloor = DungeonFloorRunner.Instance?.CurrentFloor ?? 0,
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
            if (data.version >= 4)
            {
                QuestState.Restore(data.bossDead, data.minibossDead, data.captiveFreed);
            }
            else
            {
                QuestState.RestoreLegacyStage(data.questStage);
            }
            if (data.version >= 5 && data.dungeonFloor >= 2)
            {
                DungeonFloorRunner.Instance?.JumpToFloor(data.dungeonFloor);
            }

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
