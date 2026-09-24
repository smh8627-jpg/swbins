using System;
using System.Collections.Generic;
using Unity.Cinemachine;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.Playables;
using UnityEngine.UI;
using Saga.Story.World;

namespace Saga.Story.Cinematics
{
    /// <summary>
    /// PLAN.md 106-8 "STORY 두목 등장 컷" — DUNGEON `DungeonCutscenes`(106-3·106-7)의 판별 복사(코드 공유 없음).
    /// 이 판은 컷이 하나(두목 등장)뿐이라 제목 트랙 없이 이름표를 컷 시각으로 직접 페이드한다.
    ///
    /// 카메라 구조(DUNGEON 과 같은 하이브리드): 평소엔 `StoryCameraFollow` 가 움직이는 플레이 가상 카메라
    /// (StoryPlayerView, 우선순위 10) 하나가 살아 있고, 실제 카메라의 `CinemachineBrain` 이 거기 붙는다. 컷의
    /// `CinemachineTrack` 이 컷 카메라 둘(우선순위 0)로 넘겨받았다가 이즈 아웃으로 돌려준다 — 옆에서 보던 2.5D
    /// 화면이 잠깐 3/4 각도로 돌았다가 제자리로 돌아온다.
    ///
    /// 멈춤: `Time.timeScale` 은 안 건드리고 `Playing` 을 본다(플레이어 입력·이동, 관문 대장 시간). HUD 캔버스는
    /// 끄고(토스트만 남김) 레터박스를 내린다. 아무 키·클릭·탭으로 넘긴다(첫 0.35초 무시).
    /// </summary>
    public class StoryCutscenes : MonoBehaviour
    {
        private const float SkipGraceSec = 0.35f;
        private const float BarShare = 0.11f;
        private const float BarRate = 5f;
        private const float WallBufferM = 0.35f;
        private const float NameFadeSec = 0.45f;

        public const float WideSec = 1.8f;
        public const float CloseSec = 2.4f;
        public const float RoarSec = WideSec;           // 넓은→가까운 샷으로 자르는 순간.
        public const float NameStartSec = WideSec + 0.3f;
        public const float NameEndSec = WideSec + CloseSec - 0.3f;

        // PLAN.md 106-10 둘째 단계 — 소환 컷(`Story_Summon.playable`, 5.0s). 넓은 샷(플레이어 등 뒤 낮은 데서 내려서는 거수를
        // 올려다봄) → 맞붙여 자른 거수 옆 낮은 샷(내려찍기를 따라 내려봄). 이름표는 0.5~2.4s.
        public const float SummonWideSec = 2.6f;
        public const float SummonCloseSec = 2.4f;
        public const float SummonNameStartSec = 0.5f;
        public const float SummonNameEndSec = 2.4f;

        [SerializeField] private CinemachineBrain brain;
        [SerializeField] private PlayableDirector bossIntro;
        [SerializeField] private CinemachineCamera wideCam;
        [SerializeField] private CinemachineCamera closeCam;
        [SerializeField] private PlayableDirector summonCut;
        [SerializeField] private CinemachineCamera summonWideCam;
        [SerializeField] private CinemachineCamera summonCloseCam;
        [SerializeField] private Canvas overlayCanvas;
        [SerializeField] private RectTransform topBar;
        [SerializeField] private RectTransform bottomBar;
        [SerializeField] private GameObject skipHint;
        [SerializeField] private CanvasGroup nameGroup;
        [SerializeField] private Text nameTitle;
        [SerializeField] private Text nameSub;

        public static StoryCutscenes Instance { get; private set; }
        public static bool Playing => Instance != null && Instance._playing;

        public CinemachineBrain Brain => brain;
        public PlayableDirector Director => bossIntro;
        public PlayableDirector SummonDirector => summonCut;
        public bool PlayingSummon => _playing && _isSummon;
        public CinemachineCamera SummonCameraOf(bool close) => close ? summonCloseCam : summonWideCam;
        public bool RoarFired => _roarFired;
        public int PlayCount { get; private set; }
        public string ShownName => nameTitle != null ? nameTitle.text : string.Empty;
        public float NameAlpha => nameGroup != null ? nameGroup.alpha : 0f;

        public CinemachineCamera CameraOf(bool close) => close ? closeCam : wideCam;

        private bool _playing;
        private Action _onEnd;
        private float _elapsed;
        private bool _roarFired;
        private StoryEnemy _boss;
        private PlayableDirector _dir;
        private bool _isSummon;
        private float _nameStart = NameStartSec, _nameEnd = NameEndSec;
        private float _bar;
        private readonly List<Canvas> _hiddenCanvases = new List<Canvas>();

        private void Awake()
        {
            Instance = this;
            foreach (var d in new[] { bossIntro, summonCut })
            {
                if (d == null) continue;
                d.playOnAwake = false;
                d.extrapolationMode = DirectorWrapMode.None;
                d.stopped += OnDirectorStopped;
            }
            ApplyBars();
            if (skipHint != null) skipHint.SetActive(false);
            if (nameGroup != null) nameGroup.alpha = 0f;
        }

        private void OnDestroy()
        {
            if (bossIntro != null) bossIntro.stopped -= OnDirectorStopped;
            if (summonCut != null) summonCut.stopped -= OnDirectorStopped;
            if (Instance == this) Instance = null;
        }

        /// <summary>`StoryEnemy` 두목이 플레이어가 처음 다가올 때 부른다. 카메라 두 자리를 이 두목·플레이어에 맞춰
        /// 다시 잡는다(플레이어 어깨 너머 → 두목 발치에서 올려다보기). 틀었으면 true.</summary>
        public bool PlayBossIntro(StoryEnemy boss, Vector3 playerPos, float bossHeight, string title, string sub, Action onEnd)
        {
            if (boss == null || bossIntro == null || bossIntro.playableAsset == null)
            {
                onEnd?.Invoke();
                return false;
            }
            if (_playing) Finish();

            Vector3 bossPos = boss.transform.position;
            float h = Mathf.Max(1f, bossHeight);
            float dir = Mathf.Sign(bossPos.x - playerPos.x);
            if (dir == 0f) dir = 1f;
            // 2.5D 판 — 옆(X)으로 마주 보고 카메라는 늘 화면 앞(-Z) 쪽에 선다.
            var wide = wideCam != null ? wideCam.GetComponent<StoryCutDolly>() : null;
            if (wide != null)
            {
                Vector3 head = playerPos + Vector3.up * 1.5f;
                Vector3 a = PullIn(head, playerPos + new Vector3(-dir * 2.8f, 2.0f, -4.2f));
                Vector3 b = PullIn(head, playerPos + new Vector3(-dir * 2.0f, 1.7f, -3.3f));
                wide.Set(a, b, bossPos + Vector3.up * (h * 0.55f), bossPos + Vector3.up * (h * 0.65f));
            }
            var close = closeCam != null ? closeCam.GetComponent<StoryCutDolly>() : null;
            if (close != null)
            {
                Vector3 chest = bossPos + Vector3.up * (h * 0.55f);
                Vector3 a = PullIn(chest, bossPos + new Vector3(-dir * 1.15f * h, 0.35f, -1.1f * h));
                Vector3 b = PullIn(chest, bossPos + new Vector3(-dir * 0.85f * h, 0.3f, -0.85f * h));
                close.Set(a, b, bossPos + Vector3.up * (h * 0.8f), bossPos + Vector3.up * (h * 0.95f));
            }
            if (nameTitle != null) nameTitle.text = title;
            if (nameSub != null) nameSub.text = sub ?? string.Empty;

            _boss = boss;
            return Begin(bossIntro, false, NameStartSec, NameEndSec, onEnd);
        }

        /// <summary>PLAN.md 106-10 — 소환수를 부른 순간 `StorySummoner` 가 부른다. 카메라 두 자리를 소환수·플레이어에 맞춰 다시
        /// 잡는다. 컷이 없으면 false(소환수는 혼자 논다 — onEnd 는 안 부른다). 넘기거나 끝나면 onEnd(내려찍기 마무리).</summary>
        public bool PlaySummon(StorySummon summon, Vector3 playerPos, float facing, Action onEnd)
        {
            if (summon == null || summonCut == null || summonCut.playableAsset == null) return false;
            if (_playing) Finish();

            Vector3 sp = summon.transform.position;
            float h = StorySummon.Height;
            float dir = facing >= 0f ? 1f : -1f;
            // 넓은 샷 — 플레이어 등 뒤 낮은 데서, 내려서는 거수를 올려다보며 고개를 든다(화면 앞 -Z 쪽).
            var wide = summonWideCam != null ? summonWideCam.GetComponent<StoryCutDolly>() : null;
            if (wide != null)
            {
                Vector3 focus = playerPos + Vector3.up * 1.3f;
                Vector3 a = PullIn(focus, playerPos + new Vector3(-dir * 2.6f, 0.9f, -3.6f));
                Vector3 b = PullIn(focus, playerPos + new Vector3(-dir * 1.8f, 0.6f, -2.8f));
                wide.Set(a, b, sp + Vector3.up * (h * 0.9f), sp + Vector3.up * (h * 0.6f));
            }
            // 가까운 샷 — 거수 옆 앞쪽 낮은 데서 내려찍는 주먹을 따라 내려본다.
            var close = summonCloseCam != null ? summonCloseCam.GetComponent<StoryCutDolly>() : null;
            if (close != null)
            {
                Vector3 focus = sp + Vector3.up * (h * 0.4f);
                Vector3 a = PullIn(focus, sp + new Vector3(dir * 6.5f, 1.4f, -7f));
                Vector3 b = PullIn(focus, sp + new Vector3(dir * 5f, 0.9f, -5.5f));
                close.Set(a, b, sp + Vector3.up * (h * 0.75f), sp + Vector3.up * (h * 0.2f));
            }
            if (nameTitle != null) nameTitle.text = Data.StoryLocalization.T("cut.summon_title", "우레뿔 거수");
            if (nameSub != null) nameSub.text = Data.StoryLocalization.T("cut.summon_sub", "소환 — 먹구름이 뿔에 내려앉는다");
            _boss = null;
            return Begin(summonCut, true, SummonNameStartSec, SummonNameEndSec, onEnd);
        }

        private bool Begin(PlayableDirector d, bool isSummon, float nameStart, float nameEnd, Action onEnd)
        {
            _dir = d;
            _isSummon = isSummon;
            _nameStart = nameStart;
            _nameEnd = nameEnd;
            _playing = true;
            _onEnd = onEnd;
            _elapsed = 0f;
            _roarFired = false;
            PlayCount++;
            HideHud();
            if (skipHint != null) skipHint.SetActive(true);
            d.time = 0.0;
            d.Play();
            return true;
        }

        public void Skip()
        {
            if (_playing) Finish();
        }

        private void Finish()
        {
            if (!_playing) return;
            _playing = false;
            if (_dir != null && _dir.state == PlayState.Playing) _dir.Stop();
            if (nameGroup != null) nameGroup.alpha = 0f;
            if (skipHint != null) skipHint.SetActive(false);
            ShowHud();
            _boss = null;
            _isSummon = false;
            var cb = _onEnd;
            _onEnd = null;
            cb?.Invoke();
        }

        private void OnDirectorStopped(PlayableDirector d)
        {
            if (_playing) Finish();
        }

        private void Update() => Tick(Time.unscaledDeltaTime);

        /// <summary>한 프레임 — 헤드리스 진단도 직접 부른다(포효·이름표·끝 판정).</summary>
        public void Tick(float dt)
        {
            _bar = Mathf.MoveTowards(_bar, _playing ? 1f : 0f, dt * BarRate);
            ApplyBars();
            if (!_playing) return;

            _elapsed += dt;
            double t = _dir.time;
            if (!_isSummon && !_roarFired && t >= RoarSec)
            {
                _roarFired = true;
                if (_boss != null) _boss.PlayRoar();
            }
            if (nameGroup != null)
            {
                float a = Mathf.Clamp01(Mathf.Min((float)(t - _nameStart), (float)(_nameEnd - t)) / NameFadeSec);
                nameGroup.alpha = a;
            }
            if (_elapsed > SkipGraceSec && SkipPressed())
            {
                Finish();
                return;
            }
            if (t >= _dir.duration) Finish();
        }

        /// <summary>진단용 — 컷을 t 초로 옮겨 그 자리를 평가한다(실제 카메라는 다음 프레임 브레인이 옮긴다).</summary>
        public void Seek(double t)
        {
            if (!_playing || _dir == null) return;
            _dir.time = t;
            _dir.Evaluate();
        }

        private static bool SkipPressed()
        {
            var kb = Keyboard.current;
            if (kb != null && kb.anyKey.wasPressedThisFrame) return true;
            var mouse = Mouse.current;
            if (mouse != null && mouse.leftButton.wasPressedThisFrame) return true;
            var touch = Touchscreen.current;
            return touch != null && touch.primaryTouch.press.wasPressedThisFrame;
        }

        private void ApplyBars()
        {
            float h = BarShare * Mathf.SmoothStep(0f, 1f, _bar);
            if (topBar != null)
            {
                topBar.anchorMin = new Vector2(0f, 1f - h);
                topBar.anchorMax = Vector2.one;
            }
            if (bottomBar != null)
            {
                bottomBar.anchorMin = Vector2.zero;
                bottomBar.anchorMax = new Vector2(1f, h);
            }
        }

        private void HideHud()
        {
            if (_hiddenCanvases.Count > 0) return;
            foreach (var c in FindObjectsByType<Canvas>(FindObjectsSortMode.None))
            {
                if (c == overlayCanvas || !c.isRootCanvas || !c.enabled) continue;
                if (c.renderMode != RenderMode.ScreenSpaceOverlay) continue;
                if (c.GetComponent<UI.DialogueLabel>() != null) continue; // 토스트는 남긴다.
                c.enabled = false;
                _hiddenCanvases.Add(c);
            }
        }

        private void ShowHud()
        {
            foreach (var c in _hiddenCanvases)
            {
                if (c != null) c.enabled = true;
            }
            _hiddenCanvases.Clear();
        }

        private static Vector3 PullIn(Vector3 focus, Vector3 want)
        {
            Vector3 dir = want - focus;
            float dist = dir.magnitude;
            if (dist < 0.01f) return want;
            dir /= dist;
            if (Physics.Raycast(focus, dir, out RaycastHit hit, dist, ~0, QueryTriggerInteraction.Ignore))
            {
                return focus + dir * Mathf.Max(0.3f, hit.distance - WallBufferM);
            }
            return want;
        }
    }
}
