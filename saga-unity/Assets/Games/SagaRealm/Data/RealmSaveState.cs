using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Saga.Realm.Data
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 5절 "저장한다 → 다시 켜서 이어진다" —
    /// SagaStory `Data/StorySaveState.cs`와 같은 구조(로컬 파일 하나,
    /// 버전 필드). 파일명은 다르다(`save_realm.json`, 루트 CLAUDE.md
    /// "세이브 키는 폴더 이름과 무관하게 고정" 원칙과 같은 이유로
    /// 다섯 판·두 엔진 트랙이 저마다 파일을 따로 쓴다). REALM엔 플레이어
    /// 위치가 없다 — 저장하는 것은 전부 RealmCityState의 값이다.
    /// </summary>
    public static class RealmSaveState
    {
        private const int SaveVersion = 1;

        private static string SavePath => Path.Combine(Application.persistentDataPath, "save_realm.json");

        [Serializable]
        private class SaveData
        {
            public int version;
            public int gold;
            public int food;
            public int agri;
            public int comm;
            public int sec;
            public int year;
            public int month;
            public List<string> roster;
            public List<string> done;
            public List<string> found;
        }

        public static bool Save()
        {
            var data = new SaveData
            {
                version = SaveVersion,
                gold = RealmCityState.Gold,
                food = RealmCityState.Food,
                agri = RealmCityState.Agri,
                comm = RealmCityState.Comm,
                sec = RealmCityState.Sec,
                year = RealmCityState.Year,
                month = RealmCityState.Month,
                roster = new List<string>(RealmCityState.RosterIds),
                done = new List<string>(BuiltDoneSnapshot()),
                found = new List<string>(RealmCityState.FoundIds),
            };

            try
            {
                File.WriteAllText(SavePath, JsonUtility.ToJson(data));
                return true;
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[RealmSaveState] 저장 실패: {e.Message}");
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
                Debug.LogWarning($"[RealmSaveState] 로드 실패: {e.Message}");
                return false;
            }
            if (data == null || data.version > SaveVersion) return false;

            RealmCityState.Restore(data.gold, data.food, data.agri, data.comm, data.sec, data.year, data.month,
                data.roster, data.done, data.found);
            return true;
        }

        /// <summary>RosterIds 중 IsOfficerDone()이 true인 것만 뽑는다 —
        /// RealmCityState가 done 집합을 직접 노출하진 않아(로스터·found처럼
        /// 굳이 프로퍼티를 늘리지 않고) 이미 있는 조회만으로 만든다.</summary>
        private static List<string> BuiltDoneSnapshot()
        {
            var result = new List<string>();
            foreach (var id in RealmCityState.RosterIds)
            {
                if (RealmCityState.IsOfficerDone(id)) result.Add(id);
            }
            return result;
        }
    }
}
