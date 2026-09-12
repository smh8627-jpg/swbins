using UnityEngine;

namespace Saga.Dungeon.World
{
    /// <summary>
    /// VERTICAL_SLICE_DUNGEON.md 다음 슬라이스 "부대(다중 영웅) 시스템" —
    /// saga-dungeon 웹판 `js/hero.js`의 `partyPower()`(동행 전원의
    /// might*0.7+wisdom*0.3=atk, command*0.6+wisdom*0.2=def를 합산)는
    /// 다중 영웅 등용·성장·장비까지 갖춘 완전한 부대 시스템을 요구해
    /// 이번 슬라이스 범위 밖(VERTICAL_SLICE_DUNGEON.md "제외" 참고,
    /// `HeroState.cs`도 같은 이유로 단일 캐릭터로 남겨 뒀다). **부대의
    /// 핵심 가치("혼자가 아니라 여럿이 함께 싸운다")만 가장 작은 단위로
    /// 보여준다** — 등용·성장 없이 처음부터 함께 있는 동행 하나가
    /// 플레이어를 따라다니며 스스로 싸운다. 죽지 않는다(체력·죽음 처리는
    /// 다음 슬라이스 몫 — 이번엔 "화력이 늘어난다"는 것만 증명).
    /// 스탯은 `partyPower()` 공식 그대로(might=24·wisdom=12·command=18
    /// → atk=24×0.7+12×0.3=20.4) 옮기되, 등용 대상이 없어 임의로 잡은
    /// 가상의 동행("동행 무사", 원작 상표 없음).
    /// </summary>
    public class AllyFighter : MonoBehaviour
    {
        private const float FollowDistance = 3f;
        private const float FollowSpeed = 6f; // PlayerController.WalkSpeed와 같음 — 플레이어를 놓치지 않게

        private const float EngageRadius = 8f; // DungeonEnemy.AggroRadius 기본값과 같음 — 이 거리 안 적을 알아서 맞선다
        private const float AttackRange = 2.3f;
        private const float ChaseSpeed = 5f;
        private const float AttackInterval = 0.55f; // js/dungeon.js BASE_ATK_CD, PlayerCombat.cs와 같음

        // partyPower() 공식(atk = might*0.7 + wisdom*0.3) 그대로 —
        // 동행 stats: might=24, wisdom=12, command=18(방어 기여는 이번
        // 슬라이스에 안 씀, 동행이 안 죽어 체력 계산이 필요 없다).
        private const float Atk = 24f * 0.7f + 12f * 0.3f; // 20.4
        private static float HitDamage => Mathf.Max(4f, Atk / 6f); // dungeon.js atkOf()와 같은 공식

        private static readonly Color BodyColor = new Color(0.3f, 0.45f, 0.7f); // 동행 — 청색 갑주

        private Transform _player;
        private float _attackCooldown;

        private void Awake()
        {
            if (transform.childCount == 0) BuildVisual();
            var playerGo = GameObject.FindWithTag("Player");
            _player = playerGo != null ? playerGo.transform : null;
        }

        private void BuildVisual()
        {
            var visual = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            visual.name = "Visual";
            visual.transform.SetParent(transform, false);
            visual.transform.localScale = new Vector3(0.85f, 0.85f, 0.85f); // 플레이어보다 살짝 작게
            visual.transform.localPosition = new Vector3(0f, 0.85f, 0f);

            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "AllyFighter (generated)" };
            mat.color = BodyColor;
            visual.GetComponent<MeshRenderer>().sharedMaterial = mat;
        }

        private void Update()
        {
            if (_player == null) return;
            if (_attackCooldown > 0f) _attackCooldown -= Time.deltaTime;

            var target = DungeonEnemy.FindNearest(transform.position, EngageRadius);
            if (target != null)
            {
                float dist = Vector3.Distance(transform.position, target.transform.position);
                FaceTowards(target.transform.position);

                if (dist <= AttackRange)
                {
                    if (_attackCooldown <= 0f)
                    {
                        _attackCooldown = AttackInterval;
                        target.TakeDamage(HitDamage);
                    }
                }
                else
                {
                    Vector3 dir = target.transform.position - transform.position;
                    dir.y = 0f;
                    transform.position += dir.normalized * ChaseSpeed * Time.deltaTime;
                }
                return; // 싸우는 동안엔 플레이어를 안 쫓는다.
            }

            FollowPlayer();
        }

        private void FollowPlayer()
        {
            Vector3 toPlayer = _player.position - transform.position;
            toPlayer.y = 0f;
            float dist = toPlayer.magnitude;
            if (dist <= FollowDistance) return;

            Vector3 dir = toPlayer.normalized;
            transform.position += dir * FollowSpeed * Time.deltaTime;
            FaceTowards(_player.position);
        }

        private void FaceTowards(Vector3 worldPos)
        {
            Vector3 dir = worldPos - transform.position;
            dir.y = 0f;
            if (dir.sqrMagnitude > 0.0001f)
            {
                transform.rotation = Quaternion.LookRotation(dir.normalized);
            }
        }
    }
}
