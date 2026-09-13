using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Saga.Realm.Data
{
    /// <summary>
    /// VERTICAL_SLICE_REALM.md 5절 "저장한다 → 다시 켜서 이어진다" —
    /// 여러 성 확장(2-4절 참고, 개념만) 이후로는 성마다의 아홉 필드도
    /// 함께 저장한다. 3절(전쟁) 이후로는 소패 상태(성벽·병력·함락 여부)도
    /// 같이 저장 — 병력·성벽이 두 번의 공격에 걸쳐 이어지려면 필요하다.
    /// `SaveVersion`을 2→3으로 올렸다(구조가 달라 옛 버전 세이브는 자동
    /// 무시되고 새 게임으로 시작한다 — PLAN.md 28장 "Version 필드" 대비
    /// 그대로, 첫 슬라이스라 마이그레이션 경로를 따로 안 만든다).
    /// </summary>
    public static class RealmSaveState
    {
        private const int SaveVersion = 3;

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
            public int xiaopeiWall, xiaopeiMaxWall, xiaopeiTroops, xiaopeiTrain, xiaopeiTech;
            public bool xiaopeiCaptured;
            // REALM 다음 조각 (3) 문답 — 세이브 버전은 안 올렸다(JsonUtility는
            // 없는 필드를 기본값/null로 채워 읽으니, 옛 v3 세이브를 불러와도
            // RealmQuizState.Restore(null,...)이 그냥 빈 상태로 시작할 뿐 깨지지
            // 않는다).
            public List<string> quizLearned;
            public List<string> quizWrongIds;
            public List<int> quizWrongCounts;
            public int quizTotal, quizCorrect, quizStreak, quizBestStreak;
        }

        /// <summary>PlaytestRealmSlice.cs 전용 — GameBootstrap.Awake()가
        /// 매 Play 시작마다 TryLoad()를 부르기 때문에, 이전 헤드리스
        /// 실행이 남긴 세이브 파일이 있으면 "새 게임 시작 상태"를 전제로
        /// 하는 테스트의 Init 단계가 깨진다(2026-09-13 계략 슬라이스
        /// 추가 중 실제로 겪음 — persistentDataPath는 Unity 프로세스가
        /// 바뀌어도 그대로 남는다). 실제 게임 코드 경로에선 안 쓴다.</summary>
        public static void DeleteForTest()
        {
            try { if (File.Exists(SavePath)) File.Delete(SavePath); }
            catch (Exception e) { Debug.LogWarning($"[RealmSaveState] 테스트용 세이브 삭제 실패: {e.Message}"); }
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

            var xiaopei = RealmWarState.Snapshot();

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
                xiaopeiWall = xiaopei.wall,
                xiaopeiMaxWall = xiaopei.maxWall,
                xiaopeiTroops = xiaopei.troops,
                xiaopeiTrain = xiaopei.train,
                xiaopeiTech = xiaopei.tech,
                xiaopeiCaptured = xiaopei.captured,
                quizLearned = RealmQuizState.SnapshotLearned(),
                quizWrongIds = RealmQuizState.SnapshotWrongIds(),
                quizWrongCounts = RealmQuizState.SnapshotWrongCounts(),
                quizTotal = RealmQuizState.GetProgress().Answered,
                quizCorrect = RealmQuizState.GetProgress().Correct,
                quizStreak = RealmQuizState.GetProgress().Streak,
                quizBestStreak = RealmQuizState.GetProgress().BestStreak,
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
            RealmWarState.Restore(data.xiaopeiWall, data.xiaopeiMaxWall, data.xiaopeiTroops,
                data.xiaopeiTrain, data.xiaopeiTech, data.xiaopeiCaptured);
            RealmQuizState.Restore(data.quizLearned, data.quizWrongIds, data.quizWrongCounts,
                data.quizTotal, data.quizCorrect, data.quizStreak, data.quizBestStreak);
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
