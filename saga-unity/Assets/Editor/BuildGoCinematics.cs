using TMPro;
using System.Linq;
using Unity.Cinemachine;
using UnityEditor;
using UnityEngine;
using UnityEngine.Playables;
using UnityEngine.Timeline;
using UnityEngine.UI;
using Saga.Go.Cinematics;
using Saga.Go.Data;

namespace Saga.EditorTools
{
    /// <summary>
    /// PLAN.md 106-9 "GO 두목 등장 컷" — `BuildTestVillageScene.Build()` 가 카메라·UI 를 다 만든 뒤 부른다.
    /// DUNGEON `BuildDungeonCinematics`·STORY `BuildStoryCinematics` 의 판별 복사(코드 공유 없음): 컷 카메라 둘·Timeline 하나·레터박스와 보스
    /// 이름표 캔버스·`GoCutscenes`. Timeline 애셋은 있으면 트랙만 비우고 다시 채운다(GUID 유지).
    /// </summary>
    public static class BuildGoCinematics
    {
        private const string TimelineDir = "Assets/Games/SagaGo/Cinematics/Timelines";
        private const string NoisePath = "Packages/com.unity.cinemachine/Presets/Noise/Handheld_normal_mild.asset";
        private const int CutPriority = 0;

        private static readonly Color BarColor = new Color(0.01f, 0.01f, 0.015f, 1f);
        private static readonly Color BossColor = new Color(1f, 0.84f, 0.55f);
        private static readonly Color SubColor = new Color(0.86f, 0.84f, 0.8f);
        private static readonly Color LineColor = new Color(0.85f, 0.68f, 0.38f, 0.9f);


        public static void Build(CinemachineBrain brain)
        {
            if (brain == null)
            {
                Debug.LogError("[BuildGoCinematics] 실제 카메라에 CinemachineBrain 이 없다 — 컷을 만들지 않는다.");
                return;
            }
            EnsureFolder(TimelineDir);

            var root = new GameObject("GoCutscenes");
            var cuts = root.AddComponent<GoCutscenes>();

            // 자리는 수호장이 달려드는 순간 `GoCutscenes.PlayBossIntro` 가 다시 잡는다(여긴 자리표시).
            var wideCam = CutCamera(root, "CutCam_GoBossWide", 50f);
            var closeCam = CutCamera(root, "CutCam_GoBossClose", 40f);
            var noise = closeCam.gameObject.AddComponent<CinemachineBasicMultiChannelPerlin>();
            noise.NoiseProfile = AssetDatabase.LoadAssetAtPath<NoiseSettings>(NoisePath);
            noise.AmplitudeGain = 0.9f;
            if (noise.NoiseProfile == null) Debug.LogWarning($"[BuildGoCinematics] 손떨림 프리셋을 못 찾음: {NoisePath}");

            var goDir = new GameObject("Cut_GoBossIntro");
            goDir.transform.SetParent(root.transform, false);
            var d = goDir.AddComponent<PlayableDirector>();
            d.playOnAwake = false;
            d.extrapolationMode = DirectorWrapMode.None;
            d.timeUpdateMode = DirectorUpdateMode.GameTime;

            var tl = FreshTimeline("Go_GuardianIntro");
            var cam = tl.CreateTrack<CinemachineTrack>(null, "Camera");
            Shot(d, cam, "go_boss_wide", wideCam, 0f, GoCutscenes.WideSec, 0.6f, 0f);
            Shot(d, cam, "go_boss_close", closeCam, GoCutscenes.WideSec, GoCutscenes.CloseSec, 0f, 0.7f); // 맞붙여 자른다.
            Dolly(d, tl, wideCam, 0f, GoCutscenes.WideSec);
            Dolly(d, tl, closeCam, GoCutscenes.WideSec, GoCutscenes.CloseSec);
            d.SetGenericBinding(cam, brain);
            EditorUtility.SetDirty(tl);
            d.playableAsset = tl;

            var (overlay, top, bottom, skip, nameGroup, nameTitle, nameSub) = BuildOverlay();

            SetField(cuts, "brain", brain);
            SetField(cuts, "bossIntro", d);
            SetField(cuts, "wideCam", wideCam);
            SetField(cuts, "closeCam", closeCam);
            SetField(cuts, "overlayCanvas", overlay);
            SetField(cuts, "topBar", top);
            SetField(cuts, "bottomBar", bottom);
            SetField(cuts, "skipHint", skip);
            SetField(cuts, "nameGroup", nameGroup);
            SetField(cuts, "nameTitle", nameTitle);
            SetField(cuts, "nameSub", nameSub);
            Debug.Log("[BuildGoCinematics] 두목 등장 컷 1 · 가상 카메라 2 · Timeline 1");
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
            var track = tl.CreateTrack<GoCutDollyTrack>(null, $"Dolly {vcam.name}");
            var clip = track.CreateClip<GoCutDollyClip>();
            clip.start = start;
            clip.duration = duration;
            d.SetGenericBinding(track, vcam.GetComponent<GoCutDolly>());
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
            lens.FarClipPlane = 1000f; // GO 들판은 넓다(432m).
            vcam.Lens = lens;
            var dolly = go.AddComponent<GoCutDolly>();
            dolly.Set(new Vector3(-3f, 2f, -4f), new Vector3(-2f, 1.7f, -3.3f), Vector3.up * 1.2f, Vector3.up * 1.4f);
            return vcam;
        }

        private static (Canvas, RectTransform, RectTransform, GameObject, CanvasGroup, TextMeshProUGUI, TextMeshProUGUI) BuildOverlay()
        {
            var canvasGo = new GameObject("GoCutsceneOverlay");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = -5; // 토스트가 레터박스 위에 뜨게. 다른 HUD 는 컷 동안 꺼진다.
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            Saga.Core.SagaUi.ApplyGameScaler(scaler);

            var top = Bar(canvasGo.transform, "TopBar", true);
            var bottom = Bar(canvasGo.transform, "BottomBar", false);

            string skipText = GoLocalization.T("cut.skip", "건너뛰기 ▶ 아무 키 · 탭");
            var skip = Label(bottom, "SkipHint", skipText, 26, SubColor, TextAlignmentOptions.Right);
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
            var sub = Label(groupGo.transform, "Sub", "", 32, SubColor, TextAlignmentOptions.BottomLeft);
            Place(sub, new Vector2(0f, 150f), new Vector2(900f, 50f));
            var title = Label(groupGo.transform, "Title", "", 78, BossColor, TextAlignmentOptions.BottomLeft);
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
            rt.anchorMax = isTop ? Vector2.one : Vector2.right; // 높이 0 — GoCutscenes 가 내린다.
            var img = go.AddComponent<Image>();
            img.color = BarColor;
            img.raycastTarget = false;
            return rt;
        }

        private static TextMeshProUGUI Label(Transform parent, string name, string text, int size, Color color, TextAlignmentOptions align)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var t = go.AddComponent<TextMeshProUGUI>();
            t.fontSize = size;
            t.color = color;
            t.alignment = align;
            t.textWrappingMode = TextWrappingModes.NoWrap;
            t.overflowMode = TextOverflowModes.Overflow;
            t.raycastTarget = false;
            t.text = text;
            Saga.Core.TmpEffect.Add(go, Saga.Core.TmpEffect.Kind.Shadow, new Color(0f, 0f, 0f, 0.75f), 0.6f);
            return t;
        }

        private static void Place(TextMeshProUGUI t, Vector2 pos, Vector2 size)
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
                Debug.LogError($"[BuildGoCinematics] {target.GetType().Name}에 필드 '{fieldName}'이 없다.");
                return;
            }
            field.SetValue(target, value);
        }
    }
}
