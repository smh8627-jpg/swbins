using TMPro;
using System;
using System.Collections.Generic;
using Unity.Cinemachine;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.Playables;
using UnityEngine.UI;
using Saga.Go.Combat;

namespace Saga.Go.Cinematics
{
    /// <summary>
    /// PLAN.md 106-9 "GO 두목 등장 컷" — DUNGEON `DungeonCutscenes`(106-7 층 두목 컷)·STORY `StoryCutscenes`(106-8)의
    /// 판별 복사(코드 공유 없음). 망루 수호장(107-7)이 처음 달려들 때(`FieldEnemy.GuardianEngaged`) 한 번 튼다.
    ///
    /// 카메라 구조(DUNGEON 과 같은 하이브리드): 평소엔 `CameraRig` 가 움직이는 플레이 가상 카메라(PlayerView,
    /// 우선순위 10) 하나가 살아 있고, 실제 카메라의 `CinemachineBrain` 이 거기 붙는다. 컷의 `CinemachineTrack` 이
    /// 컷 카메라 둘(우선순위 0)로 넘겨받았다가 이즈 아웃으로 돌려준다.
    ///
    /// 멈춤: `Time.timeScale` 은 안 건드리고 `Playing` 을 본다(플레이어 이동·들판 전투 입력·들판 적 AI). HUD 캔버스는
    /// 끄고(토스트만 남김) 레터박스를 내린다. 아무 키·클릭·탭으로 넘긴다(첫 0.35초 무시).
    /// </summary>
    public class GoCutscenes : MonoBehaviour
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

        [SerializeField] private CinemachineBrain brain;
        [SerializeField] private PlayableDirector bossIntro;
        [SerializeField] private CinemachineCamera wideCam;
        [SerializeField] private CinemachineCamera closeCam;
        [SerializeField] private Canvas overlayCanvas;
        [SerializeField] private RectTransform topBar;
        [SerializeField] private RectTransform bottomBar;
        [SerializeField] private GameObject skipHint;
        [SerializeField] private CanvasGroup nameGroup;
        [SerializeField] private TextMeshProUGUI nameTitle;
        [SerializeField] private TextMeshProUGUI nameSub;

        public static GoCutscenes Instance { get; private set; }
        public static bool Playing => Instance != null && Instance._playing;

        public CinemachineBrain Brain => brain;
        public PlayableDirector Director => bossIntro;
        public bool RoarFired => _roarFired;
        public int PlayCount { get; private set; }
        public string ShownName => nameTitle != null ? nameTitle.text : string.Empty;
        public float NameAlpha => nameGroup != null ? nameGroup.alpha : 0f;

        public CinemachineCamera CameraOf(bool close) => close ? closeCam : wideCam;

        private bool _playing;
        private Action _onEnd;
        private float _elapsed;
        private bool _roarFired;
        private FieldEnemy _boss;
        private float _bar;
        private readonly List<Canvas> _hiddenCanvases = new List<Canvas>();

        private void Awake()
        {
            Instance = this;
            if (bossIntro != null)
            {
                bossIntro.playOnAwake = false;
                bossIntro.extrapolationMode = DirectorWrapMode.None;
                bossIntro.stopped += OnDirectorStopped;
            }
            ApplyBars();
            if (skipHint != null) skipHint.SetActive(false);
            if (nameGroup != null) nameGroup.alpha = 0f;
        }

        private void OnEnable() => FieldEnemy.GuardianEngaged += OnGuardianEngaged;
        private void OnDisable() => FieldEnemy.GuardianEngaged -= OnGuardianEngaged;

        private void OnDestroy()
        {
            if (bossIntro != null) bossIntro.stopped -= OnDirectorStopped;
            if (Instance == this) Instance = null;
        }

        private void OnGuardianEngaged(FieldEnemy boss)
        {
            var fc = FieldCombat.Instance;
            if (boss == null || fc == null || _playing) return;
            string sub = string.Format(Saga.Go.Data.GoLocalization.T("cut.guardian_sub", "옛 망루를 지키는 돌장수 — 방패 두 겹({0} → {1})"),
                GoElements.NameOf(FieldEnemy.GuardianOuter), GoElements.NameOf(FieldEnemy.GuardianInner));
            PlayBossIntro(boss, fc.transform.position, boss.BodyTop, boss.DisplayName, sub, null);
        }

        /// <summary>두목이 처음 달려들 때 부른다. 카메라 두 자리를 이 두목·플레이어에 맞춰 다시 잡는다
        /// (플레이어 어깨 너머 넓은 샷 → 두목 발치에서 올려다보기). 틀었으면 true.</summary>
        public bool PlayBossIntro(FieldEnemy boss, Vector3 playerPos, float bossHeight, string title, string sub, Action onEnd)
        {
            if (boss == null || bossIntro == null || bossIntro.playableAsset == null)
            {
                onEnd?.Invoke();
                return false;
            }
            if (_playing) Finish();

            Vector3 bossPos = boss.transform.position;
            float h = Mathf.Max(1f, bossHeight);
            Vector3 dir = bossPos - playerPos;
            dir.y = 0f;
            dir = dir.sqrMagnitude > 0.01f ? dir.normalized : Vector3.forward;
            Vector3 side = Vector3.Cross(Vector3.up, dir).normalized;
            // GO 세계는 사람 키 3.4m — 어깨 너머 샷 거리도 그 배율(DUNGEON 1.8m 의 약 1.85배).
            var wide = wideCam != null ? wideCam.GetComponent<GoCutDolly>() : null;
            if (wide != null)
            {
                Vector3 head = playerPos + Vector3.up * 3f;
                Vector3 a = PullIn(head, playerPos - dir * 6f + side * 2.4f + Vector3.up * 4.3f);
                Vector3 b = PullIn(head, playerPos - dir * 3.9f + side * 1.7f + Vector3.up * 3.6f);
                wide.Set(a, b, bossPos + Vector3.up * (h * 0.55f), bossPos + Vector3.up * (h * 0.65f));
            }
            var close = closeCam != null ? closeCam.GetComponent<GoCutDolly>() : null;
            if (close != null)
            {
                Vector3 chest = bossPos + Vector3.up * (h * 0.55f);
                Vector3 best = Vector3.zero, bestTo = Vector3.zero;
                float bestClear = -1f;
                foreach (float sign in new[] { 1f, -1f })
                {
                    Vector3 from = PullIn(chest, bossPos - dir * (1.3f * h) + side * (0.5f * h * sign) + Vector3.up * 0.6f, out float clear);
                    if (clear > bestClear)
                    {
                        bestClear = clear;
                        best = from;
                        bestTo = PullIn(chest, bossPos - dir * (0.95f * h) + side * (0.4f * h * sign) + Vector3.up * 0.5f);
                    }
                }
                close.Set(best, bestTo, bossPos + Vector3.up * (h * 0.8f), bossPos + Vector3.up * (h * 0.95f));
            }
            if (nameTitle != null) nameTitle.text = title;
            if (nameSub != null) nameSub.text = sub ?? string.Empty;

            _boss = boss;
            _playing = true;
            _onEnd = onEnd;
            _elapsed = 0f;
            _roarFired = false;
            PlayCount++;
            HideHud();
            if (skipHint != null) skipHint.SetActive(true);
            bossIntro.time = 0.0;
            bossIntro.Play();
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
            if (bossIntro != null && bossIntro.state == PlayState.Playing) bossIntro.Stop();
            if (nameGroup != null) nameGroup.alpha = 0f;
            if (skipHint != null) skipHint.SetActive(false);
            ShowHud();
            _boss = null;
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
            double t = bossIntro.time;
            if (!_roarFired && t >= RoarSec)
            {
                _roarFired = true;
                if (_boss != null) _boss.PlayRoar();
            }
            if (nameGroup != null)
            {
                float a = Mathf.Clamp01(Mathf.Min((float)(t - NameStartSec), (float)(NameEndSec - t)) / NameFadeSec);
                nameGroup.alpha = a;
            }
            if (_elapsed > SkipGraceSec && SkipPressed())
            {
                Finish();
                return;
            }
            if (t >= bossIntro.duration) Finish();
        }

        /// <summary>진단용 — 컷을 t 초로 옮겨 그 자리를 평가한다(실제 카메라는 다음 프레임 브레인이 옮긴다).</summary>
        public void Seek(double t)
        {
            if (!_playing) return;
            bossIntro.time = t;
            bossIntro.Evaluate();
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

        private static Vector3 PullIn(Vector3 focus, Vector3 want) => PullIn(focus, want, out _);

        /// <summary>시선 사이에 지형·건물이 있으면 그 앞까지 당긴다(`CameraRig` 벽 pull-in 과 같은 결). 들판 적은
        /// 충돌체가 없어 안 걸린다. 플레이어 캡슐(CharacterController)은 건너뛴다.</summary>
        private static Vector3 PullIn(Vector3 focus, Vector3 want, out float clearance)
        {
            Vector3 dir = want - focus;
            float dist = dir.magnitude;
            clearance = dist;
            if (dist < 0.01f) return want;
            dir /= dist;
            foreach (var hit in Physics.RaycastAll(focus, dir, dist, ~0, QueryTriggerInteraction.Ignore))
            {
                if (hit.collider is CharacterController) continue;
                if (hit.distance < clearance) clearance = hit.distance;
            }
            if (clearance < dist)
            {
                clearance = Mathf.Max(0.3f, clearance - WallBufferM);
                return focus + dir * clearance;
            }
            return want;
        }
    }
}
