using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Saga.Go.Data
{
    /// <summary>
    /// VERTICAL_SLICE.md 26절 "저장/로드(로컬 파일 하나)" — 12단계 완료
    /// 조건의 마지막 단계. saga-godot의 save_state.gd와 같은 구조
    /// (_migrate_step 마이그레이션 경로 포함, PLAN.md 75장 "Data
    /// Versioning"을 처음부터 지킴 — v1→v2, v2→v3, v3→v4, v4→v5, v5→v6
    /// 전환이 그 실사용례다).
    /// </summary>
    public static class SaveState
    {
        private const int SaveVersion = 6;

        private static string SavePath => Path.Combine(Application.persistentDataPath, "save.json");

        [Serializable]
        private class SaveData
        {
            public int version;
            public float[] playerPos;
            public List<string> partyMembers;
            // v2(PLAN.md 59~65장 Stats/Item/Inventory/Equipment 추가) — v1엔 없던 필드.
            public int level;
            public int exp;
            public List<string> ownedItems;
            public string equippedWeapon;
            public string equippedArmor;
            // v3(PLAN.md 70~71장 Quest 추가) — v2까지는 없던 필드.
            public int questBanditStage;
            // v4(PLAN.md 72~73장 World Event/Hidden Area 추가) — v3까지는 없던 필드.
            public bool caveTreasureFound;
            // v5(PLAN.md 66장 Reward의 돈·상인 거래 추가) — v4까지는 없던 필드.
            public int gold;
            public bool merchantSold;
            // v6(PLAN.md 51장 GO 월드 확장 — 수집) — v5까지는 없던 필드.
            public List<string> gatheredSpots;
        }

        public static bool Save()
        {
            Transform player = FindPlayer();
            if (player == null) return false;

            var data = new SaveData
            {
                version = SaveVersion,
                playerPos = new[] { player.position.x, player.position.y, player.position.z },
                partyMembers = new List<string>(PartyState.MemberIds),
                level = PlayerStats.Level,
                exp = PlayerStats.Exp,
                ownedItems = new List<string>(Inventory.OwnedIds),
                equippedWeapon = Inventory.EquippedWeaponId,
                equippedArmor = Inventory.EquippedArmorId,
                questBanditStage = (int)QuestState.BanditQuest,
                caveTreasureFound = WorldEventState.CaveTreasureFound,
                gold = GoldState.Gold,
                merchantSold = ShopState.MerchantSold,
                gatheredSpots = new List<string>(GatherState.GatheredIds),
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

        /// <summary>저장 파일이 있으면 부대·레벨/경험치·인벤토리·퀘스트·숨겨진
        /// 보물·돈/상인 거래·플레이어 위치에 적용하고 true, 없거나 마이그레이션
        /// 경로가 없거나 깨져 있으면 아무것도 바꾸지 않고 false(새 게임 취급).</summary>
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

            data = Migrate(data);
            if (data == null) return false;

            PartyState.Restore(data.partyMembers ?? new List<string>());
            PlayerStats.Restore(data.level, data.exp);
            Inventory.Restore(data.ownedItems ?? new List<string>(), data.equippedWeapon, data.equippedArmor);
            QuestState.Restore((QuestStage)data.questBanditStage);
            WorldEventState.Restore(data.caveTreasureFound);
            GoldState.Restore(data.gold);
            ShopState.Restore(data.merchantSold);
            GatherState.Restore(data.gatheredSpots);

            Transform player = FindPlayer();
            if (player != null && data.playerPos != null && data.playerPos.Length == 3)
            {
                player.position = new Vector3(data.playerPos[0], data.playerPos[1], data.playerPos[2]);
            }
            return true;
        }

        /// <summary>data의 version이 SaveVersion보다 낮으면 MigrateStep()을 한
        /// 단계씩 적용해 최신 모양으로 바꿔 돌려준다(딱 맞으면 그대로).
        /// 마이그레이션 경로가 없거나(MigrateStep이 null) 이 빌드보다 나중
        /// 버전(다운그레이드)이면 null — 데이터를 반쯤 바꾼 채로 적용하지
        /// 않는다.</summary>
        private static SaveData Migrate(SaveData data)
        {
            int version = data.version;
            while (version < SaveVersion)
            {
                SaveData stepped = MigrateStep(version, data);
                if (stepped == null) return null;
                data = stepped;
                version = data.version;
            }
            return version > SaveVersion ? null : data;
        }

        /// <summary>버전 fromVersion에서 온 data를 fromVersion+1 모양으로 바꿔
        /// 돌려준다. 등록된 경로가 없으면 null.</summary>
        private static SaveData MigrateStep(int fromVersion, SaveData data)
        {
            if (fromVersion == 1)
            {
                // v1엔 레벨/경험치/인벤토리 필드가 아예 없었다 — 처음 시작한
                // 것과 같은 기본값(1레벨, 빈 손)으로 채운다.
                data.version = 2;
                data.level = 1;
                data.exp = 0;
                data.ownedItems = new List<string>();
                data.equippedWeapon = null;
                data.equippedArmor = null;
                return data;
            }
            if (fromVersion == 2)
            {
                // v2엔 퀘스트 필드가 없었다 — 촌장을 아직 안 만난 것과 같은
                // 기본값(QuestStage.NotStarted == 0)으로 채운다.
                data.version = 3;
                data.questBanditStage = (int)QuestStage.NotStarted;
                return data;
            }
            if (fromVersion == 3)
            {
                // v3엔 숨겨진 보물 필드가 없었다 — 아직 못 찾은 것과 같은
                // 기본값(false)으로 채운다.
                data.version = 4;
                data.caveTreasureFound = false;
                return data;
            }
            if (fromVersion == 4)
            {
                // v4엔 돈·상인 거래 필드가 없었다 — 처음 시작한 것과 같은
                // 기본값(시작 소지금, 상인한테서 아직 안 산 상태)으로 채운다.
                data.version = 5;
                data.gold = GoldState.StartingGold;
                data.merchantSold = false;
                return data;
            }
            if (fromVersion == 5)
            {
                // v5엔 채집 필드가 없었다 — 아직 아무 데도 안 캔 것과 같은
                // 기본값(빈 목록)으로 채운다.
                data.version = 6;
                data.gatheredSpots = new List<string>();
                return data;
            }
            return null;
        }

        private static Transform FindPlayer()
        {
            var go = GameObject.FindWithTag("Player");
            return go != null ? go.transform : null;
        }
    }
}
