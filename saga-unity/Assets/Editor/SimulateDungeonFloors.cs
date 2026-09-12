using System;
using UnityEditor;
using UnityEngine;
using Saga.Dungeon.Data;

namespace Saga.EditorTools
{
    /// <summary>
    /// "DUNGEON 오픈월드 확장 — 절차적 층 진행" 슬라이스 — 사용자가 "100층까지
    /// 진행해줘"로 요청했는데, 실제로 100층까지 사람이 걸어서(또는 헤드리스
    /// Play 모드로) 확인하는 건 비현실적이다(방 수백 개를 실시간으로 클리어
    /// 해야 함). 대신 `DungeonFloorRunner`가 쓰는 것과 같은 순수 공식
    /// (`Data/DungeonFormulas.cs`, UnityEngine 의존 없음)을 씬 없이 그대로
    /// 돌려 100층까지 예외·NaN·오버플로 없이 계산되는지만 검증한다 —
    /// `PlaytestDungeonHeadless`(Play 모드 10프레임 확인)와 역할이 다르다:
    /// 이쪽은 "층 진행 수식 자체가 100층까지 안전한가"만 본다.
    /// </summary>
    public static class SimulateDungeonFloors
    {
        [MenuItem("Saga/Simulate Dungeon Floors (to 100)")]
        public static void Run()
        {
            const int targetFloor = 100;
            var rng = new System.Random(20260824); // DungeonFloorRunner와 같은 시드 관례

            int totalRoomsVisited = 0;
            for (int floor = 2; floor <= targetFloor; floor++)
            {
                int roomTotal = DungeonFormulas.RoomsFor(floor);
                bool bossFloor = DungeonFormulas.IsBossFloor(floor);

                for (int roomIndex = 0; roomIndex < roomTotal; roomIndex++)
                {
                    totalRoomsVisited++;
                    bool isLast = roomIndex >= roomTotal - 1;
                    bool isBoss = bossFloor && isLast;

                    float hp = DungeonFormulas.EnemyHp(floor, isBoss);
                    float dmg = DungeonFormulas.EnemyDmg(floor, isBoss);
                    int exp = DungeonFormulas.RewardExp(floor, isBoss);
                    int gold = DungeonFormulas.RewardGold(floor, isBoss);
                    float eliteHp = DungeonFormulas.EliteHp(floor);
                    float eliteDmg = DungeonFormulas.EliteDmg(floor);

                    if (float.IsNaN(hp) || float.IsInfinity(hp) || hp <= 0f)
                        throw new Exception($"[SimulateDungeonFloors] FAIL — floor {floor} room {roomIndex}: hp={hp}");
                    if (float.IsNaN(dmg) || float.IsInfinity(dmg) || dmg <= 0f)
                        throw new Exception($"[SimulateDungeonFloors] FAIL — floor {floor} room {roomIndex}: dmg={dmg}");
                    if (float.IsNaN(eliteHp) || float.IsInfinity(eliteHp))
                        throw new Exception($"[SimulateDungeonFloors] FAIL — floor {floor} room {roomIndex}: eliteHp={eliteHp}");
                    if (exp <= 0 || gold < 0)
                        throw new Exception($"[SimulateDungeonFloors] FAIL — floor {floor} room {roomIndex}: exp={exp} gold={gold}");

                    if (!isLast)
                    {
                        var kinds = DungeonFormulas.PickDoorKinds(rng);
                        if (kinds.Count < 2)
                            throw new Exception($"[SimulateDungeonFloors] FAIL — floor {floor} room {roomIndex}: 문이 {kinds.Count}개뿐");
                    }
                }

                if (floor == 2 || floor == 10 || floor == 25 || floor == 50 || floor == 75 || floor == 100)
                {
                    Debug.Log($"[SimulateDungeonFloors] 층{floor} — 방{roomTotal}개, 보스층={bossFloor}, " +
                        $"일반hp={DungeonFormulas.EnemyHp(floor, false):F0} 두목hp={DungeonFormulas.EnemyHp(floor, true):F0}");
                }
            }

            Debug.Log($"[SimulateDungeonFloors] OK - 2층~{targetFloor}층 전부 통과, 방 {totalRoomsVisited}개 방문, 예외·NaN 없음");
        }
    }
}
