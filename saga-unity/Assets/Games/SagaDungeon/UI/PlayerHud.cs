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
            string weapon = HeroState.EquippedWeapon?.Name ?? DungeonLocalization.T("item.bare_hands");
            // "절차적 층 진행" 슬라이스 — ProcRoom에 아직 안 닿았으면(Room1~4,
            // 개념상 "층1") DungeonFloorRunner.Instance가 null이라 1로 대신함.
            int floor = DungeonFloorRunner.Instance?.CurrentFloor ?? 1;
            string hp = string.Format(DungeonLocalization.T("hud.hp"), HeroState.Hp, HeroState.HpMax);
            string exp = string.Format(DungeonLocalization.T("hud.exp"), HeroState.Exp, HeroState.ExpToNext);
            string gold = string.Format(DungeonLocalization.T("hud.gold"), HeroState.Gold);
            string atk = string.Format(DungeonLocalization.T("hud.atk"), HeroState.Atk);
            string floorLine = string.Format(DungeonLocalization.T("hud.floor"), floor);
            label.text = $"Lv.{HeroState.Level}  {hp}  ({exp})  {gold}\n" +
                         $"{weapon} ({atk})  {floorLine}\n" +
                         $"{QuestState.ObjectiveText}"; // "퀘스트 시스템" 슬라이스

            // PLAN.md 101-2 5.4 "월드 보스" — 75초 두목전이 진행 중일 때만 카운트다운을 얹는다.
            var worldBoss = DungeonEnemy.ActiveWorldBoss;
            if (worldBoss != null)
            {
                string timer = string.Format(DungeonLocalization.T("hud.worldboss_timer", "⏱ 두목전 — {0:0}초"),
                    Mathf.Max(0f, worldBoss.WorldBossTimeLeft));
                label.text += $"\n{timer}";
            }

            if (healthBarFill != null)
            {
                healthBarFill.fillAmount = HeroState.HpMax > 0 ? (float)HeroState.Hp / HeroState.HpMax : 0f;
            }
        }
    }
}
