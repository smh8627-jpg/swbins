using UnityEngine;
using Saga.Go.Data;

namespace Saga.Go.Combat
{
    /// <summary>
    /// PLAN.md 107-1 "무대 전환 없음" — 들판 적 무리 여섯 곳 + 107 ⑤ 원소 쓰는 적 무리 셋을 Play 시작 때 세운다(편집기에선 모델만 받아 둔다 —
    /// 적은 체력·상태를 가진 런타임 존재라 씬에 굳히지 않는다). 자리는 사건 칸(마을·상인·촌장·도적·
    /// 희귀 늑대·채집·산신당·사당 시련·봉수대·돌탑·유물·보물)을 피한 숲·공터, 마을 스폰에서 두 칸 넘게.
    /// </summary>
    public class FieldSpawner : MonoBehaviour
    {
        private struct Group
        {
            public string Id;
            public float Gx, Gy;
            public FieldEnemy.Kind[] Members;
        }

        private static readonly FieldEnemy.Kind B = FieldEnemy.Kind.Bandit;
        private static readonly FieldEnemy.Kind S = FieldEnemy.Kind.Skeleton;
        private static readonly FieldEnemy.Kind F = FieldEnemy.Kind.EmberImp;
        private static readonly FieldEnemy.Kind W = FieldEnemy.Kind.DrownedGhost;
        private static readonly FieldEnemy.Kind T = FieldEnemy.Kind.StormWraith;

        private static readonly Group[] Groups =
        {
            new Group { Id = "east_grove_n", Gx = 6.9f, Gy = 2.0f, Members = new[] { B, B, B } },
            new Group { Id = "east_grove_s", Gx = 6.8f, Gy = 4.1f, Members = new[] { S, S } },
            new Group { Id = "north_wood",   Gx = 1.5f, Gy = 1.1f, Members = new[] { S, S, S } },
            new Group { Id = "south_glade_w", Gx = 1.6f, Gy = 7.0f, Members = new[] { B, B, S } },
            new Group { Id = "south_glade_e", Gx = 5.0f, Gy = 7.1f, Members = new[] { S, S } },
            new Group { Id = "farm_edge",    Gx = 1.6f, Gy = 9.0f, Members = new[] { B, B } },
            // 107 ⑤ 원소 쓰는 적 — 무리 셋 여덟(보물 상자·역참·사건 칸을 비켜 섰다)
            new Group { Id = "spirit_grove", Gx = 5.5f, Gy = 2.2f, Members = new[] { W, W } },
            new Group { Id = "spirit_west",  Gx = 0.2f, Gy = 4.0f, Members = new[] { T, T, W } },
            new Group { Id = "spirit_farm",  Gx = 5.3f, Gy = 9.0f, Members = new[] { F, F, T } },
        };

        public const float GroupSpread = 4.5f;

        // 107-7 망루 수호장 — 옛 망루(4,6) 고원 남쪽 발치, 남쪽 공터 북쪽 가장자리(역참·돌탑·두 무리를 비켜 섰다).
        public const float GuardianGx = 3.6f;
        public const float GuardianGy = 6.75f;
        public const string GuardianGroupId = "tower_guardian";

        [SerializeField] private GameObject banditModel;
        [SerializeField] private GameObject skeletonModel;
        [SerializeField] private GameObject guardianModel;

        /// <summary>세우는 들판 적 수 — 이미 쓰러뜨린 수호장은 안 센다.</summary>
        public static int PlannedCount
        {
            get
            {
                int n = GuardianState.Defeated ? 0 : 1;
                foreach (var g in Groups) n += g.Members.Length;
                return n;
            }
        }

        public static int GroupCount => Groups.Length;

        /// <summary>107-8 지역 사명 — 무리 한가운데가 선 지역. 모르는 id(수호장 포함)는 null.</summary>
        public static string GroupRegion(string groupId)
        {
            foreach (var g in Groups) if (g.Id == groupId) return GoWorldMap.RegionAt(TestMapData.WorldPos(g.Gx, g.Gy));
            return null;
        }

        /// <summary>그 무리 적이 한꺼번에 모두 쓰러져 있나(하나라도 서 있으면 false, 그 무리 적이 없어도 false).</summary>
        public static bool GroupWiped(string groupId)
        {
            int n = 0;
            foreach (var e in FieldEnemy.All)
            {
                if (e.GroupId != groupId) continue;
                if (e.Alive) return false;
                n++;
            }
            return n > 0;
        }

        private void Start()
        {
            if (FieldEnemy.All.Count > 0) return;
            foreach (var g in Groups)
            {
                Vector3 center = TestMapData.WorldPos(g.Gx, g.Gy);
                for (int i = 0; i < g.Members.Length; i++)
                {
                    float a = i * Mathf.PI * 2f / g.Members.Length + g.Gx;
                    Vector3 home = center + new Vector3(Mathf.Cos(a), 0f, Mathf.Sin(a)) * GroupSpread;
                    var kind = g.Members[i];
                    // 원소 쓰는 적은 해골 모델에 원소 빛깔을 입힌다("원소 깃든 망자", 사실적 PBR 트랙이라 코드 도형 대신)
                    FieldEnemy.Spawn(kind, home, kind == FieldEnemy.Kind.Bandit ? banditModel : skeletonModel, g.Id, transform);
                }
            }
            if (!GuardianState.Defeated)
            {
                FieldEnemy.Spawn(FieldEnemy.Kind.Guardian, TestMapData.WorldPos(GuardianGx, GuardianGy),
                    guardianModel != null ? guardianModel : banditModel, GuardianGroupId, transform);
            }
        }
    }
}
