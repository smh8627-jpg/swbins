using UnityEngine;
using Saga.Go.Data;

namespace Saga.Go.Combat
{
    /// <summary>
    /// PLAN.md 107-1 "무대 전환 없음" — 들판 적 무리 여섯 곳을 Play 시작 때 세운다(편집기에선 모델만 받아 둔다 —
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

        private static readonly Group[] Groups =
        {
            new Group { Id = "east_grove_n", Gx = 6.9f, Gy = 2.0f, Members = new[] { B, B, B } },
            new Group { Id = "east_grove_s", Gx = 6.8f, Gy = 4.1f, Members = new[] { S, S } },
            new Group { Id = "north_wood",   Gx = 1.5f, Gy = 1.1f, Members = new[] { S, S, S } },
            new Group { Id = "south_glade_w", Gx = 1.6f, Gy = 7.0f, Members = new[] { B, B, S } },
            new Group { Id = "south_glade_e", Gx = 5.0f, Gy = 7.1f, Members = new[] { S, S } },
            new Group { Id = "farm_edge",    Gx = 1.6f, Gy = 9.0f, Members = new[] { B, B } },
        };

        public const float GroupSpread = 4.5f;

        [SerializeField] private GameObject banditModel;
        [SerializeField] private GameObject skeletonModel;

        public static int PlannedCount
        {
            get
            {
                int n = 0;
                foreach (var g in Groups) n += g.Members.Length;
                return n;
            }
        }

        public static int GroupCount => Groups.Length;

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
                    FieldEnemy.Spawn(kind, home, kind == FieldEnemy.Kind.Bandit ? banditModel : skeletonModel, g.Id, transform);
                }
            }
        }
    }
}
