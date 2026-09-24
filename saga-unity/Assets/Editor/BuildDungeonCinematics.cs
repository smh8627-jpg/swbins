using System.Collections.Generic;
using System.Linq;
using Unity.Cinemachine;
using UnityEditor;
using UnityEngine;
using UnityEngine.Playables;
using UnityEngine.Timeline;
using UnityEngine.UI;
using Saga.Dungeon.Cinematics;
using Saga.Dungeon.World;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 106-3 "연출(FF)" — `BuildTestDungeonScene.Build()`가 플레이어·UI 를 다 만든 뒤 부른다.
    /// 컷 셋(능묘 도착·상자 열기·능묘지기 등장)의 Timeline 애셋·컷 전용 CinemachineCamera·레터박스와
    /// 제목 카드 캔버스·`DungeonCutscenes` 를 조립한다. 좌표는 `BuildDungeonTemple` 의 방 중심 기준.
    /// Timeline 애셋은 있으면 트랙만 비우고 다시 채운다(GUID 를 지켜 재빌드마다 .meta 가 흔들리지 않게).
    /// </summary>
    public static class BuildDungeonCinematics
    {
        private const string TimelineDir = "Assets/Games/SagaDungeon/Cinematics/Timelines";
        private const string NoisePath = "Packages/com.unity.cinemachine/Presets/Noise/Handheld_normal_mild.asset";
        private const int CutPriority = 0; // 플레이 카메라(10)보다 낮다 — Timeline 이 넘겨받을 때만 산다.

        // 컷 길이(초) — 짧게. 전부 아무 키·탭으로 넘길 수 있다.
        private const float ArrivalSec = 4.5f;
        private const float ChestSec = 2.6f;
        private const float BossWideSec = 2.0f;
        private const float BossCloseSec = 3.2f;
        // PLAN.md 106-6 소환 — 넓은 샷(솟아오름)에서 가까운 샷(내리치기)으로. 합이 PartySummon.EndSec 와 같다.
        private const float SummonWideSec = 2.6f;
        private const float SummonCloseSec = PartySummon.EndSec - SummonWideSec;

        private static readonly Color BarColor = new Color(0.01f, 0.01f, 0.015f, 1f);
        private static readonly Color RegionColor = new Color(1f, 0.95f, 0.86f);
        private static readonly Color BossColor = new Color(1f, 0.84f, 0.55f);
        private static readonly Color SubColor = new Color(0.86f, 0.84f, 0.8f);
        private static readonly Color LineColor = new Color(0.85f, 0.68f, 0.38f, 0.9f);

        private static Font _font;

        public static void Build(GameObject playerGo, DungeonEnemy guardian)
        {
            var brain = playerGo != null ? playerGo.GetComponentInChildren<CinemachineBrain>() : null;
            if (brain == null)
            {
                Debug.LogError("[BuildDungeonCinematics] 플레이어 카메라에 CinemachineBrain 이 없다 — 컷을 만들지 않는다.");
                return;
            }
            _font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            EnsureFolder(TimelineDir);

            var (overlay, topBar, bottomBar, skipHint, card) = BuildOverlay();

            var root = new GameObject("DungeonCutscenes");
            var cuts = root.AddComponent<DungeonCutscenes>();

            Vector3 e = BuildDungeonTemple.EntranceCenter;
            Vector3 b = BuildDungeonTemple.BossRoomCenter;

            // 능묘 도착 — 입구 홀 남동쪽 위에서 내려오며 북쪽 잠긴 문을 본다(열쇠가 없다는 걸 먼저 보여 준다).
            var arrivalCam = CutCamera(root, "CutCam_Arrival", 52f,
                e + new Vector3(6f, 7f, -8f), e + new Vector3(3.5f, 4.2f, -4.5f),
                e + new Vector3(0f, 0.5f, 3f), e + new Vector3(0f, 1.6f, 9.5f));
            // 상자 — 자리는 여는 순간 `DungeonCutscenes.PlayChest` 가 다시 잡는다.
            var chestCam = CutCamera(root, "CutCam_Chest", 45f,
                e + new Vector3(2f, 1.6f, -2f), e + new Vector3(1.6f, 1.4f, -1.6f), e, e + Vector3.up);
            // 능묘지기 — 문 앞 높은 데서 밀고 들어가는 넓은 샷 → 발치에서 올려다보는 손떨림 클로즈업.
            var bossWideCam = CutCamera(root, "CutCam_BossWide", 55f,
                b + new Vector3(0f, 5.2f, -8.5f), b + new Vector3(0f, 3.6f, -5f),
                b + new Vector3(0f, 1.8f, 4f), b + new Vector3(0f, 2.2f, 4f));
            var bossCloseCam = CutCamera(root, "CutCam_BossClose", 42f,
                b + new Vector3(-2.2f, 0.7f, -0.4f), b + new Vector3(-1.4f, 0.9f, 0.8f),
                b + new Vector3(0f, 2.6f, 4f), b + new Vector3(0f, 3.0f, 4f));
            var noise = bossCloseCam.gameObject.AddComponent<CinemachineBasicMultiChannelPerlin>();
            noise.NoiseProfile = AssetDatabase.LoadAssetAtPath<NoiseSettings>(NoisePath);
            noise.AmplitudeGain = 0.8f;
            if (noise.NoiseProfile == null) Debug.LogWarning($"[BuildDungeonCinematics] 손떨림 프리셋을 못 찾음: {NoisePath}");

            // 소환 — 자리는 부르는 순간 `DungeonCutscenes.PlaySummon` 이 다시 잡는다. 가까운 샷은 내리칠 때 흔들린다.
            var summonWideCam = CutCamera(root, "CutCam_SummonWide", 50f,
                e + new Vector3(0f, 1.1f, -4f), e + new Vector3(0f, 0.7f, -3f), e + Vector3.up * 2f, e + Vector3.up * 5f);
            var summonCloseCam = CutCamera(root, "CutCam_SummonClose", 46f,
                e + new Vector3(7f, 1.2f, 0f), e + new Vector3(5.5f, 0.8f, 0f), e + Vector3.up * 4.5f, e + Vector3.up * 2f);
            var summonNoise = summonCloseCam.gameObject.AddComponent<CinemachineBasicMultiChannelPerlin>();
            summonNoise.NoiseProfile = AssetDatabase.LoadAssetAtPath<NoiseSettings>(NoisePath);
            summonNoise.AmplitudeGain = 1.4f;

            // ── Timeline 셋
            var arrival = Director(root, "Cut_Arrival");
            {
                var tl = FreshTimeline("Temple_Arrival");
                var cam = tl.CreateTrack<CinemachineTrack>(null, "Camera");
                Shot(arrival, cam, "arrival_wide", arrivalCam, 0f, ArrivalSec, 0.9f, 0.9f);
                Dolly(arrival, tl, arrivalCam, 0f, ArrivalSec);
                var title = tl.CreateTrack<CutsceneTitleTrack>(null, "Title");
                Title(title, 0.7f, 3.2f, CutsceneTitleStyle.Region, "cut.temple_title", "잊힌 능묘", "cut.temple_sub", "이름 잃은 왕이 잠든 곳");
                Finish(arrival, tl, brain, cam, title, card);
            }
            var chest = Director(root, "Cut_Chest");
            {
                var tl = FreshTimeline("Temple_Chest");
                var cam = tl.CreateTrack<CinemachineTrack>(null, "Camera");
                Shot(chest, cam, "chest_close", chestCam, 0f, ChestSec, 0.45f, 0.55f);
                Dolly(chest, tl, chestCam, 0f, ChestSec);
                Finish(chest, tl, brain, cam, null, card);
            }
            var boss = Director(root, "Cut_BossIntro");
            {
                var tl = FreshTimeline("Temple_BossIntro");
                var cam = tl.CreateTrack<CinemachineTrack>(null, "Camera");
                Shot(boss, cam, "boss_wide", bossWideCam, 0f, BossWideSec, 0.7f, 0f);
                Shot(boss, cam, "boss_close", bossCloseCam, BossWideSec, BossCloseSec, 0f, 0.8f); // 넓은→가까운은 맞붙여 자른다(FF 컷).
                Dolly(boss, tl, bossWideCam, 0f, BossWideSec);
                Dolly(boss, tl, bossCloseCam, BossWideSec, BossCloseSec);
                var title = tl.CreateTrack<CutsceneTitleTrack>(null, "Title");
                Title(title, BossWideSec + 0.3f, BossCloseSec - 0.5f, CutsceneTitleStyle.Boss,
                    "cut.guardian_title", "능묘지기", "cut.guardian_sub", "잊힌 능묘의 갑주 파수 — 칼날을 튕긴다");
                Finish(boss, tl, brain, cam, title, card);
            }

            var summon = Director(root, "Cut_Summon");
            {
                var tl = FreshTimeline("Party_Summon");
                var cam = tl.CreateTrack<CinemachineTrack>(null, "Camera");
                Shot(summon, cam, "summon_wide", summonWideCam, 0f, SummonWideSec, 0.6f, 0f);
                Shot(summon, cam, "summon_close", summonCloseCam, SummonWideSec, SummonCloseSec, 0f, 0.7f);
                Dolly(summon, tl, summonWideCam, 0f, SummonWideSec);
                Dolly(summon, tl, summonCloseCam, SummonWideSec, SummonCloseSec);
                var title = tl.CreateTrack<CutsceneTitleTrack>(null, "Title");
                Title(title, 0.5f, 1.9f, CutsceneTitleStyle.Boss,
                    "cut.summon_title", "바위 거신", "cut.summon_sub", "소환 — 잠든 산이 깨어난다");
                Finish(summon, tl, brain, cam, title, card);
            }

            SetField(cuts, "brain", brain);
            SetField(cuts, "arrival", arrival);
            SetField(cuts, "chest", chest);
            SetField(cuts, "bossIntro", boss);
            SetField(cuts, "arrivalCam", arrivalCam);
            SetField(cuts, "chestCam", chestCam);
            SetField(cuts, "bossWideCam", bossWideCam);
            SetField(cuts, "bossCloseCam", bossCloseCam);
            SetField(cuts, "summon", summon);
            SetField(cuts, "summonWideCam", summonWideCam);
            SetField(cuts, "summonCloseCam", summonCloseCam);
            SetField(cuts, "titleCard", card);
            SetField(cuts, "overlayCanvas", overlay);
            SetField(cuts, "topBar", topBar);
            SetField(cuts, "bottomBar", bottomBar);
            SetField(cuts, "skipHint", skipHint);
            SetField(cuts, "bossRoarSec", BossWideSec);

            if (guardian == null) Debug.LogWarning("[BuildDungeonCinematics] 능묘지기를 못 받음 — 등장 컷의 포효가 빠진다.");
            Debug.Log("[BuildDungeonCinematics] 컷 4(도착·상자·능묘지기·소환) · 가상 카메라 6 · Timeline 4");
        }

        // ───────────────────────── Timeline

        private static TimelineAsset FreshTimeline(string name)
        {
            string path = $"{TimelineDir}/{name}.playable";
            var tl = AssetDatabase.LoadAssetAtPath<TimelineAsset>(path);
            if (tl == null)
            {
                tl = ScriptableObject.CreateInstance<TimelineAsset>();
                AssetDatabase.CreateAsset(tl, path);
            }
            else
            {
                foreach (var track in tl.GetRootTracks().ToList()) tl.DeleteTrack(track);
            }
            return tl;
        }

        private static PlayableDirector Director(GameObject root, string name)
        {
            var go = new GameObject(name);
            go.transform.SetParent(root.transform, false);
            var d = go.AddComponent<PlayableDirector>();
            d.playOnAwake = false;
            d.extrapolationMode = DirectorWrapMode.None;
            d.timeUpdateMode = DirectorUpdateMode.GameTime;
            return d;
        }

        private static void Shot(PlayableDirector d, CinemachineTrack track, string key, CinemachineCamera vcam,
            float start, float duration, float easeIn, float easeOut)
        {
            var clip = track.CreateClip<CinemachineShot>();
            clip.displayName = key;
            clip.start = start;
            clip.duration = duration;
            clip.easeInDuration = easeIn;
            clip.easeOutDuration = easeOut;
            var shot = (CinemachineShot)clip.asset;
            shot.DisplayName = key;
            shot.VirtualCamera.exposedName = new PropertyName(key);
            d.SetReferenceValue(shot.VirtualCamera.exposedName, vcam);
        }

        private static void Dolly(PlayableDirector d, TimelineAsset tl, CinemachineCamera vcam, float start, float duration)
        {
            var track = tl.CreateTrack<CutsceneDollyTrack>(null, $"Dolly {vcam.name}");
            var clip = track.CreateClip<CutsceneDollyClip>();
            clip.start = start;
            clip.duration = duration;
            d.SetGenericBinding(track, vcam.GetComponent<CutsceneDolly>());
        }

        private static void Title(CutsceneTitleTrack track, float start, float duration, CutsceneTitleStyle style,
            string titleKey, string titleFallback, string subKey, string subFallback)
        {
            var clip = track.CreateClip<CutsceneTitleClip>();
            clip.displayName = titleFallback;
            clip.start = start;
            clip.duration = duration;
            var a = (CutsceneTitleClip)clip.asset;
            a.style = style;
            a.titleKey = titleKey;
            a.titleFallback = titleFallback;
            a.subKey = subKey;
            a.subFallback = subFallback;
        }

        private static void Finish(PlayableDirector d, TimelineAsset tl, CinemachineBrain brain, CinemachineTrack cam,
            CutsceneTitleTrack title, CutsceneTitleCard card)
        {
            d.SetGenericBinding(cam, brain);
            if (title != null) d.SetGenericBinding(title, card);
            EditorUtility.SetDirty(tl);
            d.playableAsset = tl;
        }

        // ───────────────────────── 카메라

        private static CinemachineCamera CutCamera(GameObject root, string name, float fov,
            Vector3 from, Vector3 to, Vector3 lookFrom, Vector3 lookTo)
        {
            var go = new GameObject(name);
            go.transform.SetParent(root.transform, false);
            var vcam = go.AddComponent<CinemachineCamera>();
            vcam.Priority = CutPriority;
            var lens = LensSettings.Default;
            lens.FieldOfView = fov;
            lens.NearClipPlane = 0.1f;
            lens.FarClipPlane = 500f;
            vcam.Lens = lens;
            var dolly = go.AddComponent<CutsceneDolly>();
            dolly.Set(from, to, lookFrom, lookTo);
            return vcam;
        }

        // ───────────────────────── 레터박스·제목 카드

        private static (Canvas, RectTransform, RectTransform, GameObject, CutsceneTitleCard) BuildOverlay()
        {
            var canvasGo = new GameObject("CutsceneOverlay");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = -5; // 토스트(DialogueUI, 0)가 레터박스 위에 뜨게. 다른 HUD 는 컷 동안 꺼진다.
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            scaler.matchWidthOrHeight = 0.5f;
            // GraphicRaycaster 는 두지 않는다 — 컷을 넘기는 탭은 DungeonCutscenes 가 직접 읽는다.

            var top = Bar(canvasGo.transform, "TopBar");
            var bottom = Bar(canvasGo.transform, "BottomBar");

            var skip = Label(bottom, "SkipHint", "건너뛰기 ▶ 아무 키 · 탭", 26, SubColor, TextAnchor.MiddleRight);
            var skipRt = (RectTransform)skip.transform;
            skipRt.anchorMin = new Vector2(0f, 0f);
            skipRt.anchorMax = new Vector2(1f, 1f);
            skipRt.offsetMin = new Vector2(40f, 0f);
            skipRt.offsetMax = new Vector2(-40f, 0f);
            skip.gameObject.AddComponent<Saga.Dungeon.UI.LocalizedButtonLabel>().Init("cut.skip", "건너뛰기 ▶ 아무 키 · 탭");

            var cardGo = new GameObject("TitleCard", typeof(RectTransform));
            cardGo.transform.SetParent(canvasGo.transform, false);
            Stretch((RectTransform)cardGo.transform);
            var card = cardGo.AddComponent<CutsceneTitleCard>();

            // 가운데 지역명 — 큰 제목, 금빛 가는 선, 작은 부제.
            var region = Group(cardGo.transform, "Region", new Vector2(0.5f, 0.56f), new Vector2(1000f, 320f));
            var regionTitle = Label(region.transform, "Title", "", 92, RegionColor, TextAnchor.MiddleCenter);
            Place(regionTitle, new Vector2(0f, 60f), new Vector2(1000f, 140f));
            Line(region.transform, new Vector2(0f, -10f), new Vector2(520f, 3f));
            var regionSub = Label(region.transform, "Sub", "", 36, SubColor, TextAnchor.MiddleCenter);
            Place(regionSub, new Vector2(0f, -60f), new Vector2(1000f, 60f));

            // 왼쪽 아래 보스 이름표 — 레터박스 바로 위.
            var bossGroup = Group(cardGo.transform, "Boss", new Vector2(0f, 0.16f), new Vector2(900f, 220f), new Vector2(0f, 0f));
            ((RectTransform)bossGroup.transform).anchoredPosition = new Vector2(70f, 0f);
            var bossSub = Label(bossGroup.transform, "Sub", "", 32, SubColor, TextAnchor.LowerLeft);
            Place(bossSub, new Vector2(0f, 150f), new Vector2(900f, 50f), new Vector2(0f, 0f));
            var bossTitle = Label(bossGroup.transform, "Title", "", 78, BossColor, TextAnchor.LowerLeft);
            Place(bossTitle, new Vector2(0f, 40f), new Vector2(900f, 110f), new Vector2(0f, 0f));
            var bossLine = Line(bossGroup.transform, new Vector2(0f, 30f), new Vector2(420f, 3f));
            bossLine.pivot = Vector2.zero;
            bossLine.anchorMin = bossLine.anchorMax = Vector2.zero;

            SetField(card, "regionGroup", region);
            SetField(card, "regionTitle", regionTitle);
            SetField(card, "regionSub", regionSub);
            SetField(card, "bossGroup", bossGroup);
            SetField(card, "bossTitle", bossTitle);
            SetField(card, "bossSub", bossSub);
            region.alpha = 0f;
            bossGroup.alpha = 0f;
            skip.gameObject.SetActive(false);

            return (canvas, top, bottom, skip.gameObject, card);
        }

        private static RectTransform Bar(Transform parent, string name)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rt = (RectTransform)go.transform;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
            bool isTop = name == "TopBar";
            rt.anchorMin = isTop ? Vector2.up : Vector2.zero;
            rt.anchorMax = isTop ? Vector2.one : Vector2.right; // 높이 0 — DungeonCutscenes 가 내린다.
            var img = go.AddComponent<Image>();
            img.color = BarColor;
            img.raycastTarget = false;
            return rt;
        }

        private static CanvasGroup Group(Transform parent, string name, Vector2 anchor, Vector2 size, Vector2? pivot = null)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rt = (RectTransform)go.transform;
            rt.anchorMin = rt.anchorMax = anchor;
            rt.pivot = pivot ?? new Vector2(0.5f, 0.5f);
            rt.sizeDelta = size;
            rt.anchoredPosition = Vector2.zero;
            var g = go.AddComponent<CanvasGroup>();
            g.blocksRaycasts = false;
            g.interactable = false;
            return g;
        }

        private static Text Label(Transform parent, string name, string text, int size, Color color, TextAnchor align)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var t = go.AddComponent<Text>();
            t.font = _font;
            t.fontSize = size;
            t.color = color;
            t.alignment = align;
            t.horizontalOverflow = HorizontalWrapMode.Overflow;
            t.verticalOverflow = VerticalWrapMode.Overflow;
            t.raycastTarget = false;
            t.text = text;
            var shadow = go.AddComponent<Shadow>();
            shadow.effectColor = new Color(0f, 0f, 0f, 0.75f);
            shadow.effectDistance = new Vector2(2f, -2f);
            return t;
        }

        private static void Place(Text t, Vector2 pos, Vector2 size, Vector2? anchor = null)
        {
            var rt = (RectTransform)t.transform;
            rt.anchorMin = rt.anchorMax = anchor ?? new Vector2(0.5f, 0.5f);
            rt.pivot = anchor ?? new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = pos;
            rt.sizeDelta = size;
        }

        private static RectTransform Line(Transform parent, Vector2 pos, Vector2 size)
        {
            var go = new GameObject("Line", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rt = (RectTransform)go.transform;
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = pos;
            rt.sizeDelta = size;
            var img = go.AddComponent<Image>();
            img.color = LineColor;
            img.raycastTarget = false;
            return rt;
        }

        private static void Stretch(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
        }

        private static void EnsureFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            var parts = path.Split('/');
            string cur = parts[0];
            for (int i = 1; i < parts.Length; i++)
            {
                string next = $"{cur}/{parts[i]}";
                if (!AssetDatabase.IsValidFolder(next)) AssetDatabase.CreateFolder(cur, parts[i]);
                cur = next;
            }
        }

        private static void SetField(object target, string fieldName, object value)
        {
            var field = target.GetType().GetField(fieldName,
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            if (field == null)
            {
                Debug.LogError($"[BuildDungeonCinematics] {target.GetType().Name}에 필드 '{fieldName}'이 없다.");
                return;
            }
            field.SetValue(target, value);
        }
    }
}
