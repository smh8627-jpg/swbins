using System.Linq;
using Unity.Cinemachine;
using UnityEditor;
using UnityEngine;
using UnityEngine.Playables;
using UnityEngine.Timeline;
using UnityEngine.UI;
using Saga.Story.Cinematics;
using Saga.Story.Data;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 106-8 "STORY 두목 등장 컷" — `BuildTestStoryScene.Build()` 가 카메라·UI 를 다 만든 뒤 부른다.
    /// DUNGEON `BuildDungeonCinematics` 의 판별 복사(코드 공유 없음): 컷 카메라 둘·Timeline 하나·레터박스와 보스
    /// 이름표 캔버스·`StoryCutscenes`. Timeline 애셋은 있으면 트랙만 비우고 다시 채운다(GUID 유지).
    /// </summary>
    public static class BuildStoryCinematics
    {
        private const string TimelineDir = "Assets/Games/SagaStory/Cinematics/Timelines";
        private const string NoisePath = "Packages/com.unity.cinemachine/Presets/Noise/Handheld_normal_mild.asset";
        private const int CutPriority = 0;

        private static readonly Color BarColor = new Color(0.01f, 0.01f, 0.015f, 1f);
        private static readonly Color BossColor = new Color(1f, 0.84f, 0.55f);
        private static readonly Color SubColor = new Color(0.86f, 0.84f, 0.8f);
        private static readonly Color LineColor = new Color(0.85f, 0.68f, 0.38f, 0.9f);

        private static Font _font;

        public static void Build(CinemachineBrain brain)
        {
            if (brain == null)
            {
                Debug.LogError("[BuildStoryCinematics] 실제 카메라에 CinemachineBrain 이 없다 — 컷을 만들지 않는다.");
                return;
            }
            _font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            EnsureFolder(TimelineDir);

            var root = new GameObject("StoryCutscenes");
            var cuts = root.AddComponent<StoryCutscenes>();

            // 자리는 두목에게 다가서는 순간 `StoryCutscenes.PlayBossIntro` 가 다시 잡는다(여긴 자리표시).
            var wideCam = CutCamera(root, "CutCam_StoryBossWide", 50f);
            var closeCam = CutCamera(root, "CutCam_StoryBossClose", 40f);
            var noise = closeCam.gameObject.AddComponent<CinemachineBasicMultiChannelPerlin>();
            noise.NoiseProfile = AssetDatabase.LoadAssetAtPath<NoiseSettings>(NoisePath);
            noise.AmplitudeGain = 0.9f;
            if (noise.NoiseProfile == null) Debug.LogWarning($"[BuildStoryCinematics] 손떨림 프리셋을 못 찾음: {NoisePath}");

            var goDir = new GameObject("Cut_StoryBossIntro");
            goDir.transform.SetParent(root.transform, false);
            var d = goDir.AddComponent<PlayableDirector>();
            d.playOnAwake = false;
            d.extrapolationMode = DirectorWrapMode.None;
            d.timeUpdateMode = DirectorUpdateMode.GameTime;

            var tl = FreshTimeline("Story_BossIntro");
            var cam = tl.CreateTrack<CinemachineTrack>(null, "Camera");
            Shot(d, cam, "story_boss_wide", wideCam, 0f, StoryCutscenes.WideSec, 0.6f, 0f);
            Shot(d, cam, "story_boss_close", closeCam, StoryCutscenes.WideSec, StoryCutscenes.CloseSec, 0f, 0.7f); // 맞붙여 자른다.
            Dolly(d, tl, wideCam, 0f, StoryCutscenes.WideSec);
            Dolly(d, tl, closeCam, StoryCutscenes.WideSec, StoryCutscenes.CloseSec);
            d.SetGenericBinding(cam, brain);
            EditorUtility.SetDirty(tl);
            d.playableAsset = tl;

            // PLAN.md 106-10 둘째 단계 — 소환 컷(자리는 부르는 순간 `StoryCutscenes.PlaySummon` 이 다시 잡는다).
            var summonWide = CutCamera(root, "CutCam_StorySummonWide", 55f);
            var summonClose = CutCamera(root, "CutCam_StorySummonClose", 45f);
            var sNoise = summonClose.gameObject.AddComponent<CinemachineBasicMultiChannelPerlin>();
            sNoise.NoiseProfile = AssetDatabase.LoadAssetAtPath<NoiseSettings>(NoisePath);
            sNoise.AmplitudeGain = 1.4f;
            var sDirGo = new GameObject("Cut_StorySummon");
            sDirGo.transform.SetParent(root.transform, false);
            var sd = sDirGo.AddComponent<PlayableDirector>();
            sd.playOnAwake = false;
            sd.extrapolationMode = DirectorWrapMode.None;
            sd.timeUpdateMode = DirectorUpdateMode.GameTime;
            var stl = FreshTimeline("Story_Summon");
            var scam = stl.CreateTrack<CinemachineTrack>(null, "Camera");
            Shot(sd, scam, "story_summon_wide", summonWide, 0f, StoryCutscenes.SummonWideSec, 0.6f, 0f);
            Shot(sd, scam, "story_summon_close", summonClose, StoryCutscenes.SummonWideSec, StoryCutscenes.SummonCloseSec, 0f, 0.7f);
            Dolly(sd, stl, summonWide, 0f, StoryCutscenes.SummonWideSec);
            Dolly(sd, stl, summonClose, StoryCutscenes.SummonWideSec, StoryCutscenes.SummonCloseSec);
            sd.SetGenericBinding(scam, brain);
            EditorUtility.SetDirty(stl);
            sd.playableAsset = stl;

            var (overlay, top, bottom, skip, nameGroup, nameTitle, nameSub) = BuildOverlay();

            SetField(cuts, "brain", brain);
            SetField(cuts, "bossIntro", d);
            SetField(cuts, "wideCam", wideCam);
            SetField(cuts, "closeCam", closeCam);
            SetField(cuts, "summonCut", sd);
            SetField(cuts, "summonWideCam", summonWide);
            SetField(cuts, "summonCloseCam", summonClose);
            SetField(cuts, "overlayCanvas", overlay);
            SetField(cuts, "topBar", top);
            SetField(cuts, "bottomBar", bottom);
            SetField(cuts, "skipHint", skip);
            SetField(cuts, "nameGroup", nameGroup);
            SetField(cuts, "nameTitle", nameTitle);
            SetField(cuts, "nameSub", nameSub);
            Debug.Log("[BuildStoryCinematics] 두목 등장 컷 · 소환 컷 · 가상 카메라 4 · Timeline 2");
        }

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
            var track = tl.CreateTrack<StoryCutDollyTrack>(null, $"Dolly {vcam.name}");
            var clip = track.CreateClip<StoryCutDollyClip>();
            clip.start = start;
            clip.duration = duration;
            d.SetGenericBinding(track, vcam.GetComponent<StoryCutDolly>());
        }

        private static CinemachineCamera CutCamera(GameObject root, string name, float fov)
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
            var dolly = go.AddComponent<StoryCutDolly>();
            dolly.Set(new Vector3(-3f, 2f, -4f), new Vector3(-2f, 1.7f, -3.3f), Vector3.up * 1.2f, Vector3.up * 1.4f);
            return vcam;
        }

        private static (Canvas, RectTransform, RectTransform, GameObject, CanvasGroup, Text, Text) BuildOverlay()
        {
            var canvasGo = new GameObject("StoryCutsceneOverlay");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = -5; // 토스트가 레터박스 위에 뜨게. 다른 HUD 는 컷 동안 꺼진다.
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            scaler.matchWidthOrHeight = 0.5f;

            var top = Bar(canvasGo.transform, "TopBar", true);
            var bottom = Bar(canvasGo.transform, "BottomBar", false);

            string skipText = StoryLocalization.T("cut.skip", "건너뛰기 ▶ 아무 키 · 탭");
            var skip = Label(bottom, "SkipHint", skipText, 26, SubColor, TextAnchor.MiddleRight);
            var skipRt = (RectTransform)skip.transform;
            skipRt.anchorMin = Vector2.zero;
            skipRt.anchorMax = Vector2.one;
            skipRt.offsetMin = new Vector2(40f, 0f);
            skipRt.offsetMax = new Vector2(-40f, 0f);
            skip.gameObject.SetActive(false);

            // 왼쪽 아래 보스 이름표 — 레터박스 바로 위(DUNGEON 이름표와 같은 자리·크기).
            var groupGo = new GameObject("BossName", typeof(RectTransform));
            groupGo.transform.SetParent(canvasGo.transform, false);
            var grt = (RectTransform)groupGo.transform;
            grt.anchorMin = grt.anchorMax = new Vector2(0f, 0.16f);
            grt.pivot = Vector2.zero;
            grt.sizeDelta = new Vector2(900f, 220f);
            grt.anchoredPosition = new Vector2(70f, 0f);
            var group = groupGo.AddComponent<CanvasGroup>();
            group.alpha = 0f;
            group.blocksRaycasts = false;
            group.interactable = false;
            var sub = Label(groupGo.transform, "Sub", "", 32, SubColor, TextAnchor.LowerLeft);
            Place(sub, new Vector2(0f, 150f), new Vector2(900f, 50f));
            var title = Label(groupGo.transform, "Title", "", 78, BossColor, TextAnchor.LowerLeft);
            Place(title, new Vector2(0f, 40f), new Vector2(900f, 110f));
            var lineGo = new GameObject("Line", typeof(RectTransform));
            lineGo.transform.SetParent(groupGo.transform, false);
            var lrt = (RectTransform)lineGo.transform;
            lrt.anchorMin = lrt.anchorMax = lrt.pivot = Vector2.zero;
            lrt.anchoredPosition = new Vector2(0f, 30f);
            lrt.sizeDelta = new Vector2(420f, 3f);
            var lineImg = lineGo.AddComponent<Image>();
            lineImg.color = LineColor;
            lineImg.raycastTarget = false;

            return (canvas, top, bottom, skip.gameObject, group, title, sub);
        }

        private static RectTransform Bar(Transform parent, string name, bool isTop)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rt = (RectTransform)go.transform;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
            rt.anchorMin = isTop ? Vector2.up : Vector2.zero;
            rt.anchorMax = isTop ? Vector2.one : Vector2.right; // 높이 0 — StoryCutscenes 가 내린다.
            var img = go.AddComponent<Image>();
            img.color = BarColor;
            img.raycastTarget = false;
            return rt;
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

        private static void Place(Text t, Vector2 pos, Vector2 size)
        {
            var rt = (RectTransform)t.transform;
            rt.anchorMin = rt.anchorMax = rt.pivot = Vector2.zero;
            rt.anchoredPosition = pos;
            rt.sizeDelta = size;
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
                Debug.LogError($"[BuildStoryCinematics] {target.GetType().Name}에 필드 '{fieldName}'이 없다.");
                return;
            }
            field.SetValue(target, value);
        }
    }
}
