using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using Saga.Go.Data;
using Saga.Go.UI;

namespace Saga.Go.World
{
    /// <summary>
    /// PLAN.md 51장 GO 월드 확장 — "희귀 몬스터". BanditEncounter.cs와
    /// 뼈대는 같지만(판정은 똑같이 Data/DuelRules.cs가 맡는다) 사람이
    /// 아니라 짐승이라 다른 점이 있다: "값을 치른다"가 없다(늑대한테
    /// 돈을 줄 수 없다) — 선택지가 "맞선다"/"피한다" 둘뿐이다. 등용
    /// 대상도 아니라 이겨도 부대(PartyState)엔 안 들어간다 — 대신
    /// 확정 보상(경험치·돈·전용 방어구)이 도적보다 후하다("희귀"가
    /// 실제로 특별해야 한다). UI 조립은 두 사건이 같이 쓰는
    /// UI/EncounterUiKit.cs로 만든다.
    /// </summary>
    [RequireComponent(typeof(SphereCollider))]
    public class RareWolfEncounter : MonoBehaviour
    {
        private const int Gx = 0;
        private const int Gy = 3;
        private const string FoeName = "흰 늑대";
        private const float FoePower = 160f; // 도적(120)보다 세게 — "희귀"가 더 어렵게 느껴지도록.
        private const float FoeHpMul = 7f;
        private const float AmbushRadius = 16f;
        private const float RetryCooldownSec = 8f;
        private const float ToastSec = 4f;
        private const float VictoryToastSec = 6f;
        private const int ExpReward = 150;
        private const int RewardGold = 50;
        private const string RewardItemId = "ar_wolf";

        private static readonly Color BaseColor = new Color(0.78f, 0.78f, 0.8f);
        private static readonly Color TellColor = new Color(1.0f, 0.4f, 0.2f);

        private enum State { Idle, Prompt, Fight, Cooldown }

        private State _state = State.Idle;
        private DuelRules _duel;
        private float _cooldownLeft;
        private bool _playerInRange;

        private Material _visualMat;

        private GameObject _promptRoot;
        private GameObject _combatRoot;
        private Image _flashImage;
        private Image _hpFill;
        private Image _moraleFill;
        private Image _kiFill;
        private Text _timerText;
        private Button _ultButton;

        private Coroutine _flashRoutine;
        private Coroutine _pulseRoutine;

        private void Awake()
        {
            // 등용 대상이 아니라 PartyState.MemberIds엔 안 남는다 — 대신
            // WorldEventState.cs·ShrineState.cs와 같은 결로 별도 플래그를
            // 둔다(RareWolfState.cs).
            if (RareWolfState.Defeated)
            {
                Destroy(gameObject);
                return;
            }
            Build();
        }

        public void Build()
        {
            SpawnVisual();
            SpawnArea();
            BuildPromptUi();
            BuildCombatUi();
        }

        private void Update()
        {
            float dt = Time.deltaTime;
            switch (_state)
            {
                case State.Idle:
                    if (_playerInRange)
                    {
                        _state = State.Prompt;
                        _promptRoot.SetActive(true);
                    }
                    break;

                case State.Fight:
                    if (_duel != null)
                    {
                        var events = _duel.Step(dt);
                        foreach (var e in events)
                        {
                            OnDuelEvent(e);
                        }
                        RefreshCombatUi();
                        if (_duel.Over)
                        {
                            FinishFight();
                        }
                    }
                    break;

                case State.Cooldown:
                    _cooldownLeft -= dt;
                    if (_cooldownLeft <= 0f)
                    {
                        _state = State.Idle;
                    }
                    break;
            }
        }

        private void OnTriggerEnter(Collider other)
        {
            if (other.CompareTag("Player")) _playerInRange = true;
        }

        private void OnTriggerExit(Collider other)
        {
            if (other.CompareTag("Player")) _playerInRange = false;
        }

        // ---- 자리·모양 --------------------------------------------------------

        private void SpawnVisual()
        {
            char tile = TestMapData.TileAt(Gx, Gy);
            float ground = TestMapData.Legend[tile].Height;
            transform.position = TestMapData.WorldPos(Gx, Gy) + new Vector3(0, ground, 0);

            // 아직 GLB 전(PLAN.md 8장) — 짐승이라 사람(Player·NPC·도적)보다
            // 살짝 낮고 홀쭉한 비율로만 구분한다.
            var visual = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            visual.name = "Visual";
            Object.DestroyImmediate(visual.GetComponent<Collider>());
            visual.transform.SetParent(transform, false);
            visual.transform.localScale = new Vector3(1.3f, 1.3f, 1.3f);
            visual.transform.localPosition = new Vector3(0f, 1.3f, 0f);

            _visualMat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "RareWolf (generated)" };
            _visualMat.color = BaseColor;
            visual.GetComponent<MeshRenderer>().sharedMaterial = _visualMat;
        }

        private void SpawnArea()
        {
            var col = GetComponent<SphereCollider>();
            col.isTrigger = true;
            col.radius = AmbushRadius;
        }

        // ---- 사건 선택지 UI --------------------------------------------------------

        private void BuildPromptUi()
        {
            var canvas = EncounterUiKit.NewCanvas("RareEncounterPrompt");
            _promptRoot = canvas.gameObject;
            _promptRoot.SetActive(false);

            var panel = EncounterUiKit.NewPanel(canvas.transform, new Vector2(0.5f, 0.5f), new Vector2(700f, 420f), new Color(0f, 0f, 0f, 0.72f));

            EncounterUiKit.NewText(panel.transform, "🐺 흰 늑대\n숲 그늘에서 눈빛 하나가 이쪽을 노려본다.",
                new Vector2(0.5f, 1f), new Vector2(0f, -110f), new Vector2(620f, 180f), 30);

            EncounterUiKit.NewButton(panel.transform, "맞선다", new Vector2(0.5f, 1f), new Vector2(0f, -220f), new Vector2(560f, 74f), ChooseFight);
            EncounterUiKit.NewButton(panel.transform, "피한다", new Vector2(0.5f, 1f), new Vector2(0f, -304f), new Vector2(560f, 74f), ChooseAvoid);
        }

        private void ChooseFight()
        {
            _promptRoot.SetActive(false);
            StartFight();
        }

        private void ChooseAvoid()
        {
            _promptRoot.SetActive(false);
            Toast("숨을 죽이고 조용히 발길을 돌렸다.");
            EnterCooldown();
        }

        // ---- 전투 화면 --------------------------------------------------------

        private void BuildCombatUi()
        {
            var canvas = EncounterUiKit.NewCanvas("RareCombatUI");
            _combatRoot = canvas.gameObject;
            _combatRoot.SetActive(false);

            var flashGo = new GameObject("Flash", typeof(RectTransform));
            flashGo.transform.SetParent(canvas.transform, false);
            var flashRect = (RectTransform)flashGo.transform;
            flashRect.anchorMin = Vector2.zero;
            flashRect.anchorMax = Vector2.one;
            flashRect.offsetMin = Vector2.zero;
            flashRect.offsetMax = Vector2.zero;
            _flashImage = flashGo.AddComponent<Image>();
            _flashImage.color = new Color(1f, 0.15f, 0.15f, 0f);
            _flashImage.raycastTarget = false;

            var titleText = EncounterUiKit.NewText(canvas.transform, $"🐺 {FoeName}", new Vector2(0f, 1f), new Vector2(220f, -50f), new Vector2(380f, 60f), 30);
            titleText.alignment = TextAnchor.MiddleLeft;

            _timerText = EncounterUiKit.NewText(canvas.transform, "60초", new Vector2(1f, 1f), new Vector2(-140f, -50f), new Vector2(220f, 60f), 30);
            _timerText.alignment = TextAnchor.MiddleRight;

            _hpFill = EncounterUiKit.NewBarRow(canvas.transform, "기세", -110f, out _);
            _moraleFill = EncounterUiKit.NewBarRow(canvas.transform, "사기", -160f, out _);
            _kiFill = EncounterUiKit.NewBarRow(canvas.transform, "기(氣)", -210f, out _);

            EncounterUiKit.NewButton(canvas.transform, "속공", new Vector2(0f, 0f), new Vector2(150f, 130f), new Vector2(220f, 110f), () => DoAct("quick"));
            _ultButton = EncounterUiKit.NewButton(canvas.transform, "필살", new Vector2(0.5f, 0f), new Vector2(0f, 130f), new Vector2(220f, 110f), () => DoAct("ult"));
            EncounterUiKit.NewButton(canvas.transform, "회피", new Vector2(1f, 0f), new Vector2(-150f, 130f), new Vector2(220f, 110f), () => DoAct("dodge"));
            EncounterUiKit.NewButton(canvas.transform, "물러난다", new Vector2(0.5f, 0f), new Vector2(0f, 30f), new Vector2(300f, 74f), FleeCombat);
        }

        private void StartFight()
        {
            _state = State.Fight;
            float foeHp = Mathf.Max(1f, Mathf.Round(FoePower * FoeHpMul));
            float atk = PartyState.Atk + PlayerStats.AtkBonus + Inventory.AtkBonus;
            float def = PartyState.Def + PlayerStats.DefBonus + Inventory.DefBonus;
            _duel = DuelRules.Create(foeHp, atk, def);
            _combatRoot.SetActive(true);
            RefreshCombatUi();
        }

        private void DoAct(string kind)
        {
            if (_duel == null) return;
            var r = _duel.Act(kind);
            if (r.Ok)
            {
                if (kind == "quick") PulseVisual(1.15f);
                else if (kind == "ult") PulseVisual(1.4f);
            }
            RefreshCombatUi();
            if (_duel.Over)
            {
                FinishFight();
            }
        }

        private void FleeCombat()
        {
            if (_duel != null)
            {
                _duel.Flee();
                FinishFight();
            }
        }

        private void OnDuelEvent(DuelRules.DuelEvent e)
        {
            switch (e.T)
            {
                case "tell":
                    Toast("늑대가 몸을 낮춘다 — 덮치기 전에 피하라!");
                    _visualMat.color = TellColor;
                    break;
                case "heavy":
                    _visualMat.color = BaseColor;
                    ScreenFlash(e.Dodged ? new Color(0.2f, 1.0f, 0.4f, 0.35f) : new Color(1.0f, 0.15f, 0.15f, 0.45f));
                    break;
                case "hit":
                    ScreenFlash(new Color(1.0f, 0.15f, 0.15f, 0.3f));
                    break;
            }
        }

        private void RefreshCombatUi()
        {
            if (_duel == null) return;
            _hpFill.fillAmount = Mathf.Clamp01(_duel.Hp / _duel.FoeHp);
            _moraleFill.fillAmount = Mathf.Clamp01(_duel.Morale / _duel.MoraleMax);
            _kiFill.fillAmount = Mathf.Clamp01(_duel.Ki / DuelRules.KiMax);
            _timerText.text = $"{Mathf.CeilToInt(Mathf.Max(0f, _duel.Left))}초";
            _ultButton.interactable = _duel.Ki >= DuelRules.KiMax;
        }

        private void FinishFight()
        {
            bool cleared = _duel.Cleared;
            float dealt = _duel.Dealt;
            _combatRoot.SetActive(false);
            _duel = null;

            if (cleared)
            {
                RareWolfState.MarkDefeated();

                int levelBefore = PlayerStats.Level;
                PlayerStats.AddExp(ExpReward);
                GoldState.Add(RewardGold);
                Inventory.AddItem(RewardItemId);
                var item = ItemData.Get(RewardItemId);

                var msg = $"{FoeName}을 물리쳤다 — 희귀 몬스터 토벌!\n경험치 +{ExpReward} · 돈 +{RewardGold}냥";
                if (PlayerStats.Level > levelBefore) msg += $" — 레벨업! ({levelBefore} → {PlayerStats.Level})";
                if (item != null) msg += $"\n{item.Name}을(를) 확실히 얻었다.";
                Toast(msg, VictoryToastSec);

                // 희귀 몬스터는 이번 슬라이스에서 한 번만 나고 다시 안 난다
                // (도적과 같은 결, RareWolfState가 재등장을 막는다).
                Destroy(gameObject);
                return;
            }

            if (dealt <= 0f)
            {
                Toast("물러났다.");
            }
            else
            {
                Toast("밀렸다. 물러났다.");
            }
            EnterCooldown();
        }

        private void EnterCooldown()
        {
            _state = State.Cooldown;
            _cooldownLeft = RetryCooldownSec;
        }

        // ---- 연출 --------------------------------------------------------

        private void PulseVisual(float scaleTo)
        {
            if (_pulseRoutine != null) StopCoroutine(_pulseRoutine);
            _pulseRoutine = StartCoroutine(PulseRoutine(scaleTo));
        }

        private IEnumerator PulseRoutine(float scaleTo)
        {
            Transform visual = transform.Find("Visual");
            if (visual == null) yield break;

            Vector3 baseScale = new Vector3(1.3f, 1.3f, 1.3f);
            Vector3 peakScale = baseScale * scaleTo;

            float t = 0f;
            const float up = 0.08f;
            while (t < up)
            {
                t += Time.deltaTime;
                visual.localScale = Vector3.Lerp(baseScale, peakScale, t / up);
                yield return null;
            }
            t = 0f;
            const float down = 0.16f;
            while (t < down)
            {
                t += Time.deltaTime;
                visual.localScale = Vector3.Lerp(peakScale, baseScale, t / down);
                yield return null;
            }
            visual.localScale = baseScale;
        }

        private void ScreenFlash(Color color)
        {
            if (_flashRoutine != null) StopCoroutine(_flashRoutine);
            _flashRoutine = StartCoroutine(FlashRoutine(color));
        }

        private IEnumerator FlashRoutine(Color color)
        {
            _flashImage.color = color;
            float from = color.a;
            const float duration = 0.35f;
            float t = 0f;
            while (t < duration)
            {
                t += Time.deltaTime;
                var c = _flashImage.color;
                c.a = Mathf.Lerp(from, 0f, t / duration);
                _flashImage.color = c;
                yield return null;
            }
        }

        private void Toast(string text, float seconds = ToastSec)
        {
            DialogueLabel.Instance?.Show(text, seconds);
        }
    }
}
