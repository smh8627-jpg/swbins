using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Saga.Realm.Data
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 5절 "저장한다 → 다시 켜서 이어진다" —
    /// 여러 성 확장(2-4절 참고, 개념만) 이후로는 성마다의 아홉 필드도
    /// 함께 저장한다. `SaveVersion`을 1→2로 올렸다(성 하나 전제였던
    /// v1 세이브는 구조가 달라 자동 무시되고 새 게임으로 시작한다 —
    /// PLAN.md 28장 "Version 필드" 대비 그대로, 첫 슬라이스라 마이그레이션
    /// 경로를 따로 안 만든다).
    /// </summary>
    public static class RealmSaveState
    {
        private const int SaveVersion = 2;

        private static string SavePath => Path.Combine(Application.persistentDataPath, "save_realm.json");

        [Serializable]
        private class CitySave
        {
            public string cityId;
            public int agri, comm, tech, sec, wall, train, ships, pop, troops, food;
        }

        [Serializable]
        private class SaveData
        {
            public int version;
            public int gold;
            public int year;
            public int month;
            public string currentCity;
            public List<string> roster;
            public List<string> done;
            public List<string> found;
            public List<string> officerCityIds;
            public List<string> officerCityCities;
            public List<CitySave> cities;
        }

        public static bool Save()
        {
            var cities = new List<CitySave>();
            foreach (var snap in RealmCityState.SnapshotCities())
            {
                cities.Add(new CitySave
                {
                    cityId = snap.CityId, agri = snap.Agri, comm = snap.Comm, tech = snap.Tech, sec = snap.Sec,
                    wall = snap.Wall, train = snap.Train, ships = snap.Ships, pop = snap.Pop, troops = snap.Troops, food = snap.Food,
                });
            }

            var officerCityIds = new List<string>();
            var officerCityCities = new List<string>();
            foreach (var id in RealmCityState.RosterIds)
            {
                officerCityIds.Add(id);
                officerCityCities.Add(RealmCityState.OfficerCityId(id));
            }

            var data = new SaveData
            {
                version = SaveVersion,
                gold = RealmCityState.Gold,
                year = RealmCityState.Year,
                month = RealmCityState.Month,
                currentCity = RealmCityState.CurrentCity,
                roster = new List<string>(RealmCityState.RosterIds),
                done = BuildDoneSnapshot(),
                found = new List<string>(RealmCityState.FoundIds),
                officerCityIds = officerCityIds,
                officerCityCities = officerCityCities,
                cities = cities,
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
            if (data == null || data.version != SaveVersion) return false;

            var cities = new List<RealmCityState.CitySnapshot>();
            if (data.cities != null)
            {
                foreach (var c in data.cities)
                {
                    cities.Add(new RealmCityState.CitySnapshot
                    {
                        CityId = c.cityId, Agri = c.agri, Comm = c.comm, Tech = c.tech, Sec = c.sec,
                        Wall = c.wall, Train = c.train, Ships = c.ships, Pop = c.pop, Troops = c.troops, Food = c.food,
                    });
                }
            }

            RealmCityState.Restore(data.gold, data.year, data.month, data.currentCity,
                data.roster, data.done, data.found, data.officerCityIds, data.officerCityCities, cities);
            return true;
        }

        private static List<string> BuildDoneSnapshot()
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
