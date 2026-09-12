using UnityEngine;
using UnityEngine.UI;
using Saga.Dungeon.Data;
using Saga.Dungeon.World;

namespace Saga.Dungeon.UI
{
    /// <summary>
    /// VERTICAL_SLICE_DUNGEON.md 완료 조건 "공격력이 올랐다는 걸 화면에서
    /// 확인한다" — GO의 UI/PlayerHud.cs와 같은 결(항상 보이는 최소 상태
    /// 표시줄, 릴리즈 빌드에서도 항상 보임).
    /// </summary>
    public class PlayerHud : MonoBehaviour
    {
        [SerializeField] private Text label;

        // "HUD 개선" 슬라이스(PLAN.md 26장) — 숫자 텍스트뿐이던 체력 표시에
        // 시각적 게이지를 더한다. Image.Type.Filled(Horizontal)라 값만
        // 매 프레임 바꾸면 돼 텍스트 갱신과 같은 타이머를 그대로 쓴다.
        [SerializeField] private Image healthBarFill;

        private const float RefreshGapSec = 0.5f;
        private float _timer;

        private void Start()
        {
            Refresh();
        }

        private void Update()
        {
            _timer += Time.unscaledDeltaTime;
            if (_timer < RefreshGapSec) return;
            _timer = 0f;
            Refresh();
        }

        private void Refresh()
        {
            if (label == null) return;
            string weapon = HeroState.EquippedWeapon?.Name ?? "맨손";
            // "절차적 층 진행" 슬라이스 — ProcRoom에 아직 안 닿았으면(Room1~4,
            // 개념상 "층1") DungeonFloorRunner.Instance가 null이라 1로 대신함.
            int floor = DungeonFloorRunner.Instance?.CurrentFloor ?? 1;
            label.text = $"Lv.{HeroState.Level}  체력 {HeroState.Hp}/{HeroState.HpMax}  " +
                         $"(경험치 {HeroState.Exp}/{HeroState.ExpToNext})  돈 {HeroState.Gold}냥\n" +
                         $"{weapon} (공격력 {HeroState.Atk:0})  🕳️ 지하 {floor}층\n" +
                         $"{QuestState.ObjectiveText}"; // "퀘스트 시스템" 슬라이스

            if (healthBarFill != null)
            {
                healthBarFill.fillAmount = HeroState.HpMax > 0 ? (float)HeroState.Hp / HeroState.HpMax : 0f;
            }
        }
    }
}
