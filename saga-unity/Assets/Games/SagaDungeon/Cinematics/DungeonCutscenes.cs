using System;
using System.Collections.Generic;
using Unity.Cinemachine;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.Playables;
using Saga.Dungeon.World;

namespace Saga.Dungeon.Cinematics
{
    public enum CutsceneKind
    {
        None,
        Arrival,   // 능묘 도착 — 지역명 카드
        Chest,     // 상자 열기 — 아이템 획득 클로즈업
        BossIntro, // 능묘지기 등장
    }

    /// <summary>
    /// PLAN.md 106-3 "연출(FF)" — Timeline 컷 셋을 틀고, 트는 동안 세계를 멈춘다.
    ///
    /// 카메라 구조: 평소엔 `CameraRig` 가 움직이는 가상 카메라(PlayerView) 하나가 살아 있고
    /// `CinemachineBrain` 이 실제 카메라를 거기 붙인다. 컷의 `CinemachineTrack` 이 브레인을
    /// 잠깐 넘겨받아 컷 전용 가상 카메라로 옮겨 가고, 첫·끝 샷의 이즈 인/아웃이 플레이 카메라와의
    /// 블렌드가 된다. 건너뛰면(아무 키·클릭·탭) 곧바로 플레이 카메라로 자른다.
    ///
    /// 멈춤은 `Time.timeScale` 을 건드리지 않고 `Playing` 을 각 스크립트가 본다(플레이어 입력·
    /// 공격·벽력탄·락온, 적 AI) — 101-3 hitstop 이 전역 시간을 안 건드리는 원칙과 같은 결이고,
    /// 적은 멈춘 채로도 숨쉬기(idle) 애니가 돈다. 컷 동안 HUD 캔버스는 끄고 레터박스를 내린다
    /// (토스트 `DialogueLabel` 캔버스만 남긴다).
    /// </summary>
    public class DungeonCutscenes : MonoBehaviour
    {
        private const float SkipGraceSec = 0.35f;
        private const float BarShare = 0.11f;
        private const float BarRate = 5f;

        // 상자 컷 카메라 자리 — 상자 옆으로 비껴 서서 플레이어와 떠오르는 아이템을 한 화면에.
        private const float ChestSideM = 2.4f;
        private const float ChestBackM = 1.1f;
        private const float ChestUpM = 1.6f;
        private const float ChestPushIn = 0.8f;
        private const float WallBufferM = 0.35f;

        [SerializeField] private CinemachineBrain brain;
        [SerializeField] private PlayableDirector arrival;
        [SerializeField] private PlayableDirector chest;
        [SerializeField] private PlayableDirector bossIntro;
        [SerializeField] private CinemachineCamera arrivalCam;
        [SerializeField] private CinemachineCamera chestCam;
        [SerializeField] private CinemachineCamera bossWideCam;
        [SerializeField] private CinemachineCamera bossCloseCam;
        [SerializeField] private CutsceneTitleCard titleCard;
        [SerializeField] private Canvas overlayCanvas;
        [SerializeField] private RectTransform topBar;
        [SerializeField] private RectTransform bottomBar;
        [SerializeField] private GameObject skipHint;
        [SerializeField] private float bossRoarSec = 2f;

        public static DungeonCutscenes Instance { get; private set; }
        public static bool Playing => Instance != null && Instance._current != null;

        public CutsceneKind Current => _kind;
        public PlayableDirector CurrentDirector => _current;
        public CinemachineBrain Brain => brain;
        public CutsceneTitleCard TitleCard => titleCard;
        public bool RoarFired => _roarFired;
        public int PlayCount { get; private set; }

        private PlayableDirector _current;
        private CutsceneKind _kind;
        private Action _onEnd;
        private float _elapsed;
        private bool _roarFired;
        private DungeonEnemy _boss;
        private float _bar;
        private readonly List<Canvas> _hiddenCanvases = new List<Canvas>();

        private void Awake()
        {
            Instance = this;
            foreach (var d in Directors())
            {
                if (d == null) continue;
                d.playOnAwake = false;
                d.extrapolationMode = DirectorWrapMode.None;
                d.stopped += OnDirectorStopped;
            }
            ApplyBars();
            if (skipHint != null) skipHint.SetActive(false);
        }

        private void OnDestroy()
        {
            foreach (var d in Directors())
            {
                if (d != null) d.stopped -= OnDirectorStopped;
            }
            if (Instance == this) Instance = null;
        }

        private IEnumerable<PlayableDirector> Directors()
        {
            yield return arrival;
            yield return chest;
            yield return bossIntro;
        }

        public CinemachineCamera CameraOf(CutsceneKind kind, bool close = false)
        {
            switch (kind)
            {
                case CutsceneKind.Arrival: return arrivalCam;
                case CutsceneKind.Chest: return chestCam;
                case CutsceneKind.BossIntro: return close ? bossCloseCam : bossWideCam;
                default: return null;
            }
        }

        /// <summary>`TempleEntrance` 가 첫 발에 부른다.</summary>
        public bool PlayArrival(Action onEnd = null) => Play(arrival, CutsceneKind.Arrival, onEnd);

        /// <summary>`TempleChest.Open()` 이 부른다 — 카메라 자리를 이 상자·플레이어에 맞춰 다시 잡는다.</summary>
        public bool PlayChest(Vector3 chestPos, Vector3 playerPos, float itemHeight)
        {
            if (chestCam != null)
            {
                var dolly = chestCam.GetComponent<CutsceneDolly>();
                if (dolly != null) PlaceChestDolly(dolly, chestPos, playerPos, itemHeight);
            }
            return Play(chest, CutsceneKind.Chest, null);
        }

        /// <summary>`TempleBossIntro` 가 보스방 첫 발에 부른다. `bossRoarSec` 에 보스가 포효한다.</summary>
        public bool PlayBossIntro(DungeonEnemy boss, Action onEnd = null)
        {
            _boss = boss;
            bool ok = Play(bossIntro, CutsceneKind.BossIntro, onEnd);
            if (!ok) _boss = null;
            return ok;
        }

        private bool Play(PlayableDirector director, CutsceneKind kind, Action onEnd)
        {
            if (director == null || director.playableAsset == null)
            {
                onEnd?.Invoke();
                return false;
            }
            if (_current != null) Finish(); // 앞 컷이 돌고 있으면 그 자리에서 끝낸다.

            _current = director;
            _kind = kind;
            _onEnd = onEnd;
            _elapsed = 0f;
            _roarFired = false;
            PlayCount++;
            HideHud();
            if (skipHint != null) skipHint.SetActive(true);
            director.time = 0.0;
            director.Play();
            return true;
        }

        /// <summary>아무 키·클릭·탭(첫 0.35초는 무시 — 걷던 손가락이 바로 넘기지 않게).</summary>
        public void Skip()
        {
            if (_current != null) Finish();
        }

        private void Finish()
        {
            var d = _current;
            if (d == null) return;
            _current = null;
            _kind = CutsceneKind.None;
            if (d.state == PlayState.Playing) d.Stop();
            if (titleCard != null) titleCard.HideAll();
            if (skipHint != null) skipHint.SetActive(false);
            ShowHud();
            _boss = null;
            var cb = _onEnd;
            _onEnd = null;
            cb?.Invoke();
        }

        private void OnDirectorStopped(PlayableDirector d)
        {
            if (d == _current) Finish();
        }

        private void Update() => Tick(Time.unscaledDeltaTime);

        /// <summary>한 프레임 — 헤드리스 진단도 직접 부른다(포효 신호·끝 판정).</summary>
        public void Tick(float dt)
        {
            _bar = Mathf.MoveTowards(_bar, _current != null ? 1f : 0f, dt * BarRate);
            ApplyBars();
            if (_current == null) return;

            _elapsed += dt;
            if (_kind == CutsceneKind.BossIntro && !_roarFired && _current.time >= bossRoarSec)
            {
                _roarFired = true;
                if (_boss != null) _boss.PlayRoar();
            }
            if (_elapsed > SkipGraceSec && SkipPressed())
            {
                Finish();
                return;
            }
            if (_current.time >= _current.duration) Finish(); // 안전망 — 보통은 stopped 가 먼저 온다.
        }

        /// <summary>진단용 — 컷을 t 초로 옮겨 그 자리를 평가한다(제목 카드·달리). 실제 카메라는
        /// 다음 프레임 브레인 LateUpdate 가 옮긴다(`ManualUpdate` 는 ManualUpdate 모드 전용이라 안 쓴다).</summary>
        public void Seek(double t)
        {
            if (_current == null) return;
            _current.time = t;
            _current.Evaluate();
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

        /// <summary>상자 옆 두 방향 중 벽에 덜 막히는 쪽에 선다. 막히면 벽 앞까지 당긴다(CameraRig pull-in 과 같은 결).</summary>
        private static void PlaceChestDolly(CutsceneDolly dolly, Vector3 chestPos, Vector3 playerPos, float itemHeight)
        {
            Vector3 toPlayer = playerPos - chestPos;
            toPlayer.y = 0f;
            toPlayer = toPlayer.sqrMagnitude > 0.01f ? toPlayer.normalized : Vector3.back;
            Vector3 side = Vector3.Cross(Vector3.up, toPlayer).normalized;
            Vector3 focus = Vector3.Lerp(chestPos, playerPos, 0.4f) + Vector3.up * (itemHeight * 0.75f);

            Vector3 best = Vector3.zero;
            float bestClear = -1f;
            foreach (float sign in new[] { 1f, -1f })
            {
                Vector3 want = chestPos + side * (ChestSideM * sign) + toPlayer * ChestBackM + Vector3.up * ChestUpM;
                Vector3 cam = PullIn(focus, want, out float clear);
                if (clear > bestClear)
                {
                    bestClear = clear;
                    best = cam;
                }
            }
            Vector3 to = Vector3.Lerp(best, focus, 1f - ChestPushIn);
            Vector3 itemLook = chestPos + Vector3.up * (itemHeight + 0.7f);
            dolly.Set(best, to, focus, Vector3.Lerp(focus, itemLook, 0.6f));
        }

        private static Vector3 PullIn(Vector3 focus, Vector3 want, out float clearance)
        {
            Vector3 dir = want - focus;
            float dist = dir.magnitude;
            clearance = dist;
            if (dist < 0.01f) return want;
            dir /= dist;
            if (Physics.Raycast(focus, dir, out RaycastHit hit, dist, ~0, QueryTriggerInteraction.Ignore))
            {
                clearance = Mathf.Max(0.3f, hit.distance - WallBufferM);
                return focus + dir * clearance;
            }
            return want;
        }
    }
}
