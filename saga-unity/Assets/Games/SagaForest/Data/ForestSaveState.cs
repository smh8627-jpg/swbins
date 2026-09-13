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
        private const int SaveVersion = 4; // v4 — 가구 "자유 배치"로 재설계, homeAnchors(고정 여섯)를 homePlaceX/Y/Ids(격자 칸)로 교체.

        private static string SavePath => Path.Combine(Application.persistentDataPath, "save_forest.json");

        [Serializable]
        private class SaveData
        {
            public int version;
            public float[] playerPos;
            public int fruitCount;
            public string[] homeStockKeys;
            public int[] homeStockCounts;
            public int[] homePlaceX;
            public int[] homePlaceY;
            public string[] homePlaceIds;
            public string[] homeWalls;
            public string[] homeFloors;
            public string homeCurWall;
            public string homeCurFloor;
        }

        /// <summary>Playtest*.cs 전용 — GameBootstrap이 매 Play 시작마다
        /// TryLoad()를 불러, 이전 헤드리스 실행이 남긴 세이브 파일을 그대로
        /// 읽어 버린다(persistentDataPath는 Unity 프로세스가 바뀌어도
        /// 디스크에 그대로 남는다 — saga-unity REALM 쪽 `RealmSaveState
        /// .DeleteForTest()`가 2026-09-13에 먼저 겪고 고친 것과 같은 함정,
        /// FOREST "벽지/장판" 조각 검증 중 실제로 재현했다:
        /// PlaytestForestFinish가 저장한 세이브를 PlaytestForestFurniture가
        /// 그대로 불러와 "가구를 다 치우면 점수 0" 전제가 깨졌다). 실제
        /// 게임 코드 경로에선 안 쓴다.</summary>
        public static void DeleteForTest()
        {
            try { if (File.Exists(SavePath)) File.Delete(SavePath); }
            catch (Exception e) { Debug.LogWarning($"[ForestSaveState] 테스트용 세이브 삭제 실패: {e.Message}"); }
        }

        public static bool Save()
        {
            Transform player = FindPlayer();
            if (player == null) return false;

            var (stockKeys, stockCounts) = ForestHomeState.SnapshotStock();
            var finishes = ForestHomeState.SnapshotFinishes();
            var (placeX, placeY, placeIds) = ForestHomeState.SnapshotPlacements();
            var data = new SaveData
            {
                version = SaveVersion,
                playerPos = new[] { player.position.x, player.position.y, player.position.z },
                fruitCount = ForestState.FruitCount,
                homeStockKeys = stockKeys,
                homeStockCounts = stockCounts,
                homePlaceX = placeX,
                homePlaceY = placeY,
                homePlaceIds = placeIds,
                homeWalls = finishes.Walls,
                homeFloors = finishes.Floors,
                homeCurWall = finishes.CurWall,
                homeCurFloor = finishes.CurFloor,
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
            if (data.version >= 2)
            {
                ForestHomeState.RestoreStock(data.homeStockKeys, data.homeStockCounts);
            }
            if (data.version >= 3)
            {
                ForestHomeState.RestoreFinishes(data.homeWalls, data.homeFloors, data.homeCurWall, data.homeCurFloor);
            }
            if (data.version >= 4)
            {
                // v3 이하 세이브는 옛 고정 자리(homeAnchors) 데이터를 그냥
                // 잃는다 — REALM 세이브 버전 올림과 같은 관례(첫 슬라이스
                // 스키마 변경엔 마이그레이션 경로를 안 만든다, PLAN.md 28장).
                ForestHomeState.RestorePlacements(data.homePlaceX, data.homePlaceY, data.homePlaceIds);
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
