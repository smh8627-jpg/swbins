using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using Saga.Go.Data;
using Saga.Go.UI;

namespace Saga.Go.World
{
    /// <summary>
    /// VERTICAL_SLICE.md Phase 6(61~71단계 — 72~74 엘리트/보스는 이번
    /// 슬라이스에서 스킵) + 29·34·35절의 "도적의 습격" 단 하나의 사건 +
    /// 실시간 전투. 승패를 가르는 수식은 Data/DuelRules.cs(웹판 js/duel.js
    /// 그대로)가 맡는다 — 여기는 그 상태를 3D 세계에 그려 보여주는 화면
    /// 층일 뿐이다(saga-godot의 bandit_encounter.gd와 같은 경계).
    ///
    /// "달아난다"(사건 선택지)는 여전히 대사만 보여주고 넘어간다. "값을
    /// 치른다"는 GoldState.cs가 생긴 뒤로는 실제로 돈을 쓴다 — 못 낼
    /// 만큼 없으면 그 선택지가 거절된다(아래 ChoosePay 참고).
    /// </summary>
    [RequireComponent(typeof(SphereCollider))]
    public class BanditEncounter : MonoBehaviour
    {
        private const int Gx = 5;
        private const int Gy = 3;
        private const string FoeName = "산적";
        private const float FoePower = 120f;
        private const float FoeHpMul = 7f; // 웹판 event.js "event.foeHpMul" 기본값
        private const float AmbushRadius = 20f;
        private const float RetryCooldownSec = 8f;
        private const float ToastSec = 4f;
        private const float VictoryToastSec = 6f; // 등용+경험치+장비까지 한 번에 읽어야 해 더 길게
        private const string RecruitId = "산적";
        private const int ExpReward = 100;
        private const int VictoryGoldReward = 30;
        private const int PayTollCost = 40;

        private static readonly Color BaseColor = new Color(0.5f, 0.14f, 0.14f);
        private static readonly Color TellColor = new Color(1.0f, 0.55f, 0.1f);

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

            // 아직 GLB가 없어 primitive Capsule(PLAN.md 8장) — 플레이어·주민과
            // 같은 크기, 옷 색만 달라 구별된다.
            var visual = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            visual.name = "Visual";
            Object.DestroyImmediate(visual.GetComponent<Collider>());
            visual.transform.SetParent(transform, false);
            visual.transform.localScale = new Vector3(1.8f, 1.7f, 1.8f);
            visual.transform.localPosition = new Vector3(0f, 1.7f, 0f);

            _visualMat = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "Bandit (generated)" };
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
            var canvas = NewCanvas("EncounterPrompt");
            _promptRoot = canvas.gameObject;
            _promptRoot.SetActive(false);

            var panel = NewPanel(canvas.transform, new Vector2(0.5f, 0.5f), new Vector2(700f, 480f), new Color(0f, 0f, 0f, 0.72f));

            var title = NewText(panel.transform, "🗡 도적의 습격\n\"길세를 내고 가라. 아니면 두고 가든지.\"",
                new Vector2(0.5f, 1f), new Vector2(0f, -110f), new Vector2(620f, 180f), 30);

            NewButton(panel.transform, "맞선다", new Vector2(0.5f, 1f), new Vector2(0f, -220f), new Vector2(560f, 74f), ChooseFight);
            NewButton(panel.transform, "값을 치른다", new Vector2(0.5f, 1f), new Vector2(0f, -304f), new Vector2(560f, 74f), ChoosePay);
            NewButton(panel.transform, "달아난다", new Vector2(0.5f, 1f), new Vector2(0f, -388f), new Vector2(560f, 74f), ChooseFleeEvent);
        }

        private void ChooseFight()
        {
            _promptRoot.SetActive(false);
            StartFight();
        }

        private void ChoosePay()
        {
            _promptRoot.SetActive(false);
            if (GoldState.TrySpend(PayTollCost))
            {
                Toast($"{FoeName} — 길세 {PayTollCost}냥을 치르고 지나갔다. (남은 돈 {GoldState.Gold}냥)");
            }
            else
            {
                Toast($"길세로 낼 {PayTollCost}냥이 없다 — {FoeName}이 앞을 막아선다.");
            }
            EnterCooldown();
        }

        private void ChooseFleeEvent()
        {
            _promptRoot.SetActive(false);
            Toast("어둠 속으로 달아났다.");
            EnterCooldown();
        }

        // ---- 전투 화면 --------------------------------------------------------

        private void BuildCombatUi()
        {
            var canvas = NewCanvas("CombatUI");
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

            var titleText = NewText(canvas.transform, $"🗡 {FoeName}", new Vector2(0f, 1f), new Vector2(220f, -50f), new Vector2(380f, 60f), 30);
            titleText.alignment = TextAnchor.MiddleLeft;

            _timerText = NewText(canvas.transform, "60초", new Vector2(1f, 1f), new Vector2(-140f, -50f), new Vector2(220f, 60f), 30);
            _timerText.alignment = TextAnchor.MiddleRight;

            _hpFill = NewBarRow(canvas.transform, "기세", -110f, out Image hpBg);
            _moraleFill = NewBarRow(canvas.transform, "사기", -160f, out Image moraleBg);
            _kiFill = NewBarRow(canvas.transform, "기(氣)", -210f, out Image kiBg);

            NewButton(canvas.transform, "속공", new Vector2(0f, 0f), new Vector2(150f, 130f), new Vector2(220f, 110f), () => DoAct("quick"));
            _ultButton = NewButton(canvas.transform, "필살", new Vector2(0.5f, 0f), new Vector2(0f, 130f), new Vector2(220f, 110f), () => DoAct("ult"));
            NewButton(canvas.transform, "회피", new Vector2(1f, 0f), new Vector2(-150f, 130f), new Vector2(220f, 110f), () => DoAct("dodge"));
            NewButton(canvas.transform, "물러난다", new Vector2(0.5f, 0f), new Vector2(0f, 30f), new Vector2(300f, 74f), FleeCombat);
        }

        /// <summary>왼쪽 라벨 + 오른쪽으로 차는 막대 하나(Image.fillAmount 기반).</summary>
        private Image NewBarRow(Transform parent, string label, float y, out Image background)
        {
            NewText(parent, label, new Vector2(0f, 1f), new Vector2(30f, y), new Vector2(110f, 40f), 22).alignment = TextAnchor.MiddleLeft;

            var bgGo = new GameObject($"{label}Bar", typeof(RectTransform));
            bgGo.transform.SetParent(parent, false);
            var rect = (RectTransform)bgGo.transform;
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = new Vector2(0f, 1f);
            rect.pivot = new Vector2(0f, 0.5f);
            rect.anchoredPosition = new Vector2(150f, y);
            rect.sizeDelta = new Vector2(500f, 30f);
            background = bgGo.AddComponent<Image>();
            background.color = new Color(1f, 1f, 1f, 0.15f);

            var fillGo = new GameObject("Fill", typeof(RectTransform));
            fillGo.transform.SetParent(bgGo.transform, false);
            var fillRect = (RectTransform)fillGo.transform;
            fillRect.anchorMin = Vector2.zero;
            fillRect.anchorMax = Vector2.one;
            fillRect.offsetMin = Vector2.zero;
            fillRect.offsetMax = Vector2.zero;
            var fill = fillGo.AddComponent<Image>();
            fill.color = new Color(0.85f, 0.25f, 0.2f, 0.9f);
            fill.type = Image.Type.Filled;
            fill.fillMethod = Image.FillMethod.Horizontal;
            fill.fillAmount = 1f;
            return fill;
        }

        private void StartFight()
        {
            _state = State.Fight;
            float foeHp = Mathf.Max(1f, Mathf.Round(FoePower * FoeHpMul));
            // PLAN.md 59~65장 — 부대(PartyState) + 내 레벨(PlayerStats) + 낀
            // 장비(Inventory) 세 축을 합쳐 실제 전투력을 만든다.
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
                    Toast("강타가 온다 — 피하라!");
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
                PartyState.Recruit(RecruitId);

                // PLAN.md 66장 Reward — 등용 외에 경험치·장비 보상도 준다.
                // 레벨업 여러 번은 LeveledUp 이벤트로, 실제 문구는 아래서 한 번에 모은다.
                int levelBefore = PlayerStats.Level;
                PlayerStats.AddExp(ExpReward);
                GoldState.Add(VictoryGoldReward);
                string lootId = LootTable.RollBanditDrop();
                ItemData lootItem = null;
                bool lootEquipped = false;
                if (lootId != null)
                {
                    lootItem = ItemData.Get(lootId);
                    void OnGained(ItemData item, bool equipped)
                    {
                        if (item == lootItem) lootEquipped = equipped;
                    }
                    Inventory.ItemGained += OnGained;
                    Inventory.AddItem(lootId);
                    Inventory.ItemGained -= OnGained;
                }

                // PLAN.md 70~71장 Quest — 촌장에게 말을 걸어 받아 둔 퀘스트가
                // 있으면 여기서 완료 처리(활성 상태가 아니면 CompleteBanditQuest가
                // false를 돌려줘 조용히 건너뛴다 — 촌장을 안 만났어도 전투 자체는
                // 그대로 된다).
                bool questDone = QuestState.CompleteBanditQuest();
                if (questDone) PlayerStats.AddExp(QuestState.BanditRewardExp);

                var msg = $"{FoeName}을 물리쳤다 — 부대에 합류했다! (전투력 {Mathf.RoundToInt(PartyState.Atk + PartyState.Def)})\n" +
                          $"경험치 +{ExpReward} · 돈 +{VictoryGoldReward}냥";
                if (questDone) msg += $"\n퀘스트 완료 — 촌장이 사례하다 (경험치 +{QuestState.BanditRewardExp})";
                if (PlayerStats.Level > levelBefore) msg += $" — 레벨업! ({levelBefore} → {PlayerStats.Level})";
                if (lootItem != null) msg += $"\n{lootItem.Name}을(를) 주웠다{(lootEquipped ? " — 바로 갖췄다." : ".")}";
                Toast(msg, VictoryToastSec);

                // 물리친 도적은 사라진다 — 이번 슬라이스에서는 다시 나지 않는다.
                Destroy(gameObject);
                return;
            }

            if (dealt <= 0f)
            {
                // 한 대도 못 때리고 물러난 것은 패배로 안 친다(웹판 event.js와 같은 경계).
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

            Vector3 baseScale = new Vector3(1.8f, 1.7f, 1.8f);
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

        // ---- UI 조립 공통 --------------------------------------------------------

        private static Canvas NewCanvas(string name)
        {
            var go = new GameObject(name);
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = go.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080f, 1920f);
            go.AddComponent<GraphicRaycaster>();
            return canvas;
        }

        private static GameObject NewPanel(Transform parent, Vector2 anchor, Vector2 size, Color color)
        {
            var go = new GameObject("Panel", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.sizeDelta = size;
            rect.anchoredPosition = Vector2.zero;
            var img = go.AddComponent<Image>();
            img.color = color;
            return go;
        }

        private static Text NewText(Transform parent, string content, Vector2 anchor, Vector2 pos, Vector2 size, int fontSize)
        {
            var go = new GameObject("Text", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.anchoredPosition = pos;
            rect.sizeDelta = size;

            var text = go.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = fontSize;
            text.alignment = TextAnchor.MiddleCenter;
            text.color = Color.white;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.text = content;
            return text;
        }

        private static Button NewButton(Transform parent, string label, Vector2 anchor, Vector2 pos, Vector2 size, UnityEngine.Events.UnityAction onClick)
        {
            var go = new GameObject($"Btn_{label}", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.anchoredPosition = pos;
            rect.sizeDelta = size;

            var img = go.AddComponent<Image>();
            img.color = new Color(1f, 1f, 1f, 0.18f);
            var button = go.AddComponent<Button>();
            button.targetGraphic = img;
            button.onClick.AddListener(onClick);

            NewText(go.transform, label, new Vector2(0.5f, 0.5f), Vector2.zero, size, 26);

            return button;
        }
    }
}
