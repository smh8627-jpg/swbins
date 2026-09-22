using UnityEngine;
using UnityEngine.UI;
using Saga.Story.Data;
using Saga.Story.Player;

namespace Saga.Story.UI
{
    /// <summary>
    /// PLAN.md 101-2 STORY 5-2 1단계 — 모바일 무예 칸 버튼 하나. 칸에 놓이는 무예가
    /// 찍을 때마다 바뀌어(`StorySkillState.SlotSkill`, 자동 배치) 글자를 고정할 수 없어서
    /// `LocalizedButtonLabel` 대신 이 컴포넌트가 이름을 그리고, 비었거나 쿨다운 중이면
    /// 어둡게 한다. `StoryHud`와 같은 폴링(0.1초).
    /// </summary>
    public class StorySkillSlotButton : MonoBehaviour
    {
        [SerializeField] private int slot;
        [SerializeField] private StoryPlayerController controller;
        [SerializeField] private Text label;
        [SerializeField] private Image image;
        [SerializeField] private Color readyColor = new Color(0.45f, 0.3f, 0.6f, 0.55f);

        private const float RefreshGapSec = 0.1f;
        private float _timer;

        public void Init(int slotIndex, StoryPlayerController owner, Text text, Image img, Color color)
        {
            slot = slotIndex;
            controller = owner;
            label = text;
            image = img;
            readyColor = color;
        }

        public void Click()
        {
            if (controller != null) controller.TriggerJobSkill(slot);
        }

        private void Update()
        {
            _timer += Time.unscaledDeltaTime;
            if (_timer < RefreshGapSec) return;
            _timer = 0f;
            Refresh();
        }

        public void Refresh()
        {
            if (label == null) return;
            var sk = StorySkillState.SlotSkill(slot);
            if (sk == null)
            {
                label.text = "—";
                if (image != null) image.color = new Color(1f, 1f, 1f, 0.08f);
                return;
            }
            string name = StoryLocalization.T($"skill.{sk.Key}", sk.Name);
            int paren = name.IndexOf('(');
            if (paren > 0) name = name.Substring(0, paren); // 버튼엔 한자 괄호를 뺀 짧은 이름.
            float cd = controller != null ? controller.JobSkillCooldownLeft(sk.Key) : 0f;
            label.text = cd > 0f ? $"{name}\n{cd:0.0}" : name;
            if (image != null)
            {
                var c = readyColor;
                if (cd > 0f || StoryCombat.Mp < sk.Cost) c.a *= 0.4f;
                image.color = c;
            }
        }
    }
}
