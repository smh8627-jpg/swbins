using UnityEngine;
using Saga.Go.UI;

namespace Saga.Go.World
{
    /// <summary>
    /// 주민 하나의 말 걸기 판정. saga-godot npc_builder.gd _on_body_entered와
    /// 같은 규칙 — 플레이어가 TalkArea(구 트리거)에 들어오면 쿨다운을 두고
    /// 한 줄을 띄운다. 조우 판정(전투 등)에는 손대지 않는다.
    /// </summary>
    public class VillagerTalk : MonoBehaviour
    {
        private const float TalkGapSec = 45f;
        private const float LineShowSec = 4f;

        private string _npcName;
        private string _line;
        private float _lastSaidTime = -TalkGapSec;

        public void Init(string npcName, string line)
        {
            _npcName = npcName;
            _line = line;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!other.CompareTag("Player")) return;
            if (Time.time - _lastSaidTime < TalkGapSec) return;

            _lastSaidTime = Time.time;
            DialogueLabel.Instance?.Show($"{_npcName} — {_line}", LineShowSec);
        }
    }
}
