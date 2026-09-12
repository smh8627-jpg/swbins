using System.Collections.Generic;
using UnityEngine;
using Saga.Story.Data;

namespace Saga.Story.World
{
    /// <summary>
    /// "STORY 콘텐츠 확장"(2026-09-12) — 무예 기탄(氣彈, data-job.js bolt).
    /// `js/side.js` castSkill()의 `effect==='bolt'` 처리(관통, 여러 적을
    /// 한 번씩만 때린다)를 옮겼다. 적은 이 슬라이스에서 전부 제자리에
    /// 서 있으므로(`StoryEnemy.cs` 클래스 주석) 충돌은 X거리 문턱 하나로
    /// 충분하다 — DUNGEON류 물리 콜라이더 투사체 대신 가장 단순한 형태.
    /// </summary>
    public class StoryBolt : MonoBehaviour
    {
        private const float HitRadius = 0.6f;

        private float _dir;
        private float _atk;
        private float _mul;
        private float _timer;
        private readonly HashSet<StoryEnemy> _alreadyHit = new HashSet<StoryEnemy>();

        public void Configure(float dir, float atk, float mul)
        {
            _dir = dir;
            _atk = atk;
            _mul = mul;

            var visual = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            visual.name = "Visual";
            visual.transform.SetParent(transform, false);
            visual.transform.localScale = Vector3.one * 0.35f;
            Destroy(visual.GetComponent<Collider>());
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "StoryBolt (generated)" };
            mat.color = new Color(0.35f, 0.65f, 0.95f); // data-job.js bolt emoji 💠 — 청백색
            visual.GetComponent<MeshRenderer>().sharedMaterial = mat;
        }

        private void Update()
        {
            _timer += Time.deltaTime;
            if (_timer > StoryCombat.BoltLife)
            {
                Destroy(gameObject);
                return;
            }

            transform.position += new Vector3(_dir * StoryCombat.BoltSpeed * Time.deltaTime, 0f, 0f);

            foreach (var enemy in StoryEnemy.All)
            {
                if (enemy == null || enemy.IsDead || _alreadyHit.Contains(enemy)) continue;
                if (Mathf.Abs(enemy.transform.position.x - transform.position.x) > HitRadius) continue;

                _alreadyHit.Add(enemy);
                var (dmg, crit) = StoryCombat.RollDamage(_atk, _mul);
                enemy.TakeDamage(dmg);
                if (crit) StoryCombat.TriggerHitstop(this);
            }
        }
    }
}
