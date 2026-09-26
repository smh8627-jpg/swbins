using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Saga.Go.Data;

namespace Saga.Go.UI
{
    /// <summary>
    /// PLAN.md 101-2 ⑦ "승급 3택" — 레벨업마다 <see cref="PerkState.RollChoice"/>가
    /// 뽑은 카드 3장(세로)을 보여주고 고르거나 거절하게 한다. SagaStory의
    /// `StoryJobChoiceUi.cs`와 같은 결(자기 캔버스를 스스로 짓는 단일 컴포넌트)
    /// 이되, 이 판은 이미 <see cref="EncounterUiKit"/>이 캔버스/패널/텍스트/버튼
    /// 공용 부품으로 뽑혀 있어(BanditEncounter·RareWolfEncounter 둘이 쓰던 걸
    /// 분리한 것) 그대로 재사용한다 — 새 kit를 또 만들지 않는다.
    /// </summary>
    public class PerkChoiceUi : MonoBehaviour
    {
        [SerializeField] private GameObject _panel;
        [SerializeField] private TextMeshProUGUI _titleLabel;
        [SerializeField] private TextMeshProUGUI[] _cardLabels = new TextMeshProUGUI[3];
        [SerializeField] private Button[] _cardButtons = new Button[3];
        [SerializeField] private TextMeshProUGUI _rejectLabel;

        private PerkState.PerkDef[] _offer = System.Array.Empty<PerkState.PerkDef>();
        private System.Action<PerkState.PerkDef> _onChosen;
        private System.Action _onRejected;

        public bool IsShowing => _panel != null && _panel.activeSelf;

        private static readonly string[] AxisLabel = { "공(攻)", "수(守)", "보(補)" };

        public void Build()
        {
            var canvas = EncounterUiKit.NewCanvas("PerkChoiceUI");
            canvas.transform.SetParent(transform, false);

            _panel = EncounterUiKit.NewPanel(canvas.transform, new Vector2(0.5f, 0.5f), new Vector2(700f, 760f),
                new Color(0f, 0f, 0f, 0.85f));
            _panel.SetActive(false);

            _titleLabel = EncounterUiKit.NewText(_panel.transform, GoLocalization.T("perk.title", "승급! 특성을 하나 고르세요"),
                new Vector2(0.5f, 1f), new Vector2(0f, -60f), new Vector2(620f, 90f), 28);

            float y = -190f;
            for (int i = 0; i < _cardButtons.Length; i++)
            {
                _cardButtons[i] = EncounterUiKit.NewButton(_panel.transform, "", new Vector2(0.5f, 1f),
                    new Vector2(0f, y), new Vector2(600f, 140f), null);
                // 영속 리스너(인자 int) — 람다는 씬 저장 때 사라진다(SagaCore/ButtonWiring.cs).
                Saga.Core.ButtonWiring.Wire(_cardButtons[i], ChooseIndex, i);
                _cardLabels[i] = _cardButtons[i].GetComponentInChildren<TextMeshProUGUI>();
                y -= 170f;
            }

            _rejectLabel = EncounterUiKit.NewButton(_panel.transform,
                GoLocalization.T("perk.reject", $"거절 — 돈 +{PerkState.RejectGoldReward}"),
                new Vector2(0.5f, 0f), new Vector2(0f, 40f), new Vector2(320f, 80f), Reject)
                .GetComponentInChildren<TextMeshProUGUI>();
        }

        public void Show(PerkState.PerkDef[] offer, System.Action<PerkState.PerkDef> onChosen, System.Action onRejected)
        {
            if (_panel == null || offer == null || offer.Length != _cardButtons.Length) return;

            _offer = offer;
            _onChosen = onChosen;
            _onRejected = onRejected;

            for (int i = 0; i < offer.Length; i++)
            {
                var perk = offer[i];
                string axis = AxisLabel[(int)perk.Axis];
                _cardLabels[i].text = $"{axis} {perk.Name}\n(+{Mathf.RoundToInt(perk.Bonus * 100f)}%)";
            }
            _panel.SetActive(true);
        }

        private void ChooseIndex(int index)
        {
            if (index < 0 || index >= _offer.Length) return;
            var perk = _offer[index];
            _panel.SetActive(false);
            _onChosen?.Invoke(perk);
        }

        private void Reject()
        {
            _panel.SetActive(false);
            _onRejected?.Invoke();
        }
    }
}
