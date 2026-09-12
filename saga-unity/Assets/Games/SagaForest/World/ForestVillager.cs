using UnityEngine;
using Saga.Forest.UI;

namespace Saga.Forest.World
{
    /// <summary>
    /// VERTICAL_SLICE_FOREST.md(saga-godot) 4절 "결정 — 포함: 주민 1명
    /// (NPCS 중 하나, 이름 그대로) + 말 걸기(대사만 — 부탁/선물/편지는
    /// 제외)". `js/data-village.js`의 `NPCS.keeper`(숲지기)를 그대로
    /// 썼다 — 역할 이름이지 실존 인물이 아니라 루트 CLAUDE.md 이름
    /// 정책과 무관(같은 문서 4절 "참고" 항목). 대사는 원작 그대로:
    /// "이 숲은 내가 돌본다 — 짐승을 함부로 놀라게 하지 마시게".
    /// 다가갈 때마다 매 프레임 토스트가 스팸되지 않게 짧은 쿨다운만
    /// 얹었다(DUNGEON `DungeonMerchant.cs`의 거절 쿨다운과 같은 결).
    /// </summary>
    public class ForestVillager : MonoBehaviour
    {
        private const string DisplayName = "숲지기";
        private const string Line = "이 숲은 내가 돌본다 — 짐승을 함부로 놀라게 하지 마시게.";
        private const float TalkRadius = 2.5f;
        private const float RetalkCooldownSec = 4f;
        private const float ToastSec = 4f;

        [SerializeField] private GameObject modelPrefab; // BuildTestVillageForestScene.cs가 채운다.

        private float _cooldownLeft;
        private Transform _player;

        private void Awake()
        {
            if (transform.childCount == 0) BuildVisual();
            var playerGo = GameObject.FindWithTag("Player");
            _player = playerGo != null ? playerGo.transform : null;
        }

        private void BuildVisual()
        {
            if (modelPrefab != null)
            {
                CharacterVisual.Spawn(modelPrefab, transform, 1.8f, Color.white);
            }
            else
            {
                CharacterVisual.SpawnFallbackCapsule(transform, 1.8f, new Color(0.3f, 0.55f, 0.35f));
            }
        }

        private void Update()
        {
            if (_cooldownLeft > 0f) _cooldownLeft -= Time.deltaTime;
            if (_player == null || _cooldownLeft > 0f) return;
            if (Vector3.Distance(transform.position, _player.position) > TalkRadius) return;

            _cooldownLeft = RetalkCooldownSec;
            DialogueLabel.Instance?.Show($"{DisplayName} — \"{Line}\"", ToastSec);
        }
    }
}
