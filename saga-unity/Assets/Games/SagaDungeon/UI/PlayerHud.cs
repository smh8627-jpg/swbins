using UnityEngine;
using UnityEngine.UI;
using Saga.Dungeon.Data;

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
            label.text = $"Lv.{HeroState.Level}  체력 {HeroState.Hp}/{HeroState.HpMax}  " +
                         $"(경험치 {HeroState.Exp}/{HeroState.ExpToNext})  돈 {HeroState.Gold}냥\n" +
                         $"{weapon} (공격력 {HeroState.Atk:0})";
        }
    }
}
