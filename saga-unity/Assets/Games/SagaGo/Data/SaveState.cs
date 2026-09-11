using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Saga.Go.Data
{
    /// <summary>
    /// VERTICAL_SLICE.md 26절 "저장/로드(로컬 파일 하나)" — 12단계 완료
    /// 조건의 마지막 단계. PLAN.md 28장은 레벨·경험치·장비·인벤토리·퀘스트·
    /// 월드 상태까지 저장하라고 하지만 그중 이 슬라이스에 실제로 있는
    /// 상태는 플레이어 위치와 부대(PartyState)뿐이다 — 없는 시스템을
    /// 저장하는 코드는 만들지 않는다. saga-godot의 save_state.gd와 같은
    /// 구조(_migrate_step 마이그레이션 경로 포함, PLAN.md Phase 9의
    /// "Data Versioning"을 처음부터 지킴).
    /// </summary>
    public static class SaveState
    {
        private const int SaveVersion = 1;

        private static string SavePath => Path.Combine(Application.persistentDataPath, "save.json");

        [Serializable]
        private class SaveData
        {
            public int version;
            public float[] playerPos;
            public List<string> partyMembers;
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

        /// <summary>저장 파일이 있으면 부대·플레이어 위치에 적용하고 true, 없거나
        /// 마이그레이션 경로가 없거나 깨져 있으면 아무것도 바꾸지 않고 false
        /// (새 게임 취급).</summary>
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
        /// 돌려준다. 등록된 경로가 없으면 null. 지금은 SaveVersion이 1뿐이라
        /// 등록된 마이그레이션이 없다 — 스키마를 실제로 바꿀 때(필드 추가·
        /// 이름 변경 등) SaveVersion을 올리고 여기 switch에 그 버전 분기를
        /// 추가하면 된다.</summary>
        private static SaveData MigrateStep(int fromVersion, SaveData data)
        {
            return null;
        }

        private static Transform FindPlayer()
        {
            var go = GameObject.FindWithTag("Player");
            return go != null ? go.transform : null;
        }
    }
}
